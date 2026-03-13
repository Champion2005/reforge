import type { ZodTypeAny, infer as ZodInfer } from "zod";
import type {
  ReforgeProvider,
  Message,
  ForgeOptions,
  ForgeResult,
  ForgeTelemetry,
  ForgeAttemptDetail,
} from "./types.js";
import { guard } from "../guard.js";
import { createTimer } from "../telemetry.js";

const RETRY_ASSISTANT_MAX_CHARS = 2000;

function truncateAssistantRetryContent(raw: string): string {
  if (raw.length <= RETRY_ASSISTANT_MAX_CHARS) {
    return raw;
  }

  const truncatedChars = raw.length - RETRY_ASSISTANT_MAX_CHARS;
  return `${raw.slice(0, RETRY_ASSISTANT_MAX_CHARS)}\n...[truncated ${truncatedChars} chars]`;
}

/**
 * End-to-end structured LLM output: call a provider, validate with
 * `guard()`, and automatically retry on failure.
 *
 * @typeParam T - A Zod schema type.
 * @param provider  - A `ReforgeProvider` (built-in adapter or custom).
 * @param messages  - The conversation messages to send to the LLM.
 * @param schema    - The Zod schema the output must conform to.
 * @param options   - Optional configuration (maxRetries, providerOptions).
 * @returns A `ForgeResult<z.infer<T>>` with telemetry.
 */
export async function forge<T extends ZodTypeAny>(
  provider: ReforgeProvider,
  messages: Message[],
  schema: T,
  options?: ForgeOptions,
): Promise<ForgeResult<ZodInfer<T>>> {
  const maxRetries = Math.max(0, options?.maxRetries ?? 3);
  const totalAttempts = 1 + maxRetries;
  const timer = createTimer();

  // Clone messages so we never mutate the caller's array
  const conversation: Message[] = [...messages];

  let lastErrors: import("zod").ZodIssue[] = [];
  let lastRetryPrompt = "Your previous response could not be parsed as JSON. The schema is still in your context — return ONLY valid JSON.";
  let lastTelemetry: import("../types.js").TelemetryData | undefined;
  const attemptDetails: ForgeAttemptDetail[] = [];

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    // Let provider errors bubble — they are the user's responsibility
    const raw = await provider.call(conversation, options?.providerOptions);

    const result = guard(raw, schema);
    lastTelemetry = result.telemetry;
    attemptDetails.push({
      attempt,
      durationMs: result.telemetry.durationMs,
      status: result.telemetry.status,
    });

    if (result.success) {
      const forgeTelemetry: ForgeTelemetry = {
        durationMs: result.telemetry.durationMs,
        status: result.telemetry.status,
        attempts: attempt,
        totalDurationMs: timer.stop(),
        attemptDetails,
      };

      return {
        success: true,
        data: result.data,
        telemetry: forgeTelemetry,
        isRepaired: result.isRepaired,
      };
    }

    lastErrors = result.errors;
    lastRetryPrompt = result.retryPrompt;

    // Don't append retry messages after the final attempt
    if (attempt < totalAttempts) {
      options?.onRetry?.(attempt, {
        errors: result.errors,
        retryPrompt: result.retryPrompt,
      });

      const assistantRetryContent = truncateAssistantRetryContent(raw);

      conversation.push(
        { role: "assistant", content: assistantRetryContent },
        { role: "user", content: result.retryPrompt },
      );
    }
  }

  // All attempts exhausted
  const forgeTelemetry: ForgeTelemetry = {
    durationMs: lastTelemetry?.durationMs ?? 0,
    status: "failed",
    attempts: totalAttempts,
    totalDurationMs: timer.stop(),
    attemptDetails,
  };

  return {
    success: false,
    errors: lastErrors,
    retryPrompt: lastRetryPrompt,
    telemetry: forgeTelemetry,
  };
}

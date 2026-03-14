import type { ZodTypeAny, infer as ZodInfer } from "zod";
import type {
  ReforgeProvider,
  Message,
  ForgeOptions,
  ForgeResult,
  ForgeTelemetry,
  ForgeAttemptDetail,
  ForgeFailurePayload,
  ProviderCallOptions,
  ForgeProviderHop,
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

function normalizeMaxRetries(value: number | undefined): number {
  if (value === undefined) return 3;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function resolveMaxRetries<TNativeOptions extends Record<string, unknown>>(
  options?: ForgeOptions<TNativeOptions>,
): number {
  return normalizeMaxRetries(options?.retryPolicy?.maxRetries ?? options?.maxRetries);
}

function resolveProviderOptions<TNativeOptions extends Record<string, unknown>>(
  attempt: number,
  options?: ForgeOptions<TNativeOptions>,
): TNativeOptions | undefined {
  const base = options?.providerOptions;
  const mutate = options?.retryPolicy?.mutateProviderOptions;
  if (!mutate) return base;

  return mutate(attempt, base);
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
export async function forge<
  T extends ZodTypeAny,
  TNativeOptions extends Record<string, unknown> = ProviderCallOptions,
>(
  provider: ReforgeProvider<TNativeOptions>,
  messages: Message[],
  schema: T,
  options?: ForgeOptions<TNativeOptions>,
): Promise<ForgeResult<ZodInfer<T>>> {
  const maxRetries = resolveMaxRetries<TNativeOptions>(options);
  const totalAttempts = 1 + maxRetries;
  const timer = createTimer();

  // Clone messages so we never mutate the caller's array
  const conversation: Message[] = [...messages];

  let lastErrors: import("zod").ZodIssue[] = [];
  let lastRetryPrompt = "Your previous response could not be parsed as JSON. The schema is still in your context — return ONLY valid JSON.";
  let lastTelemetry: import("../types.js").TelemetryData = {
    durationMs: 0,
    status: "failed",
  };
  const attemptDetails: ForgeAttemptDetail[] = [];
  const providerHops: ForgeProviderHop[] = [];
  let networkDurationMs = 0;
  let toolExecutionDurationMs = 0;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    options?.onEvent?.({ kind: "attempt_start", attempt, totalAttempts });

    // Let provider errors bubble — they are the user's responsibility
    const providerOptions = resolveProviderOptions<TNativeOptions>(attempt, options);
    const callStartedAt = Date.now();
    const raw = await provider.call(conversation, providerOptions);
    const callDurationMs = Date.now() - callStartedAt;
    networkDurationMs += callDurationMs;
    providerHops.push({
      providerId: provider.id ?? "provider-0",
      attempt,
      succeeded: false,
      durationMs: callDurationMs,
    });
    const wouldTruncate = raw.length > RETRY_ASSISTANT_MAX_CHARS;
    options?.onEvent?.({
      kind: "provider_response",
      attempt,
      rawLength: raw.length,
      truncatedForRetry: wouldTruncate,
    });

    const result = guard(raw, schema, options?.guardOptions);
    lastTelemetry = result.telemetry;
    attemptDetails.push({
      attempt,
      durationMs: result.telemetry.durationMs,
      status: result.telemetry.status,
    });

    if (result.success) {
      options?.onEvent?.({
        kind: "guard_success",
        attempt,
        status:
          result.telemetry.status === "clean"
            ? "clean"
            : "repaired_natively",
        durationMs: result.telemetry.durationMs,
      });

      const forgeTelemetry: ForgeTelemetry = {
        durationMs: result.telemetry.durationMs,
        status: result.telemetry.status,
        attempts: attempt,
        totalDurationMs: timer.stop(),
        networkDurationMs,
        toolExecutionDurationMs,
        providerHops: providerHops.map((hop, idx) =>
          idx === providerHops.length - 1
            ? { ...hop, succeeded: true }
            : hop,
        ),
        attemptDetails,
      };

      options?.onEvent?.({
        kind: "finished",
        success: true,
        attempts: attempt,
        totalDurationMs: forgeTelemetry.totalDurationMs,
      });

      return {
        success: true,
        data: result.data,
        telemetry: forgeTelemetry,
        isRepaired: result.isRepaired,
      };
    }

    lastErrors = result.errors;
    lastRetryPrompt = result.retryPrompt;

    options?.onEvent?.({
      kind: "guard_failure",
      attempt,
      durationMs: result.telemetry.durationMs,
      errorCount: result.errors.length,
    });

    const failurePayload: ForgeFailurePayload = {
      errors: result.errors,
      retryPrompt: result.retryPrompt,
    };

    const shouldRetry = options?.retryPolicy?.shouldRetry
      ? options.retryPolicy.shouldRetry(failurePayload, attempt)
      : true;

    // Don't append retry messages after the final attempt
    if (attempt < totalAttempts && shouldRetry) {
      options?.onRetry?.(attempt, {
        errors: result.errors,
        retryPrompt: result.retryPrompt,
      });

      options?.onEvent?.({
        kind: "retry_scheduled",
        attempt,
        nextAttempt: attempt + 1,
        reason: "guard_failure",
      });

      const assistantRetryContent = truncateAssistantRetryContent(raw);

      conversation.push(
        { role: "assistant", content: assistantRetryContent },
        { role: "user", content: result.retryPrompt },
      );
    } else if (!shouldRetry) {
      break;
    }
  }

  // All attempts exhausted
  const forgeTelemetry: ForgeTelemetry = {
    durationMs: lastTelemetry.durationMs,
    status: "failed",
    attempts: attemptDetails.length,
    totalDurationMs: timer.stop(),
    networkDurationMs,
    toolExecutionDurationMs,
    providerHops,
    attemptDetails,
  };

  options?.onEvent?.({
    kind: "finished",
    success: false,
    attempts: attemptDetails.length,
    totalDurationMs: forgeTelemetry.totalDurationMs,
  });

  return {
    success: false,
    errors: lastErrors,
    retryPrompt: lastRetryPrompt,
    telemetry: forgeTelemetry,
  };
}

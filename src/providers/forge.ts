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
const DEFAULT_MAX_AGENT_ITERATIONS = 5;
const DEFAULT_TOOL_TIMEOUT_MS = 15_000;

export class ForgeNetworkError extends Error {
  readonly providerIndex: number;
  readonly providerId: string;
  readonly causeValue: unknown;

  constructor(message: string, providerIndex: number, providerId: string, causeValue: unknown) {
    super(message);
    this.name = "ForgeNetworkError";
    this.providerIndex = providerIndex;
    this.providerId = providerId;
    this.causeValue = causeValue;
  }
}

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

function normalizeProviders<TNativeOptions extends Record<string, unknown>>(
  providerOrProviders: ReforgeProvider<TNativeOptions> | ReforgeProvider<TNativeOptions>[],
): ReforgeProvider<TNativeOptions>[] {
  return Array.isArray(providerOrProviders)
    ? providerOrProviders
    : [providerOrProviders];
}

function isIntrinsicNetworkError(error: unknown): boolean {
  if (error == null) return false;

  const msg =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : JSON.stringify(error);
  const lower = msg.toLowerCase();

  return (
    lower.includes("429") ||
    lower.includes("500") ||
    lower.includes("503") ||
    lower.includes("rate limit") ||
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout")
  );
}

type ParsedToolCall = {
  id: string;
  name: string;
  arguments: string;
};

function extractToolCalls(raw: string): ParsedToolCall[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return [];

    const calls = (parsed as { tool_calls?: unknown }).tool_calls;
    if (!Array.isArray(calls)) return [];

    const normalized: ParsedToolCall[] = [];
    for (let i = 0; i < calls.length; i++) {
      const call = calls[i];
      if (!call || typeof call !== "object") continue;

      const id = String((call as { id?: unknown }).id ?? `tool-call-${i + 1}`);
      const name = (call as { name?: unknown }).name;
      const args = (call as { arguments?: unknown }).arguments;
      if (typeof name !== "string") continue;

      let serializedArgs = "{}";
      if (typeof args === "string") {
        serializedArgs = args;
      } else if (args !== undefined) {
        serializedArgs = JSON.stringify(args);
      }

      normalized.push({ id, name, arguments: serializedArgs });
    }

    return normalized;
  } catch {
    return [];
  }
}

async function runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
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
  provider: ReforgeProvider<TNativeOptions> | ReforgeProvider<TNativeOptions>[],
  messages: Message[],
  schema: T,
  options?: ForgeOptions<TNativeOptions>,
): Promise<ForgeResult<ZodInfer<T>>> {
  const providers = normalizeProviders(provider);
  if (providers.length === 0) {
    throw new Error("forge requires at least one provider");
  }

  const maxRetries = resolveMaxRetries<TNativeOptions>(options);
  const totalAttempts = 1 + maxRetries;
  const timer = createTimer();
  const maxAgentIterations = Math.max(1, options?.maxAgentIterations ?? DEFAULT_MAX_AGENT_ITERATIONS);
  const toolTimeoutMs = Math.max(1, options?.toolTimeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS);

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

  let providerIndex = 0;
  let attempt = 0;

  while (providerIndex < providers.length && attempt < totalAttempts) {
    const activeProvider = providers[providerIndex]!;
    attempt++;
    options?.onEvent?.({ kind: "attempt_start", attempt, totalAttempts });

    const providerOptions = resolveProviderOptions<TNativeOptions>(attempt, options);
    const callStartedAt = Date.now();
    let raw = "";
    try {
      raw = await activeProvider.call(conversation, providerOptions);
    } catch (error) {
      const callDurationMs = Date.now() - callStartedAt;
      networkDurationMs += callDurationMs;
      providerHops.push({
        providerId: activeProvider.id ?? `provider-${providerIndex}`,
        attempt,
        succeeded: false,
        durationMs: callDurationMs,
      });

      if (!isIntrinsicNetworkError(error)) {
        throw error;
      }

      if (providerIndex < providers.length - 1) {
        attempt--;
        providerIndex++;
        continue;
      }

      throw new ForgeNetworkError(
        `Intrinsic network failure on provider '${activeProvider.id ?? `provider-${providerIndex}`}' and no fallback provider was available`,
        providerIndex,
        activeProvider.id ?? `provider-${providerIndex}`,
        error,
      );
    }

    const callDurationMs = Date.now() - callStartedAt;
    networkDurationMs += callDurationMs;
    providerHops.push({
      providerId: activeProvider.id ?? `provider-${providerIndex}`,
      attempt,
      succeeded: false,
      durationMs: callDurationMs,
    });

    let agentIterations = 0;
    let fallbackTriggeredFromToolLoop = false;
    let toolCalls = extractToolCalls(raw);
    while (toolCalls.length > 0) {
      agentIterations++;
      if (agentIterations > maxAgentIterations) {
        throw new Error(`maxAgentIterations (${maxAgentIterations}) exceeded`);
      }

      const toolMessages: Message[] = [];
      for (const call of toolCalls) {
        const toolDef = options?.tools?.[call.name];
        if (!toolDef) {
          toolMessages.push({
            role: "tool",
            content: `Tool '${call.name}' is not registered.`,
            toolResponse: {
              toolCallId: call.id,
              name: call.name,
              content: `Tool '${call.name}' is not registered.`,
              isError: true,
            },
          });
          continue;
        }

        let parsedArgs: unknown;
        try {
          parsedArgs = JSON.parse(call.arguments);
        } catch {
          parsedArgs = {};
        }

        const validated = toolDef.schema.safeParse(parsedArgs);
        if (!validated.success) {
          toolMessages.push({
            role: "tool",
            content: `Tool '${call.name}' received invalid arguments`,
            toolResponse: {
              toolCallId: call.id,
              name: call.name,
              content: `Tool '${call.name}' received invalid arguments`,
              isError: true,
            },
          });
          continue;
        }

        const started = Date.now();
        try {
          const result = await runWithTimeout(
            Promise.resolve(toolDef.execute(validated.data)),
            toolTimeoutMs,
          );
          toolExecutionDurationMs += Date.now() - started;

          const serialized =
            typeof result === "string" ? result : JSON.stringify(result);
          toolMessages.push({
            role: "tool",
            content: serialized,
            toolResponse: {
              toolCallId: call.id,
              name: call.name,
              content: serialized,
            },
          });
        } catch (error) {
          toolExecutionDurationMs += Date.now() - started;
          const msg = error instanceof Error ? error.message : "Unknown tool error";
          toolMessages.push({
            role: "tool",
            content: `Tool ${call.name} failed with message: ${msg}`,
            toolResponse: {
              toolCallId: call.id,
              name: call.name,
              content: `Tool ${call.name} failed with message: ${msg}`,
              isError: true,
            },
          });
        }
      }

      conversation.push(
        {
          role: "assistant",
          content: raw,
          toolCalls: toolCalls.map((c) => ({
            id: c.id,
            name: c.name,
            arguments: c.arguments,
          })),
        },
        ...toolMessages,
      );

      const loopCallStartedAt = Date.now();
      try {
        raw = await activeProvider.call(conversation, providerOptions);
      } catch (error) {
        const loopDurationMs = Date.now() - loopCallStartedAt;
        networkDurationMs += loopDurationMs;
        providerHops.push({
          providerId: activeProvider.id ?? `provider-${providerIndex}`,
          attempt,
          succeeded: false,
          durationMs: loopDurationMs,
        });

        if (!isIntrinsicNetworkError(error)) {
          throw error;
        }

        if (providerIndex < providers.length - 1) {
          attempt--;
          providerIndex++;
          fallbackTriggeredFromToolLoop = true;
          break;
        }

        throw new ForgeNetworkError(
          `Intrinsic network failure on provider '${activeProvider.id ?? `provider-${providerIndex}`}' and no fallback provider was available`,
          providerIndex,
          activeProvider.id ?? `provider-${providerIndex}`,
          error,
        );
      }

      const loopDurationMs = Date.now() - loopCallStartedAt;
      networkDurationMs += loopDurationMs;
      providerHops.push({
        providerId: activeProvider.id ?? `provider-${providerIndex}`,
        attempt,
        succeeded: false,
        durationMs: loopDurationMs,
      });

      toolCalls = extractToolCalls(raw);
    }

    if (fallbackTriggeredFromToolLoop) {
      continue;
    }

    options?.onChunk?.(raw);

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
      const successStatus = result.telemetry.status as
        | "clean"
        | "repaired_natively"
        | "coerced_locally";

      options?.onEvent?.({
        kind: "guard_success",
        attempt,
        status: successStatus,
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

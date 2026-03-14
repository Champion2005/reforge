import type { ZodIssue } from "zod";
import type { ZodTypeAny, infer as ZodInfer } from "zod";
import type { TelemetryData, GuardOptions } from "../types.js";

// ---------------------------------------------------------------------------
// Provider Layer Types — these form the contract for the forge() function
// and provider adapters.
// ---------------------------------------------------------------------------

/**
 * A message in the LLM conversation format.
 */
export interface MessageTextBlock {
  type: "text";
  text: string;
}

export interface MessageImageUrlBlock {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type MessageContentBlock = MessageTextBlock | MessageImageUrlBlock;
export type MessageContent = string | MessageContentBlock[];

export interface ReforgeToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ReforgeToolResponse {
  toolCallId: string;
  name: string;
  content: MessageContent;
  isError?: boolean;
}

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: MessageContent;
  toolCalls?: ReforgeToolCall[];
  toolResponse?: ReforgeToolResponse;
}

/**
 * Backwards-compatible alias for generic native provider options.
 */
export type ProviderCallOptions = Record<string, unknown>;

/**
 * The minimal interface every provider adapter must implement.
 *
 * Each built-in adapter factory (`openaiCompatible()`, `anthropic()`, `google()`)
 * returns an object satisfying this interface. Users can also implement it
 * directly for any provider not covered by the built-ins.
 */
export interface ReforgeProvider<
  TNativeOptions extends Record<string, unknown> = ProviderCallOptions,
> {
  readonly id?: string;
  call(messages: Message[], options?: TNativeOptions): Promise<string>;
}

export interface ReforgeTool<TSchema extends ZodTypeAny = ZodTypeAny> {
  description?: string;
  schema: TSchema;
  execute: (args: ZodInfer<TSchema>) => Promise<unknown> | unknown;
}

export interface ForgeFailurePayload {
  errors: ZodIssue[];
  retryPrompt: string;
}

export interface ForgeRetryPolicy<
  TNativeOptions extends Record<string, unknown> = ProviderCallOptions,
> {
  maxRetries?: number;
  shouldRetry?: (failure: ForgeFailurePayload, attempt: number) => boolean;
  mutateProviderOptions?: (
    attempt: number,
    baseOptions: TNativeOptions | undefined,
  ) => TNativeOptions;
}

export type ForgeEvent =
  | { kind: "attempt_start"; attempt: number; totalAttempts: number }
  | {
      kind: "provider_response";
      attempt: number;
      rawLength: number;
      truncatedForRetry: boolean;
    }
  | {
      kind: "guard_success";
      attempt: number;
      status: "clean" | "repaired_natively";
      durationMs: number;
    }
  | {
      kind: "guard_failure";
      attempt: number;
      durationMs: number;
      errorCount: number;
    }
  | {
      kind: "retry_scheduled";
      attempt: number;
      nextAttempt: number;
      reason: "guard_failure";
    }
  | {
      kind: "finished";
      success: boolean;
      attempts: number;
      totalDurationMs: number;
    };

/**
 * Options for the `forge()` orchestrator.
 */
export interface ForgeOptions<
  TNativeOptions extends Record<string, unknown> = ProviderCallOptions,
> {
  /** Maximum number of retry attempts after the initial call. Default: 3. */
  maxRetries?: number;
  /** Optional retry policy hooks for advanced retry control. */
  retryPolicy?: ForgeRetryPolicy<TNativeOptions>;
  /** Options passed through to the provider on every call. */
  providerOptions?: TNativeOptions;
  /** Forwarded to `guard()` on every attempt. */
  guardOptions?: GuardOptions;
  /** Local tools exposed to the orchestrator. */
  tools?: Record<string, ReforgeTool>;
  /** Hard timeout applied to local tool execution. */
  toolTimeoutMs?: number;
  /** Callback invoked after a failed attempt that will be retried. */
  onRetry?: (attempt: number, failure: { errors: ZodIssue[]; retryPrompt: string }) => void;
  /** Structured event stream for observability. */
  onEvent?: (event: ForgeEvent) => void;
}

export interface ForgeFallbackProvider {
  provider: ReforgeProvider;
  maxAttempts?: number;
  providerOptions?: ProviderCallOptions;
}

export interface ForgeFallbackOptions {
  guardOptions?: GuardOptions;
  onRetry?: ForgeOptions["onRetry"];
  onEvent?: ForgeOptions["onEvent"];
  onProviderFallback?: (fromProviderIndex: number, toProviderIndex: number) => void;
}

export interface ForgeAttemptDetail {
  attempt: number;
  durationMs: number;
  status: "clean" | "repaired_natively" | "failed";
}

export interface ForgeProviderHop {
  providerId: string;
  attempt: number;
  succeeded: boolean;
  durationMs: number;
}

/**
 * Telemetry data from a `forge()` run. Extends the core `TelemetryData`
 * with multi-attempt tracking.
 */
export interface ForgeTelemetry extends TelemetryData {
  /** Total number of provider calls made (1 = success on first try). */
  attempts: number;
  /** Wall-clock time across all attempts (including provider latency). */
  totalDurationMs: number;
  /** Time spent inside provider calls. */
  networkDurationMs: number;
  /** Time spent executing local tools. */
  toolExecutionDurationMs: number;
  /** Ordered provider hops made by forge(). */
  providerHops: ForgeProviderHop[];
  /** Per-attempt guard telemetry snapshots. */
  attemptDetails: ForgeAttemptDetail[];
}

/**
 * Returned when `forge()` succeeds — the LLM output has been validated
 * (possibly after retries).
 */
export interface ForgeSuccess<T> {
  success: true;
  data: T;
  telemetry: ForgeTelemetry;
  isRepaired: boolean;
}

/**
 * Returned when `forge()` fails — all retry attempts exhausted.
 */
export interface ForgeFailure {
  success: false;
  errors: ZodIssue[];
  retryPrompt: string;
  telemetry: ForgeTelemetry;
}

/**
 * Discriminated union returned by `forge()`.
 */
export type ForgeResult<T> = ForgeSuccess<T> | ForgeFailure;

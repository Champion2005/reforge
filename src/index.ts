/**
 * # Reforge
 *
 * Raw LLM output reforged into clean data. Low-latency deterministic
 * validation and native JSON repair.
 *
 * ## Quick Start
 *
 * ```ts
 * import { z } from 'zod';
 * import { guard } from 'reforge-ai';
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age:  z.number(),
 * });
 *
 * // Raw LLM output — markdown-wrapped with a trailing comma:
 * const raw = '```json\n{"name": "Alice", "age": 30,}\n```';
 *
 * const result = guard(raw, UserSchema);
 *
 * if (result.success) {
 *   console.log(result.data);       // { name: "Alice", age: 30 }
 *   console.log(result.isRepaired); // true
 *   console.log(result.telemetry);  // { durationMs: 0.55, status: "repaired_natively" }
 * } else {
 *   // Append result.retryPrompt to your LLM message array for a corrective retry.
 *   console.log(result.retryPrompt);
 *   console.log(result.errors);     // ZodIssue[]
 * }
 * ```
 *
 * ## Exports
 *
 * | Export | Kind | Description |
 * |--------|------|-------------|
 * | {@link guard} | Function | The main entry-point — parse, repair, validate.  |
 * | {@link GuardResult} | Type | Discriminated union returned by `guard()`. |
 * | {@link GuardSuccess} | Type | The success branch of `GuardResult`. |
 * | {@link GuardFailure} | Type | The failure branch of `GuardResult`. |
 * | {@link TelemetryData} | Type | Timing and status metadata. |
 *
 * @packageDocumentation
 */

export { guard } from "./guard.js";
export { forge } from "./providers/forge.js";
export { forgeWithFallback } from "./providers/fallback.js";
export type {
  GuardResult,
  GuardSuccess,
  GuardFailure,
  TelemetryData,
  GuardOptions,
  GuardProfile,
  GuardHeuristicOptions,
  GuardDebugArtifacts,
  RetryPromptOptions,
  RetryPromptMode,
  RetryPromptContextBlock,
  RetryPromptStrategy,
  RetryPromptStrategyInput,
} from "./types.js";
export type {
  Message,
  ProviderCallOptions,
  ReforgeProvider,
  ForgeOptions,
  ForgeRetryPolicy,
  ForgeEvent,
  ForgeFailurePayload,
  ForgeFallbackProvider,
  ForgeFallbackOptions,
  ForgeTelemetry,
  ForgeAttemptDetail,
  ForgeResult,
  ForgeSuccess,
  ForgeFailure,
} from "./providers/types.js";


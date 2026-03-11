import type { ZodTypeAny, infer as ZodInfer } from "zod";
import type { GuardResult, TelemetryData } from "./types.js";
import { dirtyParse } from "./dirty-parser/index.js";
import { validateWithSchema } from "./validation/index.js";
import { generateRetryPrompt } from "./retry/index.js";
import { createTimer } from "./telemetry.js";

/**
 * Validate and repair raw LLM output against a Zod schema.
 *
 * `guard()` is the single entry-point for Reforge. It runs a three-stage
 * pipeline — **parse → validate → report** — and returns a typed,
 * discriminated-union result that is safe to pattern-match on.
 *
 * ### Pipeline
 * 1. **Dirty Parse** — Extracts JSON from markdown wrappers, fixes trailing
 *    commas / unquoted keys / single quotes, and closes truncated brackets.
 * 2. **Schema Validation** — Runs `schema.safeParse()` with automatic
 *    coercion for common LLM type mismatches (string `"true"` → boolean, etc.).
 * 3. **Result** — Returns either `{ success: true, data, telemetry }` or
 *    `{ success: false, retryPrompt, errors, telemetry }`.
 *
 * ### Guarantees
 * - **Never throws.** All error paths return a typed failure object.
 * - **Synchronous.** No async, no network calls, no I/O.
 * - **Pure.** No global state is mutated.
 * - **Fast.** Targets < 5 ms for a 2 KB input string.
 *
 * @typeParam T - A Zod schema type (e.g. `z.ZodObject<…>`).
 * @param llmOutput - The raw string produced by an LLM.
 * @param schema    - The Zod schema the output must conform to.
 * @returns A `GuardResult<z.infer<T>>` — either success with typed data
 *          or failure with a retry prompt and error details.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { guard } from 'reforge';
 *
 * const UserSchema = z.object({
 *   name: z.string(),
 *   age:  z.number(),
 * });
 *
 * const result = guard('```json\n{"name": "Alice", "age": 30,}\n```', UserSchema);
 *
 * if (result.success) {
 *   console.log(result.data);       // { name: "Alice", age: 30 }
 *   console.log(result.isRepaired); // true
 *   console.log(result.telemetry);  // { durationMs: 0.4, status: "repaired_natively" }
 * } else {
 *   // Append result.retryPrompt to your LLM conversation
 *   console.log(result.retryPrompt);
 * }
 * ```
 */
export function guard<T extends ZodTypeAny>(
  llmOutput: string,
  schema: T,
): GuardResult<ZodInfer<T>> {
  const timer = createTimer();

  // --- Safety: handle non-string input at runtime boundary ---
  if (typeof llmOutput !== "string") {
    const telemetry: TelemetryData = {
      durationMs: timer.stop(),
      status: "failed",
    };
    return {
      success: false,
      retryPrompt: generateRetryPrompt([]),
      errors: [],
      telemetry,
    };
  }

  // --- Stage 1: Dirty Parse ---
  const parseResult = dirtyParse(llmOutput);

  if (!parseResult.success) {
    const telemetry: TelemetryData = {
      durationMs: timer.stop(),
      status: "failed",
    };
    return {
      success: false,
      retryPrompt: generateRetryPrompt([]),
      errors: [],
      telemetry,
    };
  }

  // --- Stage 2: Schema Validation (with coercion) ---
  const validationResult = validateWithSchema(parseResult.value, schema);

  if (validationResult.success) {
    const status = parseResult.isRepaired ? "repaired_natively" : "clean";
    const telemetry: TelemetryData = {
      durationMs: timer.stop(),
      status,
    };
    return {
      success: true,
      data: validationResult.data,
      telemetry,
      isRepaired: parseResult.isRepaired,
    };
  }

  // --- Stage 3: Failure — generate retry prompt ---
  const telemetry: TelemetryData = {
    durationMs: timer.stop(),
    status: "failed",
  };
  return {
    success: false,
    retryPrompt: generateRetryPrompt(validationResult.errors),
    errors: validationResult.errors,
    telemetry,
  };
}

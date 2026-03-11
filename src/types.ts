import type { ZodIssue } from "zod";

// ---------------------------------------------------------------------------
// Public Types — these form the contract between Reforge and its consumers.
// ---------------------------------------------------------------------------

/**
 * Telemetry data attached to every `guard()` result.
 *
 * @property durationMs  - Wall-clock time (in milliseconds) the `guard()` call took.
 * @property status      - Outcome classification:
 *   - `"clean"`              – The raw input was already valid JSON **and** matched the schema.
 *   - `"repaired_natively"`  – The Dirty Parser fixed syntactic issues before Zod validation succeeded.
 *   - `"failed"`             – The input could not be parsed or did not match the schema.
 */
export interface TelemetryData {
  durationMs: number;
  status: "clean" | "repaired_natively" | "failed";
}

/**
 * Returned when `guard()` succeeds — the LLM output has been parsed,
 * optionally repaired, and validated against the Zod schema.
 *
 * @typeParam T - The inferred type of the Zod schema.
 */
export interface GuardSuccess<T> {
  success: true;
  /** The validated & typed data. */
  data: T;
  /** Telemetry about the guard run. */
  telemetry: TelemetryData;
  /** `true` when the Dirty Parser had to repair the raw input before it could be parsed. */
  isRepaired: boolean;
}

/**
 * Returned when `guard()` fails — the LLM output could not be repaired
 * into valid JSON or did not pass Zod schema validation.
 */
export interface GuardFailure {
  success: false;
  /**
   * A token-efficient prompt you can append to your LLM message array
   * to request a corrected response.
   */
  retryPrompt: string;
  /** The Zod validation issues (empty when JSON parsing itself failed). */
  errors: ZodIssue[];
  /** Telemetry about the guard run. */
  telemetry: TelemetryData;
}

/**
 * Discriminated union returned by `guard()`.
 *
 * Use `result.success` to narrow the type:
 *
 * ```ts
 * const result = guard(raw, MySchema);
 * if (result.success) {
 *   console.log(result.data); // typed as z.infer<typeof MySchema>
 * } else {
 *   console.log(result.retryPrompt);
 * }
 * ```
 *
 * @typeParam T - The inferred type of the Zod schema.
 */
export type GuardResult<T> = GuardSuccess<T> | GuardFailure;

// ---------------------------------------------------------------------------
// Internal Types — used across modules but not part of the public API.
// ---------------------------------------------------------------------------

/** Result of the Dirty Parser stage. */
export type ParseResult =
  | { success: true; value: unknown; isRepaired: boolean }
  | { success: false; raw: string };

/** Tracks which extraction / heuristic step modified the input. */
export interface ExtractionResult {
  extracted: string;
  wasExtracted: boolean;
}

export interface HeuristicResult {
  result: string;
  applied: boolean;
}

export interface BalanceResult {
  result: string;
  wasBalanced: boolean;
}

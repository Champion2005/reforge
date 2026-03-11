import type { ParseResult } from "../types.js";
import { extractJsonString } from "./extract.js";
import { applyHeuristics } from "./heuristics.js";
import { balanceBrackets } from "./balance.js";

/**
 * The Dirty Parser — Reforge's native JSON repair pipeline.
 *
 * Accepts raw LLM output (which may be wrapped in markdown, contain trailing
 * commas, have unquoted keys, or be truncated) and attempts to produce a
 * valid JavaScript value via `JSON.parse`.
 *
 * ### Pipeline Order
 * 1. **Fast path** — try `JSON.parse(input)` directly.
 * 2. **Extract** — strip markdown fences and conversational wrappers.
 * 3. **Heuristics** — fix trailing commas, unquoted keys, single quotes, escaped quotes.
 * 4. **Balance** — close unclosed brackets/braces (truncated output).
 * 5. **Final parse** — `JSON.parse` on the repaired string.
 *
 * ### Performance
 * The entire pipeline is synchronous, zero-allocation where possible, and
 * operates in O(n) time relative to input length.
 *
 * @param input - Raw string from an LLM.
 * @returns A discriminated-union `ParseResult`: either the parsed value or
 *          the raw input for error reporting.
 *
 * @example
 * ```ts
 * dirtyParse('```json\n{"name": "Alice",}\n```');
 * // => { success: true, value: { name: "Alice" }, isRepaired: true }
 * ```
 */

/** Maximum input size in bytes (10 MB). Inputs larger than this are rejected. */
const MAX_INPUT_SIZE = 10 * 1024 * 1024;

export function dirtyParse(input: string): ParseResult {
  // --- Guard: reject absurdly large inputs to prevent DoS. ---
  if (input.length > MAX_INPUT_SIZE) {
    return { success: false, raw: input };
  }

  // --- Fast path: already valid JSON. ---
  const fast = tryParse(input);
  if (fast !== PARSE_FAILED) {
    return { success: true, value: fast, isRepaired: false };
  }

  // --- Stage 1: Extract ---
  const { extracted, wasExtracted } = extractJsonString(input);

  // --- Stage 2: Heuristics ---
  const { result: heuristicResult, applied: heuristicsApplied } =
    applyHeuristics(extracted);

  // --- Stage 3: Balance ---
  const { result: balanced, wasBalanced } = balanceBrackets(heuristicResult);

  // --- Final parse ---
  const parsed = tryParse(balanced);
  if (parsed !== PARSE_FAILED) {
    const isRepaired = wasExtracted || heuristicsApplied || wasBalanced;
    return { success: true, value: parsed, isRepaired };
  }

  return { success: false, raw: input };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Sentinel value for failed `JSON.parse` attempts (avoids exceptions in hot path). */
const PARSE_FAILED: unique symbol = Symbol("PARSE_FAILED");

function tryParse(input: string): unknown | typeof PARSE_FAILED {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return PARSE_FAILED;
  }
}

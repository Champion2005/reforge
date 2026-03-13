import type { ExtractionResult } from "../types.js";

/**
 * Extract a JSON string from raw LLM output.
 *
 * LLMs frequently wrap JSON inside markdown code fences (` ```json ... ``` `)
 * or surround it with conversational text ("Here is the data: …"). This
 * function locates the outermost JSON object or array and returns it.
 *
 * ### Strategy
 * 1. Try to extract content from a markdown code fence.
 * 2. Otherwise, find the first `{` or `[` and walk to its matching closer.
 * 3. If neither strategy yields content, return the original input unchanged.
 *
 * @param input - The raw string produced by an LLM.
 * @returns The extracted JSON substring and whether extraction was needed.
 *
 * @example
 * ```ts
 * extractJsonString('Here is your data: ```json\n{"a":1}\n```');
 * // => { extracted: '{"a":1}', wasExtracted: true }
 * ```
 */
export function extractJsonString(input: string): ExtractionResult {
  if (input.length === 0) {
    return { extracted: input, wasExtracted: false };
  }

  // --- Strategy 1: Markdown code fence ---
  const fenceResult = extractFromCodeFence(input);
  if (fenceResult !== null) {
    return { extracted: fenceResult, wasExtracted: true };
  }

  // --- Strategy 2: Find outermost { or [ ---
  const bracketResult = extractFromBrackets(input);
  if (bracketResult !== null) {
    return { extracted: bracketResult, wasExtracted: true };
  }

  // Nothing found — return original.
  return { extracted: input, wasExtracted: false };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const FENCE_OPEN = /(```|~~~)(?:json|JSON|js|javascript)?\s*\n?/;

/**
 * Attempt to pull content from the first markdown code fence that contains
 * a JSON-like structure (`{` or `[`).
 */
function extractFromCodeFence(input: string): string | null {
  let searchStart = 0;

  while (searchStart < input.length) {
    const openMatch = FENCE_OPEN.exec(input.slice(searchStart));
    if (!openMatch) return null;

    const fence = openMatch[1] ?? "```";
    const contentStart = searchStart + openMatch.index + openMatch[0].length;
    const closeIdx = input.indexOf(fence, contentStart);
    if (closeIdx === -1) {
      // Unclosed fence — treat everything after the open as content.
      const content = input.slice(contentStart).trim();
      if (looksLikeJson(content)) return content;
      return null;
    }

    const content = input.slice(contentStart, closeIdx).trim();
    if (looksLikeJson(content)) return content;

    // This fence didn't contain JSON — keep searching after it.
    searchStart = closeIdx + fence.length;
  }

  return null;
}

/**
 * Find the first `{` or `[` in the input and walk forward (tracking nesting
 * and string context) to find its matching closer.
 *
 * If the closer is not found (truncated output), return everything from the
 * opener to the end — bracket balancing will fix it later.
 */
function extractFromBrackets(input: string): string | null {
  // Find the first character that starts a JSON structure.
  let startIdx = -1;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === "{" || ch === "[") {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) return null;

  // Walk forward to find the matching closer.
  const opener = input[startIdx]!;
  let inString = false;
  const stack: string[] = [opener];
  let lastMatchedCloserIdx = -1;

  for (let i = startIdx + 1; i < input.length; i++) {
    const ch = input[i]!;

    if (inString) {
      if (ch === "\\" && i + 1 < input.length) {
        i++; // skip escaped char
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push(ch);
      continue;
    }

    if (ch === "}" || ch === "]") {
      const top = stack[stack.length - 1];
      if (!top) {
        // Ignore orphan closers; they should not drive truncation bounds.
        continue;
      }

      const expectedCloser = top === "{" ? "}" : "]";
      if (ch !== expectedCloser) {
        // Ignore mismatched closers; keep current nesting state intact.
        continue;
      }

      stack.pop();
      lastMatchedCloserIdx = i;

      if (stack.length === 0) {
        // Found exact match for the first opener — return the substring.
        const extracted = input.slice(startIdx, i + 1);
        if (extracted !== input) return extracted;
        return null; // Already the full input, no extraction needed.
      }
    }
  }

  // Truncated — return from opener to last closer or end of input.
  // Let the balance stage handle fixing it.
  const end = lastMatchedCloserIdx > startIdx ? lastMatchedCloserIdx + 1 : input.length;
  const extracted = input.slice(startIdx, end);
  if (extracted !== input) return extracted;
  return null;
}

function looksLikeJson(s: string): boolean {
  return s.startsWith("{") || s.startsWith("[");
}

import { describe, it, expect } from "vitest";
import { extractJsonString } from "../../src/dirty-parser/extract.js";

describe("extractJsonString", () => {
  // -----------------------------------------------------------------------
  // No-op cases
  // -----------------------------------------------------------------------

  it("returns empty string unchanged", () => {
    const r = extractJsonString("");
    expect(r).toEqual({ extracted: "", wasExtracted: false });
  });

  it("returns plain JSON object unchanged", () => {
    const input = '{"name": "Alice"}';
    const r = extractJsonString(input);
    expect(r).toEqual({ extracted: input, wasExtracted: false });
  });

  it("returns plain JSON array unchanged", () => {
    const input = '[1, 2, 3]';
    const r = extractJsonString(input);
    expect(r).toEqual({ extracted: input, wasExtracted: false });
  });

  it("returns non-JSON text unchanged", () => {
    const r = extractJsonString("Hello world, no JSON here.");
    expect(r).toEqual({
      extracted: "Hello world, no JSON here.",
      wasExtracted: false,
    });
  });

  // -----------------------------------------------------------------------
  // Markdown code fence extraction
  // -----------------------------------------------------------------------

  it("extracts JSON from ```json code fence", () => {
    const input = '```json\n{"a": 1}\n```';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"a": 1}');
  });

  it("extracts JSON from ``` code fence (no language tag)", () => {
    const input = '```\n{"a": 1}\n```';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"a": 1}');
  });

  it("extracts JSON from ```JSON code fence (uppercase)", () => {
    const input = '```JSON\n{"key": "val"}\n```';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"key": "val"}');
  });

  it("extracts JSON from ~~~json code fence", () => {
    const input = '~~~json\n{"a": 1}\n~~~';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"a": 1}');
  });

  it("handles unclosed ~~~ code fence", () => {
    const input = '~~~json\n{"key": "value"}\n';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"key": "value"}');
  });

  it("extracts array from code fence", () => {
    const input = '```json\n[1, 2, 3]\n```';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe("[1, 2, 3]");
  });

  it("handles fence with surrounding text", () => {
    const input =
      'Here is the data:\n```json\n{"a": 1}\n```\nHope that helps!';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"a": 1}');
  });

  it("skips non-JSON code fences and finds JSON fence", () => {
    const input =
      '```python\nprint("hi")\n```\n```json\n{"found": true}\n```';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"found": true}');
  });

  it("handles unclosed code fence (truncated)", () => {
    const input = '```json\n{"key": "value"}\n';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"key": "value"}');
  });

  // -----------------------------------------------------------------------
  // Conversational wrapper extraction
  // -----------------------------------------------------------------------

  it("extracts from conversational text before JSON object", () => {
    const input = 'Here is the data: {"name": "Alice"}';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"name": "Alice"}');
  });

  it("extracts from conversational text around JSON array", () => {
    const input = "Sure! [1, 2, 3] — there you go.";
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe("[1, 2, 3]");
  });

  it("handles text after JSON object", () => {
    const input = '{"a": 1} Let me know if you need more.';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"a": 1}');
  });

  it("handles unclosed code fence with non-JSON content", () => {
    const input = "```json\nThis is not JSON\n";
    const r = extractJsonString(input);
    // Falls through to bracket extraction or returns original
    expect(r.extracted).toBeDefined();
  });

  it("handles unclosed fence that has no JSON, falls back to brackets", () => {
    const input = "```json\nno json here";
    const r = extractJsonString(input);
    // No brackets either — returns original
    expect(r.wasExtracted).toBe(false);
  });

  it("handles unclosed fence with non-JSON content and no brackets in input", () => {
    // Triggers the unclosed-fence path where content doesn't start with { or [
    const input = "```json\nplain text without json";
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(false);
  });

  it("handles closed fence with non-JSON content only", () => {
    // Triggers the closed-fence non-JSON branch followed by null return
    const input = "```json\nnot json\n```";
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(false);
  });

  it("skips closed fence with non-JSON then finds JSON via brackets", () => {
    const input = '```\nplain text\n```\nSome text {"key": 1} after';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"key": 1}');
  });

  it("skips fence with non-JSON content and finds brackets instead", () => {
    const input = '```python\nprint("hello")\n```\n{"found": true}';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(JSON.parse(r.extracted)).toEqual({ found: true });
  });

  it("handles escaped quotes inside string values during bracket extraction", () => {
    const input = 'Prefix {"msg": "has \\"escaped\\" quotes"} suffix';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
  });

  it("handles truncated nested output from brackets", () => {
    const input = 'Here: {"items": [{"id": 1';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"items": [{"id": 1');
  });

  it("ignores mismatched/orphan closers when computing truncated extraction bounds", () => {
    const input = 'Prefix {"items": [1, 2]}] trailing text';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(r.extracted).toBe('{"items": [1, 2]}');
  });

  it("extracts nested JSON correctly with conversational wrapper", () => {
    const input =
      'Here: {"user": {"name": "Bob", "age": 30}} and more text.';
    const r = extractJsonString(input);
    expect(r.wasExtracted).toBe(true);
    expect(JSON.parse(r.extracted)).toEqual({
      user: { name: "Bob", age: 30 },
    });
  });
});

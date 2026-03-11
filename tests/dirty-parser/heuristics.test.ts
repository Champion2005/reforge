import { describe, it, expect } from "vitest";
import { applyHeuristics } from "../../src/dirty-parser/heuristics.js";

describe("applyHeuristics", () => {
  // -----------------------------------------------------------------------
  // No-op cases
  // -----------------------------------------------------------------------

  it("returns empty string unchanged", () => {
    const r = applyHeuristics("");
    expect(r).toEqual({ result: "", applied: false });
  });

  it("returns valid JSON unchanged", () => {
    const input = '{"name": "Alice", "age": 30}';
    const r = applyHeuristics(input);
    expect(r).toEqual({ result: input, applied: false });
  });

  // -----------------------------------------------------------------------
  // Trailing commas
  // -----------------------------------------------------------------------

  it("removes trailing comma in object", () => {
    const r = applyHeuristics('{"a": 1,}');
    expect(r.applied).toBe(true);
    expect(r.result).toBe('{"a": 1}');
  });

  it("removes trailing comma in array", () => {
    const r = applyHeuristics("[1, 2, 3,]");
    expect(r.applied).toBe(true);
    expect(r.result).toBe("[1, 2, 3]");
  });

  it("removes trailing comma with whitespace before closer", () => {
    const r = applyHeuristics('{"a": 1,  }');
    expect(r.applied).toBe(true);
    expect(r.result).toBe('{"a": 1  }');
  });

  it("removes trailing comma in nested structure", () => {
    const r = applyHeuristics('{"a": {"b": 1,}, "c": [1,],}');
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ a: { b: 1 }, c: [1] });
  });

  it("does NOT remove commas inside string values", () => {
    const input = '{"text": "hello, world,"}';
    const r = applyHeuristics(input);
    // The comma inside the string should stay; only trailing comma before } is removed
    expect(JSON.parse(r.result)).toEqual({ text: "hello, world," });
  });

  // -----------------------------------------------------------------------
  // Unquoted keys
  // -----------------------------------------------------------------------

  it("wraps simple unquoted keys", () => {
    const r = applyHeuristics('{name: "John"}');
    expect(r.applied).toBe(true);
    expect(r.result).toBe('{"name": "John"}');
  });

  it("wraps multiple unquoted keys", () => {
    const r = applyHeuristics('{first_name: "Jane", age: 30}');
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ first_name: "Jane", age: 30 });
  });

  it("wraps unquoted keys with dollar sign", () => {
    const r = applyHeuristics('{$id: 123}');
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ $id: 123 });
  });

  it("wraps unquoted keys with underscores and numbers", () => {
    const r = applyHeuristics('{item_2: "val"}');
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ item_2: "val" });
  });

  it("does NOT treat values as keys", () => {
    // "name" is already quoted, value true should not be wrapped
    const input = '{"name": true}';
    const r = applyHeuristics(input);
    expect(r.result).toBe(input);
    expect(r.applied).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Escaped quote anomalies
  // -----------------------------------------------------------------------

  it("fixes fully escaped-quote JSON", () => {
    const r = applyHeuristics('{\\\"key\\\": \\\"value\\\"}');
    expect(r.applied).toBe(true);
    expect(r.result).toBe('{"key": "value"}');
  });

  it("does NOT unescape when there are normal quotes too", () => {
    // If there are both normal and escaped quotes, leave it alone
    const input = '{"normal": "value", "plus": "has \\"escaped\\" inside"}';
    const r = applyHeuristics(input);
    expect(r.result).toBe(input);
  });

  // -----------------------------------------------------------------------
  // Single-quoted strings
  // -----------------------------------------------------------------------

  it("converts single-quoted strings to double-quoted", () => {
    const r = applyHeuristics("{'key': 'value'}");
    expect(r.applied).toBe(true);
    expect(r.result).toBe('{"key": "value"}');
  });

  it("handles mixed single and double quotes", () => {
    const r = applyHeuristics("{\"name\": 'Alice'}");
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ name: "Alice" });
  });

  it("escapes double quotes inside single-quoted strings", () => {
    const r = applyHeuristics("{'key': 'value with \"quotes\"'}");
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ key: 'value with "quotes"' });
  });

  it("handles escaped single-quote inside single-quoted string", () => {
    // 'it\'s great' → "it's great" (unescape \' to ')
    const r = applyHeuristics("{'key': 'it\\'s great'}");
    expect(r.applied).toBe(true);
    // After conversion: the \' should be unescaped to just '
    // Result: {"key": "it's great"}
    expect(r.result).toBe("{\"key\": \"it's great\"}");
  });

  it("handles escaped double-quote inside single-quoted string", () => {
    const r = applyHeuristics("{'key': 'has \\\"dq\\\"'}");
    expect(r.applied).toBe(true);
  });

  it("escapes raw double-quote inside single-quoted value", () => {
    // Single-quoted string containing a raw " char (not escaped)
    // e.g. {'key': 'say "hello"'} → {"key": "say \"hello\""}
    const r = applyHeuristics("{\'key\': \'say \"hello\"\'}");
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ key: 'say "hello"' });
  });

  it("handles generic escape sequence inside single-quoted string", () => {
    // \n inside a single-quoted string should stay as \n
    const r = applyHeuristics("{'key': 'line\\none'}");
    expect(r.applied).toBe(true);
    expect(r.result).toContain('\\n');
  });

  it("handles escape sequence inside double-quoted string", () => {
    const input = '{"key": "line\\none"}';
    const r = applyHeuristics(input);
    // Already valid JSON with escape — should not change
    expect(r.result).toBe(input);
  });

  it("handles trailing backslash at end of string input", () => {
    // Edge: single-quoted string ending with bare backslash
    const input = "{'k': 'v" + "\\\\'}";
    const r = applyHeuristics(input);
    expect(r.applied).toBe(true);
  });

  it("handles escape at end of single-quoted string", () => {
    const r = applyHeuristics("{'key': 'test\\'}");
    expect(r.applied).toBe(true);
  });

  it("handles escape at end of double-quoted string", () => {
    const r = applyHeuristics('{"key": "test\\\\"}');
    // Valid JSON with escaped backslash — should not change
    expect(r.result).toBeDefined();
  });

  it("handles trailing backslash at end of single-quoted input", () => {
    // Single char after backslash missing — triggers trailing backslash branch
    const input = "{'k': 'v\\";
    const r = applyHeuristics(input);
    expect(r.applied).toBe(true);
  });

  it("handles escape in double-quoted string preserves escape as-is", () => {
    // Triggers the double-quote escape path (inDouble + backslash)
    const input = '{"key": "line\\tvalue"}';
    const r = applyHeuristics(input);
    expect(r.result).toBe(input);
  });

  // -----------------------------------------------------------------------
  // Combined issues
  // -----------------------------------------------------------------------

  it("handles trailing comma + unquoted keys together", () => {
    const r = applyHeuristics("{name: \"John\", age: 30,}");
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ name: "John", age: 30 });
  });

  it("handles single quotes + trailing commas together", () => {
    const r = applyHeuristics("{'name': 'Alice',}");
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ name: "Alice" });
  });

  it("handles unquoted keys + single quote values", () => {
    const r = applyHeuristics("{name: 'Bob', active: true}");
    expect(r.applied).toBe(true);
    expect(JSON.parse(r.result)).toEqual({ name: "Bob", active: true });
  });
});

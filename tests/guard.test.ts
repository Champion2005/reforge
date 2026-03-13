import { describe, it, expect } from "vitest";
import { z } from "zod";
import { guard } from "../src/guard.js";

describe("guard()", () => {
  // -----------------------------------------------------------------------
  // Success: clean JSON
  // -----------------------------------------------------------------------

  it("returns success with clean status for valid JSON", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const r = guard('{"name": "Alice", "age": 30}', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ name: "Alice", age: 30 });
      expect(r.isRepaired).toBe(false);
      expect(r.telemetry.status).toBe("clean");
      expect(r.telemetry.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  // -----------------------------------------------------------------------
  // Success: repaired natively
  // -----------------------------------------------------------------------

  it("returns repaired_natively for markdown-wrapped JSON", () => {
    const schema = z.object({ a: z.number() });
    const r = guard('```json\n{"a": 1}\n```', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ a: 1 });
      expect(r.isRepaired).toBe(true);
      expect(r.telemetry.status).toBe("repaired_natively");
    }
  });

  it("returns repaired_natively for trailing-comma JSON", () => {
    const schema = z.object({ x: z.number() });
    const r = guard('{"x": 42,}', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ x: 42 });
      expect(r.isRepaired).toBe(true);
      expect(r.telemetry.status).toBe("repaired_natively");
    }
  });

  it("returns repaired_natively for unquoted-key JSON", () => {
    const schema = z.object({ name: z.string() });
    const r = guard('{name: "Alice"}', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ name: "Alice" });
      expect(r.isRepaired).toBe(true);
    }
  });

  it("returns repaired_natively for truncated JSON", () => {
    const schema = z.object({ items: z.array(z.number()) });
    const r = guard('{"items": [1, 2, 3', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ items: [1, 2, 3] });
      expect(r.isRepaired).toBe(true);
    }
  });

  it("handles coercion: string numbers → number", () => {
    const schema = z.object({ count: z.number() });
    const r = guard('{"count": "5"}', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(5);
    }
  });

  it("handles coercion: string booleans → boolean", () => {
    const schema = z.object({ active: z.boolean() });
    const r = guard('{"active": "true"}', schema);

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.active).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // Complex real-world LLM outputs
  // -----------------------------------------------------------------------

  it("repairs a full real-world LLM response", () => {
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          age: z.number(),
          active: z.boolean(),
        }),
      ),
    });

    const raw = `Sure! Here's the data:
\`\`\`json
{
  users: [
    {name: 'Alice', age: 30, active: true},
    {name: 'Bob', age: 25, active: false},
  ]
}
\`\`\`
Let me know if you need anything else!`;

    const r = guard(raw, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.users).toHaveLength(2);
      expect(r.data.users[0]!.name).toBe("Alice");
      expect(r.data.users[1]!.name).toBe("Bob");
      expect(r.isRepaired).toBe(true);
      expect(r.telemetry.status).toBe("repaired_natively");
    }
  });

  // -----------------------------------------------------------------------
  // Failure: schema mismatch
  // -----------------------------------------------------------------------

  it("returns failure with retryPrompt for schema mismatch", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const r = guard('{"name": "Alice"}', schema);

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.telemetry.status).toBe("failed");
      expect(r.retryPrompt).toContain("failed schema validation");
      expect(r.retryPrompt).toContain("schema is still in your context");
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  // -----------------------------------------------------------------------
  // Failure: unparseable input
  // -----------------------------------------------------------------------

  it("returns failure for completely non-JSON input", () => {
    const schema = z.object({ a: z.string() });
    const r = guard("This is not JSON at all.", schema);

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.telemetry.status).toBe("failed");
      expect(r.retryPrompt).toBeTruthy();
      expect(r.errors.length).toBe(1);
      expect(r.errors[0]!.code).toBe("custom");
      expect(r.errors[0]!.message).toBe("Input could not be parsed as JSON");
      expect(r.errors[0]!.path).toEqual([]);
    }
  });

  it("returns failure for empty input", () => {
    const schema = z.object({ a: z.string() });
    const r = guard("", schema);

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.telemetry.status).toBe("failed");
      expect(r.errors.length).toBe(1);
      expect(r.errors[0]!.code).toBe("custom");
    }
  });

  it("returns parse failure errors for non-string runtime input", () => {
    const schema = z.object({ a: z.string() });
    const r = guard(undefined as unknown as string, schema);

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.telemetry.status).toBe("failed");
      expect(r.errors.length).toBe(1);
      expect(r.errors[0]!.code).toBe("custom");
      expect(r.errors[0]!.message).toBe("Input could not be parsed as JSON");
    }
  });

  // -----------------------------------------------------------------------
  // Safety: never throws
  // -----------------------------------------------------------------------

  it("never throws on undefined-ish input", () => {
    const schema = z.object({ a: z.string() });
    // TypeScript would prevent this, but at runtime LLMs produce anything.
    expect(() => guard(undefined as unknown as string, schema)).not.toThrow();
    expect(() => guard(null as unknown as string, schema)).not.toThrow();
  });

  // -----------------------------------------------------------------------
  // Telemetry
  // -----------------------------------------------------------------------

  it("always includes durationMs as a non-negative number", () => {
    const schema = z.object({ a: z.string() });
    const success = guard('{"a": "hi"}', schema);
    const failure = guard("nope", schema);

    if (success.success) {
      expect(success.telemetry.durationMs).toBeGreaterThanOrEqual(0);
    }
    if (!failure.success) {
      expect(failure.telemetry.durationMs).toBeGreaterThanOrEqual(0);
    }
  });

  // -----------------------------------------------------------------------
  // Performance
  // -----------------------------------------------------------------------

  it("completes in under 5ms for a 2KB input", () => {
    const schema = z.object({
      items: z.array(z.object({ id: z.number(), name: z.string() })),
    });

    // Build a ~2KB JSON string.
    const items = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      name: `Item ${i} with some extra text to pad the size`,
    }));
    const raw = JSON.stringify({ items });
    expect(raw.length).toBeGreaterThan(1500);
    expect(raw.length).toBeLessThan(3000);

    const r = guard(raw, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.telemetry.durationMs).toBeLessThan(5);
    }
  });

  it("supports line-aware retry prompts through guard options", () => {
    const schema = z.object({
      user: z.object({
        age: z.number(),
        tags: z.array(z.string()),
      }),
    });
    const r = guard('{"user":{"age":"30","tags":"a,b"}}', schema, {
      retryPrompt: { mode: "line-aware", contextRadius: 1 },
    });

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.retryPrompt).toContain("Relevant lines:");
      expect(r.retryPrompt).toContain('"tags":"a,b"');
    }
  });

  it("supports safe profile and heuristic overrides", () => {
    const schema = z.object({ a: z.number() });

    const safeFail = guard('{"a": 1 // comment\n}', schema, {
      profile: "safe",
    });
    expect(safeFail.success).toBe(false);

    const overridePass = guard('{"a": 1 // comment\n}', schema, {
      profile: "safe",
      heuristics: { stripComments: true },
    });
    expect(overridePass.success).toBe(true);
  });

  it("includes debug artifacts when debug option is enabled", () => {
    const schema = z.object({ a: z.number() });
    const r = guard('{a: "2",}', schema, { debug: true });

    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.debug).toBeDefined();
      expect(r.debug?.appliedRepairs?.length).toBeGreaterThan(0);
      expect(r.debug?.repairedText).toContain('"a": "2"');
    }
  });

  it("uses custom retryPromptStrategy from guard options", () => {
    const schema = z.object({ a: z.number() });
    const r = guard('{"a":"oops"}', schema, {
      retryPromptStrategy: () => "CUSTOM-STRATEGY",
    });

    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.retryPrompt).toBe("CUSTOM-STRATEGY");
    }
  });
});

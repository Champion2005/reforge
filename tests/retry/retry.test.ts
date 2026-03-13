import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateRetryPrompt } from "../../src/retry/index.js";

describe("generateRetryPrompt", () => {
  // -----------------------------------------------------------------------
  // Parse failures (empty errors array)
  // -----------------------------------------------------------------------

  it("returns parse-failure prompt for empty errors with no snippet", () => {
    const prompt = generateRetryPrompt([]);
    expect(prompt).toContain("could not be parsed as JSON");
    expect(prompt).toContain("schema is still in your context");
    expect(prompt).toContain("return ONLY valid JSON");
  });

  it("includes raw snippet in parse-failure prompt", () => {
    const raw = '{name: Alice, age:}';
    const prompt = generateRetryPrompt([], raw);
    expect(prompt).toContain("could not be parsed as JSON");
    expect(prompt).toContain(raw);
    expect(prompt).toContain("schema is still in your context");
  });

  it("omits snippet entirely when raw output exceeds 300 characters", () => {
    const raw = "x".repeat(400);
    const prompt = generateRetryPrompt([], raw);
    expect(prompt).toContain("could not be parsed as JSON");
    expect(prompt).not.toContain("Got:");
    expect(prompt).not.toContain("x".repeat(10));
  });

  it("includes snippet when raw output fits within 300 characters", () => {
    const raw = "{bad json here}";
    const prompt = generateRetryPrompt([], raw);
    expect(prompt).toContain("Got:");
    expect(prompt).toContain("{bad json here}");
  });

  it("treats empty string rawSnippet as no snippet", () => {
    const prompt = generateRetryPrompt([], "");
    expect(prompt).toContain("could not be parsed as JSON");
    expect(prompt).not.toContain("Got:");
  });

  // -----------------------------------------------------------------------
  // Validation failures (Zod errors)
  // -----------------------------------------------------------------------

  it("formats a single error with path and expected/received", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "number",
        received: "string",
        path: ["user", "age"],
        message: "Expected number, received string",
      },
    ];
    const prompt = generateRetryPrompt(errors);
    expect(prompt).toContain("failed schema validation");
    expect(prompt).toContain("Path: /user/age");
    expect(prompt).toContain("Expected: number");
    expect(prompt).toContain("Received: string");
    expect(prompt).toContain("schema is still in your context");
    expect(prompt).toContain("return ONLY corrected valid JSON");
  });

  it("formats multiple errors", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["name"],
        message: "Expected string",
      },
      {
        code: "invalid_type",
        expected: "number",
        received: "string",
        path: ["age"],
        message: "Expected number",
      },
    ];
    const prompt = generateRetryPrompt(errors);
    expect(prompt).toContain("Path: /name");
    expect(prompt).toContain("Path: /age");
  });

  it("handles nested paths with number indices", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "string",
        received: "number",
        path: ["users", 0, "name"],
        message: "Expected string",
      },
    ];
    const prompt = generateRetryPrompt(errors);
    expect(prompt).toContain("Path: /users/0/name");
  });

  it("handles errors without expected/received (e.g. custom)", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "custom",
        path: ["email"],
        message: "Invalid email format",
      },
    ];
    const prompt = generateRetryPrompt(errors);
    expect(prompt).toContain("Path: /email");
    expect(prompt).toContain("Message: Invalid email format");
  });

  it("produces a reasonably token-efficient prompt", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "number",
        received: "string",
        path: ["a"],
        message: "Expected number",
      },
    ];
    const prompt = generateRetryPrompt(errors);
    // Should be concise — less than 250 characters for a single error
    expect(prompt.length).toBeLessThan(250);
  });

  it("handles root-level path", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "object",
        received: "string",
        path: [],
        message: "Expected object",
      },
    ];
    const prompt = generateRetryPrompt(errors);
    expect(prompt).toContain("Path: /");
  });

  it("supports line-aware parse context blocks", () => {
    const raw = `{
  "name": "alice"
  "age": 30
}`;

    const prompt = generateRetryPrompt([], raw, {
      options: { mode: "line-aware", contextRadius: 1 },
      parseErrorLine: 3,
    });

    expect(prompt).toContain("Relevant lines:");
    expect(prompt).toContain("|   \"age\": 30");
  });

  it("supports line-aware validation context blocks", () => {
    const errors: z.ZodIssue[] = [
      {
        code: "invalid_type",
        expected: "number",
        received: "string",
        path: ["user", "age"],
        message: "Expected number",
      },
    ];

    const prompt = generateRetryPrompt(errors, undefined, {
      options: { mode: "line-aware", contextRadius: 1 },
      sourceText: JSON.stringify({ user: { age: "30" } }, null, 2),
    });

    expect(prompt).toContain("Relevant lines:");
    expect(prompt).toContain('"age": "30"');
  });

  it("applies regex redaction to line-aware blocks", () => {
    const prompt = generateRetryPrompt([], '{"token":"Bearer secret-123"}', {
      options: {
        mode: "line-aware",
        redactRegex: [/Bearer\s+[A-Za-z0-9-]+/g],
      },
    });

    expect(prompt).toContain("[REDACTED]");
    expect(prompt).not.toContain("secret-123");
  });

  it("uses custom retry prompt strategy when provided", () => {
    const prompt = generateRetryPrompt([], "bad", {
      strategy: () => "CUSTOM-RETRY-PROMPT",
    });

    expect(prompt).toBe("CUSTOM-RETRY-PROMPT");
  });
});

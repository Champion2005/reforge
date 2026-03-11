import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateWithSchema } from "../../src/validation/index.js";

describe("validateWithSchema", () => {
  // -----------------------------------------------------------------------
  // Successful validation (no coercion)
  // -----------------------------------------------------------------------

  it("validates a matching object", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const r = validateWithSchema({ name: "Alice", age: 30 }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ name: "Alice", age: 30 });
    }
  });

  it("validates a simple array", () => {
    const schema = z.array(z.number());
    const r = validateWithSchema([1, 2, 3], schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual([1, 2, 3]);
    }
  });

  it("validates with optional fields", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().optional(),
    });
    const r = validateWithSchema({ name: "Alice" }, schema);
    expect(r.success).toBe(true);
  });

  it("validates with default values", () => {
    const schema = z.object({
      name: z.string(),
      role: z.string().default("user"),
    });
    const r = validateWithSchema({ name: "Alice" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({ name: "Alice", role: "user" });
    }
  });

  it("validates enums", () => {
    const schema = z.object({ status: z.enum(["active", "inactive"]) });
    const r = validateWithSchema({ status: "active" }, schema);
    expect(r.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Coercion: string → boolean
  // -----------------------------------------------------------------------

  it("coerces string 'true' to boolean true", () => {
    const schema = z.object({ active: z.boolean() });
    const r = validateWithSchema({ active: "true" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.active).toBe(true);
    }
  });

  it("coerces string 'false' to boolean false", () => {
    const schema = z.object({ active: z.boolean() });
    const r = validateWithSchema({ active: "false" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.active).toBe(false);
    }
  });

  // -----------------------------------------------------------------------
  // Coercion: string → number
  // -----------------------------------------------------------------------

  it("coerces string '42' to number 42", () => {
    const schema = z.object({ age: z.number() });
    const r = validateWithSchema({ age: "42" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.age).toBe(42);
    }
  });

  it("coerces string '3.14' to number 3.14", () => {
    const schema = z.object({ ratio: z.number() });
    const r = validateWithSchema({ ratio: "3.14" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ratio).toBe(3.14);
    }
  });

  it("does NOT coerce non-numeric string to number", () => {
    const schema = z.object({ age: z.number() });
    const r = validateWithSchema({ age: "not_a_number" }, schema);
    expect(r.success).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Coercion: string → null
  // -----------------------------------------------------------------------

  it("coerces string 'null' to null for z.null() schema", () => {
    const schema = z.object({ value: z.null() });
    const r = validateWithSchema({ value: "null" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.value).toBe(null);
    }
  });

  it("coerces string 'null' to null via ZodNullable wrapper", () => {
    // z.number().nullable() — string "null" should coerce to null
    const schema = z.object({ value: z.number().nullable() });
    const r = validateWithSchema({ value: "null" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.value).toBe(null);
    }
  });

  it("keeps string 'null' as string for z.string().nullable()", () => {
    // z.string().nullable() accepts both string and null —
    // "null" is a valid string, so coercion should NOT convert it.
    const schema = z.object({ value: z.string().nullable() });
    const r = validateWithSchema({ value: "null" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.value).toBe("null");
    }
  });

  // -----------------------------------------------------------------------
  // Nested coercion
  // -----------------------------------------------------------------------

  it("coerces nested object fields", () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        age: z.number(),
        active: z.boolean(),
      }),
    });
    const r = validateWithSchema(
      { user: { name: "Alice", age: "25", active: "true" } },
      schema,
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual({
        user: { name: "Alice", age: 25, active: true },
      });
    }
  });

  it("coerces array elements", () => {
    const schema = z.array(z.number());
    const r = validateWithSchema(["1", "2", "3"], schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toEqual([1, 2, 3]);
    }
  });

  it("coerces values inside optional wrapper", () => {
    const schema = z.object({ count: z.number().optional() });
    const r = validateWithSchema({ count: "5" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(5);
    }
  });

  it("coerces values inside default wrapper", () => {
    const schema = z.object({ count: z.number().default(0) });
    const r = validateWithSchema({ count: "10" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(10);
    }
  });

  it("coerces top-level primitive (non-object)", () => {
    const schema = z.number();
    const r = validateWithSchema("42", schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBe(42);
    }
  });

  it("handles null top-level input", () => {
    const schema = z.null();
    const r = validateWithSchema(null, schema);
    expect(r.success).toBe(true);
  });

  it("handles non-string primitive through coercion (number stays number)", () => {
    const schema = z.object({ count: z.number() });
    const r = validateWithSchema({ count: 42 }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.count).toBe(42);
    }
  });

  it("coerces top-level boolean string", () => {
    const schema = z.boolean();
    const r = validateWithSchema("true", schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBe(true);
    }
  });

  it("handles coercion for nullable number with string number", () => {
    const schema = z.object({ value: z.number().nullable() });
    const r = validateWithSchema({ value: "42" }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.value).toBe(42);
    }
  });

  it("handles deeply nested arrays of objects with coercion", () => {
    const schema = z.object({
      items: z.array(z.object({ active: z.boolean() })),
    });
    const r = validateWithSchema(
      { items: [{ active: "true" }, { active: "false" }] },
      schema,
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.items).toEqual([{ active: true }, { active: false }]);
    }
  });

  it("handles empty string not coerced to number", () => {
    const schema = z.object({ age: z.number() });
    const r = validateWithSchema({ age: "" }, schema);
    expect(r.success).toBe(false);
  });

  it("handles whitespace-only string not coerced to number", () => {
    const schema = z.object({ age: z.number() });
    const r = validateWithSchema({ age: "  " }, schema);
    expect(r.success).toBe(false);
  });

  it("coerces values inside nullable object wrapper", () => {
    // Triggers enqueueChildren with ZodNullable wrapping a ZodObject
    const schema = z.object({
      user: z.object({ age: z.number() }).nullable(),
    });
    const r = validateWithSchema({ user: { age: "30" } }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.user!.age).toBe(30);
    }
  });

  it("coerces values inside optional object wrapper", () => {
    // Triggers enqueueChildren with ZodOptional wrapping a ZodObject
    const schema = z.object({
      user: z.object({ active: z.boolean() }).optional(),
    });
    const r = validateWithSchema({ user: { active: "true" } }, schema);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.user!.active).toBe(true);
    }
  });

  // -----------------------------------------------------------------------
  // Validation failures
  // -----------------------------------------------------------------------

  it("fails with missing required field", () => {
    const schema = z.object({ name: z.string(), age: z.number() });
    const r = validateWithSchema({ name: "Alice" }, schema);
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors[0]!.path).toContain("age");
    }
  });

  it("fails with wrong type that cannot be coerced", () => {
    const schema = z.object({ name: z.string() });
    const r = validateWithSchema({ name: 123 }, schema);
    expect(r.success).toBe(false);
  });

  it("fails with invalid enum value", () => {
    const schema = z.object({ status: z.enum(["active", "inactive"]) });
    const r = validateWithSchema({ status: "unknown" }, schema);
    expect(r.success).toBe(false);
  });

  it("returns multiple errors for multiple issues", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email(),
    });
    const r = validateWithSchema(
      { name: 123, age: "not_num", email: "bad" },
      schema,
    );
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

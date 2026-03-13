import type { ZodIssue, ZodTypeAny } from "zod";

/**
 * Validate parsed data against a Zod schema with LLM-friendly coercion.
 *
 * Before running `schema.safeParse()`, this module applies a lightweight
 * coercion pre-pass that handles the most common LLM type mismatches:
 *
 * | Input | Schema expects | Coerced to |
 * |---|---|---|
 * | `"true"` / `"false"` | `boolean` | `true` / `false` |
 * | `"42"`, `"3.14"` | `number` | `42`, `3.14` |
 * | `"null"` | `null` / `nullable` | `null` |
 * | `"2025-03-13T00:00:00Z"` | `date` | `Date` |
 * | `"Active"` | `enum("active")` | `"active"` |
 *
 * Coercion is applied iteratively using a work queue (not recursion) to
 * comply with the project's security guidelines around stack safety.
 *
 * @module
 */

/** Successful validation result. */
export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/** Failed validation result. */
export interface ValidationFailure {
  success: false;
  errors: ZodIssue[];
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Validate `data` against a Zod `schema`, applying coercion for common
 * LLM type mismatches before validation.
 *
 * @typeParam T - The Zod schema type.
 * @param data   - The parsed (but untyped) JavaScript value.
 * @param schema - The Zod schema to validate against.
 * @returns A discriminated-union result with either typed data or Zod errors.
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * validateWithSchema({ age: "25", active: "true" }, z.object({ age: z.number(), active: z.boolean() }));
 * // => { success: true, data: { age: 25, active: true } }
 * ```
 */
export function validateWithSchema<T extends ZodTypeAny>(
  data: unknown,
  schema: T,
): ValidationResult<ReturnType<T["parse"]>> {
  // First attempt without coercion (fast path).
  const direct = schema.safeParse(data);
  if (direct.success) {
    return { success: true, data: direct.data };
  }

  // Apply coercion and try again.
  const coerced = coerceForSchema(data, schema);
  const result = schema.safeParse(coerced);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.issues };
}

// ---------------------------------------------------------------------------
// Coercion Engine — iterative, schema-aware
// ---------------------------------------------------------------------------

/**
 * Attempt to coerce `data` to better match `schema` expectations.
 *
 * Uses a work queue to iteratively walk the data/schema tree without
 * recursion. Only coerces when the schema explicitly expects a different
 * primitive type than what the data contains.
 */
function coerceForSchema(data: unknown, schema: ZodTypeAny): unknown {
  // For primitives at the top level, try direct coercion.
  if (typeof data !== "object" || data === null) {
    return coercePrimitive(data, schema);
  }

  // For objects/arrays, clone & iteratively coerce leaves.
  const root = cloneContainer(data);

  // Work queue: [parentRef, key, subSchema]
  type WorkItem = {
    parent: Record<string, unknown> | unknown[];
    key: string | number;
    subSchema: ZodTypeAny;
  };

  const queue: WorkItem[] = [];
  enqueueChildren(root, schema, queue);

  // Process up to a sane limit to prevent DoS on adversarial inputs.
  const MAX_ITERATIONS = 50_000;
  let iterations = 0;

  for (let queueIndex = 0; queueIndex < queue.length && iterations < MAX_ITERATIONS; queueIndex++) {
    iterations++;
    const item = queue[queueIndex]!;
    const value = (item.parent as Record<string | number, unknown>)[item.key];

    if (typeof value === "object" && value !== null) {
      // Clone nested objects/arrays so we don't mutate the original.
      const cloned = cloneContainer(value);
      (item.parent as Record<string | number, unknown>)[item.key] = cloned;
      enqueueChildren(cloned, item.subSchema, queue);
    } else {
      // Leaf — try primitive coercion.
      const coerced = coercePrimitive(value, item.subSchema);
      if (coerced !== value) {
        (item.parent as Record<string | number, unknown>)[item.key] = coerced;
      }
    }
  }

  return root;
}

function cloneContainer(value: unknown): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (isPlainObject(value)) {
    const source = value as Record<string, unknown>;
    const target = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(source)) {
      target[key] = source[key];
    }
    return target;
  }

  return Object.create(null) as Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Coerce a single primitive value based on what the schema expects.
 * Unwraps ZodOptional, ZodNullable, and ZodDefault wrappers to
 * find the inner type for coercion.
 */
function coercePrimitive(value: unknown, schema: ZodTypeAny): unknown {
  if (typeof value !== "string") return value;

  const typeName = getSchemaTypeName(schema);
  const def = (schema as { _def?: Record<string, unknown> })._def;

  // Unwrap wrapper types to get at the actual target type.
  if (typeName === "ZodOptional" || typeName === "ZodNullable" || typeName === "ZodDefault") {
    const inner = getInnerSchema(def);

    // For nullable, also check "null" string before unwrapping.
    if (typeName === "ZodNullable" && value === "null") {
      // Preserve literal "null" for nullable strings.
      if (inner && getSchemaTypeName(inner) === "ZodString") return value;
      return null;
    }

    if (inner) return coercePrimitive(value, inner);
    return value;
  }

  if (typeName === "ZodBoolean") {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  if (typeName === "ZodNumber") {
    const n = Number(value);
    if (value.trim() !== "" && !Number.isNaN(n)) return n;
  }

  if (typeName === "ZodNull") {
    if (value === "null") return null;
  }

  if (typeName === "ZodDate") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }

  if (typeName === "ZodLiteral" && def) {
    const literal = (def as { value?: unknown }).value;

    if (typeof literal === "number") {
      const n = Number(value);
      if (value.trim() !== "" && !Number.isNaN(n) && n === literal) {
        return literal;
      }
    }

    if (typeof literal === "boolean") {
      if ((value === "true" && literal === true) || (value === "false" && literal === false)) {
        return literal;
      }
    }

    if (typeof literal === "string") {
      if (value === literal) return literal;
      if (value.toLowerCase() === literal.toLowerCase()) return literal;
    }
  }

  if (typeName === "ZodEnum" && def) {
    const values = (def as { values?: unknown[] }).values;
    if (Array.isArray(values)) {
      const exact = values.find((v) => typeof v === "string" && v === value);
      if (exact !== undefined) return exact;

      const lower = value.toLowerCase();
      const ci = values.find(
        (v) => typeof v === "string" && (v as string).toLowerCase() === lower,
      );
      if (ci !== undefined) return ci;
    }
  }

  if (typeName === "ZodUnion" && def) {
    const options = getUnionOptions(def);
    for (const option of options) {
      const coerced = coercePrimitive(value, option);
      const parsed = option.safeParse(coerced);
      if (parsed.success) {
        return parsed.data;
      }
    }
  }

  return value;
}

/**
 * Enqueue child fields/elements depending on the schema kind.
 */
function enqueueChildren(
  parent: Record<string, unknown> | unknown[],
  schema: ZodTypeAny,
  queue: { parent: Record<string, unknown> | unknown[]; key: string | number; subSchema: ZodTypeAny }[],
): void {
  const typeName = getSchemaTypeName(schema);
  const def = (schema as { _def?: Record<string, unknown> })._def;

  if (typeName === "ZodObject" && def) {
    const shape = typeof (schema as unknown as { shape?: unknown }).shape === "object"
      ? (schema as unknown as { shape: Record<string, ZodTypeAny> }).shape
      : null;
    if (shape) {
      for (const key of Object.keys(shape)) {
        if (key in (parent as Record<string, unknown>)) {
          queue.push({ parent, key, subSchema: shape[key]! });
        }
      }
    }
  } else if (typeName === "ZodArray" && def && Array.isArray(parent)) {
    const elementSchema = (def as { type?: ZodTypeAny }).type;
    if (elementSchema) {
      for (let i = 0; i < parent.length; i++) {
        queue.push({ parent, key: i, subSchema: elementSchema });
      }
    }
  } else if (typeName === "ZodTuple" && def && Array.isArray(parent)) {
    const items = (def as { items?: ZodTypeAny[] }).items;
    if (Array.isArray(items)) {
      const count = Math.min(parent.length, items.length);
      for (let i = 0; i < count; i++) {
        queue.push({ parent, key: i, subSchema: items[i]! });
      }
    }
  } else if (typeName === "ZodUnion" && def) {
    const options = getUnionOptions(def);
    for (const option of options) {
      if (option.safeParse(parent).success) {
        enqueueChildren(parent, option, queue);
        return;
      }
    }
    if (options.length > 0) {
      enqueueChildren(parent, options[0]!, queue);
    }
  } else if (typeName === "ZodDiscriminatedUnion" && def && isPlainObject(parent)) {
    const discriminator = (def as { discriminator?: unknown }).discriminator;
    const optionsMap = (def as { optionsMap?: Map<unknown, ZodTypeAny> }).optionsMap;

    if (typeof discriminator === "string" && optionsMap instanceof Map) {
      const rawDiscriminatorValue = parent[discriminator];
      const discriminatorValue = coerceDiscriminatorToMapKey(rawDiscriminatorValue, optionsMap);
      if (optionsMap.has(discriminatorValue)) {
        const option = optionsMap.get(discriminatorValue);
        if (option) enqueueChildren(parent, option, queue);
      }
    }
  } else if (typeName === "ZodOptional" || typeName === "ZodNullable" || typeName === "ZodDefault") {
    // Unwrap wrapper types and re-process.
    const inner = getInnerSchema(def);
    if (inner) {
      enqueueChildren(parent, inner, queue);
    }
  }
}

// ---------------------------------------------------------------------------
// Schema introspection helpers
// ---------------------------------------------------------------------------

function getSchemaTypeName(schema: ZodTypeAny): string {
  const def = (schema as { _def?: { typeName?: string } })._def;
  return def?.typeName ?? "";
}

function getInnerSchema(def: Record<string, unknown> | undefined): ZodTypeAny | null {
  if (!def) return null;
  // ZodOptional, ZodNullable store inner schema as `innerType`.
  // ZodDefault stores it as `innerType` as well.
  const inner = def.innerType as ZodTypeAny | undefined;
  return inner ?? null;
}

function getUnionOptions(def: Record<string, unknown>): ZodTypeAny[] {
  const options = def.options as unknown;
  if (Array.isArray(options)) {
    return options.filter((v): v is ZodTypeAny => typeof v === "object" && v !== null);
  }
  return [];
}

function coerceDiscriminatorToMapKey(value: unknown, optionsMap: Map<unknown, ZodTypeAny>): unknown {
  if (optionsMap.has(value)) return value;
  if (typeof value !== "string") return value;

  for (const key of optionsMap.keys()) {
    if (typeof key === "number") {
      const n = Number(value);
      if (value.trim() !== "" && !Number.isNaN(n) && n === key) {
        return key;
      }
    }
    if (typeof key === "boolean") {
      if ((value === "true" && key === true) || (value === "false" && key === false)) {
        return key;
      }
    }
    if (typeof key === "string" && key.toLowerCase() === value.toLowerCase()) {
      return key;
    }
  }

  return value;
}

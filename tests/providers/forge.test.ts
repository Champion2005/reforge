import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { forge } from "../../src/providers/forge.js";
import type { ReforgeProvider, Message } from "../../src/providers/types.js";

/**
 * Helper: create a mock provider that returns predefined responses
 * in sequence.
 */
function mockProvider(responses: string[]): ReforgeProvider {
  let callIndex = 0;
  return {
    call: vi.fn(async () => {
      const response = responses[callIndex];
      if (response === undefined) {
        throw new Error(`Mock provider exhausted after ${callIndex} calls`);
      }
      callIndex++;
      return response;
    }),
  };
}

const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

describe("forge()", () => {
  // -----------------------------------------------------------------------
  // Success on first attempt
  // -----------------------------------------------------------------------

  it("returns success on first attempt with clean JSON", async () => {
    const provider = mockProvider(['{"name": "Alice", "age": 30}']);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
      expect(result.isRepaired).toBe(false);
      expect(result.telemetry.attempts).toBe(1);
      expect(result.telemetry.status).toBe("clean");
      expect(result.telemetry.totalDurationMs).toBeGreaterThanOrEqual(0);
    }
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it("returns success on first attempt with repaired JSON", async () => {
    const provider = mockProvider(['```json\n{"name": "Alice", "age": 30,}\n```']);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Alice", age: 30 });
      expect(result.isRepaired).toBe(true);
      expect(result.telemetry.attempts).toBe(1);
      expect(result.telemetry.status).toBe("repaired_natively");
    }
  });

  // -----------------------------------------------------------------------
  // Success on retry
  // -----------------------------------------------------------------------

  it("succeeds on second attempt after first failure", async () => {
    const provider = mockProvider([
      "This is not JSON at all",
      '{"name": "Bob", "age": 25}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Bob", age: 25 });
      expect(result.telemetry.attempts).toBe(2);
    }
    expect(provider.call).toHaveBeenCalledTimes(2);
  });

  it("succeeds on third attempt", async () => {
    const provider = mockProvider([
      "not json",
      "still not json",
      '{"name": "Carol", "age": 40}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Carol", age: 40 });
      expect(result.telemetry.attempts).toBe(3);
    }
  });

  // -----------------------------------------------------------------------
  // All retries exhausted
  // -----------------------------------------------------------------------

  it("returns failure when all retries exhausted", async () => {
    const provider = mockProvider([
      "not json",
      "still not json",
      "nope",
      "last try fails too",
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.telemetry.attempts).toBe(4); // 1 initial + 3 retries
      expect(result.telemetry.status).toBe("failed");
      expect(result.telemetry.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.retryPrompt).toContain("return ONLY");
      expect(result.telemetry.attemptDetails).toHaveLength(4);
    }
  });

  it("returns validation errors when JSON is valid but schema fails", async () => {
    const provider = mockProvider([
      '{"name": "Alice"}',
      '{"name": "Alice"}',
      '{"name": "Alice"}',
      '{"name": "Alice"}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  // -----------------------------------------------------------------------
  // Custom maxRetries
  // -----------------------------------------------------------------------

  it("respects custom maxRetries option", async () => {
    const provider = mockProvider([
      "fail 1",
      "fail 2",
      '{"name": "Dave", "age": 50}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema, {
      maxRetries: 2,
    });

    expect(result.success).toBe(true);
    expect(provider.call).toHaveBeenCalledTimes(3);
  });

  it("uses maxRetries: 0 for single attempt only", async () => {
    const provider = mockProvider(["not json"]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema, {
      maxRetries: 0,
    });

    expect(result.success).toBe(false);
    expect(provider.call).toHaveBeenCalledTimes(1);
    if (!result.success) {
      expect(result.telemetry.attempts).toBe(1);
    }
  });

  it("clamps negative maxRetries to zero", async () => {
    const provider = mockProvider(["not json"]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema, {
      maxRetries: -5,
    });

    expect(result.success).toBe(false);
    expect(provider.call).toHaveBeenCalledTimes(1);
    if (!result.success) {
      expect(result.telemetry.attempts).toBe(1);
    }
  });

  it("truncates large assistant retry content before appending to conversation", async () => {
    const hugeInvalid = `not-json-${"x".repeat(4500)}`;
    const provider = mockProvider([
      hugeInvalid,
      '{"name": "Eve", "age": 28}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(true);
    expect(provider.call).toHaveBeenCalledTimes(2);

    const secondCallMessages = (provider.call as ReturnType<typeof vi.fn>).mock.calls[1][0] as Message[];
    const assistantRetry = secondCallMessages.find((m) => m.role === "assistant");

    expect(assistantRetry).toBeDefined();
    expect(assistantRetry?.content.length).toBeLessThan(hugeInvalid.length);
    expect(assistantRetry?.content).toContain("...[truncated ");
    expect(assistantRetry?.content.length).toBeLessThanOrEqual(2040);
  });

  // -----------------------------------------------------------------------
  // Provider errors bubble up
  // -----------------------------------------------------------------------

  it("lets provider errors bubble up (not caught)", async () => {
    const provider: ReforgeProvider = {
      call: vi.fn(async () => {
        throw new Error("Network timeout");
      }),
    };
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    await expect(forge(provider, messages, UserSchema)).rejects.toThrow(
      "Network timeout",
    );
  });

  // -----------------------------------------------------------------------
  // Messages array is not mutated
  // -----------------------------------------------------------------------

  it("does not mutate the original messages array", async () => {
    const provider = mockProvider([
      "not json",
      '{"name": "Eve", "age": 28}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];
    const originalLength = messages.length;

    await forge(provider, messages, UserSchema);

    expect(messages.length).toBe(originalLength);
    expect(messages[0]).toEqual({ role: "user", content: "Return a user." });
  });

  // -----------------------------------------------------------------------
  // Telemetry
  // -----------------------------------------------------------------------

  it("tracks totalDurationMs across all attempts", async () => {
    const provider = mockProvider([
      "fail",
      '{"name": "Frank", "age": 35}',
    ]);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    const result = await forge(provider, messages, UserSchema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.telemetry.totalDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.telemetry.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.telemetry.attemptDetails).toHaveLength(2);
      expect(result.telemetry.attemptDetails[0]?.attempt).toBe(1);
      expect(result.telemetry.attemptDetails[1]?.attempt).toBe(2);
    }
  });

  it("invokes onRetry callback for each retriable failure", async () => {
    const provider = mockProvider([
      "not json",
      "still not json",
      '{"name": "Nina", "age": 29}',
    ]);

    const onRetry = vi.fn();
    const messages: Message[] = [{ role: "user", content: "Return a user." }];

    const result = await forge(provider, messages, UserSchema, { onRetry });

    expect(result.success).toBe(true);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(
      1,
      1,
      expect.objectContaining({ retryPrompt: expect.stringContaining("return ONLY") }),
    );
    expect(onRetry).toHaveBeenNthCalledWith(
      2,
      2,
      expect.objectContaining({ retryPrompt: expect.stringContaining("return ONLY") }),
    );
  });

  // -----------------------------------------------------------------------
  // providerOptions passthrough
  // -----------------------------------------------------------------------

  it("passes providerOptions through to provider.call()", async () => {
    const provider = mockProvider(['{"name": "Grace", "age": 45}']);
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];
    const providerOptions = { temperature: 0.5, maxTokens: 1000, custom: "value" };

    await forge(provider, messages, UserSchema, { providerOptions });

    expect(provider.call).toHaveBeenCalledWith(
      expect.any(Array),
      providerOptions,
    );
  });
});

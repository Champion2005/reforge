import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { forge, ForgeNetworkError } from "../../src/providers/forge.js";
import { forgeWithFallback } from "../../src/providers/fallback.js";
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

  it("fails with parse-style retry prompt when provider returns empty string", async () => {
    const provider = mockProvider([""]);
    const messages: Message[] = [{ role: "user", content: "Return a user." }];

    const result = await forge(provider, messages, UserSchema, { maxRetries: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryPrompt).toContain("valid JSON");
      expect(result.errors.length).toBe(1);
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

  it("handles NaN maxRetries defensively", async () => {
    const provider = mockProvider(["not json"]);
    const messages: Message[] = [{ role: "user", content: "Return a user." }];

    const result = await forge(provider, messages, UserSchema, {
      maxRetries: Number.NaN,
    });

    expect(result.success).toBe(false);
    expect(provider.call).toHaveBeenCalledTimes(1);
    if (!result.success) {
      expect(result.telemetry.attempts).toBe(1);
      expect(result.telemetry.attemptDetails).toHaveLength(1);
      expect(result.retryPrompt).toContain("return ONLY valid JSON");
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

  it("wraps intrinsic network failures as ForgeNetworkError", async () => {
    const provider: ReforgeProvider = {
      call: vi.fn(async () => {
        throw new Error("Network timeout");
      }),
    };
    const messages: Message[] = [
      { role: "user", content: "Return a user." },
    ];

    await expect(forge(provider, messages, UserSchema)).rejects.toBeInstanceOf(
      ForgeNetworkError,
    );
  });

  it("falls back to next provider on intrinsic network failure", async () => {
    const primary: ReforgeProvider = {
      id: "primary",
      call: vi.fn(async () => {
        throw new Error("429 rate limit");
      }),
    };
    const secondary = mockProvider(['{"name": "Fallback", "age": 22}']);

    const result = await forge(
      [primary, secondary],
      [{ role: "user", content: "Return a user." }],
      UserSchema,
      { maxRetries: 0 },
    );

    expect(result.success).toBe(true);
    expect(primary.call).toHaveBeenCalledTimes(1);
    expect(secondary.call).toHaveBeenCalledTimes(1);
  });

  it("throws ForgeNetworkError when network failure occurs without fallback", async () => {
    const provider: ReforgeProvider = {
      id: "solo",
      call: vi.fn(async () => {
        throw new Error("500 internal server error");
      }),
    };

    await expect(
      forge(provider, [{ role: "user", content: "Return a user." }], UserSchema, { maxRetries: 0 }),
    ).rejects.toBeInstanceOf(ForgeNetworkError);
  });

  it("executes local tools and continues the loop until final assistant JSON", async () => {
    const provider: ReforgeProvider = {
      call: vi
        .fn()
        .mockResolvedValueOnce('{"tool_calls":[{"id":"t1","name":"getWeather","arguments":{"city":"Paris"}}]}')
        .mockResolvedValueOnce('{"name":"Tool User","age":41}'),
    };

    const result = await forge(
      provider,
      [{ role: "user", content: "Get weather then return user." }],
      UserSchema,
      {
        tools: {
          getWeather: {
            schema: z.object({ city: z.string() }),
            execute: async ({ city }) => ({ city, tempC: 19 }),
          },
        },
        maxRetries: 0,
      },
    );

    expect(result.success).toBe(true);
    expect(provider.call).toHaveBeenCalledTimes(2);
    if (result.success) {
      expect(result.telemetry.toolExecutionDurationMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("emits onChunk only for final non-tool responses", async () => {
    const provider: ReforgeProvider = {
      call: vi
        .fn()
        .mockResolvedValueOnce('{"tool_calls":[{"id":"t1","name":"noop","arguments":{}}]}')
        .mockResolvedValueOnce('{"name":"Chunked","age":30}'),
    };

    const onChunk = vi.fn();
    const result = await forge(
      provider,
      [{ role: "user", content: "Run tool then output user." }],
      UserSchema,
      {
        maxRetries: 0,
        onChunk,
        tools: {
          noop: {
            schema: z.object({}),
            execute: () => ({ ok: true }),
          },
        },
      },
    );

    expect(result.success).toBe(true);
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith('{"name":"Chunked","age":30}');
  });

  it("falls back when provider fails during tool loop", async () => {
    const primary: ReforgeProvider = {
      id: "primary",
      call: vi
        .fn()
        .mockResolvedValueOnce('{"tool_calls":[{"id":"t1","name":"noop","arguments":{}}]}')
        .mockRejectedValueOnce(new Error("503 service unavailable")),
    };
    const secondary = mockProvider(['{"name":"Recovered","age":26}']);

    const result = await forge(
      [primary, secondary],
      [{ role: "user", content: "Do tool call" }],
      UserSchema,
      {
        maxRetries: 0,
        tools: {
          noop: {
            schema: z.object({}),
            execute: () => ({ ok: true }),
          },
        },
      },
    );

    expect(result.success).toBe(true);
    expect(primary.call).toHaveBeenCalledTimes(2);
    expect(secondary.call).toHaveBeenCalledTimes(1);
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

  it("tracks expanded telemetry fields for provider hops and network/tool timings", async () => {
    const provider = mockProvider([
      "not json",
      '{"name": "Helena", "age": 27}',
    ]);

    const result = await forge(
      provider,
      [{ role: "user", content: "Return a user." }],
      UserSchema,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.telemetry.networkDurationMs).toBeGreaterThanOrEqual(0);
      expect(result.telemetry.toolExecutionDurationMs).toBe(0);
      expect(result.telemetry.providerHops).toHaveLength(2);
      expect(result.telemetry.providerHops[0]?.succeeded).toBe(false);
      expect(result.telemetry.providerHops[1]?.succeeded).toBe(true);
      expect(result.telemetry.providerHops[0]?.providerId).toBe("provider-0");
      expect(result.telemetry.providerHops[1]?.providerId).toBe("provider-0");
      expect(result.telemetry.providerHops[0]?.attempt).toBe(1);
      expect(result.telemetry.providerHops[1]?.attempt).toBe(2);
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

  it("supports retryPolicy.shouldRetry to stop early", async () => {
    const provider = mockProvider([
      "not json",
      '{"name": "should not happen", "age": 1}',
    ]);

    const result = await forge(provider, [{ role: "user", content: "Return a user." }], UserSchema, {
      maxRetries: 3,
      retryPolicy: {
        shouldRetry: () => false,
      },
    });

    expect(result.success).toBe(false);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it("supports retryPolicy.mutateProviderOptions per attempt", async () => {
    const provider = mockProvider([
      "not json",
      '{"name": "Nora", "age": 33}',
    ]);

    const result = await forge(provider, [{ role: "user", content: "Return a user." }], UserSchema, {
      providerOptions: { temperature: 0.9 },
      retryPolicy: {
        mutateProviderOptions: (attempt, base) => ({
          ...base,
          temperature: attempt === 1 ? 0.9 : 0.2,
        }),
      },
    });

    expect(result.success).toBe(true);
    const calls = (provider.call as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]?.[1]).toEqual({ temperature: 0.9 });
    expect(calls[1]?.[1]).toEqual({ temperature: 0.2 });
  });

  it("emits structured events through onEvent", async () => {
    const provider = mockProvider([
      "not json",
      '{"name": "Quinn", "age": 31}',
    ]);

    const onEvent = vi.fn();
    const result = await forge(provider, [{ role: "user", content: "Return a user." }], UserSchema, {
      onEvent,
    });

    expect(result.success).toBe(true);
    const kinds = onEvent.mock.calls.map((c) => c[0]?.kind);
    expect(kinds).toContain("attempt_start");
    expect(kinds).toContain("provider_response");
    expect(kinds).toContain("guard_failure");
    expect(kinds).toContain("retry_scheduled");
    expect(kinds).toContain("guard_success");
    expect(kinds[kinds.length - 1]).toBe("finished");
  });

  it("forwards guardOptions to guard() for line-aware retry prompts", async () => {
    const provider = mockProvider([
      '{"name": "Ava"}',
    ]);

    const result = await forge(provider, [{ role: "user", content: "Return a user." }], UserSchema, {
      maxRetries: 0,
      guardOptions: {
        retryPrompt: { mode: "line-aware" },
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryPrompt).toContain("Relevant lines:");
    }
  });

  it("forgeWithFallback succeeds with secondary provider", async () => {
    const primary = mockProvider(["not json"]);
    const secondary = mockProvider(['{"name":"Iris","age":44}']);

    const result = await forgeWithFallback(
      [
        { provider: primary, maxAttempts: 1 },
        { provider: secondary, maxAttempts: 1 },
      ],
      [{ role: "user", content: "Return a user." }],
      UserSchema,
    );

    expect(result.success).toBe(true);
    expect(primary.call).toHaveBeenCalledTimes(1);
    expect(secondary.call).toHaveBeenCalledTimes(1);
  });

  it("forgeWithFallback emits provider fallback callback", async () => {
    const primary = mockProvider(["not json"]);
    const secondary = mockProvider(["still bad"]);
    const onProviderFallback = vi.fn();

    const result = await forgeWithFallback(
      [
        { provider: primary, maxAttempts: 1 },
        { provider: secondary, maxAttempts: 1 },
      ],
      [{ role: "user", content: "Return a user." }],
      UserSchema,
      { onProviderFallback },
    );

    expect(result.success).toBe(false);
    expect(onProviderFallback).toHaveBeenCalledWith(0, 1);
  });
});

import { describe, it, expect, vi } from "vitest";
import { anthropic } from "../../src/providers/anthropic.js";
import type { Message } from "../../src/providers/types.js";

/**
 * Helper: create a mock Anthropic client.
 */
function mockAnthropicClient(text: string | null = '{"result": true}') {
  return {
    messages: {
      create: vi.fn(async (_params: Record<string, unknown>) => ({
        content: text !== null ? [{ type: "text", text }] : [{ type: "image" }],
      })),
    },
  };
}

describe("anthropic()", () => {
  it("extracts system message and passes it separately", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    const messages: Message[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ];

    await provider.call(messages);

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        system: [{ type: "text", text: "You are helpful." }],
        messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
        max_tokens: 4096,
      }),
    );
  });

  it("works without system message", async () => {
    const client = mockAnthropicClient('{"data": 1}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    const messages: Message[] = [
      { role: "user", content: "Hello" },
    ];

    await provider.call(messages);

    const callArgs = (client.messages.create.mock.calls.at(0)?.[0] ?? {}) as Record<string, unknown>;
    expect(callArgs).toBeDefined();
    expect(callArgs.system).toBeUndefined();
    expect(callArgs.messages).toEqual([{ role: "user", content: [{ type: "text", text: "Hello" }] }]);
  });

  it("returns the text content", async () => {
    const client = mockAnthropicClient('{"name": "Alice"}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    const result = await provider.call([
      { role: "user", content: "Hello" },
    ]);

    expect(result).toBe('{"name": "Alice"}');
  });

  it("throws when no text block in response", async () => {
    const client = mockAnthropicClient(null);
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    await expect(
      provider.call([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("Anthropic returned no text content");
  });

  it("defaults max_tokens to 4096", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    await provider.call([{ role: "user", content: "Hello" }]);

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 4096 }),
    );
  });

  it("uses custom max_tokens when provided", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    await provider.call([{ role: "user", content: "Hello" }], {
      max_tokens: 8192,
    });

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 8192 }),
    );
  });

  it("passes temperature when provided", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    await provider.call([{ role: "user", content: "Hello" }], {
      temperature: 0.3,
    });

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0.3 }),
    );
  });

  it("passes through extra options", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    await provider.call([{ role: "user", content: "Hello" }], {
      top_p: 0.9,
    });

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({ top_p: 0.9 }),
    );
  });

  it("handles multiple messages with assistant turns", async () => {
    const client = mockAnthropicClient('{"retry": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    const messages: Message[] = [
      { role: "system", content: "Be helpful." },
      { role: "user", content: "First try" },
      { role: "assistant", content: "Bad response" },
      { role: "user", content: "Try again" },
    ];

    await provider.call(messages);

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [{ type: "text", text: "Be helpful." }],
        messages: [
          { role: "user", content: [{ type: "text", text: "First try" }] },
          { role: "assistant", content: [{ type: "text", text: "Bad response" }] },
          { role: "user", content: [{ type: "text", text: "Try again" }] },
        ],
      }),
    );
  });

  it("concatenates multiple system messages with double newlines", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    const messages: Message[] = [
      { role: "system", content: "Rule 1" },
      { role: "user", content: "Hello" },
      { role: "system", content: "Rule 2" },
    ];

    await provider.call(messages);

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [
          { type: "text", text: "Rule 1" },
          { type: "text", text: "Rule 2" },
        ],
        messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
      }),
    );
  });

  it("normalizes multimodal blocks into text for Anthropic messages", async () => {
    const client = mockAnthropicClient('{"ok": true}');
    const provider = anthropic(client, "claude-sonnet-4-20250514");

    await provider.call([
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze the attached input" },
          { type: "image_url", image_url: { url: "https://example.com/img.jpg" } },
        ],
      },
    ]);

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze the attached input" },
              { type: "text", text: "[image_url:https://example.com/img.jpg]" },
            ],
          },
        ],
      }),
    );
  });
});

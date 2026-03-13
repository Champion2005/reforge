import { describe, it, expect, vi } from "vitest";
import { openaiCompatible } from "../../src/providers/openai-compatible.js";
import type { Message } from "../../src/providers/types.js";

/**
 * Helper: create a mock OpenAI-compatible client.
 */
function mockOpenAIClient(content: unknown = '{"result": true}') {
  return {
    chat: {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: { content },
            },
          ],
        })),
      },
    },
  };
}

describe("openaiCompatible()", () => {
  const messages: Message[] = [
    { role: "system", content: "Return JSON." },
    { role: "user", content: "Hello" },
  ];

  it("calls client.chat.completions.create with correct params", async () => {
    const client = mockOpenAIClient('{"ok": true}');
    const provider = openaiCompatible(client, "gpt-4o");

    await provider.call(messages, { temperature: 0.7, maxTokens: 500 });

    expect(client.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Return JSON." },
        { role: "user", content: "Hello" },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });
  });

  it("returns the response content string", async () => {
    const client = mockOpenAIClient('{"name": "Alice"}');
    const provider = openaiCompatible(client, "gpt-4o");

    const result = await provider.call(messages);

    expect(result).toBe('{"name": "Alice"}');
  });

  it("returns text from array-based content parts", async () => {
    const client = mockOpenAIClient([
      { type: "text", text: '{"name": "Array"}' },
    ]);
    const provider = openaiCompatible(client, "gpt-4o");

    const result = await provider.call(messages);

    expect(result).toBe('{"name": "Array"}');
  });

  it("returns text from top-level choice.text fallback", async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({
            choices: [
              {
                message: { content: null },
                text: '{"source": "choice.text"}',
              },
            ],
          })),
        },
      },
    };
    const provider = openaiCompatible(client, "gpt-4o");

    const result = await provider.call(messages);

    expect(result).toBe('{"source": "choice.text"}');
  });

  it("throws on empty response", async () => {
    const client = mockOpenAIClient(null);
    const provider = openaiCompatible(client, "gpt-4o");

    await expect(provider.call(messages)).rejects.toThrow(/empty response/i);
  });

  it("throws on empty string response", async () => {
    const client = mockOpenAIClient("");
    const provider = openaiCompatible(client, "gpt-4o");

    await expect(provider.call(messages)).rejects.toThrow(/empty response/i);
  });

  it("throws when choices array is empty", async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({ choices: [] })),
        },
      },
    };
    const provider = openaiCompatible(client, "gpt-4o");

    await expect(provider.call(messages)).rejects.toThrow(/empty response/i);
  });

  it("throws when choices field is missing", async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn(async () => ({})),
        },
      },
    };
    const provider = openaiCompatible(client, "gpt-4o");

    await expect(provider.call(messages)).rejects.toThrow(/empty response/i);
  });

  it("passes through extra options", async () => {
    const client = mockOpenAIClient('{"ok": true}');
    const provider = openaiCompatible(client, "gpt-4o");

    await provider.call(messages, {
      temperature: 0.5,
      maxTokens: 200,
      response_format: { type: "json_object" },
    });

    expect(client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4o",
        temperature: 0.5,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    );
  });

  it("works without options", async () => {
    const client = mockOpenAIClient('{"data": 1}');
    const provider = openaiCompatible(client, "gpt-4o-mini");

    const result = await provider.call(messages);

    expect(result).toBe('{"data": 1}');
    expect(client.chat.completions.create).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: expect.any(Array),
    });
  });

  it("omits max_tokens when only temperature is provided", async () => {
    const client = mockOpenAIClient('{"ok": true}');
    const provider = openaiCompatible(client, "gpt-4o");

    await provider.call(messages, { temperature: 0.2 });

    const params = client.chat.completions.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params).toBeDefined();
    expect(params.temperature).toBe(0.2);
    expect(params.max_tokens).toBeUndefined();
  });

  it("omits temperature when only maxTokens is provided", async () => {
    const client = mockOpenAIClient('{"ok": true}');
    const provider = openaiCompatible(client, "gpt-4o");

    await provider.call(messages, { maxTokens: 123 });

    const params = client.chat.completions.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(params).toBeDefined();
    expect(params.max_tokens).toBe(123);
    expect(params.temperature).toBeUndefined();
  });
});

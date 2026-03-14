import { describe, it, expect, vi } from "vitest";
import { google } from "../../src/providers/google.js";
import type { Message } from "../../src/providers/types.js";

/**
 * Helper: create a mock Google Generative AI client.
 */
function mockGoogleClient(text: string = '{"result": true}') {
  const sendMessage = vi.fn(async () => ({
    response: { text: () => text },
  }));

  const startChat = vi.fn(() => ({ sendMessage }));

  const getGenerativeModel = vi.fn(() => ({ startChat }));

  return {
    getGenerativeModel,
    _startChat: startChat,
    _sendMessage: sendMessage,
  };
}

describe("google()", () => {
  it("maps assistant role to model", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    const messages: Message[] = [
      { role: "user", content: "First" },
      { role: "assistant", content: "Response" },
      { role: "user", content: "Second" },
    ];

    await provider.call(messages);

    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          { role: "user", parts: [{ text: "First" }] },
          { role: "model", parts: [{ text: "Response" }] },
        ],
      }),
    );
    expect(client._sendMessage).toHaveBeenCalledWith("Second");
  });

  it("extracts system instruction separately", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    const messages: Message[] = [
      { role: "system", content: "Be helpful." },
      { role: "user", content: "Hello" },
    ];

    await provider.call(messages);

    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: {
          role: "user",
          parts: [{ text: "Be helpful." }],
        },
        history: [],
      }),
    );
  });

  it("concatenates multiple system messages with double newlines", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    const messages: Message[] = [
      { role: "system", content: "Policy A" },
      { role: "system", content: "Policy B" },
      { role: "user", content: "Hello" },
    ];

    await provider.call(messages);

    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: {
          role: "user",
          parts: [{ text: "Policy A\n\nPolicy B" }],
        },
      }),
    );
  });

  it("returns the response text", async () => {
    const client = mockGoogleClient('{"name": "Alice"}');
    const provider = google(client, "gemini-2.0-flash");

    const result = await provider.call([
      { role: "user", content: "Hello" },
    ]);

    expect(result).toBe('{"name": "Alice"}');
  });

  it("throws on empty response", async () => {
    const client = mockGoogleClient("");
    const provider = google(client, "gemini-2.0-flash");

    await expect(
      provider.call([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("Google returned an empty response");
  });

  it("throws when no user message provided", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    await expect(
      provider.call([{ role: "system", content: "System only" }]),
    ).rejects.toThrow("No user message provided");
  });

  it("passes native generationConfig through to getGenerativeModel", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    await provider.call([{ role: "user", content: "Hello" }], {
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
      },
    });

    expect(client.getGenerativeModel).toHaveBeenCalledWith({
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2000,
      },
    });
  });

  it("omits systemInstruction when no system message", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    await provider.call([{ role: "user", content: "Hello" }]);

    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: undefined,
      }),
    );
  });

  it("handles single user message with no history", async () => {
    const client = mockGoogleClient('{"single": true}');
    const provider = google(client, "gemini-2.0-flash");

    await provider.call([{ role: "user", content: "Just one" }]);

    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({ history: [] }),
    );
    expect(client._sendMessage).toHaveBeenCalledWith("Just one");
  });

  it("normalizes multimodal last message into text before sendMessage", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    await provider.call([
      {
        role: "user",
        content: [
          { type: "text", text: "What is in this image?" },
          { type: "image_url", image_url: { url: "https://example.com/img.png" } },
        ],
      },
    ]);

    expect(client._sendMessage).toHaveBeenCalledWith(
      [
        { text: "What is in this image?" },
        { text: "[image_url:https://example.com/img.png]" },
      ],
    );
  });

  it("passes safetySettings and explicit systemInstruction", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    await provider.call(
      [{ role: "user", content: "hello" }],
      {
        safetySettings: [{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }],
        systemInstruction: { role: "system", parts: [{ text: "Follow policy" }] },
      },
    );

    expect(client.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        safetySettings: [{ category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }],
      }),
    );
    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        systemInstruction: { role: "system", parts: [{ text: "Follow policy" }] },
      }),
    );
  });

  it("serializes tool calls into Gemini functionCall parts", async () => {
    const client = mockGoogleClient('{"ok": true}');
    const provider = google(client, "gemini-2.0-flash");

    await provider.call([
      {
        role: "assistant",
        content: "I will call a tool",
        toolCalls: [
          {
            id: "call-1",
            name: "getWeather",
            arguments: '{"city":"Paris"}',
          },
        ],
      },
      {
        role: "user",
        content: "continue",
      },
    ]);

    expect(client._startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        history: [
          {
            role: "model",
            parts: expect.arrayContaining([
              { text: "I will call a tool" },
              { functionCall: { name: "getWeather", args: { city: "Paris" } } },
            ]),
          },
        ],
      }),
    );
  });
});

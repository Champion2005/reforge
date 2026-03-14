import { describe, expect, it, vi } from "vitest";
import { openrouter } from "../../src/providers/openrouter.js";
import { groq } from "../../src/providers/groq.js";
import { together } from "../../src/providers/together.js";
import type { Message } from "../../src/providers/types.js";

function mockClient(content: unknown = '{"ok": true}') {
  return {
    chat: {
      completions: {
        create: vi.fn(async (_params: Record<string, unknown>) => ({
          choices: [{ message: { content } }],
        })),
      },
    },
  };
}

describe("openai split adapters", () => {
  const messages: Message[] = [{ role: "user", content: "Hello" }];

  it("openrouter injects OpenRouter header aliases", async () => {
    const client = mockClient();
    const provider = openrouter(client as any, "openai/gpt-4o-mini");

    await provider.call(messages, {
      httpReferer: "https://reforge.dev",
      xTitle: "Reforge",
      models: ["openai/gpt-4o-mini", "openai/gpt-4o"],
    });

    expect(client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        models: ["openai/gpt-4o-mini", "openai/gpt-4o"],
        extra_headers: {
          "HTTP-Referer": "https://reforge.dev",
          "X-Title": "Reforge",
        },
      }),
    );
  });

  it("groq can prepend system prompt into first user turn", async () => {
    const client = mockClient();
    const provider = groq(client as any, "llama-3.3-70b-versatile");

    await provider.call(
      [
        { role: "system", content: "Follow policy" },
        { role: "user", content: "Summarize this" },
      ],
      { systemPromptBehavior: "prepend_to_user" },
    );

    const params = (client.chat.completions.create.mock.calls.at(0)?.[0] ?? {}) as Record<string, unknown>;
    const sentMessages = (params.messages ?? []) as Array<Record<string, unknown>>;
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.content).toContain("[SYSTEM]");
    expect(sentMessages[0]?.content).toContain("Follow policy");
  });

  it("together passes repetition and sampling options through", async () => {
    const client = mockClient();
    const provider = together(client as any, "meta-llama/Llama-3.3-70B-Instruct-Turbo");

    await provider.call(messages, {
      repetition_penalty: 1.1,
      min_p: 0.15,
      top_k: 40,
    });

    expect(client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        repetition_penalty: 1.1,
        min_p: 0.15,
        top_k: 40,
      }),
    );
  });
});

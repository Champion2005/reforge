import type { Message, ReforgeProvider } from "./types.js";
import {
  openaiCompatible,
  type OpenAICompatibleClient,
  type OpenAICompatibleCallOptions,
} from "./openai-compatible.js";

export interface GroqCallOptions extends OpenAICompatibleCallOptions {
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  systemPromptBehavior?: "default" | "prepend_to_user";
}

function normalizeGroqMessages(
  messages: Message[],
  behavior: GroqCallOptions["systemPromptBehavior"],
): Message[] {
  if (behavior !== "prepend_to_user") {
    return messages;
  }

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .filter((v) => v.length > 0)
    .join("\n\n");

  if (!system) return messages;

  const nonSystem = messages.filter((m) => m.role !== "system");
  const firstUserIndex = nonSystem.findIndex((m) => m.role === "user");
  if (firstUserIndex === -1) return nonSystem;

  const firstUser = nonSystem[firstUserIndex]!;
  const firstUserContent = typeof firstUser.content === "string" ? firstUser.content : "";

  const adjusted = [...nonSystem];
  adjusted[firstUserIndex] = {
    ...firstUser,
    content: `[SYSTEM]\n${system}\n\n[USER]\n${firstUserContent}`,
  };

  return adjusted;
}

/**
 * Groq-specific OpenAI-compatible adapter.
 */
export function groq(
  client: OpenAICompatibleClient,
  model: string,
): ReforgeProvider<GroqCallOptions> {
  const base = openaiCompatible(client, model);

  return {
    id: `groq:${model}`,
    async call(messages: Message[], options?: GroqCallOptions): Promise<string> {
      const normalizedMessages = normalizeGroqMessages(
        messages,
        options?.systemPromptBehavior,
      );

      const merged: OpenAICompatibleCallOptions = {
        ...(options ?? {}),
      };

      delete (merged as Record<string, unknown>).systemPromptBehavior;

      return base.call(normalizedMessages, merged);
    },
  };
}

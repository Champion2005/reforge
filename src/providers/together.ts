import type { Message, ReforgeProvider } from "./types.js";
import {
  openaiCompatible,
  type OpenAICompatibleClient,
  type OpenAICompatibleCallOptions,
} from "./openai-compatible.js";

export interface TogetherCallOptions extends OpenAICompatibleCallOptions {
  repetition_penalty?: number;
  min_p?: number;
  top_k?: number;
}

/**
 * Together AI-specific OpenAI-compatible adapter.
 */
export function together(
  client: OpenAICompatibleClient,
  model: string,
): ReforgeProvider<TogetherCallOptions> {
  const base = openaiCompatible(client, model);

  return {
    id: `together:${model}`,
    async call(messages: Message[], options?: TogetherCallOptions): Promise<string> {
      return base.call(messages, options);
    },
  };
}

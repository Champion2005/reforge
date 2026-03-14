import type { Message, ReforgeProvider } from "./types.js";
import {
  openaiCompatible,
  type OpenAICompatibleClient,
  type OpenAICompatibleCallOptions,
} from "./openai-compatible.js";

export interface OpenRouterCallOptions extends OpenAICompatibleCallOptions {
  models?: string[];
  provider?: Record<string, unknown>;
  route?: "fallback" | "throughput" | "latency";
  transforms?: string[];
  httpReferer?: string;
  xTitle?: string;
  extraHeaders?: Record<string, string>;
}

/**
 * OpenRouter-specific OpenAI-compatible adapter.
 */
export function openrouter(
  client: OpenAICompatibleClient,
  model: string,
): ReforgeProvider<OpenRouterCallOptions> {
  const base = openaiCompatible(client, model);

  return {
    id: `openrouter:${model}`,
    async call(messages: Message[], options?: OpenRouterCallOptions): Promise<string> {
      const headers: Record<string, string> = {
        ...(options?.extraHeaders ?? {}),
      };

      if (options?.httpReferer) {
        headers["HTTP-Referer"] = options.httpReferer;
      }
      if (options?.xTitle) {
        headers["X-Title"] = options.xTitle;
      }

      const merged: OpenAICompatibleCallOptions = {
        ...(options ?? {}),
        ...(Object.keys(headers).length > 0 ? { extra_headers: headers } : {}),
      };

      delete (merged as Record<string, unknown>).httpReferer;
      delete (merged as Record<string, unknown>).xTitle;
      delete (merged as Record<string, unknown>).extraHeaders;

      return base.call(messages, merged);
    },
  };
}

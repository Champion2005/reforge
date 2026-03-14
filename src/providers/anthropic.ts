import type { ReforgeProvider, Message, ProviderCallOptions } from "./types.js";
import { filterReforgeKeys, getMessageText } from "./utils.js";

export interface AnthropicCallOptions extends ProviderCallOptions {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  thinking?: unknown;
  tool_choice?: unknown;
  tools?: unknown;
}

/**
 * Minimal subset of the Anthropic client used by the adapter.
 */
interface AnthropicClient {
  messages: {
    create(params: Record<string, unknown>): Promise<{
      content: Array<{ type: string; text?: string }>;
    }>;
  };
}

type AnthropicContentBlock =
  | { type: "text"; text: string; cache_control?: unknown }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };

function toAnthropicContentBlocks(message: Message): AnthropicContentBlock[] {
  const blocks: AnthropicContentBlock[] = [];

  if (typeof message.content === "string") {
    blocks.push({ type: "text", text: message.content });
  } else {
    for (const block of message.content) {
      if (block.type === "text") {
        blocks.push({
          type: "text",
          text: block.text,
          ...(Object.prototype.hasOwnProperty.call(block, "cache_control")
            ? { cache_control: (block as unknown as { cache_control?: unknown }).cache_control }
            : {}),
        });
      } else {
        blocks.push({
          type: "text",
          text: `[image_url:${block.image_url.url}]`,
        });
      }
    }
  }

  if (message.toolCalls && message.toolCalls.length > 0) {
    for (const toolCall of message.toolCalls) {
      let parsedInput: unknown = toolCall.arguments;
      try {
        parsedInput = JSON.parse(toolCall.arguments);
      } catch {
        // Keep raw string when parsing fails.
      }

      blocks.push({
        type: "tool_use",
        id: toolCall.id,
        name: toolCall.name,
        input: parsedInput,
      });
    }
  }

  if (message.toolResponse) {
    blocks.push({
      type: "tool_result",
      tool_use_id: message.toolResponse.toolCallId,
      content: getMessageText({
        role: "tool",
        content: message.toolResponse.content,
      }),
      ...(message.toolResponse.isError ? { is_error: true } : {}),
    });
  }

  return blocks;
}

/**
 * Create a `ReforgeProvider` for the Anthropic Messages API.
 *
 * Only needed for **direct** Anthropic API access. If you're using
 * Claude through OpenRouter or another proxy, use `openaiCompatible()` instead.
 *
 * @param client - An `Anthropic` client instance (from `@anthropic-ai/sdk`).
 * @param model  - The model identifier (e.g. `"claude-sonnet-4-20250514"`).
 * @returns A `ReforgeProvider` ready to use with `forge()`.
 *
 * @example
 * ```ts
 * import Anthropic from '@anthropic-ai/sdk';
 * import { anthropic } from 'reforge-ai/anthropic';
 *
 * const provider = anthropic(new Anthropic(), 'claude-sonnet-4-20250514');
 * ```
 */
export function anthropic(
  client: AnthropicClient,
  model: string,
): ReforgeProvider<AnthropicCallOptions> {
  return {
    id: `anthropic:${model}`,
    async call(
      messages: Message[],
      options?: AnthropicCallOptions,
    ): Promise<string> {
      const extra = filterReforgeKeys(options);

      // Anthropic requires system messages to be passed separately
      const systemMessages = messages
        .filter((m) => m.role === "system")
        .map((m) => toAnthropicContentBlocks(m))
        .flat();
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");

      const maxTokensOption = options?.max_tokens;
      const maxTokens = typeof maxTokensOption === "number" ? maxTokensOption : 4096;

      const params: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: nonSystemMsgs.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: toAnthropicContentBlocks(m),
        })),
        ...extra,
      };

      if (systemMessages.length > 0) {
        params.system = systemMessages;
      }

      const response = await client.messages.create(params);

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text" || !textBlock.text) {
        throw new Error("Anthropic returned no text content");
      }
      return textBlock.text;
    },
  };
}

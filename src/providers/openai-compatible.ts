import type { ReforgeProvider, Message, ProviderCallOptions } from "./types.js";
import { filterReforgeKeys } from "./utils.js";

/**
 * Minimal subset of the `OpenAI` client used by the adapter.
 * This avoids importing the full `openai` package at the type level
 * while still providing type-safety for users who pass their client.
 */
interface OpenAICompatibleClient {
  chat: {
    completions: {
      create(params: Record<string, unknown>): Promise<{
        choices: Array<{
          message?: {
            content?: unknown;
            refusal?: unknown;
          };
          text?: unknown;
          finish_reason?: unknown;
        }>;
      }>;
    };
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractTextFromUnknown(value: unknown): string | undefined {
  if (isNonEmptyString(value)) {
    return value;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const parts: string[] = [];

  for (const part of value) {
    if (isNonEmptyString(part)) {
      parts.push(part);
      continue;
    }

    if (!part || typeof part !== "object") {
      continue;
    }

    const maybeText = (part as { text?: unknown }).text;
    if (isNonEmptyString(maybeText)) {
      parts.push(maybeText);
      continue;
    }

    const maybeContent = (part as { content?: unknown }).content;
    if (isNonEmptyString(maybeContent)) {
      parts.push(maybeContent);
    }
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join("\n");
}

/**
 * Create a `ReforgeProvider` for any OpenAI-compatible API.
 *
 * Works with: **OpenAI**, **OpenRouter**, **Together AI**, **Groq**,
 * **Fireworks**, **Perplexity**, **Ollama**, **LM Studio**, **vLLM**,
 * **Deepseek**, **Mistral**, and any other provider that implements the
 * `/v1/chat/completions` API shape.
 *
 * The user passes their own pre-configured client (with `baseURL` and
 * `apiKey` already set). Reforge never manages credentials.
 *
 * @param client - An `OpenAI` client instance (from the `openai` npm package).
 * @param model  - The model identifier (e.g. `"gpt-4o"`, `"llama-3-70b"`).
 * @returns A `ReforgeProvider` ready to use with `forge()`.
 *
 * @example
 * ```ts
 * import OpenAI from 'openai';
 * import { openaiCompatible } from 'reforge-ai/openai-compatible';
 *
 * // Direct OpenAI
 * const provider = openaiCompatible(new OpenAI(), 'gpt-4o');
 *
 * // OpenRouter
 * const provider = openaiCompatible(
 *   new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: '...' }),
 *   'anthropic/claude-3.5-sonnet',
 * );
 * ```
 */
export function openaiCompatible(
  client: OpenAICompatibleClient,
  model: string,
): ReforgeProvider {
  return {
    async call(
      messages: Message[],
      options?: ProviderCallOptions,
    ): Promise<string> {
      const extra = filterReforgeKeys(options);

      const params: Record<string, unknown> = {
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        ...extra,
      };

      if (options?.temperature !== undefined) {
        params.temperature = options.temperature;
      }

      if (options?.maxTokens !== undefined) {
        params.max_tokens = options.maxTokens;
      }

      const response = await client.chat.completions.create(params);
      const choices = Array.isArray(response.choices)
        ? response.choices
        : [];
      const firstChoice = choices[0];
      const candidates: unknown[] = [
        firstChoice?.message?.content,
        firstChoice?.text,
        firstChoice?.message?.refusal,
      ];

      for (const candidate of candidates) {
        const text = extractTextFromUnknown(candidate);
        if (text !== undefined) {
          return text;
        }
      }

      const finishReason = firstChoice?.finish_reason;
      const finishReasonInfo = isNonEmptyString(finishReason)
        ? ` (finish_reason: ${finishReason})`
        : "";

      throw new Error(
        `OpenAI-compatible provider returned an empty response${finishReasonInfo}`,
      );
    },
  };
}

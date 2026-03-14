import type { ReforgeProvider, Message, ProviderCallOptions } from "./types.js";
import { getMessageText } from "./utils.js";

export interface GoogleCallOptions extends ProviderCallOptions {
  generationConfig?: Record<string, unknown>;
  safetySettings?: unknown[];
  systemInstruction?: { role?: string; parts?: Array<{ text: string }> };
  modelOptions?: Record<string, unknown>;
  chatOptions?: Record<string, unknown>;
}

/**
 * Minimal subset of the Google Generative AI client used by the adapter.
 */
interface GoogleGenerativeAIClient {
  getGenerativeModel(params: Record<string, unknown>): {
    startChat(params: Record<string, unknown>): {
      sendMessage(
        message: unknown,
      ): Promise<{ response: { text(): string } }>;
    };
  };
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: unknown } }
  | { functionResponse: { name: string; response: unknown } };

function toGeminiTextParts(message: Message): GeminiPart[] {
  if (typeof message.content === "string") {
    return [{ text: message.content }];
  }

  const parts: GeminiPart[] = [];
  for (const block of message.content) {
    if (block.type === "text") {
      parts.push({ text: block.text });
    } else {
      parts.push({ text: `[image_url:${block.image_url.url}]` });
    }
  }

  return parts.length > 0 ? parts : [{ text: "" }];
}

function parseToolArguments(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function toGeminiParts(message: Message): GeminiPart[] {
  const parts = toGeminiTextParts(message);

  if (message.toolCalls && message.toolCalls.length > 0) {
    for (const toolCall of message.toolCalls) {
      parts.push({
        functionCall: {
          name: toolCall.name,
          args: parseToolArguments(toolCall.arguments),
        },
      });
    }
  }

  if (message.toolResponse) {
    parts.push({
      functionResponse: {
        name: message.toolResponse.name,
        response: {
          toolCallId: message.toolResponse.toolCallId,
          content: getMessageText({ role: "tool", content: message.toolResponse.content }),
          isError: message.toolResponse.isError ?? false,
        },
      },
    });
  }

  return parts;
}

/**
 * Create a `ReforgeProvider` for Google Gemini / Vertex AI.
 *
 * Only needed for **direct** Google AI access via the `@google/generative-ai`
 * SDK. If you're using Gemini through an OpenAI-compatible proxy, use
 * `openaiCompatible()` instead.
 *
 * @param client - A `GoogleGenerativeAI` instance (from `@google/generative-ai`).
 * @param model  - The model identifier (e.g. `"gemini-2.0-flash"`).
 * @returns A `ReforgeProvider` ready to use with `forge()`.
 *
 * @example
 * ```ts
 * import { GoogleGenerativeAI } from '@google/generative-ai';
 * import { google } from 'reforge-ai/google';
 *
 * const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
 * const provider = google(client, 'gemini-2.0-flash');
 * ```
 */
export function google(
  client: GoogleGenerativeAIClient,
  model: string,
): ReforgeProvider<GoogleCallOptions> {
  return {
    id: `google:${model}`,
    async call(
      messages: Message[],
      options?: GoogleCallOptions,
    ): Promise<string> {
      const generationConfig =
        options?.generationConfig && typeof options.generationConfig === "object"
          ? (options.generationConfig as Record<string, unknown>)
          : undefined;
      const modelOptions =
        options?.modelOptions && typeof options.modelOptions === "object"
          ? (options.modelOptions as Record<string, unknown>)
          : undefined;

      const genModel = client.getGenerativeModel({
        model,
        ...(generationConfig ? { generationConfig } : {}),
        ...(Array.isArray(options?.safetySettings)
          ? { safetySettings: options.safetySettings }
          : {}),
        ...(modelOptions ?? {}),
      });

      // Convert messages to Gemini format
      const systemMessages = messages
        .filter((m) => m.role === "system")
        .map((m) => getMessageText(m));
      const nonSystemMsgs = messages.filter((m) => m.role !== "system");

      const history = nonSystemMsgs.slice(0, -1).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: toGeminiParts(m),
      }));

      const lastMsg = nonSystemMsgs[nonSystemMsgs.length - 1];
      if (!lastMsg) {
        throw new Error("No user message provided");
      }

      const chat = genModel.startChat({
        history,
        ...(options?.chatOptions && typeof options.chatOptions === "object"
          ? (options.chatOptions as Record<string, unknown>)
          : {}),
        systemInstruction: options?.systemInstruction ??
          (systemMessages.length > 0
            ? {
                role: "user",
                parts: [{ text: systemMessages.join("\n\n") }],
              }
            : undefined),
      });

      const lastParts = toGeminiParts(lastMsg);
      const sendPayload =
        lastParts.length === 1 && "text" in lastParts[0]!
          ? lastParts[0]!.text
          : lastParts;
      const result = await chat.sendMessage(sendPayload);
      const text = result.response.text();
      if (!text) {
        throw new Error("Google returned an empty response");
      }
      return text;
    },
  };
}

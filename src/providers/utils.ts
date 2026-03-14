import type {
  ProviderCallOptions,
  Message,
  MessageContent,
  MessageContentBlock,
  MessageImageUrlBlock,
} from "./types.js";

/**
 * Keys managed by Reforge that should not be spread into the
 * provider-specific options object (they are mapped explicitly).
 */
const REFORGE_KEYS = new Set<string>([]);

/**
 * Strip Reforge-managed keys from a `ProviderCallOptions` object so
 * they aren't double-sent when spreading into provider SDK calls.
 *
 * Returns a plain object with only the pass-through keys, or
 * `undefined` if there's nothing left.
 */
export function filterReforgeKeys(
  options?: ProviderCallOptions,
): Record<string, unknown> | undefined {
  if (!options) return undefined;

  const filtered: Record<string, unknown> = {};
  let hasKeys = false;

  for (const key of Object.keys(options)) {
    if (!REFORGE_KEYS.has(key)) {
      filtered[key] = options[key];
      hasKeys = true;
    }
  }

  return hasKeys ? filtered : undefined;
}

function isImageBlock(block: MessageContentBlock): block is MessageImageUrlBlock {
  return block.type === "image_url";
}

/**
 * Convert message content into plain text for providers that do not support
 * image/message blocks in their input shape.
 */
export function messageContentToText(content: MessageContent): string {
  if (typeof content === "string") {
    return content;
  }

  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text") {
      parts.push(block.text);
      continue;
    }

    if (isImageBlock(block)) {
      parts.push(`[image_url:${block.image_url.url}]`);
    }
  }

  return parts.join("\n");
}

/**
 * Extract only text blocks from a message for providers with text-only system
 * channels.
 */
export function getMessageText(message: Message): string {
  return messageContentToText(message.content);
}

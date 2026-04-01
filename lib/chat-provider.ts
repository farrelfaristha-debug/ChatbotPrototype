import { runChatAgentClaude } from "@/lib/chat-agent-claude";
import { runChatAgentOpenAI } from "@/lib/chat-agent-openai";
import { normalizeChatMessages } from "@/lib/normalize-chat-messages";

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Prioritas: Claude (Anthropic) jika ANTHROPIC_API_KEY ada — lebih patuh instruksi.
 * Fallback: OpenAI jika hanya OPENAI_API_KEY.
 */
export async function runChatAgent(
  incoming: { role: string; content: string }[]
): Promise<string> {
  const normalized = normalizeChatMessages(incoming);

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    return runChatAgentClaude(normalized);
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return runChatAgentOpenAI(normalized);
  }
  throw new Error(
    "Tidak ada kunci API. Tambahkan ANTHROPIC_API_KEY (disarankan) atau OPENAI_API_KEY di .env.local."
  );
}

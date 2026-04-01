import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlock,
  MessageParam,
  TextBlock,
  Tool,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { buildSystemContent, LAST_USER_TAIL } from "@/lib/chat-prompt";
import { calculateMonthlyInstallment, formatRupiah } from "@/lib/kpr";

/**
 * Default: Claude Sonnet 4 (ID masih didukung API; snapshot 3.5 lama sering 404).
 * Lihat https://docs.anthropic.com/en/docs/about-claude/models — atur ANTHROPIC_MODEL jika perlu.
 */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

const anthropicTools: Tool[] = [
  {
    name: "hitung_cicilan_kpr",
    description:
      "Hitung cicilan bulanan KPR (anuitas). Panggil jika user meminta simulasi cicilan dan ada asumsi pokok (Rp), bunga tahunan (%), tenor (tahun).",
    input_schema: {
      type: "object",
      properties: {
        pokok_pinjaman: {
          type: "number",
          description: "Pokok pinjaman Rupiah",
        },
        suku_bunga_tahunan_persen: {
          type: "number",
          description: "Suku bunga tahunan persen",
        },
        jangka_waktu_tahun: {
          type: "number",
          description: "Tenor tahun",
        },
      },
      required: [
        "pokok_pinjaman",
        "suku_bunga_tahunan_persen",
        "jangka_waktu_tahun",
      ],
    },
  },
];

function isTextBlock(b: ContentBlock): b is TextBlock {
  return b.type === "text";
}

function isToolUseBlock(b: ContentBlock): b is ToolUseBlock {
  return b.type === "tool_use";
}

function extractAssistantText(blocks: ContentBlock[]): string {
  return blocks.filter(isTextBlock).map((b) => b.text).join("");
}

export async function runChatAgentClaude(
  incoming: { role: string; content: string }[]
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ANTHROPIC_API_KEY belum diatur.");
  }

  const anthropic = new Anthropic({ apiKey });

  const rawLastUser =
    [...incoming].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastUserMessage = rawLastUser.slice(0, 6000);
  const system = buildSystemContent(lastUserMessage);

  let lastUserIndex = -1;
  for (let i = incoming.length - 1; i >= 0; i--) {
    if (incoming[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  const claudeMessages: MessageParam[] = incoming.map((m, i) => {
    const content =
      m.role === "user" && i === lastUserIndex
        ? `${m.content}${LAST_USER_TAIL}`
        : m.content;
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content,
    };
  });

  let messages: MessageParam[] = [...claudeMessages];

  for (let round = 0; round < 12; round += 1) {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system,
      messages,
      tools: anthropicTools,
    });

    if (response.stop_reason === "tool_use") {
      const toolUses = response.content.filter(isToolUseBlock);
      if (toolUses.length === 0) {
        return extractAssistantText(response.content);
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: ToolResultBlockParam[] = [];
      for (const block of toolUses) {
        if (block.name !== "hitung_cicilan_kpr") continue;
        const input = block.input as {
          pokok_pinjaman?: number;
          suku_bunga_tahunan_persen?: number;
          jangka_waktu_tahun?: number;
        };
        const monthly = calculateMonthlyInstallment({
          principal: Number(input.pokok_pinjaman ?? 0),
          annualInterestRate: Number(input.suku_bunga_tahunan_persen ?? 0),
          tenureYears: Number(input.jangka_waktu_tahun ?? 0),
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify({
            cicilan_per_bulan_rupiah: monthly,
            cicilan_per_bulan_terformat: formatRupiah(monthly),
            parameter: input,
          }),
        });
      }

      if (toolResults.length === 0) {
        return extractAssistantText(response.content);
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    return extractAssistantText(response.content);
  }

  return "Maaf, pemrosesan simulasi memakan terlalu banyak langkah. Silakan coba pertanyaan lebih singkat.";
}

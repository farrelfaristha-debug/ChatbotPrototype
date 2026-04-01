import OpenAI from "openai";
import { buildSystemContent, LAST_USER_TAIL } from "@/lib/chat-prompt";
import { calculateMonthlyInstallment, formatRupiah } from "@/lib/kpr";

export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "hitung_cicilan_kpr",
      description:
        "Hitung cicilan bulanan KPR (anuitas). Wajib dipanggil jika user menanyakan cicilan/simulasi KPR dan memberikan atau menyetujui asumsi pokok pinjaman (Rp), suku bunga tahunan (%), dan tenor (tahun).",
      parameters: {
        type: "object",
        properties: {
          pokok_pinjaman: {
            type: "number",
            description: "Nominal pokok pinjaman dalam Rupiah",
          },
          suku_bunga_tahunan_persen: {
            type: "number",
            description: "Suku bunga tahunan dalam persen (misalnya 3.5 untuk 3,5%)",
          },
          jangka_waktu_tahun: {
            type: "number",
            description: "Tenor pinjaman dalam tahun",
          },
        },
        required: [
          "pokok_pinjaman",
          "suku_bunga_tahunan_persen",
          "jangka_waktu_tahun",
        ],
      },
    },
  },
];

export async function runChatAgentOpenAI(
  incoming: { role: string; content: string }[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY belum diatur.");
  }

  const openai = new OpenAI({ apiKey });

  const rawLastUser =
    [...incoming].reverse().find((m) => m.role === "user")?.content ?? "";
  const lastUserMessage = rawLastUser.slice(0, 6000);

  const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
    role: "system",
    content: buildSystemContent(lastUserMessage),
  };

  let lastUserIndex = -1;
  for (let i = incoming.length - 1; i >= 0; i--) {
    if (incoming[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }

  const userAssistantMessages: OpenAI.Chat.ChatCompletionMessageParam[] =
    incoming.map((m, i) => {
      const role = m.role === "assistant" ? "assistant" : "user";
      const content =
        role === "user" && i === lastUserIndex
          ? `${m.content}${LAST_USER_TAIL}`
          : m.content;
      return { role, content } as
        | OpenAI.Chat.ChatCompletionUserMessageParam
        | OpenAI.Chat.ChatCompletionAssistantMessageParam;
    });

  let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    systemMessage,
    ...userAssistantMessages,
  ];

  while (true) {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: currentMessages,
      tools,
      tool_choice: "auto",
      temperature: 0.35,
      frequency_penalty: 0.4,
      presence_penalty: 0.05,
      max_tokens: 1200,
    });

    const msg = completion.choices[0].message;

    if (msg.tool_calls?.length) {
      currentMessages.push(msg);
      for (const tc of msg.tool_calls) {
        if (tc.type !== "function") continue;
        if (tc.function.name === "hitung_cicilan_kpr") {
          let args: {
            pokok_pinjaman: number;
            suku_bunga_tahunan_persen: number;
            jangka_waktu_tahun: number;
          };
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = {
              pokok_pinjaman: 0,
              suku_bunga_tahunan_persen: 0,
              jangka_waktu_tahun: 0,
            };
          }
          const monthly = calculateMonthlyInstallment({
            principal: args.pokok_pinjaman,
            annualInterestRate: args.suku_bunga_tahunan_persen,
            tenureYears: args.jangka_waktu_tahun,
          });
          currentMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              cicilan_per_bulan_rupiah: monthly,
              cicilan_per_bulan_terformat: formatRupiah(monthly),
              parameter: args,
            }),
          });
        }
      }
      continue;
    }

    return msg.content ?? "";
  }
}

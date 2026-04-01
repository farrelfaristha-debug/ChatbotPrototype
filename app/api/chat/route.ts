import { NextRequest } from "next/server";
import { runChatAgent } from "@/lib/chat-provider";
import { createStreamingTextResponse } from "@/lib/stream-chat-response";

export async function POST(req: NextRequest) {
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim());
  if (!hasAnthropic && !hasOpenAI) {
    return Response.json(
      {
        error:
          "Tambahkan ANTHROPIC_API_KEY (disarankan) atau OPENAI_API_KEY di .env.local.",
      },
      { status: 500 }
    );
  }

  let body: { messages?: { role: string; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const incoming = body.messages ?? [];

  let text: string;
  try {
    text = await runChatAgent(incoming);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gagal memproses chat.";
    const clientError =
      message.includes("minimal satu pesan") ||
      message.includes("tidak boleh kosong");
    return Response.json(
      { error: message },
      { status: clientError ? 400 : 500 }
    );
  }

  return createStreamingTextResponse(text);
}

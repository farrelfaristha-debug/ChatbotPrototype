import { NextRequest } from "next/server";
import { runChatAgent, type ChatTurn } from "@/lib/chat-agent";

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION ?? "v21.0";

/** Riwayat per nomor WhatsApp (in-memory). Untuk produksi gunakan Redis/DB. */
const sessionByWaId = new Map<string, ChatTurn[]>();

type WaIncomingMessage = {
  from?: string;
  type?: string;
  text?: { body?: string };
};

/**
 * GET: verifikasi webhook Meta (WhatsApp Cloud API).
 * POST: terima pesan masuk, balas dengan teks yang sama seperti web chat.
 */
export async function GET(req: NextRequest) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && verifyToken === token && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: WaIncomingMessage[];
        };
      }>;
    }>;
  };

  const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages?.length) {
    return Response.json({ ok: true });
  }

  if (!accessToken || !phoneNumberId) {
    console.error(
      "[whatsapp] Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env.local"
    );
    return Response.json({ ok: true });
  }

  for (const msg of messages) {
    if (msg.type !== "text" || !msg.from || !msg.text?.body?.trim()) {
      continue;
    }

    const waId = msg.from;
    const userText = msg.text.body.trim();

    const history = sessionByWaId.get(waId) ?? [];
    const turnsForModel: { role: string; content: string }[] = history.map(
      (t) => ({ role: t.role, content: t.content })
    );
    turnsForModel.push({ role: "user", content: userText });

    let reply: string;
    try {
      reply = await runChatAgent(turnsForModel);
    } catch (e) {
      console.error("[whatsapp] runChatAgent", e);
      reply =
        "Maaf, layanan sementara tidak tersedia. Silakan hubungi tim marketing Cluster Cihanjuang Hills.";
    }

    history.push({ role: "user", content: userText });
    history.push({ role: "assistant", content: reply });
    if (history.length > 40) {
      history.splice(0, history.length - 40);
    }
    sessionByWaId.set(waId, history);

    await sendWhatsAppText({
      accessToken,
      phoneNumberId,
      to: waId,
      body: truncateForWhatsApp(reply),
    });
  }

  return Response.json({ ok: true });
}

function truncateForWhatsApp(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 20)}…\n(pesan dipotong)`;
}

async function sendWhatsAppText(params: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
}): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${params.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { preview_url: false, body: params.body },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[whatsapp] send failed", res.status, errText);
  }
}

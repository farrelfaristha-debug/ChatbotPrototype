/**
 * Stream teks ke client dalam batch kecil dengan jeda singkat agar terasa seperti obrolan AI (bukan satu blok).
 */
export function createStreamingTextResponse(fullText: string): Response {
  const encoder = new TextEncoder();
  const tokens = fullText.match(/\S+\s*|\n+/g) ?? [fullText];

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for (let i = 0; i < tokens.length; i += 1) {
          controller.enqueue(encoder.encode(tokens[i]));
          if (i < tokens.length - 1) {
            const ms = i < 100 ? 12 + Math.floor(Math.random() * 8) : 3;
            await new Promise((r) => setTimeout(r, ms));
          }
        }
      } catch (e) {
        controller.error(e);
        return;
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

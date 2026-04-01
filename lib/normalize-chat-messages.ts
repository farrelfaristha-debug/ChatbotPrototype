/**
 * Pastikan Anthropic/OpenAI selalu dapat riwayat valid: tidak kosong,
 * isi tidak kosong, dan (untuk Claude) pesan pertama dari user.
 */
export function normalizeChatMessages(
  incoming: { role: string; content: string }[]
): { role: "user" | "assistant"; content: string }[] {
  const out = incoming
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        String(m.content ?? "").trim().length > 0
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content).trim(),
    }));

  if (out.length === 0) {
    throw new Error("Kirim minimal satu pesan yang tidak kosong.");
  }

  if (out[0].role === "assistant") {
    out.unshift({ role: "user", content: "Halo, saya ingin bertanya tentang properti." });
  }

  return out;
}

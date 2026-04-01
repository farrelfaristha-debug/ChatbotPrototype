"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Sparkles, X } from "lucide-react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const QUICK_PROMPTS = [
  "Lokasi cluster di mana?",
  "Bedanya tipe 45/72 dan 80/100?",
  "Simulasi KPR: pinjaman 500 juta, bunga 4%, 15 tahun",
] as const;

export function ChatComponent() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, isLoading]);

  const sendMessage = useCallback(
    async (override?: string) => {
      const raw = override !== undefined ? override : input;
      const trimmed = raw.trim();
      if (!trimmed || isLoading) return;

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      /** Hitung riwayat di luar setState agar tidak pernah [] (mis. edge case React). */
      const historyForApi: ChatMessage[] = [...messages, userMsg];

      setMessages([...historyForApi, { role: "assistant", content: "" }]);
      setInput("");
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyForApi.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!res.ok) {
          let errText = "Terjadi kesalahan. Silakan coba lagi.";
          try {
            const data = (await res.json()) as { error?: string };
            if (data.error) errText = data.error;
          } catch {
            /* ignore */
          }
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: errText };
            return copy;
          });
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: "assistant",
              content: "Tidak ada respons dari server.",
            };
            return copy;
          });
          return;
        }

        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
      } catch {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Koneksi gagal. Periksa jaringan Anda lalu coba lagi.",
          };
          return copy;
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e5c4a] text-white shadow-lg transition hover:bg-[#174a3c] focus:outline-none focus:ring-2 focus:ring-[#1e5c4a]/40"
        aria-label="Buka chat dengan Budi (AI helper)"
      >
        <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-4 sm:items-end sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
          aria-describedby="chat-subtitle"
        >
          <div className="flex h-[min(580px,88vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-[#f0ebe4] shadow-2xl">
            <header className="flex items-center gap-3 border-b border-stone-200/90 bg-[#1e5c4a] px-3 py-3 text-white sm:px-4">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-base font-semibold ring-2 ring-white/25"
                aria-hidden
              >
                B
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-200" aria-hidden />
                  <h2 id="chat-title" className="truncate text-sm font-semibold tracking-wide">
                    Budi · AI chat helper
                  </h2>
                </div>
                <p id="chat-subtitle" className="text-xs text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Online · Cluster Cihanjuang Hills
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-1.5 hover:bg-white/10"
                aria-label="Tutup chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              ref={listRef}
              className="flex-1 space-y-3 overflow-y-auto px-3 py-4 text-sm text-stone-800"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <div className="mr-4 rounded-2xl rounded-bl-md border border-stone-200 bg-white px-3 py-2.5 shadow-sm">
                    <p className="whitespace-pre-wrap leading-relaxed text-stone-800">
                      Halo—saya Budi, pembantu chat untuk info properti di sini. Mau tanya lokasi,
                      tipe unit, atau simulasi KPR? Ketik saja, atau pakai pintasan di bawah.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendMessage(q)}
                        disabled={isLoading}
                        className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-left text-xs text-stone-700 shadow-sm transition hover:border-[#1e5c4a]/40 hover:bg-stone-50 disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={
                    m.role === "user"
                      ? "ml-8 rounded-2xl rounded-br-md bg-[#1e5c4a] px-3 py-2 text-white"
                      : "mr-4 rounded-2xl rounded-bl-md border border-stone-200 bg-white px-3 py-2 text-stone-800 shadow-sm"
                  }
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ))}

              {isLoading && messages.length > 0 && messages[messages.length - 1]?.content === "" ? (
                <div
                  className="mr-4 inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-stone-200 bg-white px-3 py-2.5 shadow-sm"
                  aria-hidden
                >
                  <span className="text-xs text-stone-500">Budi mengetik</span>
                  <span className="chat-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-stone-400" />
                  <span className="chat-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-stone-400" />
                  <span className="chat-typing-dot inline-block h-1.5 w-1.5 rounded-full bg-stone-400" />
                </div>
              ) : null}
            </div>

            {messages.length > 0 ? (
              <div className="border-t border-stone-200/90 bg-white/80 px-3 py-2">
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-400">
                  Pintasan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendMessage(q)}
                      disabled={isLoading}
                      className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-700 transition hover:bg-stone-200 disabled:opacity-50"
                    >
                      {q.length > 42 ? `${q.slice(0, 40)}…` : q}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-stone-200 bg-white p-3">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Tulis pertanyaan Anda… (Shift+Enter baris baru)"
                  rows={2}
                  className="min-h-[44px] flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#1e5c4a] focus:outline-none focus:ring-1 focus:ring-[#1e5c4a]/30"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-xl bg-[#1e5c4a] text-white shadow-sm transition hover:bg-[#174a3c] disabled:opacity-40"
                  aria-label="Kirim"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

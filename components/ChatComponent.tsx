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
        className="fixed z-50 flex h-14 min-h-[3.5rem] w-14 min-w-[3.5rem] touch-manipulation items-center justify-center rounded-full bg-[#1e5c4a] text-white shadow-lg transition hover:bg-[#174a3c] focus:outline-none focus:ring-2 focus:ring-[#1e5c4a]/40"
        style={{
          bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
          right: "max(1rem, env(safe-area-inset-right, 0px))",
        }}
        aria-label="Buka chat dengan Budi (AI helper)"
      >
        <MessageCircle className="h-7 w-7" strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 p-0 sm:items-end sm:justify-end sm:bg-black/30 sm:p-4 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-title"
          aria-describedby="chat-subtitle"
        >
          <div
            className="flex max-h-[100dvh] min-h-0 w-full max-w-full flex-1 flex-col overflow-hidden rounded-none border-0 border-stone-200/80 bg-[#f0ebe4] shadow-2xl sm:max-h-[min(580px,90dvh)] sm:max-w-md sm:flex-none sm:rounded-2xl sm:border"
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            <header className="flex shrink-0 items-center gap-3 border-b border-stone-200/90 bg-[#1e5c4a] px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-4">
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
                className="min-h-[44px] min-w-[44px] shrink-0 touch-manipulation rounded-lg p-2 hover:bg-white/10"
                aria-label="Tutup chat"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div
              ref={listRef}
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-3 text-sm text-stone-800 sm:py-4"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col gap-3">
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
                        className="touch-manipulation rounded-full border border-stone-200 bg-white px-3 py-2.5 text-left text-xs leading-snug text-stone-700 shadow-sm transition hover:border-[#1e5c4a]/40 hover:bg-stone-50 active:bg-stone-100 disabled:opacity-50 sm:py-1.5"
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
                      ? "max-w-[min(100%,22rem)] self-end rounded-2xl rounded-br-md bg-[#1e5c4a] px-3 py-2.5 text-[15px] text-white sm:max-w-[min(100%,24rem)] sm:text-sm"
                      : "max-w-[min(100%,24rem)] self-start rounded-2xl rounded-bl-md border border-stone-200 bg-white px-3 py-2.5 text-[15px] text-stone-800 shadow-sm sm:max-w-[min(100%,26rem)] sm:text-sm"
                  }
                >
                  <p className="break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>
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

            <div className="shrink-0 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
                  enterKeyHint="send"
                  inputMode="text"
                  autoComplete="off"
                  className="min-h-[48px] flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-[#1e5c4a] focus:outline-none focus:ring-1 focus:ring-[#1e5c4a]/30 sm:min-h-[44px] sm:py-2 sm:text-sm"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={isLoading || !input.trim()}
                  className="flex h-12 min-h-[48px] w-12 min-w-[48px] shrink-0 touch-manipulation items-center justify-center self-end rounded-xl bg-[#1e5c4a] text-white shadow-sm transition hover:bg-[#174a3c] active:bg-[#174a3c] disabled:opacity-40 sm:h-11 sm:min-h-[44px] sm:w-11 sm:min-w-[44px]"
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

import { ChatComponent } from "@/components/ChatComponent";

export default function Home() {
  return (
    <div className="relative flex min-h-[100dvh] min-h-screen flex-col bg-[#f5f2eb] pb-[env(safe-area-inset-bottom)]">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1e5c4a] sm:text-xs sm:tracking-[0.2em]">
          Cluster Cihanjuang Hills
        </p>
        <h1 className="max-w-xl text-balance text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
          AI chat helper untuk calon pembeli
        </h1>
        <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-stone-600 sm:text-base">
          Obrolan real-time: tanya lokasi, tipe 45/72 dan 80/100, material, simulasi KPR, atau
          jadwal ke lokasi—seperti chat dengan sales, dengan bantuan AI di balik layar. Buka ikon
          chat di pojok kanan bawah.
        </p>
      </main>
      <ChatComponent />
    </div>
  );
}

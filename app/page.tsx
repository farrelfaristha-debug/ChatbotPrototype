import { ChatComponent } from "@/components/ChatComponent";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#f5f2eb]">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#1e5c4a]">
          Cluster Cihanjuang Hills
        </p>
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          AI chat helper untuk calon pembeli
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-stone-600">
          Obrolan real-time: tanya lokasi, tipe 45/72 dan 80/100, material, simulasi KPR, atau
          jadwal ke lokasi—seperti chat dengan sales, dengan bantuan AI di balik layar. Buka ikon
          chat di pojok kanan bawah.
        </p>
      </main>
      <ChatComponent />
    </div>
  );
}

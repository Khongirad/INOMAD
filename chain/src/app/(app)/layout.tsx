import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-gold-primary/30">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative overflow-x-hidden">
        <Header />
        <div className="flex-1 w-full max-w-[1920px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

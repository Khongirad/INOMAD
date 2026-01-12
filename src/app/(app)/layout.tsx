import Link from "next/link";

const NavItem = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="block rounded-md px-3 py-2 text-sm hover:bg-zinc-900 hover:text-white text-zinc-300"
  >
    {label}
  </Link>
);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950">
          <div className="p-4 border-b border-zinc-800">
            <div className="text-xs text-zinc-400">INOMAD</div>
            <div className="text-lg font-semibold">Chancellery</div>
          </div>

          <nav className="p-3 space-y-1">
            <NavItem href="/dashboard" label="Dashboard" />
            <NavItem href="/board" label="Board (Contracts)" />
            <div className="mt-3 px-3 text-xs text-zinc-500">Institutions</div>
            <NavItem href="/dashboard" label="Central Bank (draft)" />
            <NavItem href="/dashboard" label="State Chancellery (draft)" />
            <NavItem href="/dashboard" label="Court (draft)" />
            <NavItem href="/identity/create" label="Identity (Create)" />

          </nav>
        </aside>

        <main className="flex-1">
          <header className="sticky top-0 z-10 border-b border-zinc-800 bg-black/70 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-3">
              <div className="text-sm text-zinc-400">
                Status: <span className="text-zinc-200">Guest</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-900"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm text-black hover:bg-white"
                >
                  Register
                </Link>
              </div>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

// src/app/(app)/dashboard/page.tsx

import Link from "next/link";

export default function DashboardPage() {
  const familySpine = [
    {
      title: "Family (Center)",
      status: "Active",
      hint: "Your home unit. Always exists.",
    },
    {
      title: "Rod",
      status: "Locked",
      hint: "Lineage. Opens after identity + parents.",
    },
    {
      title: "Clan",
      status: "Locked",
      hint: "Public structure. Opens after Rod.",
    },
    {
      title: "Nation",
      status: "Locked",
      hint: "People & territory. Opens after Clan.",
    },
    {
      title: "Constitution",
      status: "Locked",
      hint: "Rules & legitimacy. Opens after Nation.",
    },
  ] as const;

  const institutions = [
    {
      title: "State Chancellery",
      desc: "Institutional structure 10–100–1000–10000",
      href: "#",
    },
    {
      title: "Central Bank",
      desc: "Wallet issuance • treasury • locked→unlock",
      href: "#",
    },
    { title: "Courts", desc: "Disputes • enforcement • legitimacy", href: "#" },
    {
      title: "Registries",
      desc: "Identity • elections • property • contracts",
      href: "#",
    },
  ] as const;

  const market = [
    {
      title: "Cooperatives",
      desc: "Guilds • production • services • trade",
      href: "#",
    },
    {
      title: "Contracts Board",
      desc: "Tasks, deals, public offers",
      href: "#",
    },
    {
      title: "Auctions / Exchange",
      desc: "Market pricing & distribution",
      href: "#",
    },
    {
      title: "Resources & Fund",
      desc: "State resources → sovereign fund",
      href: "#",
    },
  ] as const;

  const wallets = [
    {
      title: "Personal Wallet",
      tag: "Citizen",
      status: "Locked",
      balance: "0 ALT",
    },
    {
      title: "Family Wallet",
      tag: "Family",
      status: "Locked",
      balance: "0 ALT",
    },
    { title: "Clan Wallet", tag: "Clan", status: "Locked", balance: "0 ALT" },
    {
      title: "Nation Treasury",
      tag: "State",
      status: "Locked",
      balance: "0 ALT",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="text-xs text-zinc-500">INOMAD KHURAL</div>
        <h1 className="mt-2 text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-3xl">
          Three pillars: <span className="text-zinc-200">Institutions</span> •{" "}
          <span className="text-zinc-200">Family</span> •{" "}
          <span className="text-zinc-200">Market</span>. The center is family —
          everything else grows from it.
        </p>
      </div>

      {/* 3 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: INSTITUTIONS (Silver) */}
        <Pillar
          title="Institutions of Power"
          subtitle="State layer • law • execution • courts • registries"
          tone="silver"
          className="lg:col-span-4"
        >
          <div className="space-y-3">
            {institutions.map((it) => (
              <PillarItem
                key={it.title}
                title={it.title}
                desc={it.desc}
                href={it.href}
              />
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm font-medium">Silver Priority</div>
            <div className="mt-2 text-sm text-zinc-400">
              Institutions exist to protect families, enforce rules, and keep
              the system coherent.
            </div>
          </div>
        </Pillar>

        {/* CENTER: FAMILY (Gold) */}
        <Pillar
          title="Family (Gold Center)"
          subtitle="The core of identity, continuity and duty"
          tone="gold"
          className="lg:col-span-4"
        >
          <div className="rounded-xl border border-zinc-800 bg-black p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Your Family</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Always present. Even if unknown, it exists as your anchor.
                </div>
              </div>
              <Link
                href="/identity/create"
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
              >
                Open Identity
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
              {familySpine.map((n, idx) => (
                <div
                  key={n.title}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {idx + 1}. {n.title}
                    </div>
                    <StatusBadge status={n.status} />
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{n.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
            <div className="text-sm font-semibold">
              Family Treasury (Preview)
            </div>
            <div className="mt-2 text-sm text-zinc-400">
              Each entity has its own wallet. Family is the first collective
              treasury.
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              {wallets.map((w) => (
                <div
                  key={w.title}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{w.title}</div>
                      <div className="text-xs text-zinc-500">{w.tag}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-zinc-200">{w.balance}</div>
                      <div className="mt-1">
                        <StatusBadge status={w.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              Next: locked → human unlock (3 peers) → permissions → shared
              vaults.
            </div>
          </div>
        </Pillar>

        {/* RIGHT: MARKET (Bronze) */}
        <Pillar
          title="Market (Cooperatives & Exchange)"
          subtitle="Work • production • trade • contracts • auctions"
          tone="bronze"
          className="lg:col-span-4"
        >
          <div className="space-y-3">
            {market.map((it) => (
              <PillarItem
                key={it.title}
                title={it.title}
                desc={it.desc}
                href={it.href}
              />
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm font-medium">Bronze Priority</div>
            <div className="mt-2 text-sm text-zinc-400">
              Market exists to feed families and grow clans: cooperatives,
              contracts, resources, and distribution.
            </div>
          </div>
        </Pillar>
      </div>
    </div>
  );
}

function Pillar({
  title,
  subtitle,
  children,
  tone,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone: "gold" | "silver" | "bronze";
  className?: string;
}) {
  const toneStyle =
    tone === "gold"
      ? "border-yellow-600/40"
      : tone === "silver"
      ? "border-zinc-500/50"
      : "border-amber-700/40";

  return (
    <div
      className={["rounded-2xl border bg-zinc-950 p-4", toneStyle, className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="rounded-xl border border-zinc-800 bg-black p-4">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && (
          <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
        )}
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}

function PillarItem({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  const content = (
    <div className="rounded-xl border border-zinc-800 bg-black p-4 hover:bg-zinc-900/40 transition">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-xs text-zinc-500">{desc}</div>
    </div>
  );

  if (href === "#") return <div>{content}</div>;

  return <Link href={href}>{content}</Link>;
}

function StatusBadge({ status }: { status: "Locked" | "Ready" | "Active" }) {
  const cls =
    status === "Active"
      ? "border-emerald-500/40 text-emerald-300"
      : status === "Ready"
      ? "border-sky-500/40 text-sky-300"
      : "border-zinc-700 text-zinc-400";

  return (
    <span className={["text-xs rounded-md border px-2 py-1", cls].join(" ")}>
      {status}
    </span>
  );
}

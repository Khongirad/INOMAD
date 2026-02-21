import Link from "next/link";

export default function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-8">
        <div className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
          Coming Soon
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-4 text-lg text-zinc-300 max-w-2xl leading-relaxed">
          {description}
        </p>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="text-base font-semibold text-white mb-3">
          This feature is under development
        </div>
        <div className="text-sm text-zinc-400">
          Complete your identity registration and family tree while we build this section.
        </div>
      </div>
    </div>
  );
}

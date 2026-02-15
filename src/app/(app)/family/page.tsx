"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  createEmptyFamilyDraft,
  makeMember,
  type CousinDegree,
  type FamilyDraft,
  type FamilySlot,
  type Side,
} from "./_core/types";

import {
  clearFamilyDraft,
  loadFamilyDraft,
  saveFamilyDraft,
} from "./_core/storage";

type Tab = "core" | "khudanar" | "cousins";

const SLOT_LABEL: Record<FamilySlot, string> = {
  father: "Father",
  mother: "Mother",
  paternalGrandfather: "Paternal Grandfather",
  paternalGrandmother: "Paternal Grandmother",
  maternalGrandfather: "Maternal Grandfather",
  maternalGrandmother: "Maternal Grandmother",
};

export default function FamilyPage() {
  const [draft, setDraft] = useState<FamilyDraft | null>(null);
  const [tab, setTab] = useState<Tab>("core");
  const hydrated = useRef(false);

  // hydrate once
  useEffect(() => {
    const saved = loadFamilyDraft();
    setDraft(saved);
    hydrated.current = true;
  }, []);

  // autosave
  useEffect(() => {
    if (!hydrated.current) return;
    if (!draft) return;
    const t = setTimeout(() => saveFamilyDraft(draft), 250);
    return () => clearTimeout(t);
  }, [draft]);

  function handleCreateFamily() {
    setDraft(createEmptyFamilyDraft());
  }

  function handleResetFamily() {
    clearFamilyDraft();
    setDraft(null);
  }

  const title = useMemo(() => {
    if (!draft) return "Family";
    return `Family • ${draft.familyId.slice(0, 12)}…`;
  }, [draft]);

  if (!draft) {
    return (
      <div className="space-y-6">
        <Header
          title="Family"
          subtitle="Family is the center. Up to 7th degree. Above that begins Clan."
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="text-sm font-semibold">No family created yet</div>
          <div className="mt-2 text-sm text-zinc-400 max-w-2xl">
            Create a family registry. Even if parents are unknown, family exists
            as your anchor.
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCreateFamily}
              className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-black hover:bg-white"
            >
              Create Family
            </button>

            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // helpers
  const touch = (next: FamilyDraft) =>
    setDraft({ ...next, updatedAt: Date.now() });

  const setSlotName = (slot: FamilySlot, name: string) => {
    const trimmed = name.trim();
    const next = { ...draft };
    if (!trimmed) {
      const slots = { ...next.slots };
      delete slots[slot];
      next.slots = slots;
      return touch(next);
    }
    next.slots = {
      ...next.slots,
      [slot]: {
        ...(next.slots[slot] ?? makeMember(trimmed)),
        fullName: trimmed,
      },
    };
    return touch(next);
  };

  const addChild = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    touch({ ...draft, children: [...draft.children, makeMember(trimmed)] });
  };

  const addSibling = (kind: "brother" | "sister", name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    touch({
      ...draft,
      siblings: [...draft.siblings, { ...makeMember(trimmed), kind }],
    });
  };

  const addUncleAunt = (
    side: "paternal" | "maternal",
    kind: "uncle" | "aunt",
    name: string
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (side === "paternal") {
      touch({
        ...draft,
        paternalUnclesAunts: [
          ...draft.paternalUnclesAunts,
          { ...makeMember(trimmed), kind },
        ],
      });
    } else {
      touch({
        ...draft,
        maternalUnclesAunts: [
          ...draft.maternalUnclesAunts,
          { ...makeMember(trimmed), kind },
        ],
      });
    }
  };

  const setKhudanarPerson = (slotId: string, fullName: string) => {
    const trimmed = fullName.trim();
    const next = { ...draft };
    next.khudanarSlots = next.khudanarSlots.map((s) => {
      if (s.slotId !== slotId) return s;
      if (!trimmed) return { ...s, personId: undefined };
      return { ...s, personId: trimmed }; // MVP: personId stores name
    });
    touch(next);
  };

  const addCousin = (
    degree: CousinDegree,
    side: Side,
    name: string,
    lineHint?: string
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const now = Date.now();
    touch({
      ...draft,
      cousins: [
        ...draft.cousins,
        {
          id: `c_${now}_${Math.random().toString(16).slice(2)}`,
          degree,
          side,
          lineHint: lineHint?.trim() || undefined,
          person: makeMember(trimmed),
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      <Header
        title={title}
        subtitle="Family registry. Blood relatives up to 7th degree. Beyond that begins Clan."
      />

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap gap-2">
          <TabButton active={tab === "core"} onClick={() => setTab("core")}>
            Core Tree
          </TabButton>
          <TabButton
            active={tab === "khudanar"}
            onClick={() => setTab("khudanar")}
          >
            Khudanar (In-Laws)
          </TabButton>
          <TabButton
            active={tab === "cousins"}
            onClick={() => setTab("cousins")}
          >
            Relatives 2–7
          </TabButton>

          <div className="ml-auto flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleResetFamily}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
            >
              Delete Family (local)
            </button>
          </div>
        </div>
      </div>

      {tab === "core" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Section
            className="lg:col-span-6"
            title="Core slots (parents & grandparents)"
            subtitle="Strict slots. Empty allowed."
          >
            <div className="space-y-3">
              {(Object.keys(SLOT_LABEL) as Array<FamilySlot>).map((slot) => (
                <div
                  key={slot}
                  className="rounded-lg border border-zinc-800 bg-black p-4"
                >
                  <div className="text-sm font-medium">{SLOT_LABEL[slot]}</div>
                  <input
                    className="mt-2 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
                    value={draft.slots[slot]?.fullName ?? ""}
                    onChange={(e) => setSlotName(slot, e.target.value)}
                    placeholder="Full name (MVP)"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            className="lg:col-span-6"
            title="Children, siblings, uncles/aunts"
            subtitle="Add lists. Later will connect by IDs."
          >
            <ListAdder
              title="Children"
              placeholder="Child full name"
              onAdd={(name) => addChild(name)}
              items={draft.children.map((c) => c.fullName)}
            />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListAdder
                title="Brothers"
                placeholder="Brother full name"
                onAdd={(name) => addSibling("brother", name)}
                items={draft.siblings
                  .filter((s) => s.kind === "brother")
                  .map((x) => x.fullName)}
              />
              <ListAdder
                title="Sisters"
                placeholder="Sister full name"
                onAdd={(name) => addSibling("sister", name)}
                items={draft.siblings
                  .filter((s) => s.kind === "sister")
                  .map((x) => x.fullName)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListAdder
                title="Uncles (father side)"
                placeholder="Uncle full name"
                onAdd={(name) => addUncleAunt("paternal", "uncle", name)}
                items={draft.paternalUnclesAunts
                  .filter((x) => x.kind === "uncle")
                  .map((x) => x.fullName)}
              />
              <ListAdder
                title="Aunts (father side)"
                placeholder="Aunt full name"
                onAdd={(name) => addUncleAunt("paternal", "aunt", name)}
                items={draft.paternalUnclesAunts
                  .filter((x) => x.kind === "aunt")
                  .map((x) => x.fullName)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <ListAdder
                title="Uncles (mother side)"
                placeholder="Uncle full name"
                onAdd={(name) => addUncleAunt("maternal", "uncle", name)}
                items={draft.maternalUnclesAunts
                  .filter((x) => x.kind === "uncle")
                  .map((x) => x.fullName)}
              />
              <ListAdder
                title="Aunts (mother side)"
                placeholder="Aunt full name"
                onAdd={(name) => addUncleAunt("maternal", "aunt", name)}
                items={draft.maternalUnclesAunts
                  .filter((x) => x.kind === "aunt")
                  .map((x) => x.fullName)}
              />
            </div>
          </Section>
        </div>
      )}

      {tab === "khudanar" && (
        <Section
          title="Khudanar (In-Laws)"
          subtitle="Alliance connections between families (not blood)."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draft.khudanarSlots.map((s) => (
              <div
                key={s.slotId}
                className="rounded-lg border border-zinc-800 bg-black p-4"
              >
                <div className="text-sm font-medium">{s.label}</div>
                <input
                  className="mt-2 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
                  value={s.personId ?? ""}
                  onChange={(e) => setKhudanarPerson(s.slotId, e.target.value)}
                  placeholder="Name of swat family representative (MVP)"
                />
                <div className="mt-2 text-xs text-zinc-500">
                  MVP stores a name. Later this becomes a linked family/person
                  ID with permissions.
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "cousins" && (
        <Section
          title="Relatives (2–7 degree)"
          subtitle="Registry list: 2nd to 7th cousins. Above 7th becomes Clan."
        >
          <CousinAdder onAdd={addCousin} />
          <div className="mt-4 rounded-xl border border-zinc-800 bg-black p-4">
            <div className="text-sm font-semibold">Current list</div>
            {draft.cousins.length === 0 ? (
              <div className="mt-2 text-sm text-zinc-500">
                No relatives added yet.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {draft.cousins.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">
                        {c.person.fullName}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {c.degree}° • {c.side}
                      </div>
                    </div>
                    {c.lineHint && (
                      <div className="mt-1 text-xs text-zinc-500">
                        {c.lineHint}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      <pre className="mt-6 text-xs text-zinc-500 whitespace-pre-wrap border-t border-zinc-800 pt-4">
        {JSON.stringify(draft, null, 2)}
      </pre>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{title}</div>
      {subtitle && (
        <div className="mt-2 text-sm text-zinc-400 max-w-3xl">{subtitle}</div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-md px-3 py-2 text-sm border",
        active
          ? "bg-zinc-100 text-black border-zinc-200"
          : "bg-black border-zinc-800 text-zinc-300 hover:bg-zinc-900/60",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Section({
  title,
  subtitle,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-xl border border-zinc-800 bg-zinc-950 p-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="text-sm font-semibold">{title}</div>
      {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ListAdder({
  title,
  placeholder,
  onAdd,
  items,
}: {
  title: string;
  placeholder: string;
  onAdd: (name: string) => void;
  items: string[];
}) {
  const [val, setVal] = useState("");

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <div className="text-sm font-medium">{title}</div>

      <div className="mt-2 flex gap-2">
        <input
          className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => {
            onAdd(val);
            setVal("");
          }}
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
        >
          Add
        </button>
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((x, idx) => (
            <div
              key={`${x}_${idx}`}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
            >
              {x}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CousinAdder({
  onAdd,
}: {
  onAdd: (
    degree: CousinDegree,
    side: Side,
    name: string,
    lineHint?: string
  ) => void;
}) {
  const [degree, setDegree] = useState<CousinDegree>(2);
  const [side, setSide] = useState<Side>("unknown");
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <div className="text-sm font-medium">Add relative</div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-zinc-500 mb-2">Degree</div>
          <select
            className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
            value={degree}
            onChange={(e) => setDegree(Number(e.target.value) as CousinDegree)}
          >
            <option value={2}>2nd</option>
            <option value={3}>3rd</option>
            <option value={4}>4th</option>
            <option value={5}>5th</option>
            <option value={6}>6th</option>
            <option value={7}>7th</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-2">Side</div>
          <select
            className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
            value={side}
            onChange={(e) => setSide(e.target.value as Side)}
          >
            <option value="unknown">unknown</option>
            <option value="paternal">paternal</option>
            <option value="maternal">maternal</option>
            <option value="both">both</option>
          </select>
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-2">Name</div>
          <input
            className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>

        <div>
          <div className="text-xs text-zinc-500 mb-2">Line hint (optional)</div>
          <input
            className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder='Example: "through uncle ..."'
          />
        </div>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={() => {
            onAdd(degree, side, name, hint);
            setName("");
            setHint("");
          }}
          className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
        >
          Add
        </button>
      </div>
    </div>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createEmptyDraft } from "./_core/types";
import type { MacroRegion } from "./_core/types";
import { identityReducer } from "./_core/reducer";
import { loadDraft, saveDraft } from "./_core/storage";
import { getEthnicitiesByRegion } from "./_core/ethnicities";

type ParentRef =
  | { mode: "known"; name: string }
  | { mode: "unknown" }
  | { mode: "not_declared" };

export default function IdentityCreatePage() {
  // MVP reducer + MVP draft
  const [draft, dispatch] = useReducer(
    identityReducer,
    undefined,
    createEmptyDraft
  );

  const hydrated = useRef(false);

  // hydrate once
  useEffect(() => {
    const saved = loadDraft();
    if (saved) dispatch({ type: "HYDRATE", draft: saved });
    hydrated.current = true;
  }, []);

  // autosave
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => saveDraft(draft), 250);
    return () => clearTimeout(t);
  }, [draft]);

  // Local-only blocks (not in MVP draft yet)
  const [mother, setMother] = useState<ParentRef>({ mode: "unknown" });
  const [father, setFather] = useState<ParentRef>({ mode: "unknown" });

  const [clanMode, setClanMode] = useState<"join" | "create" | "independent">(
    "independent"
  );
  const [clanName, setClanName] = useState("");

  const step1Done = useMemo(() => {
    return (
      draft.basic.dateOfBirth.trim().length > 0 &&
      draft.basic.placeOfBirth.label.trim().length > 0
    );
  }, [draft.basic.dateOfBirth, draft.basic.placeOfBirth.label]);

  const REGIONS: { code: MacroRegion; label: string }[] = [
    { code: "siberia", label: "Siberia" },
    { code: "caucasus", label: "Caucasus" },
    { code: "volga", label: "Volga" },
    { code: "north", label: "North" },
    { code: "kaliningrad", label: "Kaliningrad" },
    { code: "crimea_special", label: "Crimea (special)" },
    { code: "unknown", label: "Unknown" },
  ];

  const ethnicityOptions = useMemo(() => {
    return getEthnicitiesByRegion(draft.territory.macroRegion);
  }, [draft.territory.macroRegion]);

  const parentsSummary = useMemo(() => {
    const fmt = (p: ParentRef) => {
      if (p.mode === "known") return `Known: ${p.name || "—"}`;
      if (p.mode === "not_declared") return "Not declared";
      return "Unknown";
    };
    return { mother: fmt(mother), father: fmt(father) };
  }, [mother, father]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Personal Identity</h1>
        <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
          Every legal entity and institution begins with a human being. This
          flow creates your base identity inside the INOMAD system.
        </p>
      </div>

      {/* STATUS */}
      <Section
        title="0. Status"
        subtitle="Territory: Russian Federation (base)"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => dispatch({ type: "SET_STATUS", value: "citizen" })}
            className={[
              "rounded-lg border p-4 text-left",
              draft.status === "citizen"
                ? "border-zinc-200 bg-zinc-100 text-black"
                : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50",
            ].join(" ")}
            type="button"
          >
            <div className="text-sm font-medium">Citizen</div>
            <div className="mt-1 text-xs opacity-80">
              You belong to the territory of the Russian Federation and form the
              internal social and legal structure.
            </div>
          </button>

          <button
            onClick={() => dispatch({ type: "SET_STATUS", value: "foreigner" })}
            className={[
              "rounded-lg border p-4 text-left",
              draft.status === "foreigner"
                ? "border-zinc-200 bg-zinc-100 text-black"
                : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50",
            ].join(" ")}
            type="button"
          >
            <div className="text-sm font-medium">Foreigner / Visitor</div>
            <div className="mt-1 text-xs opacity-80">
              You interact as an external participant: visitor, contractor,
              trader or traveler.
            </div>
          </button>
        </div>

        {draft.status === "foreigner" && (
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
            Foreigners will have a simplified entry path (later): temporary
            permissions, limited contracts, and verified access.
          </div>
        )}
      </Section>

      {/* STEP 1 */}
      <Section
        title="1. Basic Attributes"
        subtitle="Human attributes. Minimal and gradual."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Gender">
            <div className="flex gap-2">
              <Chip
                active={draft.basic.gender === "male"}
                onClick={() =>
                  dispatch({ type: "SET_BASIC_GENDER", value: "male" })
                }
                label="Male"
              />
              <Chip
                active={draft.basic.gender === "female"}
                onClick={() =>
                  dispatch({ type: "SET_BASIC_GENDER", value: "female" })
                }
                label="Female"
              />
            </div>
          </Field>

          <Field label="Date of Birth">
            <input
              value={draft.basic.dateOfBirth}
              onChange={(e) =>
                dispatch({ type: "SET_BASIC_DOB", value: e.target.value })
              }
              type="date"
              className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
            />
          </Field>

          <Field label="Place of Birth (mock now)">
            <input
              value={draft.basic.placeOfBirth.label}
              onChange={(e) =>
                dispatch({
                  type: "SET_BIRTHPLACE_LABEL",
                  value: e.target.value,
                })
              }
              placeholder='Example: "Irkutsk Oblast, Russia"'
              className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
            />
            <div className="mt-1 text-xs text-zinc-500">
              Next step: map picker (RF borders, rest of world = external).
            </div>
          </Field>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div
            className={[
              "text-xs",
              step1Done ? "text-emerald-400" : "text-zinc-500",
            ].join(" ")}
          >
            {step1Done
              ? "Step 1 completed"
              : "Complete DOB and birth place to unlock next steps"}
          </div>
        </div>
      </Section>

      {/* TERRITORY & ETHNICITY */}
      <Section
        title="1.5 Territory & Ethnicity"
        subtitle="Territory defines legal base. Ethnicity defines cultural-legal anchoring."
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="MacroRegion">
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map((r) => (
                <Chip
                  key={r.code}
                  active={draft.territory.macroRegion === r.code}
                  onClick={() =>
                    dispatch({
                      type: "SET_TERRITORY_MACROREGION",
                      value: r.code,
                    })
                  }
                  label={r.label}
                />
              ))}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Changing region changes the recommended ethnicity list (MVP).
            </div>
          </Field>

          <Field label="Primary Ethnicity (list)">
            <select
              className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
              value={draft.ethnicity.primary?.code ?? ""}
              onChange={(e) => {
                const code = e.target.value;
                const found = ethnicityOptions.find((x) => x.code === code);
                dispatch({
                  type: "SET_ETHNICITY_PRIMARY",
                  value: found
                    ? { code: found.code, label: found.label }
                    : undefined,
                });
              }}
            >
              <option value="">— select —</option>
              {ethnicityOptions.map((e) => (
                <option key={e.code} value={e.code}>
                  {e.label}
                </option>
              ))}
            </select>

            <div className="mt-3">
              <div className="text-xs text-zinc-500 mb-2">
                Self-declared (if not in list)
              </div>
              <input
                value={draft.ethnicity.selfDeclaredText}
                onChange={(e) =>
                  dispatch({
                    type: "SET_ETHNICITY_SELF_TEXT",
                    value: e.target.value,
                  })
                }
                placeholder='Example: "..."'
                className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
              />
              <div className="mt-2 text-xs text-zinc-500">
                If you select from list → this field clears. If you type here →
                list selection resets.
              </div>
            </div>
          </Field>
        </div>
      </Section>

      {/* PARENTS */}
      <Section
        title="2. Parents"
        subtitle="Parentage defines lineage & inheritance logic. Protected data."
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ParentCard title="Mother" value={mother} onChange={setMother} />
          <ParentCard title="Father" value={father} onChange={setFather} />
        </div>

        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-sm font-medium">Family summary (mock)</div>
          <div className="mt-2 text-sm text-zinc-400 space-y-1">
            <div>
              Mother:{" "}
              <span className="text-zinc-200">{parentsSummary.mother}</span>
            </div>
            <div>
              Father:{" "}
              <span className="text-zinc-200">{parentsSummary.father}</span>
            </div>
            <div className="text-xs text-zinc-500 pt-2">
              Next: children/dependents, guardianship, civil registry (ZAGS).
            </div>
          </div>
        </div>
      </Section>

      {/* CLAN / ROD TREE (mock) */}
      <Section
        title="3. Clan & Rod Tree (mock)"
        subtitle="Rod = lineage. Clan = social structure. Clan is visible; Rod is protected."
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Clan affiliation">
            <div className="flex gap-2 flex-wrap">
              <Chip
                active={clanMode === "independent"}
                onClick={() => setClanMode("independent")}
                label="Independent"
              />
              <Chip
                active={clanMode === "join"}
                onClick={() => setClanMode("join")}
                label="Join clan"
              />
              <Chip
                active={clanMode === "create"}
                onClick={() => setClanMode("create")}
                label="Create clan"
              />
            </div>

            {(clanMode === "join" || clanMode === "create") && (
              <input
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                placeholder={
                  clanMode === "join"
                    ? "Search clan name (mock)"
                    : "New clan name (mock)"
                }
                className="mt-2 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
              />
            )}
          </Field>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-medium">Rod tree preview (mock)</div>
            <div className="mt-2 text-xs text-zinc-500">
              Default view is collapsed; expands on click later.
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <TreeNode label="You" />
              <div className="pl-4 border-l border-zinc-800 space-y-2">
                <TreeNode
                  label={`Father: ${
                    father.mode === "known"
                      ? father.name || "—"
                      : father.mode === "not_declared"
                      ? "Not declared"
                      : "Unknown"
                  }`}
                />
                <TreeNode
                  label={`Mother: ${
                    mother.mode === "known"
                      ? mother.name || "—"
                      : mother.mode === "not_declared"
                      ? "Not declared"
                      : "Unknown"
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* IDENTITY PROTOCOL */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-semibold">Identity Protocol</div>
        <div className="mt-2 text-sm text-zinc-400 space-y-2">
          <div>
            Person → Union (husband & wife) → Family / Home → Rod (up to 7th
            generation) → Clan → Aimag (district) → Ulus (state) →
            Confederation.
          </div>
          <div className="text-xs text-zinc-500">
            Registration MVP records only: yourself, your parents, and place of
            birth (as in RF passport). Lineage expansion and clan structures
            come later.
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-sm font-medium">Summary (draft)</div>

        <div className="mt-2 text-sm text-zinc-400 space-y-1">
          <div>
            Status: <span className="text-zinc-200">{draft.status}</span>
          </div>

          <div>
            Gender:{" "}
            <span className="text-zinc-200">{draft.basic.gender || "—"}</span>
          </div>

          <div>
            Date of birth:{" "}
            <span className="text-zinc-200">
              {draft.basic.dateOfBirth || "—"}
            </span>
          </div>

          <div>
            Place of birth:{" "}
            <span className="text-zinc-200">
              {draft.basic.placeOfBirth.label || "—"}
            </span>
          </div>

          <div>
            MacroRegion:{" "}
            <span className="text-zinc-200">{draft.territory.macroRegion}</span>
          </div>

          <div>
            Ethnicity:{" "}
            <span className="text-zinc-200">
              {draft.ethnicity.primary?.label ||
                (draft.ethnicity.selfDeclaredText.trim()
                  ? draft.ethnicity.selfDeclaredText
                  : "—")}
            </span>
          </div>

          <div>
            Clan:{" "}
            <span className="text-zinc-200">
              {clanMode === "independent"
                ? "Independent"
                : `${clanMode === "join" ? "Join" : "Create"}: ${
                    clanName || "—"
                  }`}
            </span>
          </div>

          <div className="pt-2 text-xs text-zinc-500">
            Next steps later: citizenship radius, verification (3 peers), wallet
            locked → unlock, node.
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            disabled={!step1Done}
            className={[
              "rounded-md px-3 py-2 text-sm",
              step1Done
                ? "bg-zinc-100 text-black hover:bg-white"
                : "bg-zinc-900 text-zinc-500 cursor-not-allowed",
            ].join(" ")}
            type="button"
          >
            Create Identity (mock)
          </button>

          <button
            className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
            type="button"
            onClick={() => saveDraft(draft)}
          >
            Save Draft (now)
          </button>
        </div>
      </div>

      {/* DEBUG */}
      <pre className="mt-6 text-xs text-zinc-500 whitespace-pre-wrap border-t border-zinc-800 pt-4">
        {JSON.stringify(draft, null, 2)}
      </pre>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  locked,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && (
            <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
          )}
        </div>
        {locked && (
          <div className="text-xs rounded-md border border-zinc-800 px-2 py-1 text-zinc-500">
            Locked
          </div>
        )}
      </div>

      <div
        className={
          locked ? "mt-4 opacity-40 pointer-events-none select-none" : "mt-4"
        }
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md px-3 py-2 text-sm border",
        active
          ? "bg-zinc-100 text-black border-zinc-200"
          : "bg-black border-zinc-800 text-zinc-300 hover:bg-zinc-900/60",
      ].join(" ")}
      type="button"
    >
      {label}
    </button>
  );
}

function ParentCard({
  title,
  value,
  onChange,
}: {
  title: string;
  value: ParentRef;
  onChange: (v: ParentRef) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-4">
      <div className="text-sm font-medium">{title}</div>

      <div className="mt-3 flex gap-2 flex-wrap">
        <Chip
          label="Known"
          active={value.mode === "known"}
          onClick={() =>
            onChange({
              mode: "known",
              name: value.mode === "known" ? value.name : "",
            })
          }
        />
        <Chip
          label="Unknown"
          active={value.mode === "unknown"}
          onClick={() => onChange({ mode: "unknown" })}
        />
        <Chip
          label="Not declared"
          active={value.mode === "not_declared"}
          onClick={() => onChange({ mode: "not_declared" })}
        />
      </div>

      {value.mode === "known" && (
        <input
          value={value.name}
          onChange={(e) => onChange({ mode: "known", name: e.target.value })}
          placeholder={`${title} name (mock)`}
          className="mt-3 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm outline-none"
        />
      )}

      <div className="mt-3 text-xs text-zinc-500">
        This data is protected. Later: verification, registry records,
        guardianship.
      </div>
    </div>
  );
}

function TreeNode({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-200">
      {label}
    </div>
  );
}

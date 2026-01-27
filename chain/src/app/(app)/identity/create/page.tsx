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
  const [draft, dispatch] = useReducer(
    identityReducer,
    undefined,
    createEmptyDraft
  );

  const hydrated = useRef(false);

  useEffect(() => {
    const saved = loadDraft();
    if (saved) dispatch({ type: "HYDRATE", draft: saved });
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => saveDraft(draft), 250);
    return () => clearTimeout(t);
  }, [draft]);

  const [mother, setMother] = useState<ParentRef>({ mode: "unknown" });
  const [father, setFather] = useState<ParentRef>({ mode: "unknown" });
  const [clanMode, setClanMode] = useState<"join" | "create" | "independent">(
    "independent"
  );
  const [clanName, setClanName] = useState("");

  // New verifier state
  const [newVerifierName, setNewVerifierName] = useState("");
  const [newVerifierContact, setNewVerifierContact] = useState("");

  const step1Done = useMemo(() => {
    return (
      draft.basic.firstName.trim().length > 0 &&
      draft.basic.lastName.trim().length > 0 &&
      draft.basic.dateOfBirth.trim().length > 0 &&
      draft.basic.placeOfBirth.label.trim().length > 0 &&
      draft.basic.gender.trim().length > 0
    );
  }, [
    draft.basic.firstName,
    draft.basic.lastName,
    draft.basic.dateOfBirth,
    draft.basic.placeOfBirth.label,
    draft.basic.gender,
  ]);

  const step2Done = useMemo(() => {
    return (
      draft.contact.phoneNumber.trim().length > 0 &&
      draft.contact.email.trim().length > 0 &&
      draft.contact.residenceAddress.trim().length > 0
    );
  }, [draft.contact]);

  const step3Done = useMemo(() => {
    return (
      draft.passport.series.trim().length > 0 &&
      draft.passport.number.trim().length > 0 &&
      draft.passport.issuedBy.trim().length > 0
    );
  }, [draft.passport]);

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

  const canSubmit = useMemo(() => {
    return (
      step1Done &&
      step2Done &&
      step3Done &&
      draft.verification.verifiers.length === 3
    );
  }, [step1Done, step2Done, step3Done, draft.verification.verifiers.length]);

  const handleAddVerifier = () => {
    if (!newVerifierName.trim()) return;
    dispatch({
      type: "ADD_VERIFIER",
      verifier: {
        name: newVerifierName,
        contact: newVerifierContact.trim() || undefined,
        verified: false,
      },
    });
    setNewVerifierName("");
    setNewVerifierContact("");
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="glass-panel rounded-2xl p-8">
        <div className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
          Identity Registration
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
          Create Personal Identity
        </h1>
        <p className="mt-4 text-lg text-zinc-300 max-w-2xl leading-relaxed">
          Immigration-style registration. Complete and detailed information
          prevents identity theft and establishes trust through 3-person
          verification.
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
              "rounded-lg border p-5 text-left transition",
              draft.status === "citizen"
                ? "border-gold-border bg-gold-dim text-white shadow-[0_0_15px_-5px_var(--gold-glow)]"
                : "border-zinc-800 bg-black/40 hover:bg-zinc-900/50",
            ].join(" ")}
            type="button"
          >
            <div className="text-base font-semibold">Citizen</div>
            <div className="mt-2 text-sm opacity-80">
              You belong to the territory of the Russian Federation and form the
              internal social and legal structure.
            </div>
          </button>

          <button
            onClick={() => dispatch({ type: "SET_STATUS", value: "foreigner" })}
            className={[
              "rounded-lg border p-5 text-left transition",
              draft.status === "foreigner"
                ? "border-gold-border bg-gold-dim text-white shadow-[0_0_15px_-5px_var(--gold-glow)]"
                : "border-zinc-800 bg-black/40 hover:bg-zinc-900/50",
            ].join(" ")}
            type="button"
          >
            <div className="text-base font-semibold">Foreigner / Visitor</div>
            <div className="mt-2 text-sm opacity-80">
              You interact as an external participant: visitor, contractor,
              trader or traveler.
            </div>
          </button>
        </div>

        {draft.status === "foreigner" && (
          <div className="mt-3 glass-card rounded-lg p-4 text-sm text-zinc-300">
            Foreigners will have a simplified entry path: temporary
            permissions, limited contracts, and verified access.
          </div>
        )}
      </Section>

      {/* STEP 1: FULL NAME & CORE */}
      <Section
        title="1. Full Name & Core Attributes"
        subtitle="Like passport: Last Name, First Name, Patronymic (if applicable)"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Last Name (Фамилия)" required>
            <input
              value={draft.basic.lastName}
              onChange={(e) =>
                dispatch({
                  type: "SET_BASIC_NAME",
                  value: {
                    firstName: draft.basic.firstName,
                    lastName: e.target.value,
                    patronymic: draft.basic.patronymic,
                  },
                })
              }
              placeholder="Ivanov"
              className="input-field"
            />
          </Field>

          <Field label="First Name (Имя)" required>
            <input
              value={draft.basic.firstName}
              onChange={(e) =>
                dispatch({
                  type: "SET_BASIC_NAME",
                  value: {
                    firstName: e.target.value,
                    lastName: draft.basic.lastName,
                    patronymic: draft.basic.patronymic,
                  },
                })
              }
              placeholder="Ivan"
              className="input-field"
            />
          </Field>

          <Field label="Patronymic (Отчество)">
            <input
              value={draft.basic.patronymic || ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_BASIC_NAME",
                  value: {
                    firstName: draft.basic.firstName,
                    lastName: draft.basic.lastName,
                    patronymic: e.target.value,
                  },
                })
              }
              placeholder="Ivanovich (optional)"
              className="input-field"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Gender" required>
            {!draft.basic.gender && (
              <div className="text-xs text-zinc-500 mb-2">Select gender:</div>
            )}
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
            {draft.basic.gender && (
              <div className="mt-2 text-sm text-gold-text font-medium">
                Selected: {draft.basic.gender}
              </div>
            )}
          </Field>

          <Field label="Date of Birth" required>
            <input
              value={draft.basic.dateOfBirth}
              onChange={(e) =>
                dispatch({ type: "SET_BASIC_DOB", value: e.target.value })
              }
              type="date"
              className="input-field"
            />
          </Field>

          <Field label="Place of Birth" required>
            <input
              value={draft.basic.placeOfBirth.label}
              onChange={(e) =>
                dispatch({
                  type: "SET_BIRTHPLACE_LABEL",
                  value: e.target.value,
                })
              }
              placeholder="Irkutsk Oblast, Russia"
              className="input-field"
            />
          </Field>
        </div>

        <StepIndicator done={step1Done} message="Complete all required fields to unlock next steps" />
      </Section>

      {/* STEP 2: CONTACT & RESIDENCE */}
      <Section
        title="2. Contact Information & Residence"
        subtitle="Current contact details and permanent residence address"
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone Number" required>
            <input
              value={draft.contact.phoneNumber}
              onChange={(e) =>
                dispatch({ type: "SET_CONTACT_PHONE", value: e.target.value })
              }
              placeholder="+7 (XXX) XXX-XX-XX"
              className="input-field"
            />
          </Field>

          <Field label="Email Address" required>
            <input
              value={draft.contact.email}
              onChange={(e) =>
                dispatch({ type: "SET_CONTACT_EMAIL", value: e.target.value })
              }
              type="email"
              placeholder="your.email@example.com"
              className="input-field"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Current Residence Address" required>
            <textarea
              value={draft.contact.residenceAddress}
              onChange={(e) =>
                dispatch({ type: "SET_CONTACT_ADDRESS", value: e.target.value })
              }
              placeholder="Full address: street, building, apartment, city, region, postal code"
              className="input-field min-h-[100px]"
              rows={3}
            />
          </Field>
        </div>

        <StepIndicator done={step2Done} message="Contact information required" />
      </Section>

      {/* STEP 3: PASSPORT DETAILS */}
      <Section
        title="3. Passport Details"
        subtitle="Official identification document information"
        locked={!step1Done || !step2Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Passport Series" required>
            <input
              value={draft.passport.series}
              onChange={(e) =>
                dispatch({ type: "SET_PASSPORT_SERIES", value: e.target.value })
              }
              placeholder="XX XX"
              className="input-field"
            />
          </Field>

          <Field label="Passport Number" required>
            <input
              value={draft.passport.number}
              onChange={(e) =>
                dispatch({ type: "SET_PASSPORT_NUMBER", value: e.target.value })
              }
              placeholder="XXXXXX"
              className="input-field"
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Issued By" required>
            <input
              value={draft.passport.issuedBy}
              onChange={(e) =>
                dispatch({
                  type: "SET_PASSPORT_ISSUED_BY",
                  value: e.target.value,
                })
              }
              placeholder="Organization name and code"
              className="input-field"
            />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Issue Date">
            <input
              value={draft.passport.issuedDate}
              onChange={(e) =>
                dispatch({
                  type: "SET_PASSPORT_ISSUED_DATE",
                  value: e.target.value,
                })
              }
              type="date"
              className="input-field"
            />
          </Field>

          <Field label="Expiration Date">
            <input
              value={draft.passport.expirationDate}
              onChange={(e) =>
                dispatch({
                  type: "SET_PASSPORT_EXPIRATION_DATE",
                  value: e.target.value,
                })
              }
              type="date"
              className="input-field"
            />
          </Field>
        </div>

        <StepIndicator done={step3Done} message="Passport series, number, and issuer required" />
      </Section>

      {/* TERRITORY & ETHNICITY */}
      <Section
        title="4. Territory & Ethnicity"
        subtitle="Territory defines legal base. Ethnicity defines cultural-legal anchoring."
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </Field>

          <Field label="Primary Ethnicity">
            <select
              className="input-field"
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
                placeholder="Enter if not in list"
                className="input-field"
              />
            </div>
          </Field>
        </div>
      </Section>

      {/* PARENTS */}
      <Section
        title="5. Parents"
        subtitle="Parentage defines lineage & inheritance logic. Protected data."
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ParentCard title="Mother" value={mother} onChange={setMother} />
          <ParentCard title="Father" value={father} onChange={setFather} />
        </div>

        <div className="mt-4 glass-card rounded-lg p-4">
          <div className="text-sm font-medium text-white">Family summary</div>
          <div className="mt-2 text-sm text-zinc-400 space-y-1">
            <div>
              Mother: <span className="text-zinc-200">{parentsSummary.mother}</span>
            </div>
            <div>
              Father: <span className="text-zinc-200">{parentsSummary.father}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* CLAN / ROD */}
      <Section
        title="6. Clan & Rod Tree"
        subtitle="Rod = lineage. Clan = social structure."
        locked={!step1Done}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="mt-2 input-field"
              />
            )}
          </Field>

          <div className="glass-card rounded-lg p-4">
            <div className="text-sm font-medium text-white">Rod tree preview</div>
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

      {/* VERIFICATION SYSTEM */}
      <Section
        title="7. Three-Person Verification"
        subtitle="3 people must verify your identity to prevent theft and establish trust network"
        locked={!step1Done || !step2Done || !step3Done}
      >
        <div className="glass-card rounded-lg p-5 bg-gradient-to-br from-gold-dim/20 to-transparent border border-gold-border/20">
          <div className="text-base font-semibold text-white mb-2">
            Why 3 Verifiers?
          </div>
          <div className="text-sm text-zinc-300 space-y-2">
            <div>
              • Prevents identity theft through social proof
            </div>
            <div>
              • Creates traceable network (who verified whom)
            </div>
            <div>
              • Establishes trust relationships in the system
            </div>
          </div>
        </div>

        <div className="mt-4 glass-card rounded-lg p-5">
          <div className="text-sm font-medium text-white mb-3">
            Add Verifiers ({draft.verification.verifiers.length}/3)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Verifier Name">
              <input
                value={newVerifierName}
                onChange={(e) => setNewVerifierName(e.target.value)}
                placeholder="Full name"
                className="input-field"
              />
            </Field>

            <Field label="Contact (optional)">
              <input
                value={newVerifierContact}
                onChange={(e) => setNewVerifierContact(e.target.value)}
                placeholder="Phone or email"
                className="input-field"
              />
            </Field>
          </div>

          <button
            type="button"
            onClick={handleAddVerifier}
            disabled={
              !newVerifierName.trim() ||
              draft.verification.verifiers.length >= 3
            }
            className="mt-3 rounded-lg border border-gold-border bg-gold-dim px-4 py-2 text-sm font-medium text-gold-text hover:bg-gold-border/30 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Verifier
          </button>

          {draft.verification.verifiers.length > 0 && (
            <div className="mt-4 space-y-2">
              {draft.verification.verifiers.map((v, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black/40 p-3"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-200">
                      {v.name}
                    </div>
                    {v.contact && (
                      <div className="text-xs text-zinc-500">{v.contact}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "REMOVE_VERIFIER", index: idx })
                    }
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <StepIndicator
          done={draft.verification.verifiers.length === 3}
          message="You must add exactly 3 verifiers"
        />
      </Section>

      {/* SUBMIT */}
      <div className="glass-panel rounded-xl p-6">
        <div className="text-base font-semibold text-white">Submit Identity</div>
        <div className="mt-2 text-sm text-zinc-400">
          Once submitted, your identity will enter verification status. After 3
          verifiers confirm, it becomes active.
        </div>

        <div className="mt-4 flex gap-3">
          <button
            disabled={!canSubmit}
            className={[
              "rounded-lg px-6 py-3 text-sm font-medium transition",
              canSubmit
                ? "bg-gold-border text-black hover:bg-gold-text shadow-[0_0_20px_-5px_var(--gold-glow)]"
                : "bg-zinc-900 text-zinc-500 cursor-not-allowed",
            ].join(" ")}
            type="button"
            onClick={() => {
              saveDraft(draft);
              alert("Identity submitted for verification! (MVP mock)");
            }}
          >
            Submit for Verification
          </button>

          <button
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
            type="button"
            onClick={() => saveDraft(draft)}
          >
            Save Draft
          </button>
        </div>

        {!canSubmit && (
          <div className="mt-3 text-xs text-zinc-500">
            Complete all required steps and add 3 verifiers to submit
          </div>
        )}
      </div>
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
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-white">{title}</div>
          {subtitle && (
            <div className="mt-1 text-sm text-zinc-500">{subtitle}</div>
          )}
        </div>
        {locked && (
          <div className="text-xs rounded-md border border-zinc-800 px-3 py-1 text-zinc-500 bg-black/40">
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

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <div className="text-sm text-zinc-400 mb-2">
        {label} {required && <span className="text-gold-text">*</span>}
      </div>
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
        "rounded-lg px-4 py-2 text-sm border transition",
        active
          ? "bg-gold-dim text-gold-text border-gold-border shadow-[0_0_10px_-4px_var(--gold-glow)]"
          : "bg-black/40 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60",
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
    <div className="glass-card rounded-lg p-5">
      <div className="text-sm font-medium text-white">{title}</div>

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
          placeholder={`${title} full name`}
          className="mt-3 input-field"
        />
      )}

      <div className="mt-3 text-xs text-zinc-500">
        This data is protected. Verification and registry records later.
      </div>
    </div>
  );
}

function TreeNode({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-200">
      {label}
    </div>
  );
}

function StepIndicator({ done, message }: { done: boolean; message: string }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div
        className={[
          "text-xs font-medium",
          done ? "text-emerald-400" : "text-zinc-500",
        ].join(" ")}
      >
        {done ? "✓ Step completed" : message}
      </div>
    </div>
  );
}

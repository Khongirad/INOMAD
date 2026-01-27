// src/app/(app)/identity/create/_core/storage.ts

import type { IdentityDraft, IdentityStatus, MacroRegion } from "./types";
import { createEmptyDraft } from "./types";

const KEY = "inomad.identityDraft.v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function isIdentityStatus(v: unknown): v is IdentityStatus {
  return v === "citizen" || v === "foreigner";
}

function isMacroRegion(v: unknown): v is MacroRegion {
  return (
    v === "siberia" ||
    v === "caucasus" ||
    v === "volga" ||
    v === "north" ||
    v === "kaliningrad" ||
    v === "crimea_special" ||
    v === "unknown"
  );
}

// миграция: unknown -> IdentityDraft (MVP)
function migrateDraft(input: unknown): IdentityDraft {
  const base = createEmptyDraft();

  if (!isRecord(input)) return base;

  // status
  const statusRaw = input["status"];
  const status: IdentityStatus = isIdentityStatus(statusRaw)
    ? statusRaw
    : base.status;

  // basic
  const basicRaw = input["basic"];
  const basic = isRecord(basicRaw) ? basicRaw : {};

  const firstName = asString(basic["firstName"], base.basic.firstName);
  const lastName = asString(basic["lastName"], base.basic.lastName);
  const patronymic = asString(basic["patronymic"], base.basic.patronymic ?? "");

  const genderRaw = basic["gender"];
  const gender =
    genderRaw === "male" ||
    genderRaw === "female" ||
    genderRaw === "other" ||
    genderRaw === ""
      ? genderRaw
      : base.basic.gender;

  const dateOfBirth = asString(basic["dateOfBirth"], base.basic.dateOfBirth);

  const pobRaw = basic["placeOfBirth"];
  const pob = isRecord(pobRaw) ? pobRaw : {};
  const placeOfBirthLabel = asString(
    pob["label"],
    base.basic.placeOfBirth.label
  );

  // territory
  const territoryRaw = input["territory"];
  const territory = isRecord(territoryRaw) ? territoryRaw : {};
  const macroRegionRaw = territory["macroRegion"];
  const macroRegion: MacroRegion = isMacroRegion(macroRegionRaw)
    ? macroRegionRaw
    : base.territory.macroRegion;

  // ethnicity
  const ethnicityRaw = input["ethnicity"];
  const ethnicity = isRecord(ethnicityRaw) ? ethnicityRaw : {};

  const primaryRaw = ethnicity["primary"];
  let primary: IdentityDraft["ethnicity"]["primary"] = undefined;

  if (isRecord(primaryRaw)) {
    const code = asString(primaryRaw["code"], "");
    const label = asString(primaryRaw["label"], "");
    if (code && label) primary = { code, label };
  }

  const selfDeclaredText = asString(
    ethnicity["selfDeclaredText"],
    base.ethnicity.selfDeclaredText
  );

  // updatedAt (если был ISO string в meta.updatedAt — тоже конвертируем)
  const updatedAtNumber = asNumber(input["updatedAt"], 0);

  let updatedAt = updatedAtNumber;
  if (!updatedAt) {
    const metaRaw = input["meta"];
    if (isRecord(metaRaw)) {
      const metaUpdatedAt = metaRaw["updatedAt"];
      if (typeof metaUpdatedAt === "string") {
        const t = Date.parse(metaUpdatedAt);
        if (!Number.isNaN(t)) updatedAt = t;
      }
    }
  }
  if (!updatedAt) updatedAt = Date.now();

  // contact (new fields)
  const contactRaw = input["contact"];
  const contact = isRecord(contactRaw) ? contactRaw : {};
  const phoneNumber = asString(contact["phoneNumber"], base.contact.phoneNumber);
  const email = asString(contact["email"], base.contact.email);
  const residenceAddress = asString(contact["residenceAddress"], base.contact.residenceAddress);

  // passport (new fields)
  const passportRaw = input["passport"];
  const passport = isRecord(passportRaw) ? passportRaw : {};
  const passportSeries = asString(passport["series"], base.passport.series);
  const passportNumber = asString(passport["number"], base.passport.number);
  const issuedBy = asString(passport["issuedBy"], base.passport.issuedBy);
  const issuedDate = asString(passport["issuedDate"], base.passport.issuedDate);
  const expirationDate = asString(passport["expirationDate"], base.passport.expirationDate);

  // verification (new fields)
  const verificationRaw = input["verification"];
  const verification = isRecord(verificationRaw) ? verificationRaw : {};
  const verifiers = Array.isArray(verification["verifiers"]) ? verification["verifiers"] : [];

  return {
    status,
    basic: {
      firstName,
      lastName,
      patronymic,
      gender,
      dateOfBirth,
      placeOfBirth: { label: placeOfBirthLabel },
    },
    contact: {
      phoneNumber,
      email,
      residenceAddress,
    },
    passport: {
      series: passportSeries,
      number: passportNumber,
      issuedBy,
      issuedDate,
      expirationDate,
    },
    territory: { macroRegion },
    ethnicity: { primary, selfDeclaredText },
    verification: {
      status: base.verification.status,
      verifiers: verifiers.map((v: any) => ({
        name: asString(v?.name, ""),
        contact: asString(v?.contact, undefined),
        verified: Boolean(v?.verified),
        verifiedAt: v?.verifiedAt ? asNumber(v.verifiedAt, 0) : undefined,
      })),
    },
    updatedAt,
  };
}

export function loadDraft(): IdentityDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return migrateDraft(parsed);
  } catch {
    return null;
  }
}

export function saveDraft(draft: IdentityDraft): void {
  if (typeof window === "undefined") return;

  try {
    // сохраняем уже “чистый” MVP-формат
    const normalized = migrateDraft(draft);
    window.localStorage.setItem(KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

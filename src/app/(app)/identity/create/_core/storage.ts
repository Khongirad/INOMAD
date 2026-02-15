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
    v === "moscow" ||
    v === "spb" ||
    v === "golden_ring" ||
    v === "unknown"
  );
}

// migration: unknown -> IdentityDraft (MVP)
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
  const placeOfBirthRegionId = asString(pob["regionId"], "");
  const placeOfBirthSubRegionId = asString(pob["subRegionId"], "");
  const coordsRaw = pob["coordinates"];
  const placeOfBirthCoordinates = isRecord(coordsRaw)
    ? {
        lat: asNumber(coordsRaw["lat"], 0),
        lng: asNumber(coordsRaw["lng"], 0),
      }
    : undefined;

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

  // updatedAt (if ISO string in meta.updatedAt — also convert)
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

  // nationality (new field)
  const nationalityRaw = input["nationality"];
  let nationality: IdentityDraft["nationality"] = null;
  if (isRecord(nationalityRaw)) {
    const code = asString(nationalityRaw["code"], "");
    const label = asString(nationalityRaw["label"], "");
    if (code && label) {
      nationality = {
        code,
        label,
        nativeName: asString(nationalityRaw["nativeName"], undefined),
        isIndigenous: Boolean(nationalityRaw["isIndigenous"]),
        residenceStatus: nationalityRaw["residenceStatus"] as IdentityDraft["nationality"] extends null ? never : NonNullable<IdentityDraft["nationality"]>["residenceStatus"],
      };
    }
  }

  return {
    status,
    basic: {
      firstName,
      lastName,
      patronymic,
      gender,
      dateOfBirth,
      placeOfBirth: {
        label: placeOfBirthLabel,
        regionId: placeOfBirthRegionId || undefined,
        subRegionId: placeOfBirthSubRegionId || undefined,
        coordinates: placeOfBirthCoordinates,
      },
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
    nationality,
    ethnicity: { primary, selfDeclaredText },
    verification: {
      status: base.verification.status,
      verifiers: verifiers.map((v: unknown) => {
        const vRec = isRecord(v) ? v : {};
        return {
          name: asString(vRec["name"], ""),
          contact: asString(vRec["contact"], undefined),
          verified: Boolean(vRec["verified"]),
          verifiedAt: vRec["verifiedAt"] ? asNumber(vRec["verifiedAt"], 0) : undefined,
        };
      }),
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
    // save already clean MVP format
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

export type Sex = "male" | "female" | "other" | "unknown";

export type FamilySlot =
  | "father"
  | "mother"
  | "paternalGrandfather"
  | "paternalGrandmother"
  | "maternalGrandfather"
  | "maternalGrandmother";

export type SiblingKind = "brother" | "sister" | "sibling_unknown";
export type UncleAuntKind = "uncle" | "aunt" | "relative_unknown";

export type Side = "paternal" | "maternal" | "both" | "unknown";
export type CousinDegree = 2 | 3 | 4 | 5 | 6 | 7;

export type PersonRef = {
  id: string;
  fullName: string; // MVP: single string
  sex?: Sex;
  birthYear?: number; // MVP: year
};

export type FamilyMember = PersonRef & {
  note?: string;
};

/**
 * Khudanar — in-laws (family-alliance ties, not blood)
 */
export type KhudanarSlot = {
  slotId: string;
  label: string;
  personId?: string;
};

export type CousinRef = {
  id: string;
  person: FamilyMember;
  degree: CousinDegree; // 2..7
  side: Side;
  lineHint?: string; // "through uncle/aunt ...", as text
};

export type FamilyDraft = {
  familyId: string;
  createdAt: number;
  updatedAt: number;

  // blood core (slots)
  slots: Partial<Record<FamilySlot, FamilyMember>>;

  // horizontal
  spouse?: FamilyMember;
  children: FamilyMember[];
  siblings: Array<FamilyMember & { kind: SiblingKind }>;

  // lateral branches
  paternalUnclesAunts: Array<FamilyMember & { kind: UncleAuntKind }>;
  maternalUnclesAunts: Array<FamilyMember & { kind: UncleAuntKind }>;

  // KHUDANAR (in-laws)
  khudanarSlots: KhudanarSlot[];

  // 2-7 generations (as list)
  cousins: CousinRef[];
};

export function createEmptyFamilyDraft(): FamilyDraft {
  const now = Date.now();
  const id = `fam_${now}_${Math.random().toString(16).slice(2)}`;

  return {
    familyId: id,
    createdAt: now,
    updatedAt: now,
    slots: {},
    spouse: undefined,
    children: [],
    siblings: [],
    paternalUnclesAunts: [],
    maternalUnclesAunts: [],
    khudanarSlots: [
      { slotId: "wife_side", label: "Khudanar (in-laws from wife side)" },
      { slotId: "husband_side", label: "Khudanar (in-laws from husband side)" },
    ],
    cousins: [],
  };
}

export function makeMember(fullName: string): FamilyMember {
  const now = Date.now();
  return {
    id: `p_${now}_${Math.random().toString(16).slice(2)}`,
    fullName: fullName.trim(),
  };
}

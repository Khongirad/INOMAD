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
  fullName: string; // MVP: одной строкой
  sex?: Sex;
  birthYear?: number; // MVP: год
};

export type FamilyMember = PersonRef & {
  note?: string;
};

/**
 * Худанар — сваты (семейно-союзные связи, не кровные)
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
  lineHint?: string; // "через дядю/тетю ...", текстом
};

export type FamilyDraft = {
  familyId: string;
  createdAt: number;
  updatedAt: number;

  // кровное ядро (слоты)
  slots: Partial<Record<FamilySlot, FamilyMember>>;

  // горизонталь
  spouse?: FamilyMember;
  children: FamilyMember[];
  siblings: Array<FamilyMember & { kind: SiblingKind }>;

  // боковые ветви
  paternalUnclesAunts: Array<FamilyMember & { kind: UncleAuntKind }>;
  maternalUnclesAunts: Array<FamilyMember & { kind: UncleAuntKind }>;

  // ХУДАНАР (сваты)
  khudanarSlots: KhudanarSlot[];

  // 2–7 колено (как list)
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
      { slotId: "wife_side", label: "Худанар (сваты со parties жены)" },
      { slotId: "husband_side", label: "Худанар (сваты со parties мужа)" },
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

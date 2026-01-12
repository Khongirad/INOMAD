// src/app/(app)/identity/create/_core/types.ts

export type IdentityStatus = "citizen" | "foreigner";
export type Gender = "male" | "female" | "other";
export type ParentStatus = "known" | "unknown" | "not_declared";

export type MacroRegion =
  | "siberia"
  | "caucasus"
  | "volga"
  | "north"
  | "kaliningrad"
  | "crimea_special"
  | "unknown";

export type EthnicityRecord = {
  code: string;
  label: string;
  regionHint?: MacroRegion;
  isIndigenous?: boolean;
};

export interface IdentityDraft {
  status: IdentityStatus;

  basic: {
    firstName: string;
    lastName: string;
    patronymic?: string;
    gender: Gender | "";
    dateOfBirth: string;
    placeOfBirth: {
      label: string; // MVP: текст как в паспорте
    };
  };

  territory: {
    macroRegion: MacroRegion;
  };

  ethnicity: {
    primary?: {
      code: string;
      label: string;
    };
    selfDeclaredText: string;
  };

  // единый технический timestamp (для reducer/storage)
  updatedAt: number;
}

export const createEmptyDraft = (): IdentityDraft => {
  return {
    status: "citizen",

    basic: {
      firstName: "",
      lastName: "",
      patronymic: "",
      gender: "",
      dateOfBirth: "",
      placeOfBirth: { label: "" },
    },

    territory: { macroRegion: "unknown" },

    ethnicity: {
      primary: undefined,
      selfDeclaredText: "",
    },

    updatedAt: Date.now(),
  };
};

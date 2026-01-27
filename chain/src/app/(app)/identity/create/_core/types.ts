// src/app/(app)/identity/create/_core/types.ts

export type IdentityStatus = "citizen" | "foreigner";
export type Gender = "male" | "female" | "other";
export type ParentStatus = "known" | "unknown" | "not_declared";
export type VerificationStatus = "pending" | "partial" | "verified";

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

export type Verifier = {
  name: string;
  contact?: string;
  verified: boolean;
  verifiedAt?: number;
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

  // Contact information
  contact: {
    phoneNumber: string;
    email: string;
    residenceAddress: string;
  };

  // Passport details
  passport: {
    series: string;
    number: string;
    issuedBy: string;
    issuedDate: string;
    expirationDate: string;
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

  // Verification system
  verification: {
    status: VerificationStatus;
    verifiers: Verifier[];
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

    contact: {
      phoneNumber: "",
      email: "",
      residenceAddress: "",
    },

    passport: {
      series: "",
      number: "",
      issuedBy: "",
      issuedDate: "",
      expirationDate: "",
    },

    territory: { macroRegion: "unknown" },

    ethnicity: {
      primary: undefined,
      selfDeclaredText: "",
    },

    verification: {
      status: "pending",
      verifiers: [],
    },

    updatedAt: Date.now(),
  };
};

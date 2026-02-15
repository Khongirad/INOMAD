// src/app/(app)/identity/create/_core/reducer.ts

import type {
  IdentityDraft,
  IdentityStatus,
  Gender,
  MacroRegion,
  Verifier,
  BirthplaceGeo,
  NationalIdentity,
} from "./types";

export type IdentityAction =
  | { type: "HYDRATE"; draft: IdentityDraft }
  | { type: "RESET"; draft: IdentityDraft }
  | { type: "SET_STATUS"; value: IdentityStatus }
  | {
      type: "SET_BASIC_NAME";
      value: { firstName: string; lastName: string; patronymic?: string };
    }
  | { type: "SET_BASIC_GENDER"; value: Gender | "" }
  | { type: "SET_BASIC_DOB"; value: string }
  | { type: "SET_BIRTHPLACE_LABEL"; value: string }
  | { type: "SET_BIRTHPLACE_GEO"; value: BirthplaceGeo }
  | { type: "SET_CONTACT_PHONE"; value: string }
  | { type: "SET_CONTACT_EMAIL"; value: string }
  | { type: "SET_CONTACT_ADDRESS"; value: string }
  | { type: "SET_PASSPORT_SERIES"; value: string }
  | { type: "SET_PASSPORT_NUMBER"; value: string }
  | { type: "SET_PASSPORT_ISSUED_BY"; value: string }
  | { type: "SET_PASSPORT_ISSUED_DATE"; value: string }
  | { type: "SET_PASSPORT_EXPIRATION_DATE"; value: string }
  | { type: "SET_TERRITORY_MACROREGION"; value: MacroRegion }
  | { type: "SET_NATIONALITY"; value: NationalIdentity | null }
  | { type: "SET_ETHNICITY_PRIMARY"; value?: { code: string; label: string } }
  | { type: "SET_ETHNICITY_SELF_TEXT"; value: string }
  | { type: "ADD_VERIFIER"; verifier: Verifier }
  | { type: "REMOVE_VERIFIER"; index: number };

function touch(draft: IdentityDraft): IdentityDraft {
  return { ...draft, updatedAt: Date.now() };
}

export function identityReducer(
  state: IdentityDraft,
  action: IdentityAction
): IdentityDraft {
  switch (action.type) {
    case "HYDRATE":
      return action.draft;

    case "RESET":
      return action.draft;

    case "SET_STATUS":
      return touch({ ...state, status: action.value });

    case "SET_BASIC_NAME":
      return touch({
        ...state,
        basic: {
          ...state.basic,
          firstName: action.value.firstName,
          lastName: action.value.lastName,
          patronymic: action.value.patronymic ?? "",
        },
      });

    case "SET_BASIC_GENDER":
      return touch({
        ...state,
        basic: { ...state.basic, gender: action.value },
      });

    case "SET_BASIC_DOB":
      return touch({
        ...state,
        basic: { ...state.basic, dateOfBirth: action.value },
      });

    case "SET_BIRTHPLACE_LABEL":
      return touch({
        ...state,
        basic: {
          ...state.basic,
          placeOfBirth: { ...state.basic.placeOfBirth, label: action.value },
        },
      });

    case "SET_BIRTHPLACE_GEO":
      return touch({
        ...state,
        basic: {
          ...state.basic,
          placeOfBirth: action.value,
        },
        // Автоматически обновляем макроregion на основе regionId
        territory: action.value.regionId
          ? { macroRegion: action.value.regionId as MacroRegion }
          : state.territory,
      });

    case "SET_TERRITORY_MACROREGION":
      return touch({
        ...state,
        territory: { ...state.territory, macroRegion: action.value },
      });

    case "SET_NATIONALITY":
      return touch({
        ...state,
        nationality: action.value,
        // Синхронизируем с legacy ethnicity genderем
        ethnicity: action.value
          ? {
              primary: { code: action.value.code, label: action.value.label },
              selfDeclaredText: "",
            }
          : state.ethnicity,
      });

    case "SET_ETHNICITY_PRIMARY":
      return touch({
        ...state,
        ethnicity: {
          ...state.ethnicity,
          primary: action.value,
          // if выбрали из спclaimа — selfDeclared очищаем
          selfDeclaredText: action.value
            ? ""
            : state.ethnicity.selfDeclaredText,
        },
      });

    case "SET_ETHNICITY_SELF_TEXT": {
      const text = action.value;
      return touch({
        ...state,
        ethnicity: {
          ...state.ethnicity,
          selfDeclaredText: text,
          // if ввели текст — primary сбрасываем
          primary: text.trim().length > 0 ? undefined : state.ethnicity.primary,
        },
      });
    }

    case "SET_CONTACT_PHONE":
      return touch({
        ...state,
        contact: { ...state.contact, phoneNumber: action.value },
      });

    case "SET_CONTACT_EMAIL":
      return touch({
        ...state,
        contact: { ...state.contact, email: action.value },
      });

    case "SET_CONTACT_ADDRESS":
      return touch({
        ...state,
        contact: { ...state.contact, residenceAddress: action.value },
      });

    case "SET_PASSPORT_SERIES":
      return touch({
        ...state,
        passport: { ...state.passport, series: action.value },
      });

    case "SET_PASSPORT_NUMBER":
      return touch({
        ...state,
        passport: { ...state.passport, number: action.value },
      });

    case "SET_PASSPORT_ISSUED_BY":
      return touch({
        ...state,
        passport: { ...state.passport, issuedBy: action.value },
      });

    case "SET_PASSPORT_ISSUED_DATE":
      return touch({
        ...state,
        passport: { ...state.passport, issuedDate: action.value },
      });

    case "SET_PASSPORT_EXPIRATION_DATE":
      return touch({
        ...state,
        passport: { ...state.passport, expirationDate: action.value },
      });

    case "ADD_VERIFIER":
      return touch({
        ...state,
        verification: {
          ...state.verification,
          verifiers: [...state.verification.verifiers, action.verifier],
        },
      });

    case "REMOVE_VERIFIER":
      return touch({
        ...state,
        verification: {
          ...state.verification,
          verifiers: state.verification.verifiers.filter(
            (_, i) => i !== action.index
          ),
        },
      });

    default:
      return state;
  }
}

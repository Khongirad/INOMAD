// src/app/(app)/identity/create/_core/reducer.ts

import type {
  IdentityDraft,
  IdentityStatus,
  Gender,
  MacroRegion,
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
  | { type: "SET_TERRITORY_MACROREGION"; value: MacroRegion }
  | { type: "SET_ETHNICITY_PRIMARY"; value?: { code: string; label: string } }
  | { type: "SET_ETHNICITY_SELF_TEXT"; value: string };

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

    case "SET_TERRITORY_MACROREGION":
      return touch({
        ...state,
        territory: { ...state.territory, macroRegion: action.value },
      });

    case "SET_ETHNICITY_PRIMARY":
      return touch({
        ...state,
        ethnicity: {
          ...state.ethnicity,
          primary: action.value,
          // если выбрали из списка — selfDeclared очищаем
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
          // если ввели текст — primary сбрасываем
          primary: text.trim().length > 0 ? undefined : state.ethnicity.primary,
        },
      });
    }

    default:
      return state;
  }
}

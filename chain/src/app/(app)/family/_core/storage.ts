import type { FamilyDraft } from "./types";

const KEY = "inomad.family.v1";

export function loadFamilyDraft(): FamilyDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FamilyDraft;
  } catch {
    return null;
  }
}

export function saveFamilyDraft(draft: FamilyDraft): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearFamilyDraft(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

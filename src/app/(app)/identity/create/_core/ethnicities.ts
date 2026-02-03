import type { EthnicityRecord, MacroRegion } from "./types";

export const ETHNICITIES: EthnicityRecord[] = [
  // Common
  { code: "rus", label: "Русские", regionHint: "unknown" },
  { code: "tat", label: "Татары", regionHint: "unknown", isIndigenous: true },
  { code: "ukr", label: "Украинцы", regionHint: "unknown" },
  { code: "arm", label: "Армяне", regionHint: "unknown" },
  { code: "aze", label: "Азербайджанцы", regionHint: "unknown" },
  { code: "bel", label: "Белорусы", regionHint: "unknown" },
  { code: "uzb", label: "Узбеки", regionHint: "unknown" },
  { code: "taj", label: "Таджики", regionHint: "unknown" },
  { code: "kaz", label: "Казахи", regionHint: "unknown", isIndigenous: true },
  { code: "kor", label: "Корейцы", regionHint: "unknown" },
  { code: "chu", label: "Чуваши", regionHint: "unknown", isIndigenous: true },
  { code: "bash", label: "Башкиры", regionHint: "unknown", isIndigenous: true },

  // Siberia
  { code: "bur", label: "Буряад-Монгол", regionHint: "siberia", isIndigenous: true },
  { code: "tuv", label: "Тувинцы", regionHint: "siberia", isIndigenous: true },
  { code: "alt", label: "Алтайцы", regionHint: "siberia", isIndigenous: true },
  { code: "khk", label: "Хакасы", regionHint: "siberia", isIndigenous: true },
  {
    code: "sah",
    label: "Саха (якуты)",
    regionHint: "siberia",
    isIndigenous: true,
  },
  { code: "nen", label: "Ненцы", regionHint: "siberia", isIndigenous: true },
  { code: "kha", label: "Ханты", regionHint: "siberia", isIndigenous: true },
  { code: "man", label: "Манси", regionHint: "siberia", isIndigenous: true },
  { code: "eve", label: "Эвенки", regionHint: "siberia", isIndigenous: true },

  // Caucasus
  { code: "che", label: "Чеченцы", regionHint: "caucasus", isIndigenous: true },
  { code: "ava", label: "Аварцы", regionHint: "caucasus", isIndigenous: true },
  {
    code: "dar",
    label: "Даргинцы",
    regionHint: "caucasus",
    isIndigenous: true,
  },
  { code: "lez", label: "Лезгины", regionHint: "caucasus", isIndigenous: true },
  {
    code: "kab",
    label: "Кабардинцы",
    regionHint: "caucasus",
    isIndigenous: true,
  },
  { code: "os", label: "Осетины", regionHint: "caucasus", isIndigenous: true },

  // Volga
  {
    code: "mrd",
    label: "Мордва (эрзя/мокша)",
    regionHint: "volga",
    isIndigenous: true,
  },
  { code: "mar", label: "Марийцы", regionHint: "volga", isIndigenous: true },
  { code: "udm", label: "Удмурты", regionHint: "volga", isIndigenous: true },

  // North
  { code: "krl", label: "Карелы", regionHint: "north", isIndigenous: true },
  { code: "kom", label: "Коми", regionHint: "north", isIndigenous: true },
  { code: "pom", label: "Поморы", regionHint: "north" },

  // Kaliningrad
  { code: "kal", label: "Калининградцы", regionHint: "kaliningrad" },

  // Crimea
  {
    code: "crt",
    label: "Крымские татары",
    regionHint: "crimea_special",
    isIndigenous: true,
  },
];

export function getEthnicitiesByRegion(region: MacroRegion): EthnicityRecord[] {
  const exact = ETHNICITIES.filter((e) => e.regionHint === region);
  const common = ETHNICITIES.filter((e) => e.regionHint === "unknown");
  return [...exact, ...common];
}

export function isEthnicityInRegionList(
  region: MacroRegion,
  code?: string
): boolean {
  if (!code) return false;
  return getEthnicitiesByRegion(region).some((e) => e.code === code);
}

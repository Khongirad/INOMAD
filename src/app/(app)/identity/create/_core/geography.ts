// src/app/(app)/identity/create/_core/geography.ts
// Геопространственные данные for системы INOMAD KHURAL

import type { MacroRegion } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// ТИПЫ ДАННЫХ
// ─────────────────────────────────────────────────────────────────────────────

export type TerritoryStatus =
  | "core" // ядро (Сибирь)
  | "state" // state зона
  | "indigenous" // indigenous region
  | "city_state" // city-state
  | "special"; // особый статус

export type ResidenceStatus = "home" | "guest" | "resident";

export interface GeoCoordinates {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SeaGate {
  id: string;
  name: string;
  nameRu: string;
  type: "arctic" | "pacific" | "port";
  coordinates: GeoCoordinates;
  description: string;
}

export interface SubRegion {
  id: string;
  name: string;
  nameRu: string;
  capital?: string;
  capitalRu?: string;
  coordinates: GeoCoordinates;
  bounds: GeoBounds;
  indigenousPeoples: string[]; // коды народов
  seaGates?: SeaGate[];
  description: string;
  descriptionRu: string;
}

export interface DoctrinalRegion {
  id: string;
  code: MacroRegion | "moscow" | "spb" | "golden_ring";
  name: string;
  nameRu: string;
  status: TerritoryStatus;
  color: string; // цвет for карты
  opacity: number;
  coordinates: GeoCoordinates; // центр the region of
  bounds: GeoBounds;
  indigenousPeoples: string[]; // коды народов
  languages: string[];
  subRegions?: SubRegion[];
  description: string;
  descriptionRu: string;
  culturalNotes: string;
  culturalNotesRu: string;
  responsibilityPrinciple: string;
  responsibilityPrincipleRu: string;
}

export interface Nation {
  code: string;
  name: string;
  nameRu: string;
  nativeName?: string; // название на родном языке
  languages: string[];
  regions: string[]; // id regions где проживают
  isIndigenous: boolean;
  population?: string; // примерная численность
  history: string;
  historyRu: string;
  culture: string;
  cultureRu: string;
  traditions?: string[];
  traditionsRu?: string[];
}

export interface Settlement {
  id: string;
  name: string;
  nameRu: string;
  type: "city" | "town" | "village" | "settlement";
  coordinates: GeoCoordinates;
  regionId: string;
  subRegionId?: string;
  population?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ДОКТРИНАЛЬНЫЕ РЕГИОНЫ (слой поверх реальной географии)
// ─────────────────────────────────────────────────────────────────────────────

export const DOCTRINAL_REGIONS: DoctrinalRegion[] = [
  // СИБИРЬ — ядро
  {
    id: "siberia",
    code: "siberia",
    name: "Siberia",
    nameRu: "Сибирь",
    status: "core",
    color: "#2563eb", // синий
    opacity: 0.25,
    coordinates: { lat: 60.0, lng: 100.0 },
    bounds: { north: 77.0, south: 50.0, east: 170.0, west: 60.0 },
    indigenousPeoples: [
      "bur",
      "tuv",
      "alt",
      "khk",
      "sah",
      "nen",
      "kha",
      "man",
      "eve",
      "chu",
      "sel",
      "niv",
      "ude",
      "nan",
      "ore",
      "ulc",
      "ket",
      "dol",
      "ngan",
      "eny",
    ],
    languages: [
      "Russian",
      "Buryat",
      "Tuvan",
      "Yakut (Sakha)",
      "Altai",
      "Khakas",
      "Evenki",
      "Nenets",
      "Khanty",
      "Mansi",
    ],
    subRegions: [
      {
        id: "buryad_mongolia",
        name: "Buryad-Mongolian Zone",
        nameRu: "Буряад-Монгольская зона",
        capital: "Irkutsk",
        capitalRu: "Иркутск",
        coordinates: { lat: 52.3, lng: 104.3 },
        bounds: { north: 58.0, south: 50.0, east: 120.0, west: 98.0 },
        indigenousPeoples: ["bur", "eve"],
        seaGates: [
          {
            id: "vladivostok",
            name: "Vladivostok",
            nameRu: "Владивосток",
            type: "pacific",
            coordinates: { lat: 43.12, lng: 131.87 },
            description: "Pacific gateway — port access for Buryad-Mongolia",
          },
        ],
        description:
          "Central Siberian heartland with Buryat cultural dominance. Historical connection to Mongolian world.",
        descriptionRu:
          "Центральносибирский хартленд с бурятским культурным доминированием. Историческая связь с монгольским миром.",
      },
      {
        id: "altai",
        name: "Altai Region",
        nameRu: "Altai Region",
        capital: "Novosibirsk",
        capitalRu: "Новосибирск",
        coordinates: { lat: 52.0, lng: 85.0 },
        bounds: { north: 55.0, south: 49.0, east: 92.0, west: 78.0 },
        indigenousPeoples: ["alt", "kaz"],
        description:
          "Mountain crossroads of Siberia. Meeting point of Turkic and Mongolic peoples.",
        descriptionRu:
          "Mountain crossroads of Siberia. Meeting point of Turkic and Mongolic peoples.",
      },
      {
        id: "tyva",
        name: "Tyva",
        nameRu: "Tuva",
        capital: "Kyzyl",
        capitalRu: "Кызыл",
        coordinates: { lat: 51.7, lng: 94.4 },
        bounds: { north: 53.8, south: 49.7, east: 99.0, west: 89.0 },
        indigenousPeoples: ["tuv"],
        description:
          "Independent Tuvan nation. Center of Siberia, home of throat singing. Buddhist and shamanist traditions.",
        descriptionRu:
          "Самостоятельная тувинская нация. Центр Сибири, родина горлового пения. Буддийские и шаманские традиции.",
      },
      {
        id: "khakassia",
        name: "Khakassia",
        nameRu: "Хакасия",
        capital: "Abakan",
        capitalRu: "Абакан",
        coordinates: { lat: 53.7, lng: 91.4 },
        bounds: { north: 55.5, south: 51.5, east: 95.0, west: 87.5 },
        indigenousPeoples: ["khk"],
        description:
          "Ancient Turkic land with unique Khakas culture. Rich archaeological heritage.",
        descriptionRu:
          "Древняя тюркская земля с уникальной хакасской культурой. Богатое археологическое насле��ие.",
      },
      {
        id: "sakha",
        name: "Sakha (Yakutia)",
        nameRu: "Саха (Якутия)",
        capital: "Yakutsk",
        capitalRu: "Якутск",
        coordinates: { lat: 62.0, lng: 129.7 },
        bounds: { north: 77.0, south: 55.0, east: 163.0, west: 105.0 },
        indigenousPeoples: ["sah", "eve", "evn", "yuk", "dol", "chu"],
        seaGates: [
          {
            id: "arctic_sakha",
            name: "Arctic Passage",
            nameRu: "Арктический проход",
            type: "arctic",
            coordinates: { lat: 72.0, lng: 130.0 },
            description:
              "Arctic maritime gateway — Sakha access to Northern Sea Route",
          },
        ],
        description:
          "Largest republic by territory. Permafrost realm. Sakha (Yakut) people with distinct Turkic-Siberian culture.",
        descriptionRu:
          "Крупнейшая republic по территории. Царство вечной мерзлоты. Народ саха (якуты) с уникальной тюркско-сибирской культурой.",
      },
      {
        id: "northeast_ocean",
        name: "Northeast Oceanic Region",
        nameRu: "Северо-Восточный океанический Region",
        capital: "Magadan",
        capitalRu: "Магадан",
        coordinates: { lat: 59.6, lng: 150.8 },
        bounds: { north: 70.0, south: 43.0, east: 180.0, west: 140.0 },
        indigenousPeoples: ["chu", "eve", "kor", "ite", "niv", "aly"],
        seaGates: [
          {
            id: "pacific_ne",
            name: "Pacific Gateway",
            nameRu: "Тихоокеанские ворота",
            type: "pacific",
            coordinates: { lat: 53.0, lng: 158.0 },
            description: "Pacific access point for Kamchatka and Chukotka",
          },
        ],
        description:
          "Magadan, Sakhalin, Chukotka, Kamchatka. Maritime peoples. Gateway to Pacific.",
        descriptionRu:
          "Магадан, Сахалин, Чукотка, Камчатка. Морские народы. Ворота в Тихий океан.",
      },
    ],
    description:
      "Core territory of INOMAD KHURAL. From Ural mountains to Pacific Ocean. Homeland of dozens of indigenous peoples.",
    descriptionRu:
      "Ядро INOMAD KHURAL. От Уральских гор до Тихого океана. Родина десятков коренных народов.",
    culturalNotes:
      "Siberia represents the synthesis of Turkic, Mongolic, Tungusic, and Paleosiberian cultures. Shamanism, Buddhism, and Orthodox Christianity coexist. Harsh climate forged resilient, self-reliant communities.",
    culturalNotesRu:
      "Сибирь представляет синтез тюркских, монгольских, тунгусских и палеосибирских культур. Шаманизм, буддизм и Orthodoxy сосуществуют. Суровый климат сформировал стойкие, самодостаточные общины.",
    responsibilityPrinciple:
      "Indigenous peoples of Siberia bear responsibility for the land and for all who live upon it.",
    responsibilityPrincipleRu:
      "Коренные народы Сибири несут responsibility за землю и за всех проживающих на ней.",
  },

  // СЕВЕРНЫЙ КАВКАЗ
  {
    id: "caucasus",
    code: "caucasus",
    name: "North Caucasus",
    nameRu: "Северный Кавказ",
    status: "indigenous",
    color: "#dc2626", // красный
    opacity: 0.25,
    coordinates: { lat: 43.5, lng: 44.0 },
    bounds: { north: 46.5, south: 41.0, east: 50.0, west: 36.0 },
    indigenousPeoples: [
      "che", "ava", "dar", "lez", "kab", "os", "ing", "ady", "crk", "bal", "kum", "lak", "tab"
    ],
    languages: ["Russian", "Chechen", "Avar", "Ossetian"],
    subRegions: [
        {
            id: "dagestan",
            name: "Republic of Dagestan",
            nameRu: "Republic of Dagestan",
            capital: "Makhachkala",
            capitalRu: "Махачкала",
            coordinates: { lat: 42.98, lng: 47.5 },
            bounds: { north: 45.0, south: 41.0, east: 48.0, west: 45.0 },
            indigenousPeoples: ["ava", "dar", "lez", "kum", "lak", "tab"],
            description: "Land of Mountains. Most diverse region.",
            descriptionRu: "Land of Mountains. Most diverse region."
        },
        {
            id: "chechnya",
            name: "Chechen Republic",
            nameRu: "Chechen Republic",
            capital: "Grozny",
            capitalRu: "Грозный",
            coordinates: { lat: 43.31, lng: 45.69 },
            bounds: { north: 44.0, south: 42.0, east: 46.5, west: 44.5 },
            indigenousPeoples: ["che"],
            description: "Heart of the Vainakh people.",
            descriptionRu: "Heart of the Vainakh people."
        },
         {
            id: "ingushetia",
            name: "Republic of Ingushetia",
            nameRu: "Republic of Ingushetia",
            capital: "Magas",
            capitalRu: "Магас",
            coordinates: { lat: 43.16, lng: 44.81 },
            bounds: { north: 43.5, south: 42.5, east: 45.5, west: 44.0 },
            indigenousPeoples: ["ing"],
            description: "Land of Towers.",
            descriptionRu: "Land of Towers."
        },
        {
            id: "ossetia",
            name: "North Ossetia-Alania",
            nameRu: "Северная Осетия — Алания",
            capital: "Vladikavkaz",
            capitalRu: "Владикавказ",
            coordinates: { lat: 43.02, lng: 44.68 },
            bounds: { north: 43.8, south: 42.5, east: 45.0, west: 43.5 },
            indigenousPeoples: ["os"],
            description: "Descendants of Alans.",
            descriptionRu: "Descendants of Alans."
        },
        {
            id: "kabardino_balkaria",
            name: "Kabardino-Balkaria",
            nameRu: "Кабардино-Балкария",
            capital: "Nalchik",
            capitalRu: "Нальчик",
            coordinates: { lat: 43.48, lng: 43.61 },
            bounds: { north: 44.0, south: 42.8, east: 44.5, west: 42.5 },
            indigenousPeoples: ["kab", "bal"],
            description: "Home of Mount Elbrus.",
            descriptionRu: "Home of Mount Elbrus."
        },
        {
            id: "karachay_cherkessia",
            name: "Karachay-Cherkessia",
            nameRu: "Карачаево-Черкесия",
            capital: "Cherkessk",
            capitalRu: "Черкесск",
            coordinates: { lat: 44.22, lng: 42.05 },
            bounds: { north: 44.5, south: 43.0, east: 43.0, west: 40.5 },
            indigenousPeoples: ["kar", "crk"],
            description: "Western Caucasus peaks.",
            descriptionRu: "Western Caucasus peaks."
        },
        {
            id: "adygea",
            name: "Republic of Adygea",
            nameRu: "Republic of Adygea",
            capital: "Maykop",
            capitalRu: "Mayкоп",
            coordinates: { lat: 44.6, lng: 40.1 },
            bounds: { north: 45.2, south: 43.8, east: 40.8, west: 38.8 },
            indigenousPeoples: ["ady"],
            description: "Circassian homeland.",
            descriptionRu: "Circassian homeland."
        }
    ],
    description:
      "Mountain fortress of dozens of nations. One of the most linguistically diverse regions on Earth.",
    descriptionRu:
      "Горная крепость десятков народов. One из наиболее лингвистически разнообразных regions на Земле.",
    culturalNotes:
      "Caucasian cultures are defined by mountain isolation, clan structures, and codes of honor. Islam predominates alongside ancient customs.",
    culturalNotesRu:
      "Кавказские культуры определяются горной изоляцией, клановыми structures и кодексами чести. Ислам преобладает наряду с древними обычаями.",
    responsibilityPrinciple:
      "The peoples of the Caucasus guard their mountains and welcome guests with sacred hospitality.",
    responsibilityPrincipleRu:
      "Народы Кавказа хранят свои горы и встречают гостей священным гостеприимством.",
  },

  // ЦЕНТРАЛЬНЫЕ ЗЕМЛИ (Залесье)
  {
    id: "central_heartland",
    code: "golden_ring",
    name: "Central Heartland",
    nameRu: "Центральные Земли",
    status: "state",
    color: "#ca8a04", // золотой
    opacity: 0.2,
    coordinates: { lat: 56.5, lng: 40.0 },
    bounds: { north: 62.0, south: 50.0, east: 60.0, west: 30.0 },
    indigenousPeoples: [],
    languages: ["Russian"],
    subRegions: [
        {
            id: "vladimir",
            name: "Vladimir Oblast",
            nameRu: "Vladimir Oblast",
            capital: "Vladimir",
            capitalRu: "Владимир",
            coordinates: { lat: 56.12, lng: 40.40 },
            bounds: { north: 57.0, south: 55.0, east: 43.0, west: 38.0 },
            indigenousPeoples: [],
            description: "Ancient capital of Rus.",
            descriptionRu: "Ancient capital of Rus."
        },
        {
            id: "yaroslavl",
            name: "Yaroslavl Oblast",
            nameRu: "Yaroslavl Oblast",
            capital: "Yaroslavl",
            capitalRu: "Ярославль",
            coordinates: { lat: 57.62, lng: 39.89 },
            bounds: { north: 59.0, south: 56.5, east: 41.5, west: 38.0 },
            indigenousPeoples: [],
            description: "Pearl of the Golden Ring.",
            descriptionRu: "Pearl of the Golden Ring."
        },
        {
            id: "moscow_oblast",
            name: "Moscow Oblast",
            nameRu: "Moscow Oblast",
            capital: "Krasnogorsk",
            capitalRu: "Красногорск",
            coordinates: { lat: 55.8, lng: 37.3 },
            bounds: { north: 57.0, south: 54.5, east: 40.0, west: 35.0 },
            indigenousPeoples: [],
            description: "Heart of the Federation.",
            descriptionRu: "Heart of the Federation."
        },
        {
            id: "tver",
            name: "Tver Oblast",
            nameRu: "Tver Oblast",
            capital: "Tver",
            capitalRu: "Тверь",
            coordinates: { lat: 56.85, lng: 35.9 },
            bounds: { north: 58.0, south: 56.0, east: 38.0, west: 34.0 },
            indigenousPeoples: ["krl"],
            description: "Upper Volga.",
            descriptionRu: "Upper Volga."
        },
         {
            id: "kostroma",
            name: "Kostroma Oblast",
            nameRu: "Kostroma Oblast",
            capital: "Kostroma",
            capitalRu: "Кострома",
            coordinates: { lat: 57.76, lng: 40.92 },
            bounds: { north: 59.5, south: 57.0, east: 47.0, west: 40.0 },
            indigenousPeoples: [],
            description: "Forest lands.",
            descriptionRu: "Forest lands."
        }
    ],
    description:
      "Historical heartland.",
    descriptionRu:
      "Historical heartland.",
    culturalNotes:
      "Core of the civilization.",
    culturalNotesRu:
      "Ядро civilization.",
    responsibilityPrinciple:
      "Stewardship of the central lands.",
    responsibilityPrincipleRu:
      "Stewardship of the central lands.",
  },

  // СЕВЕР (коренные земли)
  {
    id: "north",
    code: "north",
    name: "The North",
    nameRu: "Северные Земли",
    status: "indigenous",
    color: "#0891b2", // циан
    opacity: 0.25,
    coordinates: { lat: 65.0, lng: 40.0 },
    bounds: { north: 82.0, south: 60.0, east: 60.0, west: 28.0 },
    indigenousPeoples: ["krl", "kom", "pom", "nen"],
    languages: ["Russian", "Karelian", "Komi"],
    subRegions: [
         {
            id: "komi",
            name: "Komi Republic",
            nameRu: "Komi Republic",
            capital: "Syktyvkar",
            capitalRu: "Сыктывкар",
            coordinates: { lat: 61.66, lng: 50.81 },
            bounds: { north: 68.0, south: 59.0, east: 66.0, west: 45.0 },
            indigenousPeoples: ["kom"],
            description: "Vast northern taiga.",
            descriptionRu: "Vast northern taiga."
        },
         {
            id: "karelia",
            name: "Republic of Karelia",
            nameRu: "Republic of Karelia",
            capital: "Petrozavodsk",
            capitalRu: "Петрозаводск",
            coordinates: { lat: 61.78, lng: 34.35 },
            bounds: { north: 66.0, south: 60.0, east: 37.0, west: 29.0 },
            indigenousPeoples: ["krl"],
            description: "Land of lakes and forests.",
            descriptionRu: "Land of lakes and forests."
        },
        {
            id: "murmansk",
            name: "Murmansk Region",
            nameRu: "Murmansk Oblast",
            capital: "Murmansk",
            capitalRu: "Мурманск",
            coordinates: { lat: 68.95, lng: 33.08 },
            bounds: { north: 70.0, south: 66.0, east: 42.0, west: 28.0 },
            indigenousPeoples: ["smi"],
            description: "Gateway to the Arctic.",
            descriptionRu: "Gateway to the Arctic."
        },
        {
            id: "arkhangelsk",
            name: "Arkhangelsk Region",
            nameRu: "Arkhangelsk Oblast",
            capital: "Arkhangelsk",
            capitalRu: "Архангельск",
            coordinates: { lat: 64.54, lng: 40.51 },
            bounds: { north: 66.0, south: 61.0, east: 48.0, west: 36.0 },
            indigenousPeoples: ["pom", "nen"],
            description: "White Sea coast.",
            descriptionRu: "White Sea coast."
        }
    ],
    description:
      "Arctic and subarctic indigenous lands.",
    descriptionRu:
      "Арктические и субарктические коренные земли.",
    culturalNotes:
      "Northern peoples developed unique adaptations to Arctic conditions.",
    culturalNotesRu:
      "Северные народы developed уникальные адаптации к арктическим conditions.",
    responsibilityPrinciple:
      "The peoples of the North protect the Arctic ecosystem.",
    responsibilityPrincipleRu:
      "Народы Севера защищают арктическую экосистему.",
  },

  // МОСКВА
  {
    id: "moscow",
    code: "moscow",
    name: "Moscow",
    nameRu: "Москва",
    status: "city_state",
    color: "#7c3aed",
    opacity: 0.3,
    coordinates: { lat: 55.75, lng: 37.62 },
    bounds: { north: 56.0, south: 55.5, east: 38.0, west: 37.0 },
    indigenousPeoples: [],
    languages: ["Russian"],
    description: "City-state. Metropolis.",
    descriptionRu: "City-state. Megalopolis.",
    culturalNotes: "Cosmopolitan center.",
    culturalNotesRu: "Cosmopolitan центр.",
    responsibilityPrinciple: "Moscow serves as a neutral ground.",
    responsibilityPrincipleRu: "Москва служит нейтральной территорией.",
  },

  // САНКТ-ПЕТЕРБУРГ
  {
    id: "spb",
    code: "spb",
    name: "Saint Petersburg",
    nameRu: "Санкт-Петербург",
    status: "city_state",
    color: "#0ea5e9",
    opacity: 0.3,
    coordinates: { lat: 59.93, lng: 30.34 },
    bounds: { north: 60.1, south: 59.7, east: 30.8, west: 29.8 },
    indigenousPeoples: [],
    languages: ["Russian"],
    description: "Cultural capital.",
    descriptionRu: "Cultural capital.",
    culturalNotes: "European face of Russia.",
    culturalNotesRu: "European face of Russia.",
    responsibilityPrinciple: "Bridge between East and West.",
    responsibilityPrincipleRu: "Bridge between East and West.",
  },

  // ПОВОЛЖЬЕ
  {
    id: "volga",
    code: "volga",
    name: "Volga Region",
    nameRu: "Поволжье",
    status: "indigenous",
    color: "#16a34a", // зелёный
    opacity: 0.2,
    coordinates: { lat: 55.0, lng: 49.0 },
    bounds: { north: 60.0, south: 48.0, east: 60.0, west: 40.0 },
    indigenousPeoples: ["tat", "bash", "chu", "mrd", "mar", "udm"],
    languages: ["Russian", "Tatar", "Bashkir"],
    subRegions: [
        {
            id: "tatarstan",
            name: "Republic of Tatarstan",
            nameRu: "Republic of Tatarstan",
            capital: "Kazan",
            capitalRu: "Казань",
            coordinates: { lat: 55.79, lng: 49.1 },
            bounds: { north: 56.7, south: 53.9, east: 54.3, west: 47.2 },
            indigenousPeoples: ["tat"],
            description: "Heart of the Volga.",
            descriptionRu: "Heart of the Volga."
        },
        {
            id: "bashkortostan",
            name: "Republic of Bashkortostan",
            nameRu: "Republic of Bashkortostan",
            capital: "Ufa",
            capitalRu: "Уфа",
            coordinates: { lat: 54.73, lng: 55.95 },
            bounds: { north: 56.5, south: 51.5, east: 60.0, west: 53.0 },
            indigenousPeoples: ["bash"],
            description: "Southern Urals.",
            descriptionRu: "Southern Urals."
        },
        {
            id: "chuvashia",
            name: "Chuvash Republic",
            nameRu: "Chuvash Republic",
            capital: "Cheboksary",
            capitalRu: "Чебоксары",
            coordinates: { lat: 56.1, lng: 47.2 },
            bounds: { north: 56.2, south: 54.9, east: 48.2, west: 46.0 },
            indigenousPeoples: ["chu"],
            description: "Land of Hundred Embroideries.",
            descriptionRu: "Land of Hundred Embroideries."
        },
         {
            id: "mari_el",
            name: "Mari El Republic",
            nameRu: "Mari El Republic",
            capital: "Yoshkar-Ola",
            capitalRu: "Йошкар-Ола",
            coordinates: { lat: 56.63, lng: 47.88 },
            bounds: { north: 57.3, south: 55.8, east: 50.2, west: 45.6 },
            indigenousPeoples: ["mar"],
            description: "Last Pagans of Europe.",
            descriptionRu: "Last Pagans of Europe."
        },
        {
            id: "udmurtia",
            name: "Udmurt Republic",
            nameRu: "Udmurt Republic",
            capital: "Izhevsk",
            capitalRu: "Ижевск",
            coordinates: { lat: 56.8, lng: 53.2 },
            bounds: { north: 58.6, south: 55.9, east: 54.5, west: 51.1 },
            indigenousPeoples: ["udm"],
            description: "Spring land.",
            descriptionRu: "Spring land."
        },
        {
            id: "mordovia",
            name: "Republic of Mordovia",
            nameRu: "Republic of Mordovia",
            capital: "Saransk",
            capitalRu: "Саранск",
            coordinates: { lat: 54.18, lng: 45.17 },
            bounds: { north: 55.2, south: 53.6, east: 46.9, west: 42.1 },
            indigenousPeoples: ["mrd"],
            description: "Finno-Ugric heritage.",
            descriptionRu: "Finno-Ugric heritage."
        }
    ],
    description:
      "Volga river basin.",
    descriptionRu:
      "Volga river basin.",
    culturalNotes:
      "Meeting point of Slavic, Turkic, and Finno-Ugric peoples.",
    culturalNotesRu:
      "Meeting point of Slavic, Turkic, and Finno-Ugric peoples.",
    responsibilityPrinciple:
      "The peoples of the Volga maintain the great river.",
    responsibilityPrincipleRu:
      "The peoples of the Volga maintain the great river.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// НАРОДЫ (расширенные данные)
// ─────────────────────────────────────────────────────────────────────────────

export const NATIONS: Nation[] = [
  // СИБИРСКИЕ НАРОДЫ
  {
    code: "bur",
    name: "Buryad-Mongol",
    nameRu: "Буряад-Монгол",
    nativeName: "Буряад-Монгол",
    languages: ["Buryat", "Russian"],
    regions: ["siberia", "buryad_mongolia"],
    isIndigenous: true,
    population: "~500,000",
    history:
      "The Buryad-Mongol are a Mongolic people native to the Lake Baikal region. They were the largest ethnic minority in Siberia, with a rich nomadic heritage. The Buryat-Mongol ASSR existed from 1923 to 1958.",
    historyRu:
      "Буряты — монгольский народ, indigenous for the region of озера Байкал. Были крупнейшим этническим меньшинством в Сибири с богатым кочевым наследием. Бурят-Монгольская АССР существовала с 1923 по 1958 год.",
    culture:
      "Buryad-Mongol culture blends Mongolic traditions with Tibetan Buddhism and Siberian shamanism. Famous for epic poetry (Geser), throat singing, and distinctive round felt tents (ger/yurt).",
    cultureRu:
      "Бурятская культура сочетает монгольские традиции с тибетским буддизмом и сибирским шаманизмом. Известны эпической поэзией (Гэсэр), горловым пением и характерными круглыми войлочными юртами.",
    traditions: [
      "Sagaalgan (White Month / New Year)",
      "Surkharban (Three Games festival)",
      "Yohor (circle dance)",
    ],
    traditionsRu: [
      "Сагаалган (Белый месяц / New год)",
      "Сурхарбан (фестиваль трёх игр)",
      "Ёхор (круговой танец)",
    ],
  },
  {
    code: "tuv",
    name: "Tuvans",
    nameRu: "Тувинцы",
    nativeName: "Tuvalars",
    languages: ["Tuvan", "Russian"],
    regions: ["siberia", "tyva"],
    isIndigenous: true,
    population: "~280,000",
    history:
      "Tuvans are a Turkic people of the Sayan mountains. Tuva was independent (Tannu-Tuva) from 1921 to 1944. Their land is at the geographic center of Asia.",
    historyRu:
      "Тувинцы — тюркский народ Саянских гор. Тува была независимой (Танну-Тува) с 1921 по 1944 год. Их земля находится в географическом центре Азии.",
    culture:
      "World-renowned for khoomei (throat singing). Blend of Tibetan Buddhism and shamanism. Nomadic horse culture with unique musical instruments.",
    cultureRu:
      "World- известны хоомеем (горловым пением). Сочетание тибетского буддизма и шаманизма. Кочевая конная культура с уникальными музыкальными инструментами.",
    traditions: ["Naadym (herders festival)", "Shagaa (New Year)"],
    traditionsRu: ["Наадым (holiday животноводов)", "Stepаа (New год)"],
  },
  {
    code: "sah",
    name: "Sakha (Yakuts)",
    nameRu: "Саха (якуты)",
    nativeName: "Саха",
    languages: ["Yakut (Sakha)", "Russian"],
    regions: ["siberia", "sakha"],
    isIndigenous: true,
    population: "~500,000",
    history:
      "The Sakha are a Turkic people who migrated north, adapting to extreme cold. Sakha Republic is the largest subnational entity in the world by area.",
    historyRu:
      "Саха — тюркский народ, мигрировавший на север и адаптировавшийся к экстремальному холоду. Sakha Republic — крупнейший субнациональный субъект в мире по площади.",
    culture:
      "Unique northern Turkic culture adapted to permafrost. Famous for olonkho epic poetry (UNESCO heritage), diamond mining, and extreme cold survival traditions.",
    cultureRu:
      "Уникальная северная тюркская культура, адаптированная к вечной мерзлоте. Известны эпосом олонхо (наследие ЮНЕСКО), добычей алмазов и традициями выживания в экстремальном холоде.",
    traditions: ["Yhyakh (summer solstice)", "Olonkho storytelling"],
    traditionsRu: ["Ысыах (летнее солнцестояние)", "Сказительство олонхо"],
  },
  {
    code: "alt",
    name: "Altaians",
    nameRu: "Алтайцы",
    nativeName: "Алтай-кижи",
    languages: ["Altai", "Russian"],
    regions: ["siberia", "altai"],
    isIndigenous: true,
    population: "~80,000",
    history:
      "The Altaians are a Turkic people of the Altai mountains, a region considered sacred and a possible origin point of Turkic peoples.",
    historyRu:
      "Алтайцы — тюркский народ Алтайских гор, the region of, считающегося священным и возможной прародиной тюркских народов.",
    culture:
      "Strong shamanist traditions. Throat singing (kai). The Altai is considered a spiritual power place. Nomadic horse culture.",
    cultureRu:
      "Сильные шаманские традиции. Горловое пение (кай). Алтай считается местом духовной силы. Кочевая конная культура.",
    traditions: ["El-Oyin (People's Games)", "Jylgayak (Spring celebration)"],
    traditionsRu: ["Эл-Ойын (Народные игры)", "Jылгаяк (Весеннее празднование)"],
  },
  {
    code: "khk",
    name: "Khakas",
    nameRu: "Хакасы",
    nativeName: "Тадарлар",
    languages: ["Khakas", "Russian"],
    regions: ["siberia", "khakassia"],
    isIndigenous: true,
    population: "~75,000",
    history:
      "The Khakas are a Turkic people with ancient roots in the Minusinsk Basin. Descendants of the medieval Yenisei Kyrgyz state.",
    historyRu:
      "Хакасы — тюркский народ с древними корнями в Минусинской котловине. Потомки средневекового Енисейского кыргызского гоcourtарства.",
    culture:
      "Rich archaeological heritage (standing stones, petroglyphs). Throat singing (khai). Shamanist traditions with some Buddhist influence.",
    cultureRu:
      "Богатое археологическое наследие (каменные стелы, петроглифы). Горловое пение (хай). Шаманские традиции с некоторым буддийским влиянием.",
    traditions: ["Tun Payram (First Milk festival)"],
    traditionsRu: ["Тун Пайрам (Holiday первого молока)"],
  },
  {
    code: "eve",
    name: "Evenks",
    nameRu: "Эвенки",
    nativeName: "Эвэнкил",
    languages: ["Evenki", "Russian"],
    regions: ["siberia", "sakha", "buryad_mongolia"],
    isIndigenous: true,
    population: "~40,000",
    history:
      "The Evenks are a Tungusic people spread across the largest territory of any indigenous Siberian group. Traditional reindeer herders and hunters.",
    historyRu:
      "Эвенки — тунгусский народ, расселённый на крупнейшей территории среди коренных сибирских народов. Традиционные оленеводы и охотники.",
    culture:
      "Nomadic reindeer herding culture. Animist beliefs with shaman traditions. Distinctive conical tents (chum). Skilled hunters and trackers.",
    cultureRu:
      "Кочевая оленеводческая культура. Анимистические верования с шаманскими традициями. Характерные конические чумы. Claimусные охотники и следопыты.",
    traditions: [
      "Ikenpre (reindeer herders day)",
      "Bear festivals",
      "Shaman ceremonies",
    ],
    traditionsRu: [
      "Икэнипкэ (день оленевода)",
      "Медвежьи holidayи",
      "Шаманские церемонии",
    ],
  },
  {
    code: "nen",
    name: "Nenets",
    nameRu: "Ненцы",
    nativeName: "Ненэй ненэць",
    languages: ["Nenets", "Russian"],
    regions: ["siberia", "north"],
    isIndigenous: true,
    population: "~45,000",
    history:
      "The Nenets are a Samoyedic people of the Arctic tundra, the largest indigenous group in the Russian Arctic. They maintain the world's largest reindeer herds.",
    historyRu:
      "Ненцы — самодийский народ арктической тундры, крупнейшая коренная group в российской Арктике. Содержат крупнейшие в мире стада оленей.",
    culture:
      "Nomadic reindeer herding across the tundra. Living in chums (conical tents). Strong animist traditions. Migration routes span hundreds of kilometers.",
    cultureRu:
      "Кочевое оленеводство по тундре. Живут в чумах (конических палатках). Сильные анимистические традиции. Маршруты миграции охватывают сотни километров.",
    traditions: ["Reindeer herder festivals", "Seasonal migrations"],
    traditionsRu: ["Holidayи оленеводов", "Сезонные миграции"],
  },

  // КАВКАЗСКИЕ НАРОДЫ
  {
    code: "che",
    name: "Chechens",
    nameRu: "Чеченцы",
    nativeName: "Нохчий",
    languages: ["Chechen", "Russian"],
    regions: ["caucasus"],
    isIndigenous: true,
    population: "~1,500,000",
    history:
      "The Chechens are a Northeast Caucasian people with a warrior tradition. They fiercely resisted Russian expansion and suffered deportation in 1944.",
    historyRu:
      "Чеченцы — северо-восточный кавказский народ с воинской традицией. Яростно сопротивлялись российской экспансии и пережor депортацию в 1944 году.",
    culture:
      "Strong clan (teip) structure. Code of honor (nokhchalla). Islam is central to identity. Traditional tower architecture. Distinctive music and dance (lezginka).",
    cultureRu:
      "Сильная клаnew (тейповая) structure. Кодекс чести (нохчалла). Ислам централен for идентичности. Традиционная башенная архитектура. Характерная музыка и танец (лезгинка).",
    traditions: [
      "Clan gatherings",
      "Lezginka dance",
      "Traditional hospitality codes",
    ],
    traditionsRu: [
      "Клановые собрания",
      "Танец лезгинка",
      "Традиционные кодексы гостеприимства",
    ],
  },
  {
    code: "ava",
    name: "Avars",
    nameRu: "Аварцы",
    nativeName: "Магӏарулал",
    languages: ["Avar", "Russian"],
    regions: ["caucasus"],
    isIndigenous: true,
    population: "~1,000,000",
    history:
      "The Avars are the largest ethnic group in Dagestan. Mountain people with a history of independence in highland auls (villages).",
    historyRu:
      "Аварцы — крупнейшая ethnic group в Дагестане. Горный народ с историей независимости в горных аулах.",
    culture:
      "Complex clan structures. Rich oral poetry tradition. Master silversmiths and craftsmen. Strong Islamic faith. Distinctive aul architecture.",
    cultureRu:
      "Сложные клановые структуры. Богатая традиция устной поэзии. Мастера-серебряники и ремесленники. Сильная исламская вера. Характерная архитектура аулов.",
    traditions: ["Highland adat (customs)", "Craft traditions"],
    traditionsRu: ["Горный адат (обычаи)", "Ремесленные традиции"],
  },
  {
    code: "os",
    name: "Ossetians",
    nameRu: "Осетины",
    nativeName: "Ирæттæ",
    languages: ["Ossetian", "Russian"],
    regions: ["caucasus"],
    isIndigenous: true,
    population: "~700,000",
    history:
      "The Ossetians are descendants of the ancient Alans, an Iranian people. They are the only predominantly Christian people of the North Caucasus.",
    historyRu:
      "Осетины — потомки древних аланов, иранского народа. Единственный преимущественно христианский народ Северного Кавказа.",
    culture:
      "Unique blend of Caucasian and ancient Iranian (Scythian-Alan) traditions. Orthodox Christianity alongside ancient customs. Famous Nart sagas (epic poetry).",
    cultureRu:
      "Уникальное сочетание кавказских и древних иранских (скифо-аланских) традиций. Rightславие наряду с древними обычаями. Знаменитые нартские сказания (эпос).",
    traditions: ["Kuvd (feast)", "Nart saga recitation"],
    traditionsRu: ["Кувд (пиршество)", "Сказительство нартского эпоса"],
  },

  // ПОВОЛЖСКИЕ НАРОДЫ
  {
    code: "tat",
    name: "Tatars",
    nameRu: "Татары",
    nativeName: "Татарлар",
    languages: ["Tatar", "Russian"],
    regions: ["volga"],
    isIndigenous: true,
    population: "~5,500,000",
    history:
      "The Tatars are the second largest ethnic group in Russia. Descendants of the Volga Bulgars and Golden Horde. Kazan was a powerful khanate until 1552.",
    historyRu:
      "Татары — второй по численности народ России. Потомки волжских булгар и Золотой Орды. Казань была могущественным ханством до 1552 года.",
    culture:
      "Sunni Islam is central to identity. Rich literary tradition (Tatar was a lingua franca of commerce). Distinctive cuisine, architecture, and music.",
    cultureRu:
      "Суннитский ислам централен for идентичности. Богатая литературная традиция (татарский был языком международной торговли). Характерная кухня, архитектура и музыка.",
    traditions: ["Sabantuy (plowing festival)", "Islamic holidays"],
    traditionsRu: ["Сабантуй (holiday плуга)", "Исламские holidayи"],
  },
  {
    code: "bash",
    name: "Bashkirs",
    nameRu: "Башкиры",
    nativeName: "Башҡорттар",
    languages: ["Bashkir", "Russian"],
    regions: ["volga"],
    isIndigenous: true,
    population: "~1,600,000",
    history:
      "The Bashkirs are a Turkic people of the southern Urals. They maintained a degree of autonomy under Russia and have a tradition of horseback warriors.",
    historyRu:
      "Башкиры — тюркский народ южного Урала. Сохраняли degree автономии под Россией и have традицию конных воинов.",
    culture:
      "Nomadic heritage with settled agriculture. Sunni Islam. Distinctive honey production traditions. Epic poetry (Ural-batyr). Kumis (fermented mare's milk) culture.",
    cultureRu:
      "Кочевое наследие с оседлым земледелием. Суннитский ислам. Характерные традиции пчеловодства. Эпос (Урал-батыр). Культура кумыса (кобыльего молока).",
    traditions: ["Sabantuy", "Yıyın (assembly)", "Honey festivals"],
    traditionsRu: ["Сабантуй", "Йыйын (собрание)", "Holidayи мёда"],
  },

  // СЕВЕРНЫЕ НАРОДЫ
  {
    code: "krl",
    name: "Karelians",
    nameRu: "Карелы",
    nativeName: "Karjalazet",
    languages: ["Karelian", "Russian", "Финский"],
    regions: ["north"],
    isIndigenous: true,
    population: "~60,000",
    history:
      "The Karelians are a Baltic-Finnic people closely related to Finns. Their homeland was divided between Russia and Finland. The Kalevala epic originates from Karelian oral tradition.",
    historyRu:
      "Карелы — балтийско-финский народ, близкий к финнам. Их родина была разделена между Россией и Финляндией. Эпос «Калевала» происходит из карельской устной традиции.",
    culture:
      "Rich folklore tradition (source of Kalevala). Blend of Orthodox Christianity and older beliefs. Forest and lake culture. Distinctive wooden architecture.",
    cultureRu:
      "Богатая фольклорная традиция (источник «Калевалы»). Сочетание rightславия и более древних верований. Лесная и озёрная культура. Характерная деревянная архитектура.",
    traditions: [
      "Kalevala recitation",
      "Forest rituals",
      "Orthodox feast days",
    ],
    traditionsRu: [
      "Сказительство «Калевалы»",
      "Лесные ритуалы",
      "Rightславные holidayи",
    ],
  },
  {
    code: "kom",
    name: "Komi",
    nameRu: "Komi",
    nativeName: "Komiяс",
    languages: ["Komi", "Russian"],
    regions: ["north"],
    isIndigenous: true,
    population: "~230,000",
    history:
      "The Komi are a Finno-Ugric people of the taiga and tundra. They were among the first to be Christianized but retained many pre-Christian customs.",
    historyRu:
      "Komi — финно-угорский народ тайги и тундры. Были одними из первых крещённых, но сохранor многие дохристианские обычаи.",
    culture:
      "Taiga hunting and fishing traditions. Distinctive reindeer herding in the north. Orthodox Christianity with folk beliefs. Rich oral traditions.",
    cultureRu:
      "Традиции таёжной охоты и рыболовства. Характерное оленеводство на севере. Rightславие с народными верованиями. Богатые устные традиции.",
    traditions: ["Hunter festivals", "Seasonal rituals"],
    traditionsRu: ["Holidayи охотников", "Сезонные ритуалы"],
  },

  // ОБЩИЕ НАРОДЫ
  {
    code: "rus",
    name: "Russians",
    nameRu: "Русские",
    nativeName: "Русские",
    languages: ["Russian"],
    regions: ["golden_ring", "siberia", "caucasus", "volga", "north"],
    isIndigenous: false,
    population: "~110,000,000",
    history:
      "The Russians are an East Slavic people who expanded from the medieval Rus' states. They colonized Siberia from the 16th century onward.",
    historyRu:
      "Русские — восточнославянский народ, расширившийся из средневековых гоcourtарств Руси. Колонизировали Сибирь с XVI века.",
    culture:
      "Orthodox Christianity is foundational. Rich literary and artistic traditions. Village commune (mir/obshchina) traditions. Distinctive folk music and dance.",
    cultureRu:
      "Rightславие является основой. Богатые литературные и художественные традиции. Традиции сельской общины (мир/община). Характерная народная музыка и танцы.",
    traditions: ["Orthodox holidays", "Maslenitsa", "Village festivals"],
    traditionsRu: [
      "Rightславные holidayи",
      "Масленица",
      "Деревенские holidayи",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// УТИЛИТЫ
// ─────────────────────────────────────────────────────────────────────────────

export function getRegionById(id: string): DoctrinalRegion | undefined {
  return DOCTRINAL_REGIONS.find((r) => r.id === id);
}

export function getSubRegionById(
  regionId: string,
  subRegionId: string
): SubRegion | undefined {
  const region = getRegionById(regionId);
  return region?.subRegions?.find((sr) => sr.id === subRegionId);
}

export function getNationByCode(code: string): Nation | undefined {
  return NATIONS.find((n) => n.code === code);
}

export function getNationsForRegion(regionId: string): Nation[] {
  return NATIONS.filter((n) => n.regions.includes(regionId));
}

export function getIndigenousNationsForRegion(regionId: string): Nation[] {
  return NATIONS.filter((n) => n.regions.includes(regionId) && n.isIndigenous);
}

export function determineResidenceStatus(
  ethnicityCode: string,
  regionId: string
): ResidenceStatus {
  const nation = getNationByCode(ethnicityCode);
  if (!nation) return "guest";

  // Если народ indigenous for данного the region of
  const region = getRegionById(regionId);
  if (region?.indigenousPeoples.includes(ethnicityCode)) {
    return "home";
  }

  // Если народ indigenous, но for другого the region of
  if (nation.isIndigenous) {
    return "resident";
  }

  // Неindigenous народ
  return "guest";
}

export function getResidenceStatusLabel(
  status: ResidenceStatus,
  lang: "en" | "ru" = "ru"
): { label: string; description: string } {
  const labels = {
    home: {
      en: {
        label: "Home",
        description:
          "You are indigenous to this land. You bear responsibility for the territory and all who live upon it.",
      },
      ru: {
        label: "Дом",
        description:
          "You indigenous житель этой земли. You несёте responsibility за территорию и всех проживающих на ней.",
      },
    },
    resident: {
      en: {
        label: "Resident",
        description:
          "You live here by right of residence. Your home territory is elsewhere, but you are a full participant in local life.",
      },
      ru: {
        label: "Житель",
        description:
          "You проживаете здесь по праву жителя. Yourа родная territory в другом месте, но вы genderноправный member местной жизни.",
      },
    },
    guest: {
      en: {
        label: "Guest",
        description:
          "You live here as a guest. This is not a limitation of rights, but a recognition of the land's keepers.",
      },
      ru: {
        label: "Гость",
        description:
          "You проживаете здесь как гость. Это не ограничение прав, а признание хранителей земли.",
      },
    },
  };

  return labels[status][lang];
}

// Центр карты по умолчанию (центр Сибири)
export const DEFAULT_MAP_CENTER: GeoCoordinates = { lat: 60.0, lng: 100.0 };
export const DEFAULT_MAP_ZOOM = 3;

// Coordinates for начального зума на Россию
export const RUSSIA_BOUNDS: GeoBounds = {
  north: 82.0,
  south: 41.0,
  east: 180.0,
  west: 19.0,
};

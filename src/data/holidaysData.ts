export type GermanState = 
  | "BW" // Baden-Württemberg
  | "BY" // Bayern
  | "BE" // Berlin
  | "BB" // Brandenburg
  | "HB" // Bremen
  | "HH" // Hamburg
  | "HE" // Hessen
  | "MV" // Mecklenburg-Vorpommern
  | "NI" // Niedersachsen
  | "NW" // Nordrhein-Westfalen
  | "RP" // Rheinland-Pfalz
  | "SL" // Saarland
  | "SN" // Sachsen
  | "ST" // Sachsen-Anhalt
  | "SH" // Schleswig-Holstein
  | "TH"; // Thüringen

export interface StateInfo {
  code: GermanState;
  name: string;
  capital: string;
  flagEmoji: string;
}

export const GERMAN_STATES: StateInfo[] = [
  { code: "BW", name: "Baden-Württemberg", capital: "Stuttgart", flagEmoji: "🏰" },
  { code: "BY", name: "Bayern", capital: "München", flagEmoji: "🦁" },
  { code: "BE", name: "Berlin", capital: "Berlin", flagEmoji: "🐻" },
  { code: "BB", name: "Brandenburg", capital: "Potsdam", flagEmoji: "🦅" },
  { code: "HB", name: "Bremen", capital: "Bremen", flagEmoji: "⚓" },
  { code: "HH", name: "Hamburg", capital: "Hamburg", flagEmoji: "🚢" },
  { code: "HE", name: "Hessen", capital: "Wiesbaden", flagEmoji: "🦁" },
  { code: "MV", name: "Mecklenburg-Vorpommern", capital: "Schwerin", flagEmoji: "🏖️" },
  { code: "NI", name: "Niedersachsen", capital: "Hannover", flagEmoji: "🐎" },
  { code: "NW", name: "Nordrhein-Westfalen", capital: "Düsseldorf", flagEmoji: "🏙️" },
  { code: "RP", name: "Rheinland-Pfalz", capital: "Mainz", flagEmoji: "🍇" },
  { code: "SL", name: "Saarland", capital: "Saarbrücken", flagEmoji: "⚒️" },
  { code: "SN", name: "Sachsen", capital: "Dresden", flagEmoji: "⚔️" },
  { code: "ST", name: "Sachsen-Anhalt", capital: "Magdeburg", flagEmoji: "🐻" },
  { code: "SH", name: "Schleswig-Holstein", capital: "Kiel", flagEmoji: "🌊" },
  { code: "TH", name: "Thüringen", capital: "Erfurt", flagEmoji: "🌲" },
];

export type HolidayCategory = "school_vacation" | "public_holiday" | "bridge_day";

export interface HolidayPeriod {
  id: string;
  name: string;
  category: HolidayCategory;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  states: GermanState[] | "ALL";
  notes?: string;
  icon?: string;
}

// Gauss Easter Sunday algorithm
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Mar, 4 = Apr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

// Generate all public holidays for a given year and state
export function getPublicHolidaysForYear(year: number, state: GermanState): HolidayPeriod[] {
  const easter = getEasterSunday(year);
  const holidays: HolidayPeriod[] = [];

  const add = (id: string, name: string, date: Date, states: GermanState[] | "ALL", notes?: string, icon?: string) => {
    if (states === "ALL" || states.includes(state)) {
      const iso = formatDateISO(date);
      holidays.push({
        id: `${id}-${year}`,
        name,
        category: "public_holiday",
        startDate: iso,
        endDate: iso,
        states,
        notes,
        icon: icon || "🎉",
      });
    }
  };

  // Fixed holidays
  add("neujahr", "Neujahr", new Date(year, 0, 1), "ALL", "Gesetzlicher Feiertag", "🎆");
  add("hdk", "Heilige Drei Könige", new Date(year, 0, 6), ["BW", "BY", "ST"], "Feiertag in BW, BY & ST", "👑");
  add("frauentag", "Internationaler Frauentag", new Date(year, 2, 8), ["BE", "MV"], "Feiertag in Berlin & MV", "🌷");
  add("tag_der_arbeit", "Tag der Arbeit", new Date(year, 4, 1), "ALL", "Gesetzlicher Feiertag", "🛠️");
  add("friedensfest", "Augsburger Friedensfest", new Date(year, 7, 8), ["BY"], "Schulfrei / Feiertag im Stadtgebiet Augsburg", "🕊️");
  add("mariae_himmelfahrt", "Mariä Himmelfahrt", new Date(year, 7, 15), ["SL", "BY"], "Feiertag in SL und katholischen Gemeinden in BY", "✨");
  add("weltkindertag", "Weltkindertag", new Date(year, 8, 20), ["TH"], "Gesetzlicher Feiertag in Thüringen", "🎈");
  add("tag_der_einheit", "Tag der Deutschen Einheit", new Date(year, 9, 3), "ALL", "Nationalfeiertag (bundesweit frei)", "🇩🇪");
  add("reformationstag", "Reformationstag", new Date(year, 9, 31), ["BB", "HB", "HH", "MV", "NI", "SN", "ST", "SH", "TH"], "Gesetzlicher Feiertag in 9 Bundesländern", "📖");
  add("allerheiligen", "Allerheiligen", new Date(year, 10, 1), ["BW", "BY", "NW", "RP", "SL"], "Gesetzlicher Feiertag in BW, BY, NW, RP, SL", "🕯️");
  
  // Buß- und Bettag: Wednesday before Nov 23
  const nov23 = new Date(year, 10, 23);
  const dayOfWeek = nov23.getDay(); // 0 is Sun, 3 is Wed
  const daysBack = (dayOfWeek + 4) % 7; // days to go back to previous Wednesday
  const bussUndBettag = new Date(year, 10, 23 - (daysBack === 0 ? 7 : daysBack));
  add("buss_bettag", "Buß- und Bettag", bussUndBettag, ["SN", "BY"], "In Sachsen Feiertag, in Bayern schulfrei für alle Schulen!", "🙏");

  add("weihnachten_1", "1. Weihnachtstag", new Date(year, 11, 25), "ALL", "Gesetzlicher Feiertag", "🎄");
  add("weihnachten_2", "2. Weihnachtstag", new Date(year, 11, 26), "ALL", "Gesetzlicher Feiertag", "🎁");

  // Moveable Easter-based holidays
  add("karfreitag", "Karfreitag", addDays(easter, -2), "ALL", "Gesetzlicher Feiertag (bundesweit)", "✝️");
  add("ostermontag", "Ostermontag", addDays(easter, 1), "ALL", "Gesetzlicher Feiertag (bundesweit)", "🐣");
  add("himmelfahrt", "Christi Himmelfahrt / Vatertag", addDays(easter, 39), "ALL", "Gesetzlicher Feiertag (bundesweit frei)", "☀️");
  add("pfingstmontag", "Pfingstmontag", addDays(easter, 50), "ALL", "Gesetzlicher Feiertag (bundesweit frei)", "🕊️");
  add("fronleichnam", "Fronleichnam", addDays(easter, 60), ["BW", "BY", "HE", "NW", "RP", "SL"], "Gesetzlicher Feiertag in BW, BY, HE, NW, RP, SL", "🌾");

  return holidays;
}

// KMK Official School Vacations database for all 16 German states (2024-2027)
export const OFFICIAL_SCHOOL_VACATIONS: Record<GermanState, HolidayPeriod[]> = {
  BW: [
    // 2024/2025
    { id: "bw-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-28", endDate: "2024-10-31", states: ["BW"], icon: "🍂" },
    { id: "bw-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-04", states: ["BW"], icon: "❄️" },
    { id: "bw-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-26", states: ["BW"], icon: "🌷" },
    { id: "bw-pfingst-25", name: "Pfingstferien", category: "school_vacation", startDate: "2025-06-10", endDate: "2025-06-20", states: ["BW"], icon: "🌿" },
    { id: "bw-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-31", endDate: "2025-09-13", states: ["BW"], icon: "☀️" },
    // 2025/2026
    { id: "bw-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-27", endDate: "2025-10-30", states: ["BW"], icon: "🍂" },
    { id: "bw-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-05", states: ["BW"], icon: "❄️" },
    { id: "bw-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["BW"], icon: "🌷" },
    { id: "bw-pfingst-26", name: "Pfingstferien", category: "school_vacation", startDate: "2026-05-26", endDate: "2026-06-05", states: ["BW"], icon: "🌿" },
    { id: "bw-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-30", endDate: "2026-09-12", states: ["BW"], icon: "☀️" },
    // 2026/2027
    { id: "bw-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-26", endDate: "2026-10-30", states: ["BW"], icon: "🍂" },
    { id: "bw-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-09", states: ["BW"], icon: "❄️" },
    { id: "bw-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-30", endDate: "2027-04-09", states: ["BW"], icon: "🌷" },
    { id: "bw-pfingst-27", name: "Pfingstferien", category: "school_vacation", startDate: "2027-05-18", endDate: "2027-05-28", states: ["BW"], icon: "🌿" },
    { id: "bw-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-29", endDate: "2027-09-11", states: ["BW"], icon: "☀️" },
  ],
  BY: [
    // 2024/2025
    { id: "by-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-28", endDate: "2024-10-31", states: ["BY"], icon: "🍂" },
    { id: "by-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-03", states: ["BY"], icon: "❄️" },
    { id: "by-fruehjahr-25", name: "Frühjahrsferien (Fasching)", category: "school_vacation", startDate: "2025-03-03", endDate: "2025-03-07", states: ["BY"], icon: "🎭" },
    { id: "by-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-25", states: ["BY"], icon: "🌷" },
    { id: "by-pfingst-25", name: "Pfingstferien", category: "school_vacation", startDate: "2025-06-10", endDate: "2025-06-20", states: ["BY"], icon: "🌿" },
    { id: "by-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-08-01", endDate: "2025-09-15", states: ["BY"], icon: "☀️" },
    // 2025/2026
    { id: "by-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-11-03", endDate: "2025-11-07", states: ["BY"], icon: "🍂" },
    { id: "by-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-05", states: ["BY"], icon: "❄️" },
    { id: "by-fruehjahr-26", name: "Frühjahrsferien (Fasching)", category: "school_vacation", startDate: "2026-02-16", endDate: "2026-02-20", states: ["BY"], icon: "🎭" },
    { id: "by-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["BY"], icon: "🌷" },
    { id: "by-pfingst-26", name: "Pfingstferien", category: "school_vacation", startDate: "2026-05-26", endDate: "2026-06-05", states: ["BY"], icon: "🌿" },
    { id: "by-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-08-03", endDate: "2026-09-14", states: ["BY"], icon: "☀️" },
    // 2026/2027
    { id: "by-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-11-02", endDate: "2026-11-06", states: ["BY"], icon: "🍂" },
    { id: "by-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-24", endDate: "2027-01-08", states: ["BY"], icon: "❄️" },
    { id: "by-fruehjahr-27", name: "Frühjahrsferien (Fasching)", category: "school_vacation", startDate: "2027-02-08", endDate: "2027-02-12", states: ["BY"], icon: "🎭" },
    { id: "by-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-02", states: ["BY"], icon: "🌷" },
    { id: "by-pfingst-27", name: "Pfingstferien", category: "school_vacation", startDate: "2027-05-18", endDate: "2027-05-28", states: ["BY"], icon: "🌿" },
    { id: "by-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-08-02", endDate: "2027-09-13", states: ["BY"], icon: "☀️" },
  ],
  BE: [
    { id: "be-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-21", endDate: "2024-11-02", states: ["BE"], icon: "🍂" },
    { id: "be-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2024-12-31", states: ["BE"], icon: "❄️" },
    { id: "be-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-03", endDate: "2025-02-08", states: ["BE"], icon: "⛷️" },
    { id: "be-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-25", states: ["BE"], icon: "🌷" },
    { id: "be-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-24", endDate: "2025-09-06", states: ["BE"], icon: "☀️" },
    { id: "be-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-20", endDate: "2025-11-01", states: ["BE"], icon: "🍂" },
    { id: "be-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-02", states: ["BE"], icon: "❄️" },
    { id: "be-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-02", endDate: "2026-02-07", states: ["BE"], icon: "⛷️" },
    { id: "be-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["BE"], icon: "🌷" },
    { id: "be-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-09", endDate: "2026-08-22", states: ["BE"], icon: "☀️" },
    { id: "be-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-19", endDate: "2026-10-31", states: ["BE"], icon: "🍂" },
    { id: "be-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-02", states: ["BE"], icon: "❄️" },
    { id: "be-winter-27", name: "Winterferien", category: "school_vacation", startDate: "2027-02-01", endDate: "2027-02-06", states: ["BE"], icon: "⛷️" },
    { id: "be-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["BE"], icon: "🌷" },
    { id: "be-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-01", endDate: "2027-08-14", states: ["BE"], icon: "☀️" },
  ],
  BB: [
    { id: "bb-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-21", endDate: "2024-11-02", states: ["BB"], icon: "🍂" },
    { id: "bb-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2024-12-31", states: ["BB"], icon: "❄️" },
    { id: "bb-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-03", endDate: "2025-02-08", states: ["BB"], icon: "⛷️" },
    { id: "bb-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-25", states: ["BB"], icon: "🌷" },
    { id: "bb-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-24", endDate: "2025-09-06", states: ["BB"], icon: "☀️" },
    { id: "bb-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-20", endDate: "2025-11-01", states: ["BB"], icon: "🍂" },
    { id: "bb-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-02", states: ["BB"], icon: "❄️" },
    { id: "bb-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-02", endDate: "2026-02-07", states: ["BB"], icon: "⛷️" },
    { id: "bb-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["BB"], icon: "🌷" },
    { id: "bb-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-09", endDate: "2026-08-22", states: ["BB"], icon: "☀️" },
    { id: "bb-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-19", endDate: "2026-10-31", states: ["BB"], icon: "🍂" },
    { id: "bb-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-02", states: ["BB"], icon: "❄️" },
    { id: "bb-winter-27", name: "Winterferien", category: "school_vacation", startDate: "2027-02-01", endDate: "2027-02-06", states: ["BB"], icon: "⛷️" },
    { id: "bb-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["BB"], icon: "🌷" },
    { id: "bb-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-01", endDate: "2027-08-14", states: ["BB"], icon: "☀️" },
  ],
  HB: [
    { id: "hb-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-04", endDate: "2024-10-19", states: ["HB"], icon: "🍂" },
    { id: "hb-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-04", states: ["HB"], icon: "❄️" },
    { id: "hb-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-03", endDate: "2025-02-04", states: ["HB"], icon: "⛷️" },
    { id: "hb-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-07", endDate: "2025-04-19", states: ["HB"], icon: "🌷" },
    { id: "hb-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-03", endDate: "2025-08-13", states: ["HB"], icon: "☀️" },
    { id: "hb-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-13", endDate: "2025-10-25", states: ["HB"], icon: "🍂" },
    { id: "hb-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-05", states: ["HB"], icon: "❄️" },
    { id: "hb-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-02", endDate: "2026-02-03", states: ["HB"], icon: "⛷️" },
    { id: "hb-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-23", endDate: "2026-04-07", states: ["HB"], icon: "🌷" },
    { id: "hb-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-02", endDate: "2026-08-12", states: ["HB"], icon: "☀️" },
    { id: "hb-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-12", endDate: "2026-10-24", states: ["HB"], icon: "🍂" },
    { id: "hb-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-09", states: ["HB"], icon: "❄️" },
    { id: "hb-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["HB"], icon: "🌷" },
    { id: "hb-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-08", endDate: "2027-08-18", states: ["HB"], icon: "☀️" },
  ],
  HH: [
    { id: "hh-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-21", endDate: "2024-11-01", states: ["HH"], icon: "🍂" },
    { id: "hh-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-20", endDate: "2025-01-03", states: ["HH"], icon: "❄️" },
    { id: "hh-fruehjahr-25", name: "Frühjahrsferien", category: "school_vacation", startDate: "2025-03-10", endDate: "2025-03-21", states: ["HH"], icon: "🌷" },
    { id: "hh-pfingst-25", name: "Pfingstferien", category: "school_vacation", startDate: "2025-05-26", endDate: "2025-05-30", states: ["HH"], icon: "🌿" },
    { id: "hh-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-24", endDate: "2025-09-03", states: ["HH"], icon: "☀️" },
    { id: "hh-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-20", endDate: "2025-10-31", states: ["HH"], icon: "🍂" },
    { id: "hh-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-17", endDate: "2026-01-02", states: ["HH"], icon: "❄️" },
    { id: "hh-fruehjahr-26", name: "Frühjahrsferien", category: "school_vacation", startDate: "2026-03-02", endDate: "2026-03-13", states: ["HH"], icon: "🌷" },
    { id: "hh-pfingst-26", name: "Pfingstferien", category: "school_vacation", startDate: "2026-05-11", endDate: "2026-05-15", states: ["HH"], icon: "🌿" },
    { id: "hh-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-09", endDate: "2026-08-19", states: ["HH"], icon: "☀️" },
    { id: "hh-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-19", endDate: "2026-10-30", states: ["HH"], icon: "🍂" },
    { id: "hh-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-21", endDate: "2027-01-01", states: ["HH"], icon: "❄️" },
    { id: "hh-fruehjahr-27", name: "Frühjahrsferien", category: "school_vacation", startDate: "2027-03-01", endDate: "2027-03-12", states: ["HH"], icon: "🌷" },
    { id: "hh-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-01", endDate: "2027-08-11", states: ["HH"], icon: "☀️" },
  ],
  HE: [
    { id: "he-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-14", endDate: "2024-10-25", states: ["HE"], icon: "🍂" },
    { id: "he-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-10", states: ["HE"], icon: "❄️" },
    { id: "he-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-07", endDate: "2025-04-21", states: ["HE"], icon: "🌷" },
    { id: "he-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-07", endDate: "2025-08-15", states: ["HE"], icon: "☀️" },
    { id: "he-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-06", endDate: "2025-10-18", states: ["HE"], icon: "🍂" },
    { id: "he-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-10", states: ["HE"], icon: "❄️" },
    { id: "he-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["HE"], icon: "🌷" },
    { id: "he-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-06-29", endDate: "2026-08-07", states: ["HE"], icon: "☀️" },
    { id: "he-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-05", endDate: "2026-10-17", states: ["HE"], icon: "🍂" },
    { id: "he-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-13", states: ["HE"], icon: "❄️" },
    { id: "he-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-02", states: ["HE"], icon: "🌷" },
    { id: "he-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-06-28", endDate: "2027-08-06", states: ["HE"], icon: "☀️" },
  ],
  MV: [
    { id: "mv-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-21", endDate: "2024-10-25", states: ["MV"], icon: "🍂" },
    { id: "mv-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-06", states: ["MV"], icon: "❄️" },
    { id: "mv-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-03", endDate: "2025-02-14", states: ["MV"], icon: "⛷️" },
    { id: "mv-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-23", states: ["MV"], icon: "🌷" },
    { id: "mv-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-28", endDate: "2025-09-06", states: ["MV"], icon: "☀️" },
    { id: "mv-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-20", endDate: "2025-10-25", states: ["MV"], icon: "🍂" },
    { id: "mv-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-05", states: ["MV"], icon: "❄️" },
    { id: "mv-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-09", endDate: "2026-02-20", states: ["MV"], icon: "⛷️" },
    { id: "mv-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-08", states: ["MV"], icon: "🌷" },
    { id: "mv-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-13", endDate: "2026-08-22", states: ["MV"], icon: "☀️" },
    { id: "mv-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-19", endDate: "2026-10-24", states: ["MV"], icon: "🍂" },
    { id: "mv-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-02", states: ["MV"], icon: "❄️" },
    { id: "mv-winter-27", name: "Winterferien", category: "school_vacation", startDate: "2027-02-08", endDate: "2027-02-19", states: ["MV"], icon: "⛷️" },
    { id: "mv-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-03-31", states: ["MV"], icon: "🌷" },
    { id: "mv-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-12", endDate: "2027-08-21", states: ["MV"], icon: "☀️" },
  ],
  NI: [
    { id: "ni-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-04", endDate: "2024-10-19", states: ["NI"], icon: "🍂" },
    { id: "ni-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-04", states: ["NI"], icon: "❄️" },
    { id: "ni-halbjahr-25", name: "Halbjahresferien", category: "school_vacation", startDate: "2025-02-03", endDate: "2025-02-04", states: ["NI"], icon: "⛷️" },
    { id: "ni-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-07", endDate: "2025-04-19", states: ["NI"], icon: "🌷" },
    { id: "ni-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-03", endDate: "2025-08-13", states: ["NI"], icon: "☀️" },
    { id: "ni-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-13", endDate: "2025-10-25", states: ["NI"], icon: "🍂" },
    { id: "ni-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-05", states: ["NI"], icon: "❄️" },
    { id: "ni-halbjahr-26", name: "Halbjahresferien", category: "school_vacation", startDate: "2026-02-02", endDate: "2026-02-03", states: ["NI"], icon: "⛷️" },
    { id: "ni-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-23", endDate: "2026-04-07", states: ["NI"], icon: "🌷" },
    { id: "ni-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-02", endDate: "2026-08-12", states: ["NI"], icon: "☀️" },
    { id: "ni-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-12", endDate: "2026-10-24", states: ["NI"], icon: "🍂" },
    { id: "ni-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-09", states: ["NI"], icon: "❄️" },
    { id: "ni-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["NI"], icon: "🌷" },
    { id: "ni-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-08", endDate: "2027-08-18", states: ["NI"], icon: "☀️" },
  ],
  NW: [
    { id: "nw-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-14", endDate: "2024-10-26", states: ["NW"], icon: "🍂" },
    { id: "nw-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-06", states: ["NW"], icon: "❄️" },
    { id: "nw-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-26", states: ["NW"], icon: "🌷" },
    { id: "nw-pfingst-25", name: "Pfingstferien", category: "school_vacation", startDate: "2025-06-10", endDate: "2025-06-10", states: ["NW"], icon: "🌿" },
    { id: "nw-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-14", endDate: "2025-08-26", states: ["NW"], icon: "☀️" },
    { id: "nw-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-13", endDate: "2025-10-25", states: ["NW"], icon: "🍂" },
    { id: "nw-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-06", states: ["NW"], icon: "❄️" },
    { id: "nw-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-11", states: ["NW"], icon: "🌷" },
    { id: "nw-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-20", endDate: "2026-09-01", states: ["NW"], icon: "☀️" },
    { id: "nw-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-12", endDate: "2026-10-24", states: ["NW"], icon: "🍂" },
    { id: "nw-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-06", states: ["NW"], icon: "❄️" },
    { id: "nw-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["NW"], icon: "🌷" },
    { id: "nw-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-19", endDate: "2027-08-31", states: ["NW"], icon: "☀️" },
  ],
  RP: [
    { id: "rp-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-14", endDate: "2024-10-25", states: ["RP"], icon: "🍂" },
    { id: "rp-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-08", states: ["RP"], icon: "❄️" },
    { id: "rp-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-25", states: ["RP"], icon: "🌷" },
    { id: "rp-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-07", endDate: "2025-08-15", states: ["RP"], icon: "☀️" },
    { id: "rp-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-13", endDate: "2025-10-24", states: ["RP"], icon: "🍂" },
    { id: "rp-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-07", states: ["RP"], icon: "❄️" },
    { id: "rp-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["RP"], icon: "🌷" },
    { id: "rp-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-06-29", endDate: "2026-08-07", states: ["RP"], icon: "☀️" },
    { id: "rp-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-05", endDate: "2026-10-16", states: ["RP"], icon: "🍂" },
    { id: "rp-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-08", states: ["RP"], icon: "❄️" },
    { id: "rp-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-02", states: ["RP"], icon: "🌷" },
    { id: "rp-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-06-28", endDate: "2027-08-06", states: ["RP"], icon: "☀️" },
  ],
  SL: [
    { id: "sl-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-14", endDate: "2024-10-25", states: ["SL"], icon: "🍂" },
    { id: "sl-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-03", states: ["SL"], icon: "❄️" },
    { id: "sl-fasching-25", name: "Fastnachtsferien", category: "school_vacation", startDate: "2025-03-03", endDate: "2025-03-07", states: ["SL"], icon: "🎭" },
    { id: "sl-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-14", endDate: "2025-04-25", states: ["SL"], icon: "🌷" },
    { id: "sl-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-07", endDate: "2025-08-15", states: ["SL"], icon: "☀️" },
    { id: "sl-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-20", endDate: "2025-10-31", states: ["SL"], icon: "🍂" },
    { id: "sl-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-02", states: ["SL"], icon: "❄️" },
    { id: "sl-fasching-26", name: "Fastnachtsferien", category: "school_vacation", startDate: "2026-02-16", endDate: "2026-02-20", states: ["SL"], icon: "🎭" },
    { id: "sl-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-10", states: ["SL"], icon: "🌷" },
    { id: "sl-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-06-29", endDate: "2026-08-07", states: ["SL"], icon: "☀️" },
    { id: "sl-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-05", endDate: "2026-10-16", states: ["SL"], icon: "🍂" },
    { id: "sl-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-04", states: ["SL"], icon: "❄️" },
    { id: "sl-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-02", states: ["SL"], icon: "🌷" },
    { id: "sl-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-06-28", endDate: "2027-08-06", states: ["SL"], icon: "☀️" },
  ],
  SN: [
    { id: "sn-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-07", endDate: "2024-10-19", states: ["SN"], icon: "🍂" },
    { id: "sn-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-03", states: ["SN"], icon: "❄️" },
    { id: "sn-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-17", endDate: "2025-03-01", states: ["SN"], icon: "⛷️" },
    { id: "sn-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-18", endDate: "2025-04-25", states: ["SN"], icon: "🌷" },
    { id: "sn-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-06-28", endDate: "2025-08-08", states: ["SN"], icon: "☀️" },
    { id: "sn-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-06", endDate: "2025-10-18", states: ["SN"], icon: "🍂" },
    { id: "sn-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-02", states: ["SN"], icon: "❄️" },
    { id: "sn-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-09", endDate: "2026-02-21", states: ["SN"], icon: "⛷️" },
    { id: "sn-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-04-03", endDate: "2026-04-10", states: ["SN"], icon: "🌷" },
    { id: "sn-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-04", endDate: "2026-08-14", states: ["SN"], icon: "☀️" },
    { id: "sn-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-12", endDate: "2026-10-24", states: ["SN"], icon: "🍂" },
    { id: "sn-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-02", states: ["SN"], icon: "❄️" },
    { id: "sn-winter-27", name: "Winterferien", category: "school_vacation", startDate: "2027-02-08", endDate: "2027-02-20", states: ["SN"], icon: "⛷️" },
    { id: "sn-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-26", endDate: "2027-04-02", states: ["SN"], icon: "🌷" },
    { id: "sn-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-10", endDate: "2027-08-20", states: ["SN"], icon: "☀️" },
  ],
  ST: [
    { id: "st-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-09-30", endDate: "2024-10-12", states: ["ST"], icon: "🍂" },
    { id: "st-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-04", states: ["ST"], icon: "❄️" },
    { id: "st-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-10", endDate: "2025-02-14", states: ["ST"], icon: "⛷️" },
    { id: "st-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-07", endDate: "2025-04-19", states: ["ST"], icon: "🌷" },
    { id: "st-pfingst-25", name: "Pfingstferien", category: "school_vacation", startDate: "2025-05-30", endDate: "2025-06-07", states: ["ST"], icon: "🌿" },
    { id: "st-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-06-28", endDate: "2025-08-08", states: ["ST"], icon: "☀️" },
    { id: "st-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-13", endDate: "2025-10-25", states: ["ST"], icon: "🍂" },
    { id: "st-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-05", states: ["ST"], icon: "❄️" },
    { id: "st-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-09", endDate: "2026-02-14", states: ["ST"], icon: "⛷️" },
    { id: "st-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-30", endDate: "2026-04-11", states: ["ST"], icon: "🌷" },
    { id: "st-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-04", endDate: "2026-08-14", states: ["ST"], icon: "☀️" },
    { id: "st-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-19", endDate: "2026-10-30", states: ["ST"], icon: "🍂" },
    { id: "st-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-08", states: ["ST"], icon: "❄️" },
    { id: "st-winter-27", name: "Winterferien", category: "school_vacation", startDate: "2027-02-08", endDate: "2027-02-13", states: ["ST"], icon: "⛷️" },
    { id: "st-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["ST"], icon: "🌷" },
    { id: "st-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-10", endDate: "2027-08-20", states: ["ST"], icon: "☀️" },
  ],
  SH: [
    { id: "sh-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-10-21", endDate: "2024-11-01", states: ["SH"], icon: "🍂" },
    { id: "sh-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-19", endDate: "2025-01-07", states: ["SH"], icon: "❄️" },
    { id: "sh-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-11", endDate: "2025-04-25", states: ["SH"], icon: "🌷" },
    { id: "sh-himmelfahrt-25", name: "Himmelfahrtstage", category: "school_vacation", startDate: "2025-05-30", endDate: "2025-05-30", states: ["SH"], icon: "🌿" },
    { id: "sh-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-07-28", endDate: "2025-09-06", states: ["SH"], icon: "☀️" },
    { id: "sh-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-20", endDate: "2025-10-30", states: ["SH"], icon: "🍂" },
    { id: "sh-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-19", endDate: "2026-01-06", states: ["SH"], icon: "❄️" },
    { id: "sh-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-03-26", endDate: "2026-04-10", states: ["SH"], icon: "🌷" },
    { id: "sh-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-04", endDate: "2026-08-15", states: ["SH"], icon: "☀️" },
    { id: "sh-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-12", endDate: "2026-10-24", states: ["SH"], icon: "🍂" },
    { id: "sh-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-08", states: ["SH"], icon: "❄️" },
    { id: "sh-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-30", endDate: "2027-04-10", states: ["SH"], icon: "🌷" },
    { id: "sh-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-03", endDate: "2027-08-14", states: ["SH"], icon: "☀️" },
  ],
  TH: [
    { id: "th-herbst-24", name: "Herbstferien", category: "school_vacation", startDate: "2024-09-30", endDate: "2024-10-12", states: ["TH"], icon: "🍂" },
    { id: "th-weihnacht-24", name: "Weihnachtsferien", category: "school_vacation", startDate: "2024-12-23", endDate: "2025-01-03", states: ["TH"], icon: "❄️" },
    { id: "th-winter-25", name: "Winterferien", category: "school_vacation", startDate: "2025-02-10", endDate: "2025-02-15", states: ["TH"], icon: "⛷️" },
    { id: "th-oster-25", name: "Osterferien", category: "school_vacation", startDate: "2025-04-07", endDate: "2025-04-19", states: ["TH"], icon: "🌷" },
    { id: "th-sommer-25", name: "Sommerferien", category: "school_vacation", startDate: "2025-06-28", endDate: "2025-08-08", states: ["TH"], icon: "☀️" },
    { id: "th-herbst-25", name: "Herbstferien", category: "school_vacation", startDate: "2025-10-06", endDate: "2025-10-18", states: ["TH"], icon: "🍂" },
    { id: "th-weihnacht-25", name: "Weihnachtsferien", category: "school_vacation", startDate: "2025-12-22", endDate: "2026-01-03", states: ["TH"], icon: "❄️" },
    { id: "th-winter-26", name: "Winterferien", category: "school_vacation", startDate: "2026-02-16", endDate: "2026-02-21", states: ["TH"], icon: "⛷️" },
    { id: "th-oster-26", name: "Osterferien", category: "school_vacation", startDate: "2026-04-07", endDate: "2026-04-17", states: ["TH"], icon: "🌷" },
    { id: "th-sommer-26", name: "Sommerferien", category: "school_vacation", startDate: "2026-07-04", endDate: "2026-08-14", states: ["TH"], icon: "☀️" },
    { id: "th-herbst-26", name: "Herbstferien", category: "school_vacation", startDate: "2026-10-12", endDate: "2026-10-24", states: ["TH"], icon: "🍂" },
    { id: "th-weihnacht-26", name: "Weihnachtsferien", category: "school_vacation", startDate: "2026-12-23", endDate: "2027-01-02", states: ["TH"], icon: "❄️" },
    { id: "th-winter-27", name: "Winterferien", category: "school_vacation", startDate: "2027-02-08", endDate: "2027-02-13", states: ["TH"], icon: "⛷️" },
    { id: "th-oster-27", name: "Osterferien", category: "school_vacation", startDate: "2027-03-22", endDate: "2027-04-03", states: ["TH"], icon: "🌷" },
    { id: "th-sommer-27", name: "Sommerferien", category: "school_vacation", startDate: "2027-07-10", endDate: "2027-08-20", states: ["TH"], icon: "☀️" },
  ],
};

// Calculate all unified holidays (vacations + public holidays) for a state across years
export function getAllHolidaysForState(state: GermanState, startYear = 2024, endYear = 2027): HolidayPeriod[] {
  const vacations = OFFICIAL_SCHOOL_VACATIONS[state] || [];
  let publicHolidays: HolidayPeriod[] = [];
  
  for (let y = startYear; y <= endYear; y++) {
    publicHolidays = publicHolidays.concat(getPublicHolidaysForYear(y, state));
  }

  // Combine and sort by start date
  const combined = [...vacations, ...publicHolidays].sort((a, b) => 
    a.startDate.localeCompare(b.startDate)
  );

  return combined;
}

// Calculate days between two dates inclusive
export function calculateDaysDuration(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

// Check if a date string falls inside any holiday
export function isDateHoliday(dateStr: string, state: GermanState): HolidayPeriod | null {
  const year = parseInt(dateStr.slice(0, 4), 10) || new Date().getFullYear();
  const allHolidays = getAllHolidaysForState(state, year - 1, year + 1);

  for (const h of allHolidays) {
    if (dateStr >= h.startDate && dateStr <= h.endDate) {
      return h;
    }
  }
  return null;
}

// Get the next upcoming or currently active holiday
export interface NextHolidayStatus {
  holiday: HolidayPeriod;
  isCurrentlyActive: boolean;
  daysRemaining: number; // days until start or days until end if active
  daysDuration: number;
}

export function getNextHolidayStatus(state: GermanState, referenceDate = new Date()): NextHolidayStatus | null {
  const todayStr = formatDateISO(referenceDate);
  const curYear = referenceDate.getFullYear();
  const all = getAllHolidaysForState(state, curYear, curYear + 2);

  // 1. Check if currently inside a holiday/vacation
  for (const h of all) {
    if (todayStr >= h.startDate && todayStr <= h.endDate) {
      const end = new Date(h.endDate);
      const remainingDays = Math.ceil((end.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return {
        holiday: h,
        isCurrentlyActive: true,
        daysRemaining: Math.max(1, remainingDays),
        daysDuration: calculateDaysDuration(h.startDate, h.endDate),
      };
    }
  }

  // 2. Otherwise find next future holiday
  const future = all.filter(h => h.startDate > todayStr);
  if (future.length === 0) return null;

  const next = future[0];
  const nextDate = new Date(next.startDate);
  const diffDays = Math.ceil((nextDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    holiday: next,
    isCurrentlyActive: false,
    daysRemaining: diffDays,
    daysDuration: calculateDaysDuration(next.startDate, next.endDate),
  };
}

// Generate iCal ICS export for all vacations of a state
export function exportHolidaysToICal(state: GermanState, stateName: string, year = new Date().getFullYear()): void {
  const holidays = getAllHolidaysForState(state, year, year + 2);
  
  let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PlanPulse//Schulferien & Feiertage//DE\nCALSCALE:GREGORIAN\n";

  holidays.forEach(h => {
    const sDate = h.startDate.replace(/-/g, "");
    // End date in iCal for full day events is non-inclusive, so add 1 day
    const e = new Date(h.endDate);
    e.setDate(e.getDate() + 1);
    const eDate = formatDateISO(e).replace(/-/g, "");

    ics += "BEGIN:VEVENT\n";
    ics += `UID:holiday-${h.id}-${state}@planpulse.local\n`;
    ics += `SUMMARY:${h.name} (${state})\n`;
    ics += `DESCRIPTION:${h.category === "school_vacation" ? "Schulferien in " + stateName : "Gesetzlicher Feiertag / Schulfrei in " + stateName} ${h.notes ? " - " + h.notes : ""}\n`;
    ics += `DTSTART;VALUE=DATE:${sDate}\n`;
    ics += `DTEND;VALUE=DATE:${eDate}\n`;
    ics += "TRANSP:TRANSPARENT\n";
    ics += "END:VEVENT\n";
  });

  ics += "END:VCALENDAR";

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Ferien-Feiertage-${state}-${year}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

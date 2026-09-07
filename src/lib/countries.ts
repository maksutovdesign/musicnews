// ISO 3166-1 alpha-2 -> display name + flag emoji.
// Only a working subset; extend as coverage grows. Unknown codes fall back to
// the raw code so the UI never breaks on a country we haven't named yet.

const NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia",
  IE: "Ireland", FR: "France", DE: "Germany", NL: "Netherlands", BE: "Belgium",
  SE: "Sweden", NO: "Norway", DK: "Denmark", FI: "Finland", IS: "Iceland",
  ES: "Spain", PT: "Portugal", IT: "Italy", GR: "Greece", PL: "Poland",
  RU: "Russia", UA: "Ukraine", JP: "Japan", KR: "South Korea", CN: "China",
  BR: "Brazil", MX: "Mexico", AR: "Argentina", CO: "Colombia", CL: "Chile",
  NG: "Nigeria", ZA: "South Africa", GH: "Ghana", KE: "Kenya", EG: "Egypt",
  IN: "India", ID: "Indonesia", PH: "Philippines", NZ: "New Zealand",
  JM: "Jamaica", CU: "Cuba", TR: "Turkey", IL: "Israel", CH: "Switzerland",
  AT: "Austria", CZ: "Czechia", HU: "Hungary", RO: "Romania", HR: "Croatia",
  SI: "Slovenia", SK: "Slovakia", BG: "Bulgaria", RS: "Serbia", EE: "Estonia",
  LV: "Latvia", LT: "Lithuania",
};

// MusicBrainz uses ISO 3166-1's "user-assigned" code range (A0, QM–QZ, XA–XZ,
// ZZ) for pseudo-areas like "[Worldwide]" that aren't real countries — e.g.
// XW. These aren't useful as a "country" filter, so we exclude them.
export function isRealCountryCode(code: string): boolean {
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return false;
  if (c === "ZZ" || c === "AA") return false;
  if (c[0] === "X" || c[0] === "Q") return false;
  return true;
}

/** Turn an ISO alpha-2 code into a flag emoji via regional indicators. */
export function flag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🏳️";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

export function countryName(code: string): string {
  return NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

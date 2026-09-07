// Canonical genre taxonomy + a normalization layer that maps the messy,
// free-form tags returned by MusicBrainz (and keywords found in article text)
// onto our stable slugs. This is the backbone of classification quality:
// filters operate on these slugs, not on raw source tags.

export interface GenreDef {
  slug: string;
  name: string;
  parent?: string; // parent slug
}

// Top-level families first, then subgenres pointing at a parent slug.
export const GENRES: GenreDef[] = [
  { slug: "rock", name: "Rock" },
  { slug: "indie-rock", name: "Indie Rock", parent: "rock" },
  { slug: "alt-rock", name: "Alternative Rock", parent: "rock" },
  { slug: "punk", name: "Punk", parent: "rock" },
  { slug: "metal", name: "Metal", parent: "rock" },
  { slug: "hard-rock", name: "Hard Rock", parent: "rock" },

  { slug: "pop", name: "Pop" },
  { slug: "synth-pop", name: "Synth-pop", parent: "pop" },
  { slug: "k-pop", name: "K-pop", parent: "pop" },
  { slug: "indie-pop", name: "Indie Pop", parent: "pop" },

  { slug: "electronic", name: "Electronic" },
  { slug: "techno", name: "Techno", parent: "electronic" },
  { slug: "house", name: "House", parent: "electronic" },
  { slug: "dnb", name: "Drum & Bass", parent: "electronic" },
  { slug: "ambient", name: "Ambient", parent: "electronic" },
  { slug: "edm", name: "EDM", parent: "electronic" },
  { slug: "dubstep", name: "Dubstep", parent: "electronic" },

  { slug: "hip-hop", name: "Hip-Hop" },
  { slug: "rap", name: "Rap", parent: "hip-hop" },
  { slug: "trap", name: "Trap", parent: "hip-hop" },

  { slug: "rnb", name: "R&B" },
  { slug: "soul", name: "Soul", parent: "rnb" },
  { slug: "funk", name: "Funk", parent: "rnb" },

  { slug: "jazz", name: "Jazz" },
  { slug: "blues", name: "Blues" },
  { slug: "classical", name: "Classical" },
  { slug: "folk", name: "Folk" },
  { slug: "country", name: "Country" },

  { slug: "reggae", name: "Reggae" },
  { slug: "reggaeton", name: "Reggaeton" },
  { slug: "latin", name: "Latin" },
  { slug: "afrobeats", name: "Afrobeats" },
  { slug: "world", name: "World" },

  { slug: "experimental", name: "Experimental" },
  { slug: "soundtrack", name: "Soundtrack" },
];

export const GENRE_BY_SLUG = new Map(GENRES.map((g) => [g.slug, g]));

// Map of raw tag/keyword -> canonical slug. Keys are lowercased.
// Extend this freely; unknown tags simply go unclassified rather than wrong.
const ALIAS_TO_SLUG: Record<string, string> = {
  rock: "rock",
  "classic rock": "rock",
  "indie rock": "indie-rock",
  indie: "indie-rock",
  "alternative rock": "alt-rock",
  alternative: "alt-rock",
  "alt-rock": "alt-rock",
  punk: "punk",
  "punk rock": "punk",
  "post-punk": "punk",
  hardcore: "punk",
  metal: "metal",
  "heavy metal": "metal",
  "death metal": "metal",
  "black metal": "metal",
  metalcore: "metal",
  "hard rock": "hard-rock",

  pop: "pop",
  "pop rock": "pop",
  "synth-pop": "synth-pop",
  synthpop: "synth-pop",
  "synth pop": "synth-pop",
  "k-pop": "k-pop",
  kpop: "k-pop",
  "indie pop": "indie-pop",

  electronic: "electronic",
  electronica: "electronic",
  idm: "electronic",
  techno: "techno",
  house: "house",
  "deep house": "house",
  "tech house": "house",
  "drum and bass": "dnb",
  "drum & bass": "dnb",
  "drum n bass": "dnb",
  dnb: "dnb",
  ambient: "ambient",
  edm: "edm",
  dubstep: "dubstep",
  trance: "electronic",

  "hip-hop": "hip-hop",
  "hip hop": "hip-hop",
  hiphop: "hip-hop",
  rap: "rap",
  trap: "trap",

  "r&b": "rnb",
  rnb: "rnb",
  "rhythm and blues": "rnb",
  soul: "soul",
  "neo-soul": "soul",
  funk: "funk",

  jazz: "jazz",
  blues: "blues",
  classical: "classical",
  orchestral: "classical",
  folk: "folk",
  "folk rock": "folk",
  americana: "folk",
  country: "country",

  reggae: "reggae",
  dub: "reggae",
  reggaeton: "reggaeton",
  latin: "latin",
  salsa: "latin",
  afrobeats: "afrobeats",
  afrobeat: "afrobeats",
  world: "world",
  "world music": "world",

  experimental: "experimental",
  "avant-garde": "experimental",
  soundtrack: "soundtrack",
  score: "soundtrack",
};

/** Normalize a single raw tag to a canonical slug, or null if unknown. */
export function normalizeGenre(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  return ALIAS_TO_SLUG[key] ?? null;
}

/**
 * Normalize a list of raw tags to canonical slugs, deduped, and expanded so
 * that a subgenre also implies its parent family (techno -> [techno, electronic]).
 */
export function normalizeGenres(raws: string[]): string[] {
  const out = new Set<string>();
  for (const raw of raws) {
    const slug = normalizeGenre(raw);
    if (!slug) continue;
    out.add(slug);
    const parent = GENRE_BY_SLUG.get(slug)?.parent;
    if (parent) out.add(parent);
  }
  return [...out];
}

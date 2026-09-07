// Music headlines are written in Title Case, so nearly every word is
// capitalized — the "run of capitalized words" heuristic in classify.ts
// can't tell "Ariana Grande" from "Manager" or "Lottery". MusicBrainz search
// then makes it worse: it happily resolves generic words to real (but
// obscure, unrelated) artists literally named "Manager" or "Live".
//
// This is a blocklist of common English words that show up in Title Case
// headlines but are essentially never how a real artist/band is referred to
// in isolation. A single-word candidate matching one of these is dropped
// before it ever reaches MusicBrainz - cheaper and more precise than trying
// to post-filter MusicBrainz's results.
export const COMMON_WORDS = new Set(
  [
    // headline/news vocabulary
    "manager", "managers", "lawsuit", "lawsuits", "sophomore", "audition",
    "auditions", "film", "films", "display", "displays", "lottery", "detail",
    "details", "centers", "center", "song", "songs", "live", "story",
    "stories", "report", "reports", "reportedly", "move", "moves", "deal",
    "deals", "case", "cases", "talk", "talks", "plan", "plans", "set", "sets",
    "return", "returns", "debut", "debuts", "career", "legacy", "icon",
    "legend", "legends", "rising", "break", "breaks", "breakup", "split",
    "reunion", "comeback", "update", "updates", "change", "changes",
    "statement", "statements", "response", "responses", "reaction",
    "reactions", "video", "videos", "track", "tracks", "single", "singles",
    "album", "albums", "record", "records", "label", "labels", "studio",
    "studios", "session", "sessions", "concert", "concerts", "gig", "gigs",
    "venue", "venues", "city", "cities", "state", "states", "country",
    "countries", "nation", "nations", "group", "groups", "band", "bands",
    "artist", "artists", "musician", "musicians", "singer", "singers",
    "songwriter", "songwriters", "producer", "producers", "director",
    "directors", "actor", "actors", "actress", "actresses", "movie", "movies",
    "series", "season", "seasons", "episode", "episodes", "award", "awards",
    "nomination", "nominations", "winner", "winners", "chart", "charts",
    "number", "ranking", "rankings", "list", "lists", "guide", "guides",
    "feature", "features", "interview", "interviews", "profile", "profiles",
    "review", "reviews", "preview", "previews", "recap", "recaps",
    "announcement", "announcements", "confirmation", "rumor", "rumors",
    "speculation", "controversy", "scandal", "drama", "feud", "feuds",
    "beef", "diss", "various", "artists", "unknown", "data", "traditional",
    "anonymous", "dialogue", "worldwide", "biopic", "biopics", "grossing",
    "west", "end", "park", "sunday", "petal", "lineup", "hospital", "july",
    "fashion", "free", "billboard", "magazine", "chartbeat", "wwe", "ai",
    "msg", "rom", "com", "amsterdam",
    "check", "higher", "machines", "mar", "matador", "nostalgia",
    "performance", "playlist", "receive", "running", "says", "singapore",
    "palestine", "reissue", "exclusive", "vinyl", "history", "claiming",
    "generated", "online", "available", "unavailable", "tribute", "photo",
    "gallery", "summer", "blue", "sky", "household", "name",
    // generic adjectives/verbs common in Title Case headlines
    "new", "old", "big", "best", "top", "now", "here", "why", "what", "who",
    "when", "where", "them", "even", "play", "black", "five", "week", "day",
    "year", "years", "show", "shows", "star", "stars", "fan",
    "fans", "team", "world", "life", "time", "times", "way", "ways", "true",
    "real", "final", "first", "last", "next", "full", "long", "short",
    "another", "every", "each", "many", "much", "more", "less", "most",
    "age", "iconic", "superstar", "progression", "expression", "self",
    "school", "back", "collab", "campaign", "shop",
    "appearance", "surprise", "ahead", "shows", "niece", "explains",
    "cancer", "diagnosis", "secret", "wanted", "worry", "anybody",
    "publicly", "debuting", "dog", "under", "wraps", "quotes",
    "documentary", "scathing",
    "chicago", "london", "paris", "tokyo", "berlin", "moscow", "brooklyn",
    "manchester", "sydney", "melbourne", "toronto", "festival", "stadium",
    // Russian headline vocabulary
    "новость", "новости", "музыка", "музыки", "музыкальный", "музыкальная",
    "песня", "песни", "песню", "альбом", "альбома", "сингл", "сингла",
    "клип", "клипа", "трек", "трека", "концерт", "концерта", "тур", "тура",
    "премьера", "премьеру", "релиз", "релиза", "видео", "слушаем",
    "смотреть", "новый", "новая", "новое", "новые", "певец", "певица",
    "певицы", "группа", "группы", "артист", "артиста", "артистка",
    "артистки", "музыкант", "музыканта", "рэпер", "рэпера", "рокер",
    "рокера", "звезда", "звезды", "шоу", "сериал", "сериала", "фильм",
    "фильма", "кино", "театр", "мода", "стиль", "россия", "москва",
    "петербург", "сегодня", "завтра", "вчера", "год", "года", "лет",
  ].map((w) => w.toLowerCase()),
);

// Phrases that MusicBrainz can resolve to real entities, but are usually
// article context rather than artist mentions when extracted from headlines.
export const COMMON_PHRASES = new Set(
  [
    "all right",
    "baby s all right",
    "day one",
    "day two",
    "day three",
    "day four",
    "night one",
    "night two",
    "night three",
    "one night only",
    "music fashion film",
    "billboard 200",
    "the band",
    "seven years",
  ].map((w) => w.toLowerCase()),
);

export const NAME_JOINERS = new Set([
  "of",
  "and",
  "the",
  "&",
  "da",
  "de",
  "del",
  "der",
  "di",
  "du",
  "la",
  "le",
  "van",
  "von",
]);

/** Known MusicBrainz placeholder/special artist MBIDs - never real acts. */
export const SPECIAL_MBIDS = new Set([
  "89ad4ac3-39f7-470e-963a-56509c546377", // Various Artists
  "125ec42a-7229-4250-afc5-e057484327fe", // [unknown]
  "33cf029c-63b0-41a0-9855-be2a3665fb3b", // [data]
  "9be7f096-97ec-4615-8957-8d40b5dcbc41", // [anonymous]
  "eec63d3c-3b81-4ad4-b1e4-95a25bc71f31", // [traditional]
  "314e1c25-dde7-4e4d-b2cc-527b18f2635d", // [dialogue]
]);

export function normalizeCandidateName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}&]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function isRejectedCandidateName(name: string): boolean {
  const normalized = normalizeCandidateName(name);
  if (!normalized) return true;
  if (COMMON_PHRASES.has(normalized)) return true;

  const words = normalized.split(/\s+/);
  if (words.every((w) => COMMON_WORDS.has(w))) return true;

  // Very short all-caps utility terms are overwhelmingly headline context.
  if (/^[A-Z]{1,3}$/.test(name.trim()) && COMMON_WORDS.has(normalized)) {
    return true;
  }

  return false;
}

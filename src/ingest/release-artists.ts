export function releaseArtistTitle(...texts: (string | null | undefined)[]) {
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/Artist\(s\)\s*:\s*(.+?)(?:\s+Label\(s\)|\s+Format\s*:|$)/i);
    const names = match?.[1]
      ?.split(",")
      .map((name) => name.trim())
      .filter((name) => name && !/^unknown artist$/i.test(name));

    if (names?.length) return names.join(", ");
  }

  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/^(.+?)\s+-\s+(.+)$/);
    const artist = match?.[1]?.trim();
    if (artist && !/^various( artists)?$/i.test(artist) && !/^unknown artist$/i.test(artist)) {
      return artist;
    }
  }

  return "";
}

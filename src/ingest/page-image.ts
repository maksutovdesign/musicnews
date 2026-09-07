const IMAGE_META_PATTERNS = [
  /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
  /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i,
  /<img[^>]+(?:class|id)=["'][^"']*(?:cover|artwork|product|release)[^"']*["'][^>]+src=["']([^"']+)["'][^>]*>/i,
  /<img[^>]+src=["']([^"']+)["'][^>]+(?:class|id)=["'][^"']*(?:cover|artwork|product|release)[^"']*["'][^>]*>/i,
];

function decodeHtmlUrl(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .trim();
}

function absolutize(src: string, pageUrl: string) {
  try {
    return new URL(decodeHtmlUrl(src), pageUrl).toString();
  } catch {
    return null;
  }
}

export async function fetchPageImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "MusicNews/0.1 (+https://maksutovdesign.ru/musicnews)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    for (const pattern of IMAGE_META_PATTERNS) {
      const match = html.match(pattern);
      const image = match?.[1] ? absolutize(match[1], pageUrl) : null;
      if (image) return image;
    }
  } catch {
    return null;
  }

  return null;
}

// Seed list of RSS sources. These are stable, publicly available music-news
// feeds. `region` is the outlet's editorial base (not the artist's country —
// article country is derived from the artists it mentions).
//
// Add feeds freely. Broadening geographic/language coverage here is how the
// project moves toward its "all countries" goal without scraping social media.

export interface SourceSeed {
  name: string;
  url: string;
  type?: "rss" | "discogs";
  category?: "news" | "release";
  quality?: "editorial" | "google" | "marketplace" | "api";
  region?: string;
  language?: string;
  includeKeywords?: string[];
  excludeKeywords?: string[];
}

const MUSIC_NEWS_INCLUDE = [
  "music", "musique", "musik", "musica", "música", "muzyka", "музык",
  "音楽", "音乐", "음악", "album", "альбом", "single", "song", "track",
  "artist", "artiste", "artista", "артист", "singer", "band", "группа",
  "rapper", "producer", "label", "release", "релиз", "premiere", "review",
];

const MUSIC_NEWS_EXCLUDE = [
  "wikipedia", "britannica", "facebook", "instagram", "tiktok", "reddit",
  "vk.com", "vkontakte", "linkedin", "pinterest", "movie", "film", "actor",
  "actress", "football", "soccer", "recipe", "restaurant", "ticket",
  "tickets", "билет", "билеты", "free ticket", "theater", "theatre",
  "exhibition", "air show", "kite", "workshop", "classes",
];

const GOOGLE_NEWS_COUNTRIES = [
  { code: "US", label: "United States", hl: "en-US", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer OR band" },
  { code: "GB", label: "United Kingdom", hl: "en-GB", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer OR band" },
  { code: "CA", label: "Canada", hl: "en-CA", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer OR band" },
  { code: "AU", label: "Australia", hl: "en-AU", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer OR band" },
  { code: "IE", label: "Ireland", hl: "en-IE", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer OR band" },
  { code: "ZA", label: "South Africa", hl: "en-ZA", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer OR band" },
  { code: "NG", label: "Nigeria", hl: "en-NG", lang: "en", q: "music OR afrobeats OR album OR artist OR concert OR festival" },
  { code: "IN", label: "India", hl: "en-IN", lang: "en", q: "music OR bollywood OR album OR singer OR concert OR festival" },
  { code: "SG", label: "Singapore", hl: "en-SG", lang: "en", q: "music OR album OR artist OR concert OR festival" },
  { code: "PH", label: "Philippines", hl: "en-PH", lang: "en", q: "music OR album OR artist OR singer OR concert OR festival" },
  { code: "RU", label: "Russia", hl: "ru", lang: "ru", q: "музыка OR альбом OR артист OR концерт OR фестиваль OR группа OR певец" },
  { code: "UA", label: "Ukraine", hl: "uk", lang: "uk", q: "музика OR альбом OR артист OR концерт OR фестиваль OR гурт" },
  { code: "KZ", label: "Kazakhstan", hl: "ru", lang: "ru", q: "музыка OR альбом OR артист OR концерт OR фестиваль OR группа" },
  { code: "BY", label: "Belarus", hl: "ru", lang: "ru", q: "музыка OR альбом OR артист OR концерт OR фестиваль OR группа" },
  { code: "FR", label: "France", hl: "fr", lang: "fr", q: "musique OR album OR artiste OR concert OR festival OR chanteur" },
  { code: "BE", label: "Belgium", hl: "fr", lang: "fr", q: "musique OR album OR artiste OR concert OR festival" },
  { code: "CH", label: "Switzerland", hl: "de", lang: "de", q: "musik OR album OR kuenstler OR konzert OR festival" },
  { code: "DE", label: "Germany", hl: "de", lang: "de", q: "musik OR album OR kuenstler OR konzert OR festival OR band" },
  { code: "AT", label: "Austria", hl: "de", lang: "de", q: "musik OR album OR kuenstler OR konzert OR festival OR band" },
  { code: "NL", label: "Netherlands", hl: "nl", lang: "nl", q: "muziek OR album OR artiest OR concert OR festival OR band" },
  { code: "SE", label: "Sweden", hl: "sv", lang: "sv", q: "musik OR album OR artist OR konsert OR festival OR band" },
  { code: "NO", label: "Norway", hl: "no", lang: "no", q: "musikk OR album OR artist OR konsert OR festival OR band" },
  { code: "DK", label: "Denmark", hl: "da", lang: "da", q: "musik OR album OR kunstner OR koncert OR festival OR band" },
  { code: "FI", label: "Finland", hl: "fi", lang: "fi", q: "musiikki OR albumi OR artisti OR konsertti OR festivaali" },
  { code: "PL", label: "Poland", hl: "pl", lang: "pl", q: "muzyka OR album OR artysta OR koncert OR festiwal OR zespół" },
  { code: "CZ", label: "Czechia", hl: "cs", lang: "cs", q: "hudba OR album OR umělec OR koncert OR festival OR kapela" },
  { code: "ES", label: "Spain", hl: "es", lang: "es", q: "música OR album OR artista OR concierto OR festival OR cantante" },
  { code: "MX", label: "Mexico", hl: "es-419", lang: "es-419", q: "música OR álbum OR artista OR concierto OR festival OR cantante" },
  { code: "AR", label: "Argentina", hl: "es-419", lang: "es-419", q: "música OR álbum OR artista OR concierto OR festival OR cantante" },
  { code: "CL", label: "Chile", hl: "es-419", lang: "es-419", q: "música OR álbum OR artista OR concierto OR festival OR cantante" },
  { code: "CO", label: "Colombia", hl: "es-419", lang: "es-419", q: "música OR álbum OR artista OR concierto OR festival OR cantante" },
  { code: "IT", label: "Italy", hl: "it", lang: "it", q: "musica OR album OR artista OR concerto OR festival OR cantante" },
  { code: "PT", label: "Portugal", hl: "pt-PT", lang: "pt-PT", q: "música OR álbum OR artista OR concerto OR festival OR cantor" },
  { code: "BR", label: "Brazil", hl: "pt-BR", lang: "pt-BR", q: "música OR álbum OR artista OR show OR festival OR cantor" },
  { code: "JP", label: "Japan", hl: "ja", lang: "ja", q: "音楽 OR アルバム OR アーティスト OR ライブ OR フェス" },
  { code: "KR", label: "South Korea", hl: "ko", lang: "ko", q: "음악 OR 앨범 OR 아티스트 OR 콘서트 OR 페스티벌 OR 가수" },
  { code: "CN", label: "China", hl: "zh-CN", lang: "zh-CN", q: "音乐 OR 专辑 OR 歌手 OR 演唱会 OR 音乐节" },
  { code: "HK", label: "Hong Kong", hl: "zh-HK", lang: "zh-HK", q: "音樂 OR 專輯 OR 歌手 OR 演唱會 OR 音樂節" },
  { code: "TW", label: "Taiwan", hl: "zh-TW", lang: "zh-TW", q: "音樂 OR 專輯 OR 歌手 OR 演唱會 OR 音樂節" },
  { code: "ID", label: "Indonesia", hl: "id", lang: "id", q: "musik OR album OR artis OR konser OR festival OR penyanyi" },
  { code: "TH", label: "Thailand", hl: "th", lang: "th", q: "เพลง OR อัลบั้ม OR ศิลปิน OR คอนเสิร์ต OR เทศกาลดนตรี" },
  { code: "TR", label: "Turkey", hl: "tr", lang: "tr", q: "müzik OR albüm OR sanatçı OR konser OR festival OR şarkıcı" },
  { code: "IL", label: "Israel", hl: "he", lang: "he", q: "מוזיקה OR אלבום OR אמן OR הופעה OR פסטיבל" },
  { code: "AE", label: "United Arab Emirates", hl: "en-AE", lang: "en", q: "music OR album OR artist OR concert OR festival OR singer" },
  { code: "SA", label: "Saudi Arabia", hl: "ar", lang: "ar", q: "موسيقى OR ألبوم OR فنان OR حفلة OR مهرجان" },
  { code: "EG", label: "Egypt", hl: "ar", lang: "ar", q: "موسيقى OR ألبوم OR فنان OR حفلة OR مهرجان" },
  { code: "MA", label: "Morocco", hl: "ar", lang: "ar", q: "موسيقى OR ألبوم OR فنان OR حفلة OR مهرجان" },
];

function googleNewsUrl(country: (typeof GOOGLE_NEWS_COUNTRIES)[number]) {
  const params = new URLSearchParams({
    q: `(${country.q}) when:7d`,
    hl: country.hl,
    gl: country.code,
    ceid: `${country.code}:${country.lang}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

const GOOGLE_MUSIC_NEWS_SOURCES: SourceSeed[] = GOOGLE_NEWS_COUNTRIES.map((country) => ({
  name: `Google News Music ${country.label}`,
  url: googleNewsUrl(country),
  region: country.code,
  language: country.lang,
  quality: "google",
  includeKeywords: MUSIC_NEWS_INCLUDE,
  excludeKeywords: MUSIC_NEWS_EXCLUDE,
}));

const DISCOGS_COUNTRY_RELEASES = [
  "United States", "United Kingdom", "Germany", "France", "Japan", "Italy",
  "Spain", "Brazil", "Canada", "Australia", "Netherlands", "Sweden",
  "Norway", "Finland", "Poland", "Russia", "Ukraine", "Mexico", "Argentina",
  "South Korea",
];

const DISCOGS_FORMATS = ["Vinyl", "CD", "Cassette"];

const DISCOGS_COUNTRY_RELEASE_SOURCES: SourceSeed[] = DISCOGS_COUNTRY_RELEASES.flatMap(
  (country) =>
    DISCOGS_FORMATS.map((format) => ({
      name: `Discogs ${country} ${format}`,
      type: "discogs",
      url: `https://api.discogs.com/database/search?type=release&format=${encodeURIComponent(format)}&country=${encodeURIComponent(country)}&sort=year&sort_order=desc&per_page=25`,
      category: "release",
      quality: "api",
      region: undefined,
      language: "en",
    })),
);

export const RSS_SOURCES: SourceSeed[] = [
  { name: "Pitchfork", url: "https://pitchfork.com/rss/news/", region: "US", language: "en" },
  {
    name: "Stereogum",
    url: "https://www.stereogum.com/feed/",
    region: "US",
    language: "en",
    excludeKeywords: [
      "burning man", "homicide", "medical emergency", "weather",
    ],
  },
  {
    name: "Consequence",
    url: "https://consequence.net/feed/",
    region: "US",
    language: "en",
    excludeKeywords: [
      "bruce campbell", "evil dead", "cancer", "film", "movie", "actor",
      "actress", "tv", "trailer",
    ],
  },
  {
    name: "Billboard",
    url: "https://www.billboard.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "song", "album", "single", "track", "concert", "singer",
      "band", "artist", "rapper", "festival", "chart", "billboard 200",
      "hot 100",
    ],
    excludeKeywords: [
      "shop", "fashion", "product", "film", "tv", "actress", "actor",
      "zombies", "campaign", "back-to-school", "burning man",
      "medical emergency", "homicide",
    ],
  },
  { name: "Rolling Stone Music", url: "https://www.rollingstone.com/music/music-news/feed/", region: "US", language: "en" },
  { name: "NME", url: "https://www.nme.com/news/music/feed", region: "GB", language: "en" },
  { name: "The Quietus", url: "https://thequietus.com/feed", region: "GB", language: "en" },
  { name: "Resident Advisor", url: "https://feeds.feedburner.com/RaNews", region: "GB", language: "en" },
  { name: "Brooklyn Vegan", url: "https://www.brooklynvegan.com/feed/", region: "US", language: "en" },
  {
    name: "AllMusic",
    url: "https://www.allmusic.com/rss",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "album", "song", "single", "track", "artist", "band",
      "singer", "composer", "record", "playlist", "review",
    ],
  },
  {
    name: "NPR All Songs Considered",
    url: "https://feeds.npr.org/15709577/rss.xml",
    region: "US",
    language: "en",
    includeKeywords: [
      "song", "songs", "album", "music", "artist", "band", "concert",
      "tiny desk", "playlist", "track",
    ],
  },
  {
    name: "A&R Factory",
    url: "https://www.anrfactory.com/feed/?format=xml",
    region: "GB",
    language: "en",
    includeKeywords: [
      "song", "single", "album", "track", "artist", "band", "producer",
      "rock", "pop", "rap", "electronic", "r&b", "indie",
    ],
  },
  {
    name: "Nialler9",
    url: "https://feeds.feedburner.com/nialler9/rss",
    region: "IE",
    language: "en",
    includeKeywords: [
      "song", "album", "track", "music", "artist", "band", "gig",
      "festival", "playlist", "single",
    ],
  },
  {
    name: "Obscure Sound",
    url: "https://feeds.feedburner.com/ObscureSound",
    region: "US",
    language: "en",
    includeKeywords: [
      "song", "album", "track", "artist", "band", "single", "premiere",
      "rock", "pop", "electronic", "indie",
    ],
  },
  {
    name: "Alternative Press",
    url: "https://www.altpress.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "song", "album", "track", "artist", "band", "rock", "punk",
      "metal", "tour", "festival", "single",
    ],
    excludeKeywords: ["movie", "film", "actor", "actress", "trailer"],
  },
  {
    name: "uDiscover Music",
    url: "https://www.udiscovermusic.com/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "music", "album", "song", "single", "track", "artist", "band",
      "vinyl", "anniversary", "tour", "video",
    ],
    excludeKeywords: ["shop", "merch", "fashion"],
  },
  {
    name: "EARMILK",
    url: "https://earmilk.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "song", "single", "album", "track", "artist", "producer", "band",
      "video", "premiere", "listen",
    ],
  },
  {
    name: "Gorilla vs. Bear",
    url: "https://www.gorillavsbear.net/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "song", "album", "track", "artist", "band", "video", "mix",
      "listen", "premiere",
    ],
  },
  {
    name: "The Vinyl District",
    url: "https://www.thevinyldistrict.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "vinyl", "record", "album", "music", "artist", "band", "reissue",
      "pressing", "turntable",
    ],
  },
  {
    name: "Country Music News Blog",
    url: "https://countrymusicnewsblog.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "country", "music", "song", "album", "single", "artist", "band",
      "tour", "concert", "festival",
    ],
  },
  {
    name: "EDM Sauce",
    url: "https://www.edmsauce.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "edm", "music", "track", "song", "album", "single", "artist",
      "producer", "dj", "festival", "electronic",
    ],
  },
  {
    name: "No Depression",
    url: "https://www.nodepression.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "song", "album", "artist", "band", "folk", "country",
      "americana", "bluegrass", "roots",
    ],
  },
  {
    name: "No Treble",
    url: "https://www.notreble.com/buzz/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "bass", "bassist", "music", "album", "song", "track", "artist",
      "band", "tour", "gear",
    ],
  },
  {
    name: "LouderSound",
    url: "https://www.loudersound.com/feeds.xml",
    region: "GB",
    language: "en",
    includeKeywords: [
      "music", "album", "song", "single", "track", "band", "artist",
      "metal", "rock", "prog", "punk", "tour", "festival",
    ],
  },
  {
    name: "Metal Injection",
    url: "https://metalinjection.net/feed",
    region: "US",
    language: "en",
    includeKeywords: [
      "metal", "album", "song", "single", "track", "band", "artist",
      "tour", "festival", "guitar", "drummer", "vocalist",
    ],
  },
  {
    name: "The FADER",
    url: "https://www.thefader.com/feed.rss",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "album", "song", "single", "track", "artist", "rapper",
      "producer", "band", "video", "listen", "watch",
    ],
  },
  {
    name: "FACT",
    url: "https://www.factmag.com/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "music", "album", "track", "artist", "producer", "electronic",
      "sound", "mix", "release",
    ],
  },
  {
    name: "XLR8R",
    url: "https://xlr8r.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "track", "album", "artist", "producer", "premiere",
      "electronic", "techno", "house", "release",
    ],
  },
  {
    name: "The Guardian Music",
    url: "https://www.theguardian.com/music/rss",
    region: "GB",
    language: "en",
    includeKeywords: [
      "music", "album", "song", "single", "track", "artist", "band",
      "singer", "rapper", "composer", "review", "gig", "festival",
    ],
    excludeKeywords: ["film", "movie", "actor", "actress", "book"],
  },
  {
    name: "Blabbermouth",
    url: "https://blabbermouth.net/feed",
    region: "US",
    language: "en",
    includeKeywords: [
      "metal", "rock", "album", "song", "single", "track", "band",
      "artist", "tour", "festival", "guitarist", "drummer", "vocalist",
    ],
  },
  {
    name: "MetalSucks",
    url: "https://www.metalsucks.net/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "metal", "album", "song", "single", "track", "band", "artist",
      "tour", "festival", "guitar", "drummer", "vocalist",
    ],
  },
  {
    name: "Run The Trap",
    url: "https://runthetrap.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "track", "single", "album", "ep", "artist", "producer",
      "dj", "trap", "edm", "hip-hop", "premiere", "listen",
    ],
  },
  {
    name: "Underground Hip Hop Blog",
    url: "https://undergroundhiphopblog.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "hip hop", "rap", "album", "song", "single", "track", "artist",
      "producer", "mc", "video", "premiere",
    ],
  },
  {
    name: "Nagamag",
    url: "https://www.nagamag.com/feed/",
    region: "GR",
    language: "en",
    includeKeywords: [
      "review", "music", "song", "single", "album", "track", "artist",
      "band", "producer", "jazz", "electronic", "indie",
    ],
  },
  {
    name: "Turntable Thoughts",
    url: "https://turntablethought.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "review", "music", "song", "single", "album", "track", "artist",
      "band", "producer",
    ],
  },
  {
    name: "Turtle Tempo",
    url: "https://turtletempo.co.uk/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "music", "song", "single", "album", "track", "artist", "band",
      "indie", "alternative", "tour",
    ],
  },
  {
    name: "2 Loud 2 Old Music",
    url: "https://2loud2oldmusic.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "music", "album", "song", "single", "track", "artist", "band",
      "new releases", "review", "rock", "metal", "pop",
    ],
  },
  {
    name: "Attack Magazine",
    url: "https://www.attackmagazine.com/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "music", "electronic", "techno", "house", "producer", "artist",
      "track", "album", "synth", "drum machine", "studio",
    ],
  },
  {
    name: "DJ Mag",
    url: "https://djmag.com/feed",
    region: "GB",
    language: "en",
    includeKeywords: [
      "dj", "music", "track", "album", "single", "artist", "producer",
      "electronic", "techno", "house", "festival", "club",
    ],
  },
  {
    name: "Record Collector Magazine",
    url: "https://recordcollectormag.com/feed",
    region: "GB",
    language: "en",
    includeKeywords: [
      "record", "vinyl", "album", "music", "artist", "band", "collector",
      "reissue", "pressing", "box set",
    ],
  },
  {
    name: "Every Record Tells A Story",
    url: "https://everyrecordtellsastory.com/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "record", "vinyl", "album", "music", "artist", "band", "song",
      "reissue", "review",
    ],
  },
  {
    name: "Sound Matters",
    url: "https://www.yoursoundmatters.com/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "vinyl", "record", "album", "turntable", "pressing", "music",
      "sound", "hi-fi", "hifi", "reissue",
    ],
  },
  {
    name: "Flea Market Funk",
    url: "https://fleamarketfunk.com/feed/",
    region: "US",
    language: "en",
    includeKeywords: [
      "record", "vinyl", "music", "funk", "soul", "jazz", "album",
      "artist", "dj", "mix",
    ],
  },
  {
    name: "EIL Blog",
    url: "https://blog.eil.com/feed/",
    region: "GB",
    language: "en",
    includeKeywords: [
      "vinyl", "record", "album", "cd", "cassette", "single", "box set",
      "pressing", "collector", "music",
    ],
  },
  { name: "Zvuki.ru", url: "https://www.zvuki.ru/rss/headings.rss", region: "RU", language: "ru" },
  {
    name: "Toolbox Records",
    url: "https://www.toolboxrecords.com/en/rss",
    category: "release",
    region: "FR",
    language: "en",
    includeKeywords: [
      "format :12", "format :10", "format :7", "format :lp", "format :2lp",
      "format :cd", "format :cassette", "vinyl", "compact disc", "tape",
      "record", "records",
    ],
  },
  {
    name: "Timewarp Records New Products",
    url: "https://timewarp.mybigcommerce.com/rss.php?action=newproducts&type=rss",
    category: "release",
    region: "US",
    language: "en",
    includeKeywords: [
      "lp", "vinyl", "7\"", "10\"", "12\"", "cd", "cassette", "tape",
      "record", "records",
    ],
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Cassette",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=cassette&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp CD",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=compact-disc&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Electronic Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=electronic-vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Techno Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=techno-vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Metal Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=metal-vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Hip-Hop Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=hip-hop-vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Punk Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=punk-vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Bandcamp Jazz Vinyl",
    url: "https://rss.alex.balgavy.eu/?action=display&bridge=Bandcamp&context=By%20tag&tag=jazz-vinyl&format=Atom",
    category: "release",
    region: "US",
    language: "en",
    excludeKeywords: ["t-shirt", "shirt", "hoodie", "poster", "sticker", "slipmat", "patch"],
  },
  {
    name: "Discogs Vinyl",
    type: "discogs",
    url: "https://api.discogs.com/database/search?type=release&format=Vinyl&sort=year&sort_order=desc&per_page=50",
    category: "release",
    region: "US",
    language: "en",
  },
  {
    name: "Discogs CD",
    type: "discogs",
    url: "https://api.discogs.com/database/search?type=release&format=CD&sort=year&sort_order=desc&per_page=50",
    category: "release",
    region: "US",
    language: "en",
  },
  {
    name: "Discogs Cassette",
    type: "discogs",
    url: "https://api.discogs.com/database/search?type=release&format=Cassette&sort=year&sort_order=desc&per_page=50",
    category: "release",
    region: "US",
    language: "en",
  },
  {
    name: "InterMedia Music",
    url: "https://www.intermedia.ru/rss/news",
    region: "RU",
    language: "ru",
    includeKeywords: [
      "музык", "песн", "альбом", "сингл", "клип", "трек", "концерт",
      "пев", "группа", "артист", "музыкант", "рэп", "рок", "джаз",
      "поп", "шансон", "опера", "фестиваль", "чарт", "премия",
      "music", "song", "album", "single", "track", "concert", "singer",
      "band", "artist", "rapper", "festival", "chart",
    ],
    excludeKeywords: [
      "сериал", "фильм", "кино", "трейлер", "театр", "мода", "стиль",
      "актер", "актриса", "актрисы", "актеры", "прокат", "бойфренд",
      "мамой", "мама", "родила", "ребенок",
    ],
  },
  ...GOOGLE_MUSIC_NEWS_SOURCES,
  ...DISCOGS_COUNTRY_RELEASE_SOURCES,
];

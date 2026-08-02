const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

const DIR = path.join(__dirname, "..", "..", "content", "gallery");

// OpenStreetMap's free geocoding endpoint — no API key, but its usage
// policy (https://operations.osmfoundation.org/policies/nominatim/)
// requires a descriptive User-Agent and caps requests at ~1/second, so
// lookups below are done one at a time with a short delay between them,
// not in parallel.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  "candice-chieh-site-build/1.0 (+https://github.com/Chiehx0220/Candice-Chieh)";

function formatShort(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Turns a free-text place name (e.g. "京都 清水寺") into {lat, lng}. Returns
// null — never throws — on no match or a network/API failure, so one bad
// or unreachable lookup just leaves that photo off the map instead of
// failing the entire site build.
async function geocode(place) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(place)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "zh-TW" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = await res.json();
    if (!results.length) return null;
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
  } catch (err) {
    console.warn(`[gallery] geocoding failed for "${place}": ${err.message}`);
    return null;
  }
}

async function buildGalleryData() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));

  const items = files.map((file) => {
    const raw = fs.readFileSync(path.join(DIR, file), "utf8");
    const { data } = matter(raw);
    // Same defensive fallback as diary.js: a missing/invalid date sorts as
    // "now" instead of producing NaN comparisons or crashing the sort.
    const parsedDate = new Date(data.date);
    const date = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    return {
      slug: file.replace(/\.md$/, ""),
      title: data.title,
      category: data.category,
      imageUrl: data.imageUrl,
      // Not a CMS field — fall back to caption/title (both required)
      // instead of asking for a separate hand-written alt text per photo.
      alt: data.alt || data.caption || data.title,
      caption: data.caption,
      date,
      shortDate: formatShort(date),
      location: data.location || "",
    };
  });

  // Geocode each distinct place name once at build time — the built site
  // ships plain lat/lng, so viewing the map never calls out to any
  // external API itself. Same place name reused across several photos
  // (e.g. several 京都 清水寺 photos) is only looked up once.
  const cache = new Map();
  for (const item of items) {
    if (!item.location) continue;
    if (!cache.has(item.location)) {
      cache.set(item.location, await geocode(item.location));
      await sleep(1000);
    }
    const coords = cache.get(item.location);
    if (coords) {
      item.lat = coords.lat;
      item.lng = coords.lng;
    }
  }

  // 新到舊排序，跟首頁/日記列表一致 —— 首頁「相片牆」預覽區直接取前 6 筆。
  items.sort((a, b) => b.date - a.date);
  return items;
}

// Memoized: src/_data/memories.js and latestGalleryDate.js each also
// call this directly (on top of Eleventy calling it for the `gallery`
// global data key itself) — without caching the promise, the geocoding
// pass above would redo every lookup 3x per build.
let cachedPromise = null;

module.exports = function () {
  if (!cachedPromise) cachedPromise = buildGalleryData();
  return cachedPromise;
};

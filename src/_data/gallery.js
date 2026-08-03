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
// Soft regional bias, not a hard filter — same box as js/gallery-map.js's
// TAIWAN_BOUNDS and src/admin/location-widget.js's TAIWAN_VIEWBOX, kept
// in sync with the CMS's own suggestion dropdown so a name typed by hand
// (bypassing the dropdown) resolves the same way the suggestion for it
// would have. `bounded=0` keeps this a preference, not an exclusion, so
// an overseas trip photo's location is still geocodable.
const TAIWAN_VIEWBOX = "119.0,25.6,122.3,21.5";

function formatShort(date) {
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Lets the same "拍攝地點" field take a raw "lat, lng" pair (e.g. from
// long-pressing a spot in Google Maps and copying its coordinates)
// instead of a place name — useful when a name is ambiguous or too
// obscure for Nominatim to find. Returns null for anything that isn't
// exactly two comma-separated numbers in valid lat/lng range, so a real
// place name always falls through to geocode() below untouched.
function parseCoordinates(str) {
  const match = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(str);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

// Turns a free-text place name (e.g. "京都 清水寺") into {lat, lng}. Returns
// null — never throws — on no match or a network/API failure, so one bad
// or unreachable lookup just leaves that photo off the map instead of
// failing the entire site build.
async function geocode(place) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&viewbox=${TAIWAN_VIEWBOX}&bounded=0&q=${encodeURIComponent(place)}`;

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
      // A raw "lat, lng" pair skips geocoding entirely — no network
      // call, no rate-limit delay, and no dependency on Nominatim being
      // able to find that exact spot.
      const direct = parseCoordinates(item.location);
      if (direct) {
        cache.set(item.location, direct);
      } else {
        cache.set(item.location, await geocode(item.location));
        await sleep(1000);
      }
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

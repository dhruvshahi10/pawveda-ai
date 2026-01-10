import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 8787);
const MAX_URLS = 40;
const REQUEST_TIMEOUT_MS = 6500;
const MAX_TEXT_CHARS = 12000;
const OSM_RADIUS_METERS = 7000;
const GOOGLE_CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY || "";
const GOOGLE_CSE_CX = process.env.GOOGLE_CSE_CX || "";
const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY || "";
const OPENAQ_LOCATION_MAP = {
  delhi: 2157,
  mumbai: 2174,
  bengaluru: 2178,
  bangalore: 2178,
  pune: 2179,
  chennai: 2176,
  hyderabad: 2175,
  kolkata: 2177,
  ahmedabad: 2173
};
const LOCAL_ALLOWLIST = [
  // Add city-specific outlets here over time.
];

const CORE_NEWS_ALLOWLIST = [
  "thehindu.com",
  "indianexpress.com",
  "hindustantimes.com",
  "indiatoday.in",
  "theprint.in",
  "livemint.com",
  "bbc.com",
  "reuters.com",
  "apnews.com",
  "who.int",
  "cdc.gov",
  "oie.int",
  "mohfw.gov.in",
  "icmr.gov.in"
];

const FORUM_ALLOWLIST = [
  "reddit.com",
  "quora.com",
  "dogforum.com",
  "petforums.co.uk",
  "catsite.com",
  "thecatsite.com"
];

const CENTRES_ALLOWLIST = [
  "practo.com",
  "justdial.com",
  "sulekha.com",
  "google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "facebook.com"
];

const DENY_HOSTS = new Set([
  "news.google.com",
  "www.google.com",
  "google.com"
]);

const isRedirectUrl = (url) => {
  try {
    const parsed = new URL(url);
    if (DENY_HOSTS.has(parsed.hostname)) {
      return parsed.pathname === "/url" || parsed.pathname === "/search";
    }
    return false;
  } catch {
    return true;
  }
};

const POSITIVE_KEYWORDS = {
  news: [
    "pet", "pets", "dog", "dogs", "cat", "cats", "puppy", "puppies", "kitten",
    "animal welfare", "rabies", "parvo", "canine", "feline", "veterinary",
    "vaccination", "adoption", "stray", "rescue", "animal shelter", "pet care"
  ],
  centres: [
    "vet", "veterinary", "pet clinic", "animal hospital", "grooming",
    "pet hospital", "pet clinic", "boarding", "kennel"
  ]
};

const NEGATIVE_KEYWORDS = [
  "cricket", "ipl", "match", "football", "sports", "politics", "election",
  "stock", "finance", "bollywood", "celebrity", "movie", "entertainment",
  "technology", "smartphone", "bank", "loan", "market", "real estate"
];

const extractMeta = (html, regex) => {
  const match = html.match(regex);
  return match ? match[1].trim() : "";
};

const extractPageText = (html) => {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return stripped.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
};

const hostMatches = (host, domain) =>
  host === domain || host.endsWith(`.${domain}`);

const allowlistForCategory = (category) => {
  if (category === "centres") return CENTRES_ALLOWLIST;
  return [...CORE_NEWS_ALLOWLIST, ...LOCAL_ALLOWLIST, ...FORUM_ALLOWLIST];
};

const isAllowedHost = (url, category) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const allowlist = allowlistForCategory(category);
    const allowed = allowlist.some((domain) => hostMatches(host, domain));
    if (!allowed) return false;
    if (category === "centres" && hostMatches(host, "google.com")) {
      return parsed.pathname.startsWith("/maps") || parsed.hostname.startsWith("maps.");
    }
    return true;
  } catch {
    return false;
  }
};

const isRelevant = (category, html, finalUrl) => {
  if (!html) return false;
  const lowerHtml = html.toLowerCase();
  const lowerUrl = (finalUrl || "").toLowerCase();
  const title = extractMeta(lowerHtml, /<title[^>]*>([^<]+)<\/title>/i);
  const description = extractMeta(
    lowerHtml,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i
  );
  const text = extractPageText(lowerHtml);
  const haystack = `${title} ${description} ${text} ${lowerUrl}`;

  for (const bad of NEGATIVE_KEYWORDS) {
    if (haystack.includes(bad)) return false;
  }

  const positives = POSITIVE_KEYWORDS[category] || POSITIVE_KEYWORDS.news;
  const hits = positives.filter((term) => haystack.includes(term));
  if (category === "centres") {
    return hits.length >= 1;
  }
  return hits.length >= 2;
};

const withTimeout = async (promise, ms, controller) => {
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await promise;
  } finally {
    clearTimeout(timeout);
  }
};

const jsonResponse = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

const fetchJson = async (url, options = {}) => {
  const controller = new AbortController();
  const response = await withTimeout(
    fetch(url, { ...options, signal: controller.signal }),
    REQUEST_TIMEOUT_MS,
    controller
  );
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const normalizeCity = (city = "") => city.trim().toLowerCase();

const geocodeCity = async (city) => {
  if (!city) return null;
  const query = encodeURIComponent(`${city}, India`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;
  const data = await fetchJson(url, {
    headers: { "User-Agent": "PawvedaGeo/1.0 (contact@pawveda.ai)" }
  });
  if (!Array.isArray(data) || !data.length) return null;
  const result = data[0];
  return { lat: Number(result.lat), lon: Number(result.lon), displayName: result.display_name || city };
};

const buildAddress = (tags = {}) => {
  const parts = [
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:state"]
  ].filter(Boolean);
  return parts.join(", ");
};

const toServiceType = (tags = {}) => {
  if (tags.amenity === "veterinary") return "Vet Clinic";
  if (tags.amenity === "animal_shelter") return "Animal Shelter";
  if (tags.amenity === "kennel") return "Boarding / Kennel";
  if (tags.shop === "pet") return "Pet Store";
  if (tags.shop === "pet_grooming") return "Groomer";
  return "Pet Service";
};

const fetchNearbyServices = async (city) => {
  const geo = await geocodeCity(city);
  if (!geo) return [];
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"="veterinary"](around:${OSM_RADIUS_METERS},${geo.lat},${geo.lon});
      node["amenity"="animal_shelter"](around:${OSM_RADIUS_METERS},${geo.lat},${geo.lon});
      node["amenity"="kennel"](around:${OSM_RADIUS_METERS},${geo.lat},${geo.lon});
      node["shop"="pet"](around:${OSM_RADIUS_METERS},${geo.lat},${geo.lon});
      node["shop"="pet_grooming"](around:${OSM_RADIUS_METERS},${geo.lat},${geo.lon});
    );
    out body 40;
  `;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const data = await fetchJson(url);
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const seen = new Set();
  const services = elements
    .map((element) => {
      const name = element.tags?.name;
      const address = buildAddress(element.tags);
      const key = `${name}-${address}`;
      if (seen.has(key)) return null;
      seen.add(key);
      if (!name) return null;
      const locality = element.tags?.["addr:suburb"] || element.tags?.["addr:city"] || city;
      const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${address || city}`)}`;
      return {
        id: `${element.id}`,
        name,
        type: toServiceType(element.tags),
        address: address || geo.displayName,
        locality,
        link: element.tags?.website || googleMapsLink,
        googleMapsLink,
        lat: element.lat,
        lon: element.lon,
        hasWebsite: Boolean(element.tags?.website || element.tags?.phone),
        source: "OpenStreetMap"
      };
    })
    .filter(Boolean);
  return services
    .sort((a, b) => Number(b.hasWebsite) - Number(a.hasWebsite))
    .slice(0, 12);
};

const classifyAirQuality = (pm25) => {
  if (pm25 === null || Number.isNaN(pm25)) {
    return { label: "Unknown", status: "Monitor", advice: "Check again later for updated readings." };
  }
  if (pm25 <= 30) return { label: "Good", status: "Open Air", advice: "Safe for long walks." };
  if (pm25 <= 60) return { label: "Moderate", status: "Caution", advice: "Limit intense activity outdoors." };
  if (pm25 <= 90) return { label: "Unhealthy", status: "Short Walks", advice: "Prefer shaded, shorter walks." };
  if (pm25 <= 120) return { label: "Very Unhealthy", status: "Avoid Peak", advice: "Keep outdoor time brief." };
  return { label: "Hazardous", status: "Indoor Only", advice: "Avoid outdoor activity if possible." };
};

const fetchAirQuality = async (city) => {
  const normalized = normalizeCity(city);
  const locationId = OPENAQ_LOCATION_MAP[normalized];
  if (!locationId || !OPENAQ_API_KEY) return null;
  const url = `https://api.openaq.org/v3/locations/${locationId}/latest`;
  const data = await fetchJson(url, {
    headers: { "X-API-Key": OPENAQ_API_KEY }
  });
  const latest = Array.isArray(data?.results) ? data.results[0] : null;
  const parameters = Array.isArray(latest?.parameters) ? latest.parameters : [];
  const pm25Entry = parameters.find((param) => param.parameter === "pm25");
  const pm25 = pm25Entry?.lastValue ?? null;
  return { pm25, city, updatedAt: latest?.lastUpdated || null };
};

const fetchWeather = async (city) => {
  const geo = await geocodeCity(city);
  if (!geo) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature&timezone=auto`;
  const data = await fetchJson(url);
  const current = data?.current || {};
  return {
    temperature: current.temperature_2m ?? null,
    humidity: current.relative_humidity_2m ?? null,
    feelsLike: current.apparent_temperature ?? null,
    city,
    updatedAt: current.time || new Date().toISOString()
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildWalkingIndex = (weather, air) => {
  const temp = weather?.feelsLike ?? weather?.temperature ?? 0;
  const humidity = weather?.humidity ?? 50;
  const pm25 = air?.pm25 ?? 0;
  let score = 100;
  score -= temp > 34 ? 35 : temp > 30 ? 25 : temp > 27 ? 15 : 0;
  score -= humidity > 80 ? 15 : humidity > 70 ? 10 : humidity > 60 ? 5 : 0;
  score -= pm25 > 120 ? 30 : pm25 > 90 ? 20 : pm25 > 60 ? 10 : pm25 > 30 ? 5 : 0;
  score = clamp(Math.round(score), 15, 100);

  const hour = new Date().getHours();
  const safeWindow = hour < 9 ? "6:00 AM - 9:00 AM" : hour < 17 ? "6:00 PM - 8:00 PM" : "6:00 AM - 9:00 AM";
  const status = score >= 75 ? "Great" : score >= 55 ? "Caution" : "High Risk";
  return { score, safeWindow, status };
};

const buildDailyBrief = (city, weather, air) => {
  const walking = buildWalkingIndex(weather, air);
  const humidity = weather?.humidity ?? null;
  const temp = weather?.temperature ?? null;
  const feelsLike = weather?.feelsLike ?? null;
  const pm25 = air?.pm25 ?? null;

  const hydrationRisk = feelsLike !== null && feelsLike >= 32 ? "High" : humidity !== null && humidity >= 75 ? "Moderate" : "Low";
  const coatStress = humidity !== null && humidity >= 75 ? "High" : temp !== null && temp >= 30 ? "Moderate" : "Low";
  const airLabel = pm25 === null ? "Unknown" : pm25 <= 30 ? "Good" : pm25 <= 60 ? "Moderate" : pm25 <= 90 ? "Unhealthy" : "Poor";

  return {
    city,
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "walking-index",
        title: `${city} Walking Index`,
        value: `${walking.score}/100`,
        detail: `Best window: ${walking.safeWindow}. Status: ${walking.status}.`,
        badge: "Climate Shield",
        icon: "🌡️"
      },
      {
        id: "hydration-risk",
        title: "Hydration Risk",
        value: hydrationRisk,
        detail: hydrationRisk === "High" ? "Add an extra water refill today." : "Maintain steady hydration today.",
        badge: "Nutrition",
        icon: "💧"
      },
      {
        id: "air-quality",
        title: "Air Quality",
        value: `${airLabel}${pm25 !== null ? ` (PM2.5 ${pm25})` : ""}`,
        detail: airLabel === "Good" ? "Longer walks are okay." : "Prefer shaded, shorter walks.",
        badge: "Safety",
        icon: "🫧"
      },
      {
        id: "coat-stress",
        title: "Coat Stress",
        value: coatStress,
        detail: coatStress === "High" ? "Brush and dry coat after walks." : "Keep coat clean and dry.",
        badge: "Grooming",
        icon: "🧼"
      }
    ]
  };
};

const buildSafetyRadar = async (city) => {
  const [air, weather] = await Promise.all([
    fetchAirQuality(city),
    fetchWeather(city)
  ]);
  const pm25 = air?.pm25 ?? null;
  const classification = classifyAirQuality(pm25);
  const now = new Date();
  const hour = now.getHours();
  const safeWindow = hour < 9 ? "6:00 AM - 9:00 AM" : hour < 18 ? "6:00 PM - 8:00 PM" : "6:00 AM - 9:00 AM";
  return {
    city,
    pm25,
    airQualityLabel: classification.label,
    status: classification.status,
    advisory: classification.advice,
    safeWindow,
    updatedAt: air?.updatedAt || now.toISOString(),
    temperature: weather?.temperature ?? null,
    humidity: weather?.humidity ?? null,
    feelsLike: weather?.feelsLike ?? null
  };
};

const fetchPetEvents = async (city) => {
  if (!GOOGLE_CSE_API_KEY || !GOOGLE_CSE_CX) return [];
  const query = encodeURIComponent(`${city} pet adoption event OR pet vaccination camp OR pet meetup`);
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_API_KEY}&cx=${GOOGLE_CSE_CX}&q=${query}`;
  const data = await fetchJson(url);
  const items = Array.isArray(data?.items) ? data.items : [];
  const candidates = items
    .map((item) => ({
      title: item.title || "Pet Event",
      snippet: item.snippet || "",
      url: item.link || "",
      source: item.displayLink || "Google Search"
    }))
    .filter((item) => item.url);
  if (!candidates.length) return [];
  const validated = await mapWithLimit(candidates, 4, async (item) => {
    const valid = await checkUrl(item.url, "news");
    if (!valid) return null;
    return { ...item, url: valid };
  });
  return validated.filter(Boolean);
};

const checkUrl = async (url, category) => {
  if (!url || isRedirectUrl(url)) return null;
  if (!isAllowedHost(url, category)) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return null;

  const controller = new AbortController();
  try {
    let response = await withTimeout(
      fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal }),
      REQUEST_TIMEOUT_MS,
      controller
    );
    if ([400, 403, 405].includes(response.status) || response.status < 200 || response.status >= 400) {
      response = await withTimeout(
        fetch(url, {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "PawvedaLinkCheck/1.0" }
        }),
        REQUEST_TIMEOUT_MS,
        controller
      );
    }
    if (response.status >= 200 && response.status < 400) {
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return response.url || url;
      }
      const html = (await response.text()).slice(0, MAX_TEXT_CHARS);
      if (!isRelevant(category, html, response.url || url)) return null;
      return response.url || url;
    }
    return null;
  } catch {
    return null;
  }
};

const mapWithLimit = async (items, limit, fn) => {
  const results = new Array(items.length);
  let index = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url || "/", "http://localhost");

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    jsonResponse(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/air-quality") {
    const city = requestUrl.searchParams.get("city") || "";
    try {
      const radar = await buildSafetyRadar(city);
      jsonResponse(res, 200, radar);
    } catch {
      jsonResponse(res, 200, { city, pm25: null, airQualityLabel: "Unknown", status: "Monitor", advisory: "Check again later.", safeWindow: "6:00 AM - 9:00 AM", updatedAt: new Date().toISOString(), temperature: null, humidity: null, feelsLike: null });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/daily-brief") {
    const city = requestUrl.searchParams.get("city") || "";
    try {
      const [weather, air] = await Promise.all([
        fetchWeather(city),
        fetchAirQuality(city)
      ]);
      const brief = buildDailyBrief(city, weather, air);
      jsonResponse(res, 200, brief);
    } catch {
      const brief = buildDailyBrief(city, null, null);
      jsonResponse(res, 200, brief);
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/nearby-services") {
    const city = requestUrl.searchParams.get("city") || "";
    try {
      const services = await fetchNearbyServices(city);
      jsonResponse(res, 200, { services });
    } catch {
      jsonResponse(res, 200, { services: [] });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/pet-events") {
    const city = requestUrl.searchParams.get("city") || "";
    try {
      const events = await fetchPetEvents(city);
      jsonResponse(res, 200, { events });
    } catch {
      jsonResponse(res, 200, { events: [] });
    }
    return;
  }

  if (req.method !== "POST" || requestUrl.pathname !== "/api/validate-links") {
    jsonResponse(res, 404, { error: "Not found" });
    return;
  }

  try {
    const payload = await readJson(req);
    const category = typeof payload?.category === "string" ? payload.category : "news";
    const urls = Array.isArray(payload?.urls) ? payload.urls.slice(0, MAX_URLS) : [];
    const trimmed = urls.map((url) => (typeof url === "string" ? url.trim() : "")).filter(Boolean);
    if (!trimmed.length) {
      jsonResponse(res, 200, { validUrls: [] });
      return;
    }

    const validated = await mapWithLimit(trimmed, 6, (url) => checkUrl(url, category));
    const validUrls = validated.filter(Boolean);

    jsonResponse(res, 200, { validUrls });
  } catch (error) {
    jsonResponse(res, 400, { error: "Invalid JSON body" });
  }
});

server.listen(PORT, () => {
  console.log(`Link validator listening on http://localhost:${PORT}`);
});

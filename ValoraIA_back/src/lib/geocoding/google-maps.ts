const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export interface GeocodedAddress {
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string | null;
}

const cache = new Map<string, GeocodedAddress | null>();

function parseGeocodeResult(r: GoogleGeocodeResult): GeocodedAddress {
  const loc = r.geometry.location;
  const getComponent = (type: string) =>
    r.address_components.find((c) => c.types.includes(type))?.long_name ?? null;

  return {
    lat: loc.lat,
    lng: loc.lng,
    neighborhood:
      getComponent("sublocality_level_1") ??
      getComponent("sublocality") ??
      getComponent("neighborhood") ??
      null,
    city:
      getComponent("administrative_area_level_2") ??
      getComponent("locality") ??
      null,
  };
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress | null> {
  const key = address.toLowerCase().trim();
  if (cache.has(key)) return cache.get(key)!;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

  const url = new URL(GOOGLE_GEOCODING_URL);
  url.searchParams.set("address", `${address}, Brazil`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) { cache.set(key, null); return null; }

    const data = await res.json() as GoogleGeocodeResponse;
    if (data.status !== "OK" || !data.results.length) {
      cache.set(key, null);
      return null;
    }

    const result = parseGeocodeResult(data.results[0]);
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}

// ─── Reverse geocoding (lat/lng → neighborhood + city) ─────────────────────────

const reverseCache = new Map<string, GeocodedAddress | null>();

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedAddress | null> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (reverseCache.has(key)) return reverseCache.get(key)!;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

  const url = new URL(GOOGLE_GEOCODING_URL);
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "br");
  url.searchParams.set("result_type", "sublocality|locality|administrative_area_level_2");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) { reverseCache.set(key, null); return null; }

    const data = await res.json() as GoogleGeocodeResponse;
    if (data.status !== "OK" || !data.results.length) {
      reverseCache.set(key, null);
      return null;
    }

    const r = data.results[0];
    const loc = r.geometry.location;
    const getComponent = (type: string) =>
      r.address_components.find((c) => c.types.includes(type))?.long_name ?? null;

    const result: GeocodedAddress = {
      lat: loc.lat,
      lng: loc.lng,
      neighborhood:
        getComponent("sublocality_level_1") ??
        getComponent("sublocality") ??
        getComponent("neighborhood") ??
        null,
      city:
        getComponent("administrative_area_level_2") ??
        getComponent("locality") ??
        null,
    };

    reverseCache.set(key, result);
    return result;
  } catch {
    reverseCache.set(key, null);
    return null;
  }
}

// ─── Google Geocoding API types ───────────────────────────────────────────────

interface GoogleGeocodeResponse {
  status: string;
  results: GoogleGeocodeResult[];
}

interface GoogleGeocodeResult {
  geometry: { location: { lat: number; lng: number } };
  address_components: { long_name: string; short_name: string; types: string[] }[];
}

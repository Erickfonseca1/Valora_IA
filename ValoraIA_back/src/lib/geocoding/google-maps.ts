const GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

export interface GeocodedAddress {
  lat: number;
  lng: number;
  neighborhood: string | null;
  city: string | null;
}

const cache = new Map<string, GeocodedAddress | null>();

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

    const r = data.results[0];
    const loc = r.geometry.location;

    const getComponent = (type: string) =>
      r.address_components.find((c) => c.types.includes(type))?.long_name ?? null;

    const neighborhood =
      getComponent("sublocality_level_1") ??
      getComponent("sublocality") ??
      getComponent("neighborhood") ??
      null;

    const city =
      getComponent("administrative_area_level_2") ??
      getComponent("locality") ??
      null;

    const result: GeocodedAddress = {
      lat: loc.lat,
      lng: loc.lng,
      neighborhood,
      city,
    };

    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
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

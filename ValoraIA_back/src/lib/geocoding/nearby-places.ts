const GOOGLE_PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

export interface NearbyPlace {
  name: string;
  vicinity: string;
  type: string;
  distance_m: number;
}

export interface NeighborhoodPOI {
  category: string;
  label: string;
  places: NearbyPlace[];
  score: number;
  weight: number;
}

export interface NeighborhoodData {
  pois: NeighborhoodPOI[];
  totalScore: number;
}

const POI_CONFIGS = [
  { type: "supermarket", label: "Supermercados", weight: 0.15, maxDistance: 1000 },
  { type: "pharmacy", label: "Farmácias", weight: 0.12, maxDistance: 1000 },
  { type: "transit_station", label: "Transporte Público", weight: 0.15, maxDistance: 800 },
  { type: "school", label: "Escolas", weight: 0.10, maxDistance: 1000 },
  { type: "hospital", label: "Hospitais", weight: 0.10, maxDistance: 1500 },
  { type: "park", label: "Parques", weight: 0.08, maxDistance: 1000 },
  { type: "gym", label: "Academias", weight: 0.05, maxDistance: 1000 },
  { type: "shopping_mall", label: "Shoppings", weight: 0.08, maxDistance: 2000 },
  { type: "restaurant", label: "Restaurantes", weight: 0.05, maxDistance: 800 },
];

const NEIGHBORHOOD_BASE_SCORE = 0.40;
const cache = new Map<string, NeighborhoodData>();

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchNearbyPlaces(lat: number, lng: number): Promise<NeighborhoodData> {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY not configured");

  const results = await Promise.allSettled(
    POI_CONFIGS.map(async (config) => {
      const url = new URL(GOOGLE_PLACES_URL);
      url.searchParams.set("location", `${lat},${lng}`);
      url.searchParams.set("rankby", "distance");
      url.searchParams.set("type", config.type);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("language", "pt-BR");

      const res = await fetch(url.toString());
      if (!res.ok) return null;

      const data = await res.json() as GooglePlacesResponse;
      if (data.status !== "OK" || !data.results) return null;

      const places: NearbyPlace[] = data.results
        .map((r) => {
          const dist = haversineMeters(lat, lng, r.geometry.location.lat, r.geometry.location.lng);
          return { name: r.name, vicinity: r.vicinity, type: config.type, distance_m: Math.round(dist) };
        })
        .filter((p) => p.distance_m <= config.maxDistance)
        .slice(0, 5);

      let score = 0;
      if (places.length > 0) {
        const minDist = Math.min(...places.map((p) => p.distance_m));
        score = Number((1 - Math.min(minDist / config.maxDistance, 1)).toFixed(2));
      }

      return { category: config.type, label: config.label, places, score, weight: config.weight } as NeighborhoodPOI;
    })
  );

  const pois: NeighborhoodPOI[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) pois.push(r.value);
  }

  const bonusScore = pois.reduce((s, p) => s + p.score * p.weight, 0);
  const totalScore = Number(Math.min(NEIGHBORHOOD_BASE_SCORE + bonusScore, 1.0).toFixed(2));

  const data: NeighborhoodData = { pois, totalScore };
  cache.set(cacheKey, data);
  return data;
}

interface GooglePlacesResponse {
  status: string;
  results: GooglePlacesResult[];
}

interface GooglePlacesResult {
  name: string;
  vicinity: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
}

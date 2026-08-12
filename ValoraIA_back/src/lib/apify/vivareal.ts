import { buildListingAmenities } from "@/app/api/scrape/amenities-map";
import type { ConservationState, IngestPayload, PropertyType } from "@/types";

// ─── Raw VivaReal dataset item (fatihtahta/vivareal-scraper) ───────────────────

export interface VivaRealItem {
  identity?: { id?: string; external_id?: string };
  source_context?: { url?: string };
  timestamps?: { published_at?: string; created_at?: string; updated_at?: string };
  content?: { title?: string; description?: string };
  pricing?: {
    amount?: number;
    currency?: string;
    offers?: {
      business_type?: string;
      amount?: number;
      monthly_condo_fee?: number;
      yearly_iptu?: number;
      iptu?: number;
      iptu_period?: string;
    }[];
  };
  availability?: {
    status?: string;
    show_price?: boolean;
    resale?: boolean;
    non_activation_reason?: string;
  };
  location?: {
    label?: string;
    street?: string;
    street_number?: string;
    neighborhood?: string;
    city?: string;
    state_code?: string;
    coordinates?: { latitude?: number; longitude?: number };
  };
  media?: { images?: { id?: string; url?: string }[] };
  attributes?: {
    business?: string;
    listing_type?: string;
    property_type?: string;
    construction_status?: string;
    portal?: string;
    portals?: string[];
    unit_types?: string[];
    usage_types?: string[];
    amenities?: string[];
    badges?: string[];
    floors?: number[];
    unit_floor?: number;
    rooms?: {
      bedrooms?: number;
      bathrooms?: number;
      suites?: number;
      parking_spaces?: number;
    };
    area?: { usable_area?: number; total_area?: number };
  };
}

// ─── Normalization helpers ─────────────────────────────────────────────────────

function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // BR format: "1.234.567,89" → 1234567.89 ; "295.000" → 295000
    let s = v.trim();
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    } else if (s.includes(".") && /^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toPositiveNumber(v: unknown): number | null {
  const n = toNumber(v);
  return n !== null && n > 0 ? n : null;
}

function toNonNegativeInt(v: unknown): number | null {
  const n = toNumber(v);
  return n !== null && Number.isInteger(n) && n >= 0 ? n : null;
}

// ─── property_type mapping (unit_types → engine enum) ──────────────────────────

const HOUSE_TYPES = new Set([
  "home", "house", "residential_building", "condominium_house",
  "village_house", "gated_community", "farm", "chacara", "townhouse",
]);

const APARTMENT_TYPES = new Set([
  "apartment", "flat", "loft", "studio", "kitnet",
  "penthouse", "duplex", "coverage", "garden",
]);

const COMMERCIAL_TYPES = new Set([
  "commercial_building", "office", "store", "warehouse",
  "commercial_floor", "commercial_space", "hotel", "corporate_floor", "building",
]);

export function mapVivaRealPropertyType(unitTypes: string[] | undefined): PropertyType | null {
  if (!unitTypes?.length) return null;
  for (const t of unitTypes) {
    const slug = t.toLowerCase();
    if (HOUSE_TYPES.has(slug))      return "house";
    if (APARTMENT_TYPES.has(slug))  return "apartment";
    if (COMMERCIAL_TYPES.has(slug)) return "commercial";
    if (slug.includes("land") || slug.includes("terreno") || slug.includes("lote")) return "land";
  }
  return null;
}

// ─── construction age ──────────────────────────────────────────────────────────
// VivaReal does not expose year_built in a stable field, so construction_age is
// left null (Ross-Heidecke then skips physical depreciation).

// ─── conservation state ────────────────────────────────────────────────────────
// No structured signal in VivaReal output → default "regular".

const DEFAULT_CONSERVATION: ConservationState = "regular";

// ─── Main mapper ───────────────────────────────────────────────────────────────

export interface MappedVivaReal {
  /** null when required fields are missing — caller skips the record */
  payload: IngestPayload | null;
  /** mapped amenities with inferred scope (stored in listings.amenities JSONB) */
  amenities: ReturnType<typeof buildListingAmenities>;
  skipReason: string | null;
}

export function mapVivaRealItem(item: VivaRealItem): MappedVivaReal {
  const url = item.source_context?.url;
  const price = toPositiveNumber(item.pricing?.amount);
  const usableArea = toPositiveNumber(item.attributes?.area?.usable_area);
  const city = item.location?.city;

  if (!url || !price || !usableArea || !city) {
    return { payload: null, amenities: [], skipReason: "missing url/price/area/city" };
  }

  const lat = item.location?.coordinates?.latitude;
  const lng = item.location?.coordinates?.longitude;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { payload: null, amenities: [], skipReason: "missing coordinates" };
  }

  const propertyType = mapVivaRealPropertyType(item.attributes?.unit_types);
  if (!propertyType) {
    return { payload: null, amenities: [], skipReason: "unmapped property_type" };
  }

  const offer = item.pricing?.offers?.[0];
  const streetNumber = item.location?.street_number;

  const amenities = buildListingAmenities(
    item.attributes?.amenities,
    propertyType,
    item.attributes?.unit_types?.[0]
  );

  const payload: IngestPayload = {
    source_url: url,
    source: "vivareal",
    ad_id: item.identity?.id,
    price,
    usable_area: usableArea,
    total_area: toPositiveNumber(item.attributes?.area?.total_area) ?? undefined,
    bedrooms: toNonNegativeInt(item.attributes?.rooms?.bedrooms) ?? null,
    bathrooms: toNonNegativeInt(item.attributes?.rooms?.bathrooms) ?? null,
    suites: toNonNegativeInt(item.attributes?.rooms?.suites) ?? null,
    parking_spaces: toNonNegativeInt(item.attributes?.rooms?.parking_spaces) ?? null,
    condo_fee: toPositiveNumber(offer?.monthly_condo_fee) ?? undefined,
    iptu: toPositiveNumber(offer?.yearly_iptu ?? offer?.iptu) ?? undefined,
    property_type: propertyType,
    lat,
    lng,
    neighborhood: item.location?.neighborhood ?? null,
    city,
    address: item.location?.street
      ? `${item.location.street}${streetNumber ? `, ${streetNumber}` : ""}`
      : null,
    state: item.location?.state_code ?? null,
    construction_age: null,
    conservation_state: DEFAULT_CONSERVATION,
    floor: toNonNegativeInt(item.attributes?.unit_floor) ?? null,
    total_floors: toNonNegativeInt(item.attributes?.floors?.[0]) ?? null,
    is_condo: true,
    is_new_launch:
      item.attributes?.listing_type === "new" ||
      item.attributes?.construction_status === "launch" ||
      item.attributes?.construction_status === "in_construction",
    listing_created_at: item.timestamps?.published_at ?? item.timestamps?.created_at,
    images: item.media?.images?.map((i) => i.url).filter((u): u is string => !!u) ?? [],
  };

  return { payload, amenities, skipReason: null };
}

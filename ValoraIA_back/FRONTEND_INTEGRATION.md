# Valora AI — Frontend Integration Guide

> This document is written for a Claude agent building the frontend. Read it entirely before writing any code.

---

## Stack & Base URL

- Backend: Next.js 15 App Router (same repo or separate deployment)
- Base URL (local): `http://localhost:3000`
- All endpoints return `application/json`
- All responses follow a shared wrapper type:

```ts
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };
```

Always check `success` before accessing `data`.

---

## Types

Copy these types into the frontend. They are the source of truth.

```ts
type PropertyType = "apartment" | "house" | "commercial" | "land";
type MarketTemperature = "hot" | "warm" | "cold";

interface PriceFactor {
  label: string;   // "Localização" | "Condição" | "Demanda" | "Tamanho" | "Comodidades" | "Transporte"
  score: number;   // 0–1
}

interface FrontendComparable {
  address: string;
  neighborhood: string;
  price_brl: number;
  area_m2: number;
  bedrooms: number | null;
  price_m2_brl: number;
  status: "sold" | "listed";
  transaction_date: string; // ISO 8601
  source_url?: string;      // link to original ZAP listing
  images?: string[];        // resolved 760×570 webp URLs, up to 6
  amenities?: string[];     // e.g. ["Piscina", "Elevador", "Varanda"]
}

interface MethodEstimate {
  method: "mcd_idw" | "wls" | "gbdt";
  predicted_ppm2: number;
  weight: number;
  meta: Record<string, unknown>;
}

interface ValuationRecord {
  id: string;
  address: string;
  neighborhood: string | null;
  city: string | null;
  property_type: PropertyType;
  area_m2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spots: number | null;
  amenities: string[];
  price_range_min_brl: number;
  price_range_max_brl: number;
  recommended_listing_price_brl: number;
  confidence_score: number;          // 40–99
  price_factors: PriceFactor[];      // always 6 items
  comparables: FrontendComparable[]; // up to 5 items
  method_estimates?: MethodEstimate[];
  primary_method?: "mcd_idw" | "wls" | "gbdt" | "ensemble";
  created_at: string;
}

interface DashboardMetrics {
  valuations_this_month: number;
  valuations_prev_month: number;
  avg_confidence: number;
  market_temperature: MarketTemperature;
  market_city: string;
}

interface DashboardValuationItem {
  id: string;
  address: string;
  neighborhood: string;
  property_type: PropertyType;
  price_brl: number;
  confidence_score: number;
  created_at: string;
  bedrooms: number | null;
  area_m2: number;
}

interface DashboardValuationsResponse {
  total: number;
  items: DashboardValuationItem[];
}

interface MarketTrendResponse {
  city: string;
  period_months: number;
  current_price_m2: number;
  yearly_change_pct: number;
  data_points: number[]; // monthly avg ppm2, oldest → newest
}
```

---

## Endpoints

### 1. Create Valuation — `POST /api/valuations`

The main wizard endpoint. Geocodes the address, runs the 3-method ensemble engine, persists and returns the full valuation.

**Request body:**
```ts
{
  address: string;           // full address, the more specific the better
  property_type: PropertyType;
  area_m2: number;           // positive
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking_spots?: number | null;
  amenities?: string[];      // optional list, see amenity reference below
  lat?: number;              // optional override — skip geocoding
  lng?: number;              // optional override — skip geocoding
}
```

**Notes:**
- `address` is geocoded via Google Maps API. Use full street address with city and state for best results: `"Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB"`.
- If the user provides coordinates directly (e.g. from a map pin), pass `lat`/`lng` to skip geocoding entirely.
- Engine relaxes filters progressively if not enough comps exist — always returns a result unless the area has zero listings within 5km.

**Success response:** `201 Created`
```ts
{ success: true; data: ValuationRecord }
```

**Error responses:**
| Status | Error | Meaning |
|--------|-------|---------|
| 422 | `"Validation failed"` | Invalid body fields |
| 422 | `"Could not geocode address..."` | Google Maps could not resolve address |
| 404 | `"Insufficient comparable listings found..."` | Zero listings within 5km after all fallbacks |
| 500 | `"Internal server error"` | Unexpected engine failure |

**Example fetch:**
```ts
const res = await fetch("/api/valuations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    address: "Av. Epitácio Pessoa, 1000, Manaíra, João Pessoa, PB",
    property_type: "apartment",
    area_m2: 80,
    bedrooms: 2,
    bathrooms: 2,
    parking_spots: 1,
    amenities: ["Piscina", "Academia", "Portaria 24h"],
  }),
});
const json = await res.json();
if (!json.success) throw new Error(json.error);
const valuation: ValuationRecord = json.data;
```

---

### 2. Get Valuation by ID — `GET /api/valuations/:id`

Fetches a previously saved valuation. Use for result pages or sharing links.

**URL param:** `id` — the `val_...` string returned by POST.

**Success response:** `200 OK`
```ts
{ success: true; data: ValuationRecord }
```

**Error:** `404` if not found.

**Example:**
```ts
const res = await fetch(`/api/valuations/${id}`);
const json = await res.json();
if (!json.success) throw new Error(json.error);
const valuation: ValuationRecord = json.data;
```

---

### 3. Dashboard Metrics — `GET /api/dashboard/metrics`

KPI cards for the dashboard home.

**No params.**

**Success response:** `200 OK`
```ts
{ success: true; data: DashboardMetrics }
```

**Example:**
```ts
const res = await fetch("/api/dashboard/metrics");
const json = await res.json();
const metrics: DashboardMetrics = json.data;
```

**How to display `market_temperature`:**
- `"hot"` → green badge, "Mercado Aquecido"
- `"warm"` → yellow badge, "Mercado Estável"
- `"cold"` → blue badge, "Mercado Frio"

---

### 4. Dashboard Valuations List — `GET /api/dashboard/valuations`

Paginated list of past valuations for the history table.

**Query params:**
| Param | Type | Default | Max |
|-------|------|---------|-----|
| `limit` | number | 10 | 100 |
| `offset` | number | 0 | — |

**Success response:** `200 OK`
```ts
{ success: true; data: DashboardValuationsResponse }
// { total: number; items: DashboardValuationItem[] }
```

**Example with pagination:**
```ts
const page = 0;
const limit = 10;
const res = await fetch(`/api/dashboard/valuations?limit=${limit}&offset=${page * limit}`);
const json = await res.json();
const { total, items } = json.data;
```

---

### 5. Market Trend — `GET /api/market/trend`

Monthly average price per m² for a city, for trend charts.

**Query params:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `city` | string | yes | e.g. `"João Pessoa"` or `"joao-pessoa"` (hyphens accepted) |
| `months` | number | no | 1–24, default 12 |

**Success response:** `200 OK`
```ts
{ success: true; data: MarketTrendResponse }
```

`data_points` is an array of length `months` ordered oldest → newest. Zero months are forward-filled with the last known value.

**Example:**
```ts
const res = await fetch("/api/market/trend?city=João Pessoa&months=12");
const json = await res.json();
const trend: MarketTrendResponse = json.data;
// trend.data_points → use directly in a line chart
```

---

## Valuation Result — How to Display

### Price Range
```ts
// Format as BRL currency
const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

fmt(valuation.price_range_min_brl)           // "R$ 91.509"
fmt(valuation.recommended_listing_price_brl) // "R$ 122.316"
fmt(valuation.price_range_max_brl)           // "R$ 153.124"
```

### Confidence Score
- Range: 40–99
- Display as a percentage bar or gauge
- Labels: 40–59 = "Baixa", 60–74 = "Média", 75–89 = "Alta", 90–99 = "Muito Alta"

### Price Factors (Radar Chart)
`price_factors` always returns exactly 6 items with scores 0–1:
- `"Localização"` — proximity of comps to subject property
- `"Condição"` — price consistency among comps (low CoV = good condition signal)
- `"Demanda"` — sample volume relative to max (100 comps)
- `"Tamanho"` — how close comp areas are to target area
- `"Comodidades"` — amenity score based on declared amenities
- `"Transporte"` — spatial distribution of comps

Multiply by 100 for percentage display. Use any radar/spider chart library.

### Method Estimates
`method_estimates` shows which engine contributed and with what weight:
- `"mcd_idw"` — Inverse Distance Weighting (always present)
- `"wls"` — Weighted Least Squares regression (present when R² ≥ 0.30)
- `"gbdt"` — Gradient Boosted Decision Trees (present when n ≥ 10)

Display as an informational section, not the primary UI. Useful for "how was this calculated" disclosures.

### Comparables — Card Layout

Up to 5 nearest comparable listings. Render as cards, not a table.

Each card:
- **Image**: `images[0]` if available, else a placeholder. Images are `760×570` `.webp`. Use `<img>` with `loading="lazy"`.
- **Link**: wrap the card (or a "Ver anúncio" button) with `href={source_url} target="_blank"` if `source_url` is present.
- **Amenity chips**: render `amenities` as small badge chips below the price (e.g. "Piscina", "Elevador"). Limit to 3 visible + "+N" overflow.
- **Price**: format `price_brl` as BRL currency.
- **ppm²**: show `price_m2_brl` as secondary label "R$ X.XXX/m²".
- **Details**: `area_m2` + "m²", `bedrooms` + "quartos" (omit if null).
- **Status badge**: `"listed"` → "Anunciado" (green), `"sold"` → "Vendido" (gray).

```tsx
// Minimal card example
<a href={comp.source_url ?? "#"} target="_blank" rel="noopener noreferrer">
  <img
    src={comp.images?.[0] ?? "/placeholder.jpg"}
    alt={comp.neighborhood}
    width={760}
    height={570}
    loading="lazy"
  />
  <div>{comp.neighborhood}</div>
  <div>{fmt(comp.price_brl)} · {comp.area_m2} m²</div>
  <div>R$ {comp.price_m2_brl.toLocaleString("pt-BR")}/m²</div>
  {comp.amenities?.slice(0, 3).map(a => <span key={a}>{a}</span>)}
</a>
```

> `source_url` and `images` are populated for listings scraped after migration 004. Older records may have empty arrays — always guard with `?.` or fallback.

---

## Amenities Reference

Pass these strings in the `amenities` array. Casing must match exactly.

```
Premium:   "Piscina", "Rooftop", "Vista Mar", "Cobertura"
Alto:      "Academia", "Portaria 24h", "Portaria", "Segurança 24h", "Elevador", "Salão de Festas", "Área Gourmet"
Médio:     "Varanda", "Sacada", "Churrasqueira", "Playground", "Salão de Jogos",
           "Espaço Kids", "Coworking", "Quadra", "Quadra Esportiva"
Básico:    "Portão eletrônico", "Interfone", "Câmeras de segurança",
           "Área de serviço", "Armários planejados", "Ar condicionado", "Pet friendly"
```

Any string not in this list gets a default weight of 0.05.

---

## Error Handling Pattern

```ts
async function callApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error ?? "Unknown API error");
  }

  return json.data as T;
}
```

---

## Geocoding Fallback (Map Pin)

If the UI includes a map where users can drop a pin, pass `lat`/`lng` directly to skip Google geocoding:

```ts
await fetch("/api/valuations", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    address: "Endereço selecionado no mapa",
    property_type: "house",
    area_m2: 80,
    lat: -7.2077,
    lng: -34.8477,
  }),
});
```

When `lat`/`lng` are provided, `address` is still required (used for display and storage) but not geocoded.

---

## Important Constraints

1. **No auth required** on frontend-facing endpoints (`/api/valuations`, `/api/dashboard/*`, `/api/market/trend`). The Supabase service role key lives only on the server — never expose it to the frontend.
2. **`/api/scrape` and `/api/ingest`** are internal admin endpoints protected by `x-ingest-secret`. Do not call them from the frontend.
3. **Valuation IDs** are prefixed `val_` followed by 32 hex chars. Use them as route params: `/resultado/val_abc123`.
4. **`confidence_score` of 40** is the floor — it means the engine found comps but the sample was small or heterogeneous. Still a valid result; display with a note about data availability.
5. **`price_range_min_brl` is never 0** — the engine floors it at 50% of the estimated value. If it looks low, the market genuinely has high variance.

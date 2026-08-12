import aracajuData from "./data/aracaju_full_verified.json";
import fortalezaData from "./data/fortaleza_full_verified.json";
import joaoPessoaData from "./data/joao_pessoa_full_verified.json";
import maceioData from "./data/maceio_full_verified.json";
import natalData from "./data/natal_full_verified.json";
import recifeData from "./data/recife_full_verified.json";
import salvadorData from "./data/salvador_full_verified.json";
import saoLuisData from "./data/são_luis_full_verified.json";
import teresinaData from "./data/teresina_full_verified.json";
import type { PropertyType } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketPriorTypology = "apartamento" | "casa" | "terreno" | "comercial";

export interface MarketPriorNeighborhood {
  nome: string;
  precos_medios_m2: Partial<Record<MarketPriorTypology, number>>;
}

export interface MarketPriorCity {
  cidade: string;
  uf: string;
  data_referencia: string;
  bairros: MarketPriorNeighborhood[];
}

export interface MarketPriorMatch {
  /** verified R$/m² for the requested typology (post offer-factor 0.90) */
  price_per_m2: number;
  /** raw verified R$/m² (asking price basis) */
  raw_price_per_m2: number;
  /** neighborhood name as found in the verified dataset */
  matched_neighborhood: string;
  /** how confident the neighborhood match is (1 = exact) */
  match_score: number;
}

// ─── Dataset registry — capitais do Nordeste (curadoria verificada 2025/2026) ──

const DATASETS: MarketPriorCity[] = [
  aracajuData as unknown as MarketPriorCity,
  fortalezaData as unknown as MarketPriorCity,
  joaoPessoaData as unknown as MarketPriorCity,
  maceioData as unknown as MarketPriorCity,
  natalData as unknown as MarketPriorCity,
  recifeData as unknown as MarketPriorCity,
  salvadorData as unknown as MarketPriorCity,
  saoLuisData as unknown as MarketPriorCity,
  teresinaData as unknown as MarketPriorCity,
];

// ─── Normalization helpers ────────────────────────────────────────────────────
// Google returns expanded names ("Jd Cidade Univ", "José Américo de Almeida")
// while the verified dataset uses common forms ("Jardim Cidade Universitária",
// "José Américo"). We normalize both sides before matching.

const ABBREVIATIONS: Record<string, string> = {
  jd: "jardim",
  univ: "universitaria",
  cid: "cidade",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")          // strip accents
    .replace(/[^a-z0-9 ]/g, " ")              // punctuation → space
    .split(/\s+/)
    .map((w) => ABBREVIATIONS[w] ?? w)        // expand abbreviations
    .filter(Boolean)
    .join(" ");
}

const OFFER_FACTOR = 0.90;

// ─── Lookup ───────────────────────────────────────────────────────────────────

function lookupTypology(
  bairro: MarketPriorNeighborhood,
  typology: PropertyType
): { raw: number } | null {
  const key: MarketPriorTypology =
    typology === "house" ? "casa"
    : typology === "land" ? "terreno"
    : typology === "commercial" ? "comercial"
    : "apartamento";

  const raw = bairro.precos_medios_m2[key];
  return raw != null && raw > 0 ? { raw } : null;
}

/**
 * Finds the best neighborhood match in a city's verified dataset.
 *
 * Exact match → score 1.0. Otherwise token-set overlap ratio; a neighborhood
 * where all tokens of one side appear in the other (e.g. "jose americo" vs
 * "jose americo de almeida") still scores highly.
 */
export function matchNeighborhood(
  city: MarketPriorCity,
  neighborhood: string,
  propertyType: PropertyType
): MarketPriorMatch | null {
  const target = normalize(neighborhood);
  if (!target) return null;

  let best: { entry: MarketPriorNeighborhood; score: number } | null = null;

  for (const bairro of city.bairros) {
    const candidate = normalize(bairro.nome);
    if (candidate === target) {
      best = { entry: bairro, score: 1.0 };
      break;
    }
    const a = target.split(" ");
    const b = candidate.split(" ");
    const intersection = a.filter((t) => b.includes(t)).length;
    const union = new Set([...a, ...b]).size;
    const score = intersection / Math.max(union, 1);
    if (!best || score > best.score) best = { entry: bairro, score };
  }

  if (!best || best.score < 0.5) return null;

  const price = lookupTypology(best.entry, propertyType);
  if (!price) return null;

  return {
    price_per_m2: Number((price.raw * OFFER_FACTOR).toFixed(2)),
    raw_price_per_m2: price.raw,
    matched_neighborhood: best.entry.nome,
    match_score: Number(best.score.toFixed(3)),
  };
}

/**
 * Public lookup: city name (case-insensitive, accent-insensitive) → match.
 * `address` is a fallback source for the neighborhood when geocoding did not
 * return one (addresses without a number often lack sublocality data): any
 * bairro name fully contained in the address text is accepted (score 0.85).
 */
export function getMarketPrior(
  city: string | null | undefined,
  neighborhood: string | null | undefined,
  propertyType: PropertyType,
  address?: string | null
): MarketPriorMatch | null {
  if (!city) return null;

  const cityNorm = normalize(city);
  const dataset = DATASETS.find((d) => normalize(d.cidade) === cityNorm);
  if (!dataset) return null;

  if (neighborhood) {
    const match = matchNeighborhood(dataset, neighborhood, propertyType);
    if (match) return match;
  }

  // Fallback: scan the raw address text for a bairro name
  if (address) {
    const addressNorm = normalize(address);
    let best: { entry: MarketPriorNeighborhood; score: number } | null = null;
    for (const bairro of dataset.bairros) {
      const candidate = normalize(bairro.nome);
      const tokens = candidate.split(" ");
      // All bairro tokens contained in the address → strong signal
      if (tokens.length >= 1 && tokens.every((t) => addressNorm.includes(t))) {
        const score = 0.85;
        if (!best || score > best.score) best = { entry: bairro, score };
      }
    }
    if (best) {
      const price = lookupTypology(best.entry, propertyType);
      if (price) {
        return {
          price_per_m2: Number((price.raw * OFFER_FACTOR).toFixed(2)),
          raw_price_per_m2: price.raw,
          matched_neighborhood: best.entry.nome,
          match_score: Number(best.score.toFixed(3)),
        };
      }
    }
  }

  return null;
}

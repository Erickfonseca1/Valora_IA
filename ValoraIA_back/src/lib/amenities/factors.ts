import { AMENITY_CATALOG, type Scope } from "./catalog";

export interface AmenitySelection { item: string; scope: Scope; }

export interface ScopeContribution {
  scope: Scope;
  item: string;
  contribution: number;
  derived: boolean;
}

export interface ScopeFactors {
  internalFactor: number;
  condoFactor: number;
  breakdown: ScopeContribution[];
}

const CAPS: Record<"interno" | "condo", { min: number; max: number }> = {
  interno: { min: 0.80, max: 1.25 },
  condo:   { min: 0.90, max: 1.15 },
};
const PROXIMO_CAP = { min: 0.95, max: 1.05 };
const NEIGHBORHOOD_BASE = 0.40;
// delta máx (1.0-0.40)=0.60 mapeado para +0.05 → k ≈ 0.0833
const PROXIMO_K = 0.05 / 0.60;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
function round4(v: number): number { return Number(v.toFixed(4)); }

/**
 * Fatores de interno e condo a partir das seleções do imóvel-alvo.
 * `inGated` apenas documenta o contexto; o gating de quais itens são `condo`
 * já foi resolvido a montante (UI + inferência). Seleções com escopo inválido
 * para o item são ignoradas (saneamento).
 */
export function computeScopeFactors(
  selections: AmenitySelection[],
  _inGated: boolean
): ScopeFactors {
  const breakdown: ScopeContribution[] = [];
  let internoSum = 0;
  let condoSum = 0;

  for (const sel of selections) {
    const entry = AMENITY_CATALOG[sel.item];
    if (!entry || !entry.scopes.includes(sel.scope)) continue;
    if (sel.scope === "proximo") continue; // próximo vem da vizinhança, não daqui
    const w = entry.fallback[sel.scope];
    if (typeof w !== "number") continue;
    breakdown.push({ scope: sel.scope, item: sel.item, contribution: w, derived: false });
    if (sel.scope === "interno") internoSum += w;
    else condoSum += w;
  }

  return {
    internalFactor: round4(clamp(1 + internoSum, CAPS.interno.min, CAPS.interno.max)),
    condoFactor: round4(clamp(1 + condoSum, CAPS.condo.min, CAPS.condo.max)),
    breakdown,
  };
}

/** Fator do entorno: delta-only acima do baseline de vizinhança, fraco e capado. */
export function computeProximoFactor(neighborhoodScore?: number): number {
  if (typeof neighborhoodScore !== "number") return 1.0;
  const delta = neighborhoodScore - NEIGHBORHOOD_BASE;
  return round4(clamp(1 + delta * PROXIMO_K, PROXIMO_CAP.min, PROXIMO_CAP.max));
}

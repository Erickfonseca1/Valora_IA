import { AMENITY_CATALOG, type Scope } from "./catalog";
import type { PropertyType } from "@/types";

const GATED_UNIT_TYPES = new Set([
  "gated_community", "condominium_house", "village_house",
]);

/** Escopo de um item para um comparável/imóvel. Retorna null se não aplicável. */
export function inferScope(
  item: string,
  propertyType: PropertyType,
  unitType?: string | null
): Scope | null {
  const entry = AMENITY_CATALOG[item];
  if (!entry) return null;

  const can = (s: Scope) => entry.scopes.includes(s);

  // Item de escopo único → resolve direto.
  if (entry.scopes.length === 1) {
    const only = entry.scopes[0];
    if (only === "interno" && propertyType === "land") return null;
    return only;
  }

  // Item compartilhável (suporta condo e/ou interno).
  if (propertyType === "apartment") {
    return can("condo") ? "condo" : (can("interno") ? "interno" : null);
  }
  if (propertyType === "land") return null;

  // house / commercial
  const gated = unitType ? GATED_UNIT_TYPES.has(unitType) : false;
  if (gated && can("condo")) return "condo";
  if (can("interno")) return "interno";
  return can("condo") ? "condo" : null;
}

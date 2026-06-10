import { mapZapAmenity } from "@/lib/amenities/catalog";
import { inferScope } from "@/lib/amenities/scope";
import type { AmenitySelection } from "@/lib/amenities/factors";
import type { PropertyType } from "@/types";

export function buildListingAmenities(
  raw: string[] | undefined,
  propertyType: PropertyType,
  unitType?: string | null
): AmenitySelection[] {
  if (!raw?.length) return [];
  const out: AmenitySelection[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const item = mapZapAmenity(r);
    if (!item || seen.has(item)) continue;
    const scope = inferScope(item, propertyType, unitType);
    if (!scope) continue;
    seen.add(item);
    out.push({ item, scope });
  }
  return out;
}

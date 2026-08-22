import type { ListingRow } from "@/types";

function normalizeNeighborhood(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rankComparableRows(
  rows: ListingRow[],
  targetPropertyType: string | null | undefined,
  targetNeighborhood: string | null | undefined
): ListingRow[] {
  const targetType = targetPropertyType ?? "apartment";
  const targetBairro = normalizeNeighborhood(targetNeighborhood);

  return [...rows].sort((a, b) => {
    const score = (row: ListingRow) => {
      const sameType = (row.property_type ?? "apartment") === targetType;
      const sameNeighborhood = Boolean(targetBairro) && normalizeNeighborhood(row.neighborhood) === targetBairro;
      const distanceScore = clamp(1 - row.distance_m / 5000, 0, 1);
      return (sameNeighborhood ? 4 : 0) + (sameType ? 2 : 0) + distanceScore;
    };

    return score(b) - score(a) || a.distance_m - b.distance_m;
  });
}

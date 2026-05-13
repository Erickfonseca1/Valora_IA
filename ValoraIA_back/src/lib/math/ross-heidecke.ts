import type { ConservationState } from "@/types";

// construction_standard is a calculation-only parameter, not stored in DB
export type ConstructionStandard = "high" | "medium" | "popular";

const STANDARD_PARAMS: Record<ConstructionStandard, { r: number; Vu: number }> = {
  high:    { r: 0.005, Vu: 80 },
  medium:  { r: 0.010, Vu: 60 },
  popular: { r: 0.015, Vu: 50 },
};

// Depreciation coefficients for the 6-state conservation_state_enum (newschema.sql)
// Values from NBR 14.653-1 Quadro 3, collapsed from the traditional 9-state table
const CONSERVATION_DEPRECIATION: Record<ConservationState, number> = {
  novo:                  0.00,
  entre_novo_e_regular:  0.15,
  regular:               0.33,
  reparos_simples:       0.52,
  reparos_importantes:   0.72,
  critico:               1.00,
};

export interface RossHeideckeInput {
  construction_age: number;
  conservation_state: ConservationState;
  construction_standard?: ConstructionStandard; // defaults to "medium" if not provided
}

export interface RossHeideckeResult {
  depreciation_coefficient: number;
  remaining_value_pct: number;
}

export function computeRossHeidecke(input: RossHeideckeInput): RossHeideckeResult {
  const { construction_age, conservation_state, construction_standard = "medium" } = input;
  const { r, Vu } = STANDARD_PARAMS[construction_standard];
  const n = Math.min(Math.max(0, construction_age), Vu - 1);

  // PTAM-BR variant (NBR 14.653-2): Ross exponential decay × linear remaining-life fraction
  const age_factor = Math.pow(1 - r, n) * (Vu - n) / Vu;
  const conservation_dep = CONSERVATION_DEPRECIATION[conservation_state];

  const remaining_value_pct = age_factor * (1 - conservation_dep);
  const depreciation_coefficient = 1 - remaining_value_pct;

  return {
    depreciation_coefficient: Number(depreciation_coefficient.toFixed(4)),
    remaining_value_pct:      Number(remaining_value_pct.toFixed(4)),
  };
}

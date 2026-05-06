import type { ConservationState, ConstructionStandard, RossHeideckeResult } from "@/types";

const STANDARD_PARAMS: Record<ConstructionStandard, { r: number; Vu: number }> = {
  high:    { r: 0.005, Vu: 80 },
  medium:  { r: 0.010, Vu: 60 },
  popular: { r: 0.015, Vu: 50 },
};

const CONSERVATION_DEPRECIATION: Record<ConservationState, number> = {
  A:  0.00,
  AB: 0.05,
  B:  0.12,
  BC: 0.22,
  C:  0.33,
  CD: 0.46,
  D:  0.52,
  DE: 0.72,
  E:  1.00,
};

export interface RossHeideckeInput {
  construction_age: number;
  conservation_state: ConservationState;
  construction_standard: ConstructionStandard;
}

export function computeRossHeidecke(input: RossHeideckeInput): RossHeideckeResult {
  const { construction_age, conservation_state, construction_standard } = input;
  const { r, Vu } = STANDARD_PARAMS[construction_standard];
  const n = Math.min(Math.max(0, construction_age), Vu - 1);

  // Structural age factor (NBR 14.653 formula: Vh = Vo × (1-r)^n × (Vu-n)/Vu)
  const age_factor = Math.pow(1 - r, n) * (Vu - n) / Vu;
  const conservation_dep = CONSERVATION_DEPRECIATION[conservation_state];

  const remaining_value_pct = age_factor * (1 - conservation_dep);
  const depreciation_coefficient = 1 - remaining_value_pct;

  return {
    depreciation_coefficient: Number(depreciation_coefficient.toFixed(4)),
    remaining_value_pct: Number(remaining_value_pct.toFixed(4)),
  };
}

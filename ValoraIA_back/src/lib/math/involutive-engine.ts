import type { ViabilityScenario, ZoningParams } from "@/types";

export interface InvolutiveInput {
  area_terreno: number;      // m² — from valuations.area_m2
  zoning_params: ZoningParams; // from valuations.zoning_params JSONB
  VGV_estimado_m2: number;   // price/m² from comparative engine
}

// Field names match DB columns in the valuations table
export interface InvolutiveResult {
  residual_land_value_brl: number;    // → valuations.residual_land_value_brl
  max_buildable_area_m2: number;      // → valuations.max_buildable_area_m2
  viability_scenarios: ViabilityScenario[]; // → valuations.viability_scenarios JSONB
  // detailed breakdown (for report display, not persisted separately)
  VGV_total: number;
  Custo_Obra: number;
  Outorga_Onerosa: number;
}

function calcScenario(
  area_terreno: number,
  VGV_estimado_m2: number,
  IA_max: number,
  ia_factor: number,
  label: string,
  description: string
): ViabilityScenario {
  const ia = IA_max * ia_factor;
  const VGV_total = ia * area_terreno * VGV_estimado_m2;
  const Custo_Obra = VGV_total * 0.50;
  const Outorga_Onerosa = area_terreno * 0.10 * VGV_estimado_m2;
  const Margem = VGV_total * 0.15;
  const residual = VGV_total - Custo_Obra - Outorga_Onerosa - Margem;
  const roi_pct = Custo_Obra > 0 ? Number(((residual / Custo_Obra) * 100).toFixed(1)) : 0;
  return { label, description, VGV_total, residual, roi_pct };
}

export function runInvolutive(input: InvolutiveInput): InvolutiveResult {
  const { area_terreno, zoning_params, VGV_estimado_m2 } = input;
  const IA_max = zoning_params.IAmax;

  const VGV_total = IA_max * area_terreno * VGV_estimado_m2;
  const Custo_Obra = VGV_total * 0.50;
  const Outorga_Onerosa = area_terreno * 0.10 * VGV_estimado_m2;
  const Margem_Incorporador = VGV_total * 0.15;
  const residual_land_value_brl = VGV_total - Custo_Obra - Outorga_Onerosa - Margem_Incorporador;
  const max_buildable_area_m2 = IA_max * area_terreno;

  const viability_scenarios: ViabilityScenario[] = [
    calcScenario(area_terreno, VGV_estimado_m2, IA_max, 0.7, "Conservador", "IA 70% do máximo permitido"),
    calcScenario(area_terreno, VGV_estimado_m2, IA_max, 1.0, "Base",        "IA máximo permitido"),
    calcScenario(area_terreno, VGV_estimado_m2, IA_max, 1.2, "Otimista",    "IA 120% — requer outorga adicional"),
  ];

  return {
    residual_land_value_brl,
    max_buildable_area_m2,
    viability_scenarios,
    VGV_total,
    Custo_Obra,
    Outorga_Onerosa,
  };
}

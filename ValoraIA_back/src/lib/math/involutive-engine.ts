import type { ViabilityScenario } from "@/types";

export interface InvolutiveInput {
  area_terreno: number;       // m² of the land plot
  IA_max: number;             // Floor Area Ratio (Índice de Aproveitamento)
  VGV_estimado_m2: number;    // Market price per m² from MCDDM engine
}

export interface InvolutiveResult {
  VGV_total: number;
  Custo_Obra: number;
  Outorga_Onerosa: number;
  Valor_Residual_Terreno: number;
  max_buildable_area: number;
  viability_scenarios: ViabilityScenario[];
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
  const { area_terreno, IA_max, VGV_estimado_m2 } = input;

  const VGV_total = IA_max * area_terreno * VGV_estimado_m2;
  const Custo_Obra = VGV_total * 0.50;
  const Outorga_Onerosa = area_terreno * 0.10 * VGV_estimado_m2;
  const Margem_Incorporador = VGV_total * 0.15;
  const Valor_Residual_Terreno = VGV_total - Custo_Obra - Outorga_Onerosa - Margem_Incorporador;
  const max_buildable_area = IA_max * area_terreno;

  const viability_scenarios: ViabilityScenario[] = [
    calcScenario(area_terreno, VGV_estimado_m2, IA_max, 0.7, "Conservador", "IA 70% do máximo permitido"),
    calcScenario(area_terreno, VGV_estimado_m2, IA_max, 1.0, "Base",        "IA máximo permitido"),
    calcScenario(area_terreno, VGV_estimado_m2, IA_max, 1.2, "Otimista",    "IA 120% — requer outorga adicional"),
  ];

  return {
    VGV_total,
    Custo_Obra,
    Outorga_Onerosa,
    Valor_Residual_Terreno,
    max_buildable_area,
    viability_scenarios,
  };
}

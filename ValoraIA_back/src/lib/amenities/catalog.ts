export type Scope = "interno" | "condo" | "proximo";
export type AmenityCategory =
  | "lazer" | "espaco" | "conforto" | "seguranca" | "infra" | "proximo";

export interface CatalogEntry {
  label: string;
  cat: AmenityCategory;
  scopes: Scope[];
  /** Peso de fallback (Grau I) por escopo. Usado enquanto não há derivação da amostra. */
  fallback: Partial<Record<Scope, number>>;
}

export const AMENITY_CATALOG: Record<string, CatalogEntry> = {
  piscina:        { label: "Piscina",                 cat: "lazer",     scopes: ["interno", "condo"],            fallback: { interno: 0.06, condo: 0.04 } },
  academia:       { label: "Academia",                cat: "lazer",     scopes: ["interno", "condo", "proximo"], fallback: { interno: 0.05, condo: 0.03, proximo: 0.01 } },
  churrasqueira:  { label: "Churrasqueira / Gourmet",  cat: "lazer",     scopes: ["interno", "condo"],            fallback: { interno: 0.04, condo: 0.02 } },
  salao_festas:   { label: "Salão de festas",          cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.03 } },
  salao_jogos:    { label: "Salão de jogos",           cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  playground:     { label: "Playground",               cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  espaco_kids:    { label: "Espaço kids",              cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  quadra:         { label: "Quadra esportiva",         cat: "lazer",     scopes: ["interno", "condo", "proximo"], fallback: { interno: 0.04, condo: 0.02, proximo: 0.01 } },
  sauna:          { label: "Sauna",                    cat: "lazer",     scopes: ["interno", "condo"],            fallback: { interno: 0.03, condo: 0.02 } },
  espaco_pet:     { label: "Espaço pet",               cat: "lazer",     scopes: ["condo"],                       fallback: { condo: 0.01 } },
  quintal:        { label: "Quintal",                  cat: "espaco",    scopes: ["interno"],                     fallback: { interno: 0.05 } },
  jardim:         { label: "Jardim",                   cat: "espaco",    scopes: ["interno", "condo"],            fallback: { interno: 0.03, condo: 0.02 } },
  varanda:        { label: "Varanda / Sacada",         cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.04 } },
  vista_mar:      { label: "Vista mar",                cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.08 } },
  cobertura:      { label: "Cobertura / Rooftop",      cat: "conforto",  scopes: ["interno", "condo"],            fallback: { interno: 0.08, condo: 0.03 } },
  ar_condicionado:{ label: "Ar condicionado",          cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.03 } },
  armarios:       { label: "Armários planejados",      cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.03 } },
  mobiliado:      { label: "Mobiliado",                cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.04 } },
  lareira:        { label: "Lareira",                  cat: "conforto",  scopes: ["interno"],                     fallback: { interno: 0.02 } },
  portaria_24h:   { label: "Portaria 24h",             cat: "seguranca", scopes: ["condo"],                       fallback: { condo: 0.04 } },
  seguranca_24h:  { label: "Segurança 24h",            cat: "seguranca", scopes: ["condo"],                       fallback: { condo: 0.03 } },
  portao_eletronico:{ label: "Portão eletrônico",      cat: "seguranca", scopes: ["interno", "condo"],            fallback: { interno: 0.01, condo: 0.01 } },
  cameras:        { label: "Câmeras de segurança",     cat: "seguranca", scopes: ["interno", "condo"],            fallback: { interno: 0.01, condo: 0.01 } },
  elevador:       { label: "Elevador",                 cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.03 } },
  gerador:        { label: "Gerador",                  cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  coworking:      { label: "Coworking",                cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.02 } },
  lavanderia:     { label: "Lavanderia",               cat: "infra",     scopes: ["condo"],                       fallback: { condo: 0.01 } },
};

/** Strings cruas do Zap → id do catálogo. Chaves normalizadas (lower, sem acento). */
const ZAP_TO_ITEM: Record<string, string> = {
  "piscina": "piscina",
  "academia": "academia",
  "fitness": "academia",
  "churrasqueira": "churrasqueira",
  "espaco gourmet": "churrasqueira",
  "area gourmet": "churrasqueira",
  "salao de festas": "salao_festas",
  "salao de jogos": "salao_jogos",
  "playground": "playground",
  "espaco kids": "espaco_kids",
  "brinquedoteca": "espaco_kids",
  "quadra": "quadra",
  "quadra poliesportiva": "quadra",
  "sauna": "sauna",
  "espaco pet": "espaco_pet",
  "pet care": "espaco_pet",
  "quintal": "quintal",
  "jardim": "jardim",
  "varanda": "varanda",
  "sacada": "varanda",
  "vista mar": "vista_mar",
  "vista para o mar": "vista_mar",
  "cobertura": "cobertura",
  "rooftop": "cobertura",
  "ar condicionado": "ar_condicionado",
  "armarios planejados": "armarios",
  "mobiliado": "mobiliado",
  "lareira": "lareira",
  "portaria 24h": "portaria_24h",
  "portaria 24 horas": "portaria_24h",
  "seguranca 24h": "seguranca_24h",
  "portao eletronico": "portao_eletronico",
  "cameras de seguranca": "cameras",
  "circuito de seguranca": "cameras",
  "elevador": "elevador",
  "gerador": "gerador",
  "coworking": "coworking",
  "lavanderia": "lavanderia",
};

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function mapZapAmenity(raw: string): string | null {
  return ZAP_TO_ITEM[normalize(raw)] ?? null;
}

import type { AmenityScope } from './types'

export interface FrontCatalogEntry {
  label: string
  cat: 'lazer' | 'espaco' | 'conforto' | 'seguranca' | 'infra'
  scopes: AmenityScope[]
}

// Espelho dos itens "selecionáveis pelo usuário" (interno/condo) do catálogo backend.
// Itens só-proximo (POI) NÃO entram aqui — vêm automáticos da vizinhança.
export const FRONT_CATALOG: Record<string, FrontCatalogEntry> = {
  piscina:           { label: 'Piscina',               cat: 'lazer',     scopes: ['interno', 'condo'] },
  academia:          { label: 'Academia',              cat: 'lazer',     scopes: ['interno', 'condo'] },
  churrasqueira:     { label: 'Churrasqueira / Gourmet', cat: 'lazer',   scopes: ['interno', 'condo'] },
  salao_festas:      { label: 'Salão de festas',       cat: 'lazer',     scopes: ['condo'] },
  salao_jogos:       { label: 'Salão de jogos',        cat: 'lazer',     scopes: ['condo'] },
  playground:        { label: 'Playground',            cat: 'lazer',     scopes: ['condo'] },
  espaco_kids:       { label: 'Espaço kids',           cat: 'lazer',     scopes: ['condo'] },
  quadra:            { label: 'Quadra esportiva',      cat: 'lazer',     scopes: ['interno', 'condo'] },
  sauna:             { label: 'Sauna',                 cat: 'lazer',     scopes: ['interno', 'condo'] },
  espaco_pet:        { label: 'Espaço pet',            cat: 'lazer',     scopes: ['condo'] },
  quintal:           { label: 'Quintal',               cat: 'espaco',    scopes: ['interno'] },
  jardim:            { label: 'Jardim',                cat: 'espaco',    scopes: ['interno', 'condo'] },
  varanda:           { label: 'Varanda / Sacada',      cat: 'conforto',  scopes: ['interno'] },
  vista_mar:         { label: 'Vista mar',             cat: 'conforto',  scopes: ['interno'] },
  cobertura:         { label: 'Cobertura / Rooftop',   cat: 'conforto',  scopes: ['interno', 'condo'] },
  ar_condicionado:   { label: 'Ar condicionado',       cat: 'conforto',  scopes: ['interno'] },
  armarios:          { label: 'Armários planejados',   cat: 'conforto',  scopes: ['interno'] },
  mobiliado:         { label: 'Mobiliado',             cat: 'conforto',  scopes: ['interno'] },
  lareira:           { label: 'Lareira',               cat: 'conforto',  scopes: ['interno'] },
  portaria_24h:      { label: 'Portaria 24h',          cat: 'seguranca', scopes: ['condo'] },
  seguranca_24h:     { label: 'Segurança 24h',         cat: 'seguranca', scopes: ['condo'] },
  portao_eletronico: { label: 'Portão eletrônico',     cat: 'seguranca', scopes: ['interno', 'condo'] },
  cameras:           { label: 'Câmeras de segurança',  cat: 'seguranca', scopes: ['interno', 'condo'] },
  elevador:          { label: 'Elevador',              cat: 'infra',     scopes: ['condo'] },
  gerador:           { label: 'Gerador',               cat: 'infra',     scopes: ['condo'] },
  coworking:         { label: 'Coworking',             cat: 'infra',     scopes: ['condo'] },
  lavanderia:        { label: 'Lavanderia',            cat: 'infra',     scopes: ['condo'] },
}

export function itemsForScope(scope: AmenityScope): Array<{ id: string } & FrontCatalogEntry> {
  return Object.entries(FRONT_CATALOG)
    .filter(([, e]) => e.scopes.includes(scope))
    .map(([id, e]) => ({ id, ...e }))
}

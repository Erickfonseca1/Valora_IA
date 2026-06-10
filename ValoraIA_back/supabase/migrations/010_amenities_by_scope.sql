-- Fase 0: comodidades por escopo hierárquico
-- Execução manual no Supabase (SQL editor).

-- Comparáveis: armazenar amenities com escopo inferido + unit_type cru do Zap.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS amenities  jsonb    NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS unit_type  text;

-- Avaliações: comodidades do imóvel avaliado + flag de condomínio fechado.
ALTER TABLE valuations ADD COLUMN IF NOT EXISTS amenities           jsonb    NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE valuations ADD COLUMN IF NOT EXISTS in_gated_community  boolean  NOT NULL DEFAULT false;

-- Verificação pós-execução:
-- SELECT table_name, column_name, data_type
--   FROM information_schema.columns
--  WHERE table_name IN ('listings', 'valuations')
--    AND column_name IN ('amenities', 'unit_type', 'in_gated_community')
--  ORDER BY table_name, column_name;

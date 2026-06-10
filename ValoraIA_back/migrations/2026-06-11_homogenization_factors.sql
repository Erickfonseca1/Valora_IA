-- Memória de cálculo: persistir os fatores de homogeneização aplicados.
ALTER TABLE valuations
  ADD COLUMN IF NOT EXISTS homogenization_factors jsonb;

-- Verificação:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'valuations' AND column_name = 'homogenization_factors';

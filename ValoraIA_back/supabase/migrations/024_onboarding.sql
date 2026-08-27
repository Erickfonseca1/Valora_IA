-- 024: onboarding da plataforma — marcado quando o usuário conclui o
-- wizard de dados e o tour de apresentação (1x por conta).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
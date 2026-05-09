-- =============================================================================
-- Backfill: marcar onboarding como completado (empresas existentes)
-- =============================================================================
-- Idempotente: solo actualiza filas donde aún NO hay onboardingCompletedAt.
-- Puedes ejecutarlo varias veces; las que ya tienen fecha no se tocan.
--
-- Dónde: Supabase → SQL Editor → pegar → Run.
--
-- Opcional: limitar a una empresa (descomenta y pon el UUID real):
--   AND company_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid
-- =============================================================================

UPDATE public.company_settings
SET data = jsonb_set(
  COALESCE(data, '{}'::jsonb),
  '{onboardingCompletedAt}',
  to_jsonb(now()::text),
  true
)
WHERE (
  -- Sin clave, o null JSON, o texto vacío
  NOT (data ? 'onboardingCompletedAt')
  OR data->'onboardingCompletedAt' IS NULL
  OR jsonb_typeof(data->'onboardingCompletedAt') = 'null'
  OR nullif(trim(data->>'onboardingCompletedAt'), '') IS NULL
);

-- Ver resultado (opcional):
-- SELECT company_id, data->>'onboardingCompletedAt' AS onboarding_completed
-- FROM public.company_settings;

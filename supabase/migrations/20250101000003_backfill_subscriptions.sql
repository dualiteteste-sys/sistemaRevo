-- Descrição: Este script cria uma assinatura 'trialing' de 30 dias para todas as empresas que ainda não possuem uma assinatura.
-- É uma operação segura (idempotente) que não afeta empresas que já têm uma assinatura.
-- Deve ser executado no SQL Editor do Supabase (com privilégios de service_role).

BEGIN;

-- Cria trial de 30 dias para empresas sem assinatura, ignorando duplicatas se houver corrida
WITH to_insert AS (
  SELECT e.id AS empresa_id
  FROM public.empresas e
  LEFT JOIN public.subscriptions s ON s.empresa_id = e.id
  WHERE s.empresa_id IS NULL
)
INSERT INTO public.subscriptions (empresa_id, status, current_period_end)
SELECT empresa_id, 'trialing', now() + interval '30 days'
FROM to_insert
ON CONFLICT (empresa_id) DO NOTHING;

COMMIT;

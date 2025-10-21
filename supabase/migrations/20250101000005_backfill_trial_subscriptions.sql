-- Este script verifica todas as empresas existentes e cria uma assinatura
-- 'trialing' de 30 dias para qualquer uma que ainda não tenha um registro
-- na tabela 'subscriptions'. É seguro executar várias vezes.

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

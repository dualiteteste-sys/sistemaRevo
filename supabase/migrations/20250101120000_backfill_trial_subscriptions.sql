/*
          # [Backfill Trial Subscriptions]
          Cria assinaturas de "trialing" para todas as empresas existentes que ainda não possuem uma assinatura.

          ## Query Description: ["Esta operação insere dados na tabela `subscriptions`. É segura e só afeta empresas que não possuem um registro de assinatura, garantindo que todas tenham um período de avaliação inicial. Nenhuma informação existente será alterada."]
          
          ## Metadata:
          - Schema-Category: ["Data"]
          - Impact-Level: ["Low"]
          - Requires-Backup: [false]
          - Reversible: [false]
          
          ## Structure Details:
          ["- Tabela afetada: public.subscriptions (INSERT)"]
          
          ## Security Implications:
          - RLS Status: [Enabled]
          - Policy Changes: [No]
          - Auth Requirements: [Deve ser executado com role `service_role` (ex: via SQL Editor do Supabase).]
          
          ## Performance Impact:
          - Indexes: [Nenhum]
          - Triggers: [Nenhum]
          - Estimated Impact: ["Baixo. A operação é rápida e afeta apenas um número limitado de registros."]
          */
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

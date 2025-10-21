/*
          # [PATCH] Correção de Schema para ENUMs de Billing e Recriação da RPC

          [Este patch garante que os tipos ENUM `billing_cycle` e `sub_status` existam no schema `public` antes de recriar a função `upsert_subscription` que depende deles. Também reaplica as permissões de segurança na função.]

          ## Query Description: [Esta operação é segura e corrige um erro de dependência de schema. Ela verifica se os tipos ENUM existem no schema 'public' e os cria se necessário. Em seguida, recria a função 'upsert_subscription' com a referência correta aos tipos e reforça as permissões para que apenas a 'service_role' possa executá-la. Não há impacto em dados existentes.]
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Tipos Afetados: `public.billing_cycle`, `public.sub_status` (criados se não existirem em `public`)
          - Funções Afetadas: `public.upsert_subscription` (recriada e permissões ajustadas)
          
          ## Security Implications:
          - RLS Status: Sem alterações diretas em RLS.
          - Policy Changes: Não
          - Auth Requirements: A função `upsert_subscription` é reforçada para ser executável apenas pela `service_role`.
          
          ## Performance Impact:
          - Indexes: Nenhum
          - Triggers: Nenhum
          - Estimated Impact: Nenhum impacto em performance.
          */

-- [PATCH] Criar os ENUMs em public garantindo o schema correto
DO $$
DECLARE
  has_billing_cycle_public boolean;
  has_sub_status_public     boolean;
BEGIN
  -- Verifica se 'billing_cycle' existe especificamente no schema 'public'
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'billing_cycle' AND n.nspname = 'public'
  ) INTO has_billing_cycle_public;

  IF NOT has_billing_cycle_public THEN
    CREATE TYPE public.billing_cycle AS ENUM ('monthly','yearly');
  END IF;

  -- Verifica se 'sub_status' existe especificamente no schema 'public'
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'sub_status' AND n.nspname = 'public'
  ) INTO has_sub_status_public;

  IF NOT has_sub_status_public THEN
    -- Mantém os mesmos valores usados no projeto
    CREATE TYPE public.sub_status AS ENUM (
      'trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired'
    );
  END IF;
END$$;


-- Recriar a função após os tipos existirem em public
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  p_empresa_id uuid,
  p_status public.sub_status,
  p_current_period_end timestamptz,
  p_price_id text,
  p_sub_id text,
  p_plan_slug text,
  p_billing_cycle public.billing_cycle,
  p_cancel_at_period_end boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slug text;
  v_cycle public.billing_cycle;
BEGIN
  -- [1] Blindagem dentro da RPC (somente service_role pode executar)
  IF coalesce((auth.jwt() ->> 'role'),'') <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: only service_role can call this function';
  END IF;

  -- Validação cruzada: price ↔ (slug, cycle) via catálogo
  SELECT slug, cycle INTO v_slug, v_cycle FROM public.plan_from_price(p_price_id);
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Stripe price % não está ativo/mapeado em public.plans', p_price_id;
  END IF;
  IF v_slug <> p_plan_slug OR v_cycle <> p_billing_cycle THEN
    RAISE EXCEPTION 'Inconsistência: price % mapeia p/ (%,%) mas payload informou (%,%)',
      p_price_id, v_slug, v_cycle, p_plan_slug, p_billing_cycle;
  END IF;

  -- UPSERT por empresa_id (chave primária)
  INSERT INTO public.subscriptions AS s (
    empresa_id, status, current_period_end, stripe_subscription_id,
    stripe_price_id, plan_slug, billing_cycle, cancel_at_period_end
  )
  VALUES (
    p_empresa_id, p_status, p_current_period_end, p_sub_id,
    p_price_id, p_plan_slug, p_billing_cycle, COALESCE(p_cancel_at_period_end, false)
  )
  ON CONFLICT (empresa_id) DO UPDATE
  SET status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      plan_slug = EXCLUDED.plan_slug,
      billing_cycle = EXCLUDED.billing_cycle,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at = now();
END;
$$;

-- [2] Permissões de EXECUTE: só o service_role deve conseguir chamar a RPC
REVOKE ALL ON FUNCTION public.upsert_subscription(
  uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_subscription(
  uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean
) TO service_role;

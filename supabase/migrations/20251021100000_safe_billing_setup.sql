-- =========================================================
-- [SAFE MIGRATION] Billing ENUMs (public) + plan_from_price + upsert_subscription
-- Executar como um bloco único. Idempotente.
-- =========================================================

-- [A] Garantir ENUMs no schema PUBLIC (namespaced)
DO $$
DECLARE
  has_billing_cycle_public boolean;
  has_sub_status_public     boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'billing_cycle' AND n.nspname = 'public'
  ) INTO has_billing_cycle_public;

  IF NOT has_billing_cycle_public THEN
    CREATE TYPE public.billing_cycle AS ENUM ('monthly','yearly');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'sub_status' AND n.nspname = 'public'
  ) INTO has_sub_status_public;

  IF NOT has_sub_status_public THEN
    CREATE TYPE public.sub_status AS ENUM (
      'trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired'
    );
  END IF;
END$$;

-- [B] (Re)criar função catálogo: price -> (slug, cycle)
-- Observação: public.plans.billing_cycle costuma ser TEXT; fazemos CAST explícito.
CREATE OR REPLACE FUNCTION public.plan_from_price(p_price_id text)
RETURNS TABLE(slug text, cycle public.billing_cycle)
LANGUAGE sql STABLE
AS $$
  SELECT
    slug,
    CASE
      WHEN billing_cycle IN ('monthly','yearly')
      THEN billing_cycle::public.billing_cycle
      ELSE NULL
    END AS cycle
  FROM public.plans
  WHERE stripe_price_id = p_price_id
    AND active = true
$$;

-- [C] (Re)criar RPC: upsert_subscription (somente service_role)
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
  v_slug  text;
  v_cycle public.billing_cycle;
BEGIN
  -- Blindagem: apenas service_role
  IF coalesce((auth.jwt() ->> 'role'),'') <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden: only service_role can call this function';
  END IF;

  -- Mapeamento/validação cruzada pelo catálogo local
  SELECT slug, cycle
    INTO v_slug, v_cycle
  FROM public.plan_from_price(p_price_id);

  IF v_slug IS NULL OR v_cycle IS NULL THEN
    RAISE EXCEPTION 'Stripe price % não está ativo/mapeado em public.plans', p_price_id;
  END IF;

  IF v_slug <> p_plan_slug OR v_cycle <> p_billing_cycle THEN
    RAISE EXCEPTION 'Inconsistência: price % mapeia p/ (%,%) mas payload informou (%,%)',
      p_price_id, v_slug, v_cycle, p_plan_slug, p_billing_cycle;
  END IF;

  -- UPSERT por empresa_id
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

-- [D] Owner e Permissões
ALTER FUNCTION public.upsert_subscription(
  uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.upsert_subscription(
  uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_subscription(
  uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean
) TO service_role;

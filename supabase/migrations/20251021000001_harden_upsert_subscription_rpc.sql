/*
          # [SECURITY] Harden upsert_subscription RPC
          This migration enhances the security of the billing system by restricting write access to the subscriptions table.

          ## Query Description: [This operation modifies the `upsert_subscription` function to ensure it can only be executed by the `service_role`. It revokes execution permission from all other roles, including `authenticated` users, and then explicitly grants it only to `service_role`. This prevents any possibility of a user bypassing the Stripe webhook flow to alter their own subscription status directly.]
          
          ## Metadata:
          - Schema-Category: ["Security", "Structural"]
          - Impact-Level: ["High"]
          - Requires-Backup: [false]
          - Reversible: [true]
          
          ## Structure Details:
          - Function `public.upsert_subscription` is altered.
          - Permissions (`GRANT`/`REVOKE`) on this function are changed.
          
          ## Security Implications:
          - RLS Status: [No change]
          - Policy Changes: [No]
          - Auth Requirements: [Execution is now restricted to `service_role` only.]
          
          ## Performance Impact:
          - Indexes: [No change]
          - Triggers: [No change]
          - Estimated Impact: [Negligible. Adds a single role check at the beginning of the function execution.]
          */

-- [1] Blindagem dentro da RPC (somente service_role pode executar)
-- Edita a função upsert_subscription para adicionar a checagem de role no início.
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
  -- Permite apenas chamadas com a role 'service_role' (webhook/backend)
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

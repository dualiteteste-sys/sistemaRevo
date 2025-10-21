-- =========================================================
-- [SAFE PATCH] Fix search_path usando to_regprocedure (compatível)
-- =========================================================
DO $$
BEGIN
  -- plan_from_price(text)
  IF to_regprocedure('public.plan_from_price(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.plan_from_price(text)
             SET search_path = public, pg_temp';
  END IF;

  -- upsert_subscription(uuid, sub_status, timestamptz, text, text, text, billing_cycle, boolean)
  IF to_regprocedure('public.upsert_subscription(uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.upsert_subscription(
               uuid, public.sub_status, timestamptz,
               text, text, text, public.billing_cycle, boolean
             ) SET search_path = public, pg_temp';
  END IF;

  -- create_empresa_and_link_owner(text, text, text)
  IF to_regprocedure('public.create_empresa_and_link_owner(text, text, text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text)
             SET search_path = public, pg_temp';
  END IF;

  -- is_admin_of_empresa(uuid)
  IF to_regprocedure('public.is_admin_of_empresa(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_admin_of_empresa(uuid)
             SET search_path = public, pg_temp';
  END IF;

  -- touch_updated_at()
  IF to_regprocedure('public.touch_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.touch_updated_at()
             SET search_path = public, pg_temp';
  END IF;
END
$$;

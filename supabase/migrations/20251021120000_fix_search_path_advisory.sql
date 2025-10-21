-- =========================================================
-- [SAFE PATCH] Fix search_path para funções do schema public
-- Motivo: evitar resolução ambígua de nomes e cumprir a regra "Function Search Path Mutable".
-- =========================================================

-- 1) Função indicada pelo linter
ALTER FUNCTION IF EXISTS public.plan_from_price(text)
  SET search_path = public, pg_temp;

-- 2) Funções SECURITY DEFINER (reforçar a configuração)
ALTER FUNCTION IF EXISTS public.upsert_subscription(
  uuid, public.sub_status, timestamptz, text, text, text, public.billing_cycle, boolean
) SET search_path = public, pg_temp;

-- 3) Outras funções públicas existentes
ALTER FUNCTION IF EXISTS public.create_empresa_and_link_owner(text, text, text)
  SET search_path = public, pg_temp;

ALTER FUNCTION IF EXISTS public.is_admin_of_empresa(uuid)
  SET search_path = public, pg_temp;

-- Esta função pode não existir, mas o IF EXISTS garante a segurança.
ALTER FUNCTION IF EXISTS public.touch_updated_at()
  SET search_path = public, pg_temp;

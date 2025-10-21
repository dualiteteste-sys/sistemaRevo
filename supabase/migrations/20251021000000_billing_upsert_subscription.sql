-- Garante a existência dos tipos ENUM necessários para o billing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_cycle') THEN
    CREATE TYPE public.billing_cycle AS ENUM ('monthly','yearly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sub_status') THEN
    -- Adicionado 'unpaid' conforme a tabela de subscriptions
    CREATE TYPE public.sub_status AS ENUM ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired');
  END IF;
END$$;

-- Função auxiliar para mapear um stripe_price_id para um plano e ciclo.
-- Isso centraliza a lógica de "catálogo de planos".
CREATE OR REPLACE FUNCTION public.plan_from_price(p_price_id text)
RETURNS TABLE(slug text, cycle public.billing_cycle)
LANGUAGE sql STABLE
AS $$
  SELECT slug, billing_cycle
  FROM public.plans
  WHERE stripe_price_id = p_price_id
    AND active = true
$$;

-- RPC para criar ou atualizar uma assinatura.
-- Esta será a ÚNICA forma de escrever na tabela public.subscriptions.
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
-- Fix de segurança essencial para funções SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_slug text;
  v_cycle public.billing_cycle;
BEGIN
  -- Validação cruzada: garante que o price_id corresponde ao slug/ciclo informados,
  -- usando a função plan_from_price como fonte da verdade.
  SELECT slug, cycle INTO v_slug, v_cycle FROM public.plan_from_price(p_price_id);
  IF v_slug IS NULL THEN
    RAISE EXCEPTION 'Stripe price ID % não está ativo ou não foi encontrado em public.plans', p_price_id;
  END IF;
  IF v_slug <> p_plan_slug OR v_cycle <> p_billing_cycle THEN
    RAISE EXCEPTION 'Inconsistência de dados: o price ID % mapeia para (%,%) mas o payload informou (%,%)',
      p_price_id, v_slug, v_cycle, p_plan_slug, p_billing_cycle;
  END IF;

  -- Operação de UPSERT na tabela de assinaturas.
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

-- Aplica o fix de search_path em funções SECURITY DEFINER existentes para mitigar riscos.
-- A função is_admin_of_empresa não foi encontrada, mas a create_empresa_and_link_owner sim.
ALTER FUNCTION public.create_empresa_and_link_owner(text,text,text) SET search_path = public, pg_temp;

-- Garante que o RLS está ativo e as políticas de segurança estão corretas.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Garante que apenas membros da empresa podem LER sua própria assinatura.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subs_select_for_members'
  ) THEN
    CREATE POLICY subs_select_for_members
    ON public.subscriptions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.empresa_usuarios eu
        WHERE eu.empresa_id = subscriptions.empresa_id
          AND eu.user_id = auth.uid()
      )
    );
  END IF;
END$$;

-- Revoga permissões de escrita direta para usuários autenticados, forçando o uso da RPC.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

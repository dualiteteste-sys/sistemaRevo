-- ============================
-- 1. CRIAÇÃO E ALTERAÇÃO DE TABELAS
-- ============================

-- Tabela de planos mapeada para o Stripe
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  name text NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  currency text NOT NULL DEFAULT 'BRL',
  amount_cents integer NOT NULL,
  stripe_price_id text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, billing_cycle)
);

COMMENT ON TABLE public.plans IS 'Catálogo de planos mapeado para Stripe Prices.';

-- Adiciona coluna de customer do Stripe na tabela de empresas
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Adiciona colunas do Stripe na tabela de assinaturas
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS plan_slug text,
  ADD COLUMN IF NOT EXISTS billing_cycle text CHECK (billing_cycle IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- ============================
-- 2. SEED INICIAL DA TABELA `plans`
-- ============================
-- IMPORTANTE: Substitua os valores 'price_...' pelos IDs reais do seu painel Stripe.
INSERT INTO public.plans (slug, name, billing_cycle, amount_cents, stripe_price_id)
VALUES
('START','Start', 'monthly',  4900, 'price_START_MENSAL'),
('PRO',  'Pro',   'monthly', 15900, 'price_PRO_MENSAL'),
('MAX',  'Max',   'monthly', 34900, 'price_MAX_MENSAL'),
('ULTRA','Ultra', 'monthly', 78900, 'price_ULTRA_MENSAL'),
('START','Start', 'yearly',  47880, 'price_START_ANUAL'), -- 39.90 * 12
('PRO',  'Pro',   'yearly', 154800, 'price_PRO_ANUAL'),  -- 129.00 * 12
('MAX',  'Max',   'yearly', 330000, 'price_MAX_ANUAL'),  -- 275.00 * 12
('ULTRA','Ultra', 'yearly', 754800, 'price_ULTRA_ANUAL') -- 629.00 * 12
ON CONFLICT (slug, billing_cycle) DO UPDATE
SET amount_cents = EXCLUDED.amount_cents,
    stripe_price_id = EXCLUDED.stripe_price_id,
    active = true;

-- ============================
-- 3. ÍNDICES E HARDENING
-- ============================

-- Índice útil para buscar assinaturas pelo ID do Stripe
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions(stripe_subscription_id);

-- Hardening da tabela `plans`
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública dos planos
DROP POLICY IF EXISTS "Permitir leitura pública dos planos" ON public.plans;
CREATE POLICY "Permitir leitura pública dos planos"
ON public.plans
FOR SELECT
USING (true);

-- Garante que apenas SELECT seja permitido para usuários autenticados e anônimos
REVOKE ALL ON public.plans FROM anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;

-- Garante que o service_role possa gerenciar o catálogo
GRANT INSERT, UPDATE, DELETE ON public.plans TO service_role;

-- Recarrega o schema para que as alterações de permissão sejam aplicadas
NOTIFY pgrst, 'reload schema';

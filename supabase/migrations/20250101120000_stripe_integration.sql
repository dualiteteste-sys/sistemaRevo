-- ============================
-- 1. Tabela `plans`
-- ============================
-- Tabela para o catálogo local dos preços do Stripe
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,                                -- 'START' | 'PRO' | 'MAX' | 'ULTRA'
  name text NOT NULL,                                -- nome exibido
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  currency text NOT NULL DEFAULT 'BRL',
  amount_cents integer NOT NULL,                     -- 4900, 15900, etc.
  stripe_price_id text NOT NULL UNIQUE,              -- price_xxx
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, billing_cycle)
);

COMMENT ON TABLE public.plans IS 'Catálogo de planos mapeado para Stripe Prices.';

-- ============================
-- 2. Alteração em `empresas`
-- ============================
-- Adiciona coluna para armazenar o customer do Stripe
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- ============================
-- 3. Alteração em `subscriptions`
-- ============================
-- Adiciona campos para Stripe e metadados de plano
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS plan_slug text,
  ADD COLUMN IF NOT EXISTS billing_cycle text CHECK (billing_cycle IN ('monthly','yearly')),
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- ============================
-- 4. Permissões
-- ============================
-- Leitura para usuários autenticados, escrita via service_role/webhook
GRANT SELECT ON public.plans TO anon, authenticated;

-- ============================
-- 5. Índices
-- ============================
CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx ON public.subscriptions(stripe_subscription_id);

-- ============================
-- 6. Seed da tabela `plans`
-- ============================
-- IMPORTANTE: Substitua 'price_...' pelos IDs de preço reais do seu painel Stripe.
INSERT INTO public.plans (slug, name, billing_cycle, amount_cents, stripe_price_id)
VALUES
('START','Start', 'monthly',  4900,  'price_START_MENSAL'),
('PRO',  'Pro',   'monthly', 15900,  'price_PRO_MENSAL'),
('MAX',  'Max',   'monthly', 34900,  'price_MAX_MENSAL'),
('ULTRA','Ultra', 'monthly', 78900,  'price_ULTRA_MENSAL'),

('START','Start', 'yearly',   3990,  'price_START_ANUAL'),
('PRO',  'Pro',   'yearly',  12900,  'price_PRO_ANUAL'),
('MAX',  'Max',   'yearly',  27500,  'price_MAX_ANUAL'),
('ULTRA','Ultra', 'yearly',  62900,  'price_ULTRA_ANUAL')
ON CONFLICT (slug,billing_cycle) DO UPDATE
SET amount_cents = EXCLUDED.amount_cents,
    stripe_price_id = EXCLUDED.stripe_price_id,
    active = true;

-- ============================
-- 7. Recarregar Schema
-- ============================
NOTIFY pgrst, 'reload schema';

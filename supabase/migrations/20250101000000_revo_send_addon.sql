-- =========================================================
-- ADD-ONS (REVO Send) – Catálogo, Estado por Empresa e View
-- Correções: FK composta (slug + billing_cycle) e view com isolamento de tenant
-- Segurança: RLS/GRANTs
-- =========================================================

-- 0) Helper idempotente para updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;

-- 1) Catálogo local de Add-ons (similar a public.plans)
CREATE TABLE IF NOT EXISTS public.addons (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL,                                    -- ex: 'REVO_SEND'
  name             text NOT NULL,                                    -- ex: 'REVO Send'
  billing_cycle    text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  currency         text NOT NULL DEFAULT 'BRL',
  amount_cents     integer NOT NULL,
  stripe_price_id  text NOT NULL UNIQUE,
  trial_days       integer NULL,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, billing_cycle)                                       -- << chave natural
);
COMMENT ON TABLE public.addons IS 'Catálogo local de add-ons mapeado para Stripe Prices.';

-- RLS: leitura pública (landing) e sem escrita por anon/authenticated
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública dos addons" ON public.addons;
CREATE POLICY "Permitir leitura pública dos addons"
  ON public.addons FOR SELECT USING (true);

REVOKE ALL ON public.addons FROM anon, authenticated;
GRANT  SELECT ON public.addons TO anon, authenticated;
GRANT  ALL    ON public.addons TO service_role;

-- 2) Estado por empresa (qual add-on está ativo) — FK composta correta
CREATE TABLE IF NOT EXISTS public.empresa_addons (
  empresa_id              uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  addon_slug              text NOT NULL,
  billing_cycle           text NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  status                  text NOT NULL CHECK (status IN ('trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired')),
  stripe_subscription_id  text,
  stripe_price_id         text,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, addon_slug),

  -- FK COMPOSTA: garante que (addon_slug, billing_cycle) exista no catálogo
  CONSTRAINT empresa_addons_fk_addon
    FOREIGN KEY (addon_slug, billing_cycle)
    REFERENCES public.addons (slug, billing_cycle)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS empresa_addons_sub_idx     ON public.empresa_addons(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS empresa_addons_empresa_idx ON public.empresa_addons(empresa_id);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS empresa_addons_touch ON public.empresa_addons;
CREATE TRIGGER empresa_addons_touch
  BEFORE UPDATE ON public.empresa_addons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS: somente membros veem seus próprios add-ons
ALTER TABLE public.empresa_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros veem seus add-ons" ON public.empresa_addons;
CREATE POLICY "Membros veem seus add-ons"
  ON public.empresa_addons FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.empresa_usuarios eu
      WHERE eu.empresa_id = empresa_addons.empresa_id
        AND eu.user_id     = auth.uid()
    )
  );

-- escrita somente via webhooks/service_role
REVOKE INSERT, UPDATE, DELETE ON public.empresa_addons FROM anon, authenticated;
GRANT  SELECT                           ON public.empresa_addons TO authenticated;
GRANT  ALL                              ON public.empresa_addons TO service_role;

-- 3) View de feature flags por empresa (ISOLADA por tenant)
--    Só lista empresas onde o usuário é membro; flag true se add-on ativo/trial e não cancelado.
CREATE OR REPLACE VIEW public.empresa_features AS
SELECT
  e.id AS empresa_id,
  (
    EXISTS (
      SELECT 1
      FROM public.empresa_addons ea
      WHERE ea.empresa_id = e.id
        AND ea.addon_slug = 'REVO_SEND'
        AND ea.status IN ('active','trialing')
        AND COALESCE(ea.cancel_at_period_end, false) = false
    )
  ) AS revo_send_enabled
FROM public.empresas e
WHERE EXISTS (
  SELECT 1
  FROM public.empresa_usuarios eu
  WHERE eu.empresa_id = e.id
    AND eu.user_id    = auth.uid()
);

ALTER VIEW public.empresa_features OWNER TO postgres;
GRANT SELECT ON public.empresa_features TO authenticated;

-- 4) Seed do catálogo (SUBSTITUIR pelos Price IDs REAIS do Stripe – já fornecidos)
-- Trial de 30 dias
-- Se já existir, faz upsert mantendo ativo e atualizando price_id/valor/trial
INSERT INTO public.addons (slug, name, billing_cycle, amount_cents, stripe_price_id, trial_days, active)
VALUES
('REVO_SEND','REVO Send','monthly',  4900,  'price_1SKXlM5Ay7EJ5Bv6OFuCG7Q6', 30, true),
('REVO_SEND','REVO Send','yearly',  47880, 'price_1SKXlM5Ay7EJ5Bv6EGQOovvj', 30, true)
ON CONFLICT (slug, billing_cycle) DO UPDATE SET
  name            = EXCLUDED.name,
  amount_cents    = EXCLUDED.amount_cents,
  stripe_price_id = EXCLUDED.stripe_price_id,
  trial_days      = EXCLUDED.trial_days,
  active          = EXCLUDED.active;

-- 5) Reload do schema para refletir as mudanças
NOTIFY pgrst, 'reload schema';

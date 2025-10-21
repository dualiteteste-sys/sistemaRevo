-- ============================
-- 1. REFORÇOS EM `subscriptions`
-- ============================

-- Garante que o status padrão seja 'trialing'
ALTER TABLE public.subscriptions
  ALTER COLUMN status SET DEFAULT 'trialing';

-- Garante que o índice por empresa_id exista
CREATE INDEX IF NOT EXISTS subscriptions_empresa_id_idx
  ON public.subscriptions(empresa_id);

-- ============================
-- 2. ATUALIZAÇÃO DA RPC
-- ============================
-- Assinatura: create_empresa_and_link_owner(text, text, text)
-- Retorno: TABLE (empresa_id uuid, razao_social text, fantasia text, cnpj text)

CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(
  p_razao_social text,
  p_fantasia     text,
  p_cnpj         text
)
RETURNS TABLE (
  empresa_id   uuid,
  razao_social text,
  fantasia     text,
  cnpj         text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id        uuid := auth.uid();
  v_cnpj_normalized text := regexp_replace(p_cnpj, '\D', '', 'g');
  new_empresa_id    uuid;
BEGIN
  -- 1) Sessão deve existir
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_signed_in'
      USING HINT = 'Faça login antes de criar a empresa.';
  END IF;

  -- 2) Valida CNPJ (14 dígitos ou nulo)
  IF v_cnpj_normalized IS NOT NULL AND length(v_cnpj_normalized) NOT IN (0, 14) THEN
    RAISE EXCEPTION 'invalid_cnpj_format'
      USING HINT = 'O CNPJ deve ter 14 dígitos ou ser nulo.';
  END IF;

  -- 3) Cria a empresa (idempotente por CNPJ)
  BEGIN
    INSERT INTO public.empresas (razao_social, fantasia, cnpj)
    VALUES (p_razao_social, p_fantasia, v_cnpj_normalized)
    RETURNING id INTO new_empresa_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT e.id INTO new_empresa_id
    FROM public.empresas e
    WHERE e.cnpj = v_cnpj_normalized;
  END;

  -- 4) Linka o usuário como admin (idempotente)
  BEGIN
    INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
    VALUES (new_empresa_id, v_user_id, 'admin');
  EXCEPTION WHEN unique_violation THEN
    -- já existia o vínculo, segue
    NULL;
  END;

  -- 5) Garante assinatura "trialing" + 30 dias (idempotente)
  BEGIN
    INSERT INTO public.subscriptions (empresa_id, status, current_period_end)
    VALUES (new_empresa_id, 'trialing', now() + interval '30 days');
  EXCEPTION WHEN unique_violation THEN
    -- se já existe, NÃO altera aqui (billing/cron cuidará de renovações)
    NULL;
  END;

  -- 6) Retorna a empresa criada/encontrada
  RETURN QUERY
    SELECT e.id, e.razao_social, e.fantasia, e.cnpj
    FROM public.empresas e
    WHERE e.id = new_empresa_id;
END;
$$;

-- Reforço de ownership e grants (idempotente)
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text, text, text) TO authenticated;

-- Reload do PostgREST para refletir a alteração na RPC
NOTIFY pgrst, 'reload schema';

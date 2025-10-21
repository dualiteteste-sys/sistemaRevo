-- 1. Finaliza a função `create_empresa_and_link_owner` com todas as validações e um retorno de dados mais rico.
CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(
  p_razao_social text,
  p_fantasia text,
  p_cnpj text
)
RETURNS TABLE (
  empresa_id uuid,
  razao_social text,
  fantasia text,
  cnpj text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_cnpj_normalized text := regexp_replace(p_cnpj, '\D', '', 'g');
  new_empresa_id uuid;
BEGIN
  -- Validação de sessão
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING HINT = 'Faça login antes de criar a empresa.';
  END IF;

  -- Validação do formato do CNPJ
  IF v_cnpj_normalized IS NOT NULL AND length(v_cnpj_normalized) NOT IN (0, 14) THEN
    RAISE EXCEPTION 'invalid_cnpj_format' USING HINT = 'O CNPJ deve ter 14 dígitos ou ser nulo.';
  END IF;

  -- Inserção da empresa
  INSERT INTO public.empresas (razao_social, fantasia, cnpj)
  VALUES (p_razao_social, p_fantasia, v_cnpj_normalized)
  RETURNING id INTO new_empresa_id;

  -- Inserção do vínculo (com tratamento de duplicata)
  BEGIN
    INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
    VALUES (new_empresa_id, v_user_id, 'admin');
  EXCEPTION WHEN unique_violation THEN
    -- Ignora o erro se o vínculo já existir, garantindo idempotência.
  END;

  -- Retorna os dados da empresa criada
  RETURN QUERY
    SELECT e.id, e.razao_social, e.fantasia, e.cnpj
    FROM public.empresas e
    WHERE e.id = new_empresa_id;
END;
$$;

-- 2. Garante as permissões corretas
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text, text, text) TO authenticated;

-- 3. Garante a unicidade do CNPJ (quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS empresas_cnpj_unique_not_null
  ON public.empresas (cnpj)
  WHERE cnpj IS NOT NULL;

-- 4. Recarrega o schema do PostgREST para que as alterações na RPC sejam refletidas imediatamente.
NOTIFY pgrst, 'reload schema';

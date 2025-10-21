-- Corrige o erro de tipo de retorno ao recriar a função.
-- Primeiro, removemos a função existente que retorna um tipo diferente (uuid).
DROP FUNCTION IF EXISTS public.create_empresa_and_link_owner(text, text, text);

-- Em seguida, recriamos a função com a lógica mais recente e o tipo de retorno correto (TABLE).
CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(
  p_razao_social text,
  p_fantasia text,
  p_cnpj text
)
RETURNS TABLE (empresa_id uuid, razao_social text, fantasia text, cnpj text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_empresa_id uuid;
  v_user_id uuid := auth.uid();
  v_cnpj_normalized text := regexp_replace(p_cnpj, '\D', '', 'g');
BEGIN
  -- Validação da sessão
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING HINT = 'Faça login antes de criar a empresa.';
  END IF;

  -- Validação do CNPJ
  IF v_cnpj_normalized IS NOT NULL AND length(v_cnpj_normalized) NOT IN (0, 14) THEN
    RAISE EXCEPTION 'invalid_cnpj_format' USING HINT = 'Envie 14 dígitos ou deixe nulo.';
  END IF;

  -- Bloco para criar a empresa de forma idempotente (à prova de clique duplo)
  BEGIN
    INSERT INTO public.empresas (razao_social, fantasia, cnpj)
    VALUES (p_razao_social, p_fantasia, v_cnpj_normalized)
    RETURNING id INTO new_empresa_id;
  EXCEPTION WHEN unique_violation THEN
    -- Se o CNPJ já existe, busca o ID da empresa existente.
    SELECT e.id INTO new_empresa_id
    FROM public.empresas e
    WHERE e.cnpj = v_cnpj_normalized;
  END;

  -- Bloco para criar o vínculo do usuário com a empresa de forma idempotente
  BEGIN
    INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
    VALUES (new_empresa_id, v_user_id, 'admin');
  EXCEPTION WHEN unique_violation THEN
    -- Se o vínculo já existe, não faz nada e segue em frente.
  END;

  -- Retorna os dados da empresa (criada ou encontrada)
  RETURN QUERY
    SELECT e.id, e.razao_social, e.fantasia, e.cnpj
    FROM public.empresas e
    WHERE e.id = new_empresa_id;
END;
$$;

-- Reforça as permissões e propriedade da função
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text, text, text) TO authenticated;

-- Garante que o PostgREST reconheça as alterações imediatamente
NOTIFY pgrst, 'reload schema';

/*
# [Operation Name]
Reforço da RPC de Criação de Empresa e Adição de Função de Diagnóstico

## Query Description:
Este script aprimora a função `create_empresa_and_link_owner` para torná-la mais segura e resiliente. As principais mudanças são:
1.  **Normalização de CNPJ:** Remove caracteres não numéricos do CNPJ antes de salvar, garantindo consistência dos dados.
2.  **Tratamento de Exceção:** Adiciona um bloco `EXCEPTION` para lidar com violações de chave única ao inserir o vínculo em `empresa_usuarios`, tornando a função mais idempotente e evitando falhas em caso de reexecução.
3.  **Permissões Explícitas:** Garante que a propriedade e os privilégios da função estejam corretamente configurados.
Além disso, este script cria uma nova função de diagnóstico `whoami()` que retorna o `auth.uid()` do usuário autenticado, facilitando a depuração da sessão do lado do cliente.

## Metadata:
- Schema-Category: ["Structural", "Safe"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Funções Modificadas: `public.create_empresa_and_link_owner`
- Funções Criadas: `public.whoami`

## Security Implications:
- RLS Status: Sem alterações nas políticas de RLS.
- Policy Changes: No
- Auth Requirements: A função `create_empresa_and_link_owner` continua exigindo um usuário autenticado (`authenticated` role).

## Performance Impact:
- Indexes: Nenhum
- Triggers: Nenhum
- Estimated Impact: Nenhum impacto de performance esperado. As mudanças são para robustez e segurança.
*/

-- 1. Reforçar a função `create_empresa_and_link_owner` com normalização e tratamento de exceção.
CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(
  p_razao_social text,
  p_fantasia text,
  p_cnpj text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_empresa_id uuid;
  v_user_id uuid := auth.uid();
  v_cnpj_normalized text := regexp_replace(p_cnpj, '\D', '', 'g');
BEGIN
  -- 1. Falhar cedo se o usuário não estiver autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_signed_in'
      USING HINT = 'Faça login antes de criar a empresa.';
  END IF;

  -- 2. Criar a empresa com CNPJ normalizado
  INSERT INTO public.empresas (razao_social, fantasia, cnpj)
  VALUES (p_razao_social, p_fantasia, v_cnpj_normalized)
  RETURNING id INTO new_empresa_id;

  -- 3. Vincular o usuário à nova empresa, tratando duplicatas de forma graciosa
  BEGIN
    INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
    VALUES (new_empresa_id, v_user_id, 'admin');
  EXCEPTION WHEN unique_violation THEN
    -- Se o vínculo já existir por algum motivo, não faz nada e continua.
    -- Isso torna a função mais resiliente a reexecuções.
    NULL;
  END;

  RETURN new_empresa_id;
END;
$$;

-- 2. Garantir a propriedade e as permissões corretas para a função
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text, text, text) TO authenticated;


-- 3. Criar função de diagnóstico `whoami` para verificar a sessão
CREATE OR REPLACE FUNCTION public.whoami()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- 4. Definir propriedade e permissões para a função `whoami`
ALTER FUNCTION public.whoami() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.whoami() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.whoami() TO anon, authenticated;


-- 5. Recarregar o schema do PostgREST para que as alterações sejam aplicadas imediatamente
NOTIFY pgrst, 'reload schema';

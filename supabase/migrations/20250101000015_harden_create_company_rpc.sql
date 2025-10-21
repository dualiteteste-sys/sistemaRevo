/*
# [Hardening] Fortalece a RPC de criação de empresa

## Descrição da Consulta:
Esta operação atualiza a função `create_empresa_and_link_owner` para garantir que ela só possa ser executada por um usuário autenticado. Ela adiciona uma verificação para `auth.uid()` e lança uma exceção clara ('not_signed_in') se o usuário não estiver logado. Isso evita a criação de uma empresa sem o vínculo correspondente na tabela `empresa_usuarios`, que era a causa raiz do problema de carregamento infinito.

## Metadados:
- Categoria do Esquema: "Estrutural"
- Nível de Impacto: "Baixo"
- Requer Backup: false
- Reversível: true (pode-se reverter para a versão anterior da função)

## Detalhes da Estrutura:
- Afeta: Função `public.create_empresa_and_link_owner`

## Implicações de Segurança:
- Status RLS: Não alterado
- Alterações de Política: Não
- Requisitos de Autenticação: Reforça a necessidade de autenticação para chamar esta função.

## Impacto no Desempenho:
- Índices: Nenhum
- Gatilhos: Nenhum
- Impacto Estimado: Mínimo. Adiciona uma verificação de nulidade.
*/

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
BEGIN
  -- Falha cedo se não houver sessão de usuário autenticado
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_signed_in'
      USING HINT = 'Faça login antes de criar a empresa.';
  END IF;

  -- Cria a empresa
  INSERT INTO public.empresas (razao_social, fantasia, cnpj)
  VALUES (p_razao_social, p_fantasia, p_cnpj)
  RETURNING id INTO new_empresa_id;

  -- Cria o vínculo do usuário como administrador da nova empresa
  INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
  VALUES (new_empresa_id, v_user_id, 'admin');

  RETURN new_empresa_id;
END;
$$;

-- Recarrega o schema do PostgREST para que a alteração na RPC seja refletida imediatamente
NOTIFY pgrst, 'reload schema';

/*
# [SEGURANÇA] Correção do Search Path de Funções
[Esta migração aborda o aviso de segurança 'Function Search Path Mutable' ao definir explicitamente o search_path para funções SECURITY DEFINER existentes. Isso previne potenciais ataques de sequestro de caminho (hijacking) ao garantir que as funções executem com um caminho de busca de schemas seguro e previsível.]

## Descrição da Query: [Esta operação altera funções existentes do banco de dados para torná-las mais seguras. É uma mudança não destrutiva que melhora a postura de segurança da aplicação. Nenhum dado é afetado.]

## Metadados:
- Categoria-Schema: ["Estrutural", "Segurança"]
- Nível-Impacto: ["Baixo"]
- Requer-Backup: [false]
- Reversível: [true]

## Detalhes da Estrutura:
- Funções afetadas:
  - public.create_empresa_and_link_owner(text, text, text)
  - public.is_admin_of_empresa(uuid) (se existir)

## Implicações de Segurança:
- Status de RLS: [Não Alterado]
- Mudanças de Política: [Não]
- Requisitos de Auth: [Mitiga vulnerabilidades potenciais de escalonamento de privilégios em funções SECURITY DEFINER.]

## Impacto de Performance:
- Índices: [Não Afetado]
- Triggers: [Não Afetados]
- Impacto Estimado: [Nenhum. Esta é uma alteração de metadados na definição das funções.]
*/

-- Define um search_path seguro para a função que cria empresas.
-- Esta é uma função SECURITY DEFINER e precisa desta proteção.
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text)
  SET search_path = public, pg_temp;

-- Garante que a função auxiliar para checar direitos de admin também tenha um search_path seguro.
-- Esta verificação é feita de forma segura para não falhar se a função não existir.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_of_empresa'
  ) THEN
    ALTER FUNCTION public.is_admin_of_empresa(uuid)
      SET search_path = public, pg_temp;
  END IF;
END$$;

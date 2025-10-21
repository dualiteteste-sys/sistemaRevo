/*
          # ==========================================
          #       SCHEMA INICIAL MULTI-TENANT
          # ==========================================
          Este script configura a estrutura fundamental para uma aplicação multi-tenant,
          incluindo tabelas para empresas, perfis de usuário e a associação entre eles.
          Também implementa funções, gatilhos e políticas de segurança (RLS) para
          garantir o isolamento de dados e o controle de acesso adequado.
*/

/*
          # CRIAÇÃO DA TABELA: public.empresas
          Armazena os registros de cada tenant (empresa) na aplicação.

          ## Query Description: Cria a tabela `empresas` que servirá como a entidade central para o multi-tenancy. Não há risco de perda de dados, pois é uma operação de criação.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (DROP TABLE)
          
          ## Structure Details:
          - Tabela: public.empresas
          - Colunas: id, razao_social, fantasia, cnpj, created_at, updated_at
          
          ## Security Implications:
          - RLS Status: Será habilitado posteriormente.
          - Policy Changes: Não.
          - Auth Requirements: Não.
          
          ## Performance Impact:
          - Indexes: Chave primária em `id`.
          - Triggers: Não.
          - Estimated Impact: Nenhum.
*/
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social TEXT NOT NULL,
    fantasia TEXT,
    cnpj TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.empresas IS 'Tabela para armazenar informações de cada empresa (tenant).';

/*
          # CRIAÇÃO DA TABELA: public.profiles
          Armazena dados públicos dos usuários, vinculados à tabela `auth.users`.

          ## Query Description: Cria a tabela `profiles` para estender a `auth.users` com metadados públicos. A chave primária é uma FK para `auth.users.id`, garantindo a integridade.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (DROP TABLE)
          
          ## Structure Details:
          - Tabela: public.profiles
          - Colunas: id, nome_completo, cpf, avatar_url, updated_at
          
          ## Security Implications:
          - RLS Status: Será habilitado posteriormente.
          - Policy Changes: Não.
          - Auth Requirements: A coluna `id` referencia `auth.users`.
          
          ## Performance Impact:
          - Indexes: Chave primária em `id`.
          - Triggers: Não.
          - Estimated Impact: Nenhum.
*/
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT,
    cpf TEXT UNIQUE,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Armazena dados de perfil público para usuários.';

/*
          # CRIAÇÃO DA TABELA: public.empresa_usuarios
          Tabela de junção que associa usuários a empresas e define suas permissões (roles).

          ## Query Description: Cria a tabela `empresa_usuarios` para gerenciar o vínculo N-para-N entre usuários e empresas. Define a permissão de cada usuário dentro de uma empresa.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: true (DROP TABLE)
          
          ## Structure Details:
          - Tabela: public.empresa_usuarios
          - Colunas: empresa_id, user_id, role
          - Constraints: Chave primária composta e chaves estrangeiras.
          
          ## Security Implications:
          - RLS Status: Será habilitado com `NO FORCE` (exceção necessária para a função `is_admin_of_empresa`).
          - Policy Changes: Não.
          - Auth Requirements: As colunas `empresa_id` e `user_id` referenciam `empresas` e `auth.users`.
          
          ## Performance Impact:
          - Indexes: Chave primária e índices em FKs serão criados.
          - Triggers: Não.
          - Estimated Impact: Nenhum na criação.
*/
CREATE TABLE public.empresa_usuarios (
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    PRIMARY KEY (empresa_id, user_id)
);
COMMENT ON TABLE public.empresa_usuarios IS 'Associa usuários a empresas com uma permissão específica.';
CREATE INDEX ON public.empresa_usuarios (user_id);
CREATE INDEX ON public.empresa_usuarios (empresa_id);


/*
          # FUNÇÃO DE TRIGGER: public.handle_new_user
          Cria um perfil em `public.profiles` sempre que um novo usuário é criado em `auth.users`.

          ## Query Description: Esta função é acionada após a inserção de um novo usuário. Ela cria um registro correspondente na tabela `profiles`, garantindo que cada usuário tenha um perfil. É idempotente (UPSERT) para evitar falhas em caso de re-execução.
          
          ## Metadata:
          - Schema-Category: "Data"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (DROP FUNCTION)
          
          ## Structure Details:
          - Função: public.handle_new_user
          - Ação: Insere ou atualiza (UPSERT) um registro em `public.profiles`.
          
          ## Security Implications:
          - `SECURITY DEFINER` é usado para permitir que a função escreva na tabela `profiles`, mesmo que o usuário recém-criado ainda não tenha permissão direta.
          - RLS Status: A função bypassa RLS na tabela `profiles` devido ao `SECURITY DEFINER`.
          - Policy Changes: Não.
          - Auth Requirements: Não.
          
          ## Performance Impact:
          - Triggers: Será acionada por um trigger em `auth.users`.
          - Estimated Impact: Mínimo, ocorre apenas na criação de usuários.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

/*
          # TRIGGER: on_auth_user_created
          Aciona a função `handle_new_user` após a criação de um usuário.

          ## Query Description: Este trigger vincula o evento de criação de usuário em `auth.users` à função `handle_new_user`. É uma peça chave para a automação da criação de perfis.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (DROP TRIGGER)
          
          ## Structure Details:
          - Trigger: on_auth_user_created
          - Tabela Alvo: auth.users
          - Evento: AFTER INSERT
          
          ## Security Implications:
          - Nenhuma direta, a segurança é gerenciada pela função que ele aciona.
          
          ## Performance Impact:
          - Adiciona uma operação síncrona mínima no fluxo de cadastro de usuário.
*/
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


/*
          # FUNÇÃO DE SEGURANÇA: public.is_admin_of_empresa
          Verifica se o usuário autenticado é um administrador de uma empresa específica.

          ## Query Description: Função auxiliar crucial para políticas de RLS. Verifica se o `auth.uid()` atual corresponde a um usuário com a permissão 'admin' na tabela `empresa_usuarios` para uma dada `empresa_id`.
          
          ## Metadata:
          - Schema-Category: "Data"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true (DROP FUNCTION)
          
          ## Structure Details:
          - Função: public.is_admin_of_empresa(uuid)
          - Retorno: boolean
          
          ## Security Implications:
          - `SECURITY DEFINER` é usado para que a função possa ler a tabela `empresa_usuarios` sem ser bloqueada por RLS, evitando recursão infinita em políticas de escrita.
          - RLS Status: Bypassa RLS em `empresa_usuarios` para verificação.
          
          ## Performance Impact:
          - O desempenho depende da indexação da tabela `empresa_usuarios`. Índices adequados foram criados.
*/
CREATE OR REPLACE FUNCTION public.is_admin_of_empresa(p_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM empresa_usuarios
    WHERE empresa_id = p_empresa_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) INTO is_admin;
  RETURN is_admin;
END;
$$;


/*
          # FUNÇÃO RPC: public.create_empresa_and_link_owner
          Cria uma nova empresa e define o usuário autenticado como o proprietário (admin).

          ## Query Description: Esta função é exposta via API (RPC) para o frontend. Ela encapsula a lógica de criar uma nova empresa e, em seguida, criar o vínculo na tabela `empresa_usuarios`, atribuindo a permissão 'admin' ao criador.
          
          ## Metadata:
          - Schema-Category: "Data"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: true (DROP FUNCTION)
          
          ## Structure Details:
          - Função: public.create_empresa_and_link_owner(text, text, text)
          - Ação: Insere em `empresas` e `empresa_usuarios`.
          - Retorno: UUID da nova empresa.
          
          ## Security Implications:
          - `SECURITY DEFINER` garante que a função tenha permissões para escrever em ambas as tabelas, independentemente das políticas de RLS.
          - O `user_id` é obtido de `auth.uid()` internamente, prevenindo que um usuário crie uma empresa em nome de outro.
          
          ## Performance Impact:
          - Realiza duas inserções em uma única chamada. O impacto é baixo e localizado no fluxo de criação de tenant.
*/
CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(
    p_razao_social TEXT,
    p_fantasia TEXT,
    p_cnpj TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_empresa_id UUID;
  current_user_id UUID := auth.uid();
BEGIN
  -- Cria a empresa
  INSERT INTO public.empresas (razao_social, fantasia, cnpj)
  VALUES (p_razao_social, p_fantasia, p_cnpj)
  RETURNING id INTO new_empresa_id;

  -- Vincula o usuário como admin da nova empresa
  INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
  VALUES (new_empresa_id, current_user_id, 'admin');

  RETURN new_empresa_id;
END;
$$;


/*
          # HABILITAÇÃO DE RLS (Row Level Security)
          Ativa o RLS para todas as tabelas de dados do usuário.

          ## Query Description: Este bloco ativa a segurança a nível de linha para as tabelas. Após esta etapa, nenhum dado será visível ou modificável a menos que uma política explícita permita.
          
          ## Metadata:
          - Schema-Category: "Dangerous"
          - Impact-Level: "High"
          - Requires-Backup: false
          - Reversible: true (ALTER TABLE ... DISABLE ROW LEVEL SECURITY)
          
          ## Security Implications:
          - RLS Status: Habilitado para `profiles`, `empresas`, e `empresa_usuarios`.
          - `empresa_usuarios` é configurada com `NO FORCE`, uma exceção necessária para permitir que a função `is_admin_of_empresa` funcione corretamente em políticas de escrita sem causar recursão.
*/
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios FORCE ROW LEVEL SECURITY; -- Primeiro força para o padrão
ALTER TABLE public.empresa_usuarios NO FORCE ROW LEVEL SECURITY; -- Depois desativa o FORCE, mantendo RLS habilitado


/*
          # POLÍTICAS DE RLS: public.profiles
          Define quem pode ver e modificar perfis de usuário.

          ## Query Description:
          1.  **SELECT**: Permite que um usuário veja apenas o seu próprio perfil.
          2.  **UPDATE**: Permite que um usuário atualize apenas o seu próprio perfil.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Medium"
          - Requires-Backup: false
          - Reversible: true (DROP POLICY)
*/
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seus próprios perfis"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


/*
          # POLÍTICAS DE RLS: public.empresas
          Define o acesso à tabela de empresas.

          ## Query Description:
          1.  **SELECT**: Permite que um usuário veja as empresas das quais ele é membro (admin ou member).
          2.  **UPDATE/DELETE**: Permite que apenas administradores da empresa a modifiquem ou excluam.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "High"
          - Requires-Backup: false
          - Reversible: true (DROP POLICY)
*/
CREATE POLICY "Membros podem ver as empresas das quais participam"
ON public.empresas FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.empresa_usuarios
    WHERE empresa_usuarios.empresa_id = empresas.id
      AND empresa_usuarios.user_id = auth.uid()
  )
);

CREATE POLICY "Admins podem atualizar e deletar suas empresas"
ON public.empresas FOR ALL
USING (public.is_admin_of_empresa(id))
WITH CHECK (public.is_admin_of_empresa(id));


/*
          # POLÍTICAS DE RLS: public.empresa_usuarios
          Define o acesso à tabela de associação. Este é o conjunto de regras mais complexo.

          ## Query Description:
          1.  **SELECT**: Permite que um usuário veja apenas as suas próprias associações (em quais empresas ele está). A simplicidade desta regra é fundamental para evitar recursão.
          2.  **INSERT**: Permite que um admin de uma empresa adicione novos usuários a ela.
          3.  **UPDATE**: Permite que um admin de uma empresa altere as permissões de outros usuários.
          4.  **DELETE**: Permite que um admin remova usuários da empresa, e também permite que um usuário se remova de uma empresa.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "High"
          - Requires-Backup: false
          - Reversible: true (DROP POLICY)
*/
CREATE POLICY "Usuários podem ver suas próprias associações"
ON public.empresa_usuarios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem adicionar e modificar usuários em suas empresas"
ON public.empresa_usuarios FOR INSERT
WITH CHECK (public.is_admin_of_empresa(empresa_id));

CREATE POLICY "Admins podem atualizar roles de usuários"
ON public.empresa_usuarios FOR UPDATE
USING (public.is_admin_of_empresa(empresa_id));

CREATE POLICY "Admins podem remover usuários e usuários podem se remover"
ON public.empresa_usuarios FOR DELETE
USING (
    public.is_admin_of_empresa(empresa_id) OR
    auth.uid() = user_id
);

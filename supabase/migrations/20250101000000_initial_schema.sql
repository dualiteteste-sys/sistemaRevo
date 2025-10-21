--
-- Visão Geral da Migração
--
-- Este script configura a arquitetura multi-tenant inicial, incluindo:
-- 1. Tabelas: `empresas`, `profiles`, `empresa_usuarios`.
-- 2. Funções: `handle_new_user`, `is_admin_of_empresa`, `create_empresa_and_link_owner`.
-- 3. Triggers: Para sincronizar perfis e atualizar timestamps.
-- 4. RLS (Row Level Security): Políticas de segurança para isolar os dados dos tenants.
-- 5. Permissões: `GRANTs` necessários para a API do Supabase funcionar corretamente.
--

-- Habilita a extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Garante que as roles `anon` e `authenticated` possam acessar o schema `public`
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Tabela para armazenar os tenants (empresas)
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  fantasia text,
  cnpj text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.empresas IS 'Armazena os dados de cada empresa (tenant).';

-- Tabela para armazenar perfis públicos dos usuários
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo text,
  cpf text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE public.profiles IS 'Dados públicos dos usuários, sincronizados com auth.users.';

-- Tabela de associação entre usuários e empresas (membership)
CREATE TABLE IF NOT EXISTS public.empresa_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (empresa_id, user_id)
);
COMMENT ON TABLE public.empresa_usuarios IS 'Associa usuários a empresas com uma role específica.';
CREATE INDEX IF NOT EXISTS empresa_usuarios_empresa_user_idx ON public.empresa_usuarios (empresa_id, user_id);

-- Concede permissões básicas nas tabelas para a role `authenticated`
-- A RLS cuidará do acesso a nível de linha.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresa_usuarios TO authenticated;

-- Função para atualizar o campo `updated_at` automaticamente
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;

-- Triggers para `updated_at`
DROP TRIGGER IF EXISTS empresas_touch_updated ON public.empresas;
CREATE TRIGGER empresas_touch_updated
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

DROP TRIGGER IF EXISTS profiles_touch_updated ON public.profiles;
CREATE TRIGGER profiles_touch_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- Função para criar um perfil de usuário ao se registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  meta  jsonb := COALESCE(to_jsonb(NEW) -> 'raw_user_meta_data', to_jsonb(NEW) -> 'raw_app_meta_data', '{}'::jsonb);
  v_nome text := COALESCE(meta->>'fullName', meta->>'full_name', meta->>'name');
  v_cpf  text := COALESCE(meta->>'cpf_cnpj', meta->>'cpf');
BEGIN
  INSERT INTO public.profiles (id, nome_completo, cpf)
  VALUES (NEW.id, v_nome, v_cpf)
  ON CONFLICT (id) DO UPDATE
    SET nome_completo = COALESCE(EXCLUDED.nome_completo, profiles.nome_completo),
        cpf          = COALESCE(EXCLUDED.cpf, profiles.cpf),
        updated_at   = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Trigger para `handle_new_user`
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Função para checar se um usuário é admin de uma empresa
CREATE OR REPLACE FUNCTION public.is_admin_of_empresa(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.empresa_id = p_empresa_id
      AND eu.user_id    = auth.uid()
      AND eu.role       = 'admin'
  );
$$;
ALTER FUNCTION public.is_admin_of_empresa(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin_of_empresa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_of_empresa(uuid) TO authenticated;

-- RPC para criar a primeira empresa e vincular o usuário como admin
CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(
  p_razao_social text,
  p_fantasia     text,
  p_cnpj         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_empresa_id uuid;
BEGIN
  INSERT INTO public.empresas (razao_social, fantasia, cnpj)
  VALUES (p_razao_social, p_fantasia, p_cnpj)
  RETURNING id INTO new_empresa_id;

  INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
  VALUES (new_empresa_id, auth.uid(), 'admin');

  RETURN new_empresa_id;
END;
$$;
ALTER FUNCTION public.create_empresa_and_link_owner(text,text,text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text,text,text) TO authenticated;

--
-- POLÍTICAS DE RLS (ROW LEVEL SECURITY)
--

-- Tabela `profiles`
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuários podem ver e editar seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários podem ver e editar seus próprios perfis"
ON public.profiles FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Tabela `empresas`
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Membros podem ver as empresas das quais participam" ON public.empresas;
CREATE POLICY "Membros podem ver as empresas das quais participam"
ON public.empresas FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.empresa_id = empresas.id
      AND eu.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Admins podem atualizar suas empresas" ON public.empresas;
CREATE POLICY "Admins podem atualizar suas empresas"
ON public.empresas FOR UPDATE
USING (public.is_admin_of_empresa(id))
WITH CHECK (public.is_admin_of_empresa(id));
DROP POLICY IF EXISTS "Admins podem deletar suas empresas" ON public.empresas;
CREATE POLICY "Admins podem deletar suas empresas"
ON public.empresas FOR DELETE
USING (public.is_admin_of_empresa(id));

-- Tabela `empresa_usuarios`
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios NO FORCE ROW LEVEL SECURITY; -- Essencial para evitar recursão
DROP POLICY IF EXISTS "Usuários podem ver suas próprias associações" ON public.empresa_usuarios;
CREATE POLICY "Usuários podem ver suas próprias associações"
ON public.empresa_usuarios FOR SELECT
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins podem inserir novos usuários na empresa" ON public.empresa_usuarios;
CREATE POLICY "Admins podem inserir novos usuários na empresa"
ON public.empresa_usuarios FOR INSERT
WITH CHECK (public.is_admin_of_empresa(empresa_id));
DROP POLICY IF EXISTS "Admins podem atualizar roles de usuários" ON public.empresa_usuarios;
CREATE POLICY "Admins podem atualizar roles de usuários"
ON public.empresa_usuarios FOR UPDATE
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));
DROP POLICY IF EXISTS "Usuários podem se remover de uma empresa ou admins podem remover outros" ON public.empresa_usuarios;
CREATE POLICY "Usuários podem se remover de uma empresa ou admins podem remover outros"
ON public.empresa_usuarios FOR DELETE
USING (
  (auth.uid() = user_id) OR (public.is_admin_of_empresa(empresa_id))
);

-- Notifica o PostgREST para recarregar o schema e reconhecer as novas RPCs
NOTIFY pgrst, 'reload schema';

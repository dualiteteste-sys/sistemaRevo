-- =================================================================
-- ================ DEFINITIVE INITIAL SCHEMA ======================
-- =================================================================
-- This script is idempotent and contains all security, structural,
-- and data integrity improvements discussed.
-- Apply this single script to set up the entire database.
-- =================================================================

-- 1. EXTENSIONS
-- =================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. SCHEMA HARDENING
-- =================================================================
-- Prevents accidental object creation in 'public' outside of migrations.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 3. HELPER FUNCTIONS
-- =================================================================
-- Function to automatically update 'updated_at' timestamps.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

-- 4. TABLES
-- =================================================================
-- Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    nome_completo text,
    cpf text
);
ALTER TABLE public.profiles OWNER TO postgres;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique_not_null ON public.profiles (cpf) WHERE cpf IS NOT NULL;
DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- Empresas (Tenants) Table
CREATE TABLE IF NOT EXISTS public.empresas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    razao_social text NOT NULL,
    fantasia text,
    cnpj text
);
ALTER TABLE public.empresas OWNER TO postgres;
DROP TRIGGER IF EXISTS empresas_touch_updated_at ON public.empresas;
CREATE TRIGGER empresas_touch_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();
CREATE UNIQUE INDEX IF NOT EXISTS empresas_cnpj_unique_not_null ON public.empresas (cnpj) WHERE cnpj IS NOT NULL;

-- Empresa_Usuarios (Membership) Table
CREATE TABLE IF NOT EXISTS public.empresa_usuarios (
    empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (empresa_id, user_id)
);
ALTER TABLE public.empresa_usuarios OWNER TO postgres;
CREATE INDEX IF NOT EXISTS empresa_usuarios_user_id_idx ON public.empresa_usuarios (user_id);
ALTER TABLE public.empresa_usuarios DROP CONSTRAINT IF EXISTS empresa_usuarios_role_chk;
ALTER TABLE public.empresa_usuarios ADD CONSTRAINT empresa_usuarios_role_chk CHECK (role IN ('admin', 'member'));

-- 5. SECURITY DEFINER FUNCTIONS & TRIGGERS
-- =================================================================
-- Function to check if a user is an admin of a specific company.
CREATE OR REPLACE FUNCTION public.is_admin_of_empresa(p_empresa_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresa_usuarios eu
    WHERE eu.empresa_id = p_empresa_id AND eu.user_id = auth.uid() AND eu.role = 'admin'
  );
$$;
ALTER FUNCTION public.is_admin_of_empresa(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_admin_of_empresa(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_of_empresa(uuid) TO authenticated;

-- Trigger function to create a profile when a new user signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
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
        cpf           = COALESCE(EXCLUDED.cpf, profiles.cpf),
        updated_at    = NOW();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. RPC FUNCTIONS (exposed to the client)
-- =================================================================
-- RPC to create the first company and link the owner as admin.
CREATE OR REPLACE FUNCTION public.create_empresa_and_link_owner(p_razao_social text, p_fantasia text, p_cnpj text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
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
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text, text, text) TO authenticated;

-- RPC for admins to list members of their company securely.
CREATE OR REPLACE FUNCTION public.list_members_of_company(p_empresa uuid)
RETURNS TABLE (user_id uuid, role text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
  SELECT eu.user_id, eu.role, eu.created_at
  FROM public.empresa_usuarios eu
  WHERE eu.empresa_id = p_empresa AND public.is_admin_of_empresa(p_empresa); -- Security gate
$$;
ALTER FUNCTION public.list_members_of_company(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.list_members_of_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_members_of_company(uuid) TO authenticated;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =================================================================
-- Enable RLS on all relevant tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
-- NO FORCE is crucial for 'empresa_usuarios' to avoid recursion with SECURITY DEFINER functions.
ALTER TABLE public.empresa_usuarios NO FORCE ROW LEVEL SECURITY;

-- Policies for 'profiles'
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Policies for 'empresas'
DROP POLICY IF EXISTS "Membros podem ver as empresas das quais participam" ON public.empresas;
CREATE POLICY "Membros podem ver as empresas das quais participam" ON public.empresas FOR SELECT USING (EXISTS (SELECT 1 FROM public.empresa_usuarios eu WHERE eu.empresa_id = empresas.id AND eu.user_id = auth.uid()));
DROP POLICY IF EXISTS "Admins podem atualizar suas empresas" ON public.empresas;
CREATE POLICY "Admins podem atualizar suas empresas" ON public.empresas FOR UPDATE USING (public.is_admin_of_empresa(id)) WITH CHECK (public.is_admin_of_empresa(id));
DROP POLICY IF EXISTS "Admins podem deletar suas empresas" ON public.empresas;
CREATE POLICY "Admins podem deletar suas empresas" ON public.empresas FOR DELETE USING (public.is_admin_of_empresa(id));

-- Policies for 'empresa_usuarios'
DROP POLICY IF EXISTS "Usuários podem ver suas próprias associações" ON public.empresa_usuarios;
CREATE POLICY "Usuários podem ver suas próprias associações" ON public.empresa_usuarios FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins podem adicionar usuários à sua empresa" ON public.empresa_usuarios;
CREATE POLICY "Admins podem adicionar usuários à sua empresa" ON public.empresa_usuarios FOR INSERT WITH CHECK (public.is_admin_of_empresa(empresa_id));
DROP POLICY IF EXISTS "Admins podem atualizar roles de usuários" ON public.empresa_usuarios;
CREATE POLICY "Admins podem atualizar roles de usuários" ON public.empresa_usuarios FOR UPDATE USING (public.is_admin_of_empresa(empresa_id)) WITH CHECK (public.is_admin_of_empresa(empresa_id));
DROP POLICY IF EXISTS "Usuários e admins podem se remover de uma empresa" ON public.empresa_usuarios;
CREATE POLICY "Usuários e admins podem se remover de uma empresa" ON public.empresa_usuarios FOR DELETE USING ((auth.uid() = user_id) OR (public.is_admin_of_empresa(empresa_id)));

-- 8. GRANTS
-- =================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 9. RELOAD POSTGREST SCHEMA
-- =================================================================
NOTIFY pgrst, 'reload schema';

-- 1. Schema Enhancements: Add timestamp columns and update trigger function.
/*
# [Schema Enhancement] Add Timestamps and Update Trigger
Adds `created_at` and `updated_at` columns to the `profiles` table and creates a reusable function to automatically update the `updated_at` timestamp on any table it's triggered for.

## Query Description: This operation alters the `profiles` table to include tracking timestamps. It is non-destructive. It also creates a generic trigger function that can be used across the database.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by dropping the columns and function)

## Structure Details:
- Table: `public.profiles` (adds `created_at`, `updated_at`)
- Function: `public.touch_updated_at()`

## Security Implications:
- RLS Status: Not directly affected.
- Policy Changes: No.
- Auth Requirements: N/A.

## Performance Impact:
- Indexes: None.
- Triggers: The new function will be used in triggers, causing a minimal overhead on UPDATE operations.
- Estimated Impact: Low.
*/
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

-- Apply the update trigger to the `empresas` table.
DROP TRIGGER IF EXISTS empresas_touch_updated ON public.empresas;
CREATE TRIGGER empresas_touch_updated
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- 2. Harden `is_admin_of_empresa` Function
/*
# [Function Update] is_admin_of_empresa
Updates the function to use `LANGUAGE sql` for performance and hardens security with a strict search_path, postgres ownership, and explicit grants.

## Query Description: This operation replaces an existing database function. It is designed to be safer and more performant. There is no risk to existing data.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by reverting to the old function definition)

## Structure Details:
- Function: public.is_admin_of_empresa(uuid)

## Security Implications:
- RLS Status: This function is a key component of RLS policies.
- Policy Changes: No.
- Auth Requirements: `authenticated` role is granted EXECUTE permission.

## Performance Impact:
- Estimated Impact: Positive. `LANGUAGE sql` is generally faster for simple queries.
*/
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

-- 3. Harden `create_empresa_and_link_owner` RPC
/*
# [RPC Update] create_empresa_and_link_owner
Hardens the main provisioning RPC with `SECURITY DEFINER`, a safe `search_path`, `postgres` ownership, and explicit grants. This is the function the frontend will call.

## Query Description: This operation replaces the core business logic function for creating a new company and linking its first admin. It enhances security significantly.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true (by reverting to the old function definition)

## Structure Details:
- Function: public.create_empresa_and_link_owner(text, text, text)

## Security Implications:
- RLS Status: N/A.
- Policy Changes: No.
- Auth Requirements: `authenticated` role is granted EXECUTE permission. This function performs privileged operations.

## Performance Impact:
- Estimated Impact: Low.
*/
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

-- 4. Harden `handle_new_user` Trigger
/*
# [Trigger Update] handle_new_user
Makes the user profile creation trigger robust against missing metadata in the `auth.users` record by safely parsing the `NEW` object as JSON.

## Query Description: This operation replaces the trigger function that runs after a new user signs up. The new version is more resilient and prevents errors that could block user profile creation.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Medium"
- Requires-Backup: false
- Reversible: true (by reverting to the old function definition)

## Structure Details:
- Function: public.handle_new_user()
- Trigger: on_auth_user_created ON auth.users

## Security Implications:
- RLS Status: The function is `SECURITY DEFINER` to write to `public.profiles` even if RLS is enabled on it.
- Policy Changes: No.
- Auth Requirements: Runs automatically on user creation.

## Performance Impact:
- Estimated Impact: Low.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  meta  jsonb := COALESCE(to_jsonb(NEW) -> 'raw_user_meta_data',
                          to_jsonb(NEW) -> 'raw_app_meta_data',
                          '{}'::jsonb);
  v_nome text := COALESCE(meta->>'fullName', meta->>'full_name', meta->>'name');
  v_cpf  text := COALESCE(meta->>'cpf_cnpj', meta->>'cpf');
BEGIN
  INSERT INTO public.profiles (id, nome_completo, cpf, created_at, updated_at)
  VALUES (NEW.id, v_nome, v_cpf, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
    SET nome_completo = COALESCE(EXCLUDED.nome_completo, profiles.nome_completo),
        cpf          = COALESCE(EXCLUDED.cpf, profiles.cpf),
        updated_at   = NOW();

  RETURN NEW;
END;
$$;
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Recreate the trigger to ensure it uses the new function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Refine RLS Policies
/*
# [RLS Policy Update] Refine Policies for `empresa_usuarios` and `empresas`
Configures RLS for `empresa_usuarios` to be `NO FORCE` to prevent recursion, and adds `WITH CHECK` to the UPDATE policy. It also creates explicit, separate policies for `UPDATE` and `DELETE` on the `empresas` table for clarity.

## Query Description: This operation is critical for security. It correctly configures the RLS policies to be both secure and non-recursive, preventing common Supabase RLS pitfalls.

## Metadata:
- Schema-Category: "Dangerous"
- Impact-Level: "High"
- Requires-Backup: false
- Reversible: true (by dropping and recreating policies with old definitions)

## Structure Details:
- Table: `public.empresa_usuarios`, `public.empresas`

## Security Implications:
- RLS Status: Enabled and configured.
- Policy Changes: Yes. This is the core of the RLS setup.
- Auth Requirements: Policies rely on `auth.uid()` and the `is_admin_of_empresa` function.

## Performance Impact:
- Estimated Impact: Low. Policies are optimized.
*/
-- Policies for `empresa_usuarios`
ALTER TABLE public.empresa_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_usuarios NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios vínculos" ON public.empresa_usuarios;
CREATE POLICY "Usuários podem ver seus próprios vínculos"
ON public.empresa_usuarios FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins podem adicionar usuários à sua empresa" ON public.empresa_usuarios;
CREATE POLICY "Admins podem adicionar usuários à sua empresa"
ON public.empresa_usuarios FOR INSERT
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Admins podem atualizar roles de usuários" ON public.empresa_usuarios;
CREATE POLICY "Admins podem atualizar roles de usuários"
ON public.empresa_usuarios FOR UPDATE
USING (public.is_admin_of_empresa(empresa_id))
WITH CHECK (public.is_admin_of_empresa(empresa_id));

DROP POLICY IF EXISTS "Usuários podem se remover de uma empresa ou admins remover outros" ON public.empresa_usuarios;
CREATE POLICY "Usuários podem se remover de uma empresa ou admins remover outros"
ON public.empresa_usuarios FOR DELETE
USING (auth.uid() = user_id OR public.is_admin_of_empresa(empresa_id));

-- Policies for `empresas`
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros podem ver as empresas das quais participam" ON public.empresas;
CREATE POLICY "Membros podem ver as empresas das quais participam"
ON public.empresas FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM public.empresa_usuarios eu
  WHERE eu.empresa_id = empresas.id
    AND eu.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Admins podem atualizar suas empresas" ON public.empresas;
CREATE POLICY "Admins podem atualizar suas empresas"
ON public.empresas FOR UPDATE
USING (public.is_admin_of_empresa(id))
WITH CHECK (public.is_admin_of_empresa(id));

DROP POLICY IF EXISTS "Admins podem deletar suas empresas" ON public.empresas;
CREATE POLICY "Admins podem deletar suas empresas"
ON public.empresas FOR DELETE
USING (public.is_admin_of_empresa(id));

-- 6. Add Composite Index
/*
# [Performance] Add Composite Index
Creates a composite index on `empresa_usuarios` to speed up membership checks, which are common in RLS policies.

## Query Description: This is a performance optimization. It adds an index to make lookups on the `empresa_usuarios` table faster.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true (by dropping the index)
*/
CREATE INDEX IF NOT EXISTS empresa_usuarios_empresa_user_idx
  ON public.empresa_usuarios (empresa_id, user_id);

-- 7. Reload PostgREST Schema
/*
# [Configuration] Reload Schema
Notifies PostgREST to reload its schema cache, making new RPCs and views immediately available via the API.
*/
NOTIFY pgrst, 'reload schema';

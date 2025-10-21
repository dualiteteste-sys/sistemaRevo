-- 1. Function to get members of a company with their details
-- This function allows an admin to securely fetch a list of all members
-- of their company, including their email and role.

CREATE OR REPLACE FUNCTION public.get_empresa_members(p_empresa_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  role text,
  joined_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  -- Only admins of the company can list its members.
  -- This reuses the is_admin_of_empresa function as a security gate.
  SELECT
    u.id as user_id,
    u.email,
    eu.role,
    eu.created_at as joined_at
  FROM auth.users u
  JOIN public.empresa_usuarios eu ON u.id = eu.user_id
  WHERE eu.empresa_id = p_empresa_id
    AND public.is_admin_of_empresa(p_empresa_id);
$$;

-- 2. Permissions
-- Ensure the function is owned by the postgres role for security.
ALTER FUNCTION public.get_empresa_members(uuid) OWNER TO postgres;

-- Revoke any default permissions and grant explicit EXECUTE access
-- only to authenticated users.
REVOKE ALL ON FUNCTION public.get_empresa_members(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_empresa_members(uuid) TO authenticated;

-- 3. Reload PostgREST schema
-- This ensures the new RPC is immediately available to the client.
NOTIFY pgrst, 'reload schema';

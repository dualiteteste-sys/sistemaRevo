-- /*
--           # [Operation Name]
--           [This operation hardens the company creation RPC to make it fully idempotent and resilient.]

--           ## Query Description: [This script updates the `create_empresa_and_link_owner` function to handle duplicate CNPJ entries gracefully. Instead of erroring, it finds the existing company and links the user. It also updates the function's return type to provide the full company data back to the client, improving frontend efficiency.]
          
--           ## Metadata:
--           - Schema-Category: ["Structural"]
--           - Impact-Level: ["Low"]
--           - Requires-Backup: [false]
--           - Reversible: [true]
          
--           ## Structure Details:
--           [Modifies the function `public.create_empresa_and_link_owner`.]
          
--           ## Security Implications:
--           - RLS Status: [N/A]
--           - Policy Changes: [No]
--           - Auth Requirements: [The function continues to require an authenticated user.]
          
--           ## Performance Impact:
--           - Indexes: [None]
--           - Triggers: [None]
--           - Estimated Impact: [Negligible. Adds a SELECT query in an exception case which is not the common path.]
--           */
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
  -- 1. Validate session
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_signed_in' USING HINT = 'Faça login antes de criar a empresa.';
  END IF;

  -- 2. Validate CNPJ format
  IF v_cnpj_normalized IS NOT NULL AND length(v_cnpj_normalized) NOT IN (0, 14) THEN
      RAISE EXCEPTION 'invalid_cnpj_format' USING HINT = 'Envie 14 dígitos ou deixe nulo.';
  END IF;
  
  -- 3. Create or find company (idempotent on CNPJ)
  BEGIN
    INSERT INTO public.empresas (razao_social, fantasia, cnpj)
    VALUES (p_razao_social, p_fantasia, v_cnpj_normalized)
    RETURNING id INTO new_empresa_id;
  EXCEPTION WHEN unique_violation THEN
    -- If CNPJ already exists, find its ID.
    SELECT e.id INTO new_empresa_id
    FROM public.empresas e
    WHERE e.cnpj = v_cnpj_normalized;
  END;

  -- 4. Link user to the company (idempotent on user-company link)
  BEGIN
    INSERT INTO public.empresa_usuarios (empresa_id, user_id, role)
    VALUES (new_empresa_id, v_user_id, 'admin');
  EXCEPTION WHEN unique_violation THEN
    -- If link already exists, do nothing.
  END;

  -- 5. Return the full company data
  RETURN QUERY
    SELECT e.id, e.razao_social, e.fantasia, e.cnpj
    FROM public.empresas e
    WHERE e.id = new_empresa_id;
END;
$$;

-- Re-apply grants and ownership
ALTER FUNCTION public.create_empresa_and_link_owner(text, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_empresa_and_link_owner(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_empresa_and_link_owner(text, text, text) TO authenticated;

-- [HARDEN public.plans]

-- 1. Garante que RLS está habilitado
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- 2. Garante que a política de leitura pública exista e esteja correta
DROP POLICY IF EXISTS "Permitir leitura pública dos planos" ON public.plans;
CREATE POLICY "Permitir leitura pública dos planos"
ON public.plans
FOR SELECT
USING (true);

-- 3. Defesa em profundidade: revoga permissões de escrita para roles de API
REVOKE INSERT, UPDATE, DELETE ON public.plans FROM anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;

-- 4. Recarrega o schema da API para aplicar as mudanças de permissão imediatamente
NOTIFY pgrst, 'reload schema';

-- [HARDEN public.plans]

-- 1) Deixe ANON/AUTHENTICATED somente com SELECT
REVOKE ALL ON public.plans FROM anon, authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;

-- 2) (opcional, mas recomendado) garanta que o serviço possa manter o catálogo
GRANT INSERT, UPDATE, DELETE ON public.plans TO service_role;

-- 3) Confirme que a RLS segue ativa e a policy de leitura pública existe
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública dos planos" ON public.plans;
CREATE POLICY "Permitir leitura pública dos planos"
ON public.plans
FOR SELECT
USING (true);

-- 4) Recarregue o schema
NOTIFY pgrst, 'reload schema';

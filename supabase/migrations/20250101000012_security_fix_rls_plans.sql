-- Habilita a Segurança a Nível de Linha (RLS) na tabela de planos.
-- Isso é crucial para garantir que nenhuma tabela pública fique desprotegida.
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Remove a política antiga, se existir, para garantir que o script possa ser executado várias vezes.
DROP POLICY IF EXISTS "Permitir leitura pública dos planos" ON public.plans;

-- Cria uma nova política que permite que qualquer pessoa (anônima ou autenticada)
-- leia os dados da tabela de planos. Isso é seguro, pois contém informações
-- de preços que são públicas.
CREATE POLICY "Permitir leitura pública dos planos"
ON public.plans
FOR SELECT
USING (true);

-- Informa ao PostgREST para recarregar o schema e aplicar as novas políticas imediatamente.
NOTIFY pgrst, 'reload schema';

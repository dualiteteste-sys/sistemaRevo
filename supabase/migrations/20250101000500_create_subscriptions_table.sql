-- 1. Garante que a função helper para timestamps exista
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC;

-- 2. Garante idempotência ao remover a tabela se ela existir
DROP TABLE IF EXISTS public.subscriptions;

-- 3. Cria a tabela de assinaturas com todas as constraints
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  current_period_end timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Define o proprietário e adiciona documentação
ALTER TABLE public.subscriptions OWNER TO postgres;
COMMENT ON TABLE public.subscriptions IS 'Armazena o status da assinatura de cada empresa.';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'Fim do período de faturamento atual (pode ser NULL enquanto integra billing).';

-- 5. Adiciona índice para otimizar buscas por empresa_id
CREATE INDEX IF NOT EXISTS subscriptions_empresa_id_idx ON public.subscriptions(empresa_id);

-- 6. Habilita Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 7. Garante idempotência removendo policies antigas
DROP POLICY IF EXISTS "Membros podem ver a assinatura da sua empresa" ON public.subscriptions;
DROP POLICY IF EXISTS "Bloquear modificações de assinatura no cliente" ON public.subscriptions;

-- 8. Cria as RLS policies
-- Policy para SELECT: Membros podem ver a assinatura da sua própria empresa.
CREATE POLICY "Membros podem ver a assinatura da sua empresa"
ON public.subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.empresa_usuarios eu
    WHERE eu.empresa_id = subscriptions.empresa_id
      AND eu.user_id = auth.uid()
  )
);

-- Policy para Bloqueio: Impede qualquer modificação (INSERT, UPDATE, DELETE) pelo cliente.
CREATE POLICY "Bloquear modificações de assinatura no cliente"
ON public.subscriptions
FOR ALL
USING (false)
WITH CHECK (false); -- Garante o bloqueio explícito também para INSERTs

-- 9. Restaura os privilégios da tabela
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 10. Garante idempotência do trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.subscriptions;

-- 11. Cria o trigger de updated_at com a sintaxe correta
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- 12. Recarrega o schema do PostgREST para aplicar as mudanças imediatamente
NOTIFY pgrst, 'reload schema';

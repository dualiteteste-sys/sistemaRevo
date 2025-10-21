-- 1. Assegurar que a função de gatilho exista
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

-- 2. Derrubar a tabela existente para garantir um estado limpo (necessário para alterar colunas/constraints)
DROP TABLE IF EXISTS public.subscriptions;

-- 3. Criar a tabela com todas as constraints e melhorias
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
    status text NOT NULL CONSTRAINT subscriptions_status_chk CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
    current_period_end timestamptz NULL, -- Permitir nulo para flexibilidade inicial
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Definir o proprietário e documentar a tabela
ALTER TABLE public.subscriptions OWNER TO postgres;
COMMENT ON TABLE public.subscriptions IS 'Armazena o status da assinatura de cada empresa.';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'Fim do período atual (pode ser NULL enquanto integra billing).';

-- 5. Criar índice para otimizar buscas por empresa_id
CREATE INDEX IF NOT EXISTS subscriptions_empresa_id_idx ON public.subscriptions(empresa_id);

-- 6. Garantir idempotência das RLS policies
DROP POLICY IF EXISTS "Membros podem ver a assinatura da sua empresa" ON public.subscriptions;
DROP POLICY IF EXISTS "Bloquear modificações de assinatura no cliente" ON public.subscriptions;

-- 7. Criar as políticas de segurança de linha (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Bloquear modificações de assinatura no cliente"
ON public.subscriptions
FOR ALL
USING (false); -- Ninguém pode alterar/inserir/deletar via API pública

-- 8. Garantir idempotência do gatilho
DROP TRIGGER IF EXISTS handle_updated_at ON public.subscriptions;

-- 9. Criar o gatilho para atualizar 'updated_at'
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();

-- 10. Restaurar os privilégios da tabela
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role; -- Para webhooks e processos de backend

-- 11. Recarregar o schema do PostgREST para aplicar as mudanças de permissão
NOTIFY pgrst, 'reload schema';

-- 1. Habilitar extensão pgcrypto se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 2. Criar a tabela de assinaturas (subscriptions)
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
    status text NOT NULL,
    current_period_end timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'Armazena o status da assinatura de cada empresa (tenant).';
COMMENT ON COLUMN public.subscriptions.status IS 'Status da assinatura (ex: trialing, active, past_due, canceled).';
COMMENT ON COLUMN public.subscriptions.current_period_end IS 'Data de término do período de faturamento atual.';

-- 3. Criar índice para otimizar buscas por empresa_id
CREATE INDEX IF NOT EXISTS subscriptions_empresa_id_idx ON public.subscriptions(empresa_id);

-- 4. Adicionar gatilho para atualizar 'updated_at'
CREATE TRIGGER subscriptions_touch_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.touch_updated_at();

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de RLS
-- Política de SELECT: Membros podem ver a assinatura da empresa da qual fazem parte.
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

-- Política de INSERT/UPDATE/DELETE: Bloqueia operações diretas para usuários autenticados.
-- Apenas a service_role (usada por webhooks/backend) pode modificar assinaturas.
CREATE POLICY "Ninguém pode alterar assinaturas diretamente"
ON public.subscriptions
FOR ALL
USING (false)
WITH CHECK (false);

-- 7. Conceder permissões básicas na tabela
GRANT SELECT ON public.subscriptions TO authenticated;
-- INSERT, UPDATE, DELETE são intencionalmente omitidos para a role 'authenticated'.

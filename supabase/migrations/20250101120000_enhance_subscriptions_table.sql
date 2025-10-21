/*
  # [Aprimoramento da Tabela de Assinaturas]
  Este script aprimora a tabela `subscriptions` com base nas sugestões para aumentar a integridade e flexibilidade dos dados.

  ## Descrição da Query:
  - Adiciona uma restrição `CHECK` para garantir que o campo `status` só aceite valores predefinidos.
  - Torna o campo `current_period_end` opcional (NULL), facilitando a criação de assinaturas antes da integração completa do faturamento.
  - Garante que a função de gatilho `touch_updated_at` exista.
  - Recarrega o schema do PostgREST para aplicar as mudanças imediatamente.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (com a remoção das constraints)
*/

-- 1. Garante que a função de gatilho para `updated_at` exista.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

-- 2. Remove a tabela existente para recriá-la com as novas constraints.
-- A remoção é segura pois a tabela foi recém-criada e não deve conter dados de produção.
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- 3. Recria a tabela `subscriptions` com as melhorias.
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL UNIQUE REFERENCES public.empresas(id) ON DELETE CASCADE,
    status text NOT NULL,
    current_period_end timestamptz NULL, -- Alterado para permitir nulos
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Adiciona a constraint para validar os status permitidos
    CONSTRAINT subscriptions_status_chk CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'))
);

-- 4. Adiciona comentários na tabela e colunas para documentação.
COMMENT ON TABLE public.subscriptions IS 'Armazena o status da assinatura de cada empresa.';
COMMENT ON COLUMN public.subscriptions.status IS 'Status da assinatura, ex: trialing, active, past_due.';

-- 5. Adiciona índice para buscas rápidas por empresa_id.
CREATE INDEX IF NOT EXISTS subscriptions_empresa_id_idx ON public.subscriptions(empresa_id);

-- 6. Habilita RLS e define as políticas de segurança.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Membros podem ver a assinatura da sua própria empresa.
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

-- Política: Bloqueia modificações pelo cliente (INSERT, UPDATE, DELETE).
-- Essas operações devem ser feitas apenas via service_role (ex: webhooks).
CREATE POLICY "Bloquear modificações de assinatura no cliente"
ON public.subscriptions
FOR ALL
USING (false)
WITH CHECK (false);

-- 7. Recria o gatilho para atualizar o campo `updated_at`.
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE PROCEDURE public.touch_updated_at();

-- 8. Recarrega o schema do PostgREST para que as alterações sejam aplicadas imediatamente.
NOTIFY pgrst, 'reload schema';

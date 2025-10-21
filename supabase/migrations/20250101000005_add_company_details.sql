-- Adiciona colunas de endereço, contato e logo na tabela de empresas.
-- Estas colunas permitirão que os usuários salvem informações detalhadas
-- sobre suas empresas na tela de configurações.

ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS estado CHAR(2),
ADD COLUMN IF NOT EXISTS cep VARCHAR(9),
ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_contato TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Garante que a função para atualizar o timestamp 'updated_at' exista.
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

-- Garante que o gatilho 'updated_at' esteja ativo na tabela de empresas.
-- Isso é importante para rastrear quando as configurações da empresa foram modificadas pela última vez.
DROP TRIGGER IF EXISTS empresas_touch_updated_at ON public.empresas;
CREATE TRIGGER empresas_touch_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE PROCEDURE public.touch_updated_at();

-- Notifica o PostgREST para recarregar seu schema e reconhecer as novas colunas imediatamente.
NOTIFY pgrst, 'reload schema';

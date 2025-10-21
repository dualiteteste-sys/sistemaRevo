/*
# [Operation Name]
Adicionar detalhes da empresa

## Query Description: 
Este script adiciona novas colunas à tabela `public.empresas` para armazenar informações detalhadas do perfil da empresa, como endereço, contato e URL do logo. Nenhuma das colunas é obrigatória, então não há risco de quebra para os dados existentes. A operação é segura e reversível.

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["Low"]
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Tabela afetada: `public.empresas`
- Colunas adicionadas:
  - `logo_url` (text)
  - `inscricao_estadual` (text)
  - `endereco` (text)
  - `cidade` (text)
  - `estado` (text)
  - `cep` (text)
  - `telefone` (text)
  - `email` (text)
  - `website` (text)

## Security Implications:
- RLS Status: [Não alterado]
- Policy Changes: [No]
- Auth Requirements: [Nenhum]

## Performance Impact:
- Indexes: [Nenhum]
- Triggers: [Nenhum]
- Estimated Impact: [Nulo. As colunas são adicionadas ao final da tabela e são nulas por padrão.]
*/

-- Adiciona novas colunas à tabela de empresas para armazenar detalhes adicionais.
ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS logo_url TEXT NULL,
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT NULL,
ADD COLUMN IF NOT EXISTS endereco TEXT NULL,
ADD COLUMN IF NOT EXISTS cidade TEXT NULL,
ADD COLUMN IF NOT EXISTS estado TEXT NULL,
ADD COLUMN IF NOT EXISTS cep TEXT NULL,
ADD COLUMN IF NOT EXISTS telefone TEXT NULL,
ADD COLUMN IF NOT EXISTS email TEXT NULL,
ADD COLUMN IF NOT EXISTS website TEXT NULL;

-- Recarrega o schema do PostgREST para reconhecer as novas colunas.
NOTIFY pgrst, 'reload schema';

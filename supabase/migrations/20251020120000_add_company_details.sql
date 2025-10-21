/*
          # [Operation Name]
          Adicionar detalhes da empresa

          ## Query Description: [Este script adiciona novas colunas à tabela `empresas` para armazenar informações detalhadas de contato e endereço. Essas colunas são nulas por padrão e não afetam os dados existentes. A operação é segura e reversível.]
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: true
          
          ## Structure Details:
          - Tabela afetada: public.empresas
          - Colunas adicionadas: logotipo_url, telefone, email, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_uf, endereco_cep
          
          ## Security Implications:
          - RLS Status: Habilitado
          - Policy Changes: Não
          - Auth Requirements: N/A
          
          ## Performance Impact:
          - Indexes: Nenhum
          - Triggers: Nenhum
          - Estimated Impact: Baixo. A adição de colunas nulas é uma operação rápida.
          */

ALTER TABLE public.empresas
ADD COLUMN IF NOT EXISTS logotipo_url TEXT,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS endereco_logradouro TEXT,
ADD COLUMN IF NOT EXISTS endereco_numero TEXT,
ADD COLUMN IF NOT EXISTS endereco_complemento TEXT,
ADD COLUMN IF NOT EXISTS endereco_bairro TEXT,
ADD COLUMN IF NOT EXISTS endereco_cidade TEXT,
ADD COLUMN IF NOT EXISTS endereco_uf TEXT,
ADD COLUMN IF NOT EXISTS endereco_cep TEXT;

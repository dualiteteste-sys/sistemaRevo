/*
# [Operation Name] Adicionar Validação de Role
[Description of what this operation does]
Adiciona uma restrição CHECK à coluna `role` na tabela `empresa_usuarios` para garantir que apenas os valores 'admin' ou 'member' sejam aceitos.

## Query Description:
Esta operação adiciona uma regra de validação de dados. Se houver alguma linha na tabela `empresa_usuarios` com um `role` diferente de 'admin' ou 'member', a execução deste script falhará. Isso garante a integridade dos dados daqui para frente, prevenindo a inserção de papéis inválidos.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: true

## Structure Details:
- Tabela afetada: `public.empresa_usuarios`
- Coluna afetada: `role`
- Restrição adicionada: `empresa_usuarios_role_chk`

## Security Implications:
- RLS Status: Not Changed
- Policy Changes: No
- Auth Requirements: None

## Performance Impact:
- Indexes: None
- Triggers: None
- Estimated Impact: Mínimo. A verificação ocorre apenas em operações de INSERT e UPDATE na tabela `empresa_usuarios`.
*/

-- Adiciona a restrição CHECK para validar os valores da coluna 'role'
ALTER TABLE public.empresa_usuarios
  ADD CONSTRAINT empresa_usuarios_role_chk
  CHECK (role IN ('admin','member'));

-- Recarrega o schema do PostgREST para garantir que todas as alterações sejam aplicadas.
NOTIFY pgrst, 'reload schema';

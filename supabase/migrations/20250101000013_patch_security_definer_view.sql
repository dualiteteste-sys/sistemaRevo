-- [PATCH DE SEGURANÇA]
-- Corrige a falha de segurança "Security Definer View" detectada na view `empresa_features`.
-- Esta correção garante que a view sempre execute com as permissões do usuário que a consulta,
-- respeitando as políticas de Row Level Security (RLS).

-- Garante que a view use as permissões do invocador (o usuário logado)
ALTER VIEW public.empresa_features SET (security_invoker = true);

-- Recarrega o schema da API para garantir que a alteração seja aplicada imediatamente
NOTIFY pgrst, 'reload schema';

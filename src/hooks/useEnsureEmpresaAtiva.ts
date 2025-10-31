import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

/**
 * Garante empresa ativa para o usuário autenticado.
 * - Idempotente: se já existir preferida, retorna 'already_active'.
 * - Se não houver, cria e seta ativa (usando dados opc. do onboarding).
 * - Persiste empresa_id no localStorage apenas para UX.
 */
export function useEnsureEmpresaAtiva(
  nomeEmpresa?: string,
  fantasiaEmpresa?: string
) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) {
        console.warn('[AUTH] Sem sessão. Abortando ensureEmpresaAtiva.');
        return;
      }

      const { data, error } = await supabase.rpc('bootstrap_empresa_for_current_user', {
        p_nome: nomeEmpresa || null,
        p_fantasia: fantasiaEmpresa || null,
      });

      if (error) {
        console.error('[RPC][bootstrap_empresa_for_current_user][ERROR]', error);
        return;
      }

      const empresaId = data?.[0]?.empresa_id as string | undefined;
      if (empresaId) {
        localStorage.setItem('empresa_id', empresaId);
        console.log('[RPC][bootstrap_empresa_for_current_user][OK]', empresaId, data?.[0]?.status);
      } else {
        console.warn('[RPC] bootstrap retornou sem empresa_id.');
      }
    })();
  }, [nomeEmpresa, fantasiaEmpresa]);
}

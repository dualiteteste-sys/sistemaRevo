import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useEnsureEmpresaAtiva } from '@/hooks/useEnsureEmpresaAtiva';
import { Loader2 } from 'lucide-react';

function parseHashParams(hash: string): Record<string, string> {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const qs = new URLSearchParams(h);
  const obj: Record<string, string> = {};
  qs.forEach((v, k) => (obj[k] = v));
  return obj;
}

export default function AuthConfirmed() {
  const nav = useNavigate();

  // Se você tiver guardado dados do onboarding:
  const nomeEmpresa = localStorage.getItem('onboarding_nome_empresa') || undefined;
  const fantasiaEmpresa = localStorage.getItem('onboarding_fantasia_empresa') || undefined;

  // Garante empresa ativa (cria/vincula/ativa se necessário, idempotente)
  useEnsureEmpresaAtiva(nomeEmpresa, fantasiaEmpresa);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL(window.location.href);

        // 1) Criar sessão (PKCE ?code=... ou hash #access_token=...)
        if (url.searchParams.get('code')) {
          const code = url.searchParams.get('code')!;
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          console.log('[AUTH] exchangeCodeForSession OK', data.session?.user?.id);
        } else if (url.hash.includes('access_token')) {
          const { access_token, refresh_token } = parseHashParams(url.hash);
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          console.log('[AUTH] setSession OK', data.session?.user?.id);
        }

        // 2) Sanidade de sessão
        const { data: s } = await supabase.auth.getSession();
        if (!s.session) {
          console.error('[AUTH] Session MISSING');
          alert('Sessão não criada. Verifique Redirect URLs/Preview.');
          return nav('/');
        }

        // 3) Próxima rota do app
        nav('/app');
      } catch (err: any) {
        console.error('[AUTH] /auth/confirmed ERROR', err);
        alert(`Erro ao confirmar login: ${err?.message || err}`);
        nav('/');
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="bg-glass-200 backdrop-blur-xl border border-white/30 rounded-3xl shadow-glass-lg p-8 text-center flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h1 className="text-xl font-bold text-gray-800 mb-2">Confirmando autenticação...</h1>
        </div>
    </div>
  );
}

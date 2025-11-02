import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

function parseHashParams(hash: string): Record<string, string> {
  const h = hash.startsWith('#') ? hash.slice(1) : hash;
  const qs = new URLSearchParams(h);
  const obj: Record<string, string> = {};
  qs.forEach((v, k) => (obj[k] = v));
  return obj;
}

export default function AuthConfirmed() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const params = parseHashParams(window.location.hash);
        const access_token = params['access_token'];
        const refresh_token = params['refresh_token'];

        if (access_token && refresh_token) {
          console.log('[AUTH] setSession from fragment');
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            console.error('[AUTH][setSession][ERR]', error);
          }
        } else {
          console.log('[AUTH] fragment missing tokens, skipping setSession');
        }
      } finally {
        // Limpa o fragmento da URL e segue para o app
        history.replaceState({}, document.title, '/auth/confirmed');
        navigate('/app', { replace: true });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg p-8 text-center">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <h1 className="text-xl font-bold mb-2">Confirmando autenticação...</h1>
        <p className="text-sm opacity-70">Aguarde um instante.</p>
      </div>
    </div>
  );
}

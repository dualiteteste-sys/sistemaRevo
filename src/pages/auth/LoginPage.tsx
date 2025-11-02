import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/app';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('[AUTH] signInWithPassword', { email });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-white/70 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg p-6">
        <h1 className="text-xl font-bold text-center mb-6">Bem-vindo de volta!</h1>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <label className="block mb-2 text-sm">Email</label>
        <input
          type="email"
          className="w-full mb-4 rounded-lg border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          required
        />

        <label className="block mb-2 text-sm">Senha</label>
        <input
          type="password"
          className="w-full mb-6 rounded-lg border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        <button
          type="submit"
          className="w-full rounded-lg px-4 py-2 font-semibold bg-blue-600 text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-sm mt-6">
          Não tem uma conta?{' '}
          <Link to="/auth/signup" className="font-medium text-blue-600 hover:underline">
            Crie sua conta
          </Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;

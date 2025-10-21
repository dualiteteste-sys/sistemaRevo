import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/app';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate(from, { replace: true });
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Bem-vindo de volta!</h2>
      <p className="text-center text-gray-600 mb-6">Faça login para acessar o REVO ERP.</p>
      
      {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-6">
        Não tem uma conta?{' '}
        <Link to="/auth/signup" className="font-medium text-blue-600 hover:underline">
          Crie sua conta
        </Link>
      </p>
    </motion.div>
  );
};

export default LoginPage;

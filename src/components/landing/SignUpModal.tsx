import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OnboardingIntent } from '@/types/onboarding';
import { signUpWithEmail } from '@/lib/auth';

interface SignUpModalProps {
  onClose: () => void;
  onLoginClick: () => void;
  intent: OnboardingIntent | null;
}

const SignUpModal: React.FC<SignUpModalProps> = ({ onClose, onLoginClick, intent }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signUpWithEmail(email, password);

      onClose();
      navigate('/auth/pending-verification');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X size={24} />
        </button>
        <div className="p-8">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Crie sua conta</h2>
          <p className="text-center text-gray-600 mb-6">E comece seu teste grátis de 30 dias.</p>
          
          {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="email-modal">Email</label>
              <input
                id="email-modal"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full mt-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="password-modal">Senha</label>
              <input
                id="password-modal"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full mt-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Conta e Iniciar Teste'}
            </button>
          </form>
          
          <p className="text-center text-sm text-gray-600 mt-6">
            Já possui uma conta?{' '}
            <button onClick={onLoginClick} className="font-medium text-blue-600 hover:underline focus:outline-none">
              Faça login
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SignUpModal;

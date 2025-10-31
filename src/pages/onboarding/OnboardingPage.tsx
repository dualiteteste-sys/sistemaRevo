import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthProvider';
import { motion } from 'framer-motion';
import { useToast } from '../../contexts/ToastProvider';
import { Loader2, Search } from 'lucide-react';
import { provisionEmpresa } from '../../features/onboarding/api';
import { useNavigate } from 'react-router-dom';
import { startCheckout } from '../../lib/billing';
import { OnboardingIntent } from '@/types/onboarding';
import axios from 'axios';

const OnboardingPage = () => {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [fantasia, setFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const { user, signOut, refreshEmpresas, setActiveEmpresa } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const razaoSocialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    razaoSocialInputRef.current?.focus();
  }, []);
  
  const handleFetchCnpjData = async () => {
    const cleanedCnpj = cnpj.replace(/\D/g, '');
    if (cleanedCnpj.length !== 14) {
      addToast('Por favor, insira um CNPJ válido com 14 dígitos.', 'error');
      return;
    }

    setIsFetchingCnpj(true);
    try {
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanedCnpj}`);
      setRazaoSocial(data.razao_social || '');
      setFantasia(data.nome_fantasia || '');
      addToast('Dados da empresa preenchidos com sucesso!', 'success');
    } catch (apiError: any) {
      addToast('CNPJ não encontrado. Verifique o número e tente novamente.', 'error');
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (razaoSocial.trim().length < 3) {
      addToast('A Razão Social é obrigatória (mínimo 3 caracteres).', 'error');
      return;
    }

    setLoading(true);

    try {
      const newCompany = await provisionEmpresa({
        razao_social: razaoSocial,
        fantasia: fantasia || razaoSocial,
        email: user?.email
      });

      await refreshEmpresas();
      setActiveEmpresa(newCompany);
      addToast('Empresa criada com sucesso!', 'success');

      const intent = user?.user_metadata?.onboardingIntent as OnboardingIntent | undefined;

      if (intent?.type === 'subscribe') {
        addToast('Redirecionando para o pagamento...', 'info');
        await startCheckout(newCompany.id, intent.planSlug, intent.billingCycle, false);
      } else { // 'trial' ou sem intenção
        addToast('Acessando seu novo ambiente...', 'success');
        navigate('/app/dashboard', { replace: true });
      }

    } catch (error: any) {
      addToast(error.message || 'Erro ao criar empresa.', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
       <div className="absolute top-4 right-4">
        <button
          onClick={signOut}
          className="bg-white/50 px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-white/80 transition-colors"
        >
          Sair
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="bg-glass-200 backdrop-blur-xl border border-white/30 rounded-3xl shadow-glass-lg p-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Quase lá!</h1>
          <p className="text-center text-gray-600 mb-8">Vamos configurar os dados da sua empresa.</p>

          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="cnpj">CNPJ</label>
              <div className="relative mt-1">
                <input
                  id="cnpj" type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)}
                  className="w-full p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition pr-12"
                  placeholder="Digite o CNPJ para buscar"
                />
                <button
                  type="button" onClick={handleFetchCnpjData} disabled={isFetchingCnpj || !cnpj}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  {isFetchingCnpj ? <Loader2 className="animate-spin" /> : <Search />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="razaoSocial">Razão Social</label>
              <input
                ref={razaoSocialInputRef} id="razaoSocial" type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} required
                className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Minha Empresa LTDA"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="fantasia">Nome Fantasia</label>
              <input
                id="fantasia" type="text" value={fantasia} onChange={(e) => setFantasia(e.target.value)}
                className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Nome Popular da Empresa"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center mt-4"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Empresa e Acessar'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default OnboardingPage;

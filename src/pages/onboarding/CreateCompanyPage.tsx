import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthProvider';
import { motion } from 'framer-motion';
import { useToast } from '../../contexts/ToastProvider';
import { Loader2 } from 'lucide-react';

const CreateCompanyPage = () => {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [fantasia, setFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const { signOut, refreshEmpresas, user, setActiveEmpresa } = useAuth();
  const { addToast } = useToast();
  const razaoSocialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    razaoSocialInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      if (user) {
        try {
          const { data, error } = await supabase.rpc('whoami');
          console.log('--- Diagnóstico de Sessão (Onboarding) ---');
          console.log('ID do usuário no AuthProvider:', user.id);
          console.log('Resultado do RPC whoami:', data);
          if (error) {
            console.error('Erro no RPC whoami:', error);
          }
          console.log('------------------------------------------');
        } catch (e) {
          console.error("Falha ao executar diagnóstico 'whoami'", e)
        }
      }
    };
    checkSession();
  }, [user]);

  const validateForm = () => {
    if (razaoSocial.trim().length < 3) {
      addToast('A Razão Social é obrigatória (mínimo 3 caracteres).', 'error');
      return false;
    }
    const normalizedCnpj = cnpj.replace(/\D/g, '');
    if (cnpj && normalizedCnpj.length !== 14) {
      addToast('O CNPJ, se informado, deve conter 14 dígitos.', 'error');
      return false;
    }
    return true;
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc('create_empresa_and_link_owner', {
        p_razao_social: razaoSocial,
        p_fantasia: fantasia,
        p_cnpj: cnpj,
      });

      if (rpcError) {
        throw rpcError;
      }
      
      const empresaCriada = Array.isArray(data) ? data[0] : null;

      if (empresaCriada && empresaCriada.empresa_id) {
        addToast('Empresa criada com sucesso! Acessando...', 'success');
        await refreshEmpresas();
        
        // A lógica do AuthProvider irá pegar a nova empresa e redirecionar o App.tsx
        // Para garantir, podemos tentar setar aqui, mas o refresh já deve ser suficiente.
        const { data: newEmpresaList } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaCriada.empresa_id);
        
        if (newEmpresaList && newEmpresaList.length > 0) {
            setActiveEmpresa(newEmpresaList[0]);
        }

      } else {
        throw new Error('Ocorreu um erro inesperado. A resposta do servidor estava vazia.');
      }
    } catch (error: any) {
      if (error.message.includes('not_signed_in')) {
        addToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
      } else if (error.message.includes('invalid_cnpj_format')) {
        addToast('O formato do CNPJ é inválido. Verifique os 14 dígitos.', 'error');
      } else {
        addToast(error.message || 'Erro ao criar empresa.', 'error');
      }
    } finally {
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
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Crie sua primeira empresa</h1>
          <p className="text-center text-gray-600 mb-8">Vamos começar configurando os dados da sua empresa.</p>

          <form onSubmit={handleCreateCompany} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="razaoSocial">Razão Social</label>
              <input
                ref={razaoSocialInputRef}
                id="razaoSocial"
                type="text"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                required
                className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Minha Empresa LTDA"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="fantasia">Nome Fantasia (Opcional)</label>
              <input
                id="fantasia"
                type="text"
                value={fantasia}
                onChange={(e) => setFantasia(e.target.value)}
                className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Nome Popular da Empresa"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700" htmlFor="cnpj">CNPJ (Opcional)</label>
              <input
                id="cnpj"
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full mt-1 p-3 bg-white/50 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="00.000.000/0001-00"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Criar Empresa e Acessar'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateCompanyPage;

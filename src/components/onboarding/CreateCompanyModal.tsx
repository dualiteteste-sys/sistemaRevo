import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthProvider';
import { useToast } from '../../contexts/ToastProvider';

interface CreateCompanyModalProps {
  onClose: () => void;
  onCompanyCreated: () => void;
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({ onClose, onCompanyCreated }) => {
  const [razaoSocial, setRazaoSocial] = useState('');
  const [fantasia, setFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const { refreshEmpresas, setActiveEmpresa } = useAuth();
  const { addToast } = useToast();
  const razaoSocialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    razaoSocialInputRef.current?.focus();
    
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const validateForm = () => {
    if (razaoSocial.trim().length < 3) {
      setClientError('A Razão Social é obrigatória e deve ter no mínimo 3 caracteres.');
      return false;
    }
    const normalizedCnpj = cnpj.replace(/\D/g, '');
    if (cnpj && normalizedCnpj.length !== 14) {
      setClientError('O CNPJ, se informado, deve conter exatamente 14 dígitos.');
      return false;
    }
    setClientError(null);
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
        if (rpcError.message.includes('unique_violation') && rpcError.message.includes('cnpj')) {
            throw new Error('Já existe uma empresa com este CNPJ.');
        }
        throw rpcError;
      }
      
      const empresaCriada = Array.isArray(data) ? data[0] : null;

      if (empresaCriada && empresaCriada.empresa_id) {
        await refreshEmpresas();
        
        // Find the full company object to set it as active
        const { data: newEmpresaList, error: fetchError } = await supabase
            .from('empresas')
            .select('*')
            .eq('id', empresaCriada.empresa_id);

        if (fetchError || !newEmpresaList || newEmpresaList.length === 0) {
            throw new Error('Não foi possível selecionar a empresa recém-criada.');
        }

        setActiveEmpresa(newEmpresaList[0]);
        addToast('Empresa criada com sucesso!', 'success');
        onCompanyCreated();
      } else {
        throw new Error('Ocorreu um erro inesperado. A resposta do servidor estava vazia.');
      }
    } catch (error: any) {
      if (error.message.includes('not_signed_in')) {
        addToast('Sua sessão expirou. Por favor, faça login novamente.', 'error');
      } else if (error.message.includes('invalid_cnpj_format')) {
        addToast('O formato do CNPJ é inválido. Por favor, verifique e envie 14 dígitos.', 'error');
      } else {
        addToast(error.message || 'Erro ao criar empresa.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-glass-200 border border-white/20 rounded-3xl shadow-2xl w-full max-w-lg relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-50">
            <X size={24} />
          </button>
          
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Criar Nova Empresa</h1>
            <p className="text-gray-600 mb-6">Preencha os dados abaixo para começar.</p>

            {clientError && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{clientError}</p>}

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
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center mt-6"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Criar Empresa'}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateCompanyModal;

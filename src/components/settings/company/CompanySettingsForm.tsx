import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthProvider';
import { supabase } from '../../../lib/supabase';
import { Database } from '../../../types/database.types';
import { UploadCloud, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../../contexts/ToastProvider';

type EmpresaUpdate = Database['public']['Tables']['empresas']['Update'];

const CompanySettingsForm: React.FC = () => {
  const { activeEmpresa, refreshEmpresas } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<EmpresaUpdate | null>(null);
  const [initialData, setInitialData] = useState<EmpresaUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);

  useEffect(() => {
    if (activeEmpresa) {
      setFormData(activeEmpresa);
      setInitialData(activeEmpresa);
    }
  }, [activeEmpresa]);

  useEffect(() => {
    if (formData && initialData) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(initialData);
      setIsDirty(hasChanged);
    }
  }, [formData, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => (prev ? { ...prev, [name]: value } : null));
  };
  
  const handleFetchCnpjData = async () => {
    if (!formData?.cnpj) return;

    const cnpj = formData.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      addToast('Por favor, insira um CNPJ válido com 14 dígitos.', 'error');
      return;
    }

    setIsFetchingCnpj(true);
    
    try {
      const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      
      setFormData(prev => ({
        ...prev,
        razao_social: data.razao_social || prev?.razao_social,
        fantasia: data.nome_fantasia || prev?.fantasia,
        endereco_cep: data.cep?.replace(/\D/g, '') || prev?.endereco_cep,
        endereco_logradouro: data.logradouro || prev?.endereco_logradouro,
        endereco_numero: data.numero || prev?.endereco_numero,
        endereco_complemento: data.complemento || prev?.endereco_complemento,
        endereco_bairro: data.bairro || prev?.endereco_bairro,
        endereco_cidade: data.municipio || prev?.endereco_cidade,
        endereco_uf: data.uf || prev?.endereco_uf,
        telefone: data.ddd_telefone_1 || prev?.telefone,
        email: data.email || prev?.email,
      }));
      addToast('Dados da empresa preenchidos com sucesso!', 'success');

    } catch (apiError: any) {
      if (apiError.response && apiError.response.status === 404) {
        addToast('CNPJ não encontrado. Verifique o número e tente novamente.', 'error');
      } else {
        addToast('Não foi possível buscar os dados do CNPJ.', 'error');
      }
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !formData.id) return;

    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { created_at, ...updateData } = formData;

    const { error: updateError } = await supabase
      .from('empresas')
      .update(updateData)
      .eq('id', formData.id);

    if (updateError) {
      addToast(`Erro ao atualizar empresa: ${updateError.message}`, 'error');
    } else {
      addToast('Dados da empresa atualizados com sucesso!', 'success');
      await refreshEmpresas();
    }

    setLoading(false);
  };

  const handleReset = () => {
    setFormData(initialData);
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configurações da Empresa</h1>
        {isDirty && (
          <button
            onClick={handleReset}
            className="text-sm text-gray-600 hover:text-red-600 transition-colors px-3 py-1 rounded-md hover:bg-red-50"
            >
            Descartar alterações
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
          {/* Coluna Esquerda */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Logo da Empresa</h2>
              <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50 text-gray-500">
                <div className="text-center">
                  <UploadCloud className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-sm">Upload do logo virá em breve</p>
                </div>
              </div>
            </div>
            <InputField label="Razão Social" name="razao_social" value={formData.razao_social || ''} onChange={handleChange} required />
            <InputField label="Nome Fantasia" name="fantasia" value={formData.fantasia || ''} onChange={handleChange} />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="cnpj">CNPJ</label>
              <div className="relative">
                <input
                  id="cnpj"
                  name="cnpj"
                  type="text"
                  value={formData.cnpj || ''}
                  onChange={handleChange}
                  className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm pr-12"
                  placeholder="00.000.000/0001-00"
                />
                <button
                  type="button"
                  onClick={handleFetchCnpjData}
                  disabled={isFetchingCnpj || !formData.cnpj}
                  className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-blue-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                  aria-label="Buscar dados do CNPJ"
                >
                  {isFetchingCnpj ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Search size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Contato</h2>
              <div className="space-y-6">
                <InputField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleChange} />
                <InputField label="Email de Contato" name="email" value={formData.email || ''} onChange={handleChange} type="email" />
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Endereço</h2>
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-2">
                  <InputField label="CEP" name="endereco_cep" value={formData.endereco_cep || ''} onChange={handleChange} />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <InputField label="Logradouro" name="endereco_logradouro" value={formData.endereco_logradouro || ''} onChange={handleChange} />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <InputField label="Número" name="endereco_numero" value={formData.endereco_numero || ''} onChange={handleChange} />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <InputField label="Complemento" name="endereco_complemento" value={formData.endereco_complemento || ''} onChange={handleChange} />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <InputField label="Bairro" name="endereco_bairro" value={formData.endereco_bairro || ''} onChange={handleChange} />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <InputField label="Cidade" name="endereco_cidade" value={formData.endereco_cidade || ''} onChange={handleChange} />
                </div>
                <div className="col-span-6 sm:col-span-1">
                  <InputField label="UF" name="endereco_uf" value={formData.endereco_uf || ''} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading || !isDirty}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
};

interface InputFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange, type = 'text', required = false }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={name}>{label}</label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm"
        />
    </div>
);

export default CompanySettingsForm;

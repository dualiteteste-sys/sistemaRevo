import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { PartnerDetails, savePartnerFromForm, Endereco, Contato } from '../../services/partners';
import { useToast } from '../../contexts/ToastProvider';
import { Database } from '@/types/database.types';
import IdentificationSection from './form-sections/IdentificationSection';
import AddressSection from './form-sections/AddressSection';
import ContactSection from './form-sections/ContactSection';

type Pessoa = Database['public']['Tables']['pessoas']['Row'];

interface PartnerFormPanelProps {
  partner: PartnerDetails | null;
  onSaveSuccess: (savedPartner: PartnerDetails) => void;
  onClose: () => void;
}

const PartnerFormPanel: React.FC<PartnerFormPanelProps> = ({ partner, onSaveSuccess, onClose }) => {
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Pessoa>>({});
  const [addresses, setAddresses] = useState<Partial<Endereco>[]>([]);
  const [contacts, setContacts] = useState<Partial<Contato>[]>([]);

  useEffect(() => {
    if (partner) {
      const { enderecos, contatos, ...pessoaData } = partner;
      setFormData(pessoaData);
      setAddresses(enderecos?.length > 0 ? enderecos : [{ tipo_endereco: 'principal' }]);
      setContacts(contatos || []);
    } else {
      // Estado inicial para um novo parceiro
      setFormData({ tipo: 'cliente', tipo_pessoa: 'juridica', isento_ie: false, contribuinte_icms: '9' });
      setAddresses([{ tipo_endereco: 'principal' }]);
      setContacts([]);
    }
  }, [partner]);

  const handlePessoaChange = (field: keyof Pessoa, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCnpjDataFetched = (data: any) => {
    setFormData(prev => ({
      ...prev,
      nome: data.razao_social || prev.nome,
      fantasia: data.nome_fantasia || prev.fantasia,
      email: data.email || prev.email,
      telefone: data.ddd_telefone_1 || prev.telefone,
    }));
    setAddresses(prev => {
        const newAddresses = [...prev];
        const mainAddressIndex = newAddresses.findIndex(a => a.tipo_endereco === 'principal');
        const indexToUpdate = mainAddressIndex !== -1 ? mainAddressIndex : 0;
        if (!newAddresses[indexToUpdate]) newAddresses[indexToUpdate] = {};
        newAddresses[indexToUpdate] = {
            ...newAddresses[indexToUpdate],
            cep: data.cep,
            logradouro: data.logradouro,
            numero: data.numero,
            complemento: data.complemento,
            bairro: data.bairro,
            cidade: data.municipio,
            uf: data.uf,
        };
        return newAddresses;
    });
  };

  const handleSave = async () => {
    if (!formData.nome) {
      addToast('O Nome/Razão Social é obrigatório.', 'error');
      return;
    }
    
    setIsSaving(true);
    try {
      const mainAddress = addresses.find(a => a.tipo_endereco === 'principal') || {};

      const formValues = {
        ...formData,
        ...mainAddress,
        contatos: contacts,
      };

      console.log('[FORM][PARTNER_SUBMIT]', formValues);

      const savedPartner = await savePartnerFromForm(formValues);
      
      console.log('[RPC][CREATE_UPDATE_PARTNER][OK]', savedPartner);
      addToast('Salvo com sucesso!', 'success');
      onSaveSuccess(savedPartner);
    } catch (error: any) {
      console.error('[RPC][CREATE_UPDATE_PARTNER][ERR]', error);
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-6 overflow-y-auto scrollbar-styled">
        <IdentificationSection
          data={formData}
          onChange={handlePessoaChange}
          onCnpjDataFetched={handleCnpjDataFetched}
        />
        <AddressSection
          addresses={addresses}
          setAddresses={setAddresses}
        />
        <ContactSection
          data={formData}
          onPessoaChange={handlePessoaChange}
          contacts={contacts}
          setContacts={setContacts}
        />
      </div>

      <footer className="flex-shrink-0 p-4 flex justify-end items-center border-t border-white/20">
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Salvar
          </button>
        </div>
      </footer>
    </div>
  );
};

export default PartnerFormPanel;

import React, { useState } from 'react';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Database } from '@/types/database.types';
import Section from '../../ui/forms/Section';
import Input from '../../ui/forms/Input';
import { useToast } from '../../../contexts/ToastProvider';
import { fetchCepData } from '../../../services/externalApis';
import { cepMask } from '../../../lib/masks';
import Toggle from '../../ui/forms/Toggle';

type Endereco = Partial<Database['public']['Tables']['pessoa_enderecos']['Row']>;

interface AddressSectionProps {
  addresses: Endereco[];
  setAddresses: React.Dispatch<React.SetStateAction<Endereco[]>>;
}

const AddressSection: React.FC<AddressSectionProps> = ({ addresses, setAddresses }) => {
  const { addToast } = useToast();
  const [fetchingCep, setFetchingCep] = useState<number | null>(null);

  const handleAddressChange = (index: number, field: keyof Endereco, value: any) => {
    let finalValue = value;
    if (field === 'cep') {
      finalValue = cepMask(value);
    }
    const newAddresses = [...addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: finalValue };
    setAddresses(newAddresses);
  };

  const handleFetchCep = async (index: number) => {
    const cep = addresses[index]?.cep;
    if (!cep) return;
    setFetchingCep(index);
    try {
      const data = await fetchCepData(cep);
      const newAddresses = [...addresses];
      newAddresses[index] = {
        ...newAddresses[index],
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
      };
      setAddresses(newAddresses);
      addToast('Endereço preenchido!', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setFetchingCep(null);
    }
  };

  const addAddress = () => setAddresses([...addresses, { tipo_endereco: 'cobranca' }]);
  const removeAddress = (index: number) => setAddresses(addresses.filter((_, i) => i !== index));

  const hasBillingAddress = addresses.some(addr => addr.tipo_endereco === 'cobranca');

  return (
    <Section title="Endereço" description="Endereço principal para correspondência e faturamento.">
      <div className="sm:col-span-6 space-y-6">
        {addresses.map((addr, index) => (
          <div key={addr.id || index} className="p-4 border rounded-lg bg-gray-50/50 relative">
            {addresses.length > 1 && addr.tipo_endereco !== 'principal' && (
              <button onClick={() => removeAddress(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
            )}
            <p className="font-medium text-gray-600 mb-4">{addr.tipo_endereco === 'principal' ? 'Endereço Principal' : 'Endereço de Cobrança'}</p>
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-6 sm:col-span-2">
                <label htmlFor={`cep-${index}`} className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <div className="relative">
                  <input
                    id={`cep-${index}`} name={`cep-${index}`} value={addr.cep || ''} onChange={e => handleAddressChange(index, 'cep', e.target.value)}
                    className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-sm pr-12"
                  />
                  <button
                    type="button" onClick={() => handleFetchCep(index)} disabled={fetchingCep === index || !addr.cep}
                    className="absolute inset-y-0 right-0 flex items-center justify-center w-12 text-gray-500 hover:text-blue-600 disabled:text-gray-300"
                  >
                    {fetchingCep === index ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  </button>
                </div>
              </div>
              <Input label="Município" name={`cidade-${index}`} value={addr.cidade || ''} onChange={e => handleAddressChange(index, 'cidade', e.target.value)} className="col-span-6 sm:col-span-3" />
              <Input label="UF" name={`uf-${index}`} value={addr.uf || ''} onChange={e => handleAddressChange(index, 'uf', e.target.value)} className="col-span-6 sm:col-span-1" />
              <Input label="Endereço" name={`logradouro-${index}`} value={addr.logradouro || ''} onChange={e => handleAddressChange(index, 'logradouro', e.target.value)} className="col-span-6" />
              <Input label="Bairro" name={`bairro-${index}`} value={addr.bairro || ''} onChange={e => handleAddressChange(index, 'bairro', e.target.value)} className="col-span-6 sm:col-span-3" />
              <Input label="Número" name={`numero-${index}`} value={addr.numero || ''} onChange={e => handleAddressChange(index, 'numero', e.target.value)} className="col-span-6 sm:col-span-1" />
              <Input label="Complemento" name={`complemento-${index}`} value={addr.complemento || ''} onChange={e => handleAddressChange(index, 'complemento', e.target.value)} className="col-span-6 sm:col-span-2" />
            </div>
          </div>
        ))}
        {addresses.length === 1 && (
            <Toggle
                label="Possui endereço de cobrança diferente do endereço principal"
                name="add-billing-address"
                checked={hasBillingAddress}
                onChange={(checked) => {
                    if (checked) {
                        addAddress();
                    } else {
                        const billingIndex = addresses.findIndex(a => a.tipo_endereco === 'cobranca');
                        if (billingIndex !== -1) removeAddress(billingIndex);
                    }
                }}
            />
        )}
      </div>
    </Section>
  );
};

export default AddressSection;

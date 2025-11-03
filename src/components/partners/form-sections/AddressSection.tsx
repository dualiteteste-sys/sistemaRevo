import React, { useState, useEffect } from 'react';
import { EnderecoPayload } from '@/services/partners';
import { Loader2, Search } from 'lucide-react';
import Section from '../../ui/forms/Section';
import Input from '../../ui/forms/Input';
import Select from '../../ui/forms/Select';
import { cepMask } from '@/lib/masks';
import { fetchCepData } from '@/services/externalApis';
import { useToast } from '@/contexts/ToastProvider';
import { UFS } from '@/lib/constants';

interface AddressSectionProps {
  enderecos: EnderecoPayload[];
  onEnderecosChange: (enderecos: EnderecoPayload[]) => void;
}

const AddressSection: React.FC<AddressSectionProps> = ({ enderecos, onEnderecosChange }) => {
  const { addToast } = useToast();
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [hasDifferentBillingAddress, setHasDifferentBillingAddress] = useState(false);

  const primaryAddress = enderecos[0] || {};

  useEffect(() => {
    setHasDifferentBillingAddress(enderecos.length > 1);
  }, [enderecos]);

  const handleAddressChange = (index: number, field: keyof EnderecoPayload, value: any) => {
    const newEnderecos = [...enderecos];
    if (!newEnderecos[index]) {
      newEnderecos[index] = {};
    }
    newEnderecos[index] = { ...newEnderecos[index], [field]: value };
    onEnderecosChange(newEnderecos);
  };

  const handlePrimaryAddressChange = (field: keyof EnderecoPayload, value: any) => {
    handleAddressChange(0, field, value);
  };

  const handleCepSearch = async () => {
    const cep = primaryAddress.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      return;
    }

    setIsFetchingCep(true);
    try {
      const data = await fetchCepData(cep);
      
      const updatedPrimaryAddress = {
        ...primaryAddress,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || '',
        cep: cep,
      };

      const newEnderecos = [...enderecos];
      newEnderecos[0] = updatedPrimaryAddress;

      onEnderecosChange(newEnderecos);

      addToast('Endereço encontrado!', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setHasDifferentBillingAddress(isChecked);
    if (!isChecked) {
      onEnderecosChange(enderecos.slice(0, 1));
    } else {
      if (enderecos.length < 2) {
        onEnderecosChange([...enderecos, {}]);
      }
    }
  };

  return (
    <Section title="Endereço" description="Endereço principal do parceiro.">
      <div className="sm:col-span-6 space-y-6">
        <div className="p-4 border rounded-lg bg-gray-50/50 relative">
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
            <div className="sm:col-span-2">
              <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
              <div className="relative">
                <input
                  id="cep"
                  name="cep"
                  value={cepMask(primaryAddress.cep || '')}
                  onChange={e => handlePrimaryAddressChange('cep', e.target.value)}
                  onBlur={handleCepSearch}
                  placeholder="00000-000"
                  className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg pr-10"
                />
                <div className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                  {isFetchingCep ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                </div>
              </div>
            </div>
            <Input
              label="Município"
              name="cidade"
              value={primaryAddress.cidade || ''}
              onChange={e => handlePrimaryAddressChange('cidade', e.target.value)}
              className="sm:col-span-3"
            />
            <Select
              label="UF"
              name="uf"
              value={primaryAddress.uf || ''}
              onChange={e => handlePrimaryAddressChange('uf', e.target.value)}
              className="sm:col-span-1"
            >
              <option value="">UF</option>
              {UFS.map(uf => <option key={uf.value} value={uf.value}>{uf.value}</option>)}
            </Select>

            <Input
              label="Endereço"
              name="logradouro"
              value={primaryAddress.logradouro || ''}
              onChange={e => handlePrimaryAddressChange('logradouro', e.target.value)}
              className="sm:col-span-6"
            />

            <Input
              label="Bairro"
              name="bairro"
              value={primaryAddress.bairro || ''}
              onChange={e => handlePrimaryAddressChange('bairro', e.target.value)}
              className="sm:col-span-3"
            />
            <Input
              label="Número"
              name="numero"
              value={primaryAddress.numero || ''}
              onChange={e => handlePrimaryAddressChange('numero', e.target.value)}
              className="sm:col-span-1"
            />
            <Input
              label="Complemento"
              name="complemento"
              value={primaryAddress.complemento || ''}
              onChange={e => handlePrimaryAddressChange('complemento', e.target.value)}
              className="sm:col-span-2"
            />
            <div className="sm:col-span-6 pt-4">
              <div className="relative flex items-start">
                <div className="flex h-6 items-center">
                  <input
                    id="billing-address-checkbox"
                    name="billing-address-checkbox"
                    type="checkbox"
                    checked={hasDifferentBillingAddress}
                    onChange={handleCheckboxChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor="billing-address-checkbox" className="font-medium text-gray-900">
                    Possui endereço de cobrança diferente do endereço principal
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default AddressSection;

import React, { useState } from 'react';
import { EnderecoPayload } from '@/services/partners';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, MapPin, Loader2 } from 'lucide-react';
import Section from '../../ui/forms/Section';
import Input from '../../ui/forms/Input';
import Select from '../../ui/forms/Select';
import { cepMask } from '@/lib/masks';
import { fetchCepData } from '@/services/externalApis';
import { useToast } from '@/contexts/ToastProvider';

interface AddressSectionProps {
  enderecos: EnderecoPayload[];
  onEnderecosChange: (enderecos: EnderecoPayload[]) => void;
}

const AddressItem: React.FC<{
  endereco: EnderecoPayload;
  index: number;
  onUpdate: (index: number, field: keyof EnderecoPayload, value: any) => void;
  onRemove: (index: number) => void;
}> = ({ endereco, index, onUpdate, onRemove }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const { addToast } = useToast();

  const handleCepSearch = async () => {
    if (!endereco.cep) return;
    setIsFetchingCep(true);
    try {
      const data = await fetchCepData(endereco.cep);
      onUpdate(index, 'logradouro', data.logradouro || '');
      onUpdate(index, 'bairro', data.bairro || '');
      onUpdate(index, 'cidade', data.localidade || '');
      onUpdate(index, 'uf', data.uf || '');
      addToast('CEP encontrado!', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsFetchingCep(false);
    }
  };

  return (
    <div className="border rounded-lg bg-white/60 overflow-hidden">
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center p-3 bg-gray-50/50 hover:bg-gray-100/50">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-gray-600" />
          <span className="font-medium text-gray-800">{endereco.logradouro || `Endereço ${index + 1}`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(index); }} className="p-1 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={20} /></motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 grid grid-cols-1 sm:grid-cols-6 gap-4">
              <Select label="Tipo" value={endereco.tipo_endereco || 'principal'} onChange={e => onUpdate(index, 'tipo_endereco', e.target.value)} className="sm:col-span-2">
                <option value="principal">Principal</option>
                <option value="cobranca">Cobrança</option>
                <option value="entrega">Entrega</option>
                <option value="outro">Outro</option>
              </Select>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                <div className="relative">
                  <input value={cepMask(endereco.cep || '')} onChange={e => onUpdate(index, 'cep', e.target.value)} className="w-full p-3 bg-white/80 border border-gray-300 rounded-lg pr-10" />
                  <button type="button" onClick={handleCepSearch} disabled={isFetchingCep} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-blue-600 disabled:text-gray-300">
                    {isFetchingCep ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                  </button>
                </div>
              </div>
              <Input label="País" value={endereco.pais || 'Brasil'} onChange={e => onUpdate(index, 'pais', e.target.value)} className="sm:col-span-2" />
              <Input label="Logradouro" value={endereco.logradouro || ''} onChange={e => onUpdate(index, 'logradouro', e.target.value)} className="sm:col-span-4" required />
              <Input label="Número" value={endereco.numero || ''} onChange={e => onUpdate(index, 'numero', e.target.value)} className="sm:col-span-2" />
              <Input label="Complemento" value={endereco.complemento || ''} onChange={e => onUpdate(index, 'complemento', e.target.value)} className="sm:col-span-2" />
              <Input label="Bairro" value={endereco.bairro || ''} onChange={e => onUpdate(index, 'bairro', e.target.value)} className="sm:col-span-2" />
              <Input label="Cidade" value={endereco.cidade || ''} onChange={e => onUpdate(index, 'cidade', e.target.value)} className="sm:col-span-1" />
              <Input label="UF" value={endereco.uf || ''} onChange={e => onUpdate(index, 'uf', e.target.value)} className="sm:col-span-1" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AddressSection: React.FC<AddressSectionProps> = ({ enderecos, onEnderecosChange }) => {
  const handleAdd = () => {
    onEnderecosChange([...enderecos, { tipo_endereco: 'principal', pais: 'Brasil' }]);
  };

  const handleRemove = (index: number) => {
    onEnderecosChange(enderecos.filter((_, i) => i !== index));
  };

  const handleUpdate = (index: number, field: keyof EnderecoPayload, value: any) => {
    const newEnderecos = [...enderecos];
    newEnderecos[index] = { ...newEnderecos[index], [field]: value };
    onEnderecosChange(newEnderecos);
  };

  return (
    <Section title="Endereços" description="Gerencie os endereços do parceiro.">
      <div className="sm:col-span-6 space-y-4">
        <AnimatePresence>
          {enderecos.map((endereco, index) => (
            <motion.div key={endereco.id || index} layout>
              <AddressItem endereco={endereco} index={index} onUpdate={handleUpdate} onRemove={handleRemove} />
            </motion.div>
          ))}
        </AnimatePresence>
        <button type="button" onClick={handleAdd} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50">
          <Plus size={16} /> Adicionar Endereço
        </button>
      </div>
    </Section>
  );
};

export default AddressSection;

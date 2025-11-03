import React, { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Service, createService, updateService } from '@/services/services';
import { useToast } from '@/contexts/ToastProvider';
import Section from '../ui/forms/Section';
import Input from '../ui/forms/Input';
import Select from '../ui/forms/Select';
import TextArea from '../ui/forms/TextArea';
import { useNumericField } from '@/hooks/useNumericField';

interface ServiceFormPanelProps {
  service: Partial<Service> | null;
  onSaveSuccess: (savedService: Service) => void;
  onClose: () => void;
}

const ServiceFormPanel: React.FC<ServiceFormPanelProps> = ({ service, onSaveSuccess, onClose }) => {
  const { addToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Service>>({});

  const precoVendaProps = useNumericField(typeof formData.preco_venda === 'number' ? formData.preco_venda : undefined, (value) => {
    handleFormChange('preco_venda', value);
  });

  useEffect(() => {
    if (service) {
      setFormData(service);
    } else {
      setFormData({ status: 'ativo', nbs_ibpt_required: false });
    }
  }, [service]);

  const handleFormChange = (field: keyof Service, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.descricao) {
      addToast('A descrição é obrigatória.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let savedService: Service;
      if (formData.id) {
        savedService = await updateService(formData.id, formData);
        addToast('Serviço atualizado com sucesso!', 'success');
      } else {
        savedService = await createService(formData);
        addToast('Serviço criado com sucesso!', 'success');
      }
      onSaveSuccess(savedService);
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-6 overflow-y-auto scrollbar-styled">
        <Section title="Dados do Serviço" description="Informações de identificação do serviço.">
          <div className="sm:col-span-4">
            <Input label="Descrição*" name="descricao" value={formData.descricao || ''} onChange={e => handleFormChange('descricao', e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <Input label="Código" name="codigo" value={formData.codigo || ''} onChange={e => handleFormChange('codigo', e.target.value)} placeholder="Código ou referência" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Preço de Venda" name="preco_venda" {...precoVendaProps} endAdornment="R$" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Unidade" name="unidade" value={formData.unidade || ''} onChange={e => handleFormChange('unidade', e.target.value)} placeholder="Ex.: H, UN" />
          </div>
          <div className="sm:col-span-2">
            <Select label="Situação" name="status" value={formData.status || 'ativo'} onChange={e => handleFormChange('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Select>
          </div>
        </Section>

        <Section title="Informações Fiscais" description="Dados para emissão de notas fiscais de serviço.">
          <div className="sm:col-span-3">
            <Input label="Código do serviço (LC 116)" name="codigo_servico" value={formData.codigo_servico || ''} onChange={e => handleFormChange('codigo_servico', e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Input label="NBS" name="nbs" value={formData.nbs || ''} onChange={e => handleFormChange('nbs', e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <Select label="Necessária para o IBPT?" name="nbs_ibpt_required" value={formData.nbs_ibpt_required ? 'true' : 'false'} onChange={e => handleFormChange('nbs_ibpt_required', e.target.value === 'true')}>
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </Select>
          </div>
        </Section>

        <Section title="Informações Adicionais" description="Detalhes e observações sobre o serviço.">
          <div className="sm:col-span-6">
            <TextArea label="Descrição Complementar" name="descricao_complementar" value={formData.descricao_complementar || ''} onChange={e => handleFormChange('descricao_complementar', e.target.value)} rows={4} />
          </div>
          <div className="sm:col-span-6">
            <TextArea label="Observações" name="observacoes" value={formData.observacoes || ''} onChange={e => handleFormChange('observacoes', e.target.value)} rows={3} />
          </div>
        </Section>
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

export default ServiceFormPanel;

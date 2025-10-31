import React from 'react';
import { Database } from '@/types/database.types';
import Section from '../../ui/forms/Section';
import Input from '../../ui/forms/Input';
import { Trash2, PlusCircle } from 'lucide-react';
import TagInput from '../../ui/forms/TagInput';
import { phoneMask } from '../../../lib/masks';

type Contato = Partial<Database['public']['Tables']['pessoa_contatos']['Row']>;
type Pessoa = Partial<Database['public']['Tables']['pessoas']['Row']>;

interface ContactSectionProps {
  data: Pessoa;
  contacts: Contato[];
  setContacts: React.Dispatch<React.SetStateAction<Contato[]>>;
  onPessoaChange: (field: keyof Pessoa, value: any) => void;
}

const ContactSection: React.FC<ContactSectionProps> = ({ data, contacts, setContacts, onPessoaChange }) => {

  const handleContactChange = (index: number, field: keyof Contato, value: any) => {
    const newContacts = [...contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setContacts(newContacts);
  };

  const addContact = () => setContacts([...contacts, {}]);
  const removeContact = (index: number) => setContacts(contacts.filter((_, i) => i !== index));

  return (
    <>
      <Section title="Contatos" description="Informações de contato principal e adicionais.">
        <div className="sm:col-span-6 space-y-6">
          {/* Main Contact Box */}
          <div className="p-4 border rounded-lg bg-gray-50/50 relative">
            <p className="font-medium text-gray-600 mb-4">Contato Principal</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="E-mail" name="email" type="email" value={data.email || ''} onChange={e => onPessoaChange('email', e.target.value)} />
              <Input label="Telefone" name="telefone" value={phoneMask(data.telefone || '')} onChange={e => onPessoaChange('telefone', e.target.value)} />
              <Input label="Celular" name="celular" value={phoneMask(data.celular || '')} onChange={e => onPessoaChange('celular', e.target.value)} />
              <Input label="Site" name="site" value={data.site || ''} onChange={e => onPessoaChange('site', e.target.value)} />
            </div>
          </div>

          {/* Additional Contacts */}
          {contacts.map((contact, index) => (
            <div key={contact.id || index} className="p-4 border rounded-lg bg-gray-50/50 relative">
              <button onClick={() => removeContact(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100">
                <Trash2 size={16} />
              </button>
              <p className="font-medium text-gray-600 mb-4">Contato Adicional</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nome" value={contact.nome || ''} onChange={e => handleContactChange(index, 'nome', e.target.value)} />
                <Input label="E-mail" type="email" value={contact.email || ''} onChange={e => handleContactChange(index, 'email', e.target.value)} />
                <Input label="Telefone" value={phoneMask(contact.telefone || '')} onChange={e => handleContactChange(index, 'telefone', e.target.value)} />
                <Input label="Cargo" value={contact.cargo || ''} onChange={e => handleContactChange(index, 'cargo', e.target.value)} />
              </div>
            </div>
          ))}

          {/* Add Button */}
          <button type="button" onClick={addContact} className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:text-blue-800">
            <PlusCircle size={18} />
            Adicionar Contato
          </button>
        </div>
      </Section>
      
      <Section title="Outras Informações" description="Detalhes adicionais e organização.">
        <div className="sm:col-span-3">
          <TagInput
            label="Tags de Contato"
            tags={data.contato_tags || []}
            onTagsChange={(newTags) => onPessoaChange('contato_tags', newTags)}
          />
        </div>
        <div className="sm:col-span-3">
          <Input label="Observações" name="observacoes" value={data.observacoes || ''} onChange={e => onPessoaChange('observacoes', e.target.value)} />
        </div>
      </Section>
    </>
  );
};

export default ContactSection;

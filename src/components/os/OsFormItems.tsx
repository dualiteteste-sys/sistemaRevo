import React from 'react';
import { OrdemServicoItemPayload } from '@/services/os';
import { Plus, Trash2 } from 'lucide-react';
import Input from '../ui/forms/Input';
import { useNumericField } from '@/hooks/useNumericField';

interface OsFormItemsProps {
  items: OrdemServicoItemPayload[];
  onItemsChange: (items: OrdemServicoItemPayload[]) => void;
  onRemoveItem: (index: number) => void;
}

const ItemRow: React.FC<{
  item: OrdemServicoItemPayload;
  index: number;
  onUpdate: (index: number, field: keyof OrdemServicoItemPayload, value: any) => void;
  onRemove: (index: number) => void;
}> = ({ item, index, onUpdate, onRemove }) => {
  
  const quantidadeProps = useNumericField(item.quantidade, (value) => onUpdate(index, 'quantidade', value));
  const precoProps = useNumericField(item.preco, (value) => onUpdate(index, 'preco', value));
  const descontoProps = useNumericField(item.desconto_pct, (value) => onUpdate(index, 'desconto_pct', value));

  const total = (item.quantidade || 0) * (item.preco || 0) * (1 - (item.desconto_pct || 0) / 100);

  return (
    <div className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg hover:bg-gray-50">
      <div className="col-span-4">
        <Input label={index === 0 ? "Descrição do Item" : ""} name={`desc-${index}`} value={item.descricao || ''} onChange={e => onUpdate(index, 'descricao', e.target.value)} placeholder="Serviço ou Produto" />
      </div>
      <div className="col-span-2">
        <Input label={index === 0 ? "Qtd." : ""} name={`qtd-${index}`} {...quantidadeProps} />
      </div>
      <div className="col-span-2">
        <Input label={index === 0 ? "Preço Unit." : ""} name={`preco-${index}`} {...precoProps} endAdornment="R$" />
      </div>
      <div className="col-span-2">
        <Input label={index === 0 ? "Desc. %" : ""} name={`desc-${index}`} {...descontoProps} endAdornment="%" />
      </div>
      <div className="col-span-1 text-right">
        {index === 0 && <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>}
        <div className="p-3 text-gray-700 font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</div>
      </div>
      <div className="col-span-1 flex items-center justify-center pb-2">
        <button type="button" onClick={() => onRemove(index)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

const OsFormItems: React.FC<OsFormItemsProps> = ({ items, onItemsChange, onRemoveItem }) => {
  const handleAddItem = () => {
    onItemsChange([...items, { quantidade: 1, preco: 0, desconto_pct: 0 }]);
  };

  const handleUpdateItem = (index: number, field: keyof OrdemServicoItemPayload, value: any) => {
    const newItems = [...items];
    const updatedItem = { ...newItems[index], [field]: value };
    
    // Recalculate total for the updated item
    const qty = updatedItem.quantidade || 0;
    const price = updatedItem.preco || 0;
    const discount = updatedItem.desconto_pct || 0;
    updatedItem.total = qty * price * (1 - discount / 100);

    newItems[index] = updatedItem;
    onItemsChange(newItems);
  };

  return (
    <div className="pt-8 mt-8 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800">Itens da Ordem de Serviço</h3>
      <div className="mt-4 space-y-2">
        {items.map((item, index) => (
          <ItemRow key={item.id || index} item={item} index={index} onUpdate={handleUpdateItem} onRemove={onRemoveItem} />
        ))}
      </div>
      <div className="mt-4">
        <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50">
          <Plus size={16} /> Adicionar Item
        </button>
      </div>
    </div>
  );
};

export default OsFormItems;

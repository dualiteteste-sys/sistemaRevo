// src/components/os/OSItemsEditor.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as os from '@/services/os';

type Props = {
  osId: string;
  items: os.OSItem[];
  onAdded: (i: os.OSItem) => void;
  onChanged: (i: os.OSItem) => void;
  onRemoved: (id: string) => void;
};

export default function OSItemsEditor({ osId, items, onAdded, onChanged, onRemoved }: Props) {
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<os.OSItem>>({
    descricao: '',
    codigo: '',
    quantidade: '1',
    preco: '0',
    desconto_pct: '0',
    orcar: false,
  });

  // Autocomplete de serviços
  const [query, setQuery] = useState('');
  const [svcOptions, setSvcOptions] = useState<os.ServiceLite[]>([]);
  const [openDrop, setOpenDrop] = useState(false);
  const acRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!acRef.current) return;
      if (!acRef.current.contains(e.target as Node)) setOpenDrop(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  async function searchServicesDebounced(q: string) {
    setQuery(q);
    if (!q || q.trim().length < 2) {
      setSvcOptions([]);
      return;
    }
    try {
      const res = await os.searchServices(q, 15);
      setSvcOptions(res);
      setOpenDrop(true);
    } catch (e) {
      console.error('[RPC][ERROR] search_services_for_current_user', e);
    }
  }

  function applyService(s: os.ServiceLite) {
    setDraft(d => ({
      ...d,
      servico_id: s.id,
      descricao: s.descricao,
      codigo: s.codigo ?? '',
      preco: String(s.preco_venda ?? '0'),
    }));
    setQuery(s.descricao);
    setOpenDrop(false);
  }

  const totalItens = useMemo(
    () => items.reduce((acc, it) => acc + Number(it.total || 0), 0),
    [items]
  );

  async function handleAdd() {
    setSaving(true);
    try {
      const payload = { ...draft };
      const created = await os.addItem(osId, payload);
      onAdded(created);
      setDraft({ descricao: '', codigo: '', quantidade: '1', preco: '0', desconto_pct: '0', orcar: false });
      setQuery('');
      setSvcOptions([]);
    } catch (e) {
      console.error('[RPC][ERROR] add_os_item_for_current_user', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Linha de inclusão com autocomplete */}
      <div className="grid grid-cols-12 gap-2 items-end">
        <div className="col-span-5" ref={acRef}>
          <label className="block text-sm mb-1">Serviço (busca/seleção)</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={query}
            onChange={e => {
              const v = e.target.value;
              setQuery(v);
              setDraft(d => ({ ...d, descricao: v, servico_id: undefined }));
              searchServicesDebounced(v);
            }}
            placeholder="Digite 2+ letras para buscar…"
            onFocus={() => query.trim().length >= 2 && setOpenDrop(true)}
          />
          {openDrop && svcOptions.length > 0 && (
            <div className="absolute z-50 mt-1 w-[36rem] max-w-[90vw] bg-white border rounded shadow">
              <ul>
                {svcOptions.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      onClick={() => applyService(s)}
                    >
                      <div className="text-sm">{s.descricao}</div>
                      <div className="text-xs text-gray-500">
                        {s.codigo ?? '—'} • R$ {Number(s.preco_venda ?? 0).toFixed(2)} • {s.unidade ?? '—'}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">Cód</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={draft.codigo ?? ''}
            onChange={e => setDraft(d => ({ ...d, codigo: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Qtde</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={draft.quantidade ?? ''}
            onChange={e => setDraft(d => ({ ...d, quantidade: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Preço</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={draft.preco ?? ''}
            onChange={e => setDraft(d => ({ ...d, preco: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Desc %</label>
          <input
            className="w-full border rounded px-2 py-1"
            value={draft.desconto_pct ?? ''}
            onChange={e => setDraft(d => ({ ...d, desconto_pct: e.target.value }))}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm mb-1">Orçar</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={draft.orcar ? 'true' : 'false'}
            onChange={e => setDraft(d => ({ ...d, orcar: e.target.value === 'true' }))}
          >
            <option value="false">Não</option>
            <option value="true">Sim</option>
          </select>
        </div>

        <div>
          <button onClick={handleAdd} disabled={saving} className="px-3 py-2 rounded bg-blue-600 text-white">
            {saving ? 'Salvando…' : 'adicionar'}
          </button>
        </div>
      </div>

      {/* Tabela de itens */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs">Descrição</th>
              <th className="px-3 py-2 text-left text-xs">Cód</th>
              <th className="px-3 py-2 text-left text-xs">Qtde</th>
              <th className="px-3 py-2 text-left text-xs">Preço</th>
              <th className="px-3 py-2 text-left text-xs">Desc %</th>
              <th className="px-3 py-2 text-right text-xs">Total</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(it => (
              <tr key={it.id}>
                <td className="px-3 py-2">
                  <input
                    className="w-full border rounded px-2 py-1"
                    defaultValue={it.descricao}
                    onBlur={e => os.updateItem(it.id, { descricao: e.target.value }).then(onChanged)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full border rounded px-2 py-1"
                    defaultValue={it.codigo ?? ''}
                    onBlur={e => os.updateItem(it.id, { codigo: e.target.value }).then(onChanged)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full border rounded px-2 py-1"
                    defaultValue={it.quantidade}
                    onBlur={e => os.updateItem(it.id, { quantidade: e.target.value }).then(onChanged)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full border rounded px-2 py-1"
                    defaultValue={it.preco}
                    onBlur={e => os.updateItem(it.id, { preco: e.target.value }).then(onChanged)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className="w-full border rounded px-2 py-1"
                    defaultValue={it.desconto_pct}
                    onBlur={e => os.updateItem(it.id, { desconto_pct: e.target.value }).then(onChanged)}
                  />
                </td>
                <td className="px-3 py-2 text-right">{Number(it.total || 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  <button className="text-red-600" onClick={() => os.deleteItem(it.id).then(() => onRemoved(it.id))}>
                    remover
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-400" colSpan={7}>
                  Nenhum item
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-right text-sm text-gray-700">
        <span className="font-medium">Total serviços:</span> R$ {totalItens.toFixed(2)}
      </div>
    </div>
  );
}

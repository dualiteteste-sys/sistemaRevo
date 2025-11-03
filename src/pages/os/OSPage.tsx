// src/pages/os/OSPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import * as api from '@/services/os';
import * as osStatus from '@/services/osStatus';
import OSItemsEditor from '@/components/os/OSItemsEditor';
import ClientAutocomplete from '@/components/common/ClientAutocomplete';

type FormState = Partial<api.OS>;

export default function OSPage() {
  const [rows, setRows] = useState<api.OS[]>([]);
  const [loading, setLoading] = useState(true);

  const [isOpen, setOpen] = useState(false);
  const [editing, setEditing] = useState<api.OS | null>(null);
  const [items, setItems] = useState<api.OSItem[]>([]);
  const [form, setForm] = useState<FormState>({ status: 'orcamento', desconto_valor: '0' });

  const totalItens = useMemo(() => Number(editing?.total_itens ?? '0'), [editing]);
  const totalGeral = useMemo(() => Number(editing?.total_geral ?? '0'), [editing]);

  async function reload() {
    setLoading(true);
    try {
      const data = await api.listOS({ limit: 50 });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ status: 'orcamento', desconto_valor: '0' });
    setItems([]);
    setOpen(true);
  }

  async function openEdit(row: api.OS) {
    const os = await api.getOS(row.id);
    setEditing(os);
    setForm(os);
    try {
      const its = await api.listOSItems(row.id);
      setItems(its);
    } catch (e) {
      console.error('[RPC][ERROR] list_os_items_for_current_user', e);
      setItems([]);
    }
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const updated = await api.updateOS(editing.id, form);
      setEditing(updated);
    } else {
      const created = await api.createOS(form);
      setEditing(created);
      setItems([]);
    }
    await reload();
  }

  async function handleDelete(row: api.OS) {
    if (!confirm('Remover esta OS?')) return;
    await api.deleteOS(row.id);
    await reload();
  }

  async function handleClone(row: api.OS) {
    if (!confirm(`Clonar OS #${row.numero}?`)) return;
    const cloned = await api.cloneOS(row.id, {});
    await reload();
    await openEdit(cloned);
  }

  async function refreshHeader(osId: string) {
    const fresh = await api.getOS(osId);
    setEditing(fresh);
  }

  async function changeStatus(next: 'aberta'|'concluida'|'cancelada') {
    if (!editing) return;
    try {
      const updated = await osStatus.setStatus(editing.id, next);
      setEditing(updated);
      await reload();
    } catch (e: any) {
      alert(e?.message || 'Falha ao mudar status');
      console.error(e);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Ordem de Serviço</h1>
        <button className="px-4 py-2 rounded text-white bg-blue-600" onClick={openCreate}>Nova OS</button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs">Número</th>
                <th className="px-3 py-2 text-left text-xs">Cliente</th>
                <th className="px-3 py-2 text-left text-xs">Status</th>
                <th className="px-3 py-2 text-left text-xs">Descrição</th>
                <th className="px-3 py-2 text-right text-xs">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2">{r.numero}</td>
                  <td className="px-3 py-2">{r.cliente_id ?? '—'}</td>
                  <td className="px-3 py-2">{r.status}</td>
                  <td className="px-3 py-2">{r.descricao ?? '—'}</td>
                  <td className="px-3 py-2 text-right">R$ {Number(r.total_geral || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-3 justify-end">
                      <button className="text-blue-600" onClick={() => openEdit(r)}>editar</button>
                      <button className="text-amber-600" onClick={() => handleClone(r)}>clonar</button>
                      <button className="text-red-600" onClick={() => handleDelete(r)}>remover</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-gray-400" colSpan={6}>
                    Nenhuma OS encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl p-0 overflow-hidden">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  {editing ? `Ordem de Serviço — Nº ${editing.numero}` : 'Nova OS'}
                </h2>
                {editing && (
                  <span className="px-2 py-1 rounded text-xs border bg-gray-50">
                    Status: <strong>{editing.status}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Botões de status (só quando editando) */}
                {editing?.status === 'orcamento' && (
                  <>
                    <button type="button" className="px-3 py-1 rounded border" onClick={() => changeStatus('aberta')}>
                      Converter para Aberta
                    </button>
                    <button type="button" className="px-3 py-1 rounded border" onClick={() => changeStatus('cancelada')}>
                      Cancelar
                    </button>
                  </>
                )}
                {editing?.status === 'aberta' && (
                  <>
                    <button type="button" className="px-3 py-1 rounded border" onClick={() => changeStatus('concluida')}>
                      Concluir
                    </button>
                    <button type="button" className="px-3 py-1 rounded border" onClick={() => changeStatus('cancelada')}>
                      Cancelar
                    </button>
                  </>
                )}
                <button type="button" className="px-3 py-1 border rounded" onClick={() => setOpen(false)}>Fechar</button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* Ordem de Serviço */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Ordem de Serviço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Número</label>
                    <input className="w-full border rounded px-3 py-2 bg-gray-100" value={editing ? String(editing.numero) : '—'} disabled />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1">Cliente</label>
                    <ClientAutocomplete
                      value={(form.cliente_id as string) ?? null}
                      onChange={(id) => setForm(f => ({ ...f, cliente_id: id ?? '' }))}
                      placeholder="Pesquise pelas iniciais do nome, CPF/CNPJ"
                    />
                    <div className="text-xs text-blue-600 mt-1">dados do cliente</div>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Descrição do serviço</label>
                    <textarea className="w-full border rounded px-3 py-2 min-h-[90px]"
                      value={form.descricao ?? ''} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}/>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm mb-1">Considerações finais</label>
                    <textarea className="w-full border rounded px-3 py-2 min-h-[80px]"
                      value={form.consideracoes_finais ?? ''} onChange={e => setForm(f => ({ ...f, consideracoes_finais: e.target.value }))}/>
                  </div>
                </div>
              </section>

              {/* Serviços */}
              {editing && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Serviços</h3>
                  <OSItemsEditor
                    osId={editing.id}
                    items={items}
                    onAdded={async () => { setItems(await api.listOSItems(editing!.id)); await refreshHeader(editing!.id); }}
                    onChanged={async () => { setItems(await api.listOSItems(editing!.id)); await refreshHeader(editing!.id); }}
                    onRemoved={async () => { setItems(await api.listOSItems(editing!.id)); await refreshHeader(editing!.id); }}
                  />
                </section>
              )}

              {/* Detalhes */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Detalhes da ordem de serviço</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Data de início</label>
                    <input type="date" className="w-full border rounded px-3 py-2"
                      value={form.data_inicio ?? ''} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Data prevista</label>
                    <input type="date" className="w-full border rounded px-3 py-2"
                      value={form.data_prevista ?? ''} onChange={e => setForm(f => ({ ...f, data_prevista: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Hora</label>
                    <input type="time" className="w-full border rounded px-3 py-2"
                      value={form.hora ?? ''} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Data de conclusão</label>
                    <input type="date" className="w-full border rounded px-3 py-2"
                      value={form.data_conclusao ?? ''} onChange={e => setForm(f => ({ ...f, data_conclusao: e.target.value }))}/>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Total serviços</label>
                    <input className="w-full border rounded px-3 py-2 bg-gray-100" value={`R$ ${totalItens.toFixed(2)}`} disabled />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Desconto</label>
                    <input className="w-full border rounded px-3 py-2" placeholder="Ex.: 3,00"
                      value={form.desconto_valor ?? '0'} onChange={e => setForm(f => ({ ...f, desconto_valor: e.target.value }))}/>
                    <div className="text-xs text-gray-500 mt-1">(Ex: 3,00 ou 10%)</div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Vendedor</label>
                    <input className="w-full border rounded px-3 py-2"
                      value={form.vendedor ?? ''} onChange={e => setForm(f => ({ ...f, vendedor: e.target.value }))}/>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Técnico</label>
                    <input className="w-full border rounded px-3 py-2"
                      value={form.tecnico ?? ''} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))}/>
                  </div>

                  <div className="md:col-span-4 flex items-center justify-end gap-10 text-sm mt-2">
                    <div><span className="text-gray-500">Total geral:</span> <span className="font-semibold">R$ {totalGeral.toFixed(2)}</span></div>
                  </div>
                </div>
              </section>

              {/* Pagamento */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><label className="block text-sm mb-1">Forma de recebimento</label>
                    <input className="w-full border rounded px-3 py-2"
                      value={form.forma_recebimento ?? ''} onChange={e => setForm(f => ({ ...f, forma_recebimento: e.target.value }))}/>
                  </div>
                  <div><label className="block text-sm mb-1">Meio</label>
                    <input className="w-full border rounded px-3 py-2"
                      value={form.meio ?? ''} onChange={e => setForm(f => ({ ...f, meio: e.target.value }))}/>
                  </div>
                  <div><label className="block text-sm mb-1">Conta bancária</label>
                    <input className="w-full border rounded px-3 py-2"
                      value={form.conta_bancaria ?? ''} onChange={e => setForm(f => ({ ...f, conta_bancaria: e.target.value }))}/>
                  </div>
                  <div><label className="block text-sm mb-1">Categoria</label>
                    <input className="w-full border rounded px-3 py-2"
                      value={form.categoria_financeira ?? ''} onChange={e => setForm(f => ({ ...f, categoria_financeira: e.target.value }))}/>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm mb-1">Condição de pagamento</label>
                    <div className="flex gap-2">
                      <input className="flex-1 border rounded px-3 py-2" placeholder="Ex: 30 60, 3x ou 15 +2x"
                        value={form.condicao_pagamento ?? ''} onChange={e => setForm(f => ({ ...f, condicao_pagamento: e.target.value }))}/>
                      <button type="button" className="px-3 py-2 border rounded">gerar parcelas</button>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Exemplos: 30 60, 3x ou 15 +2x</div>
                  </div>
                </div>
              </section>

              {/* Dados adicionais */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Dados adicionais</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Anexos</label>
                    <div className="flex items-center gap-3">
                      <button type="button" className="px-3 py-2 border rounded">procurar arquivo</button>
                      <span className="text-xs text-gray-500">O tamanho do arquivo não deve ultrapassar 2 MB</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Marcadores</label>
                    <input className="w-full border rounded px-3 py-2" placeholder="Separados por vírgula ou tab"
                      value={(form.marcadores as unknown as string) ?? ''} onChange={e => setForm(f => ({ ...f, marcadores: e.target.value as unknown as string[] }))}/>
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <button type="button" className="px-4 py-2 border rounded" onClick={() => setOpen(false)}>Fechar</button>
                <button type="submit" className="px-4 py-2 rounded text-white bg-blue-600">{editing ? 'Salvar' : 'Criar OS'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

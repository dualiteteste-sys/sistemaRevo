// src/services/os.ts
import { callRpc } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

export type OSStatus = 'orcamento' | 'aberta' | 'concluida' | 'cancelada';

export type OS = {
  id: string;
  empresa_id: string;
  numero: number;
  cliente_id: string | null;
  status: OSStatus;
  descricao: string | null;
  consideracoes_finais: string | null;
  data_inicio: string | null;
  data_prevista: string | null;
  hora: string | null;
  data_conclusao: string | null;
  total_itens: string;
  desconto_valor: string;
  total_geral: string;
  vendedor: string | null;
  comissao_percentual: string | null;
  comissao_valor: string | null;
  tecnico: string | null;
  orcar: boolean;
  forma_recebimento: string | null;
  meio: string | null;
  conta_bancaria: string | null;
  categoria_financeira: string | null;
  condicao_pagamento: string | null;
  observacoes: string | null;
  observacoes_internas: string | null;
  anexos: string[] | null;
  marcadores: string[] | null;
  created_at: string;
  updated_at: string;
};

export type OSItem = {
  id: string;
  empresa_id: string;
  ordem_servico_id: string;
  servico_id: string | null;
  descricao: string;
  codigo: string | null;
  quantidade: string;
  preco: string;
  desconto_pct: string;
  total: string;
  orcar: boolean;
  created_at: string;
  updated_at: string;
};

export type ServiceLite = {
  id: string;
  descricao: string;
  codigo: string | null;
  preco_venda: string | number | null;
  unidade: string | null;
};

// -------- OS (header) --------
export async function listOS(params?: {
  search?: string | null;
  status?: OSStatus | null;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}): Promise<OS[]> {
  const p = {
    p_search: params?.search ?? null,
    p_status: params?.status ?? null,
    p_limit: params?.limit ?? 50,
    p_offset: params?.offset ?? 0,
    p_order_by: params?.orderBy ?? 'numero',
    p_order_dir: params?.orderDir ?? 'desc',
  };
  console.log('[RPC] list_os_for_current_user', p);
  return callRpc<OS[]>('list_os_for_current_user', p);
}

export async function getOS(id: string): Promise<OS> {
  console.log('[RPC] get_os_by_id_for_current_user', id);
  return callRpc<OS>('get_os_by_id_for_current_user', { p_id: id });
}

export async function createOS(payload: Partial<OS>): Promise<OS> {
  console.log('[RPC] [CREATE_*] create_os_for_current_user', payload);
  return callRpc<OS>('create_os_for_current_user', { payload });
}

export async function updateOS(id: string, payload: Partial<OS>): Promise<OS> {
  console.log('[RPC] update_os_for_current_user', id, payload);
  return callRpc<OS>('update_os_for_current_user', { p_id: id, payload });
}

export async function deleteOS(id: string): Promise<void> {
  console.log('[RPC] delete_os_for_current_user', id);
  return callRpc<void>('delete_os_for_current_user', { p_id: id });
}

export async function cloneOS(osId: string, overrides?: Partial<OS>): Promise<OS> {
  const payload = overrides ?? {};
  console.log('[RPC] [OS][CLONE] create_os_clone_for_current_user', osId, payload);
  return callRpc<OS>('create_os_clone_for_current_user', { p_source_os_id: osId, p_overrides: payload });
}

// -------- Itens --------
export async function listOSItems(osId: string): Promise<OSItem[]> {
  console.log('[RPC] [OS_ITEM][LIST] list_os_items_for_current_user', osId);
  return callRpc<OSItem[]>('list_os_items_for_current_user', { p_os_id: osId });
}

export async function addItem(osId: string, payload: Partial<OSItem>): Promise<OSItem> {
  console.log('[RPC] [OS_ITEM][ADD] add_os_item_for_current_user', osId, payload);
  return callRpc<OSItem>('add_os_item_for_current_user', { p_os_id: osId, payload });
}

export async function updateItem(itemId: string, payload: Partial<OSItem>): Promise<OSItem> {
  console.log('[RPC] [OS_ITEM][UPDATE] update_os_item_for_current_user', itemId, payload);
  return callRpc<OSItem>('update_os_item_for_current_user', { p_item_id: itemId, payload });
}

export async function deleteItem(itemId: string): Promise<void> {
  console.log('[RPC] [OS_ITEM][DELETE] delete_os_item_for_current_user', itemId);
  return callRpc<void>('delete_os_item_for_current_user', { p_item_id: itemId });
}

// -------- Autocomplete Serviços --------
export async function searchServices(q: string, limit = 20): Promise<ServiceLite[]> {
  const p = { p_search: q ?? null, p_limit: limit };
  console.log('[RPC] search_services_for_current_user', p);
  return callRpc<ServiceLite[]>('search_services_for_current_user', p);
}

// --- adicione abaixo das outras exports ---
export type ClientHit = { id: string; label: string; nome: string; documento: string | null };

// Busca clientes (autocomplete). search com ≥2 chars; limit default 20.
export async function searchClients(search: string, limit = 20): Promise<ClientHit[]> {
  const q = (search ?? '').trim();
  if (q.length < 2) {
    return [];
  }
  try {
    const data = await callRpc<ClientHit[]>('search_clients_for_current_user', {
      p_search: q,
      p_limit: limit,
    });
    return data ?? [];
  } catch (error) {
    console.error('[RPC][ERROR] search_clients_for_current_user', error);
    return [];
  }
}

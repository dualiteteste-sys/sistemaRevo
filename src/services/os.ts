import { callRpc } from '@/lib/api';
import { Database } from '@/types/database.types';

// --- Placeholder Types for missing DB schema ---
export type status_os = "orcamento" | "aberta" | "concluida" | "cancelada";

export type OrdemServico = {
    id: string;
    empresa_id: string;
    numero: number;
    cliente_id: string | null;
    descricao: string | null;
    status: status_os;
    data_inicio: string | null;
    data_prevista: string | null;
    hora: string | null;
    total_itens: number;
    desconto_valor: number;
    total_geral: number;
    forma_recebimento: string | null;
    condicao_pagamento: string | null;
    observacoes: string | null;
    observacoes_internas: string | null;
    created_at: string;
    updated_at: string;
};

export type OrdemServicoItem = {
    id: string;
    ordem_servico_id: string;
    empresa_id: string;
    servico_id: string | null;
    produto_id: string | null;
    descricao: string;
    codigo: string | null;
    quantidade: number;
    preco: number;
    desconto_pct: number;
    total: number;
    orcar: boolean;
    created_at: string;
    updated_at: string;
};
// --- End Placeholder Types ---

export type OrdemServicoDetails = OrdemServico & {
  itens: OrdemServicoItem[];
};

export type OrdemServicoPayload = Partial<OrdemServico>;
export type OrdemServicoItemPayload = Partial<OrdemServicoItem>;

export type ServiceLite = {
  id: string;
  descricao: string;
  codigo: string | null;
  preco_venda: string | number | null;
  unidade: string | null;
};

export type ProductLite = {
  id: string;
  descricao: string;
  codigo: string | null;
  preco_venda: number | null;
  unidade: string | null;
};

export type KanbanOs = {
    id: string;
    numero: bigint;
    descricao: string;
    status: status_os;
    data_prevista: string | null;
    cliente_nome: string | null;
};

// --- OS Header Functions ---

export async function listOs(params: {
  search?: string | null;
  status?: status_os | null;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}) {
  const p = {
    p_search: params.search ?? null,
    p_status: params.status ? [params.status] : null,
    p_limit: params.limit ?? 50,
    p_offset: params.offset ?? 0,
    p_order_by: params.orderBy ?? 'numero',
    p_order_dir: params.orderDir ?? 'desc',
  };
  return callRpc<OrdemServico[]>('list_os_for_current_user', p);
}

export async function getOs(id: string): Promise<OrdemServico> {
  return callRpc<OrdemServico>('get_os_by_id_for_current_user', { p_id: id });
}

export async function deleteOs(id: string): Promise<void> {
  return callRpc('delete_os_for_current_user', { p_id: id });
}

// --- OS Items Functions ---

export async function listOSItems(osId: string): Promise<OrdemServicoItem[]> {
  return callRpc<OrdemServicoItem[]>('list_os_items_for_current_user', { p_os_id: osId });
}

export async function addServiceItem(osId: string, servicoId: string): Promise<OrdemServicoItem> {
  return callRpc<OrdemServicoItem>('add_service_item_to_os_for_current_user', {
    p_os_id: osId,
    p_servico_id: servicoId,
  });
}

export async function addProductItem(osId: string, produtoId: string): Promise<OrdemServicoItem> {
  return callRpc<OrdemServicoItem>('add_product_item_to_os_for_current_user', {
    p_os_id: osId,
    p_produto_id: produtoId,
  });
}

// --- Autocomplete Functions ---

export async function searchServices(q: string, limit = 10): Promise<ServiceLite[]> {
  return callRpc<ServiceLite[]>('search_services_for_current_user', { p_search: q, p_limit: limit });
}

export async function searchProducts(q: string, limit = 20) {
  return callRpc<ProductLite[]>("search_products_for_current_user", { p_search: q, p_limit: limit });
}


// --- Composite Functions ---

export async function getOsDetails(id: string): Promise<OrdemServicoDetails> {
  const osHeader = await getOs(id);
  const osItems = await listOSItems(id);
  return { ...osHeader, itens: osItems };
}

export async function saveOs(osData: Partial<OrdemServicoDetails>): Promise<OrdemServicoDetails> {
  let savedOsHeader: OrdemServico;
  if (osData.id) {
    savedOsHeader = await callRpc<OrdemServico>('update_os_for_current_user', { p_id: osData.id, payload: osData });
  } else {
    savedOsHeader = await callRpc<OrdemServico>('create_os_for_current_user', { payload: osData });
  }
  return getOsDetails(savedOsHeader.id);
}

export async function seedDefaultOs(): Promise<OrdemServico[]> {
    console.log('[RPC] seed_os_for_current_user');
    return callRpc<OrdemServico[]>('seed_os_for_current_user');
}

// --- Kanban Functions ---
export async function listKanbanOs(): Promise<KanbanOs[]> {
    return callRpc<KanbanOs[]>('list_kanban_os');
}

export async function updateOsDataPrevista(osId: string, newDate: string | null): Promise<void> {
    return callRpc('update_os_data_prevista', { p_os_id: osId, p_new_date: newDate });
}


// --- Exports for compatibility ---
export async function deleteOsItem(itemId: string) {
  return callRpc<void>("delete_os_item_for_current_user", { p_item_id: itemId });
}

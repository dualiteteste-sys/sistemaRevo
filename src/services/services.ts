// src/services/services.ts
import { callRpc } from '@/lib/api';

export type Service = {
  id: string;
  empresa_id: string;
  descricao: string;
  codigo: string | null;
  preco_venda: string | number | null;
  unidade: string | null;
  status: 'ativo' | 'inativo';
  codigo_servico: string | null;
  nbs: string | null;
  nbs_ibpt_required: boolean | null;
  descricao_complementar: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export async function listServices(params?: {
  search?: string; limit?: number; offset?: number;
  orderBy?: string; orderDir?: 'asc'|'desc';
}): Promise<Service[]> {
  const { search = null, limit = 50, offset = 0, orderBy = 'descricao', orderDir = 'asc' } = params || {};
  return callRpc<Service[]>('list_services_for_current_user', {
    p_search: search, p_limit: limit, p_offset: offset, p_order_by: orderBy, p_order_dir: orderDir
  });
}

export async function getService(id: string): Promise<Service> {
  return callRpc<Service>('get_service_by_id_for_current_user', { p_id: id });
}

export async function createService(payload: Partial<Service>): Promise<Service> {
  console.log('[RPC] [CREATE_*] create_service_for_current_user', payload);
  return callRpc<Service>('create_service_for_current_user', { payload });
}

export async function updateService(id: string, payload: Partial<Service>): Promise<Service> {
  console.log('[RPC] update_service_for_current_user', id, payload);
  return callRpc<Service>('update_service_for_current_user', { p_id: id, payload });
}

export async function deleteService(id: string): Promise<void> {
  console.log('[RPC] delete_service_for_current_user', id);
  return callRpc<void>('delete_service_for_current_user', { p_id: id });
}

export async function cloneService(id: string, overrides?: { descricao?: string; codigo?: string }): Promise<Service> {
  console.log('[RPC] [CREATE_*] create_service_clone_for_current_user', id, overrides);
  return callRpc<Service>('create_service_clone_for_current_user', {
    p_source_service_id: id, p_overrides: overrides || {}
  });
}

export async function seedDefaultServices(): Promise<Service[]> {
  console.log('[RPC] seed_services_for_current_user');
  return callRpc<Service[]>('seed_services_for_current_user');
}

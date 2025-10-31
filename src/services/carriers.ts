import supabase from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

export type Carrier = Database['public']['Tables']['transportadoras']['Row'];
export type CarrierListItem = {
    id: string;
    nome_razao_social: string;
    cnpj: string | null;
    inscr_estadual: string | null;
    status: 'ativa' | 'inativa';
};
export type CarrierPayload = Partial<Carrier>;

/**
 * Busca uma lista paginada e filtrada de transportadoras.
 */
export async function getCarriers(options: {
  page: number;
  pageSize: number;
  searchTerm: string;
  filterStatus: string | null;
  sortBy: { column: keyof CarrierListItem; ascending: boolean };
}): Promise<{ data: CarrierListItem[]; count: number }> {
  const { page, pageSize, searchTerm, filterStatus, sortBy } = options;
  const offset = (page - 1) * pageSize;
  const orderString = `${sortBy.column} ${sortBy.ascending ? 'asc' : 'desc'}`;

  const { data: countData, error: countError } = await supabase.rpc('count_carriers', {
    p_q: searchTerm || null,
    p_status: (filterStatus as 'ativa' | 'inativa') || null,
  });

  if (countError) {
    console.error('[SERVICE][COUNT_CARRIERS]', countError);
    throw new Error('Não foi possível contar as transportadoras.');
  }

  const { data, error } = await supabase.rpc('list_carriers', {
    p_limit: pageSize,
    p_offset: offset,
    p_q: searchTerm || null,
    p_status: (filterStatus as 'ativa' | 'inativa') || null,
    p_order: orderString,
  });

  if (error) {
    console.error('[SERVICE][LIST_CARRIERS]', error);
    throw new Error('Não foi possível listar as transportadoras.');
  }

  return { data: (data as CarrierListItem[]) ?? [], count: countData ?? 0 };
}

/**
 * Busca os detalhes completos de uma transportadora.
 */
export async function getCarrierDetails(id: string): Promise<Carrier | null> {
  const { data, error } = await supabase.rpc('get_carrier_details', { p_id: id });
  if (error) {
    console.error('[SERVICE][GET_CARRIER_DETAILS]', error);
    throw new Error('Erro ao buscar detalhes da transportadora.');
  }
  return data as Carrier | null;
}

/**
 * Cria ou atualiza uma transportadora.
 */
export async function saveCarrier(payload: CarrierPayload): Promise<Carrier> {
  const { data, error } = await supabase.rpc('create_update_carrier', { p_payload: payload });
  if (error) {
    console.error('[SERVICE][SAVE_CARRIER]', error);
    if (error.message.includes('ux_transportadoras_empresa_cnpj')) {
        throw new Error('Já existe uma transportadora com este CNPJ.');
    }
    throw new Error(error.message || 'Erro ao salvar a transportadora.');
  }
  return data as Carrier;
}

/**
 * Exclui uma transportadora.
 */
export async function deleteCarrier(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_carrier', { p_id: id });
  if (error) {
    console.error('[SERVICE][DELETE_CARRIER]', error);
    throw new Error(error.message || 'Erro ao excluir a transportadora.');
  }
}

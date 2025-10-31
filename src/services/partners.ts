import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

export type PartnerListItem = {
  id: string;
  nome: string;
  tipo: Database['public']['Enums']['pessoa_tipo'];
  doc_unico: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type Pessoa = Database['public']['Tables']['pessoas']['Row'];
export type PartnerDetails = Pessoa & {
  enderecos: any[]; // Always empty
  contatos: any[]; // Always empty
};

export type PartnerPessoa = Partial<Pessoa>;

export type PartnerPayload = {
  pessoa: PartnerPessoa;
};

export async function savePartner(payload: PartnerPayload): Promise<PartnerDetails> {
  console.log('[SERVICE][SAVE_PARTNER]', payload);
  const { data, error } = await supabase.rpc('create_update_partner', {p_payload: payload});
  if (error) {
    console.error('[SERVICE][SAVE_PARTNER][ERROR]', error);
    throw error;
  }
  return data;
}


export async function getPartners(options: {
  page: number;
  pageSize: number;
  searchTerm: string;
  filterType: string | null;
  sortBy: { column: keyof PartnerListItem; ascending: boolean };
}): Promise<{ data: PartnerListItem[]; count: number }> {
  const { page, pageSize, searchTerm, filterType, sortBy } = options;
  const offset = (page - 1) * pageSize;
  const orderString = `${sortBy.column} ${sortBy.ascending ? 'asc' : 'desc'}`;

  const { data: countData, error: countError } = await supabase.rpc('count_partners', {
    p_q: searchTerm || null,
    p_tipo: (filterType as Database['public']['Enums']['pessoa_tipo']) || null,
  });

  if (countError) {
    console.error('[SERVICE][COUNT_PARTNERS]', countError);
    throw new Error('Não foi possível contar os registros.');
  }

  const { data, error } = await supabase.rpc('list_partners', {
    p_limit: pageSize,
    p_offset: offset,
    p_q: searchTerm || null,
    p_tipo: (filterType as Database['public']['Enums']['pessoa_tipo']) || null,
    p_order: orderString,
  });

  if (error) {
    console.error('[SERVICE][LIST_PARTNERS]', error);
    throw new Error('Não foi possível listar os registros.');
  }

  return { data: (data as PartnerListItem[]) ?? [], count: countData ?? 0 };
}

export async function getPartnerDetails(id: string): Promise<PartnerDetails | null> {
  const { data, error } = await supabase.rpc('get_partner_details', { p_id: id });
  if (error) {
    console.error('[SERVICE][GET_PARTNER_DETAILS]', error);
    throw new Error('Erro ao buscar detalhes do registro.');
  }
  return data as PartnerDetails | null;
}

export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_partner', { p_id: id });
  if (error) {
    console.error('[SERVICE][DELETE_PARTNER]', error);
    throw new Error(error.message || 'Erro ao excluir o registro.');
  }
}

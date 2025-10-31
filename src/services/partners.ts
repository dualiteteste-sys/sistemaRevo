// src/services/partners.ts
// Revo ERP — Partners Service
// Regras: usar a única instância autenticada do Supabase; CRUD somente via RPC.
// Logs: [SERVICE][SAVE_PARTNER]

import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

// Tipos para a lista de parceiros, com base no retorno da RPC `list_partners`
export type PartnerListItem = {
  id: string;
  nome: string;
  tipo: Database['public']['Enums']['pessoa_tipo'];
  doc_unico: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
};

// Tipos para os detalhes completos de um parceiro
export type Pessoa = Database['public']['Tables']['pessoas']['Row'];
export type Endereco = Database['public']['Tables']['pessoa_enderecos']['Row'];
export type Contato = Database['public']['Tables']['pessoa_contatos']['Row'];

export type PartnerDetails = Pessoa & {
  enderecos: Endereco[];
  contatos: Contato[];
};

export type PartnerPessoa = {
  id?: string;
  tipo?: 'cliente' | 'fornecedor' | 'ambos' | string;
  nome: string;
  doc_unico?: string | null;
  email?: string | null;
  telefone?: string | null;
  inscr_estadual?: string | null;
  isento_ie?: boolean | null;
  inscr_municipal?: string | null;
  observacoes?: string | null;

  // novos campos do schema
  tipo_pessoa?: 'fisica' | 'juridica' | 'estrangeiro' | null;
  fantasia?: string | null;
  codigo_externo?: string | null;
  contribuinte_icms?: '1' | '2' | '9' | null;
  contato_tags?: string[] | string | null; // pode vir string; vamos normalizar p/ string[]
  
  // adicionados no passo 1
  celular?: string | null;
  site?: string | null;
  rg?: string | null;
  carteira_habilitacao?: string | null;
};

export type PartnerPayload = {
  pessoa: PartnerPessoa;
  enderecos?: Partial<Endereco>[];
  contatos?: Partial<Contato>[];
};

// ---------- Helpers de normalização ----------

function normalizeContatoTags(val: PartnerPessoa['contato_tags']): string[] | undefined {
  if (val == null) return undefined; // omitido => não altera no UPDATE
  if (Array.isArray(val)) {
    const arr = val.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  if (typeof val === 'string') {
    const arr = val.split(',').map((s) => s.trim()).filter(Boolean);
    return arr.length ? arr : undefined;
  }
  // qualquer outro tipo => omite
  return undefined;
}

function onlyDigits(s?: string | null) {
  if (!s) return s ?? null;
  const d = s.replace(/\D+/g, '');
  return d.length ? d : null;
}

function upperOrNull(s?: string | null) {
  if (!s) return s ?? null;
  const t = s.trim();
  return t ? t.toUpperCase() : null;
}

function trimOrNull(s?: string | null) {
  if (!s) return s ?? null;
  const t = s.trim();
  return t || null;
}

function normalizeEnderecoPrincipal(form: any): Endereco | null {
  const cep = onlyDigits(form?.cep);
  const uf = upperOrNull(form?.uf);
  const cidade = trimOrNull(form?.cidade);
  const bairro = trimOrNull(form?.bairro);
  const logradouro = trimOrNull(form?.endereco ?? form?.logradouro);
  const numero = trimOrNull(form?.numero);
  const complemento = trimOrNull(form?.complemento);
  const pais = trimOrNull(form?.pais) ?? 'BRASIL';

  return {
    tipo_endereco: 'principal',
    cep,
    uf,
    cidade,
    bairro,
    logradouro,
    numero,
    complemento,
    pais,
  };
}

function normalizeArray<T>(val: any): T[] | undefined {
  if (val == null) return undefined;
  if (Array.isArray(val)) return val as T[];
  return undefined;
}

// ---------- API ----------

export async function savePartner(input: PartnerPayload): Promise<PartnerDetails> {
  const pessoa = { ...input.pessoa };

  const contato_tags = normalizeContatoTags(pessoa.contato_tags);
  if (contato_tags) {
    pessoa.contato_tags = contato_tags;
  } else {
    delete (pessoa as any).contato_tags;
  }

  const enderecos = normalizeArray<Endereco>(input.enderecos);
  const contatos  = normalizeArray<Contato>(input.contatos);

  const payload: any = { pessoa };
  if (enderecos !== undefined) payload.enderecos = enderecos;
  if (contatos  !== undefined) payload.contatos  = contatos;

  console.log('[SERVICE][SAVE_PARTNER]', payload);

  const { data, error } = await supabase.rpc('create_update_partner', { p_payload: payload });
  if (error) {
    const enriched = Object.assign(new Error(error.message), { code: error.code, details: error.details, hint: error.hint });
    console.error('[SERVICE][SAVE_PARTNER][ERROR]', enriched);
    throw enriched;
  }
  return data as PartnerDetails;
}

/**
 * savePartnerFromForm
 * Adapta valores do formulário (planos) para o payload esperado pela RPC.
 */
export async function savePartnerFromForm(formValues: any): Promise<PartnerDetails> {
  const pessoa: PartnerPessoa = {
    id: formValues?.id ?? undefined,
    tipo: formValues?.tipo ?? undefined,
    nome: formValues?.nome ?? '',
    doc_unico: onlyDigits(formValues?.doc_unico),
    email: trimOrNull(formValues?.email),
    telefone: onlyDigits(formValues?.telefone),
    inscr_estadual: trimOrNull(formValues?.inscr_estadual),
    isento_ie: typeof formValues?.isento_ie === 'boolean' ? formValues.isento_ie : null,
    inscr_municipal: trimOrNull(formValues?.inscr_municipal),
    observacoes: trimOrNull(formValues?.observacoes),
    tipo_pessoa: formValues?.tipo_pessoa ?? null,
    fantasia: trimOrNull(formValues?.fantasia),
    codigo_externo: trimOrNull(formValues?.codigo_externo),
    contribuinte_icms: formValues?.contribuinte_icms ?? null,
    celular: onlyDigits(formValues?.celular),
    site: trimOrNull(formValues?.site),
    contato_tags: formValues?.contato_tags ?? null,
    rg: trimOrNull(formValues?.rg),
    carteira_habilitacao: trimOrNull(formValues?.carteira_habilitacao),
  };

  const enderecoPrincipal = normalizeEnderecoPrincipal(formValues);
  const enderecos = [enderecoPrincipal]; 
  const contatos  = Array.isArray(formValues?.contatos) ? formValues.contatos.map((c: any) => ({...c, telefone: onlyDigits(c.telefone)})) : undefined;

  return savePartner({
    pessoa,
    enderecos,
    contatos,
  });
}

/**
 * Busca uma lista paginada e filtrada de parceiros.
 */
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

/**
 * Busca os detalhes completos de um parceiro.
 */
export async function getPartnerDetails(id: string): Promise<PartnerDetails | null> {
  const { data, error } = await supabase.rpc('get_partner_details', { p_id: id });
  if (error) {
    console.error('[SERVICE][GET_PARTNER_DETAILS]', error);
    throw new Error('Erro ao buscar detalhes do registro.');
  }
  return data as PartnerDetails | null;
}

/**
 * Exclui um parceiro.
 */
export async function deletePartner(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_partner', { p_id: id });
  if (error) {
    console.error('[SERVICE][DELETE_PARTNER]', error);
    throw new Error(error.message || 'Erro ao excluir o registro.');
  }
}

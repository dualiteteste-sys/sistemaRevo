import supabase from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

// Type for the product list, now derived from the RPC's return type.
export type Product = {
  id: string;
  nome: string | null;
  sku: string | null;
  status: "ativo" | "inativo" | null;
  preco_venda: number | null;
  unidade: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// Type for the full product data, used in forms
export type FullProduct = Database['public']['Tables']['produtos']['Row'];

// Type for the payload sent to create/update functions
export type ProductPayload = Partial<FullProduct>;

/**
 * Fetches a paginated, sorted, and filtered list of products using RPCs.
 */
export async function getProducts(options: {
  page: number;
  pageSize: number;
  searchTerm: string;
  status: 'ativo' | 'inativo' | null;
  sortBy: { column: keyof Product; ascending: boolean };
}): Promise<{ data: Product[]; count: number }> {
  const { page, pageSize, searchTerm, status, sortBy } = options;

  const offset = (page - 1) * pageSize;
  const orderString = `${sortBy.column} ${sortBy.ascending ? 'asc' : 'desc'}`;

  // Call the count RPC
  const { data: countData, error: countError } = await supabase.rpc(
    'produtos_count_for_current_user',
    {
      p_q: searchTerm || null,
      p_status: status,
    }
  );

  if (countError) {
    console.error('[SERVICE] [COUNT_PRODUCTS_RPC] error:', countError);
    throw new Error('Não foi possível contar os produtos.');
  }

  const count = countData ?? 0;

  if (count === 0) {
    return { data: [], count: 0 };
  }
  
  // Call the list RPC
  const { data, error } = await supabase.rpc('produtos_list_for_current_user', {
    p_limit: pageSize,
    p_offset: offset,
    p_q: searchTerm || null,
    p_status: status,
    p_order: orderString,
  });

  if (error) {
    console.error('[SERVICE] [LIST_PRODUCTS_RPC] error:', error);
    throw new Error('Não foi possível listar os produtos.');
  }

  return { data: (data ?? []) as Product[], count };
}


/**
 * Fetches the full details of a single product for editing.
 * Returns null if it's a legacy product that can't be edited from the 'produtos' table.
 */
export async function getProductDetails(id: string): Promise<FullProduct | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Not found is expected for legacy products, so we don't throw, just return null.
    if (error.code !== 'PGRST116') {
      console.error('[SERVICE] [GET_PRODUCT_DETAILS] error:', error);
      throw new Error('Erro ao buscar detalhes do produto.');
    }
    return null;
  }
  return data as FullProduct;
}

/**
 * Creates or updates a product using the secure RPCs.
 */
export async function saveProduct(productData: ProductPayload, empresaId: string): Promise<FullProduct> {
  const payload = { ...productData, empresa_id: empresaId };

  if (payload.id) {
    // UPDATE
    const { id, ...patch } = payload;
    const { data, error } = await supabase.rpc('update_product_for_current_user', {
      p_id: id,
      patch: patch as any,
    });

    if (error) {
      console.error('[RPC] [UPDATE_PRODUCT] error:', error);
      throw new Error(error.message || 'Não foi possível atualizar o produto.');
    }
    return data as FullProduct;
  } else {
    // CREATE
    const { data, error } = await supabase.rpc('create_product_for_current_user', {
      payload: payload as any,
    });

    if (error) {
      console.error('[RPC] [CREATE_PRODUCT] error:', error);
      throw new Error(error.message || 'Não foi possível criar o produto.');
    }
    return data as FullProduct;
  }
}

/**
 * Deletes a product using the secure RPC.
 */
export async function deleteProductById(productId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_product_for_current_user', { p_id: productId });

  if (error) {
    console.error('[RPC] [DELETE_PRODUCT] error:', error);
    throw new Error('Não foi possível excluir o produto.');
  }
}

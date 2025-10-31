import supabase from '@/lib/supabaseClient';
import { Database } from '@/types/database.types';

export type Empresa = Database['public']['Tables']['empresas']['Row'];
export type EmpresaUpdate = Partial<Database['public']['Tables']['empresas']['Row']>;
export type ProvisionEmpresaInput = {
  razao_social: string;
  fantasia: string;
  email?: string | null;
};

const LOGO_BUCKET = 'company_logos';

/**
 * Atualiza os dados da empresa ativa usando uma RPC segura.
 */
export async function updateCompany(updateData: EmpresaUpdate): Promise<Empresa> {
  const { data, error } = await supabase.rpc('update_active_company', {
    p_patch: updateData,
  });

  if (error) {
    console.error('Error updating company via RPC:', error);
    throw new Error('Não foi possível atualizar os dados da empresa.');
  }
  // A RPC retorna um único objeto JSON que o cliente Supabase converte.
  return data as Empresa;
}

/**
 * Cria uma nova empresa para o usuário logado via RPC.
 */
export async function provisionCompany(input: ProvisionEmpresaInput): Promise<Empresa> {
  const { data: sessionRes } = await supabase.auth.getSession();
  if (!sessionRes?.session?.access_token) {
    throw new Error('NO_SESSION: usuário não autenticado.');
  }

  const { data, error } = await supabase.rpc('provision_empresa_for_current_user', {
    p_razao_social: input.razao_social,
    p_fantasia: input.fantasia,
    p_email: input.email ?? null,
  }).single();

  if (error) {
    console.error('[ONBOARD] RPC provision_empresa_for_current_user error', error);
    throw error;
  }

  return data as unknown as Empresa;
}

function sanitizeName(name: string) {
    return name
      .normalize('NFKD')
      .replace(/[^\w.\- ]+/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
}

/**
 * Faz o upload do logo da empresa.
 * @returns O caminho (key) do arquivo no bucket.
 */
export async function uploadCompanyLogo(empresaId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const sanitizedName = sanitizeName(file.name.replace(/\.[^/.]+$/, ""));
    const fileName = `${sanitizedName}-${Date.now()}.${fileExt}`;
    const filePath = `${empresaId}/${fileName}`;

    const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filePath, file, {
            upsert: true, // Substitui se já existir um com o mesmo nome
        });

    if (error) {
        console.error('Error uploading logo:', error);
        throw new Error('Falha ao enviar o logo.');
    }

    return filePath;
}

/**
 * Remove o logo da empresa do storage.
 */
export async function deleteCompanyLogo(logoUrl: string): Promise<void> {
    // Extrai o caminho do arquivo da URL completa
    const url = new URL(logoUrl);
    const path = url.pathname.split(`/${LOGO_BUCKET}/`)[1];

    if (!path) {
        console.warn("Could not extract path from logo URL:", logoUrl);
        return;
    }

    const { error } = await supabase.storage
        .from(LOGO_BUCKET)
        .remove([path]);

    if (error) {
        console.error('Error deleting logo:', error);
        throw new Error('Falha ao remover o logo.');
    }
}

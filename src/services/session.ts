import { callRpc } from "@/lib/api";

/**
 * Executa a RPC bootstrap_empresa_for_current_user para garantir:
 * - Se já há empresa ativa: retorna { empresa_id, status: 'already_active' }
 * - Se é membro de alguma: ativa uma existente: 'activated_existing'
 * - Caso contrário: cria, vincula e ativa: 'created_new'
 *
 * Observação: Deve ser chamada APÓS o usuário estar autenticado.
 */
export async function bootstrapEmpresaParaUsuarioAtual(opts?: {
  nome?: string | null;
  fantasia?: string | null;
}): Promise<{ empresa_id: string; status: string }> {
  try {
    const data = await callRpc<{ empresa_id: string; status: string }[]>("bootstrap_empresa_for_current_user", {
        p_nome: opts?.nome ?? null,
        p_fantasia: opts?.fantasia ?? null,
    });

    // A função retorna table(empresa_id uuid, status text); PostgREST entrega array
    // Garantimos um único objeto.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.empresa_id) {
      throw new Error("Falha ao bootstrapar empresa.");
    }

    console.log("[RPC][bootstrap_empresa_for_current_user][OK]", row);
    return { empresa_id: row.empresa_id, status: row.status };
  } catch (error) {
    console.error("[RPC][bootstrap_empresa_for_current_user][ERROR]", error);
    throw error;
  }
}

/**
 * whoami simples para debug/telemetria.
 * Lê a sessão e retorna o user id/email atuais.
 */
export async function whoAmI(): Promise<{ user_id: string | null; email: string | null }> {
    try {
        const data = await callRpc<{ user_id: string, email: string }>('whoami');
        return data;
    } catch (error) {
        console.error("[RPC][whoami][ERROR]", error);
        return { user_id: null, email: null };
    }
}

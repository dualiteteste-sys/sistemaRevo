import { supabase } from './supabase';

/**
 * Inicia o processo de checkout para um plano de assinatura.
 * @param empresaId - O ID da empresa que está assinando.
 * @param planSlug - O slug do plano (ex: "PRO").
 * @param cycle - O ciclo de faturamento ('monthly' ou 'yearly').
 */
export async function startCheckout(
  empresaId: string,
  planSlug: "START" | "PRO" | "MAX" | "ULTRA",
  cycle: "monthly" | "yearly"
) {
  const base = import.meta.env.VITE_FUNCTIONS_BASE_URL;
  if (!base || !base.startsWith("https://") || !base.includes(".functions.supabase.co")) {
    console.error("VITE_FUNCTIONS_BASE_URL inválida:", base);
    throw new Error("Config de endpoint das Edge Functions está inválida");
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Usuário não autenticado. Por favor, faça login para continuar.");
  }

  let res: Response;
  try {
    res = await fetch(`${base}/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ empresa_id: empresaId, plan_slug: planSlug, billing_cycle: cycle }),
    });
  } catch (e) {
    // Erro de rede / CORS
    throw new Error(`Falha de rede ou CORS ao chamar a função: ${(e as Error).message}`);
  }

  if (!res.ok) {
    let details = "";
    try {
      const errorBody = await res.json();
      details = JSON.stringify(errorBody);
    } catch {
      // O corpo do erro pode não ser JSON, então apenas ignore
    }
    throw new Error(`Erro da função (${res.status}): ${details || res.statusText}`);
  }

  const { url } = await res.json();
  if (!url) {
    throw new Error("Resposta da função não contém a URL do Stripe Checkout.");
  }

  window.location.href = url;
}

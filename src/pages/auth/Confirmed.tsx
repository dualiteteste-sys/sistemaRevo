import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * [/auth/confirmed] Consumidor do hash do Supabase
 * - Idempotente: se já logado, só redireciona
 * - Trata ausência de tokens e erros de sessão
 * - Limpa fragmento (#...) da URL
 * - Redireciona para onboarding (ex.: /empresa/criar) ou fallback
 */
export default function AuthConfirmed() {
  const [msg, setMsg] = useState("Processando confirmação de e-mail...");
  const [detail, setDetail] = useState<string | null>(null);

  const hashParams = useMemo(() => {
    const raw = window.location.hash.startsWith("#")
      ? window.location.hash.substring(1)
      : window.location.hash;
    return new URLSearchParams(raw);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        console.info("[AUTH] [/auth/confirmed] hash recebido:", window.location.hash);

        // Se já houver sessão válida, não precisa setar de novo.
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          console.info("[AUTH] sessão já existente, redirecionando...");
          return redirectAfterAuth();
        }

        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");
        const token_type = hashParams.get("token_type"); // geralmente "bearer"
        const type = hashParams.get("type");            // "signup" | "recovery" | etc.

        if (!access_token || !refresh_token) {
          console.warn("[AUTH] tokens ausentes no fragmento; enviando para login.");
          return goToLogin("missing_tokens");
        }

        // Seta a sessão no supabase-js v2
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          console.error("[AUTH] setSession falhou:", error);
          setMsg("Não foi possível autenticar.");
          setDetail(error.message ?? "Erro desconhecido");
          return goToLogin("set_session_failed");
        }

        console.info("[AUTH] setSession ok. user id:", data.session?.user?.id, "type:", type);

        // Limpa o fragmento para não manter tokens na URL/History
        try {
          window.history.replaceState(null, "", "/auth/confirmed");
        } catch {
          // se falhar, não é crítico
        }

        redirectAfterAuth();
      } catch (e: any) {
        console.error("[AUTH] exceção não tratada:", e);
        setMsg("Erro inesperado ao autenticar.");
        setDetail(String(e?.message ?? e));
        return goToLogin("unexpected_error");
      }
    };

    const redirectAfterAuth = async () => {
      try {
        // Preferência: se você salva o destino antes do login, respeite-o
        const intended = window.sessionStorage.getItem("postAuthRedirect") 
          || window.localStorage.getItem("postAuthRedirect");

        // Caso você salve o plano escolhido antes de criar a conta
        const planSlug = window.sessionStorage.getItem("planSlug") 
          || window.localStorage.getItem("planSlug");

        // Seu fluxo atual: primeiro login → criação de empresa
        const defaultOnboarding = "/app";

        const target =
          (intended && safePath(intended)) ||
          (planSlug && safePath(`/assinar/${planSlug}`)) ||
          defaultOnboarding;

        console.info("[AUTH] redirecionando para:", target);
        window.location.assign(target);
      } catch {
        window.location.assign("/app");
      }
    };

    const goToLogin = (reason: string) => {
      const url = new URL(window.location.origin + "/");
      url.searchParams.set("action", "login");
      url.searchParams.set("reason", reason);
      window.location.assign(url.toString());
    };

    const safePath = (p: string) => {
      // Permite apenas paths internos; evita open-redirect
      try {
        const u = new URL(p, window.location.origin);
        if (u.origin !== window.location.origin) return "/app";
        return u.pathname + u.search + u.hash;
      } catch {
        return "/app";
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: 520, margin: "64px auto", padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>Confirmando sua conta…</h1>
      <p>{msg}</p>
      {detail && (
        <pre
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: "rgba(0,0,0,.06)",
            overflowX: "auto",
          }}
        >
          {detail}
        </pre>
      )}
      <p style={{ marginTop: 24 }}>Você será redirecionado automaticamente.</p>
    </div>
  );
}

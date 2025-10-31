import { createClient } from "@supabase/supabase-js";

// Garante uma única instância autenticada do Supabase
// Persistência de sessão habilitada (frontend logado)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Log leve para diagnóstico em desenvolvimento
  console.warn("[AUTH] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // usamos rota dedicada /auth/confirmed
  },
});

export default supabase;

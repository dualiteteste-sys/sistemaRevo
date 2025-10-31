import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const functionsUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  // Usamos um aviso em vez de erro para que a página de confirmação possa mostrar uma mensagem amigável.
  console.warn("[AUTH] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // IMPORTANTE: Desativado para usar nossa rota dedicada /auth/confirmed
  },
  global: {
    functionsUrl: functionsUrl,
  },
});

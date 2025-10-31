import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const functionsUrl = import.meta.env.VITE_FUNCTIONS_BASE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam ser definidas.');
}

/**
 * Cliente Supabase para uso em páginas públicas.
 * Não persiste a sessão e não tenta auto-refresh de token,
 * evitando erros em ambientes sem storage (credentialless).
 * A opção `global.fetch` é um workaround para garantir que as
 * requisições não tentem incluir credenciais no ambiente do webcontainer.
 */
export const supabasePublic = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    fetch: (...args) => fetch(...args),
    functionsUrl: functionsUrl,
  },
});

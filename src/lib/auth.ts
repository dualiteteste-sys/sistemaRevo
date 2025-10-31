// src/lib/auth.ts
import { supabase } from './supabaseClient';

/**
 * Faz signup por e-mail/senha.
 * Produção: NÃO envia emailRedirectTo -> Supabase usa o Site URL (https://erprevo.com)
 * Dev: envia emailRedirectTo = http://localhost:5173/auth/confirmed (ou a origin atual)
 */
export async function signUpWithEmail(email: string, password: string) {
  const isDev =
    import.meta.env.DEV ||
    /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);

  const options: Parameters<typeof supabase.auth.signUp>[0]['options'] = {};

  if (isDev) {
    options.emailRedirectTo = `${window.location.origin}/auth/confirmed`;
  }
  // Em produção, NÃO define options.emailRedirectTo — o Supabase usará o Site URL

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options,
  });

  if (error) {
    console.error('[AUTH][SIGNUP][ERR]', error);
    throw error;
  }

  return data;
}

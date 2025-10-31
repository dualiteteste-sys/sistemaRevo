// src/lib/auth.ts
import { supabase } from './supabaseClient';

/**
 * Resolve a URL de redirect que funciona em qualquer ambiente (Dualite Preview, localhost, produção).
 * Preserva o BASE_URL (subpath) do app e aponta para /auth/confirmed.
 */
function resolveAuthRedirect(): string {
  // import.meta.env.BASE_URL cobre casos com subpath (ex.: /run/abc123/)
  const base = new URL(import.meta.env.BASE_URL || '/', window.location.href);
  return new URL('auth/confirmed', base).href; // .../auth/confirmed
}

/**
 * Faz signup por e-mail/senha.
 * - Produção (erprevo.com): podemos não enviar emailRedirectTo (Supabase usa Site URL).
 * - Demais ambientes (localhost, Dualite Preview): sempre usar redirect dinâmico.
 */
export async function signUpWithEmail(email: string, password: string) {
  const isProdSite = /^https?:\/\/(www\.)?erprevo\.com$/i.test(window.location.origin);
  const options: Parameters<typeof supabase.auth.signUp>[0]['options'] = {};

  if (!isProdSite) {
    options.emailRedirectTo = resolveAuthRedirect();
  }

  const { data, error } = await supabase.auth.signUp({ email, password, options });
  if (error) {
    console.error('[AUTH][SIGNUP][ERR]', error);
    throw error;
  }
  return data;
}

/**
 * Login via OTP (magic link) — se você usar esse fluxo.
 */
export async function signInWithEmail(email: string) {
  const isProdSite = /^https?:\/\/(www\.)?erprevo\.com$/i.test(window.location.origin);
  const options: Parameters<typeof supabase.auth.signInWithOtp>[0]['options'] = {};

  if (!isProdSite) {
    options.emailRedirectTo = resolveAuthRedirect();
  }

  const { data, error } = await supabase.auth.signInWithOtp({ email, options });
  if (error) {
    console.error('[AUTH][SIGNIN][ERR]', error);
    throw error;
  }
  return data;
}

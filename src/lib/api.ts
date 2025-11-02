import { supabase } from '@/lib/supabaseClient';

const REST = import.meta.env.VITE_SUPABASE_REST_URL as string;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  if (!jwt) throw new Error('[AUTH] JWT ausente. Usuário não autenticado.');
  return {
    apikey: ANON,
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  };
}

export async function callRpc<T = unknown>(fn: string, payload: Record<string, any> = {}): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${REST}/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const code = (json && (json.code || json.error)) || `HTTP_${res.status}`;
    const msg  = (json && (json.message || json.error_description)) || text || 'RPC error';
    console.error('[RPC][ERROR]', fn, code, msg, json || text);
    throw new Error(`${code}: ${msg}`);
  }
  return json as T;
}

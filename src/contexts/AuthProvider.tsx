import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Empresa } from '@/services/company';
import { bootstrapEmpresaParaUsuarioAtual } from '@/services/session';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  empresas: Empresa[];
  activeEmpresa: Empresa | null;
  signOut: () => Promise<void>;
  refreshEmpresas: () => Promise<void>;
  setActiveEmpresa: (empresa: Empresa) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, setActiveEmpresaState] = useState<Empresa | null>(null);

  const bootOnceRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      console.log('[AUTH] getSession:init');
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) console.error('[AUTH][getSession][ERR]', error);

      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
      setLoading(false);
      console.log('[AUTH] getSession:done', { hasSession: !!data?.session });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[AUTH] onAuthStateChange', { hasSession: !!newSession });
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const refreshEmpresas = useCallback(async () => {
    if (!user) return;
  
    try {
      const { data: userEmpresas, error: userEmpresasError } = await supabase
        .from('empresa_usuarios')
        .select('empresa_id')
        .eq('user_id', user.id);
  
      if (userEmpresasError) throw userEmpresasError;
  
      const empresaIds = userEmpresas.map(ue => ue.empresa_id);
  
      if (empresaIds.length === 0) {
        setEmpresas([]);
        setActiveEmpresaState(null);
        return;
      }
  
      const { data: empresasList, error: empresasError } = await supabase
        .from('empresas')
        .select('*')
        .in('id', empresaIds);
  
      if (empresasError) throw empresasError;
      setEmpresas(empresasList ?? []);
  
      const { data: activeEmpresaLink, error: activeError } = await supabase
        .from('user_active_empresa')
        .select('empresa_id')
        .eq('user_id', user.id)
        .single();
  
      if (activeError && activeError.code !== 'PGRST116') {
        throw activeError;
      }
  
      if (activeEmpresaLink) {
        const active = empresasList?.find(e => e.id === activeEmpresaLink.empresa_id) ?? null;
        setActiveEmpresaState(active);
      } else if (empresasList && empresasList.length > 0) {
        setActiveEmpresaState(empresasList[0]);
        await supabase.from('user_active_empresa').upsert({ user_id: user.id, empresa_id: empresasList[0].id });
      } else {
        setActiveEmpresaState(null);
      }
    } catch (e) {
      console.warn('[AUTH][EMPRESAS][WARN]', e);
      setEmpresas([]);
      setActiveEmpresaState(null);
    }
  }, [user]);

  useEffect(() => {
    if (session && !bootOnceRef.current) {
      bootOnceRef.current = true;
      (async () => {
        try {
          console.log('[AUTH] bootstrapEmpresaParaUsuarioAtual:start');
          await bootstrapEmpresaParaUsuarioAtual();
        } catch (e) {
          console.warn('[AUTH][BOOTSTRAP][WARN]', e);
        } finally {
          await refreshEmpresas();
          console.log('[AUTH] bootstrapEmpresaParaUsuarioAtual:done');
        }
      })();
    } else if (session) {
        // If session exists but bootstrap has run, still refresh companies
        // This handles cases like company data updates
        refreshEmpresas();
    }
  }, [session, refreshEmpresas]);

  const setActiveEmpresa = useCallback(async (empresa: Empresa) => {
    if (!user) return;
    const { error } = await supabase
      .from('user_active_empresa')
      .upsert({ user_id: user.id, empresa_id: empresa.id }, { onConflict: 'user_id' });

    if (error) {
      console.error('[AUTH][SET_ACTIVE_EMPRESA][ERR]', error);
    } else {
      setActiveEmpresaState(empresa);
    }
  }, [user]);

  const signOut = useCallback(async () => {
    console.log('[AUTH] signOut');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setEmpresas([]);
    setActiveEmpresaState(null);
    bootOnceRef.current = false;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      loading,
      empresas,
      activeEmpresa,
      signOut,
      refreshEmpresas,
      setActiveEmpresa,
    }),
    [user, session, loading, empresas, activeEmpresa, signOut, refreshEmpresas, setActiveEmpresa],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

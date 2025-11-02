import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Empresa } from '@/services/company';
import { bootstrapEmpresaParaUsuarioAtual } from '@/services/session';
import { callRpc } from '@/lib/api';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, _setActiveEmpresa] = useState<Empresa | null>(null);

  const fetchEmpresas = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('empresa_usuarios')
        .select('empresas(*)')
        .eq('user_id', userId);
      if (error) throw error;
      const userEmpresas = data.map(item => item.empresas).filter(Boolean) as Empresa[];
      setEmpresas(userEmpresas);
      return userEmpresas;
    } catch (error) {
      console.error("Error fetching companies:", error);
      setEmpresas([]);
      return [];
    }
  }, []);

  const setActiveEmpresa = useCallback(async (empresa: Empresa) => {
    if (empresa.id === activeEmpresa?.id) return;
    try {
      await callRpc('set_active_empresa_for_current_user', { p_empresa_id: empresa.id });
      _setActiveEmpresa(empresa);
    } catch (error) {
      console.error("Failed to set active company:", error);
    }
  }, [activeEmpresa]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshEmpresas = useCallback(async () => {
    if (user) {
      await fetchEmpresas(user.id);
    }
  }, [user, fetchEmpresas]);

  useEffect(() => {
    setLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        try {
          const { empresa_id } = await bootstrapEmpresaParaUsuarioAtual();
          const userEmpresas = await fetchEmpresas(currentUser.id);
          const active = userEmpresas.find(e => e.id === empresa_id);
          _setActiveEmpresa(active || null);
        } catch (error) {
          console.error("Auth bootstrap failed:", error);
          _setActiveEmpresa(null);
          setEmpresas([]);
        }
      } else {
        setEmpresas([]);
        _setActiveEmpresa(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchEmpresas]);
  
  const value = useMemo(() => ({
    user,
    session,
    loading,
    empresas,
    activeEmpresa,
    signOut,
    refreshEmpresas,
    setActiveEmpresa,
  }), [user, session, loading, empresas, activeEmpresa, refreshEmpresas, setActiveEmpresa]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

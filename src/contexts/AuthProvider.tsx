import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { useNavigate } from 'react-router-dom';

type Empresa = Database['public']['Tables']['empresas']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  empresas: Empresa[];
  activeEmpresa: Empresa | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshEmpresas: () => Promise<void>;
  setActiveEmpresa: (empresa: Empresa | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, setActiveEmpresaState] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const setActiveEmpresa = (empresa: Empresa | null) => {
    setActiveEmpresaState(empresa);
    if (empresa) {
      localStorage.setItem('activeEmpresaId', empresa.id);
    } else {
      localStorage.removeItem('activeEmpresaId');
    }
  };

  const fetchInitialData = useCallback(async (currentSession: Session | null) => {
    if (currentSession?.user) {
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) {
        console.error('Erro ao buscar empresas:', error);
        setEmpresas([]);
        setActiveEmpresa(null);
      } else {
        const fetchedEmpresas = data || [];
        setEmpresas(fetchedEmpresas);

        const lastActiveId = localStorage.getItem('activeEmpresaId');
        const lastActive = fetchedEmpresas.find(e => e.id === lastActiveId);
        
        if (lastActive) {
          setActiveEmpresaState(lastActive);
        } else if (fetchedEmpresas.length > 0) {
          setActiveEmpresaState(fetchedEmpresas[0]);
          localStorage.setItem('activeEmpresaId', fetchedEmpresas[0].id);
        } else {
          setActiveEmpresaState(null);
        }
      }
    } else {
      setEmpresas([]);
      setActiveEmpresa(null);
    }
    setSession(currentSession);
    setUser(currentSession?.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchInitialData(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchInitialData(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchInitialData]);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('activeEmpresaId');
    navigate('/');
  };

  const refreshEmpresas = useCallback(async () => {
    if (session?.user) {
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) {
        console.error('Erro ao re-buscar empresas:', error);
      } else {
        setEmpresas(data || []);
        // Re-check active company consistency
        const currentActiveId = localStorage.getItem('activeEmpresaId');
        const activeExists = data?.some(e => e.id === currentActiveId);
        if (!activeExists && data && data.length > 0) {
            setActiveEmpresa(data[0]);
        }
      }
    }
  }, [session, setActiveEmpresa]);

  const value = {
    session,
    user,
    empresas,
    activeEmpresa,
    loading,
    signOut,
    refreshEmpresas,
    setActiveEmpresa,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

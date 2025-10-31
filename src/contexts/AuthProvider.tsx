import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase from '@/lib/supabaseClient';
import { Database } from '../types/database.types';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';
import { ensureSessionAndActiveEmpresa } from '@/lib/auth-bootstrap';

type Empresa = Database['public']['Tables']['empresas']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  empresas: Empresa[];
  activeEmpresa: Empresa | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshEmpresas: () => Promise<void>;
  setActiveEmpresa: (empresa: Empresa | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [activeEmpresa, setActiveEmpresaState] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const setActiveEmpresa = useCallback(async (empresa: Empresa | null) => {
    console.log('[AUTH] setActiveEmpresa called with:', empresa?.id ?? null);
    setActiveEmpresaState(empresa);
    if (empresa) {
      localStorage.setItem('activeEmpresaId', empresa.id);
      try {
        await ensureSessionAndActiveEmpresa(empresa.id);
      } catch (error: any) {
        console.error("Falha ao definir empresa ativa no backend:", error);
        addToast("Não foi possível trocar de empresa. Tente novamente.", "error");
      }
    } else {
      localStorage.removeItem('activeEmpresaId');
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.rpc('set_active_empresa_for_current_user', { p_empresa_id: null });
      }
    }
  }, [addToast]);

  const fetchInitialData = useCallback(async (currentSession: Session | null) => {
    console.log('[AUTH] fetchInitialData called. Session exists:', !!currentSession);
    setLoading(true);
    try {
      if (currentSession?.user) {
        const { data, error } = await supabase.from('empresas').select('*');
        if (error) {
          console.error('Erro ao buscar empresas:', error);
          setEmpresas([]);
          await setActiveEmpresa(null);
        } else {
          const fetchedEmpresas = data || [];
          setEmpresas(fetchedEmpresas);
          console.log('[AUTH] Empresas fetched:', fetchedEmpresas.map(e => e.id));

          const { data: whoamiData, error: whoamiError } = await supabase.rpc('whoami');
          console.log('[AUTH] whoami response:', { data: whoamiData, error: whoamiError });

          const activeId = whoamiData?.empresa_id;
          const active = fetchedEmpresas.find(e => e.id === activeId);
          
          if (active) {
            console.log('[AUTH] Setting active empresa from whoami:', active.id);
            await setActiveEmpresa(active);
          } else if (fetchedEmpresas.length > 0) {
            console.log('[AUTH] No active empresa from whoami, setting first one:', fetchedEmpresas[0].id);
            await setActiveEmpresa(fetchedEmpresas[0]);
          } else {
            console.log('[AUTH] No empresas found for user.');
            await setActiveEmpresa(null);
          }
        }
      } else {
        console.log('[AUTH] No session, clearing data.');
        setEmpresas([]);
        await setActiveEmpresa(null);
      }
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch (e) {
      console.error("Erro ao carregar dados da sessão:", e);
    } finally {
      setLoading(false);
      console.log('[AUTH] fetchInitialData finished.');
    }
  }, [setActiveEmpresa]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchInitialData(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AUTH] onAuthStateChange event: ${event}`);
      if (event === 'SIGNED_IN' && session?.user.user_metadata?.onboardingIntent) {
        const lastSignIn = new Date(session.user.last_sign_in_at || 0);
        const now = new Date();
        if (now.getTime() - lastSignIn.getTime() < 5000) {
            addToast('E-mail confirmado com sucesso!', 'success');
        }
      }
      fetchInitialData(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchInitialData, addToast]);

  const signOut = async () => {
    await supabase.auth.signOut();
    await setActiveEmpresa(null);
    navigate('/');
  };

  const refreshEmpresas = useCallback(async () => {
    if (session?.user) {
      const { data, error } = await supabase.from('empresas').select('*');
      if (error) {
        console.error('Erro ao re-buscar empresas:', error);
      } else {
        const fetchedEmpresas = data || [];
        setEmpresas(fetchedEmpresas);
        const currentActiveId = localStorage.getItem('activeEmpresaId');
        const activeExists = fetchedEmpresas.some(e => e.id === currentActiveId);
        
        if (activeExists) {
            const refreshedActive = fetchedEmpresas.find(e => e.id === currentActiveId);
            if (refreshedActive) await setActiveEmpresa(refreshedActive);
        } else if (fetchedEmpresas.length > 0) {
            await setActiveEmpresa(fetchedEmpresas[0]);
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

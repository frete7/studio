import { useState, useEffect, useCallback, useMemo } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export type UserProfile = {
  uid: string;
  name: string;
  email: string;
  role: 'driver' | 'company' | 'admin';
  status: 'incomplete' | 'pending' | 'active' | 'blocked' | 'suspended';
  tradingName?: string;
  cnpj?: string;
  responsible?: {
    name: string;
    cpf: string;
    document?: {
      url: string;
      status: 'pending' | 'approved' | 'rejected';
    };
  };
  cnpjCard?: {
    url: string;
    status: 'pending' | 'approved' | 'rejected';
  };
  cnh?: string;
  cnhCategory?: string;
  activePlanId?: string;
  activePlanName?: string;
  createdAt?: any;
  [key: string]: any;
};

export type AuthState = {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: string | null;
  status: string | null;
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
    status: null,
  });
  
  const router = useRouter();

  // Função para verificar se o usuário tem acesso a uma rota específica
  const hasAccess = useCallback((requiredRole?: string, requiredStatus?: string) => {
    if (!authState.isAuthenticated) return false;
    if (requiredRole && authState.role !== requiredRole) return false;
    if (requiredStatus && authState.status !== requiredStatus) return false;
    return true;
  }, [authState.isAuthenticated, authState.role, authState.status]);

  // Função para redirecionar baseado no role
  const redirectBasedOnRole = useCallback(() => {
    if (!authState.isAuthenticated) {
      router.push('/login');
      return;
    }

    switch (authState.role) {
      case 'admin':
        router.push('/admin');
        break;
      case 'company':
        router.push('/company-dashboard');
        break;
      case 'driver':
        router.push('/driver-dashboard');
        break;
      default:
        router.push('/profile');
    }
  }, [authState.isAuthenticated, authState.role, router]);

  // Função para fazer logout
  const logout = useCallback(async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }, [router]);

  // Função para atualizar o perfil
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setAuthState(prev => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, ...updates } : null,
      role: updates.role || prev.role,
      status: updates.status || prev.status,
    }));
  }, []);

  // Função para verificar se o usuário precisa completar o perfil
  const needsProfileCompletion = useMemo(() => {
    if (!authState.profile) return false;
    
    const profile = authState.profile;
    
    if (profile.role === 'company') {
      return !profile.tradingName || !profile.cnpj || !profile.responsible?.name;
    }
    
    if (profile.role === 'driver') {
      return !profile.name || !profile.cnh || !profile.cnhCategory;
    }
    
    return false;
  }, [authState.profile]);

  // Função para verificar se o usuário está pendente de aprovação
  const isPendingApproval = useMemo(() => {
    return authState.status === 'pending';
  }, [authState.status]);

  // Função para verificar se o usuário está bloqueado
  const isBlocked = useMemo(() => {
    return authState.status === 'blocked' || authState.status === 'suspended';
  }, [authState.status]);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeProfile: (() => void) | undefined;

    const initializeAuth = async () => {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Usuário está autenticado
          const userDocRef = doc(db, 'users', user.uid);
          
          // Escutar mudanças no perfil em tempo real
          unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              const profileData = { ...doc.data(), uid: doc.id } as UserProfile;
              
              setAuthState({
                user,
                profile: profileData,
                isLoading: false,
                isAuthenticated: true,
                role: profileData.role,
                status: profileData.status,
              });
            } else {
              // Usuário não tem perfil criado
              setAuthState({
                user,
                profile: null,
                isLoading: false,
                isAuthenticated: true,
                role: null,
                status: null,
              });
            }
          }, (error) => {
            console.error('Erro ao carregar perfil:', error);
            setAuthState({
              user,
              profile: null,
              isLoading: false,
              isAuthenticated: true,
              role: null,
              status: null,
            });
          });
        } else {
          // Usuário não está autenticado
          setAuthState({
            user: null,
            profile: null,
            isLoading: false,
            isAuthenticated: false,
            role: null,
            status: null,
          });
        }
      });
    };

    initializeAuth();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return {
    ...authState,
    hasAccess,
    redirectBasedOnRole,
    logout,
    updateProfile,
    needsProfileCompletion,
    isPendingApproval,
    isBlocked,
  };
}

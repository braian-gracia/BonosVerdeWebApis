import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../utils/types';
import { authAPI } from '../api/client';
import keycloak, { initKeycloak } from '../auth/keycloak';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  register: (email: string, name: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    initKeycloak()
      .then(async (authenticated) => {
        if (!active) return;
        if (authenticated) {
          await loadUser();
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Keycloak init error:', error);
        if (active) setLoading(false);
      });

    const timer = window.setInterval(() => {
      if (keycloak.authenticated) {
        keycloak.updateToken(60).catch(() => undefined);
      }
    }, 60000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const login = async () => {
    await keycloak.login({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  };

  const register = async (
    email: string,
    name: string,
    password: string,
    referralCode?: string
  ) => {
    await authAPI.register({ email, name, password, referralCode });
    await keycloak.login({
      redirectUri: `${window.location.origin}/dashboard`,
    });
  };

  const logout = () => {
    setUser(null);
    keycloak.logout({
      redirectUri: `${window.location.origin}/login`,
    });
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

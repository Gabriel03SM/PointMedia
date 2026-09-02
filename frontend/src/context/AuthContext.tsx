import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLoginAs: (role: UserRole) => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isRecruiter: boolean;
  isCandidate: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('point_media_token');
    const savedUser = localStorage.getItem('point_media_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('point_media_token');
        localStorage.removeItem('point_media_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('point_media_token', res.token);
    localStorage.setItem('point_media_user', JSON.stringify(res.user));
  };

  const quickLoginAs = (role: UserRole) => {
    const mockUser: User = {
      id: `usr-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@pointmedia.com.br`,
      name: role === 'RECRUITER' ? 'Carla Recrutamento' : role === 'ADMIN' ? 'Admin Point' : 'Candidato Demo',
      role,
    };
    const mockToken = `token-point-${role.toLowerCase()}`;
    setToken(mockToken);
    setUser(mockUser);
    localStorage.setItem('point_media_token', mockToken);
    localStorage.setItem('point_media_user', JSON.stringify(mockUser));
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem('point_media_token', res.token);
    localStorage.setItem('point_media_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('point_media_token');
    localStorage.removeItem('point_media_user');
  };

  const isRecruiter = user?.role === 'RECRUITER' || user?.role === 'ADMIN';
  const isCandidate = user?.role === 'CANDIDATE';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLoginAs,
        register,
        logout,
        isAuthenticated: !!user,
        isRecruiter,
        isCandidate,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

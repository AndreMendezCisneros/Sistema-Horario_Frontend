import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import axios from 'axios';
import client from '@/utils/axiosClient';

type Role = 'Docente' | 'Administrador' | null;

interface User {
  docente_id?: number;
  admin_id?: number;
  username?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  role: Role;
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setRole: (role: Role) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<Role>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Carga estado de autenticación desde localStorage
    const storedRole = localStorage.getItem('role') as Role;
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    // Try to load user data from localStorage if exists
    let storedUser = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        storedUser = JSON.parse(userStr);
      }
    } catch (e) {
      console.error("Error parsing user data from localStorage", e);
    }

    if (storedAccessToken && storedRole) {
      setIsAuthenticated(true);
      setRole(storedRole);
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(storedUser);
      
      // Configurar el token en el cliente axios
      client.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
    }
    
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:8000/api/auth/login/', {
        username,
        password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Permitir ambos formatos: user_data (antiguo) o user (nuevo)
      const { access, refresh, user_data, user } = response.data;
      const userInfo = user_data || user;
      
      // Guardar tokens en localStorage
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      
      // Guardar datos del usuario
      if (userInfo) {
        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
      }
      
      // Actualizar estado
      setAccessToken(access);
      setRefreshToken(refresh);
      setIsAuthenticated(true);
      
      // Configurar el token en el cliente axios
      client.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Credenciales inválidas');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Limpiar localStorage
    localStorage.removeItem('role');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Limpiar estado
    setIsAuthenticated(false);
    setRole(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    
    // Limpiar token del cliente axios
    delete client.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      role,
      accessToken,
      refreshToken,
      user,
      setRole: (newRole) => {
        setRole(newRole);
        if (newRole) {
          localStorage.setItem('role', newRole);
        } else {
          localStorage.removeItem('role');
        }
      },
      login,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

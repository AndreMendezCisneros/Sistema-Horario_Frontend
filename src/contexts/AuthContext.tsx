import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import axios from 'axios';
import client from '@/utils/axiosClient';

type Role = 'Docente' | 'Administrador' | null;

interface User {
  docente_id?: number;
  admin_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  groups?: string[]; // Grupos reales del backend
}

interface AuthContextType {
  isAuthenticated: boolean;
  role: Role;
  selectedRole: Role; // Rol seleccionado visualmente
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  setRole: (role: Role) => void;
  setSelectedRole: (role: Role) => void; // Para la selección visual
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  getRealRole: () => Role; // Función para obtener el rol real del backend
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

// Función para determinar el rol real basado en los grupos del backend
const determineRealRole = (groups: string[]): Role => {
  if (!groups || groups.length === 0) return null;
  
  // Si tiene grupo de administrador o coordinador, es Administrador
  if (groups.some(group => 
    group.toLowerCase().includes('admin') || 
    group.toLowerCase().includes('coordinador') ||
    group.toLowerCase().includes('administrador')
  )) {
    return 'Administrador';
  }
  
  // Si tiene grupo de docente, es Docente
  if (groups.some(group => 
    group.toLowerCase().includes('docente')
  )) {
    return 'Docente';
  }
  
  // Por defecto, si no se reconoce, es null
  return null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [role, setRole] = useState<Role>(null); // Rol real del backend
  const [selectedRole, setSelectedRole] = useState<Role>(null); // Rol seleccionado visualmente
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Carga estado de autenticación desde localStorage
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedSelectedRole = localStorage.getItem('selectedRole') as Role;
    
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

    if (storedAccessToken && storedUser) {
      setIsAuthenticated(true);
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      setUser(storedUser);
      setSelectedRole(storedSelectedRole);
      
      // Determinar el rol real basado en los grupos del usuario
      const realRole = determineRealRole(storedUser.groups || []);
      setRole(realRole);
      
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
      
      // Determinar el rol real basado en los grupos del backend
      const realRole = determineRealRole(userInfo?.groups || []);
      setRole(realRole);
      
      // Actualizar estado
      setAccessToken(access);
      setRefreshToken(refresh);
      setIsAuthenticated(true);
      
      // Configurar el token en el cliente axios
      client.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Mostrar mensaje si el rol seleccionado no coincide con el real
      const storedSelectedRole = localStorage.getItem('selectedRole') as Role;
      if (storedSelectedRole && storedSelectedRole !== realRole) {
        toast.info(`Tu rol real es: ${realRole}. Serás redirigido a tu vista correspondiente.`);
      }
      
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
    localStorage.removeItem('selectedRole');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Limpiar estado
    setIsAuthenticated(false);
    setRole(null);
    setSelectedRole(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    
    // Limpiar token del cliente axios
    delete client.defaults.headers.common['Authorization'];
  };

  // Función para obtener el rol real del backend
  const getRealRole = (): Role => {
    return role;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      role,
      selectedRole,
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
      setSelectedRole: (newRole) => {
        setSelectedRole(newRole);
        if (newRole) {
          localStorage.setItem('selectedRole', newRole);
        } else {
          localStorage.removeItem('selectedRole');
        }
      },
      login,
      logout,
      isLoading,
      getRealRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

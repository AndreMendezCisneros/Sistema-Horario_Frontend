import axios from 'axios';
import { toast } from 'sonner';

// Permitir configurar la baseURL por variable de entorno (útil para desarrollo/producción)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

console.log('[axiosClient] Usando baseURL:', baseURL);

const client = axios.create({ 
  baseURL
});

client.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  console.error('Error with request:', error);
  return Promise.reject(error);
});

// Add response interceptor to handle common errors
client.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    
    // Handle network errors
    if (!error.response) {
      toast.error('Error de conexión al servidor. Verifique su conexión a internet o CORS.');
      console.error('[axiosClient] No response from backend. Puede ser un problema de CORS, red, o que el backend no está corriendo.');
      return Promise.reject(error);
    }
    
    // Handle specific HTTP errors
    switch (error.response.status) {
      case 401:
        toast.error('Sesión expirada o no autorizada. Por favor inicie sesión nuevamente.');
        // Redirect to login if token is invalid/expired
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
        }
        break;
      case 403:
        toast.error('No tiene permisos para realizar esta acción.');
        break;
      case 404:
        toast.error('El recurso solicitado no fue encontrado.');
        break;
      case 500:
        toast.error('Error interno del servidor. Por favor intente más tarde.');
        break;
      default:
        if (error.response.data && error.response.data.detail) {
          toast.error(`Error: ${error.response.data.detail}`);
        } else {
          toast.error('Ocurrió un error inesperado.');
        }
    }
    
    return Promise.reject(error);
  }
);

export default client;

import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { AxiosError } from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const fetchData = async <T>(endpoint: string): Promise<T | null> => {
  try {
    const response = await client.get<T>(endpoint);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        console.error(`Endpoint no encontrado: ${endpoint}`);
        toast.error(`No se pudo acceder a ${endpoint}`);
      } else {
        console.error(`Error al cargar datos de ${endpoint}:`, error);
        toast.error(`Error al cargar datos de ${endpoint}`);
      }
    } else {
      console.error(`Error inesperado al cargar datos de ${endpoint}:`, error);
      toast.error(`Error inesperado al cargar datos de ${endpoint}`);
    }
    return null;
  }
};

export async function createItem<T>(endpoint: string, data: any): Promise<T | null> {
  try {
    const response = await client.post<T>(endpoint, data);
    toast.success("Registro creado exitosamente");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error creating item at ${endpoint}:`, axiosError);
    
    if (axiosError.response) {
      const responseData = axiosError.response.data as any;
      // Handle validation errors (common in form submissions)
      if (responseData && typeof responseData === 'object') {
        // Display the first error message
        const firstErrorField = Object.keys(responseData)[0];
        const errorMsg = responseData[firstErrorField];
        toast.error(`Error en campo ${firstErrorField}: ${errorMsg}`);
      } else {
        toast.error(`Error al crear: ${axiosError.message}`);
      }
    } else {
      toast.error(`Error al crear: ${axiosError.message}`);
    }
    
    return null;
  }
}

export async function updateItem<T>(endpoint: string, id: number | string, data: any): Promise<T | null> {
  try {
    console.log(`[updateItem] Enviando datos a ${endpoint}${id}/:`, data);
    const response = await client.put<T>(`${endpoint}${id}/`, data);
    toast.success("Registro actualizado exitosamente");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error updating item at ${endpoint}${id}/:`, axiosError);
    
    // Log detailed error information
    if (axiosError.response) {
      console.error('Response status:', axiosError.response.status);
      console.error('Response data:', axiosError.response.data);
      console.error('Response headers:', axiosError.response.headers);
      
      const responseData = axiosError.response.data as any;
      if (responseData && typeof responseData === 'object') {
        const errorKeys = Object.keys(responseData);
        if (errorKeys.length > 0) {
          const firstErrorField = errorKeys[0];
          const errorMsg = Array.isArray(responseData[firstErrorField])
            ? responseData[firstErrorField][0]
            : responseData[firstErrorField];
          toast.error(`Error al actualizar - ${firstErrorField}: ${errorMsg}`);
          return null;
        }
      }
    }
    
    toast.error(`Error al actualizar: ${axiosError.message}`);
    return null;
  }
}

export async function deleteItem(endpoint: string, id: number | string): Promise<boolean> {
  try {
    await client.delete(`${endpoint}${id}/`);
    toast.success("Registro eliminado exitosamente");
    return true;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error deleting item at ${endpoint}${id}/:`, axiosError);
    toast.error(`Error al eliminar: ${axiosError.message}`);
    return false;
  }
}

export async function getItemById<T>(endpoint: string, id: number | string): Promise<T | null> {
  try {
    const response = await client.get<T>(`${endpoint}${id}/`);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error(`Error fetching item at ${endpoint}${id}/:`, axiosError);
    toast.error(`Error al cargar datos: ${axiosError.message}`);
    return null;
  }
}



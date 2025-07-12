
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/layouts/AppLayout';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  allowedRoles?: Array<string>;
}

const ProtectedRoute = ({ allowedRoles = [] }: ProtectedRouteProps) => {
  const { isAuthenticated, role, selectedRole, isLoading } = useAuth();

  // Show loading indicator if authentication state is still being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has the required role (using real role from backend)
  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    // Mostrar mensaje informativo
    toast.info(`Tu rol real es: ${role}. No tienes acceso a esta vista.`);
    
    // Redirigir a la vista correspondiente según el rol real
    if (role === 'Docente') {
      return <Navigate to="/dashboard-docente" replace />;
    } else if (role === 'Administrador') {
      return <Navigate to="/dashboard-admin" replace />;
    } else {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Si el usuario no tiene un rol válido
  if (!role) {
    toast.error('No se pudo determinar tu rol. Contacta al administrador.');
    return <Navigate to="/unauthorized" replace />;
  }

  // Render the protected content within the layout
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
};

export default ProtectedRoute;

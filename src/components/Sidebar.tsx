
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { 
  BookOpen, 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  ClipboardList, 
  ClipboardCheck,
  LogIn,
  Building,
  Settings,
  Grid,
  Download,
  Clock
} from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

const Sidebar = () => {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  
  const adminLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Unidades Académicas', path: '/admin/unidades', icon: <Building className="w-5 h-5" /> },
    { name: 'Docentes', path: '/admin/docentes', icon: <Users className="w-5 h-5" /> },
    { name: 'Aulas', path: '/admin/aulas', icon: <Grid className="w-5 h-5" /> },
    { name: 'Grupos/Secciones', path: '/admin/grupos', icon: <Users className="w-5 h-5" /> },
    { name: 'Disponibilidad', path: '/admin/disponibilidad', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Horarios Manual', path: '/admin/horarios/manual', icon: <ClipboardList className="w-5 h-5" /> },
    { name: 'Horarios Automático', path: '/admin/horarios/automatico', icon: <ClipboardCheck className="w-5 h-5" /> },
    { name: 'Restricciones', path: '/admin/restricciones', icon: <Settings className="w-5 h-5" /> },
    { name: 'Reportes', path: '/admin/reportes', icon: <FileText className="w-5 h-5" /> }
  ];
  
  const docenteLinks = [
    { name: 'Dashboard', path: '/docente/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Mi Disponibilidad', path: '/docente/disponibilidad', icon: <Clock className="w-5 h-5" /> },
    { name: 'Mi Horario', path: '/docente/horario', icon: <Calendar className="w-5 h-5" /> },
    { name: 'Exportar Horario', path: '/docente/exportar', icon: <Download className="w-5 h-5" /> }
  ];
  
  const links = role === 'Administrador' ? adminLinks : docenteLinks;
  
  return (
    <aside className="h-screen w-64 bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border fixed left-0 top-0 overflow-y-auto">
      <div className="p-4">
        <div className="academic-gradient text-white p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Sistema de Horarios</h2>
            <DarkModeToggle />
          </div>
          <p className="text-sm opacity-80">
            {role === 'Administrador' ? 'Panel Administrativo' : 'Panel Docente'}
          </p>
        </div>
        
        <nav className="space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) => 
                cn(
                  "flex items-center px-4 py-3 rounded-lg transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )
              }
            >
              <span className="mr-3">{link.icon}</span>
              <span>{link.name}</span>
            </NavLink>
          ))}
          
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center px-4 py-3 text-sidebar-foreground rounded-lg hover:bg-sidebar-accent transition-all mt-10"
          >
            <LogIn className="w-5 h-5 mr-3" />
            <span>Cerrar Sesión</span>
          </button>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;


import React from 'react';
import { 
  Calendar, 
  ClipboardList, 
  FileText 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const DashboardDocente = () => {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panel de Docente</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acceda a su disponibilidad y horarios
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card className="hover:shadow-md transition-all">
          <CardHeader className="bg-academic-primary/10 pb-2">
            <CardTitle className="flex items-center text-academic-primary">
              <Calendar className="mr-2 h-5 w-5" />
              Mi Disponibilidad
            </CardTitle>
            <CardDescription>
              Gestione sus horas disponibles
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Registre sus horarios disponibles para facilitar la asignación de clases.
            </p>
            <Button 
              onClick={() => navigate('/docente/disponibilidad')}
              className="w-full bg-academic-primary hover:bg-academic-secondary"
            >
              Gestionar Disponibilidad
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="bg-academic-secondary/10 pb-2">
            <CardTitle className="flex items-center text-academic-secondary">
              <ClipboardList className="mr-2 h-5 w-5" />
              Mi Horario
            </CardTitle>
            <CardDescription>
              Consulte su horario de clases
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Visualice sus horarios asignados para el periodo académico actual.
            </p>
            <Button 
              onClick={() => navigate('/docente/horario')}
              className="w-full bg-academic-secondary hover:bg-academic-primary"
            >
              Ver Horario
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all">
          <CardHeader className="bg-academic-accent/10 pb-2">
            <CardTitle className="flex items-center text-academic-accent">
              <FileText className="mr-2 h-5 w-5" />
              Exportar Horario
            </CardTitle>
            <CardDescription>
              Descargue su horario en Excel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Exporte su horario en formato Excel para imprimir o compartir.
            </p>
            <Button 
              onClick={() => navigate('/docente/exportar')}
              className="w-full bg-academic-accent hover:bg-academic-secondary"
            >
              Exportar a Excel
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardDocente;

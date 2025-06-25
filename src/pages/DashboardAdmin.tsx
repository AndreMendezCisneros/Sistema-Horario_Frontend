import React, { useEffect, useState } from 'react';
import { BookOpen, User, FileText, Users, Calendar, ClipboardList } from 'lucide-react';
import CardSummary from '@/components/CardSummary';
import client from '@/utils/axiosClient';
import { toast } from "sonner";

interface CountData {
  unidades: number;
  carreras: number;
  materias: number;
  grupos: number;
  aulas: number;
  docentes: number;
  bloques: number;
  horarios: number;
}

const DashboardAdmin = () => {
  const [counts, setCounts] = useState<CountData>({
    unidades: 0,
    carreras: 0,
    materias: 0,
    grupos: 0,
    aulas: 0,
    docentes: 0,
    bloques: 0,
    horarios: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [
          unidades,
          carreras,
          materias,
          grupos,
          aulas,
          docentes,
          bloques,
          horarios
        ] = await Promise.all([
          client.get('academic-setup/unidades-academicas/'),
          client.get('academic-setup/carreras/'),
          client.get('academic-setup/materias/'),
          client.get('scheduling/grupos/'),
          client.get('academic-setup/espacios-fisicos/'),
          client.get('users/docentes/'),
          client.get('scheduling/bloques-horarios/'),
          client.get('scheduling/horarios-asignados/')
        ]);
        
        setCounts({
          unidades: Array.isArray(unidades.data.results) ? unidades.data.results.length : Array.isArray(unidades.data) ? unidades.data.length : 0,
          carreras: Array.isArray(carreras.data.results) ? carreras.data.results.length : Array.isArray(carreras.data) ? carreras.data.length : 0,
          materias: Array.isArray(materias.data.results) ? materias.data.results.length : Array.isArray(materias.data) ? materias.data.length : 0,
          grupos: Array.isArray(grupos.data.results) ? grupos.data.results.length : Array.isArray(grupos.data) ? grupos.data.length : 0,
          aulas: Array.isArray(aulas.data.results) ? aulas.data.results.length : Array.isArray(aulas.data) ? aulas.data.length : 0,
          docentes: Array.isArray(docentes.data.results) ? docentes.data.results.length : Array.isArray(docentes.data) ? docentes.data.length : 0,
          bloques: Array.isArray(bloques.data.results) ? bloques.data.results.length : Array.isArray(bloques.data) ? bloques.data.length : 0,
          horarios: Array.isArray(horarios.data.results) ? horarios.data.results.length : Array.isArray(horarios.data) ? horarios.data.length : 0
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar datos del dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panel de Administración</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Resumen de entidades académicas y horarios
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <CardSummary 
            title="Unidades Académicas" 
            count={counts.unidades} 
            icon={<BookOpen className="h-6 w-6" />} 
            link="/admin/unidades" 
          />
          <CardSummary 
            title="Carreras" 
            count={counts.carreras} 
            icon={<FileText className="h-6 w-6" />} 
            link="/admin/carreras" 
          />
          <CardSummary 
            title="Materias" 
            count={counts.materias} 
            icon={<BookOpen className="h-6 w-6" />} 
            link="/admin/materias" 
          />
          <CardSummary 
            title="Grupos/Secciones" 
            count={counts.grupos} 
            icon={<Users className="h-6 w-6" />} 
            link="/admin/grupos" 
          />
          <CardSummary 
            title="Aulas" 
            count={counts.aulas} 
            icon={<FileText className="h-6 w-6" />} 
            link="/admin/aulas" 
          />
          <CardSummary 
            title="Docentes" 
            count={counts.docentes} 
            icon={<User className="h-6 w-6" />} 
            link="/admin/docentes" 
          />
          <CardSummary 
            title="Bloques Horarios" 
            count={counts.bloques} 
            icon={<Calendar className="h-6 w-6" />} 
            link="/admin/bloques" 
          />
          <CardSummary 
            title="Horarios Asignados" 
            count={counts.horarios} 
            icon={<ClipboardList className="h-6 w-6" />} 
            link="/admin/horarios/manual" 
          />
        </div>
      )}
    </div>
  );
};

export default DashboardAdmin;

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Download,
  Calendar,
  FileSpreadsheet,
  Printer,
  Loader2
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { useAuth } from '@/contexts/AuthContext';
import HorarioGrid from "@/components/HorarioGrid";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
}

interface Materia {
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
}

interface HorarioAsignado {
  horario_id: number;
  grupo: number;
  docente: number;
  espacio: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  materia: number;
  grupo_detalle: Grupo;
  materia_detalle: Materia;
  docente_detalle: any;
  espacio_detalle: any;
}

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" }
];

const MiHorarioDocente = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [periodos, setPeriodos] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [selectedCarrera, setSelectedCarrera] = useState<number | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        }
        const bloquesData = await fetchData<BloqueHorario[]>("scheduling/bloques-horarios/");
        setBloques(Array.isArray(bloquesData) ? bloquesData : []);
      } catch (error) {
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriodo && user?.docente_id) {
      const loadHorarios = async () => {
        setIsLoading(true);
        try {
          // Solo cargar horarios asignados a este docente
          const horariosData = await fetchData<HorarioAsignado[]>(`scheduling/horarios-asignados/?periodo=${selectedPeriodo}&docente=${user.docente_id}`);
          setHorarios(Array.isArray(horariosData) ? horariosData : []);
          // Extraer grupos únicos de los horarios de este docente
          const gruposUnicos = Array.from(new Set((horariosData ?? []).map(h => h.grupo)));
          const gruposDetalles = gruposUnicos.map(grupoId => horariosData.find(h => h.grupo === grupoId)?.grupo_detalle).filter(Boolean);
          setGrupos(gruposDetalles);
          // Extraer carreras únicas de los grupos (usando carrera_detalle real)
          const carrerasUnicas = Array.from(
            new Map(
              gruposDetalles
                .filter(g => g.carrera_detalle)
                .map(g => [g.carrera_detalle.carrera_id, g.carrera_detalle])
            ).values()
          );
          setCarreras(carrerasUnicas);
          // Selección automática
          if (carrerasUnicas.length > 0 && !selectedCarrera) setSelectedCarrera(carrerasUnicas[0].carrera_id);
          if (gruposUnicos.length > 0 && !selectedGrupo) setSelectedGrupo(gruposUnicos[0]);
          // Extraer materias únicas
          const materiasUnicas = Array.from(new Set((horariosData ?? []).map(h => h.materia)));
          setMaterias(materiasUnicas.map(materiaId => horariosData.find(h => h.materia === materiaId)?.materia_detalle).filter(Boolean));
        } catch (error) {
          toast.error("Error al cargar los horarios");
        } finally {
          setIsLoading(false);
        }
      };
      loadHorarios();
    }
  }, [selectedPeriodo, user]);

  // Filtrar grupos por carrera seleccionada
  const gruposFiltrados = selectedCarrera
    ? grupos.filter(g => g.carrera_detalle && g.carrera_detalle.carrera_id === selectedCarrera)
    : grupos;
  // Filtrar horarios por grupo seleccionado
  const horariosFiltrados = selectedGrupo ? horarios.filter(h => h.grupo === Number(selectedGrupo)) : horarios;

  // Extraer docentes únicos de los horarios
  const docentesUnicos = Array.from(
    new Map(
      horarios.map(h => [h.docente_detalle?.docente_id, h.docente_detalle])
        .filter(([id, d]) => id && d)
    ).values()
  );

  // Extraer aulas únicas de los horarios
  const aulasUnicas = Array.from(
    new Map(
      horarios.map(h => [h.espacio_detalle?.espacio_id, h.espacio_detalle])
        .filter(([id, a]) => id && a)
    ).values()
  );

  // Función para imprimir solo el horario
  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = `
        <div style="padding: 20px;">
          <h1 style="text-align: center; margin-bottom: 20px;">Mi Horario</h1>
          ${printContents}
        </div>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  };

  // Función para descargar el horario como Excel
  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Encabezados
      const headers = ['Hora', ...diasSemana.map(d => d.nombre)];
      const exportData: any[] = [];
      exportData.push(headers);
      // Por cada bloque horario, construir una fila
      bloques.forEach(bloque => {
        const row: any[] = [];
        row.push(`${bloque.hora_inicio.slice(0,5)} - ${bloque.hora_fin.slice(0,5)}`);
        diasSemana.forEach(dia => {
          const horario = horariosFiltrados.find(h => h.dia_semana === dia.id && h.bloque_horario === bloque.bloque_def_id);
          if (horario) {
            row.push(
              `Materia: ${horario.materia_detalle?.nombre_materia || ''}\nGrupo: ${horario.grupo_detalle?.codigo_grupo || ''}\nAula: ${horario.espacio_detalle?.nombre_espacio || ''}`
            );
          } else {
            row.push('');
          }
        });
        exportData.push(row);
      });
      // Crear hoja y libro de Excel
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'MiHorario');
      // Generar archivo y descargar
      const currentDate = new Date().toISOString().slice(0, 10);
      const fileName = `mi_horario_${currentDate}.xlsx`;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), fileName);
      toast.success('Horario descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar el horario');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Mi Horario" 
        description="Visualiza tus horarios asignados para el periodo académico actual." 
      />
      {/* Botones de acción */}
      <div className="flex justify-end mb-2 gap-2">
        <Button onClick={handleDownload} variant="outline" className="flex items-center" disabled={isDownloading}>
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Descargando...' : 'Descargar'}
        </Button>
        <Button onClick={handlePrint} variant="outline" className="flex items-center">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>
      {/* Selector de periodo, carrera y grupo */}
      <Card>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Label>Periodo Académico</Label>
            <select
              className="border rounded px-2 py-1"
              value={selectedPeriodo ?? ''}
              onChange={e => setSelectedPeriodo(Number(e.target.value))}
            >
              {periodos.map(periodo => (
                <option key={`periodo-${periodo.periodo_id}`} value={periodo.periodo_id}>{periodo.nombre_periodo}</option>
              ))}
            </select>
            <Label>Carrera</Label>
            <select
              className="border rounded px-2 py-1"
              value={selectedCarrera ?? ''}
              onChange={e => setSelectedCarrera(Number(e.target.value))}
            >
              {carreras.map((carrera, idx) => (
                <option key={`carrera-${carrera.carrera_id}-${idx}`} value={carrera.carrera_id}>{carrera.nombre_carrera}</option>
              ))}
            </select>
            <Label>Grupo</Label>
            <select
              className="border rounded px-2 py-1"
              value={selectedGrupo ?? ''}
              onChange={e => setSelectedGrupo(Number(e.target.value))}
            >
              {gruposFiltrados.map((grupo, idx) => (
                <option key={`grupo-${grupo.grupo_id}-${idx}`} value={grupo.grupo_id}>{grupo.codigo_grupo}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>
      {/* Tabla de horario */}
      <div ref={printRef}>
        {horariosFiltrados.length > 0 ? (
          <HorarioGrid 
            bloques={bloques}
            horarios={horariosFiltrados}
            materias={materias}
            docentes={docentesUnicos}
            aulas={aulasUnicas}
            selectedGrupo={gruposFiltrados.find(g => g.grupo_id === Number(selectedGrupo)) || null}
          />
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center space-y-4">
                <Calendar className="h-16 w-16 mx-auto text-gray-300" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">No tienes horarios asignados</h3>
                  <p className="text-gray-500">Cuando se te asignen horarios, aparecerán aquí.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MiHorarioDocente; 
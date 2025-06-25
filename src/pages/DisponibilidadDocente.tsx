import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Upload, 
  RefreshCw, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle,
  Download,
  Save
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface BloqueHorario {
  bloque_def_id: number;
  nombre_bloque: string;
  hora_inicio: string;
  hora_fin: string;
  turno: string;
  dia_semana: number | null;
}

interface DisponibilidadBloque {
  disponibilidad_id: number;
  docente: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  esta_disponible: boolean;
  preferencia: number;
  origen_carga: string;
}

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface ApiResponse<T> {
  results: T[];
}

const diasSemana = [
  { id: 1, nombre: "Lunes", short: "Lun" },
  { id: 2, nombre: "Martes", short: "Mar" },
  { id: 3, nombre: "Miércoles", short: "Mié" },
  { id: 4, nombre: "Jueves", short: "Jue" },
  { id: 5, nombre: "Viernes", short: "Vie" },
  { id: 6, nombre: "Sábado", short: "Sáb" }
];

const turnos = [
  { codigo: 'M', nombre: 'Mañana', color: 'bg-yellow-100 text-yellow-800' },
  { codigo: 'T', nombre: 'Tarde', color: 'bg-orange-100 text-orange-800' },
  { codigo: 'N', nombre: 'Noche', color: 'bg-blue-100 text-blue-800' }
];

// Tipo auxiliar para errores de Axios
type AxiosError = {
  response?: {
    data?: {
      non_field_errors?: string[];
    };
  };
};

const DisponibilidadDocente = () => {
  const { role, user } = useAuth();
  const isAdmin = role === "Administrador";
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadBloque[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [periodosResponse, unidadesResponse, docentesResponse, bloquesResponse] = await Promise.all([
          fetchData<Periodo[] | ApiResponse<Periodo>>("academic-setup/periodos-academicos/?activo=true"),
          fetchData<UnidadAcademica[] | ApiResponse<UnidadAcademica>>("academic-setup/unidades-academicas/"),
          fetchData<Docente[] | ApiResponse<Docente>>("users/docentes/"),
          fetchData<BloqueHorario[]>("scheduling/bloques-horarios/")
        ]);

        // Procesar Periodos
        const periodosData = 'results' in periodosResponse ? periodosResponse.results : periodosResponse;
        setPeriodos(periodosData);
        if (periodosData.length > 0) {
          setSelectedPeriodo(periodosData[0].periodo_id);
        }
        
        // Procesar Unidades Académicas
        const unidadesData = 'results' in unidadesResponse ? unidadesResponse.results : unidadesResponse;
        setUnidades(unidadesData);
        if (unidadesData.length > 0) {
          setSelectedUnidad(unidadesData[0].unidad_id);
        }
        
        // Procesar Docentes y auto-seleccionar
        const docentesData = 'results' in docentesResponse ? docentesResponse.results : docentesResponse;
        setDocentes(docentesData);
        if (isAdmin && docentesData.length > 0) {
            setSelectedDocente(docentesData[0].docente_id);
        } else if (user?.docente_id) {
            setSelectedDocente(user.docente_id);
        }
        
        // Procesar Bloques Horarios
        const bloquesData = Array.isArray(bloquesResponse) ? bloquesResponse : [];
        const bloquesConDia = bloquesData.filter(b => b.dia_semana !== null);
        setBloques(bloquesConDia.sort((a, b) => {
          if ((a.dia_semana ?? 0) !== (b.dia_semana ?? 0)) {
            return (a.dia_semana || 0) - (b.dia_semana || 0);
          }
          return a.hora_inicio.localeCompare(b.hora_inicio);
        }));

      } catch (error) {
        console.error("Error loading initial data:", error);
        toast.error("Error al cargar los datos iniciales.");
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, user]);

  // Cargar disponibilidad cuando cambien los filtros
  useEffect(() => {
    if (selectedDocente && selectedPeriodo) {
      loadDisponibilidad();
    }
  }, [selectedDocente, selectedPeriodo]);

  const loadDisponibilidad = async () => {
    const docenteId = isAdmin ? selectedDocente : user?.docente_id;
    if (!docenteId || !selectedPeriodo) {
      setDisponibilidad([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.get(`/scheduling/disponibilidad-docentes/?docente=${docenteId}&periodo=${selectedPeriodo}`);
      setDisponibilidad(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error cargando disponibilidad:", error);
      toast.error("Error al cargar la disponibilidad");
      setDisponibilidad([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDisponibilidad = async (dia_id: number, bloque_id: number) => {
    const docenteId = isAdmin ? selectedDocente : user?.docente_id;
    if (!docenteId || !selectedPeriodo || isSaving) return;

    const existeBloque = disponibilidad.find(
      d => d.dia_semana === dia_id && d.bloque_horario === bloque_id
    );
    
    setIsSaving(true);
    
    try {
      if (existeBloque) {
        // Actualizar disponibilidad existente
        await client.patch(`/scheduling/disponibilidad-docentes/${existeBloque.disponibilidad_id}/`, {
          esta_disponible: !existeBloque.esta_disponible
        });
        
        setDisponibilidad(disponibilidad.map(d => 
          d.disponibilidad_id === existeBloque.disponibilidad_id
            ? { ...d, esta_disponible: !d.esta_disponible } 
            : d
        ));
      } else {
        // Crear nuevo registro de disponibilidad
        const newDisponibilidad = {
          docente: docenteId,
          periodo: selectedPeriodo,
          dia_semana: dia_id,
          bloque_horario: bloque_id,
          esta_disponible: true
        };
        
        const response = await client.post('/scheduling/disponibilidad-docentes/', newDisponibilidad);
        setDisponibilidad([...disponibilidad, response.data]);
      }
      
      toast.success("Disponibilidad actualizada");
    } catch (error) {
      console.error("Error actualizando disponibilidad:", error);
      toast.error("Error al actualizar la disponibilidad");
      await loadDisponibilidad();
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file || !selectedPeriodo) {
      toast.error("Seleccione un archivo y un periodo");
      return;
    }
    
    setIsUploading(true);
    
    try {
      const docenteId = isAdmin ? selectedDocente : user?.docente_id;
      if (!docenteId) {
        toast.error("No se ha podido identificar al docente");
        return;
      }
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('periodo_id', selectedPeriodo.toString());
      formData.append('docente_id', docenteId.toString());
      
      await client.post('/scheduling/acciones-horario/importar-disponibilidad-excel/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success("Disponibilidad cargada desde Excel");
      setFile(null);
      loadDisponibilidad();
    } catch (error) {
      console.error("Error cargando disponibilidad desde Excel:", error);
      toast.error("Error al cargar la disponibilidad desde Excel");
    } finally {
      setIsUploading(false);
    }
  };

  const isDisponible = (dia_id: number, bloque_id: number): boolean => {
    const bloqueDisponibilidad = disponibilidad.find(
      d => d.dia_semana === dia_id && d.bloque_horario === bloque_id
    );
    return bloqueDisponibilidad ? bloqueDisponibilidad.esta_disponible : false;
  };

  // Agrupar bloques por hora para mostrar en la tabla
  const bloquesPorHora = bloques.reduce((acc, bloque) => {
    const key = `${bloque.hora_inicio}-${bloque.hora_fin}`;
    if (!acc[key]) {
      acc[key] = { 
        hora_inicio: bloque.hora_inicio, 
        hora_fin: bloque.hora_fin, 
        bloques: [],
        turno: bloque.turno
      };
    }
    acc[key].bloques.push(bloque);
    return acc;
  }, {} as Record<string, { 
    hora_inicio: string; 
    hora_fin: string; 
    bloques: BloqueHorario[];
    turno: string;
  }>);
  
  const bloquesOrdenados = Object.values(bloquesPorHora).sort((a, b) => 
    a.hora_inicio.localeCompare(b.hora_inicio)
  );

  const getTurnoInfo = (turno: string) => {
    return turnos.find(t => t.codigo === turno) || { codigo: turno, nombre: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <PageHeader 
          title="Disponibilidad de Docentes" 
          description="Configuración de horarios disponibles para cada docente"
        />
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-red-500 font-medium">{error}</div>
            <Button 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Intentar nuevamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Disponibilidad de Docentes" 
        description="Configuración de horarios disponibles para cada docente"
      />

      {/* Panel de configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configuración
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Selector de docente */}
            {isAdmin && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Docente
                </Label>
                <Select 
                  onValueChange={(value) => setSelectedDocente(Number(value))}
                  value={selectedDocente?.toString() || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar docente" />
                  </SelectTrigger>
                  <SelectContent>
                    {docentes.map((docente) => (
                      <SelectItem key={docente.docente_id} value={docente.docente_id.toString()}>
                        {docente.nombres} {docente.apellidos}
                        <Badge variant="secondary" className="ml-2">
                          {docente.codigo_docente}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Selector de periodo */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Periodo Académico
              </Label>
              <Select 
                onValueChange={(value) => setSelectedPeriodo(Number(value))}
                value={selectedPeriodo?.toString() || ""}
                disabled={periodos.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar periodo" />
                </SelectTrigger>
                <SelectContent>
                  {periodos.map((periodo) => (
                    <SelectItem key={periodo.periodo_id} value={periodo.periodo_id.toString()}>
                      {periodo.nombre_periodo}
                      {periodo.activo && (
                        <Badge variant="default" className="ml-2">
                          Activo
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Acciones */}
            <div className="space-y-2">
              <Label>Acciones</Label>
              <div className="flex gap-2">
                <Button 
                  onClick={loadDisponibilidad} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Recargar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={!selectedDocente || !selectedPeriodo}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel de carga desde Excel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar desde Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="file-upload">Archivo Excel</Label>
              <Input 
                id="file-upload"
                type="file" 
                onChange={handleFileChange}
                accept=".xlsx,.xls"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Formato: Excel con columnas Día, Bloque, Disponible (1/0)
              </p>
            </div>
            <Button 
              onClick={handleFileUpload} 
              disabled={!file || isUploading || !selectedPeriodo}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Subir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de disponibilidad */}
      {selectedDocente && selectedPeriodo && bloques.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horario de Disponibilidad
              </span>
              <div className="flex gap-2">
                {turnos.map(turno => (
                  <Badge key={turno.codigo} className={turno.color}>
                    {turno.nombre}
                  </Badge>
                ))}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-academic-primary text-white">
                    <th className="p-4 text-left font-medium">Horario</th>
                    {diasSemana.map((dia) => (
                      <th key={dia.id} className="p-4 text-center font-medium min-w-[120px]">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{dia.short}</span>
                          <span className="text-xs opacity-90">{dia.nombre}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloquesOrdenados.map(({ hora_inicio, hora_fin, bloques: bloquesDelHorario, turno }) => {
                    const turnoInfo = getTurnoInfo(turno);
                    return (
                      <tr key={`${hora_inicio}-${hora_fin}`} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium border-r">
                          <div className="flex flex-col">
                            <span className="text-lg font-bold">
                              {hora_inicio} - {hora_fin}
                            </span>
                            <Badge className={`${turnoInfo.color} mt-1 w-fit`}>
                              {turnoInfo.nombre}
                            </Badge>
                          </div>
                        </td>
                        {diasSemana.map((dia) => {
                          const bloqueActual = bloquesDelHorario.find(b => b.dia_semana === dia.id);
                          const disponible = bloqueActual ? isDisponible(dia.id, bloqueActual.bloque_def_id) : false;
                          
                          return (
                            <td 
                              key={`${hora_inicio}-${hora_fin}-${dia.id}`} 
                              className="p-4 text-center border-r"
                            >
                              {bloqueActual ? (
                                <div className="flex flex-col items-center space-y-2">
                                  <Checkbox
                                    checked={disponible}
                                    onCheckedChange={() => handleToggleDisponibilidad(dia.id, bloqueActual.bloque_def_id)}
                                    disabled={isSaving}
                                    className="h-6 w-6"
                                  />
                                  <div className="flex items-center gap-1">
                                    {disponible ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className="text-xs font-medium">
                                      {disponible ? 'Disponible' : 'No disponible'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-300 text-center">
                                  <span className="text-xs">No definido</span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Estados de carga y error */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-academic-primary" />
            <p className="text-muted-foreground">Cargando disponibilidad...</p>
          </div>
        </div>
      )}

      {bloques.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <Clock className="h-16 w-16 mx-auto text-gray-300" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">No hay bloques horarios</h3>
                <p className="text-gray-500">No se encontraron bloques horarios definidos para mostrar.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedDocente || !selectedPeriodo ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <Calendar className="h-16 w-16 mx-auto text-gray-300" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Seleccione docente y periodo</h3>
                <p className="text-gray-500">Para ver la disponibilidad, seleccione un docente y un periodo académico.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default DisponibilidadDocente;

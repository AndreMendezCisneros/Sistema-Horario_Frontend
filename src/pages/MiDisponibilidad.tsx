import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import client from "@/utils/axiosClient";
import { fetchData } from "@/utils/crudHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, RefreshCw, Clock, CheckCircle, XCircle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import React from "react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Interfaces
interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
}

interface BloqueHorario {
  bloque_def_id: number;
  hora_inicio: string;
  hora_fin: string;
  orden: number;
  turno: string;
  dia_semana: number;
  nombre_bloque: string;
}

interface DisponibilidadBloque {
  disponibilidad_id: number;
  docente: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  esta_disponible: boolean;
}

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" }
];

type AxiosError = {
  response?: {
    data?: {
      non_field_errors?: string[];
    };
  };
};

const MiDisponibilidad = () => {
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadBloque[]>([]);
  
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plantillaError, setPlantillaError] = useState<string | null>(null);

  const docenteId = user?.docente_id;

  // Carga de datos inicial (periodos y bloques)
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const periodosResponse = await fetchData<{ results: Periodo[] }>("academic-setup/periodos-academicos/?activo=true");
        const periodosData = periodosResponse?.results ?? [];
        if (periodosData.length > 0) {
          setPeriodos(periodosData);
          setSelectedPeriodo(periodosData[0].periodo_id);
        } else {
          setPeriodos([]);
        }

        // Carga de bloques igual que en DisponibilidadDocente
        const bloquesResponse = await fetchData<{ results?: BloqueHorario[] } | BloqueHorario[]>("scheduling/bloques-horarios/");
        let bloquesData: BloqueHorario[] = [];
        if (Array.isArray(bloquesResponse)) {
          bloquesData = bloquesResponse as BloqueHorario[];
        } else if (
          bloquesResponse &&
          typeof bloquesResponse === 'object' &&
          'results' in bloquesResponse &&
          Array.isArray((bloquesResponse as { results?: BloqueHorario[] }).results)
        ) {
          bloquesData = (bloquesResponse as { results: BloqueHorario[] }).results ?? [];
        }
        setBloques(bloquesData.length > 0 ? bloquesData.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) : []);
      } catch (err) {
        setError("Error al cargar los datos iniciales.");
        toast.error("Error al cargar los datos iniciales");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Carga de la disponibilidad del docente
  const loadDisponibilidad = useCallback(async () => {
    if (!docenteId || !selectedPeriodo) {
      if (disponibilidad.length > 0) setDisponibilidad([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.get(`/scheduling/disponibilidad-docentes/?docente=${docenteId}&periodo=${selectedPeriodo}`);
      setDisponibilidad(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setError("Error al cargar la disponibilidad.");
      toast.error("Error al cargar la disponibilidad");
      setDisponibilidad([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriodo, docenteId]);

  useEffect(() => {
    loadDisponibilidad();
  }, [loadDisponibilidad]);

  const handleToggleDisponibilidad = async (dia_id: number, bloque_id: number) => {
    if (!docenteId || !selectedPeriodo || isSaving) return;

    const existeBloque = disponibilidad.find(d => d.dia_semana === dia_id && d.bloque_horario === bloque_id);
    setIsSaving(true);
    try {
      if (existeBloque) {
        await client.patch(`/scheduling/disponibilidad-docentes/${existeBloque.disponibilidad_id}/`, {
          esta_disponible: !existeBloque.esta_disponible
        });
      } else {
        const newDisponibilidad = {
          docente: docenteId,
          periodo: selectedPeriodo,
          dia_semana: dia_id,
          bloque_horario: bloque_id,
          esta_disponible: true
        };
        await client.post('/scheduling/disponibilidad-docentes/', newDisponibilidad);
      }
      toast.success("Disponibilidad actualizada");
      await loadDisponibilidad();
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.data?.non_field_errors) {
        toast.error(axiosError.response.data.non_field_errors[0]);
      } else {
        toast.error("Error al actualizar la disponibilidad");
      }
      await loadDisponibilidad();
    } finally {
      setIsSaving(false);
    }
  };

  // Función para descargar la plantilla Excel tipo matriz
  const handleDownloadTemplate = () => {
    if (bloques.length === 0) {
      toast.error("No hay bloques horarios disponibles para generar la plantilla");
      return;
    }

    // Obtener bloques únicos por hora_inicio/hora_fin/turno y ordenarlos por hora de inicio
    const bloquesUnicos = Array.from(
      new Map(
        bloques.map(b => [`${b.hora_inicio}-${b.hora_fin}-${b.turno}`, b])
      ).values()
    ).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

    // Encabezados: ["Bloque horario", "Turno", ...días]
    const headers = [
      "Bloque horario",
      "Turno",
      ...diasSemana.map(d => d.nombre)
    ];
    const templateData = [headers];

    // Cada fila: solo hora de inicio, turno, celdas vacías para cada día
    bloquesUnicos.forEach(bloque => {
      const row = [
        bloque.hora_inicio,
        bloque.turno === 'M' ? 'Mañana' : bloque.turno === 'T' ? 'Tarde' : 'Noche',
        ...diasSemana.map(() => "")
      ];
      templateData.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'plantilla_disponibilidad.xlsx');
    toast.success('Plantilla descargada correctamente');
  };

  // Utilidad para normalizar encabezados (sin tildes, minúsculas, sin espacios)
  function normalizarEncabezado(str: string) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita tildes
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  // Validar e importar archivo Excel tipo matriz
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlantillaError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFile(file);
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headers = json[0] as string[];
        // Validar encabezados (ya flexible)
        const encabezadosEsperados = [
          'bloquehorario',
          'turno',
          'lunes',
          'martes',
          'miercoles',
          'jueves',
          'viernes',
          'sabado',
        ];
        const headersNormalizados = headers.map(normalizarEncabezado);
        for (let i = 0; i < encabezadosEsperados.length; i++) {
          if (headersNormalizados[i] !== encabezadosEsperados[i]) {
            setPlantillaError('La plantilla debe tener los encabezados: Bloque horario, Turno y los días de la semana');
            setFile(null);
            return;
          }
        }
        // Validar filas y celdas
        const errores: string[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] as unknown[];
          if (!Array.isArray(row) || row.length < 8) {
            errores.push(`Fila ${i+1}: Faltan columnas.`);
            continue;
          }
          // Validar formato de hora (solo hora de inicio, formato HH:MM:SS)
          if (typeof row[0] !== 'string' || !/^[0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(row[0].trim())) {
            errores.push(`Fila ${i+1}: Formato de bloque horario inválido. Debe ser HH:MM:SS`);
          }
          // Validar turno
          if (!['Mañana','Tarde','Noche'].includes(String(row[1]))) {
            errores.push(`Fila ${i+1}: Turno inválido. Solo se permite Mañana, Tarde o Noche.`);
          }
          // Validar celdas: solo vacío o 1
          for (let j = 2; j < row.length; j++) {
            if (row[j] !== '' && row[j] !== 1 && row[j] !== '1' && row[j] !== 0 && row[j] !== '0' && row[j] !== null && typeof row[j] !== 'undefined') {
              errores.push(`Fila ${i+1}, columna ${headers[j]}: Solo se permite 1, 0 o vacío.`);
            }
          }
        }
        if (errores.length > 0) {
          setPlantillaError(errores.join('\n'));
          setFile(null);
          return;
        }
      } catch (err) {
        setPlantillaError('No se pudo leer el archivo. Asegúrate de que sea un Excel válido.');
        setFile(null);
      }
    }
  };

  // Adaptar handleFileUpload para convertir la matriz a la estructura esperada por el backend
  const handleFileUpload = async () => {
    if (!file || !selectedPeriodo) {
      toast.error("Seleccione un archivo y un periodo.");
      return;
    }
    if (!docenteId) {
      toast.error("No se ha podido identificar al docente.");
      return;
    }

    setIsUploading(true);
    try {
      console.log("Enviando archivo:", file.name);
      console.log("Periodo ID:", selectedPeriodo);
      console.log("Docente ID:", docenteId);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("periodo_id", selectedPeriodo.toString());
      formData.append("docente_id", docenteId.toString());
      
      const response = await client.post("/scheduling/acciones-horario/importar-disponibilidad-excel/", formData);
      
      console.log("Respuesta del servidor:", response.data);
      toast.success("Archivo subido y procesado con éxito.");
      // Recargar toda la página tras importar
      window.location.reload();
      setFile(null);
    } catch (error: any) {
      console.error("Error al subir archivo:", error);
      if (error.response?.data?.error) {
        toast.error(`Error: ${error.response.data.error}`);
      } else if (error.response?.data?.errores) {
        toast.error(`Errores en el archivo: ${error.response.data.errores.join(', ')}`);
      } else {
        toast.error("Error al subir el archivo.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const getBloquesPorTurno = (turno: string) => {
    return bloques
      .filter(b => b.turno === turno)
      .filter((b, index, self) => self.findIndex(t => t.hora_inicio === b.hora_inicio) === index);
  };

  const turnos = [
    { id: "M", nombre: "Mañana" },
    { id: "T", nombre: "Tarde" },
    { id: "N", nombre: "Noche" }
  ];

  const isDisponible = (dia_id: number, bloque_id: number): boolean => {
    const bloque = disponibilidad.find(d => d.dia_semana === dia_id && d.bloque_horario === bloque_id);
    return bloque ? bloque.esta_disponible : false;
  };
  
  const getBloqueId = (dia_id: number, hora_inicio: string): number | undefined => {
    return bloques.find(b => b.dia_semana === dia_id && b.hora_inicio === hora_inicio)?.bloque_def_id;
  };

  // Agrupar bloques por hora para mostrar en la tabla (igual que DisponibilidadDocente)
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
    bloques: typeof bloques;
    turno: string;
  }>);
  const bloquesOrdenados = Object.values(bloquesPorHora).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  if (isLoading && !periodos.length) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="Mi Disponibilidad" 
        description="Configure los horarios en los que está disponible para enseñar." 
      />

      {/* Apartado para descargar plantilla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Plantilla para Importar Disponibilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={handleDownloadTemplate} variant="outline">
              Descargar Plantilla Excel
            </Button>
            <span className="text-sm text-muted-foreground">Formato: Día, Bloque, Disponible (1=Sí, 0=No)</span>
          </div>
        </CardContent>
      </Card>

      {/* Panel de configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Periodo Académico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Periodo Académico</Label>
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
              {plantillaError && <p className="text-sm text-red-600 mt-1">{plantillaError}</p>}
            </div>
            <Button 
              onClick={handleFileUpload} 
              disabled={!file || isUploading || !selectedPeriodo || !!plantillaError}
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
      {docenteId && selectedPeriodo && bloques.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horario de Disponibilidad
              </span>
              <div className="flex gap-2">
                <Badge className="bg-yellow-100 text-yellow-800">Mañana</Badge>
                <Badge className="bg-orange-100 text-orange-800">Tarde</Badge>
                <Badge className="bg-blue-100 text-blue-800">Noche</Badge>
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
                          <span className="text-sm font-bold">{dia.nombre.slice(0,3)}</span>
                          <span className="text-xs opacity-90">{dia.nombre}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bloquesOrdenados.map(({ hora_inicio, hora_fin, bloques: bloquesDelHorario, turno }) => {
                    const turnoInfo = turno === 'M' ? { nombre: 'Mañana', color: 'bg-yellow-100 text-yellow-800' } :
                                      turno === 'T' ? { nombre: 'Tarde', color: 'bg-orange-100 text-orange-800' } :
                                      { nombre: 'Noche', color: 'bg-blue-100 text-blue-800' };
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
                          const disponibilidadBloque = bloqueActual ? disponibilidad.find(d => d.bloque_horario === bloqueActual.bloque_def_id) : undefined;
                          const disponible = disponibilidadBloque ? disponibilidadBloque.esta_disponible : false;
                          return (
                            <td key={`${hora_inicio}-${hora_fin}-${dia.id}`} className="p-4 text-center border-r">
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

      {!docenteId || !selectedPeriodo ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <Clock className="h-16 w-16 mx-auto text-gray-300" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Seleccione periodo</h3>
                <p className="text-gray-500">Para ver la disponibilidad, seleccione un periodo académico.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default MiDisponibilidad; 
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { fetchData, createItem, updateItem, deleteItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
}

interface Materia { 
  materia_id: number;
  nombre_materia: string;
  codigo_materia: string;
}

interface PeriodoAcademico {
  periodo_id: number;
  nombre_periodo: string;
}

interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  codigo_docente: string;
}

interface MateriaDetalle {
  materia_id: number;
  codigo_materia: string;
  nombre_materia: string;
  descripcion: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  horas_academicas_laboratorio: number;
  horas_totales: number;
  requiere_tipo_espacio_especifico: number | null;
  requiere_tipo_espacio_nombre: string | null;
  estado: boolean;
}

interface CarreraDetalle {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  horas_totales_curricula: number;
  unidad: number;
  unidad_nombre: string;
}

interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
  materias_detalle: MateriaDetalle[];
  carrera: number;
  carrera_detalle: CarreraDetalle;
  periodo: number;
  periodo_nombre: string;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
  docente_asignado_directamente: number | null;
  docente_asignado_directamente_nombre: string | null;
}

interface Column {
  header: string;
  key: string;
  render?: (row: any) => React.ReactNode;
}

// Schema for form validation
const formSchema = z.object({
  codigo_grupo: z.string().min(1, "El código es obligatorio"),
  materias: z.array(z.number()).min(1, "Debe seleccionar al menos una materia"),
  carrera: z.number().min(1, "Debe seleccionar una carrera"),
  periodo: z.number().min(1, "Debe seleccionar un período"),
  numero_estudiantes_estimado: z.coerce.number().min(1, "Debe ingresar un número válido de estudiantes"),
  turno_preferente: z.string().min(1, "Debe seleccionar un turno"),
  docente_asignado_directamente: z.union([
    z.coerce.number().min(1),
    z.literal("").transform(() => null),
    z.null()
  ]),
});

const turnos = [
  { value: "M", label: "Mañana" },
  { value: "T", label: "Tarde" },
  { value: "N", label: "Noche" },
];

const Grupos = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [materiasFiltradas, setMateriasFiltradas] = useState<Materia[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentGrupo, setCurrentGrupo] = useState<Grupo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_grupo: "",
      materias: [],
      carrera: 0,
      periodo: 0,
      numero_estudiantes_estimado: 0,
      turno_preferente: "M",
      docente_asignado_directamente: null,
    },
  });
  
  const carreraId = form.watch("carrera");
  
  const loadGrupos = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetchData<{ results: Grupo[], count: number }>(`scheduling/grupos/?page=${page}`);
      setGrupos(response.results || []);
      setPagination(prev => ({ ...prev, count: response.count || 0, page }));
    } catch (error) {
      console.error("Error cargando grupos:", error);
      toast.error("Error al cargar los grupos");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update materias when carrera changes
  useEffect(() => {
    console.log("[Grupos] carreraId cambiado:", carreraId);
    
    if (carreraId && carreraId > 0) {
      // Usar el endpoint específico para obtener materias por carrera
      const loadMateriasPorCarrera = async () => {
        try {
          const response = await fetchData<{materias: Materia[], count: number}>(`academic-setup/materias/por-carrera/${carreraId}/`);
          if (response && response.materias) {
            console.log("[Grupos] materias cargadas para carrera", carreraId, ":", response.materias);
            setMateriasFiltradas(response.materias);
          } else {
            console.log("[Grupos] No se encontraron materias para la carrera", carreraId);
            setMateriasFiltradas([]);
          }
        } catch (error) {
          console.error("[Grupos] Error cargando materias por carrera:", error);
          setMateriasFiltradas([]);
        }
      };
      
      loadMateriasPorCarrera();
    } else {
      console.log("[Grupos] No hay carrera seleccionada, limpiando materias filtradas");
      setMateriasFiltradas([]);
    }
  }, [carreraId]);

  const loadMateriasPorCarrera = async (carreraId: number) => {
    if (!carreraId || carreraId <= 0) {
      setMateriasFiltradas([]);
      return;
    }
    try {
      // Endpoint corregido para usar la ruta anidada correcta
      const response = await fetchData<{ results: Materia[] }>(`academic-setup/carreras/${carreraId}/materias/`);
      if (response && response.results) {
        setMateriasFiltradas(response.results);
      } else {
        setMateriasFiltradas([]);
      }
    } catch (error) {
      console.error("[Grupos] Error cargando materias por carrera:", error);
      setMateriasFiltradas([]);
    }
  };

  useEffect(() => {
    // Carga los datos principales de los grupos
    loadGrupos(pagination.page);

    // Carga los datos auxiliares una sola vez
    const loadAuxData = async () => {
      try {
        const [carrerasResponse, materiasResponse, periodosResponse, docentesResponse] = await Promise.all([
          fetchData<{ results: Carrera[] }>("academic-setup/carreras/"),
          fetchData<{ results: Materia[] }>("academic-setup/materias/"),
          fetchData<{ results: PeriodoAcademico[] }>("academic-setup/periodos-academicos/"),
          fetchData<{ results: Docente[] }>("users/docentes/")
        ]);
        
        setCarreras(carrerasResponse.results || []);
        setMaterias(materiasResponse.results || []);
        setPeriodos(periodosResponse.results || []);
        setDocentes(docentesResponse.results || []);
      } catch (error) {
        console.error("Error loading aux data:", error);
        toast.error("Error al cargar datos auxiliares");
      }
    };

    loadAuxData();
  }, []);

  const handleOpenModal = (grupo?: Grupo) => {
    if (grupo) {
      setCurrentGrupo(grupo);
      // Cargar las materias de la carrera del grupo que se está editando
      loadMateriasPorCarrera(grupo.carrera);
      form.reset({
        codigo_grupo: grupo.codigo_grupo,
        materias: grupo.materias,
        carrera: grupo.carrera,
        periodo: grupo.periodo,
        numero_estudiantes_estimado: grupo.numero_estudiantes_estimado,
        turno_preferente: grupo.turno_preferente,
        docente_asignado_directamente: grupo.docente_asignado_directamente,
      });
    } else {
      setCurrentGrupo(null);
      // Limpiar las materias filtradas cuando se crea un nuevo grupo
      setMateriasFiltradas([]);
      form.reset({
        codigo_grupo: "",
        materias: [],
        carrera: 0,
        periodo: 0,
        numero_estudiantes_estimado: 0,
        turno_preferente: "M",
        docente_asignado_directamente: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentGrupo(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentGrupo) {
        // Update existing grupo
        await updateItem<Grupo>(
          "scheduling/grupos/", 
          currentGrupo.grupo_id, 
          values
        );
        toast.success("Grupo actualizado exitosamente");
        // Recargar la página actual
        loadGrupos(pagination.page);
      } else {
        // Create new grupo
        await createItem<Grupo>(
          "scheduling/grupos/", 
          values
        );
        toast.success("Grupo creado exitosamente");
        // Ir a la página 1 para ver el nuevo grupo
        loadGrupos(1);
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving grupo:", error);
      toast.error("Error al guardar el grupo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (grupo: Grupo) => {
    setCurrentGrupo(grupo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentGrupo) return;
    
    try {
      await deleteItem("scheduling/grupos/", currentGrupo.grupo_id);
      toast.success("Grupo eliminado exitosamente");
      // Recargar la página actual después de eliminar
      loadGrupos(pagination.page);
    } catch (error) {
      console.error("Error deleting grupo:", error);
      toast.error("Error al eliminar el grupo");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentGrupo(null);
    }
  };

  const getTurnoLabel = (value: string) => {
    return turnos.find(t => t.value === value)?.label || value;
  };

  const columns: Column[] = [
    {
      header: "Código",
      key: "codigo_grupo",
    },
    {
      header: "Materia",
      key: "materias_detalle",
      render: (row) => row.materias_detalle.map(md => md.nombre_materia).join(", ") || "N/A",
    },
    {
      header: "Carrera",
      key: "carrera_detalle",
      render: (row) => row.carrera_detalle?.nombre_carrera || "N/A",
    },
    {
      header: "Período",
      key: "periodo_nombre",
      render: (row) => row.periodo_nombre || "N/A",
    },
    {
      header: "Estudiantes",
      key: "numero_estudiantes_estimado",
    },
    {
      header: "Turno",
      key: "turno_preferente",
      render: (row) => getTurnoLabel(row.turno_preferente),
    },
    {
      header: "Docente Asignado",
      key: "docente_asignado_directamente_nombre",
      render: (row) => row.docente_asignado_directamente_nombre || "No asignado",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader
        title="Gestión de Grupos"
        description="Administre los grupos académicos del sistema"
        onAdd={() => handleOpenModal()}
      />

      <DataTable
        data={grupos}
        columns={columns}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Página {pagination.page} de {Math.ceil(pagination.count / pagination.pageSize)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadGrupos(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadGrupos(pagination.page + 1)}
          disabled={pagination.page >= Math.ceil(pagination.count / pagination.pageSize)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentGrupo ? "Editar Grupo" : "Nuevo Grupo"}
        form={
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_grupo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código del Grupo</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="carrera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carrera</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una carrera" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {carreras.map((carrera) => (
                          <SelectItem
                            key={carrera.carrera_id}
                            value={carrera.carrera_id.toString()}
                          >
                            {carrera.nombre_carrera}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="materias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Materias</FormLabel>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                      {materiasFiltradas.map((materia) => (
                        <div key={materia.materia_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`materia-${materia.materia_id}`}
                            checked={field.value?.includes(materia.materia_id) || false}
                            onCheckedChange={(checked) => {
                              const currentMaterias = field.value || [];
                              if (checked) {
                                field.onChange([...currentMaterias, materia.materia_id]);
                              } else {
                                field.onChange(currentMaterias.filter(id => id !== materia.materia_id));
                              }
                            }}
                          />
                          <label
                            htmlFor={`materia-${materia.materia_id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {materia.nombre_materia} ({materia.codigo_materia})
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Período</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un período" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {periodos.map((periodo) => (
                          <SelectItem
                            key={periodo.periodo_id}
                            value={periodo.periodo_id.toString()}
                          >
                            {periodo.nombre_periodo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numero_estudiantes_estimado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Estudiantes</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="turno_preferente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno Preferente</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un turno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {turnos.map((turno) => (
                          <SelectItem key={turno.value} value={turno.value}>
                            {turno.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="docente_asignado_directamente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Docente Asignado</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "0" ? null : Number(value))}
                      value={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un docente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">No asignar</SelectItem>
                        {docentes.map((docente) => (
                          <SelectItem
                            key={docente.docente_id}
                            value={docente.docente_id.toString()}
                          >
                            {`${docente.nombres} ${docente.apellidos}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={isSaving}
        isValid={form.formState.isValid}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Grupo"
        description="¿Está seguro que desea eliminar este grupo? Esta acción no se puede deshacer."
      />
    </div>
  );
};

export default Grupos;

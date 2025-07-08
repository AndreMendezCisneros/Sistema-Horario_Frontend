import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchData, createItem, updateItem, deleteItem, getItemById } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
}

interface TipoEspacio {
  tipo_espacio_id: number;
  nombre_tipo_espacio: string;
}

interface Ciclo {
  ciclo_id: number;
  nombre_ciclo: string;
  orden: number;
  carrera: number;
}

interface Especialidad {
  especialidad_id: number;
  nombre_especialidad: string;
}

interface Materia {
  materia_id: number;
  codigo_materia: string;
  nombre_materia: string;
  descripcion: string | null;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  horas_academicas_laboratorio: number;
  horas_totales: number;
  requiere_tipo_espacio_especifico: number | null;
  requiere_tipo_espacio_nombre: string | null;
  estado: boolean;
  carrera: number;
  carrera_detalle?: {
    carrera_id: number;
    nombre_carrera: string;
    codigo_carrera: string;
    unidad: number;
    unidad_nombre?: string;
  };
  ciclo_id?: number;
  especialidades_detalle: Especialidad[];
}

interface CarreraMateria {
  id: number;
  carrera: number;
  materia: number;
  ciclo: number | null;
  ciclo_nombre: string | null;
}

const Materias = () => {
  const { id: carreraId, unidadId } = useParams<{ id: string, unidadId: string }>();
  const [carrera, setCarrera] = useState<Carrera | null>(null);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [tiposEspacios, setTiposEspacios] = useState<TipoEspacio[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentMateria, setCurrentMateria] = useState<Materia | null>(null);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  const [currentCarrera, setCurrentCarrera] = useState<Carrera | null>(null);
  const [allCarreras, setAllCarreras] = useState<Carrera[]>([]);
  const [carreraMaterias, setCarreraMaterias] = useState<CarreraMateria[]>([]);
  const [cicloPorMateria, setCicloPorMateria] = useState<Record<number, string[]>>({});

  // Validar que el ID de la carrera sea válido
  useEffect(() => {
    if (!carreraId || isNaN(parseInt(carreraId))) {
      toast.error("ID de carrera inválido");
      navigate("/admin/unidades");
      return;
    }
  }, [carreraId, navigate]);

  const loadAllMaterias = async () => {
    if (!carreraId || isNaN(parseInt(carreraId))) return;
    setIsLoading(true);
    try {
      let allResults: Materia[] = [];
      let page = 1;
      let hasNext = true;
      while (hasNext) {
        const materiasResponse = await fetchData<ApiResponse<Materia>>(
          `academic-setup/carreras/${carreraId}/materias/?page=${page}`
        );
        allResults = allResults.concat(materiasResponse.results || []);
        hasNext = !!materiasResponse.next;
        page++;
      }
      setMaterias(allResults);
      setPagination(prev => ({ ...prev, count: allResults.length, page: 1 }));
    } catch (error) {
      toast.error("Error al cargar las materias");
    } finally {
      setIsLoading(false);
    }
  };

  // Load carrera, materias, and tipos de espacios on component mount
  useEffect(() => {
    if (!carreraId || isNaN(parseInt(carreraId))) {
      return;
    }
    
    const loadAuxData = async () => {
      try {
        const [tiposEspacioResponse, carreraResponse, allCarrerasResponse, especialidadesResponse] = await Promise.all([
          fetchData<{ results: TipoEspacio[] }>("academic-setup/tipos-espacio/"),
          carreraId ? fetchData<Carrera>(`academic-setup/carreras/${carreraId}/`) : Promise.resolve(null),
          fetchData<{ results: Carrera[] }>("academic-setup/carreras/"),
          fetchData<Especialidad[] | { results: Especialidad[] }>("academic-setup/especialidades/")
        ]);

        if (carreraResponse) {
          setCarrera(carreraResponse);
          setCurrentCarrera(carreraResponse);
        } else {
          toast.error("No se encontró la carrera");
          navigate("/admin/unidades");
          return;
        }

        if (tiposEspacioResponse && Array.isArray(tiposEspacioResponse.results)) {
          setTiposEspacios(tiposEspacioResponse.results);
        } else {
          setTiposEspacios([]);
        }

        if (allCarrerasResponse && Array.isArray(allCarrerasResponse.results)) {
          setAllCarreras(allCarrerasResponse.results);
        } else {
          setAllCarreras([]);
        }

        if (especialidadesResponse) {
          const especialidadesData = 'results' in especialidadesResponse ? especialidadesResponse.results : especialidadesResponse;
          setEspecialidades(especialidadesData);
        } else {
          setEspecialidades([]);
        }
      } catch (error) {
        console.error("Error loading aux data:", error);
        toast.error("Error al cargar datos auxiliares");
      }
    };
    
    loadAuxData();
    loadAllMaterias();
  }, [carreraId, navigate]);

  // Muevo fetchAllCarreraMaterias fuera del useEffect para que esté disponible globalmente
  const fetchAllCarreraMaterias = async () => {
    if (!carreraId) return;
    let allResults: CarreraMateria[] = [];
    let page = 1;
    let hasNext = true;
    let totalPages = 0;
    try {
      while (hasNext) {
        const response = await fetchData<{ results: CarreraMateria[], next: string | null }>(`academic-setup/carrera-materias/?carrera=${carreraId}&page=${page}`);
        allResults = allResults.concat(response.results || []);
        hasNext = !!response.next;
        page++;
        totalPages++;
        console.log(`[CarreraMaterias] Página ${page - 1} cargada, resultados acumulados:`, allResults.length);
      }
      setCarreraMaterias(allResults);
      // Crear un mapa materia_id -> lista de ciclos
      const map: Record<number, string[]> = {};
      (allResults || []).forEach(cm => {
        if (cm.materia) {
          if (!map[cm.materia]) map[cm.materia] = [];
          if (cm.ciclo_nombre && !map[cm.materia].includes(cm.ciclo_nombre)) {
            map[cm.materia].push(cm.ciclo_nombre);
          }
        }
      });
      console.log(`[CarreraMaterias] Total páginas: ${totalPages}, Total relaciones: ${allResults.length}`);
      console.log('[CarreraMaterias] Mapeo final materia_id -> ciclos:', map);
      setCicloPorMateria(map);
    } catch (error) {
      setCarreraMaterias([]);
      setCicloPorMateria({});
      console.error('[CarreraMaterias] Error al cargar relaciones:', error);
    }
  };

  // En el useEffect original, solo llamo a fetchAllCarreraMaterias()
  useEffect(() => {
    if (!carreraId) return;
    fetchAllCarreraMaterias();
  }, [carreraId]);

  // Schema for form validation
  const formSchema = z.object({
    codigo_materia: z.string().min(1, "El código es obligatorio"),
    nombre_materia: z.string().min(1, "El nombre es obligatorio"),
    descripcion: z.string().optional(),
    horas_academicas_teoricas: z.coerce.number().min(0, "Debe ser un número positivo"),
    horas_academicas_practicas: z.coerce.number().min(0, "Debe ser un número positivo"),
    horas_academicas_laboratorio: z.coerce.number().min(0, "Debe ser un número positivo"),
    requiere_tipo_espacio_especifico: z.union([
      z.coerce.number().min(1, "Debe seleccionar un tipo de espacio"),
      z.literal("").transform(() => null),
      z.null()
    ]),
    estado: z.boolean().default(true),
    carreras: z.array(z.number()).min(1, "Debe seleccionar al menos una carrera"),
    ciclo_id: z.coerce.number().optional(),
    especialidades_ids: z.array(z.number()).optional(),
  }).refine(data => {
    if (data.carreras.length > 1) {
        return true;
    }
    return !!data.ciclo_id;
  }, {
    message: "Debe seleccionar un ciclo cuando elige una sola carrera",
    path: ["ciclo_id"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo_materia: "",
      nombre_materia: "",
      descripcion: "",
      horas_academicas_teoricas: 0,
      horas_academicas_practicas: 0,
      horas_academicas_laboratorio: 0,
      requiere_tipo_espacio_especifico: null,
      estado: true,
      carreras: carreraId ? [parseInt(carreraId)] : [],
      ciclo_id: undefined,
      especialidades_ids: [],
    },
  });

  const selectedCarrerasInForm = form.watch("carreras");

  useEffect(() => {
    const fetchCiclos = async () => {
      if (selectedCarrerasInForm && selectedCarrerasInForm.length === 1) {
        const singleCarreraId = selectedCarrerasInForm[0];
        try {
          const response = await fetchData<Ciclo[]>(`academic-setup/ciclos/?carrera_id=${singleCarreraId}`);
          if (response) {
            setCiclos(response || []);
          } else {
            setCiclos([]);
          }
        } catch (error) {
          console.error(`Error al cargar ciclos para la carrera ${singleCarreraId}:`, error);
          toast.error("No se pudieron cargar los ciclos para la carrera seleccionada.");
          setCiclos([]);
        }
      } else {
        setCiclos([]);
      }
    };

    fetchCiclos();

    const currentCarreras = form.getValues("carreras");
    if (currentCarreras.length !== 1) {
      form.setValue("ciclo_id", undefined);
    }
  }, [selectedCarrerasInForm, form]);

  const handleOpenModal = (materia?: Materia) => {
    if (materia) {
      setCurrentMateria(materia);
      form.reset({
        ...materia,
        requiere_tipo_espacio_especifico: materia.requiere_tipo_espacio_especifico || null,
        carreras: [parseInt(carreraId!)],
        ciclo_id: materia.ciclo_id,
        especialidades_ids: materia.especialidades_detalle?.map(e => e.especialidad_id) || [],
        estado: materia.estado,
      });
    } else {
      setCurrentMateria(null);
      form.reset({
        codigo_materia: "",
        nombre_materia: "",
        descripcion: "",
        horas_academicas_teoricas: 0,
        horas_academicas_practicas: 0,
        horas_academicas_laboratorio: 0,
        requiere_tipo_espacio_especifico: null,
        estado: true,
        carreras: carreraId ? [parseInt(carreraId)] : [],
        ciclo_id: undefined,
        especialidades_ids: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentMateria(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();

    try {
      if (currentMateria) {
        const { carreras, ciclo_id, ...updateData } = values;
        await updateItem<Materia>(
          "academic-setup/materias/",
          currentMateria.materia_id,
          updateData
        );
        // --- NUEVO: Si el ciclo fue cambiado, actualiza CarreraMaterias ---
        if (carreras && carreras.length === 1 && ciclo_id) {
          // Buscar la relación CarreraMaterias para esta materia y carrera
          const carreraActualId = carreras[0];
          const relacion = carreraMaterias.find(cm => cm.materia === currentMateria.materia_id && cm.carrera === carreraActualId);
          console.log("[Editar ciclo] ciclo_id seleccionado:", ciclo_id);
          console.log("[Editar ciclo] Relación encontrada:", relacion);
          if (relacion && relacion.ciclo !== ciclo_id) {
            try {
              const resp = await updateItem(
                "academic-setup/carrera-materias/",
                relacion.id,
                { 
                  carrera: relacion.carrera,
                  materia: relacion.materia,
                  ciclo: ciclo_id
                }
              );
              console.log("[Editar ciclo] PATCH CarreraMaterias respuesta:", resp);
            } catch (err) {
              console.error("[Editar ciclo] Error PATCH CarreraMaterias:", err);
              toast.error("Error al actualizar el ciclo de la materia en la carrera");
            }
          } else if (!relacion) {
            toast.warning("No se encontró la relación Carrera-Materia para editar el ciclo.");
          }
        }
        toast.success("Materia actualizada exitosamente.");
        loadAllMaterias();
        await fetchAllCarreraMaterias();
      } else {
        await createItem<Materia>(
          "academic-setup/materias/", 
          values
        );
        toast.success("Materia creada y asignada a la carrera exitosamente");
        loadAllMaterias();
        await fetchAllCarreraMaterias();
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving materia:", error);
      toast.error("Error al guardar la materia");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (materia: Materia) => {
    setCurrentMateria(materia);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentMateria) return;
    
    try {
      await deleteItem("academic-setup/materias/", currentMateria.materia_id);
      toast.success("Materia eliminada exitosamente");
      loadAllMaterias();
      await fetchAllCarreraMaterias();
    } catch (error) {
      console.error("Error deleting materia:", error);
      toast.error("Error al eliminar la materia");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentMateria(null);
    }
  };

  const columns = [
    { key: "codigo_materia", header: "Código" },
    { key: "nombre_materia", header: "Nombre" },
    { 
      key: "horas", 
      header: "Horas (T/P/L/Total)", 
      render: (row: Materia) => (
        <span>
          {row.horas_academicas_teoricas}/{row.horas_academicas_practicas}/{row.horas_academicas_laboratorio}/
          {row.horas_totales}
        </span>
      )
    },
    { 
      key: "horas_totales", 
      header: "Horas Totales", 
      render: (row: Materia) => `${row.horas_totales}`
    },
    {
      key: "ciclo",
      header: "Ciclo",
      render: (row: Materia) => {
        const ciclos = cicloPorMateria[row.materia_id];
        return ciclos && ciclos.length > 0 ? (
          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
            {ciclos.join(", ")}
          </span>
        ) : (
          <span className="text-gray-400">Sin ciclo</span>
        );
      }
    },
    { 
      key: "requiere_tipo_espacio_especifico", 
      header: "Espacio Requerido",
      render: (row: Materia) => row.requiere_tipo_espacio_nombre || <span className="text-gray-400">N/A</span>
    },
    {
      key: "especialidades_detalle",
      header: "Especialidades Requeridas",
      render: (row: Materia) => {
        if (!row.especialidades_detalle || row.especialidades_detalle.length === 0) {
          return <span className="text-gray-500">Ninguna</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.especialidades_detalle.map(e => (
              <span key={e.especialidad_id} className="bg-gray-200 text-gray-800 rounded px-2 py-0.5 text-xs">{e.nombre_especialidad}</span>
            ))}
          </div>
        );
      }
    },
    { 
      key: "estado", 
      header: "Estado", 
      render: (row: Materia) => (
        <span className={row.estado ? "text-green-600" : "text-red-600"}>
          {row.estado ? "Activo" : "Inactivo"}
        </span>
      )
    },
  ];

  // Agrupación de materias por ciclo
  const carreraActualId = carrera?.carrera_id || parseInt(carreraId!);
  const materiasPorCiclo: Record<string, { nombre: string, orden: number, materias: Materia[] }> = {};
  const materiasSinCiclo: Materia[] = [];

  materias.forEach(materia => {
    // Buscar todas las relaciones para la materia y la carrera actual
    const relaciones = carreraMaterias.filter(
      cm => cm.materia === materia.materia_id && cm.carrera === carreraActualId
    );
    // Prioriza la relación con ciclo válido
    const relacionConCiclo = relaciones.find(cm => cm.ciclo_nombre && cm.ciclo !== null);
    if (relacionConCiclo) {
      const key = relacionConCiclo.ciclo_nombre!;
      // Buscar el ciclo para obtener el orden
      const cicloObj = ciclos.find(c => c.nombre_ciclo === relacionConCiclo.ciclo_nombre);
      const orden = cicloObj ? cicloObj.orden : 9999;
      if (!materiasPorCiclo[key]) {
        materiasPorCiclo[key] = { nombre: relacionConCiclo.ciclo_nombre!, orden, materias: [] };
      }
      materiasPorCiclo[key].materias.push(materia);
    } else {
      materiasSinCiclo.push(materia);
    }
  });

  const groupedColumns = [
    { key: "codigo_materia", header: "Código" },
    { key: "nombre_materia", header: "Nombre" },
    { 
      key: "horas", 
      header: "Horas (T/P/L/Total)", 
      render: (row: Materia) => (
        <span>
          {row.horas_academicas_teoricas}/{row.horas_academicas_practicas}/{row.horas_academicas_laboratorio}/
          {row.horas_totales}
        </span>
      )
    },
    { 
      key: "horas_totales", 
      header: "Horas Totales", 
      render: (row: Materia) => `${row.horas_totales}`
    },
    {
      key: "ciclo",
      header: "Ciclo",
      render: (row: Materia) => {
        const ciclos = cicloPorMateria[row.materia_id];
        return ciclos && ciclos.length > 0 ? (
          <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">
            {ciclos.join(", ")}
          </span>
        ) : (
          <span className="text-gray-400">Sin ciclo</span>
        );
      }
    },
    { 
      key: "requiere_tipo_espacio_especifico", 
      header: "Espacio Requerido",
      render: (row: Materia) => row.requiere_tipo_espacio_nombre || <span className="text-gray-400">N/A</span>
    },
    {
      key: "especialidades_detalle",
      header: "Especialidades Requeridas",
      render: (row: Materia) => {
        if (!row.especialidades_detalle || row.especialidades_detalle.length === 0) {
          return <span className="text-gray-500">Ninguna</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.especialidades_detalle.map(e => (
              <span key={e.especialidad_id} className="bg-gray-200 text-gray-800 rounded px-2 py-0.5 text-xs">{e.nombre_especialidad}</span>
            ))}
          </div>
        );
      }
    },
    { 
      key: "estado", 
      header: "Estado", 
      render: (row: Materia) => (
        <span className={row.estado ? "text-green-600" : "text-red-600"}>
          {row.estado ? "Activo" : "Inactivo"}
        </span>
      )
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row: Materia) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleOpenModal(row)}>
            Editar
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDelete(row)}>
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/admin/unidades/${carrera?.unidad}/carreras`)}
          className="mb-4"
          disabled={!carrera}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Carreras
        </Button>
        
        <PageHeader 
          title={`Materias: ${carrera?.nombre_carrera || 'Cargando...'}`}
          description={`Administración de materias para la carrera ${carrera?.codigo_carrera || ''}`}
          onAdd={() => handleOpenModal()}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <>
          {/* Vista agrupada por ciclo, ordenada */}
          {Object.values(materiasPorCiclo)
            .sort((a, b) => a.orden - b.orden)
            .map(({ nombre, materias }) => (
              <div key={nombre} className="mb-8 bg-white rounded shadow p-4">
                <h2 className="text-lg font-bold mb-2">{nombre.toUpperCase()}</h2>
                <table className="min-w-full border text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {groupedColumns.map(col => (
                        <th key={col.key} className="px-2 py-1 border">{col.header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materias.map(materia => (
                      <tr key={materia.materia_id}>
                        {groupedColumns.map(col => (
                          <td key={col.key} className="px-2 py-1 border">
                            {col.render ? col.render(materia) : (materia as Materia)[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          {/* Sin ciclo al final */}
          {materiasSinCiclo.length > 0 && (
            <div className="mb-8 bg-white rounded shadow p-4">
              <h2 className="text-lg font-bold mb-2">Sin ciclo</h2>
              <table className="min-w-full border text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    {groupedColumns.map(col => (
                      <th key={col.key} className="px-2 py-1 border">{col.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {materiasSinCiclo.map(materia => (
                    <tr key={materia.materia_id}>
                      {groupedColumns.map(col => (
                        <td key={col.key} className="px-2 py-1 border">
                          {col.render ? col.render(materia) : (materia as Materia)[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentMateria ? "Editar Materia" : "Crear Nueva Materia"}
        description="Complete los detalles de la materia. Los campos marcados con * son obligatorios."
        onSubmit={handleSave}
        isSubmitting={isSaving}
        isValid={form.formState.isValid}
        form={
          <Form {...form}>
            <div className="space-y-4">
              {/* Fila 1: Código y Nombre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="codigo_materia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código</FormLabel>
                      <FormControl>
                        <Input placeholder="Código de la materia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nombre_materia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre de la materia" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fila 2: Descripción */}
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción de la materia" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fila 3: Horas académicas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="horas_academicas_teoricas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Teóricas</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horas_academicas_practicas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Prácticas</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="horas_academicas_laboratorio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Laboratorio</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Fila 4: Tipo de Espacio y Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <FormField
                  control={form.control}
                  name="requiere_tipo_espacio_especifico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Espacio Requerido</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value === "null" ? null : parseInt(value))}
                        value={field.value?.toString() ?? "null"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo de espacio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="null">Ninguno</SelectItem>
                          {tiposEspacios.map((tipo) => (
                            <SelectItem key={tipo.tipo_espacio_id} value={tipo.tipo_espacio_id.toString()}>
                              {tipo.nombre_tipo_espacio}
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
                  name="estado"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                      <div className="space-y-0.5">
                        <FormLabel>Estado</FormLabel>
                        <FormDescription>
                          {field.value ? "Materia activa" : "Materia inactiva"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Fila 5: Carreras y Ciclo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="carreras"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrera(s)</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={allCarreras.map(c => ({ value: String(c.carrera_id), label: c.nombre_carrera }))}
                          onValueChange={(values) => {
                            const numberValues = values.map(Number);
                            field.onChange(numberValues);
                            if(numberValues.length !== 1) {
                              form.setValue("ciclo_id", undefined); // Reset ciclo if not a single carrera
                            }
                          }}
                          defaultValue={field.value.map(String)}
                          placeholder="Seleccionar carreras..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  {currentMateria && cicloPorMateria[currentMateria.materia_id] && cicloPorMateria[currentMateria.materia_id].length > 0 && (
                    <div className="mb-2 text-blue-700 font-semibold text-sm">
                      Ciclo actual: <span className="bg-blue-100 px-2 py-0.5 rounded">{cicloPorMateria[currentMateria.materia_id].join(', ')}</span>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="ciclo_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciclo</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString() || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar ciclo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ciclos.map(ciclo => (
                              <SelectItem key={ciclo.ciclo_id} value={ciclo.ciclo_id.toString()}>
                                {ciclo.nombre_ciclo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Fila 6: Especialidades */}
              <FormField
                control={form.control}
                name="especialidades_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidades Requeridas</FormLabel>
                     <FormControl>
                       <MultiSelect
                         options={especialidades.map(e => ({ value: String(e.especialidad_id), label: e.nombre_especialidad }))}
                         onValueChange={(values) => field.onChange(values.map(Number))}
                         defaultValue={field.value?.map(String) || []}
                         placeholder="Seleccionar especialidades..."
                       />
                     </FormControl>
                    <FormDescription>
                      ¿Qué especialidades se necesitan para dictar esta materia?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        }
      />

      {/* Confirmation dialog for deleting */}
      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Materia"
        description={`¿Está seguro que desea eliminar la materia "${currentMateria?.nombre_materia}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Materias;
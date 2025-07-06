import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchData, createItem, updateItem, deleteItem } from "@/utils/crudHelpers";
import DataTable from "@/components/DataTable";
import FormModal from "@/components/FormModal";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import PageHeader from "@/components/PageHeader";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { PeriodoAcademico, ApiResponse } from "@/types/periodoAcademico";

// Schema for form validation
const formSchema = z.object({
  nombre_periodo: z.string().min(1, "El nombre del período es obligatorio"),
  fecha_inicio: z.string().min(1, "La fecha de inicio es obligatoria"),
  fecha_fin: z.string().min(1, "La fecha de fin es obligatoria"),
  activo: z.boolean().default(true),
}).refine((data) => {
  const inicio = new Date(data.fecha_inicio);
  const fin = new Date(data.fecha_fin);
  return inicio <= fin;
}, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["fecha_fin"],
});

const PeriodoAcademico = () => {
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPeriodo, setCurrentPeriodo] = useState<PeriodoAcademico | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_periodo: "",
      fecha_inicio: "",
      fecha_fin: "",
      activo: true,
    },
  });

  const loadPeriodos = async (page: number) => {
    setIsLoading(true);
    try {
      const periodosData = await fetchData<ApiResponse<PeriodoAcademico>>(
        `academic-setup/periodos-academicos/?page=${page}`
      );
      if (periodosData) {
        // Debug: mostrar los datos que llegan del backend
        console.log('Datos de períodos académicos:', periodosData.results);
        if (periodosData.results && periodosData.results.length > 0) {
          console.log('Primer período:', periodosData.results[0]);
          console.log('Fecha inicio:', periodosData.results[0].fecha_inicio, 'tipo:', typeof periodosData.results[0].fecha_inicio);
          console.log('Fecha fin:', periodosData.results[0].fecha_fin, 'tipo:', typeof periodosData.results[0].fecha_fin);
        }
        
        setPeriodos(periodosData.results || []);
        setPagination(prev => ({ ...prev, count: periodosData.count || 0, page }));
      }
    } catch (error) {
      console.error("Error cargando períodos académicos:", error);
      toast.error("Error al cargar los períodos académicos");
    } finally {
      setIsLoading(false);
    }
  };

  // Load periodos on component mount
  useEffect(() => {
    loadPeriodos(pagination.page);
  }, []);

  const formatDateForInput = (dateString: string) => {
    try {
      // Convertir la fecha para el input type="date" (formato YYYY-MM-DD)
      const date = new Date(dateString + 'T00:00:00');
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return format(date, "yyyy-MM-dd");
    } catch (error) {
      console.error('Error formateando fecha para input:', error);
      return dateString;
    }
  };

  const handleOpenModal = (periodo?: PeriodoAcademico) => {
    if (periodo) {
      setCurrentPeriodo(periodo);
      form.reset({
        nombre_periodo: periodo.nombre_periodo,
        fecha_inicio: formatDateForInput(periodo.fecha_inicio),
        fecha_fin: formatDateForInput(periodo.fecha_fin),
        activo: periodo.activo,
      });
    } else {
      setCurrentPeriodo(null);
      form.reset({
        nombre_periodo: "",
        fecha_inicio: "",
        fecha_fin: "",
        activo: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPeriodo(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentPeriodo) {
        // Update existing periodo
        await updateItem<PeriodoAcademico>(
          "academic-setup/periodos-academicos/", 
          currentPeriodo.periodo_id, 
          values
        );
        toast.success("Período académico actualizado exitosamente.");
        loadPeriodos(pagination.page);
      } else {
        // Create new periodo
        await createItem<PeriodoAcademico>(
          "academic-setup/periodos-academicos/", 
          values
        );
        toast.success("Período académico creado exitosamente.");
        loadPeriodos(1);
      }
      handleCloseModal();
    } catch (error) {
      toast.error("Error al guardar el período académico.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (periodo: PeriodoAcademico) => {
    setCurrentPeriodo(periodo);
    setIsDeleteDialogOpen(true);
  };

  const handleViewGrupos = (periodo: PeriodoAcademico) => {
    navigate(`/admin/seleccion-carrera?periodo=${periodo.periodo_id}`);
  };

  const confirmDelete = async () => {
    if (!currentPeriodo) return;
    
    try {
      await deleteItem("academic-setup/periodos-academicos/", currentPeriodo.periodo_id);
      toast.success("Período académico eliminado exitosamente.");
      loadPeriodos(pagination.page);
    } catch (error) {
      toast.error("Error al eliminar el período académico.");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentPeriodo(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Las fechas vienen en formato ISO (YYYY-MM-DD) desde el backend
      const date = new Date(dateString + 'T00:00:00');
      
      // Verificar si la fecha es válida
      if (isNaN(date.getTime())) {
        console.error('Fecha inválida:', dateString);
        return dateString;
      }
      
      return format(date, "dd/MM/yyyy", { locale: es });
    } catch (error) {
      console.error('Error formateando fecha:', error, 'Fecha original:', dateString);
      return dateString;
    }
  };

  const columns = [
    {
      key: "nombre_periodo",
      header: "Nombre del Período",
      render: (periodo: PeriodoAcademico) => (
        <div className="font-medium">{periodo.nombre_periodo}</div>
      ),
    },
    {
      key: "fecha_inicio",
      header: "Fecha de Inicio",
      render: (periodo: PeriodoAcademico) => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {formatDate(periodo.fecha_inicio)}
        </div>
      ),
    },
    {
      key: "fecha_fin",
      header: "Fecha de Fin",
      render: (periodo: PeriodoAcademico) => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {formatDate(periodo.fecha_fin)}
        </div>
      ),
    },
    {
      key: "activo",
      header: "Estado",
      render: (periodo: PeriodoAcademico) => (
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          periodo.activo 
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }`}>
          {periodo.activo ? "Activo" : "Inactivo"}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Períodos Académicos</h1>
          <p className="text-gray-500">Administración de períodos académicos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all"
        >
          + Agregar Período
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {periodos.map((periodo) => (
            <div
              key={periodo.periodo_id}
              className="border-2 border-blue-400 rounded-xl p-6 flex flex-col justify-between min-h-[200px] bg-gray-50 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-xl font-bold leading-tight">{periodo.nombre_periodo}</h2>
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(periodo)} className="text-gray-500 hover:text-blue-500" title="Editar">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button onClick={() => handleDelete(periodo)} className="text-gray-500 hover:text-red-500" title="Eliminar">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CalendarIcon className="h-4 w-4" />
                  <span><strong>Inicio:</strong> {formatDate(periodo.fecha_inicio)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CalendarIcon className="h-4 w-4" />
                  <span><strong>Fin:</strong> {formatDate(periodo.fecha_fin)}</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${
                  periodo.activo 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                }`}>
                  {periodo.activo ? "Activo" : "Inactivo"}
                </div>
              </div>
              
              <button
                onClick={() => handleViewGrupos(periodo)}
                className="bg-blue-100 text-blue-700 font-semibold py-2 rounded-lg hover:bg-blue-200 transition-all flex items-center justify-center gap-2"
              >
                <Users className="h-4 w-4" />
                Ver Grupos
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Página {pagination.page} de {Math.ceil(pagination.count / pagination.pageSize)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadPeriodos(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadPeriodos(pagination.page + 1)}
          disabled={pagination.page >= Math.ceil(pagination.count / pagination.pageSize)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentPeriodo ? "Editar Período Académico" : "Nuevo Período Académico"}
        form={
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Período</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Primer Semestre 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fecha_inicio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fecha_fin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Fin</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="activo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Período Activo</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Marca esta opción si el período está actualmente activo
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={isSaving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Período Académico"
        description={`¿Estás seguro de que quieres eliminar el período "${currentPeriodo?.nombre_periodo}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous={true}
      />
    </div>
  );
};

export default PeriodoAcademico; 
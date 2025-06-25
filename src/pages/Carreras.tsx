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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface Carrera {
  id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  horas_totales_curricula: number;
  unidad: number;
  carrera_id: number;
}

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Schema for form validation
const formSchema = z.object({
  nombre_carrera: z.string().min(1, "El nombre es obligatorio"),
  codigo_carrera: z.string().min(1, "El código es obligatorio"),
  horas_totales_curricula: z.coerce.number().min(1, "Las horas son obligatorias"),
  unidad: z.number(),
});

const Carreras = () => {
  const { id: unidadId } = useParams<{ id: string }>();
  const [unidad, setUnidad] = useState<UnidadAcademica | null>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCarrera, setCurrentCarrera] = useState<Carrera | null>(null);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_carrera: "",
      codigo_carrera: "",
      horas_totales_curricula: 0,
      unidad: parseInt(unidadId || "0"),
    },
  });

  const loadCarreras = async (page: number) => {
    if (!unidadId) return;
    setIsLoading(true);
    try {
      const carrerasData = await fetchData<ApiResponse<Carrera>>(
        `academic-setup/carreras/?unidad=${unidadId}&page=${page}`
      );
      setCarreras(carrerasData.results || []);
      setPagination(prev => ({ ...prev, count: carrerasData.count || 0, page }));
    } catch (error) {
      console.error("Error cargando carreras:", error);
      toast.error("Error al cargar las carreras");
    } finally {
      setIsLoading(false);
    }
  };

  // Load unidad and carreras on component mount
  useEffect(() => {
    if (!unidadId) {
      navigate("/admin/unidades");
      return;
    }
    
    const loadUnidad = async () => {
      try {
        const unidadData = await getItemById<UnidadAcademica>(
          "academic-setup/unidades-academicas/",
          unidadId
        );
        if (unidadData) {
          setUnidad(unidadData);
        } else {
          toast.error("Unidad académica no encontrada.");
          navigate("/admin/unidades");
        }
      } catch (error) {
        toast.error("Error al cargar la unidad académica.");
        navigate("/admin/unidades");
      }
    };
    
    loadUnidad();
    loadCarreras(pagination.page);
  }, [unidadId, navigate]);

  useEffect(() => {
    if (unidadId) {
      loadCarreras(1);
    }
  }, [unidadId]);

  const handleOpenModal = (carrera?: Carrera) => {
    if (carrera) {
      setCurrentCarrera(carrera);
      form.reset({
        nombre_carrera: carrera.nombre_carrera,
        codigo_carrera: carrera.codigo_carrera,
        horas_totales_curricula: carrera.horas_totales_curricula,
        unidad: carrera.unidad,
      });
    } else {
      setCurrentCarrera(null);
      form.reset({
        nombre_carrera: "",
        codigo_carrera: "",
        horas_totales_curricula: 0,
        unidad: parseInt(unidadId || "0"),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCarrera(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentCarrera) {
        // Update existing carrera
        await updateItem<Carrera>(
          "academic-setup/carreras/", 
          currentCarrera.carrera_id, 
          values
        );
        toast.success("Carrera actualizada exitosamente.");
        loadCarreras(pagination.page);
      } else {
        // Create new carrera
        await createItem<Carrera>(
          "academic-setup/carreras/", 
          values
        );
        toast.success("Carrera creada exitosamente.");
        loadCarreras(1);
      }
      handleCloseModal();
    } catch (error) {
      toast.error("Error al guardar la carrera.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (carrera: Carrera) => {
    setCurrentCarrera(carrera);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentCarrera) return;
    
    try {
      await deleteItem("academic-setup/carreras/", currentCarrera.carrera_id);
      toast.success("Carrera eliminada exitosamente.");
      loadCarreras(pagination.page);
    } catch (error) {
      toast.error("Error al eliminar la carrera.");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentCarrera(null);
    }
  };

  const handleViewMaterias = (carrera: Carrera) => {
    navigate(`/admin/carreras/${carrera.carrera_id}/materias`);
  };

  const columns = [
    { key: "codigo_carrera", header: "Código" },
    { key: "nombre_carrera", header: "Nombre" },
    { key: "horas_totales_curricula", header: "Horas totales" },
    { 
      key: "actions", 
      header: "Materias", 
      render: (row: Carrera) => (
        <button 
          onClick={() => handleViewMaterias(row)}
          className="text-academic-primary hover:underline"
        >
          Ver materias
        </button>
      )
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/admin/unidades")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Unidades Académicas
        </Button>
        
        <PageHeader 
          title={`Carreras: ${unidad?.nombre_unidad || 'Cargando...'}`}
          description="Administración de carreras para esta unidad académica"
          onAdd={() => handleOpenModal()}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={carreras} 
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-muted-foreground">
          Página {pagination.page} de {Math.ceil(pagination.count / pagination.pageSize)}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadCarreras(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadCarreras(pagination.page + 1)}
          disabled={pagination.page >= Math.ceil(pagination.count / pagination.pageSize)}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Form modal for creating/editing */}
      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentCarrera ? "Editar Carrera" : "Crear Carrera"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="codigo_carrera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Código de la carrera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nombre_carrera"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la carrera" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="horas_totales_curricula"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horas totales</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Horas totales" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unidad"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={isSaving}
      />

      {/* Confirmation dialog for deleting */}
      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Carrera"
        description={`¿Está seguro que desea eliminar la carrera "${currentCarrera?.nombre_carrera}"? Esta acción no se puede deshacer y eliminará todas las materias asociadas.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Carreras;

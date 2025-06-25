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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define the shape of a unidad académica
interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
  descripcion: string;
}

// Schema for form validation
const formSchema = z.object({
  nombre_unidad: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
});

const UnidadesAcademicas = () => {
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentUnidad, setCurrentUnidad] = useState<UnidadAcademica | null>(null);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_unidad: "",
      descripcion: "",
    },
  });

  // Load unidades on component mount
  useEffect(() => {
    loadUnidades(1);
  }, []);

  const loadUnidades = async (page: number) => {
    setIsLoading(true);
    try {
      const data = await fetchData<{ count: number; next: string | null; previous: string | null; results: UnidadAcademica[] }>(`academic-setup/unidades-academicas/?page=${page}`);
      if (data && Array.isArray(data.results)) {
        setUnidades(data.results);
        setPagination({ count: data.count, page, pageSize: 10 });
      }
    } catch (error) {
      toast.error("Error al cargar las unidades académicas.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (unidad?: UnidadAcademica) => {
    if (unidad) {
      setCurrentUnidad(unidad);
      form.reset({
        nombre_unidad: unidad.nombre_unidad,
        descripcion: unidad.descripcion,
      });
    } else {
      setCurrentUnidad(null);
      form.reset({
        nombre_unidad: "",
        descripcion: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUnidad(null);
  };

 const handleSave = async () => {
  const isValid = await form.trigger();
  if (!isValid) return;

  setIsSaving(true);
  const values = form.getValues();

  try {
    if (currentUnidad) {
      if (!currentUnidad.unidad_id) {
        toast.error("ID de la unidad académica no está definido.");
        setIsSaving(false);
        return;
      }
      // Update existing unidad
      await updateItem<UnidadAcademica>(
        "academic-setup/unidades-academicas/",
        currentUnidad.unidad_id,
        values
      );
      toast.success("Unidad académica actualizada exitosamente.");
      loadUnidades(pagination.page);
    } else {
      // Create new unidad
      await createItem<UnidadAcademica>(
        "academic-setup/unidades-academicas/",
        values
      );
      toast.success("Unidad académica creada exitosamente.");
      loadUnidades(1);
    }
    handleCloseModal();
  } catch (error) {
    toast.error("Error al guardar la unidad académica.");
  } finally {
    setIsSaving(false);
  }
};
  const handleDelete = (unidad: UnidadAcademica) => {
    setCurrentUnidad(unidad);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentUnidad) return;
    
    try {
      await deleteItem("academic-setup/unidades-academicas/", currentUnidad.unidad_id);
      toast.success("Unidad académica eliminada exitosamente.");
      loadUnidades(pagination.page);
    } catch (error) {
      toast.error("Error al eliminar la unidad académica.");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentUnidad(null);
    }
  };

  const handleViewCarreras = (unidad: UnidadAcademica) => {
    navigate(`/admin/unidades/${unidad.unidad_id}/carreras`);
  };

  const columns = [
    { key: "unidad_id", header: "ID" },
    { key: "nombre_unidad", header: "Nombre" },
    { key: "descripcion", header: "Descripción" },
    { 
      key: "actions", 
      header: "Carreras", 
      render: (row: UnidadAcademica) => (
        <button 
          onClick={() => handleViewCarreras(row)}
          className="text-academic-primary hover:underline"
        >
          Ver carreras
        </button>
      )
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Unidades Académicas" 
        description="Administración de unidades académicas"
        onAdd={() => handleOpenModal()}
      />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={unidades} 
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
          onClick={() => loadUnidades(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadUnidades(pagination.page + 1)}
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
        title={currentUnidad ? "Editar Unidad Académica" : "Crear Unidad Académica"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_unidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la unidad académica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descripción de la unidad académica" {...field} />
                    </FormControl>
                    <FormMessage />
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
        title="Eliminar Unidad Académica"
        description={`¿Está seguro que desea eliminar la unidad "${currentUnidad?.nombre_unidad}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default UnidadesAcademicas;

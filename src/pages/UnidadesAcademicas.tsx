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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Unidades Académicas</h1>
          <p className="text-gray-500">Administración de unidades académicas</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-5 py-2 rounded-lg shadow transition-all"
        >
          + Agregar Unidad
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {unidades.map((unidad) => (
          <div
            key={unidad.unidad_id}
            className="border-2 border-yellow-400 rounded-xl p-6 flex flex-col justify-between min-h-[180px] bg-gray-50 hover:shadow-lg transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-xl font-bold leading-tight">{unidad.nombre_unidad}</h2>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(unidad)} className="text-gray-500 hover:text-yellow-500" title="Editar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z" /></svg>
                </button>
                <button onClick={() => handleDelete(unidad)} className="text-gray-500 hover:text-red-500" title="Eliminar">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-700 mb-2">ID: {unidad.unidad_id}</div>
            <div className="text-gray-600 text-sm mb-4">{unidad.descripcion || 'Sin descripción'}</div>
            <button
              onClick={() => handleViewCarreras(unidad)}
              className="bg-yellow-100 text-yellow-700 font-semibold py-2 rounded-lg hover:bg-yellow-200 transition-all"
            >
              Seleccionar
            </button>
          </div>
        ))}
      </div>

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
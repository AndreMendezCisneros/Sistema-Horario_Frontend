import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Interfaces
interface Ciclo {
  ciclo_id: number;
  nombre_ciclo: string;
  orden: number;
  carrera: number;
  carrera_nombre: string;
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
}

// Schema for form validation
const formSchema = z.object({
  nombre_ciclo: z.string().min(1, "El nombre es obligatorio"),
  orden: z.coerce.number().min(1, "El orden debe ser un número positivo"),
  carrera: z.coerce.number().min(1, "Debe seleccionar una carrera"),
});

const Ciclos = () => {
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCiclo, setCurrentCiclo] = useState<Ciclo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre_ciclo: "",
      orden: 1,
      carrera: 0,
    },
  });

  const loadCiclos = async (page: number) => {
    setIsLoading(true);
    try {
      // Nota: El backend para ciclos no está paginado, pero lo manejamos así para consistencia
      const data = await fetchData<Ciclo[]>(`academic-setup/ciclos/?page=${page}`);
      setCiclos(data || []);
      // Como no hay paginación real, simulamos el 'count'
      setPagination({ count: data?.length || 0, page, pageSize: 1000 }); // Un pageSize grande para mostrar todo
    } catch (error) {
      toast.error("Error al cargar los ciclos.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadAuxData = async () => {
    try {
      const carrerasResponse = await fetchData<{ results: Carrera[] }>("academic-setup/carreras/");
      if (carrerasResponse && carrerasResponse.results) {
        setCarreras(carrerasResponse.results);
      }
    } catch (error) {
      toast.error("Error al cargar las carreras.");
    }
  };

  useEffect(() => {
    loadCiclos(1);
    loadAuxData();
  }, []);

  const handleOpenModal = (ciclo?: Ciclo) => {
    if (ciclo) {
      setCurrentCiclo(ciclo);
      form.reset({
        nombre_ciclo: ciclo.nombre_ciclo,
        orden: ciclo.orden,
        carrera: ciclo.carrera,
      });
    } else {
      setCurrentCiclo(null);
      form.reset({
        nombre_ciclo: "",
        orden: 1,
        carrera: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentCiclo(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();

    try {
      if (currentCiclo) {
        await updateItem<Ciclo>("academic-setup/ciclos/", currentCiclo.ciclo_id, values);
        toast.success("Ciclo actualizado exitosamente.");
      } else {
        await createItem<Ciclo>("academic-setup/ciclos/", values);
        toast.success("Ciclo creado exitosamente.");
      }
      loadCiclos(1); // Recargar
      handleCloseModal();
    } catch (error) {
      toast.error("Error al guardar el ciclo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (ciclo: Ciclo) => {
    setCurrentCiclo(ciclo);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentCiclo) return;
    
    try {
      await deleteItem("academic-setup/ciclos/", currentCiclo.ciclo_id);
      toast.success("Ciclo eliminado exitosamente.");
      loadCiclos(1); // Recargar
    } catch (error) {
      toast.error("Error al eliminar el ciclo.");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentCiclo(null);
    }
  };

  const columns = [
    { key: "nombre_ciclo", header: "Nombre del Ciclo" },
    { key: "carrera_nombre", header: "Carrera" },
    { key: "orden", header: "Orden" },
  ];

  if (isLoading && ciclos.length === 0) {
    return <div className="flex justify-center my-12"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto py-6">
      <PageHeader 
        title="Gestión de Ciclos Académicos" 
        description="Cree y administre los ciclos o semestres de cada carrera."
        onAdd={() => handleOpenModal()}
      />

      <DataTable 
        data={ciclos} 
        columns={columns}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      {/* No hay paginación porque el endpoint no la soporta */}

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={currentCiclo ? "Editar Ciclo" : "Nuevo Ciclo"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="nombre_ciclo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Ciclo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Semestre I, Ciclo 3, Año 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="orden"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Orden Numérico</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Ej: 1" {...field} />
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
                          <SelectValue placeholder="Seleccione la carrera a la que pertenece el ciclo" />
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
            </div>
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
        title="Eliminar Ciclo"
        description={`¿Está seguro que desea eliminar el ciclo "${currentCiclo?.nombre_ciclo}"?`}
      />
    </div>
  );
};

export default Ciclos; 
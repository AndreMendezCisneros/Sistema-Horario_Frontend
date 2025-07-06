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
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

interface Usuario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Especialidad {
  especialidad_id: number;
  nombre_especialidad: string;
}

interface Docente {
  docente_id: number;
  usuario: number | null;
  codigo_docente: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  tipo_contrato: string;
  max_horas_semanales: number;
  unidad_principal: number;
  especialidades_detalle: Especialidad[];
}

// Schema for form validation
const formSchema = z.object({
  usuario: z.number().optional().nullable(),
  codigo_docente: z.string().min(1, "El código es obligatorio"),
  nombres: z.string().min(1, "Los nombres son obligatorios"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  dni: z.string().min(1, "El DNI es obligatorio"),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional(),
  tipo_contrato: z.string().min(1, "El tipo de contrato es obligatorio"),
  max_horas_semanales: z.coerce.number().min(1, "Las horas semanales son obligatorias"),
  unidad_principal: z.number({ required_error: "La unidad académica es obligatoria." }),
  especialidades: z.array(z.number()).optional(), // Se enviarán los IDs de las especialidades
});

const tiposContrato = [
  { value: "TC", label: "Tiempo Completo" },
  { value: "MT", label: "Medio Tiempo" },
  { value: "TP", label: "Tiempo Parcial" },
];

const Docentes = () => {
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [unidades, setUnidades] = useState<UnidadAcademica[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEspecialidades, setIsLoadingEspecialidades] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDocente, setCurrentDocente] = useState<Docente | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({ count: 0, page: 1, pageSize: 10 });
  
  // Función para cargar todas las páginas de especialidades
  const loadAllEspecialidades = async (): Promise<Especialidad[]> => {
    setIsLoadingEspecialidades(true);
    const allEspecialidades: Especialidad[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      try {
        const response = await fetchData<ApiResponse<Especialidad>>(`academic-setup/especialidades/?page=${page}`);
        if (response && 'results' in response) {
          allEspecialidades.push(...response.results);
          hasMore = !!response.next;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error cargando página ${page} de especialidades:`, error);
        hasMore = false;
      }
    }
    
    setIsLoadingEspecialidades(false);
    return allEspecialidades;
  };
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      usuario: undefined,
      codigo_docente: "",
      nombres: "",
      apellidos: "",
      dni: "",
      email: "",
      telefono: "",
      tipo_contrato: "TC",
      max_horas_semanales: 40,
      unidad_principal: undefined,
      especialidades: [],
    },
  });

  const loadDocentes = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await fetchData<ApiResponse<Docente> | Docente[]>(`users/docentes/?page=${page}`);
      
      if (response && 'results' in response) {
        // Paginated response
        setDocentes(response.results || []);
        setPagination(prev => ({ ...prev, count: response.count || 0, page }));
      } else if (response && Array.isArray(response)) {
        // Non-paginated response (simple array)
        setDocentes(response);
        setPagination({ count: response.length, page: 1, pageSize: response.length || 10 });
      } else {
        // Handle unexpected response format
        setDocentes([]);
        setPagination({ count: 0, page: 1, pageSize: 10 });
      }

    } catch (error) {
      console.error("Error cargando docentes:", error);
      toast.error("Error al cargar los docentes");
      setDocentes([]); // Ensure it's empty on error
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDocentes(pagination.page);

    const loadAuxData = async () => {
      try {
        const [unidadesResponse, usuariosResponse, especialidadesResponse] = await Promise.all([
          fetchData<UnidadAcademica[] | ApiResponse<UnidadAcademica>>("academic-setup/unidades-academicas/"),
          fetchData<Usuario[] | ApiResponse<Usuario>>("users/all/"),
          loadAllEspecialidades()
        ]);
        
        setUnidades('results' in unidadesResponse ? unidadesResponse.results : unidadesResponse);
        setUsuarios('results' in usuariosResponse ? usuariosResponse.results : usuariosResponse);
        setEspecialidades(especialidadesResponse);

      } catch (error) {
        console.error("Error loading aux data:", error);
        toast.error("Error al cargar datos auxiliares");
      }
    };
    
    loadAuxData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = (docente?: Docente) => {
    if (docente) {
      setCurrentDocente(docente);
      form.reset({
        usuario: docente.usuario || undefined,
        codigo_docente: docente.codigo_docente,
        nombres: docente.nombres,
        apellidos: docente.apellidos,
        dni: docente.dni,
        email: docente.email,
        telefono: docente.telefono || "",
        tipo_contrato: docente.tipo_contrato || "TC",
        max_horas_semanales: docente.max_horas_semanales,
        unidad_principal: docente.unidad_principal || undefined,
        especialidades: docente.especialidades_detalle.map(e => e.especialidad_id) || [],
      });
    } else {
      setCurrentDocente(null);
      form.reset({
        usuario: undefined,
        codigo_docente: "",
        nombres: "",
        apellidos: "",
        dni: "",
        email: "",
        telefono: "",
        tipo_contrato: "TC",
        max_horas_semanales: 40,
        unidad_principal: undefined,
        especialidades: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentDocente(null);
  };

  const handleSave = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsSaving(true);
    const values = form.getValues();
    
    try {
      if (currentDocente) {
        // Update existing docente
        await updateItem<Docente>(
          "users/docentes/", 
          currentDocente.docente_id, 
          values
        );
        toast.success("Docente actualizado exitosamente.");
        loadDocentes(pagination.page);
      } else {
        // Create new docente
        await createItem<Docente>(
          "users/docentes/", 
          values
        );
        toast.success("Docente creado exitosamente.");
        loadDocentes(1);
      }
      handleCloseModal();
    } catch (error) {
      toast.error("Error al guardar el docente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (docente: Docente) => {
    setCurrentDocente(docente);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentDocente) return;
    
    try {
      await deleteItem("users/docentes/", currentDocente.docente_id);
      toast.success("Docente eliminado exitosamente.");
      loadDocentes(pagination.page);
    } catch (error) {
      toast.error("Error al eliminar el docente.");
    } finally {
      setIsDeleteDialogOpen(false);
      setCurrentDocente(null);
    }
  };

  const getUnidadNombre = (unidadId: number) => {
    const unidad = unidades.find(u => u.unidad_id === unidadId);
    return unidad ? unidad.nombre_unidad : "Desconocido";
  };

  const columns = [
    { key: "codigo_docente", header: "Código" },
    { 
      key: "nombre_completo", 
      header: "Nombre completo", 
      render: (row: Docente) => `${row.nombres} ${row.apellidos}`
    },
    { key: "dni", header: "DNI" },
    { key: "email", header: "Email" },
    { key: "telefono", header: "Teléfono" },
    { 
      key: "tipo_contrato", 
      header: "Tipo contrato",
      render: (row: Docente) => tiposContrato.find(t => t.value === row.tipo_contrato)?.label || row.tipo_contrato
    },
    { key: "max_horas_semanales", header: "Máx. horas" },
    { 
      key: "unidad_principal", 
      header: "Unidad académica",
      render: (row: Docente) => getUnidadNombre(row.unidad_principal)
    },
    {
      key: "especialidades",
      header: "Especialidades",
      render: (row: Docente) => (
        <ul className="list-disc list-inside space-y-1">
          {row.especialidades_detalle.map(e => (
            <li key={e.especialidad_id}>{e.nombre_especialidad}</li>
          ))}
        </ul>
      )
    },
  ];

  return (
    <div className="container mx-auto py-6 bg-gray-100 min-h-screen">
      <PageHeader 
        title="Docentes" 
        description="Administración de docentes"
        onAdd={() => handleOpenModal()}
      />

      {isLoading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-academic-primary"></div>
        </div>
      ) : (
        <DataTable 
          data={docentes} 
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
          onClick={() => loadDocentes(pagination.page - 1)}
          disabled={pagination.page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadDocentes(pagination.page + 1)}
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
        title={currentDocente ? "Editar Docente" : "Crear Docente"}
        form={
          <Form {...form}>
            <div className="space-y-4">
              {usuarios.length > 0 && (
                <FormField
                  control={form.control}
                  name="usuario"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario del sistema (opcional)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                        value={field.value?.toString() || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar usuario" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usuarios.map((usuario) => (
                            <SelectItem key={usuario.id} value={usuario.id.toString()}>
                              {usuario.username} ({usuario.first_name} {usuario.last_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="codigo_docente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="Código del docente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombres"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombres</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombres" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellidos</FormLabel>
                      <FormControl>
                        <Input placeholder="Apellidos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input placeholder="DNI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Teléfono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo_contrato"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de contrato</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "TC"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tiposContrato.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              {tipo.label}
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
                  name="max_horas_semanales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Máximo horas semanales</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="unidad_principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidad académica principal</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {unidades.map((unidad) => (
                          <SelectItem key={unidad.unidad_id} value={unidad.unidad_id.toString()}>
                            {unidad.nombre_unidad}
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
                name="especialidades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidades</FormLabel>
                    <FormControl>
                      {isLoadingEspecialidades ? (
                        <div className="flex items-center space-x-2 p-3 border rounded-md bg-muted">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">
                            Cargando todas las especialidades...
                          </span>
                        </div>
                      ) : (
                        <MultiSelect
                          options={especialidades.map(e => ({ value: String(e.especialidad_id), label: e.nombre_especialidad }))}
                          onValueChange={(values) => field.onChange(values.map(Number))}
                          defaultValue={field.value?.map(String) || []}
                          placeholder={`Seleccionar especialidades... (${especialidades.length} disponibles)`}
                          className="bg-transparent"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
        }
        onSubmit={handleSave}
        isSubmitting={form.formState.isSubmitting}
      />

      {/* Confirmation dialog for deleting */}
      <ConfirmationDialog 
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Eliminar Docente"
        description={`¿Está seguro que desea eliminar al docente "${currentDocente?.nombres} ${currentDocente?.apellidos}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
      />
    </div>
  );
};

export default Docentes;

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchData, getItemById } from "@/utils/crudHelpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, GraduationCap, Calendar } from "lucide-react";
import { toast } from "sonner";

interface PeriodoAcademico {
  periodo_id: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
}

interface Carrera {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  unidad: number;
  unidad_nombre: string;
}

const SeleccionCarrera = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoId = searchParams.get('periodo');
  
  const [periodo, setPeriodo] = useState<PeriodoAcademico | null>(null);
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!periodoId) {
      toast.error("No se especificó un período académico");
      navigate("/admin/periodos-academicos");
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Cargar el período específico
        const periodoData = await getItemById<PeriodoAcademico>(
          "academic-setup/periodos-academicos/",
          periodoId
        );
        
        if (!periodoData) {
          toast.error("Período académico no encontrado");
          navigate("/admin/periodos-academicos");
          return;
        }
        
        setPeriodo(periodoData);

        // Cargar todas las carreras
        const carrerasResponse = await fetchData<{ results: Carrera[] }>("academic-setup/carreras/");
        setCarreras(carrerasResponse.results || []);

      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error al cargar los datos");
        navigate("/admin/periodos-academicos");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [periodoId, navigate]);

  const handleSelectCarrera = (carrera: Carrera) => {
    navigate(`/admin/grupos?periodo=${periodoId}&carrera=${carrera.carrera_id}`);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return date.toLocaleDateString('es-ES');
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!periodo) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <p className="text-red-500">Período académico no encontrado</p>
          <Button onClick={() => navigate("/admin/periodos-academicos")}>
            Volver a Períodos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header con navegación */}
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/admin/periodos-academicos")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Períodos Académicos
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Seleccionar Carrera</h1>
          <p className="text-gray-600">Elige una carrera para ver sus grupos en el período seleccionado</p>
        </div>

        {/* Información del Período */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período Académico: {periodo.nombre_periodo}
            </CardTitle>
            <CardDescription>
              {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={periodo.activo ? "default" : "secondary"}>
              {periodo.activo ? "Activo" : "Inactivo"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Carreras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {carreras.map((carrera) => (
          <Card 
            key={carrera.carrera_id} 
            className="hover:shadow-lg transition-all cursor-pointer"
            onClick={() => handleSelectCarrera(carrera)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                {carrera.nombre_carrera}
              </CardTitle>
              <CardDescription>
                Código: {carrera.codigo_carrera}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Unidad:</strong> {carrera.unidad_nombre}
                </p>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCarrera(carrera);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Ver Grupos
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {carreras.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No hay carreras disponibles</p>
          <Button onClick={() => navigate("/admin/unidades")}>
            Ir a Unidades Académicas
          </Button>
        </div>
      )}
    </div>
  );
};

export default SeleccionCarrera; 
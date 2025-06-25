import { BookOpen, Clock } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";

// Las interfaces se definen ahora en el componente padre (HorarioManual.tsx)
// y se pasan como props. Esto evita la duplicación de tipos.

interface MateriaDetalle {
  materia_id: number;
  nombre_materia: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
}

interface Grupo {
  grupo_id: number;
  materias_detalle: MateriaDetalle[];
}

interface MateriasPanelProps {
  grupo: Grupo | null;
  // Añadiremos más props después, como las necesarias para el drag-and-drop
}

const MateriaItem = ({ materia }: { materia: MateriaDetalle }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `materia-${materia.materia_id}`, // Usamos un prefijo para evitar colisiones de ID
    data: { materia }, // Pasamos toda la data de la materia para usarla en el drop
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const horasTotales = materia.horas_academicas_teoricas + materia.horas_academicas_practicas;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-white rounded-md border border-gray-200 shadow-sm cursor-grab touch-none"
    >
      <div className="font-semibold flex items-center">
        <BookOpen className="w-4 h-4 mr-2 text-academic-primary" />
        {materia.nombre_materia}
      </div>
      <div className="text-xs text-gray-600 mt-1 flex items-center">
        <Clock className="w-3 h-3 mr-1.5" />
        <span>Necesita: {horasTotales} horas</span>
      </div>
    </div>
  );
}

const MateriasPanel = ({ grupo }: MateriasPanelProps) => {
  if (!grupo) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg h-full">
        <p className="text-sm text-gray-500">Seleccione un grupo para ver sus materias.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg h-full">
      <h4 className="font-bold text-lg mb-4 border-b pb-2">Materias del Grupo</h4>
      <div className="space-y-3">
        {grupo.materias_detalle.length > 0 ? (
          grupo.materias_detalle.map((materia) => (
            <MateriaItem key={materia.materia_id} materia={materia} />
          ))
        ) : (
          <p className="text-sm text-gray-500">Este grupo no tiene materias asignadas.</p>
        )}
      </div>
    </div>
  );
};

export default MateriasPanel; 
// src/components/HorarioGrid.tsx
import { useDroppable } from "@dnd-kit/core";
import { BookOpen, User, Home } from "lucide-react";
import { BloqueHorario, HorarioAsignado, Materia, Docente, Aula, Grupo } from "@/types";

// Las interfaces ahora se definen en el componente padre (HorarioManual.tsx)
// y se pasan como props para mantener una única fuente de verdad.

// Interfaces para los datos que necesita el grid
// ... (todo el bloque de interfaces se elimina)

interface HorarioGridProps {
  bloques: BloqueHorario[];
  horarios: HorarioAsignado[];
  materias: Materia[];
  docentes: Docente[];
  aulas: Aula[];
  selectedGrupo: Grupo | null;
}

const diasSemana = [
  { id: 1, nombre: "Lunes" },
  { id: 2, nombre: "Martes" },
  { id: 3, nombre: "Miércoles" },
  { id: 4, nombre: "Jueves" },
  { id: 5, nombre: "Viernes" },
  { id: 6, nombre: "Sábado" },
];

const CeldaHorario = ({ bloque, horario, materia, docente, aula }: { 
  bloque: BloqueHorario | undefined,
  horario: HorarioAsignado | undefined,
  materia: Materia | undefined,
  docente: Docente | undefined,
  aula: Aula | undefined,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: bloque?.bloque_def_id ?? 'null',
    disabled: !bloque || !!horario, // Deshabilitar solo si la celda ya está ocupada por el grupo actual
  });

  const baseClasses = "w-full h-full rounded-md transition-colors p-2 text-left text-xs flex flex-col justify-center";
  let stateClasses = "";

  if (horario) {
    // Si la celda está ocupada por el grupo actual, mostrar la información
    stateClasses = `border bg-academic-primary-light border-academic-primary text-gray-800`;
    
    return (
      <div className={`${baseClasses} ${stateClasses}`}>
        <div className="font-bold flex items-center mb-1">
          <BookOpen className="w-3 h-3 mr-1.5 flex-shrink-0" />
          <span>{materia?.nombre_materia ?? 'Materia desconocida'}</span>
        </div>
        <div className="text-2xs text-gray-600 flex items-center mb-1">
          <User className="w-3 h-3 mr-1.5 flex-shrink-0" />
          <span>{docente ? `${docente.nombres.split(' ')[0]} ${docente.apellidos.split(' ')[0]}` : 'No asignado'}</span>
        </div>
        <div className="text-2xs text-gray-600 flex items-center">
          <Home className="w-3 h-3 mr-1.5 flex-shrink-0" />
          <span>{aula?.nombre_espacio ?? 'No asignada'}</span>
        </div>
      </div>
    );
  }

  // Celda VACÍA y disponible para arrastrar (incluso si está ocupada por otro grupo)
  if (bloque) {
    stateClasses = isOver
      ? "bg-green-200 border-2 border-green-500"
      : "bg-green-50 border-2 border-dashed border-gray-200";
  } else {
    stateClasses = "bg-gray-100";
  }

  return (
    <div ref={setNodeRef} className={`${baseClasses} ${stateClasses}`}>
      {/* Vacío */}
    </div>
  );
}

const HorarioGrid = ({ bloques, horarios, materias, docentes, aulas, selectedGrupo }: HorarioGridProps) => {
  // Obtenemos una lista única de rangos de hora para las filas
  const rangosHorarios = [
    ...new Map(
      bloques.map((b) => [`${b.hora_inicio}-${b.hora_fin}`, { inicio: b.hora_inicio, fin: b.hora_fin }])
    ).values(),
  ].sort((a, b) => a.inicio.localeCompare(b.inicio));

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Horario
            </th>
            {diasSemana.map((dia) => (
              <th key={dia.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {dia.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rangosHorarios.map((rango, index) => (
            <tr key={index}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700 sticky left-0 bg-white z-10">
                {rango.inicio.slice(0, 5)} - {rango.fin.slice(0, 5)}
              </td>
              {diasSemana.map((dia) => {
                const bloque = bloques.find(
                  (b) =>
                    b.dia_semana === dia.id &&
                    b.hora_inicio === rango.inicio &&
                    b.hora_fin === rango.fin
                );
                // Buscar solo el horario del grupo seleccionado
                const horarioDelGrupoActual = horarios.find(
                  h => h.bloque_horario === bloque?.bloque_def_id && h.grupo === selectedGrupo?.grupo_id
                );

                const materia = materias.find(m => m.materia_id === horarioDelGrupoActual?.materia);
                const docente = docentes.find(d => d.docente_id === horarioDelGrupoActual?.docente);
                const aula = aulas.find(a => a.espacio_id === horarioDelGrupoActual?.espacio);
                
                return (
                  <td key={dia.id} className="px-2 py-2 text-center align-top h-28">
                    <CeldaHorario 
                      bloque={bloque} 
                      horario={horarioDelGrupoActual}
                      materia={materia}
                      docente={docente}
                      aula={aula}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HorarioGrid; 
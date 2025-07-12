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

const CeldaHorario = ({ bloque, horario, materia, docente, aula, materias }: { 
  bloque: BloqueHorario | undefined,
  horario: HorarioAsignado | undefined,
  materia: Materia | undefined,
  docente: Docente | undefined,
  aula: Aula | undefined,
  materias: Materia[]
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: bloque?.bloque_def_id ?? 'null',
    disabled: !bloque, // Solo deshabilita si no hay bloque, permite drop aunque haya horario
  });

  const baseClasses = "w-full h-full rounded-md transition-colors p-2 text-left text-xs flex flex-col justify-center";
  let stateClasses = "";

  if (horario) {
    // Si la celda está ocupada por el grupo actual, mostrar la información
    stateClasses = `border bg-academic-primary-light border-academic-primary text-gray-800`;
    
    const materiaObj = materias.find(m => m.materia_id === horario.materia) 
      || (horario as any).materia_detalle;
    return (
      <div className={`${baseClasses} ${stateClasses} overflow-hidden`}>
        <div className="font-bold flex items-center mb-1 break-words whitespace-normal text-xs">
          <BookOpen className="w-3 h-3 mr-1.5 flex-shrink-0" />
          <span className="break-words whitespace-normal block">{materiaObj?.nombre_materia ?? 'Sin materia'}</span>
        </div>
        <div className="text-xs text-gray-700 break-words whitespace-normal block">
          {docente ? `${docente.nombres} ${docente.apellidos}` : ''}
        </div>
        <div className="text-xs text-gray-500 break-words whitespace-normal block">
          {aula ? aula.nombre_espacio : ''}
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
      <table className="w-full min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30 w-20">
              Horario
            </th>
            {diasSemana.map((dia) => (
              <th key={dia.id} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap sticky top-0 bg-gray-50 z-20">
                {dia.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200 text-xs">
          {rangosHorarios.map((rango, index) => (
            <tr key={index}>
              <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700 sticky left-0 bg-white z-10 w-20">
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
                  <td key={dia.id} className="px-1 py-1 text-center align-top h-20 w-24">
                    <CeldaHorario 
                      bloque={bloque} 
                      horario={horarioDelGrupoActual}
                      materia={materia}
                      docente={docente}
                      aula={aula}
                      materias={materias}
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
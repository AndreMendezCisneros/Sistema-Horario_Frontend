import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useMemo } from "react";
import client from "@/utils/axiosClient";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Docente, Aula, HorarioAsignado, BloqueHorario, DisponibilidadDocente, MateriaDetalle, Grupo } from "@/types";

// Las props que el modal necesita para funcionar
interface AsignacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (docenteId: number, aulaId: number) => void;
  materiaId: number;
  materiaNombre: string;
  bloqueId: number;
  bloqueNombre: string;
  periodoId: number | null;
  // Pasamos las listas completas para que el modal haga el filtrado
  allPeriodSchedules: HorarioAsignado[];
  aulas: Aula[];
  bloques: BloqueHorario[];
  docentes: Docente[];
  disponibilidades: DisponibilidadDocente[];
  materias: MateriaDetalle[];
  grupo: Grupo | null;
}

export const AsignacionModal = ({
  isOpen,
  onClose,
  onSave,
  materiaId,
  materiaNombre,
  bloqueId,
  bloqueNombre,
  periodoId,
  allPeriodSchedules,
  aulas,
  bloques,
  docentes,
  disponibilidades,
  materias,
  grupo,
}: AsignacionModalProps) => {
  const [selectedDocente, setSelectedDocente] = useState<number | null>(null);
  const [selectedAula, setSelectedAula] = useState<number | null>(null);
  
  // Lógica de filtrado con useMemo para eficiencia
  const availableDocentes = useMemo(() => {
    if (!bloqueId || !materiaId) return [];
    
    // Encontrar la materia para obtener sus requisitos
    const materiaActual = materias.find(m => m.materia_id === materiaId);
    const requiredSpecialtyIds = new Set(materiaActual?.especialidades_detalle.map(e => e.especialidad_id));

    // 1. Encontrar docentes ocupados en este bloque
    const docentesOcupadosIds = new Set(
      allPeriodSchedules
        .filter(h => h.bloque_horario === bloqueId)
        .map(h => h.docente)
    );

    // 2. Encontrar docentes NO disponibles en este bloque
    const docentesNoDisponiblesIds = new Set(
      disponibilidades
        .filter(d => d.bloque_horario === bloqueId && !d.esta_disponible)
        .map(d => d.docente)
    );

    // Filtrar la lista completa de docentes
    return docentes.filter(docente => {
      const isNotBusy = !docentesOcupadosIds.has(docente.docente_id);
      const isAvailable = !docentesNoDisponiblesIds.has(docente.docente_id);
      
      // Si no se requieren especialidades, solo chequear disponibilidad
      if (requiredSpecialtyIds.size === 0) {
        return isNotBusy && isAvailable;
      }
      
      // Si se requieren, chequear también que el docente tenga al menos una
      const hasRequiredSpecialty = docente.especialidades_detalle.some(e => requiredSpecialtyIds.has(e.especialidad_id));
      
      return isNotBusy && isAvailable && hasRequiredSpecialty;
    });
  }, [bloqueId, materiaId, allPeriodSchedules, disponibilidades, docentes, materias]);

  const availableAulas = useMemo(() => {
    if(!bloqueId || !materiaId) return [];

    // Encontrar la materia para obtener sus requisitos
    const materiaActual = materias.find(m => m.materia_id === materiaId);
    const requiredSpaceTypeId = materiaActual?.requiere_tipo_espacio_especifico;

    // Encontrar aulas ocupadas en este bloque
    const aulasOcupadasIds = new Set(
      allPeriodSchedules
        .filter(h => h.bloque_horario === bloqueId)
        .map(h => h.espacio)
    );

    // Filtrar la lista completa de aulas
    return aulas.filter(aula => {
      const isNotOccupied = !aulasOcupadasIds.has(aula.espacio_id);
      
      // Si no se requiere tipo, solo chequear si está ocupada
      if (!requiredSpaceTypeId) {
        return isNotOccupied;
      }

      // Si se requiere, chequear también el tipo de espacio
      return isNotOccupied && aula.tipo_espacio === requiredSpaceTypeId;
    });
  }, [bloqueId, materiaId, allPeriodSchedules, aulas, materias]);
  
  const handleSave = () => {
    // Nueva validación de turno
    const bloqueActual = bloques.find(b => b.bloque_def_id === bloqueId);
    if (grupo && bloqueActual && grupo.turno_preferente) {
      const turno = grupo.turno_preferente.toLowerCase();
      const horaInicio = parseInt(bloqueActual.hora_inicio.split(':')[0], 10);

      const morningRule = turno.includes('mañana') && (horaInicio < 7 || horaInicio >= 13);
      const afternoonRule = turno.includes('tarde') && (horaInicio < 13 || horaInicio >= 18);
      const nightRule = turno.includes('noche') && (horaInicio < 18 || horaInicio > 22);

      if (morningRule || afternoonRule || nightRule) {
        toast.error(`Conflicto de turno: El horario no corresponde al turno preferente (${grupo.turno_preferente}) del grupo.`);
        return;
      }
    }

    if (selectedDocente && selectedAula) {
      onSave(selectedDocente, selectedAula);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Asignar Docente y Aula</DialogTitle>
          <DialogDescription>
            Asignando <span className="font-semibold text-academic-primary">{materiaNombre}</span> en el bloque <span className="font-semibold text-academic-primary">{bloqueNombre}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <>
            <div className="space-y-2">
              <Label htmlFor="docente">Docente Disponible</Label>
              <Select onValueChange={(value) => setSelectedDocente(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar docente" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocentes.length > 0 ? (
                    availableDocentes.map(docente => (
                      <SelectItem key={docente.docente_id} value={String(docente.docente_id)}>
                        {docente.nombres} {docente.apellidos}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No hay docentes disponibles para este bloque.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aula">Aula Disponible</Label>
              <Select onValueChange={(value) => setSelectedAula(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar aula" />
                </SelectTrigger>
                <SelectContent>
                  {availableAulas.length > 0 ? (
                    availableAulas.map(aula => (
                      <SelectItem key={aula.espacio_id} value={String(aula.espacio_id)}>
                        {aula.nombre_espacio} (Cap: {aula.capacidad})
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-500">
                        No hay aulas disponibles para este bloque.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!selectedDocente || !selectedAula}>
            Guardar Asignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 
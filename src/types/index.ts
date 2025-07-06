// src/types/index.ts

// Tipos para configuración académica
export interface UnidadAcademica {
  unidad_id: number;
  nombre_unidad: string;
}

export interface CarreraDetalle {
  carrera_id: number;
  nombre_carrera: string;
  codigo_carrera: string;
  horas_totales_curricula: number;
  unidad: number;
  unidad_nombre: string;
}

export interface Materia {
  materia_id: number;
  codigo_materia: string;
  nombre_materia: string;
  horas_academicas_teoricas: number;
  horas_academicas_practicas: number;
  horas_academicas_laboratorio: number;
  horas_totales: number;
}

export interface Especialidad {
  especialidad_id: number;
  nombre_especialidad: string;
}

export interface MateriaDetalle extends Materia {
  requiere_tipo_espacio_especifico: number | null;
  requiere_tipo_espacio_nombre?: string;
  especialidades_detalle: Especialidad[];
}

export interface Aula {
  espacio_id: number;
  nombre_espacio: string;
  capacidad: number;
  tipo_espacio: number;
}

export interface Periodo {
  periodo_id: number;
  nombre_periodo: string;
}

// Tipos para usuarios
export interface Docente {
  docente_id: number;
  nombres: string;
  apellidos: string;
  especialidades_detalle: Especialidad[];
}

// Tipos para la programación de horarios
export interface Grupo {
  grupo_id: number;
  codigo_grupo: string;
  materias: number[];
  materias_detalle: MateriaDetalle[];
  carrera_detalle: CarreraDetalle;
  numero_estudiantes_estimado: number;
  turno_preferente: string;
}

export interface BloqueHorario {
  bloque_def_id: number;
  nombre_bloque: string;
  hora_inicio: string;
  hora_fin: string;
  dia_semana: number;
}

export interface HorarioAsignado {
  horario_id: number;
  grupo: number;
  materia: number;
  docente: number;
  espacio: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
}

export interface DisponibilidadDocente {
  disponibilidad_id: number;
  docente: number;
  periodo: number;
  dia_semana: number;
  bloque_horario: number;
  esta_disponible: boolean;
}

// Tipos para la UI
export interface AsignacionPendiente {
  materiaId: number;
  bloqueId: number;
} 
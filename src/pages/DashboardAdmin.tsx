import React, { useEffect, useState } from 'react';
import { BookOpen, User, FileText, Users, Calendar, ClipboardList } from 'lucide-react';
import CardSummary from '@/components/CardSummary';
import client from '@/utils/axiosClient';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

interface CountData {
  unidades: number;
  carreras: number;
  materias: number;
  grupos: number;
  aulas: number;
  docentes: number;
  bloques: number;
  horarios: number;
}

interface Restriccion {
  restriccion_id: number;
  codigo_restriccion: string;
  descripcion: string;
}

interface HorarioAsignado {
  horario_id: number;
  docente_detalle: { nombres: string; apellidos: string };
  materia_detalle: { nombre_materia: string };
  grupo_detalle: { codigo_grupo: string };
  espacio_detalle: { nombre_espacio: string };
  dia_semana: number;
  bloque_horario: number;
  bloque_nombre?: string;
}

const DashboardAdmin = () => {
  const [counts, setCounts] = useState<CountData>({
    unidades: 0,
    carreras: 0,
    materias: 0,
    grupos: 0,
    aulas: 0,
    docentes: 0,
    bloques: 0,
    horarios: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [restricciones, setRestricciones] = useState<Restriccion[]>([]);
  const [horarios, setHorarios] = useState<HorarioAsignado[]>([]);
  const [autoScheduleStats, setAutoScheduleStats] = useState([
    { name: 'Lun', generados: 5, conflictos: 2, tiempo: 10 },
    { name: 'Mar', generados: 8, conflictos: 1, tiempo: 8 },
    { name: 'Mié', generados: 6, conflictos: 3, tiempo: 12 },
    { name: 'Jue', generados: 10, conflictos: 0, tiempo: 7 },
    { name: 'Vie', generados: 7, conflictos: 2, tiempo: 9 },
    { name: 'Sáb', generados: 4, conflictos: 1, tiempo: 11 },
  ]);
  const [periodos, setPeriodos] = useState<{periodo_id: number, nombre_periodo: string}[]>([]);
  const [grupos, setGrupos] = useState<{grupo_id: number, codigo_grupo: string}[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<number | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [
          unidades,
          carreras,
          materias,
          grupos,
          aulas,
          docentes,
          bloques,
          horarios
        ] = await Promise.all([
          client.get('academic-setup/unidades-academicas/'),
          client.get('academic-setup/carreras/'),
          client.get('academic-setup/materias/'),
          client.get('scheduling/grupos/'),
          client.get('academic-setup/espacios-fisicos/'),
          client.get('users/docentes/'),
          client.get('scheduling/bloques-horarios/'),
          client.get('scheduling/horarios-asignados/')
        ]);
        
        setCounts({
          unidades: Array.isArray(unidades.data.results) ? unidades.data.results.length : Array.isArray(unidades.data) ? unidades.data.length : 0,
          carreras: Array.isArray(carreras.data.results) ? carreras.data.results.length : Array.isArray(carreras.data) ? carreras.data.length : 0,
          materias: Array.isArray(materias.data.results) ? materias.data.results.length : Array.isArray(materias.data) ? materias.data.length : 0,
          grupos: Array.isArray(grupos.data.results) ? grupos.data.results.length : Array.isArray(grupos.data) ? grupos.data.length : 0,
          aulas: Array.isArray(aulas.data.results) ? aulas.data.results.length : Array.isArray(aulas.data) ? aulas.data.length : 0,
          docentes: Array.isArray(docentes.data.results) ? docentes.data.results.length : Array.isArray(docentes.data) ? docentes.data.length : 0,
          bloques: Array.isArray(bloques.data.results) ? bloques.data.results.length : Array.isArray(bloques.data) ? bloques.data.length : 0,
          horarios: Array.isArray(horarios.data.results) ? horarios.data.results.length : Array.isArray(horarios.data) ? horarios.data.length : 0
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar datos del dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    // Cargar restricciones
    const fetchRestricciones = async () => {
      try {
        const res = await client.get('scheduling/configuracion-restricciones/?page=1');
        if (res.data && res.data.results) {
          setRestricciones(res.data.results);
        }
      } catch (error) {
        // Puedes mostrar un toast si quieres
      }
    };

    // Cargar periodos y grupos para los filtros
    const fetchPeriodosYGrupos = async () => {
      try {
        const periodosRes = await client.get('academic-setup/periodos-academicos/');
        setPeriodos(periodosRes.data.results || []);
        const gruposRes = await client.get('scheduling/grupos/');
        setGrupos(gruposRes.data.results || []);
      } catch (error) { /* Ignorado intencionalmente */ }
    };

    // Refrescar horarios al cambiar filtros
    const fetchHorarios = async () => {
      try {
        const res = await client.get('scheduling/horarios-asignados/?page=1');
        if (Array.isArray(res.data)) {
          setHorarios(res.data.slice(0, 5));
        }
      } catch (error) {
        // Puedes mostrar un toast si quieres
      }
    };

    fetchData();
    fetchRestricciones();
    fetchPeriodosYGrupos();
    fetchHorarios();
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <button onClick={() => navigate('/admin/unidades')} className="bg-white rounded-lg shadow p-4 flex flex-col items-center hover:bg-gray-200 transition cursor-pointer focus:outline-none">
          <div className="bg-orange-500 rounded-full p-2 mb-2"><BookOpen className="h-6 w-6 text-white" /></div>
          <div className="text-xs text-gray-500">Unidades Académicas</div>
          <div className="text-xl font-bold">{counts.unidades}</div>
          <div className="text-xs text-red-500 mt-1">Ir a Unidades</div>
        </button>
        <button onClick={() => navigate('/admin/docentes')} className="bg-white rounded-lg shadow p-4 flex flex-col items-center hover:bg-gray-200 transition cursor-pointer focus:outline-none">
          <div className="bg-green-500 rounded-full p-2 mb-2"><User className="h-6 w-6 text-white" /></div>
          <div className="text-xs text-gray-500">Docentes</div>
          <div className="text-xl font-bold">{counts.docentes}</div>
          <div className="text-xs text-gray-400 mt-1">Ir a Docentes</div>
        </button>
        <button onClick={() => navigate('/admin/horarios/manual')} className="bg-white rounded-lg shadow p-4 flex flex-col items-center hover:bg-gray-200 transition cursor-pointer focus:outline-none">
          <div className="bg-red-500 rounded-full p-2 mb-2"><FileText className="h-6 w-6 text-white" /></div>
          <div className="text-xs text-gray-500">Horario Manual</div>
          <div className="text-xl font-bold">75</div>
          <div className="text-xs text-gray-400 mt-1">Ir a Horario Manual</div>
        </button>
        <button onClick={() => navigate('/admin/disponibilidad')} className="bg-white rounded-lg shadow p-4 flex flex-col items-center hover:bg-gray-200 transition cursor-pointer focus:outline-none">
          <div className="bg-blue-500 rounded-full p-2 mb-2"><Users className="h-6 w-6 text-white" /></div>
          <div className="text-xs text-gray-500">Disponibilidad Docente</div>
          <div className="text-xl font-bold">+245</div>
          <div className="text-xs text-gray-400 mt-1">Ir a Disponibilidad</div>
        </button>
        <button onClick={() => navigate('/admin/horarios/automatico')} className="bg-white rounded-lg shadow p-4 flex flex-col items-center hover:bg-gray-200 transition cursor-pointer focus:outline-none">
          <div className="bg-gray-500 rounded-full p-2 mb-2"><Calendar className="h-6 w-6 text-white" /></div>
          <div className="text-xs text-gray-500">Horario Automático</div>
          <div className="text-xl font-bold">Auto</div>
          <div className="text-xs text-gray-400 mt-1">Ir a Horario Auto</div>
        </button>
        <button onClick={() => navigate('/admin/reportes')} className="bg-white rounded-lg shadow p-4 flex flex-col items-center hover:bg-gray-200 transition cursor-pointer focus:outline-none">
          <div className="bg-yellow-500 rounded-full p-2 mb-2"><ClipboardList className="h-6 w-6 text-white" /></div>
          <div className="text-xs text-gray-500">Reportes Horarios</div>
          <div className="text-xl font-bold">Reportes</div>
          <div className="text-xs text-gray-400 mt-1">Ir a Reportes</div>
        </button>
      </div>
      {/* Middle charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Gráfico de líneas: Horarios generados */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-700 font-semibold mb-2">Horarios Generados</div>
          <div className="text-xs text-gray-400 mb-1">Cantidad de horarios generados automáticamente</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={autoScheduleStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="generados" stroke="#4caf50" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-400 mt-2">Actualizado con cada creación automática</div>
        </div>
        {/* Gráfico de barras: Conflictos */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-700 font-semibold mb-2">Conflictos Detectados</div>
          <div className="text-xs text-gray-400 mb-1">Cantidad de conflictos al crear horarios</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={autoScheduleStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="conflictos" fill="#ff9800" />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-400 mt-2">Actualizado con cada creación automática</div>
        </div>
        {/* Gráfico de área: Tiempo de generación */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-gray-700 font-semibold mb-2">Tiempo de Generación</div>
          <div className="text-xs text-gray-400 mb-1">Tiempo (segundos) en crear horarios automáticos</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={autoScheduleStats}>
              <defs>
                <linearGradient id="colorTiempo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Area type="monotone" dataKey="tiempo" stroke="#2196f3" fillOpacity={1} fill="url(#colorTiempo)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="text-xs text-gray-400 mt-2">Actualizado con cada creación automática</div>
        </div>
      </div>
      {/* Bottom section: Tasks and Employee Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center mb-2">
            <div className="bg-purple-500 rounded p-1 px-3 text-white text-xs font-bold mr-2">Restricciones</div>
          </div>
          <ul className="divide-y divide-gray-200">
            {restricciones.length === 0 ? (
              <li className="py-2 text-gray-400">No hay restricciones registradas.</li>
            ) : (
              restricciones.map(r => (
                <li key={r.restriccion_id}>
                  <button
                    onClick={() => navigate('/admin/restricciones')}
                    className="w-full text-left py-2 px-2 rounded hover:bg-purple-100 transition font-semibold text-purple-800"
                  >
                    {r.codigo_restriccion}: <span className="font-normal text-gray-800">{r.descripcion}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-orange-500 font-bold mb-2">Horarios Asignados</div>
          <div className="text-xs text-gray-400 mb-2">Ejemplo de horarios asignados</div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="py-1">Día</th>
                <th className="py-1">Materia</th>
                <th className="py-1">Horario</th>
                <th className="py-1">Docente</th>
                <th className="py-1">Aula</th>
              </tr>
            </thead>
            <tbody>
              {horarios.length === 0 ? (
                <tr><td colSpan={5} className="py-2 text-gray-400">No hay horarios asignados.</td></tr>
              ) : (
                horarios.map(h => (
                  <tr key={h.horario_id}>
                    <td className="py-1">{['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][h.dia_semana-1]}</td>
                    <td className="py-1">{h.materia_detalle?.nombre_materia || '-'}</td>
                    <td className="py-1">{h.bloque_nombre || h.bloque_horario || '-'}</td>
                    <td className="py-1">{h.docente_detalle?.nombres} {h.docente_detalle?.apellidos}</td>
                    <td className="py-1">{h.espacio_detalle?.nombre_espacio || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
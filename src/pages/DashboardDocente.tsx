import React from 'react';
import { 
  Calendar, 
  ClipboardList, 
  FileText 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardDocente = () => {
  const navigate = useNavigate();

  // Datos de ejemplo: horas asignadas por día
  const data = [
    { dia: 'Lun', horas: 4 },
    { dia: 'Mar', horas: 3 },
    { dia: 'Mié', horas: 5 },
    { dia: 'Jue', horas: 2 },
    { dia: 'Vie', horas: 6 },
  ];

  return (
    <div className="w-full min-h-screen pt-6 pb-6 pl-10 pr-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Panel de Docente</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Acceda a su disponibilidad y horarios
        </p>
      </div>

      {/* Tarjetas tipo dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div
          className="rounded-lg bg-blue-400 text-white p-4 shadow flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/docente/disponibilidad')}
        >
          <div className="text-2xl font-bold">9,823</div>
          <div className="text-sm">Mi Disponibilidad</div>
          <svg className="w-full h-8 mt-2" viewBox="0 0 100 32"><polyline fill="none" stroke="#fff" strokeWidth="2" points="0,30 20,20 40,25 60,10 80,15 100,5" /></svg>
        </div>
        <div
          className="rounded-lg bg-indigo-400 text-white p-4 shadow flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/docente/horario')}
        >
          <div className="text-2xl font-bold">5,120</div>
          <div className="text-sm">Mi Horario</div>
          <svg className="w-full h-8 mt-2" viewBox="0 0 100 32"><polyline fill="none" stroke="#fff" strokeWidth="2" points="0,25 20,15 40,20 60,8 80,12 100,3" /></svg>
        </div>
        <div
          className="rounded-lg bg-sky-300 text-white p-4 shadow flex flex-col justify-between cursor-pointer hover:shadow-lg transition-all"
          onClick={() => navigate('/docente/exportar')}
        >
          <div className="text-2xl font-bold">12</div>
          <div className="text-sm">Exportar Horario</div>
          <svg className="w-full h-8 mt-2" viewBox="0 0 100 32"><polyline fill="none" stroke="#fff" strokeWidth="2" points="0,28 20,18 40,23 60,12 80,18 100,7" /></svg>
        </div>
      </div>

      {/* Área de gráfico tipo dashboard */}
      <div className="bg-white rounded-lg shadow p-6 mb-10">
        <div className="flex justify-between items-center mb-4">
          <div className="font-semibold text-lg">Actividad Reciente</div>
          <div className="flex gap-2">
            <button className="text-gray-500 text-sm border px-2 py-1 rounded hover:bg-gray-100">Día</button>
            <button className="text-gray-500 text-sm border px-2 py-1 rounded hover:bg-gray-100">Mes</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="horas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Elimino los tres cuadros de la parte inferior */}

    </div>
  );
};

export default DashboardDocente;

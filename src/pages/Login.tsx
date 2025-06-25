import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { User, Lock, ArrowLeft } from 'lucide-react';
import logo from '/image/logo-sinfondo.png';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, role } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast.error('Por favor seleccione un rol primero');
      navigate('/');
      return;
    }
    setIsSubmitting(true);
    try {
      const success = await login(username, password);
      if (success) {
        toast.success('Inicio de sesión exitoso');
        if (role === 'Administrador') {
          navigate('/dashboard-admin');
        } else {
          navigate('/dashboard-docente');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleDisplay = role === 'Administrador' ? 'Administrador' : 'Docente';

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/image/portada.png')" }}
    >
      <div className="absolute inset-0 bg-black/60"></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-4xl z-10"
      >
        <Card className="shadow-2xl border-0 bg-[#1e293b]/80 backdrop-blur-sm text-white rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 bg-[#162031]/60 flex flex-col justify-center items-center text-center">
                <img src={logo} alt="Logo ELP" className="h-24 mb-4" />
                <h2 className="text-3xl font-bold mb-2">Bienvenido de Nuevo</h2>
                <p className="text-gray-300">Tu plataforma centralizada para la gestión académica.</p>
            </div>
            <div className="p-8">
              <h1 className="text-2xl font-bold mb-1">Iniciar Sesión</h1>
              <p className="text-gray-300 mb-6">Acceso como <span className="font-bold">{roleDisplay}</span></p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nombre de usuario"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-[#162031] border-[#41506b] rounded-md placeholder:text-gray-400 focus:ring-[#e95460]"
                  />
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-[#162031] border-[#41506b] rounded-md placeholder:text-gray-400 focus:ring-[#e95460]"
                  />
                </div>
                
                <div className="text-right">
                  <a href="#" className="text-sm text-gray-400 hover:text-[#e95460] transition-colors">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>

                <Button 
                  type="submit" 
                  className={`w-full text-white font-bold py-2.5 rounded-md transition-transform transform hover:scale-105 ${
                    role === 'Administrador' 
                      ? 'bg-[#FFC107] hover:bg-yellow-500' 
                      : 'bg-[#e95460] hover:bg-red-700'
                  }`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Procesando...' : 'Ingresar'}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Button 
                  variant="link" 
                  onClick={() => navigate('/')}
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a selección de rol
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logo from '/image/logo-sinfondo.png';
import { useEffect } from 'react';

const SelectRole = () => {
  const { setRole, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      const role = localStorage.getItem('role');
      if (role === 'Administrador') {
        navigate('/dashboard-admin');
      } else if (role === 'Docente') {
        navigate('/dashboard-docente');
      }
    }
  }, [isAuthenticated, navigate]);

  const handleRoleSelect = (selectedRole: 'Docente' | 'Administrador') => {
    setRole(selectedRole);
    navigate('/login');
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat p-4 text-white"
      style={{ backgroundImage: "url('/image/portada.png')" }}
    >
      <div className="absolute inset-0 bg-black opacity-50"></div>
      
      <div className="absolute top-8 left-8">
        <img src={logo} alt="Logo ELP" className="h-16" />
      </div>

      <div className="absolute bottom-8 right-8 z-10">
        <a href="https://wa.me/51949261503" target="_blank" rel="noopener noreferrer" className="bg-green-500 rounded-full p-3 flex items-center justify-center shadow-lg transition-transform transform hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
          </svg>
        </a>
      </div>

      <div className="absolute right-8 top-1/2 -translate-y-1/2 space-y-2 hidden md:block">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 bg-white/50 rounded-sm"></div>
        ))}
      </div>
      
      <div className="absolute bottom-8 left-8 hidden md:block">
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="w-2 h-2 bg-white/30 rounded-full"></div>
          ))}
        </div>
      </div>

      <main className="z-10 flex flex-col items-center text-center max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-sm font-light tracking-widest text-gray-300 mb-2">PLATAFORMA DE GESTIÓN ACADÉMICA</p>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Bienvenido al Sistema <br /> de La Pontificia
          </h1>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Este sistema facilita la planificación y organización de horarios académicos para <span className="font-bold">docentes y coordinadores.</span> Ingrese según tu rol para acceder a las funciones correspondientes.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center"
        >
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-[#e95460] hover:border-[#e95460] hover:text-white transition-colors"
            onClick={() => handleRoleSelect('Docente')}
          >
            Entrar como Docente
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="bg-transparent border-2 border-white text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-[#FFC107] hover:border-[#FFC107] hover:text-white transition-colors"
            onClick={() => handleRoleSelect('Administrador')}
          >
            Entrar como Administrador
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

export default SelectRole;

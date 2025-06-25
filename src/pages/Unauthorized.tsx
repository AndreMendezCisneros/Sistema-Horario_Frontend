
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Unauthorized = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-academic-primary mb-4">401</h1>
        <p className="text-2xl mb-6">No tiene autorización para acceder a esta página</p>
        <Button 
          onClick={() => navigate('/')}
          className="bg-academic-primary hover:bg-academic-secondary"
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;

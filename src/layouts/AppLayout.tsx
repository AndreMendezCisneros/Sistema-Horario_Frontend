import React from 'react';
import Sidebar from '@/components/Sidebar';
import { useTheme } from '@/contexts/ThemeContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { theme } = useTheme();
  
  return (
    <div className={`flex min-h-screen bg-background ${theme}`}>
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;

import React, { useState } from 'react';
import ElevesSidebar from './ElevesSidebar';

interface ElevesLayoutProps {
  children: React.ReactNode;
}

const ElevesLayout: React.FC<ElevesLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <ElevesSidebar open={sidebarOpen} onToggle={handleToggleSidebar} />
      
      {/* Main content */}
      <div className={`flex-1 p-2 sm:p-4 bg-gray-100 pb-16 sm:pb-4 transition-all duration-300 ${
        sidebarOpen ? 'sm:ml-64' : 'sm:ml-6'
      }`}>
        <div className="max-w-7xl mx-auto bg-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
};

export default ElevesLayout;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DocumentTextIcon,
  UserGroupIcon,
  PlusIcon,
  ClockIcon,
  HomeIcon,
  AcademicCapIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface ElevesSidebarProps {
  open: boolean;
  onToggle: () => void;
}

const ElevesSidebar: React.FC<ElevesSidebarProps> = ({ open, onToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      title: 'Demandes d\'inscription',
      icon: DocumentTextIcon,
      path: '/eleves/demandes',
      description: 'Gérer les demandes d\'inscription des élèves'
    },
    {
      title: 'Élèves inscrits',
      icon: UserGroupIcon,
      path: '/eleves/inscrits',
      description: 'Gérer les élèves déjà inscrits'
    },
    {
      title: 'Nouvelle inscription',
      icon: PlusIcon,
      path: '/eleves/nouvelle',
      description: 'Créer une nouvelle inscription'
    },
    {
      title: 'Historique',
      icon: ClockIcon,
      path: '/eleves/historique',
      description: 'Consulter l\'historique des inscriptions'
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden sm:block fixed left-0 z-40 bg-white transition-all duration-500 ease-in-out overflow-y-auto shadow-lg scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50 ${
        open 
          ? 'w-62 animate-fadeRight opacity-100 top-[23%] bottom-[21%]' 
          : 'w-16 animate-fadeLeft opacity-80 top-[28%] bottom-[28%]'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-600 text-white p-5 shadow-lg">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
              <AcademicCapIcon className="w-6 h-6 text-black" />
            </div>
            {open && (
              <div className="ml-2 sm:ml-3 min-w-0 transition-all duration-500 ease-in-out">
                <h2 className="text-[13px] font-bold truncate text-white font-display">Module Élèves</h2>
                <p className="text-[13px] opacity-80 truncate text-white font-primary">Gestion des inscriptions</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className={`${open ? 'p-1 sm:p-1' : 'p-1'}`}>
          <ul className="menu menu-vertical w-full space-y-3">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              const active = isActive(item.path);
              
              // Couleurs de hover et active différentes pour chaque item
              const hoverColors = [
                'hover:bg-green-500/20 hover:text-green-300', // Vert pour le premier
                'hover:bg-yellow-500/20 hover:text-yellow-300', // Jaune pour le deuxième
                'hover:bg-blue-500/20 hover:text-blue-300', // Bleu pour le troisième
                'hover:bg-green-600/20 hover:text-green-400', // Vert foncé pour le quatrième
              ];
              
              const activeColors = [
                'bg-green-500/30 text-green-200 border-l-4 border-green-400', // Vert pour le premier
                'bg-yellow-500/30 text-yellow-200 border-l-4 border-yellow-400', // Jaune pour le deuxième
                'bg-blue-500/30 text-blue-200 border-l-4 border-blue-400', // Bleu pour le troisième
                'bg-green-600/30 text-green-300 border-l-4 border-green-500', // Vert foncé pour le quatrième
              ];
              
              const hoverColor = hoverColors[index % hoverColors.length];
              const activeColor = activeColors[index % activeColors.length];
              
              return (
                <li key={item.path} className="relative">
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`group relative w-full flex items-center ${open ? 'px-2 sm:px-3 py-3 sm:py-4' : 'px-0 py-3 justify-center'} rounded-lg transition-all duration-200 ${
                      active 
                        ? `${activeColor} rounded-none backdrop-blur-sm` 
                        : `text-black ${hoverColor}`
                    }`}
                    title={open ? item.description : item.title}
                  >
                    {/* Icon with enhanced styling */}
                    <div className={`relative ${open ? 'p-1 sm:p-2' : 'p-1'} rounded-lg transition-all duration-200 ${
                      active 
                        ? 'bg-white shadow-md' 
                        : 'group-hover:bg-white-500'
                    }`}>
                      <IconComponent className={`w-6 h-6 flex-shrink-0 transition-all duration-200 ${
                        active ? 'text-black' : 'text-black  rounded-lg'
                      }`} />
                    </div>
                    
                            {/* Text with smooth transition - only show when open */}
                            {open && (
                              <span className={`ml-2 sm:ml-3 font-medium transition-all duration-500 ease-in-out text-[14px] truncate font-primary ${
                                active ? 'text-white' : 'text-black text-shadow-lg'
                              }`} style={{ textShadow: '1px 1px 1px rgba(34, 111, 44, 0.87)' }}>
                                {item.title}
                              </span>
                            )}
                    
                    {/* Active indicator line - only show when open */}
                    {active && open && (
                      <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 sm:h-8 rounded-l-full ${
                        index === 0 ? 'bg-green-400' :
                        index === 1 ? 'bg-yellow-400' :
                        index === 2 ? 'bg-blue-400' :
                        'bg-green-500'
                      }`}></div>
                    )}
                    
                    {/* Hover indicator line - only show when open */}
                    {!active && open && (
                      <div className={`absolute right-0 top-1/2 transform -translate-y-1/2 w-0 h-0 rounded-l-full transition-all duration-200 group-hover:w-1 group-hover:h-4 sm:group-hover:h-6 ${
                        index === 0 ? 'group-hover:bg-green-400' :
                        index === 1 ? 'group-hover:bg-yellow-400' :
                        index === 2 ? 'group-hover:bg-blue-400' :
                        'group-hover:bg-green-500'
                      }`}></div>
                    )}
                  </button>
                  
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer with Dashboard Button */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-3 sm:p-4 shadow-lg">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className={`group relative w-full flex items-center ${open ? 'space-x-2 sm:space-x-3' : 'justify-center'}`}
              title="Retour au tableau de bord principal"
            >
              <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-800" />
              </div>
              {open && (
                <div className="min-w-0">
                  <h2 className="text-[13px] font-bold truncate text-white font-display">Tableau de bord</h2>
                  <p className="text-[13px] opacity-80 truncate text-white font-primary">Retour au dashboard</p>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Toggle Button - Outside sidebar */}
      <button
        onClick={onToggle}
        className={`hidden sm:block fixed top-1/2 transform -translate-y-1/2 z-50 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 flex items-center justify-center transition-all duration-300 shadow-lg border-2 border-white/50 ${
          open ? 'left-[15rem]' : 'left-16'
        }`}
        title={open ? 'Réduire la sidebar' : 'Étendre la sidebar'}
      >
        <div className="flex items-center justify-center w-full h-full">
          {open ? (
            <ChevronLeftIcon className="w-6 h-6 text-yellow-400 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-6 h-6 text-green-400 flex-shrink-0" />
          )}
        </div>
      </button>

      {/* Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 via-yellow-500 to-blue-600 border-t border-white/20">
        <div className="flex items-center justify-around py-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                  active 
                    ? 'bg-white/20 text-white backdrop-blur-sm' 
                    : 'text-white hover:bg-white/10'
                }`}
                title={item.title}
              >
                <IconComponent className={`w-5 h-5 mb-1 transition-all duration-200 ${
                  active ? 'text-white' : 'text-white'
                }`} />
                        <span className={`text-xs font-medium transition-all duration-200 font-primary ${
                          active ? 'text-white' : 'text-white'
                        }`}>
                          {item.title.split(' ')[0]}
                        </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ElevesSidebar;

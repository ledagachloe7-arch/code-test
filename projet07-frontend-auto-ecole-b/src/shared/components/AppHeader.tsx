import { UserIcon } from '@heroicons/react/24/outline';
import { Menu, MenuItem, IconButton } from '@mui/material';
import React from 'react';
import { useAppStore } from '../../store';
import { ROUTES } from '../constants';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  sidebarOpen: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = ({ sidebarOpen }) => {
  const { user } = useAppStore();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleClose();
    navigate(ROUTES.PROFILE);
  };
  return (
    <>
      {/* Ligne colorée (vert, jaune, bleu) - commence au tout début de la page */}
      <div 
        className="fixed top-0 left-0 right-0 h-1 flex"
        style={{ 
          zIndex: 9999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '8px'
        }}
      >
        <div className="flex-1 bg-[#009E61]"></div>
        <div className="flex-1 bg-[#FCD20E]"></div>
        <div className="flex-1 bg-[#3b82f6]"></div>
      </div>

      <header
        className="fixed right-0 bg-white shadow-lg border-b border-gray-200 transition-all duration-300"
        style={{
          left: sidebarOpen ? '16rem' : '4rem',
          width: sidebarOpen ? 'calc(100% - 16rem)' : 'calc(100% - 4rem)',
          top: '4px',
          zIndex: 1000
        }}
      >
        <div className="px-4 py-3">
        <div className="flex items-center justify-end">
          {/* Informations utilisateur */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-800">
                  Bonjour, {user?.name || 'Utilisateur'}
                </div>
                <div className="text-xs text-gray-500">{user?.role}</div>
              </div>
              <IconButton
                onClick={handleClick}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: '#3A75C4',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#2A5A9A',
                  }
                }}
              >
                <span className="text-sm font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </IconButton>
            </div>

            {/* Menu Popup */}
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 200,
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }
              }}
            >
              <MenuItem onClick={handleProfileClick}>
                <UserIcon className="w-5 h-5 mr-2" />
                Profil
              </MenuItem>
            </Menu>

          </div>
        </div>
      </div>
    </header>
    </>
  );
};

export default AppHeader;

import React, { useState } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
  fullWidth?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, hideSidebar = false, fullWidth = false }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Maintenir la sidebar ouverte sur desktop
  React.useEffect(() => {
    if (!isMobile && !hideSidebar) {
      setSidebarOpen(true);
    }
  }, [isMobile, hideSidebar]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      {/* Sidebar - au-dessus du header */}
      {!hideSidebar && <AppSidebar open={sidebarOpen} onToggle={handleToggleSidebar} />}
      
      {/* Header fixe - s'arrête au début de la sidebar */}
      {!hideSidebar && <AppHeader sidebarOpen={sidebarOpen} />}
      
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          pt: hideSidebar ? 0 : { xs: 8, sm: 10 },
        }}
      >
        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            width: '100%',
            minHeight: 0,
            p: fullWidth ? 0 : { xs: 1, sm: 2 },
            bgcolor: 'background.default',
            transition: 'all 0.3s ease-in-out',
            ml: hideSidebar ? 0 : {
              xs: 0,
              sm: sidebarOpen ? 32 : 8,
            },
            ...(fullWidth
              ? {
                  display: 'flex',
                  flexDirection: 'column',
                }
              : {}),
          }}
        >
          <Box
            sx={{
              maxWidth: fullWidth ? '100%' : '7xl',
              mx: fullWidth ? 0 : 'auto',
              bgcolor: 'background.default',
              width: '100%',
              ...(fullWidth
                ? {
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }
                : { minHeight: '100%' }),
            }}
          >
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;

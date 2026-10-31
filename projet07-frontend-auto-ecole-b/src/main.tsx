import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import App from './App.tsx';
import { theme } from './theme';
import './index.css';

// Icône du site (favicon)
const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
if (favicon) favicon.href = '/assets/img/mtt.png';

// Suppression des faux positifs PropTypes (ReactNode/ReactElement) en dev
// Problème connu : MUI PropTypes trop stricts avec React 18 (éléments vus comme "object")
if (import.meta.env.DEV) {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : String(args[0]);
    if (msg.includes('Failed prop type') && (msg.includes('ReactNode') || msg.includes('ReactElement'))) return;
    originalError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <div style={{ minHeight: '100%' }}>
        <App />
      </div>
    </ThemeProvider>
  </React.StrictMode>,
);


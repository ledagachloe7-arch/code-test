import React, { ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { theme } from './index';

interface Props {
  children: ReactNode;
}

export default function ThemeProvider({ children }: Props) {
  // MUI ThemeProvider n'accepte qu'un seul enfant (ReactNode). Plusieurs enfants
  // sont passés comme tableau, ce qui déclenche le warning PropTypes.
  return (
    <MuiThemeProvider theme={theme}>
      <div>
        <CssBaseline />
        {children}
      </div>
    </MuiThemeProvider>
  );
}









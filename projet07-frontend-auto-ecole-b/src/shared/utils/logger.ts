/**
 * Utilitaire de logging conditionnel
 * Les logs ne s'affichent qu'en mode développement
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Les erreurs sont toujours loggées, même en production
    // eslint-disable-next-line no-console
    console.error(...args);
  },
  
  info: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
  
  table: (data: unknown) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.table(data);
    }
  },
};


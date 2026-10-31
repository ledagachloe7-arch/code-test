
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
      '@mui/utils',
      'prop-types',
      'react-is',
      'xlsx',
    ],
    exclude: ['@mui/x-charts'],
  },

  resolve: {
    dedupe: [
      'react',
      'react-dom',
      '@emotion/styled',
      '@emotion/react',
      'react-is',
      '@mui/system',
      '@mui/utils',
    ],

    alias: [
      {
        find: '@mui/system/colorManipulator',
        replacement: path.resolve(
          __dirname,
          'node_modules/@mui/system/esm/colorManipulator.js',
        ),
      },
      {
        find: '@mui/system/createStyled',
        replacement: path.resolve(
          __dirname,
          'node_modules/@mui/system/esm/createStyled.js',
        ),
      },
      {
        find: '@mui/system/useThemeWithoutDefault',
        replacement: path.resolve(
          __dirname,
          'node_modules/@mui/system/esm/useThemeWithoutDefault.js',
        ),
      },
    ],
  },

  server: {
    port: 3000,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        timeout: 60000,

        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('❌ Proxy error:', err);
          });

          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(
              '📤 Proxying:',
              req.method,
              req.url,
              '→',
              proxyReq.path,
            );
          });

          proxy.on('proxyRes', (proxyRes, req) => {
            console.log(
              '📥 Proxy response:',
              proxyRes.statusCode,
              req.url,
            );
          });
        },
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('/@mui/') ||
            id.includes('/@emotion/')
          ) {
            return 'mui-vendor';
          }

          if (id.includes('/xlsx/')) {
            return 'xlsx-vendor';
          }

          if (
            id.includes('/recharts/') ||
            id.includes('/chart.js/') ||
            id.includes('/apexcharts/')
          ) {
            return 'charts-vendor';
          }

          if (
            id.includes('/jspdf/') ||
            id.includes('/pdfjs-dist/') ||
            id.includes('/html2canvas/')
          ) {
            return 'pdf-vendor';
          }
        },
      },
    },
  },

  esbuild: {
    drop: ['console', 'debugger'],
  },
});

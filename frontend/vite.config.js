import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const isStaging = mode === 'staging';
  const isDevelopment = mode === 'development';

  return {
    plugins: [react()],
    base: '/',
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: isDevelopment,
      minify: 'esbuild',
      target: 'es2020',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: isStaging ? 5174 : 5173,
      open: true,
      proxy: {
        '/admin': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/static/admin': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: isStaging ? 'https://api-staging.noumatch.com' : 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: isStaging ? 'wss://api-staging.noumatch.com' : 'ws://localhost:8000',
          ws: true,
          changeOrigin: true,
        }
      }
    },
    define: {
      'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify(
        isDevelopment ? 'development' : (isStaging ? 'staging' : 'production')
      ),
    },
    esbuild: {
      drop: isDevelopment ? [] : ['console', 'debugger'],
    },
    preview: {
      port: isStaging ? 4174 : 4173,
    },
  }
});

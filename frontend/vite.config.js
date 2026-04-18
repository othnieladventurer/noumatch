// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',                // base path for deployment
  build: {
    outDir: 'dist',          // output folder
    emptyOutDir: true,       // clean folder before build
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
  // Server configuration for development only
  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy API requests to avoid CORS issues (development only)
      '/api': {
        target: 'http://localhost:8000',  // Local Django server for dev
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  // Define environment variables for production
  define: {
    'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify('production'),
    'import.meta.env.VITE_API_URL': JSON.stringify('https://api.noumatch.com'),
  },
  // Preview configuration
  preview: {
    port: 4173,
  },
});






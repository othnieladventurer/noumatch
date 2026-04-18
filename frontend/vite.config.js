// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  // Determine if we're in staging mode
  const isStaging = mode === 'staging';
  
  return {
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
        '@': path.resolve(__dirname, './src'),  // <-- alias @ to src
      },
    },
    // Server configuration for different environments
    server: {
      port: isStaging ? 5174 : 5173,
      open: true,
      proxy: {
        // Proxy API requests to avoid CORS issues
        '/api': {
          target: isStaging 
            ? 'https://api-staging.noumatch.com' 
            : 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: isStaging 
            ? 'wss://api-staging.noumatch.com' 
            : 'ws://localhost:8000',
          ws: true,
          changeOrigin: true,
        }
      }
    },
    // Define environment variables that will be available in the client
    define: {
      // This makes environment variables available to your app
      'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify(
        isStaging ? 'staging' : 'production'
      ),
    },
    // Preview configuration for testing builds
    preview: {
      port: isStaging ? 4174 : 4173,
    },
  }
});
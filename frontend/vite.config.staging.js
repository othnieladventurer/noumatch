// vite.config.staging.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist-staging',    // Different output folder for staging
    emptyOutDir: true,
    sourcemap: false,
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
    port: 5174,
    open: true,
    proxy: {
      '/api': {
        target: 'https://api-staging.noumatch.com',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'wss://api-staging.noumatch.com',
        ws: true,
        changeOrigin: true,
      }
    }
  },
  define: {
    'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify('staging'),
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
})






import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')
  const isStaging = mode === 'staging'
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  // Use environment variable for local API port, default to 8000
  const localApiPort = env.VITE_API_PORT || '8000'
  const localApiTarget = `http://127.0.0.1:${localApiPort}`
  const localWsTarget = `ws://127.0.0.1:${localApiPort}`

  // Determine API target based on environment
  const apiTarget = isStaging
    ? 'https://api-staging.noumatch.com'
    : isProduction
    ? 'https://api.noumatch.com'
    : localApiTarget

  const wsTarget = isStaging
    ? 'wss://api-staging.noumatch.com'
    : isProduction
    ? 'wss://api.noumatch.com'
    : localWsTarget

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
        '/django-admin': {
          target: localApiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/django-admin/, '/admin'),
        },
        '/static/admin': {
          target: localApiTarget,
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('[Proxy Error]', err.message)
            })
          }
        },
        '/ws': {
          target: wsTarget,
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
})
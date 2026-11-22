// Bundles src/prerender/entry.jsx for Node so scripts/prerender.mjs can render
// the public pages to static HTML during `npm run build`. Not used at runtime.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'import.meta.env.VITE_APP_ENVIRONMENT': JSON.stringify('production'),
    'import.meta.env.REACT_APP_META_PIXEL_ID': JSON.stringify(''),
    'import.meta.env.REACT_APP_GA_MEASUREMENT_ID': JSON.stringify(''),
  },
  build: {
    ssr: 'src/prerender/entry.jsx',
    outDir: '.prerender',
    emptyOutDir: true,
    minify: false,
    // Match the client build so asset URLs in the prerendered HTML resolve to
    // the files emitted in dist/assets.
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        entryFileNames: 'entry.mjs',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
})

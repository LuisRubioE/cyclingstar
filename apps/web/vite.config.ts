import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    // El manifiesto (`dist/.vite/manifest.json`): de él saca la API los ficheros de la página de etapa, que
    // su HTML precarga para la primera pintura de `Watch` (E2, paso 10b, los arreglos; §18.5).
    manifest: true,
  },
  server: {
    // En desarrollo, redirige las llamadas de API a la API local (Paso 7).
    proxy: {
      '/health': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
})

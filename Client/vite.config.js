import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // Permet d'exposer sur le réseau
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.1.15:30000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  plugins: [react(),
    tailwindcss(),
  ],
})

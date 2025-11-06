import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
    },
    define: {
      // Make env variables available to the app
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8000'),
    },
    build: {
      // Prevent tree-shaking of ActivityTimeline component
      rollupOptions: {
        treeshake: {
          // Keep side-effect free components that are conditionally rendered
          moduleSideEffects: true,
        }
      }
    }
  }
})

import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { localVercelApi } from './vite.local-api'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const webDir = process.cwd()
  const rootDir = path.resolve(webDir, '..')
  const env = {
    ...loadEnv(mode, rootDir, ''),
    ...loadEnv(mode, webDir, ''),
  }

  return {
    plugins: [react(), localVercelApi(path.resolve(rootDir, 'api'), env)],
    server: {
      // Vercel dev sets PORT — vite must listen there or vercel dev times out.
      port: process.env.PORT ? Number(process.env.PORT) : 5173,
      strictPort: Boolean(process.env.PORT),
    },
  }
})

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize VITE_API_KEY if available (Vercel standard), fallback to API_KEY
  const apiKey = env.VITE_API_KEY || env.API_KEY || '';
  
  // Specific key for Image Generation. Check VITE_ prefix first, then standard name.
  const imageApiKey = env.VITE_IMAGE_API_KEY || env.IMAGE_API_KEY || '';

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.IMAGE_API_KEY': JSON.stringify(imageApiKey)
    }
  }
})
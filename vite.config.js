import process from 'node:process';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const localApiTarget = process.env.VITE_LOCAL_API_TARGET || 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base:
    process.env.VITE_BASE_PATH ||
    (process.env.NODE_ENV === "production" ? "/Svarog-Tracer/" : "/"),
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor';
          if (id.includes('react-router')) return 'router-vendor';
          if (id.includes('lucide-react')) return 'icon-vendor';
          if (id.includes('gsap')) return 'motion-vendor';
          if (id.includes('pixi')) return 'pixi-vendor';
          if (id.includes('@google/generative-ai')) return 'ai-vendor';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: localApiTarget,
        changeOrigin: true,
        secure: false,
      }
    }
  }
});

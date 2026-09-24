import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { rolldownOptions: { output: { codeSplitting: { groups: [
    { name: 'three-core', test: /node_modules[\\/]three[\\/]/, priority: 30, maxSize: 460000 },
    { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory|@reduxjs|immer|react-redux)/, priority: 20 },
    { name: 'motion', test: /node_modules[\\/](motion|framer-motion)/, priority: 10 },
    { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 10 },
  ] } } } },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
})
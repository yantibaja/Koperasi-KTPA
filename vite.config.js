import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Ganti 'koperasi-app' dengan nama repository GitHub Anda
export default defineConfig({ plugins: [react()], base: '/koperasi-app/' })

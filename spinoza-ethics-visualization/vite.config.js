import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed under /spinoza on the remote host, so every built asset needs to resolve
// against that subpath. Vite bakes this into script/CSS URLs in index.html and into
// any `import.meta.env.BASE_URL` references at build time. Local `npm run dev` still
// works because the dev server auto-prefixes routes with the same base.
export default defineConfig({
  plugins: [react()],
  base: '/spinoza/',
})

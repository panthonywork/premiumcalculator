import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Two build modes:
// - default `vite build` → standard split build (kept unchanged for Vercel /
//   normal hosting paths).
// - `vite build --mode singlefile` → produces ONE self-contained `index.html`
//   in `dist/` with all CSS/JS/SVG inlined. Drop into SharePoint as a single
//   file; users open it in their browser and the calculator runs locally.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'singlefile' ? [react(), viteSingleFile()] : [react()],
}))

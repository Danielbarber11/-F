
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // הגדרה זו קריטית ל-GitHub Pages. 
  // './' מבטיח שהאתר יחפש את הקבצים (CSS/JS) באופן יחסי לתיקייה בה הוא נמצא,
  // ולא בתיקייה הראשית של הדומיין.
  base: './', 
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});

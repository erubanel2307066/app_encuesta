import { copyFileSync, existsSync } from 'fs';

const index = 'dist/index.html';
const fallback = 'dist/404.html';

if (!existsSync(index)) {
  console.error('spa-fallback: no existe dist/index.html — ejecuta vite build primero');
  process.exit(1);
}

copyFileSync(index, fallback);
console.log('spa-fallback: dist/404.html creado para rutas del SPA');

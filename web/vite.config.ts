import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [{name: 'armazon-pwa', generateBundle(_opciones, archivos) {
    const estaticos = Object.keys(archivos).filter(n => /\.(js|css)$/.test(n));
    const fuentes = ['barlow-400', 'barlow-500', 'barlow-600', 'barlow-700', 'barlow-condensed-600'].map(n => `/fuentes/${n}.woff2`);
    this.emitFile({type: 'asset', fileName: 'armazon.json', source: JSON.stringify({version: Date.now().toString(36),
      archivos: ['/', '/index.html', '/demo.html', '/manifest.webmanifest', '/icono.svg', '/icono-192.png', '/icono-512.png', ...fuentes, ...estaticos.map(n => `/${n}`)]})});
  }}],
  build: { rollupOptions: { input: { app: 'index.html', demo: 'demo.html', casa: 'casa.html' } } },
});

import { elemento } from './dom';
interface InvitacionInstalar extends Event { prompt(): Promise<void>; }
export function prepararPwa() {
  if ('serviceWorker' in navigator && import.meta.env.PROD)
  {
    // Si llega una versión nueva del service worker, recarga una vez para mostrarla.
    const habia = !!navigator.serviceWorker.controller; let recargado = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (habia && !recargado) { recargado = true; location.reload(); } });
    void navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'}).then(r => r.update()).catch(() => { /* La app funciona sin instalación. */ });
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); const boton = elemento<HTMLButtonElement>('instalar'); boton.hidden = false;
    boton.onclick = () => { void (e as InvitacionInstalar).prompt(); boton.hidden = true; };
  });
}

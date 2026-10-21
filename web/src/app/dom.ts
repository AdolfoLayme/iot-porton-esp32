export function elemento<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento ${id}`);
  return el as T;
}
export const texto = (id: string, valor: string) => { elemento(id).textContent = valor; };
export function temaInicial() {
  let tema = matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  try { tema = localStorage.getItem('porton-tema') || tema; } catch { /* Almacenamiento opcional. */ }
  const aplicar = () => {
    document.documentElement.dataset.tema = tema;
    texto('tema', tema === 'claro' ? 'Oscuro' : 'Claro');
    elemento('tema').setAttribute('aria-label', `Activar tema ${tema === 'claro' ? 'oscuro' : 'claro'}`);
  };
  aplicar();
  elemento('tema').onclick = () => {
    tema = tema === 'claro' ? 'oscuro' : 'claro'; aplicar();
    try { localStorage.setItem('porton-tema', tema); } catch { /* El tema sigue funcionando. */ }
  };
}

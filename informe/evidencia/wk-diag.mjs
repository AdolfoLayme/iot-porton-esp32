import { abrirPestana } from './wk-lib.mjs';
const W = await abrirPestana('550B50E73C9B8F8947EDD8DAF0A01603');
await W.env('Page.bringToFront');
await W.js(`[...document.querySelectorAll('[role=tab], button, div')].find(e=>e.children.length===0&&e.textContent.trim()==='diagram.json')?.click()`);
await new Promise(r => setTimeout(r, 1500));
const t = await W.js(`(window.monaco?.editor?.getModels?.()||[]).filter(x=>x.getValue().includes('"connections"')).map(x=>x.getValue())[0]||document.querySelector('.view-lines')?.innerText`);
console.log(t);
await W.js(`[...document.querySelectorAll('[role=tab], button, div')].find(e=>e.children.length===0&&e.textContent.trim()==='sketch.ino')?.click()`);
W.cerrar();

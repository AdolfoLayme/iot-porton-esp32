// Reemplaza el contenido de un archivo en el editor de Wokwi (no guarda).
import { abrirPestana } from './wk-lib.mjs';
import { readFileSync } from 'node:fs';
const [nombre, ruta] = process.argv.slice(2);
const W = await abrirPestana('550B50E73C9B8F8947EDD8DAF0A01603');
await W.env('Page.bringToFront');
await W.js(`[...document.querySelectorAll('div,button')].find(e=>e.children.length===0&&e.textContent.trim()===${JSON.stringify(nombre)})?.click()`);
await new Promise(r => setTimeout(r, 1200));
const texto = readFileSync(ruta, 'utf8');
console.log(nombre, await W.js(`(()=>{const ed=window.monaco.editor.getEditors().find(e=>e.hasTextFocus()||e.getDomNode().offsetParent);const m=ed.getModel();
  ed.executeEdits('act',[{range:m.getFullModelRange(),text:${JSON.stringify(texto)}}]);return m.getValue()===${JSON.stringify(texto)}?'ok':'distinto'})()`));
W.cerrar();

import { pestana, dormir } from '/home/adolfo/Proyectos/juegos/cripta-oleadas/herramientas/chatgpt/cdp.mjs';
import { writeFileSync } from 'node:fs';
const [archivo, salida, w, h] = process.argv.slice(2);
const p = await pestana();
try {
  await p.env('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 2, mobile: false });
  await p.env('Page.navigate', { url: 'file://' + archivo }); await dormir(1500);
  const { data } = await p.env('Page.captureScreenshot', { format: 'png' }); writeFileSync(salida, Buffer.from(data, 'base64'));
} finally { await p.cerrar(); }

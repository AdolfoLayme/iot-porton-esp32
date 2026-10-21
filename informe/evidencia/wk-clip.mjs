import { abrirPestana } from './wk-lib.mjs';
import { writeFileSync } from 'node:fs';
const [x, y, w, h, esc, out] = process.argv.slice(2);
const W = await abrirPestana('550B50E73C9B8F8947EDD8DAF0A01603');
await W.env('Emulation.setDeviceMetricsOverride', { width: 1500, height: 860, deviceScaleFactor: 1, mobile: false });
await W.env('Page.bringToFront'); await new Promise(r => setTimeout(r, 800));
const s = await W.env('Page.captureScreenshot', { format: 'png', clip: { x: +x, y: +y, width: +w, height: +h, scale: +esc } });
writeFileSync(out, Buffer.from(s.data, 'base64'));
await W.env('Emulation.clearDeviceMetricsOverride'); W.cerrar();

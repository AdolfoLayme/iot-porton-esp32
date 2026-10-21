import {Composition} from 'remotion';
import {Arquitectura, CUADROS} from './Arquitectura';

// 5 s a 30 fps: el cuadro 150 es igual al 0, así el bucle en Canva no tiene costura.
export const Raiz = () => (
  <Composition id="Arquitectura" component={Arquitectura} durationInFrames={CUADROS} fps={30} width={1920} height={1080} />
);

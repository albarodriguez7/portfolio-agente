/* ==========================================================================
   journey.js — El recorrido de la cámara
   Cada sección del HTML (data-scene) tiene sus fotogramas clave en
   coordenadas del mundo, con u = progreso local de la sección (0 → 1).
   El scroll se convierte en un progreso global t y la cámara interpola una
   curva Catmull-Rom entre fotogramas. Hay dos "pistas": el exterior
   (escritorio) y el interior del agente; el paso entre ellas es un corte
   que se disimula atravesando la pantalla con un destello.
   ========================================================================== */
import * as THREE from 'three';
import { SCREEN } from './exterior.js?v=202610151809';
import { CONTROL } from './control.js?v=202610151809';

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const S = SCREEN;

/* shift: desplazamiento del encuadre para dejar sitio al panel de texto
   (1 = escena a la derecha en escritorio / arriba en móvil, 0 = centrada) */
export const KEYFRAMES = {
  'exterior-in': [
    { u: 0.0,  pos: v(4.4, 2.9, 6.4),        look: v(0, 1.45, 0),      shift: 1,   track: 'ext' },
    { u: 0.4,  pos: v(2.3, 2.25, 3.9),       look: v(0, 1.5, 0.2),     shift: 0.75, track: 'ext' },
    { u: 0.78, pos: v(0.25, 1.62, 1.55),     look: v(0, S.y, 0.4),     shift: 0.08, track: 'ext' },
    { u: 1.0,  pos: v(0, S.y, S.z + 0.09),   look: v(0, S.y, -1),      shift: 0,   track: 'ext' }
  ],
  tokenizer: [
    { u: 0.0,  pos: v(0, 0, -96),     look: v(0, 0, -112),   shift: 0, track: 'in' },
    { u: 0.55, pos: v(0, 0.2, -122),  look: v(0, 0, -140),   shift: 0, track: 'in' },
    { u: 1.0,  pos: v(0, 0.3, -150),  look: v(0, 0, -166),   shift: 0.2, track: 'in' }
  ],
  brain: [
    { u: 0.3,  pos: v(0.6, 0.5, -166),  look: v(0, 0, -180),  shift: 0.6, track: 'in' },
    { u: 0.75, pos: v(-0.8, 0.8, -183), look: v(0, 0, -197),  shift: 0.6, track: 'in' },
    { u: 1.0,  pos: v(0, 0.6, -193),    look: v(0, 0, -206),  shift: 0.4, track: 'in' }
  ],
  'brain-out': [
    { u: 0.45, pos: v(4.6, 1.8, -201),  look: v(0, 0, -206),   shift: 0, track: 'in' },
    { u: 1.0,  pos: v(3.5, 3.2, -214),  look: v(0, 1.5, -236), shift: 0.3, track: 'in' }
  ],
  memory: [
    { u: 0.15, pos: v(0, -0.2, -222),  look: v(0, -0.6, -236), shift: 0.6, track: 'in' },
    { u: 0.6,  pos: v(-1.2, 1.4, -222.5), look: v(0, 0.6, -236), shift: 0.6, track: 'in' },
    { u: 1.0,  pos: v(0, 3.4, -223),   look: v(0, 1.2, -236),  shift: 0.6, track: 'in' }
  ],
  workshop: [
    { u: 0.08, pos: v(-1, 1.4, -262),   look: v(2.5, -0.6, -277), shift: 0.6, track: 'in' },
    { u: 0.5,  pos: v(-1, 0.9, -282),   look: v(3, -0.4, -296),   shift: 0.6, track: 'in' },
    { u: 1.0,  pos: v(-0.6, 1.2, -305), look: v(1.5, 0.5, -324),  shift: 0.6, track: 'in' }
  ],
  vectors: [
    { u: 0.12, pos: v(-1.5, 2.2, -331), look: v(-4.2, 2.1, -341), shift: 1, track: 'in' },
    { u: 0.33, pos: v(0, 2.2, -331),    look: v(-1, 2.1, -342),   shift: 1, track: 'in' },
    { u: 0.53, pos: v(2, 2.2, -331),    look: v(3.6, 2.1, -342),  shift: 1, track: 'in' },
    { u: 0.74, pos: v(3.4, 2.2, -331),  look: v(6.8, 2.1, -341),  shift: 1, track: 'in' },
    { u: 0.88, pos: v(1.3, 2.0, -335),  look: v(1.3, 1.8, -350),  shift: 0.6, track: 'in' },
    { u: 1.0,  pos: v(1.3, 1.6, -348),  look: v(0.5, 0.9, -368),  shift: 0.6, track: 'in' }
  ],
  gates: [
    { u: 0.08, pos: v(0, 0.9, -362),   look: v(0, 0.6, -380),  shift: 0.6, track: 'in' },
    { u: 1.0,  pos: v(0, 1.4, -404),   look: v(0, 2, -432),    shift: 0.4, track: 'in' }
  ],
  control: [
    { u: 0.12, pos: v(0, 2, -412),     look: v(0, 1.9, -432),  shift: 0.55, track: 'in' },
    { u: 0.7,  pos: v(0.3, 2.4, -419), look: v(0, 2.3, -432),  shift: 0.55, track: 'in' },
    { u: 0.9,  pos: v(0, 3.4, -428.6), look: CONTROL.exit,     shift: 0.1, track: 'in' },
    { u: 1.0,  pos: v(0, CONTROL.exit.y, CONTROL.exit.z + 0.12), look: v(0, CONTROL.exit.y, -450), shift: 0, track: 'in' }
  ],
  'exterior-out': [
    { u: 0.0,  pos: v(0, S.y, S.z + 0.12),  look: v(0, S.y, 0),      shift: 0,   track: 'ext' },
    { u: 0.3,  pos: v(0.2, 1.62, 1.7),      look: v(0, 1.5, 0),      shift: 0.3, track: 'ext' },
    { u: 0.75, pos: v(3.6, 2.7, 5.6),       look: v(0, 1.35, 0),     shift: 1,   track: 'ext' },
    { u: 1.0,  pos: v(4.6, 3.1, 6.8),       look: v(0, 1.35, 0),     shift: 1,   track: 'ext' }
  ]
};

/* Catmull-Rom uniforme entre 4 puntos */
function catmull(p0, p1, p2, p3, s, out) {
  const s2 = s * s, s3 = s2 * s;
  return out.set(
    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * s + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3),
    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * s + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3),
    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * s + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * s2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * s3)
  );
}

export function createJourney(sectionEls, scrollMax) {
  let frames = [];     // fotogramas con su t global, ordenados
  let sections = [];   // { el, scene, start, end }
  let cuts = [];       // t de los cortes entre pistas

  /* Recalcula los t globales a partir de la maqueta (llamar al redimensionar) */
  function layout() {
    const max = Math.max(1, scrollMax ? scrollMax() : document.documentElement.scrollHeight - window.innerHeight);
    sections = sectionEls.map(el => {
      const top = el.offsetTop;
      return { el, scene: el.dataset.scene, start: top / max, end: Math.min(1, (top + el.offsetHeight) / max) };
    });
    sections[sections.length - 1].end = 1;
    frames = [];
    sections.forEach(s => {
      (KEYFRAMES[s.scene] || []).forEach(k => frames.push({ ...k, t: s.start + k.u * (s.end - s.start) }));
    });
    frames.sort((a, b) => a.t - b.t);
    cuts = [];
    for (let i = 1; i < frames.length; i++) if (frames[i].track !== frames[i - 1].track) cuts.push((frames[i].t + frames[i - 1].t) / 2);
  }

  const pos = new THREE.Vector3(), look = new THREE.Vector3();

  /* Posición, objetivo, encuadre y pista de la cámara para un t global */
  function sample(t) {
    if (t <= frames[0].t) return { pos: pos.copy(frames[0].pos), look: look.copy(frames[0].look), shift: frames[0].shift, track: frames[0].track };
    const last = frames[frames.length - 1];
    if (t >= last.t) return { pos: pos.copy(last.pos), look: look.copy(last.look), shift: last.shift, track: last.track };
    let i = 0;
    while (i < frames.length - 2 && t >= frames[i + 1].t) i++;
    const a = frames[i], b = frames[i + 1];
    // corte entre pistas: no se interpola, se salta en la mitad
    if (a.track !== b.track) {
      const k = (t - a.t) / Math.max(1e-6, b.t - a.t) < 0.5 ? a : b;
      return { pos: pos.copy(k.pos), look: look.copy(k.look), shift: k.shift, track: k.track };
    }
    const p0 = frames[i - 1] && frames[i - 1].track === a.track ? frames[i - 1] : a;
    const p3 = frames[i + 2] && frames[i + 2].track === a.track ? frames[i + 2] : b;
    let s = (t - a.t) / Math.max(1e-6, b.t - a.t);
    s = s * s * (3 - 2 * s) * 0.35 + s * 0.65;     // ligera suavidad en cada tramo
    catmull(p0.pos, a.pos, b.pos, p3.pos, s, pos);
    catmull(p0.look, a.look, b.look, p3.look, s, look);
    return { pos, look, shift: a.shift + (b.shift - a.shift) * s, track: a.track };
  }

  /* Progreso local (0 → 1) de cada escena para un t global */
  function local(t) {
    const out = {};
    sections.forEach(s => { out[s.scene] = Math.min(1, Math.max(0, (t - s.start) / Math.max(1e-6, s.end - s.start))); });
    return out;
  }

  /* Índice de la sección activa */
  function activeIndex(t) {
    let idx = 0;
    sections.forEach((s, i) => { if (t >= s.start - 1e-4) idx = i; });
    return idx;
  }

  /* Destello al cruzar una pantalla (0 → 1 → 0 alrededor de cada corte) */
  function flash(t) {
    let f = 0;
    cuts.forEach(c => { f = Math.max(f, 1 - Math.abs(t - c) / 0.006); });
    return Math.max(0, f);
  }

  /* t "de reposo" de una sección (para movimiento reducido: sin trayectos) */
  function restT(index) {
    const s = sections[index];
    const ks = (KEYFRAMES[s.scene] || []);
    const mid = ks[Math.floor((ks.length - 1) / 2)] || { u: 0.5 };
    return s.start + mid.u * (s.end - s.start);
  }

  layout();
  return { layout, sample, local, activeIndex, flash, restT, get sections() { return sections; } };
}

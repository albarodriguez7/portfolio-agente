/* ==========================================================================
   vectors.js — El índice del retriever (Stack)
   Cuatro fichas de cristal, una por categoría, con sus herramientas en
   lista. Un haz de lectura las recorre una a una según avanza el scroll.
   Pocos elementos y mucho espacio: se lee de un vistazo.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, neon, neonLine, canvasTexture, starfield, clamp } from './kit.js?v=202610151853';

export const VECTORS = { center: new THREE.Vector3(1.3, 2, -342) };

// Color y posición de cada ficha (en arco, con un hueco en el centro para pasar)
const CARDS = [
  { id: 'agents',  color: C.violet, css: '#c4b5fd', pos: new THREE.Vector3(-4.2, 2.1, -341) },
  { id: 'data',    color: C.cyan,   css: '#67e8f9', pos: new THREE.Vector3(-1.0, 2.1, -342.4) },
  { id: 'backend', color: C.amber,  css: '#fcd34d', pos: new THREE.Vector3(3.6, 2.1, -342.4) },
  { id: 'quality', color: C.green,  css: '#6ee7b7', pos: new THREE.Vector3(6.8, 2.1, -341) }
];
const W = 3.0, H = 4.2;

export function createVectors() {
  const group = new THREE.Group();
  group.name = 'vectors';

  // fondo muy discreto: solo polvo lejano
  group.add(starfield({ count: 500, radius: 60, size: 0.12, center: new THREE.Vector3(1, -10, -350), seed: 31 }));

  const cards = [];
  CARDS.forEach((def, i) => {
    const root = new THREE.Group();
    root.position.copy(def.pos);
    root.lookAt(1.3, 2.1, -326);                  // todas miran al pasillo de la cámara

    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ color: 0x0a0c1c, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
    const tex = canvasTexture(512, 720);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, toneMapped: false }));
    face.position.z = 0.01;
    const frameMat = neonLine(def.color, 1.2, { transparent: true });
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W, H)), frameMat);
    frame.position.z = 0.02;
    // haz de lectura que barre la ficha activa
    const scanMat = neon(def.color, 2.4, { transparent: true, opacity: 0 });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.08, 0.035), scanMat);
    scan.position.z = 0.03;

    root.add(glass, face, frame, scan);
    group.add(root);
    cards.push({ root, tex, face, frameMat, scan, scanMat, def, index: i });
  });

  function draw(card, cluster) {
    card.tex.redraw((ctx, w) => {
      ctx.fillStyle = card.def.css;
      ctx.font = `600 26px ${MONO}`;
      ctx.fillText(`[${card.index}]`, 34, 62);
      ctx.font = `800 34px ${MONO}`;
      ctx.fillText(cluster.name, 34, 112, w - 68);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fillRect(34, 136, w - 68, 2);
      ctx.font = `500 30px ${MONO}`;
      cluster.items.forEach((name, j) => {
        ctx.fillStyle = card.def.css;
        ctx.fillText('›', 34, 192 + j * 48);
        ctx.fillStyle = '#ece9f7';
        ctx.fillText(name, 66, 192 + j * 48, w - 100);
      });
    });
  }

  return {
    group,
    range: [VECTORS.center.z + 22, VECTORS.center.z - 22],
    setContent(c) {
      c.retriever.clusters.forEach(cl => {
        const card = cards.find(k => k.def.id === cl.id);
        if (card) draw(card, cl);
      });
    },
    update(time, { u, marks = [] }) {
      // la ficha que se está leyendo: la del último bloque de texto que ha llegado a la zona de lectura
      const pos = marks.length
        ? Math.max(0, marks.reduce((acc, m, i) => (m > 0 ? i - 1 + m : acc), -1))
        : clamp((u - 0.12) / 0.62) * (cards.length - 1);
      cards.forEach((card, i) => {
        const k = clamp(1 - Math.abs(pos - i));             // 1 = ficha que se está leyendo
        const read = pos >= i - 0.5;                          // ya leída o leyéndose
        card.face.material.opacity = read ? 0.75 + 0.25 * k : 0.35;
        card.frameMat.opacity = read ? 0.5 + 0.5 * k : 0.25;
        card.root.scale.setScalar(1 + k * 0.06);
        card.scanMat.opacity = k * 0.9;
        card.scan.position.y = (0.5 - ((time * 0.35 + i * 0.25) % 1)) * H * 0.92;
      });
    }
  };
}

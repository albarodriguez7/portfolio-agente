/* ==========================================================================
   memory.js — Formación (nodo state): una estantería de biblioteca
   Cada etapa de la formación es un libro con su título en el lomo:
   Marketing y Publicidad y el Bootcamp en la balda de abajo; los módulos y
   la etapa actual en la de arriba. Cuando se lee su texto, el libro sale un
   poco de la estantería y su lomo se ilumina. Encima, un birrete; al lado,
   una lámpara de pie. Pocos elementos, luz cálida y tranquila.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, canvasTexture, smooth } from './kit.js?v=202610152051';

// Estantería centrada en SHELF, con el frente mirando hacia +z (hacia la cámara)
export const SHELF = new THREE.Vector3(1.5, 0, -232);
const W = 5.4, H = 3.6, D = 0.8;               // ancho, alto y fondo de la estantería
const SHELVES_Y = [-1.25, 0.45];                // altura de la cara superior de cada balda

// Libros con etapa (índice de bloque de texto) y relleno; x relativa al centro
const BOOKS = [
  // balda de abajo
  { shelf: 0, x: -2.2, w: 0.42, h: 1.25, color: 0x6d5bd0, stage: 0 },   // Marketing y Publicidad
  { shelf: 0, x: -1.72, w: 0.18, h: 1.0, color: 0x4b4a5c },
  { shelf: 0, x: -1.5, w: 0.2, h: 1.1, color: 0x6b5b4a },
  { shelf: 0, x: -0.95, w: 0.62, h: 1.4, color: 0x0e7490, stage: 1 },   // Bootcamp (libro gordo)
  { shelf: 0, x: -0.4, w: 0.2, h: 1.05, color: 0x3f4a5c, tilt: -0.22 },
  // balda de arriba
  { shelf: 1, x: -2.15, w: 0.2, h: 0.88, color: 0x5a4b6b, tilt: 0.18 },
  { shelf: 1, x: -1.7, w: 0.42, h: 1.02, color: 0x0891b2, stage: 2 },    // Módulo 1
  { shelf: 1, x: -1.18, w: 0.42, h: 1.06, color: 0x0e7490, stage: 3 },   // Módulo 2
  { shelf: 1, x: -0.66, w: 0.42, h: 1.0, color: 0x155e75, stage: 4 },   // Módulo 3
  { shelf: 1, x: -0.25, w: 0.16, h: 0.84, color: 0x4b4a5c },
  { shelf: 1, x: 0.3, w: 0.46, h: 1.06, color: 0xb45309, stage: 5 }      // IA generativa (actual)
];

export function createMemory() {
  const group = new THREE.Group();
  group.name = 'memory';
  group.position.copy(SHELF);

  // Luz cálida y suave (la de la lámpara) + relleno tenue
  group.add(new THREE.HemisphereLight(0xc9bfff, 0x120a1e, 0.55));
  const lampLight = new THREE.PointLight(0xffd6a0, 9, 9, 1.6);
  lampLight.position.set(-3.6, 1.6, 1.4);
  group.add(lampLight);

  /* ── Estantería de madera ── */
  const wood = solid(0x7a5536), woodDark = solid(0x5c3f28);
  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.06), woodDark);
  back.position.set(0, (H / 2) - 1.95, -D / 2);
  group.add(back);
  for (const x of [-W / 2, W / 2]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, D), wood);
    side.position.set(x, H / 2 - 1.95, 0);
    group.add(side);
  }
  for (const y of [-1.95, ...SHELVES_Y, H - 1.95]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, D), wood);
    board.position.set(0, y - 0.05, 0);
    group.add(board);
  }

  /* ── Birrete encima de la estantería ── */
  const cap = new THREE.Group();
  const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.9), solid(0x1f1d2b));
  capTop.rotation.y = Math.PI / 4;
  const capBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.22, 8), solid(0x1f1d2b));
  capBase.position.y = -0.13;
  const tassel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.35, 0.03), solid(0xfbbf24));
  tassel.position.set(0.42, -0.17, 0);
  cap.add(capTop, capBase, tassel);
  cap.position.set(1.4, H - 1.95 + 0.3, 0.05);
  cap.rotation.y = 0.35;
  group.add(cap);

  /* ── Lámpara de pie ── */
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.2, 6), solid(0x2a2833));
  pole.position.y = -0.35;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.06, 10), solid(0x2a2833));
  foot.position.y = -1.92;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 0.45, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xf3e3c3, emissive: 0xffc98a, emissiveIntensity: 0.55, side: THREE.DoubleSide, flatShading: true }));
  shade.position.y = 1.35;
  lamp.add(pole, foot, shade);
  lamp.position.set(-3.6, 0, 1.1);
  group.add(lamp);

  /* ── Libros ── */
  const books = BOOKS.map(def => {
    const book = new THREE.Group();
    const baseY = SHELVES_Y[def.shelf] + def.h / 2;
    const depth = 0.62;
    const body = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, depth), solid(def.color));
    book.add(body);
    // tapa de páginas (color papel) visible por arriba
    const pages = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.82, 0.012, depth * 0.94), solid(0xefe6d2));
    pages.position.y = def.h / 2 + 0.002;
    book.add(pages);
    let spine = null, tex = null;
    if (def.stage != null) {
      tex = canvasTexture(Math.round(def.w * 220), Math.round(def.h * 220));
      spine = new THREE.Mesh(new THREE.PlaneGeometry(def.w * 0.92, def.h * 0.94), new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, toneMapped: false }));
      spine.position.z = depth / 2 + 0.004;
      book.add(spine);
    }
    book.position.set(def.x, baseY, 0.04);
    if (def.tilt) { book.rotation.z = def.tilt; book.position.x += def.tilt * 0.4; book.position.y -= Math.abs(def.tilt) * 0.08; }
    group.add(book);
    return { ...def, book, spine, tex, baseZ: 0.04 };
  });
  const staged = books.filter(b => b.stage != null).sort((a, b) => a.stage - b.stage);

  // Texto vertical en el lomo: etiqueta pequeña + título
  function drawSpine(b, kicker, title) {
    b.tex.redraw((ctx, w, h) => {
      const accent = b.stage === 5 ? '#fde68a' : b.stage === 0 ? '#ddd6fe' : '#cffafe';
      // bandas decorativas arriba y abajo
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(0, 18, w, 6); ctx.fillRect(0, h - 24, w, 6);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      const big = Math.min(w * 0.36, 34);
      ctx.font = `800 ${big}px ${MONO}`;
      ctx.fillText(title, 0, -w * 0.02, h * 0.86);
      ctx.fillStyle = accent;
      ctx.font = `600 ${Math.round(big * 0.62)}px ${MONO}`;
      ctx.fillText(kicker, 0, w * 0.3, h * 0.86);
      ctx.restore();
    });
  }

  return {
    group,
    range: [-205, -258],
    setContent(c) {
      const s = c.state;
      const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      drawSpine(staged[0], plain(s.previous.dates), plain(s.previous.name));
      drawSpine(staged[1], 'The Bridge · ' + plain(s.bootcamp.dates), plain(s.bootcamp.short || s.bootcamp.name));
      s.messages.slice(0, 4).forEach((m, i) => drawSpine(staged[2 + i], plain(m.role).split(' · ')[0], plain(m.title)));
    },
    update(time, { u, marks = [] }) {
      staged.forEach((b, i) => {
        const k = marks.length ? smooth(0, 1, marks[i] ?? 0) : smooth(i / 7, i / 7 + 0.12, u);
        b.book.position.z = b.baseZ + k * 0.4;               // el libro sale de la estantería
        b.spine.material.color.setScalar(0.55 + 0.45 * k);   // y su lomo se ilumina con suavidad
      });
      cap.position.y = H - 1.95 + 0.3 + Math.sin(time * 0.8) * 0.02;
    }
  };
}

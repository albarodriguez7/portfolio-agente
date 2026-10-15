/* ==========================================================================
   memory.js — La memoria del agente (nodo state) como historial de checkpoints
   Una línea de luz (la rama principal) con un punto por etapa de la
   formación y su ficha de cristal al lado. Marketing y Publicidad llega por
   una rama aparte que se une a la principal en el bootcamp; la etapa actual
   lleva la etiqueta HEAD. Cada checkpoint se enciende cuando se lee su texto.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, neon, neonLine, canvasTexture, roundRect, smooth, clamp } from './kit.js?v=202610151927';

// Profundidad (z) de cada checkpoint: anterior, bootcamp, módulos 1-3 y actualidad
export const CHECKPOINTS_Z = [-216, -223, -230, -237, -244, -251];
const LINE_X = 1.4, LINE_Y = -1.2, CARD_X = 3.9, CARD_Y = 0.5;
const BRANCH_X = 2.8;

export const MEMORY = { center: new THREE.Vector3(1.5, 0, -234) };

export function createMemory() {
  const group = new THREE.Group();
  group.name = 'memory';
  group.add(new THREE.HemisphereLight(0xb7a9ff, 0x0a0614, 0.8));

  /* ── Rama principal: tramo apagado + tramo encendido que crece con la lectura ── */
  const zStart = CHECKPOINTS_Z[1] + 2, zEnd = CHECKPOINTS_Z[5] - 4;
  const len = zStart - zEnd;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, len), new THREE.MeshBasicMaterial({ color: 0x2b2550 }));
  rail.position.set(LINE_X, LINE_Y, (zStart + zEnd) / 2);
  const lit = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 1), neon(C.cyan, 0.9));
  lit.position.set(LINE_X, LINE_Y, zStart);
  group.add(rail, lit);

  /* ── Rama de Marketing que se une a la principal en el bootcamp ── */
  const branchCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(BRANCH_X, LINE_Y, CHECKPOINTS_Z[0] + 5),
    new THREE.Vector3(BRANCH_X, LINE_Y, CHECKPOINTS_Z[0]),
    new THREE.Vector3(BRANCH_X - 0.4, LINE_Y, CHECKPOINTS_Z[0] - 4),
    new THREE.Vector3(LINE_X, LINE_Y, CHECKPOINTS_Z[1])
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(branchCurve, 40, 0.018, 5, false), neon(C.violet, 0.8)));

  /* ── Checkpoints: punto + conector + ficha ── */
  const items = CHECKPOINTS_Z.map((z, i) => {
    const onBranch = i === 0;
    const nx = onBranch ? BRANCH_X : LINE_X;
    const node = new THREE.Mesh(new THREE.IcosahedronGeometry(i === 5 ? 0.2 : 0.14, 1), new THREE.MeshBasicMaterial({ color: 0x3a335e, toneMapped: false }));
    node.position.set(nx, LINE_Y, z);
    const conn = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(nx, LINE_Y, z), new THREE.Vector3(CARD_X - 1.6, CARD_Y - 0.4, z)
    ]), neonLine(C.grid, 0.9, { transparent: true, opacity: 0.4 }));
    group.add(node, conn);

    const card = new THREE.Group();
    card.position.set(CARD_X, CARD_Y, z);
    card.lookAt(-2.5, 1.0, z + 7);                     // mira hacia el pasillo de la cámara
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.47), new THREE.MeshBasicMaterial({ color: 0x0a0c1c, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    const tex = canvasTexture(640, 294);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.47), new THREE.MeshBasicMaterial({ map: tex.texture, transparent: true, toneMapped: false }));
    face.position.z = 0.01;
    const frameMat = neonLine(onBranch ? C.violet : i === 5 ? C.amber : C.cyan, 1.0, { transparent: true });
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.2, 1.47)), frameMat);
    frame.position.z = 0.02;
    card.add(glass, face, frame);
    group.add(card);

    // Etiqueta HEAD sobre el último checkpoint
    let head = null;
    if (i === 5) {
      const ht = canvasTexture(256, 80, ctx => {
        ctx.fillStyle = '#fbbf24'; roundRect(ctx, 2, 2, 252, 76, 14); ctx.fill();
        ctx.fillStyle = '#1a1405'; ctx.font = `800 34px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('HEAD → main', 128, 42);
      });
      head = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshBasicMaterial({ map: ht.texture, transparent: true, toneMapped: false }));
      head.position.set(-1.05, 0.95, 0.02);
      card.add(head);
    }
    return { z, node, card, tex, face, glass, frameMat, onBranch, head, index: i };
  });

  const dim = new THREE.Color(0x3a335e);
  const on = { branch: new THREE.Color(C.violet).multiplyScalar(1.3), main: new THREE.Color(C.cyan).multiplyScalar(1.3), head: new THREE.Color(C.amber).multiplyScalar(1.4) };

  function draw(item, kicker, title, foot) {
    const accent = item.onBranch ? '#c4b5fd' : item.index === 5 ? '#fcd34d' : '#67e8f9';
    item.tex.redraw((ctx, w, h) => {
      ctx.fillStyle = accent;
      ctx.font = `600 26px ${MONO}`;
      ctx.fillText(kicker, 30, 74, w - 60);
      ctx.fillStyle = '#f5f3ff';
      ctx.font = `800 40px ${MONO}`;
      ctx.fillText(title, 30, 142, w - 60);
      ctx.fillStyle = '#8c92ad';
      ctx.font = `500 22px ${MONO}`;
      ctx.fillText(foot, 30, h - 34, w - 60);
    });
  }

  return {
    group,
    range: [-205, -258],
    setContent(c) {
      const s = c.state;
      const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      draw(items[0], plain(s.previous.dates), plain(s.previous.name), 'branch: marketing');
      draw(items[1], 'The Bridge · ' + plain(s.bootcamp.dates), plain(s.bootcamp.short || s.bootcamp.name), 'merge → main · checkpoint_1');
      s.messages.slice(0, 4).forEach((m, i) => draw(items[2 + i], plain(m.role), plain(m.title), `checkpoint_${i + 2}`));
    },
    update(time, { u, marks = [] }) {
      // progreso de cada checkpoint: sus marcas de lectura (o el avance de la sección)
      const k = items.map((_, i) => marks.length ? smooth(0, 1, marks[i] ?? 0) : smooth(i / 7, i / 7 + 0.12, u));
      items.forEach((it, i) => {
        const v = k[i];
        it.node.material.color.copy(dim).lerp(it.onBranch ? on.branch : i === 5 ? on.head : on.main, v);
        it.face.material.opacity = 0.18 + 0.82 * v;
        it.glass.material.opacity = 0.35 + 0.5 * v;
        it.frameMat.opacity = 0.2 + 0.8 * v;
        it.card.position.y = CARD_Y - (1 - v) * 0.25;
        if (it.head) it.head.material.opacity = v;
      });
      // la rama principal se enciende hasta el último checkpoint leído
      let reach = 0;
      for (let i = 1; i < items.length; i++) reach = Math.max(reach, (i - 1 + k[i]) / (items.length - 2));
      const litLen = Math.max(0.001, clamp(reach) * (zStart - CHECKPOINTS_Z[5]));
      lit.scale.z = litLen;
      lit.position.z = zStart - litLen / 2;
    }
  };
}

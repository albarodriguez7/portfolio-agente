/* ==========================================================================
   memory.js — La memoria del agente (nodo state)
   Una torre de archivo: cada etapa de la formación es una placa (un mensaje)
   que cae y se apila sobre dos escalones base: Marketing y Publicidad y el bootcamp. Alrededor, un anillo de
   "checkpoints" que gira lentamente.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, edges, canvasTexture, roundRect, label, smooth, mulberry } from './kit.js?v=202610151839';

export const MEMORY = { center: new THREE.Vector3(0, 0, -236) };

export function createMemory() {
  const group = new THREE.Group();
  group.name = 'memory';
  group.position.copy(MEMORY.center);
  const rand = mulberry(9);

  /* ── Plataforma y columna central ── */
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.4, 0.5, 8), solid(0x141127));
  floor.position.y = -2.6;
  group.add(floor, Object.assign(edges(floor.geometry, C.grid, 1.4), { name: 'floorEdge' }));
  group.getObjectByName('floorEdge').position.y = -2.6;

  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, 0.5), neon(C.violet, 1.2));
  spine.position.set(0, 4.5, -2.1);
  group.add(spine);

  /* ── Anillo de checkpoints (cubos que brillan) ── */
  const CUBES = 360;
  const ring = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), new THREE.MeshBasicMaterial({ toneMapped: false }), CUBES);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < CUBES; i++) {
    const a = rand() * Math.PI * 2, r = 17 + rand() * 6, y = -4 + rand() * 16;
    m.makeTranslation(Math.cos(a) * r, y, Math.sin(a) * r);
    ring.setMatrixAt(i, m);
    col.set(rand() > 0.7 ? C.amber : rand() > 0.5 ? C.cyan : C.grid).multiplyScalar(0.35 + rand() * 0.9);
    ring.setColorAt(i, col);
  }
  group.add(ring);
  const ckLabel = label('checkpoint', { size: 0.4, border: '#fbbf24', color: '#fde68a' });
  ckLabel.position.set(-7.5, 7, 3);
  group.add(ckLabel);

  group.add(new THREE.HemisphereLight(0xa99bff, 0x0a0614, 0.9));
  const light = new THREE.PointLight(C.cyan, 25, 25, 1.4);
  light.position.set(0, 4, 6);
  group.add(light);

  /* ── Placas: base (bootcamp) + un mensaje por etapa ── */
  const plates = new THREE.Group();
  group.add(plates);
  let items = [];

  // Textura de la cara frontal con las proporciones reales de la placa (sin estirar el texto)
  function plateTexture(w, h, index, kicker, title, accent) {
    const cw = 1024, ch = Math.round(cw * h / w);
    return canvasTexture(cw, ch, ctx => {
      ctx.fillStyle = accent === 'amber' ? '#1b1236' : '#0e1124';
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = { amber: '#fbbf24', cyan: '#22d3ee', violet: '#a78bfa' }[accent];
      ctx.fillRect(0, 0, 10, ch);
      ctx.font = `500 ${Math.round(ch * 0.24)}px ${MONO}`;
      ctx.fillStyle = '#8b93b8';
      ctx.fillText(index, 34, ch * 0.38);
      ctx.fillStyle = { amber: '#fde68a', cyan: '#a5f3fc', violet: '#c4b5fd' }[accent];
      ctx.fillText(kicker, 34 + Math.round(ch * 0.24) * 3.2, ch * 0.38);
      ctx.font = `700 ${Math.round(ch * 0.4)}px ${MONO}`;
      ctx.fillStyle = '#f5f3ff';
      ctx.fillText(title, 34 + Math.round(ch * 0.24) * 3.2, ch * 0.82, cw - 200);
    });
  }

  function build(c) {
    plates.clear();
    const s = c.state;
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    // Dos escalones grandes e iguales (Marketing y Publicidad + Bootcamp) y, encima, un mensaje por etapa
    const defs = [
      { idx: 'base', kicker: s.previous.dates, title: plain(s.previous.name), base: true, accent: 'cyan' },
      { idx: 'base', kicker: 'The Bridge · ' + s.bootcamp.dates, title: plain(s.bootcamp.short || s.bootcamp.name), base: true, accent: 'cyan' }
    ].concat(s.messages.map((msg, i) => ({ idx: `[${i}]`, kicker: plain(msg.role), title: plain(msg.title), accent: msg.highlight ? 'amber' : 'violet' })));

    let y = -2.35;                                   // cara superior de la plataforma
    items = defs.map(d => {
      const plate = new THREE.Group();
      const w = d.base ? 7.4 : 6.4, h = d.base ? 0.85 : 0.62, depth = d.base ? 3.9 : 3.2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth), solid(d.base ? 0x221a44 : 0x161433));
      const tex = plateTexture(w * 0.98, h * 0.94, d.idx, d.kicker, d.title, d.accent);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, h * 0.94), new THREE.MeshBasicMaterial({ map: tex.texture, toneMapped: false, transparent: true }));
      face.position.z = depth / 2 + 0.005;
      const outline = edges(box.geometry, { amber: C.amber, cyan: C.cyan, violet: C.violet }[d.accent], 2);
      plate.add(box, face, outline);
      plate.userData = { restY: y + h / 2, base: d.base, mats: [box.material, face.material, outline.material] };
      plate.userData.mats.forEach(mt => { mt.transparent = true; });
      y += h + 0.06;
      plates.add(plate);
      return plate;
    });
  }

  // momento (u) en que cae cada mensaje: los escalones base ya están colocados
  const dropAt = (i, n) => i / n * 0.8 + 0.05;

  return {
    group,
    range: [MEMORY.center.z + 18, MEMORY.center.z - 16],
    setContent: build,
    update(time, { u, marks = [] }) {
      const msgs = items.filter(p => !p.userData.base);
      items.forEach(p => {
        const i = msgs.indexOf(p);
        // cae justo cuando su párrafo llega a la zona de lectura (o, sin marcas, según el avance)
        const k = i < 0 ? 1 : marks.length ? smooth(0, 1, marks[i] ?? 0) : smooth(dropAt(i, msgs.length), dropAt(i, msgs.length) + 0.14, u);
        p.position.y = p.userData.restY + (1 - k) * 9;
        p.rotation.y = (1 - k) * 0.6;
        p.userData.mats.forEach(mt => { mt.opacity = k; });
        p.visible = k > 0.01;
      });
      ring.rotation.y = time * 0.05;
    },
    // cuántos mensajes hay ya en el estado (para el HUD)
    count(u) {
      const n = items.filter(p => !p.userData.base).length;
      let c = 0;
      for (let i = 0; i < n; i++) if (u >= dropAt(i, n) + 0.1) c++;
      return c;
    }
  };
}

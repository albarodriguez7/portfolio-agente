/* ==========================================================================
   memory.js — La memoria del agente (nodo state)
   Una torre de archivo: cada etapa de la formación es una placa (un mensaje)
   que cae y se apila sobre la base del bootcamp. Alrededor, un anillo de
   "checkpoints" que gira lentamente.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, edges, canvasTexture, roundRect, label, smooth, mulberry } from './kit.js';

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

  function plateTexture(index, kicker, title, highlight) {
    return canvasTexture(1024, 160, (ctx, w, h) => {
      ctx.fillStyle = highlight ? '#1b1236' : '#0e1124';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = highlight ? '#fbbf24' : '#a78bfa';
      ctx.fillRect(0, 0, 10, h);
      ctx.font = `500 30px ${MONO}`;
      ctx.fillStyle = '#8b93b8';
      ctx.fillText(index, 34, 62);
      ctx.fillStyle = highlight ? '#fde68a' : '#c4b5fd';
      ctx.fillText(kicker, 120, 62);
      ctx.font = `700 50px ${MONO}`;
      ctx.fillStyle = '#f5f3ff';
      ctx.fillText(title, 120, 122);
    });
  }

  function build(c) {
    plates.clear();
    const s = c.state;
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
    const defs = [{ idx: 'base', kicker: s.bootcamp.dates, title: 'The Bridge', base: true }]
      .concat(s.messages.map((msg, i) => ({ idx: `[${i}]`, kicker: plain(msg.role), title: plain(msg.title), highlight: msg.highlight })));

    items = defs.map((d, i) => {
      const plate = new THREE.Group();
      const w = d.base ? 7.2 : 6.4, depth = d.base ? 3.8 : 3.2;
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, 0.62, depth), solid(d.base ? 0x221a44 : 0x161433));
      const tex = plateTexture(d.idx, d.kicker, d.title, d.highlight);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.98, 0.6), new THREE.MeshBasicMaterial({ map: tex.texture, toneMapped: false, transparent: true }));
      face.position.z = depth / 2 + 0.005;
      const outline = edges(box.geometry, d.highlight ? C.amber : d.base ? C.cyan : C.violet, 2);
      plate.add(box, face, outline);
      plate.userData = { restY: -2.05 + i * 0.68, mats: [box.material, face.material, outline.material] };
      plate.userData.mats.forEach(mt => { mt.transparent = true; });
      plates.add(plate);
      return plate;
    });
  }

  return {
    group,
    range: [MEMORY.center.z + 18, MEMORY.center.z - 16],
    setContent: build,
    update(time, { u }) {
      // Cada placa cae a su sitio según avanza la sección (la base ya está)
      const n = items.length;
      items.forEach((p, i) => {
        const k = i === 0 ? 1 : smooth((i - 1) / (n - 1) * 0.85, (i - 1) / (n - 1) * 0.85 + 0.16, u);
        p.position.y = p.userData.restY + (1 - k) * 9;
        p.rotation.y = (1 - k) * 0.6;
        p.userData.mats.forEach(mt => { mt.opacity = k; });
        p.visible = k > 0.01;
      });
      ring.rotation.y = time * 0.05;
    },
    // cuántos mensajes hay ya en el estado (para el HUD)
    count(u) {
      const n = items.length - 1;
      let c = 0;
      for (let i = 1; i <= n; i++) if (u >= (i - 1) / n * 0.85 + 0.12) c++;
      return c;
    }
  };
}

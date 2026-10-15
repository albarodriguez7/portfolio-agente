/* ==========================================================================
   gates.js — Los guardrails
   Un pasillo con 2 arcos de control (cada uno resume varias reglas). Cada uno tiene barras láser rojas que
   se abren y se vuelven verdes cuando el mensaje (la cámara) las supera.
   ========================================================================== */
import * as THREE from 'three';
import { C, solid, neon, edges, label, smooth, gridFloor } from './kit.js?v=202610151927';

export const GATES = { zStart: -366, first: -380, step: 14, count: 2 };

export function createGates() {
  const group = new THREE.Group();
  group.name = 'gates';

  const floor = gridFloor(40, 20, C.grid, 0.9);
  floor.position.set(0, -2.5, -392);
  group.add(floor);
  group.add(new THREE.HemisphereLight(0xa99bff, 0x0a0614, 0.7));

  const red = new THREE.Color(C.red).multiplyScalar(2.4);
  const green = new THREE.Color(C.green).multiplyScalar(2.4);
  const gates = [];

  for (let i = 0; i < GATES.count; i++) {
    const z = GATES.first - i * GATES.step;
    const root = new THREE.Group();
    root.position.set(0, 0, z);

    // pilares y dintel
    const pillarGeo = new THREE.BoxGeometry(0.6, 6, 0.6);
    for (const x of [-3.8, 3.8]) {
      const p = new THREE.Mesh(pillarGeo, solid(0x1a1630));
      p.position.set(x, 0.5, 0);
      const e = edges(pillarGeo, C.grid, 1.2);
      e.position.copy(p.position);
      root.add(p, e);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.6, 0.6), solid(0x1a1630));
    lintel.position.y = 3.6;
    root.add(lintel);

    // pilotos de estado
    const lampMat = new THREE.MeshBasicMaterial({ color: red.clone(), toneMapped: false });
    for (const x of [-3.8, 3.8]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.64), lampMat);
      lamp.position.set(x, 3.1, 0);
      root.add(lamp);
    }

    // barras láser (mitad izquierda y derecha, para que se abran)
    const laserMat = new THREE.MeshBasicMaterial({ color: red.clone(), toneMapped: false, transparent: true, opacity: 0.9 });
    const left = new THREE.Group(), right = new THREE.Group();
    for (let b = 0; b < 7; b++) {
      const y = -2.1 + b * 0.75;
      const l = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.04, 0.04), laserMat);
      l.position.set(-1.75, y, 0);
      left.add(l);
      const r = l.clone();
      r.position.x = 1.75;
      right.add(r);
    }
    left.position.x = 0; right.position.x = 0;
    root.add(left, right);

    const tag = label(`guardrail_${String(i + 1).padStart(2, '0')}`, { size: 0.4, border: '#f43f5e', color: '#fecdd3' });
    tag.position.set(0, 4.5, 0);
    root.add(tag);

    group.add(root);
    gates.push({ z, left, right, lampMat, laserMat, root, tag });
  }

  return {
    group,
    range: [GATES.zStart + 10, GATES.first - GATES.step * GATES.count - 14],
    setContent(c) {
      // rótulo de cada arco con el id de la regla
      gates.forEach((g, i) => {
        const rule = c.guardrails.rules[i];
        if (!rule) return;
        g.root.remove(g.tag);
        g.tag = label(`guardrail_${String(i + 1).padStart(2, '0')} · ${rule.id}`, { size: 0.4, border: '#f43f5e', color: '#fecdd3' });
        g.tag.position.set(0, 4.5, 0);
        g.root.add(g.tag);
        g.label = rule.id;
      });
    },
    update(time, { camera, marks = [] }) {
      gates.forEach((g, i) => {
        // se abre cuando su regla llega a la zona de lectura (sin marcas: al acercarse la cámara)
        const k = marks.length ? smooth(0, 1, marks[i] ?? 0) : smooth(g.z + 9, g.z + 3, camera.position.z);
        g.open = k;
        g.left.position.x = -k * 2.2;
        g.right.position.x = k * 2.2;
        g.lampMat.color.copy(red).lerp(green, k);
        g.laserMat.color.copy(red).lerp(green, k);
        g.laserMat.opacity = (1 - k * 0.75) * 0.8;
        g.tag.material.color.set(k > 0.5 ? 0xbbf7d0 : 0xffffff);
      });
    },
    passed() { return gates.filter(g => (g.open || 0) > 0.5).length; }
  };
}

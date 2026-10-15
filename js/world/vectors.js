/* ==========================================================================
   vectors.js — El espacio de vectores (nodo retriever)
   Una galaxia de puntos con 4 nubes (una por categoría del stack). Cada
   tecnología es una estrella con nombre. Al elegir una en el panel, el
   retriever traza un rayo hasta ella y se ilumina.
   ========================================================================== */
import * as THREE from 'three';
import { C, label, neonLine, mulberry } from './kit.js';

export const VECTORS = { center: new THREE.Vector3(0, 2, -342) };

const CLUSTERS = {
  agents:  { pos: new THREE.Vector3(-3, 5.5, -340), color: C.violet, css: '#c4b5fd' },
  data:    { pos: new THREE.Vector3(9, 4.5, -344), color: C.cyan, css: '#a5f3fc' },
  backend: { pos: new THREE.Vector3(1, -3, -347), color: C.amber, css: '#fde68a' },
  quality: { pos: new THREE.Vector3(10, -2.5, -352), color: C.green, css: '#a7f3d0' }
};

/* Normal aproximada (suma de uniformes) para nubes con forma gaussiana */
const gauss = rand => (rand() + rand() + rand() + rand() - 2) / 2;

export function createVectors() {
  const group = new THREE.Group();
  group.name = 'vectors';
  const rand = mulberry(77);

  /* ── Nubes de puntos ── */
  const PER = 900;
  const ids = Object.keys(CLUSTERS);
  const pos = new Float32Array(PER * ids.length * 3 + 1500 * 3);
  const col = new Float32Array(pos.length);
  const c = new THREE.Color();
  let p = 0;
  ids.forEach(id => {
    const cl = CLUSTERS[id];
    for (let i = 0; i < PER; i++) {
      pos[p] = cl.pos.x + gauss(rand) * 3.4;
      pos[p + 1] = cl.pos.y + gauss(rand) * 2.4;
      pos[p + 2] = cl.pos.z + gauss(rand) * 3.4;
      c.set(cl.color).multiplyScalar(0.6 + rand() * 1.2);
      col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
      p += 3;
    }
  });
  // polvo de fondo
  for (let i = 0; i < 1500; i++) {
    pos[p] = (rand() - 0.5) * 60;
    pos[p + 1] = (rand() - 0.5) * 30 + 2;
    pos[p + 2] = VECTORS.center.z + (rand() - 0.5) * 60;
    c.set(0x8b7bff).multiplyScalar(0.3 + rand() * 0.5);
    col[p] = c.r; col[p + 1] = c.g; col[p + 2] = c.b;
    p += 3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const cloud = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, vertexColors: true, toneMapped: false, transparent: true, opacity: 0.9, depthWrite: false }));
  group.add(cloud);

  /* ── Estrellas con nombre (tecnologías) y rótulos de categoría ── */
  const stars = new THREE.Group();
  group.add(stars);
  const starMap = new Map();

  // Rayo de la consulta
  const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const ray = new THREE.Line(rayGeo, neonLine(C.white, 2.2, { transparent: true, opacity: 0.9 }));
  ray.visible = false;
  group.add(ray);
  const queryOrigin = new THREE.Vector3(2, 1.5, -330);

  let selected = null;

  function build(content) {
    stars.clear();
    starMap.clear();
    content.retriever.clusters.forEach(cluster => {
      const cl = CLUSTERS[cluster.id];
      if (!cl) return;
      const title = label(cluster.name, { size: 0.62, border: cl.css, color: cl.css, weight: 700 });
      title.position.copy(cl.pos).add(new THREE.Vector3(0, 3.6, 0));
      stars.add(title);
      const n = cluster.items.length;
      cluster.items.forEach((item, i) => {
        // espiral alrededor del centro de la nube
        const a = i * 2.4, r = 1.2 + (i / n) * 2.6;
        const s = label(item.name, { size: 0.36, border: cl.css, color: '#f5f3ff' });
        s.position.set(cl.pos.x + Math.cos(a) * r, cl.pos.y + Math.sin(a * 1.3) * 1.6, cl.pos.z + Math.sin(a) * r);
        s.userData.base = s.scale.clone();
        stars.add(s);
        starMap.set(item.name, s);
      });
    });
    if (selected) highlight(selected);
  }

  function highlight(name) {
    selected = name;
    starMap.forEach((s, key) => {
      const on = key === name;
      s.scale.copy(s.userData.base).multiplyScalar(on ? 1.7 : 1);
      s.material.opacity = name && !on ? 0.45 : 1;
      s.renderOrder = on ? 10 : 0;
    });
    const target = starMap.get(name);
    ray.visible = !!target;
    if (target) {
      rayGeo.setFromPoints([queryOrigin, target.position]);
    }
  }

  return {
    group,
    range: [VECTORS.center.z + 22, VECTORS.center.z - 22],
    setContent: build,
    highlight,
    update(time) {
      cloud.rotation.y = Math.sin(time * 0.05) * 0.04;
      stars.children.forEach((s, i) => { s.position.y += Math.sin(time * 0.8 + i) * 0.0015; });
    }
  };
}

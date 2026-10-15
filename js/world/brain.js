/* ==========================================================================
   brain.js — El LLM por dentro (nodo agent)
   Capas de neuronas dispuestas en anillos (la cámara cruza por el centro),
   conexiones entre capas y pulsos de "atención" que viajan por ellas.
   Al final, un núcleo que gira: donde se decide la siguiente acción.
   ========================================================================== */
import * as THREE from 'three';
import { C, neon, neonLine, label, mulberry } from './kit.js?v=202610151853';

export const BRAIN = { zStart: -158, zEnd: -206, core: new THREE.Vector3(0, 0, -206) };

export function createBrain() {
  const group = new THREE.Group();
  group.name = 'brain';
  const rand = mulberry(42);

  /* ── Neuronas: 6 capas, cada una con dos anillos ── */
  const layerZ = [-162, -169, -176, -183, -190, -197];
  const nodes = [];       // posiciones
  const layerOf = [];
  layerZ.forEach((z, li) => {
    const rings = [[4.6, 16], [3.0, 10]];
    rings.forEach(([r, n], ri) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + li * 0.35 + ri * 0.2;
        nodes.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.82, z + (rand() - 0.5) * 0.6));
        layerOf.push(li);
      }
    });
  });

  const nodeMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), nodes.length);
  const mtx = new THREE.Matrix4();
  const base = [], col = new THREE.Color();
  nodes.forEach((p, i) => {
    mtx.makeTranslation(p.x, p.y, p.z);
    nodeMesh.setMatrixAt(i, mtx);
    base.push(new THREE.Color(rand() > 0.5 ? C.violet : C.cyan));
    nodeMesh.setColorAt(i, base[i]);
  });
  group.add(nodeMesh);

  /* ── Conexiones entre capas consecutivas ── */
  const links = [];
  const linkPos = [];
  nodes.forEach((p, i) => {
    const next = nodes.map((q, j) => j).filter(j => layerOf[j] === layerOf[i] + 1);
    for (let k = 0; k < 3 && next.length; k++) {
      const j = next[Math.floor(rand() * next.length)];
      links.push([i, j]);
      linkPos.push(p.x, p.y, p.z, nodes[j].x, nodes[j].y, nodes[j].z);
    }
  });
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(linkPos, 3));
  group.add(new THREE.LineSegments(linkGeo, neonLine(C.grid, 1.2, { transparent: true, opacity: 0.28 })));

  /* ── Pulsos de atención viajando por las conexiones ── */
  const PULSES = 160;
  const pulsePos = new Float32Array(PULSES * 3);
  const pulses = Array.from({ length: PULSES }, () => ({ link: Math.floor(rand() * links.length), t: rand(), speed: 0.4 + rand() * 0.8 }));
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({ color: new THREE.Color(C.amber).multiplyScalar(2.2), size: 0.16, toneMapped: false, transparent: true, depthWrite: false });
  group.add(new THREE.Points(pulseGeo, pulseMat));

  /* ── Etiquetas de capa ── */
  const layerLabels = [];
  ['embedding', 'attention', 'attention', 'mlp', 'attention', 'logits'].forEach((key, i) => {
    const s = label(key, { size: 0.42, border: '#7c3aed' });
    s.position.set(0, 4.9, layerZ[i]);
    s.userData.key = key;
    group.add(s);
    layerLabels.push(s);
  });

  /* ── Núcleo de decisión ── */
  const core = new THREE.Group();
  core.position.copy(BRAIN.core);
  const coreSolid = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 0), new THREE.MeshStandardMaterial({ color: 0x2a1458, emissive: 0x5b21b6, emissiveIntensity: 0.9, flatShading: true }));
  const coreWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.3, 1)), neonLine(C.cyan, 2));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.03, 6, 64), neon(C.amber, 2.4));
  ring.rotation.x = Math.PI / 2;
  core.add(coreSolid, coreWire, ring);
  group.add(core);
  const coreLight = new THREE.PointLight(C.violet, 40, 22, 1.4);
  coreLight.position.copy(BRAIN.core);
  group.add(coreLight);
  group.add(new THREE.HemisphereLight(0x8b7bff, 0x0a0614, 0.6));

  const tmpA = new THREE.Vector3();

  return {
    group,
    range: [BRAIN.zStart + 12, BRAIN.zEnd - 14],
    setContent(c) {
      // Etiquetas traducidas: se sustituyen los sprites
      layerLabels.forEach((s, i) => {
        const txt = (c.labels && c.labels[s.userData.key]) || s.userData.key;
        const fresh = label(txt, { size: 0.42, border: '#7c3aed' });
        fresh.position.copy(s.position);
        fresh.userData.key = s.userData.key;
        group.remove(s);
        group.add(fresh);
        layerLabels[i] = fresh;
      });
    },
    update(time, { dt }) {
      // pulsos
      pulses.forEach((p, i) => {
        p.t += dt * p.speed;
        if (p.t > 1) { p.t = 0; p.link = Math.floor(Math.random() * links.length); }
        const [a, b] = links[p.link];
        tmpA.lerpVectors(nodes[a], nodes[b], p.t);
        pulsePos[i * 3] = tmpA.x; pulsePos[i * 3 + 1] = tmpA.y; pulsePos[i * 3 + 2] = tmpA.z;
      });
      pulseGeo.attributes.position.needsUpdate = true;

      // neuronas que se "activan"
      for (let i = 0; i < nodes.length; i++) {
        const act = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 1.37 + layerOf[i]);
        col.copy(base[i]).multiplyScalar(0.8 + act * act * 2.2);
        nodeMesh.setColorAt(i, col);
      }
      nodeMesh.instanceColor.needsUpdate = true;

      core.rotation.y = time * 0.35;
      coreWire.rotation.x = time * 0.2;
      ring.rotation.z = time * 0.5;
      coreLight.intensity = 30 + Math.sin(time * 2) * 10;
    }
  };
}

/* ==========================================================================
   workshop.js — El taller de herramientas (nodo tools)
   Un pasillo con un pedestal por proyecto. Sobre cada uno flota un objeto
   low-poly y una pantalla holográfica con su tool_call. Cuando la cámara
   pasa, la herramienta "se ejecuta": haz de luz y el anillo pasa a verde.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, neonLine, edges, canvasTexture, screenMesh, wrapText, smooth, gridFloor } from './kit.js';

export const WORKSHOP = { zStart: -262, zEnd: -312 };

/* Objetos low-poly que representan cada proyecto */
function makeIcon(id) {
  const g = new THREE.Group();
  if (id === 'leads') {                       // lupa: investiga webs
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 6, 12), solid(0xe8dcc0));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.42, 12), neon(C.cyan, 1.2, { transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), solid(0x7c3aed));
    handle.position.set(0.45, -0.6, 0);
    handle.rotation.z = 0.7;
    g.add(ring, lens, handle);
  } else if (id === 'reservas') {             // calendario
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.16), solid(0xf5f3ff));
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.24, 0.18), solid(0xe11d48));
    head.position.y = 0.4;
    g.add(body, head);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const cell = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.02), (r === 1 && c === 2) ? neon(C.green, 2) : solid(0xc7c2e0));
      cell.position.set(-0.3 + c * 0.2, 0.12 - r * 0.2, 0.09);
      g.add(cell);
    }
  } else if (id === 'api') {                   // enchufe: API
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), solid(0x2a2540));
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), neon(C.amber, 2));
    const p2 = p1.clone();
    p1.position.set(-0.15, 0.55, 0);
    p2.position.set(0.15, 0.55, 0);
    g.add(body, p1, p2);
  } else if (id === 'ml') {                    // árbol de decisión
    const pts = [[0, 0.5], [-0.45, 0], [0.45, 0], [-0.7, -0.5], [-0.2, -0.5], [0.2, -0.5], [0.7, -0.5]];
    pts.forEach(([x, y]) => { const n = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), neon(C.violet, 2)); n.position.set(x, y, 0); g.add(n); });
    const lines = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]].flatMap(([a, b]) => [pts[a][0], pts[a][1], 0, pts[b][0], pts[b][1], 0]);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    g.add(new THREE.LineSegments(lg, neonLine(C.cyan, 1.6)));
  } else {                                     // casa: Airbnb
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.7), solid(0xf5e6c8));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.68, 0.5, 4), solid(0xe11d48));
    roof.position.y = 0.55;
    roof.rotation.y = Math.PI / 4;
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.02), neon(C.amber, 1.6));
    door.position.set(0, -0.15, 0.36);
    g.add(body, roof, door);
  }
  return g;
}

export function createWorkshop() {
  const group = new THREE.Group();
  group.name = 'workshop';

  const floor = gridFloor(60, 30, C.grid, 0.9);
  floor.position.set(0, -3, (WORKSHOP.zStart + WORKSHOP.zEnd) / 2);
  group.add(floor);
  group.add(new THREE.HemisphereLight(0xb7a9ff, 0x0b0716, 1.0));
  const dir = new THREE.DirectionalLight(0xfff1d6, 1.2);
  dir.position.set(-3, 8, -270);
  dir.target.position.set(0, -2, -290);
  group.add(dir, dir.target);

  const stations = [];

  function build(c) {
    stations.forEach(s => group.remove(s.root));
    stations.length = 0;
    const all = c.tools.main.map(t => ({ ...t, main: true })).concat(c.tools.secondary);
    all.forEach((tool, i) => {
      const root = new THREE.Group();
      root.position.set(i % 2 ? 5.2 : 3.6, -3, -274 - i * 8.5);
      root.rotation.y = -0.55;                  // mira hacia el pasillo (a la izquierda)

      const scale = tool.main ? 1 : 0.85;
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.95 * scale, 1.1 * scale, 1.3, 6), solid(0x1b1834));
      ped.position.y = 0.65;
      const ringMat = neon(C.amber, 2.2);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98 * scale, 0.04, 6, 6), ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.32;
      root.add(ped, ring, edges(ped.geometry, C.grid, 1).translateY(0.65));

      const icon = makeIcon(tool.id);
      icon.scale.setScalar(scale * 1.1);
      icon.position.y = 2.4;
      root.add(icon);

      // Haz de luz cuando se ejecuta
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * scale, 0.9 * scale, 3.6, 6, 1, true),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(C.green).multiplyScalar(1.6), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
      beam.position.y = 3.1;
      root.add(beam);

      // Pantalla holográfica con la llamada
      const result = tool.main ? tool.result.slice(0, 3).map(r => r.value).join(' · ') : tool.result;
      const tex = canvasTexture(900, 360, (ctx, w, h) => {
        ctx.fillStyle = 'rgba(10,12,30,0.92)';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.font = `500 30px ${MONO}`;
        ctx.fillStyle = '#8b93b8';
        ctx.fillText('tool_call:', 30, 56);
        ctx.fillStyle = '#c4b5fd';
        ctx.font = `700 36px ${MONO}`;
        ctx.fillText(`${tool.fn}()`, 210, 56);
        ctx.fillStyle = '#f5f3ff';
        const plain = tool.title.replace(/&amp;/g, '&');
        ctx.font = `700 46px ${MONO}`;
        const y = wrapText(ctx, plain, 30, 132, w - 60, 54);
        ctx.fillStyle = '#34d399';
        ctx.font = `600 34px ${MONO}`;
        wrapText(ctx, '→ ' + result, 30, Math.max(y + 20, 250), w - 60, 42);
      });
      const holo = screenMesh(2.7 * scale, 1.08 * scale, tex, 0.95);
      holo.position.set(0, 5.3, 0);
      root.add(holo);

      group.add(root);
      stations.push({ root, icon, ring, ringMat, beam, z: root.position.z });
    });
  }

  const amber = new THREE.Color(C.amber).multiplyScalar(2.2);
  const green = new THREE.Color(C.green).multiplyScalar(2.4);

  return {
    group,
    range: [WORKSHOP.zStart + 14, WORKSHOP.zEnd - 14],
    setContent: build,
    update(time, { camera }) {
      stations.forEach((s, i) => {
        // la herramienta se ejecuta cuando la cámara llega a su altura
        const k = smooth(s.z + 9, s.z + 2, camera.position.z);
        s.icon.rotation.y = time * (0.6 + k * 2.2) + i;
        s.icon.position.y = 2.4 + Math.sin(time * 1.5 + i) * 0.12 + k * 0.3;
        s.ringMat.color.copy(amber).lerp(green, k);
        s.beam.material.opacity = k * (0.18 + Math.sin(time * 6) * 0.04);
      });
    }
  };
}

/* ==========================================================================
   tokenizer.js — La "garganta" del agente
   Un túnel de anillos de neón. El mensaje del visitante aparece como una
   fila de bloques (tokens) que se separan hacia las paredes cuando pasamos:
   el texto se convierte en vectores.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, edges, canvasTexture, roundRect, smooth, clamp } from './kit.js?v=202610151809';

export const TOKENIZER = { zStart: -98, zEnd: -152 };

export function createTokenizer() {
  const group = new THREE.Group();
  group.name = 'tokenizer';

  /* ── Túnel: anillos octogonales + líneas longitudinales (1 sola geometría) ── */
  const pts = [], cols = [];
  const R = 3.4, SIDES = 8;
  const cA = new THREE.Color(C.cyan), cB = new THREE.Color(C.violet), tmp = new THREE.Color();
  for (let z = TOKENIZER.zStart; z >= TOKENIZER.zEnd; z -= 2.6) {
    tmp.copy(cA).lerp(cB, (TOKENIZER.zStart - z) / (TOKENIZER.zStart - TOKENIZER.zEnd)).multiplyScalar(1.6);
    for (let s = 0; s < SIDES; s++) {
      const a0 = (s / SIDES) * Math.PI * 2 + Math.PI / 8, a1 = ((s + 1) / SIDES) * Math.PI * 2 + Math.PI / 8;
      pts.push(Math.cos(a0) * R, Math.sin(a0) * R, z, Math.cos(a1) * R, Math.sin(a1) * R, z);
      cols.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
    }
  }
  for (let s = 0; s < SIDES; s++) {
    const a = (s / SIDES) * Math.PI * 2 + Math.PI / 8;
    pts.push(Math.cos(a) * R, Math.sin(a) * R, TOKENIZER.zStart, Math.cos(a) * R, Math.sin(a) * R, TOKENIZER.zEnd);
    cols.push(0.5, 0.35, 1.2, 0.5, 0.35, 1.2);
  }
  const tunnelGeo = new THREE.BufferGeometry();
  tunnelGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  tunnelGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  group.add(new THREE.LineSegments(tunnelGeo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 0.85 })));

  // Paneles de "circuito" en las paredes para dar volumen
  const panelGeo = new THREE.BoxGeometry(0.06, 1.2, 2.2);
  const panels = new THREE.InstancedMesh(panelGeo, solid(0x1a1530, { emissive: 0x120a2a }), 40);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 40; i++) {
    const a = ((i % SIDES) / SIDES) * Math.PI * 2 + Math.PI / 8 + Math.PI / SIDES;
    e.set(0, 0, a);
    q.setFromEuler(e);
    v.set(Math.cos(a) * (R - 0.05), Math.sin(a) * (R - 0.05), TOKENIZER.zStart - 3 - Math.floor(i / SIDES) * 10.4 - (i % 3));
    m.compose(v, q, one);
    panels.setMatrixAt(i, m);
  }
  group.add(panels);

  // Luz que tiñe el túnel
  const light = new THREE.PointLight(C.cyan, 30, 30, 1.5);
  light.position.set(0, 0, -112);
  group.add(light);

  /* ── Tokens: bloques con el texto del mensaje ── */
  const tokensGroup = new THREE.Group();
  group.add(tokensGroup);
  let tokens = [];

  function buildTokens(list) {
    tokensGroup.clear();
    tokens = list.map((txt, i) => {
      const text = txt.replace(/ /g, '·');
      const tex = canvasTexture(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#0d0b1f';
        roundRect(ctx, 4, 4, w - 8, h - 8, 18);
        ctx.fill();
        ctx.strokeStyle = i % 2 ? '#22d3ee' : '#a78bfa';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.fillStyle = '#f5f3ff';
        ctx.font = `600 ${text.length > 6 ? 40 : 54}px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, w / 2, h / 2 + 2);
      });
      const block = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.18), solid(0x1b1638));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), new THREE.MeshBasicMaterial({ map: tex.texture, toneMapped: false }));
      face.position.z = 0.091;
      block.add(box, face, edges(box.geometry, i % 2 ? C.cyan : C.violet, 2));
      const n = list.length;
      const a = (i / n) * Math.PI * 2;
      block.userData = {
        from: new THREE.Vector3((i - (n - 1) / 2) * 1.08, 0.05 * Math.sin(i), -110),
        to: new THREE.Vector3(Math.cos(a) * 2.5, Math.sin(a) * 2.5, -114 - i * 3.3),
        spin: (i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.3)
      };
      tokensGroup.add(block);
      return block;
    });
  }

  return {
    group,
    range: [TOKENIZER.zStart + 10, TOKENIZER.zEnd - 10],
    setContent(c) { buildTokens(c.tokens || []); },
    update(time, { camera }) {
      // Los tokens se separan a medida que la cámara se acerca
      const f = smooth(-100, -109, camera.position.z);
      tokens.forEach((b, i) => {
        const { from, to, spin } = b.userData;
        const k = clamp(f * 1.15 - i * 0.012);
        b.position.lerpVectors(from, to, k);
        b.position.y += Math.sin(time * 1.4 + i) * 0.04;
        b.rotation.set(k * 0.4 * Math.sin(time + i), k * spin * Math.sin(time * 0.6 + i) * 0.6, k * (i / tokens.length) * Math.PI * 2);
      });
      light.position.z = clamp(camera.position.z - 10, TOKENIZER.zEnd, TOKENIZER.zStart);
    }
  };
}

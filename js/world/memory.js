/* ==========================================================================
   memory.js — Formación (nodo state): un cuaderno de apuntes que es un notebook
   Un cuaderno de anillas flotando ("alba.ipynb · Apuntes"). Sus páginas son de
   papel cuadriculado, pero cada una es una celda de Jupyter:
     In [n]: estudiar("…")   →   salida con la etapa, sus fechas y ✓ completado
   La portada se abre al empezar la sección y cada página pasa cuando se lee
   la etapa siguiente. La última (la actual) se queda abierta: ▶ en curso.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, canvasTexture, roundRect, wrapLines, smooth } from './kit.js?v=202610152058';

export const NOTEBOOK = new THREE.Vector3(1.5, 0.55, -232);
const PW = 2.3, PH = 3.1;                 // tamaño de una página
const N = 6;                              // etapas: anterior, bootcamp, 3 módulos y la actual

export function createMemory() {
  const group = new THREE.Group();
  group.name = 'memory';
  group.add(new THREE.HemisphereLight(0xd8d2ff, 0x140c22, 0.9));

  // El cuaderno, algo inclinado hacia atrás como sobre un atril invisible
  const book = new THREE.Group();
  book.position.copy(NOTEBOOK);
  book.rotation.x = -0.28;
  group.add(book);

  /* ── Contraportada (tapa dura) y anillas ── */
  const coverMat = solid(0x1e2a4a);
  const backCover = new THREE.Mesh(new THREE.BoxGeometry(PW * 2 + 0.2, PH + 0.14, 0.05), coverMat);
  backCover.position.z = -0.04;
  book.add(backCover);
  const ringMat = solid(0xb8bcc8, { metalness: 0.6, roughness: 0.35 });
  for (let i = 0; i < 12; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 6, 12), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(0, -PH / 2 + 0.2 + i * ((PH - 0.4) / 11), 0.03);
    book.add(ring);
  }

  /* ── Texturas de papel cuadriculado ── */
  const paper = (ctx, w, h) => {
    ctx.fillStyle = '#f6f3ea'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,110,170,0.16)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(225,80,80,0.45)'; ctx.lineWidth = 2;   // margen rojo
    ctx.beginPath(); ctx.moveTo(56, 0); ctx.lineTo(56, h); ctx.stroke();
  };

  // Dorso de las páginas: apuntes a mano y una gráfica que sube (igual para todas)
  const backTex = canvasTexture(560, 760, (ctx, w, h) => {
    paper(ctx, w, h);
    ctx.strokeStyle = '#3b4a7a'; ctx.lineWidth = 3;
    [[90, 120, 330], [90, 160, 380], [90, 200, 250], [90, 260, 360], [90, 300, 300]].forEach(([x, y, len]) => {
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let i = 0; i <= len; i += 12) ctx.lineTo(x + i, y + Math.sin(i * 0.25) * 3);
      ctx.stroke();
    });
    // ejes y curva de aprendizaje
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(110, 420); ctx.lineTo(110, 640); ctx.lineTo(470, 640); ctx.stroke();
    ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(120, 620);
    ctx.bezierCurveTo(230, 610, 300, 540, 460, 450); ctx.stroke();
    ctx.fillStyle = '#7c3aed'; ctx.font = `600 22px ${MONO}`; ctx.fillText('loss ↓  skills ↑', 260, 690);
  });

  /* ── Páginas: una por etapa, girando sobre las anillas ── */
  const pages = Array.from({ length: N }, (_, i) => {
    const pivot = new THREE.Group();                 // eje en las anillas (x = 0)
    const tex = canvasTexture(560, 760);
    // papel por debajo del umbral del bloom: se lee sin deslumbrar
    const front = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: tex.texture, color: 0xb8b8b8 }));
    front.position.x = PW / 2 + 0.04;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshBasicMaterial({ map: backTex.texture, color: 0xa8a8a8 }));
    back.position.x = PW / 2 + 0.04;
    back.rotation.y = Math.PI;
    back.position.z = -0.002;
    pivot.add(front, back);
    book.add(pivot);
    return { pivot, tex, front, back, index: i };
  });

  /* ── Portada (se abre al empezar la sección) ── */
  const coverPivot = new THREE.Group();
  const coverTex = canvasTexture(560, 760, (ctx, w, h) => {
    ctx.fillStyle = '#1e2a4a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fbbf24'; roundRect(ctx, 70, 120, w - 140, 170, 14); ctx.fill();
    ctx.fillStyle = '#1a1405'; ctx.font = `800 52px ${MONO}`; ctx.fillText('APUNTES', 110, 205);
    ctx.font = `600 30px ${MONO}`; ctx.fillText('alba.ipynb', 110, 255);
    ctx.fillStyle = '#9fb3e6'; ctx.font = `500 26px ${MONO}`;
    ctx.fillText('Data Science · IA', 90, 400); ctx.fillText('kernel: python3', 90, 445);
    ctx.fillStyle = '#34d399'; ctx.beginPath(); ctx.arc(w - 110, h - 110, 16, 0, 7); ctx.fill();
    ctx.fillStyle = '#9fb3e6'; ctx.font = `500 22px ${MONO}`; ctx.fillText('idle', w - 180, h - 102);
  });
  const coverFront = new THREE.Mesh(new THREE.BoxGeometry(PW + 0.1, PH + 0.14, 0.04), [coverMat, coverMat, coverMat, coverMat, new THREE.MeshBasicMaterial({ map: coverTex.texture, color: 0xd0d0d0 }), coverMat]);
  coverFront.position.x = PW / 2 + 0.07;
  coverPivot.add(coverFront);
  book.add(coverPivot);

  /* ── Contenido de cada página: una celda de Jupyter ── */
  function drawPage(p, n, call, kicker, title, current) {
    p.tex.redraw((ctx, w, h) => {
      paper(ctx, w, h);
      // In [n]:
      ctx.fillStyle = '#2563eb'; ctx.font = `600 24px ${MONO}`;
      ctx.fillText(`In [${n}]:`, 70, 70);
      // caja de código
      ctx.fillStyle = 'rgba(30,41,59,0.06)'; ctx.strokeStyle = 'rgba(30,41,59,0.25)'; ctx.lineWidth = 2;
      roundRect(ctx, 70, 88, w - 110, 96, 10); ctx.fill(); ctx.stroke();
      ctx.font = `600 22px ${MONO}`;
      ctx.fillStyle = '#7c3aed'; ctx.fillText('alba', 88, 125);
      ctx.fillStyle = '#1f2937'; ctx.fillText('.estudiar(', 88 + ctx.measureText('alba').width, 125);
      ctx.fillStyle = '#047857'; ctx.fillText(`  "${call}"`, 88, 160, w - 150);
      ctx.fillStyle = '#1f2937'; ctx.fillText(')', 88 + Math.min(ctx.measureText(`  "${call}"`).width, w - 150) + 2, 160);
      // salida
      ctx.fillStyle = '#dc2626'; ctx.font = `600 24px ${MONO}`;
      ctx.fillText(`Out[${n}]:`, 70, 250);
      ctx.fillStyle = current ? '#b45309' : '#0e7490';
      ctx.font = `600 24px ${MONO}`;
      ctx.fillText(kicker, 70, 300, w - 110);
      ctx.fillStyle = '#111827'; ctx.font = `800 40px ${MONO}`;
      wrapLines(ctx, title, w - 120).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, 70, 360 + i * 48));
      // estado de la celda
      ctx.font = `700 26px ${MONO}`;
      if (current) {
        ctx.fillStyle = '#fbbf24'; roundRect(ctx, 70, h - 120, 230, 52, 10); ctx.fill();
        ctx.fillStyle = '#1a1405'; ctx.fillText('▶ en curso', 88, h - 84);
      } else {
        ctx.fillStyle = '#047857'; ctx.fillText('✓ completado', 70, h - 84);
      }
    });
  }

  return {
    group,
    range: [-205, -258],
    setContent(c) {
      const s = c.state;
      const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };
      drawPage(pages[0], 1, plain(s.previous.name), plain(s.previous.dates), plain(s.previous.name), false);
      drawPage(pages[1], 2, 'Bootcamp', 'The Bridge · ' + plain(s.bootcamp.dates), plain(s.bootcamp.short || s.bootcamp.name), false);
      s.messages.slice(0, 4).forEach((m, i) => drawPage(pages[2 + i], 3 + i, plain(m.title), plain(m.role), plain(m.title), !!m.highlight));
    },
    update(time, { u, marks = [] }) {
      const k = i => (marks.length ? smooth(0, 1, marks[i] ?? 0) : smooth(i / 7, i / 7 + 0.12, u));
      // la portada se abre con la primera etapa; cada página pasa con la siguiente
      const flip = (pivot, v) => { pivot.rotation.y = -Math.PI * v * 0.98; };
      flip(coverPivot, k(0));
      coverPivot.position.z = 0.03 + (k(0) > 0.5 ? -0.02 : N * 0.006);
      pages.forEach((p, i) => {
        const v = i < N - 1 ? k(i + 1) : 0;
        flip(p.pivot, v);
        // orden de apilado: a la derecha arriba la primera sin pasar; a la izquierda, la última pasada
        p.pivot.position.z = v > 0.5 ? 0.004 * i : 0.004 * (N - i);
      });
      book.position.y = NOTEBOOK.y + Math.sin(time * 0.6) * 0.03;   // flota con calma
    }
  };
}

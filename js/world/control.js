/* ==========================================================================
   control.js — La sala de evaluación (nodo evaluator, estilo LangSmith)
   Una pared de monitores como una sala de control: la traza de los 5 pasos,
   el gráfico del 90 % al 99 %, el dataset, los problemas encontrados y,
   en el centro, la pantalla final_answer por la que salimos del agente.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, edges, canvasTexture, screenMesh, roundRect, wrapText, gridFloor, smooth, clamp, mulberry } from './kit.js?v=202610151820';

// La sala se construye en coordenadas propias y se acerca SHIFT metros al pasillo
const SHIFT = 50;
export const CONTROL = { wallZ: -482, exit: new THREE.Vector3(0, 3.5, -481.9 + SHIFT) };

export function createControl() {
  const group = new THREE.Group();
  group.name = 'control';
  group.position.z = SHIFT;
  const rand = mulberry(21);

  const floor = gridFloor(50, 25, C.grid, 0.9);
  floor.position.set(0, -1.2, -470);
  group.add(floor);
  group.add(new THREE.HemisphereLight(0xb7a9ff, 0x0a0614, 0.8));
  const glow = new THREE.PointLight(C.cyan, 30, 20, 1.4);
  glow.position.set(0, 3, -474);
  group.add(glow);

  /* ── Pared de monitores ── */
  const wall = new THREE.Mesh(new THREE.BoxGeometry(12.5, 5.6, 0.6), solid(0x15132a));
  wall.position.set(0, 2, CONTROL.wallZ - 0.4);
  group.add(wall);

  const screens = {};
  function monitor(key, x, y, w, h, texW, texH) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.3), solid(0x2a2540));
    frame.position.set(x, y, CONTROL.wallZ - 0.1);
    const tex = canvasTexture(texW, texH);
    const scr = screenMesh(w, h, tex, 1);
    scr.position.set(x, y, CONTROL.wallZ + 0.06);
    group.add(frame, scr);
    screens[key] = tex;
  }
  monitor('chart', -3.375, 1.175, 4.35, 2.95, 1024, 694);
  monitor('trace', 3.375, 1.175, 4.35, 2.95, 1024, 694);
  monitor('dataset', 0, 0.4, 2.1, 1.4, 512, 342);
  monitor('runs', 0, 1.95, 2.1, 1.4, 512, 342);
  monitor('fixes', -4.5, 3.5, 2.1, 1.4, 512, 342);
  monitor('wave', -2.25, 3.5, 2.1, 1.4, 512, 342);
  monitor('final', 0, 3.5, 2.1, 1.4, 512, 342);
  monitor('log', 2.25, 3.5, 2.1, 1.4, 512, 342);
  monitor('noise', 4.5, 3.5, 2.1, 1.4, 256, 171);

  // Rótulo luminoso de "trazando en directo"
  const sign = canvasTexture(512, 96, (ctx, w, h) => {
    ctx.fillStyle = '#2a0a12'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fb7185'; ctx.font = `700 54px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('● TRACING', w / 2, h / 2 + 3);
  });
  const signMesh = screenMesh(2.2, 0.42, sign, 1.6);
  signMesh.position.set(0, 4.75, CONTROL.wallZ + 0.1);
  group.add(signMesh);

  /* ── Mesa de mezclas con botones de colores (como en el vídeo) ── */
  const desk = new THREE.Mesh(new THREE.BoxGeometry(9, 0.9, 2.2), solid(0x2a2540));
  desk.position.set(0, -0.75, -475.5);
  desk.rotation.x = 0.18;
  group.add(desk);
  const palette = [C.red, C.green, C.amber, C.cyan, C.white, C.violet];
  const btns = new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.08, 0.22), new THREE.MeshBasicMaterial({ toneMapped: false }), 72);
  const m = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i < 72; i++) {
    const r = Math.floor(i / 24), c = i % 24;
    m.makeRotationX(0.18).setPosition(-4 + c * 0.35, -0.24 + r * 0.06, -476.2 + r * 0.33);
    btns.setMatrixAt(i, m);
    col.set(palette[Math.floor(rand() * palette.length)]).multiplyScalar(0.9 + rand() * 0.9);
    btns.setColorAt(i, col);
  }
  group.add(btns);

  // Racks laterales con LEDs
  const leds = [];
  for (const x of [-7.6, 7.6]) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5, 1.2), solid(0x141224));
    rack.position.set(x, 1.3, -478);
    group.add(rack);
    for (let j = 0; j < 16; j++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), neon(j % 3 ? C.green : C.amber, 2.4));
      l.position.set(x - 0.45 + (j % 4) * 0.3, -0.6 + Math.floor(j / 4) * 0.9, -477.38);
      group.add(l);
      leds.push(l);
    }
  }

  /* ── Flujos de datos en el pasillo de llegada (estelas que pasan) ── */
  const STREAKS = 70;
  const streakMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 2.4), new THREE.MeshBasicMaterial({ toneMapped: false }), STREAKS);
  const streaks = Array.from({ length: STREAKS }, (_, i) => {
    const a = rand() * Math.PI * 2, r = 3 + rand() * 5;
    streakMesh.setColorAt(i, col.set(rand() > 0.5 ? C.cyan : C.violet).multiplyScalar(1.6 + rand()));
    return { x: Math.cos(a) * r, y: 1.5 + Math.sin(a) * r * 0.6, z: -440 - rand() * 36, speed: 6 + rand() * 10 };
  });
  group.add(streakMesh);

  /* ── Dibujo de cada monitor ── */
  let content = null;
  const ok = '#34d399', ink = '#f5f3ff', dim = '#8b93b8', vio = '#c4b5fd';
  const head = (ctx, w, title, color = vio) => {
    ctx.fillStyle = '#0b0e1f'; ctx.fillRect(0, 0, w, 9999);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let y = 0; y < 1000; y += 4) ctx.fillRect(0, y, w, 1);
    ctx.fillStyle = color; ctx.font = `600 ${w > 600 ? 32 : 24}px ${MONO}`; ctx.fillText(title, 24, w > 600 ? 52 : 38);
  };

  function drawChart(ctx, w, h, u, mark) {
    const ch = content.evaluator.chart;
    head(ctx, w, 'LangSmith · experiments');
    ctx.fillStyle = ink; ctx.font = `700 38px ${MONO}`;
    wrapText(ctx, ch.title, 24, 112, w - 48, 44);
    const bars = ch.bars;
    bars.forEach((b, i) => {
      const k = mark == null ? smooth(0.12 + i * 0.22, 0.34 + i * 0.22, u) : smooth(i * 0.4, i * 0.4 + 0.6, mark);
      const y = 230 + i * 170;
      ctx.fillStyle = dim; ctx.font = `500 28px ${MONO}`; ctx.fillText(b.label, 24, y);
      ctx.fillStyle = '#1c2140'; ctx.fillRect(24, y + 20, w - 200, 60);
      ctx.fillStyle = i === bars.length - 1 ? '#a78bfa' : '#6d6a8f';
      ctx.fillRect(24, y + 20, (w - 200) * (b.value / 100) * k, 60);
      ctx.fillStyle = ink; ctx.font = `700 40px ${MONO}`;
      if (k > 0.05) ctx.fillText(b.display, 24 + (w - 200) * (b.value / 100) * k + 14, y + 64);
    });
    if (mark == null ? u > 0.6 : mark > 0.95) {
      ctx.fillStyle = ok; ctx.font = `700 36px ${MONO}`;
      ctx.fillText('↑ ' + ch.delta, 24, h - 40);
    }
  }

  function drawTrace(ctx, w, h, u, marks) {
    const E = content.evaluator;
    head(ctx, w, E.traceRoot);
    E.steps.forEach((s, i) => {
      const done = marks ? (marks[i] ?? 0) > 0.5 : u > 0.1 + i * 0.13;
      const y = 120 + i * 112;
      ctx.strokeStyle = '#3b3f6b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(44, y - 60); ctx.lineTo(44, y + 10); ctx.lineTo(70, y + 10); ctx.stroke();
      ctx.fillStyle = done ? '#10302a' : '#151a33';
      roundRect(ctx, 80, y - 28, w - 110, 84, 12); ctx.fill();
      ctx.fillStyle = done ? ok : dim; ctx.font = `600 26px ${MONO}`;
      ctx.fillText(`${i + 1} · ${s.id}`, 100, y + 2);
      ctx.fillStyle = ink; ctx.font = `600 30px ${MONO}`;
      ctx.fillText(s.title, 100, y + 40);
      ctx.fillStyle = done ? ok : '#3b3f6b'; ctx.font = `700 40px ${MONO}`;
      ctx.fillText(done ? '✓' : '…', w - 80, y + 26);
    });
  }

  function drawStatic() {
    const ch = content.evaluator.chart, L = content.labels || {};
    screens.dataset.redraw((ctx, w) => {
      head(ctx, w, 'dataset');
      ctx.fillStyle = ink; ctx.font = `700 92px ${MONO}`; ctx.fillText('35', 24, 170);
      ctx.fillStyle = dim; ctx.font = `500 24px ${MONO}`;
      wrapText(ctx, L.dataset || '', 24, 230, w - 48, 30);
      ctx.fillStyle = vio; ctx.fillText(L.evaluators || '', 24, 312);
    });
    screens.runs.redraw((ctx, w) => {
      head(ctx, w, L.experiments || 'runs', ok);
      ctx.fillStyle = ok; ctx.font = `700 74px ${MONO}`; ctx.fillText(ch.runs.split(' ')[0], 24, 160);
      ctx.fillStyle = dim; ctx.font = `500 24px ${MONO}`;
      wrapText(ctx, ch.runs, 24, 220, w - 48, 30);
    });
    screens.fixes.redraw((ctx, w) => {
      head(ctx, w, ch.fixesTitle.split(' ').slice(0, 3).join(' '), '#fbbf24');
      ctx.font = `500 21px ${MONO}`;
      let y = 90;
      ch.fixes.forEach(f => { ctx.fillStyle = ok; ctx.fillText('✓', 24, y); ctx.fillStyle = ink; y = wrapText(ctx, f, 54, y, w - 76, 26) + 8; });
    });
  }

  let lastDraw = -1;

  return {
    group,
    range: [-438 + SHIFT, -500 + SHIFT],
    setContent(c) { content = c; drawStatic(); lastDraw = -1; },
    update(time, { u, marks = [] }) {
      leds.forEach((l, i) => { l.visible = Math.sin(time * (2 + (i % 4)) + i * 2.1) > -0.4; });
      streaks.forEach((s, i) => {
        const z = -440 - ((s.z + 440 - time * s.speed) % 36 + 36) % 36;   // avanzan hacia la pared y vuelven a empezar
        m.makeTranslation(s.x, s.y, z);
        streakMesh.setMatrixAt(i, m);
      });
      streakMesh.instanceMatrix.needsUpdate = true;
      if (!content || time - lastDraw < 0.11) return;
      lastDraw = time;
      screens.chart.redraw((ctx, w, h) => drawChart(ctx, w, h, u, marks.length ? marks[marks.length - 1] : null));
      screens.trace.redraw((ctx, w, h) => drawTrace(ctx, w, h, u, marks.length ? marks : null));
      screens.wave.redraw((ctx, w, h) => {
        head(ctx, w, 'latency · tokens', '#a5f3fc');
        ['#22d3ee', '#a78bfa'].forEach((cl, j) => {
          ctx.strokeStyle = cl; ctx.lineWidth = 4; ctx.beginPath();
          for (let x = 0; x < w; x += 8) ctx.lineTo(x, 200 + j * 40 + Math.sin(x * 0.03 + time * (2 + j)) * 40 * Math.sin(x * 0.007 + j));
          ctx.stroke();
        });
      });
      screens.log.redraw((ctx, w) => {
        head(ctx, w, 'tail -f traces.log', '#a5f3fc');
        ctx.font = `500 20px ${MONO}`;
        const steps = content.evaluator.steps;
        for (let i = 0; i < 9; i++) {
          const s = steps[(Math.floor(time * 2) + i) % steps.length];
          ctx.fillStyle = i % 3 ? dim : ok;
          ctx.fillText(`run ${s.id.padEnd(14, ' ')} ✓`, 24, 80 + i * 28);
        }
      });
      screens.noise.redraw((ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 200; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        ctx.putImageData(img, 0, 0);
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(w / 2 - 90, h / 2 - 24, 180, 48);
        ctx.fillStyle = '#fff'; ctx.font = `700 24px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('no signal', w / 2, h / 2 + 8); ctx.textAlign = 'left';
      });
      screens.final.redraw((ctx, w, h) => {
        const pulse = 0.6 + 0.4 * Math.sin(time * 4);
        ctx.fillStyle = '#06261d'; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = `rgba(52,211,153,${pulse})`; ctx.lineWidth = 10; ctx.strokeRect(5, 5, w - 10, h - 10);
        ctx.fillStyle = ok; ctx.font = `700 40px ${MONO}`; ctx.textAlign = 'center';
        ctx.fillText('__end__', w / 2, h / 2 - 20);
        ctx.font = `500 28px ${MONO}`; ctx.fillStyle = '#a7f3d0';
        ctx.fillText('final_answer →', w / 2, h / 2 + 30);
        ctx.textAlign = 'left';
      });
    }
  };
}

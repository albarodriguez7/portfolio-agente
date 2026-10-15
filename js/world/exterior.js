/* ==========================================================================
   exterior.js — Escena 0 y final: el escritorio con el ordenador
   El visitante escribe su pregunta en un chat; la cámara entra por la
   pantalla. Al final salimos por la misma pantalla con la respuesta.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, edges, canvasTexture, screenMesh, label, roundRect, wrapText, wrapLines, gridFloor, wireMountains, starfield, mulberry } from './kit.js?v=202610151809';

/* Medidas clave (en metros): la cámara entra justo por SCREEN */
const DESK_Y = 0.81;
export const SCREEN = new THREE.Vector3(0, 1.53, 0.41);

export function createExterior() {
  const group = new THREE.Group();
  group.name = 'exterior';

  /* ── Entorno: rejilla, montañas, estrellas, suelo oscuro bajo la mesa ── */
  group.add(gridFloor(260, 90));
  group.add(wireMountains({ count: 30, radius: 55, spread: 40, z: -10, seed: 3 }));
  group.add(starfield({ count: 1200, radius: 150, size: 0.3, seed: 11 }));
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), new THREE.MeshBasicMaterial({ color: 0x090a14 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);

  /* ── Luces ── */
  group.add(new THREE.HemisphereLight(0x9b8cff, 0x120a24, 0.55));
  const key = new THREE.DirectionalLight(0xffe2b0, 1.1);
  key.position.set(-4, 7, 5);
  group.add(key);
  const screenGlow = new THREE.PointLight(C.cyan, 3, 5, 1.6);
  screenGlow.position.set(0, 1.5, 1.3);
  group.add(screenGlow);

  /* ── Mesa ── */
  const wood = solid(0xbfa77c);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 1.7), wood);
  top.position.set(0, DESK_Y - 0.06, 0.05);
  group.add(top);
  for (const [x, z] of [[-1.65, -0.7], [1.65, -0.7], [-1.65, 0.78], [1.65, 0.78]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, DESK_Y - 0.12, 0.12), solid(0xb9a37a));
    leg.position.set(x, (DESK_Y - 0.12) / 2, z);
    group.add(leg);
  }

  /* ── Monitor (caja gruesa tipo CRT, como el del vídeo) ── */
  const shell = solid(0xcfc3a6);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.5), shell);
  stand.position.set(0, DESK_Y + 0.06, -0.1);
  group.add(stand);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.18, 1.05), shell);
  body.position.set(0, 1.505, -0.12);
  group.add(body);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 0.5), shell);
  back.position.set(0, 1.5, -0.8);
  group.add(back);
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.0, 0.03), solid(0x2a2533));
  bezel.position.set(0, SCREEN.y, 0.39);   // su cara queda detrás de la pantalla
  group.add(bezel);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), neon(C.green, 3));
  led.position.set(0.6, 0.98, 0.41);
  group.add(led);

  // Pantalla con el chat (canvas que se redibuja)
  const chat = canvasTexture(1024, 760);
  const screen = screenMesh(1.24, 0.92, chat, 0.85);
  screen.position.copy(SCREEN);
  group.add(screen);

  // Pósit en la esquina del monitor
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.26), new THREE.MeshBasicMaterial({
    map: canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3b2a05'; ctx.font = `700 26px ${MONO}`;
      ctx.fillText('LLM', 16, 52); ctx.font = `500 20px ${MONO}`; ctx.fillText('+ tools', 16, 86);
    }).texture
  }));
  note.position.set(0.62, 1.98, 0.43);
  note.rotation.z = -0.12;
  group.add(note);

  /* ── Teclado con teclas de colores ── */
  const kb = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.06, 0.42), shell);
  kb.position.set(-0.05, DESK_Y + 0.03, 0.55);
  kb.rotation.x = 0.05;
  group.add(kb);
  const keyGeo = new THREE.BoxGeometry(0.065, 0.03, 0.065);
  const keys = new THREE.InstancedMesh(keyGeo, solid(0xf4efe4), 56);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) {
    m.makeTranslation(-0.05 - 0.55 + c * 0.0835, DESK_Y + 0.075, 0.42 + r * 0.085);
    keys.setMatrixAt(k++, m);
  }
  group.add(keys);
  const enter = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.065), neon(C.amber, 1.4));
  enter.position.set(0.5, DESK_Y + 0.08, 0.505);
  group.add(enter);

  /* ── Objetos del escritorio ── */
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), shell);
  mouse.position.set(0.95, DESK_Y + 0.03, 0.6);
  group.add(mouse);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.01, 0.42), solid(0x2b2d42));
  pad.position.set(0.95, DESK_Y + 0.005, 0.6);
  group.add(pad);

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.24, 8), solid(0xe11d48));
  mug.position.set(-1.25, DESK_Y + 0.12, 0.35);
  group.add(mug);

  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.26, 7), solid(0xb4532a));
  pot.position.set(1.35, DESK_Y + 0.13, -0.35);
  group.add(pot);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), solid(0x3f9142));
  leaves.position.set(1.35, DESK_Y + 0.55, -0.35);
  group.add(leaves);
  const leaves2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), solid(0x4caf50));
  leaves2.position.set(1.22, DESK_Y + 0.82, -0.3);
  group.add(leaves2);

  // Libros: "model cards" apilados
  const bookColors = [0x7c3aed, 0x22d3ee, 0x34d399];
  bookColors.forEach((col, i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.3), solid(col));
    b.position.set(-1.25, DESK_Y + 0.035 + i * 0.07, -0.4);
    b.rotation.y = (i - 1) * 0.15;
    group.add(b);
  });

  /* ── Torre de GPU con LEDs junto a la mesa ── */
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.25, 1.1), solid(0x1d1b2b));
  tower.position.set(2.35, 0.625, -0.1);
  group.add(tower);
  const towerLeds = [];
  for (let i = 0; i < 6; i++) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.6), neon(i % 2 ? C.cyan : C.violet, 2.5));
    l.position.set(2.08, 0.25 + i * 0.16, -0.1);
    group.add(l);
    towerLeds.push(l);
  }
  const gpuLabel = label('GPU', { size: 0.22, border: '#22d3ee', color: '#a5f3fc' });
  gpuLabel.position.set(2.35, 1.42, 0.2);
  group.add(gpuLabel);

  /* ── Racks de servidores al fondo (el "cuerpo" del agente) ── */
  const rand = mulberry(5);
  const rackLeds = [];
  for (let i = 0; i < 4; i++) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 1.0), solid(0x141224));
    const x = -7 + i * 1.35;
    rack.position.set(x, 1.6, -5.5);
    group.add(rack);
    const outline = edges(rack.geometry, C.grid, 0.9);
    outline.position.copy(rack.position);
    group.add(outline);
    for (let j = 0; j < 12; j++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), neon(rand() > 0.5 ? C.green : C.cyan, 2.6));
      l.position.set(x - 0.4 + rand() * 0.8, 0.4 + j * 0.22, -4.99);
      group.add(l);
      rackLeds.push(l);
    }
  }

  /* ── Pantalla del chat: entrada (pregunta) y salida (respuesta) ── */
  let content = null;
  let mode = 'intro';
  let lastDraw = 0;

  function drawChat(ctx, w, h, time) {
    const s = content.screen;
    ctx.fillStyle = '#0a0d1c';
    ctx.fillRect(0, 0, w, h);
    // líneas de barrido (efecto pantalla)
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

    // barra de título
    ctx.fillStyle = '#151a33';
    ctx.fillRect(0, 0, w, 64);
    ['#f43f5e', '#fbbf24', '#34d399'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(34 + i * 30, 32, 9, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#a5b4fc';
    ctx.font = `500 26px ${MONO}`;
    ctx.fillText(s.title, 140, 41);

    ctx.font = `500 34px ${MONO}`;
    const typed = mode === 'outro' ? s.user : s.user.slice(0, Math.floor(Math.max(0, time - 0.6) * 16));

    // burbuja del usuario (derecha): su alto se calcula con el texto completo,
    // con el mismo margen arriba y abajo
    const BX = w - 640, BY = 100, BW = 600, PAD = 30, LH = 42;
    ctx.font = `500 32px ${MONO}`;
    const fullLines = wrapLines(ctx, s.user, BW - PAD * 2);
    const typedLines = wrapLines(ctx, typed, BW - PAD * 2);
    const BH = PAD + 26 + 14 + fullLines.length * LH + PAD - 8;
    if (typed.length) {
      ctx.fillStyle = '#7c3aed';
      roundRect(ctx, BX, BY, BW, BH, 22);
      ctx.fill();
      ctx.fillStyle = '#e9d5ff';
      ctx.font = `600 22px ${MONO}`;
      ctx.fillText('HumanMessage', BX + PAD, BY + PAD + 18);
      ctx.fillStyle = '#f5f3ff';
      ctx.font = `500 32px ${MONO}`;
      typedLines.forEach((ln, i) => ctx.fillText(ln, BX + PAD, BY + PAD + 26 + 14 + 30 + i * LH - 6));
    }
    const below = BY + BH;

    if (mode === 'intro') {
      const doneTyping = typed.length >= s.user.length;
      if (doneTyping) {
        // el agente "piensa"
        ctx.fillStyle = '#22d3ee';
        ctx.font = `500 28px ${MONO}`;
        const dots = '.'.repeat(1 + Math.floor(time * 3) % 3);
        ctx.fillText(`● ${s.thinking}${dots}`, 40, below + 70);
      }
      // caja de escritura con cursor
      ctx.strokeStyle = '#3b3f6b';
      ctx.lineWidth = 3;
      roundRect(ctx, 30, h - 120, w - 60, 86, 16);
      ctx.stroke();
      ctx.fillStyle = '#6b7194';
      ctx.font = `500 28px ${MONO}`;
      ctx.fillText(doneTyping ? s.placeholder : typed, 56, h - 66);
      if (Math.floor(time * 2) % 2 === 0) { ctx.fillStyle = '#22d3ee'; ctx.fillRect(56 + (doneTyping ? 0 : ctx.measureText(typed).width + 4), h - 94, 16, 36); }
    } else {
      // respuesta final del agente (izquierda)
      ctx.fillStyle = '#10302a';
      const AY = below + 40;
      roundRect(ctx, 40, AY, 760, 270, 22);
      ctx.fill();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#34d399';
      ctx.font = `600 22px ${MONO}`;
      ctx.fillText(s.answerTitle, 70, AY + 42);
      ctx.fillStyle = '#ecfdf5';
      ctx.font = `600 38px ${MONO}`;
      const y = wrapText(ctx, s.answer, 70, AY + 100, 700, 48);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = `500 26px ${MONO}`;
      ctx.fillText(content.end.email, 70, y + 18);
      ctx.fillStyle = '#6b7194';
      ctx.font = `500 24px ${MONO}`;
      ctx.fillText('tool_choice="none"', 40, h - 50);
    }
  }

  return {
    group,
    setContent(c) { content = c; lastDraw = 0; },
    setMode(next) { if (next !== mode) { mode = next; lastDraw = 0; } },
    update(time) {
      // LEDs que parpadean
      towerLeds.forEach((l, i) => { l.visible = Math.sin(time * 3 + i * 1.7) > -0.6; });
      rackLeds.forEach((l, i) => { l.visible = Math.sin(time * (1.5 + (i % 5) * 0.7) + i) > -0.3; });
      // la pantalla se redibuja ~12 veces por segundo
      if (content && time - lastDraw > 0.08) {
        lastDraw = time;
        chat.redraw((ctx, w, h) => drawChat(ctx, w, h, time));
      }
    }
  };
}

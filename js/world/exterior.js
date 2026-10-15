/* ==========================================================================
   exterior.js — Escena 0 y final: el escritorio con el ordenador
   El visitante escribe su pregunta en un chat; la cámara entra por la
   pantalla. Al final salimos por la misma pantalla con la respuesta.
   ========================================================================== */
import * as THREE from 'three';
import { C, MONO, solid, neon, edges, canvasTexture, screenMesh, label, roundRect, wrapText, wrapLines, gridFloor, wireMountains, starfield, mulberry } from './kit.js?v=202610152058';

/* Medidas clave (en metros): la cámara entra justo por SCREEN */
const DESK_Y = 0.81;
export const SCREEN = new THREE.Vector3(0, 1.48, -0.218);   // pantalla del monitor (el chat)

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

  /* ── Setup real de Alba: monitor ancho + portátil en soporte + teclado y ratón ── */
  const black = solid(0x15141c), graphite = solid(0x24232e);

  // Monitor fino con su peana
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.0, 0.05), black);
  panel.position.set(0, SCREEN.y, -0.25);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.52, 0.06), graphite);
  neck.position.set(0, DESK_Y + 0.28, -0.31);
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.025, 0.3), graphite);
  foot.position.set(0, DESK_Y + 0.0125, -0.3);
  group.add(panel, neck, foot);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.01), neon(C.green, 3));
  led.position.set(0.78, SCREEN.y - 0.47, -0.222);
  group.add(led);

  // Barra de luz encima del monitor (la "ScreenLinear" de la foto)
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.0, 8), black);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, SCREEN.y + 0.56, -0.19);
  const barLight = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.008, 0.03), neon(0xfff1c7, 2.2));
  barLight.position.set(0, SCREEN.y + 0.53, -0.18);
  const lamp = new THREE.SpotLight(0xfff1c7, 6, 3, 0.9, 0.6, 1.4);
  lamp.position.set(0, SCREEN.y + 0.52, -0.1);
  lamp.target.position.set(0, DESK_Y, 0.45);
  group.add(bar, barLight, lamp, lamp.target);

  // Pantalla con el chat (canvas que se redibuja): por aquí entra la cámara
  const chat = canvasTexture(1280, 720);
  const screen = screenMesh(1.62, 0.91, chat, 0.85);
  screen.position.copy(SCREEN);
  group.add(screen);

  // Pósit en la esquina del monitor
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({
    map: canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#3b2a05'; ctx.font = `700 26px ${MONO}`;
      ctx.fillText('LLM', 16, 52); ctx.font = `500 20px ${MONO}`; ctx.fillText('+ tools', 16, 86);
    }).texture
  }));
  note.position.set(0.74, SCREEN.y + 0.4, -0.215);
  note.rotation.z = -0.1;
  group.add(note);

  // Portátil sobre su soporte, a la izquierda, mostrando el propio portfolio
  const laptop = new THREE.Group();
  laptop.position.set(-1.28, DESK_Y + 0.22, -0.05);
  laptop.rotation.set(0.22, 0.32, 0);
  const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.035, 0.56), black);
  const keyBed = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.012, 0.045), solid(0x2d2c38), 52);
  const km = new THREE.Matrix4();
  let ki = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) {
    km.makeTranslation(-0.33 + c * 0.055, 0.022, -0.17 + r * 0.06);
    keyBed.setMatrixAt(ki++, km);
  }
  const wasd = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.1), solid(0xd8d8e0));  // teclas WASD claras
  wasd.position.set(-0.2, 0.024, -0.05);
  const pad2 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.004, 0.15), solid(0x1d1c26));
  pad2.position.set(0, 0.02, 0.16);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.018, -0.28);
  hinge.rotation.x = -0.22;                             // pantalla algo inclinada hacia atrás
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.52, 0.02), black);
  lid.position.y = 0.26;
  const mini = canvasTexture(640, 400);
  const lapScreen = screenMesh(0.76, 0.46, mini, 0.9);
  lapScreen.position.set(0, 0.27, 0.011);
  hinge.add(lid, lapScreen);
  laptop.add(lapBase, keyBed, wasd, pad2, hinge);
  // soporte inclinado
  const standPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.5), graphite);
  standPlate.position.set(-1.28, DESK_Y + 0.12, -0.07);
  standPlate.rotation.set(0.22, 0.32, 0);
  const standLeg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.03), graphite);
  standLeg.position.set(-1.2, DESK_Y + 0.1, -0.3);
  standLeg.rotation.y = 0.32;
  group.add(standPlate, standLeg, laptop);

  // Miniatura del portfolio en la pantalla del portátil (easter egg recursivo)
  function drawMini(ctx, w, h) {
    ctx.fillStyle = '#05060d'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0b0d1a'; ctx.fillRect(0, 0, w, 34);
    ctx.fillStyle = '#fbbf24'; ctx.font = `700 18px ${MONO}`; ctx.fillText('alba:~/agent$', 14, 23);
    ctx.fillRect(w - 86, 8, 72, 18);
    // rejilla y montañas de alambre
    ctx.strokeStyle = 'rgba(124,58,237,0.75)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w * 0.42 + i * 34, 120); ctx.lineTo(w * 0.42 + i * 34 + 22, 70); ctx.lineTo(w * 0.42 + i * 34 + 44, 120); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(w * 0.4, 260 + i * 24); ctx.lineTo(w, 250 + i * 26); ctx.stroke(); }
    // escritorio con monitor en miniatura
    ctx.fillStyle = '#bfa77c'; ctx.fillRect(w * 0.58, 230, 190, 12);
    ctx.fillStyle = '#15141c'; ctx.fillRect(w * 0.64, 160, 110, 66);
    ctx.fillStyle = '#22d3ee'; ctx.fillRect(w * 0.645, 165, 100, 56);
    // panel de texto
    ctx.strokeStyle = 'rgba(251,191,36,0.6)'; ctx.strokeRect(20, 60, w * 0.36, h - 90);
    ctx.fillStyle = '#fbbf24'; ctx.font = `800 26px ${MONO}`; ctx.fillText('Alba', 34, 120); ctx.fillText('Rodríguez', 34, 150);
    ctx.fillStyle = '#aeb3cc';
    for (let i = 0; i < 5; i++) ctx.fillRect(34, 175 + i * 14, 170 - (i % 2) * 40, 6);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(34, 270, 80, 22);
  }
  mini.redraw(drawMini);

  /* ── Teclado plateado y ratón negro ── */
  const kb = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.025, 0.34), solid(0xb4b8c1, { metalness: 0.4, roughness: 0.45 }));
  kb.position.set(0.12, DESK_Y + 0.0125, 0.45);
  group.add(kb);
  const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(0.045, 0.018, 0.045), solid(0x6b6f7c), 90);
  const m = new THREE.Matrix4();
  let k = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 18; c++) {
    m.makeTranslation(0.12 - 0.5 + c * 0.059, DESK_Y + 0.032, 0.33 + r * 0.058);
    keys.setMatrixAt(k++, m);
  }
  group.add(keys);
  const enter = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.1), neon(C.amber, 1.3));
  enter.position.set(0.12 + 0.18, DESK_Y + 0.034, 0.418);
  group.add(enter);

  /* ── Objetos del escritorio ── */
  const mouse = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), solid(0x1f2430));
  mouse.scale.set(0.065, 0.04, 0.11);
  mouse.position.set(1.0, DESK_Y + 0.03, 0.55);
  group.add(mouse);

  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.24, 8), solid(0xe11d48));
  mug.position.set(0.95, DESK_Y + 0.12, -0.05);
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

  /* ── Easter egg: la perra de Alba tumbada en su cama, junto a la mesa ── */
  const dog = createDog();
  dog.group.position.set(-2.75, 0, 0.6);
  dog.group.rotation.y = 0.75;                 // mira hacia la cámara inicial
  group.add(dog.group);

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
      dog.update(time);
      towerLeds.forEach((l, i) => { l.visible = Math.sin(time * 0.5 + i * 1.7) > -0.8; });   // parpadeo lento
      rackLeds.forEach((l, i) => { l.visible = Math.sin(time * (0.3 + (i % 5) * 0.12) + i) > -0.6; });
      // la pantalla se redibuja ~12 veces por segundo
      if (content && time - lastDraw > 0.08) {
        lastDraw = time;
        chat.redraw((ctx, w, h) => drawChat(ctx, w, h, time));
      }
    }
  };
}

/* ==========================================================================
   Perra low-poly (inspirada en una foto): pelo canela, pecho, hocico y mancha
   de la frente blancos, orejas caídas, collar gris con chapa y patas blancas.
   Tumbada en su cama gris con una mantita. Respira y mueve el rabo.
   ========================================================================== */
function createDog() {
  const g = new THREE.Group();
  const tan = solid(0xc98a4e), tanDark = solid(0xa8683a), white = solid(0xf3ece4);
  const ell = (rx, ry, rz, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat);
    m.scale.set(rx, ry, rz);
    m.position.set(x, y, z);
    return m;
  };

  // Cama ovalada con borde acolchado y mantita
  const bed = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.82, 0.12, 12), solid(0x55545f));
  base.position.y = 0.06;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.14, 6, 14), solid(0x6b6a76));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.16;
  bed.add(base, rim);
  bed.scale.z = 0.85;
  const blanket = ell(0.5, 0.16, 0.34, solid(0x8e88a6), -0.2, 0.22, -0.42);
  blanket.rotation.y = 0.5;
  g.add(bed, blanket);

  const dog = new THREE.Group();
  dog.position.y = 0.12;
  g.add(dog);

  // Cuerpo tumbado (la cabeza mira hacia +z)
  const body = new THREE.Group();
  body.add(
    ell(0.27, 0.22, 0.42, tan, 0, 0.22, -0.12),        // tronco
    ell(0.26, 0.22, 0.24, tan, 0.06, 0.2, -0.46),      // cuartos traseros
    ell(0.12, 0.13, 0.08, white, 0, 0.25, 0.24)         // pecho blanco
  );
  dog.add(body);

  // Patas delanteras estiradas con las puntas blancas
  [-0.11, 0.11].forEach((x, i) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.38, 6), tan);
    leg.rotation.x = Math.PI / 2;
    leg.position.set(x, 0.07, 0.36 + i * 0.04);
    const paw = ell(0.07, 0.05, 0.08, white, x, 0.06, 0.58 + i * 0.04);
    dog.add(leg, paw);
  });
  // Pata trasera recogida
  dog.add(ell(0.08, 0.07, 0.16, tan, 0.24, 0.08, -0.4));

  // Collar gris con chapa
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 5, 10), solid(0x4b5563));
  collar.position.set(0, 0.44, 0.2);
  collar.rotation.x = Math.PI / 2 - 0.35;
  const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 8), solid(0xcbd5e1, { metalness: 0.6, roughness: 0.3 }));
  tag.rotation.x = Math.PI / 2;
  tag.position.set(0, 0.33, 0.3);
  dog.add(collar, tag);

  // Cabeza
  const head = new THREE.Group();
  head.position.set(0, 0.6, 0.27);
  head.add(
    ell(0.17, 0.16, 0.17, tan, 0, 0, 0),
    ell(0.09, 0.08, 0.12, white, 0, -0.05, 0.15),      // hocico blanco
    ell(0.035, 0.03, 0.03, solid(0x5b3a2e), 0, -0.02, 0.27) // nariz
  );
  const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.15, 0.03), white);   // mancha de la frente
  blaze.position.set(0, 0.07, 0.15);
  blaze.rotation.x = -0.5;
  head.add(blaze);
  [-0.07, 0.07].forEach(x => head.add(ell(0.022, 0.022, 0.015, solid(0x2b1b14), x, 0.04, 0.15)));  // ojos
  const ears = [-1, 1].map(side => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.18, 0.03), tanDark);
    ear.position.set(side * 0.16, 0.02, 0);
    ear.rotation.set(0, side * 0.3, side * 0.75);       // orejas caídas hacia los lados
    head.add(ear);
    return ear;
  });
  dog.add(head);

  // Rabo
  const tail = new THREE.Group();
  tail.position.set(0.04, 0.22, -0.66);
  const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.038, 0.24, 5), tan);
  tailMesh.rotation.x = Math.PI / 2 + 0.15;           // apoyado en la cama, pegado al cuerpo
  tailMesh.position.set(0, -0.02, -0.11);
  tail.add(tailMesh);
  dog.add(tail);

  return {
    group: g,
    update(time) {
      body.scale.y = 1 + Math.sin(time * 2.2) * 0.025;                 // respira
      const wag = Math.sin(time * 0.45) > 0.55 ? 0.6 : 0.08;             // a ratos mueve el rabo
      tail.rotation.y = 0.9 + Math.sin(time * 9) * wag * 0.6;          // curvado hacia un lado
      head.rotation.z = Math.sin(time * 0.3) > 0.85 ? 0.18 : 0;          // y ladea la cabeza de vez en cuando
      ears.forEach((e, i) => { e.rotation.x = Math.sin(time * 0.6 + i) > 0.92 ? -0.25 : 0; });
    }
  };
}

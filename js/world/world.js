/* ==========================================================================
   world.js — Monta el mundo 3D y lo pinta
   Renderer WebGL + post-procesado (bloom para el neón), niebla, todas las
   escenas y el bucle que mueve la cámara según el scroll.
   ========================================================================== */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { C, gridFloor, starfield, lerp } from './kit.js';
import { createExterior } from './exterior.js';
import { createTokenizer } from './tokenizer.js';
import { createBrain } from './brain.js';
import { createMemory } from './memory.js';
import { createWorkshop } from './workshop.js';
import { createVectors } from './vectors.js';
import { createGates } from './gates.js';
import { createControl } from './control.js';
import { createJourney } from './journey.js';

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

export function createWorld({ canvas, sections, reduced, lowPower, scrollMax }) {
  /* ── Renderer, escena, cámara ── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.bg);
  scene.fog = new THREE.FogExp2(C.bg, 0.028);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.03, 260);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), lowPower ? 0.75 : 0.9, 0.5, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ── Escenas ── */
  const exterior = createExterior();
  const interior = new THREE.Group();
  interior.name = 'interior';
  const modules = {
    tokenizer: createTokenizer(),
    brain: createBrain(),
    memory: createMemory(),
    workshop: createWorkshop(),
    vectors: createVectors(),
    gates: createGates(),
    control: createControl()
  };
  Object.values(modules).forEach(m => interior.add(m.group));

  // Ambiente común del interior: rejillas de suelo y techo y polvo de datos
  const floor = gridFloor(700, 160, C.gridDim, 1.2);
  floor.position.set(0, -6, -300);
  const ceiling = gridFloor(700, 80, C.gridDim, 0.8);
  ceiling.position.set(0, 14, -300);
  interior.add(floor, ceiling, starfield({ count: 2500, radius: 220, size: 0.25, center: new THREE.Vector3(0, -20, -300), seed: 23 }));

  scene.add(exterior.group, interior);

  const journey = createJourney(sections, scrollMax);

  /* ── Tamaño y encuadre ── */
  let width = 1, height = 1;
  let paneFrame = null;      // móvil: zona visible del 3D (entre la barra superior y el panel de texto)
  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.resolution.set(width / 2, height / 2);
    paneFrame = null;
    if (document.documentElement.classList.contains('pane')) {
      const top = document.querySelector('.topbar')?.offsetHeight || 0;
      const split = document.querySelector('main').getBoundingClientRect().top;
      paneFrame = { top, h: Math.max(120, split - top) };
    }
    camera.aspect = paneFrame ? width / paneFrame.h : width / height;
    camera.fov = paneFrame ? 56 : width < 720 ? 68 : 55;
    camera.updateProjectionMatrix();
    journey.layout();
  }

  // Encuadre desplazado: deja hueco al panel (izquierda en escritorio, abajo en móvil)
  function applyShift(shift) {
    // móvil con pantalla partida: el encuadre completo de la cámara cabe en la zona visible
    // de arriba (y se prolonga por debajo, detrás del texto)
    if (paneFrame) {
      camera.setViewOffset(width, paneFrame.h, 0, -paneFrame.top, width, height);
      return;
    }
    const desktop = width >= 900;
    const ox = desktop ? -shift * width * 0.17 : 0;
    const oy = desktop ? 0 : height * 0.16 * shift;
    camera.setViewOffset(width, height, ox, oy, width, height);
  }

  /* ── Estado del recorrido ── */
  let tTarget = 0, tNow = 0, clockTime = 0, last = performance.now();
  let content = null;
  const listeners = [];

  function setContent(c) {
    content = c;
    exterior.setContent(c);
    Object.values(modules).forEach(m => m.setContent && m.setContent(c));
  }

  function setScroll(t) { tTarget = t; }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) clockTime += dt;

    // la cámara persigue al scroll con suavidad (independiente de los fps)
    tNow = reduced ? tTarget : lerp(tNow, tTarget, 1 - Math.exp(-dt * 5.5));
    if (Math.abs(tNow - tTarget) < 1e-5) tNow = tTarget;

    const cam = journey.sample(tNow);
    camera.position.copy(cam.pos);
    // móvil: la cámara se acerca un poco a lo que mira (la zona 3D es más pequeña)
    if (paneFrame && cam.track === 'in') camera.position.lerp(cam.look, 0.22);
    if (!reduced) camera.position.y += Math.sin(clockTime * 0.8) * 0.02;   // leve respiración
    camera.lookAt(cam.look);
    applyShift(cam.shift);

    const inside = cam.track === 'in';
    exterior.group.visible = !inside;
    interior.visible = inside;
    const local = journey.local(tNow);
    exterior.setMode(local['exterior-out'] > 0 ? 'outro' : 'intro');
    scene.fog.density = inside ? 0.03 : 0.016;

    // solo se actualizan/pintan las escenas cercanas a la cámara
    const z = camera.position.z;
    const ctx = { camera, dt: reduced ? 0 : dt, u: 0 };
    if (!inside) exterior.update(clockTime);
    Object.entries(modules).forEach(([name, m]) => {
      const [zNear, zFar] = m.range;
      const near = inside && z <= zNear + 25 && z >= zFar - 25;
      m.group.visible = near;
      if (!near) return;
      ctx.u = local[sceneFor[name]] ?? 0;
      m.update(clockTime, ctx);
    });

    composer.render();
    listeners.forEach(fn => fn({ t: tNow, local, flash: journey.flash(tNow), active: journey.activeIndex(tNow), z }));
  }

  // escena del HTML que controla cada módulo (para su progreso local)
  const sceneFor = { tokenizer: 'tokenizer', brain: 'brain', memory: 'memory', workshop: 'workshop', vectors: 'vectors', gates: 'gates', control: 'control' };

  let running = false;
  function loop(now) {
    if (!running) return;
    frame(now);
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  resize();

  return {
    renderer, camera, journey, modules,
    resize, setContent, setScroll, start, stop,
    renderOnce() { frame(performance.now()); },
    jump(t) { tTarget = tNow = t; },
    onFrame: fn => listeners.push(fn),
    memoryCount: u => modules.memory.count(u),
    gatesPassed: () => modules.gates.passed(camera.position.z)
  };
}

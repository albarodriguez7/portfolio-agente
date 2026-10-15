/* ==========================================================================
   kit.js — Piezas comunes del mundo 3D
   Paleta, materiales low-poly, neón con brillo (bloom), texturas de texto
   dibujadas en <canvas>, suelo de rejilla y montañas de alambre.
   ========================================================================== */
import * as THREE from 'three';

/* Paleta del mundo (neón sobre negro, como una sala de máquinas) */
export const C = {
  bg:      0x05060d,
  grid:    0x7c3aed,   // violeta
  gridDim: 0x3b1d78,
  cyan:    0x22d3ee,
  violet:  0xa78bfa,
  pink:    0xf472b6,
  amber:   0xfbbf24,
  green:   0x34d399,
  red:     0xf43f5e,
  white:   0xf5f3ff
};

export const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

/* Sólido low-poly con sombreado plano */
export function solid(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.75, metalness: 0.05, ...opts });
}

/* Neón: color "más blanco que el blanco" para que el bloom lo haga brillar */
export function neon(color, intensity = 2.2, opts = {}) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...opts });
}
export function neonLine(color, intensity = 1.8, opts = {}) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.LineBasicMaterial({ color: c, toneMapped: false, ...opts });
}

/* Aristas de una geometría como líneas de neón */
export function edges(geometry, color, intensity = 1.8, opts) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geometry), neonLine(color, intensity, opts));
}

/* Textura dibujada a mano en un canvas (pantallas, etiquetas, carteles) */
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const api = {
    canvas, ctx, texture, width, height,
    redraw(fn = draw) { ctx.clearRect(0, 0, width, height); fn(ctx, width, height); texture.needsUpdate = true; }
  };
  if (draw) api.redraw(draw);
  return api;
}

/* Pantalla emisiva con una textura de canvas */
export function screenMesh(w, h, tex, brightness = 1) {
  const mat = new THREE.MeshBasicMaterial({ map: tex.texture, toneMapped: false });
  mat.color.setScalar(brightness);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

/* Etiqueta de texto que siempre mira a la cámara */
export function label(text, { color = '#e9e4ff', bg = 'rgba(8,10,22,0.78)', border = '#7c3aed', size = 0.5, weight = 500 } = {}) {
  const pad = 22, fontPx = 44;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `${weight} ${fontPx}px ${MONO}`;
  const w = Math.ceil(measure.measureText(text).width) + pad * 2;
  const h = fontPx + pad * 1.4;
  const tex = canvasTexture(w, h, ctx => {
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    roundRect(ctx, 1.5, 1.5, w - 3, h - 3, 10);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${weight} ${fontPx}px ${MONO}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, pad, h / 2 + 2);
  });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.texture, toneMapped: false, transparent: true, depthWrite: false }));
  sprite.scale.set(size * (w / h), size, 1);
  sprite.userData.tex = tex;
  return sprite;
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* Texto con salto de línea automático en un canvas; devuelve la y final */
export function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = String(text).split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
}

/* Suelo de rejilla de neón (como el horizonte del vídeo) */
export function gridFloor(size = 240, divisions = 80, color = C.grid, intensity = 1.1) {
  const grid = new THREE.GridHelper(size, divisions, color, color);
  grid.material = neonLine(color, intensity, { transparent: true, opacity: 0.55 });
  return grid;
}

/* Montañas de alambre: pirámides low-poly en el horizonte */
export function wireMountains({ count = 26, radius = 70, spread = 40, z = 0, color = C.grid, seed = 1 } = {}) {
  const group = new THREE.Group();
  const rand = mulberry(seed);
  const mat = neonLine(color, 1.4, { transparent: true, opacity: 0.8 });
  for (let i = 0; i < count; i++) {
    const h = 6 + rand() * 18;
    const geo = new THREE.ConeGeometry(4 + rand() * 7, h, 4, 1);
    const m = new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
    const angle = Math.PI * (0.1 + 0.8 * (i / count)) + (rand() - 0.5) * 0.15;
    const r = radius + rand() * spread;
    m.position.set(Math.cos(angle) * r, h / 2, z - Math.sin(angle) * r);
    m.rotation.y = rand() * Math.PI;
    group.add(m);
  }
  return group;
}

/* Cielo de estrellas / polvo de datos */
export function starfield({ count = 1500, radius = 160, color = 0xffffff, size = 0.35, center = new THREE.Vector3(), seed = 7 } = {}) {
  const rand = mulberry(seed);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2, r = radius * (0.55 + 0.45 * rand());
    const s = Math.sqrt(1 - u * u);
    pos[i * 3] = center.x + r * s * Math.cos(th);
    pos[i * 3 + 1] = center.y + Math.abs(r * u) * 0.8 + 4;
    pos[i * 3 + 2] = center.z + r * s * Math.sin(th);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false });
  return new THREE.Points(geo, mat);
}

/* Generador pseudoaleatorio con semilla: el mundo es siempre igual */
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

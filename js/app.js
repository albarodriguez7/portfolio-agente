/* ==========================================================================
   app.js — Punto de entrada
   1. Pinta el contenido de los paneles desde el JSON del idioma actual
   2. Arranca el mundo 3D y lo conecta con el scroll
   3. HUD (grafo, contador), destello al cruzar pantallas
   4. Interacciones: herramientas, stack ↔ estrellas 3D, copiar email,
      navegación por anclas
   ========================================================================== */
import { createWorld, webglAvailable } from './world/world.js?v=202610151839';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Móvil en vertical: pantalla partida (3D arriba, texto en un panel inferior con su propio scroll)
const paneQuery = window.matchMedia('(max-width: 899px)');
const lowPower = window.innerWidth < 720 || (navigator.hardwareConcurrency || 8) <= 4;
const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
document.documentElement.classList.toggle('reduced', reduced);

let content = null;
let world = null;

/* ─────────────────────── 1. Contenido de los paneles ─────────────────────── */

function renderAgent() {
  $('#agent-body').innerHTML = content.agent.paragraphs.map(p => `<p>${p}</p>`).join('');
}

function renderState() {
  const s = content.state;
  $('#state-msgs').innerHTML = s.messages.map((m, i) => `
    <li class="msg${m.highlight ? ' is-highlight' : ''}">
      <span class="msg-idx" aria-hidden="true">[${i}]</span>
      <div>
        <p class="msg-role">${m.role}</p>
        <h3>${m.title}</h3>
        <p>${m.desc}</p>
      </div>
    </li>`).join('');
  $('#state-langs').innerHTML = s.languages.map(l => `<li><strong>${l.name}</strong> <span class="chip chip-ok">${l.level}</span><p>${l.desc}</p></li>`).join('');
  $('#state-now').innerHTML = s.now.map(n => `<li>${n}</li>`).join('');
}

function renderTools() {
  const T = content.tools, ui = content.ui;
  const chips = tags => `<ul class="chips" aria-label="${esc(ui.techs)}">${tags.map(t => `<li class="chip">${t}</li>`).join('')}</ul>`;
  const sig = p => `<p class="sig"><span class="tok-dim">tool_call:</span> <span class="tok-fn">${p.fn}</span>(<span class="tok-arg">${esc(p.params)}</span>)</p>`;

  $('#tools-main').innerHTML = T.main.map(p => `
    <article class="tool" id="tool-${p.id}" data-tool>
      ${sig(p)}
      <p class="tool-type">${p.type}</p>
      <h3>${p.title}</h3>
      <p class="tool-desc">${p.desc}</p>
      <button class="tool-toggle" type="button" aria-expanded="false" aria-controls="call-${p.id}"><span class="tt-icon" aria-hidden="true">▸</span> <span class="tt-text">${ui.showCall}</span></button>
      <div class="tool-call" id="call-${p.id}">
        <div class="tool-call-inner">
          <div class="call-block"><p class="call-label">${T.argsLabel}</p><pre>${esc(p.args)}</pre></div>
          <div class="call-block"><p class="call-label">${T.stepsLabel}</p><ol class="call-steps">${p.steps.map(s => `<li><code>${s.name}</code> <span>${s.note}</span></li>`).join('')}</ol></div>
        </div>
      </div>
      <p class="call-label call-ok">${T.resultLabel}</p>
      <ul class="result">${p.result.map(r => `<li><b>${r.value}</b><span>${r.label}</span></li>`).join('')}</ul>
      ${chips(p.tags)}
      <p class="links"><a class="link-primary" href="https://albarodriguez7.github.io${p.case.replace(/^https:\/\/albarodriguez7\.github\.io/, '')}">${ui.caseStudy}</a> <a href="${p.code}" target="_blank" rel="noopener">${ui.code}</a></p>
    </article>`).join('');

  $('#tools-secondary').innerHTML = T.secondary.map(p => `
    <article class="tool tool--compact" id="tool-${p.id}">
      ${sig(p)}
      <p class="tool-type">${p.type}</p>
      <h3>${p.title}</h3>
      <p class="tool-desc">${p.desc}</p>
      <p class="result-line"><span class="tok-ok">→</span> ${p.result}</p>
      ${chips(p.tags)}
      <p class="links"><a href="${p.code}" target="_blank" rel="noopener">${ui.code}</a>${p.demo ? ` <a href="${p.demo}" target="_blank" rel="noopener">${ui.demo}</a>` : ''}</p>
    </article>`).join('');

  bindToolCards();
}

function renderStack() {
  // lista limpia por categoría (las mismas fichas que el índice 3D)
  $('#stack').innerHTML = content.retriever.clusters.map((cl, i) => `
    <div class="cluster cluster--${cl.id}">
      <p class="cluster-name"><span class="muted">[${i}]</span> ${cl.name}</p>
      <p class="cluster-items">${cl.items.join('<span aria-hidden="true"> · </span>')}</p>
    </div>`).join('');
}

function renderRules() {
  const G = content.guardrails;
  $('#gates-total').textContent = G.rules.length;
  $('#rules').innerHTML = G.rules.map((r, i) => `
    <li class="rule" data-index="${i}">
      <p class="rule-id"><code>guardrail_${String(i + 1).padStart(2, '0')} · ${r.id}</code><span class="rule-status"><span aria-hidden="true">✓</span> ${G.passed}</span></p>
      <h3>${r.title}</h3>
      <p>${r.desc}</p>
      <p class="rule-agent">${G.appliesTo} <span class="chip">${r.agent}</span></p>
    </li>`).join('');
}

function renderEvaluator() {
  const E = content.evaluator, C = E.chart;
  $('#eval-steps').innerHTML = E.steps.map((s, i) => `
    <li><span class="step-n">${i + 1}</span><div><p class="step-id"><code>${s.id}</code></p><h3>${s.title}</h3><p>${s.desc}</p></div></li>`).join('');
  const last = C.bars.length - 1;
  $('#eval-chart').innerHTML = `
    <figcaption><h3>${C.title}</h3><p class="muted">${C.subtitle}</p></figcaption>
    <div class="bars" aria-hidden="true">${C.bars.map((b, i) => `
      <div class="bar-row${i === last ? ' is-final' : ''}"><p>${b.label}</p><div class="bar-track"><span class="bar" style="--v:${b.value / 100}"></span><b style="--v:${b.value / 100}">${b.display}</b></div></div>`).join('')}
    </div>
    <div class="sr-only"><table><caption>${C.tableCaption}</caption><tbody>${C.bars.map(b => `<tr><th scope="row">${b.label}</th><td>${b.display}</td></tr>`).join('')}</tbody></table></div>
    <p class="delta"><span class="chip chip-ok">↑ ${C.delta}</span> ${C.runs}</p>
    <p class="call-label">${C.fixesTitle}</p>
    <ul class="fixes">${C.fixes.map(f => `<li><span class="tok-ok" aria-hidden="true">✓</span> ${f}</li>`).join('')}</ul>
    <a class="link-primary" href="https://albarodriguez7.github.io/casos.html#leads">${C.source}</a>`;
}

function renderAll() {
  renderAgent();
  renderState();
  renderTools();
  renderStack();
  renderRules();
  renderEvaluator();
  if (world) world.setContent(content);
}

/* ─────────────────────────── 4. Interacciones ─────────────────────────── */

function bindToolCards() {
  $$('[data-tool]').forEach(card => {
    const btn = $('.tool-toggle', card);
    let pinned = false;
    const setOpen = open => {
      card.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      $('.tt-text', btn).textContent = open ? content.ui.hideCall : content.ui.showCall;
    };
    if (hoverCapable) {
      card.addEventListener('mouseenter', () => setOpen(true));
      card.addEventListener('mouseleave', () => { if (!pinned && !card.contains(document.activeElement)) setOpen(false); });
    }
    card.addEventListener('focusin', e => { if (e.target.matches(':focus-visible')) setOpen(true); });
    card.addEventListener('focusout', e => { if (!card.contains(e.relatedTarget) && !pinned && !(hoverCapable && card.matches(':hover'))) setOpen(false); });
    btn.addEventListener('click', () => { const open = !card.classList.contains('is-open'); pinned = open; setOpen(open); });
  });
}

function bindCopy() {
  const btn = $('#copy-email'), status = $('#copy-status');
  let timer;
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(content.end.email); ok = true; } catch (e) {
      const ta = Object.assign(document.createElement('textarea'), { value: content.end.email });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
    }
    status.textContent = ok ? content.ui.copied : content.ui.copyError;
    status.classList.toggle('is-ok', ok);
    clearTimeout(timer);
    timer = setTimeout(() => { status.textContent = ''; }, 4000);
  });
}

/* Anclas internas: desplazamiento (la cámara vuela sola) y foco en el título */
function bindAnchors() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    const top = target.id === 'main' ? 0 : contentTop(target) - (target.matches('.scene') ? 0 : (usePane() ? 12 : 90));
    scrollToY(top, true);
    const focusEl = target.matches('section') ? $('h1, h2', target) : target;
    if (focusEl) focusEl.focus({ preventScroll: true });
    history.pushState(null, '', a.getAttribute('href'));
  });
}

/* ───────────────────── 2 y 3. Mundo 3D, scroll y HUD ───────────────────── */

const sections = $$('.scene');
const hudLinks = $$('#graph-hud a');
const nodeNames = { start: '__start__', agent: 'agent', state: 'state', tools: 'tools', retriever: 'retriever', guardrails: 'guardrails', evaluator: 'evaluator', end: '__end__' };
let lastActive = -1;
const phraseEls = $$('.scene--phrase').map(el => [el.dataset.scene, $('.phrase', el)]);
const ramp = (a, b, x) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/* ── Scroll: en escritorio se desplaza la ventana; en móvil, el panel inferior (#main) ── */
const usePane = () => !!world && paneQuery.matches;
function scrollState() {
  if (usePane()) {
    const m = $('#main');
    return { y: m.scrollTop, h: m.clientHeight, max: Math.max(1, m.scrollHeight - m.clientHeight) };
  }
  return { y: window.scrollY, h: window.innerHeight, max: Math.max(1, document.documentElement.scrollHeight - window.innerHeight) };
}
function scrollToY(top, smooth) {
  const opts = { top, behavior: smooth && !reduced ? 'smooth' : 'auto' };
  if (usePane()) $('#main').scrollTo(opts); else window.scrollTo(opts);
}
// posición de un elemento dentro del contenido que se desplaza
function contentTop(el) {
  if (usePane()) { const m = $('#main'); return el.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop; }
  return el.getBoundingClientRect().top + window.scrollY;
}

function scrollProgress() {
  const { y, max } = scrollState();
  return Math.min(1, Math.max(0, y / max));
}

function onScroll() {
  if (!world) { updateHud({ t: scrollProgress(), active: activeFromScroll(), local: {}, flash: 0 }); return; }
  const t = scrollProgress();
  // movimiento reducido: la cámara salta a la "foto" fija de la sección que se está leyendo
  world.setScroll(reduced ? world.journey.restT(world.journey.activeIndex(midProgress())) : t);
  if (reduced) world.renderOnce();
}

// progreso medido en el centro de la pantalla (qué sección se está leyendo)
function midProgress() {
  const { y, h, max } = scrollState();
  return Math.min(1, Math.max(0, (y + h * 0.5) / max));
}

function activeFromScroll() {
  let idx = 0;
  sections.forEach((s, i) => { if (s.getBoundingClientRect().top <= window.innerHeight * 0.5) idx = i; });
  return idx;
}

function updateHud({ t, active, local, flash, marks = {} }) {
  $('#flash').style.opacity = flash.toFixed(3);
  $('#hud-step').textContent = String(Math.round(t * 100)).padStart(3, '0');

  if (active !== lastActive) {
    lastActive = active;
    const node = sections[active].dataset.node;
    hudLinks.forEach(a => {
      const on = a.dataset.node === node;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    const order = hudLinks.map(a => a.dataset.node);
    const ni = order.indexOf(node);
    hudLinks.forEach((a, i) => a.classList.toggle('is-done', i < ni));
    $('#hud-node').textContent = nodeNames[node];
  }

  // las frases grandes aparecen solo dentro de su escena (no al cruzar la pantalla)
  if (world && !reduced) {
    phraseEls.forEach(([scene, el]) => {
      const u = local[scene] ?? 0;
      el.style.opacity = (ramp(0.06, 0.2, u) * (1 - ramp(0.8, 0.95, u))).toFixed(3);
    });
  }

  // mensajes acumulados en el estado (narrativa del recorrido)
  if (world && local) {
    let msgs = 1;
    if ((local.brain || 0) > 0.5) msgs += 1;
    msgs += (marks.memory || []).filter(m => m > 0.5).length;
    msgs += (marks.workshop || []).filter(m => m > 0.5).length;
    if ((local['exterior-out'] || 0) > 0) msgs += 1;
    $('#hud-msgs').textContent = msgs;

    const passed = world.gatesPassed();
    $('#gates-passed').textContent = passed;
    const after = (local.control || 0) > 0 || (local['exterior-out'] || 0) > 0;
    $$('.rule').forEach((r, i) => r.classList.toggle('is-passed', i < passed || after));
  }
}

function hideLoader() {
  const l = $('#loader');
  l.classList.add('is-hidden');
  setTimeout(() => l.remove(), 800);
}

/* ─────────────────────────────── Arranque ─────────────────────────────── */

async function boot() {
  try {
    content = await I18N.ready;
  } catch (e) {
    $('#loader').innerHTML = '<span>No se ha podido cargar el contenido (data/*.json). Usa un servidor local: <code>python -m http.server</code></span>';
    return;
  }

  if (webglAvailable()) {
    try {
      await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]);
      world = createWorld({
        canvas: $('#world'), sections, reduced, lowPower,
        scrollMax: () => scrollState().max,
        anchorY: el => contentTop(el),
        // línea de lectura: a media pantalla en escritorio; cerca del borde superior del panel en móvil
        readLine: () => scrollState().h * (usePane() ? 0.3 : 0.5)
      });
      world.onFrame(updateHud);
      window.__world = world;   // útil para depurar desde la consola
    } catch (e) {
      console.error(e);
      world = null;
    }
  }
  if (!world) document.documentElement.classList.add('no-webgl');
  document.documentElement.classList.toggle('pane', usePane());
  if (world) world.resize();

  renderAll();
  bindCopy();
  bindAnchors();

  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) scrollToY(contentTop(target), false);
  }

  // si cambia la altura del contenido (textos, idioma, fuentes) se recalculan los tramos de cada escena
  if (world && 'ResizeObserver' in window) {
    const ro = new ResizeObserver(() => { world.journey.layout(); onScroll(); });
    sections.forEach(s => ro.observe(s));
  }
  if (world) world.journey.layout();

  window.addEventListener('scroll', onScroll, { passive: true });
  $('#main').addEventListener('scroll', onScroll, { passive: true });
  // al girar el móvil o cambiar el ancho, se cambia de modo (ventana ↔ panel)
  paneQuery.addEventListener('change', () => {
    document.documentElement.classList.toggle('pane', usePane());
    if (world) { world.resize(); world.journey.layout(); onScroll(); }
  });
  window.addEventListener('resize', () => { if (world) { world.resize(); onScroll(); if (reduced) world.renderOnce(); } });
  document.addEventListener('visibilitychange', () => { if (!world) return; if (document.hidden) world.stop(); else world.start(); });

  if (world) {
    const t0 = reduced ? world.journey.restT(world.journey.activeIndex(midProgress())) : scrollProgress();
    world.jump(t0);
    world.setScroll(t0);
    world.start();
  } else {
    onScroll();
  }
  hideLoader();

  I18N.onChange(dict => { content = dict; renderAll(); lastActive = -1; });
}

boot();

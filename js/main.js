/* ==========================================================================
   main.js — El viaje del mensaje por el grafo del agente
   --------------------------------------------------------------------------
   1. Utilidades
   2. Pintado de cada nodo a partir del JSON (hero, agent, state, tools,
      retriever, guardrails, evaluator) y de las aristas SVG
   3. Aparición al hacer scroll (IntersectionObserver)
   4. Motor de scroll: nodo activo, mini-mapa y punto de luz en las aristas
   5. Interacciones: tarjetas de herramientas, retriever, copiar email,
      navegación con scroll suave y foco
   6. Arranque y cambio de idioma
   Todo respeta prefers-reduced-motion: sin movimiento, todo visible.
   ========================================================================== */
(() => {
  'use strict';

  /* ─────────────────────────── 1. Utilidades ─────────────────────────── */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

  // Escapa texto para meterlo en HTML (solo donde el JSON trae código/comillas)
  const esc = str => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Quita etiquetas HTML y decodifica entidades (&amp; → &)
  const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent; };

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  const hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.toggle('reduced', reduced);

  let content = null;              // diccionario del idioma actual
  const revealed = new Set();      // elementos ya mostrados (sobreviven al cambio de idioma)
  let heroPlayed = false;          // la animación de entrada solo se reproduce una vez
  let selectedTech = null;         // última tecnología consultada en el retriever
  let jsonFilled = 0;              // mensajes ya volcados al state.json

  /* ─────────────── 2. Pintado de los nodos desde el JSON ─────────────── */

  /* · __start__: traza de entrada y contador state["messages"] 0 → 1 */
  function renderHero() {
    const list = $('#hero-trace');
    const panel = $('.trace-panel');
    const animate = !reduced && !heroPlayed;
    list.innerHTML = content.hero.trace
      .map((line, i) => `<li class="trace-line${i === 0 ? ' is-cmd' : ''}" style="--i:${i}">${esc(line)}</li>`)
      .join('');
    list.classList.toggle('is-animated', animate);

    if (animate) {
      heroPlayed = true;
      panel.classList.remove('is-counted');
      // El contador sube a 1 justo cuando termina de escribirse la traza
      setTimeout(() => panel.classList.add('is-counted'), 300 + content.hero.trace.length * 450);
    } else {
      panel.classList.add('is-counted');
    }
  }

  /* · agent: la respuesta del LLM (Sobre mí) */
  function renderAgent() {
    const body = $('#agent-body');
    body.innerHTML = content.agent.paragraphs.map((p, i) => `<p style="--i:${i}">${p}</p>`).join('');
    observeReveal(body);
  }

  /* · state: cada etapa de formación es un mensaje que se añade al estado */
  function renderState() {
    const s = content.state;
    $('#state-msgs').innerHTML = s.messages.map((m, i) => `
      <li class="state-msg reveal${m.highlight ? ' is-highlight' : ''}" data-reveal-key="msg-${m.key}">
        <span class="msg-index" aria-hidden="true">[${i}]</span>
        <div class="msg-body">
          <p class="msg-role"><span class="role-chip ${m.highlight ? 'role-ai' : 'role-human'}">${m.role}</span></p>
          <h3>${m.title}</h3>
          <p>${m.desc}</p>
        </div>
      </li>`).join('');

    $('#state-langs').innerHTML = s.languages.map(l => `
      <li>
        <p class="lang-head"><strong>${l.name}</strong> <span class="chip chip-ok">${l.level}</span></p>
        <p>${l.desc}</p>
      </li>`).join('');

    $('#state-now').innerHTML = s.now.map(n => `<li>${n}</li>`).join('');

    jsonFilled = 0;
    renderStateJson();
    $$('.state-msg').forEach(observeReveal);
  }

  /* El JSON lateral muestra solo los mensajes que ya han "llegado" */
  function renderStateJson() {
    const s = content.state;
    const total = s.messages.length;
    const filled = reduced ? total : s.messages.filter(m => revealed.has('msg-' + m.key)).length;
    const key = k => `<span class="j-key">"${k}"</span>`;
    const str = v => `<span class="j-str">"${esc(plain(v))}"</span>`;

    const lines = [];
    lines.push('{');
    lines.push(`  ${key('bootcamp')}: ${str('The Bridge · ' + plain(s.bootcamp.dates))},`);
    lines.push(`  ${key('messages')}: [`);
    s.messages.slice(0, filled).forEach((m, i) => {
      const isNew = i >= jsonFilled && !reduced;
      lines.push(`<span class="j-line${isNew ? ' is-new' : ''}">    ${str(m.title)}${i < filled - 1 || filled < total ? ',' : ''}</span>`);
    });
    if (filled < total) lines.push(`    <span class="j-pending">… +${total - filled}</span>`);
    lines.push('  ],');
    lines.push(`  ${key('languages')}: {`);
    s.languages.forEach((l, i) => lines.push(`    ${key(plain(l.name))}: ${str(l.level)}${i < s.languages.length - 1 ? ',' : ''}`));
    lines.push('  }');
    lines.push('}');

    $('#state-json').innerHTML = lines.join('\n');
    $('#state-count').textContent = filled;
    jsonFilled = filled;
  }

  /* · tools: cada proyecto es una herramienta con su llamada y su resultado */
  function renderTools() {
    const T = content.tools;
    const ui = content.ui;
    const chips = tags => `<ul class="chips" aria-label="${esc(ui.techs)}">${tags.map(t => `<li class="chip">${t}</li>`).join('')}</ul>`;
    const signature = p => `<p class="tool-signature"><span class="tok-dim">tool_call:</span> <span class="tok-fn">${p.fn}</span>(<span class="tok-arg">${esc(p.params)}</span>)</p>`;

    $('#tools-main').innerHTML = T.main.map(p => `
      <article class="panel tool-card" id="tool-${p.id}" data-tool>
        <div class="tool-top">
          ${signature(p)}
          <span class="tool-status"><span class="ok-dot" aria-hidden="true"></span>ToolMessage</span>
        </div>
        <p class="tool-type">${p.type}</p>
        <h3 class="tool-title">${p.title}</h3>
        <p class="tool-desc">${p.desc}</p>

        <button class="tool-toggle" type="button" aria-expanded="false" aria-controls="call-${p.id}">
          <span class="tt-icon" aria-hidden="true">▸</span> <span class="tt-text">${ui.showCall}</span>
        </button>
        <div class="tool-call" id="call-${p.id}">
          <div class="tool-call-inner">
            <div class="call-block">
              <p class="call-label">${T.argsLabel}</p>
              <pre class="call-args">${esc(p.args)}</pre>
            </div>
            <div class="call-block">
              <p class="call-label">${T.stepsLabel}</p>
              <ol class="call-steps">${p.steps.map(s => `<li><code>${s.name}</code><span>${s.note}</span></li>`).join('')}</ol>
            </div>
          </div>
        </div>

        <div class="tool-result">
          <p class="call-label call-label--ok">${T.resultLabel}</p>
          <ul class="result-grid">${p.result.map(r => `<li><b>${r.value}</b><span>${r.label}</span></li>`).join('')}</ul>
        </div>
        ${chips(p.tags)}
        <div class="card-links">
          <a class="link-primary" href="${p.case}">${ui.caseStudy}</a>
          <a href="${p.code}" target="_blank" rel="noopener">${ui.code}</a>
        </div>
      </article>`).join('');

    $('#tools-secondary').innerHTML = T.secondary.map(p => `
      <article class="panel tool-card tool-card--compact" id="tool-${p.id}">
        ${signature(p)}
        <p class="tool-type">${p.type}</p>
        <h3 class="tool-title">${p.title}</h3>
        <p class="tool-desc">${p.desc}</p>
        <p class="tool-result-line"><span class="tok-ok" aria-hidden="true">→</span> ${p.result}</p>
        ${chips(p.tags)}
        <div class="card-links">
          <a href="${p.code}" target="_blank" rel="noopener">${ui.code}</a>
          ${p.demo ? `<a href="${p.demo}" target="_blank" rel="noopener">${ui.demo}</a>` : ''}
        </div>
      </article>`).join('');

    bindToolCards();
  }

  /* · retriever: nube de puntos agrupada por categoría */
  function renderRetriever() {
    const R = content.retriever;
    // Desplazamiento pseudoaleatorio pero estable para cada punto (aspecto de "nube")
    const jitter = (name, salt) => {
      let h = 0;
      for (const ch of name + salt) h = (h * 31 + ch.charCodeAt(0)) | 0;
      return (Math.abs(h) % 11) - 5;
    };

    $('#vector-space').innerHTML = R.clusters.map(cl => `
      <div class="cluster cluster--${cl.id}">
        <p class="cluster-name"><span class="centroid" aria-hidden="true"></span>${cl.name}</p>
        <ul class="points">
          ${cl.items.map(it => `
            <li><button type="button" class="vec${it.uses.includes('pending') ? ' is-pending' : ''}"
                  data-tech="${esc(it.name)}" data-uses="${it.uses.join(' ')}" tabindex="-1"
                  style="--dx:${jitter(it.name, 'x')}px;--dy:${jitter(it.name, 'y')}px">
              <span class="vec-dot" aria-hidden="true"></span>${it.name}
            </button></li>`).join('')}
        </ul>
      </div>`).join('');

    const vecs = $$('.vec');
    const current = vecs.find(v => v.dataset.tech === selectedTech);
    (current || vecs[0]).tabIndex = 0;          // tabindex itinerante: un único punto en el orden de tabulación
    if (current) queryTech(current); else showEmptyRetrieval();
  }

  function showEmptyRetrieval() {
    $('#retrieval-query').textContent = '…';
    $('#retrieval-results').innerHTML = `<p class="retrieval-empty">${content.retriever.empty}</p>`;
  }

  /* Lanza la "consulta" al retriever con la tecnología elegida */
  function queryTech(btn) {
    const R = content.retriever;
    const uses = btn.dataset.uses.split(' ');
    selectedTech = btn.dataset.tech;

    $$('.vec').forEach(v => {
      const shared = v !== btn && v.dataset.uses.split(' ').some(u => u !== 'pending' && uses.includes(u));
      v.classList.toggle('is-query', v === btn);
      v.classList.toggle('is-related', shared);
    });

    // Destino de cada resultado dentro de la página
    const target = { leads: '#tool-leads', reservas: '#tool-reservas', api: '#tool-api', ml: '#tool-ml', airbnb: '#tool-airbnb', bootcamp: '#state', all: '#tools' };
    $('#retrieval-query').textContent = `"${selectedTech}"`;
    $('#retrieval-results').innerHTML = `
      <p class="results-label">→ ${R.resultsLabel} (${uses.length})</p>
      <ol class="results">
        ${uses.map((u, i) => `<li><span class="r-idx" aria-hidden="true">[${i}]</span> ${
          target[u] ? `<a href="${target[u]}">${R.sources[u]}</a>` : `<span class="is-pending">${R.sources[u] || u}</span>`
        }</li>`).join('')}
      </ol>`;
  }

  /* · guardrails: reglas de control que el mensaje atraviesa */
  function renderGuardrails() {
    const G = content.guardrails;
    $('#gates').innerHTML = G.rules.map((r, i) => `
      <li class="gate reveal" data-reveal-key="gate-${r.id}">
        <span class="gate-mark" aria-hidden="true"><span class="gate-icon"></span></span>
        <div class="panel gate-body">
          <p class="gate-id">
            <code>guardrail_${String(i + 1).padStart(2, '0')} · ${r.id}</code>
            <span class="gate-status"><span aria-hidden="true">✓</span> ${G.passed}</span>
          </p>
          <h3>${r.title}</h3>
          <p>${r.desc}</p>
          <p class="gate-agent"><span>${G.appliesTo}</span> <span class="chip">${r.agent}</span></p>
        </div>
      </li>`).join('');
    $$('.gate').forEach(observeReveal);
  }

  /* · evaluator: proceso como traza + gráfico del 90 % al 99 % */
  function renderEvaluator() {
    const E = content.evaluator;
    const C = E.chart;

    $('#eval-steps').innerHTML = E.steps.map((s, i) => `
      <li class="trace-step reveal" data-reveal-key="step-${s.id}">
        <div class="step-body">
          <p class="step-head">
            <span class="step-num">${i + 1}</span><code>${s.id}</code>
            <span class="step-ok" aria-hidden="true">✓</span>
          </p>
          <h3>${s.title}</h3>
          <p>${s.desc}</p>
        </div>
      </li>`).join('');

    // Gráfico de barras horizontales (escala completa 0–100 para no exagerar la diferencia)
    const lastBar = C.bars.length - 1;
    $('#eval-chart').innerHTML = `
      <figcaption>
        <h3 class="chart-title">${C.title}</h3>
        <p class="chart-sub">${C.subtitle}</p>
      </figcaption>
      <div class="bars reveal" data-reveal-key="chart" aria-hidden="true">
        ${C.bars.map((b, i) => `
          <div class="bar-row${i === lastBar ? ' is-final' : ''}">
            <p class="bar-label">${b.label}</p>
            <div class="bar-track">
              <div class="bar" style="--v:${b.value / 100}"></div>
              <span class="bar-value" style="--v:${b.value / 100}">${b.display}</span>
            </div>
          </div>`).join('')}
        <div class="axis"><span style="--x:0">0</span><span style="--x:0.5">50</span><span style="--x:1">100</span></div>
      </div>
      <div class="sr-only">
        <table>
          <caption>${C.tableCaption}</caption>
          <tbody>${C.bars.map(b => `<tr><th scope="row">${b.label}</th><td>${b.display}</td></tr>`).join('')}</tbody>
        </table>
      </div>
      <p class="chart-delta"><span class="chip chip-ok">↑ ${C.delta}</span> <span>${C.runs}</span></p>
      <p class="list-label">${C.fixesTitle}</p>
      <ul class="fixes">${C.fixes.map(f => `<li><span class="fix-icon" aria-hidden="true">✓</span>${f}</li>`).join('')}</ul>
      <a class="chart-source" href="https://albarodriguez7.github.io/casos.html#leads">${C.source}</a>`;

    $$('.trace-step').forEach(observeReveal);
    observeReveal($('.bars'));
  }

  /* · Aristas SVG entre nodos: línea base, tramo iluminado y punto de luz */
  const EDGE_H = 112;
  function renderEdges() {
    $$('.edge').forEach(edge => {
      if (!edge.querySelector('svg')) {
        edge.innerHTML = `
          <svg class="edge-svg" width="28" height="124" viewBox="0 0 28 124" focusable="false">
            <path class="edge-base" d="M14 0 V${EDGE_H}"/>
            <path class="edge-lit" d="M14 0 V${EDGE_H}"/>
            <path class="edge-head" d="M9 ${EDGE_H - 4} L14 ${EDGE_H + 4} L19 ${EDGE_H - 4}"/>
            <circle class="edge-msg" r="4.5" cx="14" cy="0"/>
          </svg>
          <code class="edge-label"></code>`;
        const lit = $('.edge-lit', edge);
        const len = lit.getTotalLength();
        lit.style.strokeDasharray = len;
        lit.style.strokeDashoffset = len;
        edge._len = len;
      }
      $('.edge-label', edge).textContent = content.edges[edge.dataset.edge] || '';
    });
  }

  function renderAll() {
    renderHero();
    renderAgent();
    renderState();
    renderTools();
    renderRetriever();
    renderGuardrails();
    renderEvaluator();
    renderEdges();
  }

  /* ───────────────── 3. Aparición al hacer scroll ───────────────── */

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        reveal(entry.target);
      }), { rootMargin: '0px 0px -22% 0px', threshold: 0 })
    : null;

  // Si ya se mostró (o no hay movimiento), aparece directamente; si no, se observa
  function observeReveal(el) {
    if (!el) return;
    const key = el.dataset.revealKey;
    if (reduced || !io || revealed.has(key)) {
      revealed.add(key);
      el.classList.add('is-in');
      if (el.id === 'agent-body') $('.msg-panel').classList.add('is-answered');
      return;
    }
    io.observe(el);
  }

  function reveal(el) {
    revealed.add(el.dataset.revealKey);

    // El nodo agent "piensa" un momento antes de responder
    if (el.id === 'agent-body') {
      setTimeout(() => {
        el.classList.add('is-in');
        $('.msg-panel').classList.add('is-answered');
      }, 900);
      return;
    }

    el.classList.add('is-in');
    if (el.classList.contains('state-msg')) renderStateJson();
  }

  /* ───── 4. Motor de scroll: nodo activo, mini-mapa y aristas ───── */

  const sections = $$('[data-node]');
  const mmLinks = $$('.mm-node');
  const minimap = $('#minimap');
  let activeIdx = -1;
  let ticking = false;

  function scheduleUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    const line = vh * 0.4;                         // "línea de lectura": el nodo que la cruza es el activo
    const tops = sections.map(s => s.getBoundingClientRect().top);
    const atBottom = vh + window.scrollY >= document.documentElement.scrollHeight - 4;

    let idx = 0;
    tops.forEach((top, i) => { if (top <= line) idx = i; });
    if (atBottom) idx = sections.length - 1;

    // Progreso global del mensaje (0 → 1) para el mini-mapa
    let frac = 0;
    if (!atBottom && idx < sections.length - 1) frac = clamp((line - tops[idx]) / (tops[idx + 1] - tops[idx]));
    const progress = atBottom ? 1 : (idx + frac) / (sections.length - 1);
    minimap.style.setProperty('--p', progress.toFixed(4));

    setActive(idx);

    // Cada arista se ilumina mientras cruza la pantalla
    $$('.edge').forEach(edge => {
      const r = edge.getBoundingClientRect();
      const p = reduced ? 1 : clamp((vh * 0.9 - r.top) / (vh * 0.45));
      setEdge(edge, p);
    });
  }

  function setEdge(edge, p) {
    if (!edge._len) return;
    $('.edge-lit', edge).style.strokeDashoffset = edge._len * (1 - p);
    const dot = $('.edge-msg', edge);
    dot.setAttribute('cy', (EDGE_H * p).toFixed(1));
    dot.style.opacity = p > 0 && p < 1 ? 1 : 0;
    edge.classList.toggle('is-done', p >= 1);
  }

  function setActive(idx) {
    if (idx === activeIdx) return;
    activeIdx = idx;
    const last = sections.length - 1;

    sections.forEach((s, i) => {
      // Al llegar a __end__ el grafo ha terminado: todo queda "completado"
      const status = i < idx || (idx === last && i === last) ? 'done' : i === idx ? 'running' : 'idle';
      s.dataset.status = status;
      const label = $('[data-status-text]', s);
      if (label) label.textContent = content.ui.status[status];
    });

    mmLinks.forEach((a, i) => {
      a.classList.toggle('is-active', i === idx);
      a.classList.toggle('is-done', i < idx || idx === last);
      if (i === idx) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });

    $('#topbar-node').textContent = content.nodes[idx].name;
    $('#topbar-count').textContent = I18N.format(content.ui.nodeOf, { i: idx + 1, n: sections.length });
  }

  /* ─────────────────────── 5. Interacciones ─────────────────────── */

  /* Tarjetas de herramientas: hover / foco de teclado / botón despliegan la llamada */
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
        card.addEventListener('mouseleave', () => {
          if (!pinned && !card.contains(document.activeElement)) setOpen(false);
        });
      }
      // Solo el foco de teclado (focus-visible) abre; un toque en móvil lo gestiona el botón
      card.addEventListener('focusin', e => {
        if (e.target.matches(':focus-visible')) setOpen(true);
      });
      card.addEventListener('focusout', e => {
        if (!card.contains(e.relatedTarget) && !pinned && !(hoverCapable && card.matches(':hover'))) setOpen(false);
      });
      btn.addEventListener('click', () => {
        const open = !card.classList.contains('is-open');
        pinned = open;
        setOpen(open);
      });
    });
  }

  /* Retriever: ratón, foco y flechas del teclado (tabindex itinerante) */
  function bindRetriever() {
    const space = $('#vector-space');
    space.addEventListener('mouseover', e => {
      const v = e.target.closest('.vec');
      if (v && hoverCapable) queryTech(v);
    });
    space.addEventListener('focusin', e => {
      const v = e.target.closest('.vec');
      if (!v) return;
      $$('.vec').forEach(x => { x.tabIndex = x === v ? 0 : -1; });
      queryTech(v);
    });
    space.addEventListener('click', e => {
      const v = e.target.closest('.vec');
      if (v) queryTech(v);
    });
    space.addEventListener('keydown', e => {
      const vecs = $$('.vec');
      const i = vecs.indexOf(document.activeElement);
      if (i < 0) return;
      const moves = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: vecs.length - 1 };
      if (!(e.key in moves)) return;
      e.preventDefault();
      vecs[(moves[e.key] + vecs.length) % vecs.length].focus();
    });
  }

  /* Copiar email con confirmación accesible */
  function bindCopy() {
    const btn = $('#copy-email');
    const status = $('#copy-status');
    let timer;

    const legacyCopy = text => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      return ok;
    };

    btn.addEventListener('click', async () => {
      const email = content.end.email;
      let ok = false;
      try {
        await navigator.clipboard.writeText(email);
        ok = true;
      } catch (e) {
        ok = legacyCopy(email);
      }
      status.textContent = ok ? content.ui.copied : content.ui.copyError;
      status.classList.toggle('is-ok', ok);
      btn.classList.toggle('is-copied', ok);
      clearTimeout(timer);
      timer = setTimeout(() => {
        status.textContent = '';
        btn.classList.remove('is-copied');
      }, 4000);
    });
  }

  /* Enlaces internos: scroll suave (o instantáneo) y foco en el título del nodo */
  function bindAnchors() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || a.getAttribute('href').length < 2) return;
      const target = document.getElementById(a.getAttribute('href').slice(1));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      const focusEl = target.matches('section') ? $('h1, h2', target) : target;
      if (focusEl) {
        if (!focusEl.hasAttribute('tabindex') && !focusEl.matches('a, button')) focusEl.setAttribute('tabindex', '-1');
        focusEl.focus({ preventScroll: true });
      }
      history.pushState(null, '', a.getAttribute('href'));
    });
  }

  function showLoadError() {
    const main = $('#main');
    const msg = document.createElement('p');
    msg.className = 'load-error';
    msg.setAttribute('role', 'alert');
    msg.innerHTML = 'No se ha podido cargar el contenido (<code>data/*.json</code>). Si has abierto el archivo directamente, usa un servidor local: <code>python -m http.server</code>.';
    main.prepend(msg);
  }

  /* ───────────────── 6. Arranque y cambio de idioma ───────────────── */

  I18N.ready.then(dict => {
    content = dict;
    renderAll();
    bindRetriever();
    bindCopy();
    bindAnchors();
    update();
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    // Si se entra con #ancla, recolocar tras pintar el contenido
    if (location.hash) {
      const target = document.getElementById(location.hash.slice(1));
      if (target) target.scrollIntoView();
    }
  }).catch(showLoadError);

  I18N.onChange(dict => {
    content = dict;
    renderAll();
    activeIdx = -1;      // fuerza a reescribir los estados en el nuevo idioma
    update();
  });

  // Si el usuario cambia la preferencia de movimiento con la página abierta
  motionQuery.addEventListener('change', e => {
    reduced = e.matches;
    document.documentElement.classList.toggle('reduced', reduced);
    if (content) { renderAll(); update(); }
  });
})();

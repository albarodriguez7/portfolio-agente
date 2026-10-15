/* ==========================================================================
   i18n.js — Cambio de idioma ES / EN
   --------------------------------------------------------------------------
   · Carga el contenido desde data/content.{es,en}.json (todo el texto vive ahí).
   · Idioma inicial: ?lang=en|es  >  preferencia guardada  >  idioma del navegador.
   · Rellena los elementos con:
       data-i18n="ruta.al.texto"          → innerHTML (admite <strong>, <code>…)
       data-i18n-attr="attr:ruta;attr2:ruta2" → atributos (aria-label, etc.)
     Las rutas admiten índices de listas: "hero.metrics.0.value".
   · Expone window.I18N para que main.js pinte las listas y escuche los cambios.
   ========================================================================== */
(() => {
  'use strict';

  const SUPPORTED = ['es', 'en'];
  const STORAGE_KEY = 'lang';           // misma clave que la web clásica: la preferencia se comparte
  const cache = {};
  const listeners = [];
  let lang = detectLang();
  let dict = null;

  /* Idioma inicial */
  function detectLang() {
    const param = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.includes(param)) return param;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.includes(saved)) return saved;
    } catch (e) { /* almacenamiento bloqueado: se ignora */ }
    return (navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  /* Descarga (una sola vez) el JSON de un idioma */
  async function load(l) {
    if (!cache[l]) {
      const res = await fetch(`data/content.${l}.json`);
      if (!res.ok) throw new Error(`No se pudo cargar data/content.${l}.json (${res.status})`);
      cache[l] = await res.json();
    }
    return cache[l];
  }

  /* Lee una ruta tipo "a.b.0.c" del diccionario actual */
  function t(path, source = dict) {
    return path.split('.').reduce((obj, key) => (obj == null ? undefined : obj[key]), source);
  }

  /* Sustituye {variables} en una cadena: format('nodo {i}', {i: 2}) */
  function format(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  }

  /* Texto plano (para atributos) a partir de una cadena con HTML */
  function plain(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent;
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el && value) el.setAttribute(attr, value);
  }

  /* Aplica el diccionario a todo el documento */
  function apply() {
    document.documentElement.lang = lang;
    document.title = dict.meta.title;
    setMeta('meta[name="description"]', 'content', dict.meta.description);
    setMeta('meta[property="og:locale"]', 'content', dict.meta.ogLocale);

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const value = t(el.dataset.i18n);
      if (typeof value === 'string') el.innerHTML = value;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      el.dataset.i18nAttr.split(';').forEach(pair => {
        const [attr, path] = pair.split(':').map(s => s.trim());
        const value = t(path);
        if (attr && typeof value === 'string') el.setAttribute(attr, plain(value));
      });
    });

    const toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.dataset.current = lang;
  }

  /* Cambia de idioma, guarda la preferencia y avisa a los suscriptores */
  async function set(next) {
    if (!SUPPORTED.includes(next)) return;
    dict = await load(next);
    lang = next;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* sin almacenamiento */ }
    apply();
    listeners.forEach(fn => fn(dict, lang));
  }

  /* Carga inicial: main.js espera a esta promesa antes de pintar */
  const ready = load(lang)
    .then(d => { dict = d; apply(); return dict; })
    .catch(err => {
      console.error(err);
      document.documentElement.classList.add('i18n-error');
      throw err;
    });

  /* Botón ES / EN */
  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('lang-toggle');
    if (toggle) toggle.addEventListener('click', () => set(lang === 'es' ? 'en' : 'es'));
  });

  window.I18N = {
    ready,
    set,
    t,
    format,
    onChange: fn => listeners.push(fn),
    get lang() { return lang; },
    get dict() { return dict; }
  };
})();

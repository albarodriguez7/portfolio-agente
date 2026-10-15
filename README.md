# Portfolio · viaje por dentro de un agente de IA

Nueva versión del portfolio de **Alba Rodríguez — Junior AI Engineer**. Quien visita la web es un mensaje (`HumanMessage`) que recorre el grafo de un agente de LangGraph mientras hace scroll. Cada sección es un nodo:

| Nodo | Sección |
|---|---|
| `__start__` | Hero: nombre, resumen y cifras clave |
| `agent` | Sobre mí |
| `state` | Formación y trayectoria (cada módulo se añade a `state["messages"]`) |
| `tools` | Proyectos como herramientas (`tool_call` → resultado) |
| `retriever` | Stack como espacio de vectores |
| `guardrails` | Cómo construyo agentes fiables |
| `evaluator` | Cómo trabajo + gráfico 90 % → 99 % |
| `__end__` | Contacto |

Es un sitio estático (HTML + CSS + JavaScript vanilla, sin build ni dependencias).

## Estructura

```
portfolio-agente/
├── index.html              Estructura semántica de los nodos
├── css/styles.css          Variables al principio y una sección comentada por nodo
├── js/i18n.js              Carga los JSON y cambia ES / EN
├── js/main.js              Pinta las listas, scroll, mini-mapa, aristas e interacciones
├── data/content.es.json    Todo el texto en español
├── data/content.en.json    Todo el texto en inglés
└── assets/                 favicon.svg y og-image.png
```

## Editar el contenido

Todo el texto vive en `data/content.es.json` y `data/content.en.json`, con la **misma estructura** en los dos. No hace falta tocar el HTML:

- **Cambiar un texto:** edítalo en los dos JSON. Se admite HTML sencillo (`<strong>`, `<code>`).
- **Añadir un proyecto principal:** copia un objeto de `tools.main` y cambia `id`, `title`, `desc`, `fn`, `params`, `args`, `steps`, `result`, `tags`, `case` y `code`.
- **Añadir un proyecto secundario:** igual, en `tools.secondary` (`demo` es opcional).
- **Añadir una tecnología:** añádela a `retriever.clusters[n].items` con `uses`, que es la lista de proyectos donde la usas. Valores posibles: `leads`, `reservas`, `api`, `ml`, `airbnb`, `all`, `bootcamp` o `pending`. Los nombres que se muestran están en `retriever.sources`.
- **Formación:** `state.bootcamp` y `state.messages`. Cada mensaje aparece en la línea de tiempo y en el `state.json` lateral.
- **Principios y proceso:** `guardrails.rules` y `evaluator.steps`. Los datos del gráfico están en `evaluator.chart`.

Si algún JSON tiene un error de sintaxis, la página muestra un aviso. Para comprobarlo:

```bash
python3 -m json.tool data/content.es.json > /dev/null && echo OK
```

## Probar en local

Los JSON se cargan con `fetch`, así que hay que usar un servidor (abrir el archivo directamente no funciona):

```bash
python3 -m http.server 8000
# abre http://localhost:8000/
```

Para forzar un idioma, añade `?lang=en` o `?lang=es` a la URL.

## Publicar en GitHub Pages

Este repositorio es independiente del portfolio clásico (`albarodriguez7.github.io`), que no se toca.

1. En GitHub, ve a **Settings → Pages → Build and deployment**.
2. Elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
3. En un par de minutos estará en `https://albarodriguez7.github.io/portfolio-agente/`.

Los enlaces a los casos de estudio y al CV apuntan al portfolio clásico (`https://albarodriguez7.github.io/…`), y el pie enlaza a esa versión.

Ahora lleva `<meta name="robots" content="noindex">` para que Google no la indexe. Si quieres que aparezca en buscadores, borra esa línea de `index.html`.

## Accesibilidad y rendimiento

- Enlace «Saltar al contenido», HTML semántico, `lang` dinámico y foco visible.
- Todo se puede usar con teclado:
  - las tarjetas de herramientas se despliegan con el foco o con su botón;
  - en el retriever, los puntos se recorren con las flechas;
  - el mini-mapa enfoca el título del nodo al que lleva.
- Con `prefers-reduced-motion` no hay animaciones y todo es visible desde el principio.
- Colores con contraste WCAG AA. El texto más tenue tiene un contraste de 4,6:1 sobre la superficie más clara.
- Sin dependencias: solo las fuentes Inter y JetBrains Mono de Google Fonts. Los gráficos son SVG y CSS.

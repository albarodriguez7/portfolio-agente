# Portfolio · un viaje por dentro de un agente de IA

Portfolio de **Alba Rodríguez — Junior AI Engineer** en forma de recorrido 3D. Quien visita la web escribe una pregunta en el chat de un ordenador («¿Quién es Alba y qué construye?»). Al hacer scroll, la cámara entra por la pantalla y viaja por dentro del agente siguiendo a ese mensaje.

🌐 https://albarodriguez7.github.io/portfolio-agente/ · Portfolio clásico: https://albarodriguez7.github.io/

## El recorrido

| # | Escenario 3D | Nodo | Contenido |
|---|---|---|---|
| 1 | Escritorio con un ordenador; el visitante escribe en el chat y la cámara entra por la pantalla | `__start__` | Presentación y cifras |
| 2 | Túnel del tokenizador: el mensaje se rompe en tokens | — | Frase |
| 3 | El LLM por dentro: capas de neuronas y pulsos de atención | `agent` | Sobre mí |
| 4 | Núcleo de decisión | — | Frase |
| 5 | Cuaderno de apuntes que es un Jupyter Notebook (alba.ipynb): cada página es una celda In/Out con una etapa y pasa al leer la siguiente | `state` | Formación |
| 6 | Taller: un pedestal por proyecto que se «ejecuta» al pasar | `tools` | Proyectos |
| 7 | Índice del retriever: 4 fichas de cristal (una por categoría) que un haz lee una a una | `retriever` | Stack |
| 8 | 2 vallas láser que se abren y se vuelven verdes (resumen de las reglas) | `guardrails` | Principios |
| 9 | Pasillo con flujos de datos | — | — |
| 10 | Sala de control con monitores tipo LangSmith | `evaluator` | Cómo trabajo |
| 11 | Salimos por la pantalla con la respuesta del agente | `__end__` | Contacto |

## Tecnología

- **Three.js 0.160**, incluido en `vendor/three/` (sin CDN), con post-procesado *bloom* para el neón.
- HTML, CSS y JavaScript con módulos ES. No hay paso de compilación y se publica tal cual en GitHub Pages.
- Todo el 3D está hecho con código (geometrías low-poly y texturas dibujadas en `<canvas>`), sin modelos descargados.

```
index.html             Estructura: lienzo 3D fijo + secciones con paneles
css/styles.css         Interfaz (paneles, HUD, responsive)
js/i18n.js             Carga data/content.{es,en}.json y cambia ES / EN
js/app.js              Pinta los paneles, conecta scroll ↔ cámara, HUD e interacciones
js/world/world.js      Renderer, bloom y bucle de animación
js/world/journey.js    Recorrido de la cámara: fotogramas clave por escena
js/world/*.js          Una escena por archivo (exterior, tokenizer, brain, memory,
                       workshop, vectors, gates, control) + kit.js (piezas comunes)
data/content.*.json    Todo el texto en español e inglés
```

## Editar el contenido

Todo el texto está en `data/content.es.json` y `data/content.en.json`, con la misma estructura en los dos. Los paneles **y** las escenas 3D se rellenan desde ahí: las placas de la memoria, las pantallas del taller, las estrellas del stack, los monitores de la sala de control y el chat del ordenador.

- **Proyectos:** `tools.main` y `tools.secondary`.
- **Stack:** `retriever.clusters` (una lista de nombres por categoría; aparecen en el panel y en las fichas 3D).
- **Formación:** `state.previous` y `state.bootcamp` (los dos escalones base; `bootcamp.short` es el nombre corto de la placa) y `state.messages`.
- **Principios y proceso:** `guardrails.rules` (una valla por regla) y `evaluator`.
- **Textos del recorrido:** `screen` (chat del ordenador), `tokens`, `scenes` (frases grandes) y `hud`.

Para mover la cámara o cambiar el ritmo, edita `KEYFRAMES` en `js/world/journey.js`. Cada escena tiene fotogramas con `u` (0 → 1, el progreso dentro de su sección), posición, punto al que mira y `shift`, que desplaza el encuadre para dejar sitio al panel.

## Probar en local

```bash
python3 -m http.server 8000
# abre http://localhost:8000/
```

## Accesibilidad

- El contenido es HTML real (el 3D es decorativo, con `aria-hidden`).
- Hay enlace «Saltar al contenido», todo se puede usar con teclado y el HUD del grafo enfoca el título de cada sección.
- Con `prefers-reduced-motion`, la cámara no vuela: muestra una imagen fija de cada escena y no hay animaciones.
- Si el navegador no tiene WebGL, se muestra el contenido sobre un fondo de rejilla.

## Publicar cambios (caché del navegador)

GitHub Pages permite al navegador guardar los archivos 10 minutos. Para que los cambios se vean al momento, todos los CSS/JS/JSON llevan `?v=AAAAMMDDhhmm`. Antes de subir cambios, actualiza esa versión en todos a la vez:

```bash
V=$(date +%Y%m%d%H%M)
sed -i -E "s#\?v=[0-9]+#?v=$V#g" index.html js/*.js js/world/*.js
```

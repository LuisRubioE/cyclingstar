# E3 · Fase 1: instrucciones comunes a las cuatro propuestas

Lee antes `00-encargo.md` entero, los **cinco mapas** de `mapas/` enteros (01 la web, 02 el examen y
la frontera, 03 los maillots, 04 el corpus, 05 las pantallas y la web instalable) y **mira las
capturas** de `capturas/` (al menos las del cuadro de entrenamiento, el viaje, las tablas anchas y el
maillot, a 360 y a 1.280 px) con tu herramienta de lectura de imágenes. Los mapas son la base de
hechos: **no repitas su lectura del código salvo para comprobar algo que te parezca dudoso**, y si
compruebas y el mapa se equivoca, dilo con la línea. Después lee el código que tu lente necesite de
verdad.

Cada propuesta es un **diseño completo** de E3 (cubre TODO el encargo), organizado desde una lente
distinta. No es un ensayo: es lo que tres jueces van a comparar con otras tres y lo que, si gana, se
convierte en `docs/visual.md`. Tamaño: **500 a 700 líneas**. Modelo de densidad:
`docs/diseno/e2-retransmision/propuestas/ingeniero.md`.

## Las cuatro lentes

- **`telefono`**: el teléfono como plataforma. Diseña desde la pantalla de 360 px hacia arriba: el
  pulgar, la red mala, la web instalable, las tablas anchas convertidas en algo que se lee en un
  teléfono, y la prueba medible que dice si «se juega bien en un teléfono» y que algún día revisará
  la decisión de no hacer app nativa.
- **`sistema`**: el sistema como código. Los tokens en el `@theme` de Tailwind v4, un catálogo
  cerrado de componentes con todos sus estados, las reglas que impiden reinventar (lint, tests,
  revisión), la migración pantalla a pantalla con su coste, y cómo se mantiene el sistema cuando
  lleguen las once épicas que faltan.
- **`identidad`**: los maillots y la identidad. La señal de campeón, el vocabulario y el editor del
  maillot del equipo, lo que compra el patrocinador, los maillots de líder y el dorsal, el
  daltonismo como restricción de diseño medida y no como comprobación final, y el material
  generable.
- **`lectura`**: el diseño de información. La jerarquía, la densidad y las escalas; el cuadro de
  entrenamiento y el viaje como banco de pruebas del sistema entero; la regla de la frontera como
  verdad del producto; y la televisión como norte (lo permanente y lo eventual, que E2 ya aplicó en
  `Watch`).

Una lente decide qué se mira primero y qué pesa más, no qué se deja fuera: las cuatro cubren las
dieciséis secciones de abajo.

## Lo que los mapas han cambiado del encargo, y que ninguna propuesta puede pasar por alto

1. **El examen no es solo de presentación.** La vista previa cuenta cada día de carrera como
   descanso activo y se equivoca en las vueltas desde la segunda etapa (mapa 02 §3); el panel de los 28
   días no pinta lo que sale de los bloques (mapa 02 §1); y dos planes solapados hacen que la pantalla
   lea uno y el tick entrene otro (mapa 02 §2). Cada propuesta decide qué de esto arregla E3 (en la API
   y en la web, no en el motor) y qué deja anotado para otra línea, y lo dice.
2. **La frontera se rompe por los números, no por los ocultos**: los diez atributos internos de
   cualquier corredor viajan con decimales en `/api/riders/:id`, y `tsb`, `ctl` y `atl` en la vista
   previa; los contratos son _strip_ y solo validan en la web (mapa 02 §8 y §9).
3. **La semilla del maillot es la identidad del equipo NPC**: cambiarla, como hace el selector de hoy,
   hace que el tick siguiente cree un clon (mapa 03 §2.2). El editor no puede guardar el dibujo en esa
   semilla.
4. **Ya hay gemelos en visión normal** (mapa 03 §3), el maillot se ve a 13 px en `Watch` (mapa 03
   §1.2) y los líderes comparten color y figura con las equipaciones (mapa 03 §4.1).
5. **El dorsal del equipo líder no existe**: el dueño lo mandó quitar el 15 de agosto de 2026 porque
   en su móvil se leía «Ill», aunque `docs/navegacion.md` §7.4 y `docs/retransmision.md` lo den por
   pintado (mapa 04, contradicción 1). La propuesta decide si vuelve y cómo, sin darlo por hecho.
6. **El dueño no ha hablado del aspecto** (mapa 04 §2): las decisiones de gusto no tienen precedente
   suyo y van a la página de opciones. Su única palabra de gusto es la del arcoíris (`00-encargo.md`
   §7.1), y a 13 px cada una de cinco bandas mide 0,54 px (mapa 03 §7).
7. **La escala de estrellas del SPEC está vieja**: manda el código, medias estrellas cada diez puntos
   (`packages/shared/src/rider.ts` l. 218-240; mapa 04, contradicción 2).
8. **El estilo de hoy fue una decisión** (el PR #105, «UI overhaul (manager style)», mapa 04 §2), para
   el público de Hattrick y de Pro Cycling Manager: conservarlo o romperlo se decide con motivo.
9. **Ninguna pantalla desborda a 360 px** (mapa 05 §2): el problema del teléfono es lo recortado
   (`/team/calendar`), la letra de 8 a 11 px, los objetivos de 13 a 20 px, el contraste, la barra
   inferior con cinco destinos y lo largo de las páginas (`/me/training` mide casi nueve pantallas).
10. **Sin red, la web se cae** (mapa 05 §13), y desde iOS 26 cualquier web de la pantalla de inicio se
    abre como app (mapa 05 §14).
11. **El peso**: las banderas de `flag-icons` son el 91 % de la CSS comprimida (mapa 01 §8).

## Estructura obligatoria (misma numeración en las cuatro, para que los jueces crucen)

0. **Resumen** (25 a 35 l.): la idea central, en qué se distingue de lo obvio, qué resuelve y qué
   deja.
1. **Diagnóstico**: qué falla hoy, con cita a los mapas y a las capturas (no repitas los mapas:
   apunta a ellos).
2. **Principios** (5 a 9, cada uno con su consecuencia en el diseño).
3. **Los fundamentos**: la paleta (cada token con nombre, hexadecimal, uso y contraste WCAG medido
   contra su fondo; los colores de estado; si hay modo oscuro y por qué), la tipografía (familia y
   de dónde se sirve, escala con tamaños y alturas de línea, pesos, cifras tabulares), el espaciado y
   la rejilla, la densidad, los radios, las sombras, la iconografía. Dónde vive cada cosa (el `@theme`
   de `apps/web/src/index.css`, `packages/shared`, otro sitio) y por qué.
4. **Los componentes y sus estados**: un catálogo cerrado. Como mínimo los que nombra el encargo
   (tabla de resultados, ficha de corredor, panel, aviso, botón, carga, error) más los que pidan los
   mapas (pestañas, etiquetas, vacío, la escala de cinco tramos, el rótulo de corredor, las barras).
   Para cada uno: anatomía, variantes, **todos sus estados** (normal, encima, foco, pulsado,
   deshabilitado, cargando, error, vacío, según aplique) con su aspecto en tokens, sus medidas, un
   ejemplo de texto de pantalla en inglés y su accesibilidad. Qué primitiva de hoy sustituye.
5. **El teléfono**: la estrategia para cada tabla ancha que inventarían los mapas, la navegación, los
   objetivos táctiles, la letra mínima, y **el criterio de aceptación medible**: qué prueba, con qué
   herramienta y con qué umbrales, dice que una pantalla «se juega bien en un teléfono».
6. **Los maillots**: el vocabulario del maillot del equipo (formas, franjas y colores, cuántas
   combinaciones da, cuántas son distinguibles medidas a su tamaño más pequeño y en las cuatro
   visiones), el editor (pantalla, estados, validación en el servidor, la interfaz que deja a E9 para
   moderar), **la señal de campeón** (nacional y mundial; contrarreloj y línea; cómo se ve a 16, 28 y
   72 px; por qué no es el arcoíris ni se le parece), los maillots de líder y el dorsal del equipo
   líder (el dibujo definitivo), lo que compra el patrocinador (zonas y reglas, para E8) y el
   contrato `WornJerseyIcon` que E2 dejó (`docs/retransmision.md` §7.9).
7. **El examen práctico**: el cuadro de entrenamiento rehecho (los tres defectos del apéndice A de
   `docs/agenda.md`, cada uno con su pantalla nueva dibujada en texto, sus textos en inglés y lo que
   cambia en la API) y el viaje (cómo se ve hoy tras el arreglo del 26 de septiembre y qué falta de
   presentación). Aquí se demuestra que el sistema funciona: usa los componentes de §4 y nada más.
8. **La web instalable**: el manifiesto (cada campo con su valor), los iconos (tamaños, `maskable`,
   el de Apple), el service worker (qué guarda y qué no guarda nunca, y por qué: la API de E2 sirve
   según lo que ha visto cada jugador), la conducta sin red, la actualización de una versión nueva,
   lo específico de iPhone, y la medida que algún día revisa la decisión de no hacer app nativa.
9. **La regla de la frontera**: la regla escrita, el mecanismo que la hace cumplir (no basta con
   escribirla), el inventario del mapa 02 con lo que se arregla de él, y cómo encaja con lo que E2 ya
   construyó para el destripe.
10. **Lo que E2 dejó a E3**: cómo se ven la capa fija, la barra de grupos, el rótulo, la previa, el
    cierre, `Watch`, `Highlights`, el `digest` y `Report`; qué cambia y qué se queda.
11. **Constantes y tokens**, con valor e intención, y dónde vive cada uno.
12. **Tests y bancos**: lo que se mide y con qué umbral (contraste, ΔE00 de los maillots, el
    desbordamiento a 360 px, el peso, la primera pintura), dónde corre (CI o a mano) y cuánto cuesta;
    y los tests de hoy que se re-sellan.
13. **Plan por pasos, tests primero**, con orden, dependencias y coste estimado en PR. Cada paso deja
    el juego desplegable y mejor que antes.
14. **Riesgos y fronteras** con E2, E4, E6, E8, E9, E10 y E12.
15. **Decisiones que son del dueño**, cada una con valor por defecto, su porqué y su consecuencia.
    Las cuatro de gusto (la paleta, la tipografía, la señal de campeón y el vocabulario del maillot)
    llevan **dos o tres alternativas concretas** cada una, descritas con valores (hexadecimales,
    familia tipográfica, el dibujo con sus medidas), para que la página de opciones pueda pintarlas
    lado a lado.

## Reglas

- Las de `00-encargo.md` §6 (castellano, citas de línea, medido frente a estimado, sin rayas en
  medio de frase, valores concretos, textos de pantalla en inglés, informe final de 12 líneas).
- Toda afirmación de contraste o de distinguibilidad va **medida** con el entorno de
  `<scratchpad>/venv` (razón WCAG; ΔE00 tras Machado 2009 en las cuatro visiones). Deja tus scripts
  en `<scratchpad>/propuesta-<lente>/`.
- Escribe solo tu fichero `propuestas/<lente>.md`. No leas las propuestas de los demás.
- Puedes ejecutar código en el scratchpad para medir o para probar una idea en el navegador (con el
  clon de `<scratchpad>/repo` y el Chromium de `/opt/pw-browsers`). No modifiques el repositorio.

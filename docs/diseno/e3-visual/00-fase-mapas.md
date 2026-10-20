# E3 · Fase 0: instrucciones comunes a los cinco cartógrafos

Lee antes `00-encargo.md` entero. Un mapa no propone nada: dice **qué hay hoy**, con su línea, y
**qué falta**, con su prueba. Es la base de hechos que leerán las cuatro propuestas, los tres jueces
y los cuatro refutadores, así que un error aquí se multiplica por once. Modelo de densidad y de
formato: `docs/diseno/e2-retransmision/mapas/03-web-superficie-destripe.md` y
`05-dueno-docs.md`.

## Estructura obligatoria

0. **Cabecera**: los ficheros leídos enteros, con sus líneas, y el commit (`58c14da`).
1. **Resumen** (10 a 25 líneas): los cinco a ocho hechos que más condicionan el diseño de E3, cada
   uno con su sección del mapa.
2. **Secciones numeradas** (`§1`, `§2`…), para que los demás citen «mapa 03 §4». Tablas donde haya
   que comparar o contar. Cada fila con fichero y línea.
3. **Lo que este mapa no ha podido comprobar**, y por qué.

Tamaño: **200 a 350 líneas**. Las reglas de escritura son las de `00-encargo.md` §6. Escribe solo tu
fichero (y, el mapa 05, también `capturas/`). Trabaja en `<scratchpad>/<tu-mapa>/`.

## Los cinco encargos

### Mapa 01 · La web por dentro (`mapas/01-web.md`)

`apps/web/src/` entero, salvo la lógica de `domain/broadcast/` (basta su superficie).

- El árbol de rutas (`App.tsx`) y las páginas, cada una con sus componentes y su tamaño.
- **El sistema de hoy, contado**: el `@theme` de `index.css`; un recuento por `grep` de cada familia
  de clases de Tailwind en todo `apps/web/src` (colores por tono y por paso, `text-*` de tamaño,
  `font-*`, `rounded-*`, `shadow-*`, `p-*`, `gap-*`, `max-w-*`, `tracking-*`, `tabular-nums`), con
  los veinte valores más usados de cada familia y los que solo aparecen una o dos veces; los colores
  escritos a mano (hexadecimales en `.tsx` y `.ts`); las fuentes (¿hay alguna cargada o es la del
  sistema?); el modo oscuro (¿existe algo?).
- **Las primitivas que existen** (`Panel`, `Tabs`, `ShowAll`, `TextField`, `StarRating`, `Badges`,
  `Flag`, `Jersey`, `RiderName`, `TeamLink`, `ErrorBoundary`…): qué hacen, cuántas veces se usan, y
  qué patrones se reinventan página a página en lugar de usarlas (cabeceras de panel, chips,
  botones, avisos, tablas). Cuenta los botones distintos que hay: cada combinación de clases de un
  `<button>` es un botón distinto.
- **Los estados, uno a uno**: cómo se pinta hoy la carga, el error, el vacío, el deshabilitado y el
  aviso en cada página (tabla página por estado, con la línea). ¿Hay esqueletos? ¿Hay un componente
  de error común? ¿Qué pasa cuando una consulta de React Query falla?
- **Las tablas**: cada `<table>` de la web, con su número de columnas, si tiene desplazamiento
  horizontal (`overflow-x-auto`), si fija la primera columna, y si aplica la regla «top 20 + Show
  all» de `docs/navegacion.md` §7.3.
- **Los iconos** (¿SVG a mano?, ¿emojis?, ¿una librería?), las banderas (`flag-icons`), el logotipo.
- **La accesibilidad de hoy**: `aria-*`, `role`, foco visible (`focus:` y `focus-visible:`), textos
  alternativos, encabezados por página.
- **El peso**: el resultado de `pnpm --filter @cyclingstar/web build` en `<scratchpad>/repo` (los
  trozos y su gzip; la entrada pesa 210 KB y 66 KB comprimida en la compilación de prueba del
  orquestador), y qué hay en la entrada que podría no estar.
- **Los tests que fijan el marcado de hoy** (los `.test.tsx` de la web): cuáles se romperían si
  cambian las clases, los textos o la estructura, porque el plan de E3 tendrá que re-sellarlos.

### Mapa 02 · El examen práctico y la frontera (`mapas/02-examen.md`)

- **El cuadro de entrenamiento entero**: `apps/web/src/pages/Training.tsx`, `components/PlanLadder.tsx`,
  el editor día a día (dónde está), `domain/trainingPlan.ts`, `domain/condition.ts`; la ruta que da
  la vista previa (`apps/api/src/routes/riders.ts`, alrededor de l. 477) y su esquema en
  `packages/shared/src/contracts.ts`; la proyección del motor
  (`packages/engine/src/training/projection.ts`, `arrivalLabel` y su relación con `tsbFactor` del
  SPEC §4.1, con los cortes exactos); `blockWeek()`; la cadena de precedencia real de
  `packages/db/src/train.ts` (viaje, orden del día, bloque, plan de equipo en modo mixto, entrenador,
  y el descanso activo del modo manual), con sus líneas de hoy, que el apéndice A daba como l.
  199-266. Comprueba **cada afirmación del apéndice A y del punto «examen práctico» del encargo**,
  una a una, con su veredicto (cierta, falsa, a medias, arreglada) y su línea.
- **Lo que el cuadro tiene que poder decir y hoy no dice**: qué datos tiene la API para nombrar la
  carrera de cada llegada (¿se conoce la carrera de cada día del plan en el servidor?, ¿en qué
  tabla?), para agrupar por carrera, para marcar qué día viene de un bloque y cuál lo escribió el
  jugador, y para enseñar el modo y su regla en el panel de los días.
- **El viaje**: cómo se ve hoy en el plan de 28 días y en `MyRaces` (`travelDaysLabel`,
  `getRiderTravelDays`, `returnTravelDaysFor`, `ridersTravellingBack`), con las líneas; lo que el
  arreglo del 26 de septiembre dejó hecho y lo que queda de presentación.
- **El entrenador**: `packages/engine/src/coachView.ts` (`ceilingOpinions`), `CEILING_OPINIONS`, y
  cómo lo pinta la web (`domain/coachOpinion.ts`).
- **La frontera, inventariada**: para las rutas que lee el jugador (la ficha propia del corredor, el
  plan, la vista previa, la forma, el mercado, las fichas ajenas, el equipo), compara lo que manda
  la API (el esquema de `contracts.ts` y lo que la ruta rellena) con lo que la web pinta, y lista
  cada campo que viaja y no se enseña, con su gravedad: ¿es un oculto del SPEC §3.4, un número que
  el SPEC §3.2 dice que nunca se ve, o un dato inocuo? El `tsb` en número de la vista previa es el
  primer candidato. Di también qué mecanismos existen ya en el repositorio que se parezcan a una
  regla de frontera (el comentario de cabecera de `routes/riders.ts`, el registro de rutas de E2 con
  su clase, `spoilerRegistry.test.ts`, la prueba del contrato que rechaza los códigos viejos del
  entrenador) y si alguno se podría generalizar.

### Mapa 03 · Los maillots (`mapas/03-maillots.md`)

- **El dibujo de hoy**: `apps/web/src/components/Jersey.tsx` entero (`TORSO`, cada patrón, cada
  tamaño, `LeaderJersey` con sus marcas de forma, `ChampionMark`, `RiderJersey`) y `visuals.ts`
  (`JERSEY_COLORS`, `JERSEY_PATTERNS`, `jerseyStyle`, los retratos si los hay); `Flag.tsx`; dónde
  vive `WornJerseyIcon` (el contrato que `docs/retransmision.md` §7.9 le deja a E3); **todos los
  sitios donde se pinta un maillot y a qué tamaño** (cada `size=` con su línea), porque el
  vocabulario tiene que leerse al más pequeño.
- **La semilla**: `teams.jersey_seed` en `packages/db/src/schema.ts`, cómo se siembra al crear el
  mundo para los equipos de NPC, la ruta y la validación del cambio (`TeamManager.tsx` l. 21-26 y su
  ruta de la API), cuántos equipos tiene un mundo y en cuántas divisiones.
- **La distinguibilidad, medida**: genera un mundo (con `seedWorld` u otra vía del código, en
  `<scratchpad>/repo`) y saca la equipación de cada equipo con `jerseyStyle`. Con
  `<scratchpad>/venv/bin/python` (`colour-science`, Machado 2009 con severidad 1, en RGB lineal),
  calcula para los 14 colores de `JERSEY_COLORS` la matriz de ΔE00 en visión normal, protanopía,
  deuteranopía y tritanopía; cuenta los pares por debajo de 10 y de 20 en cada visión; y para los
  equipos de un mismo pelotón (una carrera real del calendario con su lista de equipos), cuántos
  pares de equipos son **indistinguibles** (mismo patrón y ΔE00 de su color base por debajo de 10)
  en cada visión. Haz lo mismo con el trío de los líderes (amarillo, verde, azul) y su marca de
  forma. Deja el script en `mapas/03-maillots-medida.py` y las cifras en el mapa.
- **Los títulos de campeón**: `ChampionTitle`, `WornJersey` y `Distinction` (`jerseys.ts`),
  `ChampionTitleSource` y `palmaresTitleSource` (`titles.ts`), `cast.ts` y `castIdentities.ts`, la
  regla de disciplina (crono contra línea) y de categoría, qué campeones existen en un mundo
  reiniciado y cuándo (`docs/retransmision.md` §7.4), y lo que E12 hará (el Mundial no existe en el
  calendario).
- **El dorsal del equipo líder** (`docs/navegacion.md` §7.4): dónde se pinta y dónde no.
- **Lo que piden los demás encargos del maillot**: E8 (el patrocinador: qué compra y qué pierde,
  `docs/encargos.md` l. 435-489, y G2.7 y G2.8 de `docs/epics.md`), E9 (el maillot como contenido de
  usuario y su moderación) y E12. Y la prohibición de `SPEC.md` §8, con su texto literal.
- **La marca de la UCI y la idea del dueño** (`00-encargo.md` §7.1): parte de los hechos que ya
  recoge ese apartado (no los rehagas) y, si puedes, encuentra el registro de la marca «Rainbow
  Stripes» en la OMPI o en la EUIPO (número, clases de productos, países), con su fuente; si no lo
  encuentras, dilo. Mide también, con la misma simulación, las variantes de bandas que propone el
  dueño (los cinco colores de la UCI en otro orden y en vertical, otra paleta, otro fondo) frente a
  las equipaciones de hoy: ¿cuántos maillots de equipo de un pelotón se confundirían con ellas?

### Mapa 04 · El corpus (`mapas/04-documentos.md`)

- **`docs/navegacion.md` entero**: los principios, la barra inferior del móvil, la regla de tablas,
  los maillots, y lo que E2 cambió en él.
- **`SPEC.md`** en lo que toca a la pantalla: §3.2 (estrellas, nunca números, y sus dos escalas),
  §3.4 (los ocultos), §8 (la identidad prohibida, literal) y cualquier otra promesa visual.
- **`docs/agenda.md`** en todas sus menciones a E3, D21 y el aspecto, y **`docs/encargos.md`** en E3
  y en las fronteras: E4 (el aviso al teléfono sobre la web instalable), E6 (dónde vive la
  explicación), E8 (el patrocinador), E9 (la moderación del maillot), E10 (el multiidioma: ¿qué
  pide al sistema visual, p. ej. textos más largos?), E11 (la regla de la frontera) y E12 (el
  Mundial y los campeones).
- **`docs/retransmision.md`**: las 37 líneas que nombran a E3, una por una, con lo que cada una deja
  o pide; más §6 (la pantalla `Watch`, lo permanente y lo eventual), §7.1 (el rótulo), §7.9, §18.5
  (el móvil medido), §18.8 (la accesibilidad) y §19.2. Y de
  `docs/diseno/e2-retransmision/implementacion.md`, lo que se construyó de verdad (pantallas, modos,
  el `digest`, `Report`), lo que se apartó del diseño, las medidas de móvil y lo que queda para E3.
- **`docs/entrenamiento.md`**: lo que el diseño del entrenamiento dice que el jugador tiene que
  entender del cuadro (bloques, sesiones, frescura, llegadas), para que E3 no contradiga su modelo.
- **Las palabras del dueño**: busca en `docs/balance.md` (18.027 líneas) y en los demás documentos
  todo lo que el dueño ha dicho del aspecto (colores, letra, «feo», legibilidad, tablas, el
  teléfono, los maillots, los iconos, la densidad, el modo oscuro, lo que le gustó). Cítalo
  **textual** con su línea y su versión, numerado `[DUEÑO 1]`, `[DUEÑO 2]`…; las afirmaciones de los
  documentos que obligan a E3, `[DOC 1]`, `[DOC 2]`…
- **Las contradicciones**: entre documentos, y entre documentos y código (p. ej. lo que el encargo
  da por roto y ya está arreglado), numeradas.

### Mapa 05 · Las pantallas de hoy, medidas, y la web instalable (`mapas/05-pantallas.md` y `capturas/`)

- **Levanta el juego en local**, en `<scratchpad>/repo` (ya compilado con `pnpm build`): una base de
  PGlite con todas las migraciones (mira `packages/db/src/testDb.ts`), un mundo sembrado como el del
  juego (`seedWorld` y lo que use el arranque de la API), unos cuantos días de calendario corridos
  para que haya resultados, clasificaciones y noticias (el tick o `runOneStage`, como hizo el paso
  10b de E2, `docs/diseno/e2-retransmision/implementacion.md` l. 293 y 687), y tres cuentas: un
  visitante sin sesión, un jugador con su corredor (con un plan de entrenamiento y alguna carrera en
  las próximas cuatro semanas, para que la lista de llegadas tenga filas, y una carrera fuera de su
  país, para que haya viaje) y un mánager con su equipo. La API sirve la web compilada
  (`apps/web/dist`). Guarda el script que lo levanta en `capturas/` (ver `00-encargo.md` §6, punto 7).
- **Las capturas**, con Playwright y el Chromium de `/opt/pw-browsers` (nunca `playwright
install`), de **cada ruta de `App.tsx`** que tenga contenido, a **360 × 800** (con
  `deviceScaleFactor` 2 y `isMobile`) y a **1.280 × 800**, de página entera. Las imprescindibles:
  `/me/training` (la escalera, el editor de días y la lista de llegadas), `/me/races` (el viaje),
  `/me/profile`, `/world/races/:id` (la carrera y sus clasificaciones), una etapa en `Watch` y en
  `Report`, `/world/rankings`, `/world/teams/:id`, `/team/squad`, `/team/calendar`,
  `/team/identity`, `/`, `/news`, y los estados de carga, error y vacío que se puedan provocar (sin
  red, una ruta inexistente, una lista vacía). Guárdalas en `capturas/` como PNG optimizados (el
  total del directorio por debajo de 8 MB: reduce a 1× la de escritorio si hace falta), con nombres
  `NN-ruta-360.png` y `NN-ruta-1280.png`, y un `capturas/README.md` con el índice.
- **Las medidas de cada captura**, en una tabla del mapa: el ancho del documento contra el de la
  ventana (`scrollWidth` frente a `innerWidth`: si hay desbordamiento horizontal y cuánto), el
  elemento más ancho, el tamaño de letra más pequeño que se pinta, los objetivos táctiles por debajo
  de 44 × 44 px, las tablas que obligan a desplazarse en horizontal, y, si puedes inyectar `axe-core`
  (instálalo en el scratchpad, no en el repositorio), los fallos de contraste.
- **La primera pintura en un teléfono simulado**: con el protocolo de Chromium (CDP), red de 4G lenta
  y CPU ralentizada ×4, la primera pintura con contenido y la mayor, y los bytes transferidos, en
  `/`, `/me/training` y una etapa; dilo como medida simulada, no como medida de un teléfono.
- **Sin red**: qué enseña la web si la red cae a mitad de uso (Playwright `setOffline`) y al recargar.
- **La web instalable hoy, en el mundo**: con búsqueda web y sus fuentes con fecha de consulta, el
  estado en octubre de 2026 de instalar una web en la pantalla de inicio en Android (Chrome) y en
  iPhone (Safari), lo que exige cada uno (manifiesto, iconos, service worker), las notificaciones
  web en iPhone desde iOS 16.4 y lo que cambió después, y lo que pasa en la Unión Europea. Si no
  puedes confirmar algo, dilo.

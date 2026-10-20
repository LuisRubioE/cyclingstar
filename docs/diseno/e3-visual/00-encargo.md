# E3 · El sistema visual: encargo compartido para todos los agentes

Este fichero es el brief que lee TODO agente que participe en el diseño de E3, sea cartógrafo,
proponente, juez, redactor, refutador, corrector o auditor. Léelo entero antes de hacer nada.

## 1. Qué se encarga

El encargo E3 está en `docs/encargos.md` (sección «E3 · El sistema visual», l. 179-276). Léelo
entero y literal. Su porqué razonado está en `docs/agenda.md`: §4.12 (l. 439-444, accesibilidad y
móvil), §4.14 (l. 483-526, el rediseño gráfico y el norte de la televisión), §4.15.1 (l. 533-562, la
web instalable en lugar de la app nativa), §4.16.1 (l. 689-739, los maillots), §4.19 (l. 925-992, el
viaje), §4.20 (l. 994-1068, el techo del entrenador y la frontera de la API), §4.22.3 (l. 1232-1262,
el móvil como criterio de aceptación), §4.22.5 (l. 1290-1296, el material generable), la Oleada 1
(l. 1452-1471) y el apéndice A (l. 1558-1661, el cuadro de entrenamiento). Resumen operativo, que NO
sustituye a leer el original:

1. **El sistema visual**: tipografía, paleta, densidad, jerarquía, rejilla, componentes y estados.
   Cómo se ve una tabla de resultados, una ficha de corredor, un panel, un aviso, un botón
   deshabilitado, una carga y un error. Es una disciplina distinta de la arquitectura de información
   (dónde vive cada cosa, que es E6) y de la identidad de marca (el logotipo y el tono). Sin ella,
   cada pantalla nueva reinventa su aspecto y el juego se ve hecho a trozos aunque funcione.
2. **El teléfono es el dispositivo principal de consulta** (`docs/navegacion.md` §2, principio 3) y
   pasa de exigencia a **criterio de aceptación**: si no se juega bien en un teléfono, el documento
   no está terminado. Hoy hay pantallas que son tablas anchas. La decisión de no hacer app nativa
   (§4.15.1) lleva una **prueba** y no una defensa: cuando la analítica diga qué parte entra desde el
   móvil, si la web instalable no está a la altura se revisa lo de la app nativa.
3. **El daltonismo**: los equipos se distinguen por el color del maillot, que es el peor identificador
   posible para un daltónico, así que el patrón SVG paramétrico tiene que llevar **forma además de
   color**.
4. **Los maillots, tres encargos en uno y lo más visible del documento.** (a) **La señal de
   campeón**, nacional o mundial, que se lleva un año en todas las carreras de su disciplina (el de
   contrarreloj en las cronos y no en línea): reconocible de un vistazo y **que no sea el arcoíris**,
   porque `SPEC.md` §8 prohíbe imitar «el arcoíris del campeón del mundo». Es de las pocas decisiones
   de identidad que el jugador va a mirar mil veces. (b) **El maillot del equipo**: un editor y un
   vocabulario visual acotado (formas, franjas, colores) que dé maillots distinguibles entre sí y
   legibles a tamaño pequeño, que es el tamaño al que se ven. (c) Que ese vocabulario sirva también
   para **lo que un patrocinador compra** cuando E8 le venda sitio en la camiseta.
5. **La web instalable**, decisión ya tomada que este documento ejecuta: que el juego se pueda
   añadir a la pantalla de inicio y se comporte como una app (sin barra de navegador, con su icono,
   arrancando rápido y sin romperse cuando la red va mal). Es el requisito previo de la notificación
   de E4 en iPhone.
6. **El examen práctico obligatorio, el cuadro de entrenamiento**: una pantalla ya implementada, con
   un motor correcto debajo, que no se entiende. Tres defectos (apéndice A): la lista de llegadas no
   dice de qué carrera habla (`raceId: null` siempre) y repite una fila por etapa; las cinco
   etiquetas (`Rusty`, `Spot on`, `Fine`, `Loaded`, `Cooked`) no son una escala con dos extremos
   malos y el bueno en medio; y dos vocabularios (bloques arriba, sesiones abajo, unidos por
   `blockWeek()`) con una precedencia invisible (manda el día). Entran en el mismo examen **los dos
   defectos del viaje** (§4.19). Los cinco son de presentación y ninguno se arregla con más motor:
   eso es lo que el documento tiene que demostrar. El punto de la precedencia se solapa con E6: de
   E3 sale la solución visual y de E6 dónde vive la explicación.
7. **La regla transversal de la frontera: la API no puede mandar lo que la pantalla no enseña.**
   Cualquiera abre la pestaña de red, así que ocultar un dato en la interfaz no lo oculta. El caso
   que la motivó es el techo del entrenador (§4.20), pero la regla vale para todo lo que el diseño
   quiera mantener en la sombra, y este documento la fija.
8. **El material generable** (el consejo del creador de Footstar, §4.22.5): los maillots, los iconos
   y los elementos de interfaz se pueden generar, y eso cambia el presupuesto realista del encargo.

**Fichero final:** `docs/visual.md`. **Tamaño esperado:** mediano, de **3.000 a 4.000 líneas** (del
orden de `docs/entrenamiento.md`, 2.083, y muy por debajo de `docs/retransmision.md`, 13.712). Es el
diseño ÚNICO que se implementará después, por pasos: cada decisión tomada, cada componente y cada
estado definidos (con su aspecto, sus medidas y su texto de pantalla), cada constante y cada token
con su valor y su intención, y un final con el **plan de implementación por PR, con sus tests antes
que su código**, como el §17 de `docs/retransmision.md`, y una **sección de decisiones del dueño**
como su §20: cada decisión que le toca, con su valor por defecto razonado y lo que cambia si elige
otra cosa. El dueño suele aceptar los valores por defecto, así que tienen que ser buenos. **Quien lo
implemente será un agente que no tiene a quién preguntar**, y el texto se escribe contando con eso.

**Regla de arranque de `docs/encargos.md`: aquí todavía NO se toca código.** Nadie modifica ficheros
fuera de `docs/diseno/e3-visual/` y `docs/visual.md`. Se puede ejecutar código en el scratchpad para
medir o para las capturas (copiar módulos, compilar, levantar la API, correr simulaciones), nunca
editarlo en el repositorio.

## 2. Lo que ha cambiado desde que se escribió el encargo

El encargo es anterior a E2 y a dos arreglos. Comprobado el 20 de octubre de 2026 sobre `58c14da`
(`main`); **diseña sobre esta tabla y no sobre la letra del encargo**, y si encuentras otra
afirmación del encargo que el código desmiente, dilo con la línea.

| Lo que dice el encargo                                                       | Lo que hay hoy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| E2 va «emparejado» con E3                                                    | E2 está **implementado y en producción desde el 10 de octubre de 2026**, motor v91. Hay pantallas nuevas: `Watch` (`apps/web/src/pages/StageWatch.tsx`, 1.144 l.) con sus modos (`Highlights`), el resumen (`digest`, en `WatchBlocks.tsx` y `broadcast/PlayerControls.tsx`) y `Report` (`StageReport.tsx`). El registro de cada paso está en `docs/diseno/e2-retransmision/implementacion.md`. `docs/retransmision.md` nombra a E3 unas 37 veces (44 apariciones de «E3»): recoge todo lo que E2 le dejó, sobre todo §7.9 («Lo que E2 pide a E3 y E12»), §6 (la pantalla `Watch`), §7.1 (el rótulo), §18.5 (el móvil), §18.8 (la accesibilidad) y §19.2 (las fronteras) |
| El maillot de campeón «hoy no existe»                                        | Existe su parte de datos: `ChampionTitle`, `WornJersey` y `Distinction` en `packages/shared/src/jerseys.ts` (l. 158-208), `ChampionTitleSource` y `palmaresTitleSource` en `packages/db/src/titles.ts` (l. 32 y 55), el reparto en `packages/db/src/cast.ts`, y un **`ChampionMark` provisional** en `apps/web/src/components/Jersey.tsx` (l. 135). Falta la señal visual definitiva, que es de E3 (`docs/retransmision.md` §7.4, decisión 7-h, y §7.9)                                                                                                                                                                                                                  |
| «El mánager no elige nada» del maillot                                       | Elige entre **12 semillas candidatas** (la actual y 11 derivadas del id del equipo, `apps/web/src/components/TeamManager.tsx` l. 21-26). El maillot procedural tiene ya **cinco patrones** (`solid`, `band`, `stripes`, `panels`, `shoulders`) y **14 colores** (`apps/web/src/components/visuals.ts`, `JERSEY_COLORS` y `JERSEY_PATTERNS`), sorteados por la semilla. No hay editor ni vocabulario acotado: se elige entre sorteos                                                                                                                                                                                                                                      |
| El viaje: el plan solo enseña la ida y `MyRaces` anuncia el precio por tramo | **Arreglado el 26 de septiembre de 2026** (`docs/agenda.md` §4.19, «Arreglado»): `getRiderTravelDays` deduce también la vuelta (`packages/db/src/riderSchedule.ts` l. 163-219, con `returnTravelDaysFor`) y `travelDaysLabel` anuncia ida y vuelta, `2 travel days (1 out, 1 back)` (`apps/web/src/domain/labels.ts` l. 157-161; `MyRaces.tsx` l. 206 y 250-254). Lo que queda para el examen es cómo se VE el viaje en el plan y en la lista de carreras, no el dato                                                                                                                                                                                                    |
| El techo del entrenador cruza la frontera como `tres`, `cuatro`, `cinco`     | **Implementado en octubre de 2026** (`docs/agenda.md` §4.20, «Estado»): `ceilingOpinionSchema` es ahora `z.enum(CEILING_OPINIONS)`, nueve códigos de frase (`packages/shared/src/contracts.ts` l. 115-126). La regla general de la frontera sigue sin fijar y es de E3                                                                                                                                                                                                                                                                                                                                                                                                   |
| `raceId: null` siempre en la lista de llegadas                               | **Sigue**: `apps/api/src/routes/riders.ts` l. 477, `return { gameDay: d, raceId: null, tsb, label: arrivalLabel(tsb) }`. Y la misma línea manda el `tsb` en número, que la pantalla no enseña: un candidato a la regla de la frontera que hay que comprobar                                                                                                                                                                                                                                                                                                                                                                                                              |
| Las cinco etiquetas sueltas y la precedencia escondida                       | **Siguen**: `ARRIVAL_LABEL` y la lista `Day N · You'll arrive:` en `apps/web/src/components/PlanLadder.tsx` (l. 63-69 y 240-255); `MODE_WHY`, el texto de la precedencia, en el panel de arriba (l. 56-61, pintado en l. 145)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| «La configuración de Tailwind»                                               | Es **Tailwind v4** (`tailwindcss` y `@tailwindcss/vite` 4.3.3, `apps/web/package.json`) y se configura en CSS: `apps/web/src/index.css` (17 líneas) con un bloque `@theme` de seis colores de marca y el fondo del `body`. **No hay `tailwind.config`**                                                                                                                                                                                                                                                                                                                                                                                                                  |
| La web instalable                                                            | **No hay nada**: `apps/web/public/` solo tiene `favicon.svg`; no hay manifiesto, ni service worker, ni iconos de pantalla de inicio, ni `theme-color` (`apps/web/index.html`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## 3. Qué leer del repositorio (mínimo del encargo, ampliado)

- **Web**: `apps/web/src/components/` entero (con `broadcast/`), `apps/web/src/pages/` entero,
  `apps/web/src/index.css`, `vite.config.ts`, `index.html`, `public/`, `App.tsx`, `main.tsx`,
  `queryClient.ts`, y de `apps/web/src/domain/` lo que pinta texto o estado: `labels.ts`,
  `format.ts`, `nav.ts`, `trainingPlan.ts`, `condition.ts`, `coachOpinion.ts`, `dashboard.ts`,
  `broadcast/`.
- **Contrato y maillots**: `packages/shared/src/jerseys.ts`, `contracts.ts` (para la frontera),
  `travel.ts`, `countries.ts`, `broadcast/screenWords.ts`; `packages/db/src/titles.ts`, `cast.ts`,
  `castIdentities.ts`, `riderSchedule.ts`, `train.ts`, y en `schema.ts` las tablas `teams`
  (`jersey_seed`) y `palmares`.
- **API**: `apps/api/src/routes/riders.ts` (la vista previa del plan), las rutas de equipo (el cambio
  de `jerseySeed`), `apps/api/src/app.ts` (estáticos, cabeceras y caché) y `spaShell.ts` (lo que se
  inyecta en el HTML), que es donde vive la web instalable.
- **Motor**: `packages/engine/src/training/projection.ts` (`arrivalLabel`) y `coachView.ts`.
- **Documentos**: `docs/navegacion.md` entero; `SPEC.md` §3.2 (estrellas, nunca números) y §8 (la
  identidad visual prohibida); `docs/agenda.md` en las secciones de §1; `docs/encargos.md` (E3 y sus
  fronteras: E4 l. 298, E6, E8 l. 468, E9, E10, E11 l. 619 y E12); `docs/retransmision.md` en lo que
  nombra a E3; `docs/diseno/e2-retransmision/implementacion.md`; `docs/entrenamiento.md` (lo que el
  cuadro tiene que comunicar); `docs/balance.md` (todo lo que ha dicho el dueño del aspecto, del
  teléfono, de las tablas y de los maillots); `Claude.md` (convenciones).
- **Los cinco mapas de `mapas/`**, en cuanto existan. Son la base de hechos: no repitas su lectura
  del código salvo para comprobar algo dudoso, y si el mapa se equivoca, dilo con la línea.

## 4. E3 hay que mirarlo, no solo leerlo

- **Las capturas** de las pantallas de hoy, a 360 px de ancho y en escritorio (1.280 px), viven en
  `capturas/` con su índice (`capturas/README.md`) y sus medidas (desbordamiento horizontal, letra
  más pequeña, objetivos táctiles). Las hace el mapa 05 con el Chromium preinstalado (Playwright,
  `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`; **nunca** `playwright install`), contra la API local
  con un mundo de PGlite y la web compilada, como el paso 10b de E2. Cualquier agente puede abrirlas
  con su herramienta de lectura de imágenes, y debe hacerlo antes de opinar de una pantalla.
- **El daltonismo se comprueba con una simulación, no a ojo.** En el scratchpad hay un entorno de
  Python con `colour-science` 0.4.7 y `colorspacious` (`<scratchpad>/venv/bin/python`): la
  simulación de Machado, Oliveira y Fernandes (2009) para protanopía, deuteranopía y tritanopía
  (severidad 1), aplicada en RGB lineal, y la distancia CIEDE2000 (ΔE00) entre colores simulados.
  Toda afirmación de que dos colores «se distinguen» lleva su ΔE00 medido en las cuatro visiones, y
  todo contraste de texto su razón WCAG 2.x medida.
- **Las decisiones que son de gusto** (la paleta, la tipografía, la señal de campeón y el vocabulario
  del maillot del equipo) se le enseñan al dueño en una **página visual con las opciones lado a
  lado** (`opciones/`), con su simulación de daltonismo calculada, para que decida mirando y no
  leyendo. El documento escribe el valor por defecto y la página las alternativas.

El scratchpad es `/tmp/claude-0/-home-user-cyclingstar/47687d53-4f57-510b-bd22-ec77a69f1ecc/scratchpad`.
Dentro, `repo/` es un clon de `58c14da` con las dependencias instaladas (`pnpm install
--frozen-lockfile`): úsalo para compilar, levantar la API o correr tests sin tocar el repositorio.
Cada agente trabaja en su propio subdirectorio del scratchpad (`<scratchpad>/<tu-rol>/`).

## 5. El método (el de `docs/diseno/README.md`, ejecutado en `docs/diseno/e2-retransmision/`)

E3 es mediano, así que el número de agentes se escala, pero no se salta ninguna fase. Los agentes
trabajan como mucho de dos en dos.

| Fase                      | Quién                                        | Salida                                                                   | Modelo en E2                     |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------- |
| 0. Mapas                  | 5 cartógrafos                                | `mapas/01..05-*.md` (200 a 350 l. cada uno) y `capturas/`                | `e2-retransmision/mapas/`        |
| 1. Propuestas             | 4 proponentes independientes                 | `propuestas/<lente>.md` (500 a 700 l.)                                   | `e2-retransmision/propuestas/`   |
| 2. Juicios                | 3 jueces con focos distintos                 | `juicios/<foco>.md` y `.json`, y el arquitecto `juicios/veredicto.json`  | `e2-retransmision/juicios/`      |
| 3. Síntesis               | 1 arquitecto, 3 redactores por lote          | `borrador/00-esqueleto.md`, glosario, decisiones, `borrador/NN-*.md`, v0 | `e2-retransmision/borrador/`     |
| 3b. Opciones              | 1 agente                                     | `opciones/index.html` y sus medidas                                      | (nuevo en E3)                    |
| 4. Refutación             | 4 refutadores adversarios                    | `refutaciones/hallazgos-*.json`                                          | `e2-retransmision/refutaciones/` |
| 5. Corrección             | 3 correctores, uno por lote                  | secciones corregidas y `refutaciones/correcciones-*.json`                | idem                             |
| 6. Coherencia y auditoría | 1 pasada de coherencia, 3 auditores y cierre | `refutaciones/auditorias-*.json`, `resultado-final.json`, cabecera       | idem                             |
| 7. Ensamblado             | el orquestador                               | `docs/visual.md`                                                         | `docs/retransmision.md`          |

**Los cinco mapas**, para que cada agente sepa dónde está cada hecho:

1. `mapas/01-web.md` · **La web por dentro**: componentes, páginas y rutas; Tailwind v4 y su
   `@theme`; el recuento de lo que se usa (colores, tamaños de letra, pesos, espaciados, radios,
   sombras, anchos); las primitivas que ya existen y las que cada página reinventa; cómo se pinta hoy
   cada estado (carga, error, vacío, deshabilitado, aviso) y dónde; las tablas; los iconos; el foco y
   el ARIA; el peso de la web; y los tests que fijan el marcado de hoy.
2. `mapas/02-examen.md` · **El examen práctico y la frontera**: el cuadro de entrenamiento entero
   (bloques, días, llegadas, modos), la cadena de precedencia de `train.ts`, `blockWeek`, la
   proyección, el viaje en el plan y en `MyRaces`, el entrenador, y el inventario de lo que la API
   manda y la pantalla no enseña. Cada afirmación del encargo, comprobada con su línea.
3. `mapas/03-maillots.md` · **Los maillots**: el dibujo de hoy (`Jersey`, `LeaderJersey`,
   `ChampionMark`, `RiderJersey`, `Flag`), la semilla y las candidatas, los tamaños a los que se ven,
   el dorsal del equipo líder, los títulos de campeón y sus reglas de disciplina, lo que piden E8
   (patrocinador), E9 (moderación) y E12 (el Mundial), y **la distinguibilidad medida** de las
   equipaciones de un mundo real en las cuatro visiones.
4. `mapas/04-documentos.md` · **El corpus**: `docs/navegacion.md`, `SPEC.md`, `docs/agenda.md`,
   `docs/encargos.md`, `docs/retransmision.md` (lo que deja a E3), `implementacion.md`,
   `docs/entrenamiento.md` y las palabras del dueño en `docs/balance.md`, con `[DUEÑO n]` y `[DOC n]`
   numerados y las contradicciones entre documentos y entre documentos y código.
5. `mapas/05-pantallas.md` · **Las pantallas de hoy, medidas, y la web instalable**: las capturas a
   360 y 1.280 px de cada ruta (sobre todo el cuadro de entrenamiento, el viaje y las tablas anchas)
   con sus medidas; la primera pintura y el peso por la red con red y CPU de teléfono simuladas; qué
   pasa sin red; y el estado de la web instalable en Android y en iPhone en octubre de 2026, con sus
   fuentes.

## 6. Reglas de escritura, para todos

1. **Castellano**, en el registro de `docs/retransmision.md` y `docs/generador.md`: preciso, sin
   relleno, sin marketing. La interfaz de usuario va en INGLÉS (regla de `Claude.md`); los textos de
   pantalla que se propongan se escriben en inglés y se etiquetan como tales («(pantalla)»).
2. **Toda afirmación sobre el código cita fichero y líneas** (`apps/web/src/components/PlanLadder.tsx`
   l. 240-255). Toda cifra dice si es **medida** (y cómo: captura, script, simulación) o
   **estimada**. Si no lo sabes, escribe «no lo sé» o «no está en el código»; inventar es el peor
   fallo posible.
3. **Nada de rayas ni guiones en medio de una frase** (ni «—» ni «–» ni « - »). Se usan comas,
   paréntesis, dos puntos o punto y seguido. Solo se admite un guion en un título del tipo
   «Título - Subtítulo». Si un texto literal del código lleva una raya (hay textos de pantalla que
   la llevan, como `MODE_WHY`), se cita en un bloque de código o se resume sin ella.
4. **Valores concretos, no adjetivos.** Un color es un hexadecimal con su contraste medido contra su
   fondo; un tamaño es una cifra en px o rem; un token tiene nombre y valor; un componente tiene sus
   estados enumerados con su aspecto; un texto de pantalla está escrito entero, en inglés.
5. Las reglas de `Claude.md` siguen valiendo: TypeScript estricto (prohibido `any`), Zod en los
   bordes, el motor puro, las constantes de juego en `packages/engine/src/constants.ts`, migraciones
   solo con drizzle-kit, y todo cambio de comportamiento del motor sube `ENGINE_VERSION` (E3 no
   debería tocar el motor; si una propuesta lo toca, lo dice y lo justifica). Dónde viven los tokens y
   las constantes visuales lo decide el diseño, con su motivo.
6. Cuando cites al dueño, cita **textual** y di de dónde (`docs/balance.md` l. NNN, versión vNN).
7. `prettier --check .` corre en el CI sobre todo `docs/` (`.github/workflows/ci.yml` l. 258) y
   `eslint .` sobre todo `.js` y `.mjs` (l. 252). No alinees tablas a mano: el orquestador pasa
   `prettier` antes de cada commit. Los scripts que se guarden en el rastro van como `.py` o `.sh`; si
   uno tiene que ser `.mjs`, declara sus globales (`/* global process, console */`) para que pase el
   lint.
8. **Informe final al orquestador: 12 líneas como máximo.** Qué fichero has escrito, cuántas líneas,
   las 3 a 5 cosas más importantes que has descubierto y lo que no has podido comprobar. El valor va
   en el fichero, no en el informe.
9. No edites ficheros de otros agentes salvo que tu rol lo diga. No hagas commits ni push: lo hace el
   orquestador.

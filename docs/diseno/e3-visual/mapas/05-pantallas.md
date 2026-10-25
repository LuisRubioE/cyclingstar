# Mapa 05 · Las pantallas de hoy, medidas, y la web instalable

**Commit**: `58c14da` (`main`), clonado en el scratchpad. **Fecha**: 20 de octubre de 2026. **Capturas**:
`../capturas/` (98 PNG, su índice y todas las medidas en `capturas/README.md`, `medidas.json` y
`pintura.json`, y los scripts que las regeneran). Se citan como «captura 01».

**Leídos enteros**: `00-encargo.md` (213 l.), `00-fase-mapas.md` (175), `apps/web/src/pages/Training.tsx`
(334), `components/PlanLadder.tsx` (263), `App.tsx` (365), `main.tsx` (32), `components/BottomNav.tsx`
(72), `WorldClock.tsx` (66), `ErrorBoundary.tsx` (66), `Panel.tsx` (53), `domain/nav.ts` (64),
`domain/dashboard.ts` (129), `apps/web/index.html` (19), `vite.config.ts` (20), `src/index.css` (17),
`packages/db/src/testDb.ts` (169), `tick.ts` (459), `raceEntry.ts` (154), `apps/api/src/index.ts`
(115), `env.ts` (126), `app.ts` (389), `security.ts` (131) y `.env.example` (58). **Por tramos**:
`Header.tsx`, `MyRaces.tsx`, `Home.tsx`, `TeamCalendar.tsx`, `Rankings.tsx`, `CreateRider.tsx`,
`queryClient.ts`, `broadcast/StageCards.tsx`, `routes/riders.ts`, `routes/teams.ts`, `spoiler.ts`,
`horizon.ts`, `calendarRun.ts`, `callups.ts`, `contracts.ts`, `riderSchedule.ts`, `teamControl.ts`,
`auth.ts` y `docs/diseno/e2-retransmision/implementacion.md` (l. 293, 687-707, 1145-1200).

## Resumen

1. **El juego se levantó entero en local** (§1): un mundo de producción de 3.902 corredores y 219
   equipos con 50 días corridos, un jugador agente libre con plan de bloques, seis días de carrera y
   cuatro de viaje en sus próximas cuatro semanas, un mánager de un equipo WorldTour, un visitante y
   una cuenta sin corredor. Cuatro cosas se escribieron con SQL porque el juego no las da a un mundo
   recién creado.
2. **Ninguna de las 45 pantallas desborda el documento a 360 px** (§2): las tablas caben porque
   juntan corredor y equipo en una celda de dos renglones. Pero **el calendario del equipo recorta su
   tabla** y su botón `Add` o `Drop` no se puede tocar en el teléfono (§5), y la barra inferior parte
   sus etiquetas cuando tiene cinco destinos (`Dashb…`, `My Ri…`, `My Te…`, §9).
3. **El examen práctico se ve tal como lo describe el encargo** (§3): seis filas de llegada
   (`You'll arrive:`) sin nombre de carrera, una por etapa de Race Sardegna, y en el editor el día de
   viaje nombra la carrera y el día de carrera no. Y hay un tercer vocabulario: la portada avisa
   `Your training queue is empty` a un jugador con su plan de bloques guardado.
4. **El viaje no se ve donde se decide** (§4): en `My races` las carreras convocadas no dicen su viaje;
   el precio sale en `Finances` y los días solo en el plan y en la pestaña de inscripción.
5. **El contraste falla en las 44 pantallas medidas** (§11): 2.816 nodos a 360 px según axe-core, tres
   de cada cuatro de `slate-400` (`#90a1b9`) sobre blanco (2,63:1). Y lo que axe no mide, medido a
   mano: las barras de título blancas sobre degradado (de 2,06:1 a 3,33:1) y la fecha del juego en la
   cabecera (1,14:1).
6. **Objetivos táctiles y letra** (§2): en `main`, casi todos los objetivos tienen un lado de menos de
   44 px (el más bajo mide de 13 a 20 px en 30 pantallas); la letra baja a 10 y 11 px en tablas y fichas
   y a 8 px en el perfil de `Watch`.
7. **Primera pintura simulada** (§12): con `Slow 4G` y la CPU a ×4, la primera pintura llega hacia los
   3,2 s y el contenido entre 4,7 y 5,7 s; por la red, de 283 a 369 KB, de ellos 92 KB de CSS en todas.
8. **Sin red la web no avisa** (§13), y **no hay nada de web instalable** (§14): ni manifiesto, ni
   iconos, ni service worker. En iPhone, desde iOS 26 cualquier web añadida a la pantalla de inicio se
   abre como app sin manifiesto; las notificaciones siguen pidiendo estar en la pantalla de inicio.

## §1 El banco de pruebas

| Pieza            | Cómo                                                                                                                                                                                                                                                                                                           | Dónde                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Base             | PGlite 0.5.4 con su socket y todas las migraciones, como `startTestDb` (`packages/db/src/testDb.ts` l. 58-109); una sola sesión a la vez (l. 16-19), así que cada fase cierra su conexión y la API va con `DB_POOL_MAX=1` (`client.ts` l. 24)                                                                  | `capturas/mundo.mjs`          |
| Mundo            | `runTick` con `forceDays: 0` crea el mundo y lo siembra con `seedWorld` (`tick.ts` l. 265) con `GENESIS_WORLD_SEED` (l. 70); luego 50 días con `timelineRecord: 'on'`: 849 s, 17 s por día (medido)                                                                                                            | `mundo.mjs`                   |
| Resultado        | 3.902 corredores, 219 equipos, 107 etapas corridas con su línea de `Watch`, 355 noticias; día 50 de la temporada 1 (medido con SQL al acabar)                                                                                                                                                                  | `capturas/README.md`          |
| Jugador          | José Quintáns, español, 18 años, agente libre; inscrito el día 0 por `POST /api/riders/me/race-entries/:raceId` (`routes/riders.ts` l. 775) a Murcia y Jaén (en casa) y a Var (Francia) y Sardegna (Italia, cinco etapas); las cuatro le convocan al congelarse la escuadra a 14 días (`calendarRun.ts` l. 72) | capturas 01 a 04, 17, 25 a 28 |
| Mánager          | Nathan Van Acker, belga, en Noord Cycling (WorldTour, Bélgica); premium y dueño desde el día 50 por `POST /api/teams/take-over` (`routes/teams.ts` l. 37)                                                                                                                                                      | capturas 14 a 16, 29, 30      |
| Visitante, nuevo | Sin sesión; y una cuenta con sesión y sin corredor                                                                                                                                                                                                                                                             | 18 (visitante); 34, 44, 45    |
| Servidor         | `buildApp` con better-auth, la web compilada y `BROADCAST_WATCH` y `SPOILER_MODE` en `on`, como en producción desde el 10 de octubre (`implementacion.md`, decisión 5)                                                                                                                                         | `servir.mjs`                  |

**Lo que se escribió con SQL**, y por qué: el correo confirmado (`auth.ts` exige verificarlo; los tests
hacen lo mismo, `apps/api/src/adminPanel.test.ts` l. 36); 400 de dinero al jugador, porque un corredor
nace con 0 (`schema.ts` l. 323) y un agente libre solo va a una carrera que puede pagarse
(`calendarRun.ts` l. 716), así que sin dinero no sale de su país; el contrato del corredor del
mánager, porque el mercado no hace ofertas por debajo de `MIN_RATING_FOR_OFFERS` = 0,42
(`contracts.ts` l. 75 y 148) y un corredor nuevo no llega; `premium`; y, al servir, el ancla del reloj.
**El velo de E2 está encendido**: el jugador y el mánager no han visto ninguna etapa y sus pantallas lo
dicen (`Results from N stages you haven't watched are hidden`) y dan sus puntos a 0 (capturas 04, 14).

## §2 Las medidas, en conjunto

Medidas con `capturas/medir.mjs` en Chromium 141 (Playwright 1.56.1), tras volver arriba del todo, en
45 pantallas por 2 anchos. La tabla de cada una está en `capturas/README.md`.

| Medida (a 360 px)                                | Resultado                                                                                                                                                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Documento más ancho que la ventana               | Ninguno: `scrollWidth` = 360 en las 45                                                                                                                                                                                                           |
| Tablas más anchas que su caja                    | 3: calendario del equipo (5 col., 460 px en 336, **recortada**), ranking de España (5 col., 429 en 336) y salón de la fama (7 col., 520 en 336), las dos con desplazamiento propio                                                               |
| Tiras de pestañas con desplazamiento             | La de segundo nivel de la cabecera (543 px en 360 en `My Rider`, 439 en `World`) y las de clasificación (384 en 336)                                                                                                                             |
| Letra más pequeña en `main`                      | 8 px (las cotas del perfil en `Watch`, capturas 08, 09, 35); 10 px en 04, 14, 15 y 25; 11 px en 02, 03, 11, 19, 24                                                                                                                               |
| Caracteres de `main` por debajo de 12 px         | 439 en el calendario del equipo, 386 en la inscripción, 246 en noticias; 0 en el plan de entrenamiento                                                                                                                                           |
| Objetivos de `main` con un lado por debajo de 44 | El 90 % o más en 30 de las 40 pantallas que tienen alguno; el más bajo mide de 13 px (`/me/orders`, `/account`) a 20 px (`/me/training`) en 30 de ellas. Ninguno en las listas de tarjetas (21, 22) ni en las dos portadas sin corredor (18, 44) |
| Lo más alto                                      | `/me/races?tab=enter` 19.914 px, `/world/teams` 17.025, `/world/races` 13.820, el acta 11.502, `/world/nations` 8.173, `/me/training` con los 28 días 6.807 (8,5 pantallas)                                                                      |

La barra inferior fija (`BottomNav.tsx` l. 44) usa 11 px (l. 54) y es la letra más pequeña de casi todas
las páginas a 360 px. Los objetivos se cuentan sin las excepciones de WCAG 2.5.8 (un enlace dentro de una
frase); axe-core, con ellas, solo da `target-size` en 11 y 24 (25 nodos).

## §3 El examen práctico a la vista (`/me/training`, capturas 01, 29, 40, 41 y 45)

**La escalera** (`PlanLadder.tsx` l. 125-219). A 360 px los cuatro bloques van uno debajo de otro (la
rejilla pasa a cuatro columnas en `lg`, l. 149), y lo que el plan hace empieza a 1.060 px de arriba, en
la segunda pantalla (medido sobre la captura). Cada bloque lleva su `select` sin nombre accesible
(l. 155-166; axe `select-name`, 4 nodos) y su `WEEK N` a 12 px en `slate-400` (2,63:1). El porqué del
modo (`MODE_WHY`, l. 56-61) va a 12 px bajo los tres botones de modo (l. 145).

**La lista de llegadas** (l. 227-259), a la vista: `1300 TSS over four weeks.` y seis filas.

```text
Day 52   You'll arrive: Loaded       (Race Var, la clásica en Francia)
Day 56   You'll arrive: Loaded       (etapa 1 de Race Sardegna)
Day 57   You'll arrive: Fine         (etapas 2 a 4)
Day 58   You'll arrive: Fine
Day 59   You'll arrive: Fine
Day 60   You'll arrive: Spot on      (etapa 5)
```

Lo que va entre paréntesis no está en la pantalla: no hay nombre de carrera (`raceId: null`,
`routes/riders.ts` l. 477), y Race Sardegna son cinco filas. Las cinco etiquetas son cinco pastillas de
color sin orden visible (`ARRIVAL_LABEL`, l. 63-69): ámbar, verde, gris, naranja y rosa; `Fine` es la
gris (`slate`), sin color de estado. En el mánager (captura 29), dos filas, `Day 59` y `Day 60`, que son
dos carreras de un día distintas (Race Opening Classic y Race Kuurne, según
`/api/riders/me/upcoming-races`) y que la pantalla tampoco nombra.

**El editor de días**, plegado por defecto (`Training.tsx` l. 181-190; la captura lo despliega). Tres
tipos de fila. El día de carrera, en ámbar, dice `🚴 Race day` y que no se entrena, **sin decir qué
carrera** (l. 201-213). El de viaje, en azul, sí: `On your way to Race Var (FR)` y
`Heading home from Race Sardegna (IT)` (l. 217-234), los días 51, 53, 55 y 61. El de entrenamiento
lleva dos `select`, los TSS y el efecto (l. 239-307). Lo que no dice ninguna fila: de qué bloque viene
cada día; la cabecera de semana (`Week N · days` con el primer y el último día, l. 195-198) no repite
el `Build` de la escalera, y nada distingue un día de bloque de uno escrito a mano. A 360 px la columna
del día mide 96 px (`w-24`, l. 207, 224 y 245), así que `✈️ Travel day` se parte en tres renglones; el
efecto va con 96 px de sangría (`pl-24`, l. 283) y le quedan unos 190 px; los TSS (`w-16 text-right`,
l. 279) quedan sueltos entre los `select` y el texto.

**Cinco botones distintos en la misma pantalla**: los tres de modo (blancos con anillo, l. 135-139),
`Save plan` en cian de marca (l. 210), `Publish my plan as the team plan` en `slate-800`
(`Training.tsx` l. 166), `Show the 28 days` como enlace (l. 186) y `Save day edits` en índigo
(`indigo-600`, `oklch(0.511 0.262 276.966)`, hacia `#4f39f6`), deshabilitado al 50 % (l. 322): un color
que no está en el `@theme` (el favicon usa otro índigo, `#4f46e5`).

**Un tercer vocabulario, fuera del cuadro**: la portada del mismo jugador (captura 17) le avisa de
`Your training queue is empty` con `Plan the week` (`dashboard.ts` l. 77-91), porque cuenta solo los
días escritos a mano (`Home.tsx` l. 277-281) y no el plan de bloques que tiene guardado.

**Los estados del cuadro**: cargando, el texto `Loading…` arriba a la izquierda (l. 123; captura 40);
con error, `Could not load your training plan.` en rojo y sin reintento (l. 124; captura 41); y **sin
corredor no hay estado vacío** (captura 45): la escalera entera, con `Leave it to the coach` en las
cuatro semanas, `Save plan` y el editor, mientras la vista previa responde 409 `sin_ciclista`
(`routes/riders.ts` l. 434) y la lista de llegadas no sale.

## §4 El viaje a la vista (capturas 01, 02, 03, 17 y 27)

| Dónde                           | Qué se ve del viaje                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El plan (01)                    | Las cuatro filas azules de viaje, con carrera y país, ida y vuelta (§3)                                                                                                                                 |
| `My races`, `Upcoming` (02)     | `On your programme`: `Race`, `Bib`, `Starts`, `Orders` (`MyRaces.tsx` l. 95-180). **Nada del viaje**: ni días, ni precio, ni que Var está en Francia salvo por la bandera                               |
| `My races`, bloque de inscritas | `travel 48 · 2 travel days (1 out, 1 back)` (l. 193-208, la etiqueta en l. 206); en este mundo no sale, porque las dos ya están convocadas                                                              |
| `Available to enter` (03)       | La columna `Travel`: `48` y debajo `2 travel days (1 out, 1 back)` (l. 246-254), partido en cinco renglones a 360 px; `Committed` dice `−0` en rosa cuando no hay nada pendiente (l. 306-308 y 323-327) |
| `Finances` (27)                 | Lo único que queda del precio tras la convocatoria: `Day 42 · Travel · Race Sardegna · travel · −80` y `Day 38 · … · −48`                                                                               |
| Portada (17)                    | `You race the Race Var in 2 days` (`dashboard.ts` l. 68, con el artículo delante del nombre) y `You have no orders set`; nada del viaje, que sale mañana (día 51)                                       |

## §5 Las tablas anchas (capturas 05 a 07, 10 a 15, 20, 21, 23, 24 y 36)

- **Cómo caben a 360 px**: la general, el ranking, las etapas y el acta tienen 3 o 4 columnas (puesto,
  bandera, corredor con su equipo debajo en `slate-400`, tiempo o puntos), y el nombre se parte en dos
  renglones; las filas cambian de alto según el nombre. Muestran 20 filas en la carrera y el acta
  (regla «top 20 y `Show all`», `docs/navegacion.md` §7.3), 100 en el ranking (11) y 219 tarjetas en
  `/world/teams` (21).
- **El calendario del equipo** (15) es la única tabla rota: 5 columnas (`Day`, `Race`, `Where`, `Travel`,
  `Plan`) en un `Panel` sin desplazamiento (`TeamCalendar.tsx` l. 196-197) que recorta lo que sobra
  (`overflow-hidden`, `Panel.tsx` l. 22). A 360 px `Travel` sale cortada (`336 · 2 travel · out,`) y
  `Plan`, con el botón `Add` o `Drop` (`TeamCalendar.tsx` l. 114), no se ve ni se alcanza.
- **Las que se desplazan bien**: el ranking de España (23, `Country.tsx` l. 47) y el salón de la fama
  (24, `HallOfFame.tsx` l. 91), con `overflow-x-auto`; a la vista, la columna `Type` cortada a media
  palabra (`All-rounde`) sin ninguna señal de que sigue.
- **Defectos a la vista**: en el ranking el nombre del equipo toca los puntos
  (`Northwind Cycling Team178`, `Rankings.tsx` l. 39 y 49: la celda de puntos no tiene margen
  izquierdo); en la plantilla (14) los nombres se cortan con puntos suspensivos a 360 px
  (`Josef Janse…`); el palmarés de la ficha (13) es una rejilla de cuatro columnas donde
  `Stage win · Stage 1` ocupa cuatro renglones y el lugar de llegada sale cortado.
- **En escritorio** la general mide 1.078 px con las mismas 3 columnas de datos: el nombre a la
  izquierda y el tiempo a la derecha, a más de 800 px (estimado sobre la captura), sin columnas de más
  (05 y 07).

## §6 `Watch` y `Report` (capturas 08, 09, 10, 35 y 36)

`Watch` a 360 px (08): la barra negra `158.0 km to go · Bunch together`, el perfil con la próxima subida,
el cuadro oscuro de la previa con `▶ Watch` (su nombre accesible es `Play`, `broadcast/StageCards.tsx`
l. 62-68) y la fila del grupo, que se corta (`1 BUNCH TOGETHER · 1…`). Las cotas del perfil (`1`, `2`)
se pintan a 8 px. Ocho segundos después de `Play` (09) se ven los dos grupos con quién tira, los
controles se esconden, y el comentario, una tarjeta de un renglón cortado con puntos suspensivos
(`The gap has grown by 9 seconds in five kilo…`), queda **medio tapado por la barra inferior**. En
escritorio la columna del reproductor mide 736 px de los 1.120 de contenido y el comentario va en una
burbuja a su derecha (medido en el DOM). `Report` (10) es la más alta de las pantallas de carrera
(11.502 px a 360). En todas las páginas del visitante, `/api/me/horizon` responde 401 (y
`/api/riders/me/race-prefs` en las de carrera): uno o dos errores en la consola por carga, apuntados en
`medidas.json`.

## §7 El maillot donde se ve (capturas 05, 12, 14 y 16)

Medido en el DOM a 360 px. `/team/identity` (16): dos dibujos grandes, de 72 y 96 px, y las 12 semillas
candidatas, dibujos de 34 px en botones de 44 × 44, cinco por fila; `Save changes` (127 × 36 px) en
índigo. En la general (05), los maillots de líder miden 15 × 15 px, al lado de banderas de 21 × 16; el
del equipo, 44 px en su ficha (12) y 40 en la plantilla (14). El mapa 03 da los tamaños del código; aquí
se ve que en la tabla el maillot es la figura más pequeña de la fila, menor que la bandera, y que va
entre la bandera y el nombre solo en las filas de los líderes.

## §8 La portada, las noticias y el resto (capturas 17 a 19, 25 a 28, 30 a 34)

- **Visitante** (18): `Race. Train. Rise.`, dos botones, y un panel `System status` con `Server`,
  `Engine version 91`, `Game day 50` y `Database ready` (`Home.tsx` l. 25-40 y 81).
- **Jugador** (17): `Free agent · GD 50 · Season 1 · next update in 4h…` (el único sitio del teléfono con
  el reloj del mundo, `Home.tsx` l. 324; §9), `While you were away` con sus botones, los avisos de §3 y
  §4, y `Condition` con estrellas y `Freshness 16 / 100` (`Home.tsx` l. 353-354): un número donde
  `SPEC.md` §3.2 (l. 66-68) dice estrellas.
- **Crear el corredor** (34): sigue en pantalla la línea de diagnóstico del país por IP (`CreateRider.tsx`
  l. 29-30 y 100-102; aquí `Your country: ES` y el proveedor de prueba).
- **Índigo y cian**: `Log in`, `Create account` de `/register`, `Create rider`, `Update email`,
  `Try again` y `Save changes` son índigo (`bg-indigo-600`, 21 usos en 17 ficheros de `apps/web/src`, por
  `grep`; blanco encima, 6,44:1); `Save plan`, el `Create account` de la portada, `Create your rider` y
  las barras de panel, cian de marca. Ningún índigo está en el `@theme` (`index.css` l. 5-12).

## §9 La cabecera y la barra inferior

| Pieza           | A 360 px                                                                                                                                          | A 1.280 px                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Logo y sesión   | El logo sin nombre (`Header.tsx` l. 118), `Account` o `Log in` y `Sign up` (dorado, l. 141-145: blanco sobre `#d99400`, 2,56:1)                   | Con `Cycling Star`                                               |
| Reloj del mundo | **No se ve** (`hidden md:block`, l. 122)                                                                                                          | `GD 50 · Season 1` en `slate-700` sobre el azul: 1,14:1 a 1,47:1 |
| Nivel 1         | Oculto (l. 157-171); lo sustituye la barra inferior                                                                                               | Fila de secciones                                                |
| Nivel 2         | Tira desplazable sin indicio: en `My Rider` quedan fuera `Contract` y `Finances`; en `World`, `Hall of Fame` cortado                              | Entera                                                           |
| Barra inferior  | 3, 4 o 5 destinos (`nav.ts` l. 51-64); con 5 (mánager o corredor de equipo) se cortan a `Dashb…`, `My Ri…`, `My Te…` (`BottomNav.tsx` l. 54 y 59) | No existe (`sm:hidden`, l. 44)                                   |

## §10 Los estados (capturas 40 a 47)

| Estado                   | Lo que se ve                                                                                                                                                    | Código                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Cargando                 | `Loading…` a 16 px en `slate-500`, arriba a la izquierda; ningún esqueleto (el `Suspense` de la web dice lo mismo)                                              | `Training.tsx` l. 123; `App.tsx` l. 159        |
| Error de una consulta    | Una frase roja, `Could not load …` (25 en la web), sin botón de reintento; 4,14:1 sobre el fondo                                                                | p. ej. `Rankings.tsx` l. 131                   |
| Corredor que no existe   | `Could not load the rider.`: el 404 se lee como un error                                                                                                        | `RiderProfile.tsx` l. 406                      |
| Ruta que no existe       | `Page not found` con `Dashboard` y `Races`                                                                                                                      | `App.tsx` l. 128-145                           |
| Vacío                    | El agente libre en `/team/squad` (43): caja de borde discontinuo con el porqué y el enlace a su contrato; la portada sin corredor (44), con `Create your rider` | capturas 43 y 44                               |
| Error de render o de red | La barrera de toda la web, sin cabecera ni barra (§13)                                                                                                          | `main.tsx` l. 22; `ErrorBoundary.tsx` l. 33-66 |

## §11 El contraste, medido

axe-core 4.10.3 (WCAG 2.x AA, 4,5:1 para texto normal) en 44 pantallas por ancho (sin la 09, que se
mueve): 2.816 nodos a 360 px y 3.619 a 1.280, en todas. axe no mide el texto sobre degradado; esas
parejas van calculadas con la fórmula de WCAG sobre los colores que da el navegador (columna «a mano»).

| Texto sobre fondo                                                       | Razón                                 | Dónde                                                         | Nodos a 360 (pantallas) |
| ----------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------- | ----------------------- |
| `slate-400` `#90a1b9` sobre blanco                                      | 2,63:1                                | equipos de las tablas, etiquetas `WEEK N`, cabeceras de tabla | 2.096 (29)              |
| blanco sobre `brand-cyan` `#1499bb`                                     | 3,33:1                                | botones cian (`Save plan`, `Enter`)                           | 212 (9)                 |
| `slate-400` sobre el fondo `#e8edf2`                                    | 2,23:1                                | el pie, los textos sueltos                                    | 210 (44)                |
| `slate-500` `#62748e` sobre el fondo                                    | 4,04:1                                | las entradillas (`Pick your month…`)                          | 60 (32)                 |
| blanco sobre `brand-gold` `#d99400`                                     | 2,56:1                                | `Sign up`                                                     | 23 (23)                 |
| `brand-cyan` sobre blanco y sobre el fondo                              | 3,33 y 2,82:1                         | enlaces y pestañas activas                                    | 27 (18)                 |
| blanco sobre el degradado cian (`Panel.tsx` l. 25-26)                   | 3,33 a 2,22:1, a mano                 | los títulos de panel, 14 px                                   | no los mide axe         |
| blanco sobre el degradado dorado (`Panel.tsx` l. 37-39)                 | 2,57 a 2,06:1, a mano                 | el título de cada página, 18 px                               | no los mide axe         |
| `slate-700` y `slate-500` sobre la cabecera (`WorldClock.tsx` l. 60-62) | 1,14 a 1,47:1 y 2,47 a 3,20:1, a mano | el reloj del mundo a 1.280 px                                 | no los mide axe         |

Otros fallos de axe: `dlitem` (40 nodos) y `definition-list` en las fichas (04, 13), `select-name` en el
plan (01, 29, 45), `aria-prohibited-attr` (10) en la ficha propia y `link-in-text-block` (1).

## §12 La primera pintura, simulada

Chromium sin cabeza, 360 × 800, relación 2, caché vacía, CPU a ×4 por CDP y los perfiles de red de
DevTools: `Slow 4G` (562,5 ms y 1,44 Mbit/s) y `Fast 4G` (165 ms y 8,1 Mbit/s), como el paso 10b de E2
(`implementacion.md` l. 1145 y 1159). Mediana de tres cargas. **Es una simulación, no un teléfono.**

| Página                                                           | Perfil  | Primera pintura | Lista  | Peticiones | Por la red | JS · CSS · API              |
| ---------------------------------------------------------------- | ------- | --------------- | ------ | ---------- | ---------- | --------------------------- |
| portada del jugador (`/`)                                        | Slow 4G | 3,23 s          | 5,70 s | 37         | 346 KB     | 190 · 92 · 62               |
| portada del jugador (`/`)                                        | Fast 4G | 1,20 s          | 2,01 s | 37         | 346 KB     | 190 · 92 · 62               |
| portada del visitante (`/`)                                      | Slow 4G | 3,13 s          | 4,88 s | 26         | 286 KB     | 190 · 92 · 2                |
| portada del visitante (`/`)                                      | Fast 4G | 1,17 s          | 1,70 s | 26         | 286 KB     | 190 · 92 · 2                |
| plan de entrenamiento (`/me/training`)                           | Slow 4G | 3,28 s          | 5,22 s | 25         | 283 KB     | 176 · 92 · 13               |
| plan de entrenamiento (`/me/training`)                           | Fast 4G | 1,26 s          | 2,10 s | 25         | 283 KB     | 176 · 92 · 13               |
| etapa (Watch, visitante) (`/world/races/race-valencia/stages/3`) | Slow 4G | 3,28 s          | 4,75 s | 34         | 369 KB     | 242 · 92 · 17 (y 16 de SVG) |
| etapa (Watch, visitante) (`/world/races/race-valencia/stages/3`) | Fast 4G | 1,20 s          | 1,64 s | 34         | 369 KB     | 242 · 92 · 17 (y 16 de SVG) |

La mayor pintura (LCP) coincide con la primera en las ocho porque el elemento mayor es el párrafo del
pie (`App.tsx` l. 353-359), que se pinta con la cabecera; la cifra útil es «lista» (`main` sin
`Loading…`). Los 92 KB de CSS van en todas las páginas (la hoja entera, con `flag-icons`, `main.tsx`
l. 9: 466 KB sin comprimir en `dist`), y nada se pinta hasta que arranca el JavaScript: el HTML trae el
`<div id="root">` vacío (`index.html` l. 16).

## §13 Sin red

Con la sesión del jugador y `context.setOffline(true)` a mitad de uso (capturas 48 a 51):

| Caso                                                         | Lo que se ve                                                                                                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un enlace a una página cuyo JavaScript no se ha cargado (48) | Toda la web cambia por la barrera de error: `Something went wrong`, el error técnico `Failed to fetch dynamically imported module: …/News-….js` y `Try again`                                 |
| Volver a una página visitada (50)                            | La página, de la caché de React Query, sin aviso de que no hay red                                                                                                                            |
| Trozo cargado y datos sin pedir (51)                         | `Loading…` sin fin: React Query no lanza consultas sin red (`networkMode` por defecto `online`, `@tanstack/query-core` 5.101.4, `retryer.js` l. 11; `queryClient.ts` l. 375-392 no lo cambia) |
| Recargar (49)                                                | `net::ERR_INTERNET_DISCONNECTED`, la página de error del navegador: no hay service worker que sirva la web                                                                                    |

## §14 La web instalable

**En el repositorio, nada**: `apps/web/public/` solo tiene `favicon.svg` (336 bytes, un cuadro índigo
`#4f46e5` con una rueda y una estrella); `index.html` (l. 1-19) no enlaza manifiesto ni declara
`theme-color` ni `apple-touch-icon`; `main.tsx` no registra service worker; y `vite.config.ts` (l. 1-20)
no tiene plugin de PWA. La API sirve `index.html` como `no-cache` y `assets/` un año como inmutables
(`app.ts` l. 135-144), lo que un service worker aprovecharía.

**En el mundo, el 20 de octubre de 2026** (consultadas ese día):

| Plataforma             | Qué hay                                                                                                                                                                                                                                                                                                                               | Fuente                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chrome, requisitos     | HTTPS (o `localhost`) y un manifiesto con `name` o `short_name`, iconos de 192 y 512 px, `start_url`, `display` (o `display_override`) y sin `prefer_related_applications`; el service worker no es requisito                                                                                                                         | MDN, «Making PWAs installable», modificada el 6-10-2026, https://developer.mozilla.org/en-US/docs/Web/Progressive_Web_Apps/Guides/Making_PWAs_installable                                                                                                                                                          |
| Chrome, el aviso       | Para lanzar `beforeinstallprompt` y su promoción pide además un toque en la página y 30 s de uso; desde Chrome 108 en móvil se instala desde el menú sin `fetch` en el service worker, y en 2023 el aviso automático aún lo pedía                                                                                                     | https://web.dev/articles/install-criteria (19-9-2024); https://developer.chrome.com/blog/update-install-criteria (5-12-2023)                                                                                                                                                                                       |
| Android                | Solo Chrome con los servicios de Google y Samsung Internet instalan como WebAPK, con entrada propia en el cajón de apps; los demás navegadores dejan un acceso directo con su insignia. Chrome revisa el manifiesto al abrir la app si hace más de 24 h                                                                               | MDN (ídem); https://web.dev/articles/manifest-updates (19-9-2024)                                                                                                                                                                                                                                                  |
| iPhone, instalar       | Desde iOS 16.4, desde el menú Compartir de Safari, Chrome, Edge, Firefox y Orion; sin `beforeinstallprompt`. Desde iOS 26, toda web añadida a la pantalla de inicio se abre como app por defecto, sin manifiesto («zero requirements for installability»); si hay iconos en el manifiesto, se usan                                    | MDN (ídem); WebKit, «WebKit Features in Safari 26.0», 15-9-2025, https://webkit.org/blog/17333/webkit-features-in-safari-26-0/                                                                                                                                                                                     |
| iPhone, notificaciones | Desde iOS 16.4, solo para la web añadida a la pantalla de inicio y con el permiso pedido tras un gesto del usuario (Push API, Notifications API y service worker; también el Badging API). Desde iOS 18.4, Declarative Web Push para esas mismas webs, sin service worker. Safari 27.0 (17-9-2026) no cambia nada de esto en lo leído | https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (16-2-2023); https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ (31-3-2025); https://webkit.org/blog/18325/webkit-features-for-safari-27-0/                                                                                      |
| Unión Europea          | Apple quitó las apps de pantalla de inicio en la beta de iOS 17.4 y lo deshizo el 1-3-2024: siguen, «built directly on WebKit». Apple anunció para iOS 18.2 una API, solo en la UE, para que un navegador con motor propio cree esas apps; a 18-6-2026 ningún navegador con Blink o Gecko se había publicado en iOS                   | TechCrunch, 1-3-2024, https://techcrunch.com/2024/03/01/apple-reverses-decision-about-blocking-web-apps-on-iphones-in-the-eu/; MacRumors, 24-10-2024, https://www.macrumors.com/2024/10/24/ios-18-2-eu-third-party-browser-web-apps/; GIGAZINE, 18-6-2026, https://gigazine.net/gsc_news/en/20260618-blink-on-ios/ |

Para Cycling Star, hoy, deducido de esas fuentes y sin probarlo en un dispositivo: en Android, Chrome no
puede instalarla (falta el manifiesto entero) y «Añadir a pantalla de inicio» deja un acceso directo que
abre el navegador; en iPhone con iOS 26 o posterior, «Añadir a pantalla de inicio» ya la abre como app,
sin barra, con un icono que no es suyo (no hay `apple-touch-icon` ni iconos de manifiesto); antes de iOS
26, sin la etiqueta `meta` ni el `display` del manifiesto, se abría en el navegador (WebKit, Safari 26.0,
la misma entrada).

## Lo que este mapa no ha podido comprobar

1. **Un teléfono de verdad**, Safari y Firefox: todo es Chromium sin cabeza con el tamaño, la relación de
   píxeles, la CPU y la red emulados, contra la API en la misma máquina.
2. **La web instalable en un dispositivo**: ni la instalación en Android ni en iPhone; lo de §14 sale de
   las fuentes, no de una prueba. No he confirmado si en iOS 26 o 27 las notificaciones funcionan sin
   manifiesto, ni si algún navegador ha usado en la UE la API de iOS 18.2, ni cambios de los criterios de
   Chrome posteriores a 2024 (no los he encontrado).
3. **Producción**: el mundo es de 50 días y de cuatro cuentas; un mundo con meses de carreras, muchos
   jugadores y equipos humanos hará listas y tablas más largas. El velo encendido esconde resultados al
   jugador y al mánager (§1): sus tablas con datos de verdad son las del visitante.
4. **El contraste completo**: axe no evalúa el texto sobre degradado ni sobre imagen; los cálculos a mano
   cubren las barras y la cabecera, no cada texto.
5. **Por qué `/api/me/horizon` del visitante no llega a darse por terminada en Playwright** (la página
   nunca queda en `networkidle`); con `curl` responde 401 en 3 ms.
6. **Lo que no se capturó**: `/privacy`, `/forgot-password`, `/reset-password`, `/verify-email`, `/admin`
   y `/admin/names`, y las pestañas `Stages`, `Route`, `Startlist` y `Roll of honour` de la carrera.

# Propuesta de navegación e arquitectura de información

Estado: **v3, implementada y desplegada.** La v2 incorporó la primera ronda de comentarios del
dueño; la v3 corrige lo que el uso real desmintió (§3.3 y §7.1, marcados en su sitio). Es la
especificación viva de `apps/web/src/components/Header.tsx` y del mapa de rutas de
`apps/web/src/App.tsx`. El paso 12 de la retransmisión (E2) reescribió §7.1, §7.2 y §7.4 con lo que
el sin destripe cambió en la ficha de carrera y en la de etapa (`docs/retransmision.md` §11.17).

> **Nota de alcance.** El problema no es solo el menú. Es igual de grave el **contenido y la
> navegación dentro de las páginas**, sobre todo en el flujo Calendario → Carrera → Etapa, que hoy
> es la única vía para ver qué pasó en el mundo. Eso se trata en la Parte B.

---

# PARTE A — Estructura de menús

## 1. Diagnóstico: qué está mal hoy

### 1.1 Tres páginas funcionales son inalcanzables

No están en el menú ni enlazadas desde ninguna página. Solo se llega escribiendo la URL:

| Ruta             | Qué contiene                                 | Decisión tomada                                                                        |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/race-entry`    | Auto-inscripción del agente libre a carreras | **Rehacer**, no rescatar: la página actual no vale. Renace como pestaña de `/me/races` |
| `/team-calendar` | Plan de carreras del equipo                  | **Rescatar** dentro de `My Team`, en solo lectura para miembros                        |
| `/routes`        | Altimetrías de la "vuelta de prueba"         | **Borrar**: prueba de desarrollo que ya no se usa                                      |

### 1.2 Colisión de URLs: `/races` significa dos cosas distintas

```
/races            → MyRaces      (MIS carreras, requiere sesión)
/races/:raceId    → Race         (una carrera del mundo, pública)
```

`/races/:raceId` **no es el detalle de** `/races`. Son conceptos sin relación compartiendo prefijo:
la estructura de URLs miente sobre la jerarquía.

### 1.3 Una tira plana de 12 enlaces sin jerarquía visible

El código **ya tiene** el modelo mental correcto (`Header.tsx:14-30`) —`WORLD_LINKS` y
`RIDER_LINKS`— y lo destruye al pintar (`Header.tsx:44`) concatenándolos en **una sola fila
indiferenciada de 12 elementos**. La distinción existe en el código y es invisible para el jugador.

### 1.4 "Lo mío" desperdigado y nomenclatura incoherente

Siete destinos hermanos sin relación declarada. Dos conceptos de "órdenes" sin distinguir
(entrenamiento y carrera, este último etiquetado solo "Orders"). El panel de inicio
(`Home.tsx:13-19`) **repite** cinco de los seis enlaces del menú sin priorizar nada. Y "Market"
nombra un mercado que no existe en el MVP: lo que hay es **tu contrato y tus ofertas**.

---

## 2. Principios

1. **Tres esferas, no una lista.** Todo es _yo_, _mi equipo_ o _el mundo_.
2. **La URL es la jerarquía.** Nunca dos conceptos distintos bajo el mismo prefijo.
3. **Dos niveles como máximo.** Sección arriba, pestañas debajo. Sin desplegables anidados: el juego
   se consulta desde el teléfono.
4. **Cero huérfanos.** Si algo no merece estar en la navegación, no merece existir.
5. **El dashboard decide, no repite.**
6. **Nombres del dominio.** El jugador entiende "Contract", no "Market".
7. **Nada cambia de sitio según mi estado.** Un concepto vive siempre en el mismo lugar, tenga yo
   equipo o no. Cambiar la ubicación según la situación es lo que más cuesta aprender.

---

## 3. Estructura propuesta

### 3.1 Barra principal (nivel 1)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚴 Cycling Star        Day 137 · Season 1 · next tick 2h 14m    [👤] │
├──────────────────────────────────────────────────────────────────────┤
│  Dashboard   My Rider   My Team*   World                        News• │
└──────────────────────────────────────────────────────────────────────┘
```

- **4 destinos** frente a 12.
- `My Team` aparece **si pertenezco a un equipo**, no solo si lo gestiono (ver §3.4).
- Sin sesión: `World` · `News` · `How to play` · `Log in` · `Sign up`.

### 3.2 My Rider

```
Profile │ Training │ Race orders │ My races │ Contract │ Finances
```

**`My races` (antes `/races` + `/race-entry`)** — resuelve la pregunta "¿cuándo corro?" en un sitio:

| Pestaña interna        | Contenido                                                                   | Visible           |
| ---------------------- | --------------------------------------------------------------------------- | ----------------- |
| **Upcoming**           | Carreras en las que me ha inscrito mi equipo, o en las que me apunté yo     | Siempre           |
| **Available to enter** | Carreras a las que aún estoy a tiempo de inscribirme, con su coste de viaje | Solo agente libre |
| **Results**            | Mis carreras corridas, con mi puesto y enlace a la etapa                    | Siempre           |

La página `/race-entry` actual **se borra y se rehace** como la pestaña _Available to enter_.

> **Añadido en la v14 del motor: RETIRARSE de una carrera en marcha** (docs/motor.md §V.5). En
> _Upcoming_, una carrera POR ETAPAS que ya está rodando trae un botón `Abandon` que **pide
> confirmación** antes de hacer nada: retirarse no se deshace, y es la única acción destructiva de
> esta página. Va aquí y **no en el dashboard** aunque §V.5 lo sugería: el dashboard es «solo lo
> accionable, ordenado por urgencia, sin atajos de sección» (§4), y retirarse no caduca con el
> próximo tick. Aquí, en cambio, el jugador ya está mirando su programa —es el sitio donde uno
> decide qué corre y qué no— y tiene la carrera delante con sus etapas y su dorsal.

**`Contract` (antes `Market`)** — mi contrato actual, mi salario, y **mis ofertas**.

> **Decisión: las ofertas viven aquí, tenga equipo o no.** Puedo recibir ofertas _estando_ en un
> equipo —es el mercado normal—, así que ponerlas en `My Team` las haría cambiar de sitio según mi
> situación, contra el principio 7. Una oferta es un hecho de _mi_ carrera, no de un equipo al que
> aún no pertenezco.

### 3.3 World

```
Races │ Teams │ Nations │ Rankings │ Hall of Fame
```

`Races` es la **única** página de carreras del mundo: la línea temporal de la temporada, con
buscador y filtros. Ver §6.

> **Revocado (agosto 2026): `Calendar` y `Races` eran dos entradas para lo mismo.** La v2 de este
> documento las quería separadas —"responden a preguntas distintas: ¿qué viene? y ¿qué pasó?"— y al
> desplegarlas se vio que no: **las dos respondían a las dos preguntas**. El calendario pintaba la
> temporada en orden con marcador de "hoy" (o sea, también el pasado, atenuado) y el índice
> agrupaba en _Racing now / Results / Coming up_ (o sea, también el futuro). Dos páginas casi
> iguales con contenido distinto en cada una: el buscador solo en una, las etapas solo en la otra.
>
> Se fusionan en **`/world/races`**, que conserva lo mejor de cada una: la línea temporal
> cronológica con "hoy" y el pasado atenuado, el desplegable de etapas por carrera, el bloque
> aparte de campeonatos nacionales, el buscador (nombre, país, ganador) y los filtros de clase y
> formato. Y arregla lo que a ninguna le salía: **lo recién corrido y lo que viene, juntos
> alrededor de "hoy"** —el pasado lejano se pliega tras un "Show earlier races", así que en el
> teléfono la referencia entra en la primera pantalla—.
>
> Sobrevive `/world/races` y no `/world/calendar` por el principio 2 (**la URL es la jerarquía**):
> una carrera vive en `/world/races/:raceId`, así que su índice es `/world/races`. `/world/calendar`
> queda como redirección permanente, como el resto de rutas viejas.

### 3.4 My Team — para miembros, no solo para mánagers

Hoy no existen mánagers humanos (todos son bots), pero **un corredor sí pertenece a un equipo**, y
eso ya da contenido de sobra. Se define el mapa completo desde ahora, marcando qué llega después.

```
Squad │ Race calendar │ Identity │ Finances*
```

| Pestaña           | Miembro (hoy)                                                       | Mánager (futuro)        |
| ----------------- | ------------------------------------------------------------------- | ----------------------- |
| **Squad**         | Mis compañeros: quiénes son, su nivel, su especialidad, su palmarés | Fichar, roles, despedir |
| **Race calendar** | A qué carreras va mi equipo — y por tanto dónde pueden mandarme     | Elegir el calendario    |
| **Identity**      | Maillot, país, filosofía, división, historia                        | Editar maillot y nombre |
| **Finances**      | (oculto)                                                            | Presupuesto y nóminas   |
| _Team forum_      | Idea a valorar; fuera del MVP por necesitar moderación              | —                       |

**Si no pertenezco a ningún equipo**, `My Team` no aparece en la barra. Mi situación de agente libre
y mis ofertas están en `My Rider → Contract`, que es donde siempre están.

> Nota: el foro de equipo introduciría el **primer texto libre del juego**, y con él la necesidad de
> moderación, que `MVP.md §2` da explícitamente por no necesaria. Es un buen candidato a v1.1, no al
> MVP.

### 3.5 News — feed global, sobrio y con filtros

Mismo feed para todos, sin personalizar. Se le añaden filtros para responder preguntas concretas:

```
[ All ]  [ Team ▾ ]  [ Rider ▾ ]  [ Nation ▾ ]  [ Race ▾ ]
```

Diseño más sobrio que el actual: menos iconos, más jerarquía tipográfica, agrupado por día de juego.

### 3.6 Perfil del corredor: una página, dos modos

Hoy hay **dos páginas distintas** (`PublicRider.tsx` y `RiderProfile.tsx`) con duplicación entre
ellas. Propuesta: **una sola página** con un _modo propietario_ que añade lo privado.

| Público (cualquiera, sin sesión) | Añadido si es mi corredor          |
| -------------------------------- | ---------------------------------- |
| Identidad, país, equipo, edad    | **Frescura y fatiga**              |
| Estrellas por atributo           | Gráfica de forma (CTL/ATL/TSB)     |
| Palmarés, resultados, ranking    | Cerillos, moral, techos, objetivos |

Una página, un componente, sin duplicar. Y lo privado nunca sale en la vista pública.

> **Corrección (agosto 2026): «Recent results» va por CARRERA, no por etapa.** Listaba las etapas
> sueltas, y la posición final en la general no aparecía en ninguna parte de la ficha: el palmarés
> solo registra la general **si se gana**, así que un 3.º en una gran vuelta —tres semanas de
> carrera y probablemente el mejor resultado de la temporada— era invisible.
>
> En una carrera por etapas **el resultado del corredor ES la general**; las etapas son el detalle.
> Así que cada carrera es una línea con su puesto en la general de titular —se gane o no, y diciendo
> "so far" si aún está en marcha, o `DNF` si abandonó— y las etapas cuelgan debajo plegadas
> (`components/RaceResults.tsx`), cada una con su enlace a la crónica. Igual en la ficha del
> corredor, en la de un compañero (`My Team → Squad`) y en `My Rider → My races → Results`.
>
> El puesto sale de `race_gc`, que el tick ya acumula etapa a etapa y nunca se borra (la temporada
> va en la clave), numerada con el **mismo** desempate y el mismo trato de los abandonos que la
> clasificación de la página de carrera: sin persistencia nueva y sin que las dos pantallas puedan
> decir cosas distintas.

### 3.7 Mapa de rutas

| Ruta nueva                                | Hoy                      | Cambio                                    |
| ----------------------------------------- | ------------------------ | ----------------------------------------- |
| `/`                                       | `Home`                   | Rediseñado (§4)                           |
| `/me/profile`                             | `/rider`                 | Movida; unificada con la pública (§3.6)   |
| `/me/training`                            | `/training`              | Movida                                    |
| `/me/orders`                              | `/race-orders`           | Movida                                    |
| `/me/races`                               | `/races` + `/race-entry` | Fusionadas en pestañas (§3.2)             |
| `/me/contract`                            | `/market`                | Movida y renombrada                       |
| `/me/finances`                            | `/finances`              | Movida                                    |
| `/team/squad`                             | —                        | **Nueva** (lectura para miembros)         |
| `/team/calendar`                          | `/team-calendar`         | **Rescatada**                             |
| `/team/identity`                          | —                        | Nueva                                     |
| `/world/races`                            | `/calendar`              | Calendario e índice **fusionados** (§3.3) |
| ~~`/world/calendar`~~                     | `/calendar`              | **Redirige** a `/world/races`             |
| `/world/races/:raceId`                    | `/races/:raceId`         | **Resuelve la colisión**                  |
| `/world/races/:raceId/stages/:day`        | `.../stages/:day`        | Movida                                    |
| `/world/teams` · `/world/teams/:id`       | `/teams` · `/teams/:id`  | Movidas                                   |
| `/world/nations` · `/world/nations/:code` | `/countries` · `/:code`  | Movidas y renombradas                     |
| `/world/rankings` · `/world/hall-of-fame` | iguales                  | Movidas                                   |
| `/world/riders/:id`                       | `/riders/:id`            | Movida; misma página que `/me/profile`    |
| `/news`                                   | `/news`                  | Se queda arriba, con filtros (§3.5)       |
| ~~`/routes`~~                             | `RoutesPage`             | **Eliminada**                             |

Las rutas viejas se mantienen como redirecciones permanentes durante una temporada.

---

## 4. El dashboard: de espejo a copiloto

```
┌─ Day 137 · Season 1 ─────────────── next tick in 2h 14m ─┐
│  ⚠️  You race tomorrow: Catalonia, stage 3 (mountain)     │
│      You have no orders set.           [ Set orders → ]   │
│  📋 Training queue empty in 2 days     [ Plan week → ]    │
│  📝 2 contract offers waiting          [ Review → ]       │
├───────────────────────────────────────────────────────────┤
│  Form ████████░░ Fresh   Matches 🔥🔥🔥🔥🔥                │
│  Season points 340 · Money 12,400 · Morale 72 · Fame 41   │
├───────────────────────────────────────────────────────────┤
│  LAST RACE — Galicia, stage 2                 [ Full → ]  │
│  9th at 1'42" · In the front group until km 148           │
└───────────────────────────────────────────────────────────┘
```

Solo aparece lo accionable, ordenado por urgencia (lo que caduca con el próximo tick va primero).
Sin atajos de sección: para eso está el menú.

## 5. Móvil

Barra inferior fija con los 4 destinos (patrón nativo, alcanzable con el pulgar) en lugar del menú
de hamburguesa; pestañas de nivel 2 con desplazamiento horizontal. Resuelve de paso que el menú
actual no gestiona el foco al abrirse (`Header.tsx:129`).

> **Hecho (fase G, agosto 2026): `apps/web/src/components/BottomNav.tsx`.** En móvil la barra
> inferior **sustituye** al nivel 1 de la cabecera, que se oculta (`sm:block`): tenerlos a la vez
> sería el mismo menú dos veces. El nivel 2 no se mueve y sigue desplazándose en horizontal.
>
> Lleva **todos** los destinos de esa fila, no solo las cuatro secciones: `News` va con ellos —y
> `How to play` mientras no hay sesión—, porque al ocultar el nivel 1 se quedaban sin puerta en el
> teléfono, que es justo lo que la barra viene a arreglar. Máximo cinco entradas, con el mismo
> rótulo que en escritorio (un destino no cambia de nombre según la pantalla).
>
> Qué destinos salen según la sesión y el equipo lo decide `apps/web/src/domain/nav.ts`, compartido
> con la cabecera y probado en `nav.test.ts`: una sola regla para las dos formas de pintarla.
>
> Detalles de teléfono: 56 px de alto por destino (por encima del mínimo táctil de 44),
> `env(safe-area-inset-bottom)` para los móviles con muesca, el mismo hueco reservado al final del
> contenido en `App.tsx` para que la barra no tape nada, y el destino activo marcado con
> `aria-current="page"` además de color y pastilla de fondo. Es navegación, así que va en un `<nav>`
> etiquetado.

---

# PARTE B — El flujo Calendario → Carrera → Etapa

Esta es la parte que peor está, y la que más se usa: es **la única forma de ver qué pasa en el
mundo**.

## 6. Diagnóstico, con evidencia

### 6.1 El calendario es la única puerta de entrada

Para ver el resultado de lo último hay que ir al calendario, buscar la carrera por día de juego,
desplegarla y entrar. **No existe "resultados recientes" en ninguna parte.** El calendario en sí no
está mal (tiene filtros por división y acordeón), pero está haciendo un trabajo que no le toca.

→ Se añade **`World → Races`**: índice de carreras con lo último corrido arriba, buscador y filtros.
El calendario se queda con lo suyo, que es la línea temporal de la temporada.

> **Corrección (agosto 2026).** Esa separación no aguantó el uso real: el índice y el calendario
> acababan siendo dos formas de mirar lo mismo. `World → Races` es hoy **una sola página** que es a
> la vez línea temporal e índice buscable (§3.3), y `World → Calendar` redirige a ella.

### 6.2 La página de carrera lo apila todo, y no sabe en qué momento está

`Race.tsx` renderiza **de una vez y siempre**: cabecera, aviso de "no corrida", lista de inscritos,
**una altimetría SVG por cada etapa**, la general **completa y sin truncar**, los ganadores de etapa
y el palmarés.

Para Race France (21 etapas, 176 corredores) eso es **21 altimetrías + una tabla de 176 filas** en
un scroll infinito. Y mezcla información **previa** (inscritos, recorrido) con **posterior**
(general, ganadores): las dos a la vez, corra o no corra la carrera.

**El problema de fondo no es la cantidad, es que la página no tiene noción de estado.** Una carrera
está _por correr_, _en curso_ (una vuelta dura días) o _terminada_, y cada estado pide un contenido
principal distinto.

### 6.3 La página de etapa es un callejón sin salida

`StageReplay.tsx` tiene **un solo enlace: "← Back to the race"**. No hay anterior/siguiente: para
leer las 21 crónicas de una gran vuelta hay que volver atrás 21 veces. El título dice solo
"Stage 4" — **no menciona a qué carrera pertenece**.

Y apila seis secciones a la vez: contrarreloj, crónica, resultado, general, montaña y puntos.

### 6.4 Incoherencia entre las dos páginas

|                                       | Filas que muestra                               |
| ------------------------------------- | ----------------------------------------------- |
| Etapa (`StageReplay.tsx:305,334,378`) | **Trunca a 15 / 15 / 10, sin forma de ver más** |
| Carrera (`Race.tsx:277`)              | **Todas** (176 en una gran vuelta)              |

Es decir: **no se puede consultar el resultado completo de una etapa**, y a la vez la general te
sepulta. Ninguna de las dos decisiones es la correcta.

## 7. Propuesta: pestañas + estado

Sí a las pestañas, pero con la pestaña por defecto elegida según el estado de la carrera y, desde la
retransmisión (E2, `docs/retransmision.md` §6.10, §11.5 y §11.17), según lo que quien mira ha visto
de ella: ninguna pestaña por defecto, ninguna cabecera y ninguna fila enseña el desenlace de una
etapa que no ha visto. Lo que el resultado enseña queda a un toque, con una puerta que ofrece verla,
revelarla (`Show result`, sin castigo) o volver.

> **Qué cambió E2 aquí, y desde cuándo lo ve el jugador.** Esta sección decía lo que se veía antes de
> la retransmisión; el paso 12 de E2 la reescribe con lo que el producto hace (D-58), para quien
> mantenga la navegación (E6). Lo de abajo es lo que ve quien tiene `Watch` encendido
> (`BROADCAST_WATCH`) y el velo puesto (`SPOILER_MODE`): todos desde el encendido. Con `Watch`
> apagado para quien mira, las pestañas son las de antes, y cada apartado lo dice.

### 7.1 Página de carrera

Cabecera **persistente** (nombre, bandera, clase y fechas) que no cambia al cambiar de pestaña. El
**ganador** sale si la carrera ya se corrió y quien mira conoce su final: lo vio o lo reveló, la
carrera no está en su guardia o ya caducó (`docs/retransmision.md` §11.5, DD-01). Si no, la cabecera
dice `Finished · ready to watch`. Debajo:

Carrera **por etapas**:

| Estado de la carrera | Pestañas                                                  | Por defecto         |
| -------------------- | --------------------------------------------------------- | ------------------- |
| **Por correr**       | `Route` · `Startlist` · `Roll of honour`                  | **Route**           |
| **En curso**         | `Classifications` · `Stages` · `Route` · `Startlist`      | **Classifications** |
| **Terminada**        | `Classifications` · `Stages` · `Route` · `Roll of honour` | **Classifications** |

- **Classifications**: general, puntos, montaña y **equipos** como sub-pestañas, con top 20 y
  "mostrar todos". La de equipos suma los tres mejores de cada equipo en cada etapa (ver SPEC 6.15);
  también la tiene una carrera de un día, con su única etapa. Con etapas en el velo de quien mira, las
  tablas son las de tras la última etapa que conoce, nunca con una velada dentro, y la cabecera lo
  dice con un texto que solo depende de lo visto:
  `After stage 9 of 21 · stages 10-12 ready to watch · Watch stage 10`.
- **Stages**: lista compacta —día, tipo, recorrido y desenlace—, **sin** volcar 21 altimetrías. Cada
  fila enseña lo que el servidor manda (`stageRowState`, `apps/web/src/domain/raceStages.ts`), sin
  mirar lo que pasó en la etapa: el **ganador** de las etapas que el velo deja pasar, con `Report →`
  directo al acta de esa etapa (`/world/races/:raceId/stages/:day/report`), no a la etapa en su
  pestaña por defecto: un clic menos en cada una de las 21; **`Ready to watch`** con `Watch →` en las
  corridas sin ganador servido, que llevan a la etapa, que abre en `Watch`; y **`Not raced yet`** en
  las demás. Con `Watch` apagado para quien mira, el enlace del ganador es `Read the story →`, a la
  pestaña del acta de la etapa (`?tab=report`, que se llama `Story`), y el de la etapa por ver,
  `Open stage →`.
- **Route**: ahí sí van las altimetrías, que es donde el jugador las busca. El recorrido de una etapa
  no destripa nada.

#### Carrera de UN DÍA: la ficha de carrera ES la ficha de etapa

La v2 de este documento definió las pestañas por estado **sin excepcionar este caso**, y el
resultado en producción fue el peor fallo de uso del flujo: para leer el journal de una clásica
—que es su contenido principal— había que ir a `Stages`, entrar en una lista de **un solo
elemento** y, ya dentro de la etapa, pinchar `Story`. **Tres clics para lo único que importa.**

La causa es de diseño: en una carrera de un día la carrera **y** la etapa son la misma cosa, y eran
dos páginas. Se corrige metiendo el contenido de la etapa en la ficha de carrera:

| Estado de la carrera                     | Pestañas                                                       | Por defecto |
| ---------------------------------------- | -------------------------------------------------------------- | ----------- |
| **Por correr**                           | `Route` · `Startlist` · `Roll of honour`                       | **Route**   |
| **En curso**                             | `Route` · `Startlist`                                          | **Route**   |
| **Terminada, sin verla**                 | `Watch` · `Route` · `Report` · `Race Radio` · `Roll of honour` | **Watch**   |
| **Terminada, vista o revelada**          | `Report` · `Race Radio` · `Route` · `Roll of honour` · `Watch` | **Report**  |
| **Terminada, sin `Watch` para su etapa** | `Report` · `Race Radio` · `Route` · `Roll of honour`           | **Report**  |

- Sin pestaña `Stages` (sería una lista de un elemento) y sin salto intermedio: **el journal pasa de
  tres clics a uno**.
- **La ficha de una carrera de un día terminada ES la de su etapa**: `Watch`, el acta y la radio,
  con la misma puerta que la página de etapa (§7.2). Abre en `Watch` para quien no la ha visto (sin
  verla, o arrastrada o caducada sin verla) y en `Report` para quien la vio o la reveló
  (`docs/retransmision.md` 11-o). Antes abría en `Result`, porque «el desenlace es lo que se busca al
  abrir una clásica ya corrida»: con el sin destripe por defecto, el desenlace es justo lo que no se
  enseña sin pedirlo. `Report` es una sola pestaña con el resultado y la crónica (decisión del dueño
  del 8 de octubre de 2026); con la carrera sin ver, pinta la puerta:
  `This page shows the result of Stage 1. Watch it instead?`. Si reparte puntos o montaña, salen como
  sub-pestañas del resultado; con clasificación por equipos, también (`Teams`). Una carrera sin
  `Watch` para su etapa (una crono sin línea grabada, una etapa con lápida) abre en `Report`.
- Con `Watch` apagado para quien mira, las de antes: `Result` · `Story` · `Race Radio` · `Route` ·
  `Roll of honour`, con `Result` por defecto y la crónica en `Story`.
- La cabecera absorbe lo que daba la ficha de etapa: kilómetros, tipo de recorrido e ITT.
- `/world/races/:raceId/stages/1` **sigue funcionando**: redirige a la ficha de carrera. Sin `?tab=`
  no elige pestaña: la ficha abre en la suya por defecto, `Watch` o `Report` según la haya visto quien
  mira, que es lo que promete el enlace de un marcador del feed. Con `?tab=`, la pestaña equivalente;
  el `?tab=story` de los enlaces ya compartidos abre `Report`, que con la etapa velada pinta la puerta.
  Con `Watch` apagado sigue eligiendo la crónica, como antes: el "Full story →" de la portada no
  cambia hasta el encendido.

### 7.2 Página de etapa (solo carreras por etapas)

```
← Race Catalonia · Stage 3 of 7          [ ‹ Prev ]  [ Next › ]
──────────────────────────────────────────────────────────────
[ Watch ]  [ Profile ]  [ Report ]  [ Classifications ]  [ Race Radio ]      sin verla
[ Report ]  [ Classifications ]  [ Race Radio ]  [ Profile ]  [ Watch ]      vista o revelada
```

- **Cabecera con contexto**: a qué carrera pertenece y qué etapa es de cuántas. La pestaña del
  navegador dice la carrera y la etapa, nunca el resultado.
- **Anterior / siguiente**: se pueden leer las 21 crónicas seguidas.
- **`Watch` por defecto para quien no ha visto la etapa**: la retransmisión, que es sentarse a verla
  (`docs/retransmision.md` §6), con el perfil, que no cuenta nada, detrás. **`Report` por defecto
  para quien la vio o la reveló**: el acta, con el resultado completo (truncado y "mostrar todos",
  igual que en la carrera) y la crónica, que es la carga emocional de la etapa; `Watch` queda al
  final, para volver a verla. Con la etapa sin ver, `Report`, `Classifications` y `Race Radio` pintan
  la puerta en lugar de lo suyo. Una etapa sin `Watch` (una crono sin línea grabada, una lápida) abre
  en `Report`.
- **Classifications** lleva la sub-pestaña `Teams` con DOS tablas: la clasificación por equipos de
  esa etapa y la acumulada tras ella —"¿quién ganó hoy?" y "¿quién va ganando?" son dos preguntas
  distintas y las dos se responden sin salir de aquí—.
- Con `Watch` apagado para quien mira, las de antes, con `Story` por defecto:
  `[ Story ] [ Result ] [ Race Radio ] [ Classifications ] [ Profile ]`.

**Carreras de un día: esta página ya no existe.** La etapa ES la carrera, así que su contenido vive
en la ficha de carrera (§7.1) y esta URL redirige allí. Con ello desaparece también el problema
anterior —la general de un día era una copia exacta de `Result`, y en producción se llegaron a ver
dos tablas que ni siquiera coincidían—: hay **una sola tabla**, rotulada `Result`.

### 7.3 Regla común de tablas

Una sola convención en todo el juego: **top 20 visible + "Show all"**. Ni truncar sin salida ni
volcar 176 filas.

### 7.4 Los maillots de líder

> «en el Journal cuando menciona al ciclista que va el primero en la general, debería mencionarlo
> como con una imagen de maillot amarillo… y poner un maillot amarillo en todas las
> clasificaciones… y uno verde al que vaya primero por puntos excepto si coincide con el anterior…
> y uno azul al que vaya primero en la montaña.» «Ah, falta la clasificación por equipos.»
> — el dueño, agosto 2026.

**Tres maillots y un dorsal.** Amarillo (general), verde (puntos) y azul (montaña) los lleva un
CORREDOR y son excluyentes entre sí, con prioridad amarillo > verde > azul. El equipo líder de la
clasificación por equipos NO lleva maillot: sus corredores llevan **dorsal amarillo**, como en el
Tour, así que se dibuja un dorsal y **no entra en la cadena de prioridad** —se puede ir de amarillo
y llevar dorsal amarillo a la vez, y es lo normal—.

**Cuando dos maillots caen en el mismo hombre, el segundo pasa al siguiente** de su clasificación
(regla real: en carretera el maillot lo lleva alguien). Encadenado hasta donde haga falta. Toda esa
decisión vive en `assignLeaderJerseys` (`packages/shared/src/jerseys.ts`), función pura y con sus
tests; la alternativa —«no se pinta»— está documentada ahí mismo y es cambiar un bucle.

**Cuándo no hay ninguno:** en una carrera de UN DÍA (no hay clasificación que arrastrar), en la
etapa 1 (se ganan el día anterior) y para quien abandonó (ya no está clasificado).

**Qué clasificación manda, que es el detalle que hace que la frase sea verdad:**

| Dónde                                                    | Qué maillot                                             |
| -------------------------------------------------------- | ------------------------------------------------------- |
| Crónica de la etapa N (`Report`) y rótulos de su `Watch` | El de tras la **N−1**: el que se llevaba puesto ESE día |
| Tablas de la etapa N                                     | El de tras la **N**, que es lo que la tabla muestra     |
| Tablas de la ficha de carrera                            | El de tras la última etapa que quien mira conoce        |

Las dos cosas son ciertas y pueden no coincidir, así que el acta (`Report`) abre con una línea —«On
the road today»— que dice quién salió con cada maillot. La contradicción aparente se explica sola
en vez de descubrirse. En `Watch` los maillots de salida van en el rótulo de cada corredor; si la
N−1 está en el velo de quien mira, la etapa N pinta antes la puerta: su maillot diría quién ganó la
anterior.

**En qué tablas se marca: en todas, y también el maillot de la clasificación que la propia tabla
ordena.** Parece redundante y no lo es: por la regla del «pasa al siguiente», el verde no tiene por
qué ser la fila 1 de la tabla de puntos. Una sola regla, sin excepciones que memorizar. En la de
equipos, el dorsal marca al líder de la ACUMULADA en las dos vistas (en la de la etapa, la fila 1 es
quien mejor lo hizo hoy, que no es quien lleva los dorsales mañana).

**En la crónica, el maillot va dentro de la identidad del corredor** (`riderFull`), delante de la
bandera: sale así en todas las menciones sin tocar ninguna de las cincuenta plantillas del journal.
El dorsal del equipo líder **no** entra ahí: medido sobre Race Colombia, saldría de 4 a 13 veces por
etapa —tanto como los tres maillots juntos— diciendo mucho menos.

**Accesibilidad.** El color no distingue por sí solo (amarillo/verde/azul es el trío que peor separa
una deuteranopia), así que cada maillot lleva además marca de forma —liso, banda, lunares— y los
cuatro iconos llevan `aria-label` y `<title>`: «Race leader», «Points leader», «Mountains leader»,
«Leading team». Lo usan también los rótulos de `Watch`.

---

## 8. Plan por fases

Cada fase deja la aplicación funcionando y es desplegable por separado.

| Fase  | Trabajo                                                                                                   | Sesiones |
| ----- | --------------------------------------------------------------------------------------------------------- | -------- |
| **A** | **Rescate**: enlazar `/team-calendar`, borrar `/routes`. Sin refactor.                                    | 0,5      |
| **B** | **Flujo de carrera** (Parte B): pestañas + estado, `World → Races`, prev/next en etapa, regla de tablas   | 2-3      |
| **C** | **Estructura** de menús: rutas nuevas con redirecciones, cabecera de dos niveles, `My Team` para miembros | 1-2      |
| **D** | **`My races`** rehecha con sus tres pestañas (sustituye a `/race-entry`)                                  | 1        |
| **E** | **Dashboard** de urgencia y **News** con filtros                                                          | 1        |
| **F** | **Perfil unificado** (público + modo propietario)                                                         | 1        |
| **G** | ~~**Móvil**: barra inferior y pestañas desplazables~~ **HECHA** (ago. 2026, ver §5)                       | 1        |

> **La Fase B va antes que la A-estructural a propósito**: es donde está el daño real de uso diario.
> Arreglar el menú sin arreglar el flujo de carrera dejaría bonito el camino hacia una página mala.

Nota de coordinación: la fase C toca `App.tsx` y `Header.tsx`, ya modificados por el trabajo de
`React.lazy` ya fusionado. No hay conflicto pendiente, pero conviene hacerla de una sentada.

---

## 9. Cuestiones abiertas

1. **Foro de equipo**: introduce el primer texto libre del juego y con él la moderación. ¿v1.1?
2. ~~**`World → Races` frente a `World → Calendar`**: ¿dos páginas, o una con dos vistas?~~
   **Resuelto (agosto 2026): UNA sola página**, `/world/races`. La recomendación de mantenerlas
   separadas queda **revocada**: no respondían a preguntas distintas, sino **las dos a las dos
   preguntas** —el calendario enseñaba el pasado atenuado y el índice enseñaba lo que viene—, y
   el jugador solo veía dos menús que llevaban casi a lo mismo. Ver §3.3 y §6.1.
3. **Etapas de una carrera en curso**: ¿mostrar las etapas futuras con su recorrido, o solo las ya
   corridas?
4. **Vista de espectador de la etapa**: cuánto de la telemetría nueva del motor cabe aquí sin
   abrumar. Depende del trabajo de `docs/motor.md` §16.

# Mapa: EL JUGADOR HUMANO — qué decide, qué ve, qué no puede expresar

Lectura técnica del estado del monorepo `cyclingstar` (septiembre 2026) en la parcela «el jugador
humano». No propone nada: describe lo que hay, con nombres de función, líneas aproximadas y las
citas del dueño que los comentarios conservan como requisitos.

Ficheros leídos enteros: `apps/web/src/pages/RaceOrders.tsx`, `apps/web/src/domain/raceOrdersAdvice.ts`,
`apps/web/src/domain/labels.ts`, `apps/web/src/domain/raceOrdersDraft.ts`, `apps/web/src/api/raceOrders.ts`,
`apps/api/src/routes/races.ts` (rutas de órdenes), `packages/db/src/raceOrders.ts`,
`packages/db/src/stageRun.ts`, `packages/shared/src/contracts.ts`, `apps/web/src/components/RaceRadioPanel.tsx`,
`apps/web/src/components/StageStory.tsx`, `apps/web/src/components/LastRaceReport.tsx`,
`apps/web/src/components/RaceEffortLog.tsx`, `apps/web/src/domain/dashboard.ts`, `docs/navegacion.md`,
`docs/epics.md` (G2, N1, G7-G9), y los puntos del motor donde se consumen las órdenes
(`packages/engine/src/world/autoOrders.ts`, `stage/teamPlan.ts`, `stage/tactics.ts`, tramos de
`stage/simulate.ts`, `constants.ts`).

---

## 0. Resumen del modelo en tres frases

1. El humano es SIEMPRE un ciclista (uno por cuenta). Decide su **entrenamiento**, sus **deseos de
   calendario** (`race-prefs`), sus **órdenes de etapa** (una hoja por etapa, cinco palancas + dos
   casillas) y puede **retirarse** de una vuelta en marcha. Nada más.
2. Las órdenes son un **ajuste fijo por etapa**, sin condiciones ni referencias a la situación de
   carrera. Se guardan en `stage_orders` y llegan al motor tal cual (desde v58, las siete palancas).
3. Lo que ve después es **público y colectivo** (crónica, radio, clasificaciones) más tres piezas
   personales: el «parte» de energía (`RaceEffortLog`), el informe «Your last race» (`LastRaceReport`)
   y el aviso del dashboard. Ninguna de las tres le dice si su orden se cumplió, se ignoró o chocó
   con el plan de su equipo.

---

## 1. Dónde está la pantalla y cómo se llega

- Ruta: `/me/orders` (`App.tsx:140`; `/race-orders` redirige, `App.tsx:243`). Nivel 2 de `My Rider`:
  `Profile · Training · Race orders · My races · Contract · Finances` (`Header.tsx:41`,
  docs/navegacion.md §3.2).
- Entradas: `My races → Upcoming` tiene un enlace `Set orders` por carrera
  (`MyRaces.tsx:166-171`, `?race=<raceKey>`), y el dashboard pinta un aviso cuando la próxima
  carrera no tiene ninguna fila de órdenes (`domain/dashboard.ts:57-75`): título «You race
  tomorrow: X», detalle **«You have no orders set — your coach will ride it for you.»**, CTA
  «Set orders». El aviso desaparece con UNA orden guardada en cualquier etapa (`Home.tsx:229`:
  `hasOrders = orders.length > 0`), no exige que estén todas.
- Si el jugador no está convocado la API devuelve 403 `no_convocado` (`races.ts:255-257`) y el
  dashboard lo asume como «órdenes puestas» para no meter ruido (`Home.tsx:228-229`).
- Existe además la «vuelta de prueba» (`/api/races/test-tour`, `/api/races/test-tour/orders`,
  `races.ts:118-153`) con su propio cliente (`api/raceOrders.ts:27-39`), pero **ya no tiene ruta en
  la web** (`App.tsx` no la monta; navegación §1.1 borró `/routes`). Es un endpoint huérfano que
  inscribe en un GET (deuda anotada en el propio comentario, `races.ts:109-114`).

## 2. Qué puede decidir hoy un humano ANTES de una etapa

La consola (`RaceOrders.tsx`, Paso 29 + v44 + v58) enseña, por carrera seleccionada, un panel por
etapa con: nombre, **tipo** (`STAGE_KIND_LABEL`: Flat/Hilly/Mountain/Time trial/Classic), km,
**parte meteorológico** con fiabilidad (`Forecast`, l.46-57: se atenúa si fiabilidad < 60 % y añade
«(outlook)»; tooltip «a forecast this far out is closer to the local average than to the sky»), y la
**altimetría** SVG. En una crono (`stage.timeTrial`) no hay formulario: «Individual time trial — a
solo effort against the clock.» (l.262-265).

### 2.1 Los campos (esquema `stageOrderSchema`, `contracts.ts:901-911`; fila `stage_orders`, `schema.ts:416-435`)

| Campo            | Valores (vocabulario interno)                                                                                   | Etiqueta / promesa en pantalla (`labels.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Por defecto (`raceOrdersDraft.ts:27-38`) |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `role`           | `libre`, `lider`, `sprinter`, `lanzador`, `gregario`, `cazaetapas`, `marcador`                                  | Free: «Rides on instinct with no special job — a free role.» · Leader: «Your protected leader: teammates shelter and pace them, saving them for the finish.» · Sprinter: «Sits in for the finish and contests a bunch sprint.» · Lead-out: «delivers a teammate to the sprint at top speed, then swings off.» · Domestique: «works for a teammate — shelters them, sets the pace, fetches bottles.» · Stage hunter: «gets in the breakaway to fight for the stage win.» · Marker: «shadows a RIVAL and follows their attacks so they can't get away.» | `libre`                                  |
| `targetRiderId`  | uuid de un **compañero** del roster (roles `lanzador`, `gregario`) o de un **rival** (rol `marcador`); nullable | «Teammate to lead out» / «Teammate to work for» / «Rival to mark»; opción vacía «— none yet —» (l.59-64, 290-312)                                                                                                                                                                                                                                                                                                                                                                                                                                     | `null`                                   |
| `mentality`      | `reservon`, `oportunista`, `combativo`, `supercombativo`                                                        | Conservative «saves energy and only reacts» · Opportunist «takes a good chance when it appears» · Aggressive «attacks and forces the race» · Super-aggressive «attacks early and often (burns through energy)»                                                                                                                                                                                                                                                                                                                                        | `reservon`                               |
| `effort`         | `ahorrar`, `normal`, `a_tope`                                                                                   | Save «ride within yourself to keep energy for later» · Normal «a balanced effort for the day» · All-in «empty the tank today»                                                                                                                                                                                                                                                                                                                                                                                                                         | `normal`                                 |
| `triggerKm`      | entero ≥ 0, nullable (el input limita a `max={stage.km}`)                                                       | «Attack at km (optional)» — **«Launch a move at this distance. Leave blank to let your mentality decide when.»**                                                                                                                                                                                                                                                                                                                                                                                                                                      | `null`                                   |
| `contestSprints` | bool                                                                                                            | «Chase points-jersey sprints»                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `false`                                  |
| `contestClimbs`  | bool                                                                                                            | «Chase mountain (KOM) points» — nota común: «Contest the intermediate-sprint or the King-of-the-Mountains points at the banners along the route (green / polka-dot jerseys). Costs energy.»                                                                                                                                                                                                                                                                                                                                                           | `false`                                  |

Notas de comportamiento de la pantalla:

- El desplegable de objetivo sólo aparece con `NEEDS_TARGET = ['lanzador','gregario','marcador']`
  (l.35). Cambiar de rol NO limpia el `targetRiderId` anterior (queda guardado aunque el rol pase a
  `libre`; el motor lo ignora entonces salvo para `gregario/lanzador/marcador`).
- Compañeros = mismos `teamId` en el roster, por fama desc, excluyéndose a sí mismo
  (`db/raceOrders.ts:24-46`); agente libre → lista vacía. Rivales = todo el roster que no es de tu
  equipo (los sin equipo cuentan), por fama desc, **límite 60** (`getRaceRivals`, l.49-73). O sea:
  en una gran vuelta de 176 no se puede marcar a cualquiera, sólo a los 60 más famosos.
- «Copy to every <tipo> stage» / «Copy to the rest of the race» (`copiarA`, l.113-143, v58): copia
  las siete palancas incluido el objetivo; la crono nunca recibe copia.
- Resumen arriba (l.204-220): «N road stages, no clashing orders.» o «… · K with orders that clash —
  look for the ⚠ below.»
- «Save all» guarda TODAS las etapas de la carrera seleccionada de golpe (`setStageOrders` borra e
  inserta, `db/raceOrders.ts:111-138`); la API filtra los `stageDay` fuera de rango y acepta hasta
  30 filas (`races.ts:72-75`, `315-332`).
- El borrador va atado a `raceKey` para que un refetch no lo pise ni se guarde contra otra carrera
  (`raceOrdersDraft.ts`, cabecera: dos bugs reales resueltos).

### 2.2 Consejos del «director» (`raceOrdersAdvice.ts`, v58) — no prohíben nada

Cabecera literal: el dueño: **«creo que hay que rediseñar y mejorar el tema de las instrucciones por
etapa… no funciona muy bien, y el resultado es casi lo mismo ponga lo que ponga ahí»**. Medido: «dos
de las cinco palancas —el esfuerzo y el kilómetro del ataque— no llegaban al motor (arreglado
aparte)»; las que sí llegan «deciden mucho —el mismo corredor, con las mismas semillas, gana 7 de 16
llanas como `sprinter` y 0 de 16 como `gregario`— pero la pantalla no lo cuenta».

Reglas (`orderAdvice`, l.26-108), `warn` = ⚠ ámbar, `info` = ℹ gris:

1. `sprinter` en `reina|media` → warn «A sprinter has nothing to wait for on a mountain day…».
   `lanzador` en montaña → warn «There is no lead-out on a mountain finish…». `sprinter` sin
   `contestSprints` → info.
2. `lanzador`/`gregario`/`marcador` sin objetivo → warn («A lead-out rider with nobody to lead out
   just rides.», «Pick the teammate you are working for, or this is just a hard day.», «Marking
   nobody in particular is the same as riding your own race.»).
3. `triggerKm` > km de la etapa → warn; en los últimos 3 km → info «it is a sprint, not a move»;
   con rol `sprinter|lanzador` → info «the role will usually win».
4. `a_tope` + `gregario` → info («That is the job — just know it»); `ahorrar` + `supercombativo` →
   warn «Saving energy and attacking everything are opposite orders: the tank decides, and yours
   will be shut.»

Lo que el consejo **no ve**: el equipo (si ya hay un líder bot, si dos humanos se declaran líder), la
general, el estado físico, el resto de etapas, ni el clima que la propia pantalla enseña.

### 2.3 Otras decisiones del humano fuera de la hoja de órdenes

- **Deseos de calendario** (`/api/riders/me/race-prefs`, `riders.ts:351-370`; `setRacePref`,
  `callups.ts:260-275`): marcar carreras como «wanted». Pesa en la selección de escuadra del bot
  (`engine/world/callups.ts:115`, `W_DESIRE`) y mueve la moral SÓLO del humano al convocar o no
  (`callups.ts:181-186`, «la tensión del jugador, SPEC 7.2»). Se enseña como «Season objectives»
  en el perfil con Selected / Not selected (`RiderProfile.tsx:269-297`). Es lo más parecido a un
  «objetivo de temporada», y es un deseo de ir, no un objetivo deportivo.
- **Retirarse** de una vuelta en marcha (`My races → Upcoming → Abandon`, con confirmación
  «Abandon for good?», `MyRaces.tsx:137-161`; docs/motor.md §V.5). Es la ÚNICA decisión
  entre-etapas.
- **Agente libre**: inscribirse él mismo pagando viaje (`/me/races → Available to enter`).
- **Mánager premium** (SPEC 7): `POST /api/teams/take-over` reclama el equipo bot en el que corre
  (`takeOverBotTeam`, requiere `users.premium`, equipo sin `ownerUserId`). Poderes reales hoy:
  editar nombre/país/maillot (`PUT /api/teams/me`), **draft del calendario del equipo**
  (`POST/DELETE /api/teams/me/calendar/:raceId`) y fijar el **plan de entrenamiento sugerido**
  (`PUT /api/me/team-training`, sólo si `ownedByMe`, `riders.ts:323-333`). **No** decide roles,
  convocatorias nombre a nombre ni órdenes de sus corredores: ninguna ruta lo permite.

## 3. Cómo llegan las órdenes al motor (`packages/db/src/stageRun.ts::runOneStage`)

1. Se leen TODAS las filas de `stage_orders` de esa `raceKey`+`stageDay` (l.213-217) → `ordersByRider`.
2. Se calculan **órdenes automáticas para todo el roster** con `autoStageOrders(autoRiders, {kind,
timeTrial})` (l.286-300). `autoRiders` incluye a todos los corredores (humanos con y sin orden,
   bots), con `attrs`, `teamId` y `gcRank`. **El planificador no sabe quién es humano ni quién trae
   orden explícita**: reparte el equipo entero como si todos fueran bots.
3. Por corredor (l.309-334): si hay fila humana → `{role, mentality, effort, triggerKm,
contestSprints, contestClimbs, targetRiderId?}` tal cual («una orden explícita siempre manda»);
   si no → la automática; si tampoco → `libre/reservon/false/false`. Comentario v58: «El jugador los
   rellenaba, la base los guardaba y AQUÍ se tiraban: el contrato del motor no los tenía, así que dos
   de las cinco palancas de la pantalla de órdenes no llegaban a la carretera.»
4. El `StageRider` lleva además `eff0`, `energy`, `matches`, `gcDeficitSeconds`, `gcRank`, `bib`,
   `teamId` (`null` = agente libre: «un ciclista sin equipo, pues corre de forma individual», cita
   del dueño en `engine/stage/types.ts`). **No lleva `isBot`/`userId`**: el motor es ciego a la
   humanidad del corredor (`grep isBot packages/engine/src` → 0 usos).
5. Todo el input se congela en `stage_snapshots.input` junto a `events` y `radio` (l.412-446).

### 3.1 Las órdenes de los bots (`engine/world/autoOrders.ts::assignTeam`)

Determinista por atributos y `gcRank`: (0) el mejor colocado en la general hasta el puesto 5 es
`lider/reservon` (v42, v50); (1) en llana el mejor SPR ≥ 68 es `sprinter` + un `lanzador` que le
apunta; si no, `lider` por terreno; (2) un `cazaetapas/combativo` si sobra gente; (3) **el resto,
gregarios del jefe** (v38: «En una carrera no hay nadie "sin órdenes"»). Agentes libres: sprinter,
cazaetapas o nada. En crono: vacío. Nunca usa `effort`, `triggerKm` ni `marcador`.

### 3.2 Qué hace el motor con cada palanca (lo que SÍ ve y lo que NO)

| Palanca                 | Dónde se consume                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Efecto                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `role`                  | `relayDutyByRole` (`constants.ts:1668-1676`: gregario 1.0 … lider 0.1) en `relayDuty` (`simulate.ts:508`); `ROLE_APPETITE` (`tactics.ts:231-239`: cazaetapas 1.0, libre 0.45, lider 0.3, gregario 0.2, lanzador 0.12, marcador 0.1, sprinter 0.05); `finishRoleWeight` en el sprint (`simulate.ts:6307`, gregario/lanzador ×0.88); `leaderScore` de `pickLeader` (`teamPlan.ts:157-169`: sprinter 4 en llegada agrupada, lider 3, cazaetapas 1); `esLaCartaDelEquipo` (lider/sprinter no reciben el empuje de relevos, `simulate.ts:529-531`); «baja a ayudar» sólo si `gregario` (`tieneElEncargo`, l.2194-2198); candidato de caza (`chase.ts:46`). | Es la palanca que más decide.                                                                                                                      |
| `targetRiderId`         | `worksFor/domestiquesFor/leadOutFor/lanzaPara/markTargetOf` (`simulate.ts:1152-1170`); protección del arropado (`protectedByTeam`, l.620-621, `domestiqueProtect*`); tren de lanzamiento (`lanzando`, l.3116; `trenDe`, l.6233); marcaje continuo (`markedPerfil`, l.3679; `comesOff`, l.3724) y respuesta al ataque del marcado (`wheelProbability`, l.4508-4512); votos para jefe de filas (`pickLeader`).                                                                                                                                                                                                                                          | Sólo con `gregario`/`lanzador`/`marcador`. Un objetivo de OTRO equipo con `gregario/lanzador` te convierte en **rebelde** (`teamPlan.ts:215-239`). |
| `mentality`             | `MENTALITY_APPETITE` (`tactics.ts:255-260`: supercombativo 1.6, combativo 1.25, oportunista 0.8, reservon 0.3); `reservon` **no quema cerillos** para aguantar (`simulate.ts:3759`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Multiplica las ganas de atacar.                                                                                                                    |
| `effort` (v58)          | `EFFORT_PUSH` ±1 × `relayEffortWeight 0.5` en el deber de relevo (`simulate.ts:550-556`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | «Es un empujón, no un veto»: sólo mueve quién entra al turno de relevos. NO toca el tanque, el ritmo, el sprint ni los ataques.                    |
| `triggerKm` (v58)       | `attackAppetite` (`tactics.ts:375-378`): ×3 dentro de ±2 km, ×0.15 fuera (`triggerWindowKm/Boost/Outside`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | «No es un permiso, es una CITA». Un `sprinter` con cita sigue con apetito 0.05×3 = 0.15: la pantalla lo avisa («the role will usually win»).       |
| `contestSprints/Climbs` | banderas (`simulate.ts:6050`), y en `chase.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Disputar metas volantes/cimas.                                                                                                                     |

Lo que el motor **no** ve de ninguna orden: condiciones («si…»), el equipo rival al que se
refiere un ataque, el momento de la carrera que no sea un km, la etapa siguiente, el objetivo de la
carrera entera (la general no es una orden: `gcDeficitSeconds/gcRank` los calcula la base y los
usa el plan bot, no el jugador).

### 3.3 Cómo se mezclan órdenes humanas y bots en un mismo equipo

Hoy **todos los equipos son bots** con corredores humanos dentro (navegación §3.4: «Hoy no existen
mánagers humanos»). La mezcla real es «un humano (o varios) en un equipo bot»:

- **El bot no hace caso al humano; ni siquiera lo ve.** `autoStageOrders` se calcula sobre el
  equipo completo sin conocer las filas humanas (`stageRun.ts:286-300`). Si el humano es el mejor
  SPR del equipo en una llana, los bots reciben «lanzador de X» y «gregario de X» **aunque X haya
  escrito `libre`, `cazaetapas` o `gregario de otro`**. Si el humano NO es el elegido y se pone
  `lider`, hay dos jefes.
- **El plan de equipo (`teamPlan.ts::buildTeamPlans`) sí lee las órdenes reales**: `pickLeader`
  cuenta los votos de gregarios/lanzadores hacia su `targetRiderId`; a falta de votos, por
  `leaderScore`. Consecuencias observables:
  - Humano `libre` cuyos compañeros bot le apuntan → **es el jefe de filas sin haberlo pedido**:
    recibe protección (`domestiquesFor`), sale del turno por `protectedByTeam`, y sus compañeros
    «bajan a por él» si se descuelga (v58 `tieneElEncargo` mira las órdenes del que baja, no las
    del jefe). El propio comentario v58 reconoce que sólo se arregló la mitad: «si yo como humano
    digo que voy por libre… no debería ocurrir eso» se refería al que BAJA, y eso es lo que se
    corrigió; nadie mira si el jefe quiere ser jefe.
  - Humano `lider`/`sprinter` cuando el plan ya tiene otro jefe → **rebelde** (`rebelIds`): fuera
    del plan, `teamAttack = 1`, sin protección ni tren, y la crónica lo cuenta una vez
    (`rider_defies_team`: «X is doing this on his own account: his team has a leader today, and it
    is not him.» / «X is out of his team's plan today, by his own choice.», `stageJournal.ts:506-530`).
    Decisión del dueño (docs/motor.md §VI.2): «en un equipo bot, no cuesta nada. En un equipo
    humano, lo que decida su mánager (herramienta futura)». Y la advertencia anotada: «la estrategia
    óptima pasa a ser "ir siempre de líder" pase lo que pase».
  - Humano `gregario` de un compañero: entra en el plan como uno más; si su objetivo no es el jefe
    del plan, `tieneElEncargo` le impide sacrificarse por el jefe (v58), pero su voto puede haber
    hecho jefe a su objetivo.
  - Humano `marcador` de un rival: nunca es rebelde (la regla sólo mira `gregario/lanzador` con
    objetivo externo), pero **no cuenta para el equipo** (deber 0.35, apetito 0.1).
- **Dos humanos en el mismo equipo**: no hay ninguna regla que los relacione. Cada uno rellena su
  hoja sin ver la del otro (la API sólo devuelve `orders` del propio corredor,
  `races.ts:309-312`). Si ambos se ponen `lider`, gana el de más votos/`leaderScore`/id menor y el
  otro es rebelde. El comentario de `teamPlan.ts:215-224` describe exactamente el caso: «el jugador
  humano se pone de líder cuando su equipo ya tiene uno».
- **Agente libre** (`teamId` nulo): ningún plan; sus compañeros no existen; sólo puede marcar
  rivales (cualquiera del roster, `getRaceRivals`).

## 4. Qué se le enseña DESPUÉS

Todo lo que ve es la misma vista **pública** que cualquier visitante, más tres piezas privadas.

### 4.1 Público, por etapa (`/world/races/:raceId/stages/:day`, pestañas `Story · Result · Radio · Classifications · Profile`, `StageReplay.tsx:27-35`)

- **Story** (`StageStory.tsx`): «How the stage unfolded», crónica congelada (`stage_snapshots.events`)
  narrada por plantillas (`stageJournal.ts`), con «On the road today» (maillots puestos ese día,
  navegación §7.4), podio y «Full result →». Cada corredor sale con dorsal, equipo, bandera y
  enlace a su ficha (cita del dueño: «cada vez que menciones un ciclista, pon su dorsal, su equipo
  entre paréntesis y su bandera»; v58: «cuando salga el nombre de un ciclista que tenga enlace a su
  ficha»). Sólo cuenta lo que es NOTICIA; no hay marca de «éste eres tú».
- **Radio** (`RaceRadioPanel.tsx`): UNA foto por km (cita: «en lugar de ver en vertical cada km,
  quiero que solo muestres al mismo tiempo un punto…»), con grupos nombrados (`groupName`: Bunch
  together / Peloton / Lead group / Race leader's group / Chase group / No man's land / Grupetto /
  «3rd group»), tamaño, km/h, dos huecos («behind the leaders», «behind the group ahead»), y por
  corredor: ⏵ pulling / ⌂ sitting in, maillot, bandera, dorsal, nombre, equipo y **motivo del
  relevo** (`motiveLabel`: «working the break», «chasing X up the road», «lead-out for X», «his
  team's card for this finish: X», «defending the jersey of X», «riding the GC for X», «his job in
  the team», «just riding — this group is chasing nothing», «alone…», «in the echelon…»). Citas que
  lo originaron: «ver km por km qué grupos hay, quién va en cada grupo…», «¿para qué carajos tiran si
  en ese grupo donde están no está su líder?… busca de algún modo dejar una evidencia que explique
  por qué o para qué tira cada ciclista», «dice algo así como _his team's card for this finish_…
  pero no dice quién es, wey». La radio nombra a los que tiran, los tres maillots y los top-10
  (`radioWatchList`, `stageRun.ts:420-428`); **el jugador no está garantizado en la lista**: si va
  a rueda y no es top-10, es uno de los «+56 riders more».
- **Result / Classifications**: tablas top-20 + «Show all», con `isBot` marcado en `RiderName`
  (los humanos se distinguen visualmente), maillots y DNF con motivo.
- Etapas anteriores a la v47/v34 sin radio: «This stage was raced before the race radio was
  recorded… a re-run with today's engine would tell a different race» (`StageReplay.tsx:458-470`).

### 4.2 Privado

- **«Where the energy went»** (`RaceEffortLog.tsx`, en `/me/profile`): por día de carrera, barra
  con los cinco conceptos de gasto (`rodar` «Riding in the bunch», `relevo` «On the front»,
  `cerillos` «Attacks & jumps», `reserva` «Digging deep», `banderas` «Sprints & KOMs») y notas: «X km
  on the front», «X km up the road», «N attacks», «N jumped onto moves», «N matches burned», «Ns over
  threshold», «lost the bunch at km», «ran empty at km», o «Sat in the wheels all day.» Nace de la
  cita: «le dije que corriera súper agresivo… y no hay ni una sola mención en el journal ni en la
  race radio, pero consumió un montón de energía; algo habrá hecho, digo yo». Se guarda en
  `rider_daily_log.parte` al correr (`stageRun.ts:492-505`, también para quien no acaba). **No
  enlaza con la orden**: no dice «tenías effort=a_tope» ni «tu cita era el km 80».
- **«Your last race»** (`LastRaceReport.tsx`, `GET /api/riders/me/last-race`): puesto/campo, gap,
  puntos, «How the stage unfolded» (resumen colectivo de 1-3 líneas), **«Your orders»**: sólo
  `role`, `mentality`, `contestSprints`, `contestClimbs` (`raceReportOrdersSchema`,
  `contracts.ts:1287-1292`) — **NO enseña `effort`, `triggerKm` ni `targetRiderId`**; «Coach's
  default plan.» si no había fila. «What happened to you»: eventos donde el jugador fue
  protagonista, traducidos por `personalNarration` (sólo 7 plantillas: fuga formada, sprint
  intermedio, KOM, fuga cazada, selección, victoria, victoria CRI; el resto sale con el nombre crudo
  de la plantilla). Veredicto `raceVerdict`: «Perfect execution», «A podium — the plan came
  together», «You went for the sprint and were right in the mix», «A domestique day — work done
  for the team», «A quiet day — the race got away from you»… — heurística por puesto, no por
  cumplimiento de la orden. **Ojo**: `getRiderLastRaceReport` (`db/raceReport.ts:78-`) **re-simula**
  la etapa desde el snapshot con el motor ACTUAL (`simulateStage(input, snap.seed)`) en vez de leer
  los `events` congelados; contradice el principio que la crónica y la radio sí respetan.
- **Dashboard**: sólo el aviso de «no orders set» (§1). No hay «esto se decidió aquí y tú habías
  dicho esto otro».
- **Noticias**: abandono propio como titular (`abandon`, con detalle «climbs off, out of energy» /
  «eliminated on time» / «injured» / «ill» / «withdraws»), lesiones, contratos.

## 5. Qué NO puede expresar hoy un humano (comprobado contra el esquema y el motor)

| Deseo del jugador                                                 | ¿Expresable?                           | Por qué no                                                                                                                         |
| ----------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| «Lanzo a mi compañero X»                                          | Sí (`lanzador` + objetivo)             | —                                                                                                                                  |
| «Trabajo para X»                                                  | Sí (`gregario` + objetivo)             | —                                                                                                                                  |
| «Marco al rival X»                                                | Sí, si X está entre los 60 más famosos | `getRaceRivals(limit=60)`                                                                                                          |
| «No relevo al rival X» / «no colaboro con esa fuga»               | **No**                                 | No hay orden de colaboración por rival ni por grupo; el relevo lo decide `relayDuty` con rol/effort/equipo                         |
| «Ataco si viene el de tal equipo» / «si la fuga pasa de 2′, tiro» | **No**                                 | Cero condiciones en `StageOrders`; es exactamente N1 de epics.md («órdenes condicionales»)                                         |
| «Espero a mi jefe si se descuelga»                                | Sólo implícito                         | Sale de `gregario`+objetivo (v58 `tieneElEncargo`); no se elige por separado ni se sabe que existe                                 |
| «Quiero ser el jefe de filas hoy»                                 | A medias                               | Ponerse `lider` te hace **rebelde** si el bot ya nombró otro; no hay negociación ni consecuencia                                   |
| «No quiero ser el jefe hoy»                                       | **No**                                 | Si los bots te apuntan, eres jefe aunque digas `libre` (§3.3)                                                                      |
| «Guardo fuerzas para la etapa N» / plan multi-etapa               | **No**                                 | `effort=ahorrar` es un ±0.5 en el turno; no hay presupuesto de carrera, ni objetivo por etapa clave; «Copy to…» sólo duplica hojas |
| «Voy a por la general» / «a por el maillot verde»                 | **No**                                 | No existe objetivo de carrera; la general sólo la usa el plan bot vía `gcRank`                                                     |
| «Objetivo de temporada: ganar X»                                  | Sólo «quiero ir a X» (`race-prefs`)    | Es un deseo de convocatoria, no de resultado                                                                                       |
| «Ataco en el puerto / en el adoquín / con lluvia»                 | Sólo por km                            | `triggerKm` es un número; la pantalla enseña el parte pero la orden no puede referirse a él                                        |
| «Corro a rueda de X todo el día» siendo compañero                 | **No**                                 | `marcador` sólo admite rivales en la UI (`rivals`), aunque el esquema aceptaría cualquier uuid                                     |
| Cambiar de idea durante la etapa                                  | **No, por diseño**                     | El dueño: es «incompatible con avanzar un día cada seis horas» (epics N1)                                                          |
| Hablar con mi equipo / negociar rol                               | **No**                                 | G7/G2.13: «Canales de comunicación entre ciclistas» sin empezar                                                                    |

## 6. Lo que dice epics.md G2 sobre la gestión humana de equipos (resumen fiel)

Cita: **«Esto va a ser BRUTAL. Tiene a su vez MUCHÍSIMOS componentes.»**

Modelo: «Todo jugador es un CICLISTA. Unos pocos —que paguen, o que elija el dueño— son ADEMÁS
mánager de su equipo». Cuatro consecuencias previas: (1) el mánager es «juez y parte… si el mánager
se nombra jefe de filas siempre, los humanos de su equipo se van. Hace falta que abusar SALGA CARO
por dentro del juego (moral, salidas, reputación), no por una regla que lo prohíba»; (2) asimetría
de poder → TRANSPARENCIA, VOZ (G7) y SALIDA (mercado); (3) «Pagar da AUTORIDAD, no vatios»; (4) «La
mayoría de los equipos NO tendrán mánager humano» → el bot debe decidir creíblemente y un humano
heredar «sin que se note el cambio de manos». Consecuencia práctica: «un mánager no puede tener un
segundo trabajo… POLÍTICAS en vez de órdenes, aplicada en dos niveles: el mánager fija el plan del
equipo y cada corredor escribe el suyo dentro de ese marco».

Componentes con «[hay pieza]»: G2.1 Jerarquía y liderazgos (`domestiquesFor`,
`relayProtectedPenalty`); G2.4 Disciplina («el motor YA tiene rebeldes… y no hay nada que
reaccione a eso»); G2.5 Contratos; G2.7 Economía; G2.11 Moral («nada la mueve por motivos
humanos»). Sin pieza: G2.2 Convocatorias/carga, G2.3 Promesas, G2.6 Premios, G2.8 Imagen, G2.9
Staff, G2.10 Salud con duración, G2.12 Relaciones, G2.13 Comunicación, G2.14 La silla del mánager,
**G2.15 Ser mandado**: «cómo se vive desde ABAJO… Tiene que doler y tiene que poder responderse
—hablar, negarse, rendir menos, irse—, porque si no, el jugador que no es mánager es un
espectador de su propia carrera deportiva».

Relacionado: **N1 «El plan como PROGRAMA: órdenes condicionales»** — el dueño tumbó la radio en vivo
(«incompatible con avanzar un día cada seis horas») y pidió «mejorar la granularidad de las
instrucciones, con más escenarios hipotéticos quizás»; la crónica y la radio pasarían a ser «el
INFORME con el que se corrige el plan de la próxima —"esto se decidió aquí y tú habías dicho esto
otro"—». docs/tactica.md §7.3 deja abierto «Hasta dónde llega el jugador humano. Todo lo de §3.B son
decisiones que un humano querría tomar él (¿ataco yo o le lanzo a él?), y eso es diseño de juego
antes que de motor». G8/G9: limpiar bots según lleguen humanos; «hacer que [los bots] sean peores
que los humanos».

## 7. Citas del dueño sobre órdenes y conducta (textuales, con su fichero)

- «creo que hay que rediseñar y mejorar el tema de las instrucciones por etapa… no funciona muy
  bien, y el resultado es casi lo mismo ponga lo que ponga ahí» — `raceOrdersAdvice.ts:6-7`,
  `engine/stage/types.ts:85`.
- «si un ciclista tiene a su líder atrás, es normal que se deje caer para ayudarle… pero eso aplica
  a los bots y a los humanos que en sus instrucciones hayan indicado que ayudan a su líder X. **Si yo
  como humano digo que voy por libre, entonces no debería ocurrir eso**» — `simulate.ts:2175-2179`.
- «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios
  hipotéticos quizás» — epics.md N1.
- «un ciclista sin equipo, pues corre de forma individual» — `engine/stage/types.ts` (`teamId`).
- «le dije que corriera súper agresivo… y no hay ni una sola mención en el journal ni en la race
  radio, pero consumió un montón de energía; algo habrá hecho, digo yo» — `contracts.ts:156-162`,
  `RaceEffortLog.tsx:6-7`.
- «me gustaría entender un poco mejor en qué se gastó la energía» — `RiderProfile.tsx:252-254`.
- «el líder con el maillot amarillo está también tirando???» / «el líder se la pasa todo el tiempo
  tirando» — `autoOrders.ts:20-22`, `simulate.ts:514-516`.
- «el líder… lo veo demasiado combativo; se escapa, lo consiguen, le pillan, luego lo vuelve a
  intentar… no tiene sentido que un líder haga eso» — `autoOrders.ts:129-132`.
- «km 55, 107 Isaac Clark… drops back… para ayudar a un compañero que estaba a 8 minutos en la
  general» — `simulate.ts:2150-2153`.
- Sobre la línea de rebeldía en km 0: «esta tontería absurda y que no se entiende» — `stageJournal.ts:513-514`.
- Radio: «ver km por km qué grupos hay, quién va en cada grupo (por lo menos número, maillots de
  colores y quiénes tiran…) y las distancias entre grupos» — `contracts.ts:1136-1138`; «¿para qué
  carajos tiran si en ese grupo donde están no está su líder?… MAL» — `contracts.ts:1186-1190`;
  «dice algo así como _his team's card for this finish_… pero no dice quién es, wey» — `contracts.ts:1223`;
  «el grupo del líder… podría llamarse _grupo del maillot amarillo_ en vez de _grupo 3_» — `RaceRadioPanel.tsx:50-52`;
  «en el grupo 3 los que tiran no se ve su nombre» — `RaceRadioPanel.tsx:208`.
- Crónica: «cada vez que menciones un ciclista, pon su dorsal, su equipo entre paréntesis y su
  bandera» — `contracts.ts:1003-1005`; «cuando salga el nombre de un ciclista que tenga enlace a su
  ficha» — `contracts.ts:1016`.
- Táctica en general: «vas dando palos de ciego… tienes que hacer un break y REPENSAR TODA la
  lógica de todas las situaciones que pueden ocurrir en carrera» — `docs/tactica.md` cabecera.
- G2: «Esto va a ser BRUTAL…»; G7: «Canales de comunicación entre ciclistas»; G8/G9 (bots).

## 8. Deuda reconocida en comentarios y docs (límites anotados)

1. **`autoStageOrders` ignora las órdenes humanas del mismo equipo** — no está anotado como límite en
   ningún comentario; se deduce del código (`stageRun.ts:286-300`). El único parche v58 (`tieneElEncargo`)
   arregla al que baja, no al que es nombrado jefe sin querer.
2. **Desobedecer sale gratis** — docs/motor.md §VI.2: «Como hoy todos los equipos son bots,
   desobedecer sale gratis siempre, y la estrategia óptima pasa a ser "ir siempre de líder"». Se
   mitigó de forma intrínseca (sin protección/tren); «Decisión del dueño: en un equipo humano, lo
   que decida su mánager (herramienta futura: no convocar, sancionar, rescindir)». G2.4: «no hay
   nada que reaccione a eso».
3. **El informe personal no enseña `effort`, `triggerKm` ni `targetRiderId`** (`raceReportOrdersSchema`)
   y **re-simula con el motor actual** en vez de leer los eventos congelados
   (`raceReport.ts`), contra la regla que el propio repo escribe para crónica y radio.
4. **`StageRider.tsb` «PENDIENTE DE IMPLEMENTAR (SPEC 6.6)»**: la base lo rellena y el motor lo
   ignora (`engine/stage/types.ts`).
5. **Vuelta de prueba huérfana**: endpoints `/api/races/test-tour*` vivos, «ESCRITURA EN UN GET…
   deuda conocida de la herramienta de pruebas de la alfa» (`races.ts:109-114`), sin ruta web.
6. **Orden de entrada del motor** («ESTO TAPA EL SÍNTOMA Y NO LA CAUSA… Queda anotado en
   docs/balance.md», `stageRun.ts:129-146`): afecta a la reproducibilidad, no al jugador directamente.
7. **`effort` y `triggerKm` no llegaban al motor hasta la v58** (varios comentarios) — ya resuelto,
   pero el consejo y el informe aún no los cierran en bucle.
8. **Rivales marcables limitados a 60 por fama** (`getRaceRivals`), sin comentario que lo justifique
   como decisión.
9. **`raceVerdict` no compara orden con hecho**: heurística por puesto (`narration.ts:150-162`),
   aunque el panel se describe como «compara lo que el corredor ordenó con lo que ocurrió».
10. **navegación §9.4**: «Vista de espectador de la etapa: cuánto de la telemetría nueva del motor
    cabe aquí sin abrumar» — abierta.
11. **docs/tactica.md**: «Nada de aquí se implementa hasta que el dueño lo lea»; §7 deja tres
    decisiones al dueño, la tercera es «Hasta dónde llega el jugador humano».
12. **Mánager premium**: SPEC 7 ya da `take-over`, identidad, draft de calendario y plan de
    entrenamiento sugerido; roles, convocatorias nombre a nombre y órdenes de terceros **no existen**
    (ninguna ruta), coherente con navegación §3.4 «Mánager (futuro): Fichar, roles, despedir».

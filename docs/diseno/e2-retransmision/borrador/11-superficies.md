## 11. Sin destripe (II): cada superficie, una a una

§10 construye el horizonte, el velo y los ocho mecanismos (P prefijo, R resta, F filtro, M máscara, G puerta, B tramos, N neutro por construcción y L libre con su motivo, §10.6); §14 construye las rutas y el registro que no arranca si una no declara su política (§14.5). Esta sección los aplica a todo lo que el jugador puede leer: las 48 superficies del mapa 03 §4, una por fila (11.1); las nueve puertas de fuera del inventario y dos más, una que apareció al leer las rutas y otra al barrer el mundo de B1 con el código de hoy (11.2); las 96 rutas propias que registra Fastify con E2 (las 87 de hoy y las nueve de §14.2; las `HEAD` automáticas, una por cada ruta con `GET`, 53 hoy y 57 con los cuatro `GET` nuevos de §14.2, heredan el `config` de su `GET`, §14.5), cada una con su clase y su mecanismo, que es la tabla que B1d compara con el registro (11.3); y las pantallas de producto que el encargo nombra una a una: la portada, los agregados, los avisos, las noticias, el título de la pestaña, el correo, el visitante y el acta compartible, «dame el resultado», la previa de la N+1, lo propio, lo ajeno, el modo diagnóstico, la `Race Radio` (pantalla) y `docs/navegacion.md` (11.4 a 11.17). Al final van la lista blanca de B1b entera, los tests de las piezas de esta sección y lo que ve cada tipo de espectador (11.18 a 11.20). Escribe como hechos D-16, D-32 y de D-36 a D-42, y decide lo que dejan abierto al final. Los tipos son de §4 (`Horizon`, `VeilDelta`, `StageGate`, `PreStageInfo`, `HorizonSummary`, `StageReadyItem`) y las piezas de servidor, de §10.6 (`veilSql`, `throughStage`, `isVeiled`, `stageGateOf`, `veilDelta`, `veilCast`) y §14.5 (`SpoilerPolicy`, `SurfaceMechanism`, `VeilSpec`, `registerSpoilerGuard`, `stageAccessOf`); aquí solo se citan. Las líneas son las de HEAD `9c21885`, comprobadas en `dc6cf4b`, que solo añade ficheros de `docs/diseno/` (`git diff --stat 9c21885 dc6cf4b -- apps packages` vacío). Los ficheros sin carpeta son de `packages/db/src/` (`stageRun.ts`, que el encargo sitúa en `apps/api/src/tick/`, donde no existe; `economy.ts`, `browse.ts`, `ranking.ts`, `results.ts`, `schema.ts`, `riderSchedule.ts`, `raceOrders.ts`, `teamPlan.ts`, `tick.ts`, `rollover.ts`), de `apps/api/src/` (`app.ts`, `emails.ts`, `chronicle.ts`, `security.ts` y `routes/`) o de `apps/web/src/` (las pantallas `.tsx`, `queryClient.ts`, y en `domain/`, `raceTabs.ts`, `raceTimeline.ts`, `labels.ts`, `newsFeed.ts`); `contracts.ts` es `packages/shared/src/contracts.ts` salvo que se diga otra cosa. Las rutas que registra Fastify se han contado de nuevo con `l6/rutas.mjs` (L6, §14.5) y cada una se ha leído en su fichero; las medidas nuevas de esta sección y de §18 están en la carpeta `l7/` del scratchpad.

Cómo se lee la columna «Cierra»: el PR del plan que deja de mandar el dato (el servidor) y, detrás del punto, el que cambia la pantalla (la web). La propiedad es la del servidor: hasta el 9a la web de hoy recibe menos y pinta pestañas vacías, nunca un error (§14.1). El reparto entre PR es la decisión 11-a y §17 lo sigue. Cómo se lee «Banco»: B1a es el canario (ningún valor plantado en las filas del desenlace de una etapa velada, tiempo, premio, puntos e ids, sale en ninguna respuesta, y el nombre del ganador no sale en el título, las `og:` ni el correo; decisión 16-d), B1b el diferencial (correr la etapa no cambia un byte para quien no la ha visto, salvo la lista blanca con motivo), B1c los dos desenlaces (dos semillas con ganadores distintos dan respuestas idénticas byte a byte); su código es §16.3. La lista blanca de B1b es la de §11.18 y nada más: los campos de las rutas L cuya respuesta cambia al correrse una etapa, y lo que cambia solo porque el velo gana esa etapa. Una ruta L cuya respuesta no cambia (la vuelta de prueba, las órdenes, la lista de salida, la administración) no entra en ella: la vigila B1d, que exige su motivo en el registro.

### 11.1 Las 48 superficies del mapa 03 §4

Una fila por superficie, en el orden del mapa (I-29). «Qué ve» es lo que ve un espectador para quien la etapa está en el velo (§10.2); con la etapa conocida, fuera de guardia o caducada, cada superficie enseña lo de hoy, salvo el título, el correo y la puerta de entrada, que no dependen de conocerla (§11.8 a §11.10).

| Sup. | Pantalla (fichero y línea) | Qué enseña hoy | Ruta | Mecanismo | Qué ve quien no conoce la etapa (pantalla) | Cierra | Banco |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sup. E1` | pestaña por defecto `Story` (pantalla; `StageReplay.tsx` l. 345-346) y la crónica entera (`StageStory.tsx` l. 100-138) | ganador, fuga, captura y abandonos de golpe, con frases que saben el futuro | `GET /api/races/:raceId/stages/:day` (`routes/races.ts` l. 387-539), `chronicle` | B y G | abre en `Watch`; la voz llega por tramos y solo con lo revelado (§12.2); el acta vive en `/report` | 7b · 9a | B1a, B1c |
| `sup. E2` | podio de `Story` (`StageStory.tsx` l. 142-170) | los tres primeros | ídem, `results` | G | la pestaña `Report` enseña la puerta `not_seen` (`StageGateCard`) | 7b · 9a | B1a |
| `sup. E3` | «On the road today» (`StageStory.tsx` l. 86-99) | quién lleva cada maillot tras la N−1: destripa la etapa anterior | ídem, `leaders.onRoad` | G en la ruta de hoy (omite `leaders` entero, 14-e); P en la cabecera (`veilCast`, §10.10) | los maillots de salida solo si la N−1 es conocida; si no, la puerta `previous_unseen` (§11.12) | 7b · 9a | B13, B1c |
| `sup. E4` | pestaña `Result` (`StageReplay.tsx` l. 445-456) | orden de llegada, tiempos, fuera de control y abandonos | ídem, `results` | G | la puerta | 7b · 9a | B1a |
| `sup. E5` | pestaña `Classifications` (`StageReplay.tsx` l. 472-481) | general, puntos, montaña y equipos tras la N, con los maillots nuevos | ídem, `gc`, `points`, `kom`, `teamStage`, `teamGc`, `leaders.afterStage` | G | la puerta | 7b · 9a | B1a, B1b |
| `sup. E6` | `Finish` y el deslizador de la radio (`RaceRadioPanel.tsx` l. 387-419) | la foto de meta: grupos, huecos y quién va en cada uno | ídem, `radio` | G; desde el paso 11, B sobre lo alcanzado (11-i) | la pestaña `Race Radio` enseña la puerta | 7b · 9a | B1a, B16 |
| `sup. E7` | pestaña `Profile` con marcas (`StageReplay.tsx` l. 483-500) | los km de `attack`, `break`, `caught` y `finish` (`chronicle.ts` l. 169-175 y 1246-1250) | ídem, `altimetry` | N: `renderAltimetrySvg(profile)` sin marcas, como la etapa sin correr (`routes/races.ts` l. 432) | el perfil sin marcas | 7b | B1c |
| `sup. E8` | una sola respuesta con todo (`routes/races.ts` l. 519-537) y la caché de 30 min (`queryClient.ts` l. 17-26) | el resultado llega al navegador antes de mirar | ídem | B y G; `rev` en la clave (§10.9) y `private, no-store` (§14.9) | cabecera, tramos y meta por separado (§14.2) | 7b · 9a | B1a, B18 |
| `sup. E9` | `?tab=` y `?cls=` en la URL (`Tabs.tsx` l. 263-282; los leen `StageReplay.tsx` l. 265 y 346 y `Race.tsx` l. 442 y 599) | un enlace compartido abre directamente en `Result` o en una clasificación | la URL | G: la pestaña pedida no salta la puerta; el servidor no mira la URL | la puerta, con `?tab=result`, con `?cls=kom` o sin ellos | 7b · 9a (la etapa) y 9b (la carrera de un día) | `stageTables.test.tsx` con `?tab=result&cls=kom` (9a) y `raceTabs.test.ts` (9b); §11.19 y §16.6 |
| `sup. C1` | cabecera `Winner` (`Race.tsx` l. 720-729) | el ganador final | `GET /api/calendar/:raceId` (`routes/calendar.ts` l. 81-214), `gc` | P | `Finished · ready to watch` en lugar del ganador | 8a · 9b | B1a |
| `sup. C2` | clasificaciones por defecto (`raceTabs.ts` l. 31-35; `Race.tsx` l. 439-504) | la general de ahora con los maillots de ahora | ídem, `gc`, `points`, `kom`, `teamGc`, `leaders` | P (`throughStage`) | las tablas tras la k con `After stage 9 of 21 · stages 10-12 ready to watch` | 8a · 9b | B1b, B1c |
| `sup. C3` | la clásica terminada abre en `Result` (`raceTabs.ts` l. 47-51) | el ganador y el orden | ídem | G y P | la clásica no conocida abre en `Watch` (11-o) | 8a · 9b | B1a |
| `sup. C4` | pestaña `Stages` (`Race.tsx` l. 365-414) | el ganador de cada etapa | ídem, `stageWinners` | P | ganador de 1 a k; `Ready to watch` de k+1 a la última corrida; `Not raced yet` en las demás (`Race.tsx` l. 397) | 8a · 9b | B1a |
| `sup. C5` | `Roll of honour` (`Race.tsx` l. 550-569) | el ganador de esta temporada en cuanto se escribe el palmarés (`stageRun.ts` l. 1291-1307) | ídem, `history` | F | la edición de esta temporada no sale mientras su final esté velado | 8a | B1a, B1c |
| `sup. C6` | `Finished` y `Under way, X of N stages raced` (`Race.tsx` l. 571-575 y 737-741) | cuántas etapas se han corrido, no quién ganó | ídem, `status`, `runDays` | L: es calendario, no resultado | lo de hoy | 8a | lista blanca de B1b |
| `sup. I1` | el trofeo y el ganador de cada carrera en World → Races (`RacesIndex.tsx` l. 112-120) | el ganador de toda carrera terminada | `GET /api/calendar` (`routes/calendar.ts` l. 38-78), `winner` (`getSeasonWinners`, `ranking.ts` l. 564-577) | P | la fila sin ganador y `Finished · ready to watch` | 8a · 9b | B1a |
| `sup. I2` | campeonatos: el trofeo y `Winner: X` (`RacesIndex.tsx` l. 190-199) | el campeón nacional | ídem | P | como `sup. I1`; un nacional solo está en guardia si es propio o seguido | 8a · 9b | B1a |
| `sup. I3` | el buscador por ganador (`raceTimeline.ts` l. 49-58; `RacesIndex.tsx` l. 294) | escribir un nombre enseña lo que ganó | ídem | P | busca sobre la lista ya cortada: no casa con un ganador velado | 8a | B1a |
| `sup. I4` | My Team → Race calendar, vista de miembro (`TeamCalendar.tsx` l. 264-274 y 296) | el ganador | ídem | P | como `sup. I1` | 8a · 9b | B1a |
| `sup. N1` | titulares de `News` (`News.tsx` l. 60-80) | «X wins stage 4 of the Race Y» y todo lo demás | `GET /api/news` (`routes/rankings.ts` l. 63-72) | F | sin las filas veladas y con un `stage_ready` por etapa velada (§11.7); `gc_lead_taken` y `jersey_taken` solo a quien le aplica el velo, y con él filtrados (17-x) | 8a · 9b | B1a, B1c |
| `sup. N2` | la familia de cada titular (`labels.ts` l. 167-185) | `Overall`, `Stage` o `Mountains` dicen qué pasó | ídem | F | el marcador lleva la familia `Watch`, igual para todos | 8a · 9b | B1c |
| `sup. N3` | los desplegables de filtro (`News.tsx` l. 104-130) | la lista de corredores del feed es la de ganadores | ídem | F | se construyen con lo servido, ya filtrado | 9b | B1c |
| `sup. N4` | `Recent news` y `History` del equipo (`Team.tsx` l. 136-149; `TeamIdentity.tsx` l. 177-194) | titulares del equipo | `GET /api/teams/:id/news` (`routes/teams.ts` l. 131-135) | F | como `sup. N1`; el marcador sale por lista de salida, nunca por noticia (11-g) | 8a · 9b | B1c |
| `sup. H1` | `Last race` de la portada (`Home.tsx` l. 144-185) | puesto, diferencia, «in the action at km N» y veredicto; `Full story →` abre `Story` | `GET /api/riders/me/last-race` (`routes/riders.ts` l. 198-205) | P y G | la última etapa CONOCIDA; si la última corrida está velada, `Your last race · Race France, Stage 8 · Ready to watch` | 8a · 9b | B1a |
| `sup. H2` | `Season points` y `Money` de la portada (`Home.tsx` l. 239-245) | los puntos y el premio de la etapa | `GET /api/riders/me/summary` (`routes/riders.ts` l. 509-515) | R (`VeilDelta.points`, `.money`) | las cifras de antes de la etapa | 8b | B1b |
| `sup. H3` | la condición: estrellas, frescura, cerillos, moral y `FormChart` (`Home.tsx` l. 278-297; `RiderProfile.tsx` l. 181-265) | el cambio de forma de la etapa y, tras una caída, `Injured` | `GET /api/riders/me/form` (`routes/riders.ts` l. 425-437) | L para la condición (DD-08); M para la salud | la condición como hoy; la salud, la de antes de la caída velada | 8b | lista blanca de B1b; B1c |
| `sup. H4` | «Where the energy went» (`RiderProfile.tsx` l. 272-277; `RaceEffortLog.tsx` l. 16-22) | cuánto atacó, relevó y peleó pancartas | ídem, `log[].parte` | F (`VeilDelta.raceDays`) | sin el parte de los días de carrera velados, que siguen siendo días de carrera (11-e) | 8b | B1a, B1c |
| `sup. H5` | `LastRaceReport` de la ficha propia (`RiderProfile.tsx` l. 501; `LastRaceReport.tsx` l. 10-110) | puesto, «X took the win» y los sucesos propios | `GET /api/riders/me/last-race` | P y G | como `sup. H1` | 8a · 9b | B1a |
| `sup. H6` | `Finances` (`Finances.tsx` l. 94-123) | «Race · stage win», «Race · GC #2» con su importe (`economy.ts` l. 164-183) | `GET /api/riders/me/ledger` (`routes/riders.ts` l. 518-530) | F y R | sin los apuntes de etapas veladas; el saldo es la suma de lo visible | 8b | B1a, B1b |
| `sup. H7` | My races → Results (`MyRaces.tsx` l. 374-471) | general «so far» y etapas propias, con oro en la victoria | `GET /api/riders/:id/results` (`routes/riders.ts` l. 672-676) | F y P | la carrera en guardia hasta la k y una fila `Race France · 3 stages to watch` | 8a · 9b | B1a, B1c |
| `sup. P1` | `Season rank` y `Season points` de la ficha (`RiderProfile.tsx` l. 420-444) | los puntos de la etapa | `GET /api/riders/:id` (`routes/riders.ts` l. 678-687) | R: el puesto se recalcula sobre el ranking a horizonte | cifras y puesto de antes de la etapa | 8b | B1b |
| `sup. P2` | logros con su `<title>` (`Badges.tsx` l. 5-25) | los logros que da el palmarés | `GET /api/riders/:id/badges` (l. 657-661) | R: sobre el palmarés visible | los logros de lo conocido | 8b | B1b |
| `sup. P3` | `Palmarès` (`RiderProfile.tsx` l. 473-488; `TeamSquad.tsx` l. 84-101) | `Stage win`, `Overall win` | `GET /api/riders/:id/palmares` y `/api/riders/me/palmares` (l. 664-669 y 500-506) | F (`VeilDelta.palmares`) | sin las filas veladas, con el aviso común de §11.6 | 8a | B1a |
| `sup. P4` | `Recent results` de cualquiera (`RaceResults.tsx` l. 30-128) | general y etapas | `GET /api/riders/:id/results` | F y P | una fila `Race France · 3 stages to watch` para todos los de su lista de salida | 8a · 9b | B1c |
| `sup. P5` | `Injured · until GD N` (`RiderProfile.tsx` l. 73-79; `Team.tsx` l. 116-122; `TeamSquad.tsx` l. 122-126) | la caída de la etapa | `GET /api/riders/:id`, `/api/teams/:id`, `/api/countries/:code` | M (`VeilDelta.health`: `prevHealth` y `prevUntilDay` de la noticia `injury`) | la salud de antes de la caída | 8b | B1c |
| `sup. P6` | puntos, presupuesto y puesto del equipo (`Team.tsx` l. 70-76 y 127-129; `TeamSquad.tsx` l. 131-133 y 196; `TeamIdentity.tsx` l. 153-156; `TeamCalendar.tsx` l. 151-175) | puntos y premios de equipo (`economy.ts` l. 153-161) | `GET /api/teams`, `/api/teams/:id`, `/api/teams/me/calendar` | R (`VeilDelta.points`; `.budget` con `stage_team_results.prize`) | cifras de antes de la etapa; las listas, reordenadas (11-f) | 8b | B1b |
| `sup. W1` | rankings mundial y sub-23 (`Rankings.tsx` l. 20-57 y 129-182) | los puntos de la etapa | `GET /api/rankings`, `/api/rankings/young` (`routes/rankings.ts` l. 27-39) | R | `World ranking · as you know it · 3 stages hidden · Manage` | 8b · 9b | B1b, B1c |
| `sup. W2` | `Season awards` (`Rankings.tsx` l. 59-110) | mejor del año, sprinter, escalador y revelación | `GET /api/season-awards` (l. 41-46) | R | sobre puntos y palmarés a horizonte | 8b | B1b |
| `sup. W3` | palmarés de la vuelta de prueba (`Rankings.tsx` l. 112-127) | el ganador | `GET /api/races/test-tour/history` (`routes/races.ts` l. 175-180) | L: la vuelta de prueba no entra nunca en guardia (§10.4) | lo de hoy | 8a | B1d (L con motivo; su respuesta no cambia con la etapa, §11.18) |
| `sup. W4` | `Hall of Fame` y récords (`HallOfFame.tsx` l. 8-137) | victorias acumuladas; `Youngest overall winner` con su carrera | `GET /api/hall-of-fame`, `/api/records` (l. 48-60) | R: sin `VeilDelta.palmares` | cuentas y récords de lo conocido | 8b | B1b |
| `sup. W5` | naciones y lista de equipos (`Countries.tsx` l. 36; `Country.tsx` l. 41-84; `Teams.tsx` l. 41) | puntos por país y por equipo | `GET /api/countries`, `/api/countries/:code`, `/api/teams` | R | sumas a horizonte, reordenadas | 8b | B1b |
| `sup. W6` | rivales por fama en las órdenes (`packages/db/src/raceOrders.ts` l. 86-92) | nada: `riders.fame` no se escribe (`rollover.ts` l. 60 y 293) | `GET /api/my-orders` (`routes/races.ts` l. 286-364) | L | lo de hoy | 8a | B1d (L con motivo; su respuesta no cambia con la etapa, §11.18) |
| `sup. T1` | título de la pestaña (`apps/web/index.html` l. 7) | nada hoy: fijo | estático | N: `usePageTitle` con `PreStageInfo` (§11.8) | `Stage 7 · Race France · Cycling Star` | 9a | `pageTitle.test.ts` (§11.8), B1a |
| `sup. T2` | favicon (`index.html` l. 5) | nada: estático | estático | N | el de siempre; nunca un contador de resultados | 9a | revisión |
| `sup. T3` | `<title>` del maillot (`Jersey.tsx` l. 110), la bandera (`Flag.tsx` l. 36), el logro (`Badges.tsx` l. 16) y `Winner: X` de `sup. I2` | los de maillot y de ganador | los de su tabla | el de su tabla | lo que su tabla deje ver | con su tabla | el de su tabla |
| `sup. T4` | el `badge` de las pestañas (`Tabs.tsx` l. 78-79, 118, 131 y 216) | nada hoy: nadie lo usa | | N | cuenta etapas por ver, nunca resultados | 9b | B1c |
| `sup. T5` | correo (`emails.ts` l. 64, 90 y 116) | nada hoy: tres correos de cuenta | | N: `stageReadyEmail` con `PreStageInfo` (§11.9) | `Stage 7 of Race France is ready to watch` | 9a (plantilla; el envío es de E4) | B1a |
| `sup. T6` | notificaciones, service worker, Badging API | nada: no existen (grep, mapa 03 §4) | | N: la regla del correo | | | |

**Las siete que hoy no destripan** (X-17: son 48 filas exactas, pero siete no enseñan ningún resultado). `sup. C6` dice cuántas etapas se han corrido, que es calendario: el tick corre las etapas a su día, y cualquiera sabe qué día es (la cabecera del mundo lo dice, `WorldClock.tsx`); queda libre (L) y en la lista blanca de B1b. `sup. W6` ordena por una columna que no se escribe en ninguna parte (`rollover.ts` l. 60 y 293; `MUERTAS_CONOCIDAS`, `columnasVivas.test.ts` l. 34-38): el día que alguien la escriba con resultados, `columnasVivas.test.ts` obliga a sacarla de la lista de muertas y B1b detecta que la lista cambia con la etapa. `sup. T1`, `sup. T2`, `sup. T4`, `sup. T5` y `sup. T6` no enseñan nada hoy porque no existen o son estáticos, y E2 las crea o las toca: por eso llevan mecanismo N, que es una regla de tipo (la entrada no puede llevar un resultado) y no una ausencia. El título se escribe con `PreStageInfo`, que no tiene campo de resultado (§11.8); el contador de `Tabs.tsx` cuenta etapas por ver, que depende del horizonte y no de lo que pasó; el correo sale de la misma `PreStageInfo` y su envío no mira el resultado (§11.9); una notificación futura (E4) usará `stageReadyNotice` y nada más.

**Lo que se cierra en cada PR** (11-a). El 7b cierra la etapa (`sup. E1` a `sup. E8`): la ruta de hoy deja de mandar el resultado cuando la pantalla no lo va a enseñar (`stageAccessOf`, §14.1), el acta da 403 con la puerta y los tramos no pasan de lo alcanzado. El 8a pone el registro con la política de todas las rutas (B1d en verde) y los mecanismos que ya tienen su lectura (P, F, G y N): la ficha y el índice de carreras (`sup. C1` a `sup. C5`, `sup. I1` a `sup. I4`), las noticias (`sup. N1` a `sup. N4`), el palmarés y los resultados de un corredor (`sup. P3`, `sup. P4`, `sup. H7`) y la última carrera (`sup. H1`, `sup. H5`). El 8b pone las restas y las máscaras, que necesitan `veilDelta` y la `0046`: rankings, premios, naciones, equipos, puntos, dinero, presupuesto y salud (`sup. H2`, `sup. H3`, `sup. H4`, `sup. H6`, `sup. P1`, `sup. P2`, `sup. P5`, `sup. P6`, `sup. W1`, `sup. W2`, `sup. W4`, `sup. W5`) y las puertas de 11.2; con él B1a, B1b y B1c pasan en verde en todas las rutas y el destripe queda cerrado en el servidor (D-54). El 9a cambia la web que enseña la etapa (la puerta, `Report`, `/report`, `?tab=`, el título, la caché y la vista previa) y el 9b, la que enseña el mundo (la portada, los avisos de los agregados, las noticias con marcador, las órdenes, el contador y la ficha de la carrera de un día, con `raceTabs` y su redirección: `sup. C3` y la mitad de `sup. E9`).

### 11.2 Las nueve puertas de fuera del inventario, y dos más

El mapa 03 §4 recorre lo que la web pinta; `producto.md` §1.7 y §7.5 encontraron nueve sitios más por donde el resultado sale sin estar en esa lista, y los jueces los comprobaron en el código (I-29, O-32; `learning.ts` l. 106-111, `riderSchedule.ts` l. 217, `routes/riders.ts` l. 648, `browse.ts` l. 234). Leyendo las rutas una a una para 11.3 ha aparecido una décima, `sup. X10`, que ninguna propuesta listaba: el planificador de entrenamiento sabe que tu corredor abandonó (decisión 11-b). Y barriendo con el código de hoy el mundo de B1 (§16.3) antes y después de correr su etapa velada, una undécima, `sup. X11`: la ficha de cualquier corredor manda sus atributos, y lo aprendido en la etapa velada ya está dentro (decisión 11-r).

| Sup. | Dónde (fichero y línea) | Qué enseña hoy | Mecanismo y qué ve quien no conoce la etapa | Cierra | Banco |
| --- | --- | --- | --- | --- | --- |
| `sup. X1` | el informe del bloque y la tendencia: `GET /api/riders/me/report` y `/trend` (`routes/riders.ts` l. 447-477), con `getBlockReport` y `getAttrTrend` (`packages/db/src/riders.ts` l. 517 y 366) | lo aprendido en carrera, que se multiplica por el puesto (TAC ×1,8 al ganar y ×1,4 en el top 10: `world/learning.ts` l. 106-111, `LEARNING.resultTacWin` y `resultTacTop10`, `constants.ts` l. 2095-2096) y por 0,5 al abandonar (`LEARNING.dnfFactor`: `learning.ts` l. 99-104, `constants.ts` l. 2093), la sobrecompensación de quien termina una gran vuelta (`stageRun.ts` l. 826-852) y la lista de sesiones del bloque, con una entrada por etapa corrida (`carrera:race-france:e5 ×1`, pantalla; `BlockReport.tsx` l. 79-82), a la que tras un abandono le faltan las etapas siguientes | F: fuera las filas de `rider_attr_log` con `source` `carrera` o `sobrecompensacion` de los días de `VeilDelta.raceDays`; los días de carrera velados cuentan como días de carrera, con la clave de su etapa (11-e, §11.13) | 8b | B1a, B1c |
| `sup. X2` | `GET /api/riders/me/upcoming-races` (`routes/riders.ts` l. 134-142; `getRiderUpcomingRaces`, `riderSchedule.ts` l. 193-230), que alimenta la portada (`buildDashboard`) y el acceso a las órdenes | la carrera desaparece de «tus carreras» al día siguiente de que su corredor abandone (`riderSchedule.ts` l. 217) | M (`VeilDelta.abandons`): la carrera sigue en curso mientras la etapa del abandono esté velada; unas órdenes para un corredor retirado se ignoran sin daño | 8b | B1c |
| `sup. X3` | la sesión de 7 días (`create-context.mjs` l. 146-147; `auth.ts` sin `session`, l. 102-223) | quien vuelve tras una semana llega sin sesión, y `/news`, `/world` y los rankings, públicos (`App.tsx` l. 130 y 208-219), le cuentan quién ganó antes de entrar | `cs_viewer`: el horizonte del jugador en lectura (§10.8), con `Sign in to see results as you know them` (pantalla) | 7a · 9a | B12 |
| `sup. X4` | `GET /api/free-agents` y toda lista con `seasonPoints` (`getFreeAgents`, `browse.ts` l. 210-245, ordenada por puntos en l. 234) | los puntos de la etapa y el orden que dan | R, con el orden rehecho y el tope de 11-f | 8b | B1b |
| `sup. X5` | la caché de React Query (`queryClient.ts` l. 17-46 y 74-79; `Account.tsx` l. 311-314) | la ficha que vio una cuenta la ve la siguiente en el mismo navegador durante 30 min | `rev` en las claves, `clear()` al entrar y salir, `private, no-store` y `Vary: Cookie` (§10.9, §14.9) | 9a | `queryKeys.test.ts` (§14.11) |
| `sup. X6` | el historial y el autocompletado del navegador | títulos y URL quedan guardados y los ve cualquiera que use ese navegador | títulos y URL neutros, también con la etapa conocida (§11.8) | 9a | `pageTitle.test.ts`, B1a |
| `sup. X7` | la vista previa de un enlace compartido (el fallback de la SPA, `app.ts` l. 204-213; `index.html` l. 7) | hoy es genérica; con el acta compartida llevaría el ganador | título y `og:` inyectados por `shellMetaFor` (§14.10): neutros, salvo el acta fuera del velo de quien pide, marcada `Spoiler` (pantalla; DD-12) | 9a | B1a |
| `sup. X8` | `GET /api/teams/me/calendar` con el presupuesto (`routes/teams.ts` l. 63-70; `getTeamCalendar`, `teamPlan.ts` l. 263) | el premio de equipo de la etapa, que `creditTeam` suma al presupuesto sin libro (`economy.ts` l. 154-161) | R con `stage_team_results.prize` (`0046`, D-41) | 8b | B1b |
| `sup. X9` | `POST /api/riders/me/races/:raceKey/retire` (`routes/riders.ts` l. 631-653; `retireFromRace`, `riderSchedule.ts` l. 258-313) | `alreadyOut: true` (l. 648) dice que su corredor ya abandonó | M: con el abandono velado, la respuesta de una retirada normal, `alreadyOut: false`, sin escribir nada (11-j) | 8b | B1c |
| `sup. X10` | el planificador y su proyección: `GET /api/riders/me/orders` (`routes/riders.ts` l. 220-261, `raceDays` en l. 242) y `POST /api/riders/me/plan/preview` (l. 334-387, `arrivals` en l. 376), las dos con `getRiderRaceDays` (`riderSchedule.ts` l. 17-55) | tras un abandono, los días que quedaban de su carrera dejan de ser de carrera (l. 47) y el plan los ofrece para entrenar: el abandono se ve en la pantalla de entrenar | M (`VeilDelta.abandons`): esos días siguen siendo de carrera mientras la etapa del abandono esté velada | 8b | B1c |
| `sup. X11` | la ficha de cualquier corredor: `GET /api/riders/:id` (`routes/riders.ts` l. 678-687) con `getPublicRider`, que lee `rider_attrs.value` tal cual (`browse.ts` l. 297-303; la columna es `real`, `schema.ts` l. 351), y el panel `Attributes` (`RiderProfile.tsx` l. 451-458: medias estrellas para un corredor ajeno y, para el propio, además la marca de progreso) | lo aprendido en la etapa, que `runOneStage` escribe en la misma transacción que el resultado (`stageRun.ts` l. 790-805 y 891-897), con TAC ×1,8 al ganar y ×1,4 en el top 10 (`learning.ts` l. 106-110). Medido con el código de hoy en el mundo de B1 (`rcod/n/b1/attrs.mjs`, dos corridas iguales): al correrse la etapa velada, TAC sube +0,41 en `OWN_RIDER`, +0,37 en `idDe(5)` y +0,39 en el ganador, y LLA, MON y DES, de +0,04 a +0,30; el ganador no es el que más sube | L (DD-08, que cubre también la ficha ajena; 11-r): el valor de hoy. Velarlo exigiría restar las filas `carrera` y `sobrecompensacion` de `rider_attr_log` de los días velados, que `purgeAttrLog` borra a los 60 días (`tick.ts` l. 171-178), mientras una etapa de gran vuelta sigue velada hasta 56 días después de la ÚLTIMA de su carrera (§10.5) | 8a | lista blanca de B1b; B1c |

Tres de estas puertas tienen una consecuencia que conviene decir. `sup. X2` y `sup. X10` enmascaran el mismo hecho (el abandono) en dos pantallas, y tienen que hacerlo a la vez: si una lo enmascara y la otra no, la otra delata. Por eso las dos leen el mismo `VeilDelta.abandons` (§10.6), que excluye la retirada voluntaria (decisión 10-i): la retirada es un acto del propio jugador y no un resultado. `sup. X9` deja una incoherencia aceptada: quien retira a un corredor que ya había abandonado en una etapa velada recibe la respuesta de una retirada normal, y la carrera sigue en «tus carreras» hasta que conozca la etapa del abandono, porque la máscara de `sup. X2` sigue en pie; es el precio de no destriparle la caída con un botón. Y `sup. X1` no deja de ser una pista: el valor absoluto de los atributos (`GET /api/riders/me`, `sup. H3`, y el de cualquier corredor en su ficha, `sup. X11`) se mueve con lo aprendido en carrera y se enseña (DD-08), así que quien compare el valor de ayer y el de hoy sabe que algo pasó; lo que se esconde es lo que dice el resultado, el ×1,8 de la victoria, y el dueño lo decide en DD-08 con esa cifra. La ficha ajena queda libre por la misma decisión (11-r): la subida de una etapa no dice quién ganó (en la medida de `sup. X11` el ganador no es el que más sube), la web solo la pinta en medias estrellas, y la única forma de velarla, restar `rider_attr_log`, no llega a las etapas veladas más de 60 días.

### 11.3 Las rutas, una a una

Fastify registra hoy 87 rutas de nuestro código (52 `GET`, 21 `POST`, 8 `PUT`, 4 `DELETE`, un `PATCH` y el comodín `GET` y `POST` de `/api/auth/*`), más las 53 `HEAD` que crea solo por cada `GET` y que heredan su `config` (medido por L6, `l6/rutas.mjs`, §14.5), y la ruta `/*` de `@fastify/static` cuando sirve la web. E2 añade nueve (§14.2). Esta es la tabla completa, con la clase de destripe (`config.spoiler`, `SpoilerPolicy`) y el mecanismo (`config.veil`, `VeilSpec`) de cada una: la lista que B1d escribe en su propio test y compara con `app.spoilerRegistry` (§14.5, §16.3), de modo que una ruta nueva o un cambio de clase deja rastro en el diff. Las rutas `safe` llevan N salvo que se diga otra cosa; con L, el motivo que va en `config.veil.why` es el de la columna. Todas se declaran en el PR 8a, cuando el registro empieza a lanzar al arrancar; la columna «Mecanismo en» dice en qué PR empieza a actuar el mecanismo cuando no es N.

Cómo se ha clasificado cada una: se ha leído su manejador y la función de `packages/db` que llama, y se ha mirado si lo que devuelve cambia porque se corrió una etapa. Ocho lecturas hechas así cambian algo de lo que decían las propuestas o §10.6, y cada una lleva su nota debajo de la tabla.

| Método y ruta | Fichero y línea | Clase | Mecanismo (`config.veil`) | Superficies | Mecanismo en |
| --- | --- | --- | --- | --- | --- |
| `GET /health` | `routes/health.ts` l. 16 | `safe` | N; gana `features` (§14.6) | | 3a |
| `GET /api/names/generate` | `routes/riders.ts` l. 113 | `safe` | N | | |
| `GET /api/geo/country` | `routes/geo.ts` l. 75 | `safe` | N | | |
| `GET, POST /api/auth/*` | `routes/authProxy.ts` l. 50-55 | `safe` | N; `sign-out` borra `cs_viewer` (§10.8) | `sup. X3` | 7a |
| `POST /api/auth/sign-in/email`, `sign-up/email`, `request-password-reset`, `send-verification-email`, `reset-password`, `change-password`, `change-email` y `delete-user` (ocho rutas) | `routes/authProxy.ts` l. 47 | `safe` | N; `delete-user` borra `cs_viewer` | `sup. X3` | 7a |
| `GET /api/admin/whoami` | `routes/admin.ts` l. 60 | `horizon` | L: solo administradores (`requireAdmin`, `security.ts` l. 90-110), con `worldHorizon` | | |
| `GET /api/admin/users` | l. 67 | `horizon` | L (ídem) | | |
| `PATCH /api/admin/users/:id` | l. 74 | `horizon` | L (ídem) | | |
| `DELETE /api/admin/users/:id` | l. 88 | `horizon` | L (ídem) | | |
| `POST /admin/tick` | l. 108 | `horizon` | L (ídem): el resumen del tick (`tick.ts` l. 52-58) | | |
| `POST /admin/advance` | l. 119 | `horizon` | L (ídem) | | |
| `GET /api/admin/blocklist` | l. 129 | `horizon` | L (ídem) | | |
| `POST /api/admin/blocklist` | l. 136 | `horizon` | L (ídem) | | |
| `DELETE /api/admin/blocklist/:id` | l. 145 | `horizon` | L (ídem) | | |
| `GET /api/admin/health` | l. 154 | `horizon` | L (ídem): el día, el censo y los últimos ticks (`getWorldHealth`) | | |
| `POST /api/admin/premium` | l. 160 | `horizon` | L (ídem) | | |
| `GET /api/admin/stage-snapshot/:raceId/:day` | l. 186-187 | `horizon` | L (ídem): la semilla y la entrada de una etapa corrida | | |
| `POST /api/world/advance` | `routes/world.ts` l. 21 | `horizon` | L (ídem): exige `ADMIN_TOKEN` | | |
| `GET /api/calendar` | `routes/calendar.ts` l. 38 | `horizon` | P | `sup. I1` a `sup. I4` | 8a |
| `GET /api/calendar/:raceId` | l. 81 | `horizon` | P, F y L: `status` y `runDays` son calendario | `sup. C1` a `sup. C6` | 8a |
| `GET /api/calendar/:raceId/startlist` | l. 220-221 | `horizon` | L: solo antes de la salida; la lista se congela con el mundo al día (`worldHorizon`, §10.6) | | |
| `GET /api/races/test-tour` | `routes/races.ts` l. 137 | `safe` | N: etapas con su altimetría sin marcas y las órdenes propias | | |
| `PUT /api/races/test-tour/orders` | l. 160 | `safe` | N | | |
| `GET /api/races/test-tour/history` | l. 175 | `horizon` | L: la vuelta de prueba nunca entra en guardia (§10.4) | `sup. W3` | |
| `GET /api/races/test-tour/results` | l. 182 | `horizon` | L (ídem) | | |
| `GET /api/races/test-tour/stages/:day` | l. 201-202 | `horizon` | L (ídem) | | |
| `GET /api/my-orders` | l. 286 | `safe` | N y L: rivales por fama, que no se escribe (`sup. W6`) | `sup. W6` | |
| `PUT /api/my-orders` | l. 366 | `safe` | N | | |
| `GET /api/races/:raceId/stages/:day` | l. 387-388 | `horizon` | G y P (`stageAccessOf`, §14.1) | `sup. E1` a `sup. E9` | 7b |
| `GET /api/rankings` | `routes/rankings.ts` l. 27 | `horizon` | R | `sup. W1` | 8b |
| `GET /api/rankings/young` | l. 34 | `horizon` | R | `sup. W1` | 8b |
| `GET /api/season-awards` | l. 41 | `horizon` | R | `sup. W2` | 8b |
| `GET /api/hall-of-fame` | l. 48 | `horizon` | R | `sup. W4` | 8b |
| `GET /api/records` | l. 55 | `horizon` | R | `sup. W4` | 8b |
| `GET /api/news` | l. 63 | `horizon` | F; `leaderNews: request.spoilerApplies()` (17-x) | `sup. N1` a `sup. N3` | 8a |
| `GET /api/countries` | l. 75 | `horizon` | R | `sup. W5` | 8b |
| `GET /api/countries/:code` | l. 81 | `horizon` | R y M | `sup. W5`, `sup. P5` | 8b |
| `GET /api/free-agents` | l. 92-93 | `horizon` | R | `sup. X4` | 8b |
| `GET /api/riders/me` | `routes/riders.ts` l. 127 | `horizon` | L: los atributos del corredor propio se enseñan aunque los mueva lo aprendido en carrera (DD-08) | `sup. H3` | |
| `GET /api/riders/me/upcoming-races` | l. 134 | `horizon` | M | `sup. X2` | 8b |
| `GET /api/me/team-control` | l. 145 | `safe` | N | | |
| `POST /api/riders` | l. 152 | `safe` | N | | |
| `GET /api/riders/me/last-race` | l. 198 | `horizon` | P y G | `sup. H1`, `sup. H5` | 8a |
| `PUT /api/riders/me/archetype` | l. 208 | `safe` | N | | |
| `GET /api/riders/me/orders` | l. 220 | `horizon` | M | `sup. X10` | 8b |
| `PUT /api/riders/me/orders` | l. 263 | `safe` | N | | |
| `GET /api/riders/me/plan` | l. 298 | `safe` | N | | |
| `PUT /api/riders/me/plan` | l. 312 | `safe` | N | | |
| `POST /api/riders/me/plan/preview` | l. 334 | `horizon` | M | `sup. X10` | 8b |
| `GET /api/me/team-training` | l. 390 | `safe` | N | | |
| `PUT /api/me/team-training` | l. 412 | `safe` | N | | |
| `GET /api/riders/me/form` | l. 425 | `horizon` | L (la condición, DD-08), F (el parte) y M (la actividad de los días velados, 11-e, y la salud) | `sup. H3`, `sup. H4` | 8b |
| `GET /api/riders/me/trend` | l. 447 | `horizon` | F | `sup. X1` | 8b |
| `GET /api/riders/me/coach-view` | l. 457 | `safe` | L (DD-08): las opiniones de techo salen de la semilla (`packages/db/src/riders.ts` l. 408 y 465), pero las notas (`coachNotes`, `packages/engine/src/coachView.ts` l. 73-85, llamada en `riders.ts` l. 468-477) miran REC y el atributo de la carta, que mueve lo aprendido en carrera | `sup. H3` | |
| `GET /api/riders/me/report` | l. 469 | `horizon` | F | `sup. X1` | 8b |
| `GET /api/riders/me/race-prefs` | l. 479 | `safe` | L: la convocatoria de una carrera futura se decide con los puntos del mundo al día (`packages/db/src/callups.ts` l. 130-158) y no nombra ninguna etapa | | |
| `PUT /api/riders/me/race-prefs` | l. 488 | `safe` | N | | |
| `GET /api/riders/me/palmares` | l. 500 | `horizon` | F | `sup. P3` | 8a |
| `GET /api/riders/me/summary` | l. 509 | `horizon` | R | `sup. H2`, `sup. P1` | 8b |
| `GET /api/riders/me/ledger` | l. 518 | `horizon` | F y R | `sup. H6` | 8b |
| `GET /api/riders/me/offers` | l. 533 | `safe` | L: las ofertas salen del rating del corredor y del presupuesto de los equipos (`packages/db/src/contracts.ts` l. 99-175), que se mueven con todo el mundo; no dicen el resultado de ninguna etapa | | |
| `POST /api/riders/me/offers/:id/accept` | l. 541-542 | `safe` | N | | |
| `POST /api/riders/me/offers/:id/reject` | l. 559-560 | `safe` | N | | |
| `GET /api/riders/me/race-entries` | l. 581 | `safe` | N: las carreras continentales en las que puede inscribirse, con su viaje | | |
| `POST /api/riders/me/race-entries/:raceId` | l. 590-591 | `safe` | N | | |
| `DELETE /api/riders/me/race-entries/:raceId` | l. 606-607 | `safe` | N | | |
| `POST /api/riders/me/races/:raceKey/retire` | l. 631-632 | `horizon` | M | `sup. X9` | 8b |
| `GET /api/riders/:id/badges` | l. 657 | `horizon` | R | `sup. P2` | 8b |
| `GET /api/riders/:id/palmares` | l. 664 | `horizon` | F | `sup. P3` | 8a |
| `GET /api/riders/:id/results` | l. 672 | `horizon` | F y P | `sup. P4`, `sup. H7` | 8a |
| `GET /api/riders/:id` | l. 678 | `horizon` | R, M y L (los atributos, DD-08) | `sup. P1`, `sup. P5`, `sup. X11` | 8b |
| `POST /api/teams/take-over` | `routes/teams.ts` l. 36 | `safe` | N | | |
| `PUT /api/teams/me` | l. 48 | `safe` | N | | |
| `GET /api/teams/me/calendar` | l. 63 | `horizon` | R | `sup. X8`, `sup. P6` | 8b |
| `GET /api/teams/me/race-plan` | l. 77 | `safe` | N: el programa del equipo sin dinero (11-k) | | |
| `POST /api/teams/me/calendar/:raceId` | l. 85-86 | `safe` | N | | |
| `DELETE /api/teams/me/calendar/:raceId` | l. 100-101 | `safe` | N | | |
| `GET /api/teams` | l. 116 | `horizon` | R | `sup. P6`, `sup. W5` | 8b |
| `GET /api/teams/:id` | l. 122 | `horizon` | R y M | `sup. P5`, `sup. P6` | 8b |
| `GET /api/teams/:id/news` | l. 131 | `horizon` | F; `leaderNews: request.spoilerApplies()` (17-x) | `sup. N4` | 8a |
| `GET /api/races/:raceId/stages/:day/broadcast` (nueva) | `routes/broadcast.ts` | `watch` | B y G | `sup. E1`, `sup. E3`, `sup. E8` | 3a; el límite de lo alcanzado, 7b |
| `GET /api/races/:raceId/stages/:day/broadcast/chunk` (nueva) | ídem | `watch` | B | `sup. E1`, `sup. E8` | 3a · 7b |
| `POST /api/races/:raceId/stages/:day/broadcast/finish` (nueva) | ídem | `watch` | G | `sup. E2`, `sup. E4`, `sup. E5` | 3a · 7b |
| `GET /api/races/:raceId/stages/:day/report` (nueva) | ídem | `watch` | G | `sup. E1`, `sup. E2`, `sup. E4` a `sup. E6` | 3a · 7b |
| `POST /api/me/watch/:raceKey/:day` (nueva) | `routes/me.ts` | `watch` | B | | 7a |
| `POST /api/me/reveal/:raceKey/:day` (nueva) | ídem | `watch` | G | | 7a |
| `PUT /api/me/follow/:raceKey` (nueva) | ídem | `safe` | N | | 7a |
| `PUT /api/me/spoiler-scope` (nueva) | ídem | `safe` | N | | 7a |
| `GET /api/me/horizon` (nueva) | ídem | `horizon` | N: solo el horizonte del propio espectador | la portada (§11.4) | 7a |
| `GET, HEAD /*` (la web compilada) | `app.ts` l. 204 | `safe`, clasificada sola (`STATIC_ROUTES`, §14.5) | N | | |

Las ocho notas. **Las rutas de administración** son `horizon` con L, todas y no solo las que devuelven datos de una etapa, como fija §14.5: así llevan `private, no-store` y nadie tiene que decidir ruta a ruta qué dato de administración es de juego; el motivo es el mismo en las trece. **La vuelta de prueba** (`test-tour`, sin temporada en su clave) queda en L porque §10.4 la deja fuera de toda guardia; sus rutas piden sesión y son una herramienta de la alfa. **`GET /api/my-orders`** no devuelve nada nacido de una etapa: sus compañeros y rivales salen de la lista de salida sin mirar el abandono (`getRosterTeammates` y `getRaceRivals`, `raceOrders.ts` l. 44-93) y sus etapas llevan la altimetría sin marcas y el parte meteorológico (`routes/races.ts` l. 321-363); lo único dudoso es el orden por fama, y la fama no se escribe. **`GET /api/riders/me/orders`** y **`POST /api/riders/me/plan/preview`** no estaban en ninguna tabla: son `sup. X10`. **`GET /api/riders/me/race-prefs`** y **`/offers`** quedan en L con su motivo: el mundo que decide una convocatoria o una oferta se mueve con todas las carreras, pero ninguna de las dos respuestas nombra una etapa, y esconderlas dejaría al jugador sin poder decidir su calendario ni su contrato; §10.6 no las lista porque no leen ninguna fuente de D-32. **`GET /api/teams/me/race-plan`** es `safe`: su función no lee `teams.budget` (`teamPlan.ts` l. 151-205; el tipo que devuelve es «sin dinero», l. 115-128), y la fila de §10.6 que la pone junto a `getTeamCalendar` con R vale solo para esta última (11-k; §10.6 ya lo recoge). **`GET /api/riders/me/coach-view`** y los atributos de **`GET /api/riders/:id`** se mueven con la etapa aunque no lo parezca: las notas del preparador salen de los atributos de hoy (`coachNotes`, `packages/engine/src/coachView.ts` l. 73-85: REC de 70 o más, o el atributo de la carta cerca de su techo), y la ficha de cualquier corredor manda los suyos tal cual (`sup. X11`); una etapa velada que suba REC por encima de 70 cambia la opinión del preparador. Las dos quedan en L con el motivo de DD-08 y en la lista blanca de B1b (§11.18; decisión 11-r). **Las rutas `safe` que escriben** (`PUT` de órdenes, planes, preferencias y equipo) devuelven `{ ok }` o lo que el propio jugador acaba de guardar (por ejemplo `{ ok: true, saved }`, `routes/riders.ts` l. 286): no hay nada que velar, y la única escritura que devuelve un dato de carrera es la retirada (`sup. X9`).

### 11.4 La portada

La portada de un jugador con sesión (`PlayerHome`, `Home.tsx` l. 188-320) abre con tres bloques, por este orden (D-39, I-37), y debajo sigue lo de hoy: los avisos accionables de `buildDashboard` (`apps/web/src/domain/dashboard.ts`), ninguno de los cuales lleva un resultado (su carrera siguiente sale de `upcoming-races`, ya enmascarada, `sup. X2`), y la condición del corredor (`sup. H3`). Los tres bloques salen de `GET /api/me/horizon` (`HorizonSummary`, §4.11), que solo lleva el horizonte del propio espectador, y de `PreStageInfo` armadas en la web con el calendario público (`GET /api/calendar`, que da por etapa `index`, `km`, `label` y `kind`, `routes/calendar.ts` l. 59-72): ningún bloque pide nada que dependa de lo que pasó.

1. **`Continue watching`** (pantalla): las etapas a medias, una fila cada una, con la barra en km y lo que le queda a la cabeza en lo alcanzado (`HorizonSummary.watching[].toGoKm`): `Race France · Stage 5 · 42 km to go` (pantalla). Tocarla reanuda en lo alcanzado menos `BROADCAST.resumeBackS` (60 s de carrera) con `Previously` (pantalla; §8.5).
2. **`Ready to watch`** (pantalla): una tarjeta por etapa velada de las carreras en guardia que siguen en curso, en una fila por carrera, la más antigua primero, sin intercalar dos carreras del mismo día (§8.8). Cada tarjeta dice carrera, número, km, tipo y perfil sin marcas, con `Your rider raced` (pantalla) si su corredor estaba en la LISTA DE SALIDA (`HorizonSummary.ready[].reason = 'own_rider'`), nunca porque hiciera algo: `Stage 12 · 187 km · mountain stage` (pantalla). Botones `Watch` y `Highlights`; en el menú, `Show result` y `Stop protecting this race` (pantalla). La cabecera de la fila dice cuántas le quedan (`Race France · 4 stages ready to watch`, pantalla).
3. **`While you were away`** (pantalla): por cada carrera en guardia TERMINADA con etapas veladas, un bloque con cuatro salidas: `Watch the race in 33 minutes` (el digest de las etapas veladas, con el número calculado por `digestMinutes`, decisión 8-b, y no el «30» fijo de los textos de pantalla de la síntesis), `Key stages` (las que marca el perfil: reinas, cronos y la última, en `Highlights`; las demás se conocen por arrastre al ver las siguientes, `A`), `Continue from stage 5` (en orden, en `Watch`) y `Show results` (revela la última y arrastra las demás, sin castigo, §11.11). Las etapas de una carrera terminada no se repiten en `Ready to watch` (decisión 11-q).

Una cuenta nueva empieza con `known_through = 0` en todo (§10.2), así que en `guarded` una gran vuelta de cabecera en curso es suya para ver: la fila de `Ready to watch` lleva de cabecera `Race France is under way · Stage 10 of 21 · Watch from the start` (pantalla; `producto.md` §7.9), y la tarjeta de `Last race` no sale hasta que su corredor corra. La tarjeta `Last race` (`sup. H1`) enseña la última etapa CONOCIDA de su corredor; si la última que corrió está velada, `GET /api/riders/me/last-race` trae además `ready` (su `PreStageInfo`, §14.2) y la tarjeta dice `Your last race · Race France, Stage 8 · Ready to watch` (pantalla), con `Watch` en lugar de `Full story →`. El invitado sin sesión ve la portada de hoy (`GuestHome`, `Home.tsx` l. 44-72), que no enseña resultados; con `cs_viewer`, la de invitado con el aviso `Sign in to see results as you know them` (pantalla; §10.8).

**El que vuelve tras una semana, paso a paso** (mapa 04 §3; D-39). Su corredor corre `race-france` (21 etapas, días de juego 185 a 207 de su temporada; mapa 04 §2), su alcance es `guarded`, y el día 189 vio la etapa 4 entera y dejó la 5 a 42 km de meta. Vuelve el día 217, 28 días de juego después, que son 7 reales:

| Momento | Qué pasa por debajo | Qué ve (pantalla) |
| --- | --- | --- |
| llega, día 217 | la sesión de better-auth caducó a los 7 días (`create-context.mjs` l. 146-147); `cs_viewer` sigue viva (90 días) y la API calcula su horizonte en lectura (`Viewer.readOnly`, §10.8): `known_through` 4, `watching_stage` 5, velo de la 5 a la 21 | la portada de invitado con `Sign in to see results as you know them`; si entra antes en `/news`, `Race France · 17 stages ready to watch` en lugar de los titulares del Tour; en el ranking, `World ranking · as you know it · 17 stages hidden · Manage` |
| entra en su cuenta | el vigilante de sesión llama a `queryClient.clear()` (§10.9); `GET /api/me/horizon` trae `ready` con las etapas 5 a 21 y `watching` con la 5 | `Continue watching`: `Race France · Stage 5 · 42 km to go`; `While you were away`: `Race France · 17 stages ready to watch` con `Watch the race in 33 minutes`, `Key stages`, `Continue from stage 5` y `Show results` |
| elige el digest | la web encadena las 17 etapas a `digestPace` (§8.8); cada meta cruzada manda `POST …/broadcast/finish` con `mode: 'digest'`, que escribe `S` (DD-20) y sube `horizon_rev` | cada etapa en su presupuesto por tipo (llana 60 s, media 90, reina 150, crono 120) y, entre una y otra, el cuadro del recorrido; los agregados se van poniendo al día a medida que las cruza |
| lo deja a la mitad | lo cruzado queda visto; la etapa en curso queda a medias | la próxima vez, `Continue watching` en esa etapa y `While you were away` con las que faltan |
| o bien, `Show results` | `POST /api/me/reveal/race-france:s…/21` escribe `R` para la 21 y `A` de la 5 a la 20 | antes, `This also reveals stages 5 to 20.`; después, el mundo al día |
| o bien, vuelve el día 270 | 270 ≥ 207 + 56: el Tour caducó (§10.5); `expiredSinceLastVisit` lo lista y la web acusa con `revealStage` y `expired` | una vez, `Results of Race France are now shown (finished 16 days ago) · Watch the digest anyway` |

Las cifras del digest son de las etapas del Tour de la temporada 0 (seis llanas, tres medias, siete reinas y una crono entre la 5 y la 21, según `SEASON_CALENDAR`): 1.800 s de carrera más 172 s de cuadros, 33 minutos. La propiedad que el ejemplo enseña es la del principio: nada de lo que ve antes de elegir depende de lo que pasó en el Tour; lo que depende de lo que elige es solo cuánto sabe después.

**`Next: Stage 8 · Watch`** (pantalla; H-20, sin evidencia de los jueces). Las tres reglas de §8.8, que la portada cumple igual: sin reproducción automática (el último cuadro del cierre ofrece la siguiente y espera un toque; solo el digest encadena, porque es un acto sobre la carrera entera); la más antigua primero (la siguiente etapa no conocida de la misma carrera y, si no queda, la etapa lista más antigua de otra carrera en guardia, por el día de juego en que se corrió); y dos carreras del mismo día en filas separadas.

### 11.5 Los agregados con su fecha de horizonte

Un agregado a horizonte no es «el de hace N días»: incluye todo lo que el espectador conoce, también las carreras de ayer que no se protegen para él, y le quita solo lo que su velo esconde (I-42, D-32). Por eso cada agregado dice en su cabecera que está a horizonte y cuánto esconde, con un texto que depende SOLO del horizonte (§11.6) y un `Manage` que lleva a los ajustes del alcance:

| Agregado | Ruta y función de hoy | Mecanismo | Cabecera (pantalla) |
| --- | --- | --- | --- |
| ranking mundial y sub-23 (`sup. W1`) | `GET /api/rankings`, `/young`; `getRanking` y `getYoungRiders` (`ranking.ts` l. 174 y 221) | R | `World ranking · as you know it · 3 stages hidden · Manage` |
| premios del año (`sup. W2`), salón y récords (`sup. W4`) | `getSeasonAwards` (l. 313), `getHallOfFame` (l. 449), `getAllTimeRecords` (l. 493) | R | `Results from 3 stages you haven't watched are hidden · Manage` |
| naciones y equipos (`sup. W5`, `sup. P6`) | `getCountriesSummary`, `getCountryRiders`, `getTeams`, `getTeamDetail` (`browse.ts` l. 123, 157, 24 y 75) | R (y M la salud) | ídem |
| ficha de corredor: puntos, puesto, logros, palmarés, resultados (`sup. P1` a `sup. P4`) | `getPublicRider`, `getRiderBadges`, `getPalmares`, `getRiderRaceResults` | R, F y P | ídem |
| ficha de carrera en curso o terminada (`sup. C1`, `sup. C2`, `sup. C4`) | `GET /api/calendar/:raceId` con las `…ThroughStage` (`results.ts` l. 236, 320 y 379) | P | `After stage 9 of 21 · stages 10-12 ready to watch` con `Watch stage 10` |

**Cómo se hace la resta** (R, §10.6). El total del mundo del día se calcula como hoy y se guarda en el proceso por día de juego: la cuenta entera del ranking mundial, 15.600 corredores con sus puntos de 365 días, cuesta 70 ms en PGlite (p50; `l7/horizonte.mjs`, §18.2) y se hace una vez por día de juego y proceso porque se guarda como una promesa por `(worldId, currentDay)`: la primera petición del día nuevo la lanza y las que llegan mientras tanto esperan esa misma; si falla, se borra y la siguiente la repite (decisión 11-s). Sin ella «una vez al día» no sería cierto: tras cada tick, que sube `currentDay` cuatro veces por día real, llegan a la vez las primeras peticiones del día, y cada una pagaría sus 70 ms (104 el máximo). `lastRunStages` (§10.7, 18-a) se guarda igual. A cada espectador se le resta su `VeilDelta.points` y se reordena en memoria (1 ms, p50, medido igual). Dos reglas que la hacen exacta. Primera, toda lista cuyo orden dependa de un valor restado se reordena DESPUÉS de restar: la lista de agentes libres (`browse.ts` l. 234), la plantilla de un equipo, los corredores de un país y los rankings; si se ordenara en SQL con el valor real y se restara después, el orden delataría lo que la cifra esconde. Segunda, una lista con tope (`limit`) pide `limit + d` filas, con `d` el número de corredores con puntos velados (`VeilDelta.points.size`), resta, reordena y corta (decisión 11-f): un corredor que en el orden real está por debajo del puesto `limit + d` no puede entrar en los `limit` primeros, porque por encima de él hay al menos `limit + d` corredores con tantos puntos como él y a lo sumo `d` de ellos pierden algo con la resta, y a él la resta solo puede quitarle. El puesto de un corredor (`Season rank`, `sup. P1`) no se cuenta con una consulta (`getSeasonRank`, `packages/db/src/riders.ts` l. 251, cuenta los que tienen más puntos de verdad): sale de su posición en el ranking a horizonte.

**La ficha de una carrera en guardia**, en curso o terminada, se sirve hasta lo conocido (P): la general, los puntos, la montaña y los equipos tras la k; la cabecera `Winner` solo si la última etapa es conocida, y si no, `Finished · ready to watch` (pantalla); la pestaña `Stages` con el ganador de 1 a k, `Ready to watch` de k+1 a la última corrida y `Not raced yet` (pantalla) en las que faltan. `status` y `runDays` quedan libres (`sup. C6`). P corta por el velo, no por lo conocido (§10.2: «conocida no es lo mismo que fuera del velo»): la ficha de una carrera fuera de guardia, que son casi todas las 842 del calendario para quien no las sigue, es la de hoy, con el ganador de la carrera y el de cada etapa aunque quien mira no las haya visto, y la etapa, en cambio, le abre en `Watch` (§11.17, DD-01). [DOC 4], pregunta 3 de `docs/navegacion.md` §9 (l. 492-493, «¿mostrar las etapas futuras con su recorrido, o solo las ya corridas?»): se siguen enseñando con su recorrido y `Not raced yet`, como hoy (`Race.tsx` l. 397), porque el recorrido no destripa (N); es la decisión de fondo de §E del esqueleto, que ningún juez midió ni pidió.

### 11.6 La existencia también informa

Un aviso de «hay resultados ocultos» que solo sale en las fichas de quien ganó dice quién ganó; una lista que deja un hueco por cada titular escondido dice cuántas cosas pasaron; un correo que solo sale si tu corredor hizo algo destripa por existir. La regla (I-39, D-32 punto 3) tiene tres partes, y B1c las prueba con dos semillas de desenlaces distintos que tienen que dar respuestas idénticas byte a byte (§16.3):

1. **Todo aviso depende solo del horizonte.** `Results from 3 stages you haven't watched are hidden · Manage` (pantalla) sale con el número `h.veil.length` (decisión 11-m) y sale igual en TODAS las páginas de agregado y en todas las fichas de corredor, de equipo y de nación, pase lo que pase en esas etapas y salga o no ese corredor en ellas.
2. **Un marcador por etapa velada en toda lista que sea un flujo**, se escribiera sobre ella una fila o cinco: las noticias (`stage_ready`, §11.7), los resultados de un corredor (una fila `Race France · 3 stages to watch`, pantalla, para TODOS los de su lista de salida, abandonaran o no, `sup. P4`, `sup. H7`; la cuenta viaja en `riderRaceResultSchema.stagesToWatch`, §14.2, que es lo que `[toWatch]` quita en B1b, §11.18, §16.3) y el feed de un equipo (un marcador por etapa velada de cada carrera en la que el equipo está en la lista de salida, nunca por noticia, 11-g). La lista de salida es pública y está congelada antes de la salida: decidir por ella no dice nada de la carrera.
3. **Ninguna decisión de enseñar o de enviar mira el contenido que esconde.** La máscara (M) enseña el estado de antes, que es indistinguible del de un corredor al que no le pasó nada; el correo sale por la lista de salida (§11.9); el contador de las pestañas cuenta etapas por ver, no titulares (`sup. T4`).

Lo que queda fuera de esta regla es lo que no es un resultado: la lista de salida, el recorrido, el calendario, el parte meteorológico, la condición del corredor propio y los atributos de cualquiera (DD-08). El recorrido es N; los demás son L, con su motivo en el registro (B1d); y los que cambian al correrse una etapa (el calendario, la condición y los atributos), además, en la lista blanca de B1b (§11.18).

### 11.7 Las noticias bajo el velo

`GET /api/news` y `/api/teams/:id/news` pasan por el filtro F (D-45, I-39): fuera las filas cuya etapa está en el velo (`veilSql(h, news.raceKey, news.gameDay, news.stageDay)`, §10.6; con el índice `news_race_stage_idx` de la `0043`) y, en su lugar, UN `stage_ready` por etapa velada, que viaja como un titular más con `text` neutro (`Stage 7 of Race France is ready to watch`, pantalla, el asunto de `stageReadyNotice`), `personal: false`, sin protagonista y con `raceId`, `raceKey`, `stageDay` y `gameDay` (decisión 14-j), y que la web convierte en `StageReadyItem` (§4.12). Con más de `SPOILER.newsGroupAbove` (3) etapas veladas de una carrera, la web las junta en una línea, `Race France · 4 stages ready to watch` (pantalla), que solo mira el horizonte. Medido en PGlite (`l7/horizonte.mjs`): las 40 últimas noticias con el filtro cuestan 1,6 ms (p50), contra 0,5 ms sin él.

- **El orden**: el estable de D-45 (`game_day` descendente, `race_key`, `stage_day` descendente, prioridad del `kind`, `id`), con el `stage_ready` de una etapa en el sitio de sus noticias y delante de las de su día (decisión 11-g).
- **La familia** (`sup. N2`): el marcador lleva la familia `Watch` (pantalla), igual para todos; `newsLabel` (`labels.ts` l. 167-185) gana esa entrada.
- **Los desplegables** (`sup. N3`): se construyen con lo servido; un marcador aporta su carrera al filtro de carrera y ningún corredor al de corredor.
- **El enlace**: `raceOfHeadline` (`newsFeed.ts` l. 17-24), que adivina la carrera buscando su nombre en el texto, muere; el enlace sale de `raceId` (D-45). El de un marcador lleva a `/world/races/:raceId/stages/:day`, que abre en `Watch`.
- **El feed de un equipo** (`sup. N4`): los marcadores salen por la lista de salida del equipo en cada carrera con etapas veladas, no por sus noticias (11-g).
- **Los dos titulares nuevos** (`gc_lead_taken` y `jersey_taken`, §12.8) se escriben desde el 1a, pero `getGlobalNews`, `getTeamNews` y `getRiderNews` no los devuelven sin `opts.leaderNews`, y las rutas lo pasan como `request.spoilerApplies()` desde el 8a: solo los ve quien tiene el velo, y con él pasan el filtro F como los demás (decisión 17-x). `newsVeil.test.ts` (8a) y `packages/db/src/news.test.ts` (1a) lo prueban.
- **Lo que no se vela**: `contract` y `retirement` no nacen de una etapa y no llevan `raceKey`; se ven siempre.
- **El feed sigue global con marca**: la API personaliza con las noticias del corredor propio (`getRiderNews`, `packages/db/src/news.ts` l. 118-146) y la web las marca `· you`, que es lo que hay hoy; `docs/navegacion.md` §3.5 (l. 165-173) dice «sin personalizar». Se conserva la API y se corrige el documento en el paso 12 (contradicción 14 del mapa 05). Las noticias personales de una etapa velada (el abandono o la lesión del propio corredor) caen por el mismo filtro que las demás.

### 11.8 Título de pestaña, historial, URL, favicon y vista previa

Hoy el título es fijo (`<title>Cycling Star</title>`, `apps/web/index.html` l. 7) y ningún fichero de `apps/web/src` escribe `document.title` (grep; cobertura §2.9), así que `sup. T1` no destripa; lo que E2 añade (títulos por página) es lo que podría hacerlo, y por eso se escribe con un tipo que no admite un resultado (D-42, I-27). `usePageTitle` es el ÚNICO escritor de `document.title` y solo acepta una `PreStageInfo` (`raceName`, `season`, `stageDay`, `stageCount`, `km`, `label`, `stageKind`; §4.11) y un `PageKind`: por tipo no cabe el nombre de un corredor ni un puesto.

```ts
// packages/shared/src/broadcast/pageTitle.ts (nuevo; §17.20). Puro: lo usan la web y el fallback de la SPA (§14.10).
import type { StageKind } from '../contracts.js'
import type { PreStageInfo } from './wire.js'

export type PageKind = 'watch' | 'report' | 'race' | 'rider' | 'team' | 'news' | 'rankings' | 'home' | 'other'
const APP = 'Cycling Star'
/** Las palabras de un tipo de etapa: salen del recorrido, nunca de la carrera. Las usan el aviso y la vista previa. */
export const STAGE_KIND_WORDS = { llana: 'flat stage', media: 'hilly stage', reina: 'mountain stage', cri: 'time trial', clasica: 'one-day race' } as const satisfies Record<StageKind, string>
/** Las páginas sin etapa llevan un nombre fijo; `home` y `other`, solo el de la app. */
const PAGE_WORDS = { rider: 'Rider', team: 'Team', news: 'News', rankings: 'Rankings', home: null, other: null } as const satisfies Record<Exclude<PageKind, 'watch' | 'report' | 'race'>, string | null>

/** EL título (D-42). Con la etapa conocida o no, el mismo: el historial y el autocompletado guardan títulos (sup. X6). `_locale` delante
 *  desde que nace, con el tipo literal 'en' y el nombre `_locale` mientras no lo lea (noUnusedParameters; 12-q, D-62). */
export function pageTitle(_locale: 'en', p: PreStageInfo | null, page: PageKind): string {
  if (page === 'watch' || page === 'report' || page === 'race') {
    if (p === null) return APP
    const stage = p.stageCount === 1 ? p.raceName : `Stage ${p.stageDay} · ${p.raceName}`          // una carrera de un día no tiene «Stage 1»
    if (page === 'race') return `${p.raceName} · ${APP}`
    return page === 'watch' ? `${stage} · ${APP}` : p.stageCount === 1 ? `${p.raceName} report · ${APP}` : `Stage ${p.stageDay} report · ${p.raceName} · ${APP}`
  }
  const words = PAGE_WORDS[page]
  return words === null ? APP : `${words} · ${APP}`
}
```

```ts
// apps/web/src/domain/pageTitle.ts (nuevo; §17.20)
import { type PageKind, type PreStageInfo, pageTitle } from '@cyclingstar/shared'
import { useEffect } from 'react'

/** EL ÚNICO escritor de document.title. `pageTitle.test.ts` falla si otro fichero de apps/web/src lo escribe. */
export function usePageTitle(p: PreStageInfo | null, page: PageKind): void {
  const title = pageTitle('en', p, page)
  useEffect(() => { document.title = title }, [title])
}
```

| Página | Llamada | Título (pantalla) |
| --- | --- | --- |
| etapa, pestaña `Watch` | `usePageTitle(p, 'watch')` | `Stage 7 · Race France · Cycling Star` |
| etapa, pestaña `Report` y `/report` | `usePageTitle(p, 'report')` | `Stage 7 report · Race France · Cycling Star`, también con la etapa conocida |
| carrera de un día | ídem con `stageCount` 1 | `Race Sanremo · Cycling Star` y `Race Sanremo report · Cycling Star` |
| ficha de carrera | `usePageTitle(p1, 'race')`, con `p1` la `PreStageInfo` de su etapa 1 (11-c) | `Race France · Cycling Star` |
| corredor, equipo, noticias, rankings | `usePageTitle(null, 'rider')` y las demás | `Rider · Cycling Star`, `Team · Cycling Star`, `News · Cycling Star`, `Rankings · Cycling Star` |
| portada y el resto | `usePageTitle(null, 'home')` | `Cycling Star` |

Cuatro reglas más, que salen de la misma idea. **El título no lleva el progreso** (`42 km to go`, que proponía `producto.md` §7.10): el historial lo guardaría y no aporta nada que la capa fija no diga. **Las URL no llevan resultado ni progreso**: `/world/races/race-france/stages/7` y `/world/races/race-france/stages/7/report`, sin `?t=` (lo proponía `datos.md` §7.3 para el visitante y se descarta: la URL también va al historial). `?tab=result` de una etapa no conocida pinta la puerta (`sup. E9`): la pestaña pedida no salta nada, y el servidor no mira la URL. **El favicon es estático** (`index.html` l. 5) y el contador de las pestañas (`badge`, `Tabs.tsx` l. 78-79) cuenta etapas por ver, nunca resultados (`sup. T2`, `sup. T4`). **La vista previa de un enlace** no ejecuta JavaScript: el fallback de la SPA inyecta en `index.html` el mismo título, calculado con `pageTitle` y la misma `PreStageInfo`, y las etiquetas `og:` neutras (`shellMetaFor`, §14.10; `sup. X7`); para la ficha de carrera, `shellMetaFor` tiene que pasar la `PreStageInfo` de la etapa 1, como la web (11-c), para que el título sea el mismo antes y después del JavaScript.

`apps/web/src/domain/pageTitle.test.ts` (nuevo, suite rápida) prueba tres cosas: que `pageTitle` da los títulos de la tabla; que ningún fichero de `apps/web/src` salvo `domain/pageTitle.ts` contiene `document.title` (recorre el árbol con `readdirSync`, como el de las claves de caché de §14.11); y, con el canario de B1a, que el título de la página de una etapa velada no contiene el nombre del ganador (§16.6).

### 11.9 Correos y avisos

Hoy no hay ningún correo de juego: los tres que existen son de cuenta (`emails.ts` l. 64, 90 y 116; mapa 02 §5), así que `sup. T5` no destripa, y el correo de «etapa lista» es lo que podría hacerlo. E2 escribe la plantilla, su texto y su test; cuándo, a quién, con qué baja y por qué canal se envía es de E4 (DD-10: la plantilla y el test en E2; el envío, apagado hasta E4). El texto sale de una función pura que solo recibe `PreStageInfo` y un booleano de la lista de salida (D-42, I-27):

```ts
// packages/shared/src/broadcast/pageTitle.ts (sigue)
/** El aviso de «etapa lista» (D-42): asunto y primera línea. Por tipo no cabe un resultado; `ownRiderOnStartlist` sale de la LISTA DE SALIDA. */
export function stageReadyNotice(_locale: 'en', p: PreStageInfo, ownRiderOnStartlist: boolean): { readonly subject: string; readonly text: string } {
  const where = p.stageCount === 1 ? p.raceName : `Stage ${p.stageDay} of ${p.raceName}`
  const parts = [`${Math.round(p.km)} km`, STAGE_KIND_WORDS[p.stageKind], ...(ownRiderOnStartlist ? ['your rider is on the start list'] : [])]
  return { subject: `${where} is ready to watch`, text: parts.join(' · ') }
}
```

```ts
// apps/api/src/emails.ts (se amplía; la maquetación es la de hoy, `layout`, l. 33-56)
import { type PreStageInfo, stageReadyNotice } from '@cyclingstar/shared'

const READY_FOOTER = 'Results stay hidden until you watch the stage.'
/** «Etapa lista para ver» (D-42). Plantilla pura, como las otras tres: sin red, sin entorno y sin reloj. */
export function stageReadyEmail(_locale: 'en', p: PreStageInfo, ownRiderOnStartlist: boolean, url: string): MailBody {
  const n = stageReadyNotice('en', p, ownRiderOnStartlist)
  return {
    subject: n.subject,
    text: [n.text, '', 'Watch it here:', url, '', READY_FOOTER].join('\n'),
    html: layout({ title: n.subject, body: escapeHtml(n.text), cta: { label: 'Watch', url }, footer: READY_FOOTER }),
  }
}
```

El correo dice (pantalla): asunto `Stage 7 of Race France is ready to watch`; primera línea `187 km · mountain stage · your rider is on the start list`; botón `Watch`, que lleva a `/world/races/race-france/stages/7`; pie `Results stay hidden until you watch the stage.` Tres reglas, que el test de la plantilla y B1a comprueban y E4 hereda:

1. **La decisión de ENVIAR no mira el resultado.** El disparador es que una etapa en guardia para ese jugador se ha corrido (`stage_timelines.game_day`, la primera tabla de etapa con día de juego, D-10), y el destinatario, quien la tiene en el velo; nunca «tu corredor ganó» ni «hubo una caída». Un aviso que solo sale si tu corredor hizo algo destripa por existir (§11.6).
2. **Ningún adjetivo que dependa de lo que pasó**: ni `dramatic`, ni `quiet`, ni `historic`. Las únicas palabras variables son las del recorrido (`STAGE_KIND_WORDS`) y la de la lista de salida.
3. **B1a renderiza el correo con el canario** (§16.3): el nombre del ganador de la etapa canaria no aparece ni en el asunto, ni en el texto, ni en el HTML.

La firma cambia respecto de la que fijó la síntesis, `stageReadyEmail(p: PreStageInfo, url: string): Email`: gana `ownRiderOnStartlist`, que la primera línea necesita, y devuelve el `MailBody` de hoy (`emails.ts` l. 58), que es lo que en el código se llama así (decisión 11-d); y, como todo render, nace con el `locale` delante (12-q). Los tests de §11.19 llaman con `'en'`. Una notificación del navegador, un service worker o un contador de la Badging API, si E4 los crea, usan `stageReadyNotice` y nada más (`sup. T6`); el service worker no guarda ninguna respuesta de una ruta `horizon` o `watch`.

### 11.10 Rutas públicas, el visitante y el acta compartible

Entrar en una etapa es sentarse a verla, también para quien no tiene cuenta (D-36, O-8, DD-07; [DUEÑO 8], «un visitante sin cuenta debe poder ver el resultado de una carrera», `docs/motor.md` l. 1504-1505):

| Ruta de la web | Quién | Abre en (pantalla) |
| --- | --- | --- |
| `/world/races/:raceId/stages/:day` | quien no conoce la etapa: velada, a medias, fuera de guardia, caducada o visitante (`WatchState.known` falso o sin `watch`) | `Watch`, con `Report` a un toque |
| ídem | quien la conoce (`W`, `S`, `R` o `A`) | `Report`, con `Watch anyway` a un toque |
| `/world/races/:raceId/stages/:day/report` | quien no tiene la etapa en el velo, visitante incluido | el acta, pública e indexable por defecto (DD-12) |
| ídem | quien la tiene en el velo | la puerta: `This page shows the result of Stage 7. Watch it instead?` con `Watch` y `Show result` |
| `/world/races/:raceId` de una carrera de un día terminada | quien no la conoce | `Watch`, y detrás `Route`, `Report`, `Result`, `Race Radio` y `Roll of honour`; `Report`, `Result` y `Race Radio` enseñan la puerta (11-o, §11.17) |
| ídem | quien la conoce | `Report`, `Result`, `Race Radio`, `Route`, `Roll of honour` y `Watch` |

**El visitante** tiene horizonte `anon` (§10.6): su velo está vacío y fuera de la etapa lo ve todo, porque el requisito del dueño es que pueda ver resultados; dentro de la etapa, la etapa abre en `Watch` igual que para todos, porque el modo por defecto es del producto y no de la cuenta (`ingeniero.md` §7.6), y el acta está a un toque. Su progreso vive en `localStorage` con la clave `cs.watch.<raceKey>.<day>` y el valor `{ "reachedS": <segundos> }` (decisión 11-p), leído y escrito dentro de `try/catch`: en una ventana privada, con el almacenamiento bloqueado o lleno, la etapa empieza desde la salida y nada falla. No se manda progreso al servidor sin sesión (§14.11), así que el visitante no escribe nunca `race_watch`. Se descarta lo de `producto.md` §7.4 y §7.5 (fila `sup. C3`): abrir en el acta la clásica «conocida» del visitante (O-8), porque para él entrar sería leer el acta.

**El acta compartible** (DD-12; mapa 05 §6, contradicción 2). El acta pública de `/report` es la vista de espectador que «indexa Google» (`docs/motor.md` Parte IV) y el mejor material de captación («El mejor activo que tiene este juego hoy es la crónica de una etapa», `docs/captacion.md` l. 39-40; «los relatos de etapa se comparten solos», `MVP.md` l. 21): se conserva entera, solo deja de ser lo primero que se ve. **Indexarla no es el requisito del dueño**, que pide que un visitante sin cuenta pueda ver el resultado ([DUEÑO 8], `docs/motor.md` l. 1504-1505), sino la propuesta de `docs/motor.md` para esa vista («Es la que se comparte y la que indexa Google», l. 1510), y tiene un precio: el buscador es un robot sin cookie, con horizonte `anon` como el de la vista previa, así que guarda el acta entera y su `og:description` con `Spoiler · Winner: …` (DD-12), y quien busque la etapa puede ver el ganador en la lista de resultados sin haber entrado en el juego. Es la misma elección que DD-12 y la decide el dueño con ella (§20): por defecto, indexable, como dice `docs/motor.md`; la otra cara es servir `/report` con `X-Robots-Tag: noindex` (§14.10), que la saca de los buscadores y le quita la captación por búsqueda, no la de los enlaces compartidos. Dos botones para compartir, que no son lo mismo:

- **`Share to watch`** (pantalla), siempre, también antes de haberla visto quien comparte, porque no contiene nada: enlace a `/world/races/race-france/stages/8`, con `og:title` `Stage 8 · Race France · Watch the race` y `og:description` `187 km · mountain stage` (pantalla), imagen genérica hasta que E3 decida otra.
- **`Share the report`** (pantalla), solo si quien comparte conoce la etapa (el botón no existe antes, así que compartir nunca obliga a revelar): enlace a `/report`. Su vista previa lleva el ganador, marcado `Spoiler` en el `og:description` (`Spoiler · Winner: …`, pantalla; DD-12), pero solo si la etapa está fuera del velo de QUIEN PIDE la página: el robot de vista previa no lleva cookie y su horizonte es `anon`, así que la ve; un jugador con la etapa velada recibe la descripción neutra (§14.10, decisión 14-k). Quien recibe el enlace y no conoce la etapa ve la puerta, no el acta.

Con esto se resuelven las dos contradicciones del mapa 05: la 1 (la navegación pone el ganador en la cabecera, en `Stages`, en la clásica y en la portada; §11.17) y la 2 (la vista de espectador pública contra el sin destripe): la vista pública existe, en `/report`, y la puerta de entrada es `Watch`.

### 11.11 «Dame el resultado»

Nadie queda bloqueado por no querer ver (D-38, I-35, DD-17). `Show result` (pantalla) está en toda puerta y en el menú `⋯` de los mandos. La primera vez confirma: `Show the result of Stage 7? You won't be able to watch it without knowing.` con `Don't ask again` (pantalla); marcar esa casilla manda `PUT /api/me/spoiler-scope` con `{ scope, revealConfirm: false }` (§14.2), que guarda `users.reveal_confirm = false`, y desde entonces el producto no vuelve a preguntar. Aceptar manda `POST /api/me/reveal/:raceKey/:day`, que escribe `R` para esa etapa y `A` para las anteriores que faltaran (§10.3); si faltaban, la confirmación lo dice antes: `This also reveals stages 3 and 4.` o, con más de dos, `This also reveals stages 5 to 20.` (pantalla). Revelada, la etapa abre en `Report` y se puede ver igual con `Watch anyway` (pantalla): la retransmisión de una etapa conocida no tiene límite de lo alcanzado ni escribe progreso (§10.3, §10.11).

**Revelar no cuesta ni da nada** (B20, §16.4): ningún premio, logro, moral, dinero, punto, convocatoria ni aprendizaje lee `race_watch` ni `users.reveal_confirm`. Lo prueba un test que recorre `packages/db/src` y `packages/engine/src` y falla si `race_watch`, `raceWatch` o `reveal_confirm` aparecen fuera de `watch.ts`, `horizon.ts`, `schema.ts` y las migraciones. Para quien no quiere ver ninguna: el alcance `own_only` u `off` en una línea de los ajustes (§10.4), y la oferta adaptativa, una vez, tras dos carreras de cabecera ignoradas (`Only protect your own races?`, pantalla; DD-16). Para una carrera entera, `Show results` en `While you were away` revela la última etapa y arrastra las demás (§11.4).

### 11.12 La previa de la N+1 y las órdenes

La etapa N+1 sale con los maillots, la general y la lista de salida de tras la N, así que su previa destripa la N (D-37; mapa 06 §7.2, regla 6). Tres momentos, cada uno con su regla:

1. **Antes de que se corra la N+1**: su página es `Preview` y `Profile` (pantalla); la ruta de etapa de una etapa sin correr no lleva ninguna clasificación (`routes/races.ts` l. 422-433). El perfil, los puertos, los km y el parte son recorrido y previsión (N). Las clasificaciones de salida y los maillots que la ficha de carrera enseña al lado son los de tras la k (P, `sup. C2`), y si la k es menor que la N, la previa lo dice: `Standings after stage 5 · Watch stage 6 to update` (pantalla).
2. **Con la N+1 corrida y la N velada**: la cabecera de la retransmisión de la N+1 lleva `gate: { k: 'previous_unseen', firstUnseen }` (§10.6, `stageGateOf`), sus tramos dan 403 `previous_unseen` (§10.11) y la pantalla pinta la puerta (`StageGateCard`) en lugar de la previa: `You haven't watched stage 6 yet` · `Watch stage 6` · `Highlights of stage 6` · `Show result of stage 6 and continue` (pantalla). La tercera revela la N (`R`) y arrastra las anteriores (`A`), y la retransmisión de la N+1 empieza. El reparto de la cabecera ya viene degradado (`veilCast`, §10.10; B13): quien mira la N+1 sin resolver la puerta no ve a nadie con el maillot que ganó en la N, y un título de campeón cuyo campeonato no ha visto no le pone a nadie el maillot de campeón (D-37).
3. **Las órdenes de la N+1** se pueden dar siempre (DD-09): la página de órdenes de una carrera con una etapa corrida y no conocida abre con `Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway` (pantalla), con los minutos de `playbackEstimateS` (§8.2). La tercera deja la página tal cual: la respuesta de las órdenes no lleva la general (`raceOrdersResponseSchema`, `contracts.ts` l. 1174-1189: etapas, órdenes, compañeros, rivales y equipos), sus compañeros y rivales no miran el abandono (`raceOrders.ts` l. 44-93) y los rivales se ordenan por una fama que no se escribe (`sup. W6`). Quien tiene prisa ordena sin saber; nadie queda bloqueado.


### 11.13 El corredor y el equipo propios

Lo propio es donde el velo más cuesta, porque el jugador necesita a su corredor para decidir: órdenes, entrenamiento, calendario y contrato. La regla es la de D-41: se enseña sin velo lo que hace falta para decidir y no cuenta el resultado (la condición y los atributos, DD-08), y se vela lo que lo cuenta (el parte, lo aprendido por el puesto, el abandono, los puntos, el dinero y el presupuesto). Dato a dato:

| Dato propio | Ruta | Mecanismo | Qué ve con la etapa velada, y por qué |
| --- | --- | --- | --- |
| los atributos | `GET /api/riders/me` (`routes/riders.ts` l. 127-131; `getRiderForUser`, `packages/db/src/riders.ts` l. 184-207, que devuelve identidad y atributos y nada más) | L (DD-08) | el valor de hoy, con lo aprendido en la etapa velada dentro: sin él no se entrena ni se ordena |
| la condición: estrellas, frescura, cerillos, moral y `FormChart` (pantalla) | `GET /api/riders/me/form`, `form` y la serie `log` (l. 425-437) | L (DD-08) | la de hoy, con la carga de la etapa velada dentro |
| la opinión del preparador | `GET /api/riders/me/coach-view` (l. 457-467) | L (DD-08) | la de hoy: sus notas miran REC y el atributo de la carta, que mueve lo aprendido en la etapa velada (§11.3, 11-r) |
| el parte de cada día de carrera, `Where the energy went` (pantalla) | ídem, `log[].parte` | F (`VeilDelta.raceDays`) | el día velado no sale: `RaceEffortLog` solo pinta los días con parte (`RaceEffortLog.tsx` l. 36-39) |
| qué hizo cada día, `log[].activity` | ídem | M (11-e) | cada día de carrera velado lleva la clave de su etapa, `carrera:race-france:e12`, corriera o no |
| la salud, `Injured · until GD 214` (pantalla) | ídem, `health`; y `GET /api/riders/:id` | M (`VeilDelta.health`) | la de antes de la caída velada (`prevHealth` y `prevUntilDay` de la noticia `injury`, D-45) |
| el informe del bloque y la tendencia | `GET /api/riders/me/report` y `/trend` | F (11-e) | sin lo aprendido en carrera ni la sobrecompensación de los días velados, y con esos días contados como de carrera (`sup. X1`) |
| las carreras próximas y en curso | `GET /api/riders/me/upcoming-races` | M (`VeilDelta.abandons`) | la carrera sigue en curso aunque abandonara en una etapa velada (`sup. X2`) |
| los días de carrera del planificador | `GET /api/riders/me/orders` y `POST /api/riders/me/plan/preview` | M (ídem) | los días que quedaban siguen siendo de carrera (`sup. X10`) |
| retirarse de una carrera | `POST /api/riders/me/races/:raceKey/retire` | M | `alreadyOut: false`, sin escribir nada, si el abandono está velado (`sup. X9`, 11-j) |
| los puntos de la temporada y el dinero | `GET /api/riders/me/summary` | R (`VeilDelta.points` y `.money`) | las cifras de antes de la etapa (`sup. H2`) |
| el libro de cuentas | `GET /api/riders/me/ledger` | F y R | sin los premios velados; el saldo es la suma de lo visible (`sup. H6`) |
| la última carrera | `GET /api/riders/me/last-race` | P y G | la última etapa conocida, o su tarjeta `Ready to watch` (pantalla; `sup. H1`, `sup. H5`) |
| el palmarés y los logros | `GET /api/riders/me/palmares` y `/api/riders/:id/badges` | F y R | sin las filas veladas (`sup. P2`, `sup. P3`) |
| las convocatorias y las ofertas | `GET /api/riders/me/race-prefs` y `/offers` | L | lo de hoy: se deciden sobre el mundo al día y no nombran ninguna etapa (§11.3) |
| el presupuesto del equipo | `GET /api/teams/me/calendar`, `/api/teams/:id` y `/api/teams` | R (`VeilDelta.budget`) | el de antes de los premios de equipo de las etapas veladas (`sup. P6`, `sup. X8`): una cota inferior del real, que no bloquea ninguna decisión; velado por defecto, y la elección es del dueño (DD-26, §20; 11-t) |
| los puntos y el puesto del equipo | `GET /api/teams` y `/api/teams/:id` | R | sumas a horizonte y listas reordenadas (11-f) |
| el programa de carreras del equipo | `GET /api/teams/me/race-plan` | N (11-k) | lo de hoy: no lee dinero |
| el entrenamiento y el control del equipo | `GET /api/me/team-training` y `/api/me/team-control` | N | lo de hoy |

**Lo que la condición deja pasar, dicho con su cifra.** DD-08 acepta una pista débil a cambio de poder dar órdenes, y conviene saber cuál. Los atributos llevan dentro lo aprendido en carrera, que se multiplica por el puesto (TAC ×1,8 al ganar y ×1,4 en el top 10, `world/learning.ts` l. 106-111). La resistencia de quien TERMINA una gran vuelta sube con la sobrecompensación, escrita al cerrar la última etapa y solo para los que llegan (`stageRun.ts` l. 826-852), así que un `RES` que sube el día de la última etapa dice que terminó. Y la frescura tras una etapa depende de la carga que hizo, que es menor si abandonó pronto. Nada de esto sale en una pantalla como resultado: son cifras de la ficha que el jugador tendría que comparar con las de ayer. `GET /api/riders/me`, `/form` y `/coach-view`, y los atributos de cualquier corredor en `GET /api/riders/:id` (`sup. X11`), están en la lista blanca de B1b con el motivo de DD-08 (§11.18), y lo que sí se vela es lo que explicaría esas cifras: el parte, el desglose por origen y la lista de días.

**El parte y la actividad de un día velado** (decisión 11-e). El tick escribe la actividad de un día de carrera con la clave de su etapa, `carrera:${spec.raceId}:e${spec.stageDay}` (`stageRun.ts` l. 672 y 746), también para el que no termina; tras un abandono, los días que quedaban de la carrera pasan a ser de entrenamiento o de descanso. Enseñar esa serie tal cual delataría el abandono, y esconder el día entero dejaría un hueco que solo existe cuando hay algo que esconder. Así que un día de carrera velado se enseña como día de carrera, con la clave de su etapa y sin parte, corriera o no:

```ts
// packages/db/src/riders.ts (PR 8b; sup. H4 y sup. X1, 11-e)
import { raceIdFromKey } from '@cyclingstar/shared'

/** Día de juego → la actividad que el tick escribe para esa etapa, en los días de carrera velados de ESTE corredor. */
export function veiledRaceDays(h: Horizon, d: VeilDelta, riderId: string): ReadonlyMap<number, string> {
  const days = new Set(d.raceDays.get(riderId) ?? [])
  const out = new Map<number, string>()
  for (const v of h.veil) if (days.has(v.gameDay)) out.set(v.gameDay, `carrera:${raceIdFromKey(v.raceKey)}:e${v.stageDay}`)
  return out
}

/** La serie de `GET /api/riders/me/form`: la carga se queda (DD-08); la actividad pasa a la de su etapa y el parte, a null. */
export function veilDailyLog(rows: readonly DailyLogRow[], veiled: ReadonlyMap<number, string>): DailyLogRow[] {
  return rows.map((r) => {
    const activity = veiled.get(r.gameDay)
    return activity === undefined ? r : { ...r, activity, parte: null }
  })
}
```

Un ejemplo con el calendario de la temporada 0 (`stageDayOfSeason`, `packages/engine/src/routes/schedule.ts` l. 12-18): el jugador conoce el Tour hasta la etapa 11 (día de juego 196), es el día 200 y su corredor corrió la 12, abandonó en la 13 y desde entonces descansa. Lo que guarda `rider_daily_log` y lo que sirve `GET /api/riders/me/form`:

| Día | Etapa | Guardado: `activity` y `parte` | Servido |
| --- | --- | --- | --- |
| 196 | 11, conocida | `carrera:race-france:e11`, su parte | igual |
| 197 | 12, velada | `carrera:race-france:e12`, su parte | `carrera:race-france:e12`, parte nulo |
| 198 | 13, velada: abandona | `carrera:race-france:e13`, su parte (el tick lo guarda también para el que no termina, `stageRun.ts` l. 657-680) | `carrera:race-france:e13`, parte nulo |
| 199 | 14, velada | `descanso_activo`, sin parte | `carrera:race-france:e14`, parte nulo |
| 200 | 15, velada | `fondo`, sin parte | `carrera:race-france:e15`, parte nulo |

La carga de los días 199 y 200 (la de un descanso y la de un fondo, no la de las dos llegadas en alto que se corrieron esos días) se sirve tal cual, porque es la condición (DD-08): es la pista débil que el dueño acepta. Lo que desaparece es la palabra que lo contaría.

`getBlockReport` y `getAttrTrend` (`packages/db/src/riders.ts` l. 517 y 366) ganan el mismo mapa. Lo aprendido: fuera de la suma las filas de `rider_attr_log` con `source` `carrera` o `sobrecompensacion` de esos días (con `sql.param`, como `veilSql`, §10.6); las de `entrenamiento`, `declive` y `detraining` se quedan, porque no dependen de la etapa. Las sesiones: se cuentan por día, 28 filas como mucho, y los días velados cuentan con la actividad de su etapa, así que la lista `carrera:race-france:e12 ×1` (pantalla; `BlockReport.tsx` l. 79-82) sale igual corriera o no. De paso se ve un defecto que no es de E2 y no se arregla aquí: `raceDays` cuenta las filas cuya actividad es exactamente `carrera` (`packages/db/src/riders.ts` l. 549) y el tick nunca escribe eso, así que en producción el informe dice siempre `0 race days` (pantalla, `BlockReport.tsx` l. 47-48) y cuenta los días de carrera como de entrenamiento; lo único que había de prueba con `carrera` a secas es el test (`fichaCorredor.test.ts` l. 100). Es DD-24 (§20): se anota en `docs/balance.md` en el paso 12 y el 8b solo lo vela (19-b).

**El rastro de etapa** (I-34, D-41). Hoy un punto de ranking, un palmarés o un premio dicen de qué día son y, como mucho, de qué carrera, y el presupuesto del equipo no tiene libro: `creditTeam` suma al presupuesto sin dejar apunte (`economy.ts` l. 154-162). La `0046` (§13.5) da a cada uno su etapa, y con eso `veilDelta` sabe qué restar a cada espectador:

| Columna de la `0046` | La escribe, desde el PR 8a (§13.5) | `VeilDelta` | Superficies |
| --- | --- | --- | --- |
| `rider_points.stage_day` | los dos orígenes de puntos de `stageRun.ts` (l. 1274 y 1295) | `points` | `sup. H2`, `sup. P1`, `sup. P6`, `sup. W1`, `sup. W2`, `sup. W5`, `sup. X4` |
| `palmares.stage_day` | los dos `recordPalmares` (l. 1280-1289 y 1298-1306) | `palmares` | `sup. C5`, `sup. P2`, `sup. P3`, `sup. W4` |
| `transactions.race_key` y `.stage_day` | `creditRider` con la `StageRef` que le pasa `awardRacePrizes` | `money` | `sup. H2`, `sup. H6` |
| `stage_team_results.prize` | `creditTeam`, dentro de `awardRacePrizes` | `budget` | `sup. P6`, `sup. X8` |

El presupuesto del equipo, que dos propuestas aceptaban como fuga (`ingeniero.md` 16.8, `datos.md` decisión 5), se vela así con una resta como las demás (O-32): la suma de `stage_team_results.prize` de las etapas veladas de cada equipo, restada al `teams.budget` de hoy. **Por qué aquí no vale el argumento de DD-08, y por qué la elección es del dueño.** El mánager decide con el presupuesto: la página del calendario del equipo enseña `Budget` y `Planned travel cost` para elegir qué carreras añadir, y avisa de que el viaje «is charged to the team budget per rider when each race convokes» (pantalla; `TeamCalendar.tsx` l. 133, 140 y 152). Pero el premio de equipo solo lo cobran el equipo del ganador de la etapa y los de la general final (`creditTeam`, `economy.ts` l. 154-161, 174 y 183), con importes fijos (`teamStagePrize`: 3.000 en una carrera WorldTour, 1.500 y 500 en las otras dos categorías, `packages/engine/src/world/prizes.ts` l. 31 y 35-37): una subida de 3.000 el día de una etapa no es una pista débil como la frescura, es «tu corredor ganó». Y velarlo cuesta poco: la resta solo quita premios, así que el presupuesto que se ve es una cota inferior del real, y añadir una carrera no lo mira (`POST /api/teams/me/calendar/:raceId`, `routes/teams.ts` l. 85-97, llama a `draftRace`, que solo comprueba el equipo, la categoría y la fecha, `teamPlan.ts` l. 323-336): el mánager planifica con menos dinero del que tiene y nada se le bloquea. Aun así, el dinero de los equipos es la primera decisión de economía del dueño («el dinero de los equipos: patrocinadores, premios y todo tipo de gastos», `docs/agenda.md` l. 34), y la elección pasa a sus decisiones (DD-26, §20; decisión 11-t): por defecto, velado; la otra cara, visible como DD-08 (L en la lista blanca de B1b), con la victoria legible en la cifra. Los movimientos que no nacen de una etapa (`salario`, `staff`, `patrocinador`, `viaje`, `vivienda` y `otro`, `schema.ts` l. 813-821) llevan `race_key` y `stage_day` nulos y se ven siempre, como un premio de una etapa corrida antes del 8a, que no tiene cómo decir su etapa y cuenta como conocido (§13.5, 13-l); `premio` solo lo escribe `awardRacePrizes` (`economy.ts` l. 169 y 181). Y lo que D-41 deja sin velo se queda en las cinco rutas L propias de esta subsección (`/api/riders/me`, `/form`, `/coach-view`, `/race-prefs` y `/offers`), en los atributos de `GET /api/riders/:id` (`sup. X11`) y en las de calendario de §11.3: ninguna otra ruta propia enseña un dato nacido de una etapa sin pasar por el velo.

### 11.14 Lo que se ve de otros jugadores

Tres reglas, las de D-41 e I-40, y una cuarta para quien construya lo social después (E9).

1. **Todo se ve con el horizonte de quien mira.** La ficha del corredor de otro jugador, sus resultados, su palmarés, su equipo y el presupuesto de ese equipo se sirven con el `Horizon` de quien pide la página, nunca con el del dueño de esos corredores: `computeHorizon(db, viewer, world)` recibe el `Viewer` de la petición (la sesión o `cs_viewer`, §10.8) y ninguna ruta acepta otro. Si A conoce el Tour hasta la etapa 9 y abre la ficha del corredor de B, que ganó la 11, A lo ve sin esa victoria y con `Results from 3 stages you haven't watched are hidden · Manage` (pantalla, §11.6); B, en su propia ficha, lo ve con ella. Dos miembros del mismo equipo (`My Team` es también de los miembros, `docs/navegacion.md` §3.4) pueden ver dos presupuestos distintos del mismo equipo, y el aviso de cada uno explica por qué.
2. **Lo visto es privado.** Ninguna ruta devuelve la fila de `race_watch` de otro jugador: no hay `3 players watching` ni `B has watched this stage` (pantalla), ni lista de quién ha visto qué, ni tampoco para el administrador (el modo diagnóstico no lee `race_watch` de nadie, §11.15). Lo que uno ha visto dice lo que sabe, y en un equipo con charla bastaría para destripar: «B ya la vio y no dice nada». El test de B20 (§11.11) ya impide leer `race_watch` fuera de `watch.ts` y `horizon.ts`, y esos dos solo la leen con el `userId` del `Viewer`. `users.last_seen_at` (§13) tampoco sale en ninguna respuesta.
3. **Que otro vea no cambia lo que ve uno.** Es B1b con dos cuentas: que B vea o revele una etapa no cambia un byte de lo que recibe A en ninguna ruta `horizon`. B1b lo lleva (§16.3: otra cuenta que ve y revela la etapa no cambia lo que recibe la primera); sale gratis del punto 1, pero un `userId` mal pasado en una sola función de `packages/db` lo rompería y solo este test lo vería.

**La regla para E9** (H-08). Dos jugadores comentan la misma etapa, uno a los 80 km y otro a los 120: el comentario del segundo no puede llegar al primero antes de que pase por ese punto. E2 no construye nada social; deja escrita la regla para que E9 no tenga que inventarla: todo contenido de jugador colgado de una carrera (un comentario, un mensaje del foro de equipo, `docs/navegacion.md` §9 pregunta 1, una reacción) lleva sellada la posición de su autor en esa carrera al escribirlo, y solo se enseña a quien ha llegado a ella (decisión 11-n):

```ts
// Para E9: no lo implementa E2 (D-41, H-08). Iría en packages/shared/src/broadcast/, junto a los tipos del horizonte (§4.10).
/** La posición del autor en la carrera al escribir, sacada de SU horizonte. */
export interface AuthorStamp {
  readonly raceKey: string
  /** La k de su autor: `known_through` si la carrera estaba en su guardia, y si no, la última etapa corrida ese día. */
  readonly knownThrough: number
  /** La etapa k + 1 que tenía a medias, con lo alcanzado en segundos de carrera; null si no tenía ninguna. */
  readonly watching: { readonly stageDay: number; readonly reachedS: number } | null
}

/** ¿Ha llegado quien mira al punto del autor? Solo mira el horizonte de quien mira. */
export function stampReached(s: AuthorStamp, h: Horizon): boolean {
  const k = h.knownThrough.get(s.raceKey)
  if (k === undefined) return true                               // carrera fuera de su guardia, o caducada: lo ve todo (§10.4, §10.5)
  if (s.watching === null) return k >= s.knownThrough
  if (k >= s.watching.stageDay) return true                      // conoce entera la etapa que el autor tenía a medias
  const w = h.watching.get(s.raceKey)
  return k >= s.knownThrough && w !== undefined && w.stageDay === s.watching.stageDay && w.reachedS >= s.watching.reachedS
}
```

Tres detalles que el tipo fija. La posición va en segundos de carrera, como `race_watch.reached_s`, y no en km: el km depende del grupo (§3), y el que mira puede ir con otro grupo en pantalla. Un contenido que no cuelga de ninguna carrera no lleva sello, y lo que su texto libre diga de otra carrera no lo protege esta regla: la moderación es de E9. Y lo que no ha llegado no deja rastro: ni `2 comments ahead` (pantalla), ni un contador, porque la existencia también informa (§11.6); cuando quien mira llega al punto, el contenido aparece.

### 11.15 El modo diagnóstico del dueño

El dueño es a la vez espectador y depurador (H-06; [DUEÑO 10]): quiere ver las etapas de su corredor sin saber cómo acaban y, a la vez, seguir cazando defectos en la radio y la voz de producción, como hizo en catorce tandas desde la radio (mapa 05 §2.8). Sin un modo aparte tendría que elegir entre revelarse la etapa para mirarla por dentro o no mirarla. D-40, escrito como hecho:

- **Quién.** Un usuario con `users.is_admin` (`schema.ts` l. 83) y sesión. La guarda de administración también acepta `ADMIN_TOKEN` (`createAdminGuard`, `security.ts` l. 90-110), pero el modo diagnóstico es de la web y usa solo la sesión. La web sabe si enseñarlo por `GET /api/admin/whoami`, que ya pregunta para decidir si enseña el panel (`routes/admin.ts` l. 55-63; `apps/web/src/api/admin.ts` l. 105).
- **Cómo se entra.** `?diag=1` en la página de etapa (`/world/races/race-france/stages/7?diag=1`), escrito a mano o desde el botón `Diagnostic view` (pantalla) que la puerta (`StageGateCard`) enseña solo a los administradores, el último y en pequeño. La web pasa `diag=1` a las cuatro rutas de etapa (`stageQuerySchema.diag`, §14.2): a la ruta de etapa desde el 7b (`fetchCalendarStage` con `diag`, 14-s), y a la cabecera, los tramos y el acta con el 9a.
- **Qué hace el servidor.** Con `?diag=1` y un administrador, la ruta de etapa sirve el `StageReplay` entero de hoy, sin `watch`, y la cabecera, los tramos y el acta de la retransmisión se sirven con `worldHorizon` (§14.2): sin velo, sin puerta y sin el límite de lo alcanzado, así que el tramo no mira ni actualiza la memoria de lo alcanzado (§10.3). Con `?diag=1` y alguien que no es administrador, el parámetro se ignora y la respuesta es la misma, byte a byte, que sin él: ni un 403 que diga que el modo existe, ni nada distinto (decisión 11-h).
- **Qué no escribe.** En modo diagnóstico la web no manda `POST /api/me/watch` ni `…/broadcast/finish`: el reproductor no informa de lo alcanzado. Nada cambia en `race_watch` ni en `horizon_rev`, la etapa sigue en `Ready to watch` (pantalla) y en el velo de su cuenta, y la portada no la cuenta como vista.
- **Qué ve.** Una franja fija encima de las pestañas, `Diagnostic view · not counted as watched` (pantalla), y todas las pestañas de una etapa conocida (`Report`, `Result`, `Classifications`, `Race Radio`, `Profile` y `Watch`, pantalla), con la barra de `Watch` sin límite y el `Finish` de la radio. El título de la pestaña es el mismo de siempre (`pageTitle` no mira `diag`, §11.8), y `Share to watch` y `Share the report` (pantalla) quitan `diag` del enlace.
- **La caché.** Las claves de React Query de las rutas de etapa llevan `diag` además de `rev` (§10.9), así que una respuesta del modo diagnóstico nunca sirve la vista normal ni al revés; y todas llevan `private, no-store` (§14.9).
- **Más allá de la etapa.** El dueño también caza defectos en lo agregado: en las clasificaciones de una carrera («un corredor ganó 3 etapas… y en las clasificaciones, **incluso tras la etapa 1**, pone DNF», `docs/balance.md` l. 9173-9175, v45) y en la hoja de la etapa («los DNF no salen en la clasificación de la etapa», citado en `routes/races.ts` l. 447-448, v50), y desde `SPOILER_MODE=admins` la ficha de carrera y el feed le enseñan lo de antes en toda carrera en guardia que no haya visto (§11.5). Por eso `?diag=1` vale también, para un administrador con sesión, en la ficha de carrera (`GET /api/calendar/:raceId`: clasificaciones, `Stages` y la cabecera) y en el feed (`GET /api/news` y `GET /api/teams/:id/news`), servidos con `worldHorizon` y con la misma franja, desde el botón `Diagnostic view` que su cabecera enseña solo a los administradores; con las mismas reglas: para quien no es administrador el parámetro no existe, nada se escribe y las claves de React Query llevan `diag`. Las fichas de corredor, los rankings y la portada no lo aceptan: no es ahí donde se depura una carrera. Sin esto, la única salida sería poner su alcance en `off` (§10.4), que le quita el velo de todo y no solo de la pantalla que depura (decisión 11-h).

Con `SPOILER_MODE=admins` (§10.13), durante el despliegue, el velo solo se aplica a los administradores: el dueño vive el producto con velo como espectador y abre `?diag=1` para depurar, las dos cosas en la misma cuenta. Lo que ve en diagnóstico lo sabe él, no su cuenta: si después abre la etapa sin `diag`, el producto le ofrece `Watch` como a cualquiera. El guion `race-radio.mjs --db` sigue existiendo para la radio re-simulada (DD-11); el modo diagnóstico mira lo guardado en producción sin re-simular.

Se prueba con un test de la API (`apps/api/src/stageRoute.test.ts`, en el 7b, §17.10): un administrador con `?diag=1` recibe el `StageReplay` entero de una etapa velada y ninguna fila de `race_watch` cambia tras pedir la cabecera, tres tramos y el acta; un jugador con `?diag=1` recibe lo mismo, byte a byte, que sin él. Y en el 8a, `apps/api/src/diagMode.test.ts` (nuevo) hace lo mismo con la ficha de carrera y el feed: un administrador con `?diag=1` los recibe con `worldHorizon` y sin escribir nada; un jugador, lo mismo byte a byte que sin el parámetro.

### 11.16 La `Race Radio` bajo el velo

Hoy la pestaña `Race Radio` (pantalla) de una etapa corrida pinta la radio guardada (`stage_snapshots.radio`, que la ruta de etapa manda como `radio`: `buildRaceRadio`, `apps/api/src/chronicle.ts` l. 1340-1398; `routes/races.ts` l. 518 y 536), con un deslizador por todos los km y un botón `Finish` (pantalla; `RaceRadioPanel.tsx` l. 387-419). Destripa por dos sitios. El primero es obvio: el deslizador y `Finish` llegan a la foto de meta (`sup. E6`). El segundo no lo es: la lista de seguimiento que escribe el tick mete en cada grupo grande, desde el km 0, a los diez primeros DE LA ETAPA (`radioWatchList`, `stageRun.ts` l. 558-568), y el motor guarda además, entre los que tiran por encima de los doce primeros, a los que están en esa lista (`packages/engine/src/sim/raceRadio.ts` l. 912-913). Quien ve nombrado en el pelotón del km 20 a un corredor que ni tira ni lleva maillot ni iba entre los diez primeros de la general sabe que acabará entre los diez primeros. D-16, escrito como hecho: lo guardado no cambia hasta el paso 11, y lo que destripa se corta al leer.

| La etapa, para quien mira | Del paso 7b al 10 | Desde el paso 11 (B16 en verde) |
| --- | --- | --- |
| conocida | la radio guardada de hoy, entera: la lista de seguimiento ya no adelanta nada | `radioFromTimeline` (§12.10) si la etapa tiene línea, con `nameableAt` igual a la política de §7.7 más los diez primeros de la etapa (la lista de seguimiento de hoy, aplicada al leer: en una etapa conocida no destripa; 12-o); la guardada si no |
| no conocida | la puerta: la ruta de etapa no manda `radio` (§14.1) | la radio hasta lo pintado, construida en la web con los tramos ya descargados (decisión 11-i); sin línea, la puerta |
| la retransmisión de una etapa sin línea (el adaptador de §3.8) | la radio guardada, cortada al construir la línea para todos (decisión 11-l) | ídem |

**La radio hasta lo pintado** (11-i). La radio es una foto por km: cada grupo con su hueco en el momento en que pasa por ese km, que es la definición del dueño (I-05, §3.2). La foto del km 150 lleva el hueco del grupeto en el km 150, y el grupeto pasa por ahí veinte minutos después que la cabeza: enseñarla cuando la cabeza llega al km 150 adelantaría si el grupeto entra en el control. Por eso, en una etapa no conocida, la pestaña enseña solo las fotos CERRADAS en lo pintado: las de los km por los que ya habían pasado todos los grupos vivos en `reachedS`, que es lo alcanzado del espectador y nunca lo descargado (D-57). La web las construye con `radioFromTimeline` (una función pura de `packages/shared/src/broadcast/radio.ts`, §4.13) sobre la línea que ya tiene, cortada en `reachedS`, con los nombres del reparto de la cabecera, que ya viene con el velo (`veilCast`, §10.10), y se queda con las fotos cerradas; no hay ruta nueva ni campo nuevo en la ruta de etapa. El deslizador acaba en la última foto cerrada, no hay `Finish`, y la cabecera de la pestaña lo dice: `Race Radio · up to km 142 · as far as you've watched` (pantalla). Una etapa sin línea no tiene tramos con que construirla, y su pestaña enseña la puerta hasta que se conozca: son las del mundo de pruebas y las que se corran con `TIMELINE_RECORD=off` (§18.3).

**El corte de la radio guardada** (11-l). El adaptador de §3.8 construye la línea de una etapa sin línea con la pertenencia de los nombrados en la radio guardada, y la guarda en una LRU que comparten todos los espectadores. Si no se cortara, en la retransmisión no se nombraría a nadie por estar en la lista (la política de §7.7 decide a quién nombrar), pero tocar `+143 riders` (pantalla) abriría la lista de los miembros conocidos del grupo, que en el adaptador son justamente los que siguió la radio: los diez primeros de la etapa. Así que se corta al construir, igual para todos, sea o no conocida la etapa para quien mira:

```ts
// apps/api/src/chronicle.ts (se amplía junto a buildRaceRadio: nace en el 3a con el adaptador, 17-f, y el 7b añade los casos de la pestaña; D-16)
import { BROADCAST } from '@cyclingstar/shared'

type StoredRadio = z.infer<typeof storedRaceRadioSchema>
/** Los doce primeros de `pulling` están por tirar, no por la lista. Copia de `STORED_PULLERS_MAX` (raceRadio.ts l. 591) hasta el 4b, que la exporta
 *  (5-g): entonces esta línea pasa a importarla de @cyclingstar/engine. Hasta ese día la ata broadcastConstants.test.ts (§15.5, 15-k). */
export const PULLERS_KEPT = 12

// La radio guardada sin lo que su lista de seguimiento destripa. En un grupo de más de `BROADCAST.nameWholeGroupUpTo`
// se queda con los doce primeros que tiran y, del resto, solo con los nombrables en ese km; un grupo pequeño se
// nombra entero, porque su composición es estado (§7.7). `pullingTotal` es una cuenta y no cambia.
export function veilStoredRadio(stored: StoredRadio, nameableAt: (km: number) => ReadonlySet<string>): StoredRadio {
  return {
    ...stored,
    kms: stored.kms.map((k) => {
      const ok = nameableAt(k.km)
      const nameable = (i: number): boolean => ok.has(stored.riders[i] ?? '')
      return {
        ...k,
        groups: k.groups.map((g) => {
          if (g.size <= BROADCAST.nameWholeGroupUpTo) return g
          const keep = g.pulling.map((i, pi) => pi < PULLERS_KEPT || nameable(i))
          return {
            ...g,
            pulling: g.pulling.filter((_, pi) => keep[pi]),
            motivos: g.motivos.filter((_, pi) => keep[pi] === true),
            paraQuien: g.paraQuien.filter((_, pi) => keep[pi] === true),
            watching: g.watching.filter(nameable),
          }
        }),
      }
    }),
  }
}
```

`PULLERS_KEPT` es una copia con fecha de muerte: el 3a la necesita porque solo el paso 4 toca el motor (D-54) y `STORED_PULLERS_MAX` no se exporta hasta el 4b (§5.4, 5-g). Hasta entonces `PULLERS_KEPT` se exporta y `apps/api/src/broadcastConstants.test.ts` comprueba que vale 12, el valor de `STORED_PULLERS_MAX` en el motor de hoy (`packages/engine/src/sim/raceRadio.ts` l. 591; §15.5, decisión 15-k); en el 4b, `chronicle.ts` importa la del motor y se borran la copia y su caso.

`nameableAt(km)` no depende de quien mira, y por eso el resultado cabe en la LRU compartida: los tres maillots con que se salió (`leadersThroughStage(db, raceKey, N − 1)`, lo mismo que hoy da `leaders.onRoad`, `routes/races.ts` l. 469), los `BROADCAST.namedGcTop` (10) primeros de la general de salida y los protagonistas de los sucesos guardados (`stage_snapshots.events`, `RaceEvent.protagonistas`) de km menor o igual que el de la foto, que es la regla de §7.7 para los sucesos ya revelados. Los corredores del espectador, que §7.7 nombra siempre, no pueden entrar en un corte compartido; en el adaptador solo salen si tiran entre los doce primeros o están en alguno de esos tres grupos, que es una pérdida de la vista degradada (`Recorded before full race data`, pantalla, §3.8) y no una fuga. Quien no conoce la N−1 no llega a ver nada de esto: la cabecera de la N le trae la puerta `previous_unseen` y sus tramos dan 403 (§11.12).

Medido en el scratchpad (`l7/radiocorte.mjs`: el campo del banco de `scripts/race-radio.mjs`, el motor compilado del repositorio, `radioForStorage` como en producción; `race-france` e7, e18 y e20 y `race-colombia` e5, tres semillas cada una). El banco corre la etapa sola, sin general de salida ni maillots, así que su lista de seguimiento es solo el top 10 de la etapa y su conjunto de nombrables está vacío; en producción la lista lleva además los tres maillots y los diez primeros de la general, y el corte los deja. Resultado: en la primera foto, la del km 0,1, salen nombrados en un grupo grande 9 o 10 de los diez primeros de la etapa en las doce corridas, y en el 76-100 % de las fotos hay al menos uno nombrado solo por estar en la lista. El corte baja los nombrados por grupo grande de 10,9-20,1 a 7,6-10,2 de media y cuesta de 0,4 a 3,2 ms por etapa en Node, una vez por etapa, porque su resultado vive en la LRU del adaptador.

El paso 11 (§17) deja de leer la radio guardada para las etapas con línea (el 11a), y DD-11 decide dejar de escribirla en ese mismo paso (el 11b, 17-v): la columna queda para las etapas viejas, y `veilStoredRadio` y el adaptador siguen para ellas. B16 (§16.4) compara `radioFromTimeline` con `radioForStorage` sin lista de seguimiento (5-g) y, para la etapa conocida, con los diez primeros de la etapa en los dos lados (16-t), así que lo que la pestaña enseña desde el paso 11 es la radio de hoy menos lo que destripaba.

### 11.17 Lo que `docs/navegacion.md` dice y cambia

`docs/navegacion.md` es el documento del que sale la navegación de hoy, y en cuatro sitios pone el resultado como lo primero que se ve (mapa 03 §9; contradicción 1 del mapa 05): la cabecera con el ganador, `Stages` (pantalla) con el ganador de cada etapa, la clásica que abre en `Result` y la portada con el puesto. E2 no reescribe ese documento: el paso 12 lo corrige (D-58) para que E6, que es quien lo mantiene, parta de lo que el producto hace. Línea a línea:

| `docs/navegacion.md` | Qué dice hoy | Qué pasa a decir | Dónde |
| --- | --- | --- | --- |
| §3.5, l. 167 | «Mismo feed para todos, sin personalizar» | un feed global con las noticias del corredor propio marcadas `· you` (pantalla), como hace ya la API, y bajo el velo | §11.7 |
| §4, l. 245-246 | la portada con `LAST RACE` y `9th at 1'42" · In the front group until km 148` (pantalla) | la última etapa CONOCIDA, o `Your last race · Race France, Stage 8 · Ready to watch` (pantalla); y encima `Continue watching`, `Ready to watch` y `While you were away` | §11.4 |
| §7.1, l. 337 | cabecera persistente con el «ganador si ya se corrió» | con el ganador si la última etapa no está en el velo de quien mira (la conoce, o la carrera está fuera de su guardia o caducada); si lo está, `Finished · ready to watch` (pantalla) | §11.5, `sup. C1`, DD-01 |
| §7.1, l. 345-346 | `Classifications` por defecto en curso y terminada | igual, pero las tablas son las de tras la etapa k, con `After stage 9 of 21 · stages 10-12 ready to watch` (pantalla) | §11.5, `sup. C2` |
| §7.1, l. 351-353 | `Stages` con el ganador y «Read the story →» a `?tab=story` | el ganador de las etapas que el servidor manda, con `Report →` al acta; `Ready to watch · Watch →` (pantalla) en las corridas sin ganador servido; `Not raced yet` en las demás | `sup. C4` |
| §7.1, l. 370 y 374 | la clásica terminada abre en `Result` porque «el desenlace es lo que se busca» | abre en `Watch` para quien no la conoce, y en `Report` para quien sí (11-o) | §11.10, `sup. C3` |
| §7.1, l. 379-381 | `/stages/1` redirige a la ficha con `story` por defecto | redirige sin fijar pestaña, así que la ficha abre en la suya por defecto, `Watch` o `Report` según la conozca quien mira (11-o), que es lo que promete el enlace de un marcador (§11.7); `?tab=story` de los enlaces viejos abre `report`, que con la etapa velada pinta la puerta | `sup. E9` |
| §7.2, l. 388 y 393 | `[ Story ] [ Result ] [ Classifications ] [ Profile ]`, con `Story` por defecto | las pestañas de §6.10: `Watch` primero para quien no conoce la etapa, `Report` primero para quien la conoce | §6.10, D-48 |
| §7.4, l. 440-441 | `Story` abre con «On the road today», los maillots de salida | la línea sigue en `Report`; en `Watch` los maillots de salida van en el rótulo de cada corredor, y con la N−1 velada, la puerta | §7.2, §11.12, `sup. E3` |
| §7.4, l. 455-458 | los maillots se distinguen por forma, no solo por color | se conserva; lo usan los rótulos de `Watch` | §18.8 |
| §9, l. 486 | «Foro de equipo: introduce el primer texto libre del juego» | queda abierto para E9, con la regla del sello | §11.14 |
| §9, l. 492-493 | «¿mostrar las etapas futuras con su recorrido, o solo las ya corridas?» | con su recorrido y `Not raced yet`: el recorrido no destripa ([DOC 4]) | §11.5 |
| §9, l. 494-495 | cuánta telemetría cabe en la vista de espectador | la de `Watch`: dos números, la barra, el perfil y un rótulo; el resto, en `Race Radio` ([DOC 4]) | §6.10 |

La fila de `Stages` deja de decidir por el ganador solo (hoy, sin ganador, dice `Not raced yet`, `Race.tsx` l. 380-397, y una etapa corrida y velada diría eso mismo, que es falso). Decide con lo que el servidor manda, en una función pura que el test de la página prueba sin DOM:

```ts
// apps/web/src/domain/raceStages.ts (nuevo, PR 9b; §17.20). Cada fila de `Stages` enseña lo que el servidor manda (sup. C4).
import type { RaceStagePlan, StageWinner } from '@cyclingstar/shared'

export type StageRowState = 'report' | 'watch' | 'not_raced'
/** `report`: con ganador servido (de 1 a k, o todas si la carrera no está en guardia); `watch`: corrida y sin ganador servido. */
export function stageRowState(stage: RaceStagePlan, winnerOf: ReadonlyMap<number, StageWinner>, runDays: readonly number[]): StageRowState {
  if (winnerOf.has(stage.index)) return 'report'
  return runDays.includes(stage.index) ? 'watch' : 'not_raced'   // `runDays` es calendario (L, sup. C6)
}
```

`report` pinta el ganador y `Report →`, que lleva a `/world/races/:raceId/stages/:day/report`; `watch` pinta `Ready to watch` y `Watch →`, que lleva a la página de la etapa, que abre en `Watch`; `not_raced`, `Not raced yet` (pantalla, las tres). Ninguna de las tres mira lo que pasó en la etapa: la primera depende de lo que el velo deja pasar y las otras dos, del calendario.

La ficha de una carrera de un día terminada es la única pantalla de hoy cuya pestaña por defecto enseña el resultado sin haber elegido nada, y su arreglo es de código, no solo de documento (decisión 11-o, PR 9b):

```ts
// apps/web/src/domain/raceTabs.ts (cambia en el 9b): `story` pasa a `report` (D-48) y gana `watch`. STAGE_RACE_TABS (l. 31-35) no cambia.
export type RaceTabId =
  'watch' | 'classifications' | 'result' | 'report' | 'radio' | 'stages' | 'route' | 'startlist' | 'honours'

export const RACE_TAB_LABEL: Record<RaceTabId, string> = {
  watch: 'Watch', classifications: 'Classifications', result: 'Result', report: 'Report', radio: 'Race Radio',
  stages: 'Stages', route: 'Route', startlist: 'Startlist', honours: 'Roll of honour',
}

/** La carrera de UN DÍA sin terminar: lo previo, como hoy. La entrada `finished` de hoy (l. 50, con `story`) se va a ONE_DAY_FINISHED. */
const ONE_DAY_TABS: Record<Exclude<RaceStatus, 'finished'>, readonly RaceTabId[]> = {
  upcoming: ['route', 'startlist', 'honours'],
  racing: ['route', 'startlist'],
}
/** La carrera de UN DÍA terminada abre según la haya visto quien mira. `report`, `result` y `radio` pintan la puerta si no (§6.10).
 *  Con `Watch` apagado para quien mira, las de hoy: `Result` primero y el acta a su lado, con el nombre `Story` (raceTabLabel). */
const ONE_DAY_FINISHED: Record<'seen' | 'unseen' | 'off', readonly RaceTabId[]> = {
  unseen: ['watch', 'route', 'report', 'result', 'radio', 'honours'],
  seen: ['report', 'result', 'radio', 'route', 'honours', 'watch'],
  off: ['result', 'report', 'radio', 'route', 'honours'],
}

/**
 * `seen`: quien mira vio o reveló la etapa (`WatchState.seen`, `W`, `S` o `R`); una arrastrada (`A`) o una caducada (`X`) no, y
 * abren en `Watch` (6-r, 10-e). `watchOn`: `Watch` está encendido para él, lo mismo que `request.broadcastOn()` en la API (§14.5).
 * Los dos solo los mira una carrera de un día terminada; una vuelta pasa `true` y el suyo.
 */
export function raceTabs(status: RaceStatus, stageCount: number, seen: boolean, watchOn: boolean): readonly RaceTabId[] {
  if (stageCount !== 1) return STAGE_RACE_TABS[status]
  if (status !== 'finished') return ONE_DAY_TABS[status]
  return ONE_DAY_FINISHED[!watchOn ? 'off' : seen ? 'seen' : 'unseen']
}

/** La pestaña por defecto es la primera del conjunto, y por eso gana los mismos `seen` y `watchOn`. */
export function defaultRaceTab(status: RaceStatus, stageCount: number, seen: boolean, watchOn: boolean): RaceTabId {
  return raceTabs(status, stageCount, seen, watchOn)[0] as RaceTabId
}

/** El nombre de cada pestaña: `report` se llama `Story`, como hoy, mientras `Watch` no esté encendido para quien mira; el cambio llega
 *  con el encendido y no con el despliegue del 9a y el 9b (§20.5). */
export function raceTabLabel(id: RaceTabId, watchOn: boolean): string {
  return id === 'report' && !watchOn ? 'Story' : RACE_TAB_LABEL[id]
}

/** Las pestañas de la página de una etapa CORRIDA (§6.10), en el mismo fichero para probarlas sin DOM: con `Watch` encendido, `watch`
 *  primero si quien mira no la vio (sin letra, `A` o `X`) y `report` primero si la vio o la reveló; con `Watch` apagado, las de hoy
 *  (`StageReplay.tsx` l. 30-36), con `report` llamada `Story`. La etapa sin correr sigue con las suyas (§6.10). */
export type StagePageTabId = 'watch' | 'report' | 'result' | 'classifications' | 'radio' | 'profile'
export function stagePageTabs(seen: boolean, watchOn: boolean): readonly StagePageTabId[] {
  if (!watchOn) return ['report', 'result', 'radio', 'classifications', 'profile']
  return seen ? ['report', 'result', 'classifications', 'radio', 'profile', 'watch'] : ['watch', 'profile', 'report', 'result', 'classifications', 'radio']
}

/** Los enlaces ya compartidos con `?tab=story` abren `report`: con la etapa velada, la puerta (sup. E9). La aplican la ficha de carrera y la de etapa antes de `useTabParam`. */
export const LEGACY_TAB: Readonly<Record<string, RaceTabId>> = { story: 'report' }

/**
 * A dónde va `/world/races/:raceId/stages/1` de una carrera de UN DÍA. Sin `?tab=`, ya no elige: la ficha abre en su
 * pestaña por defecto, `Watch` o `Report` según `known` (11-o), que es lo que promete el enlace de un marcador (§11.7).
 */
export function oneDayStageTab(stageTab: string | null): RaceTabId | null {
  switch (stageTab) {
    case 'result':
    case 'classifications':
      return 'result'
    case 'radio':
      return 'radio'
    case 'profile':
      return 'route'
    case 'watch':
      return 'watch'
    case 'report':
    case 'story':
      return 'report'
    default:
      return null
  }
}

/** URL completa de esa redirección, conservando el resto de la query (`?cls=`); sin pestaña pedida, sin `tab`. */
export function oneDayStageTarget(raceId: string, search: URLSearchParams): string {
  const next = new URLSearchParams(search)
  const tab = oneDayStageTab(search.get('tab'))
  if (tab === null) next.delete('tab')
  else next.set('tab', tab)
  const q = next.toString()
  return q === '' ? `/world/races/${raceId}` : `/world/races/${raceId}?${q}`
}
```

`seen` sale del `watch.seen` de la ruta de etapa (`WatchState`, §14.1) y `watchOn`, de `features.broadcastWatch` de `['health']` (`on`, o `admins` y administrador según `GET /api/admin/whoami`, 11-h), que es lo que decide `request.broadcastOn()` en la API: así la pestaña `Story` conserva su nombre y la carrera de un día terminada sigue abriendo en `Result` para quien no tiene `Watch` encendido, y el cambio llega con el encendido (§20.5). La ficha de una carrera de un día terminada pide la ruta de su etapa al abrirse y no al tocar la pestaña, porque de ella depende la pestaña por defecto; es la misma consulta que hoy comparten `Story` y `Race Radio` (`OneDayStory` y `OneDayRadio`, `Race.tsx` l. 513-547), y sin el resultado pesa de 0,46 a 2,1 KB con gzip (medido por L6, §14.1). Mientras llega, la ficha enseña la cabecera sin pestañas, como hoy mientras carga, y `Race.tsx` l. 595 pasa `seen = watch?.seen ?? true`: sin `watch`, con `SPOILER_MODE=off`, la etapa se trata como vista (§17.12); una vuelta pasa `true`. La página de etapa (`StageReplay.tsx` l. 345-346) toma sus pestañas de `stagePageTabs(watch?.seen ?? true, watchOn)` en lugar de `STAGE_TAB_IDS` (l. 30-36): una etapa arrastrada abre en `Watch` (6-r), y el caso de la cruzada de L4 está en `raceTabs.test.ts`: una vuelta fuera de guardia, se ve la etapa 5 y la 1 abre en `Watch`. El bloque sustituye el fichero de hoy entero salvo `STAGE_RACE_TABS`, porque dejar cualquiera de sus otras piezas no compila: `RACE_TAB_LABEL.story` (l. 22) sobra en el tipo nuevo, `ONE_DAY_TABS.finished` (l. 50) lleva `story`, `defaultRaceTab` (l. 58-60) llama a `raceTabs` con dos argumentos y `oneDayStageTab` (l. 80-81) devuelve `story` en su rama por defecto (comprobado con tsc sobre el fichero de hoy, `rcod/n/rt/`). `raceTabs.test.ts` gana los dos casos de la carrera de un día terminada, y sus casos de hoy con `story` cambian: l. 33-34 esperan los conjuntos de `ONE_DAY_FINISHED` y `defaultRaceTab('finished', 1, seen, watchOn)`, con `Watch` encendido y apagado; l. 46-47, `report` en lugar de `story`; l. 67-68, `oneDayStageTab(null)` nulo y `oneDayStageTab('story')` `report`; l. 84-86, la redirección sin pestaña va a `/world/races/paris-roubaix`. El enlace de cada fila de `Stages` (`Race.tsx` l. 390, hoy con `?tab=story`) es el de `stageRowState`.

### 11.18 La lista blanca de B1b, entera

B1b corre una etapa velada y compara, byte a byte, lo que recibe un jugador que no la ha visto antes y después (§16.3). Pueden cambiar dos cosas y ninguna más. La primera, los campos de las rutas L cuya respuesta cambia al correrse una etapa, cada una con su motivo escrito en `config.veil.why` (`VeilSpec`, §14.5). Esta es la lista entera, sacada de 11.1 a 11.3; la última columna es la ruta de campos en la gramática de `strip` (§16.3: puntos, `[]` recorre un array y `[veiledDay]` quita la fila del día de la etapa velada), y `B1B_WHITELIST` la copia fila a fila y en el mismo orden. Si una ruta nueva necesita entrar, entra aquí con su motivo o no entra:

| Ruta | Qué puede cambiar al correrse una etapa velada | `config.veil.why` | Superficie | Campos (`strip`) |
| --- | --- | --- | --- | --- |
| `GET /api/calendar/:raceId` | `status` y `runDays` | `'calendario: cuántas etapas se han corrido, no quién las ganó'` | `sup. C6` | `status`, `runDays` |
| `GET /api/riders/me` | `rider.attributes` | `'DD-08: los atributos propios se enseñan aunque los mueva lo aprendido en carrera'` | `sup. H3` | `rider.attributes` |
| `GET /api/riders/me/form` | `form`, y en `log` la fila del día de la etapa: su carga (`ctl`, `atl`, `tsb` y `tss`), con la actividad de su etapa y el parte nulo | `'DD-08: la condición propia se enseña; el parte y la actividad de los días velados, no'` | `sup. H3` | `form`, `log.[veiledDay]` |
| `GET /api/riders/me/coach-view` | las notas del preparador, que miran REC y el atributo de la carta | `'DD-08: las notas del preparador miran los atributos propios, que mueve lo aprendido en carrera'` | `sup. H3` | `coachView.notes` |
| `GET /api/riders/:id` | `rider.attributes`, los de cualquier corredor | `'DD-08: los atributos se enseñan aunque los mueva lo aprendido en carrera, también los de un rival'` | `sup. X11` | `rider.attributes` |
| `GET /api/riders/me/race-prefs` | las convocatorias de carreras futuras | `'convocatorias decididas con el mundo al día; no nombran ninguna etapa'` | | `races.[].callup` |
| `GET /api/riders/me/offers` | las ofertas | `'ofertas con el rating y los presupuestos del mundo al día; no nombran ninguna etapa'` | | `offers` |

La segunda, lo que cambia solo porque el velo gana la etapa. Entre los dos barridos el velo del jugador pasa de vacío a la etapa velada (conoce la 1 y la 2, y la 3 no existía antes de correrse), así que lo que depende SOLO del horizonte cambia por construcción, sea cual sea el desenlace: es lo que §11.6 quiere que cambie. B1b lo quita antes de comparar, con estas rutas de campos (`[stageReady]` quita las filas `stage_ready` y `[toWatch]` la fila de marcador de la carrera velada; los dos tokens son de `strip`, §16.3), y B1c, que compara dos desenlaces con el mismo velo, no lo quita:

| Ruta | Qué cambia porque el velo gana la etapa | Campos (`strip`) |
| --- | --- | --- |
| `GET /api/news` y `GET /api/teams/:id/news` | el `stage_ready` de la etapa velada (§11.7) y, en el feed de un equipo de su lista de salida, su marcador (11-g) | `news.[stageReady]` |
| `GET /api/riders/:id/results` | la fila `Race France · 1 stage to watch` de la carrera velada (§11.6, punto 2) | `results.[toWatch]` |
| `GET /api/riders/me/last-race` | `ready`, la `PreStageInfo` de la etapa velada (§11.4) | `ready` |
| `GET /api/riders/me/report` | las sesiones y los días de entrenamiento: el día velado cuenta con la actividad de su etapa (11-e), y ese día no tenía fila antes de correrse (medido con el código de hoy: `report.sessions` pasa de 2 a 3 entradas, `rcod/n/b1/sweep.mjs`) | `report.sessions`, `report.trainingDays` |

Fuera del barrido de B1b, con su motivo en `SKIP` (§16.3): `GET /api/me/horizon`, que es el velo mismo, y las cuatro rutas de la etapa velada (la de etapa, `…/broadcast`, `…/broadcast/chunk` y `…/report`), que antes de correrse dan el plan o un 404 y después la puerta; esas las vigilan B1a y B1c.

Y las rutas L cuya respuesta no cambia al correrse una etapa, que no necesitan entrada en la lista de B1b pero llevan su motivo en el registro (B1d): `GET /api/calendar/:raceId/startlist` (`'la lista de salida se congela antes de la salida'`), `GET /api/my-orders` (`'rivales por fama, que no se escribe'`), las tres de la vuelta de prueba (`'la vuelta de prueba no entra en guardia'`), las doce de administración y `POST /api/world/advance`, trece en total (`'solo administradores'`; para un jugador son un 401 antes y después). Un campo que cambie fuera de estas dos tablas es un fallo de B1b, también si el cambio parece inocente: el ranking, la salud de un corredor ajeno y el orden de una lista eran inocentes hasta que se leyeron (11.1).

### 11.19 Los tests de esta sección

Cada pieza nueva de esta sección llega con su test, escrito en el mismo PR y antes que su código (§17). Los bancos B1a a B1d y B20 son de §16; aquí van los de las piezas propias:

| Test (fichero) | Qué prueba | PR |
| --- | --- | --- |
| `packages/shared/src/broadcast/pageTitle.test.ts` (nuevo) | los títulos de la tabla de §11.8 para cada `PageKind`, con la carrera de un día y con `p` nulo; `stageReadyNotice` con y sin lista de salida; que en sus salidas no hay más palabras que las de `STAGE_KIND_WORDS`, el nombre de la carrera, los números y las fijas | 9a |
| `apps/web/src/domain/pageTitle.test.ts` (nuevo) | que `domain/pageTitle.ts` es el único fichero de `apps/web/src` que escribe `document.title`; que el título de una etapa velada no lleva el nombre del ganador canario. Empieza por `/// <reference types="node" />` y lee los fuentes con `readdirSync` y `readFileSync`, porque `apps/web/tsconfig.json` pone `"types": []` (l. 9): sin la directiva, TS2307 (comprobado); con ella, Node queda cargado para todo el programa de la web, como en los otros cinco tests que la llevan (§17.21) | 9a |
| `apps/api/src/emails.test.ts` (se amplía) | `stageReadyEmail`: asunto, primera línea, botón y pie; el nombre del canario no está ni en el asunto, ni en el texto, ni en el HTML | 9a |
| `apps/api/src/raceRadio.test.ts` (se amplía) | `veilStoredRadio`: un grupo de 13 o más se queda con los doce primeros que tiran y los nombrables; uno de 12 no cambia; `size`, `pullingTotal` y `unnamed` cuadran tras `buildRaceRadio`; en una etapa del banco, ningún corredor del top 10 de la etapa que no sea nombrable sale en un grupo grande (la copia `PULLERS_KEPT` la ata `broadcastConstants.test.ts`, §15.5) | 3a; el 7b añade los de la pestaña (17-f) |
| `apps/api/src/stageRoute.test.ts` (se amplía) | `?diag=1`: un administrador recibe el `StageReplay` entero de una etapa velada y ninguna fila de `race_watch` cambia; un jugador recibe lo mismo, byte a byte, que sin el parámetro (11-h) | 7b |
| `apps/api/src/diagMode.test.ts` (nuevo) | `?diag=1` en `GET /api/calendar/:raceId`, `GET /api/news` y `GET /api/teams/:id/news`: un administrador los recibe con `worldHorizon` y ninguna fila de `race_watch` ni `horizon_rev` cambia; un jugador recibe lo mismo, byte a byte, que sin el parámetro (11-h) | 8a |
| `packages/db/src/fichaCorredor.test.ts` (se amplía) | `veiledRaceDays` y `veilDailyLog`; `getBlockReport` y `getAttrTrend` sin `carrera` ni `sobrecompensacion` de los días velados; las sesiones y la serie de actividad son las mismas abandonara el corredor o no (11-e) | 8b |
| `packages/db/src/abandon.test.ts` (se amplía) | con el abandono en una etapa velada, `getRiderUpcomingRaces` sigue listando la carrera, `getRiderRaceDays` devuelve los días que quedaban y la retirada responde `alreadyOut: false` sin escribir nada; con la etapa conocida, lo de hoy (`sup. X2`, `sup. X9`, `sup. X10`) | 8b |
| `packages/db/src/ranking365.test.ts` (se amplía) | el recorte de 11-f: con puntos y restas al azar (semilla fija, 500 casos), los `limit` primeros tras pedir `limit + d` coinciden con los del recálculo entero | 8b |
| `packages/db/src/newsVeil.test.ts` (nuevo) | una etapa velada con cinco noticias da un solo `stage_ready`, en su sitio del orden; un equipo en la lista de salida sin noticias recibe su marcador; dos semillas con desenlaces distintos dan los mismos bytes (11-g) | 8a |
| `apps/web/src/domain/raceTabs.test.ts` (se amplía) | la carrera de un día terminada, vista y no, con `raceTabs` y `defaultRaceTab`, con `Watch` encendido y apagado (`raceTabLabel` da `Story` apagado); `stagePageTabs`: la etapa arrastrada, conocida con `A` y sin ver (`seen` falso, 6-r), abre en `watch`: una vuelta fuera de guardia, se ve la etapa 5 y la 1 abre en `Watch`; `?tab=story` abre `report`; la redirección de `/stages/1` sin `?tab=` no fija pestaña y conserva `?cls=`; los casos de hoy que esperan `story` (l. 33-34, 46-47, 67-68 y 84-86) pasan a `report` o a ninguna pestaña (11-o) | 9a (`stagePageTabs`, `raceTabLabel`) y 9b |
| `apps/web/src/pages/stageTables.test.tsx` (se amplía; render estático con `MemoryRouter`, como hoy, §16.6) | con la etapa no conocida y la URL con `?tab=result&cls=kom`, y con `?tab=classifications`, la ficha de etapa pinta `StageGateCard` y no la tabla; `?tab=story` abre `Report`, que también pinta la puerta (`sup. E9`) | 9a |
| `apps/web/src/domain/raceStages.test.ts` (nuevo) | `stageRowState`: con ganador servido, `report`; corrida y sin ganador, `watch`; sin correr, `not_raced` (`sup. C4`) | 9b |
| B1b con dos cuentas (propuesto a §16.3) | que otra cuenta vea o revele una etapa no cambia un byte de lo que recibe la primera (§11.14) | 8b |
| B12, la cuenta del día (propuesto a §16.4) | veinte peticiones a la vez el día nuevo hacen una sola cuenta del ranking del día y de `lastRunStages`; si la cuenta falla, la petición siguiente la repite (11-s) | 8b |

### 11.20 Lo que ve cada espectador

Las secciones anteriores van superficie a superficie; esta tabla va espectador a espectador, con la etapa 12 del Tour ya corrida, y es la que siguen los casos de B1 y de B12 (§16.3, §16.4). «Fuera de guardia» es una carrera que para ese espectador no es propia, ni seguida, ni de cabecera en su alcance (§10.4).

| Espectador | La página de la etapa 12 (pantalla) | Agregados, fichas y noticias | La portada | Qué escribe |
| --- | --- | --- | --- | --- |
| jugador en `guarded` que no ha visto la 12 | `Watch`; `Report`, `Result`, `Classifications` y `Race Radio` con la puerta | a horizonte, con el aviso; un `stage_ready` por etapa velada | `Ready to watch` con la 12, o `Continue watching` si la dejó a medias | lo alcanzado y la meta, en `race_watch` |
| el mismo jugador ante una carrera fuera de guardia | `Watch`, sin puerta, y `Report` a un toque (10-e) | al día: esa carrera no está en su velo | nada de esa carrera | al empezar a verla la sigue (`follow = 1`, D-30; el defecto de DD-01) y desde entonces es la fila de arriba |
| jugador en `own_only`, con el Tour sin su corredor | como la fila anterior: el Tour está fuera de guardia | al día | nada del Tour | como la fila anterior |
| jugador en `off` | `Watch`, sin puerta, y `Report` a un toque | al día, en todas las carreras | sin `Ready to watch`; `Continue watching` si dejó una a medias | lo alcanzado, para reanudar; nada entra en guardia aunque siga una carrera |
| quien vuelve sin sesión, con `cs_viewer` | lo de su cuenta, según su alcance | lo de su cuenta, en lectura | la de invitado, con `Sign in to see results as you know them` | nada: las escrituras de `/api/me/*` piden sesión (§10.8) |
| visitante sin cuenta ni cookie (`anon`) | `Watch`, sin puerta; el acta, pública, a un toque | al día | la de invitado | su progreso, solo en `localStorage` (11-p) |
| robot de vista previa (sin cookie, `anon`) | no ejecuta JavaScript: el título y las `og:` neutras del fallback; en `/report`, `Spoiler · Winner: …` | | | nada |
| jugador durante el despliegue, con `SPOILER_MODE=admins` | el producto de hoy, sin velo y sin `watch` (§10.13) | el de hoy | la de hoy | nada |
| administrador con `?diag=1` | la etapa entera, como conocida, con `Diagnostic view · not counted as watched` | la ficha de carrera y el feed con `?diag=1`, al día y con la misma franja; lo demás, con su horizonte | la suya | nada (11-h) |

---

**Injertos aplicados:** I-05 (§11.16: la radio del dueño desde el estado y sin lista de seguimiento; la foto por km frente al instante decide qué fotos se enseñan en lo pintado); I-11 (§11.12: el reparto congelado llega degradado con la N velada, `veilCast`, y nadie lleva el maillot que ganó en ella); I-27 (§11.8 y §11.9: `PreStageInfo` como única entrada de `pageTitle`, `usePageTitle`, `stageReadyNotice` y `stageReadyEmail`; la decisión de enviar no mira el resultado); I-28 (§11.1 a §11.5: los mecanismos del velo aplicados superficie a superficie y ruta a ruta); I-29 (§11.1 y §11.2: las 48 superficies una a una, las nueve puertas de fuera y dos más, `sup. X10` y `sup. X11`); I-34 (§11.13: el rastro de etapa de la `0046` y `stage_team_results.prize`, con quién escribe y quién lee cada columna); I-35 (§11.11: revelar sin castigo, `Don't ask again` guardado en la cuenta y `Watch anyway`); I-36 (§11.8 y §11.10: título y `og:` neutros por el fallback de la SPA; `Share to watch` siempre y `Share the report` solo si se conoce, marcado `Spoiler`); I-37 (§11.4: `Continue watching`, `Ready to watch` y `While you were away`, con el que vuelve tras una semana paso a paso); I-39 (§11.6 y §11.7: la existencia también informa; un marcador por etapa velada en todo flujo); I-40 (§11.14: con el horizonte de quien mira, lo visto es privado y la regla para E9); I-42 (§11.5: los agregados con su fecha de horizonte y la ficha de carrera hasta lo conocido).

**Objeciones resueltas:** O-08 (§11.10: el visitante abre en `Watch` también la clásica, con el acta a un toque); O-26 (§11.4: quien vuelve tras una semana encuentra el Tour velado, porque la caducidad es de 56 días de juego y no de 28, y lo ve con el digest de `Watch the race in 33 minutes`, calculado, en lugar de `Catch up at ×4`); O-32 (§11.2 y §11.13: X1, X2, X5, X7 y X9 con su mecanismo, y el presupuesto velado con `stage_team_results.prize` en lugar de aceptarlo como fuga).

**Huecos rellenados:** H-06 (§11.15: el modo diagnóstico, con quién, cómo se entra, qué sirve el servidor, qué no escribe y su test); H-08 (§11.14: dos jugadores en km distintos, con `AuthorStamp` y `stampReached` para E9); H-20 (§11.4: `Next: Stage 8 · Watch`, sin reproducción automática, la más antigua primero y dos carreras del mismo día en filas separadas).

**Contradicciones de hecho resueltas:** X-17 (§11.1 y §11.3: las 48 filas exactas, las siete que hoy no destripan con su porqué, las fugas de fuera del mapa y las 87 rutas que registra Fastify, 52 de ellas `GET`, una a una).

**Decisión tomada aquí:**

- **11-a. El cierre se reparte en cinco PR.** El 7b cierra la etapa (`sup. E1` a `sup. E8`); el 8a pone el registro con la política de todas las rutas y los mecanismos P, F, G y N; el 8b, las restas y las máscaras (R y M) y las puertas de 11.2; el 9a cambia la web de la etapa y el 9b, la del mundo. Por qué: R y M necesitan `veilDelta`, que lee las columnas de la `0046` (8a); P, F y G solo necesitan el horizonte y `veilSql`. Se descarta un PR único para todo el velo del mundo: no se puede revisar, y B1d no podría ir en verde antes que las restas.
- **11-b. `sup. X10` es una puerta más, con M.** El planificador (`GET /api/riders/me/orders`, `raceDays`) y su proyección (`POST /api/riders/me/plan/preview`, `arrivals`) leen `getRiderRaceDays`, que tras un abandono deja de contar como de carrera los días que quedaban (`riderSchedule.ts` l. 47). Se enmascara con `VeilDelta.abandons`, a la vez que `sup. X2`. Por qué: si una de las dos enmascara y la otra no, la otra delata. Se descarta aceptarla como pista: el planificador es la pantalla de todos los días.
- **11-c. La ficha de carrera titula con la `PreStageInfo` de su etapa 1**, en la web y en `shellMetaFor`. Por qué: `pageTitle('en', p, 'race')` solo necesita el nombre de la carrera, la etapa 1 existe siempre y no es un resultado, y así el título es el mismo antes y después del JavaScript. Se descarta un tipo `PreRaceInfo` para un solo campo.
- **11-d. `stageReadyEmail(_locale, p, ownRiderOnStartlist, url): MailBody`**, en lugar de la firma que fijó la síntesis (el `_locale`, de 12-q). Por qué: la primera línea necesita saber si el corredor propio está en la lista de salida, y el tipo del cuerpo de correo en el código es `MailBody` (`emails.ts` l. 58). Se descarta calcular esa marca dentro de la plantilla, que dejaría de ser pura.
- **11-e. Un día de carrera velado se enseña como día de carrera.** En la serie de forma, con la actividad de su etapa y el parte nulo, corriera o no; en el informe del bloque y la tendencia, sin las filas `carrera` y `sobrecompensacion` de esos días y con las sesiones contadas por día. La carga se queda (DD-08). Por qué: la actividad real delata el abandono, y esconder el día dejaría un hueco que solo existe cuando hay algo que esconder. Se descarta enmascarar también la carga, que contradice DD-08 y haría saltar la gráfica.
- **11-f. Una lista con tope pide `limit + d` filas**, con `d` el número de corredores con puntos velados, resta, reordena y corta; el puesto de un corredor es su posición en el ranking a horizonte, no la cuenta de `getSeasonRank`. Por qué: es exacto (§11.5) y cuesta 1 ms (medido, `l7/horizonte.mjs`). Se descarta ordenar en SQL con el valor real y restar después: el orden delata la resta.
- **11-g. El `stage_ready` va en el sitio de las noticias de su etapa, delante de las de su día, y el feed de un equipo lleva un marcador por etapa velada de cada carrera en cuya lista de salida está**, se escribiera sobre él una noticia o ninguna. Por qué: el orden estable de D-45 no dice dónde va una fila que no es noticia, y un marcador por noticia del equipo destriparía por existir. Se descarta ponerlos todos arriba: separaría el marcador de su carrera.
- **11-h. `?diag=1` de quien no es administrador se ignora**, y la respuesta es la misma, byte a byte, que sin él; la web sabe si enseñar el modo por `GET /api/admin/whoami`, la puerta ofrece a los administradores un botón `Diagnostic view`, las claves de React Query llevan `diag` y la web no manda progreso ni meta en ese modo. Por qué: un 403 diría que el modo existe, y un enlace con `diag` compartido por error no debe romper nada. Se descarta un modo de solo lectura para el dueño con horizonte propio: es lo que ya da `SPOILER_MODE=admins`. `?diag=1` vale también en la ficha de carrera y en el feed (`GET /api/calendar/:raceId`, `GET /api/news` y `GET /api/teams/:id/news`), con `worldHorizon`, la misma franja y las mismas reglas, porque el dueño caza defectos en las clasificaciones y en las noticias (`docs/balance.md` l. 9173-9175, v45) y esas pantallas quedan a su horizonte desde `SPOILER_MODE=admins`; no vale en las fichas, los rankings ni la portada. Se descarta dejarle como salida el alcance `off`, que le quita el velo de todo y no solo de la pantalla que depura.
- **11-i. La `Race Radio` de una etapa no conocida enseña la puerta hasta el paso 10, y desde el 11 solo las fotos cerradas en lo pintado**, construidas en la web con `radioFromTimeline` sobre los tramos ya descargados; sin línea, la puerta. Por qué: la foto de un km lleva el hueco de cada grupo al pasar por él, que para los de atrás es futuro. Se descarta el deslizador hasta el km de la cabeza y una ruta nueva de radio hasta lo alcanzado, que duplicaría los tramos.
- **11-j. La retirada con el abandono velado responde `alreadyOut: false` y no escribe nada.** La carrera sigue en «tus carreras» hasta que se conozca la etapa del abandono. Por qué: es la respuesta de una retirada normal, y cualquier otra delata la caída. Se descarta un 403 o un mensaje propio.
- **11-k. `GET /api/teams/me/race-plan` es `safe`.** `getRiderTeamRacePlan` no lee `teams.budget` (`teamPlan.ts` l. 151-205; su tipo es «sin dinero», l. 115-128). La fila de §10.6 que la pone junto a `getTeamCalendar` con R vale solo para esta. Va a Dudas.
- **11-l. El adaptador de la radio corta la lista de seguimiento al construir la línea, para todos**, con `veilStoredRadio` y un conjunto de nombrables que no depende de quien mira (los maillots y los diez primeros de la general de salida, y los protagonistas de los sucesos hasta ese km). Por qué: su LRU es compartida y su pertenencia es la de los nombrados, así que abrir `+143 riders` enseñaría a quién siguió la radio. Se descarta cortar por espectador, que rompe la LRU y aun así no podría añadir a los corredores propios.
- **11-m. El número del aviso de los agregados es el de etapas del velo de quien mira** (`h.veil.length`, la suma de `HorizonSummary.ready[].stages`), el mismo en todas las páginas. Por qué: un número por página (las etapas que afectan a este corredor) dependería de lo que pasó en ellas. Se descarta.
- **11-n. El sello de E9 es la posición del autor en la carrera, en segundos de carrera** (`AuthorStamp`, `stampReached`), y lo que no se ha alcanzado no deja rastro, ni un contador. Por qué: `race_watch` guarda segundos, el km depende del grupo, y la existencia informa. Se descarta sellar con la fecha de escritura, que no dice hasta dónde había visto el autor.
- **11-o. La carrera de un día terminada abre en `Watch` para quien no la ha visto** y en `Report` para quien sí, con `Watch` encendido para él: `raceTabs(status, stageCount, seen, watchOn)`, `story` pasa a `report` (y se sigue llamando `Story` hasta el encendido, `raceTabLabel`) y `?tab=story` abre `report`; la página de etapa, con `stagePageTabs(seen, watchOn)` (6-r). La ficha pide la ruta de su etapa al abrirse. Por qué: es la única pantalla de hoy cuya pestaña por defecto enseña el resultado sin elegir nada (contradicción 1 del mapa 05). Se descarta mantener `Result` primero y, para el visitante, abrir el acta (O-08). La redirección de `/stages/1` de una carrera de un día no fija pestaña si no se pidió ninguna (`oneDayStageTab` devuelve null), para que el enlace de un marcador abra en `Watch` a quien no la conoce (§11.7); se descarta redirigir siempre a `report`, que le enseñaría la puerta en lugar de la carrera.
- **11-p. El progreso del visitante va en `localStorage`**, clave `cs.watch.<raceKey>.<day>` y valor `{ "reachedS": n }`, leído y escrito dentro de `try/catch`; sin sesión no se manda progreso al servidor. Por qué: sobrevive a cerrar la pestaña y no viaja en cada petición. Se descartan `sessionStorage` (se pierde al cerrar) y una cookie.
- **11-q. Las etapas de una carrera terminada no se repiten en `Ready to watch`**: van en `While you were away`, con sus cuatro salidas. Por qué: diecisiete tarjetas de la misma carrera no dicen más que un bloque. Se descarta enseñarlas en los dos sitios.
- **11-r. Los atributos de cualquier corredor y las notas del preparador son L por DD-08** (`sup. X11`; `GET /api/riders/:id`, `rider.attributes`, y `GET /api/riders/me/coach-view`, `coachView.notes`, en la lista blanca de B1b). Por qué: medido con el código de hoy en el mundo de B1, la etapa velada mueve LLA, MON, DES y TAC de la ficha de cualquiera (TAC de +0,37 a +0,41, y el ganador no es el que más sube), la web los pinta en medias estrellas para un corredor ajeno, y velarlos exige `rider_attr_log`, que se purga a los 60 días cuando una etapa de gran vuelta puede seguir velada más tiempo. Se descarta velarlos restando `rider_attr_log`; si el dueño lo prefiere, es DD-08 (§20) con esa purga como límite.
- **11-s. La cuenta del día se guarda como una promesa por `(worldId, currentDay)`**: el total del ranking (R, §11.5) y `lastRunStages` (18-a). La primera petición del día la lanza, las que llegan mientras tanto esperan la misma y, si falla, se borra y la siguiente la repite. Por qué: tras cada tick llegan a la vez las primeras peticiones del día nuevo, y sin ella cada una pagaría los 70 ms del ranking (104 el máximo, §18.2). Se descarta calcularla en el tick, que no sabe qué procesos de la API la necesitan.
- **11-t. El presupuesto del equipo se vela por defecto, y la elección es del dueño** (DD-26, §20). Por qué: el premio de equipo solo lo cobran el equipo del ganador de la etapa y los de la general final, con importes fijos (3.000, 1.500 o 500 por etapa), así que el presupuesto de hoy delata la victoria; el velado es una cota inferior del real y no bloquea ninguna decisión (`draftRace` no lo mira). Se descarta decidirlo aquí sin el dueño, porque el dinero de los equipos es su primera decisión de economía (`docs/agenda.md` l. 34); la otra cara es visible como DD-08.
- **11-u. Fuera de guardia, la ficha de carrera cuenta el final**: la cabecera `Winner` y los ganadores de `Stages` se enseñan si la etapa no está en el velo de quien mira, aunque no la haya visto; la etapa, en cambio, le abre en `Watch` (§10.2). Por qué: es D-30, el resto del mundo se ve al día. Se descarta leer `race_watch` sea cual sea la guardia (enseñar el ganador solo de las etapas con letra `W`, `S`, `R` o `A`): la ficha diría otra cosa que el índice de carreras y las noticias, que fuera de guardia siguen al día (`sup. I1`, `sup. N1`), y como una carrera que nunca se ha mirado no tiene fila en `race_watch`, escondería el ganador de todas las carreras no vistas, que es la tercera respuesta de DD-01, todas las carreras en guardia, y lo decide el dueño en DD-01 (§20) con esta consecuencia.

**Propuesto para el glosario:**

- `sup. X10`: la décima puerta de fuera del inventario, el planificador y su proyección, que tras un abandono dejan de contar como de carrera los días que quedaban (`routes/riders.ts` l. 242 y 376; `riderSchedule.ts` l. 47). §11.2.
- `STAGE_KIND_WORDS`: las palabras en inglés de cada `StageKind` para avisos y vistas previas (`packages/shared/src/broadcast/pageTitle.ts`).
- `veiledRaceDays(h: Horizon, d: VeilDelta, riderId: string): ReadonlyMap<number, string>` y `veilDailyLog(rows: readonly DailyLogRow[], veiled: ReadonlyMap<number, string>): DailyLogRow[]`: los días de carrera velados de un corredor, con la actividad de su etapa, y la serie de forma con ellos enmascarados (`packages/db/src/riders.ts`).
- `veilStoredRadio(stored: StoredRadio, nameableAt: (km: number) => ReadonlySet<string>): StoredRadio`: la radio guardada sin lo que su lista de seguimiento destripa (`apps/api/src/chronicle.ts`).
- `AuthorStamp` y `stampReached(s: AuthorStamp, h: Horizon): boolean`: el sello de la posición del autor para el contenido de jugador de E9; propuesto, no se implementa en E2 (`packages/shared/src/broadcast/`).
- `RaceTabId` gana `watch` y `report` y pierde `story`; `raceTabs(status, stageCount, seen, watchOn)`, `defaultRaceTab(status, stageCount, seen, watchOn)`, `raceTabLabel(id, watchOn)`, `StagePageTabId` y `stagePageTabs(seen, watchOn)`, `oneDayStageTab(stageTab): RaceTabId | null` y `LEGACY_TAB` (`apps/web/src/domain/raceTabs.ts`).
- `sup. X11`: la undécima puerta de fuera del inventario, los atributos de la ficha de cualquier corredor, que mueve lo aprendido en la etapa (`GET /api/riders/:id`; `browse.ts` l. 297-303). §11.2.
- `StageRowState` y `stageRowState(stage, winnerOf, runDays): StageRowState`: qué enseña cada fila de `Stages` según lo que el servidor manda (`apps/web/src/domain/raceStages.ts`, nuevo).
- La firma que fijó la síntesis, `stageReadyEmail(p: PreStageInfo, url: string): Email`, pasa a `stageReadyEmail(_locale: 'en', p: PreStageInfo, ownRiderOnStartlist: boolean, url: string): MailBody` (11-d, 12-q); `pageTitle` y `stageReadyNotice` ganan también el `_locale` delante (12-q).
- Textos de pantalla que §G.11 no tiene: `Race Radio · up to km 142 · as far as you've watched`, `Standings after stage 5 · Watch stage 6 to update`, `Your last race · Race France, Stage 8 · Ready to watch`, `Race France is under way · Stage 10 of 21 · Watch from the start`, `Your rider raced`, `Watch stage 10`, `Watch →`, `Report →`, `This also reveals stages 3 and 4.`, `Only protect your own races?`, `Results stay hidden until you watch the stage.`, `Watch it here:`, `Stage 8 · Race France · Watch the race`, `Spoiler · Winner: …` y los títulos `Rider · Cycling Star`, `Team · Cycling Star`, `News · Cycling Star` y `Rankings · Cycling Star`.

**Dudas para el ensamblador:**

- §10.6 (`10-horizonte.md` l. 168) pone `getRiderTeamRacePlan` y `/api/teams/me/race-plan` con R junto a `getTeamCalendar`; la función no lee dinero (`teamPlan.ts` l. 115-128 y 151-205) y §11.3 clasifica la ruta como `safe` (11-k). Una de las dos tiene que cambiar; la evidencia está en el código.
- §6.10 cuenta la etapa caducada entre las conocidas, que abren en `Report`; la decisión 10-e y `stageAccessOf` (§14.1: «X no: caducada abre en Watch») la abren en `Watch`, y §11.10 sigue a 10-e.
- Defecto de hoy, ajeno a E2, para el dueño (§19 o §20): `getBlockReport` cuenta los días de carrera con `activity === 'carrera'` (`packages/db/src/riders.ts` l. 549), y el tick escribe `carrera:<raceId>:e<n>` (`stageRun.ts` l. 672 y 746): en producción el informe dice siempre `0 race days` y cuenta los días de carrera como de entrenamiento. Solo el test usa `carrera` a secas (`fichaCorredor.test.ts` l. 100).
- DD-08 en §20 debería nombrar, entre las pistas que acepta, la subida de `RES` por la sobrecompensación el día de la última etapa de una gran vuelta, que solo reciben los que la terminan (`stageRun.ts` l. 826-852), y el factor 0,5 del aprendizaje al abandonar (`LEARNING.dnfFactor`).
- Dos tests propuestos a §16: B1b con dos cuentas (§11.14, punto 3) y el del modo diagnóstico (§11.15); los dos están en la tabla de §11.19.
- La lista blanca de B1b de §11.18 es la de esta sección; §16.3 debería copiarla tal cual o citarla.
- El glosario (§G.4) tiene que recoger la firma nueva de `stageReadyEmail` (11-d).
- 11-i hace que, desde el paso 11, la pestaña `Race Radio` de una etapa no conocida se construya en la web con `radioFromTimeline` sobre la línea cortada en lo alcanzado, quedándose con las fotos cerradas: §12.10 y §17.14 tienen que contar con que `radioFromTimeline` acepte una línea cortada.

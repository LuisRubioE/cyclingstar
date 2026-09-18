# El generador de recorridos: la gramática de motivos

## 0. Cabecera y resumen ejecutivo

El documento se titula `# El generador de recorridos: la gramática de motivos (diseño final)` y vive
en `docs/generador.md`. Es el diseño ÚNICO que se implementa: cada decisión está tomada, cada tipo
está escrito, cada constante lleva valor e intención y cada paso del plan lleva sus tests antes que
su código. Quien lo implemente no tiene a quién preguntar, y el texto está escrito contando con eso.

### 0.1 Encargo, estado y versión del código

**Encargo.** Es E1 de `docs/encargos.md` (l. 73-111), el primero de los trece, fichero
`docs/generador.md`, tamaño esperado grande (l. 75). El encargo, literal en lo que decide (l.
77-81):

> El veredicto del dueño sobre esto es el más duro de todo el proyecto («para las que no se puedan
> nunca reproducir, el generador es una basura») y está confirmado con un caso concreto: el
> generador le dio a una carrera de un día de montaña el perfil de una etapa reina de gran vuelta,
> con final en alto de catorce kilómetros, algo que no existe en el calendario real, y eso dejó al
> 82 % del pelotón con el tanque a cero. Se arregló ese caso y el generador entero sigue sin
> revisar.

Las tres cosas que hay que arreglar están identificadas y comprobadas en `docs/agenda.md` §4.18 (l.
864-923): los modelos son literalmente tres para una vuelta (`type MixTerrain = 'flat' | 'hilly' |
'mountain'`, `calendar.ts` l. 410) y seis para un día; el azar está en los detalles y no en la
arquitectura (la semilla mueve cuánto mide cada rampa, no cómo está construida la carrera); y el
generador es ciego a la geografía (`oneDaySpec(terrain, km, seed)`, l. 400, no recibe `country`, que
`buildRace` calcula en l. 889 y no pasa a ninguna rama de construcción, mapa 02 §6). Las palabras
del dueño que este documento tiene que contestar son tres: «para las que no se puedan nunca
reproducir, el generador es una basura. Hay que arreglarlo, está pésimo» (`docs/epics.md` G6), «Hay
que arreglar eso» (G5) y «siempre son los mismos tres o cuatro modelos» (agenda §4.18, parafraseado
por la agenda). Y la razón por la que va primero y no último no es estética: los perfiles son la
entrada de la calibración táctica (agenda §4.18, l. 895), y `epics.md` E3 documenta cinco versiones
del motor certificando que la fuga gana en montaña del 27 al 30 % de las veces sobre `reina-150`,
que es media montaña con la etiqueta cambiada, cuando en las reinas de verdad ganaba el 3,3 %
(agenda l. 897-900). Un generador falso es ese problema extendido a las 1.418 etapas del calendario.

**Estado.** Diseño cerrado, pendiente solo de la fase adversaria (refutadores contra el código) que
este documento deja preparada en el apéndice B de la sección 19. Sale de cinco propuestas y tres
juicios; la base es la gramática de motivos de `propuestas/arquitectura.md`, ganadora con dos votos
de tres, y sobre ella van 45 injertos de las otras cuatro, todos localizados en el apéndice A de la
sección 19 con la sección en que cayeron y cómo.

**Versión del código.** Todo lo que este documento cita (rutas, líneas, cifras medidas) está leído
contra HEAD `8585ca2` del 2026-09-14, el árbol que leyeron los siete mapas (mapa 04 l. 3), con
`ENGINE_VERSION = 69` en `packages/engine/src/constants.ts` l. 718 (comprobado al escribir esta
cabecera) y última migración `0039`. Regla de versión, que no se discute en ninguna sección:
`ENGINE_VERSION` sube UNA sola vez, en el paso 8 del plan (sección 15), al siguiente número libre en
producción al empezar ese paso; la nota de `docs/balance.md` se llama «v61 · El generador es una
gramática» y, si al implementar ya existe una v61, toma el siguiente número libre. Los pasos 0 a 7
no tocan la versión porque no cambian ningún perfil de producción; el paso 9 (remedición) y el 10
(base, API y web) tampoco, porque miden y exponen lo que el paso 8 ya cambió.

### 0.2 Método

El mismo que produjo `docs/tactica.md` y `docs/entrenamiento.md`, descrito en
`docs/diseno/README.md` y exigido por `docs/encargos.md` l. 62-67: sin refutadores un documento de
diseño es una opinión larga. Aquí, en orden:

1. **Siete mapas** del código y de la realidad, cada uno con cifras medidas por script:
   `01-generador` (`profileGen.ts` entero, qué mueve la semilla y qué no), `02-calendario`
   (`calendar.ts`, las 842 carreras y 1.418 etapas, quién recibe el país), `03-motor` (lo que
   `sampleProfile`, `finishType`, `stageKindOf` y `finalKindOf` leen de un perfil), `04-banco`
   (bancos, bandas, y los seis casos en que una banda verde escondía un perfil falso), `05-docs`
   (inventario: 177 etapas reales, 226 sin validar, 1.015 inventadas, mapa 05 l. 178), `06-tests`
   (qué se re-sella y con cuántas semillas) y `07-ciclismo-real` (qué existe de verdad en cada sitio
   y en cada clase, con el caso v40 y las plantillas medidas).
2. **Cinco propuestas** independientes sobre los mapas: `arquitectura` (la gramática de motivos),
   `banco` (el generador visto desde la medida), `geografia` (el sitio como restricción),
   `ingeniero` (el refactor atribuible paso a paso) y `datos` (el corpus real como vara).
3. **Tres jueces** con foco distinto, cada uno con tabla cruzada y comprobaciones en código:
   cobertura y fidelidad al dueño, coherencia con el motor, ejecutabilidad y realismo. Votos
   (`juicios/veredicto.json`): cobertura y ejecutabilidad a `arquitectura`, motor a `ingeniero`;
   ranking normalizado a 100 puntos: arquitectura 100, banco 97,5, geografía 95,5, ingeniero 94,
   datos 91,5. Los tres jueces pidieron injertos: 17, 14 y 14, que son los 45 de la tabla del
   apéndice A.
4. **Síntesis** sobre la ganadora con los 45 injertos y los 27 riesgos de los jueces (10 + 8 + 9)
   resueltos uno a uno (apéndice B). Las cifras vienen de los mapas, del juez del motor
   (`juicios/motor.md` §1, script `juicios/coste-motor.mjs`) y de `propuestas/datos.md` §1.4 (script
   `scratchpad/e1/medir-real.mjs`); cada sección dice de dónde sale cada número.
5. **Fase adversaria pendiente**: refutadores contra el código real y auditoría de sus fallos uno a
   uno. El apéndice B deja escrita la lista de objeciones ya conocidas para que los refutadores
   empiecen por lo que los jueces no cerraron.

### 0.3 Cómo leer

- Las citas del dueño van entre «» y solo esas. Las conclusiones del repositorio se marcan como lo
  que son: _es media montaña con la etiqueta cambiada_ es prosa de `docs/epics.md` E3 paso 4, no del
  dueño, y se cita sin comillas angulares; el «está bien así» del cierre de v44 (`docs/balance.md`)
  sí es suyo y se refiere al 18,1 % de fugas en montaña de aquella medida.
- Cada número medido lleva su procedencia: mapa (`mapa 01 §2.1`), propuesta (`datos.md §1.4`) o
  juicio (`motor.md §1`). Un número sin procedencia es un error del documento y la fase adversaria
  debe cazarlo.
- Los nombres son los del glosario de la sección 3 y de la tabla de constantes de la sección 12, sin
  sinónimos. Quien venga de las propuestas encuentra la tabla de alias en la nota al pie de la
  sección 3 (`RouteBrief` es `Skeleton`, `Paisaje` es `GeoZone`, `Papel` es `StageRole`, y así).
- Las decisiones del dueño van marcadas **[DECISIÓN DEL DUEÑO Dn]** en el texto y recogidas en la
  sección 18, cada una con valor por defecto; el valor por defecto es lo que se implementa si no
  contesta. Nada queda «a definir».
- Los rangos se escriben `[a; b]`; los decimales con coma; las líneas de código como `l. 400`; las
  fracciones de etapa como `@[0,3; 0,85]`.
- Los tipos van en TypeScript, en bloque de código y completos; las constantes van con valor e
  intención; los tests van antes que el código en cada paso del plan y se nombran por fichero.
- Ficheros y líneas están verificados contra el árbol de §0.1; si al implementar una línea se ha
  movido, manda el nombre del símbolo y la sección 15 exige comprobar cada cita en el paso 0.

### 0.4 Qué cambia respecto de hoy, en diez líneas

1. **Los moldes desaparecen.** Los ocho `xxxSegments` de `profileGen.ts` (siete en realidad:
   `ittSegments` l. 510-514 es literalmente `flatSegments` l. 236-240, mapa 01 §2.1) y los tres
   terrenos de `MixTerrain` (`calendar.ts` l. 410) se sustituyen por 12 `MotifKind`, 9 `MetaKind`,
   32 `Skeleton` (15 de un día, 17 de etapa) y 4 `TourSkeleton`; la semilla decide primero la
   arquitectura (`arch|raceId`) y después el detalle (`dib|…`). Secciones 4, 5 y 8.
2. **El país entra por fin.** 29 `GeoZone` con `GeoSignature` (qué existe y qué no, con `null` como
   «aquí no existe» en `puerto`, `cota` y `muro`), 56 `Territorio` como ruta ordenada con
   `cordillera` (los 56 países con carreras de equipos, mapa 02 §10; los 77 restantes de `COUNTRIES`
   caen a `fallback` contado), y `RACE_REGION` curada a mano para las 310 carreras de equipos y por
   etapa para las 60 ediciones (`race-france` e6 → `pirineos`); ningún sorteo de zona. Los 532
   nacionales salen de `zonaDe(code)`. Sección 6.
3. **Una carrera es la misma carrera.** `Skeleton`, zona, motivos de firma, papeles, crono y número
   de etapas son identidad por `raceId`; la edición (temporada) mueve una lista cerrada (motivos no
   firma, km ± 6 %, vueltas ± 1, motivo opcional, dibujo). `BASE_SEASON = 0` (`calendarRun.ts` l. 135) y `SEASON_CALENDAR = calendarForSeason(0)` tira los mismos dados que cualquier otra
   temporada. Sección 10.
4. **Lo que el motor lee no cambia.** `Segment`, `Ramp` y `Banner` de `types.ts` l. 12-48 quedan
   intactos; nunca se emite `rompepiernas`; viento, altitud, costa y meseta viajan en
   `arch.metadatos` y en la ficha como texto que no promete abanicos, no como física (mapa 03 §5.1).
   Secciones 3 y 17.
5. **Dieciséis vetos** (`V1` a `V16`), puros de `routes/`: por etapa con reintento (V1 a V10 y V15),
   de calendario medidos en `routeCensus` (V11, V12, V16) y de vuelta (V13, V14). El caso v40 es V5
   (última cota de un día ≤ 4,2 km coronando a [3; 17] km de meta; en meta solo `muro` ≤ 2,2 km) y
   la lección de `reina-150` es V8 (reina de verdad: puerto ≥ 9 km en meta o D+ ≥ 3.400 m, y ≥ 25 %
   de la subida a más de 30 km de meta), escritas como reglas y no como bandas, con el test
   «`reina-150` expresada como esqueleto no pasa `verify`». Sección 9.
6. **Lo real manda y se ve.** Huella FNV de las 177 etapas reales y de las 3 grandes vueltas sellada
   en `realFingerprint.test.ts` antes de tocar `calendar.ts`; `routeSource` con tres valores
   (`real`, `edicion`, `generado`) desde `CalendarStage` hasta `race_routes` y la pantalla;
   `featureProfile.ts` no se toca en E1. Sección 11.
7. **El banco mide el calendario que el juego corre.** `routeCensus` en cada push (0,57 s medidos
   sobre 1.418 etapas, `motor.md` §1) con `ROUTE_CENSUS_TARGETS` y columna «hoy (medido)»; protocolo
   «mejor y no solo distinto» con línea base del generador viejo, dirección pre-registrada por banda
   y cuatro condiciones; tabla pareada viejo/nuevo como condición para borrar
   `sim/legacy/profileGenLegacy.ts`; remedición con dueño, orden por coste y presupuesto (4 h de
   máquina, techo 8). Sección 13.
8. **Kilómetros por clase y papel.** `ARCH.km.porClase` como tabla: desaparecen los 210 km fijos de
   142 de las 178 carreras de un día (`row.km ?? 210`, `calendar.ts` l. 917, mapa 02 §1) y las
   etapas de 165 a 195 km en una .2; las 36 filas con `km` explícito lo conservan. Sección 7.
9. **El dueño ve el resultado antes de aceptarlo.** `scripts/galeria-recorridos.mjs` genera una
   galería de altimetrías por zona × esqueleto (5 semillas por par, más los nacionales de los 133
   países) en el paso 4, antes del paso 8, con tres preguntas por perfil; y cada etapa generada
   lleva en la ficha su frase de arquitectura y «Edición N». Secciones 16 y 10.
10. **Un solo salto de `ENGINE_VERSION`** (paso 8), once pasos con tests primero (sección 15), coste
    de arranque MEDIDO con objetivo 1.500 ms y techo 2.500 ms contra los 578 ms de hoy (`motor.md`
    §1; sección 14), y 10 decisiones que son del dueño, cada una con valor por defecto (sección 18).

### 0.5 Mapa del documento

| Nº  | Sección                      | Qué contiene en una línea                                                                                                                                                                                                                                   |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Diagnóstico medido           | Lo que el generador hace hoy, con línea y cifra: tres modelos, semilla en el detalle, país que no llega, dos generadores de reina, el caso v40, la lección de `reina-150`, y lo que ya está bien y se conserva.                                             |
| 2   | Principios                   | Diez principios, cada uno con qué lo viola hoy: la arquitectura se sortea, la geografía restringe, lo declarado se garantiza, identidad y edición, lo real manda, vetos puros, medir antes de bandear, el dueño ve antes.                                   |
| 3   | El modelo de tipos           | Todos los bloques TypeScript (`Motif`, `Skeleton`, `GeoSignature`, `Territorio`, `RACE_REGION`, `TourSkeleton`, `StageRequest`, `GeneratedStage`, `edition`, `veto`, `RouteStats`) y contra qué línea del código encaja cada uno; la tabla de alias al pie. |
| 4   | La gramática de motivos      | Los 12 `MotifKind` y los 9 `MetaKind` uno a uno: rango en `ARCH`, cómo se rinde a `Segment[]`, qué lee el motor, caso real que lo motiva, y cómo se cierran los tres bordes sin holgura.                                                                    |
| 5   | Los esqueletos               | El catálogo de 32 con `motivo×n@ventana`, meta, D+, km, `requiere`, `pesoBase`, plantilla canónica literal y `alternativas`; `ARCH.pesoPorClase`; qué esqueleto recibe cada etapa de edición sin rasgos.                                                    |
| 6   | La geografía                 | `ZONAS` (29 filas × 12 columnas), `TERRITORIOS` (56 + fallback), `RACE_REGION` (310 + 60 por etapa) con procedimiento de curación y test; qué es dato y qué es juicio; tests de consistencia interna.                                                       |
| 7   | Las vueltas por etapas       | `itinerarioDe`, los 4 `TourSkeleton` con `BlockRule` como reparación determinista, lo que se conserva de `mixRoles`, `ARCH.pesosComposicion`, `kmDe` con `ARCH.km.porClase` y `maxPorClase`.                                                                |
| 8   | La instanciación             | `generateStage` en siete pasos con subflujo nominal cada uno, `normalizeEnlaces`, `garantizaClase`, `emitirPancartas`, reintento hasta 8 y plantilla canónica, circuitos, transición y etapa de edición real.                                               |
| 9   | Los vetos                    | Tabla de V1 a V16 (regla, dónde se comprueba, qué lee, caso que impide, test); V5 y V8 con párrafo propio; V12 anti-clon calibrado; plausibilidad blanda; fallback contado.                                                                                 |
| 10  | La identidad entre ediciones | Qué es fijo y qué es de la edición, `BASE_SEASON = 0` tirando dados, `ARCH.edicion.nivel` 0/1/2, semillas separadas, `calendarForSeason` memoizada, `race_routes` con `kind`, «Edición N» en la ficha, test de identidad.                                   |
| 11  | Lo real frente a lo generado | Prioridad de `buildRace`, `featureProfile.ts` intacto y su deuda, huella FNV de 177 + 3, `routeSource` hasta la web, `kind` coherente con `SUMMIT_RUN_IN_KM`, `stageKindOf` sin recalibrar.                                                                 |
| 12  | Las constantes               | El bloque `ARCH` entero con valor, intención y apoyo; qué se retira de `ROUTE`, qué se conserva, qué literales de `profileGen.ts` migran, y qué no cambia (`FINAL_KIND_CUTS`, `PASS_MIN_KM`, `WALL_MAX_KM`, `STAGE.finish*`).                               |
| 13  | El banco                     | Lo que no se mueve, lo que se re-sella y con qué causa, `routeCensus` y `ROUTE_CENSUS_TARGETS`, `calendarQueens` estratificada, `frozenSkeletons`, el protocolo «mejor y no solo distinto», la remedición con dueño, orden, horas y techo.                  |
| 14  | Rendimiento y arranque       | Las cifras de hoy (578 ms de carga, 0,40 ms por etapa), lo que la gramática añade, `scripts/medir-arranque.mjs`, `arranque.test.ts` con objetivo y techo, memoización y calendario perezoso.                                                                |
| 15  | El plan                      | Once pasos (0 a 11) con tests primero, código, qué cambia, qué se re-sella, coste y riesgo; dependencias y paralelismo; el único salto de versión en el paso 8.                                                                                             |
| 16  | La galería                   | `scripts/galeria-recorridos.mjs`: entrada, salida, qué muestra por perfil, cuántos, las tres preguntas del dueño y qué hace el implementador con las respuestas (editar datos, nunca código).                                                               |
| 17  | Riesgos y lo que queda fuera | Quince riesgos con mitigación o sacrificio consciente, y lo que E1 no hace (dato real, Mundial, grandes vueltas generadas, motor, SPEC §6.17, `featureProfile`).                                                                                            |
| 18  | Decisiones del dueño         | D1 a D10: qué se decide, qué cambia con cifras, recomendación y valor por defecto que se implementa si no contesta.                                                                                                                                         |
| 19  | Apéndices                    | A: los 45 injertos y dónde cayeron. B: los 27 riesgos de los jueces y las objeciones a la ganadora, cada una con la sección que la resuelve.                                                                                                                |

Las decisiones del dueño que esta cabecera ya da por tomadas con su valor por defecto, para que
nadie las busque en otro sitio: `ud_montana_alto` existe como rareza al 0,02 en .1 (D1);
`stageKindOf` no se recalibra en E1 (D2); `et_prologo` y `et_cronoescalada` entran con p 0,25 y 0,08
(D3); ninguna meta volante generada (D4); `ud_criterium` con peso 0 (D5);
`calendarQueens.breakawayWinPct` se mantiene en [6; 30] como vigilancia hasta la remedición (D6);
`ARCH.edicion.activa` con `nivel` 1 y nivel 2 donde el esqueleto declare alternativas (D7); las
vueltas sin cordillera no tienen reina (D8); `ARCH.km.maxPorClase` con las cifras del mapa 07 §4.1
(D9); la ficha enseña frase de arquitectura y «Edición N» siempre (D10). Todas en la sección 18.

---

## 1. Diagnóstico medido: lo que el generador hace hoy

Con evidencia (fichero y línea) y con números medidos, no con impresiones. Las cifras «medidas» de esta sección tienen cuatro procedencias y cada una se nombra donde se usa: el mapa 01 (los ocho constructores de `profileGen.ts` corridos tal cual sobre 300 semillas × 5 kilometrajes [130, 155, 175, 195, 215] = 1.500 etapas por forma, la rejilla de `stageKind.test.ts` con cinco veces más semillas); el mapa 06 §1 (las 1.418 etapas de `SEASON_CALENDAR` clasificadas por la rama de `buildRace` que las produce); `propuestas/datos.md` §1.4 (el extractor `scratchpad/e1/medir-real.mjs` sobre las 177 etapas con rasgos reales); y el mapa 04 §3 con `docs/epics.md` E3 y `docs/balance.md` v43 a v60 (lo que el banco certificó y lo que producción hacía). Todo está leído contra `ENGINE_VERSION` 69 (`constants.ts` l. 718).

La conclusión, adelantada: el veredicto del dueño («para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está pésimo», epics G6; «siempre son los mismos tres o cuatro modelos», agenda §4.18) no es una percepción sino una descripción exacta del código. Y el daño no es estético: los perfiles generados son la entrada de 17 de las 32 bandas de `TARGETS` (mapa 04 §2), y el repositorio ya tiene escrito lo que pasa cuando se calibra contra una forma que no existe (§1.7).

### 1.1 Los tres hallazgos de agenda §4.18, confirmados con línea

#### 1.1.1 Los modelos son literalmente tres para componer y seis para un día

`calendar.ts` l. 410 declara `type MixTerrain = 'flat' | 'hilly' | 'mountain'` y el comentario de l. 409 lo dice sin rodeos: son «los tres terrenos que sabe componer una vuelta por etapas (el resto se reduce a ellos)». La reducción es `mixTerrain` (l. 416-420): `mountain` → `mountain`, `hilly` y `classic` → `hilly`, todo lo demás (`flat`, `cobbles`, `itt`) → `flat`. Una vuelta «de adoquines» no existe como tal: se compone como llana (mapa 02 §4.1). Para la carrera de un día, `oneDaySpec(terrain, km, seed)` (l. 400-407) es un `switch` de seis ramas hacia los constructores de l. 108-172: `cobbles`, `classic`, `mountain` (que llama a `mountainOneDay`, l. 149-152), `hilly`, `itt` y el resto a `flat`.

El flujo entero, con sus semillas (mapa 01 §0), cabe en diez líneas:

```
calendar.ts::stageMix(n, terrain, seedBase)             · las 72 vueltas sin edición
   routeRng(`mix|${seedBase}|${n}|${terrain}`) → papeles (llana/media/media-alto/reina/cri) y km
   semilla de cada etapa = `${seedBase}|${i}`                                (calendar.ts l. 550)
      → flatSegments / hillySegments / hillyUphillSegments / mountainSegments / ittSegments
calendar.ts::stagesFromEdition(id, edition)             · las 60 ediciones reales
   semilla = `${s.from}|${s.to}|${s.km}`                                     (calendar.ts l. 221)
      → STAGE_FEATURES[id][i] ? buildFeatureProfile : oneDaySpec(terrain) → cobbles/classic/mountainClassic/hilly/itt/flat
calendar.ts::buildRace → oneDaySpec(terrain, km, row.id)  · las 178 carreras de un día de tabla
calendar.ts::nationalChampionships → classic(220, id) / itt(38, id)   · los 532 nacionales
auto(segments) → una pancarta `cima` al final de cada `puerto`; nunca metas volantes (calendar.ts l. 88-101)
```

Detrás de las seis ramas y de los cinco papeles de `stageMix` hay ocho funciones `xxxSegments(km, seed)` en `profileGen.ts`, y dos de ellas son la misma: `flatSegments` (l. 236-240) e `ittSegments` (l. 510-514) tienen el mismo cuerpo (`rolling(rand, km, false)` y `normalize`) y producen el mismo perfil para la misma semilla (mapa 01 §2.1, medido: distribuciones idénticas, de 22 a 72 segmentos, pendiente máxima 1,8 %). Lo único que separa una crono de una llana es `timeTrial` en el spec; `stageKind.test.ts` l. 32-43 lo sella como propiedad («una crono es una crono aunque su perfil sea el de una llana»). Son, por tanto, **siete moldes**:

| Constructor               | Líneas  | Quién lo llama                                                                       | Etapas del calendario que produce (mapa 06 §1)                           |
| ------------------------- | ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `flatSegments`            | 236-240 | `stageMix` (papel `llana`), `oneDaySpec('flat')`, `stagesFromEdition` sin rasgos     | llanas de las 72 vueltas compuestas, un día `flat`, e21 de `race-france` |
| `ittSegments`             | 510-514 | `stageMix` (`cri`), `oneDaySpec('itt')`, los 532 nacionales de crono (`itt(38, id)`) | idéntico a `flatSegments`                                                |
| `hillySegments`           | 243-261 | `stageMix` (`media`), `oneDaySpec('hilly')`                                          | medias que acaban abajo; `race-jaen`                                     |
| `hillyUphillSegments`     | 269-297 | `stageMix` (`media-alto`)                                                            | medias con final en alto (v10)                                           |
| `mountainSegments`        | 337-414 | `stageMix` (`reina`)                                                                 | 52 reinas (todas las de vueltas compuestas)                              |
| `mountainClassicSegments` | 443-470 | `oneDaySpec('mountain')` vía `mountainOneDay`                                        | 51 reinas: 42 de edición sin rasgos y 9 de un día (v40)                  |
| `classicSegments`         | 473-490 | `oneDaySpec('classic')`, los 532 nacionales de ruta (`classic(220, id)`)             | clásicas de muros y todos los `nc-*-road`                                |
| `cobblesSegments`         | 493-507 | `oneDaySpec('cobbles')`                                                              | pavé                                                                     |

#### 1.1.2 El azar está en el detalle y no en la arquitectura

Los ocho constructores siguen el mismo esqueleto (mapa 01 §2): sortear las dificultades, calcular `used` y un `fill = max(km · fracción, km − used)`, repartir el relleno con `split(fill, n + 1)` (l. 52-65), intercalar `rolling`/`climb`/`descent`, y `normalize` (l. 141-177). Lo que **no** depende de la semilla es exactamente lo que define una carrera:

| Decisión de forma              | Dónde se fija                                                                                                                                                         | Cómo                                                                                                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Número de dificultades         | `hillySegments` l. 245, `hillyUphillSegments` l. 271, `mountainSegments` l. 339, `mountainClassicSegments` l. 445, `classicSegments` l. 475, `cobblesSegments` l. 495 | umbral de km, sin tirada: `km > 170 ? 3 : 2`, `km > 165 ? 3 : 2`, `km > 200 ? 5 : 4`, `[3, 5, 4]` literal. Medido (mapa 01 §4): `hillySegments(170, 'x')` tiene 2 cotas y `hillySegments(171, 'x')` tiene 3, con cualquier semilla                       |
| Orden de los elementos         | los bucles de cada función                                                                                                                                            | siempre relleno, dificultad, (bajada), relleno. Nunca dos cotas encadenadas sin relleno, nunca un circuito, nunca un sector cerca de meta                                                                                                                |
| Dónde muere la etapa           | la forma de la función                                                                                                                                                | `hilly` corona su última cota a [26; 68] km de meta (media 42,8; `valle_largo` en las 1.500); `classic` a ≥ 16 km; `hillyUphill` y `mountain` con `alto` siempre en la cima; `cobbles` con el último sector a ~40 km                                     |
| Rangos de longitud y pendiente | literales en el cuerpo: `between(rand, 3, 7)` l. 247, `between(rand, 1, 2.5)` l. 477, `between(rand, 9, 15)` l. 362                                                   | no están en `ROUTE`: de las claves de `ROUTE` (`constants.ts` l. 1151-1246) solo cuatro entran en `profileGen.ts` (`queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`), el resto es composición del calendario (mapa 01 §3) |
| Progresión interna del puerto  | `climb` l. 72-82                                                                                                                                                      | «más dura arriba, siempre»: `avg + prog · 1,6 + U(−1,2; 1,2)` con `prog` de −1 a +1                                                                                                                                                                      |
| Alternancia del relleno        | `rolling` l. 100-122                                                                                                                                                  | sube/baja por paridad del índice, no por semilla                                                                                                                                                                                                         |
| Pancartas                      | `calendar.ts::auto` l. 88-101                                                                                                                                         | una `cima` al final de cada `puerto`; ninguna meta volante generada                                                                                                                                                                                      |

Lo que la semilla mueve: las longitudes y pendientes concretas dentro de sus rangos, el ruido de ±1,2 puntos rampa a rampa, las proporciones de `split` (cada trozo entre 0,54 y 1,86 veces la media), cuánto ondula el relleno (amplitud y trozos de 3 a 6 km) y qué segmentos son `rompepiernas` (p 0,35 en relleno «bumpy»). Y, **solo en `mountainSegments`, dos decisiones de arquitectura**: el brazo de desnivel (l. 345, `rand() < ROUTE.queenHighDplusShare` 0,6) y el `finalKind` (l. 355, `sampleFinalKind` con `ROUTE.queenFinalMix`). Son las únicas decisiones de forma que el generador sortea; en las otras siete formas no hay ninguna (mapa 01 §4, §9.1).

El orden de las tiradas de `mountainSegments` (mapa 01 §2.5) importa por dos razones: es lo que el builder legado del paso 1 tiene que reproducir dado a dado, y es la prueba de que «una tirada de más desplaza todas las siguientes» (`profileGen.ts` l. 316-317), que es lo que la separación de semillas de la sección 8 evita:

1. `midClimbs = km > 165 ? 3 : 2` (sin tirada).
2. `alto = rand() < ROUTE.queenHighDplusShare` (0,6).
3. `dPlusTarget = opts.dPlusTarget ??` (si `alto`, `exp(U(ln 2600, ln 4600))`, uniforme en logaritmo; si no, `U(1200, 2500)`). La tirada se hace aunque `opts.dPlusTarget` venga dado.
4. `finalKind = opts.finalKind ?? sampleFinalKind(rand)` con `ROUTE.queenFinalMix` {alto 0,45, cima_cerca 0,20, valle_corto 0,25, valle_largo 0,10}. Si viene en `opts` no se tira: forzar el final sí desplaza todas las tiradas posteriores.
5. `valleKm = valleyKmFor(finalKind)` (l. 330-335): `alto` 0; `cima_cerca` U(1,5; 5); `valle_corto` U(6, 20); `valle_largo` U(22, 45).
6. Puertos intermedios `len ∈ U(6, 11)`, `g ∈ U(5,5; 7,5)`; puerto final `U(9, 15)` × `U(7,5; 9,5)`.
7. Persecución del objetivo: `escala = clamp(dPlusTarget / Σ len·g·10, 0,55, 1,8)` sobre la longitud de todos los puertos, nunca la pendiente; `finalLenEsc = max(8,6, finalLen · escala)` (l. 387).
8. `fill = max(0,15 · km, km − used)`, huecos con `split`, bajadas intermedias U(5, 8) km al 6 %.
9. Tras el final, si `valleKm > 0,5`: `descent` de `min(valleKm, U(4, 10))` km al 6 % y `rolling` no «bumpy» con el resto.
10. `garantizaPuerto(normalize(segs, km), 8.6, null)`.

Medido sobre 1.500 reinas sin forzar: `reina/Summit finish` 660, `reina/Mountains` 839, `media/Hills` 1; D+ solo de puertos a 175 km de 1.525 a 4.647 m (media 2.840), con el 59,0 % por encima de 2.600 m, que cuadra con el 60/40 de `ROUTE`.

La composición también es fija en lo esencial (mapa 02 §4.2): la primera etapa es siempre `llana` (los `slots` van de `n − 2` a 1, `calendar.ts` l. 493, y nunca la tocan), la crono cae en la penúltima o antepenúltima, y los papeles intermedios salen de `pickRole` sobre `ROUTE.mixWeights` (`mountain` da 0,40 de reina por etapa). Medido por `propuestas/datos.md` §1.2: las 72 vueltas compuestas producen 47 secuencias de papeles distintas, la más repetida cinco veces (`[l m m^ c l]`). No hay prólogo, no hay cronoescalada, no hay gran vuelta generada (`format: 'gran-vuelta'` solo lo ponen las tres `editionGrandTour`, mapa 02 §1).

La tabla completa por forma, que es la que un implementador necesita para saber qué reproduce el paso 1 del plan (sección 15) y qué desaparece en el paso 8:

| Forma             | Fijo por función o por km                                                                                                          | Lo mueve la semilla                                                                                                                                   | Rangos medidos sobre 1.500 etapas (mapa 01 §8)                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `flat` / `itt`    | 0 puertos, todo `llano`, alternancia sube/baja                                                                                     | amplitud [0,8; 1,8] %, trozos [3; 6] km, `split`                                                                                                      | D+ [661; 1.413] m; [22; 72] segmentos                                                                                       |
| `hilly`           | 2 cotas (≤ 170 km) o 3; bajada solo entre cotas; relleno tras la última                                                            | cota [3; 7] km × [4,5; 6,5] %, bajadas [3; 5] km, posiciones, `rompepiernas`                                                                          | cota más larga [3,4; 8,1]; D+ [1.297; 3.054]; tras la última cota [26; 68] km                                               |
| `hillyUphill`     | 1 (≤ 170) o 2 intermedias + final en alto; `garantizaPuerto(…, null, 8.4)`                                                         | intermedias como `hilly`, final [4; 7,5] km × [5; 7,5] %                                                                                              | cota [4,0; 8,5]; D+ [1.272; 3.055]; `alto` 100 %; 2 de 1.500 clasificadas `reina`                                           |
| `mountain`        | 2 (≤ 165) o 3 intermedios + final; final ≥ 8,6 km; `escala ∈ [0,55; 1,8]`; bajada [5; 8] km tras cada intermedio; valle no «bumpy» | brazo 60/40 y objetivo D+, `finalKind` (45/20/25/10) y valle, intermedios [6; 11] km × [5,5; 7,5] %, final [9; 15] km × [7,5; 9,5] % antes de escalar | cota [8,4; 26,7]; D+ [1.908; 5.906]; finales 44 / 15,7 / 29 / 11,3 %; 1 de 1.500 clasificada `media`                        |
| `mountainClassic` | 2 (≤ 165) o 3 intermedios + final corto [4; 8] km × [7,5; 10] % + `runIn` [13; 22] km; sin `garantizaPuerto`                       | longitudes, pendientes, `runIn`, bajada                                                                                                               | cota [6,6; 12,2]; D+ [1.903; 4.133]; tras la cota [12,8; 22,8]; **14 % clasificadas `media`**                               |
| `classic`         | 4 muros (≤ 200 km) o 5, [1; 2,5] km × [8; 12] %, sin bajadas, relleno tras el último                                               | muros y huecos                                                                                                                                        | cota [1,4; 2,5]; D+ [1.541; 3.151]; tras la cota [16; 184] km; 12 de 1.500 sin cota ≥ 1,5 km; pendiente máxima hasta 14,8 % |
| `cobbles`         | 3 sectores [3, 5, 4] estrellas, [2; 4] km, sin puertos, relleno no «bumpy»                                                         | longitud de cada sector y huecos                                                                                                                      | D+ [605; 1.332]; último sector a ~40 km de meta                                                                             |

El ejemplo concreto del mapa 01 §4, `mountainSegments(175, 'semilla-3')`: 6 segmentos de relleno, `puerto 4,8`, `descenso 5,1`, 8 de relleno, `puerto 3,6`, `descenso 6,1`, 10 de relleno, `puerto 6,0`, `descenso 6,3`, 7 de relleno, `puerto 9,1`, meta. Es un brazo bajo con `escala` 0,55: los tres intermedios se quedaron en [3,6; 6] km y el final aguanta en 9,1 porque `max(8,6, …)` lo sujeta. Otra semilla del brazo alto tendrá los mismos tres intermedios más final, de 11 a 20 km cada uno. Lo que ninguna semilla dará: un solo puerto largo con 100 km de llano antes, dos puertos encadenados sin valle, una reina de 130 km con cinco puertos, un final en alto de 6 km, un circuito, un muro en el último kilómetro, un sector de adoquín a 15 km de meta.

Una consecuencia de segundo orden que importa para la identidad (sección 10): `mountainSegments(150, 'x')` y `(151, 'x')` tienen los mismos tres puertos pero `rolling` recalcula `n` con `km / trozo`, así que un kilómetro de diferencia redibuja el detalle entero. Por eso la semilla `${from}|${to}|${km}` de las ediciones es estable solo mientras no cambie el km, y por eso el km de una etapa de edición es contrato al 0,1 (`calendar.test.ts` l. 162-174).

#### 1.1.3 El generador es ciego a la geografía

`buildRace(row)` (`calendar.ts` l. 886) calcula el país en l. 889 (`row.country ?? RACE_COUNTRY[row.id]`) y lo copia a `common` (l. 898); de ahí solo va al objeto resultado. Las tres ramas de construcción de etapas (l. 899-929) le pasan al generador `row.stages`, `row.terrain`, `row.km` y `row.id`. Las firmas, leídas en orden de llamada (mapa 02 §6):

```ts
// calendar.ts
function buildRace(row: RaceRow): CalendarRace // l. 886
function oneDaySpec(terrain: Terrain, km: number, seed: string): StageSpec // l. 400
function featureSpec(terrain: Terrain, km: number, features: StageFeatures, seed: string): StageSpec // l. 196
export function stageMix(n: number, terrain: Terrain, seedBase: string): StageSpec[] // l. 546
function mixRoles(n: number, terrain: MixTerrain, rand: () => number): MixRole[] // l. 457
function stagesFromEdition(id: string, edition: RaceEdition): CalendarStage[] // l. 216
// profileGen.ts: los ocho constructores
export function flatSegments(km: number, seed: string): Segment[] // l. 236
export function mountainSegments(km: number, seed: string, opts: MountainOptions = {}): Segment[] // l. 337
// ... hilly, hillyUphill, mountainClassic, classic, cobbles, itt: misma firma (km, seed)
// featureProfile.ts
export function buildFeatureProfile(
  totalKm: number,
  features: StageFeatures,
  seed: string,
  terrain?: RouteTerrain,
): StageProfile // l. 362
```

Ninguna recibe `country`, `region` ni nada geográfico: entran kilómetros, un terreno de seis valores y una cadena. La semilla es el id, y el id es un nombre (`race-flanders`), no un país: dos carreras belgas y una francesa con el mismo terreno se distinguen solo por el hash de su id. `RaceEdition` y `EditionStage` (`editions.ts` l. 10-22) tampoco llevan país. Los 532 campeonatos nacionales de los 133 países salen de `classic(220, id)` e `itt(38, id)` (`nationalChampionships`, l. 351-360): el de Bélgica y el de Colombia son la misma función con distinto hash, que es justo lo que `docs/motor.md` §V.3 prometió que no pasaría («un nacional belga es llano y de adoquines; uno colombiano, de montaña», mapa 05 §10 fila 16).

El país llega, dentro del motor, a un solo sitio: `stagePlace()` (`schedule.ts` l. 27-32) lo convierte en `{ pais, dia }` para el clima (`stage/weather.ts::climateOf`), y fuera del motor a los viajes (mapa 02 §1). Medido por `propuestas/datos.md` §1.3: hay etapas generadas en 55 países y en 41 de ellos no existe ni una etapa real; las 177 reales caen en 15 países (ES 44, IT 37, FR 36, CH 11, BE 8, AE 7, AU 6, DE 6, IN 5, PT 5, OM 4, NO 4, CA 2, NL 1, CN 1). Una .2 neerlandesa y una .2 colombiana con `terrain: 'flat'` y 5 etapas se componen con las mismas proporciones, los mismos kilometrajes y el mismo relieve salvo el hash.

### 1.2 De dónde sale cada perfil del calendario

Un rediseño del generador no toca todos los perfiles: solo los que nacen en `profileGen.ts`. Clasificación de las 1.418 etapas de `SEASON_CALENDAR` por rama (mapa 06 §1, medido sobre el motor de hoy):

| Origen                                 | Rama del código                                                                   | Etapas | De ellas, reinas |
| -------------------------------------- | --------------------------------------------------------------------------------- | -----: | ---------------: |
| Campeonato nacional                    | `nationalChampionships` → `oneDaySpec`                                            |    532 |                0 |
| Vuelta compuesta                       | `buildRace` l. 920-923 → `stageMix` → `flat/hilly/hillyUphill/mountain/itt`       |    325 |               52 |
| Edición real sin rasgos para esa etapa | `stagesFromEdition` l. 225: `f ? featureSpec : oneDaySpec(s.terrain, s.km, seed)` |    226 |               42 |
| Rasgos reales (`STAGE_FEATURES`)       | `featureSpec` → `buildFeatureProfile`                                             |    177 |               54 |
| Carrera de un día generada             | `buildRace` l. 911-918 → `oneDaySpec`                                             |    158 |                9 |

Reparto del `terrain` de fila que alimenta esas ramas (mapa 02 §1, medido): de las 178 carreras de un día de tabla, hilly 83, flat 60, cobbles 19, mountain 10, classic 5, itt 1; de las 72 vueltas compuestas por `stageMix`, hilly 37, mountain 19, flat 16; `terrain` ausente cae a `'flat'` (l. 916 y 928). Solo 36 de las 178 carreras de un día declaran `km`.

Por clase (mapa 02 §9, `inventario-recorridos.md`): WT 139 de 161 etapas reales; Pro 29 reales, 110 sin validar (ciudades y km reales, relieve generado), 35 inventadas; .1 4 reales de 230; .2 5 de 321; NC 0 de 532. En total **1.241 de las 1.418 etapas (87,5 %) las dibuja `profileGen.ts`**; el WorldTour está prácticamente entero con relieve real y el continental y los nacionales son casi enteramente obra del generador. Las tres grandes vueltas son casi enteras reales (`race-italy` y `race-spain` 21 de 21; `race-france` 20 de 21, la e21 llana se genera).

### 1.3 Las siete consecuencias medidas

Son las de `propuestas/arquitectura.md` §1.4, comprobadas contra los mapas. Cada una es un defecto que el diseño resuelve en una sección concreta.

**1. Cero muros en meta.** `FinishType` tiene `muro` (`finish.ts` l. 36; `STAGE.muroMaxKm` 1 y `muroMinGradient` 8, `constants.ts` l. 4462-4463) y ninguna de las 1.075 etapas en línea lo activa (balance v60 §12, mapa 05 §5). La causa está en `classicSegments` l. 479: los muros se reparten con `split(fill, nWalls + 1)`, así que el último cae a un quinto o un sexto del relleno de la meta, medido de 15,7 a 184 km. Las seis cotas de ≤ 1 km y ≥ 8 % que existen en el calendario coronan entre 12,3 y 14,6 km de meta. El generador no tiene un motivo «muro de meta»; el diseño lo tiene como `MetaKind` `muro_meta` (sección 4) y `routeCensus` mide que exista (V11, sección 9).

**2. Dos generadores de reina, y uno sin vigilar.** De las 157 reinas del calendario, 52 salen de `mountainSegments` (con el sorteo de desnivel y de tipo de final de la v64), 51 de `mountainClassicSegments` (42 de ediciones sin rasgos más 9 de un día, con etiqueta `Mountains` y sin `queenFinalMix`) y 54 de rasgos reales (mapa 06 §1). Desnivel mediano por origen: 2.898 m, 1.734 m y 1.854 m. `mountainClassicSegments` no está en `stageKind.test.ts` (l. 1-11) y **210 de sus 1.500 salidas con los km de test (14 %) se clasifican `media/Hills`** porque ni el intermedio más largo llega a 8,5 km ni el desnivel a 3.200 m (mapa 01 §2.6); con los km de una clásica real (200 a 260) baja a 21 de 1.200. El «mix de finales del calendario» que balance v60 §1b compara con `queenFinalMix` ± 0,08 mezcla tres generadores y por eso no cuadra (banco §1.2). El diseño tiene un solo camino para toda reina (`et_reina_*`, sección 5) y V6 garantiza que `stageKindOf` devuelve lo que el esqueleto declara (sección 9).

**3. El caso v40.** `mountainSegments` daba a una carrera de un día un final en alto de [9; 15] km (`profileGen.ts` l. 430-438), «algo que no existe en el calendario real» (balance v40 §1): Race Jura dejaba al 82 % del campo con el tanque a cero siendo más fácil que Lombardía en desnivel (2.942 m contra 2.995) porque moría arriba. Se arregló con otro molde (`mountainClassicSegments`), no con una regla: nada impide hoy que otro molde produzca otra forma inexistente. Medido contra la realidad (mapa 07 §4.3): en el WorldTour de un día la última subida mide de 0,4 a 4,2 km, corona a [0; 17] km de meta y solo muere arriba cuando es un muro de 1,3 a 2,1 km (Huy, San Luca); no existe una carrera de un día del WorldTour con final en un puerto de 6 km o más, y en todo el calendario UCI europeo hay tres o cuatro de categoría .1 (Ventoux, Mercan'Tour). El diseño lo escribe como regla, V5 (sección 9), y como rareza acotada, `ud_montana_alto` con peso 0,02 solo en .1 (decisión 37, D1 en la sección 18).

**4. Tres bordes sin holgura** (mapa 01 §9.4). Primero, 8,5 km entre `garantizaPuerto` (fija `segment.km`, l. 192-233) y `climbSize` (suma los `tramos` con g > 0 redondeados a 0,1, `stageKind.ts` l. 36-42): la suma de tramos puede quedar 0,1 o 0,2 por debajo o por encima del segmento. Medido: `mountain 175 semilla-167` tiene segmento 8,6 y tramos 8,4 → `media/Hills`; `hillyUphill 155 semilla-149` y `215 semilla-209` tienen segmento 8,4 y tramos 8,5 → `reina/Summit finish`; con `finalKind: 'alto'` forzado, 3 de 1.500. `stageKind.test.ts` corre 60 semillas y no los ve. Segundo, los cortes 5 y 20 km de `FINAL_KIND_CUTS` (`finalKind.ts` l. 30) contra los rangos [1,5; 5] y [6; 20] de `valleyKmFor` (l. 330-335): `normalize` puede estirar un valle de 20 a 20,3 y cambiarle la cubeta, 4 de 6.000 cruzadas. Tercero, `CLIMB_MIN_KM` 1,5 contra muros de [1; 2,5] km: en 12 de 1.500 clásicas (semillas 91, 153 y 202 en todos los km) ningún muro llega a 1,5 km y `finalKindOf` devuelve `null`. El diseño cierra los tres con rangos que no tocan el umbral (`cota` hasta 8,0 y `puerto` desde 9,0 en vez de 8,5; holgura 0,7 sobre 5 y 20; pancarta `cima` siempre en el último puerto): `ARCH.veto.margenClaseKm` y `margenValleKm` (sección 12) y `garantizaClase` (sección 8).

**5. El relleno pesa y nadie lo cuenta.** Una llana de 130 a 215 km acumula de 661 a 1.413 m de desnivel positivo solo con `rolling` (mapa 01 §1; la cabecera de `profileGen.ts` l. 3-5 promete que el llano no es una recta, y lo cumple de sobra). En una reina de 175 km el relleno «bumpy» aporta de media 1.017 m sobre 2.840 m de puertos. El objetivo de desnivel de `mountainSegments` se persigue solo con los puertos (`dPlusBase = Σ len·g·10`, l. 373) mientras `calendarQueens.ts::desnivelDe` (l. 55-59) suma los bloques `subida` muestreados, relleno incluido: la banda `<1500` de `BANDAS_DESNIVEL` se lee sobre una medida y el objetivo se persigue sobre otra. De ahí que la banda baja solo se alcance cuando el brazo bajo y el `escala` 0,55 coinciden (mapa 01 §9.3). El diseño persigue el desnivel **total** (`ARCH.reina.dPlusIncluyeRelleno` true, con `rellenoDplusPorKm` 5,5 m/km como estimación y `dPlusDe(profile)` como verificación; decisión 9, sección 8).

**6. Ninguna temporada.** `SEASON_CALENDAR` es una constante de módulo: ni fechas, ni recorridos, ni número de etapas cambian de un año a otro (mapa 02 §11). La base sí sabe de temporadas (`raceKey = ${race.id}:s${season}`, `calendarRun.ts` l. 783; `season = floor(gameDay / SEASON_DAYS)`, l. 135) y congela el recorrido el día de la etapa 1 en `race_routes` (l. 1603), pero le pide al calendario el mismo perfil cada año, segmento a segmento. Y `editions.ts` (60 entradas, 384 etapas) es la edición de UN año concreto que el juego repite para siempre (mapa 02 §7). El diseño introduce `calendarForSeason(season)` con `BASE_SEASON = 0` (sección 10).

**7. Kilometraje sin clase.** `ROUTE.kmFlat` [165, 30], `kmHilly` [160, 30], `kmUphill` [150, 30], `kmSummit` [145, 35] (`constants.ts` l. 1240-1243) no distinguen una .2 de una WT: una .2 de 5 etapas sale con etapas de 165 a 195 km, que sería la vuelta .2 más larga de Europa (mapa 07 §4.1: una .2 por etapas corre de 100 a 160 km). Y para la carrera de un día no hay banda: 142 de 178 carreras de un día de tabla miden **210 km clavados** (`row.km ?? 210`, `calendar.ts` l. 917); las 66 carreras .1 de un día están en p10 = p50 = p90 = 210 (datos §1.2). El diseño sustituye los cuatro `ROUTE.km*` por la tabla `ARCH.km.porClase` por clase y papel (sección 7, decisión 36).

### 1.4 Reinas de vuelta dibujadas con la plantilla de un día

Este defecto no está en la lista de siete y merece párrafo propio porque afecta a una lista cerrada del banco. `stagesFromEdition` (l. 216-231) llama a `oneDaySpec(s.terrain, s.km, seed)` para toda etapa de edición sin rasgos, y `oneDaySpec('mountain')` va a `mountainOneDay` (l. 149-152), es decir, a `mountainClassicSegments`: la plantilla v40 pensada para Lombardía (último puerto corto y empinado, bajada y llano hasta meta). Así que **las 42 reinas de edición sin rasgos son etapas de vuelta dibujadas con la plantilla de una clásica de montaña de un día**, con etiqueta `Mountains` y sin pasar por `queenFinalMix`.

El caso con nombre es `race-colombia` e5. `realQueens.ts` l. 46-49 la describe en su `why` como «el último puerto a 62 km de meta y 47 km rodadores», que es el perfil con el que se escribió la lista; medido hoy (mapa 06 §3.2): 232 km, `valle_corto`, **18 km tras la cota**. Las otras dos generadas de `REAL_QUEENS` son `race-guatemala` e9 (200 km) y `race-tachira` e6 (166 km, `valle_largo`, 21 km). La lista es cerrada a propósito («para comparar entre versiones», `realQueens.ts` l. 41-45), pero conserva el nombre y no la forma: `race-colombia` e5 se sigue llamando igual y su perfil es otro desde la v40. Lo mismo vale para `race-tramuntana` e1 del diario (`journal.test.ts` l. 104-108) y para el `race-colombia` e2 que `stageKindOf` lee como `media` (mapa 06 §2.1).

Lo que se decide con esto: en el diseño, las 226 etapas de edición sin rasgos reciben **esqueletos de etapa** (`flat` → `et_llana`, `hilly` → `et_media_*`, `mountain` → `et_reina_*`, `itt` → `et_crono`, `cobbles` → `ud_adoquin_ligero`), nunca uno de un día (tabla en la sección 5); y las tres reinas generadas de `REAL_QUEENS` se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` con el `why` reescrito para describir el esqueleto (decisión 33, sección 13).

### 1.5 La etiqueta se escribe a mano y el recorrido dice otra cosa

`TERRAIN_KIND` (`calendar.ts` l. 183-190) y los constructores `flat/hilly/mountain/...` (l. 108-172) ponen `kind` y `label` por terreno; `stageKindOf` (`stageKind.ts` l. 71-98) lo lee del relieve con tres umbrales (`PASS_MIN_KM` 8,5, `QUEEN_MIN_CLIMB_METRES` 3.200, `WALL_MAX_KM` 3, l. 60-64). Los dos criterios no coinciden en **72 etapas del calendario** (mapa 06 §2.1, medido), entre ellas `race-colombia` e2 (`reina` declarada, `media` leída). `apps/api/src/stageHistory.test.ts` l. 199 sella con `expect(cambian).toBe(49)` las etiquetas que la API corrige por su cuenta sobre las 1.418, y el comentario l. 185-190 lo explica: «eran 30 hasta la v64… y suben porque el generador de recorridos cambió: una reina ya no acaba SIEMPRE arriba». Son dos medidas distintas y las dos son síntomas del mismo mal: 72 cuenta el `kind` leído por `stageKindOf` contra el `kind` declarado; 49 cuenta las etiquetas que `stageHistory.ts::calendarStageSpec` corrige con su propia regla (`Summit finish` si la meta está a ≤ 5 km de la última cima, l. 73) y no con la de `stageKindOf` (último segmento `puerto`, `stageKind.ts` l. 86-87): dos reglas para el mismo concepto en dos ficheros (juez del motor, riesgo 2).

Y el clasificador está calibrado contra el generador, no contra la carretera. `stageKind.test.ts` l. 12-19 lo dice: «la calibración de `stageKindOf` NO se inventa: se comprueba contra los propios generadores». Sobre las 177 etapas reales (datos §1.5, medido): `stageKindOf` llama `media` a 11 de las 54 reinas reales y `reina` a 16 de las 59 medias reales, **27 de 113**; a 7 de 22 llanas reales con cota las llama `clasica` y a 3 `reina`. No es un defecto del clasificador (hace lo que promete): es la prueba de que las familias del generador y las de la realidad no coinciden. Además el comentario de umbrales de `stageKind.ts` l. 44-58 está desfasado desde la v64: dice que la cota más larga de `mountain` va de 9,1 a 15,0 km y hoy va de 8,4 a 26,7 (mapa 01 §5.1), y la de `hillyUphill` llega a 8,5.

Lo que se decide con esto (secciones 11 y 18): `kind = stageKindOf(profile).kind` para toda etapa generada (V6 lo garantiza por construcción); una sola regla de etiqueta, `SUMMIT_RUN_IN_KM` 5 dentro de `stageKindOf`, y `stageHistory.ts` deja de reetiquetar; el 49 se re-sella con objetivo escrito «solo etapas reales cuya etiqueta declarada difiere; generadas = 0»; y `stageKindOf` **no se recalibra en E1** (decisión 26): los 27 de 113 se abren como decisión del dueño D2 con la cifra del censo tras el paso 8, y el valor por defecto es no tocarlo.

### 1.6 Lo real contra lo generado: la vara medida

El extractor de `propuestas/datos.md` §1.4 (`scratchpad/e1/medir-real.mjs`, que el diseño mueve a `scripts/medir-real.mjs`) recorre las 177 etapas con rasgos (146 con puertos publicados, 130 con altimetría muestreada, 6 con pavé, 101 con sprints) y da p10 / p50 / p90 por rasgo. Contra el generador de hoy (mapa 01 §8):

| Rasgo                                      | Real (p10 / p50 / p90)                                 | Generador de hoy                                        |
| ------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------- |
| Reina: número de puertos publicados        | 2 / 4 / 6 (máx. 11)                                    | 3 o 4 fijos por km (`mountainSegments`)                 |
| Reina: puerto final (km)                   | 3,3 / 9,7 / 17,1                                       | [9; 15] antes de escalar, suelo 8,6                     |
| Reina: `finalKindOf` (de 54)               | alto 37 · valle_largo 7 · valle_corto 6 · cima_cerca 4 | 44 / 11 / 29 / 16 %                                     |
| Reina: km de puerto a más de 60 km de meta | 0 / 13,2 / 43,0                                        | «puerto a 60 km de meta y luego llano» no sale          |
| Media: km de la última cota a meta         | 0 / 15 / 59                                            | [26; 68] siempre (`hillySegments`)                      |
| Media: número de puertos                   | 1 / 3 / 6 (máx. 36)                                    | 2 o 3 fijos                                             |
| Un día: número de cotas                    | 4 / 11 / 34 (18 carreras)                              | 4 o 5 muros (`classicSegments`)                         |
| Un día: última cota (km) y km a meta       | 0,5 / 1,0 / 2,1 y 0 / 7,8 / 20,8                       | muro [1; 2,5] km a ≥ 16 km; puerto [4; 8] km a [13; 22] |
| Un día: puertos publicados ≤ 3 km          | 234 de 259                                             | ninguno en `mountainClassicSegments`                    |
| Pavé: sectores por carrera                 | 5, 6, 8, 9, 15, 31                                     | 3 fijos                                                 |
| Llana real: km de la última cota a meta    | 20 / 43 / 149                                          | no hay cota (`flatSegments` es `rolling` puro)          |

Dos cosas más que el corpus dice y el generador no sabe: el circuito existe (18 de 54 reinas reales y 11 de 59 medias tienen al menos una cota repetida; Montréal repite 34 veces), y la crono no es siempre llana (13 cronos reales, entre ellas la de Barcelona de `race-france` e1 con 100 m de desnivel en 20 km, `stageFeatures.ts` l. 19-31).

Y la subida final, que es el dato que decide V5 y `ARCH.meta.*` (mapa 07 §4.3, calendario de 2015 a 2026): en gran vuelta el puerto de meta mide de 8 a 22 km al 6,5 a 9 % en el 70 a 80 % de los finales en alto (Alpe d'Huez 13,8 × 8,1; Angliru 12,5 × 9,8; Hautacam 13,6 × 7,8) y de 4 a 7 km al 8 a 12 % en el resto (Planche 5,9 × 8,5; Xorret 3,9 × 11,4); un final de más de 22 km es raro y siempre con pendiente media inferior al 7 % (Loze 28,1 × 6; Bondone 21,4 × 6,7). En vuelta de una semana la banda baja a [3; 20] km con mediana 7 a 10. Contra eso, `mountainSegments` cubre solo la banda dura ([9; 15] km al [7,5; 9,5] %, l. 359-360) y no cubre ni los cortos al 8 a 12 % ni los largos suaves; `hillyUphillSegments` ([4; 7,5] km al [5; 7,5] %) es la banda de una semana; `mountainClassicSegments` ([4; 8] km al [7,5; 10] % con `runIn` [13; 22]) es correcto para Lombardía por Como y largo para Lieja, San Sebastián, Amstel y Bérgamo, y no genera la cota de remate a 3 a 6 km de meta que Lombardía lleva en 3 de 4 ediciones; `classicSegments` tiene la longitud de muro real y una cuarta parte de la cantidad (Ronde 16 a 19, Amstel 33) y ningún muro adoquinado; `cobblesSegments` pone 3 sectores de [2; 4] km donde Roubaix lleva de 29 a 31 sectores de [0,3; 3,7] km y 55 km de adoquín.

Resumido como lista de formas que el calendario generado **no produce nunca** (banco §1.2, mapa 01 §4 y §9): un muro en el último kilómetro; un circuito con vueltas; un muro adoquinado; un sector de pavé a menos de 40 km de meta; un puerto largo con 100 km de llano después; dos puertos encadenados sin valle; una reina de 130 km con cinco puertos; un final en alto de 6 km en vuelta; un prólogo; una cronoescalada; una meta volante. Cada una es un motivo, una meta o un esqueleto en la gramática de las secciones 4 y 5.

Lo que se decide con esta tabla: es **instrumento de medida y no fuente** (decisión 40). Alimenta las bandas de `ROUTE_CENSUS_TARGETS` (sección 13) donde haya al menos tres fuentes y calibra `ARCH.anticlon.maxCorrelacion` (sección 9); el generador no depende de ningún fichero regenerable, y las 177 etapas reales no son «la realidad» sino el 12,5 % del calendario que la tiene, concentrado en 15 países y en el WorldTour.

### 1.7 La lección de E3: por qué esto es calibración y no estética

`docs/epics.md` E3 pasos 3 y 4 y `docs/balance.md` v43 y v44 (mapa 04 §3.1) cuentan la historia entera. La banda `mountain.breakawayWinPct` 25-45 estuvo cinco versiones en verde con 27 a 30 % sobre `reina-150` (135 km de llano y 15 km al 8 %, `scenarios.ts` l. 332-336). Sobre las nueve reinas reales de `realQueens` la fuga ganaba **3,3 %**; en gran vuelta, con fatiga y general, **0 %** (312 etapas de montaña, 0 victorias). No era el relieve repartido ni el campo: era cuánto puerto tiene la etapa (15 km 26,7 %, 25 km 10 %, 35 km 3,3 %, 50 km 0 %). La conclusión escrita en `epics.md` l. 128-150: «`reina-150` no es una etapa reina fácil: es media montaña con la etiqueta cambiada». La lectura de v43 §7 dice qué tiene un perfil real que la canónica no tiene: **subida fuera de los últimos 30 km**, 0 % en la canónica y del 6 al 38 % en las nueve reales. El paso 7 corrigió el sentido: el generador hace montaña **más blanda** que la real (mediana de las 157 reinas 2.023 m, máxima 3.965, ninguna por encima de 4.000; una reina real tiene de 3.500 a 5.000), y sobre muestra sistemática la fuga gana el **18,1 %**, con 43,8 % bajo 1.500 m. El dueño cerró con «está bien así» (balance v44 cierre) y entró `calendarQueens.breakawayWinPct` 6-30 como vigilancia.

Lo que aquí importa no es el número sino la afirmación que el banco firmaba en verde: «en montaña la fuga vive mucho más» (`targets.ts` l. 76) valía sobre una forma de etapa que el calendario no produce. Y el patrón no es único; el mapa 04 §3.3 lo cuenta seis veces:

| Versión | Banco canónico en verde                           | Lo que producción hacía                                    | Banco nuevo                            |
| ------- | ------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| v15     | `erosion.queenThirdWeek` sobre `reina-150-s3`     | la reina real saturaba con el 100 % en pájara              | `reina-real-s3` (`race-france` e18)    |
| v17     | `grandTour.queenLastGroupPct` (7 finales en alto) | Colombia e5: 126 de 130 a 74 min                           | `realQueens` (9 formas)                |
| v19     | `timeTrial.p90MinusP10Seconds` sobre `cri-40`     | cola del 46,4 % y 65 alcances en `race-colombia` e3        | `timeTrials` (5 cronos)                |
| v23     | `flat.bestSprinterWinPct` (empate a tres)         | Race Arabia: 5 de 5 el mismo                               | `smallTours` (10 carreras)             |
| v40     | saturación solo sobre un día WorldTour            | Jura, Andorra, Appennino, Ses Salines con el tanque a cero | las 8 más exigentes del calendario     |
| v44     | `mountain.breakawayWinPct` sobre `reina-150`      | 0 % en gira, 3,3 % en formas, 18,1 % en frecuencia         | `calendarQueens` (muestra sistemática) |

Cuatro de los seis casos son defectos del perfil sobre el que se medía, no del motor. De las 32 bandas de `TARGETS`, 17 se miden sobre perfiles generados del calendario y 14 tienen sensibilidad alta al trazado (mapa 04 §2). Y cuando el generador cambió en la v64 (`ENGINE_VERSION` 63 → 64: `normalize` proporcional, sorteo de desnivel, `queenFinalMix`), «todos los perfiles de montaña del calendario» cambiaron (`profileGen.ts` l. 316-317). Medido sobre las 157 reinas (balance l. 11716-11726, mapa 04 §3.4):

| Métrica                          |    v63 |    v64 |
| -------------------------------- | -----: | -----: |
| `alto`                           | 56,7 % | 38,2 % |
| `cima_cerca`                     |  2,5 % |  8,9 % |
| `valle_corto`                    | 35,0 % | 42,0 % |
| `valle_largo`                    |  5,7 % | 10,8 % |
| D+ > 3.500 m                     |  1,9 % | 10,8 % |
| D+ < 1.500 m                     | 20,4 % | 21,0 % |
| km tras la última cota (mediana) |      0 |    9,0 |

La mediana de desnivel siguió en 2.053 m y el criterio «2.800 a 4.200» de `docs/tactica.md` R28.1(d) se declaró aritméticamente incompatible con conservar la cola baja que `calendarQueens.test.ts` exige (balance l. 11730-11745). Y `realQueens`, `grandTour` y `smallTours` no tienen anotada una remedición por etapa tras la v64: sus perfiles cambiaron y sus bandas siguieron pasando, que es exactamente la situación que el mapa 04 pide que no se dé por buena sin mirar. El banco mide motor y generador a la vez y no tiene forma de separarlos. Es lo que la sección 13 cierra con `routeCensus` (geometría a coste cero en cada push), el protocolo «mejor y no solo distinto» con línea base y la tabla pareada viejo/nuevo como condición para borrar el generador viejo (decisiones 29 a 31).

Un detalle que fija una constante del diseño: el 60/40 de desnivel de `mountainSegments` (`ROUTE.queenHighDplusShare`) está justificado en `constants.ts` l. 1162-1167 y `profileGen.ts` l. 309-311 «porque `calendarQueens.test.ts` afirma en tres líneas duras que la banda de < 1.500 m no se queda vacía» (mapa 06 §6.3): la cola baja de las reinas la decide un test con 4 semillas, no el diseño. En el diseño la decide `et_reina_blanda` con `ARCH.reina.blandaShare` (decisión 8, sección 5) y el censo la mide antes de bandear.

### 1.8 Lo que ya está bien y se conserva

No todo es defecto. Lo que sigue funciona, está medido, y el diseño lo reutiliza o lo conserva tal cual:

| Pieza                                  | Dónde                               | Qué hace bien                                                                                                                                                                                | Qué pasa con ella                                                                                                                                                  |
| -------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hashInt`, `routeRng`                  | `profileGen.ts` l. 15-44            | FNV-1a más mulberry32: una secuencia determinista por cadena; `routeRng` se exporta para que `stageMix` use «el mismo azar sembrado que los perfiles»                                        | primitivas exportadas; todos los subflujos nominales del diseño (`arch                                                                                             | …`, `mot | …`, `dib | …`) salen de aquí (sección 8) |
| `between`, `split`                     | l. 47-65                            | reparto de km con pesos U(0,7; 1,3), redondeo a 0,1, mínimo 0,5 por trozo, último trozo cuadrado                                                                                             | primitivas; `split` reparte los enlaces dentro de una ventana (sección 8)                                                                                          |
| `climb`                                | l. 72-82                            | puerto en `max(2, round(len/2,2))` rampas, progresión «más dura arriba», ruido ±1,2                                                                                                          | se conserva y gana `gMax` (decisión 11): las rampas al 14,8 % medidas en `classic` (mapa 01 §2.4) desaparecen                                                      |
| `descent`                              | l. 85-93                            | bajada en rampas, nunca menos de −2 %                                                                                                                                                        | se conserva; la longitud pasa a la bajada canónica por desnivel `clamp(len·g·10/55, 2, 10)`, que es la regla que `mountainClassicSegments` l. 467 ya usa           |
| `rolling`                              | l. 100-122                          | el relleno ondula en trozos de 3 a 6 km con amplitud acotada                                                                                                                                 | se conserva con `amp` numérica y `pRompepiernas = 0` (decisión 11); `rompepiernas` no se emite nunca porque `sample.ts` l. 100-101 lo colapsa a g 1,5 (decisión 2) |
| `normalize` proporcional               | l. 141-177                          | cuadra los km escalando todos los segmentos y reescalando sus tramos, residuo al más largo; error medido 0,00 en 12.000 etapas (v64)                                                         | patrón heredado por `normalizeEnlaces`, que cuadra solo con los enlaces (decisión 10); `normalize` se retira en el paso 8                                          |
| `garantizaPuerto`                      | l. 192-233                          | «garantía de clase después de normalizar»: lleva el puerto más largo al borde y compensa en el no-puerto más largo                                                                           | patrón heredado por `garantizaClase`, que además guarda `segment.km === Σ tramos` para cerrar el borde 8,5 (decisión 10); se retira en el paso 8                   |
| `MountainOptions`                      | l. 319-322                          | precedente de arquitectura fijada desde fuera (`dPlusTarget`, `finalKind`)                                                                                                                   | generalizado en `StageRequest.fixed` para bancos (sección 3)                                                                                                       |
| `stageKindOf`                          | `stageKind.ts` l. 71-98             | lector puro con orden de decisión razonado: `timeTrial`, `paves`, sin puerto, «manda el final», 8,5 / 3.200 / 3                                                                              | no se recalibra en E1 (decisión 26); es la vara contra la que V6 acota lo generado; solo cambia la etiqueta `Summit finish` (decisión 23)                          |
| `finalKindOf`                          | `finalKind.ts` l. 78-85             | cortes 0,5 / 5 / 20 sobre la última pancarta `cima`; `null` para una llana                                                                                                                   | no cambia; V7 acota lo generado con holgura 0,7 (`ARCH.veto.margenValleKm`)                                                                                        |
| `race_routes`                          | `db/raceRoutes.ts`, balance v60 §1a | congela el recorrido el día de la salida para que «las carreras ya corridas» no cambien retroactivamente                                                                                     | se conserva y gana `kind`, `label`, `time_trial` y `season` en `freezeRaceRoute` (decisión 23, sección 10)                                                         |
| `featureProfile.ts`                    | entero                              | reconstruye las 177 reales; con `elevation` es determinista sin azar; bajadas topadas a −12 %; sectores sin solape                                                                           | **no se toca en E1** (decisión 27); huella FNV sellada antes de tocar `calendar.ts` (decisión 28)                                                                  |
| `auto()`                               | `calendar.ts` l. 88-101             | una `cima` por puerto y ninguna meta volante                                                                                                                                                 | se conserva para lo real; lo generado usa `emitirPancartas` (decisión 25)                                                                                          |
| `mixRoles`                             | `calendar.ts` l. 457-519            | las cuatro garantías de composición (crono según `ROUTE.itt*`, última decisiva, mínimo de selectivas, final en alto en 4+) y el 69 % de vueltas con crono y 96 % con final en alto de la v10 | se conservan como reglas dentro de `composeTour`; `stageMix` conserva firma (decisiones 18 y 19)                                                                   |
| La doctrina de `fuentes-recorridos.md` | mapa 05 §6                          | nada se inventa en un recorrido real; un puerto sin km de cima + longitud + pendiente se descarta                                                                                            | heredada entera (sección 11)                                                                                                                                       |

### 1.9 Por qué E1 va primero

Los perfiles son la entrada de la calibración táctica: cada banda de simulación se mide sobre las etapas que el calendario produce, y 1.241 de esas 1.418 etapas las produce hoy un generador con siete moldes, dos sorteos de forma y ningún país. El repositorio ya pagó una vez el precio de calibrar contra una forma que no existe (cinco versiones certificando un 27 a 30 % que sobre el calendario real era 18,1 % y sobre las reinas de verdad 3,3 %), y cada versión del motor que pase sin arreglar el generador es calibración que habrá que rehacer. Por eso el generador no es contenido aplazable: es infraestructura de la que depende la corrección de lo demás, y por eso este documento es el primero de los trece (agenda §4.18, encargos E1).

---

## 2. Principios

Diez reglas. Las nueve primeras son las de la propuesta ganadora (`arquitectura.md` §2) reescritas con las decisiones cerradas de la síntesis; la décima la impusieron los tres jueces (riesgo 2 de cobertura, 7 del motor, 1 de ejecutabilidad). Cada principio lleva tres cosas: lo que dice, con qué línea del código de hoy choca (la sección 1 «Diagnóstico medido» tiene la cifra completa; aquí solo la referencia), y qué lo hace cumplir en el diseño (tipo, constante, veto o test, con la sección que lo desarrolla). No son aspiraciones: cuando un principio y una línea del plan se contradigan, manda el principio y la línea se reescribe.

### 2.1 La arquitectura se sortea; el detalle se rellena

Una semilla decide primero QUÉ etapa es (esqueleto, motivos, cuántos, en qué ventana de la etapa empieza cada uno) y solo después CÓMO se dibuja (longitud exacta de cada rampa, ondulación del enlace, ruido de pendiente). Las dos decisiones viven en subflujos distintos (`arch|raceId` y `mot|…` para la arquitectura; `dib|…` para el dibujo, sección 8) y las primitivas de dibujo se conservan tal cual: `climb`, `descent`, `rolling` y `split` de `profileGen.ts` siguen siendo las que rinden cada motivo (sección 4).

Hoy es al revés. El mapa 01 §4 lo mide: la semilla mueve únicamente el detalle; el número de dificultades lo fija el kilometraje por umbral (`hillySegments(170, 'x')` tiene 2 cotas y `hillySegments(171, 'x')` tiene 3), el orden lo fija el `forEach` de cada molde (siempre relleno, dificultad, bajada, relleno) y las únicas dos decisiones de forma sorteadas de todo el generador son el brazo de desnivel y el `finalKind` de `mountainSegments` (l. 345 y l. 355, `arquitectura.md` §1.2). De ahí «siempre son los mismos tres o cuatro modelos» (agenda §4.18). En el diseño la variedad no la da el ruido de las rampas sino el catálogo: 12 `MotifKind`, 9 `MetaKind`, 32 `SkeletonId` y 4 `TourSkeletonId` (sección 3), y el sorteo de esqueleto es una elección ponderada `pesoBase × geo.pesos × ARCH.pesoPorClase` (sección 5). `skeletons.test.ts` sella que sobre 300 semillas por clase y zona ningún esqueleto admitido sale a 0 ni ninguno pasa del 60 % (sección 13, banda de variedad).

### 2.2 Cada motivo es un tipo con parámetros acotados, y los rangos viven en `ARCH` con intención

Un motivo es un valor del tipo `Motif` (`motifs.ts`, sección 3) con `kind`, `km`, `g`, `forma` y, según el tipo, `adoquin`, `firme`, `estrellas`, `hijos`, `vueltas`, `meta` o `cotaFinal`; `validateMotif` rechaza cualquier combinación fuera de rango antes de rendir. Todo rango numérico de forma está en el bloque `ARCH` de `constants.ts` (sección 12, tabla completa en §B.3 del esqueleto) con valor e intención al lado: `ARCH.motivo.cota.km` [2,5; 8,0] al [4; 7] % («media montaña; techo 8,0 deja 0,5 a `PASS_MIN_KM` 8,5»), `ARCH.motivo.puerto.km` [9,0; 25], `ARCH.motivo.muro.km` [0,4; 3,0] con `gMax` 16, y así las 40 filas. La regla de revisión es mecánica: en `packages/engine/src/routes/grammar/` ningún `between(rand, a, b)` lleva literales; recibe un rango de `ARCH` o la intersección de ese rango con el de `GeoSignature`.

Hoy los rangos son literales en el cuerpo de las funciones (`between(rand, 3, 7)` en `profileGen.ts` l. 247, `between(rand, 1, 2.5)` l. 477, `between(rand, 9, 15)` l. 362, `arquitectura.md` §1.2) y de las claves de `ROUTE` solo cuatro entran en `profileGen.ts` (mapa 01 §3 y §9.2): `ROUTE.kmFlat`, `queenDplusRange` y compañía describen el generador pero no lo gobiernan. La sección 12 lista qué literales migran (l. 247-248, 276-283, 358-363, 451-454, 477-478, 496) con su valor de hoy al lado y qué claves de `ROUTE` se retiran porque `ARCH` las sustituye. `motifs.test.ts` recorre cada `MotifKind` con 300 semillas y comprueba que el rendido cae dentro del rango declarado (sección 15, paso 3).

### 2.3 La geografía restringe, no decora; `null` significa «aquí no existe»

El país entra como `GeoSignature` (sección 6): para cada `GeoZone` dice qué existe (`puerto`, `cota`, `muro` con sus rangos), qué no existe (`null`), cuánto adoquín y sterrato hay, cómo ondula el enlace (`amplitud`) y qué esqueletos son probables (`pesos`). El `terrain` de la fila deja de ser identidad y pasa a ser petición: `StageRequest.terrain` es «sesgo, nunca orden» (§B.2). Si el sitio no puede dar lo que la fila pide, se degrada de forma escrita, contada y siempre hacia abajo:

```ts
// packages/engine/src/routes/grammar/geo.ts
/** Un esqueleto cabe en una zona si todo lo que `requiere` existe (ningún campo pedido es `null`). */
export function admite(geo: GeoSignature, sk: Skeleton): boolean
/** Siempre hacia abajo: alta → montana → media → ondulado → llano; `llano` se queda en `llano`. Nunca hacia arriba: un país llano no gana puertos. */
export function degradar(relieve: Relieve): Relieve
```

`Territorio.cordillera: null` es la misma idea a escala de vuelta: «una vuelta belga no tiene reina» no es un peso 0 en una tabla sino una propiedad del sitio que el dueño lee en una fila y que `tour.test.ts` sella («0 reinas en BE, NL, DK, AE, AU», decisión D8 con valor por defecto «se acepta», sección 18). Los vetos V1 a V4 (sección 9) comprueban la geografía sobre el perfil final, no solo sobre la intención. Y la zona no se sortea nunca: `RACE_REGION` está curada a mano para las 310 carreras de equipos y por etapa para las 60 ediciones, `regions.test.ts` prohíbe que una carrera de equipos caiga a `zonaDe(country)` (sección 6); solo los 532 nacionales pasan por el país.

Hoy `buildRace` calcula el país en `calendar.ts` l. 889 (`row.country ?? RACE_COUNTRY[row.id]`), lo copia al resultado y no lo pasa a ninguna de las tres ramas que construyen etapas (mapa 02 §6); los 532 nacionales salen de `classic(220, id)` e `itt(38, id)` para los 133 países (l. 351-360, `arquitectura.md` §1.3): el belga y el colombiano son la misma función con distinto hash. La tabla `ZONAS` es juicio, no dato (decisión 16), y por eso este principio no se sostiene solo: se apoya en el 2.10.

### 2.4 Lo que se declara se garantiza

Un `Skeleton` declara el `StageKind` que produce (`Skeleton.kind`) y, en reinas y medias, el `FinalKind` (`Skeleton.finalKind`). El perfil rendido pasa por `stageKindOf` y `finalKindOf` de `routes/` y, si no coincide, se rehace con el siguiente intento (V6 y V7, sección 9): el reintento solo cambia los subflujos `mot`, `pos` y `dib` con sufijo `i{intento}`, nunca la identidad. El tope es `ARCH.colocacion.maxIntentos` 8; agotado, se rinde la plantilla `canonico` del esqueleto (un `Motif[]` literal escrito a mano que pasa todos los vetos por construcción, sección 5) y la etapa sale con `arch.degradado: true`. Las cifras que cierran el principio: `ARCH.veto.fallbackMaxShare` {calendario: 0, testPorEsqueleto: 0,005} (cero degradados en las 1.418 etapas de `SEASON_CALENDAR`, ≤ 0,5 % en 300 semillas × zona) y `ARCH.veto.intentosP95` 3 (si el p95 de `arch.intentos` lo supera en el paso 4, se estrechan rangos antes que subir el tope). Y el `kind` de toda etapa generada es `stageKindOf(profile, timeTrial).kind`, nunca una etiqueta heredada del papel (decisión 23).

La garantía necesita holgura, porque los clasificadores de `routes/` tienen bordes duros y hoy nadie los respeta: 8,5 km entre `garantizaPuerto` (mide `segment.km`) y `climbSize` (suma tramos redondeados) cruzan 3 de 1.500 clasificaciones; los cortes 5 y 20 de `FINAL_KIND_CUTS` contra los rangos de `valleyKmFor` cruzan 4 de 6.000; `CLIMB_MIN_KM` 1,5 contra muros de 1 a 2,5 km deja 12 de 1.500 clásicas sin «última cota» (mapa 01 §9.4). Por eso `puerto` empieza en 9,0 y `cota` acaba en 8,0 (0,5 a cada lado de 8,5), los valles de `cima_cerca`, `descenso_meta` y `valle` llevan 0,7 de margen sobre 5 y 20 (`ARCH.veto.margenValleKm`), y `emitirPancartas` pone `cima` siempre en el último `puerto` para que `lastClimbKm` lo vea (sección 4 y sección 8). Lo que hoy viola el principio con más ruido: `mountainClassicSegments` no está en `stageKind.test.ts` y el 14 % de sus salidas se clasifica `media` mientras el calendario las etiqueta reina (mapa 01 §9.5); son 72 discrepancias entre `kind` declarado y leído, con un 49 sellado en `stageHistory.test.ts` l. 199 (sección 1 y sección 11). `skeletons.test.ts` sella cada esqueleto × 5 kilometrajes × 60 semillas × zonas compatibles con V6 y V7 en verde (sección 15, paso 4).

### 2.5 Identidad por carrera, edición por temporada; la temporada 0 tira sus propios dados

Una carrera es la misma carrera. Su identidad sale de `raceId` sin `season` (subflujos `arch|raceId` y `firma|raceId`): esqueleto, zona, motivos de firma con sus parámetros, papeles de cada etapa, qué etapas son crono y cuántas hay (decisión 20). La edición sale de `ed|raceId|season` y toca una lista cerrada: motivos no firma, km ± `ARCH.edicion.kmJitter` 0,06 (nunca en etapas de edición real, donde el km es contrato), vueltas ± 1, un motivo opcional con p `ARCH.edicion.motivoNuevo` 0,35, y el dibujo. Nunca el `kind`, el `timeTrial` ni el número de etapas: eso lo sella `edition.test.ts` (sección 10), porque cuatro lectores fuera de `race_routes` leen el `kind` del código (`calendarRun.ts` l. 516 y 1614, `callups.ts` l. 98, `raceContext.ts` l. 56-59; riesgo 1 del juez del motor) y la sección 10 los lleva al congelado.

`BASE_SEASON = 0` es la que la base ya usa (`season = floor(gameDay / SEASON_DAYS)`, `calendarRun.ts` l. 135) y `SEASON_CALENDAR = calendarForSeason(0)`. La temporada 0 no es «la mediana de las cardinalidades» ni un caso especial: tira sus dados con `ed|raceId|0` como cualquier otra (decisión 21). El interruptor `ARCH.edicion.activa` y el `nivel` (0 fija, 1 jitter, 2 rotación declarada por `Skeleton.alternativas` elegida por `season % n`) son decisión del dueño D7; se implementa activa con nivel 1, y nivel 2 donde el esqueleto declare alternativas (sección 18). Hoy no hay temporada: `SEASON_CALENDAR` es una constante de módulo (`calendar.ts` l. 3643, mapa 02 §11) y la base, que sí sabe de temporadas (`raceKey = ${race.id}:s${season}`, `calendarRun.ts` l. 783), le pide al calendario el mismo perfil cada año (`arquitectura.md` §1.4.6).

### 2.6 Lo real manda y se distingue hasta la pantalla

La prioridad de `buildRace` no cambia: rasgos reales (`featureSpec`) > edición real sin rasgos (`stagesFromEdition`) > generado (tabla y nacionales). Un recorrido con rasgos no pasa por la gramática y `featureProfile.ts` no se toca en E1 (decisión 27, con la deuda de los dos rellenos anotada en la sección 11). Antes de tocar `calendar.ts`, `realFingerprint.test.ts` sella la huella FNV de las 177 etapas con rasgos y de las 3 grandes vueltas enteras, y sobrevive al paso 8 (decisión 28). El origen viaja: `routeSource` con tres valores por etapa (`'real' | 'edicion' | 'generado'`) desde `CalendarStage` hasta `race_routes.route_source`, la API y la web, con `mixto` como agregado de carrera, y la ficha lo dice con tres textos distintos («Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado», decisión 39). Para lo generado, la ficha añade la frase de arquitectura y «Edición N» (D10, valor por defecto: siempre; sección 18).

Hoy `RouteSource` tiene dos valores (`db/raceRoutes.ts` l. 29) y `freezeRaceRoute` escribe `'generado'` a mano para todo (l. 49-52, con el comentario que lo reconoce: «no hay forma de distinguirlas sin el campo»). El inventario cuenta 1.241 de 1.418 etapas no reales (87,5 %, mapa 05 §3), y `motor.md` §10 sigue vivo: «perfiles generados que nunca se han validado contra nada». Este principio no arregla eso (E12 carga dato real, sección 17); arregla que el jugador no pueda saber cuál es cuál.

### 2.7 Puro y determinista, con un subflujo nominal por decisión

Todo azar sale de `routeRng` (FNV-1a + mulberry32, `profileGen.ts` l. 15-44), que se conserva, y cada decisión tira de su propio flujo, como `stage/rng.ts` l. 26-29 (`stageRng(seed)(subflow)`). La lista es cerrada (sección 8): `arch|raceId` y `firma|raceId` (identidad, sin `season`); `ed|raceId|season` (edición); `mot|raceId|i|season|slot|j|i{intento}` (instanciación); `pos|raceId|i|season|i{intento}` (colocación); `dib|raceId|i|season|slot|i{intento}` (dibujo). Las etapas de edición real usan `raceId|e{i}|{from}|{to}|{km}` en lugar de `raceId|i` (decisión 22), para que dos carreras con la misma salida, meta y km ya no dibujen lo mismo. Ni `Math.random` ni `Date.now`: `grep -rn 'Math.random' packages/engine/src/routes` devuelve 0 líneas hoy y sigue devolviendo 0 (regla del plan, sección 15). `generate.test.ts` sella que la misma `StageRequest` produce el mismo `GeneratedStage` bit a bit y que cambiar `season` no mueve `arch.skeleton`.

```ts
// packages/engine/src/routes/grammar/generate.test.ts
it('la misma petición produce el mismo perfil, y la temporada no mueve la identidad', () => {
  const req = peticion('race-jura', { season: 0 }) // helper del test: StageRequest completa desde raceId
  expect(generateStage(req)).toEqual(generateStage(req)) // bit a bit, sin tolerancia
  const t3 = generateStage({ ...req, season: 3 })
  expect(t3.arch.skeleton).toBe(generateStage(req).arch.skeleton)
  expect(t3.arch.motivos.filter((m) => m.firma)).toEqual(
    generateStage(req).arch.motivos.filter((m) => m.firma),
  )
})
```

La razón de tanto nombre está escrita en el propio generador: «una tirada más de `routeRng` por reina, así que todos los perfiles de montaña del calendario cambian» (`profileGen.ts` l. 316-317, la lección de la v64), y un kilómetro de diferencia redibuja el detalle entero porque `rolling` recalcula `n` con la misma corriente (mapa 01 §4). Con subflujos por decisión, añadir una tirada al esqueleto no redibuja el relleno y cambiar la amplitud del relleno no mueve un puerto.

### 2.8 El motor no cambia y los vetos solo leen `routes/`

El contrato es `Segment { km, tipo, tramos?, estrellas? }`, `Ramp { km, g }` y `Banner { km, tipo, cat? }` de `stage/types.ts` l. 12-48, intactos; `sample.ts`, `physics.ts` y `simulate.ts` no se tocan. La gramática produce lo que el motor sabe leer y nada más: nunca emite `rompepiernas` (`sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora los tramos), `tendida` y `expuesto` se tipan `llano` con tramos, el `muro` adoquinado sigue siendo `puerto` y el `sector` de tierra es `paves` de 2 a 3 estrellas (sección 4). Lo que el motor no lee no se finge: `viento` y `altitud` de `GeoSignature` viajan en `arch.metadatos` y en la ficha con texto que no promete («llano abierto», nunca «abanicos»), porque el abanico sigue saliendo de `rng('viento')` sobre cualquier km de `llano` (mapa 03 §5.1, decisión 17).

La segunda mitad la impuso el juez del motor (riesgo 3) y es la que ninguna propuesta tenía entera: un veto que llame por intento a `finishType(deriveFinishTerrain(sampleProfile(…)))` o a `costBase` hace que una recalibración de `STAGE.finish*` o de `physics.ts` redibuje perfiles generados sin que `routes/` haya cambiado, y el repositorio ya vivió el acoplamiento contrario. Por eso:

```ts
// packages/engine/src/routes/grammar/veto.ts
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y la geometría del esqueleto.
// NUNCA sampleProfile, finishType ni costBase: eso se mide en sim/routeCensus.ts (V16) y en motifs.test.ts.
```

`grammar/veto.ts` no importa nada de `packages/engine/src/stage/` salvo los tipos, y `veto.test.ts` lo demuestra con un perfil que dispara y otro que no por cada veto sin instanciar el muestreador:

````ts
// packages/engine/src/routes/grammar/veto.test.ts
it('verify no toca el motor: sampleProfile no se llama en ningún intento', async () => {
  const sample = await import('../../stage/sample.js')
  const spy = vi.spyOn(sample, 'sampleProfile')
  for (const seed of semillas(300)) generateStage(peticion('race-jura', { season: seed }))
  expect(spy).not.toHaveBeenCalled()
})
``` `finishType` se mide en `routeCensus` con `groupSize` 50, ahí y solo ahí (V16, sección 9 y sección 13), y si una banda de final falla se ajustan rangos de `ARCH.meta`, no se reintenta. Consecuencia útil: recalibrar `finish.ts` no cambia una sola huella de recorrido.

### 2.9 Medir antes de bandear, y «mejor y no solo distinto»

Ninguna banda nueva nace en rojo (regla 4 de mapa 04 §5.3): primero se mide con el generador de hoy (paso 0, `routeCensus` contra `SEASON_CALENDAR` con las bandas que fallan en `it.todo` y tabla en `balance.md` «v61 §0»), después se escribe la banda con la columna «hoy (medido)» al lado (`ROUTE_CENSUS_TARGETS`, sección 13). Lo geométrico va a `test:rapido`: `routeCensus` cuesta 0,57 s sobre las 1.418 etapas (juez del motor §1, `coste-motor.mjs`) y corre en cada push; lo simulado va a `test:bancos` y se compara pareado, con `engineVersion` fijo en la semilla y 12 semillas, viejo contra nuevo (decisión 30). «Mejor» tiene cuatro condiciones necesarias: realismo rojo→verde sin ningún verde→rojo; variedad en verde; las canónicas sin moverse un dígito; simulación en la dirección pre-registrada en `balance.md` antes de correr, o explicación medida sin ajustar la banda. Las listas cerradas se leen dos veces, por nombre y por forma. La tabla pareada es la condición para borrar `sim/legacy/profileGenLegacy.ts` (decisión 29), y la remedición tiene dueño, orden por coste creciente, 4 h de máquina, 2 sesiones y techo de 8 h (decisión 34); un resultado que contradiga la previsión se anota como «previsión fallida» y no mueve la banda hasta decisión del dueño.

Hoy lo contrario es la norma: el mapa 04 §3.3 cuenta seis repeticiones del mismo patrón, un banco canónico en verde certificando algo falso, con `reina-150` como caso mayor (fuga del 27 al 30 % sobre un perfil que no es una reina, contra 3,3 % en las reales y el 18,1 % que el dueño aceptó con «está bien así»; sección 1). Por eso V8b (≥ 25 % de la subida a más de 30 km de meta) es veto y no banda, y el test se llama «`reina-150` expresada como esqueleto no pasa `verify`» (sección 9).

### 2.10 El dueño ve antes de aceptar

La tabla geográfica es juicio: dato son solo las 20 filas `terrain: 'cobbles'`, las ciudades de `raceRoutes.ts` y las 177 etapas reales (decisión 16), y la validación externa es imposible (PCS y Overpass vetados, `fuentes-recorridos.md`). Ninguna propuesta daba un instrumento para que el dueño viera lo que iba a aceptar (riesgo 2 de cobertura). El diseño lo da: `scripts/galeria-recorridos.mjs` genera `docs/galeria-recorridos/`, una página por zona con 5 perfiles por (zona × esqueleto compatible) rendidos con `renderAltimetrySvg`, más los 4 nacionales de cada uno de los 133 países, con la frase de arquitectura, `kind`, `finalKind`, D+ y el `finishType` del censo debajo de cada uno (sección 16). Se genera en el paso 4 y se entrega ANTES del paso 8; el dueño la lee con tres preguntas por perfil (¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado?) y cada respuesta negativa se corrige editando `ZONAS`, `RACE_REGION` o `ARCH.pesoPorClase`, que son datos, nunca código. La misma frase de arquitectura que el dueño ve en la galería es la que ve el jugador en la ficha (D10, sección 18): lo que se enseña es lo que se generó.

### 2.11 Los diez principios en una tabla

| # | Principio | Lo viola hoy (sección 1) | Lo hace cumplir | Test que lo sella |
| --- | --- | --- | --- | --- |
| 1 | La arquitectura se sortea, el detalle se rellena | número de dificultades por umbral de km, orden fijo por molde, dos sorteos de forma en todo el generador (mapa 01 §4) | `SKELETONS` (32), `arch|raceId`, `mot`/`pos`/`dib` separados (secciones 5 y 8) | `skeletons.test.ts`: ninguno a 0 ni > 60 % por clase y zona |
| 2 | Cada motivo es un tipo con rangos en `ARCH` | literales en `profileGen.ts` l. 247, 362, 477; cuatro claves de `ROUTE` en uso (mapa 01 §3) | `Motif`, `validateMotif`, bloque `ARCH` (secciones 3, 4, 12) | `motifs.test.ts`: 300 semillas por motivo dentro de rango |
| 3 | La geografía restringe; `null` es «no existe» | país calculado en l. 889 y no pasado; nacionales por hash (mapa 02 §6) | `GeoSignature`, `admite`/`degradar`, `RACE_REGION`, V1 a V4 (sección 6) | `geo.test.ts`, `regions.test.ts` (0 equipos al país), `tour.test.ts` (0 reinas sin cordillera) |
| 4 | Lo que se declara se garantiza | 14 % de `mountainClassicSegments` en `media`; 72 discrepancias y el 49 sellado | `Skeleton.kind/finalKind`, V6, V7, reintento, `canonico`, `fallbackMaxShare` (sección 9) | `skeletons.test.ts` por esqueleto × 5 km × 60 semillas; `calendario.test.ts` degradados = 0 |
| 5 | Identidad por carrera, edición por temporada | `SEASON_CALENDAR` constante; la base pide el mismo perfil cada año | `calendarForSeason`, `BASE_SEASON` 0 con dados, lista cerrada de edición (sección 10) | `edition.test.ts`: `stagesForSeason(id, 0) === SEASON_CALENDAR`; `kind`, `timeTrial`, `n` invariables |
| 6 | Lo real manda y se distingue | `RouteSource` de dos valores, `'generado'` a mano (`raceRoutes.ts` l. 29, 49-52) | prioridad intacta, huella FNV, `routeSource` de tres valores hasta la web (sección 11) | `realFingerprint.test.ts` (177 + 3) antes y después |
| 7 | Puro y determinista con subflujos nominales | una corriente por etapa: una tirada más mueve todo (`profileGen.ts` l. 316-317) | lista cerrada de subflujos, reintento solo en `mot`/`pos`/`dib` (sección 8) | `generate.test.ts`: misma petición, mismo perfil; grep `Math.random` = 0 |
| 8 | El motor no cambia; vetos solo de `routes/` | propuestas con `finishType` por intento (juez motor, riesgo 3) | `verify` sin `stage/`, V16 en `routeCensus`, metadatos de viento y altitud (secciones 9 y 13) | `veto.test.ts` sin instanciar `sampleProfile`; huellas del motor intactas |
| 9 | Medir antes de bandear; mejor y no solo distinto | seis repeticiones del patrón `reina-150` (mapa 04 §3.3) | paso 0, `ROUTE_CENSUS_TARGETS` con «hoy», protocolo pareado, tabla como condición (sección 13) | `routeCensus.test.ts` en `test:rapido` (0,57 s) |
| 10 | El dueño ve antes de aceptar | ningún instrumento; tabla geográfica sin validación posible | galería en el paso 4, correcciones como dato, frase en la ficha (sección 16) | entrega de `docs/galeria-recorridos/` antes del paso 8 (no es un test: es una condición del plan) |

---

## 3. El modelo de tipos

Esta sección escribe los tipos que el resto del documento usa por nombre. Van en el orden en que el generador los consume: primero lo que no cambia (el contrato del motor), después las piezas (motivos), los moldes (esqueletos), el sitio (zonas, territorios, regiones), la composición de una vuelta, la petición y la salida de `generateStage`, la temporada, los vetos y el censo, y al final lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`. Cada bloque TypeScript va seguido de por qué tiene esa forma y contra qué línea del código encaja. Los rangos numéricos que aparecen en comentarios salen del bloque `ARCH` (sección 12, Las constantes) y no se repiten aquí con su apoyo; los nombres de fichero son los de la tabla de la sección 15 (El plan de implementación).

### 3.1 Lo que no cambia: el contrato del motor (`stage/types.ts` l. 12-48)

El motor de etapa no ve el generador. Ve un `StageProfile` (`types.ts` l. 44-47: `segments` y `banners?`), formado por `Segment` (l. 36-41: `km`, `tipo`, `tramos?`, `estrellas?`), `Ramp` (l. 18-21: `km`, `g` en %) y `Banner` (l. 24-30: `km`, `tipo: 'meta_volante' | 'cima'`, `cat?`), con cinco terrenos de autoría (`SegmentTerrain`, l. 12: `llano`, `rompepiernas`, `puerto`, `descenso`, `paves`). `sampleProfile` (`sample.ts` l. 68-125) lo colapsa a bloques de 100 m con cuatro campos físicos (`Block`, `types.ts` l. 50-61: `g`, `tipo`, `estrellas`, más `banner?` y `climbCategory?` para los puntos), y la física entera lee solo `g`, `tipo` y `estrellas` (mapa 03 §3, tabla de `physics.ts` l. 20-653). Cuatro hechos de ese mapa fijan la forma de todo lo que sigue:

1. `rompepiernas` muere en el muestreo: `sample.ts` l. 100-101 le pone `g = STAGE.rollingGradient` (1,5, `constants.ts` l. 1596) aunque traiga tramos, y los tramos se ignoran. El generador nunca lo emite (decisión 2 de la síntesis): lo que hoy sale como `rompepiernas` se escribe como `llano` con tramos.
2. `kmSubida` cuenta bloques de tipo `subida`, no pendiente (`simulate.ts` l. 1696-1702 vía mapa 03 §4.1). Un `llano` con tramos al 3 % no suma; un `puerto` con tramos al 1 % sí. Por eso el modelo distingue `tendida` (tipada `llano`: desgasta, no cuenta) de `cota` (tipada `puerto`: cuenta), y por eso `Segment.tipo` es una decisión del generador y no una consecuencia de la pendiente.
3. El contrato no tiene altitud, exposición al viento, anchura ni costa (mapa 03 §1, lista de lo que no está). Nada de eso puede llegar al motor desde el perfil; en el modelo viaja como metadato de la ficha (`GeneratedStage.arch.metadatos`, decisión 17) y nunca como física.
4. `finishType` (`finish.ts` l. 142) y `deriveFinishTerrain` (l. 71) leen bloques muestreados, no segmentos: el tipo de final es una propiedad del motor, no del perfil. Por eso el modelo promete `kind` y `finalKind` (que se leen del perfil con `stageKindOf`, `stageKind.ts` l. 71, y `finalKindOf`, `finalKind.ts` l. 78) y solo MIDE `finishType` en el censo (decisión 4).

Nada nuevo entra en `types.ts`. Todo tipo de esta sección vive aguas arriba del `StageProfile` y se traduce a él en `render.ts`.

### 3.2 Motivos (`routes/grammar/motifs.ts`)

```ts
// packages/engine/src/routes/grammar/motifs.ts
export type MotifKind =
  | 'enlace' | 'expuesto' | 'tendida' | 'descenso'          // enlaces
  | 'cota' | 'puerto' | 'muro' | 'cadena' | 'sector' | 'racimo' | 'circuito'   // dificultades
  | 'meta'                                                  // siempre el último

export type MetaKind =
  | 'esprint' | 'repecho' | 'muro_meta' | 'alto_corto' | 'alto_largo'
  | 'cima_cerca' | 'descenso_meta' | 'valle' | 'sector_meta'

export interface Motif {
  kind: MotifKind
  km: number                                   // total del motivo; en `circuito`, el de una vuelta
  g?: number                                   // dificultades y `tendida`: pendiente media en %
  forma?: 'regular' | 'progresiva' | 'irregular'
  adoquin?: boolean                            // `muro` adoquinado (sigue siendo `puerto`) o `sector` de adoquín (frente a tierra)
  firme?: 'adoquin' | 'tierra'                 // solo `sector`; tierra se rinde como `paves` 2-3★
  estrellas?: number                           // solo `sector`: 1..5
  hijos?: Motif[]                              // `cadena`, `racimo`, `circuito`
  vueltas?: number                             // solo `circuito`
  meta?: MetaKind                              // solo `meta`
  cotaFinal?: { km: number; g: number }        // `meta` con cota
  firma?: boolean                              // motivo de FIRMA: no cambia entre ediciones
  nombre?: string                              // texto para la ficha («Muro de 1,2 km al 11 %»)
}

/** Devuelve `null` si el motivo cumple los rangos de `ARCH.motivo` y `ARCH.meta`; si no, la regla violada. */
export function validateMotif(m: Motif): string | null
/** Rinde un motivo a segmentos con las primitivas de `profileGen.ts`; `geo` da la amplitud del relleno. */
export function renderMotif(m: Motif, rand: () => number, geo: GeoSignature): Segment[]
````

Un motivo es una pieza de carretera con significado ciclista, y es la unidad que la semilla decide primero (principio 1, sección 2). Es un solo `interface` con campos opcionales y no una unión discriminada (banco e ingeniero la usaban) por dos razones prácticas: los esqueletos declaran `params?: Partial<Pick<Motif, ...>>` sobre un solo tipo, y la plantilla canónica de cada esqueleto es un `Motif[]` literal que se escribe a mano (sección 5); `validateMotif` es quien impone la coherencia entre `kind` y campos, con un test por motivo en `grammar/motifs.test.ts`. Todo está en km y % redondeado a 0,1, que es la resolución a la que `normalizeEnlaces` cuadra el total (V10 exige Σ km al 0,1).

Cómo se rinde cada motivo a `Segment[]` y qué lee el motor de él (rangos de `ARCH.motivo`, sección 12; lecturas del mapa 03 §3 y §4):

| Motivo     | `km`                             | `g`                           | Rinde a `Segment[]` como                                                                                                         | Qué lee el motor                                                                                                      |
| ---------- | -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `enlace`   | [1; 60]                          | amplitud `geo.amplitud` ≤ 2,4 | `rolling(rand, km, amp, 0)` en trozos de 3 a 6 km (`profileGen.ts` l. 102): varios `llano` con tramos                            | pendiente en `costBase`; único terreno con abanico y acordeón (`simulate.ts` l. 1215, 4340-4408); `selectionFactor` 0 |
| `expuesto` | [5; 60]                          | amplitud fija 1,0             | `rolling(rand, km, 1.0, 0)`                                                                                                      | igual; la ficha lo describe como llano abierto, sin prometer abanicos (decisión 17)                                   |
| `tendida`  | [5; 30]                          | [1,5; 3,5]                    | UN `llano` con 2 a 4 tramos a `g ± 0,7`                                                                                          | `costBase` 0,24 + 0,135·g; NO suma `kmSubida`; no selecciona                                                          |
| `descenso` | `clamp(len·g·10/55, 2, 10)`      | [−8; −3]                      | `descent(rand, km,                                                                                                               | g                                                                                                                     | )`: un `descenso` con tramos | selecciona solo con g ≤ −4 en su primer km o entero a ≤ 25 km de meta (l. 2427, 5083-5089); coste con suelo 0,10 |
| `cota`     | [2,5; 8,0]                       | [4; 7]                        | `climb(rand, km, g)`: un `puerto` con tramos, pancarta `cima` si ≥ 1,5 km                                                        | `subida`: suma a `kmSubida`, deriva, `climbRaceKmToGo` 30, categoría por `deriveClimbCategory`                        |
| `puerto`   | [9; 25]                          | [5; 9]                        | `climb`; `forma: 'irregular'` añade una rampa de [0,3; 0,8] km al [11; 13] %                                                     | igual; con COL bloque a bloque donde g ≥ 8 (`riderPerfil`, l. 434)                                                    |
| `muro`     | [0,4; 3,0]                       | [8; 16]                       | `climb(rand, km, g, { gMax: 16 })` con 2 rampas; `adoquin: true` sigue siendo `puerto`                                           | COL en todos sus bloques; en meta y ≤ 1,0 km, `finishType` da `muro` (`finish.ts` l. 184-185)                         |
| `cadena`   | Σ hijos + enlaces de [1; 6] km   |                               | hijos (`muro` o `cota`) intercalados con `rolling` corto, sin valle                                                              | nada nuevo: n rachas de `subida` seguidas                                                                             |
| `sector`   | [0,3; 3,7]                       | 0                             | `{ km, tipo: 'paves', estrellas }`; `firme: 'tierra'` se rinde como `paves` de 2 a 3★ (como Strade en `classicRoutes.ts` l. 594) | `estrellas` en `costBase` 0,55 + 0,06·e, selección y percances ×20 (`constants.ts` l. 4389)                           |
| `racimo`   | [20; 60]                         |                               | [4; 10] sectores separados por `rolling` de [2; 6] km con amplitud 0,7                                                           | `kmToNextPaves` y el peaje de entrada en cada sector (l. 1628-1636, 2611)                                             |
| `circuito` | vuelta [8; 30] × [3; 18] vueltas |                               | los `hijos` rendidos `vueltas` veces con la MISMA semilla de detalle (`dib                                                       | …                                                                                                                     | hijo{h}`)                    | n pasos por la misma cota; una pancarta por paso ≥ 1,5 km (decisión 25)                                          |
| `meta`     | según `MetaKind`                 |                               | sección 4 (tabla de los nueve finales)                                                                                           | `finishType` medido en el censo (V16) y `finalKindOf` garantizado (V7)                                                |

Dos aclaraciones que las propuestas dejaban ambiguas. `tendida` y `expuesto` se tipan `llano` a propósito y no `rompepiernas`, porque el segundo pierde sus tramos en el muestreo (hecho 1 de §3.1). Y `muro` adoquinado sigue siendo `puerto` (regla de la casa de `fuentes-recorridos.md`, citada por arquitectura §3.1): `adoquin: true` solo cambia el nombre de la ficha y el requisito geográfico (`GeoSignature.muro.adoquin`), nunca `Segment.tipo`.

### 3.3 Esqueletos (`routes/grammar/skeletons.ts`)

```ts
// packages/engine/src/routes/grammar/skeletons.ts
export interface Slot {
  motif: MotifKind
  n: [number, number] // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number] // fracción de la etapa donde EMPIEZA el motivo
  params?: Partial<Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas'>> & {
    kmRango?: [number, number]
    gRango?: [number, number]
  }
  firma?: boolean
}

export interface Skeleton {
  id: SkeletonId
  kind: StageKind // lo que `stageKindOf` TIENE que devolver
  label: string
  finalKind?: FinalKind // reinas y medias: lo que `finalKindOf` TIENE que devolver
  meta: MetaKind
  slots: Slot[]
  dPlus: [number, number] // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number] // rango bruto antes de ARCH.km.porClase
  requiere?: Partial<GeoSignature>
  pesoBase: number // peso del catálogo antes de zona y clase
  canonico: Motif[] // instancia fija escrita a mano: pasa todos los vetos por construcción
  alternativas?: Motif[][] // rotación DECLARADA (ARCH.edicion.nivel 2): la edición elige season % n
}

export type SkeletonId =
  // un día (15)
  | 'ud_esprint'
  | 'ud_esprint_capi'
  | 'ud_circuito'
  | 'ud_muro_final'
  | 'ud_muros'
  | 'ud_muros_adoquin'
  | 'ud_sterrato'
  | 'ud_adoquin'
  | 'ud_adoquin_ligero'
  | 'ud_montana'
  | 'ud_montana_media'
  | 'ud_montana_alto'
  | 'ud_criterium'
  | 'nc_ruta'
  | 'nc_crono'
  // etapa de vuelta (17)
  | 'et_llana'
  | 'et_llana_viento'
  | 'et_media_valle'
  | 'et_media_alto'
  | 'et_media_muro'
  | 'et_media_tendida'
  | 'et_reina_alto_largo'
  | 'et_reina_alto_corto'
  | 'et_reina_cima_cerca'
  | 'et_reina_valle'
  | 'et_reina_encadenada'
  | 'et_montana_corta'
  | 'et_reina_blanda'
  | 'et_crono'
  | 'et_prologo'
  | 'et_cronoescalada'

export const SKELETONS: Record<SkeletonId, Skeleton>
```

Un esqueleto es una secuencia de huecos con cardinalidad y ventana de posición, y es el molde que el dueño echa en falta cuando dice que siempre salen los mismos tres o cuatro modelos (agenda §4.18): 32 en vez de los siete de hoy (`ittSegments === flatSegments`, mapa 01 §2.1). Por qué cada campo:

- `kind` y `finalKind` son PROMESAS, no etiquetas: V6 exige `stageKindOf(profile, timeTrial).kind === sk.kind` (`stageKind.ts` l. 71-95, umbrales `PASS_MIN_KM` 8,5 l. 62 y `WALL_MAX_KM` 3 l. 60 sin tocar, decisión 26) y V7 exige `finalKindOf(profile) === sk.finalKind` (`finalKind.ts` l. 78-85 con los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` l. 30). Un esqueleto que no puede cumplir su promesa se corrige en el catálogo, no en el clasificador.
- `ventana` es la fracción de la etapa donde el motivo EMPIEZA, medida desde la salida (arquitectura §3.3). La propuesta de datos anclaba los huecos desde la meta; aquí lo que se ancla desde la meta es solo el final, y lo hace el motivo `meta` con `cotaFinal` y el rango de valle de cada `MetaKind` (`ARCH.meta.*.valle`), que es donde la identidad de una etapa real se decide (mapa 07 §4.3).
- `dPlus` es el desnivel TOTAL, relleno incluido (decisión 9): es lo que `calendarQueens.ts::desnivelDe` (l. 54) mide y lo que `calendarQueens.test.ts` acota, así que el objetivo se persigue sobre esa misma cifra y no sobre la suma de dificultades.
- `km` es el rango bruto; la clase lo recorta con `ARCH.km.porClase` y `ARCH.km.maxPorClase` (sección 7). La propuesta ganadora usaba un factor multiplicativo; la tabla lo sustituye (decisión 36).
- `requiere` es un `Partial<GeoSignature>` que se compara con la firma de la zona mediante `admite()` (sección 6): `{ adoquin: 2 }` exige `geo.adoquin ≥ 2`, `{ sterrato: true }` exige `sterrato`, `{ finalesAlto: 'largo' }` exige exactamente ese valor, y un campo que en la zona es `null` (por ejemplo `puerto`) hace indisponible cualquier esqueleto que tenga un `Slot` de ese motivo con `n[0] ≥ 1`.
- `pesoBase` existe porque el juez de ejecutabilidad señaló que la ganadora dejó los pesos base del catálogo sin escribir (`juicios/ejecutabilidad.md` §4); los valores van en la tabla de la sección 5 y se multiplican por `GeoSignature.pesos` y por `ARCH.pesoPorClase`.
- `canonico` es un `Motif[]` literal por esqueleto, escrito a mano y comprobado en `skeletons.test.ts` contra los 16 vetos: es la plantilla a la que cae `generateStage` tras `ARCH.colocacion.maxIntentos` 8 (con `degradado: true`, y cero veces en el calendario por `ARCH.veto.fallbackMaxShare.calendario` 0).
- `alternativas` es la rotación declarada de `ARCH.edicion.nivel` 2 (decisión 22): la edición elige `alternativas[season % n]` en vez de `canonico` como punto de partida. Solo la tienen los esqueletos que la sección 5 lista (`ud_montana` con Como y Bérgamo; `et_reina_alto_largo` con dos metas).

El tipo entero es serializable (solo literales, arrays y strings, sin funciones): es la propiedad que permite congelar las tres reinas de `REAL_QUEENS` como `Skeleton` literal en `sim/frozenSkeletons.ts` y renderizarlas con el renderizador nuevo (decisión 33), en vez de congelar `Segment[]`.

### 3.4 Geografía (`routes/grammar/geo.ts`)

```ts
// packages/engine/src/routes/grammar/geo.ts
export type GeoZone =
  | 'flandes'
  | 'ardenas'
  | 'bretana'
  | 'francia_norte'
  | 'macizo_central'
  | 'alpes'
  | 'pirineos'
  | 'provenza'
  | 'italia_norte'
  | 'italia_centro'
  | 'dolomitas'
  | 'italia_sur'
  | 'cantabrico'
  | 'meseta'
  | 'andalucia'
  | 'levante'
  | 'portugal'
  | 'centroeuropa'
  | 'escandinavia'
  | 'britanicas'
  | 'balcanes'
  | 'anatolia'
  | 'andes'
  | 'cono_sur'
  | 'norteamerica'
  | 'australia'
  | 'asia_oriental'
  | 'golfo'
  | 'africa_llana'
  | 'generico'

export type Relieve = 'llano' | 'ondulado' | 'media' | 'montana' | 'alta'

/** `null` significa «aquí no existe» y los vetos V1 a V4 lo hacen cumplir. */
export interface GeoSignature {
  zona: GeoZone
  relieve: Relieve
  puerto: { km: [number, number]; g: [number, number]; forma: Motif['forma'] } | null
  cota: { km: [number, number]; g: [number, number] } | null
  muro: { km: [number, number]; g: [number, number]; adoquin: boolean } | null
  adoquin: 0 | 1 | 2 | 3 // 0 ninguno · 1 urbano · 2 sectores · 3 masivo
  sterrato: boolean
  viento: 0 | 1 | 2 | 3 // METADATO: no llega al motor (mapa 03 §5.1)
  altitud: 'mar' | 'colina' | 'media' | 'alta' | 'altiplano' // METADATO y veto V4; no hay altitud en `Segment`
  amplitud: number // ondulación del `enlace`, en % (tope ARCH.motivo.enlace.ampMax 2,4)
  finalesAlto: 'ninguno' | 'corto' | 'largo'
  pesos: Partial<Record<SkeletonId, number>> // multiplican `Skeleton.pesoBase`
}

export interface Territorio {
  ruta: readonly { zona: GeoZone; peso: number }[] // orden = recorrido plausible por el país
  cordillera: GeoZone | null // null = el país no tiene reina
  fallback?: boolean // país sin tabla: territorio genérico, contado en test
}

export const ZONAS: Record<GeoZone, GeoSignature>
export const TERRITORIOS: Record<string, Territorio> // ISO alpha-2, los 56 países con equipos explícitos
export function zonaDe(country: string): GeoZone // primera zona de la ruta por peso; `generico` si fallback
```

La firma de una zona dice qué existe y qué no, y la palabra para lo segundo es `null`, no un rango vacío ni un peso cero: `puerto: null` en `flandes` hace que ningún esqueleto con un `Slot` de `puerto` obligatorio esté disponible allí (V1), `cota: null` en el pólder y el desierto quita hasta la media montaña, y `muro: null` en `golfo` impide un `ud_muros` en Emiratos. La propuesta ganadora dejaba `cota` no anulable; la de geografía anulaba `cota`, `muro` y `puerto`, y esa es la forma que se toma, porque un pólder no tiene cotas de 2,5 km y decirlo con `null` es más honesto que con `[2,5; 2,5]`. `degradar()` va siempre hacia abajo (`montana → media → ondulado → llano`): una reina pedida en `flandes` sale `media_alto` y se anota, nunca al revés.

`amplitud` sustituye el `bumpy ? 3.2 : 1.8` literal de `rolling` (`profileGen.ts` l. 105) por un número de la zona, con tope `ARCH.motivo.enlace.ampMax` 2,4 para que el relleno nunca alcance el 3 % que `deriveFinishTerrain` lee como cota (`STAGE.finishClimbMinGradient` 3, `constants.ts` l. 3977); el pólder va en [0,4; 0,9]. `viento` y `altitud` son metadatos: `altitud` además veta (V4: `alto_largo` solo con `finalesAlto: 'largo'`, ningún puerto ≥ 15 km fuera de `media`, `alta` o `altiplano`), pero ninguno de los dos toca un `Segment`. `pesos` multiplica `Skeleton.pesoBase` y es donde la zona expresa lo que existe más o menos (Flandes sube `ud_muros` y `ud_muros_adoquin`; los Alpes suben `et_reina_alto_largo`).

`Territorio` es la forma en que un país entra en una vuelta (sección 7): `ruta` es una lista ORDENADA de zonas con peso, que un itinerario recorre como ventana contigua, y `cordillera` es la zona donde puede caer la reina, o `null` si el país no la tiene (Bélgica, Países Bajos, Dinamarca, Golfo, Australia: decisión D8, sección 18). `fallback: true` marca los 77 países de `COUNTRIES` sin fila propia, que reciben el territorio genérico y se cuentan en `geo.test.ts`; ninguna de las 310 carreras de equipos puede caer ahí (decisión 13). `zonaDe(country)` devuelve la zona de mayor peso de la ruta y es la última red de `regionOf` (§3.5): solo los 532 nacionales pasan por ella.

### 3.5 Regiones por carrera y por etapa (`routes/grammar/regions.ts`)

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>
} // stages: índice con base 1
export const RACE_REGION: Record<string, RaceRegion> // 310 carreras de equipos, curadas desde raceRoutes.ts
export function regionOf(raceId: string, stageIndex: number, country: string): GeoZone
// = RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
// Test: ninguna carrera de equipos cae a zonaDe(country); solo los 532 .NC pasan por ahí.
```

`RaceRow` (`calendar.ts` l. 381-398) no cambia. La propuesta ganadora añadía `geo?: GeoZone` a la fila y sorteaba la zona con `geo|${raceId}` cuando faltaba, para los 125 de 310 casos de FR, IT y ES; la síntesis retira el sorteo (decisión 14) porque una carrera no cambia de cordillera según la semilla, y saca la zona a una tabla aparte, curada a mano desde las ciudades de `raceRoutes.ts`, con dos niveles: `default` para la carrera y `stages` para las etapas de las 60 ediciones reales, donde el país es grueso de más (`race-france` e6 Pau → Gavarnie-Gèdre es `pirineos`, e15/18/19/20 son `alpes`; el resto de etapas caen a `default`). El índice de `stages` es el mismo `CalendarStage.index` con base 1 (`calendar.ts` l. 43-44) y el mismo orden de `RaceEdition.stages` (`editions.ts` l. 17-22). `regionOf` es una cadena de tres `??` y nada más; `regions.test.ts` sella que para todo `id` de `PRO_TABLE` y `CON_TABLE` el tercer eslabón no se alcanza.

### 3.6 Composición de una vuelta (`routes/grammar/tour.ts`)

```ts
// packages/engine/src/routes/grammar/tour.ts
export type StageRole =
  | 'llana'
  | 'llana_viento'
  | 'media'
  | 'media_alto'
  | 'media_muro'
  | 'reina_alto'
  | 'reina_valle'
  | 'reina_encadenada'
  | 'montana_corta'
  | 'cri'
  | 'prologo'
  | 'cronoescalada'

export type TourSkeletonId = 'vu_corta' | 'vu_semana' | 'vu_larga' | 'vu_gran_vuelta'

export interface BlockRule {
  id: string // 'reinaTarde', 'bloqueMontana', 'llanasEntreBloques', 'maxCronos', 'maxFinalesAlto', 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[] // determinista, de atrás hacia delante
}
export type Weighted<T extends string> = Partial<Record<T, number>>

export interface TourSkeleton {
  id: TourSkeletonId
  n: [number, number]
  bloques: BlockRule[]
  primera: Weighted<StageRole>
  ultima: Weighted<StageRole> | 'ROUTE.lastDecisiveChance'
  pesos: Record<Relieve, Weighted<StageRole>> // ARCH.pesosComposicion
}

export interface Itinerario {
  metas: GeoZone[]
  papeles: StageRole[]
  km: number[]
  desde: GeoZone[]
}
export function itinerarioDe(
  raceId: string,
  country: string,
  n: number,
  terrain: RouteTerrain,
  raceClass: RaceClass,
  format: RaceFormat,
): Itinerario // subflujo `arch|raceId`, sin season
export function composeTour(
  n: number,
  terrain: RouteTerrain,
  seedBase: string,
  ctx: RouteContext,
): StageSpec[]
export function kmDe(
  role: StageRole | 'un_dia',
  raceClass: RaceClass,
  last: boolean,
  rand: () => number,
): number
```

`StageRole` amplía el `MixRole` de hoy (`calendar.ts` l. 410-561 vía mapa 02 §4: `cri`, `reina`, `media-alto`, `media`, `llana`) con los papeles que la carretera tiene y el generador no (`llana_viento`, `media_muro`, `reina_valle`, `reina_encadenada`, `montana_corta`, `prologo`, `cronoescalada`). El papel de cada etapa es IDENTIDAD (decisión 20): lo decide `itinerarioDe` en el subflujo `arch|raceId` sin `season`, y la edición no lo mueve.

El juez del motor objetó que `Weighted<StageRole>` y `BlockRule` estaban sin definir en la ganadora; aquí lo están. `Weighted<T>` es un mapa parcial de pesos relativos (no tienen que sumar 1: se normalizan al sortear, y una clave ausente pesa 0). `BlockRule` es una reparación determinista: `aplica(n)` dice si la regla se evalúa para una vuelta de `n` etapas, y `repara` recibe los papeles ya sorteados y las zonas de meta del itinerario y devuelve los papeles corregidos, recorriendo de atrás hacia delante para que la última etapa (la que `ROUTE.lastDecisiveChance` decide) no se toque. `ultima` admite el literal `'ROUTE.lastDecisiveChance'` como centinela: significa que la última etapa se sortea con la regla que `mixRoles` ya tiene hoy (`calendar.ts` l. 457-519, garantía de última decisiva), en vez de con pesos propios; es lo que conserva `calendar.test.ts` l. 184-246 sin tocar. `pesos` está indexado por `Relieve` y no por el `MixTerrain` de hoy (`flat | hilly | mountain`, l. 410), que desaparece: `ARCH.pesosComposicion` sustituye a `ROUTE.mixWeights`.

`Itinerario` lleva cuatro listas paralelas de longitud `n`: la zona de meta de cada etapa, su papel, sus km (ya por clase, con `kmDe`) y la zona de salida (`desde`, que difiere de `metas[i]` en las etapas de transición y es la que `StageRequest.desde` recibe). `composeTour` es lo que `stageMix` hace hoy por dentro; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva su firma pública (`calendar.ts` l. 546) y delega en él (decisión 19), para que `calendar.test.ts` l. 184-277 y `stageKind.test.ts` compilen en todos los pasos del plan.

### 3.7 Petición y salida de `generateStage` (`routes/grammar/generate.ts`)

```ts
// packages/engine/src/routes/grammar/generate.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // por ETAPA; por carrera: 'real' | 'mixto' | 'generado'

/** Lo que `stageMix` y `composeTour` saben de la carrera; `StageRequest` lo extiende por etapa. */
export interface RouteContext {
  country: string // ISO alpha-2; '' cae a `TERRITORIOS` genérico (fallback)
  raceClass: RaceClass
  format: RaceFormat
  season: number
  routeSource: 'edicion' | 'generado'
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: '',
  raceClass: '2',
  format: 'una-semana',
  season: BASE_SEASON,
  routeSource: 'generado',
}

export interface StageRequest {
  raceId: string
  stageIndex: number // con base 1; 1 en un día
  season: number // BASE_SEASON = 0 es la canónica y tira sus propios dados
  km: number // contrato al 0,1 (calendar.test.ts l. 162-174) si viene de edición
  role: StageRole | 'un_dia'
  terrain: RouteTerrain // sesgo, nunca orden
  geo: GeoSignature // ZONAS[regionOf(...)]
  desde?: GeoZone // etapa de transición (40 % con la ondulación de `desde`)
  raceClass: RaceClass
  format: RaceFormat
  routeSource: 'edicion' | 'generado'
  editionKey?: string // `${from}|${to}|${km}` de editions.ts, para la semilla de edición
  fixed?: { skeleton?: SkeletonId; finalKind?: FinalKind; dPlus?: number } // bancos
}

export interface GeneratedStage {
  profile: StageProfile
  kind: StageKind // = stageKindOf(profile, timeTrial).kind, garantizado por V6
  label: string // = stageKindOf(...).label
  timeTrial?: boolean
  arch: {
    skeleton: SkeletonId
    geo: GeoZone
    motivos: Motif[]
    finalKind: FinalKind | null
    dPlus: number // dPlusDe(profile), relleno incluido
    intentos: number
    degradado: boolean
    frase: string // «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro»
    metadatos: { viento: 0 | 1 | 2 | 3; altitud: GeoSignature['altitud'] } // ficha, no física
  }
  routeSource: 'edicion' | 'generado'
}

export function generateStage(req: StageRequest): GeneratedStage
```

`StageRequest` es todo lo que el generador sabe de la etapa, y es la lista de lo que hoy no le llega: el generador actual recibe `km` y `seed` (`flatSegments(km, seed)` y hermanos, `profileGen.ts` l. 236-514) y ni siquiera el país que `buildRace` calcula en l. 889 (mapa 02 §1, diagnóstico de la sección 1). Por qué cada campo:

- `km` es un CONTRATO cuando `routeSource` es `edicion`: `calendar.test.ts` l. 162-174 exige que la distancia de una etapa de edición real coincida al 0,1 con la fila de `editions.ts`, y por eso `ARCH.edicion.kmJitter` no se aplica a esas etapas (decisión 20).
- `terrain` es el `RouteTerrain` de la fila (`featureProfile.ts` l. 21: `flat | hilly | mountain | cobbles | classic | itt`) y entra como sesgo de pesos, nunca como orden: un `terrain: 'mountain'` en `flandes` no produce una reina, produce `media_alto` anotado.
- `geo` es la firma ya resuelta (`ZONAS[regionOf(raceId, stageIndex, country)]`) y no la clave, para que `generateStage` sea pura y un banco pueda pasarle una firma sintética.
- `desde` solo va en etapas de transición de una vuelta (sección 7) y da la ondulación del primer 40 % (`ARCH.itinerario.transicion`).
- `editionKey` es la respuesta al defecto del mapa 02 §7: hoy dos carreras con la misma salida, meta y km dibujan lo mismo porque la semilla de edición es `${from}|${to}|${km}` sin `raceId`. La semilla nueva es `raceId|e{i}|{editionKey}` (decisión 22), separada de la de identidad.
- `fixed` es para los bancos (sección 13): `fixed.skeleton` fuerza el esqueleto (galería y `stageKind.test.ts` por esqueleto), `fixed.finalKind` y `fixed.dPlus` acotan lo que `calendarQueens` estratifica. En el calendario nunca va.

`GeneratedStage.kind` y `label` no son campos que el generador rellene a su criterio: son el resultado de `stageKindOf(profile, timeTrial)` (`stageKind.ts` l. 71, con la etiqueta `Summit finish` decidida por `SUMMIT_RUN_IN_KM` 5, decisión 23) y V6 lo garantiza; `arch` es lo que la ficha enseña y el banco mide, y `frase` es la única descripción textual (decisión 39, D10). `metadatos` lleva `viento` y `altitud` de la firma para el texto de la ficha, que dice llano abierto y nunca promete abanicos (decisión 17).

`RouteContext` es el subconjunto de `StageRequest` que se conoce a nivel de carrera; `DEFAULT_ROUTE_CONTEXT` existe para que `stageMix(n, terrain, seedBase)` siga compilando con tres argumentos entre el paso 1 y el 8 del plan, y produce una vuelta `.2` de `una-semana` en el territorio genérico con la temporada canónica.

### 3.8 Temporada e identidad (`routes/grammar/edition.ts`)

```ts
// packages/engine/src/routes/grammar/edition.ts
export const BASE_SEASON = 0 // calendarRun.ts l. 135: season = floor(gameDay / SEASON_DAYS)
export function calendarForSeason(season: number): CalendarRace[] // memoizada por season
export function raceForSeason(raceId: string, season: number): CalendarRace
export function stagesForSeason(raceId: string, season: number): CalendarStage[]
// Subflujos: `arch|raceId`, `firma|raceId` (sin season); `ed|raceId|season`; `mot|raceId|i|season|slot|j|i{intento}`,
// `pos|raceId|i|season|i{intento}`, `dib|raceId|i|season|slot|i{intento}`. Etapa de edición: raceId|e{i}|{editionKey} en lugar de raceId|i.
```

`BASE_SEASON` vale 0 porque es lo que el mundo calcula: `calendarRun.ts` l. 135 hace `season = Math.floor(gameDay / SEASON_DAYS)`, y el primer día de un mundo es la temporada 0. La propuesta de banco proponía `calendarFor(1)` y la de geografía dejaba la pregunta abierta; la síntesis cierra que `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` y que la temporada 0 tira sus propios dados con `ed|raceId|0` como cualquier otra (decisión 21), corrigiendo la objeción del juez de ejecutabilidad a la mediana de cardinalidades. Los tres subflujos sin `season` (`arch`, `firma`) son la identidad; los tres con `season` son la edición; el sufijo `i{intento}` solo existe en `mot`, `pos` y `dib` (sección 8). Las tres funciones se memoizan (sección 14) y son la ÚNICA puerta por la que `calendarRun.ts`, `callups.ts` y `raceContext.ts` leen una etapa no congelada (decisión 23).

### 3.9 Vetos (`routes/grammar/veto.ts`)

```ts
// packages/engine/src/routes/grammar/veto.ts
export type VetoId =
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'V13'
  | 'V14'
  | 'V15'
  | 'V16'
export interface Veto {
  id: VetoId
  detalle: string
}
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null
// Solo lee routes/ (stageKindOf, finalKindOf, climbSize, dPlusDe) y geometría del esqueleto. NUNCA sampleProfile,
// finishType ni costBase (regla del juez del motor, riesgo 3): eso se mide en routeCensus.
```

`verify` devuelve el primer veto que falla, con `detalle` para el test y la galería, o `null`. La firma recibe las cuatro cosas que un veto puede necesitar (el perfil rendido, el esqueleto elegido, la petición y los motivos instanciados) y nada del motor: la regla de vetos puros (decisión 4) es que `verify` importe solo de `routes/` y de `grammar/geometry.ts`, y el test `veto.test.ts` lo comprueba con un `grep` de imports. La consecuencia es la que el juez del motor pidió: recalibrar `STAGE.finish*` o `physics.ts` no redibuja ningún perfil. De los dieciséis, V1 a V10 y V15 se evalúan por etapa y disparan reintento; V11 a V14 y V16 son de calendario o de vuelta y se miden en `routeCensus` y `tour.test.ts` (tabla completa en la sección 9).

### 3.10 El censo (`sim/routeCensus.ts`)

```ts
// packages/engine/src/sim/routeCensus.ts
export interface RouteStats {
  raceId: string
  stageIndex: number
  raceClass: RaceClass
  format: RaceFormat
  country: string
  zona: GeoZone | null
  skeleton: SkeletonId | null
  routeSource: RouteSource
  kind: StageKind
  label: string
  finalKind: FinalKind | null
  finishType: FinishType // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number
  dPlus: number
  dPlusBloques: number // dPlusDe y calendarQueens::desnivelDe, para ver el delta
  nPuertos: number
  nMuros: number
  longestClimbKm: number
  lastClimbKm: number | null
  lastClimbG: number | null
  kmAfterLastClimb: number | null
  climbKmOutsideLast30: number
  kmSubidaShare: number
  breakAppealEstimado: number
  pavesKm: number
  nSectores: number
  estrellas5: number
  maxG: number
  huella: number[] // g por km
  intentos: number
  degradado: boolean
}

/** Resumen de un grupo de filas: cuantiles de las columnas numéricas y reparto de las categóricas. */
export interface Summary {
  n: number
  cuantiles: Partial<
    Record<keyof RouteStats, { p10: number; p50: number; p90: number; min: number; max: number }>
  >
  reparto: Partial<Record<keyof RouteStats, Record<string, number>>> // fracción por valor (kind, finalKind, finishType, skeleton, zona)
}

export function routeCensus(calendar?: CalendarRace[]): RouteStats[]
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>
```

`RouteStats` es una fila por etapa del calendario que el juego corre (1.418 hoy), y es el único sitio del diseño donde se llama a `sampleProfile`, `deriveFinishTerrain` y `finishType` (con `groupSize` 50, `finish.ts` l. 142): por eso `zona` y `skeleton` admiten `null` (las 177 etapas `real` no tienen esqueleto) y por eso lleva `dPlus` y `dPlusBloques` a la vez, para imprimir el delta entre la integración por tramos de `dPlusDe` y la de bloques de `calendarQueens::desnivelDe` (esperado < 5 %, decisión 9). `huella` es la pendiente media por km y alimenta la correlación de V12. `Summary` es lo que `aggregate` devuelve por grupo (`by` suele ser `r => r.skeleton ?? 'real'` o `r => r.raceClass`), y es la forma de las bandas de `ROUTE_CENSUS_TARGETS` de la sección 13: cada banda se escribe sobre un cuantil o sobre una fracción de reparto. Coste medido: 0,57 s sobre las 1.418 etapas (juez del motor §1), de ahí que corra en `test:rapido` (decisión 31).

### 3.11 Lo que ganan `StageSpec`, `CalendarStage`, `CalendarRace` y `race_routes`

```ts
// packages/engine/src/routes/calendar.ts (hoy l. 33-46)
export interface StageSpec {
  kind: StageKind
  label: string
  profile: StageProfile
  timeTrial?: boolean
  routeSource: RouteSource // NUEVO: 'real' | 'edicion' | 'generado'
  arch?: GeneratedStage['arch'] // NUEVO: solo cuando routeSource !== 'real'
}
export interface CalendarStage extends StageSpec {
  index: number
  name: string
} // sin cambios

export interface CalendarRace {
  // ...los campos de hoy (l. 48-79) sin cambios: id, name, level, raceClass, format, startDay, openTo,
  // region?, championshipCountry?, championshipCategory?, country?, stages, restAfter?
  routeSource: 'real' | 'mixto' | 'generado' // NUEVO: agregado de sus etapas
}
```

```ts
// packages/db/src/raceRoutes.ts (hoy l. 29: `'real' | 'generado'`)
export type RouteSource = 'real' | 'edicion' | 'generado'
export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void>
// escribe, por etapa: profile, route_source, kind, label, time_trial (migración 00NN_race_routes_kind.sql)
```

`routeSource` por etapa toma tres valores porque hay tres ramas en `buildRace` (sección 11): rasgos reales en `STAGE_FEATURES` dan `real`; una etapa de `RACE_EDITIONS` sin rasgos (ciudades y km reales, relieve generado) da `edicion`; tabla y nacionales dan `generado`. Hoy `freezeRaceRoute` escribe `'generado'` a ciegas (`db/raceRoutes.ts` l. 47-50, con el comentario que lo reconoce) y el tipo de l. 29 es binario; pasa a copiar `stage.routeSource`. La columna `route_source` es `text` (`schema.ts` l. 523), así que el tercer valor no necesita migración; `kind`, `label` y `time_trial` sí (columnas nuevas), y `freezeRaceRoute` gana `season` porque el recorrido que se congela es el de `stagesForSeason(raceId, season)` y no el de `SEASON_CALENDAR` (decisión 23). `arch` NO se congela: `race_routes.profile` sigue siendo exactamente el `StageProfile` que el motor recibe (comentario de `schema.ts` l. 509), y la ficha de una etapa generada recompone `arch` llamando a `stagesForSeason(raceId, season)`, que es determinista y memoizada, con el `season` de la `raceKey` (`calendarRun.ts` l. 783: `${race.id}:s${season}`).

El agregado por carrera sigue la regla de I-40 traducida: `real` si todas sus etapas son `real`, `generado` si todas son `generado`, `mixto` en cualquier otro caso (una gran vuelta con 18 etapas de edición y 3 con rasgos es `mixto`). Es un valor de carrera, nunca de etapa: por eso `RouteSource` de etapa no lo incluye y `scripts/inventario-recorridos.mjs` lo calcula desde las etapas. `RaceRow` (l. 381-398) no cambia: ni `geo` ni `paisaje` entran en la fila, porque la zona vive en `RACE_REGION` (§3.5) y el km de las 142 carreras de un día sin `km` explícito lo sortea `kmDe` con `firma|raceId` (decisión 36).

Un test corto fija las dos reglas de esta subsección en `routes/calendario.test.ts`:

```ts
it('routeSource de carrera es el agregado de sus etapas', () => {
  for (const race of calendarForSeason(BASE_SEASON)) {
    const set = new Set(race.stages.map((s) => s.routeSource))
    const esperado = set.size > 1 ? 'mixto' : set.has('real') ? 'real' : 'generado'
    expect(race.routeSource).toBe(esperado)
    for (const s of race.stages) {
      if (s.routeSource === 'real') expect(s.arch).toBeUndefined()
      else expect(s.arch?.skeleton).toBeDefined()
    }
  }
})
```

### 3.12 Nota al pie: cómo leer las propuestas con estos nombres

Quien venga de las cinco propuestas encontrará otros nombres para las mismas cosas; la tabla completa está en el apéndice A. Las traducciones que más se usan al leer esta sección: `Motivo` y la unión discriminada `Motif` de banco e ingeniero son `Motif`; `RouteBrief`/`ArchetypeId`, `Esqueleto`/`Arquitectura`, `Skeleton`/`FamilyId` y `Archetype`/`ArchFamily` son `Skeleton`/`SkeletonId`; `GeoKey`/`RouteGeo`, `Paisaje`/`PaisajeSpec` y `RegionId` son `GeoZone`/`GeoSignature`; `RACE_GEO`, `RACE_GEO_OVERRIDE`, `RaceRow.paisaje` y `RaceRow.geo` son `RACE_REGION`; `Papel` y `MixRole` son `StageRole`; `RouteRequest`, `ContextoEtapa` y `GenInput` son `StageRequest`; `brief`, `paisaje` + `arquitectura`, `skeleton` y `RouteMeta` son `GeneratedStage.arch`; `source` y `origen` son `routeSource`, con el `mixto` de datos solo como agregado de carrera; `desnivelDe` y `climbMetres` son `dPlusDe`; y los V de cada propuesta se renumeran a los V1 a V16 de la sección 9 (V5 es el V1 de banco, geografía, ingeniero y datos; V8 reúne V6 + V8 de banco y V2 de geografía, ingeniero y datos).

---

## 4. La gramática de motivos completa

Un motivo es una pieza de carretera con significado ciclista: un puerto, un muro, un sector de adoquín, el llano que los separa, la meta. La sección 3 dio los tipos (`Motif`, `MotifKind`, `MetaKind` en `packages/engine/src/routes/grammar/motifs.ts`); esta sección dice, motivo a motivo, cuatro cosas que un implementador necesita y que ninguna propuesta escribió juntas: el rango (en `ARCH.motivo` y `ARCH.meta`, sección 12), cómo se rinde a `Segment[]` con las primitivas de `profileGen.ts`, qué lee de él el motor (mapa 03 §3 y §4, con línea) y qué carrera real lo motiva (mapa 07 §1 y §4.3). Cierra con `validateMotif` y `renderMotif` y sus tests, con los tres bordes sin holgura del diagnóstico (sección 1) y con la lista de lo que la gramática no produce nunca. Cómo se colocan y se cuadran los motivos es la sección 8; qué los veta, la 9.

Doce `MotifKind` en tres familias: cuatro enlaces (`enlace`, `expuesto`, `tendida`, `descenso`), siete dificultades (`cota`, `puerto`, `muro`, `cadena`, `sector`, `racimo`, `circuito`) y `meta`, que siempre es el último motivo del esqueleto y lleva uno de los nueve `MetaKind`.

### 4.1 Las primitivas sobre las que se rinde todo

`profileGen.ts` queda reducido a sus primitivas exportadas (§B.1, paso 1 del plan, sección 15). Son las mismas funciones que hoy dibujan bien (mapa 01 §1: «el llano ondula, cada puerto se parte en rampas de pendiente variable»), con tres cambios de firma decididos (decisión 11):

| Primitiva                                          | Líneas hoy (mapa 01 §1)       | Qué hace                                                                                                                                                         | Qué cambia en E1                                                                                                                                                                  |
| -------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hashInt(s)`, `routeRng(seed)`                     | 15-22, 30-44                  | FNV-1a y mulberry32; una secuencia por cadena de semilla                                                                                                         | nada; todos los subflujos de la gramática (`arch`, `firma`, `ed`, `mot`, `pos`, `dib`) pasan por `routeRng`                                                                       |
| `between(rand, min, max)`, `split(rand, total, n)` | 47-49, 52-65                  | uniforme en `[min, max)`; reparto con pesos `U(0,7; 1,3)`, redondeo a 0,1, mínimo 0,5 km por trozo                                                               | nada                                                                                                                                                                              |
| `climb(rand, len, avg, opts?)`                     | 72-82                         | UN `puerto` de `len` km en `max(2, round(len / 2,2))` rampas a `max(1, avg + prog·1,6 + U(−1,2; 1,2))`, con `prog` de −1 al pie a +1 en la cima: más dura arriba | gana `opts.gMax`: cada rampa se recorta a `min(gMax, …)`. Sin `opts` se comporta como hoy (el golden de 1.418 del paso 1 lo exige)                                                |
| `descent(rand, len, avg)`                          | 85-93                         | UN `descenso` en `max(2, round(len / 3))` rampas a `−max(2, avg + U(−1,5; 1,5))`                                                                                 | nada; el suelo de −2 % se conserva                                                                                                                                                |
| `rolling(rand, km, amp, pRompepiernas = 0)`        | 100-122                       | relleno en trozos de `U(3, 6)` km que suben la primera mitad a `U(0,8; amp)` y bajan la segunda a entre el 60 y el 100 % de eso, alternando por paridad          | `amp` pasa de `bumpy: boolean` a número (`false` era 1,8 y `true` 3,2, ingeniero §4.4) y `pRompepiernas` vale 0 por defecto: la gramática nunca emite `rompepiernas` (decisión 2) |
| sector literal                                     | como `cobblesSegments` l. 503 | `{ km, tipo: 'paves', estrellas }` sin tramos (pendiente 0)                                                                                                      | se emite desde `renderMotif`, no desde una función propia                                                                                                                         |

Una regla de tipado atraviesa todo el rendido y la fija `datos.md` §3.3 (resuelve R28.1(c) del mapa 05 §9): **todo lo que quiere contar como subida en la táctica se escribe `puerto`**, porque `kmSubida`, `breakAppeal`, `gcTerrain` y `shortMountain` cuentan bloques por tipo y no por pendiente (`simulate.ts` l. 1696-1719, mapa 03 §4.1); lo que sube y no debe contar (la `tendida`, el relleno) se escribe `llano` con tramos, que la física sí lee por `g` (`sample.ts` l. 32-44 y 50-54). Y el relleno tiene la amplitud topada en `ARCH.motivo.enlace.ampMax` 2,4 para que ningún tramo suyo alcance el 3 % que `deriveFinishTerrain` funde en una racha de subida (`finishClimbMinGradient` 3, `constants.ts` l. 3977; juicio motor §1): hoy `rolling` en modo `bumpy` llega a 3,2 (l. 105) y por eso un muro de meta podía salir `puncheur` o `alto`.

Cada `cota`, `puerto` y `muro` se rinde como UN solo `Segment` de tipo `puerto`. Importa por dos lecturas del motor: `climbSize` (`stageKind.ts` l. 36-42) suma los tramos con `g > 0` del segmento, y `deriveClimbCategory` (`sample.ts` l. 131-143) puntúa `Σ km·g²` sobre los tramos del segmento que contiene la pancarta, no del puerto entero si estuviera partido (mapa 03 §2). Un puerto en un segmento se mide y se categoriza entero.

### 4.2 Los doce `MotifKind`, uno a uno

La tabla resume; los párrafos que siguen dan el detalle por familia. Los rangos son los de `ARCH` (§B.3, sección 12); «lo que lee el motor» sale del mapa 03 §3 (`physics.ts`) y §4 (`simulate.ts`).

| Motivo     | `km`                                 | `g` (%)                    | Rinde como                                                                                                | Lo que lee el motor                                                                                                                                                                          | Caso real (mapa 07)                                                                    |
| ---------- | ------------------------------------ | -------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `enlace`   | [1; 60]                              | amp = `geo.amplitud` ≤ 2,4 | `rolling(rand, km, geo.amplitud, 0)`: `llano` con tramos                                                  | `vRef` 42 km/h, `draftMax` 0,42, `selectionFactor` 0 (l. 517); único terreno del abanico y el acordeón (l. 1215, 3898)                                                                       | el llano entre cotas de cualquier carrera                                              |
| `expuesto` | [5; 60]                              | amp 1,0 fija               | `rolling(rand, km, 1,0, 0)`                                                                               | idéntico a `enlace`: es metadato de ficha, no física                                                                                                                                         | Brugge-De Panne (~300 m de D+ en 200 km, §1.5), pólder, Crau, desierto del Golfo       |
| `tendida`  | [5; 30]                              | [1,5; 3,5]                 | UN `llano` con 2 a 4 tramos a `g ± 0,7`                                                                   | `costBase` 0,24 + 0,135·g (l. 239-249): a 2,5 % cuesta 2,4 veces el llano; no suma a `kmSubida`, no selecciona                                                                               | Feldberg 12 km al 4 % (§1.1), altiplano andino, meseta                                 |
| `descenso` | [2; 25]                              | [−8; −3]                   | `descent(rand, km,                                                                                        | g                                                                                                                                                                                            | )`                                                                                     | selecciona solo con `g ≤ −4` y solo su primer km, o entera a ≤ 25 km de meta (l. 2427, 5083-5089); caída 0,0018/km (`crash.ts` l. 25-36); coste con suelo 0,10 a `g ≤ −3` | Poggio, Civiglio, San Fermo |
| `cota`     | [2,5; 8,0]                           | [4; 7]                     | `climb(rand, km, g)` → `puerto`                                                                           | `subida`: `climbWeight`, deriva, `kmSubida`; pancarta cat3 o cat2                                                                                                                            | Rosier 4,4 × 5,9; Jaizkibel 7,9 × 5,6; Cipressa 5,6 × 4,1                              |
| `puerto`   | [9,0; 25]                            | [5; 9]                     | `climb(rand, km, g)`; con `forma: 'irregular'`, una rampa de [0,3; 0,8] km al [11; 13] %                  | `subida`; a ≤ 30 km de meta se sube a tope (`climbRaceKmToGo`, l. 2497); en la rampa ≥ 8 el perfil usa COL (l. 434); cat1 o HC                                                               | Alpe d'Huez 13,8 × 8,1; Tourmalet 17,1 × 7,3; Galibier 23 × 5,1                        |
| `muro`     | [0,4; 3,0]                           | [8; 16], `gMax` 16         | `climb(rand, km, g, { gMax: 16 })` con 2 rampas; adoquinado sigue siendo `puerto`                         | `subida` con COL en cada bloque `g ≥ 8` (`wallMinGradient`, `constants.ts` l. 1594); pancarta solo si ≥ 1,5 km o si es el último puerto                                                      | Paterberg 0,36 × 12,9; Koppenberg 0,6 × 11,6; Mur de Huy 1,3 × 9,6; Sormano 1,9 × 15,8 |
| `cadena`   | Σ hijos + enlaces de [1,5; 6] km     | (de los hijos)             | hijos `cota` o `muro` intercalados con `rolling` corto de `geo.amplitud`; sin bajada canónica entre ellos | n subidas sin valle; nada especial: el motor ve n segmentos `puerto` seguidos                                                                                                                | Ronde [16; 19] cotas, Amstel [33; 34], el tríptico final de Lieja (§1.3, §1.6)         |
| `sector`   | [0,3; 3,7]                           | 0                          | `{ km, tipo: 'paves', estrellas }`; `firme: 'tierra'` se rinde `paves` de 2 o 3★                          | `costBase` 0,55 + 0,06·★; `selectionFactor` 0,6·★/3·(1 + 0,5·lluvia); percances ×20 (l. 7094-7108); caída 0,0025/km; aproximación de 2 km (`pavesApproachKm`, l. 1628-1636); `draftMax` 0,18 | Arenberg 2,3 km 5★, Carrefour de l'Arbre 2,1 km, Roubaix 0,3 km (§1.4)                 |
| `racimo`   | [20; 60]                             |                            | [4; 10] sectores separados por `rolling` de [2; 6] km con amp 0,7                                         | lo mismo que `sector`, sin reagrupar entre uno y otro                                                                                                                                        | Roubaix: de 29 a 31 sectores en 3 a 6 racimos (§1.4)                                   |
| `circuito` | [8; 30] por vuelta × [3; 18] vueltas |                            | los hijos rendidos `vueltas` veces con la MISMA semilla de detalle                                        | n pasos por la misma cota; una pancarta por paso de cota ≥ 1,5 km                                                                                                                            | Québec 12,6 × 16; Montréal 12,3 × [17; 18]; Mundial [12; 27] × [7; 14] (§1.1)          |
| `meta`     | §4.3                                 |                            |                                                                                                           |                                                                                                                                                                                              |                                                                                        |

#### Enlaces: `enlace`, `expuesto`, `tendida`, `descenso`

**`enlace`** es el relleno de hoy con la amplitud puesta por la geografía y no por la función: `geo.amplitud` (columna de `GeoSignature`, sección 6) entra como `amp` de `rolling`. Dos consecuencias medidas. La primera: el relleno pesa. Una llana de 130 a 215 km acumula hoy de 661 a 1.413 m de desnivel positivo solo con `rolling` (mapa 01 §1), y una reina de 175 km suma 1.017 m de relleno sobre 2.840 m de puertos; por eso el objetivo de desnivel de un esqueleto incluye el relleno (decisión 9) y se persigue con `ARCH.reina.rellenoDplusPorKm` 5,5 m/km antes de dibujar. La segunda: el pólder belga y neerlandés lleva `amplitud` en [0,4; 0,9] (I-38, `geografia.md` §5), un cuarto de los 1,8 de hoy, y con eso una llana de Flandes baja a [300; 700] m, que es lo que Brugge-De Panne acumula (unos 300, mapa 07 §1.5). La ondulación de una llana del Macizo Central (2.500 a 3.500 m reales, mapa 07 §3.14) no sale del relleno sino de las `cota` que la zona pone en el esqueleto. El tope `ARCH.motivo.enlace.ampMax` 2,4 vale para toda zona: por encima, un tramo de relleno se convierte en cota a ojos de `deriveFinishTerrain`.

**`expuesto`** es un `enlace` con amplitud fija 1,0 (`ARCH.motivo.expuesto.amp`) y existe por dos razones que conviene no confundir. La honesta: hoy el viento es una propiedad de la etapa, no del perfil. `simulate.ts` sortea `rng('viento')` una vez y el abanico puede caer en cualquier bloque de tipo `llano` (mapa 03 §5.1; `docs/motor.md` l. 1317-1318: «cualquier kilómetro de llano puede ser el del corte»). Escribir `expuesto` no coloca el abanico ni lo hace más probable. La de diseño: el motivo queda en `arch.motivos` con `nombre` («llano abierto de 35 km») para que la ficha lo cuente sin prometer abanicos (decisión 17: nunca la palabra «abanicos» en el texto generado) y para que un motor futuro con exposición por tramo lo lea sin tocar la gramática. Un esqueleto pide `expuesto` solo en zonas con `viento ≥ 2` (`et_llana_viento`, `ud_esprint`; sección 5).

**`tendida`** es la subida larga y suave que en carretera desgasta sin seleccionar: los 20 km al 2,5 % de un altiplano, el Feldberg de Frankfurt (12 km al 4 %). Se rinde como UN `llano` con 2 a 4 tramos a `g ± 0,7` y esa tipificación es una decisión, no un descuido (`ARCH.motivo.tendida`, arquitectura §13.5): tipada `puerto` contaría en `kmSubida` y en `breakAppeal` (`clamp(4·kmSubida/total + 0,35·[alto], 0, 1)`, l. 1696-1702) como si fuera un puerto de 20 km, y una vuelta de meseta saldría «de montaña» para la fuga y para `gcTerrain` (l. 1710). Tipada `llano`, cuesta lo que dice su pendiente (`costBase` 0,24 + 0,135·g: 0,58 por bloque al 2,5 % contra 0,24 en llano) y no selecciona (`selectionFactor('llano')` = 0 con cualquier `g`, l. 517). Si el motor gana tipado por pendiente (táctica R28.1(c)), la `tendida` se retipa en `renderMotif` y nada más cambia.

**`descenso`** es la bajada declarada en el esqueleto (la del Poggio, la de Civiglio, la de una `meta` de tipo `cima_cerca`). No hay que confundirla con la bajada canónica que el rendido añade tras cada `puerto` y cada `cota` que no sea de meta (sección 8): esa no es un motivo, es `ARCH.motivo.descenso.kmPorDesnivel`, `clamp(len·g·10 / 55, 2, 10)` km, la regla de `mountainClassicSegments` l. 467 que pierde el 85 % de lo subido a unos 5,5 % (I-43; hoy la reina usa `U(5, 8)` fijo, mapa 01 §2.5). Con ella, tras un Alpe d'Huez (13,8 × 8,1) se bajan 10 km (tope) y tras una cota de 5 km al 5,5 % se bajan 5,0. Lo que el motor hace con una bajada es poco y conviene tenerlo delante: selecciona solo si `g ≤ −4` (`constants.ts` l. 2784) y solo en su primer km (`descentSelectKm` 1), o entera si la meta está a ≤ 25 km (`placement.descentFinalKmToGo`); a −3 % es coste barato (suelo 0,10) y nada más (mapa 03 §10.5). La gramática no promete que una bajada seleccione: promete dónde está y cuánto mide.

#### Dificultades: `cota`, `puerto`, `muro`

**`cota` y `puerto`** se separan en el 8,5 km de `PASS_MIN_KM` (`stageKind.ts` l. 62) con medio kilómetro a cada lado: `cota.km` [2,5; 8,0] y `puerto.km` [9,0; 25]. El hueco [8,0; 9,0] se asume y se documenta (§4.4): un Ghisallo de 8,6 km o una Bocchetta de 8,5 salen como puertos de 9,0. El techo de 25 deja fuera la Croix de Fer (29) y la Loze (28) como rarezas; el `alto_largo` de meta llega a 22 con la misma lógica (§4.3). Pendientes: `cota.g` [4; 7] (hoy [4,5; 6,5], `profileGen.ts` l. 248; Jaizkibel 5,6, Arrate 7,4), `puerto.g` [5; 9] (Galibier 5,1, Angliru 9,8 recortado por zona). La intersección con `geo.cota` y `geo.puerto` de la zona estrecha ambos (sección 6): en `dolomitas` un puerto nace en [9; 14] × [7,5; 9], en `alpes` en [12; 25] × [6; 9]. Lo que el motor lee de una `cota` y de un `puerto` es lo mismo, subida bloque a bloque (`climbWeight` `clamp((g − 2) / 6, 0,15, 1)`, `vRef` hiperbólica, `loadExponent` hacia 1,0, `draftMax` que cae con `g`; `physics.ts` l. 20-106 y 252-267), y la diferencia táctica la hace la posición: solo el puerto a ≤ 30 km de meta se sube «de verdad» (`climbRaceKmToGo`, l. 2497; `climbTempoFraction` 0,5 contra `climbPaceFraction` 0,12). De ahí V8b (sección 9): una reina de verdad tiene ≥ 25 % de sus km de subida a más de 30 km de meta, porque lo que se sube a tempo también deja gente atrás por deriva acumulada (mapa 03 §10.3).

La pancarta `cima` de una `cota` o un `puerto` la emite `emitirPancartas` (decisión 25) y su categoría la deriva el motor de los tramos del segmento (`deriveClimbCategory`: `Σ km·g²` sobre tramos con `g > 2`, umbrales cat4 40, cat3 120, cat2 300, cat1 600, HC 1.000; `constants.ts` l. 3946-3947). En números, para que el implementador sepa qué verá el jugador: una cota de 5 km al 5,5 % puntúa 151 (cat3); una de 8 km al 7 %, 392 (cat2); un puerto de 12 km al 7 %, 588 (cat2 raspando); uno de 15 km al 8 %, 960 (cat1); uno de 20 km al 8 %, 1.280 (HC). La categoría solo alimenta puntos y relato, nunca la física (`sample.ts` l. 129; `grep climbCategory physics.ts` = 0, mapa 03 §3).

**`forma`** decide cómo `renderMotif` usa `climb`: `progresiva` es `climb` tal cual (la progresión +1,6 de hoy, «más dura arriba, siempre»); `regular` es `climb` con las rampas barajadas por el mismo `rand` (mismo conjunto de pendientes, la dureza no siempre al final); `irregular` es `progresiva` más una rampa de `ARCH.motivo.puerto.rampaIrregular` ([0,3; 0,8] km al [11; 13] %) sustituyendo tramo en la mitad alta del puerto, en posición sorteada en `dib`. La rampa importa porque a `g ≥ 8` el perfil efectivo del corredor usa COL en vez de MON (`riderPerfil`, `simulate.ts` l. 425-448) y porque tres a ocho bloques con `vRef` más bajo, exponente más alto y `draftMax` menor «sí se notan» (mapa 03 §3): es la forma de que un puerto irregular abra ≥ 1,5 veces la brecha de uno regular, que SPEC §6.17 exige y que hoy ningún generador produce a propósito (banco §3.3).

**`muro`** mide [0,4; 3,0] km al [8; 16] % (`WALL_MAX_KM` 3, `stageKind.ts` l. 60; Kwaremont 2,2 km es el más largo de Flandes) y se rinde con `climb` y `gMax` 16: para `len ≤ 3` la primitiva da `round(len / 2,2) ≤ 1`, o sea 2 rampas, y sin tope un muro declarado al 16 % llegaría a 18,8 en la cima (16 + 1,6 + 1,2). Hoy, con muros `U(8, 12)`, la pendiente máxima medida es 14,8 (mapa 01 §2.4), que sigue por debajo del tope: `gMax` no cambia lo que hoy existe, acota lo que el rango nuevo permite. Un muro adoquinado (`adoquin: true`) sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`; banco §3.3): el bloque tiene un solo terreno y se elige la subida, que es lo que selecciona; el adoquín del muro queda para la ficha, para V2 y para `arch.motivos`. Lo que el motor lee: COL en cada bloque `g ≥ 8`, y nada de la longitud (`isWall` existe y no se llama, mapa 03 §2). Pancartas: un muro de menos de 1,5 km no lleva `cima` salvo que sea el último `puerto` de la etapa (decisión 25), y por esa segunda cláusula `lastClimbKm` (`finalKind.ts` l. 46-57, que mira primero las pancartas) ve el muro de meta aunque mida 0,8 km, cerrando el borde de `CLIMB_MIN_KM` (§4.4). En esqueletos de `kind: 'clasica'` el `Slot.params.kmRango` de los muros se cierra en 2,9 y `garantizaClase` lo vigila (decisión 10): `WALL_MAX_KM` es 3 y el redondeo de tramos a 0,1 podía cruzarlo. El suelo 8 de `muro.g` es `wallMinGradient` (a partir de ahí el motor cambia MON por COL) y tiene un precio que hay que escribir: los bergs de Flandes y Limburgo al [5; 8) % (Cauberg 1,2 × 5,8; Bosberg 1 × 6; Taaienberg 0,53 × 6,6; Polytechnique 0,78 × 6; Nokereberg 0,35 × 6, mapa 07 §1.1 y §1.3) no caben como dificultad intermedia, porque `cota` exige ≥ 2,5 km y `muro` exige ≥ 8 %, y la fila `flandes` de `ZONAS` (sección 6) intersecta con `muro.g` solo en su mitad dura. Como meta sí caben (`repecho` [1; 2,9] × [4; 7]). Se anota en la sección 17 junto a los otros huecos.

Hay una cota que la gramática no tiene como dificultad intermedia y se dice aquí para que nadie la busque: la subida de 3 a 5 km al [8; 11] % (Civiglio 4,2 × 9,7, Superga 4,9 × 9,1, Murgil está en muro). Como última cota de un día está cubierta por `ARCH.meta.unDiaUltimaCota` ([1,3; 4,2] × [7; 11]) y como meta por `alto_corto` ([3; 7] × [6; 11]); como cota intermedia la intersección de `cota.g` [4; 7] con la zona la deja fuera. Se acepta en E1 como se acepta el hueco [8,0; 9,0] (sección 17).

#### Dificultades compuestas: `cadena`, `sector`, `racimo`, `circuito`

**`cadena`** es lo que hoy no existe en ningún molde: n cotas o muros seguidos sin valle. `hijos` son `cota` o `muro`, de 2 a 8 (Ronde: de 16 a 19 cotas en 2 a 4 cadenas; Amstel: de 33 a 34), separados por `rolling` de [1,5; 6] km con la amplitud de la zona; el suelo 1,5 es `ARCH.colocacion.enlaceMinimo` (dos dificultades nunca se tocan; `finishClimbGapBlocks` 5 son 0,5 km y el margen es ×3, arquitectura §8) y el techo 6 es el de `ARCH.motivo.racimo.separacion`, que cumple la misma función en adoquín. Dentro de una cadena NO se emite la bajada canónica: lo que baja entre muro y muro es el propio `rolling` (Paterberg a 13 km de meta con llano detrás, no una bajada de 5 km). El motor no distingue una cadena de n muros sueltos; la distingue el jugador, porque la cadena garantiza la densidad que mapa 07 §1.3 mide (de 12 a 34 cotas en los últimos [100; 130] km) frente a los 4 o 5 muros de `classicSegments` (l. 473-491).

**`sector`** es el literal de `cobblesSegments` l. 503, `{ km, tipo: 'paves', estrellas }`, con `km` en [0,3; 3,7] (Roubaix) y `estrellas` 1 a 5. `firme: 'tierra'` (sterrato, ribinoù, chemins de vigne) se rinde como `paves` de 2 o 3★, que es exactamente lo que `classicRoutes.ts` l. 594 ya hace con Strade Bianche (banco §3.3): el motor no tiene tierra, tiene adoquín con estrellas, y 2 o 3★ es la selección de una pista de tierra (referencia 3★ en `dropPavesStarsReference`; 5★ casi dobla la selección, mapa 03 §10.6). Lo que el motor lee de un sector está todo en su tipo y sus estrellas (mapa 03 §3 y §4.2): coste `0,55 + 0,06·★`, selección `0,6·★/3·(1 + 0,5·lluvia)`, percances ×20 (`mishapLambda`, `constants.ts` l. 4389), caídas 0,0025/km, `draftMax` 0,18, peaje de colocación al entrar (l. 2611) y una aproximación de 2 km en la que el pelotón no rueda a tempo (`kmToNextPaves`, l. 1628-1636). Fuera de `paves` las estrellas se ponen a 0 (`sample.ts` l. 105): un `muro` con `estrellas` no existe en el tipo y `validateMotif` lo rechaza.

**`racimo`** es la unidad de Roubaix: [4; 10] sectores en una ventana de [20; 60] km, separados por `rolling` de [2; 6] km a amplitud 0,7 (`ARCH.motivo.racimo.sectores` y `.separacion`). La separación es la que impide reagrupar (mapa 07 §1.4: 3 a 6 km de asfalto en el tramo central), y es lo que a `cobblesSegments` le falta: 3 sectores de 2 a 4 km repartidos con `split` en 4 huecos, el último a unos 40 km de meta, «un décimo de la densidad real» (mapa 01 §2.7, mapa 07 §1.4). `km` del racimo es `Σ sectores + Σ separaciones`; `validateMotif` lo comprueba al 0,1. El racimo de 5★ de `ud_adoquin` es motivo de firma (`firma: true`): el Arenberg está donde está todas las ediciones.

**`circuito`** es la arquitectura que hoy no existe en absoluto (mapa 01 §8: «nunca un circuito»). `km` es el de UNA vuelta, en [8; 30]; `vueltas` en [3; 18]; `hijos` son las dificultades de la vuelta (`cota`, `muro`, `sector`, `tendida`) con su ventana relativa a la vuelta. Se rinde copiando los hijos `vueltas` veces con la MISMA semilla de detalle, `dib|${raceId}|${stageIndex}|${season}|${slot}|hijo${h}|i${intento}` (arquitectura §4.6; la lista cerrada de subflujos es de la sección 8): la vuelta 7 tiene las mismas rampas que la 1, que es lo que hace reconocible un circuito y lo que el test «`circuito` repite rampas vuelta a vuelta» sella. La `meta` no forma parte del circuito: es el motivo siguiente y consume la cola de la última vuelta (sección 8); la última vuelta se corta donde empieza la meta (banco §3.3). El motor no tiene noción de vuelta (`ejecutabilidad.md` riesgo 4): ve n pasos por la misma cota, y eso es lo que Québec y Montréal son (Camillien-Houde 1,8 km al 8 % diecisiete veces). Dos números que hay que tener delante porque son la razón de la banda informativa de `routeCensus` (decisión 25): con una cota de 1,8 km al 8 % y 17 vueltas, `kmSubida` son 30,6 km sobre 209 (0,15 de la etapa) y `breakAppeal` sube a 0,59 sin final en alto; y cada pancarta `cima` cuesta 2 de depósito a quien la disputa y abre 5 km de alivio del ritmo (`bannerCost`, `reliefKm`, mapa 03 §10.8), de modo que 17 pancartas son 85 km de etapa con el ritmo amortiguado. Por eso la pancarta va solo en los pasos de cota ≥ 1,5 km (`ARCH.pancarta.cimaMinKm`) y los muros de circuito de menos no puntúan salvo el último paso, y por eso `kmSubidaShare` de `ud_circuito` tiene banda informativa ≤ 0,20 y el banco de saturación lo vigila (sección 13).

### 4.3 Los nueve `MetaKind`: el modelo de final del motor

`meta` es siempre el último motivo. Cada `MetaKind` está definido por tres lecturas del motor y por la regla que las garantiza: `deriveFinishTerrain` (`finish.ts` l. 94-123: media de `g` en los últimos 5 km, última racha de subida de los últimos 15 km con `g ≥ 3` y hasta 5 bloques de respiro, fracción de descenso de los últimos 3 km, fracción de pavé de los últimos 30), `finishType` (l. 165-189: decide `alto`, `puncheur`, `muro`, `descenso`, `pave`, `sprint_masivo`, `sprint_reducido`, en ese orden de comprobación, con `alto` ANTES que `muro`; juicio motor §1) y `finalKindOf` (`finalKind.ts` l. 78-85: `kmAfterLastClimb` contra `FINAL_KIND_CUTS` {alto 0,5; cimaCerca 5; valleCorto 20}, l. 30). Las constantes citadas son de `constants.ts`. La columna `finalKindOf` es lo que V7 garantiza por etapa con reintento; la columna `finishType` es lo que V16 mide en `routeCensus` y en `motifs.test.ts`, nunca por intento (decisión 4).

| `MetaKind`      | Cómo se rinde (últimos km)                                                                                                                      | `finishType` esperado                                                                                    | `finalKindOf`                         | Regla que lo garantiza                                                                                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esprint`       | `enlace` o `expuesto` con amp ≤ 1,5 en los últimos 5 km                                                                                         | `sprint_masivo` o `sprint_reducido` (el tamaño del grupo solo cambia entre esos dos, `finish.ts` l. 142) | `null` (llana) o el de la última cota | media de `g` en los últimos 5 km (`finishWindowKm`, l. 3971) < 2: con amp ≤ 1,5 y alternancia sube/baja la media queda cerca de 0                                               |
| `repecho`       | `climb([1; 2,9], [4; 7])` como último segmento, tipo `puerto` (`ARCH.meta.repecho`)                                                             | `puncheur`                                                                                               | `alto` (0 km tras la cima)            | cota < `finishAltoMinKm` 3 (l. 3989); `g < 8` la aparta de `muro`                                                                                                               |
| `muro_meta`     | 2 km de `enlace` con amp ≤ 2,5 (`aproxKm`, `aproxAmp`) + `climb([0,5; 2,2], [8; 16], { gMax: 16 })` (`ARCH.meta.muro`)                          | `muro` si `km ≤ 1,0` (`finishMuroMaxKm`); `puncheur` por encima de 1,0                                   | `alto`                                | `climbKm ≤ muroMaxKm` 1 y `climbGradient ≥ muroMinGradient` 8 (l. 4462-4463); la aproximación evita que `finishClimbGapBlocks` 5 (l. 3980) una la racha con un repecho anterior |
| `alto_corto`    | `climb([3; 7], [6; 11])` último (`ARCH.meta.altoCorto`)                                                                                         | `alto`                                                                                                   | `alto`                                | ≥ 3 km y ≥ 4 % (`finishAltoMinGradient`, l. 4007)                                                                                                                               |
| `alto_largo`    | `climb([9; 22], [6; 9])` último; si `km > 17`, `g ≤ 7` (`gMaxSiMasDe17`)                                                                        | `alto`                                                                                                   | `alto`                                | idem; y `stageKindOf` reina por `PASS_MIN_KM` 8,5 con 0,5 de margen; solo con `geo.finalesAlto === 'largo'` (V4)                                                                |
| `cima_cerca`    | `cotaFinal` (cota, puerto o, en un día, `unDiaUltimaCota`) + `descent` + `rolling`, con valle total en [1,2; 4,3] (`ARCH.meta.cimaCerca.valle`) | `descenso` o `puncheur`, según lo que quede                                                              | `cima_cerca`                          | holgura 0,7 sobre los cortes 0,5 y 5 (`ARCH.veto.margenValleKm`)                                                                                                                |
| `descenso_meta` | `cotaFinal` + `descent([4; 12])` + `rolling([0; 8])`, valle en [5,7; 19,3] (`ARCH.meta.descensoMeta.valle`)                                     | `descenso` o `sprint_reducido`                                                                           | `valle_corto`                         | holgura 0,7 sobre 5 y 20                                                                                                                                                        |
| `valle`         | `cotaFinal` + `descent([4; 10])` + `rolling`, valle en [20,7; 45] (`ARCH.meta.valle.valle`)                                                     | `sprint_*`                                                                                               | `valle_largo`                         | holgura 0,7 sobre 20                                                                                                                                                            |
| `sector_meta`   | `sector` de [1; 2,5] km + `rolling([1; 8])` (`ARCH.meta.sectorMeta.aMeta`)                                                                      | `pave`                                                                                                   | `null`                                | fracción de pavé en los últimos 30 km (`finishPaveKm`, l. 4024) > 0                                                                                                             |

Tres notas sobre la tabla, porque son las que un implementador va a discutir.

**`muro_meta` está diseñado contra `deriveFinishTerrain`, no solo comprobado después** (I-21, I-35). El riesgo medido por el juez del motor (§1): un muro de 0,8 km al 12 % precedido de relleno `bumpy` (amp 3,2) puede salir con `climbKm > muroMaxKm` 1 porque la racha ascendente funde todo bloque `g ≥ 3` tolerando 5 de respiro, y como `finishType` mira `alto` antes que `muro`, el resultado es `puncheur` o `alto`. Cuatro propuestas lo comprobaban y reintentaban; esta sección lo evita: los 2 km previos al muro (`ARCH.meta.muro.aproxKm`) se rinden con amplitud ≤ 2,5 (`aproxAmp`), o sea ningún tramo al 3 %, y la racha empieza exactamente al pie del muro. El rango [0,5; 2,2] es más ancho que `muroMaxKm` a propósito: Huy mide 1,3 y San Luca 2,1, y no existen en la gramática si el muro de meta se limita a 1,0. Por encima de 1,0 km `finishType` dice `puncheur` (`climbKm > 1`, cota < 3 km), y la tabla lo declara; `routeCensus` mide las dos cubetas con V11 (`muro` ≥ 1 % y `puncheur` ≥ 8 % del calendario) y para que la cubeta `muro` exista de verdad los esqueletos con `muro_meta` sortean `cotaFinal.km` en todo el rango y no solo en su mitad alta (sección 5). Una cautela que V16 admite y el test del paso 3 imprime: mapa 03 §10.4 cita `docs/motor.md` §12.1 con una segunda vía a `alto` («últimos 3 km al ≥ 5 %»); un muro de 2,2 km al 14 % con 0,8 km de aproximación puede caer en ella. Por eso el conjunto que `muro_meta` promete a V16 es `{muro}` para `km ≤ 1,0` y `{puncheur, alto}` para `km > 1,0`, y el test de 300 instancias del paso 3 exige `muro` en 300 de 300 en la primera banda y pertenencia en la segunda, imprimiendo el reparto.

**Las holguras son 0,7 y no 0,5** (decisión 10, I-43). Arquitectura §3.2 proponía 0,5 sobre los cortes 5 y 20; `garantizaClase` mueve el valle al borde con `ARCH.veto.margenValleKm` 0,7 compensando en el enlace más largo, y los rangos de `ARCH.meta` nacen ya con esa holgura ([1,2; 4,3], [5,7; 19,3], [20,7; 45]) para que la guarda no tenga que actuar casi nunca (su cuenta de intervenciones se imprime en `routeCensus`). Hay un detalle de medida que justifica que la holgura sea mayor que el redondeo: `emitirPancartas` redondea el km de la cima al entero, como `auto()` l. 98, y `kmAfterLastClimb` se mide contra ese entero (mapa 01 §5.2), así que un valle dibujado de 4,6 km puede leerse como 5,0; con 4,3 de techo no cruza el corte.

**`cotaFinal` es la última cota, no un motivo aparte.** En todo `MetaKind` con subida (los siete que no son `esprint` ni `sector_meta`) la subida se instancia dentro del motivo `meta` (`Motif.cotaFinal = { km, g }`) y no como un `slot` más, y `Motif.km` es el total del motivo con aproximación, subida, bajada y valle: así V5 y V7 miran un solo objeto y `emitirPancartas` sabe dónde está la última cima. En un día, `cotaFinal` sale de `ARCH.meta.unDiaUltimaCota` ({[1,3; 4,2] km al [7; 11] %, cima a [3; 17] km}), que es el caso v40 escrito en positivo: San Fermo 2,7 × 7,2 a 5,5; Roche-aux-Faucons 1,3 × 11 a 13,5; Murgil 2,1 × 10 a 7; Civiglio 4,2 × 9,7 a 17 (mapa 07 §4.3). En etapa, `cotaFinal` es una `cota` o un `puerto` con los rangos de zona. La segunda cota de remate que Lombardía tiene en 3 de 4 ediciones (San Fermo después de Civiglio) no es de la meta: es la última `cota` del esqueleto `ud_montana` (sección 5).

### 4.4 Los tres bordes sin holgura y cómo se cierran

El diagnóstico (sección 1, mapa 01 §9 punto 4) midió tres cruces de clasificación que no son azar sino falta de holgura entre quien dibuja y quien lee. La gramática los cierra por construcción, no con reintentos:

| Borde                         | Lo medido hoy (mapa 01)                                                                                                                                         | Quién dibuja y quién lee                                                                                                   | Cómo se cierra en la gramática                                                                                                                                                                                                                                                    |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8,5 km (`PASS_MIN_KM`)        | 3 de 1.500 con `finalKind: 'alto'` forzado (§5.1): `garantizaPuerto` fija `segment.km` a 8,6 y `climbSize` suma tramos que dan 8,4, o al revés (8,4 contra 8,5) | `garantizaPuerto` l. 192-233 escribe `s.km`; `climbSize` `stageKind.ts` l. 36-42 suma tramos redondeados a 0,1             | `cota.km ≤ 8,0` y `puerto.km ≥ 9,0` (0,5 a cada lado); `normalizeEnlaces` no toca dificultades (decisión 10); la guarda `segment.km === Σ tramos` de I-8 en `renderMotif`; `garantizaClase` con `margenClaseKm` 0,3 como red. El hueco [8,0; 9,0] se asume: Ghisallo 8,6 sale 9,0 |
| 5 y 20 km (`FINAL_KIND_CUTS`) | 4 de 6.000 cubetas cruzadas (§2.5): `valleyKmFor` daba [1,5; 5] y [6; 20] y `normalize` estiraba un valle de 20 a 20,3                                          | `normalize` escala todos los segmentos; `finalKindOf` corta con `≤` en 5 y 20 sobre un km de pancarta redondeado al entero | rangos de `ARCH.meta.*.valle` con holgura 0,7; el valle es parte del motivo `meta` y `normalizeEnlaces` no lo toca; `garantizaClase` con `margenValleKm` 0,7                                                                                                                      |
| 1,5 km (`CLIMB_MIN_KM`)       | 12 de 1.500 clásicas (semillas 91, 153, 202) con `finalKindOf` `null` porque ningún muro llega a 1,5 y `lastClimbKm` no ve pancarta (§2.4)                      | `auto()` l. 93-102 ponía `cima` en todo `puerto`; `lastClimbKm` l. 46-57 mira pancartas y, si no, puertos ≥ 1,5            | `emitirPancartas` pone `cima` en todo `puerto` ≥ 1,5 km y SIEMPRE en el último `puerto` de la etapa (decisión 25): el muro de meta de 0,8 km tiene pancarta, `lastClimbKm` lo ve y `finalKindOf` dice `alto`                                                                      |

La guarda `segment.km === Σ tramos` (I-8) vive en `renderMotif` y no en una pasada posterior: `climb` reparte `len` en rampas con `split`, que redondea a 0,1 y cuadra el último trozo (mapa 01 §1), así que la suma coincide por construcción; la guarda es un `assert` en desarrollo y una corrección del último tramo en producción (mismo mecanismo que `normalize` l. 169-173, ingeniero §4.4). `sampleProfile` avisa de por qué importa: si los tramos suman más que `km`, la cola nunca se muestrea; si menos, el último se estira (`sample.ts` l. 55-56, mapa 03 §2).

### 4.5 `validateMotif`, `renderMotif` y sus tests

Las dos funciones de `motifs.ts` además de los tipos:

```ts
// packages/engine/src/routes/grammar/motifs.ts

/** null = válido; texto = por qué no (se guarda en arch para el censo y para el test). Puro. */
export function validateMotif(m: Motif, geo?: GeoSignature): string | null

/** Rinde UN motivo a segmentos con las primitivas de profileGen.ts. Puro: mismo rand, mismos segmentos.
 *  No cuadra km (eso es normalizeEnlaces, sección 8), no emite pancartas (emitirPancartas), no verifica (verify). */
export function renderMotif(m: Motif, rand: () => number, geo: GeoSignature): Segment[]
```

Lo que `validateMotif` comprueba, en este orden, y devuelve con el primer fallo:

1. Rango por tipo: `km` y `g` dentro de `ARCH.motivo[kind]` (o `ARCH.meta[meta]` en `meta`), redondeados a 0,1. `enlace` [1; 60]; `expuesto` [5; 60]; `tendida` [5; 30] × [1,5; 3,5]; `descenso` [2; 25] × [−8; −3]; `cota` [2,5; 8,0] × [4; 7]; `puerto` [9,0; 25] × [5; 9]; `muro` [0,4; 3,0] × [8; 16]; `sector` [0,3; 3,7] con `estrellas` entero en [1; 5]; `circuito` [8; 30] por vuelta con `vueltas` entero en [3; 18]; `racimo` [20; 60].
2. Campos que no pertenecen al tipo: `estrellas` fuera de `sector`; `firme` fuera de `sector`; `vueltas` fuera de `circuito`; `hijos` fuera de `cadena`, `racimo`, `circuito`; `meta` y `cotaFinal` fuera de `meta`; `g` en `enlace`, `expuesto`, `sector`; `adoquin` fuera de `muro` y `sector`.
3. Compuestos: `cadena` con 2 a 8 hijos, todos `cota` o `muro`; `racimo` con [4; 10] hijos, todos `sector`, y `km = Σ hijos + Σ separaciones` con cada separación en [2; 6]; `circuito` con hijos en {`cota`, `muro`, `sector`, `tendida`} y `Σ km de hijos ≤ 0,8 · km` de la vuelta (queda enlace para cerrarla).
4. Geografía, si se pasa `geo` (los mismos hechos que V1 a V4, aquí como validación temprana del motivo y no del perfil): `puerto` exige `geo.puerto !== null`; `cota` exige `geo.cota !== null`; `muro` exige `geo.muro !== null`, y `adoquin: true` exige `geo.muro.adoquin`; `sector` con `firme: 'adoquin'` exige `geo.adoquin ≥ 2` y con `firme: 'tierra'` exige `geo.sterrato`; `puerto.km ≥ 15` exige `geo.altitud ∈ {media, alta, altiplano}`; `meta: 'alto_largo'` exige `geo.finalesAlto === 'largo'`.
5. Meta: `meta` nunca lleva `g`; todo `MetaKind` con subida (`repecho`, `muro_meta`, `alto_corto`, `alto_largo`, `cima_cerca`, `descenso_meta`, `valle`) lleva la subida en `cotaFinal = { km, g }` dentro de su `ARCH.meta.*` (o de `ARCH.meta.unDiaUltimaCota` en un día para los tres con valle), y `Motif.km` es el total del motivo (aproximación + subida + bajada + valle), nunca menor que `cotaFinal.km`; `esprint` y `sector_meta` no llevan `cotaFinal`; `sector_meta` lleva su sector en `hijos[0]`.

Lo que `renderMotif` hace por tipo está en la tabla de §4.2; las reglas transversales: un solo `Segment` por `cota`, `puerto` y `muro`; `tendida` como un `llano` con tramos; `enlace` y `expuesto` con `rolling(…, amp, 0)`; `descenso` con `descent`; `sector` literal; `cadena` y `racimo` concatenan hijos y `rolling` intermedios; `circuito` concatena `vueltas` copias de la vuelta usando un `rand` derivado por hijo y reutilizado en cada vuelta (la semilla la construye `renderSkeleton`, sección 8; `renderMotif` recibe una fábrica `randDe(h)` para los hijos, que en el test es `routeRng` sobre una cadena fija). Ningún segmento de menos de 0,5 km (umbral de `rolling`, l. 101, y de V10). Todo `km` de segmento igual a la suma de sus tramos al 0,1 (guarda de §4.4).

Tests de `grammar/motifs.test.ts` (paso 3 del plan, sección 15), escritos antes que el código. Trescientas instancias por motivo con `routeRng(`test|${kind}|${i}`)`, rangos muestreados uniformes dentro de `ARCH` y una `GeoSignature` compatible (`ZONAS.alpes` para `puerto`, `ZONAS.flandes` para `muro` y `sector`, `ZONAS.italia_centro` para `sector` de tierra, `ZONAS.generico` para el resto):

```ts
import { describe, it, expect } from 'vitest'
import { validateMotif, renderMotif } from '../grammar/motifs'
import { ZONAS } from '../grammar/geo'
import { routeRng } from '../profileGen'
import { sampleProfile } from '../../stage/sample'
import { deriveFinishTerrain, finishType } from '../../stage/finish'
import { ARCH } from '../../constants'

describe('validateMotif', () => {
  it('acepta un puerto de 12 km al 7 % en alpes y lo rechaza en flandes', () => {
    const m = { kind: 'puerto', km: 12, g: 7, forma: 'regular' } as const
    expect(validateMotif(m, ZONAS.alpes)).toBeNull()
    expect(validateMotif(m, ZONAS.flandes)).toMatch(/puerto/)
  })
  it('rechaza una cota de 8,5 km (hueco [8,0; 9,0]) y un muro de 3,1 km', () => {
    expect(validateMotif({ kind: 'cota', km: 8.5, g: 6 })).toMatch(/km/)
    expect(validateMotif({ kind: 'muro', km: 3.1, g: 10 })).toMatch(/km/)
  })
  it('rechaza estrellas fuera de sector y un racimo cuyos km no cuadran', () => {
    expect(validateMotif({ kind: 'muro', km: 1, g: 10, estrellas: 3 } as any)).toMatch(/estrellas/)
    const hijos = Array.from(
      { length: 4 },
      () => ({ kind: 'sector', km: 2, estrellas: 3, firme: 'adoquin' }) as const,
    )
    expect(validateMotif({ kind: 'racimo', km: 8, hijos }, ZONAS.flandes)).toMatch(/separaci/)
  })
})

describe('renderMotif', () => {
  it('muro: 2 rampas, ninguna por encima de gMax 16, un solo segmento puerto, km = Σ tramos', () => {
    for (let i = 0; i < 300; i++) {
      const rand = routeRng(`test|muro|${i}`)
      const km = 0.4 + Math.round(rand() * 26) / 10,
        g = 8 + Math.round(rand() * 80) / 10
      const segs = renderMotif({ kind: 'muro', km, g }, rand, ZONAS.flandes)
      expect(segs).toHaveLength(1)
      expect(segs[0].tipo).toBe('puerto')
      expect(segs[0].tramos).toHaveLength(2)
      expect(Math.max(...segs[0].tramos!.map((t) => t.g))).toBeLessThanOrEqual(
        ARCH.motivo.muro.gMax,
      )
      expect(segs[0].tramos!.reduce((s, t) => s + t.km, 0)).toBeCloseTo(segs[0].km, 1)
    }
  })
  it('tendida: un llano con tramos; ningún bloque muestreado es subida (no cuenta en kmSubida)', () => {
    const segs = renderMotif(
      { kind: 'tendida', km: 20, g: 2.5 },
      routeRng('test|tendida|0'),
      ZONAS.meseta,
    )
    expect(segs.every((s) => s.tipo === 'llano')).toBe(true)
    const blocks = sampleProfile({ segments: segs })
    expect(blocks.every((b) => b.tipo !== 'subida')).toBe(true)
    expect(blocks.some((b) => b.g >= 1.8)).toBe(true) // pero la pendiente sí se lee
  })
  it('enlace: ningún tramo alcanza el 3 % que deriveFinishTerrain lee como cota', () => {
    for (let i = 0; i < 300; i++) {
      const segs = renderMotif(
        { kind: 'enlace', km: 30 },
        routeRng(`test|enlace|${i}`),
        ZONAS.ardenas,
      )
      expect(Math.max(...segs.flatMap((s) => s.tramos!.map((t) => t.g)))).toBeLessThan(3)
    }
  })
  it('muro_meta ≤ 1,0 km: finishType muro en 300 de 300; por encima, puncheur o alto (reparto impreso)', () => {
    const cuenta: Record<string, number> = {}
    for (let i = 0; i < 600; i++) {
      const rand = routeRng(`test|muro_meta|${i}`)
      const km = i < 300 ? 0.5 + Math.round(rand() * 5) / 10 : 1.1 + Math.round(rand() * 11) / 10
      const meta = {
        kind: 'meta',
        meta: 'muro_meta',
        km: km + ARCH.meta.muro.aproxKm,
        cotaFinal: { km, g: 8 + rand() * 8 },
      } as const
      const segs = [
        ...renderMotif({ kind: 'enlace', km: 60 }, rand, ZONAS.ardenas),
        ...renderMotif(meta, rand, ZONAS.ardenas),
      ]
      const ft = finishType(deriveFinishTerrain(sampleProfile({ segments: segs })), 50)
      if (km <= ARCH.meta.muro.finishMuroMaxKm) expect(ft).toBe('muro')
      else expect(['puncheur', 'alto']).toContain(ft)
      cuenta[`${km <= 1 ? 'corto' : 'largo'}:${ft}`] =
        (cuenta[`${km <= 1 ? 'corto' : 'largo'}:${ft}`] ?? 0) + 1
    }
    console.info('muro_meta finishType', cuenta)
  })
  it('circuito: la vuelta 7 tiene las mismas rampas que la 1', () => {
    const hijo = { kind: 'muro', km: 1.1, g: 11 } as const
    const segs = renderMotif(
      { kind: 'circuito', km: 14, vueltas: 9, hijos: [hijo] },
      routeRng('test|circuito|0'),
      ZONAS.flandes,
    )
    const muros = segs.filter((s) => s.tipo === 'puerto')
    expect(muros).toHaveLength(9)
    expect(muros[6].tramos).toEqual(muros[0].tramos)
  })
  it('descenso canónico: clamp(len·g·10/55, 2, 10)', () => {
    expect(ARCH.motivo.descenso.kmPorDesnivel).toEqual({ perdidaPorKm: 55, kmMin: 2, kmMax: 10 })
    // 13,8 × 8,1 → 20,3 → 10 ; 5 × 5,5 → 5,0 ; 2,5 × 4 → 1,8 → 2
  })
})
```

Los tests de `repecho → puncheur`, `alto_corto` y `alto_largo → alto`, `sector_meta → pave`, y de rangos por motivo (300 instancias dentro de `ARCH`) siguen el mismo patrón y se listan en la sección 15. La regla que separa este fichero del resto: `motifs.test.ts` es el ÚNICO test de la gramática que llama a `sampleProfile` y a `finishType` (aparte de `routeCensus`); `verify` no lo hace nunca (decisión 4), y por eso una recalibración de `STAGE.finish*` mueve este test y no un solo perfil del calendario.

Las constantes de esta sección que no están en la tabla de §B.3 y que la sección 12 recoge en el bloque `ARCH.motivo` con estos valores: `cadena.hijos` [2; 8] y `cadena.enlace` [1,5; 6] (los números de arquitectura §3.1 y §3.3 con el suelo de `colocacion.enlaceMinimo`), `descenso.km` [2; 25] y `expuesto.km` [5; 60] (arquitectura §3.1), `circuito.maxHijosShare` 0,8 (fracción máxima de la vuelta que ocupan las dificultades, para que quede enlace que la cierre; juicio de esta sección, se recalibra en el paso 3 si un circuito real no cabe).

### 4.6 Lo que la gramática NO produce

Dicho en lista para que nadie lo busque en el catálogo ni lo eche en falta en un test:

1. **`rompepiernas`.** Ningún motivo lo emite: `sample.ts` l. 100-101 lo colapsa a `g` 1,5 e ignora los tramos, así que hoy el generador escribe pendientes que la física no lee. Lo que ondula es `llano` con tramos. `golden.test.ts` del paso 1 sella que los builders legado (que sí lo emiten, `rolling` l. 119) siguen produciendo lo de hoy hasta el paso 8.
2. **Metas volantes.** Ninguna `meta_volante` generada (regla de la casa, `calendar.ts` l. 89-91): cada una cuesta 2 de depósito a quien la disputa y abre 5 km de alivio (mapa 03 §10.8). Es la decisión D4 del dueño con valor por defecto «no» (sección 18).
3. **Altitud, viento, costa y meseta como física.** `GeoSignature.altitud` y `.viento` viajan en `arch.metadatos` y en la ficha (decisión 17); `Segment` no tiene altitud ni exposición (`types.ts` l. 12-48) y el abanico sigue saliendo de `rng('viento')` en cualquier km de llano. `expuesto` y `tendida` son la parte honesta de esa frontera (§4.2).
4. **Puertos de más de 25 km, cotas entre 8,0 y 9,0 km, cotas intermedias de 3 a 5 km al [8; 11] % y bergs intermedios de menos de 2,5 km al [5; 8) %.** Los cuatro huecos están escritos en §4.2 y en la sección 17, con lo que la realidad pone en cada uno (Croix de Fer, Ghisallo, Civiglio y Cauberg como intermedias).
5. **Finales en alto de un día de más de 4,2 km.** V5 (decisión 5): la última cota de un día mide ≤ 4,2 y corona a [3; 17] km, o muere en meta como `muro_meta` ≤ 2,2; la única excepción es `ud_montana_alto` (peso 0,02, solo .1, solo `finalesAlto: 'largo'`; D1). Es el caso del encargo: «un final en alto de catorce kilómetros, algo que no existe en el calendario real».
6. **Adoquín y sterrato donde no existen.** `sector` con `firme: 'adoquin'` solo con `geo.adoquin ≥ 2`; con `firme: 'tierra'` solo con `geo.sterrato` (V2, V3). Las 20 filas `terrain: 'cobbles'` de hoy caen todas en zonas con adoquín (mapa 07 §3), así que ningún dato del calendario se pierde.
7. **Pendientes imposibles.** Ningún tramo con `g > 20` ni `g < −14`, ningún bloque de `subida` con `g < 1` (V15); `muro.gMax` 16 y el suelo 1 de `climb` lo garantizan antes de que V15 lo mire.
8. **Dos dificultades pegadas.** Salvo dentro de una `cadena`, entre dos dificultades hay ≥ 1,5 km de enlace (`ARCH.colocacion.enlaceMinimo`), porque `deriveFinishTerrain` funde rachas separadas por menos de 5 bloques y porque un puerto pegado a otro es, para `climbSize`, dos segmentos y no uno.
9. **Segmentos de menos de 0,5 km y kilómetros con más de un decimal.** `rolling` los elimina (l. 101), V10 los veta, y `sampleProfile` los pierde de todos modos (`n = round(totalKm / dx)`, `sample.ts` l. 70: un segmento de 40 m puede no tener ningún bloque).
10. **Kilómetros de subida por la puerta de atrás.** Una `tendida` de 30 km al 3,5 % no suma a `kmSubida`, y una `cota` de 2,5 km al 4 % sí. Es la regla de tipado de §4.1, y `routeCensus` la mide por esqueleto como `kmSubidaShare` (sección 13) para que nadie descubra tarde que un circuito de muros ha convertido una clásica en «montaña» para la fuga.

### 4.7 Cuatro carreras reales escritas como `Motif[]`

Para que el implementador vea la gramática entera en una etapa y no motivo a motivo, cuatro carreras del mapa 07 escritas como instancias de `Motif[]`. Son ejemplos y no las plantillas canónicas (esas, una por esqueleto, las escribe la sección 5); las bajadas canónicas tras cada `cota` y `puerto` no de meta las añade el rendido (sección 8) y aquí van anotadas entre paréntesis para que los kilómetros cuadren. Los kilómetros de cada motivo suman el total al 0,1, que es lo que V10 exige.

**Il Lombardia por Como, 240 km, `ud_montana` en `italia_norte`** (mapa 07 §1.6). Ghisallo entra como puerto de 9,0 (es 8,6: el hueco de §4.4); Civiglio entra como `cota` con la pendiente recortada al techo 7 (es 9,7: el hueco de §4.2); San Fermo va en la meta, con el valle a 4,0 km en vez de los 5,5 reales para caer en `cima_cerca` con holgura (5,5 está entre 4,3 y 5,7, la franja que la gramática no dibuja a propósito).

```ts
const lombardia: Motif[] = [
  { kind: 'enlace', km: 116.8 },
  { kind: 'puerto', km: 9.0, g: 6.2, forma: 'progresiva', nombre: 'Ghisallo 9,0 km al 6,2 %' }, // (+ bajada canónica 10,0)
  { kind: 'enlace', km: 30 },
  {
    kind: 'puerto',
    km: 13.0,
    g: 6.6,
    forma: 'irregular',
    nombre: 'Colma di Sormano 13 km al 6,6 % con muro',
  }, // (+ bajada 10,0)
  { kind: 'enlace', km: 30 },
  { kind: 'cota', km: 4.2, g: 7.0, forma: 'progresiva', nombre: 'Civiglio 4,2 km al 7 %' }, // (+ bajada 5,3)
  { kind: 'enlace', km: 5 },
  {
    kind: 'meta',
    meta: 'cima_cerca',
    km: 6.7,
    cotaFinal: { km: 2.7, g: 7.2 },
    firma: true,
    nombre: 'San Fermo della Battaglia 2,7 km al 7,2 %, cima a 4 km',
  },
]
// Σ = 116,8 + 9 + 10 + 30 + 13 + 10 + 30 + 4,2 + 5,3 + 5 + 6,7 = 240,0. Enlaces 181,8 km (76 % ≥ 12 %).
// Cimas a 114,2 (Ghisallo), 61,2 (Sormano), 17,0 (Civiglio) y 4,0 km (San Fermo) de meta: V5 en positivo.
```

Lo que el motor lee: Sormano se sube a tempo (a 61 km, `climbRaceKmToGo` 30) pero su rampa irregular al [11; 13] % pone COL tres a ocho bloques; Civiglio y San Fermo se suben a tope; `kmSubida` = 28,9 km (0,12 de la etapa), `breakAppeal` 0,48; D+ de motivos 1.904 m más 1.000 de relleno estimado (181,8 × 5,5), o sea unos 2.900 m: la plantilla canónica de `ud_montana` (sección 5) lleva una o dos `cota` más para acercarse a los [4.400; 4.900] reales. `finalKindOf` = `cima_cerca`; `finishType` esperado `descenso` o `puncheur`; con un puerto de 13 km `stageKindOf` dice `reina` por `PASS_MIN_KM`, y qué `kind` y qué `label` declara `ud_montana` lo fija la sección 5 con V6.

**Paris-Roubaix, 257 km, `ud_adoquin` en `francia_norte`** (mapa 07 §1.4). Tres racimos con un 5★ cada uno; el de Arenberg es firma. Veinticinco sectores y unos 50 km de adoquín contra los 29 a 31 y [54; 57] km reales; la plantilla canónica llega a 30 con un cuarto racimo.

```ts
const sector = (km: number, estrellas: number, nombre?: string): Motif => ({
  kind: 'sector',
  km,
  estrellas,
  firme: 'adoquin',
  nombre,
})
const roubaix: Motif[] = [
  { kind: 'expuesto', km: 96, nombre: 'Llano abierto de Compiègne a Troisvilles' },
  {
    kind: 'racimo',
    km: 50,
    hijos: [
      sector(2.2, 3),
      sector(1.6, 3),
      sector(2.5, 4),
      sector(1.4, 2),
      sector(2.0, 3),
      sector(1.8, 3),
      sector(1.7, 3),
      sector(2.3, 5, 'Trouée d’Arenberg'),
    ],
    firma: true,
  }, // Σ sectores 15,5; separaciones 34,5
  { kind: 'enlace', km: 8 },
  {
    kind: 'racimo',
    km: 55,
    hijos: [
      sector(1.2, 2),
      sector(2.4, 3),
      sector(1.0, 2),
      sector(3.7, 4),
      sector(1.4, 3),
      sector(2.6, 3),
      sector(1.1, 2),
      sector(2.0, 3),
      sector(3.0, 5, 'Mons-en-Pévèle'),
      sector(1.5, 3),
    ],
  }, // Σ 19,9; sep. 35,1
  { kind: 'enlace', km: 6 },
  {
    kind: 'racimo',
    km: 30,
    hijos: [
      sector(1.8, 3),
      sector(2.6, 4),
      sector(1.4, 2),
      sector(2.5, 3),
      sector(1.0, 2),
      sector(2.1, 5, 'Carrefour de l’Arbre'),
    ],
  }, // Σ 11,4; sep. 18,6
  {
    kind: 'meta',
    meta: 'sector_meta',
    km: 12,
    hijos: [sector(0.3, 1, 'Roubaix')],
    nombre: 'Último sector a 1,1 km de meta',
  },
]
// Σ = 96 + 50 + 8 + 55 + 6 + 30 + 12 = 257,0. Arenberg a 111 km de meta, Mons-en-Pévèle a 48, Carrefour a 12.
```

Lo que el motor lee: 25 entradas a `paves` con peaje de colocación, 25 aproximaciones de 2 km sin tempo, tres sectores 5★ que casi doblan la selección de los 3★, percances ×20 durante 47 km; ningún bloque `subida`, `kmSubida` 0, `breakAppeal` 0. `finishType` `pave`; `finalKindOf` `null`; `stageKindOf` `clasica` / `Cobbles`. D+ solo del relleno: con `amplitud` de `francia_norte` cerca de 0,9, unos [600; 900] m (Roubaix real: [700; 1.100]).

**GP de Montréal, `ud_circuito` en `norteamerica`** (mapa 07 §1.1). Diecisiete vueltas de 12,3 km con Camillien-Houde y un muro corto; Polytechnique (0,78 km al 6 %) se queda fuera por el hueco de §4.2. La meta es `esprint` y consume la cola de la última vuelta: total 16 vueltas enteras más la última cortada en la cima del segundo muro más 4 km de meta.

```ts
const montreal: Motif[] = [
  {
    kind: 'circuito',
    km: 12.3,
    vueltas: 17,
    firma: true,
    hijos: [
      {
        kind: 'muro',
        km: 1.8,
        g: 8.0,
        forma: 'progresiva',
        nombre: 'Camillien-Houde 1,8 km al 8 %',
      }, // ventana 0,15 de la vuelta
      { kind: 'muro', km: 0.4, g: 9.0, nombre: 'Pagnuelo 400 m al 9 %' }, // ventana 0,55
    ],
  },
  { kind: 'meta', meta: 'esprint', km: 4.0, nombre: 'Meta a 4 km del último muro' },
]
// Σ = 16 × 12,3 + 7,2 (última vuelta hasta la cima de Pagnuelo) + 4,0 = 208,0.
```

Lo que el motor lee: 34 pasos por `puerto` con las mismas rampas cada vuelta; `kmSubida` = 17 × 2,2 = 37,4 km (0,18 de la etapa, dentro de la banda informativa 0,20 de `ud_circuito`), `breakAppeal` 0,72; 18 pancartas `cima` (17 de Camillien-Houde, que mide ≥ 1,5, y una sola de Pagnuelo en su último paso, decisión 25), cada una con 2 de depósito para quien la dispute y 5 km de alivio; `lastClimbKm` es el último Pagnuelo, `kmAfterLastClimb` 4,0, `finalKindOf` `cima_cerca` (que es lo que `esprint` admite: «`null` o el que dé la última cota»), `finishType` `sprint_reducido` o `puncheur`.

**Flèche Wallonne, 203,3 km, `ud_muro_final` en `ardenas`** (mapa 07 §1.2). El Mur de Huy es firma y aparece tres veces: dos dentro de un circuito y la tercera como `cotaFinal` de un `muro_meta` de 1,3 km, que está por encima de `finishMuroMaxKm` 1,0 y por tanto se declara `puncheur` (§4.3).

```ts
const fleche: Motif[] = [
  { kind: 'enlace', km: 140 },
  {
    kind: 'circuito',
    km: 30,
    vueltas: 2,
    hijos: [
      {
        kind: 'muro',
        km: 1.3,
        g: 9.6,
        forma: 'progresiva',
        firma: true,
        nombre: 'Mur de Huy 1,3 km al 9,6 %',
      }, // ventana 0,05
      { kind: 'muro', km: 1.3, g: 8.0, nombre: 'Côte de Cherave 1,3 km al 8 %' }, // ventana 0,85
    ],
  },
  {
    kind: 'meta',
    meta: 'muro_meta',
    km: 3.3,
    cotaFinal: { km: 1.3, g: 9.6 },
    firma: true,
    nombre: 'Mur de Huy 1,3 km al 9,6 %, meta en la cima',
  }, // 2,0 km de aproximación a amp ≤ 2,5 + 1,3 de muro
]
// Σ = 140 + 60 + 3,3 = 203,3. Huy a 60, 30 y 0 km de meta, como en la carrera real.
```

Lo que el motor lee: seis pasos por muro con COL en cada bloque al ≥ 8 %; `kmSubida` 6,5 km (0,03), `breakAppeal` 0,13 más 0,35 por final en alto = 0,48; `finalKindOf` `alto` (0 km tras la cima, con pancarta en el último Huy aunque mida menos de 1,5 km); `finishType` esperado `puncheur` (`climbKm` 1,3 > `muroMaxKm` 1, cota < `finishAltoMinKm` 3), con `alto` admitido por V16 si la media de los últimos 3 km supera el umbral (§4.3); `stageKindOf` `clasica` porque ninguna cota pasa de 3 km (`WALL_MAX_KM`). La frase de arquitectura de la ficha: «Circuito de 30 km × 2 con el Mur de Huy (1,3 km al 9,6 %) y Cherave; meta en la cima del Mur de Huy».

---

## 5. Los esqueletos por tipo y clase

### 5.1 Qué es un esqueleto y cómo se lee el catálogo

Un esqueleto es la arquitectura de una etapa antes del detalle: una lista de huecos (`Slot`) con motivo permitido, cardinalidad `n`, ventana de inicio y parámetros, más lo que la etapa PROMETE al resto del juego: el `kind` que `stageKindOf` tiene que devolver, el `finalKind` que `finalKindOf` tiene que devolver, una sola `meta`, un desnivel objetivo total y un rango bruto de kilómetros. Los tipos `Slot` y `Skeleton` son los de la sección 3 (El modelo de tipos) y no se repiten aquí; lo que esta sección escribe es el contenido de `SKELETONS` (`packages/engine/src/routes/grammar/skeletons.ts`), con sus pesos, sus plantillas canónicas, sus alternativas y la regla con la que se elige uno.

Cuatro reglas gobiernan todas las filas del catálogo, y cada una sale de una línea de código y no de un gusto:

1. **El `kind` declarado es el que `stageKindOf` devuelve** (`stageKind.ts` l. 72-97, mapa 01 §5.1), y V6 (sección 9) lo comprueba en cada intento. Las consecuencias sobre el catálogo son literales: cualquier segmento `puerto` excluye `llana` (l. 77-78: `climbs.length === 0` es la única puerta a `Flat`), así que un esqueleto `llana` solo lleva `enlace`, `expuesto` y `tendida` (tipada `llano`, sección 4); un segmento `paves` da `clasica / Cobbles` antes de mirar nada más (l. 75), así que todo esqueleto con `sector` lleva esa etiqueta aunque muera en un muro; una etapa que no muere arriba y cuya cota más larga mide ≤ `WALL_MAX_KM` 3 es `clasica / Classic` (l. 88), así que un esqueleto `media` sin final en alto necesita una cota de [3,3; 8,0] km (0,3 de `ARCH.veto.margenClaseKm` sobre 3 y 0,5 bajo `PASS_MIN_KM` 8,5); y una etapa cuya suma de metros de subida en segmentos `puerto` alcanza `QUEEN_MIN_CLIMB_METRES` 3.200 es `reina` aunque ninguna cota pase de 8,5 (l. 90), así que un esqueleto `media` mantiene sus dificultades por debajo de 2.900 m de subida (300 de margen) y lo hace la persecución del desnivel de la sección 8, que para `kind: 'media'` escala hacia abajo si `Σ km·g·10` de las dificultades supera 2.900.
2. **Una sola `meta` por esqueleto**, porque `Skeleton.meta: MetaKind` es un valor y no una lista, y porque `finalKind` y la etiqueta (`Summit finish` frente a `Mountains`, `Uphill finish` frente a `Hills`) dependen de si el último segmento es `puerto` (l. 85). Donde arquitectura §3.3 escribía «`esprint` o `repecho`» aquí se decide uno; `repecho` es una subida a la línea (tipada `puerto`, sección 4) y por tanto solo cabe en esqueletos `media / Uphill finish`.
3. **`dPlus` es total, relleno incluido** (`ARCH.reina.dPlusIncluyeRelleno`, decisión 9), estimado con `ARCH.reina.rellenoDplusPorKm` 5,5 m por km de `enlace` y verificado con `dPlusDe(profile)`. Por eso las cifras de las tablas son más bajas que los desniveles reales del mapa 07 en las carreras cuyo relieve real viene de bajadas onduladas y sectores en cuesta que el motor no ve: un `sector` se rinde como `paves` sin desnivel (arquitectura §3.1, l. 136) y una `tendida` suma en `dPlusDe` pero no en `climbMetres`.
4. **`km` es rango bruto**: el kilometraje real lo decide `kmDe` con `ARCH.km.porClase` (sección 7) para etapas de vuelta, y el sorteo `firma|raceId` sobre la fila `un día` de la misma tabla para carreras de un día sin `km` explícito (decisión 36); el esqueleto recorta ese sorteo a su rango (§5.7). Las 36 filas con `km` explícito y las 226 etapas de edición traen el `km` como contrato al 0,1 (V10).

Sobre el recuento: el índice y arquitectura §3.3 dicen «32 esqueletos (15 de un día, 17 de etapa)», pero la unión cerrada `SkeletonId` de la sección 3 tiene 15 identificadores `ud_*`/`nc_*` y 16 `et_*`, 31 en total. Este catálogo escribe los 31 de la unión y no inventa el que falta; el test de §5.9 sella que `Object.keys(SKELETONS)` es exactamente esa unión.

### 5.2 Los quince esqueletos de un día

Notación de la columna de motivos: `motivo×[min; max]@[a; b]` es un `Slot` con `n = [min, max]` y `ventana = [a, b]`; los parámetros entre paréntesis son `Slot.params`; `(firma)` es `Slot.firma: true`. Todo hueco con `n[0] = 0` es opcional y lo mueve la edición (`ARCH.edicion.motivoNuevo` 0,35). El `meta` no aparece como hueco: es el último motivo de todo esqueleto, siempre de firma, con el `MetaKind` de la columna «Meta». Los rangos que no se citan son los de `ARCH.motivo.*` recortados por la zona (sección 6).

| Id                  | kind / label                                                          | finalKind                             | Motivos                                                                                                                                                                                                                                 | Meta                                                                                                     | D+ total (m)   | Km bruto                                | `requiere`                       | pesoBase                                                                    | Referencia real (mapa 07)                                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------- | -------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ud_esprint`        | llana / Flat                                                          | (ninguno)                             | `expuesto`×[1; 2]@[0,1; 0,8]; `tendida`×[0; 1]@[0,3; 0,7] (km [5; 10], g [1,5; 3])                                                                                                                                                      | `esprint`                                                                                                | [400; 1.500]   | [150; 240]                              |                                  | 30                                                                          | Brugge-De Panne, Scheldeprijs (§1.5). La «cota testimonial» es `tendida` y no `cota`: un `puerto` la sacaría de `llana` (regla 1)                                                           |
| `ud_esprint_capi`   | media / Hills                                                         | `valle_corto`                         | `cota`×[2; 3]@[0,7; 0,95] (km [3,3; 5,6], g [4; 5]; la última km [3,3; 4,2])                                                                                                                                                            | `esprint` a [5; 8] km de la última cota                                                                  | [1.200; 2.300] | [230; 295]                              | `cota`                           | 6                                                                           | Sanremo (§1.5). `stageKindOf` la llama `media` porque Poggio y Cipressa pasan de 3 km (banco §9.4.1): se declara así y no se toca el clasificador (decisión 26)                             |
| `ud_circuito`       | clasica / Classic                                                     | `cima_cerca`                          | `enlace`×[0; 1]@[0; 0,3]; `circuito`×1@[0,3; 1] (firma; vuelta [10; 18] km × [6; 16]) con hijos `muro`×[1; 2] (km [0,4; 2,5], g [8; 12])                                                                                                | `esprint` a [1; 4] km del último muro                                                                    | [1.800; 4.000] | [140; 275]                              | `muro`                           | 20                                                                          | Québec, Montréal, Japan Cup (§1.1). Todas sus cotas miden ≤ 2,5 km, luego `Classic` por la regla 1; Frankfurt con Feldberg es `ud_montana_media`                                            |
| `ud_muro_final`     | media / Uphill finish                                                 | `alto`                                | `cota`×[1; 3]@[0,3; 0,8] (km [2,5; 6]); `circuito`×[0; 1]@[0,55; 1] (vuelta [9; 30] × [2; 3]) que pasa por el muro                                                                                                                      | `muro_meta` (firma; km [0,5; 2,2], g [8; 16])                                                            | [1.500; 3.000] | [180; 215]                              | `muro`                           | 10                                                                          | Flèche (Huy ×3), Emilia (San Luca ×5), Nokere (§1.2). Muro > 1,0 km tipa `puncheur` (decisión 7)                                                                                            |
| `ud_muros`          | clasica / Classic                                                     | (varía: `cima_cerca` o `valle_corto`) | `enlace`@[0; 0,45]; `cadena`×[2; 4]@[0,45; 0,97], cada una con `muro`×[3; 8] (km [0,4; 2,5], g [8; 13]) y enlaces internos ≤ 5 km                                                                                                       | `esprint` a [1; 15] km del último muro                                                                   | [1.500; 3.500] | [180; 275]                              | `muro`                           | 25                                                                          | Ronde, Omloop, E3, Amstel, Brabantse (§1.3): 12 a 20 muros, los tres últimos en los últimos 30 km                                                                                           |
| `ud_muros_adoquin`  | clasica / Cobbles                                                     | (varía)                               | como `ud_muros` con `adoquin: true` en el 40 % a 70 % de los muros; `sector`×[2; 7]@[0,3; 0,9] (km [1; 2,5], ★[2; 3])                                                                                                                   | `esprint` a [1; 15] km                                                                                   | [1.500; 2.800] | [180; 275]                              | `adoquin ≥ 2`, `muro`            | 12                                                                          | Ronde, Omloop con sus sectores llanos (§1.3). Etiqueta `Cobbles` por la regla 1                                                                                                             |
| `ud_sterrato`       | clasica / Cobbles                                                     | `alto`                                | `cota`×[2; 4]@[0,15; 0,9] (km [2,5; 5], g [5; 7]); `racimo`×[2; 3]@[0,25; 0,9] de `sector` firme `tierra` (km [1; 3,7], ★[2; 3], separación [2; 5]); `muro`×[1; 3]@[0,5; 0,95] (km [0,4; 2], g [10; 16])                                | `muro_meta` (km [0,5; 1,0], g [12; 16])                                                                  | [1.600; 2.800] | [180; 215]                              | `sterrato`, `muro`               | 8                                                                           | Strade Bianche (§1.3). Monte Sante Marie (11,5 km) se escribe como tres sectores de 3,7 separados por 2 km; el desnivel real de 3.000 m no sale porque el sterrato es `paves` sin pendiente |
| `ud_adoquin`        | clasica / Cobbles                                                     | (ninguno)                             | `expuesto`@[0; 0,35]; `racimo`×[3; 6]@[0,35; 0,97] con [15; 30] sectores en total (km [0,3; 3,7], ★[1; 5]) y exactamente 3 de 5★ (firma)                                                                                                | `sector_meta` (sector [1; 2,5] km + [1; 8] km)                                                           | [600; 1.200]   | [200; 260]                              | `adoquin ≥ 2`                    | 10                                                                          | Roubaix (§1.4): 29 a 31 sectores, 54 a 57 km, Arenberg, Mons-en-Pévèle, Carrefour de l'Arbre                                                                                                |
| `ud_adoquin_ligero` | clasica / Cobbles                                                     | (varía)                               | `racimo`×[2; 3]@[0,3; 0,95] con [8; 14] sectores (km [0,8; 2,2], ★[2; 3]); `muro`×[0; 3]@[0,5; 0,97] (km [0,4; 1,5], g [8; 12])                                                                                                         | `esprint` a [2; 8] km                                                                                    | [800; 1.800]   | [170; 215]                              | `adoquin ≥ 1`                    | 8                                                                           | Denain, Le Samyn, Tro Bro Léon (§1.4)                                                                                                                                                       |
| `ud_montana`        | reina / Mountains                                                     | `valle_corto`                         | `enlace`@[0; 0,4]; `puerto`×[2; 3]@[0,4; 0,85] (el más largo, firma); `cota`×[1; 2]@[0,8; 0,97] (km [2,5; 4,2], g [6; 10])                                                                                                              | `descenso_meta` con `cotaFinal` de `ARCH.meta.unDiaUltimaCota` (km [1,3; 4,2], g [7; 11]) a [5,7; 17] km | [3.000; 4.600] | [200; 260]                              | `puerto`                         | 12                                                                          | Lombardía, Lieja, San Sebastián (§1.6, §4.3): es el caso v40 en positivo (V5)                                                                                                               |
| `ud_montana_media`  | media / Hills                                                         | `valle_corto`                         | `cota`×[3; 5]@[0,3; 0,95] (la primera km [3,3; 8,0]); `muro`×[0; 2]@[0,4; 0,9]                                                                                                                                                          | `descenso_meta` con `cotaFinal` (km [2,5; 4,2], g [6; 9]) a [5,7; 17] km                                 | [2.000; 3.200] | [170; 215]                              | `cota` con `cota.km[1] ≥ 3,3`    | 12                                                                          | Piemonte, Agostoni, Laigueglia, Frankfurt (§1.6, §1.1)                                                                                                                                      |
| `ud_montana_alto`   | reina / Summit finish                                                 | `alto`                                | `enlace`@[0; 0,6]; `puerto`×[0; 1]@[0,3; 0,6]                                                                                                                                                                                           | `alto_largo` (firma; km [13; 22], g [6; 7])                                                              | [2.500; 3.800] | [150; 185]                              | `puerto`, `finalesAlto: 'largo'` | 60 (× 0,02 por clase, §5.6)                                                 | Ventoux Dénivelé, Mercan'Tour (§1.2): tres carreras sobre doscientas. Rareza (decisión 37, D1)                                                                                              |
| `ud_criterium`      | llana / Flat                                                          | (ninguno)                             | `circuito`×1 (firma; vuelta [1,5; 3] km × [20; 40], hijos solo `enlace`; los `params` del hueco sobrescriben `ARCH.motivo.circuito`)                                                                                                    | `esprint`                                                                                                | [0; 300]       | [45; 100]                               |                                  | 1 (× 0 en todas las clases hasta D5)                                        | Critériums (§1.7): «fiesta y no carrera puntuable»                                                                                                                                          |
| `nc_ruta`           | media / Hills; en zonas sin `cota` ≥ 3,3 km, clasica / Classic (§5.7) | `cima_cerca`                          | `enlace`×[0; 1]@[0; 0,25]; `circuito`×1@[0,25; 1] (firma; vuelta [10; 20] × [8; 16]) con hijos `cota`×[0; 1] (km [3,3; 6], solo si la zona la admite), `muro`×[0; 2] (solo si `muro !== null`), `sector`×[0; 2] (solo si `adoquin ≥ 2`) | `esprint` a [1,2; 4,3] km del último paso                                                                | [1.800; 3.900] | [180; 240] (`ARCH.km.porClase.NC.ruta`) |                                  | 1 (único candidato de la ruta nacional)                                     | Campeonatos nacionales (mapa 07 §4.1, «siempre circuito»); la promesa de `motor.md` §V.3                                                                                                    |
| `nc_crono`          | cri / ITT                                                             | (ninguno)                             | `enlace`@[0; 1]; `cota`×[0; 1]@[0,3; 0,7] (km [2,5; 3], g [4; 5])                                                                                                                                                                       | `esprint`                                                                                                | [100; 500]     | [25; 45]                                |                                  | 1 (único candidato de la crono nacional y de la única fila `itt` de un día) | Crono nacional; Chrono des Nations                                                                                                                                                          |

Tres decisiones de esta tabla se apartan de arquitectura §3.3 y se dicen con su razón: `ud_esprint_capi` es `media` y `ud_circuito` es `clasica` (regla 1 de §5.1: con V6 como ley, el catálogo se pliega a `stageKindOf` y no al revés); `ud_muros_adoquin` y `ud_sterrato` llevan `Cobbles` (l. 75). Ninguna cambia el `kind` que el jugador ve respecto de lo que el clasificador diría de la misma etapa hoy.

### 5.3 Los dieciséis esqueletos de etapa

Las etapas de vuelta se piden por `StageRole` (sección 7) y no por terreno; la columna «Papel» dice qué papeles pueden pedir cada esqueleto. `Km bruto` es el rango de plausibilidad; el kilometraje lo pone `ARCH.km.porClase` (sección 7) y la etapa cabe por `normalizeEnlaces` (V10).

| Id                    | kind / label          | finalKind     | Papel                                                    | Motivos                                                                              | Meta                                                                           | D+ total (m)   | Km bruto   | `requiere`                                                         | pesoBase                           | Referencia                                                                                                                                         |
| --------------------- | --------------------- | ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------- | ---------- | ------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `et_llana`            | llana / Flat          | (ninguno)     | `llana`                                                  | `tendida`×[0; 2]@[0,2; 0,7] (km [5; 12], g [1,5; 3])                                 | `esprint`                                                                      | [500; 1.500]   | [110; 230] |                                                                    | 30                                 | Llana de gran vuelta (§2.1): cat 4/3 como `tendida`, no como `cota` (regla 1)                                                                      |
| `et_llana_viento`     | llana / Flat          | (ninguno)     | `llana_viento`                                           | `expuesto`×[2; 3]@[0,3; 0,95]                                                        | `esprint`                                                                      | [300; 900]     | [110; 210] | `viento ≥ 2`                                                       | 12                                 | Pólder, desierto (§1.5, §2.2 UAE). El abanico sigue en `rng('viento')` (decisión 17)                                                               |
| `et_media_valle`      | media / Hills         | `valle_largo` | `media`                                                  | `cota`×[2; 4]@[0,25; 0,8] (la primera km [3,3; 8,0]); `muro`×[0; 2]@[0,4; 0,85]      | `valle` con `cotaFinal` (km [2,5; 8], g [4; 7]) a [20,7; 45] km                | [1.600; 3.200] | [120; 200] | `cota` con `cota.km[1] ≥ 3,3`                                      | 25                                 | Media montaña de fuga (§2.1): última a 20 a 40 km, como `hillySegments` hoy (mapa 01 §8: «tras última cota» de 26 a 68 km)                         |
| `et_media_alto`       | media / Uphill finish | `alto`        | `media_alto`                                             | `cota`×[1; 2]@[0,3; 0,8] (km [3,3; 8,0])                                             | `alto_corto` (firma; km [3; 7], g [6; 11])                                     | [1.600; 3.200] | [110; 190] | `cota`, `finalesAlto ≠ 'ninguno'`                                  | 20                                 | Arrate, Planche, Xorret, Willunga (§2.2, §4.3)                                                                                                     |
| `et_media_muro`       | media / Uphill finish | `alto`        | `media_muro`                                             | `cadena`×[1; 2]@[0,5; 0,95], cada una con `muro`×[3; 6] (km [0,4; 2], g [8; 14])     | `muro_meta` (firma; km [0,5; 2,2], g [8; 16])                                  | [1.500; 3.000] | [120; 200] | `muro`                                                             | 12                                 | Tirreno (Sant'Elpidio), Benelux (Muur), Itzulia (§2.2)                                                                                             |
| `et_media_tendida`    | media / Hills         | `valle_largo` | `media`                                                  | `tendida`×[1; 2]@[0,1; 0,6] (km [10; 30]); `cota`×[1; 2]@[0,4; 0,75] (km [3,3; 8,0]) | `valle` con `cotaFinal` (km [2,5; 6], g [4; 6]) a [20,7; 45] km                | [1.500; 2.500] | [120; 200] | `cota` y (`altitud ∈ {altiplano, media}` o `relieve = 'ondulado'`) | 8                                  | Meseta, altiplano andino, Anatolia (mapa 07 §3)                                                                                                    |
| `et_reina_alto_largo` | reina / Summit finish | `alto`        | `reina_alto`                                             | `enlace`@[0; 0,35]; `puerto`×[2; 3]@[0,3; 0,85], cada uno con `descenso` canónico    | `alto_largo` (firma; km [9; 22], g [6; 9], g ≤ 7 si > 17)                      | [3.500; 5.500] | [110; 200] | `puerto`, `finalesAlto: 'largo'`                                   | 20                                 | Alpe d'Huez, Beille, Angliru, Lagos (§4.3): el 70 % a 80 % de los finales en alto de gran vuelta                                                   |
| `et_reina_alto_corto` | reina / Summit finish | `alto`        | `reina_alto`                                             | `puerto`×[2; 3]@[0,3; 0,85] (al menos dos ≥ 9 km, por V8a)                           | `alto_corto` (firma; km [4; 7], g [8; 11])                                     | [2.600; 4.800] | [110; 190] | `puerto`, `finalesAlto ≠ 'ninguno'`                                | 12                                 | Planche, Xorret, Tre Cime por el último tramo (§4.3)                                                                                               |
| `et_reina_cima_cerca` | reina / Mountains     | `cima_cerca`  | `reina_valle`                                            | `puerto`×[2; 3]@[0,25; 0,8]                                                          | `cima_cerca` con `cotaFinal` puerto (km [9; 16], g [6; 9]) a [1,2; 4,3] km     | [3.000; 4.800] | [120; 200] | `puerto`                                                           | 10                                 | Livigno 2024, Tour e19 2024 Isola por la bajada corta (§2.1)                                                                                       |
| `et_reina_valle`      | reina / Mountains     | `valle_corto` | `reina_valle`                                            | `puerto`×[3; 4]@[0,2; 0,8], cada uno con `descenso`                                  | `descenso_meta` con `cotaFinal` puerto (km [9; 17], g [6; 9]) a [5,7; 19,3] km | [3.200; 5.000] | [130; 210] | `puerto`                                                           | 10                                 | «Montaña sin final en alto» (§2.1): 1 a 3 por gran vuelta                                                                                          |
| `et_reina_encadenada` | reina / Summit finish | `alto`        | `reina_encadenada`                                       | `puerto`×[3; 5]@[0,05; 0,85] con enlaces ≤ 6 km entre ellos                          | `alto_corto` (firma; km [4; 7], g [8; 11])                                     | [3.800; 5.500] | [110; 160] | `puerto`, `relieve: 'alta'`                                        | 6                                  | Dolomitas (Tre Cime), Pirineos encadenados (§2.1 regla 4)                                                                                          |
| `et_montana_corta`    | reina / Summit finish | `alto`        | `montana_corta`                                          | `puerto`×2@[0,08; 0,7] con enlaces ≤ 8 km entre puertos                              | `alto_largo` (firma; km [9; 22], g [6; 9])                                     | [3.000; 4.200] | [100; 140] | `puerto`, `finalesAlto: 'largo'`                                   | 6                                  | Montaña corta de Vuelta y Tour desde 2018 (§2.1 regla 5)                                                                                           |
| `et_reina_blanda`     | reina / Summit finish | `alto`        | cualquier `reina_*` (por `ARCH.reina.blandaShare`, §5.7) | `enlace`@[0; 0,6]; `cota`×[1; 2]@[0,15; 0,6] (km [5; 8], g [4; 7])                   | `alto_largo` (firma; km [9; 12], g [6; 7])                                     | [1.500; 2.500] | [130; 180] | `puerto`, `finalesAlto: 'largo'`                                   | 1 (no entra en el sorteo por peso) | Vuelta de una semana con un solo puerto (Fóia, Jebel Hafeet): la cola baja que `calendarQueens.test.ts` l. 62-63 exige, decidida aquí (decisión 8) |
| `et_crono`            | cri / ITT             | (ninguno)     | `cri`                                                    | `cota`×[0; 1]@[0,3; 0,7] (km [2,5; 3], g [4; 5])                                     | `esprint`                                                                      | [50; 400]      | [8; 45]    |                                                                    | 1                                  | CRI de 14 a 26 km (`ROUTE.itt*`) y de 30 a 35 (Dauphiné)                                                                                           |
| `et_prologo`          | cri / ITT             | (ninguno)     | `prologo`                                                | (solo `enlace`)                                                                      | `esprint`                                                                      | [0; 100]       | [3; 8]     |                                                                    | 1                                  | Romandía, Dauphiné, Suiza (§2.2); D3                                                                                                               |
| `et_cronoescalada`    | cri / ITT             | `alto`        | `cronoescalada`                                          | `enlace`×[0; 1]@[0; 0,4] (km [3; 10])                                                | `alto_largo` (firma; km [9; 15], g [6; 9])                                     | [500; 1.200]   | [12; 25]   | `puerto`, `finalesAlto: 'largo'`                                   | 1                                  | Peyragudes (Tour 2025 e13, 11 km); D3                                                                                                              |

`et_reina_blanda`, con los huecos exactos de la decisión 8: `enlace` en [0; 0,6]; `cota`×[1; 2] en [0,15; 0,6] de [5; 8] km; meta `alto_largo` de [9; 12] km al [6; 7] %; D+ total [1.500; 2.500] con relleno. Es `reina` por `PASS_MIN_KM` (el final mide ≥ 9), cumple V8b (≥ 25 % de la subida a más de 30 km de meta: sus cotas están en [0,15; 0,6]) y está exenta de V8a. El 60/40 de `ROUTE.queenHighDplusShare` y `queenLowDplusRange` se retiran (sección 12): la cola baja de desnivel ya no la sostiene un test sino este esqueleto con su cuota.

Los esqueletos `reina` de vuelta cumplen V8a por construcción: `et_reina_alto_largo`, `et_montana_corta` y `et_cronoescalada` con puerto de meta ≥ 9 km; `et_reina_alto_corto`, `et_reina_encadenada`, `et_reina_cima_cerca` y `et_reina_valle` con al menos dos puertos ≥ 9 km (la `cotaFinal` de `cima_cerca` y `descenso_meta` es uno de ellos). Los seis esqueletos `media` mantienen la cota más larga ≤ 8,0 km y la suma de subida ≤ 2.900 m (regla 1 de §5.1). Los `llana` cumplen V9 porque no llevan ningún `puerto`.

### 5.4 Las plantillas canónicas

`Skeleton.canonico` es un `Motif[]` literal, uno por esqueleto, que pasa todos los vetos por construcción: es lo que `generateStage` devuelve con `degradado: true` cuando agota `ARCH.colocacion.maxIntentos` 8 (sección 8), lo que la galería pinta primero (sección 16) y lo que `skeletons.test.ts` verifica con `verify` y `stageKindOf` sin RNG (§5.9). Los kilómetros suman exactamente la cifra del comentario, cada `descenso` mide `clamp(len·g·10/55, 2, 10)` redondeado al 0,1 (`ARCH.motivo.descenso.kmPorDesnivel`), y las `cotaFinal` respetan las holguras de 0,7 km sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (decisión 10). Los constructores `E`, `X`, `T`, `C`, `P`, `M`, `D`, `S`, `CAD`, `RAC`, `K` y `META` son funciones de una línea que devuelven un objeto `Motif` y existen solo para que el fichero quepa en una pantalla; el implementador puede inlinear los objetos.

```ts
// packages/engine/src/routes/grammar/skeletons.ts (fragmento: constructores y plantillas canónicas)
const E = (km: number): Motif => ({ kind: 'enlace', km })
const X = (km: number): Motif => ({ kind: 'expuesto', km })
const T = (km: number, g: number): Motif => ({ kind: 'tendida', km, g })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const P = (km: number, g: number, firma = false): Motif => ({
  kind: 'puerto',
  km,
  g,
  forma: 'regular',
  firma,
})
const M = (km: number, g: number, adoquin = false): Motif => ({ kind: 'muro', km, g, adoquin })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
const S = (
  km: number,
  estrellas: number,
  firme: 'adoquin' | 'tierra' = 'adoquin',
  firma = false,
): Motif => ({ kind: 'sector', km, estrellas, firme, firma })
const CAD = (hijos: Motif[]): Motif => ({
  kind: 'cadena',
  km: hijos.reduce((a, h) => a + h.km, 0),
  hijos,
})
const RAC = (hijos: Motif[]): Motif => ({
  kind: 'racimo',
  km: hijos.reduce((a, h) => a + h.km, 0),
  hijos,
})
const K = (kmVuelta: number, vueltas: number, hijos: Motif[]): Motif => ({
  kind: 'circuito',
  km: kmVuelta,
  vueltas,
  hijos,
  firma: true,
})
/** `km` del meta: en `cima_cerca`, `descenso_meta` y `valle` es `cotaFinal.km` + valle tras la cota; en `muro_meta` es `ARCH.meta.muro.aproxKm` 2 + `cotaFinal.km` (la aproximación va ANTES y la cota muere en la línea); en `alto_*` es `cotaFinal.km`; en `esprint` el llano final; en `sector_meta` sector + llano. */
const META = (meta: MetaKind, km: number, cotaFinal?: { km: number; g: number }): Motif => ({
  kind: 'meta',
  meta,
  km,
  cotaFinal,
  firma: true,
})

export const CANONICO: Record<SkeletonId, Motif[]> = {
  // ---- un día (15) ----
  ud_esprint: [E(40), X(50), E(20), T(6, 2.5), E(50), X(30), META('esprint', 4)], // 200 km
  ud_esprint_capi: [E(259.1), C(5.6, 4.1), D(4.2), E(12), C(3.7, 4), D(2.7), META('esprint', 2.7)], // 290 km; Poggio corona a 5,4
  ud_circuito: [
    E(5),
    K(12, 16, [E(5.4), M(0.4, 10), E(4.2), M(1.0, 8), E(1.0)]),
    META('esprint', 3),
  ], // 200 km; último muro a 4
  ud_muro_final: [
    E(108.3),
    C(4, 6),
    D(4.4),
    E(20),
    K(30, 2, [E(12), M(1.3, 9.6), E(8), C(3.5, 6), D(3.8), E(1.4)]),
    META('muro_meta', 3.3, { km: 1.3, g: 9.6 }),
  ], // 200 km; Huy ×3
  ud_muros: [
    E(132.4),
    CAD([M(1.0, 9), E(3), M(0.6, 11), E(4), M(2.2, 8), E(3), M(0.5, 12), E(5), M(0.8, 9)]),
    E(25),
    CAD([
      M(1.2, 10),
      E(2.5),
      M(0.4, 14),
      E(3),
      M(1.5, 9),
      E(4),
      M(0.9, 11),
      E(2),
      M(2.0, 8),
      E(3.5),
      M(0.7, 12),
    ]),
    E(20),
    CAD([M(1.1, 10), E(3), M(0.6, 13), E(2.5), M(2.2, 8), E(4), M(0.4, 13), E(3), M(1.0, 9)]),
    META('esprint', 13),
  ], // 250 km; 16 muros, último a 13
  ud_muros_adoquin: [
    E(132.7),
    S(1.5, 3),
    E(12),
    S(2.0, 3),
    E(20),
    CAD([
      M(2.2, 8, true),
      E(3),
      M(0.4, 13, true),
      E(4),
      M(0.6, 12, true),
      E(3.5),
      M(1.0, 9),
      E(4),
      M(0.5, 10),
    ]),
    E(18),
    S(1.2, 2),
    E(15),
    CAD([
      M(1.0, 9, true),
      E(3),
      M(0.8, 10),
      E(5),
      M(2.2, 8, true),
      E(3),
      M(0.4, 13, true),
      E(4),
      M(1.0, 8),
    ]),
    META('esprint', 13),
  ], // 255 km
  ud_sterrato: [
    E(67.4),
    C(4, 6),
    D(4.4),
    RAC([
      S(2.1, 3, 'tierra'),
      E(3),
      S(3.5, 3, 'tierra'),
      E(4),
      S(1.8, 2, 'tierra'),
      E(3),
      S(2.6, 3, 'tierra'),
    ]),
    E(15),
    C(3.5, 6),
    D(3.8),
    E(6),
    RAC([
      S(3.7, 3, 'tierra'),
      E(2),
      S(3.7, 3, 'tierra'),
      E(2),
      S(3.0, 3, 'tierra'),
      E(5),
      S(2.4, 2, 'tierra'),
      E(4),
      S(3.2, 3, 'tierra'),
    ]),
    E(10),
    C(5, 5.5),
    D(5),
    E(5),
    M(0.8, 12),
    E(6),
    RAC([
      S(2.5, 3, 'tierra'),
      E(3),
      S(1.1, 2, 'tierra'),
      E(4),
      S(3.0, 3, 'tierra'),
      E(2.5),
      S(1.5, 2, 'tierra'),
    ]),
    E(8),
    META('muro_meta', 2.5, { km: 0.5, g: 16 }),
  ], // 213 km; Santa Caterina
  ud_adoquin: [
    X(79.2),
    E(36),
    RAC([
      S(2.2, 3),
      E(4),
      S(2.4, 2),
      E(3),
      S(2.3, 5, 'adoquin', true),
      E(5),
      S(2.0, 2),
      E(4),
      S(3.0, 4),
      E(3),
      S(2.0, 2),
    ]),
    E(20),
    RAC([
      S(2.5, 3),
      E(3),
      S(1.8, 3),
      E(2),
      S(3.0, 5, 'adoquin', true),
      E(4),
      S(1.7, 2),
      E(3),
      S(2.4, 3),
      E(4),
      S(1.5, 2),
      E(3),
      S(2.7, 4),
    ]),
    E(24),
    RAC([
      S(1.4, 3),
      E(3),
      S(2.0, 3),
      E(4),
      S(1.9, 2),
      E(3),
      S(2.1, 5, 'adoquin', true),
      E(4),
      S(1.8, 3),
      E(5),
      S(1.0, 2),
    ]),
    META('sector_meta', 2.1),
  ], // 258 km; 20 sectores, 40,7 km
  ud_adoquin_ligero: [
    E(73.5),
    RAC([S(1.2, 2), E(3), S(0.8, 2), E(4), S(1.5, 3), E(3), S(1.0, 2)]),
    E(20),
    M(0.6, 9),
    E(15),
    RAC([S(1.8, 3), E(3), S(1.0, 2), E(4), S(2.2, 3), E(3), S(0.9, 2), E(4), S(1.4, 3)]),
    E(22),
    RAC([S(1.5, 3), E(3), S(1.1, 2), E(2.5), S(0.8, 2), E(3), S(1.3, 3)]),
    E(6),
    M(0.9, 10),
    E(4),
    META('esprint', 4),
  ], // 195 km; último muro a 8
  ud_montana: [
    E(93.2),
    P(9.0, 6.2),
    D(10),
    E(20),
    P(13, 6.6, true),
    D(10),
    E(25),
    C(4, 8),
    D(5.8),
    E(30),
    C(4.2, 9.7),
    D(7.4),
    E(5),
    META('descenso_meta', 8.4, { km: 2.7, g: 7.2 }),
  ], // 245 km; Como: Ghisallo (8,6 → 9,0), Sormano, Civiglio, San Fermo a 5,7
  ud_montana_media: [
    E(80.5),
    C(6, 6),
    D(6.5),
    E(20),
    C(4.5, 6.5),
    D(5.3),
    E(18),
    M(1.2, 10),
    E(12),
    C(5, 6),
    D(5.5),
    E(15),
    META('descenso_meta', 15.5, { km: 3.5, g: 8 }),
  ], // 195 km
  ud_montana_alto: [E(99.7), P(9, 6), D(9.8), E(30), META('alto_largo', 21.5, { km: 21.5, g: 7 })], // 170 km; Ventoux por Bédoin
  ud_criterium: [K(2.5, 22, [E(2.5)]), META('esprint', 5)], // 60 km
  nc_ruta: [
    E(15.5),
    K(16, 12, [E(2.5), C(3.5, 5), D(3.2), E(4.7), M(0.6, 8), E(1.5)]),
    META('esprint', 2.5),
  ], // 210 km; media: 2.676 m de subida < 2.900
  nc_crono: [E(20), C(2.5, 4), D(2), E(7.5), META('esprint', 3)], // 35 km
  // ---- etapa (16) ----
  et_llana: [E(60), T(8, 2.5), E(40), T(6, 2), E(62), META('esprint', 4)], // 180 km
  et_llana_viento: [E(50), X(40), E(15), X(35), E(10), X(17), META('esprint', 3)], // 170 km
  et_media_valle: [
    E(72),
    C(5, 6),
    D(5.5),
    E(20),
    C(7, 5.5),
    D(7),
    E(18),
    M(1.5, 9),
    E(10),
    META('valle', 29, { km: 4, g: 6.5 }),
  ], // 175 km; última a 25
  et_media_alto: [
    E(53.5),
    C(6, 5),
    D(5.5),
    E(44.5),
    C(8, 6),
    D(8.7),
    E(26.8),
    META('alto_corto', 7, { km: 7, g: 7 }),
  ], // 160 km; plantilla 4 del mapa 07 §5
  et_media_muro: [
    E(108.7),
    CAD([M(1.0, 10), E(3), M(0.7, 12), E(4), M(1.8, 8), E(3.5), M(0.5, 13)]),
    E(20),
    CAD([M(1.2, 9), E(3), M(0.6, 14), E(4.5), M(1.5, 9)]),
    E(8),
    META('muro_meta', 3.0, { km: 1.0, g: 12 }),
  ], // 165 km; muro de meta 1,0 → `muro`
  et_media_tendida: [
    E(47.5),
    T(20, 2.5),
    E(25),
    C(5, 5),
    D(4.5),
    E(20),
    T(12, 3),
    E(8),
    META('valle', 28, { km: 4, g: 5 }),
  ], // 170 km
  et_reina_alto_largo: [
    E(40),
    P(12, 7),
    D(10),
    E(28),
    P(17, 7.3),
    D(10),
    E(10),
    P(10, 7.8),
    D(10),
    E(12.2),
    META('alto_largo', 15.8, { km: 15.8, g: 7.9 }),
  ], // 175 km; plantilla 3 (Pirineos, 4.800 m)
  et_reina_alto_corto: [
    E(79.1),
    P(11, 7),
    D(10),
    E(20),
    P(14, 6.5),
    D(10),
    E(15),
    META('alto_corto', 5.9, { km: 5.9, g: 8.5 }),
  ], // 165 km; Planche
  et_reina_cima_cerca: [
    E(75),
    P(10, 7),
    D(10),
    E(22),
    P(13, 6.8),
    D(10),
    E(15),
    META('cima_cerca', 15, { km: 12, g: 7.5 }),
  ], // 170 km; cima a 3
  et_reina_valle: [
    E(57),
    P(9, 6.5),
    D(10),
    E(15),
    P(12, 7),
    D(10),
    E(15),
    P(10, 7.5),
    D(10),
    E(12),
    META('descenso_meta', 25, { km: 11, g: 7 }),
  ], // 185 km; cima a 14
  et_reina_encadenada: [
    E(18),
    P(14, 7.5),
    D(10),
    E(6),
    P(12, 8),
    D(10),
    E(6),
    P(16, 7),
    D(10),
    E(6),
    P(11, 8),
    D(10),
    E(4),
    META('alto_corto', 7, { km: 7, g: 8.5 }),
  ], // 140 km; Dolomitas
  et_montana_corta: [
    E(20),
    P(16, 7),
    D(10),
    E(8),
    P(20, 6.5),
    D(10),
    E(8),
    META('alto_largo', 18, { km: 18, g: 7 }),
  ], // 110 km
  et_reina_blanda: [
    E(72.4),
    C(6, 5.5),
    D(6),
    E(30),
    C(7, 6),
    D(7.6),
    E(20),
    META('alto_largo', 11, { km: 11, g: 6.5 }),
  ], // 160 km; 2.138 m con relleno
  et_crono: [E(15), C(2.5, 4), D(2), E(5.5), META('esprint', 3)], // 28 km
  et_prologo: [E(4), META('esprint', 2)], // 6 km
  et_cronoescalada: [E(7), META('alto_largo', 11, { km: 11, g: 7.5 })], // 18 km
}

/** `nc_ruta` en zonas sin cota ≥ 3,3 km (§5.7): mismo esqueleto con `kind: 'clasica'`, `label: 'Classic'`, `finalKind` sin declarar. */
export const NC_RUTA_CLASICA: Motif[] = [
  E(11),
  K(14, 14, [E(4), M(1.0, 9, true), E(5.5), M(0.5, 12), E(3.0)]),
  META('esprint', 3),
] // 210 km
```

Comprobaciones hechas a mano sobre estas plantillas, que el test de §5.9 repite: `ud_montana` tiene su cota más larga en 13 km (`reina`), no muere arriba (`Mountains`), su última cota mide 2,7 km y corona a 5,7 (V5, `valle_corto`); `nc_ruta` suma 2.676 m de subida en segmentos `puerto` (12 vueltas × 223 m), por debajo de 3.200 con 500 de margen, y su último muro corona a 4,0 km (`cima_cerca`, 1,0 de holgura sobre el corte 5); `et_media_alto` tiene su cota más larga en 8,0 (0,5 bajo `PASS_MIN_KM`) y 1.270 m de subida; `et_reina_alto_largo` acumula 4.109 m en puertos más 496 de relleno estimado (4.605 total, contra 4.800 de la plantilla 3 del mapa 07 §5) y tiene 39 de sus 54,8 km de subida a más de 30 km de meta (V8b); `et_reina_blanda` da 2.138 m con relleno, dentro de [1.500; 2.500]. Las concesiones al hueco [8,0; 9,0] se anotan en la propia línea (Ghisallo 8,6 → 9,0; Colle Aperto a 3 km → 5,7 en la alternativa de Bérgamo, porque `ARCH.meta.descensoMeta.valle` empieza en 5,7).

### 5.5 Alternativas declaradas (rotación de nivel 2)

`Skeleton.alternativas?: Motif[][]` es la rotación DECLARADA de `ARCH.edicion.nivel` 2 (decisión 22): la edición elige `[canonico, ...alternativas][season % (1 + alternativas.length)]` como instancia de partida y sobre ella aplica el jitter de nivel 1. Toda alternativa conserva `kind`, `label`, `meta` y `finalKind` del esqueleto (son identidad, decisión 20) y solo cambia los motivos no firma y los parámetros de la meta dentro del rango del `MetaKind`; `skeletons.test.ts` lo sella. Con el valor por defecto de D7 (`nivel` 1) las alternativas no rotan: existen, se validan y la galería las pinta, pero el calendario usa el `canonico`. Se declaran dos:

```ts
SKELETONS.ud_montana.alternativas = [
  // Bérgamo: Roncola, Valcava, Ganda; Colle Aperto (1,2 km al 7 %) a 5,7 km (real 3, subido al suelo de descensoMeta.valle)
  [
    E(115.8),
    P(9.4, 6.6),
    D(10),
    E(20),
    P(11.6, 8, true),
    D(10),
    E(20),
    P(9.2, 7.3),
    D(10),
    E(10),
    C(3.0, 7.5),
    D(4.1),
    E(10),
    META('descenso_meta', 6.9, { km: 1.2, g: 7 }),
  ], // 250 km
]
SKELETONS.et_reina_alto_largo.alternativas = [
  // Angliru: 12,5 km al 9 % (real 9,8; techo ARCH.meta.altoLargo.g)
  [
    E(40),
    P(12, 7),
    D(10),
    E(28),
    P(14, 7),
    D(10),
    E(22.5),
    P(10, 7.5),
    D(10),
    E(6.0),
    META('alto_largo', 12.5, { km: 12.5, g: 9 }),
  ], // 175 km
  // Lagos de Covadonga: 12,2 km al 7,2 %
  [
    E(40),
    P(12, 7),
    D(10),
    E(28),
    P(14, 7),
    D(10),
    E(22.5),
    P(10, 7.5),
    D(10),
    E(6.3),
    META('alto_largo', 12.2, { km: 12.2, g: 7.2 }),
  ], // 175 km
]
```

Los 29 esqueletos restantes no declaran alternativas: su variación entre ediciones es la de nivel 1 (motivos no firma, km ± 6 %, vueltas ± 1, motivo opcional y dibujo), que la sección 10 escribe.

### 5.6 Pesos: base, sesgo de terreno, clase y zona

El peso de un candidato es el producto de cuatro factores, y cada factor vive en un sitio distinto para que se pueda editar como dato:

`peso(id) = SKELETONS[id].pesoBase × SESGO_TERRENO[terrain][id] × ARCH.pesoPorClase[id][raceClass] × (geo.pesos[id] ?? 1)`

- **`pesoBase`** (columnas de §5.2 y §5.3): enteros, tomados de las columnas de pesos de banco §5.2 (`muros_encadenados` 0,55 en `flandes`, `montana_un_dia` 0,6 en `alpes`, `circuito_cotas` 0,3 a 0,6 donde no hay puertos) y de geografía §4.6 y §8 (`montana × un_dia × WT`: 0,9 / 0,08 / 0,02), normalizados a que el esqueleto más común de cada familia valga entre 20 y 30 y el raro entre 6 y 12. Son un juicio, como la tabla geográfica (decisión 16), y la galería (sección 16) es el instrumento para corregirlos.
- **`SESGO_TERRENO`**: la traducción de `RaceRow.terrain` (seis valores, `featureProfile.ts` l. 21; reparto de las 178 carreras de un día de tabla: hilly 83, flat 60, cobbles 19, mountain 10, classic 5, itt 1, mapa 02 §1) a candidatos de un día. Es sesgo y nunca orden (decisión de la sección 3): dice qué esqueletos entran en el sorteo y con qué multiplicador, y si la zona no admite ninguno (`requiere`), se baja un escalón. Solo aplica a `role: 'un_dia'`; las etapas de vuelta entran por `StageRole` (tabla de §5.7).

| `terrain`  | Candidatos (multiplicador)                                                                                          | Escalón si ninguno cabe en la zona                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `flat`     | `ud_esprint` ×1, `ud_esprint_capi` ×1, `ud_adoquin_ligero` ×0,5                                                     | (siempre cabe `ud_esprint`)                                                                                                   |
| `hilly`    | `ud_muros` ×1, `ud_circuito` ×1, `ud_muro_final` ×1, `ud_montana_media` ×1, `ud_muros_adoquin` ×1, `ud_sterrato` ×1 | `flat`                                                                                                                        |
| `classic`  | `ud_muros` ×1, `ud_muros_adoquin` ×1, `ud_circuito` ×0,5, `ud_muro_final` ×1, `ud_sterrato` ×1                      | `hilly`                                                                                                                       |
| `cobbles`  | `ud_adoquin` ×1, `ud_adoquin_ligero` ×1, `ud_muros_adoquin` ×1                                                      | `classic` (las 20 filas `cobbles` están en zonas con `adoquin ≥ 1`, mapa 07 §3: el escalón no se usa hoy y el test lo cuenta) |
| `mountain` | `ud_montana` ×4, `ud_montana_media` ×1, `ud_montana_alto` ×1, `ud_circuito` ×0,25                                   | `hilly` (un `mountain` en Dinamarca da `ud_circuito` con muros y se anota en `arch.frase`)                                    |
| `itt`      | `nc_crono` ×1                                                                                                       | (siempre cabe)                                                                                                                |

- **`ARCH.pesoPorClase`**: la tabla entera, esqueleto × clase (`RaceClass` de `uci.ts` l. 12: `WT`, `Pro`, `1`, `2`, `NC`). Un 0 es un veto de clase; los decimales son rarezas. `ud_montana_alto` vale 60 × 0,02 = 1,2 frente a 48 + 12 + 5 de sus compañeros de terreno `mountain` en .1, o sea el 1,8 % de esos sorteos, y con 10 filas `mountain` en todo el calendario lo esperado es que no aparezca ninguna: existe para la galería y para D1. Las columnas `NC` son 0 salvo `nc_ruta` y `nc_crono`, que son 0 fuera de `NC`: los 532 nacionales (mapa 02 §3) solo pueden salir de esos dos y ninguna carrera de equipos puede salir de ellos.

| Esqueleto                                                                                                                                                                       | WT  | Pro | .1   | .2   | NC  | Razón                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ---- | ---- | --- | ---------------------------------------------------------------- |
| `ud_esprint`, `ud_circuito`, `ud_muros`, `ud_adoquin_ligero`, `ud_montana_media`                                                                                                | 1   | 1   | 1    | 1    | 0   | existen en todas las clases (mapa 07 §4.1)                       |
| `ud_esprint_capi`                                                                                                                                                               | 1   | 1   | 0,5  | 0,25 | 0   | Sanremo es de 290 km; una .2 no                                  |
| `ud_muro_final`, `ud_muros_adoquin`, `ud_montana`                                                                                                                               | 1   | 1   | 1    | 0,5  | 0   | en .2 la mitad de frecuentes: 140 a 180 km                       |
| `ud_sterrato`                                                                                                                                                                   | 1   | 1   | 0,5  | 0,25 | 0   | tres carreras reales                                             |
| `ud_adoquin`                                                                                                                                                                    | 1   | 1   | 0,5  | 0,5  | 0   | en .2 solo con `adoquin ≥ 2`, que ya exige `requiere` (§B.3)     |
| `ud_montana_alto`                                                                                                                                                               | 0   | 0   | 0,02 | 0    | 0   | decisión 37 y D1                                                 |
| `ud_criterium`                                                                                                                                                                  | 0   | 0   | 0    | 0    | 0   | D5 (peso 0 hasta decisión del dueño)                             |
| `nc_ruta`, `nc_crono`                                                                                                                                                           | 0   | 0   | 0    | 0    | 1   | solo campeonatos                                                 |
| `et_llana`, `et_llana_viento`, `et_media_valle`, `et_media_alto`, `et_media_tendida`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_blanda`, `et_crono`, `et_prologo` | 1   | 1   | 1    | 1    | 0   |                                                                  |
| `et_media_muro`, `et_reina_valle`                                                                                                                                               | 1   | 1   | 1    | 0,7  | 0   |                                                                  |
| `et_reina_alto_largo`, `et_montana_corta`                                                                                                                                       | 1   | 1   | 0,7  | 0,4  | 0   | los finales de 15 a 22 km son de gran vuelta y WT (mapa 07 §4.3) |
| `et_reina_encadenada`, `et_cronoescalada`                                                                                                                                       | 1   | 0,7 | 0,4  | 0    | 0   | Dolomitas y Peyragudes no bajan de Pro                           |

- **`geo.pesos`** (`GeoSignature.pesos`, sección 6): multiplicador por zona con 1 por defecto; los valores decididos son `flandes` {`ud_muros_adoquin`: 3, `ud_circuito`: 0,5}, `andes` {`et_reina_valle`: 2, `et_reina_alto_largo`: 1,5}, `italia_centro` {`ud_sterrato`: 2}, `francia_norte` {`ud_adoquin`: 2} (arquitectura §5.2 más dos filas que los pesos base solos no sostienen: sin ellas Strade saldría en Bretaña tanto como en Toscana).

### 5.7 Cómo se elige un esqueleto (subflujo `arch|raceId`)

Una sola tirada por carrera de un día y una por etapa de vuelta, todas sobre el mismo flujo `routeRng('arch|' + raceId)` consumido en orden de `stageIndex`, sin `season` (decisión 22): el esqueleto es identidad. El sorteo es proporcional a `peso(id)` de §5.6 sobre los candidatos, y los candidatos salen de esta función pura, que vive en `skeletons.ts` junto al catálogo:

```ts
export function candidatos(
  req: Pick<StageRequest, 'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km'>,
): { id: SkeletonId; peso: number }[] {
  const porPapel: Record<StageRole, SkeletonId[]> = {
    llana: ['et_llana'],
    llana_viento: ['et_llana_viento'],
    media: ['et_media_valle', 'et_media_tendida'],
    media_alto: ['et_media_alto'],
    media_muro: ['et_media_muro'],
    reina_alto: ['et_reina_alto_largo', 'et_reina_alto_corto'],
    reina_valle: ['et_reina_valle', 'et_reina_cima_cerca'],
    reina_encadenada: ['et_reina_encadenada'],
    montana_corta: ['et_montana_corta'],
    cri: ['et_crono'],
    prologo: ['et_prologo'],
    cronoescalada: ['et_cronoescalada'],
  }
  const escalon: Partial<Record<StageRole, StageRole>> = {
    llana_viento: 'llana',
    media_muro: 'media_alto',
    media_alto: 'media',
    reina_encadenada: 'reina_alto',
    montana_corta: 'reina_alto',
    reina_valle: 'reina_alto',
    reina_alto: 'media_alto',
    cronoescalada: 'cri',
  }
  const cabe = (id: SkeletonId) =>
    admite(req.geo, SKELETONS[id].requiere) && ARCH.pesoPorClase[id][req.raceClass] > 0
  if (req.role === 'un_dia') {
    let terrain: RouteTerrain = req.terrain
    for (;;) {
      const set = SESGO_TERRENO[terrain]
      const out = (Object.keys(set) as SkeletonId[])
        .filter(cabe)
        .map((id) => ({ id, peso: peso(id, terrain, req) }))
      if (out.length > 0) return out
      terrain = ESCALON_TERRENO[terrain] // cobbles → classic → hilly → flat; mountain → hilly; flat e itt no bajan
    }
  }
  let role = req.role
  for (;;) {
    const out = porPapel[role].filter(cabe).map((id) => ({ id, peso: peso(id, null, req) }))
    if (out.length > 0) return out
    role = escalon[role] ?? 'llana' // `llana` siempre cabe
  }
}
```

Tres reglas completan la elección:

1. **La reina blanda no compite por peso.** Si `role` empieza por `reina_` y `SKELETONS.et_reina_blanda` cabe en la zona, ANTES del sorteo por pesos se tira `rand() < ARCH.reina.blandaShare[geo.relieve]` (media 0,25; montana 0,25; alta 0,10; 0 en llano y ondulado, donde no hay reina) y si sale, el esqueleto es `et_reina_blanda`. Así la cuota es exactamente la de la decisión 8 y no depende de cuántos compañeros tenga el papel.
2. **`nc_ruta` decide su `kind` por la zona.** `skeletonFor(id, geo)` devuelve `SKELETONS[id]` salvo para `nc_ruta`, donde si `geo.cota === null || geo.cota.km[1] < 3.3` devuelve una copia con `kind: 'clasica'`, `label: 'Classic'`, `finalKind` sin declarar, el hueco `cota` con `n: [0, 0]` y `canonico: NC_RUTA_CLASICA`. Es la única excepción a «un `kind` por esqueleto» y existe porque los 133 campeonatos comparten un solo identificador para el circuito nacional: un nacional belga sale `Classic` con muros adoquinados y uno colombiano `Hills` con una cota de 5 km, que es la promesa de `motor.md` §V.3.
3. **El kilometraje se recorta al esqueleto.** Para `role: 'un_dia'` sin `km` de fila, `firma|raceId` sortea `kmClase = U(min, min + rango)` sobre la fila `un día` de `ARCH.km.porClase[raceClass]` (WT [200; 260], Pro [180; 230], .1 [170; 210], .2 [140; 180], NC ruta [180; 240], NC sub-23 [140; 180]) y la etapa mide `clamp(kmClase, sk.km[0], min(sk.km[1], ARCH.km.maxPorClase[raceClass]))`; si el recorte deja el rango vacío (una `ud_montana` de [200; 260] en una .2 de [140; 180]), manda el extremo más cercano del esqueleto (180 → 200) y `arch.frase` lo dice. Para etapas de vuelta el `km` viene hecho de `kmDe` (sección 7) y el esqueleto lo acepta tal cual: sus rangos brutos cubren todas las bandas de clase de sus papeles.

El resultado de este paso es `arch.skeleton` de `GeneratedStage`, fijo para siempre para esa carrera y etapa, y con él la `frase` de arquitectura empieza a escribirse (sección 8): «Clásica de muros en Flandes: 16 muros en tres cadenas, el último a 13 km».

### 5.8 Qué esqueleto recibe cada etapa de edición sin rasgos

Las 226 etapas de edición sin rasgos reales (mapa 02 §9: 22 WT, 110 Pro, 49 .1, 45 .2) pasan hoy por `stagesFromEdition → oneDaySpec → mountainOneDay` (`calendar.ts` l. 216-227 y 143-152) y salen dibujadas con la plantilla de un día: Colombia e5 de `REAL_QUEENS` es una clásica de montaña disfrazada de reina de vuelta (sección 1). Con la gramática reciben SIEMPRE un esqueleto de etapa, por `EditionTerrain` (`editions.ts` l. 10: cinco valores, sin `classic`), con `routeSource: 'edicion'`, `km` como contrato y zona de `RACE_REGION[raceId].stages[i]` (sección 6):

| `EditionTerrain` | Papel equivalente                                                  | Esqueletos candidatos (sorteo de §5.7 con la zona de la etapa)                                                                                                  | Nota                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flat`           | `llana`                                                            | `et_llana`; `et_llana_viento` si `viento ≥ 2` (sorteo con pesos 30 y 12)                                                                                        |                                                                                                                                                                                 |
| `hilly`          | `media` (con `media_alto` y `media_muro` como candidatos añadidos) | `et_media_valle` 25, `et_media_alto` 20, `et_media_muro` 12, `et_media_tendida` 8, filtrados por `requiere`                                                     | el papel de edición no distingue «acaba arriba»: se sortea, y el esqueleto queda fijo (identidad)                                                                               |
| `mountain`       | `reina_alto` ∪ `reina_valle` (más `et_reina_blanda` por cuota)     | `et_reina_alto_largo` 20, `et_reina_alto_corto` 12, `et_reina_cima_cerca` 10, `et_reina_valle` 10, `et_montana_corta` 6 si `km ≤ 140`; blanda con `blandaShare` | si la zona tiene `puerto === null` (una etapa `mountain` en `flandes`), cae a `et_media_alto` y se anota como degradación de geografía, nunca a `ud_montana`                    |
| `itt`            | `cri`; `prologo` si `km ≤ 8`                                       | `et_crono`; `et_prologo`                                                                                                                                        | nunca `et_cronoescalada`: el `km` es contrato y la edición no declara final en alto                                                                                             |
| `cobbles`        | (un día)                                                           | `ud_adoquin_ligero`                                                                                                                                             | las 4 etapas `cobbles` de edición (mapa 02 §7) son la única excepción a «esqueleto de etapa», porque no existe `et_adoquin` y el adoquín de etapa real es exactamente un Denain |

El reparto por terreno de las 226 no está medido en los mapas (mapa 02 §7 da el de las 384 etapas de edición: hilly 163, flat 95, mountain 95, itt 26, cobbles 4); `routeCensus` lo imprime en el paso 0 (sección 13) y `skeletons.test.ts` sella que ninguna etapa `edicion` recibe un `ud_*` salvo `cobbles → ud_adoquin_ligero`.

### 5.9 Tests de `grammar/skeletons.test.ts` (paso 4 del plan)

Se escriben antes que el catálogo y fallan hasta que existe. Corren en `test:rapido`; la parte de 60 semillas tarda segundos (≤ 12 motivos y ≤ 80 segmentos por etapa, sin `sampleProfile`, sección 14). `SKELETON_IDS` es la lista literal de la unión `SkeletonId`; `ZONA_DE_REFERENCIA` es una tabla del test con la zona de la columna «Referencia real» de cada esqueleto; `requestDePrueba`, `requestDe`, `requestDeFila`, `casos`, `semillas` y `p95` son auxiliares del propio fichero de test (construyen un `StageRequest` completo, con `fixed.skeleton` donde se indica), y `RACE_ROWS` es la tabla de `calendar.ts` l. 381-398 exportada para tests.

```ts
describe('catálogo', () => {
  it('tiene exactamente los identificadores de SkeletonId', () => {
    expect(Object.keys(SKELETONS).sort()).toEqual([...SKELETON_IDS].sort()) // 15 ud_/nc_ + 16 et_ = 31
  })
  it.each(Object.values(SKELETONS))('$id está bien formado', (sk) => {
    for (const s of sk.slots) {
      expect(s.n[0]).toBeLessThanOrEqual(s.n[1])
      expect(s.ventana[0]).toBeLessThanOrEqual(s.ventana[1])
      expect(s.ventana[0]).toBeGreaterThanOrEqual(0)
      expect(s.ventana[1]).toBeLessThanOrEqual(1)
    }
    expect(sk.dPlus[0]).toBeLessThan(sk.dPlus[1])
    expect(sk.km[0]).toBeLessThan(sk.km[1])
    expect(sk.pesoBase).toBeGreaterThan(0)
    if (sk.kind === 'llana')
      expect(sk.slots.every((s) => ['enlace', 'expuesto', 'tendida'].includes(s.motif))).toBe(true)
    if (sk.kind === 'media') expect(sk.dPlus[1]).toBeLessThanOrEqual(3200)
    expect(Object.keys(ARCH.pesoPorClase[sk.id])).toEqual(['WT', 'Pro', '1', '2', 'NC'])
  })
})

describe('plantilla canónica', () => {
  it.each(Object.values(SKELETONS))(
    '$id: pasa los vetos y da su kind y su finalKind sin RNG',
    (sk) => {
      const geo = ZONAS[ZONA_DE_REFERENCIA[sk.id]] // alpes para ud_montana, flandes para ud_muros_adoquin, italia_centro para ud_sterrato...
      const req = requestDePrueba(sk, geo) // km = Σ canonico, raceClass WT (NC para nc_*), format según el id
      const profile = renderSkeleton(sk.canonico, req)
      expect(Math.abs(profileKm(profile) - req.km)).toBeLessThan(0.05)
      expect(verify(profile, sk, req, sk.canonico)).toBeNull()
      expect(stageKindOf(profile, sk.kind === 'cri')).toEqual({ kind: sk.kind, label: sk.label })
      if (sk.finalKind) expect(finalKindOf(profile)).toBe(sk.finalKind)
      for (const alt of sk.alternativas ?? []) {
        const p2 = renderSkeleton(alt, {
          ...req,
          km: alt.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0),
        })
        expect(verify(p2, sk, req, alt)).toBeNull()
        expect(stageKindOf(p2, sk.kind === 'cri').kind).toBe(sk.kind)
        if (sk.finalKind) expect(finalKindOf(p2)).toBe(sk.finalKind)
      }
    },
  )
  it('nc_ruta en flandes es clasica / Classic con NC_RUTA_CLASICA', () => {
    const sk = skeletonFor('nc_ruta', ZONAS.flandes)
    expect(sk.kind).toBe('clasica')
    expect(sk.canonico).toBe(NC_RUTA_CLASICA)
    expect(
      stageKindOf(renderSkeleton(sk.canonico, requestDePrueba(sk, ZONAS.flandes)), false).label,
    ).toBe('Classic')
  })
})

describe('esqueleto × km × semillas × zonas compatibles (V6 y V7)', () => {
  // 5 km por esqueleto (los extremos y tres intermedios de sk.km), 60 semillas, todas las zonas donde admite(geo, requiere)
  it.each(casos())('$id en $zona con $km km', ({ sk, zona, km }) => {
    const salidas = semillas(60).map((s) =>
      generateStage(requestDe(sk, zona, km, s, { fixed: { skeleton: sk.id } })),
    )
    const degradadas = salidas.filter((g) => g.arch.degradado).length
    expect(degradadas / 60).toBeLessThanOrEqual(ARCH.veto.fallbackMaxShare.testPorEsqueleto) // 0,005 → 0 de 60
    expect(p95(salidas.map((g) => g.arch.intentos))).toBeLessThanOrEqual(ARCH.veto.intentosP95) // 3
    for (const g of salidas) {
      expect(g.kind).toBe(sk.kind)
      expect(g.label).toBe(sk.label) // V6
      if (sk.finalKind) expect(g.arch.finalKind).toBe(sk.finalKind) // V7
      expect(g.arch.dPlus).toBeGreaterThanOrEqual(sk.dPlus[0] * 0.9)
      expect(g.arch.dPlus).toBeLessThanOrEqual(sk.dPlus[1] * 1.1)
    }
  })
})

describe('candidatos y pesos', () => {
  it('nunca devuelve vacío para ninguna (terrain, zona, clase) del calendario', () => {
    for (const row of RACE_ROWS)
      for (const cls of RACE_CLASSES)
        expect(candidatos(requestDeFila(row, cls)).length).toBeGreaterThan(0)
  })
  it('mountain en una zona sin puerto baja a hilly y nunca da ud_montana', () => {
    const ids = candidatos({
      role: 'un_dia',
      terrain: 'mountain',
      geo: ZONAS.flandes,
      raceClass: 'Pro',
      format: 'un-dia',
      km: 200,
    }).map((c) => c.id)
    expect(ids).not.toContain('ud_montana')
    expect(ids).toContain('ud_muros')
  })
  it('ud_montana_alto pesa 60 × 0,02 y solo en .1', () => {
    expect(ARCH.pesoPorClase.ud_montana_alto).toEqual({ WT: 0, Pro: 0, '1': 0.02, '2': 0, NC: 0 })
  })
  it('las 20 filas cobbles no usan el escalón classic', () => {
    for (const row of RACE_ROWS.filter((r) => r.terrain === 'cobbles'))
      expect(candidatos(requestDeFila(row, row.class)).map((c) => c.id)).toContain(
        'ud_adoquin_ligero',
      )
  })
  it('un nacional solo sale de nc_ruta o nc_crono, y ninguna carrera de equipos sale de ellos', () => {
    for (const code of Object.keys(COUNTRIES)) {
      const ids = candidatos({
        role: 'un_dia',
        terrain: 'hilly',
        geo: ZONAS[zonaDe(code)],
        raceClass: 'NC',
        format: 'un-dia',
        km: 210,
      }).map((c) => c.id)
      expect(ids).toEqual(['nc_ruta'])
    }
    for (const cls of ['WT', 'Pro', '1', '2'] as const)
      expect(
        candidatos({
          role: 'un_dia',
          terrain: 'hilly',
          geo: ZONAS.ardenas,
          raceClass: cls,
          format: 'un-dia',
          km: 200,
        }).map((c) => c.id),
      ).not.toContain('nc_ruta')
  })
  it('la reina blanda sale con la cuota de ARCH.reina.blandaShare', () => {
    const n = 4000
    const blandas = semillas(n).filter(
      (s) =>
        generateStage(
          requestDe(SKELETONS.et_reina_alto_largo, 'pirineos', 160, s, { role: 'reina_alto' }),
        ).arch.skeleton === 'et_reina_blanda',
    ).length
    expect(blandas / n).toBeGreaterThan(0.07)
    expect(blandas / n).toBeLessThan(0.13) // alta: 0,10
  })
})

describe('etapas de edición', () => {
  it('reciben esqueletos de etapa, salvo cobbles → ud_adoquin_ligero', () => {
    for (const [id, ed] of Object.entries(RACE_EDITIONS))
      ed.stages.forEach((st, i) => {
        if (STAGE_FEATURES[id]?.[i]) return
        const g = stagesForSeason(id, BASE_SEASON)[i]
        expect(g.routeSource).toBe('edicion')
        if (st.terrain === 'cobbles') expect(g.arch.skeleton).toBe('ud_adoquin_ligero')
        else expect(g.arch.skeleton.startsWith('et_')).toBe(true)
        expect(Math.abs(profileKm(g.profile) - st.km)).toBeLessThan(0.05) // calendar.test.ts l. 162-174
      })
  })
  it('Colombia e5 de REAL_QUEENS ya no es una clásica de montaña', () => {
    const g = stagesForSeason('race-colombia', BASE_SEASON)[4]
    expect(g.arch.skeleton).toMatch(/^et_reina_/)
    expect(g.kind).toBe('reina')
  })
})
```

Lo que estos tests NO miden, a propósito: `finishType` (V16, solo en `routeCensus`, decisión 4), el reparto real de esqueletos en el calendario (bandas de variedad de la sección 13: ≥ 8 esqueletos distintos por clase en WT, entropía ≥ 1,5 bits por zona) y la plausibilidad de los pesos a ojo del dueño (galería, sección 16).

---

## 6. La geografía: zonas, territorios y RACE_REGION

Hoy el país existe en el calendario y no llega al generador: `buildRace` lo calcula en `calendar.ts` l. 889 (`row.country ?? RACE_COUNTRY[row.id]`) y no lo pasa a ninguna de las tres ramas (mapa 02 §1 y §6: «el país NO entra en ningún generador de recorrido»); dentro del motor solo lo lee el clima (`climateOf`, `world/climate.ts` l. 166). Esta sección escribe la tabla que faltaba, en tres capas y con tres ficheros: `ZONAS` (qué existe en cada sitio, `grammar/geo.ts`), `TERRITORIOS` (por qué zonas pasa un país y dónde está su reina, `grammar/geo.ts`) y `RACE_REGION` (en qué zona corre cada carrera y cada etapa, `grammar/regions.ts`). Los tipos son los de la sección 3 (`GeoZone`, `Relieve`, `GeoSignature`, `Territorio`, `RaceRegion`) y no se repiten aquí salvo donde hace falta fijar una semántica.

### 6.1 Qué es DATO y qué es JUICIO

Se dice con esas palabras porque los tres jueces lo señalaron como el riesgo principal (`juicios/cobertura.md` §5 riesgo 1; `juicios/motor.md` §5 riesgo 7; `juicios/ejecutabilidad.md` §5 riesgo 1): la tabla geográfica sale del mapa 07 §3, que se declara orientativo, y no hay validación externa posible (PCS y Overpass vetados, `docs/fuentes-recorridos.md`, mapa 05 §6).

Es DATO, y por tanto no se discute ni se ajusta a ojo:

1. Las 20 filas `terrain: 'cobbles'` del calendario (grep sobre `calendar.ts`, medido en mapa 07 §3 consecuencia 1 y comprobado de nuevo: 20). Las 20 caen en Bélgica, norte de Francia, Reino Unido o Véneto, es decir, en zonas con adoquín o tierra; ningún dato existente choca con la tabla.
2. Las ciudades de salida y meta de `raceRoutes.ts` (`RACE_ROUTES`, l. 11): 310 claves, una por carrera de equipos, sin huérfanas (mapa 02 §8). Son reales aunque el relieve que hoy se dibuja debajo sea inventado; son la única fuente de la curación de `RACE_REGION` (§6.4).
3. Las 177 etapas con rasgos (`STAGE_FEATURES`, `stageFeatures.ts` l. 15) y las 3 grandes vueltas de `RACE_EDITIONS` (`editions.ts` l. 25; 60 ediciones en total, medido con grep). No pasan por esta tabla: su origen es `real` y su huella se sella antes de tocar `calendar.ts` (sección 11).

Es JUICIO todo lo demás: cada rango de `ZONAS`, cada `null`, cada peso, cada `ruta` y cada `cordillera` de `TERRITORIOS`, y la zona que `RACE_REGION` asigna a cada carrera. El juicio se sostiene con tres instrumentos, y no con una fuente: la fila del mapa 07 §3 citada en el comentario de cada zona (la columna «fila» de §6.2), los tests de consistencia interna de §6.8 (que no prueban que la tabla sea verdad, sino que no se contradice y que cabe en `ARCH`), y la galería de la sección 16, que es donde el dueño juzga 30 zonas y 32 esqueletos en una tarde con tres preguntas por perfil. Cuando la galería diga que algo no existe en un sitio, lo que se edita es una fila de `ZONAS`, de `TERRITORIOS` o de `RACE_REGION`: datos, nunca código.

### 6.2 Las 29 zonas: `ZONAS`

`ZONAS: Record<GeoZone, GeoSignature>` tiene 30 filas: las 29 zonas con nombre más `generico`, que es la firma de un país sin territorio. Las 25 firmas del mapa 07 §3 se funden en 29 porque Italia, España y Francia son varias geografías cada una (125 de 310 carreras, `arquitectura.md` §3.5), y `italia_sur` se separa de `italia_centro` porque el mapa 07 fila 3.4 describe colinas y muros para Toscana y Marcas y solo admite «puertos de 20 km salvo Abruzos»: los Abruzos (Blockhaus, Prati di Tivo, Gran Sasso a 2.130 m) no caben en una zona `media`.

Reglas de lectura de la tabla, que son también las reglas del fichero:

- Todo rango es `[min; max]` y está CONTENIDO en el rango del motivo en `ARCH` (sección 12): `puerto.km ⊆ [9; 25]`, `puerto.g ⊆ [5; 9]`, `cota.km ⊆ [2,5; 8]`, `cota.g ⊆ [4; 7]`, `muro.km ⊆ [0,4; 3]`, `muro.g ⊆ [8; 16]`, `amplitud ≤ 2,4`. Lo que la geografía hace es estrechar, nunca ampliar; por eso Ghisallo (8,6 km) sale como 9,0 en `italia_norte` (el hueco [8,0; 9,0] asumido en la sección 12) y Alto de Letras (80 km, fila 3.20) no existe en E1 (techo 25 km de `ARCH.motivo.puerto.km`).
- `null` significa «aquí no existe» y lo hacen cumplir V1 (puerto), V2 (adoquín) y V3 (sterrato) sobre el perfil final, además de `admite()` sobre el esqueleto antes de dibujar (§6.5). `cota: null` es el pólder y el desierto: Flandes, norte de Francia, Golfo, cono sur.
- `finalesAlto` es un solo valor con orden: `'largo'` implica que también existe el corto (`alto_corto` requiere `corto` o `largo`; `alto_largo` requiere `largo`); `'ninguno'` prohíbe `et_media_alto` y `et_reina_*` con meta en alto.
- `relieve` es el techo: `llano < ondulado < media < montana < alta`. `et_reina_*`, `et_montana_corta` y `ud_montana` requieren `montana` o más; `et_reina_blanda` no (ver `cono_sur`).
- `viento` y `altitud` son METADATOS: viajan a `arch.metadatos` y a la ficha, y `altitud` además alimenta V4; ninguno llega al motor (§6.7).
- `pesos` multiplica `Skeleton.pesoBase` (sección 5); lo que no aparece vale 1; 0 prohíbe.

| Zona (fila mapa 07)                                     | relieve  | puerto km × %, forma           | cota km × %         | muro km × %, adoquín               | adoquín | sterrato    | viento | altitud   | amplitud | finalesAlto | pesos (≠ 1)                                                                                      |
| ------------------------------------------------------- | -------- | ------------------------------ | ------------------- | ---------------------------------- | ------- | ----------- | ------ | --------- | -------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `flandes` (3.1: BE, NL)                                 | ondulado | null                           | null                | [0,4; 2,2] × [8; 14], sí           | 3       | no          | 3      | mar       | 0,55     | ninguno     | ud_muros_adoquin 3, ud_muros 2, et_media_muro 2, et_llana_viento 2, ud_circuito 0,5              |
| `ardenas` (3.2: BE sur, LU)                             | media    | null                           | [2,5; 4,5] × [5; 7] | [0,8; 2,0] × [8; 13], no           | 1       | no          | 1      | colina    | 0,85     | corto       | ud_muro_final 2, ud_montana_media 1,5, et_media_muro 1,5, et_media_alto 1,2                      |
| `bretana` (3.13)                                        | ondulado | null                           | [2,5; 3,0] × [5; 7] | [0,5; 2,0] × [8; 10], no           | 1       | sí (tierra) | 3      | colina    | 0,7      | ninguno     | ud_circuito 1,5, ud_adoquin_ligero 1,5, et_llana_viento 1,5                                      |
| `francia_norte` (3.1, 1.4)                              | llano    | null                           | null                | [0,5; 1,5] × [8; 10], sí           | 2       | no          | 2      | mar       | 0,55     | ninguno     | ud_adoquin 3, ud_adoquin_ligero 2, ud_esprint 1,5, et_llana_viento 1,5                           |
| `macizo_central` (3.14)                                 | montana  | [9; 17] × [6; 8], irregular    | [2,5; 6] × [5; 7]   | [1; 2] × [8; 12], no               | 0       | no          | 1      | media     | 1,0      | largo       | et_media_valle 1,5, et_media_alto 1,5, ud_montana_media 1,5, et_reina_alto_corto 1,2             |
| `alpes` (3.5: FR, IT, CH, AT)                           | alta     | [12; 25] × [5,5; 8,5], regular | [4; 8] × [5; 7]     | null                               | 0       | no          | 0      | alta      | 1,15     | largo       | et_reina_alto_largo 2, et_reina_valle 1,3, et_reina_encadenada 1,2, et_llana 0,5                 |
| `pirineos` (3.6: FR, ES, AD)                            | alta     | [10; 17] × [7; 8,5], regular   | [4; 8] × [6; 7]     | null                               | 0       | no          | 0      | alta      | 1,15     | largo       | et_reina_encadenada 2, et_reina_alto_largo 1,5, et_reina_alto_corto 1,2                          |
| `provenza` (3.15)                                       | montana  | [15; 22] × [6,5; 7,5], regular | [2,5; 8] × [5; 7]   | [1; 2] × [8; 9], no                | 0       | no          | 3      | media     | 0,9      | largo       | et_llana_viento 2, et_media_valle 1,3                                                            |
| `italia_norte` (3.3)                                    | montana  | [9; 13] × [6; 8], irregular    | [4; 8] × [6; 7]     | [1; 2] × [10; 16], no              | 1       | no          | 0      | media     | 1,0      | corto       | ud_montana 2, ud_esprint_capi 2, ud_montana_media 1,5, et_reina_alto_corto 1,3                   |
| `italia_centro` (3.4)                                   | media    | null                           | [2,5; 6] × [5; 7]   | [0,5; 2,1] × [9; 14], no           | 0       | sí          | 1      | colina    | 0,9      | corto       | ud_sterrato 3, ud_muro_final 2, et_media_muro 1,5, ud_circuito 1,3                               |
| `dolomitas` (3.7)                                       | alta     | [9; 14] × [7,5; 9], progresiva | [4; 8] × [6; 7]     | null                               | 0       | no          | 0      | alta      | 1,15     | largo       | et_reina_alto_corto 2, et_reina_encadenada 1,5, et_montana_corta 1,5                             |
| `italia_sur` (3.4 Abruzos; Lazio, Calabria, Cerdeña)    | montana  | [9; 16] × [5; 8], progresiva   | [2,5; 7] × [5; 7]   | [0,5; 2] × [8; 12], no             | 0       | no          | 2      | media     | 0,9      | largo       | et_media_valle 1,3, ud_montana_media 1,3, et_reina_alto_largo 1,2                                |
| `cantabrico` (3.8)                                      | montana  | [9; 15] × [7; 9], irregular    | [3; 8] × [6; 7]     | [1; 3] × [10; 15], no              | 0       | no          | 1      | media     | 1,1      | largo       | et_reina_alto_corto 2, et_media_muro 1,5, ud_montana 1,5, et_llana 0,3                           |
| `meseta` (3.9)                                          | ondulado | null                           | [3; 8] × [4; 6]     | null                               | 0       | no          | 3      | altiplano | 0,6      | corto       | et_llana_viento 2, et_media_tendida 2, ud_esprint 1,5                                            |
| `andalucia` (3.10)                                      | montana  | [9; 20] × [6; 8], regular      | [4; 8] × [5; 7]     | [1; 2] × [8; 11], no               | 0       | no          | 2      | alta      | 0,9      | largo       | et_media_alto 1,5, et_reina_alto_largo 1,3, et_llana 1,2                                         |
| `levante` (3.11)                                        | media    | [9; 22] × [5; 7], regular      | [3; 6] × [6; 7]     | [1; 3] × [10; 12], no              | 0       | no          | 1      | media     | 0,9      | corto       | et_media_alto 2, ud_muro_final 1,3, et_media_muro 1,2                                            |
| `portugal` (3.12)                                       | montana  | [9; 20] × [5; 7], regular      | [3; 8] × [6; 7]     | [1; 2,6] × [8; 10], no             | 1       | no          | 2      | media     | 0,9      | largo       | et_media_alto 1,3, et_reina_alto_largo 1,2, et_llana_viento 1,2                                  |
| `centroeuropa` (3.16)                                   | media    | [9; 12] × [5; 8], regular      | [2,5; 6] × [5; 7]   | [1; 2] × [8; 10], no               | 1       | no          | 1      | colina    | 0,85     | corto       | et_media_valle 1,5, ud_circuito 1,3, et_media_alto 1,2                                           |
| `escandinavia` (3.17)                                   | ondulado | null                           | [2,5; 7] × [5; 7]   | [0,5; 1,0] × [8; 10], no           | 1       | no          | 3      | mar       | 0,6      | corto       | et_llana_viento 2, ud_esprint 1,5, ud_circuito 1,3                                               |
| `britanicas` (3.18)                                     | media    | null                           | [2,5; 8] × [6; 7]   | [0,4; 1,0] × [10; 16], sí (urbano) | 1       | sí (tierra) | 3      | colina    | 0,9      | corto       | ud_circuito 1,5, et_media_alto 1,3, et_media_muro 1,3                                            |
| `balcanes` (3.19)                                       | montana  | [10; 23] × [5; 7], regular     | [3; 8] × [5; 7]     | null                               | 0       | no          | 2      | media     | 0,9      | largo       | et_reina_alto_largo 1,3, et_llana 1,2, et_media_valle 1,2                                        |
| `anatolia` (3.19: TR, CY, AZ)                           | montana  | [15; 21] × [6; 7], regular     | [3; 8] × [5; 7]     | null                               | 0       | no          | 2      | media     | 0,8      | largo       | et_reina_alto_largo 1,5, et_llana 1,5, et_llana_viento 1,2                                       |
| `andes` (3.20)                                          | alta     | [15; 25] × [5; 7], regular     | [5; 8] × [5; 7]     | null                               | 0       | no          | 0      | altiplano | 1,0      | largo       | et_reina_valle 2, et_reina_alto_largo 1,5, et_media_tendida 1,5, et_llana 0,3, et_llana_viento 0 |
| `cono_sur` (3.21)                                       | llano    | [20; 25] × [5; 6], regular     | null                | null                               | 0       | no          | 3      | media     | 0,6      | largo       | et_llana_viento 2, et_llana 1,5, et_reina_blanda 1                                               |
| `norteamerica` (3.22)                                   | media    | [10; 25] × [5; 9], regular     | [2,5; 6] × [6; 7]   | [0,4; 1,8] × [8; 10], no           | 0       | no          | 2      | media     | 0,9      | corto       | ud_circuito 2, et_media_alto 1,3, et_llana 1,2                                                   |
| `australia` (3.23)                                      | ondulado | null                           | [2,5; 3,5] × [6; 7] | [0,5; 1,1] × [9; 11], no           | 0       | no          | 3      | colina    | 0,7      | corto       | ud_circuito 2, et_media_alto 1,5, et_llana_viento 1,5                                            |
| `asia_oriental` (3.24)                                  | media    | [9; 14] × [6; 9], regular      | [2,5; 5] × [6; 7]   | null                               | 0       | no          | 1      | colina    | 0,8      | corto       | ud_circuito 2, et_llana 1,5, et_media_alto 1,2                                                   |
| `golfo` (3.25)                                          | llano    | null                           | [2,5; 7] × [5; 7]   | null                               | 0       | no          | 3      | mar       | 0,4      | corto       | et_llana_viento 3, et_llana 2, et_media_alto 1, et_media_valle 0,2                               |
| `africa_llana` (3.24, 3.25: BJ, BF, CM, DZ, MA, MU, RW) | ondulado | null                           | [2,5; 4] × [4; 7]   | null                               | 0       | no          | 2      | colina    | 0,7      | corto       | ud_circuito 1,5, et_llana 1,5, ud_esprint 1,5                                                    |
| `generico` (sin fila)                                   | ondulado | null                           | [2,5; 6] × [4; 7]   | [1; 2] × [8; 10], no               | 0       | no          | 1      | colina    | 0,85     | corto       | (todo 1)                                                                                         |

Diferencias respecto de la tabla de `arquitectura.md` §5.1, con su porqué, para que nadie las tome por erratas:

- `flandes`, `francia_norte`, `golfo` y `cono_sur` pasan a `cota: null`. En pólder y desierto no hay subidas de 2,5 km al 4 %; lo que hay son muros (Flandes) o nada. Cauberg (1,2 km × 5,8 %) y Kwaremont quedan por debajo del suelo de 8 % de `ARCH.motivo.muro.g` y no se dibujan: es un sacrificio consciente de la sección 4, no de esta tabla.
- `meseta` y `britanicas` pierden el puerto: sus rangos de arquitectura ([6; 10] y [6; 9] km) casi no intersecan el suelo de 9,0 km. Navacerrada (10 × 6) y Bealach na Bà (9 × 6) se dibujan como `cota` de 8 km; Bola del Mundo (3 × 12) es `alto_corto`.
- `escandinavia` es una sola zona para Dinamarca y Noruega, cuando el mapa 07 fila 3.17 describe dos relieves. Se resuelve con `cota` hasta 7 km (los [3; 10] km noruegos) y `puerto: null` (Noruega no tiene reina: `cordillera: null` en §6.3); el coste es que una etapa danesa puede llevar una cota de 7 km, y la galería es donde se decide si duele.
- `portugal` sube a `montana` con `finalesAlto: 'largo'` porque la Torre (Estrela, de 20 a 30 km al [5; 6] %, fila 3.12) es la reina de la Volta y `cordillera` exige `montana` o `alta` (§6.8, test d).
- `italia_norte` gana `adoquin: 1` (urbano) para que Veneto Classic, fila `cobbles` en Bassano («tierra y adoquín urbano», mapa 07 §3 consecuencia 1), resuelva sin salirse del dato.
- `golfo` pierde el jebel largo: `finalesAlto: 'corto'` y `puerto: null`. La razón es la decisión 13 de la síntesis, que sella en test «0 reinas en BE, NL, DK, AE, AU» y D8 (sección 18, aceptada por defecto): Jebel Hafeet (10,8 × 6,6) se dibuja como `alto_corto` de 7 km al 7 %; Jebel Jais (20 km) no existe en E1 y se anota en la sección 17.
- `asia_oriental` topa el puerto en 14 km, porque su `altitud` es `colina` y V4 prohíbe `puerto ≥ 15 km` fuera de `{media, alta, altiplano}` (decisión 24). Los puertos de 20 a 40 km al [3; 4] % de Qinghai (fila 3.24) son `tendida`, no `puerto`.
- `cono_sur` es la corrección del bug AR/CL que señaló `juicios/ejecutabilidad.md` §2.2: la propuesta de geografía declaraba `cordillera: 'desierto_andino'` con `puerto: null` y relieve llano, y su propio test lo habría cazado. Aquí `cono_sur` es `llano`, con `puerto` [20; 25] × [5; 6] (Alto Colorado 20 × 5, Farellones 30 × 6 topado a 25) y `finalesAlto: 'largo'`, y AR y CL llevan `cordillera: null`. La única reina posible en un territorio sin cordillera es `et_reina_blanda` (kind `reina`, D+ [1.500; 2.500], `alto_largo` de [9; 12] km, decisión 8), cuyo `requiere` es `{ puerto: non-null, finalesAlto: 'largo' }` sin exigir relieve; la composición (sección 7) la ofrece como máximo UNA vez por vuelta cuando `Territorio.cordillera === null` y alguna zona de la ruta tiene `finalesAlto: 'largo'` (hoy solo `cono_sur`), y el test de §6.8 sella «AR y CL: ≤ 1 reina por vuelta, siempre `alto`». Para `golfo` esa puerta está cerrada por D8.

### 6.3 Los territorios: `TERRITORIOS`

Un territorio es la ruta ordenada de zonas por las que pasa un país y la zona donde cae su reina. `ruta` es un recorrido plausible (la composición de la sección 7 toma una ventana contigua de ella con `ARCH.itinerario.avance` 0,6); `peso` reparte las carreras de un día del país cuando `RACE_REGION` no las coloca (solo los nacionales, §6.6); `cordillera: null` es un veto estructural: el país no tiene etapa reina y su etapa decisiva es `media_alto` sobre una cota o `media_muro` (Benelux Tour, mapa 07 §2.2).

Regla de cobertura: los 56 países con carreras de equipos (mapa 02 §10, lista literal en el test) llevan fila escrita y el test exige que ninguno sea `fallback`. Se añaden 8 filas voluntarias para países cuya zona existe con nombre en `ZONAS` (AR, CL, NZ, IE, SE, FI, LV, QA): 64 filas explícitas. Los 69 países restantes de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13, 133 entradas medidas con grep) caen a `FALLBACK = { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }` y el test imprime cuántos (69) sin banda. El fallback es deliberadamente mediocre: un país del que no se sabe nada produce carreras del montón, y la marca lo hace visible. Deducir el relieve de `PAIS_ZONA` de `climate.ts` (l. 66) se descarta porque `tropical` junta a Colombia con Benín (`geografia.md` §5.4).

| Países                         | `ruta` (zona × peso, en orden de recorrido)                                   | `cordillera` |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------ |
| FR                             | bretana 3, francia_norte 3, macizo_central 2, alpes 3, provenza 2, pirineos 2 | alpes        |
| BE                             | flandes 4, ardenas 3                                                          | null         |
| NL                             | flandes 1                                                                     | null         |
| LU                             | ardenas 1                                                                     | null         |
| IT                             | italia_norte 3, dolomitas 2, italia_centro 3, italia_sur 2                    | dolomitas    |
| ES                             | cantabrico 3, meseta 3, andalucia 2, levante 3, pirineos 2                    | pirineos     |
| AD                             | pirineos 1                                                                    | pirineos     |
| PT                             | portugal 1                                                                    | portugal     |
| DE, CZ, SK, HU, PL             | centroeuropa 1                                                                | null         |
| AT, SI, CH                     | alpes 2, centroeuropa 2                                                       | alpes        |
| DK, EE, LT, SE, FI, LV         | escandinavia 1                                                                | null         |
| NO                             | escandinavia 1                                                                | null         |
| GB, IE                         | britanicas 1                                                                  | null         |
| HR, BA, RS, RO, BG, AL, XK, GR | balcanes 1                                                                    | balcanes     |
| TR, CY, AZ                     | anatolia 1                                                                    | anatolia     |
| CO, EC, VE, GT                 | andes 1                                                                       | andes        |
| AR, CL                         | cono_sur 1                                                                    | null         |
| US, CA                         | norteamerica 1                                                                | null         |
| AU, NZ                         | australia 1                                                                   | null         |
| JP, KR, TW, TH, IN, MY, CN     | asia_oriental 1                                                               | null         |
| AE, SA, OM, QA                 | golfo 1                                                                       | null         |
| RW, BF, BJ, CM, MU, MA, DZ     | africa_llana 1                                                                | null         |
| los otros 69 de `COUNTRIES`    | `FALLBACK`                                                                    | null         |

Consecuencias que conviene leer en voz alta antes de aceptarlas (D8, sección 18, valor por defecto «se acepta»): una vuelta belga, neerlandesa, danesa, noruega, británica, polaca, alemana, australiana, japonesa, estadounidense o del Golfo NO tiene reina; una vuelta colombiana no tiene etapa llana de pólder (`et_llana_viento` a 0 en `andes`); una vuelta argentina tiene como mucho un final largo por edición.

```ts
// packages/engine/src/routes/grammar/geo.ts
export const FALLBACK: Territorio = {
  ruta: [{ zona: 'generico', peso: 1 }],
  cordillera: null,
  fallback: true,
}
export function territorioDe(country: string | undefined): Territorio // TERRITORIOS[country] ?? FALLBACK
export function zonaDe(country: string): GeoZone
// = la zona de mayor `peso` de territorioDe(country).ruta; empate: la primera en `ruta`; `generico` si fallback.
// zonaDe('FR') = 'bretana', zonaDe('ES') = 'cantabrico', zonaDe('BE') = 'flandes', zonaDe('CO') = 'andes'.
```

`zonaDe` solo la usan los 532 nacionales (§6.6) y `regionOf` como último recurso; el test de §6.8 prohíbe que una carrera de equipos llegue a ella.

### 6.4 `RACE_REGION`: la zona de cada carrera y de cada etapa

`RACE_REGION: Record<string, RaceRegion>` (`grammar/regions.ts`) tiene exactamente las 310 claves de `RACE_ROUTES`. Sustituye al sorteo `geo|${raceId}` que proponía `arquitectura.md` §3.5 para FR, IT y ES (retirado por la decisión 14: un sorteo pone Lombardía en los Dolomitas una temporada de cada tres) y a la columna `RaceRow.geo` que proponían arquitectura §5.3 e ingeniero §5.2 (`RaceRow`, `calendar.ts` l. 381-398, NO cambia: la zona vive en una tabla por id, como `RACE_COUNTRY` l. 566-884, y las 213 filas continentales que no declaran `country` tampoco declaran zona).

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>
} // stages: índice 1-based
export const RACE_REGION: Record<string, RaceRegion>
export function regionOf(raceId: string, stageIndex: number, country: string): GeoZone {
  return (
    RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
  )
}
```

**Procedimiento de curación** (es contenido, no diseño: una tarde con `raceRoutes.ts` abierto, `datos.md` §5.2):

1. Para cada una de las 310 claves de `RACE_ROUTES`, en orden alfabético, se lee la localidad de META de la primera etapa (`stageEndpoints(id, 1)`, `raceRoutes.ts` l. 1167) y se escribe `default` con un comentario de una línea que nombre la ciudad o el puerto que decide («Oyonnax: Jura» para `race-ain`). Si salida y meta son de zonas distintas manda la meta.
2. Para las 60 carreras de `RACE_EDITIONS` (`editions.ts` l. 25) se abre la edición y se escribe `stages` SOLO para las etapas cuya zona difiere de `default`, con la meta de cada etapa como criterio. Las etapas con rasgos (`STAGE_FEATURES`) no lo necesitan (son `real`), pero se rellenan igual para que la ficha diga la zona; las 226 sin rasgos lo necesitan porque su relieve se dibuja con la firma de esa zona (sección 11).
3. Si una ciudad no se reconoce se pone `zonaDe(country)` a mano y se marca en el comentario con `// DUDA:`; el test cuenta las dudas y las imprime, sin banda. La galería (sección 16) enseña las 20 carreras `cobbles` reales al lado de su equivalente generado y una página por zona: es ahí donde una zona mal puesta se ve.

Ejemplos obligados (ciudades de `raceRoutes.ts`, medidas en la lista de 310 claves; `race-fleche` no existe como id: la Flecha Valona es `race-huy`):

| Carrera                        | Ciudades (`RACE_ROUTES`)      | `default`      | Por qué                                               |
| ------------------------------ | ----------------------------- | -------------- | ----------------------------------------------------- |
| `race-liege`                   | Liège → Liège                 | ardenas        | fila 3.2                                              |
| `race-huy`                     | Charleroi → Huy               | ardenas        | Mur de Huy 1,3 × 9,6                                  |
| `race-flanders`                | Antwerpen → Oudenaarde        | flandes        | fila `cobbles`                                        |
| `race-roubaix`                 | Compiègne → Roubaix           | francia_norte  | fila `cobbles`, `adoquin` 2                           |
| `race-amstel`                  | Maastricht → Valkenburg       | flandes        | Limburgo: bergs (fila 3.1)                            |
| `race-lombardy`                | Como → Bergamo                | italia_norte   | fila 3.3                                              |
| `race-sanremo`                 | Milano → Sanremo              | italia_norte   | Cipressa y Poggio son `cota` con `params` (sección 5) |
| `race-white-roads`             | Siena → Siena                 | italia_centro  | `sterrato`                                            |
| `race-abruzzo`                 | Pescara → Vasto               | italia_sur     | Blockhaus                                             |
| `race-jura`                    | Lons-le-Saunier → Les Rousses | macizo_central | el caso v40 (sección 9)                               |
| `race-mercantour`              | Nice → Isola 2000             | alpes          | `ud_montana_alto` posible (D1)                        |
| `race-alpes-maritimes`         | Nice → Nice                   | provenza       | prealpes de Niza, fila 3.15                           |
| `race-bretagne`                | Hirel → La Fresnais           | bretana        | fila 3.13                                             |
| `race-tramuntana`              | Sóller → Sa Calobra           | levante        | Sa Calobra 9,4 × 7                                    |
| `race-basque-country`          | Bilbao → Bilbao               | cantabrico     | muros vascos de [1; 4] km al [10; 15] %               |
| `race-asturias`                | Oviedo → Llanes               | cantabrico     | fila 3.8                                              |
| `race-andalusia`               | Benahavís → Pizarra           | andalucia      | fila 3.10                                             |
| `race-castilla-leon`           | Valladolid → Segovia          | meseta         | fila 3.9                                              |
| `race-down-under`              | Tanunda → Tanunda             | australia      | Willunga 3 × 7,5                                      |
| `race-colombia`                | Yopal → Yopal                 | andes          | fila 3.20                                             |
| `race-emirates`                | Madinat Zayed → Liwa          | golfo          | fila 3.25                                             |
| `race-quebec`, `race-montreal` | Québec, Montréal              | norteamerica   | `ud_circuito` ×2                                      |

**La forma por etapa**, con `race-france` como se lee en `editions.ts` l. 26-50 (salida en Barcelona, 21 etapas): `default: 'francia_norte'` (Bordeaux, Bergerac, Nevers, Chalon-sur-Saône, París son llano de fila 3.1 y 1.4) y `stages: { 1: 'levante', 2: 'levante', 3: 'pirineos', 4: 'pirineos', 6: 'pirineos', 9: 'macizo_central', 10: 'macizo_central', 13: 'macizo_central', 14: 'macizo_central', 15: 'alpes', 16: 'alpes', 17: 'alpes', 18: 'alpes', 19: 'alpes', 20: 'alpes' }`. Así la etapa 6 (Pau → Gavarnie-Gèdre, `terrain: 'mountain'`, l. 33) se dibuja con puertos pirenaicos de [10; 17] km al [7; 8,5] % y no con la firma de Francia entera; y la 19 y la 20 (Alpe d'Huez dos veces) con `alpes`. Segundo ejemplo que muestra que la zona no es el país: `race-italy` sale de Bulgaria (Nessebar → Burgas, `editions.ts` l. 52-55): `stages: { 1: 'balcanes', 2: 'balcanes', 3: 'balcanes' }` y el resto por la bota, con `default: 'italia_sur'` para las etapas de Calabria y Campania y `stages` en `italia_centro`, `italia_norte` y `dolomitas` según la meta. Una etapa de edición sin `stages` toma `default`; nunca `zonaDe(country)`.

**Lo que `RACE_REGION` cambia en el país que ya existe:** nada en `RaceRow`, nada en `RACE_COUNTRY`, nada en `climate.ts`. La nota de `climate.ts` l. 15-19 («cuando el calendario sepa la REGIÓN de cada carrera, esto se afina sin tocar nada más») queda respondida con un gancho y no con un cambio: `regionOf` es esa región, y el clima podrá leerla en un encargo posterior sin que E1 lo toque.

### 6.5 Cómo entra la geografía en el generador

La firma que recibe `generateStage` es `req.geo = ZONAS[regionOf(raceId, stageIndex, country)]` (sección 8, paso de identidad). A partir de ahí la geografía actúa en cinco sitios y solo en cinco:

1. **Disponibilidad**: `admite(sk.requiere, geo)` filtra el catálogo antes del sorteo `arch|raceId` (sección 5). La semántica de `requiere` por campo está cerrada en la tabla siguiente; un campo ausente en `requiere` no exige nada.

| Campo de `requiere`                                | Se cumple si                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `puerto`, `cota`, `muro` (cualquier valor no nulo) | `geo.<campo> !== null`                                                                      |
| `muro: { adoquin: true }`                          | `geo.muro !== null && geo.muro.adoquin && geo.adoquin ≥ 2`                                  |
| `adoquin: n`                                       | `geo.adoquin ≥ n`                                                                           |
| `sterrato: true`                                   | `geo.sterrato`                                                                              |
| `viento: n`                                        | `geo.viento ≥ n` (solo `et_llana_viento`, n = 2)                                            |
| `relieve: r`                                       | `orden(geo.relieve) ≥ orden(r)` con `llano < ondulado < media < montana < alta`             |
| `finalesAlto: 'corto'` / `'largo'`                 | `geo.finalesAlto ∈ {corto, largo}` / `geo.finalesAlto === 'largo'`                          |
| `altitud: a`                                       | `geo.altitud === a` (solo `et_media_tendida`: `altiplano`, o bien `relieve === 'ondulado'`) |

Los `requiere` del catálogo que dependen de esta tabla: `ud_adoquin` y `ud_muros_adoquin` `{ adoquin: 2 }`; `ud_adoquin_ligero` `{ adoquin: 1 }` o `{ sterrato: true }` (dos entradas alternativas, se admite si alguna cumple); `ud_sterrato` `{ sterrato: true }`; `ud_montana`, `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_reina_encadenada`, `et_montana_corta`, `et_cronoescalada` `{ puerto: non-null, relieve: 'montana' }` (los que acaban en `alto_largo` además `finalesAlto: 'largo'`); `et_reina_blanda` `{ puerto: non-null, finalesAlto: 'largo' }`; `et_media_alto` `{ finalesAlto: 'corto' }`; `et_media_muro`, `ud_muro_final`, `ud_muros` `{ muro: non-null }`; `ud_circuito` `{ cota: non-null }` o `{ muro: non-null }`; `ud_montana_alto` `{ puerto: non-null, finalesAlto: 'largo' }`; `et_llana_viento` `{ viento: 2 }`.

2. **Degradación**: si el papel pedido no tiene ningún esqueleto admitido en `geo`, `degradar(role)` baja UN escalón y se vuelve a filtrar; siempre hacia abajo, nunca hacia arriba (un país llano no gana puertos), y se anota en `arch.frase` («pedía reina; en flandes no hay puerto: media con muro»). Tabla cerrada: `reina_alto → media_alto`, `reina_valle → media`, `reina_encadenada → media_alto`, `montana_corta → media_alto`, `media_alto → media`, `media_muro → media`, `media → llana`, `llana_viento → llana`, `cronoescalada → cri`, `prologo` y `cri` y `llana` no degradan; para `un_dia`, el sesgo `terrain` baja `mountain → hilly → classic → flat`. `terrain` de la fila es sesgo (×4 sobre el esqueleto que le corresponde, sección 5) y nunca orden: `terrain: 'mountain'` en Dinamarca da `ud_circuito` con cotas y lo dice en la ficha. `degradar` es distinto de `arch.degradado`, que marca la caída a la plantilla canónica tras `ARCH.colocacion.maxIntentos` (sección 8).

3. **Rangos**: cada motivo instanciado sortea en la INTERSECCIÓN del rango del esqueleto (`Slot.params.kmRango`, `gRango`) con el de la zona (`geo.puerto.km`, etc.), y esa intersección está garantizada no vacía por construcción porque ambos son subconjuntos del rango de `ARCH` y el test de §6.8 (h) lo comprueba para cada par (zona × esqueleto admitido). `forma` del puerto es la de la zona salvo que el esqueleto la fije.

4. **Pesos y relleno**: `peso = pesoBase × (geo.pesos[id] ?? 1) × ARCH.pesoPorClase[id][clase]` (sección 5); `amplitud` es la ondulación de todo `enlace` (tope `ARCH.motivo.enlace.ampMax` 2,4, que garantiza que ningún relleno alcance el 3 % que `finish.ts` lee como cota) y sustituye al `bumpy` binario de `rolling` (`profileGen.ts` l. 105) y a `RELIEF.rollingAmplitude` para lo generado; `featureProfile.ts` sigue con `RELIEF` (decisión 27). Con `amplitud` 0,55 una llana belga de 180 km pasa de los 661 a 1.413 m de relleno de hoy (mapa 01 §1) a unos 300 a 700, que es lo que Brugge-De Panne acumula.

5. **Vetos V1 a V4** (sección 9), sobre el perfil final y no sobre la intención: V1 ningún `puerto` (segmento con `climbSize ≥ 8,5`) donde `geo.puerto === null`; V2 ningún `paves` donde `geo.adoquin < 2` salvo `firme: 'tierra'` con `geo.sterrato`, ningún muro `adoquin: true` donde `adoquin === 0`; V3 `ud_sterrato` solo con `geo.sterrato`; V4 `alto_largo` solo con `finalesAlto: 'largo'` y ningún `puerto ≥ 15 km` fuera de `altitud ∈ {alta, altiplano, media}`, con el desnivel de un solo puerto integrado por tramos. Los tres primeros no pueden fallar si `admite` hizo su trabajo: existen para que un cambio futuro en la colocación no los deje sin red.

Lo que la geografía NO hace: no elige el papel de la etapa (eso es la composición, sección 7), no mueve `km` (eso es `ARCH.km.porClase`), no toca `Segment` y no cambia entre ediciones (`GeoZone` es identidad, decisión 20).

### 6.6 Los nacionales por zona

Los 532 campeonatos son 133 países × 4 pruebas (`calendar.ts` l. 351-360: `nc-${cc}-road` con `classic(220)`, `nc-${cc}-u23-road` con `classic(180)`, `nc-${cc}-itt` con `itt(38)`, `nc-${cc}-u23-itt` con `itt(30)`), hoy idénticos salvo la semilla. Con esta sección `nationalChampionships` llama a `generateStage` con `geo = ZONAS[zonaDe(code)]` y `role: 'un_dia'`, y el esqueleto es `nc_ruta` (circuito de [10; 20] km × [8; 16] vueltas con los motivos que la zona dé) para las dos rutas y `nc_crono` para las dos cronos (sección 5). Es la promesa de `docs/motor.md` §V.3 l. 1613 («un nacional belga es llano y de adoquines; uno colombiano, de montaña») hecha función (el mapa 05 §2 la da por decidida en agosto de 2026 y nunca implementada):

| País                 | `zonaDe`     | Lo que da `nc_ruta`                                                                   |
| -------------------- | ------------ | ------------------------------------------------------------------------------------- |
| BE                   | flandes      | circuito con uno o dos `muro` adoquinados por vuelta, meta `esprint` o `repecho`      |
| CO                   | andes        | circuito con `cota` de [5; 8] km, meta `repecho`; ficha «altiplano»                   |
| DK                   | escandinavia | circuito con `cota` corta, `viento` 3 en la ficha («llano abierto»)                   |
| IT                   | italia_norte | circuito con `cota` de [4; 8] km y `muro` al [10; 16] %, meta `muro_meta` o `repecho` |
| FR                   | bretana      | circuito con `muro` y `cota` de 3 km, meta `repecho`                                  |
| los 69 de `FALLBACK` | generico     | circuito con `cota` de [2,5; 6] km y `muro` [8; 10] %                                 |

Los nacionales son los únicos que pasan por `zonaDe`, y el km de la fila se conserva (220/180/38/30 hoy; `ARCH.km.porClase` NC ruta [180, 60] y sub-23 [140, 40] los sortea con `firma|raceId` desde la temporada 0, decisión 36). La saturación del banco se remide con los `nc-*-road` (sección 13), porque son 266 rutas el mismo día.

### 6.7 Viento y altitud son metadatos, no física

El encargo pide «relieve, adoquín, viento, altitud, costa, meseta»; E1 entrega relieve y firme, y el resto lo declara sin fingirlo (decisión 17; riesgo 3 de cobertura y 2 de ejecutabilidad). La razón está medida en el mapa 03 §5.1: el viento es un número por etapa (`rng('viento')^2.2` contra `windMin` 0,87, `simulate.ts` l. 1157-1160) que solo muerde en `block.tipo === 'llano'` y en cualquier km, y `Segment` no lleva altitud (`types.ts` l. 12-48). Un pólder belga y una llanura padana seguirán teniendo la misma probabilidad de abanico.

Lo que sí se hace: `GeoSignature.viento` y `.altitud` viajan en `GeneratedStage.arch.metadatos` y llegan a la ficha con texto que no promete: «llano abierto» (viento 3), «llano» (≤ 2), «altiplano», «alta montaña», «costa»; nunca «abanicos» ni «frío en la cima». `altitud` además decide V4 y `finalesAlto` reparte los finales largos. `expuesto` (`ARCH.motivo.expuesto.amp` 1,0) y `amplitud` baja son lo máximo que el perfil puede decir de un pólder sin tocar `Segment`. Lo que queda para el motor (viento mínimo por zona, altitud en `Segment`, exposición por tramo) va a la sección 17 con la cita a `docs/motor.md` §19.5.

### 6.8 Los tests de consistencia interna

`grammar/geo.test.ts` y `grammar/regions.test.ts` se escriben antes que las tablas (paso 2 del plan, sección 15). No prueban que la geografía sea verdad: prueban que la tabla no se contradice, que cabe en `ARCH`, que resuelve todo lo que el calendario le pide y que ningún veto V1 a V4 puede dispararse por culpa de la tabla.

```ts
// packages/engine/src/routes/grammar/geo.test.ts
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { COUNTRIES } from '@cyclingstar/shared'
import { FALLBACK, TERRITORIOS, ZONAS, admite, territorioDe, zonaDe } from './geo.js'
import { SKELETONS } from './skeletons.js'

const dentro = (r: [number, number], de: [number, number]) =>
  r[0] <= r[1] && r[0] >= de[0] && r[1] <= de[1]
const PAISES_CON_EQUIPOS = [
  'FR',
  'BE',
  'IT',
  'ES',
  'NL',
  'TR',
  'PT',
  'PL',
  'DE',
  'CN',
  'SI',
  'GR',
  'AU',
  'DK',
  'NO',
  'CZ',
  'HR',
  'JP',
  'CH',
  'CA',
  'US',
  'AT',
  'RO',
  'AE',
  'OM',
  'GB',
  'LU',
  'RS',
  'LT',
  'VE',
  'CO',
  'SA',
  'HU',
  'MY',
  'CY',
  'BA',
  'AZ',
  'AL',
  'EE',
  'AD',
  'BG',
  'XK',
  'SK',
  'IN',
  'TW',
  'TH',
  'KR',
  'RW',
  'DZ',
  'BJ',
  'MU',
  'CM',
  'MA',
  'BF',
  'GT',
  'EC',
] // mapa 02 §10

describe('grammar/geo: ZONAS cabe en ARCH y no se contradice', () => {
  it('(a) tiene 30 filas y cada rango está dentro del rango del motivo', () => {
    expect(Object.keys(ZONAS)).toHaveLength(30)
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) {
        expect(dentro(z.puerto.km, ARCH.motivo.puerto.km)).toBe(true)
        expect(dentro(z.puerto.g, ARCH.motivo.puerto.g)).toBe(true)
      }
      if (z.cota) {
        expect(dentro(z.cota.km, ARCH.motivo.cota.km)).toBe(true)
        expect(dentro(z.cota.g, ARCH.motivo.cota.g)).toBe(true)
      }
      if (z.muro) {
        expect(dentro(z.muro.km, ARCH.motivo.muro.km)).toBe(true)
        expect(dentro(z.muro.g, ARCH.motivo.muro.g)).toBe(true)
      }
      expect(z.amplitud).toBeLessThanOrEqual(ARCH.motivo.enlace.ampMax) // 2,4
    }
  })
  it('(b) los bordes con nombre: puerto ≥ 9, cota ≤ 8, muro ≤ 3', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) expect(z.puerto.km[0]).toBeGreaterThanOrEqual(9)
      if (z.cota) expect(z.cota.km[1]).toBeLessThanOrEqual(8)
      if (z.muro) expect(z.muro.km[1]).toBeLessThanOrEqual(3)
    }
  })
  it('(c) adoquín y sterrato son coherentes con el muro y con V2', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.muro?.adoquin) expect(z.adoquin).toBeGreaterThanOrEqual(2)
      if (z.adoquin === 0) expect(z.muro?.adoquin ?? false).toBe(false)
    }
  })
  it('(d) V4 no puede dispararse desde la tabla: puerto ≥ 15 km solo con altitud media/alta/altiplano; largo exige puerto', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto && z.puerto.km[1] >= 15)
        expect(['media', 'alta', 'altiplano']).toContain(z.altitud)
      if (z.finalesAlto === 'largo') expect(z.puerto).not.toBeNull()
      if (z.finalesAlto === 'ninguno') expect(['llano', 'ondulado']).toContain(z.relieve)
    }
  })
  it('(e) cordillera está en la ruta y es montana o alta con puerto', () => {
    for (const [cc, t] of Object.entries(TERRITORIOS)) {
      expect(t.ruta.length).toBeGreaterThan(0)
      if (t.cordillera) {
        expect(t.ruta.map((r) => r.zona)).toContain(t.cordillera)
        expect(['montana', 'alta']).toContain(ZONAS[t.cordillera].relieve)
        expect(ZONAS[t.cordillera].puerto).not.toBeNull()
      }
      expect(t.fallback ?? false).toBe(false) // nada explícito lleva la marca
    }
    expect(TERRITORIOS.AR.cordillera).toBeNull()
    expect(TERRITORIOS.BE.cordillera).toBeNull()
  })
  it('(f) los 56 países con equipos tienen territorio; el resto cae a FALLBACK y se cuenta', () => {
    for (const cc of PAISES_CON_EQUIPOS) expect(territorioDe(cc).fallback ?? false).toBe(false)
    const enFallback = COUNTRIES.map((c) => c.code).filter((cc) => territorioDe(cc) === FALLBACK)
    console.info(`[geo] países en FALLBACK: ${enFallback.length} (${enFallback.join(' ')})`) // hoy 69, sin banda
    for (const c of COUNTRIES) expect(Object.keys(ZONAS)).toContain(zonaDe(c.code))
  })
  it('(g) ejemplos que fijan la semántica de zonaDe y admite', () => {
    expect(zonaDe('BE')).toBe('flandes')
    expect(zonaDe('CO')).toBe('andes')
    expect(zonaDe('ZW')).toBe('generico')
    const reina = SKELETONS.find((s) => s.id === 'et_reina_alto_largo')!
    expect(admite(reina.requiere, ZONAS.alpes)).toBe(true)
    expect(admite(reina.requiere, ZONAS.flandes)).toBe(false) // puerto null
    expect(admite(reina.requiere, ZONAS.levante)).toBe(false) // relieve media
    expect(admite(SKELETONS.find((s) => s.id === 'ud_sterrato')!.requiere, ZONAS.flandes)).toBe(
      false,
    )
    expect(
      admite(SKELETONS.find((s) => s.id === 'et_reina_blanda')!.requiere, ZONAS.cono_sur),
    ).toBe(true)
  })
  it('(h) toda zona admite al menos un esqueleto por papel base y la intersección de rangos no es vacía', () => {
    for (const z of Object.values(ZONAS)) {
      const admitidos = SKELETONS.filter((s) => admite(s.requiere, z))
      expect(admitidos.some((s) => s.kind === 'llana')).toBe(true)
      expect(admitidos.some((s) => s.kind === 'cri')).toBe(true)
      for (const s of admitidos)
        for (const slot of s.slots) {
          const zr =
            slot.motif === 'puerto'
              ? z.puerto?.km
              : slot.motif === 'cota'
                ? z.cota?.km
                : slot.motif === 'muro'
                  ? z.muro?.km
                  : null
          const sr = slot.params?.kmRango
          if (zr && sr) expect(Math.max(zr[0], sr[0])).toBeLessThanOrEqual(Math.min(zr[1], sr[1]))
        }
    }
  })
})
```

```ts
// packages/engine/src/routes/grammar/regions.test.ts
import { describe, expect, it } from 'vitest'
import { RACE_ROUTES } from '../raceRoutes.js'
import { RACE_EDITIONS } from '../editions.js'
import { SEASON_CALENDAR } from '../calendar.js'
import { RACE_REGION, regionOf } from './regions.js'
import { ZONAS, zonaDe } from './geo.js'

describe('grammar/regions: RACE_REGION cubre las 310 carreras de equipos y ninguna cae al país', () => {
  it('(a) las claves son exactamente las de RACE_ROUTES', () => {
    expect(Object.keys(RACE_REGION).sort()).toEqual(Object.keys(RACE_ROUTES).sort()) // 310
  })
  it('(b) ninguna carrera de equipos pasa por zonaDe(country); solo los .NC', () => {
    for (const race of SEASON_CALENDAR) {
      const porTabla = RACE_REGION[race.id] !== undefined
      if (race.championshipCountry) expect(porTabla).toBe(false)
      else expect(porTabla).toBe(true)
    }
  })
  it('(c) stages solo en las 60 ediciones, con índice 1-based dentro de n y zona distinta de default', () => {
    for (const [id, r] of Object.entries(RACE_REGION)) {
      if (!r.stages) continue
      expect(RACE_EDITIONS[id]).toBeDefined()
      for (const [i, zona] of Object.entries(r.stages)) {
        expect(Number(i)).toBeGreaterThanOrEqual(1)
        expect(Number(i)).toBeLessThanOrEqual(RACE_EDITIONS[id].stages.length)
        expect(zona).not.toBe(r.default)
      }
    }
    expect(regionOf('race-france', 6, 'FR')).toBe('pirineos')
    expect(regionOf('race-france', 19, 'FR')).toBe('alpes')
    expect(regionOf('race-france', 7, 'FR')).toBe('francia_norte')
    expect(regionOf('race-italy', 1, 'IT')).toBe('balcanes')
    expect(regionOf('nc-BE-road', 1, 'BE')).toBe(zonaDe('BE'))
  })
  it('(d) las 20 filas cobbles caen en zonas con adoquín o tierra (DATO: grep "terrain: \'cobbles\'" sobre calendar.ts)', () => {
    const COBBLES = [
      'race-across-flanders',
      'race-antwerp',
      'race-bruges',
      'race-denain',
      'race-flanders',
      'race-flandrien',
      'race-harelbeke',
      'race-kuurne',
      'race-leon',
      'race-muur',
      'race-nokere',
      'race-opening-classic',
      'race-roubaix',
      'race-roubaix-espoirs',
      'race-rutland',
      'race-samyn',
      'race-tours',
      'race-veneto-classic',
      'race-wevelgem',
      'race-youngster',
    ]
    expect(COBBLES).toHaveLength(20)
    const byId = new Map(SEASON_CALENDAR.map((r) => [r.id, r]))
    for (const id of COBBLES) {
      const z = ZONAS[regionOf(id, 1, byId.get(id)!.country)]
      expect(z.adoquin >= 1 || z.sterrato).toBe(true) // race-leon (Tro Bro Léon) y race-rutland por tierra; race-veneto-classic por adoquín urbano
    }
  })
  it('(e) los ejemplos obligados', () => {
    const esperado: Record<string, string> = {
      'race-liege': 'ardenas',
      'race-huy': 'ardenas',
      'race-lombardy': 'italia_norte',
      'race-jura': 'macizo_central',
      'race-tramuntana': 'levante',
      'race-roubaix': 'francia_norte',
      'race-white-roads': 'italia_centro',
      'race-colombia': 'andes',
      'race-emirates': 'golfo',
      'race-down-under': 'australia',
    }
    for (const [id, zona] of Object.entries(esperado)) expect(RACE_REGION[id].default).toBe(zona)
  })
  it('(f) las dudas de curación se imprimen y no vetan', () => {
    const dudas = Object.entries(RACE_REGION)
      .filter(([, r]) => (r as { duda?: boolean }).duda)
      .map(([id]) => id)
    console.info(`[regions] DUDA: ${dudas.length} carreras (${dudas.join(' ')})`)
  })
})
```

Notas sobre los tests: (d) del primer fichero es el que hace que V4 sea imposible de disparar por la tabla, y (h) el que hace que la intersección de rangos del paso 3 de §6.5 nunca sea vacía; (f) de `geo.test.ts` no tiene banda porque el número de países en fallback (69) es un hecho de contenido, no un objetivo. El test (b) de `regions.test.ts` es la obligación 8 del encargo de síntesis hecha aserción: la única forma de que una carrera de equipos caiga al país es borrar su fila, y eso rompe (a). La fila `duda` de (f) es un campo opcional `duda?: true` en `RaceRegion` que el implementador pone donde una ciudad no se reconoce; la galería y el dueño la cierran, y el objetivo, sin banda, es 0.

Lo que el dueño tiene que revisar de esta sección, una tarde con la galería delante (sección 16 y sección 18): las 30 filas de `ZONAS` con la pregunta «¿existe esto aquí?», las 13 filas de `TERRITORIOS` con `cordillera: null` (D8), y las carreras marcadas `duda` de `RACE_REGION`.

---

## 7. Las vueltas por etapas: territorio, itinerario, papeles, km por clase

Hoy una vuelta generada es `stageMix(n, terrain, seedBase)` (`calendar.ts` l. 546-561): reduce el terreno de la fila a tres (`mixTerrain`, l. 416-420), sortea cinco papeles etapa a etapa (`mixRoles`, l. 457-519, con `pickRole` sobre `ROUTE.mixWeights`, l. 434-443) y da kilómetros sin mirar la clase (`mixKm`, l. 522-543). Pasan por ahí 72 de las 132 vueltas (hilly 37, mountain 19, flat 16; mapa 02 §1 y §4) y las 886 etapas de equipos que no son de edición se componen sin saber en qué país están (mapa 02 §6). Lo que este capítulo cambia es lo que hay ANTES del sorteo (un itinerario por el territorio del país), lo que hay DENTRO de cada papel (doce papeles indexados por el relieve de la meta, no tres terrenos) y lo que hay DESPUÉS (reglas de bloque como reparación determinista y kilómetros por clase y papel). Lo que NO cambia es el orden en que `mixRoles` decide y sus cuatro garantías, que son de dominio y que `calendar.test.ts` l. 176-266 sella.

### 7.1 El territorio y la ventana: `itinerarioDe`

`itinerarioDe` (`routes/grammar/tour.ts`) es la primera decisión de una vuelta generada y es identidad: se tira con `routeRng(\`arch|${raceId}\`)`, sin `season`, y por eso una carrera recorre siempre el mismo trozo de su país (decisión 20: los papeles no son edición). Lee `TERRITORIOS[country]`(sección 6: los 56 países con carreras de equipos, mapa 02 §10; los 77 restantes de`COUNTRIES`caen a un territorio`fallback`de una sola zona`generico`, contado en `geo.test.ts`).

```ts
// packages/engine/src/routes/grammar/tour.ts
export interface Itinerario {
  metas: GeoZone[] // zona de la meta de cada etapa; la salida de la i+1 es la meta de la i
  papeles: StageRole[]
  km: number[] // ya con ARCH.km.porClase, maxPorClase y ROUTE.lastStageKmFactor
  desde: GeoZone[] // desde[0] = metas[0]; desde[i] = metas[i-1]. desde[i] !== metas[i] es transición
  notas: string[] // reparaciones aplicadas («e5: reina → media_alto, ventana sin cordillera»)
}
export function itinerarioDe(
  raceId: string,
  country: string,
  n: number,
  terrain: RouteTerrain,
  raceClass: RaceClass,
  format: RaceFormat,
): Itinerario
```

Paso a paso, con el orden de consumo del RNG fijado (todo lo que sigue tira del mismo `rand` y en este orden, para que el test de determinismo de `calendar.test.ts` l. 237-246 sea reproducible):

1. **Ventana.** `T = TERRITORIOS[country]`, `L = T.ruta.length`, `w = min(n, L)`. Los arranques candidatos `s ∈ [0, L)` definen ventanas circulares `ruta[s..s+w-1 mod L]`. Si `terrain === 'mountain'` y `T.cordillera !== null`, solo valen los arranques cuya ventana contiene la cordillera; si `terrain ∈ {flat, cobbles, itt}` y existe algún arranque cuya ventana la excluye, solo valen esos; en cualquier otro caso valen todos. Una tirada elige el arranque con probabilidad proporcional a `ruta[s].peso` (es el único uso del peso en composición; `zonaDe` lo usa para un día). El terreno de la fila es aquí SESGO: pide la cordillera o la evita, pero no la inventa (decisión 18).
2. **Metas.** `metas[0] = ventana[0]`; para `i = 1..n-1`, si el cursor no está al final de la ventana y `rand() < ARCH.itinerario.avance` (0,6), avanza; si no, se queda. Una tirada por etapa, siempre (también cuando el cursor ya no puede avanzar: así el número de tiradas depende solo de `n`). Quedarse es lo que hace los bloques: dos etapas seguidas con meta en `alpes` son un bloque de montaña por construcción, no por una regla de reparación (mapa 07 §2.1 regla 4). Con `w = 1` (AD, AE, DK: territorios de una zona) todas las metas son la misma y la vuelta es entera de esa zona.
3. **Papeles** (§7.3): `mixRoles` conservado, con el sorteo de las de en medio sobre `ARCH.pesosComposicion[ZONAS[metas[i]].relieve]`, más las dos tiradas nuevas (prólogo, cronoescalada).
4. **La reina en la cordillera.** Un papel de reina (`reina_alto`, `reina_valle`, `reina_encadenada`, `montana_corta`) solo se admite en una etapa cuya meta sea `T.cordillera` o una zona con `relieve ∈ {montana, alta}`. La tabla de pesos ya lo garantiza para las de en medio (las filas `llano` y `ondulado` tienen 0 en las cuatro), así que la regla solo actúa sobre la reina que pone el paso 2 de `mixRoles` (última etapa decisiva con `lastSummitShare`) y sobre la que las garantías o los bloques desplacen: se intercambia con la etapa admisible más tardía que no sea la primera ni una crono; si no hay ninguna, se degrada a `media_alto` y se anota en `notas`. Consecuencia sellada en `tour.test.ts`: cero reinas en BE, NL, DK, AE, AU (todos con `cordillera: null`, decisión 13 y D8), con la vuelta belga cerrándose con `media_alto` sobre un berg como hace el Benelux Tour (mapa 07 §2.2).
5. **Reparación de bloques** (§7.2) y **segunda pasada de garantías**: las cuatro garantías de `mixRoles` se extraen a una función pura `garantias(roles, terrain, n)` (el cuerpo de l. 486-517 sin tocar) y se vuelven a aplicar después de los bloques, porque una reparación que degrada `reina_alto → media` puede dejar la vuelta sin final en alto y la garantía de fondo es la que manda («ninguna vuelta se queda sin crono ni final en alto», `calendar.test.ts` l. 200-209). `garantias` solo endurece y solo por la cola, así que no rompe `reinaTarde` ni `descansos`; el test lo comprueba de todos modos.
6. **Kilómetros** (§7.4): `km[i] = kmDe(papeles[i], raceClass, i === n-1, rand)`.
7. **Transición.** `desde[i] = metas[i-1]`. Cuando `desde[i] !== metas[i]`, `generateStage` recibe `desde` en `StageRequest` y dibuja el primer `ARCH.itinerario.transicion` (0,4) de la etapa con la `amplitud` de `desde` y sin sus dificultades, y el 0,6 restante con la firma de la meta (sección 8): Meseta → Cantábrico es 70 km de páramo y 100 de sierra. Con `desde === metas[i]` la etapa es entera de la zona.

Lo que `itinerarioDe` NO hace: no elige esqueleto de etapa (eso es `generateStage` con `arch|raceId|{i}`, sección 8), no mira `season` (sección 10) y no llama a nada de `stage/` (decisión 4).

### 7.2 Los cuatro esqueletos de composición y sus reglas de bloque

`TOUR_SKELETONS` es un catálogo de cuatro entradas elegidas sin dado por `n` y clase. La frontera entre `vu_corta` y `vu_semana` en `n = 5` la decide la clase (arquitectura §7.2: «.2 y .1 de 3 a 5», «Pro y WT de 5 a 8»); `vu_corta` baja a `n = 2` porque el calendario tiene una vuelta de dos etapas (mapa 02 §2). `vu_gran_vuelta` no sirve hoy a ninguna carrera (las tres de 21 son de edición, mapa 06 §1.2) y existe para E12; las cinco vueltas generadas de 9 a 11 etapas (mapa 02 §2: 9 (2), 10 (2), 11 (1)) van por `vu_larga`.

| Id               | `n`      | Se elige cuando                    | `primera`                        | `ultima`                                                       | Reglas de bloque                                                                                                                   |
| ---------------- | -------- | ---------------------------------- | -------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `vu_corta`       | [2; 5]   | `n ≤ 4`, o `n = 5` con clase .1/.2 | `{ llana: 1 }`                   | `'ROUTE.lastDecisiveChance'`                                   | `maxCronos` 1, `maxFinalesAlto` (≤ 1 reina)                                                                                        |
| `vu_semana`      | [5; 8]   | `n = 5` con WT/Pro, o `n ∈ [6; 8]` | `{ llana: 0,75; prologo: 0,25 }` | `'ROUTE.lastDecisiveChance'`                                   | `reinaTarde` (reina en las tres últimas), `maxFinalesAlto` (≤ 3, ≤ 2 seguidos), `maxCronos` 2                                      |
| `vu_larga`       | [9; 14]  | `n ∈ [9; 14]`                      | `{ llana: 0,75; prologo: 0,25 }` | `'ROUTE.lastDecisiveChance'`                                   | `reinaTarde` (último tercio), `bloqueMontana` (bloques de 2 o 3 seguidas), `llanasEntreBloques` (≥ 2), `maxCronos` 2               |
| `vu_gran_vuelta` | [15; 21] | `n ≥ 15`                           | `{ llana: 0,7; prologo: 0,3 }`   | `{ llana: 0,85; cri: 0,15 }` (Tour 2024, mapa 07 §2.1 regla 3) | `descansos`, `reinaTarde` ([15; 20]), `bloqueMontana`, `llanasEntreBloques`, `maxFinalesAlto` (≤ 7 de alta montaña), `maxCronos` 3 |

`primera` se tira solo si `n ≥ ROUTE.ittWeekStages` (6): es la tirada nueva del prólogo (decisión 42, D3), y `roles[0]` puede ser por primera vez una crono (`mixRoles` no la toca: bucles desde 1, l. 483 y 493). `ultima` con el valor `'ROUTE.lastDecisiveChance'` significa «el paso 2 de `mixRoles` tal cual» (`lastDecisiveChance` × `grandTourLastDecisiveFactor` si `n ≥ 15`, `lastSummitShare`); la reina de ese paso es `reina_alto` sin tirada extra, porque «acaba arriba» es exactamente lo que `lastSummitShare` decide. En `vu_gran_vuelta` el paso 2 se sustituye por una sola tirada sobre `ultima` (`cri` con 0,15, si no `llana`): una gran vuelta se cierra con el paseo o, por excepción anunciada, con una crono, y nunca arriba (así `grandTourLastDecisiveFactor` 0,4 deja de intervenir en lo generado y se conserva solo por las tres reales y por los lectores que lo citan).

Las reglas se aplican como **reparación determinista después del sorteo**, recorriendo de atrás hacia delante como ya hacen las garantías (l. 488-517), y cada una cambia el papel del hueco que rompe la regla por el más cercano en la escalera `reina_* → media_alto → media → llana`, nunca al revés (una reparación jamás endurece: endurecer es cosa de `garantias`). Ninguna toca `roles[0]` ni una crono. Escritas una a una:

```ts
export interface BlockRule {
  id:
    | 'reinaTarde'
    | 'bloqueMontana'
    | 'llanasEntreBloques'
    | 'maxCronos'
    | 'maxFinalesAlto'
    | 'descansos'
  aplica: (n: number) => boolean
  repara: (roles: StageRole[], zonas: GeoZone[]) => StageRole[] // pura; devuelve copia
}
const esReina = (r: StageRole) =>
  r === 'reina_alto' || r === 'reina_valle' || r === 'reina_encadenada' || r === 'montana_corta'
const acabaArriba = (r: StageRole) =>
  r === 'media_alto' || r === 'reina_alto' || r === 'reina_encadenada' || r === 'montana_corta'
const esMontana = (r: StageRole) => esReina(r) || r === 'media_alto'
const esCrono = (r: StageRole) => r === 'cri' || r === 'prologo' || r === 'cronoescalada'
const admiteReina = (z: GeoZone, cordillera: GeoZone | null) =>
  z === cordillera || ZONAS[z].relieve === 'montana' || ZONAS[z].relieve === 'alta'
```

- **`reinaTarde`.** Ventana admisible de la reina (índices 0-based): `vu_semana` `[n-3, n-1]`; `vu_larga` `[floor(2n/3), n-1]`; `vu_gran_vuelta` `[14, 19] ∩ [0, n-1]` (`ARCH.bloques.gv.reina` [15; 20] en 1-based). Toda reina fuera de la ventana se intercambia con el hueco admisible más tardío dentro de ella (`admiteReina(zonas[j])`, no crono, no `roles[0]`) que no sea ya reina; si no hay hueco, se degrada a `media_alto`. Es la regla que convierte «la reina cae en la tercera semana» (mapa 07 §2.1 regla 2: Plateau de Beille e15, Loze e17, Tre Cime e19) en propiedad estructural.
- **`bloqueMontana`.** (a) Una racha de más de 3 etapas de montaña seguidas (`esMontana`) se corta: de la cuarta en adelante, `reina_* → media_alto → media`. (b) Dos etapas de montaña separadas por exactamente una que no lo es forman bloque: la separadora se intercambia con la montaña anterior si `admiteReina(zonas[i-1])` lo permite; si no, se deja (una .1 que cruza dos sierras con un valle entre medias existe). Mapa 07 §2.1 regla 4: Pirineos e14 y e15, Alpes e17 a e20.
- **`llanasEntreBloques`.** Entre dos bloques de montaña hay al menos `ARCH.bloques.gv.minLlanasEntreBloques` (2) etapas que no lo son; si hay una sola, se resuelve por (b) de arriba. Y nunca 8 llanas seguidas (`!isSelective`): la octava pasa a `media`.
- **`maxCronos`.** `vu_corta` 1 (V13; mapa 07 §2.3: «con 3 etapas nunca hay dos cronos»), `vu_semana` y `vu_larga` 2 (prólogo más crono: Romandía, Suiza), `vu_gran_vuelta` 3 (prólogo más las dos de `ittSecondStages`). La crono sobrante, de atrás hacia delante, pasa a `llana`. En `vu_corta` no puede dispararse por construcción (`n ≤ 5 < 6`: sin prólogo; `n < 15`: sin segunda crono) y el test lo sella como invariante.
- **`maxFinalesAlto`.** `vu_corta`: ≤ 1 reina. `vu_semana`: ≤ 3 etapas `acabaArriba` y ≤ 2 seguidas (mapa 07 §2.2: «1 o 2 finales en alto» en una semana; Catalunya e3 y e4 son el máximo). `vu_gran_vuelta`: ≤ `ARCH.bloques.gv.maxAltaMontana` (7) etapas `esReina` (la Vuelta con 8 a 10 finales en alto es el techo real y se queda fuera a propósito: la Vuelta es real). El sobrante, de atrás hacia delante y sin tocar la última, pasa a `media`.
- **`descansos`.** Solo `vu_gran_vuelta`. Primera semana = etapas `1..ARCH.bloques.gv.descansos[0]` (9): ninguna reina y a lo sumo `primeraSemanaFinalesAlto` (1) etapa `acabaArriba` (Galibier 2024 e4, Tagliacozzo 2025 e7: una, no dos). La reina de la primera semana la mueve `reinaTarde`; el segundo final en alto pasa a `media`. La regla es la misma que da los descansos: `descansosDe(n) = n >= ROUTE.grandTourStages ? ARCH.bloques.gv.descansos.filter((d) => d < n) : []`, que `buildRace` escribe en `restAfter` (hoy solo lo rellenan las ediciones, mapa 02 §1; ninguna vuelta generada de hoy lo gana porque ninguna llega a 15).

Orden de aplicación en `composeTour`: `mixRoles` (1-4) → prólogo → cronoescalada → reina en la cordillera → `descansos` → `reinaTarde` → `bloqueMontana` → `llanasEntreBloques` → `maxFinalesAlto` → `maxCronos` → `garantias`. Test: 120 semillas × cada `n` de [2; 21] × un territorio por relieve (BE llano, `generico` ondulado, PT media, ES montaña, CO alta), cero violaciones de bloque tras la pasada, y las cuatro garantías en verde tras la pasada (V13 y V14 de la sección 9 son estas mismas comprobaciones sobre el calendario entero).

### 7.3 Lo que se conserva de `mixRoles`, las dos tiradas nuevas y `ARCH.pesosComposicion`

Se conserva, línea por línea y con sus constantes: el paso 1 (crono según `ROUTE.ittMinStages` 3, `ittAlwaysFlatStages` 4, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittEarlierChance` 0,35, `ittSecondStages` 15 y `ittSecondPosition` 0,35; `constants.ts` l. 1189-1201), el paso 2 (`lastDecisiveChance` {0,3; 0,55; 0,85}, `grandTourStages` 15, `grandTourLastDecisiveFactor` 0,4, `lastSummitShare` {0; 0,35; 0,8}), el paso 4 entero (`selectiveMinFraction` {0,35; 0,55; 0,7}, `uphillFinishMinStages` 4 y la garantía de fondo). Las tres claves `flat | hilly | mountain` de esas tablas sobreviven como índice, calculado por `mixTerrain(terrain)` (l. 416-420) desde el terreno de la fila: el tipo `MixTerrain` deja de ser el modelo de composición (ya no decide qué son las de en medio) y queda como `keyof typeof ROUTE.lastDecisiveChance`. Que la crono y la última etapa se decidan por el terreno PEDIDO y no por el relieve de la ventana es deliberado: «una vuelta llana de 4+ lleva siempre crono» es la voluntad del organizador de `race-sharjah` (`calendar.test.ts` l. 181-188 y l. 248-255), y la geografía no tiene por qué saberla; lo que la geografía sí veta es la reina (§7.1 paso 4).

Lo que cambia dentro del paso 3: `pickRole` sortea con una sola tirada por etapa, como hoy, pero sobre los nueve papeles en línea y con la fila de `ARCH.pesosComposicion` del relieve de la meta de ESA etapa (`ZONAS[metas[i]].relieve`), no con `ROUTE.mixWeights[terrain]` (l. 1224-1228, que se retira en el paso 8). La tabla es la de arquitectura §7.3 (las filas suman 1,00):

| relieve  | llana | llana_viento | media | media_alto | media_muro | reina_alto | reina_valle | reina_encadenada | montana_corta |
| -------- | ----- | ------------ | ----- | ---------- | ---------- | ---------- | ----------- | ---------------- | ------------- |
| llano    | 0,50  | 0,25         | 0,15  | 0,07       | 0,03       | 0          | 0           | 0                | 0             |
| ondulado | 0,40  | 0,10         | 0,25  | 0,15       | 0,10       | 0          | 0           | 0                | 0             |
| media    | 0,28  | 0,04         | 0,28  | 0,18       | 0,10       | 0,06       | 0,04        | 0                | 0,02          |
| montana  | 0,20  | 0,02         | 0,22  | 0,14       | 0,05       | 0,16       | 0,12        | 0,04             | 0,05          |
| alta     | 0,16  | 0            | 0,18  | 0,10       | 0,02       | 0,22       | 0,14        | 0,10             | 0,08          |

Dos ajustes de lectura: `llana_viento` solo existe si `ZONAS[meta].viento ≥ 2`; si no, su peso se suma a `llana` (el papel promete «llano abierto» en la ficha, nunca abanicos: decisión 17). Y los 0,12 de reina de la fila `media` solo sobreviven cuando la meta es la cordillera del país (PT, balcanes, `britanicas` no: su cordillera es `null`); en cualquier otra zona `media` la regla de §7.1 paso 4 los degrada a `media_alto`, que es la lectura correcta de «reina en media montaña»: un final en alto de 3 a 7 km.

Las dos tiradas nuevas, en este orden y después del paso 4 de `mixRoles`:

1. **Prólogo**: si `n ≥ ROUTE.ittWeekStages` (6) y `rand() < TOUR_SKELETONS[id].primera.prologo` (0,25; D3), `roles[0] = 'prologo'`. Coexiste con la crono del paso 1 (Romandía: prólogo de 3 a 5 km más CRI de 15 a 20; Suiza: crono el día 1 y el último; mapa 07 §2.2). Su kilometraje lo da el rango `km` del esqueleto `et_prologo` (sección 5; V13 exige [3; 8]).
2. **Cronoescalada**: si `T.cordillera !== null`, hay una `cri` en `i ≥ 1` y `admiteReina(metas[i])`, con `rand() < ARCH.itinerario.cronoescalada` (0,08; D3) esa `cri` pasa a `cronoescalada` (Peyragudes, Tour 2025 e13; mapa 07 §2.1). Sigue siendo `timeTrial: true` (`stageKind.test.ts` re-sellado: «una cronoescalada sin `timeTrial` es media», decisión 42), así que cuenta para «lleva crono» en las garantías.

Advertencia que hay que escribir y no esconder (juez del motor §1, l. 44): `mixRoles` tira de UN `rand` secuencial, y las tiradas de ventana y metas van delante de él, la del prólogo y la cronoescalada detrás, y la semilla pasa de `mix|${seedBase}|${n}|${terrain}` a `arch|${raceId}`. Las 72 composiciones de hoy cambian TODAS, no solo las que ganan un prólogo. No hay forma de conservarlas (los pesos cambian igualmente) y no se intenta: `smallTours` (10 carreras, 7 generadas, `sim/smallTours.ts` l. 61-102; mapa 04 §2) se remide pareado en el paso 9 con la banda `photoRepeatTopFive` como la más expuesta, porque «la COMPOSICIÓN de `stageMix` entra en la banda» (mapa 04 §2, `targets.ts` l. 574-577), y el reloj es 3.900 s (mapa 06 §3.2). Consecuencia sobre lo que sella `calendar.test.ts`: las garantías de l. 176-209 y l. 223-266 siguen verdes sin tocar una aserción; UNA se re-sella con causa escrita: «la primera etapa es siempre llana y nunca es la crono» (l. 211-221) pasa a «la primera etapa es llana o prólogo de ≤ 8 km, nunca un final en alto ni una crono en línea», porque el prólogo en `roles[0]` es la decisión 42.

**La consecuencia sobre el 40 % de reinas de hoy**, con aritmética y no con medida (la medida la da `routeCensus` en el paso 7): hoy una vuelta `mountain` de 7 etapas espera 5 × 0,40 = 2,0 reinas en medio más 0,85 × 0,8 = 0,68 en la última, 2,7 de 7 (38 %), todas `mountainSegments` (mapa 07 §2.1: «dobla lo real»). Con la tabla, solo las etapas con meta en zona `montana`/`alta` pueden ser reina (0,37 y 0,54 de masa respectivamente), y en una ventana española de 4 zonas (meseta, cantábrico, pirineos, levante; geografía §5.2 traducida en la sección 6) eso son 2 o 3 de las 5 de en medio: 0,9 a 1,6 reinas, más la última si su meta admite. Resultado esperado: de 1,5 a 2,3 reinas por vuelta de 7 (del 21 al 33 %), repartidas en cuatro formas, y el resto de la dureza como `media_alto` y `media_muro`. Banda de arquitectura §11.3 que lo vigila: «≥ 9 papeles de etapa distintos en vueltas» sobre el calendario (sección 13).

### 7.4 Kilómetros por clase y papel: `kmDe`

`mixKm` (l. 522-543) da de 145 a 195 km a cualquier clase: una .2 de cinco etapas sale con etapas de 165 a 195 km, «la vuelta .2 más larga de Europa» (mapa 07 §4.1), y las 142 carreras de un día sin `km` miden 210 exactos (`row.km ?? 210`, l. 917; mapa 02 §1). `kmDe` lo sustituye con `ARCH.km.porClase` como TABLA por clase y papel, no como factor (decisión 36, banco §7.3: un factor 0,75 sobre el rango WT de un día da [150; 195] para una .2, por encima de los 180 del mapa 07 §4.1):

```ts
export function kmDe(
  role: StageRole | 'un_dia' | 'un_dia_u23',
  raceClass: RaceClass,
  last: boolean,
  rand: () => number,
): number
// ARCH.km.porClase[raceClass][columna(role)] = [min, rango]; km = min + rand() * rango
// columna: llana|llana_viento → 'llana'; media|media_alto|media_muro → 'media';
//          reina_alto|reina_valle|reina_encadenada → 'reina'; montana_corta → 'corta';
//          cri → ROUTE.itt* como hoy (n ≥ ittLongStages 10: [26; 44], si no [14; 26]); prologo y cronoescalada →
//          SKELETONS.et_prologo.km y SKELETONS.et_cronoescalada.km (sección 5)
// last && !esCrono(role) → × ROUTE.lastStageKmFactor 0,85; después min(km, ARCH.km.maxPorClase[raceClass]); Math.round
```

| Clase | llana     | media     | reina     | corta     | un día                           | Fuente                                                                              |
| ----- | --------- | --------- | --------- | --------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| WT    | [160, 30] | [150, 30] | [140, 40] | [120, 20] | [200, 60]                        | mapa 07 §4.1: una semana de 140 a 170 por etapa; un día de 175 a 295 (mediana ~230) |
| Pro   | [150, 30] | [140, 30] | [140, 35] | [120, 20] | [180, 50]                        | Pro y .1 por etapas de 130 a 170; un día de 170 a 240                               |
| .1    | [140, 30] | [135, 30] | [135, 35] | [115, 20] | [170, 40]                        | ídem, techo UCI 200 «a confirmar»                                                   |
| .2    | [110, 40] | [110, 40] | [115, 40] | [100, 20] | [140, 40]                        | .2 por etapas de 100 a 160; un día de 140 a 180                                     |
| NC    |           |           |           |           | ruta [180, 60]; sub-23 [140, 40] | nacional de 180 a 260 en circuito; sub-23 de 120 a 180                              |

`ARCH.km.maxPorClase` = { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } (D9: se codifican las cifras del mapa 07 §4.1 con «a confirmar» en el comentario de la constante). El techo solo recorta lo GENERADO: las 36 filas con `km` explícito mandan sobre la tabla (Sanremo 294 va por `km` de fila, l. 1038-1101) y las ediciones reales llevan su km como contrato (`calendar.test.ts` l. 140-152). En un día, `buildRace` hace `km = row.km ?? kmDe('un_dia', row.raceClass, false, routeRng(\`firma|${row.id}\`))`: el 210 desaparece desde la temporada 0 y el kilometraje es firma (estable entre ediciones salvo el jitter ± 6 % de `ARCH.edicion.kmJitter`, sección 10). Los cuatro nacionales por país (`nc-xx-road`220,`nc-xx-u23-road`180,`nc-xx-itt`38,`nc-xx-u23-itt`30 hoy, mapa 02 §3) pasan a`kmDe('un_dia', 'NC', …)`= [180; 240],`kmDe('un_dia_u23', 'NC', …)`= [140; 180], y las cronos a`kmDe('cri', 'NC', …)`con el rango largo [26; 44] para la élite y el corto [14; 26] para la sub-23, sembradas con`firma|nc-xx-…`. `raceRoutes.test.ts`no cambia porque`n` sigue viniendo de la fila (decisión 44).

Bandas de calendario que esto sostiene (sección 13, `ROUTE_CENSUS_TARGETS`): p90 de km de las etapas .2 ≤ 170; ninguna etapa generada por encima de `maxPorClase`; y en `tour.test.ts`, 120 semillas × clase × `n ∈ {3, 5, 8}`: todo `km[i]` dentro de `[min·0,85; min + rango]` de su columna.

### 7.5 `composeTour`, `stageMix` con firma conservada y lo que ve `buildRace`

```ts
export interface RouteContext {
  // lo que hoy stageMix no sabe
  raceId?: string
  country: string | null // null → TERRITORIOS fallback (zona `generico`)
  raceClass: RaceClass
  format: RaceFormat
  season: number
}
export const DEFAULT_ROUTE_CONTEXT: RouteContext = {
  country: null,
  raceClass: '2',
  format: 'una-semana',
  season: BASE_SEASON,
}

export function composeTour(
  raceId: string,
  n: number,
  terrain: RouteTerrain,
  ctx: RouteContext,
): StageSpec[]
// 1. sk = tourSkeletonDe(n, ctx.raceClass)          (sin dado)
// 2. it = itinerarioDe(raceId, ctx.country ?? '', n, terrain, ctx.raceClass, ctx.format)
// 3. it.papeles.map((role, i) => generateStage({ raceId, stageIndex: i + 1, season: ctx.season, km: it.km[i], role,
//      terrain, geo: ZONAS[it.metas[i]], desde: it.desde[i] !== it.metas[i] ? it.desde[i] : undefined,
//      raceClass: ctx.raceClass, format: ctx.format, routeSource: 'generado' }))
//    → { kind, label, profile, timeTrial, routeSource, arch } (StageSpec gana routeSource y arch; stagesFrom los conserva)

export function stageMix(
  n: number,
  terrain: RouteTerrain,
  seedBase: string,
  ctx: RouteContext = DEFAULT_ROUTE_CONTEXT,
): StageSpec[] {
  return composeTour(seedBase, n, terrain, ctx)
}
```

`stageMix` conserva la firma con el cuarto parámetro por defecto (decisión 19, I-17) para que `calendar.test.ts` l. 168-266 y `stageKind.test.ts` compilen en todos los pasos del plan; con `DEFAULT_ROUTE_CONTEXT` el territorio es el `fallback` (`generico`, ondulado, `cordillera: null`), y por eso `stageMix(5, 'mountain', seed)` sigue cerrando arriba en más de la mitad de las semillas (`lastDecisiveChance.mountain` 0,85 × `lastSummitShare` 0,8 da `reina_alto`, que §7.1 paso 4 degrada a `media_alto`: sigue siendo `Uphill finish`, que es lo que `calendar.test.ts` l. 223-235 mira). `buildRace` (l. 926-929) pasa a `stagesFrom(composeTour(row.id, row.stages, row.terrain ?? 'flat', { raceId: row.id, country, raceClass: row.raceClass, format: 'una-semana', season }))` con `restAfter: descansosDe(row.stages)`, y `calendarForSeason` es quien aporta `season` (sección 10). Los papeles, `timeTrial` y `n` son identidad (decisión 20): `edition.test.ts` sella que `itinerarioDe` no lee `season` y que temporadas 0 a 5 devuelven los mismos `papeles` y `metas`.

Lo que se retira de `ROUTE` con el generador viejo (paso 8): `mixWeights`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` (l. 1224-1243). Lo que se conserva tal cual: todo `itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` (sección 12).

### 7.6 Las etapas de edición no pasan por aquí

Las 57 vueltas con `RACE_EDITIONS` y las 3 grandes vueltas conservan composición real: número de etapas, km, terreno por etapa y `restAfter` (`editions.ts`, mapa 02 §7). Ni `itinerarioDe` ni `composeTour` las tocan: `stagesFromEdition` deriva el papel del `EditionTerrain` de cada etapa (`mountain → reina_alto` con la forma que decida el esqueleto, `hilly → media`, `flat → llana`, `itt → cri`) y llama a `generateStage` con `routeSource: 'edicion'`, `km` como contrato al 0,1 y la zona de `regionOf(raceId, i, country)` por etapa (`race-france` e6 → `pirineos`; sección 6 y sección 11). El papel de una etapa de edición es también identidad: lo fija el dato, no un dado.

### 7.7 Tests de `tour.test.ts` (paso 7 del plan, antes del código)

```ts
describe('grammar/tour: composición como itinerario', () => {
  const seeds = Array.from({ length: 120 }, (_, i) => `tour-${i}`)
  const PAISES = { BE: 'llano', XX: 'ondulado', PT: 'media', ES: 'montana', CO: 'alta' } // XX = fallback

  it('las cuatro garantías de mixRoles siguen tras bloques y reparación', () => {
    for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 11, 15, 21])
      for (const cc of Object.keys(PAISES))
        for (const s of seeds) {
          const it = itinerarioDe(s, cc, n, 'flat', '2', 'una-semana')
          expect(it.papeles.some((r) => esCrono(r) || acabaArriba(r))).toBe(true) // garantía de fondo
          if (n >= 4) expect(it.papeles.some(esCrono)).toBe(true) // llana de 4+ lleva crono
          expect(it.papeles[0] === 'llana' || it.papeles[0] === 'prologo').toBe(true) // re-sellado: prólogo permitido
        }
  })
  it('ninguna reina en un país sin cordillera (BE, NL, DK, AE, AU)', () => {
    for (const cc of ['BE', 'NL', 'DK', 'AE', 'AU'])
      for (const n of [4, 6, 8])
        for (const s of seeds) {
          const it = itinerarioDe(s, cc, n, 'mountain', 'Pro', 'una-semana')
          expect(it.papeles.filter(esReina)).toHaveLength(0)
        }
  })
  it('la reina cae en una meta de cordillera o de zona montana/alta, y tarde', () => {
    for (const s of seeds) {
      const it = itinerarioDe(s, 'ES', 7, 'mountain', 'WT', 'una-semana')
      it.papeles.forEach((r, i) => {
        if (esReina(r)) {
          expect(admiteReina(it.metas[i], 'pirineos')).toBe(true)
          expect(i).toBeGreaterThanOrEqual(4)
        }
      })
    }
  })
  it('gran vuelta generada: descansos tras 9 y 15, reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, nunca 8 llanas seguidas', () => {
    expect(descansosDe(21)).toEqual([9, 15])
    expect(descansosDe(15)).toEqual([9])
    expect(descansosDe(11)).toEqual([])
    for (const s of seeds) {
      const it = itinerarioDe(s, 'FR', 21, 'mountain', 'WT', 'gran-vuelta') /* aserciones de §7.2 */
    }
  })
  it('vu_corta lleva como mucho una crono y una reina; el prólogo solo aparece con n ≥ 6', () => {
    /* n 2..5 × 120 semillas */
  })
  it('km por clase: una .2 de 5 etapas no pasa de 150 km por etapa ni de 180 en ninguna; p90 de .2 ≤ 170', () => {
    /* kmDe × 120 semillas */
  })
  it('el itinerario es identidad: no lee season y avanza por una ventana contigua de la ruta', () => {
    const it = itinerarioDe('race-x', 'ES', 6, 'hilly', '1', 'una-semana')
    const ruta = TERRITORIOS.ES.ruta.map((z) => z.zona)
    it.metas.forEach((z, i) => {
      if (i > 0)
        expect([
          it.metas[i - 1],
          ruta[(ruta.indexOf(it.metas[i - 1]) + 1) % ruta.length],
        ]).toContain(z)
    })
    expect(it.notas.every((n) => typeof n === 'string')).toBe(true)
  })
})
```

Con eso, «Bélgica sin reina», «la reina en los Pirineos y tarde», «una .2 de 100 a 150 km por etapa» y «los descansos de una gran vuelta generada» dejan de ser intenciones y son aserciones que corren en `test:rapido` antes de que exista una línea de `composeTour`.

---

## 8. La instanciación: colocación, rendido, cuadre, garantías, pancartas y circuitos

Esta sección es el interior de `generateStage` (`packages/engine/src/routes/grammar/generate.ts`): cómo una `StageRequest` (sección 3) se convierte en un `GeneratedStage` cuyo `profile` pasa los dieciséis vetos de la sección 9. Son siete pasos, cada uno con su subflujo de `routeRng` (`profileGen.ts` l. 30-44: mulberry32 sobre FNV-1a, una secuencia por cadena, mapa 01 §1), y los cuatro tratamientos posteriores al rendido que hoy no existen o existen mal: `normalizeEnlaces`, `garantizaClase`, `emitirPancartas` y `verify` con reintento. La regla que ordena todo es la del diagnóstico (sección 1): una tirada de más en `mountainSegments` mueve todos los perfiles de montaña del calendario (`profileGen.ts` l. 316-317, mapa 01 §2.5); aquí ninguna decisión comparte secuencia con otra, así que añadir una tirada a un subflujo no mueve los demás.

### 8.1 El punto de entrada y la lista cerrada de subflujos

```ts
// packages/engine/src/routes/grammar/generate.ts
import { routeRng } from '../profileGen'
import { SKELETONS } from './skeletons'
import { instanciar, degradar } from './motifs'
import { colocar } from './place'
import { renderSkeleton, normalizeEnlaces, garantizaClase, emitirPancartas } from './render'
import { verify } from './veto'
import { dPlusDe } from './geometry'
import { stageKindOf } from '../stageKind'
import { finalKindOf } from '../finalKind'

export function generateStage(req: StageRequest): GeneratedStage {
  const id = claveEtapa(req) // `${raceId}|${stageIndex}` o `${raceId}|e${stageIndex}|${editionKey}`
  const sk = req.fixed?.skeleton
    ? SKELETONS[req.fixed.skeleton]
    : elegirEsqueleto(req, routeRng(`arch|${id}`)) // paso 1
  const firma = instanciarFirma(sk, req.geo, routeRng(`firma|${id}`)) // paso 2
  const ed = edicion(sk, firma, req, routeRng(`ed|${id}|${seasonDe(req)}`)) // paso 3
  const timeTrial = sk.kind === 'cri'
  for (let intento = 0; intento < ARCH.colocacion.maxIntentos; intento++) {
    const s = seasonDe(req)
    const motivos = instanciar(sk, firma, ed, req, (slot, j) =>
      routeRng(`mot|${id}|${s}|${slot}|${j}|i${intento}`),
    ) // paso 4
    const colocados = colocar(motivos, ed.km, sk, req, routeRng(`pos|${id}|${s}|i${intento}`)) // paso 5
    if (colocados === null) continue // V10 antes de dibujar
    const segs = renderSkeleton(colocados, req.geo, req.desde, (slot) =>
      routeRng(`dib|${id}|${req.season}|${slot}|i${intento}`),
    ) // paso 6
    const cuadrados = normalizeEnlaces(segs, ed.km, colocados)
    if (cuadrados === null) continue // V10: los enlaces no absorben
    const garantizados = garantizaClase(cuadrados, sk, colocados)
    if (garantizados === null) continue
    const profile = { segments: garantizados, banners: emitirPancartas(garantizados, colocados) }
    const veto = verify(profile, sk, req, motivos) // paso 7
    if (veto === null) return salida(profile, sk, req, motivos, intento + 1, false, timeTrial)
  }
  return canonica(sk, req, id, timeTrial) // plantilla canónica, `degradado: true`
}
```

La lista de subflujos es cerrada y es la de la sección 3 (`edition.ts`): ningún otro `routeRng` se crea dentro de `grammar/`. `id` es la clave de etapa: `${raceId}` en un día (`stageIndex` 1), `${raceId}|${stageIndex}` en una etapa de vuelta generada y `${raceId}|e${stageIndex}|${editionKey}` en una etapa de edición real (`editionKey` es `${from}|${to}|${km}`, hoy la semilla entera en `calendar.ts` l. 224, mapa 02 §5; con el `raceId` delante dos carreras con la misma salida, meta y km dejan de dibujar lo mismo). `seasonDe(req)` es `req.season` cuando `routeSource === 'generado'` y `BASE_SEASON` (0) cuando `routeSource === 'edicion'`: en una etapa de edición real la temporada solo entra en `dib` (sección 10).

| Subflujo | Semilla                                                                                                                                                                      | Decide                                                                                                                 | `season`                                      | `i{intento}` |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------ |
| `arch`   | `arch\|${id}` (por carrera para la composición, sección 7; por etapa con `\|${stageIndex}` aquí)                                                                             | el esqueleto de la etapa                                                                                               | no                                            | no           |
| `firma`  | `firma\|${id}`                                                                                                                                                               | parámetros de los `Slot.firma` (meta, circuito, racimo de 5★, último puerto de una semana)                             | no                                            | no           |
| `ed`     | `ed\|${id}\|${season}`                                                                                                                                                       | km ± 6 %, cardinalidad de huecos no firma, vueltas ± 1, hueco opcional, objetivo de desnivel, alternativa si `nivel` 2 | sí                                            | no           |
| `mot`    | `mot\|${id}\|${season}\|${slot}\|${j}\|i${intento}`                                                                                                                          | km, g, forma, estrellas de la instancia `j` del hueco `slot`                                                           | sí                                            | sí           |
| `pos`    | `pos\|${id}\|${season}\|i${intento}`                                                                                                                                         | el inicio de cada dificultad dentro de su ventana                                                                      | sí                                            | sí           |
| `dib`    | `dib\|${id}\|${season}\|${slot}\|i${intento}` (`slot` es el índice del hueco; `e${k}` para el k-ésimo enlace; sufijo `\|hijo${h}` dentro de `cadena`, `racimo` y `circuito`) | rampas, ondulación, longitudes exactas                                                                                 | sí (siempre `req.season`, también en edición) | sí           |

Dos consecuencias que se sellan en `edition.test.ts` (sección 10): `arch` y `firma` no llevan temporada ni intento, así que un veto en la temporada 3 nunca cambia el esqueleto que la temporada 2 fijó (el defecto de banco §4.3, «a partir del tercer reintento el sorteo de arquetipo se repite», no existe aquí); y `ed` no lleva intento, así que reintentar no cambia cuántos motivos tiene la edición, solo cuáles y dónde.

### 8.2 Paso 1: identidad (`arch`)

`elegirEsqueleto(req, rng)` toma los candidatos de `SKELETONS` cuyo `kind` cuadra con `req.role` (tabla papel → esqueletos de la sección 7; `un_dia` con `req.terrain` como sesgo según la tabla de la sección 5) y cuyo `requiere` lo cumple `req.geo` (`admite`, sección 6). El peso de cada candidato es `pesoBase × (geo.pesos[id] ?? 1) × ARCH.pesoPorClase[id][raceClass]`; una tirada con pesos; si el sorteado pesa 0, el primero con peso > 0 en el orden del catálogo. Si no queda ninguno con peso > 0 (una zona con `puerto: null` y `role: 'reina_alto'`), se degrada el papel hacia abajo (`reina_* → media_alto → media → llana`, `degradar` de la sección 6, siempre hacia abajo) y se anota en `arch.frase` con el prefijo «(degradado a media)». `req.fixed?.skeleton` salta el sorteo: es lo que usan la galería (sección 16) y `frozenSkeletons` (sección 13). Resultado: `sk` es fijo para siempre para esa etapa de esa carrera.

### 8.3 Paso 2: firma (`firma`)

Para cada `Slot` con `firma: true` se instancian sus parámetros una sola vez por carrera, dentro de la intersección del rango del motivo (`ARCH.motivo.*`), del `params` del hueco y de `req.geo`, con la misma función `instanciar` del paso 4 pero con `routeRng(`firma|${id}`)` y sin intento. Los motivos resultantes llevan `firma: true` y `nombre`, y no se tocan en los pasos 3, 4 ni 8.9: ni la edición los mueve, ni la persecución del desnivel los escala, ni `garantizaClase` los recorta. El motivo `meta` es siempre firma (el muro de Huy mide siempre lo mismo). Con `ARCH.edicion.nivel` 2 y `Skeleton.alternativas` declaradas, la firma es la alternativa `season % alternativas.length` entera (Como/Bérgamo, sección 10), y este paso solo la copia.

### 8.4 Paso 3: edición (`ed`)

`rngEd = routeRng(`ed|${id}|${season}`)`. La temporada 0 tira sus dados igual que cualquier otra (sección 10: el calendario canónico no es el «menos variado de todos» porque todos los huecos tomen la mediana; `juicios/ejecutabilidad.md` §2.1). En orden fijo de tiradas:

1. `km`: si `routeSource === 'edicion'`, `km = req.km` sin tirada (contrato al 0,1 con `calendar.test.ts` l. 162-174, mapa 06 §1). Si `generado`, `km = round1(req.km × U(1 − ARCH.edicion.kmJitter, 1 + kmJitter))` con `kmJitter` 0,06, acotado a `[sk.km[0]; min(sk.km[1], ARCH.km.maxPorClase[raceClass])]`. `req.km` ya viene de `kmDe` con `ARCH.km.porClase` (sección 7).
2. Por cada hueco no firma: `n_i = entero uniforme en [n[0]; n[1]]`.
3. Por cada `circuito` firma: con p `ARCH.edicion.vueltasJitter` 0,5, `vueltas ± 1` (signo por otra tirada), acotado a `ARCH.motivo.circuito.vueltas` [3; 18].
4. Con p `ARCH.edicion.motivoNuevo` 0,35, un hueco opcional (`n[0] === 0`) elegido uniformemente cambia de estado: si estaba a 0 pasa a 1 y si estaba a ≥ 1 pasa a 0.
5. `dPlusObjetivo = req.fixed?.dPlus ?? round(U(sk.dPlus[0], sk.dPlus[1]))`, metros, TOTAL con relleno (sección 12, `ARCH.reina.dPlusIncluyeRelleno`).

Con `ARCH.edicion.activa` false los pasos 1 a 4 no tiran y toman el mínimo de cada rango (`n[0]`, `km` de la fila); el paso 5 sí tira, porque el objetivo de desnivel es de la etapa y no de la edición. Con `nivel` 0 igual que `activa` false. En una etapa de edición real los pasos 2 a 4 tampoco tiran: los motivos de una edición real no cambian entre temporadas, solo su dibujo (`seasonDe` devuelve 0 para `mot` y `pos`).

### 8.5 Paso 4: instanciación de motivos (`mot`) y persecución del desnivel

Para cada hueco `slot` con `n_slot` instancias y cada `j < n_slot`, `rng = routeRng(`mot|${id}|${season}|${slot}|${j}|i${intento}`)` sortea, en este orden, `km`, `g`, `forma`, `estrellas`, `adoquin`, cada uno uniforme en la intersección de tres rangos: el del motivo en `ARCH.motivo.*` (sección 12), el `params.kmRango`/`gRango` del hueco, y el de `req.geo` (`geo.puerto.km`, `geo.cota.g`, `geo.muro.adoquin`...). `firme` de un `sector` es `adoquin` si `geo.adoquin ≥ 2` y `tierra` si `geo.sterrato`; `forma` de un `puerto` es la de `geo.puerto.forma` si la zona la fija y si no uniforme entre las tres.

Degradación por geografía (`degradar`, sección 6): si la intersección es vacía o el motivo no existe en la zona (`geo.puerto === null`), el hueco se degrada hacia abajo y nunca hacia arriba: `puerto → cota → muro → enlace`; `cota → muro → enlace`; `muro → cota → enlace` (un muro no existe en pólder, pero una cota corta sí si `geo.cota` no es `null`); `sector` y `racimo` con `geo.adoquin < 2` y sin `sterrato` → `enlace`; `circuito` conserva las vueltas y degrada a sus hijos. Un hueco degradado a `enlace` desaparece de la lista de dificultades y se anota `nombre: 'sin puerto aquí'` para la frase. Un hueco obligatorio (`n[0] ≥ 1`) que degrada a `enlace` no es un fallo: `requiere` (sección 5) ya impidió elegir el esqueleto en esa zona, así que solo ocurre con `fixed.skeleton`, y entonces V1 a V4 lo dirán.

Persecución del desnivel total. Sea `D = Σ km·g·10` sobre todas las dificultades instanciadas (hijos de `cadena`, `racimo` y cada vuelta del `circuito` incluidos, y `cotaFinal` de `meta`), `kmDif = Σ km` de esas dificultades más las bajadas obligatorias del paso 5 (8.6), `kmEnl = km − kmDif` y `R = ARCH.reina.rellenoDplusPorKm × kmEnl` (5,5 m/km, la estimación del relleno de 661 a 1.413 m que el mapa 01 §1 mide en llanas de 130 a 215 km; se recalibra en el paso 3 del plan contra `dPlusDe` y no contra `sampleProfile`). Entonces `escala = clamp((dPlusObjetivo − R) / D, ARCH.reina.escalaDificultades[0], [1])` = [0,7; 1,4] (hoy [0,55; 1,8], `profileGen.ts` l. 374, mapa 01 §2.5), y se multiplica por `escala` la LONGITUD de las dificultades no firma, nunca la pendiente, nunca la firma, nunca la meta. Tras escalar, cada `km` se vuelve a acotar al rango del motivo ∩ zona (una `cota` de 8,0 × 1,4 sería 11,2 y volvería a 8,0: por eso el techo 8,0 de `ARCH.motivo.cota.km` es duro y una cota nunca cruza `PASS_MIN_KM` 8,5 por escala). El objetivo se persigue sobre lo mismo que `desnivelDe` mide (`calendarQueens.ts` l. 55-59, mapa 01 §2.5), que es lo que hoy no pasa: el generador viejo compara el objetivo con los puertos solos y el banco lo lee con relleno.

### 8.6 Paso 5: colocación por ventanas (`pos`, `place.ts`)

```ts
// packages/engine/src/routes/grammar/place.ts
export interface Placed {
  motif: Motif
  slot: number | 'meta'
  inicioKm: number
  finKm: number
  bajada?: Motif
}
export function colocar(
  motivos: Motif[],
  km: number,
  sk: Skeleton,
  req: StageRequest,
  rand: () => number,
): Placed[] | null
```

1. Bajadas obligatorias: en todo esqueleto `et_*` y en `ud_montana*`, cada `puerto` y cada `cota` que no sea el de meta lleva detrás un `descenso` con `km = clamp(len·g·10/55, ARCH.motivo.descenso.kmPorDesnivel.kmMin 2, kmMax 10)` (la bajada canónica de `mountainClassicSegments` l. 467; sección 12, `ARCH.motivo.descenso.kmPorDesnivel`) y pendiente `g = −clamp(f·len·g·10 / (km·10), 3, 8)` con `f = U(ARCH.colocacion.bajadaTrasPuerto)` = [0,6; 0,9]: la bajada devuelve entre el 60 y el 90 % de lo subido, dentro de `ARCH.motivo.descenso.g` [−8; −3]; lo que no cabe en 10 km se queda arriba (Galibier a Lautaret). Dentro de `et_reina_encadenada` la bajada existe pero el hueco entre ella y el siguiente puerto es 0 (van pegados). En un `ud_muros` no hay bajadas: tras un muro va enlace, como hoy (`classicSegments`, mapa 01 §2.4).
2. `kmDif = Σ km` de dificultades y bajadas; `kmEnl = km − kmDif`. Si `kmEnl < ARCH.colocacion.enlaceMinimoTotal × km` (0,12; hoy 0,15 solo en reina, l. 390), se recorta la dificultad no firma más larga hasta cumplir, respetando su rango mínimo; si no basta, `colocar` devuelve `null` (V10 antes de dibujar) y el bucle reintenta.
3. Las dificultades se ordenan por el `a` de su ventana (`Slot.ventana`, fracción de la etapa donde EMPIEZA el motivo). Para la `i`-ésima, `inicio_i = round1(km × U(a_i, b_i))`, y se corrige a `max(inicio_i, fin_{i−1} + ARCH.colocacion.enlaceMinimo)` con `enlaceMinimo` 1,5 km (tres veces `finishClimbGapBlocks` 5 = 0,5 km, para que dos dificultades nunca formen una sola racha en `deriveFinishTerrain`). Dentro de `cadena` los hijos van separados por enlaces de `ARCH.motivo.cadena.separacion` [1; 6] km y dentro de `racimo` por `ARCH.motivo.racimo.separacion` [2; 6]; esos enlaces internos cuentan como `kmEnl` pero no se escalan en 8.8. La `meta` empieza siempre en `km − km_meta`; si la última dificultad invade la meta se empuja hacia atrás (y hacia atrás las anteriores en cascada con el mismo mínimo); si la cascada saca la primera del km 0, `null`.
4. Los huecos entre dificultades son `enlace` con la `amplitud` de `req.geo`; `expuesto` (amp `ARCH.motivo.expuesto.amp` 1,0) donde el esqueleto lo declara o donde `geo.viento ≥ 2` y `geo.relieve === 'llano'`; `tendida` solo donde el esqueleto lo pone. Un hueco < 0,5 km se elimina (mismo umbral que `rolling`, l. 101, y que `split`, l. 52-65).

Etapa de transición (sección 7, `ARCH.itinerario.transicion` 0,4): si `req.desde` existe y es distinto de `req.geo.zona`, el primer 40 % del km se traza con la `amplitud` de `ZONAS[desde]` y sin sus dificultades, y toda ventana se recorta a `[max(a, 0,4); max(b, 0,45)]`. Una Meseta → Cantábrico es 70 km de páramo y 100 de sierra (geografía §7.3).

Circuito. Un `circuito` se coloca como una sola dificultad de `vueltas × kmVuelta` km en su ventana; el residuo `km − vueltas × kmVuelta − (dificultades lineales)` es el enlace de aproximación, que existe siempre y mide al menos `enlaceMinimo` 1,5 km (también en `nc_ruta` y `ud_criterium`, donde es la salida hasta entrar en el circuito): si el residuo no llega a 1,5, se resta 0,1 a `kmVuelta` hasta que llegue (nunca por debajo de `ARCH.motivo.circuito.kmVuelta[0]` 8, o 1,5 en `ud_criterium`). Los hijos se colocan dentro de UNA vuelta con el mismo procedimiento y la ventana relativa a la vuelta; las otras vueltas son copias.

### 8.7 Paso 6: rendido (`dib`, `renderSkeleton`)

```
renderSkeleton(colocados, geo, desde, rngDe):
  segs = []; cursor = 0; k = 0
  para cada p en colocados (en orden de inicioKm):
    hueco = p.inicioKm − cursor
    si hueco ≥ 0,5:
      amp = (desde && cursor < 0,4·km) ? ZONAS[desde].amplitud : geo.amplitud          // tope ARCH.motivo.enlace.ampMax 2,4
      segs += rolling(rngDe(`e${k}`), hueco, amp, 0); k += 1                            // enlace: pRompepiernas SIEMPRE 0
    segs += rendir(p.motif, rngDe(p.slot))
    si p.bajada: segs += descent(rngDe(p.slot), p.bajada.km, |p.bajada.g|)             // misma secuencia que su puerto
    cursor = p.finKm (+ bajada)
  si km − cursor ≥ 0,5: segs += rolling(rngDe(`e${k}`), km − cursor, geo.amplitud, 0)   // solo si la meta no es una cota
  devuelve segs
```

`rendir` por motivo, con las primitivas que `profileGen.ts` conserva y exporta (sección 12; `climb` l. 72-82, `descent` l. 85-93, `rolling` l. 100-122, mapa 01 §1):

| Motivo             | Rinde                                                                                                                                                                                                                                                                                                                                                                                                                           | Detalle que decide                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enlace`           | `rolling(rand, km, geo.amplitud, 0)`                                                                                                                                                                                                                                                                                                                                                                                            | `amp` numérica (hoy `bumpy` booleano: false = 1,8, true = 3,2); `pRompepiernas` 0: nunca se emite `rompepiernas` porque `sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora los tramos (mapa 03 §2; sección 2, principio 8). `ampMax` 2,4 impide que el relleno alcance el 3 % que `finish.ts` lee como cota (`finishClimbMinGradient` 3) |
| `expuesto`         | `rolling(rand, km, 1,0, 0)`                                                                                                                                                                                                                                                                                                                                                                                                     | pólder, desierto, meseta                                                                                                                                                                                                                                                                                                                 |
| `tendida`          | UN `Segment` `llano` con `max(2, min(4, round(km/8)))` tramos a `g ± 0,7`                                                                                                                                                                                                                                                                                                                                                       | tipada `llano` a propósito: cuesta y frena por `g` pero no suma a `kmSubida` (mapa 03 §4.1)                                                                                                                                                                                                                                              |
| `descenso`         | `descent(rand, km,                                                                                                                                                                                                                                                                                                                                                                                                              | g                                                                                                                                                                                                                                                                                                                                        | )`                                                                                                                    | `max(2, round(km/3))` rampas a `−max(2, avg ± 1,5)` |
| `cota`             | `climb(rand, km, g)`                                                                                                                                                                                                                                                                                                                                                                                                            | rampas `max(2, round(km/2,2))`, más dura arriba                                                                                                                                                                                                                                                                                          |
| `puerto`           | `climb(rand, km, g)`; con `forma: 'irregular'`, una rampa de `ARCH.motivo.puerto.rampaIrregular` (0,3 a 0,8 km al 11 a 13 %) sustituye a la rampa central                                                                                                                                                                                                                                                                       | SPEC §6.17: el irregular abre ≥ 1,5× brecha; a ≥ 8 % el motor usa COL (`wallMinGradient`, mapa 03 §2)                                                                                                                                                                                                                                    |
| `muro`             | `climb(rand, km, g, { gMax: ARCH.motivo.muro.gMax })` con `n = 2` rampas                                                                                                                                                                                                                                                                                                                                                        | `gMax` 16 acota el ruido ±1,2 y la progresión +1,6 que hoy dan 14,8 % sobre un 12 % (mapa 01 §2.4); un muro `adoquin: true` sigue siendo `puerto` (regla 5 de `fuentes-recorridos.md`)                                                                                                                                                   |
| `sector`           | `{ km, tipo: 'paves', estrellas }` como `cobblesSegments` l. 503                                                                                                                                                                                                                                                                                                                                                                | `firme: 'tierra'` → `estrellas` acotadas a [2; 3]                                                                                                                                                                                                                                                                                        |
| `cadena`, `racimo` | los hijos con `rngDe(`${slot}                                                                                                                                                                                                                                                                                                                                                                                                   | hijo${h}`)`, separados por `rolling` de la separación sorteada en 8.6 con amp 0,7                                                                                                                                                                                                                                                        |                                                                                                                       |
| `circuito`         | los hijos y los enlaces internos de una vuelta rendidos UNA vez con `rngDe(`${slot}                                                                                                                                                                                                                                                                                                                                             | hijo${h}`)` y copiados `vueltas` veces                                                                                                                                                                                                                                                                                                   | la vuelta 7 tiene las mismas rampas que la 1: es lo que hace reconocible un circuito (Québec, Montréal, mapa 07 §1.1) |
| `meta`             | según `MetaKind` (tabla de la sección 4): `esprint` nada (el último enlace ya es la meta); `repecho`/`alto_corto`/`alto_largo` `climb(cotaFinal)` como ÚLTIMO segmento; `muro_meta` `rolling(2, 2,5, 0)` + `climb(cotaFinal, { gMax: 16 })` con 2 rampas; `cima_cerca`/`descenso_meta`/`valle` la cota o puerto + `descent` + `rolling` con el valle sorteado en `ARCH.meta.*.valle`; `sector_meta` `sector` + `rolling(aMeta)` | los 2 km a amplitud ≤ 2,5 del `muro_meta` son para que `finishClimbGapBlocks` 5 no funda la racha con un repecho anterior (`finish.ts` l. 94-123; sección 4)                                                                                                                                                                             |

Todo `km` de segmento y de tramo va redondeado a 0,1 (como `split`). Un tramo nunca baja de 0,5 km salvo la rampa irregular del `puerto` (0,3 a 0,8), que es la única excepción y está dentro de un segmento de ≥ 9 km.

### 8.8 `normalizeEnlaces`: cuadrar los km solo con los enlaces

```ts
export function normalizeEnlaces(segs: Segment[], km: number, colocados: Placed[]): Segment[] | null
```

`delta = km − Σ segs.km` (al 0,1). Los candidatos son los segmentos rendidos desde `enlace` y `expuesto` que no están dentro de una `cadena`, un `racimo`, un `circuito` ni de la aproximación del `muro_meta`; `tendida`, dificultades, bajadas, sectores y meta no se tocan nunca (a diferencia de `normalize`, l. 141-177, que escala TODOS los segmentos y por eso estira un valle de 20 a 20,3 y cambia de cubeta, mapa 01 §2.5). `delta` se reparte entre los candidatos proporcionalmente a su `km`, reescalando sus tramos, redondeando cada uno a 0,1; el residuo de redondeo va al enlace más largo, como hoy (l. 155-175). Si algún enlace quedaría por debajo de 0,5 km, o no hay candidatos y `delta ≠ 0`, devuelve `null` (V10) y el bucle reintenta. Salida garantizada: `Σ km === km` con error 0,0 (hoy medido 0,00 en 12.000 etapas con `normalize`, mapa 01 §1; aquí se exige lo mismo en `generate.test.ts`). En un circuito el reparto solo toca el enlace de aproximación y el llano final, nunca los enlaces de la vuelta: las vueltas siguen siendo idénticas.

`normalize` y `garantizaPuerto` (l. 192-233) siguen existiendo hasta el paso 8 del plan para `legacy.ts`, y `normalizeTotal` de `featureProfile.ts` no se toca (sección 11).

### 8.9 `garantizaClase`: la red de seguridad

```ts
export function garantizaClase(segs: Segment[], sk: Skeleton, colocados: Placed[]): Segment[] | null
```

Se aplica después de cuadrar y antes de las pancartas. Lee solo `climbSize` (`stageKind.ts` l. 36-42, suma de tramos con g > 0), la posición del último segmento `puerto` y los cortes; nunca `sampleProfile`. Con `margenClaseKm` 0,3 y `margenValleKm` 0,7 (`ARCH.veto.*`; 0,7 porque `auto()` redondea el km de la pancarta al entero y `normalize` estiraba hasta un 2 %, contra los 4 de 6.000 del mapa 01 §2.5):

1. `sk.kind === 'reina'` y ningún `puerto` con `climbSize ≥ PASS_MIN_KM + 0,3` (8,8) ni D+ ≥ `QUEEN_MIN_CLIMB_METRES` 3.200 con margen 100: alarga el puerto más largo hasta 8,8 compensando en el enlace más largo. Es el borde de 3 de 1.500 (`mountain 175 semilla-167`, mapa 01 §5.1); con `puerto.km ≥ 9,0` no debería dispararse, y `routeCensus` cuenta cuántas veces lo hace.
2. `sk.kind === 'media'` y algún `puerto` con `climbSize > 8,5 − 0,3` (8,2): lo recorta a 8,2 compensando en el enlace más largo. Con `cota.km ≤ 8,0` es red, no regla.
3. `sk.kind === 'clasica'`: toda cota `climbSize ≤ 2,9` (nuevo: hoy `classicSegments` no lo garantiza y `normalize` puede estirar un muro de 2,5 a 3,1, banco §4.5); si alguna pasa, se recorta a 2,9.
4. `sk.finalKind` declarado: el valle tras la última cota (km desde el final del último `puerto` hasta meta) se lleva dentro de `[corte_inf + 0,7; corte_sup − 0,7]` de `FINAL_KIND_CUTS` {0,5; 5; 20} recortando o alargando el enlace final y compensando en el enlace más largo anterior. Para `alto` el valle es 0 por construcción (la cota es el último segmento; `calendar.test.ts` l. 269-277).
5. Guarda de tramos: para todo segmento, `Σ tramos.km === segment.km` al 0,1; si no, se corrige el último tramo (el mecanismo de `normalize` l. 169-173). Cierra el desacuerdo entre `garantizaPuerto` (fija `segment.km`) y `climbSize` (suma tramos) que da los 1 y 2 de 1.500 del mapa 01 §5.1.

Si la compensación dejaría un enlace < 0,5 km, devuelve `null` y se reintenta. Se mide en `routeCensus` cuántas etapas pasan por 1 a 4 (columna `garantias`); el objetivo escrito en `ROUTE_CENSUS_TARGETS` es < 2 % del calendario, porque la red que trabaja mucho es un rango mal puesto.

### 8.10 `emitirPancartas`: cima en los puertos, siempre en el último

```ts
export function emitirPancartas(segs: Segment[], colocados: Placed[]): Banner[]
```

`auto()` (`calendar.ts` l. 93-102) pone una `cima` al final de CADA `puerto` al km acumulado redondeado, y cada pancarta le cuesta al motor 2 de depósito a quien la disputa y abre 5 km de alivio (`bannerCost`, `reliefKm`, mapa 03 §4.2 y §10.8), y puntúa cat4 aunque el segmento no lleve `cat` (mapa 03 §2): con 10 a 20 muros en un `ud_muros` son 10 a 20 pancartas que ninguna Ronde tiene (`juicios/motor.md` §5 riesgo 4). La regla de geografía (solo cotas ≥ 1,5 km) rompía `finalKindOf` en un muro de meta, porque `lastClimbKm` (`finalKind.ts` l. 46-57) mira primero las pancartas y sin ella cae al último `puerto` ≥ `CLIMB_MIN_KM`, que puede estar a 30 km. La regla decidida, que la sección 9 da por supuesta en V5 y V7:

- `cima` al final de todo segmento `puerto` con `climbSize ≥ ARCH.pancarta.cimaMinKm` 1,5, al `Math.round(cum)` como `auto()`, sin `cat` (la deriva `deriveClimbCategory` de los tramos del segmento, `sample.ts` l. 131-143).
- SIEMPRE una `cima` al final del último segmento `puerto` de la etapa, mida lo que mida: así el `muro_meta` de 0,5 km tiene pancarta, `lastClimbKm` lo ve y `finalKindOf` dice `alto`. Es también el borde de 12 de 1.500 del mapa 01 §2.4 cerrado (clásicas donde ningún muro llegaba a 1,5 y `finalKindOf` daba `null`).
- En un `circuito`, una por paso de cada cota ≥ 1,5 km (9 vueltas con una cota de 2 km son 9 pancartas, como en Montréal); un muro de circuito < 1,5 km no lleva pancarta salvo en su último paso si es el último `puerto` de la etapa. Un muro corto de circuito, por tanto, puntúa una vez y no nueve.
- Ninguna `meta_volante` generada (regla de la casa de `calendar.ts` l. 89-91; decisión del dueño D4, valor por defecto «no», sección 18).
- `auto()` se conserva para las etapas `real` (`featureSpec`) y no se toca.

`kmSubida` no se toca: el motor cuenta bloques por tipo (`simulate.ts` l. 1696, mapa 03 §4.1) y eso es del motor, no del generador. Lo que sí se hace es medirlo: 8.12.

### 8.11 Paso 7: verificación, reintento y plantilla canónica

`verify(profile, sk, req, motivos)` (sección 9) devuelve el primer `Veto` o `null`, y solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `dPlusDe` y la geometría del esqueleto (sección 9: nunca `sampleProfile`, `finishType` ni `costBase`; eso se mide en `routeCensus` y es V16). El orden de comprobación es el de coste creciente: V10, V15, V6, V7, V1 a V4, V5, V8, V9. Si hay veto, `intento += 1` y se repite desde el paso 4 con `i{intento}` en `mot`, `pos` y `dib`; `arch`, `firma` y `ed` no cambian. El tope es `ARCH.colocacion.maxIntentos` 8; `ARCH.veto.intentosP95` 3 es lo que `skeletons.test.ts` exige en el p95 por esqueleto × zona, y si se supera se estrechan rangos antes que subir el tope (sección 17, riesgo 9).

Agotados los ocho, `canonica(sk, req, id, timeTrial)`: toma `sk.canonico` (un `Motif[]` literal por esqueleto, sección 5), lo coloca con `pos|…|i8`, lo rinde con `dib|…|i8`, cuadra, garantiza y emite pancartas, y devuelve `degradado: true` e `intentos: 8`. No se vuelve a verificar en producción: que la canónica pasa `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts`, y un fallo ahí es un fallo de catálogo, no de una etapa. `routeCensus` cuenta `degradado` y `ARCH.veto.fallbackMaxShare` exige 0 en las 1.418 del calendario y ≤ 0,005 en las 300 semillas × zona del test por esqueleto: un degradado en el calendario es un defecto de parametrización, no un resultado (banco §4.6).

### 8.12 Circuitos: lo que el motor no sabe y lo que se mide

El motor no tiene noción de vuelta: un circuito es colocación repetida. Tres consecuencias medidas y una decisión por cada una:

- `kmSubida` cuenta bloques `subida` por tipo (mapa 03 §4.1): un circuito de 12 vueltas con un muro de 1 km suma 12 km de subida, `breakAppeal = clamp(4·kmSubida/total + 0,35·[final en alto], 0, 1)` sube y `gcTerrain` (`kmSubida/total ≥ 0,05`) se enciende (`simulate.ts` l. 1696-1710). Es lo que la vida real hace (la selección de un circuito es acumulada), pero nadie ha medido cuánto selecciona una cota subida 14 veces con `selectionFactor` 1 y deriva integrada (`juicios/ejecutabilidad.md` §5 riesgo 4). Decisión: `routeCensus` mide `kmSubidaShare` y `breakAppealEstimado` (la fórmula de arriba sobre los segmentos, sin `sampleProfile`) por esqueleto, con banda INFORMATIVA `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15 (se imprime, no veta), y el banco de saturación de la sección 13 remide con los `nc-*-road`, que son 5 de las 8 más duras de hoy.
- Pancartas: 8.10. Un muro corto de circuito puntúa una vez.
- Identidad: las vueltas comparten semilla de detalle (8.7), y `V12` (anti-clon) compara etapas distintas, nunca vueltas de la misma etapa.

Los 532 nacionales (`nc_ruta`, `nc_crono`) pasan por aquí y cambian de golpe de `classic(220)` a circuito: se remiden en el paso 9 del plan y el `world.test.ts` con `RACE_DAY_TSS` se mide antes y después (sección 13).

### 8.13 La salida: `kind`, `label`, `arch` y la frase

`salida(...)` construye el `GeneratedStage` de la sección 3: `kind = stageKindOf(profile, timeTrial).kind` y `label = stageKindOf(...).label` (sección 11: el `kind` de una etapa generada sale del perfil y V6 garantiza que coincide con `sk.kind`); `arch.finalKind = finalKindOf(profile)` (V7 garantiza que coincide con `sk.finalKind` cuando está declarado); `arch.dPlus = dPlusDe(profile)` (integración de tramos con g > 0, como `altimetry.ts::elevationProfile`); `arch.metadatos = { viento: geo.viento, altitud: geo.altitud }` para la ficha, nunca para la física (sección 6 y sección 17, riesgo 1); `routeSource = req.routeSource`.

`arch.frase` la escribe `fraseDe(sk, motivos)` (función interna de `generate.ts`): enumera las dificultades en orden con su `nombre` («Puerto de 14 km al 7 %», «Cadena de 5 muros», «Racimo de 8 sectores, dos de 5★») y cierra con la meta y la distancia («meta a 2 km del muro», «llegada en alto de 11 km al 8 %», «esprint»). Tres ejemplos que el test compara literalmente: «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro» (`ud_circuito`), «Dos puertos de 12 y 17 km y una cota de 3 km a 9 km de meta; bajada y llano» (`ud_montana`), «Llano abierto con dos cotas lejanas; esprint» (`et_llana_viento`: «abierto», nunca «abanicos», sección 17, riesgo 1). El sufijo «(degradado a media)» o «(plantilla canónica)» va al final cuando toca.

### 8.14 Tests primero (`grammar/place.test.ts`, `grammar/generate.test.ts`)

`render.ts` no tiene fichero de test propio en la lista de la sección 3: sus tests viven en `generate.test.ts` bajo `describe('renderSkeleton')`, `describe('normalizeEnlaces')`, `describe('garantizaClase')` y `describe('emitirPancartas')`. Los de colocación en `place.test.ts`. Todos con `fixed.skeleton` y zonas literales; ninguno con `sampleProfile`.

```ts
// grammar/place.test.ts
describe('colocar', () => {
  it('respeta la ventana: el inicio de cada dificultad cae en km × [a, b]', () => {
    for (const seed of semillas(200)) {
      const p = colocar(motivosDe('ud_montana', ZONAS.alpes, seed), 240, SKELETONS.ud_montana, req, routeRng(`pos|t|${seed}`))!
      p.filter(x => x.slot !== 'meta').forEach((x, i) => expect(x.inicioKm / 240).toBeWithin(...ventanaDe(x.slot)))
    }
  })
  it('dos dificultades nunca se tocan: hueco ≥ 1,5 km salvo dentro de cadena y de reina encadenada', ...)
  it('la bajada tras un puerto de 12 km al 7 % mide 10 km (clamp de 840/55) y baja entre 5,0 y 7,6 %', ...)
  it('devuelve null cuando los enlaces no llegan al 12 % (V10 antes de dibujar)', () => {
    expect(colocar(motivosDe('et_reina_encadenada', ZONAS.dolomitas, 1), 95, ...)).toBeNull()
  })
  it('circuito: el enlace de aproximación mide ≥ 1,5 km y vueltas × kmVuelta + aproximación = km', ...)
  it('transición: con desde = meseta ninguna dificultad empieza antes del 40 %', ...)
})
```

```ts
// grammar/generate.test.ts (extracto)
describe('renderSkeleton', () => {
  it('nunca emite rompepiernas ni un tramo con g > 20 o < −14', ...)                       // 300 semillas × 6 esqueletos
  it('un muro al 12 % con gMax 16 no tiene rampa por encima de 16,0', ...)
  it('la vuelta 7 de un circuito es idéntica a la 1 (deepEqual de sus Segment[])', ...)
  it('tendida rinde UN llano con 2 a 4 tramos y no ningún puerto', ...)
})
describe('normalizeEnlaces', () => {
  it('Σ km === km con error 0,0 en 1.000 semillas y solo cambian los enlaces', () => {
    const antes = ...; const despues = normalizeEnlaces(antes, 197.3, colocados)!
    expect(sum(despues)).toBeCloseTo(197.3, 1)
    dificultades(antes).forEach((s, i) => expect(dificultades(despues)[i]).toEqual(s))
  })
  it('devuelve null si un enlace quedaría < 0,5 km', ...)
})
describe('garantizaClase', () => {
  it('en clásica ninguna cota supera 2,9 km tras cuadrar', ...)
  it('cima_cerca: el valle queda en [1,2; 4,3] y finalKindOf dice cima_cerca en 1.000 de 1.000', ...)
  it('todo segmento cumple Σ tramos === km al 0,1', ...)
})
describe('emitirPancartas', () => {
  it('pone cima en todo puerto ≥ 1,5 km y SIEMPRE en el último puerto aunque mida 0,5', () => {
    const g = generateStage({ ...req, fixed: { skeleton: 'ud_muro_final' } })
    const ultimo = ultimoPuerto(g.profile.segments)
    expect(g.profile.banners.at(-1)).toEqual({ km: Math.round(ultimo.finKm), tipo: 'cima' })
    expect(finalKindOf(g.profile)).toBe('alto')
  })
  it('un circuito con muro de 1,1 km × 9 lleva UNA pancarta, la del último paso', ...)
  it('un circuito con cota de 2 km × 9 lleva nueve', ...)
  it('ninguna meta_volante', ...)
})
describe('generateStage', () => {
  it('es pura: dos llamadas iguales dan el mismo profile (deepEqual) y la misma frase', ...)
  it('añadir una tirada a `ed` no cambia el dibujo: mismo dib para el mismo motivo', ...)
  it('la temporada 0 tira dados: dos carreras del mismo esqueleto y zona no tienen siempre la misma cardinalidad', ...)
  it('edición real: km exacto al 0,1 y los motivos no cambian entre season 0 y 3, solo las rampas', ...)
  it('kind === stageKindOf(profile).kind y finalKind === finalKindOf(profile) en 32 esqueletos × 5 km × 60 semillas', ...)
  it('intentos p95 ≤ 3 y degradado === false en 300 semillas × zona compatible por esqueleto (fallbackMaxShare 0,005)', ...)
  it('frase literal de los tres ejemplos de §8.13', ...)
  it('no importa stage/sample ni stage/finish (grep del módulo)', ...)
})
```

Coste: sin `sampleProfile` por intento (el juez del motor mide 0,40 ms por etapa esa pasada, `juicios/motor.md` §1, y aquí no se paga), una etapa cuesta instanciar ≤ 12 motivos, colocar, rendir ≤ 80 segmentos y verificar con `climbSize` y `dPlusDe`, hasta 8 veces en el peor caso; la medida con objetivo y techo es la de la sección 14.

### 8.15 Qué cambia respecto de hoy en este tramo, línea a línea

| Hoy (mapa 01)                                                                                                                                                      | Diseño                                                                                        | Dónde     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | --------- |
| Una semilla por forma (`row.id`, `${row.id}\|${i}`, `${from}\|${to}\|${km}`) y una secuencia para todo: «una tirada más y todos los perfiles cambian» (l. 316-317) | seis familias de subflujo con clave de etapa; `arch` y `firma` sin temporada ni intento       | 8.1       |
| Número de dificultades por umbral de km (`nWalls = km > 200 ? 5 : 4`, `midClimbs = km > 165 ? 3 : 2`)                                                              | cardinalidad sorteada en `ed` dentro de `Slot.n`, con la temporada 0 tirando dados            | 8.4       |
| Objetivo de desnivel comparado con los puertos solos y leído por el banco con relleno (l. 365-374, `desnivelDe`)                                                   | objetivo TOTAL, relleno estimado a 5,5 m/km, escala [0,7; 1,4] solo sobre longitudes no firma | 8.5       |
| Posición por `split(fill, n + 1)`: el último muro a 15,7 a 184 km de meta (§2.4)                                                                                   | ventanas por hueco, `enlaceMinimo` 1,5 km, meta en `km − km_meta`                             | 8.6       |
| Bajada `U(5, 8)` km al 6 % fija                                                                                                                                    | `clamp(len·g·10/55, 2, 10)` km devolviendo el 60 a 90 % de lo subido                          | 8.6       |
| `rolling(rand, km, bumpy)` con `rompepiernas` p 0,35 que `sample.ts` colapsa a g 1,5                                                                               | `rolling(rand, km, amp, 0)` con `amp` de la zona y tope 2,4; nunca `rompepiernas`             | 8.7       |
| `climb` sin tope: 14,8 % medido sobre un muro al 12 % (§2.4)                                                                                                       | `climb(rand, len, avg, { gMax: 16 })` en muros y `muro_meta`                                  | 8.7       |
| `normalize` escala todos los segmentos: 20 → 20,3 y cambia de cubeta (§2.5)                                                                                        | `normalizeEnlaces` escala solo enlaces; V10 si no absorben                                    | 8.8       |
| `garantizaPuerto` fija `segment.km` y `climbSize` suma tramos: 3 de 1.500 cruzan 8,5 (§5.1)                                                                        | `garantizaClase` con margen 0,3 / 0,7 y guarda `Σ tramos === km`                              | 8.9       |
| `auto()`: una `cima` por `puerto`, 10 a 20 en una clásica de muros; ninguna si ningún muro llega a 1,5 (12 de 1.500, §2.4)                                         | `cima` en puertos ≥ 1,5 km y SIEMPRE en el último; en circuito, por paso de cota ≥ 1,5        | 8.10      |
| Sin verificación: el 14 % de `mountainClassicSegments` sale `media` (§2.6) y `race-jura` muere en un puerto de 14 km                                               | `verify` puro, 8 intentos, plantilla canónica contada y exigida a 0 en el calendario          | 8.11      |
| Un circuito no existe (`nc-*-road` es `classic(220)`)                                                                                                              | `circuito` con vueltas idénticas, aproximación ≥ 1,5 km y `kmSubidaShare` medido              | 8.6, 8.12 |
| `kind` y `label` declarados por el molde y reetiquetados en `stageHistory.ts` l. 73 (72 discrepancias)                                                             | `kind` y `label` de `stageKindOf(profile)`, garantizados por V6                               | 8.13      |

---

## 9. Los vetos y la plausibilidad

Un veto es un predicado puro con nombre que dice «esto no existe» o «esto no es lo que declara». Hay dieciséis (decisión 24) y viven en `packages/engine/src/routes/grammar/veto.ts` como `V1` a `V16`, con un punto de entrada `verify` que devuelve el primero que salta o `null`. Se dividen en tres capas según dónde se comprueban: once por etapa con reintento (V1 a V10 y V15: si saltan, `generateStage` repite desde la instanciación con `i{intento}` en `mot`, `pos` y `dib`, sección 8), tres de calendario medidos en `routeCensus` (V11, V12, V16: no reintentan, porque un fallo suyo es un defecto de rangos y se corrige en `ARCH`, no en una etapa) y dos de vuelta (V13, V14: se reparan en `composeTour` y se sellan en `tour.test.ts`, sección 7). La regla que ordena la capa es la del juez del motor (`juicios/motor.md` §5, riesgo 3): **un veto que se comprueba por intento solo puede leer `routes/`** (`stageKindOf`, `finalKindOf`, `climbSize`, `lastClimbKm`, `kmAfterLastClimb`, `dPlusDe` y la geometría del esqueleto), nunca `sampleProfile`, `deriveFinishTerrain`, `finishType` ni `costBase`. La razón es de acoplamiento: si `verify` llamara a `finishType` por intento, una recalibración de `STAGE.finish*` (`constants.ts` l. 3970-4017) o de `physics.ts` redibujaría perfiles generados sin que `routes/` cambiara, que es exactamente el acoplamiento inverso que el repositorio ya sufrió al revés (el perfil manda sobre el motor, mapa 03 §9). Lo que el motor lee del final se mide igual, pero en la capa de calendario (V16), donde un rojo mueve rangos y no dados.

### 9.1 La firma de `verify` y lo que puede leer

```ts
// packages/engine/src/routes/grammar/veto.ts
export type VetoId =
  | 'V1'
  | 'V2'
  | 'V3'
  | 'V4'
  | 'V5'
  | 'V6'
  | 'V7'
  | 'V8'
  | 'V9'
  | 'V10'
  | 'V11'
  | 'V12'
  | 'V13'
  | 'V14'
  | 'V15'
  | 'V16'
export interface Veto {
  id: VetoId
  detalle: string
} // «V5: última cota 6,1 km > 4,2 (ud_montana, alpes, intento 2)»

/** Por etapa, con reintento. Orden de coste creciente: V10, V15, V6, V7, V1..V4, V5, V8, V9. */
export function verify(
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
): Veto | null

/** Cada veto por etapa es también exportable y puro, para el test literal «uno que dispara y uno que no». */
export const V1: (
  profile: StageProfile,
  sk: Skeleton,
  req: StageRequest,
  motivos: Motif[],
) => Veto | null
// … V2 a V10 y V15 con la misma firma. V11, V12, V16 reciben RouteStats[]; V13 y V14 reciben StageRole[] y km[].
export const V11: (rows: RouteStats[]) => Veto | null
export const V12: (rows: RouteStats[], maxCorrelacion: number) => Veto | null
export const V13: (
  roles: StageRole[],
  km: number[],
  raceClass: RaceClass,
  tour: TourSkeletonId,
) => Veto | null
export const V14: (roles: StageRole[], n: number) => Veto | null
export const V16: (rows: RouteStats[]) => Veto | null
```

`timeTrial` no viaja en la firma porque se deduce del esqueleto: `sk.kind === 'cri'` (los cuatro esqueletos `et_crono`, `et_prologo`, `et_cronoescalada` y `nc_crono`). `verify` corre DESPUÉS de `normalizeEnlaces`, `garantizaClase` y `emitirPancartas` (sección 8), de modo que `lastClimbKm` (`finalKind.ts` l. 46-57) lee pancartas y no segmentos: como `emitirPancartas` pone `cima` en el último `puerto` de la etapa aunque mida menos de 1,5 km (decisión 25), un muro de meta de 0,8 km es «última cota» para V5 y V7, que es lo que hoy falla en 12 de 1.500 clásicas (mapa 01 §9, borde 3). Dos funciones de `stageKind.ts` que `verify` necesita no están exportadas hoy: `climbMetres` (l. 27-33) y `climbSize` (l. 36-42). El paso 5 del plan añade `export` a las dos sin tocar su cuerpo (es la única modificación de `stageKind.ts` además de `SUMMIT_RUN_IN_KM`, decisión 23), para que el veto mida la cota exactamente como la mide el clasificador: suma de los `tramos` con `g > 0`, no `segment.km`. Ese es el borde de 8,5 km del mapa 01 §5.1 (`garantizaPuerto` fijaba `segment.km` y `climbSize` leía tramos, 3 de 1.500 cruzadas): con la guarda `segment.km === Σ tramos` de `garantizaClase` (decisión 10) y con V6 midiendo con la misma función, el borde desaparece por construcción y además se comprueba.

Las constantes que leen los vetos y que no estaban en la tabla de §B.3 del esqueleto se agrupan en `ARCH.veto` (la sección 12 las incorpora a la tabla con estas cuatro columnas):

| Constante                  | Valor                                                                  | Intención                                                                                                                                                                                                                                                         | Apoyo                     |
| -------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `ARCH.veto.segmentoMinKm`  | 0,5                                                                    | ningún segmento por debajo: es el umbral con que `rolling` descarta huecos (`profileGen.ts` l. 101, vía arquitectura §4.5) y el que `calendar.test.ts` l. 108-121 sella                                                                                           | mapa 06 §2.2              |
| `ARCH.veto.kmTolerancia`   | 0,05                                                                   | `Σ km` igual al pedido al 0,1: contrato de `calendar.test.ts` l. 162-174                                                                                                                                                                                          | ingeniero §4.5            |
| `ARCH.veto.pendientes`     | { gMax: 20, gMin: −14, subidaGMin: 1 }                                 | salidas del ruido de `climb`: `Math.max(1, …)` en `profileGen.ts` l. 78 ya lo garantiza por abajo; por arriba `gMax` 16 de `muro` deja margen                                                                                                                     | mapa 01 §2.4              |
| `ARCH.veto.puertoLargoKm`  | 15                                                                     | un `puerto` de 15 km o más solo existe con `altitud ∈ {media, alta, altiplano}`                                                                                                                                                                                   | mapa 07 §4.4 regla 5      |
| `ARCH.veto.puertoDplusMax` | { mar: 500, colina: 800, media: 1.300, alta: 2.100, altiplano: 1.500 } | techo de desnivel de UN puerto, integrado por tramos: 1.ª es [700; 1.100] m y HC > 1.100 (mapa 07 §4.2); Alpe d'Huez 13,8 × 8,1 = 1.118, Loze 28,1 × 6 = 1.686, Sierra Nevada 19,3 × 7,9 = 1.525 (mapa 07 §4.3); el máximo de la gramática es 25 × 9 × 10 = 2.250 | mapa 07 §3 consecuencia 3 |
| `ARCH.veto.llana`          | { dPlusMax: 1.800, cotaKm: 2,5, cotaG: 5, ventanaKm: 15 }              | V9: una llana de 2.500 m es media (mapa 07 §4.4 regla 10); hoy el relleno solo ya da de 661 a 1.413 m (mapa 01 §1)                                                                                                                                                | mapa 07 §4.4              |
| `ARCH.veto.calendario`     | { muroMin: 0,01, puncheurMin: 0,08 }                                   | V11 sobre etapas en línea generadas: hoy 0 de 1.075 tipan `muro` (balance v60 §12, vía arquitectura §9)                                                                                                                                                           | decisión 7                |

Con los ya decididos en §B.3: `ARCH.veto.margenClaseKm` 0,3 y `.margenValleKm` 0,7 (los usa `garantizaClase`, no `verify`; aquí solo se explica por qué V6 y V7 casi nunca saltan), `ARCH.veto.fallbackMaxShare` { calendario: 0, testPorEsqueleto: 0,005 } e `.intentosP95` 3.

### 9.2 La tabla de los dieciséis

| Veto                            | Regla (predicado)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Dónde                                                           | Solo lee                                                      | Caso que impide                                                                                                                      | Test que lo dispara                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **V1 geografía: puerto**        | ningún motivo `puerto` si `req.geo.puerto === null`; y ningún segmento `puerto` con `climbSize(s).km ≥ PASS_MIN_KM` 8,5 si `geo.puerto === null` (una `cota` de 8,0 que el dibujo estire no puede convertirse en puerto)                                                                                                                                                                                                                                                                                                   | etapa, reintento                                                | `motivos`, `climbSize`                                        | un puerto de 12 km en `flandes`, `escandinavia`, `golfo`, `australia`                                                                | `veto.test.ts`: `ud_montana` con `geo = ZONAS.flandes` forzada → `V1`; con `ZONAS.alpes` → `null`                   |
| **V2 geografía: adoquín**       | ningún `sector` con `firme: 'adoquin'` si `geo.adoquin < 2`; ningún `muro` con `adoquin: true` si `geo.adoquin === 0`                                                                                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | `motivos`, `geo`                                              | Roubaix en `andes` (mapa 07 §4.4 regla 3)                                                                                            | `ud_adoquin` con `ZONAS.andes` → `V2`; con `ZONAS.francia_norte` → `null`                                           |
| **V3 geografía: sterrato**      | ningún `sector` con `firme: 'tierra'` si `!geo.sterrato` (y `ud_sterrato` ya lo exige en `requiere`)                                                                                                                                                                                                                                                                                                                                                                                                                       | etapa, reintento                                                | `motivos`, `geo`                                              | Strade en `flandes` (regla 4)                                                                                                        | `ud_sterrato` con `ZONAS.flandes` → `V3`; con `ZONAS.italia_centro` → `null`                                        |
| **V4 geografía: altitud**       | (a) `meta === 'alto_largo'` solo si `geo.finalesAlto === 'largo'`; (b) ningún segmento `puerto` con `climbSize(s).km ≥ ARCH.veto.puertoLargoKm` 15 si `geo.altitud ∉ {media, alta, altiplano}`; (c) para todo segmento `puerto`, `climbMetres(s) ≤ ARCH.veto.puertoDplusMax[geo.altitud]` (integración `g·km·10` por tramo, como `altimetry.ts::elevationProfile`)                                                                                                                                                         | etapa, reintento                                                | `motivos`, `climbSize`, `climbMetres`                         | cima a 2.500 m en `ardenas` (regla 5); un puerto de 25 km al 9 % (2.250 m) en `cantabrico`                                           | perfil literal con un `puerto` de 20 km × 8 % y `geo.altitud: 'colina'` → `V4`; el mismo con `'alta'` → `null`      |
| **V5 el caso v40**              | en `req.role === 'un_dia'` (incluidos `nc_ruta`) y `sk.id !== 'ud_montana_alto'`: (a) la última cota (`lastClimbKm`, con pancartas) mide `climbSize ≤ ARCH.meta.unDiaUltimaCota.km[1]` 4,2; (b) si `finalKindOf(profile) === 'alto'`, mide `≤ ARCH.meta.muro.km[1]` 2,2; (c) si `sk.id === 'ud_montana'`, `kmAfterLastClimb ∈ ARCH.meta.unDiaUltimaCota.aMeta` [3; 17]                                                                                                                                                     | etapa, reintento                                                | `lastClimbKm`, `kmAfterLastClimb`, `finalKindOf`, `climbSize` | `race-jura`: final en alto de 14 km en un día (`profileGen.ts` l. 430-438; epics G6); regla 1 del mapa 07 §4.4                       | «una carrera de un día no muere en un puerto de 14 km» (§9.3)                                                       |
| **V6 reina es reina**           | `stageKindOf(profile, sk.kind === 'cri').kind === sk.kind`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | etapa, reintento                                                | `stageKindOf`                                                 | el 14 % de `mountainClassicSegments` clasificado `media` (mapa 01 §2.6); las 2 de 1.500 de `hillyUphill` clasificadas `reina` (§5.1) | `et_reina_alto_largo` con perfil literal cuyo puerto de meta mide 8,4 km y suma 2.900 m → `V6`; con 9,0 km → `null` |
| **V7 el final declarado**       | `finalKindOf(profile) === finalKindDe(meta)` con `finalKindDe`: `repecho`, `muro_meta`, `alto_corto`, `alto_largo` → `alto`; `cima_cerca` → `cima_cerca`; `descenso_meta` → `valle_corto`; `valle` → `valle_largo`; `esprint`, `sector_meta` → sin comprobación. Si `sk.finalKind` está declarado, `skeletons.test.ts` sella que coincide con `finalKindDe(sk.meta)`                                                                                                                                                       | etapa, reintento                                                | `finalKindOf`                                                 | un `cima_cerca` que sale `valle_corto` por 0,3 km (4 de 6.000, mapa 01 §2.5)                                                         | `descenso_meta` con valle literal de 20,3 km → `V7`; con 19,3 → `null`                                              |
| **V8 reina de verdad**          | (a) en `et_reina_*` salvo `et_reina_blanda`: puerto de meta con `climbSize ≥ ARCH.reina.verdad.puertoMetaMinKm` 9 y `finalKindOf === 'alto'`, o dos segmentos `puerto` con `climbSize ≥ 9`, o `dPlusDe(profile) ≥ ARCH.reina.verdad.dPlusMin` 3.400; (b) en TODO `sk.kind === 'reina'`: `subidaLejanaShare(profile) ≥ ARCH.reina.subidaLejanaMin` 0,25 (§9.4)                                                                                                                                                              | etapa, reintento                                                | `climbSize`, `finalKindOf`, `dPlusDe`, `climbKmOutsideLast30` | «reina con puerto final de menos de 8 km al 6 % y sin otro puerto HC antes» (regla 2); `reina-150` (§9.4)                            | «`reina-150` expresada como esqueleto no pasa `verify`»                                                             |
| **V9 llana es llana**           | en `sk.kind === 'llana'`: `dPlusDe(profile) ≤ ARCH.veto.llana.dPlusMax` 1.800 y ninguna racha de tramos (de cualquier tipo de segmento) de `≥ 2,5 km` a `g medio ≥ 5` que termine en los últimos 15 km                                                                                                                                                                                                                                                                                                                     | etapa, reintento                                                | `dPlusDe`, tramos                                             | una llana de 2.500 m es media (regla 10); una `tendida` de 3,5 % que el dibujo empine                                                | `et_llana` con `expuesto` literal de 2.100 m → `V9`; con 900 m → `null`                                             |
| **V10 cabe**                    | `Σ km(enlace ∪ expuesto) ≥ ARCH.colocacion.enlaceMinimoTotal × km` 0,12; todo segmento `≥ ARCH.veto.segmentoMinKm` 0,5; `                                                                                                                                                                                                                                                                                                                                                                                                  | Σ km − req.km                                                   | ≤ ARCH.veto.kmTolerancia` 0,05                                | etapa, reintento (y antes de dibujar, en `colocar` y `normalizeEnlaces`, sección 8)                                                  | segmentos                                                                                                           | segmentos a cero (`calendar.test.ts` l. 108-121); km de las ediciones (l. 162-174) | perfil con un segmento de 0,3 km → `V10`; con 0,5 → `null` |
| **V11 muro en meta existe**     | sobre las filas en línea generadas (`routeSource !== 'real'`, `kind !== 'cri'`): `finishType === 'muro'` en `≥ 1 %` y `'puncheur'` en `≥ 8 %`                                                                                                                                                                                                                                                                                                                                                                              | calendario, `routeCensus`                                       | `RouteStats.finishType`                                       | hoy 0 de 1.075 (balance v60 §12)                                                                                                     | `routeCensus.test.ts` sobre la temporada 0; `it.todo` en el paso 0 con la cifra de hoy                              |
| **V12 no se repite**            | para todo par de filas con el mismo `skeleton`, la misma `zona` y `km` dentro de ± 10 %: `profileCorrelation(a, b) < ARCH.anticlon.maxCorrelacion` (provisional 0,85; calibrado en el paso 9, §9.5)                                                                                                                                                                                                                                                                                                                        | calendario, `routeCensus`                                       | `RouteStats.huella`                                           | dos «clásicas» que son la misma desplazada (agenda §4.18, hallazgo 2)                                                                | `routeCensus.test.ts`: máximo por par < tope; mediana < 0,8 (sección 13)                                            |
| **V13 clase**                   | `km ≤ ARCH.km.maxPorClase[raceClass]`; en `vu_corta` ≤ 1 crono; en `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos                                                                                                                                                                                                                                                                                                                                                                                                          | vuelta, `tour.test.ts`; reparado en `composeTour`               | `StageRole[]`, `km[]`                                         | reglas 7 y 8 del mapa 07 §4.4                                                                                                        | `tour.test.ts`: 120 semillas × n × 5 relieves, 0 violaciones tras reparar                                           |
| **V14 gran vuelta**             | `ARCH.bloques.gv`: descansos tras las etapas 9 y 15, reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 de alta montaña, ≥ 2 llanas entre bloques                                                                                                                                                                                                                                                                                                                                                              | vuelta, `tour.test.ts`; reparado en `composeTour`               | `StageRole[]`                                                 | regla 6 del mapa 07 §4.4                                                                                                             | `tour.test.ts`: `vu_gran_vuelta` con n de 9 a 21                                                                    |
| **V15 pendientes**              | ningún tramo con `g > 20` ni `g < −14`; ningún segmento `puerto` con un tramo `g < 1`                                                                                                                                                                                                                                                                                                                                                                                                                                      | etapa, reintento                                                | tramos                                                        | salidas del ruido de `climb` (`profileGen.ts` l. 78)                                                                                 | tramo literal al 21 % → `V15`; al 16 % → `null`                                                                     |
| **V16 el final según el motor** | `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` pertenece al conjunto que promete el `MetaKind` instanciado (tabla de la sección 4): `esprint` → {`sprint_masivo`, `sprint_reducido`}; `repecho` → {`puncheur`}; `muro_meta` → {`muro`} si `cotaFinal.km ≤ 1,0` y {`puncheur`, `alto`} si > 1,0; `alto_corto`, `alto_largo` → {`alto`}; `cima_cerca` → {`descenso`, `puncheur`}; `descenso_meta` → {`descenso`, `sprint_reducido`}; `valle` → {`sprint_masivo`, `sprint_reducido`}; `sector_meta` → {`pave`} | calendario, `routeCensus` y `motifs.test.ts`; nunca por intento | `RouteStats.finishType`                                       | un `muro_meta` que sale `puncheur` por relleno al 3 % pegado a la racha (juicio motor §1)                                            | `motifs.test.ts` 300 de 300 por `MetaKind` (paso 3); `routeCensus.test.ts` 100 % sobre la temporada 0               |

Cuatro notas de lectura. Primera: V1 a V4 son en teoría redundantes con `requiere` y con la intersección de rangos del paso de instanciación (sección 8), y por eso su tasa de disparo en el calendario es cero por construcción; siguen existiendo porque son la única defensa contra un `params.kmRango` mal escrito en un hueco o contra una fila nueva de `ZONAS` con `puerto.km` fuera de `ARCH.motivo.puerto.km`, y `geo.test.ts` (sección 6) las comprueba en frío sobre las 29 zonas. Segunda: V6 es el sello que hoy da `stageKind.test.ts` por generador (mapa 06 §2.1) llevado dentro del generador, con `mountainClassicSegments` por fin vigilada (hoy no se importa en ese test, l. 1-11, y 210 de 1.500 salen `media`): a partir del paso 8 el test por esqueleto × zona lo mide como estadística y `verify` lo garantiza etapa a etapa. Tercera: V9 no se solapa con V6 aunque lo parezca: `stageKindOf` llama `llana` a cualquier perfil sin segmento `puerto` (`stageKind.ts` l. 77-78), así que una `tendida` de 8 km al 4,5 % tipada `llano` sigue siendo `llana` para el clasificador y para `kmSubida` (mapa 03 §4.1) y sin embargo el motor la sube por `g` (`gradientAt`, `sample.ts` l. 46-54); V9 impide que ese llano acumule 2.000 m o coloque una rampa que `deriveFinishTerrain` (`finish.ts` l. 71-135, racha con `g ≥ 3`) leería como cota de meta. Cuarta: los vetos no reparan, y por eso `garantizaClase` (sección 8, decisión 10, I-24) corre antes que `verify` y hace tres cosas que hoy nadie hace: mueve el motivo que decide la clase al lado correcto del borde (puerto más largo a ≥ 9,0 en reina y a ≤ 8,0 en media, con `margenClaseKm` 0,3 sobre 8,5), recorta o alarga el valle de la meta a su cubeta con `margenValleKm` 0,7 sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (`finalKind.ts` l. 30), y guarda «toda cota ≤ 2,9 km en clásica» para que un `ud_muros` cuyo dibujo estire un muro de 2,5 a 3,1 km no cruce `WALL_MAX_KM` 3 (hoy `normalize` lo hace y `classicSegments` no lo vigila, banco §4.5). Con esas tres guardas V6 y V7 son redes que casi nunca se usan; sin ellas serían la causa principal de reintento, y el p95 de `intentos` de §9.8 lo mediría.

### 9.3 V5, el caso v40, recorrido paso a paso

El caso que el dueño citó (epics G6: «para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está pésimo») es `race-jura`: un día, Francia, `terrain: 'mountain'`, y antes de la v40 salía de `mountainSegments` con un final en alto de 9 a 15 km (`profileGen.ts` l. 359-360, mapa 01 §2.5), «algo que no existe en el calendario real», con el 82 % del pelotón a cero (`balance.md` l. 8102-8125, vía `juicios/cobertura.md` §1). La v40 lo arregló con una función más (`mountainClassicSegments`) y una nota de tres párrafos en `calendar.ts` l. 143-152. Con la gramática la regla existe una vez, en V5, y vigila igual cualquier esqueleto de un día que alguien añada después (ingeniero §9.1). El recorrido con el diseño:

1. **Zona.** `regionOf('race-jura', 1, 'FR')` devuelve `RACE_REGION['race-jura'].default`, que la sección 6 cura como `macizo_central`; no hay sorteo de zona (decisión 14).
2. **Esqueleto** (`arch|race-jura`, sección 8). Candidatos con `role: 'un_dia'` y `requiere` satisfecho por `ZONAS.macizo_central` (`puerto !== null`); `terrain: 'mountain'` multiplica `ud_montana` ×4 (sección 5). `ud_montana_alto` pesa `ARCH.pesoPorClase` 0,02 solo en `.1` y solo si `finalesAlto === 'largo'`; en cualquier otra clase pesa 0 y no puede ni sortearse. Sale `ud_montana`: `kind: 'reina'`, `enlace`@[0; 0,4], `puerto`×[2; 3]@[0,4; 0,85], `cota`×[1; 2]@[0,8; 0,97], meta `descenso_meta` o `cima_cerca` con `cotaFinal` de `ARCH.meta.unDiaUltimaCota` (km [1,3; 4,2], g [7; 11], a meta [3; 17]).
3. **Km.** `kmDe('un_dia', raceClass, …)` con `ARCH.km.porClase` (decisión 36): el 210 fijo de hoy (`calendar.ts` l. 917, 66 de 66 carreras .1 en p10 = p50 = p90 = 210, datos §1.3) desaparece desde la temporada 0.
4. **Instanciación** (`mot|…`). Cada `puerto` toma `km` uniforme en la intersección de `ARCH.motivo.puerto.km` [9; 25] con `ZONAS.macizo_central.puerto.km` (el rango exacto lo escribe la sección 6; en `alpes`, que es el caso del test, es [12; 25]); la `cotaFinal` de la meta se sortea en [1,3; 4,2] km al [7; 11] %, y su valle en la intersección del `MetaKind` con `aMeta`: `cima_cerca` en [3; 4,3] y `descenso_meta` en [5,7; 17].
5. **Colocación, rendido, cuadre, garantías, pancartas** (sección 8). `garantizaClase` mueve, si hace falta, el puerto más largo al borde 9,0 con `margenClaseKm` 0,3 y recorta el valle a su cubeta con `margenValleKm` 0,7; `emitirPancartas` marca `cima` en cada puerto y en la última cota.
6. **`verify`**, en su orden. V10 y V15 pasan por construcción del rendido. V6: `stageKindOf` dice `reina/Mountains` porque el puerto más largo mide ≥ 9,0 > `PASS_MIN_KM` 8,5 (`stageKind.ts` l. 90-93) y no muere arriba. V7: `finalKindOf` es `cima_cerca` o `valle_corto`, según la meta instanciada (`finalKindDe`). V1 a V4: `macizo_central` tiene `puerto`, sin adoquín ni sterrato en juego, cimas dentro de `puertoDplusMax.media`. **V5**: (a) la última cota es la `cotaFinal` de la meta, ≤ 4,2 km; (b) `finalKindOf ≠ 'alto'`, así que la cláusula del muro no aplica; (c) `kmAfterLastClimb` ∈ [3; 17]. V8: (a) no aplica (`ud_*`); (b) los dos o tres puertos empiezan antes del 85 % de la etapa y sus tramos que acaban a más de 30 km de meta suman, con 24 a 75 km de puerto contra 1,3 a 4,2 de última cota, mucho más del 25 %. V9 no aplica.

Lo que el generador viejo hacía (9 a 15 km muriendo en meta) dispara V5 dos veces: (a) por longitud y (b) por final en alto. Y lo que `mountainClassicSegments` hace hoy (último puerto de 4 a 8 km con `runIn` de 13 a 22, mapa 01 §2.6) dispara (a) en la mitad superior de su rango y deja fuera, por abajo, la Roche-aux-Faucons de 1,3 km a 13,5 y el Murgil de 2,1 a 7 (mapa 07 §1.6). V5 es el mapa 07 §4.3 escrito en positivo: última subida de 0,4 a 4,2 km, cima a [0; 17] km, y meta arriba solo si es un muro de 1,3 a 2,1 (Huy, San Luca); el 2,2 es el techo de `ARCH.meta.muro.km` (decisión 7). Consecuencia sobre `repecho` en un día: la cláusula (b) obliga a que la meta `repecho` de un esqueleto `ud_*` se instancie en [1; 2,2] km (intersección de `ARCH.meta.repecho.km` [1; 2,9] con V5b); en etapa sigue en [1; 2,9]. La sección 4 lo recoge en la tabla del `MetaKind`.

El test con nombre, en `grammar/veto.test.ts` (paso 5 del plan):

```ts
it('una carrera de un día no muere en un puerto de 14 km (caso v40, ud_montana en alpes)', () => {
  const req = (i: number): StageRequest => ({
    raceId: `test-jura-${i}`,
    stageIndex: 1,
    season: 0,
    km: 235,
    role: 'un_dia',
    terrain: 'mountain',
    geo: ZONAS.alpes,
    raceClass: 'WT',
    format: 'un-dia',
    routeSource: 'generado',
    fixed: { skeleton: 'ud_montana' },
  })
  let ultimaMayor = 0,
    muereArriba = 0,
    fueraDeVentana = 0,
    degradadas = 0
  for (let i = 0; i < 2000; i++) {
    const g = generateStage(req(i))
    const ultima = climbSize(g.profile.segments.filter((s) => s.tipo === 'puerto').at(-1)!)
    if (ultima.km > ARCH.meta.unDiaUltimaCota.km[1]) ultimaMayor++
    if (finalKindOf(g.profile) === 'alto') muereArriba++
    const tras = kmAfterLastClimb(g.profile)!
    if (tras < 3 || tras > 17) fueraDeVentana++
    if (g.arch.degradado) degradadas++
    expect(g.kind).toBe('reina') // V6 en las 2.000
  }
  expect(ultimaMayor).toBe(0)
  expect(muereArriba).toBe(0)
  expect(fueraDeVentana).toBe(0)
  expect(degradadas).toBe(0) // ARCH.veto.fallbackMaxShare.calendario
})

it('V5 dispara sobre el perfil literal del generador viejo y calla sobre Lombardía', () => {
  const jura: StageProfile = {
    segments: [
      { km: 196, tipo: 'llano' },
      { km: 14, tipo: 'puerto', tramos: [{ km: 14, g: 8 }] },
    ],
    banners: [{ km: 210, tipo: 'cima' }],
  }
  expect(V5(jura, SKELETONS.ud_montana, reqUnDia, [])?.id).toBe('V5')
  const lombardia = renderCanonico('ud_montana', ZONAS.italia_norte) // San Fermo 2,7 km a 5,5 km
  expect(V5(lombardia, SKELETONS.ud_montana, reqUnDia, SKELETONS.ud_montana.canonico)).toBeNull()
})
```

### 9.4 V8, la lección de `reina-150` como regla

`reina-150` (`sim/scenarios.ts` l. 329-336) son 135 km de `llano` y un `puerto` de 15 km al 8 % con la pancarta en la meta. Sobre ese perfil `TARGETS.mountain.breakawayWinPct` [25; 45] estuvo cinco versiones en verde con un 27 a 30 %, mientras sobre las nueve reinas reales de `realQueens` la fuga ganaba el 3,3 % y en gran vuelta el 0 % (epics E3, pasos 2 a 4, mapa 04 §3.1). La lectura que cerró el caso (balance v43 §7, l. 8618-8631) mide una sola columna: **subida fuera de los últimos 30 km**. La canónica tiene 0 %; las nueve reales, del 6 al 38 % (Colombia e5 13, Tachira e6 18, Spain e7 8, Guatemala e9 13, Catalonia e4 6, Two Seas e4 16, Rhône-Alpes e8 28, Italy e19 33, France e20 38). La conclusión escrita en E3 es que `reina-150` «no es una etapa reina fácil: es media montaña con la etiqueta cambiada», y el patrón se repitió seis veces (mapa 04 §3.3). El diseño la convierte en veto (I-5, I-18, I-32) y no solo en banda: si el generador pudiera producir esa forma con `kind: 'reina'`, el calendario volvería a contener etapas sobre las que el motor se calibra contra algo que no existe.

Por qué 30 km y no otro número: `STAGE.climbRaceKmToGo` es 30 (`constants.ts` l. 3521) y `simulate.ts` l. 2497 lo lee como `raceThisClimb = totalKm − km <= 30`: solo el puerto a 30 km o menos de meta se sube «de verdad» (`climbPaceFraction` 0,12); los de antes se suben a tempo (`climbTempoFraction` 0,5, mapa 03 §4.2). La subida fuera de esa ventana es donde el pelotón no caza a la fuga sino que la sube (mapa 04 §3.1, paso 5), y donde la deriva acumulada deja gente atrás sin que la carrera se rompa por la cota (mapa 03 §10, hecho 3). Es la variable correcta porque es la que el motor usa para cambiar de régimen, y por eso `ARCH.reina.subidaLejanaKm` se define igual a `STAGE.climbRaceKmToGo` y `grammar/veto.test.ts` sella la igualdad («`ARCH.reina.subidaLejanaKm === STAGE.climbRaceKmToGo`»): si el motor mueve la ventana, el veto se mueve con él.

La medida, en `geometry.ts`:

```ts
// packages/engine/src/routes/grammar/geometry.ts
/** Km de subida (tramos g > 0 de segmentos `puerto`) cuyo final está a más de `kmToGo` km de meta.
 *  Un tramo que cruza la línea de los 30 km cuenta solo por la parte que queda más allá. */
export function climbKmOutsideLast30(
  profile: StageProfile,
  kmToGo = ARCH.reina.subidaLejanaKm,
): number
/** climbKmOutsideLast30 / Σ climbSize(puerto).km; 0 si la etapa no tiene puertos. */
export function subidaLejanaShare(profile: StageProfile): number
```

V8b exige `subidaLejanaShare ≥ ARCH.reina.subidaLejanaMin` 0,25 en todo esqueleto con `kind: 'reina'`: `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_reina_encadenada`, `et_montana_corta`, `et_reina_blanda` (la cola baja de la decisión 8, con su `cota`×[1; 2]@[0,15; 0,6] de 5 a 8 km contra un `alto_largo` de 9 a 12: la peor combinación, una cota de 5 y una meta de 12, da 0,29), `ud_montana` y `ud_montana_alto` (que por eso lleva su `puerto` con `n: [1; 1]` y no `[0; 1]`: con `puerto`×0 sería literalmente `reina-150` con 100 km de enlace, y la sección 5 lo fija así). El denominador es el km de subida de la etapa y no el km total: separa «toda la subida está al final» de «la subida está repartida» con independencia de si la etapa mide 120 o 220 km, que es lo que distingue una reina de una media con la etiqueta cambiada. La columna de v43 §7 usa otro denominador (el km de etapa) y `routeCensus` imprime las dos, `climbKmOutsideLast30` en km y como fracción del km total, para que la tabla de v43 siga siendo comparable; la banda de calendario de la sección 13 («ninguna reina en 0 %, p10 ≥ 5 %») se lee sobre la fracción del km total, como v43. V8a es la definición de reina que `stageKindOf` no puede dar (la red de 3.200 m «existe para los recorridos REALES», `stageKind.ts` l. 56-58): puerto de meta ≥ 9 km, o dos puertos ≥ 9, o 3.400 m con relleno (`dPlusDe`, decisión 9). `et_reina_blanda` queda fuera de (a) a propósito y dentro de (b) a propósito: es una reina de una semana con un solo puerto, y no puede ser una reina con todo el puerto en la meta.

El test con nombre:

```ts
it('reina-150 expresada como esqueleto no pasa verify (la lección de E3 como regla)', () => {
  const reina150: StageProfile = {
    segments: [
      { km: 135, tipo: 'llano' },
      { km: 15, tipo: 'puerto', tramos: [{ km: 15, g: 8 }] },
    ],
    banners: [{ km: 150, tipo: 'cima' }],
  } // sim/scenarios.ts l. 332-336
  const sk = SKELETONS.et_reina_alto_largo
  expect(stageKindOf(reina150, false).kind).toBe('reina') // el clasificador la deja pasar: 15 ≥ 8,5
  expect(V8(reina150, sk, reqReina(150), [])).toEqual({
    id: 'V8',
    detalle: expect.stringContaining('lejana 0 %'),
  })
  expect(subidaLejanaShare(reina150)).toBe(0)
  // La plantilla 3 del mapa 07 §5 (reina-175-4800, sección 13) sí pasa: 12 + 17 + 10 km de puerto a 45, 95 y 130 → 39 de 54,8 = 0,71
  expect(
    V8(renderCanonico('et_reina_alto_largo', ZONAS.pirineos), sk, reqReina(175), sk.canonico),
  ).toBeNull()
})
```

### 9.5 V12, el anti-clon calibrado sobre pares reales

El hallazgo 2 de agenda §4.18 es que «dos clásicas distintas se parecen aunque sus rampas no coincidan en un solo número», y el mapa 04 §5.2 propone medirlo con la correlación de los vectores de `g` por km entre pares de etapas del mismo tipo y longitud ± 10 %, con criterio «mediana < 0,8». Ese 0,8, y el 0,9 de arquitectura §9, son números sin dueño; el diseño toma el método de datos §10.2 (I-12, I-39): **el tope es tan parecido como dos carreras reales distintas de la misma familia, no más**. `profileCorrelation(a, b)` (`geometry.ts`) construye para cada perfil el vector de `g` medio por kilómetro a partir de los tramos (integración por km, sin `sampleProfile`: es geometría de `routes/`), normaliza el eje a [0; 1] desde la meta (así dos etapas de 235 y 255 km comparan el final con el final) y devuelve la correlación de Pearson. `RouteStats.huella` es ese vector, así que V12 corre sobre el censo sin volver a leer perfiles.

Calibración (paso 9 del plan, con `scripts/medir-real.mjs` como instrumento, decisión 40): sobre las 177 etapas reales se forman todos los pares con el mismo `stageKindOf().kind`, el mismo `finalKindOf()` y km dentro de ± 10 %; el p90 de su correlación es `ARCH.anticlon.maxCorrelacion`. Los tres pares nombrados por datos (Ronde y E3, Amstel y Brabant, Lombardía y Lieja) se imprimen aparte como comprobación de sentido si existen en `STAGE_FEATURES`, y si alguno no existe se imprime el aviso y no se sustituye por otro. Hasta esa medida el valor provisional es 0,85, entre el 0,8 de la mediana del mapa 04 y el 0,9 de arquitectura, y se escribe en `constants.ts` con el comentario «provisional hasta v61 §9». V12 exige que ningún par (mismo `skeleton`, misma `zona`, km ± 10 %) lo supere; la banda de variedad de la sección 13 añade la mediana < 0,8 y la correlación entre ediciones consecutivas de una misma carrera en [0,55; 0,9] (sección 10), que no son vetos sino bandas.

### 9.6 V16, medido en el censo y no por intento

V16 es el V7 de arquitectura §9 partido en dos (regla de numeración de §B.4): la mitad que lee `finalKindOf` es V7 y reintenta; la mitad que lee `finishType` es V16 y no reintenta. `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` decide, con `alto` antes que `muro` (`finish.ts` l. 165-189), el tipo de final que gobierna el remate; el `groupSize` 50 solo separa `sprint_masivo` de `sprint_reducido` (`finish.ts` l. 142, vía arquitectura §4.7) y se fija en `routeCensus` y solo ahí. Si V16 sale en rojo para un `MetaKind` (por ejemplo `muro_meta` ≤ 1,0 km que no da `muro` en el 100 %), lo que se corrige es un rango de `ARCH.meta.*` (`aproxKm`, `aproxAmp`, `gRango`), y se corrige una vez para todo el calendario; no se reintenta una etapa. Es la consecuencia práctica de la decisión 4: `verify` pasa hoy y pasará igual tras cualquier recalibración de `STAGE.finish*`, y si esa recalibración cambia lo que el motor lee de un final, lo dirá V16 en el siguiente `test:rapido` (0,57 s medidos, juicio motor §1) y no un calendario que cambia de dibujo en silencio.

### 9.7 Plausibilidad blanda: se imprime, no veta

Lo que no puede ser regla porque no tiene sigma conocida se mide en `routeCensus` y se imprime sin banda (regla 4 del mapa 04 §5.3: ninguna banda nueva nace en rojo; se le pone banda cuando la cifra tenga dueño). Todas se calculan con `routes/` y la geometría del esqueleto:

| Métrica                                           | Cómo se calcula                                                                                                     | Referencia real                                                                               | Estado                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Puertos por reina                                 | `nPuertos` = segmentos `puerto` con `climbSize ≥ CLIMB_MIN_KM` 1,5                                                  | 3 a 5 en gran vuelta, 2 a 4 en una semana (mapa 07 §4.2); real p10/p50/p90 2/4/6 (datos §1.4) | se imprime por esqueleto                                             |
| Posición del primer puerto                        | km del primer `puerto` como fracción de la etapa                                                                    | 20 a 60 % (mapa 04 §5.2)                                                                      | se imprime                                                           |
| Km de puerto a más de 60 km de meta               | como `climbKmOutsideLast30` con `kmToGo` 60                                                                         | real 0/13,2/43,0 (datos §1.4)                                                                 | se imprime                                                           |
| Entropía de `finalKind` por vuelta con ≥ 2 reinas | Shannon sobre las cubetas de `finalKindOf` de la carrera                                                            | ninguna gran vuelta con todas sus reinas `alto` (mapa 04 §5.2)                                | se imprime por carrera                                               |
| Correlación intra-esqueleto                       | mediana y p90 de `profileCorrelation` por `skeleton` × `zona`                                                       | mediana < 0,8 (mapa 04 §5.2); tope de V12                                                     | mediana con banda en la sección 13; el resto se imprime              |
| Distancia al p10/p90 real                         | por rasgo de `RouteStats` (última cota, km a meta, sectores) contra `scripts/medir-real.mjs` donde haya ≥ 3 fuentes | datos §1.4                                                                                    | se imprime; pasa a banda en la sección 13 solo donde hay ≥ 3 fuentes |
| Qué veto dispara más                              | histograma de `Veto.id` por `skeleton` × `zona`, con `intentos` p50/p95                                             | `ARCH.veto.intentosP95` 3                                                                     | se imprime; p95 sí tiene banda (§9.8)                                |

Lo que no se mide porque el motor no lo ve (decisión 17): altitud como frío, viento por tramo, anchura, exposición. Viajan en `arch.metadatos` y en la ficha, no en un veto ni en una métrica.

### 9.8 Fallback y su contador

Agotados `ARCH.colocacion.maxIntentos` 8, `generateStage` instancia `sk.canonico` con `degradado: true` e `intentos: 8` (sección 8). Que la canónica pasa `verify` en toda zona compatible y en los cinco km de prueba lo sella `skeletons.test.ts` («la plantilla canónica de cada uno de los 32 esqueletos pasa `verify` en cada zona donde `requiere` se cumple», con `fixed.skeleton` y el `Motif[]` literal de la sección 5), y por eso en producción no se vuelve a verificar. El contador vive en `RouteStats.intentos` y `.degradado`, y `ARCH.veto.fallbackMaxShare` fija dos exigencias distintas a propósito: `calendario: 0` (ningún degradado en las 1.418 etapas de las temporadas 0 a 3, en `calendario.test.ts`: un degradado en el calendario es un defecto de parametrización, no un resultado aceptable, banco §4.6) y `testPorEsqueleto: 0,005` (en `skeletons.test.ts`, 300 semillas × zona compatible × 5 km por esqueleto, donde una combinación de borde puede tocar el tope sin que el catálogo esté mal). `ARCH.veto.intentosP95` 3 es la tercera exigencia: si el p95 de `intentos` de un (esqueleto, zona) supera 3, lo que se hace es estrechar los rangos del hueco que dispara (el histograma de §9.7 dice cuál), nunca subir `maxIntentos` (sección 17, riesgo 9), porque más intentos esconden el mismo defecto a más coste de arranque (sección 14).

Los tests de la capa por etapa, todos en `grammar/veto.test.ts` y todos con perfiles literales sin RNG salvo los dos con nombre de §9.3 y §9.4:

```ts
describe.each([
  ['V1', perfilPuertoEnFlandes, perfilPuertoEnAlpes],
  ['V2', perfilAdoquinEnAndes, perfilAdoquinEnFranciaNorte],
  ['V3', perfilTierraEnFlandes, perfilTierraEnItaliaCentro],
  ['V4', perfilPuerto20kmEnColina, perfilPuerto20kmEnAlta],
  ['V5', perfilJura14km, perfilLombardiaSanFermo],
  ['V6', perfilReinaCon84, perfilReinaCon90],
  ['V7', perfilValle203, perfilValle193],
  ['V8', reina150, reina175_4800],
  ['V9', perfilLlana2100m, perfilLlana900m],
  ['V10', perfilSegmento03, perfilSegmento05],
  ['V15', perfilTramo21, perfilTramo16],
] as const)('%s: un perfil que dispara y otro que no', (id, dispara, calla) => {
  it('dispara', () =>
    expect(verify(dispara.profile, dispara.sk, dispara.req, dispara.motivos)?.id).toBe(id))
  it('calla', () => expect(verify(calla.profile, calla.sk, calla.req, calla.motivos)).toBeNull())
})

it('verify solo importa de routes/: ningún símbolo de stage/ ni de sim/', async () => {
  const src = await readFile(new URL('./veto.ts', import.meta.url), 'utf8')
  expect(src).not.toMatch(/from '\.\.\/\.\.\/stage\//)
  expect(src).not.toMatch(/sampleProfile|deriveFinishTerrain|finishType|costBase/)
})
```

El último test es la decisión 4 escrita como aserción: la forma más barata de garantizar que ningún cambio futuro cuele `finishType` en un veto por intento es leer el fichero. Y las dos capas restantes tienen su test en su sitio: V11, V12 y V16 en `sim/routeCensus.test.ts` sobre la temporada 0 (con `it.todo` y la cifra de hoy en el paso 0 del plan para V11 y V16, que hoy están en rojo por definición: 0 de 1.075 muros), y V13 y V14 en `grammar/tour.test.ts` sobre 120 semillas × n × 5 relieves, donde lo que se sella no es que el sorteo acierte sino que la reparación determinista de `composeTour` deje 0 violaciones (sección 7).

---

## 10. La identidad entre ediciones

Una carrera del juego tiene que ser la misma carrera un año y el siguiente, y no la misma etapa. Hoy es lo segundo: `SEASON_CALENDAR` es una constante de módulo (`routes/calendar.ts` l. 3643, reexportada en `index.ts` l. 77) construida al cargar el paquete, sin año en ninguna semilla; `RACE_EDITIONS` (`editions.ts` l. 25) tampoco lleva temporada y sus 384 etapas se dibujan con la semilla `${from}|${to}|${km}` (`calendar.ts` l. 224), estable para siempre (mapa 02 §7 y §11). La base, en cambio, ya sabe de temporadas: `calendarRun.ts` l. 135 calcula `season = Math.floor(gameDay / SEASON_DAYS)` (con `SEASON_DAYS` 364, l. 62), l. 783 forma `raceKey = \`${race.id}:s${season}\``y`race_routes`congela el recorrido por`raceKey` (`schema.ts`l. 512-526), y`recorridoDelMundo.test.ts`l. 76-81 ya prueba que «una carrera de otra temporada es OTRO recorrido». Así que la identidad entre ediciones pide una cosa nueva en el motor (un calendario por temporada, con una lista cerrada de lo que la temporada puede mover) y muy poco en la base (que congele la temporada que toca y que quien lea`kind`o`profile` lea lo congelado). Esta sección escribe las dos.

### 10.1 Qué es fijo y qué es de la edición

La regla es la decisión 20 del diseño: **los papeles (`kind`), `timeTrial` y el número de etapas son identidad, nunca edición**. La razón no es estética: `calendarRun.ts` l. 516 y `packages/db/src/callups.ts` l. 98 calculan `raceVocationFit(race.stages.map(s => s.kind))` para convocar, `calendarRun.ts` l. 1614 escribe `kind: stage.kind` en el `StageInput`, `sim/world.ts` l. 171-181 mete `kind` de cada etapa en la bolsa de días de carrera de cada división al cargar el módulo, y `raceContext.ts::terrenoRestante` (l. 56-59, llamada l. 127) integra los km de subida que quedan leyendo `stage.profile`. Si la temporada N cambiara el papel de una etapa, todos esos lectores verían la temporada 0 (juez del motor, riesgo 1). Con los papeles fijos, la edición solo mueve lo que el organizador de una carrera real mueve de un año a otro.

| Capa               | Qué contiene                                                                                                                                                                                                                                                                                                    | Subflujo (§10.4)                      | Cambia con `season` |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| Identidad          | esqueleto (`SkeletonId`) o esqueleto de composición (`TourSkeletonId`); zona (`regionOf`); en vueltas, el itinerario entero (`Itinerario.metas`, `papeles`, `desde`), la posición de la crono, el papel de la primera y la última etapa, el número de etapas; en un día, el papel `un_dia`                      | `arch\|raceId`                        | nunca               |
| Firma              | los motivos con `firma: true` ya instanciados (km, g, forma, `adoquin`, `estrellas`, `vueltas`, `kmVuelta`, `meta`, `cotaFinal`): la meta siempre, el circuito si lo hay, el racimo de 5★ en `ud_adoquin`, el último `puerto` en `et_reina_*` de una semana; y el `km` base de la carrera (`kmDe`, decisión 36) | `firma\|raceId`                       | nunca               |
| Edición            | cuántos motivos no firma hay en cada hueco y cuáles opcionales aparecen; `km ± ARCH.edicion.kmJitter` (nunca en etapas de edición real); `vueltas ± 1` del circuito; la alternativa declarada (nivel 2)                                                                                                         | `ed\|raceId\|season`                  | sí                  |
| Instancia y dibujo | parámetros de los motivos no firma, su colocación por ventanas, rampas y ondulación de todo (firma incluida: el muro de Huy mide siempre 1,3 km al 9,6 %, pero su rampa más dura no cae siempre en el mismo hectómetro)                                                                                         | `mot`, `pos`, `dib` (llevan `season`) | sí                  |

Tres consecuencias que las propuestas dejaban abiertas y aquí se cierran. Primera: `finalKind` es fijo. `Skeleton.finalKind` es del esqueleto y V7 exige `finalKindOf(profile) === sk.finalKind` en cada intento (sección 9), así que una `et_reina_valle` es `valle_largo` todos los años; la excepción de arquitectura §6.4 (que `ud_montana` y `et_reina_valle` pudieran moverse de cubeta) desaparece porque V7 la hace imposible. Segunda: en una vuelta, las etapas de en medio NO se recomponen cada temporada (contra arquitectura §6.1 y geografía §6.2): `itinerarioDe` corre en `arch|raceId` sin `season` (sección 7), y lo que cambia por temporada en una vuelta es lo mismo que en un día, etapa a etapa. Tercera: `kind` y `label` de toda etapa generada salen de `stageKindOf(profile)` (decisión 23) y V6 garantiza que coinciden con `Skeleton.kind`; como el esqueleto es identidad, `kind` no puede cambiar entre ediciones aunque el perfil cambie. Eso es lo que sella el test de §10.8.

### 10.2 `BASE_SEASON = 0` y la temporada que tira dados

```ts
// packages/engine/src/routes/grammar/edition.ts
/** La temporada con que nace un mundo: `calendarRun.ts` l. 135, `season = floor(gameDay / SEASON_DAYS)`, da 0 el primer año. */
export const BASE_SEASON = 0
```

`BASE_SEASON` es 0 y no 1 porque es dato del código, no decisión: el primer año de un mundo `gameDay ∈ [0; 363]` y `season` vale 0; `raceKey` es `race-x:s0`, que es la clave con la que `recorridoDelMundo.test.ts` l. 55-63 congela y lee. Banco §6.2 proponía `calendarFor(1)` y geografía §14.9 lo preguntaba al dueño; ninguna de las dos hace falta (decisión 21).

La temporada 0 tira sus propios dados en `ed|raceId|0`, exactamente igual que cualquier otra (decisión 21). Arquitectura §4.3 proponía que con `season === 0` los huecos no firma tomaran «la mediana de su cardinalidad» y el km fuera el de la fila; se descarta por dos razones. La primera es de banco: si la temporada 0 fuera un caso especial sin dados, las 1.418 etapas que ven los tests de `routes/`, `routeCensus` y los bancos serían una población distinta de la que ven los mundos a partir del segundo año, y el 210 fijo de 142 carreras de un día seguiría vivo en la temporada 0 (decisión 36 lo retira desde la 0 con `firma|raceId`). La segunda es de determinismo: «tirar dados» con una semilla fija es tan determinista y estable como no tirarlos; `SEASON_CALENDAR` sigue siendo una constante byte a byte entre procesos, que es lo único que los ~30 lectores de `packages/db/src` necesitan (grep de hoy: 12 en `calendarRun.ts`, 4 en `callups.ts`, 6 en `riderSchedule.ts`, 4 en `teamPlan.ts`, 3 en `raceEntry.ts`, `raceReport.ts` y `raceRoutes.ts`, 2 en `raceContext.ts` y `riderResults.ts`; todos menos los cuatro de §10.7 leen `id`, `startDay`, `format`, `raceClass`, `country`, `openTo`, `championshipCountry`, `stages.length` o `stages[i].name`, que son identidad).

### 10.3 `ARCH.edicion`: el interruptor y los tres niveles

```ts
// packages/engine/src/constants.ts, bloque ARCH (sección 12 escribe la tabla entera)
edicion: {
  activa: true,          // false: calendarForSeason(s) devuelve calendarForSeason(BASE_SEASON) para todo s (el calendario fijo de hoy)
  nivel: 1 as 0 | 1 | 2, // 0 arquitectura fija (solo cambia el dibujo); 1 jitter acotado; 2 rotación declarada
  kmJitter: 0.06,        // km × U(0,94; 1,06); Sanremo de 289 a 294 km y Ronde de 268 a 273 son ± 1 o 2 %, se deja más ancho a lo inventado
  vueltasJitter: 0.5,    // p de que un circuito cambie ± 1 vuelta (Montréal, 17 o 18)
  motivoNuevo: 0.35,     // p de que un hueco opcional (n[0] === 0) esté AUSENTE en una edición
}
```

Los dos valores son del dueño (D7) y se implementan con el valor por defecto: `activa: true`, `nivel: 1`, con rotación donde el esqueleto la declare (sección 18). El nivel efectivo de una etapa es `nivelEfectivo = ARCH.edicion.nivel === 0 ? 0 : (sk.alternativas ? 2 : ARCH.edicion.nivel)`: la constante fija el suelo y el techo para los esqueletos sin alternativas, y un esqueleto con `alternativas` declaradas rota siempre que la constante no sea 0. Poner la constante a 2 no cambia nada para un esqueleto sin `alternativas` (no hay nada que rotar) y se documenta así en el comentario.

| Nivel | Lo que `ed\|raceId\|season` decide                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Lo que NO toca                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 0     | nada: `n` de cada hueco, `km` y `vueltas` se leen de `ed\|raceId\|0`; solo `dib` lleva `season`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | arquitectura, firma, km                                 |
| 1     | por etapa y en orden de etapa: (a) `km = round(kmBase × U(1 − 0,06; 1 + 0,06))`, acotado a `ARCH.km.maxPorClase` (V13) y saltado si `routeSource === 'edicion'`; (b) para cada hueco no firma, `n` uniforme en `[n0, n1]`, salvo hueco opcional (`n0 === 0`), que está ausente con p `motivoNuevo` y si no `n` uniforme en `[1, n1]`; (c) si hay `circuito` de firma, con p `vueltasJitter` `vueltas ± 1` (signo con otra tirada), acotado a `ARCH.motivo.circuito.vueltas` [3; 18], y entonces NO se aplica (a): el km total es aproximación más `vueltas × kmVuelta` y el jitter de km de un circuito es el de vueltas | esqueleto, zona, papeles, motivos de firma, `finalKind` |
| 2     | además de 1, `opcion = season % (1 + sk.alternativas.length)` sobre `[sk.canonico, ...sk.alternativas]`; los motivos con `firma: true` de la opción elegida SUSTITUYEN a los que tiraría `firma\|raceId` (Como y Bérgamo en `ud_montana`; Angliru y Lagos como dos metas de `et_reina_alto_largo`, sección 5)                                                                                                                                                                                                                                                                                                            | todo lo demás igual que 1                               |

La rotación es «declarada» en el sentido literal: el año la elige y el catálogo la escribe (datos §6.2, injerto I-11); no hay ningún dado en el nivel 2 que no exista en el 1. Con `season % n` la temporada 0 rinde siempre `canonico`, así que `SEASON_CALENDAR` no depende de que un esqueleto declare o no alternativas.

### 10.4 Las semillas: identidad y edición separadas

Todas las semillas pasan por `routeRng` de `profileGen.ts` (que se conserva, decisión 11) y los subflujos son nominales, como en `stage/rng.ts` (donde, recuérdese, el perfil no entra en la semilla: mapa 03 §8). La lista es cerrada y es la del glosario:

| Subflujo                                      | Lleva `season` | Se tira                                            | Decide                                           |
| --------------------------------------------- | -------------- | -------------------------------------------------- | ------------------------------------------------ |
| `arch\|raceId`                                | no             | una vez por carrera                                | esqueleto o esqueleto de composición, itinerario |
| `firma\|raceId`                               | no             | una vez por carrera                                | motivos de firma y `km` base                     |
| `ed\|raceId\|season`                          | sí             | una vez por carrera y temporada, en orden de etapa | cardinalidades, km, vueltas, alternativa         |
| `mot\|raceId\|i\|season\|slot\|j\|i{intento}` | sí             | por motivo no firma e intento                      | parámetros del motivo                            |
| `pos\|raceId\|i\|season\|i{intento}`          | sí             | por etapa e intento                                | colocación por ventanas                          |
| `dib\|raceId\|i\|season\|slot\|i{intento}`    | sí             | por motivo (firma incluida) e intento              | rampas, ondulación, `hijo{h}` en circuitos       |

La separación es el injerto I-27 (datos): la identidad no puede depender de la temporada, y una carrera de edición real no puede compartir dibujo con otra que tenga la misma salida, meta y distancia. Hoy `stagesFromEdition` siembra `${from}|${to}|${km}` (`calendar.ts` l. 224) y dos etapas de carreras distintas con la misma tripleta dibujan lo mismo (mapa 02 §7). Para una etapa con `routeSource: 'edicion'` el tramo `raceId|i` de todo subflujo se sustituye por `raceId|e{i}|{editionKey}`, con `editionKey = \`${from}|${to}|${km}\`` (`StageRequest.editionKey`): así la semilla sigue anclada al dato (mover una etapa de sitio en la edición le cambia el relieve, como hoy) y deja de ser compartida entre carreras.

Regla de reintento: `i{intento}` solo entra en `mot`, `pos` y `dib` (sección 8); `arch`, `firma` y `ed` no se reintentan nunca, porque un reintento que cambiara la identidad haría que dos temporadas con distinto número de intentos fueran carreras distintas.

### 10.5 La API de temporada

```ts
// packages/engine/src/routes/grammar/edition.ts
export function calendarForSeason(season: number): CalendarRace[] // memoizada: Map<number, CalendarRace[]>
export function raceForSeason(raceId: string, season: number): CalendarRace // índice Map<string, CalendarRace> por temporada; lanza si no existe
export function stagesForSeason(raceId: string, season: number): CalendarStage[] // = raceForSeason(raceId, season).stages
export function diffMotivos(prev: readonly Motif[], actual: readonly Motif[]): string[] // §10.8

// packages/engine/src/routes/calendar.ts
export const SEASON_CALENDAR: CalendarRace[] = calendarForSeason(BASE_SEASON)
```

`calendarForSeason(s)` construye `[...WT_RACES, ...PRO_RACES, ...CON_RACES, ...NATIONAL_CHAMPIONSHIPS]` ordenado por `startDay` como hoy (`calendar.ts` l. 3643-3648), pasando `season` a `buildRace`, `stagesFromEdition` y `nationalChampionships`, que la meten en cada `StageRequest` que entregan a `generateStage`. La memoización es por `Map` en el módulo: la temporada 0 se paga al cargar (hoy 578 ms medidos por el juez del motor; objetivo 1.500 ms y techo 2.500 tras el paso 8, `ARCH.arranque`), y cada temporada adicional una sola vez por proceso (≤ `ARCH.arranque.porTemporadaMs` 1.000, `routes/arranque.test.ts`, sección 14). Con `activa: false`, `calendarForSeason(s)` devuelve el mismo array memoizado de la temporada 0 para todo `s` (misma referencia, no copia), y `stagesForSeason` con él. `raceForSeason` lanza `Error('carrera desconocida')` como hace `packages/db/src/callups.ts` l. 266 con un id inexistente, en vez de devolver `undefined`: un `raceKey` cuya carrera no está en el calendario es un error de datos, no un caso.

Las carreras con `RACE_EDITIONS` y rasgos en `STAGE_FEATURES` (`routeSource: 'real'`, 177 etapas) devuelven el mismo `CalendarStage` en todas las temporadas: una edición real es un año concreto y el juego lo repite (cargar otra edición es E12). Las 226 etapas de edición sin rasgos (`routeSource: 'edicion'`) conservan ciudades, km (contrato al 0,1 con `calendar.test.ts` l. 162-174) y esqueleto de etapa (tabla `EditionTerrain → et_*`, sección 5), y la temporada entra solo en `dib`: `ed`, `mot` y `pos` reciben `BASE_SEASON` literal aunque la temporada sea otra. La razón es la doctrina de `fuentes-recorridos.md` (mapa 05 §6, «nada se inventa»): cambiarle la arquitectura a una etapa cuyas ciudades y distancia son reales sería afirmar que la carrera cambió de recorrido sin que nadie lo haya verificado; redibujar las rampas no afirma nada, porque el relieve entre esas dos ciudades ya era inventado. La variación de edición entera queda para las 1.015 etapas generadas, que es donde el dueño la pide (ingeniero §6.4).

### 10.6 Cómo lo consume `generateStage`

Dentro de `generateStage(req)` (sección 8) el orden es identidad, firma, edición, instancia; lo que esta sección fija es qué entra en cada paso:

```ts
// packages/engine/src/routes/grammar/edition.ts
export interface EditionPlan {
  km: number // ya con jitter y acotado; = req.km si routeSource === 'edicion'
  n: Record<number, number> // cardinalidad por índice de hueco no firma
  vueltas?: number // circuito de firma, tras vueltasJitter
  opcion: number // 0 = canonico; índice en [canonico, ...alternativas]
}
export function editionOf(sk: Skeleton, firma: readonly Motif[], req: StageRequest): EditionPlan
// Lee ARCH.edicion; tira en `ed|${raceId}|${season}` (o en `ed|${raceId}|e${i}|${editionKey}|0` si routeSource === 'edicion').
// Puro: misma entrada, mismo plan; no mira el perfil.
```

`editionOf` se llama una vez por etapa y su resultado entra en la instanciación (`mot`), no al revés: los vetos de la sección 9 pueden rechazar un intento y forzar otra tirada de `mot`, `pos` o `dib`, pero nunca otro `EditionPlan`. Si los 8 intentos fallan (`ARCH.colocacion.maxIntentos`), la etapa cae a la plantilla canónica de la opción elegida con `degradado: true`, y el calendario exige cero degradados (`ARCH.veto.fallbackMaxShare.calendario` 0): el plan de edición no puede ser la causa de un degradado, y si lo es en el paso 6 se estrechan `kmJitter` o `motivoNuevo` para ese esqueleto antes que tocar `maxIntentos` (misma regla que `ARCH.veto.intentosP95`).

### 10.7 En la base: congelar la temporada que toca y leerla

Cuatro cambios en `packages/db`, ninguno en la forma de la clave (ya es por `raceKey`, o sea por temporada):

```ts
// packages/db/src/raceRoutes.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // hoy 'real' | 'generado' (l. 29); la columna es text (schema.ts l. 523): sin migración por el tipo
export interface FrozenStage {
  stageDay: number
  profile: StageProfile
  kind: StageKind
  label: string
  timeTrial: boolean
  routeSource: RouteSource
}
export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void>
// congela stagesForSeason(raceId, season): profile, kind, label, time_trial, route_source; idempotente (onConflictDoNothing, l. 54)
export async function getRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  stageDay: number,
): Promise<StageProfile | null> // sin cambios
export async function raceStagesForWorld(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<FrozenStage[]>
// filas congeladas de la carrera ordenadas por stage_day; si no hay ninguna, stagesForSeason(raceId, season) proyectado a FrozenStage
export async function backfillRaceRoutes(
  db: Conn,
  worldId: string,
  raceKeys: readonly string[],
): Promise<number>
// saca season de raceKey (`${id}:s${season}`, calendarRun.ts l. 783) y llama a freezeRaceRoute con ella
```

1. **`freezeRaceRoute` recibe `season`.** Hoy busca en `SEASON_CALENDAR` (l. 41) y escribe `'generado'` a ciegas (l. 48-51). Pasa a buscar en `stagesForSeason(raceId, season)` y a copiar `stage.routeSource`, `stage.kind`, `stage.label` y `stage.timeTrial ?? false`. El llamante único (`calendarRun.ts` l. 1603, `if (idx === 1) await freezeRaceRoute(tx, worldId, raceKey, race.id)`) ya tiene `season` en la misma función (l. 1582 la pasa a `convokeSelfEntries`), así que el cambio es añadir un argumento.
2. **Migración `packages/db/drizzle/00NN_race_routes_kind.sql`** (`NN` = siguiente libre tras la línea del motor; hoy la última es `0039_el_recorrido_es_del_mundo.sql`; el esqueleto de este documento la sitúa en `packages/db/migrations/`, que no existe en el repositorio: la carpeta real es `packages/db/drizzle/`). Añade a `race_routes` tres columnas: `kind text NOT NULL DEFAULT 'llana'`, `label text NOT NULL DEFAULT 'Flat'`, `time_trial boolean NOT NULL DEFAULT false`. Los `DEFAULT` existen solo para que la migración aplique sobre una tabla con filas; ningún mundo vivo llega al lanzamiento con filas viejas porque el mundo se reinicia y `backfillRaceRoutes` se corre antes del paso 8 (decisión 45, `docs/ops.md`). `schema.ts` l. 512-526 gana las tres columnas con el mismo `$type` que `StageSpec` (`calendar.ts` l. 33-40).
3. **Los cuatro lectores leen el congelado** (decisión 23), a través de `raceStagesForWorld`, nunca de `SEASON_CALENDAR`: `calendarRun.ts` l. 1614-1616 (`kind`, `profile`, `timeTrial` del `StageInput`), `calendarRun.ts` l. 516 y `packages/db/src/callups.ts` l. 98 (`raceVocationFit`), y `raceContext.ts` l. 114-127 (`terrenoRestante` sobre `profile` y `timeTrial` de todas las etapas de la carrera). El fallback a `stagesForSeason(raceId, season)` no es un resto de compatibilidad: la convocatoria ocurre `CALLUP_LEAD_DAYS` antes de la salida (`callups.ts` l. 80-82) y el congelado se escribe el día de la etapa 1, así que `callups.ts` l. 98 lee SIEMPRE por el fallback, y lo que garantiza que convoca para el recorrido que luego se corre es que `stagesForSeason` es puro y memoizado y `freezeRaceRoute` congela esa misma temporada. `sim/world.ts` l. 171-181 no cambia: es una bolsa estadística de `kind` por división construida sin mundo, y `kind` es identidad (§10.1), así que la temporada 0 le da la misma distribución que cualquier otra.
4. **`recorridoDelMundo.test.ts` gana un caso** (decisión 44): «dos temporadas, dos recorridos, un esqueleto»: congelar `race-x:s0` y `race-x:s1` de la primera carrera generada con ≥ 3 etapas, leer las dos, y exigir `canonico(p0) !== canonico(p1)` en al menos una etapa, `kind`, `label` y `time_trial` iguales etapa a etapa, y `route_source` igual al de `stagesForSeason`. El test sigue auto-consistente (compara con el calendario del mismo proceso, mapa 06 §3.5).

Lo que esto cierra es el caso 4 del mapa 03 §9: `apps/api/src/routes/calendar.ts` l. 97 dibuja hoy `run?.profile ?? stage.profile`, o sea el código y no el congelado, y para una etapa no corrida enseñaría la temporada 0 del generador actual aunque `race_routes` tenga otra cosa. Pasa a `run?.profile ?? frozen?.profile ?? stagesForSeason(raceId, season)[i - 1].profile`, con `frozen` de `raceStagesForWorld` y `season` del mundo (sección 11 escribe el resto de la API).

### 10.8 En la ficha: «Edición N», los cambios y la frase

El riesgo 10 del juez de cobertura es que todas las propuestas activaban la variación y ninguna la enseñaba. Se resuelve en la ficha de etapa (decisión 39, D10 con su valor por defecto: frase de arquitectura y edición siempre):

```ts
// apps/api/src/routes/calendar.ts, campos que gana cada etapa de `planFrom` (l. 91-105)
interface StageCardRoute {
  routeSource: 'real' | 'edicion' | 'generado'
  edicion: number // season + 1: el primer año de un mundo es «Edición 1»
  arch: { frase: string; skeleton: SkeletonId; geo: GeoZone } | null // null en 'real'
  cambiosRespectoAnterior: string[] // [] en 'real', en edicion 'generado' con season === BASE_SEASON, y cuando nada no firma cambió
}
```

`cambiosRespectoAnterior = diffMotivos(prevArch.motivos, arch.motivos)` con `prev = stagesForSeason(raceId, season - 1)[i - 1]`. `diffMotivos` compara las dos listas ignorando los motivos con `firma: true` (que por construcción son iguales) y devuelve una frase por diferencia, en el orden de la etapa, con el `nombre` del motivo: «una cota más: Cota de 3,1 km al 5 % a 62 km de meta», «desaparece el sector de 1,8 km a 35 km», «192 km → 201 km», «9 vueltas → 10». Para etapas `edicion` devuelve `[]` siempre (solo cambia el dibujo y no se anuncia, porque anunciar «rampas nuevas» entre las mismas ciudades sería prometer un dato que no existe). El texto de la marca de origen es el de la decisión 39 y no varía con la temporada: «Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado». La web pinta «Edición N» junto a la marca y, si `cambiosRespectoAnterior` no está vacío, la lista bajo la frase de arquitectura; la sección 11 escribe los textos de la interfaz, y `scripts/inventario-recorridos.mjs` lee `routeSource` y no la edición (el inventario es del calendario base).

### 10.9 Tests de identidad (`grammar/edition.test.ts`, paso 6 del plan)

Corre en `test:rapido` sobre las carreras generadas de `calendarForSeason(s)` con `s` de 0 a 5 (seis temporadas memoizadas, ≤ 6 s por el techo de `ARCH.arranque`); las bandas son las de arquitectura §11.3 fila «identidad» y las de ingeniero §6.3, con `profileCorrelation` de `geometry.ts` (g por km, eje normalizado desde meta).

```ts
// packages/engine/src/routes/grammar/edition.test.ts
describe('identidad entre ediciones', () => {
  const generadas = SEASON_CALENDAR.filter((r) => r.routeSource === 'generado')
  it('stagesForSeason(id, 0) es SEASON_CALENDAR, misma referencia', () => {
    for (const r of SEASON_CALENDAR) expect(stagesForSeason(r.id, BASE_SEASON)).toBe(r.stages)
  })
  it('temporadas 1 a 5 contra 0: mismo esqueleto, misma zona, misma firma, mismos papeles', () => {
    for (const r of generadas)
      for (let s = 1; s <= 5; s++) {
        const a = stagesForSeason(r.id, 0),
          b = stagesForSeason(r.id, s)
        expect(b.length).toBe(a.length)
        a.forEach((e, i) => {
          expect(b[i]!.arch!.skeleton).toBe(e.arch!.skeleton)
          expect(b[i]!.arch!.geo).toBe(e.arch!.geo)
          expect(firmaDe(b[i]!.arch!.motivos)).toEqual(firmaDe(e.arch!.motivos)) // motivos con firma: true, parámetros incluidos
          expect(b[i]!.kind).toBe(e.kind)
          expect(b[i]!.label).toBe(e.label)
          expect(b[i]!.timeTrial ?? false).toBe(e.timeTrial ?? false)
          expect(b[i]!.arch!.finalKind).toBe(e.arch!.finalKind)
        })
      }
  })
  it('km ± 6 % salvo edición real, y ≥ 1 diferencia no firma en 4 de 5 temporadas', () => {
    for (const r of generadas) {
      let distintas = 0
      for (let s = 1; s <= 5; s++) {
        const a = stagesForSeason(r.id, 0),
          b = stagesForSeason(r.id, s)
        a.forEach((e, i) =>
          expect(Math.abs(kmDeStage(b[i]!) / kmDeStage(e) - 1)).toBeLessThanOrEqual(0.06 + 1e-9),
        )
        if (a.some((e, i) => diffMotivos(e.arch!.motivos, b[i]!.arch!.motivos).length > 0))
          distintas += 1
      }
      expect(distintas).toBeGreaterThanOrEqual(4)
    }
  })
  it('correlación entre ediciones consecutivas en [0,55; 0,9]; entre carreras del mismo esqueleto < 0,6', () => {
    for (const r of generadas)
      for (let s = 0; s < 5; s++)
        stagesForSeason(r.id, s).forEach((e, i) => {
          const c = profileCorrelation(e.profile, stagesForSeason(r.id, s + 1)[i]!.profile)
          expect(c).toBeGreaterThanOrEqual(0.55)
          expect(c).toBeLessThanOrEqual(0.9)
        })
    for (const [a, b] of paresMismoEsqueleto(generadas))
      // primera etapa con ese esqueleto de cada par, 200 pares por semilla fija
      expect(profileCorrelation(a.profile, b.profile)).toBeLessThan(0.6)
  })
  it('las etapas real no varían y las edicion varían solo el dibujo', () => {
    for (const r of SEASON_CALENDAR)
      stagesForSeason(r.id, 3).forEach((b, i) => {
        const a = r.stages[i]!
        if (a.routeSource === 'real') expect(b.profile).toEqual(a.profile)
        if (a.routeSource === 'edicion') {
          expect(kmDeStage(b)).toBeCloseTo(kmDeStage(a), 1)
          expect(b.arch!.motivos.map((m) => [m.kind, m.km, m.g])).toEqual(
            a.arch!.motivos.map((m) => [m.kind, m.km, m.g]),
          )
          expect(b.profile).not.toEqual(a.profile)
        }
      })
  })
  it('nivel 2 rota por season % n y la temporada 0 rinde canonico', () => {
    const conAlt = generadas.filter((r) => SKELETONS[r.stages[0]!.arch!.skeleton].alternativas)
    expect(conAlt.length).toBeGreaterThan(0)
    for (const r of conAlt) {
      const sk = SKELETONS[r.stages[0]!.arch!.skeleton]
      const n = 1 + sk.alternativas!.length
      expect(firmaDe(r.stages[0]!.arch!.motivos)).toEqual(firmaDe(sk.canonico))
      expect(firmaDe(stagesForSeason(r.id, n)[0]!.arch!.motivos)).toEqual(
        firmaDe(r.stages[0]!.arch!.motivos),
      )
      expect(firmaDe(stagesForSeason(r.id, 1)[0]!.arch!.motivos)).toEqual(
        firmaDe(sk.alternativas![0]!),
      )
    }
  })
  it('con ARCH.edicion.activa = false toda temporada es la 0', () => {
    withArch({ edicion: { ...ARCH.edicion, activa: false } }, () => {
      expect(calendarForSeason(4)).toBe(calendarForSeason(0))
    })
  })
  it('dos carreras de edición con la misma salida, meta y km ya no dibujan lo mismo', () => {
    const [a, b] = paresMismaTripleta(SEASON_CALENDAR) // se buscan en RACE_EDITIONS; si no hay, se construyen dos ediciones sintéticas
    expect(a.profile).not.toEqual(b.profile)
  })
})
```

Cinco notas para el implementador. `firmaDe(motivos)` es un auxiliar del test (filtra `firma: true` y proyecta `kind`, `km`, `g`, `forma`, `adoquin`, `estrellas`, `vueltas`, `meta`, `cotaFinal`); `kmDeStage` suma `segment.km`. La banda de correlación [0,55; 0,9] es la de ingeniero §6.3 y se toma tal cual porque es la única de las cinco propuestas con las dos colas escritas (ni copia, ni carrera distinta); si en el paso 6 alguna etapa sale de banda, el resultado se anota y se ajusta `kmJitter` o `motivoNuevo`, no la banda (regla de la decisión 30). La correlación entre carreras distintas del mismo esqueleto < 0,6 es más estricta que V12 (`ARCH.anticlon.maxCorrelacion`, provisional 0,85, sección 9) porque V12 es un veto sobre cualquier par y esta es una banda sobre pares del mismo esqueleto y zona distinta; V12 sigue vigente aparte. El test de `activa: false` necesita que `calendarForSeason` lea `ARCH.edicion` en cada construcción y vacíe su `Map` cuando `withArch` la cambia (`withArch` es el mismo auxiliar que el resto de tests de constantes usen; si no existe, se escribe en `edition.test.ts` con un `beforeEach` que llama a `resetSeasonCache()`, exportada solo para tests). Y el test de la tripleta repetida se construye con dos `RaceEdition` sintéticas si el dato real no tiene ninguna, porque lo que sella es la semilla, no el dato.

Los tests de otras secciones que esta obliga: `tour.test.ts` (sección 7) añade «los papeles de una vuelta no cambian entre las temporadas 0 a 5» sobre `itinerarioDe`; `sim/routeCensus.test.ts` (sección 13) corre el censo sobre las temporadas 1 a 3 además de la 0 y exige las mismas bandas; `recorridoDelMundo.test.ts` el caso de §10.7; y `routes/arranque.test.ts` (sección 14) mide lo que cuestan las cinco temporadas que este fichero construye.

---

## 11. Lo real frente a lo generado

El calendario de hoy tiene tres poblaciones y solo una la produce `profileGen.ts` entera. Medido sobre las 1.418 etapas de `SEASON_CALENDAR` (mapa 02 §9, `inventario-recorridos.md` l. 22-36): 177 etapas (12,5 %) tienen rasgos reales en `STAGE_FEATURES` y su relieve lo construye `featureProfile.ts`; 226 (15,9 %) pertenecen a una de las 60 ediciones de `RACE_EDITIONS` pero no tienen rasgos para esa etapa, así que tienen ciudades y kilómetros reales y relieve generado; y 1.015 (71,6 %) son enteramente obra del generador, de las cuales 532 son campeonatos nacionales. La gramática de motivos sustituye al generador en las dos últimas poblaciones y no toca la primera. Esta sección fija cómo se marca cada población, cómo se demuestra que lo real no se ha movido, cómo viaja la marca hasta la pantalla y cómo se reconcilia el `kind` entre el código, el congelado y la ficha.

### 11.1 La prioridad de `buildRace` no cambia; cada rama marca su origen

`buildRace` (`calendar.ts` l. 886-925) mira `RACE_EDITIONS[row.id]` antes que `row.stages` y `row.terrain` (l. 902-910), y dentro de `stagesFromEdition` (l. 216-231) mira `STAGE_FEATURES[id][i]` antes que el generador (l. 225: `f ? featureSpec(...) : oneDaySpec(...)`). Para una carrera de un día de tabla, `STAGE_FEATURES[row.id]?.[0]` decide entre `featureSpec` y `oneDaySpec` (l. 916-918). Ese orden (edición real > rasgos reales > generado) se conserva tal cual; lo que cambia es que cada rama declara de dónde viene y a qué gramática va:

| Rama de `buildRace`                                        | Condición                                        | `routeSource` de la etapa | Quién dibuja                                                                                             | Esqueleto                                                                                                                                                                             | Semilla de dibujo                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `featureSpec` (l. 196-209), en edición o en un día         | `STAGE_FEATURES[id][i]` existe                   | `real`                    | `buildFeatureProfile` (`featureProfile.ts` l. 362-375), sin cambios                                      | ninguno; `arch` es `undefined`                                                                                                                                                        | `${from}\|${to}\|${km}` o `row.id`, como hoy; `season` no entra                                                 |
| `stagesFromEdition` sin rasgos (l. 225, rama `oneDaySpec`) | edición en `RACE_EDITIONS`, `features?.[i]` nulo | `edicion`                 | `generateStage` con `km` de la edición como contrato al 0,1 (`calendar.test.ts` l. 162-174 y l. 203-215) | uno de ETAPA por `EditionTerrain`: `flat → et_llana`, `hilly → et_media_*`, `mountain → et_reina_*`, `itt → et_crono`, `cobbles → ud_adoquin_ligero` (tabla completa en la sección 5) | `${raceId}\|e${i}\|${editionKey}` con `editionKey = ${from}\|${to}\|${km}`; `season` solo en `dib` (sección 10) |
| un día de tabla sin rasgos (l. 911-918)                    | sin edición, `row.stages ≤ 1`, sin rasgos        | `generado`                | `generateStage` con `role: 'un_dia'` y `km` de `ARCH.km.porClase` salvo fila con `km` explícito          | los 15 de un día por `regionOf(raceId, 1, country)`                                                                                                                                   | `arch\|raceId`, `firma\|raceId`, `ed\|raceId\|season`                                                           |
| vuelta de tabla (l. 920-923)                               | sin edición, `row.stages ≥ 2`                    | `generado`                | `composeTour` y `generateStage` por etapa                                                                | los 17 de etapa por `itinerarioDe`                                                                                                                                                    | ídem, por etapa                                                                                                 |
| `nationalChampionships` (l. 255-367)                       | los 532 `.NC`                                    | `generado`                | `generateStage` con `nc_ruta` o `nc_crono` y `zonaDe(code)`                                              | `nc_ruta`, `nc_crono`                                                                                                                                                                 | ídem                                                                                                            |

Dos consecuencias que hoy no se cumplen y a partir del paso 8 sí. La primera: una etapa de edición sin rasgos ya no pasa por `oneDaySpec` ni por `mountainOneDay` (`calendar.ts` l. 149-152), que es la causa del defecto de Colombia e5 (una reina de vuelta dibujada con plantilla de un día, con 18 km tras la cota contra los «47 km rodadores» que declara el `why` de `REAL_QUEENS`, mapa 06 §1 y §6.1); recibe un esqueleto de etapa y la zona por etapa de `RACE_REGION[raceId].stages[i]` (sección 6). La segunda: dos etapas de carreras distintas con la misma salida, meta y distancia ya no dibujan lo mismo, porque la semilla lleva el `raceId` delante (mapa 02 §7 documenta la colisión de hoy con `${from}|${to}|${km}` a secas).

La regla de `fuentes-recorridos.md` manda sobre la gramática: una carrera con rasgos PARCIALES sigue exactamente como hoy. El Guangxi solo carga el final de la etapa 5 (`classicRoutes.ts` l. 297-301, mapa 02 §9): esa etapa es `real` y las otras cuatro son `edicion`; `race-france` es `real` en 20 etapas y `edicion` en la e21 (mapa 06 §1). La gramática no inventa nada sobre una etapa con dato, y no lee `STAGE_FEATURES` para nada que no sea decidir la rama.

Por carrera, el origen se agrega con tres valores, y `mixto` es SOLO de carrera, nunca de etapa (la propuesta que lo usaba por etapa queda traducida así):

```ts
// packages/engine/src/routes/grammar/generate.ts
export type RouteSource = 'real' | 'edicion' | 'generado' // por etapa
export type RaceRouteSource = 'real' | 'mixto' | 'generado' // por carrera, agregado

export function raceRouteSourceOf(
  stages: readonly { routeSource: RouteSource }[],
): RaceRouteSource {
  const reales = stages.filter((s) => s.routeSource === 'real').length
  if (reales === stages.length) return 'real'
  if (reales === 0) return 'generado'
  return 'mixto'
}
```

`CalendarStage` gana `routeSource: RouteSource` y `arch?: GeneratedStage['arch']` (`undefined` en las `real`); `CalendarRace` gana `routeSource: RaceRouteSource` calculado con `raceRouteSourceOf` en `buildRace`. Con el calendario de hoy, medido por script en el paso 0 y sellado en `grammar/calendario.test.ts`: 177 / 226 / 1.015 por etapa, y por carrera 842 con `real` + `mixto` = 41 (las 15 clásicas de `CLASSIC_FEATURES`, las cinco cargadas directamente en `stageFeatures.ts` y las 21 con edición y rasgos, mapa 02 §9). El reparto exacto entre `real` y `mixto` de esas 41 lo imprime el test y no se escribe aquí de memoria: depende de qué vueltas tienen rasgos en TODAS sus etapas (Italia y España 21 de 21, Francia 20 de 21, mapa 06 §1).

### 11.2 `featureProfile.ts` no se toca en E1, y la deuda de los dos rellenos

Decisión 27: ninguna línea de `featureProfile.ts`, `classicRoutes.ts`, `stageFeatures.ts` ni `editions.ts` cambia en E1. La razón no es pereza sino que las 177 etapas reales son la vara del banco: sobre ellas están medidas `erosion.longClassicFresh` (Flandes) y `erosion.hardestClassicFresh` (Lombardía), `realQueenThirdWeek` (Francia e18), `italy9SummitFinishes`, las 18 de un día WT de la saturación y las siete reinas de `race-france` que mide `grandTour` (mapa 06 §5), y `routes/featureProfile.test.ts` y `classicRoutes.test.ts` (mapa 06 §2.4) sellan su construcción segmento a segmento. Cualquier cambio en cómo se rellena la carretera anónima entre dos puertos publicados mueve esas bandas sin que el generador haya cambiado, y este documento se compromete a que «si se mueven, el rediseño ha tocado el motor y no el generador» (mapa 06 §5).

El coste de no tocarlo es tener dos rellenos distintos para dos poblaciones del mismo calendario (riesgo 9 de cobertura), y se escribe con sus números para que nadie lo descubra después:

|                           | Etapas reales (177)                                                                                                                                                                          | Etapas generadas y de edición (1.241)                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Función de relleno        | `rollingFill(gap, seed, amplitud)` (`featureProfile.ts` l. 158-176): tramos de `1,4 + U·2,2` km a `±(0,4 + U·2,4)·amplitud` %, signo al 50 % (mapa 01 §6)                                    | motivo `enlace` rendido con `rolling(rand, km, amp, 0)` y `amp = GeoSignature.amplitud` (sección 4)                                                  |
| De dónde sale la amplitud | `RELIEF.rollingAmplitude` por TERRENO: flat 0,55, itt 0,55, cobbles 0,7, hilly 0,85, classic 1,0, mountain 1,15 (`constants.ts` l. 1115-1134, mapa 01 §3)                                    | `ZONAS[zona].amplitud` por ZONA, con tope `ARCH.motivo.enlace.ampMax` 2,4 (sección 6)                                                                |
| Cuadre de la distancia    | `normalizeTotal` (l. 179-188) estira o encoge el ÚLTIMO segmento, que es relleno de cola salvo en final en alto, donde es el puerto (lo que `profileGen::normalize` dejó de hacer en la v64) | `normalizeEnlaces` reparte solo entre enlaces, residuo al enlace más largo, y `garantizaClase` con la guarda `segment.km === Σ tramos` (decisión 10) |
| Bajadas                   | `descentSegment` de `min(0,65·hueco, max(1, prevGainM/55))` km al 85 % de lo subido, topada a −12 % (`MAX_DESCENT_GRADIENT`, l. 142)                                                         | motivo `descenso` con `ARCH.motivo.descenso.kmPorDesnivel` `clamp(len·g·10/55, 2, 10)` y `g` en [−8; −3]                                             |
| Quién decide la clase     | nadie: `stageKindOf` sobre un perfil real usa la red de 3.200 m (`stageKind.ts` l. 56-58) y la etiqueta es la declarada por `TERRAIN_KIND` (`calendar.ts` l. 183-190)                        | V6 y V7: `stageKindOf(profile).kind === Skeleton.kind` por construcción o reintento                                                                  |

Unificar los dos rellenos es un paso propio POSTERIOR a E1 y se anota como riesgo 7 en la sección 17. Lo que ese paso movería, para que se presupueste con la cifra delante: la huella de las 177 (§11.3, que habría que re-sellar entera con causa), `erosion.longClassicFresh` y `erosion.hardestClassicFresh` (el relleno de Flandes y Lombardía cambia de amplitud y por tanto el desgaste), `realQueenThirdWeek`, y la comparación de desnivel de `classicRoutes.test.ts` (entre 4 y 30 m/km). El único punto de contacto que E1 sí abre es de lectura: `routeCensus` (sección 13) mide a las 177 reales las mismas columnas que a las generadas (`dPlus`, `lastClimbKm`, `kmAfterLastClimb`, `finishType`), para que la tabla p10/p50/p90 de `scripts/medir-real.mjs` (decisión 40) y la del censo hablen el mismo idioma.

### 11.3 La huella FNV: lo real se sella antes de tocar `calendar.ts` y se comprueba después

Decisión 28. Antes de que ningún paso modifique `calendar.ts` (es decir, en el paso 1, antes de reducir `profileGen.ts`), se escribe `packages/engine/src/routes/realFingerprint.test.ts` con dos sellos:

1. **Las 177 etapas con rasgos**, una a una: `raceId`, `index`, `km` al 0,1, número de segmentos y un hash FNV-1a del JSON canónico de `profile.segments`. El hash es `hashInt` de `profileGen.ts` l. 15-22 (FNV-1a de una cadena, mapa 01 §1), que se conserva exportado en el paso 8 precisamente para esto; la entrada es `JSON.stringify(segments)` con las claves en el orden en que `featureProfile.ts` las escribe, sin reordenar (así el sello detecta hasta un cambio de orden de claves, que rompería el congelado `jsonb` de `race_routes` al comparar con `canonico()` en `recorridoDelMundo.test.ts`, mapa 06 §3.5).
2. **Las tres grandes vueltas enteras** (`race-france`, `race-italy`, `race-spain`): estructura de las 21 etapas (`kind`, `label`, `timeTrial`, `km`, `restAfter`) y la huella de perfil de cada etapa `real`. La e21 de `race-france` es `edicion` (mapa 06 §1): su ESTRUCTURA se sella y su perfil no, porque cambia en el paso 8 al pasar por `et_llana`. Con el sello del paso 8 (§11.4) se comprueba que sigue siendo `llana` y de 130 km (`editions.ts`, Thoiry a París); lo que dibuje dentro es asunto de la gramática.

El fichero de huellas es un literal TypeScript generado por script y pegado (no un fichero regenerable que el test lea, porque entonces regenerarlo taparía el fallo): `routes/realFingerprint.sealed.ts`, 177 filas de etapa y tres bloques de 21 (con `huella: null` en la e21 de Francia). El test corre en `test:rapido` (coste: una carga de `SEASON_CALENDAR`, 578 ms medidos por el juez del motor §1, más 239 hashes), sobrevive al paso 8 y sigue para siempre; es el test que permite decir «lo real no se ha movido» sin leer 177 perfiles a mano.

```ts
// packages/engine/src/routes/realFingerprint.test.ts (paso 1; sobrevive al paso 8)
import { hashInt } from './profileGen.js'
import { SEASON_CALENDAR } from './calendar.js'
import { STAGE_FEATURES } from './stageFeatures.js'
import { SELLADAS, GRANDES_VUELTAS } from './realFingerprint.sealed.js'

export function huella(profile: StageProfile): number {
  return hashInt(JSON.stringify(profile.segments))
}

describe('lo real no se mueve', () => {
  it('las 177 etapas con rasgos tienen la huella sellada', () => {
    const vistas: string[] = []
    for (const race of SEASON_CALENDAR) {
      for (const stage of race.stages) {
        const f = STAGE_FEATURES[race.id]
        const hit = Array.isArray(f) ? f[stage.index - 1] : race.stages.length === 1 ? f : null
        if (!hit) continue
        const key = `${race.id}:${stage.index}`
        vistas.push(key)
        const s = SELLADAS[key]
        expect(s, key).toBeDefined()
        expect(stage.profile.segments.length, key).toBe(s.nSegmentos)
        expect(stageKm(stage.profile.segments), key).toBeCloseTo(s.km, 1)
        expect(huella(stage.profile), key).toBe(s.huella)
      }
    }
    expect(vistas.length).toBe(177)
  })
  it('las tres grandes vueltas conservan estructura, y perfil en sus etapas reales', () => {
    for (const [id, gv] of Object.entries(GRANDES_VUELTAS)) {
      const race = SEASON_CALENDAR.find((r) => r.id === id)!
      expect(race.stages.length).toBe(21)
      expect(race.restAfter).toEqual(gv.restAfter)
      race.stages.forEach((st, i) => {
        const e = gv.etapas[i]
        expect([st.kind, st.timeTrial ?? false, stageKm(st.profile.segments)]).toEqual([
          e.kind,
          e.timeTrial,
          e.km,
        ])
        if (e.huella !== null) expect(huella(st.profile), `${id}:${i + 1}`).toBe(e.huella)
      })
    }
  })
})
```

Aparte y con vida corta, `routes/golden.test.ts` sella en el paso 1 las 1.418 huellas del calendario entero (incluidas las generadas por los builders legado de `grammar/legacy.ts`) y se borra en el paso 8 con la misma cirugía que retira los ocho `xxxSegments`: su función es demostrar que el paso 1 (extraer primitivas y mover los builders) no cambia un solo segmento, y a partir del paso 8 ya no tiene nada que sellar. Que las 177 reales no dependan de la temporada se sella en `grammar/edition.test.ts` (sección 10): para `season` en [0; 5], `huella(stagesForSeason(id, season)[i].profile)` es idéntica en toda etapa con `routeSource === 'real'`.

### 11.4 `routeSource` viaja hasta la pantalla: base, API, web e inventario

Hoy `race_routes.route_source` recibe `'generado'` fijo (`db/raceRoutes.ts` l. 48-51: «el calendario no declara todavía de dónde viene cada recorrido»), el tipo `RouteSource` de l. 29 tiene dos valores, y la columna es `text` con default (`schema.ts` l. 523). Por eso los tres valores NO exigen migración por el tipo: se cambia el tipo TypeScript y el valor escrito, y los mundos vivos conservan `'generado'` en lo que ya tenían (que era, además, lo honesto para las filas antiguas). Lo que sí trae migración son las columnas `kind`, `label` y `time_trial` de la decisión 23 (`00NN_race_routes_kind.sql`, sección 10), que viajan en la misma fila.

```ts
// packages/db/src/raceRoutes.ts (paso 10)
export type RouteSource = 'real' | 'edicion' | 'generado' // mismo tipo que grammar/generate.ts, reexportado

export async function freezeRaceRoute(
  db: Conn,
  worldId: string,
  raceKey: string,
  raceId: string,
  season: number,
): Promise<void> {
  const race = raceForSeason(raceId, season) // nunca SEASON_CALENDAR (decisión 23)
  if (!race) return
  const filas = race.stages.map((stage, i) => ({
    worldId,
    raceKey,
    stageDay: i + 1,
    profile: stage.profile,
    routeSource: stage.routeSource, // 'real' | 'edicion' | 'generado'
    kind: stage.kind,
    label: stage.label,
    timeTrial: stage.timeTrial ?? false,
  }))
  if (filas.length === 0) return
  await db.insert(raceRoutes).values(filas).onConflictDoNothing()
}
```

`freezeRaceRoute` sigue siendo idempotente (`onConflictDoNothing`, l. 55), y `backfillRaceRoutes` (l. 91-109) se corre ANTES del paso 8 en todo mundo vivo (decisión 45), porque congela «con el generador ACTUAL a propósito» (l. 88-89) y una vuelta creada antes de la tabla y no rellenada cambiaría de recorrido a mitad (mapa 03 §9, caso 3).

De ahí hacia fuera, cuatro lectores y un texto por valor:

| Dónde                                                    | Qué expone                                                                                                                                                       | Regla                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/routes/calendar.ts` l. 91-105 (`planFrom`) | por etapa: `routeSource`, `arch.frase`, `arch.skeleton`, `arch.geo`, `edicion` (= `season + 1`) y `cambiosRespectoAnterior`; por carrera: `routeSource` agregado | la altimetría de una etapa NO corrida lee `run?.profile ?? frozen?.profile ?? stagesForSeason(raceId, season)[i].profile`, nunca `stage.profile` de `SEASON_CALENDAR` a secas (hoy l. 97 enseña el perfil del código, que puede no ser el congelado si el generador cambió en medio, mapa 03 §9 caso 4) |
| `apps/web/src/pages/Race.tsx`                            | una marca por etapa y una por carrera                                                                                                                            | tres textos exactos: `real` → «Recorrido real (fuente citada)», con la fuente de `classicRoutes.ts` cuando la hay; `edicion` → «Ciudades y distancia reales, relieve generado»; `generado` → «Recorrido generado». La carrera `mixto` dice «Recorrido parcialmente real: N de M etapas»                 |
| ficha de una etapa `edicion` o `generado`                | la frase de arquitectura y «Edición N»                                                                                                                           | D10 con su valor por defecto (sección 18): siempre, no como opción; `real` no lleva frase ni edición (no varía)                                                                                                                                                                                         |
| `scripts/inventario-recorridos.mjs`                      | ✅ / 🟡 / 🔴                                                                                                                                                     | `provenance()` (l. 50-55) deja de deducir con `STAGE_FEATURES` y `RACE_EDITIONS` y lee `stage.routeSource`; el mapa es `real → ✅ Real`, `edicion → 🟡 Sin validar`, `generado → 🔴 Inventado`, y el script imprime además `arch.skeleton` y `arch.geo` en las no reales                                |

El texto de la ficha no promete lo que el motor no hace (decisión 17): para una etapa con `arch.metadatos.viento ≥ 2` se escribe «llano abierto» y nunca «abanicos», porque el abanico sigue saliendo de `rng('viento')` en cualquier km de `llano` (mapa 03 §5.1). Y el inventario regenerado sobre la temporada 0 tiene que dar 177 / 226 / 1.015: es una aserción de `grammar/calendario.test.ts` en el paso 8, no una lectura.

```ts
// packages/engine/src/routes/grammar/calendario.test.ts (paso 8), extracto
it('el origen de cada etapa es el de su rama, y el recuento es el del inventario', () => {
  const cuenta = { real: 0, edicion: 0, generado: 0 }
  for (const race of calendarForSeason(BASE_SEASON)) {
    for (const st of race.stages) {
      cuenta[st.routeSource]++
      if (st.routeSource === 'real') expect(st.arch).toBeUndefined()
      else expect(st.arch?.skeleton).toBeDefined()
      if (st.routeSource === 'edicion') expect(st.arch!.skeleton.startsWith('ud_')).toBe(false) // I-9: nunca un día
    }
    expect(race.routeSource).toBe(raceRouteSourceOf(race.stages))
  }
  expect(cuenta).toEqual({ real: 177, edicion: 226, generado: 1015 })
})
```

### 11.5 Un `kind` y una etiqueta coherentes entre código, congelado y ficha

Hoy hay tres sitios que pueden discrepar sobre lo que es una etapa. (a) `SEASON_CALENDAR` declara `kind` y `label` por la rama (`TERRAIN_KIND` para reales y ediciones, el constructor para generadas), y `stageKindOf(profile)` no coincide en 72 etapas (juez motor §1, mapa 06 §2.1: `race-colombia e2` declarada `reina` y leída `media`). (b) `calendarRun.ts` l. 1614 pasa `kind: stage.kind` del código junto al perfil congelado (l. 1615), `callups.ts` l. 98 y `calendarRun.ts` l. 516 leen `race.stages.map(s => s.kind)` de `SEASON_CALENDAR`, y `raceContext.ts::terrenoRestante` (l. 56-59, llamada l. 127) integra los km de subida que quedan sobre `stage.profile` del código, no del congelado (juez motor §5 riesgo 1). (c) `apps/api/src/stageHistory.ts::calendarStageSpec` (l. 73-88, 101-109) corrige la etiqueta de `reina` y `media` con su propia regla, `runInAfterLastClimb(segments) <= SUMMIT_RUN_IN_KM` (5 km, cualquier `puerto`), mientras `stageKindOf` decide `Summit finish` por «el último segmento es `puerto`» (`stageKind.ts` l. 84): son dos reglas distintas, y una `reina` `cima_cerca` con [0,5; 5] km de valle es `Mountains` para una y `Summit finish` para la otra, así que cuenta en el 49 de `stageHistory.test.ts` l. 199 aunque `kind` se lea del perfil (juez motor §5 riesgo 2).

Decisión 23, en cuatro reglas:

1. **`kind` de toda etapa generada o de edición es `stageKindOf(profile, timeTrial).kind`**, garantizado por V6 en `verify` (reintento y, si se agota `ARCH.colocacion.maxIntentos` 8, plantilla canónica, que pasa V6 por construcción). El `kind` deja de ser una declaración del constructor y pasa a ser una lectura del perfil; en lo `real` sigue siendo el de `TERRAIN_KIND`, y la discrepancia que eso deja se mide (§11.6).
2. **Una sola regla para `Summit finish`**: `stageKind.ts` exporta `SUMMIT_RUN_IN_KM = 5` y decide la etiqueta por `kmAfterLastClimb(profile) <= SUMMIT_RUN_IN_KM`, donde `kmAfterLastClimb` suma los km tras el último segmento `puerto` (0 si es el último; `Infinity` sin puertos). Es la regla de `stageHistory.ts` l. 73 con su medida delante (cola ≤ 5 km: mediana 3 juntos en meta, velocista 15 %, indistinguible del control; cola > 5 km: 17 juntos y 46 %, comentario de l. 60-72), movida al único sitio que debe decidirla. `kind` NO cambia de regla: 8,5 / 3.200 / 3 siguen donde están (decisión 26). Afecta a `reina` (`Summit finish` / `Mountains`) y a `media` (`Uphill finish` / `Hills`), que son los dos `kind` de `SUMMIT_FINISH` en `stageHistory.ts`.
3. **`calendarStageSpec` deja de reetiquetar por su cuenta**: para una etapa con `routeSource !== 'real'` devuelve `stage.label` tal cual (ya es la que salió de `stageKindOf` al generar, y está congelada en `race_routes.label`); para una `real` devuelve `stageKindOf(stage.profile, stage.timeTrial).label`. Las etiquetas nuevas de la decisión 38 (`Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic`) las pone `generateStage` desde `Skeleton.label` DESPUÉS de que V6 haya igualado el `kind`, así que ninguna etapa generada puede tener una etiqueta que contradiga su `kind`; `calendarStageSpec` no las toca porque no las recalcula.
4. **Los cuatro lectores leen el congelado**: `calendarRun.ts` l. 1614 pasa `kind: congelado?.kind ?? stage.kind` y `timeTrial: congelado?.timeTrial ?? stage.timeTrial`; `callups.ts` l. 98, `calendarRun.ts` l. 516 y `raceContext.ts` l. 127 reciben las etapas de `raceStagesForWorld(db, worldId, raceKey)` y solo si no hay fila caen a `stagesForSeason(raceId, season)`, nunca a `SEASON_CALENDAR` a secas. `sim/world.ts` l. 169-193, que calcula `CALENDARIO` al cargar el módulo leyendo `st.kind`, se queda como está (es un banco de población, no un mundo vivo) y su reparto se mide antes y después del paso 8 (riesgo 9 de ejecutabilidad, sección 13).

El 49 se re-sella con objetivo escrito. Hoy `expect(cambian).toBe(49)` cuenta etapas de cualquier origen cuya etiqueta corregida difiere de la declarada, «eran 30 hasta la v64» (comentario l. 185-190). Con las reglas 1 a 3, en las 1.241 no reales la cifra es 0 por construcción, y el test lo afirma por separado; en las 177 reales queda la cifra que dé la regla única sobre las etiquetas declaradas por `TERRAIN_KIND` (que llama `Summit finish` a TODA etapa `mountain` de edición, `calendar.ts` l. 186, tenga o no carretera detrás). Esa cifra se mide en el paso 8, se escribe en el test con su causa («solo etapas reales cuya etiqueta declarada por el terreno de la edición difiere de la que dice su recorrido; generadas = 0») y se anota en `balance.md` «v61 §1». No se promete que baje de un número concreto porque ninguna previsión sobre ella era fiable con dos reglas (juez motor §5 riesgo 2); lo que se promete es que a partir de ahí SOLO puede moverla un cambio de dato real.

```ts
// apps/api/src/stageHistory.test.ts l. 175-200 re-sellado (paso 8)
it('sobre el calendario entero solo cambia la etiqueta, nunca el tipo de etapa', () => {
  let cambianReales = 0
  let cambianGeneradas = 0
  for (const race of SEASON_CALENDAR) {
    for (const stage of race.stages) {
      const spec = calendarStageSpec(stage, 0)
      expect(spec.kind).toBe(stage.kind)
      expect(spec.timeTrial).toBe(stage.timeTrial ?? false)
      if (spec.label === stage.label) continue
      if (stage.routeSource === 'real') cambianReales++
      else cambianGeneradas++
    }
  }
  expect(cambianGeneradas).toBe(0) // regla 3: la etiqueta generada ya es la del perfil
  expect(cambianReales).toBe(N_MEDIDO_EN_EL_PASO_8) // solo dato real; causa en el comentario y en balance.md v61 §1
})
```

Y en `packages/db`, un test nuevo en `recorridoDelMundo.test.ts` («dos temporadas, dos recorridos, un esqueleto», decisión 44) más el sello de que `raceStagesForWorld` devuelve `kind`, `label` y `timeTrial` iguales a los de `stagesForSeason(raceId, season)` el día que se congeló, y que `terrenoRestante` sobre el congelado y sobre `calendarForSeason(season)` da los mismos `climbKm` mientras nadie cambie el generador entre medias.

### 11.6 `stageKindOf` no se recalibra en E1, y qué ve el jugador mientras tanto

Decisión 26. Los umbrales de `stageKindOf` (`PASS_MIN_KM` 8,5, `QUEEN_MIN_CLIMB_METRES` 3.200, `WALL_MAX_KM` 3) están calibrados «contra los propios generadores» (`stageKind.ts` l. 44-58; `stageKind.test.ts` l. 12-19, mapa 06 §2.1) y son la vara de todo el banco: `calendarQueens` muestrea por `kind === 'reina'`, `smallTours` y `world.test.ts` reparten por `kind`. Medido sobre las etapas reales (datos §1.5): `stageKindOf` llama `media` a 11 de las 54 reinas reales y `reina` a 16 de las 59 medias reales (27 de 113), y de 22 llanas reales con cota llama `clasica` a 7 y `reina` a 3. No es un defecto del clasificador (hace lo que promete) sino la prueba de que las familias del generador viejo y las de la carretera no coinciden. Recalibrarlo en E1 obligaría a remedir todo el banco dos veces (una por la vara, otra por el generador) y a atribuir cada movimiento a dos causas a la vez, que es justo lo que la lección de E3 prohíbe (mapa 04 §3). Por eso E1 hace lo contrario: lo generado se ACOTA con holgura para caber en la vara (V6 y V7 con `ARCH.veto.margenClaseKm` 0,3 y `margenValleKm` 0,7; `cota` hasta 8,0 y `puerto` desde 9,0 para no pisar 8,5), y lo real sigue con su discrepancia medida. La única modificación de `stageKind.ts` es la de la etiqueta `Summit finish` (§11.5), que no toca `kind`.

Lo que eso significa en pantalla hasta que el dueño decida D2 (con la tabla del censo delante, tras el paso 8; sección 18): la ficha enseña dos criterios según el origen, y se dice así. Una etapa `real` lleva el `kind` de su terreno de edición y la etiqueta que su recorrido dicta; una `generado` o `edicion` lleva el `kind` que su recorrido dicta y una etiqueta coherente por construcción. Tres casos que van a verse y que son CORRECTOS con esta vara:

- Una Lieja generada (`ud_montana_media` en `ardenas`, cotas de [2,5; 4,5] km que es lo que la firma de la zona permite) sale `media` con etiqueta `Mountains classic`: ninguna cota llega a 8,5 y el desnivel de cotas no llega a 3.200, así que `stageKindOf` no puede decir `reina`, y no debe, porque el clasificador de hoy llama `media` a la Lieja REAL (una de las 11 de 54). La etiqueta es la que distingue.
- Un Sanremo generado (`ud_esprint_capi`, km 294 por fila) sale `clasica / Classic` mientras su última cota mida ≤ `WALL_MAX_KM` 3 km, y `media / Hills` en cuanto la supere; la plantilla canónica de la sección 5 la deja por debajo, V6 lo garantiza y el censo lo mide. El clasificador de hoy llama `Hills` al Sanremo real por su Poggio (cobertura §5 riesgo 5), y la ficha lo dirá así hasta D2.
- Una reina `cima_cerca` con 3 km de valle sale `reina / Summit finish` en la ficha Y en `stageHistory`, que es la corrección de §11.5; hoy sale `Mountains` en una y `Summit finish` en la otra.

`routeCensus` imprime desde el paso 0 la tabla `kind` declarado × `kind` leído para las 177 reales, por clase y por `finalKind`, y esa tabla (no una estimación) es lo que la sección 18 pone delante del dueño en D2. Si D2 se decide a favor, la recalibración es un cambio propio con su remedición pareada (sección 13) y su nota en `balance.md`, nunca un ajuste dentro de E1.

### 11.7 La doctrina de `fuentes-recorridos.md`, heredada entera

La definición operativa de «real» no la escribe este documento; la hereda de `docs/fuentes-recorridos.md` (mapa 05 §6) y la aplica a la gramática con estas consecuencias:

1. **Nada se inventa sobre una carrera con dato.** Un puerto solo se anota con km de cima, longitud y pendiente, y si falta uno se descarta (l. 28-31); un muro adoquinado va como `puerto` y no como `paves` (regla 5, por el terreno único por bloque de `sample.ts`); un final en alto se ancla al km entero (regla 10, medido en Arctic Race e3). La gramática nunca completa una etapa `real` con un motivo, ni le añade un sector, ni le mueve una cima: `generateStage` no recibe etapas con rasgos, y la rama de `buildRace` lo garantiza antes de llamarla.
2. **La marca verde tiene que significar algo.** AlUla no se carga aunque tenga sprints con km exacto, y el Tour de Pologne con tres puertos de diez «se queda en 🟡, que es la verdad». La correspondencia `real → ✅`, `edicion → 🟡`, `generado → 🔴` de §11.4 conserva ese significado: una etapa `edicion` de la gramática es tan 🟡 como lo era con `oneDaySpec`, aunque ahora el relieve sea plausible para su zona; plausible no es verificado.
3. **PCS y Overpass están vetados** (`robots.txt`, `Disallow: /api/`), lo que cierra la validación externa que `motor.md` §V.3 prometía. Por eso la tabla geográfica es juicio (decisión 16), la galería de la sección 16 es el instrumento de validación, y `scripts/medir-real.mjs` (decisión 40) lee SOLO lo publicado en `STAGE_FEATURES`: da p10/p50/p90 de las 177 para las bandas de `routeCensus` donde haya ≥ 3 fuentes y para calibrar `ARCH.anticlon.maxCorrelacion` (V12, sección 9), y el generador no depende de ningún fichero regenerable. Una etapa real sin `climbs` no aporta bandas de puertos aunque tenga `elevation`.
4. **Copiar no es aprender.** V12 mide la correlación de `huella` (g por km, eje normalizado desde meta) de cada etapa generada contra las reales de su familia y exige que sea menor que el p90 de los pares reales de la misma familia (Ronde y E3, Amstel y Brabant, Lombardía y Lieja): «tan parecido como dos carreras reales distintas, no más». Los nombres no existen: las ciudades vienen de `raceRoutes.ts` (310 carreras de equipos, sin fuente para 250 de ellas, mapa 02 §8) y el nombre de la carrera es «Race + Geografía» (`calendar.ts` l. 2-7).
5. **Medir es parte de cargar** (paso 7 del procedimiento de `fuentes-recorridos.md`: «Cargar un recorrido no es rellenar una tabla: es cambiar la carrera»). La misma regla vale al revés: sustituir el relieve generado de una etapa `edicion` por uno real es trabajo de E12, y cuando ocurra la etapa cambia de rama, de marca y de huella, y `realFingerprint.sealed.ts` gana una fila con su causa. E1 deja el sitio hecho: `routeSource` con tres valores, `freezeRaceRoute` con `season`, y una regla de etiqueta única, para que E12 solo tenga que cargar dato y pintar.

Lo que E1 no hace con lo real, dicho para que no se busque aquí: no carga ninguna etapa nueva (las 22 WT «INTENTADO Y BLOQUEADO» de Pologne, Benelux, Guangxi, Bruges, Copenhague, Bretaña, el Rhône-Alpes y la e21 del Tour siguen en 🟡), no corrige las deudas de dato con nombre (Montréal con dos de cuatro cotas por vuelta, Strade sin Santa Caterina, Slovenia con distancias desviadas hasta 7 km) y no unifica los dos rellenos. Todo eso está en la sección 17 con su coste.

---

## 12. Las constantes

La regla de la casa es una línea de `Claude.md` (l. 12): «Toda constante de juego vive en `packages/engine/src/constants.ts` con comentario de intención. Cambios de constantes se anotan en `docs/balance.md`». El generador de hoy la incumple por omisión: de todo `ROUTE` (`constants.ts` l. 1151-1246) solo cuatro claves entran en `profileGen.ts` (`queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`), y los rangos de longitud y pendiente de cotas, muros, bajadas y relleno están escritos en el cuerpo de las funciones (mapa 01 §3: «cambiar "una cota de media es de 3 a 7 km" es editar `profileGen.ts` l. 247»). Esta sección cierra eso: un bloque nuevo `ARCH` en `constants.ts`, junto a `ROUTE`, con los números de intención del generador, cada uno con valor, intención y en qué se apoya; y las tablas grandes (`ZONAS`, `TERRITORIOS`, `RACE_REGION`, `SKELETONS`, `TOUR_SKELETONS`) como datos en `routes/grammar/*.ts`, reexportadas desde `constants.ts` por referencia para que la regla se cumpla sin meter 29 filas de geografía en un fichero de perillas.

Convención de lectura: `[a; b]` es un rango cerrado en el que se sortea uniforme (`between(rand, a, b)`, `profileGen.ts` l. 47-49, que es semiabierto por arriba y se acepta así); `[min, rango]` es la forma de `ROUTE.kmFlat` (l. 1240), mínimo más amplitud; una probabilidad se escribe `p`. Toda cifra medida dice de dónde sale: mapa 01 (generador), mapa 03 (motor), mapa 07 (ciclismo real), `juicios/motor.md` §1 (coste) o `propuestas/datos.md` §1.4 (las 177 etapas reales).

### 12.1 La forma del bloque `ARCH`

Se escribe entero, `as const`, con el comentario de intención sobre cada clave (en el fichero real cada línea lleva el comentario que aquí va en las tablas 12.2 a 12.9; el bloque se muestra sin ellos para que se vea la forma). Los tipos `RaceClass` (`routes/uci.ts` l. 12: `'WT' | 'Pro' | '1' | '2' | 'NC'`), `Relieve`, `StageRole` y `SkeletonId` son los de la sección 3.

```ts
// packages/engine/src/constants.ts (bloque nuevo, detrás de ROUTE)
import type { RaceClass } from './routes/uci'
import type { Relieve } from './routes/grammar/geo'
import type { StageRole } from './routes/grammar/tour'
import type { SkeletonId } from './routes/grammar/skeletons'

type Rango = readonly [number, number]
type MinRango = readonly [number, number] // [mínimo, amplitud], como ROUTE.kmFlat
type PapelKm = 'llana' | 'media' | 'reina' | 'corta' | 'unDia'

export const ARCH = {
  motivo: {
    cota: { km: [2.5, 8.0] as Rango, g: [4, 7] as Rango },
    puerto: {
      km: [9.0, 25] as Rango,
      g: [5, 9] as Rango,
      rampaIrregular: { km: [0.3, 0.8] as Rango, g: [11, 13] as Rango },
    },
    muro: { km: [0.4, 3.0] as Rango, g: [8, 16] as Rango, gMax: 16 },
    sector: { km: [0.3, 3.7] as Rango, estrellas: [1, 5] as Rango },
    racimo: { sectores: [4, 10] as Rango, separacion: [2, 6] as Rango },
    circuito: { kmVuelta: [8, 30] as Rango, vueltas: [3, 18] as Rango },
    tendida: { km: [5, 30] as Rango, g: [1.5, 3.5] as Rango },
    descenso: { g: [-8, -3] as Rango, kmPorDesnivel: { perdidaPorKm: 55, kmMin: 2, kmMax: 10 } },
    enlace: { km: [1, 60] as Rango, ampMax: 2.4 },
    expuesto: { amp: 1.0 },
  },
  meta: {
    repecho: { km: [1, 2.9] as Rango, g: [4, 7] as Rango },
    muro: {
      km: [0.5, 2.2] as Rango,
      g: [8, 16] as Rango,
      aproxKm: 2,
      aproxAmp: 2.5,
      finishMuroMaxKm: 1.0,
    },
    altoCorto: { km: [3, 7] as Rango, g: [6, 11] as Rango },
    altoLargo: { km: [9, 22] as Rango, g: [6, 9] as Rango, gMaxSiMasDe17: 7 },
    cimaCerca: { valle: [1.2, 4.3] as Rango },
    descensoMeta: { valle: [5.7, 19.3] as Rango },
    valle: { valle: [20.7, 45] as Rango },
    sectorMeta: { aMeta: [1, 8] as Rango },
    unDiaUltimaCota: { km: [1.3, 4.2] as Rango, g: [7, 11] as Rango, aMeta: [3, 17] as Rango },
  },
  reina: {
    dPlusIncluyeRelleno: true,
    rellenoDplusPorKm: 5.5,
    escalaDificultades: [0.7, 1.4] as Rango,
    verdad: { puertoMetaMinKm: 9, dPlusMin: 3400 },
    subidaLejanaMin: 0.25,
    subidaLejanaKm: 30,
    blandaShare: { media: 0.25, montana: 0.25, alta: 0.1 } as Partial<Record<Relieve, number>>,
  },
  colocacion: {
    enlaceMinimo: 1.5,
    enlaceMinimoTotal: 0.12,
    bajadaTrasPuerto: [0.6, 0.9] as Rango,
    maxIntentos: 8,
  },
  veto: {
    margenClaseKm: 0.3,
    margenValleKm: 0.7,
    fallbackMaxShare: { calendario: 0, testPorEsqueleto: 0.005 },
    intentosP95: 3,
  },
  pancarta: { cimaMinKm: 1.5 },
  edicion: {
    activa: true,
    nivel: 1 as 0 | 1 | 2,
    kmJitter: 0.06,
    vueltasJitter: 0.5,
    motivoNuevo: 0.35,
  },
  km: {
    porClase: {/* tabla 12.7 */} as Record<Exclude<RaceClass, 'NC'>, Record<PapelKm, MinRango>> & {
      NC: { ruta: MinRango; sub23: MinRango }
    },
    maxPorClase: { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } as Record<RaceClass, number>,
  },
  pesoPorClase: {/* tabla 12.7 */} as Partial<
    Record<SkeletonId, Partial<Record<RaceClass, number>>>
  >,
  pesosComposicion: {/* tabla 12.8 */} as Record<Relieve, Partial<Record<StageRole, number>>>,
  bloques: {
    gv: {
      descansos: [9, 15] as Rango,
      reina: [15, 20] as Rango,
      primeraSemanaFinalesAlto: 1,
      maxAltaMontana: 7,
      minLlanasEntreBloques: 2,
    },
  },
  itinerario: { avance: 0.6, transicion: 0.4, prologoP: 0.25, cronoescaladaP: 0.08 },
  anticlon: { maxCorrelacion: 0.85 },
  arranque: { objetivoMs: 1500, techoMs: 2500, porTemporadaMs: 1000 },
} as const
```

Dos reglas sobre el bloque. Primera: ningún fichero de `routes/grammar/` lleva un número de intención que no esté aquí; `motifs.ts`, `place.ts`, `render.ts`, `veto.ts`, `edition.ts` y `tour.ts` importan `ARCH` y no escriben literales (el test de la sección 15, paso 3, hace `grep -n '[0-9]\.[0-9]' routes/grammar/*.ts` y exige que cada número que aparezca sea un índice, un `0.1` de redondeo o esté en un fichero de datos). Segunda: `ARCH` no contiene ningún umbral que el motor o el clasificador ya tengan; donde el generador necesita el mismo número que `routes/` o `STAGE`, lo importa (`ARCH.pancarta.cimaMinKm` se declara igual a `CLIMB_MIN_KM` y `ARCH.reina.subidaLejanaKm` igual a `STAGE.climbRaceKmToGo`, y el test de 12.14 lo comprueba para que no se separen en silencio).

### 12.2 `ARCH.motivo`: los rangos de cada motivo

| Constante                       | Valor                                     | Intención                                                                                                                                                                                                                                                                                                                                      | En qué se apoya                                                                                                                                                                                                                                                                         |
| ------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motivo.cota.km`                | [2,5; 8,0]                                | Cota de media montaña. El techo 8,0 deja 0,5 km al umbral `PASS_MIN_KM` 8,5 con el que `stageKindOf` llama reina a una etapa (`stageKind.ts` l. 62, l. 90); el suelo 2,5 la separa del muro, que es lo que `stageKindOf` lee como clásica hasta `WALL_MAX_KM` 3 (l. 60)                                                                        | hoy [3; 7] (`profileGen.ts` l. 247); Jaizkibel 5,6 y Arrate 7,4 (mapa 07 §3); medido: la cota más larga de `hillyUphill` llega hoy a 8,5 y 2 de 1.500 salen reina (mapa 01 §2.3 y §5.1)                                                                                                 |
| `motivo.cota.g`                 | [4; 7]                                    | La pendiente de una cota; el 7 no se cruza porque por encima el motor usa COL en vez de MON (`STAGE.wallMinGradient` 8, `constants.ts` l. 1594) y eso es un muro                                                                                                                                                                               | hoy [4,5; 6,5] (l. 248)                                                                                                                                                                                                                                                                 |
| `motivo.puerto.km`              | [9,0; 25]                                 | Puerto de alta montaña. Suelo 9,0 (0,5 sobre 8,5) para que un puerto sea reina por construcción y no por redondeo; techo 25 (Croix de Fer 29 es rareza). El hueco [8,0; 9,0] se asume: ninguna dificultad generada mide entre 8,0 y 9,0 km, y Ghisallo (8,6) sale como 9,0. Es un sacrificio documentado, no un defecto (sección 17, riesgo 6) | hoy intermedios [6; 11] y final [9; 15] con `escala` hasta 1,8 (l. 358-363, l. 374), lo que da cotas de 8,4 a 26,7 km (mapa 01 §2.5); el suelo 8,6 de `garantizaPuerto` (l. 387) tenía 0,1 de holgura y falla 1 de 1.500 por la diferencia entre `segment.km` y Σ tramos (mapa 01 §5.1) |
| `motivo.puerto.g`               | [5; 9]                                    | Galibier 5,1, Angliru 9,8 (recortado por zona: `GeoSignature.puerto.g` interseca)                                                                                                                                                                                                                                                              | mapa 07 §4.3 (Alpe 8,1, Loze 6, Angliru 9,8)                                                                                                                                                                                                                                            |
| `motivo.puerto.rampaIrregular`  | { km: [0,3; 0,8], g: [11; 13] }           | La rampa que abre brecha en un puerto `forma: 'irregular'`: SPEC §6.17 promete que el irregular abre ≥ 1,5× la brecha del regular; a ≥ 8 % el motor usa COL (`wallMinGradient` 8)                                                                                                                                                              | mapa 05 §1.4 (SPEC §6.17); hoy el ruido de `climb` es ±1,2 sobre la media (l. 78), sin rampa marcada                                                                                                                                                                                    |
| `motivo.muro.km`                | [0,4; 3,0]                                | Muro: techo 3 = `WALL_MAX_KM`; suelo 0,4 = `STAGE.finishClimbMinKm` (l. 3983), por debajo el motor no lo lee como cota                                                                                                                                                                                                                         | Kwaremont 2,2, Paterberg 0,36 (mapa 07 §1.3); hoy [1; 2,5] (l. 477)                                                                                                                                                                                                                     |
| `motivo.muro.g`                 | [8; 16]                                   | Pendiente media del muro; 8 = `wallMinGradient`, 16 = Sormano 15,8                                                                                                                                                                                                                                                                             | Koppenberg 11,6 (mapa 07 §1.3); hoy [8; 12] (l. 478)                                                                                                                                                                                                                                    |
| `motivo.muro.gMax`              | 16                                        | Tope de rampa DENTRO de un muro: `climb(rand, len, avg, { gMax })` recorta cada tramo. Hoy `climb` (l. 72-82) suma `prog·1,6 + U(−1,2; 1,2)` sin tope y saca rampas del 14,8 % en muros al 12 (mapa 01 §2.4); lo real es 15-26 % en puntas de 100 m que un tramo de 0,5 km no debe promediar                                                   | mapa 01 §2.4                                                                                                                                                                                                                                                                            |
| `motivo.sector.km`              | [0,3; 3,7]                                | Longitud de sector de adoquín                                                                                                                                                                                                                                                                                                                  | Roubaix 0,3-3,7 (mapa 07 §1.4); hoy [2; 4] (l. 496)                                                                                                                                                                                                                                     |
| `motivo.sector.estrellas`       | [1; 5]                                    | Dureza del sector; `paves` con `estrellas` es lo que el motor lee (`sample.ts`, mapa 03 §3)                                                                                                                                                                                                                                                    | hoy `[3, 5, 4]` fijos (l. 495)                                                                                                                                                                                                                                                          |
| `motivo.racimo.sectores`        | [4; 10]                                   | Sectores por racimo                                                                                                                                                                                                                                                                                                                            | Roubaix: 29-31 sectores en 3-6 racimos (mapa 07 §1.4)                                                                                                                                                                                                                                   |
| `motivo.racimo.separacion`      | [2; 6] km                                 | Asfalto entre sectores del mismo racimo: impide reagrupar; por debajo de 2 el motor los vería como uno                                                                                                                                                                                                                                         | mapa 07 §1.4                                                                                                                                                                                                                                                                            |
| `motivo.circuito.kmVuelta`      | [8; 30]                                   | Vuelta de circuito                                                                                                                                                                                                                                                                                                                             | Québec 12,6; Mundial 12-27 (mapa 07 §1.1)                                                                                                                                                                                                                                               |
| `motivo.circuito.vueltas`       | [3; 18]                                   | Número de vueltas; el rendido usa la MISMA semilla de detalle por vuelta (sección 8)                                                                                                                                                                                                                                                           | Montréal 17-18, Great Ocean 4 (mapa 07 §1.1)                                                                                                                                                                                                                                            |
| `motivo.tendida.km` / `.g`      | [5; 30] / [1,5; 3,5]                      | Falso llano largo tipado `llano` con tramos: desgasta, no selecciona y no suma `kmSubida`, porque el motor cuenta por tipo (mapa 03 §4.1) y `sample.ts` l. 32-44 lee la pendiente del tramo                                                                                                                                                    | Sanremo (Turchino), Almería (mapa 07 §1.5)                                                                                                                                                                                                                                              |
| `motivo.descenso.g`             | [−8; −3]                                  | Pendiente de bajada; hoy `descent` (l. 85-93) no baja de −2 y usa 5 o 6 de media (l. 257, l. 396)                                                                                                                                                                                                                                              | `MAX_DESCENT_GRADIENT` −12 de `featureProfile.ts` (mapa 01 §6) es el tope duro                                                                                                                                                                                                          |
| `motivo.descenso.kmPorDesnivel` | { perdidaPorKm: 55, kmMin: 2, kmMax: 10 } | Bajada canónica tras un puerto: `clamp(len·g·10/55, 2, 10)` km, es decir, lo subido se pierde a 55 m por km. Es la regla que hoy solo tiene `mountainClassicSegments` (l. 467); las demás formas bajan `U(3; 5)` o `U(5; 8)` fijos (l. 257, l. 396)                                                                                            | `profileGen.ts` l. 467; `featureProfile.ts` baja el 85 % de lo subido (mapa 01 §6)                                                                                                                                                                                                      |
| `motivo.enlace.km`              | [1; 60]                                   | Un enlace (relleno) mide entre 1 y 60 km; por debajo de 1 no hay enlace (dos dificultades se tocan: `colocacion.enlaceMinimo`), por encima de 60 el esqueleto pone otro motivo                                                                                                                                                                 | hoy `rolling` trocea en `U(3; 6)` km (l. 102) y una llana de 215 km es un solo enlace de 215                                                                                                                                                                                            |
| `motivo.enlace.ampMax`          | 2,4                                       | El relleno nunca alcanza el 3 % que `finish.ts` lee como cota (`STAGE.finishClimbMinGradient` 3, l. 3977): así un enlace no fabrica un final de escaladores. Hoy `rolling` «bumpy» llega a 3,2 (l. 105)                                                                                                                                        | `constants.ts` l. 3977; `GeoSignature.amplitud` es el valor por zona y este es su tope                                                                                                                                                                                                  |
| `motivo.expuesto.amp`           | 1,0                                       | Pólder, desierto, meseta: llano abierto de amplitud fija. Da unos 300 m de D+ en 200 km, que es Brugge-De Panne                                                                                                                                                                                                                                | mapa 07 §3 (pólder); `GeoSignature.amplitud` del pólder [0,4; 0,9]                                                                                                                                                                                                                      |

### 12.3 `ARCH.meta`: los nueve finales

Todas las cifras de valle llevan 0,7 km de holgura sobre los cortes 0,5 / 5 / 20 de `FINAL_KIND_CUTS` (`finalKind.ts` l. 30). La razón es medida: los rangos de `valleyKmFor` (`profileGen.ts` l. 330-335) están alineados con los cortes SIN holgura y `normalize` estira un valle de 20 a 20,3, con lo que 4 de 6.000 reinas forzadas cambian de cubeta (mapa 01 §2.5). El 0,7 y no 0,5 es porque `auto()` redondea el km de la pancarta al entero (`Math.round(cum)`, mapa 01 §5.2), y ese redondeo puede desplazar hasta 0,5 km la distancia medida; 0,2 más cubre el residuo de `normalizeEnlaces`.

| Constante                 | Valor                                                                           | Intención                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | En qué se apoya                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta.repecho`            | { km: [1; 2,9], g: [4; 7] }                                                     | Cota corta y suave en meta: `finishType` la lee `puncheur`, nunca `alto`, porque queda bajo `STAGE.finishAltoMinKm` 3 (l. 3989)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `constants.ts` l. 3989                                                                                                                                                       |
| `meta.muro`               | { km: [0,5; 2,2], g: [8; 16], aproxKm: 2, aproxAmp: 2,5, finishMuroMaxKm: 1,0 } | Muro de meta. Con ≤ 1,0 km `finishType` dice `muro` (`STAGE.muroMaxKm` 1, l. 4462; `muroMinGradient` 8, l. 4463); por encima de 1,0 y hasta 2,2 dice `puncheur`, y la tabla de `MetaKind` de la sección 4 lo declara así (Huy 1,3 y San Luca 2,1 son `puncheur` en el motor y «es correcto», `finish.ts` l. 147-148). `aproxKm` 2 a amplitud ≤ 2,5 es la aproximación diseñada contra `deriveFinishTerrain`: `finishClimbGapBlocks` 5 (l. 3980) tolera 500 m de rellano dentro de una cota, y un enlace ondulado pegado al muro lo fundiría con él o lo partiría; a 2,5 % ningún bloque de la aproximación llega al 3 % que cuenta como subida | `constants.ts` l. 3977-3980, l. 4462-4463; mapa 07 §1.2 (Huy 1,3 al 9,6, San Luca 2,1 al 10,8); `routeCensus` mide `muro` ≥ 1 % y `puncheur` ≥ 8 % del calendario (V11, V16) |
| `meta.altoCorto`          | { km: [3; 7], g: [6; 11] }                                                      | Final en alto corto: `alto` para `finalKindOf` (0 km tras la cota) y para `finishType` (≥ `finishAltoMinKm` 3); ≤ 7 para no rozar la puerta de reina                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Planche 5,9 × 8,5, Xorret 3,9 × 11,4, Tre Cime 7,2 (mapa 07 §4.3); hoy `hillyUphill` [4; 7,5] al [5; 7,5] (l. 282-283)                                                       |
| `meta.altoLargo`          | { km: [9; 22], g: [6; 9], gMaxSiMasDe17: 7 }                                    | Final en alto de reina: el 70-80 % de los finales en alto de gran vuelta miden 8-22 km al 6,5-9 %; por encima de 17 km la pendiente media se recorta a 7 (Loze 28,1 × 6, Bondone 21,4 × 6,7: los largos son suaves). Suelo 9 por `PASS_MIN_KM` con 0,5 de holgura                                                                                                                                                                                                                                                                                                                                                                              | mapa 07 §4.3; hoy [9; 15] al [7,5; 9,5] (l. 359-360)                                                                                                                         |
| `meta.cimaCerca.valle`    | [1,2; 4,3]                                                                      | Se corona y se baja a meta: `cima_cerca` de `finalKindOf` (0,5 < tras ≤ 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | hoy [1,5; 5] (l. 332); 1 de 1.500 cruzaba a `valle_corto` (mapa 01 §2.5)                                                                                                     |
| `meta.descensoMeta.valle` | [5,7; 19,3]                                                                     | `valle_corto` (5 < tras ≤ 20)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | hoy [6; 20] (l. 333); 3 de 1.500 cruzaban a `valle_largo`                                                                                                                    |
| `meta.valle.valle`        | [20,7; 45]                                                                      | `valle_largo` (> 20)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | hoy [22; 45] (l. 334)                                                                                                                                                        |
| `meta.sectorMeta.aMeta`   | [1; 8]                                                                          | Último sector de adoquín a [1; 8] km de meta; hoy cae a ~40 km porque `split` reparte el relleno en cuatro (mapa 01 §2.7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Carrefour de l'Arbre a 17, Roubaix (velódromo) a 1,1 (mapa 07 §1.4)                                                                                                          |
| `meta.unDiaUltimaCota`    | { km: [1,3; 4,2], g: [7; 11], aMeta: [3; 17] }                                  | El caso v40 escrito en positivo: en el WorldTour de un día la última subida mide 0,4-4,2 km y corona a 0-17 km de meta; solo muere arriba si es muro (`meta.muro`). Es el rango que V5 hace cumplir (sección 9)                                                                                                                                                                                                                                                                                                                                                                                                                                | mapa 07 §4.3 (Roche-aux-Faucons 1,3 a 13,5; Civiglio 4,2; Colle Aperto 1,2 a 3); hoy `mountainClassicSegments` [4; 8] al [7,5; 10] con run-in [13; 22] (l. 451-453)          |

### 12.4 `ARCH.reina`: el desnivel, la verdad y la cola baja

| Constante                   | Valor                                                  | Intención                                                                                                                                                                                                                                                                                                                                                                                                        | En qué se apoya                                                                                                                  |
| --------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `reina.dPlusIncluyeRelleno` | `true`                                                 | `Skeleton.dPlus` es el desnivel TOTAL, relleno incluido, porque es lo que `calendarQueens::desnivelDe` (l. 55-59) mide sumando bloques `subida`. Hoy el objetivo se persigue solo con los puertos (`dPlusOf`, `profileGen.ts` l. 365) y el relleno añade de media 1.017 m sobre 2.840 en una reina de 175 km, con lo que `BANDAS_DESNIVEL` se lee sobre otra cifra que la que el generador persiguió             | mapa 01 §1 y §2.5; el censo imprime el delta `dPlus` contra `dPlusBloques` (esperado < 5 %)                                      |
| `reina.rellenoDplusPorKm`   | 5,5 m/km                                               | Estimación del D+ del relleno para cuadrar el objetivo sin llamar a `sampleProfile`: a 5,5 m/km, 100 km de enlace son 550 m. Es el centro de lo medido (661 a 1.413 m en llanas de 130 a 215 km, es decir, 5,1 a 6,6 m/km) y se recalibra en el paso 3 del plan con `dPlusDe` sobre 300 enlaces por zona                                                                                                         | mapa 01 §1; con `amplitud` por zona el valor real varía y por eso la verificación final es `dPlusDe(profile)` y no la estimación |
| `reina.escalaDificultades`  | [0,7; 1,4]                                             | Cuánto se alargan o acortan las dificultades no firma para cuadrar el desnivel. Hoy [0,55; 1,8] (l. 374), y con 1,8 un final de 15 km llega a 27 (mapa 01 §2.5); con 0,55 un puerto de 9 se quedaba en 5 y la reina dejaba de serlo (l. 380-386). A [0,7; 1,4] ningún puerto sale del rango de `motivo.puerto` si entró en él                                                                                    | `profileGen.ts` l. 374, l. 387                                                                                                   |
| `reina.verdad`              | { puertoMetaMinKm: 9, dPlusMin: 3400 }                 | V8a: una reina lo es por un puerto ≥ 9 km en meta, o dos puertos ≥ 9 km, o D+ ≥ 3.400 m (200 sobre `QUEEN_MIN_CLIMB_METRES` 3.200, `stageKind.ts` l. 64). No aplica a `et_reina_blanda`                                                                                                                                                                                                                          | sección 9; `epics.md` E3 (`reina-150`: «media montaña con la etiqueta cambiada»)                                                 |
| `reina.subidaLejanaMin`     | 0,25                                                   | V8b: al menos el 25 % de los km de subida a más de `subidaLejanaKm` de meta. Es la variable que separó `reina-150` de las reales: 0 % contra 6-38 % (mapa 04 §3.2), con la fuga ganando el 27-30 % en el banco y el 3,3 % en las reinas de verdad (mapa 04 §3.3). Aplica a TODA reina, blanda incluida                                                                                                           | mapa 04 §3.2-3.3                                                                                                                 |
| `reina.subidaLejanaKm`      | 30 (= `STAGE.climbRaceKmToGo`, `constants.ts` l. 3521) | Los 30 km son los del motor: solo se ataca un puerto si quedan ≤ 30 km o es final en alto (mapa 03 §4.2). Una subida a más de 30 km se sube a tempo y desgasta sin seleccionar, que es lo que le faltaba a `reina-150`. Se declara como referencia al motor y el test 12.10 falla si se separan                                                                                                                  | `constants.ts` l. 3521; mapa 03 §4.2                                                                                             |
| `reina.blandaShare`         | { media: 0,25; montana: 0,25; alta: 0,10 }             | Fracción de las reinas de una vuelta que son `et_reina_blanda` (D+ [1.500; 2.500] con relleno) según el `Relieve` de la zona. Es la cola baja de desnivel que `calendarQueens.test.ts` l. 62-63 exige («la banda de <1.500 m NO se queda vacía», comentario de `constants.ts` l. 1162-1167), decidida en el diseño y no en el test, como pide el mapa 06 §6.3. Sustituye al 60/40 de `ROUTE.queenHighDplusShare` | `calendarQueens.ts` l. 90-95 (`BANDAS_DESNIVEL`); mapa 06 §6.3; D6 (sección 18) vigila la cubeta tras el paso 9                  |

### 12.5 `ARCH.colocacion`, `ARCH.veto` y `ARCH.pancarta`

| Constante                      | Valor                                        | Intención                                                                                                                                                                                                                                                                           | En qué se apoya                                                                                                                  |
| ------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `colocacion.enlaceMinimo`      | 1,5 km                                       | Dos dificultades nunca se tocan salvo dentro de una `cadena`: `finishClimbGapBlocks` 5 son 0,5 km de rellano tolerado dentro de una cota, y con menos de 1,5 el motor fundiría dos muros en uno; margen ×3                                                                          | `constants.ts` l. 3980; Kwaremont-Paterberg, 1,7 km entre cimas, es el par más pegado del corpus (`classicRoutes.ts` l. 451-452) |
| `colocacion.enlaceMinimoTotal` | 0,12                                         | Fracción mínima de la etapa que es enlace; si las dificultades no dejan el 12 %, V10 («cabe») rechaza. Hoy 0,15 en reina (l. 390) y 0,35 / 0,3 / 0,5 en las demás formas (mapa 01 §2)                                                                                               | `profileGen.ts` l. 390; Catalunya e4 real, 38 de los últimos 50 km en puerto, es el extremo (`realQueens.ts` l. 75)              |
| `colocacion.bajadaTrasPuerto`  | [0,6; 0,9] × km del puerto                   | Lo que se baja de lo que se subió cuando el esqueleto no fija la bajada; `featureProfile.ts` baja el 85 % (mapa 01 §6)                                                                                                                                                              | mapa 01 §6; `motivo.descenso.kmPorDesnivel` fija la longitud por desnivel y este factor la acota por longitud                    |
| `colocacion.maxIntentos`       | 8                                            | Reintentos (`mot`, `pos`, `dib` con `i{intento}`) antes de caer a la plantilla canónica con `degradado: true`. Se mide el p95 en el paso 4 y, si sobra, se recorta                                                                                                                  | coste: 8 renderizados de geometría pura, sin `sampleProfile` (sección 14)                                                        |
| `veto.margenClaseKm`           | 0,3                                          | `garantizaClase` lleva el puerto que decide a 8,5 + 0,3 (reina) o 8,5 − 0,3 (media) compensando en el enlace más largo. El 0,3 cubre la diferencia entre `segment.km` y Σ tramos redondeados a 0,1 (hasta 0,2 medidos: `mountain 175 semilla-167` con segmento 8,6 y tramos 8,4)    | mapa 01 §5.1: 3 de 1.500 clasificaciones cruzadas en el borde de 8,5                                                             |
| `veto.margenValleKm`           | 0,7                                          | La misma red sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` cuando `garantizaClase` recorta un valle; es la holgura de 12.3 hecha regla                                                                                                                                               | mapa 01 §2.5 (4 de 6.000)                                                                                                        |
| `veto.fallbackMaxShare`        | { calendario: 0, testPorEsqueleto: 0,005 }   | Cero etapas degradadas en las 1.418 del calendario (un fallback es un defecto de rango, no una salida válida) y ≤ 0,5 % en el test de 300 semillas × zona compatible por esqueleto                                                                                                  | criterio de diseño; `routeCensus` cuenta `degradado`                                                                             |
| `veto.intentosP95`             | 3                                            | Si el p95 de `intentos` por esqueleto supera 3 en el paso 4, se estrechan los rangos del esqueleto antes que subir `maxIntentos`: un esqueleto que necesita más de tres intentos está mal acotado                                                                                   | sección 17, riesgo 9                                                                                                             |
| `pancarta.cimaMinKm`           | 1,5 (= `CLIMB_MIN_KM`, `finalKind.ts` l. 33) | `emitirPancartas` pone `cima` al final de todo `puerto` ≥ 1,5 km, SIEMPRE en el último `puerto` de la etapa (así `lastClimbKm` ve el muro de meta, mapa 01 §5.2) y una por paso de cota ≥ 1,5 en un circuito. Un muro de 400 m no es un GPM: no puntúa ni cuenta para `finalKindOf` | `finalKind.ts` l. 33, l. 46-57; sección 8                                                                                        |

### 12.6 `ARCH.edicion`: lo que mueve una temporada

Los valores por defecto son los de la decisión D7 del dueño (sección 18): activa, nivel 1.

| Constante               | Valor  | Intención                                                                                                                                                                                                                                                                                   | En qué se apoya                                                                                          |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `edicion.activa`        | `true` | Interruptor: en `false`, `calendarForSeason(s)` devuelve para toda `s` lo mismo que para `BASE_SEASON` 0 (calendario fijo). Existe para el banco y para el dueño, no para producción                                                                                                        | sección 10                                                                                               |
| `edicion.nivel`         | 1      | 0 fija; 1 jitter acotado (por defecto); 2 rotación declarada por `Skeleton.alternativas` elegida por `season % n` (Como/Bérgamo, Angliru/Lagos) donde el esqueleto la declare                                                                                                               | sección 10; D7                                                                                           |
| `edicion.kmJitter`      | 0,06   | ± 6 % de km entre ediciones para carreras generadas; NUNCA en etapas de edición real (el km es contrato al 0,1, `calendar.test.ts` l. 162-174). Lo real se mueve ± 1-2 % (Sanremo 289-294, Ronde 268-273) y hasta 7 km en Slovenia (mapa 05 §6); se deja más ancho para carreras inventadas | mapa 07 §1.6; mapa 05 §6                                                                                 |
| `edicion.vueltasJitter` | 0,5    | p de que un `circuito` cambie ± 1 vuelta                                                                                                                                                                                                                                                    | Montréal 17-18 (mapa 07 §1.1)                                                                            |
| `edicion.motivoNuevo`   | 0,35   | p de que un hueco opcional (`Slot.n[0] === 0`) aparezca o desaparezca                                                                                                                                                                                                                       | juicio: una carrera cambia una cosa al año (Lombardía 3 de 4 ediciones con cota de remate, mapa 07 §1.6) |

### 12.7 `ARCH.km` y `ARCH.pesoPorClase`: la clase manda

`ARCH.km.porClase` es una tabla `[min, rango]` por clase y papel, no un factor sobre un rango único: un factor 0,75 sobre `kmFlat` [165, 30] daría [124; 146] en una .2 y lo real es 100-160 con etapas de 100 (mapa 07 §4.1 y §2.3). Es la tabla de banco §7.3, tomada del mapa 07 §4.1. El papel se reduce a cinco columnas: `llana` (`llana`, `llana_viento`), `media` (`media`, `media_alto`, `media_muro`), `reina` (`reina_alto`, `reina_valle`, `reina_encadenada`), `corta` (`montana_corta`) y `unDia`; `cri` sigue con `ROUTE.itt*`, y `prologo` y `cronoescalada` toman `Skeleton.km` ([3; 8] y [8; 25], sección 5) porque su longitud es del esqueleto y no de la clase. La última etapa sigue × `ROUTE.lastStageKmFactor` 0,85.

| Clase | `llana`                                                                                            | `media`   | `reina`   | `corta`   | `unDia`   |
| ----- | -------------------------------------------------------------------------------------------------- | --------- | --------- | --------- | --------- |
| WT    | [160, 30]                                                                                          | [150, 30] | [140, 40] | [120, 20] | [200, 60] |
| Pro   | [150, 30]                                                                                          | [140, 30] | [140, 35] | [120, 20] | [180, 50] |
| .1    | [140, 30]                                                                                          | [135, 30] | [135, 35] | [115, 20] | [170, 40] |
| .2    | [110, 40]                                                                                          | [110, 40] | [115, 40] | [100, 20] | [140, 40] |
| NC    | `ruta` [180, 60] · `sub23` [140, 40] (la fila `championshipCategory` de `calendar.ts` l. 70 elige) |           |           |           |           |

Consecuencias que el censo mide: las 142 carreras de un día con el 210 por defecto de `RaceRow` (`row.km ?? 210`, `calendar.ts` l. 917, mapa 02) pasan a sortear su km con `firma|raceId` dentro de la fila `unDia` de su clase desde la temporada 0, y las 36 filas con `km` explícito lo conservan (Sanremo 294 va por fila); el p90 de km en .2 queda ≤ 170, y desaparecen las etapas de 165 a 195 km en una .2 (hoy `kmFlat` no distingue clase, l. 1240).

`ARCH.km.maxPorClase` es `{ WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 }`: el techo que V13 comprueba tras el jitter. Son las cifras del mapa 07 §4.1 («techo UCI 280 salvo excepciones como Sanremo» para WT, «200 para .1, 240 para Pro; cifra a confirmar») y del §2.3 («máximo de una en torno a 200 km» en .2); WT se pone a 260 y no a 280 porque la única de un día generada por encima de 260 sería una rareza sin nombre (las reales por encima van por `km` de fila). Es la decisión D9 del dueño (sección 18): se codifican estas y el comentario del bloque dice «a confirmar con el art. 2.6 del reglamento UCI».

`ARCH.pesoPorClase` multiplica `Skeleton.pesoBase × geo.pesos` en la elección de esqueleto (`arch|raceId`, sección 5). La tabla es `Partial<Record<SkeletonId, Partial<Record<RaceClass, number>>>>` y toda entrada ausente vale 1; solo se escriben las filas que se apartan de 1. La sección 5 imprime la tabla completa; las filas fijadas aquí son de diseño y no se recalibran:

| Esqueleto                     | WT  | Pro | .1   | .2  | NC  | Intención                                                                                                                                                                                 |
| ----------------------------- | --- | --- | ---- | --- | --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ud_montana_alto`             | 0   | 0   | 0,02 | 0   | 0   | La rareza de Ventoux y Mercan'Tour: tres o cuatro carreras .1 entre doscientas y ninguna WT (mapa 07 §1.2 y §4.3); requiere además `finalesAlto: 'largo'`. D1 del dueño puede ponerlo a 0 |
| `ud_adoquin`                  | 1   | 1   | 1    | 1   | 0   | En .2 solo existe en zonas con `adoquin ≥ 2`, y eso lo hace `Skeleton.requiere` (sección 5): con la tabla numérica no hace falta un 0 condicional                                         |
| `ud_criterium`                | 0   | 0   | 0    | 0   | 0   | Existe en el catálogo y no se sortea: D5 del dueño (mapa 07 §1.7: 40-100 km, 0-300 m, no puntuable)                                                                                       |
| `nc_ruta`, `nc_crono`         | 0   | 0   | 0    | 0   | 1   | Solo los 532 campeonatos nacionales (`nationalChampionships`)                                                                                                                             |
| todo `ud_*` y `et_*` restante | 1   | 1   | 1    | 1   | 0   | Un nacional nunca recibe un esqueleto de carrera de equipos                                                                                                                               |

### 12.8 `ARCH.pesosComposicion`, `ARCH.bloques` y `ARCH.itinerario`: la vuelta

`ARCH.pesosComposicion` sustituye a `ROUTE.mixWeights` (l. 1224-1228: cuatro papeles por `MixTerrain`) por nueve papeles indexados por el `Relieve` de la zona de meta de cada etapa (tabla de arquitectura §7.3). `cri`, `prologo` y `cronoescalada` no están en la tabla: la crono la siguen decidiendo `ROUTE.itt*` y las dos nuevas sus `p` de `ARCH.itinerario`. Cuando la zona tiene `viento < 2`, el peso de `llana_viento` se suma al de `llana`.

| `Relieve`  | `llana` | `llana_viento` | `media` | `media_alto` | `media_muro` | `reina_alto` | `reina_valle` | `reina_encadenada` | `montana_corta` |
| ---------- | ------- | -------------- | ------- | ------------ | ------------ | ------------ | ------------- | ------------------ | --------------- |
| `llano`    | 0,50    | 0,25           | 0,15    | 0,07         | 0,03         | 0            | 0             | 0                  | 0               |
| `ondulado` | 0,40    | 0,10           | 0,25    | 0,15         | 0,10         | 0            | 0             | 0                  | 0               |
| `media`    | 0,28    | 0,04           | 0,28    | 0,18         | 0,10         | 0,06         | 0,04          | 0                  | 0,02            |
| `montana`  | 0,20    | 0,02           | 0,22    | 0,14         | 0,05         | 0,16         | 0,12          | 0,04               | 0,05            |
| `alta`     | 0,16    | 0              | 0,18    | 0,10         | 0,02         | 0,22         | 0,14          | 0,10               | 0,08            |

Lo que cambia respecto de hoy y el censo mide: `mixWeights.mountain` da un 40 % de reinas (l. 1227) y una vuelta de 21 generada en `montana`/`alta` pasa a 4-6 etapas de alta montaña repartidas en cuatro formas, que es lo que llevan Tour y Giro (mapa 07 §2.1). Las cuatro garantías de `mixRoles` (`calendar.ts` l. 457-519: crono, última decisiva, `selectiveMinFraction`, `uphillFinishMinStages`) siguen leyendo `ROUTE` y se aplican encima (sección 7).

| Constante                             | Valor    | Intención                                                                                                                                                   | En qué se apoya                                             |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `bloques.gv.descansos`                | [9, 15]  | Descansos tras las etapas 9 y 15 de una gran vuelta generada                                                                                                | mapa 07 §2.1 reglas 1-4                                     |
| `bloques.gv.reina`                    | [15; 20] | La reina cae en la tercera semana                                                                                                                           | mapa 07 §2.1                                                |
| `bloques.gv.primeraSemanaFinalesAlto` | 1        | ≤ 1 final en alto y ninguna reina en la primera semana                                                                                                      | mapa 07 §2.1                                                |
| `bloques.gv.maxAltaMontana`           | 7        | Tope de etapas de alta montaña                                                                                                                              | Tour y Giro 4-6 con final en alto (mapa 07 §2.1)            |
| `bloques.gv.minLlanasEntreBloques`    | 2        | Entre dos bloques de montaña van al menos dos llanas                                                                                                        | mapa 07 §2.1                                                |
| `itinerario.avance`                   | 0,6      | p de avanzar a la zona siguiente de `TERRITORIOS[country].ruta` en cada etapa; el 0,4 de quedarse es lo que forma bloques de montaña en la misma cordillera | sección 7; mapa 07 §2.1                                     |
| `itinerario.transicion`               | 0,4      | Fracción inicial de una etapa de transición que se dibuja con la `amplitud` de la zona `desde`; el 60 % restante con la de la zona de meta                  | sección 7                                                   |
| `itinerario.prologoP`                 | 0,25     | p de prólogo en la etapa 1 de vueltas ≥ 6 (`et_prologo`, [3; 8] km); D3 del dueño puede ponerlo a 0                                                         | mapa 07 §2.2 (Romandía, Dauphiné, Suiza; prólogo de 3-8 km) |
| `itinerario.cronoescaladaP`           | 0,08     | p de cronoescalada en vueltas con `cordillera`; D3                                                                                                          | mapa 07 §2.1 (existe y es rara: Peyragudes 2025)            |

### 12.9 `ARCH.anticlon` y `ARCH.arranque`

| Constante                 | Valor                                       | Intención                                                                                                                                                                                                                                                                                                                                                                                                        | En qué se apoya                            |
| ------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `anticlon.maxCorrelacion` | 0,85 (provisional; se calibra en el paso 9) | V12: dos etapas generadas del mismo esqueleto en carreras distintas no correlacionan (huella `g` por km de `RouteStats.huella`) por encima de esto. El valor definitivo es el p90 de `profileCorrelation` sobre pares reales de la misma familia (Ronde/E3, Amstel/Brabant, Lombardía/Lieja) medidos con `scripts/medir-real.mjs`; hasta entonces 0,85 y el censo imprime la mediana (< 0,8) y el máximo (< 0,9) | sección 9 y 13; `propuestas/datos.md` §1.4 |
| `arranque.objetivoMs`     | 1.500                                       | Carga de `SEASON_CALENDAR` (módulo `routes/calendar.js`) medida por `scripts/medir-arranque.mjs` y exigida por `routes/arranque.test.ts`. Hoy 578 ms (`juicios/motor.md` §1); la gramática añade ≤ 12 motivos y hasta 8 intentos por etapa sin `sampleProfile` (0,40 ms por etapa era una pasada de `sampleProfile` más lecturas, así que el techo deja margen ×2,6 sobre hoy)                                   | `juicios/motor.md` §1; sección 14          |
| `arranque.techoMs`        | 2.500                                       | Si se supera, el calendario se construye perezoso por carrera (decisión tomada, no condicional)                                                                                                                                                                                                                                                                                                                  | sección 14                                 |
| `arranque.porTemporadaMs` | 1.000                                       | Coste máximo de una temporada adicional (`calendarForSeason(s)` memoizada por `Map`)                                                                                                                                                                                                                                                                                                                             | sección 14                                 |

### 12.10 Lo que se retira de `ROUTE` y qué lo sustituye

Se retira en el paso 8 del plan, en el mismo cambio que borra los ocho `xxxSegments`, y con esta nota en `docs/balance.md` «v61 · El generador es una gramática» (§1, tabla «constantes retiradas y sus sustitutas», con el valor de hoy al lado, como pide `Claude.md` l. 12):

| Clave de `ROUTE` (l.)                                      | Valor de hoy                                                                              | Quién la usaba                  | La sustituye                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `queenDplusRange` (l. 1167)                                | {2.600, 4.600} en log                                                                     | `mountainSegments` (brazo alto) | `Skeleton.dPlus` por esqueleto de reina (sección 5), total con relleno (`ARCH.reina.dPlusIncluyeRelleno`)                                                                                                                                                                                                                   |
| `queenHighDplusShare` (l. 1169)                            | 0,6                                                                                       | idem                            | `ARCH.reina.blandaShare` por `Relieve`                                                                                                                                                                                                                                                                                      |
| `queenLowDplusRange` (l. 1170)                             | {1.200, 2.500} lineal                                                                     | idem                            | `et_reina_blanda` con D+ [1.500; 2.500]                                                                                                                                                                                                                                                                                     |
| `queenFinalMix` (l. 1185)                                  | alto 0,45 · cima_cerca 0,20 · valle_corto 0,25 · valle_largo 0,10                         | `sampleFinalKind`               | El reparto de `finalKindOf` deja de ser parámetro y pasa a ser CONSECUENCIA de los pesos de los cuatro esqueletos de reina (`et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`); como MEDIDA sobrevive en `ROUTE_CENSUS_TARGETS` (cada cubeta ≥ 5 %, `alto` en [0,35; 0,55], sección 13) |
| `mixWeights` (l. 1224-1228)                                | flat [0,58 0,27 0,10 0,05] · hilly [0,30 0,36 0,19 0,15] · mountain [0,16 0,26 0,18 0,40] | `mixRoles`                      | `ARCH.pesosComposicion` (12.8)                                                                                                                                                                                                                                                                                              |
| `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit` (l. 1240-1243) | [165, 30], [160, 30], [150, 30], [145, 35]                                                | `mixKm`                         | `ARCH.km.porClase` (12.7)                                                                                                                                                                                                                                                                                                   |

El comentario de `ROUTE` l. 1152-1166 (el 60/40 «no es un adorno» porque `calendarQueens.test.ts` afirma que la banda de < 1.500 m no se queda vacía) se traslada, reescrito, al comentario de `ARCH.reina.blandaShare`: la cola baja sigue existiendo, pero la decide una forma de reina con peso y no una tirada.

### 12.11 Lo que se conserva de `ROUTE` y todo `RELIEF`

Se conservan tal cual, con su línea y su lector: `ittMinStages` 3, `ittChanceShort` 0,6, `ittChanceWeek` 0,9, `ittWeekStages` 6, `ittAlwaysFlatStages` 4, `ittEarlierChance` 0,35, `ittSecondStages` 15, `ittSecondPosition` 0,35 (l. 1189-1203, `mixRoles`); `ittKmMin` 14, `ittKmRange` 12, `ittLongStages` 10, `ittLongKmMin` 26, `ittLongKmRange` 18 (l. 1205-1209, `mixKm`, que pasa a `kmDe` para `cri`); `lastDecisiveChance` {0,3; 0,55; 0,85}, `grandTourStages` 15, `grandTourLastDecisiveFactor` 0,4, `lastSummitShare` {0; 0,35; 0,8} (l. 1215-1220, última etapa); `selectiveMinFraction` {0,35; 0,55; 0,7} y `uphillFinishMinStages` 4 (l. 1232-1235, garantías); `lastStageKmFactor` 0,85 (l. 1245). Son composición del calendario, no perfil (mapa 01 §3), y `composeTour` los lee por el mismo nombre para que `calendar.test.ts` l. 184-277 siga en verde sin re-sellar (sección 7). Las claves de `lastDecisiveChance` y `lastSummitShare` siguen indexadas por `MixTerrain` (`flat`/`hilly`/`mountain`), que en E1 sobrevive solo como el `terrain` de la fila de la carrera (`RouteTerrain` de `featureProfile.ts` l. 21) y se usa como sesgo, nunca como orden (sección 3).

`RELIEF` entero (l. 1115-1134: `rollingMinGradient` 0,4, `rollingGradientRange` 2,4, `rollingMinKm` 1,4, `rollingKmRange` 2,2, `rollingAmplitude` por terreno de 0,55 a 1,15 y `rollingAmplitudeDefault` 1,0) no se toca porque es de `featureProfile.ts` y solo de él: es el relleno de las 177 etapas reales con rasgos, calibrado contra el desnivel publicado (Roubaix ~1.450, Ronde ~2.500, Lombardía ~4.400, Sanremo ~2.000; comentario l. 1110-1114) y sellado por la huella FNV de `realFingerprint.test.ts` (sección 11). Que existan dos rellenos (`rollingFill` con `RELIEF` para lo real, `enlace` con `GeoSignature.amplitud` para lo generado) es una deuda declarada en la sección 17 (riesgo 7), no un descuido: unificarlos movería `erosion.longClassicFresh` y `hardestClassicFresh`, que se midieron sobre esos perfiles.

### 12.12 Los literales de `profileGen.ts` que migran

Cada literal del cuerpo de las funciones, con su valor de hoy, la constante que lo recoge y si el valor cambia. Las funciones desaparecen en el paso 8; hasta entonces viven en `routes/grammar/legacy.ts` con estos mismos literales, para que la tabla pareada del paso 1 dé «igual dentro del ruido» (sección 15).

| Línea                   | Literal de hoy                                                 | Función                   | Constante nueva                                                                                                   | Cambia                                                                                          |
| ----------------------- | -------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 78                      | `prog·1,6 + U(−1,2; 1,2)`, sin tope                            | `climb`                   | `motivo.muro.gMax` 16 (solo se pasa en muros; en puertos `climb` sigue sin tope y V15 acota todo tramo a g ≤ 20)  | sí: tope                                                                                        |
| 90                      | `−max(2, avg ± 1,5)`                                           | `descent`                 | `motivo.descenso.g` [−8; −3]                                                                                      | sí: suelo −3                                                                                    |
| 102, 105                | trozo `U(3; 6)`; `amp` 1,8 llano / 3,2 bumpy                   | `rolling`                 | `GeoSignature.amplitud` con tope `motivo.enlace.ampMax` 2,4; `rolling(rand, km, amp, pRompepiernas = 0)`          | sí: 3,2 → ≤ 2,4                                                                                 |
| 119                     | `rompepiernas` con p 0,35 en bumpy                             | `rolling`                 | ninguna: nunca se emite (`sample.ts` l. 100-101 lo colapsa a g 1,5 e ignora tramos, mapa 03)                      | sí: 0                                                                                           |
| 247-248                 | cota [3; 7] al [4,5; 6,5]                                      | `hillySegments`           | `motivo.cota.km` [2,5; 8,0] / `.g` [4; 7]                                                                         | sí                                                                                              |
| 257                     | bajada `U(3; 5)` al 5                                          | `hillySegments`           | `motivo.descenso.kmPorDesnivel`                                                                                   | sí                                                                                              |
| 276-283                 | final [4; 7,5] al [5; 7,5]; tope 8,4                           | `hillyUphillSegments`     | `meta.altoCorto` [3; 7] al [6; 11]; `veto.margenClaseKm` 0,3                                                      | sí                                                                                              |
| 330-335                 | valles [1,5; 5], [6; 20], [22; 45]                             | `valleyKmFor`             | `meta.cimaCerca` [1,2; 4,3], `meta.descensoMeta` [5,7; 19,3], `meta.valle` [20,7; 45]                             | sí: holgura 0,7                                                                                 |
| 358-363                 | intermedios [6; 11] al [5,5; 7,5]; final [9; 15] al [7,5; 9,5] | `mountainSegments`        | `motivo.puerto` [9; 25] al [5; 9]; `meta.altoLargo` [9; 22] al [6; 9]                                             | sí                                                                                              |
| 374                     | `escala` en [0,55; 1,8]                                        | `mountainSegments`        | `reina.escalaDificultades` [0,7; 1,4]                                                                             | sí                                                                                              |
| 387                     | `max(8,6, finalLen·escala)`                                    | `mountainSegments`        | `motivo.puerto.km[0]` 9,0                                                                                         | sí: 8,6 → 9,0                                                                                   |
| 390                     | `fill = max(0,15·km, …)`                                       | `mountainSegments`        | `colocacion.enlaceMinimoTotal` 0,12                                                                               | sí                                                                                              |
| 396, 406-407            | bajadas `U(5; 8)` y `U(4; 10)` al 6                            | `mountainSegments`        | `motivo.descenso.kmPorDesnivel` {55, 2, 10}                                                                       | sí                                                                                              |
| 451-454                 | final [4; 8] al [7,5; 10]; run-in [13; 22]                     | `mountainClassicSegments` | `meta.unDiaUltimaCota` [1,3; 4,2] al [7; 11] a [3; 17]                                                            | sí: el caso v40                                                                                 |
| 467                     | `min(0,6·runIn, max(2, len·g·10/55))`                          | `mountainClassicSegments` | `motivo.descenso.kmPorDesnivel.perdidaPorKm` 55                                                                   | no: es la regla canónica                                                                        |
| 477-478                 | muro [1; 2,5] al [8; 12]; `nWalls = km > 200 ? 5 : 4` (l. 475) | `classicSegments`         | `motivo.muro` [0,4; 3,0] al [8; 16]; el número lo pone `Slot.n` del esqueleto ([10; 20] en `ud_muros`, sección 5) | sí                                                                                              |
| 495-496                 | `[3, 5, 4]` estrellas; sector `U(2; 4)`                        | `cobblesSegments`         | `motivo.sector.estrellas` [1; 5], `.km` [0,3; 3,7]; el número lo pone `Slot.n`                                    | sí                                                                                              |
| 245, 271, 339, 445, 475 | `n = km > 170 ? 3 : 2` y variantes                             | todas                     | ninguna: la cardinalidad es `Slot.n` sorteada con `arch                                                           | raceId` (sección 8); es el hallazgo central del mapa 01 §4 (arquitectura fija por umbral de km) | sí  |

### 12.13 Lo que NO cambia y por qué

| Constante                             | Valor                                                                                                                                                                 | Dónde                       | Por qué no se mueve en E1                                                                                                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FINAL_KIND_CUTS`                     | { alto: 0,5, cimaCerca: 5, valleCorto: 20 }                                                                                                                           | `finalKind.ts` l. 30        | Es la vara con que `calendarQueens.ts` l. 73 lee las ~157 reinas y con que `queenGeometry()` mide el reparto; el generador se calibra para caer dentro con 0,7 de holgura (12.3)                                                                                           |
| `CLIMB_MIN_KM`                        | 1,5                                                                                                                                                                   | `finalKind.ts` l. 33        | Define qué puerto cuenta para `lastClimbKm`; `ARCH.pancarta.cimaMinKm` lo referencia                                                                                                                                                                                       |
| `WALL_MAX_KM`                         | 3                                                                                                                                                                     | `stageKind.ts` l. 60        | Frontera clásica/media; `ARCH.motivo.muro.km[1]` lo referencia                                                                                                                                                                                                             |
| `PASS_MIN_KM`                         | 8,5                                                                                                                                                                   | `stageKind.ts` l. 62        | Frontera media/reina; el generador la rodea con 8,0 y 9,0. Recalibrar `stageKindOf` a la realidad (27 de 113 reinas y medias reales mal clasificadas, `propuestas/datos.md` §1.5) es la decisión D2 del dueño y se abre tras el paso 8 con la tabla del censo (sección 11) |
| `QUEEN_MIN_CLIMB_METRES`              | 3.200                                                                                                                                                                 | `stageKind.ts` l. 64        | Red para recorridos reales; `ARCH.reina.verdad.dPlusMin` va 200 por encima                                                                                                                                                                                                 |
| `SUMMIT_RUN_IN_KM`                    | 5 (nueva, exportada)                                                                                                                                                  | `stageKind.ts`              | Es la única modificación de `stageKind.ts`: la etiqueta `Summit finish` pasa a decidirse por `kmAfterLastClimb ≤ 5`, la regla que `stageHistory.ts` l. 73 ya aplicaba; no toca `kind` (sección 11)                                                                         |
| `STAGE.finish*`                       | `finishWindowKm` 5, `finishClimbSearchKm` 15, `finishClimbMinGradient` 3, `finishClimbGapBlocks` 5, `finishClimbMinKm` 0,4, `finishSummitKm` 0,6, `finishAltoMinKm` 3 | `constants.ts` l. 3971-3989 | Son del motor (`finish.ts`), calibrados en la línea del motor con los bancos de `targets.ts`; los vetos no los leen (decisión 4: `verify` solo lee `routes/`) y el generador se diseña contra ellos (`meta.muro.aproxKm`, `enlace.ampMax`) en vez de moverlos              |
| `STAGE.muroMaxKm` / `muroMinGradient` | 1 / 8                                                                                                                                                                 | `constants.ts` l. 4462-4463 | Corte de `finishType` `muro`; `ARCH.meta.muro.finishMuroMaxKm` 1,0 lo referencia y por encima se declara `puncheur`                                                                                                                                                        |
| `STAGE.wallMaxKm` / `wallMinGradient` | 2,5 / 8                                                                                                                                                               | `constants.ts` l. 1593-1594 | Ley de velocidad (COL frente a MON); `ARCH.motivo.muro.g[0]` 8 lo referencia                                                                                                                                                                                               |
| `STAGE.dx`                            | 0,1                                                                                                                                                                   | `constants.ts` l. 1584      | Paso de integración: el generador redondea todo km a 0,1 por esto (`split`, `climb`, `descent`, `profileGen.ts` l. 52-93)                                                                                                                                                  |
| `STAGE.climbRaceKmToGo`               | 30                                                                                                                                                                    | `constants.ts` l. 3521      | Ventana de ataque del motor; `ARCH.reina.subidaLejanaKm` lo referencia                                                                                                                                                                                                     |
| `ENGINE_VERSION`                      | 69 → 70 una sola vez                                                                                                                                                  | `constants.ts` l. 718       | En el paso 8, al siguiente número libre en producción al empezar (sección 15)                                                                                                                                                                                              |

La razón común: todas son la vara con que el banco lee las reinas, con que `stageHistory.ts` reetiqueta etapas corridas y con que el motor decide el final (mapa 06 §2.3 y §5). Un generador nuevo que las moviera para caber dentro sería un generador calibrado contra sí mismo, que es exactamente el defecto del actual (`stageKind.ts` l. 44-58 justifica sus umbrales con 10.800 etapas del generador viejo). Lo generado se acota con holgura; lo real sigue con la discrepancia medida hasta D2.

### 12.14 El test de coherencia de `ARCH`

Vive en `grammar/motifs.test.ts` (bloque «`ARCH` es coherente con `routes/` y `STAGE`») y corre en `test:rapido`; falla si alguien separa una referencia de su fuente o abre un rango por encima de un umbral del clasificador:

```ts
import { ARCH, STAGE } from '../../constants'
import { FINAL_KIND_CUTS, CLIMB_MIN_KM } from '../finalKind'
import { PASS_MIN_KM, WALL_MAX_KM, QUEEN_MIN_CLIMB_METRES } from '../stageKind' // exportadas en el paso 3

describe('ARCH es coherente con routes/ y STAGE', () => {
  it('cota y puerto rodean PASS_MIN_KM con margenClaseKm', () => {
    expect(ARCH.motivo.cota.km[1] + ARCH.veto.margenClaseKm).toBeLessThanOrEqual(PASS_MIN_KM)
    expect(ARCH.motivo.puerto.km[0] - ARCH.veto.margenClaseKm).toBeGreaterThanOrEqual(PASS_MIN_KM)
    expect(ARCH.meta.altoLargo.km[0]).toBe(ARCH.motivo.puerto.km[0])
    expect(ARCH.meta.altoCorto.km[1] + ARCH.veto.margenClaseKm).toBeLessThanOrEqual(PASS_MIN_KM)
  })
  it('muro y repecho respetan los umbrales del clasificador y del motor', () => {
    expect(ARCH.motivo.muro.km[1]).toBe(WALL_MAX_KM)
    expect(ARCH.motivo.muro.km[0]).toBe(STAGE.finishClimbMinKm)
    expect(ARCH.motivo.muro.g[0]).toBe(STAGE.wallMinGradient)
    expect(ARCH.meta.muro.finishMuroMaxKm).toBe(STAGE.muroMaxKm)
    expect(ARCH.meta.repecho.km[1]).toBeLessThan(STAGE.finishAltoMinKm)
    expect(ARCH.meta.muro.aproxAmp).toBeLessThan(STAGE.finishClimbMinGradient)
    expect(ARCH.motivo.enlace.ampMax).toBeLessThan(STAGE.finishClimbMinGradient)
  })
  it('los valles llevan margenValleKm sobre FINAL_KIND_CUTS', () => {
    const m = ARCH.veto.margenValleKm
    expect(ARCH.meta.cimaCerca.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.alto + m)
    expect(ARCH.meta.cimaCerca.valle[1]).toBeLessThanOrEqual(FINAL_KIND_CUTS.cimaCerca - m)
    expect(ARCH.meta.descensoMeta.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.cimaCerca + m)
    expect(ARCH.meta.descensoMeta.valle[1]).toBeLessThanOrEqual(FINAL_KIND_CUTS.valleCorto - m)
    expect(ARCH.meta.valle.valle[0]).toBeGreaterThanOrEqual(FINAL_KIND_CUTS.valleCorto + m)
  })
  it('las referencias al motor no se separan de su fuente', () => {
    expect(ARCH.pancarta.cimaMinKm).toBe(CLIMB_MIN_KM)
    expect(ARCH.reina.subidaLejanaKm).toBe(STAGE.climbRaceKmToGo)
    expect(ARCH.reina.verdad.dPlusMin).toBeGreaterThan(QUEEN_MIN_CLIMB_METRES)
  })
  it('las tablas están bien formadas', () => {
    for (const fila of Object.values(ARCH.pesosComposicion)) {
      const suma = Object.values(fila).reduce((a, b) => a + b, 0)
      expect(Math.abs(suma - 1)).toBeLessThan(1e-9)
    }
    for (const clase of ['WT', 'Pro', '1', '2'] as const)
      for (const [, [min, rango]] of Object.entries(ARCH.km.porClase[clase]))
        expect(min + rango).toBeLessThanOrEqual(ARCH.km.maxPorClase[clase])
    expect(ARCH.reina.blandaShare.alta).toBeLessThan(ARCH.reina.blandaShare.montana!)
    expect(ARCH.veto.fallbackMaxShare.calendario).toBe(0)
  })
})
```

Lo que este test no cubre a propósito: que los rangos sean REALISTAS. Eso lo hacen `routeCensus` y sus bandas con columna «hoy (medido)» (sección 13) y la galería (sección 16); una constante puede ser coherente con el clasificador y seguir produciendo etapas que no existen, y por eso ninguna cifra de `ARCH` se da por buena hasta que el censo del paso 8 la mide.

---

## 13. El banco: invariantes, censo, calendarQueens, «mejor y no solo distinto», remedición

El banco de este repositorio tiene escrita su propia lección y esta sección la aplica al generador: «lo que no se mide sobre carreras reales, no se mide» (`targets.ts` l. 213-215 y 375-379, vía mapa 04 §3.3). Seis veces (v15, v17, v19, v23, v40, v44) un banco canónico en verde certificó algo que producción no hacía, y en cuatro de las seis el defecto era del PERFIL sobre el que se medía y no del motor (mapa 04 §3.3). La v60 §1b repitió el patrón por omisión: `mountainSegments` cambió el reparto de finales de las 157 reinas (`alto` 56,7 % → 38,2 %) y `realQueens`, `grandTour` y `smallTours` siguieron en verde sin una remedición anotada (mapa 04 §3.4). Un generador que cambia de forma cambia 1.241 de las 1.418 etapas (todo lo que no es `real`, mapa 06 §1), así que esta sección fija cuatro cosas: qué no puede moverse, qué se mueve a propósito y cómo se re-sella, cómo se mide en segundos lo que hoy nadie sabe sin correr `balance.md` v60 §12 a mano, y qué hace falta para decir «mejor» y no solo «distinto».

### 13.1 Lo que no se mueve y no debe moverse

Son la red que dice que el rediseño no ha tocado el motor. Ninguno de estos tests lee `profileGen.ts` ni `calendar.ts` en su parte generada, y por eso su verde no dice nada del generador y su rojo lo dice todo (mapa 04 §4.1 y §5.3 regla 3; mapa 06 §5).

| Qué                                                                                                                                                                                     | Dónde                                                                                                                                                                                                                     | Por qué no ve el generador                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Las 15 bandas canónicas: `flat.*` (3), `phases.*` (3), `mountain.*` (2), `timeTrial.*` (2), `erosion.flatFresh` y `.queenFresh`, `chronicle.*` (3)                                      | `sim/invariants.test.ts` l. 128-212, 275-459 (los sintéticos), 555-607                                                                                                                                                    | corren `llana-180`, `reina-150`, `cri-40`, perfiles LITERALES de `sim/scenarios.ts` l. 166-236, 303-348, 461-475 (mapa 04 §1.1)                                   |
| Las cuatro huellas selladas dígito a dígito                                                                                                                                             | `stage/attribution.test.ts` l. 24-38 y 159, `stage/timetrial.test.ts`, `sim/raceRadio.test.ts` l. 404                                                                                                                     | los mismos escenarios literales (mapa 06 §3.3)                                                                                                                    |
| Los invariantes SPEC 6.17 sintéticos: llano, fases, montaña, crono, desgaste, voz, pavés, cierre, inercia                                                                               | `sim/invariants.test.ts` l. 128-212, 555-607, 957-1049                                                                                                                                                                    | perfiles literales o un bloque de 60 km con 30 de `paves`                                                                                                         |
| `grandTour.*` y `abandonCauses.*` (12 vueltas de `race-france`)                                                                                                                         | `sim/invariants.test.ts` l. 609-758                                                                                                                                                                                       | 20 de 21 etapas con rasgos reales; solo la e21 llana es generada y cambia de detalle, no de forma (mapa 06 §1 y §3.2)                                             |
| Los perfiles reales                                                                                                                                                                     | `routes/featureProfile.test.ts`, `routes/classicRoutes.test.ts`, `erosion.longClassicFresh` (Flandes), `.hardestClassicFresh` (Lombardía), `.queenThirdWeek` (Francia e18), las 18 de un día WT de la saturación, Giro e9 | `featureProfile.ts` no se toca en E1 (decisión 27, sección 11) y la huella FNV de las 177 + 3 lo sella (decisión 28)                                              |
| `routes/finalKind.test.ts`                                                                                                                                                              | cortes 0,5 / 5 / 20 km (l. 92-100)                                                                                                                                                                                        | es la vara con la que se miden las reinas; `ARCH.meta.*` se diseña con holgura 0,7 sobre esos cortes (sección 4) precisamente para no tocarla                     |
| `db/recorridoDelMundo.test.ts`                                                                                                                                                          | l. 55-63                                                                                                                                                                                                                  | auto-consistente: compara el congelado con el calendario del mismo proceso; es la garantía de que el generador nuevo solo alcanza carreras futuras (mapa 06 §3.5) |
| `routes/altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`, `raceRoutes.test.ts`, `db/abandon`, `gcOrder`, `stageRun`, `teamPlan`, `locks`, `calendarConcurrency`, `world/*.test.ts` | mapa 06 §2.5 y §3.5                                                                                                                                                                                                       | datos de tablas, `TEST_TOUR` a mano o `kind` literal; `raceRoutes.test.ts` solo mira el número de etapas, que sigue viniendo de la fila (decisión 44)             |

Regla operativa, que es la condición (c) del protocolo de §13.6: si alguna de estas cifras se mueve un dígito en un cambio de `routes/`, el cambio ha tocado el motor (por ejemplo `sample.ts`, `finish.ts` o `physics.ts`) y se para; no se mezcla en la misma tanda. Dos aclaraciones sobre `mountain.*`: (1) `TARGETS.mountain.breakawayWinPct` [25; 45] y `.top10GapSeconds` [40; 300] no se mueven ni se retiran, porque la banda SPEC §6.17 es del dueño (sección 17, punto 15) y porque `reina-150` con 1.200 m es un control de forma útil («en un final en alto de manual, ¿la fuga tiene opción?», `targets.ts` l. 722-725); (2) lo que cambia es el rótulo del informe de `pnpm sim` (`sim/cli.ts`), que pasa a `forma.reinaCanonica.*`, y el comentario de `targets.ts` l. 88 que aún cita «una mediana de 2.023» (cifra del generador de la v63, mapa 04 §3.4) se sustituye por la cifra del paso 9. La clave `mountain` en `targets.ts` se conserva para no mover `invariants.test.ts` l. 188-200.

### 13.2 Lo que se mueve a propósito y cómo se re-sella

«Re-sellar» aquí es lo que hace el repositorio: mover la cifra o la lista con la causa escrita en el propio test (como `stageHistory.test.ts` l. 185-190 o las huellas de `attribution.test.ts` l. 320-355) y con la medida antes/después en la nota «v61 · El generador es una gramática» de `docs/balance.md`. Un cambio declarado, atribuido y anotado; nunca un re-sellado para tapar. La tabla completa la de arquitectura §11.2 con lo que el mapa 06 §4 exige y con los pasos de la sección 15.

| #   | Test o banda                                                                                                               | Qué le pasa                                                                                                                              | Qué se hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Paso   |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | `index.test.ts` l. 381 (`ENGINE_VERSION` 69)                                                                               | sube UNA vez                                                                                                                             | al siguiente número libre en producción; ninguna otra subida en E1 (decisión 3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 8      |
| 2   | `routes/stageKind.test.ts` (109 l.; 8 generadores × 300 perfiles, mapa 06 §2.1)                                            | los ocho `xxxSegments` desaparecen                                                                                                       | se reescribe por esqueleto: cada uno de los 32 `SkeletonId` × 5 km de su `Skeleton.km` × 60 semillas × todas las zonas compatibles (`requiere` satisfecho) → `stageKindOf(profile, timeTrial).kind === Skeleton.kind` y, si hay `finalKind`, `finalKindOf(profile) === Skeleton.finalKind`, en el 100 % (V6, V7). `ud_montana` entra por fin (hoy `mountainClassicSegments` dibuja 51 de 157 reinas sin que nadie lo selle, mapa 06 §6.1). Las reinas siguen exigiendo las dos etiquetas `Summit finish` y `Mountains` (l. 87-91). El comentario de umbrales de `stageKind.ts` l. 44-58 se reescribe con la tabla medida (hoy dice «10.800 etapas de cada generador» y reinas hasta 26,7 km, mapa 01 §9.6) | 8      |
| 3   | `routes/calendar.test.ts` l. 162-174 (km de las 60 ediciones al 0,1)                                                       | debe seguir verde                                                                                                                        | V10 y `normalizeEnlaces` lo garantizan (sección 8); el test gana la aserción `routeSource === 'edicion'` en esas etapas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 8      |
| 4   | `routes/calendar.test.ts` l. 269-277 (`Uphill finish` acaba en `puerto`)                                                   | debe seguir verde                                                                                                                        | `et_media_alto`, `et_reina_alto_corto` y `et_reina_alto_largo` terminan en `puerto` por construcción de `MetaKind` (sección 4); se generaliza a «toda etapa cuyo esqueleto tiene `meta ∈ {alto_corto, alto_largo, muro_meta}` acaba en `puerto`» sobre `calendarForSeason(0)` entero                                                                                                                                                                                                                                                                                                                                                                                                                       | 8      |
| 5   | `routes/calendar.test.ts` l. 108-121 (todo segmento con km > 0, banners dentro) y l. 184-246 (garantías de `mixRoles`)     | siguen verdes                                                                                                                            | `stageMix` conserva firma (decisión 19); las garantías pasan a `tour.test.ts` sin cambiar (sección 7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 7, 8   |
| 6   | `apps/api/src/stageHistory.test.ts` l. 199 (`cambian === 49`)                                                              | la cifra cambia                                                                                                                          | se re-sella con objetivo escrito: «solo etapas reales cuya etiqueta declarada difiere; generadas = 0», porque `kind` y `label` de toda etapa generada salen de `stageKindOf` (V6) y `stageHistory.ts` deja de reetiquetar con su propia regla (decisión 23). La mitad que vigila (`spec.kind === stage.kind`) da cero por construcción                                                                                                                                                                                                                                                                                                                                                                     | 8 y 10 |
| 7   | `sim/calendarQueens.test.ts` (71 l.)                                                                                       | cambia la muestra y el desnivel de 103 de las 157 reinas (las 54 reales no)                                                              | §13.4: muestra estratificada, 12 semillas fuera de CI antes de tocar nada, D6 con la cifra delante                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 9      |
| 8   | `sim/invariants.test.ts` l. 855-955 (`smallTours`, 9 bandas, 7 de 10 carreras generadas)                                   | cambia composición y relieve                                                                                                             | remedir pareado (§13.6) con dirección pre-registrada; `media.stages > 40` (l. 915) se recuenta porque cuenta etapas por `kind` y depende de `ARCH.pesosComposicion`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 9      |
| 9   | `sim/invariants.test.ts` l. 770-844 (`realQueens`)                                                                         | 3 de 9 son generadas y su `why` ya no describe el perfil (Colombia e5: «47 km rodadores» contra 18 medidos, mapa 06 §3.2)                | §13.5: `frozenSkeletons`; se remiden `lastGroupPct` y `worstStagePct` con 6 semillas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | 9      |
| 10  | `sim/invariants.test.ts` l. 461-553 (saturación; las 8 más exigentes fuera del WT, l. 486-499)                             | el generador elige qué ocho entran; hoy son `race-ses-salines`, `race-mercantour`, `race-jura` y cinco `nc-*-road`                       | se remide con el conjunto nuevo (los 532 nacionales pasan a `nc_ruta`, decisión 15); criterio intacto: vaciado ≤ 0,96 y pájaras ≤ 14 %; previsión 0 de 8, porque V5 impide la forma que saturaba (Jura «al 82 % con el tanque a cero», `invariants.test.ts` l. 474-479)                                                                                                                                                                                                                                                                                                                                                                                                                                    | 9      |
| 11  | `sim/invariants.test.ts` l. 222-273 (`timeTrials`, 3 de 5 cronos generadas)                                                | `et_crono` admite `cota` ≤ 3 km al [3; 5] % (sección 5); `et_prologo` y `et_cronoescalada` entran (D3)                                   | se remiden `tailPct` y `worstStagePct`; previsión +0,5 puntos como mucho en `tailPct`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 9      |
| 12  | `sim/coherence.test.ts` l. 120-125 (Race Jaén, 40 semillas) y `stage/journal.test.ts` l. 104-108 (Tramuntana, 12 semillas) | otro relieve bajo un listón de cero                                                                                                      | se re-corren; una contradicción que aflore es del motor y se arregla, el cero no se afloja                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 9      |
| 13  | `sim/world.test.ts` y `RACE_DAY_TSS` (`world.ts` l. 169-193 lee `st.kind` al cargar el módulo)                             | el reparto de `kind` cambia (BE, NL, DK, AE, AU sin reina por `cordillera: null`; medias flamencas a `clasica`; nacionales por circuito) | fila propia de la nota: se mide el reparto de `kind` por división ANTES (paso 0, con el calendario de hoy) y DESPUÉS (paso 8) y se imprime la carga media por corredor con `RACE_DAY_TSS`; si una banda de población se mueve, se anota con la causa; no se toca ninguna banda de `world` en E1                                                                                                                                                                                                                                                                                                                                                                                                            | 0 y 8  |
| 14  | `routes/golden.test.ts` (1.418 huellas FNV)                                                                                | existe solo entre los pasos 1 y 8                                                                                                        | se borra en el paso 8; `routes/realFingerprint.test.ts` (177 + 3) sobrevive y tiene que estar verde antes y después (decisión 28)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 1 y 8  |
| 15  | `db/recorridoDelMundo.test.ts`                                                                                             | auto-consistente                                                                                                                         | gana «dos temporadas, dos recorridos, un esqueleto» con `ARCH.edicion.activa` y el mismo perfil con `activa = false` (decisión 44)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 10     |

### 13.3 `routeCensus`: el censo geométrico que cabe en cada push

Lo que hoy nadie sabe sin correr `balance.md` v60 §12 a mano (cuántos `muro`, `puncheur`, `alto` y `pave` produce el calendario, con qué desnivel, con cuánta subida lejos de meta) pasa a medirse en segundos. Medido por el juez del motor con `juicios/coste-motor.mjs` sobre el `dist` de `ENGINE_VERSION` 69: una pasada de `sampleProfile` + `finishType(deriveFinishTerrain)` + `stageKindOf` + `finalKindOf` sobre las 1.418 etapas cuesta 569 ms, 0,40 ms por etapa (`juicios/motor.md` §1); es el 0,57 s que se cita en todo el documento y por eso el censo corre en cada push.

```ts
// packages/engine/src/sim/routeCensus.ts
export interface RouteStats {
  raceId: string
  stageIndex: number
  raceClass: RaceClass
  format: RaceFormat
  country: string
  zona: GeoZone | null
  skeleton: SkeletonId | null
  routeSource: RouteSource
  kind: StageKind
  label: string
  finalKind: FinalKind | null
  finishType: FinishType // finishType(deriveFinishTerrain(sampleProfile(profile)), 50): aquí sí
  km: number
  dPlus: number
  dPlusBloques: number // dPlusDe y calendarQueens::desnivelDe, para ver el delta
  nPuertos: number
  nMuros: number
  longestClimbKm: number
  lastClimbKm: number | null
  lastClimbG: number | null
  kmAfterLastClimb: number | null
  climbKmOutsideLast30: number
  kmSubidaShare: number
  breakAppealEstimado: number
  pavesKm: number
  nSectores: number
  estrellas5: number
  maxG: number
  huella: number[] // g por km
  intentos: number
  degradado: boolean
}
export function routeCensus(calendar: CalendarRace[] = SEASON_CALENDAR): RouteStats[]

export interface Cuantiles {
  n: number
  min: number
  p10: number
  p50: number
  p90: number
  max: number
  media: number
}
export interface Summary {
  n: number
  num: Partial<Record<keyof RouteStats, Cuantiles>> // solo los campos numéricos
  cat: Partial<
    Record<
      'kind' | 'finalKind' | 'finishType' | 'skeleton' | 'zona' | 'routeSource',
      Record<string, number>
    >
  > // fracción [0; 1]
}
export function aggregate(
  rows: RouteStats[],
  by: (r: RouteStats) => string,
): Record<string, Summary>
export function entropiaBits(reparto: Record<string, number>): number // Shannon en bits sobre fracciones
export function correlacion(a: number[], b: number[]): number // Pearson sobre `huella`, remuestreada a la más corta
```

Cómo se calcula cada campo, para que no haya dos censos:

- `finishType`: `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` (`stage/finish.ts` l. 94-123 y 165-189, vía `juicios/motor.md` §1), con `groupSize` 50 aquí y solo aquí. Es la única llamada a `sampleProfile` de todo E1 fuera del motor: `verify` no lo usa (decisión 4) y por eso una recalibración de `STAGE.finish*` mueve el censo y no los perfiles.
- `dPlus`: `dPlusDe(profile)` de `routes/grammar/geometry.ts` (integración de tramos con g > 0, decisión 9). `dPlusBloques`: la cuenta de `calendarQueens.ts` l. 54-58 (`sampleProfile`, bloques `subida`, `g/100 · STAGE.dx · 1000`). El censo imprime el delta y `calendario.test.ts` exige p90 de |`dPlus − dPlusBloques`| / `dPlusBloques` < 0,05 sobre las reinas: es la comprobación de que `Skeleton.dPlus` persigue lo que `desnivelDe` mide.
- `kmSubidaShare`: km de bloques `subida` sobre el total, la misma cuenta que `simulate.ts` l. 1696-1697 (mapa 03 §4.1). `breakAppealEstimado`: `clamp(STAGE.breakAppealClimbWeight · kmSubidaShare + (finishType ∈ {alto, muro, puncheur} ? STAGE.breakAppealUphillBonus : 0), 0, 1)`, la regla de `simulate.ts` l. 1698-1702 reproducida con las constantes de `STAGE` (hoy 4 y 0,35, mapa 03 §4.1). Se declara «estimado» porque `isUphillFinish` es del motor y aquí se aproxima por `finishType`.
- `climbKmOutsideLast30`: km de bloques `subida` con `kmToGo > STAGE.climbRaceKmToGo` (30, `constants.ts` l. 3521): la variable que separó `reina-150` (0 %) de las nueve reales (del 6 al 38 %) en `balance.md` v43 §7 (mapa 04 §3.2).
- `nPuertos`: segmentos `puerto` con `climbSize ≥ CLIMB_MIN_KM` 1,5; `nMuros`: segmentos `puerto` con km ≤ `WALL_MAX_KM` 3 y g ≥ 8; `longestClimbKm`: `climbSize` del mayor (`stageKind.ts` l. 36-42); `lastClimbKm`, `lastClimbG`, `kmAfterLastClimb`: de `routes/finalKind.ts`, con la pancarta si la hay (por eso `emitirPancartas` pone SIEMPRE `cima` en el último `puerto`, decisión 25).
- `huella`: g medio por km entero (vector de `round(km)` posiciones) sobre los bloques de `sampleProfile`, que ya está calculado para `finishType`. Sirve a V12 y a las bandas de variedad.
- `zona`, `skeleton`, `intentos`, `degradado`: de `GeneratedStage.arch`; `null` y 0 en las etapas `real`.

Dónde corre: `routes/grammar/calendario.test.ts` importa `routeCensus` y afirma `ROUTE_CENSUS_TARGETS` sobre `calendarForSeason(0)`; está bajo `routes/`, así que entra en `test:rapido` (`package.json` l. 20 excluye solo `packages/engine/src/sim/**`) y corre en cada push. `sim/routeCensus.test.ts` comprueba el censo mismo sobre perfiles literales (abajo) y corre con `test:bancos` y en el nocturno. `pnpm sim` imprime `aggregate(routeCensus(), r => r.skeleton ?? 'real')` al principio del informe, antes de simular nada.

#### `ROUTE_CENSUS_TARGETS`: las bandas de realismo y de variedad

```ts
export interface CensusTarget {
  id: string
  label: string
  poblacion: (r: RouteStats) => boolean // subconjunto sobre el que se mide
  medida: (rows: RouteStats[]) => number
  min?: number
  max?: number
  hoy: number | null // columna «hoy (medido)» del paso 0; null si la población no existía
  fuente: string // mapa, propuesta o juicio de donde sale la banda
  estado: 'sellada' | 'informativa' // informativa = se imprime, no afirma
  nMin: number // población mínima para afirmar; por debajo se imprime «n insuficiente»
}
export const ROUTE_CENSUS_TARGETS: readonly CensusTarget[]
export const CENSUS_N_MIN = 10
```

Regla de nacimiento (mapa 04 §5.3 regla 4): ninguna banda nace en rojo. En el paso 0 se escriben todas con `hoy` medido sobre el calendario de `ENGINE_VERSION` 69; las que están rojas hoy van en `it.todo` con la cifra en el nombre del test («hoy 0 de 1.075») y pasan a `it` en el paso 8; las que no tienen población hoy (`zona`, `skeleton`, identidad) tienen `hoy: null` y se afirman desde el paso 8. `estado: 'informativa'` se convierte en `'sellada'` solo cuando la cifra tenga dueño y sigma conocida, en el paso 9 o después. Las referencias reales (columna «real») salen de `scripts/medir-real.mjs` sobre las 177 etapas con rasgos (`datos.md` §1.4, decisión 40) donde hay ≥ 3 fuentes, y del mapa 07 §4 donde no las hay; el generador no lee ese fichero, solo el test.

Realismo (población: `routeSource !== 'real'` salvo donde se dice):

| id                    | Métrica                                                                                                                                       | Población                                                                                            | Banda                                                                                                                                  | Hoy (medido)                                                                                                                    | Real / fuente                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `vetos`               | violaciones de V1-V10 y V15; `degradado`; p95 de `intentos`                                                                                   | todo generado                                                                                        | 0; 0 (`ARCH.veto.fallbackMaxShare.calendario` 0); ≤ 3                                                                                  | n/a (no hay vetos)                                                                                                              | sección 9                                                                            |
| `cruces`              | `stageKindOf(profile).kind === kind` y `finalKindOf(profile) === arch.finalKind`                                                              | todo generado                                                                                        | 100 %                                                                                                                                  | 72 discrepancias de `kind` sobre 1.418 (`juicios/motor.md` §1); de 1 a 3 de 1.500 por forma (mapa 01 §5.1)                      | V6, V7                                                                               |
| `esqueletos.clase`    | esqueletos distintos por clase y formato                                                                                                      | un día WT/Pro; un día .1/.2; NC ruta; papeles en vueltas                                             | ≥ 8; ≥ 10; ≥ 6; ≥ 9                                                                                                                    | 6 moldes de un día y 3 terrenos (mapa 01 §2.1)                                                                                  | «siempre son los mismos tres o cuatro modelos» (agenda §4.18); arquitectura §11.3    |
| `esqueletos.entropia` | entropía de esqueleto por zona con ≥ 8 carreras                                                                                               | por `zona`                                                                                           | ≥ 1,5 bits                                                                                                                             | null (no hay zona)                                                                                                              | arquitectura §11.3                                                                   |
| `finales.reparto`     | reparto de `finalKindOf` sobre las reinas, con cada cubeta ≥ 5 % y `alto` en [0,35; 0,55]                                                     | `kind === 'reina'`, las 157 (reales incluidas, como `queenGeometry`, `calendarQueens.ts` l. 158-163) | sí                                                                                                                                     | 38,2 / 8,9 / 42,0 / 10,8 (mapa 06 §1)                                                                                           | real: 37 / 4 / 6 / 7 de 54 (`datos.md` §1.4); `queenFinalMix` ± 0,08 (tactica R28.2) |
| `reina.dplus.formato` | p50 de `dPlus` de reina por formato; cubeta < 1.500 poblada                                                                                   | reinas generadas por `format`                                                                        | una semana p50 ≥ 2.400; gran vuelta generada p50 ≥ 3.000 (n = 0 en E1: se imprime «n insuficiente» hasta E12); < 1.500 ≥ 5 % del total | 2.898 (`mountainSegments`) y 1.734 (`mountainClassicSegments`); 32 de 157 < 1.500 (mapa 06 §1)                                  | mapa 04 §5.1; mapa 07 §4.1                                                           |
| `reina.subidaLejana`  | `climbKmOutsideLast30` / km de subida                                                                                                         | reinas generadas                                                                                     | ninguna en 0 %; p10 ≥ 0,05                                                                                                             | `reina-150` 0 %; reales del 6 al 38 % (v43 §7); generadas: paso 0                                                               | V8b; `banco.md` §11.2                                                                |
| `reina.puertoFinal`   | `lastClimbKm` de las reinas `alto`                                                                                                            | reinas generadas con `finalKind === 'alto'`                                                          | informativa: p10 / p50 / p90                                                                                                           | [8,4; 26,7] (mapa 01 §2.5)                                                                                                      | real 3,3 / 9,7 / 17,1 (`datos.md` §1.4)                                              |
| `finales.muro`        | fracción de `finishType === 'muro'` y `=== 'puncheur'`                                                                                        | etapas en línea generadas                                                                            | `muro` ≥ 0,01; `puncheur` ≥ 0,08                                                                                                       | `muro` 0 de 1.075, `puncheur` 51 (4,7 %), `alto` 111 (`juicios/motor.md` §1; v60 §12)                                           | V11, V16; decisión 7                                                                 |
| `unDia.ultimaCota`    | `lastClimbKm ≤ 4,2` y `kmAfterLastClimb ∈ [3; 17]`                                                                                            | un día generado, `kind !== 'llana'`                                                                  | ≥ 98 % (el resto es `ud_montana_alto`)                                                                                                 | muro de [1; 2,5] km a ≥ 16 km (`classicSegments`); puerto de [4; 8] km a [13; 22] (`mountainClassicSegments`) (`datos.md` §1.4) | V5; mapa 07 §4.3; real 0,5 / 1,0 / 2,1 km y 0 / 7,8 / 20,8 km a meta                 |
| `unDia.finalLargo`    | un día con `finishType === 'alto'` y `lastClimbKm > 6`                                                                                        | un día generado                                                                                      | ≤ 2 %                                                                                                                                  | 0 % tras v40 (pero 9 de un día son `mountainClassicSegments`, mapa 06 §1)                                                       | mapa 07 §4.4 regla 1; D1                                                             |
| `muros.cotas`         | `nMuros` en `ud_muros` y `ud_muros_adoquin`                                                                                                   | esos esqueletos                                                                                      | p10-p90 en [10; 20]                                                                                                                    | 4 o 5 (mapa 07 §1.3 contra `classicSegments`)                                                                                   | real un día 4 / 11 / 34 cotas (`datos.md` §1.4)                                      |
| `adoquin.sectores`    | `nSectores`, `pavesKm`, último sector a meta                                                                                                  | `ud_adoquin`                                                                                         | [15; 30]; [40; 60] km; último a [1; 8] km                                                                                              | 3 sectores, ~40 km (mapa 07 §1.4)                                                                                               | Roubaix 31 / 54,8 km; real 5, 6, 8, 9, 15, 31 sectores                               |
| `llana.dplus`         | p90 de `dPlus`                                                                                                                                | `kind === 'llana'` generadas                                                                         | ≤ 1.500                                                                                                                                | [661; 1.413] (mapa 01 §1)                                                                                                       | V9 (≤ 1.800 duro)                                                                    |
| `km.clase`            | p90 de km en .2; ninguna > `ARCH.km.maxPorClase`                                                                                              | por `raceClass`                                                                                      | ≤ 170; 0                                                                                                                               | [145; 195] en cualquier clase (mapa 07 §4.1)                                                                                    | decisión 36; D9                                                                      |
| `dplus.delta`         | p90 de                                                                                                                                        | `dPlus − dPlusBloques`                                                                               | / `dPlusBloques`                                                                                                                       | reinas generadas                                                                                                                | < 0,05                                                                               | n/a | decisión 9 |
| `nacionales`          | esqueletos distintos entre los 133 `nc-*-road`; BE/NL con adoquín; CO/EC con cota ≥ 5 km; DK/AE con `expuesto`                                | `nc_ruta`                                                                                            | ≥ 5; ≥ 60 %; 100 %; 100 %                                                                                                              | todos por `classic(220)` (mapa 06 §1: 532 por `oneDaySpec`)                                                                     | decisión 15; `motor.md` §V.3                                                         |
| `tactica.kmSubida`    | `kmSubidaShare` y `breakAppealEstimado` por esqueleto                                                                                         | por `skeleton`                                                                                       | informativa; `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15 en `kmSubidaShare`                                                               | n/a                                                                                                                             | decisión 25; `juicios/motor.md` §5 riesgo 4                                          |
| `identidad`           | mismo esqueleto, firma igual, km ± 6 %, ≥ 1 diferencia no firma en 4 de 5 temporadas; correlación entre ediciones consecutivas en [0,55; 0,9] | generadas, temporadas 1 a 5 contra 0                                                                 | sí (el test vive en `edition.test.ts`, sección 10; el censo solo imprime)                                                              | null                                                                                                                            | decisiones 20 y 22                                                                   |

Variedad (todas sobre lo generado; mapa 04 §5.2, arquitectura §11.3, `banco.md` §11.3):

| id                          | Métrica                                                                                                                  | Banda                                  | Hoy (medido)                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `variedad.correlacion`      | Pearson de `huella` entre pares del mismo esqueleto y km ± 10 % (200 pares deterministas por esqueleto, `routeRng('censo | ' + id)`); circuitos excluidos del par | mediana < 0,8; máximo < `ARCH.anticlon.maxCorrelacion` (0,85 provisional, calibrado en el paso 9 sobre Ronde/E3, Amstel/Brabant, Lombardía/Lieja) | > 0,8 esperado en `hilly` porque el esqueleto es único (geografia §11.3); se mide en el paso 0 por molde |
| `variedad.primerPuerto`     | km del primer `puerto` / km total, en reinas                                                                             | p10 < 0,25 y p90 > 0,55                | `split` lo pone siempre en el mismo sitio (mapa 01 §4)                                                                                            |
| `variedad.dplusCubetaAlta`  | σ de `dPlus` en [2.600; 4.600]                                                                                           | > 500 m                                | la uniforme en logaritmo de la v64 lo da (mapa 04 §5.2)                                                                                           |
| `variedad.secuencias`       | frecuencia de cada secuencia de papeles en vueltas de 5                                                                  | ninguna > 25 %                         | 7 % (`datos.md` §11.4)                                                                                                                            |
| `variedad.finalesPorVuelta` | entropía de `finalKind` en vueltas con ≥ 3 reinas                                                                        | ninguna con todas `alto`               | `race-france` lo era (mapa 04 §5.2)                                                                                                               |
| `variedad.kmUnDia`          | σ de km de un día por clase en .1 y .2                                                                                   | > 15 km                                | 0 (el 210 fijo, decisión 36)                                                                                                                      |

### 13.4 `calendarQueens` estratificada, `reina-175-4800` y `forma.reinaCanonica.*`

Hoy `calendarQueenSample()` ordena las 157 reinas por `desnivelDe` y toma una de cada `PASO = 6` (`calendarQueens.ts` l. 51, 85-87): 27 etapas, de las que 11 son reales, 5 de edición generada, 2 de un día y 9 de `stageMix` (mapa 06 §3.1). El test corre 4 semillas con reloj 3.600 s (`calendarQueens.test.ts` l. 55-57) y afirma cinco cosas (l. 60-68): las cubetas `<1500` y `2500-3500` pobladas, `facil > dura + 10`, min < 1.500 y max > 2.500, y `wonFromMovePct ∈ [6; 30]`. Tres problemas medidos: la banda `<1500` la sostiene hoy un test y no el diseño (mapa 06 §6.3), la muestra cambia de composición con cualquier generador (qué 27 etapas: `juicios/motor.md` §5 riesgo 5), y la banda global se traga la pendiente por cubeta que el propio test ya afirma (mapa 04 §4.3 punto 2). Se decide (decisión 32):

1. **Muestra estratificada por `finalKind` × `BANDAS_DESNIVEL`** (4 × 4 = 16 estratos, `calendarQueens.ts` l. 90-95), con cuota proporcional y mínimo 1 por estrato no vacío, y `MUESTRA_OBJETIVO = 30`. Dentro de cada estrato se ordena por `dPlus` y se toman SIEMPRE el índice 0 y el último (así la aserción de extremos l. 30-31 sigue valiendo: el mínimo y el máximo globales son el primero y el último de su estrato) y el resto por rejilla `i % paso === 0` con `paso = ceil(n_estrato / cuota)`. Sin dado: la composición sale de un criterio escrito, como hoy (l. 22-27).
2. **`CalendarQueen` gana `skeleton: SkeletonId | null` y `routeSource`**, para que el informe diga por forma y por origen sobre qué habla el número.
3. **`CalendarQueenStats` gana `porFinalKind`** (misma forma que `porBanda`) y `porEstrato` (16 filas); ambos se imprimen y no tienen banda hasta tener σ (informativos en el paso 9).
4. **Las aserciones**: se conservan las cinco de hoy. `facil.races > 0` la sostiene `et_reina_blanda` con `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10} (decisión 8), no un 40 % dirigido; si aun así el estrato `<1500` queda con menos de 3 etapas en la muestra, el test FALLA con el mensaje «cubeta < 1.500 despoblada: decisión D6» y no se cambia solo a comparar `<2000` contra `>3000`: esa alternativa es del dueño (sección 18, D6; valor por defecto: mantener `<1500` contra `2500-3500` y [6; 30] como vigilancia hasta la remedición del paso 9). `facil > dura + 10` se espera que siga: es física del motor (43,8 % contra 1,6 % medido, l. 35-38), no forma.
5. **Reloj**: con la aritmética hecha como en l. 40-52: 126 s libre y 370 cargada por 27 etapas × 4 semillas; con 30 etapas, 140 y 411; con el factor 2,26 del nocturno, 929 s; ×4 (regla de la casa, `invariants.test.ts` l. 297-298) = 3.716. Reloj nuevo: `{ timeout: 4_000_000 }`, y el comentario se reescribe con estas cifras.
6. **`reina-175-4800`**: escenario canónico nuevo en `sim/scenarios.ts`, perfil literal de la plantilla 3 del mapa 07 §5 (175 km, 4.800 m: puerto de 12 km al 7 % en el km 45, 17 km al 7,3 % en el 95, 10 km al 7,8 % en el 130, final de 15,8 km al 7,9 % del 159 al 175, meta `cima`), mismo campo que `reina-150` (`scenarios.ts` l. 332-336 para el perfil; 4 líderes MON 84-87, 6 baroudeurs, 3 sprinters, 163 relleno). Se imprime en `pnpm sim` (`cli.ts`, junto a `reina-150-s3`, l. 150-157) con `breakawayWinPct`, `top10GapSeconds` y la cola del último, SIN banda: es el control de forma con el tamaño de una reina de verdad, y la banda se le pondrá cuando la cifra tenga dueño.
7. **`forma.reinaCanonica.*`**: rótulo del informe para `TARGETS.mountain.*` (§13.1); la clave no cambia.

`queenGeometry()` (`calendarQueens.ts` l. 184-200) gana test por primera vez (mapa 06 §6.2): la fila `finales.reparto` de `ROUTE_CENSUS_TARGETS` es la misma cuenta sobre las 157, no sobre la muestra, por la razón escrita en l. 160-163 (error típico 0,096 con n = 27, mayor que la tolerancia ± 0,08).

### 13.5 `frozenSkeletons` y `GENERATED_QUEENS`

`REAL_QUEENS` es una lista cerrada a propósito (`realQueens.ts` l. 41-45) y tres de sus nueve entradas las dibuja el generador: `race-colombia` e5 (232 km, hoy `valle_corto` con 18 km tras la cota, medido), `race-guatemala` e9 (200 km) y `race-tachira` e6 (166 km, `valle_largo`, 21 km) (mapa 06 §3.2). Su `why` describe perfiles que ya no corren («el último puerto a 62 km de meta y 47 km rodadores», l. 50). Las dos salidas fáciles están descartadas con razón (`juicios/motor.md` §5 riesgo 8): congelar `Segment[]` convierte el banco en museo del generador viejo; cerrar «por brief» y resortear pierde la comparabilidad hacia atrás. Se decide (decisión 33): las tres se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` y se renderizan con `renderSkeleton` (sección 8), con `why` reescrito para describir el esqueleto.

```ts
// packages/engine/src/sim/frozenSkeletons.ts
export interface FrozenQueen {
  raceId: string
  stageIndex: number // la entrada de REAL_QUEENS a la que sustituye
  skeleton: Skeleton // literal: `id` de los 32, `canonico` propio, sin `alternativas`
  motivos: Motif[] // la instancia fija (posiciones incluidas: colocación ya hecha)
  km: number // 232, 200, 166
  geo: GeoZone // `andes` las tres
  seedDibujo: string // `frozen|race-colombia|5`: solo alimenta `dib`
  huellaFNV: number // del perfil rendido; se re-sella con causa si `renderSkeleton` cambia
  why: string
}
export const FROZEN_QUEENS: readonly FrozenQueen[] // exactamente 3
export function frozenProfile(q: FrozenQueen): StageProfile
```

Reglas: (1) `motivos` se escriben en el paso 9 leyendo el perfil de HOY con `describeProfile` (sección 8): cada segmento `puerto` con `climbSize ≥ 1,5` pasa a un `Motif` `puerto` o `cota` con su km, su g medio y su posición, y el resto a `enlace`; así la forma que el banco comparaba se conserva, dibujada por el código nuevo. (2) `realQueens.ts::findStage(raceId, stageIndex)` devuelve `frozenProfile` cuando la pareja está en `FROZEN_QUEENS` y, si no, la etapa del calendario; `REAL_QUEENS` sigue con 9 entradas y `realQueens.lastGroupPct` [7; 14] y `worstStagePct` ≤ 18 se remiden con 6 semillas en el paso 9. (3) `sim/frozenSkeletons.test.ts`: para cada una, `stageKindOf(frozenProfile(q)).kind === 'reina'`, `finalKindOf === skeleton.finalKind`, `|dPlusDe − skeleton.dPlus objetivo| ≤ 10 %`, `Σ km` al 0,1, `verify(...) === null`, y `fnv(profile) === huellaFNV`. (4) La huella se re-sella solo con causa escrita en el test (un cambio de `renderSkeleton`), nunca para tapar.

`GENERATED_QUEENS` (aparte, también 3): las reinas del calendario nuevo elegidas por forma, una `alto`, una `cima_cerca`, una `valle_largo`, entre las generadas (`routeSource !== 'real'`) de `vu_semana` y `vu_corta`; criterio determinista: en cada `finalKind`, la de `dPlus` más cercano al p50 de su cubeta, y a igualdad el `raceId` menor. Se cierran por nombre en el paso 9 con `skeleton` y `finalKind` anotados, se corren con 6 semillas y se IMPRIMEN sin banda (cola del último por `finalKind`, previsión `alto > cima_cerca > valle_corto > valle_largo` de la tabla v19, `targets.ts` l. 615-628). Un test barato afirma que cada entrada sigue teniendo el `finalKind` y el `skeleton` anotados: si un cambio los mueve, la entrada se vuelve a elegir con causa.

### 13.6 El protocolo «mejor y no solo distinto»

Dos ejes que chocan y no se confunden (mapa 04 §5): realismo (¿se parece el calendario a lo que se corre?) y variedad (¿dos etapas del mismo tipo se distinguen?). Un generador «distinto» mueve bandas; uno «mejor» las mueve en la dirección que la carretera dice, sin tocar lo que no puede tocar. El protocolo se anota en `docs/balance.md` ANTES de correr nada (decisión 30), en este orden:

1. **Línea base (paso 0)**: `routeCensus` sobre el calendario de `ENGINE_VERSION` 69, tabla de §13.3 con la columna «hoy» en «v61 §0», y la lista de bandas rojas hoy. Previsión escrita: `esqueletos.clase`, `unDia.ultimaCota`, `finales.muro`, `muros.cotas`, `adoquin.sectores`, `km.clase`, `reina.subidaLejana` (en parte), `variedad.correlacion`, `variedad.primerPuerto` y `variedad.kmUnDia`. Para las bandas de simulación, la línea base es la cifra del último CI en verde con sus semillas de hoy (4 / 6 / 8 / 3 / 12) y la de `balance.md`; la medida con 12 semillas del generador viejo se hace en el paso 9, en la misma sesión y la misma máquina que la del nuevo (todo ×2, decisión 34).
2. **Pre-registro**: `sim/preRegistro.ts` exporta `PRE_REGISTRO: readonly { banda: string; direccion: 'sube' | 'baja' | 'igual' | 'igual_ruido'; porQue: string }[]`, un test comprueba que toda banda de `TARGETS` que lee perfiles generados (mapa 04 §2, las 17) tiene entrada, y `pnpm sim:pareado` imprime la columna «previsto». La tabla, decidida:

| Banda                                                                        | Dirección                                                                                      | Por qué                                                                                                                                                                     |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `calendarQueens.breakawayWinPct` global                                      | baja                                                                                           | p50 de desnivel sube con V8a mientras `<1500` se queda en ~10 % por `et_reina_blanda`; la banda [6; 30] se conserva como vigilancia (D6)                                    |
| `calendarQueens` por cubeta                                                  | igual (monótona decreciente)                                                                   | 43,8 / 13,7 / 1,6 / 0 hoy (epics l. 226-233): es física del motor                                                                                                           |
| `realQueens.lastGroupPct`, `worstStagePct`                                   | igual_ruido                                                                                    | las tres generadas están congeladas por forma (§13.5); solo cambia el dibujo                                                                                                |
| `grandTour.*`, `abandonCauses.*`                                             | igual                                                                                          | 20 de 21 reales; si se mueven, acoplamiento (regla 3)                                                                                                                       |
| `erosion.longClassicFresh`, `.hardestClassicFresh`, `.queenThirdWeek`        | igual                                                                                          | reales                                                                                                                                                                      |
| `smallTours.mediaGroups`                                                     | sube                                                                                           | cotas más cerca de meta (`et_media_*`: última cota a 0-59 km real contra 26-68 hoy, `datos.md` §1.4)                                                                        |
| `smallTours.mediaOneGroupPct`                                                | baja                                                                                           | misma razón; hoy el campo entero llega junto en el 23 % (mapa 04 §4.2)                                                                                                      |
| `smallTours.flatWinnerGroupPct`                                              | igual                                                                                          | `et_llana` sigue entera con V9                                                                                                                                              |
| `smallTours.photoRepeatTopFive`, `worstRacePhotoRepeat`, `sameWinnerPairPct` | baja o igual                                                                                   | menos llanas seguidas por `ARCH.pesosComposicion` y `ARCH.bloques`; la parte de composición (pares de agrupadas) se imprime aparte de la de motor (`targets.ts` l. 574-577) |
| `smallTours.bestSprinterWinPct`, `sweepPct`, `flatMoveWorstMarginS`          | igual                                                                                          | dependen del campo y del motor, no de la forma de la llana                                                                                                                  |
| saturación de las 8 más duras                                                | igual (0 de 8)                                                                                 | V5 impide el final de 9-15 km; el conjunto cambia (nacionales por circuito) y se lista                                                                                      |
| `timeTrials.tailPct`                                                         | sube ≤ 0,5 puntos                                                                              | `et_crono` con `cota` ≤ 3 km; `worstStagePct` igual                                                                                                                         |
| `stageHistory` `cambian`                                                     | baja a solo reales                                                                             | decisión 23                                                                                                                                                                 |
| Jaén, Tramuntana                                                             | igual (0)                                                                                      | listón de cero                                                                                                                                                              |
| `world` (reparto de `kind`)                                                  | se anota, sin previsión numérica                                                               | ninguna banda de población se toca en E1                                                                                                                                    |
| `medianLeadGroupRiders` (sin banda)                                          | se imprime por `finalKind`                                                                     | deuda de `targets.ts` l. 597-618                                                                                                                                            |
| quién gana por esqueleto (nueva, informativa)                                | `ud_muros` clasicómano, `ud_adoquin` rodador, `et_media_muro` puncheur, `et_reina_*` escalador | arquitectura §11.4; es el «mejor» por el lado del juego                                                                                                                     |

3. **Pareado**: mismo `worldSeed`, mismo campo (`buildField(worldSeed, level)`, `realQueens.ts` l. 109-113), misma semilla de etapa con `engineVersion: 1` fijo (`realQueens.ts` l. 179-182), generador viejo contra nuevo, 12 semillas. La medida es la diferencia por semilla: mediana de las diferencias pareadas y signo, como hizo la v49 con la brecha 1.º-10.º (`targets.ts` l. 108-131). El generador viejo vive SOLO durante el paso 9 en `sim/legacy/profileGenLegacy.ts` (los ocho `xxxSegments`, `normalize`, `garantizaPuerto`) y `sim/legacy/calendarLegacy.ts` (`oneDaySpec`, `stageMix`, `mixRoles` y el cableado de `buildRace` de hoy, produciendo `CalendarRace[]`), y los dos ficheros se borran en el mismo cambio que cierra «v61 §9» (decisión 29). Para que el pareado sea posible, cada función de banco gana un último parámetro `calendar: CalendarRace[] = SEASON_CALENDAR` (`analyzeCalendarQueens(runs, calendar?)`, `findStage(raceId, i, calendar?)`, las de `smallTours.ts`, `timeTrials.ts`, y la selección de las 8 más duras, hoy inline en `invariants.test.ts` l. 486-499, extraída a `sim/saturation.ts::hardestOneDay(calendar, n = 8)`); los tests no cambian porque el valor por defecto es el de hoy. `sim/pareado.ts` (script `pnpm sim:pareado [semillas=12]` en `package.json`, junto a l. 14-16) corre cada banco dos veces y escribe la tabla `banda | viejo | nuevo | Δ mediana | previsto | cumple`.
4. **Cuatro condiciones, todas necesarias**: (a) toda banda de realismo roja en la línea base pasa a verde y ninguna verde pasa a roja; (b) todas las de variedad en verde; (c) las canónicas de §13.1 (`llana-180`, `reina-150`, `cri-40`, `chronicle`, las cuatro huellas) no se mueven ni un dígito; (d) las de simulación se mueven en la dirección pre-registrada, o se explica con medida por qué la previsión era mala, y no se ajusta la banda para que cuadre. Si (a) a (d) se cumplen, el generador es mejor. Si solo se cumple (b), es distinto. Si falla (c), ha tocado el motor y no se mezcla en la misma tanda.
5. **Doble lectura de las listas cerradas** (mapa 04 §5.3 regla 2): por nombre (¿qué le pasó a `race-colombia` e5?) y por forma (¿qué les pasa a las reinas `alto` de [3.500; 4.500] m?). Una lista cerrada conserva el nombre y no la forma (mapa 04 §3.3); leerla solo por nombre confunde un cambio de forma con uno de motor.

La tabla pareada es la CONDICIÓN para borrar el generador viejo (decisión 29): sin tabla en «v61 §9», `sim/legacy/` no se borra y el paso 9 no está cerrado.

### 13.7 La remedición: dueño, orden, horas y techo

Dos dueños (decisión 34): el dueño operativo, que corre las horas, es el implementador del paso 9; el dueño de cada banda es el dueño del repositorio, que decide con la cifra delante y no antes. Orden por coste creciente, todo ×2 (viejo y nuevo), con los relojes de los tests y el coste real medido o escalado del que tienen:

| Orden | Banco                                                   | Semillas          | Coste real (por generador)                                | Reloj del test                      | Paso  |
| ----- | ------------------------------------------------------- | ----------------- | --------------------------------------------------------- | ----------------------------------- | ----- |
| 1     | `routeCensus` (§13.3)                                   | n/a               | 0,57 s (`juicios/motor.md` §1)                            | `test:rapido`                       | 0 y 8 |
| 2     | `stageKind.test.ts` por esqueleto                       | 60 × 5 km × zonas | minutos (9.600 perfiles por zona, sin simular)            | 30 s por `it`                       | 8     |
| 3     | `realQueens` sobre `FROZEN_QUEENS` y `GENERATED_QUEENS` | 6                 | ~4 min                                                    | 900 s (`invariants.test.ts` l. 697) | 9     |
| 4     | `timeTrials`                                            | 6                 | ~3 min                                                    | 300 s (l. 234-261)                  | 9     |
| 5     | `calendarQueens` estratificada                          | 12                | 6 a 19 min (140 s libre y 411 cargada con 4 semillas, ×3) | 4.000 s con 4 (§13.4)               | 9     |
| 6     | saturación de las 8 más duras                           | 12                | ~30 min (1.800 s de reloj con 3, l. 511)                  | 1.800 s con 3                       | 9     |
| 7     | `smallTours`                                            | 12                | ~25 min (3.900 s de reloj con 8, l. 891)                  | 3.900 s con 8                       | 9     |
| 8     | Jaén (40 semillas) y Tramuntana (12)                    | 40 / 12           | ~5 min                                                    | 300 s                               | 9     |

Suma por generador ≈ 85 min; ×2 ≈ 3 h. Presupuesto: 4 h de máquina y 2 sesiones humanas (una para correr y anotar, otra para leer con el dueño); techo 8 h. Si se supera el techo se corta por el orden de la tabla, de abajo arriba (`smallTours` y saturación son lo primero que se sacrifica), y lo no remedido con 12 semillas queda anotado en «v61 §9» como «remedido con las semillas de CI (8 / 3), no con 12», con la banda tal cual.

Regla «previsión fallida»: un resultado que contradice la dirección pre-registrada se anota en `docs/balance.md` «v61 §9» con este formato: banda, previsto, medido (viejo, nuevo, Δ mediana pareada, n semillas), causa que se ve en los datos (por forma y por nombre), y la frase «previsión fallida». La banda NO se mueve: sigue con su valor y su rótulo hasta que el dueño decida con la cifra delante (sección 18), y si eso deja un test rojo, el test se marca `it.skip` con la referencia a la entrada de la nota, nunca se ensancha la banda. Las bandas que nacen en esta remedición (`porFinalKind`, `porEstrato`, `GENERATED_QUEENS`, quién gana por esqueleto, `medianLeadGroupRiders` por final) se quedan `informativa` hasta tener σ conocida: en `calendarQueens` con 108 carreras σ ≈ 3,7 puntos (`targets.ts` l. 718-719), así que un estrato de 2 etapas × 12 semillas = 24 carreras no puede sellar nada, y eso se escribe en el informe junto al número.

### 13.8 Tests de la sección

Tests primero, como todo el plan (sección 15). Los que corren en cada push son los de `routes/grammar/calendario.test.ts`; los de `sim/` corren con `test:bancos` y en el nocturno.

```ts
// packages/engine/src/routes/grammar/calendario.test.ts (test:rapido)
import {
  routeCensus,
  aggregate,
  ROUTE_CENSUS_TARGETS,
  CENSUS_N_MIN,
} from '../../sim/routeCensus.js'
import { calendarForSeason, BASE_SEASON } from './edition.js'

const rows = routeCensus(calendarForSeason(BASE_SEASON))

describe('el censo del calendario que el juego corre', () => {
  for (const t of ROUTE_CENSUS_TARGETS) {
    const pob = rows.filter(t.poblacion)
    const nombre = `${t.id}: ${t.label} (hoy ${t.hoy ?? 'sin población'})`
    if (t.estado === 'informativa') {
      it.skip(nombre, () => {})
      continue
    } // se imprime en pnpm sim, no afirma
    it(nombre, () => {
      if (pob.length < Math.max(t.nMin, CENSUS_N_MIN)) return // «n insuficiente»: se imprime, no falla
      const v = t.medida(pob)
      if (t.min !== undefined) expect(v).toBeGreaterThanOrEqual(t.min)
      if (t.max !== undefined) expect(v).toBeLessThanOrEqual(t.max)
    })
  }
  it('ninguna etapa generada llega degradada y el p95 de intentos es ≤ 3', () => {
    const gen = rows.filter((r) => r.routeSource !== 'real')
    expect(gen.filter((r) => r.degradado).length).toBe(0)
    expect(aggregate(gen, () => 'todo').todo!.num.intentos!.p90).toBeLessThanOrEqual(3)
  })
  it('el desnivel por tramos y por bloques cuentan lo mismo dentro del 5 % en las reinas', () => {
    const reinas = rows.filter((r) => r.kind === 'reina' && r.routeSource !== 'real')
    const deltas = reinas
      .map((r) => Math.abs(r.dPlus - r.dPlusBloques) / r.dPlusBloques)
      .sort((a, b) => a - b)
    expect(deltas[Math.floor(deltas.length * 0.9)]).toBeLessThan(0.05)
  })
})
```

```ts
// packages/engine/src/sim/routeCensus.test.ts (test:bancos)
it('finishType se mide como lo lee el motor: un muro_meta de 1,0 km al 12 % con 2 km de aproximación a amplitud 2,5 tipa muro', () => {
  const profile = renderSkeleton(/* ud_muro_final canónico, sección 8 */)
  const [r] = routeCensus([raceDePrueba(profile)])
  expect(r.finishType).toBe('muro')
  expect(r.lastClimbKm).toBeCloseTo(1.0, 1)
})
it('climbKmOutsideLast30 separa reina-150 de una reina de verdad', () => {
  expect(routeCensus([raceDePrueba(queenScenario().input.profile)])[0].climbKmOutsideLast30).toBe(0)
  expect(
    routeCensus([raceDePrueba(frozenProfile(FROZEN_QUEENS[0]))])[0].climbKmOutsideLast30,
  ).toBeGreaterThan(0)
})
it('el censo es determinista y cabe en un push', () => {
  const t0 = performance.now()
  const a = routeCensus()
  const b = routeCensus()
  expect(a).toEqual(b)
  expect(performance.now() - t0).toBeLessThan(10_000) // 2 × 0,57 s medidos; techo holgado para CI cargado
})
```

```ts
// packages/engine/src/sim/calendarQueens.test.ts (añadido a las cinco aserciones de hoy)
it('la muestra estratificada cubre los 16 estratos poblados y conserva los extremos', () => {
  const todas = allCalendarQueens()
  const muestra = calendarQueenSample(todas)
  expect(muestra.length).toBeGreaterThanOrEqual(25)
  expect(muestra.length).toBeLessThanOrEqual(34)
  expect(muestra[0]!.dPlus).toBeLessThanOrEqual(todas[5]!.dPlus)
  expect(muestra.at(-1)!.dPlus).toBeGreaterThanOrEqual(todas.at(-6)!.dPlus)
  for (const e of estratos(todas))
    if (e.n > 0) expect(muestra.some((q) => e.contiene(q))).toBe(true)
})
it('la cubeta < 1.500 la sostiene el diseño, no el test', () => {
  const facil = calendarQueenSample().filter((q) => q.dPlus < 1500)
  expect(facil.length, 'cubeta < 1.500 despoblada: decisión D6, sección 18').toBeGreaterThanOrEqual(
    3,
  )
  expect(facil.some((q) => q.skeleton === 'et_reina_blanda')).toBe(true)
})
```

```ts
// packages/engine/src/sim/preRegistro.test.ts
it('toda banda que lee perfiles generados tiene dirección pre-registrada', () => {
  for (const banda of BANDAS_SOBRE_GENERADO)
    // las 17 del mapa 04 §2, escritas como lista
    expect(
      PRE_REGISTRO.find((p) => p.banda === banda),
      banda,
    ).toBeDefined()
})
it('GENERATED_QUEENS siguen teniendo la forma con la que se eligieron', () => {
  for (const q of GENERATED_QUEENS) {
    const { stage } = findStage(q.raceId, q.stageIndex)
    expect(finalKindOf(stage.profile)).toBe(q.finalKind)
    expect(stage.arch?.skeleton).toBe(q.skeleton)
  }
})
```

---

## 14. Rendimiento y arranque: la medida

Las cinco propuestas estimaron el coste de arranque «por debajo de un segundo» sin medirlo (`juicios/cobertura.md` §5 riesgo 7; `juicios/ejecutabilidad.md` §5 riesgo 3; el mapa 03 §7 tampoco pudo, porque no había `node_modules`), y las dos que hablaron de calendario perezoso lo dejaron como «si molesta» (arquitectura §4.8, geografía §13.6). El juez del motor sí midió (`juicios/motor.md` §1, script `juicios/coste-motor.mjs` sobre `packages/engine/dist`, node 22.22, `ENGINE_VERSION` 69), y su cifra es la línea base de esta sección. La decisión 35 convierte la estimación en tres cosas concretas: un instrumento (`scripts/medir-arranque.mjs`) que corre en el paso 0 y en el paso 8, una guarda en `test:rapido` (`routes/arranque.test.ts`) con objetivo y techo en `ARCH.arranque`, y un diseño de calendario perezoso por carrera que se aplica en el mismo paso 8 si la medida supera el techo. Nada de esto es condicional en el sentido de «ya se verá»: lo que hay que hacer en cada resultado está escrito aquí.

### 14.1 Lo que se sabe hoy, con cifra y fuente

| Medida                                                                                                                        | Valor                                                                                                                                                                                                           | De dónde sale                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Carga del módulo `routes/calendar.js` (evalúa las tablas, construye 842 carreras y 1.418 etapas, ordena por `startDay`)       | 578 ms                                                                                                                                                                                                          | `juicios/motor.md` §1, `coste-motor.mjs` l. 1-3 y l. 11 (`performance.now()` alrededor del `import`) |
| Segmentos totales del calendario / media por etapa                                                                            | 46.354 / 32,7                                                                                                                                                                                                   | `juicios/motor.md` §1                                                                                |
| Una pasada de `sampleProfile` + `finishType(deriveFinishTerrain)` + `stageKindOf` + `finalKindOf` sobre las 1.418 etapas      | 569 ms, 0,40 ms por etapa, 2.046.087 bloques                                                                                                                                                                    | `juicios/motor.md` §1                                                                                |
| Solo `sampleProfile` sobre las 1.418                                                                                          | 411 ms (0,29 ms por etapa, cociente de las dos cifras anteriores)                                                                                                                                               | `juicios/motor.md` §1                                                                                |
| `sampleProfile` de un perfil denso (120 segmentos, 264 km, lo que sería una Ronde o una Roubaix generada)                     | 0,92 ms                                                                                                                                                                                                         | `juicios/motor.md` §1, `coste-motor.mjs` l. 38-44                                                    |
| Ficheros de test que pagan la carga entera del módulo                                                                         | 12 fuera del motor (`packages/db` y `apps/api`, que importan `@cyclingstar/engine` por su `dist`, mapa 06 §0) más 6 del motor que cargan `calendar`: 18 cargas por pasada de la suite, una por worker de vitest | `juicios/motor.md` §1                                                                                |
| `sim/world.ts` calcula `CALENDARIO` por división al cargar el módulo, leyendo `st.kind` de cada etapa de `SEASON_CALENDAR`    | `sim/world.ts` l. 169-186 y l. 188-192                                                                                                                                                                          | mapa 04 §1; `juicios/motor.md` §5 riesgo 1                                                           |
| Relojes de los bancos que corren perfiles generados (no cambian con esta sección, pero acotan la remedición de la sección 13) | `calendarQueens` 3.600 s (126 s en máquina libre, 370 cargada), `smallTours` 3.900 s, `realQueens` 900 s, saturación 1.800 s, las doce vueltas 5.400 s                                                          | mapa 06 §3.1-3.2                                                                                     |

Dos lecturas de esa tabla que ordenan lo demás. Primera: hoy el generador NO llama a `sampleProfile` (el mapa 01 no cita ninguna llamada a `stage/` en `profileGen.ts`, que solo escribe `Segment[]`, y el propio juez separa la carga del módulo de la pasada de muestreo), así que los 578 ms son evaluación del módulo, tablas y dibujo de 1.418 perfiles de 32,7 segmentos de media; la pasada de 0,40 ms por etapa es un coste que hoy nadie paga en el arranque y que arquitectura §4.7 habría añadido por intento. Segunda: el juez calcula que verificar con `sampleProfile` por intento, con perfiles de 60 a 120 segmentos y un p90 de 1 a 2 intentos, añadiría «del orden de 0,5 a 1,5 s por temporada» y llevaría el módulo «de 0,6 s a unos 2 s», multiplicado por el número de temporadas en los tests que las generan (`juicios/motor.md` §1). Ese coste no se paga: por la decisión 4, `verify` solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `dPlusDe` y geometría del esqueleto (sección 9), y `finishType` se mide una vez por calendario en `routeCensus` (0,57 s medidos sobre 1.418 etapas, `juicios/motor.md` §1 vía decisión 31), que cabe en cada push de `test:rapido`.

### 14.2 Lo que la gramática añade por etapa

Por etapa, `generateStage` (sección 8) instancia ≤ 12 motivos, coloca por ventanas, rinde ≤ 80 segmentos con `climb`, `descent` y `rolling`, cuadra con `normalizeEnlaces`, corrige con `garantizaClase`, emite pancartas y verifica; todo O(segmentos) con constantes pequeñas, y se repite hasta `ARCH.colocacion.maxIntentos` 8 veces en el peor caso, con `ARCH.veto.intentosP95` 3 como exigencia del paso 4 (`skeletons.test.ts`). Ninguna llamada a `stage/`: ni `sampleProfile`, ni `deriveFinishTerrain`, ni `finishType`, ni `costBase` (decisión 4; el test de §14.4 lo comprueba sobre el fuente).

La estimación, escrita para que se vea por qué el objetivo es 1.500 ms y el techo 2.500 y no otra cosa. Si TODOS los 578 ms de hoy fueran dibujo de perfiles (no lo son: incluyen evaluar un módulo de 3.648 líneas (`routes/calendar.ts`), `featureProfile` para las 177 etapas reales y la ordenación), el coste por etapa sería 0,41 ms a 32,7 segmentos; con el tope de 80 segmentos (×2,45) y una media de 1,3 intentos (compatible con un p95 de 3) saldrían 1,30 ms por etapa, 1.840 ms el calendario. Ese es el peor caso de la estimación, por encima del objetivo y por debajo del techo. El caso esperado es bastante menor: 80 segmentos es el tope de `ud_adoquin` y `ud_muros`, no la media (una `et_llana` son un `enlace`, quizá un `expuesto` y una `meta`, menos de 20 segmentos), y buena parte de los 578 ms no es dibujo. Por eso `ARCH.arranque.objetivoMs` 1.500 (×2,6 sobre hoy) es lo que se espera cumplir sin hacer nada, y `techoMs` 2.500 (×4,3) es donde el diseño cambia de forma (§14.6). La estimación no sustituye a la medida: se mide en el paso 0 (línea base con el generador viejo) y en el paso 8 (con el nuevo), y las dos cifras van a `docs/balance.md` «v61 §0» y «v61 §1».

### 14.3 El instrumento: `scripts/medir-arranque.mjs`

Vive en `scripts/` y no en `packages/engine/src` por la misma razón que `scripts/medir-carrera.mjs` l. 6-8: el motor es puro y esto es herramienta de banco que lee del `dist` compilado. Uso: `pnpm --filter @cyclingstar/engine build && node scripts/medir-arranque.mjs [--n 5] [--temporadas 3]`. Lo que hace, en orden:

1. Se lanza a sí mismo `n` veces (por defecto 5) como proceso hijo con `child_process.execFileSync(process.execPath, [ruta, '--una'])`, porque la carga de un módulo solo se puede medir una vez por proceso. Cada hijo imprime una línea JSON; el padre agrega y da mediana y máximo. Es lo que `coste-motor.mjs` no hacía (una sola corrida) y lo que hace falta para que el número de `balance.md` no sea el de un runner cargado (la variación medida entre dos noches del nocturno es del 30 %, `vitest.config.ts` l. 19-20).
2. En cada hijo, `--una`: `t0 = performance.now()`, `await import('../packages/engine/dist/routes/calendar.js')`, `t1`; cuenta carreras, etapas y segmentos de `SEASON_CALENDAR` (mismas tres cifras que la tabla de §14.1, para que la comparación con el juez sea directa) y, tras el paso 8, el histograma de `arch.intentos` y el número de `arch.degradado` (cero exigido por `ARCH.veto.fallbackMaxShare.calendario`).
3. Después mide `calendarForSeason(s)` para `s` de 1 a `--temporadas` (por defecto 3), cada una una sola vez (la segunda lectura es memoizada y cuesta cero por definición), con el delta de `process.memoryUsage().heapUsed` antes y después de cada temporada. En el paso 0 la función no existe todavía: el script lo detecta (`typeof mod.calendarForSeason !== 'function'`) e imprime `n/a` en esas filas, y la línea base es solo la temporada 0.
4. Por referencia, una pasada de `sampleProfile` + `finishType` + `stageKindOf` + `finalKindOf` como la del juez (mismo código que `coste-motor.mjs` l. 14-27, `groupSize` 50), para que el 0,40 ms por etapa siga siendo comparable cuando los perfiles tengan más segmentos. No es coste de arranque; es el coste de la única pasada de motor que el censo paga.
5. Imprime una tabla Markdown lista para pegar en `balance.md`, con estas filas y las columnas «mediana», «máximo», «fuente»: carga del módulo (ms); carreras / etapas / segmentos / segmentos por etapa; temporada 1, 2, 3 (ms y MB de heap cada una); pasada de motor (ms y ms por etapa); intentos p50 / p95 / máx; degradados.

Criterio del paso 0: la mediana de la carga del módulo tiene que reproducir los 578 ms del juez dentro de ± 20 % (es el mismo `dist` y la misma máquina de trabajo; si no, se anota la máquina y se toma la nueva mediana como línea base). Criterio del paso 8: mediana ≤ `objetivoMs` es verde; entre objetivo y techo es amarillo (se anota y se entrega; el paso 9 puede recortar rangos si el histograma de intentos explica el exceso); mediana > `techoMs` dispara §14.6 dentro del propio paso 8, antes de subir `ENGINE_VERSION`.

### 14.4 La guarda: `routes/arranque.test.ts`

El script mide sobre `dist`; el test guarda en cada push. Corre en `test:rapido` (no está en `sim/`), importa `constants.js` ANTES de arrancar el reloj (así ni `constants.ts` ni `@cyclingstar/shared` cuentan, solo `calendar.ts`, `grammar/`, `editions.ts` y las tablas), y usa `import()` dinámico porque un `import` estático se evaluaría antes que el `performance.now()`. Vitest transforma el TypeScript al vuelo, así que la cifra del test es mayor que la del `dist` y por eso la asserción dura es contra el techo, no contra el objetivo (el objetivo se avisa con `console.warn`). El nocturno corre con instrumentación de cobertura, medida ×1,75 a ×2,02 test a test (`vitest.config.ts` l. 17-18): en ese caso, y solo en ese (`npm_lifecycle_event === 'test:coverage'`, que es el nombre del script que el nocturno lanza, `package.json` l. 19), los topes se multiplican por 2.

```ts
// packages/engine/src/routes/arranque.test.ts
import { describe, expect, it } from 'vitest'
import { ARCH } from '../constants.js'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const K = process.env.npm_lifecycle_event === 'test:coverage' ? 2 : 1 // instrumentación ×1,75-2,02 medida

describe('routes/arranque: el calendario se construye dentro de ARCH.arranque', () => {
  it('la temporada 0 (SEASON_CALENDAR) cuesta menos que el techo, y avisa por encima del objetivo', async () => {
    const t0 = performance.now()
    const { SEASON_CALENDAR } = await import('./calendar.js')
    const ms = performance.now() - t0
    expect(SEASON_CALENDAR).toHaveLength(842)
    if (ms > ARCH.arranque.objetivoMs * K)
      console.warn(`arranque ${ms.toFixed(0)} ms > objetivo ${ARCH.arranque.objetivoMs}`)
    expect(ms).toBeLessThanOrEqual(ARCH.arranque.techoMs * K)
  })

  it('una temporada adicional cuesta ≤ porTemporadaMs y la segunda lectura devuelve la misma referencia', async () => {
    const { calendarForSeason } = await import('./grammar/edition.js')
    const costes = [1, 2, 3].map((s) => {
      const t = performance.now()
      calendarForSeason(s)
      return performance.now() - t
    })
    const mediana = [...costes].sort((a, b) => a - b)[1]
    expect(mediana).toBeLessThanOrEqual(ARCH.arranque.porTemporadaMs * K)
    const t = performance.now()
    const otraVez = calendarForSeason(2)
    expect(performance.now() - t).toBeLessThan(5) // memoizada: no se reconstruye
    expect(otraVez).toBe(calendarForSeason(2)) // misma referencia, no copia
  })

  it('grammar/ no importa nada de stage/: el arranque no paga sampleProfile ni finishType', () => {
    const dir = join(import.meta.dirname, 'grammar')
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8')
      expect(src, f).not.toMatch(/from '\.\.\/\.\.\/stage\//)
      expect(src, f).not.toMatch(/sampleProfile|deriveFinishTerrain|finishType|costBase/)
    }
  })
})
```

El tercer test es la versión de fichero entero del que la sección 9 pone sobre `veto.ts`: no es una medida, es la razón por la que la medida no puede dispararse por una recalibración de `STAGE.finish*`. `routeCensus.ts` sí importa `stage/` (mide `finishType` con `groupSize` 50) y por eso vive en `sim/` y no en `grammar/`.

### 14.5 Memoización por temporada y lo que pagan los tests

`calendarForSeason(season)` (sección 10, `grammar/edition.ts`) guarda cada temporada en un `Map<number, CalendarRace[]>` del módulo y `raceForSeason(raceId, season)` en un índice `Map<string, CalendarRace>` por temporada construido con el calendario; `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)` es la única entrada que se paga al cargar. Tres decisiones de coste sobre ese `Map`:

1. **Las etapas `real` se construyen una vez y se comparten por referencia entre temporadas.** No varían nunca (sección 11: una edición real es un año concreto), así que `buildRace(row, season)` toma el resultado de `featureSpec` de un `Map<string, CalendarStage[]>` por `raceId` y lo reutiliza; una temporada adicional solo dibuja las 1.241 etapas generadas y de edición, no las 177 reales. Es lo que hace que `porTemporadaMs` 1.000 pueda ser menor que `objetivoMs` 1.500: la temporada 0 paga además la evaluación del módulo y `featureProfile`.
2. **Tope de temporadas en memoria: 8.** Un mundo vivo pide una temporada por año de juego (`calendarRun.ts` l. 135: `season = floor(gameDay / SEASON_DAYS)`) y el proceso de `apps/api` no se reinicia por eso; `ejecutabilidad.md` §5 riesgo 3 señala que un `Map` sin tope «acumula una temporada más por año de mundo sin liberar». Con más de 8 entradas se borra la más antigua insertada. Es seguro porque `calendarForSeason` es pura y determinista (sección 10): reconstruir una temporada borrada devuelve exactamente lo mismo, al precio de ≤ `porTemporadaMs`. El tope es un literal de `edition.ts` (`MAX_TEMPORADAS_EN_MEMORIA = 8`), no de `ARCH`, porque no es intención de diseño sino límite de proceso. El script de §14.3 imprime los MB de heap por temporada para que el 8 se pueda revisar con cifra.
3. **Con `ARCH.edicion.activa: false` no hay coste por temporada**: `calendarForSeason(s)` devuelve la misma referencia de la temporada 0 para todo `s` (sección 10).

Lo que pagan los tests que generan temporadas, con el tope que `porTemporadaMs` impone y el valor esperado (mitad del tope, por el argumento de §14.2), teniendo en cuenta que vitest aísla cada fichero (`vitest.config.ts`, `isolate` por defecto), de modo que una temporada construida en un fichero no sirve a otro:

| Fichero                                                                                                                                        | Temporadas que construye      | Tope            | Esperado          |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------- | ----------------- |
| `grammar/edition.test.ts` (sección 10, identidad 1 a 5 contra 0)                                                                               | 0 + 5                         | 2,5 + 5 s       | ≈ 1 + 2,5 s       |
| `grammar/calendario.test.ts` (sección 13, cero degradados en las temporadas 0 a 3)                                                             | 0 + 3                         | 2,5 + 3 s       | ≈ 1 + 1,5 s       |
| `sim/routeCensus.test.ts` (sección 13, censo sobre 0 a 3)                                                                                      | 0 + 3, más 4 censos de 0,57 s | 2,5 + 3 + 2,3 s | ≈ 1 + 1,5 + 2,3 s |
| `routes/arranque.test.ts` (esta sección)                                                                                                       | 0 + 3                         | 2,5 + 3 s       | ≈ 1 + 1,5 s       |
| `db/recorridoDelMundo.test.ts` (sección 10, «dos temporadas, dos recorridos, un esqueleto»)                                                    | 0 + 1, sobre `dist`           | 2,5 + 1 s       | ≈ 1 + 0,5 s       |
| Los demás ficheros que cargan `calendar` (los 17 de hoy sin `recorridoDelMundo`, más `golden.test.ts` y `realFingerprint.test.ts`, sección 11) | solo la 0                     | 2,5 s cada uno  | ≈ 1 s cada uno    |

Suma de topes de temporadas adicionales en toda la suite: 15 s; esperado ≈ 7,5 s, repartidos en cinco ficheros que ya tienen `testTimeout` de 30 s de suelo (`vitest.config.ts` l. 25). Ningún test genera más de cinco temporadas, y ningún test construye temporadas en un bucle: si un test nuevo necesita más, la sección 15 lo lista con su coste.

### 14.6 Calendario perezoso por carrera: el diseño que se aplica si se supera el techo

Decisión tomada, no condicional: lo condicional es solo el disparo (mediana del paso 8 > `techoMs` 2.500). El diseño es este, para que quien lo aplique no tenga que decidir nada:

- `calendarForSeason(s)` sigue devolviendo `CalendarRace[]` completo y ordenado, con todo lo que sale de las tablas y de la composición construido de forma inmediata: los campos de hoy de `CalendarRace` (`calendar.ts` l. 48-79, mapa 02 §1: `id`, `name`, `level`, `raceClass`, `format`, `startDay`, `openTo`, `region`, `championshipCountry`, `championshipCategory`, `country`, `restAfter`) más `routeSource`, y en cada `CalendarStage` (`calendar.ts` l. 33-46 y sección 3, §3.11) `index`, `name`, `kind`, `timeTrial` y `routeSource`. Todo eso es identidad (`itinerarioDe`, sección 7, y `kind = Skeleton.kind` garantizado por V6, sección 9, también cuando el reintento acaba en la plantilla canónica) y no exige dibujar un perfil.
- `profile`, `arch` y `label` de cada `CalendarStage` pasan a ser propiedades de acceso (`Object.defineProperty` con `get`) que llaman a `generateStage(req)` la primera vez y guardan el resultado en la propia etapa. La `StageRequest` completa queda cerrada en el getter; `generateStage` es pura y determinista, así que el perfil es el mismo se lea cuando se lea. `label` va con el perfil porque sale de `stageKindOf(profile).label` (decisión 23).
- Quién fuerza qué: `sim/world.ts` l. 169-186 lee `kind` y no fuerza nada; `callups.ts` l. 98 y `calendarRun.ts` l. 516 leen `kind` y no fuerzan nada; `freezeRaceRoute` fuerza las etapas de UNA carrera el día de su etapa 1 (`calendarRun.ts` l. 1603); `raceContext.ts::terrenoRestante` lee el congelado (decisión 23) y no fuerza; la API de calendario fuerza la carrera que se consulta. Un proceso de `apps/api` dibuja así solo las carreras que su mundo toca, en vez de las 842 al arrancar.
- Lo que NO cambia: `routeCensus`, `calendario.test.ts`, `golden.test.ts` y `realFingerprint.test.ts` recorren todas las etapas y fuerzan todo, y por eso el test de §14.4 mide, en modo perezoso, la construcción inmediata (`SEASON_CALENDAR.length`) más un recorrido explícito `for (const r of SEASON_CALENDAR) for (const s of r.stages) s.profile` dentro del mismo reloj; la cifra que se compara con el techo es la de las 1.418 etapas dibujadas, igual que en modo inmediato. El modo perezoso no baja esa cifra; baja lo que paga un proceso que no las dibuja todas (la API, los tests de `db` y `api` que solo leen `kind`).
- El modo perezoso es un cambio de `edition.ts` y `calendar.ts` en el mismo paso 8, antes de `ENGINE_VERSION` 69 → 70, con un test más en `arranque.test.ts`: «leer `kind` de las 1.418 etapas no dibuja ningún perfil» (contador de llamadas a `generateStage` a cero tras recorrer `kind`, y a 1.418 tras recorrer `profile`).

### 14.7 Coste de simulación: lo que no cambia

Un perfil con más segmentos solo encarece `sampleProfile`, que es O(bloques × segmentos) y se ejecuta una vez por etapa (mapa 03 §2, `locate` l. 80-93; mapa 03 §7): medido, 0,29 ms de media hoy y 0,92 ms para 120 segmentos y 264 km (`juicios/motor.md` §1). El bucle de simulación es O(bloques × corredores) con varias pasadas por bloque (mapa 03 §7, `simulate.ts` l. 4757-4759) y no lee el número de segmentos; el número de bloques es `round(km / 0,1)` (`sample.ts` l. 70), así que lo único de esta sección que mueve el coste de una etapa simulada son los kilómetros, y `ARCH.km.porClase` (sección 7) los baja en .2 (p90 ≤ 170) y en las 142 carreras de un día que hoy están a 210. La memoria por etapa (dos `Float64Array(n)` y el array de `Block`, mapa 03 §7) tampoco cambia. Los relojes de los bancos de la sección 13 no se tocan por rendimiento: se tocan, si se tocan, por la remedición.

### 14.8 Qué queda escrito y dónde

En `docs/balance.md` «v61 §0»: la tabla del script en el paso 0 (línea base con el generador viejo: 578 ms esperados ± 20 %). En «v61 §1»: la misma tabla tras el paso 8, con el histograma de intentos, los degradados (cero) y, si se aplicó §14.6, la cifra inmediata y la forzada. En `constants.ts`, el comentario de `ARCH.arranque` cita las dos tablas. Si el paso 9 estrecha rangos por el p95 de intentos (sección 17, riesgo 9), se vuelve a correr el script y se añade una fila. La sección 15 lleva el script en el paso 0 y el test en el paso 8 como tests primero.

---

## 15. El plan de implementación por pasos, tests primero

Doce pasos, del 0 al 11. Los pasos 1 a 7 añaden módulos bajo `packages/engine/src/routes/grammar/` sin un solo llamador en producción, así que no cambian el calendario que el juego corre; el paso 8 los conecta y es el único que sube `ENGINE_VERSION`; el 9 remide los bancos; el 10 lleva el origen y la temporada hasta la base y la pantalla; el 11 cierra la documentación. El orden está pensado para que cada paso sea entregable y reversible por sí solo, y para que la remedición del paso 9 separe «forma nueva» de «fontanería nueva» (por eso existe el paso 1) y «forma nueva» de «geografía nueva» (por eso la galería del paso 4 se entrega antes de conectar nada).

### 15.1 Reglas comunes a todos los pasos

1. **Tests primero.** Cada paso empieza escribiendo el fichero de test con las aserciones que abajo se listan, y se cierra con `pnpm typecheck && pnpm test` en verde (`Claude.md` § Tests, vía mapa 06 §0). Lo que hoy no puede pasar se escribe igual y se marca `it.todo` con la cifra medida en el nombre; encenderlo es un cambio de una línea y deja rastro en el diff.
2. **Un solo salto de `ENGINE_VERSION`**, en el paso 8: 69 → 70 (`constants.ts` l. 718, `index.test.ts` l. 381), o el siguiente número libre si al empezar producción ya ha pasado de 69. Los pasos 1 a 7 no cambian un byte de `SEASON_CALENDAR` y lo demuestra `routes/golden.test.ts` (paso 1); un paso que lo rompa antes del 8 está mal hecho y se para. Es la regla de `Claude.md` § Código («todo cambio de comportamiento del motor incrementa `engine_version`») aplicada al revés: sin cambio de conducta, sin salto.
3. **Presupuesto de reloj ≥ 4× lo que cuesta en CI** para todo test que simule (`invariants.test.ts` l. 297-298, `coherence.test.ts` l. 100-104, mapa 06 §0). Los tests de la gramática son de geometría y no simulan; el único que muestrea perfiles es `motifs.test.ts` (paso 3) y se le pone reloj propio.
4. **Los bancos corren en cada push que toque `packages/engine/`** (`ci.yml` l. 112, mapa 06 §0). Como los pasos 1 a 7 no cambian perfiles, los bancos siguen en verde sin remedir; el paso 8 los pone en rojo a propósito y el 9 los re-sella. Ningún paso intermedio remide nada.
5. **`backfillRaceRoutes` antes del paso 8** en cualquier mundo vivo (`db/raceRoutes.ts` l. 86-91: «se corre con el generador ACTUAL a propósito»; decisión 45). El mundo se reinicia antes del lanzamiento, así que en la práctica es una línea en `docs/ops.md`; pero si un mundo de pruebas sobrevive, se corre.
6. **Nada de `Math.random` ni `Date.now`** (`Claude.md` § Código). Todo dado sale de `routeRng(seed)(subflujo)` con los subflujos nominales cerrados de la sección 8; un subflujo nuevo se declara en la lista de `edition.ts` antes de usarse.
7. **Una nota de `docs/balance.md`**: «v61 · El generador es una gramática», con §0 (línea base, paso 0), §1 (el cambio, paso 8), §2 (remedición, paso 9) y §3 (base y pantalla, paso 10). Hoy la última nota es la v60 (su última subsección es «v60 §18»); si al implementar ya existe una v61, toma el siguiente número libre y el documento lo dice así.
8. **Toda constante nueva va en `ARCH` con su comentario de intención** (sección 12) y todo literal que se retire de `profileGen.ts` se cita con su valor de hoy en la nota de balance. Los literales de los ocho generadores viejos no se mueven a `ARCH` en ningún paso intermedio (los valores de `ARCH` son los nuevos y el golden exige los viejos): se van con el fichero en el paso 8.
9. **Un paso, un PR.** Los pasos 2 y 3, 6 y 7, y 9 y 10 pueden ir en paralelo porque no comparten ficheros (§15.14); ninguno se junta con el 8.

La tabla resume el plan; cada paso se detalla después.

| Paso | Qué                                       | Ficheros nuevos o tocados                                                                                                                                                                | ¿Cambia `SEASON_CALENDAR`? | Versión | Sesiones                               | Riesgo                             |
| ---- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------- | -------------------------------------- | ---------------------------------- |
| 0    | Línea base y medida                       | `sim/routeCensus.ts`, `sim/routeCensus.test.ts`, `grammar/calendario.test.ts` (con `it.todo`), `scripts/medir-real.mjs`, `scripts/medir-arranque.mjs`                                    | no                         | no      | 1                                      | ninguno                            |
| 1    | Congelar y extraer primitivas             | `routes/golden.test.ts`, `routes/realFingerprint.test.ts`, `profileGen.ts` (primitivas), `grammar/motifs.ts` y `grammar/skeletons.ts` (solo tipos), `grammar/legacy.ts`                  | no (byte a byte)           | no      | 2                                      | bajo                               |
| 2    | Geografía                                 | `grammar/geo.ts`, `grammar/regions.ts`, sus tests                                                                                                                                        | no                         | no      | 2 + 1 de contenido                     | medio (dato opinable)              |
| 3    | Motivos                                   | `grammar/motifs.ts` (catálogo y `renderMotif`), `constants.ts::ARCH.motivo/meta`, `motifs.test.ts`                                                                                       | no                         | no      | 2                                      | medio (muro en meta)               |
| 4    | Esqueletos, colocación, rendido y galería | `grammar/skeletons.ts`, `grammar/place.ts`, `grammar/render.ts`, `grammar/geometry.ts`, `scripts/galeria-recorridos.mjs`, tests                                                          | no                         | no      | 3                                      | medio                              |
| 5    | Vetos y `generateStage`                   | `grammar/veto.ts`, `grammar/generate.ts`, tests                                                                                                                                          | no                         | no      | 2                                      | bajo                               |
| 6    | Identidad y temporada                     | `grammar/edition.ts`, `edition.test.ts`                                                                                                                                                  | no                         | no      | 1                                      | bajo                               |
| 7    | Composición                               | `grammar/tour.ts`, `tour.test.ts`                                                                                                                                                        | no                         | no      | 2                                      | medio-bajo                         |
| 8    | El cambio de calendario                   | `routes/calendar.ts`, `stageKind.ts`, `constants.ts`, `apps/api/src/stageHistory.ts`, `sim/legacy/profileGenLegacy.ts`, tests re-sellados                                                | **sí**                     | 69 → 70 | 2                                      | alto (única tanda que rompe tests) |
| 9    | Remedición de bancos                      | `sim/frozenSkeletons.ts`, `sim/targets.ts`, `sim/scenarios.ts`, bancos                                                                                                                   | no (ya cambió)             | no      | 2 humanas + 4 h de máquina (techo 8 h) | medio (coste)                      |
| 10   | Base, API y web                           | migración `00NN_race_routes_kind.sql`, `db/raceRoutes.ts`, `calendarRun.ts`, `callups.ts`, `raceContext.ts`, `apps/api/src/routes/calendar.ts`, web, `scripts/inventario-recorridos.mjs` | no                         | no      | 2                                      | bajo                               |
| 11   | Documentación                             | `docs/generador.md`, `docs/balance.md`, `docs/motor.md`, `SPEC.md`, `stageKind.ts` l. 44-58, `calendar.ts` l. 2                                                                          | no                         | no      | 1                                      | ninguno                            |

### 15.2 Paso 0 · Línea base y medida (sin cambio de conducta, sin versión)

Es el paso que hace posible el protocolo «mejor y no solo distinto» de la sección 13: sin una foto del calendario de hoy no hay dirección pre-registrada ni tabla pareada.

**Tests primero.**

- `sim/routeCensus.test.ts` (unidad del censo, corre con `test:bancos` porque `test:rapido` excluye `packages/engine/src/sim/**`, `package.json` l. 20): un perfil literal de 3 segmentos (`llano` 100 km, `puerto` 12 km al 7 % con pancarta `cima`, `llano` 8 km) da `nPuertos 1`, `longestClimbKm 12`, `lastClimbKm 12`, `kmAfterLastClimb 8`, `finalKind 'valle_corto'`, `dPlus 840`; un perfil sin puertos da `lastClimbKm null` y no 0 (misma regla que `finalKind.test.ts` l. 61-70); `aggregate` por `kind` sobre tres filas devuelve recuentos y cuantiles correctos; `routeCensus()` sobre las 1.418 etapas de hoy termina por debajo de 2 s (medido 0,57 s por el juez del motor §1 con `coste-motor.mjs`: es la única llamada a `sampleProfile` que el diseño admite, y va aquí).
- `routes/grammar/calendario.test.ts` (corre en `test:rapido`): TODAS las bandas de `ROUTE_CENSUS_TARGETS` de la sección 13 escritas ya; las que hoy pasan, verdes (km de edición exactos, ningún segmento < 0,5 km salvo los 3 de 1.500 documentados, `kind` declarado coincide con `stageKindOf` en 1.346 de 1.418); las que hoy fallan, `it.todo` con la cifra medida en el nombre: `it.todo('finales muro ≥ 1 % (hoy 0 de 1.075)')`, `it.todo('subida fuera de 30 km: ninguna reina en 0 % (hoy N)')`, `it.todo('última cota de un día ≤ 4,2 km a [3; 17] en el 98 % (hoy N %)')`, `it.todo('p90 de km en .2 ≤ 170 (hoy 195)')`, `it.todo('ud_adoquin con [15; 30] sectores (hoy 3)')`, `it.todo('esqueletos distintos por clase (hoy 7 formas)')`. El N de cada nombre lo rellena el implementador con la salida del censo, no con la previsión de este documento.

```ts
// routes/grammar/calendario.test.ts (forma en el paso 0; en el paso 8 todos los `it.todo` pasan a `it`)
const filas = routeCensus() // SEASON_CALENDAR, 1.418 filas
const enLinea = filas.filter((r) => r.routeSource !== 'real' && !r.timeTrial)
it('los km de las etapas de edición cuadran al redondeo (verde hoy)', () => {
  for (const [id, ed] of Object.entries(RACE_EDITIONS))
    filas
      .filter((r) => r.raceId === id)
      .forEach((r) => expect(Math.round(r.km)).toBe(ed.stages[r.stageIndex - 1].km))
})
it.todo('finales muro ≥ 1 % de las etapas en línea generadas (hoy 0 de 1.075)')
it.todo('reinas con 0 % de subida a más de 30 km de meta: ninguna (hoy N de 157)')
it.todo('p90 de km en carreras .2 ≤ 170 (hoy 195)')
```

La regla de nombres: cada `it.todo` lleva la banda y la cifra de hoy entre paréntesis, de modo que el diff del paso 8 enseñe qué se encendió y desde dónde.

**Código.** `sim/routeCensus.ts` con la interfaz de la sección 3 (`RouteStats`, `routeCensus`, `aggregate`, `ROUTE_CENSUS_TARGETS`); `routes/grammar/geometry.ts` con `dPlusDe` (integración de tramos con g > 0) y `profileCorrelation` (correlación de los vectores g por km), que el censo necesita ya; `scripts/medir-real.mjs` movido desde `scratchpad/e1/medir-real.mjs` sin cambiar su salida (p10/p50/p90 de las 177 etapas reales por rasgo, `propuestas/datos.md` §1.4); `scripts/medir-arranque.mjs`, que mide en un proceso nuevo la carga de `packages/engine/dist/routes/calendar.js` y, cuando exista, `calendarForSeason(1)`.

**Entregable.** Tabla «v61 §0 · línea base del generador» en `docs/balance.md`: cada banda de realismo y variedad con su valor de hoy y su estado (verde / rojo), la tabla de `medir-real.mjs`, y la medida de arranque: la referencia del juez del motor §1 es 578 ms la carga, 46.354 segmentos (32,7 por etapa) y 0,40 ms por etapa una pasada de `sampleProfile` más lecturas; el implementador sustituye estas cifras por las suyas, en su máquina, con tres corridas y la mediana. Y la dirección pre-registrada de cada banda de simulación (decisión 30), escrita ANTES de tocar código.

**Qué cambia de conducta.** Nada. **Coste.** 1 sesión. **Riesgo.** Ninguno.

### 15.3 Paso 1 · Congelar lo de hoy y extraer primitivas (sin cambio de conducta, sin versión)

**Tests primero.**

- `routes/golden.test.ts`: una huella FNV-1a de 32 bits de `JSON.stringify(stage.profile)` por cada una de las 1.418 etapas de `SEASON_CALENDAR`, sellada en un fichero `golden.json` al lado del test y exigida igual. Se escribe y se sella ANTES de tocar `profileGen.ts`. Vive hasta el paso 8.
- `routes/realFingerprint.test.ts`: la misma huella para las 177 etapas con rasgos (`STAGE_FEATURES`) y para las 3 grandes vueltas enteras (`race-france`, `race-italy`, `race-spain`: 63 etapas, de las que 62 reales y la e21 de Francia generada, mapa 06 §1), sellada en `realFingerprint.json`. Este test SOBREVIVE al paso 8 y a todo lo que venga: es la garantía de que lo real no se toca (decisión 28). La e21 de Francia se sella aparte, con su propia clave, porque es la única de las 63 que el paso 8 cambia a propósito, y el test lo dice en el nombre.

```ts
// routes/realFingerprint.test.ts (forma)
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}
it('las 177 etapas con rasgos y las 3 grandes vueltas no cambian ni un byte', () => {
  for (const [clave, huella] of Object.entries(sellado)) {
    const stage = etapaPorClave(clave) // `${raceId}|${index}`
    expect(fnv1a(JSON.stringify(stage.profile)), clave).toBe(huella)
  }
})
it.todo('race-france e21 (llana generada) cambia en el paso 8 y se re-sella con la causa')
```

```ts
// routes/golden.test.ts (se borra en el paso 8; sus huellas pasan a sim/legacy/golden.test.ts)
import sellado from './golden.json' // { "race-x|1": 3735928559, ... } 1.418 entradas
it('las 1.418 etapas de SEASON_CALENDAR no cambian ni un byte hasta el paso 8', () => {
  let n = 0
  for (const race of SEASON_CALENDAR)
    for (const st of race.stages) {
      expect(fnv1a(JSON.stringify(st.profile)), `${race.id}|${st.index}`).toBe(
        sellado[`${race.id}|${st.index}`],
      )
      n++
    }
  expect(n).toBe(1418)
})
```

- `grammar/legacy.test.ts`: los ocho builders legado producen, para 60 semillas × `KM_ROAD = [130, 155, 175, 195, 215]` (los mismos de `stageKind.test.ts` l. 28), una lista de motivos con el MISMO número y orden de dificultades (`puerto`, `paves`) que los segmentos de la función vieja correspondiente, en 300 de 300 por builder. Es el test de I-42: prueba que la gramática puede expresar las formas de hoy antes de sustituirlas.
- `stageKind.test.ts` sin tocar sigue verde (los ocho `xxxSegments` se conservan hasta el paso 8).

**Código.**

- `profileGen.ts` exporta `hashInt`, `routeRng`, `between`, `split`, `climb(rand, len, avg, { gMax })`, `descent`, `rolling(rand, km, amp, pRompepiernas = 0)`; `gMax` por defecto `Infinity` y `amp` y `pRompepiernas` por defecto con los valores de hoy (1,8 / 3,2 y 0 / 0,35, `arquitectura.md` §12 paso 1) en las llamadas de los ocho generadores viejos, de modo que el golden no se mueve. Los ocho `xxxSegments`, `normalize` y `garantizaPuerto` siguen en el fichero, con sus literales, hasta el paso 8.
- `grammar/motifs.ts` y `grammar/skeletons.ts` solo con los TIPOS de la sección 3 (`MotifKind`, `MetaKind`, `Motif`, `Slot`, `Skeleton`, `SkeletonId`); sin catálogo ni lógica.
- `grammar/legacy.ts`: los ocho builders legado (`lg_flat`, `lg_hilly`, `lg_hilly_uphill`, `lg_mountain`, `lg_mountain_classic`, `lg_classic`, `lg_cobbles`, `lg_itt`, con `ittSegments === flatSegments` como hoy, mapa 01 §2.1) escritos como `Skeleton` con los rangos de hoy (mapa 01 §8) y una función `legacyMotivos(id, km, seed): Motif[]` que replica la decisión de cardinalidad por umbral de km y el orden fijo de cada generador viejo. Se borra en el paso 8.

**Qué cambia de conducta.** Nada; el golden lo demuestra byte a byte. **Qué se re-sella.** Nada. **Coste.** 2 sesiones. **Riesgo.** Bajo. La tabla pareada «igual dentro del ruido» de los legado contra los viejos se completa en el paso 4, cuando exista `renderSkeleton` (§15.6).

### 15.4 Paso 2 · Geografía (sin llamadores)

**Tests primero.** `grammar/geo.test.ts` y `grammar/regions.test.ts`, todos de consistencia interna porque la tabla es juicio (decisión 16):

| Aserción                                                                                                                                                                                                                                                                   | Sobre                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Las 29 claves de `GeoZone` tienen fila en `ZONAS`; en toda fila `min ≤ max` en todo rango                                                                                                                                                                                  | `ZONAS`                 |
| `puerto.km[0] ≥ 9` (o `puerto === null`); `cota.km[1] ≤ 8` (o `null`); `muro.km[1] ≤ 3` (o `null`); `adoquin ≥ 2` ⇒ `muro` no es `null` y `muro.adoquin` puede ser `true`; `amplitud ≤ ARCH.motivo.enlace.ampMax` (2,4); `relieve ∈ {montana, alta}` ⇒ `puerto !== null`   | `ZONAS`                 |
| `TERRITORIOS` tiene las 56 claves de países con carreras de equipos (lista literal en el test, sacada de `RACE_COUNTRY` y de las filas) sin `fallback`; los 77 restantes de `COUNTRIES` resuelven con `fallback: true` y el test imprime la lista de los 77                | `TERRITORIOS`           |
| `cordillera`, si no es `null`, está en `ruta` y `ZONAS[cordillera].relieve ∈ {montana, alta}`; `cordillera === null` exactamente en la lista literal de la decisión 13 (BE, NL, DK, AE, AU y los que la sección 6 cierre)                                                  | `TERRITORIOS`           |
| Las 20 filas `terrain: 'cobbles'` del calendario (mapa 07 §3) caen, vía `regionOf`, en una zona con `adoquin ≥ 2`                                                                                                                                                          | `RACE_REGION` + `ZONAS` |
| `RACE_REGION` tiene entrada para las 310 carreras de equipos (`SEASON_CALENDAR` sin los 532 `.NC`) y `stages` para las 60 carreras de `RACE_EDITIONS`; ninguna carrera de equipos cae a `zonaDe(country)` (el test intercepta `zonaDe` y cuenta 0 llamadas fuera de `.NC`) | `RACE_REGION`           |
| Los 20 ejemplos obligados de la sección 6 (`race-liege` → `ardenas`, `race-lombardy` → `italia_norte`, `race-france` e6 → `pirineos`...) como aserciones literales                                                                                                         | `RACE_REGION`           |

**Código.** `grammar/geo.ts` (`ZONAS`, `TERRITORIOS`, `zonaDe`, `admite`, `degradar`) y `grammar/regions.ts` (`RACE_REGION`, `regionOf`) con el contenido de la sección 6. La curación de `RACE_REGION` es una tarde de contenido con `raceRoutes.ts` abierto, y cuenta como sesión aparte.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones más 1 de contenido. **Riesgo.** Medio, y es de dato, no de código: una zona mal puesta produce carreras plausibles en el sitio equivocado. Lo mitiga la galería del paso 4 y la corrección como dato (sección 16).

### 15.5 Paso 3 · Motivos (sin llamadores)

**Tests primero.** `grammar/motifs.test.ts`, con reloj propio de 120 s porque es el único test de la gramática que llama a `sampleProfile`:

- Por cada uno de los 12 `MotifKind` y cada uno de los 9 `MetaKind`, 300 instancias con `routeRng('motifs-test-' + i)`: parámetros dentro del rango de `ARCH.motivo.*` / `ARCH.meta.*`; `validateMotif` acepta; `renderMotif` devuelve `Segment[]` con `Σ km` igual al `km` del motivo al 0,1 y, en todo `puerto`, `segment.km === Σ tramos.km` al 0,01 (guarda de I-8); ningún tramo con g > 20 ni < −14; nunca sale `rompepiernas` (decisión 2).
- `tendida` y `expuesto` se rinden `llano` con tramos (el motor no los cuenta en `kmSubida`, mapa 03 §4.1).
- `muro` adoquinado se rinde `puerto` con `pave: true` en sus tramos; `sector` con `firme: 'tierra'` se rinde `paves` de 2 o 3 estrellas.
- `circuito` con `vueltas: 9` rinde 9 veces el MISMO `Segment[]` de la vuelta (igualdad profunda), con la semilla de detalle `dib|…|hijo{h}` compartida.
- **El test de la ejecutabilidad, riesgo 7**: `muro_meta` con `km ≤ 1,0` y sus 2 km de aproximación a amplitud ≤ 2,5, rendido, muestreado con `sampleProfile` y leído con `finishType(deriveFinishTerrain(...), 50)`, da `'muro'` en 300 de 300; con `km ∈ (1,0; 2,2]` da `'puncheur'` en 300 de 300; `repecho` → `'puncheur'`; `alto_corto` y `alto_largo` → `'alto'`; `sector_meta` → `'pave'`. Si el 300 de 300 falla, se ajusta `ARCH.meta.muro.aproxKm` (2 → 3) antes que cualquier otra cosa, y se anota; el diseño lo prevé porque `deriveFinishTerrain` (`finish.ts` l. 94-123) funde rachas con `finishClimbGapBlocks` 5 y comprueba `alto` antes que `muro` (l. 165-189, juez del motor §1).

```ts
it('un muro de meta de hasta 1,0 km lo lee el motor como muro en 300 de 300', () => {
  let muros = 0
  for (let i = 0; i < 300; i++) {
    const rand = routeRng(`muro-${i}`)('mot')
    const m = instanciaMeta('muro_meta', rand, { kmMax: 1.0 })
    const profile = {
      segments: [
        ...aproximacion(rand, ARCH.meta.muro.aproxKm, ARCH.meta.muro.aproxAmp),
        ...renderMotif(m, rand),
      ],
    }
    if (finishType(deriveFinishTerrain(sampleProfile(profile)), 50) === 'muro') muros++
  }
  expect(muros).toBe(300)
})
```

**Código.** `grammar/motifs.ts` completo (`validateMotif`, `renderMotif`, instanciación por rangos de `ARCH`); `constants.ts` gana `ARCH.motivo` y `ARCH.meta` con los valores de la sección 12. Recalibración de `ARCH.reina.rellenoDplusPorKm` (5,5 m/km de partida): se rinden 1.000 `enlace` con la `amplitud` de cada zona, se mide `dPlusDe` por km, y el valor que queda es la mediana redondeada al 0,5; se anota en el comentario de la constante con la cifra medida.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Medio: el muro en meta exige precisión de bloque de 100 m y nadie lo ha probado contra el motor; por eso el test va antes que el catálogo de esqueletos, y su fallo tiene ya una respuesta escrita.

### 15.6 Paso 4 · Esqueletos, colocación, rendido y la galería (sin llamadores)

Es el paso más largo de código y el primero que el dueño ve.

**Tests primero.**

- `grammar/skeletons.test.ts`: catálogo bien formado (32 `SkeletonId`, 15 de un día y 17 de etapa; ventanas ordenadas y dentro de [0; 1]; el slot `meta` es el último y único; `requiere` solo cita claves de `GeoSignature`; `dPlus[0] ≤ dPlus[1]`; `km` dentro de `ARCH.km.maxPorClase` para alguna clase; `pesoBase > 0` salvo `ud_criterium`, que es 0 por D5). La plantilla `canonico` de cada esqueleto, rendida, da `stageKindOf(profile, timeTrial).kind === sk.kind` y `finalKindOf(profile) === sk.finalKind` donde lo declara: 32 de 32. Y por cada esqueleto × `KM_ROAD` (5 km) × 60 semillas × sus zonas compatibles (las que `admite`), el PRIMER rendido cumple V6 y V7 en ≥ 70 % de los casos; es la cota que hace alcanzable el `intentos` p95 ≤ 3 del paso 5 (con acierto ≥ 0,7 por intento, la probabilidad de necesitar más de tres es 0,3³ = 2,7 %, por debajo del 5 %). Un esqueleto por debajo del 70 % estrecha sus rangos antes de seguir (`ARCH.veto.intentosP95`).
- `grammar/place.test.ts`: colocación por ventanas sobre 1.000 esqueletos instanciados: ningún motivo empieza fuera de su ventana; dos dificultades consecutivas distan ≥ `ARCH.colocacion.enlaceMinimo` (1,5 km) salvo dentro de `cadena`; la bajada tras un `puerto` mide [0,6; 0,9] × su km; `Σ enlaces ≥ ARCH.colocacion.enlaceMinimoTotal` (12 %) o el intento se declara inviable y no se rinde.
- `grammar/render.test.ts`: `normalizeEnlaces` cuadra `Σ km` al 0,1 tocando solo enlaces y deja el residuo en el más largo; `garantizaClase` mueve el motivo que decide al borde con 0,3 / 0,7 km compensando en el enlace más largo y conserva `segment.km === Σ tramos`; «toda cota de una clásica mide ≤ 2,9 km»; `emitirPancartas` pone `cima` en todo `puerto` ≥ 1,5 km y SIEMPRE en el último `puerto` de la etapa (un `muro_meta` de 0,8 km lleva pancarta y `lastClimbKm` lo ve, decisión 25); un circuito de 9 vueltas con una cota de 2 km lleva 9 pancartas y con un muro de 1,1 km lleva 1 (la de meta).
- `grammar/legacy.test.ts` gana la tabla pareada: los ocho legado rendidos con `renderSkeleton` contra los ocho `xxxSegments`, 300 perfiles por pareja, medidos con `routeCensus`: `nPuertos` idéntico en distribución, y `|Δ p50|` de `dPlus`, `longestClimbKm` y `kmAfterLastClimb` menor que la desviación típica entre semillas de la pareja vieja. Es «igual dentro del ruido» (I-16, I-42): la fontanería nueva reproduce la forma vieja y, por tanto, lo que cambie en el paso 8 será forma y no fontanería.

**Código.** `grammar/skeletons.ts` (las 32 filas de la sección 5 con sus `canonico` y `alternativas`), `grammar/place.ts`, `grammar/render.ts` (`renderSkeleton`, `normalizeEnlaces`, `garantizaClase`, `emitirPancartas`), `grammar/geometry.ts` completo (`describeProfile`, `kmSubidaShare`), `constants.ts::ARCH.colocacion`, `ARCH.pancarta`, `ARCH.reina`, `ARCH.pesoPorClase`; y `scripts/galeria-recorridos.mjs` (sección 16), que genera `docs/galeria-recorridos/` con 5 perfiles por zona × esqueleto compatible y los 4 nacionales de cada uno de los 133 países.

**Entregable al dueño.** La galería, con el criterio de lectura de la decisión 41 (tres preguntas por perfil). Se entrega aquí y no después del paso 8 para que sus correcciones (que son datos: `ZONAS`, `RACE_REGION`, `pesoPorClase`) entren antes de cambiar el calendario. Se regenera en cada paso siguiente.

**Qué cambia de conducta.** Nada. **Coste.** 3 sesiones (las 32 plantillas canónicas se escriben a mano). **Riesgo.** Medio: los reintentos en esqueletos de borde; la respuesta ya decidida es estrechar rangos, nunca subir `maxIntentos` (riesgo 9 de la sección 17).

### 15.7 Paso 5 · Vetos y `generateStage` completa (sin llamadores)

**Tests primero.** `grammar/veto.test.ts` y `grammar/generate.test.ts`:

- Por cada veto de V1 a V10 y V15: un perfil o esqueleto literal que lo dispara y otro que no, con el `detalle` esperado. V11 a V14 y V16 no se prueban aquí (son de calendario o de vuelta: `calendario.test.ts` en el paso 8 y `tour.test.ts` en el 7).
- `verify` es pura de `routes/`: el test comprueba por `import` que `veto.ts` no importa nada de `stage/` (`sampleProfile`, `finishType`, `costBase`), leyendo el fichero fuente con `fs` y buscando la cadena `from '../../stage`; es la decisión 4 sellada como test y no como comentario.
- **El caso v40 con nombre** («una carrera de un día no muere en un puerto de 14 km»): 2.000 `generateStage` de `ud_montana` en `alpes` con `raceClass '1'`: 0 con última cota > 4,2 km, 0 con `finalKindOf === 'alto'`, 100 % con la última cota coronando a [3; 17] km de meta.
- **La lección de `reina-150` como regla**: el escenario canónico `reina-150` (`sim/scenarios.ts`, 135 km llanos y 15 km al 8 %, mapa 06 §3.2) expresado como esqueleto `et_reina_alto_largo` no pasa `verify`: devuelve `{ id: 'V8', detalle: 'subida a más de 30 km de meta: 0 % (< 25 %)' }`.

```ts
it('reina-150 expresada como esqueleto no pasa verify (V8b)', () => {
  const motivos: Motif[] = [
    { kind: 'enlace', km: 135 },
    { kind: 'meta', km: 15, meta: 'alto_largo', cotaFinal: { km: 15, g: 8 } },
  ]
  const profile = renderSkeleton(
    SKELETONS.et_reina_alto_largo,
    motivos,
    routeRng('reina-150')('dib'),
  )
  const veto = verify(profile, SKELETONS.et_reina_alto_largo, peticionReina('alpes'), motivos)
  expect(veto?.id).toBe('V8')
})
```

- `generate.test.ts`: determinismo (`generateStage(req)` dos veces, igualdad profunda); independencia de subflujos (cambiar `season` no cambia `arch.skeleton` ni los motivos con `firma: true`; cambiar `km` no cambia el esqueleto); `intentos` p95 ≤ 3 y `degradado` en ≤ 0,5 % (`ARCH.veto.fallbackMaxShare.testPorEsqueleto`) sobre 300 semillas × cada esqueleto × cada zona compatible, con el registro de qué veto disparó cada reintento impreso al final del test (es lo que dice qué rango estrechar); `fixed.skeleton` se respeta (bancos); `arch.frase` no está vacía y cita el esqueleto y la meta.

**Código.** `grammar/veto.ts` (V1 a V16 como predicados, `verify`), `grammar/generate.ts` (`generateStage` con los siete pasos de la sección 8 y el reintento sobre `mot`, `pos`, `dib`), `constants.ts::ARCH.veto`.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Bajo: los vetos son predicados y los tests son literales.

### 15.8 Paso 6 · Identidad y temporada (sin llamadores)

**Tests primero.** `grammar/edition.test.ts`:

- `calendarForSeason(s)` es determinista y memoizada: dos llamadas con el mismo `s` devuelven la MISMA referencia; `raceForSeason(id, s)` idem por (id, s).
- Para toda carrera generada del catálogo (`raceForSeason` construye por la ruta nueva aunque `SEASON_CALENDAR` siga siendo la vieja hasta el paso 8), temporadas 1 a 5 contra la 0: mismo `arch.skeleton`, misma `arch.geo`, mismos motivos con `firma: true` y mismos parámetros, mismo `kind`, mismo `timeTrial`, mismo número de etapas (decisión 20); `finalKindOf` igual salvo en `ud_montana` y `et_reina_valle` (cubeta móvil dentro de `{descenso_meta, cima_cerca}` y `{valle, descenso_meta}`, `arquitectura.md` §6.4); km dentro de ± 6 % (`ARCH.edicion.kmJitter`) y exacto en etapas `edicion` (el km es contrato); al menos un motivo no firma distinto en posición o número en 4 de las 5 temporadas; `profileCorrelation` entre ediciones consecutivas en [0,55; 0,9] y entre carreras distintas del mismo esqueleto < 0,6.
- Las etapas `real` son idénticas en toda temporada (huella igual); las `edicion` conservan km y esqueleto y solo cambian el dibujo (`season` entra solo en `dib`).
- Con `ARCH.edicion.activa = false` las cinco temporadas son idénticas a la 0; con `nivel = 2` en un esqueleto con `alternativas`, la temporada `s` usa `alternativas[s % n]`.
- La semilla de edición separada (decisión 22): dos carreras con la misma salida, meta y km en `editions.ts` no dibujan lo mismo (`raceId` entra en `raceId|e{i}|{editionKey}`).
- `it.todo('SEASON_CALENDAR es calendarForSeason(BASE_SEASON) por referencia')`: se enciende en el paso 8.

```ts
// grammar/edition.test.ts (forma del test de identidad)
for (const race of calendarForSeason(0).filter((r) => r.routeSource !== 'real')) {
  const base = race.stages
  let temporadasConDiferencia = 0
  for (let s = 1; s <= 5; s++) {
    const ed = stagesForSeason(race.id, s)
    expect(ed.length).toBe(base.length)
    ed.forEach((st, i) => {
      const b = base[i]
      expect(st.kind).toBe(b.kind)
      expect(st.timeTrial).toBe(b.timeTrial)
      expect(st.arch.skeleton).toBe(b.arch.skeleton)
      expect(st.arch.geo).toBe(b.arch.geo)
      expect(firmaDe(st.arch.motivos)).toEqual(firmaDe(b.arch.motivos)) // motivos con firma: true, con parámetros
      if (st.routeSource === 'edicion')
        expect(profileKm(st.profile)).toBeCloseTo(profileKm(b.profile), 1)
      else
        expect(Math.abs(profileKm(st.profile) / profileKm(b.profile) - 1)).toBeLessThanOrEqual(
          ARCH.edicion.kmJitter,
        )
      const c = profileCorrelation(st.profile, b.profile)
      expect(c).toBeGreaterThanOrEqual(0.55)
      expect(c).toBeLessThanOrEqual(0.9)
    })
    if (ed.some((st, i) => diffMotivos(base[i].arch.motivos, st.arch.motivos).length > 0))
      temporadasConDiferencia++
  }
  expect(temporadasConDiferencia, race.id).toBeGreaterThanOrEqual(4)
}
```

- Coste medido y sellado con holgura: construir las temporadas 1 a 5 cuesta ≤ 5 × `ARCH.arranque.porTemporadaMs` (5 s); el test imprime la cifra.

**Código.** `grammar/edition.ts` (`BASE_SEASON`, `calendarForSeason`, `raceForSeason`, `stagesForSeason`, la lista cerrada de subflujos, `diffMotivos` para `cambiosRespectoAnterior`), `constants.ts::ARCH.edicion`.

**Qué cambia de conducta.** Nada. **Coste.** 1 sesión. **Riesgo.** Bajo, es aditivo.

### 15.9 Paso 7 · Composición (sin llamadores)

**Tests primero.** `grammar/tour.test.ts`:

- Las seis garantías de `calendar.test.ts` l. 184-246 (crono en vuelta de 5, crono siempre en llana de 4+, «cinco llanas no son cinco sprints», nadie sin crono ni final en alto, primera etapa llana o prólogo, última decisiva o paseo) reescritas contra `composeTour` con tres territorios (BE, ES, CO) y 120 semillas; `calendar.test.ts` l. 184-246 NO se toca (sigue probando `stageMix`, que hasta el paso 8 es la vieja).
- Reglas de bloque V13 y V14 sobre 120 semillas × n ∈ [3; 21] × 5 relieves: `vu_corta` ≤ 1 crono; `vu_semana` ≤ 3 finales en alto y ≤ 2 seguidos; `vu_gran_vuelta` de 21 con descansos en [9; 15], reina en [15; 20], ≤ 1 final en alto en la primera semana, ≤ 7 etapas de alta montaña, ≥ 2 llanas entre bloques (`ARCH.bloques.gv`).
- Km por clase: `kmDe` dentro de `ARCH.km.porClase` para cada (clase, papel); ninguna etapa > `ARCH.km.maxPorClase`; una .2 de 5 etapas nunca supera 180 km; `lastStageKmFactor` conservado.
- Itinerario: ventana contigua de `TERRITORIOS[country].ruta`; `reina` solo con meta en `cordillera` o zona `montana`/`alta`; **«una vuelta belga no tiene reina»**: 120 vueltas de n ∈ [4; 8] con `country 'BE'` → 0 papeles `reina_*`, y lo mismo para NL, DK, AE, AU (decisión 13, D8); cuando `terrain: 'mountain'` pide reina y no hay cordillera, el papel se degrada a `media_alto` y `Itinerario` lo anota.

```ts
it('una vuelta belga no tiene reina, y una colombiana con terreno de montaña sí', () => {
  for (let i = 0; i < 120; i++) {
    const n = 4 + (i % 5)
    const be = itinerarioDe(`vu-be-${i}`, 'BE', n, 'mountain', '1', 'stage')
    expect(be.papeles.filter((p) => p.startsWith('reina')).length, `BE ${i}`).toBe(0)
    const co = itinerarioDe(`vu-co-${i}`, 'CO', n, 'mountain', '1', 'stage')
    expect(
      co.papeles.some((p) => p.startsWith('reina')),
      `CO ${i}`,
    ).toBe(true)
    expect(co.metas[co.papeles.findIndex((p) => p.startsWith('reina'))]).toBe(
      TERRITORIOS.CO.cordillera,
    )
  }
})
```

- Prólogo con p 0,25 en etapa 1 de vueltas ≥ 6 y cronoescalada con p 0,08 con `cordillera` (D3), medidos sobre 1.000 vueltas con ± 0,05.
- `n` se conserva siempre (para `raceRoutes.test.ts`, decisión 44).

**Código.** `grammar/tour.ts` (`TOUR_SKELETONS`, `BlockRule` como reparación determinista de atrás hacia delante, `itinerarioDe`, `composeTour`, `kmDe`), `constants.ts::ARCH.pesosComposicion`, `ARCH.bloques`, `ARCH.itinerario`, `ARCH.km`. `stageMix` NO delega todavía: la delegación es del paso 8, porque cualquier tirada añadida a `mixRoles` desplaza las composiciones de las 72 vueltas (juez del motor §1) y eso es cambio de conducta.

**Qué cambia de conducta.** Nada. **Coste.** 2 sesiones. **Riesgo.** Medio-bajo; las cuatro garantías de `mixRoles` se conservan como reglas y las de bloque se aplican después.

### 15.10 Paso 8 · El cambio de calendario (`ENGINE_VERSION` 69 → 70)

La única tanda que rompe tests sellados, y por eso se hace en un solo PR con los tests ya escritos. Antes de empezar: `backfillRaceRoutes` en cualquier mundo vivo (regla 5) y la galería revisada por el dueño al menos una vez.

**Tests primero (en este orden).**

1. `index.test.ts` l. 381: `expect(ENGINE_VERSION).toBe(70)`.
2. Borrar `routes/golden.test.ts`; sus 1.418 huellas se mueven a `sim/legacy/golden.test.ts`, que exige que `legacyCalendar()` (abajo) las reproduzca: es la prueba de que la copia legado es el generador viejo y no otra cosa. Se borra con el directorio al final del paso 9.
3. `routes/realFingerprint.test.ts` sigue verde para las 177 + 62; la e21 de Francia se re-sella con la causa escrita («llana generada: pasa de `flatSegments` a `et_llana`»).
4. `routes/stageKind.test.ts` reescrito por esqueleto: cada `SkeletonId` × `KM_ROAD` × 60 semillas × sus zonas compatibles → `stageKindOf(profile, timeTrial).kind === sk.kind` y, donde lo declara, `finalKindOf === sk.finalKind`, en el 100 %; `ud_montana` y `et_reina_*` por fin dentro (hoy `mountainClassicSegments` dibuja 51 reinas y nadie lo sella, mapa 06 §6.1); se conserva el caso «un recorrido sin segmentos es una llana» (l. 104-106); el caso «una crono es una crono aunque su perfil sea el de una llana» (l. 32-43) se re-sella como «una crono llana sin `timeTrial` es llana; una cronoescalada sin `timeTrial` es media» (decisión 42); y las dos etiquetas de reina (`Summit finish`, `Mountains`) tienen que aparecer (l. 87-91).
5. `apps/api/src/stageHistory.test.ts` l. 199: `cambian` se re-sella con la cifra nueva y la causa en el comentario, con el objetivo escrito: «solo etapas reales cuya etiqueta declarada difiere del recorrido; generadas = 0», porque `kind` y `label` de toda etapa generada salen de `stageKindOf` (decisión 23, I-44). El test gana la aserción `generadasQueCambian === 0`.
6. `routes/calendar.test.ts`: l. 108-121 (segmentos > 0 y pancartas dentro), l. 162-174 (km de edición exactos al redondeo) y l. 269-277 (`Uphill finish` acaba en `puerto`) en verde sin tocar; l. 184-246 en verde con `stageMix` delegando en `composeTour`; l. 248-258 (dos carreras distintas no componen la misma vuelta) en verde; gana «`kind` de toda etapa generada es `stageKindOf(profile).kind`» y «`routeSource` de toda etapa es uno de los tres valores y las de `STAGE_FEATURES` son `real`».
7. `grammar/calendario.test.ts` entero: todos los `it.todo` del paso 0 encendidos; ninguna banda puede quedar en `todo` (`ARCH.veto.fallbackMaxShare.calendario` es 0; V12 con el 0,85 provisional hasta el paso 9).
8. `grammar/edition.test.ts`: el `it.todo` de la referencia encendido (`expect(SEASON_CALENDAR).toBe(calendarForSeason(BASE_SEASON))`).
9. `routes/arranque.test.ts`: carga del módulo con `SEASON_CALENDAR` ≤ `ARCH.arranque.objetivoMs` 1.500 (aviso) y ≤ `techoMs` 2.500 (fallo); `calendarForSeason(1)` ≤ 1.000 ms; `generateStage` no llama a `sampleProfile` (mismo truco de `import` que en V16). La medida real se toma con `scripts/medir-arranque.mjs` en tres corridas y va a la nota de balance junto a la línea base del paso 0 (578 ms de referencia).
10. `routes/raceRoutes.test.ts`, `recorridoDelMundo.test.ts`, `finalKind.test.ts`, `featureProfile.test.ts`, `classicRoutes.test.ts`, `altimetry.test.ts`, `schedule.test.ts`, `uci.test.ts`: en verde sin tocar (mapa 06 §5).

```ts
// routes/arranque.test.ts
it('cargar el calendario de la temporada 0 cabe en el objetivo y nunca supera el techo', async () => {
  const t0 = performance.now()
  await import('./calendar.js') // primera carga del módulo en este worker
  const ms = performance.now() - t0
  console.log(
    `arranque SEASON_CALENDAR: ${ms.toFixed(0)} ms (objetivo ${ARCH.arranque.objetivoMs}, techo ${ARCH.arranque.techoMs})`,
  )
  if (ms > ARCH.arranque.objetivoMs)
    console.warn('por encima del objetivo: revisar rangos antes que subir maxIntentos')
  expect(ms).toBeLessThanOrEqual(ARCH.arranque.techoMs)
})
it('una temporada adicional cuesta menos de un segundo', () => {
  const t0 = performance.now()
  calendarForSeason(1)
  expect(performance.now() - t0).toBeLessThanOrEqual(ARCH.arranque.porTemporadaMs)
})
it('generateStage no toca el muestreador del motor', () => {
  const fuente = readFileSync(new URL('./grammar/generate.ts', import.meta.url), 'utf8')
  expect(fuente).not.toMatch(/from '\.\.\/\.\.\/stage/)
})
```

El primer test es de máquina y por eso el techo es 2.500 y no 1.500: el objetivo avisa, el techo falla. Si el techo se supera, la decisión ya está tomada (decisión 35): el calendario se construye perezoso por carrera (`calendarForSeason` devuelve las filas y `raceForSeason` genera al primer acceso), y el test se conserva tal cual.

**Código.**

- `routes/calendar.ts`: `buildRace`, `stagesFromEdition` (rama sin rasgos, con esqueleto de etapa según la tabla `EditionTerrain → et_*` de la sección 5) y `nationalChampionships` (`nc_ruta`, `nc_crono` con `zonaDe(code)`) llaman a `generateStage`; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva firma y delega en `composeTour`; `CalendarStage` gana `routeSource` y `arch`; `CalendarRace` gana `routeSource` agregado (`real` / `mixto` / `generado`); `SEASON_CALENDAR = calendarForSeason(BASE_SEASON)`; `auto()` queda solo para lo real y lo generado lleva las pancartas de `emitirPancartas`; `MixTerrain` y `oneDaySpec` desaparecen; el comentario de l. 2 («28 carreras») se corrige.
- `routes/profileGen.ts` queda con las primitivas; los ocho `xxxSegments`, `normalize` y `garantizaPuerto` se mueven a `sim/legacy/profileGenLegacy.ts` junto con copias de `oneDaySpec`, `stageMix` viejo (`mixRoles`, `mixKm`) y la rama vieja de `buildRace` como `legacyCalendar(): CalendarRace[]`; ese fichero existe solo hasta el final del paso 9 (decisión 29). `grammar/legacy.ts` se borra.
- `routes/stageKind.ts`: `SUMMIT_RUN_IN_KM = 5` exportada; `label` `Summit finish` por `kmAfterLastClimb(profile) <= SUMMIT_RUN_IN_KM`; `kind` no cambia de regla; etiquetas nuevas `Circuit`, `Wall finish`, `Prologue`, `Hill climb`, `Mountains classic` (decisión 38); comentario de umbrales l. 44-58 reescrito con la tabla medida por esqueleto.
- `apps/api/src/stageHistory.ts`: `calendarStageSpec` usa `stageKindOf(...).label` y deja su regla propia (l. 73-88).
- `constants.ts`: `ENGINE_VERSION = 70`; se retiran `ROUTE.queenDplusRange`, `queenHighDplusShare`, `queenLowDplusRange`, `queenFinalMix`, `mixWeights`, `kmFlat`, `kmHilly`, `kmUphill`, `kmSummit`; se conservan `ROUTE.itt*`, `lastDecisiveChance`, `grandTourStages`, `grandTourLastDecisiveFactor`, `lastSummitShare`, `selectiveMinFraction`, `uphillFinishMinStages`, `lastStageKmFactor` y todo `RELIEF`. `ARCH.arranque` y `ARCH.anticlon` entran aquí.
- `packages/db/src/raceRoutes.ts`: `RouteSource` pasa a tres valores (columna `text`, `schema.ts` l. 523: sin migración por el tipo) y `freezeRaceRoute` copia `routeSource` del calendario. El resto de la base va en el paso 10.

**Qué cambia de conducta.** Las 1.241 etapas no reales (532 nacionales, 325 de `stageMix`, 226 de edición sin rasgos, 158 de un día: mapa 06 §1) cambian de perfil; las 177 reales no. El reparto de `kind` por clase cambia (Bélgica sin reina, nacionales por circuito): el paso imprime en la nota de balance la tabla `kind × raceClass` antes y después (`routeCensus` con `aggregate`), que es la medida previa que el riesgo 9 de la ejecutabilidad pide para `world.test.ts` y `RACE_DAY_TSS` antes de mover nada.

**Qué se re-sella y por qué.** Los cinco puntos de arriba (1, 3, 4, 5, 6) con la causa escrita en el propio test, como hace `stageHistory.test.ts` l. 185-190. Los bancos (`test:bancos`) se ponen en rojo aquí a propósito y se re-sellan en el paso 9; el PR del paso 8 los deja en rojo con una nota de que el 9 los cierra, y el CI del push los corre igual (regla 4).

**Entregable.** `docs/balance.md` «v61 §1 · El cambio de calendario»: la tabla de `calendario.test.ts` antes (paso 0) y después, las constantes retiradas y añadidas con valor de hoy al lado, la cifra re-sellada de `stageHistory` y la tabla `kind × raceClass`; la galería regenerada.

**Coste.** 2 sesiones. **Riesgo.** Alto por concentración, bajo por sorpresa: todo lo que rompe está listado y los tests están escritos desde los pasos 0 a 7.

### 15.11 Paso 9 · Remedición de bancos (`test:bancos`, pareado)

Sigue la decisión 34 al pie de la letra: dueño operativo el implementador, dueño de cada banda el dueño del repositorio, que decide con la cifra delante; orden por coste creciente; todo pareado viejo contra nuevo con `engineVersion` fijo en la semilla y 12 semillas (`realQueens.ts` l. 179-182, mapa 04 §5.3); presupuesto 4 h de máquina y 2 sesiones humanas, techo 8 h.

**Tests primero.**

- `sim/frozenSkeletons.test.ts`: los tres esqueletos literales (Colombia e5, Guatemala e9, Tachira e6) rendidos con `renderSkeleton` dan el `kind` y el `finalKind` que su `why` reescrito describe; su huella se sella en el propio test para que la lista de `REAL_QUEENS` sea cerrada por forma (decisión 33).
- `sim/calendarQueens.test.ts`: muestra estratificada por `finalKind` × cubeta de desnivel con `PASO` ajustado a ~30 etapas; `facil.races > 0` y `dura.races > 0` (l. 62-63) sostenidos por `et_reina_blanda`; `facil.wonFromMovePct > dura.wonFromMovePct + 10` (l. 64) se espera que siga porque es física y no forma; la banda `breakawayWinPct` [6; 30] se mantiene como vigilancia hasta que la remedición diga otra cosa (D6); `reina-175-4800` impresa sin banda; `mountain.*` renombrada `forma.reinaCanonica.*` en el informe.
- Ninguna banda nueva nace en rojo (mapa 04 §5.3 regla 4).

```ts
// sim/frozenSkeletons.test.ts
for (const q of FROZEN_SKELETONS) {
  // colombia-e5, guatemala-e9, tachira-e6
  it(`${q.id}: el esqueleto congelado rinde lo que su why describe`, () => {
    const profile = renderSkeleton(q.skeleton, q.skeleton.canonico, routeRng(q.id)('dib'))
    expect(stageKindOf(profile, false).kind).toBe(q.skeleton.kind)
    expect(finalKindOf(profile)).toBe(q.skeleton.finalKind)
    expect(kmAfterLastClimb(profile)).toBeCloseTo(q.kmTrasUltimaCota, 0) // el `why` cita esta cifra
    expect(fnv1a(JSON.stringify(profile))).toBe(q.huella) // cerrada por forma
  })
}
```

**Orden de remedición**, con el coste que el mapa 06 §3.1 y §3.2 da para el reloj de hoy y el ×2 del pareado:

| Orden | Banco                                                                | Semillas       | Reloj hoy                                  | Coste real estimado (×2)  | Dirección pre-registrada en el paso 0                                                                                                |
| ----- | -------------------------------------------------------------------- | -------------- | ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `routeCensus` (geometría)                                            | n/a            | segundos                                   | segundos                  | rojo → verde en las bandas listadas en v61 §0; ninguna verde → rojo                                                                  |
| 2     | `stageKind` por esqueleto                                            | 60 × 5 × zonas | minutos                                    | minutos                   | 100 % por construcción                                                                                                               |
| 3     | `realQueens` (`invariants.test.ts` l. 770-844) con `frozenSkeletons` | 6              | 900 s                                      | ~8 min                    | `lastGroupPct` y `worstStagePct` sin moverse en las 6 reales; las 3 congeladas se remiden y su `why` se reescribe                    |
| 4     | `timeTrials` (l. 222-273)                                            | 12             | por test                                   | ~10 min                   | `tailPct` +0,5 puntos como mucho por `et_crono` con cota ≤ 3 km; D3 puede dejar prólogo y cronoescalada a 0                          |
| 5     | `calendarQueens`                                                     | 12             | 3.600 s con 4 (126 s libre, 370 s cargada) | ~6 a 19 min por generador | fuga por cubeta monótona decreciente (43,8 / 13,7 / 1,6 / 0 hoy); total remedido                                                     |
| 6     | Saturación de las 8 más duras (l. 511-552)                           | 12             | 1.800 s                                    | ~30 min                   | 0 de 8 saturan; V5 impide la forma que saturaba (Jura «82 % con el tanque a cero», l. 474-479)                                       |
| 7     | `smallTours` (l. 855-955)                                            | 12             | 3.900 s con 8                              | ~25 min                   | foto de meta explicada por pares de agrupadas; `distinctWinnerPct` no baja; `media.stages > 40` (l. 915) recontado                   |
| 8     | `coherence.test.ts` Jaén y `journal.test.ts` Tramuntana              | 40 / 12        | `reloj(300)` / por test                    | ~5 min                    | cero contradicciones; lo que aflore es del motor y se arregla, no se afloja                                                          |
| 9     | `world.test.ts`                                                      | 25 temporadas  | por test                                   | ~10 min                   | las bandas de población se leen contra la tabla `kind × raceClass` del paso 8; si una se mueve por el reparto, se anota con la causa |

Total estimado por debajo de 2 h de máquina en máquina libre, con margen hasta las 4 h presupuestadas si va cargada; el techo de 8 h es el punto en el que se para y se entrega lo medido.

**Código.**

- `sim/frozenSkeletons.ts` con los tres `Skeleton` literales y `REAL_QUEENS` leyéndolos (sigue con 9 entradas); `GENERATED_QUEENS` con 3 del calendario nuevo elegidas por forma (una `alto`, una `cima_cerca`, una `valle_largo`), impresas sin banda.
- `sim/targets.ts`: cada cifra remedida con su comentario nuevo; el comentario de l. 88 («una etapa reina del calendario tiene una mediana de 2.023») se sustituye por la cifra nueva; `calendarQueens.breakawayWinPct` queda en [6; 30] salvo decisión del dueño (D6).
- `ARCH.anticlon.maxCorrelacion`: se calibra con `scripts/medir-real.mjs` como p90 de la correlación entre pares reales de la misma familia (Ronde/E3, Amstel/Brabant, Lombardía/Lieja); el 0,85 provisional se sustituye y `calendario.test.ts` se re-sella con la cifra.
- **La tabla pareada como condición de borrado** (decisión 29): se borra `sim/legacy/` (`profileGenLegacy.ts` y `golden.test.ts`) en el mismo cambio que cierra «v61 §2», y solo si las cuatro condiciones de la decisión 30 se cumplen: (a) realismo rojo → verde sin verde → rojo; (b) variedad en verde; (c) canónicas (`llana-180`, `reina-150`, `cri-40`, `chronicle`, las cuatro huellas de `attribution`, `timetrial` y `raceRadio`) sin moverse un dígito; (d) simulación en la dirección prevista o explicación medida sin ajustar la banda. Si falla (c), el cambio ha tocado el motor y se para. Un resultado que contradiga la previsión se anota como «previsión fallida» en la nota y NO mueve la banda hasta decisión del dueño.

**Entregable.** «v61 §2 · Remedición»: la tabla pareada viejo/nuevo de las nueve filas, las dos lecturas de las listas cerradas (por nombre y por forma), y la lista de decisiones abiertas para el dueño con la cifra delante (D2 con la tabla del censo de las 27 de 113, D6).

**Coste.** 2 sesiones humanas, 4 h de máquina, techo 8 h. **Riesgo.** Medio, y es de coste: por eso el orden es por coste creciente y el techo existe.

### 15.12 Paso 10 · Base, API y web (en paralelo con el 9)

**Tests primero.**

- `packages/db/src/recorridoDelMundo.test.ts` gana «dos temporadas, dos recorridos, un esqueleto»: `freezeRaceRoute` con `season 0` y `season 1` de la misma carrera escribe dos filas con perfiles distintos y el mismo `arch.skeleton`; sigue auto-consistente en lo demás (decisión 44); congela `kind`, `label`, `time_trial` y `route_source` y los lee de vuelta.
- Test de `packages/db` para los cuatro lectores: `calendarRun.ts` l. 516 y l. 1603-1616, `world/callups.ts` l. 98 y `raceContext.ts` l. 56-59 y 127 leen `kind`, `timeTrial` y `profile` de `raceStagesForWorld` y, si no hay fila, de `calendarForSeason(season)`; el test intercepta `SEASON_CALENDAR` y comprueba 0 lecturas directas desde esos cuatro sitios (decisión 23).
- Test de API (`apps/api`): una etapa real devuelve `routeSource: 'real'`; ninguna generada devuelve `arch.frase` vacía; la ficha de una etapa no corrida lee `run?.profile ?? frozen?.profile ?? stagesForSeason(...)`; `edicion` y `cambiosRespectoAnterior` presentes para `season ≥ 1`.
- `apps/web/src/api/contracts.test.ts` con el contrato nuevo (`routeSource`, `arch.frase`, `edicion`, `cambiosRespectoAnterior`).

```ts
// packages/db/src/recorridoDelMundo.test.ts (caso nuevo)
it('dos temporadas, dos recorridos, un esqueleto', async () => {
  const race = calendarForSeason(0).find(
    (r) => r.stages.length >= 3 && r.routeSource === 'generado',
  )!
  await freezeRaceRoute(db, worldId, `${race.id}:s0`, race.id, 0)
  await freezeRaceRoute(db, worldId, `${race.id}:s1`, race.id, 1)
  const [s0, s1] = await Promise.all(
    [0, 1].map((s) => raceStagesForWorld(db, worldId, `${race.id}:s${s}`)),
  )
  expect(s0.map((x) => x.kind)).toEqual(s1.map((x) => x.kind))
  expect(s0.map((x) => x.timeTrial)).toEqual(s1.map((x) => x.timeTrial))
  expect(s0.map((x) => x.arch.skeleton)).toEqual(s1.map((x) => x.arch.skeleton))
  expect(s0.some((x, i) => JSON.stringify(x.profile) !== JSON.stringify(s1[i].profile))).toBe(true)
  expect(s0[0].routeSource).toBe('generado')
  expect(s0[0].label).toBeTruthy()
})
```

**Código.** Migración `00NN_race_routes_kind.sql` (columnas `kind`, `label`, `time_trial` en `race_routes`; NN = siguiente libre, hoy la última es `0039_el_recorrido_es_del_mundo.sql`; el directorio real de drizzle es `packages/db/drizzle/`); `freezeRaceRoute(db, worldId, raceKey, raceId, season)` escribiendo `kind`, `label`, `time_trial`, `route_source`; los cuatro lectores; `apps/api/src/routes/calendar.ts` l. 91-105 exponiendo `routeSource`, `arch.frase`, `edicion`, `cambiosRespectoAnterior`; la web con las tres marcas («Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado», «Recorrido generado»), la frase de arquitectura y «Edición N» (D10); `scripts/inventario-recorridos.mjs` leyendo `routeSource` y regenerando `docs/inventario-recorridos.md`.

**Qué cambia de conducta.** Del motor, nada (no sube versión). De la base, qué recorrido congela un mundo en temporada ≥ 1: es lo que la temporada existe para hacer.

**Coste.** 2 sesiones. **Riesgo.** Bajo.

### 15.13 Paso 11 · Documentación

`docs/generador.md` (este documento cerrado con las tablas medidas de los pasos 0, 8 y 9 en lugar de las previstas); `docs/balance.md` v61 con sus cuatro subsecciones; `docs/motor.md` §V.3 (la promesa de los nacionales por zona, cumplida) y §10 (cifras); `SPEC.md` §6.2 una línea («los perfiles sin dato los escribe una gramática de motivos, ver `docs/generador.md`»); `stageKind.ts` l. 44-58 ya reescrito en el paso 8, se revisa; `docs/ops.md` con la nota de `backfillRaceRoutes`; `docs/galeria-recorridos/` regenerada por última vez. Coste: 1 sesión. Riesgo: ninguno.

### 15.14 Orden de dependencias y paralelismo

```
0 → 1 → { 2 ∥ 3 } → 4 → 5 → { 6 ∥ 7 } → 8 → { 9 ∥ 10 } → 11
```

- 2 y 3 en paralelo: `geo.ts`/`regions.ts` y `motifs.ts` no comparten ficheros; el 4 necesita los dos (la galería es zona × esqueleto).
- 6 y 7 en paralelo: `edition.ts` y `tour.ts` no comparten ficheros; los dos dependen del 5 (`generateStage`).
- 9 y 10 en paralelo: los bancos no tocan `packages/db` ni `apps/`; el 11 cierra cuando los dos han terminado.
- El 8 nunca se junta con nada, ni se parte: es la tanda con la versión.
- Contenido que no es código y puede adelantarse desde el paso 0: la curación de `RACE_REGION` (sección 6), las 32 plantillas canónicas (sección 5) y la dirección pre-registrada de cada banda (sección 13).

### 15.15 Coste total estimado

En sesiones de trabajo (estimación de este documento, no medida): 0 → 1; 1 → 2; 2 → 2 + 1 de contenido; 3 → 2; 4 → 3; 5 → 2; 6 → 1; 7 → 2; 8 → 2; 9 → 2 humanas más 4 h de máquina (techo 8 h); 10 → 2; 11 → 1. Total: 22 sesiones de código y 1 de contenido, con un solo salto de versión, ninguna reescritura de fichero existente salvo `profileGen.ts` (que se reduce a primitivas) y `calendar.ts` (que cambia sus tres llamadores y conserva la firma de `stageMix`), y una sola migración. Frente a los seis saltos de `ingeniero.md` §12 (12 a 15 sesiones, cada uno con su remedición de bancos), este plan paga la remedición una vez y gasta esas sesiones de más en tests, galería y contenido, que es donde el diagnóstico de la sección 1 dice que estaba el agujero.

---

## 16. La galería: que el dueño vea antes de aceptar

La tabla geográfica de la sección 6 es juicio y no dato (decisión 16): de sus 29 filas solo son dato las 20 filas `terrain: 'cobbles'` (todas en zonas con adoquín, mapa 07 §3 l. 208), las ciudades de `raceRoutes.ts` y las 177 etapas reales; el resto sale del mapa 07, que se declara «orientativo» y escrito «no de la web» (mapa 07 l. 3). Y no hay forma de validarla desde fuera: `docs/fuentes-recorridos.md` l. 25-26 cierra procyclingstats («su `robots.txt` nos prohíbe el paso») y l. 55 cierra Overpass (`Disallow: /api/`), lo que deja sin efecto la promesa de `motor.md` §V.3 de validar contra PCS (mapa 05 §6.4). Los tests de consistencia interna de `grammar/geo.test.ts` (sección 6) comprueban que la tabla no se contradice, no que Ruanda sea de montaña ni que `race-jura` esté en `macizo_central`; datos §13.5 lo dice de `RACE_REGION` con esas palabras: «el test solo comprueba que existe, no que sea correcto». Los tres jueces coinciden en que ninguna propuesta daba al dueño un instrumento para VER el resultado antes de aceptarlo (cobertura §5 riesgo 2, ejecutabilidad §5 riesgo 1, motor §5 riesgo 7), y sin él «el juicio del dueño llegará carrera a carrera en producción», que es exactamente cómo llegó el caso v40 y la frase «Hay que arreglar eso» (G5). La galería es ese instrumento: una tarde del dueño delante de altimetrías, con tres preguntas por perfil y una casilla por respuesta, cuyo resultado se aplica editando datos y nunca código. Sustituye a la validación externa imposible; no la finge.

### 16.1 Qué es y qué no es

Es `scripts/galeria-recorridos.mjs`, un script de Node que lee del `dist` compilado como `scripts/inventario-recorridos.mjs` (l. 24-27: `pnpm --filter @cyclingstar/engine build` y después `node scripts/...`), llama a `generateStage` con `fixed.skeleton` y escribe HTML estático en `docs/galeria-recorridos/`. No es un banco (no tiene bandas, no falla en CI, no entra en `test:rapido`), no es la ficha del jugador (esa es la sección 11 y la decisión 39) y no es una fuente del generador: si el dueño dice «eso no existe en Flandes», lo que cambia es `ZONAS.flandes` y la galería se regenera para comprobarlo. Comparte con `routeCensus` la vara de medida (`stageKindOf`, `finalKindOf`, `dPlusDe` y el `finishType` con `groupSize` 50 de §B.2) para que lo que el dueño ve sea lo que el banco mide, y con la API el dibujo: el mismo `renderAltimetrySvg(profile)` de `altimetry.ts` l. 94-180 que sirve `apps/api/src/routes/calendar.ts` l. 107 y `races.ts` l. 128, SVG de 720×200 con `MIN_ELEV_SPAN` 900 m para que «una etapa llana se vea llana y no como una montaña» (mapa 01 §7). Ese mínimo de escala es una virtud aquí: el dueño compara alturas entre perfiles de la misma página sin que el eje se estire.

### 16.2 Entrada: lo que el script pide al motor

El script no toca `RACE_REGION` para las celdas de zona × esqueleto, porque `StageRequest.geo` es una `GeoSignature` directa (§B.2) y la firma de la zona se pasa tal cual; `RACE_REGION` entra solo en la página de adoquín, donde se muestran carreras reales. Los tipos y constantes propios del script:

```ts
// scripts/galeria-recorridos.mjs (JSDoc; aquí escrito como TypeScript para fijar la forma)
const GALERIA = {
  salida: 'docs/galeria-recorridos', // no versionado: entra en .gitignore junto a dist/ (16.3)
  semillasPorCelda: 5, // decisión 41: 5 perfiles por (zona × esqueleto compatible)
  svg: { width: 720, height: 200 }, // los valores por defecto de renderAltimetrySvg, explícitos
  grupoMeta: 50, // groupSize del finishType del censo (§B.2 RouteStats.finishType)
  season: 0, // BASE_SEASON: la temporada canónica, con sus propios dados
} as const

const CLASES: RaceClass[] = ['WT', 'Pro', '1', '2', 'NC'] // orden de uci.ts l. 14

interface Celda {
  zona: GeoZone
  esqueleto: SkeletonId
  clases: RaceClass[]
} // clases con ARCH.pesoPorClase > 0
interface Fila {
  raceId: string // `gal|${zona}|${esqueleto}|${i}`: semilla de identidad y de edición
  zona: GeoZone
  esqueleto: SkeletonId
  clase: RaceClass
  km: number
  stage: GeneratedStage // lo que devuelve generateStage
  finishType: FinishType // finishType(deriveFinishTerrain(sampleProfile(profile)), 50)
  svg: string // renderAltimetrySvg(stage.profile, { title })
}
```

Celdas: para cada `zona` de `ZONAS` y cada esqueleto de `SKELETONS` cuyo `requiere` satisface `ZONAS[zona]` (la misma comprobación de disponibilidad que usa `arch|raceId` en la sección 5, exportada por `grammar/geo.ts` como `admite(geo, sk)`), una celda con las clases donde `ARCH.pesoPorClase[sk.id][clase] > 0`. Un esqueleto con peso 0 en todas las clases (`ud_criterium` mientras D5 diga «no») no produce celda pero sí una línea en el índice («en catálogo, peso 0»), para que el dueño sepa que existe. Filas: `i` de 0 a 4; la clase de la fila `i` es `clases[i % clases.length]`, para que el dueño vea la misma forma en WT y en .2 cuando el esqueleto vive en las dos; el km sale de `kmDe(role, clase, false, routeRng(`${raceId}|km`))` con `ARCH.km.porClase`, así que las cinco filas cubren la banda de la clase y no solo su centro. La petición es literalmente la de producción: `{ raceId, stageIndex: 1, season: 0, km, role, terrain, geo: ZONAS[zona], raceClass: clase, format, routeSource: 'generado', fixed: { skeleton: sk.id } }`, con `role` y `format` deducidos del prefijo del esqueleto (`ud_*` y `nc_*` → `'un_dia'` y `'un-dia'`; `et_*` → el `StageRole` de su fila en la tabla de la sección 5 y `'una-semana'`) y `terrain` el de la misma tabla. Nada de `Math.random`: la galería de hoy y la de mañana son idénticas mientras no cambien datos o código, y por eso sirve para comparar antes y después de una corrección.

### 16.3 Salida: los ficheros y su tamaño

| Fichero                                          | Contenido                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Cuántos perfiles                                                                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/galeria-recorridos/index.html`             | tabla zona × esqueleto con el recuento de filas, `degradado` y p95 de `intentos` por celda; enlaces a cada página; la lista de esqueletos con peso 0; la lista de países `fallback` (decisión 13)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | 0                                                                                                                                                                                              |
| `docs/galeria-recorridos/zona-{zona}.html` (29)  | todas las celdas de la zona, una tabla por esqueleto compatible, cinco filas cada una; cabecera con la fila entera de `ZONAS[zona]` impresa (relieve, `puerto`, `cota`, `muro`, `adoquin`, `sterrato`, `viento`, `altitud`, `amplitud`, `finalesAlto`, `pesos`) para que el dueño juzgue la firma y no solo sus efectos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | ≤ 29 × 32 × 5 = 4.640 como techo; el real lo imprime el script, porque `requiere` filtra (`et_reina_*` solo donde `puerto` no es `null`, decisión 12; `ud_sterrato` solo con `sterrato: true`) |
| `docs/galeria-recorridos/nacionales.html`        | los 133 países de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13), cuatro perfiles cada uno (`nc-{cc}-road`, `nc-{cc}-u23-road`, `nc-{cc}-itt`, `nc-{cc}-u23-itt`, ids de `calendar.ts` l. 351-360), con la zona de `zonaDe(cc)` y la marca «territorio genérico» en los 77 sin tabla; ordenados por carreras de equipos del país (FR 57, BE 42, IT 40, ES 28, mapa 02 §10) y después alfabético                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 532 (= 133 × 4, mapa 05 §7)                                                                                                                                                                    |
| `docs/galeria-recorridos/adoquin.html`           | las 20 filas `terrain: 'cobbles'` (mapa 07 §3 l. 208: Omloop, Brugge-De Panne, E3, Gent-Wevelgem, Dwars, Ronde, Roubaix, Kuurne, Nokere, Denain, Tro Bro Léon, Flandrien, Paris-Tours, Le Samyn, Youngster Coast, Roubaix Espoirs, Antwerp Port Epic, Muur Classic, Rutland-Melton y Veneto Classic), cada una con dos altimetrías lado a lado: a la izquierda lo que el calendario le da hoy (el perfil real de `featureProfile` si la fila tiene `STAGE_FEATURES`, `routeSource: 'real'`; si no, el perfil que `grammar/legacy.ts` dibuja con el `cobblesSegments` de hoy mientras exista, es decir hasta el paso 8; borrado `legacy.ts`, la columna izquierda de esas filas dice «sin referencia: la de hoy eran 3 sectores de 2 a 4 km», mapa 07 §3 l. 302); a la derecha `generateStage` con la petición real de la fila (`regionOf(raceId, 1, country)`, su `km`, su clase, sin `fixed`) | 20 + 20                                                                                                                                                                                        |
| `docs/galeria-recorridos/revision-{pagina}.json` | lo que descarga el botón de cada página (16.5); no lo escribe el script                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |                                                                                                                                                                                                |

Tamaño y coste, medidos al redactar con un script de diez líneas sobre el `dist` de hoy (no versionado): `renderAltimetrySvg` sobre las 1.418 etapas de `SEASON_CALENDAR` tarda 51 ms (0,04 ms por etapa) y produce 3,1 MB, 2,2 KB de media por SVG con extremos de 0,4 y 10,9 KB. Con el techo de 4.640 + 532 + 40 perfiles la galería pesa como mucho unos 12 MB y se dibuja en menos de un segundo; lo que cuesta es el `sampleProfile` del `finishType` (0,40 ms por etapa, juez motor §1), unos 2 s en total. Por el tamaño, `docs/galeria-recorridos/` entra en `.gitignore` (junto a `dist/` y `coverage/`, l. 1-3 del fichero de hoy) y se regenera con el comando; lo versionado es la respuesta del dueño (16.6), que cabe en unos KB.

### 16.4 Qué muestra cada fila

| Columna               | De dónde sale                                                                                                                                                          | Por qué está                                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Altimetría            | `renderAltimetrySvg(stage.profile, { title: \`${zona} · ${esqueleto} · ${clase} · ${km} km\` })`                                                                       | es la pregunta entera: ¿la reconocería un aficionado?                                                                                                     |
| Frase de arquitectura | `stage.arch.frase` (§B.2; ejemplo «Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro»)                                                 | es lo que verá el jugador en la ficha (decisión 39, D10)                                                                                                  |
| `kind` / `label`      | `stage.kind`, `stage.label` (= `stageKindOf(profile, timeTrial)`, garantizado por V6)                                                                                  | el dueño ve la etiqueta que pondrá el calendario y con ella la vara de la decisión 26                                                                     |
| `finalKind`           | `stage.arch.finalKind` (= `finalKindOf`, garantizado por V7)                                                                                                           | reinas y medias: `alto`, `cima_cerca`, `valle_corto`, `valle_largo`                                                                                       |
| D+                    | `stage.arch.dPlus` (= `dPlusDe(profile)`, relleno incluido, decisión 9)                                                                                                | la cifra que un aficionado compara con el roadbook                                                                                                        |
| km, clase             | `km` de la fila y `clase`                                                                                                                                              | la segunda pregunta (¿existe en esta clase?) se contesta con la clase delante                                                                             |
| Esqueleto, zona       | `stage.arch.skeleton`, `stage.arch.geo`                                                                                                                                | para localizar el dato que hay que editar (16.6)                                                                                                          |
| Intentos y rechazos   | `stage.arch.intentos`, `stage.arch.degradado` y `stage.arch.rechazos` (los `Veto` que `verify` devolvió en los intentos fallidos, en orden)                            | un esqueleto que cuesta 5 intentos en una zona está mal rangoado ahí: eso lo ve el implementador, no el dueño, y es la señal de `ARCH.veto.intentosP95` 3 |
| `finishType`          | `finishType(deriveFinishTerrain(sampleProfile(profile)), 50)` (`stage/sample.ts` l. 68, `stage/finish.ts` l. 71 y 142), la misma expresión que `RouteStats.finishType` | lo que el motor hará con la meta; junto a `MetaKind` deja ver un `muro_meta` que sale `puncheur` (decisión 7)                                             |
| Metadatos             | `stage.arch.metadatos` (`viento`, `altitud`)                                                                                                                           | impresos con el texto de ficha de la decisión 17 («llano abierto», nunca «abanicos»), para que el dueño vea también qué NO promete                        |
| Tres casillas         | `no existe aquí` / `no existe en esta clase` / `no lo reconozco`, más un campo de nota                                                                                 | 16.5                                                                                                                                                      |

`rechazos` es el único campo que la galería añade a `GeneratedStage.arch` respecto de §B.2: `rechazos: Veto[]`, uno por intento fallido, vacío cuando el primer intento pasa; cuesta cero porque `verify` ya lo devuelve y `generateStage` ya lo tira. La sección 3 lo incorpora al tipo.

### 16.5 Cómo se lee: las tres preguntas y una tarde

El criterio está escrito antes de que el dueño abra la página (decisión 41), porque un juicio sin criterio escrito es lo que los jueces reprochan a la tabla. Por cada perfil, tres preguntas y solo tres, en este orden, y se para en la primera que falle:

1. **¿Existe en ese sitio?** Un puerto de 20 km en `flandes`, un sector de adoquín en `andalucia`, un final en alto largo en `italia_norte` en carrera de un día (mapa 07 §3, columna «lo que NO existe»). Si no existe, casilla `no existe aquí`.
2. **¿Existe en esa clase?** Una .2 de 195 km con final en alto de 14 km, una WT de 120 km sin nada. Casilla `no existe en esta clase`.
3. **¿La reconocería un aficionado?** No «¿es bonita?» sino «¿podría ser una carrera de verdad de ese sitio y esa clase?». Casilla `no lo reconozco`, con nota obligatoria de una línea (la única casilla que exige nota, porque es la única que no localiza sola el dato a tocar).

Un perfil sin casilla marcada es un perfil aceptado; no hay casilla de «bien» porque el silencio ya lo dice y así la tarde rinde. Las páginas de zona se leen enteras; la de nacionales por muestreo (los 56 países con carreras de equipos enteros, los 77 `fallback` a razón de uno de cada cinco, elegidos por el dueño); la de adoquín entera, porque son 20 y es la única con referencia real al lado. Orden de lectura recomendado en el índice, por número de carreras en juego: `flandes`, `francia_norte`, `ardenas`, `italia_norte`, `italia_centro`, `alpes`, `pirineos`, `cantabrico`, `meseta`, `levante`, y las 19 restantes después; FR, BE, IT y ES son 167 de las 310 carreras de equipos (mapa 02 §10), así que las diez primeras zonas cubren más de la mitad del calendario que el jugador ve. Cada casilla se guarda en `localStorage` de la página al marcarla y el botón «Descargar revisión» de cada página escribe `revision-{pagina}.json`; no hay servidor, no hay estado compartido entre páginas y no se pierde nada si el dueño cierra el navegador a medias.

```ts
// forma de revision-{pagina}.json, la que el implementador lee
interface Revision {
  pagina: string // 'zona-flandes' | 'nacionales' | 'adoquin'
  generadaEn: string // ISO, la del index.html que se estaba revisando
  filas: {
    raceId: string
    zona: GeoZone
    esqueleto: SkeletonId | null
    clase: RaceClass
    km: number
    veredicto: 'no_existe_aqui' | 'no_existe_en_clase' | 'no_lo_reconozco'
    nota?: string // obligatoria si veredicto === 'no_lo_reconozco'
  }[]
}
```

### 16.6 Qué hace el implementador con las respuestas

Datos, nunca código. La regla vale en las dos direcciones: una respuesta del dueño no justifica tocar `generateStage`, `verify` ni `ARCH.motivo.*` (eso sería recalibrar la gramática por una fila), y un implementador que no encuentre dato que editar para una respuesta la anota como «previsión fallida» en la nota de `balance.md` y la lleva a la sección 18 en vez de improvisar. Tabla de decisión:

| Veredicto                                        | Qué se edita                                                                                                                                                                       | Ejemplo                                                                                                                                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `no_existe_aqui` en una celda zona × esqueleto   | `ZONAS[zona]`: el campo que lo permite pasa a `null`, o baja el rango (`puerto.km`, `muro.g`), o `pesos[esqueleto]` a 0                                                            | «puerto de 12 km en `britanicas`» → `ZONAS.britanicas.puerto.km` a [5; 9] (mapa 07 §3.18: «puertos de 15 km» no existen)                                                                           |
| `no_existe_aqui` en las cinco filas de una celda | `Skeleton.requiere` del esqueleto, que es dato del catálogo                                                                                                                        | «`ud_sterrato` en `bretana`» → `requiere.sterrato: true` ya lo prohíbe; si no, se añade                                                                                                            |
| `no_existe_aqui` en nacionales                   | `TERRITORIOS[cc].ruta` (primera zona por peso) o alta del país en `TERRITORIOS` si era `fallback`                                                                                  | «Ruanda con circuito llano» → RW hoy cae a `generico` (es uno de los 77 `fallback`); se da de alta en `TERRITORIOS` con la zona que el dueño diga, y la lista de `fallback` del índice baja en uno |
| `no_existe_aqui` en adoquín (columna derecha)    | `RACE_REGION[raceId]`                                                                                                                                                              | «Veneto Classic con muros flamencos» → `default: 'italia_norte'`                                                                                                                                   |
| `no_existe_en_clase`                             | `ARCH.pesoPorClase[esqueleto][clase]` a 0, o `ARCH.km.porClase[clase]` si es el km lo que chirría                                                                                  | «`ud_montana_alto` en .1» → es D1: se lleva a la sección 18, no se toca                                                                                                                            |
| `no_lo_reconozco` con nota                       | lo que la nota señale entre los tres datos anteriores; si la nota apunta a un rango de `ARCH.motivo.*` o a un veto, va a la sección 18 como decisión del dueño con la fila adjunta | «reina de .2 con 5.000 m» → `Skeleton.dPlus` de `et_reina_*` por clase no existe; va a la 18                                                                                                       |

Tras cada tanda de ediciones: `pnpm typecheck && pnpm test:rapido` (los tests de consistencia de `geo.test.ts` y `regions.test.ts` y el `skeletons.test.ts` de esqueleto × zona con `fallbackMaxShare` 0,005 tienen que seguir en verde: una corrección que dispara `degradado` en una celda no se acepta, se estrecha el rango en vez de anular el campo) y se regenera la galería, que por ser determinista muestra exactamente las filas que cambiaron. Las revisiones se guardan versionadas en `docs/galeria-revision.json` (la concatenación de los `revision-*.json` con la fecha) y la nota «v61 · El generador es una gramática» de `docs/balance.md` resume en su apartado del paso 4 cuántas filas revisó el dueño, cuántas marcó y qué datos se editaron; es el rastro que la decisión 16 exige para poder llamar validada a una tabla que es juicio.

### 16.7 Cuándo se genera y cuándo se entrega

Se escribe y se corre por primera vez en el paso 4 del plan (sección 15), que es cuando existen `SKELETONS`, `place.ts` y `renderSkeleton` (pasos 3 y 4) y `ZONAS` con `RACE_REGION` (paso 2); en ese paso `verify` aún no está completo (paso 5), así que la galería del paso 4 corre con los vetos que `skeletons.test.ts` ya usa (V1 a V4, V6, V7) y su índice lo dice en la cabecera («vetos activos: …»), leído de `veto.ts`. Se entrega al dueño ANTES del paso 8: es la condición para cambiar el calendario, porque a partir del paso 8 cada corrección de `ZONAS` mueve las 1.418 etapas que el jugador ve y la comparación pareada del paso 9. Se regenera al cerrar cada paso del 5 al 10 y se vuelve a mirar por diferencia: como es determinista, un `diff` entre dos generaciones solo enseña las filas que un paso cambió, que es lo que hay que revisar. En el paso 8, además, el script comprueba tres cosas y sale con error si fallan (es su única función de test; no entra en vitest para no sumar a las 18 cargas de módulo que cuenta la sección 14): que ningún perfil de ninguna celda sale `degradado` (el `calendario: 0` de `ARCH.veto.fallbackMaxShare`), que los 532 nacionales que dibuja coinciden en `kind`, `label`, `km` y `arch.skeleton` con `stagesForSeason(raceId, 0)` (misma petición, mismo resultado), y que las 20 filas de adoquín reciben esqueletos con `adoquin` (`ud_adoquin`, `ud_adoquin_ligero`, `ud_muros_adoquin`) o `ud_sterrato` para las dos de tierra (Tro Bro Léon, Rutland-Melton). El extractor `scripts/medir-real.mjs` (decisión 40) es la segunda vara y no compite con esta: él da p10/p50/p90 de las 177 etapas reales a las bandas del censo (sección 13), la galería da al dueño la forma; una tabla puede pasar las bandas y seguir poniendo Ventoux en Dinamarca, y eso solo lo ve un ojo.

Lo que la galería no resuelve y se dice: no valida la firma de una zona contra la carretera real, valida que el dueño la acepta; para las 29 zonas sigue sin haber fuente externa y la sección 17 lo lista como riesgo con esta mitigación. Y no sustituye a la ficha del jugador: la interfaz enseña una etapa cada vez y con su origen (decisión 39); la galería enseña quinientas seguidas y sin jugador delante, que es lo que hace falta para decidir en una tarde.

---

## 17. Riesgos y lo que queda fuera

Los 27 riesgos de los tres jueces (10 de cobertura, 8 del motor, 9 de ejecutabilidad) están uno a uno en el apéndice B (sección 19) con la sección que los resuelve. Aquí van solo los que el diseño no resuelve sino que ACOTA: cada uno con lo que puede pasar y con qué cifra, lo que el diseño hace (una mitigación o un sacrificio consciente, dicho con esa palabra), y dónde se vigila. La regla que ordena la lista es la de la decisión 34: un resultado que contradiga la previsión se anota como «previsión fallida» en `docs/balance.md` con la medida delante y no mueve ninguna banda hasta que el dueño decida. Las decisiones que son suyas se escriben con el valor por defecto de la sección 18, que es lo que se implementa.

### 17.1 Catorce riesgos acotados

#### 1. Viento, altitud, costa y meseta no llegan al motor

La lista geográfica del encargo de propuestas era seis cosas (relieve, adoquín, viento, altitud, costa, meseta; `juicios/cobertura.md` §5 riesgo 3) y E1 entrega dos: relieve y firme. La razón está medida en el motor y no en el generador. El viento es un número por ETAPA, `rng('viento')^2.2` con día normal por debajo de `windMin` 0,87 (`simulate.ts` l. 1157-1160, `constants.ts` l. 3593; mapa 03 §5.1), y solo muerde en bloques `llano` (l. 1215, 4340-4408): el corte se sortea por km y ningún tramo del perfil dice dónde pega, que es lo que `docs/motor.md` §19.5 (l. 1314-1318) deja anotado como deuda del motor. `Segment` (`types.ts` l. 12-48) no lleva altitud, y el clima sale de `lugar = { pais?, dia }` (`weather.ts` l. 58-71; mapa 03 §5.2): el único dato geográfico que el motor lee hoy es el país, y solo para lluvia y calor. La meseta tiene el mismo techo por otro lado: `tendida` y `expuesto` se tipan `llano` (decisión 2), así que una tendida de 20 km al 2,5 % cuesta por pendiente pero no suma a `kmSubida`, a `breakAppeal` ni a `gcTerrain` (`simulate.ts` l. 1696-1710, mapa 03 §4.1).

Lo que hace el diseño (decisión 17) es no fingir: `GeoSignature.viento` y `.altitud` viajan en `GeneratedStage.arch.metadatos`, la ficha los enseña con texto que no promete nada que el motor no coloque (con `viento ≥ 2` dice «llano abierto» y nunca «abanicos»; con `altitud` en `alta` o `altiplano` describe los puertos, no el aire; la tabla de textos vive en la sección 11), y `grammar/generate.test.ts` sella que dos peticiones iguales salvo `geo.viento` y `geo.altitud` producen el mismo `profile`. Lo que queda para el motor, fuera de E1 y escrito para que nadie lo busque aquí: `windMin` por zona (banco §13.1), altitud en `Segment` (cambia el contrato de `types.ts` l. 37-42, geografía §13.2) y exposición por tramo para que el abanico pegue donde no hay setos. El gancho queda puesto: `expuesto` existe como `MotifKind` y se conserva en `arch.motivos`, y un motor que lea `arch.motivos` sitúa el abanico sin tocar el generador (arquitectura §13.6); si el motor gana tipado por pendiente (`docs/tactica.md` R28.1(c)), `tendida` se retipa sin tocar la gramática (arquitectura §13.5). Sacrificio consciente: la geografía de E1 cambia la carretera, no el aire.

```ts
// packages/engine/src/routes/grammar/generate.test.ts
it('viento y altitud son metadatos: no cambian un solo tramo del perfil', () => {
  const base = peticion('race-ronde', { zona: 'flandes' }) // helper del test: StageRequest completa
  const ventosa = { ...base, geo: { ...base.geo, viento: 3, altitud: 'altiplano' as const } }
  const a = generateStage(base),
    b = generateStage(ventosa)
  expect(b.profile).toEqual(a.profile) // mismos Segment[], mismos tramos, mismas pancartas
  expect(b.arch.metadatos).toEqual({ viento: 3, altitud: 'altiplano' })
  expect(b.arch.frase).not.toMatch(/abanico/i) // decisión 17: la frase no promete lo que el motor no coloca
})
```

#### 2. La tabla geográfica es juicio, no dato

Las 29 filas de `ZONAS`, los 56 `TERRITORIOS` y los 77 países en `fallback` salen del mapa 07 §3, que se declara orientativo y escrito de memoria; la validación externa es imposible (PCS y Overpass vetados, `docs/fuentes-recorridos.md`). Lo que sí es dato son tres cosas y el documento lo dice con esas palabras (decisión 16): las 20 filas `terrain: 'cobbles'` (todas en zonas con adoquín, mapa 07 §3), las ciudades de `raceRoutes.ts` (sin fuente para 250 carreras, mapa 02 §8) y las 177 etapas reales. El riesgo es el que los tres jueces nombran igual: una carrera plausible en el sitio equivocado, que es el defecto de hoy con otro disfraz (cobertura §5 riesgo 1).

Mitigación en tres capas. Primera, los vetos V1 a V4 impiden lo imposible: `null` en `puerto`, `cota` o `muro` es «aquí no existe» y `degradar()` solo baja (`montana → media → ondulado → llano`, decisión 12). Segunda, `grammar/geo.test.ts` comprueba la consistencia interna de la tabla (`min ≤ max`; `puerto.km[0] ≥ 9`; `cota.km[1] ≤ 8`; `muro.km[1] ≤ 3`; `cordillera` está en `ruta` y su `relieve ∈ {montana, alta}`; toda clave de `COUNTRIES` resuelve; las 20 `cobbles`), lo que prueba que el mundo actual no contradice la tabla, no que la tabla sea verdad (juez motor §5 riesgo 7). Tercera, la galería de la sección 16 en el paso 4, antes del paso 8, con las tres preguntas por perfil de la decisión 41; lo que el dueño marque se corrige editando `ZONAS`, `RACE_REGION` o `ARCH.pesoPorClase`, que son datos, nunca código. Lo que se acepta: `fallback` cuenta 77 países y 0 carreras de equipos (test), y las vueltas de BE, NL, DK, AE y AU quedan sin reina por `cordillera: null` (D8, valor por defecto «se acepta», sección 18).

#### 3. `stageKindOf` no se recalibra

Los umbrales 8,5 km / 3.200 m / 3 km (`stageKind.ts` l. 60-64, mapa 01 §5.1) están calibrados contra el generador viejo y, medidos sobre lo real, llaman `media` a 11 de 54 reinas y `reina` a 16 de 59 medias: 27 de 113 (datos §1.5). Hasta que se recalibre, la ficha aplica dos criterios según el origen: lo generado cabe en su clase por construcción (V6, con `puerto ≥ 9,0`, `cota ≤ 8,0` y `margenClaseKm` 0,3) y lo real sigue con su discrepancia. Ejemplo que el jugador verá y que es correcto para el clasificador: una Lieja generada con puertos ≤ 4,5 km sale `media / Mountains classic` (sección 11). Decisión 26: no se mueve en E1 porque es la vara de todo el banco y moverla obliga a remedir todo (ingeniero §13.1.4); lo único que cambia es la etiqueta `Summit finish` por `SUMMIT_RUN_IN_KM` 5, que no toca `kind` (decisión 23). Vigilancia: `routeCensus` imprime tras el paso 8 la tabla `kind` declarado contra leído por `routeSource`, con objetivo escrito «generadas = 0». D2, valor por defecto: no en E1; se abre con esa tabla delante (sección 18).

#### 4. Circuitos, muros encadenados y `kmSubida`

El motor cuenta `kmSubida` por tipo de bloque, `breakAppeal = clamp(4·kmSubida/total + 0,35·[final en alto], 0, 1)` y `gcTerrain` desde el 5 % (`simulate.ts` l. 1696-1710, mapa 03 §4.1), y no sabe que la vuelta 9 es la misma carretera que la 3 (ingeniero §13.1.2). Un `circuito` de 14 km × 9 con un muro de 1,1 km pone 9,9 km de `subida` en 126: un 7,9 %, `gcTerrain` verdadero y `breakAppeal` 0,31 por la fórmula citada; una `ud_muros` con 15 muros de 1 km pone el 10 % de la etapa en `subida`. Es correcto en dirección (Montréal se corre dura) y desconocido en magnitud, y toca de lleno al banco de saturación: 5 de las 8 carreras de un día más exigentes son hoy `nc-*-road` (mapa 06 §3.2) y los 532 nacionales pasan a `nc_ruta` de golpe (decisión 15). Mitigación: decisión 25 (pancarta `cima` solo en `puerto ≥ 1,5 km`, siempre en el último puerto de la etapa, y los muros de circuito < 1,5 km no puntúan); `routeCensus` mide `kmSubidaShare` y `breakAppealEstimado` por esqueleto con banda informativa `ud_circuito ≤ 0,20` y `ud_muros ≤ 0,15` (informa, no veta); y la saturación de las 8 más duras se remide en el paso 9 con 12 semillas contra `SATURATION_DEPLETION` 0,96 y `SATURATION_BONK_PCT` 14 (mapa 06 §3.2). Si salta en una .1 flamenca con campo continental, se anota como previsión fallida y va al dueño: el generador no se ablanda solo, porque una Ronde de .1 existe y es el motor el que tiene que aguantarla (datos §13.3).

#### 5. El muro en meta exige precisión de bloque

`finishType` comprueba `alto` antes que `muro` (`finish.ts` l. 165-189), `deriveFinishTerrain` funde en una racha todo bloque ≥ `finishClimbMinGradient` 3 tolerando `finishClimbGapBlocks` 5 (l. 94-123), `muroMaxKm` es 1 (`constants.ts` l. 4462) y la longitud se redondea a bloques de 100 m (`sample.ts` l. 70): hoy `muro` sale 0 veces en línea (juez motor §1). El diseño lo ataca por construcción (decisión 7): `muro_meta` de [0,5; 2,2] km al [8; 16] %, aproximación de `aproxKm` 2 con `aproxAmp` 2,5 para que el relleno no se funda con el muro, y la tabla de `MetaKind` declara `puncheur` por encima de 1,0 km. Pero es una hipótesis hasta que corra (ejecutabilidad §5 riesgo 7), y por eso el paso 3 la prueba antes de nada: `grammar/motifs.test.ts` exige que 300 de 300 `muro_meta` con ≤ 1,0 km tipen `muro` en `finishType`. Si falla, el orden de ajuste está decidido: primero `aproxKm` 2 → 3, después `aproxAmp` 2,5 → 2,0; nunca el rango del muro, y nunca una llamada a `sampleProfile` dentro de `verify` (decisión 4). En el calendario lo vigila V16 en `routeCensus`: `muro ≥ 1 %` y `puncheur ≥ 8 %`.

```ts
// packages/engine/src/routes/grammar/motifs.test.ts (paso 3): la única prueba del diseño que llama a sampleProfile
it('muro_meta de ≤ 1,0 km tipa muro en finishType 300 de 300', () => {
  let muros = 0
  for (let i = 0; i < 300; i++) {
    const p = renderMotif(
      {
        kind: 'meta',
        meta: 'muro_meta',
        km: 0.5 + (i % 6) * 0.1,
        cotaFinal: { km: 0.5 + (i % 6) * 0.1, g: 8 + (i % 9) },
      },
      routeRng(`muro|${i}`),
    )
    if (finishType(deriveFinishTerrain(sampleProfile(p)), 50) === 'muro') muros++
  }
  expect(muros).toBe(300) // si falla: aproxKm 2 → 3, después aproxAmp 2,5 → 2,0; nunca el rango del muro ni sampleProfile en verify
})
```

#### 6. El hueco de [8,0; 9,0] km

`ARCH.motivo.cota.km` acaba en 8,0 y `ARCH.motivo.puerto.km` empieza en 9,0 para dejar 0,5 a cada lado de `PASS_MIN_KM` 8,5: ninguna subida generada mide entre 8,0 y 9,0 km, y un Ghisallo de 8,6 sale como 9,0 (sección 12). Es un sacrificio consciente y a cambio desaparecen los tres bordes medidos sin holgura: 1 y 2 de 1.500 por el redondeo de tramos a 0,1 (segmento 8,6 con tramos 8,4 y al revés) y 3 de 1.500 con `finalKind: 'alto'` forzado (mapa 01 §5.1), que `stageKind.test.ts` con 60 semillas no ve. `garantizaClase` con `margenClaseKm` 0,3 (decisión 10) cubre lo que el redondeo pueda comerse. Lo real no lo nota: `featureProfile.ts` no pasa por `ARCH`. Se documenta en el comentario de `ARCH.motivo.puerto` y en la sección 19 como objeción aceptada; no es decisión del dueño.

#### 7. `featureProfile.ts` sigue con otro relleno

Tras E1 el calendario tiene dos rellenos para dos poblaciones: las 177 etapas reales con `rollingFill` (`featureProfile.ts` l. 158-176) y amplitud por terreno de `RELIEF` (`constants.ts` l. 1124-1131) más `normalizeTotal` estirando el último segmento (l. 179-188), y las 1.241 no reales con `enlace` y la `amplitud` de la zona (cobertura §5 riesgo 9). Decisión 27: no se unifica en E1. Lo que movería hacerlo está medido: la huella FNV de las 177 (decisión 28) y `erosion.longClassicFresh` (Flandes) y `erosion.hardestClassicFresh` (Lombardía), que son perfiles reales con banda (mapa 04 §4.2). Es un paso propio posterior a E1, con su propio salto de `ENGINE_VERSION` y su propia tabla pareada, y se anota como deuda en la nota «v61». Lo que E1 garantiza mientras tanto: `realFingerprint.test.ts` en verde después del paso 8, es decir, ningún `import` de `grammar/` entra en `featureProfile.ts`.

#### 8. Más varianza de forma en los bancos

Las listas cerradas conservan el nombre y no la forma (mapa 04 §3.3): `realQueens` tiene 3 de 9 perfiles generados, `smallTours` 7 de 10 carreras, `timeTrials` 3 de 5 cronos, y `grandTour` 20 de 21 reales (mapa 06 §3.2). Con el generador nuevo, `race-sharjah` pasa a ser un `vu_corta` con motivos sorteados, y las bandas de esas listas se mueven por el generador y no por el motor (mapa 04 §4.2, con la dirección esperada de cada una: `grandTour.queenLastGroupPct` ya rozó 7,63 contra 8 y `realQueens.worstStagePct` 17,57 contra 18). Mitigación en cuatro piezas: las tres reinas generadas de `REAL_QUEENS` se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` y se rinden con `renderSkeleton` (decisión 33); todo banco que necesite forma estable pide `StageRequest.fixed.skeleton` y `season: BASE_SEASON`; el paso 9 es pareado con 12 semillas, `engineVersion` fijo en la semilla y dirección pre-registrada (decisión 30); y la doble lectura de las listas cerradas, por nombre y por forma. Lo que se acepta: los bancos miden el calendario que el generador produce en el paso 8, y esa forma no vuelve a cambiar hasta el siguiente salto de versión.

#### 9. Reintentos en esqueletos de borde

Un esqueleto cuyo rango roza un umbral del clasificador (`et_media_alto` con una cota de 7,9 km, arquitectura §13.2) paga V6 en reintentos. Constantes: `ARCH.colocacion.maxIntentos` 8, `ARCH.veto.intentosP95` 3 y `ARCH.veto.fallbackMaxShare` {calendario 0; testPorEsqueleto 0,005}. La regla está decidida: si el p95 de `intentos` supera 3 en el paso 4, se estrechan rangos (`cota.km[1]` de 8,0 a 7,5) antes que subir `maxIntentos`. Lo que no llega a `verify` es la incompatibilidad estructural (un `ud_montana` en `ardenas`, donde `puerto` es `null`): la resuelven `requiere`, `degradar()` y el peso 0 en el sorteo `arch|raceId` (decisiones 12 y 13), no el reintento. Vigilancia: `grammar/skeletons.test.ts` por esqueleto × 5 km × 60 semillas × zonas compatibles con `intentos` p95 ≤ 3 y degradados ≤ 0,5 %; en las 1.418 del calendario, 0 degradados (`routeCensus`), porque la plantilla canónica pasa todos los vetos por construcción.

#### 10. La cola baja de reinas

Hoy la sostiene un dado del 40 % (`ROUTE.queenHighDplusShare`) que existe «porque `calendarQueens.test.ts` afirma en tres líneas duras que la banda de < 1.500 m no se queda vacía» (mapa 06 §6 punto 3, prosa del repositorio, no del dueño): el test decide por el diseño. El diseño la decide en su sitio: `et_reina_blanda` con `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10} y D+ total en [1.500; 2.500] (decisión 8), y `calendarQueens` estratificada por `finalKind` × cubeta de desnivel (decisión 32). El riesgo que sigue vivo es el de cobertura §5 riesgo 4: pedir la decisión sin la cifra. Por eso `routeCensus` mide el D+ de reina por formato y clase en el paso 0 (generador viejo) y en el paso 8 (nuevo), con la banda «cubeta < 1.500 poblada ≥ 5 %» de la sección 13 con su columna «hoy». Si aun así el estrato `<1500` queda con menos de 3 etapas en la muestra, `calendarQueens.test.ts` falla con el mensaje «cubeta < 1.500 despoblada: decisión D6» y no se cambia solo (sección 13). D6, valor por defecto: `calendarQueens.breakawayWinPct` [6; 30] se mantiene como vigilancia hasta la remedición del paso 9 (el 18,1 % «está bien así» se midió sobre el generador viejo); comparar `<2000` contra `>3000` es la alternativa que el dueño puede elegir en la sección 18, no lo que el diseño hace por su cuenta.

#### 11. `world.test.ts` y `RACE_DAY_TSS` con otro reparto de `kind`

`sim/world.ts` l. 169-193 calcula `CALENDARIO` por división al cargar el módulo desde `SEASON_CALENDAR` leyendo `st.kind`, y `RACE_DAY_TSS` carga por `kind` (`clasica` 160 frente a `media` 145, ingeniero §11.2): cualquier cambio del reparto mueve el banco de mundo sin que nadie lo haya pedido (juez motor §1). Y el reparto cambia por cuatro sitios a la vez: `kind` leído del perfil (72 discrepancias hoy), Bélgica sin reina, medias flamencas a `clasica`, 532 nacionales por zona. Mitigación: el paso 8 mide el reparto de `kind` por clase antes y después (tabla en la nota «v61 §1») y corre `world.test.ts` con fila propia en la tabla de re-sellado de la sección 13; una banda de población que se mueva se anota con su causa y no se afloja. Lo que se acepta: una segunda temporada en memoria no le llega a `world.ts` (juez motor §5 riesgo 1); el banco de mundo mide la temporada 0 y eso es lo que promete.

#### 12. El coste de arranque

Medido hoy: 578 ms la carga de `routes/calendar.js` (842 carreras, 1.418 etapas, 46.354 segmentos) y 0,40 ms por etapa una pasada de `sampleProfile` más lecturas (juez motor §1, `coste-motor.mjs`). El riesgo que los jueces nombran es de 1,5 a 2 s por temporada si se verifica con `sampleProfile` por intento, multiplicado por las 18 cargas de test y por cada temporada que un test genere. El diseño lo corta de raíz (decisión 4: `generateStage` no llama a `sampleProfile`) y lo mide en vez de estimarlo (decisión 35): `scripts/medir-arranque.mjs` en el paso 0 y en el 8, y `routes/arranque.test.ts` con `ARCH.arranque` {objetivoMs 1.500; techoMs 2.500; porTemporadaMs 1.000}. Si se supera el techo, el calendario se construye perezoso por carrera: ya decidido, no «si molesta». Lo que queda acotado y no resuelto: `calendarForSeason` memoizada por `Map` acumula una temporada por año de mundo (ejecutabilidad §5 riesgo 3); la sección 14 pone el tope `MAX_TEMPORADAS_EN_MEMORIA = 8` en `edition.ts` (se borra la más antigua insertada, y reconstruirla cuesta ≤ `porTemporadaMs` porque la función es pura) y su script imprime los MB de heap por temporada para revisar el 8 con cifra.

#### 13. La remedición es cara y es la más fácil de saltarse

Relojes: `realQueens` 900 s, `calendarQueens` 3.600 s con 4 semillas, `smallTours` 3.900 s con 8, saturación 1.800 s (mapa 06 §3.2 y decisión 34), y todo ×2 porque se mide viejo y nuevo. La decisión 34 pone dueño (el implementador del paso 9 corre; el dueño del repositorio decide cada banda con la cifra delante), orden por coste creciente y presupuesto (4 h de máquina y 2 sesiones, techo 8 h). Lo que impide saltársela es la decisión 29: `sim/legacy/profileGenLegacy.ts` no se borra sin la tabla pareada en `docs/balance.md`, y borrarla es lo que cierra el paso 9. Y lo que impide «ajustar la banda para que cuadre» es la regla de previsión fallida.

#### 14. `RACE_REGION` con errores de contenido

310 carreras y las 60 ediciones por etapa se curan a mano en una tarde con `raceRoutes.ts` abierto (decisión 14), y el test solo comprueba que existe y que ninguna carrera de equipos cae a `zonaDe(country)`, no que Ruanda o Dinamarca estén bien puestas (datos §13.5). Las 226 etapas de edición sin rasgos reciben así una zona con ciudades y km reales (ejecutabilidad §5 riesgo 5); la doctrina de `fuentes-recorridos.md` se respeta porque la ficha dice «Ciudades y distancia reales, relieve generado» y nunca presenta ese relieve como real (decisión 39). Mitigación: comentario por fila con la ciudad que la justifica, la galería con las 20 `cobbles` reales al lado de su equivalente generado, y corrección como dato. D9 (cifras UCI de `ARCH.km.maxPorClase` «a confirmar») se implementa con las del mapa 07 §4.1 (sección 18).

### 17.2 Lo que E1 no hace, y dónde se hace

| Qué                                                        | Por qué no aquí                                                                                                                                                                                       | Dónde                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Cargar recorridos reales nuevos                            | E1 mejora las 1.241 etapas que nunca tendrán recorrido real; cada real nuevo mejora una carrera (agenda §4.18)                                                                                        | E12 (`docs/calendario.md`)                       |
| El Mundial, las selecciones y las reglas de los nacionales | son calendario y contenido, no generador                                                                                                                                                              | E12                                              |
| Una gran vuelta GENERADA en el calendario                  | `vu_gran_vuelta` existe y se testea en el paso 7 para 9 a 21 etapas; las tres grandes vueltas siguen reales y ninguna carrera nueva entra                                                             | E12                                              |
| Tocar el motor                                             | `Segment`, `Ramp`, `Banner` intactos (decisión 2); sin altitud, exposición, `windMin` por zona, noción de vuelta ni contrarreloj por equipos; `rompepiernas` sigue muriendo en `sample.ts` l. 100-101 | un encargo de motor posterior                    |
| Reescribir SPEC §6.17                                      | el SPEC pide fuga del 25 al 45 % en alta montaña y la decisión vigente es 18,1 % con banda [6; 30] (mapa 05 §11.1); es del dueño                                                                      | decisión del dueño, fuera de E1                  |
| Unificar `featureProfile.ts`                               | riesgo 7                                                                                                                                                                                              | paso propio posterior, con versión               |
| Validar contra PCS u Overpass                              | vetados (`docs/fuentes-recorridos.md`)                                                                                                                                                                | no se hace; la galería lo sustituye (sección 16) |
| Metas volantes generadas                                   | 2 de depósito y 5 km de alivio por pancarta (mapa 03 §10.8) cambian el ritmo de todas las llanas                                                                                                      | D4, valor por defecto «no» (sección 18)          |
| Critérium puntuable                                        | mapa 07 §1.7                                                                                                                                                                                          | D5, peso 0 (sección 18)                          |
| Recalibrar `stageKindOf`                                   | riesgo 3                                                                                                                                                                                              | D2, tras el paso 8 (sección 18)                  |

### 17.3 Tabla resumen

| #   | Riesgo                           | Tipo            | Dónde se vigila                                          | Sección   |
| --- | -------------------------------- | --------------- | -------------------------------------------------------- | --------- |
| 1   | viento, altitud, costa, meseta   | sacrificio      | `generate.test.ts` (metadatos no tocan `profile`); ficha | 6, 11     |
| 2   | tabla geográfica es juicio       | mitigado        | `geo.test.ts`; galería paso 4                            | 6, 16     |
| 3   | `stageKindOf` sin recalibrar     | sacrificio (D2) | tabla declarado/leído por origen en `routeCensus`        | 11, 18    |
| 4   | circuitos y `kmSubida`           | mitigado        | banda informativa del censo; saturación paso 9           | 8, 13     |
| 5   | muro en meta                     | mitigado        | 300 de 300 en el paso 3; V16 en el censo                 | 4, 15     |
| 6   | hueco [8,0; 9,0]                 | sacrificio      | comentario de `ARCH.motivo.puerto`                       | 12, 19    |
| 7   | dos rellenos                     | sacrificio      | `realFingerprint.test.ts`                                | 11        |
| 8   | varianza en bancos               | mitigado        | `frozenSkeletons`; pareado 12 semillas                   | 13        |
| 9   | reintentos de borde              | mitigado        | `skeletons.test.ts` p95 ≤ 3; 0 degradados                | 8, 9      |
| 10  | cola baja de reinas              | mitigado (D6)   | censo paso 0 y 8; `calendarQueens` estratificada         | 5, 13, 18 |
| 11  | `world.test.ts` y `RACE_DAY_TSS` | mitigado        | reparto de `kind` antes/después en el paso 8             | 13        |
| 12  | coste de arranque                | mitigado        | `arranque.test.ts` 1.500 / 2.500 / 1.000                 | 14        |
| 13  | remedición cara                  | mitigado        | decisión 29 como condición de borrado                    | 13, 15    |
| 14  | `RACE_REGION` con errores        | mitigado        | test de existencia; galería; corrección como dato        | 6, 16     |

### 17.4 Lo que la nota «v61» deja anotado como deuda

Para que ninguna de estas cosas se pierda entre encargos, la nota «v61 · El generador es una gramática» de `docs/balance.md` (paso 11) cierra con una lista de deudas con dueño y cifra, y es esta:

1. **Viento por zona** (`windMin` por `GeoSignature.viento`) y **exposición por tramo**: encargo de motor; hoy 6 de cada 100 llanas con viento de lado y 4 de cada 100 partidas (`docs/motor.md` §19.1 vía mapa 03 §5.1), iguales en pólder y en llanura padana.
2. **Altitud en `Segment`**: cambia el contrato de `types.ts` l. 37-42; hasta entonces `GeoSignature.altitud` es texto de ficha y veto V4.
3. **Unificar `featureProfile.ts`** con `enlace` y `amplitud` de zona: mueve la huella FNV de las 177 y `erosion.longClassicFresh` / `hardestClassicFresh`; paso propio con versión.
4. **Recalibrar `stageKindOf`** (D2): con la tabla declarado/leído por origen del censo tras el paso 8 y la cifra 27 de 113 como punto de partida.
5. **SPEC §6.17**: fuga del 25 al 45 % en alta montaña frente a la decisión vigente del 18,1 % con banda [6; 30]; se remide en el paso 9 sobre el calendario nuevo y se lleva al dueño con la cifra (D6), sin tocar el SPEC desde E1.
6. **`MAX_TEMPORADAS_EN_MEMORIA` 8**: se revisa con los MB de heap por temporada que imprime el script de la sección 14 cuando un mundo pase de 8 temporadas.
7. **Metas volantes y critérium** (D4, D5): a 0 y con peso 0; cada uno con la medida que pediría activarlo (2 de depósito y 5 km de alivio por pancarta; mapa 07 §1.7).

---

## 18. Decisiones que son del dueño

Diez decisiones no las toma este documento porque no son de diseño sino de qué juego quiere el dueño: cuánta rareza, cuánta variación de un año a otro, qué se le enseña al jugador y qué banda se acepta como vigilancia. Cada una lleva aquí lo mismo: qué se decide, qué cambia según la respuesta (con las cifras medidas y de dónde salen), la recomendación del documento y el valor por defecto, que es el que se implementa si el dueño no contesta. La regla, heredada de `docs/entrenamiento.md` (§ Cómo leer): nada queda «a definir»; donde hay decisión hay un valor por defecto y el código lo lleva puesto desde el paso en que nace. Nueve de las diez se responden editando datos (`ARCH`, `SKELETONS`, `TOUR_SKELETONS`, `TERRITORIOS`) y ninguna línea de `generateStage`, `verify` ni `renderSkeleton`; la excepción es D2, que toca la vara del clasificador y por eso se abre después de E1 y no dentro.

### 18.1 Las diez en una tabla

| #   | Qué se decide                                             | Valor por defecto (se implementa)                                                                                | Dónde vive el valor                                                                    | Sección que lo usa                 | Cuándo hace falta la respuesta                      |
| --- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------- |
| D1  | `ud_montana_alto` (Ventoux, Mercan'Tour) como rareza      | existe: peso 0,02 solo en .1 y solo con `finalesAlto: 'largo'`                                                   | `ARCH.pesoPorClase.ud_montana_alto`                                                    | 5, 9 (V5), 13 (`unDia.finalLargo`) | antes del paso 8; es dato, se puede cambiar después |
| D2  | Recalibrar `stageKindOf` a la realidad                    | no en E1; se abre tras el paso 8 con la tabla del censo                                                          | `PASS_MIN_KM` 8,5, `QUEEN_MIN_CLIMB_METRES` 3.200 y el corte de 3 km de `stageKind.ts` | 11, 12, 13                         | tras el paso 8, con la cifra delante                |
| D3  | `et_prologo` y `et_cronoescalada`                         | entran: prólogo 0,25 (0,3 en `vu_gran_vuelta`), cronoescalada 0,08                                               | `TOUR_SKELETONS[*].primera.prologo`, `ARCH.itinerario.cronoescaladaP`                  | 7, 13 (`timeTrials`)               | antes del paso 7                                    |
| D4  | Metas volantes generadas                                  | no: `emitirPancartas` solo emite `cima`                                                                          | (ninguna constante en E1)                                                              | 8                                  | fuera de E1                                         |
| D5  | `ud_criterium` como carrera puntuable                     | no: peso 0 en las cinco clases                                                                                   | `ARCH.pesoPorClase.ud_criterium`                                                       | 5                                  | antes del paso 8; es dato                           |
| D6  | `calendarQueens.breakawayWinPct` [6; 30] y la cubeta baja | mantener [6; 30] como vigilancia hasta la remedición del paso 9; la cubeta < 1.500 la sostiene `et_reina_blanda` | `sim/targets.ts`; `ARCH.reina.blandaShare`                                             | 13                                 | tras el paso 9, con la tabla pareada delante        |
| D7  | `ARCH.edicion.activa` y `nivel`                           | activa, nivel 1; nivel 2 donde el esqueleto declare `alternativas`                                               | `ARCH.edicion.activa`, `ARCH.edicion.nivel`, `Skeleton.alternativas`                   | 10, 5                              | antes del paso 6                                    |
| D8  | Vueltas de países sin cordillera, sin reina               | se acepta                                                                                                        | `TERRITORIOS[XX].cordillera`                                                           | 6, 7                               | antes del paso 2; es dato                           |
| D9  | `ARCH.km.maxPorClase` con cifras UCI «a confirmar»        | se codifican las del mapa 07 §4.1: { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 }                            | `ARCH.km.maxPorClase`                                                                  | 7, 12, 13 (`km.clase`)             | antes del paso 7; es dato                           |
| D10 | Qué enseña la ficha de una etapa generada                 | frase de arquitectura y «Edición N» siempre, con `cambiosRespectoAnterior`                                       | `apps/api/src/routes/calendar.ts` l. 91-105 y la web                                   | 10, 11, 16                         | antes del paso 10                                   |

Lo que el implementador escribe en el código por cada respuesta es exactamente esto, y nada más:

```ts
// constants.ts, bloque ARCH: cada valor con el comentario «Dn: valor por defecto (docs/generador.md §18)»
ARCH.pesoPorClase.ud_montana_alto = { WT: 0, Pro: 0, '1': 0.02, '2': 0, NC: 0 } // D1: 0 en '1' si el dueño dice «no»
ARCH.pesoPorClase.ud_criterium = { WT: 0, Pro: 0, '1': 0, '2': 0, NC: 0 } // D5: > 0 solo en la clase que el dueño diga
ARCH.itinerario.cronoescaladaP = 0.08 // D3: 0 apaga la cronoescalada
ARCH.edicion.activa = true // D7: false devuelve el calendario fijo de hoy
ARCH.edicion.nivel = 1 // D7: 0 fija · 1 jitter · 2 rotación declarada
ARCH.km.maxPorClase = { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 } // D9
// tour.ts: TOUR_SKELETONS.vu_semana.primera = { llana: 0.75, prologo: 0.25 }        // D3: prologo 0 apaga el prólogo
// geo.ts:  TERRITORIOS.BE.cordillera = null                                         // D8: una zona de `ruta` con relieve montana|alta si el dueño lo rechaza
```

### 18.2 D1 · La rareza del final en alto largo en un día

**Qué se decide.** Si existe en el juego una carrera de un día que muere en un puerto de [13; 22] km (`ud_montana_alto`, sección 5: `alto_largo` de firma al [6; 7] %, D+ [2.500; 3.800]) o si V5 es absoluto y una carrera de un día nunca acaba en un puerto. El mapa 07 §1.2 cuenta «tres carreras sobre unas doscientas» de un día del calendario UCI europeo (Ventoux Dénivelé Challenge, Mercan'Tour, Murcia según edición), todas .1, ninguna WT (§4.3: «no existe una carrera de un día del WorldTour con final en un puerto de 6 km o más»).

**Qué cambia según la respuesta.** Con el valor por defecto el esqueleto tiene `pesoBase` 60 × 0,02 = 1,2 frente a los pesos enteros del resto del catálogo (sección 5), solo en las 66 carreras de un día .1 (mapa 02 §2) y solo en zonas con `finalesAlto: 'largo'`; en la práctica es del orden de una carrera por calendario o ninguna, y `race-mercantour` (Nice → Isola 2000, `alpes`, sección 6) es la candidata natural. La banda `unDia.finalLargo` de `ROUTE_CENSUS_TARGETS` (sección 13) lo acota a ≤ 2 % del calendario de un día. Con «no», `ARCH.pesoPorClase.ud_montana_alto['1']` pasa a 0, el esqueleto sigue en el catálogo (pasa `skeletons.test.ts` como todos, y los bancos pueden pedirlo con `fixed.skeleton`), V5 no tiene excepción y la banda del censo exige 0 %. Ninguna otra cosa se mueve: `mountainClassicSegments` ya se retira en el paso 8 y hoy el 0 % tras v40 es el estado medido (sección 13).

**Recomendación.** Que exista. Es la única forma en que el calendario puede tener una Mercan'Tour reconocible, y el coste de equivocarse es una carrera .1 al año que el censo cuenta y la galería enseña. **Valor por defecto: existe, 0,02 en .1.**

### 18.3 D2 · Recalibrar `stageKindOf` a la carretera

**Qué se decide.** Si los umbrales de `stageKind.ts` (8,5 km de `PASS_MIN_KM`, 3.200 m de `QUEEN_MIN_CLIMB_METRES`, 3 km del final en alto), que el propio fichero dice calibrados «contra los propios generadores» (l. 44-58, vía datos §1.5), se mueven para clasificar como la realidad. Medido sobre las 177 etapas reales (`propuestas/datos.md` §1.5): `stageKindOf` llama `media` a 11 de las 54 reinas reales y `reina` a 16 de las 59 medias, 27 de 113; y a 7 de 22 llanas reales con cota las llama `clasica` y a 3 `reina`. En el calendario entero son 72 discrepancias entre `kind` declarado y leído (juez motor §1, mapa 06 §2.1), 49 de ellas selladas en `stageHistory.test.ts` l. 199.

**Qué cambia según la respuesta.** En E1 nada: la decisión 26 deja los umbrales como vara y lo generado se acota con holgura (V6, `ARCH.veto.margenClaseKm` 0,3; `cota.km` ≤ 8,0 y `puerto.km` ≥ 9,0 rodean el 8,5). Lo que el jugador ve mientras tanto lo describe la sección 11: dos criterios según el origen, dichos así. Si el dueño dice «sí» después del paso 8, mover cualquiera de los tres umbrales desplaza a la vez el hueco [8,0; 9,0] de la gramática, la etiqueta de las etapas ya corridas (`stageHistory.ts` reetiqueta con `stageKindOf`), la muestra de `calendarQueens` (que filtra por `kind`), el reparto de `RACE_DAY_TSS` por `kind` en `world.test.ts`, y los 49 re-sellados; es un salto de `ENGINE_VERSION` propio, posterior al único de E1 (decisión 3), con su nota en `balance.md`. La tabla que lo decide no es una estimación: `routeCensus` imprime desde el paso 0 «`kind` declarado × `kind` leído» para las 177 reales, por clase y por `finalKind` (sección 13), y esa tabla, con el 27 de 113 como punto de partida, es lo que se le pone delante.

**Recomendación.** No en E1; abrirlo con la tabla del censo tras el paso 8, y solo si la cifra sigue siendo del orden de un cuarto de las reinas y medias reales. **Valor por defecto: no en E1.**

### 18.4 D3 · Prólogo y cronoescalada

**Qué se decide.** Si entran `et_prologo` ([3; 8] km, solo `enlace`, meta `esprint`) y `et_cronoescalada` ([12; 25] km, `alto_largo` de firma de [9; 15] km al [6; 9] %), sección 5. Hoy no existen: `ittSegments === flatSegments` (mapa 01 §2.1) y el banco de cronos está anclado en llano.

**Qué cambia según la respuesta.** Con el valor por defecto, el prólogo se tira en `roles[0]` con `TOUR_SKELETONS[*].primera.prologo` 0,25 (0,3 en `vu_gran_vuelta`) solo si `n ≥ ROUTE.ittWeekStages` 6 (sección 7): son 34 vueltas de 6 o más etapas (11 + 5 + 10 + 2 + 2 + 1 + 3, mapa 02 §2), de las que las 3 de 21 son las grandes vueltas reales, así que del orden de 8 prólogos por calendario sobre 31 vueltas generadas. La cronoescalada convierte con p `ARCH.itinerario.cronoescaladaP` 0,08 una `cri` de una vuelta con `cordillera` (sección 7). Lo que se mueve en el banco: `timeTrials` (5 cronos, 3 generadas: `sim/invariants.test.ts` l. 222-273 vía sección 13) remide `tailPct` [8; 15] % y `worstStagePct` [0; 17] % (mapa 04 §2), donde ya se sabe que «la longitud del perfil entra, el relieve apenas» (+0,7 puntos de cola por 12 km); y `stageKind.test.ts` l. 32-43 se re-sella con «una crono llana sin `timeTrial` es llana; una cronoescalada sin `timeTrial` es media» (decisión 42). Con «no», `primera.prologo` y `cronoescaladaP` pasan a 0 y el re-sellado de `stageKind.test.ts` no hace falta; la tirada de `rand()` se consume igual con p 0, de modo que apagarlo después no vuelve a desplazar las composiciones de las 72 vueltas que pasan por `mixRoles` (juez motor §1: cualquier tirada añadida las desplaza todas, y eso se paga una sola vez, en el paso 7).

**Recomendación.** Que entren. Romandía, Dauphiné y Suiza (mapa 07 §2.2) abren con prólogo y Peyragudes (Tour 2025 e13, §2.1) existe; sin ellos la crono generada es siempre la misma llana. **Valor por defecto: entran, 0,25 y 0,08.**

### 18.5 D4 · Metas volantes generadas

**Qué se decide.** Si el generador fabrica pancartas `meta_volante` (una por vuelta en `circuito`, dos por etapa como propuso arquitectura §14) o se mantiene la regla de la casa: en lo generado solo hay cimas de puerto (`auto`, `calendar.ts` l. 89-91; mapa 02 §9: «no hay metas volantes en nada generado, y solo las hay reales donde la fuente las publica»).

**Qué cambia según la respuesta.** No es solo puntos: cada pancarta disputada cuesta `bannerCost` 2 de depósito a cada contendiente y abre 5 km de alivio del ritmo (`reliefKm`, `reliefDamp` 0,85, `reliefLambda` 1,8; `constants.ts` l. 3944 y 4131-4134 vía mapa 03 §10.8 y l. 117), y el propio motor recuerda que «con tres sprints intermedios eso vaciaba medio depósito» antes del arreglo (mapa 03 §6, l. 7850-7853). Dos por etapa son 4 de depósito y 10 km de alivio en todas las llanas generadas, o sea otro ritmo de día en la mayoría de las 1.241 etapas no reales. Con «sí», `emitirPancartas` gana un segundo tipo y se remiden `smallTours` y la saturación de las 8 más duras (las únicas que corren etapas generadas enteras con fatiga) en una versión aparte, después de E1, como recomienda datos §14 D1; en E1 no hay constante para ello y el tipo `Banner` de `types.ts` ya admite `meta_volante`, así que nada hay que preparar.

**Recomendación.** No en E1, y medir aparte si el dueño lo quiere. **Valor por defecto: no.**

### 18.6 D5 · El critérium como carrera puntuable

**Qué se decide.** Si `ud_criterium` (sección 5: `circuito` de firma de [1,5; 3] km × [20; 40] vueltas, [45; 100] km, D+ [0; 300], meta `esprint`, `kind` llana) se sortea para alguna clase. El mapa 07 §1.7 lo describe sin ranking UCI salvo las exhibiciones de Saitama y Singapur y aconseja tratarlo «como fiesta y no como carrera puntuable».

**Qué cambia según la respuesta.** Con peso 0 en las cinco clases existe en el catálogo (pasa `skeletons.test.ts`, la galería lo enseña con `fixed.skeleton`) y no cae ninguna carrera en él. Con «sí», `ARCH.pesoPorClase.ud_criterium` recibe un valor en la clase que el dueño diga (si dice solo «sí», 0,05 en .2 y 0 en el resto) y `routeCensus` cuenta cuántas de las 60 carreras de un día .2 (mapa 02 §2) caen. Lo que no puede hacer E1 es un critérium «de fiesta»: los puntos los da la clase de la fila (`uci.ts`), así que una carrera del calendario con `ud_criterium` puntúa como su clase; un formato no puntuable es un tipo de carrera nuevo y eso es E12.

**Recomendación.** No, mientras el calendario no tenga un formato no puntuable. **Valor por defecto: no, peso 0.**

### 18.7 D6 · La banda de la fuga en montaña y la cubeta baja

**Qué se decide.** Qué hacer con `calendarQueens.breakawayWinPct` [6; 30] cuando el paso 9 la remida sobre el calendario nuevo: mantenerla como vigilancia, recentrarla con la medida nueva, o partirla por cubeta de desnivel (mapa 04 §4.3, punto 2); y, si la cubeta < 1.500 m se despuebla, aceptar comparar < 2.000 contra > 3.000. La cifra vigente es de otro generador: 18,1 % sobre muestra sistemática de 27 × 16 con 43,8 % de reinas bajo 1.500 m y 0 % sobre 3.500 (mapa 04 §3.1, v44), sobre la que el dueño dijo «está bien así» y la banda entró como vigilancia a 3σ con 108 carreras. `calendarQueens.test.ts` l. 62-63 exige `facil.races > 0` y `dura.races > 0` en `<1500` y `2500-3500`; en la muestra de hoy hay 3 y 5 (mapa 06 §3.1), y 25 de las 27 etapas no reales de esa muestra cambian de perfil con el generador nuevo (mapa 06 §4, riesgo 5).

**Qué cambia según la respuesta.** Con el valor por defecto la banda no se toca hasta tener la tabla pareada de la sección 13 (12 semillas, de 6 a 19 minutos reales, reloj 3.600 s), y la cubeta baja la sostiene el diseño y no un dado: `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10} da a `et_reina_blanda` (D+ [1.500; 2.500] con relleno) peso propio, y la estratificación por `finalKind` × cubeta exige ≥ 3 reinas en `<1500` (sección 13). Un resultado fuera de [6; 30] se anota como «previsión fallida» en `balance.md` y NO mueve la banda (decisión 34). Si el dueño elige recentrar, `sim/targets.ts` recibe p50 ± 3σ de la medida nueva y la cita «mediana de 2.023 m» desaparece; si elige partir por cubeta, la banda global se conserva y nacen dos por cubeta con la cifra medida como centro. Si `<1500` queda por debajo del 5 % del censo (`ROUTE_CENSUS_TARGETS`, sección 13), `blandaShare` NO se sube para poblarla: se compara < 2.000 contra > 3.000 y se dice así en el informe.

**Recomendación.** Mantener [6; 30] como vigilancia hasta la remedición y decidir con la tabla delante; la banda se creó para recalcularse (mapa 04 §4.3) y es la única del banco con esa vocación. **Valor por defecto: mantener [6; 30]; cubeta baja por `et_reina_blanda`.**

### 18.8 D7 · Variación entre ediciones

**Qué se decide.** Si una carrera cambia de un año a otro (`ARCH.edicion.activa`) y cuánto (`nivel` 0 fija, 1 jitter acotado, 2 rotación declarada por `Skeleton.alternativas` elegida por `season % n`: Como/Bérgamo en `ud_montana`, dos metas en `et_reina_alto_largo`, sección 5).

**Qué cambia según la respuesta.** Afecta a las 1.241 etapas no reales (1.418 − 177): en las 226 de edición real varía solo el dibujo (`season` entra únicamente en `dib`, porque el km es contrato y las ciudades son verdad) y en las 1.015 generadas la edición mueve motivos no firma, km ± `kmJitter` 0,06, vueltas ± 1 con p `vueltasJitter` 0,5, motivo opcional con p `motivoNuevo` 0,35, nunca el papel, el `timeTrial` ni el número de etapas (decisión 20). El test de identidad de la sección 10 exige correlación entre ediciones consecutivas en [0,55; 0,9]. Con `activa: false`, `calendarForSeason(s)` devuelve lo mismo para toda `s`, la ficha conserva la frase de arquitectura y «Edición N» (la temporada existe igual en `race_routes`, `raceKey = ${id}:s${season}`) y omite `cambiosRespectoAnterior`; el coste de arranque no cambia (memoización por temporada, sección 14). Si el dueño pide «casi nunca» en vez de «no», la respuesta es la mitad: `kmJitter` 0,03, `vueltasJitter` 0,25, `motivoNuevo` 0,15, y ningún otro cambio. `nivel` 2 no añade sorteo: solo elige entre instancias escritas a mano, así que activarlo es cuestión de cuántos esqueletos declaran `alternativas`.

**Recomendación.** Activa, nivel 1, y nivel 2 allí donde el esqueleto lo declare: es lo que hace que «una carrera sea la misma carrera» sin ser la misma etapa. **Valor por defecto: activa, nivel 1.**

### 18.9 D8 · Vueltas sin reina

**Qué se decide.** Si se acepta que `TERRITORIOS[XX].cordillera === null` (Bélgica, Países Bajos, Dinamarca, Golfo, Australia, y con ellos Noruega, Reino Unido, Polonia, Alemania, Japón y Estados Unidos, sección 6) prohíba la etapa `reina` en sus vueltas: el papel se degrada a `media_alto` y se anota (decisión 18), y la general se decide en `media_alto`, muro y crono. Hoy `ROUTE.mixWeights` reparte reinas en cualquier `terrain: 'hilly'` (geografía §14, punto 3), sin mirar el país.

**Qué cambia según la respuesta.** Son 42 carreras belgas, 14 neerlandesas, 4 danesas, 2 emiratíes y 4 australianas de equipos (mapa 02 §10); el test de la decisión 13 sella «0 reinas en BE, NL, DK, AE, AU» y `routeCensus` imprime cuántas vueltas quedan sin reina por país. La consecuencia visible es un UAE Tour generado que acaba en Jebel Hafeet como `media_alto` (`golfo` con `puerto: null` y `finalesAlto: 'corto'`, sección 6) y no como reina de gran vuelta. Rechazarlo no es «volver a `mixWeights`»: la única forma coherente es editar `TERRITORIOS[XX].cordillera` a una zona de su `ruta` con `relieve ∈ {montana, alta}` (`geo.test.ts` lo exige), y para BE, NL, DK y AE esa zona no existe en `ZONAS`, así que decir «no» ahí es inventar geografía. Donde sí existe (GB con `britanicas`, US con `norteamerica`), la respuesta es una línea de datos y el país sale de la lista sellada.

**Recomendación.** Aceptarlo: es lo real, y la general que se decide en muros y crono es exactamente lo que distingue una vuelta belga de una alpina. **Valor por defecto: se acepta.**

### 18.10 D9 · El techo de kilómetros por clase

**Qué se decide.** Con qué cifras se codifica `ARCH.km.maxPorClase`, el techo que V13 comprueba tras el jitter. El mapa 07 §4.1 da un techo UCI de 280 para el WT de un día «salvo excepciones como Sanremo», 200 para .1 y 240 para Pro, «cifra a confirmar», y [140; 180] para .2 y [180; 260] para nacionales.

**Qué cambia según la respuesta.** El valor por defecto es { WT: 260, Pro: 240, '1': 200, '2': 180, NC: 260 }: el WT se cierra en 260 porque `ARCH.km.porClase` para un día WT es [200, 60] y el techo debe casar con el rango, y porque las 36 filas con `km` explícito (Sanremo 294) no pasan por el techo (decisión 36). Si el dueño confirma otras cifras, cambia esa constante y nada más: V13 y la banda `km.clase` de `calendario.test.ts` (p90 de .2 ≤ 170; ninguna etapa por encima del techo) se vuelven a correr, y ninguna otra prueba se re-sella. Lo que no es de esta decisión es la tabla `porClase` misma (decisión 36): que el 210 fijo de 142 de las 178 carreras de un día (mapa 02 §9) desaparezca ya está decidido.

**Recomendación.** Codificar las del mapa con el comentario «a confirmar» en la constante y no esperar a confirmarlas. **Valor por defecto: las cifras de arriba.**

### 18.11 D10 · Qué enseña la ficha

**Qué se decide.** Si la ficha de una etapa generada enseña solo la marca de origen («Recorrido generado») o además la frase de arquitectura («Circuito de 14 km × 9 vueltas con un muro de 1,1 km al 11 %; meta a 2 km del muro») y «Edición N» con `cambiosRespectoAnterior` (decisión 39). Los tres textos de origen no son de esta decisión: «Recorrido real (fuente citada)», «Ciudades y distancia reales, relieve generado» y «Recorrido generado» se enseñan en todo caso (arquitectura §10.2, promesa de E12 vía mapa 05 §8).

**Qué cambia según la respuesta.** La API expone `routeSource`, `arch.frase`, `edicion` y `cambiosRespectoAnterior` en cualquiera de las dos respuestas (`apps/api/src/routes/calendar.ts` l. 91-105; la galería de la sección 16 y `scripts/inventario-recorridos.mjs` los leen igual); la decisión solo mueve lo que la web pinta. El argumento a favor de la marca a secas lo reconoce el documento y no lo comparte: la frase se compone en `generate.ts` a partir de `Motif.nombre`, en castellano, y E10 (multiidioma) tendrá que traducirla motivo a motivo. El argumento a favor de la frase es el de banco §14: es lo que hace reconocible una carrera un año después sin mapa, y sin ella el jugador no puede distinguir una Lieja generada de una Lombardía generada más que corriéndolas.

**Recomendación.** Frase y edición siempre. **Valor por defecto: frase de arquitectura y «Edición N» en toda ficha de etapa `edicion` o `generado`; las `real` no llevan ni una cosa ni otra.**

### 18.12 Lo que la galería le pide y cómo se recogen las respuestas

La sección 16 le pide al dueño una tarde, no una decisión: `scripts/galeria-recorridos.mjs` se genera en el paso 4 y se entrega antes del paso 8, con 5 perfiles por zona × esqueleto compatible y los 4 nacionales de cada uno de los 133 países, y con tres preguntas por perfil (¿existe en ese sitio?, ¿existe en esa clase?, ¿la reconocería un aficionado?). Sus respuestas editan datos (`ZONAS`, `RACE_REGION`, `ARCH.pesoPorClase`) y nunca código; una respuesta que apunte a un rango de `ARCH.motivo.*` o a un veto vuelve a esta sección como decisión nueva, con la fila adjunta (sección 16). Las 310 carreras y las 60 ediciones de `RACE_REGION` las cura el implementador con `raceRoutes.ts` abierto (decisión 14); lo que el dueño revisa es el resultado, en la galería, y no la tabla.

Las diez respuestas se anotan en la nota «v61 · El generador es una gramática» de `docs/balance.md`, en un apartado propio con el identificador, la respuesta, la fecha y el valor implementado; una decisión sin respuesta en el momento en que su paso la necesita (tabla de 18.1) se anota como «por defecto» y sigue abierta. En el código, cada valor lleva el comentario `// Dn: valor por defecto (docs/generador.md §18)` hasta que la respuesta lo confirme o lo cambie, y entonces el comentario pasa a citar la fecha. D2 y D6 son las dos que no se contestan sin cifra: la tabla del censo tras el paso 8 y la tabla pareada del paso 9 se le ponen delante, y hasta entonces el valor por defecto es lo que corre.

---

## 19. Apéndice A: los 45 injertos y dónde cayeron · Apéndice B: objeciones de los jueces y respuesta

Este apéndice es la trazabilidad del documento y el material de partida de la fase adversaria. La base es `propuestas/arquitectura.md`, que ganó dos votos de tres (cobertura y ejecutabilidad; el juez del motor votó a `ingeniero`) y quedó primera en el ranking agregado de `juicios/veredicto.json` con 100 puntos, por delante de `banco` (97,5), `geografia` (95,5), `ingeniero` (94) y `datos` (91,5). Sobre ella se injertaron las 45 ideas que los tres jueces pidieron tomar de las otras cuatro (17 del juez de cobertura, 14 del juez del motor, 14 del juez de ejecutabilidad, en el orden en que `veredicto.json` las lista), y se respondió a los 27 riesgos que ninguna propuesta resolvía (10 + 8 + 9). El apéndice A dice dónde cayó cada injerto y si entró entero o con qué cambio; el apéndice B dice, para cada objeción a la ganadora y para cada riesgo, qué sección lo resuelve y con qué test, o dónde se acepta como sacrificio y se documenta. Nada de lo que hay aquí es nuevo respecto de las secciones 1 a 18: es el índice inverso, para que un refutador que venga con una propuesta o un juicio en la mano encuentre en una fila la respuesta y el fichero de test que la sella.

### 19.1 Apéndice A: los 45 injertos y dónde cayeron

#### 19.1.1 Cómo se lee la tabla

La numeración `I-1` a `I-45` es la del orden de `juicios/veredicto.json`: `I-1` a `I-17` son los injertos del juez de cobertura (`juicios/cobertura.md` §4), `I-18` a `I-31` los del juez del motor (`juicios/motor.md` §4) y `I-32` a `I-45` los del juez de ejecutabilidad (`juicios/ejecutabilidad.md` §4). La columna «Idea» da el nombre con el que la propuesta lo llamaba y, tras la flecha, el nombre canónico de la sección 3 (este apéndice es el único sitio del documento donde los alias de las propuestas se citan; la tabla completa de alias está en la nota al pie de la sección 3). La columna «Sección» es la sección de este documento donde el injerto está resuelto; la columna «Cómo» dice con qué decisión o constante; la última columna dice si entró entero o con qué cambio respecto de lo que la propuesta pedía.

Tres advertencias sobre el recuento. Primera: varios jueces pidieron la misma idea, así que los 45 injertos son 26 ideas distintas (contadas sobre la tabla: V8 aparece tres veces como `I-5`, `I-18` e `I-32`; el censo con protocolo tres veces como `I-6`, `I-20` e `I-33`; la huella FNV tres veces como `I-3`, `I-30` e `I-37`). Segunda: `I-21`, `I-22` e `I-23` son injertos que el juez del motor pidió tomar DE `arquitectura` para injertarlos en `ingeniero`, su ganadora; como la síntesis parte de `arquitectura`, esas tres ideas son base y no injerto, y se listan igual para que los 45 cuadren con el veredicto. Tercera: por propuesta de origen, entraron 13 ideas de `datos`, 12 de `banco`, 11 de `geografia`, 6 de `ingeniero` y las 3 de la propia `arquitectura`; por eso el juez de cobertura escribió (§3) que la síntesis tenía que ser casi tanto de `geografia` como de la ganadora, y que el protocolo de `banco` había que adoptarlo entero.

#### 19.1.2 La tabla

| I    | Juez           | De           | Idea (nombre de la propuesta → canónico)                                                                                                                                                                                                     | Sección      | Cómo                                                         | Entera o con cambio                                                                                                                                                                                                                                                                                                  |
| ---- | -------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I-1  | cobertura      | geografia    | `PaisajeSpec` con `null` = «aquí no existe» → `GeoSignature.puerto/cota/muro` nullable; `Territorio.cordillera`                                                                                                                              | 3, 6         | decisiones 12 y 13                                           | Entera. `puertoLargo` de geografia no existe como campo: lo cubre `finalesAlto: 'largo'` y el V4 de altitud                                                                                                                                                                                                          |
| I-2  | cobertura      | geografia    | itinerario como ventana contigua del territorio; reina solo en cordillera; transición → `itinerarioDe`, `ARCH.itinerario`                                                                                                                    | 7            | decisión 18                                                  | Con cambio: las cuatro garantías de `mixRoles` (`calendar.ts` l. 457-519) se conservan como reglas y las de bloque se aplican como reparación determinista DESPUÉS; el intercambio de reina hacia la cordillera de geografia §7.1 se sustituye por «reina solo donde la meta lo permite, si no `media_alto` anotada» |
| I-3  | cobertura      | geografia    | huella FNV de 177 + 3 grandes vueltas antes de tocar `calendar.ts` → `routes/realFingerprint.test.ts`                                                                                                                                        | 11, 15       | decisión 28                                                  | Entera; se sella en el paso 1 y se comprueba en el 8                                                                                                                                                                                                                                                                 |
| I-4  | cobertura      | geografia    | tabla pareada como condición para borrar el viejo, copiado a `sim/legacy/` → `sim/legacy/profileGenLegacy.ts`                                                                                                                                | 13, 15       | decisión 29                                                  | Entera; la copia vive solo durante el paso 9 y se borra en el mismo cambio que cierra la nota de `balance.md`                                                                                                                                                                                                        |
| I-5  | cobertura      | banco        | V8 por etapa (`queenClimbOutsideLast30Min` 0,25) → `ARCH.reina.subidaLejanaMin` 0,25 y `.subidaLejanaKm` 30; test «`reina-150` como esqueleto no pasa `verify`»                                                                              | 9            | V8b, decisión 6                                              | Entera; es la cláusula (b) de V8 y aplica a TODA reina, `et_reina_blanda` incluida                                                                                                                                                                                                                                   |
| I-6  | cobertura      | banco        | `routeCensus` estratificado con `finishType`; bandas con «hoy (medido)»; pre-registro; cuatro condiciones → `sim/routeCensus.ts`, `ROUTE_CENSUS_TARGETS`                                                                                     | 13           | decisiones 30 y 31                                           | Entera; `finishType(…, 50)` solo aquí (regla de vetos puros, decisión 4); 0,57 s medidos por `juicios/coste-motor.mjs`                                                                                                                                                                                               |
| I-7  | cobertura      | banco        | `calendarQueens` estratificada por `finalKind` × desnivel; `reina-175-4800`; `mountain.*` renombrada → `forma.reinaCanonica.*`                                                                                                               | 13           | decisión 32                                                  | Entera                                                                                                                                                                                                                                                                                                               |
| I-8  | cobertura      | banco        | `queenDplusIncludesFill` y guarda `segment.km === Σ tramos` → `ARCH.reina.dPlusIncluyeRelleno` true; guarda en `garantizaClase`                                                                                                              | 8, 12        | decisiones 9 y 10                                            | Entera                                                                                                                                                                                                                                                                                                               |
| I-9  | cobertura      | banco        | las etapas de edición reciben arquetipos DE ETAPA (`etapa_*`) → tabla `EditionTerrain → et_*`                                                                                                                                                | 5, 1         | sección 5                                                    | Entera; además entra como diagnóstico (Colombia e5 con 18 km tras la cota contra los «47 km rodadores» del `why`)                                                                                                                                                                                                    |
| I-10 | cobertura      | datos        | `RACE_REGION` curada (310 + por etapa en 60) y test → `grammar/regions.ts`                                                                                                                                                                   | 6            | decisión 14                                                  | Entera; se retira el sorteo `geo                                                                                                                                                                                                                                                                                     | raceId` de arquitectura §3.5 |
| I-11 | cobertura      | datos        | `EDITION.level` 2 con `alternates` → `ARCH.edicion.nivel` 2 y `Skeleton.alternativas`                                                                                                                                                        | 10, 5        | decisión 22                                                  | Con cambio: el nivel por defecto es 1 (jitter) y el 2 solo actúa donde el esqueleto declara `alternativas` (D7)                                                                                                                                                                                                      |
| I-12 | cobertura      | datos        | anti-clon calibrado en pares reales (`cloneMaxCorrelation`) → `ARCH.anticlon.maxCorrelacion`                                                                                                                                                 | 9            | V12                                                          | Con cambio: provisional 0,85 hasta calibrar en el paso 9 sobre el p90 de Ronde/E3, Amstel/Brabant, Lombardía/Lieja                                                                                                                                                                                                   |
| I-13 | cobertura      | datos        | extractor como instrumento de medida, no fuente (`extraer-arquetipos.mjs`) → `scripts/medir-real.mjs`                                                                                                                                        | 13, 16       | decisión 40                                                  | Con cambio: solo alimenta `ROUTE_CENSUS_TARGETS` donde hay ≥ 3 fuentes y el calibrado de V12; el generador no lee ningún fichero regenerable                                                                                                                                                                         |
| I-14 | cobertura      | datos        | `kmByClass` con «un día»; desaparece el 210 fijo → `ARCH.km.porClase`                                                                                                                                                                        | 7, 12        | decisión 36                                                  | Con cambio: la forma es la tabla de `I-45`, no el factor de arquitectura §7.4                                                                                                                                                                                                                                        |
| I-15 | cobertura      | ingeniero    | `frozenSkeletons` → `sim/frozenSkeletons.ts`                                                                                                                                                                                                 | 13           | decisión 33                                                  | Entera; `Skeleton` literal renderizado con `renderSkeleton`, `why` reescrito por forma                                                                                                                                                                                                                               |
| I-16 | cobertura      | ingeniero    | paso 0 de línea base con `it.todo` y builders legado pareados → pasos 0 y 1 del plan; `grammar/legacy.ts`                                                                                                                                    | 15           | pasos 0 y 1                                                  | Con cambio: sin versión propia por paso (un solo salto en el 8, decisión 3); la tabla pareada «igual dentro del ruido» se conserva                                                                                                                                                                                   |
| I-17 | cobertura      | ingeniero    | `climb` con `gMax`; `DEFAULT_ROUTE_CONTEXT` → `ARCH.motivo.muro.gMax` 16; `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)`                                                                                                      | 4, 7, 8      | decisiones 11 y 19                                           | Entera                                                                                                                                                                                                                                                                                                               |
| I-18 | motor          | banco        | V8 duro en contrato y `verify` + test `reina-150`                                                                                                                                                                                            | 9            | = I-5                                                        | Entera                                                                                                                                                                                                                                                                                                               |
| I-19 | motor          | banco        | `queenDplusIncludesFill` con `desnivelDe` o estimación de relleno                                                                                                                                                                            | 8, 12        | decisión 9                                                   | Con cambio: se elige la estimación `ARCH.reina.rellenoDplusPorKm` 5,5 (sin `sampleProfile` en el generador) y se verifica con `dPlusDe(profile)`; el delta contra `calendarQueens::desnivelDe` lo imprime `routeCensus` (esperado < 5 %)                                                                             |
| I-20 | motor          | banco        | protocolo «mejor y no solo distinto» + censo en `test:rapido`                                                                                                                                                                                | 13, 2        | decisiones 30 y 31                                           | Entera; además da el principio 9                                                                                                                                                                                                                                                                                     |
| I-21 | motor          | arquitectura | meta contra `deriveFinishTerrain` (aprox 2 km a amp ≤ 2,5) → `ARCH.meta.muro.aproxKm` 2 y `.aproxAmp` 2,5                                                                                                                                    | 4            | decisión 7                                                   | Base de la ganadora; con cambio: las holguras sobre los cortes 5 y 20 pasan de 0,5 a 0,7 (`I-43`)                                                                                                                                                                                                                    |
| I-22 | motor          | arquitectura | `et_reina_blanda` con peso propio → `ARCH.reina.blandaShare`                                                                                                                                                                                 | 5, 12        | decisión 8                                                   | Base de la ganadora; con cambio: declarada como cola baja decidida en el diseño, como pidió el juez de cobertura (§3) y llevada a D6                                                                                                                                                                                 |
| I-23 | motor          | arquitectura | V5 con 4,2 km a [3; 17] y muro ≤ 2,1                                                                                                                                                                                                         | 9, 5         | decisión 5                                                   | Base de la ganadora; con cambio: el muro de meta pasa a ≤ 2,2 km por `I-35`                                                                                                                                                                                                                                          |
| I-24 | motor          | datos        | `garantizaClase` + guarda clásica ≤ 2,9 + recorte de valle (`classMarginKm` 0,3) → `ARCH.veto.margenClaseKm` 0,3 y `.margenValleKm` 0,7                                                                                                      | 8, 9         | decisión 10                                                  | Con cambio: dos márgenes en vez de uno; 0,3 sobre 8,5 (datos) y 0,7 sobre los cortes 5 y 20 (ingeniero, `I-43`)                                                                                                                                                                                                      |
| I-25 | motor          | datos        | región por etapa para las ediciones → `RaceRegion.stages`                                                                                                                                                                                    | 6, 3         | decisión 14                                                  | Entera                                                                                                                                                                                                                                                                                                               |
| I-26 | motor          | datos        | `medir-real.mjs` como referencia p10/p50/p90                                                                                                                                                                                                 | 13, 1        | = I-13                                                       | Entera; además da la tabla real contra generado del diagnóstico                                                                                                                                                                                                                                                      |
| I-27 | motor          | datos        | semilla de edición separada de identidad; `${from}                                                                                                                                                                                           | ${to}        | ${km}`con`raceId`→`StageRequest.editionKey`; subflujos `arch | raceId`, `firma                                                                                                                                                                                                                                                                                                      | raceId`, `ed                 | raceId                                                                                                  | season` | 10, 8 | decisión 22 | Entera |
| I-28 | motor          | geografia    | `cordillera: null` como veto sellado; V4 altitud por integración                                                                                                                                                                             | 6, 9         | decisión 13; V4                                              | Entera; test «0 reinas en BE, NL, DK, AE, AU» y D8                                                                                                                                                                                                                                                                   |
| I-29 | motor          | geografia    | `BASE_SEASON` cuadrado con `calendarRun.ts` l. 135; `ROUTE.edicion.activa` → `BASE_SEASON` 0; `ARCH.edicion.activa`                                                                                                                          | 10           | decisión 21                                                  | Entera; comprobado en código, no preguntado al dueño                                                                                                                                                                                                                                                                 |
| I-30 | motor          | geografia    | huella FNV (177 + 3) y golden de 1.418 en el paso sin cambio                                                                                                                                                                                 | 11, 15       | decisión 28                                                  | Entera: las dos huellas; `golden.test.ts` se borra en el paso 8 y `realFingerprint.test.ts` sobrevive                                                                                                                                                                                                                |
| I-31 | motor          | geografia    | pancarta `cima` ≥ 1,5 km, corregida para el muro de meta (`pancartaCimaMinKm`) → `ARCH.pancarta.cimaMinKm` 1,5                                                                                                                               | 8            | decisión 25                                                  | Con cambio: SIEMPRE pancarta en el último `puerto` de la etapa para que `lastClimbKm` (`finalKind.ts` l. 46-57) vea el muro de meta; en circuito una por paso ≥ 1,5 km                                                                                                                                               |
| I-32 | ejecutabilidad | banco        | V8 duro y test `reina-150`                                                                                                                                                                                                                   | 9            | = I-5                                                        | Entera                                                                                                                                                                                                                                                                                                               |
| I-33 | ejecutabilidad | banco        | `routeCensus` + línea base + pre-registro + cuatro condiciones + doble lectura                                                                                                                                                               | 13           | = I-6, I-20                                                  | Entera                                                                                                                                                                                                                                                                                                               |
| I-34 | ejecutabilidad | banco        | `SEASON_CALENDAR = calendarFor(BASE_SEASON)` tirando dados; estratificada; `reina-175-4800`; renombrar → `calendarForSeason(0)` con `ed                                                                                                      | raceId       | 0`                                                           | 10, 13                                                                                                                                                                                                                                                                                                               | decisiones 21 y 32           | Con cambio: la temporada base es 0 y no 1 (error de hecho de banco §6.2 contra `calendarRun.ts` l. 135) |
| I-35 | ejecutabilidad | datos        | `muro_final` [0,5; 2,2] km al [8; 16] %, `puncheur` por encima de 1,0 (`wallMaxKm`) → `ARCH.meta.muro`                                                                                                                                       | 4, 12        | decisión 7                                                   | Entera; `ARCH.meta.muro.finishMuroMaxKm` 1,0 declara el `puncheur` en la tabla de `MetaKind`                                                                                                                                                                                                                         |
| I-36 | ejecutabilidad | geografia    | territorio como ruta con cordillera; itinerario; transición 40/60                                                                                                                                                                            | 6, 7         | = I-2                                                        | Con el mismo cambio que `I-2`                                                                                                                                                                                                                                                                                        |
| I-37 | ejecutabilidad | geografia    | huella FNV; fallback 0 en equipos; lista de `generico`                                                                                                                                                                                       | 11, 6        | decisiones 28 y 13                                           | Entera; `Territorio.fallback` contado en `geo.test.ts`, 0 en carreras de equipos                                                                                                                                                                                                                                     |
| I-38 | ejecutabilidad | geografia    | `null`; `admite`/`degradar` hacia abajo; pólder [0,4; 0,9]; `fillMaxGradient` 2,4 → `ARCH.motivo.enlace.ampMax` 2,4; `GeoSignature.amplitud`                                                                                                 | 6, 4         | decisión 12                                                  | Entera                                                                                                                                                                                                                                                                                                               |
| I-39 | ejecutabilidad | datos        | extractor y tabla real como referencia; anti-clon calibrado                                                                                                                                                                                  | 13, 9        | = I-12, I-13                                                 | Entera                                                                                                                                                                                                                                                                                                               |
| I-40 | ejecutabilidad | datos        | `RACE_REGION` curada en vez de sorteo; `source: 'mixto'`                                                                                                                                                                                     | 6, 11        | decisión 14                                                  | Con cambio: `mixto` es agregado de CARRERA (`CalendarRace.routeSource`), nunca valor de etapa; la etapa lleva `real`, `edicion` o `generado`                                                                                                                                                                         |
| I-41 | ejecutabilidad | datos        | `EDITION.level` 2; D2 con la cifra 27 de 113                                                                                                                                                                                                 | 10, 18       | decisiones 22 y 26; D2                                       | Con cambio: D2 se abre tras el paso 8 con la tabla del censo, no antes                                                                                                                                                                                                                                               |
| I-42 | ejecutabilidad | ingeniero    | paso previo con la arquitectura de hoy (builders legado, tabla pareada) → `grammar/legacy.ts`                                                                                                                                                | 15           | paso 1                                                       | Con cambio: sin salto de versión propio (`I-16`)                                                                                                                                                                                                                                                                     |
| I-43 | ejecutabilidad | ingeniero    | `gMax` 16; bajada canónica; `finalKindMarginKm` 0,7; `fallbackMaxShare`; `DEFAULT_ROUTE_CONTEXT`; `frozenSkeletons` → `ARCH.motivo.muro.gMax`, `ARCH.motivo.descenso.kmPorDesnivel`, `ARCH.veto.margenValleKm`, `ARCH.veto.fallbackMaxShare` | 4, 8, 12, 13 | decisiones 10, 11, 19, 33                                    | Con cambio: `fallbackMaxShare` es un par { calendario: 0; testPorEsqueleto: 0,005 }, no un único 0,005                                                                                                                                                                                                               |
| I-44 | ejecutabilidad | ingeniero    | `kind = stageKindOf(profile).kind` con objetivo de que el 49 baje                                                                                                                                                                            | 11           | decisión 23                                                  | Con cambio: el objetivo se escribe como «solo etapas reales cuya etiqueta declarada difiere; generadas = 0», y solo tras unificar la regla de `Summit finish` con `SUMMIT_RUN_IN_KM` 5 (riesgo motor 2), sin la cual el 49 no puede bajar                                                                            |
| I-45 | ejecutabilidad | banco        | `kmByClass` por clase Y papel como tabla; `stageMaxKm`; «cifras UCI a confirmar» → `ARCH.km.porClase`, `ARCH.km.maxPorClase`                                                                                                                 | 7, 12        | decisión 36; D9                                              | Entera; sustituye el factor de `I-14`                                                                                                                                                                                                                                                                                |

#### 19.1.3 Los injertos que no entraron enteros, y por qué

Los cambios de la última columna no son recortes: son colisiones entre injertos, o entre un injerto y una decisión del motor, que había que resolver con un criterio. Se listan agrupados por el criterio que los resolvió.

**Cuando dos jueces pedían lo mismo con números distintos, gana el número con dato.** `I-23` (arquitectura, muro de meta ≤ 2,1 km) contra `I-35` (datos y banco, [0,5; 2,2] km): gana 2,2 porque San Luca mide 2,1 y el juez de ejecutabilidad lo señaló como hueco (§2.1, pega b). `I-24` (datos, `classMarginKm` 0,3) contra `I-43` (ingeniero, `finalKindMarginKm` 0,7): no compiten, porque miden bordes distintos; 0,3 va sobre `PASS_MIN_KM` 8,5 (`ARCH.veto.margenClaseKm`) y 0,7 sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (`ARCH.veto.margenValleKm`), con la razón de ingeniero (`normalize` estiraba hasta un 2 % y `auto()` redondea el km de la pancarta; los 4 de 6.000 del mapa 01 §2.5). `I-14` (datos, «desaparece el 210») contra `I-45` (banco, tabla por clase y papel): gana la tabla, porque el juez de ejecutabilidad hizo la cuenta (0,75 × [200; 260] = [150; 195] para una .2 de un día, por encima de los 180 del mapa 07 §4.1).

**Cuando un injerto chocaba con la regla de vetos puros (decisión 4), se parte en dos.** `I-19` pedía medir el desnivel de reina «como `calendarQueens::desnivelDe`», que pasa por `sampleProfile`; en el generador entra la estimación 5,5 m/km y `dPlusDe` (integración de tramos, sin `sampleProfile`), y la medida con `desnivelDe` queda en `routeCensus` como delta impreso. Por la misma regla, `I-6`, `I-20` e `I-33` entran con `finishType(…, 50)` SOLO en el censo, y V7 de arquitectura se parte en V7 (`finalKindOf`, con reintento) y V16 (`finishType`, sin reintento).

**Cuando un injerto tocaba la identidad, se le pone el límite de la decisión 20.** `I-11` e `I-41` (rotación declarada) entran como nivel 2 pero solo donde `Skeleton.alternativas` existe y nunca sobre el papel de una etapa; `I-2` e `I-36` (itinerario) entran sin el intercambio de reina posterior a las garantías de geografia §7.1 paso 2b, que el juez del motor señaló como rotura potencial de `mixRoles` l. 495-517 (§2.2): la reina se degrada a `media_alto` y se anota, no se permuta.

**Cuando un injerto corregía a otro, entra corregido.** `I-31` (pancarta ≥ 1,5 km) entra con la corrección que los jueces del motor y de cobertura exigieron (pancarta SIEMPRE en el último `puerto`), porque tal como geografia lo escribía rompía `lastClimbKm` en un muro de meta. `I-34` entra con temporada 0 y no 1, porque `calendarRun.ts` l. 135 lo decide. `I-44` entra condicionado a `SUMMIT_RUN_IN_KM` en `stageKindOf`, porque sin unificar las dos reglas de etiqueta el objetivo sobre el 49 no es fiable (`juicios/motor.md` §5 riesgo 2). `I-40` entra con `mixto` como agregado de carrera, porque una etapa de edición real tiene ciudades y km reales y relieve generado y su valor correcto es `edicion`; `mixto` describe la carrera que mezcla orígenes. `I-13`, `I-26` e `I-39` entran con el extractor renombrado `scripts/medir-real.mjs` y degradado a instrumento, porque como fuente hacía que el generador cambiara con cada carga de E12 sin subir `ENGINE_VERSION` (`juicios/motor.md` §2.3).

**Cuando un injerto pedía un salto de versión propio, no lo tiene.** `I-16` e `I-42` (paso 0 de línea base y builders legado) entran como pasos 0 y 1 del plan sin versión, porque la decisión 3 (un solo salto, en el paso 8) es de cuatro propuestas contra una; lo que se conserva de ingeniero es lo que valía: la tabla pareada «igual dentro del ruido» que separa fontanería de forma antes de que nada cambie de conducta.

#### 19.1.4 Recuento por juez y por propuesta de origen

La tabla siguiente es la suma de la columna «De» de 19.1.2 por juez. Sirve para dos comprobaciones rápidas: que los 45 cuadran (17 + 14 + 14) y que ningún juez pidió tomar nada de `ingeniero` desde el foco del motor, porque para ese juez `ingeniero` era la ganadora y no una perdedora de la que injertar.

| Juez                             | geografia | banco | datos | ingeniero | arquitectura | Total |
| -------------------------------- | --------- | ----- | ----- | --------- | ------------ | ----- |
| cobertura (`I-1` a `I-17`)       | 4         | 5     | 5     | 3         | 0            | 17    |
| motor (`I-18` a `I-31`)          | 4         | 3     | 4     | 0         | 3            | 14    |
| ejecutabilidad (`I-32` a `I-45`) | 3         | 4     | 4     | 3         | 0            | 14    |
| Total                            | 11        | 12    | 13    | 6         | 3            | 45    |

Por sección de destino, las que más injertos absorben son la 13 (banco: `I-4`, `I-6`, `I-7`, `I-13`, `I-15`, `I-20`, `I-26`, `I-33`, `I-34`, `I-39`, `I-43`), la 6 (geografía: `I-1`, `I-10`, `I-25`, `I-28`, `I-36`, `I-37`, `I-38`, `I-40`) y la 9 (vetos: `I-5`, `I-12`, `I-18`, `I-23`, `I-24`, `I-28`, `I-32`, `I-39`). Las secciones 14 (rendimiento), 16 (galería) y 17 (riesgos) no absorben ningún injerto como destino principal: resuelven riesgos de 19.2.3 y solo citan injertos ya resueltos en otra sección (la 14 cita `I-20` e `I-34`; la 16 cita `I-13`).

### 19.2 Apéndice B: objeciones de los jueces y respuesta

#### 19.2.1 Las objeciones concretas a la ganadora

Los tres jueces puntuaron `arquitectura` en 9/8/7/9 (cobertura), 9/7/7/9 (motor) y 9/8/9/9 (ejecutabilidad), y cada uno escribió sus pegas. Aquí van todas, con la sección que las resuelve, cómo en una línea, y el test que lo sella. Donde la respuesta es un sacrificio, se dice «se acepta y se documenta» y se remite a la sección 17.

| #   | Objeción                                                                                                                                                             | Quién y dónde                                                                                        | Sección                                       | Cómo se resuelve                                                                                                                                                                                                                | Test o dato que lo sella                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | La temporada 0 no tira ningún dado y toma la mediana de cardinalidad (arquitectura §4.3): el calendario que sellan tests y bancos sería el menos variado             | ejecutabilidad §2.1 (c); motor injerto 12                                                            | 10                                            | Decisión 21: `BASE_SEASON = 0` y `calendarForSeason(0)` tira `ed                                                                                                                                                                | raceId                                                                                                                                      | 0`como cualquier temporada;`ARCH.edicion.activa` es el interruptor                                             | `edition.test.ts`: «`stagesForSeason(id, 0) === SEASON_CALENDAR`»; la entropía por zona de `ROUTE_CENSUS_TARGETS` se mide sobre la temporada 0 |
| B2  | Hueco [8,0; 9,0] km entre `cota` y `puerto`: Ghisallo 8,6, Bocchetta 8,5, Mont du Chat 8,7 no pueden nacer                                                           | ejecutabilidad §2.1 (a)                                                                              | 4, 17                                         | Se acepta y se documenta (riesgo 6): es el precio de la holgura sobre `PASS_MIN_KM` 8,5; Ghisallo sale como 9,0                                                                                                                 | `motifs.test.ts`: ningún `cota` > 8,0 ni `puerto` < 9,0 rendido; comentario en `ARCH.motivo.puerto.km`                                      |
| B3  | Ningún `MetaKind` entre 1,0 y 3,0 km en meta: San Luca 2,1 no existe                                                                                                 | ejecutabilidad §2.1 (b) e injerto 4                                                                  | 4                                             | Decisión 7: `muro_meta` [0,5; 2,2] km al [8; 16] %, `puncheur` declarado por encima de 1,0                                                                                                                                      | `motifs.test.ts`: `muro_meta` ≤ 1,0 km tipa `muro` en 300 de 300; V16 en `routeCensus`: `muro` ≥ 1 %, `puncheur` ≥ 8 %                      |
| B4  | Los pesos base del catálogo y la tabla `ARCH.pesoPorClase` no están escritos                                                                                         | ejecutabilidad §2.1 y §3; cobertura §2.1                                                             | 5, 12                                         | `Skeleton.pesoBase` entero por esqueleto, tomado de banco §5.2 y geografia §4.6; `ARCH.pesoPorClase` entera (esqueleto × WT/Pro/.1/.2/NC)                                                                                       | `skeletons.test.ts`: catálogo bien formado, todo `pesoBase > 0` salvo `ud_criterium`; banda «esqueletos distintos por clase ≥ 8/10/6/9»     |
| B5  | `normalizeEnlaces` es mecanismo nuevo donde `normalize` ya funcionaba, con su propio modo de fallo (V10) y el p95 de intentos ≤ 3 es una apuesta sin medir           | ejecutabilidad §2.1                                                                                  | 8, 9                                          | Decisión 10: se mantiene porque resuelve el hallazgo 2 de raíz (la dificultad nunca se deforma); `garantizaClase` es la red de seguridad; V10 dispara reintento                                                                 | `skeletons.test.ts`: `intentos` p95 ≤ `ARCH.veto.intentosP95` 3 por esqueleto × 5 km × 60 semillas × zonas; `fallbackMaxShare.calendario` 0 |
| B6  | Sorteo de zona con `geo                                                                                                                                              | raceId` en FR/IT/ES si la fila no la declara (§3.5): una .2 bretona podría salir con puertos alpinos | cobertura §2.1 y §3; ejecutabilidad injerto 9 | 6                                                                                                                                                                                                                               | Decisión 14: `RACE_REGION` curada por carrera (310) y por etapa (60 ediciones); el sorteo se retira                                         | `regions.test.ts`: ninguna carrera de equipos cae a `zonaDe(country)`; solo los 532 .NC                        |
| B7  | V7 llama a `finishType(deriveFinishTerrain(sampleProfile))` en cada intento: acoplamiento inverso y 0,4 a 0,9 ms por etapa e intento                                 | motor §2.1 y §5 riesgo 3                                                                             | 9, 2                                          | Decisión 4: `verify` solo lee `routes/`; V7 queda con `finalKindOf` y V16 mide `finishType` en el censo sin reintento                                                                                                           | `veto.test.ts` no importa `stage/`; `sim/routeCensus.test.ts`                                                                               |
| B8  | La edición varía «los papeles de las etapas de en medio» (§6.1): el `kind` por temporada deja de ser el que leen `callups.ts` l. 98 y `calendarRun.ts` l. 516 y 1614 | motor §2.1 y §5 riesgo 1                                                                             | 10, 11                                        | Decisión 20: papeles, `timeTrial` y número de etapas son identidad; decisión 23: `race_routes` gana `kind`, `label`, `time_trial` y los cuatro lectores leen el congelado                                                       | `edition.test.ts`: temporadas 1 a 5 contra 0 con mismo `kind`, `timeTrial` y `n`; migración `00NN_race_routes_kind.sql`                     |
| B9  | `Weighted<StageRole>` y `BlockRule` de `TourSkeleton` no están definidos                                                                                             | motor §2.1                                                                                           | 3, 7                                          | Definidos en TypeScript en la sección 3; `BlockRule.repara` es determinista y va de atrás hacia delante                                                                                                                         | `tour.test.ts`: bloques V13/V14 sobre 120 semillas × n × 5 relieves                                                                         |
| B10 | El 210 km fijo de 142 carreras de un día se conserva en temporada 0 y solo lo mueve `kmJitter` (§4.3)                                                                | cobertura §2.1 y §3                                                                                  | 7, 12                                         | Decisión 36: `ARCH.km.porClase` como tabla desde la temporada 0, km sorteado con `firma                                                                                                                                         | raceId`; las 36 filas con `km` explícito lo conservan                                                                                       | banda de `ROUTE_CENSUS_TARGETS`: desviación típica de km de un día > 15 km en .1 y .2 (hoy 0); p90 de .2 ≤ 170 |
| B11 | La lección de `reina-150` entra solo como V8a y banda p10 ≥ 5 %, no como veto por etapa                                                                              | cobertura §2.1; motor injerto 1; ejecutabilidad injerto 1                                            | 9                                             | Decisión 6: V8b, ≥ 25 % de los km de subida a más de 30 km de meta, sobre toda reina                                                                                                                                            | `veto.test.ts`: «`reina-150` expresada como esqueleto no pasa `verify`»                                                                     |
| B12 | Afirma que `calendar.test.ts` l. 184-246 sigue en verde sin tocarlo, sin decir cómo conserva la firma de `stageMix` al indexar por relieve                           | motor §2.1                                                                                           | 7                                             | Decisión 19: `stageMix(n, terrain, seedBase, ctx = DEFAULT_ROUTE_CONTEXT)` conserva firma y delega en `composeTour`                                                                                                             | `calendar.test.ts` l. 184-277 y `stageKind.test.ts` compilan entre pasos (paso 1)                                                           |
| B13 | `et_reina_blanda` es la forma de `reina-150` conservada a propósito como cola baja y debe quedar declarado como decisión, no como consecuencia                       | cobertura §2.1 y §3                                                                                  | 5, 12, 18                                     | Decisión 8: `ARCH.reina.blandaShare` { media 0,25; montana 0,25; alta 0,10 } escrita como cola baja decidida en el diseño; D6 con la cifra tras el paso 9; V8b se le aplica igual                                               | `calendarQueens.test.ts` estratificada; banda «D+ de reina por formato con la cubeta < 1.500 poblada ≥ 5 %»                                 |
| B14 | El mapeo `role` de las 226 etapas de edición sin rasgos se deja en una línea (§10.1)                                                                                 | motor §2.1                                                                                           | 5                                             | Tabla `EditionTerrain → et_*` (`flat → et_llana`, `hilly → et_media_*`, `mountain → et_reina_*`, `itt → et_crono`, `cobbles → ud_adoquin_ligero`), nunca esqueleto de un día                                                    | `realFingerprint.test.ts` no cambia (son etapas sin rasgos); `edition.test.ts` para `raceId                                                 | e{i}                                                                                                           | {editionKey}`                                                                                                                                  |
| B15 | Superficie de contenido: 32 esqueletos con ventanas y plantilla canónica a mano, 29 zonas con diez columnas, una tarde de contenido por bloque                       | cobertura §2.1 (ejecutabilidad 7); motor §2.1                                                        | 5, 6, 16                                      | Se escribe todo: las 32 plantillas `canonico` en la sección 5, las 29 filas × 12 columnas de `ZONAS` en la 6; la galería del paso 4 valida lo que es juicio antes del paso 8                                                    | `skeletons.test.ts`: la plantilla canónica de cada esqueleto pasa `verify`; `geo.test.ts` de consistencia interna                           |
| B16 | Arranque por debajo del segundo (§4.8, §13.9) afirmado sin medir; con `sampleProfile` por intento el módulo pasaría de 0,6 s a unos 2 s por temporada                | motor §1 y §5 riesgo 6                                                                               | 14                                            | Decisión 35: medida en el paso 0 y en el 8 con `scripts/medir-arranque.mjs`; sin `sampleProfile` en `generateStage`; objetivo 1.500 ms, techo 2.500, ≤ 1.000 por temporada; perezoso por carrera si se supera                   | `routes/arranque.test.ts`; referencia 578 ms hoy (`juicios/coste-motor.mjs`)                                                                |
| B17 | Retirar `normalize`, `garantizaPuerto`, `ROUTE.queen*` y `ROUTE.km*` en un solo salto es el coste mayor de las cinco y el mayor riesgo de regresión                  | motor §3                                                                                             | 15, 12                                        | Se mantiene el salto único, pero con paso 0 (línea base) y paso 1 (builders legado, tabla pareada «igual dentro del ruido», `golden.test.ts` de 1.418) antes de cambiar conducta; la retirada es en el paso 8 con nota «v61 §1» | `golden.test.ts` (paso 1 a 7) y `realFingerprint.test.ts` (sobrevive)                                                                       |
| B18 | V12 con < 0,8 es un número sin dueño ni método                                                                                                                       | cobertura injerto datos                                                                              | 9                                             | `ARCH.anticlon.maxCorrelacion` provisional 0,85 y calibrado en el paso 9 sobre pares reales de la misma familia                                                                                                                 | `calendario.test.ts`: correlación mediana < 0,8 y máx < 0,9 como banda; calibrado anotado en `balance.md`                                   |
| B19 | `amplitud` 0,55 para `flandes` sigue siendo la escala de `RELIEF` y no una pendiente medida, y la degradación del hueco no tiene regla de dirección                  | ejecutabilidad injerto 7                                                                             | 6, 4                                          | Decisión 12: `amplitud` en % con pólder [0,4; 0,9] (Brugge-De Panne, ~300 m), `enlace.ampMax` 2,4; `degradar()` siempre hacia abajo                                                                                             | `geo.test.ts`: `amplitud ≤ ARCH.motivo.enlace.ampMax`; `motifs.test.ts`: ningún `enlace` rendido con tramo ≥ 3 %                            |
| B20 | `mixWeights.mountain[reina] = 0,40` se sustituye (las cuatro lo hacen; solo ingeniero lo conserva como decisión del dueño)                                           | cobertura cabecera                                                                                   | 7                                             | `ARCH.pesosComposicion` por `Relieve` × `StageRole` sustituye `ROUTE.mixWeights`; la consecuencia sobre el 40 % de reinas de hoy se mide en el censo antes de mover `smallTours`                                                | banda de reparto de papeles en `ROUTE_CENSUS_TARGETS`; `smallTours` remedido en el paso 9                                                   |

#### 19.2.2 Lo que la síntesis no tomó de las otras cuatro, y por qué

Los jueces también objetaron a las no ganadoras, y varias de esas objeciones son ideas que una lectura rápida de las propuestas podría querer rescatar. Se listan aquí para que el implementador que abra `propuestas/*.md` sepa qué está descartado a propósito y qué hay en su lugar.

| Propuesta    | Lo que se deja fuera                                                                                                                                                | Quién lo objetó                                                                                                                                                              | Qué hay en su lugar                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| banco        | `SEASON_CALENDAR = calendarFor(1)` y `season: 1` (§3.2, §6.2)                                                                                                       | cobertura (comprobado en `calendarRun.ts` l. 135); motor §2.5                                                                                                                | `BASE_SEASON = 0` (decisión 21)                                                                                                                         |
| banco        | `stageFor` resortea el arquetipo a partir del tercer reintento (§4.3) mientras §6.2 dice que no se sortea por edición                                               | motor §2.5                                                                                                                                                                   | el reintento solo cambia la semilla de `mot`, `pos` y `dib` con `i{intento}`; nunca la de `arch                                                         | raceId` (sección 8)           |
| banco        | la edición puede cambiar el arquetipo de una etapa de en medio y permutar (§6.2)                                                                                    | motor §2.5 y §5 riesgo 1                                                                                                                                                     | decisión 20: papeles, `timeTrial` y `n` son identidad                                                                                                   |
| banco        | run-in de un día hasta 25 km (§4.2)                                                                                                                                 | ejecutabilidad §2.3 (el WT real es de 0 a 17, mapa 07 §4.3)                                                                                                                  | `ARCH.meta.unDiaUltimaCota.aMeta` [3; 17]                                                                                                               |
| banco        | `valleyMargin` 0,3 sobre los cortes 5 y 20                                                                                                                          | ejecutabilidad §2.3 (mapa 01 §2.5 sugiere más)                                                                                                                               | `ARCH.veto.margenValleKm` 0,7 (`I-43`)                                                                                                                  |
| banco        | no congelar `smallTours` (las vueltas cambian de forma sin lista cerrada)                                                                                           | ejecutabilidad §2.3 (pierde la comparabilidad de `realQueens.ts` l. 42-44)                                                                                                   | `smallTours` se remide pareado en el paso 9 y `frozenSkeletons` da la lista cerrada por forma (decisión 33)                                             |
| geografia    | V1 con 6 km para la última cota de un día                                                                                                                           | motor injerto 6; ejecutabilidad §2.2                                                                                                                                         | V5 con 4,2 km (decisión 5)                                                                                                                              |
| geografia    | pancarta `cima` solo ≥ 1,5 km sin excepción (§4.5)                                                                                                                  | motor §1 y §5 riesgo 4; cobertura §2.2                                                                                                                                       | decisión 25: siempre en el último `puerto`                                                                                                              |
| geografia    | recomponer los papeles de en medio cada temporada con `mixRoles` e intercambiar la reina hacia la cordillera tras las garantías (§6.2, §7.1 paso 2b)                | motor §2.2                                                                                                                                                                   | decisión 18: reina solo donde la meta lo permite, si no `media_alto` anotada; garantías conservadas como reglas                                         |
| geografia    | AR y CL con `cordillera: 'desierto_andino'`, que tiene `puerto: null` y `relieve: 'llano'` (§5.1 y §5.2)                                                            | ejecutabilidad §2.2 (bug de dato)                                                                                                                                            | `cono_sur` con `cordillera: null` y `finalesAlto: 'largo'` por vuelta (sección 6); `geo.test.ts` exige `relieve ∈ {montana, alta}` para toda cordillera |
| geografia    | `ondulado` con amplitud hasta 3,0 en `cantabrico` sin tope                                                                                                          | ejecutabilidad §2.2 (puede tipar puerto por accidente)                                                                                                                       | `ARCH.motivo.enlace.ampMax` 2,4 (`I-38`)                                                                                                                |
| geografia    | cambiar la firma de `oneDaySpec`, `stagesFromEdition`, `stageMix` y `nationalChampionships` (§5.3)                                                                  | motor §2.2 (rompe `calendar.test.ts` l. 184-277 entero)                                                                                                                      | decisión 19: `stageMix` conserva firma con `DEFAULT_ROUTE_CONTEXT`                                                                                      |
| datos        | V11 con `Σ costBase·dx` dentro del generador (§9)                                                                                                                   | motor §2.3 y §5 riesgo 3                                                                                                                                                     | decisión 4: `verify` solo lee `routes/`; la demanda se mide en `routeCensus`                                                                            |
| datos        | el extractor como fuente de los esqueletos, regenerado con cada carga de E12 (§11.1, §13.1)                                                                         | motor §2.3 (reproducibilidad sin subir versión)                                                                                                                              | decisión 40: instrumento de medida, `scripts/medir-real.mjs`                                                                                            |
| datos        | V1 con 2,5 km salvo `ventoux`                                                                                                                                       | ejecutabilidad §2.4 (Superga 4,9 en el mapa 07 §1.2)                                                                                                                         | V5 con 4,2 km                                                                                                                                           |
| datos        | `TourTemplate` indexada por `MixTerrain` (§7.2)                                                                                                                     | cobertura §2.3 (tres modelos de composición)                                                                                                                                 | `ARCH.pesosComposicion` por `Relieve` y cuatro `TourSkeleton` (sección 7)                                                                               |
| datos        | `COUNTRY_REGION` con FR → `macizo_central_jura` y ES → `meseta` como defecto                                                                                        | cobertura §2.3; ejecutabilidad §2.4                                                                                                                                          | `zonaDe(country)` solo para los 532 .NC; ninguna carrera de equipos cae al país (decisión 14)                                                           |
| ingeniero    | seis saltos de `ENGINE_VERSION` con tres remediciones de bancos (§12)                                                                                               | cobertura §2.4; ejecutabilidad §2.5; motor §2.4                                                                                                                              | decisión 3: un salto en el paso 8, con pasos 0 y 1 como control de fontanería                                                                           |
| ingeniero    | `mixWeights.mountain[reina] = 0,40`, `queenDplusRange` 60/40 y `queenFinalMix` conservados (§7.3, §8)                                                               | cobertura §2.4; ejecutabilidad §2.5                                                                                                                                          | `ARCH.pesosComposicion`, `et_reina_blanda` con `blandaShare`, `ROUTE.queen*` retirados (decisiones 8 y 18)                                              |
| ingeniero    | el 210 fijo de 142 carreras de un día sin tocar (§7.1)                                                                                                              | cobertura §2.4                                                                                                                                                               | decisión 36                                                                                                                                             |
| ingeniero    | las etapas de edición siguen por `oneDaySpec` con `origen: 'edicion'` (§10.1)                                                                                       | cobertura §2.4                                                                                                                                                               | tabla `EditionTerrain → et_*` (`I-9`)                                                                                                                   |
| ingeniero    | citas de línea que no son del código: `finalKindOf` en `finalKind.ts` l. 176-183 y `CLIMB_MIN_KM` en l. 131, en un fichero de 85 líneas (l. 78 y l. 33 comprobadas) | ejecutabilidad §2.5                                                                                                                                                          | ninguna cita de `ingeniero.md` se copia a este documento sin comprobar contra el fichero; las de este documento salen de los mapas y de los juicios     |
| arquitectura | el sorteo `geo                                                                                                                                                      | raceId`(§3.5),`kmJitter`como única corrección del 210 (§4.3), la temporada 0 en la mediana (§4.3),`finishType` por intento (§4.7) y los papeles variables por edición (§6.1) | los tres jueces (tabla 19.2.1: B1, B6, B7, B8, B10)                                                                                                     | decisiones 14, 21, 4, 20 y 36 |

#### 19.2.3 Los 27 riesgos de los tres jueces

Los riesgos que, según los tres jueces, ninguna propuesta resolvía bien son 10 del juez de cobertura (`juicios/cobertura.md` §5), 8 del juez del motor (`juicios/motor.md` §5) y 9 del juez de ejecutabilidad (`juicios/ejecutabilidad.md` §5). Varios son el mismo riesgo visto desde tres focos (la tabla geográfica como juicio aparece en los tres; el coste de arranque en dos; la remedición sin dueño en tres; `stageKindOf` en dos), y el encargo de síntesis los condensó en las 12 obligaciones que cierran este apéndice. La columna «Tipo» distingue lo resuelto con mecanismo, lo mitigado (mecanismo parcial y medida) y lo aceptado como sacrificio consciente con su anotación en la sección 17.

| Juez · riesgo    | Resumen                                                                     | Tipo                     | Sección   | Resolución                                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------- | ------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cobertura 1      | la tabla geográfica es juicio sin validación                                | mitigado                 | 6, 16     | Decisión 16: dato y juicio dichos con esas palabras (dato: 20 filas `cobbles`, ciudades de `raceRoutes.ts`, 177 reales); galería; `geo.test.ts` de consistencia interna; corrección como dato, nunca código           |
| cobertura 2      | ningún instrumento para que el dueño vea                                    | resuelto                 | 16        | Decisión 41: `scripts/galeria-recorridos.mjs` en el paso 4, entregada antes del 8, con las tres preguntas por perfil                                                                                                  |
| cobertura 3      | viento, altitud, costa y meseta no llegan al motor                          | se acepta y se documenta | 17, 6     | Decisión 17: E1 entrega relieve y firme; `viento` y `altitud` viajan como `arch.metadatos` y la ficha dice «llano abierto», nunca «abanicos»                                                                          |
| cobertura 4      | la cola baja y `calendarQueens.test.ts` l. 58-68 deciden por el diseño      | resuelto                 | 5, 13, 18 | Decisión 8: `et_reina_blanda` con peso; el censo mide la cubeta por clase en el paso 0 y en el 8, ANTES de pedir D6                                                                                                   |
| cobertura 5      | `stageKindOf` calibrado contra el viejo (27 de 113 reinas y medias reales)  | se acepta y se documenta | 11, 18    | Decisión 26: no se recalibra en E1; D2 se abre tras el paso 8 con la tabla del censo; una Lieja generada con puertos ≤ 4,5 km sale `media / Mountains classic` y es correcto                                          |
| cobertura 6      | los circuitos inflan pancartas y puntos                                     | mitigado                 | 8         | Decisión 25: pancarta solo en `puerto` ≥ 1,5 km y siempre en el último; los muros de circuito < 1,5 km no puntúan; `kmSubidaShare` y `breakAppealEstimado` en banda informativa                                       |
| cobertura 7      | coste de arranque no medido                                                 | resuelto                 | 14        | Decisión 35: medido, con objetivo, techo y calendario perezoso ya decidido                                                                                                                                            |
| cobertura 8      | remedición sin dueño ni horas                                               | resuelto                 | 13        | Decisión 34: dueño operativo, dueño de banda, orden por coste, 4 h de máquina y 2 sesiones, techo 8 h, regla «previsión fallida»                                                                                      |
| cobertura 9      | `featureProfile.ts` no se unifica                                           | se acepta y se documenta | 11, 17    | Decisión 27: dos rellenos para dos poblaciones, con la deuda anotada (`erosion.longClassicFresh`, `hardestClassicFresh`) y paso propio posterior a E1                                                                 |
| cobertura 10     | la interfaz no anuncia la edición                                           | resuelto                 | 10, 11    | Decisión 39: «Edición N» y `cambiosRespectoAnterior` por `diffMotivos(prev, actual)`; D10                                                                                                                             |
| motor 1          | lectores de `SEASON_CALENDAR` fuera de `race_routes`                        | resuelto                 | 10, 11    | Decisiones 20 y 23: `race_routes` gana `kind`, `label`, `time_trial`; `calendarRun.ts` l. 516 y 1614, `callups.ts` l. 98 y `raceContext.ts` l. 56-59 leen el congelado y, si no hay fila, `calendarForSeason(season)` |
| motor 2          | dos reglas de etiqueta y la cifra 49                                        | resuelto                 | 11        | `SUMMIT_RUN_IN_KM` 5 exportada por `stageKind.ts` y usada por `stageKindOf`; `stageHistory.ts` deja de reetiquetar; el 49 se re-sella con objetivo escrito                                                            |
| motor 3          | acoplamiento inverso generador → motor                                      | resuelto                 | 2, 9      | Decisión 4: `verify` solo lee `routes/`; V16 en el censo; una recalibración de `STAGE.finish*` no redibuja perfiles                                                                                                   |
| motor 4          | pancartas de `auto()` sobre muros; `kmSubida`                               | mitigado                 | 8         | Decisión 25 (= cobertura 6); `kmSubida` no se toca porque el motor cuenta por tipo (mapa 03 §4.1); banda informativa `ud_circuito` ≤ 0,20 y `ud_muros` ≤ 0,15                                                         |
| motor 5          | remedición no presupuestada; la muestra de `calendarQueens` cambia          | resuelto                 | 13        | Decisión 34; el pareado etapa a etapa va sobre `frozenSkeletons` (lista cerrada por forma) y la muestra sistemática se estratifica (decisión 32)                                                                      |
| motor 6          | arranque y temporadas en memoria                                            | resuelto                 | 14        | Decisión 35: `calendarForSeason` memoizada por `Map`, ≤ 1.000 ms por temporada adicional, tests que generan temporadas 1 a 3 pagan y se dice cuánto                                                                   |
| motor 7          | tablas geográficas sin validación externa                                   | mitigado                 | 6, 16     | = cobertura 1                                                                                                                                                                                                         |
| motor 8          | congelar literales es museo; por brief pierde comparabilidad                | resuelto                 | 13        | Decisión 33: `Skeleton` literal en `sim/frozenSkeletons.ts` renderizado con `renderSkeleton` (cerrado por forma, código nuevo), más `GENERATED_QUEENS` impresas sin banda; escrito en `targets.ts`                    |
| ejecutabilidad 1 | tabla geográfica juicio sin fuente                                          | mitigado                 | 6, 16     | = cobertura 1                                                                                                                                                                                                         |
| ejecutabilidad 2 | viento y altitud fingidos en el relato                                      | se acepta y se documenta | 17, 11    | Decisión 17: el texto de la ficha no promete lo que el motor no coloca                                                                                                                                                |
| ejecutabilidad 3 | coste de arranque y temporadas memoizadas                                   | resuelto                 | 14        | Decisión 35                                                                                                                                                                                                           |
| ejecutabilidad 4 | circuitos repetidos, el motor sin noción de vuelta; 532 nacionales de golpe | mitigado                 | 8, 13     | Decisión 25; el banco de saturación (5 de las 8 más duras son hoy `nc-*-road`) se remide en el paso 9 con los circuitos nuevos                                                                                        |
| ejecutabilidad 5 | 226 etapas de edición con paisaje arbitrario                                | resuelto                 | 6         | `RACE_REGION.stages` curada para las 60 ediciones (`race-france` e6 → `pirineos`) y test; la etapa se marca `edicion` («ciudades y distancia reales, relieve generado») para no chocar con `fuentes-recorridos.md`    |
| ejecutabilidad 6 | `stageKindOf` con dos criterios según origen                                | se acepta y se documenta | 11, 18    | = cobertura 5                                                                                                                                                                                                         |
| ejecutabilidad 7 | muro en meta exige precisión de bloque                                      | mitigado                 | 4, 15     | `ARCH.meta.muro.aproxKm` 2 y `.aproxAmp` 2,5 diseñados contra `deriveFinishTerrain` (`finish.ts` l. 94-123); test 300 de 300 en el paso 3; si falla se ajusta `aproxKm` (riesgo 5 de la sección 17)                   |
| ejecutabilidad 8 | remedición sin dueño ni presupuesto                                         | resuelto                 | 13        | Decisión 34                                                                                                                                                                                                           |
| ejecutabilidad 9 | `world.test.ts` y `RACE_DAY_TSS` con otro reparto de `kind`                 | resuelto                 | 13        | Medida antes y después en el paso 8, fila propia en la tabla de re-sellado; `sim/world.ts` l. 169-193 calcula `CALENDARIO` al cargar y ve la temporada 0                                                              |

Recuento: 15 resueltos con mecanismo, 7 mitigados con mecanismo parcial y medida, 5 aceptados como sacrificio y documentados en la sección 17 (viento y altitud dos veces, `stageKindOf` dos veces, `featureProfile.ts` una; los repetidos entre jueces cuentan cada uno). Ninguno queda sin sección.

#### 19.2.4 Lo que sigue siendo hipótesis hasta que el código corra

La fase adversaria (refutadores contra el código) tiene que atacar donde este documento afirma algo que solo la ejecución puede confirmar. Son ocho afirmaciones, todas con test nombrado y paso del plan; un refutador que las tumbe no tumba el diseño, sino el número, y el documento dice en cada caso qué se mueve si falla.

| #   | Afirmación                                                                                                        | Dónde se prueba                                | Paso | Si falla                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | `muro_meta` ≤ 1,0 km con 2 km de aproximación a amplitud ≤ 2,5 tipa `muro` en 300 de 300                          | `motifs.test.ts`                               | 3    | se ajusta `ARCH.meta.muro.aproxKm` (riesgo 5 de la sección 17), nunca `STAGE.finish*`                                                  |
| H2  | `intentos` p95 ≤ 3 por esqueleto × zona compatible; 0 degradados en las 1.418                                     | `skeletons.test.ts`, `calendario.test.ts`      | 4, 8 | se estrechan rangos del esqueleto antes que subir `ARCH.colocacion.maxIntentos` 8 (riesgo 9)                                           |
| H3  | Carga de `SEASON_CALENDAR` ≤ 1.500 ms (techo 2.500) y ≤ 1.000 ms por temporada adicional, desde los 578 ms de hoy | `routes/arranque.test.ts`                      | 8    | calendario perezoso por carrera, ya decidido (decisión 35)                                                                             |
| H4  | `dPlusDe(profile)` contra `calendarQueens::desnivelDe` difiere < 5 % con `rellenoDplusPorKm` 5,5                  | `routeCensus` (columna `dPlusBloques`)         | 3, 8 | se recalibra `ARCH.reina.rellenoDplusPorKm` en el paso 3 (decisión 9)                                                                  |
| H5  | La cubeta de reinas < 1.500 m queda poblada ≥ 5 % con `blandaShare`                                               | `calendarQueens.test.ts` estratificada         | 8, 9 | D6: comparar < 2.000 contra > 3.000; la banda [6; 30] no se mueve sin el dueño                                                         |
| H6  | `ARCH.anticlon.maxCorrelacion` calibrado en el p90 de pares reales deja la mediana < 0,8 y el máximo < 0,9        | `calendario.test.ts`; `scripts/medir-real.mjs` | 9    | se anota el p90 medido y V12 toma ese valor; no se ensancha la banda para que cuadre                                                   |
| H7  | El 49 de `stageHistory.test.ts` l. 199 baja a «solo reales» con `SUMMIT_RUN_IN_KM` en `stageKindOf`               | `stageHistory.test.ts` re-sellado              | 8    | si queda alguna generada, es un bug de V6 (esqueleto y perfil no coinciden), no una cifra que re-sellar                                |
| H8  | Las cuatro condiciones de «mejor y no solo distinto» se cumplen a la vez en el pareado viejo/nuevo de 12 semillas | tabla pareada del paso 9 en `balance.md` «v61» | 9    | «previsión fallida» anotada con la medida; la banda no se mueve hasta decisión del dueño (decisión 34); el generador viejo no se borra |

#### 19.2.5 Obligación del encargo de síntesis → sección

Las 12 obligaciones del encargo de síntesis condensan los 27 riesgos; esta es la tabla que cierra la trazabilidad, para comprobar que ninguna obligación depende de una sección que no la escriba.

| Obligación                                            | Sección    | Decisión       |
| ----------------------------------------------------- | ---------- | -------------- |
| 1 gramática + 45 injertos + tabla                     | todas; 19  | tabla 19.1.2   |
| 2 galería + consistencia + dato/juicio                | 16, 6      | 16, 41         |
| 3 viento, altitud, costa, meseta                      | 17, 6      | 17             |
| 4 medida de arranque con objetivo y techo             | 14         | 35             |
| 5 `stageKindOf`                                       | 11, 18     | 26             |
| 6 pancartas, `kmSubida`, `breakAppeal`                | 8          | 25             |
| 7 remedición con dueño, orden, horas; las tres reinas | 13         | 33, 34         |
| 8 `RACE_REGION` por carrera y etapa + test            | 6          | 14             |
| 9 identidad: semillas, nivel, interfaz                | 10         | 20, 21, 22, 39 |
| 10 lectores de `SEASON_CALENDAR` y `kind` coherente   | 10, 11     | 23             |
| 11 `featureProfile.ts`                                | 11         | 27             |
| 12 huella FNV y tabla pareada como condición          | 11, 15, 13 | 28, 29         |

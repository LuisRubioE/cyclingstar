# El generador de recorridos: la gramática de motivos (diseño final)

## 0. Cabecera y resumen ejecutivo

Este documento vive en `docs/generador.md`. Es el diseño ÚNICO que se implementa: cada decisión
está tomada, cada tipo está escrito, cada constante lleva valor e intención y cada paso del plan
lleva sus tests antes que su código. Quien lo implemente no tiene a quién preguntar, y el texto está
escrito contando con eso.

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
del dueño que este documento tiene que contestar son dos: «para las que no se puedan nunca
reproducir, el generador es una basura. Hay que arreglarlo, está pésimo» (`docs/epics.md` G6) y
«siempre son los mismos tres o cuatro modelos» (agenda §4.18, parafraseado por la agenda). Lo que
sigue a su cita en G6 (l. 579-582: el caso v40, _algo que no existe en el calendario real_) es
prosa del repositorio sobre ese caso y no palabra suya, y por eso este documento no lo cita entre
comillas angulares. La tercera frase del dueño sobre perfiles, «Hay que arreglar eso»
(`docs/epics.md` G5, l. 567-572, "Perfiles: quedan demasiadas carreras falsas"), NO la contesta
E1: es la cobertura de recorridos reales, que la agenda §4.18 manda a E12 ("Ampliar la base de
recorridos reales se queda al final", l. 917) y que la sección 2 (§2.6) y la 17 dejan fuera a
sabiendas; lo único que E1 hace por ella es que `routeSource` con tres valores deje visible al
jugador cuál carrera es real y cuál no (sección 11). Y la razón por la que E1 va primero y no
último no es estética: los perfiles son la entrada de la calibración táctica (agenda §4.18, l.
895), y `epics.md` E3 documenta cinco versiones del motor certificando que la fuga gana en montaña
del 27 al 30 % de las veces sobre `reina-150`, que es media montaña con la etiqueta cambiada, cuando
en las reinas de verdad ganaba el 3,3 % (agenda l. 897-900). Un generador falso es ese problema
extendido a las 1.418 etapas del calendario.

**Estado.** Diseño cerrado, pendiente solo de la fase adversaria (refutadores contra el código) que
este documento deja preparada en el apéndice B de la sección 19. Sale de cinco propuestas y tres
juicios; la base es la gramática de motivos de `propuestas/arquitectura.md`, ganadora con dos votos
de tres, y sobre ella van 45 injertos de las otras cuatro, todos localizados en el apéndice A de la
sección 19 con la sección en que cayeron y cómo.

**Versión del código.** Todo lo que este documento cita (rutas, líneas, cifras medidas) está leído
contra HEAD `8585ca2` del 2026-09-14, el árbol que leyeron los siete mapas (mapa 04 l. 3), con
`ENGINE_VERSION = 69` en `packages/engine/src/constants.ts` l. 718 y última migración
`0039_el_recorrido_es_del_mundo.sql` en `packages/db/drizzle/` (las migraciones viven ahí, no en
`packages/db/migrations`, que no existe). El árbol al ensamblar este documento es HEAD `a69b503`
del 2026-09-25, 45 commits después de `8585ca2`; los cuatro últimos (`02b032d..a69b503`, entre
ellos `f0716fa`, que citan algunas secciones) solo tocan `docs/`
(`git diff --stat 02b032d..a69b503 -- . ':!docs'` vacío), así que en código `a69b503` y `f0716fa` son `02b032d`, con
`ENGINE_VERSION = 86` (`constants.ts` l. 809; `index.test.ts` l. 459) y última
migración `0040_ordenes_del_paso_17a.sql`; la migración nueva de este documento es por tanto
`packages/db/drizzle/00NN_race_routes_kind.sql`, con `NN` el siguiente número libre al llegar al paso 10
(hoy `0041`), con su `drizzle/meta`. Entre `8585ca2` y `02b032d` (`git diff --stat 8585ca2..02b032d`) NO cambia
ninguno de estos ficheros citados: `routes/stageKind.ts`, `routes/finalKind.ts`,
`routes/profileGen.ts`, `routes/calendar.test.ts`, `routes/editions.ts`, `routes/raceRoutes.ts`,
`stage/finish.ts`, `stage/sample.ts`, `sim/world.ts`, `world/callups.ts`,
`packages/db/src/raceRoutes.ts`, `packages/shared/src/countries.ts`, `apps/api/src/stageHistory.ts`
ni `stageHistory.test.ts`. Sí cambian, y sus líneas se leen con este desplazamiento:
`routes/calendar.ts` gana 14 líneas en l. 79-92 (`doubleAfter`), así que toda cita ≥ 80 se lee +14
(`row.km ?? 210` l. 915 → 929; `row.country ?? RACE_COUNTRY[row.id]` l. 889 → 903; `oneDaySpec` l.
400-407 → 414-421; `MixTerrain` l. 410 → 424; `buildRace` l. 886-925 → 900-939); `constants.ts`
gana 91 líneas antes de l. 716 (`ENGINE_VERSION` l. 718 → 809; `ROUTE` l. 1151 → 1242;
`STAGE.climbRaceKmToGo` l. 3521 → 3820); `stage/simulate.ts` se mueve entero (`rngViento =
streams('viento')` l. 1157 → 1413); `engine/src/index.ts` l. 77 → 91; `db/src/schema.ts` l. 523 →
541; `db/src/calendarRun.ts` +2 de l. 19 a l. 1087 (l. 135 → 137, 516 → 518, 783 → 785), 0 de l. 1099 a
l. 1551, +27 de l. 1561 a l. 1618 (l. 1603 → 1630) y +28 después (28 líneas en total); `stage/types.ts` +1 (`Segment`, `Ramp` y `Banner` l. 12-48 → 13-49);
`sim/targets.ts` gana 211 líneas (224 añadidas y 13 borradas); y `sim/invariants.test.ts` se partió en el original más cinco
(`invariantsAbandonos`, `invariantsClasicas`, `invariantsDesgaste`, `invariantsLlano`,
`invariantsPequenas`; balance v83 (3)). El paso 0 del plan recomprueba cada cita del documento con
un script (busca cada símbolo citado y compara la línea) y deja el resultado en la nota de balance.

Regla de versión, que no se discute en ninguna sección: `ENGINE_VERSION` sube UNA sola vez, en el
paso 8 del plan (sección 15), al siguiente número libre en producción al empezar ese paso (86 → 87
si empieza desde `a69b503`). La nota de `docs/balance.md` se llama "vN · El generador es una
gramática" con N igual al `ENGINE_VERSION` que resulta del paso 8, que es la convención de
`balance.md` (l. 765: "## v7 … `engine_version` 6 → 7"); desde `a69b503` es "v87". No puede
llamarse "v61", como la llamaba el esqueleto: la v61 ya existe como versión del motor (`balance.md`
l. 11171, tabla v60|v61, y l. 11241) y las notas escritas llegan hoy a "## v86" (l. 16332). Sus
subsecciones son "vN §0" (línea base, paso 0), "vN §1" (el cambio, paso 8), "vN §2" (remedición,
paso 9) y "vN §3" (base y pantalla, paso 10), y así las escriben todas las secciones; las tres que
nombran "v61" (sección 12 §12.10, sección 13 al principio y sección 15 §15.1) lo hacen solo para
explicar por qué la nota no se llama así. Los pasos 0 a 7 no tocan la versión porque no cambian
ningún perfil de producción; el paso 9 (remedición) y el 10 (base, API y web) tampoco, porque miden
y exponen lo que el paso 8 ya cambió.

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

- Las citas del dueño van entre «» y solo esas; los textos de la interfaz, los nombres de test y las
  citas de código o de otros documentos van entre comillas rectas. Las conclusiones del repositorio se marcan como lo
  que son: _es media montaña con la etiqueta cambiada_ es prosa de `docs/epics.md` E3 paso 4, no del
  dueño, y se cita sin comillas angulares, igual que _algo que no existe en el calendario real_
  (G6, l. 580-581); el «está bien así» del cierre de v44 (`docs/balance.md`) sí es suyo y se refiere
  al 18,1 % de fugas en montaña de aquella medida.
- Cada número medido lleva su procedencia: mapa (`mapa 01 §2.1`), propuesta (`datos.md §1.4`) o
  juicio (`motor.md §1`). Un número sin procedencia es un error del documento y la fase adversaria
  debe cazarlo.
- Los nombres son los del glosario de la sección 3 y de la tabla de constantes de la sección 12, sin
  sinónimos. Los nombres que usan las cinco propuestas se traducen en la nota al pie de la sección 3
  y en el apéndice A; ningún alias de propuesta aparece en el cuerpo del documento.
- Las decisiones del dueño son trece, D1 a D13, y la sección 18 las lista todas en su tabla 18.1,
  cada una con valor por defecto; el valor por defecto es lo que se implementa si no contesta. En el
  resto del texto se citan en el punto donde aparecen por su identificador, que es la clave de esa
  tabla: la forma de la frase varía ("(D10, sección 18)", "D1 en la sección 18", "decisión del
  dueño D2") y lo que manda es el `Dn`. Una decisión numerada sin `D` (por ejemplo "decisión 37") es
  de la síntesis (§C.1 del esqueleto), no del dueño. Nada queda "a definir".
- Los rangos se escriben `[a; b]`; los decimales con coma; las líneas de código como `l. 400`; las
  fracciones de etapa como `@[0,3; 0,85]`.
- Los tipos van en TypeScript, en bloque de código y completos; las constantes van con valor e
  intención; los tests van antes que el código en cada paso del plan y se nombran por fichero.
- Todas las citas de línea son del árbol `8585ca2` salvo donde la sección dice otro HEAD; para
  leerlas en `a69b503` (HEAD al ensamblar, igual en código a `f0716fa` y a `02b032d`) valen los
  desplazamientos de §0.1. Si al implementar una línea se ha movido, manda el nombre del símbolo, y el paso 0 del plan (sección 15) comprueba cada
  cita mecánicamente antes de escribir nada.

### 0.4 Qué cambia respecto de hoy, en diez líneas

1. **Los moldes desaparecen.** Los ocho `xxxSegments` de `profileGen.ts` (siete en realidad:
   `ittSegments` l. 510-514 es literalmente `flatSegments` l. 236-240, mapa 01 §2.1) y los tres
   terrenos de `MixTerrain` (`calendar.ts` l. 410) se sustituyen por 12 `MotifKind`, 9 `MetaKind`,
   32 `Skeleton` (16 de un día y 16 de etapa, los de la unión `SkeletonId` de la sección 3; el
   trigésimo segundo es `ud_repecho`, la clásica de colinas con meta en repecho, que la sección 5
   añade porque ninguna propuesta nombraba el decimoséptimo de etapa que el esqueleto contaba) y 4
   `TourSkeleton`; la semilla decide primero la arquitectura (`arch|raceId`) y después el detalle
   (`dib|…`). Secciones 4, 5 y 8.
2. **El país entra por fin.** 30 `GeoZone` con nombre más `generico` (31 filas en `ZONAS`: las 29
   del esqueleto más `montana_sur` para Malasia, Ruanda y Marruecos, sección 6 §6.2) con
   `GeoSignature` (qué existe y qué no, con `null` como "aquí no existe" en `puerto`, `cota` y
   `muro`); 64 `Territorio` como ruta ordenada con `cordillera` (los 56 países con carreras de
   equipos, mapa 02 §10, más 8 filas voluntarias: AR, CL, NZ, IE, SE, FI, LV, QA); los 69 países
   restantes de los 133 de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13) caen a `fallback`
   contado; y `RACE_REGION` curada a mano para las 310 carreras de equipos y por etapa para las 60
   ediciones (`race-france` e6 → `pirineos`); ningún sorteo de zona. Los 532 nacionales salen de
   `zonaDe(code)`, y lo que eso deja sin cubrir se dice con su cifra: los 69 países `fallback` son
   276 de las 532 etapas de nacionales (cuatro por país), el 19,5 % de las 1.418 del calendario,
   que se dibujan con la firma `generico`, es decir, sin geografía, como hoy. `geo.test.ts` los
   imprime sin banda; cubrirlos es dato, no código, y es una decisión del dueño (D12). Sección 6.
3. **Una carrera es la misma carrera.** `Skeleton`, zona, motivos de firma, papeles, crono y número
   de etapas son identidad por `raceId`; la edición (temporada) mueve una lista cerrada (motivos no
   firma, km ± 6 %, vueltas ± 1, motivo opcional, dibujo). `BASE_SEASON = 0` (`calendarRun.ts` l. 135) y `SEASON_CALENDAR = calendarForSeason(0)` tira los mismos dados que cualquier otra
   temporada. Sección 10.
4. **Lo que el motor lee no cambia.** `Segment`, `Ramp` y `Banner` de `types.ts` l. 12-48 quedan
   intactos; nunca se emite `rompepiernas`; viento, altitud, costa y meseta viajan en
   `arch.metadatos` y en la ficha como texto que no promete abanicos, no como física (mapa 03 §5.1).
   Es un sacrificio consciente sobre la petición central del encargo y por eso es decisión del dueño
   (D11), no solo de la síntesis. Lo que verá: entre dos llanas de zonas distintas con el mismo
   esqueleto, el motor solo ve distinto el relieve (la amplitud del relleno, `geo.amplitud`, 0,55 en
   `flandes` y 0,9 en `provenza` con tope 2,4, y los huecos `expuesto` donde `geo.viento ≥ 2`); el
   abanico sigue saliendo de una tirada por etapa, `streams('viento')` (`simulate.ts` l. 1157), que
   solo muerde en bloques `llano`, igual en Flandes que en Provenza. Secciones 3, 17 y 18 (§18.12).
5. **Dieciséis vetos** (`V1` a `V16`), puros de `routes/`: por etapa con reintento (V1 a V10 y V15),
   de calendario medidos en `routeCensus` (V11, V12, V16) y de vuelta (V13, V14). El caso v40 es V5
   (última cota de un día ≤ 4,2 km coronando a [3; 17] km; en meta solo `muro` ≤ 2,2 km) y
   la lección de `reina-150` es V8 (reina de verdad: puerto ≥ 9 km en meta o D+ ≥ 3.400 m, y ≥ 25 %
   de la subida a más de 30 km de meta), escritas como reglas y no como bandas, con el test
   "`reina-150` expresada como esqueleto no pasa `verify`". Sección 9.
6. **Lo real manda y se ve.** Huella FNV de las 177 etapas reales y de las 3 grandes vueltas sellada
   en `realFingerprint.test.ts` antes de tocar `calendar.ts`; `routeSource` con tres valores
   (`real`, `edicion`, `generado`) desde `CalendarStage` hasta `race_routes` y la pantalla;
   `featureProfile.ts` no se toca en E1. Sección 11.
7. **El banco mide el calendario que el juego corre.** `routeCensus` (0,57 s medidos sobre 1.418
   etapas, `motor.md` §1) con `ROUTE_CENSUS_TARGETS` y columna "hoy (medido)"; las bandas se
   afirman en `routes/grammar/calendario.test.ts`, que está bajo `routes/` y por eso corre en cada
   push con `test:rapido` (`package.json` l. 20 excluye `packages/engine/src/sim/**`);
   `sim/routeCensus.test.ts` es unitario del censo y corre con `test:bancos`. Protocolo "mejor y no
   solo distinto" con línea base del generador viejo, dirección pre-registrada por banda y cuatro
   condiciones; tabla pareada viejo/nuevo como condición para borrar
   `sim/legacy/profileGenLegacy.ts`; remedición con dueño, orden por coste y presupuesto (4 h de
   máquina, techo 8). Sección 13.
8. **Kilómetros por clase y papel.** `ARCH.km.porClase` como tabla: desaparecen los 210 km fijos de
   142 de las 178 carreras de un día (`row.km ?? 210`, `calendar.ts` l. 915, mapa 02 §1) y las
   etapas de 165 a 195 km en una .2; las 36 filas con `km` explícito lo conservan. Sección 7.
9. **El dueño ve el resultado antes de aceptarlo.** `scripts/galeria-recorridos.mjs` se escribe y
   se corre por primera vez al cerrar el paso 5 (el primero en que existen `generateStage` y
   `verify`, con los once vetos por etapa activos) y se completa al cerrar los pasos 6 y 7, siempre
   antes del paso 8. Tiene dos tamaños. La primera pasada, OBLIGATORIA: la fila `i = 0` de cada
   celda zona × esqueleto en las diez zonas con más carreras y en `generico`, las 20 de adoquín, las
   161 carreras de un día generadas, las 72 vueltas compuestas y las dos listas de zonas (310
   carreras y 133 países): unos 380 perfiles, 72 vueltas y 443 filas de lista, con tope
   `GALERIA.primeraPasada.maxPerfiles` 600 y unas dos horas del dueño, una tarde (sección 16
   §16.5). La galería COMPLETA, de consulta y con una segunda pasada opcional por muestreo: 3.110
   perfiles de zona (cinco semillas por celda compatible) más 1.244 de ediciones, 532 nacionales,
   40 de adoquín y las carreras y vueltas, unos 8.400 SVG. Las respuestas las aplica el
   implementador como datos (`ZONAS`, `RACE_REGION`, `TERRITORIOS`, `ARCH.pesoPorClase`), nunca
   como código, antes del paso 8 (§16.6 y §16.7). Y cada etapa generada lleva en la ficha su frase
   de arquitectura y "Edición N". Secciones 16 y 10.
10. **Un solo salto de `ENGINE_VERSION`** (paso 8), doce pasos (del 0 al 11) con tests primero
    (sección 15), coste de arranque MEDIDO con objetivo 1.500 ms y techo 2.500 ms contra los 578 ms
    de hoy (`motor.md` §1; sección 14), con su precio en CI escrito: la carga del módulo la paga
    cada fichero de test que carga `routes/calendar` (`motor.md` §1: "las 18 cargas de test y cada
    worker de vitest"), así que el objetivo son (1.500 − 578) × 18 ≈ 17 s más por corrida completa
    y el techo (2.500 − 578) × 18 ≈ 35 s, tiempo sumado de los ficheros (≈ 20 s y ≈ 42 s con los 22
    ficheros de `e94959b`), más las temporadas adicionales de los tests que las generan (tope 22 s,
    esperado ≈ 11 s en toda la suite); todo en la sección 14 §14.5. El paso 0 mide con
    `scripts/medir-arranque.mjs`, el paso 8 compara y, si se supera el techo, el calendario se
    construye perezoso por carrera (decisión 35, §14.6). Y 13 decisiones que son del dueño, cada
    una con valor por defecto (sección 18).

### 0.5 Mapa del documento

Veinte secciones, de la 0 a la 19, con su título exacto:

| Nº  | Sección                                                                                        | Qué contiene en una línea                                                                                                                                                                                                                                                                                                                                            |
| --- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Cabecera y resumen ejecutivo                                                                   | Encargo literal, estado y versión del código contra la que se escribió, método (mapas, propuestas, jueces, síntesis), cómo leer, qué cambia respecto de hoy en diez líneas, y este mapa.                                                                                                                                                                             |
| 1   | Diagnóstico medido: lo que el generador hace hoy                                               | Lo que el generador hace hoy, con línea y cifra: tres modelos, semilla en el detalle, país que no llega, dos generadores de reina, el caso v40, la lección de `reina-150`, y lo que ya está bien y se conserva.                                                                                                                                                      |
| 2   | Principios                                                                                     | Diez principios, cada uno con qué lo viola hoy: la arquitectura se sortea, la geografía restringe, lo declarado se garantiza, identidad y edición, lo real manda, vetos puros, medir antes de bandear, el dueño ve antes.                                                                                                                                            |
| 3   | El modelo de tipos                                                                             | Todos los bloques TypeScript (`Motif`, `Skeleton`, `GeoSignature`, `Territorio`, `RACE_REGION`, `TourSkeleton`, `StageRequest`, `GeneratedStage`, `edition`, `veto`, `RouteStats`) y contra qué línea del código encaja cada uno; la tabla de alias al pie.                                                                                                          |
| 4   | La gramática de motivos completa                                                               | Los 12 `MotifKind` y los 9 `MetaKind` uno a uno: rango en `ARCH`, cómo se rinde a `Segment[]`, qué lee el motor, caso real que lo motiva, y cómo se cierran los tres bordes sin holgura.                                                                                                                                                                             |
| 5   | Los esqueletos por tipo y clase                                                                | El catálogo de 32 (16 de un día con `ud_repecho`, 16 de etapa) con `motivo×n@ventana`, meta, D+, km, `requiere`, `pesoBase`, plantilla canónica literal y `alternativas`; `ARCH.pesoPorClase`; qué esqueleto recibe cada etapa de edición sin rasgos.                                                                                                                |
| 6   | La geografía: zonas, territorios y RACE_REGION                                                 | `ZONAS` (30 zonas con nombre más `generico`: 31 filas × 12 columnas), `TERRITORIOS` (64 filas + 69 países en `fallback`), `RACE_REGION` (310 + 60 por etapa) con procedimiento de curación y test; qué es dato y qué es juicio; tests de consistencia interna.                                                                                                       |
| 7   | Las vueltas por etapas: territorio, itinerario, papeles, km por clase                          | `itinerarioDe`, los 4 `TourSkeleton` con `BlockRule` como reparación determinista, lo que se conserva de `mixRoles`, `ARCH.pesosComposicion`, `kmDe` con `ARCH.km.porClase` y `maxPorClase`.                                                                                                                                                                         |
| 8   | La instanciación: colocación, rendido, cuadre, garantías, pancartas y circuitos                | `generateStage` en siete pasos con subflujo nominal cada uno, `normalizeEnlaces`, `garantizaClase`, `emitirPancartas`, reintento hasta 8 y plantilla canónica, circuitos, transición y etapa de edición real.                                                                                                                                                        |
| 9   | Los vetos y la plausibilidad                                                                   | Tabla de V1 a V16 (regla, dónde se comprueba, qué lee, caso que impide, test); V5 y V8 con párrafo propio; V12 anti-clon calibrado; plausibilidad blanda; fallback contado.                                                                                                                                                                                          |
| 10  | La identidad entre ediciones                                                                   | Qué es fijo y qué es de la edición, `BASE_SEASON = 0` tirando dados, `ARCH.edicion.nivel` 0/1/2, semillas separadas, `calendarForSeason` memoizada, `race_routes` con `kind`, "Edición N" en la ficha, test de identidad.                                                                                                                                            |
| 11  | Lo real frente a lo generado                                                                   | Prioridad de `buildRace`, `featureProfile.ts` intacto y su deuda, huella FNV de 177 + 3, `routeSource` hasta la web, `kind` coherente con `SUMMIT_RUN_IN_KM`, `stageKindOf` sin recalibrar.                                                                                                                                                                          |
| 12  | Las constantes                                                                                 | El bloque `ARCH` entero con valor, intención y apoyo; qué se retira de `ROUTE`, qué se conserva, qué literales de `profileGen.ts` migran, y qué no cambia (`FINAL_KIND_CUTS`, `PASS_MIN_KM`, `WALL_MAX_KM`, `STAGE.finish*`).                                                                                                                                        |
| 13  | El banco: invariantes, censo, calendarQueens, "mejor y no solo distinto", remedición           | Lo que no se mueve, lo que se re-sella y con qué causa, `routeCensus` y `ROUTE_CENSUS_TARGETS` (bandas en `grammar/calendario.test.ts`, `test:rapido`; censo unitario en `sim/routeCensus.test.ts`, `test:bancos`), `calendarQueens` estratificada, `frozenSkeletons`, el protocolo "mejor y no solo distinto", la remedición con dueño, orden, horas y techo.       |
| 14  | Rendimiento y arranque: la medida                                                              | Las cifras de hoy (578 ms de carga, 0,40 ms por etapa), lo que la gramática añade, lo que pagan los tests (sobrecoste de la carga en CI, ≈ 17 s en el objetivo y ≈ 35 s en el techo por 18 ficheros; temporadas adicionales, tope 22 s y esperado ≈ 11 s), `scripts/medir-arranque.mjs`, `arranque.test.ts` con objetivo y techo, memoización y calendario perezoso. |
| 15  | El plan de implementación por pasos, tests primero                                             | Doce pasos (del 0 al 11) con tests primero, código, qué cambia, qué se re-sella, coste y riesgo; dependencias y paralelismo; el único salto de versión en el paso 8.                                                                                                                                                                                                 |
| 16  | La galería: que el dueño vea antes de aceptar                                                  | `scripts/galeria-recorridos.mjs`: entrada, salida, qué muestra por perfil, cuántos (primera pasada obligatoria de unos 380 perfiles, 72 vueltas y dos listas, tope 600; galería completa de unos 8.400 SVG), las preguntas del dueño, sus horas, y qué hace el implementador con las respuestas (editar datos, nunca código).                                        |
| 17  | Riesgos y lo que queda fuera                                                                   | Catorce riesgos con mitigación o sacrificio consciente, y lo que E1 no hace (dato real, Mundial, grandes vueltas generadas, motor, SPEC §6.17, `featureProfile`).                                                                                                                                                                                                    |
| 18  | Decisiones que son del dueño                                                                   | D1 a D13: qué se decide, qué cambia con cifras, recomendación y valor por defecto que se implementa si no contesta.                                                                                                                                                                                                                                                  |
| 19  | Apéndice A: los 45 injertos y dónde cayeron · Apéndice B: objeciones de los jueces y respuesta | A: los 45 injertos y dónde cayeron. B: los 27 riesgos de los jueces y las objeciones a la ganadora, cada una con la sección que la resuelve.                                                                                                                                                                                                                         |

Las decisiones del dueño que esta cabecera ya da por tomadas con su valor por defecto, para que
nadie las busque en otro sitio: `ud_montana_alto` existe como rareza, peso 0,02 solo en .1 y solo
con `finalesAlto: 'largo'`, y `race-mercantour` (Nice → Isola 2000) atada a él (decisión 37, D1);
el dueño lo decide sabiendo que es la forma del caso v40 y que la realidad la tiene solo en tres
carreras .1 (Ventoux Dénivelé, Mercan'Tour, Murcia según edición: "hay que nombrarlas para no
generalizar", mapa 07 l. 42), que sorteado es el 1,8 % de los sorteos `mountain` de un día en .1
(§18.2) y que con "no" el peso pasa a 0 y el esqueleto sigue en el catálogo; `stageKindOf` no se
recalibra en E1 (D2); `et_prologo` y `et_cronoescalada` entran con p 0,25 (0,3 en gran vuelta) y
0,08 (D3); ninguna meta volante generada (D4); `ud_criterium` con peso 0 (D5);
`calendarQueens.breakawayWinPct` se mantiene en [6; 30] como vigilancia hasta la remedición (D6);
`ARCH.edicion.activa` con `nivel` 1 y nivel 2 donde el esqueleto declare alternativas (D7); las
vueltas sin cordillera no tienen reina (D8); `ARCH.km.maxPorClase` `{ WT: 260, Pro: 240, '1': 200,
'2': 180, NC: 260 }`, donde Pro, .1, .2 y NC son las del mapa 07 §4.1 y el 260 de WT no es su
"techo UCI 280 salvo excepciones como Sanremo" (l. 220) sino el máximo que puede sortear
`ARCH.km.porClase` un día WT [200; 60], porque las 36 filas con `km` explícito (Sanremo, 288 km en
`calendar.ts` l. 1002) van por `km` de fila y no pasan por el techo (D9, y la misma razón en las
secciones 7 y 12); la ficha enseña frase de arquitectura y "Edición N" siempre (D10); E1 entrega
relieve y firme, y viento y altitud quedan como metadatos de la ficha hasta un encargo del motor
(D11, "se acepta"); los 69 países sin fila en `TERRITORIOS` (276 etapas de nacionales, 19,5 % del
calendario) quedan en `fallback` con la firma `generico`, contados e impresos por `geo.test.ts`, y
si el dueño dice "cúbrelos" tras ver `nacionales.html`, cada país que nombre recibe su fila de
`TERRITORIOS` como dato (D12, "se acepta"); y la arquitectura Superga, un final en alto corto en
una carrera de un día (Milano-Torino, 4,9 km al 9,1 %, mapa 07 §1.2), queda fuera porque V5 solo
admite en meta un muro ≤ 2,2 km (D13, "queda fuera"). Todas en la sección 18.

# E2 · La retransmisión: encargo compartido para todos los agentes

Este fichero es el brief que lee TODO agente que participe en el diseño de E2, sea cartógrafo,
proponente, juez, redactor, refutador, corrector o auditor. Léelo entero antes de hacer nada.

## 1. Qué se encarga

El encargo E2 está en `docs/encargos.md` (sección «E2 · La retransmisión», l. 134-162). Léelo
entero y literal. Su porqué razonado está en `docs/agenda.md` l. 500-535 (el norte de la
televisión y el modo sin destripe), l. 1392 (fila D13) y l. 1431-1460 (Oleada 1 y el aviso sobre el
modo sin destripe). Resumen operativo, que NO sustituye a leer el original:

1. **Rehacer de arriba abajo lo que el jugador lee de una carrera**: el Race Radio, el journal de
   etapa, la crónica y el feed de noticias, con **la retransmisión de televisión como norte**.
2. Una retransmisión **no es una lista de frases**: es un **ESTADO que evoluciona** (dónde va cada
   grupo, con cuánta diferencia, cuánto queda, dónde estamos del perfil) **con sucesos encima**. El
   diseño tiene que definir ese estado con tipos, y decidir qué se enseña permanentemente y qué
   solo cuando pasa.
3. **El modo sin destripe es el modo por defecto, no una opción.** Entrar en una etapa debe ser
   sentarse a verla, no leer el acta. Lo difícil no es la pantalla: exige saber **qué ha visto cada
   jugador** y que **ninguna otra pantalla se lo reviente por detrás**: portada, ranking,
   clasificaciones, feed, correo de aviso y hasta el título de la pestaña del navegador. Es una
   propiedad del producto entero.
4. El motor **ya guarda los sucesos estructurados y fechados por kilómetro y por segundo**, así que
   reproducir una etapa a ritmo es barato: los datos están, lo que falta es no enseñarlos de golpe.
   Esto hay que COMPROBARLO contra el código, no darlo por hecho.
5. **Defecto de esquema a corregir**: las noticias se guardan ya redactadas (`news` guarda `kind` y
   `text`, sin `seed` ni `data`), lo que las hace intraducibles y no re-renderizables, al revés que
   la crónica. E10 (multiidioma) viene después y depende de que E2 lo deje bien.
6. **Requisito literal del dueño, puro lenguaje de televisión: cuando se escapan cinco, que se vean
   sus maillots.** «Se escapan cinco» y «se escapa el campeón de Italia con cuatro más» son carreras
   distintas. Necesita las cinco categorías de maillot resueltas: los tres de clasificación que ya
   existen, el de campeón (que se crea en E3 y E12) y el del equipo. Es el rótulo con el que la
   televisión presenta a cada corredor. E2 se desarrolla ANTES que E3 y E12: el diseño tiene que
   definir la interfaz que necesita de ellos y qué se enseña mientras no existan.

**Fichero final:** `docs/retransmision.md`. **Tamaño esperado:** grande, del orden de
`docs/tactica.md` (8.646 líneas) o `docs/generador.md` (11.121). Es el diseño ÚNICO que se
implementa: cada decisión tomada, cada tipo escrito en TypeScript, cada constante con valor e
intención, cada paso del plan con sus tests antes que su código. **Quien lo implemente será un
agente que no tiene a quién preguntar**, y el texto se escribe contando con eso.

**Regla de arranque de `docs/encargos.md`: aquí todavía NO se toca código.** Nadie modifica ficheros
fuera de `docs/diseno/e2-retransmision/` y `docs/retransmision.md`. Se puede ejecutar código en el
scratchpad para medir (copiar módulos, correr simulaciones, contar bytes), nunca editarlo en el
repositorio.

## 2. Qué leer del repositorio (mínimo del encargo, ampliado)

- Motor: `packages/engine/src/sim/raceRadio.ts`, `packages/engine/src/stage/{events,journal,simulate,types,views,citas,memory,finish,group}.ts` y sus tests, `packages/engine/src/world/{news,jersey}.ts`, `packages/engine/src/constants.ts` (bloques de radio, journal, news).
- API: `apps/api/src/{chronicle,stageHistory,stageRoute,emails,mailer}.ts`, `apps/api/src/routes/`, `apps/api/src/tick/`, `apps/api/src/raceRadio.test.ts`.
- Web: `apps/web/src/domain/{narration,stageJournal,newsFeed,raceTimeline,raceTabs,dashboard,labels,format,nav}.ts`, `apps/web/src/pages/{StageReplay,Race,News,Home,Rankings,MyRaces,TeamCalendar,RiderProfile,RacesIndex,HallOfFame}.tsx`, `apps/web/src/components/{RaceRadioPanel,StageStory,LastRaceReport,RaceResults,Jersey,Header,BottomNav,WorldClock}.tsx`.
- Datos: `packages/db/src/schema.ts` (tablas `news`, `stages` con `radio`, resultados, clasificaciones, usuarios), `packages/db/drizzle/0029_radio_de_carrera.sql` y migraciones vecinas, `packages/shared/` (el contrato API-web).
- Documentos: `docs/balance.md` (todo lo que ha dicho el dueño sobre radio, crónica, journal, noticias, destripe, maillots), `docs/navegacion.md`, `docs/motor.md`, `SPEC.md`, `docs/epics.md`, `MVP.md`, `docs/tactica.md` (el motor que VA A EXISTIR: la línea de táctica está en implementación y cambia los sucesos que emite), `docs/entrenamiento.md`, `docs/encargos.md` (E3, E10, E12 para las dependencias), `Claude.md` (convenciones).

## 3. El método (el mismo que produjo `docs/tactica.md` y `docs/generador.md`)

Está descrito en `docs/diseno/README.md` y ejecutado en `docs/diseno/e1-generador/`. Se replica:

| Fase                      | Quién                              | Salida                                         | Modelo de referencia en E1   |
| ------------------------- | ---------------------------------- | ---------------------------------------------- | ---------------------------- |
| 0. Mapas                  | 7 cartógrafos en paralelo          | `mapas/01..07-*.md` (200-350 l. cada uno)      | `e1-generador/mapas/`        |
| 1. Propuestas             | 5 proponentes independientes       | `propuestas/<lente>.md` (700-900 l.)           | `e1-generador/propuestas/`   |
| 2. Juicios                | 3 jueces con focos distintos       | `juicios/<foco>.md` + `juicios/veredicto.json` | `e1-generador/juicios/`      |
| 3. Síntesis               | esqueleto + redactores por sección | `borrador/00-esqueleto.md`, `borrador/NN-*.md` | `e1-generador/borrador/`     |
| 4. Refutación             | 4 refutadores adversarios          | `refutaciones/hallazgos-*.json`                | `e1-generador/refutaciones/` |
| 5. Corrección             | correctores por sección            | secciones corregidas + `correcciones-*.json`   | idem                         |
| 6. Coherencia y auditoría | 1 pasada de coherencia + auditores | `refutaciones/resultado-final.json`, cabecera  | idem                         |
| 7. Ensamblado             | 1 ensamblador                      | `docs/retransmision.md`                        | `docs/generador.md`          |

## 4. Reglas de escritura, para todos

1. **Castellano**, en el registro de `docs/generador.md` y `docs/tactica.md`: preciso, sin relleno,
   sin marketing. La interfaz de usuario va en INGLÉS (regla de `Claude.md`); los textos de pantalla
   que se propongan se escriben en inglés y se etiquetan como tales.
2. **Toda afirmación sobre el código cita fichero y líneas** (`apps/api/src/chronicle.ts` l.
   120-134). Toda cifra dice si es **medida** (y cómo) o **estimada**. Si no lo sabes, escribe «no lo
   sé» o «no está en el código»; inventar es el peor fallo posible.
3. **Nada de rayas ni guiones en medio de una frase** (ni «—» ni «–» ni « - »). Se usan comas,
   paréntesis, dos puntos o punto y seguido. Solo se admite un guion en un título del tipo
   «Título - Subtítulo».
4. Tipos en TypeScript estricto (prohibido `any`), Zod en los bordes, constantes en
   `packages/engine/src/constants.ts` con comentario de intención, el motor puro (sin `Date.now()`
   ni `Math.random()`, todo azar del RNG sembrado), migraciones solo con drizzle-kit, todo cambio de
   comportamiento del motor sube `ENGINE_VERSION`. Son las reglas de `Claude.md` y el diseño tiene
   que respetarlas.
5. Cuando cites al dueño, cita **textual** y di de dónde (`docs/balance.md` l. NNN, versión vNN).
6. **Informe final al orquestador: 12 líneas como máximo.** Qué fichero has escrito, cuántas líneas,
   las 3 a 5 cosas más importantes que has descubierto y lo que no has podido comprobar. El
   orquestador tiene muy pocos tokens: el valor va en el fichero, no en el informe.
7. No edites ficheros de otros agentes salvo que tu rol lo diga. No hagas commits ni push: lo hace el
   orquestador.

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

Dos lecturas de esa tabla que ordenan lo demás. Primera: hoy el generador NO llama a `sampleProfile` (mapa 01 §1: `profileGen.ts` solo escribe segmentos), así que los 578 ms son evaluación del módulo, tablas y dibujo de 1.418 perfiles de 32,7 segmentos de media; la pasada de 0,40 ms por etapa es un coste que hoy nadie paga en el arranque y que arquitectura §4.7 habría añadido por intento. Segunda: el juez calcula que verificar con `sampleProfile` por intento, con perfiles de 60 a 120 segmentos y un p90 de 1 a 2 intentos, añadiría «del orden de 0,5 a 1,5 s por temporada» y llevaría el módulo «de 0,6 s a unos 2 s», multiplicado por el número de temporadas en los tests que las generan (`juicios/motor.md` §1). Ese coste no se paga: por la decisión 4, `verify` solo lee `stageKindOf`, `finalKindOf`, `climbSize`, `dPlusDe` y geometría del esqueleto (sección 9), y `finishType` se mide una vez por calendario en `routeCensus` (0,57 s medidos sobre 1.418 etapas, `juicios/motor.md` §1 vía decisión 31), que cabe en cada push de `test:rapido`.

### 14.2 Lo que la gramática añade por etapa

Por etapa, `generateStage` (sección 8) instancia ≤ 12 motivos, coloca por ventanas, rinde ≤ 80 segmentos con `climb`, `descent` y `rolling`, cuadra con `normalizeEnlaces`, corrige con `garantizaClase`, emite pancartas y verifica; todo O(segmentos) con constantes pequeñas, y se repite hasta `ARCH.colocacion.maxIntentos` 8 veces en el peor caso, con `ARCH.veto.intentosP95` 3 como exigencia del paso 4 (`skeletons.test.ts`). Ninguna llamada a `stage/`: ni `sampleProfile`, ni `deriveFinishTerrain`, ni `finishType`, ni `costBase` (decisión 4; el test de §14.4 lo comprueba sobre el fuente).

La estimación, escrita para que se vea por qué el objetivo es 1.500 ms y el techo 2.500 y no otra cosa. Si TODOS los 578 ms de hoy fueran dibujo de perfiles (no lo son: incluyen evaluar un módulo de 3.650 líneas, `featureProfile` para las 177 etapas reales y la ordenación), el coste por etapa sería 0,41 ms a 32,7 segmentos; con el tope de 80 segmentos (×2,45) y una media de 1,3 intentos (compatible con un p95 de 3) saldrían 1,30 ms por etapa, 1.840 ms el calendario. Ese es el peor caso de la estimación, por encima del objetivo y por debajo del techo. El caso esperado es bastante menor: 80 segmentos es el tope de `ud_adoquin` y `ud_muros`, no la media (una `et_llana` son un `enlace`, quizá un `expuesto` y una `meta`, menos de 20 segmentos), y buena parte de los 578 ms no es dibujo. Por eso `ARCH.arranque.objetivoMs` 1.500 (×2,6 sobre hoy) es lo que se espera cumplir sin hacer nada, y `techoMs` 2.500 (×4,3) es donde el diseño cambia de forma (§14.6). La estimación no sustituye a la medida: se mide en el paso 0 (línea base con el generador viejo) y en el paso 8 (con el nuevo), y las dos cifras van a `docs/balance.md` «v61 §0» y «v61 §1».

### 14.3 El instrumento: `scripts/medir-arranque.mjs`

Vive en `scripts/` y no en `packages/engine/src` por la misma razón que `scripts/medir-carrera.mjs` l. 6-8: el motor es puro y esto es herramienta de banco que lee del `dist` compilado. Uso: `pnpm --filter @cyclingstar/engine build && node scripts/medir-arranque.mjs [--n 5] [--temporadas 3]`. Lo que hace, en orden:

1. Se lanza a sí mismo `n` veces (por defecto 5) como proceso hijo con `child_process.execFileSync(process.execPath, [ruta, '--una'])`, porque la carga de un módulo solo se puede medir una vez por proceso. Cada hijo imprime una línea JSON; el padre agrega y da mediana y máximo. Es lo que `coste-motor.mjs` no hacía (una sola corrida) y lo que hace falta para que el número de `balance.md` no sea el de un runner cargado (la variación medida entre dos noches del nocturno es del 30 %, `vitest.config.ts` l. 17-20).
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

| Fichero                                                                                     | Temporadas que construye      | Tope            | Esperado          |
| ------------------------------------------------------------------------------------------- | ----------------------------- | --------------- | ----------------- |
| `grammar/edition.test.ts` (sección 10, identidad 1 a 5 contra 0)                            | 0 + 5                         | 2,5 + 5 s       | ≈ 1 + 2,5 s       |
| `grammar/calendario.test.ts` (sección 13, cero degradados en las temporadas 0 a 3)          | 0 + 3                         | 2,5 + 3 s       | ≈ 1 + 1,5 s       |
| `sim/routeCensus.test.ts` (sección 13, censo sobre 0 a 3)                                   | 0 + 3, más 4 censos de 0,57 s | 2,5 + 3 + 2,3 s | ≈ 1 + 1,5 + 2,3 s |
| `routes/arranque.test.ts` (esta sección)                                                    | 0 + 3                         | 2,5 + 3 s       | ≈ 1 + 1,5 s       |
| `db/recorridoDelMundo.test.ts` (sección 10, «dos temporadas, dos recorridos, un esqueleto») | 0 + 1, sobre `dist`           | 2,5 + 1 s       | ≈ 1 + 0,5 s       |
| Los otros 14 ficheros que cargan `calendar`                                                 | solo la 0                     | 2,5 s cada uno  | ≈ 1 s cada uno    |

Suma de topes de temporadas adicionales en toda la suite: 15 s; esperado ≈ 7,5 s, repartidos en cinco ficheros que ya tienen `testTimeout` de 30 s de suelo (`vitest.config.ts` l. 25). Ningún test genera más de cinco temporadas, y ningún test construye temporadas en un bucle: si un test nuevo necesita más, la sección 15 lo lista con su coste.

### 14.6 Calendario perezoso por carrera: el diseño que se aplica si se supera el techo

Decisión tomada, no condicional: lo condicional es solo el disparo (mediana del paso 8 > `techoMs` 2.500). El diseño es este, para que quien lo aplique no tenga que decidir nada:

- `calendarForSeason(s)` sigue devolviendo `CalendarRace[]` completo y ordenado, con todo lo que sale de las tablas y de la composición construido de forma inmediata: `id`, `startDay`, `raceClass`, `level`, `openTo`, `country`, `region`, `championshipCountry`, `routeSource`, y en cada `CalendarStage` `day`, `km`, `kind`, `timeTrial`, `routeSource`. Todo eso es identidad (`itinerarioDe`, sección 7, y `Skeleton.kind` garantizado por V6, sección 9) y no exige dibujar un perfil.
- `profile`, `arch` y `label` de cada `CalendarStage` pasan a ser propiedades de acceso (`Object.defineProperty` con `get`) que llaman a `generateStage(req)` la primera vez y guardan el resultado en la propia etapa. La `StageRequest` completa queda cerrada en el getter; `generateStage` es pura y determinista, así que el perfil es el mismo se lea cuando se lea. `label` va con el perfil porque sale de `stageKindOf(profile).label` (decisión 23).
- Quién fuerza qué: `sim/world.ts` l. 171-181 lee `kind` y no fuerza nada; `callups.ts` l. 98 y `calendarRun.ts` l. 516 leen `kind` y no fuerzan nada; `freezeRaceRoute` fuerza las etapas de UNA carrera el día de su etapa 1 (`calendarRun.ts` l. 1603); `raceContext.ts::terrenoRestante` lee el congelado (decisión 23) y no fuerza; la API de calendario fuerza la carrera que se consulta. Un proceso de `apps/api` dibuja así solo las carreras que su mundo toca, en vez de las 842 al arrancar.
- Lo que NO cambia: `routeCensus`, `calendario.test.ts`, `golden.test.ts` y `realFingerprint.test.ts` recorren todas las etapas y fuerzan todo, y por eso el test de §14.4 mide, en modo perezoso, la construcción inmediata (`SEASON_CALENDAR.length`) más un recorrido explícito `for (const r of SEASON_CALENDAR) for (const s of r.stages) s.profile` dentro del mismo reloj; la cifra que se compara con el techo es la de las 1.418 etapas dibujadas, igual que en modo inmediato. El modo perezoso no baja esa cifra; baja lo que paga un proceso que no las dibuja todas (la API, los tests de `db` y `api` que solo leen `kind`).
- El modo perezoso es un cambio de `edition.ts` y `calendar.ts` en el mismo paso 8, antes de `ENGINE_VERSION` 69 → 70, con un test más en `arranque.test.ts`: «leer `kind` de las 1.418 etapas no dibuja ningún perfil» (contador de llamadas a `generateStage` a cero tras recorrer `kind`, y a 1.418 tras recorrer `profile`).

### 14.7 Coste de simulación: lo que no cambia

Un perfil con más segmentos solo encarece `sampleProfile`, que es O(bloques × segmentos) y se ejecuta una vez por etapa (mapa 03 §2, `locate` l. 80-93; mapa 03 §7): medido, 0,29 ms de media hoy y 0,92 ms para 120 segmentos y 264 km (`juicios/motor.md` §1). El bucle de simulación es O(bloques × corredores) con varias pasadas por bloque (mapa 03 §7, `simulate.ts` l. 4757-4759) y no lee el número de segmentos; el número de bloques es `round(km / 0,1)` (`sample.ts` l. 70), así que lo único de esta sección que mueve el coste de una etapa simulada son los kilómetros, y `ARCH.km.porClase` (sección 7) los baja en .2 (p90 ≤ 170) y en las 142 carreras de un día que hoy están a 210. La memoria por etapa (dos `Float64Array(n)` y el array de `Block`, mapa 03 §7) tampoco cambia. Los relojes de los bancos de la sección 13 no se tocan por rendimiento: se tocan, si se tocan, por la remedición.

### 14.8 Qué queda escrito y dónde

En `docs/balance.md` «v61 §0»: la tabla del script en el paso 0 (línea base con el generador viejo: 578 ms esperados ± 20 %). En «v61 §1»: la misma tabla tras el paso 8, con el histograma de intentos, los degradados (cero) y, si se aplicó §14.6, la cifra inmediata y la forzada. En `constants.ts`, el comentario de `ARCH.arranque` cita las dos tablas. Si el paso 9 estrecha rangos por el p95 de intentos (sección 17, riesgo 9), se vuelve a correr el script y se añade una fila. La sección 15 lleva el script en el paso 0 y el test en el paso 8 como tests primero.

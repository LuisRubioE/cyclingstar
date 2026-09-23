# Cycling Star

Juego persistente de navegador por _ticks_. Cada usuario encarna a un ciclista profesional desde
los 18 años hasta el retiro: entrena, firma contratos, disputa un calendario de una temporada
completa, acumula palmarés y envejece. Los usuarios veteranos pueden además fundar y dirigir
equipos.

El mundo avanza solo: **1 día de juego = 6 horas reales** (4 días de juego por día real). Las
órdenes se dejan en cola y el motor resuelve las etapas de forma determinista.

Pilares: una decisión significativa por día de juego, el mundo avanza sin ti, motor de carrera
creíble y narrable, progresión larga, cero _pay to win_.

> Documentación interna en español; los textos visibles de la interfaz van en inglés (ver
> [Claude.md](./Claude.md)).

## Documentos rectores

| Documento                                                  | Qué es                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| [SPEC.md](./SPEC.md)                                       | Fuente de verdad del diseño y de la arquitectura. Ante conflicto, manda.        |
| [MVP.md](./MVP.md)                                         | Plan de ejecución: alcance del MVP y los pasos numerados.                       |
| [Claude.md](./Claude.md)                                   | Convenciones de código, tests y despliegue que este repo hace cumplir.          |
| [docs/balance.md](./docs/balance.md)                       | Registro de las constantes del motor y de cada campaña de Montecarlo.           |
| [docs/ops.md](./docs/ops.md)                               | Runbook de operación: respaldos, restauración, variables, monitorización.       |
| [docs/fuentes-recorridos.md](./docs/fuentes-recorridos.md) | Atribución y procedencia de los recorridos reales cargados de fuentes abiertas. |

## Arquitectura del monorepo

Monorepo pnpm con TypeScript estricto y _project references_ (`tsc -b`).

```
apps/
  api/       Fastify 5 + better-auth. Sirve la API y los estáticos de web.
             src/index.ts     -> servicio `web` (migra al arrancar y hace auto-tick)
             src/tick/main.ts -> servicio `tick` (cron; corre y termina)
  web/       SPA React 19 + Vite + Tailwind 4 + TanStack Query.
packages/
  engine/    Motor de carrera y progresión. PURO: sin E/S, sin reloj, sin Math.random.
  db/        Esquema y consultas Drizzle sobre Postgres + migraciones generadas.
  shared/    Tipos y utilidades compartidas (Zod, RNG sembrado, países, tiempo).
scripts/     Operación: respaldo, restauración y aplicador de migraciones.
```

Frontera arquitectónica clave (SPEC 6.1 y Claude.md): **`packages/engine` jamás importa de `db`,
`api` ni `web`, ni de módulos de Node**. Es puro y determinista: todo el azar viene del RNG
sembrado (mulberry32) y el tiempo entra como dato. Esto ya no es solo una convención: lo hacen
cumplir reglas de ESLint (`no-restricted-imports`, `no-restricted-globals`, `no-restricted-syntax`)
además de las _project references_ de TypeScript.

Dependencias permitidas: `web → engine, shared`; `api → db, engine, shared`; `db → engine, shared`;
`engine → shared`.

## Arrancar en local

Requisitos: Node 22 (ver `.nvmrc`), pnpm 10 (`corepack enable`) y un Postgres de desarrollo.

```sh
pnpm install
cp .env.example .env      # y rellena los valores
createdb cyclingstar      # o el Postgres que uses

# Aplica las migraciones a la base vacía (mismo camino que producción).
pnpm exec tsc -b packages/db
node scripts/migrate.mjs

# API en :3000 (migra al arrancar y empieza a avanzar el mundo).
pnpm exec tsc -b && node apps/api/dist/index.js

# En otra terminal, la SPA con recarga en caliente.
pnpm --filter @cyclingstar/web dev
```

### Variables de entorno (`.env.example`)

| Variable                | Obligatoria | Qué hace                                                                |
| ----------------------- | ----------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`          | sí          | Conexión a Postgres.                                                    |
| `ADMIN_TOKEN`           | sí (≥32)    | Protege `POST /admin/tick`, `/admin/advance` y `/admin/names`.          |
| `SESSION_SECRET`        | sí (≥32)    | Firma de sesiones de better-auth.                                       |
| `APP_URL`               | sí          | URL pública; better-auth la usa como `baseURL` y origen de confianza.   |
| `EXTRA_TRUSTED_ORIGINS` | no          | Orígenes de confianza extra, separados por comas (dominio viejo, etc.). |
| `RESEND_API_KEY`        | no          | Clave de Resend. Sin ella la app arranca y no manda correo.             |
| `MAIL_FROM`             | no          | Remitente (`Nombre <correo@dominio>`). Va en pareja con la clave.       |
| `PORT`                  | no (3000)   | Puerto de escucha. En Railway lo inyecta la plataforma.                 |
| `TICK_INTERVAL_MINUTES` | no (360)    | Minutos reales por día de juego. Bajarlo acelera el mundo para la alfa. |
| `LOG_LEVEL`             | no (info)   | Nivel de log de Fastify.                                                |

El servicio `tick` solo necesita `DATABASE_URL` y `TICK_INTERVAL_MINUTES`.

`APP_URL` tiene que ser el dominio **canónico** por el que se navega de verdad. better-auth rechaza
con «Invalid origin» cualquier petición que venga de otro sitio, así que apuntarla al dominio
equivocado tira el login entero. La pareja con y sin `www` se acepta sola; cualquier otro origen
—el dominio viejo mientras dura una migración— va en `EXTRA_TRUSTED_ORIGINS`.

`RESEND_API_KEY` y `MAIL_FROM` son opcionales pero **van en pareja**: con una sola, el arranque
falla a propósito (un despliegue con clave y sin remitente cree que manda correo y no manda
ninguno). Sin ninguna de las dos no se envía nada y cada correo deja una línea en el log — es el
modo de desarrollo local. La puesta en marcha del dominio en Resend está en `docs/ops.md`.

## Comandos

| Comando                    | Qué hace                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| `pnpm typecheck`           | `tsc -b` de todos los paquetes + `tsc --noEmit` de apps/web.           |
| `pnpm test`                | Vitest (`*.test.ts` y `*.test.tsx` bajo `{apps,packages}/*/src`).      |
| `pnpm test:rapido`         | La suite MENOS los bancos de `sim/`: 1.771 pruebas en ~12,5 min.       |
| `pnpm test:bancos`         | Solo los bancos de simulación (`sim/`): 114 pruebas en ~73 min.        |
| `pnpm test:watch`          | Vitest en modo watch.                                                  |
| `pnpm test:coverage`       | Tests con cobertura V8 (informe en `coverage/`).                       |
| `pnpm lint`                | ESLint del monorepo.                                                   |
| `pnpm format`              | Prettier en modo comprobación (`format:write` para escribir).          |
| `pnpm build`               | `tsc -b` + build de Vite de apps/web.                                  |
| `pnpm sim [runs]`          | Campaña Montecarlo del motor contra los rangos objetivo del SPEC 6.17. |
| `node scripts/migrate.mjs` | Aplica las migraciones pendientes a `DATABASE_URL`.                    |

Antes de cerrar cualquier paso: `pnpm typecheck && pnpm test` en verde (Claude.md).

**Por qué hay tres comandos de test y no uno.** El reparto del tiempo es muy desigual: los ficheros
de `packages/engine/src/sim/` se llevan **4.365 s de los 5.115** de la suite entera, y son 114 de las
1.885 pruebas. No son pruebas, son BANCOS: corren cientos de etapas completas contra los rangos
objetivo del SPEC 6.17. Por eso el CI de cada push corre `test:rapido` y deja los bancos para cuando
cambia `packages/engine/`, que es lo único que puede romperlos; `cobertura.yml` los corre enteros y
con cobertura una vez al día pase lo que pase. En local, mientras se trabaja en la web o en la API,
`test:rapido` da la misma respuesta mucho más rápido.

**Y en CI los bancos van en OCHO tramos en paralelo** (v83), no porque se salte ninguno —no se
salta ninguno, ésa es la condición— sino porque `invariants.test.ts` era el 64 % del trabajo y dentro
de un fichero vitest corre en serie. Se partió en seis (`invariants`, `invariantsLlano`,
`invariantsDesgaste`, `invariantsClasicas`, `invariantsAbandonos`, `invariantsPequenas`) y la matriz
de `ci.yml` los reparte junto con `coherence` y el trío pequeño. `pnpm test:bancos` en local los
sigue corriendo todos de una vez.

El primer corte fueron cuatro ficheros y **el CI dijo que se quedaba corto**: 33,1 min el tramo de
`invariantes` contra 12,7 del siguiente, o sea 71 → 33 y no los ~22 que se habían pronosticado con
tiempos locales medidos con contención. De ahí el segundo corte. **El número que manda es el que
imprime el CI en cada tramo**, y es el que hay que mirar para volver a afinarlo — no una estimación
local.

### Race Radio — depurar una etapa kilómetro a kilómetro

`scripts/race-radio.mjs` imprime el estado de la carrera en cada kilómetro: qué grupos hay, quién va
en cada uno, el hueco al líder (la resta de sus relojes, exacta) y quién va en el turno de relevos.
Es la herramienta para no tener que reconstruir a mano lo que pasó desde el reguero de eventos.

```sh
pnpm --filter @cyclingstar/engine build
node scripts/race-radio.mjs race-andalusia 1 --riders 119     # banco: la etapa se corre aquí
DATABASE_URL=… node scripts/race-radio.mjs race-andalusia 1 --db   # producción: replay del snapshot
ADMIN_TOKEN=… node scripts/race-radio.mjs race-andalusia 1 \
  --api https://cyclingstar.up.railway.app                    # producción, sin DATABASE_URL
```

Con `--db` o `--api` la etapa se re-simula desde `stage_snapshots` (semilla y entrada congeladas) y
**solo si corrió con el motor de hoy**: si `engineVersion` no coincide, el comando dice que no se
puede reconstruir en vez de enseñar una carrera que no pasó. La guarda se resuelve siempre contra el
motor de ESTE árbol, que es el que re-simula. `--help` en la cabecera del propio script.

`--db` necesita credenciales de base de datos en la máquina desde la que se mira; `--api` no: pide
la etapa a la puerta de administración de la API (ver abajo). Es la diferencia entre poder mirar una
etapa rara de producción desde cualquier sitio y no poder.

### `GET /api/admin/stage-snapshot/:raceId/:day` — el snapshot de una etapa corrida

Devuelve lo que hace falta para reconstruir una etapa entera: `seed`, `input`, `engineVersion` y el
veredicto de la guarda de versión (`replay`), más los dorsales del roster (`riders`) para poder poner
nombre a quien sale en la tabla. Admite `?season=N` (por defecto, la temporada del mundo).

**Va tras `ADMIN_TOKEN`** (cabecera `x-admin-token`), como el resto de `/api/admin/*`, y no puede
dejar de estarlo: `input` lleva el estado de partida de todos los corredores y `seed` es la semilla
exacta, así que con los dos se puede predecir el desenlace de una etapa antes de que se publique.

```sh
curl -H "x-admin-token: $ADMIN_TOKEN" \
  https://cyclingstar.up.railway.app/api/admin/stage-snapshot/race-andalusia/1
```

### Cobertura de tests

`pnpm test:coverage` mide con `@vitest/coverage-v8` sobre todo `src` (también los ficheros sin
tests). Los umbrales de `vitest.config.ts` son **deliberadamente bajos**: hoy el objetivo es tener
visibilidad, no bloquear a nadie. Al fijarlos (ago. 2026) la cobertura real era de ~34% de líneas,
con el motor y `shared` muy por encima y `apps/web` sin tests. Súbelos a medida que crezca la
suite; el motor (`packages/engine`) debería mantenerse por encima del 85%.

## Integración continua

`.github/workflows/ci.yml` corre en cada PR y en `main`, con jobs **independientes y en paralelo**
para que un fallo no oculte los demás:

- **Typecheck** — `pnpm typecheck`.
- **Test** — levanta un Postgres de servicio, aplica las migraciones, exporta `DATABASE_URL` y
  corre la suite con cobertura (publicada como artefacto). Los tests que no necesiten base de
  datos simplemente ignoran la variable.
- **Lint · Format** — ESLint y Prettier; el _format check_ corre aunque el lint falle.
- **Build** — `pnpm -r build`.
- **Migraciones (base vacía)** — aplica todo el historial de Drizzle sobre una base recién creada
  por el mismo camino que producción y comprueba que una segunda pasada es idempotente.
- **Auditoría de dependencias** — `pnpm audit --audit-level=high`, **informativo**: no bloquea el
  _merge_ (`continue-on-error`).

La instalación (pnpm + Node + caché del store) está factorizada en `.github/actions/setup`.

## Despliegue (Railway)

Dos servicios sobre el mismo repositorio, cada uno con su fichero de configuración:

| Servicio | Config              | Arranque                                                         |
| -------- | ------------------- | ---------------------------------------------------------------- |
| `web`    | `railway.json`      | `node apps/api/dist/index.js`; healthcheck en `/health`.         |
| `tick`   | `railway.tick.json` | Cron `0 */6 * * *`: migra, avanza los días pendientes y termina. |

El servicio `web` construye todo (`pnpm build`, incluida la SPA); el servicio `tick` solo compila
TypeScript (`pnpm exec tsc -b`), porque no sirve estáticos y así sus despliegues son más rápidos.

Ampliación opcional de esa optimización: añadir `build.watchPatterns` a `railway.tick.json` para
que los cambios que solo tocan `apps/web` no disparen un redespliegue del cron. No está puesto a
propósito, porque un patrón incompleto haría que el `tick` se quedara con código antiguo sin que
nadie lo note.

### Migraciones

- Se generan **solo con drizzle-kit** (`pnpm --filter @cyclingstar/db db:generate`); nunca SQL
  manual en producción (Claude.md).
- Se aplican al arrancar, protegidas por un `pg_advisory_lock` compartido, de modo que si `web` y
  `tick` arrancan a la vez uno migra y el otro espera.
- El proceso del `tick` **no** migra por sí mismo (`apps/api/src/tick/main.ts` solo llama a
  `runTick`). Por eso su `startCommand` es `node scripts/migrate.mjs && node
apps/api/dist/tick/main.js`: sin ese primer tramo, un cron que arrancase antes que el servicio
  web tras desplegar una migración nueva operaría contra un esquema desactualizado. Si algún día
  el proceso de tick llama a `runMigrations` por su cuenta, ese tramo se puede quitar (aplicarlas
  dos veces es inofensivo, pero sobra).

### El mundo avanza por dos caminos

Hoy conviven dos mecanismos, ambos idempotentes y protegidos por advisory lock, así que no se
pisan:

1. **Auto-tick en proceso** — el servicio `web` sondea cada 1-5 minutos y se pone al día según el
   tiempo real transcurrido (`apps/api/src/index.ts`). Por eso `railway.json` fija
   `sleepApplication: false`: si el proceso duerme, el mundo se para.
2. **Servicio cron cada 6 h** — `railway.tick.json`, red de seguridad independiente del servicio
   web.

Es redundante y confuso. La recomendación (ver informe de la rama `claude/fix-tooling-ci`) es
quedarse con el auto-tick en proceso y retirar el servicio cron una vez comprobado que el `web` no
se duerme ni se reinicia en bucle, porque el cron a 6 h se queda corto en cuanto se baja
`TICK_INTERVAL_MINUTES` para acelerar la alfa. Mientras tanto se mantienen los dos.

### Healthcheck

`GET /health` devuelve `ok`, `engineVersion`, `gameDay`, `migrationsApplied`, `tickIntervalMinutes`
y `nextTickAtMs`. Es una sonda de _readiness_ real: consulta el reloj del mundo en la base, así que
un 200 implica que las migraciones se aplicaron (el proceso ni siquiera escucha si fallan) y que
Postgres responde. `railway.json` fija `healthcheckTimeout: 300` para dar margen a las migraciones
de arranque.

## Convenciones

Las de [Claude.md](./Claude.md), y las que el repositorio verifica solo:

- TypeScript estricto; `any` prohibido (`@typescript-eslint/no-explicit-any` como error).
- Zod en todos los bordes de entrada.
- `packages/engine` puro: ni `db`/`api`/`web`, ni módulos de Node, ni `process`, ni `Date.now()`,
  ni `new Date()`, ni `Math.random()`. Única excepción: `packages/engine/src/sim/cli.ts`, el
  harness de `pnpm sim`, que puede usar `process` (no se exporta desde `index.ts`).
- En `apps/web`: `react-hooks/rules-of-hooks` como error; `exhaustive-deps` y
  `react/no-unescaped-entities` como aviso.
- Toda constante de juego vive en `packages/engine/src/constants.ts` y su cambio se anota en
  `docs/balance.md`.
- Todo cambio de comportamiento del motor incrementa `engine_version`.

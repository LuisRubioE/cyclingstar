## 10. Sin destripe (I): lo visto, el horizonte y el velo

Esta sección define la propiedad sin destripe desde el lado del dato: qué es haber visto una etapa, dónde se guarda, qué carreras se protegen, cuándo deja de protegerse una, cómo calcula el servidor en un solo punto lo que un espectador conoce (el horizonte) y lo que ese horizonte oculta ahora mismo (el velo), cuánto cuesta, cómo sobrevive a una sesión caducada y a la caché de la web, y cómo se corta la propia retransmisión. Escribe como hechos D-06, D-15, D-28 a D-35, D-55 y D-57, y decide lo que dejan abierto al final. Los tipos son de §4.10 (`GuardReason`, `SpoilerScope`, `StageGate`, `KnowledgeLetter`, `VeiledStage`, `HorizonKind`, `Horizon`, `VeilDelta`, `Viewer`, `WorldRef`) y de §4.11 (`HorizonSummary`, `WatchState`, `SwitchMode`); aquí solo se citan. La aplicación del velo superficie a superficie es §11.1, las rutas son §14 y el DDL de `race_watch` y de las columnas de `users` es §13.4. Las líneas de código son las de HEAD `9c21885`, comprobadas en `3fbd828`, que solo añade ficheros de `docs/diseno/`. Tres medidas son nuevas y se hicieron en el scratchpad sin tocar el repositorio: `l6/veilsql.mjs` y `l6/veilsql-pgjs.mjs` (cómo enlaza drizzle-orm 0.45.2 una lista dentro de `sql`, en PGlite y con postgres-js 3.4.9, el conductor de producción, contra PGlite servido por socket) y `l6/cookie.mjs` (tamaño y coste de `cs_viewer`). La corrección tras la refutación comprobó de nuevo las líneas en `eefc07a`, que solo añade `docs/`, y midió cuatro cosas más, en `c-l6/`: `lecturas-ast2.mjs` (el criterio de `horizonReaders.test.ts` con el AST y el comprobador de tipos de TypeScript, §10.6), `veildelta-forma.mjs` (lo que ocupa una entrada del memo de `veilDelta`, §10.7), `todas.mjs` (el velo con todas las carreras en guardia, §10.4) y `peticiones.mjs` (un modelo de las peticiones de un espectador en cada modo, §10.3).

### 10.1 La propiedad

El encargo pide que «entrar en una etapa debe ser sentarse a verla, no leer el acta» y que «ninguna otra pantalla se lo reviente por detrás (portada, ranking, clasificaciones, feed, correo de aviso y hasta el título de la pestaña del navegador)» (`docs/encargos.md` l. 144-147, texto del encargo). Lo que es del dueño es el sin destripe como deseo, su punto 6 («tu modo sin destripe», agenda v1, commit `1bb785c`, según el mapa 05 §0): es [DUEÑO 2]. El «por defecto» es de la agenda («Y el modo sin destripe deja de ser una opción para ser el modo por defecto de esa pantalla», `docs/agenda.md` l. 521) y el encargo lo asume; no hay cita del dueño que lo diga (mapa 05 §1 y §5.1). Por eso las ocho carreras de cabecera que se protegen sin pedirlo son una decisión del dueño con su cifra (DD-01, §10.4), y no un requisito suyo.

La propiedad tiene dos mitades que esta sección y la siguiente reparten así. La primera es un objeto del servidor, por cuenta, que dice qué ha visto cada espectador de cada carrera: la tabla `race_watch` y el tipo `Horizon`, calculado en cada petición y recibido por firma en toda lectura que pueda contar un resultado (§10.2 a §10.7). La segunda es que ninguna superficie lo olvide: cuatro piezas que se vigilan entre sí (el tipo obligatorio, el predicado único `veilSql`, el registro de rutas que no arranca sin política y el canario B1; D-32), la cookie para quien vuelve sin sesión (§10.8), la caché de la web atada al horizonte (§10.9) y la retransmisión servida por tramos que nunca pasan de lo alcanzado (§10.11). Las 48 superficies del mapa 03 §4 y las once puertas de fuera, una a una, son §11.

### 10.2 Qué es visto

Una etapa corrida está, para un espectador, en uno de siete estados (D-28, I-28). Seis son los de `producto.md` §7.1; el séptimo, «fuera de guardia», es el de toda etapa de una carrera que no se protege para él, y hay que escribirlo porque también abre en `Watch` (pantalla; D-30, D-36). La letra es la que se guarda en `race_watch.how`, una por etapa del prefijo y en orden (`KnowledgeLetter`, §4.10).

| Estado | Cuándo (en `race_watch` y en el horizonte) | Letra | ¿En el velo? | Al abrir la etapa | En el resto del producto |
| --- | --- | --- | --- | --- | --- |
| oculta | carrera en guardia (§10.4), etapa corrida, `known_through < N` y `watching_stage ≠ N` | ninguna | sí | `Watch` (pantalla); si hay una anterior sin conocer, la puerta `previous_unseen` (D-37, §11.12); `Report` (pantalla) da la puerta `not_seen` | nada que salga de ella: marcadores neutros y agregados de antes (mecanismos de §10.6, superficies de §11.1) |
| a medias | `watching_stage = N` y `reached_s`, sin haber llegado a meta | ninguna | sí | `Watch` reanuda en `reached_s − BROADCAST.resumeBackS` (60 s) con `Previously` (pantalla; §8.5) | igual que oculta: lo alcanzado solo sirve para reanudar y para acotar los tramos |
| vista en directo | lo alcanzado llegó a la meta en `Watch` | `W` | no | `Report` (pantalla), con `Watch anyway` a un toque | todo |
| vista en resumen | lo alcanzado llegó a la meta en `Highlights` (pantalla) o en el digest (DD-20) | `S` | no | `Report` | todo |
| revelada | `Show result` (pantalla) o la tercera salida de la puerta | `R` | no | `Report` | todo |
| arrastrada | conocida porque el espectador vio o reveló una posterior | `A` | no | `Watch`, sin puerta; `Report` a un toque, como la caducada (6-r): no la vio, la conoce por deducción | todo |
| caducada | pasaron `SPOILER.expiryGameDays` (56) días de juego desde la ÚLTIMA etapa de su carrera (§10.5) | `X`, escrita al avisar | no | `Watch`, sin puerta: nunca la vio, pero ya no se protege | todo |
| fuera de guardia | la carrera no está en guardia para él (alcance `off`, carrera soltada, o ninguna de las tres fuentes de §10.4) y la etapa no es conocida | ninguna | no | `Watch`, sin puerta; `Report` a un toque, sin confirmación | todo: se ve al día (D-30) |

Un salto de recorrido no revela: ninguno pasa de un km antes de meta y una etapa solo pasa a vista cruzando la meta (8-j). Si un cliente informara la meta con `mode: 'seek'`, `LETTER_OF_MODE` la anotaría `R` (8-e), pero la web no lo hace nunca.

El visitante sin cuenta no tiene fila en esta tabla: su horizonte es `anon`, su velo está vacío y no se le oculta nada fuera de la etapa ([DUEÑO 8]; D-36); la etapa le abre en `Watch` igual, su progreso vive en `localStorage` envuelto en `try/catch` (§11.10) y el acta está a un toque en `/report`, pública.

**Lo conocido es un prefijo.** Para cada espectador y carrera, las etapas con letra son siempre `1..k` con `k = known_through`, y `how` tiene exactamente `k` letras; son conocidas las de `W`, `S`, `R` y `A` (10-e), y la `X` está fuera del velo sin ser conocida. No es comodidad sino la carretera: la etapa N+1 sale con los maillots, la general y la lista de salida de tras la N (la previa de la N+1 destripa la N, D-37), así que conocer la N+1 exige conocer la N. Ver o revelar la N con huecos antes rellena esos huecos con `A`, y la pantalla lo dice antes de hacerlo: `This also reveals stages 3 and 4.` (pantalla). Consecuencia buena: «haber visto la 5 sin la 3», que la forma B del mapa 04 §3 no sabía decir, no existe; por eso basta una fila por (espectador, mundo, carrera) (D-29).

**Conocida no es lo mismo que fuera del velo.** El velo es lo que el resto del producto esconde; «conocida» es lo que el espectador sabe por un acto suyo. Una etapa caducada o fuera de guardia no está en el velo (su resultado sale en noticias, rankings y fichas) y sin embargo no es conocida: la etapa abre en `Watch`, porque entrar es sentarse a verla, y la ruta de etapa no manda su resultado mientras la pantalla no lo enseñe ([DOC 5]; §14.1). `WatchState.known` (§4.11) es exactamente esto: `true` si la letra de la etapa es `W`, `S`, `R` o `A`; y `WatchState.seen` distingue la `A`, que abre en `Watch` porque no se vio, de `W`, `S` y `R` (6-r, §6.10).

**Lo alcanzado frente a lo servido.** Lo alcanzado (`race_watch.reached_s`) es el segundo de carrera hasta el que el espectador ha reproducido; lo informa el cliente y es lo ÚNICO que convierte una etapa en vista, cuando llega a la meta (`FinishRecord.finishS`, §4.2). Lo servido es la hora hasta la que el servidor ha entregado tramos; lo decide el servidor, nunca pasa de lo alcanzado más `BROADCAST.prefetchRaceS` (900 s de carrera) y NO cuenta como visto (O-20; se descarta «lo servido es lo visto» de `television.md` §7.1, `datos.md` §7.2 y `estado.md` §7.1). Si el espectador cierra la pestaña con el último tramo descargado y sin reproducir, la etapa sigue oculta y ninguna otra pantalla la destripa: el tramo nunca lleva la meta (§10.11), y lo servido no toca `race_watch`.

**Por qué se confía en el cliente.** Lo alcanzado es el estado del propio espectador: mintiendo, lo único que consigue es destriparse a sí mismo, porque el velo no protege a nadie más que a él y no hay premio ni castigo por mirar (D-38, B20). El servidor sí impone dos cosas que no dependen de la palabra del cliente: no sirve un tramo más allá de lo alcanzado más la precarga (409 `beyond_reached`, B18) y nunca sirve la meta en un tramo (solo por `POST …/broadcast/finish`, I-15).

**Un espectador, día a día.** Su corredor corre `race-france` (21 etapas; primera etapa el día de juego 185, descansos tras la 9 y la 15, última el 207, mapa 04 §2) y su alcance es `guarded`, así que la carrera está en guardia por `own_rider`. La tabla sigue su fila de `race_watch` y el velo de esa carrera:

| Día de juego | Qué pasa | `known_through` · `how` | `watching_stage` · `reached_s` | Velo de `race-france` | En la portada (§11.4) |
| --- | --- | --- | --- | --- | --- |
| 185 | el tick corre la etapa 1 | 0 · `''` | · | {1} | `Ready to watch` (pantalla): Stage 1 |
| 185 | la ve entera en `Watch` | 1 · `'W'` | · | {} | nada por ver de esta carrera |
| 186-188 | corren la 2, la 3 y la 4; no entra | 1 · `'W'` | · | {2, 3, 4} | `Ready to watch`: tres tarjetas |
| 188 | empieza la 2 y la deja a los 7.020 s de carrera | 1 · `'W'` | 2 · 7.020 | {2, 3, 4}: a medias sigue velada | `Continue watching` (pantalla): Stage 2 y sus km a meta |
| 188 | abre la 4; su cabecera trae `previous_unseen` con `firstUnseen` 2; elige revelar la 3 y la pantalla avisa `This also reveals stage 2.` | 3 · `'WAR'` | · | {4} | `Ready to watch`: Stage 4 |
| 188 | ve la 4 en `Highlights` | 4 · `'WARS'` | · | {} | nada por ver |
| 189-207 | corren de la 5 a la 21; no vuelve | 4 · `'WARS'` | · | {5, …, 21} | `While you were away` (pantalla): Race France, 17 etapas |
| 263 | 207 + 56: caduca, sin escribir nada | 4 · `'WARS'` | · | {} | los resultados de la carrera salen en todas partes |
| 270 | vuelve: `Results of Race France are now shown (finished 16 days ago) · Watch the digest anyway` (pantalla; 63 días de juego son 15,75 reales); la web lo acusa | 21 · `'WARS'` + 17 `X` | · | {} | nada |

### 10.3 Dónde vive

En la base, por cuenta y nunca en el navegador (el móvil y el ordenador ven lo mismo): la tabla nueva `race_watch` y cuatro columnas nuevas de `users`, las dos en la migración `0045_lo_visto` (su SQL, su Drizzle y sus columnas son §13.4). `race_watch` guarda una fila por (usuario, mundo, carrera) con `follow` (1 seguida, −1 soltada, 0 lo que diga la regla de §10.4), `known_through`, `how` (una letra por etapa conocida), `watching_stage`, `reached_s` y `updated_at`, con clave `(user_id, world_id, race_key)` (D-29). El `world_id` va en la clave porque las claves de carrera se repiten en cada mundo (`race-france:s0` existe en todos) y ningún documento dice si las cuentas sobreviven al reinicio (mapa 04 §8): sin él, el mundo nuevo nacería con lo visto del viejo. Además, el procedimiento del reinicio borra `race_watch` (la nota va en `docs/ops.md` en el 7a, que crea la tabla, 17-y; §13.9); con `world_id` en la clave, olvidarlo no destripa nada, solo deja filas muertas (H-11). `users` gana `spoiler_scope` (`guarded` por defecto), `horizon_rev` (entero que sube con cada cambio de lo conocido o de la guardia: es la mitad de `Horizon.rev`), `last_seen_at` (§10.7) y `reveal_confirm` (`true` por defecto; `Don't ask again`, pantalla, lo pone a `false`, D-38).

Dos invariantes de la fila, que las escrituras mantienen y B12 comprueba: `length(how) = known_through` y `watching_stage ∈ {null, known_through + 1}` (solo se puede estar a medias de la primera etapa no conocida; ver una posterior exige resolver la puerta, D-37).

Las cuatro escrituras viven en `packages/db/src/watch.ts` (§21.6 F.2). Sus firmas:

```ts
// packages/db/src/watch.ts (nuevo)
import type { Database } from './client.js'                    // l. 35
import type { KnowledgeLetter } from './horizon.js'
import type { SpoilerScope, WatchMode } from '@cyclingstar/shared'   // WatchMode: reproducción, salto, resumen o digest; vive en broadcast/wire.ts (§14.2)

/** La letra con que queda una etapa cuando lo alcanzado llega a la meta (D-28): directo o resumen. Un salto (`seek`) no cruza nunca la meta (8-j); si un cliente lo informara, queda `R` (8-e). */
export const LETTER_OF_MODE = { play: 'W', summary: 'S', digest: 'S', seek: 'R' } as const satisfies Record<WatchMode, KnowledgeLetter>

export interface WatchKey { readonly userId: string; readonly worldId: string; readonly raceKey: string }
export interface WatchRow { readonly follow: -1 | 0 | 1; readonly knownThrough: number; readonly how: string; readonly watchingStage: number | null; readonly reachedS: number | null }
export interface ProgressResult { readonly status: 'watching' | 'known'; readonly horizonRev: number; readonly followed: boolean }

/** Lo alcanzado en la etapa `stageDay`. Si llega a `finishS`, la etapa pasa a conocida con la letra de su modo. */
export function recordProgress(db: Database, k: WatchKey, stageDay: number, reachedS: number, mode: WatchMode, finishS: number): Promise<ProgressResult>
/** Conocer la etapa sin verla: `R` para ella, `A` para los huecos anteriores; `X` para todas si la carrera ya caducó (§10.5). */
export function revealStage(db: Database, k: WatchKey, stageDay: number, expired: boolean): Promise<{ readonly horizonRev: number }>
/** `Follow without spoilers` (1), `Stop protecting this race` (−1) o volver a la regla (0). */
export function setFollow(db: Database, k: WatchKey, follow: -1 | 0 | 1): Promise<{ readonly horizonRev: number }>
/** El alcance del velo y la confirmación al revelar, en `users`. */
export function setSpoilerScope(db: Database, userId: string, scope: SpoilerScope, revealConfirm: boolean | undefined): Promise<{ readonly horizonRev: number }>
/** La fila de una carrera, o null: la leen la ruta de etapa, la cabecera y `recordProgress` (§14.1, §14.2). */
export function readWatch(db: Database, k: WatchKey): Promise<WatchRow | null>
```

| Escritura | La llama | Cuándo | Qué escribe | ¿`horizon_rev += 1`? |
| --- | --- | --- | --- | --- |
| `recordProgress` | `POST /api/me/watch/:raceKey/:day` y `POST …/broadcast/finish` (§14.2) | cada `BROADCAST.progressEveryRealS` (15 s de pared) mientras se reproduce, al pausar, al ocultarse la pestaña, al salir y justo antes de pedir un tramo que pase de lo último informado más la precarga (§10.11); en la meta, por `finish` | en el primer progreso de la etapa, `known_through = max(known_through, N − 1)` con `A` en los huecos (decisión 10-a) y, si `follow = 0`, `follow = 1` (seguir al empezar a ver, D-30); después, `watching_stage = N` y `reached_s = greatest(reached_s, nuevo)`; al llegar a `finishS`: `known_through = N`, `how` + la letra de `LETTER_OF_MODE`, `watching_stage` y `reached_s` a null | al arrastrar, al pasar a conocida y al seguir |
| `revealStage` | `POST /api/me/reveal/:raceKey/:day` | `Show result` (pantalla), la tercera salida de la puerta (`Show result of stage 6 and continue`), `Show results` de `While you were away` y el acuse del aviso de caducidad (§10.5) | `known_through = max(known_through, N)`; `R` para N y `A` para los huecos; con `expired`, `X` para todas las que faltan hasta la última | sí |
| `setFollow` | `PUT /api/me/follow/:raceKey` | los botones `Follow without spoilers` y `Stop protecting this race` (pantalla) | `follow`; nada más: seguir a mano NO arrastra, protege desde ya las etapas corridas y no conocidas, que es lo que se pide al pulsarlo | sí |
| `setSpoilerScope` | `PUT /api/me/spoiler-scope` | los ajustes y la oferta adaptativa (§10.4) | `users.spoiler_scope`; `users.reveal_confirm` si viene | sí, si cambia el alcance |

`recordProgress` y `revealStage` corren en una transacción que crea la fila si no existe (`insert … on conflict do nothing`) y la bloquea (`select … for update`) antes de calcular en TypeScript la fila nueva: así dos dispositivos que escriben a la vez no pierden letras, y gana el máximo (D-57, §10.12). Las dos rechazan romper el prefijo: `recordProgress` sobre una etapa N con una anterior en el velo no escribe y la ruta responde 403 `previous_unseen` (§14.2). Una etapa ya conocida no registra progreso: la ruta responde `status: 'known'` sin escribir, y el reproductor recuerda su punto en memoria (volver a ver no mueve nada).

```
recordProgress(db, k, N, reachedS, mode, finishS):                 en UNA transacción
  insert into race_watch (user_id, world_id, race_key) values (k) on conflict do nothing
  r ← select follow, known_through, how, watching_stage, reached_s from race_watch where clave = k for update
  si N ≤ r.known_through:  devolver { status: 'known', horizonRev: actual, followed: false }      volver a ver no mueve nada
      (con una X, status 'known' quiere decir fuera del velo: la web no lo usa para dar la etapa por vista, 10-e)
  subeRev ← falso
  si r.known_through < N − 1:  r.how ← r.how + 'A' × (N − 1 − r.known_through);  r.known_through ← N − 1;  subeRev ← cierto
      (la ruta solo llama sin puerta previous_unseen, §14.2: toda etapa anterior no conocida está fuera del velo)
  si r.follow = 0:  r.follow ← 1;  subeRev ← cierto                                               seguir al empezar a ver (D-30)
  si reachedS ≥ finishS:
      r.how ← r.how + LETTER_OF_MODE[mode];  r.known_through ← N;  r.watching_stage ← null;  r.reached_s ← null;  subeRev ← cierto
  si no:
      r.reached_s ← (r.watching_stage = N) ? max(r.reached_s, ⌊reachedS⌋) : ⌊reachedS⌋;  r.watching_stage ← N
  update race_watch set follow, known_through, how, watching_stage, reached_s, updated_at = now() where clave = k
  horizonRev ← subeRev ? (update users set horizon_rev = horizon_rev + 1 where id = k.userId returning horizon_rev) : actual
  devolver { status: r.known_through ≥ N ? 'known' : 'watching', horizonRev, followed: r.follow cambió }
```

El pseudocódigo escribe las actualizaciones en SQL para leerse de corrido; el código las hace con `.set({ … })` y `.values({ … })` de Drizzle, con los campos por su nombre, porque `columnasVivas.test.ts` solo reconoce así la escritura de `follow`, `knownThrough` y `horizonRev` (la segunda regla de 13-a, §13.7): con SQL crudo las daría por columnas muertas, y con el criterio de hoy las daría por escritas por `WatchRow`, `setFollow` y `worldHorizon`.

`revealStage` es la misma transacción sin la parte del progreso: arrastra con `A` hasta N − 1, escribe `R` para N (o `X` desde `known_through + 1` hasta la última si `expired`), pone `watching_stage` y `reached_s` a null si la etapa a medias queda conocida y sube `horizon_rev`. Ninguna de las dos toca `follow` si la fila tenía `−1`: soltar una carrera es una decisión explícita que ver una etapa no deshace.

**La carga** (D-55, H-18). El cliente informa de lo alcanzado cada `BROADCAST.progressEveryRealS` (15 s de pared) y en los cuatro momentos de la tabla; el servidor guarda en la memoria del proceso el último valor por `(userId, raceKey)` y escribe en `race_watch` si lo alcanzado creció al menos el umbral de escritura desde lo último escrito, `env.PROGRESS_MIN_DELTA_S ?? BROADCAST.progressMinDeltaS` (60 s de carrera por defecto; la variable se cambia en Railway sin desplegar, 15-j, §14.6), que recibe quien aplica el umbral, y han pasado 15 s de pared desde la última escritura de esa carrera; un cambio de estado (etapa nueva, meta, seguir) se escribe siempre (decisión 10-l). La memoria se consulta además en cada petición de tramo, así que el límite de §10.11 usa siempre lo último informado aunque no esté escrito. Pedir un tramo no escribe nada. D-55 lo estimaba en una escritura por minuto real y espectador, pero con la curva de §8.2 un informe de 15 s hace crecer lo alcanzado en 60 s o más en todas las zonas de `Watch` (pantalla) a ×1 menos el último km (900 s en la de ×60, 60 s en la de ×4): son cuatro escrituras por minuto y espectador durante casi toda la etapa, y una cada 45 s en el último km a ×1,5 (derivado de `BROADCAST.pace`, §8.5). Los informes que `Highlights` a ×4, `Next action` (pantalla) y los saltos mandan antes de cada tramo (§8.5), hasta uno cada 0,75 s, no suben esa cifra: la guarda de 15 s los deja en memoria. La memoria no crece con las carreras vistas (Rcoste-011): la entrada de `(userId, raceKey)` se borra cuando la etapa pasa a conocida, porque la meta siempre se escribe; cada informe la pone al final del `Map` y barre desde el principio las que llevan más de cuatro informes sin llegar (4 × `BROADCAST.progressEveryRealS`, 60 s de pared), escribiendo antes, sin esperar y con su `.catch` (§10.7), lo informado que aún no esté en `race_watch`. Guarda así a quien mira ahora, del orden de 100 B por espectador (§18.4). El umbral, la guarda y la memoria no tienen evidencia de los jueces: B14 mide el coste de `recordProgress` en el paso 7 (§16.4) y, si pesa, se sube `PROGRESS_MIN_DELTA_S` en Railway, sin desplegar (15-j, §15.6). Con más de una instancia de la API la memoria no se comparte y lo escrito puede ir hasta 15 s de pared por detrás: un tramo pedido a otra instancia daría 409 y la web informaría y reintentaría. El servicio `web` corre hoy una sola (`railway.json`); el día que sean más, la memoria pasa a la base (§18.4).

**Las lecturas** (Rcoste-010). La guarda ahorra la escritura, no la petición. Cada informe y cada tramo es una petición con sesión, y hoy cada una lee la base antes de empezar: `auth.api.getSession` busca la sesión y su usuario (`routes/context.ts` l. 51), porque `auth.ts` no configura `session.cookieCache` (l. 102-223) y entonces `findSession` va a la base en cada llamada (`apps/api/node_modules/better-auth/dist/api/routes/session.mjs` l. 180, better-auth 1.6.25); y `computeHorizon` hace su consulta 1 aunque el memo acierte (0,58 ms de p50, §18.2). En los modos rápidos el pico es de 2,7 peticiones por segundo y espectador a ×1.200 (`Highlights` ×4, o `Next action` sobre `Watch` ×1) y de 10,5 a ×4.800 (`Next action` sobre `Watch` ×4), pero dura lo que la zona, porque lo acota la etapa: de 33 a 60 peticiones por etapa con `Highlights` ×4 o con `Next action`, y como mucho 58 en el peor minuto, contra 9 en `Watch` ×1 (estimado con `c-l6/peticiones.mjs`: las curvas de §8.2, un tramo cada 900 s de carrera con su informe en los modos rápidos, un informe cada 15 s y una velocidad media constante, en una llana de 175 km, una reina de 232 y una clásica de 278). La lectura de la sesión se quita en `request.viewer()` (§14.5): guarda en la memoria del proceso, por el valor de la cookie de sesión, el usuario que devolvió `getSession`, en un `TtlMemo` con la vida, el barrido y el tope de los del horizonte (§10.7), y solo los aciertos, porque guardar los fallos dejaría a cualquiera llenar el memo con cookies inventadas (decisión 10-n). El paso 10 mide el p95 de un tramo con cien espectadores sintéticos en `Next action` (§18.9).

Las dos caras de esa decisión. El refutador de coste propuso `session.cookieCache` de better-auth con `maxAge` de 60 s en `auth.ts`, que es una opción de la librería y quita la misma lectura (`session.mjs` l. 87-179). No se elige, por tres motivos que están en el código. `createCurrentUserId` llama a `auth.api.getSession` sin `returnHeaders` ni `asResponse` (`routes/context.ts` l. 51), y así better-call tira las cabeceras de la respuesta (better-call 1.3.7, `dist/endpoint.mjs` l. 38-52): la cookie `session_data` que renueva la caché (`session.mjs` l. 249) solo llega al navegador cuando la web llama a `/api/auth/get-session`, y un tramo pedido pasado su minuto vuelve a la base. Cuando llega, la cabecera `Cookie` cambia con cada renovación, y `Vary: Cookie` deja de reutilizar tramos en el navegador (§14.9). Y es configuración de la sesión de toda la aplicación, que es de E4 (D-34). El memo del proceso no añade cookie y cuesta lo mismo en revocación: una sesión revocada en la base (cerrar las demás sesiones, borrar la cuenta) sigue valiendo para `request.viewer()` hasta 60 s en ese proceso, y solo para leer con horizonte o escribir progreso; una cuenta borrada da además `anonHorizon()` en la consulta 1 (§10.6). Si E4 enciende `cookieCache`, el memo sobra.

### 10.4 Qué carreras están en guardia

Una carrera está en guardia para un espectador si se cumple una de estas tres fuentes y no la ha soltado (`follow = −1`) (D-30):

1. **Propia** (`GuardReason` `own_rider` u `own_team`): su corredor activo (`riders.user_id`, `retired_at` nulo; `packages/db/src/riders.ts` l. 184-215) está en `race_rosters` de esa carrera, o corre en ella un corredor del equipo que posee (`teams.owner_user_id`, `schema.ts` l. 227). Se busca en la temporada actual y en la anterior, porque una carrera del final de la temporada pasada puede seguir en guardia los primeros 56 días de la nueva.
2. **Seguida** (`follow`): `follow = 1`, por el botón `Follow without spoilers` (pantalla) de la ficha de carrera, del calendario o de la portada, o automáticamente al empezar a ver cualquiera de sus etapas (quien se sienta a ver la etapa 3 quiere que la 4 no se la cuenten). Seguir al empezar a ver es el defecto que se implementa (D-30), no palabra del dueño: el dueño pidió «News + Race Radio + journal, y sin destripe» (`docs/encargos.md` l. 680) y no dijo qué le pasa al resto del producto de quien mira una etapa suelta. Su consecuencia es la de toda carrera en guardia: un toque en `▶` en una carrera fuera de guardia la pone en el velo de la portada, el feed, las clasificaciones, los rankings y las fichas hasta su caducidad (56 días de juego tras su última etapa, §10.5), el primer progreso arrastra con `A` las anteriores (10-a) y el ranking de quien la mira va por detrás en ella. Sin la regla, solo `Follow without spoilers` protege, y ver la etapa 3 no protege la 4 del feed. Por eso va al dueño, dentro de DD-01 (§20.2).
3. **De cabecera** (`headline`), solo en el alcance `guarded`: `SPOILER.headlineRaces`, las tres grandes vueltas y los cinco monumentos (`race-italy`, `race-france`, `race-spain`, `race-sanremo`, `race-flanders`, `race-roubaix`, `race-liege`, `race-lombardy`), 68 etapas por temporada. Los ocho ids existen en el calendario y un test lo ata (§15.5).

Los tres alcances (`users.spoiler_scope`, `SpoilerScope`): `guarded`, el de defecto, con las tres fuentes; `own_only`, con las dos primeras; y `off`, con ninguna: nada en guardia, nada velado, y aun así la etapa sigue abriendo en `Watch` (pantalla), sin puerta (D-30; el estado «fuera de guardia» de §10.2). El resto del mundo se ve al día, porque un ranking, un feed o una ficha que esperasen a todo lo que el espectador no ha visto se quedarían parados para quien no mira nada. Con todas las carreras en guardia, un jugador que no mira nada tendría a la vez 202 etapas veladas en la mediana, 601 en el p90 y 669 como máximo, alguna en 356 días de 364, contra 7, 29 y 42 etapas, y alguna en 260 días, con las ocho de cabecera (medido con `c-l6/todas.mjs`, la cuenta de `e2prod/headline.mjs` sobre las 842 carreras y 1.418 etapas del calendario, con la caducidad de 56 días de juego); y el velo de §10.6 pasaría de unas cincuenta entradas a 669. Es la lectura literal del encargo («que ninguna otra pantalla se lo reviente por detrás», `docs/encargos.md` l. 145-146), y es la tercera respuesta de DD-01 (§20.2), junto a `guarded`, que es la que se implementa, y `own_only`. La prioridad del motivo, cuando una carrera cumple varias, es `own_rider`, `own_team`, `follow`, `headline`: es lo que enseña `HorizonSummary.ready[].reason`. En pseudocódigo, la función interna que usa `computeHorizon` (§10.6):

```
guardCandidates(scope, own, rows, season):                  own: consulta 2; rows: consulta 3 (§10.6)
  g ← mapa vacío raceKey → GuardReason
  si scope = 'off':  devolver g
  para cada fila de own:  g[race_key] ← own_rider ? 'own_rider' : 'own_team'
  para cada fila de rows con follow = 1 y sin entrada en g:  g[race_key] ← 'follow'
  si scope = 'guarded':  para cada id de SPOILER.headlineRaces y s de {season, season − 1}:  g[`${id}:s${s}`] ← g[…] ?? 'headline'
  para cada fila de rows con follow = −1:  quitar g[race_key]           soltar gana a toda fuente
  devolver g
```

**El coste de la cabecera, medido por `producto`** (`e2prod/headline.mjs` sobre `SEASON_CALENDAR`): un jugador en `guarded` que no mira nada tiene alguna etapa de cabecera velada 260 días de 364, 7 a la vez en la mediana, 29 en el p90 y 42 como máximo (el Tour caducando mientras corre la Vuelta), y su ranking va por detrás en esas carreras. Las ocho de cabecera NO son palabra del dueño (§10.1): se implementan por defecto y van a DD-01 con esa cifra (O-09).

**La oferta adaptativa** (DD-16, por defecto sí). Para que quien no mira nunca no viva con un mundo retrasado sin saber por qué, tras `SPOILER.adaptiveAskAfterRaces` (2) carreras de cabecera ignoradas se le ofrece una vez pasar a `own_only`: `Only protect your own races?` (pantalla), con `Switch` y `Keep protecting`. El esquema (§13.4) no tiene columna para recordar que ya se ofreció, así que la cuenta y la marca viven en `localStorage` de ese navegador (decisión 10-b): la web cuenta como ignorada cada carrera de cabecera que aparece en `HorizonSummary.expiredSinceLastVisit` (caducó con etapas veladas, es decir, sin terminarla) y guarda `cs.adaptiveAsked` al ofrecerla; si el almacenamiento falla, la oferta puede repetirse una vez por sesión, que no destripa nada. Es una aproximación: una carrera empezada y abandonada a medias cuenta como ignorada.

### 10.5 La caducidad

El velo de una carrera se levanta `SPOILER.expiryGameDays` (56 días de juego, 14 reales, a cuatro días de juego por día real, mapa 04 §2) después de su ÚLTIMA etapa, y se levantan todas sus etapas a la vez: el prefijo se conserva (D-31). Mientras la carrera está en curso no caduca nada. El número cubre a quien se va dos semanas: una gran vuelta dura unos 6 días reales y cabe entera en una semana (mapa 04 §2), así que quien vuelve a los 14 días aún la tiene en guardia y puede verla en digest (§11.4). Con 28 días de juego, la de `ingeniero.md` §7.8, el Tour quedaba revelado a quien se fue dos semanas (O-26); con 28 el máximo de veladas a la vez sería 23 en vez de 42 (medido por `producto`), pero «vuelvo tras dos semanas» dejaría de funcionar. El valor es de DD-02. Se descartan también 7 días reales (`estado.md`) y 40 de juego (`television.md`).

Una carrera `R` con `S = stageCount` etapas caduca en el día de juego `stageGameDay(R, S) + 56` (la función es de §10.6); antes de que corra su última etapa no puede caducar. El cálculo lo hace `computeHorizon` en cada petición, sin escribir: una carrera caducada simplemente deja de aportar etapas al velo. Lo único que se escribe es el acuse, y se escribe en la visita siguiente: `HorizonSummary.expiredSinceLastVisit` lista las carreras en guardia que ya caducaron y cuyo `known_through` no llega a la última etapa; la web enseña una vez `Results of Race Italy are now shown (finished 16 days ago) · Watch the digest anyway` (pantalla; el número es `currentDay − stageGameDay(R, S)` en días de juego pasado a días reales, redondeado) y hace `POST /api/me/reveal/:raceKey/:day` con la última etapa, `S`, que con la carrera caducada escribe `X` en todas las que faltan (`revealStage` con `expired`, §10.3). Así el aviso sale una vez y `GET` no cambia estado (D-51). La etapa caducada sigue abriendo en `Watch` (pantalla) si se entra en ella (§10.2), y el digest se puede ver igual (`Watch the digest anyway`).

Las tres grandes vueltas, con su calendario (mapa 04 §2): `race-italy` corre los días 128-151 de su temporada y su velo se levanta el 207; `race-france`, 185-207, y el 263; `race-spain`, 234-256, y el 312. Entre los días 234 y 256 la Vuelta está en curso y el Tour sigue en guardia hasta el 263: ese solape es el máximo de 42 etapas veladas a la vez que midió `producto` para un jugador que no mira nada (21 más 21).

### 10.6 El horizonte en un solo punto

El horizonte es lo que un espectador conoce de cada carrera en guardia, y el velo, las etapas corridas que ese horizonte oculta ahora mismo (`Horizon.veil`, §4.10). Se calcula en el servidor en cada petición y en un solo punto (`computeHorizon`, en `packages/db/src/horizon.ts`); la web no esconde nada, pinta lo que le llega. Lo sostienen cuatro piezas que se vigilan entre sí (D-32, I-49): el tipo obligatorio (esta subsección), el predicado único `veilSql` (esta subsección), el registro de rutas que no arranca si una no declara su política (§14.5) y el canario B1, que recorre lo que registra Fastify y no una lista a mano (§16.3).

**1. El tipo.** `Horizon` es parámetro OBLIGATORIO y sin defecto de toda función exportada de `packages/db` que lea `stage_results`, `race_gc`, `stage_team_results`, `stage_snapshots.events` o `.radio`, `stage_timelines`, `palmares`, `rider_points`, `news`, `transactions`, `teams.budget`, `riders.season_points`, `riders.health` o `race_rosters.abandoned_day`, y va SEGUNDO, detrás de `db`: varias de estas funciones terminan hoy en un parámetro opcional (`getPointsClassification(db, raceId, throughStage?)`, `packages/db/src/results.ts` l. 320-324) y un parámetro obligatorio no puede ir detrás de uno opcional. Tres de ellas, `getGcThroughStage`, `getPointsClassification` y `getKomClassification` (`results.ts` l. 236, 320 y 379), reciben además primero `q: Queryable` (`Database | Tx`, el de `titles.ts`, §7.4) en lugar de `db: Database`, desde el PR 1a: `awardOutcome` las llama dentro de la transacción del tick (§12.8) y un `PgTransaction` no es asignable a `Database` (TS2379, medido por el refutador de código); las rutas las siguen llamando con `db`, y el 8a les añade el `Horizon` detrás de `q`. El tick, la administración y los bancos pasan `worldHorizon`, explícito: una llamada nueva no compila sin decidir qué horizonte lleva. La lista, sacada del código con `l6/lecturas.mjs` (toda función exportada cuyo cuerpo nombra una de esas tablas o columnas y lee) y comprobada a mano contra las importaciones de `apps/api/src/routes/`:

| Fichero | Funciones (línea de su `export`) | Lee | Quién la llama | Mecanismo (§11.1 manda por superficie) |
| --- | --- | --- | --- | --- |
| `results.ts` | `getRaceGc` (l. 23), `getGcThroughStage` (l. 236), `getPointsClassification` (l. 320), `getStageWinners` (l. 357), `getKomClassification` (l. 379) | `race_gc`, `stage_results`, `race_rosters.abandoned_day` | rutas de carrera y de etapa (`routes/calendar.ts`, `races.ts`) y el tick | P |
| `results.ts` | `getStageResults` (l. 84), `getStageNonFinishers` (l. 137), `getStageSnapshot` (l. 416) | `stage_results`, `stage_snapshots` | ruta de etapa, acta, administración | G; de `getStageSnapshot`, el `input` es recorrido (N) y `events` y `radio` solo con la etapa fuera del velo |
| `results.ts` | `getRacedStageProfiles` (l. 451), `getRunStageDays` (l. 470) | `stage_snapshots.input`, `stage_results` | ficha de carrera | N y L (cuántas etapas se corrieron no es resultado, sup. C6) |
| `teamClassification.ts`, `classifications.ts`, `raceContext.ts` | `getTeamClassifications` (l. 136); `getRaceClassifications` (l. 74); `raceMemoryOf` (l. 94) | `stage_results`, `race_gc`, `stage_team_results` | ruta de etapa y ficha (la primera); el tick (las otras dos, por `buildRaceContext`) | P; el tick pasa `worldHorizon` |
| `ranking.ts` | `getRanking` (l. 174), `getYoungRiders` (l. 221), `getSeasonAwards` (l. 313), `getRiderBadges` (l. 361), `getHallOfFame` (l. 449), `getAllTimeRecords` (l. 493) | `rider_points`, `riders.season_points`, `palmares` | `routes/rankings.ts`, `riders.ts` | R |
| `ranking.ts` | `getPalmares` (l. 336); `getSeasonWinners` (l. 564), `getRaceHistory` (l. 588) | `palmares` | fichas de corredor y de carrera, calendario | F; P |
| `browse.ts` | `getTeams` (l. 24), `getTeamDetail` (l. 75), `getCountriesSummary` (l. 123), `getCountryRiders` (l. 157), `getFreeAgents` (l. 210), `getPublicRider` (l. 269) | `teams.budget`, `riders.season_points`, `riders.health`, `rider_attrs` | `routes/teams.ts`, `rankings.ts`, `riders.ts` | R; M para la salud; L para los atributos de `getPublicRider` (DD-08, `sup. X11`) |
| `news.ts` | `getGlobalNews` (l. 67), `getTeamNews` (l. 96), `getRiderNews` (l. 118) | `news` | `/api/news`, `/api/teams/:id/news` | F |
| `economy.ts` | `getLedger` (l. 201) | `transactions` | `/api/riders/me/ledger` | F y R (el saldo) |
| `riderResults.ts` | `getRiderRaceResults` (l. 183; dentro, `getRiderGcStandings` l. 127 y `getLastStageRun` l. 163) | `stage_results`, `race_gc` | `/api/riders/:id/results` | P y F |
| `riderSchedule.ts` | `getRiderRaceDays` (l. 17); `getRiderUpcomingRaces` (l. 193); `retireFromRace` (l. 258, lee y escribe) | `race_rosters.abandoned_day` | `/api/riders/me/form`; `upcoming-races` y `my-orders`; la retirada (sup. X9, `alreadyOut`, `routes/riders.ts` l. 648) | F; M; M |
| `riders.ts` | `getRiderHealth` (l. 217); `getSeasonRank` (l. 251), `getRiderSummary` (l. 269); `getDailyLog` (l. 322), `getAttrTrend` (l. 366), `getBlockReport` (l. 517) | `riders.health`, `riders.season_points`, `rider_daily_log` y `rider_attr_log` por los días de carrera velados | `/api/riders/me/*` | M; R; F (el `parte` de un día velado a null, sup. H4; X1 con `VeilDelta.raceDays`) |
| `raceReport.ts` | `getRiderLastRaceReport` (l. 78) | `stage_results`, `stage_snapshots` | `/api/riders/me/last-race` | P y G: la última etapa CONOCIDA (D-47) |
| `teamPlan.ts` | `getTeamCalendar` (l. 263, lee y escribe); `getRiderTeamRacePlan` (l. 151) no lee dinero (l. 115-128 y 151-203) y su ruta, `/api/teams/me/race-plan`, es `safe` (11-k) | `teams.budget` | `/api/teams/me/calendar` | R (sup. X8) |
| `calendarRun.ts` | `predictStartlist` (l. 783), `ensureRaceRosterFrozen` (l. 1230), las dos leen y escriben | `race_gc`, `riders.season_points`, `palmares` | la lista de salida (`routes/calendar.ts` l. 220-249) y el tick | L: la lista se congela con el mundo al día; la ruta pasa `worldHorizon` y escribe el motivo en su `config.veil` (§14.5, §11.3) |

Quedan fuera cuatro grupos, cada uno con su motivo. Los orquestadores del tick que leen y escriben (`runOneStage`, `lockCalendarDay`, `selectFieldTeams`, `runCallups`, `runMarket`, `runTeamFinances`, `awardRacePrizes`, `runRollover`, `trainWorldDay`, `seedWorld`) no leen el mundo para un espectador: lo calculan, y cuando llaman a una lectura de la tabla le pasan `worldHorizon`. Las funciones que definen el horizonte (`computeHorizon`, `horizonSummary`, `lastRunStages`, `veilDelta`) leen las fuentes para calcularlo. Y las dos lecturas nuevas de E2 que corren al grabar, en el tick, y cuya firma fijó la síntesis sin horizonte (§21.6 F.2): `buildTimelineCast` y `palmaresTitleSource.titlesOn`, que guardan la procedencia que el velo degrada al servir (B13, §10.10). Y dos escrituras del mánager, `draftRace` y `undraftRace`, que leen el presupuesto sin devolverlo (abajo). `readStageTimeline` y `timelineForStage`, en cambio, sí reciben el `Horizon` del espectador (decisión 5-p, §5.6; §14.4), aunque el corte lo siguen haciendo las rutas por lo alcanzado (mecanismo B, §10.11). Un test de la suite rápida, `packages/db/src/horizonReaders.test.ts`, hace de esta tabla una regla (decisión 10-c), y no con el criterio de texto de `l6/lecturas.mjs`, que solo ve `export function` y no tiene `stage_timelines` entre sus patrones: con él, un método de un objeto exportado, como `palmaresTitleSource.titlesOn` (`export const palmaresTitleSource: ChampionTitleSource = { async titlesOn(…) {…} }`, §7.4), o una lectura nueva de `stage_timelines` sin `Horizon` pasarían sin que nadie lo viera (0 de 2 en un fichero sintético con esas dos formas, `c-l6/lecturas-ast2.mjs`). El test usa el AST y el comprobador de tipos de TypeScript (`ts.createProgram` sobre el `tsconfig.json` de `packages/db`; `l8/plantillas.mjs` ya lee el AST así): recorre las funciones exportadas de `packages/db/src` y los métodos de los objetos exportados, con el cuerpo de las funciones no exportadas a las que llaman, que es donde leen de verdad `predictStartlist` y `ensureRaceRosterFrozen`; busca las fuentes de D-32, punto 1, enteras, `stage_timelines` incluida; y falla si una nombra una fuente, lee y el TIPO de su segundo parámetro no es `Horizon`, que el comprobador resuelve también en un método tipado por contexto. Las excepciones van en una lista escrita, por su nombre y con su motivo, y una entrada que ya no haga falta también falla, para que la lista no envejezca: los orquestadores del tick (los de arriba y los que el AST encuentra además, `runCalendarDay`, `recomputeWorldRanking` y `addSeasonPointsBatch`), `computeHorizon`, `horizonSummary`, `lastRunStages` y `veilDelta`, `cast.ts:buildTimelineCast` y `titles.ts:palmaresTitleSource.titlesOn`, y `draftRace` y `undraftRace`, que leen `teams.budget` por `ownedTeam` (`teamPlan.ts` l. 205-219) sin devolverlo (la ruta responde `{ ok: true }`, `routes/teams.ts` l. 94-96). Así una fuente de títulos nueva, como la de E12 (§7.9), entra en rojo hasta que alguien decida su horizonte. Medido con el prototipo sobre el árbol de hoy: 61 lecturas, las 57 del criterio de texto menos `getRiderTeamRacePlan` y `selectFieldTeams` (texto de sus funciones vecinas, no lecturas suyas) y más seis que el texto no veía (`getSeasonAwards`, que la tabla ya tiene, y cinco de la lista de excepciones), en unos 5 s en esta máquina.

`worldHorizon` es una constante: `{ kind: 'world', userId: null, readOnly: true, rev: 'world', knownThrough: new Map(), veil: [], watching: new Map() }`. El visitante recibe `anonHorizon()`, igual con `kind: 'anon'` y `rev: 'anon'`. Su velo vacío es lo que hace que un visitante vea resultados fuera de la etapa ([DUEÑO 8], D-36).

**2. `computeHorizon`: tres consultas por espectador y el mapa del día** (D-33, en la forma D de la decisión 18-a). La firma es la que fijó la síntesis (§21.6 F.2): `computeHorizon(db, viewer: Viewer, world: WorldRef): Promise<Horizon>`. El resumen de la portada, `horizonSummary(db, viewer, world): Promise<HorizonSummary>` (§4.11), comparte con ella las consultas por una función interna, así que los dos no pueden discrepar.

```ts
// packages/db/src/horizon.ts (nuevo). Tres consultas por espectador y el mapa del día (forma D, 18-a); lo demás es cuenta en memoria.
import { DAYS_PER_SEASON, SPOILER, currentSeason, parseRaceKey, type SpoilerScope, type StageGate } from '@cyclingstar/shared'
import { SEASON_CALENDAR, stageDayOfSeason } from '@cyclingstar/engine'   // packages/db ya depende del motor (package.json)
import { sql } from 'drizzle-orm'
import type { Database } from './client.js'

/** La fila de la consulta 1; `first` da la primera fila de un `db.execute`, o null. */
interface ViewerRow { readonly scope: SpoilerScope; readonly rev: number; readonly rider_id: string | null; readonly team_riders: readonly string[] }

export async function computeHorizon(db: Database, viewer: Viewer, world: WorldRef): Promise<Horizon> {
  if (viewer === null) return anonHorizon()
  // 1. Usuario y alcance: la clave de users, el corredor activo y los ids de la plantilla del equipo que posee
  //    (riders.ts l. 184-215; schema.ts l. 227 y 277). Los ids van por delante para que la consulta 2 use el índice (18-a).
  const u = first<ViewerRow>(await db.execute(sql`
    select u.spoiler_scope as scope, u.horizon_rev as rev,
           (select r.id from riders r where r.user_id = u.id and r.retired_at is null limit 1) as rider_id,
           array(select r2.id from riders r2
                 where r2.team_id = (select t.id from teams t where t.owner_user_id = u.id limit 1)) as team_riders
    from users u where u.id = ${viewer.userId}`))
  if (u === null) return anonHorizon()                        // cuenta borrada con la cookie aún viva: nada que proteger
  const memoKey = `${viewer.userId}|${world.currentDay}|${u.rev}`
  const hit = horizonMemo.get(memoKey, Date.now())            // TtlMemo (§10.7): SPOILER.horizonMemoS (60 s), barrido y tope
  if (hit !== undefined) return { ...hit, readOnly: viewer.readOnly }
  const season = currentSeason(world.currentDay)              // shared/src/time.ts
  // 2. Listas de su corredor y de su plantilla en la temporada actual y la anterior, por race_rosters_rider_idx (0045):
  //    `= any` con UN parámetro de tipo array (sql.param, 10-d). Con `or … in (select …)` el plan era un Seq Scan (18-a).
  const ids = [u.rider_id, ...u.team_riders].filter((id): id is string => id !== null)
  const own = u.scope === 'off' || ids.length === 0 ? [] : await db.execute(sql`
    select rr.race_id as race_key, bool_or(rr.rider_id = ${u.rider_id}) as own_rider
    from race_rosters rr
    where rr.rider_id = any(${sql.param(ids)}::uuid[])
      and (rr.race_id like ${`%:s${season}`} or rr.race_id like ${`%:s${season - 1}`})
    group by rr.race_id`)
  // 3. Sus filas de race_watch en este mundo: la clave (user_id, world_id, race_key).
  const rows = await db.execute(sql`
    select race_key, follow, known_through, how, watching_stage, reached_s
    from race_watch where user_id = ${viewer.userId} and world_id = ${world.worldId}`)
  const guard = guardCandidates(u.scope, own, rows, season)   // Map<raceKey, GuardReason>: propias, seguidas, cabecera; fuera las soltadas
  // 4. La última etapa corrida de cada candidata sale del mapa del día, el mismo para todos los espectadores (abajo).
  const runs = guard.size === 0 ? new Map<string, number>() : await lastRunStages(db, world)
  const h = buildHorizon(viewer, world, u.rev, guard, rows, runs)   // abajo
  horizonMemo.set(memoKey, h, Date.now())
  return h
}

/** La última etapa corrida de cada carrera de la temporada actual y la anterior: UNA consulta por (worldId, currentDay) para
 *  todos (18-a; 6,5 ms de p50 con las 1.630 carreras de dos temporadas, §18.2). Exacto porque el tick corre las etapas del día
 *  y sube currentDay en la misma transacción (tick.ts l. 262-284): quien lee el día D ve todas las etapas hasta D y ninguna más. */
let lastRun: { readonly key: string; readonly runs: Promise<ReadonlyMap<string, number>> } | null = null
export function lastRunStages(db: Database, world: WorldRef): Promise<ReadonlyMap<string, number>> {
  const key = `${world.worldId}|${world.currentDay}`
  if (lastRun?.key === key) return lastRun.runs
  const season = currentSeason(world.currentDay)
  const runs = db.execute(sql`
    select race_id as race_key, max(stage_day) as last_run from stage_snapshots
    where race_id like ${`%:s${season}`} or race_id like ${`%:s${season - 1}`} group by race_id`)
    .then((rs) => new Map(rs.map((r) => [String(r.race_key), Number(r.last_run)])))
  lastRun = { key, runs }
  void runs.catch(() => { if (lastRun?.runs === runs) lastRun = null })   // un fallo no se queda como el mapa del día
  return runs
}

/** Solo para los tests, como clearStageTimelineCache (§5.6): vacía el memo del horizonte, el de veilDelta y la cuenta del día, que son
 *  el mapa de lastRunStages y el total del ranking que resta R, guardado igual (11-s; viva donde viva, se vacía aquí). En el mundo de B1
 *  el día de juego no cambia al correr la etapa velada, y todo esto va por el día: sin vaciar el total, el barrido de B1b de después
 *  restaría la etapa velada a un total de antes (§16.3). Se exporta desde packages/db/src/index.ts en el 7a. */
export function clearHorizonCaches(): void { horizonMemo.clear(); veilDeltaMemo.clear(); lastRun = null /* y el total del día de R, 11-s */ }

/** Los dos horizontes sin espectador (10-h, arriba): el del tick, la administración y los bancos, y el del visitante. Velo vacío. */
export const worldHorizon: Horizon = { kind: 'world', userId: null, readOnly: true, rev: 'world', knownThrough: new Map(), veil: [], watching: new Map() }
export function anonHorizon(): Horizon { return { ...worldHorizon, kind: 'anon', rev: 'anon' } }
/** La primera fila de un `db.execute` (postgres-js devuelve un RowList, que es un array), o null. */
function first<T>(rows: readonly unknown[]): T | null { return (rows[0] as T | undefined) ?? null }
/** Las carreras en guardia y su motivo, sin las soltadas: el cuerpo es el pseudocódigo de §10.4. */
function guardCandidates(scope: SpoilerScope, own: readonly Record<string, unknown>[], rows: readonly Record<string, unknown>[], season: number): Map<string, GuardReason>
/** La cuenta pura del velo, de lo conocido y de lo que está a medias: el cuerpo es el pseudocódigo de abajo. */
function buildHorizon(viewer: NonNullable<Viewer>, world: WorldRef, rev: number, guard: ReadonlyMap<string, GuardReason>, rows: readonly Record<string, unknown>[], runs: ReadonlyMap<string, number>): Horizon
/** El día de juego de una etapa por el calendario, la cuenta de raceReport.ts l. 52-59 (abajo). Una clave sin temporada o fuera del
 *  calendario da el número de etapa, como allí: esas carreras no entran nunca en guardia (la vuelta de prueba, abajo). */
export function stageGameDay(raceKey: string, stageDay: number): number {
  const { raceId, season } = parseRaceKey(raceKey)                                // shared/src/raceKey.ts l. 15-19
  const race = SEASON_CALENDAR.find((r) => r.id === raceId)
  return race === undefined || season === null ? stageDay : season * DAYS_PER_SEASON + stageDayOfSeason(race, stageDay)
}
```

`Date.now()` está bien aquí: `packages/db` no es el motor y el memo no decide ninguna carrera. `buildHorizon` es la cuenta, pura:

```
para cada (raceKey, reason) de guard con entrada en runs:  última ← runs.get(raceKey)
  S ← número de etapas de la carrera (race.stages.length de SEASON_CALENDAR, como routes/races.ts l. 417)
  k ← known_through de su fila de race_watch, o 0
  si última = S y world.currentDay ≥ stageGameDay(raceKey, S) + SPOILER.expiryGameDays:  caducada, no aporta nada (§10.5)
  si no:  knownThrough[raceKey] ← k;  para s de k + 1 a última:  veil ← { raceKey, stageDay: s, gameDay: stageGameDay(raceKey, s), reason }
watching[raceKey] ← { stageDay: watching_stage, reachedS: reached_s }  para toda fila con watching_stage no nulo
rev ← `${world.currentDay}.${u.rev}`;  kind ← 'viewer';  userId ← viewer.userId;  readOnly ← viewer.readOnly

stageGameDay(raceKey, s) = season(raceKey) · DAYS_PER_SEASON + stageDayOfSeason(race, s)
    la cuenta de packages/db/src/raceReport.ts l. 52-59 y riderSchedule.ts l. 44, con stageDayOfSeason del motor
    (routes/schedule.ts l. 12-18): el mismo día en que el tick corre la etapa; se exporta de horizon.ts para que haya una sola
    cuenta del día de juego de una etapa (la caducidad de §10.5 y el gameDay del velo); su TypeScript está arriba
```

**Por qué la consulta 2 y la cuarta tienen esa forma** (decisión 18-a, §18.2). Escrita como `rr.rider_id = $rider or rr.rider_id in (select id from riders where team_id = $team)`, la consulta 2 no usa `race_rosters_rider_idx`: el plan es un `Seq Scan`, de 23 a 40 ms en PGlite. Con los ids por delante, que trae la consulta 1, y `= any`, el plan usa el índice (`Bitmap Index Scan on race_rosters_rider_idx`) y cuesta de 0,75 a 2,1 ms. La cuarta, la última etapa corrida de cada carrera en guardia, costaba 2,1 ms con 273 carreras y es la misma para todos los espectadores: `lastRunStages` la hace una vez por `(worldId, currentDay)` para todas las carreras de las dos temporadas y deja el mapa en el proceso. Esta forma, la D de §18.2, da el mismo velo que las cuatro consultas por espectador, etapa a etapa (comprobado en cada corrida, §18.2; B12 lo fija, §10.14), y deja el p95 del jugador en 3,1-3,7 ms y el del mánager de un equipo de 30 en 8,6-9,3 ms (PGlite; B14, §10.7).

Tres detalles con su porqué. La clave de carrera sin temporada (`test-tour`, la vuelta de prueba de la alfa, `routes/races.ts` l. 65) no casa con los patrones `%:s<n>` de la consulta 2 y queda fuera de toda guardia: es una herramienta de pruebas con sus propias rutas, que ya piden sesión. El equipo de la consulta 2 es el de hoy (`riders.team_id`), no el del día de cada carrera: `race_rosters` no guarda equipo (`schema.ts` l. 587-610), y dentro de una temporada la plantilla solo cambia con el mercado, así que la aproximación puede dejar sin guardia la carrera de un corredor recién fichado o guardar la de uno recién vendido; las dos cosas solo restringen de más o de menos una carrera ajena. El `rev` lleva el día porque cada tick añade etapas nuevas al velo sin que cambie `horizon_rev`: el mismo espectador tiene otro horizonte mañana.

**3. El predicado.** `veilSql` es la ÚNICA forma de escribir el corte en SQL (D-32). `(raceKey, gameDay)` identifica una etapa porque ninguna carrera declara `doubleAfter` (medido, 0 de 842, mapa 04 §2; `stageDayOfSeason` las contaría, `routes/schedule.ts` l. 15-16), y donde existe `stage_day` (en `news` desde la `0043`; en `rider_points`, `palmares` y `transactions` desde la `0046`; siempre en `stage_team_results`) se usa `stage_day`. En SQL, con `$1`, `$2` y `$3` las tres listas del velo:

```sql
-- veilSql(h, raceKey, gameDay, stageDay): la fila pertenece a una etapa del velo de h
exists (select 1 from unnest($1::text[], $2::int[], $3::int[]) as w(k, d, s)
        where w.k = <raceKey> and (w.s = <stageDay> or (<stageDay> is null and w.d = <gameDay>)))
-- sin stageDay:            ... where w.k = <raceKey> and w.d = <gameDay>
-- sin gameDay (null):      ... where w.k = <raceKey> and w.s = <stageDay>
-- con el velo vacío:       false
```

```ts
// packages/db/src/horizon.ts (sigue)
import type { SQL, SQLWrapper } from 'drizzle-orm'

/** EL predicado del velo (D-32). `stageDay` donde la tabla lo tiene; `gameDay` null solo si la tabla no tiene día de juego. */
export function veilSql(h: Horizon, raceKey: SQLWrapper, gameDay: SQLWrapper, stageDay?: SQLWrapper): SQL
export function veilSql(h: Horizon, raceKey: SQLWrapper, gameDay: null, stageDay: SQLWrapper): SQL
export function veilSql(h: Horizon, raceKey: SQLWrapper, gameDay: SQLWrapper | null, stageDay?: SQLWrapper): SQL {
  if (h.veil.length === 0) return sql`false`
  // sql.param: UN parámetro de tipo array. Una lista tal cual, drizzle-orm 0.45.2 la expande a ($1, $2, …) y el ::text[] falla (l6/veilsql.mjs)
  const keys = sql.param(h.veil.map((v) => v.raceKey))
  const days = sql.param(h.veil.map((v) => v.gameDay))
  const stages = sql.param(h.veil.map((v) => v.stageDay))
  const match = stageDay === undefined ? sql`w.d = ${gameDay}`
    : gameDay === null ? sql`w.s = ${stageDay}`
    : sql`(w.s = ${stageDay} or (${stageDay} is null and w.d = ${gameDay}))`
  return sql`exists (select 1 from unnest(${keys}::text[], ${days}::int[], ${stages}::int[]) as w(k, d, s) where w.k = ${raceKey} and ${match})`
}
```

Medido en el scratchpad: una lista dentro de `sql` sale como `($1, $2)::text[]` y la consulta falla («Failed query»), así que el `hiddenSql` de `ingeniero.md` §7.2, escrito con la lista tal cual, no funcionaría; con `sql.param` sale `$1::text[]` y devuelve exactamente las filas veladas en PGlite (`l6/veilsql.mjs`) y con postgres-js 3.4.9 contra PGlite servido por socket (`l6/veilsql-pgjs.mjs`), también con listas vacías. Los usos, por tabla: `news` con `veilSql(h, news.raceKey, news.gameDay, news.stageDay)`; `palmares`, cuya `race_id` no lleva temporada (`schema.ts` l. 774-775), con ``veilSql(h, sql`${palmares.raceId} || ':s' || ${palmares.season}`, palmares.gameDay, palmares.stageDay)``; `rider_points` con `veilSql(h, riderPoints.raceId, riderPoints.gameDay, riderPoints.stageDay)`; `transactions` con sus columnas de la `0046`; `stage_team_results` con `veilSql(h, stageTeamResults.raceId, null, stageTeamResults.stageDay)`; y el abandono con `veilSql(h, raceRosters.raceId, raceRosters.abandonedDay)` y `abandoned_reason <> 'voluntario'`: `abandoned_day` es un día de juego (`schema.ts` l. 598-600), y la retirada del jugador entre etapas lo escribe con el día de hoy (`riderSchedule.ts` l. 283), que puede ser el de una etapa velada; esa no se enmascara, porque es un acto del jugador y no un resultado. Las filas de antes de la migración que les da la columna tienen `race_key` nulo o `stage_day` nulo y caen al día de juego, o no casan y se ven: son del mundo de pruebas, que el reinicio se lleva (mapa 04 §8). En tablas grandes el predicado va detrás de un filtro que use un índice (`rider_points.game_day = any(…)`, `rider_points_day_idx`, `schema.ts` l. 1047; `palmares_race_idx`, l. 785): el velo tiene como mucho unas cincuenta entradas (42 de cabecera más las propias, §10.4).

**Sus gemelos, para lo que va por número de etapa:**

```ts
// packages/db/src/horizon.ts (sigue): los gemelos del predicado
/** Hasta qué etapa se puede servir una carrera (mecanismo P): la anterior a su primera velada, o lastRun. */
export function throughStage(h: Horizon, raceKey: string, lastRun: number): number {
  let first = Number.POSITIVE_INFINITY
  for (const v of h.veil) if (v.raceKey === raceKey && v.stageDay < first) first = v.stageDay
  return first === Number.POSITIVE_INFINITY ? lastRun : Math.min(lastRun, first - 1)
}
export function isVeiled(h: Horizon, raceKey: string, stageDay: number): boolean {
  return h.veil.some((v) => v.raceKey === raceKey && v.stageDay === stageDay)
}
/** La puerta de una etapa (D-37): una anterior velada manda sobre la propia. */
export function stageGateOf(h: Horizon, raceKey: string, stageDay: number): StageGate | null {
  const before = h.veil.filter((v) => v.raceKey === raceKey && v.stageDay < stageDay).map((v) => v.stageDay)
  if (before.length > 0) return { k: 'previous_unseen', firstUnseen: Math.min(...before) }
  return isVeiled(h, raceKey, stageDay) ? { k: 'not_seen' } : null
}
```

**4. `veilDelta`**, lo que las etapas veladas cambiaron en el mundo (§21.6 F.2: `veilDelta(db, h): Promise<VeilDelta>`). Una consulta por fuente, solo sobre filas veladas y por los índices nuevos; con el velo vacío no consulta nada y devuelve el `VeilDelta` vacío. Lo usan los mecanismos R y M; se pide perezoso, como mucho una vez por petición, y se memoriza con la clave y la vida del horizonte en otro `TtlMemo`, con las mismas reglas y el mismo tope (18-c, §10.7).

| Campo de `VeilDelta` (§4.10) | La consulta (todas con `veilSql` y un filtro indexado delante) |
| --- | --- |
| `points` | `rider_points` de las filas veladas, `sum(points)` por `rider_id`: `window` todo, `season` las de `game_day ≥` el primer día de la temporada actual |
| `money` | `transactions` de `kind = 'premio'` con `(race_key, stage_day)` velados (`transactions_race_stage_idx`, `0046`), `sum(amount)` por `rider_id` |
| `budget` | `stage_team_results.prize` de `(race_id, stage_day)` velados, `sum` por `team_id` (`0046`, D-41) |
| `palmares` | los `id` de `palmares` velados del mundo (`palmares_race_idx`) |
| `health` | la noticia `injury` velada más reciente de cada corredor: `data->>'prevHealth'` y `data->>'prevUntilDay'` (`NewsPayload`, §4.12), la salud de ANTES de la caída (sup. P5) |
| `abandons` | `race_rosters` con `abandoned_day` velado y `abandoned_reason <> 'voluntario'`: `${race_id}\|${rider_id}` (sups. X2 y X9) |
| `raceDays` | los corredores de la lista de salida de cada carrera con etapas veladas, con los días de juego velados: `race_rosters` unido al velo por `race_id` (el `parte` y el aprendizaje, sups. H4 y X1) |

Tres de ellas escritas, para que se vea el patrón (un filtro indexado y `veilSql` detrás; `$days` y `$keys` son las listas del velo, enlazadas con `sql.param`):

```sql
-- points: rider_points_day_idx acota a los días del velo; $1 es el primer día de la temporada actual (season · 364)
select rp.rider_id, sum(rp.points) filter (where rp.game_day >= $1) as season, sum(rp.points) as "window"
from rider_points rp
where rp.game_day = any($days::int[]) and <veilSql(h, rp.race_id, rp.game_day, rp.stage_day)>
group by rp.rider_id;

-- budget: la clave de stage_team_results empieza por race_id
select str.team_id, sum(str.prize) as prize
from stage_team_results str
where str.race_id = any($keys::text[]) and <veilSql(h, str.race_id, null, str.stage_day)>
group by str.team_id;

-- raceDays: la clave de race_rosters empieza por race_id; un día de juego por etapa velada
select rr.rider_id, array_agg(w.d order by w.d) as days
from race_rosters rr join unnest($keys::text[], $days::int[]) as w(k, d) on w.k = rr.race_id
group by rr.rider_id;
```

`rider_points` y `transactions` no llevan `world_id` (`schema.ts` l. 824-838 y 1032-1049): una fila de otro mundo con la misma clave de carrera y el mismo día aportaría un corredor de ese mundo, y como las restas se aplican por id de corredor del mundo actual, no cambia nada de lo que se sirve.

**5. Los mecanismos.** Todo lo que una ruta devuelve y nace de una etapa pasa por uno de ocho (D-32). Su aplicación superficie a superficie es §11.1 y su declaración por ruta, `config.veil` (§14.5).

| Mecanismo | Qué hace | Con qué pieza | Ejemplo |
| --- | --- | --- | --- |
| P, prefijo | sirve una carrera «tras la etapa k» con las funciones `…ThroughStage` que ya existen (`results.ts` l. 236, 320, 379) | `throughStage` | la ficha de carrera enseña la general tras la última conocida (sup. C2) |
| R, resta | el total del mundo del día, calculado como hoy, menos `VeilDelta`, y se reordena; el total se guarda igual que `lastRunStages`, en una promesa por `(worldId, currentDay)` que comparten las peticiones que llegan a la vez tras el tick y que se borra si falla (11-s, §11.5) | `veilDelta` | el ranking mundial, los puntos del equipo, el presupuesto (sups. W1, P6) |
| F, filtro | las filas veladas fuera y UN marcador neutro por etapa velada en toda lista que sea un flujo, se escribieran sobre ella una fila o cinco | `veilSql` | las noticias con un `stage_ready` por etapa (sup. N1, §11.7) |
| M, máscara | el estado previo guardado en lugar del actual | `veilDelta.health`, `.abandons` | `Injured` no sale si la caída está velada (sup. P5) |
| G, puerta | la respuesta no lleva el resultado; lleva `StageGate` | `stageGateOf`, `isVeiled` | el acta de una etapa velada da 403 con la puerta (§14.2) |
| B, tramos | la retransmisión se sirve hasta lo alcanzado más la precarga y nunca con la meta | lo alcanzado (§10.11) | `GET …/broadcast/chunk` |
| N, neutro | la entrada no puede llevar un resultado, por tipo | `PreStageInfo`, el recorrido | el título de la pestaña, el correo, el perfil sin marcas (§11.8, §11.9) |
| L, libre | se deja ver, con el motivo escrito en la ruta y en §11.1 | ninguna | cuántas etapas se han corrido (sup. C6), la lista de salida congelada |

La existencia también informa (I-39): todo aviso que diga que hay algo oculto (`Results from 3 stages you haven't watched are hidden · Manage`, pantalla) depende SOLO del horizonte (`h.veil.length`) y sale igual en todas las fichas; una lista que sea un flujo deja un marcador por etapa velada y no por fila escondida; y ninguna decisión de enviar o de enseñar mira el contenido que esconde. B1c lo sella con dos semillas de desenlaces distintos (§16.3).

### 10.7 El coste

`race_rosters` solo tiene la clave `(race_id, rider_id)` (`schema.ts` l. 609): las carreras de un corredor se buscaban con un recorrido secuencial, 19,6 ms con 249.232 filas (la cota de cuatro temporadas, un año real), contra 0,11 ms con un índice por `rider_id` (medido por el juez del motor en PGlite, C12). Por eso la `0045` añade `race_rosters_rider_idx (rider_id)` (§13.4) y el «menos de 5 ms» de `estado.md` §7.2, estimado sin índice, era falso (X-11, O-17, H-10). Las consultas 1 y 3 de `computeHorizon` van por clave primaria (`users`; `race_watch` por `(user_id, world_id)`, prefijo de su clave) y se estimaban por debajo del milisegundo cada una; la cuarta, por espectador (`stage_snapshots` por `race_id = any(…)`, prefijo de su clave), costaba 2,1 ms medida con 273 carreras en guardia, y por eso `lastRunStages` la hace una vez por día de juego para todas (forma D, 18-a; §18.2), en una promesa que comparten las peticiones que llegan a la vez tras el tick y que se borra si falla, como el total del día de la resta (11-s). El resultado se memoriza en el proceso por `(userId, currentDay, horizonRev)` durante `SPOILER.horizonMemoS` (60 s): una segunda petición del mismo espectador en el mismo minuto cuesta la consulta 1 y nada más (I-33); revelar, llegar a meta, seguir o cambiar el alcance suben `horizon_rev` y la clave cambia sola. B14 lo sella desde el 7a contra el Postgres de servicio del CI (§16.4, decisiones 16-k y 18-j): `computeHorizon` y `recordProgress` se miden por separado, cada uno con p95 ≤ `SPOILER.horizonBudgetMs` (5 ms) sobre 250.000 filas de `race_rosters`, y `computeHorizon` para dos espectadores. El jugador y `recordProgress` son puerta en la suite rápida contra ese Postgres; en PGlite solo informan y fallan por encima de 15 ms, porque por el socket de `testDb.ts` el jugador va de 2,55 a 4,97 ms entre corridas y la puerta sería intermitente (en PGlite dentro del proceso, 3,1 a 3,7 ms, forma D). El mánager de un equipo de 30 (de 8,6 a 9,3 ms en PGlite, 3,88 en PostgreSQL 16 sin red) se imprime, y su puerta es la medida desde el servicio `web` de Railway contra una copia de producción (§18.9, DD-21). Si no pasa, `SPOILER_MODE=off` lo apaga sin desplegar (D-53, §10.13).

**Los memos no crecen** (Rcoste-011, decisión 10-m). La clave cambia sola, y por eso mismo cada día de juego (cuatro por día real) y cada subida de `horizon_rev` dejan atrás una entrada que no se vuelve a pedir: un `Map` con solo `get` y `set` no suelta ninguna hasta que el proceso se reinicia. Medido por entrada (`heapUsed` tras `gc`, `coste/memo/memo.mjs` y `c-l6/veildelta-forma.mjs`, con las filas de §18.2): 9 KB el horizonte de un jugador y 35 KB el de un mánager, y 75 y 180 KB su `VeilDelta`, que se memoriza con la misma clave (18-c). Con 200 jugadores y una decena de claves nuevas por jugador y día real serían de 18 a 470 MB al día en el proceso de `web` (estimado por el refutador de coste). Así que los memos del proceso (el del horizonte, el de `veilDelta` y el de la sesión de `request.viewer()`, §10.3) son un `TtlMemo`, con tres reglas: una entrada caducada se borra al leerla; cada `set` barre desde el principio las caducadas, que son las primeras porque todas viven lo mismo y un `Map` recorre sus claves en orden de inserción, así que el memo guarda solo a quien pidió algo en el último minuto (con cien espectadores, 3,5 MB el del horizonte y 18 MB el de `veilDelta` si todos fueran mánagers); y un tope, `SPOILER.horizonMemoEntries` (500), borra la más antigua cuando un pico lo pasa: 17 y 88 MB en el peor caso, quinientos mánagers distintos en un minuto, todos en rutas con R o M. El tope no tiene evidencia de los jueces: quinientos espectadores distintos en un minuto están muy por encima de lo que el juego tiene hoy, y pasarlo solo cuesta recalcular (de 3 a 9 ms el horizonte, §18.2). No hace falta vaciarlos al cambiar `currentDay`, como proponía el refutador: una clave de otro día ya no se pide y el barrido la quita en menos de un minuto. La memoria de lo alcanzado sigue su propia regla (§10.3).

```ts
// packages/db/src/horizon.ts (sigue): los memos del proceso, con vida, barrido y tope (decisión 10-m)
/** Memo de vida fija. Todas las entradas viven lo mismo, así que el orden de inserción del Map es el de caducidad. */
export class TtlMemo<V> {
  private readonly entries = new Map<string, { readonly v: V; readonly untilMs: number }>()
  constructor(private readonly lifeMs: number, private readonly maxEntries: number) {}
  get(key: string, nowMs: number): V | undefined {
    const hit = this.entries.get(key)
    if (hit === undefined) return undefined
    if (hit.untilMs > nowMs) return hit.v
    this.entries.delete(key)                                                           // caducada: fuera al leerla
    return undefined
  }
  set(key: string, v: V, nowMs: number): void {
    for (const [k, e] of this.entries) { if (e.untilMs > nowMs) break; this.entries.delete(k) }   // las caducadas, desde el principio
    this.entries.delete(key)                                                           // al final, con su vida nueva
    this.entries.set(key, { v, untilMs: nowMs + this.lifeMs })
    if (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!)   // el tope: fuera la más antigua
  }
  get size(): number { return this.entries.size }                                      // para B12
  clear(): void { this.entries.clear() }                                               // solo clearHorizonCaches, para los tests (§10.6)
}
const horizonMemo = new TtlMemo<Horizon>(SPOILER.horizonMemoS * 1000, SPOILER.horizonMemoEntries)
const veilDeltaMemo = new TtlMemo<VeilDelta>(SPOILER.horizonMemoS * 1000, SPOILER.horizonMemoEntries)   // 18-c: la clave del horizonte
/** `users.last_seen_at`, como mucho una vez por hora (abajo). Quien la lanza sin esperar le pone su `.catch` (10-k). */
export function touchLastSeen(db: Database, userId: string): Promise<void>
```

`users.last_seen_at` se escribe como mucho una vez por hora (`SPOILER.lastSeenEveryMin`, 60): cuando el espectador llega con sesión, el registro de rutas (§14.5) lanza, sin esperarla y con su `.catch`, `touchLastSeen(db, userId)` (`packages/db/src/horizon.ts`), que hace `update users set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '60 minutes')`, detrás de un memo del proceso por usuario que evita hasta la consulta dentro de la hora. La condición en el `where` hace que dos instancias no escriban dos veces. El `.catch`, que registra el error con `request.log.warn`, no es un adorno (Rcodigo-019): el repositorio exige Node 22 o más (`package.json` l. 7-9), donde un rechazo que nadie atiende tumba el proceso, y `apps/api/src/index.ts` no instala `process.on('unhandledRejection')` (solo `main().catch`, l. 88-91), así que un fallo pasajero de la base en esta escritura reiniciaría el servicio `web`, que además corre el auto-tick (l. 56-86). Vale para toda escritura que se lance sin esperar, como la de lo alcanzado al barrer su memoria (§10.3). El dato no sirve al horizonte: lo pide E7 para su regla del mes sin entrar («Empezar a registrar la última visita (`last_seen`). Hoy no existe, y es un dato que no se reconstruye hacia atrás», `docs/encargos.md` l. 729-731), y E2 lo empieza a escribir porque ya pasa por ahí en cada petición.

### 10.8 La sesión y la cookie

better-auth caduca la sesión a los 7 días y la renueva como mucho una vez al día (`updateAge: 1440 * 60`, `expiresIn: 3600 * 24 * 7`, `apps/api/node_modules/better-auth/dist/context/create-context.mjs` l. 146-147), porque `apps/api/src/auth.ts` no configura `session` (l. 102-223) (C13). Quien vuelve tras una semana, que es justo el caso de §11.4, llega sin sesión, y sin sesión `/news`, `/world` y los rankings son públicos (`App.tsx` l. 130 y 208-219) y cuentan quién ganó antes de que escriba la contraseña; la portada de invitado no enseña resultados (`Home.tsx` l. 44-72), así que la fuga está en esas páginas y no en la portada (X-16, cobertura §2.5, ejecutabilidad #7). Alargar la sesión es de E4 y ayuda, pero no basta: cualquier caducidad deja el mismo hueco (D-34, O-18).

La defensa es una cookie que solo restringe, `cs_viewer` (I-31). El servidor la pone, en una respuesta de una ruta con horizonte (`horizon` o `watch`, §14.5) a una petición con sesión, solo si la que llega falta, no vale, es de otro usuario o se emitió hace más de un día (decisión 10-g): la firma lleva la hora de emisión, así que firmarla en cada respuesta cambiaría la cabecera `Cookie` en cada petición, y con `Vary: Cookie` el navegador no reutilizaría ningún tramo guardado (§14.9). Su vida de `SPOILER.viewerCookieDays` (90 días reales) cuenta, así, desde el último día de uso con sesión; lleva el id del usuario firmado con HMAC-SHA256 y `SESSION_SECRET` (la variable que ya valida `env.ts` l. 30, de 32 caracteres como mínimo), `HttpOnly`, `Secure` cuando la app va por https (la misma regla que `auth.ts` l. 100) y `SameSite=Lax`, como la cookie de sesión (l. 213-218). Una petición SIN sesión y con `cs_viewer` válida recibe el horizonte de ese jugador en lectura (`Viewer.readOnly: true`, `Horizon.readOnly: true`): se le vela lo que se le velaría con sesión, pero no escribe nada (las rutas de `/api/me/*` que escriben piden sesión y responden 401 sin ella) y la web enseña `Sign in to see results as you know them` (pantalla). La web sabe que está en ese caso porque no tiene sesión y `GET /api/me/horizon` le responde igual (§14.2).

```ts
// apps/api/src/viewerCookie.ts (nuevo; §17.20)
import { createHmac } from 'node:crypto'
import { SPOILER } from '@cyclingstar/shared'
import { timingSafeEqualString } from './security.js'   // l. 57-61: compara los SHA-256, en tiempo constante

export const VIEWER_COOKIE = 'cs_viewer'
const DAY_S = 86_400
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** `v1.<userId>.<emitida, s epoch>.<firma>`; la firma es base64url(HMAC-SHA256(secret, 'cs_viewer.v1.<userId>.<emitida>')). */
export function signViewerCookie(userId: string, secret: string, nowS: number): string {
  const payload = `v1.${userId}.${nowS}`
  return `${payload}.${mac(secret, payload)}`
}
/** El usuario si la cookie es de este servidor, tiene forma y no ha caducado; null en cualquier otro caso. Nunca lanza. */
export function readViewerCookie(raw: string | undefined, secret: string, nowS: number): { readonly userId: string; readonly issuedAtS: number } | null {
  if (raw === undefined || raw.length > 200) return null
  const parts = raw.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const [, userId = '', issued = '', signature = ''] = parts
  const issuedAtS = Number(issued)
  if (!UUID_RE.test(userId) || !Number.isInteger(issuedAtS)) return null
  if (issuedAtS > nowS + 60 || nowS - issuedAtS > SPOILER.viewerCookieDays * DAY_S) return null
  return timingSafeEqualString(signature, mac(secret, `v1.${userId}.${issuedAtS}`)) ? { userId, issuedAtS } : null
}
/** La cabecera Set-Cookie; con `null`, la que la borra (Max-Age=0). */
export function viewerCookieHeader(value: string | null, secure: boolean): string {
  const base = `${VIEWER_COOKIE}=${value ?? ''}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
  return `${base}; Max-Age=${value === null ? 0 : SPOILER.viewerCookieDays * DAY_S}`
}
function mac(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(`cs_viewer.${payload}`).digest('base64url')   // el prefijo separa este uso del secreto de los de better-auth
}
```

Medido (`l6/cookie.mjs`): la cookie ocupa 94 caracteres y su cabecera `Set-Cookie`, 161; firmarla cuesta 1,8 µs y leerla y verificarla, 6,3 µs de media en 100.000 repeticiones (re-medido en la auditoría, en otra máquina: 3,6 µs y de 8,6 a 9,8 µs); una cookie con un carácter cambiado o de más de 90 días da `null`. No se cifra: lleva el id del propio usuario, que no es secreto para quien tiene su dispositivo, y lo que protege es la firma.

**Solo restringe** (B12 lo prueba, §16.4). `currentUserId` (`createCurrentUserId`, `routes/context.ts` l. 47-54) no lee nunca `cs_viewer`: la cookie solo llega a `request.viewer()` (§14.5), que solo alimenta el horizonte. Ninguna ruta privada se abre con ella, ninguna escritura la acepta y, si dice un usuario que ya no existe, `computeHorizon` devuelve `anonHorizon()` (§10.6). En un dispositivo compartido, el segundo que lo use sin entrar ve con el horizonte del primero hasta que entre con su cuenta: solo le esconde cosas, nunca le enseña nada del primero (el resumen de lo que el primero tiene por ver no se le sirve, §14.2).

**Se borra con un cierre de sesión explícito** (D-34). El reenvío a better-auth (`routes/authProxy.ts` l. 17-41) añade `viewerCookieHeader(null, secure)` a la respuesta de `POST /api/auth/sign-out` y a la de `POST /api/auth/delete-user` cuando responden con éxito. La caducidad de la sesión NO la borra: es exactamente el caso para el que existe.

| Petición | Sesión | `cs_viewer` que llega | `Viewer` | Qué hace con la cookie |
| --- | --- | --- | --- | --- |
| ruta con horizonte | sí | cualquiera o ninguna | `{ userId, readOnly: false }` | la firma de nuevo para ese usuario si no llega, no vale, es de otro o tiene más de un día; si no, nada |
| ruta con horizonte | no | válida | `{ userId, readOnly: true }` | nada |
| ruta con horizonte | no | inválida, caducada o ausente | `null` (horizonte `anon`) | nada |
| ruta `safe` | cualquiera | cualquiera | no se calcula | nada |
| `POST /api/auth/sign-out`, `POST /api/auth/delete-user` con éxito | sí | cualquiera | no se calcula | la borra |

### 10.9 La caché de la web

Hoy la caché de React Query no sabe de quién es: las claves del mundo no llevan usuario y valen 30 min (`STALE_TIME.world`, `apps/web/src/queryClient.ts` l. 17-26 y 29-47), y cerrar sesión no la limpia (`Account.tsx` l. 311-314 llama a `authClient.signOut()` y navega), así que la ficha que vio una cuenta la puede ver la siguiente en el mismo navegador (sup. X5; C13). Cinco reglas (D-35, I-32; el código de la web es §14.11):

1. **`Horizon.rev` va en la clave de toda consulta que dependa del horizonte**, como último elemento (`['news', rev]`, `['stage-replay', raceId, day, rev]`): así `setQueryDefaults` por prefijo, que es como `queryClient.ts` l. 88-90 fija el `staleTime` de cada familia, sigue valiendo. Con otro `rev` la clave es otra y la consulta se rehace sola; la entrada vieja se tira a los 60 min (`gcTime`, l. 75). Las claves de las rutas de etapa, de la ficha de carrera y de los feeds llevan además `diag` cuando la página pide `?diag=1` (11-h, 14-s): una respuesta del modo diagnóstico nunca sirve la vista normal ni al revés.
2. **`GET /api/me/horizon` tiene `staleTime` 0 y se pide al enfocar la ventana** (`refetchOnWindowFocus` solo para `['horizon']`; hoy está apagado para todo, l. 79). De ahí sale el `rev`: sin sesión y sin `cs_viewer`, la respuesta es 401 y el `rev` es `'anon'`.
3. **Revelar o llegar a meta** cambian el `rev`, y la web lo sabe en el acto. Revelar devuelve el `rev` nuevo (`{ rev }`, §14.2), que la web escribe en `['horizon']`. La meta es `POST …/broadcast/finish`, cuyo paquete no lleva `rev` (`BroadcastFinish`, §4.11), así que al recibirlo la web invalida `['horizon']`, que se pide otra vez y lo trae; el informe del borde, justo antes, devuelve `{ status: 'watching', rev }` con el `rev` de antes, porque el borde no es la meta (§14.11). Con el `rev` nuevo, todo lo que dependa del horizonte cambia de clave.
4. **`queryClient.clear()` al entrar y al salir de la cuenta**, en un único punto que vigila el id de usuario de `authClient.useSession()`: cubre el inicio de sesión (`Login.tsx` l. 19), la sesión que abre el enlace de verificación (`auth.ts` l. 148), el cierre (`Account.tsx` l. 311-314) y el borrado de cuenta. Solo cuenta un cambio del valor ya resuelto (un id a otro, un id a nada o nada a un id): al cargar la web, `useSession()` empieza pendiente (`isPending`, como lo usa `ProtectedRoute.tsx` l. 7-9), y el paso de pendiente al primer valor no es un cambio de cuenta; si lo fuera, `clear()` tiraría lo que la página ya había pedido (Rcoste-018). Y mientras `['horizon']` no ha respondido, `useHorizonRev()` devuelve `undefined` y las consultas de `HORIZON_KEYS` esperan (`enabled: rev !== undefined`): con un `rev` provisional cada consulta saldría dos veces, una con la clave provisional y otra con la buena, y cada una pagaría en el servidor su sesión, su horizonte y, en las rutas con R o M, su `veilDelta`. Esperar cuesta un viaje de ida y vuelta antes de esas consultas (unos 0,17 s con `Fast 4G`, §18.7).
5. **Cabeceras HTTP**: toda respuesta de una ruta con horizonte lleva `Cache-Control: private, no-store` y `Vary: Cookie`, para que ni el navegador ni un intermediario guarden una respuesta de una cuenta para otra; los tramos, `private, max-age=` `BROADCAST.chunkCacheMaxAgeS` (3.600 s), porque su contenido es inmutable y solo se sirve dentro de lo permitido (§14.9). El navegador solo reutiliza un tramo mientras la cabecera `Cookie` sea la misma, y por eso `cs_viewer` se renueva como mucho una vez al día (10-g).

### 10.10 El reparto bajo el velo

La cabecera de la retransmisión (`BroadcastHead.cast` y `.startState`, §4.11) sale del reparto congelado al correr la etapa (`TimelineCast`, §4.2; D-15), que lleva la general de salida, los maillots y las distinciones de tras la N−1, cada dato con su procedencia (`from`, un `StageRef`). Al servirla, todo dato cuyo `from` esté en el velo del espectador se degrada (I-11; B13 lo sella, §16.4):

```ts
// packages/db/src/horizon.ts (sigue)
import type { CastRider, Distinction, StageRef, TimelineCast, WornJersey } from '@cyclingstar/shared'

/** El reparto que puede ver `h`: ningún campo con procedencia velada viaja (D-15, B13). Pura. */
export function veilCast(cast: TimelineCast, h: Horizon): TimelineCast {
  if (h.veil.length === 0) return cast
  const seen = (r: StageRef | null): boolean => r === null || !isVeiled(h, r.raceKey, r.stageDay)
  const worn = (w: WornJersey): WornJersey =>
    (w.kind === 'leader' && !seen(w.from)) || (w.kind === 'champion' && !seen(w.title.source)) ? { kind: 'team' } : w
  const line = (d: Distinction): Distinction | null => {
    switch (d.kind) {
      case 'leads': case 'wears_for': case 'gc': return seen(d.from) ? d : null
      case 'champion': return seen(d.title.source) ? d : null
      case 'stage_wins': { const stages = d.stages.filter(seen); return stages.length > 0 ? { ...d, stages } : null }
    }
  }
  const riders = cast.riders.map((c): CastRider => ({
    ...c,
    worn: worn(c.worn),
    distinctions: c.distinctions.map(line).filter((d): d is Distinction => d !== null),
    start: seen(c.start.from) ? c.start : { gcRank: null, gcDeficitS: null, from: null },
  }))
  return { riders, teams: cast.teams, favourites: cast.favourites }   // los favoritos no llevan from: se copian tal cual (8-f)
}
```

La ruta de la cabecera construye `RiderCard` y `StartState` desde el reparto ya degradado: los líderes de salida son los que llevan puesto un `leader` que sobrevive, el `gcTop` sale de los `start.gcRank` que quedan, y la notoriedad (`notorietyOf`, §7.5) se calcula con lo que el espectador conoce. Si el `from` de un maillot está velado, NADIE lleva ese maillot en la pantalla de ese espectador: no se reasigna, porque la delegación se calculó con la clasificación entera y reasignarlo la delataría. `knownWins` no se degrada: cuenta victorias fuera del alcance de cualquier velo por construcción (D-26; la cuenta exacta la fija §7.5). `favourites` tampoco: no lleva `from`, porque son los atributos de antes de la etapa, y con la N−1 velada la cabecera no sirve la previa, por la puerta de D-37 (8-f). Los títulos de campeón siguen la misma regla con su `source` (D-37): el nacional que el espectador sigue y no ha visto no le pone a nadie un maillot de campeón mañana. En la práctica, una cabecera con una procedencia velada es la de la N+1 con la N sin conocer, y esa cabecera lleva además la puerta `previous_unseen` (D-37, §11.12): el reparto degradado es lo que ve quien elige `Give orders anyway` o mira la previa sin resolver la puerta.

La voz de los tramos lleva la identidad de cada corredor con el maillot que llevaba ese día (`chronicleRiderSchema.jersey`, `contracts.ts` l. 1251-1258, que hoy arma `chronicleNames` con los líderes de tras la N−1, `routes/races.ts` l. 506). No hace falta degradarla: un tramo solo se sirve si la etapa no tiene la puerta `previous_unseen` (§14.3), así que los maillots de la N−1 son conocidos para quien lo pide.

### 10.11 La retransmisión cortada por lo alcanzado

El servidor sirve la retransmisión por tramos de reloj de carrera `(fromDs, toDs]` de como mucho `BROADCAST.chunkRaceS` (900 s), con los datos cuya visibilidad cae en ese intervalo y es menor que el borde de la meta (`visibilityOf` y `chunkOf`, §4.6; D-06, I-10). Lo servido nunca pasa de lo alcanzado más `BROADCAST.prefetchRaceS` (900 s de carrera): si `toDs > (alcanzado + prefetchRaceS) · 10`, la respuesta es 409 `beyond_reached` (B18). Lo alcanzado es el máximo de la memoria del proceso (lo último informado, aunque no esté escrito, §10.3) y de `race_watch.reached_s`. El límite se aplica a un espectador con sesión y la etapa no conocida; con la etapa conocida no hay límite (ya sabe cómo acaba), y al visitante y al espectador en lectura (`cs_viewer`) solo se les aplica el tamaño del tramo y el borde de la meta, porque el servidor no guarda su progreso y el acta les está a un toque: el límite no protege a nadie de ellos, protege a la web de sus propios errores (D-28). La meta nunca va en un tramo: llegadas, resultado, acta y clasificaciones de después solo salen por `POST …/broadcast/finish` o tras revelar (I-15, O-25). Los tramos van por reloj de carrera y no por espacio porque un grupo a 5 min pasa por el final de un tramo de km 5 min después que la cabeza (`group.ts` l. 121-124): un tramo por km entregaría su futuro (O-20). La regla de admisión, entera:

```
admitirTramo(h, viewer, raceKey, N, fromDs, toDs, vis):             vis = visibilityOf de la línea (§4.6)
  si stageGateOf(h, raceKey, N) es previous_unseen:  403 previous_unseen                 la voz y el reparto destriparían la N−1
  si toDs ≤ fromDs o toDs − fromDs > BROADCAST.chunkRaceS · 10:  400 validacion
  toDs ← mín(toDs, vis.finishDs − 1)                                                     nada con visibilidad ≥ la meta
  si viewer tiene sesión y la etapa no es conocida:
      alcanzado ← máx(memoria del proceso, race_watch.reached_s si watching_stage = N, 0)
      si toDs > (alcanzado + BROADCAST.prefetchRaceS) · 10:  409 beyond_reached          B18
  servir chunkOf(tl, fromDs, toDs) con la voz de (fromDs, toDs] y atFinish ← toDs = vis.finishDs − 1
```

Las rutas, sus entradas y el orden en que la web las pide son §14.2 y §14.3.

### 10.12 La red y dos dispositivos

Tres reglas sin evidencia de los jueces (D-57; H-21, H-23), que vigilan los tests de pantalla de los pasos 9 y 10 (§16.6):

1. **Si un tramo falla** (red caída, 5xx), la reproducción se pausa con `Connection lost · Retry` (pantalla) y lo alcanzado es lo PINTADO, nunca lo descargado: la web solo informa de la hora que ha llegado a pintar, así que un fallo a mitad no da por vista ninguna etapa. `Retry` repite la petición del tramo; mientras, se puede ir hacia atrás dentro de lo ya pintado (§8.5). Un 429 no es un fallo: el reproductor espera lo que diga `retry-after` con `Loading` (pantalla) y repite, y las rutas del tramo y del progreso tienen su propio límite de peticiones, por usuario, sin gastar el global de 300 por minuto e IP (§14.5, 14-q).
2. **Con dos dispositivos gana el máximo.** Las escrituras de §10.3 guardan `greatest` de lo alcanzado y el prefijo más largo de lo conocido, dentro de una transacción que bloquea la fila. La segunda pestaña rehace el horizonte al enfocarse (`['horizon']`, §10.9): si el `rev` cambió, la cabecera y la ruta de etapa se piden otra vez (las dos llevan el `rev` en la clave) y, si la etapa ya se vio o se reveló en el otro dispositivo (`watch.seen` de la ruta de etapa, §14.1: `BroadcastHead.view` solo dice `known`, que también es cierto con `A`), dice `You finished this stage on another device · Watch anyway · Show report` (pantalla); si solo quedó arrastrada (`A`), sigue en `Watch`, como manda 6-r. Si los dos ven la misma etapa a la vez, cada uno sigue en su punto: el servidor solo guarda el mayor, que es el que reanuda la próxima vez.
3. **Una pestaña con la web de ayer** abierta durante un despliegue sigue funcionando: ve pestañas vacías en una etapa que no conoce y nunca un error (§14.1).

### 10.13 `SPOILER_MODE`

El interruptor del servidor (`off`, `admins`, `on`; §14.6), que no hay que confundir con el alcance del jugador (`users.spoiler_scope`), decide si se calcula el horizonte, alrededor de `computeHorizon` y no dentro, porque su firma (§21.6 F.2) no recibe el modo: lo aplica `request.horizon()`, en el registro de rutas (§14.5), y el cableado desde `env.ts` es §14.6.

| Modo | Horizonte de cada petición | Qué ve la web |
| --- | --- | --- |
| `off` (defecto hasta el paso 7) | `worldHorizon` para quien tiene sesión o `cs_viewer`, `anonHorizon()` para el visitante: velo vacío, `computeHorizon` no se llama | lo de hoy: la ruta de etapa devuelve su `StageReplay` entero sin `watch` (§14.1); `/api/me/horizon` responde con el `rev` `'world'` y listas vacías; las escrituras de `/api/me/*` siguen funcionando, porque lo visto es del jugador y tiene que estar ahí cuando el modo se encienda |
| `admins` (desde el paso 7) | `computeHorizon` solo si el espectador es administrador (`isUserAdmin`, `packages/db/src/adminUsers.ts` l. 53-61: `users.is_admin` o el correo de `ADMIN_EMAIL`); el resto, como `off` | el dueño vive el velo y los demás, el producto de hoy; para depurar una etapa que no conoce, el dueño abre la página con `?diag=1`, que la web reenvía a la ruta de etapa desde el 7b (§11.15, §14.11) |
| `on` (al cerrar el paso 10, con B1 en verde y la prueba de lectura aceptada; D-53) | `computeHorizon` para todos | el producto sin destripe |

Los `rev` de los tres casos no coinciden nunca (`'world'`, `'anon'`, `${currentDay}.${horizon_rev}`), así que cambiar el modo cambia las claves de la web y nada de lo cacheado con un modo se enseña con el otro. Un destripe o un horizonte lento en producción se apagan con `SPOILER_MODE=off` en Railway, sin desplegar (D-53); la retransmisión tiene su propio interruptor, `BROADCAST_WATCH` (§14.6).


### 10.14 Lo que B12 comprueba de esta sección

B12 es la aritmética del horizonte (§16.9); su código y su fixture son de §16.4. Estos son los casos que salen de esta sección, cada uno con lo que tiene que dar; corren en la suite rápida sobre PGlite con un mundo mínimo (una vuelta de siete etapas en guardia por `own_rider`, una de cabecera y una ajena):

| Caso | Montaje | Tiene que dar |
| --- | --- | --- |
| prefijo al revelar | `known_through` 2; `revealStage` de la 5 | `known_through` 5, `how` `+ 'AAR'`, `horizon_rev` + 1 |
| arrastre al ver | carrera fuera de guardia, `known_through` 0; primer progreso de la 5 | `known_through` 4 con `'AAAA'` y `follow` 1 antes de llegar a meta (10-a) |
| la puerta | carrera en guardia con la 3 velada; progreso de la 5 | 403 `previous_unseen` con `firstUnseen` 3; nada escrito |
| a medias sigue oculta | `watching_stage` 5, `reached_s` 3.000 | la 5 está en el velo y en `Horizon.watching` |
| lo servido no es visto | tramos pedidos hasta el borde de la meta con el progreso informado hasta `finishS − 1` y sin `POST …/finish` (desde el 7b, el tope de lo alcanzado da 409 a todo tramo más allá de lo informado más `prefetchRaceS`; el 7b re-sella el caso, §17.10) | `known_through` sin cambiar y la etapa en el velo |
| meta por modo | llegar a `finishS` con `play`, `summary`, `digest` y `seek` | `W`, `S`, `S` y `R` |
| caducidad | última etapa el día D; `currentDay` D + 55 y D + 56; la carrera a medio correr en D + 100 | velada, no velada; en curso nunca caduca |
| acuse | `revealStage` con `expired` sobre la última | `X` en todas las que faltaban; la carrera sale de `expiredSinceLastVisit` |
| fuentes y alcances | una carrera por cada `GuardReason`; `follow` −1 en una propia; alcances `guarded`, `own_only` y `off` | la guardia de §10.4 exacta; soltar gana a todo; `off` no guarda nada |
| temporada anterior | propia de la temporada pasada, acabada 40 días de juego antes | sigue en guardia |
| vuelta de prueba | el corredor en `test-tour` | nunca en guardia |
| la cookie que solo restringe | `cs_viewer` válida sin sesión | horizonte del jugador con `readOnly`; `POST /api/me/watch` y `GET /api/riders/me` dan 401 |
| cookies malas | manipulada, caducada, de un usuario borrado | `anon` |
| el memo | dos `computeHorizon` en el mismo minuto; luego un `revealStage` | la segunda solo hace la consulta 1; tras revelar, cambia `rev` y se recalcula |
| el memo con tope | un `TtlMemo` con el reloj inyectado: mil claves distintas en un minuto, dos días de juego y 61 s sin peticiones | nunca pasa de `SPOILER.horizonMemoEntries`; una entrada caducada se borra al leerla; un `set` a los 61 s de la última petición deja solo su entrada, porque barre todas las caducadas (10-m; sin peticiones nadie barre, y las entradas viejas, como mucho el tope, esperan al siguiente `set`) |
| el mapa del día | dos `computeHorizon` de espectadores distintos el mismo día; luego el tick sube `currentDay` | `lastRunStages` consulta una vez por día; el velo es el mismo, etapa a etapa, que con la cuarta consulta por espectador (18-a) |
| la cuenta del día (de §11.19, 11-s: B12 lo cuenta aparte de los otros veinte, en el 8b) | veinte peticiones a la vez el día nuevo | una sola cuenta del total del ranking y de `lastRunStages`; si la cuenta falla, la petición siguiente la repite (11-s) |
| `SPOILER_MODE` | los tres valores, con un administrador y con un jugador | la tabla de §10.13; tres `rev` distintos |
| dos dispositivos | dos `recordProgress` concurrentes de la misma etapa, contra el Postgres de servicio del CI y no en PGlite, que con un solo backend lo haría pasar sin el `for update` (`watchConcurrency.test.ts`, §16.4, 16-r) | `reached_s` es el mayor; `how` sin letras perdidas |
| retirada voluntaria | `retireFromRace` en el día de una etapa velada | el abandono no entra en `VeilDelta.abandons` (10-i) |
| el predicado | velo vacío; fila con `stage_day`; fila vieja con `stage_day` nulo | `false`; casa por `stage_day`; casa por `game_day` |

---

**Injertos aplicados.** I-10 (§10.2, lo alcanzado frente a lo servido; §10.11, el corte por visibilidad y por lo alcanzado), I-11 (§10.10, `veilCast`), I-28 (§10.2 estados y letras, prefijo y arrastre; §10.4 guardia y alcances; §10.5 caducidad de 56 días; §10.6 `VeilDelta` y los mecanismos P, R, F y M), I-31 (§10.8, `cs_viewer` entera), I-32 (§10.9; las cabeceras, en §14.9), I-33 (§10.7, el memo y `last_seen_at`), I-49 (§10.6, `Horizon` obligatorio, `veilSql` y la tabla de lecturas; el registro, en §14.5).

**Objeciones resueltas.** O-09 (§10.1 y §10.4: las ocho de cabecera se implementan por defecto y van a DD-01 con su cifra), O-17 (§10.7: `race_rosters_rider_idx`, memo de 60 s y B14 con p95 ≤ 5 ms), O-18 (§10.8 y §10.9: la cookie que solo restringe y la caché atada al horizonte), O-20 (§10.2 y §10.11: tramos por reloj de carrera; lo servido no cuenta como visto), O-26 (§10.5: 56 días de juego tras la última etapa, todas a la vez).

**Huecos rellenados.** H-10 (§10.7), H-11 (§10.3: `world_id` en la clave y el reinicio la borra), H-18 (§10.3: la carga, con la memoria del proceso y el umbral de 60 s, sin evidencia de los jueces; lo mide B14), H-21 (§10.12, regla 1), H-23 (§10.12, regla 2). Contradicciones de hecho que quedan resueltas: X-11 (§10.7) y X-16 (§10.8 y §10.9).

**Decisión tomada aquí.**
- 10-a. Ver la etapa N arrastra con `A` las anteriores no conocidas en el PRIMER progreso, no al llegar a meta: la ruta solo llama a `recordProgress` sin puerta `previous_unseen` (§14.2), así que esas etapas están fuera del velo (la carrera no estaba en guardia, o caducó) y el producto ya se las enseñaba. Es la regla de D-28 («ver o revelar la N revela 1..N−1 con A») con su momento fijado: si se esperara a la meta, seguir la carrera al empezar a verla (D-30) pondría en el velo las etapas 1 a N−1 mientras se ve la N, y la propia N pasaría a tener la puerta. Seguir A MANO no arrastra: `Follow without spoilers` (pantalla) protege desde ya las etapas corridas y no conocidas. Descartado: arrastrar al llegar a meta.
- 10-b. La oferta adaptativa (DD-16) cuenta en `localStorage` las carreras de cabecera caducadas con etapas veladas y marca `cs.adaptiveAsked` al ofrecerla: el esquema (§13.4) no tiene columna para recordarlo. Descartado: una columna nueva en `users` sin que §13 la tenga (queda en Dudas).
- 10-c. La obligación del tipo (D-32, punto 1) se cumple con la tabla de §10.6 y un test (`horizonReaders.test.ts`) que la hace ejecutable con el AST y el comprobador de tipos de TypeScript: funciones exportadas y métodos de objetos exportados, con sus ayudantes no exportados, y las fuentes de D-32 enteras, `stage_timelines` incluida (Rcodigo-049: el criterio de texto de `l6/lecturas.mjs` no veía ni los métodos ni esa tabla). Quedan fuera, en una lista escrita por su nombre y con su motivo, los orquestadores del tick, las funciones que calculan el horizonte (`computeHorizon`, `horizonSummary`, `lastRunStages`, `veilDelta`), las dos lecturas de E2 que corren en el tick (`cast.ts:buildTimelineCast`, `titles.ts:palmaresTitleSource.titlesOn`) y `draftRace` y `undraftRace`, que leen el presupuesto sin devolverlo; una entrada que ya no haga falta también falla. Así se cierra la duda 1.9 sin la lectura literal de D-32: esas dos del tick no leen para nadie, y la fuente de títulos que las sustituya entra en rojo. `readStageTimeline` y `timelineForStage` lo reciben (5-p). `Horizon` va segundo, detrás de `db`. Descartado: dar `Horizon` a las funciones que escriben el mundo, que no leen para nadie; y el criterio de texto.
- 10-d. `veilSql` gana un cuarto parámetro opcional, `stageDay`, y una segunda firma con `gameDay` nulo, para que el predicado ÚNICO use `stage_day` donde exista (D-32) y sirva a `stage_team_results`, que no tiene día de juego. Enlaza las listas con `sql.param`, medido. Descartado: un segundo predicado con otro nombre.
- 10-e. Conocida no es lo mismo que fuera del velo: `WatchState.known` es `true` solo con las letras `W`, `S`, `R` o `A`; una etapa caducada o fuera de guardia, o arrastrada, abre en `Watch` (pantalla), y `WatchState.seen` distingue la `A` de `W`, `S` y `R` (6-r, §6.10); la ruta de etapa no manda el resultado de una etapa que abre en `Watch` (§14.1). Es lo que piden a la vez D-30 («la etapa sigue abriendo en `Watch`, sin puerta»), D-31 y D-36.
- 10-f. La `X` de una carrera caducada se escribe cuando la web acusa el aviso con `POST /api/me/reveal` sobre su última etapa (`revealStage` con `expired`), no al leer: `GET` no cambia estado (D-51). `HorizonSummary.expiredSinceLastVisit` son las caducadas en guardia sin esa `X`.
- 10-g. `cs_viewer` tiene formato versionado (`v1`), no se cifra, se re-firma en una respuesta con horizonte a una petición con sesión solo si la que llega falta, no vale, es de otro usuario o tiene más de un día (`nowS − issuedAtS > 86.400`; la vida cuenta desde el último día de uso), y se borra en `sign-out` y `delete-user`. Re-firmarla en cada respuesta cambiaba la cabecera `Cookie` en cada petición, porque la firma lleva la hora de emisión, y con `Vary: Cookie` ningún tramo guardado casaba con la petición siguiente (Rcoste-014, §14.9). El HMAC lleva el prefijo `cs_viewer.` para separar este uso de `SESSION_SECRET` de los de better-auth.
- 10-h. Los `rev` de `worldHorizon` y del visitante son `'world'` y `'anon'`; el de un espectador, `${currentDay}.${horizon_rev}` (§4.10). Así un cambio de `SPOILER_MODE` cambia las claves de la web.
- 10-i. La retirada voluntaria del jugador (`abandoned_reason = 'voluntario'`) no se enmascara aunque caiga en el día de una etapa velada (`riderSchedule.ts` l. 283): es un acto suyo, no un resultado.
- 10-j. `stageGateOf` da `previous_unseen` si hay una etapa anterior velada aunque la propia también lo esté: es la que manda, porque la previa de la N destripa la N−1 (D-37). La cabecera solo usa `previous_unseen`; `not_seen` es para el acta y para `WatchState` (§14.1).
- 10-k. `users.last_seen_at` se escribe sin esperar a la respuesta, con la condición de la hora en el `where` y detrás de un memo del proceso, y la llamada lleva su `.catch`: en Node 22 un rechazo sin atender tumba el proceso (Rcodigo-019).
- 10-l. `recordProgress` no escribe más de una vez cada `BROADCAST.progressEveryRealS` (15 s de pared) por `(userId, raceKey)` salvo que cambie el estado, además del umbral de 60 s de D-55: con la curva de §8.2 el umbral solo no limita nada fuera del último km, y los informes previos a cada tramo en los modos rápidos (§8.5) escribirían hasta 80 veces por minuto. Descartado: escribir en cada informe que pase el umbral.
- 10-m. Los memos del proceso (el de `computeHorizon`, el de `veilDelta` y el de la sesión de `request.viewer()`) son un `TtlMemo`: la entrada caducada se borra al leerla, cada `set` barre desde el principio las caducadas y un tope, `SPOILER.horizonMemoEntries` (500, sin evidencia de los jueces), borra la más antigua. La memoria de lo alcanzado se borra al conocer la etapa y barre las entradas sin informe en 60 s, escribiendo antes lo que faltaba. Por qué: con solo `get` y `set`, cada clave vieja se quedaba hasta reiniciar, de 18 a 470 MB al día (Rcoste-011; medido, 9 y 35 KB por horizonte y 75 y 180 KB por `VeilDelta`). Descartado: el tope de 2.000 que proponía el refutador, que con 180 KB por `VeilDelta` son 351 MB en el peor caso; y vaciarlos al cambiar el día, que el barrido ya hace en un minuto.
- 10-n. `request.viewer()` memoriza en el proceso, por el valor de la cookie de sesión, el usuario que devuelve `getSession`: 60 s, solo los aciertos, en un `TtlMemo`. Por qué: cada informe y cada tramo leían la sesión y su usuario en la base (Rcoste-010). Descartado: `session.cookieCache` de better-auth, porque la llamada del servidor tira la cookie que lo renueva (better-call, `dist/endpoint.mjs` l. 38-52), cambiaría la cabecera `Cookie` en cada renovación contra `Vary: Cookie` (§14.9) y es configuración de la sesión de toda la aplicación (E4). Las dos caras están en §10.3.

**Propuesto para el glosario.**
- En `packages/db/src/watch.ts`: `LETTER_OF_MODE` (la letra de cada modo al llegar a meta), `WatchKey`, `WatchRow`, `ProgressResult` y `readWatch(db, k)` (la fila de una carrera). `WatchMode` (`'play' | 'seek' | 'summary' | 'digest'`, el modo con que se llega a un punto) vive en `packages/shared/src/broadcast/wire.ts` con su esquema (§14.2).
- En `packages/db/src/horizon.ts`: `anonHorizon()` (el horizonte del visitante), `stageGameDay(raceKey, stageDay)` (el día de juego de una etapa por el calendario), `stageGateOf(h, raceKey, stageDay)` (la puerta de una etapa), `horizonSummary(db, viewer, world)` (el `HorizonSummary` con las mismas consultas) y `veilCast(cast, h)` (el reparto degradado por el velo).
- En `packages/db/src/horizon.ts`: `touchLastSeen(db, userId)` (la escritura condicional de `users.last_seen_at`, §10.7, que llama `request.viewer()`, §14.5).
- El test `packages/db/src/horizonReaders.test.ts` (la tabla de §10.6 hecha regla) y el script de medida `l6/lecturas.mjs`.
- Textos de pantalla: `Only protect your own races?`, `Switch`, `Keep protecting` (la oferta adaptativa) y la clave `cs.adaptiveAsked` de `localStorage`.
- De la corrección: `TtlMemo<V>` y `lastRunStages` en `packages/db/src/horizon.ts` (10-m, 18-a); `SPOILER.horizonMemoEntries` (500, el tope de los memos del proceso); los scripts de medida `c-l6/lecturas-ast2.mjs`, `c-l6/veildelta-forma.mjs`, `c-l6/todas.mjs` y `c-l6/peticiones.mjs`.

**Dudas para el ensamblador.**
- D-32 (punto 1) pone `stage_timelines` entre las fuentes con `Horizon` obligatorio y §G.4 da firmas sin él a `readStageTimeline`, `timelineForStage`, `buildTimelineCast` y `palmaresTitleSource.titlesOn`. §5.6 (5-p) se lo da a `readStageTimeline` y §14.4 a `timelineForStage`; las dos del tick se quedan sin él con 10-c. Si la refutación prefiere la lectura literal también para ellas, cambian esas dos firmas y nada más.
- El esqueleto pide en §10.13 «qué hacen `off`, `admins` y `on` dentro de `computeHorizon`», pero la firma de §G.4 no recibe el modo: aquí actúan alrededor, en `request.horizon()` (§14.5).
- DD-16 necesita recordar si ya se ofreció `own_only`; §G.5 no tiene dónde. 10-b lo deja en `localStorage` (por navegador, aproximado). Si el dueño la quiere exacta y entre dispositivos, §13.4 tendría que añadir una columna a `users`.
- La duda de §15 sobre `knownWins` (una victoria de etapa de una vuelta puede contarse antes de los 56 días tras la ÚLTIMA etapa) afecta a §10.10, que no degrada `knownWins`: si §7.5 cambia la cuenta, esta sección no cambia.

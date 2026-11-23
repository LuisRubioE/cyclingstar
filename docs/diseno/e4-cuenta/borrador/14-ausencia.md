## 14. El modo ausencia y la regla del mes

Con cuatro días de juego por día real, una semana fuera son 28 días de juego, y hoy nada distingue al que está de vacaciones del que se fue: el tick entrena, corre y cobra igual (mapa 03 §7) y no hay forma de decir «vuelvo el 3» (`00-encargo.md` §2.3, punto 4). El dueño aceptó la frontera el 19 de noviembre: el jugador lo declara con una fecha de vuelta, mientras dura decide el entrenador, se callan los avisos y no corre la regla del mes; lo que el mundo haga con una ausencia larga es de E7 (D-00e; «Ok», `00-encargo.md` l. 317 a 318 y 349 a 351). El 23 fijó el máximo: «ok 28 días reales» (l. 377).

### 14.1 `Away` (pantalla, 360 px; DD-05 A)

`AccountAway`, en `/account/away`, enlazada desde la fila `Away` de `Account` (§12.1) y desde `Welcome back`. Estado sin ausencia, para un corredor con contrato y plan vivo:

```
‹ Account
Away
Going on holiday? Tell us when you'll be back.

[ 1 week | 2 weeks | 4 weeks ]                       (Segmented, AWAY_SHORTCUT_DAYS)
Back on   [Day] [Month] [Year]                       (DateField)

While you're away
· Your plan runs until 25 Nov. After that your coach picks Luca Bianchi's training.
· Luca Bianchi races when his team picks him, with automatic orders.
· Contract offers expire after about 5 days. You can still answer them if you drop by.
· Notifications stay quiet, except a changed password or a new sign-in.
· Emails to reset your password still arrive.

[ Set away until 3 Dec ]
```

Las líneas se calculan en el servidor, sin tocar el motor, con lo que hay ese día (D-52), y cada una tiene su fuente:

| Línea (pantalla)                                                                            | Cuándo                               | De dónde                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Your plan runs until 25 Nov. After that your coach picks <rider>'s training.`              | plan vivo                            | el plan vale 28 días de juego desde `start_day` (`train.ts` l. 135 a 138); el día real es hoy más los días de juego que faltan entre 4 (estimado: el reloj real depende de `TICK_INTERVAL_MINUTES`) |
| `Your coach picks <rider>'s training while you're away.`                                    | sin plan vivo, en cualquier modo     | `trainingDay.ts` l. 117 a 136, con el cambio de §14.2 para `manual`                                                                                                                                 |
| `<rider> races when his team picks him, with automatic orders.`                             | con contrato                         | `calendarRun.ts` l. 538 a 545; órdenes automáticas, `stageRun.ts` l. 413 a 443 (mapa 03 §7)                                                                                                         |
| `As a free agent, <rider> only races your national championship and the races you entered.` | agente libre                         | `calendarRun.ts` l. 705 a 735 y 257 a 261                                                                                                                                                           |
| `Contract offers expire after about 5 days. You can still answer them if you drop by.`      | agente libre o contrato que vence    | `OFFER_TTL_DAYS` 21 de juego, 5,25 reales (`contracts.ts` l. 37; X-20)                                                                                                                              |
| `Your team keeps its natural calendar. Nobody signs riders or changes plans for you.`       | mánager de un equipo                 | `teamPlan.ts` l. 65 a 79 (mapa 03 §7)                                                                                                                                                               |
| `Notifications stay quiet, except a changed password or a new sign-in.`                     | siempre                              | §13.1 y 13-a                                                                                                                                                                                        |
| `Emails to reset your password still arrive.`                                               | siempre                              | §9; los dos correos no son de juego                                                                                                                                                                 |
| `The 30-day rule is paused: your coach won't take over for being away.`                     | solo con la regla de E7 viva (PR 15) | §14.4                                                                                                                                                                                               |

La línea de jugador §9.1 («You won't be able to answer them while away») era falsa: entrar no termina la ausencia y se puede contestar una oferta (14-a). Elegir un atajo rellena `Back on` con hoy más 7, 14 o 28 días; tocar la fecha deselecciona el atajo. Errores (pantalla), en el `DateField`: `Pick a later date.` (menos de `AWAY_MIN_HOURS`, 12) y `Up to 28 days. For longer, come back once and set it again.` (más de `AWAY_MAX_DAYS`, 28). Los atajos son **[sin evidencia]**: 7, 14 y 28 los propuso la síntesis por la semana, la quincena y el máximo.

Con la ausencia viva, la página cambia:

```
‹ Account
Away
You're away until 3 Dec.
Notifications stay quiet until then, except a changed password or a new sign-in.
[ Change date ]   [ End now ]
```

`Change date` vuelve al formulario con la fecha puesta; un `PUT` con otra fecha la sustituye y el máximo se cuenta desde ahora. Quien quiera más de 28 días tiene que volver y declararla otra vez, como dice el error: esa visita es lo que el dueño llama «entrar» (§14.4).

**La API**: `PUT /api/me/away` con `{ until }` (instante ISO con su desfase; la web manda las 00:00 locales del día elegido, así que la ausencia acaba a medianoche del jugador) y `DELETE /api/me/away`. `GET /api/me/away` da `{ ok: true, awaySince, awayUntil }` para `Away` y `AwayBand` (14-b).

```ts
// apps/api/src/routes/me.ts
export const awayBodySchema = z.object({ until: z.string().datetime({ offset: true }) })
// PUT: 400 VALIDATION_ERROR; 400 fecha_fuera_de_rango con { min, max } si until < now + AWAY_MIN_HOURS
// o until > now + AWAY_MAX_DAYS; 200 { ok: true, awaySince, awayUntil }. Si no había ausencia viva,
// away_since = now(); si la había, away_since se queda. DELETE: away_until = now() (away_since se queda,
// para Welcome back); 200 { ok: true }. 403 BIRTH_DATE_REQUIRED sin fecha (D-09). Sin ausencia viva, DELETE da 200.
```

### 14.2 Lo que cambia y lo que no mientras dura

| Cambia                                                                                                                                                  | No cambia                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Ningún aviso salvo `away_over` y los tres de seguridad (§13.1, 13-a)                                                                                    | Los dos correos de cuenta                                                                                  |
| La regla del mes no corre: E7 lee `inactiveSince` (§14.4)                                                                                               | El tick: entrena, corre con órdenes automáticas, cobra, envejece (mapa 03 §7, medido con 28 días de juego) |
| En `training_mode = 'manual'`, el día sin orden ni bloque se resuelve como `mixto`: plan de equipo si lo hay y, si no, el entrenador (I-16; X-05; O-02) | Se puede entrar y jugar; **entrar no termina la ausencia**                                                 |
| `AwayBand` bajo la cabecera en toda pantalla con sesión                                                                                                 | La sesión: 30 días renovables bastan para 28 de ausencia; no se alarga (D-17; O-06)                        |

**El cambio de `manual`**, sin subir `ENGINE_VERSION` (91, `packages/engine/src/constants.ts` l. 853): hoy, en `manual`, el hueco es `descanso_activo` (`packages/shared/src/trainingDay.ts` l. 132 a 135), y «mientras dura decide el entrenador» no se cumpliría. `TrainingDayContext` gana `ownerAway: boolean`, y la primera línea de `resolveTrainingDay` (l. 94) usa `const mode = ctx.mode === 'manual' && ctx.ownerAway ? 'mixto' : ctx.mode` en lugar de `ctx.mode`. `trainingDayContext` (`packages/db/src/train.ts` l. 183 a 201) lo rellena con `isAway` del dueño del corredor, leído en el mismo lote que los corredores (una unión más con `users` por día de juego, estimado despreciable). Es una regla del mundo y no del motor: el motor no ve `training_mode` (14-c). `trainingDayAway.test.ts` lo fija: el mismo corredor en `manual`, sin orden, da `descanso_activo` sin ausencia y la sesión del entrenador con ella; en `mixto` y `entrenador`, lo mismo con y sin ausencia.

Entrar no la termina porque quien abre la web en la playa para ver una etapa no quiere que se le enciendan los avisos. No hay tope de entradas ni de días jugados durante la ausencia.

### 14.3 Volver

- **A la fecha**: `away_until` llega y la ausencia acaba sola; nadie escribe nada. El barrido manda `away_over` (§13.7) al primer paso fuera del silencio (a las 00:00 locales cae en él, así que sale a las 8). `Welcome back` espera en la portada (§14.5).
- **`End now`**: `DELETE /api/me/away`. Desde `AwayBand` o desde `Away`, sin confirmación: se deshace declarándola otra vez. Al terminar, `Notice` `good`: `Welcome back. Your notifications are on again.` (pantalla).
- **`AwayBand`** (`apps/web/src/components/AwayBand.tsx`, DD-05 A): un `Notice` `info` bajo la cabecera, en toda pantalla con sesión mientras `awayUntil > now`, con `You're away until 3 Dec` / `End now` (pantalla). Lo pinta `Layout` con `GET /api/me/away`, pedido una vez por carga con la sesión. No se cierra: es la única señal de que los avisos están callados.

### 14.4 `inactiveSince`, la visita y los relojes de E7

```ts
// packages/db/src/inactivity.ts
/** El contrato con E7: desde cuándo cuenta la inactividad. Nula si no hay ni visita ni ausencia. */
export function inactiveSince(lastSeenAt: Date | null, awayUntil: Date | null): Date | null {
  if (lastSeenAt === null) return awayUntil
  if (awayUntil === null) return lastSeenAt
  return lastSeenAt > awayUntil ? lastSeenAt : awayUntil
}
export function isAway(user: { awayUntil: Date | null }, now: Date): boolean {
  return user.awayUntil !== null && user.awayUntil > now
}
```

Con una ausencia viva, `inactiveSince` está en el futuro y ningún reloj corre; al volver, cuenta desde `away_until`: **la ausencia congela, no rellena** (D-54; I-19). `inactivity.test.ts` fija sus cuatro casos (las dos nulas, una de cada, las dos con cada orden). «Login» en la regla del dueño es una visita: toda petición con sesión que pasa por `get-session` escribe `last_seen_at` como mucho una vez por hora (D-40; §10.6). Vale para cualquier reloj de inactividad, también el más corto del mánager (`agenda.md` §4.15.5, punto 4; H-15); cuánto mide cada uno es de E7. `users.last_seen_at` existe desde la 0048 (`schema.ts` l. 121 a 125) y tiene historial desde que E2 entró en producción.

### 14.5 `Welcome back` y la regla del mes en la web

`WelcomeBack` es un `Notice` `info` que se cierra, en `Home`, encima de `While you were away` de E2, sin duplicarlo (D-55):

```
Welcome back                                                                     (pantalla)
You were away 12 days (48 game days). Luca Bianchi trained on 41 of them and raced 3 stages.
2 contract offers expired. 1 is still open: answer by 29 Nov.
[ See your rider ]                                                       [ × ]
```

- **Cuándo**: tras una ausencia declarada que ha terminado, o tras `RETURN_NOTICE_AFTER_DAYS` (7) días reales o más sin visita. El problema: la visita de hoy pisa `last_seen_at` antes de que la portada pregunte. Por eso `touchLastSeen` (`horizon.ts` l. 585) escribe en el mismo `UPDATE` la columna nueva `users.welcome_back_from` con el `last_seen_at` viejo si este tiene más de 7 días, y terminar una ausencia (a la fecha, leído por el barrido, o con `End now`) la pone a `away_since` (14-d). `GET /api/me/welcome-back` la lee y cuenta; cerrar el `Notice` llama a `DELETE /api/me/welcome-back`, que la pone a nula.
- **Las cifras** salen de `rider_daily_log.activity` y de `offers` con su estado `expirada` desde `welcome_back_from` (`riderDailyLog`, `schema.ts` l. 1245; `offers`, l. 1129, con el estado `expirada` de l. 1095); quién decidió cada día no se guarda, así que no se dice. Sin corredor, solo `You were away 12 days.` Sin ofertas, sin la segunda línea. Con una sola oferta abierta: `1 is still open: answer by 29 Nov.`; con varias, `3 are still open. The first expires on 29 Nov.`
- **La regla del mes en la web**, para quien no tiene avisos (el iPhone fuera de la pantalla de inicio, quien dijo que no; D-00c, punto 5 de §9.1.3): en `Away`, la línea de §14.1; en `Away` sin ausencia, también `If you don't visit for 30 days, your coach takes over <rider>. Set an away date to pause this.`; y en `Welcome back`, si la visita anterior fue hace `MONTH_RULE_HINT_AFTER_DAYS` (14) días o más, `Next time, set an away date: after 30 days without a visit your coach takes over.` (pantalla). Las tres, solo con la regla de E7 viva (PR 15), y la cifra de 30 la pone E7.

### 14.6 La frontera con E7 y E9, y el silencio total

**E4 da**: `users.away_since` y `away_until`, la pantalla, el silencio de los avisos, `manual` como `mixto` mientras dura, `inactiveSince` e `isAway`, `away_warning` y las frases de la regla. **E7 decide**: la regla del mes (el plazo, qué es «pasar a bot», el contrato, la silla del mánager, G8) y qué hace el mundo con una ausencia larga o encadenada (D-54). **E9 decide** si una ausencia se ve desde fuera, porque es quien enseña a las personas entre sí (O-07); E4 no la enseña a nadie más que al propio jugador.

**El silencio total, escrito para el dueño y para E7** (H-14): quien no aceptó los avisos (o tiene un iPhone en una pestaña) y no vuelve no recibe **nada** antes de que actúe la regla del mes, porque el aviso por correo de `agenda.md` §4.15.5, punto 3, ya no existe (D-00c). Lo que se le enseña está en la web y solo lo ve quien vuelve. Es la consecuencia directa de «No, como mucho notificadores de browser y app» (`00-encargo.md` l. 313 a 315), y E7 tiene que pesarla al fijar el plazo y qué pasa al que vuelve el día 31 (§21.4).

---

**Injertos aplicados.** I-16 (§14.2), I-19 (§14.4).

**Objeciones resueltas.** O-02 (§14.2: `manual` como `mixto` y la línea de §14.1 verdadera para todos), O-07 (§14.6: E9), O-23 (§14.1: 28 días, por el dueño).

**Huecos rellenados.** H-14 (§14.6), H-15 (§14.4).

**Contradicciones.** X-05 (§14.2), X-20 (§14.1).

**Decisiones de esta sección.**

- **14-a**, la línea de las ofertas dice que se pueden contestar entrando; la de la base decía lo contrario.
- **14-b**, nueva `GET /api/me/away` para `Away` y `AwayBand`.
- **14-c**, `ownerAway` en `TrainingDayContext`, rellenado en `train.ts`; el motor no cambia.
- **14-d**, columna nueva `users.welcome_back_from` (en la 0056, §15) y rutas `GET` y `DELETE /api/me/welcome-back`: sin ella la visita de hoy borra la de antes y `Welcome back` no sabe cuánto faltó el jugador.
- **14-e**, `PUT /api/me/away` con ausencia viva cambia la fecha, cuenta el máximo desde ahora y conserva `away_since`; `DELETE` conserva `away_since`.
- **14-f**, los avisos de seguridad salen durante la ausencia (13-a); la línea `Notifications stay quiet` lo dice.

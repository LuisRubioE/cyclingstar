## 16. Constantes

La única tabla entera de constantes del documento. Las compartidas por la API y la web viven en `packages/shared/src/account/constants.ts` y `notices.ts`; las de límites, en `apps/api/src/security.ts`; las de la purga, en `packages/db/src/purge.ts` (D-02). Cada una con su valor, su intención y la decisión que la fija. Medida o estimada: casi ninguna se ha medido, y la columna «Por qué» dice de dónde sale cada cifra.

### 16.1 La tabla

**Edad, condiciones y sesiones** (`packages/shared/src/account/constants.ts`)

| Constante                | Valor               | Por qué                                                                                   | Decisión   |
| ------------------------ | ------------------- | ----------------------------------------------------------------------------------------- | ---------- |
| `MIN_AGE_YEARS`          | 16                  | el dueño, «Ok» (`00-encargo.md` l. 309 a 310); a confirmar con un abogado                 | D-00a      |
| `MIN_BIRTH_YEAR`         | 1900                | una fecha anterior es un error de teclado                                                 | D-06       |
| `TERMS_VERSION`          | `'2026-11-draft'`   | volver a pedir la aceptación cuando cambie el texto                                       | D-10       |
| `SESSION_EXPIRES_S`      | 2.592.000 (30 días) | volver de dos semanas fuera sin teclear la contraseña; cabe la ausencia máxima de 28 días | D-17       |
| `SESSION_UPDATE_AGE_S`   | 86.400              | renovar una vez al día de uso, no en cada petición                                        | D-17       |
| `SESSION_MAX_AGE_DAYS`   | 90                  | una cookie robada no vive más de un trimestre aunque se use                               | D-17; I-11 |
| `EMAIL_JWT_TTL_S`        | 86.400              | el enlace de confirmar se lee mañana                                                      | D-11       |
| `RESET_TOKEN_TTL_S`      | 3.600               | la recuperación es corta; el token ya no pasa por logs ni por la URL                      | D-11       |
| `LEGACY_LINK_GRACE_DAYS` | 7                   | plazo para quitar el código de los enlaces viejos (5-f); el PR 19                         | D-12       |
| `RESEND_COOLDOWN_S`      | 60                  | la espera visible de `Send it again`                                                      | §5.3       |
| `EXPORTS_PER_DAY`        | 3                   | una exportación es una consulta grande; tres bastan a quien la quiere                     | D-39       |

**Límites** (`apps/api/src/security.ts`, salvo `MAIL_DAILY_BUDGET`, que es variable de entorno en `apps/api/src/env.ts`)

| Constante                      | Valor                        | Por qué                                                                                           | Decisión   |
| ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------- | ---------- |
| `ACCOUNT_FAILS` (L1)           | 10 en 900 s; cierre de 900 s | frena el relleno repartido entre IP (40 fallos y la buena entraba, mapa 01 §4.2); sin tope diario | D-24       |
| `DEVICE_FAILS` (L2)            | 10 en 900 s; 30 en 86.400 s  | el aparato conocido también tiene techo                                                           | D-24       |
| `SESSION_PASSWORD_FAILS` (L3)  | 5 en 900 s; 10 en 86.400 s   | con sesión robada no se prueba la contraseña a ciegas; al décimo se cierra la sesión              | D-24       |
| `MAIL_ROUTES_PER_IP_DAY` (L4)  | 20                           | las rutas que mandan correo, por IP                                                               | D-24       |
| `MAIL_PER_RECIPIENT_HOUR` (L5) | 3                            | un buzón ajeno no se inunda                                                                       | D-24       |
| `MAIL_DAILY_BUDGET` (L6)       | 90                           | el plan gratuito de Resend da 100 al día y 3.000 al mes; 90 × 31 = 2.790 (calculado; DD-10 B)     | D-26; 7-f  |
| `MAIL_RESET_RESERVE`           | 30                           | `verify_signup` para a los 60 del día; `reset_password` sigue hasta 90                            | D-26; 7-f  |
| `DEVICE_COOKIE_DAYS`           | 180                          | vida de `cs_device`; sobrevive a `Sign out`                                                       | D-23       |
| `DEVICE_COOKIE_MAX_ACCOUNTS`   | 5                            | cuentas por navegador; la sexta saca a la más vieja (7-e)                                         | D-23       |
| `NEW_SIGN_IN_EVERY_H`          | 1                            | el aviso `new_sign_in`, como mucho uno por hora y cuenta                                          | DD-16; 7-g |
| `AUTH_ALLOWED_PATHS`           | las once de §8.1             | lista blanca; `change-email` fuera                                                                | D-29; 8-a  |
| `CREDENTIAL_AUTH_PATHS`        | siete rutas                  | pierde `change-email` (§7.2)                                                                      | §7.2       |

**Correo y purga** (`apps/api/src/mailQueue.ts`; `packages/db/src/purge.ts`)

| Constante                    | Valor  | Por qué                                                                      | Decisión |
| ---------------------------- | ------ | ---------------------------------------------------------------------------- | -------- |
| `MAIL_SHUTDOWN_GRACE_MS`     | 10.000 | lo que `SIGTERM` espera a los correos y avisos en vuelo; **[sin evidencia]** | D-15     |
| `AUTH_LIMITS_RETENTION_DAYS` | 2      | ninguna ventana pasa de 24 h                                                 | D-34     |
| `EMAIL_LOG_RETENTION_DAYS`   | 90     | los rebotes se miran por semanas (§19.4)                                     | D-34     |
| `NOTICE_LOG_RETENTION_DAYS`  | 90     | ninguna `ref` de aviso vive más de 28 días                                   | 15-e     |
| `PURGE_UNCONFIRMED_DAYS`     | 7      | un registro con correo inventado no se queda                                 | DD-17 A  |

**Ausencia** (`packages/shared/src/account/constants.ts`)

| Constante                    | Valor         | Por qué                                                                     | Decisión |
| ---------------------------- | ------------- | --------------------------------------------------------------------------- | -------- |
| `AWAY_MAX_DAYS`              | 28            | el dueño, «ok 28 días reales» (`00-encargo.md` l. 377)                      | DD-12    |
| `AWAY_MIN_HOURS`             | 12            | menos no es una ausencia                                                    | D-52     |
| `AWAY_SHORTCUT_DAYS`         | `[7, 14, 28]` | una semana, dos y el máximo; **[sin evidencia]**                            | D-52     |
| `RETURN_NOTICE_AFTER_DAYS`   | 7             | `Welcome back` sin ausencia declarada: una semana real son 28 días de juego | D-55     |
| `MONTH_RULE_HINT_AFTER_DAYS` | 14            | la mitad del mes: quien tardó tanto lee la regla en `Welcome back`          | D-55     |

**Avisos** (`packages/shared/src/account/notices.ts`, salvo los de envío, en `apps/api/src/push/`)

| Constante                                     | Valor                                                                                                                              | Por qué                                                                                      | Decisión   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `AWAY_WARNING_DAYS`                           | `[20, 27]`                                                                                                                         | dos avisos antes de los 30 de E7                                                             | D-42       |
| `NOTICE_DAILY_CAP`                            | 3, solo los `capped` (sin `away_warning` ni los de seguridad)                                                                      | Chrome retira el permiso a webs con muchos avisos y poca visita (mapa 02 §5)                 | D-43       |
| `NOTICE_QUIET_START_H` / `NOTICE_QUIET_END_H` | 22 / 8 locales                                                                                                                     | nada de madrugada; **[sin evidencia]**, se le enseña al dueño (§21.4)                        | D-43       |
| `STAGE_DIGEST_HOUR`                           | 19 local                                                                                                                           | una vez al día, por la tarde                                                                 | D-43       |
| `STAGE_READY_EVERY_H`                         | 6                                                                                                                                  | una carrera seguida no suena en cada etapa (hasta cuatro al día, mapa 02 §10)                | 13.1       |
| `PLAN_ENDING_GAME_DAYS`                       | 4                                                                                                                                  | un día real antes del fin del plan                                                           | 13.1       |
| `NOTICE_ASK_SNOOZE_DAYS`                      | 30                                                                                                                                 | el `Notice` del permiso cerrado no vuelve en un mes                                          | D-44       |
| `NOTICE_DEFAULTS`                             | `stage_digest`, `plan_ending`, `offer_received`, `away_warning`, `away_over` encendidos                                            | DD-02 A, «Esos avisos son pushup notification? Si es así, ok» (`00-encargo.md` l. 370 a 371) | DD-02      |
| `PUSH_TARGETS_PER_USER`                       | 10                                                                                                                                 | como `MAX_DEVICES` de `twilightstruggle` (`push.ts` l. 54); el undécimo saca al más viejo    | D-46       |
| `PUSH_DEAD_AFTER_FAILS`                       | 3                                                                                                                                  | tres fallos seguidos que no son 404 ni 410                                                   | D-46       |
| `PUSH_SEND_TIMEOUT_MS`                        | 15.000                                                                                                                             | el de `twilightstruggle` (`push.ts` l. 165)                                                  | 13.6       |
| `PUSH_ALLOWED_HOSTS`                          | `googleapis.com`, `google.com`, `push.services.mozilla.com`, `notify.windows.com`, `push.apple.com`, como host o sufijo tras punto | la lista de `twilightstruggle` (`push.ts` l. 354 a 361); cierra la SSRF                      | D-46; 13-j |
| TTL por aviso                                 | 21.600 s `stage_ready`; 43.200 s el resto                                                                                          | un aviso de etapa viejo no sirve; `web-push` pone cuatro semanas por defecto (mapa 02 §8)    | D-43       |

### 16.2 Las que no cambian

- Fastify por IP: 300 por minuto en todo, 60 por minuto en el resto de `/api/auth/*` y 10 cada 5 minutos en las de credenciales (`apps/api/src/security.ts` l. 10, 36, 43 y 54 a 68).
- Contraseña de 8 a 128 caracteres (`better-auth` por defecto; los textos, 4-e).
- `SPOILER.lastSeenEveryMin` 60: `touchLastSeen` escribe como mucho una vez por hora (`horizon.ts` l. 585).
- `OFFER_TTL_DAYS` 21 (`contracts.ts` l. 37) y el plan vivo de 28 días de juego (`train.ts` l. 135 a 138): E4 los lee, no los cambia.
- `PLAN_END_WARN_DAYS` 7 de la portada (`apps/web/src/domain/dashboard.ts` l. 67), el gemelo de `plan_ending`.
- `ENGINE_VERSION` 91 (`packages/engine/src/constants.ts` l. 853).

**Las que desaparecen** frente a §G.6, por lo que decidió el dueño el 23 de noviembre: `HIBP_TIMEOUT_MS` (DD-11 C), `EMAIL_CHANGES_PER_DAY` y `UNDO_EMAIL_CHANGE_H` (sin cambio de correo de autoservicio, `00-encargo.md` l. 398 a 406), `SIGNUP_EXISTING_EVERY_H` y `CHANGE_TO_TAKEN_EVERY_H` (sin esos correos) y `MAIL_LOW_PRIORITY_CUTOFF` (sin correos de baja prioridad que cortar, 7-f). `MAIL_DAILY_BUDGET` pierde la cifra de 1.500 de Pro: volvería solo con DD-10 A.

---

**Injertos aplicados.** Ninguno asignado.

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.** Ninguna nueva: cada valor sale de la decisión de su fila, de L1 (`7-e`, `7-f`, `7-g`, `8-a`) o de §13 a §15.

**Propuesto para el glosario.**

- §G.6 sin las seis que desaparecen; con `STAGE_READY_EVERY_H`, `PLAN_ENDING_GAME_DAYS`, `PUSH_SEND_TIMEOUT_MS` y `NOTICE_LOG_RETENTION_DAYS`; `PUSH_ALLOWED_HOSTS` como en 13-j; `CREDENTIAL_AUTH_PATHS` con siete rutas.

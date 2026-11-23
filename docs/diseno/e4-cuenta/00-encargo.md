# E4 · La cuenta y el contacto: encargo compartido para todos los agentes

Este fichero es el brief que lee TODO agente que participe en el diseño de E4, sea cartógrafo,
proponente, juez, redactor, refutador, corrector o auditor. Léelo entero antes de hacer nada.

## 1. Qué se encarga

El encargo E4 está en `docs/encargos.md` (sección «E4 · La cuenta y el contacto», l. 308 a 337).
Léelo entero y literal, y también el principio del mismo fichero hasta E1 (l. 1 a 72): la regla de
arranque, el orden de los encargos y sus tres avisos, sobre todo el segundo, el del método. Su porqué
razonado está en `docs/agenda.md`: §3.2 (l. 138 a 158, el dominio de correo y un subdominio por
flujo), §3.7 (l. 225 a 269, la edad mínima de 16, con su aviso de confirmarla con un abogado), §4.3
(l. 311 a 318, notificaciones y modo ausencia), §4.9 (l. 418 a 424, legal y privacidad), §4.15.1
(l. 533 a 569, la app), §4.15.3 (l. 613 a 632, el que se va y no vuelve) y §4.15.5 (l. 647 a 692, la
regla del mes y la silla reservada). Y G11 en `docs/epics.md` (l. 597 a 654).

Resumen operativo, que NO sustituye a leer el original, y que ya descuenta lo que el §2 dice que
cambió:

1. **El ciclo entero de la identidad**: registro con **fecha de nacimiento** y edad mínima de 16,
   verificación del correo, recuperación de la contraseña, cambio de correo, cambio de contraseña,
   borrado de la cuenta, **sesiones** (ver las propias y cerrar las otras) y **límites de intento**.
   Buena parte ya existe (§2): aquí se revisa, se completa y se endurece, no se rehace.
2. **La seguridad de la cuenta**, que en E4 es la mitad del trabajo: secuestro de cuenta,
   enumeración de correos, límites de intento por IP y por cuenta, tokens y su caducidad, sesiones,
   el correo como vía de ataque, las dependencias con avisos abiertos (§3) y los datos de un menor.
3. **Las notificaciones**: qué se avisa, por dónde (**solo el aviso del navegador y, cuando exista,
   el de la app; ningún correo de juego**, §9.1), cuándo, con qué baja de un toque y con qué
   frecuencia máxima. La regla de E2 manda: **ningún aviso
   destripa** (`docs/retransmision.md` §11.9).
4. **El modo ausencia**: con cuatro días de juego por día real, un juego sin ausencia castiga tener
   vida. Cómo se declara, qué pasa mientras dura, cómo se vuelve, y su relación con la regla del mes
   (`agenda.md` §4.15.5) y con el resumen `While you were away` de E2, que ya existe.
5. **Dos decisiones de infraestructura del encargo**: separar el correo TRANSACCIONAL del de
   NOTIFICACIÓN en subdominios distintos, que **pierde urgencia porque no habrá correo de
   notificación** (§9.1) y se escribe para el día que lo haya, y **calentar** el dominio de envío
   antes del lanzamiento en lugar de estrenarlo con mil registros, que sigue en pie.
6. **El contacto**: por dónde se queja un jugador. **El dueño lo aparcó el 19 de noviembre (§9.1)**:
   se escribe como riesgo y como coste, no como pieza.
7. **Lo legal que toca a la cuenta** (`agenda.md` §4.9): acceso, exportación y borrado de los datos,
   la política de privacidad viva (`apps/web/src/pages/Privacy.tsx`) y los menores. Lo que necesite
   un abogado se marca como tal y no se dictamina.

**Fichero final:** `docs/cuenta.md`. **Tamaño esperado:** mediano, **y la mitad es ejecución**. Del
orden de 1.500 a 2.500 líneas (bastante menos que `docs/visual.md`, 3.973). Es el diseño ÚNICO que
se implementará después, por pasos: cada decisión tomada, cada flujo con sus estados y sus textos de
pantalla y de correo, cada constante con su valor y su porqué, cada migración, y un final con el
**plan de implementación por PR, con sus tests antes que su código**, como el §17 de
`docs/retransmision.md`, una **sección de decisiones del dueño** con su valor por defecto razonado y
lo que cambia si elige otra cosa, **los riesgos del despliegue** (sobre todo con usuarios que ya
existen) y **lo que se mide** después. El dueño suele aceptar los valores por defecto, así que tienen
que ser buenos. **Quien lo implemente será un agente que no tiene a quién preguntar**, y el texto se
escribe contando con eso.

**Aquí no se toca código de la app.** Nadie modifica ficheros fuera de `docs/diseno/e4-cuenta/` y
`docs/cuenta.md`. Se puede ejecutar código en el scratchpad para medir (copiar módulos, levantar la
API local, correr tests, hacer capturas), nunca editarlo en el repositorio.

## 2. Lo que ha cambiado desde que se escribió el encargo

El texto de E4 y el de G11 se escribieron antes de que hubiera correo, y hoy no es verdad buena parte
de lo que dicen. Comprobado el 19 de noviembre de 2026 sobre `2a29e6d` (`main`). **Diseña sobre esta
tabla y no sobre la letra del encargo**, y si encuentras otra afirmación que el código desmiente,
dilo con la línea. La lección de B2 en `docs/epics.md` vale aquí entera: un documento que declara un
estado falso es peor que no tener documento.

### 2.1 Lo que ya existe

| Lo que dice el encargo o G11                                                                                        | Lo que hay hoy                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `better-auth` corre «sin enviar un solo correo»                                                                     | Salen **tres correos de cuenta** por la API HTTP de Resend, sin SDK (`apps/api/src/mailer.ts`; plantillas en `apps/api/src/emails.ts` l. 66, 92 y 118). Remitente `no-reply@cyclingstar.app`, con SPF en `send.cyclingstar.app` y DKIM en `resend._domainkey` (`docs/ops.md`, «Correo transaccional (Resend)», l. 85 a 125). `send` nunca lanza: un fallo se registra con el buzón enmascarado |
| «Nadie verifica que el correo sea suyo»                                                                             | **Verificación obligatoria**: `requireEmailVerification: true`; el registro no abre sesión, manda el enlace, y abrirlo confirma y abre la sesión (`autoSignInAfterVerification`); quien entra sin confirmar recibe un 403 y un enlace nuevo, después de comprobar la contraseña (`sendOnSignIn`) (`apps/api/src/auth.ts` l. 113 a 149)                                                         |
| «Una contraseña perdida es una cuenta perdida»                                                                      | **Hay recuperación**: `sendResetPassword` (`auth.ts` l. 126 a 128), con sus pantallas `ForgotPassword` y `ResetPassword`                                                                                                                                                                                                                                                                       |
| «El cambio de correo se aplica a pelo»                                                                              | **Cambio de correo con aviso y aprobación desde la dirección vieja**, y verificación de la nueva antes de aplicarse (`changeEmail` con `sendChangeEmailConfirmation`, `auth.ts` l. 150 a 165). El destino de cada enlace lo fija el servidor (`withCallbackURL`, l. 33 a 41)                                                                                                                   |
| (no lo menciona)                                                                                                    | **Cambio de contraseña** en `Account`, que cierra las otras sesiones (`revokeOtherSessions: true`, `apps/web/src/pages/Account.tsx` l. 223)                                                                                                                                                                                                                                                    |
| (no lo menciona)                                                                                                    | **Borrar la cuenta**, que pide SIEMPRE la contraseña (gancho `before` de `auth.ts` l. 175 a 193); el corredor y el equipo pasan a la máquina antes (`releaseUserToWorld`, `packages/db/src/teamControl.ts` l. 200 a 208); `sessions`, `accounts` y `race_watch` caen en cascada (`packages/db/src/schema.ts` l. 143, 155 y 946)                                                                |
| (no lo menciona)                                                                                                    | Cookie de sesión explícita (`httpOnly`, `sameSite: lax`, `secure` en https), comprobación de origen encendida siempre y orígenes de confianza con su gemelo `www` (`auth.ts` l. 43 a 81 y 194 a 223)                                                                                                                                                                                           |
| Las pantallas de entrada y de la cuenta                                                                             | `Login`, `Register` (con su `CheckInbox`), `VerifyEmail`, `ForgotPassword`, `ResetPassword` y `Account` ya llevan el sistema visual de E3 (`docs/visual.md` §17.21). `Account` tiene hoy: aviso de correo sin confirmar, `Email`, `Password`, `Appearance` (el modo oscuro de E3), `Delete account`, el enlace al panel de administración y `Sign out`                                         |
| «Empezar a registrar la última visita» (`encargos.md` l. 772 a 775; `agenda.md` §4.15.3 y §4.15.5: «hoy no existe») | **Ya existe**: `users.last_seen_at` (migración 0048 de E2, `schema.ts` l. 121 a 125), escrita como mucho una vez por hora por `touchLastSeen`. Hay historial desde que E2 entró en producción                                                                                                                                                                                                  |
| (no lo menciona)                                                                                                    | **El primer correo de notificación ya está escrito y no se envía**: `stageReadyEmail` (`emails.ts` l. 153), con su test y el canario de destripe (`spoilerCanary.test.ts` l. 206). E2 dejó a E4 cuándo, a quién, con qué baja y por qué canal (DD-10 de `docs/retransmision.md`, l. 7232 y §19.2)                                                                                              |
| (no lo menciona)                                                                                                    | `users.locale` existe, con `'es'` por defecto (`schema.ts` l. 109), aunque toda la interfaz está en inglés                                                                                                                                                                                                                                                                                     |

### 2.2 Lo que está a medias: los límites de intento

Hay **dos capas** y ninguna mira la cuenta, solo la IP:

1. **`@fastify/rate-limit`** (`apps/api/src/app.ts` l. 204 a 218; cifras en
   `apps/api/src/security.ts`): global de 300 por minuto y por IP; 60 por minuto para el resto de
   `/api/auth/*`; y **10 cada 5 minutos por IP** para las ocho rutas de credenciales o que mandan
   correo (`CREDENTIAL_AUTH_PATHS`, l. 47 a 63; montadas en `apps/api/src/routes/authProxy.ts`).
   Almacén en memoria: se vacía en cada despliegue.
2. **El limitador propio de `better-auth`**, que nadie configura en `auth.ts`: está encendido solo si
   `NODE_ENV` es `production` (`better-auth/dist/context/create-context.mjs` l. 171), con 3 cada 10 s
   para `sign-in`, `sign-up`, `change-password` y `change-email`, y 3 cada 60 s para
   `request-password-reset` y `send-verification-email` (`api/rate-limiter/index.mjs` l. 370 a 384),
   por IP y en memoria. **No sé si Railway pone `NODE_ENV=production`**: hay que comprobarlo.

Falta un límite **por cuenta** (un ataque repartido entre muchas IP contra un solo correo no lo frena
nada), un almacén que sobreviva al despliegue, y decidir qué IP vale.

**La sospecha de `X-Forwarded-For`, comprobada a medias el 19 de noviembre.** Con `trustProxy: true`
(`app.ts` l. 160), Fastify toma como IP la primera de la cabecera. Se probó en producción solo con
`GET /api/auth/get-session` (lectura, 60 por minuto) mirando `x-ratelimit-remaining`: con un valor
falso distinto en cada petición, el contador **siguió bajando** el mismo cubo que las peticiones sin
cabecera (…52, 51 sin ella; 50, 49 con ella). Si el valor falso fuera la clave, cada petición habría
estrenado un cubo con 59. **Lectura: el proxy de Railway (`server: railway-hikari`) no deja pasar la
cabecera que manda el cliente**, y hoy el límite no se esquiva así. Dos reservas: la salida de este
contenedor usa varias IP, lo que mezcla varios cubos en la serie; y es una conducta de Railway que no
está escrita en nuestro código ni comprobada en su documentación. El diseño no debe depender de ella
sin un test o una comprobación al arrancar. Aparte, `better-auth` lee la IP de la misma cabecera para
su limitador y para `sessions.ip_address` (`@better-auth/core/dist/utils/ip.mjs` l. 168 a 216: sin
`trustedProxies`, solo acepta la cabecera si trae una sola IP).

### 2.3 Lo que no existe

1. **La fecha de nacimiento**: `users` no la tiene y `Register` no la pide. Tampoco hay casilla de
   aceptar condiciones ni condiciones de uso escritas.
2. **La gestión de sesiones**: no se ven las propias ni se cierran las otras (salvo de rebote, al
   cambiar la contraseña). `better-auth` trae `listSessions` y `revokeOtherSessions`, sin usar.
3. **Notificaciones de ningún tipo**: ni correo de juego enviado, ni preferencias, ni baja, ni aviso
   al teléfono.
4. **El modo ausencia**.
5. **La separación del correo transaccional y el de notificación** (hoy hay un solo remitente), y
   **el calentamiento** del dominio.
6. **Un canal de contacto**: ni correo, ni formulario, ni enlace en la web.
7. **Exportar los datos** propios.

### 2.4 Lo que el dueño decidió después del encargo

1. **No hay web instalable porque hará una app** (D-00p de `docs/visual.md`; `agenda.md` §4.15.1, el
   párrafo del 22 de octubre de 2026). El aviso al teléfono llega con la app; las notificaciones web
   de la PWA ya no son el camino.
2. **El dominio del juego ya es `cyclingstar.app`**: la discusión de G11 sobre `rubio.pt` y
   `hereistand.app` ya no aplica. Lo que sí sigue en pie de G11 es la separación por flujo, DKIM, SPF,
   DMARC empezando en `p=none`, el return path y una baja real.

### 2.5 Lo que el código o los documentos dicen y no cuadra

Para los mapas, que lo comprueben y lo amplíen:

1. `Privacy.tsx` dice `your IP address is not stored`, pero `better-auth` escribe la IP en
   `sessions.ip_address` (probable; el mapa 03 lo comprueba). Dice `Only a session cookie`, y existe
   también `cs_viewer` (E2, §10.8). Dice `Ask and your account and rider data will be removed`, y no
   hay a quién pedirlo, el borrado ya es de autoservicio y el corredor no se borra: pasa a la máquina.
2. `docs/ops.md`, «Tareas manuales pendientes», repite que la IP no se persiste.
3. `docs/encargos.md` l. 776 a 778 condiciona la captación de probadores a que «hoy no hay
   recuperación de contraseña (E4)». Ya la hay.

### 2.6 Lo relacionado y ya hecho en E2

El resumen `While you were away` de `Watch` (`docs/retransmision.md` §8.8 y §11.4) y la propiedad de
que ningún aviso destripe (§11.9, D-42: todo aviso se construye solo con `PreStageInfo` y la lista de
salida). El modo ausencia y los avisos **cuentan con ellos y no los duplican**.

## 3. La seguridad: las dependencias con avisos abiertos

La auditoría de dependencias de la noche (`.github/workflows/cobertura.yml`, el trabajo `audit`,
l. 182 a 192, `pnpm audit --audit-level=high`, informativo) marca esto, comprobado el 19 de noviembre
de 2026 con el `pnpm-lock.yaml` de `2a29e6d`:

1. **`better-auth` 1.6.25**: una crítica (`GHSA-965c-763c-88jm`) y dos altas, de OAuth, enlace mágico
   y acceso por dispositivo. Hoy no nos alcanzan porque la API solo usa correo y contraseña, pero E4
   **planea la subida a 1.7.7 o más**, con lo que cambia entre 1.6 y 1.7, y **cualquier diseño que
   añada OAuth, enlace mágico o código por correo lee antes esos avisos**.
2. **`fastify` 5.11.2**: cuatro altas que arregla la 5.12.2. Las dos más serias no aplican (no hay
   manejadores 404 anidados con autenticación propia ni esquemas `$async`); el mapa 01 lo comprueba.
3. **`zod` 4.4.3** (por debajo de 4.6.6) y **`fast-uri` 3.1.5 y 4.1.2** (por debajo de 3.1.7 y
   4.1.4), también en la API.

Las versiones son las del `pnpm-lock.yaml` (l. 1450, 1916, 1919, 1933 y 3132).

## 4. Qué leer del repositorio (mínimo del encargo, ampliado)

- **API**: `apps/api/src/auth.ts`, `mailer.ts`, `emails.ts`, `security.ts`, `app.ts`, `env.ts`,
  `index.ts`, `viewerCookie.ts`, `geoIp.ts`, `routes/authProxy.ts`, `routes/context.ts`,
  `routes/me.ts`, `routes/admin.ts`, y sus tests (`auth.test.ts`, `authFlow.test.ts`,
  `mailer.test.ts`, `emails.test.ts`, `env.test.ts`, `app.test.ts`, `adminPanel.test.ts`).
- **Datos**: `packages/db/src/schema.ts` (`users`, `sessions`, `accounts`, `verifications`,
  `race_watch` y toda tabla que apunte a `users`), `teamControl.ts` (`releaseUserToWorld`),
  `horizon.ts` (`touchLastSeen`), las migraciones que tocan esas tablas.
- **Web**: `apps/web/src/pages/Login.tsx`, `Register.tsx`, `VerifyEmail.tsx`, `ForgotPassword.tsx`,
  `ResetPassword.tsx`, `Account.tsx`, `Privacy.tsx`, `AdminPanel.tsx`, con sus tests;
  `apps/web/src/auth/client.ts` (el cliente de `better-auth`) y `apps/web/src/api/session.ts`; la navegación y el pie.
- **`better-auth`**: el paquete instalado (`node_modules/.pnpm/better-auth@1.6.25*` y
  `@better-auth/core@1.6.25*`), su limitador, su lectura de la IP, sus sesiones y sus tokens; y el
  registro de cambios hasta 1.7.7 o la última, con los tres avisos.
- **Documentos**: `docs/encargos.md` (E4 y el principio), `docs/agenda.md` (las secciones del §1),
  `docs/epics.md` (G11), `docs/ops.md` (correo, variables, despliegue, panel), `SPEC.md` (§7, §8 y
  §12), `docs/retransmision.md` en todo lo que nombra a E4 (27 apariciones; sobre todo §8.8, §10.7,
  §10.8, §11.4, §11.9 y §19.2), `docs/visual.md` en lo que nombra a E4 (8 apariciones),
  `docs/captacion.md`, `docs/navegacion.md`, y en `docs/balance.md` todo lo que ha dicho el dueño de
  la cuenta, el correo, la ausencia, los avisos y la app; `Claude.md` (convenciones).
- **Los mapas de `mapas/`**, en cuanto existan. Son la base de hechos: no repitas su lectura del
  código salvo para comprobar algo dudoso, y si el mapa se equivoca, dilo con la línea.

## 5. Las fronteras: lo que E4 roza y no es suyo

Si E4 los toca, se escribe la frontera y se sigue.

| Encargo                                | Lo que es de E4                                                                                                                                      | Lo que no                                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| E7 · la integridad y el gobierno       | el modo ausencia como acto del jugador, sus avisos, el aviso (por el navegador o la app, nunca por correo, §9.1) antes de que la regla del mes actúe | qué hace el mundo con el ausente (el entrenador al mando, el contrato, la silla del mánager, G8), la moderación |
| E8 · la economía                       | que la cuenta sepa si es premium (ya existe)                                                                                                         | vender el premium, la comisión de las tiendas                                                                   |
| E9 · el juego entre personas           | los avisos que nacen de la cuenta                                                                                                                    | el chat, la negociación y sus avisos propios                                                                    |
| E10 · el multiidioma                   | guardar lo que haga falta en el registro (`locale`, el país, `Accept-Language`)                                                                      | traducir la interfaz y los correos                                                                              |
| E2 · la retransmisión (y W5, en curso) | el aviso de etapa lista por el navegador y la app (`stageReadyEmail` no se envía, §9.1), cuándo y con qué baja                                       | el texto del aviso, `While you were away`, la pantalla `Watch`                                                  |
| La app                                 | el canal del teléfono como un destino más de los avisos, y lo que la cuenta necesite para recibirlo                                                  | construir la app                                                                                                |
| El motor                               | nada: `ENGINE_VERSION` sigue en 91                                                                                                                   | todo                                                                                                            |

## 6. El método (el de `docs/diseno/README.md`, ejecutado en `docs/diseno/e3-visual/`)

E4 es mediano y la mitad es ejecución, así que se escala, pero no se salta ninguna fase. **Los agentes
trabajan como mucho de dos en dos**, y son del mismo modelo que el orquestador.

| Fase                      | Quién                                        | Salida                                                                   |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| 0. Mapas                  | 5 cartógrafos                                | `mapas/01..05-*.md` (150 a 300 l. cada uno) y `capturas/`                |
| 1. Propuestas             | 3 proponentes independientes                 | `propuestas/<lente>.md` (400 a 600 l.)                                   |
| 2. Juicios                | 3 jueces con focos distintos                 | `juicios/<foco>.md` y `.json`, y el arquitecto `juicios/veredicto.json`  |
| 3. Síntesis               | 1 arquitecto y 2 redactores por lote         | `borrador/00-esqueleto.md`, glosario, decisiones, `borrador/NN-*.md`, v0 |
| 3b. Opciones              | 1 agente                                     | `opciones/index.html`                                                    |
| 4. Refutación             | 4 refutadores adversarios                    | `refutaciones/hallazgos-*.json`                                          |
| 5. Corrección             | 2 correctores, uno por lote                  | secciones corregidas y `refutaciones/correcciones-*.json`                |
| 6. Coherencia y auditoría | 1 pasada de coherencia, 2 auditores y cierre | `refutaciones/auditorias-*.json`, `resultado-final.json`, cabecera       |
| 7. Ensamblado             | el orquestador                               | `docs/cuenta.md`                                                         |

**Los cinco mapas**, para que cada agente sepa dónde está cada hecho:

1. `mapas/01-cuenta-y-seguridad.md` · **La cuenta en la API y en `better-auth`**: cada ruta de
   `/api/auth/*` que se usa y las que están montadas sin usar; los tokens (cuáles, cuánto duran, de
   un solo uso o no, dónde se guardan); la sesión (duración, renovación, cookie, `cs_viewer`); los
   límites de las dos capas con sus cifras, su clave y su almacén; la IP (`trustProxy`, la cabecera,
   lo que hace Railway, `NODE_ENV`), probado en local con la API levantada; la enumeración de correos
   ruta a ruta (respuesta y tiempo); y las dependencias con avisos: qué dice cada aviso, si nos
   alcanza y qué cambia al subir `better-auth` a 1.7 y `fastify` a 5.12.
2. `mapas/02-correo-y-avisos.md` · **El correo y los avisos**: `mailer.ts`, las cuatro plantillas,
   Resend (dominios, subdominios, webhooks de rebote y queja), el DNS real de `cyclingstar.app`
   consultado (SPF, DKIM, DMARC, MX, el `send.`), y cómo se calienta un dominio con el volumen de este
   juego. Y, porque el dueño quiere los avisos solo por el navegador y la app (§9.1), **el aviso del
   navegador hoy**: Web Push en Chrome, Firefox, Edge y Safari, en escritorio, Android e iPhone (con
   y sin pantalla de inicio), con fuentes y fecha; lo que exige (service worker, claves VAPID, permiso
   del usuario, HTTPS) y cómo choca o no con D-00p de `docs/visual.md`, con la CSP de `app.ts` y con
   el servidor de estáticos; la librería que lo enviaría y su mantenimiento; y lo que pide una app
   futura (FCM, APNs) para que el diseño de hoy no la estorbe.
3. `mapas/03-datos-y-ausencia.md` · **Los datos y lo que pasa cuando no entras**: `users`,
   `sessions`, `accounts`, `verifications` y todo lo que cuelga de un usuario; qué se borra, qué pasa
   a la máquina y qué queda al borrar; qué datos personales se guardan de verdad frente a lo que dice
   `Privacy.tsx`; `last_seen_at`; y qué hace hoy el mundo con un corredor o un equipo cuyo humano no
   entra en una semana (quién decide el entrenamiento, las convocatorias, las órdenes), que es el
   suelo del modo ausencia.
4. `mapas/04-documentos.md` · **El corpus**: lo que el dueño ha dicho de la cuenta, el correo, la
   edad, la ausencia, los avisos, la app y el contacto, con cita textual, fichero, línea y fecha
   (`[DUEÑO n]`); lo que dicen los documentos (`[DOC n]`); y las contradicciones entre documentos y
   entre documentos y código.
5. `mapas/05-pantallas.md` y `capturas/` · **Las pantallas de hoy**: capturas a 360 px (y alguna a
   1.280) de `Login`, `Register`, `CheckInbox`, `VerifyEmail` en sus pasos, `ForgotPassword`,
   `ResetPassword`, `Account` en sus estados, `Privacy` y el pie, sobre la API local con un mundo de
   PGlite; los textos de pantalla y de error tal cual; los recorridos completos (registro, recuperar,
   cambiar correo, borrar) con el correo capturado en local; y lo que se ve en cada error.

## 7. Reglas de escritura, para todos

1. **Castellano**, en el registro de `docs/visual.md` y `docs/retransmision.md`: preciso, sin
   relleno, sin marketing. **La interfaz y los correos que ve el jugador van en INGLÉS** (regla de
   `Claude.md`); se escriben enteros y se etiquetan («(pantalla)», «(correo)»).
2. **Toda afirmación sobre el código cita fichero y líneas.** Toda cifra dice si es **medida** (y
   cómo) o **estimada**. Si no lo sabes, escribe «no lo sé» o «no está en el código»; inventar es el
   peor fallo posible. Lo legal que pida un abogado se marca «a confirmar con un abogado» y no se
   dictamina.
3. **Nada de rayas ni guiones en medio de una frase** (ni «—» ni «–» ni « - »). Se usan comas,
   paréntesis, dos puntos o punto y seguido. Solo se admite un guion en un título del tipo
   «Título - Subtítulo». Si un texto literal del código lleva una raya, se cita en un bloque de código
   o se resume sin ella.
4. **Valores concretos, no adjetivos.** Un límite es una cifra con su ventana y su clave; un token,
   su longitud, su caducidad y si es de un solo uso; un flujo, sus estados enumerados con su texto;
   un correo, su asunto y su cuerpo enteros, en inglés.
5. Las reglas de `Claude.md` siguen valiendo: TypeScript estricto (prohibido `any`), Zod en los
   bordes, migraciones solo con drizzle-kit, `pnpm exec` y nunca `npx`. E4 no toca el motor.
6. Cuando cites al dueño, cita **textual** y di de dónde (fichero, línea y fecha o versión).
7. `prettier --check .` corre en el CI sobre todo `docs/`. No alinees tablas a mano: el orquestador
   pasa `prettier` antes de cada commit.
8. **Producción (https://www.cyclingstar.app), solo GET de lectura**: nada de registrarse, entrar ni
   provocar correos. Todo lo demás, en local.
9. **Nunca `playwright install`**: Chromium está en `/opt/pw-browsers`. Los temporales, en el
   scratchpad y nunca en `/tmp`; un `rm` con una ruta en variable, siempre con `"${S:?}/..."`.
10. **Informe final al orquestador: 12 líneas como máximo.** Qué fichero has escrito, cuántas líneas,
    las 3 a 5 cosas más importantes y lo que no has podido comprobar. El valor va en el fichero.
11. No edites ficheros de otros agentes salvo que tu rol lo diga. No hagas commits ni push: lo hace
    el orquestador.

## 8. El entorno de trabajo

El scratchpad es `/tmp/claude-0/-home-user-cyclingstar/11a80ddf-16bf-55f1-bc67-a820ed08d54f/scratchpad`.
Dentro, `repo/` es un clon de `2a29e6d` con las dependencias instaladas (`pnpm install
--frozen-lockfile`): úsalo para compilar, levantar la API o correr tests sin tocar el repositorio.
Cada agente trabaja en su propio subdirectorio (`<scratchpad>/<tu-rol>/`).

**Hay otra sesión trabajando a la vez** en el repositorio (la revisión de `Watch`, W5). Toca
`packages/shared/src/broadcast/`, `apps/web` (Watch), `docs/diseno/e3-visual/implementacion.md`,
`docs/visual.md`, `docs/balance.md` y el CI. Ningún agente de E4 los edita.

## 9. Lo que el dueño ha añadido durante el diseño

### 9.1 Las respuestas a la fase 0 (19 de noviembre de 2026)

El orquestador le hizo seis preguntas, cada una con su recomendación delante. Las preguntas, en
resumen, y su respuesta textual:

1. Edad mínima de 16, con la fecha de nacimiento en el registro, y a las cuentas que ya existen (hoy
   solo la suya) se les pide al entrar. Respuesta: «Ok».
2. Un buzón `support@cyclingstar.app` reenviado a su correo, con un enlace en el pie y en el login, y
   dónde tiene el DNS. Respuesta: «? De momento no lo pongas».
3. Avisos de juego por correo antes de la app, pocos y con baja de un toque (el de la regla del mes
   encendido; «etapa lista» y los resúmenes apagados). Respuesta: «No, como mucho notificadores de
   browser y app».
4. Con qué y cuándo hará la app. Respuesta: «Ni idea».
5. Un botón de ausencia con fecha de vuelta: mientras dura decide el entrenador, se callan los avisos
   y no corre la regla del mes; lo que el mundo hace con el ausente largo es de E7. Respuesta: «Ok».
6. Nada de entrar con Google o Apple por ahora. Respuesta: «Ok».

Lo que queda decidido, y que manda sobre el encargo y sobre cualquier otro texto del rastro:

1. **Edad mínima de 16**, declarada con la fecha de nacimiento en el registro; a las cuentas que ya
   existen se les pide al entrar. Sigue en pie el aviso de `agenda.md` §3.7: confirmarlo con un
   abogado antes de abrir el registro.
2. **Sin canal de contacto por ahora.** El encargo lo pedía y el dueño lo aparca. El documento no lo
   diseña como pieza que se implementa; escribe el hueco como riesgo (quien se quede fuera de su
   cuenta no tiene a dónde ir), lo que costaría el día que se quiera, y retira de la web las frases
   que prometen un canal que no existe (el `Ask and…` de `Privacy.tsx`).
3. **Ningún correo de juego**, tampoco el aviso de la regla del mes. El correo se queda en lo
   transaccional de la cuenta. Los avisos de juego van **solo por notificación del navegador y de la
   app**. Consecuencias que el diseño tiene que resolver y no dar por supuestas:
   - `stageReadyEmail` no se envía nunca como correo; lo que vale de ella es `stageReadyNotice`, el
     texto que no destripa, para el aviso del navegador y el de la app.
   - La separación del correo transaccional y el de notificación en dos subdominios ya no es urgente,
     porque no habrá correo de notificación. Se escribe qué haría falta si algún día lo hubiera. El
     calentamiento del dominio sigue valiendo para el transaccional.
   - El aviso del navegador (Web Push) necesita un service worker. D-00p de `docs/visual.md` quitó el
     service worker junto con la web instalable; uno que solo reciba avisos, sin caché ni
     instalación, es otra cosa, y el diseño lo tiene que decir con su frontera respecto a D-00p.
   - Por lo que sabe el orquestador, a comprobar en el mapa 02: en iPhone el aviso web solo llega a
     las webs añadidas a la pantalla de inicio, que ya no se ofrece; en Android y en el escritorio
     llega sin instalar nada. Hasta la app, un jugador de iPhone podría no recibir ningún aviso.
   - El aviso de la regla del mes (`agenda.md` §4.15.5, punto 3) solo llega a quien haya aceptado
     las notificaciones. Para el resto, lo que se le enseña al volver y antes de que pase nada tiene
     que estar en la propia web.
4. **La app no tiene tecnología ni fecha.** El teléfono se diseña como un canal más, que se enchufa
   cuando exista, sin suponer Expo, Capacitor ni ninguna otra.
5. **El modo ausencia, con la frontera propuesta**: lo declara el jugador con una fecha de vuelta;
   mientras dura decide el entrenador, se callan los avisos y no corre la regla del mes. Lo que el
   mundo haga con una ausencia larga es de E7.
6. **Solo correo y contraseña.** Nada de OAuth, enlace mágico ni código por correo en E4; los tres
   avisos de `better-auth` (§3) se leen para la subida de versión, no para añadir esos accesos.

### 9.2 Las respuestas a las decisiones de la síntesis (23 de noviembre de 2026)

El orquestador le planteó diez preguntas sobre las `DD-nn` de `borrador/00-decisiones.md`, con su
recomendación delante. Respuestas textuales y lo que deciden (mandan sobre `00-decisiones.md`):

1. TOTP del panel. «Ok. Mira como resolví eso en hereistand y en twikightstruggle.app y me gustaría
   que sea parecido». **Sin TOTP (DD-01 A)**, y el panel **como en twilightstruggle**
   (`/home/user/twilightstruggle`, clon de `LuisRubioE/twilightstruggle` en `cea2de5`; `hereistand` es
   `LuisRubioE/his`, clonado en `/home/user/his` en `a1fb340`, con el mismo modelo: papeles `admin` y
   `moderator` en `backend/app/auth.py` l. 180 a 195 y un registro de auditoría que leen los dos,
   `backend/app/routers/admin_log.py`; sin TOTP): administradores fijos por una lista del entorno que el
   panel no puede cambiar, ni su correo (`ai/src/pvp/roles.ts` l. 1 a 60; `ai/src/pvp/admin.ts`
   l. 213 a 217); nadie se quita su propio papel; cada edición de un administrador queda escrita con
   el valor viejo y el nuevo (`ai_user_edits`, `admin.ts` l. 233 a 235). El papel de moderador existe
   allí; aquí es de E7, y E4 solo deja el sitio.
2. Avisos de serie. «Esos avisos son pushup notification? Si es así, ok». **Los cinco de DD-02 A,
   solo por aviso push.**
3. Cuándo se pide el permiso. «ok». **DD-03 A.**
4. El iPhone. «si detecta que es un iPhone, que permita pero explique cómo hacerlo». **Se detecta el
   iPhone y se explica cómo añadir la web a la pantalla de inicio para recibir avisos**, como hace
   twilightstruggle (`ai/ui/src/online/push.ts` l. 48 a 54 y l. 230). Lo mínimo que esto pida a la web
   (y si choca con D-00p de `docs/visual.md`) lo escribe el diseño con su frontera.
5. Ausencia máxima. «ok 28 días reales». **28 días reales.**
6. Resend. «de momento nos quedamos en el gratis y abrimos registro por tandas pequeñas». **DD-10 B.**
7. El equipo de quien se borra. «dejamos el que puso, pero un admin o moderador podria modificarlo
   siempre (especialmente si es algo inapropiado)». **Se queda el nombre que puso (DD-14 B), y un
   administrador puede cambiarlo siempre** desde el panel, con su edición escrita (punto 1). El
   moderador, cuando E7 lo cree.
8. Contraseñas filtradas. «no entraría ahí... Si alguien quiere usar una pass comprometida aqui pues
   allá el». **Sin comprobación de contraseñas filtradas (DD-11 C).**
9. El resto por defecto. «ok pero cuando dices correo... Sin correo, solo notificación push».
   **Todas las demás `DD-nn` con su valor por defecto, y el aviso de entrada nueva (DD-16) por push,
   nunca por correo.** Pendiente de confirmar si esto alcanza también a los correos de seguridad de
   la cuenta (contraseña cambiada, correo cambiado).
10. El destino de DMARC. «no entiendo esta». **Pendiente**, se le vuelve a explicar.

**La referencia de twilightstruggle para los avisos**: `ai/src/pvp/push.ts` (459 l.: `web-push` con
VAPID, apagado sin claves, enviado tras el commit y en segundo plano, no a quien mira la pestaña, y la
lista de servicios de push permitidos `PUSH_HOSTS`, l. 356 a 373, que cierra la SSRF),
`ai/ui/src/online/push.ts` (373 l.) y `ai/ui/public/sw.js` (71 l.). El diseño de E4 parte de ella.

### 9.3 Las dos que quedaban (23 de noviembre de 2026)

1. El alcance del correo. «Solo correo para forgot password y para acabar el registro (igual que en
   el de Twilight Stuggle)». **El juego manda dos correos y ninguno más: recuperar la contraseña y
   confirmar el registro.** Ningún correo de seguridad (contraseña cambiada, entrada nueva), que van
   por push si el jugador lo tiene. Lectura del orquestador, con twilightstruggle delante: allí el
   jugador no cambia su correo, se lo cambia un administrador (`ai/ui/src/online/profile.ts` l. 4 y
   l. 55, «To change your name, email, phone or flag, ask an administrator.»). Así que **el cambio de
   correo de autoservicio se retira** (y con él sus dos correos, el aviso a la vieja y la verificación
   de la nueva): lo hace un administrador desde el panel, con su edición escrita, y el correo de
   `ADMIN_EMAIL` no se cambia allí. El dueño lo confirmó el mismo día: «si, esta bien asi».
2. DMARC. «No sabia que se podia hacer eso... pero ok, de momento lo dejamos». **Sin informes DMARC
   por ahora (DD-15 C).**

### 9.4 Sin arreglo urgente aparte (23 de noviembre de 2026)

El refutador de código y seguridad encontró dos fallos que ya están en producción
(`refutaciones/hallazgos-codigo-seguridad.json`, 001 y 002: el 200 del registro delata si el correo
existe, y una ruta con `..` salta el límite estricto de las credenciales, comprobado en producción con
GET). Preguntado si los arreglaba un PR urgente aparte, el dueño: «no, primero el plan de E4». **Los
dos entran en el plan de E4, en su primer PR de seguridad**, y el documento lo dice.

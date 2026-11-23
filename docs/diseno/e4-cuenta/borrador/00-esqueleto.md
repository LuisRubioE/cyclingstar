# Esqueleto de `docs/cuenta.md` (E4 · La cuenta y el contacto)

La ley de los redactores de la fase 3b. Dos redactores escriben a la vez, un lote cada uno, y no se contradicen porque leen juntos cuatro ficheros: el vocabulario ÚNICO (`borrador/00-glosario.md`, apartados `§G.n`), las decisiones cerradas (`borrador/00-decisiones.md`: D-00a a D-00f del dueño, D-01 a D-60 y DD-01 a DD-17), la consolidación de los juicios (`juicios/veredicto.json`: 29 injertos `I-nn`, 25 objeciones `O-nn`, 17 huecos `H-nn` y 23 contradicciones de hecho `X-nn`) y este esqueleto: el resumen (§A), el índice con lo que contiene cada sección (§B), los lotes (§C), la trazabilidad (§D) y lo que fija por su cuenta (§E).

**Base**: `propuestas/jugador.md`, por suma de puntuaciones porque no hubo mayoría (codigo eligió `incremental`, seguridad `atacante`, cobertura `jugador`): 86 frente a 85 de `atacante` y 81 de `incremental` (D-01; el cálculo, en `veredicto.json` → `ganadora`). **El margen es de un punto**: la base da la estructura y la voz, y los injertos de seguridad de `atacante` (I-01 a I-06) y las opciones medidas de `incremental` (I-07 a I-10) son obligatorios. Donde la base diga otra cosa, manda el injerto.

### Reglas de redacción comunes

1. Castellano en el registro de `docs/visual.md` y `docs/retransmision.md`: preciso, sin relleno ni marketing. Pantallas y correos en INGLÉS, enteros, entre comillas invertidas y marcados «(pantalla)» o «(correo)» la primera vez en cada subsección; los de §G.12 se usan tal cual.
2. Nada de rayas ni guiones en medio de una frase (`00-encargo.md` §7, regla 3): ni «—», ni «–», ni « - ». Comas, paréntesis, dos puntos o punto. Rangos sin espacios (`l. 132-135`) o «de 20 a 27». Un literal con raya va en bloque de código.
3. Toda afirmación sobre el código cita fichero y líneas contra `2a29e6d` (hasta `a781831` solo cambian documentos). Lo del paquete, `ba17/…` (`better-auth` 1.7.26) como en los mapas. Si no se sabe: «no lo sé» o «no está en el código».
4. Toda cifra dice si es **medida** (quién y con qué: «codigo C1», «mapa 01 §5») o **estimada**. No se rehacen medidas; entre dos cifras manda la de `veredicto.json` → `contradicciones`. Nada se mide de nuevo salvo lo que §B pida, en `<scratchpad>/redactor-L<n>/`. Nunca se edita nada fuera de `borrador/`. Producción, solo GET.
5. Nombres: solo los del glosario. Los alias de las propuestas (§G.15) solo en §22. Lo que falte, en «Propuesto para el glosario».
6. Las decisiones de `00-decisiones.md` se escriben como hechos, con su evidencia. Lo abierto se decide en «Decisiones de esta sección» (`N-a`…). Si un redactor ve que una decisión es falsa contra el código, la escribe como está y abre «Dudas para el ensamblador» con la evidencia.
7. Tipos en TypeScript estricto, sin `any`, Zod en los bordes. Cada tipo se escribe entero en UNA sección: `birthDateSchema` en §4; los cuerpos de `/api/account/*` y el JWT de la rama ocupada en §5; `DeviceRow` en §6; las filas de `auth_limits` y la firma de `reserveAttempt` en §7; `NoticeKind`, `NoticePayload`, `Deliverer` y el cuerpo de `POST /api/me/push-targets` en §13; la de `inactiveSince` y el cuerpo de `PUT /api/me/away` en §14; el esquema Drizzle en §15. Las demás los citan.
8. Constantes por nombre, con su valor la primera vez que salen en la sección; §16 es la única tabla entera.
9. `ENGINE_VERSION` 91 no sube; E4 no toca `packages/engine/` ni `packages/shared/src/broadcast/` (W5). Migraciones `0055` a `0059` con los nombres de §G.3.
10. Citas del dueño textuales, con fichero y línea (`00-encargo.md` l. 309 a 319). Lo legal: «a confirmar con un abogado», nunca dictaminado.
11. Quien implemente es un agente sin nadie a quien preguntar: cada flujo con todos sus estados, cada constante con valor, cada PR con sus tests antes que su código.

### Formato de cada fichero

- Primera línea `## N. Título`, con el título de §B; subsecciones `### N.m Título` en el orden de «Contiene».
- Longitud la de §B, con un 10 % de margen. Total del documento: de 1.500 a 2.000 líneas.
- Al final, tras `---`, los bloques de cierre: **Injertos aplicados** (`I-nn (§N.m)`), **Objeciones resueltas**, **Huecos rellenados**, **Decisiones de esta sección** (o «ninguna») y, si hace falta, **Propuesto para el glosario** y **Dudas para el ensamblador**. Todo id que §B asigna a la sección aparece en su bloque; si no se pudo aplicar, se dice por qué.
- Informe final de cada redactor: 10 líneas como máximo.

---

## A. Resumen ejecutivo provisional (para §0.4, en este orden)

Reescrito por el corrector el 23 de noviembre de 2026 con lo que decidió el dueño (`00-encargo.md` §9.1 a §9.5); manda sobre la versión anterior.

1. **El ciclo de la identidad ya existe; E4 lo cierra por los bordes.** Recuperar cierra todas las sesiones, los enlaces se guardan con hash y mueren cuando otro se usa, ninguna respuesta espera al correo y ninguna ruta abierta queda sin decidir: casi todo son opciones de `better-auth` 1.7.26 medidas.
2. **Cada acto termina con una frase verdadera, y el correo lleva dos enlaces y nada más.** Las pantallas que mienten se arreglan en el PR 1; el juego manda dos correos, confirmar el registro y recuperar la contraseña, y ninguno de juego ni de seguridad: la contraseña cambiada, la entrada nueva y el correo cambiado por un administrador van por push y se ven en la web.
3. **Un tercero nunca bloquea al dueño.** Límite por cuenta en Postgres con reserva previa y clave HMAC, que solo cierra a los navegadores sin `cs_device`; recuperar siempre da esa cookie.
4. **Un enlace de correo nunca cambia nada por sí solo.** Página de botón y token en el fragmento, que al pulsar viaja en el cuerpo de un `POST`. El jugador no cambia su correo: lo cambia un administrador desde el panel, sin correo, con aviso por push y escrito en `admin_audit`.
5. **El correo es escaso y es un blanco.** Plan gratuito de Resend y registro por aprobación, como en `twilightstruggle`: quien se registra espera y un administrador aprueba por tandas; topes por IP y por destinatario, un presupuesto diario con reserva para recuperar, y DMARC sin informes por ahora.
6. **16 años con fecha de nacimiento**, validada antes de mirar el correo; las cuentas de hoy la dan al entrar.
7. **La web dice todo; el aviso solo adelanta.** Avisos por el navegador con un service worker de tres oyentes sin caché, con SSRF cerrada, tope de 3 al día y silencio de noche; en iPhone, la web lo detecta y explica cómo añadirla a la pantalla de inicio, con un manifiesto mínimo sin iconos para que valga desde iOS 16.4, sin nada más de lo que quitó D-00p; la app, un canal más.
8. **Irse de vacaciones no castiga.** El modo ausencia dice qué se para con los datos de cada jugador, en `manual` decide el entrenador, calla los avisos y congela la inactividad para E7.
9. **Lo que la web dice de los datos es verdad**: `Privacy.tsx` nueva, la IP fuera de la base, logs sin tokens, borrado atómico y exportación con contraseña.
10. **Diecisiete PR, tests primero, unas 134 horas.** El PR 3, el primero de seguridad, cierra los dos agujeros que ya están en producción (el cuerpo del registro que delata la cuenta y la ruta con `..` que salta el límite), porque el dueño no quiso un PR urgente aparte. Nadie se aprueba antes del abogado; las diecisiete `DD` y las tres del final están contestadas por el dueño.

---

## B. El índice del documento

| §   | Título                                                     | Fichero                     | Líneas    | Lote |
| --- | ---------------------------------------------------------- | --------------------------- | --------- | ---- |
| §0  | Cabecera y resumen                                         | `borrador/00-cabecera.md`   | 50        | L0   |
| §1  | Lo que ya existe y lo que el encargo daba por hecho        | `borrador/01-inventario.md` | 60        | L1   |
| §2  | El modelo de amenazas                                      | `borrador/02-amenazas.md`   | 55        | L1   |
| §3  | Principios                                                 | `borrador/03-principios.md` | 30        | L1   |
| §4  | El registro y la edad                                      | `borrador/04-registro.md`   | 90        | L1   |
| §5  | Verificación, recuperación, cambio de correo y los correos | `borrador/05-enlaces.md`    | 170       | L1   |
| §6  | Las sesiones                                               | `borrador/06-sesiones.md`   | 60        | L1   |
| §7  | Los límites de intento                                     | `borrador/07-limites.md`    | 110       | L1   |
| §8  | Las rutas, las dependencias y el administrador             | `borrador/08-rutas.md`      | 65        | L1   |
| §9  | El correo transaccional                                    | `borrador/09-correo.md`     | 65        | L1   |
| §10 | Privacidad y datos                                         | `borrador/10-privacidad.md` | 110       | L1   |
| §11 | El contacto aparcado                                       | `borrador/11-contacto.md`   | 30        | L1   |
| §12 | Las pantallas de la cuenta                                 | `borrador/12-pantallas.md`  | 100       | L1   |
| §13 | Los avisos                                                 | `borrador/13-avisos.md`     | 150       | L2   |
| §14 | El modo ausencia y la regla del mes                        | `borrador/14-ausencia.md`   | 90        | L2   |
| §15 | Datos y migraciones                                        | `borrador/15-datos.md`      | 70        | L2   |
| §16 | Constantes                                                 | `borrador/16-constantes.md` | 55        | L2   |
| §17 | Tests                                                      | `borrador/17-tests.md`      | 80        | L2   |
| §18 | El plan por PR, tests primero                              | `borrador/18-plan.md`       | 200       | L2   |
| §19 | Riesgos del despliegue y lo que se mide                    | `borrador/19-riesgos.md`    | 50        | L2   |
| §20 | Fronteras y documentos que hay que corregir                | `borrador/20-fronteras.md`  | 70        | L2   |
| §21 | Decisiones del dueño                                       | `borrador/21-dueno.md`      | 90        | L2   |
| §22 | Apéndices                                                  | `borrador/22-apendices.md`  | 50        | L2   |
|     | **Total**                                                  |                             | **1.900** |      |

### §0 · Cabecera y resumen

`00-cabecera.md` · 50 · L0 (el orquestador, al cierre). **Contiene**: 0.1 el encargo, el estado y el árbol; 0.2 método y base, con la tabla de puntuaciones por juez y eje y el margen de un punto dicho (`veredicto.json` → `ganadora`); 0.3 cómo leer (medido frente a estimado, «(pantalla)», DD, I, O, H, X); 0.4 las diez ideas de §A; 0.5 mapa del documento; 0.6 procedencia en una línea. **Decisiones**: D-00a a D-00f, D-01.

### §1 · Lo que ya existe y lo que el encargo daba por hecho

`01-inventario.md` · 60 · L1. **Contiene**: 1.1 la tabla de `00-encargo.md` §2.1, actualizada con los mapas (tres correos, verificación obligatoria, recuperación, cambio de correo con aviso, borrado con contraseña, `last_seen_at`, `stageReadyEmail` sin enviar, `users.locale`); 1.2 lo que está a medias y lo que no existe (§2.2 y §2.3); 1.3 lo que los mapas añadieron, por gravedad y con su mapa: recuperar no cierra sesiones, dos enlaces vivos y en claro, enumeración por tiempo (cifras del mapa 01 §5), ningún límite por cuenta, `verify-password` y `update-user` abiertas, la IP y los tokens en logs y en `sessions`, `Privacy.tsx` con cuatro frases falsas, borrado no atómico, el 429 pintado como contraseña mala, los finales mudos, DKIM de 1.024 y DMARC sin `rua`, el plan de Resend, el iPhone sin avisos, el agente libre ausente parado; 1.4 lo que está bien y se queda (cookie, origen, `withCallbackURL`, `send` que nunca lanza, `cs_viewer`, el catálogo de E3). **Sale de**: `00-encargo.md` §2 y §3; mapas 01 a 05 (resúmenes); jugador §1. **Decisiones**: ninguna nueva.

### §2 · El modelo de amenazas

`02-amenazas.md` · 55 · L1. **Contiene**: 2.1 los diez atacantes (tabla de atacante §1.1: tiene, gana, hoy le basta); 2.2 por atacante, lo que lo para en este diseño y la sección; 2.3 lo que no se defiende y por qué (A4 sin segundo factor, A1 con la contraseña buena, el menor que miente, malware, Railway, Resend), con lo que lo mitiga; 2.4 lo que le queda al atacante con las cifras de D-24 (por ejemplo, L1 da 960 intentos al día por cuenta desde navegadores sin cookie: 10 cada 15 min, calculado). **Sale de**: atacante §1; seguridad §1 y §7. **Decisiones**: D-24.

### §3 · Principios

`03-principios.md` · 30 · L1. **Contiene**: 3.1 los once de D-03, cada uno con su consecuencia en una línea. **Injertos**: I-18. **Decisiones**: D-03.

### §4 · El registro y la edad

`04-registro.md` · 90 · L1. **Contiene**: 4.1 el formulario dibujado (360 px) con `DateField` y `Field` `reveal`; 4.2 la validación en el servidor y `birthDateSchema` entero; 4.3 qué se guarda (DD-09) y qué no; 4.4 quien no tiene 16 (pantalla, `cs.ageGate`); 4.5 las cuentas que ya existen (`/account/birth-date`, 403 `BIRTH_DATE_REQUIRED` con su lista de rutas y excepciones, el menor ya registrado); 4.6 condiciones y `/terms` (DD-13, su texto en borrador); 4.7 `name`, `image` y `locale`; 4.8 la tabla de errores con su texto. **Escribe entero**: `birthDateSchema`; los textos de §G.12 de registro. **Sale de**: jugador §3; incremental §3 y §1; atacante §3. **Decisiones**: D-00a, D-04 a D-10. **Injertos**: I-09, I-28. **Objeciones**: O-05. **Huecos**: H-12. **X**: X-09.

### §5 · Verificación, recuperación, cambio de correo y los correos

`05-enlaces.md` · 170 · L1. **Contiene**: 5.1 la tabla de tokens después (longitud, vida, un uso, al pedir otro, dónde se guarda; D-11); 5.2 la página de botón: rutas, texto entero de cada una, `replaceState`, el enlace viejo; 5.3 registrar y verificar (R1), con `CheckInbox` y `VerifyEmail` en todos sus estados; 5.4 recuperar (R2): `revokeSessionsOnPasswordReset`, `onPasswordReset`, `resetRequests` y `cs_device`, la pantalla final; 5.5 cambiar el correo (R4): contraseña, `ADMIN_EMAIL`, la rama ocupada con su JWT tipado, aplicar, deshacer (`UndoEmail`); 5.6 la enumeración por tiempo y `mailQueue` con el cierre ordenado; 5.7 los diez correos de §G.9 ENTEROS (asunto, texto plano, título y botón del HTML, pie) y la plantilla que se borra. **Escribe entero**: los correos; los cuerpos de `POST /api/account/undo-email-change` y `approve-email-change`. **Sale de**: jugador §4; atacante §4; incremental §4; mapa 05 §5, §6, §8 y §9. **Decisiones**: D-11 a D-16. **Injertos**: I-03, I-04, I-07, I-14, I-15. **Objeciones**: O-04, O-09, O-16, O-17, O-18. **Huecos**: H-02, H-06, H-08. **X**: X-03, X-06, X-08, X-11, X-15, X-21, X-23.

### §6 · Las sesiones

`06-sesiones.md` · 60 · L1. **Contiene**: 6.1 vida, renovación, techo y sin caché, con lo que pasa con las sesiones de hoy; 6.2 qué se guarda de cada sesión (sin IP) y la precondición del PR 3; 6.3 `get-session` sin token; 6.4 `GET /api/me/devices`, `DeviceRow` y `deviceLabel` (con sus doce agentes de prueba); 6.5 cerrar una y las otras (`device_epoch`, `push_targets`); 6.6 `cs_viewer`, sin cambio. La pantalla `Devices` se dibuja en §12. **Sale de**: jugador §5; atacante §5; incremental §5. **Decisiones**: D-17 a D-20. **Injertos**: I-07, I-11, I-24, I-25. **Objeciones**: O-06, O-10, O-20. **Huecos**: H-04. **X**: X-13, X-22.

### §7 · Los límites de intento

`07-limites.md` · 110 · L1. **Contiene**: 7.1 qué IP vale (`trustProxy`, `clientIp`, `xff_varias`, la trampa de `1`, las réplicas); 7.2 las tres capas (Fastify sin cambio, `better-auth` apagado, `auth_limits`); 7.3 `auth_limits`: claves HMAC, `reserveAttempt` y `clearAttempts` con su SQL, la purga; 7.4 la tabla L1 a L6 (regla, clave, cifra y ventana, qué cuenta, al pasarse) más `EMAIL_CHANGES_PER_DAY` y `EXPORTS_PER_DAY`; 7.5 `cs_device` (formato, emisión, `device_epoch`, L2) y cómo no se cierra la cuenta de otro, con la carrera medida (seguridad C4 y C5); 7.6 el presupuesto y sus prioridades; 7.7 contraseñas filtradas (`hashPasswordWithHibp`); 7.8 lo que ve quien choca (remite a la tabla de §12.3). **Sale de**: atacante §6; incremental §6 y §7; jugador §6; codigo C1 a C3; seguridad §6. **Decisiones**: D-21 a D-27. **Injertos**: I-03, I-07, I-08, I-12, I-13, I-23. **Objeciones**: O-04, O-13, O-14, O-15, O-16. **Huecos**: H-01, H-03, H-05. **X**: X-01, X-02, X-06, X-07, X-10, X-23.

### §8 · Las rutas, las dependencias y el administrador

`08-rutas.md` · 65 · L1. **Contiene**: 8.1 la lista blanca (las doce, con lo que hace cada una), `disabledPaths` como complemento y `authRoutes.test.ts`; 8.2 lo que se cierra y por qué (las 31 del mapa 01 §1); 8.3 las subidas y la regla de los plugins; 8.4 `logger` de `better-auth`; 8.5 el panel raíz: correo fijo, `admin_audit` (columnas y qué se apunta), lo que el panel enseña; 8.6 el TOTP: por qué es DD-01, qué haría B (rutas, 0059, pantalla) y por qué no choca con §9.1.6 solo sin `sendOTP`. **Sale de**: atacante §7; incremental §7; jugador §7; mapa 01 §1 y §8; cobertura C8. **Decisiones**: D-00f, D-28 a D-31. **Injertos**: I-05, I-06, I-07. **Objeciones**: O-01, O-21. **Huecos**: H-10. **X**: X-14, X-16.

### §9 · El correo transaccional

`09-correo.md` · 65 · L1. **Contiene**: 9.1 el DNS de hoy y el cambio (DMARC con `rua`, DKIM, CAA, `docs/ops.md`); 9.2 `email_log` y el webhook de Resend (eventos, firma, cuerpo crudo, ruta fuera del proxy); 9.3 la supresión y lo que ve el jugador (`email_undeliverable_at`); 9.4 el plan, el presupuesto y el calentamiento por tandas; 9.5 la purga (DD-17) y los rebotes por registros inventados; 9.6 lo que haría falta si hubiera correo de notificación (D-35). **Sale de**: jugador §10; atacante §10; incremental §10; mapa 02 §1 a §4. **Decisiones**: D-00c, D-32 a D-35. **Injertos**: I-13, I-26, I-27. **Objeciones**: O-04. **Huecos**: H-07.

### §10 · Privacidad y datos

`10-privacidad.md` · 110 · L1. **Contiene**: 10.1 el texto ENTERO de `Privacy.tsx` (pantalla) con `<N>`; 10.2 de dónde sale cada frase (fichero, línea o decisión) y qué PR la hace verdad; 10.3 los logs y `redactUrl`; 10.4 borrar: `deleteAccount`, qué queda tras borrar (mapa 03 §3); 10.5 exportar: el JSON, sus campos y lo que no lleva; 10.6 `last_seen_at` en toda visita. **Sale de**: jugador §11; atacante §11; incremental §11; mapa 03 §3 a §6. **Decisiones**: D-36 a D-40. **Injertos**: I-10, I-19, I-22. **Objeciones**: O-05, O-24, O-25. **X**: X-19.

### §11 · El contacto aparcado

`11-contacto.md` · 30 · L1. **Contiene**: 11.1 el riesgo (buzón perdido, rectificación, menor, supresión, el grupo de WhatsApp); 11.2 lo que se quita y la búsqueda de otras promesas; 11.3 lo que costaría el día que se quiera. **Decisiones**: D-00b, D-41. **Injertos**: I-20. **Huecos**: H-11, H-13.

### §12 · Las pantallas de la cuenta

`12-pantallas.md` · 100 · L1. **Contiene**: 12.1 `Account` como lista (DD-07 A) dibujada a 360 con sus filas y sus valores, y la alternativa B en dos líneas; 12.2 cada subpágina dibujada en texto con sus estados: `Email`, `Password`, `Devices`, `Your data`, `Delete account`, `Spoiler protection` y `Appearance` (las de `Notifications` y `Away` las dibujan §13 y §14); 12.3 `authErrorText`: la tabla de casos y textos; 12.4 `Login` y los finales con `Notice`; 12.5 `DateField` y `Field` `reveal` en `/_ui`; 12.6 el teclado (la captura 55) y la prueba del teléfono. **Sale de**: jugador §5 y §6.1; mapa 05 §4, §7 y §10. **Decisiones**: D-25, D-56. **Objeciones**: O-06, O-22.

### §13 · Los avisos

`13-avisos.md` · 150 · L2. **Contiene**: 13.1 el catálogo de §G.10 (disparador, texto del aviso en inglés, tope, TTL, `tag`, de serie según DD-02, gemelo en la web) y `NoticeKind`, `NoticePayload`; 13.2 topes, silencio y `time_zone`; 13.3 el permiso (DD-03) y la baja de un toque; 13.4 `Notifications` dibujada, con sus estados (sin soporte, iPhone según DD-04, sin decidir, bloqueado, encendido) y el aparato compartido; 13.5 `sw.js` y la frontera con D-00p; 13.6 el envío: `web-push`, VAPID, `isAllowedPushEndpoint`, suscripciones muertas; 13.7 el emisor y `notice_log`; 13.8 ningún aviso destripa; 13.9 el contrato para la app (`Deliverer`, el cuerpo de `POST /api/me/push-targets`). **Sale de**: jugador §8; atacante §8; incremental §8; mapa 02 §5 a §10; codigo C11; seguridad C2. **Decisiones**: D-00c, D-00d, D-42 a D-51. **Injertos**: I-01, I-02, I-18, I-21, I-25, I-29. **Objeciones**: O-05, O-06, O-08, O-11, O-12, O-19. **Huecos**: H-09, H-16. **X**: X-04, X-12, X-18.

### §14 · El modo ausencia y la regla del mes

`14-ausencia.md` · 90 · L2. **Contiene**: 14.1 `Away` dibujada (DD-05 A) con sus líneas calculadas y de dónde sale cada una; 14.2 la tabla de lo que cambia y lo que no mientras dura, con el suelo del mapa 03 §7 y `manual` a `mixto`; 14.3 volver (a la fecha, `End now`, `away_over`) y `AwayBand`; 14.4 `inactiveSince`, la visita como «login» y el reloj del mánager; 14.5 `Welcome back` dibujada y la regla del mes en la web; 14.6 la frontera con E7 y E9 y el silencio total escrito para el dueño. **Sale de**: jugador §9; atacante §9; incremental §9; mapa 03 §7; cobertura C2 y C3. **Decisiones**: D-00e, D-52 a D-55. **Injertos**: I-16, I-19. **Objeciones**: O-02, O-07, O-23. **Huecos**: H-14, H-15. **X**: X-05, X-20.

### §15 · Datos y migraciones

`15-datos.md` · 70 · L2. **Contiene**: 15.1 el esquema Drizzle de cada tabla y columna de §G.2; 15.2 las cinco migraciones de §G.3 con su SQL principal, su valor para las filas de hoy y su índice; 15.3 lo que no lleva migración; 15.4 la purga diaria; 15.5 los ficheros que registran cuentas y se re-sellan (mapa 03 §8). **Decisiones**: D-57. **Injertos**: I-27.

### §16 · Constantes

`16-constantes.md` · 55 · L2. **Contiene**: 16.1 la tabla entera de §G.6 con valor, intención y fichero; 16.2 las que no cambian. **Decisiones**: las que fijan cada valor.

### §17 · Tests

`17-tests.md` · 80 · L2. **Contiene**: 17.1 los nuevos de §G.13, cada uno con lo que fija (los de seguridad con su cifra: la ráfaga de 40, la carrera tras recuperar, la enumeración con un `Mailer` de 250 ms y 30 ms de umbral, los 404 de la lista blanca, la SSRF con `http://localhost`, `postgres.railway.internal:5432` y una IP); 17.2 los que se re-sellan, con línea (jugador §15, incremental §15); 17.3 la prueba del teléfono con las páginas nuevas. **Decisiones**: ninguna nueva.

### §18 · El plan por PR, tests primero

`18-plan.md` · 200 · L2. **Contiene**: 18.1 reglas del plan (el modelo es `docs/retransmision.md` §17); 18.2 la tabla: PR, qué entra, tests primero (fichero), depende de, migración, coste (horas, estimado), lo que ve el dueño y su marcha atrás; 18.3 una subsección por PR de §G.14 (el 3 con su precondición; el 9 con la condición de abrir el registro; el 15 tras E7; el 16 con la lista de D-59; el 18 solo con DD-01 B); 18.4 el grafo de dependencias y lo que ve el dueño primero. **Sale de**: jugador §16; incremental §16; atacante §16; codigo O-12. **Decisiones**: D-58. **Injertos**: I-17. **Objeciones**: O-03, O-22. **Huecos**: H-04.

### §19 · Riesgos del despliegue y lo que se mide

`19-riesgos.md` · 50 · L2. **Contiene**: 19.1 riesgos con los usuarios de hoy, por PR (la cuenta del dueño, los enlaces en vuelo, las sesiones al recuperar, la puerta de la fecha); 19.2 el despliegue (límites en memoria, réplicas, correos en vuelo, el tope de Resend, Railway y su cabecera); 19.3 la prueba del dueño (iPhone con iOS 26, Safe Links, registro y recuperación en su teléfono); 19.4 la tabla de D-60. **Decisiones**: D-60. **Huecos**: H-02, H-03, H-07, H-08, H-09.

### §20 · Fronteras y documentos que hay que corregir

`20-fronteras.md` · 70 · L2. **Contiene**: 20.1 la tabla de fronteras con E2, E7, E8, E9, E10, W5, la app y el motor; 20.2 la lista de D-59 con el texto que SUSTITUYE a cada frase (entero, en castellano); 20.3 lo que se le pasa a W5 por escrito (`pageTitle.ts` l. 5, `visual.md` l. 3623 y 3656). **Decisiones**: D-59. **Injertos**: I-17. **Objeciones**: O-03, O-07. **Huecos**: H-16. **X**: X-17.

### §21 · Decisiones del dueño

`21-dueno.md` · 90 · L2. **Contiene**: 21.1 las ocho de `opciones/index.html` (DD-01 a DD-08), cada una con su defecto razonado, sus alternativas, lo que cambia y antes de qué PR; 21.2 las nueve restantes (DD-09 a DD-17), igual; 21.3 la lista única para el abogado (H-17); 21.4 lo que la síntesis decidió y el dueño puede querer cambiar (el silencio de 22 a 8, la sesión de 30 y 90 días, los 24 h de los enlaces) y la consecuencia de §9.1.3 para E7 (H-14). **Injertos**: I-21. **Objeciones**: O-06. **Huecos**: H-11, H-14, H-17.

### §22 · Apéndices

`22-apendices.md` · 50 · L2. **Contiene**: 22.1 injertos y dónde cayeron; 22.2 objeciones y lo desestimado (el tope diario de registros, el limitador de `better-auth` con `storage: 'database'`, `cookieCache`, anular al pedir, el año de nacimiento, los 45 días, la puerta en `localStorage`, `cs_viewer` como aparato); 22.3 la cobertura del encargo (§D.5); 22.4 los alias (§G.15). El ensamblador completa 22.1 con lo aplicado.

---

## C. Los lotes

| Lote      | Secciones    | Líneas    | Depende de                                                                                                    | Lee además (si ya está) | Ola    |
| --------- | ------------ | --------- | ------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| L1        | §1 a §12     | 945       | ninguno: glosario y decisiones son el contrato                                                                | nada más                | 1      |
| L2        | §13 a §22    | 905       | de L1, solo los nombres y las cifras, que ya fija el glosario; §18 y §17 citan las secciones de L1 por número | §5, §7, §12             | 1      |
| L0        | §0           | 50        | todo, tras la refutación                                                                                      | todas                   | cierre |
| **Total** | 23 secciones | **1.900** |                                                                                                               |                         |        |

Los dos lotes van a la vez. L2 no espera a L1: el plan, los tests, las constantes y las migraciones se escriben desde §G.3, §G.6, §G.13, §G.14 y las decisiones; si L1 propone un nombre nuevo que L2 necesita, lo funde el ensamblador.

---

## D. Trazabilidad

### D.1 Injertos → sección

I-01 §13 · I-02 §13 · I-03 §5, §7 · I-04 §5 · I-05 §8 · I-06 §8 · I-07 §5, §6, §7, §8 · I-08 §7 · I-09 §4 · I-10 §10 · I-11 §6 · I-12 §7 · I-13 §7, §9 · I-14 §5 · I-15 §5 · I-16 §14 · I-17 §18, §20 · I-18 §3, §13 · I-19 §10, §14 · I-20 §11 · I-21 §13, §21 · I-22 §10 · I-23 §7 · I-24 §6 · I-25 §6, §13 · I-26 §9 · I-27 §9, §15 · I-28 §4 · I-29 §13.

### D.2 Objeciones → sección

O-01 §8 · O-02 §14 · O-03 §18, §20 · O-04 §5, §7, §9 · O-05 §4, §10, §13 · O-06 §6, §12, §13, §21 · O-07 §14, §20 · O-08 §13 · O-09 §5 · O-10 §6 · O-11 §13 · O-12 §13 · O-13 §7 · O-14 §7 · O-15 §7 · O-16 §5, §7 · O-17 §5 · O-18 §5 · O-19 §13 · O-20 §6 · O-21 §8 · O-22 §12, §18 · O-23 §14 · O-24 §10 · O-25 §10.

### D.3 Huecos → sección

H-01 §7 · H-02 §5, §19 · H-03 §7, §19 · H-04 §6, §18 · H-05 §7 · H-06 §5 · H-07 §9, §19 · H-08 §5, §19 · H-09 §13, §19 · H-10 §8 · H-11 §11, §21 · H-12 §4 · H-13 §11 · H-14 §14, §21 · H-15 §14 · H-16 §13, §20 · H-17 §21.

### D.4 Contradicciones de hecho → decisión → sección

X-01 D-22 §7 · X-02 D-21 §7 · X-03 D-11, D-13 §5 · X-04 D-47 §13 · X-05 D-53 §14 · X-06 D-13, D-23 §5, §7 · X-07 D-23 §7 · X-08 D-11 §5 · X-09 D-06 §4 · X-10 D-27 §7 · X-11 D-14 §5 · X-12 D-46 §13 · X-13 D-17 §6 · X-14 D-29 §8 · X-15 D-15 §5 · X-16 D-31, DD-01 §8 · X-17 D-59 §20 · X-18 D-48 §13 · X-19 D-40 §10 · X-20 D-52 §14 · X-21 D-11, D-13 §5 · X-22 D-17 §6 · X-23 D-14, D-22 §5, §7.

### D.5 El encargo (`00-encargo.md` §1 y §9.1) → sección

| Punto                                                                                                | Secciones                               |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1. El ciclo de la identidad (fecha, verificación, recuperación, cambios, borrado, sesiones, límites) | §4, §5, §6, §7, §10                     |
| 2. La seguridad (secuestro, enumeración, límites, tokens, correo como vía, dependencias, menores)    | §2, §5, §7, §8                          |
| 3. Las notificaciones                                                                                | §13                                     |
| 4. El modo ausencia                                                                                  | §14                                     |
| 5. Subdominios y calentamiento                                                                       | §9                                      |
| 6. El contacto, aparcado                                                                             | §11                                     |
| 7. Lo legal (acceso, exportación, borrado, privacidad, menores)                                      | §10, §21.3                              |
| §2 del encargo, el inventario                                                                        | §1                                      |
| §3, las dependencias con avisos                                                                      | §8.3                                    |
| §9.1.1 a §9.1.6                                                                                      | §4; §11; §9, §13, §14; §13.9; §14; §8.6 |
| Lo que E2 y E3 dejaron (mapa 04 §7)                                                                  | §6.1, §13, §20                          |
| Los documentos que hay que corregir (mapa 04 §6)                                                     | §20.2                                   |

---

## E. Lo que este esqueleto fija por su cuenta

De forma: el título del documento, `La cuenta y el contacto: cerrar los bordes, contar cada cambio y avisar sin correo (diseño final)`; dos lotes en una sola ola y la cabecera al cierre; dónde se escribe entero cada tipo (regla 7); §16 como única tabla de constantes; que las pantallas de `Notifications` y `Away` las dibujan §13 y §14 y el resto §12. De fondo, sin que ningún juez lo midiera: el orden de las migraciones por el plan (D-57), que el PR 1 sea el de las pantallas y no el de las dependencias (lo pide la base y codigo lo acepta como PR 2: los dos son independientes), y el total de unas 120 horas (D-58), que §18 reparte por PR.

# E4 · Juicio de seguridad: el modelo de amenazas y el teléfono

Juez: `seguridad`. Dos preguntas: ¿qué le queda a quien quiere quitarle la cuenta a otro, bloquearlo,
saber si juega, usar nuestro servidor contra la red privada o abrir el panel, después de cada propuesta?
y ¿qué ve el jugador, a 360 px y en un iPhone, cuando algo falla?

Leídos enteros `00-encargo.md`, `01-fase-propuestas.md`, `02-fase-juicios.md`, los cinco mapas y las tres
propuestas (`atacante.md` 597 l., `jugador.md` 597, `incremental.md` 417); capturas 16, 22, 35, 36, 37, 47,
50, 55 y 65. **Medido** en `<scratchpad>/juez-seguridad/` (salidas en `out/`): `barra.mjs` contra el arnés
del mapa 01 con `buildApp` y `createAuth` de verdad, en `mapa01/clon` (`better-auth` 1.6.25) y `clon17`
(1.7.26 y `fastify` 5.12.8); `peticion.mjs` y `tiempo.mjs`, `betterAuth` 1.7.26 sobre PGlite con las
migraciones reales; `ssrf.mjs`, `web-push` 4.0.0 del mapa 02 contra 127.0.0.1; y vuelvo a correr
`propuesta-incremental/medir.mjs` e `ip.mjs` (salidas propias en `out/`). Cifra sin otra marca, medida así.
No he tocado un iPhone, un escáner de enlaces real ni producción (salvo lo que ya leyeron los mapas).

## 1. Tabla cruzada

| #   | Ítem                                  | atacante                                                                                                         | jugador                                                                                                      | incremental                                                                                                   |
| --- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 1   | Sesión robada al recuperar            | `revokeSessionsOnPasswordReset`, cierra todas; vale                                                              | igual; vale                                                                                                  | igual, medido y reproducido; vale                                                                             |
| 2   | Límite por cuenta: lo que deja        | L1 10 en 15 min y 30 en 24 h: unos 11.000 al año; vale                                                           | 10 en 15 min, sin tope diario: 960 al día; flojo                                                              | 10 por hora: 240 al día; vale                                                                                  |
| 3   | Coste de dejar fuera al dueño         | 36 peticiones al día (30 fallos y 6 recuperaciones que agotan L5) lo cierran 24 h en todo navegador nuevo        | 10 fallos cada 15 min; los correos que dispara el atacante le llegan al dueño y valen                        | 10 fallos por hora; los 3 correos por hora le llegan y el último vale                                          |
| 4   | Salida del dueño bloqueado            | recuperar da la cookie de dispositivo al navegador que recupera; la única que gana la carrera (comprobaciones 4 y 5)  | recuperar pone el contador a cero sin cookie: el atacante que sondea vuelve a cerrar antes (medido, 429)    | igual que jugador; y su «aparato conocido» medido es una cabecera del arnés, no `cs_viewer`                    |
| 5   | Robo de la cookie de dispositivo      | `cs_device` 180 días con L2 10 en 15 min sin tope diario (960 al día, 32 veces L1)                               | `cs_known` 180 días, sobrevive al cierre de sesión y exime del todo del límite por cuenta                   | `cs_viewer` (90 días) exime del todo; rompe su invariante «solo restringe» (`viewerCookie.ts` l. 5 a 21)       |
| 6   | Recuperaciones vivas                  | pedir una anula las anteriores: el atacante mata el enlace que el dueño tiene en la mano                          | valen todas hasta usar una; usar una mata las demás; la buena                                                | pedir una mata la anterior (medido); mismo problema que atacante                                               |
| 7   | Escáneres de enlaces                  | todo enlace a una página con botón y `#token=`; vale                                                             | GET que cambian estado, y de 24 h; no vale                                                                    | solo la aprobación del cambio de correo con `#t=`; la verificación del registro sigue siendo GET               |
| 8   | Cambio de correo con sesión robada    | pide contraseña (L3) y botón; cierra las otras sesiones al aplicarse; deshacer 7 días                            | sin contraseña y aprobación por GET de 24 h: sesión robada más escáner es secuestro                          | pide contraseña y botón; no cierra sesiones al aplicarse                                                       |
| 9   | Enumeración por tiempo                | `backgroundTasks`; vale (comprobación 3)                                                                         | igual; vale                                                                                                  | igual, medido; vale                                                                                            |
| 10  | Enumeración por otras vías            | 429 igual sin cuenta; E7 avisa al dueño (1 cada 24 h); no ve el cambio de correo (hueco 1)                       | E7 sin tope: bombardeo de un buzón ajeno; su texto del destino ocupado lo hace explícito                                | 429 igual sin cuenta; sin E7; no ve el cambio de correo                                                        |
| 11  | La cuota de correo como blanco        | L4 20 por IP y día, L5 por buzón, presupuesto 90; cinco IP lo agotan y cortan también las recuperaciones          | nada propio; Pro antes de abrir                                                                              | 80 registros al día para todos: una IP los gasta en 40 min y cierra el registro del día                       |
| 12  | Qué IP vale                           | `trustProxy: true` (la de la izquierda) y `x-cs-client-ip`; alarma al 1 %                                       | `true` y un log al arrancar                                                                                  | `(addr, hop) => hop === 0` (la última), medido; alarma `xff_varias`; la mejor                                 |
| 13  | Rutas abiertas                        | lista blanca de 11 en el proxy; olvida las de `twoFactor` si DD-1                                                 | 404 en el proxy a 7 rutas                                                                                     | `disabledPaths` en `better-auth`, medido; deja `list-sessions` con tokens                                     |
| 14  | Panel raíz                            | TOTP de serie, correo raíz fijo, `admin_audit`; vale                                                             | correo raíz fijo; nada más                                                                                    | TOTP fuera por defecto; correo raíz cambiable con contraseña                                                   |
| 15  | SSRF de `endpoint`                    | lista de 4 servicios; vale (falta el puerto)                                                                     | ninguna: el `tick` hace POST a lo que mande el navegador                                                      | ninguna, y su «aviso de prueba» sale de la API y devuelve el error                                            |
| 16  | Avisos en un aparato compartido       | `Sign out` borra la suscripción; el clic solo abre el propio origen                                              | la suscripción sobrevive al cierre de sesión; abre `data.url` sin mirar                                     | igual que jugador                                                                                              |
| 17  | Sesión                                | 7 días y 90 de techo; sin caché; quita el token del JSON                                                         | 30 días, `cookieCache` 60 s (cerrar otra tarda un minuto); quita el token                                   | 30 días sin techo; sin caché; `list-sessions` entrega los tokens al JavaScript                                 |
| 18  | Edad: qué se guarda y qué se responde | el año; puerta neutra; `localStorage` 24 h; cuenta vieja menor, bloqueada y borrada a 30 días                     | la fecha; puerta neutra; `sessionStorage`; API con 403 sin fecha                                              | la fecha; anuncia los 16 antes de teclear; la puerta de las cuentas viejas solo en la web                     |
| 19  | Lo que ve quien falla a 360           | textos de 429 con minutos; no vio el mapa 05: deja 22, 37, 47, 65 y 55 sin tocar                                  | traductor único con cuenta atrás, `ForgotPassword` que mira, `Account` en subpáginas (55); la mejor         | dos textos de 429 en `Login`, uno con «5 minutes» fijo y otro «later» sin hora                                |
| 20  | El iPhone                             | manda a la pantalla de inicio: falso en iOS 16.4 a 18 sin manifiesto (mapa 02 §6, punto 2)                       | lo condiciona a iOS 26 y dice dónde está todo en la web; vale                                                | «no hay avisos todavía» hasta probarlo en un aparato; cierto                                                  |

## 2. Comprobaciones

| #   | Afirmación (propuesta)                                                                                               | Resultado        | Evidencia                                                                                                                                                                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `revokeSessionsOnPasswordReset` cierra la sesión de antes; `hashed` no guarda el token y acepta el enlace en claro de antes (incremental §4) | cierta           | `medir.mjs` reproducido: `sesionAnteriorTrasReset` cerrada, `tokenEnClaro` falso, `enlaceEnClaroDeAntes` 200 (`out/medir-incremental.json`)                                                                                                                                                                     |
| 2   | Un `endpoint` como `http://postgres.railway.internal:5432` hace hablar a la API con la red privada (atacante §8.4)    | cierta, y peor   | `web-push` 4.0.0 usa siempre `https.request` con el host y el puerto de la URL, sea cual sea el esquema (`web-push-lib.js` l. 343 a 363). El servicio de 127.0.0.1 recibió `160301` (un saludo TLS); puerto abierto `ECONNRESET`, cerrado `ECONNREFUSED`, nombre inexistente `ENOTFOUND`: un oráculo de puertos (`out/ssrf.json`) |
| 3   | `backgroundTasks` cierra la enumeración por tiempo (las tres, §4)                                                    | cierta           | 41 muestras, correo de 250 ms (`out/tiempo.json`): recuperar 4,0 frente a 4,6 ms (sin la opción, 5,6 frente a 255,6); registrarse 85,8 frente a 80,7, un resto de 5 ms de escrituras. `onExistingUserSignUp` también va en segundo plano (`sign-up.mjs` 1.7.26 l. 205)                                          |
| 4   | Recuperar es la salida del dueño bloqueado (jugador §6, incremental §6, salida 2)                                     | falsa sin cookie | `peticion.mjs`: 10 fallos y 429; recuperar, 200 y contador a cero; 10 fallos más del atacante; la contraseña nueva del dueño desde un aparato nuevo, **429**. Solo atacante §4.3 da la cookie al recuperar                                                                                                       |
| 5   | Que `ctx.request` sea el mismo objeto que el proxy pasa a `auth.handler` «está por comprobar» (atacante §4.3)          | cierta           | En 1.7.26 `onPasswordReset` recibe `ctx.request` (`password.mjs` l. 164) y es el mismo objeto (`request === ultimo`, `out/peticion.json`): el `WeakMap` funciona                                                                                                                                                 |
| 6   | El límite por cuenta «desde un aparato conocido, 200» (incremental §6, medido)                                       | a medias         | Reproducido, pero el aparato conocido del arnés es la cabecera `x-known-device: 1` (`medir.mjs`, `buenaConocida`), no una `cs_viewer`. La serie con un correo que no existe sí es idéntica (diez 401 y 429)                                                                                                     |
| 7   | Con HIBP el registro no delata, y si el servicio no responde falla cerrado (incremental §7; atacante §6.5 «no lo sé») | cierta           | El plugin envuelve `password.hash` (`haveibeenpwned/index.mjs` l. 63 a 75) y el registro hashea en las dos ramas (`sign-up.mjs` l. 200 y 220); un fallo lanza 500 (l. 37 y 41). Envolverlo para dejar pasar pide código propio                                                                                   |
| 8   | `disabledPaths` da 404 antes del limitador y deja `auth.api.verifyPassword` (incremental §7); ninguna variante de URL lo esquiva | cierta  | 404 en las cuatro con sesión y `verifyPassword` de servidor `ok` (reproducido). `normalizePathname` quita la barra final (`core/utils/url.mjs` l. 18 a 30) y el router no casa `//ruta` ni mayúsculas: en 1.6.25 y 1.7.26, `/sign-in/email/`, `//sign-in/email` y `/Sign-in/email` dan 404, y `?x=1` cae en el límite estricto (`out/*/barra.txt`) |
| 9   | `trustProxy: 1` da siempre la del socket; la función `hop === 0` da la última de la cabecera (incremental §6)          | cierta           | `fastify` 5.12.8 `lib/request.js` l. 53 a 57 (un número falla cerrado); `ip.mjs` reproducido (`out/ip.json`). Resuelve la contradicción con atacante y jugador: con Railway que reescribe, las dos dan lo mismo; si añadiera, solo la función no se falsifica                                                    |
| 10  | `emailVerification.expiresIn` fija la vida de todos los JWT de correo (jugador §4.1)                                  | cierta           | `update-user.mjs` 1.7.26 l. 457, 474, 491 y 508; `email-verification.mjs` l. 29, 109 y 201. Con 24 h, la aprobación del cambio de correo, que es GET, también vive 24 h                                                                                                                                          |
| 11  | El validador de `additionalFields` corre antes de buscar el correo (incremental §3)                                    | cierta           | Reproducido: el menor con correo nuevo y con correo existente, el mismo 400 `VALIDATION_ERROR`; ninguna fila nueva                                                                                                                                                                                             |
| 12  | El cambio a un correo ocupado no delata (las tres lo dan por cerrado)                                                 | falsa            | `update-user.mjs` 1.7.26 l. 456 a 459: con el destino ocupado no sale nada; libre, la aprobación llega al buzón propio. Cualquiera con cuenta confirmada sabe si una dirección juega mirando su bandeja (mapa 05, 53c, ya lo midió sin leerlo así)                                                              |

**El contador por cuenta, ¿tabla nueva o `verifications`?** Cabe en `verifications` (incremental lo mide y
`better-auth` purga las filas caducadas), pero su clave es SHA-256 del correo sin secreto: un diccionario de
correos la invierte. Jugador guarda el correo en claro, también los que no existen. Vale el HMAC con una
clave derivada de `SESSION_SECRET` de atacante §6.2, en la tabla que sea.

## 3. Puntuaciones

| Propuesta   | Cobertura | Coherencia | Seguridad | Experiencia |
| ----------- | --------- | ---------- | --------- | ----------- |
| atacante    | 8         | 7          | 9         | 5           |
| jugador     | 8         | 7          | 4         | 9           |
| incremental | 7         | 9          | 6         | 6           |

**atacante.** La única que recorre los diez atacantes con su coste y la única que defiende la SSRF, el panel
(TOTP y auditoría), el escáner en todos los enlaces, el clic a otro origen y la carrera tras recuperar (su
`WeakMap` funciona, comprobación 5). Pierde seguridad por sus propios topes: L1 diario más L5 diario dejan al
dueño un día entero fuera de todo navegador nuevo por 36 peticiones; anular al pedir regala al atacante el
enlace del dueño; L2 sin tope diario. Pierde experiencia porque no vio el mapa 05 y su frase del iPhone es falsa.

**jugador.** La mejor en el teléfono: errores que dicen cuánto esperar, ninguna pantalla muda, `Account` que
cabe sobre el teclado (55), `CheckInbox` que sobrevive, la fecha en tres campos con autorrelleno. En
seguridad es la más floja: cambio de correo sin contraseña con aprobación GET de 24 h (sesión robada más
escáner es secuestro), E7 sin tope, ninguna defensa de SSRF, `cs_known` que exime del todo y sobrevive al
cierre de sesión, correos en claro en `auth_limits`, el panel sin nada propio («el resto es de atacante»).

**incremental.** La más verificable: siete opciones medidas y reproducidas por mí, `trustProxy` por función,
`disabledPaths`, el validador antes de la búsqueda. Pero su tope de 80 registros es un botón de apagado para
cualquiera, su aparato conocido se apoya en una cookie diseñada para no dar nada, no limita por usuario las
contraseñas con sesión (`change-password` y `delete-user` solo por IP), no defiende la SSRF y su «aviso de
prueba» devuelve el oráculo de puertos al navegador.

## 4. Ganadora: `atacante`

Es la única base sobre la que la síntesis no tiene que inventar defensas: lo que le falta es experiencia,
y eso se injerta de `jugador` texto a texto; lo que le sobra son tres topes mal calibrados que se corrigen con
cifras (§6). Empezar por `jugador` obligaría a reescribir el cambio de correo, los enlaces, la SSRF y el
panel; por `incremental`, a tirar su límite de registros y su aparato conocido. De `incremental` se trae el
método (opción de `better-auth` antes que código) donde mide lo mismo con menos.

## 5. Injertos

1. De `jugador` §6.1, `authErrorText` con `Retry-After`, botón deshabilitado y cuenta atrás, y el 429 de Fastify con `message`: hoy dice `Wrong email or password.` con la buena (35).
2. De `jugador` §4.2, `ForgotPassword` que mira la respuesta (37), `VerifyEmail` que pregunta por la sesión (22), los finales con `Notice` (47, 65) y `CheckInbox` en `sessionStorage`.
3. De `jugador` §5, `Account` como lista con subpáginas: el botón de `Update email` queda hoy 122 px bajo el teclado (55).
4. De `jugador` §4.1, «usar un enlace de recuperación mata los demás» en lugar de «pedir uno anula los anteriores»: así el correo que dispara el atacante es la salida del dueño, no su trampa.
5. De `jugador` §3, `DateField` de tres campos con `autocomplete` `bday-*` y la puerta neutra en `sessionStorage` (no 24 h en `localStorage`, que marca el aparato y cierra a toda la casa).
6. De `jugador` §8.3, el texto del iPhone condicionado a iOS 26 o más (mapa 02 §6, punto 2), y que todo aviso tenga su gemelo en la web.
7. De `jugador` §8.1, `stage_digest` de uno al día y horas de silencio: menos avisos, menos retirada del permiso por Chrome (mapa 02 §5).
8. De `incremental` §6, `trustProxy: (addr, hop) => hop === 0` con su test y la alarma `xff_varias`, en lugar de `true`.
9. De `incremental` §7, `disabledPaths` como segunda barrera detrás de la lista blanca del proxy (medido, comprobación 8).
10. De `incremental` §3, el `validator` de `additionalFields` para la edad (medido antes de la búsqueda); el año se guarda después, en `databaseHooks.user.create.before`.
11. De `incremental` §11, el borrado atómico por `beforeDelete` que llama a `deleteUserAsAdmin` (medido: 200 y 0 filas), con L3 en un gancho `after`, en vez de ruta propia.
12. De `incremental` §5 y `jugador` §5, 30 días de sesión renovable, con el techo de 90 de atacante §5: quien vuelve de vacaciones no escribe la contraseña y una cookie robada no vive más de un trimestre.
13. De `incremental` §5, `disableIpTracking` en vez de truncar la IP: lo que no se guarda no se explica en `Privacy` ni se exporta.

## 6. Objeciones a la ganadora

1. **§6.2, L1 y L5 diarios dejan al dueño fuera un día.** 30 fallos y 6 recuperaciones por día bastan, y L5 calla. L1 solo con ventana de 15 min; L5 3 por hora sin tope diario.
2. **§4.1, anular al pedir.** Con el injerto 4; el primer uso mata a los demás, y la vida baja a 1.800 s como propone.
3. **§6.2, L2 sin tope diario.** Una `cs_device` robada da 960 intentos al día. L2 con 30 en 24 h, y `Sign out of all other devices` rota la cookie de todos los navegadores de esa cuenta.
4. **§10.3, el presupuesto se agota para todos.** Cinco IP con L4 gastan los 90 y nadie puede recuperar. Reservar 30 del día a recuperaciones de cuentas confirmadas; el registro solo gasta el resto.
5. **§7.1 y §7.3, la lista blanca sin `twoFactor`.** Con DD-1 hacen falta las rutas `/two-factor/*` y la respuesta `twoFactorRedirect` de `sign-in`; escribirlas en la lista y en T7.1.
6. **§8.4, la SSRF a medias.** Falta exigir `https:`, puerto vacío o 443 y sin usuario en la URL, volver a validar al enviar (las filas viejas) y no devolver nunca el error del envío al navegador.
7. **§4.2, el `#token=` se queda en el historial.** La página tiene que borrarlo con `history.replaceState` al leerlo, y dar el texto completo de cada página de botón (solo da la etiqueta).
8. **§4.3, deshacer 7 días.** El cambio ya exige contraseña y la aprobación del buzón viejo; deshacer da 7 días de poder a quien lea el buzón que el jugador dejaba atrás (un correo del trabajo). 72 h y aviso también a la dirección nueva.
9. **§8.5, la frase del iPhone es falsa en iOS 16.4 a 18** sin manifiesto (mapa 02 §6, punto 2). Injerto 6.
10. **§6.5, HIBP falla cerrado** (comprobación 7): si su API cae, nadie se registra ni recupera. O se escribe el envoltorio que deja pasar, o DD-3 lo dice así.
11. **Lo que no vio del mapa 05**: 22, 37, 47, 55 y 65 siguen igual; cada página de botón añade un toque y necesita su texto entero. Injertos 1 a 3.
12. **§3, `localStorage` 24 h** con la marca de que un menor lo intentó. Injerto 5.

## 7. Lo que ninguna propuesta resuelve

1. **La enumeración por el cambio de correo** (comprobación 12): con destino ocupado no sale nada. Mandar siempre la aprobación al buzón viejo y, al final, a la dirección nueva «esta dirección ya tiene cuenta»; y 3 cambios por usuario y día (jugador §6).
2. **El registro como bombardeo de rebotes**: cada registro con un correo inventado manda un correo que rebota, y Resend castiga por encima del 4 % (mapa 02 §4). Ninguna limita las cuentas sin confirmar por IP y día ni purga antes de 7 días.
3. **Un escáner de enlaces real** (Defender Safe Links y similares): nadie ha comprobado si ejecuta JavaScript y pulsa; el botón se da por bueno por estimación.
4. **El iPhone de verdad**: el aviso desde la pantalla de inicio en iOS 26, y que esa app web tiene sus propias cookies (de memoria, no comprobado): ni sesión ni cookie de dispositivo de Safari, así que bajo ataque es «un navegador nuevo».
5. **El registro de `better-auth`**: `Sign-up attempt for existing email: <correo>` sale a nivel `info` (`sign-up.mjs` l. 194); hoy no se ve porque el nivel por defecto es `warn` (incremental §11, medido). Nadie lo fija por escrito.
6. **El menor que se descubre** sin canal de contacto: ni quién avisa ni qué se hace con sus datos; a confirmar con un abogado.

## 8. Las decisiones del dueño

| Decisión                     | De quién  | Alternativas para la página de opciones                                                                          | Por defecto (recomiendo)                         |
| ---------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Segundo factor del panel     | dueño     | (A) TOTP solo para administradores; (B) sin TOTP, con segundo factor en el buzón de `ADMIN_EMAIL`; (C) panel solo con `ADMIN_TOKEN` | A: es lo único que para a quien abre ese buzón   |
| Plan de Resend               | dueño     | Pro antes de abrir; gratuito con tandas de 50                                                                   | Pro, con la reserva para recuperar (objeción 4)  |
| Contraseñas filtradas (HIBP) | dueño     | sí y falla cerrado; sí y deja pasar (código propio); no                                                          | sí y deja pasar                                  |
| Fecha o año de nacimiento    | dueño     | la fecha; el año comprobando la fecha entera al enviarla; solo «declara 16»                                       | el año: es la pregunta de seguridad de medio internet |
| Duración de la sesión        | síntesis  | 7 días; 30 renovables; 30 con techo de 90                                                                        | 30 con techo de 90                               |
| Correo de entrada nueva (E6) | dueño     | encendido sin interruptor; con interruptor; apagado                                                             | encendido, uno por hora                          |
| Deshacer el cambio de correo | síntesis  | 7 días; 72 h con aviso a las dos; nada                                                                           | 72 h                                             |
| Tope diario de registros     | síntesis  | se descarta: es un apagado a disposición de cualquiera (§1, ítem 11)                                              | ninguno; reserva de correo                       |
| Avisos encendidos de serie   | dueño     | (A) aviso de la regla del mes, fin de ausencia y `stage_digest`; (B) solo los dos primeros; (C) todos apagados  | A                                                |
| Cuándo se pide el permiso    | dueño     | (A) tras crear el corredor y al seguir una carrera, con un toque; (B) solo en `Account`; (C) además en la portada | A                                                |
| El iPhone                    | dueño     | (A) «no hay avisos todavía» y dónde está todo en la web; (B) A más el camino de iOS 26; (C) además un aviso en la portada | A hasta probarlo en un iOS 26; luego B       |
| Pantalla del modo ausencia   | dueño     | las tres de jugador D-4; terminarla, sin contraseña                                                             | la de líneas calculadas                          |
| Pantalla de sesiones         | dueño     | (A) aparato y fechas; (B) además la IP truncada; (C) solo el número y `Sign out of all other devices`            | A, sin IP (injerto 13)                           |
| Texto de privacidad          | dueño     | todo a la vista; tabla `What`, `Why`, `How long`; resumen y detalle plegado                                     | todo a la vista, con los hechos de atacante §11.1 |
| Casilla de condiciones       | abogado   | línea bajo el botón; casilla                                                                                     | a confirmar con un abogado                       |
| Destino de los informes DMARC | dueño    | un buzón suyo; un servicio de resúmenes; ninguno                                                                | un buzón suyo                                    |

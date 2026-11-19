# E4 · Fase 0: instrucciones comunes a los cinco cartógrafos

Lee antes `00-encargo.md` entero, con su §9 (lo que el dueño ya decidió). Un mapa no propone nada:
dice **qué hay hoy**, con su línea, y **qué falta**, con su prueba. Es la base de hechos que leerán
las tres propuestas, los tres jueces y los cuatro refutadores, así que un error aquí se multiplica
por diez. Modelo de densidad y de formato: `docs/diseno/e3-visual/mapas/02-examen.md` y
`04-documentos.md`.

## Estructura obligatoria

0. **Cabecera**: los ficheros leídos enteros, con sus líneas, y el commit (`2a29e6d`).
1. **Resumen** (10 a 25 líneas): los cinco a ocho hechos que más condicionan el diseño de E4, cada
   uno con su sección del mapa.
2. **Secciones numeradas** (`§1`, `§2`…), para que los demás citen «mapa 01 §4». Tablas donde haya
   que comparar o contar. Cada fila con fichero y línea.
3. **Lo que este mapa no ha podido comprobar**, y por qué.

Tamaño: **150 a 300 líneas**. Las reglas de escritura son las de `00-encargo.md` §7. Escribe solo tu
fichero (y, el mapa 05, también `capturas/`). Trabaja en `<scratchpad>/<tu-mapa>/`, con el clon de
`<scratchpad>/repo` (no compiles ni instales en el repositorio de verdad). Lo que pruebes en local,
dilo con el comando y su salida resumida. **Producción, solo GET de lectura.**

**La API local.** `docs/diseno/e3-visual/mapas/05-pantallas.md` y `capturas/` (`mundo.mjs`, `servir.mjs`, `capturas.mjs`) cuentan cómo se levantó
la API con un mundo de PGlite y la web compilada en E3; repítelo en tu subdirectorio. Sin Resend, los
correos no salen y quedan en el log (`docs/ops.md` l. 119 a 120): para leer un enlace, captúralo del
log o con un `Mailer` falso en un script del scratchpad.

## Los cinco encargos

### Mapa 01 · La cuenta y la seguridad (`mapas/01-cuenta-y-seguridad.md`)

- **Las rutas**: cada ruta de `/api/auth/*` que monta `better-auth` 1.6.25 con la configuración de
  `apps/api/src/auth.ts`, cuáles usa la web (`apps/web/src/auth/client.ts` y las páginas) y cuáles
  están abiertas sin que nadie las use (por ejemplo `list-sessions`, `revoke-session`,
  `update-user`): qué hace cada una y si alguna es un riesgo hoy.
- **Los tokens**: verificación, recuperación, cambio de correo y sesión. Para cada uno, cómo se
  genera, su longitud, dónde se guarda (¿en claro en `verifications.value`?), cuánto dura, si es de un
  solo uso, qué pasa al pedir otro (¿caduca el anterior?) y qué pasa con las sesiones abiertas al
  recuperar la contraseña. Con la línea del paquete instalado.
- **La sesión**: duración, renovación (`expiresIn`, `updateAge`), la cookie, la caché de sesión si la
  hay, `cs_viewer` (`apps/api/src/viewerCookie.ts`), y qué se guarda en `sessions` (IP y agente).
- **Los límites**: las dos capas de `00-encargo.md` §2.2, comprobadas en local con la API levantada
  (cuántos intentos de entrar con contraseña mala pasan de verdad antes del 429, con y sin
  `NODE_ENV=production`), su clave, su almacén y qué pasa al reiniciar el proceso. Qué IP ven
  Fastify y `better-auth` con `X-Forwarded-For` de una y de varias IP. Y lo que diga la documentación
  de Railway de esa cabecera y de `X-Real-IP`, con su URL y la fecha en que la leíste.
- **La enumeración de correos**, ruta a ruta (registro con un correo que existe, entrar con un correo
  que no existe, recuperar, reenviar la verificación, cambiar a un correo ocupado): la respuesta, el
  código y, medido en local, el tiempo de respuesta, para ver si una diferencia delata la cuenta.
- **Las contraseñas**: longitud mínima y máxima, algoritmo del hash, si se comprueba contra listas de
  contraseñas filtradas.
- **Las dependencias con avisos** (`00-encargo.md` §3): qué dice cada aviso (consulta la base de
  avisos de GitHub, `GHSA-965c-763c-88jm` y las demás, y apunta las URL), si nos alcanza con la
  configuración de hoy y por qué, y **qué cambia al subir** `better-auth` de 1.6.25 a 1.7.7 o a la
  última (lo que rompe, lo que cambia de valores por defecto, las migraciones de esquema que pida) y
  `fastify` a 5.12.2. Si puedes, prueba la subida en el clon y corre `apps/api` con sus tests.

### Mapa 02 · El correo y los avisos (`mapas/02-correo-y-avisos.md`)

Lo que dice `00-encargo.md` §6, punto 2. Además: el DNS de `cyclingstar.app` con `dig` (o, si no hay
`dig`, con una consulta DNS sobre HTTPS), registro a registro; qué dice Resend en su documentación de
subdominios, de calentamiento y de la cabecera `List-Unsubscribe` (por si algún día hay correo de
notificación); y, del aviso del navegador, una tabla navegador por plataforma con lo que funciona en
noviembre de 2026 y su fuente. Dos preguntas que el mapa contesta con hechos: **¿puede un jugador de
iPhone recibir hoy un aviso de una web que no está en su pantalla de inicio?** y **¿qué es lo mínimo
que necesita la web para recibir avisos sin volver a ser instalable?** (un service worker solo de
avisos; un manifiesto, si Safari lo exige; lo que haga falta en la CSP).

### Mapa 03 · Los datos y la ausencia (`mapas/03-datos-y-ausencia.md`)

- **Las tablas de la cuenta** (`users`, `sessions`, `accounts`, `verifications`) columna a columna,
  con quién escribe cada una; y **todas las tablas que apuntan a `users`**, con su `onDelete`.
- **El borrado**: lo que se borra, lo que pasa a la máquina (`releaseUserToWorld`) y lo que queda con
  datos de la persona (el nombre del corredor que eligió, el del equipo, los mensajes si los hay);
  probado en local borrando una cuenta y consultando la base después.
- **Los datos personales de verdad** frente a lo que dice `apps/web/src/pages/Privacy.tsx` y
  `docs/ops.md`: correo, IP en `sessions`, agente, país, `locale`, `last_seen_at`, lo que se manda a
  los servicios de geolocalización (`apps/api/src/geoIp.ts`), lo que va a los logs. Frase a frase de
  `Privacy.tsx`: verdadera, falsa o no comprobable.
- **`last_seen_at`**: quién la escribe (`touchLastSeen` en `packages/db/src/horizon.ts`), cada cuánto,
  desde cuándo hay datos en producción (por la fecha de la migración 0048 y su despliegue).
- **Qué hace hoy el mundo con un humano que no entra**: un corredor humano (quién elige su
  entrenamiento, sus carreras, sus órdenes cuando no hay órdenes), un equipo de mánager humano (las
  convocatorias, los contratos, las tácticas) y un premium. Con la línea del tick
  (`apps/api/src/tick/` y `packages/db/src/`) y, si puedes, avanzando el mundo local unos días sin
  tocar nada. Es el suelo del modo ausencia: lo que ya pasa solo y lo que se queda parado.
- **La fecha de nacimiento**: dónde encajaría (columna, migración, el formulario) y qué tests de
  `Register` y del flujo se romperían; sin proponer, solo el sitio.

### Mapa 04 · El corpus (`mapas/04-documentos.md`)

Las palabras del dueño sobre la cuenta, el correo, la edad, los menores, la ausencia, los avisos, la
app, el contacto y la privacidad, sacadas de `docs/balance.md`, `docs/agenda.md`, `docs/epics.md`,
`docs/encargos.md`, `docs/captacion.md`, `SPEC.md`, `docs/ops.md`, `docs/retransmision.md` (las 27
veces que nombra a E4) y `docs/visual.md` (las 8), numeradas `[DUEÑO n]` (cita textual, fichero,
línea, fecha o versión) y `[DOC n]` (lo que dice un documento, sin ser palabra del dueño). Después,
las **contradicciones**: entre documentos, entre un documento y el código, y entre un documento y lo
que el dueño decidió el 19 de noviembre (`00-encargo.md` §9.1). Cada una con sus dos lados citados.

### Mapa 05 · Las pantallas (`mapas/05-pantallas.md` y `capturas/`)

Lo que dice `00-encargo.md` §6, punto 5. Capturas a 360 × 800 con `deviceScaleFactor` 1 (y alguna a
1.280 de ancho), con un índice en `capturas/README.md` y los scripts que las rehacen. Para cada
pantalla: los textos tal cual (en inglés, como salen), los errores que puede enseñar y cuándo, lo que
pasa con el teclado del teléfono abierto, y los objetivos táctiles por debajo de 44 px. Los
recorridos enteros, con el correo de cada paso capturado del log: registrarse y confirmar, entrar sin
confirmar, recuperar la contraseña, cambiar el correo (los dos enlaces), cambiar la contraseña y
borrar la cuenta.

## Orden

01 y 03 a la vez; después 02 y 04; el 05, solo al final.

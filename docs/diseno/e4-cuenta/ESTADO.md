# E4 · Estado del proceso de diseño

Estado: **fase 0b, los mapas, en marcha** (01 y 03 primero).
Empezado el 19 de noviembre de 2026 sobre `2a29e6d` (`main`, con E2 en producción, E3 en
implementación y el motor v91). El documento final será `docs/cuenta.md`. Se actualiza este fichero
al terminar cada fase, con commit y push en la rama de desarrollo, para poder retomar el trabajo si la
sesión se corta.

## Hecho

- **Fase 0, el reconocimiento** (19 de noviembre de 2026): `00-encargo.md`, el brief de todos los
  agentes, con el encargo resumido en siete puntos y el inventario de lo que el código de hoy
  desmiente del encargo y de G11 (§2): los tres correos de cuenta ya salen por Resend, la
  verificación es obligatoria, hay recuperación, el cambio de correo pasa por la dirección vieja y
  la nueva, borrar la cuenta pide la contraseña, `users.last_seen_at` ya existe (E2, 0048) y
  `stageReadyEmail` está escrita y sin enviar (DD-10 de E2).
- La sospecha de `X-Forwarded-For`, comprobada a medias en producción con GET de lectura sobre
  `/api/auth/get-session`: el contador de `x-ratelimit-remaining` no estrena cubo con una cabecera
  falsa, así que el proxy de Railway parece no dejarla pasar (`00-encargo.md` §2.2). Falta la prueba
  en local y la documentación de Railway (mapa 01).
- El limitador propio de `better-auth` 1.6.25, leído en el paquete: encendido solo con
  `NODE_ENV=production`, por IP y en memoria. No sé si Railway pone esa variable.
- El entorno: un clon de `2a29e6d` en `<scratchpad>/repo` con `pnpm install --frozen-lockfile` en
  verde.

- **Las respuestas del dueño a la fase 0** (19 de noviembre de 2026), en `00-encargo.md` §9.1: edad
  mínima de 16 con fecha de nacimiento; sin canal de contacto por ahora; ningún correo de juego,
  avisos solo por el navegador y la app; la app sin tecnología ni fecha; el modo ausencia con la
  frontera propuesta; solo correo y contraseña. El brief se ajusta (§1, puntos 3, 5 y 6; el mapa 02
  pasa a ser el del correo y los avisos).
- `00-fase-mapas.md`, las instrucciones de los cinco cartógrafos.
- `mapas/01-cuenta-y-seguridad.md` (300 l.): recuperar la contraseña no cierra las sesiones abiertas
  (falta `revokeSessionsOnPasswordReset`); el tiempo de respuesta delata qué correos existen en el
  registro, la recuperación y el cambio de correo; ningún límite mira la cuenta; `verify-password`
  responde por HTTP con el límite flojo; la subida a `better-auth` 1.7.26 y `fastify` 5.12.8 compila
  y pasa 1.126 tests sin migración, y ningún aviso nos alcanza hoy.
- `mapas/03-datos-y-ausencia.md` (299 l.): la IP sí se guarda en `sessions.ip_address`, y los logs de
  Fastify registran la URL entera con los tokens de verificación y recuperación; cuatro frases de
  `Privacy.tsx` son falsas; el borrado de autoservicio no es atómico y deja el corredor, el nombre del
  equipo, su maillot y el plan; `last_seen_at` solo la escriben las rutas del espectador y nadie la
  lee; en 28 días de juego sin entrar, el corredor entrena y corre solo, y un agente libre se queda
  parado.

## Siguiente

1. Los cinco mapas, de dos en dos: 01 y 03 primero (cuenta y datos), luego 02 y
   04 (correo y corpus), y el 05 (pantallas) solo.
2. Las tres propuestas, los tres jueces, la síntesis con la página de opciones, la refutación, la
   corrección, la coherencia, la auditoría y el ensamblado (`00-encargo.md` §6).

## Decisiones del proceso

- Tres propuestas y no cuatro, y dos correctores y dos auditores y no tres: E4 es mediano y la mitad
  es ejecución. Los cuatro refutadores se quedan, con uno de seguridad.
- Como mucho dos agentes a la vez, del mismo modelo que el orquestador.

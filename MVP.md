# Cycling Star - MVP: Definición y Plan de Ejecución

Versión 1.0. Complemento operativo del SPEC v0.6. Este documento define el producto mínimo viable, su alcance exacto y los 48 pasos para alcanzarlo con Claude Code sobre la infraestructura existente de Railway (plan Hobby). Se guarda en el repositorio como MVP.md junto a SPEC.md y CLAUDE.md.

## 1. Definición del MVP

En una frase: un mundo persistente donde de 20 a 50 usuarios reales crean su ciclista, entrenan bajo el modelo de Banister, son convocados por equipos NPC, disputan una temporada completa con el motor de bloques de 100 metros, leen el relato de sus etapas, cobran, reciben ofertas y envejecen un año, sin intervención manual del administrador durante 91 días reales.

El bucle que el MVP debe demostrar:

1. Dejo órdenes de entrenamiento (2 minutos).
2. El mundo avanza solo cada 6 horas.
3. Me convocan; dejo órdenes de etapa (2 minutos).
4. Leo el relato y el resultado; veo mi progreso en estrellas y mi forma.
5. Cobro, mejoro, me ofertan; vuelvo mañana.

Criterios de éxito, medibles al cierre de la temporada beta:

- Técnicos: cero ticks fallidos sin recuperación automática en 30 días; p95 de duración del tick por debajo de 60 segundos; todos los invariantes del Montecarlo (SPEC 6.17) en verde en CI.
- Producto: al menos la mitad de los usuarios activos de la semana 1 sigue dejando órdenes en la semana 4; mediana de 4 o más visitas semanales; el 70% de los ciclistas creados llega a su primera carrera dentro de sus primeros 10 días de juego.
- Cualitativo: los relatos de etapa se comparten solos (la gente pega su crónica en el canal de la beta sin que nadie se lo pida).

## 2. Alcance: qué entra y qué queda fuera

Dentro del MVP:

- Registro con correo y contraseña (better-auth) y sesiones en Postgres.
- Creación de ciclista completa: país por IP con selector editable, generador de nombres por país con regeneración y lista de bloqueo, vocación, techos ocultos con don global, visualización en estrellas (SPEC 3).
- Reloj del mundo: tick idempotente cada 6 horas vía cron de Railway, con recuperación de días pendientes (SPEC 2).
- Fisiología y entrenamiento completos: Banister, forma, frescura, enfermedad, moral, planificador de órdenes, decaimientos, sobrecompensación, descubrimiento del talento (SPEC 4 y 5).
- Motor de etapa íntegro según SPEC 6: llano, montaña, pavés, CRI, CRE, banners, órdenes de las cinco capas, inercia, caídas. El marcaje (capa 4) se implementa al final de la fase del motor y es recortable si la fecha aprieta.
- Mundo NPC: equipos de andamiaje en tres divisiones, unos 1,600 corredores, convocatorias por IA, contratos y ofertas, rollover de temporada (SPEC 7 y 10).
- Calendario MVP: una temporada con unas 28 carreras (una gran vuelta de 21 etapas, tres carreras de una semana, ocho clásicas con dos de pavés, dos CRI sueltas y relleno de nivel Continental).
- Economía básica: salarios, premios, staff personal, libro de transacciones (SPEC 9).
- Noticias generadas, clasificaciones, ranking de puntos, palmarés.
- Replay: línea temporal de eventos y altimetría SVG; el cursor animado sobre la altimetría es deseable pero no bloqueante.
- Panel de administración mínimo: tick manual, estado del mundo, log de ticks.

Fuera del MVP (v1.1 y siguientes):

- Equipos fundados por usuarios y capa de manager. Nota de coherencia: esto no cancela la decisión de diseño; es secuencia. Con 20 a 50 usuarios no hay masa para poblar plantillas humanas, y el andamiaje NPC existe exactamente para este arranque. La fundación de equipos es lo primero de v1.1.
- Mercado entre usuarios, selecciones nacionales y Mundial jugable, carreras en directo (SSE), PWA con notificaciones, monetización, idiomas adicionales al español, clima y abanicos, política de dosificación en CRI.

Nota de moderación: al no haber equipos de usuarios ni ningún campo de texto libre (los nombres salen del generador), el MVP no necesita sistema de moderación. La primera dependencia real de moderación llega con v1.1.

## 3. Método de trabajo con Claude Code

- Un paso por sesión. Cada paso de este documento está dimensionado para una sesión de 1 a 3 horas. Resista la tentación de encadenar pasos en una misma sesión con el contexto ya cargado de ruido.
- Ritual de apertura de cada sesión: "Lee CLAUDE.md, lee MVP.md paso N, lee las secciones del SPEC que el paso referencia, propón un plan y espera mi visto bueno antes de escribir código".
- Tests primero en el motor: en la fase 5, exija a Claude Code escribir los tests del comportamiento esperado antes de la implementación. El motor es matemática pura; es el terreno ideal para esa disciplina.
- Ramas por fase, commits por paso, mensaje de commit con el número del paso.
- Las constantes de juego solo cambian en `packages/engine/src/constants.ts` y todo cambio se anota en `docs/balance.md` con la razón y la corrida de Montecarlo que lo justifica.
- Guarde los prompts que funcionen bien en `/prompts` del repositorio: son herramienta reutilizable.
- Al cerrar cada sesión: `pnpm typecheck && pnpm test` en verde y despliegue verificado antes de considerar el paso hecho.

## 4. El plan: 48 pasos en 10 fases

### Fase 0 - Cimientos (pasos 1 a 5, un fin de semana)

Paso 1. Repositorio y documentos rectores. Crear el repositorio en GitHub con README breve, licencia privada, y colocar SPEC.md (v0.6), este MVP.md y el CLAUDE.md del apéndice A. Hecho cuando: los tres documentos viven en `main` y el repositorio tiene protección básica de rama.

Paso 2. Entorno de desarrollo en el navegador. Sin instalar nada en la computadora: en la página del repositorio, botón Code, pestaña Codespaces, Create codespace on main; se abre VS Code con terminal en una máquina en la nube (Node preinstalado; si no fuera la versión 22, `nvm install 22`). En esa terminal: `corepack enable` para pnpm, `npm install -g @anthropic-ai/claude-code` y luego `claude` para iniciar sesión con la cuenta de Claude. La base de datos de desarrollo no es Docker local: provisionar un Postgres de desarrollo en el proyecto de Railway (o Neon gratuito) y guardar su `DATABASE_URL` como secreto de Codespaces (Settings del repositorio, Secrets and variables, Codespaces); `.env.example` documenta `DATABASE_URL`, `ADMIN_TOKEN`, `SESSION_SECRET`. Nota de cuota: las cuentas personales incluyen 120 horas de núcleo al mes de Codespaces (unas 60 horas reales en la máquina de 2 núcleos), suficientes para el ritmo de este plan; el Codespace se apaga solo tras 30 minutos de inactividad. Hecho cuando: en la terminal del Codespace, `node -v`, `pnpm -v` y `claude --version` responden.

Paso 3. Esqueleto del monorepo. Workspaces de pnpm con `apps/api`, `apps/web`, `packages/engine`, `packages/db`, `packages/shared`; tsconfig base estricto compartido, ESLint y Prettier, vitest configurado en la raíz. Hecho cuando: `pnpm -r build` y `pnpm test` corren en verde con un test trivial por paquete.

Paso 4. Railway. En el proyecto Hobby existente: provisionar Postgres, crear el servicio `web` conectado al repositorio (build `pnpm install && pnpm build`, arranque `node apps/api/dist/index.js`), variables de entorno, y desplegar un hola mundo que responda `/health`. Hecho cuando: la URL pública de Railway devuelve `{ ok: true }`.

Paso 5. Integración continua. GitHub Actions con typecheck y tests en cada pull request; despliegue automático a Railway al fusionar en `main` (integración nativa de Railway con GitHub). Hecho cuando: un PR con un test roto queda bloqueado y un merge despliega solo.

### Fase 1 - Esqueleto de aplicación (pasos 6 a 9, 3 o 4 sesiones)

Paso 6. Base de datos fundacional. En `packages/db`: Drizzle con las tablas `worlds`, `users`, `game_state`, `tick_log` (SPEC 11); flujo de migraciones con drizzle-kit; las migraciones se ejecutan al arrancar el servicio, antes de escuchar, protegidas con un advisory lock. Hecho cuando: el despliegue en Railway crea las tablas solo.

Paso 7. API base. Fastify con logging pino, validación Zod en los bordes, manejo uniforme de errores, y servido de los estáticos compilados de `apps/web`. Hecho cuando: `/health` reporta versión, fecha de juego (aún nula) y migraciones aplicadas.

Paso 8. Web base. Vite, React, Tailwind, TanStack Query y React Router; layout con cabecera (fecha del mundo, dinero, frescura cuando existan), cliente de API tipado desde `packages/shared`. Hecho cuando: la SPA se sirve desde Railway y consume `/health`.

Paso 9. Autenticación. better-auth con correo y contraseña, cookies de sesión respaldadas en Postgres, páginas de registro y acceso, guarda de rutas protegidas. Hecho cuando: dos usuarios distintos pueden registrarse, salir y volver a entrar.

### Fase 2 - El reloj del mundo (pasos 10 a 12, 2 o 3 sesiones)

Paso 10. El tick. `scripts/tick.ts` según SPEC 2 y 11: `pg_advisory_lock`, cálculo de días de juego pendientes contra la hora real, una transacción por día (de momento solo avanza la fecha y registra en `tick_log`), y endpoint `POST /admin/tick` protegido con `ADMIN_TOKEN`. Hecho cuando: dos ejecuciones simultáneas del script no duplican días.

Paso 11. Cron en Railway. Segundo servicio del mismo repositorio, comando `node dist/scripts/tick.js`, Cron Schedule `0 */6 * * *`; el proceso corre y termina. Hecho cuando: `tick_log` muestra cuatro entradas diarias sin intervención durante 48 horas.

Paso 12. Utilidades de tiempo. En `packages/shared`: conversión día de juego a fecha legible, día de temporada, cuenta regresiva al próximo tick en la cabecera de la web. Hecho cuando: la UI muestra "Día 37, temporada 1" y el contador al próximo tick.

### Fase 3 - Creación del ciclista (pasos 13 a 16, 3 o 4 sesiones)

Paso 13. Servicio de nombres. Construir `packages/db/data/names/{cc}.json` para 15 o 20 países iniciales (nombres de pila por género y apellidos ponderados por frecuencia, de fuentes censales públicas) y `data/pro_blocklist.json` con profesionales reales; servicio de generación con RNG sembrado y función regenerar (SPEC 3.6). Hecho cuando: un test genera 1,000 nombres españoles sin colisión con la lista de bloqueo.

Paso 14. País por IP. Poner Cloudflare (plan gratuito) delante del dominio y leer `CF-IPCountry`; alternativa local con GeoLite2 (cuenta gratuita de MaxMind, con su atribución). La IP no se persiste; el selector de país es editable. Hecho cuando: la pantalla de creación preselecciona el país correcto en un dispositivo real.

Paso 15. Flujo de creación. Vocación, muestreo de atributos iniciales, vector de techos con don global, `rider_hidden`, re creación libre hasta el día 90, y el mapeo a estrellas en `packages/shared` (SPEC 3.2 a 3.5). Hecho cuando: dos ciclistas con la misma vocación muestran estrellas distintas y sus techos ocultos difieren en base de datos.

Paso 16. Perfil del ciclista. Página con estrellas por atributo, flechas de tendencia desde `rider_attr_log`, ficha de identidad, hueco para la gráfica de forma. Hecho cuando: el perfil se ve correcto en móvil, porque los jugadores entrarán desde el teléfono entre tick y tick.

### Fase 4 - Fisiología y entrenamiento (pasos 17 a 20, 3 o 4 sesiones)

Paso 17. Banister puro. En `packages/engine`: ATL, CTL, TSB con la tau personal por Recuperación, índice de forma, `M_form`, mapeo de frescura (SPEC 4); tests unitarios contra casos calculados a mano. Hecho cuando: los tests reproducen los números del SPEC con tolerancia de 0.01.

Paso 18. Planificador de órdenes. CRUD de `training_orders` con cola de 7 a 28 días, plan del entrenador por defecto cuando no hay orden, catálogo de sesiones (SPEC 5.1). Hecho cuando: un usuario deja una semana de órdenes en menos de un minuto desde el móvil.

Paso 19. El tick entrena. Integración en el tick: TSS por sesión, ganancias con la cadena completa de factores hacia el techo personal, decaimientos, enfermedad por hazard, regresión de moral, `rider_daily_log` (SPEC 5.2, 5.5, 4.3, 4.4). Hecho cuando: tras 14 días de juego simulados, las estrellas y la forma evolucionan de manera explicable línea a línea en el log.

Paso 20. Gráfica de forma. Visualización de CTL, ATL y TSB desde `rider_daily_log` en el perfil, con la forma en estrellas y la frescura en barra (nunca números internos). Hecho cuando: se distingue a simple vista un bloque de carga de un afinamiento.

### Fase 5 - El motor (pasos 21 a 27, 8 a 12 sesiones; la fase reina)

Paso 21. Andamiaje del motor. Tipos de `StageInput` y salidas, mulberry32 con subflujos nominales, `sampleProfile` de tramos a bloques de 100 metros, `constants.ts` con todas las constantes del SPEC 6 comentadas. Hecho cuando: el muestreo de un perfil de prueba coincide con lo esperado bloque a bloque.

Paso 22. Física del corredor. Ley de velocidad con inercia (6.4), coste, tanque y drafting (6.5), cerillos con su asimetría (6.6), erosión (6.7); tests: la coronación toma de 250 a 400 metros, la rampa del 8% desangra en bloque y medio, el sprinter erosionado pierde punta. Hecho cuando: los tests de física pasan y son legibles como documentación.

Paso 23. Grupos, relojes y riesgos. Estado de grupos con `t_s` y `v_actual`, fusiones y capturas, marco de intensidades con `p = 1 - exp(-λ·dx)` (6.3, 6.8); arnés de invariancia de resolución comparando `dx = 0.1` contra `0.05`. Hecho cuando: la invariancia pasa con tolerancia del 5%.

Paso 24. Etapa llana completa. Fase de fuga con su sociología (6.10), controlador del pelotón con histéresis y desgaste de gregarios (6.9), banners (6.11), final de los últimos 2 km con trenes y sprint (6.12), log de eventos con plantillas. Hecho cuando: una simulación imprime una crónica coherente de principio a fin.

Paso 25. El simulador de consola y el primer balance. `pnpm sim` con escenarios parametrizables, implementación de los invariantes de llano del 6.17, y campaña de ajuste de intensidades hasta verde. Anotar cada giro de perilla en `docs/balance.md`. Hecho cuando: los invariantes de llano corren en CI y pasan.

Paso 26. Montaña y media montaña. Hazard de descuelgue con mezcla `w(g)`, muros con COL, finales en alto, cimas puntuables, ataques de IA en el decil más empinado; invariantes de montaña y de pendiente (puertos gemelos regular contra irregular). Hecho cuando: el Montecarlo de montaña pasa y una etapa reina produce brechas de 1 a 4 minutos.

Paso 27. Cierre del motor. CRI, cronoescalada y CRE (6.13), caídas e incidentes (6.14), `workUnits` y TSS derivado del gasto, sellado de `engine_version`, y el marcaje de la capa 4 (6.18) al final por ser recortable. Hecho cuando: toda la batería 6.17 está en verde en CI.

### Fase 6 - Carreras en el mundo (pasos 28 a 32, 5 o 6 sesiones)

Paso 28. Autoría de recorridos. Formato de datos para perfiles (tramos y banners), la vuelta de prueba de 5 etapas con variedad (llana, media, reina, CRI, llana), y el generador de altimetrías SVG desde `profile_json`. Hecho cuando: las cinco altimetrías se renderizan y la categoría de cada cima se deriva sola.

Paso 29. Convocatorias y órdenes en la web. `race_rosters`, consola de órdenes de etapa con las cinco capas (rol con selector de objetivo, mentalidad, esfuerzo, disparadores, disputas de banners), encolables para toda la vuelta; `team_tactics` para la IA. Hecho cuando: un usuario deja las órdenes de las 5 etapas en una sola visita.

Paso 30. El tick corre etapas. Constructor de snapshots (eff0 desde Banister, cerillos, órdenes), semilla, ejecución del motor, persistencia de resultados y clasificaciones, XP de carrera y TSS real, `stage_snapshots` para replays regenerables. Hecho cuando: el día de juego con etapa produce resultados, general actualizada y ganancias de atributos coherentes.

Paso 31. Resultados y replay. Tablas de resultados y clasificaciones, crónica como línea temporal de eventos, y la altimetría con marcadores de los momentos clave; el cursor animado por grupo queda como mejora dentro de este paso si el tiempo alcanza. Hecho cuando: un tercero entiende qué pasó en la etapa sin que nadie se lo explique.

Paso 32. Ensayo integral. Con dos cuentas de prueba y NPC de relleno, disputar la vuelta completa de 5 etapas a lo largo de 5 días de juego reales acelerados (ver paso 43), corrigiendo la fricción de integración. Hecho cuando: el bucle convocatoria, órdenes, relato, general funciona sin tocar la base de datos a mano.

### Fase 7 - El mundo vivo (pasos 33 a 37, 5 o 6 sesiones)

Paso 33. Génesis del mundo. Script `seed-world.ts`: equipos NPC en tres divisiones con filosofía, presupuesto, instalaciones y maillot SVG por semilla; unos 1,600 corredores con el servicio de nombres, edades sesgadas y techos NPC (SPEC 10). Hecho cuando: el mundo se genera reproducible desde `worldSeed` en menos de un minuto.

Paso 34. Calendario de temporada. Autoría de las 28 carreras del MVP repartidas en los 276 días de competición, con niveles y reglas de inscripción por división; Race France completa de 21 etapas con perfiles variados. Hecho cuando: el calendario se lista en la web y cada carrera tiene sus etapas cargadas.

Paso 35. IA de convocatorias. Selección semanal por carrera según filosofía del equipo, puntos, rol contractual, `team_trust` y deseos del corredor (`rider_race_prefs` con su UI). Hecho cuando: un ciclista de prueba con deseos marcados recibe convocatorias razonables y una no convocatoria baja su moral.

Paso 36. Contratos y ofertas. Ventanas de mercado, fórmula salarial, bandeja de ofertas con aceptar y rechazar, rescisión con cláusula, efectos de `team_trust` (SPEC 7.2). Hecho cuando: al cierre de temporada un corredor con puntos recibe 2 o 3 ofertas coherentes con su perfil.

Paso 37. Rollover de temporada. Envejecimiento, retiros NPC y neoprofesionales, ascensos y descensos de equipos, reinicio de puntos, generación del calendario siguiente (SPEC 2 y 11). Hecho cuando: el mundo cruza el día 364 y amanece la temporada 2 sin intervención.

### Fase 8 - Economía, noticias y pulido (pasos 38 a 42, 4 o 5 sesiones)

Paso 38. Economía. Salarios semanales, tablas de premios, compras de staff con coste mensual y sus efectos (SPEC 9), libro de transacciones en el perfil. Hecho cuando: el balance de un corredor cuadra contra su historial a mano.

Paso 39. Noticias. Generador templado desde eventos (victorias, fugas, contratos, lesiones, récords del mundo del juego), feed global y personal. Hecho cuando: tras una etapa reina, el feed cuenta la historia sin repetirse.

Paso 40. Rankings y palmarés. Ranking individual de puntos, palmarés permanente en el perfil, página de la carrera con su historial. Hecho cuando: el ganador de Race France queda inmortalizado y enlazable.

Paso 41. Incorporación y pulido de UX. Flujo de primera sesión que explique estrellas, cerillos y forma en tres pantallas; estados vacíos; revisión completa en móvil; accesibilidad básica. Hecho cuando: un amigo sin contexto crea ciclista y deja órdenes sin preguntarle nada a usted.

Paso 42. Legal y operación. Verificación en TMview (EUIPO) y USPTO del nombre Cycling Star y de los nombres Race del calendario; aviso de privacidad (IP transitoria, correo); respaldo nocturno de Postgres (los respaldos de Railway si su plan los incluye y, en todo caso, un `pg_dump` programado); Sentry en plan gratuito. Hecho cuando: existe un documento de operación con restauración probada una vez.

### Fase 9 - Alfa, beta y salida (pasos 43 a 48, corre en calendario)

Paso 43. Alfa comprimida. Variable `TICK_INTERVAL_MINUTES` para un mundo de staging a un tick cada 10 minutos: dos temporadas completas en unos 5 días de reloj. Jugarla usted solo, con lista de fricciones. Hecho cuando: el rollover, el mercado y el envejecimiento sobreviven a dos temporadas aceleradas.

Paso 44. Campaña de balance macro. Script que simula temporadas completas sin UI y valida invariantes de temporada: distribución de puntos por perfil, que ningún arquetipo domine el ranking, que la fuga gane su cuota anual, que el 90% de corredores top tenga entre 50 y 80 días de carrera. Hecho cuando: el informe de temporada sintética se parece a una temporada ciclista de verdad.

Paso 45. Reclutamiento. Página de espera con capturas y el pitch de una frase; reclutar en comunidades de juegos de gestión (la diáspora de Hattrick y Footstar es exactamente su público) y foros ciclistas hispanohablantes, con transparencia de proyecto personal. Objetivo: 40 a 60 registros para que queden 20 a 50 activos. Hecho cuando: la lista supera los 40 correos.

Paso 46. Telemetría mínima. Tabla de eventos propia (registro, creación, orden dejada, visita, convocatoria vista) sin herramientas invasivas; panel simple de retención por semana y órdenes por usuario. Hecho cuando: usted puede responder "¿cuántos dejaron órdenes esta semana?" con una consulta.

Paso 47. Beta, temporada 1. Mundo real a cadencia real, canal de Discord para el feedback, parches semanales que solo tocan constantes y UI (jamás el contrato del motor a mitad de temporada), notas de parche públicas. Hecho cuando: la temporada 1 termina con el mundo íntegro y los usuarios discutiendo el mercado.

Paso 48. Revisión de salida del MVP. Contrastar métricas contra los criterios de la sección 1, entrevistar a 5 usuarios, decidir la v1.1 (fundación de equipos primero) y escribir el post mortem en `docs/`. Hecho cuando: existe una decisión escrita de continuar, pivotar o pausar, con evidencia.

## 5. Estimación honesta

Cada paso está pensado para una sesión de 1 a 3 horas con Claude Code. Son 48 pasos: entre 60 y 110 horas de trabajo enfocado hasta abrir la beta, que a un ritmo de 8 a 10 horas semanales significa de 8 a 12 semanas, más las 13 semanas de calendario de la temporada beta corriendo sola. No conozco su disponibilidad real, así que tome la horquilla como lo que es: una estimación de artesano, no una promesa. La fase 5 es la reina y la más incierta; si algo se desborda, será ahí, y por eso el marcaje quedó al final de esa fase como pieza recortable.

## Apéndice A - CLAUDE.md inicial

```markdown
# CLAUDE.md - Convenciones de Cycling Star

## Documentos rectores
- SPEC.md es la fuente de verdad del diseño. MVP.md es el plan. Ante conflicto, SPEC.md manda y se corrige MVP.md.
- Cada sesión implementa UN paso de MVP.md. Lee el paso y sus secciones del SPEC antes de proponer un plan. No escribas código sin plan aprobado.

## Código
- TypeScript estricto en todo. Prohibido `any`. Zod en todos los bordes de entrada.
- Monorepo pnpm: apps/api (Fastify), apps/web (React+Vite+Tailwind), packages/engine, packages/db (Drizzle), packages/shared.
- packages/engine es puro: jamás importa de db, jamás usa Date.now() ni Math.random(). Todo azar viene del RNG sembrado con subflujos nominales.
- Toda constante de juego vive en packages/engine/src/constants.ts con comentario de intención. Cambios de constantes se anotan en docs/balance.md.
- Todo cambio de comportamiento del motor incrementa engine_version.
- Migraciones solo con drizzle-kit; nunca SQL manual en producción.

## Tests
- vitest. En packages/engine: tests primero, incluidos los invariantes de SPEC 6.17 y la invariancia de resolucion.
- pnpm typecheck && pnpm test en verde antes de cerrar cualquier paso.

## Despliegue
- Railway: servicio web (API + estaticos) y servicio tick (cron 0 */6 * * *, el proceso termina).
- Las migraciones corren al arrancar el servicio, con advisory lock.

## Estilo de trabajo
- Commits pequeños con el numero de paso. Rama por fase.
- Si una decision no esta en SPEC.md, no la inventes: propon opciones y espera.
```

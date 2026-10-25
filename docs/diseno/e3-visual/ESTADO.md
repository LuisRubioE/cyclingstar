# E3 · Estado del proceso de diseño

Estado: **terminado** el 22 de octubre de 2026, a la espera de que conteste el dueño. Empezado el 20 de octubre de 2026 sobre `58c14da` (`main`,
con E2 en producción desde el 10 de octubre y el motor v91). El documento final es
`docs/visual.md`. Se actualiza este fichero al terminar cada fase, con commit y push, para poder
retomar el trabajo si la sesión se corta.

## Hecho

- Fase 0a, el brief: `00-encargo.md`, con la tabla de lo que el código de hoy desmiente del encargo
  (§2: E2 en producción, el viaje y el techo del entrenador ya arreglados, las 12 candidatas del
  maillot, Tailwind v4 sin `tailwind.config`, la web instalable inexistente), y
  `00-fase-mapas.md`, las instrucciones de los cinco cartógrafos.
- El entorno de trabajo en el scratchpad: un clon de `58c14da` con `pnpm install --frozen-lockfile`
  (6 s con el almacén en caché) y `pnpm build` en verde (31 s; la entrada de la web pesa 210 KB y
  66 KB con gzip), y un entorno de Python con `colour-science` 0.4.7 y `colorspacious` para la
  simulación de daltonismo.

- Fase 0b, los cinco mapas (20 de octubre de 2026), unas 1.720 líneas:
  - `mapas/01-web.md`: dos sistemas visuales y medio, 146 botones con 109 combinaciones de clases, la
    marca por debajo del contraste AA, los estados sin diseñar, la regla de tablas en 7 de 15 y las
    banderas como el 91 % de la CSS.
  - `mapas/02-examen.md`: la vista previa se equivoca en las vueltas, el panel de los días no pinta
    los bloques, los planes solapados, y la frontera rota por los atributos internos de cualquier
    corredor en `/api/riders/:id`.
  - `mapas/03-maillots.md` y su medida (`03-maillots-medida.py`): la semilla del maillot es la
    identidad del equipo NPC (cambiarla crea un clon), gemelos en 302 de 310 pelotones, el maillot a
    13 px en `Watch`, el registro de la UCI que se encontró es el del logotipo y no el de las bandas.
  - `mapas/04-documentos.md`: 26 `[DUEÑO n]`, 53 `[DOC n]` y 23 contradicciones; el dueño no ha
    hablado del aspecto, el dorsal del equipo líder se quitó el 15 de agosto, la escala de estrellas
    del SPEC está vieja.
  - `mapas/05-pantallas.md` y `capturas/`: 98 capturas a 360 y a 1.280 px con sus medidas, la primera
    pintura simulada, la web sin red y el estado de la web instalable en octubre de 2026.
- La palabra del dueño sobre la señal de campeón («un maillot arco iris diferente»), con lo que dice
  la UCI de su marca, en `00-encargo.md` §7.1.
- `01-fase-propuestas.md` gana la lista de lo que los mapas cambian del encargo.

- Fase 1, las cuatro propuestas (20 y 21 de octubre de 2026), unas 2.770 líneas:
  - `propuestas/telefono.md` (698 l.): todo se especifica a 360 × 800; «se juega bien en un teléfono»
    es una prueba del CI de nueve comprobaciones con una línea base que solo baja; la web instalable
    pide a la red primero y nunca guarda la API; las banderas en un sprite; maillot de 12 colores y 7
    figuras; el campeón, la estrella del juego sobre blanco.
  - `propuestas/sistema.md` (696 l.): el sistema lo hacen cumplir el compilador y los tests; el
    `@theme` cerrado con su deuda medida (2.457 de 6.322 clases) en un trinquete; 25 componentes y
    `QueryView` para los estados; el maillot como dato (`teams.jersey_design`); el campeón, estrella
    dorada sobre azul marino con canesú dorado el mundial.
  - `propuestas/identidad.md` (675 l.): cada identidad con su forma reservada (la diagonal del
    campeón, los lunares del líder de la montaña); `kitDistance` como función única; 14 colores y 6
    figuras asignados por pelotón; la equipación en `team_kits` con historia; el campeón, una banda
    de honor diagonal; las variantes del dueño medidas y su versión más fuerte como alternativa.
  - `propuestas/lectura.md` (698 l.): cada pantalla contesta una pregunta y la respuesta va en la
    primera pantalla del teléfono, en cuatro capas; una sola función de precedencia para el tick y la
    vista previa; la frontera con `.strict()` por ruta y un test de que todo campo se lee; el campeón,
    la estrella del juego sobre cuerpo blanco reservado.
  - La propuesta `lectura` se cortó por el límite de uso del dueño durante su relectura final y se
    retomó al restablecerse.

- Fase 2, los tres jueces (21 de octubre de 2026): **los tres eligen `telefono`** (cobertura 8 de
  10, coherencia 8, 8 y 7, ejecutabilidad 7, 7,5 y 8, experiencia 9 en los tres). `juicios/codigo`
  (12 comprobaciones, 11 injertos, 13 objeciones), `juicios/cobertura` (9 comprobaciones) y
  `juicios/uso` (14 injertos, 13 objeciones), cada uno con su `.md` y su `.json`. En el gusto
  coinciden en la paleta A de `telefono` y la letra del sistema; en la señal de campeón, dos de tres
  prefieren la banda de honor de `identidad` y uno la estrella sobre marino de `sistema`; en el
  vocabulario del maillot hay tres opiniones distintas. Todo va a la página de opciones.

- Fase 3a, el arquitecto (21 de octubre de 2026): `juicios/veredicto.json` (base `telefono` por
  unanimidad; 34 injertos, 33 objeciones, 21 huecos, 26 contradicciones de hecho),
  `borrador/00-glosario.md`, `borrador/00-decisiones.md` (59 decisiones `D-nn` y 20 del dueño `DD-nn`)
  y `borrador/00-esqueleto.md` (21 secciones, de §0 a §20, unas 3.710 líneas en tres lotes). Valores
  por defecto de gusto: la paleta A de `telefono`, la letra del sistema, la banda de honor de
  `identidad` como señal de campeón, y los 12 colores de `telefono` con 6 figuras y la regla de
  contraste de `identidad`. El arreglo del clon del maillot es el PR 1 del plan.
- Fase 3d, la página de opciones (`opciones/index.html` y `opciones/medidas.py`), publicada para el
  dueño en <https://claude.ai/artifact/2EfAEEFWAF429zyaZc9ucX> (privada).
- `borrador/ensamblar.sh`, adaptado del de E2.

- **Las decisiones del dueño del 21 de octubre** (`00-encargo.md` §7.2 y §7.3, y `borrador/00-decisiones.md`
  §0, D-00a a D-00h): la paleta A y la letra del sistema; el campeón nacional viste su bandera, con
  una estrella dorada colocada país a país y las dos letras ISO desde 72 px; el mundial, blanco con
  una estrella de arcoíris en degradado; ningún maillot por debajo de 28 px, y vistas grandes (delante,
  detrás y culote) con las zonas del patrocinador; quince colores y siete figuras, sin repetir nunca
  un maillot, y sin maillots de equipo que se parezcan a una bandera; y bandera, nombre y maillot
  siempre juntos y en ese orden. La página de opciones, actualizada con lo decidido (versión 3).
- Fase 3b, los tres redactores (21 de octubre de 2026; L1 y L2 se cortaron por el límite de uso del
  dueño y se retomaron con sus decisiones): L1, §1 a §7 (1.335 líneas); L2, §8 a §13 (unas 1.320,
  con D-00f a D-00h); L3, §14 a §20 (940; el plan, 24 pasos y 42 PR).
- Fase 3c, el ensamblado: `borrador/visual-v0.md`, 3.586 líneas sin la cabecera, con los 34 injertos,
  33 objeciones y 21 huecos en algún bloque de cierre y dos remisiones ambiguas a otros documentos;
  `borrador/dudas.md` reúne lo que los redactores dejaron para la coherencia.

- Fase 4, los tres refutadores (21 y 22 de octubre de 2026; el de `uso` se cortó por el límite de uso
  del dueño y se retomó): **162 hallazgos**, 21 altos, 73 medios y 68 bajos (`codigo` 68,
  `cobertura` 51 y `uso` 43), repartidos por lote en `refutaciones/por-lote/` (L1 62, L2 51 y L3 49).
- La página de opciones, versión 4: la hoja de revisión de los 133 maillots nacionales (con la
  estrella por la regla de §9.5, las letras desde 72 px y los casos que revisar marcados) y una
  equipación de ejemplo en grande (delante, detrás y culote, con las zonas del patrocinador).

- **Más decisiones del dueño, del 22 de octubre** (`00-encargo.md` §7.4 a §7.7; `borrador/00-decisiones.md`
  §0, D-00i a D-00q): el modo oscuro opcional (claro por defecto); ninguna marca para el equipo líder;
  un cambio de maillot por temporada; el nacional sin estrella; `Undertrained` en lugar de `Rusty`;
  el TSS fuera; **sin web instalable, porque el dueño hará una app**; la prueba del teléfono en el CI;
  y el clon del maillot, borrado en el PR 1. Su idea de vender el premium solo en la web, con lo que
  dicen hoy las tiendas, queda para E8 (§7.7).
- Fase 5, los tres correctores (22 de octubre de 2026; L1 y L2 se cortaron por el límite semanal del
  dueño y se retomaron): L1, 58 aplicados y 4 en parte de 62; L2, 41 aplicados, 7 en parte y 3
  desestimados (los tres por la web instalable retirada) de 51; L3, 48 aplicados y 1 desestimado de
  49, más 24 remisiones. 58 cruzadas entre lotes. El plan queda en 41 PR (unas 85 sesiones,
  estimado), con las migraciones 0050 a 0054.
- La página de opciones, versiones 5 y 6: el nacional sin estrella, la reserva nueva (491 maillots
  permitidos y 458 distintos) y la paleta A en modo oscuro.

- Fase 6a, la coherencia (22 de octubre de 2026): las 58 cruzadas (31 aplicadas, 25 que ya estaban y 2
  para el orquestador), 12 arreglos propios (`K-001` a `K-012`), el glosario fundido y la v1 con
  `borrador/ensamblar.sh --comprobar` a 0 fallos.
- Fase 6b, los dos auditores (22 de octubre de 2026): **262 veredictos**, 257 cerrados, 5 desestimados
  con motivo y uno abierto (A-L1-007), en `refutaciones/auditorias-L1.json`, `-L2.json` y `-L3.json`.
  En 27 el propio auditor escribió lo que faltaba; el de L1 y L3 registró en `borrador/00-decisiones.md`
  las 122 decisiones de las secciones de sus lotes.
- Fase 6c, el cierre (22 de octubre de 2026): A-L1-007 cerrado con una medida (el filete claro del
  maillot, de 2,09 a 2,43:1, exento de 3:1 con su motivo, `medidas/filete.py`); las dos cruzadas del
  orquestador comprobadas; D-00f, D-56 y el esqueleto al día; los cuatro hallazgos desestimados con su
  porqué en §20.2; `refutaciones/resultado-final.json` (de los 162 hallazgos, 158 aplicados enteros y 4
  desestimados, ninguno en parte ni abierto); `borrador/00-cabecera.md`; y `medidas/`, la copia de los
  scripts del scratchpad que el documento cita, con su README, y sus rutas cambiadas en las secciones.
- Fase 7, el ensamblado (22 de octubre de 2026): `docs/visual.md`, 3.973 líneas, con
  `borrador/ensamblar.sh --final --comprobar` a 0 fallos y 0 avisos (34 de 34 injertos, 33 de 33
  objeciones y 21 de 21 huecos en algún bloque de cierre); la línea de estado de E3 en
  `docs/encargos.md` y su sección en `docs/diseno/README.md`; `prettier --check .` y `eslint .` en verde
  sobre la rama, en un clon; y el PR, solo con documentos, sin fusionar hasta que conteste el dueño:
  <https://github.com/LuisRubioE/cyclingstar/pull/306>.

## Pendiente

1. El dueño contestó el 25 de octubre de 2026: «Me parece bien todo» (`00-encargo.md` §7.8). Quedan
   suyas la hoja de los 133 maillots nacionales cuando la adjunte el PR 16a y la verificación de la
   marca de la UCI antes del lanzamiento.
2. Hecho el 25 de octubre de 2026: el PR del diseño, fusionado (#306, `912c5fa`), y el código de E3,
   abierto por el dueño. Lo que entra en cada PR, en `implementacion.md`.

## Cómo retomar si la sesión se corta

1. Mira qué ficheros existen en `mapas/`, `propuestas/`, `juicios/`, `borrador/` y `refutaciones/`,
   y compáralo con este fichero: la última fase con todos sus ficheros es la última terminada.
2. Las instrucciones de cada fase están en `00-fase-mapas.md` y en `01-fase-*.md` a `05-fase-*.md`
   (se escriben al empezar cada fase). Relanza solo los agentes cuyo fichero falte, con
   `00-encargo.md` y el fichero de su fase.
3. El scratchpad se pierde con la sesión. Para rehacerlo: `git clone` del repositorio en
   `<scratchpad>/repo`, `pnpm install --frozen-lockfile` y `pnpm build` dentro; y
   `python3 -m venv <scratchpad>/venv && <scratchpad>/venv/bin/pip install colour-science
colorspacious`. Las capturas se regeneran con el script de `capturas/`.

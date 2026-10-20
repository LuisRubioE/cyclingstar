# E3 · Estado del proceso de diseño

Estado: **en curso**, fase 1 (propuestas). Empezado el 20 de octubre de 2026 sobre `58c14da` (`main`,
con E2 en producción desde el 10 de octubre y el motor v91). El documento final será
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

## En curso

- Fase 1, las cuatro propuestas (`propuestas/telefono.md`, `sistema.md`, `identidad.md` y
  `lectura.md`), de dos en dos, con `01-fase-propuestas.md`.

## Pendiente

1. Fase 2, tres jueces y el veredicto (`juicios/`).
2. Fase 3, la síntesis (`borrador/`: esqueleto, glosario, decisiones, tres lotes de redacción y la
   v0) y la página de opciones para el dueño (`opciones/`).
3. Fases 4 a 6: cuatro refutadores, tres correctores, la coherencia, tres auditores y el cierre
   (`refutaciones/`).
4. Fase 7: el ensamblado de `docs/visual.md`, las líneas de estado de E3 en `docs/encargos.md` y su
   sección en `docs/diseno/README.md`, y el PR, solo con documentos y sin fusionar hasta que conteste
   el dueño.

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

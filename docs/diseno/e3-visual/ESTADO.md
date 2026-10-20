# E3 · Estado del proceso de diseño

Estado: **en curso**, fase 0 (mapas). Empezado el 20 de octubre de 2026 sobre `58c14da` (`main`,
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

## En curso

- Fase 0b, los cinco mapas (`mapas/01-web.md`, `02-examen.md`, `03-maillots.md`,
  `04-documentos.md`, `05-pantallas.md` y `capturas/`), de dos en dos.

## Pendiente

1. Fase 1, cuatro propuestas independientes (`propuestas/`).
2. Fase 2, tres jueces y el veredicto (`juicios/`).
3. Fase 3, la síntesis (`borrador/`: esqueleto, glosario, decisiones, tres lotes de redacción y la
   v0) y la página de opciones para el dueño (`opciones/`).
4. Fases 4 a 6: cuatro refutadores, tres correctores, la coherencia, tres auditores y el cierre
   (`refutaciones/`).
5. Fase 7: el ensamblado de `docs/visual.md`, las líneas de estado de E3 en `docs/encargos.md` y su
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

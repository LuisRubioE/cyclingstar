# E2 · Fase 2: instrucciones comunes a los tres jueces

Lee antes `00-encargo.md`, `01-fase-propuestas.md`, los siete mapas de `mapas/` y las **cinco
propuestas** de `propuestas/` enteras (`television.md`, `estado.md`, `producto.md`, `datos.md`,
`ingeniero.md`; unas 4.600 líneas). Modelo de formato y densidad: `docs/diseno/e1-generador/juicios/`
y su `veredicto.json`.

Cada juez tiene un foco distinto y escribe dos ficheros: `juicios/<foco>.md` (150-250 líneas) y
`juicios/<foco>.json`. No leas los juicios de los otros jueces.

## Lo que contiene `juicios/<foco>.md`

1. **Tabla cruzada**: entre 15 y 25 ítems propios de tu foco (filas) por las cinco propuestas
   (columnas), con una celda de una línea por cruce: qué propone y si vale. Los ítems salen del
   encargo (sus seis puntos), de los mapas (los [DUEÑO n] y [DOC n] del mapa 05, las 48 superficies
   del mapa 03, los bancos B1-B8 del mapa 07, la tabla de datos del mapa 06 §9) y de tu foco.
2. **Comprobaciones en código**: al menos cuatro afirmaciones de las propuestas que hayas verificado
   tú contra el código o midiendo en el scratchpad, con el resultado (cierta / falsa / a medias) y la
   línea. Las propuestas se contradicen en varios puntos (p. ej. si hay o no reloj absoluto, si
   hace falta subir `ENGINE_VERSION`, cuánto ocupa la línea temporal, si el campeón nacional es
   derivable hoy): resuelve las contradicciones que caigan en tu foco, con evidencia.
3. **Puntuaciones** de 1 a 10 en cuatro ejes para cada propuesta: cobertura, coherencia con el
   motor y los datos, ejecutabilidad, experiencia del jugador. Con justificación de tres a cinco
   líneas por propuesta.
4. **Ganadora** como base de la síntesis, y por qué.
5. **Injertos**: lo que hay que traer de cada una de las otras cuatro a la ganadora, por sección y
   con el porqué. Sé concreto: «de `datos.md` §10.3, la tabla `stage_timelines` en `bytea` con
   gzip, porque…». Entre 8 y 20 injertos.
6. **Objeciones a la ganadora** que la síntesis tiene que resolver, numeradas.
7. **Lo que ninguna propuesta resuelve** (los huecos), porque la síntesis tendrá que inventarlo.

## Lo que contiene `juicios/<foco>.json`

```json
{
  "foco": "…",
  "ganadora": "television | estado | producto | datos | ingeniero",
  "puntuaciones": [{ "propuesta": "…", "cobertura": 0, "coherencia": 0, "ejecutabilidad": 0, "experiencia": 0, "justificacion": "…" }],
  "injertos": [{ "id": "I-<foco>-01", "de": "datos", "seccion": "§10.3", "que": "…", "porque": "…" }],
  "objeciones": [{ "id": "O-<foco>-01", "seccion_ganadora": "§…", "que": "…", "evidencia": "…" }],
  "huecos": [{ "id": "H-<foco>-01", "que": "…" }],
  "comprobaciones": [{ "afirmacion": "…", "propuesta": "…", "resultado": "cierta | falsa | a medias", "evidencia": "fichero l. n" }]
}
```

## Reglas

- Las de `00-encargo.md` §4. Sé duro y concreto: un juicio que reparte ochos no sirve.
- No modifiques el repositorio salvo tus dos ficheros. Informe final de 12 líneas.

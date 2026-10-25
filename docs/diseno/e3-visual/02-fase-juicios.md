# E3 · Fase 2: instrucciones comunes a los tres jueces

Lee antes `00-encargo.md`, `01-fase-propuestas.md`, los cinco mapas de `mapas/`, las capturas que
necesites de `capturas/` y las **cuatro propuestas** de `propuestas/` enteras (`telefono.md`,
`sistema.md`, `identidad.md`, `lectura.md`). Modelo de formato y densidad:
`docs/diseno/e2-retransmision/juicios/` y su `veredicto.json`.

Cada juez tiene un foco distinto y escribe dos ficheros: `juicios/<foco>.md` (120 a 200 líneas) y
`juicios/<foco>.json`. No leas los juicios de los otros jueces.

## Los tres focos

- **`cobertura`**: cobertura del encargo y fidelidad al dueño. Los ocho puntos de `00-encargo.md`
  §1 y la tabla de su §2, los `[DUEÑO n]` y `[DOC n]` del mapa 04, lo que `docs/retransmision.md`
  deja a E3, los siete componentes que nombra el encargo, las cinco categorías de maillot, la
  prohibición del arcoíris, y las decisiones que una propuesta toma y son del dueño sin decirlo.
- **`codigo`**: coherencia con el código de hoy y coste. Cada afirmación sobre el código, contra el
  repositorio; Tailwind v4 de verdad (el `@theme`, sin `tailwind.config`); el peso y la primera
  pintura; la web instalable con el servidor y la caché de hoy, y con lo que E2 sirve según lo visto;
  la regla de la frontera contra los mecanismos que ya existen; los tests que se re-sellan; el plan
  PR a PR y si cada paso deja el juego desplegable.
- **`uso`**: ejecutabilidad y experiencia en el teléfono. ¿Puede un agente que no tiene a quién
  preguntar implementar cada sección sin decidir nada? ¿Se lee mejor en un teléfono de 360 px?
  Mira las capturas; si una propuesta dibuja una pantalla, pruébala en el navegador si hace falta
  (`<scratchpad>/repo`, el Chromium de `/opt/pw-browsers`); re-mide los contrastes y los ΔE00 que den
  las propuestas con `<scratchpad>/venv`.

## Lo que contiene `juicios/<foco>.md`

1. **Tabla cruzada**: entre 12 y 20 ítems propios de tu foco (filas) por las cuatro propuestas
   (columnas), con una celda de una línea por cruce: qué propone y si vale.
2. **Comprobaciones**: al menos cuatro afirmaciones de las propuestas verificadas por ti contra el
   código, midiendo o mirando, con el resultado (cierta, falsa, a medias) y la evidencia. Resuelve
   las contradicciones de hecho entre propuestas que caigan en tu foco.
3. **Puntuaciones** de 1 a 10 en cuatro ejes para cada propuesta: cobertura, coherencia con el
   código, ejecutabilidad, experiencia en el teléfono. Con justificación de tres a cinco líneas por
   propuesta.
4. **Ganadora** como base de la síntesis, y por qué.
5. **Injertos**: lo que hay que traer de cada una de las otras tres a la ganadora, por sección y con
   el porqué. Concretos («de `identidad.md` §6, la estrella de cinco puntas en el pecho a 28 px,
   porque…»). Entre 6 y 15.
6. **Objeciones a la ganadora** que la síntesis tiene que resolver, numeradas.
7. **Lo que ninguna propuesta resuelve** (los huecos).
8. **Las decisiones de gusto**: para la paleta, la tipografía, la señal de campeón y el vocabulario
   del maillot, qué alternativas de las cuatro propuestas merecen estar en la página de opciones del
   dueño, y cuál recomiendas como valor por defecto.

## Lo que contiene `juicios/<foco>.json`

```json
{
  "foco": "cobertura | codigo | uso",
  "ganadora": "telefono | sistema | identidad | lectura",
  "puntuaciones": [
    {
      "propuesta": "…",
      "cobertura": 0,
      "coherencia": 0,
      "ejecutabilidad": 0,
      "experiencia": 0,
      "justificacion": "…"
    }
  ],
  "injertos": [{ "id": "I-<foco>-01", "de": "…", "seccion": "§6", "que": "…", "porque": "…" }],
  "objeciones": [{ "id": "O-<foco>-01", "seccion_ganadora": "§…", "que": "…", "evidencia": "…" }],
  "huecos": [{ "id": "H-<foco>-01", "que": "…" }],
  "comprobaciones": [
    {
      "afirmacion": "…",
      "propuesta": "…",
      "resultado": "cierta | falsa | a medias",
      "evidencia": "fichero l. n, o la medida"
    }
  ],
  "gusto": [
    { "decision": "paleta | tipografia | campeon | maillot", "opciones": ["…"], "defecto": "…" }
  ]
}
```

## Reglas

- Las de `00-encargo.md` §6. Sé duro y concreto: un juicio que reparte ochos no sirve.
- No modifiques el repositorio salvo tus dos ficheros. Informe final de 12 líneas.

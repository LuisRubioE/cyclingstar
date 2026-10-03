# E2 · Fase 4 a 6: refutación adversaria, corrección, coherencia y auditoría

Se aplica sobre `borrador/retransmision-v0.md` (el ensamblado de las secciones de `borrador/`).
Modelo: `docs/diseno/e1-generador/refutaciones/` (`hallazgos-parciales.json`,
`correcciones-parciales.json`, `auditorias.json`, `resultado-final.json`) y el Apéndice C de
`docs/tactica.md`.

## 4. Los cuatro refutadores (en paralelo, cada uno su fichero)

Cada refutador lee `00-encargo.md`, `borrador/00-decisiones.md`, `borrador/00-glosario.md` y el
borrador entero, y busca FALLOS, no opiniones. Escribe `refutaciones/hallazgos-<foco>.json`, una
lista de objetos con este formato exacto:

```json
{
  "id": "R<foco>-001",
  "seccion": "§7.3",
  "linea": 1234,
  "gravedad": "alta | media | baja",
  "afirmacion": "cita literal del borrador",
  "fallo": "por qué es falso, incoherente o insuficiente, con evidencia (fichero y línea del código, o medida)",
  "correccion": "el texto o la decisión que lo arregla, escrito para que un corrector lo aplique sin pensar"
}
```

Focos:

- **codigo**: cada afirmación sobre el código de hoy (ficheros, líneas, tipos, columnas, rutas,
  tests, cifras) comprobada contra el repositorio real, y cada tipo TypeScript del borrador
  comprobado contra los tipos reales que extiende o sustituye; cada «no sube `ENGINE_VERSION`»,
  cada «la huella queda idéntica», cada tamaño y cada duración, re-medidos en el scratchpad
  cuando sea posible. Objetivo: entre 60 y 150 hallazgos.
- **cobertura**: el encargo punto por punto, los [DUEÑO n] y [DOC n] del mapa 05, las 48 superficies
  del mapa 03 más las fugas nuevas de los juicios, los B1-B8 del mapa 07, la tabla del mapa 06 §9,
  las cinco categorías de maillot, la contrarreloj, el que vuelve tras una semana, el acta
  compartible, el título de pestaña, los correos, E10: qué falta, qué está a medias, qué se
  contradice entre secciones. Objetivo: entre 40 y 100 hallazgos.
- **dueno**: contra las palabras del dueño (mapa 05, con las citas de `docs/balance.md`): la
  televisión como norte, el «sentarse a verla», los maillots de la escapada, la radio como
  instrumento suyo, un solo vocabulario, la doctrina de versiones, lo que pidió y el borrador
  cambia sin decirlo, y las decisiones que el borrador toma y son del dueño sin estar en la
  sección de decisiones del dueño. Objetivo: entre 30 y 80 hallazgos.
- **coste**: coste y riesgo: el tick (1.418 etapas por temporada, picos de 187), el tamaño en disco
  y por la red, el coste de cada lectura con horizonte, la caché, el móvil, el CI (typecheck 37 s,
  `test:rapido` 9 min), la migración y el reinicio, la reversibilidad de cada paso, lo que rompe
  la línea de táctica, los pasos del plan sin test o con un test que no prueba lo que dice, y las
  estimaciones presentadas como medidas. Objetivo: entre 40 y 100 hallazgos.

Un hallazgo sin evidencia no vale. Un hallazgo de estilo no vale (salvo rayas en medio de frase,
que sí, porque es regla). Informe final de 12 líneas con el recuento por gravedad.

## 5. Los correctores (en paralelo, uno por lote del esqueleto)

Cada corrector recibe un lote de secciones y TODOS los hallazgos que apuntan a ellas (los cuatro
ficheros filtrados por `seccion`). Aplica cada uno al fichero de la sección en `borrador/` y
escribe `refutaciones/correcciones-<lote>.json`: por hallazgo, `{ "id", "estado": "aplicado |
parcial | desestimado", "donde": "fichero y línea", "motivo" }`. Se desestima solo con motivo
escrito y evidencia; si dos hallazgos se contradicen, se aplican las dos caras en el texto como
hace el Apéndice C de `docs/tactica.md`. Un hallazgo que pide cambiar una decisión de
`00-decisiones.md` se aplica solo si trae evidencia nueva, y entonces se actualiza también
`00-decisiones.md`.

## 6. Coherencia y auditoría

- **Coherencia** (un agente): relee el borrador entero tras las correcciones y arregla nombres,
  cifras, numeraciones y referencias cruzadas que no casen entre secciones; funde el glosario;
  escribe `borrador/dudas.md` con lo que no pueda cerrar.
- **Auditoría** (varios agentes, por lote): vuelven a mirar cada hallazgo uno a uno contra el
  texto de HOY (no contra los informes de corrección) y escriben `refutaciones/auditorias-<lote>.json`
  con `{ "id", "veredicto": "cerrado | parcial | abierto", "evidencia": "fichero y línea" }`.
- **Cierre** (un agente): funde las auditorías en `refutaciones/resultado-final.json` (formato del
  de E1: total, por gravedad, por sección, desestimados con motivo) y escribe
  `borrador/00-cabecera.md`: la cabecera de `docs/retransmision.md` con la procedencia en una
  línea (mapas, propuestas, jueces, base, injertos, refutadores, hallazgos, aplicados enteros,
  en parte, desestimados con su porqué en el apéndice) como la de `docs/tactica.md`.

## 7. Ensamblado final

Se concatena la cabecera y las secciones en `docs/retransmision.md`. Se comprueba que no queden
rayas en medio de frase, ni bloques «Propuesto para el glosario», ni «Decisión tomada aquí» sin
fundir, ni referencias a `borrador/`. Se actualiza `docs/encargos.md` (E2 pasa a «diseño escrito,
sin implementar», con el fichero) y `docs/diseno/README.md` (nuevo directorio
`e2-retransmision/`, qué se queda y qué es andamio).

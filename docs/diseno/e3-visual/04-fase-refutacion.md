# E3 · Fases 4 a 6: refutación adversaria, corrección, coherencia y auditoría

Se aplica sobre `borrador/visual-v0.md` (el ensamblado de las secciones de `borrador/`). Modelo:
`docs/diseno/e2-retransmision/refutaciones/` (`hallazgos-*.json`, `correcciones-L*.json`,
`auditorias-L*.json`, `resultado-final.json`) y su `04-fase-refutacion.md`. E3 es mediano: tres
refutadores, tres correctores (uno por lote), una pasada de coherencia y dos auditores.

## 4. Los tres refutadores (en paralelo, de dos en dos, cada uno su fichero)

Cada refutador lee `00-encargo.md`, `borrador/00-decisiones.md`, `borrador/00-glosario.md` y el
borrador entero, y busca FALLOS, no opiniones. Escribe `refutaciones/hallazgos-<foco>.json`, una lista
de objetos con este formato exacto:

```json
{
  "id": "R<foco>-001",
  "seccion": "§7.3",
  "linea": 1234,
  "gravedad": "alta | media | baja",
  "afirmacion": "cita literal del borrador",
  "fallo": "por qué es falso, incoherente o insuficiente, con evidencia (fichero y línea del código, captura o medida)",
  "correccion": "el texto o la decisión que lo arregla, escrito para que un corrector lo aplique sin pensar"
}
```

Focos:

- **`codigo`**: cada afirmación sobre el código de hoy (ficheros, líneas, tipos, columnas, rutas,
  tests, clases de Tailwind, cifras) comprobada contra el repositorio real; cada tipo TypeScript y
  cada esquema Zod del borrador comprobado contra lo que extiende o sustituye; cada token comprobado
  contra el Tailwind 4.3.3 del clon (¿resuelve la utilidad que se nombra?); cada contraste y cada ΔE00
  re-medido con `<scratchpad>/venv`; cada migración comprobada contra `packages/db/src/schema.ts` y
  las reglas de drizzle-kit. Objetivo: entre 40 y 100 hallazgos.
- **`cobertura`** (y el dueño): el encargo punto por punto (`00-encargo.md` §1, §2 y §7.1), los
  `[DUEÑO n]` y `[DOC n]` del mapa 04, lo que `docs/retransmision.md` deja a E3, los siete
  componentes del encargo con todos sus estados, las cinco categorías de maillot, la web instalable,
  el examen práctico entero, la regla de la frontera; qué falta, qué está a medias, qué se contradice
  entre secciones, y las decisiones que el borrador toma y son del dueño sin estar en su sección de
  decisiones. Objetivo: entre 30 y 70 hallazgos.
- **`uso`** (el teléfono, la accesibilidad y la ejecutabilidad): cada pantalla dibujada, mirada a 360
  px contra las capturas de hoy; los objetivos táctiles, la letra mínima y el contraste de cada
  componente; el daltonismo de cada maillot y de cada estado; el criterio de aceptación del teléfono
  (¿se puede medir de verdad con lo que dice?); y el plan: pasos sin test o con un test que no prueba
  lo que dice, costes irreales, pasos que dejan el juego sin desplegar, estimaciones presentadas como
  medidas, y lo que un agente sin a quién preguntar no podría implementar sin decidir. Objetivo: entre
  30 y 70 hallazgos.

Un hallazgo sin evidencia no vale. Un hallazgo de estilo no vale (salvo rayas en medio de frase, que
sí, porque es regla). Informe final de 12 líneas con el recuento por gravedad.

## 5. Los correctores (uno por lote del esqueleto)

Cada corrector recibe un lote de secciones y TODOS los hallazgos que apuntan a ellas (los tres
ficheros filtrados por `seccion`, que el orquestador reparte en `refutaciones/por-lote/L<n>.json`).
Aplica cada uno al fichero de la sección en `borrador/` y escribe
`refutaciones/correcciones-L<n>.json`: por hallazgo, `{ "id", "estado": "aplicado | parcial |
desestimado", "donde": "fichero y línea", "motivo" }`. Se desestima solo con motivo escrito y
evidencia; si dos hallazgos se contradicen, se aplican las dos caras en el texto. Un hallazgo que pide
cambiar una decisión de `00-decisiones.md` se aplica solo si trae evidencia nueva, y entonces se
actualiza también `00-decisiones.md`. Lo que obligue a tocar una sección de otro lote no se toca: va a
`refutaciones/cruzadas-L<n>.json` como `{ "id", "seccion_destino", "que" }`.

## 6. Coherencia, auditoría y cierre

- **Coherencia** (un agente): aplica las cruzadas, relee el borrador entero tras las correcciones y
  arregla nombres, cifras, numeraciones y referencias cruzadas que no casen entre secciones; funde el
  glosario; escribe `refutaciones/coherencia.json` (una fila por cruzada y por arreglo) y
  `borrador/dudas.md` con lo que no pueda cerrar.
- **Auditoría** (dos agentes, con las instrucciones de `05-fase-auditoria.md`).
- **Cierre** (el orquestador): funde las auditorías en `refutaciones/resultado-final.json` (total, por
  gravedad, por foco, por sección, desestimados con motivo) y escribe `borrador/00-cabecera.md`: la
  cabecera de `docs/visual.md` con la procedencia en una línea (mapas, propuestas, jueces, base,
  injertos, refutadores, hallazgos, aplicados enteros, en parte, desestimados con su porqué en un
  apéndice).

## 7. Ensamblado final

Se concatenan la cabecera y las secciones en `docs/visual.md` con `borrador/ensamblar.sh --final
--comprobar`. Se comprueba que no queden rayas en medio de frase, ni bloques «Propuesto para el
glosario», ni referencias a `borrador/`. Se actualizan las líneas de estado de E3 en
`docs/encargos.md` y su sección en `docs/diseno/README.md`.

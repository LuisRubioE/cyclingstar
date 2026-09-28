# E2 · Fase 6b: instrucciones comunes a los auditores por lote

Cada auditor recibe un lote (L1 a L10) y vuelve a mirar, UNO A UNO, cada hallazgo de
`refutaciones/por-lote/L<n>.json` y cada cruzada dirigida a sus secciones (las de
`refutaciones/cruzadas-L*.json` con `seccion_destino` en su lote, y las filas de
`refutaciones/coherencia.json` con ese destino) **contra el texto de HOY** de sus secciones en
`borrador/` (no contra los informes de corrección: `correcciones-L<n>.json` dice lo que el
corrector cree que hizo, y la auditoría comprueba si es verdad). Modelo:
`docs/diseno/e1-generador/refutaciones/auditorias.json` y el Apéndice C de `docs/tactica.md`.

Escribe `refutaciones/auditorias-L<n>.json`, una lista con un objeto por hallazgo y por cruzada:

```json
{ "id": "R…-nnn", "veredicto": "cerrado | parcial | abierto | desestimado_con_motivo",
  "evidencia": "fichero de sección y líneas donde está la corrección, o por qué no está",
  "accion": "nada | lo he cerrado yo: qué y dónde | necesita otra sección: cuál" }
```

Reglas:

1. `cerrado` solo si la corrección que pedía el hallazgo (o una mejor, con motivo) está en el texto.
   `parcial` si está a medias; di qué falta. `abierto` si no está. `desestimado_con_motivo` si el
   corrector lo desestimó y el motivo se sostiene (si no se sostiene, es `abierto`).
2. Lo `abierto` y lo `parcial` que sea pequeño y de tus secciones, ciérralo tú en el texto y di
   dónde (`accion`). Lo que toque otra sección, no lo toques: anótalo en `accion`.
3. Comprueba además, en tus secciones: que no hay rayas en medio de frase, que los bloques de
   código no están cortados, que cada «Decisión tomada aquí» está en `00-decisiones.md`, que cada
   nombre de tipo, constante, banco, test y ruta está en `00-glosario.md` con la misma grafía, y
   que las cifras que tus secciones comparten con otras coinciden. Cada fallo de estos va como un
   objeto más con `id` `A-L<n>-nnn` y veredicto `cerrado` si lo arreglas tú.
4. Sin commits. Informe final de 12 líneas con el recuento por veredicto y lo que dejas abierto.

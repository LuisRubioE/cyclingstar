# E4 · Fase 2: instrucciones comunes a los tres jueces

Lee antes `00-encargo.md` (con su §9.1, lo que el dueño ya decidió), `01-fase-propuestas.md`, los
cinco mapas de `mapas/`, las capturas que necesites de `capturas/` y las **tres propuestas** de
`propuestas/` enteras (`atacante.md`, `jugador.md`, `incremental.md`). Modelo de formato y densidad:
`docs/diseno/e3-visual/juicios/` y su `veredicto.json`.

Cada juez tiene un foco distinto y escribe dos ficheros: `juicios/<foco>.md` (120 a 200 líneas) y
`juicios/<foco>.json`. No leas los juicios de los otros jueces.

## Los tres focos

- **`codigo`**: el código y el coste. Cada afirmación de las propuestas sobre el código y sobre
  `better-auth`, contra el repositorio y contra el paquete instalado (1.6.25 en `<scratchpad>/repo`,
  1.7.26 en `<scratchpad>/mapa01/`); las opciones y los ganchos que dicen usar, si existen y hacen lo
  que dicen; las migraciones; el coste de cada PR; si cada paso deja producción desplegable con los
  usuarios que ya existen; los tests que se re-sellan.
- **`cobertura`**: la cobertura del encargo y la fidelidad al dueño. Los siete puntos de
  `00-encargo.md` §1, sus §2 y §3, las decisiones de §9.1 (ninguna propuesta puede resucitar el correo
  de juego, poner un canal de contacto ni añadir OAuth), los `[DUEÑO n]` y `[DOC n]` del mapa 04, lo que
  E2 y E3 dejaron a E4 (mapa 04 §7), las fronteras con E7, E8, E9 y E10, y las decisiones que una
  propuesta toma sin decirlo y son del dueño.
- **`seguridad`**: la seguridad y la experiencia en el teléfono. Recorre el modelo de amenazas
  (secuestro de cuenta, enumeración de correos, límites de intento, tokens y su caducidad, sesiones,
  el correo como vía de ataque, el panel del administrador raíz, la SSRF de las suscripciones de
  aviso, los datos de un menor) contra cada propuesta, y prueba en local lo que puedas (un límite, la
  enumeración por tiempo, una sesión tras recuperar). Y mira las capturas: ¿se usa bien en 360 px?,
  ¿qué ve el jugador cuando algo falla?, ¿qué le pasa al jugador de iPhone?

## Lo que contiene `juicios/<foco>.md`

1. **Tabla cruzada**: entre 12 y 20 ítems propios de tu foco (filas) por las tres propuestas
   (columnas), con una celda de una línea por cruce: qué propone y si vale.
2. **Comprobaciones**: al menos cinco afirmaciones de las propuestas verificadas por ti contra el
   código, midiendo o probando, con el resultado (cierta, falsa, a medias) y la evidencia. Resuelve las
   contradicciones de hecho entre propuestas que caigan en tu foco (por ejemplo, si el límite por
   cuenta necesita una tabla nueva o cabe en `verifications`, o qué hace de verdad `trustProxy` en
   Fastify 5.12.8).
3. **Puntuaciones** de 1 a 10 en cuatro ejes para cada propuesta: cobertura, coherencia con el
   código, seguridad, experiencia del jugador. Con justificación de tres a cinco líneas por propuesta.
4. **Ganadora** como base de la síntesis, y por qué.
5. **Injertos**: lo que hay que traer de cada una de las otras dos a la ganadora, por sección y con el
   porqué. Concretos («de `atacante.md` §4, el token en el fragmento `#token=`, porque…»). Entre 6 y 15.
6. **Objeciones a la ganadora** que la síntesis tiene que resolver, numeradas.
7. **Lo que ninguna propuesta resuelve** (los huecos).
8. **Las decisiones del dueño**: de las que proponen las tres (§19), cuáles son de verdad suyas, cuáles
   puede cerrar la síntesis, y para las de gusto (qué avisos van encendidos de serie, cuándo se pide el
   permiso, la pantalla del modo ausencia, la de sesiones, el texto de privacidad, el TOTP del
   administrador si alguna lo propone) qué alternativas merecen estar en la página de opciones y cuál
   recomiendas como valor por defecto.

## Lo que contiene `juicios/<foco>.json`

```json
{
  "foco": "codigo | cobertura | seguridad",
  "ganadora": "atacante | jugador | incremental",
  "puntuaciones": [
    {
      "propuesta": "…",
      "cobertura": 0,
      "coherencia": 0,
      "seguridad": 0,
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
  "duenio": [{ "decision": "…", "de_quien": "dueño | síntesis", "opciones": ["…"], "defecto": "…" }]
}
```

## Reglas

- Las de `00-encargo.md` §7. Sé duro y concreto: un juicio que reparte ochos no sirve.
- Trabaja en `<scratchpad>/juez-<foco>/`; no modifiques `<scratchpad>/repo` ni el repositorio salvo
  tus dos ficheros. Producción, solo GET de lectura. Informe final de 12 líneas.

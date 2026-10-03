# E2 · Fase 1: instrucciones comunes a las cinco propuestas

Lee antes `00-encargo.md` entero y los **siete mapas** de `mapas/` enteros (01 motor, 02 API y
tick, 03 web y destripe, 04 datos y tiempo, 05 dueño y docs, 06 televisión, 07 tests y
contratos). Son unas 2.100 líneas y son la base de hechos: **no repitas su lectura del código salvo
para comprobar algo que te parezca dudoso**, y si compruebas y el mapa se equivoca, dilo con la
línea. Después lee el código que tu lente necesite de verdad.

Cada propuesta es un **diseño completo** de E2 (cubre TODO el encargo), organizado desde una lente
distinta. No es un ensayo: es lo que un juez va a comparar con otras cuatro y lo que, si gana, se
convierte en `docs/retransmision.md`. Tamaño: **700 a 950 líneas**. Modelo de densidad:
`docs/diseno/e1-generador/propuestas/arquitectura.md`.

## Estructura obligatoria (misma numeración en las cinco, para que los jueces crucen)

0. **Resumen** (30-40 l.): la idea central, en qué se distingue de lo obvio, qué resuelve y qué deja.
1. **Diagnóstico**: qué falla hoy, con cita a los mapas (no repitas los mapas: apunta a ellos).
2. **Principios** (5 a 10, cada uno con su consecuencia en el diseño).
3. **El estado de la retransmisión**: tipos TypeScript completos (el estado en un instante, los
   grupos y su identidad, las diferencias, la línea temporal, el rótulo de corredor, los sucesos),
   y para CADA campo de dónde sale: existe hoy en el motor / hay que guardarlo al correr la etapa /
   se deriva al leer. Resuelve el problema del reloj (mapa 01 §1-2: el segundo es el del grupo, no
   hay reloj absoluto) y el de la identidad de grupos.
4. **Lo permanente y lo eventual**: qué está siempre en pantalla, qué solo cuando pasa, con tabla.
5. **El ritmo de la reproducción**: duración, velocidad, saltos, pausa, «ir al final», qué se
   comprime en la hora muerta y qué se conserva siempre; el caso del móvil.
6. **Los rótulos**: la regla de prioridad de maillots (UCI, mapa 06 §2), las cinco categorías del
   dueño, qué se enseña mientras E3 y E12 no existan, y el caso literal «cuando se escapan cinco».
7. **El modo sin destripe como propiedad del producto**: el modelo de «visto» por jugador (dónde
   vive, cómo avanza, qué pasa al volver tras una semana), el horizonte por jugador aplicado en el
   servidor a CADA superficie del inventario del mapa 03 §4, la API, el título de pestaña, los
   correos, las rutas públicas y el acta compartible (captación), la previa de N+1 que destripa N.
8. **El journal, la crónica y las noticias rehechos**: separación entre «estado en el km t» y
   «acta final» (mapas 05 §2 y 07 §1: la crónica de hoy ve el futuro); `news` con `seed` y `data`
   y `raceId`; plantillas re-renderizables e idénticas (mapa 07 §3); lo que E10 necesita.
9. **Las contrarrelojes**.
10. **El esquema y la API**: tablas, columnas, migraciones (la próxima libre es la `0043`, hay
    reinicio del mundo antes del lanzamiento así que no hace falta rellenar lo viejo), endpoints
    con tipos, presupuesto de peso (hoy 0,9-3 MB por etapa sin comprimir, mapas 02 y 07).
11. **Lo que el motor tiene que guardar al correr la etapa** (subir `ENGINE_VERSION` impide
    re-simular) y lo que se deriva al leer. Respeta la Frontera 3 de `docs/tactica.md`
    (`StageOutput` no gana campos: lo nuevo va como sucesos o en la foto por km) y conserva la
    foto por km y `pullFor` (mapa 05 §3: `raceLearning` los lee y el dueño caza defectos con la
    radio).
12. **Constantes**, con valor e intención.
13. **Bancos y tests**: invariantes medibles (nada de una etapa no vista sale del servidor; el
    estado en el km k es la reducción de los sucesos; cada escapado lleva rótulo; re-render
    idéntico; tamaño por etapa), usando los B1-B8 del mapa 07 §5 como punto de partida.
14. **Plan por pasos, tests primero**, con orden, dependencia y coste estimado en PR.
15. **Riesgos y fronteras** con E3, E6, E10, E12 y E13 (mapa 05 §4).
16. **Decisiones que son del dueño**, cada una con valor por defecto y consecuencia.

## Reglas

- Las de `00-encargo.md` §4 (castellano, citas de línea, medido frente a estimado, sin rayas en
  medio de frase, TypeScript estricto, textos de pantalla en inglés, informe final de 12 líneas).
- Escribe solo tu fichero `propuestas/<lente>.md`. No leas las propuestas de los demás.
- Puedes ejecutar código en el scratchpad para medir. No modifiques el repositorio.

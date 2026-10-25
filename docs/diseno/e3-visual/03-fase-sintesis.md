# E3 · Fase 3: la síntesis (esqueleto, glosario, decisiones, redacción por lotes y opciones)

La síntesis produce el borrador de `docs/visual.md` en `borrador/`, como hizo E2 en
`docs/diseno/e2-retransmision/borrador/` (mira su `00-esqueleto.md`, su `00-decisiones.md` y dos o
tres secciones como modelo de densidad). Se hace en cuatro pasos: UN arquitecto escribe el veredicto,
el esqueleto, el glosario y las decisiones cerradas; TRES redactores escriben las secciones, cada uno
su lote, obedeciendo al esqueleto; el orquestador las ensambla en `borrador/visual-v0.md`; y UN
agente construye la página de opciones del dueño.

## 3a. El arquitecto

Lee `00-encargo.md`, los cinco mapas, las cuatro propuestas y los tres juicios (`juicios/*.md` y
`juicios/*.json`), y mira las capturas que necesite. Escribe cuatro ficheros:

1. `juicios/veredicto.json`, en el formato de `docs/diseno/e2-retransmision/juicios/veredicto.json`:
   los tres juicios resumidos; la ganadora (por mayoría; si no la hay, por suma de puntuaciones, y
   dilo); la lista ÚNICA de injertos con id `I-nn`, origen, destino en el esqueleto y estado
   `pendiente`; las objeciones a la ganadora fundidas y numeradas `O-nn`; los huecos `H-nn`; las
   contradicciones de hecho entre propuestas `X-nn` con la resolución de los jueces y su evidencia; y
   las decisiones de gusto con las alternativas que irán a la página de opciones.
2. `borrador/00-glosario.md`: el vocabulario ÚNICO del documento final, para que tres redactores en
   paralelo no inventen tres nombres para la misma cosa: cada token (con su nombre de CSS y de
   utilidad de Tailwind), cada componente y su fichero, cada variante y cada estado, cada tipo
   TypeScript, cada constante, cada ruta o campo de la API que se toca, cada fichero de la web
   instalable, cada test y banco, cada paso del plan, y los términos de pantalla en inglés. Con una
   línea de definición por entrada. Si un redactor necesita algo nuevo, lo añade al final de su
   sección en un bloque «Propuesto para el glosario».
3. `borrador/00-decisiones.md`: cada contradicción de hecho o de diseño entre las propuestas,
   cerrada con una decisión `D-nn` y su evidencia (la paleta y sus valores, la tipografía, el modo
   oscuro, la densidad, la estrategia de las tablas en el teléfono, el vocabulario del maillot, la
   señal de campeón, el editor, el service worker y lo que nunca guarda, el mecanismo de la
   frontera, dónde viven los tokens, el criterio de aceptación del teléfono, el orden del plan…) y
   las decisiones del dueño `DD-nn` con su valor por defecto. Los redactores NO reabren estas
   decisiones.
4. `borrador/00-esqueleto.md`: la lista completa de secciones de `docs/visual.md`, en el orden final,
   con numeración `§N`, y para cada una: título, fichero `borrador/NN-<nombre>.md`, tamaño objetivo
   en líneas, qué contiene (con los tokens, componentes, tipos y tablas que tiene que escribir
   enteros), de qué secciones de qué propuestas sale, qué injertos recibe, qué objeciones resuelve y
   qué huecos rellena. Una tabla `§B` con una fila por sección (`| §N | título | borrador/NN-x.md |
líneas | lote |`), que es la que lee el ensamblado. El total objetivo es de **3.000 a 4.000
   líneas**, repartido en **tres lotes** de 1.000 a 1.400 líneas, con las dependencias entre lotes.

La estructura debe cubrir como mínimo: la cabecera y el resumen; el diagnóstico medido (con las
capturas); los principios; los fundamentos (paleta, tipografía, espaciado, rejilla, densidad, radios,
sombras, iconos); el catálogo de componentes con todos sus estados; el teléfono y su criterio de
aceptación medible; los maillots (el vocabulario y el editor del equipo, la señal de campeón, los
líderes y el dorsal, el patrocinador, el daltonismo medido, `WornJerseyIcon`); el examen práctico (el
cuadro de entrenamiento y el viaje); la web instalable; la regla de la frontera y su mecanismo; lo
que E2 dejó a E3; las constantes y los tokens; los tests y los bancos; **el plan por PR, tests
primero**, como el §17 de `docs/retransmision.md` (cada PR con lo que entra, sus tests antes que su
código, su dependencia, su coste, lo que ve el dueño al acabarlo y su marcha atrás); los riesgos y
las fronteras con E2, E4, E6, E8, E9, E10 y E12; **las decisiones del dueño**, como el §20 de
`docs/retransmision.md` (cada una con su valor por defecto razonado, lo que cambia si elige otra cosa
y cuándo hace falta la respuesta); y los apéndices (los injertos y dónde cayeron, las objeciones y lo
desestimado, la cobertura del encargo).

## 3b. Los redactores

Cada redactor recibe un lote del esqueleto. Lee `00-encargo.md`, `borrador/00-esqueleto.md`,
`borrador/00-glosario.md`, `borrador/00-decisiones.md`, `juicios/veredicto.json`, la propuesta
ganadora entera, y las secciones de las otras propuestas, de los mapas y las capturas que su lote
cita. Escribe solo los ficheros de su lote, en el registro de `docs/retransmision.md`: tokens con su
valor y su contraste medido, componentes con todos sus estados, pantallas dibujadas en texto con sus
textos en inglés, tipos en TypeScript estricto, citas de línea al código de hoy. Cada fichero empieza
por `## N. <título>` y acaba con una línea `---` seguida de los bloques de cierre: «Injertos
aplicados» (por id), «Objeciones resueltas» (por id), «Huecos rellenados» (por id), «Decisiones de
esta sección» (lo que el esqueleto dejó abierto y has decidido, `N-a`, `N-b`…) y, si hace falta,
«Propuesto para el glosario». Nada de rayas en medio de frase. Informe final de 12 líneas.

## 3c. El ensamblado

Lo hace el orquestador con `borrador/ensamblar.sh` (adaptado del de E2): concatena las secciones en
el orden de la tabla `§B` en `borrador/visual-v0.md`, quita los bloques «Propuesto para el glosario»
tras fundirlos en el glosario, comprueba que cada injerto, objeción y hueco del veredicto está en el
bloque de cierre de alguna sección, y anota en `borrador/dudas.md` las incoherencias entre secciones.

## 3d. La página de opciones

Un agente construye `opciones/index.html`: las cuatro decisiones de gusto (la paleta, la tipografía,
la señal de campeón y el vocabulario del maillot del equipo), cada una con su valor por defecto y sus
alternativas **lado a lado**, pintadas de verdad (los colores en una pantalla tipo del juego, las
fuentes en una tabla de resultados y un rótulo, los maillots en SVG a sus tamaños reales) y con su
**simulación de daltonismo calculada** (Machado 2009 en las tres dicromacias y una vista en grises,
con los ΔE00 que separan cada par y los contrastes WCAG, medidos con `<scratchpad>/venv` y escritos
en la página). Las instrucciones exactas se le dan al lanzarlo.

# Esqueleto de `docs/visual.md` (E3 · El sistema visual)

Este fichero es la ley de los redactores de la fase 3b. Tres redactores escriben a la vez, cada uno su lote, y lo único que impide que se contradigan son cuatro ficheros que se leen juntos: el vocabulario ÚNICO (`borrador/00-glosario.md`, con sus apartados `§G.n`), las decisiones cerradas (`borrador/00-decisiones.md`, de `D-01` a `D-59` y de `DD-01` a `DD-20`), la consolidación de los juicios (`juicios/veredicto.json`: injertos `I-nn`, objeciones `O-nn`, huecos `H-nn` y contradicciones de hecho `X-nn`) y este esqueleto: el resumen que abre el documento (§A), el índice con lo que cada sección tiene que contener (§B), los lotes (§C), las tablas de trazabilidad (§D) y lo que el esqueleto fija por su cuenta (§E).

Base: `propuestas/telefono.md`, elegida por los tres jueces (unanimidad; 96,5 puntos sumados de 120, frente a 87,5 de `sistema`, 86,5 de `lectura` y 71,5 de `identidad`; el cálculo, en `veredicto.json` → `ganadora`). El documento es una fusión y lo dice: de `telefono`, la estructura entera, la prueba del teléfono, la web instalable, la frontera por construcción y la paleta; de `sistema`, el sistema que se hace cumplir; de `identidad`, los maillots y la señal de campeón; de `lectura`, lo que hay debajo del examen. Son 34 injertos, 33 objeciones, 21 huecos y 26 contradicciones de hecho, todos con destino en §D.

### Reglas de redacción comunes (repetidas aquí porque cada redactor solo ve su lote)

1. Castellano, en el registro de `docs/retransmision.md` y `docs/generador.md`: preciso, sin relleno ni marketing, con tablas donde haya que comparar. La interfaz va en inglés (`Claude.md`): todo texto de pantalla se escribe en inglés entre comillas invertidas y se marca «(pantalla)» la primera vez que sale en cada subsección. Los que ya fija §G.12 del glosario se usan tal cual.
2. Nada de rayas ni guiones en medio de una frase (`00-encargo.md` §6, regla 3): ni la raya larga, ni la media, ni un guion suelto entre dos espacios. Se usan comas, paréntesis, dos puntos o punto. Las listas empiezan con un guion o con «1.» al principio de la línea y sin sangría. Los rangos se escriben sin espacios (`l. 459-468`) o «de 3 a 196 px». Un texto literal del código que lleve raya (`MODE_WHY`) va en un bloque de código o se resume sin ella.
3. Toda afirmación sobre el código cita fichero y líneas contra `58c14da` (hasta `e3e4010` no cambia nada fuera de `docs/`). Si el redactor lee otro árbol y las líneas se movieron, cita las nuevas y lo dice una vez al principio de su sección. Nada inventado: si no se sabe, «no lo sé» o «no está en el código».
4. Toda cifra dice si es **medida** (quién, con qué y sobre qué: «telefono §6.2, `kit.py`», «juez de cobertura, C7», «mapa 05 §12») o **estimada** (y de qué). No se rehacen medidas: entre dos cifras de propuestas, manda la que un juez re-midió (las de `veredicto.json` → `contradicciones`). Lo que un redactor tenga que medir de nuevo (solo lo que este esqueleto le pide) lo mide en `<scratchpad>/redactor-L<n>/` con un script nombrado y con `<scratchpad>/venv` (razón WCAG; ΔE00 tras Machado 2009 en las cuatro visiones). Nunca se edita un fichero del repositorio fuera de `docs/diseno/e3-visual/borrador/`, ni nada de `opciones/`.
5. Nombres: solo los del glosario, con su forma exacta. Un alias de una propuesta (§G.13) solo aparece en el apéndice de §20. Si falta un nombre, el redactor lo propone en su bloque «Propuesto para el glosario» y no renombra nada.
6. Decisiones: las de `00-decisiones.md` se escriben como hechos, con su evidencia, sin reabrirlas. Lo que este esqueleto deja abierto se decide en el bloque «Decisiones de esta sección» (`N-a`, `N-b`…: qué, por qué y qué se descarta). Si un redactor comprueba que una decisión es falsa contra el código, no la cambia: la escribe como está y abre una «Duda para el ensamblador» con la evidencia.
7. Tipos: TypeScript estricto, sin `any`, Zod en los bordes. Cada tipo se escribe entero en una sola sección (§4: las props de los diez componentes que usan las demás; §8: los tipos del maillot y `kitSchema`; §9: `WornJerseyIconProps`, `KitZone`, `SponsorOffer` y `applySponsor`; §11: los esquemas de la vista previa, de `days[]` y la firma de `resolveTrainingDay`; §13: los esquemas de resolución y `FRONTERA_SIN_USO`; §12: el manifiesto y `vitalsSchema`). Las demás secciones los citan por `§N.m`.
8. Constantes: por nombre, con su valor la primera vez que salen en la sección. §15 es el único sitio con la tabla entera.
9. `ENGINE_VERSION` es 91 (`packages/engine/src/constants.ts` l. 853) y **no sube** en E3. El único PR que toca `packages/engine/` es el 13b, con tres constantes que el motor no lee (D-37). Las migraciones son de la `0050` a la `0054`, con los nombres de §G.8.
10. Citas del dueño: textuales, entre «», con fichero, línea y versión (`docs/balance.md` l. 1842, v13). Nada va entre «» si no es cita. Los `[DUEÑO n]` y `[DOC n]` son los del mapa 04.
11. Decisiones del dueño: con su id (`DD-nn`) y su valor por defecto, que es el que se implementa. Si una sección encuentra otra decisión que es del dueño, la toma con un valor por defecto en «Decisiones de esta sección», marcada «(del dueño)», y el ensamblador la sube a §19.
12. Colores y maillots: todo hexadecimal lleva su contraste medido contra su fondo; todo «se distingue» lleva su ΔE00 en las cuatro visiones y el tamaño al que se midió.
13. Cada decisión, tomada; cada componente, con todos sus estados; cada pantalla, dibujada en texto con sus textos en inglés; cada constante, con valor e intención; cada paso del plan, con sus tests antes que su código. Nada «se podría».
14. Quien implemente será un agente que no tiene a quién preguntar (`00-encargo.md` §1): el texto se escribe contando con eso.

### Formato de cada fichero de sección

- La primera línea es `## N. Título`, con el título de §B. El fichero `00-cabecera.md` empieza con el título del documento, `# El sistema visual: diseñado desde el teléfono, medido y que se hace cumplir (diseño final)`, y sigue con `## 0. Cabecera y resumen`.
- Las subsecciones son `### N.m Título`, en el orden y con la numeración de los puntos de «Contiene» de §B, para que las referencias cruzadas `§N.m` entre lotes valgan. Se pueden añadir subsecciones al final; las fijadas no se renumeran ni se funden.
- Longitud: la de §B, con un margen de un 10 % arriba o abajo. El total del documento no puede pasar de 4.000 líneas.
- Al final del fichero, tras una línea `---`, los bloques de cierre, en este orden y con estas etiquetas: **Injertos aplicados** (`I-nn (§N.m)`), **Objeciones resueltas** (`O-nn (§N.m)`), **Huecos rellenados** (`H-nn (§N.m)`), **Decisiones de esta sección** (`N-a`, `N-b`…, o «ninguna») y, si hace falta, **Propuesto para el glosario** (nombre, definición de una línea y fichero) y **Dudas para el ensamblador**. Todo injerto, objeción y hueco que §B asigna a la sección aparece en su bloque; si uno no se pudo aplicar, se dice por qué.
- Informe final de cada redactor: 12 líneas como máximo (ficheros, líneas, decisiones tomadas aquí, lo que no pudo comprobar).

---

## A. Resumen ejecutivo provisional

Es el que abre el documento (§0.4): el orquestador lo escribe al cierre con estas diez ideas, en este orden y sin añadir otras. Las cifras son las de `00-decisiones.md`.

1. **El teléfono es la referencia y la prueba.** Todo se especifica a 360 × 800 y 320 × 640 px. «Se juega bien en un teléfono» es una prueba del CI con nueve comprobaciones con umbral (reflujo, recortes, letra, campos, objetivos, axe, la respuesta arriba, la acción bajo el pulgar, el alto) sobre `/_ui` y las 45 pantallas del mapa 05, con un trinquete que solo baja: E3 está terminado cuando está a cero.
2. **La respuesta arriba y la acción bajo el pulgar.** Cada pantalla marca lo que contesta y lo pone en los primeros 520 px; la acción vive en una barra fija con su consecuencia escrita; toda tabla es una fila de dos renglones con una acción, sin desplazarse de lado, con el top 20 y la fila propia anclada.
3. **Un sistema que se hace cumplir.** Los tokens en el `@theme` (la paleta «manager sobrio», la letra del sistema, un radio, dos sombras), un catálogo cerrado de componentes con todos sus estados en `data-*` y su página `/_ui`, diez reglas de lint y una deuda medida (2.457 apariciones de clase) que solo baja hasta que el tema se cierra en el último paso.
4. **La red mala es el caso normal.** La web se instala (manifiesto, iconos, metas de Apple) con un service worker escrito a mano que pide primero a la red y nunca guarda la API de E2; la sesión tiene tres estados, para que sin red nadie con sesión vea `Log in`; las banderas van en un sprite y la hoja que bloquea la primera pintura baja de 92,4 a 9,2 KB.
5. **El maillot del equipo es un dato con historia.** `team_kits`, doce colores con nombre separados para un daltónico y seis figuras dibujadas para 13 px; el reparto por rivales de temporada y la validación en el servidor dejan cero carreras con dos equipaciones a menos de 10 de ΔE00 en ninguna de las cuatro visiones (con su puerta medida); el editor dice con quién choca y en qué visión.
6. **La señal de campeón es la banda de honor.** Una diagonal reservada que ningún equipo lleva: oro sobre noche el mundial, los colores de su bandera sobre papel el nacional; a 45,7 de la marca de la UCI a 13 px. Las variantes del «maillot arco iris diferente» del dueño, juzgadas una a una, y la más fuerte (su espectro en la diagonal) como alternativa en la página de opciones.
7. **Lo primero, el clon.** El PR 1, independiente y pequeño, arregla el defecto vivo de producción: cambiar el maillot hacía que el tick creara un clon del equipo, porque `seedWorld` reconoce los equipos por su semilla.
8. **El examen, con lo de debajo.** Una llegada por carrera en una escala de cinco tramos con sus dos extremos malos y sus ejes; cada día con su origen; el viaje como un bloque; un solo guardado. Y debajo, sin tocar el motor: la vista previa del plan vivo con la carga de carrera y el viaje, una sola función de precedencia para el tick y la pantalla, y un solo plan vivo.
9. **La frontera por construcción.** El serializador que la API ya monta quita lo que el esquema no declara, el registro de E2 exige el esquema de respuesta de cada ruta, la resolución va en el tipo, un test exige que cada campo se pinte y el canario busca números internos: los atributos de cualquier corredor dejan de viajar con decimales.
10. **Veinticuatro pasos y unos 40 PR, tests primero.** El dueño ve la web instalable en el paso 3; el examen, en el 14; los maillots nuevos, en el 17. Veinte decisiones son suyas, cada una con su valor por defecto, y las cuatro de gusto se deciden mirando `opciones/index.html`.

---

## B. El índice del documento

Veintiuna secciones (la 0 es la cabecera), en el orden final. Longitud objetivo total: 3.710 líneas, entre las 3.000 y las 4.000 del encargo. Cada entrada dice: título, fichero, líneas y lote; qué contiene (cada punto numerado es una subsección `### N.m`); qué escribe entero; de qué secciones de qué propuestas, mapas y juicios sale; las decisiones que escribe como hechos; los injertos que recibe, las objeciones que resuelve, los huecos que rellena y las contradicciones de hecho que deja escritas, por id; y lo que toca del dueño.

| §   | Título                                                                                  | Fichero                       | Líneas    | Lote |
| --- | --------------------------------------------------------------------------------------- | ----------------------------- | --------- | ---- |
| §0  | Cabecera y resumen                                                                      | `borrador/00-cabecera.md`     | 100       | L0   |
| §1  | Diagnóstico medido: el juego visto desde un teléfono                                    | `borrador/01-diagnostico.md`  | 140       | L1   |
| §2  | Principios                                                                              | `borrador/02-principios.md`   | 60        | L1   |
| §3  | Los fundamentos: paleta, letra, espacio, densidad, radios, sombras e iconos             | `borrador/03-fundamentos.md`  | 240       | L1   |
| §4  | Los componentes y sus estados                                                           | `borrador/04-componentes.md`  | 380       | L1   |
| §5  | El sistema que se hace cumplir                                                          | `borrador/05-cumplimiento.md` | 110       | L1   |
| §6  | El teléfono: tablas, navegación, dedo y letra                                           | `borrador/06-telefono.md`     | 160       | L1   |
| §7  | La prueba del teléfono: el criterio de aceptación                                       | `borrador/07-prueba.md`       | 170       | L1   |
| §8  | Los maillots (I): la equipación, su dato y su editor                                    | `borrador/08-equipacion.md`   | 270       | L2   |
| §9  | Los maillots (II): la señal de campeón, los líderes, el patrocinador y `WornJerseyIcon` | `borrador/09-campeon.md`      | 250       | L2   |
| §10 | El examen práctico (I): el cuadro de entrenamiento                                      | `borrador/10-cuadro.md`       | 240       | L2   |
| §11 | El examen práctico (II): lo que hay debajo, lo que se deja y el viaje                   | `borrador/11-debajo.md`       | 160       | L2   |
| §12 | Sin red, el peso y la primera pintura                                                   | `borrador/12-instalable.md`   | 190       | L2   |
| §13 | La regla de la frontera                                                                 | `borrador/13-frontera.md`     | 150       | L2   |
| §14 | Lo que E2 dejó a E3                                                                     | `borrador/14-e2.md`           | 100       | L3   |
| §15 | Constantes y tokens                                                                     | `borrador/15-constantes.md`   | 110       | L3   |
| §16 | Tests y bancos                                                                          | `borrador/16-tests.md`        | 160       | L3   |
| §17 | El plan por PR, tests primero                                                           | `borrador/17-plan.md`         | 350       | L3   |
| §18 | Riesgos y fronteras                                                                     | `borrador/18-riesgos.md`      | 80        | L3   |
| §19 | Decisiones que son del dueño                                                            | `borrador/19-dueno.md`        | 160       | L3   |
| §20 | Apéndices: injertos, objeciones, cobertura y vocabulario                                | `borrador/20-apendices.md`    | 130       | L3   |
|     | **Total**                                                                               |                               | **3.710** |      |

### §0 · Cabecera y resumen

`borrador/00-cabecera.md` · 100 líneas · L0 (la escribe el orquestador al cierre, fase 6)

**Contiene:**

1. **0.1 El encargo, el estado y el árbol.** El encargo literal (`docs/encargos.md` l. 179-276) y su porqué (las secciones de `docs/agenda.md` de `00-encargo.md` §1); fichero y tamaño esperado; estado («diseño escrito, sin implementar»); el árbol (`58c14da`, `ENGINE_VERSION` 91 que E3 no sube, última migración `0049_rastro_de_etapa`); la regla de arranque.
2. **0.2 Método, base y fusión.** Cinco mapas, cuatro propuestas, tres jueces, la síntesis por lotes, la página de opciones y las fases 4 a 7; la base por unanimidad con la tabla de puntuaciones por juez y eje (`veredicto.json` → `juicios` y `ganadora.por_eje`); una línea por propuesta con lo que aporta (`ganadora.fusion`).
3. **0.3 Cómo leer.** Las citas del dueño, medido frente a estimado, «(pantalla)», los `DD-nn` (§19), qué son un injerto, una objeción, un hueco y una contradicción de hecho y dónde se rastrean (§20); qué NO es este documento.
4. **0.4 Qué cambia, en diez líneas.** Las diez ideas de §A, en ese orden.
5. **0.5 Mapa del documento.** Una línea por sección.
6. **0.6 Procedencia.** Una línea con los recuentos (5 mapas, 4 propuestas, 3 jueces, base, 34 injertos, 33 objeciones, 21 huecos, 26 contradicciones, 59 decisiones, 20 del dueño), que el cierre completa con los de la refutación.

**Escribe entero:** la tabla de puntuaciones y el mapa del documento.

**Sale de:** `00-encargo.md` §1, §2 y §7.1; `veredicto.json`; §A de este esqueleto.

**Decisiones que escribe como hechos:** D-01.

**Injertos, objeciones, huecos, contradicciones:** ninguno.

**Del dueño:** las cuatro de gusto, nombradas con la página de opciones.

### §1 · Diagnóstico medido: el juego visto desde un teléfono

`borrador/01-diagnostico.md` · 140 líneas · L1

**Contiene:**

1. **1.1 Qué se ha medido y cómo.** Los cinco mapas, las 98 capturas a 360 y 1.280 px (`capturas/README.md`), el mundo de 50 días y las cuatro cuentas (mapa 05 §1), Chromium 1194 sin cabeza y lo que eso no es (un teléfono).
2. **1.2 El marco se come la pantalla.** Cabecera de 50 px, pestañas de 41 y barra fija de 57, el 18,5 % de 800; `Watch` empieza a 328 px y la barra le tapa el comentario (capturas 01, 08, 09 y 15; telefono §1).
3. **1.3 La respuesta lejos, la acción al final.** Lo que hace el plan empieza a 1.060 px y `Save day edits` cierra 6.807 (mapa 05 §3); la inscripción mide 19.914 px (captura 03).
4. **1.4 Lo que no cabe se corta.** El calendario del equipo pierde `Add` y `Drop` (captura 15; `Panel.tsx` l. 22); `Dashb…` (`BottomNav.tsx` l. 54 y 59); el salón de la fama y la plantilla (capturas 24 y 14).
5. **1.5 Letra, dedo y contraste.** De 8 a 11 px; 34 de 42 campos a 14 px; objetivos de 13 a 20 px en 30 pantallas; 2.816 nodos de axe a 360 px; las barras de título de 2,06 a 3,33 y el reloj a 1,14 (mapa 05 §2 y §11; mapa 01 §2.3).
6. **1.6 Dos sistemas y medio y los estados sin diseñar.** 146 botones con 92 aspectos; la tarjeta definida siete veces; 44 `Loading…`, 26 errores sin reintento, seis páginas que pintan un fallo como vacío; 23 `title` (mapa 01 §3, §4 y §7).
7. **1.7 La red mala.** Primera pintura hacia 3,2 s y lista de 4,7 a 5,7 con Slow 4G y CPU ×4; 94,3 KB de CSS, el 91 % banderas; los cuatro casos sin red; nada instalable (mapa 05 §12 a §14; mapa 01 §8).
8. **1.8 Los maillots.** La equipación se deriva de la semilla; gemelos en 303 de 310 carreras a 13 px en visión normal y en las 310 en las dicromacias (telefono §1, con su rasterizador; el mapa 03 §3.2 da 302 por patrón y base); el maillot a 13 px en `Watch`; los líderes con colores de equipo; el campeón solo en `Watch`; el registro encontrado es el del logotipo de la UCI (mapa 03, resumen).
9. **1.9 El clon, un defecto vivo de producción.** La medida del mapa 03 §2.2 (de 219 equipos y 3.900 corredores a 220 y 3.912), la causa (`world.ts` l. 459-468; `teamControl.ts` l. 182-186) y que ningún test lo cubre; el arreglo es el paso 1 (D-32).
10. **1.10 El examen y la frontera, debajo de la pantalla.** La vista previa en las vueltas, el panel que no pinta los bloques, los planes solapados, el desfase de semanas (lectura §1.5, cierto: X-05) y los números que cruzan la frontera (mapa 02, resumen).
11. **1.11 Lo que está bien y se queda.** Una tabla con fichero y línea: el ARIA de `Tabs.tsx` (l. 153-222), `RiderName` (humanos y bots), `ShowAll` y `TOP_ROWS`, `StageRoute` ([DUEÑO 7]), los `aria-live` de `Watch`, el velo de E2, la caché inmutable de `assets/` (`app.ts` l. 125-144), el serializador de Zod montado (`app.ts` l. 162-163), `wearableTitles` y `getRiderTravelDays`.

**Escribe entero:** la tabla «qué falla · dónde · cifra · captura» (una fila por punto de 1.2 a 1.10) y la de lo que se queda.

**Sale de:** telefono §1; sistema §1; identidad §1; lectura §1; mapas 01 (resumen, §2 a §8), 02 (resumen), 03 (resumen y §2.2), 05 (§2, §3, §5, §9, §11 a §14); `capturas/README.md`.

**Decisiones que escribe como hechos:** ninguna propia (cita D-32).

**Injertos, objeciones, huecos, contradicciones:** ninguno.

**Del dueño:** [DUEÑO 5], [DUEÑO 12], [DUEÑO 13].

### §2 · Principios

`borrador/02-principios.md` · 60 líneas · L1

**Contiene:** una tabla de diez principios con tres columnas (el principio; qué lo viola hoy, con su remisión a §1; qué pieza lo cumple y en qué sección) y una línea de consecuencia por principio:

1. **2.1 360 × 800 es la referencia y 320 × 640 el rescate.** La clase sin prefijo es la del teléfono; `sm:` y `lg:` añaden.
2. **2.2 La respuesta en la primera pantalla.** `data-answer` en los primeros 520 px.
3. **2.3 La acción bajo el pulgar.** `ActionBar`, en el 40 % de abajo, con su consecuencia.
4. **2.4 Una fila, dos renglones, una acción.** El nombre de un corredor no se corta.
5. **2.5 Nada por debajo de 12 px de letra, 44 px de dedo, 16 px en un campo ni 4,5:1 en un texto.**
6. **2.6 La red mala es el caso normal.** Sin red no es un error ni un cierre de sesión, y la API no se guarda nunca.
7. **2.7 Cada identidad, su forma, reservada y medida a 13 px.** Equipación, líder y campeón se leen en las cuatro visiones a su tamaño mínimo.
8. **2.8 Lo que no está en el tema no existe, y la deuda solo baja.**
9. **2.9 Lo que la pantalla no enseña no viaja, y un número lleva su escala.**
10. **2.10 Medido o no está hecho.** Cada principio tiene su número en la prueba.

**Escribe entero:** la tabla.

**Sale de:** telefono §2; sistema §2; identidad §2; lectura §2.

**Decisiones que escribe como hechos:** D-01.

**Injertos, objeciones, huecos, contradicciones:** ninguno.

### §3 · Los fundamentos: paleta, letra, espacio, densidad, radios, sombras e iconos

`borrador/03-fundamentos.md` · 240 líneas · L1

**Contiene:**

1. **3.1 La paleta.** La tabla de los tokens de color de §G.2 con su variable, su utilidad, su hexadecimal, su uso y su contraste medido contra cada fondo en que se usa (D-03).
2. **3.2 Los estados y la escala de llegada.** Los tonos `good`, `warn`, `bad` e `info`, su icono (D-13) y el ΔE00 entre tonos en las cuatro visiones, que se informa sin ser umbral (H-18); los cinco `arrival-*` con su contraste (X-20).
3. **3.3 El ámbito oscuro.** Dónde se pone y la tabla de lo que redefine (D-04); el redactor **mide** `line` y `line-strong` dentro del ámbito con `<scratchpad>/venv` y escribe valor y cifra.
4. **3.4 La letra.** La pila, los siete tamaños, los pesos, las cifras tabulares, el mínimo y lo que pasa si el dueño elige otra (D-05).
5. **3.5 Espacio, rejilla y densidad.** El paso de 4 px y sus pasos, los márgenes, las alturas mínimas, los dos cortes y la variante `fine` (D-06; I-21).
6. **3.6 Radios y sombras.** `rounded-ui`, `rounded-full`, `shadow-card` y `shadow-bar` (D-07).
7. **3.7 Los iconos.** Los 24 de D-07, cada uno con su uso y el emoji o glifo que sustituye.
8. **3.8 El material generable.** Qué sale de un script, la huella y la revisión (D-08; I-23).
9. **3.9 Dónde vive cada cosa.** La tabla de D-02, con `colorMath.ts` (I-31).
10. **3.10 Las dos decisiones de gusto.** DD-01 y DD-02, en una línea cada una, con la página de opciones.

**Escribe entero:** el bloque `@theme` de `apps/web/src/index.css` completo (los tokens de la paleta A, la letra, el radio, las sombras, los cortes, los contenedores, la variante `fine` y el ámbito oscuro), con las líneas `initial` del cierre escritas y comentadas, que se activan en el paso 22; y la tabla de contrastes.

**Sale de:** telefono §3 (y §15.1, la paleta C); sistema §3; identidad §3; lectura §3; mapa 01 §2; uso C5.

**Decisiones que escribe como hechos:** D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-13 (lo de color).

**Injertos que recibe:** I-10, I-21, I-23, I-31.

**Objeciones que resuelve:** O-31.

**Huecos que rellena:** H-18.

**Contradicciones de hecho:** X-20.

**Del dueño:** DD-01, DD-02, DD-05.

### §4 · Los componentes y sus estados

`borrador/04-componentes.md` · 380 líneas · L1

**Contiene:**

1. **4.1 Reglas comunes.** Foco con `focus-visible:` (anillo de 2 px en `focus` a 2 px); encima, solo bajo `@media (hover:hover)`; pulsado; deshabilitado con su porqué en una línea `meta` enlazada con `aria-describedby`, nunca en un `title`; `layout` y nada de `className` para lo suyo; `data-ui`, `data-variant` y `data-state` (D-10).
2. **4.2 `QueryView` y los estados de una consulta.** `Skeleton`, `ErrorState`, `EmptyState` y `OfflineState`, con `LOADING_DELAY_MS`, `SLOW_HINT_MS` y `REQUEST_TIMEOUT_MS` (D-11; I-30).
3. **4.3 La acción.** `Button`, `ActionBar`, `Segmented`, `Field`, `TextLink`, `InfoButton` y `Disclosure` (I-33).
4. **4.4 La estructura.** `Panel`, `PageHeader` con su línea de estado (I-32), `Tabs`, `AppHeader`, `BottomNav` y `Stat`.
5. **4.5 Tablas y filas.** `RankTable` (la fila propia, I-26; el enlace del nombre en bloque de 44 px, O-28; las columnas por `priority`), `ActionRow` y `TripRow` (I-34).
6. **4.6 La identidad.** `RiderLabel` (I-18), `RiderHeader`, la ficha de corredor como composición (I-17), `Flag`, `StarRating` e `Icon`.
7. **4.7 Los avisos.** `Notice`, `Chip` (tono, icono y texto obligatorios, D-13; las variantes de lo real y lo generado, D-59), `OfflineBanner`, `UpdateToast` e `InstallHint`.
8. **4.8 Las escalas.** `Scale5` y `Meter`.
9. **4.9 Lo fijo.** El orden de las barras, el tope de un aviso y el teclado (D-12).
10. **4.10 El vocabulario de pantalla.** `words.ts` y la tabla de D-15 con su columna «Nunca» (I-19).
11. **4.11 Qué sustituye cada uno.** La tabla de §G.3 con la línea de hoy de cada primitiva.

Los maillots (`Kit`, `LeaderJersey`, `ChampionSash`, `WornJerseyIcon`, `KitPicker`) solo se listan aquí: su dibujo es de §8 y §9.

**Escribe entero:** por componente, la anatomía con medidas en tokens, las variantes, todos sus estados con su aspecto en tokens, un texto de pantalla en inglés y su accesibilidad; las `interface` de props, en TypeScript estricto, de los diez que usan las demás secciones (`Button`, `ActionBar`, `Panel`, `RankTable` con `RankTableColumn`, `ActionRow`, `RiderLabel`, `Notice`, `Chip`, `Scale5` y `QueryView`); el orden de lo fijo con sus alturas.

**Sale de:** telefono §4; sistema §4; identidad §4; lectura §4.1 y §4.2; mapa 01 §3, §4 y §7.

**Decisiones que escribe como hechos:** D-09, D-10, D-11, D-12, D-13, D-15, D-16 (la fila propia y el enlace), D-59 (el `Chip` de lo real).

**Injertos que recibe:** I-03, I-17, I-18, I-19, I-26, I-30, I-32, I-33, I-34.

**Objeciones que resuelve:** O-16, O-17, O-28, O-29, O-31.

**Huecos que rellena:** H-14.

**Contradicciones de hecho:** ninguna.

**Del dueño:** [DUEÑO 6], [DUEÑO 17], [DUEÑO 24], [DUEÑO 26].

### §5 · El sistema que se hace cumplir

`borrador/05-cumplimiento.md` · 110 líneas · L1

**Contiene:**

1. **5.1 El tema cerrado.** Las líneas `initial`, lo que deja de resolver (2.457 de 6.322 apariciones, 176 clases; medido por sistema con el compilador de Tailwind 4.3.3), los arbitrarios que siguen resolviendo y su lista con motivo, y por qué se cierra en el paso 22 y no antes (D-14; X-11, X-22).
2. **5.2 `vocabulario.test.ts` y `deuda.json`.** El formato del fichero, las dos sondas, la versión exacta de `tailwindcss` y cómo baja la deuda en cada PR.
3. **5.3 Las diez reglas.** `ui/1` a `ui/10`: qué prohíbe cada una y su mensaje, dónde corren (`apps/web/src/**` salvo `components/ui/` y lo generado), la lista de heredados (83 ficheros, 1.417 avisos, medido por sistema) y el paso de `warn` a `error` (X-12).
4. **5.4 `/_ui`.** Qué pinta, sus datos fijos, cómo se añade un componente (D-10).
5. **5.5 Cuando lleguen las once épicas que faltan.** La puerta de un componente nuevo y de un token nuevo (su pareja en `tokens.test.ts`).

**Escribe entero:** las líneas `initial`; el formato de `deuda.json`; la tabla de las diez reglas.

**Sale de:** sistema §0, §1, §2, §12, §13 (pasos 2 y 17) y §14; codigo C4 y C6.

**Decisiones que escribe como hechos:** D-10, D-14.

**Injertos que recibe:** I-01, I-03.

**Objeciones que resuelve:** O-06.

**Huecos que rellena:** ninguno.

**Contradicciones de hecho:** X-11, X-12, X-22.

### §6 · El teléfono: tablas, navegación, dedo y letra

`borrador/06-telefono.md` · 160 líneas · L1

**Contiene:**

1. **6.1 Las tablas anchas, una por una.** Las diez filas de telefono §5.1 (hoy a 360 px, en el teléfono, filas), con las columnas que vuelven a 640 y a 1.024 por `priority` en cada una (D-16; O-33).
2. **6.2 La fila propia y el enlace del nombre.** (I-26; O-28.)
3. **6.3 La navegación.** La cabecera con el reloj, las pestañas con su desvanecido, la barra inferior y su plan B por debajo de 340 px (D-17; O-30).
4. **6.4 Dedo, letra y cortes.** Los mínimos y la regla de qué se corta ([DUEÑO 17]).
5. **6.5 Gestos, vuelta atrás, teclado y horizontal.** (D-12; H-16.)
6. **6.6 El escritorio como ampliación.** La variante `fine` y las columnas (D-06; I-21).

**Escribe entero:** la tabla de las tablas con sus columnas por ancho.

**Sale de:** telefono §5.1 y §5.2; sistema §5 y §4 n.º 10; lectura §5.1 y §5.2; identidad §5; mapa 01 §5; mapa 05 §5 y §9; capturas 03, 05, 06, 11, 14, 15, 23 y 24; uso C1.

**Decisiones que escribe como hechos:** D-06, D-12, D-16, D-17.

**Injertos que recibe:** I-21, I-26.

**Objeciones que resuelve:** O-28, O-30, O-33.

**Huecos que rellena:** H-16.

**Contradicciones de hecho:** X-18 (los enlaces de 20 px del prototipo de telefono).

**Del dueño:** [DUEÑO 17]; la contradicción 6 del mapa 04 (los rótulos).

### §7 · La prueba del teléfono: el criterio de aceptación

`borrador/07-prueba.md` · 170 líneas · L1

**Contiene:**

1. **7.1 Las nueve comprobaciones.** Una tabla: número, qué mide, cómo lo mide Playwright, umbral, hoy (mapa 05) y en el prototipo de telefono (uso C1) (D-18).
2. **7.2 El mundo de la prueba.** `apps/web/e2e/world/build.mjs`, sus cuatro cuentas y sus cuatro escrituras con SQL, la caché del CI y su clave, y su coste (H-15; X-23).
3. **7.3 Las 45 pantallas.** `TELEFONO_PANTALLAS`: ruta, cuenta, el elemento con `data-answer` y si es de herramienta (O-27); salen de `capturas/README.md`.
4. **7.4 Dónde corre y el trinquete.** `/_ui` y las pantallas en cada PR que toca la web, la API o `packages/db`; `telefono-baseline.json`; cuándo E3 está terminado (I-04).
5. **7.5 El rendimiento, cada noche.** Los umbrales de D-50 y la medida de hoy (mapa 05 §12).
6. **7.6 Las dependencias.** Playwright 1.56.1, axe-core 4.10.3 y Chromium en la caché del CI (O-11; X-09).
7. **7.7 La prueba del dueño en su teléfono.** Las diez tareas a una mano y la undécima con lector de pantalla (D-19; H-19).
8. **7.8 Lo que la prueba no ve.** WebKit, la letra real, la letra al doble (H-17), el horizontal (H-16), y por qué no bloquean (D-19; H-13).

**Escribe entero:** la tabla de las nueve comprobaciones y la de las 45 pantallas.

**Sale de:** telefono §5.3; sistema §5 y §12; identidad §5; lectura §5.4; mapa 05 §1, §2 y §12; `capturas/README.md`; codigo C11; uso O-01, O-02 y O-13.

**Decisiones que escribe como hechos:** D-18, D-19, D-50 (lo del rendimiento).

**Injertos que recibe:** I-04.

**Objeciones que resuelve:** O-11, O-26, O-27.

**Huecos que rellena:** H-13, H-15, H-16, H-17, H-19.

**Contradicciones de hecho:** X-09, X-23.

**Del dueño:** DD-16, DD-20.

### §8 · Los maillots (I): la equipación, su dato y su editor

`borrador/08-equipacion.md` · 270 líneas · L2

**Contiene:**

1. **8.1 El vocabulario.** Los doce colores (código, nombre de pantalla, hexadecimal, base o segundo), las seis figuras (código, nombre, región en u, ancho a 13 y 16 px), la regla de contraste, lo reservado y las cuentas (D-20; X-02; I-12, la parte de `Sash` fuera; I-25).
2. **8.2 La distinguibilidad, medida, y su puerta.** La tabla de telefono §6.2 a 13 y 16 px (con siete figuras), lo que falta medir con seis, la puerta de `kits.test.ts` y el respaldo B (O-25).
3. **8.3 El dibujo.** `Kit`: el `viewBox` de 48, `TORSO`, cada región como `path`, el filete por superficie (I-24) y el cuello; `KIT_PX`; 13 px como mínimo y por qué `Watch` no cambia (D-21; O-12; X-19).
4. **8.4 La distancia dibujada, la tabla de choques y los rivales de temporada.** (D-24; I-07; I-31; H-01.)
5. **8.5 El dato.** `team_kits`, `kitOn`, `ensureKits`, la migración `0052_equipaciones` y los contratos que ganan `kit` (D-22; I-05, I-06, I-14; O-01; X-08; H-02).
6. **8.6 La traducción del mundo de hoy y el pasado intacto.** (D-23; I-15; O-21.)
7. **8.7 El editor.** La pantalla de `/team/identity` a 360 px dibujada en texto, sus estados con su texto, las rutas, los códigos y la espera (D-25; I-16, I-25; O-19).
8. **8.8 Para E9.** La historia, `revertKit` y su ruta.
9. **8.9 El clon y la semilla del dibujo.** Lo que hace el paso 1, la consulta de los clones y cuándo muere la columna (D-32; H-21).

**Escribe entero:** los tipos `KitFigure`, `KitColorName`, `KitBase`, `KitSecondary`, `Kit`, `KitCode`, `KitSize`, `KitCheckCode`, `KitVerdict` y `kitSchema`, en TypeScript estricto y Zod; la tabla `team_kits` en drizzle; la pantalla del editor en texto, con sus textos en inglés.

**Sale de:** telefono §6.1 a §6.3; identidad §6.1 a §6.3; sistema §6.1 a §6.3; lectura §6.1 a §6.3; mapa 03 §1, §2 y §3; codigo C9, I-codigo-05 a I-codigo-07, H-codigo-01 y H-codigo-02; cobertura I-03 a I-05; uso I-05 e I-06.

**Decisiones que escribe como hechos:** D-20, D-21, D-22, D-23, D-24, D-25, D-32.

**Injertos que recibe:** I-05, I-06, I-07, I-12 (el vocabulario), I-14 (`team_kits`), I-15, I-16, I-24 (la geometría del filete), I-25, I-31.

**Objeciones que resuelve:** O-01, O-12, O-19, O-21, O-25.

**Huecos que rellena:** H-01, H-02, H-21.

**Contradicciones de hecho:** X-02, X-08, X-19.

**Del dueño:** DD-04, DD-07, DD-08, DD-09, DD-17.

### §9 · Los maillots (II): la señal de campeón, los líderes, el patrocinador y `WornJerseyIcon`

`borrador/09-campeon.md` · 250 líneas · L2

**Contiene:**

1. **9.1 La banda de honor.** El dibujo con sus `path` (mundial, nacional y continental), la disciplina y la categoría, la bandera al lado y cómo se ve a 13, 16, 28 y 72 px, en píxeles (D-26; I-12; X-17).
2. **9.2 Por qué no es el arcoíris.** Los hechos de la UCI de `00-encargo.md` §7.1 y del mapa 03 §7.1, y las distancias re-medidas por el juez (X-16; O-14).
3. **9.3 La palabra del dueño, variante a variante.** La tabla de D-27 con los cuatro criterios para cada variante literal, la más fuerte (identidad C) y las señales propias sin bandas (I-13; O-15).
4. **9.4 Las alternativas que van a la página de opciones.** B, C, D, E y las literales de DD-03, con sus valores.
5. **9.5 `NATIONAL_SASH`.** Cómo se genera, cómo se revisa y sus sobrescrituras (Corea).
6. **9.6 La 7-h de E2, contestada.** (H-09.)
7. **9.7 Los líderes.** El dibujo definitivo y sus medidas (D-28).
8. **9.8 El dorsal del equipo líder.** (D-29; X-13, X-14.)
9. **9.9 Lo que compra el patrocinador.** Las dos cosas, el umbral de 72 px, la lista cerrada y `applySponsor` (D-30; I-14, el patrocinio; O-24; X-24).
10. **9.10 `WornJerseyIcon`.** La firma, quién decide qué, los textos y `surface` (D-31; I-24; X-25).

**Escribe entero:** `SASH_PATH` y las tres franjas; la tabla de variantes; `WornJerseyIconProps`; `KitZone`, `SponsorOffer` y la firma de `applySponsor`.

**Sale de:** identidad §6.4 a §6.7; telefono §6.4 a §6.6; sistema §6.4 a §6.6 y §15.3; lectura §6.4 a §6.6 y §15.3; mapa 03 §4 a §7; `00-encargo.md` §7.1; cobertura C1, C4 y C7; `docs/retransmision.md` l. 5203-5212.

**Decisiones que escribe como hechos:** D-26, D-27, D-28, D-29, D-30, D-31.

**Injertos que recibe:** I-12, I-13, I-14 (el patrocinio), I-24.

**Objeciones que resuelve:** O-14, O-15, O-24.

**Huecos que rellena:** H-09.

**Contradicciones de hecho:** X-13, X-14, X-16, X-17, X-24, X-25.

**Del dueño:** DD-03, DD-06, DD-19; [DUEÑO 1], [DUEÑO 2], [DUEÑO 4], [DUEÑO 5].

### §10 · El examen práctico (I): el cuadro de entrenamiento

`borrador/10-cuadro.md` · 240 líneas · L2

**Contiene:**

1. **10.1 Lo que contesta, en el orden en que se lee.** Las preguntas de lectura §7.1.
2. **10.2 La pantalla a 360 px, dibujada en texto.** Las cinco capas de D-40 con sus medidas y sus textos en inglés, y cómo pasa las nueve comprobaciones (X-18).
3. **10.3 Defecto 1: la lista de llegadas.** Una tarjeta por carrera (D-34, lo que se ve).
4. **10.4 Defecto 2: la escala.** `Scale5` y la tabla de las cinco instrucciones (D-42; O-32; X-20).
5. **10.5 Defecto 3: los dos vocabularios y la precedencia.** La línea del modo para cada uno de los tres modos, el origen de cada día y `↺ Back to Build` (D-40; I-27).
6. **10.6 Las semanas con sus días y la tira de siete días.** (D-35, lo que se ve; I-08; I-28; O-10.)
7. **10.7 La carga en palabras y el TSS fuera.** La tabla de qué sesión del catálogo cae en qué palabra (D-41).
8. **10.8 Los modos.** `entrenador` en solo lectura y `manual` con sus huecos.
9. **10.9 Un solo guardado.** La `ActionBar` y su consecuencia.
10. **10.10 Lo que es de E6.** Dónde vive la explicación larga de la precedencia (`docs/agenda.md` l. 1661).

**Escribe entero:** la pantalla en texto con cada texto en inglés; la tabla de instrucciones por tramo; la tabla de chips por origen y modo; la de cargas.

**Sale de:** telefono §7.1 a §7.4; lectura §7.1 a §7.4; sistema §7.2 y §7.3; identidad §7; mapa 02 §1, §2 y §4; mapa 05 §3; capturas 01, 29 y 45; uso C1 a C3.

**Decisiones que escribe como hechos:** D-34 (la pantalla), D-40, D-41, D-42.

**Injertos que recibe:** I-08 (las semanas con fecha), I-27, I-28, I-32.

**Objeciones que resuelve:** O-10 (lo que se ve), O-32.

**Huecos que rellena:** ninguno.

**Contradicciones de hecho:** X-18, X-20.

**Del dueño:** DD-10, DD-11; [DUEÑO 8], [DUEÑO 11], [DUEÑO 12].

### §11 · El examen práctico (II): lo que hay debajo, lo que se deja y el viaje

`borrador/11-debajo.md` · 160 líneas · L2

**Contiene:**

1. **11.1 Lo que E3 arregla debajo, y lo que deja.** La lista de D-33 con su línea de código; lo que queda para otra línea, con su motivo.
2. **11.2 La vista previa nueva.** El contrato de D-34 y D-35: `planPreviewRequestSchema` y `planPreviewResponseSchema` enteros (I-08; O-10; X-05).
3. **11.3 La carga de un día de carrera, el viaje y el primer día.** `applyDailyLoad`, la mediana, las tres constantes del motor y su coste en el CI (D-36, D-37; O-09; X-06; H-20).
4. **11.4 `resolveTrainingDay` y el diferencial del tick.** Su firma con `TrainingDayContext` y `ResolvedTrainingDay`, y `GET /orders` con `ordersDaySchema` (D-38).
5. **11.5 Un solo plan vivo.** La regla de `PUT /plan`, el orden en la lectura y la limpieza `0051_un_plan_vivo` (D-39; H-04).
6. **11.6 El viaje, donde se decide.** `TripRow`, `On your programme`, `Day N` y un solo icono (D-43; I-34).
7. **11.7 La portada habla del plan.** (D-43; I-20; O-22.)

**Escribe entero:** los esquemas Zod de la vista previa y de `days[]`; la firma de `resolveTrainingDay`.

**Sale de:** telefono §7.2, §7.4 y §7.5; lectura §7.5 y §7.6; sistema §7.1; identidad §7; mapa 02 §2, §3, §5 y §6; mapa 05 §4; codigo C5 y C8; cobertura C2.

**Decisiones que escribe como hechos:** D-33, D-34, D-35, D-36, D-37, D-38, D-39, D-43.

**Injertos que recibe:** I-08, I-20, I-34.

**Objeciones que resuelve:** O-09, O-10, O-22.

**Huecos que rellena:** H-04, H-20.

**Contradicciones de hecho:** X-05, X-06.

**Del dueño:** DD-11.

### §12 · La web instalable

`borrador/12-instalable.md` · 190 líneas · L2

**Contiene:**

1. **12.1 El manifiesto.** `manifest.webmanifest` entero, campo a campo con su porqué (D-45).
2. **12.2 Los iconos y las metas de `index.html`.** (D-45; O-02; X-10; I-23.)
3. **12.3 El service worker.** Qué guarda, qué no guarda nunca y por qué, la tabla de `decide(request)`, el plugin, la precarga y las medidas de telefono (D-46; I-11; O-13).
4. **12.4 Sin red.** La sesión en tres estados, el aviso con su hora, lo pausado, las mutaciones, la barrera por ruta, y los cuatro casos del mapa 05 §13 con lo que se ve ahora (D-47; I-29; X-03, X-04).
5. **12.5 La versión nueva.** (D-48.)
6. **12.6 iPhone y Android.** (D-51.)
7. **12.7 El peso.** El sprite por Vite, los presupuestos y `sideEffects` (D-49, D-50; O-08; H-03; X-07, X-26).
8. **12.8 La prueba que revisa la app nativa.** El sensor y su regla (D-52).

**Escribe entero:** `manifest.webmanifest`; la tabla de `decide(request)`; los cuatro casos sin red; `vitalsSchema`.

**Sale de:** telefono §8; sistema §8; identidad §8; lectura §8; mapa 05 §12 a §14; mapa 01 §8; codigo C3, C7 y C12; uso (la comprobación de `HorizonWatcher`).

**Decisiones que escribe como hechos:** D-45, D-46, D-47, D-48, D-49, D-50, D-51, D-52.

**Injertos que recibe:** I-11, I-23 (los iconos), I-29.

**Objeciones que resuelve:** O-02, O-08, O-13.

**Huecos que rellena:** H-03.

**Contradicciones de hecho:** X-03, X-04, X-07, X-10, X-26.

**Del dueño:** DD-14, DD-15; [DUEÑO 23].

### §13 · La regla de la frontera

`borrador/13-frontera.md` · 150 líneas · L2

**Contiene:**

1. **13.1 La regla.** El texto de D-53.
2. **13.2 El mecanismo.** Las cuatro piezas de D-54 (I-09; O-04, O-05).
3. **13.3 Por qué no `.strict()`, y qué hace el serializador.** (X-01, X-21.)
4. **13.4 El riesgo del 500 y cómo entra cada ruta.** El test de la respuesta real, las rutas de la retransmisión al final y los tres PR (O-03).
5. **13.5 El inventario de hoy, con su arreglo.** La tabla de D-55 (H-02).
6. **13.6 Cómo encaja con lo que E2 construyó para el destripe.** El horizonte decide cuándo y la frontera con qué resolución, en el mismo registro y en el mismo canario.
7. **13.7 Lo que la pantalla enseña de otra forma.** La moral, la frescura y el TSS (D-44; O-20).

**Escribe entero:** la tabla del inventario; `starsSchema`, `barSchema` y `arrowSchema`; el formato de `FRONTERA_SIN_USO` y su contenido de hoy.

**Sale de:** telefono §9; lectura §9; sistema §9; identidad §9; mapa 02 §8 y §9; codigo C1 y C2.

**Decisiones que escribe como hechos:** D-44, D-53, D-54, D-55.

**Injertos que recibe:** I-09.

**Objeciones que resuelve:** O-03, O-04, O-05, O-20.

**Huecos que rellena:** H-02.

**Contradicciones de hecho:** X-01, X-21.

**Del dueño:** DD-12; [DUEÑO 9], [DUEÑO 14]; [DOC 12].

### §14 · Lo que E2 dejó a E3

`borrador/14-e2.md` · 100 líneas · L3

**Contiene:**

1. **14.1 Lo que se queda de E2.** Disposición, orden, textos, ritmo, `aria-live` y la puerta del velo.
2. **14.2 La cabeza de la etapa.**
3. **14.3 La capa fija y su resumen accesible.** La frase y cuándo se lee (H-05; X-15).
4. **14.4 La barra de grupos y el perfil.** Los maillots a 13 px (D-21; O-12; X-19) y las cotas de 12 px.
5. **14.5 El rótulo.** Los fondos en el ámbito oscuro (I-10) y el título más largo (H-07).
6. **14.6 La previa, el cierre, `Highlights`, el `digest` y `Report`.** (O-18.)
7. **14.7 La imagen de compartir.** `og-default.png` (I-23).
8. **14.8 Lo que E3 pide a E6, y lo que no pide.** `useHideBottomNav` (DD-13) y la edad en el rótulo (H-11).

**Escribe entero:** la frase del resumen accesible con su segunda línea; la tabla pieza · hoy · con E3.

**Sale de:** telefono §10; sistema §10; identidad §10; lectura §10; mapa 04 §6; `docs/retransmision.md` §6, §7.1, §7.9, §18.5 y §18.8; cobertura C5.

**Decisiones que escribe como hechos:** D-04 (dónde se aplica), D-21, D-56.

**Injertos que recibe:** I-10 (las piezas de `Watch`), I-23 (`og-default.png`).

**Objeciones que resuelve:** O-12 (`Watch` a 13 px), O-18.

**Huecos que rellena:** H-05, H-07, H-11.

**Contradicciones de hecho:** X-15, X-19.

**Del dueño:** DD-13; [DUEÑO 3], [DUEÑO 20], [DUEÑO 21].

### §15 · Constantes y tokens

`borrador/15-constantes.md` · 110 líneas · L3

**Contiene:**

1. **15.1 Los tokens.** Un resumen por familia (cuántos, dónde y su sección) que remite a §3.
2. **15.2 Las constantes.** La tabla única del documento, con las de §G.6: nombre, valor, intención y fichero.
3. **15.3 Las que tocan el motor y las que no.** `PREVIEW_RACE_DAY_TSS` y sus dos vecinas en `packages/engine/src/constants.ts`, con su línea en `docs/balance.md` (D-37; O-09).

**Escribe entero:** la tabla de constantes.

**Sale de:** los §11 de las cuatro propuestas; §G.6 del glosario.

**Decisiones que escribe como hechos:** D-02, D-37.

**Injertos que recibe:** ninguno.

**Objeciones que resuelve:** O-09.

**Huecos que rellena:** ninguno.

### §16 · Tests y bancos

`borrador/16-tests.md` · 160 líneas · L3

**Contiene:**

1. **16.1 Reglas.** Tests primero, `data-*` y no clases, `it.todo` con la cifra en el nombre para lo que no puede pasar todavía.
2. **16.2 La tabla de pruebas.** Las de §G.10: qué mide, con qué umbral, dónde corre y cuánto cuesta (I-01, I-03, I-04, I-07, I-31).
3. **16.3 Los re-sellos.** Los seis tests de clases a `data-*`, `leaderJerseys.test.tsx`, `stageTables.test.tsx` y los de textos que cambia el examen (D-10).
4. **16.4 Lo que se mide antes de escribir el código.** El vocabulario de seis figuras (O-25), la señal contra él, los rivales, la caché del mundo, la serialización de la retransmisión y la carga de carrera (H-20): quién lo mide y en qué paso.
5. **16.5 Lo que corre cada noche.** `nocturno.spec.ts` y `kitWorld.bench.ts`, con el caso del título más largo (H-07).

**Escribe entero:** la tabla de pruebas.

**Sale de:** los §12 de las cuatro propuestas; mapa 01 §9; §G.10 del glosario.

**Decisiones que escribe como hechos:** D-10 (los re-sellos), D-14, D-18.

**Injertos que recibe:** I-01, I-03, I-04, I-07, I-31.

**Objeciones que resuelve:** O-25.

**Huecos que rellena:** H-07, H-20.

### §17 · El plan por PR, tests primero

`borrador/17-plan.md` · 350 líneas · L3

**Contiene:**

1. **17.1 Reglas del plan.** Tests primero; un PR por fila de §17.2; S, M y L; `ENGINE_VERSION` 91 no se mueve y el 13b es el único PR que toca `packages/engine/` (paga los ocho tramos de bancos); las migraciones `0050` a `0054` con su nombre; cada PR deja el juego desplegable en Railway, dice lo que ve el dueño y con qué se revierte; el coste de CI de la prueba del teléfono. El modelo es `docs/retransmision.md` §17.1.
2. **17.2 La tabla de pasos.** Una fila por PR: paso y PR, qué entra, tests primero (fichero), depende de, tamaño, lo que ve el dueño y se revierte con (el modelo es `docs/retransmision.md` §17.2).
3. **17.3 a 17.26 Una subsección por paso, del 1 al 24.** Lo que entra, sus tests primero (fichero y casos), lo que ve el dueño y su marcha atrás. La 17.3 (paso 1, el clon) dice que es independiente de todo y se fusiona antes que nada (D-32; H-21). La 17.4 (paso 2) construye el mundo y la tabla de pantallas antes de la línea base (O-26; O-11). La 17.21 (paso 19) son los tres PR de la frontera (O-03). La 17.23 (paso 21) es la cola larga por deuda, con la lista de pantallas y su deuda (I-02; O-07). La 17.26 (paso 24) corrige los documentos de D-58 (H-12) y cierra con la prueba del dueño.
4. **17.27 Orden y dependencias.** El grafo: el paso 1, suelto; el camino del teléfono (2 a 12); el del examen (13 a 15, con el 13a que solo depende del 2); el de los maillots (16 a 18, que depende del 9); la frontera (19, tras el 13); `Watch` (20); la cola larga (21, tras el 9); el cierre (22 a 24).
5. **17.28 Lo primero que ve el dueño, y cuándo E3 está terminado.** La web instalable en el 3; el examen en el 14; los maillots nuevos en el 17; terminado con el trinquete a cero, sin `deuda.json` y con la prueba del dueño.

**Escribe entero:** la tabla de pasos; por paso, sus tests con fichero y casos.

**Sale de:** telefono §13; sistema §13; lectura §13; identidad §13; `docs/retransmision.md` §17.1 y §17.2 como modelo de formato; codigo O-07 y O-11; uso O-13.

**Decisiones que escribe como hechos:** D-32 (paso 1), D-57, D-58 (paso 24).

**Injertos que recibe:** I-01, I-02, I-05, I-23.

**Objeciones que resuelve:** O-03 (los tres PR de la frontera), O-07, O-11, O-26.

**Huecos que rellena:** H-12, H-21.

**Del dueño:** cada DD en el paso antes del cual hace falta (la columna de §19.2).

### §18 · Riesgos y fronteras

`borrador/18-riesgos.md` · 80 líneas · L3

**Contiene:**

1. **18.1 Las fronteras con E2, E4, E6, E8, E9, E10 y E12.** Una tabla: con quién, qué toca y cómo se cubre.
2. **18.2 Los riesgos propios.** ΔE00 por debajo de 10 es el umbral del encargo y no un experimento con personas; Machado con severidad 1 aproxima la dicromacia; todo está medido en Chromium de Linux (H-13, H-19); un mundo de 50 días; la marca sin verificar; el primer tick de la traducción; la serialización de la retransmisión.
3. **18.3 Lo que E3 no hace.** La pantalla de órdenes (H-08), el entrenador sin calendario, la analítica completa, el logotipo (D20) y la verificación de marcas ante la EUIPO y la USPTO (H-10; D-59).

**Sale de:** los §14 de las cuatro propuestas; mapa 04 §5; cobertura §7; uso §7.

**Decisiones que escribe como hechos:** D-59.

**Huecos que rellena:** H-08, H-10, H-19 (como riesgo).

### §19 · Decisiones que son del dueño

`borrador/19-dueno.md` · 160 líneas · L3

**Contiene:**

1. **19.1 Cómo se lee.** Qué cuesta cambiar cada una según dónde vive (un token, una constante, una migración, el motor, otra épica), como `docs/retransmision.md` §20.1.
2. **19.2 La tabla.** DD-01 a DD-20: qué se decide, por defecto y por qué, la consecuencia con su cifra, dónde se cambia y antes de qué paso, y si dice lo contrario (I-22; O-23).
3. **19.3 Las cuatro de gusto, mirando `opciones/index.html`.** Qué enseña la página de cada una (DD-01 a DD-04; I-12, I-13).
4. **19.4 La palabra del dueño sobre la señal de campeón.** Qué se ha hecho con cada variante suya, en una tabla corta que remite a §9.3 (D-27; O-15).
5. **19.5 Cuándo hace falta cada respuesta.** Las veinte, ordenadas por el paso antes del cual hacen falta.

**Escribe entero:** la tabla.

**Sale de:** `00-decisiones.md` §DD; `docs/retransmision.md` §20.1 a §20.3 como modelo; los §15 de las cuatro propuestas; los §8 de los tres juicios.

**Decisiones que escribe como hechos:** DD-01 a DD-20; D-27.

**Injertos que recibe:** I-12, I-13, I-16, I-22.

**Objeciones que resuelve:** O-15, O-19, O-20, O-21, O-23.

**Huecos que rellena:** H-06, H-13, H-21.

### §20 · Apéndices: injertos, objeciones, cobertura y vocabulario

`borrador/20-apendices.md` · 130 líneas · L3

**Contiene:**

1. **20.1 A. Los injertos y dónde cayeron.** Los 34, con su origen y la sección donde cayeron, de los bloques de cierre.
2. **20.2 B. Las objeciones resueltas y lo desestimado.** Las 33, y lo que se descartó de cada propuesta con su porqué (los «Descartado» de `00-decisiones.md`).
3. **20.3 C. La cobertura del encargo.** Los ocho puntos de `00-encargo.md` §1, las filas de su §2, la palabra del dueño de su §7.1, los once cambios de `01-fase-propuestas.md`, los siete componentes del encargo y las cinco categorías de maillot de `docs/retransmision.md` D.6: dónde se cumple cada uno (§D.5 y §D.6 de este esqueleto).
4. **20.4 D. Los huecos y las contradicciones de hecho.** Los 21 y las 26, con su resolución y su sección.
5. **20.5 E. El vocabulario.** Lo del glosario que el cuerpo no define, y los alias de §G.13.

**Escribe entero:** las tablas.

**Sale de:** `veredicto.json`; los bloques de cierre de las secciones; §D de este esqueleto.

---

## C. Los lotes

Tres lotes de redacción y la cabecera. Los correctores de la fase 5 trabajan por estos mismos lotes. Cada redactor lee `00-encargo.md`, este esqueleto, `00-glosario.md`, `00-decisiones.md`, `juicios/veredicto.json`, `propuestas/telefono.md` entera (la base) y las fuentes que citan las entradas de §B de sus secciones.

| Lote      | Secciones                                                                                                                                                 | Líneas    | Depende de                                                                                                | Lee además (si ya está) | Ola    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| L1        | §1 (Diagnóstico), §2 (Principios), §3 (Fundamentos), §4 (Componentes), §5 (El sistema que se hace cumplir), §6 (El teléfono), §7 (La prueba del teléfono) | 1.260     | ninguno: el glosario y las decisiones son el contrato                                                     | nada más                | 1      |
| L2        | §8 (La equipación), §9 (La señal de campeón y el resto del maillot), §10 (El cuadro), §11 (Lo que hay debajo), §12 (La web instalable), §13 (La frontera) | 1.260     | ninguno: nombra los componentes por el glosario                                                           | §4, §7                  | 1      |
| L3        | §14 (Lo que E2 dejó), §15 (Constantes), §16 (Tests), §17 (El plan), §18 (Riesgos), §19 (Decisiones del dueño), §20 (Apéndices)                            | 1.090     | L1 y L2: el plan, las constantes, los tests y las decisiones del dueño se escriben con lo que ellos fijan | todas                   | 2      |
| L0        | §0 (Cabecera y resumen)                                                                                                                                   | 100       | todo, tras la refutación (fase 6)                                                                         | todas                   | cierre |
| **Total** | 21 secciones                                                                                                                                              | **3.710** |                                                                                                           |                         |        |

Reglas de dependencia:

- **L1 y L2 van a la vez** (ola 1; `00-encargo.md` §5: los agentes trabajan como mucho de dos en dos). No se esperan: usan los nombres y las decisiones tal cual y remiten por `§N.m` a las subsecciones que fija §B. L2 pinta sus pantallas con los componentes de §G.3 sin redefinirlos; si necesita un estado que §G.4 no tiene, lo propone.
- **L3 va el último** (ola 2), porque el plan por PR (§17) y las decisiones del dueño (§19) se escriben con lo que L1 y L2 han fijado: los tests de §16 son los de sus secciones, las constantes de §15 las de sus secciones, y el apéndice de §20 se escribe con sus bloques de cierre. Si tiene que empezar antes, escribe desde §D de este esqueleto y el ensamblador lo corrige contra los bloques.
- **L0** la escribe el orquestador al cierre de la fase 6, con la línea de procedencia completa.

---

## D. Trazabilidad

Las cuatro primeras tablas salen de `juicios/veredicto.json` y de `00-decisiones.md` sin tocar; las demás son del esqueleto.

### D.1 Injerto → sección (los 34 de `veredicto.json`)

| Injerto | Origen                       | Qué                                                                       | Secciones         | Decisión    |
| ------- | ---------------------------- | ------------------------------------------------------------------------- | ----------------- | ----------- |
| I-01    | sistema §0, §2.1, §12 y §13  | el tema cerrado, `vocabulario.test.ts`, `deuda.json` y `ui/1` a `ui/10`   | §5, §16, §17      | D-14        |
| I-02    | sistema §13, paso 16         | la cola larga por deuda, unos 10 PR                                       | §17               | D-57        |
| I-03    | sistema §2.4, §4 y §12       | `data-*`, sin `className`, `/_ui` y los seis re-sellos                    | §4, §5, §16       | D-10        |
| I-04    | sistema §5 y §12             | la prueba sobre `/_ui` y el rendimiento cada noche                        | §7, §16           | D-18        |
| I-05    | identidad §6.2 y §13         | `ensureKits` en el tick, sin `NOT NULL`                                   | §8, §17           | D-22        |
| I-06    | identidad §6.2               | los seis sitios que ganan `kit`                                           | §8                | D-22        |
| I-07    | sistema §3.5 y §6.3          | la tabla de choques precalculada con huella                               | §8, §16           | D-24        |
| I-08    | lectura §1.5 y §7.5          | la vista previa del plan vivo; `PUT /plan` conserva el `startDay`         | §10, §11          | D-35        |
| I-09    | lectura §9                   | `response` obligatorio y la resolución en el tipo; el testigo de la moral | §13               | D-54        |
| I-10    | sistema §3.1                 | el ámbito oscuro                                                          | §3, §14           | D-04        |
| I-11    | sistema §8; lectura §8.2     | el service worker no intercepta `/api`, `/health` ni `/api/auth`          | §12               | D-46        |
| I-12    | identidad §6.5 y D3          | la banda de honor por defecto; `Sash` fuera                               | §8, §9, §19       | D-26, DD-03 |
| I-13    | identidad §6.5 y D3          | la tabla de variantes y el espectro en la diagonal                        | §9, §19           | D-27, DD-03 |
| I-14    | identidad §6.2, §6.3 y §6.6  | `team_kits` con historia; el patrocinio con `set_by`                      | §8, §9            | D-22, D-30  |
| I-15    | identidad §6.1; sistema §6.2 | la traducción por parecido y `legacyJerseyStyle`                          | §8                | D-23, DD-07 |
| I-16    | identidad §6.3 y D7          | el NPC cede                                                               | §8, §19           | D-24, DD-08 |
| I-17    | lectura §4.1; sistema §4     | la ficha de corredor                                                      | §4                | D-09        |
| I-18    | sistema §4; lectura §4.1     | el dorsal y el equipo en `RiderLabel`                                     | §4                | D-09        |
| I-19    | lectura §4.2                 | el glosario de pantalla                                                   | §4                | D-15        |
| I-20    | lectura §7.5                 | la portada habla del plan                                                 | §11               | D-43        |
| I-21    | sistema §3.3                 | la densidad por puntero                                                   | §3, §6            | D-06        |
| I-22    | sistema §15                  | el formato de las decisiones del dueño                                    | §19               |             |
| I-23    | identidad, principio 9       | el material generable como regla                                          | §3, §12, §14, §17 | D-08        |
| I-24    | identidad §6.1 y §6.7        | el filete claro sobre oscuro y `surface`                                  | §8, §9            | D-31        |
| I-25    | identidad §6.1 y §6.3        | la regla de contraste y el veredicto con equipo y visión                  | §8                | D-20, D-25  |
| I-26    | lectura §4.1                 | la fila propia anclada                                                    | §4, §6            | D-16        |
| I-27    | lectura §7.4                 | `↺ Back to Build`                                                         | §10               | D-40        |
| I-28    | lectura §7.3                 | la tira de siete días                                                     | §10               | D-40        |
| I-29    | lectura §8.3                 | la hora de los datos sin red                                              | §12               | D-47        |
| I-30    | sistema §4 n.º 15            | el esqueleto a los 300 ms                                                 | §4                | D-11        |
| I-31    | sistema §2.5 y §3.5          | `colorMath.ts`                                                            | §3, §8, §16       | D-02, D-24  |
| I-32    | lectura §4.1                 | la línea de estado del `PageHeader`                                       | §4, §10           | D-09, D-40  |
| I-33    | sistema §4 n.º 6             | `Disclosure`                                                              | §4                | D-09        |
| I-34    | lectura §4.1 y §7.4          | `TripRow`                                                                 | §4, §11           | D-43        |

### D.2 Objeción → sección (las 33)

| Objeción | Fuentes                               | Contra telefono                                 | Secciones | Decisión     |
| -------- | ------------------------------------- | ----------------------------------------------- | --------- | ------------ |
| O-01     | O-codigo-01                           | `teams.kit` no nulo con relleno en la migración | §8        | D-22         |
| O-02     | O-codigo-02                           | `black-translucent` sin área segura             | §12       | D-45         |
| O-03     | O-codigo-03                           | el 500 del esquema de respuesta; 3 o 4 PR       | §13, §17  | D-54         |
| O-04     | O-codigo-04                           | `exposes` no comprueba nada                     | §13       | D-54         |
| O-05     | O-codigo-05                           | el canario barre «las POST»                     | §13       | D-54         |
| O-06     | O-codigo-06, O-uso-03                 | nada impide reinventar                          | §5        | D-14         |
| O-07     | O-codigo-07                           | falta la cola larga                             | §17       | D-57         |
| O-08     | O-codigo-08                           | el sprite por Vite, con huella                  | §12       | D-49         |
| O-09     | O-codigo-09                           | `PREVIEW_RACE_DAY_TSS` es constante de juego    | §11, §15  | D-37         |
| O-10     | O-codigo-10, O-cobertura-05, O-uso-07 | el desfase de semanas                           | §10, §11  | D-35         |
| O-11     | O-codigo-11                           | Playwright y axe-core no son dependencias       | §7, §17   | D-18         |
| O-12     | O-codigo-12, O-cobertura-09, O-uso-06 | `KIT_MIN_PX` = 16 cambia `Watch`                | §8, §14   | D-21         |
| O-13     | O-codigo-13                           | la precarga de 80 ficheros                      | §12       | D-46         |
| O-14     | O-cobertura-01, O-uso-12              | la señal conserva el cuerpo blanco              | §9        | D-26, DD-03  |
| O-15     | O-cobertura-02                        | el descarte de la C estira el SPEC              | §9, §19   | D-27         |
| O-16     | O-cobertura-03                        | falta la ficha de corredor                      | §4        | D-09         |
| O-17     | O-cobertura-04                        | `RiderLabel` sin dorsal ni equipo               | §4        | D-09         |
| O-18     | O-cobertura-06                        | ni previa ni cierre; el resumen de §18.8        | §14       | D-56         |
| O-19     | O-cobertura-07                        | la espera y el NPC, fuera de §15                | §8, §19   | DD-08, DD-09 |
| O-20     | O-cobertura-08                        | la moral en palabras sin decisión               | §13, §19  | D-44, DD-12  |
| O-21     | O-cobertura-10                        | repintar las etapas grabadas                    | §8, §19   | D-23, DD-07  |
| O-22     | O-cobertura-11                        | `Your training queue is empty`                  | §11       | D-43         |
| O-23     | O-cobertura-12                        | decisiones sin consecuencia                     | §19       |              |
| O-24     | O-cobertura-13                        | el nombre del patrocinador, texto libre         | §9        | D-30, DD-19  |
| O-25     | O-cobertura-14                        | sin `Sash` hay que volver a medir               | §8, §16   | D-20         |
| O-26     | O-uso-01, O-uso-13                    | el mundo de la prueba y el paso previo          | §7, §17   | D-18         |
| O-27     | O-uso-02                              | la lista de pantallas                           | §7        | D-18         |
| O-28     | O-uso-04                              | el enlace del nombre mide 20 px                 | §4, §6    | D-16         |
| O-29     | O-uso-05                              | lo fijo sin orden ni tope                       | §4        | D-12         |
| O-30     | O-uso-08                              | los rótulos medidos con Inter                   | §6        | D-17         |
| O-31     | O-uso-09                              | ningún estado solo en color, sin mecanismo      | §3, §4    | D-13         |
| O-32     | O-uso-10                              | dos instrucciones para el mismo tramo           | §10       | D-42         |
| O-33     | O-uso-11                              | el escritorio sin columnas                      | §6        | D-16         |

### D.3 Hueco → sección (los 21)

| Hueco | Fuentes                  | Qué                                                | Secciones    | Decisión    |
| ----- | ------------------------ | -------------------------------------------------- | ------------ | ----------- |
| H-01  | H-codigo-01              | los rivales de temporada                           | §8           | D-24        |
| H-02  | H-codigo-02              | `jerseySeed` sigue cruzando la frontera            | §8, §13      | D-22, D-55  |
| H-03  | H-codigo-03              | el barril de `packages/shared` en el arranque      | §12          | D-50        |
| H-04  | H-codigo-04              | los planes ya solapados en producción              | §11          | D-39        |
| H-05  | H-cobertura-01           | el resumen accesible de la capa fija               | §14          | D-56        |
| H-06  | H-cobertura-02           | la línea `Your country: …`                         | §19          | DD-18       |
| H-07  | H-cobertura-03           | el título más largo en el rótulo                   | §14, §16     | D-56        |
| H-08  | H-cobertura-04           | la pantalla de órdenes                             | §18          | D-33        |
| H-09  | H-cobertura-05           | la 7-h de E2 y la banda nacional                   | §9           | D-26        |
| H-10  | H-cobertura-06           | los lunares, la serifa y la verificación de marcas | §18          | D-59        |
| H-11  | H-cobertura-07           | la edad en el rótulo                               | §14          | D-56        |
| H-12  | H-cobertura-08           | los documentos que E3 corrige                      | §17          | D-58        |
| H-13  | H-cobertura-09, H-uso-02 | un teléfono de verdad                              | §7, §19      | D-19, DD-20 |
| H-14  | H-cobertura-10           | lo real y lo generado                              | §4           | D-59        |
| H-15  | H-uso-01                 | el mundo de prueba reproducible                    | §7           | D-18        |
| H-16  | H-uso-03                 | el teclado virtual y el horizontal                 | §6, §7       | D-12, D-19  |
| H-17  | H-uso-04                 | la letra ampliada                                  | §7           | D-19        |
| H-18  | H-uso-05                 | los tonos de estado entre sí                       | §3           | D-13        |
| H-19  | H-uso-06                 | el lector de pantalla en un teléfono               | §7, §18      | D-19        |
| H-20  | H-uso-07                 | la carga del día de carrera sin contrastar         | §11, §16     | D-36        |
| H-21  | arquitecto               | el clon en producción y `teamIndexFromSeed`        | §8, §17, §19 | D-32, DD-17 |

### D.4 Contradicción de hecho → decisión → sección (las 26)

| X    | Tema                                                 | Resultado                         | Juez                         | Decisión   | Sección |
| ---- | ---------------------------------------------------- | --------------------------------- | ---------------------------- | ---------- | ------- |
| X-01 | `.strict()` y las claves de más de `teams/:id/news`  | falsa: solo mira la raíz          | codigo C2                    | D-54       | §13     |
| X-02 | ¿Caben doce colores para un daltónico?               | telefono cierta, sistema falsa    | cobertura C6, uso C4         | D-20       | §8      |
| X-03 | Recargar sin red con sesión                          | telefono cierta: `/login`         | codigo C3, cobertura C3, uso | D-47       | §12     |
| X-04 | `HorizonWatcher` y la caché sin red                  | a medias                          | uso                          | D-47       | §12     |
| X-05 | El desfase de semanas                                | cierta (lectura)                  | los tres                     | D-35       | §11     |
| X-06 | La carga de carrera y el motor                       | a medias: `applyDailyLoad`        | codigo C8                    | D-36       | §11     |
| X-07 | Las banderas en `public/flags/`                      | a medias: sin huella              | codigo C7                    | D-49       | §12     |
| X-08 | El maillot `not null` con relleno en la migración    | a medias                          | codigo C9                    | D-22       | §8      |
| X-09 | Playwright y axe-core en el CI                       | a medias: no son dependencias     | codigo C11                   | D-18       | §7      |
| X-10 | `black-translucent` en el primer paso                | a medias                          | codigo C12                   | D-45       | §12     |
| X-11 | El tema cerrado con `initial`                        | cierta                            | codigo C4                    | D-14       | §5      |
| X-12 | El lint sobre `.tsx`                                 | cierta; el encargo se queda corto | codigo C6                    | D-14       | §5      |
| X-13 | `stageTables.test.tsx` con el maillot en cada fila   | cierta                            | codigo C10                   | D-29       | §9      |
| X-14 | ¿El equipo líder es la fila 1?                       | a medias: no en la de la etapa    | cobertura C4                 | D-29       | §9      |
| X-15 | El resumen accesible de la capa fija                 | falsa: no existe                  | cobertura C5                 | D-56       | §14     |
| X-16 | Las distancias de las señales a la marca             | ciertas; mandan las del juez      | cobertura C7                 | D-26       | §9      |
| X-17 | Un dibujo para ruta, crono, élite y sub-23           | cierta                            | cobertura C1                 | D-26       | §9      |
| X-18 | Los prototipos del cuadro                            | a medias las tres                 | uso C1 a C3                  | D-40, D-16 | §10, §6 |
| X-19 | Doce maillots de 16 px en la barra de grupos         | a medias: 280 px                  | uso C7                       | D-21       | §8, §14 |
| X-20 | Las cuatro escalas de llegada                        | ciertas                           | uso C5                       | D-42       | §3, §10 |
| X-21 | El serializador quita lo no declarado                | cierta, también anidado           | codigo C1                    | D-54       | §13     |
| X-22 | El recuento de clases                                | las dos ciertas                   | arquitecto                   | D-14       | §5      |
| X-23 | El mundo de «génesis y tres días»                    | falsa                             | uso O-uso-01                 | D-18       | §7      |
| X-24 | Desde qué tamaño se pinta el nombre del patrocinador | por cálculo: 72 px                | arquitecto                   | D-30       | §9      |
| X-25 | La firma de `WornJerseyIcon`                         | la de E2 más `size` y `surface`   | arquitecto                   | D-31       | §9      |
| X-26 | El peso de la hoja con dos compresores               | las tres ciertas                  | arquitecto                   | D-50       | §12     |

### D.5 El encargo (`00-encargo.md` §1, §2 y §7.1) → sección

| Punto                                                                                          | Secciones             |
| ---------------------------------------------------------------------------------------------- | --------------------- |
| 1. El sistema visual (tipografía, paleta, densidad, jerarquía, rejilla, componentes y estados) | §3, §4, §5            |
| 2. El teléfono como criterio de aceptación, y la prueba de la app nativa                       | §6, §7; §12.8         |
| 3. El daltonismo: forma además de color                                                        | §3.2, §8.1 a §8.4, §9 |
| 4a. La señal de campeón, que no sea el arcoíris                                                | §9.1 a §9.6           |
| 4b. El maillot del equipo: el editor y un vocabulario acotado                                  | §8                    |
| 4c. Lo que compra el patrocinador                                                              | §9.9                  |
| 5. La web instalable                                                                           | §12                   |
| 6. El examen práctico: los tres defectos y los dos del viaje                                   | §10, §11              |
| 7. La regla de la frontera                                                                     | §13                   |
| 8. El material generable                                                                       | §3.8, §12.2, §14.7    |
| §2: E2 en producción y lo que deja a E3                                                        | §14                   |
| §2: el `ChampionMark` provisional                                                              | §9.1, §9.10           |
| §2: las doce semillas candidatas y los cinco patrones                                          | §1.8, §8.7, §8.9      |
| §2: el viaje, arreglado en el dato                                                             | §11.6                 |
| §2: el techo del entrenador ya en códigos                                                      | §13.5                 |
| §2: `raceId: null` y el `tsb` en la vista previa                                               | §11.2, §13.5          |
| §2: las cinco etiquetas y la precedencia                                                       | §10.4, §10.5          |
| §2: Tailwind v4 sin `tailwind.config`                                                          | §3.9, §5.1            |
| §2: la web instalable, inexistente                                                             | §1.7, §12             |
| §7.1: la palabra del dueño sobre la señal de campeón                                           | §9.3, §9.4, §19.4     |

### D.6 Los once cambios de `01-fase-propuestas.md` → sección

| Cambio                                                                        | Secciones           |
| ----------------------------------------------------------------------------- | ------------------- |
| 1. El examen no es solo de presentación                                       | §1.10, §11          |
| 2. La frontera se rompe por los números                                       | §13                 |
| 3. La semilla del maillot es la identidad del NPC: el clon                    | §1.9, §8.9, §17.3   |
| 4. Gemelos en visión normal, 13 px en `Watch`, líderes con colores de equipo  | §8, §9.7, §14.4     |
| 5. El dorsal del equipo líder no existe                                       | §9.8                |
| 6. El dueño no ha hablado del aspecto: las cuatro de gusto                    | §19.3               |
| 7. La escala de estrellas del SPEC está vieja                                 | §4.6, §13.5, §17.26 |
| 8. El estilo de hoy fue una decisión (PR #105)                                | §3.1                |
| 9. Ninguna pantalla desborda: el problema es lo recortado, la letra y el dedo | §1.4, §1.5, §6      |
| 10. Sin red la web se cae; iOS 26                                             | §12.4, §12.6        |
| 11. Las banderas son el 91 % de la CSS                                        | §12.7               |

### D.7 Decisiones sin evidencia de los jueces → quién las mide → sección

| Decisión | Qué                                                      | Quién lo mide, y en qué paso                                                                   | Sección     |
| -------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------- |
| D-04     | `line` y `line-strong` en el ámbito oscuro               | el redactor de §3, con `<scratchpad>/venv`                                                     | §3.3        |
| D-12     | cómo se detecta el teclado                               | `ActionBar.test.tsx` con `visualViewport` simulado, paso 9; en un aparato, la prueba del dueño | §4.9        |
| D-17     | el plan B de los rótulos por debajo de 340 px            | la comprobación 2 de la prueba, paso 11                                                        | §6.3        |
| D-18     | el tamaño y la restauración del mundo en la caché del CI | el paso 2                                                                                      | §7.2        |
| D-24     | el coste de `seasonRivals`                               | `seasonRivals.test.ts`, paso 16                                                                | §8.4        |
| D-30     | el umbral de 72 px del nombre del patrocinador           | cálculo (X-24); la comprobación 3 sobre `/_ui`                                                 | §9.9        |
| D-32     | el diseño del arreglo del clon                           | `jerseyClone.test.ts`, paso 1                                                                  | §8.9, §17.3 |
| D-36     | el trinquete de la carga de carrera                      | `planPreviewDiary.test.ts`, paso 13b                                                           | §11.3       |
| D-50     | `sideEffects: false` en `packages/shared`                | `peso.test.mjs`, paso 6                                                                        | §12.7       |
| D-54     | los 20 ms de serialización de la retransmisión           | el PR 19a                                                                                      | §13.4       |
| D-56     | la edad fuera del rótulo                                 | nadie: es de diseño                                                                            | §14.8       |

---

## E. Lo que este esqueleto fija por su cuenta

Además de `00-decisiones.md`, que no se reabre, este esqueleto fija seis cosas de forma y tres de fondo. De forma: (1) el título del documento, `El sistema visual: diseñado desde el teléfono, medido y que se hace cumplir (diseño final)`; (2) la numeración `## N.` y `### N.m` y los bloques de cierre de cada fichero; (3) dónde se escribe entero cada tipo (regla 7) y que §15 es la única tabla de constantes; (4) que §4 lista los componentes del maillot pero los dibujan §8 y §9; (5) el apéndice E con lo del glosario que el cuerpo no define, para que `docs/visual.md` se lea sin `borrador/`; (6) los tres lotes y sus dos olas, con la cabecera al cierre. De fondo: (1) **las migraciones se numeran por el orden del plan**, `0050_semilla_del_dibujo` (paso 1), `0051_un_plan_vivo` (13a), `0052_equipaciones` (16a), `0053_sin_semilla_del_dibujo` (19c) y `0054_telemetria` (23); si otra línea toma antes un número, manda el nombre; (2) **el examen va antes que los maillots** en el plan (pasos 13 a 15 frente a 16 a 18): lo pide el encargo como examen obligatorio, depende del catálogo y de nada del maillot, y su API (el 13a) puede empezar en cuanto exista la prueba del teléfono; (3) **el 13b es el único PR que toca `packages/engine/`**, con las tres constantes de D-37, y por eso paga solo él los ocho tramos de bancos. Ningún juez midió ni pidió estas tres.

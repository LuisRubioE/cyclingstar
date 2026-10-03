# Material de trabajo de los diseños

Tres materiales en un directorio. Los ficheros sueltos son los de táctica y entrenamiento, y los
explican las tres secciones que siguen; `e2-retransmision/` es el de la retransmisión, con su sección al
final; y `e1-generador/` es el del generador (`docs/generador.md`, E1, ya implementado), con la misma
estructura que el de E2, que lo tomó de modelo.

**Los dos documentos finales ya están escritos y viven fuera de aquí**: `docs/tactica.md` (6.340
líneas) y `docs/entrenamiento.md` (1.567). Este directorio es lo que se leyó y se escribió para
poder redactarlos.

La versión anterior de este README decía que se borraría entero cuando esos dos existieran. **Eso ya
no vale, y conviene decir por qué**: los dos documentos finales citan este material más de cuarenta
veces, y no de adorno. `docs/tactica.md` §4 cierra las situaciones **por identificador**
(`S-176`, `S-451`, `S-285`…), y esos identificadores solo significan algo si
`catalogo-situaciones.md` sigue existiendo. Borrarlo convertiría la única prueba de cobertura que
tiene el diseño en una lista de códigos huérfanos.

Así que el directorio se parte en dos por su destino:

## Lo que se queda: material citado

Se borra solo cuando el rediseño esté implementado y las situaciones se puedan comprobar contra el
código en vez de contra el catálogo.

| Fichero                           | Qué es                                                                                                                                                                                                                         | Quién lo cita          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `catalogo-situaciones.md`         | **Las 494 situaciones** con estado (CUBIERTO / PARCIAL / AUSENTE / CONTRARIO), la cita del dueño cuando la hay, la regla en una línea, los **28 racimos** y las **20 más graves**. Es la fuente de los identificadores `S-nnn` | `tactica.md` §4, Ap. A |
| `mapa-requisitos-duenio.md`       | El corpus de todo lo que ha pedido el dueño, sacado de las 10.144 líneas de `balance.md`: cita textual, versión, qué se hizo y estado. Termina con **41 peticiones abiertas**                                                  | los dos, 21 veces      |
| `mapa-bancos.md`                  | Las bandas de `sim/targets.ts`, los 46 invariantes y **22 cegueras: lo que hoy no se mide**                                                                                                                                    | los dos, 17 veces      |
| `mapa-simulate-decisiones.md`     | Las 51 decisiones de `stage/simulate.ts`, el bucle por bloque, `RiderSim`, y una tabla de **qué ve** cada decisión                                                                                                             | `tactica.md`           |
| `mapa-entrenamiento-atributos.md` | Atributos, progresión, Banister, sesiones, techos, edad y retiro, de punta a punta                                                                                                                                             | `entrenamiento.md`     |
| `mapa-spec.md`                    | `SPEC.md`, `motor.md` y `epics.md`, con las promesas que el código podría no cumplir                                                                                                                                           | `entrenamiento.md`     |

## Lo que es andamio: se puede borrar sin romper nada

Ningún documento final depende de estos. Se guardan porque los escribieron decenas de agentes
leyendo el motor entero durante horas y rehacerlos costaría todo ese análisis otra vez.

- **Los mapas no citados**: `mapa-tactics.md`, `mapa-equipo-ordenes-final.md`,
  `mapa-jugador-humano.md`. Siguen siendo la mejor descripción de lo que hace el motor **hoy**, que
  es justo lo que se pierde en cuanto se empiece a cambiar.
- **Las once lentes** del catálogo antes de fundirlas: `casos-formato.md`, `-fase.md`, `-equipo.md`,
  `-general.md`, `-grupo.md`, `-incidente.md`, `-memoria.md`, `-humano.md`, `-secundarias.md`,
  `-final.md`, `-colectivo.md`. Cada situación aquí trae el texto completo —cuándo pasa, quién
  decide, qué pasa en la carretera, qué hace hoy el motor, cómo se mediría—, que en el catálogo se
  resume a una línea. Los `indice-grupo-*.md` son el reparto con el que se fundieron.
- **Las siete propuestas perdedoras**: `tactica-propuesta-{agentes,dominio,datos}.md`,
  `tactica-propuesta-incremental.md` (la ganadora **antes** de los injertos y de la refutación) y
  `entrenamiento-propuesta-{fisiologo,juego,ingeniero}.md`. Son cuatro diseños alternativos
  completos del motor táctico y tres del entrenamiento. No están en el final porque los jueces
  eligieron otro, no porque sean malos: cada uno vio algo que los demás no.

## Cómo se llegó a los dos documentos

Táctica: cuatro propuestas independientes → tres jueces con focos distintos (cobertura, coherencia
con el motor y coste, ejecutabilidad y fidelidad al dueño) → una síntesis sobre la ganadora con los
injertos que pidieron los jueces → **cuatro refutadores adversarios** (contra el código, por
cobertura, contra el dueño, por coste) que sacaron **86 fallos** → cuatro correctores en serie → una
pasada de coherencia → una auditoría final que volvió a mirar los 86 uno a uno contra el texto. El
recuento y las objeciones desestimadas están en la cabecera y en el Apéndice C de `docs/tactica.md`.

Entrenamiento: tres propuestas → tres jueces → síntesis → revisión adversaria. Sus objeciones
desestimadas están en §11 de `docs/entrenamiento.md`.

**Nada de los dos documentos está implementado.** Los dos terminan con una sección de decisiones que
son del dueño y otra de lo que mueven y hay que decidir en bloque; hasta que esas se contesten, son
diseño y no plan en marcha.

## `e2-retransmision/`: el material de la retransmisión (E2)

**El documento final ya está escrito y vive fuera de aquí**: `docs/retransmision.md` (11.494 líneas,
del 3 de octubre de 2026). Es el diseño de E2, **escrito y sin implementar**: veintisiete de sus
decisiones son del dueño y esperan respuesta en su §20, cada una con un valor por defecto que es el
que se implementa si no contesta, y la regla de arranque de `docs/encargos.md` (l. 15-26) no deja abrir
el código hasta que la línea de la táctica y el entrenamiento esté en producción. Este directorio es lo
que se leyó y se escribió para redactarlo, y se parte en dos por su destino, como el de arriba.

### Cómo se llegó

Siete mapas del código y de los documentos (`mapas/`) → cinco propuestas independientes
(`producto`, `estado`, `ingeniero`, `datos` y `television`) → tres jueces con focos distintos
(cobertura y fidelidad al dueño; coherencia con el motor, los datos y el coste; ejecutabilidad y
experiencia del jugador), sin mayoría: un voto cada uno para `producto`, `estado` e `ingeniero` → base
`ingeniero`, por suma de puntuaciones (92,5 de 120, frente a 91 de `estado`), con los **49 injertos**
que pidieron los jueces → un esqueleto con glosario y 62 decisiones cerradas, y diez redactores por lotes →
**cuatro refutadores adversarios** (contra el código, por cobertura, contra el dueño y por coste) que
sacaron **246 hallazgos**, 27 de ellos altos → **diez correctores**, uno por lote, con 299 cruzadas a
las secciones de otros lotes → una pasada de coherencia → **diez auditores** que volvieron a mirar cada
hallazgo, cada cruzada y sus propias comprobaciones contra el texto y no contra los informes de
corrección: **777 veredictos** → el cierre, que fundió las auditorías en el resultado final y escribió
la cabecera → el ensamblado, con `borrador/ensamblar.sh --final --comprobar`. De los 246 hallazgos,
243 están aplicados enteros, 2 en parte y 1 desestimado; lo desestimado, con su porqué, está en el
Apéndice B (§21.2) del documento, y el recuento, en su §0.8.

### Lo que se queda: material citado

El documento nombra estos ficheros por sus identificadores, y sin ellos esos identificadores no
llevarían a ninguna parte. Se quedan mientras `docs/retransmision.md` sea el diseño que manda.

| Fichero                                                                    | Qué es                                                                                                                                                                                                                                                                                                                                                 | Quién lo cita                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `mapas/01..07-*.md`                                                        | Los siete mapas: qué emite el motor y con qué reloj (01), la API, el tick y el correo (02), las 48 superficies que enseñan un resultado (03), los datos, el tiempo y el jugador (04), el corpus del dueño con [DUEÑO 1] a [DUEÑO 10], [DOC 1] a [DOC 7] y quince contradicciones (05), la gramática de la televisión (06) y los tests y contratos (07) | el documento, unas 340 veces («mapa 05 §6»)                                                  |
| `juicios/veredicto.json`                                                   | La consolidación de los tres juicios: el cálculo de la ganadora, los 49 injertos, las 32 objeciones, los 23 huecos y las 24 contradicciones de hecho                                                                                                                                                                                                   | los bloques de cierre de cada sección y §21, que trazan cada `I-nn`, `O-nn`, `H-nn` y `X-nn` |
| `juicios/cobertura.md`, `motor.md` y `ejecutabilidad.md` (con sus `.json`) | Los tres juicios; `motor.md` §2 son las comprobaciones `C1` a `C18`, de donde salen muchas de las cifras medidas                                                                                                                                                                                                                                       | más de cien veces: `C4`, «cobertura §2.1», «ejecutabilidad #9»                               |
| `refutaciones/resultado-final.json`                                        | El detalle de los 246 hallazgos, uno a uno, con sus entradas de corrección y sus veredictos de auditoría, y los recuentos por gravedad, por foco y por sección                                                                                                                                                                                         | §0.8, y cada `Rcodigo-nnn`, `Rcobertura-nnn`, `Rdueno-nnn` y `Rcoste-nnn` del texto          |
| `borrador/00-decisiones.md`                                                | Las 62 decisiones que cerró la síntesis (`D-01` a `D-62`) y las del dueño, con su evidencia y sus descartes, y el registro de lo que cambió cada fase                                                                                                                                                                                                  | el documento escribe cada `D-nn` como hecho, unas 1.300 veces                                |
| `00-encargo.md`                                                            | El encargo que leyó cada agente, con el de `docs/encargos.md` resumido en seis puntos                                                                                                                                                                                                                                                                  | §0, §1, §7, §12, §13, §15 y §21                                                              |

### Lo que es andamio: se puede borrar sin romper nada

El documento no remite a ellos para leerse: lo que tomó de cada uno está escrito en él. Se guardan por
lo mismo que el andamio de arriba: rehacerlos costaría todo el análisis otra vez.

- **Las cinco propuestas** (`propuestas/`), la ganadora antes de los injertos y las otras cuatro. El
  documento las nombra unas doscientas veces como origen de una idea o de un descarte (`estado.md`
  §3.6), pero escribe lo que toma de ellas: borrarlas quita la prueba de dónde salió, no una parte del
  diseño.
- **`borrador/` menos `00-decisiones.md`**: el esqueleto y el glosario de la síntesis, los veintidós
  ficheros de sección, los ensamblados `retransmision-v0.md` y `-v1.md`, `dudas.md` y
  `notas-orquestador.md`. Las secciones y `ensamblar.sh` regeneran el documento final
  (`--final --comprobar`), pero el documento no depende de ellos.
- **El resto de `refutaciones/`**: los hallazgos de los cuatro refutadores y su reparto por lotes
  (`hallazgos-*.json`, `por-lote/`), las correcciones, las cruzadas, la coherencia, las diez auditorías
  y la resolución cruzada. Su contenido está fundido en `resultado-final.json`.
- **Las instrucciones de cada fase y el estado del proceso**: `01-fase-propuestas.md` a
  `05-fase-auditoria.md` y `ESTADO.md`.

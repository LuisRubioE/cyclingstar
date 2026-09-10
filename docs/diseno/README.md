# Material de trabajo del rediseño (táctica + entrenamiento)

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

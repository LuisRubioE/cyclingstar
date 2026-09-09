# Material de trabajo del rediseño (táctica + entrenamiento)

**Esto no son documentos de producto: es el material en bruto** con el que se están escribiendo los
dos que sí lo serán (`docs/tactica.md`, reescrito, y el de entrenamiento). Se guarda en el
repositorio por una razón práctica y no por otra: lo escribieron decenas de agentes leyendo el motor
entero durante horas, vivía en un directorio temporal, y perderlo costaría rehacer todo el análisis.

**Se borra entero cuando los dos documentos finales estén escritos y aprobados.**

## Qué hay

### Mapas del motor tal como está hoy (leídos del código, no de la memoria)

| Fichero                           | Qué mapea                                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `mapa-simulate-decisiones.md`     | Las 51 decisiones de `stage/simulate.ts`, el bucle por bloque, `RiderSim`, y una tabla de QUÉ VE cada decisión                                                                                                           |
| `mapa-tactics.md`                 | Ataque, seguimiento, cuerda, tensión, cooperación, marcaje y persecución                                                                                                                                                 |
| `mapa-equipo-ordenes-final.md`    | Plan de equipo, todas las órdenes del jugador, `autoOrders`, convocatorias y modelo de final                                                                                                                             |
| `mapa-entrenamiento-atributos.md` | Atributos, progresión, Banister, sesiones, techos, edad y retiro, de punta a punta                                                                                                                                       |
| `mapa-bancos.md`                  | Las bandas de `sim/targets.ts`, los 46 invariantes, y **22 cegueras: lo que hoy no se mide**                                                                                                                             |
| `mapa-jugador-humano.md`          | Qué decide, qué ve y **qué no puede expresar** un humano                                                                                                                                                                 |
| `mapa-spec.md`                    | `SPEC.md`, `motor.md` y `epics.md`, con las promesas que el código podría no cumplir                                                                                                                                     |
| `mapa-requisitos-duenio.md`       | **El corpus de lo que ha pedido el dueño**, sacado de las 10.144 líneas de `balance.md`: cada cita textual con su versión, lo que se hizo, y su estado. Termina con 41 peticiones que la propia bitácora da por abiertas |

### Catálogo de casuísticas (una lente por fichero, sin fusionar todavía)

`casos-formato.md` (50 situaciones), `casos-fase.md` (52), `casos-equipo.md` (53),
`casos-general.md`, `casos-grupo.md`, `casos-incidente.md`. Faltan las lentes de memoria entre
etapas, jugador humano, clasificaciones secundarias, tipo de final y decisión colectiva del pelotón;
y falta fundirlas en un catálogo único con IDs estables.

### Entrenamiento y atributos

Tres propuestas independientes (`entrenamiento-propuesta-fisiologo.md`, `-juego.md`,
`-ingeniero.md`), y `diseno-entrenamiento.md`, que es la síntesis de la ganadora con los injertos que
pidieron los tres jueces. **Le falta pasar la revisión adversaria** contra el código y contra el
corpus del dueño.

# El motor de etapa: cómo funciona hoy y qué hay que cambiarle

Estado: **documento de diagnóstico y propuesta, para discutir.** Nada de esto está implementado.

Ámbito: `packages/engine/src/stage/` (2.333 líneas sin tests). Referencias a SPEC 6.

---

## Parte I — Cómo funciona hoy

### 1. La arquitectura, en una frase

El motor mueve **grupos**, no corredores. Cada grupo es un cursor que avanza el recorrido en bloques
de 100 m arrastrando su propio cronómetro; un boquete no se estima, se integra bloque a bloque; una
captura es la fusión de dos relojes que se juntan.

```
StageProfile (tramos de autoría)
      │  sample.ts
      ▼
Block[] (bloques de 100 m: pendiente, terreno, estrellas de pavés, banner)
      │  simulate.ts  ← bucle principal, un paso por bloque
      ▼
StageOutput { events, results, workUnits, incidents, engineVersion }
```

Todo es puro y determinista. El azar entra solo por subflujos nominales del RNG sembrado
(`breakaway`, `sprint`, `hazard`, `crash`, `day`), creados una sola vez para que la secuencia
sobreviva a refactores.

### 2. Las piezas que están bien

Esto conviene decirlo antes de la crítica, porque condiciona la conclusión.

**`physics.ts` (219 líneas) es ejemplar.** Funciones pequeñas, puras, cada una con su referencia al
SPEC y **todos** sus números en `constants.ts`:

- **Ley de velocidad** — `v_obj = vRef(g,terreno) · (P75/75)^0.34 · ritmo(c)`. Una sola ley sirve al
  pelotón, a la fuga, al descolgado y a la contrarreloj: cambian las entradas, no la física.
- **Aceleración acotada y asimétrica**, en km/h **por segundo** (no por bloque) — de ahí que la
  invariancia de resolución dx=0.1 vs 0.05 pase por debajo del 5%.
- **Coste, tanque y rebufo** — `coste = dx · costeBase · ritmo^1.6 · (1 − draftMax · shelter)`.
- **Erosión** — un umbral que depende de RES, y coeficientes por atributo: el sprinter (0.45) pierde
  punta mucho antes que el rodador táctico (0.15).
- **Cerillos** — con su asimetría y penalización por TSB bajo.

**`group.ts` (104 líneas)** modela grupo, P75 de los que marcan el ritmo, boquete, captura y fusión.
Correcto y minúsculo.

**El arnés de invariantes** (`sim/invariants.test.ts`) es serio: Montecarlo determinista con rangos
objetivo del SPEC 6.17, y pasa.

> **Conclusión anticipada: el problema no es la física.** Es lo que la orquesta.

### 3. Qué ocurre exactamente en una etapa, hoy

`simulate.ts::simulateStage`, en orden real de ejecución:

**Antes del bucle**

1. **Piernas del día.** Cada corredor recibe un multiplicador único (±3σ) que escala _todos_ sus
   atributos. Un corredor algo inferior puede ganar a otro mejor que tiene un mal día.
2. **Se forma la fuga.** Se filtran los candidatos —rol `cazaetapas` **o** mentalidad
   `combativo`/`supercombativo`—, se puntúan con `0.5·TAC + 0.3·LLA + ruido` y se toman los 3 a 6
   primeros. Se fecha la escapada en un km temprano para la crónica.
3. **Se clasifica la meta** mirando los últimos ~20 bloques (2 km): `finishFlat` si todo es llano o
   descenso, `finishUphill` si **algún** bloque sube.

**El bucle, un paso por cada bloque de 100 m**

4. **Controlador del pelotón** (cada 10 bloques, con histéresis). Dos modos y solo dos:
   - _Hay sprinters y la meta es llana_ → persiguen; el boquete deseado mengua hasta 0 a 12 km de
     meta; si el cierre necesario es inviable, claudican (`sprinters_give_up`).
   - _Si no_ → control de la general: tempo en el llano, y `climbRaceCommit` (a tope) en cuanto el
     bloque sube.
5. **Descuelgue (`shatter`)** — **solo si el bloque es subida**. Quien va por debajo del P75 del
   grupo más una tolerancia tiene una probabilidad `λ` de descolgarse; si le quedan cerillos y no es
   `reservón`, quema uno y aguanta; si no, sale a un grupo propio.
6. **Avance físico** de pelotón, fuga y cada grupo de descolgados, con su gasto de energía.
7. **Reenganche de descolgados** — en llano/descenso cierran a un ritmo fijo (s/km) y se reenganchan
   o se funden en grupetos.
8. **Caídas** en pavés, descensos y el embudo final.
9. **Captura** de la fuga si el boquete cae a ≤5 s.
10. **Banners** — meta volante (solo el grupo de cabeza) y cima (puntúa todo el pelotón por orden de
    coronación).

**En meta**

11. Dentro de cada grupo se ordena por una puntuación y se asignan tiempos, puestos, bonificaciones
    y puntos.

---

## Parte II — Qué está mal

Ordenado por cuánto explica la sensación de "resultados basura".

### 4. El problema de fondo: la carrera no decide la carrera

Esta es la línea más importante del motor (`simulate.ts:669`):

```ts
const base = finishUphill ? Math.max(eff.MON, eff.COL) : eff.SPR
let score = base * normal(rngSprint, 1, STAGE.sprintScoreNoiseSd)
```

El orden de llegada **dentro de un grupo** se decide por **un solo atributo más ruido**. Con eso:

- **Solo existen dos arquetipos de final en todo el juego: sprinter o escalador.** No hay final de
  _puncheur_, ni de pavés (PAV no interviene jamás en el resultado), ni de grupo reducido donde
  cuente la táctica, ni de descenso, ni de fuga que aguanta por astucia.
- Una clásica dura que termina en falso llano tras una cota se resuelve **a puro SPR**: gana el
  sprinter que haya sobrevivido, aunque haya pasado el día escondido. Esto explica, tal cual, "los
  sprints los gana quien no debe".
- **El trabajo del día no se paga.** El corredor que ha relevado 100 km y el que ha ido a rueda
  llegan a la meta con la misma lotería, salvo por la erosión. `workUnits` **ya se calcula** y no se
  usa para nada en el resultado.
- **`finishUphill` es binario y frágil**: basta que _un_ bloque de los últimos 2 km suba para que
  toda la meta pase a decidirse por MON/COL. Una rampa de 200 m antes de meta convierte una etapa
  llana en una llegada de escaladores.

### 5. No hay ataques. Ninguno

Verificado: la palabra "ataque" solo aparece en comentarios y en un módulo que no se usa. En todo el
bucle **solo existen dos formas de sacar tiempo**:

1. Estar en la fuga inicial, que se forma una vez y antes del km 0.
2. Ser descolgado en una subida.

No hay contraataques, ni puentes a la fuga, ni ataques a falta de 5 km, ni un favorito que se va
solo en el último puerto, ni relevos de un grupo perseguidor. **Todas las carreras siguen el mismo
guion**: se forma la fuga → el pelotón controla → la caza o no → sprint o criba en la subida.

Esto no es un olvido: los parámetros existen y están documentados en `constants.ts` con su
referencia al SPEC (`lambdaCounterAttack`, `lambdaBridge`, `lambdaLateAttack`, `lambdaClimbAttack`,
`breakawayTension*`, `bridgeGapMin/Max`, `lateAttackKm`, `teamTt*`…). **Están definidos y no se leen
desde ninguna parte.** El motor promete una carrera táctica y ejecuta una carrera de tempo.

### 6. La fuga es un casting fijo

- Solo pueden fugarse quienes traen rol `cazaetapas` o mentalidad combativa. Un escalador o un
  sprinter **jamás** entran en una fuga.
- Se puntúa por `TAC + LLA`: siempre se fugan los mismos perfiles.
- Se forma **una vez**. Si la cazan, no hay nada después: no se rehace, nadie contraataca.
- `Group.tension` —la sociología de la fuga: quién colabora, quién se guarda— **se calcula, se
  promedia al fusionar grupos y no se lee nunca**.

### 7. La selección solo existe en las subidas

`shatter` arranca con `if (block.tipo !== 'subida') return []`. Consecuencias:

- **En el pavés no se descuelga nadie.** PAV afecta a la velocidad del grupo, pero no provoca
  selección: en una clásica de adoquines la única forma de perder tiempo es caerse. Es un
  agujero grande para las clásicas.
- En descenso tampoco hay selección (DES apenas influye en el resultado).
- Los abanicos están fuera del MVP a propósito, así que eso no cuenta como defecto.

### 8. Mecánicas documentadas que nunca se ejecutan

Además de los ataques y la tensión:

| Mecánica                           | Estado real         | Evidencia                                                                                                                                                                                     |
| ---------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pájara (_bonk_)**                | **Nunca se activa** | `effNow(eff0, e)` se llama siempre con 2 argumentos; el 3.º (`bonk`) jamás se pasa. Todo el bloque de `physics.ts:207-218` (atributos físicos ×0.55 y descuelgue automático) es código muerto |
| **Abandonos / fuera de control**   | **Nunca ocurren**   | No se produce ni un `'abandon'` ni un `'dnf'` en todo el motor. En una gran vuelta de 21 etapas con caídas y lesiones, los 176 salen y los 176 acaban, siempre                                |
| **Marcaje**                        | Duplicado           | `marcaje.ts` está probado y exportado, pero `simulate.ts` **no lo llama**: reimplementa la fórmula en línea (`:365-373`). Ajustar el módulo "oficial" no cambia nada en carrera               |
| **Contrarreloj por equipos (CRE)** | Sin implementar     | `teamTtShelter`, `teamTtPaceRider`, `teamTtPaceFactor` definidos y sin usar                                                                                                                   |

### 9. Defectos concretos de menor calado

- **Quién releva se decide por el orden del array** (`:328`, `relaying = idx / members.length <
paceFraction`). Los primeros de `input.riders` gastan siempre más, y un líder que aparezca pronto
  en la lista nunca recibe la protección de sus gregarios. Determinista, pero arbitrario. _(Ya está
  en corrección.)_
- **Los puntos de banner y cima usan `eff0`, no `effNow`** (`:573`, `:609`): ignoran la erosión, así
  que un escalador reventado sigue coronando primero.
- **Parches sobre la falta de un modelo de persecución**: el tiempo de un grupo descolgado se
  _pega_ al del pelotón en llano (`:440`) y los descolgados cierran a un ritmo fijo en s/km
  (`:449`). El propio comentario admite que se añadió para tapar "fugas fantasma". Funciona, pero
  es sintomático.
- **El controlador del pelotón no sabe de equipos**: no hay "el equipo del líder defiende", ni
  intereses distintos por equipo. Solo "hay sprinters" o "no los hay".

### 10. Por qué los invariantes pasan y aun así los resultados son malos

No es una contradicción, y conviene entenderlo bien:

Los invariantes miden **estadística agregada sobre escenarios canónicos**: qué porcentaje de veces
gana la fuga, cada cuánto se captura, qué brechas salen en una etapa reina. Eso puede estar bien
**mientras cada carrera individual es inverosímil**. "El mejor sprinter gana el 43% de las llanas"
es cierto y sano; que _ese_ sprinter gane también la clásica de muros porque el último bloque es
llano, no lo es.

Y hay un segundo agujero: los invariantes solo corren sobre los escenarios canónicos y los perfiles
hechos a mano. **1.271 de las 1.418 etapas del calendario (90%) usan perfiles generados** que nunca
se han validado contra nada. Un motor razonable con un perfil absurdo produce una carrera absurda.

---

## Parte III — Qué hay que cambiarle

### 11. La decisión de fondo: evolucionar, no reescribir

**Recomendación: no rehacer el motor de cero.** Razones:

- La capa cara y difícil —ley de velocidad, inercia acotada, coste/rebufo/erosión, relojes de grupo,
  invariancia de resolución— **está bien hecha y calibrada**, y rehacerla es meses.
- Lo que falla es la capa **táctica** (que no existe) y la de **resolución del final** (que es una
  lotería de un atributo). Ambas se pueden construir _encima_ de la física actual sin tocarla.
- Un reinicio tira además el trabajo de calibración de `docs/balance.md`.

Lo que sí hay que aceptar es que **la capa táctica es prácticamente un desarrollo nuevo**, no un
retoque. No es "arreglar bugs": es escribir la mitad que falta.

### 12. Cambio 1 — Modelo de final (el que más impacto tiene)

Sustituir `finishUphill ? MON/COL : SPR` por un **tipo de final derivado del recorrido**, y una
puntuación compuesta.

Tipos propuestos: `sprint_masivo`, `sprint_reducido`, `puncheur`, `alto`, `pave`, `descenso`,
`solitario`.

- El tipo se deriva de los últimos ~5 km (no de 2), ponderando pendiente media, dureza acumulada de
  la última cota y a qué distancia de meta corona, y el tamaño del grupo que llega.
- La puntuación pasa a ser una **mezcla de atributos con pesos por tipo de final**, en lugar de uno
  solo. Un final de _puncheur_ mezcla COL, SPR y TAC; uno de pavés, PAV y LLA.
- **Penalizar el trabajo hecho**: `workUnits` ya está calculado; quien ha tirado todo el día llega
  con menos. Es lo que hace que "ir a rueda" sea una decisión con coste de oportunidad, y no la
  única estrategia ganadora.
- Aplicar erosión también a los banners.

### 13. Cambio 2 — Capa táctica: que existan los ataques

Es el corazón que falta. Propuesta de mecánica única y reutilizable: un **intento de movimiento**,
evaluado en los puntos donde tiene sentido (deciles empinados, coronación, últimos km, entrada al
pavés), con el marco de hazard que ya existe (`p = 1 − e^{−λ·dx}`).

Cada intento nace de: rol y mentalidad de las órdenes + situación de carrera (¿voy perdido en la
general? ¿queda mi terreno?) + cerillos y energía restantes. Un ataque exitoso **crea un grupo
nuevo** con su reloj — es decir, reutiliza toda la maquinaria de grupos que ya funciona.

Con eso se activan de golpe las constantes muertas: contraataques, puentes, ataques tardíos,
tensión de la fuga (fugados que dejan de colaborar cuando huelen la victoria).

**Este es el cambio que hace que dos carreras no se parezcan.**

### 14. Cambio 3 — Selección fuera de la montaña

Extender `shatter` al pavés (con PAV) y a los descensos (con DES). Sin esto, las clásicas de
adoquines no son clásicas de adoquines.

### 15. Cambio 4 — Consecuencias de la fatiga

- **Activar la pájara**: pasar `bonk` a `effNow` cuando el tanque llega a cero. El código ya existe.
- **Abandonos y fuera de control**: que una lesión grave pueda significar no terminar, y que exista
  el corte de tiempo. Hoy el tipo `StageResult` ya contempla `'abandon' | 'dnf'` y nunca se emiten.

### 16. Cambio 5 — Telemetría: que el motor cuente lo que sabe

Hoy `StageOutput` solo lleva `events, results, workUnits, incidents`, y hay **14 puntos de emisión
de eventos** en todo el motor. El motor simula bloque a bloque —energía, cerillos, grupos, brechas—
y **tira todo eso**. Por eso el journal es pobre: no es que se cuente mal, es que no hay qué contar.

Propuesta: separar **telemetría** de **narrativa**.

- **Telemetría** (nueva, estructurada): estado de los grupos cada N bloques —composición, brecha,
  velocidad—, y los hitos por corredor (cuándo quemó cada cerillo, cuándo se descolgó, cuándo
  atacó). Es dato, no texto.
- **Narrativa**: se construye _a partir_ de la telemetría, fuera del motor.

La ventaja es que con **un solo dato** se pueden alimentar varias vistas distintas (ver más abajo),
y que los replays dejan de depender de re-simular.

### 17. Orden de trabajo propuesto

| #   | Trabajo                                          | Por qué en este puesto                                                                                                             |
| --- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Perfiles reales** (extracción y validación)    | Es la **entrada** del motor. Calibrar la física contra perfiles basura es meter compensaciones erróneas que luego hay que deshacer |
| 2   | Modelo de final (§12)                            | Máximo impacto por esfuerzo: arregla "gana quien no debe" sin tocar la física                                                      |
| 3   | Capa táctica (§13)                               | El desarrollo grande. Es lo que hace que las carreras se distingan                                                                 |
| 4   | Selección en pavés/descenso (§14) y fatiga (§15) | Completan el realismo por tipo de carrera                                                                                          |
| 5   | Telemetría (§16)                                 | Habilita el journal y las vistas nuevas                                                                                            |
| 6   | Recalibración completa con Montecarlo            | Solo tiene sentido al final, con entradas buenas y mecánicas completas                                                             |

Cada cambio de comportamiento incrementa `engine_version` y se anota en `docs/balance.md`.

---

## Parte IV — El output: cómo ver lo que pasó

Requisito recogido: **hay muchas carreras en las que mi ciclista no participa, y un visitante sin
cuenta debe poder ver el resultado de una carrera.** Por tanto la vista de espectador no es
secundaria: es la principal, y la personal es un añadido cuando procede.

Propuesta de tres vistas sobre la **misma** telemetría:

1. **Vista de espectador (pública, sin sesión).** Es la que se comparte y la que indexa Google.
   Resultado, general, y el **desarrollo de la carrera**: un gráfico de brechas entre grupos a lo
   largo del recorrido —de un vistazo se ve cuándo se fue la fuga, cuánto llegó a sacar y dónde la
   cazaron— más los momentos decisivos y quién hizo el trabajo (`workUnits` ya existe y hoy no se
   enseña).

2. **Vista personal (solo si mi corredor participa).** La misma carrera contada desde _mi_ rueda:
   dónde iba en cada momento, cuándo quemé cerillos, dónde me descolgué o resistí, y qué habría
   pasado con otras órdenes. Es la que engancha y la que se pega en el Discord.

3. **Crónica narrada.** El texto actual, pero alimentado por una telemetría rica en vez de por 9
   plantillas.

Nota: hoy la crónica se genera en **dos sitios distintos** con ~120 líneas duplicadas en la API, y
la lógica de narración vive dentro de un cliente HTTP del front (`api/results.ts`). Esa reubicación
ya está en marcha en el trabajo de corrección en curso.

---

## Parte V — Cuestiones abiertas para decidir

1. **Alcance de la capa táctica.** ¿Modelo simple (intentos con probabilidad y respuesta del
   pelotón) o modelo de intenciones por equipo (cada equipo con objetivos y presupuesto de
   esfuerzo)? Lo segundo es bastante más caro y bastante más realista.
2. **¿Cuánto debe pesar el azar?** Hoy hay dos fuentes: piernas del día (±3σ sobre todos los
   atributos) y el ruido del sprint. Con una capa táctica de verdad, quizá sobre parte de ese ruido.
3. **Perfiles**: con 532 campeonatos nacionales (133 países × 4) que PCS no va a cubrir para la
   mayoría de países, ¿aceptamos un generador _consciente de la identidad_ del país (un nacional
   belga es llano y de adoquines; uno colombiano, de montaña) para ese bloque concreto?
4. **CRE**: ¿entra en el MVP o se retira del `constants.ts` hasta que toque?
5. **Abandonos**: ¿queremos que un usuario real pueda no terminar una gran vuelta? Tiene
   consecuencias de producto (frustración) además de realismo.

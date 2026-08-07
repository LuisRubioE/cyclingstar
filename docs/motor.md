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

### 3-bis. La evidencia medida (campañas de 60 a 300 semillas)

Todo lo de esta sección está **medido**, no razonado, y es **preexistente**: los mismos números
salen antes y después de la limpieza reciente.

**a) El desgaste no existe. Es la causa raíz.**

|                               | Llana 180         | Reina 150         |
| ----------------------------- | ----------------- | ----------------- |
| Gasto mediano del tanque      | 46,1 / 100        | 54,6 / 100        |
| Umbral de erosión (RES 55-56) | 0,57              | 0,57              |
| **Erosión resultante**        | **0,000 siempre** | **0,000 siempre** |

`effNow == eff0` en todas las etapas. **RES, los coeficientes de erosión, la durabilidad y el
tanque no cambian absolutamente nada**: el ganador se decide con los atributos frescos del km 0.
Súmese que la pájara nunca dispara y que gastar un cerillo no cuesta energía (`matchCost` sin uso):
el tanque es decorativo. Un juego de ciclismo sin desgaste no puede producir carreras creíbles.

**b) El controlador del pelotón vive dentro de `if (breakaway && !caught …)` (`simulate.ts:235`).**

- **Sin fuga, el pelotón rueda toda la etapa a `commitIdle` = 0,1.** Mismo campo, misma etapa de 180
  km: **con fuga 3h49′ (47,0 km/h) · sin fuga 4h28′ (40,3 km/h)**. 39 minutos de diferencia por un
  detalle de composición del campo.
- Al capturar la fuga se hace `breakaway = null` y **el compromiso queda congelado** el resto de la
  etapa: en llano la captura mediana llega a 25 km de meta, así que el final rueda sin regulación.
- Consecuencia demoledora: un descolgado suelto (`shedCommit` 0,7) **va más rápido que el pelotón**
  (0,1). Con un MON 82 y un MON 74 idénticos en todo lo demás, puerto de 12 km al 8%: **el peor
  escalador gana en 55 de 60 etapas, por 4′16″ de mediana.**

**c) Velocidades fuera de rango.**

| Escenario                | Motor                         | Realidad WT                 |
| ------------------------ | ----------------------------- | --------------------------- |
| Llana 180 km             | **47,1 km/h**                 | 42-45                       |
| Reina 150 km             | **42,8 km/h**                 | 33-38                       |
| Puerto final 15 km al 8% | **24,2 km/h — VAM 1.940 m/h** | 18-21 km/h, VAM 1.500-1.800 |
| CRI 40 km (ganador)      | **54,4 km/h**                 | 48-52                       |

Una VAM de 1.940 m/h está por encima de cualquier ascensión registrada en la historia del ciclismo.
El origen está en `targetSpeed`: con `p75Exponent` 0,34 el nivel del corredor casi no influye
(P75 de 60 frente a 85 son 8 km/h en llano) mientras `rhythmScale` 0,35 hace que el compromiso pese
mucho más que quién pedalea.

**d) En montaña ganan los peores escaladores.** `reina-150`, 200 semillas: los cazaetapas (MON
72-75) ganan el **76%**; los líderes (MON 84-87), el **24%**. Puesto mediano 4.º frente a 7.º. El
pelotón clava el boquete en `gcControlLeash` = 265 s durante ~100 km —la crónica emite literalmente
`265 → 265 → 265`, un termostato— y solo "corre" el puerto desde 30 km a meta, tarde para recuperar.

**e) La montaña se desintegra.** Mediana de **33 grupos en meta sobre 40 corredores, 30 de ellos de
un solo corredor**. No hay reagrupamiento ni grupeto en subida.

**f) El pavés no existe como terreno.** 55 km con 25 de pavé 4★, PAV del campo entre 45 y 83:
**brecha 1.º-último de 0 s, un único grupo en meta**, y el PAV mediano del ganador es **67** — el
centro exacto del rango, es decir, azar. Es una etapa llana con más coste energético que, por (a),
tampoco tiene consecuencias.

**g) En llano nadie pierde tiempo.** Mediana de **0 corredores de 40** que no llegan con el tiempo
del ganador. Los rellenos comparten SPR, así que los puestos 4.º a 40.º los decide **solo el ruido**
—un mismo corredor va del puesto 4 al 39 según el día— y como los puntos reparten a 14 posiciones,
**la clasificación por puntos entre gregarios es azar puro**.

**i) La fatiga acumulada no llega al depósito. Es la otra mitad de (a).**

Cada corredor **sí** llega a la etapa con su estado propio, pero solo en parte
(`packages/db/src/stageRun.ts:178-204`):

| Entrada del motor | ¿Depende del estado del corredor?                                               |
| ----------------- | ------------------------------------------------------------------------------- |
| `eff0`            | **Sí** — `eff0(attr, ctl, tsb, health, morale)`: forma, frescura, salud y moral |
| `matches`         | **Sí** — `matchCount(eff, tsb)` resta un cerillo con TSB muy negativo           |
| `energy` (E₀)     | **NO** — `energy: 100` **cableado para todos** (`stageRun.ts:202`)              |

Y el efecto de la forma sobre `eff0` es estrecho: `mForm ∈ [0.92, 1.05]`, es decir **±6,5%**.

**Por qué esto cierra el círculo con (a).** La erosión se mide como `depletion = 1 − E/E₀`. Si todos
salen con E₀ = 100 y el gasto mediano es 46-55, la depleción nunca alcanza el umbral de 0,57 y la
erosión es 0,000 siempre. Con un corredor fatigado saliendo, por ejemplo, con E₀ = 75, ese mismo
gasto de 50 daría 0,67 y **sí** erosionaría.

Es decir: **el depósito constante es una causa directa de que nadie se canse**. Un corredor en la
etapa 18 de una gran vuelta sale hoy con el mismo tanque que uno recién descansado. La fatiga
acumulada tiene que entrar en `E₀`, no solo en un multiplicador del ±6,5%.

**h) `pnpm sim` está en rojo, y ya lo estaba.** Los umbrales de `sim/cli.ts` (fuga en llano 2-8%,
en montaña 25-45%) son más estrictos que los del test de CI (2-12% y 25-55%). El motor da **8,3%** y
**59,7%**: CI pasa y `pnpm sim` falla. Hay que alinearlos.

> **Lo que esto cambia respecto al diagnóstico inicial.** El modelo de final (§4) y la ausencia de
> ataques (§5) son problemas reales, pero **no son la raíz**. La raíz son (a) y (b): sin desgaste y
> con un controlador que solo funciona mientras hay fuga, ningún modelo de final por sofisticado que
> sea puede dar resultados creíbles. Se corrigen primero.

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

### 12-bis. Cambio 0 — Calibrar el desgaste y liberar el controlador (va ANTES que todo)

Los dos hallazgos de §3-bis (a) y (b) son la raíz y se corrigen primero, porque **todo lo demás se
calibra encima de ellos**:

1. **Que la erosión llegue a activarse.** Hoy el gasto mediano (46-55 de 100) nunca alcanza el
   umbral (0,57). Hay que ajustar la relación entre el tanque inicial, el coste por km y el umbral
   para que una etapa dura erosione de verdad y una suave no. Es un trabajo de calibración con
   Montecarlo, no de arquitectura. Con él se activan también la pájara y el coste de los cerillos.
   1-bis. **Que la fatiga acumulada entre en el depósito** (§3-bis-i). Sustituir el `energy: 100`
   cableado de `stageRun.ts:202` por un E₀ que dependa del estado real del corredor (TSB/CTL, salud,
   y el desgaste de las etapas anteriores en una carrera por etapas). Es la mitad que falta del punto
   1: sin esto, subir el umbral de erosión castigaría por igual al fresco y al reventado. Es además
   **la pieza que hace que una gran vuelta se sienta como una gran vuelta**, con el pelotón cada vez
   más justo según avanzan los días.
2. **Sacar el controlador del pelotón de `if (breakaway && !caught)`.** El pelotón debe regular su
   ritmo _siempre_: haya fuga, la hayan cazado o no se haya formado nunca. Es un cambio pequeño de
   estructura con un efecto enorme (hoy son 39 minutos de diferencia en una etapa llana).
3. **Revisar `p75Exponent` y `rhythmScale`** para que el nivel del corredor pese más que el
   compromiso del grupo, y que las velocidades y la VAM caigan a rango real.
4. **Reagrupamiento en subida** (grupeto), que hoy no existe y produce 30 grupos de un corredor.
5. **Alinear los umbrales de `pnpm sim` con los del test de CI**, hoy divergentes.

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
- **Abandonos y fuera de control** (decidido, ver §V.5): abandono **automático** cuando el corredor
  no puede más (tanque agotado, lesión seria, corte de tiempo) y abandono **voluntario entre etapas**
  para el jugador humano que prefiere retirarse y preparar otra carrera. Hoy el tipo `StageResult`
  contempla `'abandon' | 'dnf'` y nunca se emiten.

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

| #   | Trabajo                                                        | Por qué en este puesto                                                                                                                                                |
| --- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Desgaste + controlador del pelotón + velocidades** (§12-bis) | Es la raíz medida. Sin desgaste y con el controlador atado a la fuga, nada de lo demás puede dar resultados creíbles. No depende de los perfiles: se puede empezar YA |
| 1   | Modelo de final (§12)                                          | Máximo impacto por esfuerzo una vez hay desgaste: arregla "gana quien no debe"                                                                                        |
| 2   | Selección en pavés/descenso (§14) y fatiga (§15)               | Hoy el pavés no existe como terreno (brecha de 0 s) y nadie abandona                                                                                                  |
| 3   | **Perfiles reales** (extracción y validación)                  | Entrada del motor. Necesarios **antes de la recalibración final**, no antes de las correcciones estructurales                                                         |
| 4   | Capa táctica (§13)                                             | El desarrollo grande. Es lo que hace que las carreras se distingan entre sí                                                                                           |
| 5   | Telemetría (§16)                                               | Habilita el journal y las vistas nuevas                                                                                                                               |
| 6   | Recalibración completa con Montecarlo                          | Solo al final, con entradas buenas y mecánicas completas                                                                                                              |

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

## Parte V — Decisiones tomadas

Resueltas con el dueño. Sustituyen a las cuestiones abiertas de la v1.

### V.1 Capa táctica: por equipo, con las individualidades por encima

Modelo de **intenciones por equipo** (cada equipo con objetivos y presupuesto de esfuerzo), pero con
dos reglas que mandan sobre él:

1. **Las órdenes individuales priman sobre el plan del equipo.** Si un corredor humano desobedece —
   se va por su cuenta cuando su equipo le pidió arropar—, **su decisión gana**. El plan de equipo
   es el comportamiento por defecto, no una jaula. Esto es diseño de producto, no solo de motor:
   desobedecer debe ser posible, tener sentido a veces, y tener consecuencias (moral, confianza del
   equipo, y el resultado deportivo).
2. **Un corredor sin equipo corre de forma individual**: no participa de ningún plan colectivo y
   decide solo con sus propias órdenes y su situación.

### V.2 Azar: moderado, sin romper el determinismo

Objetivo: que el resultado **no sea deducible de los atributos**. Un corredor con mal día, mal
posicionado o mal aconsejado debe poder perder.

> **Distinción crítica que hay que conservar.** _Determinismo_ (misma semilla → mismo resultado) es
> innegociable: sostiene los replays fieles y la idempotencia del tick, que puede reintentar un día
> sin duplicar ni alterar resultados. Lo que se reduce es la _predictibilidad_, que es otra cosa.
> La variedad entra por la semilla `(worldSeed, raceId, stageDay, engineVersion)` y por la capa
> táctica, nunca por el reloj. Meter la hora real en la semilla haría que dos ejecuciones difirieran
> — y perderíamos los replays. **No se hace.**

### V.3 Perfiles: generador aceptable de inicio, refinar después

Se acepta un generador _consciente de la identidad_ para lo que no se pueda extraer de
procyclingstats (sobre todo los 532 campeonatos nacionales: un nacional belga es llano y de
adoquines; uno colombiano, de montaña). Es un punto de partida, no el destino: se afina con el
tiempo. Los 147 perfiles ya existentes **también se validan** contra PCS, porque no hay certeza de
que estén bien.

### V.4 CRE: se implementa, pero no urge

Ninguna carrera del calendario actual la usa. (La CRE del Tour real era, de hecho, una CRI con
salida por equipos.) Las constantes `teamTt*` **se conservan** marcadas como pendientes, no se
retiran.

### V.5 Abandonos: automáticos y voluntarios

Dos vías, ambas deseadas:

1. **Automático**: si un corredor no puede más —tanque agotado, lesión seria, fuera de control—
   abandona. Hoy no ocurre nunca (`'abandon' | 'dnf'` existen en el tipo y no se emiten jamás).
2. **Voluntario, entre etapas**: un jugador humano puede **retirarse de una carrera por etapas**
   entre una etapa y la siguiente. Es una decisión de gestión legítima y con buen sabor de juego:
   voy mal, arriesgo lesión, no voy a ganar nada — mejor retirarme y preparar otra carrera en
   condiciones. Necesita su punto en la interfaz (`My Rider → My races`, y probablemente también en
   el dashboard cuando estoy en carrera).

---

## Parte VI — Especificación de las tres perillas

Cerradas. Los valores son **puntos de partida para calibrar con Montecarlo**, no dogma: lo que no se
negocia es la forma de las fórmulas y los objetivos de salida.

### VI.1 El depósito inicial E₀

Sustituye al `energy: 100` cableado de `stageRun.ts:202`.

```
E₀ = 100 · clamp( mTankFitness(CTL) · mTankFreshness(TSB) · mHealth(salud), 0.70, 1.08 )

mTankFitness(ctl)  = clamp(0.90 + 0.20·(ctl/100), 0.90, 1.10)
mTankFreshness(tsb)= clamp(1.00 + 0.0045·tsb,     0.80, 1.05)
```

Referencias: TSB 0 → 1.00 · TSB −25 → 0.89 · TSB −45 → 0.80 (suelo). Un corredor fresco y en forma
sale con ~105; uno hundido en la tercera semana, con ~72.

> **La clave del diseño: el arrastre entre etapas sale gratis.** No hace falta un mecanismo nuevo de
> "fatiga acumulada de la carrera". `applyDailyLoad` ya sube el ATL con el TSS real de cada etapa, así
> que el TSB baja solo día tras día en una gran vuelta y, con E₀ dependiendo del TSB, **el depósito
> mengua solo**. Se reutiliza la fisiología que ya existe en vez de inventar estado paralelo.

**Objetivos de calibración** (esto es lo que hay que verificar con Montecarlo, y manda sobre los
números de arriba):

| Situación                                        | Erosión esperada al final           |
| ------------------------------------------------ | ----------------------------------- |
| Llana tranquila, corredor fresco                 | 0 (no debe erosionar)               |
| Etapa reina, último puerto, corredor fresco      | 0,20 – 0,50                         |
| **Clásica larga de un día (250+ km), en fresco** | **0,45 – 0,80**                     |
| Etapa reina, tercera semana, TSB muy bajo        | 0,60 – 0,85                         |
| **La clásica MÁS dura del calendario, fresco**   | **≤ 0,92 — jamás 1,000**            |
| Gregario que ha relevado todo el día             | claramente > que el que fue a rueda |

**La clásica larga** (añadida al cargar los recorridos reales de las ocho clásicas WT). Un monumento
de 250-280 km debe erosionar **más que una etapa reina de vuelta con el corredor fresco** —son 100 km
más de carrera— y **menos que la tercera semana de una gran vuelta**, donde la fatiga acumulada ya
viene de casa y el depósito sale mermado de la salida. Se mide sobre el recorrido REAL (Ronde van
Vlaanderen, 278 km) con el campo homogéneo, no sobre un perfil de laboratorio.

> **La última fila no es un rango, es un techo, y es el que importa.** Con la erosión topada en 1,000
> el pelotón entero está al máximo de degradación: el modelo **deja de discriminar** y el resultado
> vuelve a ser azar, justo lo contrario de lo que persigue el desgaste. Al cargar los recorridos
> reales saturaron tres clásicas (Lombardía, Flandes y Roubaix) y **ningún invariante se enteró**,
> porque la batería solo corría perfiles sintéticos. Ahora lo vigila `sim/invariants.test.ts` sobre
> TODAS las carreras de un día del WorldTour.
>
> **Aviso medido, y es una tensión estructural, no una perilla suelta.** Los objetivos de la reina se
> fijaron contra escenarios SINTÉTICOS y LISOS: `llana-180` es g = 0 durante 180 km y `reina-150` son
> 135 km a g = 0 más un puerto de 15 km al 8 % (1.200 m de desnivel). Una etapa reina REAL tiene
> 3.500-4.500 m, e Il Lombardia 4.100 m en 241 km: por la contabilidad del propio motor, el monumento
> hace **el doble de trabajo** que la reina canónica. Con un depósito fijo y una erosión lineal por
> encima del umbral, exigir a la vez «reina 0,20-0,50» y «monumento ≤ 0,75» no tiene solución (ver la
> aritmética en docs/balance.md). Por eso la banda de la clásica larga es 0,45-0,80 y no 0,45-0,75, y
> por eso queda pendiente **re-anclar §VI.1 sobre una etapa reina realista** en vez de la caricatura.

Es una calibración **conjunta** con el umbral `0.35 + 0.40·RES/100` y con el coste por km: puede
hacer falta bajar el umbral además de bajar E₀. La señal de éxito es que RES pase a importar.

### VI.2 Desobedecer las órdenes del equipo

**Decisión del dueño:** en un **equipo bot, no cuesta nada**. En un **equipo humano, lo que decida su
mánager** (herramienta futura: no convocar, sancionar, rescindir).

> **Consecuencia que hay que vigilar.** Como hoy todos los equipos son bots, desobedecer sale gratis
> siempre, y la estrategia óptima pasa a ser "ir siempre de líder" pase lo que pase. Eso vaciaría de
> sentido los roles.
>
> **Mitigación propuesta, coherente con la decisión: que el coste sea intrínseco, no administrativo.**
> El que se va por su cuenta pierde de forma natural lo que da el equipo — la protección de gregarios
> (`domestiqueProtect*`), el tren de lanzadores en meta (`leadOutBoost*`) y el reparto de relevos —,
> así que **gasta más y remata peor**. No es un castigo del sistema: es que ir solo cuesta más. Así
> desobedecer sigue siendo posible y a veces acertado (soy más fuerte que mi líder, o me han dado un
> rol absurdo), pero no es gratis por defecto.

### VI.3 Umbral del abandono automático

**Objetivo de diseño, medible:** una gran vuelta de 21 etapas debe empezar con ~176 y terminar con
**entre 140 y 155** (abandona el **12-20%**), que es el rango real. Traducido: **≈1% del pelotón por
etapa**, no más.

Tres causas, con su peso objetivo:

| Causa                    | Peso  | Regla                                                                                                                   |
| ------------------------ | ----- | ----------------------------------------------------------------------------------------------------------------------- |
| **Fuera de control**     | ~45 % | Llegar fuera de un % del tiempo del ganador, según dureza de la etapa: **8%** en llana, hasta **18%** en la etapa reina |
| **Lesión**               | ~40 % | Caída de severidad `major` con baja por encima de un umbral → no toma la salida al día siguiente                        |
| **Colapso / enfermedad** | ~15 % | Tanque a cero lejos de meta de forma sostenida, o enfermar durante la carrera                                           |

**Dos salvaguardas contra la hemorragia**, que es el riesgo real:

1. **Tope por etapa**: como mucho un **4% del pelotón restante** abandona en una sola etapa. Si el
   corte de tiempo señala a más, se aplica la regla real del ciclismo: cuando un grupo numeroso llega
   fuera de control, se les readmite con penalización en vez de eliminarlos en bloque.
2. **El corte de tiempo se mide contra el grupo, no contra el corredor suelto**: hoy la montaña
   produce 30 grupos de un corredor (§3-bis-e). Hasta que el reagrupamiento del Cambio 0 esté
   arreglado, aplicar el corte tal cual eliminaría a media carrera. **El abandono automático se
   implementa DESPUÉS del reagrupamiento, no antes.**

Y el corredor humano tiene siempre la salida voluntaria de §V.5, que es la que convierte esto en
decisión de juego y no en castigo.

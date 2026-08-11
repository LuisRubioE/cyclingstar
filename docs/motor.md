# El motor de etapa: cómo funciona hoy y qué hay que cambiarle

Estado: **documento vivo.** Las Partes I y II son el diagnóstico (medido) y siguen valiendo como
retrato de lo que había. En la Parte III cada cambio lleva su estado: **§12-bis hecho** (v3),
**§16 primera entrega** (v6), **§12 hecho** (v7), **§13 hecho** (v9), **§18 hecho** (v10),
**§16 segunda entrega** (v11), **§14 hecho** (v12), **§16 tercera entrega** (v13),
**§15 hecho** (v14), **§V.1 hecho** (v15), **§9-bis hecho** (v16, el modelo de persecución: la
última deuda de fondo), **§16 cuarta entrega** (v18, la contrarreloj) y **§16 quinta entrega**
(v21, la criba lejos de meta y el ruido del boquete). Lo demás sigue siendo propuesta.

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

- **Ley de velocidad** — `v_obj = vRef(g,terreno) · carga(P75) · ritmo(c)`. Una sola ley sirve al
  pelotón, a la fuga, al descolgado y a la contrarreloj: cambian las entradas, no la física.
  > **Corregida en la v19**, y era el defecto de fondo que la v14, la v17 y la v18 midieron sin
  > nombrar. La carga era `(P75/75)^0.34` (0,39 desde el Cambio 0) y ahora es
  > `(0.55 + 0.45·P75/75) ^ e(terreno)`, con `e` = 0,39 en llano y 1,0 en cuesta. Dos hechos de
  > física: la escala 0-100 de un atributo **no es una escala de vatios** (el 0 no es «parado», es
  > «no existe»), y **el aire y la gravedad no se pagan igual** —en llano la velocidad va como la
  > raíz cúbica de la potencia y subiendo va como la potencia—. Ver docs/balance.md, «v19».
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

> **AL DÍA (v14 y v16): 7 grupos con 2 de un corredor.** La v14 lo arregló con el grupeto
> (`grupetoJoinGapSeconds`) y era la precondición para poder aplicar el corte de tiempo. La v16
> tocaba de lleno esta cuenta —los descolgados dejan de volver gratis— y **el número no ha
> empeorado**: siguen siendo 7 y 2 sobre 150 corridas, ahora además porque el grupo grande tiene un
> motivo físico para rodar junto (se releva y el suelto no).

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

> **RESUELTO en v7** (ver §12, «Cambio 1 — Modelo de final»). Lo que sigue es el diagnóstico
> original, que se conserva porque explica de dónde viene el modelo actual.

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

> **RESUELTO en v9** (ver §13). Lo que sigue es el diagnóstico original.

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

> **RESUELTO en v9** (ver §13): la fuga del día EMERGE del primer intento al que el pelotón da
> cuerda, cualquiera puede entrar en ella (con el filtro del SPEC 6.10: ni un sprinter puro ni quien
> sale con el depósito por debajo del 40%), se rehace si la cazan y `Group.tension` ya se lee.

- Solo pueden fugarse quienes traen rol `cazaetapas` o mentalidad combativa. Un escalador o un
  sprinter **jamás** entran en una fuga.
- Se puntúa por `TAC + LLA`: siempre se fugan los mismos perfiles.
- Se forma **una vez**. Si la cazan, no hay nada después: no se rehace, nadie contraataca.
- `Group.tension` —la sociología de la fuga: quién colabora, quién se guarda— **se calcula, se
  promedia al fusionar grupos y no se lee nunca**.

### 7. La selección solo existe en las subidas

> **RESUELTO en v12** (ver §14). Lo que sigue es el diagnóstico original, que se conserva porque es
> el contrato contra el que se midió.

`shatter` arranca con `if (block.tipo !== 'subida') return []`. Consecuencias:

- **En el pavés no se descuelga nadie.** PAV afecta a la velocidad del grupo, pero no provoca
  selección: en una clásica de adoquines la única forma de perder tiempo es caerse. Es un
  agujero grande para las clásicas.
- En descenso tampoco hay selección (DES apenas influye en el resultado).
- Los abanicos están fuera del MVP a propósito, así que eso no cuenta como defecto.

### 8. Mecánicas documentadas que nunca se ejecutan

> **Estado en la v15: la lista está VACÍA.** La pájara se activó en la v8 y se narra desde la v14;
> los abandonos y el fuera de control entraron en la v14; el marcaje lo resuelve `marcaje.ts` desde
> la v9; el **rebufo del que va solo (`shelterAlone`) y el de quien rota en cabeza del pelotón
> (`shelterWorking`) entran en la v15** —los dos estados que faltaban de la tabla de rebufo de
> SPEC 6.5—, y con ellos el umbral de lesión de §VI.3 (`abandonInjuryDays`), que era inalcanzable
> por construcción. Solo quedan sin usar las constantes de la **CRE**, y eso es una decisión tomada
> (§V.4): ninguna carrera del calendario la corre, y se conservan marcadas como pendientes.
>
> **Con una excepción nueva que hay que anotar, no esconder:** al re-anclar el depósito (§VI.1) el
> **COLAPSO** dejó de ocurrir en una gran vuelta (0 casos en 6 vueltas, frente al 23 % de los
> abandonos de la v14). No es una perilla mal puesta —se midieron cinco variantes y ninguna cambia
> un abandono—: con un depósito del tamaño correcto **nadie está vaciado a más de 30 km de meta**,
> que es lo que la regla exige. Es la misma deuda del modelo de persecución que tiene al «fuera de
> control» en el 1 % en vez del 45 %, y está en docs/balance.md, «v15».
>
> El diagnóstico original se conserva porque es el contrato contra el que se midió cada una.

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
- ~~**Los puntos de banner y cima usan `eff0`, no `effNow`** (`:573`, `:609`): ignoran la erosión,
  así que un escalador reventado sigue coronando primero.~~ **Corregido en v7** (§12).
- ~~**Parches sobre la falta de un modelo de persecución**: el tiempo de un grupo descolgado se
  _pega_ al del pelotón en llano (`:440`) y los descolgados cierran a un ritmo fijo en s/km
  (`:449`). El propio comentario admite que se añadió para tapar "fugas fantasma". Funciona, pero
  es sintomático.~~ **RESUELTO en v16** (ver §9-bis).
- **El controlador del pelotón no sabe de equipos**: no hay "el equipo del líder defiende", ni
  intereses distintos por equipo. Solo "hay sprinters" o "no los hay".

### 9-bis. El modelo de persecución (HECHO, v16)

> **La última deuda de fondo del documento, y la única que estaba anotada tres veces con
> mediciones.** La v8 la vio en «el pelotón entero al mismo segundo», la v12 la nombró al calibrar el
> pavé y la v14 la midió entera: **el peor retraso de una gran vuelta era del 6,7 % contra un corte
> del 8-18 %, así que el corte no eliminaba a nadie.** Medido y cerrado en docs/balance.md, «v16».

**El defecto.** El tiempo del descolgado dejaba de ser física en dos líneas de `simulate.ts`: un
RECORTE FIJO de 8 s por kilómetro (`chaseBackSecondsPerKm`) que le devolvía el boquete pasara lo que
pasara —fuera uno o cuarenta, en el llano o en una rampa al 9 %, entero o vacío— y un TOPE que le
clavaba el reloj del pelotón si resultaba ir más rápido. Las dos pisaban lo que `advanceGroup`
acababa de calcular. De ahí colgaban los tres síntomas que se veían en pantalla: el corte de tiempo
no eliminaba a nadie, la causa «fuera de control» aportaba el 0-4 % en vez del 45 % de §VI.3, y 6 de
7 etapas de producción terminaban con el pelotón ENTERO al mismo segundo mientras la crónica contaba
que el grupo de cabeza había pasado de 116 a 80.

**Lo que hay ahora** es `droppedCommit(bloque, tamaño, frescura, boquete)` en `physics.ts`:

1. **Relevarse reparte el viento.** En un grupo de `n` que rota, a cada uno le toca ir en cabeza 1/n
   del tiempo; el que va solo da la cara siempre. Es lo que `shelterAlone` (v15) ya cobraba en
   energía y que no llegaba nunca a la velocidad.
2. **…y eso vale lo que valga el rebufo en ese terreno** (`draftMax`: 42 % en el llano, 9,6 % en una
   rampa al 8 %). De aquí sale solo el hecho de carretera que ningún parche sabía imitar: **el
   grupeto sube tan lento como el que sube solo y en el valle vuelve a rodar como un pelotón.**
3. **Con lo que quede en las piernas**, y solo sobre el que administra: la frescura del que pelea ya
   la cobra la erosión sobre el P75.
4. **Y primero se PERSIGUE y luego uno se resigna.** El que acaba de soltarse va a su umbral —el 0,82
   de siempre— y afloja conforme el grupo de cabeza se le pierde de vista. Este término es el que
   separa una selección de una debacle: sin él, el décimo de la reina canónica entraba a 7,6 minutos.

El tope fantasma se sustituye por la resolución honesta: un grupo que ALCANZA al pelotón fuera de la
subida se reengancha a él, que es lo que se hace en carretera.

**Y dos cosas que el recorte tapaba**, sin las cuales el cambio produce carreras peores: un puerto de
TEMPO seleccionaba igual que el puerto decisivo (`climbTempoSelection`; medido, el pelotón pasaba de
173 a 6 corredores en una cota a 100 km de meta y volvía entero), y los descolgados eran invisibles
para las caídas (`crashCheck` no los recorría: las lesiones de una gran vuelta caían de 65 a 28 sin
que ninguna ley de las caídas hubiera cambiado).

**El criterio de éxito, y lo vigila CI:** el último grupo de una etapa reina de gran vuelta entra
entre el **8 % y el 14 %** del tiempo del ganador (`grandTour.queenLastGroupPct`). Medido:
**2,00 % → 9,34 %**. Con él, «fuera de control» pasa del 0 % al 19 % de los abandonos y ninguna
etapa reina termina ya con el pelotón entero al mismo segundo.

> **CORREGIDO EN LA v17: el pelotón no se resigna.** La v16 se pasó de frenada en un caso que no
> había mirado, y se vio en PRODUCCIÓN: Race Colombia e5 (232 km) terminó con **126 de 130
> corredores a más de 74 minutos** —el 22 % del tiempo del ganador— y el journal enseñaba el boquete
> creciendo **+105 s por kilómetro, perfectamente lineal, en 47 km de terreno RODADOR**.
>
> La causa está en la última línea de `droppedCommit`: resignarse dependía SOLO del boquete
> (`shedResignGapSeconds`, 300 s). Para un rezagado solo eso es correcto, y es exactamente lo que la
> v16 quería. Aplicado a 126 corredores persiguiendo a 4, no lo es: el tamaño entraba únicamente por
> `1 − 1/n`, que **satura** —0,90 con diez y 0,992 con ciento veintiséis—, así que **un pelotón
> entero se rendía igual que un hombre solo**. Lo que distingue al grupeto que se resigna del
> pelotón que persigue no es el boquete en segundos: es **quién es mayoría en la carretera**.
>
> Vuelve por eso `chaseBackBusFactor` —la salvaguarda de la v12, retirada por error en la v16— a la
> decisión de resignarse, con el factor leído en los dos sentidos: eres un grupeto cuando te
> triplican y eres un pelotón cuando triplicas, con una rampa continua entre medias. Y **se cobra a
> precio de rebufo**: ser mayoría paga en el llano, donde un autobús se releva y caza, y no paga en
> la rampa, donde no hay rueda a la que ir. Por eso el grupeto de la etapa reina —que se resigna EN
> EL PUERTO— sigue igual que en la v16 y el banco de la gran vuelta no se mueve.
>
> Van con ella las otras dos mitades del mismo defecto: la guarda del «me dejo ir» predecía con
> `giveUpCommit` —un modelo que la v16 había borrado— y ahora predice con el grupeto real en el que
> el corredor va a caer; y no había TOPE de cuántos podían sentarse a la vez, así que en el km 212 se
> sentaron 73 de golpe realimentándose entre ellos (`giveUpGroupMaxFraction`).
>
> **Y la lección, que es de banco y no de motor:** `grandTour.queenLastGroupPct` estaba en verde
> mientras esto pasaba porque **mide siempre la misma forma de etapa reina** —las siete de
> `race-france`, todas finales en alto de 170-185 km—, y ninguna se parece a una reina de 232 km con
> el último puerto a 62 km de meta. `sim/realQueens.ts` mide ahora la cola sobre ocho reinas REALES
> elegidas por forma, con Race Colombia e5 dentro por nombre. Medido en docs/balance.md, «v17».

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

### 12. Cambio 1 — Modelo de final (HECHO, v7)

> **Implementado en `engine_version` 7.** Vive en `packages/engine/src/stage/finish.ts` (derivación
> y puntuación) y en `finishStage()` de `simulate.ts` (aplicación). Los números de antes y después
> están en docs/balance.md, «v7 — El modelo de final». Lo que sigue describe lo que se hizo, no lo
> que se proponía.

`finishUphill ? MON/COL : SPR` ha desaparecido. En su lugar, cada GRUPO que llega a meta resuelve su
propio **tipo de final** y se ordena por una **puntuación compuesta**.

**1. El tipo se deriva del recorrido y del tamaño del grupo.** `deriveFinishTerrain()` mide, una vez
por etapa: la pendiente media de los **últimos 5 km** (no 2), la **última cota** de los últimos 15 km
—longitud, pendiente media, dureza `km·g²` y a cuántos km de meta corona—, la fracción de descenso de
los últimos 3 km y la de pavé de los últimos 30. `finishType()` cruza eso con cuántos llegan:

| Tipo              | Cuándo                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `solitario`       | El grupo es de uno                                                                                                                                     |
| `alto`            | Cota de ≥ 3 km que muere en meta, o los últimos 3 km al ≥ 5% (definición del SPEC 6.12, cuya constante llevaba desde el principio definida y sin usar) |
| `puncheur`        | Cota de dureza ≥ 15 que corona a ≤ 5 km, o una llegada que arrastra al ≥ 2,5% de media                                                                 |
| `descenso`        | La mitad o más de los últimos 3 km baja                                                                                                                |
| `pave`            | ≥ 10% de adoquín en los últimos 30 km                                                                                                                  |
| `sprint_masivo`   | Nada de lo anterior y llegan ≥ 15                                                                                                                      |
| `sprint_reducido` | Nada de lo anterior y llegan menos                                                                                                                     |

**La fragilidad del binario se corrige con dos números concretos**: una racha ascendente no cuenta
como cota si mide menos de 400 m (`finishClimbMinKm`) y un bloque no "sube" por debajo del 3%
(`finishClimbMinGradient`), así que la rampa de 200 m del diagnóstico ya no convierte una llana en
llegada de escaladores —hay test— y el relieve menudo de los recorridos reconstruidos tampoco.

**2. La puntuación es una mezcla con pesos por tipo** (`STAGE.finishWeights`, suman 1 en cada fila,
así la escala sigue siendo la de los atributos): el sprint masivo es SPR con LLA y TAC de
colocación; el reducido carga la mano en TAC; el de puncheur mezcla COL + SPR + TAC; el de alto es
MON/COL con RES; el de pavé es **PAV + LLA**, que es la primera vez que el PAV interviene en un
resultado; el de descenso, DES + TAC.

**3. El trabajo del día se cobra en el remate.** `workUnits` se calculaba y no se usaba para nada.
Ahora el remate se corrige comparando el trabajo de cada corredor con la **media de su grupo de
meta** (no con un absoluto: así no depende de lo larga que sea la etapa), con peso 0,6 y tope ±15%.

**4. Los banners se disputan con la erosión del momento.** `disputeBanner()` y `disputeClimb()`
puntuaban con `eff0`, el corredor del km 0, así que un escalador reventado seguía coronando primero.
Ahora usan `riderEff()`, como el resto del motor.

Lo que este cambio **no** hace, y sigue pendiente: no crea ataques ni movimientos (§13), así que en
una etapa llana el pelotón sigue llegando junto y el tipo de final es casi siempre `sprint_masivo`;
y no toca el generador de perfiles, así que una carrera sin terreno selectivo sigue sin poder
decidirse por otra cosa que las bonificaciones.

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

### 13. Cambio 2 — Capa táctica: que existan los ataques (HECHO, v9)

> **Implementado en `engine_version` 9.** Las decisiones viven en
> `packages/engine/src/stage/tactics.ts` y la carretera en `simulate.ts`: un ataque logrado **es un
> grupo nuevo** creado con la maquinaria de `group.ts` que ya existía, así que no hay física nueva.
> Los números de antes y después están en docs/balance.md, «v9 — La capa táctica», y el banco que
> los produce se lanza con `pnpm sim:tactics`. El estado regla a regla está en §13.4.
>
> Lo que sigue es el diagnóstico y la especificación originales, que se conservan porque son el
> contrato contra el que se midió.

**Este es el cambio que hace que dos carreras no se parezcan**, y era el corazón que faltaba. Antes
de la v9 solo había dos formas de sacar tiempo: estar en la fuga inicial (que se formaba una vez,
antes del km 0) o ser descolgado en una subida. **Nadie atacaba nunca.** Por eso la crónica solo
sabía decir «el equipo X aprieta el ritmo»: era literalmente lo único que el motor sabía hacer.

#### 13.1 Especificación de dominio (dictada por el dueño, agosto 2026)

Nueve reglas de cómo se corre de verdad. Son el contrato de esta capa:

1. **Alguien intenta fugarse**, con una probabilidad que **sube si el grupo va junto** y **sube
   cuanto más cerca está la meta**.
2. Cuando uno ataca, **algunos van atentos y saltan detrás**: pueden ser **0 o 40**. Y si son 40, es
   muy poco probable que colaboren lo suficiente para que la fuga prospere.
3. **Muchos de los que intentan seguir el ataque no lo consiguen.**
4. **Muchos intentos fracasan**, sin más.
5. **Lo normal es que haya muchos intentos** antes de que cuaje la fuga del día.
6. **Dentro de una fuga se sigue atacando**, sobre todo si es numerosa, y sobre todo lo hacen **los
   que peor rematarían al sprint** de ese grupo — y muy especialmente en los últimos km, cuando ya
   está claro que la fuga se juega la etapa.
7. **Se puede atacar para enganchar al grupo de delante** desde el pelotón o desde un grupo
   rezagado. **Y a veces no se llega**: quedarse en tierra de nadie es un resultado legítimo.
8. **Es normal que un corredor agotado se descuelgue en los últimos km**, en montaña y también en
   llano. Salvo motivación especial, **se deja ir**, con el único cuidado del fuera de control.
9. **Un final en alto no es el equipo del favorito tirando hasta reventar a todos.** Los fuertes
   **atacan**: por la etapa y por la general, **en el momento oportuno**, y **vigilándose entre
   ellos**.

#### 13.2 Una sola mecánica, no nueve

Los puntos 1 al 7 son **la misma pieza** parametrizada por contexto — el **intento de movimiento**:

```
alguien lo intenta   (λ sube si el grupo va junto y si la meta está cerca)
      ↓
0..N le siguen       (quién salta depende de atención, rol, energía y cerillos)
      ↓
algunos no llegan    (los que saltaron pero no sostienen el esfuerzo se quedan en tierra de nadie)
      ↓
¿colaboran?          (cuantos más son, menos; los que peor rematan colaboran más)
      ↓
prospera o fracasa
```

Con esa única pieza salen los siete:

| Regla                         | Es el intento con…                                               |
| ----------------------------- | ---------------------------------------------------------------- |
| 5 — la fuga del día           | el primero que prospera tras varios fracasos                     |
| 6 — ataques dentro de la fuga | grupo pequeño, candidatos = los peores al sprint de ese grupo    |
| 7 — el puente                 | un grupo objetivo por delante y posibilidad de quedarse a medias |

Reutiliza además todo lo que ya existe: el marco de hazard `p = 1 − e^{−λ·dx}`, la maquinaria de
grupos con su reloj (un ataque logrado **es** un grupo nuevo), y el marcaje de `stage/marcaje.ts`
para la regla 9. Y activa de golpe las constantes muertas: `lambdaCounterAttack`, `lambdaBridge`,
`bridgeGapMin/MaxSeconds`, `lambdaLateAttack`, `lateAttackKm`, `breakawayTension*`.

Las reglas 8 y 9 son piezas aparte:

- **8 — administrar el esfuerzo.** Hoy solo te descuelgas si no aguantas el P75; nunca porque
  decidas ahorrar. Necesita que el corredor pueda **rendirse a propósito** cuando ya no se juega
  nada, mirando el corte de tiempo.

  > **AL DÍA (v17): rendirse es individual, pero un grupo no se disuelve.** La regla se implementó
  > en la v9 con una guarda por corredor —«solo me dejo ir si lo que voy a ceder cabe en el corte»—
  > y eso basta mientras se sientan dos o tres. En Race Colombia e5 se sentaron **73 de golpe en el
  > km 212**: cada uno pasaba su guarda por separado y la cosa se realimentaba, porque cada uno que
  > se iba dejaba al pelotón más pequeño y al siguiente le salía más barato. Contra una
  > realimentación no vale una guarda individual, así que ahora hay un tope por grupo
  > (`giveUpGroupMaxFraction`, un tercio de la cohorte): pasado él, **los que quedan SON el grupo**.
  > Y la guarda misma predice con la física de verdad —el grupeto en el que el corredor va a caer,
  > `droppedCommit`— en vez de con el `giveUpCommit` que la v16 dejó sin significado.

- **9 — el final en alto.** Que los favoritos ataquen en vez de limitarse a seguir el tren del
  equipo, eligiendo el momento y vigilando a los rivales de la general (ahí entra `marcaje.ts`, que
  ya está implementado, y `gcDeficitSeconds`, que `packages/db` rellena y el motor ignora).

#### 13.4 Qué quedó implementado (v9) y qué no

Las **nueve reglas están implementadas**. Medido con 150 semillas por escenario (antes / después):

| Regla                                | Cómo se ejecuta                                                                         | Medida                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1 — alguien lo intenta               | `moveLambda`: λ × cohesión × cercanía de meta × tensión                                 | 12 intentos/etapa en llano (antes 0)                                   |
| 2 — 0..N le siguen                   | `followProbability` (TAC, rol, mentalidad, piernas, general), diluida en un grupo gordo | de 0 a 8 saltan; si salta ≥ la mitad, no hay hueco                     |
| 3 — muchos no lo consiguen           | `sustainsJump`, con el margen del marcaje (SPEC 6.18)                                   | los que se quedan viajan en `tierra`                                   |
| 4 — muchos intentos fracasan         | `pelotonAllows` + el pelotón cerrando a `tacticControlCommit`                           | prospera el 34,6% (llano)                                              |
| 5 — la fuga tras varios intentos     | el primer movimiento que cuaja dentro de la ventana                                     | cuaja en el km 16,6 (mediana); 3-7% de etapas sin fuga                 |
| 6 — se ataca dentro de la fuga       | `kind: 'ataque_grupo'`, candidatos por lo mal que rematarían, con la TENSIÓN del grupo  | la fuga se parte cerca de meta                                         |
| 7 — el puente, y a veces no se llega | `kind: 'puente'` con caducidad (`tacticBridgeKm`) y tierra de nadie                     | `bridge_made` / `bridge_failed`                                        |
| 8 — el agotado se deja ir            | `giveUpLambda` + guardarraíl del corte de tiempo                                        | 1 por etapa en la reina de 3.ª semana; peor retraso 5,0% (corte 8-18%) |
| 9 — el final en alto se ataca        | `kind: 'ataque_final'` + `marcaje.ts` resolviendo la respuesta                          | **55,3%** de los finales en alto los decide un ataque (antes 0%)       |

Y el criterio que las resume: **guiones distintos de 150 etapas, de 4 a 25 en la llana canónica y de
8 a 57 en la reina**.

**Lo que NO entró, y por qué:**

- **Los puentes solo salen del pelotón o de un grupo ya escapado**, no de un grupo rezagado: un
  grupeto que persigue vive en la maquinaria de descolgados (`shed`), que tiene su propio modelo de
  recorte, y mezclar las dos cosas pedía unificar los dos caminos.
- ~~**`shelterAlone` (0,0) sigue sin usarse**: el corredor que rueda solo paga `shelterRelay` (0,5),
  es decir, se le regala el rebufo de un grupo que no tiene.~~ **HECHO en la v15**: un grupo de un
  corredor paga 0 de rebufo. Medido en docs/balance.md, «v15».
- **Abandonos y fuera de control** (§15, §VI.3): la regla 8 respeta el corte por construcción —solo
  administra si lo que va a ceder cabe dentro de él— pero nadie queda eliminado nunca. **HECHO en la
  v14.**
- ~~**El intento no distingue equipos**: quién ataca lo decide el rol y la mentalidad del corredor,
  no un plan colectivo (§V.1).~~ **HECHO en la v15**: la capa de ataques consulta la intención del
  equipo (`stage/teamPlan.ts`), y el equipo sin baza que jugar es el que manda gente a la fuga.

#### 13.3 Por qué esto también arregla la general

Medido tras el modelo de final (§12): en una carrera de 5 etapas llanas **los 40 corredores siguen
llegando con el mismo tiempo**, así que la general la decide quien suma bonificaciones. El modelo de
final no puede inventar diferencias donde el recorrido no las permite.

**Un ataque que aguanta sí abre hueco.** Es la única vía que arregla la general sin tocar datos ni
maquillar la aritmética. Bajar las bonificaciones haría la foto menos absurda, pero sería un parche:
lo que falta es carrera, no aritmética.

### 14. Cambio 3 — Selección fuera de la montaña (HECHO, v12)

> **Implementado en `engine_version` 12.** Vive en `shatter()` y en el bucle de `simulate.ts`, sin
> módulo nuevo: el mecanismo de la subida se ha PARAMETRIZADO, no duplicado. Los números de antes y
> después están en docs/balance.md, «v12 — Selección en pavé y descenso».

El encargo era una línea: «extender `shatter` al pavés (con PAV) y a los descensos (con DES). Sin
esto, las clásicas de adoquines no son clásicas de adoquines». Lo que se hizo, y por qué hicieron
falta cuatro piezas y no una:

**1. El mecanismo es el mismo, con otro atributo y otro peso.** `shatter()` empezaba con
`if (block.tipo !== 'subida') return dropped` y debajo estaba TODA la selección. Ahora arriba hay un
`selectionFactor(block)` y debajo el mismo código de siempre: el déficit contra el P75 de los
punteros, el hazard, el marcaje que responde y el cerillo que salva. Con qué atributo se mide el
déficit no hubo que tocarlo —`blockPerfil` ya daba MON/COL en la subida, `0,6·PAV + 0,4·LLA` en el
adoquín y DES en la bajada—; lo que se añade es cuánto pesa cada terreno:

| Terreno  | Factor                       | Por qué                                                                                                                                    |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Subida   | **1**                        | Es la referencia con la que se calibró `lambdaDropBase`. La montaña no se mueve                                                            |
| Pavé     | `0,34 · estrellas / 3`       | **Las estrellas del sector escalan la dureza**: viajaban en el bloque desde la v4 y solo se leían para el coste. Un 5★ rompe casi el doble |
| Descenso | `0,08`, y solo con `g ≤ −4%` | Se pierde la rueda, no se revienta. El umbral de pendiente es el guardarraíl contra la trampa de §16 (ver abajo)                           |
| Llano    | 0                            | —                                                                                                                                          |

El impulso del cerillo (`matchBonus`) pasa a valer en todo terreno que selecciona, no solo en la
subida: si en el adoquín se quema una cerilla para no soltarse, tiene que servir para aguantar los
metros siguientes, o quemarla sería tirarla.

**2. La trampa del descenso, evitada a propósito.** El comentario de `onClimb`/`raceThisClimb` cuenta
lo que pasó cuando toda la etapa contaba como puerto decisivo: ciclos de 170 → 15 → 173 corredores.
Un perfil real tiene descensos por todas partes —el Ronde tiene 18,9 km de «descenso» repartidos en
toboganes de 300 m que son relieve reconstruido, no bajadas—, así que la selección en descenso exige
`g ≤ −4%`. Medido: en la llana de control y en el banco de descenso, cero descuelgues.

**3. Sin las tres piezas de al lado, la selección del adoquín se deshacía sola.** Esto es lo que el
encargo no anticipaba y lo que de verdad costó:

- **El sector se CORRE.** El pelotón cruzaba los 31 sectores de Roubaix al tempo de carretera (0,55).
  Ahora hay un suelo de compromiso en el adoquín y en su aproximación (`pavesRaceCommit`,
  `pavesApproachKm`), igual que el puerto decisivo tiene el suyo, y el ritmo del sector lo marcan los
  de delante (`pavesPaceFraction` 0,15, entre el 0,12 del puerto y el 0,25 del llano).
- **Dentro del sector no hay reenganche.** El adoquín pasa a ser terreno «que rompe», como la
  subida: no hay recorte de los descolgados ni vuelta al pelotón mientras dura el sector. Entre
  sector y sector sí, que es como se corre Roubaix.
- **La puerta del pelotón se cierra según lo que aprieta** (`chaseBackShutFloor`). Era el agujero de
  fondo, y estaba anotado en §9 como parche: el descolgado recortaba **8 s/km fijos**, con el pelotón
  a paseo igual que con los trenes lanzados —un 9% de velocidad de regalo sobre un pelotón a tope, que
  es imposible—. Medido antes del arreglo: el pelotón se partía en cada sector (58 → 44) y estaba
  entero en el asfalto siguiente (44 → 57), tres veces en los últimos 30 km. Por debajo del tempo de
  carretera el factor vale 1 y no se mueve nada de lo calibrado; y un autobús que triplica en número
  al grupo de cabeza (`chaseBackBusFactor`) vuelve igual, porque se releva mejor.

**4. Un sector de pavé en los últimos 2 km apagaba la persecución de toda la carrera.** `finishFlat`
pedía que el final fuera `llano` o `descenso`, así que los 300 m del Espace Charles Crupelandt hacían
que en Paris-Roubaix los sprinters no persiguieran NUNCA: el pelotón pasaba al control de la general,
daba los 350 s de `gcControlLeash` y el monumento se lo llevaba la fuga del día por siete minutos.
Ahora el adoquín cuenta como llegada rodada.

**El azar nuevo sale de un subflujo NOMINAL propio, `rough`.** Reutilizar `rngHazard` habría
desplazado la secuencia del descuelgue en montaña —que se calibró contra ella— y habría movido
resultados sin que ninguna ley de la montaña cambiara. Con el subflujo propio, las dos huellas
selladas de `reina-150` en `stage/attribution.test.ts` salen **idénticas dígito a dígito** a las de
la v10.

**Y con esto entra Strade Bianche**, que se había quedado fuera declaradamente por este agujero (ver
docs/fuentes-recorridos.md): 15 sectores de _sterrato_ reales, 70,5 de sus 215 km, con dureza
publicada de 1 a 5 estrellas.

### 15. Cambio 4 — Consecuencias de la fatiga (HECHO, v14)

> **Implementado en `engine_version` 14.** Las reglas puras viven en
> `packages/engine/src/stage/abandon.ts` y su aplicación en `simulate.ts`; lo que decide quién no
> toma la salida al día siguiente vive en `packages/db/src/stageRun.ts`, que es quien sabe que hay un
> mañana. La retirada voluntaria es `retireFromRace()` + `POST /api/riders/me/races/:raceKey/retire`.
> Los números de antes y después están en docs/balance.md, «v14 — Abandonos y pájara», y el criterio
> de éxito lo vigila CI con una gran vuelta simulada entera (`sim/grandTour.ts`).
>
> Lo que sigue es el encargo original, que se conserva porque es el contrato contra el que se midió.

- **Activar la pájara**: pasar `bonk` a `effNow` cuando el tanque llega a cero. El código ya existe.
- **Abandonos y fuera de control** (decidido, ver §V.5): abandono **automático** cuando el corredor
  no puede más (tanque agotado, lesión seria, corte de tiempo) y abandono **voluntario entre etapas**
  para el jugador humano que prefiere retirarse y preparar otra carrera. Hoy el tipo `StageResult`
  contempla `'abandon' | 'dnf'` y nunca se emiten.

#### 15.1 Qué quedó implementado (v14) y qué no

**La pájara ya estaba activa desde la v8** (`riderEff` pasa `isBonked(sim)` a `effNow`): lo que
faltaba era **narrarla**, que era el agujero que docs/balance.md arrastraba desde la v6. Ahora el
motor emite `rider_bonks` con throttle largo (en la reina de tercera semana se vacía el pelotón
entero) y la crónica lo agrupa en racimo con número, igual que los descuelgues.

**Los abandonos** son cuatro causas repartidas según quién puede saberlo:

| Causa                 | Quién decide  | Estado emitido               |
| --------------------- | ------------- | ---------------------------- |
| Colapso               | Motor         | `abandon` (no llega a meta)  |
| Fuera de control      | Motor         | `dnf` (llega, no clasifica)  |
| Lesión                | `packages/db` | `race_rosters.abandoned_day` |
| Enfermedad en carrera | `packages/db` | `race_rosters.abandoned_day` |

**Lo que NO entró, y por qué:**

- **El corte de tiempo casi nunca dispara** y por eso «fuera de control» aporta el 1 % en vez del
  45 % de §VI.3. No es que el corte esté mal puesto: **los rezagados del motor pierden demasiado
  poco tiempo** (el peor grupeto de una etapa reina real entra al 5-6 %, cuando en carretera entra
  al 10 %). Es el modelo de persecución (`chaseBackSecondsPerKm`), y arreglarlo recalibra todas las
  etapas. Medido en docs/balance.md, «v14 §1».
- **La contrarreloj no lleva corte.** El motor reparte en una crono de 20 km un abanico del 36 % en
  la cola: con el corte puesto, la etapa 1 de una gran vuelta eliminaría a 150 de 176. Es un defecto
  abierto del modelo de crono.
  > **RE-MEDIDO EN LA v18, y está peor de lo anotado.** En producción, `race-colombia` e3 (33 km, 130
  > corredores) reparte una cola del **46,4 %** y `nc-co-itt` (38 km, 40) del **41,2 %**. Sigue sin
  > tocarse —no era el encargo de aquella tanda—, pero desde la v18 **se ve**: con orden de salida,
  > esa cola son 65 ALCANCES por crono con 2 minutos de intervalo (145 con 1 minuto), contra los 0-6
  > que salen escalando los mismos tiempos a una cola realista del 8-10 %. Medido con los tiempos
  > reales de producción en docs/balance.md, «v18 §7».
  >
  > **ARREGLADO EN LA v19, y no era del modelo de crono: era de la LEY DE VELOCIDAD.** La ley se
  > aplicaba con un exponente único y con el atributo leído como si fuera un vatio, de modo que
  > acertaba en el puerto y multiplicaba por tres lo del llano. Con la escala de potencia con suelo y
  > el exponente por terreno, la cola de `race-colombia` e3 pasa del 46,4 % al **13,1 %** y la de
  > `nc-co-itt` del 41,2 % al **13,6 %**, los alcances de 117 a **18**, y la cola de una crono la
  > vigila ahora `sim/timeTrials.ts` en CI (8-15 %). **El corte de tiempo sigue fuera de la crono**,
  > pero ya no por imposible: con la cola arreglada, el 8 % de la llana sigue siendo el corte
  > equivocado —una crono no tiene pelotón y sus tiempos son un continuo— y lo que hace falta es el
  > plazo que el reglamento da a las cronos individuales, del orden del 25 %, con el que hoy no se
  > eliminaría a nadie. Medido en docs/balance.md, «v19 §7».
- **La fragilidad oculta sigue sin llegar al motor.** `StageRider.fragility` existe, escala la lesión
  al caer y `stageRun.ts` nunca lo rellenaba: todas las carreras de producción corren con fragilidad
  1. Ahora se lee del genoma para la enfermedad, pero pasárselo al motor cambiaría las caídas de
     todas las etapas.

### 16. Cambio 5 — Telemetría: que el motor cuente lo que sabe

> **Primera entrega hecha (v6).** Sin separar aún telemetría de narrativa, pero cerrando los tres
> agujeros que hacían el journal ilegible: el corte del pelotón se emite con la selección ACUMULADA
> y el tamaño del grupo antes y después (no con los descolgados de un bloque de 100 m), el parte de
> boquete sigue al grupo de CABEZA sea quien sea y se aprieta en los últimos 40 km, y el nuevo
> `front_group` NOMBRA a los que van delante cuando quedan pocos. De paso salieron dos defectos
> medidos: en un final en alto toda la etapa contaba como puerto decisivo, y la erosión no tenía
> techo estructural. Todo en docs/balance.md, «v6 — Telemetría de carrera».

> **Segunda entrega hecha (v11): la ATRIBUCIÓN DEL TRABAJO.** El motor sabía, en cada bloque de
> 100 m y para cada grupo, quién daba la cara al viento (`relayTurn()`) y lo tiraba; y el `work` que
> sí guardaba mezclaba el gasto de ir a rueda con el de relevar. Ahora se cuenta aparte el TRABAJO
> AL FRENTE —solo los bloques en el turno de relevos y solo lo que se aprieta por encima del tempo
> de carretera—, separado por grupo (pelotón / fuga), con una ventana con olvido para «quién tira
> AHORA» y un libro por movimiento para «quién cerró ESA persecución». De ahí salen `peloton_pull`,
> `chase_work` y `break_share`, que responden a las dos preguntas del dueño: **quién tira del
> pelotón** y **quién hizo el trabajo para reducir la distancia**. Cambio de OBSERVACIÓN: ni azar
> nuevo ni física nueva, y los resultados de una etapa con una semilla dada son idénticos a los de
> la v10 (test `stage/attribution.test.ts`). Medido en docs/balance.md, «v11 — Atribución del
> trabajo». Sigue pendiente lo estructural de este cambio (la telemetría como dato separado de los
> eventos, ver abajo) y siguen sin narrarse la pájara y el descuelgue individual.

> **Tercera entrega hecha (v13): la IDENTIDAD, el MOTIVO y el RUIDO.** El dueño leyó los journals de
> producción del día 37 y pidió tres cosas: que cada mención de un ciclista lleve su dorsal, su
> equipo y su bandera; que cuando alguien tire del pelotón se diga POR QUÉ («está trabajando para
> alguien, ¿no? Si no, no debería desgastarse»); y que los descuelgues no se narren uno a uno.
> Midiendo esos mismos journals salieron seis defectos, dos de los cuales el motor YA no cometía: los
> eventos de producción están CONGELADOS y se corrieron con motores anteriores.
>
> **Del motor**: rendirse pasa a ser un acto único (el mismo corredor se descolgaba tres veces en la
> misma carrera), conceder la fuga exige recorrido hecho y ventaja de verdad (se concedía en el km 10
> y se cazaba en el 126), el liderato de la montaña se canta solo en estricto (tres corredores con un
> punto se proclamaban líderes uno tras otro) y el parte de relevos deja de esperar a la fuga del día
> y viaja con el motivo (`forKind`, `forId`), que salía gratis del `role` y el `targetRiderId` de las
> órdenes y se estaba tirando desde la v9.
>
> **De la crónica** —que es la ÚNICA capa que puede arreglar una etapa YA CORRIDA, porque sus eventos
> están congelados y se renderizan al vuelo—: la identidad completa por protagonista, el racimo de
> descuelgues, y las guardas de lo congelado (un `dropped` imposible, los avisos de criba vacíos, la
> concesión que luego se desmiente). Sin física nueva ni azar nuevo, y con la huella de tiempos
> intacta. Medido en docs/balance.md, «v13 — Identidad, motivo y ruido en el journal». Sigue
> pendiente lo estructural (la telemetría como dato separado) y sigue sin narrarse la pájara.

> **Quinta entrega hecha (v21): LA CRIBA QUE DECIDE LA ETAPA, Y LA FUGA QUE SE HUNDE.** Los dos
> agujeros que las tandas anteriores dejaron medidos y anotados. El primero lo escribió la v16: el
> corte del pelotón (`peloton_split`) solo se narra dentro de los últimos `climbRaceKmToGo` km, así
> que **la criba que decide la etapa a 50 km de meta no tenía frase**. La ventana no se toca —existe
> por una razón medida: con perfiles reales hay relieve por todas partes y sin ella cada cota
> escupía una línea (v6, 26 cortes por etapa)—; lo que entra es un evento NUEVO para la criba lejana
> (`peloton_selection`) con un listón que no es de kilómetro sino de **magnitud**: cuánta gente ha
> perdido la cabeza de carrera contra su MÁXIMO reciente, y que la sangría haya parado. Y una
> frontera que conviene leer entera, porque es la de este §16: **el motor pone la magnitud y la
> crónica pone la permanencia**. Que una criba se DESHAGA cincuenta kilómetros después es futuro, el
> motor emite en carretera y no lo puede saber; la crónica ve la etapa entera y tira la frase si el
> grupo recupera más de la mitad de lo que perdió. Medido: el motor emite 80 cribas lejanas en 128
> etapas del banco y la crónica narra 40 —la mitad exacta eran espejismos—.
>
> El segundo agujero es de la v13 y lo volvió a medir la v16: **ocho partes de boquete seguidos para
> contar que una fuga se hunde**. No se agrupa por número como los descuelgues, sino por NARRATIVA:
> se cuenta el arranque, se cuenta el desenlace —de dónde a dónde y en cuántos km— y desaparece lo
> de en medio; rompen la racha las tres cosas que cambian la historia (que la ventaja se estabilice,
> que vuelva a crecer, que cambie el grupo del que se habla). Como vive en la crónica, arregla
> también los journals YA CORRIDOS: los 64 de producción bajan de 27,3 a 25,4 líneas de media.
> Cambio de OBSERVACIÓN en el motor: ni azar nuevo ni física nueva, y las huellas de
> `attribution.test.ts` y `timetrial.test.ts` salen idénticas. Medido en docs/balance.md, «v21».

> **Cuarta entrega hecha (v18): LA CONTRARRELOJ.** Era el agujero más grande que quedaba en lo que
> el motor cuenta, y no era de matiz: una crono entera —130 corredores, 33 km— se resolvía con **un
> solo evento**, el ganador en meta. La causa no estaba en la narración sino en el modelo: no había
> ORDEN DE SALIDA, así que no había reloj de carrera, y sin reloj no hay nada que contar. Ahora la
> rampa la reparte una regla pura y propia (`stage/startOrder.ts`) —inverso de la general cada 2
> minutos, o por dorsales cada minuto con el 1 cerrando— y de ella salen la silla del mejor tiempo,
> dos parciales y los ALCANCES. Cambio de OBSERVACIÓN en lo que a los tiempos respecta: ni azar nuevo
> ni física nueva, y la huella de la crono canónica es la de la v17 dígito a dígito
> (`stage/timetrial.test.ts`). Medido en docs/balance.md, «v18 — La contrarreloj».

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

### 17. Orden de trabajo propuesto — CERRADO

> **El plan del motor está terminado.** Con la v15 entra la última pieza pendiente —el plan de
> equipo de §V.1, con `shelterAlone` y la desobediencia de §VI.2— y no queda ningún trabajo de esta
> tabla por hacer salvo los dos que nunca fueron del motor: los **perfiles reales** (entrada de
> datos, trabajo 3) y la **recalibración con Montecarlo** (trabajo 6), que es un proceso continuo y
> no un cambio de código. La lista de «mecánicas documentadas que nunca se ejecutan» (§8) está
> vacía salvo la CRE, que es una decisión tomada (§V.4).
>
> Lo que sigue abierto ya no vive aquí, sino en docs/balance.md como defectos anotados y medidos:
> el modelo de persecución de los descolgados, el abanico de la contrarreloj y el reparto de causas
> de abandono. Ninguno es una mecánica que falte: son calibraciones de mecánicas que existen.
>
> **El abanico de la contrarreloj está HECHO (v19)**, y resultó no ser una calibración de la crono
> sino la LEY DE VELOCIDAD: el atributo se leía como si fuera un vatio y el exponente era el mismo
> contra el aire que contra la gravedad. Corregidas las dos cosas, la cola de una crono de producción
> pasa del 46 % al 13 %, el nivel 40 deja de rodar a 37,5 km/h y la montaña se queda donde estaba
> (±1,3 puntos de selección). Medido en docs/balance.md, «v19». Quedan abiertos los otros dos, y uno
> nuevo que la v19 anota: el pavé merece un exponente intermedio (su rodadura es lineal, como la
> gravedad) y hoy usa el del llano.

| #   | Trabajo                                                                                  | Por qué en este puesto                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | ~~Desgaste + controlador del pelotón + velocidades (§12-bis)~~ **HECHO (v5-v6)**         | Es la raíz medida. Sin desgaste y con el controlador atado a la fuga, nada de lo demás puede dar resultados creíbles. No depende de los perfiles: se puede empezar YA |
| 1   | ~~Modelo de final (§12)~~ **HECHO (v7)**                                                 | Máximo impacto por esfuerzo una vez hay desgaste: arregla "gana quien no debe"                                                                                        |
| 2   | ~~Selección en pavés/descenso (§14)~~ **HECHO (v12)** · ~~fatiga (§15)~~ **HECHO (v14)** | El pavés no existía como terreno (brecha de 0 s en meta). Hechas las dos: la selección en la v12 y los abandonos con la pájara narrada en la v14                      |
| 3   | **Perfiles reales** (extracción y validación)                                            | Entrada del motor. Necesarios **antes de la recalibración final**, no antes de las correcciones estructurales                                                         |
| 4   | ~~Capa táctica (§13)~~ **HECHO (v9)**                                                    | El desarrollo grande. Es lo que hace que las carreras se distingan entre sí                                                                                           |
| 5   | ~~Telemetría (§16)~~ **HECHO (v6, v11, v13 y v14)**                                      | Habilita el journal y las vistas nuevas                                                                                                                               |
| 6   | Recalibración completa con Montecarlo                                                    | Solo al final, con entradas buenas y mecánicas completas. **Proceso continuo**: cada tanda re-mide `pnpm sim` y `pnpm sim:tactics` y anota lo que mueve               |
| —   | ~~Composición de la carrera y caza por campo (§18)~~ **HECHO (v10)**                     | Se coló delante del 2 y del 3 porque sin ella el motor no tenía nada que resolver: la carrera generada no repartía tiempo por ninguna parte                           |
| —   | ~~Plan de equipo, `shelterAlone` y desobediencia (§V.1, §8, §VI.2)~~ **HECHO (v15)**     | La última pieza. Cierra la deuda que arrastraban la v9, la v10, la v11 y la v12: el motor no conocía los equipos y la caza era un escalar de etapa                    |

Cada cambio de comportamiento incrementa `engine_version` y se anota en `docs/balance.md`.

### 18. Cambio 6 — Que la carrera tenga algo que morder (HECHO, v10)

> **Implementado en `engine_version` 10.** La composición vive en `routes/calendar.ts::stageMix`
> (proporciones en `ROUTE`) y la caza en `stage/chase.ts`. Los números de antes y después están en
> docs/balance.md, «v10 — Composición y caza».

Es la mitad que faltaba de la queja que abría este documento —«un sprinter con 45 en todo lo demás
gana 4 de 5 etapas y la general»— y que ni el modelo de final (§12) ni la capa táctica (§13) podían
cerrar, porque **el problema no estaba solo en el motor: estaba en la carrera**.

**18.1 La carrera no existía.** El generador de composición era un `i % 2` con dos excepciones y
producía vueltas que no se corren en ninguna parte: una vuelta de 5 etapas **no podía llevar crono
jamás** (se exigían 6+), con terreno llano **tampoco la llevaba nunca** tuviera las etapas que
tuviera, la media montaña generada **siempre acababa en el valle** —o sea, al sprint— y la última
etapa era llana salvo en alta montaña. `race-sharjah` caía en las dos exclusiones a la vez: cinco
sprints garantizados por construcción y una general que solo repartía bonificaciones. Es el punto
ciego que ya anotaba §10 («1.271 etapas del calendario usan perfiles generados que nunca se han
validado contra nada»), visto desde la composición y no desde el perfil.

Ahora la vuelta se compone como la compone un organizador —crono, última etapa, relleno por terreno
y garantías— y hay un tipo de etapa nuevo, **la media montaña que muere arriba**, que es lo que da
algo que morder a una vuelta corta sin alta montaña. Con dos garantías de suelo: un mínimo de etapas
con puertos y, por debajo de todo, **ninguna vuelta se queda sin crono ni final en alto**.

**18.2 El pelotón no sabía a qué carrera estaba corriendo.** `chasingSprinters` era un interruptor
global —`riders.some(SPR ≥ 70) && finishFlat`— así que **un solo corredor rápido** ponía al pelotón
entero a perseguir con toda su fuerza, exactamente igual en una continental modesta que en una gran
vuelta con cinco trenes. En el ciclismo real la fuga llega mucho más a menudo en las carreras
pequeñas y no es casualidad: es que allí no hay equipos capaces de organizarse para cazarla.

`stage/chase.ts` mide los **trenes** del campo (un rematador con opciones reales más los compañeros
que le apuntan con `targetRiderId`, que es lo más parecido a un equipo que conoce el motor) y con
ellos escala la cuerda que da el pelotón, el tope de esfuerzo con que puede cerrar, el tirón final
de los últimos kilómetros y cuándo se rinde. Con el campo a fuerza plena el controlador da los
mismos números que antes, así que los invariantes de balance no se mueven.

Lo que **no** hace, y queda anotado: la caza sigue siendo un solo escalar de etapa, no un plan por
equipo con presupuesto de esfuerzo (§V.1); y la fuerza se infiere de las órdenes porque
`StageRider` todavía no trae `teamId`.

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

### V.1 Capa táctica: por equipo, con las individualidades por encima (HECHO, v15)

> **Implementado en `engine_version` 15.** El plan vive en `packages/engine/src/stage/teamPlan.ts`
> (decisiones puras: intención, presupuesto y quién lleva el frente) y la carretera en `simulate.ts`.
> `StageRider` trae por fin **`teamId`** —nulo para el agente libre— y lo rellena
> `packages/db/src/stageRun.ts`, que es quien conoce los equipos.
>
> Lo que consulta el plan, que es lo que pedía esta sección: **el turno de relevos** (`relayDuty`),
> **la caza** (la fuerza de `chase.ts` deja de ser un escalar de etapa y se escala con lo que les
> queda a los equipos que persiguen) y **la capa de ataques** (`attackAppetite`). El presupuesto de
> esfuerzo se agota: un equipo que lleva ~80 km al frente se funde y otro toma el relevo.
>
> **Y el plan lleva un MOTIVO, que es la mitad del valor.** Dictado después: «no es solo saber qué
> equipo(s) participan de la persecución… también es saber POR QUÉ». Los tres motivos salen de la
> carrera y de ningún dato nuevo: **por la etapa** (`finishScore` sobre el tipo de final que dibuja
> el recorrido: «tenemos al favorito de HOY»), **por el maillot** (`gcDeficitSeconds` = 0 con
> general en juego) y **por la general** (un favorito que se la juega igual). El motivo decide
> cuánto gasta el equipo y si toma el frente —el que no tiene ninguno **no gasta**, que es el «no
> desgastarse a lo wey» a escala de equipo— y viaja en el evento `peloton_pull` para que la crónica
> pueda decir «X tira para su sprinter», «X tira defendiendo el maillot» o «X tira porque la fuga
> amenaza a su líder». Un equipo puede tener varios: **se acumulan en el esfuerzo y manda uno solo
> en la frase**, el que más derecho da al frente en esa situación.
>
> El efecto visible es el que pedía el dueño: el parte de «quién tira» pasa de **no poder nombrar a
> un equipo casi nunca** (0 % medido en la llana con 8 equipos, 2-12 % en la campaña de la v11) a
> hacerlo en la mayoría de los partes. Los números están en docs/balance.md, «v15», y el objetivo
> vive en `sim/targets.ts` (`chronicle.teamPullFlatPct` y `chronicle.frontTeamsPerStage`).
>
> Las dos reglas que mandan sobre el plan están implementadas: el que corre por su cuenta (§VI.2)
> queda FUERA del plan —ni le empuja ni le frena— y el agente libre no participa de ninguno. Un
> campo entero sin equipos se comporta exactamente como en la v14.

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

> **La v18 tampoco la implementa, y ahora hay una razón de más para no hacerlo todavía.** Esa tanda
> construye el ORDEN DE SALIDA de la CRI (`stage/startOrder.ts`) y con él el reloj de carrera; la CRE
> es exactamente «esa misma rampa, pero el que sale es un equipo», así que cuando llegue se apoyará
> en la regla que ya existe en vez de inventar otra. Lo que sigue sin urgir es lo mismo de siempre:
> ninguna carrera del calendario la corre.

### V.5 Abandonos: automáticos y voluntarios (HECHO, v14)

> **Las dos vías están implementadas.** La automática, en §15 y §VI.3. La voluntaria vive en
> `packages/db/src/riderSchedule.ts::retireFromRace()` y se dispara desde
> `POST /api/riders/me/races/:raceKey/retire`, con su contrato Zod en `packages/shared`. Deja la
> MISMA marca que un abandono automático (`race_rosters.abandoned_day`, con el motivo `voluntario`),
> así que no hay un segundo camino de consecuencias que mantener. Su punto en la interfaz es
> **`My Rider → My races → Upcoming`**, con confirmación, y solo aparece en una carrera POR ETAPAS
> que ya esté rodando. **No** está en el dashboard: docs/navegacion.md §4 lo reserva a «solo lo
> accionable, ordenado por urgencia, sin atajos de sección», y retirarse no es urgente y no se
> deshace.

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

### VI.2 Desobedecer las órdenes del equipo (HECHO, v15)

> **Implementado en `engine_version` 15**, con la mitigación INTRÍNSECA que proponía esta misma
> sección y no la administrativa. `stage/teamPlan.ts` detecta dos formas de ir por libre, y las dos
> se leen de las órdenes que ya existían:
>
> - **Dos jefes en un equipo**: el que se declara `lider` o `sprinter` sin ser el jefe de filas del
>   plan. Es el caso del encargo: el jugador humano se pone de líder cuando su equipo ya tiene uno.
>   `world/autoOrders.ts` nunca nombra dos, así que en un pelotón de bots esto no ocurre nunca.
> - **El que trabaja para un extraño**: apunta con `targetRiderId` fuera de su equipo.
>
> Qué le pasa: **su decisión manda sobre el plan** (§V.1, regla 1), así que el empuje colectivo no
> le toca —ni le mete en el turno de relevos de su equipo ni le saca de él— y **decide como un
> agente libre**. El coste es el que decía la mitigación: no le arropan los gregarios, no le lanza
> el tren y su equipo no gasta presupuesto por él; encima, el equipo **no deja de perseguir por
> él** si se va en un movimiento. Gasta más, remata peor, y a veces sigue mereciendo la pena.
>
> Se cuenta una vez, al principio de la crónica (`rider_defies_team`).

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

### VI.3 Umbral del abandono automático (HECHO, v14 · ESPECIFICACIÓN CORREGIDA en la v20)

> **Implementado y medido.** La precondición de más abajo —«hasta que el reagrupamiento esté
> arreglado, aplicar el corte eliminaría a media carrera»— **se comprobó antes de escribir una línea
> y se cumple**: la reina canónica pasó de 33 grupos en meta con 30 de un corredor (§3-bis-e) a
> **7 grupos con 2 de un corredor**. Los números están en docs/balance.md, «v14», §0.
>
> **El objetivo del 12-20 % se cumple (14,4 % medido sobre 6 grandes vueltas de 21 etapas, terminan
> 151 de 176) y lo vigila CI.** El REPARTO de causas no: «fuera de control» aporta el 1 % en vez del
> 45 %, porque con los retrasos que produce el motor hoy —el peor grupeto de una etapa reina real
> entra al 5-6 %— un corte del 8-18 % no señala a nadie. Se prefirió respetar el corte tal cual y
> dejar que las otras causas lleven el peso antes que bajarlo para cuadrar el reparto. La deuda
> concreta es el modelo de persecución, no este umbral.
>
> **AL DÍA (v16): la deuda está pagada y el corte muerde.** Con el modelo de persecución arreglado
> (§9-bis) el último grupo de una etapa reina de gran vuelta entra al **9,3 %** en vez del 2 %, y con
> ello «fuera de control» pasa del 0 % al **19 %** de los abandonos, con el total en el 15,2 %
> (dentro del 12-20 %). El reparto sigue sin ser el de la tabla —19 / 54 / 27 contra 45 / 40 / 15—
> por dos razones medidas: la LESIÓN subió en absoluto (65 → 97 en seis vueltas) al arreglarse un
> agujero que dejaba a los descolgados sin exposición a las caídas, y la ENFERMEDAD se bajó a
> propósito (`illnessRaceMax` 0,0045 → 0,0028) para que el total no se saliera por arriba, que es
> justo lo que esta sección anticipó. La perilla que queda es la calibración de las caídas, atada al
> invariante del pavé. Las dos salvaguardas siguen sin activarse en el calendario real.
>
> **Y AL DÍA (v17): el corte tampoco puede ser una guillotina.** El otro extremo del mismo objetivo
> se vio en producción antes que en el banco: en Race Colombia e5 la cola entró al **22 %**, por
> encima del 18 % de la reina, así que el corte señalaba a media carrera y lo único que lo frenaba
> era el tope del 4 % con su readmisión en bloque. Un corte que se lleva a todos no es un corte. El
> banco nuevo de reinas reales (`sim/realQueens.ts`) lo vigila con un objetivo explícito: **ninguna
> etapa reina del calendario puede tener su cola por encima de `timeCutQueen`**.
>
> Las dos salvaguardas están implementadas y probadas: el tope del 4 % se toca en 5 de 126 etapas
> (siempre la más dura del calendario) y la readmisión con penalización no llega a activarse en el
> calendario real, por la misma razón que el corte.

> ---
>
> ## LA CORRECCIÓN DE LA v20: EL 45 % ERA NUESTRO, NO DEL CICLISMO
>
> Tres tandas —la v14, la v16 y la v19— midieron el reparto de causas contra la tabla de abajo, lo
> anotaron como deuda y no lo tocaron. La v20 lo toca, y lo primero que hace es **contrastar el 45 %
> con el ciclismo real antes de calibrar hacia él**. No se sostiene:
>
> | Gran vuelta          | Abandonos | De ellos, FUERA DE CONTROL |
> | -------------------- | --------: | -------------------------: |
> | Vuelta a España 2024 | 39 de 176 |     **1** (Nico Denz, e20) |
> | Giro d'Italia 2024   | 34 de 176 |                      **0** |
> | Giro d'Italia 2023   | 51 de 176 |                      **0** |
> | Tour de France 2024  | 26 de 176 |                **1** (e12) |
>
> **Del orden del 0-4 % de los abandonos de una gran vuelta son eliminaciones por el corte, no el
> 45 %.** Y tiene una explicación de reglamento, no de estadística: **el grupeto existe precisamente
> para entrar dentro del corte, y casi siempre lo consigue**. Un corte que se llevara por delante a la
> mitad de los que abandonan no sería un corte, sería una guillotina —que es justo lo que la v17 vio
> en producción y corrigió—. Lo que vacía una gran vuelta son las caídas, las enfermedades y el
> agotamiento; el fuera de control es la excepción que remata a quien ya venía roto.
>
> El 45 % venía de una intuición nuestra sobre lo que «debía» pesar el corte de tiempo por ser la
> regla más vistosa, y **perseguirlo habría obligado a estrechar el corte hasta dejarlo por debajo de
> la cola de la carrera** — es decir, a romper a propósito el modelo de persecución que la v16 y la
> v17 costaron enteras. Se prefiere corregir la especificación antes que calibrar el motor hacia un
> objetivo equivocado.
>
> **La tabla de abajo queda re-anclada sobre esos datos**, y con dos cambios más de fondo:
>
> 1. **La «lesión» y el «colapso» dejan de ser causas independientes y pasan a ser DOS SITIOS de la
>    misma causa: la CAÍDA.** El que se cae fuerte a veces termina la etapa y no toma la salida al día
>    siguiente (lo decide `packages/db`) y a veces se baja de la bici en la cuneta (lo decide el
>    motor). En el ciclismo real es un solo bloque —«crash/injury», 11-14 corredores por gran vuelta—
>    y medirlo partido en dos no dice nada útil.
> 2. **La «enfermedad» absorbe lo que en las listas reales es el bloque de DNS sin causa declarada**
>    (18-20 corredores por gran vuelta): enfermar de verdad, y también el que amanece cocido y no se
>    sube a la bici. Es lo que el motor modela con `raceIllnessProbability`, y es el bloque más grande
>    de todos, no el 15 % de la tabla vieja.
>
> ---

**Objetivo de diseño, medible:** una gran vuelta de 21 etapas debe empezar con ~176 y terminar con
**entre 140 y 155** (abandona el **12-20%**), que es el rango real. Traducido: **≈1% del pelotón por
etapa**, no más.

Tres causas, con su peso objetivo **(re-anclado en la v20; el reparto viejo, 45/40/15, queda
desmentido arriba con la medida que lo tumba)**:

| Causa                | Peso  | Real (4 grandes vueltas) | Medido v20 | Regla                                                                                                                                                    |
| -------------------- | ----- | ------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Caída**            | ~45 % | 14 – 42 %                | **62 %**   | Caída `minor` o `major`, o baja ≥ `abandonInjuryDays`. Dos desenlaces: no tomar la salida mañana (`packages/db`) o **bajarse de la bici hoy** (el motor) |
| **Enfermedad**       | ~50 % | 54 – 86 %                | **34 %**   | Enfermar durante la carrera (`raceIllnessProbability`), que es también el «no toma la salida» sin causa declarada de las listas reales                   |
| **Fuera de control** | ~5 %  | 0 – 4 %                  | **4 %**    | Llegar fuera de un % del tiempo del ganador, según dureza: **8 %** en llana, hasta **18 %** en la reina, y **25 %** en contrarreloj (`timeCutItt`)       |

**La causa del encargo queda cumplida y las otras dos quedan INVERTIDAS, y hay que decirlo con el
número delante.** El «fuera de control» está donde el ciclismo lo pone; el bloque de la caída y el de
la enfermedad están del revés respecto a la carretera, porque **la enfermedad en carrera pesa la
mitad de lo que pesa en la vida**. El arreglo se probó en esta misma tanda —subir
`HEALTH.illnessRaceMax` de 0,0028 a 0,0050 pone el reparto en 50 / 47 / 3 y el total en el 16,6 %,
los dos mejores— y **se descartó porque `grandTour.queenLastGroupPct` cae de 8,4 % a 6,9 %**: se
compraría la mezcla rompiendo el criterio de éxito del modelo de persecución, que costó las tandas
v16 y v17 enteras. Queda como deuda NOMBRADA y medida, no como número escondido.

**El suelo del 1 % de la última fila no es holgura: es la alarma que faltaba.** Lo que hay que
vigilar de esa causa no es que sea grande —no lo es en la vida— sino que **no vuelva a quedarse
muda**: en la v14 valía el 1 % porque el corte no señalaba a nadie, y ese sí era un defecto. Un
corte que no elimina jamás a nadie no es un corte. Y las bandas de `sim/targets.ts` no son estos
pesos: son el margen que hoy se puede sostener, con un techo de **dos tercios** para que ninguna
causa se quede con la carrera entera mientras la deuda de arriba siga abierta.

> **EL CORREDOR EN APUROS (v20), que es la pieza que faltaba para que el corte signifique algo.** El
> arreglo de §3-bis-e —que `dropOut` una al descolgado con el grupeto que rueda a su altura, sin el
> cual la reina terminaba con treinta grupos de un corredor— tenía una consecuencia que nadie había
> medido: **todo el mundo acababa en un autobús**, y un autobús organizado entra siempre dentro del
> corte. En carretera el que se va fuera de control es el que se queda SOLO: el que se ha caído y va
> tocado, el que ha reventado del todo, el que arrastra una avería.
>
> Medido antes de tocar nada, sobre 42 etapas reina de gran vuelta: **detrás del pelotón principal
> entran 14,3 corredores por etapa, y de ellos 1,29 van SOLOS** — así que el corredor suelto sí
> existía. Lo que no existía es que **irse solo le costara algo**: el que llega solo pierde el 5,7 %
> de mediana y el autobús el 5,3 %, y ninguno de los 54 solos medidos pasó del 18 % del corte. Por eso
> el arreglo no es «que haya corredores sueltos» sino **que al que va roto no se le regale el
> autobús**: con una caída `minor` o `major` encima no se engancha a un grupeto, ni al descolgarse ni
> en la fusión de descolgados, y desde ahí se abre la segunda vía del colapso. Es la **excepción
> motivada** que §3-bis-e exige y no la regla: son el 10 % de las caídas, unas 0,7 por etapa.

**Y el COLAPSO por pájara sostenida era código muerto, medido.** La regla «tanque a cero de forma
sostenida lejos de meta» exige 20 km seguidos vacío a más de 30 km de meta, y sobre una gran vuelta
entera —624.640 bloques de corredor descolgado a esa distancia— el `bonkKm` máximo es **0,0**: con el
depósito re-anclado en la v15 nadie está vaciado tan lejos de casa. No se retira porque describe algo
verdadero y saltará el día que un recorrido lo produzca, pero **no es la vía por la que uno se baja
de la bici en una gran vuelta**; ésa es la del corredor en apuros.

**Dos salvaguardas contra la hemorragia**, que es el riesgo real:

1. **Tope por etapa**: como mucho un **4% del pelotón restante** abandona en una sola etapa. Si el
   corte de tiempo señala a más, se aplica la regla real del ciclismo: cuando un grupo numeroso llega
   fuera de control, se les readmite con penalización en vez de eliminarlos en bloque.
2. **El corte de tiempo se mide contra el grupo, no contra el corredor suelto**: hoy la montaña
   produce 30 grupos de un corredor (§3-bis-e). Hasta que el reagrupamiento del Cambio 0 esté
   arreglado, aplicar el corte tal cual eliminaría a media carrera. **El abandono automático se
   implementa DESPUÉS del reagrupamiento, no antes.**

**EL CORTE EN CONTRARRELOJ (v20, `timeCutItt` = 0,25).** La v14 dejó la crono fuera del corte y tenía
razón: con el abanico de aquel motor —36 % de cola— la etapa 1 de una gran vuelta habría eliminado a
150 de 176. La v19 arregló la ley de velocidad, dejó la cola en el 13,5 % y midió que ya se podía,
con una condición: **el corte de la crono necesita constante propia, y no por calibración sino por
forma**. En una etapa en línea los tiempos llegan apelotonados en un puñado de relojes y el 8 %
señala al último GRUPO; en una crono cada uno tiene el suyo y la distribución es un continuo, así que
cualquier corte por debajo de la cola se lleva media clasificación por definición (el 8 % elimina a
60 de 130 en `race-colombia` e3). El reglamento real da a las contrarrelojes individuales un plazo
del orden del 25 % justamente por eso.

Con el 25 %: **cero eliminados** en las cinco cronos reales del banco y **cero** en las dos cronos de
la gran vuelta, incluida la etapa 1 que hizo saltar la alarma en la v14. Sigue mordiendo donde debe:
un corredor cuyo día se derrumba del todo pasa del 25 % y queda fuera. Y trae las dos salvaguardas de
arriba tal cual —el tope del 4 % y la readmisión—, con la única diferencia de que en una crono **un
grupo es un corredor**, porque cada uno corre su carrera.

Y el corredor humano tiene siempre la salida voluntaria de §V.5, que es la que convierte esto en
decisión de juego y no en castigo.

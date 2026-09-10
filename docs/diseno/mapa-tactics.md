# Mapa: modelo de ATAQUE y PERSECUCIÓN (`packages/engine/src/stage/`)

Ficheros leídos enteros: `tactics.ts` (855 l.), `marcaje.ts` (45 l.), `chase.ts` (129 l.), `group.ts` (227 l.) y las perillas de `constants.ts` que usan (81 constantes, ver §9). Para responder a «cómo se forma un movimiento» y «cómo se decide el compromiso del pelotón» se ha leído además el tramo de `simulate.ts` que llama a estas funciones (l. 1130-1175, 1528-1700, 1990-2040, 2335-2375, 2740-2830, 2935-3120, 3670-3745, 4420-4810, 5585-5620), porque tactics.ts es sólo la parte PURA: «Aquí viven las DECISIONES (puras, deterministas, sin estado); la carretera —crear el grupo, integrar el boquete, cazar o no— la resuelve `simulate.ts`» (tactics.ts l. 18-20).

Versiones citadas en los comentarios (v9…v59) son las de `docs/balance.md`; se recogen tal cual.

---

## 0. Resumen de la arquitectura

La capa táctica es UNA mecánica parametrizada por contexto (tactics.ts l. 4-16):

```
alguien lo intenta   (λ sube si el grupo va junto y si la meta está cerca)   → moveLambda / rollMoveAttempt
0..N le siguen       (quién salta depende de atención, rol, energía y cerillos) → chooseInstigator + followProbability
algunos no llegan    (los que saltaron y no sostienen se quedan)              → sustainsJump
¿colaboran?          (cuantos más son, menos; los que peor rematan más)        → moveCooperation (+ noChanceToWin cada km)
prospera o fracasa   (lo decide la carretera: el boquete se integra)          → jumpGapSeconds + pelotonAllows + física de grupos
```

Cinco «caras» del mismo intento (`MoveKind`, l. 31-36): `fuga` (regla 5, ataques de salida), `contraataque` (regla 1-2 con fuga ya en carretera), `puente` (regla 7), `ataque_grupo` (regla 6, dentro de una fuga), `ataque_final` (regla 9, los fuertes en el final).

---

## 1. `MoveRider` — lo que sabe un corredor cuando decide (tactics.ts l. 38-95)

| Campo              | Tipo         | Qué es                                                                                                                                                                                                                     | De dónde sale en `simulate.ts::asMoveRider` (l. 4429-4451)                                                                                                                                                                                 |
| ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `riderId`          | string       | identidad                                                                                                                                                                                                                  | `m.input.riderId`                                                                                                                                                                                                                          |
| `role`             | StageRole    | cazaetapas/libre/lider/gregario/lanzador/marcador/sprinter                                                                                                                                                                 | `orders.role`                                                                                                                                                                                                                              |
| `mentality`        | Mentality    | supercombativo/combativo/oportunista/reservon                                                                                                                                                                              | `orders.mentality`                                                                                                                                                                                                                         |
| `triggerKm?`       | number\|null | km en que el jugador le ha citado a atacar (v58). Promesa de pantalla: «Launch a move at this distance. Leave blank to let your mentality decide when»                                                                     | `orders.triggerKm ?? null`                                                                                                                                                                                                                 |
| `perfil`           | number       | perfil efectivo en ESTE bloque (lo que puede sostener ahora)                                                                                                                                                               | `riderPerfil(m, block)`                                                                                                                                                                                                                    |
| `finishScore`      | number       | puntuación de remate en el final que viene («quien peor remata es quien más ataca», regla 6)                                                                                                                               | `finishScore(riderEff(m), type)`; `type = finishType(finishTerrain, members.length)` → el tipo de final se calcula para el TAMAÑO DEL GRUPO ACTUAL                                                                                         |
| `energyFraction`   | [0,1]        | fracción de depósito                                                                                                                                                                                                       | `energy/energy0`                                                                                                                                                                                                                           |
| `matches`          | number       | cerillos restantes: «sin cerillo no hay ataque (SPEC 6.6)»                                                                                                                                                                 | `m.matches`                                                                                                                                                                                                                                |
| `tac`              | number       | atención                                                                                                                                                                                                                   | `eff0.TAC` (de salida, no efectivo)                                                                                                                                                                                                        |
| `spr`              | number       | punta: «un sprinter puro no se va a la fuga del día»                                                                                                                                                                       | `eff0.SPR`                                                                                                                                                                                                                                 |
| `gcDeficitSeconds` | s            | desventaja en la general; 0 = líder                                                                                                                                                                                        | `input.gcDeficitSeconds`                                                                                                                                                                                                                   |
| `teamAttack`       | number       | EL PLAN DE SU EQUIPO reducido a UN ESCALAR (v15, §V.1). 1 = agente libre o rebelde (§V.1 regla 1: «su decisión manda sobre el plan»); <1 = el equipo tiene otra cosa que hacer; >1 = no tiene baza y manda gente a la fuga | `attackFactorOf(riderId)` (l. 1634-1641) → `teamAttackFactor(stance)` en teamPlan.ts l. 553-566: `fuga`→0.4, `perseguir`/`lanzar`→0.7, `controlar`/`proteger`→0.85, resto→1.4                                                              |
| `pulling`          | boolean      | ¿iba en la rotación del PELOTÓN el bloque anterior? (v41). Cita: «el mismo que se escapó, antes de escaparse iba tirando del pelotón»                                                                                      | `esPeloton && m.pulling` — sólo cuenta si el grupo de origen es el `mainId`; en fuga/grupo de cabeza «rotan todos, así que ahí la bandera no distingue a nadie», y aplicarlo a todo «hundía la brecha 1.º-10.º de la reina de 81 s a 59,5» |
| `gastado`          | boolean      | ¿viene de que le cacen tras una fuga larga? (v42). Cita del caso: «un corredor que se escapó en solitario, fue cazado, se volvió a escapar, fue cazado otra vez, se escapó una tercera… y ganó la etapa»                   | `km < m.gastadoHastaKm` (fuga ≥ `tacticSpentMinKm`=15 km deja secuela de la mitad de lo que estuvo fuera, `tacticSpentShare`=0.5)                                                                                                          |

### Lo que un `MoveRider` NO sabe

- **No lleva `teamId`** (grep `teamId` en tactics.ts: 0 resultados; sólo aparece `teamAttack` l. 69 y 382). El corredor no ve quiénes son sus compañeros, ni si hay un compañero en el grupo, ni si un compañero ya está delante: todo eso queda comprimido en el escalar `teamAttack` que se calcula FUERA (teamPlan.ts) y que es idéntico para todos los miembros del equipo.
- **No ve al resto del grupo** salvo a través de dos rangos relativos que le pasa `chooseInstigator`: `finishRank` y `perfilRank` en [0,1] dentro del pool. No sabe quién es el instigador antes de que se sortee, ni cuántos van a saltar.
- **No sabe quién le marca** ni a quién marca: el `marcador` sólo es un rol con apetito 0,1; la relación marcador→objetivo (`markTargetOf`) vive en simulate.ts.
- **No sabe la ventaja de su fuga** ni la distancia al grupo de delante/detrás (el puente lo decide simulate por `bridgeGapMin/MaxSeconds` antes de llamar).
- `tac` y `spr` son los de SALIDA (`eff0`), no los efectivos del bloque.

---

## 2. `MoveContext` — el contexto del intento (tactics.ts l. 97-171)

| Campo                              | Qué es                                                                                                                                                                                                                                               | Fuente en simulate (`attemptFrom`, l. 4453-4488)                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                             | una de las 5 caras                                                                                                                                                                                                                                   | decidido por la fase (ver §4)                                                                                                             |
| `km?`                              | km recorridos; contra él se compara `triggerKm`                                                                                                                                                                                                      | `km`                                                                                                                                      |
| `kmToGo`, `totalKm`                |                                                                                                                                                                                                                                                      |                                                                                                                                           |
| `groupSize`                        | cuántos van en el grupo de origen                                                                                                                                                                                                                    | `members.length`                                                                                                                          |
| `fieldSize`                        | cuántos siguen en carrera (mide si «va junto», regla 1)                                                                                                                                                                                              | `racingNow`                                                                                                                               |
| `onClimb`                          | ¿se sube en este bloque?                                                                                                                                                                                                                             | `block.tipo === 'subida'`                                                                                                                 |
| `tension`                          | tensión acumulada del grupo de origen                                                                                                                                                                                                                | `source.tension`                                                                                                                          |
| `hasGcContext`                     | ¿hay general? En etapa 1 / carrera de un día TODOS tienen déficit 0 y «leído literalmente diría que el pelotón entero es el líder»                                                                                                                   | `input.riders.some(gcDeficitSeconds > 0)` (l. 1568)                                                                                       |
| `gcDefenderId`, `gcCushionSeconds` | quién defiende EN ESTE GRUPO y con qué colchón (v46)                                                                                                                                                                                                 | `gcDefence(members)` — calculado sobre los del grupo, «porque un líder solo puede responder a los ataques de los que lleva al lado»       |
| `breakAppeal`                      | [0,1] cuánto merece la pena estar hoy en la fuga (v39): 0 llana pura, 1 etapa que la fuga puede ganar. Datos citados: Tour 2025 e12 52 corredores, Vuelta 2025 e12 53, «en LLANO, cuatro»; «2 % de las llanas contra más del 40 % de las de montaña» | l. 1499: `clamp(4·kmSubida/totalKm + 0.35·[final en alto], 0, 1)` (`breakAppealClimbWeight`, `breakAppealUphillBonus`). Propiedad del DÍA |
| `gcTerrain`                        | ¿se juega la general en este terreno? (v52). Cita: «solo en montaña y media montaña»                                                                                                                                                                 | l. 1511: `kmSubida/totalKm >= gcTerrainClimbShare (0.05)`                                                                                 |

Lo que el contexto NO lleva: ningún dato de equipos, ninguna lista de quién va en la fuga ni en el pelotón, ninguna ventaja actual, ningún dato del grupo de delante (para el puente sólo se sabe que existe), nada del viento/abanico.

---

## 3. `attackAppetite` — factor a factor (tactics.ts l. 345-476)

Ganas de atacar AHORA. Orden exacto de aplicación:

1. **Vetos duros → 0**:
   - `matches <= 0` (l. 350).
   - `energyFraction < tacticMinEnergyFraction` (0.25) (l. 351).
   - `gastado` (l. 353, v42).
   - Sólo para `fuga`/`contraataque`: `spr >= breakawaySkipSprThreshold` (70) o `energyFraction < breakawaySkipEnergyFraction` (0.40) (l. 357-360, SPEC 6.10).
2. **Base = ROLE_APPETITE[role] × MENTALITY_APPETITE[mentality]** (l. 361).
   - Rol (l. 231-239): cazaetapas 1.0, libre 0.45, lider 0.3, gregario 0.2, lanzador 0.12, marcador 0.1, sprinter 0.05.
   - Mentalidad (l. 255-260): supercombativo 1.6, combativo 1.25, oportunista 0.8, reservon 0.3.
3. **triggerKm (v58)** (l. 375-378): si el jugador marcó km y `ctx.km` existe: `|km − triggerKm| <= triggerWindowKm (2)` → ×`triggerAppetiteBoost` (3); fuera → ×`triggerAppetiteOutside` (0.15). «No es un permiso, es una CITA»; «no es un veto absoluto… el motor nunca obliga a nadie a atacar».
4. **teamAttack** (l. 382): `a *= r.teamAttack`. «Multiplica, no decide».
5. **Frescura** (l. 384): `a *= clamp(energyFraction,0,1)`.
6. **pulling** (l. 387): `a *= tacticPullingAppetite` (0.1). «Es un factor y no un veto… una de cada diez, no la mitad».
7. **Por tipo de movimiento**:
   - `ataque_grupo` (l. 388-392): `a *= 1 + tacticWorstFinisherWeight(1.5)·(1 − finishRank)` → el peor rematador tiene 2,5× las ganas del mejor.
   - `ataque_final` (l. 393-434), cita del dueño: «si es un final en llano no haría sentido que un escalador ataque al final ahí»:
     - **en subida** (`onClimb`): `a *= tacticStrongFloor(0.2) + 0.8·perfilRank` (atacan los fuertes); y si `hasGcContext` y `gcDeficitSeconds <= gcThreatFraction·gcControlLeash` (0.6·700 = 420 s): `a *= 1 + 0.8·(1 − gcDefendShare) + 0.35·gcChallengeShare`. Nota: «NO SE CONVIERTE EN CASTIGO: al líder que defiende se le quita un bonus que estaba mal… El freno ya lo tiene y es el suyo —`autoOrders` le pone `reservon`—».
     - **en llano**: igual que `ataque_grupo` (peor rematador) y SIN extra de general.
   - **Resto de kinds, si `gcTerrain && hasGcContext && déficit <= 420 s`** (l. 435-474, v52): `a *= (1 − 0.7·gcDefendShare)·(1 + 0.6·gcChallengeShare)`. Cita: «no tiene sentido que un líder haga eso [atacar una y otra vez]; otra cosa es que los que van segundo, tercero o cuarto lo hagan, porque ellos quieren luchar por la carrera… y curiosamente no veo que lo hagan». Dato: «maillot 0,44 · 2.º-5.º 0,44 · 6.º-20.º 0,31 · el resto 0,21» ataques por corredor y etapa. Deliberadamente NO se copia el +0,8 del desenlace: «aplicado en el km 20 mandaría a los favoritos a la fuga del día».

Factores que **NO entran** en el apetito: `tension` (sólo entra en λ y en cooperación), `kmToGo` (sólo en λ), `groupSize` (sólo en λ y follow), `onClimb` fuera de `ataque_final`, `breakAppeal` (sólo en follow y en la cuerda), compañeros de equipo presentes o ausentes.

### Auxiliares de la general (v46)

- `gcDefence(riders)` (l. 286-303): defensor = el de déficit 0 (el líder de la CARRERA, «no el mejor de este grupo»); colchón = menor déficit >0 entre los presentes (∞ si no hay rival). Devuelve `null` si el líder no va en el grupo o si hay empate a 0 («la diferencia entre “defiende con 0 s de ventaja” y “aquí no hay nada que defender”»).
- `gcDefendShare(r, ctx)` (l. 313-316): sólo para el defensor: `clamp(cushion/gcDefendCushionS(60), 0, 1)`.
- `gcChallengeShare(r, ctx)` (l. 333-336): para todos los que NO son el defensor cuando hay defensor: mismo `cushion/60`. Doctrina: «si el líder se sienta, son sus rivales los que tienen que moverle». Medido: quitar el ataque al líder bajó la cola de la reina «de 17,65 % a 13,75 %», y esta mitad la devuelve «por la razón correcta».

### `chooseInstigator` (l. 487-509)

Sorteo proporcional al apetito sobre el pool completo (`rankOf` sobre finishScore y perfil del pool). Null si el total es 0.

---

## 4. Cómo se forma un movimiento y quién se suma (simulate.ts l. 4453-4795)

### 4.1 Cuándo y de qué tipo

- **Un intento por bloque desde el pelotón** (l. 4735-4756): el `kind` lo decide la fase: `finalPhase = (onClimb && raceThisClimb) || kmToGo <= lateAttackKm(12)` → `ataque_final`; si no hay fuga del día → `fuga`; si la hay y el grupo de cabeza está a [30,150] s (`bridgeGapMin/MaxSeconds`) → `puente` (target = ese grupo); si no → `contraataque`. Nadie salta mientras el pelotón está cerrando un movimiento sin cuerda (`closingNow`), salvo que ya haya fuga del día.
- **Desde cada grupo escapado** (l. 4759-4784): si tiene ≥ `tacticInsideAttackMinRiders` (3) y hay otro movimiento delante a tiro → `puente`; si no, `ataque_grupo` sólo si `kmToGo <= tacticInsideAttackKm (18)` **o** `tension >= breakawayTensionThreshold (25)`. «En mitad de la etapa se colabora para que la fuga viva».
- Guardas de `attemptFrom` (l. 4454-4459): `kmToGo <= tacticNoAttackKm (3)` no; `moves.length >= tacticMaxMoves (3)` no; enfriamiento `tacticAttemptCooldownKm` (4.5 km) por grupo; grupo de <2 no.

### 4.2 λ del intento — `moveLambda` (tactics.ts l. 196-221)

`base × cohesion × proximity × tense × settle`:

- `base` por kind: fuga 1.2/km, contraataque 0.02, puente 0.08, ataque_grupo 0.1, ataque_final 0.5; dentro de `lateAttackKm` (12) los kinds internos suben a `max(base, lambdaLateAttack=0.5)`.
- `cohesion = clamp(groupSize/fieldSize, 0.35, 1)`.
- `proximity = 1 + 1.5·run²` (run = fracción recorrida).
- `tense = 3` si `tension >= 25`, si no 1.
- `settle = clamp(kmRun/5, 0, 1)` (v33): «siempre se intenta una fuga en el primer km, lo cual está mal» → medido «69,5 % de las etapas atacando antes del km 1».
- `rollMoveAttempt`: `p = 1 − e^{−λ·dx}` (SPEC 6.8).

### 4.3 Quién salta — `followProbability` (tactics.ts l. 518-566)

Para cada miembro del pool distinto del instigador:

- Vetos → 0: misma energía mínima, `gastado`, sin cerillos.
- `p = KIND_FOLLOW[kind] × crowd × (0.04 + 0.22·tac/100 + 0.3·ROLE_APPETITE + 0.15·(MENTALITY−1) + 0.3·(energy−1) + stake)`, clamp [0, 0.85].
- `KIND_FOLLOW`: fuga 1, contraataque 0.7, puente 0.35 («un puente lo saltan uno o dos»), ataque_grupo 1, ataque_final 1.
- `stake` (sólo `ataque_final`, con general y déficit ≤ 420 s): `0.45·(1 + 0.6·gcDefendShare)` → el maillot con colchón salta con 0,72 contra 0,45 del perseguidor; «el líder deja de moverse y pasa a MARCAR». Techo: «el que defiende salta con 0,847 contra un tope de 0,85: cabe justo».
- `crowd`: umbral `bigGroupThreshold(25)·(1 + 9·breakAppeal)` (sólo fuga/contraataque llevan apetito) y `crowd = umbral/groupSize` si el grupo es mayor. En montaña pura el umbral pasa a 250 → «salta todo el que puede».
- **Marcaje previo** (simulate l. 4503-4526): si `r` tiene orden de marcar al instigador, en vez del dado de atención: `wheelProbability(tac_r, tac_inst, marksAlso)`; si está en la rueda, `resolveMarking(markingMargin(perfil_r, perfil_inst))` → `stuck` salta, `gives` suma `markLossS` y se queda, `dropped` se queda.
- `sustainsJump` (tactics l. 574-580): `margin = perfil_r − perfil_inst + markDraftTolerance(4)`; ≥0 sostiene; si no, `p = clamp(1 + margin/6, 0, 1)` («a −6 puntos ya casi nadie aguanta la rueda»).
- **Dilución** (simulate l. 4562-4571): si `party > members·tacticFollowFractionMax (0.5)` → `attack_swarm`, no nace grupo.

### 4.4 El boquete — `jumpGapSeconds` (tactics l. 612-628; simulate l. 4584-4640)

Calculado, no sorteado (v39). Citas del dueño: «Si hay un grupo de 5, ataca 1 y todos los otros 4 saltan detrás de él, pues no se abre ningún boquete instantáneo, ¿no? O si están subiendo superfuerte un puerto e intenta atacar alguien pero su velocidad de ataque es menor que la del que va tirando del grupo, pues tampoco.» / «Un ataque en montaña de un escalador probablemente puede hacer más de 12 segundos en 100 metros, y otro que no sea escalador quizás no consiga ni escaparse.» / «en vez de durar un número de metros debería durar un número de segundos».

- `surgeKm = vGrupo·45 s`; `gap = surgeKm·(1/vGrupo − 1/vAtaque)·3600`, nunca negativo.
- `vGrupo` = velocidad de LOS QUE SE QUEDAN (`quedan`) con su rotación; `vAtaque` = `targetSpeed(perfil_inst + matchBonus(10) + tacticSurgeBonus(12), compromiso 1, misma exposición que el grupo)` — «en el salto no paga todavía el peaje de ir solo».
- Si `gap < tacticJumpMinGapSeconds (2)` → no nace grupo, pero el cerillo y `tacticAttackCost` (1.8) se gastan.

### 4.5 Nacimiento del grupo (simulate l. 4641-4720)

- `coop = moveCooperation(party.length, meanRank, source.tension, rngBreak)`; grupo `mov-N` con `tS = source.tS − gap`, `compromiso = coop` (o `tacticBridgeCommit`=0.92 si puente, durante `tacticBridgeKm`=8 km).
- Coste: instigador 1.8, seguidores 0.9 (`tacticFollowCostFactor` 0.5); todos −1 cerillo y `matchBoostS = 120 s`.
- `allowed = source.id !== PELOTON || pelotonAllows(...)`: «Los ataques que salen de un grupo YA escapado no pasan por esa aduana».

### 4.6 La cuerda — `pelotonAllows` (tactics l. 758-820)

`p = 0.3 + 0.5·run`; × rampa de arranque `0.15 + 0.85·clamp(kmRun/settle)` con `settle = 6 km + (100 − 6)·breakAppeal` (v39; cita: «yo veo que en el 99 % de los casos en el km 1 ataca alguien, lo cual no tiene mucho sentido»; medido «attack_go en el km 1,2 · 1,6 · 1,8 y breakaway_formed en el mismo kilómetro»); − `0.05·(1 − breakAppeal)·max(0, size − 3)`; si hay general: × `1 − 0.75·clamp(1 − closest/420)` (rampa v32, «el motor no distinguía al líder de la general de un rival a cuatro minutos»); **veto** si `kind ∈ {fuga, contraataque, puente}` y `carriesGcLeader` (déficit ≤ 0). «Y EL MAILLOT ES VETO, NO DESCUENTO» — caso: «Race Sardegna e2, 136 km llanos, el maillot escalador en la fuga ganando al sprint una etapa de velocistas». El dado se tira SIEMPRE (flujo `rngTactics` compartido). Tope `tacticAllowMax` 0.7.

- El veto se repite en la corona de fuga del día (simulate l. 5594-5610): un movimiento sin cuerda puede prosperar (`tacticBreakGapSeconds` 45 s, dentro de `tacticBreakWindowFraction` 0.55) y «17 de 17 casos que se colaban eran movimientos SIN cuerda coronados igualmente».

### 4.7 Puentes

- Sólo del pelotón al grupo de cabeza o de un movimiento al movimiento inmediatamente delante, con hueco en [30,150] s. Se saltan 1-2 (`KIND_FOLLOW` 0.35), a 0.92 durante 8 km («con 8 km a 0,92 se cierran ~80 s… uno a dos minutos se queda a medias — que es la regla 7»). No hay puente desde grupetos ni «vuelta atrás» a esperar a nadie (eso lo hace otra mecánica, v36 «los suyos se dejan caer a por él»).

---

## 5. Tensión de la fuga y ataques internos

- `Group.tension` (group.ts l. 22-28): se acumula `breakawayTensionPerKm (0.4)·dx` por bloque en cada movimiento (simulate l. 4931) → umbral 25 se cruza a los ~62 km de fuga. Al fusionar grupos se promedia (`mergeGroups`, l. 127).
- Efectos: en `moveLambda` ×3 (`breakawayTensionAttackFactor`); en `moveCooperation` ×0.7 (`breakawayTensionCoopFactor`); en simulate, abre la puerta a `ataque_grupo` antes de los 18 km finales.
- Ataques internos: `ataque_grupo` favorece al PEOR rematador del grupo (`finishRank`), sin ninguna consideración de equipo ni de quién ha tirado más. Mínimo 3 corredores.
- Historia: «`Group.tension` existía, se calculaba, se promediaba al fusionar grupos y NADIE la leía» (constants.ts l. 2503-2507).

---

## 6. Cooperación dentro de la fuga: quién releva

Dos capas:

**(a) Al nacer — `moveCooperation` (tactics l. 635-652)**: `base ∈ [0.58, 0.72]` aleatorio (`breakawayCommitMin/Max`, «la perilla más sensible del llano») − `0.02·max(0, size−3)` + `0.08·(1 − meanFinishRank)` (hambre: los peores rematadores «se dejan la vida por llegar»), × 0.7 si tensa; clamp [0.35, 0.8]. Es el `compromiso` inicial del grupo y se guarda como `restCommit`.

**(b) Cada km — `noChanceToWin` (tactics l. 685-700) + `interésPropio` (simulate l. 2975-2995) + revisión (simulate l. 4801-4809)**: cita del dueño: «en un grupo de seis a ocho kilómetros de meta relevan los seis, incluido el que sabe que pierde el sprint… si es una etapa de montaña y en la fuga van con un súper escalador y tú eres mal escalador, lo normal es que no cooperes» y «si hay 1 wey que no pasa a cooperar en la escapada, los otros quizás quieran desgastarse menos… para que ese wey que va ahí sin gastar energía se la lleve».

- `noChanceToWin = desventaja × cerca`, con `desventaja = clamp((best − mine)/12)` y `cerca = 0.25 + 0.75·(1 − lejos)`, `lejos` lineal entre 15 y 80 km a meta.
- Se escala por `selección = 1 − groupSize/racingNow` (un grupo que es toda la carrera no lo aplica).
- `compromiso += (restCommit·(1 − 0.6·media_desertores) − compromiso)·0.4` cada 20 bloques (`coopReviewBlocks`, `coopContagionWeight`, `commitHysteresis`).

**(c) Quién entra al turno — `relayTurn` (simulate l. 578-…)**, llamado en l. 3086 con, para un grupo que NO es el pelotón: `driveOfRider → 0` («EL EMPUJE DE EQUIPO MANDA EN EL PELOTÓN, NO EN LA FUGA (v38)… dentro de una fuga se relevan todos»); `sittingOn` = es del equipo que lleva el frente del pelotón (v33: «hay un equipo que tiene a 1 ciclista tirando del pelotón pero tiene a 1 ciclista tirando de la fuga… eso es sabotearse a su trabajo» → «el escapado de ese equipo no debería entrar a los relevos»), o su jefe está en apuros, o (grupo de caza) tiene compañero delante por ≥12 s (v41); `sinOpciones` = `noChanceToWin` ponderado por `paraMí = 1 − drive` (=1 en fuga); `relayRaceLeaderPenalty` al `gcRank === 1` (v57: «otra vez el maillot amarillo tirando… es un grupo de 20 del que solo tiran 10»). Listón `relayDutyThresholdLoose = 0`, tope `relayRotationMax` (20): «más de 20 pasando a los relevos es irreal».

**Conclusión sobre equipo dentro de la fuga**: la única noción de equipo dentro de una fuga es NEGATIVA y viene de fuera (no relevar si los tuyos persiguen / si tienes un compañero delante). No existe «dos del mismo equipo en la fuga se coordinan», ni «uno tira para el otro», ni «el equipo de X se guarda al mejor rematador». `tactics.ts` no tiene `teamId`; `relayTurn` sólo lo mira vía `teamOf` de simulate.

---

## 7. Marcaje entre favoritos — `marcaje.ts` (45 l.)

Qué es: «capa 4 de las órdenes (SPEC 6.18). El marcador intenta vivir en la rueda del rival; cuando el objetivo ataca, la respuesta es automática y quema un cerillo». Anotado como «la capa “recortable” del motor… su integración plena en la carrera llega cuando el balance de marcaje (invariante 6.17) entre en juego».

Tres funciones puras:

- `wheelProbability(tacMarker, tacTarget, extraMarkers)` = `clamp(0.6 + (TAC_m − TAC_t)/80 − 0.1·extra, 0.15, 0.9)`. Base subida de 0,35 a 0,60 en v39 por cita: «si un ciclista está marcando a otro, debería intentar salir detrás de él» (medido: el marcador seguía el 22 % de los ataques contra el 4 % de uno sin órdenes).
- `markingMargin(effM, effT)` = `effM − effT + 4` (rebufo).
- `resolveMarking(margin)`: ≥0 `stuck`; [−6,0) `gives` 1.2·|m| s; < −6 `dropped`.

A quién marca / entradas: la relación viene de `orders.role === 'marcador'` + `orders.targetRiderId` (simulate l. 1138-1170, `markTargetOf`). **Un marcador marca a UN solo objetivo fijo** puesto por las órdenes (en producción `autoOrders`). No hay marcaje emergente entre favoritos de la general: `gcDefendShare` en `followProbability` es lo que hace que el maillot «pase a marcar», pero es una probabilidad de seguir cualquier ataque, no un marcaje a un rival concreto.

Dónde se aplica: (1) respuesta al ataque (simulate l. 4503-4526, ver §4.3), sólo si el instigador es su objetivo y ambos van en el mismo grupo; (2) selección/descuelgue (`comesOff`, l. 3724-3740) y ritmo (`markedPerfil`, l. 3679-3692): el marcador rueda al perfil de su objetivo si `stuck`, a `own + 4` si `gives`. En ambos casos «su objetivo tiene que ir AQUÍ, en su mismo grupo y ahora mismo».

Lo que el marcaje NO ve: `teamId` (0 apariciones), general, si el objetivo va acompañado, más de un objetivo.

---

## 8. Persecución — `chase.ts` (129 l.) y el controlador del pelotón

### 8.1 `chaseField(riders)` → `{trains, force}` (l. 54-97)

- «Hasta la v9 el pelotón perseguía o no según un interruptor global: bastaba UN corredor con SPR ≥ 70».
- `isFinisher`: rol `sprinter` o `eff0.SPR >= 70`. Contendiente real: `bestSpr − SPR <= chaseContenderMaxGap (12)`.
- Ayudantes por tren: lanzadores/gregarios con `targetRiderId` → cuentan para ese; **sin objetivo, el mejor rematador de SU EQUIPO** (`teamId`, v15; grep: chase.ts es el ÚNICO de los cuatro ficheros con `teamId`, l. 67-83).
- `chaseForce(trains)` (l. 106-119): `quality = clamp((spr − 60)/25)`, `units += quality·(1 + 0.15·min(helpers, 3))`, `force = clamp(units/2.5)`.
- Salida: escalar [0,1] «con la fuerza que el campo PUEDE dar». Sólo una foto de SALIDA (eff0); no cambia con energía, con abandonos ni con quién se ha descolgado.

### 8.2 Cómo se usa (simulate.ts)

- `chasingSprinters = bunchFinish && force >= chaseMinForce (0.12)` (l. 1541).
- `chaseGear(force)` (l. 1547-1556): `leash = 300·(1 + 0.6·(1 − force))` (`chaseMaxLeashSeconds`, `chaseWeakLeashGain`), `commitCap = lerp(0.78, 1, force)`, `finalDrive = lerp(0.72, 0.85, force)`, `feasible = 3 s/km · lerp(0.6, 1, force)`.
- **Recalculado en cada decisión del pelotón** (l. 1990-2029): `avail` = fracción de presupuesto de los equipos con intent `perseguir`/`lanzar` ponderada por hombres en el pelotón; **el equipo con hombre en la fuga del día no tira** (v38; cita: «el pelotón se despista, deja hacer a una escapada —especialmente si los equipos de los sprinters tienen a alguien metido en la fuga y entonces no van a tirar— y la escapada se va a 15 o 20 minutos»): `trenesQueTiran` filtra por `teamOf`, `gear = chaseGear(fuerza·lerp(0.5, 1, avail))` (`teamChaseTiredForce`).
- **Lazo cerrado** (l. 2740-2768): con sprinters cazando, `target = min(commitCap, max(0.1, 0.62 + 0.016·err))` (`chaseHoldCommit`, `chaseGain`), `err = gap − leash`; se rinde (`sprinters_give_up`) si el frente es fuga del día, `gap >= 10 s` y `cierreNecesario > feasible`.
- **`gcLeash()`** (l. 1682-1690): `min(gcControlLeash (700), 0.6·worstDeficit_del_grupo_de_cabeza)`; sin general o sin frente → 700. Se usa cuando NO hay caza de sprinters: en llano `target = 0.62 + 0.016·(gap − gcLeash)`, en subida `freeRunTarget` («los favoritos atacan a tope y la subida decide»). Historia de `gcControlLeash`: 265 → 342 → 350 → 520 → 700 (v38): «recalibremos la capa táctica para que la fuga en una etapa de montaña gane en más casos»; «los de la general tiran para que no se vaya a 20 minutos, no para cazarla».
- Después: humor del día y dosificación (no en el puerto que decide), suelos de `finalDrive`, pavé y viento.

### 8.3 Quién lo lleva

El compromiso es DEL GRUPO (`Group.compromiso`, escalar único). Quién paga el viento lo decide `relayTurn` con `driveOfRider` (empuje del plan de equipo, `teamDriveNow`) y `frontTeamId` (un solo equipo lleva el frente, con histéresis). `chase.ts` no sabe quién tira; sólo cuánto puede el campo.

### 8.4 Lo que la persecución NO ve

- La fuerza se calcula sobre **SPR y roles de salida**: un tren cuyo sprinter se ha descolgado o abandonado sigue contando (sólo se descuenta el equipo con hombre en la fuga del día, no en otros movimientos).
- No hay persecución por parte de equipos de la general en llano más allá del `gcLeash` (un solo escalar); no se modela «el equipo del segundo tira porque el líder va delante» salvo vía `teamStance` (fuera de la parcela).
- La amenaza se mide por el MÁS cercano al maillot en el grupo de cabeza; el resto de movimientos no cuentan para la cuerda.

---

## 9. `group.ts` — `mainGroupId` e histéresis (227 l.)

- `Group` (l. 11-29): `id, riderIds, tS, vActual, compromiso, coop, tension`. Sin `teamId` (grep: 0).
- `createGroup`, `percentile75`, `advanceGroup` (v38: `pullers` = entre cuántos se reparte el viento; v39: máximo con `sprintKmh`), `gapSeconds`, `isCapture` (≤ `captureGapSeconds` 5 s), `mergeGroups` (hereda reloj y velocidad del de delante; `compromiso = max`; `coop` y `tension` promedio).
- **`mainGroupId(groups, current, takeover)`** (l. 176-188, v29): «el pelotón es el grupo que lleva la gente». El mayor (desempate por id) sólo quita el título si `biggest.size >= held.size·takeover` (`mainGroupTakeoverRatio` 1.25); si el actual ya no existe, manda el tamaño. Motivo: «Un “pelotón” de DOS corredores con cien detrás llamados “grupeto”» (Race Andalucía e1) y «tres parches sucesivos —v17 (`majorityOnTheRoad`), v25 (`gapChaseMainFraction`) y v27 (`chaseReferenceIndex`)— que son tres aproximaciones al mismo hecho».
- **`chaseReferenceIndex(behind, mainFraction)`** (l. 217-227): contra quién se mide la ventaja: candidatos = los que siguen en carrera (van delante del pelotón o son el pelotón) con ≥2; el PRIMERO en orden de carretera con `size >= biggest·0.5` (`gapChaseMainFraction`). Casos: «un puente en solitario en tierra de nadie se convertía en “la caza”» (v25); «la ventaja se midió trece kilómetros contra un grupeto a casi siete minutos» (v27).
- `mainId` se usa en simulate para `esPeloton` (bandera `pulling`), `isBunch` en `relayTurn` (listón alto y equipo al frente sólo en el pelotón), y el tren del último km.

---

## 10. Evidencia sobre la noción de equipo (grep `teamId`)

| Fichero      | `teamId` | `team*`                     | Nota                                                                                       |
| ------------ | -------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| `tactics.ts` | **0**    | 2 (`teamAttack` l. 69, 382) | Sólo el escalar precalculado; ni compañeros, ni equipo del instigador, ni del que salta    |
| `marcaje.ts` | **0**    | 0                           | Puro TAC/perfil                                                                            |
| `chase.ts`   | 3        | 8                           | Único con equipos: agrupa ayudantes sin objetivo con el mejor rematador de su equipo (v15) |
| `group.ts`   | **0**    | 0                           | Grupos sin composición por equipo                                                          |

Consecuencias directas: en `followProbability` un gregario NO salta más a la rueda de su jefe ni menos a la de un rival; en `chooseInstigator` dos compañeros pueden atacar en el mismo movimiento o uno contra otro; `moveCooperation` no sabe si en la fuga van dos del mismo equipo; `pelotonAllows` no sabe qué equipos están representados en la fuga (sólo el déficit de general); el marcador no sabe si su objetivo lleva compañeros.

---

## 11. Deuda reconocida en los comentarios (límites anotados, «no se ha hecho», «se probó y se refutó»)

1. **Marcaje «capa recortable»** (marcaje.ts l. 4-5): «su integración plena en la carrera llega cuando el balance de marcaje (invariante 6.17) entre en juego». Sigue sin balance: un marcador marca a uno, fijo.
2. **`pelotonAllows` no cierra el agujero: un movimiento sin cuerda puede prosperar** (simulate l. 5595-5597: «el agujero que documenta §13, por el que un intento que nadie autorizó acaba siendo la fuga del día»). Se parcheó sólo para el maillot (v32) con el doble veto.
3. **`pulling` sólo del pelotón, medido y descartado para todos los grupos** (tactics l. 78-82): aplicarlo a fugas y grupos de cabeza «hundía la brecha 1.º-10.º de la reina de 81 s a 59,5».
4. **`tacticFollowDefendGain` está al techo** (constants l. 2617-2632): el maillot salta con 0,847 contra un `tacticFollowMax` de 0,85, «subirlo no hace nada… explica por qué este número vale para el maillot y no para cualquiera».
5. **`ataque_final` no copia su bonus al resto de la etapa a propósito** (tactics l. 461-465): «aplicado en el km 20 mandaría a los favoritos a la fuga del día».
6. **`gcTerrain` sale de km de subida, no de `stage.kind`** (simulate l. 1508-1511): «`stage.kind`, que el motor ni siquiera recibe».
7. **Se probó que el grupo de rescate rodara al ritmo del jefe y NO se ha hecho** (simulate l. 3020-3040): «rompe justo lo que viene a arreglar»: con tope el jefe volvía 66 % contra 70 %; sin tope 81 % contra 63 %.
8. **`tacticGcChallengeWeight` es «probable, no seguro»** (constants l. 2585-2599): +0,89 en la mediana con sd 0,39 «~2,3 sigma».
9. **`chaseField` es una foto de salida** (chase.ts l. 17-20): «Lo que de esa fuerza queda disponible… lo decide el presupuesto de esfuerzo de los equipos» — pero la lista de trenes no se revisa por descuelgues/abandonos, sólo por equipo en la fuga del día.
10. **`relayTurn` en fuga: «una verdad a medias»** (simulate l. 640-655, v57): «“En una fuga colabora todo el mundo” vale para los que van a ganar algo yendo deprisa» — resuelto sólo para el `gcRank === 1`.
11. **La v29 dejó deuda que la v33 pagó** («¿ES ESTE GRUPO EL PELOTÓN? Por la GENTE que lleva y no por el id con el que nació (v33, la deuda que dejó escrita la v29)») — recogido como ejemplo de cómo se anota deuda: el grupo de treinta que decide una media montaña «lleva el id del pelotón aunque hace rato que no lo es» sigue apareciendo como matiz en `interésPropio` y `relayTurn`.
12. **Constantes retiradas y conservadas** (constants l. 2495-2502): `breakawaySizeRange`, `breakawayScoreTac/Lla/Rng` = el «casting fijo» de la fuga anterior a v9, «se conservan como referencia del modelo anterior».
13. **`bigGroupThreshold` vs sprint**: «Ojo: el sprint masivo NO usa este umbral, usa `bunchSprintMinRiders`» (constants l. 3606-3608).
14. **`tacticReeledNarrateKm` retirada en v25** (constants l. 2735-2740): 184 ataques con frase de salida y sin desenlace.

---

## 12. Constantes de la parcela (valor actual, línea en constants.ts)

**λ e intento**: `lambdaBreakawayAttack` 1.2 (2073) · `lambdaCounterAttack` 0.02 (2076) · `lambdaBridge` 0.08 (2079) · `lambdaClimbAttack` 0.1 (2086) · `lambdaLateAttack` 0.5 (3601) · `lateAttackKm` 12 (3605) · `tacticCohesionFloor` 0.35 (2524) · `tacticSettleKm` 5 (2535) · `tacticProximityGain` 1.5 (2538) · `dx` 0.1 (1207) · `tacticNoAttackKm` 3 · `tacticMinAttackKm` 1 · `tacticAttemptCooldownKm` 4.5 (2719) · `tacticMaxMoves` 3 (2747) · `tacticInsideAttackKm` 18 (2722) · `tacticInsideAttackMinRiders` 3 (2724) · `bridgeGapMinSeconds` 30 · `bridgeGapMaxSeconds` 150.

**Apetito**: `tacticMinEnergyFraction` 0.25 (2540) · `breakawaySkipSprThreshold` 70 (2505) · `breakawaySkipEnergyFraction` 0.4 (2507) · `triggerWindowKm` 2 / `triggerAppetiteBoost` 3 / `triggerAppetiteOutside` 0.15 (1860-1862) · `teamAttackUpTheRoad` 0.4 / `Chasing` 0.7 / `Defending` 0.85 / `Free` 1.4 (2466-2469) · `tacticPullingAppetite` 0.1 (3201) · `tacticSpentMinKm` 15 / `tacticSpentShare` 0.5 · `tacticWorstFinisherWeight` 1.5 (2543) · `tacticStrongFloor` 0.2 (2546) · `tacticGcStakeWeight` 0.8 (2548) · `tacticGcChallengeWeight` 0.35 (2600) · `gcDefendCushionS` 60 (2562) · `gcEarlyDefendDamp` 0.7 / `gcEarlyChallengeGain` 0.6 (3669-3670) · `gcThreatFraction` 0.6 (2935) · `gcControlLeash` 700 (2485) · `gcTerrainClimbShare` 0.05 (3644).

**Seguir / sostener**: `tacticFollowBase` 0.04 · `TacWeight` 0.22 · `RoleWeight` 0.3 · `MentalityWeight` 0.15 · `EnergyWeight` 0.3 · `GcWeight` 0.45 (2604-2611) · `tacticFollowDefendGain` 0.6 (2633) · `tacticFollowMin` 0 / `Max` 0.85 (2634-2635) · `tacticFollowFractionMax` 0.5 · `bigGroupThreshold` 25 (3609) · `breakAppealCrowdGain` 9 (3616) · `breakAppealClimbWeight` 4 / `UphillBonus` 0.35 (3671-3672) · `markDraftTolerance` 4 / `markDropMargin` −6 (3833-3834).

**Salto y coste**: `tacticSurgeSeconds` 45 (2657) · `tacticSurgeBonus` 12 · `tacticJumpMinGapSeconds` 2 · `matchBonus` 10 · `matchBoostSeconds` 120 · `tacticAttackCost` 1.8 · `tacticFollowCostFactor` 0.5 (2716) · `tacticBridgeCommit` 0.92 (2756) · `tacticBridgeKm` 8.

**Cooperación**: `breakawayCommitMin` 0.58 / `Max` 0.72 (2303-2304) · `breakawaySizeMin` 3 (2494) · `tacticCoopSizePenalty` 0.02 · `tacticCoopHungerWeight` 0.08 · `tacticCoopMin` 0.35 (2673-2676) · `breakawayTensionPerKm` 0.4 / `Threshold` 25 / `CoopFactor` 0.7 / `AttackFactor` 3 (2513-2516) · `coopNoChanceGap` 12 · `coopSelfishKm` 15 · `coopSelfishFarKm` 80 · `coopSelfishFloor` 0.25 (1818-1821) · `coopReviewBlocks` 20 · `coopContagionWeight` 0.6 · `commitHysteresis` 0.4 · `relayNoChanceWeight` 1 · `relayDutyThresholdLoose` 0 · `relayPaceReference` 8 (1927).

**Cuerda**: `tacticAllowBase` 0.3 (2681) · `tacticAllowSettleFlatKm` 6 / `ClimbKm` 100 / `Floor` 0.15 (2693-2695) · `tacticAllowKmGain` 0.5 · `tacticAllowSizePenalty` 0.05 · `tacticAllowGcPenalty` 0.75 · `tacticAllowMax` 0.7 (2696-2703) · `tacticBreakGapSeconds` 45 · `tacticBreakWindowFraction` 0.55.

**Caza**: `chaseContenderMinSpr` 70 / `MaxGap` 12 (2327-2328) · `chaseQualityFloor` 60 / `Full` 85 · `chaseHelperBonus` 0.15 · `chaseHelpersMax` 3 · `chaseFullUnits` 2.5 (2331-2339) · `chaseMinForce` 0.12 · `chaseWeakLeashGain` 0.6 · `chaseMaxLeashSeconds` 300 · `chaseHoldCommit` 0.62 · `chaseGain` 0.016 · `chaseWeakCommitCap` 0.78 · `chaseWeakFinalDrive` 0.72 · `chaseWeakFeasibleFloor` 0.6 · `chaseFeasibleSecondsPerKm` 3 · `chaseNeverConcedeSeconds` 10 · `chaseCatchTargetKm` 12 · `teamChaseTiredForce` 0.5 · `finalDriveCommit` 0.85.

**Marcaje**: `markWheelBase` 0.6 · `TacScale` 80 · `ExtraPenalty` 0.1 · `Min` 0.15 · `Max` 0.9 (3827-3831) · `markGiveScale` 1.2 (3835).

**Grupos**: `initialSpeed` 35 · `captureGapSeconds` 5 (1304-1305) · `commitIdle` 0.1 (2925) · `mainGroupTakeoverRatio` 1.25 (1497) · `gapChaseMainFraction` 0.5 (1482) · `grupetoJoinGapSeconds` 12.

**Regla 8 (dejarse ir)**: `giveUpKm` 25 · `giveUpEnergyFraction` 0.22 · `lambdaGiveUp` 0.35 (2764-2772) — `giveUpLambda` (tactics l. 841-855) devuelve 0 si `inFrontGroup`, rol lider/sprinter/cazaetapas o mentalidad supercombativo.

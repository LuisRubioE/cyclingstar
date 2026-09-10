# Rediseño del sistema de entrenamiento y de las características de los ciclistas

Propuesta de un fisiólogo del deporte, escrita contra el estado real del código (`ENGINE_VERSION = 52`,
septiembre 2026) tal como lo describen `mapa-entrenamiento-atributos.md`, `mapa-requisitos-duenio.md`
§12-§14 y `mapa-spec.md` §2.1/§2.3, y contra los ficheros `constants.ts` (bloques `CREATION`, `NPC`,
`BANISTER`, `TANK`, `HEALTH`, `LEARNING`, `TRAINING`), `progression.ts`, `banister.ts`, `world/npc.ts`,
`world/learning.ts`, `sim/world.ts`, `shared/rider.ts`, `shared/training.ts`, `db/train.ts`,
`Training.tsx` y `RiderProfile.tsx`.

Lo que el dueño ya ha dictado se respeta como frontera, no como sugerencia: «un ciclista sí mejora
después de los 24, pero mejora en COSAS DIFERENTES»; «de una carrera puedes aprender más que de un
entrenamiento, e incluso variará según el nivel de la carrera»; el entrenador bot «razonable, nunca
óptimo»; «que no acaben todos siendo Pogačar»; bots con cinco estrellas «claramente menos del 15 %»;
el humano «empieza con 18 años… con stats casi a cero, sin equipo»; «no quiero una academia junior de
bots»; «los TECHOS no se tocan: lo que baja es lo que TIENES».

Regla de diseño de toda la propuesta: **el motor de etapa no cambia**. Todo lo que sigue vive AGUAS
ARRIBA de `simulateStage` (génesis, progresión, entrenamiento, aprendizaje, salud, UI) y le entrega el
mismo contrato de siempre: diez `eff0`, un depósito, unos cerillos. Las huellas selladas
(`attribution.test.ts`, `timetrial.test.ts`) salen idénticas porque alimentan `StageRider` a mano.
Los dos únicos cambios que tocarían el motor van en §6 marcados como tanda aparte.

---

## 1. Diagnóstico: qué falla o falta hoy

Con la evidencia del mapa (sección entre paréntesis).

1. **El mundo nace hecho y se desboca por generaciones.** `generateNpcRider` usa la edad solo para el
   techo (§4.2): un continental de 18 es idéntico a uno de 30. Y el techo es RELATIVO al atributo
   (`attr + U(min,max)`, §4.4): un WT joven nace con la media de la división (71) Y con hasta +30 de
   margen encima. Cada relevo generacional entra, pues, más alto que la generación que sustituye. Es la
   causa mecánica de que la media global suba de 55 a 64 en quince temporadas y de que los «cracks»
   pasen del 0,1 % al 22-25 % (§13): no es que se entrene demasiado, es que la distribución de techos
   no es estacionaria. Las perillas que la bitácora propone (ciclo del bot, `raceBase`) frenan el
   síntoma, no la causa.

2. **«Mejora en cosas diferentes» solo vive al nacer.** `ATTRIBUTE_GROWTH` (motor/oficio) lo lee
   únicamente `ceilingBoostRange` (§1); `kAge` en `progression.ts` es el mismo para los diez atributos
   (§6.3), el declive es el mismo para los nueve físicos salvo el ×0,25 de DES/PAV, y TAC nunca decae.
   Fisiológicamente la potencia neuromuscular (sprint, punch) alcanza su techo antes (24-27) y decae
   antes; el motor aeróbico y la durabilidad maduran tarde (27-31); las destrezas crecen toda la
   carrera. Nada de eso está en la curva de crecimiento.

3. **REC no existe en la carretera.** No aparece en ningún fichero del motor de etapa (§1, tabla); solo
   acorta `tauFatigue`. El comentario del catálogo dice que «cuenta cerillas» y es falso. Además decae
   por edad y detraining como cualquier físico y se entrena SOLO con descanso activo (0,25/día).

4. **El entrenamiento no tiene fisiología, tiene aritmética.** `delta = G·kTal·kAg·kDim·kReady·kInt`
   se aplica al atributo el mismo día (§6.3). No hay sobrecompensación (SPEC 5.4 no implementado,
   §15.8): descansar no consolida nada, solo sube el TSB. `kReady` es un escalón (1 → 0,25 en TSB −30):
   a −29 se rinde igual que a 0. La intensidad «fuerte» multiplica ganancia (1,25) y carga (≈+20 %) sin
   ningún coste específico, así que domina siempre que el TSB aguante. `kInst` y `kStaff` valen 1
   (§15.7): tener equipo, instalaciones o entrenador no cambia nada.

5. **El entrenador bot no periodiza.** Ciclo fijo de 14 días indexado por `gameDay % 14` (§10): igual
   en enero que en el Tour, igual la víspera de una carrera que el día después de una gran vuelta, sin
   mirar TSB ni salud. «Razonable, nunca óptimo» no autoriza que un bot llegue a la Vuelta con TSB −40
   porque el ciclo tocaba `fondo fuerte`. Y la web previsualiza el plan SIN vocación mientras el
   servidor lo aplica CON ella, y guarda esa previsualización como órdenes reales (§15.14).

6. **Aprender corriendo es lineal en el margen y ciego a lo demás.** `raceLearning` no lleva talento,
   edad, forma ni lo que hiciste ese día (§9): el que se deja llevar en el autobús aprende lo mismo que
   el que estuvo en la fuga. Solo para finishers. DES no se aprende en ningún terreno (§15.11); REC
   tampoco. TAC sube igual acabando 150.º que ganando.

7. **Salud a medias.** El dado de enfermar solo se tira los días de entrenamiento (§15.16); `molestias`
   existe en el enum, en `mHealth` (0,96) y en la UI pero nadie lo escribe (§15.9); no hay lesión de
   sobrecarga (solo por caída); el gimnasio no protege de nada (SPEC 5.1 decía «reduce fragilidad»).

8. **El humano nace peor equipado que el NPC sin que nadie lo haya decidido.** `ctl 0 / atl 0 / morale
50` por defecto de esquema contra `45/45/60` del NPC (§15.13): tres semanas de detraining y un
   tanque a 0,90 antes de la primera carrera. `BANISTER.initialCtl` está definido y no lo usa nadie.

9. **Cinco vocaciones no dan un pelotón.** No existen el puncheur ni el rodador; el gregario de oficio
   no existe como nivel sino como accidente de la normal; TAC es siempre «resto» para el NPC (§4.1);
   las «correlaciones suaves» del SPEC (SPR~MON −) no están (§5.1), así que salen escaladores con
   sprint de 60 y velocistas que suben a 60. Y la vocación NO toca los techos del NPC (§2.2).

10. **La escala visible no cuenta el progreso.** `attrStars` en bandas de ~17 puntos (§3): un jugador
    puede entrenar tres meses y no ver moverse una estrella. La «flecha de tendencia» y el «informe de
    ojeador con ruido» del SPEC 3.2 no existen, aunque `rider_attr_log` ya guarda los deltas diarios.

11. **El banco de mundo mide poco de lo que importa.** Vigila cracks, medianías, ancho y congelados
    (§13) pero no la estacionariedad entre generaciones, ni la curva de edad por clase de atributo, ni
    que existan perfiles puros, ni que el descanso sirva de algo. Y «congelados = 0 %» está mal
    planteado: un veterano CON el motor en su techo es lo correcto, no una alarma.

---

## 2. Los atributos

### 2.1 Decisión de fondo: se mantienen los diez, cambia lo que hay debajo

Los diez atributos son el CONTRATO con el motor de etapa (`blockPerfil`, `finishWeights`,
`erosionCoef`, `matchCount`, `ttPerfil`, `chase.ts`, `crash.ts`, `autoOrders`, `callups`, el enum de
Postgres y toda la UI). Cambiarlos es rehacer el motor y perder todas las huellas selladas sin ganar
realismo: MON/COL/LLA/SPR/CRI son ya «potencia por duración» leída en el terreno donde se expresa, que
es exactamente cómo un director habla de un corredor. Lo que se rediseña es **cómo se clasifican, cómo
nacen, cómo crecen y qué hace REC**.

### 2.2 Cuatro clases fisiológicas (sustituyen a `ATTRIBUTE_GROWTH` motor/oficio)

Nuevo `ATTRIBUTE_CLASS: Record<Attribute, 'aerobico' | 'neuromuscular' | 'recuperacion' | 'oficio'>`
en `shared/rider.ts`. `ATTRIBUTE_GROWTH` se elimina (su único lector es `ceilingBoostRange`, que
desaparece en §3).

| Atributo           | Qué mide (fisiología)                                                           | Clase         | Dónde lo consume el motor de etapa (sin cambios)                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RES** Endurance  | Durabilidad: cuánto vaciado aguanta antes de degradarse (CP tras kJ acumulados) | aerobico      | `erosion()`: umbral `0.098 + 0.40·RES/100`; `matchCount` 0,30; `ttPerfil` 0,10; remates solitario 0,35, alto 0,15, puncheur 0,12, sprint_reducido 0,10                      |
| **REC** Recovery   | Recuperación ENTRE días y entre esfuerzos: cinética de la fatiga                | recuperacion  | Hoy nada. Propuesto (§6, fuera del motor): `tauFatigue` (ya), umbral de vaciado profundo del cerillo de mañana, probabilidad de enfermar, REC ≥ 5 días en vuelta por etapas |
| **LLA** Flat       | Potencia sostenida en llano (umbral + aerodinámica en grupo)                    | aerobico      | `blockPerfil` llano y mezcla en subida/pavés; cerillos 0,20; `ttPerfil` 0,15; remates                                                                                       |
| **MON** Mountain   | Potencia sostenida en subida larga (W/kg a 20-60 min)                           | aerobico      | `blockPerfil` subida; `ttPerfil` en cuesta; cerillos 0,5·max(MON,COL); remate alto 0,60                                                                                     |
| **COL** Hills      | Potencia 1-5 min y repetibilidad (VO2max, capacidad anaeróbica)                 | neuromuscular | muro (`sample.ts`); cerillos; remate puncheur 0,40, alto 0,20                                                                                                               |
| **CRI** Time trial | Posición aerodinámica, pacing solitario                                         | aerobico      | `ttPerfil` 0,75 (solo crono)                                                                                                                                                |
| **SPR** Sprint     | Potencia pico neuromuscular (5-15 s)                                            | neuromuscular | remates; `sprintHoldMetres`; `chase.ts`; volantes                                                                                                                           |
| **DES** Descending | Destreza y nervio en bajada                                                     | oficio        | `blockPerfil` descenso; `crash.ts`; `shatter`; remate descenso 0,42                                                                                                         |
| **PAV** Cobbles    | Destreza y fuerza en adoquín                                                    | oficio        | `blockPerfil` pavés 0,6; `crash.ts`; `shatter`; remate pave 0,50                                                                                                            |
| **TAC** Tactics    | Colocación, lectura, momento                                                    | oficio        | `placementSd`; `launchTacScale`; `crash.ts` normal; remates; `breakScore`                                                                                                   |

Por qué cuatro y no dos: motor/oficio ya decía la mitad («lo que da el cuerpo» contra «lo que da la
cabeza»). La otra mitad es que el cuerpo no da todo a la vez: el sprint de un corredor está hecho a los
25 y se va a los 32; su fondo se hace a los 28 y aguanta hasta los 35. Sin esa separación no se puede
cumplir «mejora en cosas diferentes» más que el día del nacimiento. REC va sola porque es sobre todo
genética: se entrena poco, se pierde despacio y decide cómo de bien encadenas días, que es otra cosa
que rendir un día.

### 2.3 Rangos y escala visible

- Interno `[1, 99]` sin cambios; techos `[30, 96]`.
- **Propio**: `attrStarsHalf(x) = clamp(round(x/10)/2, 0, 5)` (diez niveles de ~8 puntos, medias
  estrellas, con 0 posible). Un mes de entrenamiento se ve. Al lado, una **flecha de tendencia** de
  `rider_attr_log`: suma de deltas de los últimos 28 días ≥ +1,5 → ↑, ≤ −1,5 → ↓ (la tabla ya existe y
  se purga a 60 días; solo falta leerla).
- **Ajeno**: `attrStars` entero de hoy (bandas de 17) sobre `x + N(0,4)` sembrado por
  `(riderId, semana)`, como pide SPEC 3.2. Una vez por semana, determinista, sin tabla nueva.
- **Forma**: `formStars` sin cambios.

### 2.4 Lo que el jugador NO ve (tabla `rider_hidden`)

| Campo         | Hoy                                                    | Propuesto                                                                                                                       | Para qué                                                    |
| ------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `ceilings`    | relativo al atributo (NPC) / N(58+12·bias, 9) (humano) | **absoluto**, muestreado de la distribución del mundo (§3)                                                                      | estacionariedad; «hasta dónde» separado de «dónde estás»    |
| `talent`      | Beta(2,4.5)·100, solo velocidad de aprendizaje         | igual, y además escala la RESPUESTA a la carga (§5.3)                                                                           | entrenabilidad                                              |
| `fragility`   | LogNormal(0,0.25) ∈ [0,6, 1,8], solo enfermedad        | igual + lesión de sobrecarga + caídas (sigue LÍMITE pasarla al motor)                                                           |                                                             |
| `peakAge`     | U{26..31}                                              | igual; los picos por clase se derivan: neuromuscular `peakAge−2`, aeróbico `peakAge`, recuperación `peakAge−1`                  | curva por clase sin columnas nuevas                         |
| `declineAge`  | peakAge + U{3..6}                                      | igual; por clase: neuromuscular `declineAge−2`, aeróbico y REC `declineAge`, DES/PAV `declineAge+3`, TAC nunca                  |                                                             |
| `pending`     | —                                                      | **nuevo** `jsonb` `Partial<Record<Attribute, number>>`: adaptación ganada y aún no consolidada (§5.3)                           | sobrecompensación                                           |
| `consistency` | —                                                      | **nuevo** `real` σ ∈ [0,005, 0,03] (LogNormal(ln 0,015, 0,4) acotada): ruido diario de `eff0` sembrado por `(riderId, gameDay)` | «el corredor que tiene malos días» (§6). Decisión del dueño |

Y en `riders`: `strain_days integer default 0` (días seguidos con TSB < −35, para `molestias`).

---

## 3. Cómo nace un ciclista

### 3.1 Principio: techo absoluto × madurez, no atributo + margen

Hoy el techo se pone ENCIMA de lo que se tiene. Propuesto: primero se sortea **hasta dónde puede
llegar** (techo, genético, absoluto) y después **cuánto de eso ya ha realizado** a su edad (madurez).
Consecuencias: existen juniors sin academia (un neopro de 19 tiene los techos de su división y el 78 %
realizado); los veteranos están en su techo motor, que es lo real; y la distribución de techos del
mundo es la misma en la temporada 1 que en la 25, porque no depende de lo que nadie haya entrenado.

### 3.2 Arquetipos (sustituyen y amplían `VOCATIONS`)

Siete, en `shared/rider.ts`. Se conservan las cinco claves actuales (sin migrar datos) y se añaden
dos. El «gregario de oficio» NO es un arquetipo: es un NIVEL (§3.3). Un rodador de nivel 60 es un
gregario; uno de nivel 80 es Ganna.

| Clave       | Etiqueta             | Primarios (+1) | Adyacentes (+0,5)  | Contra (−0,6) | Cuota NPC |
| ----------- | -------------------- | -------------- | ------------------ | ------------- | --------- |
| `escalada`  | Climber              | MON, RES       | COL, REC, CRI      | SPR, PAV      | 16 %      |
| `velocidad` | Sprinter             | SPR, LLA       | TAC, COL, REC      | MON, CRI      | 10 %      |
| `puncheur`  | Puncheur (**nuevo**) | COL, RES       | SPR, LLA, MON, DES | CRI           | 12 %      |
| `clasicas`  | Classics rider       | PAV, LLA       | COL, RES, DES, SPR | MON           | 12 %      |
| `crono`     | Time trialist        | CRI, LLA       | RES, MON, REC      | COL, SPR      | 6 %       |
| `rodador`   | Rouleur (**nuevo**)  | LLA, RES       | CRI, REC, PAV, TAC | MON           | 30 %      |
| `fondo`     | All-rounder          | RES, REC       | MON, LLA, CRI, COL | SPR, PAV      | 14 %      |

TAC lleva bias +0,3 para todos (el oficio se puede aprender siempre; nadie nace con techo táctico de
gregario). Las cuotas son las de un pelotón profesional real: casi un tercio son rodadores porque casi
un tercio del pelotón son hombres de llano y de trabajo. `db/world.ts:350` (`pick(VOCATIONS, rng)`)
pasa a un sorteo ponderado `pickWeighted(ARCHETYPE_SHARES, rng)`; el humano elige libremente entre
los siete.

Los «contra» son las correlaciones que el SPEC prometía: un velocista puro nace con techo de MON de
2-3★; un escalador puro con SPR de 2★. No es castigo, es fisiología (fibras, peso).

### 3.3 Nivel, techos y atributos del NPC (`world/npc.ts::generateNpcRider`)

```
L  = clamp( N(NPC.levelMu[division], NPC.levelSd), 40, 92 )            // nivel: el techo del primario
C[a] = clamp( round( L + NPC.spread · (bias(a, arquetipo) − 1) + N(0, NPC.ceilingNoiseSd) ), 30, 96 )
A[a] = clamp( round( C[a] · m(clase(a), edad) · (1 + N(0, 0.04)) ), 20, C[a] )
```

Constantes propuestas (`NPC`): `levelMu = { WT: 72, PRS: 62, CON: 54 }`, `levelSd = 7`, `spread = 12`,
`ceilingNoiseSd = 5`. Se sustituyen `divisionPrimaryMu`, `adjacentDrop`, `restDrop`, `attrSd`,
`ceilingBoost`, `youngAge`, `primeAge`.

Por qué 72/62/54 y no 71/61/53: hoy el 71 es la media del ATRIBUTO a todas las edades; aquí es el
TECHO, y la media del atributo sale ≈ 0,93·72 ≈ 67 promediando edades (§3.5). El WT queda un escalón
más bajo en absoluto y las distancias entre divisiones (10/8) se conservan, que es lo que el dueño
pidió no estrechar. Con `levelSd 7 + ceilingNoiseSd 5` la desviación efectiva del primario es 8,6: las
diferencias, que son lo que selecciona una carrera, no se borran (lección del 75·5,5).

Cinco estrellas: un primario WT necesita `C ≥ 85` (z = 1,5 → 6,7 %) Y estar maduro. Promediando las
edades salen **≈ 7-9 % de WT con algún 5★**, dentro de «claramente menos del 15 %», y además son los
de 26-31, que es donde están en la realidad. `levelMu.WT` es la perilla de G9 («cuando haya humanos
buenos bajaremos eso a 0»).

### 3.4 Edad del NPC

`sampleNpcAge`: Beta(4,4) reescalada a **[19, 38]** (hoy 18). Neopros del rollover `U{19..23}` sin
cambios. Nadie de 18 entre los bots: «no quiero una academia junior de bots»; los 18 son del humano.

### 3.5 Madurez `m(clase, edad)` (tabla `MATURITY`, interpolación lineal, tope en la edad de declive)

| Edad | aerobico | neuromuscular | recuperacion | oficio |
| ---- | -------- | ------------- | ------------ | ------ |
| 18   | 0,74     | 0,80          | 0,92         | 0,50   |
| 19   | 0,78     | 0,84          | 0,94         | 0,55   |
| 20   | 0,82     | 0,88          | 0,95         | 0,60   |
| 21   | 0,85     | 0,91          | 0,96         | 0,65   |
| 22   | 0,88     | 0,94          | 0,98         | 0,69   |
| 23   | 0,91     | 0,96          | 0,99         | 0,73   |
| 24   | 0,93     | 0,98          | 1,00         | 0,77   |
| 25   | 0,95     | 0,99          | 1,00         | 0,80   |
| 26   | 0,97     | 0,99          | 1,00         | 0,83   |
| 27   | 0,98     | 0,99          | 1,00         | 0,86   |
| 28   | 0,99     | 0,99          | 1,00         | 0,88   |
| 30   | 0,99     | 0,99          | 1,00         | 0,92   |
| 32   | 0,99     | 0,99          | 1,00         | 0,95   |
| 34   | 0,99     | 0,99          | 1,00         | 0,97   |
| 36+  | 0,99     | 0,99          | 1,00         | 0,98   |

Después de la edad de declive de la clase (§4.3) se resta `0,035·años` (aeróbico), `0,045·años`
(neuromuscular), `0,015·años` (REC); DES/PAV `0,01·años` desde `declineAge+3`; TAC nunca. Así un NPC
de 35 nace con lo que tendría un corredor real de 35, no con lo de uno de 28.

### 3.6 El humano (`creation.ts::generateRiderGenome`)

Lo dictado se conserva: 18 años, primario N(24,3), adyacente N(19,3), resto N(15,3), TAC U(12,16),
techos `clamp(N(58 + 12·bias, 9), 45, 96)`, don global (argmax < 82 → U(82,90)), talento sin clamp,
fragilidad, `peakAge`, `declineAge`. Cambios:

- **bias «contra» −0,6** también para el humano (techo medio del contra 50,8): quien elige velocista
  no será escalador. Es la única forma de que el jugador tenga que ELEGIR.
- Siete arquetipos para elegir; los dos nuevos con sus perfiles.
- `createRider` fija **`ctl 35, atl 35, morale 60`** (un junior que entrenaba); hoy hereda `0/0/50`.
  Sin detraining de bienvenida; tanque 0,97 en vez de 0,90.
- `consistency` y `pending = {}` en `rider_hidden`.
- La semilla del genoma sigue siendo aleatoria (decisión que no toca esta propuesta).

El humano nace con m ≈ 0,34 de su techo primario: mucho más bajo que un NPC de 18 (0,74). Es lo que el
dueño quiere («un don nadie, pero un ciclista») y `kDim` lo recupera en un año (medido hoy 5 → 55). No
se cambia; §9 lo lista por si el dueño quiere acercarlo.

---

## 4. Cómo crece y decae

### 4.1 `kAge` por clase (sustituye a los cinco tramos únicos de `progression.ts::kAge`)

Sea `x = edad − pico(clase)` con `pico(aerobico) = peakAge`, `pico(neuromuscular) = peakAge − 2`,
`pico(recuperacion) = peakAge − 1`:

| x                    | kAge |
| -------------------- | ---- |
| ≤ −8                 | 1,20 |
| (−8, −4]             | 1,10 |
| (−4, −1]             | 0,95 |
| (−1, +1]             | 0,75 |
| (+1, declive(clase)] | 0,45 |
| > declive(clase)     | 0,25 |

Oficio: TAC `kAge = 1,0` a cualquier edad («Tactics debería mejorar siempre»); DES/PAV `1,0` hasta
los 31, `0,85` hasta los 35, `0,7` después. Para un corredor con `peakAge 28`, a los 20 años el sprint
está en 1,10 y el fondo en 1,20; a los 27 el sprint en 0,75 y el fondo en 0,95; a los 31 el sprint en
0,45, el fondo en 0,75 y la táctica en 1,0. Eso es «mejora en cosas diferentes» todos los días, no
solo al nacer.

### 4.2 `kDim` sin cambios

`kDim = min(1.2, ((techo−attr)/max(10, techo−30))^1.3)`, 0 en el techo. Con techos absolutos, un
veterano tiene 1-2 puntos de margen motor → kDim ≈ 0,05: «se estancan» sin morirse (el hilo 0-2 que
el dueño pidió sale solo de `m = 0,99`).

### 4.3 Declive (`progression.ts`, sustituye a `ageDecayBase/Slope` y `desPavDecayFactor`)

Por clase, a partir de su edad de declive `D_c` (`neuromuscular D−2`, `aerobico D`, `recuperacion D`,
`DES/PAV D+3`, TAC nunca), pérdida diaria:

```
loss = (TRAINING.decayBase[c] + TRAINING.decaySlope[c] · (edad − D_c)) · kMant
decayBase  = { aerobico: 0.010, neuromuscular: 0.014, recuperacion: 0.004, oficio: 0.003 }
decaySlope = { aerobico: 0.003, neuromuscular: 0.004, recuperacion: 0.001, oficio: 0.001 }
kMant = 0.5 si el atributo se ENTRENÓ en los últimos 7 días (de `rider_attr_log` o `trainedToday`), 1 si no
```

Órdenes de magnitud a `D+1`, entrenando: aeróbico −2,4/año, neuromuscular −3,3/año; a `D+4`: −4,0 y
−5,1. Hoy es −8,8/año sin entrenar y −3,5 entrenando para todo por igual: demasiado plano entre clases
y demasiado violento el primer año. Un corredor de 34 debe seguir siendo peligroso en una clásica y
haber perdido el sprint, no perder todo a la vez.

**Detraining** (CTL < 35): −0,03/día solo en `aerobico`, `neuromuscular` y `recuperacion`. El oficio
no se desentrena (hoy DES/PAV sí).

### 4.4 Lo que enseña la carrera contra lo que enseña el entrenamiento

Misma cadena, distinto origen, y todo pasa por la **adaptación pendiente** (§5.3):

```
carrera:  Δ_bruto[a] = LEARNING.raceBase · nivel(raceClass) · peso(terreno, a) · kEsfuerzo · kTal · kAge(c, edad) · kDim(a)
entreno:  Δ_bruto[a] = G(sesión, a) · kInt · kTal · kAge(c, edad) · kDim(a) · kAbsorb · kInst · kStaff · kGroup
```

`LEARNING.raceBase` pasa de 0,5 a **1,0** porque entra `kDim` (≈ 0,3 con 20 puntos de margen) en vez
del `margen/30` lineal (0,67); el neto para un WT a 20 de margen queda en ≈ 0,6/día por atributo, el
orden actual (0,67), y el banco calibra. `nivel` se conserva (WT 2 · Pro 1,5 · .1/NC 1,2 · .2 1,0).

Novedades, todas en `world/learning.ts` + `db/stageRun.ts`:

- **`kEsfuerzo = clamp(workUnits / 30, 0.4, 1.3)`**: el motor ya devuelve `output.workUnits` por
  corredor (TSS = 5·unidades). Quien va a rueda todo el día aprende menos que quien tiró. Es la parte
  de «lo que hiciste» que el SPEC 5.3 quería con `workUnits[dom]`, sin desglose por dominio.
- **Pesos por terreno** (sustituyen a la lista plana `STAGE_LEARNING_ATTRS`):

  | terreno | pesos                                 |
  | ------- | ------------------------------------- |
  | llana   | LLA 1,0 · SPR 0,7                     |
  | media   | MON 0,8 · COL 0,6 · LLA 0,6 · DES 0,5 |
  | reina   | MON 1,0 · RES 0,6 · COL 0,5 · DES 0,5 |
  | cri     | CRI 1,0 · LLA 0,3                     |
  | clasica | COL 0,8 · PAV 0,8 · LLA 0,5 · DES 0,4 |
  | siempre | TAC 1,0                               |

  DES por fin se aprende donde se baja. REC: **+0,3 solo a partir de la 5.ª etapa de una vuelta**
  (`spec.stageIndex ≥ 5`): encadenar días enseña a recuperar; una carrera de un día, no.

- **TAC con resultado**: `+0,15·nivel` extra si `position ≤ 10` o si el corredor estuvo ≥ 50 km en un
  movimiento (`output.breakKm` si el motor lo expone; si no, solo el top-10). Ganar enseña más que
  entrar 150.º, y el dueño lo dijo: «de una carrera puedes aprender más».
- **No finishers**: ×0,5 si abandonó por corte o colapso (corrió 150 km); ×0 si por enfermedad o
  lesión. Hoy: 0.
- Talento y edad pesan también aquí. Hoy no, y era la única cadena del juego que los ignoraba.

### 4.5 Retiro

`shouldRetire` y `HARD_RETIRE_AGE 39` sin cambios; el humano solo por edad dura (dictado). El retiro
por nivel (un NPC que ya no encuentra equipo) es economía (G8) y no va aquí.

---

## 5. El entrenamiento

### 5.1 Catálogo de sesiones (`shared/training.ts::SESSION_CATALOG`)

Trece sesiones (hoy once). Se añaden `vo2max`, `tecnica_bajada`, `paves`; desaparece `bajada_paves`
(migración: órdenes existentes → `tecnica_bajada`). TSS a intensidad normal; la intensidad va en §5.2.

| Sesión            | Etiqueta                              | TSS | Ganancia base G (pts/día)                   | Grupo | Por qué                                                                 |
| ----------------- | ------------------------------------- | --- | ------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `descanso_total`  | Full rest                             | 0   | — · liberación +0,04                        | no    | repara, no enseña                                                       |
| `descanso_activo` | Recovery ride (Z1)                    | 25  | REC 0,20 · liberación +0,04                 | no    | la recuperación se construye rodando suave                              |
| `fondo`           | Endurance (Z2)                        | 90  | RES 0,40 · LLA 0,15 · REC 0,05              | sí    | base aeróbica y durabilidad                                             |
| `umbral`          | Threshold (Z4, 2×20')                 | 105 | LLA 0,30 · CRI 0,15 · MON 0,10 · RES 0,05   | sí    | el umbral sostiene todos los terrenos                                   |
| `puertos`         | Climbing (Z3-Z4 largo)                | 115 | MON 0,40 · RES 0,15 · COL 0,05              | sí    | W/kg sostenido                                                          |
| `vo2max`          | VO2max intervals (Z5, 5×4') **nuevo** | 95  | COL 0,30 · MON 0,15 · CRI 0,05              | sí    | punch y repetibilidad: hoy COL solo se roza con umbral 0,2 y sprint 0,1 |
| `sprint`          | Sprint & lead-out                     | 75  | SPR 0,40 · COL 0,10                         | no    | neuromuscular                                                           |
| `gimnasio`        | Gym & core                            | 50  | SPR 0,15 · COL 0,05 · **protección** (§5.6) | no    | fuerza y prevención                                                     |
| `crono`           | TT position & pacing                  | 80  | CRI 0,40 · LLA 0,05                         | no    |                                                                         |
| `tecnica_bajada`  | Descending skills **nuevo**           | 60  | DES 0,35 · TAC 0,05                         | sí    | la bajada y el adoquín no son la misma destreza                         |
| `paves`           | Cobbles recon **nuevo**               | 75  | PAV 0,35 · LLA 0,10                         | sí    |                                                                         |
| `video_tactica`   | Video & tactics                       | 10  | TAC 0,25                                    | sí    |                                                                         |
| `viaje`           | Travel                                | 15  | — · enfermedad ×1,5 ese día                 | no    | aeropuertos                                                             |

REC se toca ahora desde tres sitios (descanso activo, fondo y las vueltas por etapas) en vez de uno.

### 5.2 Intensidad: cambia lo que cuesta, no solo lo que rinde

| Intensidad | TSS   | G     | Riesgo enfermedad/lesión ese día |
| ---------- | ----- | ----- | -------------------------------- |
| suave      | ×0,75 | ×0,80 | ×0,9                             |
| normal     | ×1,00 | ×1,00 | ×1,0                             |
| fuerte     | ×1,25 | ×1,12 | ×1,3                             |

Hoy `fuerte` da ×1,25 de ganancia gratis. Fisiológicamente la intensidad extra rinde con retornos
decrecientes y cuesta en riesgo; así la elección existe.

### 5.3 Adaptación pendiente: la sobrecompensación (SPEC 5.4, por fin)

Ninguna ganancia se aplica el mismo día. `Δ_bruto` va a `rider_hidden.pending[a]`, y cada día se
LIBERA al atributo una fracción que depende de si el cuerpo está reparando o cavando:

```
r(tsb) = 0.12 si tsb ≥ −5 · 0.06 si −20 ≤ tsb < −5 · 0.00 si tsb < −20
r += 0.04 si la sesión de hoy es descanso_total o descanso_activo
liberado[a] = pending[a] · r          → attr[a] = min(techo[a], attr[a] + liberado[a])
pending[a]  = (pending[a] − liberado[a]) · (1 − TRAINING.pendingDecay)    // pendingDecay = 0.015
```

Consecuencias, que son las que un fisiólogo espera: quien entrena con TSB −10 realiza el 80 % de lo
que trabaja (0,06/(0,06+0,015)); quien nunca baja de −20 no realiza NADA y pierde un 1,5 % diario de lo
acumulado (eso es el sobreentrenamiento sin necesidad de otro estado); la semana de descarga y el
taper hacen SUBIR los atributos, que es lo que el jugador ve y entiende; una gran vuelta deja un
saco de adaptación que se cobra en los diez días siguientes si se descansa (la sobrecompensación de
SPEC 5.4, sin mecanismo aparte). Aplica igual a entrenamiento y a carrera.

`TRAINING.pendingEnabled = true`; con `false` la cadena vuelve a aplicar directo (interruptor para el
banco y para la decisión del dueño, §9).

### 5.4 Absorción (`kAbsorb`, sustituye al escalón `kReady`)

```
kAbsorb(tsb) = 1.0 si tsb ≥ −15 · lineal a 0.4 en −35 · 0.25 por debajo
si tss_hoy > 1.5·ctl + 40 → kAbsorb ×= 0.8            // sesión demasiado grande para la base
```

### 5.5 Banister y forma

`tauFitness 42`, `tauFatigue = 5 + 5·(1 − REC/100)`, `tsbFactor`, `formIndex`, `mForm ∈ [0,92, 1,05]`,
`freshnessBar` y `TANK` **sin cambios**: están calibrados contra las reinas y no hay razón
fisiológica para moverlos. La forma para un objetivo ya es una habilidad (SPEC 4): lo que falta es
que el jugador pueda VERLA ANTES (§5.9).

### 5.6 Salud

- **Enfermedad** (`illnessProbability`): misma curva, con `fragility_eff = fragility · (1.3 − 0.6·REC/100)`
  (REC 100 → ×0,7; REC 50 → ×1,0) y el multiplicador de intensidad/viaje de §5.1-5.2. Se tira también
  el día de carrera con `raceIllnessProbability` (ya existe) — sin cambios de techo, «NO SE SUBE MÁS».
- **Molestias** (por fin se escribe): en `simulateRiderDay`, si `tsb < −35` → `strain_days += 1`, si no
  `strain_days = 0` (en día de carrera lo actualiza `stageRun`). Con `strain_days ≥ 5` y sano →
  `molestias` (`mHealth 0,96`, ganancias ×0,5, y el entrenador bot programa descanso activo). Sale de
  `molestias` cuando `tsb > −20`. Estado, no baja: se corre con molestias.
- **Lesión de sobrecarga** (N3 «aceptada»): sano o con molestias, `p = min(0.004, 0.0004 · fragility_eff ·
max(0, (−tsb − 30)/10))`; si cae, `lesionado` `U{7..21}` días. Protección del gimnasio: si hay ≥ 2
  `gimnasio` en los últimos 14 días de `rider_daily_log`, `p ×= 0.7` (lo que SPEC 5.1 llamaba «reduce
  la fragilidad efectiva»).
- Enfermo/lesionado no entrena (hoy ya) y no acumula `pending` (sí lo libera: convalecer consolida).

### 5.7 Carga por instalaciones y staff (`kInst`, `kStaff`)

`kInst` por división del equipo: WT 1,05 · PRS 1,02 · CON 1,00 · sin equipo 0,95. `kStaff = 1,0`
hasta que exista cuerpo técnico (G2.9), momento en que lo alimenta la economía. Es la primera vez que
«sin equipo» a los 18 cuesta algo, que es el arco que el dueño describió («y así para cuando cumplan 19
y 20 ya pueden tener… quizás un equipo»). `kGroup` sin cambios.

### 5.8 Periodización y el entrenador bot v2 (`shared/training.ts::coachPlan`)

Firma nueva, pura: `coachPlan(ctx: CoachContext): TrainingChoice & { reason: CoachReason }` con

```
CoachContext = { gameDay, seasonDay, vocation, age, tsb, ctl, health,
                 daysToNextRace: number | null,          // convocatoria conocida dentro de 28 días
                 daysSinceBlockEnd: number | null, lastBlockDays: number }  // última tanda de carrera
```

`db/train.ts` la rellena (roster futuro, `rider_daily_log` para la última tanda); la web YA NO llama a
`defaultCoachPlan`: el `GET /api/riders/me/orders` devuelve el plan sugerido día a día con su `reason`
(arregla el desajuste web/servidor de §1.5).

Reglas, en este orden (la primera que aplica manda):

1. `health` enfermo/lesionado → no entrena (ya). `molestias` → `descanso_activo`.
2. `tsb < −30` → `descanso_activo` («razonable»: no te entierra).
3. Post-carrera: `lastBlockDays ≥ 8` y `daysSinceBlockEnd ≤ 3` → `descanso_activo`, días 4-5 `fondo
suave`; `lastBlockDays 4-7` y `daysSinceBlockEnd ≤ 2` → `descanso_activo`.
4. Taper fijo de 4 días ante convocatoria: `daysToNextRace 1 → descanso_activo`, `2 → sesión de la
vocación suave` (aperturas), `3-4 → fondo suave`. Igual para una .2 que para el Tour: por eso no es
   óptimo.
5. Mesociclo 3:1: si `floor(seasonDay/7) % 4 == 3`, semana de descarga: toda sesión a `suave` y dos
   `descanso_activo` (índices 2 y 5 de la semana).
6. Fase de temporada, derivada del calendario real (`SEASON_CALENDAR`): `base` = desde 14 días tras la
   última carrera hasta 42 antes de la primera; `construccion` = las 6 semanas previas a la primera;
   `competicion` = el resto. Ciclo de 14 días por fase (índice `gameDay % 14`), con `V` = sesión de
   vocación (`velocidad→sprint`, `crono→crono`, `escalada→puertos`, `clasicas→paves`,
   `puncheur→vo2max`, `rodador→umbral`, `fondo→umbral`) y `O` = oficio (`velocidad→video_tactica`;
   `clasicas/rodador/puncheur` alternan `paves`/`tecnica_bajada`; `escalada/crono/fondo→tecnica_bajada`):

   | fase         | ciclo de 14                                                                                                                                     |
   | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
   | base         | fondo · fondo · gimnasio · umbral · descanso_activo · fondo F · descanso_total · fondo · gimnasio · O · umbral · fondo · video · descanso_total |
   | construccion | umbral · V · descanso_activo · vo2max · fondo · V · descanso_total · umbral · O · descanso_activo · puertos · V · video · descanso_total        |
   | competicion  | fondo · umbral · descanso_activo · V · vo2max · fondo · descanso_total · V · O · descanso_activo · umbral · puertos · video · descanso_total    |

7. Nunca `fuerte` más de un día de cada 7; nunca `vo2max` dos días seguidos; `< 23 años` → el `O` de la
   semana par se convierte en `video_tactica` (el joven aprende oficio).

Qué lo hace «razonable»: descansa antes y después de correr, descarga una semana de cuatro, no
entrena con TSB −30, toca los diez atributos. Qué lo hace «nunca óptimo», y a propósito: taper de
longitud fija sin mirar la clase de la carrera ni el `pending` acumulado; no persigue un TSB objetivo
(+5..+18) el día de la carrera; ignora el bonus de grupo; reparte oficio sin mirar si el calendario del
corredor tiene pavés; nunca hace bloques de `vo2max` de tres días, que es lo que un humano con un
objetivo sí puede hacer. Un jugador que planifique de verdad le gana en forma el día D y en puntos al
año; uno que no planifique llega a las carreras entero.

### 5.9 Qué decide el jugador y qué ve

- **Plan de 28 días** (sesión + intensidad) como hoy. Cada día trae el plan del bot con su `reason`
  («taper: Race X en 3 días», «semana de descarga», «post-vuelta») para que la desviación sea informada.
- **Proyección de frescura**: la pantalla calcula, con `applyDailyLoad` y el `tau` del corredor (el API
  devuelve `tauFatigue` en días, no REC), la barra de frescura de cada uno de los 28 días para el plan
  editado, y marca los días de carrera con la banda «ideal» (`freshnessBar(+5..+18)` ≈ 60-75). Es la
  herramienta que convierte «preparar el pico para Race France» en una habilidad visible. Puro,
  cliente, sin endpoint nuevo.
- **Objetivos**: `rider_race_prefs` ya existe; el bot los ignora salvo la convocatoria (no es óptimo);
  la proyección los pinta.
- **Perfil**: medias estrellas propias, flecha de tendencia, barra «adaptación pendiente»
  (`Σ pending` en tres tramos: baja < 1, media 1-3, alta > 3), y el descubrimiento del talento de SPEC
  5.6 en su forma mínima: a los 90 días con equipo, una frase del entrenador según `talent` (< 25
  «responde despacio», 25-50 «normal», > 50 «responde muy bien») y por atributo la pista de margen
  («amplio» ≥ 15, «medio» 5-15, «escaso» < 5) con ruido ±5 sembrado por semana. Techos y talento
  siguen sin verse nunca en número.

---

## 6. Cómo entra todo esto en la etapa

Lo que **NO cambia** (y por eso las huellas selladas salen idénticas): `eff0 = attr·mForm·mHealth·
mMorale`; `initialEnergy(ctl, tsb, salud)` y `TANK`; `matchCount` y sus pesos/umbrales; `erosion`,
`erosionCoef`, `bonk`; `finishWeights`; `stageTss = 5·workUnits`; maillot ×1,04; `raceIllnessProbability`.

Lo que cambia AGUAS ARRIBA, en `db/stageRun.ts`, sin tocar `packages/engine/src/stage`:

1. **Consistencia** (si el dueño la acepta): `eff0 × (1 + N(0, consistency))` con RNG
   `seededRng(worldSeed:riderId:gameDay:dia)`, acotado a ±3σ. Mismo factor para los diez atributos (es
   el día del corredor, no del atributo). Producción cambia; los bancos, no.
2. **REC y el cerillo de mañana**: `isDeepDepleted(energy, energy0, rec)` con umbral
   `0.06 + 0.12·(1 − REC/100)` (REC 50 → 0,12, el actual; REC 90 → 0,072; REC 20 → 0,156). Firma
   opcional en `physics.ts` con el 0,12 por defecto: ninguna huella se mueve.
3. **`strain_days`** también se actualiza el día de carrera (TSB de salida < −35 → +1).
4. **Aprendizaje** por `raceLearning` v2 (§4.4) hacia `pending`, con `workUnits`, posición y
   finish/abandono.
5. **Tras la etapa**, liberación del `pending` con `r(tsb)` como cualquier día (una etapa es un día
   más de la cadena; el día de carrera `r` es 0 casi siempre porque el TSB de carrera baja de −20, que
   es lo correcto: en carrera no se consolida).

Dos cambios que SÍ tocarían el motor y van en tanda propia con `ENGINE_VERSION++` y recalibración
(recomendados, no incluidos en el plan de §8):

- **CRI en el remate `solitario`**: `{ RES 0.35, LLA 0.15, CRI 0.15, TAC 0.20, MON 0.15 }` (LLA cede
  0,15). Un fugado en los últimos 20 km está haciendo una crono, y hoy el contrarrelojista no existe
  fuera del día de crono.
- **`fragility` al motor de caídas** (`StageRider.fragility`): sigue LÍMITE por la recalibración de
  caídas que exige; no se propone aquí.

---

## 7. Equilibrio del mundo

### 7.1 Por qué no acaban todos siendo Pogačar

Porque el techo es absoluto y estacionario: la media de la población converge a
`E[C · m(edad)]` y no puede pasar de ahí por mucho que se entrene o se corra. Entrenar y correr deciden
QUIÉN de su cohorte llega antes y cuánto del techo realiza (80 % contra 100 %, `pending`), no el
techo del mundo. Los 22-25 % de cracks de hoy son un artefacto del techo relativo (§1.1), no un
número a discutir.

### 7.2 Por qué nadie se queda «sin pasar de 4 en nada» sin que eso signifique que todo el CON tenga 4★

El humano conserva el don global (un techo ≥ 82). Para los NPC no hace falta garantía: un continental
de nivel 54 con 3★ en todo ES un continental, y que el 85 % del CON no pase de 3★ es el mundo real.
La banda de medianías se mide donde tiene sentido (WT) además de en el mundo entero.

### 7.3 Qué mide el banco (`sim/world.ts`) — filas nuevas de `WorldSeasonRow`

El banco debe correr también: `pending`, `molestias`, `strain_days`, el bot v2 con `daysToNextRace`
(conoce sus 65 días sorteados), las cuotas de arquetipo y `kInst` por división. Métricas:

| Campo                                                                     | Qué                                                                                          | Banda propuesta (CI, «alarma de incendios»)                                                                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cincoEstrellasWTPct`                                                     | % de WT con algún atributo ≥ 84                                                              | **≤ 15** en toda temporada (dueño)                                                                                      |
| `cracksPct`                                                               | % con ≥ 3 atributos 5★ (ya)                                                                  | **≤ 6** (recomendación; dueño decide, hoy 22-25 «a discutir»)                                                           |
| `estrellas5Medias`                                                        | ya                                                                                           | ≤ 1,0                                                                                                                   |
| `sinNadaSobre4Pct`                                                        | ya (mundo)                                                                                   | ≤ 45                                                                                                                    |
| `sinNadaSobre4WTPct`                                                      | nuevo                                                                                        | 10-30 (los gregarios WT existen)                                                                                        |
| `mediaGlobal`, `anchoP90P10`                                              | ya                                                                                           | ancho ≥ 10; media no baja                                                                                               |
| `estacionariedad`                                                         | `                                                                                            | mediaGlobal(t) − mediaGlobal(t5)                                                                                        | ` para t ≥ 10 | ≤ 2,0 |
| `techosNeoprosVsGen0`                                                     | media de techos primarios de neopros − de la génesis, por división                           | \|Δ\| ≤ 1,5                                                                                                             |
| `curvaEdadAerobica`                                                       | media de MON+RES+LLA de la cohorte 20-21 / 27-29 y 33-35 / 27-29                             | 0,80-0,90 y 0,90-0,98                                                                                                   |
| `curvaEdadNeuro`                                                          | SPR+COL igual                                                                                | 0,85-0,95 y 0,84-0,94                                                                                                   |
| `curvaEdadTAC`                                                            | TAC(33-35) − TAC(20-21)                                                                      | ≥ 12                                                                                                                    |
| `purosPct`                                                                | % de velocistas maduros WT con SPR ≥ 75 y MON ≤ 55; % de escaladores con MON ≥ 75 y SPR ≤ 55 | ≥ 50 cada uno                                                                                                           |
| `crecimientoNeoproWT`                                                     | Δ primario en la primera temporada de un neopro WT de 20                                     | +4..+9                                                                                                                  |
| `descansoImporta`                                                         | brazo `sinDescanso` (bot que nunca descansa ni tapera) vs bot v2: mediaGlobal t15            | bot v2 − sinDescanso ≥ 2                                                                                                |
| `carrerasEnseñan`                                                         | ya (brazo `sinCarreras`)                                                                     | > 1 punto                                                                                                               |
| `enfermedadesPorCorredorAño`, `lesionesSobrecargaAño`, `diasMolestiasAño` | nuevos                                                                                       | 1-4 · 0,1-0,5 · 5-25                                                                                                    |
| `congeladosPct`                                                           | REDEFINIDO: los DIEZ en su techo                                                             | 0 % (el motor congelado del veterano es lo esperado y se reporta aparte como `motorCongeladoVeteranosPct`, informativo) |
| `edadMedia`, `riders`                                                     | ya                                                                                           | [24, 32]; constante                                                                                                     |

Los bancos de etapa (`realQueens`, `grandTour`, `smallTours`, `timeTrials`, `coherence`, `invariants`)
no se mueven: corren campos sintéticos. Lo que sí cambia es PRODUCCIÓN: el WT medio baja ≈ 4 puntos
en absoluto y las divisiones conservan su distancia; el pavé lo sigue decidiendo el adoquinero porque
`clasicas` nace con PAV primario y los demás con PAV resto/contra.

---

## 8. Plan de implementación por pasos

Convenciones del repo: constantes en `constants.ts` con comentario y porqué; motor puro; cambio de
conducta ⇒ `ENGINE_VERSION++` (52 → 53 al cerrar la tanda) y nota en `docs/balance.md` (siguiente
«v59»). Cada paso deja los tests verdes.

| #   | Paso                                                                                                                                                                                                                                                                                                          | Ficheros                                                                                                                                                                                                                                                                                                                                                         | Migración                                                                                                                                                                                                                                      | Bancos/huellas                                                                                       | Hecho cuando                                                                                                                                                 | Modelo                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 0   | **Medir antes.** Añadir a `sim/world.ts` las métricas de §7.3 (sin bandas) y un `pnpm sim:mundo --json`; guardar la foto actual en `docs/balance.md` v59 §0                                                                                                                                                   | `sim/world.ts`, `sim/world.test.ts` (solo lectura)                                                                                                                                                                                                                                                                                                               | —                                                                                                                                                                                                                                              | ninguno se mueve                                                                                     | tabla t1/t5/t15/t25 con las métricas nuevas del mundo ACTUAL                                                                                                 | Sonnet                                 |
| 1   | **Clases y curvas.** `ATTRIBUTE_CLASS` (borrar `ATTRIBUTE_GROWTH`), `kAge` por clase, declive por clase con `kMant`, detraining sin oficio                                                                                                                                                                    | `shared/rider.ts`, `engine/progression.ts`, `constants.ts` (`TRAINING`)                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                              | `progression.test.ts` (reescribir tramos), `npc.test.ts` (quitar `ceilingBoostRange` si se importa)  | test: a 20 años SPR kAge 1,10 y RES 1,20 con `peakAge 28`; a 34 con `D 32` SPR pierde más que RES; TAC no decae                                              | Haiku                                  |
| 2   | **Génesis.** Arquetipos 7 con cuotas y contra; techo absoluto + `MATURITY`; `sampleNpcAge` 19-38; humano con contra y `ctl/atl/morale 35/35/60`; `pickWeighted` en `db/world.ts`                                                                                                                              | `shared/rider.ts`, `engine/world/npc.ts`, `engine/creation.ts`, `constants.ts` (`NPC`, `CREATION`), `db/world.ts`, `db/riders.ts::createRider`, `db/rollover.ts` (`insertNeopro` usa el nuevo generador), `world/callups.ts` (`KIND_AFFINITY` con `puncheur`/`rodador`), `api/routes/riders.ts` (`vocationSchema`), web `VOCATION_LABELS` y pantalla de creación | **0033**: `ALTER TYPE archetype ADD VALUE 'puncheur','rodador'`; `rider_hidden` + `pending jsonb default '{}'`, `consistency real default 0.015`; `riders` + `strain_days int default 0`. Techos de los ya nacidos **no se tocan** (como 0032) | `npc.test.ts`, `creation.test.ts`, `callups.test.ts`, `sim/world.test.ts` (bandas provisionales)     | 4.000 bots: WT con 5★ 7-10 %; MON medio cohorte 21 / 28 ∈ [0,82, 0,90]; ≥ 50 % de velocistas WT maduros con MON ≤ 55; cuotas ±2 pp                           | Sonnet                                 |
| 3   | **REC y salud.** `fragility_eff(REC)`, `molestias` por `strain_days`, lesión de sobrecarga, gimnasio protector, `isDeepDepleted(…, rec)` opcional, `strain_days` en `stageRun`                                                                                                                                | `engine/banister.ts`, `engine/progression.ts`, `engine/stage/physics.ts` (firma opcional), `db/train.ts`, `db/stageRun.ts`, `constants.ts` (`HEALTH`)                                                                                                                                                                                                            | usa 0033                                                                                                                                                                                                                                       | `banister.test.ts`, `progression.test.ts`; huellas selladas idénticas (verificar)                    | test: 6 días a TSB −40 → `molestias`; sale a −15; p_lesión(−45, frag 1) ≈ 0,0006; REC 90 baja el umbral de vaciado a 0,072                                   | Sonnet                                 |
| 4   | **Catálogo e intensidad.** 13 sesiones, tabla de intensidad, `kAbsorb`, `kInst` por división                                                                                                                                                                                                                  | `shared/training.ts`, `engine/progression.ts`, `api/routes/riders.ts` (`orderSchema`), `db/train.ts` (pasa `kInst`), web `Training.tsx` (desplegable), `constants.ts`                                                                                                                                                                                            | **0034**: `UPDATE training_orders/team_training_orders SET session='tecnica_bajada' WHERE session='bajada_paves'` (+ `ALTER TYPE` si es enum)                                                                                                  | `progression.test.ts`                                                                                | un año del bot v1 sobre un neopro de 20 mueve los 10 atributos > 0; `fuerte` sube TSS ×1,25 y G ×1,12                                                        | Haiku (catálogo/UI) + Sonnet (kAbsorb) |
| 5   | **Adaptación pendiente.** `pending` en `RiderDayState`, liberación `r(tsb)`, decay, interruptor; `DailyLog.released`; persistir en `rider_hidden.pending`; banco lo lleva                                                                                                                                     | `engine/progression.ts`, `db/train.ts`, `db/stageRun.ts`, `sim/world.ts`, `constants.ts`                                                                                                                                                                                                                                                                         | usa 0033                                                                                                                                                                                                                                       | `progression.test.ts`, `sim/world.test.ts`                                                           | test: 21 días a TSB −25 acumulan y no liberan; 7 de descanso liberan ≥ 50 %; brazo `sinDescanso` ≥ 2 puntos por debajo en t15                                | Sonnet                                 |
| 6   | **Aprender corriendo v2.** Pesos por terreno, `kEsfuerzo`, TAC por resultado, no finishers, REC en vueltas, talento y edad, `raceBase 1.0`                                                                                                                                                                    | `engine/world/learning.ts`, `db/stageRun.ts`, `sim/world.ts` (sortea `workUnits` representativo por terreno: llana 22 · media 29 · reina 37 · cri 19 · clasica 32), `constants.ts` (`LEARNING`)                                                                                                                                                                  | —                                                                                                                                                                                                                                              | `learning.test.ts`, `sim/world.test.ts` («correr aporta > 1»)                                        | WT con 20 de margen y 30 unidades: ≈ 0,6/día; DES sube en `reina`; DNF por corte aprende la mitad                                                            | Sonnet                                 |
| 7   | **Entrenador bot v2.** `coachPlan(ctx)`, fases desde `SEASON_CALENDAR`, taper/post-carrera, mesociclo; `db/train.ts` construye `ctx` (roster futuro, `rider_daily_log`); `GET /orders` devuelve `coach: {gameDay, session, intensity, reason}[]`; web usa eso y borra `defaultCoachPlan` de `trainingPlan.ts` | `shared/training.ts`, `db/train.ts`, `api/routes/riders.ts`, `web/domain/trainingPlan.ts`, `web/pages/Training.tsx`, `sim/world.ts`                                                                                                                                                                                                                              | —                                                                                                                                                                                                                                              | `sim/world.test.ts` (`descansoImporta`); tests nuevos de `coachPlan`                                 | el bot llega a un día de carrera con TSB ≥ −15 en ≥ 80 % de los casos del banco; nunca `fuerte` > 1/7; la web enseña exactamente lo que aplicará el servidor | Sonnet                                 |
| 8   | **UI.** Medias estrellas propias + flecha (`rider_attr_log` 28 días vía `GET /api/riders/me/summary`), ruido semanal en ajenos, barra de adaptación pendiente, pistas de margen y frase del entrenador a los 90 días, proyección de frescura en `Training.tsx` con `tauFatigue` del API, `reason` por día     | `web/components/AttributeList.tsx`, `web/pages/RiderProfile.tsx`, `web/pages/Training.tsx`, `web/domain/*`, `api/routes/riders.ts`                                                                                                                                                                                                                               | —                                                                                                                                                                                                                                              | —                                                                                                    | perfil propio en medias; ajeno entero con ruido estable dentro de la semana; la proyección coincide con el diario real al día siguiente (±1 de barra)        | Haiku                                  |
| 9   | **Calibrar y sellar.** Bandas de §7.3 en `sim/world.test.ts`; barrido de `levelMu`, `raceBase`, `pendingDecay`; `ENGINE_VERSION 53`; nota v59 con las tablas antes/después; actualizar SPEC §3 y §5                                                                                                           | `sim/world.test.ts`, `constants.ts`, `SPEC.md`, `docs/balance.md`, `docs/epics.md` (G1 revisado)                                                                                                                                                                                                                                                                 | —                                                                                                                                                                                                                                              | todos los bancos verdes; huellas selladas idénticas salvo que se acepte CRI→solitario (tanda aparte) | CI en verde 2 mundos × 25 temporadas ≤ 15 s; las 12 bandas nuevas dentro                                                                                     | Sonnet                                 |

Orden y dependencias: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. Los pasos 1-4 se pueden desplegar sin el
5 (interruptor `pendingEnabled=false`) si se quiere ir por partes. Ninguno toca `packages/engine/src/stage`
salvo la firma opcional de `isDeepDepleted`.

---

## 9. Decisiones del dueño (con recomendación)

1. **Siete arquetipos y cuotas** (§3.2). Recomendado: sí; el pelotón sin rodadores ni puncheurs no es un
   pelotón. Alternativa mínima: cinco arquetipos con «contra».
2. **Nivel de los bots** `levelMu = {72, 62, 54}` (§3.3). Recomendado: sí ahora; es la perilla de G9 y
   el banco la vigila con `cincoEstrellasWTPct ≤ 15`.
3. **Banda de cracks** (`cracksPct`): hoy 22-25 % «a discutir». Recomendado: **≤ 6 %**. Si el dueño
   quiere un mundo con más superclase, 10 %; el mecanismo lo permite sin desbocarse.
4. **Adaptación pendiente** (§5.3) encendida. Recomendado: sí; es la única forma de que descansar se
   vea y de que exista sobreentrenamiento sin otro estado. Riesgo: el jugador tiene que entender que
   «hoy no subió porque hoy no descansaste»; la barra del perfil lo explica.
5. **Escala visible**: medias estrellas para el propio, ruido semanal N(0,4) para ajenos. Recomendado:
   ambas. El informe de ojeador con más precisión (mercado) queda para G2.
6. **`kInst` por división y `kStaff` 1** hasta G2.9. Recomendado: sí; la economía lo sustituye cuando
   exista.
7. **Molestias y lesión de sobrecarga** (§5.6). Recomendado: sí (N3 «aceptada»). Días de baja 7-21 son
   un coste real de temporada: eso es lo que hace que sobreentrenar duela.
8. **CRI en el remate solitario** (§6). Recomendado: sí, en tanda aparte con recalibración de
   `finishWeights` y `ENGINE_VERSION++`, porque mueve las huellas.
9. **Consistencia oculta en `eff0`** (§2.4, §6). Recomendado: sí, σ medio 1,5 %, tope 3 %. Da «malos
   días» sin tocar el motor. Si el dueño prefiere resultados 100 % explicables por forma, no.
10. **Techos de los corredores ya nacidos**: no tocar (como 0032) y dejar que el relevo converja en
    ~10 temporadas, o remuestrear techos con el nuevo modelo `max(attr, C_nuevo)`. Recomendado: **no
    tocar**; remuestrear cambia de golpe el potencial de gente que el jugador ya conoce.
11. **Edad mínima de bots 19**. Recomendado: sí («no quiero una academia junior de bots»).
12. **Velocidad del declive** (§4.3: −2,4/año aeróbico y −3,3 neuromuscular en el primer año,
    entrenando). Recomendado: así; hoy es más rápido y plano.
13. **REC en el cerillo de mañana y en la enfermedad** (§6.2, §5.6). Recomendado: sí; sin eso REC
    sigue siendo un atributo decorativo.
14. **El humano nace con `ctl/atl 35` y `morale 60`**. Recomendado: sí; lo de hoy es un defecto de
    esquema, no una decisión.
15. **Acercar el arranque humano a la madurez de un junior** (m 0,34 → 0,5, primario ≈ 35). Recomendado:
    **no**; el dueño midió que 20-24 es el suelo que funciona y el primer año ya recupera.
16. **Retiro por nivel de los NPC** (sin equipo tres temporadas → retiro). Recomendado: después, con G8.

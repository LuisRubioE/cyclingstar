# Rediseño del entrenamiento y de las características de los ciclistas

Propuesta de diseño de juego. Encargo del dueño, literal: «Y también en un documento después pon un
rediseño al sistema de entrenamiento y características de los ciclistas.»

Lo que aquí se propone respeta lo que el dueño ya ha dictado y que no se vuelve a discutir:

- «hay que ser menos cartesianos… un ciclista sí mejora después de los 24, pero mejora en COSAS
  DIFERENTES» (v50).
- «de una carrera puedes aprender más que de un entrenamiento, e incluso variará según el nivel de la
  carrera» (v54).
- El entrenador bot es «Razonable, nunca óptimo» (v53): un humano que planifica bien le gana; uno que
  planifica mal, no.
- «que no acaben todos siendo Pogačar» y que nadie se quede «sin pasar de 4 en nada» (G1).
- Bots con cinco estrellas: «claramente menos del 15 %» del WorldTour (v58-bis).
- El humano empieza a los 18 «con stats casi a cero, sin equipo» (v48); el suelo que funciona es 20.
- La forma en estrellas y la frescura en barra, «nunca números internos» (Paso 20).
- Doctrina de calibración: «Prefiero una especificación corregida a un motor calibrado hacia un
  objetivo equivocado»; «si el cambio saca un objetivo de banda, el que está mal es el cambio».

Fuentes leídas: `diseno/mapa-entrenamiento-atributos.md` (modelo actual de punta a punta),
`diseno/mapa-requisitos-duenio.md` §12-§14, `diseno/mapa-spec.md` §2.1, §2.3, G1/G9,
`packages/engine/src/constants.ts` (bloques `CREATION`, `NPC`, `BANISTER`, `TANK`, `HEALTH`,
`LEARNING`, `TRAINING`), `progression.ts`, `banister.ts`, `creation.ts`, `world/npc.ts`,
`world/learning.ts`, `shared/rider.ts`, `shared/training.ts`, `db/train.ts`, `db/stageRun.ts` (tramos),
`sim/world.ts`, `Training.tsx`, `RiderProfile.tsx`, `AttributeList.tsx`.

Las citas del dueño van con «». Lo que es decisión suya se marca **[DECISIÓN DEL DUEÑO]** y se recoge
en el §9 con la recomendación.

---

## 1. Diagnóstico: qué falla o falta hoy

Cada punto va con su evidencia. No es una lista de retoques: son los agujeros que un rediseño tiene
que cerrar de una vez, porque parchearlos por separado es lo que se ha hecho de la v48 a la v58.

### 1.1 Especializarse no cuesta nada, y por eso el mundo fabrica Pogačars

- Los techos NPC no dependen de la vocación: «Los techos NPC NO dependen de la vocación (solo de edad
  y clase del atributo)» (mapa-entrenamiento §4.4). Un velocista de 20 años nace con margen 5-30 en
  MON, COL, CRI, RES… exactamente igual que en SPR. Si su equipo le manda puertos, sube MON. El
  resultado medido es el que preocupa: cracks (≥ 3 atributos 5★) 0,1 % en t1 → 15,6-24,8 % en t15
  (§13, balance v54: «uno de cada cuatro corredores… hacia la temporada 15… es decisión de diseño»).
- En el humano el sesgo del techo es `12·bias` sobre 58 (§5.1): primarios 70, adyacentes 64, resto 58.
  Doce puntos son menos de una estrella. Las «correlaciones suaves (MON~~RES +, SPR~~MON −)» del SPEC no
  existen en el código. El humano es un todoterreno con etiqueta.
- El talento (`Beta(2,4.5)`, media 31) SOLO multiplica la velocidad (`kTal` ∈ [0,6, 1,6]). No limita
  hasta dónde. Con años suficientes, un talento 10 y un talento 90 llegan al mismo techo.
- Consecuencia de juego: la elección de vocación al crear el ciclista es una preferencia de plan bot y
  de convocatoria (`PUT /api/riders/me/archetype` «no toca techos ni atributos», §2.5). No es una
  decisión con coste.

### 1.2 Cinco vocaciones no hacen un pelotón

`VOCATIONS` = escalada, velocidad, clasicas, crono, fondo (§2). No existen el puncheur, el rodador
puro, el gregario de oficio ni el líder de vuelta como perfiles de nacimiento. La v45 midió que «99 %
el mejor SPR es velocidad»: el generador es limpio pero pobre. Y el «fondo» es un cajón de sastre
(RES/REC primarios) que en carrera no gana nada en ningún terreno (RES pesa 0,10-0,35 en los remates,
REC nada).

### 1.3 Dos atributos no hacen lo que dicen

- **REC**: «No aparece en ningún fichero del motor de etapa» (§1). Solo acorta `tauFatigue`. El
  comentario del catálogo dice que «cuenta cerillas (`matchCount`)» y es falso. Se congeló de por vida
  hasta la v53 y hoy solo lo mueve `descanso_activo` 0,25/día.
- **CRI**: «Solo pesa en la crono» (§1). El que llega solo a meta en una etapa en línea —que está
  haciendo una crono— no lo usa (remate `solitario` = RES 0,35 · LLA 0,30 · TAC 0,20 · MON 0,15).
- La ayuda del perfil (`ATTRIBUTE_DESCRIPTIONS`) le promete al jugador cosas que el motor no hace («REC…
  race harder back-to-back»).

### 1.4 Los bots no tienen juventud; el humano nace peor que un bot de su edad por un descuido

- «`generateNpcRider` usa la edad solo para el TECHO, no para los atributos… un continental de 18 años
  es idéntico a uno de 30 (MON 60,0 medido en los dos). El mundo no tiene júniors» (G10, §15.1).
- El humano nace con `ctl 0 / atl 0 / morale 50` por defaults de esquema; el NPC con 45/45/60. Con CTL
  < 35 actúa el detraining (−0,03/día en 9 atributos) las primeras tres semanas y el depósito sale a
  0,90 (§5.6, §15.13). Es «un hecho observado, no una deuda anotada».

### 1.5 Dos relojes de edad que no se hablan

`kAge` usa `peakAge/declineAge` propios (26-31 / 29-37); los techos NPC usan tramos fijos 23/27; la
clase motor/oficio «vive SOLO en los techos del NPC» y `progression.ts` no la lee (§6, §12). Un
corredor con peak 26 entra en 0,95 a los 25 aunque su techo «de plenitud» se calculó hasta los 27. La
frase del dueño («mejora en cosas diferentes») está implementada en el nacimiento, no en el
crecimiento.

### 1.6 La carrera enseña igual al que se esconde y al que la gana

`raceLearning` (§9) no lleva «talento, edad, forma ni resultado del día». El que va todo el día en el
pelotón aprende lo mismo que el fugado; el que abandona no aprende nada («solo para quien termina»,
§15.18); DES no se aprende en ningún terreno (§15.11). El SPEC 5.3 (por `workUnits` de dominio, +TAC si
top-10 o fuga) «no es lo implementado». Y la ganancia es LINEAL en el margen mientras el entrenamiento
es `kDim` exponencial: dos curvas distintas para el mismo concepto.

### 1.7 El entrenador bot es bueno donde no debería y ciego donde sí

«Reparte por igual sin mirar el calendario, la forma ni el objetivo del mes» (§10, §15.3). Ciclo fijo
de 14 días indexado por `gameDay % 14`: el día antes del Tour puede tocar `fondo fuerte`. Pero como
toca las once sesiones y el jugador solo puede elegir sesión e intensidad, **el jugador no tiene por
dónde ganarle**: sus palancas son las mismas que las del bot y las ganancias diarias (+0,19/día en el
ejemplo de §6) no se ven en estrellas de 17 puntos.

### 1.8 El plan de 28 días es trabajo tonto y encima congela al bot

- Veintiocho desplegables (`Training.tsx`), sin objetivo, sin previsión de forma, sin plantilla.
- `buildServerPlan` rellena los huecos con el bot y **al guardar se persisten TODOS los días como
  órdenes explícitas** (§11). Si después llega una convocatoria, el bot ya no puede reaccionar: el
  jugador ha firmado, sin saberlo, un plan escrito por el bot.
- La previsualización usa `defaultCoachPlan(gameDay)` **sin vocación** (§15.14): enseña `umbral`
  donde el servidor aplicará `sprint`; y luego persiste esa previsualización.

### 1.9 El feedback no explica nada

- `attrStars` en bandas de 17 puntos: un año de plan bot da RES +7,1, MON +5,1 (§6). Puede no mover
  ni una estrella. «Hice descanso activo y no mejoró» es la queja registrada; la barra de frescura se
  arregló, la de atributos no.
- `rider_attr_log` guarda cada delta y nadie lo enseña. No hay flecha de tendencia ni informe de
  ojeador (SPEC 3.2, «grep… nada»). No hay «por qué mejoré» ni «por qué no».
- La `activity` del diario mezcla sesión y enfermedad; la carrera no escribe su aprendizaje con origen.

### 1.10 Salud: dos estados fantasma y una economía inexistente

- `molestias` «no lo produce ningún camino» (§15.9). Lesión solo por caída en carrera. El
  sobreentrenamiento se paga con `kReady 0,25` y un dado de enfermar que solo salta por debajo de TSB
  −22: nada de eso tiene cara visible antes de que estalle.
- `kInst` y `kStaff` «siempre valen 1» (§15.7). SPEC 5.2 los define y «no hay economía que los
  mueva». El presupuesto de equipo existe (`teams.budget`, `teamEconomy.ts`: «sin gastos de staff
  todavía»).

### 1.11 El banco de mundo mide lo que hay, no lo que se quiere

Mide cracks, medianías, ancho, congelados, edad (§13). No mide: proporción de perfiles, pureza de los
especialistas, si un joven crece, si un humano que planifica bien le gana al bot, ni el % con 5★ por
división (la banda del dueño se midió a mano sobre 4.000 bots recién nacidos, no en t15).

---

## 2. Los atributos

### 2.1 Decisión de conjunto

**Se mantienen los diez identificadores** (`RES REC LLA MON COL CRI SPR DES PAV TAC`). Cambiar la lista
obliga a tocar la ley de velocidad, los remates, los cerillos, la erosión, las huellas selladas, el
esquema y todas las pantallas, y no compra nada que no se pueda comprar redefiniendo tres cosas: qué
hace REC, dónde entra CRI y cómo se VEN. El rediseño está en el nacimiento, el crecimiento, la escala
visible y las capas ocultas, no en añadir un undécimo atributo que diluya los otros diez.

Lo que sí cambia de la lista:

| Atr      | Hoy                                                   | Propuesta                                                                                                |
| -------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| RES      | umbral de erosión, cerillos 0,30, remates             | **igual**                                                                                                |
| REC      | solo `tauFatigue`                                     | `tauFatigue` **+ cerillos** (§2.3) **+ decae antes que nada con la edad** (§4). Clase nueva `fisiologia` |
| LLA      | ley de velocidad llano, cerillos, remates, crono 0,15 | **igual**                                                                                                |
| MON, COL | subida / muro, cerillos, remates                      | **igual**                                                                                                |
| CRI      | solo `timetrial.ts`                                   | crono **+ remate `solitario`** (0,15; §6) **[DECISIÓN DEL DUEÑO]**                                       |
| SPR      | remates, lanzamiento, caza                            | **igual**                                                                                                |
| DES      | bajada, caída, remate descenso                        | igual en el motor; **se aprende corriendo** (media/reina)                                                |
| PAV      | pavés, caída, remate pavé                             | **igual**                                                                                                |
| TAC      | colocación, lanzamiento, caída, remates               | **igual**; sigue sin decaer; su techo se abre con el talento y nunca se cierra                           |

### 2.2 Clases de crecimiento (sustituye a `ATTRIBUTE_GROWTH` motor/oficio)

```ts
export const ATTRIBUTE_CLASS: Record<Attribute, 'motor' | 'fisiologia' | 'oficio'> = {
  RES: 'motor',
  LLA: 'motor',
  MON: 'motor',
  COL: 'motor',
  CRI: 'motor',
  SPR: 'motor',
  REC: 'fisiologia',
  DES: 'oficio',
  PAV: 'oficio',
  TAC: 'oficio',
}
```

- **motor**: lo que da el cuerpo. Sube deprisa hasta `peakAge − 3`, poco hasta el pico, se defiende
  después, decae a partir de `declineAge`.
- **fisiologia** (REC): lo primero que se va. Crece como el motor pero su declive arranca en
  `declineAge − 2`. Es la forma legible de «un veterano ya no encadena tres días duros».
- **oficio**: la cabeza y las manos. Se aprende toda la vida, casi solo corriendo. DES/PAV decaen al
  25 %; TAC nunca.

La clase la lee **`progression.ts`** (hoy no la lee nadie salvo `npc.ts`): es la que fija `kAge` por
atributo (§4.1).

### 2.3 Cómo consume el motor cada atributo (qué cambia y qué no)

Solo hay dos entradas nuevas en el motor de etapa y ninguna toca la ley de velocidad ni la erosión:

1. **REC en los cerillos** (`physics.ts::matchCount`, que llama `db/stageRun.ts`, no el bucle de la
   etapa):
   - El −1 por «ayer terminó bajo el 12 %» se perdona si `eff0.REC ≥ 75` (`STAGE.matchRecWaiver`).
   - El umbral del −1 por fatiga pasa de −25 fijo a `−25 − 0.2·(eff0.REC − 50)`: REC 90 → −33; REC 30
     → −21 (`STAGE.matchTsbPenaltyRecSlope` 0,2).
     Es exactamente lo que el catálogo ya prometía y no cumplía. Legible: «Recovery: keeps your matches
     on back-to-back hard days».
2. **CRI en el remate `solitario`** (`constants.ts::finishWeights.solitario`): de `RES 0,35 · LLA 0,30 ·
TAC 0,20 · MON 0,15` a `RES 0,30 · LLA 0,20 · CRI 0,15 · TAC 0,20 · MON 0,15`. Mueve resultados de
   producción y las huellas (`attribution.test.ts`) → `engine_version++` y re-sellado justificado.
   **[DECISIÓN DEL DUEÑO]**, recomendado sí, en su propia tanda.

Todo lo demás (ley de velocidad `blockPerfil`, `erosion`, `erosionCoef`, `bonkFactor`, `placementSd`,
`sprintHoldMetres`, `chase.ts`, `crash.ts`, `autoOrders.ts`) **no se toca**. El rediseño vive antes de
la salida (qué atributos tienes, con qué forma sales) y después de la meta (qué aprendes).

### 2.4 Rangos y escala visible

Escala interna `[1, 99]`, sin cambio. Escala visible: **medias estrellas que subdividen las bandas
actuales sin mover los umbrales enteros**, para que la medida del dueño («5★ = 84+», con la que se
midió el 11,8 %) y el banco de mundo sigan valiendo dígito a dígito:

| Valor | Estrellas |     | Valor | Estrellas |
| ----- | --------- | --- | ----- | --------- |
| < 9   | 0         |     | 51-58 | 3         |
| 9-16  | 0,5       |     | 59-66 | 3,5       |
| 17-24 | 1         |     | 67-74 | 4         |
| 25-33 | 1,5       |     | 75-83 | 4,5       |
| 34-41 | 2         |     | 84+   | 5         |
| 42-50 | 2,5       |     |       |           |

```ts
export function attrStars(x: number): number // 0..5 en pasos de 0,5; los enteros salen en 17/34/51/67/84 como hoy
export function attrStarsWhole(x: number): number // = Math.floor(attrStars(x)): lo que usa sim/world.ts y cualquier banda ya escrita
```

**Lo que ve el jugador de SU corredor** (`AttributeList` en modo propietario):

- Estrellas (medias).
- **Marca de progreso dentro de la banda**: una barra fina bajo las estrellas, `(x − inicioBanda) /
anchoBanda`. No enseña el número; enseña que en un mes se ha movido. Es la respuesta a «hice X y no
  mejoró».
- **Tendencia 30 días** (`▲`, `▼`, `·`): suma de `rider_attr_log.delta` de los últimos 30 días de
  juego; `▲` si ≥ +1,0, `▼` si ≤ −1,0. Al tocar: desglose por origen (§5.8).
- Ayuda por atributo reescrita para que diga lo que el motor HACE (REC: cerillos y fatiga; CRI: crono
  y llegar solo; DES: bajada, caída y se aprende en media montaña…).

**Lo que ve de un corredor AJENO**: estrellas con **ruido de ojeador** `N(0, 4)` sembrado por
`(riderId, semana)` (SPEC 3.2; determinista, cambia una vez a la semana), redondeado a medias
estrellas; sin marca de progreso; tendencia solo si la temporada anterior el delta fue ≥ +4 («en
progresión») o ≤ −4 («en declive»). Un mánager humano de su equipo (G2) ve al corredor sin ruido.

**Lo que NO ve nadie** (ni del suyo):

| Oculto                  | Dónde                                   | Qué hace                                                                                      |
| ----------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- |
| techos por atributo     | `rider_hidden.ceilings` (jsonb, existe) | hasta dónde; nacen del arquetipo y del presupuesto de talento (§3)                            |
| talento                 | `rider_hidden.talent` (existe)          | cuánto presupuesto de techos y a qué velocidad (`kTal`)                                       |
| fragilidad              | `rider_hidden.fragility` (existe)       | enfermar, lesionarse entrenando (§5.7); al motor de caídas NO (sigue siendo el LÍMITE de v14) |
| `peakAge`, `declineAge` | existen                                 | los relojes de `kAge` (§4)                                                                    |
| **consistencia**        | `rider_hidden.consistency` real, NUEVO  | σ del día: `eff0 · (1 + N(0, σ))`, σ ∈ [0,01, 0,04]; ver §6                                   |
| arquetipo de nacimiento | `rider_hidden.born_archetype` NUEVO     | la forma del genoma; la etiqueta pública puede diferir                                        |

El jugador no ve el techo, pero lo **infiere**: el entrenador le habla (§5.8) y la marca de progreso
deja de moverse. Eso es descubrimiento del talento (SPEC 5.6) sin ningún número.

---

## 3. Cómo nace un ciclista

### 3.1 Ocho arquetipos en vez de cinco vocaciones

```ts
export const ARCHETYPES = [
  'escalador',
  'sprinter',
  'rodador',
  'contrarrelojista',
  'puncheur',
  'clasicomano',
  'todoterreno',
  'gregario',
] as const
```

Mapa de los antiguos: `escalada→escalador`, `velocidad→sprinter`, `crono→contrarrelojista`,
`clasicas→clasicomano`, `fondo→todoterreno`. Los tres nuevos son los que faltan en cualquier
plantilla real: el puncheur (COL/TAC), el rodador (LLA/RES: el que tira, abre abanicos y gana desde la
fuga en llano) y el gregario de oficio (nada sobresale, todo sirve, TAC alto).

**Forma del genoma** = mu del TECHO de cada atributo para un WT en plenitud, antes de talento y
división. Se lee como «cómo es un especialista de ese perfil cuando está hecho». SD 8 en todos (la
lección de la v58: «bajar la desviación es exactamente borrar las diferencias»).

| arquetipo        | RES | REC | LLA    | MON    | COL    | CRI    | SPR    | DES | PAV    | TAC    | % pelotón |
| ---------------- | --- | --- | ------ | ------ | ------ | ------ | ------ | --- | ------ | ------ | --------- |
| escalador        | 70  | 66  | 56     | **76** | 66     | 56     | 40     | 60  | 46     | 58     | 17        |
| sprinter         | 56  | 60  | 68     | 40     | 54     | 52     | **76** | 60  | 56     | 64     | 12        |
| rodador          | 68  | 62  | **74** | 52     | 58     | 66     | 56     | 60  | 62     | 58     | 15        |
| contrarrelojista | 66  | 60  | 68     | 54     | 50     | **76** | 46     | 56  | 52     | 56     | 6         |
| puncheur         | 62  | 62  | 62     | 62     | **74** | 54     | 60     | 66  | 56     | 66     | 11        |
| clasicómano      | 68  | 62  | 68     | 46     | 66     | 58     | 60     | 66  | **74** | 64     | 12        |
| todoterreno      | 68  | 64  | 64     | 66     | 64     | 64     | 50     | 62  | 54     | 62     | 7         |
| gregario         | 66  | 66  | 64     | 58     | 56     | 54     | 48     | 64  | 60     | **68** | 20        |

Notas de diseño:

- El primario de cada especialista está en 76 (**y no en 84**): con SD 8, un WT en plenitud a tres
  puntos de su techo queda en ~73 de media y el 5★ (84+) sale en ~9 % de los primarios. Es el mismo
  orden que hoy (`divisionPrimaryMu.WT` 71 + boost) y respeta la banda «claramente menos del 15 %».
  Los números de la tabla se **calibran con el banco de mundo** (§7); la banda del dueño manda sobre
  la tabla, no al revés.
- El sprinter tiene MON 40 y el escalador SPR 40: es el coste de ser puro. Dos estrellas, no tres.
- El todoterreno no tiene ningún 76: paga la anchura con la punta. Solo el talento (§3.2) lo convierte
  en líder de vuelta.
- El gregario tiene el TAC más alto: es su oficio.
- Las proporciones son por división y las fija `NPC.archetypeMix`. El WT lleva menos gregarios puros
  que el continental (18 / 20 / 24 %).

### 3.2 El presupuesto de talento: lo que evita la fábrica de Pogačars

El talento deja de ser solo velocidad (`kTal`) y pasa a ser también **cuánto techo total** puede tener
un corredor. Se calcula una vez, al nacer, sobre los nueve físicos (TAC aparte):

```
techo_raw[a]  = clamp( N(mu_arquetipo[a] + ajusteDivision, 8), 40, 96 )
exceso        = Σ_a max(0, techo_raw[a] − 50)                 // a ∈ 9 físicos
presupuesto   = 40 + 1.6 · talento                             // talento 0..100 → 40..200
si exceso > presupuesto:
    techo[a]  = 50 + (techo_raw[a] − 50) · presupuesto / exceso   // se recorta proporcionalmente
si no:
    techo[a]  = techo_raw[a]
techo[TAC]    = clamp( 62 + 0.30 · talento + N(0, 4), 55, 96 )   // el oficio siempre tiene sitio
```

Con la tabla de §3.1 el sprinter WT mediano tiene un exceso ≈ 100 y el talento mediano (31) da 90:
se recorta un 10 % y se queda en SPR ~73 de techo. Un talento 60 (p≈8 %) tiene 136 de presupuesto y
el genoma entero le cabe; el ruido N(·, 8) le puede regalar dos 5★. Un talento 85 (p≈1 %) con forma
`todoterreno` es el único camino hacia «muchas cinco estrellas, pero posiblemente no en todo».

Por qué así y no bajando la SD o el margen: porque el recorte es **por corredor**, no por población.
La montaña sigue seleccionando por diferencias (lección v58) y a la vez el 90 % del pelotón no puede
alcanzar 5★ en tres cosas por más que entrene. Es el mecanismo que el balance v54 echaba en falta
cuando decía que «las perillas naturales son el ciclo del entrenador y `LEARNING.raceBase`, no los
techos»: los techos SÍ son la perilla, pero atados al talento, no a la edad.

`ajusteDivision`: WT 0 · PRS −8 · CON −15 (misma distancia entre divisiones que hoy: 71/61/53).

**Ya no hay `NPC.ceilingBoost` por edad.** La edad no da techo: el techo es el genoma; la edad dice
cuánto te queda por llegar (§3.3) y a qué velocidad llegas (§4).

### 3.3 La juventud: el bot nace por debajo de su techo según su edad

Los bots dejan de nacer «ya hechos» (G10). Para cada físico:

```
gap(edad) = 0.50 (≤18) · 0.42 (19) · 0.34 (20) · 0.27 (21) · 0.21 (22) · 0.15 (23)
          · 0.10 (24) · 0.06 (25) · 0.04 (26) · 0.03 (27..declineAge)
          · 0.03 + 0.025·(edad − declineAge)  (> declineAge)
attr[a]   = round( techo[a] − gap(edad)·(techo[a] − 30) + N(0, 3) ), acotado a [20, techo[a]]
attr[TAC] = round( 28 + (techo[TAC] − 28)·min(1, (edad − 18)/12) + N(0, 4) ), acotado a [20, techo[TAC]]
```

Un escalador WT de 19 años con techo MON 76 nace con MON ≈ 57; a los 27, ≈ 75. Un continental de 18
(techo MON 61) nace con MON ≈ 45: el humano de 18 con MON 24 sigue siendo peor que él, que es lo que
pidió el dueño («casi a cero»), pero ya no es peor que un profesional hecho de 30 disfrazado de
júnior.

`NPC.divisionPrimaryMu`, `adjacentDrop`, `restDrop` y `ceilingBoost` **desaparecen**; los sustituyen
`NPC.archetypeShape`, `NPC.archetypeMix`, `NPC.divisionOffset`, `NPC.youthGap`, `CREATION.talentBudget*`.

Los neopros del rollover (`insertNeopro`, `neoproAge` 19..23) nacen por este mismo camino.

### 3.4 El humano

Elige **arquetipo** (uno de los ocho) al crear. Pantalla de creación: para cada arquetipo se enseña la
**silueta de potencial** en estrellas (rango, borroso: «Mountain ★★★★–★★★★★ · Sprint ★★–★★½»), calculada
de la tabla ± 1 SD, sin números. Es la decisión con coste: el jugador ve lo que compra y lo que
renuncia. **[DECISIÓN DEL DUEÑO]**: si esa elección es definitiva o si la ventana de «recreación libre
hasta el día 90» (SPEC 3.5) se mantiene. Recomendado: definitiva, con la ventana de 90 días para
volver a crear desde cero.

Genoma:

```
techo_raw[a] = clamp( N(mu_arquetipo[a] + 2, 9), 45, 96 )    // +2: el humano es WT en potencia; SD 9 como hoy
presupuesto  = 40 + 1.6 · talento                             // mismo recorte que el bot
don global   = si max(techo) < 82 → argmax pasa a U(82, 90)   // se mantiene: «eres ciclista»
valores      = primario N(24, 3) · secundario N(19, 3) · resto N(15, 3) · TAC U(12, 16)   // v48, se mantienen
```

«Primario» = los dos atributos con mayor mu en la forma del arquetipo; «secundario» = los dos
siguientes. Se mantiene el suelo 20 de la v48 y el don global; se añade el recorte por talento (que en
el humano llega ya con techos más bajos que los del bot WT, así que muerde menos).

**Estado inicial**: `createRider` fija `ctl 40, atl 40, morale 60` (`BANISTER.initialCtl/Atl` pasan a
40 y **se usan**). Un chaval de 18 que ya monta en bici no está destrenado.

Semilla del genoma humano: `seededRng('genome:' + riderId)` en vez de `randomUUID()` (§15.19): un
`riderId` es único y determinista, y así el genoma se puede reconstruir.

### 3.5 Los ocultos

|                    | bot                                     | humano     |
| ------------------ | --------------------------------------- | ---------- |
| talento            | `Beta(2, 4.5)·100` clamp                | igual      |
| fragilidad         | `LogNormal(0, 0.25)` ∈ [0,6, 1,8]       | igual      |
| peakAge            | `U{26..31}`                             | igual      |
| declineAge         | peak + `U{3..6}`                        | igual      |
| **consistencia** σ | `0.01 + 0.03·Beta(2,3)` (media ≈ 0,022) | igual      |
| **born_archetype** | el sorteado por `archetypeMix`          | el elegido |

La etiqueta pública `riders.archetype` (la que usan convocatorias y entrenador bot) sigue siendo
editable por el jugador (`RoleEditor`); pasa a llamarse **rol declarado** en la UI y es
independiente del genoma. Un sprinter de nacimiento puede declararse gregario: cambiará qué le
entrena el bot y para qué le convocan, no lo que puede llegar a ser.

---

## 4. Cómo crece y decae

### 4.1 Un solo reloj: la edad relativa al propio pico, por clase

`kAge` deja de ser una curva única y pasa a ser `kAge(clase, edad, peakAge, declineAge)`:

| tramo (edad)                 | motor | fisiologia (REC) | oficio |
| ---------------------------- | ----- | ---------------- | ------ |
| ≤ peak − 6                   | 1,15  | 1,15             | 1,00   |
| ≤ peak − 3                   | 1,00  | 1,00             | 1,00   |
| ≤ peak − 1                   | 0,60  | 0,55             | 1,00   |
| ≤ peak + 1                   | 0,30  | 0,25             | 0,95   |
| ≤ decline (REC: decline − 2) | 0,12  | 0,10             | 0,90   |
| > decline                    | 0,08  | 0,05             | 0,75   |

Es la frase del dueño hecha curva: «suben muy rápido cuando eres joven, menos rápido según creces;
quizás entre 24 y 27 crecen ya muy poquito, y a partir de los 27 se estancan» → 1,15 / 1,00 / 0,60 /
0,30 / 0,12. «Se estancan no es se mueren» → 0,12 y 0,08, no 0. «Tactics debería mejorar siempre» →
oficio 0,75 a los 36.

Los tramos fijos `NPC.youngAge 23 / primeAge 27` **desaparecen**. Con `peakAge` en 26-31 el tramo
«≤ peak − 3» cubre 23-28 según el corredor: unos maduran antes y otros después, y eso es información
que el jugador descubre en su propio ciclista (§5.8).

### 4.2 La ganancia diaria (sustituye la cadena de `simulateRiderDay`)

```
delta[a] = G[a] · kTal · kAge(clase[a]) · kDim(attr, techo) · kInst · kStaff · kGroup · kReady · kInt · kHealth
```

- `kTal = 0.6 + talento/100` (igual).
- `kDim` igual (`((techo−attr)/max(10, techo−30))^1.3`, tope 1,2, 0 en el techo). Se conserva porque
  ya hace lo que se quiere: lejos del techo se sube deprisa, cerca casi nada.
- `kReady`: escalón `tsb < −30 → 0.25` pasa a rampa `clamp(1 + (tsb + 15)/30, 0.25, 1)`: 1 hasta
  TSB −15, 0,5 en −30, 0,25 en −37,5. Sin escalón, la intensidad se puede dosificar.
- `kHealth`: sano 1 · molestias 0,5 · enfermo/lesionado 0 (y en enfermo/lesionado no hay sesión).
- `kInst`, `kStaff`: por fin alimentados (§5.9).

### 4.3 Lo que enseña la carrera (v2 de `raceLearning`)

```
gain[a] = LEARNING.raceBase · nivel(raceClass) · hizo · kTal · kAge(clase[a]) · kDimRace(attr, techo)
kDimRace = min(1.2, ((techo − attr) / 30)^1.3)      // la MISMA forma que el entrenamiento; hoy es lineal
tope: 1.0 puntos/día/atributo
```

- `nivel`: WT 2 · Pro 1,5 · .1/NC 1,2 · .2 1 (igual: es la banda ya calibrada de la v54).
- **`hizo`** (lo nuevo; sale de `StageResult` y de la telemetría que ya existe):

| situación                                               | terreno del día | TAC |
| ------------------------------------------------------- | --------------- | --- |
| terminó en el grueso                                    | 1,0             | 1,0 |
| ≥ 30 km en un `mov` (fuga, contraataque, puente)        | 1,5             | 1,6 |
| top-10 de la etapa                                      | 1,3             | 1,4 |
| ganó                                                    | 1,3             | 1,8 |
| abandonó (cualquier causa)                              | 0,4             | 0,4 |
| corrió para otro (`lanzador`, `gregario` con `pullFor`) | 1,0             | 1,3 |

Se toma el máximo aplicable en cada columna. El gregario aprende oficio; el fugado aprende su
terreno; el que abandona aprende algo (hoy cero). Es el SPEC 5.3 («+0,15 si top-10 o fuga») en la
forma que el motor ya sabe contar (`movKm`, `posicion`, `estado`).

- `STAGE_LEARNING_ATTRS` añade DES a `media` y `reina` (`media: MON, LLA, DES · reina: MON, COL,
DES`) y REC a las **vueltas por etapas** desde la etapa 4 (`+REC` si `stageIndex ≥ 3`): la
  recuperación se entrena encadenando días.
- **Sobrecompensación de la vuelta** (SPEC 5.4, hoy no existe): al terminar una vuelta de `n ≥ 5`
  etapas, `RES += 0.10·n · kTal · kAge(motor) · kDimRace`, aplicado el día siguiente con origen
  `sobrecompensacion` en `rider_attr_log`. El Tour completo vale hasta +2 RES. Sin estado nuevo.

Orden de magnitud tras el cambio: un neopro (kAge 1,15, talento 31) a 20 puntos del techo, fugado
30 km en una etapa de media montaña de una .Pro: MON `0.5·1.5·1.5·0.91·1.15·0.59 ≈ 0.69`/día, unas
tres veces un día de puertos (0,45·0,91·1,15·0,41 ≈ 0,19). En el grueso de una .2: 0,15/día, menos
que el entrenamiento. Las dos mitades de la frase del dueño se cumplen y además **depende de lo que
hiciste**.

### 4.4 El declive

- Arranca en `declineAge` (REC en `declineAge − 2`). Pérdida diaria sobre motor y fisiología:
  `0.02 + 0.004·(edad − declineAge)` (igual); DES/PAV ×0,25 (igual); TAC 0.
- Si el atributo se entrenó **o se corrió** en los últimos 7 días → ×0,4 (`trainedDecayFactor`; hoy
  mira solo «hoy», el SPEC decía «esa semana»: se usa `rider_attr_log` de 7 días, que ya existe).
- Detraining `ctl < 35 → −0.03/día` igual, pero **no a los ≤ 20 años** (un júnior sin fondo no se
  destrena: no tiene nada que perder, y era lo que castigaba al humano recién creado).

### 4.5 El retiro

- Bot: igual (`shouldRetire`, `HARD_RETIRE_AGE 39`).
- Humano: obligatorio a los 39 (igual); **voluntario desde los 30** con confirmación, que dispara el
  flujo «crear otro» (N2: «cuando un jugador humano se jubile lo lógico es que empiece uno nuevo»).
- Visible: a partir de `declineAge` el perfil propio enseña «Declining» junto a la edad, y la
  tendencia `▼` en lo que cae. El jugador ve venir el final y puede planificar el relevo.

---

## 5. El entrenamiento

### 5.1 Principio: pocas decisiones, con consecuencias que se ven

Hoy el jugador decide 28 × (sesión, intensidad) = 56 desplegables, y ninguno tiene efecto visible a un
mes vista. Se cambia el nivel de la decisión:

| decisión                      | quién                       | cuándo                                                                              | qué mueve                                                  |
| ----------------------------- | --------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **D1 Objetivo**               | jugador (opcional)          | una carrera de las próximas 8 semanas, entre las que tiene convocatoria o ha pedido | el afinado, la previsión de forma, el énfasis por defecto  |
| **D2 Bloque por semana** (×4) | bot rellena, jugador cambia | `base · construccion · especifico · afinado · recuperacion`                         | qué sesiones tocan y qué carga semanal                     |
| **D3 Énfasis**                | jugador                     | por bloque: `carta` (un primario) o `agujero` (cualquier atributo)                  | qué sesión ocupa los dos huecos «específicos» de la semana |
| **D4 Intensidad del bloque**  | jugador                     | `suave / normal / fuerte`                                                           | ganancia ×0,7/1/1,25, TSS y riesgo de molestias/enfermar   |
| **D5 Día suelto** (avanzado)  | jugador                     | como hoy, plegado bajo «Edit day by day»                                            | sobreescribe el día                                        |

Guardar persiste **solo lo que el jugador tocó** (`training_plans` + `training_orders` de los días
editados). Los días no tocados siguen siendo «del entrenador» y el bot puede reaccionar si llega una
convocatoria. Hoy se congela todo; eso se acaba.

### 5.2 Catálogo de sesiones (las once, con tres ajustes)

| sesión          | TSS s/n/f  | ganancia base                                      | cambio                                                                                                      |
| --------------- | ---------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| descanso_total  | 0          | —                                                  | igual                                                                                                       |
| descanso_activo | 25         | REC 0,25                                           | igual                                                                                                       |
| fondo           | 70/90/110  | RES 0,45 · LLA 0,15 · **REC 0,10 solo en `suave`** | «la recuperación se construye rodando suave»                                                                |
| umbral          | 85/105/125 | LLA 0,40 · COL 0,20                                | igual                                                                                                       |
| puertos         | 90/115/140 | MON 0,45 · RES 0,15                                | igual                                                                                                       |
| sprint          | 60/75/90   | SPR 0,45 · COL 0,10                                | igual                                                                                                       |
| crono           | 60/80/100  | CRI 0,45 · **LLA 0,10**                            | la crono también hace rodar                                                                                 |
| bajada_paves    | 55/70/85   | DES 0,30 · PAV 0,30                                | igual; **riesgo de lesión** (§5.7)                                                                          |
| gimnasio        | 50         | SPR 0,15 · COL 0,10                                | **fragilidad efectiva ×0,95 mientras haya ≥ 1 gimnasio en los últimos 7 días** (SPEC 5.1); riesgo de lesión |
| video_tactica   | 10         | TAC 0,20                                           | baja de 0,30: la táctica se aprende corriendo (§4.3)                                                        |
| viaje           | 15         | —                                                  | igual, lo pone el sistema                                                                                   |

Bonus de grupo igual (`groupTrainingMultiplier`).

### 5.3 Los bloques (plantillas de siete días)

Cada bloque es una función pura `blockWeek(block, archetype, focus, intensity, dayOfWeek) →
TrainingChoice`. `E` = sesión de énfasis (D3): la sesión que más sube el atributo elegido
(`sessionsForAttribute(attr)[0]`), o la carta del arquetipo si no hay énfasis:

| arquetipo        | carta                     |
| ---------------- | ------------------------- |
| escalador        | puertos                   |
| sprinter         | sprint                    |
| rodador          | umbral                    |
| contrarrelojista | crono                     |
| puncheur         | umbral (COL)              |
| clasicómano      | bajada_paves              |
| todoterreno      | puertos / umbral alternos |
| gregario         | fondo                     |

| bloque           | L              | M               | X               | J              | V               | S               | D              | TSS/sem (normal) | para qué                                                     |
| ---------------- | -------------- | --------------- | --------------- | -------------- | --------------- | --------------- | -------------- | ---------------- | ------------------------------------------------------------ |
| **base**         | fondo          | descanso_activo | fondo           | E              | descanso_activo | fondo           | descanso_total | ~430             | construir CTL sin hundir TSB; pretemporada, vuelta de lesión |
| **construccion** | umbral         | E               | descanso_activo | puertos        | E               | fondo           | descanso_total | ~560             | subir atributos; TSB baja a −15/−25                          |
| **especifico**   | E              | descanso_activo | E               | video_tactica  | E               | bajada_paves    | descanso_total | ~470             | afilar lo que pide el objetivo                               |
| **afinado**      | E suave        | descanso_activo | umbral suave    | descanso_total | E suave         | descanso_activo | descanso_total | ~230             | TSB a +5/+15 el día del objetivo                             |
| **recuperacion** | descanso_total | descanso_activo | descanso_activo | fondo suave    | descanso_activo | gimnasio        | descanso_total | ~200             | tras una vuelta; REC y fragilidad                            |

Los días de carrera y de viaje sustituyen al bloque (como hoy). Un bloque `construccion` a `fuerte`
son ~700 TSS: la única forma de llegar a TSB −35 entrenando, y ahí viven las molestias (§5.7).

### 5.4 Banister, forma y el objetivo

Sin cambio en `applyDailyLoad`, `tsbFactor`, `formIndex`, `mForm`, `initialEnergy`. Lo nuevo es
**enseñarlo hacia delante**: la pantalla del plan simula el plan de 28 días con las mismas funciones
puras (`sessionTss`, `applyDailyLoad`) y pinta:

- La curva de **fitness/frescura** prevista día a día (mismas barras que el perfil).
- En cada día de carrera del horizonte: **«Llegarás: fresco / a punto / cargado / pasado»** según el
  TSB previsto (≥ +18 pasado · +5..+18 a punto · −10..+5 fresco-cargado · < −10 cargado · < −25
  hundido). Con las palabras de `conditionLabel`, no con el número.
- La ganancia prevista por atributo en el bloque, como **rango** (talento desconocido: se calcula con
  kTal 0,8 y 1,2): «Mountain +0,6..+0,9». Es honesto y sirve para comparar dos planes.

Con eso, «preparar el pico para Race France es una habilidad del jugador» (SPEC §4) se puede
ejercer: hoy no hay forma de saber si el plan lleva al pico.

### 5.5 Periodización

- **28 días**: los cuatro bloques de D2. El bot los rellena (§5.6); el jugador los cambia.
- **Temporada**: el bot no planifica más allá de los 28 días, pero **el jugador sí puede fijar hasta
  tres objetivos de temporada** (`rider_race_prefs.wanted` ya existe; se añade `priority A/B`). Los
  objetivos A del jugador son lo que el bot mira al rellenar los bloques cuando entran en el horizonte.
- Pretemporada (días 0-27 de la temporada): el bot pone `base` salvo objetivo.

### 5.6 El entrenador bot: «razonable, nunca óptimo», con reglas escritas

`coachPlan(ctx) → { blocks: Block[4], focus, intensity }`, pura, en `shared/training.ts`, con
`ctx = { gameDay, archetype, ctl, atl, races: {startDay, endDay, stages, isGoal}[], lastRaceEnd,
lastRaceStages }`. Reglas, en orden:

1. Si terminó una vuelta de ≥ 5 etapas hace ≤ 7 días → `recuperacion`.
2. Si hay carrera de ≥ 3 etapas o cualquier objetivo A en los próximos 7 días → `afinado`.
3. Si hay carrera en 8-14 días → `especifico`.
4. Si no → alterna `construccion, construccion, base` en ciclo de tres semanas (3:1 clásico).
5. Énfasis: siempre `carta` (el bot afila lo suyo; nunca tapa agujeros).
6. Intensidad: siempre `normal`.

Lo que le hace **razonable**: descansa antes de correr, recupera después, toca todos los atributos,
mira el calendario. Lo que le hace **nunca óptimo**, y por dónde le gana un humano que sabe:

| palanca              | bot               | humano que juega bien                                                               |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| duración del afinado | siempre 7 días    | 5 días si REC alto (TSB sube más deprisa), 9 si bajo                                |
| intensidad           | siempre normal    | `fuerte` en construcción cuando TSB > −10; `suave` la semana antes de una carrera B |
| énfasis              | su carta          | el agujero que pide el objetivo (DES para un final en bajada, PAV para Flandes)     |
| carreras A/B         | trata todas igual | afina solo para la A; usa las B como entrenamiento (§4.3: correr enseña)            |
| grupo                | ignora            | alinea sus sesiones de grupo con el plan del equipo (+12 %)                         |
| sobrecompensación    | no la aprovecha   | recuperación corta y bloque `construccion` justo después de una vuelta              |

Y por dónde **pierde** un humano que juega mal: `fuerte` sin descanso → TSB −35 → molestias (×0,5
en ganancias), dado de enfermar, `kReady` 0,25; afinar sin haber construido → llega fresco y vacío
(fitness bajo: `mTankFitness` 0,92); descansar demasiado → detraining.

Todo esto se **mide** en el banco (§7.3), no se afirma.

### 5.7 Descanso, sobreentrenamiento, lesión, enfermedad

| estado                                | cómo se entra                                                                                                        | dura           | efecto                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------- |
| **molestias** (hoy nunca)             | día de entrenamiento con TSB < −35 → `p = 0.06 · fragilidad`; o `bajada_paves`/`gimnasio` → `p = 0.004 · fragilidad` | `U{2..4}` días | `mHealth 0.96` (existe); ganancias ×0,5; **se entrena** |
| **enfermo**                           | `illnessProbability` (igual)                                                                                         | `U{2..6}`      | igual                                                   |
| **lesionado** entrenando (nuevo)      | `bajada_paves` → `p = 0.0015 · fragilidad`; `gimnasio` → `0.001 · fragilidad`; caída en carrera (igual)              | `U{4..12}`     | `mHealth 0.90`, sin sesión                              |
| **sobreentrenado** (aviso, no estado) | la UI lo dice cuando el TSB previsto baja de −30                                                                     | —              | —                                                       |

La fragilidad efectiva baja ×0,95 con gimnasio semanal (§5.2). Dado de enfermar en carrera: igual
(«NO SE SUBE MÁS», v38). Tras enfermedad ≥ 4 días el bot mete `base` una semana.

### 5.8 Feedback: por qué mejoré, por qué no

1. **`rider_attr_log.source`** (migración): `entrenamiento | carrera | sobrecompensacion |
declive | detraining`. Hoy no se distingue nada.
2. **Informe del bloque** (cada 28 días, y a demanda en el perfil): por atributo, el delta y su
   desglose: «Mountain +1,8 · 1,1 racing (Race Alps, .WT) · 0,9 training (9 climbing sessions) · −0,2
   age». Sin números internos del atributo: solo deltas y estrellas.
3. **El entrenador habla** (SPEC 5.6, canal difuso): frases generadas por reglas, una por bloque:
   - talento > 65 y edad ≤ 23: «Progresas más deprisa de lo que esperaba a tu edad.»
   - `kDim` < 0,15 en la carta: «En esto estás cerca de lo que puedes dar; el margen está en otro
     sitio.»
   - REC ≥ 70: «Recuperas rápido: puedes afinar más corto.»
   - fragilidad > 1,3: «Eres propenso a caer enfermo cuando te cargas: cuidado con las semanas
     fuertes.»
   - edad ≥ declineAge: «Toca defender lo que tienes y seguir aprendiendo oficio.»
4. **Sensaciones del día** en el informe de carrera (§6): «Buen día» / «Día flojo» cuando el ruido de
   consistencia salió fuera de ±1σ. El jugador entiende que no todo es plan.

### 5.9 Instalaciones y staff

La economía mínima que da sentido a `kInst`/`kStaff` y a la división:

|                                    | nivel 0 | nivel 1           | nivel 2             | nivel 3               |
| ---------------------------------- | ------- | ----------------- | ------------------- | --------------------- |
| `teams.facilities_level` → `kInst` | 0,95    | 1,00              | 1,05                | 1,10                  |
| coste semanal (WT / PRS / CON)     | 0       | 1.500 / 700 / 300 | 4.000 / 1.800 / 800 | 9.000 / 4.000 / 1.800 |

`team_staff (team_id, kind, level)` con `kind ∈ {entrenador, medico}`, nivel 0-2:

| staff      | efecto nivel 1 / 2                                       | coste semanal WT (÷2 PRS, ÷4 CON) |
| ---------- | -------------------------------------------------------- | --------------------------------- |
| entrenador | `kStaff` 1,05 / 1,10                                     | 1.200 / 3.000                     |
| médico     | fragilidad efectiva ×0,90 / ×0,80; molestias ×0,7 / ×0,5 | 1.000 / 2.500                     |

- NPC por división al nacer: WT instalaciones 2-3 y staff 1-2; PRS 1-2 / 0-1; CON 0-1 / 0. Es una
  razón concreta por la que subir de división cambia la carrera de un corredor, y por la que un
  continental no acaba siendo Pogačar entrenando lo mismo.
- Agente libre: `kInst 0.95`, sin staff. Firmar da algo más que salario. **[DECISIÓN DEL DUEÑO]**
  los números y si el agente libre paga el −5 %.
- El banco de mundo corre con los valores por división (hoy con 1). Mánager humano (G2): decide
  niveles; el gasto sale de `teams.budget` en la nómina semanal (`teamEconomy.ts` ya dice «sin gastos
  de staff todavía»).

### 5.10 Viaje

Igual: lo pone el sistema, gana a cualquier orden, 15 TSS, sin ganancias. En el plan se enseña por
adelantado con destino (ya está).

---

## 6. Cómo entra todo esto en la etapa

Lo que cambia en `db/stageRun.ts` antes de `simulateStage`:

```
tsb        = ctl − atl
ruidoDia   = 1 + clamp( N(0, consistency), −2.5σ, +2.5σ )     // rng sembrado (worldSeed, riderId, gameDay, 'dia')
eff0[a]    = attr[a] · mForm(ctl, tsb) · mHealth · mMorale · ruidoDia    // el ruido es UNO por corredor y día, común a los 10
energy0    = initialEnergy(ctl, tsb, health)                              // igual
matches    = matchCount(eff0, tsb, deepDepletedYesterday)                 // con REC dentro (§2.3)
```

- **`eff0`**: se le añade el ruido de consistencia. Rango total pasa de ≈[0,81, 1,07] a ≈[0,77, 1,12]
  en el 1 % de los casos; en la mediana no se mueve. Vive en la capa de datos y en `banister.ts` como
  función pura `dayNoise(consistency, rng)`: **el motor de etapa no cambia y las huellas selladas no
  se mueven** (los bancos siembran `eff0` a mano).
- **Depósito inicial**: igual (`TANK`). La forma (CTL/TSB) sigue siendo la única vía; no se inventa
  ningún estado paralelo (Cambio 0).
- **Cerillos**: REC entra (§2.3). `matchCount` lo llama `stageRun.ts` y la web; hay que comprobar con
  grep si algún banco de `sim/` lo usa con `tsb` real; si lo hace, la huella se mueve y se re-sella
  con justificación.
- **Erosión, ley de velocidad, pájara, remates** (salvo CRI en `solitario`, decisión aparte): **no se
  tocan**.
- **Tras la etapa**: `tss = 5·workUnits` igual; `applyDailyLoad` igual; `raceLearning` v2 con `hizo`
  (necesita del resultado: `estado`, `posicion`, `movKm` acumulados, `pullFor`/rol), también para no
  finishers (0,4); sobrecompensación al cerrar una vuelta ≥ 5 etapas; `rider_attr_log.source =
'carrera'`.
- Fragilidad al motor de caídas: **no** (sigue siendo el LÍMITE de v14; recalibración de caídas aparte).

---

## 7. Equilibrio del mundo

### 7.1 Los cuatro frenos y para qué sirve cada uno

| freno                                   | evita                                              | dónde                      |
| --------------------------------------- | -------------------------------------------------- | -------------------------- |
| presupuesto de talento sobre los techos | que todos puedan llegar a 5★ en tres cosas         | `creation.ts`, `npc.ts`    |
| forma del arquetipo con SD 8            | el pelotón plano y la falta de especialistas puros | `NPC.archetypeShape`       |
| juventud (gap por edad)                 | bots «ya hechos» y una media que solo sube         | `NPC.youthGap`             |
| instalaciones/staff por división        | que el continental entrene como el WT              | `train.ts`, `sim/world.ts` |

Y el que evita el otro miedo («nadie pasa de 4 en nada»): el don global del humano (se mantiene) y el
primario en 76 de cada arquetipo (a un SD de 84). El banco lo vigila con `sinNadaSobre4Pct`.

### 7.2 Qué mide el banco de mundo (`sim/world.ts`) — nuevas filas de `WorldSeasonRow`

| métrica                     | qué                                                                     | banda propuesta                                                                |
| --------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `cincoEstrellasWTPct`       | % del WT con ≥ 1 físico 5★ (84+)                                        | **≤ 15 % en TODAS las temporadas** (banda del dueño, hoy solo medida al nacer) |
| `cracksPct`                 | ≥ 3 físicos 5★ (existe)                                                 | pico **≤ 15 %** (hoy alarma 35, medido 12-25) **[DECISIÓN DEL DUEÑO]**         |
| `sinNadaSobre4Pct`          | existe                                                                  | ≤ 30 % al final (hoy 40)                                                       |
| `anchoP90P10`               | existe                                                                  | ≥ 10 (igual)                                                                   |
| `congeladosPct`             | redefinido: techo = atributo en TODO lo físico **y edad ≤ peakAge**     | 0 %                                                                            |
| `mezclaArquetipos`          | % por `born_archetype`, por división                                    | cada uno dentro de ±5 pp de `archetypeMix` en t25 (el relevo no sesga)         |
| `especialistasPurosPct`     | mejor físico − tercero mejor ≥ 20                                       | ≥ 25 %                                                                         |
| `dispersionIntra`           | media de la SD de los 9 físicos de cada corredor                        | ≥ 9 (si baja, el mundo se aplana hacia el todoterreno)                         |
| `crecimientoJoven`          | media de (Σ físicos a los 24 − Σ a los 19) de los que pasaron por ambas | ≥ +60 puntos (≈ +7 por atributo)                                               |
| `mejorDelMundoPorArquetipo` | el mejor SPR es sprinter, el mejor MON escalador…                       | ≥ 90 % de las temporadas                                                       |
| `aporteCarrera`             | media global con carreras − sin (existe)                                | > 1 punto en t15 (igual)                                                       |

### 7.3 Humano bueno contra bot, medido

Brazo nuevo del banco (`sim/world.ts`, opción `politica: 'bot' | 'buena' | 'mala'`) sobre un mismo
corredor sembrado y el mismo calendario de 65 días de carrera:

- `buena`: afinado de 5-9 días según REC, `fuerte` en construcción si TSB > −10, énfasis en el
  atributo que pide la siguiente carrera A, `recuperacion` corta tras vueltas.
- `mala`: `construccion fuerte` siempre, sin afinado.

Bandas: `buena` llega a los días de carrera con `formIndex` medio ≥ bot + 0,06 y gana ≥ +8 % de puntos
de atributo al año; `mala` ≤ bot − 0,05 de forma y ≥ 2× días enfermo/molestias. Si esto no sale, el
sistema no cumple «razonable, nunca óptimo» y hay que mover las palancas de §5.6, no la banda.

### 7.4 Sobre el 15 % «de momento» y G9

«Cuando haya humanos buenos bajaremos eso a 0». El diseño lo deja preparado en una sola perilla:
`NPC.divisionOffset.WT` (hoy 0). Bajarlo a −4 mueve a todos los bots un escalón sin tocar
diferencias, que es la receta que ya funcionó en la v58. No se hace aquí.

---

## 8. Plan de implementación por pasos

Convenciones del repo que aplican a todos: constantes en `constants.ts` con comentario y el porqué;
cambio de conducta ⇒ `ENGINE_VERSION++` y nota en `docs/balance.md`; huellas selladas
(`attribution.test.ts`, `timetrial.test.ts`, `raceRadio.test.ts`) idénticas salvo justificación
escrita; `SPEC.md` §3 y §5 se reescriben al final (paso 11) para que dejen de estar caducos
(mapa-spec §2.1: «desactualizado», §2.3: «El SPEC §5 no recoge nada de eso»).

### Paso 0 — Limpieza previa (sin cambio de diseño)

- Ficheros: `apps/web/src/domain/trainingPlan.ts` (pasar `archetype` a `defaultCoachPlan`),
  `packages/db/src/riders.ts::createRider` (fijar `ctl/atl/morale` desde `BANISTER.initialCtl/Atl` =
  40 y `MORALE.mean`), `packages/db/src/schema.ts` + migración `0033_attr_log_source.sql`
  (`rider_attr_log.source text not null default 'entrenamiento'`), `train.ts` y `stageRun.ts`
  escriben `source`.
- Migraciones: 0033.
- Huellas/bancos: ninguno.
- Hecho: la previsualización del plan coincide con lo que aplica el servidor (test en
  `trainingPlan.test.ts`); un corredor nuevo nace con CTL 40 (test en `riders.test.ts`); toda fila
  nueva de `rider_attr_log` lleva origen.
- Modelo: **Haiku**.

### Paso 1 — Escala visible

- Ficheros: `packages/shared/src/rider.ts` (`attrStars` a medias, `attrStarsWhole`,
  `ATTRIBUTE_DESCRIPTIONS` reescritas), `apps/web/src/components/AttributeList.tsx` (marca de
  progreso, tendencia), `apps/web/src/components/StarRating.tsx` (medias), `apps/api/src/routes/riders.ts`
  (`GET /api/riders/me/trend` → deltas 30 días por atributo y origen desde `rider_attr_log`;
  `GET /api/riders/:id` aplica ruido de ojeador `N(0,4)` sembrado por `(id, semana)` salvo propio),
  `packages/engine/src/sim/world.ts` (usa `attrStarsWhole`).
- Migraciones: ninguna.
- Huellas/bancos: `sim/world.test.ts` debe dar idéntico (los umbrales enteros no se mueven).
- Hecho: el perfil propio enseña medias estrellas, barra de progreso y flecha; el ajeno enseña
  estrellas con ruido semanal estable; `world.test.ts` verde sin cambios de valores.
- Modelo: **Sonnet** (API + componente); Haiku para las descripciones.

### Paso 2 — Arquetipos, presupuesto de talento y juventud

- Ficheros: `packages/shared/src/rider.ts` (`ARCHETYPES`, `ARCHETYPE_LABELS`, `ARCHETYPE_SHAPE`,
  mapa de vocaciones antiguas; `VOCATIONS` se mantiene como alias deprecado un paso),
  `packages/engine/src/constants.ts` (`NPC.archetypeShape/archetypeMix/divisionOffset/youthGap`,
  `CREATION.talentBudgetBase 40 / talentBudgetSlope 1.6 / budgetBaseline 50 / tacCeiling*`; borrar
  `divisionPrimaryMu`, `adjacentDrop`, `restDrop`, `ceilingBoost`, `youngAge`, `primeAge`),
  `packages/engine/src/world/npc.ts` (genoma nuevo: techos → recorte → atributos por edad),
  `packages/engine/src/creation.ts` (mismo recorte; don global se queda; semilla por `riderId`),
  `packages/db/src/schema.ts` + `0034_arquetipos.sql` (enum `archetype` con los ocho; `UPDATE` de los
  cinco antiguos; `rider_hidden.born_archetype`, `rider_hidden.consistency` con default sorteado en
  el repair), `packages/db/src/world.ts` y `rollover.ts::insertNeopro` (sortean arquetipo por
  `archetypeMix`), `apps/api/src/routes/riders.ts` (`vocationSchema` → ocho), `apps/web/src/pages/Create*.tsx`
  (silueta de potencial), `world/callups.ts::KIND_AFFINITY` (fila por arquetipo nuevo),
  `world/autoOrders.ts` (si lee vocación).
- Migraciones: 0034. **Los corredores existentes conservan techos y atributos** (no se les vuelve a
  tirar el dado; la v58 ya lo hizo una vez con 0032). Se les asigna `born_archetype` por el mapa de su
  vocación y `consistency` sorteada. **[DECISIÓN DEL DUEÑO]** si se aplica el recorte por talento a
  los bots existentes ≤ 23 años (script `worldRepair.ts`, solo baja techos, nunca atributos).
- Huellas/bancos: `npc.test.ts`, `creation.test.ts` se reescriben; `sim/world.test.ts` cambiará de
  valores (población distinta) → se recalibra la tabla de §3.1 hasta cumplir §7.2; `attribution` y
  `timetrial` intactos. `ENGINE_VERSION++` (cambia el mundo que nace).
- Hecho: 4.000 bots WT recién nacidos en plenitud: ≤ 15 % con un 5★; mezcla de arquetipos ±2 pp;
  bot de 19 años tiene su primario ≥ 15 puntos por debajo del de 27 del mismo genoma; nadie con
  techo < 45 en su primario.
- Modelo: **Sonnet**.

### Paso 3 — Crecimiento unificado

- Ficheros: `packages/engine/src/progression.ts` (`kAge(clase, …)`, `kReady` en rampa, `kHealth`,
  detraining no a ≤ 20, «entrenado esta semana» vía `trainedLast7: Set<Attribute>` en el contexto),
  `constants.ts::TRAINING` (tablas `kAgeMotor/kAgeFisiologia/kAgeOficio`, `recDeclineLead 2`,
  `detrainingMinAge 21`), `packages/db/src/train.ts` (pasa `trainedLast7` desde `rider_attr_log`),
  `sim/world.ts` (idem).
- Migraciones: ninguna.
- Huellas/bancos: `progression.test.ts` reescrito; `world.test.ts` recalibrado junto al paso 2.
- Hecho: test de `progression.test.ts`: un escalador de 20 años sube MON ≥ 2× lo que a los 27; REC
  decae desde `declineAge − 2`; TAC crece a los 34; nadie a ≤ 20 pierde por detraining.
- Modelo: **Sonnet**.

### Paso 4 — Aprendizaje en carrera v2

- Ficheros: `packages/engine/src/world/learning.ts` (`raceLearning({…, hizo, talent, age, peakAge,
declineAge})`, `kDimRace`, DES en media/reina, REC en vueltas desde la 4.ª, `tourSupercompensation(n)`),
  `constants.ts::LEARNING` (`did: {grueso 1, mov 1.5/1.6, top10 1.3/1.4, win 1.3/1.8, dnf 0.4, gregario
1/1.3}`, `movKmMin 30`, `dailyCap 1.0`, `supercompRes 0.10`, `supercompMinStages 5`),
  `packages/db/src/stageRun.ts` (calcula `hizo` de `result` + telemetría de `mov`; aplica también a no
  finishers; al cerrar la vuelta aplica la sobrecompensación; `source='carrera'|'sobrecompensacion'`),
  `sim/world.ts` (sortea `hizo` con la distribución medida en el banco canónico: 8 % mov, 6 % top-10).
- Migraciones: ninguna.
- Huellas/bancos: ninguna huella (post-etapa). `learning.test.ts` reescrito.
- Hecho: fugado 30 km en una .Pro aprende ≥ 3× que uno del grueso en una .2; DNF aprende 0,4; el Tour
  completo da +1,5..+2 RES; `aporteCarrera` > 1 en t15.
- Modelo: **Sonnet**.

### Paso 5 — REC en los cerillos y consistencia del día

- Ficheros: `packages/engine/src/stage/physics.ts::matchCount` (REC), `constants.ts::STAGE`
  (`matchRecWaiver 75`, `matchTsbPenaltyRecSlope 0.2`), `packages/engine/src/banister.ts::dayNoise`,
  `packages/db/src/stageRun.ts` (ruido en `eff0`, rng `'dia'`), `apps/web/src/pages/RiderProfile.tsx`
  (`MatchRow` usa la misma cuenta), `RaceEffortLog`/`LastRaceReport` («sensaciones»).
- Migraciones: ninguna (`consistency` viene del paso 2).
- Huellas/bancos: `grep matchCount packages/engine/src/sim` — si algún banco lo llama con TSB, su
  huella se mueve y se re-sella con la justificación «REC entra en los cerillos». `attribution`/
  `timetrial` no deberían moverse (eff0 sembrado). `ENGINE_VERSION++`.
- Hecho: dos corredores iguales salvo REC 30/90 salen con cerillos distintos tras un día de vaciado
  profundo; la huella de `attribution.test.ts` idéntica; el informe dice «Buen día» en ≈ 16 % de las
  carreras.
- Modelo: **Sonnet**.

### Paso 6 — Salud: molestias, lesión de entrenamiento, gimnasio

- Ficheros: `progression.ts` (molestias por TSB y por sesión, lesión por sesión, ganancias ×0,5 en
  molestias, fragilidad efectiva con gimnasio semanal), `constants.ts::HEALTH` (`soreTsb −35`,
  `soreBase 0.06`, `soreSessionBase 0.004`, `soreDays 2..4`, `injurySession {bajada_paves 0.0015,
gimnasio 0.001}`, `injuryDays 4..12`, `gymFragilityFactor 0.95`), `db/train.ts` (pasa
  `gymLast7: boolean`), `apps/web/src/domain/health.ts` (textos de molestias/lesión).
- Migraciones: ninguna (`molestias` ya está en el enum).
- Huellas/bancos: ninguna. `world.test.ts`: días perdidos por salud/temporada en [4, 14] (banda nueva).
- Hecho: un corredor con `construccion fuerte` cuatro semanas seguidas tiene ≥ 60 % de probabilidad
  de al menos un episodio de molestias; con `normal`, ≤ 15 %.
- Modelo: **Sonnet**.

### Paso 7 — Entrenador bot v2 y bloques

- Ficheros: `packages/shared/src/training.ts` (`BLOCKS`, `blockWeek()`, `coachPlan(ctx)`,
  `ARCHETYPE_CARD`; `defaultCoachPlan` se reimplementa encima y se deprecia), `packages/db/src/schema.ts`
  - `0035_training_plans.sql` (`training_plans (rider_id, start_day, block_1..4, focus_attr, intensity,
goal_race_id)`, `team_training_plans` igual por equipo; `rider_race_prefs.priority`),
    `packages/db/src/train.ts` (precedencia: orden del día > bloque del corredor > bloque del equipo >
    `coachPlan`; construye `ctx` con `riderSchedule.ts`), `apps/api/src/routes/riders.ts`
    (`GET/PUT /api/riders/me/plan`, `PUT /api/riders/me/race-prefs` con `priority`), `sim/world.ts`
    (usa `coachPlan` con su calendario de 65 días).
- Migraciones: 0035.
- Huellas/bancos: `world.test.ts` recalibrado (el bot ahora descansa antes de correr: el aporte de la
  carrera sube). Brazos `bot/buena/mala` de §7.3 entran aquí.
- Hecho: `coachPlan` cumple las seis reglas en test; el brazo `buena` cumple §7.3; guardar un plan
  no crea órdenes en días no tocados.
- Modelo: **Sonnet** (lógica y banco); **Haiku** para el pegamento API/esquema.

### Paso 8 — UI del plan

- Ficheros: `apps/web/src/pages/Training.tsx` (objetivo, cuatro chips de bloque, énfasis, intensidad,
  previsión de forma día a día con `applyDailyLoad`, «Llegarás: …» en cada carrera, rango de
  ganancias; día a día plegado), `apps/web/src/domain/trainingPlan.ts` (simulación pura del plan),
  `apps/web/src/api/training.ts`, `RiderProfile.tsx` (informe del bloque, frase del entrenador,
  «Declining»).
- Migraciones: ninguna.
- Huellas/bancos: ninguno.
- Hecho: un jugador puede fijar objetivo, cambiar un bloque y ver moverse la etiqueta «Llegarás»
  antes de guardar; el informe del bloque desglosa por origen.
- Modelo: **Sonnet**.

### Paso 9 — Instalaciones y staff

- Ficheros: `schema.ts` + `0036_instalaciones_staff.sql` (`teams.facilities_level int default 0`,
  `team_staff (team_id, kind, level)`), `packages/engine/src/world/teamEconomy.ts` (costes,
  `facilitiesFactor()`, `staffFactor()`, `defaultFacilitiesFor(division, rng)`),
  `constants.ts::FACILITIES`, `packages/db/src/economy.ts` (gasto semanal), `db/world.ts` (NPC por
  división), `db/train.ts` (`kInst`, `kStaff`, fragilidad con médico), `sim/world.ts` (por división),
  pantalla de equipo (solo lectura hasta G2).
- Migraciones: 0036.
- Huellas/bancos: `world.test.ts` recalibrado por última vez en esta serie.
- Hecho: un WT y un CON con el mismo genoma y plan divergen ≥ 8 % en ganancia anual; presupuestos de
  los equipos NPC estables a 25 temporadas (`teamEconomy.test.ts`).
- Modelo: **Sonnet**.

### Paso 10 — Banco de mundo v2

- Ficheros: `sim/world.ts` (métricas de §7.2, brazos de §7.3), `sim/world.test.ts` (bandas),
  `sim/worldCli.ts` (imprime la tabla nueva), `docs/balance.md` (nota «vNN: rediseño del
  entrenamiento», con la tabla t1/t5/t10/t15/t25 antes/después).
- Hecho: todas las bandas de §7.2 y §7.3 verdes en 2 mundos × 25 temporadas; ninguna banda «sentada
  encima de su suelo» (margen ≥ 2× la desviación medida entre semillas).
- Modelo: **Sonnet**.

### Paso 11 — Retiro voluntario, CRI en `solitario` (si el dueño dice sí) y SPEC

- Ficheros: `apps/api/src/routes/riders.ts` (`POST /api/riders/me/retire`, edad ≥ 30), `rollover.ts`,
  `constants.ts::finishWeights.solitario` + re-sellado de `attribution.test.ts` con nota, `SPEC.md`
  §3 y §5 reescritos con lo implementado.
- Modelo: **Haiku** (retiro, SPEC); **Sonnet** (re-sellado).

Orden recomendado: 0 → 1 → 2 → 3 → 4 → 7 → 8 → 5 → 6 → 9 → 10 → 11. El 2-3-4 forman la tanda de
«qué es un ciclista»; el 7-8 la de «qué decide el jugador»; el 5-6-9 se pueden hacer en paralelo por
personas distintas porque no comparten ficheros salvo `constants.ts`.

---

## 9. Decisiones que son del dueño

| #   | decisión                                                                                                                          | recomendación y por qué                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Medias estrellas** subdividiendo las bandas actuales (5★ sigue en 84+) o mover el 5★ a 90+                                      | Subdividir. La banda «< 15 %» y el banco se midieron con 84+; moverlo cambiaría la métrica sin cambiar el mundo.                  |
| 2   | **Ocho arquetipos** y que el humano los elija con silueta de potencial, elección definitiva (con ventana de 90 días para recrear) | Sí. Es la única decisión con coste que tiene el jugador antes de correr, y hoy no existe.                                         |
| 3   | **Banda de cracks** en t15: ≤ 15 % (hoy alarma 35, medido 12-25, «número a discutir»)                                             | 15 %. Con el presupuesto de talento debería salir solo; si no sale, el que está mal es el presupuesto, no la banda.               |
| 4   | **CRI en el remate `solitario`** (0,15, quitando 0,10 a LLA y 0,05 a RES)                                                         | Sí, en tanda propia: mueve huellas y resultados de producción. Sin esto CRI sigue siendo un atributo de un solo día.              |
| 5   | **REC dentro del motor** (recarga de la reserva W′) además de los cerillos                                                        | No por ahora. Los cerillos ya le dan cara en carrera sin tocar la física ni las huellas; la reserva es recalibración de montaña.  |
| 6   | **Instalaciones/staff**: los números de §5.9 y si el agente libre paga `kInst 0,95`                                               | Sí al −5 %: firmar tiene que valer algo más que el salario. Los costes son punto de partida para `teamEconomy.test.ts`.           |
| 7   | **Recorte por talento a los bots existentes ≤ 23** (solo baja techos) o solo a los que nacen                                      | Solo a los nuevos + repair a los ≤ 23. Sin el repair, la generación actual sigue siendo una fábrica de cracks 8 temporadas más.   |
| 8   | **Retiro voluntario** desde los 30                                                                                                | Sí. Cumple N2 y da al jugador el control del final de su partida, que hoy le llega «por sorpresa a los 39».                       |
| 9   | **Consistencia del día**: oculta con «sensaciones» en el informe, o visible como atributo                                         | Oculta. Un atributo «Consistency» en la ficha sería un número más que explicar; una frase después de la carrera se entiende sola. |
| 10  | **Fragilidad al motor de caídas**                                                                                                 | No en esta serie (LÍMITE de v14; recalibra todas las caídas). Queda donde estaba.                                                 |
| 11  | **Rol declarado editable** separado del arquetipo de nacimiento                                                                   | Sí: hoy ya funciona así de facto («no toca techos ni atributos»); solo se le pone el nombre correcto.                             |
| 12  | **`video_tactica` baja a 0,20** para que TAC venga sobre todo de correr                                                           | Sí. «El oficio se aprende corriendo» es del SPEC y del dueño; entrenarlo en vídeo debe ser el complemento.                        |

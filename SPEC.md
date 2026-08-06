# Cycling Star - Documento de Diseño y Arquitectura Técnica

Versión 0.6. Fuente de verdad del proyecto (SPEC.md). Toda constante numérica de este documento vive en `packages/engine/src/constants.ts` y es ajustable por balance; los valores aquí escritos son los iniciales v0.

## 0. Historial de cambios

### v0.6

- Inercia de grupo: separación entre velocidad objetivo (ley de 6.4) y velocidad real, perseguida con aceleraciones acotadas en unidades físicas (km/h por segundo), asimétricas (pedalear 0.4, gravedad 1.5, frenar 3.0) e invariantes a la resolución. La coronación de un puerto y la entrada a una rampa emergen sin casos especiales.
- El cerillo compra aceleración (cota multiplicada por 2.5 durante el impulso): el W prima financia los cambios bruscos de ritmo, como manda la fisiología.
- Controlador del pelotón (6.9): histéresis recalibrada de 0.15 a 0.40 por decisión; la inercia mecánica vive ahora en la velocidad y la organizativa en el compromiso.
- Nuevo invariante de inercia (6.17). El efecto acordeón intragrupo y los abanicos quedan explícitamente fuera hasta v2 (los grupos son masas puntuales).

### v0.5

- Motor reescrito sobre bloques de 100 metros (`dx = 0.1 km`): relojes de tiempo por grupo, una sola ley de velocidad para todo el juego, y boquetes que se integran en vez de estimarse (quedan derogadas las fórmulas cerradas de pérdida y de caza de v0.4).
- Marco de riesgos: todo evento aleatorio se especifica como intensidad `λ` por kilómetro y se convierte por bloque con `p = 1 - exp(-λ·dx)`. La invariancia de resolución pasa a ser un test del Montecarlo.
- El pelotón como controlador con histéresis: decisiones cada 1 km, física cada 100 m; el desgaste de los gregarios que tiran limita la caza de forma emergente.
- Sociología de la fuga: relevos, escaqueo, tensión y ataques internos. Metas volantes y cimas puntuables como banners disputables del perfil.
- CRI, cronoescalada y CRE unificadas en el mismo bucle (grupos de uno, sin rebufo, sin hazards de ataque).
- TSS de competición derivado del gasto real que reporta el motor (5.1).

### v0.4

- Talento reformulado como vector de techos por atributo. La vocación sesga los techos pero no garantiza élite vocacional; se conserva un don global mínimo en algún atributo (constante ajustable) y re creación libre hasta el día 90 de la primera temporada (3.4, 3.5).
- `K_dim` anclado al techo personal (5.2) y nuevos canales de descubrimiento del talento (5.6).
- Creación: país preseleccionado por IP y generador de nombres por país con regeneración y lista de bloqueo de profesionales reales (3.6).
- Motor: coste y selección en función de la pendiente real, con tramos dentro de puertos y descensos; drafting decreciente con la pendiente; muros resueltos con COL; categorías de montaña derivadas y relegadas a la contabilidad de puntos (6.2, 6.5, 6.9); nuevos invariantes (6.15).
- Cerillos: asimetría del vaciado profundo (6.6).

### v0.3

- Nueva sección 6.16: sistema completo de órdenes de etapa (roles con objetivo, mentalidad combativa, marcaje de rivales con contramedida de amagos, protección mediante gregarios, táctica de equipo y disciplina contractual).
- Modelo de datos: `stage_orders` ampliada (`target_rider_id`, `mentality`), nueva tabla `team_tactics`, campo `team_trust` en `riders`.
- Las convocatorias (7.3) ponderan ahora la confianza del equipo.

### v0.2 respecto a v0.1

- Forma emergente con modelo de Banister (condición, fatiga, balance). Se elimina la forma aleatoria.
- Visibilidad de baja resolución: el jugador nunca ve números internos; ve estrellas de 0.5 a 5.
- Equipos: los usuarios pueden fundar equipos y nombrarlos (con moderación). Los equipos NPC quedan como andamiaje del mundo.
- Nombres de carreras con el esquema Race + Geografía (Race France, Race Italy, Race Spain).
- Motor de etapa especificado al nivel de fórmula y pseudocódigo.
- Modelo de datos completo con tipos.
- Infraestructura: se asume el plan Hobby de Railway ya contratado.

## 1. Visión general

Juego persistente de navegador por ticks. Cada usuario encarna a un ciclista profesional de los 18 años al retiro: entrena, firma contratos, disputa un calendario calcado del real (con nombres propios), acumula palmarés y envejece. Los usuarios veteranos pueden además fundar y dirigir equipos. Pilares: una decisión significativa por día de juego, el mundo avanza sin ti (órdenes en cola), motor de carrera creíble y narrable, progresión larga, cero pay to win.

## 2. El tiempo del mundo

- 1 día de juego = 6 horas reales (tick con cron `0 */6 * * *`). 4 días de juego por día real.
- Temporada = 364 días de juego (unos 91 días reales). El ciclista cumple un año por temporada.
- Días 1 a 14 pretemporada; 15 a 290 competición; 291 a 364 receso y mercado.
- El tick es idempotente, con `pg_advisory_lock`, y procesa en orden los días pendientes si algún cron falló (una transacción por día de juego).

## 3. El ciclista

### 3.1 Atributos (escala interna continua)

Diez atributos, valor interno `float` en `[1, 99]`:

`RES` Resistencia, `REC` Recuperación, `LLA` Llano, `MON` Montaña, `COL` Colinas, `CRI` Contrarreloj, `SPR` Sprint, `DES` Descenso, `PAV` Pavés, `TAC` Táctica.

### 3.2 Visibilidad: estrellas, nunca números

El jugador jamás ve el valor interno. Toda magnitud expuesta (atributos, Forma, Frescura) se muestra en estrellas de media en media:

```
stars(x) = clamp( round(x / 10) / 2 , 0.5 , 5 )      // x en [0,100]
// 85.64 -> round(8.564)=9 -> 4.5 estrellas
```

- Ciclista propio: estrellas exactas (redondeo fiel) más una flecha de tendencia si el atributo varió más de 0.5 puntos internos en los últimos 7 días de juego (subida, bajada o estable).
- Ciclistas ajenos: informe de ojeador con ruido, `stars(x + N(0, 4))`, recalculado como máximo una vez por semana de juego. La imprecisión es deliberada: crea mercado de scouting.
- Consecuencia de diseño: dentro de una misma media estrella caben hasta 5 puntos internos; dos corredores "iguales" a la vista no lo son. El jugador infiere su nivel real por resultados, no por hoja de cálculo.

### 3.3 Estados dinámicos (internos, vista en estrellas o iconos)

- `CTL` condición (carga crónica), `ATL` fatiga (carga aguda), `TSB = CTL_ayer - ATL_ayer` balance. Ver sección 4.
- Forma (estrellas): derivada de CTL y TSB. Frescura (barra 0 a 100 en UI): derivada de TSB.
- Moral `MOR` en `[0,100]`. Salud: `sano | molestias(dias) | enfermo(dias) | lesionado(tipo, dias)`.
- Cerillos: esfuerzos supraumbral disponibles en carrera, visibles como iconos (2 a 5). Ver 6.6.

### 3.4 Atributos ocultos (nunca expuestos, ni en estrellas)

- Techos: vector `techo_a` por atributo, el genoma del corredor. Ningún atributo puede entrenarse por encima de su techo. Muestreo en 3.5.
- `talento` en `[0,100]`: velocidad de aprendizaje (alimenta `K_talento`, 5.2), `Beta(2, 4.5) * 100`.
- `fragilidad` en `[0.6, 1.8]`: `LogNormal(mu=0, sigma=0.25)` recortada.
- `peak_age` entera `U{26..31}`; `decline_age = peak_age + U{3..6}`.

### 3.5 Creación: vocación, no arquetipo

El usuario declara una vocación, que sesga tanto los valores iniciales como los techos, sin garantizar élite vocacional. La estructura fina del genoma se descubre jugando (5.6).

| Vocación | Primarios | Adyacentes |
|---|---|---|
| Escalada | MON, RES | COL, REC |
| Velocidad | SPR, LLA | TAC, REC |
| Clásicas | COL, PAV | LLA, DES |
| Crono | CRI, LLA | RES, REC |
| Fondo | RES, REC | MON, LLA |

```
valores iniciales: primarios N(46,3) | adyacentes N(38,3) | resto N(30,3) | TAC en U(25,32)

techos:
  bias_a = primario 1.0 | adyacente 0.5 | resto 0.0
  mu_a   = 58 + 12 * bias_a                 // el peso 12 es LA perilla entre fantasia y loteria
  techo_a = clamp( N(mu_a, 9), 45, 96 )     // correlaciones suaves en constants.ts (MON~RES +, SPR~MON -)

don global (constante GLOBAL_GIFT = true, ajustable):
  si max(techo) < 82 -> el atributo argmax se eleva a U(82, 90)
  // no se garantiza que seas escalador; se garantiza que eres ciclista
```

Válvula de escape: re creación gratuita e ilimitada hasta el día 90 de la primera temporada (descarta palmarés, dinero y progreso). Después, solo el retiro voluntario estándar. La tasa de abandono de la beta arbitrará el peso 12 y la existencia del don global.

### 3.6 Flujo de creación: país por IP y generador de nombres

- País preseleccionado por geolocalización de IP: en producción, tras el proxy gratuito de Cloudflare, leyendo la cabecera `CF-IPCountry`; alternativa autónoma, base GeoLite2 country consultada en local (mmdb, gratuita con atribución). La IP se usa al vuelo y no se persiste. El país es siempre editable (VPN, expatriados) y, confirmado, alimenta campeonato nacional y Mundial.
- Generador de nombres: paquetes estáticos por país en `packages/db/data/names/{cc}.json` con nombres de pila por género y apellidos ponderados por frecuencia (fuentes censales públicas, con diacríticos). Botón regenerar ilimitado antes de confirmar (RNG con semilla por clic); el nombre es inmutable después.
- Lista de bloqueo `data/pro_blocklist.json`: toda combinación que coincida con un ciclista profesional real se descarta y regenera en silencio, tanto para usuarios como para NPC (el servicio de nombres de la sección 10 es el mismo).

`TAC` inicia siempre bajo: el oficio se aprende corriendo.

## 4. Fisiología: modelo de Banister

La forma no es un dado: es la consecuencia contable de la carga. Cada día de juego `t` el ciclista acumula una carga `TSS_t` (suma de sesiones y competición, tabla en 5.1) y actualiza dos medias móviles exponenciales:

```
tauFatiga_i = 5 + 5 * (1 - REC/100)          // 5 dias si REC=100, 10 si REC=0
tauFitness  = 42

ATL_t = ATL_{t-1} + (TSS_t - ATL_{t-1}) / tauFatiga_i
CTL_t = CTL_{t-1} + (TSS_t - CTL_{t-1}) / tauFitness
TSB_t = CTL_{t-1} - ATL_{t-1}                // se calcula ANTES de aplicar la carga del dia
```

Estado inicial de un neoprofesional: `CTL = 45, ATL = 45`. La Recuperación, obsérvese, no es un modificador cosmético: acorta literalmente la constante de tiempo de la fatiga.

### 4.1 Forma y multiplicador de rendimiento

```
tsbF(TSB):                       // rendimiento por frescura relativa
  TSB <= -35            -> 0.00
  -35 < TSB <= -10      -> lerp(0.00, 0.55)
  -10 < TSB <= +5       -> lerp(0.55, 0.95)
  +5  < TSB <= +18      -> 1.00           // meseta optima: el "pico de forma"
  +18 < TSB <= +35      -> lerp(1.00, 0.65)
  TSB  > +35            -> 0.55           // desentrenado o rancio

fitF      = clamp(CTL / 95, 0, 1)
formIndex = 0.55 * tsbF(TSB) + 0.45 * fitF          // en [0,1]
M_form    = 0.92 + 0.13 * formIndex                  // en [0.92, 1.05]

FormaEstrellas   = stars(100 * formIndex)
FrescuraUI       = clamp(55 + 1.1 * TSB, 0, 100)     // barra, no estrellas
```

La lectura de juego es la real: entrenar fuerte sube CTL y ATL a la vez (mejoras pero rindes peor); afinar antes de un objetivo evapora ATL sin apenas perder CTL y te coloca en la meseta `TSB` de +5 a +18. Preparar el pico para Race France es una habilidad del jugador.

### 4.2 Rendimiento efectivo al tomar la salida

```
M_salud: sano 1.00 | molestias 0.96 | enfermo 0.90 (si corre, normalmente no corre)
M_moral = 0.98 + 0.04 * MOR/100

eff0(a) = attr_a * M_form * M_salud * M_moral        // para cada atributo a
```

### 4.3 Enfermedad

Riesgo diario evaluado en el tick:

```
p_enfermo_dia = 0.002 * fragilidad * exp( max(0, -TSB - 22) / 9 )
```

Con `TSB = -40` y fragilidad 1.4 la probabilidad diaria ronda el 2%. Enfermo: 2 a 6 días sin entrenar, `TSS = 0`, pierde la convocatoria activa. El sobreentrenamiento debe doler por esta vía, no por un cartel.

### 4.4 Moral

Eventos: victoria +12, podio +7, top10 +3, fuga del día +2, no convocado a carrera deseada 6 negativos, abandono 8 negativos, renovación +10, sin equipo 10 negativos. Regresión diaria a la media: `MOR += (60 - MOR) * 0.03`.

## 5. Entrenamiento y progresión

### 5.1 Catálogo de sesiones (carga TSS y ganancia base por día, intensidad normal)

| Sesión | TSS (suave/normal/fuerte) | Ganancia base `G` (puntos internos/día) |
|---|---|---|
| Descanso total | 0 | nada |
| Descanso activo | 25 | nada |
| Fondo | 70 / 90 / 110 | RES .45, LLA .15 |
| Umbral | 85 / 105 / 125 | LLA .40, COL .20 |
| Puertos | 90 / 115 / 140 | MON .45, RES .15 |
| Series de sprint | 60 / 75 / 90 | SPR .45, COL .10 |
| Técnica de crono | 60 / 80 / 100 | CRI .45 |
| Bajada y pavés | 55 / 70 / 85 | DES .30, PAV .30 |
| Gimnasio | 50 | SPR .20 y reduce fragilidad efectiva 5% ese mes |
| Vídeo y táctica | 10 | TAC .30 |
| Viaje | 15 | nada |

Carga de competición: derivada del gasto real que reporta el motor: `TSS_carrera = 40 + 2.5 * unidades de tanque gastadas`. Una llana tranquila ronda 150; una alta montaña disputada, 220; una CRI corta, 90. La fuga y el orden a fondo ya no suman aparte: se reflejan en el gasto.

### 5.2 Fórmula de ganancia por entrenamiento

```
K_talento = 0.6 + talento/100                        // [0.6, 1.6]
K_edad(edad):
  edad <= peak-6            -> 1.15
  peak-5 .. peak-2          -> 1.05
  peak-1 .. peak+1          -> 0.95
  peak+2 .. decline         -> 0.75
  edad > decline            -> 0.40
K_dim  = attr >= techo_a ? 0
       : min( 1.2, ((techo_a - attr) / max(10, techo_a - 30))^1.3 )   // decrecientes hacia el techo personal
K_inst = instalaciones del equipo, [0.90, 1.20]
K_staff= staff personal contratado, [1.00, 1.15]
K_ready= TSB < -30 ? 0.25 : 1.0                      // entrenar reventado apenas rinde
K_int  = suave 0.70 | normal 1.00 | fuerte 1.25

delta_attr = G(sesion, attr) * K_talento * K_edad * K_dim * K_inst * K_staff * K_ready * K_int
```

Órdenes por planificador de 7 a 28 días; sin orden, se aplica el plan del entrenador del equipo (razonable, nunca óptimo).

### 5.3 La carrera también entrena (XP de carrera)

El motor devuelve por corredor `workUnits[dominio]`: unidades de energía gastadas por tipo de esfuerzo (montaña, llano, pavés, descenso, sprint, crono). En el tick:

```
delta_attr_dom = 0.010 * workUnits[dom] * K_talento * K_edad * K_dim     // cap 0.60/dia
TAC += 0.05 por dia de carrera, +0.15 extra si top10 de etapa o fuga     // mismo cap
```

DES, PAV y TAC progresan casi exclusivamente así: el oficio no se aprende en solitario.

### 5.4 Sobrecompensación (el premio de la gran vuelta)

Si se detecta un bloque de 6 o más días consecutivos con `TSS >= 140` seguido de 4 o más días con `TSS <= 60`, al cuarto día de descanso se aplica una única vez:

```
CTL += min(8, 0.04 * sum(TSS del bloque) / 10)
bonusXP = 1.2 puntos internos repartidos proporcionalmente a workUnits del bloque
```

Encadenar carreras sin descansar jamás cristaliza el bono: solo fatiga.

### 5.5 Decaimiento

- Detraining: si `CTL < 35`, atributos físicos pierden 0.03/día adicionales.
- Edad: si `edad > decline_age`, atributos físicos pierden `0.020 + 0.004 * (edad - decline_age)` por día; entrenar el atributo esa semana reduce la pérdida al 40%. `TAC` nunca decae; `DES` y `PAV` decaen al 25% del ritmo.

### 5.6 Descubrimiento del talento

Los techos (3.5) son ocultos; se revelan por tres canales, siempre en lenguaje difuso:

- Respuesta al entrenamiento: si la ganancia semanal de un atributo cae en el decil superior de su cohorte de edad, el entrenador lo comenta en el buzón ("responde de manera excepcional a las series"). Sin números.
- Test de esfuerzo: uno por temporada, coste 400, sobre un racimo de dos atributos a elección. Reporte: `stars( techo_a + N(0, 6) )`. Estimación, no certeza.
- La carretera: la relación entre `workUnits` invertidos y resultados obtenidos es el oráculo definitivo.

## 6. Motor de etapa por bloques de 100 metros (`packages/engine`)

### 6.1 Principios y contrato

```
simulateStage(input: StageInput, seed: string) -> { events: RaceEvent[], results: StageResult[],
                                                     workUnits: Map<riderId, Units>, incidents: Incident[] }
```

- Paso de integración fijo: `dx = 0.1 km`. Una etapa de 180 km son 1,800 bloques; con 160 corredores, del orden de 3·10^5 evaluaciones elementales por etapa: milisegundos en Node. La resolución no se paga en rendimiento; se paga en disciplina matemática (6.8).
- Función pura y determinista. Prohibido `Date.now()`, `Math.random()` y todo acceso a base de datos.
- RNG mulberry32 con subflujos nominales: `rng("hazard")`, `rng("sprint")`, `rng("crash")`. Refactorizar una fase no altera las demás.
- `seed = sha256(worldSeed, raceId, stageDay, engineVersion)`.
- El replay no se guarda: se guarda el snapshot de entrada (`stage_snapshots`) y se regenera bajo demanda. Los resultados sí se materializan.

### 6.2 Entradas: autoría en tramos, simulación a 100 metros

Los perfiles se diseñan a escala humana (tramos) y el motor los muestrea a la resolución de simulación. Nadie escribe 1,800 números a mano.

```
segmento (autoria) = { km, tipo: llano|rompepiernas|puerto|descenso|paves, tramos?: [{ km, g }], estrellas? }
banners            = [{ km, tipo: meta_volante | cima }]
// la categoria de una cima se DERIVA, solo para puntos y relato:
//   score = sum( km_i * g_i^2 ) con g_i > 2  ->  cat4 >= 40 | cat3 >= 120 | cat2 >= 300 | cat1 >= 600 | HC >= 1000

sampleProfile(stage, dx = 0.1) -> bloque[i] = { g, tipo, estrellas?, banner? }    // i = 0..N-1
```

`StageInput` como en v0.4 (riders con eff0, cerillos, órdenes, contexto de general) más `banners`.

### 6.3 Grupos y tiempo: la carrera como relojes paralelos

La simulación mueve grupos, no puntos. Cada grupo es un cursor sobre el recorrido con su cronómetro acumulado:

```
Grupo = { riders[], t_s (crono acumulado), v_actual (km/h, arranca en 35 tras la salida neutralizada),
          compromiso [0,1], coop, tension, relevadores[] }
gap entre dos grupos en el bloque i = diferencia de sus t_s al cruzarlo
captura si gap <= 5 s  -> fusion de grupos
```

Consecuencia central del cambio: los boquetes ya no se estiman, se integran. Un descolgado rueda a su propia velocidad y su pérdida es la integral de la diferencia de ritmos, bloque a bloque. Las fórmulas cerradas de v0.4 (pérdida `0.45·g·|m|·km`, cierre `6.5·compromiso·...`) quedan derogadas: eran aproximaciones de lo que ahora se calcula de verdad.

### 6.4 La ley de velocidad (una sola para todo el juego)

```
w(g)   = clamp( (g - 2) / 6 , 0.15, 1.0 )
muro   = subida total <= 2.5 km con g >= 8  -> el atributo de subida es COL en vez de MON

perfil_i(bloque):
  subida   -> w(g) * effNow(MON o COL) + (1 - w(g)) * effNow(LLA)
  llano    -> effNow(LLA)                  (rompepiernas usa g = 1.5)
  paves    -> 0.6 * effNow(PAV) + 0.4 * effNow(LLA)
  descenso -> effNow(DES)

vRef(g) km/h: subida clamp(44 - 2.7*g, 14, 44) | llano 44 | paves 38 | descenso 55
ritmo(c) = 0.90 + 0.35 * c                 // c = compromiso del grupo: 0 tempo, 1 a bloque

v_objetivo(bloque) = vRef(g) * ( P75(perfil de quienes marcan el ritmo) / 75 )^0.34 * ritmo(c)
```

La misma ley sirve al pelotón, a la fuga, al descolgado solitario y a la contrarreloj: cambian los inputs, no la física.

Inercia: la velocidad real persigue a la objetivo con aceleraciones acotadas. Las cotas se expresan en km/h por segundo (jamás por bloque: misma doctrina de invariancia que las intensidades de 6.8) y son asimétricas:

```
dt = 3600 * dx / v_actual                    // segundos que dura el bloque (Euler explicito, dt de entrada)

ACC_PEDAL = 0.4  km/h por s                  // acelerar a potencia, en llano o subiendo
ACC_GRAV  = 1.5  km/h por s si g <= -2       // la gravedad regala: coronar es una rampa de 2 o 3 bloques
ACC_FINAL = 1.5  km/h por s en los ultimos 20 bloques (trenes y sprint)
DEC_MAX   = 3.0  km/h por s                  // frenar, o estrellarse contra una rampa
impulso de cerillo activo -> la ACC aplicable se multiplica por 2.5
                             // el W prima financia los cambios bruscos de ritmo

v_actual += clamp( v_objetivo - v_actual, -DEC_MAX * dt, +ACC * dt )
t_s      += 3600 * dx / v_actual
```

Consecuencias emergentes, sin casos especiales: la coronación (14 a 55 km/h) toma 250 a 400 metros; una rampa del 8% embestida a 45 km/h desangra la velocidad en un bloque y medio; el ataque que destroza un grupo pequeño sí produce un salto violento, por la doble vía legítima del cerillo (aceleración multiplicada) y del desplome del P75 del grupo roto. El efecto acordeón dentro de un grupo y los abanicos no se modelan (los grupos son masas puntuales): v2.

### 6.5 Coste, tanque y drafting por bloque

`E0` como en v0.4 (Resistencia y TSB). Por cada bloque:

```
costeBase(g, tipo) en unidades/km:
  paves -> 0.55 + 0.06*estrellas | g <= -3 -> 0.10 | -3 < g < 0 -> lerp(0.10, 0.30) | g >= 0 -> 0.30 + 0.11*g
draftMax(g): llano 0.32 | descenso 0.25 | paves 0.18 | subida clamp(0.32 - 0.028*g, 0.08, 0.32)
shelter_i: protegido 0.9 | rotando/trabajando 0.4 | fugado que releva 0.5 | solo 0.0

coste_i = dx * costeBase * ritmo(c)^1.6 * (1 - draftMax(g) * shelter_i)
E_i -= coste_i
```

La altitud (penalización por encima de 1,500 m) sigue explícitamente fuera hasta v2.

### 6.6 Cerillos (esfuerzos supraumbral discretos)

```
comp     = 0.50 * max(MON, COL) + 0.30 * RES + 0.20 * LLA        // con eff0
cerillos = 2 + (comp>=55) + (comp>=72) + (comp>=88)              // 2..5
si TSB < -25: cerillos -= 1 (minimo 1)
```

Gastar un cerillo cuesta 5 unidades de tanque y otorga +10 al atributo del terreno durante los 5 bloques siguientes (500 m). Usos: atacar, seguir, cerrar hueco, aguantar un ritmo superior. Sin recarga en v0 (v1: medio cerillo tras 25 km de valle a ritmo tempo). Visibles como iconos antes, durante y después de la etapa.

Asimetría del vaciado profundo: quien termina con `E < 0.12 * E0` o sufre pájara arranca el día siguiente con un cerillo menos, acumulable con la resta por `TSB` (mínimo 1). Una noche no repone un vaciado total.

### 6.7 Erosión por vaciado (durabilidad)

```
depl    = clamp(1 - E_i/E0_i, 0, 1)
umbral  = 0.35 + 0.40 * RES_i/100
erosion = max(0, (depl - umbral) / (1 - umbral))
coefErosion: SPR .45 | COL .35 | MON .30 | LLA .25 | CRI .25 | PAV .20 | TAC .15 | DES .10
effNow(a) = eff0(a) * (1 - coefErosion[a] * erosion^1.2)
E_i <= 0  -> pajara: atributos fisicos * 0.55 y descuelgue automatico
```

### 6.8 El marco de riesgos: intensidades, nunca probabilidades por bloque

Regla de oro del motor: todo evento aleatorio se especifica como una intensidad `λ` en eventos por kilómetro, y la probabilidad por bloque se deriva:

```
p_bloque(evento) = 1 - exp( -λ * dx )        // dx = 0.1
```

Por qué es innegociable: las probabilidades por bloque componen de forma contraintuitiva sobre 1,800 ensayos (con p = 0.001 por bloque, el 16.5% de las etapas no tendría ni un ataque) y no son invariantes a la resolución (afinar a 50 m duplicaría los eventos del juego). Con intensidades, el balance se piensa en unidades humanas ("0.8 ataques esperados por cada 10 km de puerto") y la invariancia de resolución se verifica en el Montecarlo (6.17).

Intensidades v0 (ajustables):

```
fase de fuga (salida hasta consolidacion):  λ_ataque = 1.2 /km, ponderada por candidatos (6.10)
llano con fuga consolidada:                 λ_contraataque = 0.02 /km
puente (saltar del peloton a la fuga):      λ = 0.08 /km si gap ∈ [30 s, 150 s]; 0 fuera de esa ventana
puerto:                                     λ_ataque = 0.10 /km * (1 + agresividad media del grupo)
                                            ademas de los disparadores deterministas de 6.18
descuelgue:                                 λ = 0.9 * max(0, -m) /km, con m = perfil_i - P75 del grupo
   al dispararse: si hay cerillo y las ordenes lo permiten -> lo quema (+10 por 5 bloques) y sigue;
   si no, sale del grupo y rueda a su propia velocidad (el boquete se integra, 6.3)
caida:                                      la p de etapa (6.14) repartida como intensidad ponderada
                                            por bloques de riesgo (paves, descensos, ultimos 3 km)
```

### 6.9 El pelotón como controlador (decisiones a 1 km, física a 100 m)

La física corre en cada bloque; las decisiones, cada 10 bloques y con histéresis, para que el pelotón no sea una veleta:

```
cada 10 bloques, cada parte interesada emite un compromiso objetivo:
  sprinters (quieren captura hacia el km 12 a meta):
     cierreNecesario (s/km) = gap_s / max(1, kmRestantes - 12)
     factible si <= 8 s/km  -> compromisoObjetivo = cierreNecesario / 8
     si no es factible      -> abandonan la caza (evento: "los sprinters dan la etapa por perdida")
  equipos de la general:
     si gapVirtual del mejor fugado > 0.6 * su desventaja en la general -> compromisoObjetivo alto (limitar, no capturar)
  sin interesados -> compromisoObjetivo = 0.10 (rodar)

compromiso += ( max(compromisosObjetivo) - compromiso ) * 0.40        // histeresis organizativa: 1 a 3 km

el trabajo lo pagan los relevadores designados (gregarios con orden de caza, shelter 0.4):
cuando se vacian, el P75 de la ley de velocidad cae y el peloton afloja aunque quiera.
El actuador se desgasta: esa es la fisica de la caza fallida.
```

El cierre ya no es fórmula sino consecuencia: emerge de la diferencia entre `v_peloton` y `v_fuga`. La vieja regla empírica del minuto por cada 10 km pasa de ecuación a objetivo de calibración (6.17).

### 6.10 La fuga y su sociología

Formación emergente: durante la fase inicial, la intensidad alta de ataques (6.8) forma y deshace grupos; la fuga consolida cuando el compromiso del pelotón permanece bajo 0.25 durante 2 km seguidos (evento narrado: el pelotón da su brazo a torcer). Candidatos: órdenes cazaetapas y mentalidad supercombativa, más NPC con roll de combatividad; score `0.4·effNow(TAC) + 0.3·effNow(LLA) + 0.3·100·rng`. Los amenazados en la general tienen veto de facto: el pelotón no concede.

Cooperación y tensión, por kilómetro:

```
cada fugado decide relevar o escaquearse (IA u ordenes):
  se escaquea si SPR >= 70 (guarda para la llegada), si su equipo defiende la general detras,
  o si E < 40% de E0
coop = relevadores / total
v_fuga usa el P75 del perfil de los relevadores; el escaqueado paga coste con shelter 0.9
tension += 0.4 * (1 - coop) por km
si tension > 6: coop efectiva *= 0.7 (todos se miran) y λ_ataque interno *= 3
                (la fuga ataca para soltar al que va de rueda)
```

### 6.11 Metas volantes y cimas puntuables

Al cruzar un banner, el primer grupo en pasar que contenga interesados (órdenes de 6.18 o IA según clasificaciones en juego) disputa un mini sprint con la fórmula de 6.12 a intensidad reducida; coste 2 unidades de tanque.

```
meta volante: 20 | 15 | 12 | 10 | 8 | 6 | 4 | 2
cima:  HC 20|15|12|10|8|6|4|2   cat1 10|8|6|4|2|1   cat2 5|3|2|1   cat3 2|1   cat4 1
```

Que la fuga barra las metas volantes no es una regla: es la consecuencia de pasar primero.

### 6.12 Los últimos 2 kilómetros y los finales

Los 20 bloques finales activan lógica propia:

- Trenes y colocación (grupo > 25, meta llana): `leadout` y `pos` como en v0.4; `sprintScore_i = effNow(SPR) * (1 + bonusPos/100) * N(1, 0.045)`; mismo tiempo para el grupo. La erosión (6.7) sigue siendo el árbitro silencioso.
- Ataques tardíos: `λ_ataque = 0.5 /km` en los últimos 3 km si el grupo es < 25 o la meta no es llana pura (territorio de COL).
- Meta en repecho (<= 3 km, >= 5%): sprint con COL. Final en alto: no requiere fórmula de gaps; la ley de velocidad integra las diferencias sola.
- Fuga superviviente: entre fugados, hazard alto de ataques desde 20 km y sprint reducido si llegan juntos.
- `λ_caida` elevada en los bloques finales de llegadas masivas (6.14).

### 6.13 Contrarreloj, cronoescalada y CRE: el mismo motor

Una CRI es la misma simulación con grupos de un corredor: draft 0, hazards de ataque 0, compromiso fijo 0.85 (esfuerzo sostenido). La ley de velocidad, con su exponente 0.34 y el perfil por pendiente, resuelve llanas, onduladas y cronoescaladas sin una línea extra; la erosión castiga los recorridos largos. Ruido final `N(1, 0.006)` sobre el tiempo. Composite de perfil en crono: `0.75·CRI + 0.15·LLA + 0.10·RES` en llano, deslizando hacia MON con `w(g)` en subida. CRE: grupo de equipo con shelter medio 0.5 por relevos; marca el ritmo el cuarto mejor perfil multiplicado por 0.98. Política de dosificación (pacing) del jugador: v1.

### 6.14 Caídas e incidentes

```
p_caida_etapa = p_base * (1 + 0.5 * erosionMediaGrupo) * (1 - 0.35 * skill/100) * factorOrden
p_base: llano 2.5% | media 1.8% | montana 2.2% | paves 7% | CRI 0.8%
skill:  DES en descensos | PAV en paves | TAC en sprint
severidad: 60% sin daño (pierde 30 a 90 s) | 30% rasguños (eff -3% durante 3 a 6 dias)
           | 9% lesion leve (5 a 15 dias) | 1% grave (20 a 60 dias);  p(lesion|caida) * fragilidad
```

La `p` de etapa se reparte como intensidad `λ(bloque)` ponderada por los bloques de riesgo (6.8), de modo que las caídas ocurren donde ocurren en la vida: adoquines, bajadas y el embudo final.

### 6.15 Salidas

- `events`: `{ km, t_s, tipo, plantilla, protagonistas[], datos }`, renderizadas en el cliente (i18n barato).
- `results`: puesto, tiempo, bonificaciones (10, 6, 4 s), puntos de regularidad, metas volantes y montaña, estado.
- `workUnits` por dominio (alimenta 5.3 y el TSS de 5.1) e `incidents`.
- La serie `t_s` por grupo permite al replay dibujar el cursor de cada grupo sobre la altimetría SVG.

**Carreras de un día.** Una prueba de un día NO lleva bonificaciones de tiempo: no hay general que
construir, la etapa ES el resultado. El motor es puro y no sabe de calendarios, así que las reparte
siempre; quien conoce la estructura de la carrera (`packages/db`) las anula antes de persistirlas.
Por lo mismo, su clasificación general es una copia exacta del resultado de meta y no se muestra por
separado, y una caída grave no marca abandono (no quedan etapas a las que no tomar la salida).

**Desempate de la general.** El orden es: tiempo total, menor suma de puestos, mejor puesto en la
última etapa disputada y, como último criterio, el id del corredor. Los dos primeros son la regla del
ciclismo; el id no es deportivo, está para que el orden sea TOTAL y DETERMINISTA —con el pelotón
empatado a tiempo, sin él la base devolvía un orden arbitrario y distinto en cada consulta, y por ahí
se repartían los puntos de ranking—. `race_gc` acumula los dos criterios etapa a etapa igual que el
tiempo (`suma_puestos`, `ultimo_puesto`).

### 6.16 Pseudocódigo del bucle

```
function simulateStage(input, seed):
  rng     = mulberry32(seed)
  bloques = sampleProfile(input.stage, 0.1)
  grupos  = [pelotonInicial]
  for i in 0..N-1:
    if i % 10 == 0: decisiones(grupos, i)          // controlador con histeresis (6.9)
    for g in grupos:
      vObj  = leyVelocidad(g, bloques[i])          // 6.4
      g.v   = limitaInercia(g.v, vObj, bloques[i]) // 6.4: aceleraciones acotadas, cerillo x2.5
      g.t_s += 3600 * 0.1 / g.v
      costes(g, bloques[i])                        // 6.5 + erosion 6.7
      hazards(g, bloques[i], rng)                  // 6.8: ataques, puentes, descuelgues, caidas
    fusionesYCapturas(grupos)                      // gap <= 5 s
    if bloques[i].banner: disputaBanner(grupos, i) // 6.11
    if N - i <= 20: logicaFinal(grupos, i)         // 6.12
  return { events, results, workUnits, incidents }
```

### 6.17 Invariantes de balance (Montecarlo, `pnpm sim`)

Sobre 1,000 simulaciones por escenario, el CI valida rangos objetivo (ajustables):

- Invariancia de resolución: `dx = 0.1` contra `dx = 0.05` produce medias de ataques, capturas y brechas dentro del 5%.
- Etapa llana: gana la fuga entre 2% y 8%; el mejor sprinter entre 30% y 45% con 3 sprinters de nivel; captura mediana de la fuga entre el km 25 y el km 8 a meta cuando los sprinters cazan.
- Pelotón comprometido en llano: cierra entre 50 y 75 segundos por cada 10 km (la vieja regla empírica, ahora objetivo de calibración).
- Alta montaña: fuga entre 25% y 45%; brecha mediana entre primero y décimo del día entre 1 y 4 minutos.
- Metas volantes: con fuga consolidada, la fuga captura más del 80% de los puntos de la volante.
- Pavés: 5% a 12% de bajas por caída; Spearman entre `PAV` y puesto superior a 0.5.
- CRI de 40 km: brecha percentil 90 a 10 de especialistas entre 2 y 4 minutos.
- Ningún atributo con correlación negativa con el rendimiento en su terreno.
- Marcaje: marcar al favorito reduce su probabilidad de victoria entre 8 y 20 puntos porcentuales; el marcador termina con `effNow(SPR)` inferior al de un escenario sin marcaje.
- Pendiente: dos puertos con la misma media (6%), uno regular y otro con rampas al 11%, producen en el irregular una brecha mediana al menos 1.5 veces mayor.
- Ataques en montaña: al menos el 60% se lanza en el decil de tramos más empinados.
- Inercia: fuera de impulsos de cerillo y de bloques con `g <= -2`, ningún grupo varía su velocidad más de 4 km/h entre bloques consecutivos; el tren del sprint tarda al menos 300 metros en pasar de 48 a 62 km/h.

### 6.18 Órdenes de etapa: el piloto automático

Doctrina: en un juego asíncrono el jugador no pilota, delega. Las órdenes son una política que el motor ejecuta en su nombre; el vocabulario debe ser expresivo sin degenerar en un lenguaje de programación. Las órdenes son secretas antes de la etapa y evidentes durante el relato, como en la carretera.

Capa 1, rol (con objetivo cuando aplica):

```
role: lider | sprinter | lanzador(de) | gregario(de) | cazaetapas | marcador(de) | libre
```

El objetivo (`target_rider_id`) debe estar inscrito; si abandona, el rol degrada a `libre` y se narra.

Capa 2, mentalidad (política de gasto de cerillos sin disparador explícito; escala las `λ` de ataque de 6.8):

```
multiplicador de λ_ataque personal: reservon 0 | oportunista 0.5 | combativo 1.5 | supercombativo 3.0
   modulado por clamp(cerillos_restantes/3, 0, 1) y por (TSB > -25 ? 1.0 : 0.5)
supercombativo puntua ademas como cazaetapas en la fase de fuga (6.10) aunque su rol sea libre
```

Capa 3, disparadores y disputas: atacar en el km X, atacar en el tramo más duro del último puerto, esperar al sprint, disputar metas volantes (sí/no), disputar cimas puntuables (sí/no).

Capa 4, marcaje. El marcador intenta vivir en la rueda del rival:

```
p_rueda = clamp( 0.35 + (effNow(TAC_m) - effNow(TAC_t)) / 80 - 0.10 * marcadores_extra, 0.15, 0.90 )
```

Cuando el objetivo ataca y el marcador está a rueda, la respuesta es automática (dentro de los 3 bloques siguientes) y quema un cerillo; el rebufo del ataque concede +4 de tolerancia:

```
margen = (effNow(atr)_m + 10) - (effNow(atr)_t + 10) + 4
margen >= 0       -> pegado a la rueda
-6 <= margen < 0  -> cede 1.2 * |margen| segundos pero mantiene contacto (puede reintegrarse en el valle)
margen < -6       -> se suelta y rueda a su velocidad: el boquete se integra (6.3)
```

Costes y contramedida: el marcador hereda el 85% del coste de cada arreón que sigue y su mentalidad queda forzada a reservón. El marcado, si su mentalidad es combativa o superior, puede amagar: cada amago cuesta 2 unidades sin cerillo y, con probabilidad `p_rueda`, obliga al marcador a quemar un cerillo en vano. Vaciarle la caja al sombra es la manera canónica de soltarlo.

Capa 5, protección y trabajo de equipo:

```
gregariosActivos = gregarios(del protegido) en su grupo con E > 25
shelter_protegido: >=3 -> 0.95 | 2 -> 0.90 | 1 -> 0.80 | 0 -> 0.55
gregario relevando: shelter 0.35 y su perfil entra en el P75 de la ley de velocidad del grupo que caza
```

La táctica de equipo por carrera (manager humano o IA) designa protegido y política de control de fuga (`nunca | si_amenaza | siempre`), que alimenta el compromiso del controlador (6.9). Corolario emergente: aislar al líder rival quemando a sus gregarios degrada su shelter de 0.95 a 0.55 y lo expone.

Disciplina: si la orden personal contradice el rol contractual (el gregario que corre libre y ataca), `team_trust -= U(5, 10)`; cumplir suma +1 por carrera. `team_trust` en `[0, 100]` pondera convocatorias (7.3) y renovaciones (7.2). La libertad existe y tiene precio.

## 7. Equipos, contratos y convocatorias

### 7.1 Equipos de usuarios y equipos NPC

- Cualquier usuario con reputación mínima (una temporada completada) puede fundar un equipo: elige nombre, colores y patrón de maillot (SVG paramétrico). Los equipos nuevos entran en división Continental.
- Moderación de nombres: filtro automático (lista de marcas registradas conocidas de ciclismo, groserías, homoglifos) + estado `pendiente | aprobado | rechazado` + botón de denuncia. Un nombre rechazado revierte a un nombre neutro generado. La responsabilidad por contenido de usuario obliga a moderación reactiva documentada.
- Equipos NPC como andamiaje: el mundo nace con 18 World Tour, 15 Pro Series y 24 Continental generados proceduralmente. A medida que los equipos de usuarios ascienden, los NPC descienden y se disuelven de forma natural. Objetivo a largo plazo: cúpula humana, base NPC.
- Gestión de equipo (v1 ligera): presupuesto, ofertas a corredores (humanos y NPC), inscripción a carreras, plantilla de 8 a 16, órdenes por defecto. Profundidad de manager real en v2.

### 7.2 Contratos

```
salarioOferta = S_div * (0.4 + 1.6 * percentilPuntos^1.4) * K_edadMercado * K_rol
S_div: WT 900 | PRS 450 | CON 200 (moneda del juego, por semana de juego)
K_edadMercado: <=22 1.10 | 23..29 1.00 | 30..32 0.85 | 33+ 0.65
K_rol: lider 1.25 | colider 1.10 | gregario 0.90 | libre 1.00
```

Duración 1 a 3 temporadas. Ventanas: final de temporada y días 180 a 200. La IA oferta por necesidad de plantilla (huecos por rol) y ajuste de presupuesto. Rescisión posible con cláusula (25% del restante).

### 7.3 Convocatorias

El equipo (IA o manager humano) alinea por carrera. El corredor marca deseos de calendario (`rider_race_prefs`); la probabilidad de convocatoria pondera puntos, rol contractual, forma reciente (estrellas, no interno), deseo y la confianza del equipo (`team_trust`, sección 6.18). No ser convocado a un objetivo marcado baja la moral: tensión deliberada.

## 8. Calendario y nombres de competición

Esquema legal adoptado: Race + Geografía. La marca protegida es el nombre comercial, no la geografía ni el formato. Prohibido imitar logotipos, tipografías o identidades visuales de las carreras reales (el amarillo con serifa característica, el rosa de la corsa, el arcoíris del campeón del mundo). Verificar cada nombre final contra EUIPO y USPTO antes del lanzamiento.

- Grandes vueltas (21 etapas + 2 descansos): Race Italy (mayo), Race France (julio), Race Spain (agosto y septiembre).
- Monumentos: Race Sanremo, Race Flanders, Race Roubaix, Race Liège, Race Lombardy.
- Una semana: Race Riviera, Race Two Seas, Race Basque Country, Race Switzerland, Race Alps, Race Down Under, Race Emirates.
- Campeonato del Mundo en septiembre (selecciones NPC en v1) y campeonatos nacionales el mismo día mundial (día 155).
- 60 a 70 carreras por temporada en tres niveles (WT, Pro Series, Continental); un corredor disputa 50 a 80 días según rol.

## 9. Economía

- Ingresos del corredor: salario semanal, premios (tabla por carrera: etapa WT 300, general WT 5,000 al líder con reparto decreciente), primas de podio del patrocinador personal: `50 * fama/10` por podio.
- Fama en `[0,100]`: victoria WT +4, monumento +8, gran vuelta +15, podios mitad, fuga televisada +0.5; decae 0.05/día.
- Gastos de mantenimiento mensuales (mejoras porcentuales, nunca permanentes): entrenador personal (K_staff 1.05 a 1.15), fisio (tauFatiga efectiva 0.5 días menos), nutricionista (E0 +3%), material (CRI y LLA efectivos +1 en carrera), vuelos premium (viaje sin TSS).
- Presupuesto de equipo: dotación por división y puntos: `B = B_div * (0.6 + 0.8 * percentilPuntosEquipo)`. Sin compra de moneda real en el MVP.

## 10. Generación del mundo NPC

```
worldSeed fijado al crear el mundo (tabla worlds)
atributo NPC ~ clamp( N(mu_rol_div, 8), 20, 95 )     // mu por rol y division, tabla en constants.ts
talento ~ Beta(2, 4.5) * 100;  fragilidad ~ LogNormal(0, 0.25) recortada [0.6, 1.8]
techos NPC: joven (<= 23) -> techo_a = clamp(attr_a + U(5, 30), attr_a, 96); veterano -> techo_a = attr_a
edades: distribucion 18..38 sesgada a 24..30;  nombres via el servicio de 3.6 (pools por pais + blocklist)
```

Cada temporada se retiran NPC mayores y se generan neoprofesionales (media de nivel ligada a la división) para mantener la población estable en unos 1,600 corredores.

## 11. Modelo de datos completo (PostgreSQL, Drizzle)

Convenciones: `id` uuid, `created_at timestamptz default now()`, dinero y tiempos en enteros (centavos y segundos), atributos internos `real`. Índices señalados con `IDX`.

```
worlds(id, world_seed text, engine_version int, created_at)

users(id, email citext unique, password_hash, locale, is_admin bool, created_at)

teams(id, world_id, name text, name_status enum(pendiente,aprobado,rechazado),
      owner_user_id uuid null,            -- null = NPC
      division enum(WT,PRS,CON), budget int, philosophy enum, jersey_seed text,
      facilities real,                    -- K_inst [0.90,1.20]
      points_season int)                  IDX(world_id, division)

riders(id, world_id, user_id uuid null,   -- null = NPC
       team_id uuid null, name, country char(2), gender,
       birth_season int, archetype enum, retired_at int null,
       money int, fame real, morale real, team_trust real,
       ctl real, atl real,                -- estado Banister
       health enum(sano,molestias,enfermo,lesionado), health_until_day int null,
       face_seed text)                    IDX(user_id) IDX(team_id) IDX(world_id, fame)

rider_attrs(rider_id, attr enum(RES,REC,LLA,MON,COL,CRI,SPR,DES,PAV,TAC),
            value real, PK(rider_id, attr))

rider_hidden(rider_id PK, talent real, ceilings jsonb, fragility real, peak_age int, decline_age int)

rider_daily_log(rider_id, game_day, tss real, ctl real, atl real, tsb real,
                activity enum, PK(rider_id, game_day))     -- grafica de forma y auditoria

rider_attr_log(rider_id, game_day, attr, delta real)        -- flechas de tendencia; purga a 60 dias

staff_contracts(id, rider_id, kind enum(entrenador,fisio,nutri,material,vuelos),
                level int, weekly_cost int, until_day int)

seasons(id, world_id, number int, started_real_at)

races(id, season_id, name, level enum(WT,PRS,CON), start_day int, days int,
      type enum(vuelta,clasica,cri,mundial,nacional))       IDX(season_id, start_day)

stages(id, race_id, day int, distance_km real, stage_type enum,
       profile_json jsonb)                 -- esquema de 6.2: tramos con pendiente
       IDX(race_id, day)

race_rosters(race_id, team_id, rider_id, role enum, PK(race_id, rider_id))

rider_race_prefs(rider_id, race_id, desire int, PK(rider_id, race_id))

stage_orders(stage_id, rider_id,
             role enum(lider,sprinter,lanzador,cazaetapas,gregario,marcador,libre),
             target_rider_id uuid null,       -- obligatorio para lanzador, gregario y marcador
             mentality enum(reservon,oportunista,combativo,supercombativo),
             effort enum(conservador,normal,afondo),
             attack_at_km real null, attack_last_climb bool,
             PK(stage_id, rider_id))

team_tactics(race_id, team_id, protected_rider_id uuid null,
             chase_policy enum(nunca,si_amenaza,siempre), PK(race_id, team_id))

training_orders(rider_id, game_day, session enum, intensity enum, PK(rider_id, game_day))

stage_snapshots(stage_id PK, seed text, engine_version int, input_json jsonb)  -- replay regenerable

stage_results(stage_id, rider_id, rank int, time_s int, bonif_s int,
              pts_sprint int, pts_kom int,
              status enum(ok,fuera_control,abandono,caida), PK(stage_id, rider_id))
              IDX(rider_id)

standings(race_id, rider_id, gc_time_s int, gc_rank int, pts int, kom int, youth_rank int,
          PK(race_id, rider_id))

contracts(id, rider_id, team_id, weekly_salary int, role enum,
          season_from int, season_to int, status enum(activo,oferta,rechazada,terminado))
          IDX(rider_id, status) IDX(team_id, status)

injuries(id, rider_id, kind, from_day int, until_day int)

transactions(id, rider_id null, team_id null, game_day int, amount int, concept text)
             IDX(rider_id, game_day)

news_items(id, world_id, game_day int, scope enum(mundo,carrera,equipo,corredor),
           race_id null, rider_id null, template text, params jsonb)   IDX(world_id, game_day desc)

name_reports(id, team_id, reporter_user_id, reason, resolved bool)

game_state(id=1, world_id, current_day int, season_id, last_processed_day int)

tick_log(id, started_at, days_processed int, duration_ms int, ok bool, notes text)

sessions / accounts / verification: tablas propias de better-auth
```

Orden del tick por día pendiente (una transacción): salud y enfermedad, viajes, entrenamientos (5.2), simulación de etapas del día (snapshot, seed, motor, resultados, standings, XP 5.3), sobrecompensación (5.4), decaimientos (5.5), economía, IA de equipos (convocatorias y ofertas en ventanas), noticias, avance de `current_day`. Rollover en día 364.

## 12. Infraestructura (Railway, plan Hobby existente)

- Servicio `web`: monolito Fastify que sirve API y estáticos de Vite.
- Servicio `tick`: mismo repositorio, arranque `node dist/scripts/tick.js`, Cron Schedule `0 */6 * * *`; corre, procesa y termina.
- Postgres de Railway en el mismo proyecto. Con el crédito incluido del plan Hobby, el consumo esperado del conjunto queda dentro de los 5 dólares mensuales ya contratados.
- Endpoint `POST /admin/tick` protegido para desarrollo y recuperación manual.

## 13. Ajustes al roadmap

Sin cambios de estructura respecto a v0.1, con estos matices: F1 incluye el país por IP y el generador de nombres con regeneración (3.6); F4 y F5 implementan el motor exactamente como la sección 6 y sus invariantes 6.17 son el criterio de "hecho"; F3 implementa Banister completo con la gráfica de forma del corredor (datos de `rider_daily_log`); F7 incluye la fundación de equipos por usuarios con moderación de nombres; F5 implementa la capa de órdenes de 6.18 en el motor y F6 su consola en la interfaz (roles con selector de objetivo, mentalidad y disparadores, dejables en cola para toda una vuelta).

## 14. Riesgos vigentes

1. Balance del motor: los invariantes 6.17 son contratos, no decoración; se corren en CI.
2. Legibilidad: estrellas y cerillos deben bastar para decidir; si el jugador necesita el número interno, la UI ha fracasado.
3. Moderación de nombres de equipos: obligación continua desde el primer usuario.
4. Verificación de marcas del esquema Race + Geografía y del propio nombre Cycling Star en EUIPO y USPTO antes del lanzamiento público.

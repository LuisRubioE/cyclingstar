# Mapa 06: la TELEVISIÓN como gramática de la retransmisión

Este mapa no describe el código: describe cómo cuenta una carrera la televisión, escrito para que un diseñador de software lo copie. Es para E2 lo que `docs/diseno/e1-generador/mapas/07-ciclismo-real.md` fue para el generador: la realidad contra la que medirse. Cada afirmación lleva su fuente entre corchetes. **[R]** es norma escrita, leída entera tras extraerla a texto en el scratchpad: Reglamento UCI Parte 1 (E0225, versión 01.02.2025), Parte 2 carretera (E0425, versión 01.04.2025) y el pliego de la UCI para organizadores (_Specifications for organisers_, enero 2026, cuyo §11 es «TV production»). **[W]** es una página web consultada el 26-09-2026, con su nombre. **[O]** es observación de retransmisiones del Tour, el Giro, la Vuelta y las clásicas de 2015 a 2026, sin contrastar con una grabación; lo que es [O] y pesa en el diseño vuelve a salir en la última sección.

El norte está en `docs/agenda.md` l. 505-515: cuánto queda, la diferencia («2' 14" y si sube o baja»), quién va en cada grupo, dónde estamos del perfil, el rótulo del momento y «nada más». Lo primero que enseña este mapa es que eso no es un gusto: **la UCI lo exige por escrito al productor de la señal** (§1.1). Donde la tele coincide con el vocabulario del motor se usa la palabra del motor: `RadioGroupKind` (`packages/engine/src/sim/raceRadio.ts` l. 63-73), `RaceEvent` (`packages/engine/src/stage/types.ts` l. 330-337) y los `tipo` que emite `packages/engine/src/stage/simulate.ts`. Los textos de pantalla que se proponen van en inglés (regla de `Claude.md`) y se marcan «(pantalla)»; los corredores de los ejemplos son inventados, el formato no.

---

## 1. Lo permanente: el estado que nunca se va

### 1.1 Lo que la UCI obliga a tener en pantalla

El pliego de la UCI, §11.2 «Race information system» (p. 30) [R], es la mejor especificación de «estado permanente» que existe. Pide al menos dos capas de grafismo y cuatro obligaciones más:

1. **Capa fija**: «distance remaining to the finish and main time gap. This overlay should be permanently viewed on screen. It is usually positioned at the top left of the screen». Dos datos y solo dos.
2. **Capa de posiciones**: cabeceras numeradas «1) front of the race, 2) chasing rider(s) or peloton, 3) peloton, 4) back of the race». «As soon as the image changes from one rider or group of riders to another, this rider or group should be named and their position in the race clearly identified». Los nombres del grupo van debajo de su cabecera.
3. **Diferencias generales**: «at least once every 3-5 minutes», con la misma numeración, y «in stage races, the overall time gap information shows the positions of the riders wearing the various leader's jerseys».
4. **Nombres**: «race number, surname, first name, nationality, team name», «as often as possible», y la composición de cada grupo «regularly».
5. **Velocidad, pendiente de subida o bajada, tiempo, dirección y fuerza del viento**: «regularly and systematically displayed». Y los lugares por los que pasa la carrera.
6. **En meta** las dos capas cambian de oficio: cronometraje, y resultados y clasificaciones con nombre, nacionalidad y equipo.

Consecuencia para el diseño: lo permanente son DOS números. Lo demás es periódico (cada 3-5 minutos) o va atado a un cambio de plano. Una pantalla que enseña veinte datos a la vez no copia a la tele: copia una hoja de cálculo.

### 1.2 Inventario de lo que se ve, con su frecuencia

| Elemento                    | Frecuencia                            | Formato real (es / fr)                                                                     | Formato propuesto (pantalla)                                 | Fuente                              |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------- |
| Km a meta de la cabeza      | permanente                            | «54,3 km», «à 54,3 km de l'arrivée»; en circuito, vueltas restantes y campana en la última | `54.3 km to go`, `3 laps to go`                              | [R] §11.2 y pliego §2.13            |
| Diferencia principal        | permanente                            | «2' 14"»                                                                                   | `+2:14`                                                      | [R] §11.2                           |
| Reloj de carrera            | frecuente, no obligatorio             | «4h 12' 33"» desde la salida real                                                          | `4:12:33`                                                    | [O]                                 |
| Cabecera del grupo en plano | a cada cambio de plano                | «TÊTE DE COURSE», «CABEZA DE CARRERA»                                                      | `1 · FRONT OF THE RACE · 5 riders`                           | [R] §11.2                           |
| Diferencias generales       | al menos cada 3-5 min                 | cuadro de 3-5 filas: posición, tamaño, hueco a la cabeza y maillots dentro                 | ver §1.6                                                     | [R] §11.2                           |
| Perfil con los grupos       | periódico, y al acercarse a un puerto | altimetría con una marca por grupo y el puerto que viene                                   | `Col du Tourmalet · HC · 17.1 km at 7.3% · summit in 6.2 km` | [R] §11.3 («map and profile») y [O] |
| Velocidad                   | periódica                             | «52 km/h»; «moyenne de la première heure : 47,3 km/h»                                      | `Speed 52 km/h`, `1st hour avg 47.3 km/h`                    | [R] y [O]                           |
| Pendiente                   | en toda subida y bajada               | «9 %», a veces la máxima que viene                                                         | `9%`                                                         | [R] §11.2                           |
| Meteo y viento              | periódica                             | «22 °C, viento de 25 km/h del noroeste», flecha contra la carretera                        | `22°C · Wind 25 km/h NW (crosswind)`                         | [R] §11.2                           |
| Maillots                    | en las diferencias generales          | icono del maillot en la fila del grupo donde va su dueño                                   | icono en la fila                                             | [R] §11.2                           |
| Lugar                       | al pasar                              | pueblo, castillo, patrimonio en la hora muerta                                             | `Saint-Lary-Soulan`                                          | [R] §11.2 («geographical features») |

### 1.3 Cómo se nombran los grupos

| En carretera                       | Castellano                                                                | Pantalla (en)                     | Francés / italiano                                         | En el motor                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primer grupo, nacido de un ataque  | «cabeza de carrera», «escapada», «fuga»                                   | `Front of the race`, `Breakaway`  | «tête de course», «échappée» / «testa della corsa», «fuga» | `fuga` (raceRadio.ts l. 64-65)                                                                                                                                            |
| Entre la cabeza y el pelotón       | «perseguidores», «contraataque», «grupo cazador»                          | `Chasers`, `Counter-attack`       | «contre-attaque», «poursuivants» / «inseguitori»           | `contra` (l. 66-67)                                                                                                                                                       |
| Uno o dos sueltos entre dos grupos | «tierra de nadie», «entre dos aguas»                                      | `In no man's land`                | «entre deux eaux» / «terra di nessuno»                     | **no coincide**: en el motor `tierra` es un movimiento que ha quedado DETRÁS del pelotón o a su altura (l. 70-71, 370-378); el suelto por delante del pelotón es `contra` |
| El grupo principal                 | «pelotón», «gran grupo»                                                   | `Peloton`, `Bunch`                | «peloton» / «gruppo»                                       | `peloton`, nombre que solo se gana con dos tercios de los que siguen en carrera (`PELOTON_MIN_SHARE`, l. 91-99)                                                           |
| El del líder en una carrera rota   | «grupo del maillot amarillo», «grupo de favoritos», «el grupo de Pogačar» | `Yellow jersey group`, `GC group` | «groupe maillot jaune» / «gruppo maglia rosa»              | no existe como nombre; el dato para darlo sí: `watching` guarda por grupo y km a maillots y favoritos (l. 567-571)                                                        |
| Descolgados de montaña             | «grupeta», «autobús»                                                      | `Gruppetto`, `Autobus`            | «gruppetto», «autobus»                                     | `grupeto` (l. 72-73)                                                                                                                                                      |
| Lo último de la carrera            | «cola de carrera»                                                         | `Back of the race`                | «arrière de la course» / «coda»                            | la última `position`                                                                                                                                                      |

Tres reglas de uso [O], coherentes con §11.2 [R]: (1) la numeración es de carretera (1 el primero), no de importancia; (2) el tamaño va pegado al nombre, exacto en grupos pequeños (`5 riders`) y aproximado en el pelotón («unos 90»), aunque el motor lo da siempre exacto (`size`, l. 126); (3) con la carrera rota, el grupo se nombra por su ocupante más importante (maillot, luego favorito), que es lo que convierte «el grupo 3» en «el líder va en el grupo 3». La tele sigue llamando pelotón al grupo del líder aunque sea de 40; el motor le quita el nombre por debajo de dos tercios.

### 1.4 Cómo se expresan las diferencias

- **Notación.** Europa continental: «2' 14"» (minutos con prima, segundos con doble prima) y «4h 12' 33"». Mundo anglosajón: «2:14», «+2:14», «4:12:33». Mismo tiempo: «m.t.» en castellano y francés («même temps»), «s.t.» en inglés («same time») e italiano («stesso tempo»). Hablado: «a 45 segundos», «a un minuto y veinte». Para la interfaz del juego (inglés): `+2:14`, `0:45`, `s.t.`
- **Qué se mide.** La diferencia es siempre el tiempo entre el paso de dos grupos por el MISMO punto de la carretera. La mide la moto de cronometraje (el cronómetro para cuando llega el grupo de detrás), el pizarrero de la moto («l'ardoisier») se la enseña a los corredores en una pizarra [W: Velo, resumen de búsqueda], y la tele la calcula con transpondedores GPS en sus motos («measured by GPS transponders mounted on the TV motorbikes», [W] Cyclist 2016); desde 2015 el Tour lleva además un transpondedor GPS bajo el sillín de cada corredor [W: Dimension Data, NTT]. Es exactamente `gapS` del motor: «resta de relojes, no una estimación» (raceRadio.ts l. 137-138).
- **Dos referencias.** Las diferencias generales van contra la cabeza y numeradas; el comentario dice la diferencia con el grupo de delante («los perseguidores están a 45" de la fuga y le sacan 1' 30" al pelotón»). El motor guarda la primera; la segunda es una resta.
- **La tendencia es la noticia.** «Ha perdido 40 segundos en cinco kilómetros», «la diferencia se estabiliza». La agenda lo pide con esas palabras («y si sube o baja», l. 511). Regla de pulgar del pelotón [O, no es norma]: una fuga se caza si su ventaja en minutos es menor que los km que quedan divididos por diez.
- **Por debajo del segundo.** En meta la foto finish mide con precisión de 1/100 s y el tiempo se redondea hacia abajo al segundo; un hueco de más de un segundo entre la rueda trasera del último de un grupo y la delantera del siguiente abre grupo nuevo [R: pliego §6.1.3], y todos los de un grupo reciben el mismo tiempo [R: art. 2.3.040]. En carretera, por debajo de 5-10 s se habla en palabras: «a rueda», «a punto de enlazar» [O].
- **El final de una diferencia.** «Contacto», «enlazan», «cazados», «se reagrupa» (es); `Contact`, `Caught`, `Back together` (pantalla); «jonction», «regroupement» (fr). En la barra, el grupo alcanzado desaparece y su fila se funde con la de delante. En el motor: `fuga_cazada` (simulate.ts l. 8889) y `reagrupamiento` (l. 6684).

### 1.5 El perfil con los grupos, y el instante contra el punto

La tele dibuja la altimetría con una marca por grupo, los km que faltan a la próxima cima y la ficha del puerto («Col du Tourmalet · HC · 17,1 km al 7,3 %»); el formato estándar abre con «map and profile» [R §11.3] y la pendiente está en pantalla en toda subida [R §11.2].

Aquí está la diferencia técnica más importante para E2. **La tele pinta un INSTANTE**: dónde está cada grupo ahora, cuántos km le quedan a la cabeza, qué hora de carrera es. **La radio del motor guarda un PUNTO**: por cada km, el reloj de cada grupo al pasar por él (`SnapshotRider.tS`, «Reloj de SU grupo al cruzar el punto», types.ts l. 452-453; `RadioKm`, raceRadio.ts l. 151-167). La diferencia sale exacta tal cual, porque la tele también la mide en el mismo punto; el instante hay que interpolarlo: en la hora de carrera T, cada grupo está en el km en que su reloj vale T. Con 2' de hueco a 45 km/h el pelotón va 1,5 km por detrás de la cabeza, así que las marcas del perfil no coinciden y el «km a meta» de la capa fija es el de la cabeza.

Resolución: a 45 km/h un km son 80 s y a 20 km/h en un puerto son 3 min. La foto por km (`radioKmPoints`, un km por defecto y empezando en la salida, raceRadio.ts l. 230-236) es por tanto más fina que el mínimo de la UCI para las diferencias (3-5 min), y demasiado gruesa para el último km, donde la carretera tiene carteles a 500, 300, 200, 150, 100 y 50 m [R art. 2.3.004].

### 1.6 El maillot dentro de cada grupo

Las diferencias generales enseñan dónde va cada maillot [R §11.2]; en la práctica cada fila lleva los iconos de los maillots que viajan en ese grupo [O]:

```
(pantalla)
1  FRONT OF THE RACE   5 riders
2  CHASERS             2 riders   +0:45
3  PELOTON             ~120       +2:14   [GC] [PTS] [KOM]
4  GRUPPETTO           18         +6:40
```

El motor ya guarda, por grupo y km, a los que hay que poder seguir (`watching`, raceRadio.ts l. 567-571), con los tres maillots delante porque el dueño lo reclamó dos veces: «te dije que SIEMPRE se vean los 3 maillots y solo sale uno» (citado en raceRadio.ts l. 784).

---

## 2. Los rótulos de presentación (lower thirds)

### 2.1 Campos y variantes

Mínimo de la UCI [R §11.2]: dorsal, apellido, nombre, nacionalidad y equipo. La hoja de resultados escribe el apellido en mayúsculas delante («BERTOLINI Luca»); la tele suele darlo al revés («Luca BERTOLINI») y en listas abrevia el nombre («L. BERTOLINI») [O]. Variantes, de la más corta a la más larga [O]:

```
(pantalla) 21  Luca BERTOLINI  ITA  Team Alpha
(pantalla) 21  Luca BERTOLINI  ITA  Team Alpha  ·  Italian Champion
(pantalla) [GC]  Sam CARTER  GBR  Team Beta  ·  Leader, general classification  ·  Also leads mountains
(pantalla) [KOM]  Jonas VERHOEVEN  BEL  Team Gamma  ·  Mountains jersey (2nd in the classification)
(pantalla) Iñigo ARRIETA  ESP  Team Delta  ·  14th GC +4:02  ·  Age 24
```

Qué campo entra según el momento [O]: en carrera, por defecto, dorsal, nombre, bandera y equipo (con el maillot del equipo como icono); si importa para la general, puesto y diferencia en la general de salida (la virtual va aparte, §3.3); si lleva maillot o título, su línea («Leader, points classification», «World Champion», «Italian Champion»), que confirma lo que la imagen ya dice; edad, victorias y especialidad solo en fases tranquilas (previa, hora muerta); en una escapada, la versión corta para todos, repetida en cada diferencia general.

### 2.2 Qué maillot lleva: la regla completa [R]

1. **Prelación general** (art. 1.3.071): «1. the leader's jerseys of the stage race; 2. the world champion's jersey; 3. the leader's jersey of the cup, series or UCI classification; 4. the continental champion's jersey; 5. the national champion's jersey; 6. the national jersey».
2. **Entre maillots de líder** (art. 2.6.018): «1. general classification by time; 2. general classification by points; 3. general climber's classification; 4. others (young rider, combined, etc.); the order of priority among these other jerseys shall be set by the organiser».
3. **Delegación** (2.6.018): «the organiser may require another rider next on the relevant classification to wear a jersey which is not being worn by the leader of that classification. However, if this rider must wear his world or national champion's jersey, or the leader's jersey of a UCI cup, circuit, series or classification, he shall wear that jersey». Es potestad del organizador, no automatismo.
4. **Día 1** (2.6.018): «No leaders' jersey of the race or distinctive sign can be worn by a rider during the first day (prologue or stage) of a stage race». Los campeones sí llevan el suyo.
5. **Líder que no sale** (2.6.018): el «virtual leader» de esa clasificación puede llevarlo con permiso del organizador y del presidente del jurado.
6. **Cuántos** (2.6.018): como mucho 4 maillots de líder en WorldTour, Women's WorldTour, ProSeries y clase 1, y 6 en el resto; solo el de la general es obligatorio.
7. **Equipos** (2.6.018): los del equipo líder llevan dorsal distintivo si el organizador lo pide, y «the presentation of a team leader jersey is prohibited both in the protocol and in the race». El maillot del equipo es la equipación de cada equipo, no una clasificación.
8. **Disciplina y especialidad** (1.3.063, 1.3.068, 1.3.070): el campeón lleva su maillot «in all events in the discipline, speciality and category in which they won their title, and no other event», durante un año. El campeón del mundo de ruta corre las cronos con el mono de su equipo; el de contrarreloj lleva el arcoíris solo en las cronos individuales, no en la de equipos (1.3.063), mientras que el campeón nacional de crono sí puede llevar el suyo en la de equipos (1.3.068). El continental es potestativo salvo que la confederación lo imponga (1.3.070).
9. **Excampeones**: ribete arcoíris en cuello y puños (1.3.064) o ribete nacional (1.3.068), solo en su especialidad.
10. **Durante la etapa el maillot no cambia**: se entrega en el podio (2.6.018 bis) y quien lo lleva lo lleva todo el día aunque lo esté perdiendo. El que se lo quitaría es el «líder virtual», palabra de la tele; en el reglamento «virtual leader» solo aparece para el líder que no sale.

| Situación                                       | Lleva                                                                               | Cómo lo dice la tele                                                   |
| ----------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Lidera general y montaña                        | el de la general; el de la montaña, si el organizador lo pide, el 2.º de la montaña | «Leader, GC» y, aparte, «Mountains jersey (2nd in the classification)» |
| El 2.º de la montaña es campeón nacional        | su maillot de campeón (2.6.018); si entonces pasa al 3.º, el reglamento no lo dice  |                                                                        |
| Campeón del mundo de ruta que lidera la general | el de la general (1.3.071: manda la vuelta)                                         | «Leader, GC · World Champion»                                          |
| Campeón del mundo de ruta en una crono          | el mono de su equipo (no es su especialidad)                                        | el título, solo en el rótulo                                           |
| Campeón nacional de crono en una etapa en línea | la equipación de su equipo                                                          | el título, en el rótulo si acaso                                       |
| Primer día de una vuelta                        | nadie lleva maillot de líder; los campeones, el suyo                                |                                                                        |

### 2.3 El maillot como función, y qué enseñar mientras E3 y E12 no existan

Lo de arriba es una función pura: `maillotLlevado(corredor, etapa) = f(líderes de cada clasificación a la salida, puestos para la delegación, títulos vigentes con su especialidad, especialidad de la etapa (línea, crono individual, crono por equipos), ¿es el día 1?, equipación del equipo)`. La tele enseña dos cosas que no hay que confundir: el maillot LLEVADO (uno, el que se ve) y las DISTINCIONES (varias, en el rótulo). Mientras E3 y E12 no creen los títulos, la función devuelve la equipación del equipo donde iría el título, que es lo que lleva un corredor real sin título, y el rótulo omite esa línea: no hace falta marcador de posición. Dos restricciones del juego: hoy hay tres clasificaciones con maillot (`gc`, `points`, `kom`, según `docs/encargos.md` l. 181-183), y `SPEC.md` §8 prohíbe imitar el arcoíris (encargos l. 185-187), así que «arcoíris = campeón del mundo» se traduce a la señal propia que decida E3.

### 2.4 Cómo se presenta una escapada

Forma [O, coherente con §11.2]: cabecera con el número de corredores y la lista debajo, con equipo, bandera y el maillot que lleva cada uno (el suyo de campeón o de líder, o el del equipo).

```
(pantalla)
1  FRONT OF THE RACE · 5 riders                         +2:14 on the peloton
   [NC ITA]  Luca BERTOLINI     ITA  Team Alpha         Italian Champion
   [KOM]     Jonas VERHOEVEN    BEL  Team Gamma         Mountains jersey
             Pierre LAMBERT     FRA  Team Epsilon
             Iñigo ARRIETA      ESP  Team Delta         14th GC +4:02
             Tom HARGREAVES     GBR  Team Zeta
```

La frase del comentario no sigue la lista: ordena por notoriedad y cuenta al resto [O]. «Se escapa el campeón de Italia con el maillot de la montaña y tres más» es otra carrera que «se escapan cinco», y es el requisito del dueño (00-encargo §1.6). Orden de notoriedad del comentario [O]: maillot de líder > campeón del mundo > otros maillots > campeones continentales y nacionales > quien amenaza la general > ganadores de etapa y nombres conocidos > el resto. La lista del rótulo va por orden de carretera o de dorsal según la casa [no verificado]. Se presenta al formarse (la moto 1 la rodea para enseñar a los corredores uno a uno, [R] §11.4), en cada diferencia general, y cada vez que pierde o gana a alguien («quedan tres de los cinco»).

---

## 3. Los sucesos y su rótulo

### 3.1 Tabla de sucesos

| Suceso                    | Qué enseña la tele (pantalla, en inglés)                                                                                                                                                                                  | Cuándo sale                                                    | En el motor                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Ataque                    | `ATTACK · 21 Luca BERTOLINI · Team Alpha`, y en cuanto hay hueco, `+0:08`                                                                                                                                                 | 2-5 s después de verse: primero la imagen, luego el nombre [O] | `ataque`, plantilla `attack_sticks` (simulate.ts l. 8759)                                                                                   |
| Fuga formada              | cabecera nueva con la lista entera y la primera diferencia                                                                                                                                                                | cuando el hueco se sostiene                                    | `fuga_formada` (l. 8727)                                                                                                                    |
| El pelotón deja hacer     | diferencia que sube deprisa: `Gap 4:30 and growing`                                                                                                                                                                       | primera parte de la hora muerta                                | `fuga_consolidada`, plantilla `peloton_concedes` (l. 4818)                                                                                  |
| Persecución organizada    | plano del equipo en cabeza del pelotón; `Team Beta chasing`                                                                                                                                                               | cuando un equipo toma el frente                                | `persecucion`, plantilla `sprinters_chase` (l. 4550); motivo y beneficiario del relevo, `PullMotive` y `pullFor` (types.ts l. 400-447, 478) |
| Se abandona la caza       | `Sprinters' teams sit up`                                                                                                                                                                                                 |                                                                | `caza_abandonada` (l. 4591)                                                                                                                 |
| Puente o contraataque     | fila nueva en la barra: `2 · CHASERS · 2 riders · +0:45`                                                                                                                                                                  | cuando se despega                                              | `puente_fallido` (l. 8536) si falla; el éxito se ve en la radio                                                                             |
| Contacto                  | la fila desaparece; `CAUGHT · 12.4 km to go`, `Back together`                                                                                                                                                             | en el momento                                                  | `fuga_cazada` (l. 8889), `reagrupamiento` (l. 6684)                                                                                         |
| Corte, abanico            | `SPLIT IN THE PELOTON` / `ECHELONS`, cuadro con trozos, tamaños, huecos y qué favoritos van en cada uno                                                                                                                   | cuando se confirma el hueco                                    | `corte`, plantilla `peloton_split` (l. 6640); el abanico existe como motivo de relevo (types.ts l. 404)                                     |
| Caída                     | `CRASH` primero; nombres o dorsales cuando los da Radio Tour; luego `X back on the bike` o `ABANDON`                                                                                                                      | imagen al instante, nombres de segundos a minutos después      | `Incident` tipo `caida` (types.ts l. 358-365)                                                                                               |
| Pinchazo, avería          | `PUNCTURE · X`, con el coche; luego `X back in the peloton`                                                                                                                                                               |                                                                | `Incident` `pinchazo`/`averia`; `mishap` del grupo (raceRadio.ts l. 147)                                                                    |
| Descolgado, pájara        | `X DROPPED +0:25`; `Yellow jersey in difficulty`                                                                                                                                                                          |                                                                | `pajara` (l. 6046); `pajaraKm`, `descuelgueKm` (types.ts l. 561-564)                                                                        |
| Abandono                  | `ABANDON · 45 X (Team)`; Radio Tour lo da por dorsal                                                                                                                                                                      | al confirmarse, a menudo km después de la causa                | `abandono` (l. 6310); `racing`, `gone` (raceRadio.ts l. 156-159)                                                                            |
| Puerto, antes             | `Col du X · Cat. 1 · 12.4 km at 7.8% · summit in 3.2 km`                                                                                                                                                                  | al pie y en los últimos km                                     | `Banner` tipo `cima` con `cat` (types.ts l. 24-32)                                                                                          |
| Puerto, después           | `KOM · Col du X (Cat. 1) · 1. A 10 pts · 2. B 8 · 3. C 6`, y la montaña provisional si cambia                                                                                                                             | tras la cima                                                   | `banner`/`climb_kom` con el primero y sus puntos (l. 9310)                                                                                  |
| Sprint intermedio         | `INTERMEDIATE SPRINT · km 87 · 1. A 20 pts · 2. B 17 · 3. C 15` y, donde haya, `Bonus 3" 2" 1"`                                                                                                                           | tras la línea                                                  | `banner`/`sprint_intermediate`, solo el primero (l. 9221)                                                                                   |
| Avituallamiento           | `FEED ZONE`                                                                                                                                                                                                               | al entrar                                                      | no está en `types.ts`                                                                                                                       |
| Último km                 | `FLAMME ROUGE` / `1 KM`, luego 500, 300, 200, 150, 100, 50 m; si hay escapado, su ventaja                                                                                                                                 | una vez                                                        | `final`, plantilla `final_km` (l. 9689)                                                                                                     |
| Sprint                    | imagen limpia, sin rótulos de corredor; después `1. A · 2. B · 3. C`                                                                                                                                                      | tras la línea                                                  | `sprint`, plantilla `bunch_sprint`, tres primeros (l. 9662)                                                                                 |
| Foto finish               | la imagen de la foto finish «in case of a close finish» [R pliego §6.1.3]; `PHOTO FINISH` y resultado pendiente                                                                                                           |                                                                | sin medida de cercanía: `margin` es el hueco al grupo siguiente en segundos enteros (l. 9676)                                               |
| Llegada                   | `STAGE WINNER`, tiempo y media; `1. A 4:12:33 · 2. B s.t. · 3. C +0:04`                                                                                                                                                   |                                                                | `meta`, plantilla `stage_win`, con `won`, `margin`, `field`, `fuga` (l. 9695)                                                               |
| Llegada de cada grupo     | `PELOTON +2:14` al cruzar la línea, sobre la capa de cronometraje                                                                                                                                                         |                                                                | `StageResult.tiempoS` (types.ts l. 343)                                                                                                     |
| Regla de los 3 km         | `3 KM RULE`: quien cae o pincha en los últimos 3 km recibe el tiempo de su grupo; no en final en alto; la UCI puede ampliarla a 5 km; desde 2025 hay cinta de cronometraje en el cartel de 3 km [R 2.6.027 y 2.6.027 bis] |                                                                | `threeKmRule` (truce.ts l. 136-143: no en alto, en solitario ni en crono; la distancia es parámetro)                                        |
| Fuera de control          | en montaña, durante la etapa: `TIME CUT 31:12` contra `GRUPPETTO +27:40`; al final, la lista                                                                                                                              | la cuenta en vivo, la lista en meta                            | `fuera_control`, plantilla `time_cut` (l. 9139)                                                                                             |
| General virtual           | `VIRTUAL GC` (§3.3)                                                                                                                                                                                                       | con cada diferencia general mientras dure la amenaza           | no hay suceso; se calcula                                                                                                                   |
| Sanción, desclasificación | `RELEGATED` tras la decisión del jurado                                                                                                                                                                                   | minutos después                                                | no visto en `types.ts`                                                                                                                      |

**La tele revela en el orden en que SABE, no en el orden en que pasa.** Primero la imagen de la caída, luego los dorsales, luego el abandono, y el diagnóstico (fractura, días de baja) tras la etapa o al día siguiente [O]. El motor lo sabe todo en el km de la caída (`severidad`, `diasBaja`, types.ts l. 362-364). Una repetición a ritmo que enseñe los días de baja en ese km es anacrónica, y además destripa la noticia médica de después.

### 3.2 Puntos, bonificaciones y límites

- **Bonificaciones** [R arts. 2.6.019 a 2.6.021]: sprints intermedios 3-2-1 s (6-4-2 si la etapa tiene uno solo), meta 10-6-4 s (6-4-2 en media etapa), como mucho 3 sprints intermedios por etapa, ninguna en contrarreloj, y solo cuentan en la general por tiempo. Tour 2025: 10-6-4 en meta salvo cronos; los «bonus» de 8-5-2 s de 2024 (cuatro etapas) se quitaron en 2025 [W: Cyclingnews, Domestique].
- **Montaña, escala del Tour** [O; la tabla de Wikipedia salió desordenada al leerla]: HC 20-15-12-10-8-6-4-2; 1.ª 10-8-6-4-2-1; 2.ª 5-3-2-1; 3.ª 2-1; 4.ª 1.
- **Puntos, escala del Tour hasta 2025** [O]: meta llana 50-30-20-18-16-14-12-10-8-7-6-5-4-3-2; sprint intermedio 20-17-15-13-11-10-9-8-7-6-5-4-3-2-1. Wikipedia recoge una escala nueva para 2026 (meta llana 70-50-40…, sprint 25-20-16-14-12) que no he podido contrastar.
- **Desempates** [R 2.6.017]: puntos, por victorias de etapa, luego victorias en sprints intermedios, luego general; montaña, por primeros puestos en la categoría más alta, luego en la siguiente, luego general.
- **Fuera de control** [R 2.6.032]: el límite lo fija el reglamento particular según el tipo de etapa; el jurado puede ampliarlo en casos excepcionales, y entonces a los repescados se les retiran «all points awarded in the general classifications of the various secondary classifications». En carrera de un día no se clasifica quien llega más de un 8 % por detrás del ganador [R 2.3.039].

### 3.3 La general virtual

La tele la saca cuando alguien con opciones va en un grupo distinto del del líder [O]. Se calcula como tiempo en la general a la salida más la diferencia en carretera con el grupo del líder, menos las bonificaciones ya ganadas; las de meta se tratan como posibles, no como hechas.

```
(pantalla)
VIRTUAL GC                          after 128.0 km
1  Iñigo ARRIETA       (in the break)     0:00
2  [GC] Sam CARTER     (peloton)         +0:47
3  Mads OLSEN          (peloton)         +1:02
```

Palabras: «líder virtual», «maillot amarillo virtual» («maillot jaune virtuel»); `Virtual leader` (pantalla). El maillot no cambia hasta el podio (§2.2, punto 10).

---

## 4. La contrarreloj

- **Orden de salida** [R]: en vuelta, orden inverso de la general, y el jurado puede tocarlo para que no salgan seguidos dos del mismo equipo (2.6.023); en prólogo o crono de primera etapa, el organizador con el jurado fija el orden de los equipos y cada equipo el de los suyos (2.6.023); en carrera de un día, el organizador con criterios objetivos (2.4.006); en mundiales y juegos, la UCI (2.4.009). Intervalos idénticos, ampliables para los últimos (2.4.007); lo habitual [O] es 1 min, y 2 min para los 15-20 últimos. Crono por equipos: orden inverso de la general por equipos, con el del líder el último (2.6.024).
- **Carteles**: cada 5 km como poco, cada km en cronoescalada [R 2.4.004].
- **Cámaras fijas** [R §11.1.4]: una en la rampa de salida y otra en el último punto intermedio (obligatorias en gran vuelta); la de entrevistas en meta enfoca «the rider with the current best time (if there is a Hot Seat at the finish area)».
- **Los cuatro rótulos** [O]:

```
(pantalla)
ON COURSE   51  Sam CARTER   km 18.2   +0:05 at split 1
SPLIT 1  km 12.4   1. Mads OLSEN 15:32   2. Iñigo ARRIETA +0:04   3. Luca BERTOLINI +0:09
FINISH   1. Mads OLSEN 32:15   2. Pierre LAMBERT +0:07                  HOT SEAT: OLSEN
VIRTUAL GC after split 2   CARTER leads ARRIETA by 0:23
```

El color es convención [O, no verificada como norma]: verde si va por delante del mejor, rojo si va por detrás. El «hot seat» es un sillón a la vista en meta donde se sienta el mejor tiempo provisional; cada cambio de sillón es un suceso.

- **Ritmo** [O]: 150-180 corredores a un minuto dan de 2 h 30 a 3 h 20 de salidas; la primera hora es anónima; el realizador alterna al corredor en ruta, el sillón y los parciales; la última hora es la de la general, y como el último en salir es el líder, la crono acaba con el maillot. La general virtual punto a punto es el relato: el caso canónico es la crono de La Planche des Belles Filles del Tour 2020 (etapa 20), donde la general cambió de manos en carretera.
- **Por qué importa**: en la crono no hay enfrentamiento visible y todo el relato lo llevan los parciales. En el motor la crono corre con grupos de un corredor y sin rebufo (types.ts l. 299-300) y con el orden de `stage/startOrder.ts` (citado en types.ts l. 207-213); para los parciales hace falta el reloj de cada corredor en el km del punto intermedio y su hora de salida. Si en crono `tS` es tiempo propio o reloj común no lo he comprobado.

---

## 5. Ritmo y montaje

### 5.1 Cuánto dura y con qué se hace

- **Mínimo de la UCI** [R pliego §11]: WorldTour y ProSeries masculinos, directo de al menos la última hora; gran vuelta, los últimos 90-100 km; Women's WorldTour, los últimos 45 min.
- **Tour**: France Télévisions emite las 21 etapas enteras en France 2 y France 3 [W: francetelevisions.fr, resumen de búsqueda], con previa y programa posterior.
- **Duraciones** [O]: etapa en línea de 3 h 30 a 6 h 30 (Sanremo pasa de 6 h 30, mapa 07 de E1 §1.5); crono de unas 3 h; resúmenes oficiales de 5 a 15 min; vídeos del último km de 2 a 5 min.
- **Medios** [R §11.1.1]: mínimo tres motos con cámara (cabeza de carrera; delante del pelotón o del grupo perseguidor; detrás del pelotón o del grupo de favoritos), un helicóptero que va «above the peloton or above the group of favourites most of the time» y un avión repetidor; en montaña de gran vuelta y en clásicas duras, cuarta moto, segundo helicóptero y segundo repetidor. Tour [W: Cyclist 2016]: «four helicopters, two planes, five camera motorcycles, two audio motorcycles, around 20 other cameras at the start and finish», 300 personas; el realizador guioniza la etapa con los lugares de interés a 15 km del recorrido y tiene al lado a un excorredor (Ronan Pensec) que anticipa la táctica.
- **Dirección de cámaras** [R §11.4]: la moto 1 no se queda delante de la fuga, la rodea para que se vea a cada corredor; la 2 va delante del pelotón y, si un favorito se va en un contraataque, lo sigue y el helicóptero cubre el pelotón; «There is always a camera at the front of the peloton and with the group of favourites». La regla que un producto copia: la cámara va donde está lo que puede cambiar la clasificación.

### 5.2 Los tramos de una etapa en línea

| Tramo                    | Dura (etapa de 5 h) [O] | Qué enseña la imagen                                     | Rótulos                                                                                | Qué dice el comentario                                    |
| ------------------------ | ----------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Previa                   | 15-60 min               | firma, autobuses, salida neutralizada                    | perfil, mapa, meteo, favoritos, maillots en juego, horario                             | qué hay en juego hoy                                      |
| Km 0 y lucha por la fuga | 5-60 min                | ataques seguidos                                         | nombre y equipo de cada atacante                                                       | quién quiere estar y qué equipos no dejan                 |
| Fuga formada             | 5-10 min                | los escapados uno a uno                                  | lista completa, primera diferencia                                                     | quiénes son y qué peligro tienen para la general          |
| Hora muerta              | 1-3 h                   | helicóptero, paisaje, patrimonio                         | diferencias cada 3-5 min, sprint intermedio, avituallamiento, media de la primera hora | historia, fichas, la cuenta de la persecución, incidentes |
| Aproximación             | 30-60 min               | equipos que se colocan, la caza                          | diferencias más a menudo, quién tira, perfil del final                                 | el minuto por cada diez km, quién trabaja y para quién    |
| Final                    | 20-40 min               | plano continuo de la cabeza y de los favoritos           | km a meta, diferencia y nombres de los que atacan, nada más                            | estado, sin digresiones                                   |
| Último km y llegada      | 2-3 min                 | un plano de cabeza y las cámaras fijas de meta           | `1 KM` y distancias; nada sobre los corredores hasta la línea                          | grito; luego silencio para la repetición                  |
| Repeticiones             | 3-10 min                | cámara lenta, varios ángulos, foto finish si es ajustado | `REPLAY`                                                                               | cómo se ganó                                              |
| Resultados               | 5-10 min                | llegada del resto                                        | etapa, general con cambios, maillots, fuera de control                                 | qué ha cambiado                                           |
| Entrevistas y podio      | 10-20 min               | ganador y líder; podio en 10-15 min como mucho [R §11.3] | nombres                                                                                | declaraciones                                             |

### 5.3 Cuándo corta el realizador a un rótulo y cuándo no

Sí: (1) al cambiar de plano de un grupo a otro, su cabecera numerada [R]; (2) cada 3-5 minutos, las diferencias generales [R]; (3) con una cara nueva en pantalla, su nombre, «as often as possible» [R]; (4) cuando llega un punto del recorrido: la ficha del puerto, el sprint, el avituallamiento, el pueblo [R]; (5) tras un punto, los puntos y bonificaciones [O]; (6) con un suceso confirmado: caída con nombres, abandono [O].

No [O]: (1) encima del movimiento: primero se ve el ataque y después se nombra, porque un rótulo tapa lo que se quiere enseñar; (2) en los últimos 300-500 m, donde solo queda la distancia; (3) sobre un herido: ni primer plano ni rótulo hasta que hay información, y el procedimiento de caída del pliego pide que no se transmita información por Radio Tour salvo por seguridad [R pliego, p. 27]; (4) dos rótulos de corredor a la vez. La capa fija no se quita nunca, salvo en la repetición a pantalla completa.

### 5.4 El resumen de diez minutos

Un resumen no es la etapa más deprisa: es una selección de cambios de estado cosida con el estado permanente. Cada corte salta kilómetros, y lo que hace legible el salto es la capa fija: al volver de un corte el espectador lee `42 km to go · +1:10` y se recoloca solo [O]. Lo que se conserva siempre [O]:

1. El contexto de salida: perfil, qué se juega, quién lleva los maillots (30-60 s).
2. La formación de la fuga: quiénes, en qué km y con qué primera diferencia; si hubo una lucha larga, una frase.
3. La diferencia máxima y su km, a menudo con el gráfico de la evolución del hueco.
4. Todo suceso que mueve la general o un maillot: puntos que cambian un maillot, caídas de favoritos, cortes, abandonos notables.
5. El km en que se caza la fuga y el ataque decisivo, con el intento fallido anterior si lo hubo.
6. El último km sin cortes, la llegada y una repetición.
7. Resultado (3-10 primeros), general con cambios, maillots y una frase del ganador.

Proporciones para 10 minutos de una etapa de 5 h [O, estimación]: el primer 80 % de la distancia en 3-4 min, los últimos 20-30 km en 5-6 min, resultados en 1 min; compresión de 1:100 o más en la hora muerta, de 1:5 en el final y de 1:1 en el último km. Se pierde sin daño el rodar del pelotón, el paisaje y las lecturas repetidas de la diferencia. No se pierde nunca la continuidad del estado (tras cada corte, dónde estamos), la causa (por qué se cazó la fuga: qué equipo tiró) ni el orden (nada del futuro antes de su hora).

---

## 6. Las capas de la narración

| Capa               | Quién                                         | Qué dice                                                                           | Ejemplo                                                                     | En el motor                                                                          |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Estado             | narrador principal                            | qué pasa ahora, quién, dónde, cuánto                                               | «Quedan 42, la fuga mantiene 2' 10" y en el pelotón tira el Beta»           | `RadioKm`: grupos, `gapS`, `pulling` (raceRadio.ts l. 120-167)                       |
| Contexto y táctica | segundo comentarista, casi siempre excorredor | por qué, qué va a pasar, qué se juega cada uno                                     | «El Beta no tira por la etapa: Arrieta está a cuatro minutos en la general» | `PullMotive` y `pullFor` (types.ts l. 400-447, 470-478); `gcDeficitSeconds` (l. 189) |
| Carretera          | moto informadora y Radio Tour                 | lo que no ve la cámara: dorsales de los caídos, abandonos, la orden de un director | «Radio Tour: abandono del dorsal 45»                                        | `RaceEvent`, `Incident`                                                              |
| Datos              | rótulos                                       | números, nombres, posiciones                                                       | `2 · CHASERS · +0:45`                                                       | radio guardada, `StoredRaceRadio` (raceRadio.ts l. 583-588)                          |
| Causa              | repeticiones                                  | cómo pasó                                                                          | la caída a cámara lenta, el sprint desde arriba                             | la foto y el suceso de ese km                                                        |
| Antes y después    | estudio                                       | previa, análisis, qué cambia mañana                                                |                                                                             | journal, crónica, noticias                                                           |

Radio Tour [R pliego §10]: va en el coche del director de la organización, detrás del pelotón, con el presidente del jurado y un locutor; habla «as a minimum, in English and the language of the country» y «provides sufficient information so that the progress of the event can be understood by all, in real time». Es la fuente que repiten los comentaristas, y de ahí viene el nombre «Race Radio» del juego.

Reglas de convivencia [O]: (1) manda la capa de datos y la voz no la contradice, que es la regla del motor: «una crónica que miente es peor que una crónica muda» (types.ts l. 429-430); (2) el narrador repite el estado en frases cortas, como servicio al que acaba de llegar; (3) el segundo comentarista llena la hora muerta y calla en el final; (4) una repetición se marca siempre y nunca tapa un suceso en directo: si pasa algo, se corta o se parte la pantalla; (5) las capas llegan con desfase (imagen, nombre, diagnóstico), y la tele no sabe al instante lo que el motor sabe (§3.1).

---

## 7. Sin destripe: cómo lo resuelve quien ve en diferido

### 7.1 Lo que hacen los productos que ya lo resuelven

| Producto                             | Qué oculta                                                                                  | Cómo                                                   | Fuente                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| Tennis TV, «Spoiler Mode»            | marcadores, línea de tiempo, duración del partido, avisos de marcador                       | interruptor en la cuenta; web y móvil                  | [W] ayuda de Tennis TV, resumen de búsqueda (la página dio 403) |
| App de F1, «Avoid Spoilers Mode»     | resultados; deja ver «schedules, session times, replay live timing, and highlights»         | modo propio y notificaciones «non-spoiler»             | [W] App Store y formula1.com                                    |
| App de la NBA, «Hide Scores»         | marcadores, récords y detalles que revelan el partido                                       | interruptor en «Games»                                 | [W] ayuda de la NBA, resumen de búsqueda                        |
| App TV de Apple                      | marcadores en vivo                                                                          | ajuste del dispositivo «Show Sports Scores»            | [W] soporte de Apple                                            |
| Tour Tracker Pro Cycling             | noticias filtradas, avisos «but no spoilers!», «Time Machine» para sincronizar con el vídeo |                                                        | [W] App Store                                                   |
| Spoiler Free TDF (web)               | lista los vídeos de etapa «without winners, standings, or result-heavy titles»              |                                                        | [W] resumen de búsqueda (el dominio no resolvió)                |
| Extensiones de YouTube               | duración, barra de progreso, miniaturas                                                     | existen porque la duración de un vídeo revela el final | [W] Chrome Web Store, Firefox Add-ons                           |
| TNT Sports, discovery+, Max, Peacock | no he encontrado un modo sin destripe documentado                                           |                                                        | [W] búsqueda negativa                                           |

Sus fallos enseñan tanto como sus aciertos. App de F1, reseña de usuario: «for a split second while bringing up the live timing it will show you the top 3 finishes», y al entrar a mitad de carrera no deja volver a vueltas pasadas [W]. NBA: la propia ayuda admite que titulares e imágenes de los artículos de portada pueden revelar resultados [W].

### 7.2 Las reglas que un producto debería copiar

1. **Oculto por defecto, por cuenta y en el servidor.** Tennis TV lo guarda en la cuenta; Apple, por dispositivo. El encargo lo exige: saber qué ha visto cada jugador (00-encargo §1.3).
2. **Ocultar antes de pintar.** El destello del podio de F1 es un dato que llegó al cliente antes que la máscara. El servidor no envía lo que el jugador no ha alcanzado; esconderlo en el cliente no basta.
3. **Lo que mide la duración revela el final.** Tennis TV oculta la duración y las extensiones de YouTube la barra. Traducido: ni `23 events`, ni una repetición cuya duración dependa de lo que pase, ni marcas en el perfil en los km donde va a pasar algo. El perfil y los km no destripan (se publican antes de la salida); dónde caen los sucesos, sí.
4. **Títulos, miniaturas y avisos neutros.** `Stage 7 · 187 km · Ready to watch`, nunca `Bertolini wins stage 7`. La miniatura es el perfil o la salida, nunca la llegada. El aviso dice que hay algo que ver, no qué pasó.
5. **Todas las pantallas, no una.** La NBA falla en la portada. El encargo lista portada, ranking, clasificaciones, feed, correo y título de pestaña (00-encargo §1.3); la tele añade el faldón de noticias de otro programa. Un juego añade fugas que la tele no tiene: todo número que dependa del resultado (la general, los puntos, el dinero de premios, la forma o la fatiga de mañana, los días de baja de un lesionado, `Incident.diasBaja`, types.ts l. 364) y la marca de «corrida» de la etapa en el calendario.
6. **La previa de mañana destripa la de hoy.** El formato estándar de la UCI abre con «finish of the previous stage + classifications» [R §11.3], que es el destripe de la etapa anterior para quien no la ha visto. La previa de la etapa N+1 tiene que saber si el jugador ha visto la N.
7. **Revelar es un acto explícito y por etapa**, con un «ya lo sé» que salta al final; nunca un revelado implícito por abrir otra pantalla.
8. **Sincronizar con lo que se ve** (la «Time Machine» de Tour Tracker): mientras el jugador ve el km 120, la general virtual, los maillots y las clasificaciones que enseñe la pantalla son las del km 120.

---

## 8. Antes y después

### 8.1 La previa

Formato estándar de la señal internacional [R §11.3]: «credits, for a stage race: finish of the previous stage + classifications, map and profile, weather, live coverage, finish + slow motion replays, scenic shots of finish town, classifications, interviews, podium ceremony». Lo que lleva la previa [O salvo donde se diga]:

1. Perfil y mapa: km, puertos con categoría, longitud, pendiente y km de la cima; sprint intermedio; avituallamiento; los últimos 3 km, a menudo en animación (curvas, rotondas, pendiente final).
2. Horario: la guía técnica da «scheduled times and average speeds (minimum, medium, maximum)» [R pliego §7], o sea a qué hora pasa la carrera por cada punto a tres medias.
3. Meteo y viento, con los tramos expuestos si hay riesgo de abanico.
4. Favoritos: 3-6 nombres por tipo de final, con su ficha.
5. Maillots en juego: quién lleva cada uno y quién puede quitárselo hoy («con la bonificación de meta, X se viste de líder»).
6. Clasificaciones de salida (general con los 10 primeros, puntos, montaña, equipos), lo de ayer (que destripa, §7.2 regla 6) y entrevistas en los autobuses con el plan de cada equipo.

### 8.2 El cierre

(1) Resultado de etapa: 10-20 primeros con tiempo y diferencia, nombre, nacionalidad y equipo [R §11.2]. (2) General: 10 primeros con flechas de subida y bajada. (3) Maillots: el líder de cada clasificación y quién cambia; la ceremonia va en el orden de 2.6.018 bis: ganador de etapa, líder de la general, líderes de las demás [R]. (4) Premio de la combatividad del día (en el Tour, dorsal rojo al día siguiente) [O]. (5) Abandonos, fuera de control y comunicado del jurado (multas, penalizaciones). (6) Podio y declaraciones del ganador y del líder. (7) La etapa de mañana: perfil y una frase, que cierra el bucle con la previa siguiente.

### 8.3 Qué es esto en E2

El journal de etapa y las noticias de E2 son §8.1 y §8.2: cada pieza es un hecho estructurado (quién, qué, cuánto, dónde) que la tele dice con un formato fijo. Y la señal internacional trabaja justo así: unos rótulos idénticos para todo el mundo, sobre los que cada cadena pone su voz y su idioma («identical graphics displayed worldwide before individual broadcasters localize content», [W] Cyclist 2016). Guardar la noticia ya redactada (`news` con `kind` y `text`, 00-encargo §1.5) es lo contrario de esa práctica: la tele guarda el dato y la plantilla, nunca la frase.

---

## 9. Tabla final: de cada elemento de televisión a un requisito de datos

«Motor» da el nombre que ya existe cuando coincide; «Estado» dice si el dato está, se deriva de lo que está o falta. Las líneas son de `raceRadio.ts` salvo que se nombre otro fichero.

| #   | Para dibujar                      | hace falta saber                                                                                                       | cada                                                                   | Motor                                                                                                                               | Estado                                                          |
| --- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | km a meta                         | km de la cabeza en el instante T y longitud total                                                                      | continuo; en el último km, cada 50-100 m                               | `RadioKm.km` (l. 153); `StageProfile.segments` (types.ts l. 46-48)                                                                  | por km; el instante se interpola                                |
| 2   | reloj de carrera                  | tiempo de la cabeza desde la salida real                                                                               | cada segundo mostrado                                                  | `RadioGroup.tS` (l. 136)                                                                                                            | por km; se interpola                                            |
| 3   | diferencia principal              | hueco entre cabeza y pelotón en el mismo punto                                                                         | 3-5 min como mínimo UCI; un km son 1,3 min a 45 km/h y 3 min a 20 km/h | `gapS` (l. 137-138, guardada l. 501)                                                                                                | está                                                            |
| 4   | tendencia                         | la diferencia en los km anteriores                                                                                     | ventana de 5-10 km                                                     | serie de `gapS`                                                                                                                     | derivable                                                       |
| 5   | barra de posiciones               | grupos en orden de carretera, clase y tamaño                                                                           | por km y en cada cambio                                                | `position`, `kind`, `size` (l. 120-126)                                                                                             | está; `tierra` no es la «tierra de nadie» de la tele (§1.3)     |
| 6   | composición                       | quién va en cada grupo                                                                                                 | por km                                                                 | `riderIds` y el vector por km de la radio guardada (l. 484-489)                                                                     | está                                                            |
| 7   | nombre por ocupante               | maillots y favoritos en cada grupo                                                                                     | por km                                                                 | `watching` y `priority` (l. 567-571, 780-787)                                                                                       | está para los tres maillots; los favoritos los pone quien llama |
| 8   | velocidad                         | km/h del grupo                                                                                                         | por km                                                                 | `speedKmh` (l. 512)                                                                                                                 | está                                                            |
| 9   | pendiente y ficha del puerto      | pendiente del tramo, longitud y media del puerto, km a la cima, categoría                                              | cada 100 m                                                             | `Block.g`, `Segment`, `Banner` con `cat` (types.ts l. 18-43, 77-88)                                                                 | está                                                            |
| 10  | altitud del perfil                | cota por km                                                                                                            | por km                                                                 | `startM`, 0 por defecto (types.ts l. 49-59)                                                                                         | solo relativa                                                   |
| 11  | grupos sobre el perfil            | km de cada grupo en T                                                                                                  | continuo                                                               | reloj por km de cada grupo                                                                                                          | derivable interpolando                                          |
| 12  | meteo y viento                    | temperatura, lluvia, viento y su dirección respecto a la carretera                                                     | por etapa o tramo                                                      | clima por `lugar` (types.ts l. 313-326)                                                                                             | no lo he leído                                                  |
| 13  | lugares                           | pueblos por km                                                                                                         | por km                                                                 | no está en `types.ts`                                                                                                               | falta                                                           |
| 14  | rótulo de corredor                | dorsal, nombre, nacionalidad, equipo, edad, puesto y hueco en la general                                               | por etapa                                                              | `bib`, `gcRank`, `gcDeficitSeconds`, `teamId` (types.ts l. 189-215, 264); lo demás en la base                                       | parcial                                                         |
| 15  | maillot llevado                   | líderes a la salida, puestos para la delegación, títulos con especialidad, especialidad de la etapa, día 1, equipación | una vez por etapa                                                      | `standings` (types.ts l. 275); títulos: E3 y E12                                                                                    | faltan los títulos                                              |
| 16  | ataque                            | quién, km, hora, hueco que abre                                                                                        | al instante                                                            | `ataque` (simulate.ts l. 8759)                                                                                                      | está                                                            |
| 17  | fuga formada, consolidada, cazada | quiénes, km, hueco                                                                                                     | al instante                                                            | `fuga_formada`, `fuga_consolidada`, `fuga_cazada` (simulate.ts l. 8727, 4818, 8889)                                                 | está                                                            |
| 18  | quién tira y para quién           | relevistas, motivo, beneficiario                                                                                       | por km                                                                 | `pulling`, `motivos`, `paraQuien` (l. 543-565); `persecucion` (simulate.ts l. 4550)                                                 | está                                                            |
| 19  | corte y abanico                   | trozos, tamaños, huecos, favoritos por trozo                                                                           | al instante y por km                                                   | `corte` (simulate.ts l. 6640); el abanico solo como motivo                                                                          | parcial                                                         |
| 20  | caída, pinchazo, avería           | quién, km, tiempo perdido; la gravedad, después                                                                        | al instante; gravedad al final                                         | `Incident` (types.ts l. 358-365); `mishap` (l. 147)                                                                                 | está; ojo al orden de revelado                                  |
| 21  | descolgado y pájara               | quién, km, hueco                                                                                                       | al instante                                                            | `pajara` (simulate.ts l. 6046); `pajaraKm`, `descuelgueKm` (types.ts l. 561-564)                                                    | está                                                            |
| 22  | abandono                          | quién y km                                                                                                             | al confirmarse                                                         | `abandono` (simulate.ts l. 6310); `racing`, `gone` (l. 156-159)                                                                     | está                                                            |
| 23  | paso por puerto                   | orden de los N primeros en la cima, sus puntos, hueco en la cima                                                       | en la cima                                                             | `banner`/`climb_kom` con el primero y sus puntos (simulate.ts l. 9310); `puntosMontana` total (types.ts l. 346)                     | falta el orden por cima                                         |
| 24  | sprint intermedio                 | orden, puntos y bonificación por línea                                                                                 | en la línea                                                            | `banner`/`sprint_intermediate` con el primero (simulate.ts l. 9221); `puntosVolante`, `bonificacionS` totales (types.ts l. 344-345) | falta el orden y la bonificación por línea                      |
| 25  | avituallamiento                   | km de la zona                                                                                                          | por etapa                                                              | no está en `types.ts`                                                                                                               | falta                                                           |
| 26  | último km                         | dónde está la llama roja y quién manda con qué ventaja                                                                 | una vez                                                                | longitud; `final_km` (simulate.ts l. 9689)                                                                                          | está                                                            |
| 27  | sprint y foto finish              | orden de los primeros y su cercanía                                                                                    | en la línea                                                            | `bunch_sprint` con tres (simulate.ts l. 9662); `margin` en segundos enteros al grupo siguiente (l. 9676)                            | falta la cercanía                                               |
| 28  | llegada por grupos                | tiempo de cada grupo con la regla del segundo                                                                          | en meta                                                                | `StageResult.tiempoS` (types.ts l. 343)                                                                                             | está                                                            |
| 29  | regla de los 3 km                 | km de la incidencia y tipo de final                                                                                    | en el suceso                                                           | `threeKmRule` (truce.ts l. 136-143)                                                                                                 | está                                                            |
| 30  | fuera de control                  | límite en vivo y quién queda fuera                                                                                     | la cuenta en montaña; la lista en meta                                 | `fuera_control` (simulate.ts l. 9139)                                                                                               | la lista, sí; el límite en vivo, no lo sé                       |
| 31  | general virtual                   | déficit de salida, hueco en vivo con el grupo del líder, bonificaciones ya ganadas                                     | por km para los 10-20 primeros                                         | `gcDeficitSeconds` y `gapS`                                                                                                         | parcial: faltan las bonificaciones por línea                    |
| 32  | parciales de crono                | hora de salida, reloj en cada punto intermedio, mejor parcial                                                          | en cada punto                                                          | `timeTrial` (types.ts l. 300); foto por km de `StageProbe` (types.ts l. 487-504)                                                    | no comprobado                                                   |
| 33  | hot seat                          | mejor tiempo en meta hasta T y de quién                                                                                | en cada llegada                                                        | `tiempoS` y hora de salida                                                                                                          | derivable si se sabe la hora de salida                          |
| 34  | clasificaciones del cierre        | general, puntos, montaña y equipos, con cambios                                                                        | al final                                                               | fuera del motor                                                                                                                     | no lo he leído                                                  |
| 35  | previa                            | perfil, puertos, sprint, horario a tres medias, meteo, favoritos, maillots en juego                                    | por etapa                                                              | perfil y `banners`; el horario se deriva                                                                                            | parcial                                                         |

---

## Lo que no he podido verificar

1. Qué lleva exactamente la capa fija de cada casa (Tour, Giro, Vuelta, Eurosport): lo verificado es la norma de la UCI (§1.1). Que el reloj de carrera esté siempre a la vista, no.
2. Los colores verde y rojo de los parciales, y si todas las cronos comparan en vivo con el mejor por GPS.
3. Los intervalos de 1 y 2 minutos en crono: el reglamento solo dice que pueden ampliarse para los últimos (2.4.007).
4. Las escalas de puntos del Tour: la de 2026 viene solo de Wikipedia, y la de montaña la doy de memoria porque la tabla salió desordenada al leerla.
5. Las tablas de fuera de control de cada gran vuelta.
6. Si el maillot delegado pasa al tercero cuando el segundo es campeón: el reglamento no lo dice.
7. El orden de los nombres en el rótulo de una escapada (carretera o dorsal).
8. Las ayudas de Tennis TV y de la NBA (403 o 404 al abrirlas), spoilerfreetdf.com (no resolvió) y el artículo de Velo sobre las diferencias (pedía cuenta): uso el resumen del buscador.
9. Que TNT Sports, discovery+, Max o Peacock no tengan modo sin destripe: búsqueda negativa, no prueba.
10. Las duraciones de §5.2 y §5.4, la regla del minuto por cada diez km y el orden de notoriedad del comentario: observación.
11. Del motor: si en crono `tS` es tiempo propio o reloj común; si el abanico tiene suceso propio; qué da el módulo de clima; qué guarda la base de las clasificaciones; si `ataque_final` y `ataque_grupo` (simulate.ts l. 7416, 7506) llegan a `tipo` de un suceso o solo son clases de intento.

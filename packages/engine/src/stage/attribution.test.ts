/**
 * ATRIBUCIÓN DEL TRABAJO (v11): quién tira del pelotón y quién hizo el trabajo para cerrar.
 *
 * Los dos datos existían dentro del motor y se tiraban a la basura: `relayTurn()` decide en cada
 * bloque de 100 m y para cada grupo quién da la cara al viento, y `advance()` acumula el gasto sin
 * distinguir el de ir a rueda del de relevar. Esta tanda es de OBSERVACIÓN: no toca ninguna ley
 * física ni consume azar, así que el primer test es el que lo demuestra —los resultados de una
 * etapa con una semilla dada son los MISMOS que en la v10—.
 */
import { describe, expect, it } from 'vitest'
import { STAGE } from '../constants.js'
import { campaignSeeds, flatScenario, queenScenario } from '../sim/scenarios.js'
import { simulateStage } from './simulate.js'
import { stageSeed } from './rng.js'
import type { StageInput, StageOrders, StageOutput, StageRider } from './types.js'
import type { Attribute } from '@cyclingstar/shared'

/**
 * Huella `puesto:corredor:tiempo` de los escenarios canónicos. Nació sellada con la v10 para
 * demostrar que la ATRIBUCIÓN de la v11 no movía ni un segundo, y sigue siendo el banco que avisa
 * de que un cambio ha tocado el reparto de tiempos donde no debía.
 *
 * **RESELLADA EN LA v12** (selección en pavé y descenso, docs/motor.md §14). El cambio SÍ mueve
 * comportamiento, así que la huella tenía que moverse, y antes de resellar se comprobó que se movía
 * EXACTAMENTE donde se esperaba:
 *
 * - Las DOS huellas de `reina-150` son idénticas dígito a dígito a las de la v10. Es la prueba de
 *   que la montaña no se ha tocado: el descuelgue en subida conserva su factor 1 y su dado
 *   (`rngHazard`), y el terreno nuevo estrena un subflujo nominal propio (`rough`) que no desplaza
 *   la secuencia de nadie.
 * - En `llana-180` no cambia NINGÚN tiempo de grupo (los 40 corredores siguen entrando en 14438 y
 *   14585 respectivamente) salvo un corredor de la segunda semilla, `brk-1`, que llega 17 s más
 *   tarde: se quedó cortado y el pelotón, lanzado a 0,85 en el tirón final, ya no le deja volver
 *   (`chaseBackShutFloor`). El resto del movimiento es de ORDEN dentro del mismo segundo, que es lo
 *   que arrastra un peaje de trabajo distinto.
 *
 * Es decir: cero movimiento en montaña, y en llano solo el que introduce a propósito la puerta del
 * pelotón. Cualquier otra cosa que mueva esta huella hay que volver a justificarla aquí.
 *
 * **NO RESELLADA EN LA v13** (identidad, motivo y ruido del journal, docs/balance.md «v13»). La v13
 * cambia comportamiento del motor en tres sitios —un corredor solo puede dejarse ir UNA vez (B3), la
 * concesión de la fuga exige recorrido hecho y ventaja de verdad (B4), y el parte de relevos ya no
 * espera a que cuaje la fuga del día (B6)— y aun así esta huella sale IDÉNTICA dígito a dígito, que
 * es justo lo que tenía que pasar:
 *
 * - Ninguno de los tres consume azar nuevo: no hay dado añadido ni subflujo nuevo, así que ninguna
 *   secuencia se desplaza. El parte de relevos y el motivo (`forKind`, `forId`) son OBSERVACIÓN pura.
 * - El de la concesión y el del parte no tocan la física: solo deciden cuándo se EMITE un evento.
 * - El de dejarse ir sí puede mover tiempos, pero solo en una etapa donde alguien se descolgaba dos
 *   veces, y en estos dos escenarios canónicos eso no ocurre (`llana-180` no tiene descuelgues por
 *   administración y en `reina-150` ninguno se repite). Donde sí ocurre —una carrera de un día
 *   larga y dura— el corredor pierde MENOS tiempo que antes, porque ya no se le vuelve a bajar el
 *   ritmo: está medido en docs/balance.md.
 *
 * **RESELLADA EN LA v15** (el plan de equipo, docs/motor.md §V.1), y solo por UNA de las tres cosas
 * que trae la v15. Antes de resellar se comprobó cuál, porque las otras dos NO podían moverla:
 *
 * - **El plan de equipo no la toca**, y esa es la garantía que sostiene toda la tanda: `llana-180` y
 *   `reina-150` son campos de AGENTES LIBRES (ningún corredor trae `teamId`), así que el mapa de
 *   planes sale vacío, el empuje colectivo vale 0 para todos, no hay equipo llevando el frente y la
 *   fuerza de la caza no se escala con presupuesto ninguno. Es la regla 2 de §V.1 comprobada por
 *   construcción: un corredor sin equipo corre como corría.
 * - **El re-anclaje del depósito tampoco**: los dos escenarios canónicos salen con `energy: 100`
 *   cableado, no con `initialEnergy()`, así que la curva de frescura no interviene.
 * - **Lo que sí la mueve es `shelterAlone`** (§8): el grupo de UN corredor deja de cobrar el rebufo
 *   de un grupo que no tiene. Y el movimiento es exactamente el que eso predice, ni uno más:
 *   - `llana-180`: **ningún tiempo cambia** en las dos semillas (los 40 siguen entrando en 14438 y
 *     en 14585, y `brk-1` sigue con sus 14602). Solo se permutan puestos DENTRO del mismo segundo
 *     —4.º/5.º en la primera semilla, 18.º-20.º en la segunda—, que es lo que arrastra un corredor
 *     que pasó unos km descolgado en solitario y llega con un peaje de energía distinto.
 *   - `reina-150`: se mueven **tres relojes de grupo y como mucho 2 segundos** (14736→14734,
 *     14890→14892, 15167→15168 en la primera semilla; 14259→14260 y 14414→14415 en la segunda), y
 *     los 40 puestos son los mismos. Los que ruedan solos en la criba del puerto final pagan más
 *     viento; el resto de la etapa es idéntico.
 *
 * Es decir: cero movimiento de puestos, cero movimiento en llano y dos segundos en montaña, todo en
 * la dirección que introduce a propósito el rebufo del que va solo. Cualquier otra cosa que mueva
 * esta huella hay que volver a justificarla aquí.
 *
 * **RESELLADA EN LA v16** (el modelo de persecución, docs/motor.md §9). Esta tanda cambia
 * precisamente lo que esta huella mide —cuánto tiempo pierde el que se descuelga—, así que TENÍA que
 * moverse. Lo que se comprobó antes de resellar es que se mueve **solo en la cola** y **sin tocar un
 * puesto**, que es la firma exacta del cambio:
 *
 * - `reina-150`, las dos semillas: **el frente de la carrera sale dígito a dígito igual.** Los
 *   catorce primeros de la primera semilla entran en 14681, 14734 y ~14805 igual que en la v15, y
 *   los diez primeros de la segunda en 14226, 14260 y 14415. Lo que se mueve es de ahí hacia atrás:
 *   el grupeto pasa de 15208 a 15373 (+165 s) y de 14846 a 15011 (+165 s). **Ni un solo puesto
 *   cambia en ninguna de las dos.** Es el resultado que persigue la tanda: el que se resigna pierde
 *   lo que pierde en carretera, y el que pelea por volver sigue peleando igual que antes
 *   (`shedFightCommit` conserva el 0,82 de la v15, y por eso el frente no se entera).
 * - `llana-180`, segunda semilla: **ningún tiempo de grupo cambia** (los 39 siguen entrando en
 *   14585) y el único corredor que se queda cortado, `brk-1`, pasa de +17 s a +104 s. Ese corredor
 *   es literalmente el defecto que esta tanda arregla: en la v15 un recorte fijo de 8 s/km le
 *   devolvía el boquete y llegaba pegado al pelotón; ahora vuelve si su física le da para volver.
 * - `llana-180`, primera semilla: el pelotón entero entra 9 s más tarde (14438 → 14447) y los 40
 *   siguen compartiendo tiempo. No es la cola: es el pelotón, y el motivo es que un descolgado que
 *   antes volvía en el km X vuelve ahora en el X+2, de modo que el P75 de los punteros del pelotón
 *   —que es quien marca su velocidad— se compone de otra gente durante dos kilómetros. Nueve
 *   segundos sobre cuatro horas es el ruido esperable de eso; lo que importa es que **los 40 siguen
 *   llegando juntos**, que es lo que una llana con sprint tiene que hacer.
 *
 * **RESELLADA EN LA v17** (el pelotón no se resigna, docs/balance.md «v17»). La corrección toca lo
 * mismo que la v16 —el ritmo del que va descolgado— así que esta huella tenía que moverse otra vez,
 * y se ha comprobado que se mueve en la DIRECCIÓN CONTRARIA a la v16 y solo donde debe: el grupeto
 * llega ANTES, porque ya no se resigna del todo cuando es mayoría en la carretera.
 *
 * - **`llana-180`, las dos semillas: IDÉNTICAS dígito a dígito.** Ni un puesto ni un segundo. Es la
 *   garantía que el encargo puso por delante de todo —«en una llana que acaba al sprint el pelotón
 *   entero comparte tiempo»— y sale gratis por construcción: el término nuevo solo existe cuando un
 *   grupo descolgado tiene delante a MENOS gente de la que lleva, y en `llana-180` el único cortado
 *   es un corredor solo con 39 por delante (razón 0,026, muy por debajo del suelo de la rampa). El
 *   `brk-1` de la segunda semilla sigue clavado en sus 14689, que es el defecto que arregló la v16 y
 *   que esta tanda NO deshace.
 * - **`reina-150`, primera semilla: los DIECISÉIS primeros salen dígito a dígito igual** (14681,
 *   14734, 14805, 14918). Lo que se mueve es de ahí hacia atrás: el grupeto pasa de 15373 a 15316
 *   (**−57 s**) y `pel-5`, que entraba solo a 15348, se funde en él. Los puestos del 17 al 40 se
 *   permutan DENTRO DEL MISMO SEGUNDO, que es lo que arrastra un peaje de trabajo distinto.
 * - **`reina-150`, segunda semilla: ni un solo puesto cambia, y los ocho primeros tampoco de
 *   tiempo** (14226, 14260, 14415). Se mueven cuatro relojes de grupo, todos hacia ABAJO y todos en
 *   la cola: 14595→14592, 14892→14864, 14942→14906 y 15011→14969 (**−3, −28, −36 y −42 s**).
 *
 * Es decir: cero movimiento en llano, cero movimiento en el frente de la reina, y una cola que llega
 * entre medio minuto y un minuto antes. Y es poco a propósito: en la reina canónica el grupeto se
 * resigna EN EL PUERTO, donde la mayoría se cobra a precio de rebufo (9,6 % en una rampa al 8 %),
 * así que el término nuevo apenas puede hacer nada. Donde sí hace —47 km de terreno rodador con
 * cuatro corredores delante y 126 detrás— es donde estaba el defecto. Cualquier otra cosa que mueva
 * esta huella hay que volver a justificarla aquí.
 *
 * **RESELLADA EN LA v19** (el abanico de la contrarreloj, docs/balance.md «v19»). Esta tanda toca la
 * LEY DE VELOCIDAD, así que la huella tenía que moverse entera y se ha comprobado que se mueve donde
 * la corrección predice, ni más ni menos. Los dos términos nuevos son la escala de potencia con
 * suelo (`p75PowerFloor`) y el exponente por terreno (`p75ExponentClimb`), y lo que hacen es: el
 * llano se aprieta —todos los relojes bajan un 1,2 % porque un pelotón por debajo de la referencia
 * ya no paga la penalización desmedida que pagaba— y la cuesta se queda donde estaba.
 *
 * - **`llana-180`, primera semilla: los 40 siguen entrando al MISMO SEGUNDO** (14447 → 14276). No es
 *   la cola lo que se mueve, es la etapa entera: la llana canónica pasa de 44,4 a 45,2 km/h de
 *   media, que es lo que rueda hoy una llana rápida de gran vuelta. Los puestos se permuten dentro
 *   del mismo segundo, como siempre que cambia el peaje de trabajo.
 * - **`llana-180`, segunda semilla: los 39 siguen juntos** (14585 → 14385) y `brk-1`, el único
 *   cortado, pasa de +104 s a **+87 s**. Es la firma del cambio y hay que mirarla: el corredor que
 *   rueda SOLO ya no pierde contra el pelotón lo que perdía, porque la penalización del que rueda
 *   por debajo de la referencia se ha reducido a la mitad. Sigue perdiendo minuto y medio; no vuelve
 *   gratis, que es lo que arregló la v16.
 * - **`reina-150`: el frente se aprieta y la cola NO se ensancha.** Primera semilla: el ganador pasa
 *   de 14681 a 14397 (−1,9 %, todo ganado en los 135 km llanos que preceden al puerto) y la cola de
 *   15316 a 15003, así que el retraso relativo del último baja de 4,33 % a 4,21 %. Segunda semilla,
 *   lo mismo: 5,22 % → 4,21 %. **La selección no desaparece**: la primera semilla pasa de 5 relojes
 *   de grupo a 7, es decir, la etapa se parte MÁS, que es lo que hace el exponente 1 en la cuesta.
 *
 * Es decir: el llano entero un 1,2 % más rápido con el pelotón igual de junto, el descolgado en
 * solitario perdiendo menos, y la montaña con la misma —o algo más— selección. Cualquier otra cosa
 * que mueva esta huella hay que volver a justificarla aquí.
 *
 * **NO RESELLADA EN LA v21** (la criba que decide la etapa, docs/balance.md «v21»), y eso es un
 * resultado de la tanda y no una casualidad. La v21 SÍ cambia comportamiento del motor —el que se
 * rinde sale del turno de relevos, que es física: cambia el rebufo que paga— y aun así las cuatro
 * huellas salen IDÉNTICAS dígito a dígito:
 *
 * - **Lo del rendido no mueve estos dos escenarios** porque el que se deja ir sale del pelotón al
 *   instante y cae en un grupeto donde TODOS se han rendido, y ahí la regla se desactiva sola (un
 *   grupeto entero de rendidos sigue teniendo que rodar). Muerde donde se vio el defecto: cuando un
 *   rendido REENGANCHA con un grupo que sigue peleando (Race Bességes e4, producción).
 * - **El evento nuevo de la criba lejana no consume azar** y solo decide cuándo se emite una frase.
 * - **Que no se pueda uno dejar ir dentro del último kilómetro** no toca ninguna de las dos etapas:
 *   en `llana-180` llegan los 40 juntos y en `reina-150` el que administra lo hace mucho antes.
 *
 * Y hay una cuarta cosa que NO se ha hecho por lo que esta huella enseñó. El defecto de producción
 * era un ataque narrado en el KM 0, y la corrección natural —prohibir el intento— habría sido no
 * tirar el dado del intento, con lo que el flujo `rngTactics` se desplaza en TODAS las etapas del
 * juego: medido, mueve las cuatro huellas (llana-180 primera semilla +3 s con el mismo orden,
 * segunda semilla −158 s con otra fuga del día; reina-150 +12 s y +28 s con los mismos grupos) y
 * sube la victoria de la fuga en montaña del 41,0 % al 43,8 % sobre 500 corridas, sacando de banda
 * el gate de 120 semillas (47,5 % contra un techo del 45 %). Lo que se ha hecho es quitar la FRASE
 * y no el movimiento: en carretera las fugas salen del disparo. Esta huella es la que lo detectó.
 *
 * **NO RESELLADA EN LA v22** (la rampa de meta, docs/balance.md «v22»). La v22 sustituye el binario
 * `finalStretch.every((b) => b.tipo !== 'subida')` por `admitsBunchFinish(stageFinishType)`, del que
 * cuelgan la caza de los sprinters, el tirón final de los trenes y el plan de equipo. Cambia el
 * comportamiento de 9 de las 1.075 etapas no-crono del calendario, y NINGUNA de las dos de esta
 * huella es una de ellas, por construcción y no por suerte:
 *
 * - `llana-180` son 180 km de `llano` de una pieza: el viejo `every` decía «sí» y el modelo de final
 *   la resuelve `sprint_masivo`, que también dice «sí». Las dos respuestas coinciden y coincidían.
 * - `reina-150` acaba con 15 km al 8 %: el viejo `every` decía «no» —los últimos 2 km son bloques de
 *   subida— y el modelo la resuelve `alto`, el ÚNICO tipo que sigue diciendo «no». Idem.
 *
 * Las dos respuestas solo se separan en el terreno intermedio que ninguno de estos dos escenarios
 * tiene: el repecho de meta. Que estas huellas no se muevan es, por tanto, la comprobación de que el
 * cambio muerde donde debe y de que no hay física nueva por debajo. Cualquier otra cosa que mueva
 * esta huella hay que volver a justificarla aquí.
 *
 * **RESELLADA EN LA v23** (la fuga del día a la que nadie perseguía, docs/balance.md «v23»), y se
 * mueve UNA de las cuatro. Antes de resellar se comprobó cuál y por qué, con la traza de eventos de
 * las cuatro corridas delante:
 *
 * - **`llana-180`, primera semilla: es la que se mueve, y es el caso del arreglo.** Ahí la fuga del
 *   día sale en el **km 0 SIN cuerda**, así que hasta la v22 el pelotón se quedaba «cerrando» a
 *   `tacticControlCommit` = 0,72 y el controlador de la caza no llegaba a ejecutarse: el
 *   `sprinters_chase` se emitía en el **km 91**. Ahora la fuga del día deja de contar como intento
 *   que se cierra y la caza arranca en el **km 72**, diecinueve kilómetros antes. Consecuencia
 *   exacta: los 40 corredores entran **54 s más rápido (14276 → 14222, un 0,38 %)**, siguen entrando
 *   **los 40 en un solo reloj** —ni un grupo nuevo, ni un descolgado, ni un segundo repartido— y la
 *   fuga se caza en el km 158 en vez del 157. Lo único que cambia además del reloj es el ORDEN
 *   dentro de ese mismo segundo, que es lo que arrastra un peaje de trabajo distinto.
 * - **`llana-180`, segunda semilla: IDÉNTICA dígito a dígito.** Su fuga del día sale en el km 28 y
 *   **con** cuerda, así que la rama que el arreglo toca nunca se ejecutaba. Es el control de que el
 *   cambio no toca lo que ya funcionaba.
 * - **Las DOS de `reina-150`: IDÉNTICAS dígito a dígito.** Y por construcción: `reina-150` acaba con
 *   15 km al 8 %, o sea final en `alto`, el único tipo que niega `admitsBunchFinish`, así que
 *   `chasingSprinters` es `false` y la rama de la caza no existe en esa etapa haga lo que haga la
 *   fuga. La montaña no se ha tocado.
 *
 * Es decir: cero movimiento en montaña, cero movimiento en la llana cuya fuga tenía cuerda, y en la
 * cuarta un pelotón que llega 54 s antes por perseguir diecinueve kilómetros más, sin partirse. No
 * hay azar nuevo ni subflujo nuevo: el cambio son dos predicados que además de `allowed` miran
 * `dayBreak`. Cualquier otra cosa que mueva esta huella hay que volver a justificarla aquí.
 *
 * **RESELLADA EN LA v26** (la deriva y la reserva, docs/balance.md «v26»), y solo `reina-150`. Esta
 * tanda cambia la FÍSICA de la subida —quita el dado del descuelgue y pone deriva continua más
 * reserva— así que la montaña TENÍA que moverse; si `reina-150` no se hubiera movido, el cambio no
 * estaría haciendo nada. Antes de resellar se ha comprobado, con la traza de eventos delante, que se
 * mueve exactamente donde el cambio predice:
 *
 * - **`llana-180`, las DOS semillas: idénticas dígito a dígito.** Los 40 de la primera siguen
 *   entrando en 14222 y los 39 de la segunda en 14385 con `pel-13` en 14472. Y es por construcción,
 *   no por suerte: `llana-180` son 180 km de `llano` de una pieza, no tiene un solo bloque de
 *   `subida`, así que la deriva nunca se evalúa y la reserva nunca se gasta. Además, el dado que se
 *   retira es el subflujo `hazard`, que NO alimenta a nadie más: `rough`, `sprint`, `tactics`,
 *   `crash` y `placement` conservan su secuencia entera (SPEC 6.1). Es la garantía de que esta tanda
 *   no toca el llano, y sale gratis.
 * - **`reina-150`, primera semilla: la etapa se vuelve CONTINUA, que es el objetivo de la tanda.**
 *   Los relojes de grupo pasan de 7 a **9**, y sobre todo se deshace el escalón final: donde había
 *   **23 corredores compartiendo el último reloj** (15003) ahora hay 13 en 15018 y 6 en 15112. El
 *   grupo de cabeza queda en 4 (14397 → **14390**) y detrás aparecen los que antes no podían
 *   existir: `bar-4` a **+13 s** y dos hombres a **+57 s**, que en el modelo del dado o iban con el
 *   grupo o aparecían a dos minutos. El podio es el mismo.
 * - **`reina-150`, segunda semilla: lo mismo, y más marcado.** De 5 relojes a **9**, y el escalón de
 *   **23 corredores en 14743** se reparte en 6 · 10 · 6. El podio no cambia (`gc-1`, `gc-2`, `gc-0`)
 *   y el grupo de cabeza sigue siendo 5.
 * - **La cola ENTRA DESPUÉS** (15003 → 15112 y 14743 → 14836) y el frente casi no se mueve (±4 s).
 *   O sea: la etapa selecciona algo más y, sobre todo, reparte el tiempo de forma continua en vez de
 *   a escalones. La brecha 1.º-10.º de la reina canónica se queda en **161 s y 153 s**, dentro de la
 *   banda 60-300 de `sim/targets.ts`.
 *
 * Es decir: cero movimiento en el llano —ni un segundo, ni un puesto— y en la montaña el escalón de
 * veintitrés corredores convertido en una progresión. Cualquier otra cosa que mueva esta huella hay
 * que volver a justificarla aquí. */
const SEALED_RESULTS: Record<string, string> = {
  // v35: se mueven las cuatro, y tenían que moverse por DOS razones distintas (docs/balance.md
  // «v35»), las dos previstas antes de resellar:
  //
  // 1. EL ORDEN CANÓNICO. `simulateStage` ordena por `riderId` antes de mirar nada, y las piernas
  //    del día (`rngDay`) se reparten recorriendo el array: con el mismo campo y la misma semilla,
  //    a cada corredor le toca otro factor. Eso solo permuta quién tiene buen día, así que mueve
  //    las cuatro huellas sin cambiar de qué van: en `llana-180` los 40 siguen entrando en UN solo
  //    reloj salvo el rezagado de siempre (39 + 1 en las dos semillas, igual que en la v34), y el
  //    tiempo del pelotón se mueve un 0,3-0,9 % —14514 -> 14559 y 14321 -> 14449— porque el P75 de
  //    los que marcan el ritmo lo ponen otros hombres. La MEDIA no se mueve: la velocidad del
  //    ganador en llano del montecarlo entero se queda en 45,3 km/h contra 45,4 de la v34.
  // 2. EL RITMO DEL DESCOLGADO Y LA PUERTA. Es la física que esta tanda cambia, y se ve donde tiene
  //    que verse: en `reina-150` la cola entra ANTES (15128 -> 14989 y 14876 -> 14851) porque el
  //    grupeto ya no pelea a 0,82 contra un pelotón que rueda a tempo —rueda a lo que da su
  //    rotación, que en el valle es menos— y a la vez el frente se estira algo más. Los relojes de
  //    grupo pasan de 12 a 10 y de 12 a 10: la etapa reparte el tiempo en menos escalones y más
  //    anchos, que es exactamente lo que hace no reenganchar gratis.
  //
  // Ninguna de las dos gana ni pierde corredores de forma anómala, y ninguna banda de calibración
  // se mueve: el montecarlo entero sale verde antes y después (docs/balance.md «v35» §5).
  'llana-180-0|llana-180|1|v1':
    '1:spr-2:14559,2:spr-0:14559,3:spr-1:14559,4:pel-8:14559,5:pel-19:14559,6:pel-13:14559,7:pel-1:14559,8:pel-4:14559,9:pel-6:14559,10:pel-18:14559,11:pel-16:14559,12:brk-4:14559,13:pel-23:14559,14:pel-28:14559,15:pel-26:14559,16:pel-7:14559,17:pel-29:14559,18:pel-5:14559,19:pel-25:14559,20:pel-14:14559,21:pel-27:14559,22:brk-5:14559,23:pel-22:14559,24:pel-3:14559,25:pel-10:14559,26:pel-11:14559,27:brk-3:14559,28:pel-17:14559,29:pel-12:14559,30:pel-0:14559,31:pel-2:14559,32:pel-15:14559,33:pel-30:14559,34:brk-2:14559,35:brk-0:14559,36:pel-9:14559,37:pel-24:14559,38:brk-1:14559,39:pel-21:14559,40:pel-20:14711',
  'llana-180-1|llana-180|1|v1':
    '1:spr-1:14449,2:spr-2:14449,3:spr-0:14449,4:pel-3:14449,5:pel-11:14449,6:pel-21:14449,7:pel-30:14449,8:pel-6:14449,9:pel-17:14449,10:brk-1:14449,11:pel-18:14449,12:pel-16:14449,13:brk-3:14449,14:pel-15:14449,15:pel-7:14449,16:pel-28:14449,17:pel-25:14449,18:pel-27:14449,19:pel-13:14449,20:pel-4:14449,21:pel-22:14449,22:pel-24:14449,23:pel-10:14449,24:pel-5:14449,25:pel-0:14449,26:pel-9:14449,27:pel-14:14449,28:pel-8:14449,29:pel-19:14449,30:pel-29:14449,31:pel-12:14449,32:pel-26:14449,33:brk-4:14449,34:pel-1:14449,35:brk-0:14449,36:brk-2:14449,37:pel-2:14449,38:pel-20:14449,39:brk-5:14449,40:pel-23:14548',
  'reina-150-0|reina-150|1|v1':
    '1:gc-3:14254,2:gc-2:14254,3:gc-1:14254,4:bar-2:14254,5:bar-4:14254,6:gc-0:14335,7:bar-1:14382,8:bar-3:14414,9:pel-11:14414,10:bar-0:14549,11:pel-7:14549,12:pel-18:14549,13:pel-23:14549,14:pel-12:14549,15:bar-5:14674,16:pel-20:14803,17:pel-6:14873,18:pel-5:14873,19:pel-21:14897,20:pel-10:14897,21:pel-3:14897,22:pel-17:14897,23:pel-9:14897,24:pel-26:14897,25:pel-25:14897,26:pel-19:14897,27:pel-24:14897,28:pel-15:14897,29:pel-16:14897,30:pel-0:14897,31:pel-4:14989,32:pel-22:14989,33:pel-1:14989,34:pel-2:14989,35:pel-14:14989,36:pel-8:14989,37:pel-13:14989,38:spr-2:14989,39:spr-1:14989,40:spr-0:14989',
  'reina-150-1|reina-150|1|v1':
    '1:bar-5:14209,2:gc-2:14220,3:gc-0:14220,4:gc-1:14220,5:bar-1:14220,6:gc-3:14221,7:bar-3:14262,8:bar-0:14262,9:bar-2:14363,10:pel-14:14363,11:pel-1:14363,12:spr-1:14363,13:spr-0:14363,14:bar-4:14407,15:pel-9:14742,16:pel-20:14742,17:pel-26:14742,18:pel-13:14742,19:pel-4:14780,20:pel-23:14780,21:pel-19:14780,22:pel-25:14816,23:pel-3:14816,24:pel-17:14816,25:pel-7:14816,26:pel-10:14816,27:pel-0:14816,28:pel-6:14851,29:pel-11:14851,30:pel-15:14851,31:pel-22:14851,32:pel-21:14851,33:pel-8:14851,34:pel-16:14851,35:pel-24:14851,36:pel-2:14851,37:pel-5:14851,38:pel-18:14851,39:pel-12:14851,40:spr-2:14851',
}

const fingerprint = (out: StageOutput): string =>
  out.results.map((r) => `${r.puesto}:${r.riderId}:${r.tiempoS}`).join(',')

describe('la huella sellada del reparto de tiempos', () => {
  it('los resultados de una etapa con una semilla dada son los sellados', () => {
    for (const scenario of [flatScenario(), queenScenario()]) {
      for (const seed of campaignSeeds(scenario.name, 2)) {
        const expected = SEALED_RESULTS[seed]
        expect(expected, `falta la huella sellada de ${seed}`).toBeDefined()
        expect(fingerprint(simulateStage(scenario.input, seed))).toBe(expected)
      }
    }
  })
})

// --- Campo de pruebas ------------------------------------------------------------------------

function eff(
  base: number,
  over: Partial<Record<Attribute, number>> = {},
): Record<Attribute, number> {
  return {
    RES: base,
    REC: base,
    LLA: base,
    MON: base,
    COL: base,
    CRI: base,
    SPR: base,
    DES: base,
    PAV: base,
    TAC: base,
    ...over,
  }
}

function orders(o: Partial<StageOrders>): StageOrders {
  return { role: 'libre', mentality: 'reservon', contestSprints: false, contestClimbs: false, ...o }
}

function rider(id: string, over: Partial<StageRider>): StageRider {
  return {
    riderId: id,
    eff0: eff(50),
    energy: 100,
    matches: 4,
    tsb: 0,
    orders: orders({}),
    gcDeficitSeconds: 0,
    ...over,
  }
}

/** Una llana con trenes de sprint: el pelotón caza, así que hay trabajo que atribuir. */
function chaseInput(): StageInput {
  const riders: StageRider[] = []
  for (let t = 0; t < 3; t++) {
    const leader = `spr-${t}`
    riders.push(
      rider(leader, {
        eff0: eff(58, { SPR: 84 + t, LLA: 70 }),
        orders: orders({ role: 'sprinter', contestSprints: true }),
      }),
    )
    riders.push(
      rider(`lan-${t}`, {
        eff0: eff(58, { SPR: 68, LLA: 74 }),
        orders: orders({ role: 'lanzador', targetRiderId: leader, contestSprints: true }),
      }),
    )
    for (let g = 0; g < 3; g++) {
      riders.push(
        rider(`greg-${t}-${g}`, {
          eff0: eff(58, { LLA: 70 + g }),
          orders: orders({ role: 'gregario', targetRiderId: leader }),
        }),
      )
    }
  }
  for (let i = 0; i < 6; i++) {
    riders.push(
      rider(`brk-${i}`, {
        eff0: eff(56, { TAC: 62, LLA: 68 }),
        orders: orders({ role: 'cazaetapas', mentality: 'combativo', contestSprints: true }),
      }),
    )
  }
  for (let i = 0; i < 14; i++)
    riders.push(rider(`pel-${i}`, { eff0: eff(56, { LLA: 62 + (i % 8) }) }))
  return {
    profile: {
      segments: [{ km: 180, tipo: 'llano' }],
      banners: [{ km: 100, tipo: 'meta_volante' }],
    },
    riders,
  }
}

const seeds = Array.from({ length: 24 }, (_, i) =>
  stageSeed({ worldSeed: `atr-${i}`, raceId: 'atr', stageDay: 1, engineVersion: 1 }),
)
const runs = seeds.map((s) => simulateStage(chaseInput(), s))

// --- 1. Quién tira del pelotón ----------------------------------------------------------------

describe('peloton_pull: quién tira del pelotón', () => {
  const pulls = (out: StageOutput) => out.events.filter((e) => e.plantilla === 'peloton_pull')

  it('sale unas pocas veces por etapa, ni una ni veinte', () => {
    const counts = runs.map((out) => pulls(out).length)
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length
    // El objetivo declarado del encargo: 3-6 por etapa. Se comprueba la media y el peor caso.
    expect(mean).toBeGreaterThanOrEqual(2.5)
    expect(mean).toBeLessThanOrEqual(6.5)
    expect(Math.max(...counts)).toBeLessThanOrEqual(9)
  })

  // La regla cambió en la v13: el parte ya NO exige que la fuga del día esté formada, porque una
  // carrera en la que no cuaja ninguna deja el tramo medio sin una sola línea (medido en producción:
  // Race Muscat, del km 33 al 136 en blanco). Lo que sigue prohibido es hablar de «quién tira»
  // mientras el pelotón va en bloque, y eso lo marca `pullNoBreakRouteFrac` (docs/balance.md v13).
  it('nombra a 1-3 corredores, y nunca cuando el pelotón aún va en bloque', () => {
    const totalKm = 180
    for (const out of runs) {
      const formed = out.events.find((e) => e.plantilla === 'breakaway_formed')
      for (const e of pulls(out)) {
        expect(e.protagonistas.length).toBeGreaterThanOrEqual(1)
        expect(e.protagonistas.length).toBeLessThanOrEqual(STAGE.pullNamesMax)
        expect(new Set(e.protagonistas).size).toBe(e.protagonistas.length)
        const conFuga = formed != null && e.km >= formed.km
        expect(conFuga || e.km >= totalKm * STAGE.pullNoBreakRouteFrac).toBe(true)
      }
    }
  })

  it('trae el esfuerzo del pelotón y los km que faltan', () => {
    for (const out of runs) {
      for (const e of pulls(out)) {
        expect(['tempo', 'firme', 'tope']).toContain(String(e.datos!.effort))
        expect(Number(e.datos!.commit)).toBeGreaterThan(0)
        expect(Number(e.datos!.toGo)).toBeGreaterThanOrEqual(0)
        expect(Number(e.datos!.size)).toBeGreaterThan(0)
      }
    }
  })

  it('respeta su throttle: dos partes seguidos no caen encima', () => {
    for (const out of runs) {
      const kms = pulls(out)
        .map((e) => e.km)
        .sort((a, b) => a - b)
      for (let i = 1; i < kms.length; i++) {
        expect(kms[i]! - kms[i - 1]!).toBeGreaterThanOrEqual(STAGE.pullReportMinKmGap - 1e-9)
      }
    }
  })

  it('no repite a los mismos que ya tiraban en el parte anterior', () => {
    for (const out of runs) {
      const list = pulls(out).sort((a, b) => a.km - b.km)
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1]!.protagonistas.join()
        // Se emite por CAMBIO de quién manda o por caducidad del parte; si es lo segundo, el km
        // de por medio lo justifica.
        if (prev === list[i]!.protagonistas.join()) {
          expect(list[i]!.km - list[i - 1]!.km).toBeGreaterThanOrEqual(STAGE.pullReportKmGap - 1e-9)
        }
      }
    }
  })
})

// --- 2. Quién cerró ---------------------------------------------------------------------------

describe('chase_work: quién hizo el trabajo para cerrar', () => {
  const works = (out: StageOutput) => out.events.filter((e) => e.plantilla === 'chase_work')

  it('va enganchado a una captura narrada, nunca suelto', () => {
    const catches = new Set(['breakaway_caught', 'move_caught', 'attack_reeled'])
    let seen = 0
    for (const out of runs) {
      for (const e of works(out)) {
        seen += 1
        const parent = out.events.find(
          (o) => catches.has(o.plantilla) && o.km === e.km && o.datos?.narra !== 0,
        )
        expect(parent, `chase_work sin captura en el km ${e.km}`).toBeDefined()
      }
    }
    // Y en un banco donde el pelotón caza de verdad tiene que salir alguna vez.
    expect(seen).toBeGreaterThan(0)
  })

  it('dice cuántos segundos se cerraron y en cuántos km', () => {
    for (const out of runs) {
      for (const e of works(out)) {
        expect(Number(e.datos!.closedS)).toBeGreaterThanOrEqual(STAGE.chaseWorkMinGapSeconds)
        expect(Number(e.datos!.km)).toBeGreaterThan(0)
        expect(e.protagonistas.length).toBeGreaterThanOrEqual(1)
        expect(e.protagonistas.length).toBeLessThanOrEqual(STAGE.chaseWorkNamesMax)
      }
    }
  })

  it('si nadie tiró, la captura no tiene autor y no se emite', () => {
    // Un pelotón sin rematadores ni trenes rueda a tempo: lo que se caza, se caza solo.
    const lazy: StageInput = {
      profile: { segments: [{ km: 180, tipo: 'llano' }] },
      riders: Array.from({ length: 30 }, (_, i) =>
        rider(`uni-${i}`, { eff0: eff(55, { LLA: 55 + (i % 4) }) }),
      ),
    }
    for (const seed of seeds.slice(0, 8)) {
      const out = simulateStage(lazy, seed)
      for (const e of out.events.filter((x) => x.plantilla === 'chase_work')) {
        // Si aun así se emite, es porque el pelotón apretó de verdad: nunca con trabajo nulo.
        expect(Number(e.datos!.work)).toBeGreaterThanOrEqual(STAGE.chaseWorkMinUnits)
      }
    }
  })
})

// --- 3. La colaboración dentro de la fuga -----------------------------------------------------

describe('break_share: quién se reparte el trabajo en la fuga', () => {
  it('solo se cuenta con una fuga viva de varios corredores, y una vez por etapa', () => {
    for (const out of runs) {
      const shares = out.events.filter((e) => e.plantilla === 'break_share')
      expect(shares.length).toBeLessThanOrEqual(1)
      for (const e of shares) {
        expect(e.protagonistas.length).toBeGreaterThanOrEqual(1)
        expect(Number(e.datos!.size)).toBeGreaterThanOrEqual(STAGE.breakShareMinRiders)
        expect(Number(e.datos!.passengers)).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// --- 4. El muro de texto ----------------------------------------------------------------------

describe('la crónica sigue sin ser un muro de texto', () => {
  it('la atribución añade unas líneas, no una lista', () => {
    for (const out of runs) {
      const added = out.events.filter((e) =>
        ['peloton_pull', 'chase_work', 'break_share'].includes(e.plantilla),
      )
      expect(added.length).toBeLessThanOrEqual(12)
    }
  })
})

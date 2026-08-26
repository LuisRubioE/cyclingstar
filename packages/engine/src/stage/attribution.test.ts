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
  /**
   * RESELLADO EN LA v38, Y LAS CUATRO HUELLAS CAMBIAN ENTERAS PORQUE HA CAMBIADO EL CAMPO.
   *
   * El banco canónico corría **40 corredores sin equipo**, y el dueño lo tumbó: «pero es que sin
   * equipo cambia mucho la cosa… esas simulaciones no valen para nada», y después «pon un pelotón
   * de verdad en el escenario canónico». Ahora son **176 corredores en 22 equipos de 8**, que es el
   * campo que corre el juego. Con otro campo no hay huella que conservar: lo que se vuelve a sellar
   * es que la FORMA de cada etapa es la que tiene que ser, y eso es lo que se justifica aquí.
   *
   *   llana-180-0  gana spr-4    · 173 juntos, 2 a +99 s, 1 a +608 s
   *   llana-180-1  gana spr-0    · 171 juntos, luego 1, 1, 2 y 1 desperdigados hasta +631 s
   *   reina-150-0  gana pel-62   · 3 delante, seis grupitos, y el grueso en 48+95 a +476/+609 s
   *   reina-150-1  gana bar-3    · 8 delante, cinco grupitos, y el grueso en 37+119 a +594/+707 s
   *
   * Las dos LLANAS meten al pelotón entero en un solo reloj —173 y 171 de 176— con una cola de dos
   * o tres rezagados: es una llegada masiva, que es de lo que va una llana. Las dos REINAS reparten
   * el campo en nueve y diez relojes con el ganador llegando en un grupo de 3 y de 8, y el grueso
   * más de siete minutos detrás: la montaña rompe la carrera, que es de lo que va una reina. Ni el
   * escalón de veintitrés que destapó este banco en su día ni un pelotón entero al mismo segundo en
   * una etapa de montaña.
   *
   * Y ninguna banda de calibración se mueve con el campo nuevo: la campaña de 200 corridas sale
   * entera en verde (docs/balance.md «v38»).
   */
  'llana-180-0|llana-180|1|v1':
    '1:spr-4:14577,2:spr-6:14577,3:spr-3:14577,4:spr-5:14577,5:spr-0:14577,6:spr-1:14577,7:spr-7:14577,8:spr-2:14577,9:pel-87:14577,10:pel-130:14577,11:spr-8:14577,12:pel-43:14577,13:pel-139:14577,14:spr-9:14577,15:pel-62:14577,16:pel-94:14577,17:pel-78:14577,18:pel-45:14577,19:pel-34:14577,20:pel-4:14577,21:pel-142:14577,22:pel-118:14577,23:pel-143:14577,24:pel-76:14577,25:pel-149:14577,26:pel-6:14577,27:pel-9:14577,28:pel-1:14577,29:pel-96:14577,30:pel-123:14577,31:pel-133:14577,32:pel-124:14577,33:pel-65:14577,34:pel-146:14577,35:pel-141:14577,36:pel-40:14577,37:pel-49:14577,38:pel-107:14577,39:pel-38:14577,40:pel-151:14577,41:pel-50:14577,42:pel-153:14577,43:pel-55:14577,44:pel-7:14577,45:pel-28:14577,46:pel-61:14577,47:pel-12:14577,48:pel-70:14577,49:pel-56:14577,50:pel-21:14577,51:pel-150:14577,52:pel-2:14577,53:pel-69:14577,54:pel-32:14577,55:pel-137:14577,56:pel-8:14577,57:pel-125:14577,58:pel-14:14577,59:pel-33:14577,60:pel-95:14577,61:pel-79:14577,62:brk-1:14577,63:pel-152:14577,64:pel-135:14577,65:pel-83:14577,66:pel-108:14577,67:pel-145:14577,68:pel-64:14577,69:pel-157:14577,70:pel-97:14577,71:pel-30:14577,72:pel-31:14577,73:pel-93:14577,74:pel-132:14577,75:pel-77:14577,76:pel-148:14577,77:pel-53:14577,78:pel-121:14577,79:pel-20:14577,80:pel-37:14577,81:pel-115:14577,82:pel-101:14577,83:pel-42:14577,84:pel-5:14577,85:pel-15:14577,86:pel-72:14577,87:pel-89:14577,88:pel-67:14577,89:pel-85:14577,90:pel-47:14577,91:pel-10:14577,92:pel-59:14577,93:pel-35:14577,94:pel-109:14577,95:pel-91:14577,96:pel-51:14577,97:pel-41:14577,98:pel-140:14577,99:brk-2:14577,100:pel-74:14577,101:pel-131:14577,102:pel-11:14577,103:pel-68:14577,104:brk-3:14577,105:pel-104:14577,106:pel-18:14577,107:pel-66:14577,108:pel-29:14577,109:pel-159:14577,110:pel-103:14577,111:pel-90:14577,112:pel-80:14577,113:pel-73:14577,114:pel-52:14577,115:pel-129:14577,116:pel-116:14577,117:pel-23:14577,118:pel-105:14577,119:pel-100:14577,120:pel-102:14577,121:pel-0:14577,122:brk-5:14577,123:pel-86:14577,124:pel-82:14577,125:pel-54:14577,126:pel-3:14577,127:pel-136:14577,128:pel-39:14577,129:pel-75:14577,130:pel-127:14577,131:pel-154:14577,132:pel-36:14577,133:pel-119:14577,134:pel-92:14577,135:pel-44:14577,136:pel-25:14577,137:pel-13:14577,138:pel-144:14577,139:pel-17:14577,140:pel-117:14577,141:pel-24:14577,142:pel-138:14577,143:pel-63:14577,144:pel-113:14577,145:pel-58:14577,146:pel-88:14577,147:pel-26:14577,148:pel-60:14577,149:pel-134:14577,150:pel-27:14577,151:pel-81:14577,152:pel-158:14577,153:pel-48:14577,154:pel-111:14577,155:pel-110:14577,156:pel-98:14577,157:pel-16:14577,158:pel-46:14577,159:pel-147:14577,160:pel-155:14577,161:pel-128:14577,162:pel-22:14577,163:pel-112:14577,164:pel-106:14577,165:pel-122:14577,166:pel-114:14577,167:brk-0:14577,168:pel-126:14577,169:pel-84:14577,170:pel-99:14577,171:brk-4:14577,172:pel-19:14577,173:pel-120:14577,174:pel-71:14676,175:pel-57:14676,176:pel-156:15185',
  'llana-180-1|llana-180|1|v1':
    '1:spr-0:14856,2:spr-2:14856,3:spr-7:14856,4:spr-3:14856,5:spr-6:14856,6:spr-1:14856,7:spr-5:14856,8:spr-4:14856,9:spr-8:14856,10:spr-9:14856,11:pel-6:14856,12:pel-58:14856,13:pel-142:14856,14:pel-28:14856,15:pel-138:14856,16:pel-39:14856,17:pel-68:14856,18:pel-55:14856,19:pel-100:14856,20:pel-113:14856,21:pel-118:14856,22:pel-60:14856,23:pel-40:14856,24:pel-145:14856,25:pel-122:14856,26:pel-89:14856,27:pel-13:14856,28:pel-119:14856,29:pel-61:14856,30:pel-31:14856,31:pel-141:14856,32:pel-9:14856,33:pel-139:14856,34:pel-82:14856,35:pel-16:14856,36:brk-3:14856,37:pel-30:14856,38:pel-15:14856,39:pel-137:14856,40:pel-90:14856,41:pel-23:14856,42:pel-8:14856,43:pel-56:14856,44:pel-17:14856,45:pel-34:14856,46:pel-91:14856,47:pel-107:14856,48:pel-93:14856,49:pel-54:14856,50:pel-46:14856,51:pel-38:14856,52:pel-72:14856,53:pel-5:14856,54:pel-103:14856,55:pel-129:14856,56:pel-10:14856,57:pel-147:14856,58:pel-45:14856,59:pel-105:14856,60:pel-95:14856,61:pel-41:14856,62:pel-79:14856,63:pel-99:14856,64:pel-47:14856,65:pel-159:14856,66:pel-71:14856,67:pel-133:14856,68:pel-21:14856,69:pel-52:14856,70:pel-19:14856,71:pel-124:14856,72:pel-121:14856,73:pel-94:14856,74:pel-104:14856,75:pel-0:14856,76:pel-111:14856,77:pel-63:14856,78:pel-37:14856,79:pel-127:14856,80:pel-154:14856,81:pel-62:14856,82:pel-77:14856,83:pel-42:14856,84:pel-67:14856,85:pel-49:14856,86:brk-4:14856,87:pel-120:14856,88:pel-112:14856,89:pel-22:14856,90:pel-117:14856,91:pel-20:14856,92:pel-143:14856,93:pel-74:14856,94:brk-0:14856,95:pel-25:14856,96:pel-12:14856,97:pel-150:14856,98:pel-116:14856,99:pel-109:14856,100:pel-135:14856,101:pel-50:14856,102:pel-24:14856,103:pel-85:14856,104:pel-27:14856,105:pel-106:14856,106:pel-101:14856,107:pel-149:14856,108:pel-80:14856,109:pel-97:14856,110:pel-146:14856,111:pel-87:14856,112:pel-32:14856,113:pel-76:14856,114:pel-84:14856,115:pel-7:14856,116:pel-70:14856,117:pel-102:14856,118:pel-35:14856,119:pel-81:14856,120:pel-48:14856,121:pel-108:14856,122:pel-2:14856,123:pel-128:14856,124:pel-1:14856,125:pel-83:14856,126:pel-36:14856,127:pel-3:14856,128:pel-73:14856,129:pel-110:14856,130:pel-64:14856,131:pel-78:14856,132:pel-59:14856,133:pel-126:14856,134:pel-51:14856,135:pel-86:14856,136:pel-69:14856,137:pel-140:14856,138:pel-96:14856,139:pel-4:14856,140:pel-29:14856,141:pel-53:14856,142:pel-123:14856,143:pel-134:14856,144:pel-43:14856,145:pel-115:14856,146:pel-156:14856,147:pel-11:14856,148:pel-66:14856,149:pel-92:14856,150:pel-65:14856,151:pel-153:14856,152:pel-14:14856,153:pel-158:14856,154:pel-57:14856,155:brk-1:14856,156:brk-5:14856,157:pel-75:14856,158:pel-157:14856,159:pel-18:14856,160:pel-33:14856,161:pel-88:14856,162:pel-132:14856,163:pel-155:14856,164:pel-136:14856,165:pel-130:14856,166:pel-98:14856,167:pel-144:14856,168:pel-44:14856,169:brk-2:14856,170:pel-114:14856,171:pel-148:14856,172:pel-125:15010,173:pel-131:15039,174:pel-26:15176,175:pel-152:15176,176:pel-151:15487',
  'reina-150-0|reina-150|1|v1':
    '1:pel-62:14642,2:pel-152:14642,3:pel-160:14642,4:bar-1:14684,5:gc-3:14729,6:gc-2:14729,7:gc-1:14776,8:gc-0:14800,9:bar-4:14800,10:bar-3:14869,11:bar-2:14869,12:bar-0:14869,13:pel-18:14869,14:pel-151:14869,15:pel-161:14869,16:pel-140:14869,17:pel-143:15118,18:pel-11:15118,19:pel-107:15118,20:pel-119:15118,21:pel-30:15118,22:pel-67:15118,23:pel-105:15118,24:pel-82:15118,25:pel-131:15118,26:pel-138:15118,27:pel-80:15118,28:pel-94:15118,29:pel-34:15118,30:pel-70:15118,31:pel-162:15118,32:pel-118:15118,33:pel-71:15118,34:pel-153:15118,35:pel-76:15118,36:pel-55:15118,37:pel-64:15118,38:pel-31:15118,39:pel-10:15118,40:pel-14:15118,41:pel-97:15118,42:pel-79:15118,43:pel-47:15118,44:pel-19:15118,45:pel-43:15118,46:pel-27:15118,47:pel-13:15118,48:bar-5:15118,49:pel-75:15118,50:pel-78:15118,51:pel-48:15118,52:pel-2:15118,53:pel-145:15118,54:pel-73:15118,55:pel-5:15118,56:pel-65:15118,57:pel-28:15118,58:pel-49:15118,59:pel-12:15118,60:pel-137:15118,61:pel-17:15118,62:pel-36:15118,63:pel-3:15118,64:pel-126:15118,65:pel-8:15251,66:pel-83:15251,67:pel-69:15251,68:pel-21:15251,69:pel-40:15251,70:pel-146:15251,71:pel-20:15251,72:pel-155:15251,73:pel-52:15251,74:pel-113:15251,75:pel-116:15251,76:pel-33:15251,77:pel-54:15251,78:pel-7:15251,79:pel-124:15251,80:pel-46:15251,81:pel-117:15251,82:pel-92:15251,83:pel-90:15251,84:pel-61:15251,85:pel-128:15251,86:pel-39:15251,87:pel-135:15251,88:pel-68:15251,89:pel-91:15251,90:pel-59:15251,91:pel-102:15251,92:pel-58:15251,93:pel-104:15251,94:pel-115:15251,95:pel-103:15251,96:pel-127:15251,97:pel-95:15251,98:pel-114:15251,99:pel-4:15251,100:pel-72:15251,101:pel-99:15251,102:pel-111:15251,103:pel-32:15251,104:pel-23:15251,105:pel-53:15251,106:pel-35:15251,107:pel-150:15251,108:pel-134:15251,109:pel-141:15251,110:pel-81:15251,111:pel-9:15251,112:pel-41:15251,113:pel-57:15251,114:pel-123:15251,115:pel-101:15251,116:pel-149:15251,117:pel-159:15251,118:pel-148:15251,119:pel-1:15251,120:pel-51:15251,121:pel-29:15251,122:pel-74:15251,123:pel-147:15251,124:pel-100:15251,125:pel-6:15251,126:pel-133:15251,127:pel-120:15251,128:pel-60:15251,129:pel-42:15251,130:pel-38:15251,131:pel-156:15251,132:pel-142:15251,133:pel-93:15251,134:pel-15:15251,135:pel-96:15251,136:pel-121:15251,137:spr-0:15251,138:pel-108:15251,139:pel-86:15251,140:pel-63:15251,141:pel-106:15251,142:pel-16:15251,143:pel-144:15251,144:pel-45:15251,145:pel-26:15251,146:pel-125:15251,147:pel-77:15251,148:pel-85:15251,149:pel-98:15251,150:pel-112:15251,151:pel-84:15251,152:pel-24:15251,153:pel-158:15251,154:pel-157:15251,155:pel-136:15251,156:pel-122:15251,157:pel-37:15251,158:spr-2:15251,159:pel-139:15251,160:pel-22:15321,161:pel-89:15321,162:pel-154:15321,163:pel-56:15321,164:pel-129:15321,165:pel-130:15321,166:pel-109:15321,167:pel-50:15321,168:pel-87:15321,169:pel-25:15321,170:spr-1:15321,171:pel-110:15335,172:pel-0:15335,173:pel-88:15335,174:pel-44:15335,175:pel-66:15335,176:pel-132:15335',
  'reina-150-1|reina-150|1|v1':
    '1:bar-3:14398,2:bar-0:14398,3:bar-2:14398,4:pel-119:14398,5:pel-76:14398,6:pel-103:14398,7:pel-23:14398,8:pel-61:14398,9:gc-0:14587,10:bar-5:14607,11:gc-1:14689,12:gc-3:14689,13:gc-2:14689,14:bar-1:14778,15:bar-4:14807,16:pel-42:14992,17:pel-6:14992,18:pel-108:14992,19:pel-95:14992,20:pel-4:14992,21:pel-78:14992,22:pel-71:14992,23:pel-13:14992,24:pel-19:14992,25:pel-117:14992,26:pel-16:14992,27:pel-68:14992,28:pel-152:14992,29:pel-127:14992,30:pel-141:14992,31:pel-55:14992,32:pel-34:14992,33:pel-112:14992,34:pel-47:14992,35:pel-54:14992,36:pel-66:14992,37:pel-32:14992,38:pel-18:14992,39:pel-56:14992,40:pel-59:14992,41:pel-116:14992,42:pel-123:14992,43:pel-161:14992,44:pel-114:14992,45:pel-27:14992,46:pel-137:14992,47:pel-1:14992,48:pel-134:14992,49:pel-11:14992,50:pel-121:14992,51:pel-62:14992,52:pel-24:14992,53:pel-162:15105,54:pel-94:15105,55:pel-122:15105,56:pel-43:15105,57:pel-104:15105,58:pel-46:15105,59:pel-83:15105,60:pel-155:15105,61:pel-31:15105,62:pel-81:15105,63:pel-142:15105,64:pel-37:15105,65:pel-57:15105,66:pel-149:15105,67:pel-79:15105,68:pel-50:15105,69:pel-139:15105,70:pel-44:15105,71:pel-89:15105,72:pel-49:15105,73:pel-30:15105,74:pel-77:15105,75:pel-20:15105,76:pel-21:15105,77:pel-8:15105,78:pel-159:15105,79:pel-64:15105,80:pel-135:15105,81:pel-126:15105,82:pel-146:15105,83:pel-17:15105,84:pel-88:15105,85:pel-58:15105,86:pel-12:15105,87:pel-157:15105,88:pel-144:15105,89:pel-48:15105,90:pel-53:15105,91:pel-102:15105,92:pel-100:15105,93:pel-129:15105,94:pel-153:15105,95:pel-101:15105,96:pel-65:15105,97:pel-156:15105,98:pel-36:15105,99:pel-67:15105,100:pel-154:15105,101:pel-148:15105,102:pel-15:15105,103:pel-39:15105,104:pel-115:15105,105:pel-10:15105,106:pel-151:15105,107:pel-160:15105,108:pel-63:15105,109:pel-91:15105,110:pel-5:15105,111:pel-105:15105,112:pel-74:15105,113:pel-73:15105,114:pel-9:15105,115:pel-130:15105,116:pel-33:15105,117:pel-131:15105,118:pel-29:15105,119:pel-113:15105,120:pel-45:15105,121:pel-2:15105,122:pel-98:15105,123:pel-99:15105,124:pel-82:15105,125:pel-35:15105,126:pel-145:15105,127:pel-96:15105,128:pel-70:15105,129:pel-136:15105,130:pel-120:15105,131:pel-128:15105,132:pel-40:15105,133:pel-111:15105,134:pel-69:15105,135:pel-52:15105,136:pel-140:15105,137:pel-90:15105,138:pel-110:15105,139:pel-158:15105,140:pel-84:15105,141:pel-0:15105,142:pel-147:15105,143:pel-97:15105,144:pel-109:15105,145:pel-124:15105,146:pel-72:15105,147:pel-22:15105,148:pel-93:15105,149:pel-143:15105,150:pel-75:15105,151:pel-14:15105,152:pel-7:15105,153:pel-80:15105,154:pel-51:15105,155:pel-125:15105,156:pel-86:15105,157:pel-87:15105,158:pel-38:15105,159:pel-138:15105,160:pel-3:15105,161:pel-150:15105,162:pel-41:15105,163:pel-25:15105,164:spr-0:15105,165:pel-92:15105,166:pel-118:15105,167:pel-26:15105,168:pel-132:15105,169:pel-60:15105,170:pel-28:15105,171:spr-1:15105,172:pel-106:15171,173:pel-133:15171,174:pel-85:15171,175:pel-107:15171,176:spr-2:15171',
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

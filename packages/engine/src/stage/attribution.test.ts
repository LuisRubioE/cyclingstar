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
   * RESELLADO EN LA v40, y esta vez lo que hay que justificar es lo POCO que se mueve. Las cuatro
   * etapas conservan GANADOR y FORMA —`spr-6`, `spr-0`, `pel-67` y `gc-0`, con sus mismos grupos de
   * llegada— y el único cambio de reloj es de un segundo en la segunda reina (30 corredores a +587
   * pasan a +588). Ni un puesto de podio, ni un grupo que aparezca o desaparezca.
   *
   * Y es la respuesta correcta a esta tanda, no una casualidad: la v40 arregla el ADOQUÍN (el
   * sector volvía a juntar lo que había roto), el GENERADOR de recorridos (daba perfil de etapa
   * reina a las clásicas de un día) y el DIARIO (70 contradicciones medidas, 10 al cerrar). El
   * banco canónico es sintético, no tiene un metro de adoquín, no sale del generador y no lee la
   * crónica: tenía que quedarse quieto. Que se moviera habría sido la señal de alarma.
   *
   * Lo que sí cambia el segundo de la reina es la regla del descolgado —a cero ya no se pelea
   * (`shedFightFreshness`)—, que es física y sí toca a la montaña. Un segundo sobre 15.000 en la
   * cola de la etapa es exactamente el tamaño que le corresponde.
   *
   *   llana-180-0  gana spr-6  ·  173 juntos, 2 a +127 s, 1 a +468 s
   *   llana-180-1  gana spr-0  ·  172 juntos, y 1, 1 y 2 hasta +336 s
   *   reina-150-0  gana pel-67 ·  11 relojes, 8 delante, el grueso a +477/+592/+615 s
   *   reina-150-1  gana gc-0   ·  8 relojes, ganador EN SOLITARIO a +92 s del segundo grupo
   *
   * La batería sale 1337/1337 y la campaña de 200 corridas, 33 de 33 objetivos en banda.
   */
  'llana-180-0|llana-180|1|v1':
    '1:spr-6:14755,2:spr-0:14755,3:spr-1:14755,4:spr-5:14755,5:spr-8:14755,6:spr-2:14755,7:spr-4:14755,8:spr-3:14755,9:spr-7:14755,10:pel-45:14755,11:pel-78:14755,12:pel-43:14755,13:pel-89:14755,14:spr-9:14755,15:pel-87:14755,16:pel-142:14755,17:pel-139:14755,18:pel-156:14755,19:pel-123:14755,20:pel-130:14755,21:pel-133:14755,22:pel-39:14755,23:pel-61:14755,24:pel-68:14755,25:pel-85:14755,26:pel-118:14755,27:pel-77:14755,28:pel-62:14755,29:pel-4:14755,30:pel-94:14755,31:pel-111:14755,32:pel-100:14755,33:pel-149:14755,34:pel-70:14755,35:pel-55:14755,36:pel-143:14755,37:pel-67:14755,38:pel-49:14755,39:pel-98:14755,40:pel-125:14755,41:pel-91:14755,42:pel-21:14755,43:pel-42:14755,44:pel-121:14755,45:brk-2:14755,46:pel-32:14755,47:pel-83:14755,48:pel-33:14755,49:pel-141:14755,50:pel-10:14755,51:pel-52:14755,52:pel-14:14755,53:pel-34:14755,54:pel-51:14755,55:pel-99:14755,56:pel-12:14755,57:pel-147:14755,58:pel-148:14755,59:pel-109:14755,60:pel-40:14755,61:pel-127:14755,62:pel-146:14755,63:pel-50:14755,64:pel-136:14755,65:pel-131:14755,66:pel-59:14755,67:pel-86:14755,68:pel-95:14755,69:pel-102:14755,70:pel-65:14755,71:pel-107:14755,72:pel-6:14755,73:pel-44:14755,74:pel-145:14755,75:pel-41:14755,76:pel-37:14755,77:pel-124:14755,78:pel-134:14755,79:pel-150:14755,80:pel-54:14755,81:pel-31:14755,82:pel-84:14755,83:pel-8:14755,84:pel-154:14755,85:pel-101:14755,86:pel-151:14755,87:pel-97:14755,88:pel-116:14755,89:pel-36:14755,90:pel-159:14755,91:pel-144:14755,92:pel-76:14755,93:pel-92:14755,94:pel-56:14755,95:pel-96:14755,96:pel-93:14755,97:pel-80:14755,98:pel-135:14755,99:pel-155:14755,100:pel-103:14755,101:pel-69:14755,102:pel-38:14755,103:pel-117:14755,104:pel-140:14755,105:pel-64:14755,106:pel-106:14755,107:brk-3:14755,108:pel-88:14755,109:pel-1:14755,110:pel-79:14755,111:pel-75:14755,112:pel-90:14755,113:pel-132:14755,114:pel-28:14755,115:pel-23:14755,116:pel-74:14755,117:pel-108:14755,118:pel-72:14755,119:pel-17:14755,120:pel-152:14755,121:pel-15:14755,122:pel-16:14755,123:pel-82:14755,124:pel-105:14755,125:pel-112:14755,126:pel-129:14755,127:pel-60:14755,128:pel-157:14755,129:pel-11:14755,130:pel-35:14755,131:pel-30:14755,132:pel-119:14755,133:pel-47:14755,134:pel-115:14755,135:pel-126:14755,136:pel-7:14755,137:pel-18:14755,138:pel-46:14755,139:pel-73:14755,140:pel-13:14755,141:pel-2:14755,142:pel-9:14755,143:pel-120:14755,144:pel-66:14755,145:pel-137:14755,146:pel-110:14755,147:brk-5:14755,148:pel-138:14755,149:pel-29:14755,150:pel-81:14755,151:brk-4:14755,152:pel-48:14755,153:pel-58:14755,154:pel-128:14755,155:pel-25:14755,156:pel-24:14755,157:pel-27:14755,158:pel-0:14755,159:pel-122:14755,160:pel-26:14755,161:pel-63:14755,162:pel-114:14755,163:pel-104:14755,164:pel-22:14755,165:pel-113:14755,166:pel-19:14755,167:pel-158:14755,168:pel-53:14755,169:pel-3:14755,170:brk-1:14755,171:pel-5:14755,172:pel-20:14755,173:brk-0:14755,174:pel-71:14882,175:pel-57:14882,176:pel-153:15223',
  'llana-180-1|llana-180|1|v1':
    '1:spr-0:14713,2:spr-6:14713,3:spr-1:14713,4:spr-2:14713,5:spr-3:14713,6:spr-7:14713,7:spr-8:14713,8:spr-9:14713,9:spr-5:14713,10:spr-4:14713,11:pel-54:14713,12:pel-141:14713,13:pel-38:14713,14:pel-113:14713,15:pel-99:14713,16:pel-117:14713,17:pel-91:14713,18:pel-63:14713,19:pel-79:14713,20:pel-60:14713,21:pel-45:14713,22:pel-129:14713,23:pel-61:14713,24:pel-133:14713,25:pel-58:14713,26:pel-89:14713,27:pel-40:14713,28:pel-119:14713,29:pel-59:14713,30:pel-115:14713,31:pel-142:14713,32:pel-139:14713,33:pel-83:14713,34:pel-87:14713,35:pel-103:14713,36:pel-53:14713,37:pel-100:14713,38:pel-69:14713,39:pel-147:14713,40:pel-137:14713,41:pel-36:14713,42:pel-15:14713,43:pel-122:14713,44:pel-47:14713,45:pel-6:14713,46:brk-0:14713,47:pel-57:14713,48:pel-56:14713,49:pel-72:14713,50:pel-144:14713,51:pel-111:14713,52:pel-33:14713,53:brk-2:14713,54:pel-62:14713,55:pel-157:14713,56:pel-159:14713,57:pel-105:14713,58:pel-30:14713,59:pel-109:14713,60:pel-80:14713,61:pel-121:14713,62:pel-138:14713,63:pel-118:14713,64:pel-13:14713,65:pel-135:14713,66:pel-88:14713,67:pel-82:14713,68:pel-52:14713,69:pel-90:14713,70:pel-29:14713,71:pel-75:14713,72:pel-110:14713,73:pel-156:14713,74:pel-107:14713,75:pel-2:14713,76:pel-128:14713,77:pel-10:14713,78:pel-49:14713,79:pel-12:14713,80:pel-93:14713,81:pel-65:14713,82:pel-149:14713,83:pel-77:14713,84:pel-112:14713,85:pel-71:14713,86:pel-124:14713,87:pel-16:14713,88:pel-43:14713,89:brk-4:14713,90:pel-37:14713,91:pel-106:14713,92:pel-143:14713,93:pel-101:14713,94:pel-50:14713,95:pel-123:14713,96:pel-24:14713,97:pel-5:14713,98:pel-146:14713,99:pel-46:14713,100:pel-21:14713,101:pel-66:14713,102:pel-140:14713,103:pel-126:14713,104:pel-48:14713,105:pel-120:14713,106:pel-127:14713,107:pel-151:14713,108:pel-74:14713,109:pel-39:14713,110:pel-158:14713,111:pel-102:14713,112:pel-94:14713,113:pel-11:14713,114:pel-98:14713,115:pel-95:14713,116:pel-96:14713,117:pel-153:14713,118:pel-155:14713,119:pel-7:14713,120:pel-35:14713,121:pel-68:14713,122:pel-22:14713,123:pel-32:14713,124:pel-70:14713,125:pel-152:14713,126:pel-41:14713,127:pel-44:14713,128:pel-92:14713,129:pel-116:14713,130:pel-67:14713,131:pel-17:14713,132:pel-42:14713,133:pel-18:14713,134:pel-114:14713,135:pel-84:14713,136:pel-51:14713,137:brk-3:14713,138:pel-73:14713,139:pel-108:14713,140:pel-28:14713,141:pel-4:14713,142:pel-20:14713,143:pel-64:14713,144:pel-25:14713,145:pel-145:14713,146:pel-78:14713,147:pel-134:14713,148:pel-97:14713,149:pel-27:14713,150:pel-9:14713,151:pel-34:14713,152:pel-81:14713,153:pel-136:14713,154:pel-85:14713,155:pel-8:14713,156:pel-86:14713,157:pel-1:14713,158:pel-55:14713,159:pel-3:14713,160:brk-5:14713,161:pel-104:14713,162:pel-23:14713,163:brk-1:14713,164:pel-131:14713,165:pel-14:14713,166:pel-19:14713,167:pel-76:14713,168:pel-0:14713,169:pel-31:14713,170:pel-154:14713,171:pel-130:14713,172:pel-148:14713,173:pel-125:14890,174:pel-132:14918,175:pel-26:15049,176:pel-150:15049',
  'reina-150-0|reina-150|1|v1':
    '1:pel-67:14842,2:pel-105:14842,3:pel-71:14842,4:pel-112:14842,5:pel-102:14842,6:pel-39:14842,7:pel-64:14842,8:pel-89:14842,9:pel-47:14884,10:pel-137:14884,11:pel-43:14884,12:gc-3:14930,13:gc-1:14930,14:gc-2:14930,15:bar-3:14930,16:bar-5:14930,17:gc-0:14994,18:bar-1:15063,19:bar-2:15078,20:bar-0:15078,21:bar-4:15138,22:pel-11:15303,23:pel-94:15303,24:pel-82:15303,25:pel-107:15303,26:pel-152:15303,27:pel-12:15303,28:pel-138:15303,29:pel-14:15303,30:pel-62:15303,31:pel-10:15319,32:pel-34:15319,33:pel-118:15319,34:pel-76:15319,35:pel-31:15319,36:pel-162:15319,37:pel-30:15319,38:pel-78:15319,39:pel-131:15319,40:pel-95:15319,41:pel-79:15319,42:pel-55:15319,43:pel-153:15319,44:pel-99:15319,45:pel-97:15319,46:pel-19:15319,47:pel-48:15319,48:pel-104:15319,49:pel-36:15319,50:pel-143:15319,51:pel-49:15319,52:pel-80:15319,53:pel-20:15319,54:pel-75:15319,55:pel-157:15319,56:pel-22:15319,57:pel-17:15319,58:pel-65:15319,59:pel-32:15319,60:pel-15:15319,61:pel-61:15319,62:pel-28:15319,63:pel-123:15319,64:pel-159:15319,65:pel-2:15319,66:pel-154:15319,67:pel-13:15319,68:pel-96:15319,69:pel-83:15434,70:pel-23:15434,71:pel-146:15434,72:pel-127:15434,73:pel-57:15434,74:pel-24:15434,75:pel-53:15434,76:pel-113:15434,77:pel-119:15434,78:pel-116:15434,79:pel-155:15434,80:pel-72:15434,81:pel-70:15434,82:pel-41:15434,83:pel-117:15434,84:pel-85:15434,85:pel-92:15434,86:pel-136:15434,87:pel-68:15434,88:pel-33:15434,89:pel-135:15434,90:pel-42:15434,91:pel-73:15434,92:pel-35:15434,93:pel-59:15434,94:pel-114:15434,95:pel-126:15434,96:pel-108:15434,97:pel-115:15434,98:pel-54:15434,99:pel-74:15434,100:pel-18:15434,101:pel-98:15434,102:pel-58:15434,103:pel-37:15434,104:pel-21:15434,105:pel-51:15434,106:pel-6:15434,107:pel-158:15434,108:pel-145:15434,109:pel-77:15434,110:pel-16:15434,111:pel-9:15434,112:pel-52:15434,113:pel-91:15434,114:pel-128:15434,115:pel-142:15434,116:pel-148:15434,117:pel-40:15434,118:pel-44:15434,119:pel-63:15434,120:pel-133:15434,121:pel-7:15434,122:pel-106:15434,123:pel-149:15434,124:pel-26:15434,125:pel-46:15434,126:pel-90:15434,127:pel-45:15434,128:pel-81:15434,129:pel-100:15434,130:pel-150:15434,131:pel-5:15434,132:spr-0:15434,133:pel-3:15434,134:pel-161:15434,135:pel-0:15434,136:pel-140:15434,137:pel-86:15434,138:pel-147:15434,139:pel-124:15434,140:pel-4:15434,141:pel-38:15434,142:pel-160:15434,143:pel-134:15434,144:pel-84:15434,145:pel-27:15434,146:pel-101:15434,147:pel-120:15434,148:pel-60:15434,149:pel-132:15434,150:pel-141:15434,151:pel-144:15434,152:spr-2:15434,153:pel-110:15434,154:pel-8:15457,155:pel-69:15457,156:pel-56:15457,157:pel-151:15457,158:pel-129:15457,159:pel-121:15457,160:pel-111:15457,161:pel-130:15457,162:pel-139:15457,163:pel-29:15457,164:pel-103:15457,165:pel-125:15457,166:pel-122:15457,167:pel-93:15457,168:pel-1:15457,169:pel-66:15457,170:pel-156:15457,171:pel-109:15457,172:pel-87:15457,173:spr-1:15457,174:pel-25:15457,175:pel-50:15457,176:pel-88:15457',
  'reina-150-1|reina-150|1|v1':
    '1:gc-0:14532,2:pel-153:14624,3:pel-6:14624,4:pel-83:14624,5:pel-56:14624,6:pel-125:14624,7:pel-148:14624,8:pel-94:14624,9:pel-121:14624,10:pel-158:14624,11:pel-155:14624,12:pel-97:14624,13:pel-144:14624,14:spr-1:14624,15:gc-1:14874,16:gc-3:14874,17:gc-2:14874,18:bar-3:14927,19:bar-1:14927,20:bar-2:14927,21:bar-4:14927,22:bar-0:14927,23:pel-34:15120,24:pel-117:15120,25:pel-95:15120,26:pel-71:15120,27:pel-19:15120,28:bar-5:15120,29:pel-42:15120,30:pel-35:15120,31:pel-18:15120,32:pel-27:15120,33:pel-133:15120,34:pel-62:15120,35:pel-7:15120,36:pel-91:15120,37:pel-4:15120,38:pel-108:15120,39:pel-13:15120,40:pel-43:15120,41:pel-85:15120,42:pel-1:15120,43:pel-16:15120,44:pel-15:15120,45:pel-28:15120,46:pel-41:15120,47:pel-63:15120,48:pel-12:15120,49:pel-24:15120,50:pel-124:15120,51:pel-57:15120,52:pel-22:15120,53:pel-115:15263,54:pel-160:15263,55:pel-47:15263,56:pel-77:15263,57:pel-105:15263,58:pel-54:15263,59:pel-138:15263,60:pel-45:15263,61:pel-119:15263,62:pel-59:15263,63:pel-154:15263,64:pel-44:15263,65:pel-152:15263,66:pel-151:15263,67:pel-98:15263,68:pel-143:15263,69:pel-11:15263,70:pel-75:15263,71:pel-86:15263,72:pel-30:15263,73:pel-79:15263,74:pel-50:15263,75:pel-113:15263,76:pel-49:15263,77:pel-114:15263,78:pel-142:15263,79:pel-33:15263,80:pel-161:15263,81:pel-3:15263,82:pel-55:15263,83:pel-116:15263,84:pel-36:15263,85:pel-70:15263,86:pel-74:15263,87:pel-68:15263,88:pel-104:15263,89:pel-17:15263,90:pel-128:15263,91:pel-69:15263,92:pel-14:15263,93:pel-162:15263,94:pel-80:15263,95:pel-53:15263,96:pel-9:15263,97:pel-139:15263,98:pel-106:15263,99:pel-107:15263,100:pel-149:15263,101:pel-38:15263,102:pel-126:15263,103:pel-99:15263,104:pel-48:15263,105:pel-141:15263,106:pel-5:15263,107:pel-46:15263,108:pel-101:15263,109:pel-150:15263,110:pel-73:15263,111:pel-78:15263,112:pel-131:15263,113:pel-87:15263,114:pel-135:15263,115:pel-123:15263,116:pel-145:15263,117:pel-100:15263,118:pel-136:15263,119:pel-159:15263,120:pel-60:15263,121:pel-127:15263,122:pel-122:15263,123:pel-61:15263,124:pel-129:15263,125:pel-32:15263,126:pel-147:15263,127:pel-2:15263,128:pel-157:15263,129:pel-82:15263,130:pel-64:15263,131:pel-31:15263,132:pel-10:15263,133:pel-0:15263,134:pel-89:15263,135:pel-20:15263,136:pel-88:15263,137:pel-109:15263,138:pel-40:15263,139:pel-134:15263,140:pel-26:15263,141:pel-67:15263,142:pel-52:15263,143:pel-23:15263,144:pel-111:15263,145:pel-118:15263,146:pel-156:15263,147:pel-96:15263,148:pel-76:15263,149:pel-110:15263,150:pel-66:15263,151:pel-90:15263,152:pel-39:15263,153:pel-51:15263,154:pel-120:15263,155:pel-137:15263,156:pel-130:15263,157:pel-146:15263,158:pel-84:15263,159:pel-58:15263,160:pel-37:15263,161:pel-65:15263,162:pel-21:15263,163:pel-29:15263,164:pel-72:15263,165:pel-112:15263,166:spr-0:15263,167:pel-25:15263,168:pel-103:15443,169:pel-93:15443,170:pel-102:15443,171:pel-8:15443,172:pel-81:15443,173:pel-140:15443,174:pel-92:15443,175:spr-2:15443,176:pel-132:15597',
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

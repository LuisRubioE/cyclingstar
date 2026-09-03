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
  /**
   * RESELLADA EN LA v41 (docs/balance.md «v41»), y NO por el viento: las cuatro semillas del banco
   * salen en CALMA —lateral 0,00, cero cortes—, así que el abanico no toca ni una de ellas. Lo que
   * las mueve son los dos defectos que el dueño encontró en una carrera de producción y mandó
   * corregir, y los dos cambian QUIÉN hace qué:
   *
   *  - **el que va tirando ya no es el que salta**. Medido: el 2,4 % de los ataques del pelotón los
   *    lanzaba un hombre que venía de dar la cara, y ahora es el 0,2 %. Cambia quién se va en la
   *    fuga del día, y con ello la carrera entera.
   *  - **no se persigue lo propio desde un grupo de caza**. De 234 a 40 casos en la llana y de 191 a
   *    58 en la media montaña; los que quedan son grupos en los que TODOS tienen un compañero
   *    delante y alguien tiene que ir en cabeza.
   *
   * RESELLADA OTRA VEZ EN LA v42, y por la misma clase de motivo: dos defectos que el dueño encontró
   * mirando una carrera. El primero no toca esta huella (el maillot amarillo iba dando relevos, y
   * aquí no hay maillot); el segundo sí, porque cambia quién ataca: al que le cazan tras una fuga
   * larga se le acabó el día, y eso mueve la llana `llana-180-1` sin cambiar de ganador.
   *
   * Por eso esta huella SÍ tenía que moverse: es una tanda que toca la capa táctica, no una de
   * observación. Lo que se comprueba es que se mueve como debe. En las dos llanas gana el mismo
   * hombre que antes y el pelotón sigue llegando junto (173 y 174 de 176); la reina, que se decide
   * entre nueve hombres, cambia de ganador en una de las dos semillas (pel-67 -> pel-105, 67 s), que
   * es exactamente lo que un cambio de quién ataca le hace a una etapa que deciden un puñado.
   *
   *   llana-180-0  gana spr-6   ·  173 juntos, 2 a +127 s, 1 a +468 s
   *   llana-180-1  gana spr-0   ·  174 juntos, 1 a +180 s, 1 a +208 s
   *   reina-150-0  gana pel-105 ·  9 relojes, 9 delante, el grueso a +584 s
   *   reina-150-1  gana gc-0    ·  9 relojes, ganador EN SOLITARIO a +122 s del segundo grupo
   *
   * RESELLADA EN LA v46, y esta vez la huella enseña el defecto que se corrigió. El rol pasa a pesar
   * en el REMATE y no solo en el ataque (`finishRoleWeight`), y el sello lo cuenta mejor que
   * cualquier explicación: en `llana-180-0` había un corredor de relleno colado en el 10.º puesto que
   * empujaba a un VELOCISTA al 14.º, y ahora los diez `spr-*` ocupan los diez primeros.
   *
   *     antes   …9:spr-7, 10:pel-45, 11:pel-78, 12:pel-43, 13:pel-89, 14:spr-9…
   *     ahora   …9:spr-7, 10:spr-9,  11:pel-45, 12:pel-78, 13:pel-43, 14:pel-89…
   *
   * Y LO QUE NO SE MUEVE, que es lo que dice que el cambio está bien dimensionado: **gana el mismo
   * hombre en las cuatro semillas**. Un peso por rol reordena a los de detrás —los aguadores dejan de
   * llevarse medio podio— y no le quita la victoria a quien ya era el mejor. Números en
   * docs/balance.md «v48».
   */
  'llana-180-0|llana-180|1|v1':
    '1:spr-6:14755,2:spr-0:14755,3:spr-1:14755,4:spr-5:14755,5:spr-8:14755,6:spr-2:14755,7:spr-4:14755,8:spr-3:14755,9:spr-7:14755,10:spr-9:14755,11:pel-45:14755,12:pel-78:14755,13:pel-43:14755,14:pel-89:14755,15:pel-21:14755,16:pel-87:14755,17:brk-2:14755,18:pel-142:14755,19:pel-139:14755,20:pel-156:14755,21:pel-123:14755,22:pel-130:14755,23:pel-133:14755,24:pel-39:14755,25:pel-61:14755,26:pel-68:14755,27:pel-85:14755,28:pel-118:14755,29:pel-77:14755,30:pel-62:14755,31:pel-4:14755,32:pel-94:14755,33:pel-111:14755,34:pel-100:14755,35:pel-149:14755,36:pel-70:14755,37:pel-143:14755,38:pel-67:14755,39:brk-3:14755,40:pel-49:14755,41:pel-98:14755,42:pel-125:14755,43:pel-91:14755,44:pel-42:14755,45:pel-17:14755,46:pel-121:14755,47:pel-16:14755,48:pel-32:14755,49:pel-83:14755,50:pel-33:14755,51:pel-141:14755,52:pel-10:14755,53:pel-132:14755,54:pel-52:14755,55:pel-55:14755,56:pel-8:14755,57:pel-18:14755,58:pel-34:14755,59:pel-51:14755,60:pel-99:14755,61:pel-12:14755,62:pel-147:14755,63:pel-148:14755,64:pel-109:14755,65:pel-40:14755,66:pel-127:14755,67:pel-146:14755,68:pel-50:14755,69:brk-5:14755,70:pel-136:14755,71:pel-140:14755,72:pel-59:14755,73:pel-86:14755,74:pel-95:14755,75:pel-102:14755,76:pel-14:14755,77:pel-65:14755,78:pel-107:14755,79:pel-6:14755,80:pel-44:14755,81:pel-145:14755,82:pel-41:14755,83:pel-37:14755,84:pel-124:14755,85:pel-134:14755,86:pel-150:14755,87:pel-54:14755,88:brk-4:14755,89:pel-84:14755,90:pel-31:14755,91:pel-154:14755,92:pel-101:14755,93:pel-151:14755,94:pel-97:14755,95:pel-116:14755,96:pel-36:14755,97:pel-159:14755,98:pel-144:14755,99:pel-76:14755,100:pel-92:14755,101:pel-56:14755,102:pel-96:14755,103:pel-93:14755,104:pel-135:14755,105:pel-80:14755,106:pel-155:14755,107:pel-103:14755,108:pel-30:14755,109:pel-69:14755,110:pel-38:14755,111:pel-117:14755,112:pel-13:14755,113:pel-64:14755,114:pel-106:14755,115:pel-88:14755,116:pel-1:14755,117:pel-75:14755,118:pel-90:14755,119:pel-28:14755,120:pel-23:14755,121:pel-74:14755,122:pel-108:14755,123:pel-72:14755,124:pel-152:14755,125:pel-15:14755,126:pel-82:14755,127:pel-105:14755,128:pel-112:14755,129:pel-60:14755,130:pel-157:14755,131:pel-11:14755,132:pel-131:14755,133:pel-35:14755,134:pel-119:14755,135:pel-47:14755,136:pel-115:14755,137:pel-126:14755,138:pel-19:14755,139:pel-7:14755,140:pel-46:14755,141:pel-73:14755,142:pel-79:14755,143:pel-2:14755,144:pel-9:14755,145:pel-120:14755,146:pel-66:14755,147:pel-137:14755,148:pel-110:14755,149:pel-129:14755,150:pel-29:14755,151:pel-81:14755,152:pel-48:14755,153:pel-58:14755,154:brk-1:14755,155:pel-128:14755,156:pel-25:14755,157:pel-24:14755,158:pel-27:14755,159:pel-104:14755,160:pel-138:14755,161:pel-0:14755,162:pel-20:14755,163:pel-122:14755,164:pel-26:14755,165:pel-63:14755,166:pel-114:14755,167:pel-22:14755,168:pel-113:14755,169:pel-158:14755,170:brk-0:14755,171:pel-53:14755,172:pel-3:14755,173:pel-5:14755,174:pel-71:14882,175:pel-57:14882,176:pel-153:15223',
  'llana-180-1|llana-180|1|v1':
    '1:spr-0:14664,2:spr-6:14664,3:spr-1:14664,4:spr-2:14664,5:spr-3:14664,6:spr-7:14664,7:spr-8:14664,8:spr-4:14664,9:spr-9:14664,10:spr-5:14664,11:brk-4:14664,12:pel-54:14664,13:brk-0:14664,14:pel-141:14664,15:pel-38:14664,16:brk-2:14664,17:pel-113:14664,18:pel-99:14664,19:pel-117:14664,20:pel-91:14664,21:pel-139:14664,22:pel-63:14664,23:pel-79:14664,24:pel-60:14664,25:pel-45:14664,26:pel-129:14664,27:pel-122:14664,28:pel-19:14664,29:pel-61:14664,30:pel-133:14664,31:pel-89:14664,32:pel-16:14664,33:pel-58:14664,34:pel-40:14664,35:pel-119:14664,36:pel-59:14664,37:pel-115:14664,38:pel-142:14664,39:pel-83:14664,40:pel-87:14664,41:pel-103:14664,42:pel-53:14664,43:pel-100:14664,44:pel-69:14664,45:pel-20:14664,46:pel-137:14664,47:pel-36:14664,48:pel-15:14664,49:pel-6:14664,50:pel-47:14664,51:pel-81:14664,52:pel-57:14664,53:pel-56:14664,54:pel-72:14664,55:pel-144:14664,56:brk-3:14664,57:pel-33:14664,58:pel-62:14664,59:pel-159:14664,60:pel-157:14664,61:pel-111:14664,62:pel-105:14664,63:pel-30:14664,64:pel-109:14664,65:pel-21:14664,66:pel-18:14664,67:pel-118:14664,68:pel-82:14664,69:pel-52:14664,70:pel-150:14664,71:pel-88:14664,72:pel-70:14664,73:pel-29:14664,74:pel-104:14664,75:pel-75:14664,76:pel-107:14664,77:pel-128:14664,78:pel-13:14664,79:pel-10:14664,80:pel-120:14664,81:pel-49:14664,82:pel-110:14664,83:pel-93:14664,84:pel-158:14664,85:pel-48:14664,86:pel-65:14664,87:pel-17:14664,88:pel-149:14664,89:pel-90:14664,90:pel-135:14664,91:pel-77:14664,92:pel-71:14664,93:pel-124:14664,94:pel-43:14664,95:pel-37:14664,96:pel-106:14664,97:pel-12:14664,98:pel-143:14664,99:pel-101:14664,100:pel-50:14664,101:pel-156:14664,102:pel-123:14664,103:pel-5:14664,104:pel-121:14664,105:pel-138:14664,106:pel-146:14664,107:pel-66:14664,108:pel-140:14664,109:pel-126:14664,110:pel-112:14664,111:pel-127:14664,112:pel-74:14664,113:pel-92:14664,114:pel-94:14664,115:pel-11:14664,116:pel-155:14664,117:pel-147:14664,118:pel-98:14664,119:pel-95:14664,120:pel-46:14664,121:pel-96:14664,122:pel-153:14664,123:pel-7:14664,124:pel-24:14664,125:pel-114:14664,126:pel-35:14664,127:pel-68:14664,128:brk-1:14664,129:pel-4:14664,130:pel-22:14664,131:pel-152:14664,132:pel-41:14664,133:pel-44:14664,134:pel-116:14664,135:pel-67:14664,136:pel-42:14664,137:brk-5:14664,138:pel-84:14664,139:pel-51:14664,140:pel-73:14664,141:pel-108:14664,142:pel-136:14664,143:pel-32:14664,144:pel-64:14664,145:pel-80:14664,146:pel-31:14664,147:pel-78:14664,148:pel-25:14664,149:pel-145:14664,150:pel-9:14664,151:pel-34:14664,152:pel-2:14664,153:pel-85:14664,154:pel-1:14664,155:pel-27:14664,156:pel-26:14664,157:pel-8:14664,158:pel-86:14664,159:pel-55:14664,160:pel-134:14664,161:pel-3:14664,162:pel-97:14664,163:pel-102:14664,164:pel-23:14664,165:pel-131:14664,166:pel-14:14664,167:pel-148:14664,168:pel-76:14664,169:pel-130:14664,170:pel-0:14664,171:pel-39:14664,172:pel-154:14664,173:pel-125:14799,174:pel-28:14799,175:pel-151:14799,176:pel-132:14870',
  'reina-150-0|reina-150|1|v1':
    '1:pel-105:14775,2:pel-71:14775,3:pel-64:14775,4:bar-0:14775,5:pel-112:14775,6:pel-67:14775,7:pel-39:14775,8:pel-102:14775,9:pel-89:14775,10:pel-43:14823,11:pel-47:14823,12:pel-137:14823,13:gc-3:14914,14:gc-2:14914,15:gc-1:14914,16:bar-3:14914,17:bar-5:14914,18:gc-0:14985,19:bar-2:15025,20:bar-1:15142,21:bar-4:15142,22:pel-10:15142,23:pel-16:15142,24:pel-65:15142,25:pel-61:15142,26:pel-93:15142,27:pel-2:15142,28:pel-53:15142,29:pel-147:15142,30:pel-51:15142,31:pel-41:15142,32:pel-38:15142,33:pel-52:15142,34:pel-11:15279,35:pel-94:15279,36:pel-30:15279,37:pel-138:15279,38:pel-76:15279,39:pel-97:15279,40:pel-9:15359,41:pel-7:15359,42:pel-82:15359,43:pel-23:15359,44:pel-59:15359,45:pel-17:15359,46:pel-118:15359,47:pel-4:15359,48:pel-79:15359,49:pel-83:15359,50:pel-57:15359,51:pel-162:15359,52:pel-91:15359,53:pel-152:15359,54:pel-116:15359,55:pel-12:15359,56:pel-31:15359,57:pel-131:15359,58:pel-119:15359,59:pel-70:15359,60:pel-14:15359,61:pel-127:15359,62:pel-107:15359,63:pel-13:15359,64:pel-58:15359,65:pel-35:15359,66:pel-151:15359,67:pel-142:15359,68:pel-81:15359,69:pel-135:15359,70:pel-157:15359,71:pel-37:15359,72:pel-136:15359,73:pel-32:15359,74:pel-155:15359,75:pel-78:15359,76:pel-49:15359,77:pel-95:15359,78:pel-63:15359,79:pel-3:15359,80:pel-55:15359,81:pel-128:15359,82:pel-104:15359,83:pel-100:15359,84:pel-145:15359,85:pel-148:15359,86:pel-126:15359,87:pel-153:15359,88:pel-160:15359,89:pel-99:15359,90:pel-72:15359,91:pel-115:15359,92:pel-144:15359,93:pel-75:15359,94:pel-80:15359,95:pel-84:15359,96:pel-28:15359,97:pel-101:15359,98:pel-6:15359,99:pel-48:15359,100:pel-34:15359,101:pel-161:15359,102:pel-20:15359,103:pel-46:15359,104:pel-113:15359,105:pel-141:15359,106:pel-124:15359,107:pel-18:15359,108:pel-68:15359,109:pel-106:15359,110:pel-26:15359,111:pel-146:15359,112:pel-27:15359,113:pel-114:15359,114:pel-24:15359,115:pel-85:15359,116:pel-5:15359,117:pel-159:15359,118:pel-40:15359,119:pel-22:15359,120:pel-123:15359,121:pel-143:15359,122:pel-21:15359,123:pel-73:15359,124:pel-90:15359,125:pel-117:15359,126:pel-36:15359,127:pel-92:15359,128:pel-74:15359,129:pel-133:15359,130:pel-121:15359,131:pel-98:15359,132:pel-42:15359,133:pel-33:15359,134:spr-0:15359,135:pel-140:15359,136:pel-96:15359,137:pel-77:15359,138:spr-2:15359,139:pel-134:15359,140:pel-54:15359,141:pel-154:15359,142:pel-125:15359,143:pel-132:15359,144:pel-60:15359,145:pel-86:15359,146:pel-158:15359,147:pel-19:15359,148:pel-108:15359,149:pel-110:15359,150:pel-62:15359,151:pel-44:15359,152:pel-0:15359,153:pel-69:15433,154:pel-15:15433,155:pel-8:15433,156:pel-56:15433,157:pel-139:15433,158:pel-149:15433,159:pel-150:15433,160:pel-103:15433,161:pel-122:15433,162:pel-129:15433,163:pel-120:15433,164:pel-29:15433,165:pel-50:15433,166:pel-66:15433,167:pel-130:15433,168:pel-156:15433,169:pel-45:15433,170:pel-1:15433,171:pel-109:15433,172:pel-111:15433,173:pel-87:15433,174:spr-1:15433,175:pel-25:15433,176:pel-88:15433',
  'reina-150-1|reina-150|1|v1':
    '1:gc-0:14497,2:gc-3:14497,3:pel-6:14619,4:pel-153:14619,5:pel-56:14619,6:pel-122:14619,7:pel-155:14619,8:pel-94:14619,9:pel-125:14619,10:pel-97:14619,11:pel-83:14619,12:pel-148:14619,13:pel-144:14619,14:pel-158:14619,15:spr-1:14619,16:gc-2:14912,17:gc-1:14912,18:bar-3:14961,19:bar-2:14961,20:pel-7:14961,21:pel-15:14961,22:pel-57:14961,23:pel-41:14961,24:pel-124:14961,25:pel-1:14961,26:pel-22:14961,27:bar-0:14984,28:bar-1:14984,29:bar-4:14984,30:bar-5:15024,31:pel-120:15024,32:pel-91:15024,33:pel-68:15211,34:pel-119:15211,35:pel-18:15211,36:pel-117:15211,37:pel-47:15211,38:pel-4:15211,39:pel-16:15211,40:pel-71:15211,41:pel-34:15211,42:pel-19:15211,43:pel-161:15211,44:pel-95:15211,45:pel-13:15211,46:pel-146:15211,47:pel-127:15211,48:pel-42:15211,49:pel-27:15211,50:pel-43:15211,51:pel-32:15211,52:pel-137:15211,53:pel-152:15211,54:pel-11:15211,55:pel-77:15211,56:pel-62:15211,57:pel-55:15211,58:pel-78:15211,59:pel-54:15211,60:pel-116:15211,61:pel-66:15211,62:pel-114:15211,63:pel-141:15211,64:pel-40:15211,65:pel-85:15211,66:pel-123:15211,67:pel-76:15211,68:pel-109:15211,69:pel-121:15211,70:pel-24:15211,71:pel-108:15211,72:pel-59:15211,73:pel-112:15211,74:pel-134:15211,75:pel-159:15308,76:pel-46:15308,77:pel-12:15308,78:pel-17:15308,79:pel-106:15308,80:pel-80:15308,81:pel-38:15308,82:pel-138:15308,83:pel-51:15308,84:pel-67:15308,85:pel-151:15308,86:pel-45:15308,87:pel-129:15308,88:pel-82:15308,89:pel-142:15308,90:pel-150:15308,91:pel-162:15308,92:pel-37:15308,93:pel-53:15308,94:pel-73:15308,95:pel-64:15308,96:pel-160:15308,97:pel-139:15308,98:pel-63:15308,99:pel-149:15308,100:pel-70:15308,101:pel-10:15308,102:pel-113:15308,103:pel-90:15308,104:pel-35:15308,105:pel-61:15308,106:pel-14:15308,107:pel-79:15308,108:pel-100:15308,109:pel-49:15308,110:pel-156:15308,111:pel-126:15308,112:pel-74:15308,113:pel-154:15308,114:pel-23:15308,115:pel-145:15308,116:pel-72:15308,117:pel-5:15308,118:pel-104:15308,119:pel-147:15308,120:pel-136:15308,121:pel-98:15308,122:pel-107:15308,123:pel-69:15308,124:pel-89:15308,125:pel-21:15308,126:pel-84:15308,127:pel-58:15308,128:pel-110:15308,129:pel-39:15308,130:pel-115:15308,131:pel-86:15308,132:pel-135:15308,133:pel-44:15308,134:pel-28:15308,135:pel-0:15308,136:pel-48:15308,137:pel-50:15308,138:pel-99:15308,139:pel-88:15308,140:pel-105:15308,141:pel-65:15308,142:pel-75:15308,143:spr-0:15308,144:pel-29:15308,145:pel-157:15308,146:pel-36:15308,147:pel-87:15308,148:pel-3:15308,149:pel-9:15338,150:pel-8:15338,151:pel-93:15338,152:pel-143:15338,153:pel-133:15338,154:pel-102:15338,155:pel-111:15338,156:pel-140:15338,157:pel-31:15338,158:pel-20:15338,159:pel-130:15338,160:pel-33:15338,161:pel-101:15338,162:pel-128:15338,163:pel-30:15338,164:pel-26:15338,165:pel-103:15338,166:pel-52:15338,167:pel-81:15338,168:pel-131:15338,169:pel-2:15338,170:pel-118:15338,171:pel-60:15338,172:pel-96:15338,173:pel-25:15338,174:pel-92:15338,175:pel-132:15338,176:spr-2:15338',
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

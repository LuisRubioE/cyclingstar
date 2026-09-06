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
   *
   * RESELLADA EN LA v49 (docs/balance.md «v49»), y lo que la huella enseña es **que la montaña deja
   * de llegar a escalones**: `reina-150-0` pasa de **9 relojes distintos en meta a 44**. Antes el
   * campo entraba en nueve bloques, con ciento cincuenta hombres compartiendo tres segundos; ahora
   * llega repartido. Es exactamente lo que faltaba —que el grupo que lleva la carrera siga perdiendo
   * gente en el puerto aunque naciera de un descuelgue— y es lo que el dueño vio en la etapa 9 del
   * Giro: «el que llega en el puesto 150 solo perdió 26 segundos».
   *
   * LO QUE NO CAMBIA, y conviene decirlo para que nadie le pida a esta huella algo que no dice: la
   * etapa la sigue ganando un corredor de relleno del pelotón (`pel-71` en vez de `pel-105`), con
   * ocho hombres al mismo tiempo en la cabeza. Que la carrera se reparta no la convierte en una
   * carrera de escaladores; eso es otra pregunta y este sello no la contesta.
   *
   * Las dos llanas se mueven en el reloj y apenas en el orden, y eso también es dato: en una llana no
   * hay puerto que cribar, así que lo único que cambia ahí es el arrastre del arreglo anterior (v48
   * y el «un equipo no persigue al grupo donde va su líder»). Gana el mismo hombre en las dos.
   */
  'llana-180-0|llana-180|1|v1':
    '1:spr-6:14711,2:spr-0:14711,3:spr-1:14711,4:spr-5:14711,5:spr-8:14711,6:spr-2:14711,7:spr-4:14711,8:spr-3:14711,9:spr-7:14711,10:spr-9:14711,11:pel-45:14711,12:pel-78:14711,13:pel-43:14711,14:pel-89:14711,15:brk-3:14711,16:pel-21:14711,17:pel-87:14711,18:pel-139:14711,19:pel-156:14711,20:pel-123:14711,21:pel-130:14711,22:pel-39:14711,23:pel-61:14711,24:pel-133:14711,25:pel-68:14711,26:pel-85:14711,27:pel-118:14711,28:pel-142:14711,29:pel-62:14711,30:pel-94:14711,31:pel-111:14711,32:pel-91:14711,33:pel-149:14711,34:pel-55:14711,35:pel-143:14711,36:pel-16:14711,37:brk-2:14711,38:pel-49:14711,39:pel-98:14711,40:pel-67:14711,41:pel-125:14711,42:brk-4:14711,43:pel-77:14711,44:pel-100:14711,45:pel-17:14711,46:pel-150:14711,47:pel-121:14711,48:pel-32:14711,49:pel-83:14711,50:pel-33:14711,51:pel-141:14711,52:pel-132:14711,53:pel-10:14711,54:pel-70:14711,55:pel-52:14711,56:pel-14:14711,57:pel-8:14711,58:pel-18:14711,59:pel-34:14711,60:pel-51:14711,61:pel-99:14711,62:pel-12:14711,63:pel-147:14711,64:pel-148:14711,65:pel-74:14711,66:pel-109:14711,67:pel-40:14711,68:pel-105:14711,69:pel-127:14711,70:pel-4:14711,71:pel-42:14711,72:pel-146:14711,73:pel-50:14711,74:pel-101:14711,75:pel-131:14711,76:pel-140:14711,77:brk-5:14711,78:pel-59:14711,79:pel-86:14711,80:pel-95:14711,81:pel-102:14711,82:pel-65:14711,83:pel-107:14711,84:pel-6:14711,85:pel-44:14711,86:pel-135:14711,87:pel-145:14711,88:pel-41:14711,89:pel-69:14711,90:pel-37:14711,91:pel-124:14711,92:pel-134:14711,93:pel-54:14711,94:pel-31:14711,95:pel-84:14711,96:pel-154:14711,97:pel-151:14711,98:pel-97:14711,99:pel-116:14711,100:pel-7:14711,101:pel-36:14711,102:pel-159:14711,103:pel-144:14711,104:pel-136:14711,105:pel-76:14711,106:pel-56:14711,107:pel-96:14711,108:pel-93:14711,109:pel-80:14711,110:pel-103:14711,111:pel-30:14711,112:pel-38:14711,113:pel-117:14711,114:pel-13:14711,115:pel-64:14711,116:pel-155:14711,117:pel-106:14711,118:pel-88:14711,119:pel-157:14711,120:pel-79:14711,121:pel-75:14711,122:pel-47:14711,123:pel-90:14711,124:pel-1:14711,125:pel-108:14711,126:pel-72:14711,127:pel-23:14711,128:pel-152:14711,129:pel-92:14711,130:pel-82:14711,131:pel-112:14711,132:pel-60:14711,133:pel-11:14711,134:pel-35:14711,135:pel-119:14711,136:pel-115:14711,137:pel-126:14711,138:pel-19:14711,139:pel-46:14711,140:pel-2:14711,141:pel-9:14711,142:pel-120:14711,143:pel-66:14711,144:pel-137:14711,145:pel-110:14711,146:pel-25:14711,147:pel-138:14711,148:pel-129:14711,149:pel-29:14711,150:pel-81:14711,151:pel-58:14711,152:brk-1:14711,153:pel-15:14711,154:pel-22:14711,155:pel-24:14711,156:pel-27:14711,157:pel-104:14711,158:pel-48:14711,159:pel-28:14711,160:pel-20:14711,161:pel-113:14711,162:pel-122:14711,163:pel-128:14711,164:pel-63:14711,165:pel-73:14711,166:pel-3:14711,167:pel-114:14711,168:pel-26:14711,169:brk-0:14711,170:pel-0:14711,171:pel-53:14711,172:pel-158:14711,173:pel-5:14711,174:pel-71:14838,175:pel-57:14838,176:pel-153:15222',
  'llana-180-1|llana-180|1|v1':
    '1:spr-0:14748,2:spr-6:14748,3:spr-1:14748,4:spr-2:14748,5:spr-3:14748,6:spr-7:14748,7:spr-8:14748,8:spr-9:14748,9:spr-5:14748,10:spr-4:14748,11:brk-4:14748,12:pel-54:14748,13:brk-0:14748,14:pel-141:14748,15:pel-38:14748,16:pel-113:14748,17:pel-99:14748,18:pel-117:14748,19:pel-91:14748,20:pel-45:14748,21:pel-139:14748,22:pel-63:14748,23:pel-79:14748,24:pel-60:14748,25:brk-2:14748,26:pel-133:14748,27:pel-89:14748,28:pel-129:14748,29:pel-122:14748,30:pel-19:14748,31:pel-61:14748,32:pel-16:14748,33:pel-58:14748,34:pel-40:14748,35:pel-119:14748,36:pel-59:14748,37:pel-115:14748,38:pel-142:14748,39:pel-83:14748,40:pel-87:14748,41:pel-103:14748,42:pel-53:14748,43:pel-100:14748,44:pel-111:14748,45:pel-69:14748,46:pel-20:14748,47:brk-3:14748,48:pel-137:14748,49:pel-36:14748,50:pel-15:14748,51:pel-47:14748,52:pel-6:14748,53:pel-57:14748,54:pel-56:14748,55:pel-72:14748,56:pel-144:14748,57:pel-33:14748,58:pel-62:14748,59:pel-157:14748,60:pel-159:14748,61:pel-30:14748,62:pel-17:14748,63:pel-109:14748,64:pel-21:14748,65:pel-80:14748,66:pel-121:14748,67:pel-18:14748,68:pel-138:14748,69:pel-118:14748,70:pel-13:14748,71:pel-135:14748,72:pel-90:14748,73:pel-82:14748,74:pel-52:14748,75:pel-88:14748,76:pel-29:14748,77:pel-104:14748,78:pel-156:14748,79:pel-75:14748,80:pel-107:14748,81:pel-128:14748,82:pel-10:14748,83:pel-49:14748,84:pel-120:14748,85:pel-105:14748,86:pel-110:14748,87:pel-12:14748,88:pel-93:14748,89:pel-65:14748,90:pel-112:14748,91:pel-149:14748,92:pel-77:14748,93:pel-71:14748,94:pel-124:14748,95:pel-68:14748,96:pel-43:14748,97:pel-37:14748,98:pel-106:14748,99:pel-143:14748,100:pel-101:14748,101:pel-50:14748,102:pel-24:14748,103:pel-5:14748,104:pel-146:14748,105:pel-46:14748,106:pel-155:14748,107:pel-140:14748,108:pel-66:14748,109:pel-126:14748,110:pel-127:14748,111:pel-74:14748,112:pel-102:14748,113:pel-94:14748,114:pel-70:14748,115:pel-11:14748,116:pel-98:14748,117:pel-151:14748,118:pel-95:14748,119:pel-96:14748,120:pel-147:14748,121:pel-153:14748,122:pel-7:14748,123:pel-35:14748,124:brk-1:14748,125:pel-67:14748,126:pel-48:14748,127:pel-158:14748,128:pel-123:14748,129:pel-32:14748,130:pel-152:14748,131:pel-41:14748,132:pel-22:14748,133:pel-44:14748,134:pel-116:14748,135:pel-42:14748,136:pel-84:14748,137:brk-5:14748,138:pel-51:14748,139:pel-92:14748,140:pel-108:14748,141:pel-28:14748,142:pel-64:14748,143:pel-78:14748,144:pel-25:14748,145:pel-145:14748,146:pel-114:14748,147:pel-134:14748,148:pel-97:14748,149:pel-27:14748,150:pel-9:14748,151:pel-34:14748,152:pel-1:14748,153:pel-73:14748,154:pel-2:14748,155:pel-81:14748,156:pel-4:14748,157:pel-31:14748,158:pel-85:14748,159:pel-8:14748,160:pel-86:14748,161:pel-55:14748,162:pel-3:14748,163:pel-23:14748,164:pel-136:14748,165:pel-131:14748,166:pel-130:14748,167:pel-76:14748,168:pel-148:14748,169:pel-39:14748,170:pel-0:14748,171:pel-14:14748,172:pel-154:14748,173:pel-125:14927,174:pel-132:14954,175:pel-26:15146,176:pel-150:15146',
  'reina-150-0|reina-150|1|v1':
    '1:pel-71:14760,2:pel-105:14760,3:pel-47:14760,4:pel-67:14760,5:bar-0:14760,6:pel-39:14760,7:pel-137:14760,8:pel-43:14760,9:pel-112:14760,10:pel-64:14760,11:pel-89:14760,12:pel-102:14760,13:bar-5:14810,14:bar-3:14910,15:gc-3:14917,16:gc-2:14917,17:gc-1:14917,18:gc-0:14979,19:bar-2:15017,20:bar-1:15133,21:bar-4:15133,22:pel-10:15133,23:pel-65:15133,24:pel-61:15133,25:pel-93:15133,26:pel-142:15133,27:pel-53:15133,28:pel-2:15133,29:pel-38:15133,30:pel-148:15133,31:pel-51:15133,32:pel-52:15133,33:pel-41:15133,34:pel-11:15280,35:pel-94:15280,36:pel-30:15280,37:pel-138:15280,38:pel-76:15280,39:pel-97:15280,40:pel-48:15301,41:pel-162:15302,42:pel-107:15302,43:pel-152:15303,44:pel-118:15304,45:pel-62:15304,46:pel-55:15305,47:pel-12:15305,48:pel-82:15305,49:pel-78:15305,50:pel-19:15305,51:pel-31:15306,52:pel-153:15307,53:pel-131:15307,54:pel-154:15309,55:pel-13:15310,56:pel-22:15310,57:pel-34:15311,58:pel-75:15311,59:pel-49:15311,60:pel-143:15313,61:pel-79:15313,62:pel-36:15313,63:pel-119:15314,64:pel-126:15314,65:pel-80:15316,66:pel-70:15316,67:pel-28:15316,68:pel-3:15317,69:pel-73:15317,70:pel-145:15318,71:pel-140:15318,72:pel-17:15320,73:pel-95:15320,74:pel-14:15320,75:pel-5:15320,76:pel-27:15320,77:pel-127:15321,78:pel-160:15392,79:pel-4:15392,80:pel-58:15393,81:pel-116:15393,82:pel-21:15393,83:pel-42:15393,84:pel-6:15393,85:pel-96:15393,86:pel-128:15394,87:pel-26:15394,88:pel-155:15394,89:pel-32:15395,90:pel-161:15395,91:spr-0:15395,92:pel-18:15396,93:pel-33:15396,94:pel-20:15396,95:pel-124:15396,96:pel-40:15397,97:pel-157:15397,98:pel-24:15397,99:pel-35:15398,100:pel-108:15398,101:pel-135:15399,102:pel-113:15399,103:pel-104:15400,104:pel-136:15400,105:pel-141:15400,106:pel-23:15401,107:pel-83:15401,108:pel-133:15401,109:pel-123:15401,110:pel-7:15402,111:pel-86:15402,112:pel-101:15403,113:pel-59:15403,114:pel-90:15403,115:pel-85:15403,116:pel-81:15403,117:pel-60:15403,118:pel-98:15405,119:pel-106:15406,120:pel-54:15408,121:pel-77:15409,122:pel-115:15410,123:pel-72:15410,124:pel-84:15411,125:pel-63:15411,126:pel-9:15420,127:pel-139:15420,128:pel-91:15420,129:pel-125:15420,130:pel-103:15420,131:pel-16:15420,132:pel-146:15420,133:pel-151:15420,134:pel-57:15420,135:pel-129:15420,136:pel-1:15420,137:pel-45:15420,138:pel-130:15420,139:pel-15:15420,140:pel-8:15420,141:pel-37:15420,142:pel-158:15420,143:pel-56:15420,144:pel-117:15420,145:pel-100:15420,146:pel-69:15420,147:pel-68:15420,148:pel-120:15420,149:pel-74:15420,150:pel-156:15420,151:pel-122:15420,152:pel-149:15420,153:pel-44:15420,154:pel-150:15420,155:pel-92:15420,156:pel-50:15420,157:pel-114:15420,158:pel-111:15420,159:pel-159:15420,160:pel-121:15420,161:pel-88:15420,162:spr-2:15420,163:pel-46:15420,164:pel-109:15420,165:pel-147:15420,166:pel-87:15420,167:pel-0:15420,168:pel-29:15420,169:pel-144:15420,170:pel-132:15420,171:pel-134:15420,172:pel-66:15420,173:pel-110:15420,174:pel-99:15420,175:pel-25:15420,176:spr-1:15420',
  'reina-150-1|reina-150|1|v1':
    '1:gc-0:14525,2:gc-3:14525,3:pel-6:14640,4:pel-153:14640,5:pel-56:14640,6:pel-155:14640,7:pel-94:14640,8:pel-148:14640,9:pel-125:14640,10:pel-83:14640,11:pel-97:14640,12:pel-120:14640,13:pel-144:14640,14:pel-158:14640,15:spr-1:14640,16:gc-2:14904,17:gc-1:14904,18:bar-3:14935,19:bar-0:14950,20:bar-2:14950,21:bar-1:14950,22:bar-4:14950,23:pel-45:14950,24:bar-5:15053,25:pel-27:15145,26:pel-42:15147,27:pel-13:15148,28:pel-43:15148,29:pel-19:15149,30:pel-18:15150,31:pel-4:15150,32:pel-71:15151,33:pel-108:15151,34:pel-1:15152,35:pel-119:15152,36:pel-117:15152,37:pel-34:15153,38:pel-133:15153,39:pel-85:15153,40:pel-95:15153,41:pel-24:15153,42:pel-62:15153,43:pel-59:15154,44:pel-76:15154,45:pel-68:15155,46:pel-112:15155,47:pel-121:15155,48:pel-47:15156,49:pel-161:15158,50:pel-141:15158,51:pel-137:15158,52:pel-55:15158,53:pel-78:15158,54:pel-109:15158,55:pel-116:15158,56:pel-54:15159,57:pel-32:15159,58:pel-114:15159,59:pel-11:15160,60:pel-123:15160,61:pel-152:15160,62:pel-127:15160,63:pel-134:15160,64:pel-142:15161,65:pel-77:15161,66:pel-40:15161,67:pel-5:15161,68:pel-48:15162,69:pel-16:15162,70:pel-146:15162,71:pel-122:15162,72:pel-66:15162,73:pel-106:15163,74:pel-113:15163,75:pel-138:15163,76:pel-14:15164,77:pel-15:15164,78:pel-160:15164,79:pel-115:15164,80:pel-65:15164,81:pel-136:15164,82:pel-80:15165,83:pel-49:15165,84:pel-110:15165,85:pel-12:15226,86:pel-50:15226,87:pel-86:15226,88:pel-151:15227,89:pel-162:15228,90:pel-74:15228,91:pel-135:15228,92:pel-46:15229,93:pel-37:15229,94:pel-38:15229,95:pel-91:15230,96:pel-145:15230,97:pel-154:15230,98:pel-63:15231,99:pel-147:15231,100:pel-159:15231,101:pel-75:15231,102:pel-139:15232,103:pel-88:15232,104:pel-84:15233,105:pel-3:15233,106:pel-149:15234,107:pel-87:15234,108:pel-70:15234,109:pel-72:15234,110:pel-44:15235,111:pel-73:15235,112:pel-104:15236,113:pel-29:15236,114:pel-129:15237,115:pel-21:15237,116:pel-156:15237,117:pel-17:15238,118:pel-126:15238,119:pel-99:15238,120:pel-23:15239,121:pel-28:15239,122:pel-89:15239,123:pel-67:15239,124:pel-82:15241,125:pel-150:15241,126:pel-39:15241,127:pel-36:15241,128:pel-79:15243,129:pel-98:15243,130:spr-0:15243,131:pel-51:15244,132:pel-107:15244,133:pel-35:15244,134:pel-69:15245,135:pel-100:15245,136:pel-105:15246,137:pel-9:15249,138:pel-10:15249,139:pel-7:15249,140:pel-58:15249,141:pel-57:15249,142:pel-22:15249,143:pel-30:15249,144:pel-143:15249,145:pel-20:15249,146:pel-33:15249,147:pel-25:15249,148:pel-111:15249,149:pel-96:15249,150:pel-64:15249,151:pel-41:15249,152:pel-101:15249,153:pel-60:15249,154:pel-53:15249,155:pel-130:15249,156:pel-118:15249,157:pel-31:15249,158:pel-61:15249,159:pel-131:15249,160:pel-128:15249,161:pel-2:15249,162:pel-0:15249,163:pel-52:15249,164:pel-157:15249,165:pel-26:15249,166:pel-8:15444,167:pel-124:15444,168:pel-140:15444,169:pel-92:15444,170:pel-103:15505,171:pel-93:15505,172:pel-102:15505,173:pel-81:15505,174:pel-90:15505,175:spr-2:15505,176:pel-132:15638',
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

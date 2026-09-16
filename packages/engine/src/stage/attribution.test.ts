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
/**
 * RESELLADO EN LA v58, y lo que hay que justificar aquí es un reparto que cambia SOLO EN LA MONTAÑA.
 *
 * Lo que mueve la huella son las dos reglas de equipo de la tanda: el equipo que deja de perseguir
 * a su propio maillot cuando es ÉL quien va delante, y el que deja de dar relevos cuando su hombre
 * de la general se ha quedado a más de un grupo por detrás.
 *
 * Y esto es lo que dice la huella, contado antes de tocar nada:
 *
 * - **Las dos llanas no se mueven NI UN SEGUNDO**: 0 de 176 corredores cambian de tiempo, y ganan
 *   los mismos (`spr-6` y `spr-0`). Lo único que cambia es el orden DENTRO de los ciento setenta y
 *   tres que llegan al mismo reloj, que es el desempate del sprint. Tenía que ser así: en la llana
 *   canónica no hay general que defender, así que las dos reglas nuevas no llegan a dispararse.
 * - **Las dos reinas sí**: 126 y 165 corredores cambian de tiempo, con el peor caso en 98 s y 80 s.
 *   Es donde vive el trabajo de equipo por la general.
 * - `reina-150-1` conserva ganador (`gc-0`) y los dos hombres de cabeza; `reina-150-0` cambia de
 *   ganador **dentro del grupo que llegaba junto** (`pel-71` → `pel-105`, once hombres al mismo
 *   reloj en vez de doce), que es un desempate, no una carrera distinta.
 *
 * Se comprobó además que la limpieza del motivo de relevo al cambiar de grupo NO mueve la huella:
 * con y sin ella el resultado es idéntico, porque es una etiqueta de la foto y no física. Y la
 * puerta del reenganche, que en un momento de esta misma tanda se estrechó a 5 s, **está de vuelta
 * en 22**: el banco del adoquín enseñó que esa puerta es también el mecanismo por el que el fuerte
 * vuelve, y la historia entera está contada en `rejoinGapSeconds`.
 *
 * ————— RE-SELLADAS EN LA v65: LAS PANCARTAS (R06, paso 10) —————
 *
 * Es el primer racimo de la tanda táctica que se enciende de verdad, y la causa de estas cuatro
 * huellas es él y solo él: los otros cinco siguen apagados.
 *
 * Lo que cambia y por qué: **el grupo se relaja justo después de una pancarta** —cobrada la volante
 * o coronada la cima— y en esa ventana se ataca más. Es lo que cualquiera que haya visto una carrera
 * espera y el motor no hacía: se coronaba y el pelotón seguía al mismo ritmo. El efecto en la huella
 * es pequeño y coherente: `llana-180-0` conserva ganador (`spr-6`) y entra **46 segundos más
 * despacio** (14.711 → 14.757). Nadie cambia de carrera; el pelotón afloja donde tiene que aflojar.
 *
 * Y la otra mitad del racimo no toca la huella porque el banco no la puede ver: la casilla
 * `contestClimbs` del jugador, que las cimas ignoraban, no existe en un campo sintético que no la
 * marca.
 *
 * ————— LO QUE ESTAS HUELLAS VAN A HACER CUANDO EL RESTO DE LA CAPA SE ENCIENDA —————
 *
 * Está medido, no previsto: se encendieron los cinco racimos —fases (R19), aduana (R03/R04),
 * subasta del frente (R20) y juego de equipo (R02/R18)—, se re-sellaron, y se volvió atrás. Los
 * números que salieron quedan aquí porque son el mejor aviso de qué esperar:
 *
 * - **Las dos llanas siguen siendo del sprint** y las ganan velocistas, que es lo que tienen que
 *   ser. El pelotón entra ~3 minutos más despacio (14.711 → 14.891 s en `llana-180-0`): con la capa
 *   encendida se ataca más y se rueda con más acordeón, y eso cuesta tiempo.
 * - **Las dos reinas las gana la FUGA** (`bar-5` y `bar-0`, contra `pel-105` y `gc-0`). No es una
 *   sorpresa ni un defecto: es `mountain.breakawayWinPct` subiendo de 26,7 % a 38,3 %, dentro de su
 *   banda de 25-45, y es la conducta que cinco racimos de ese documento existen para producir.
 *   Una etapa reina que gana el grupo del día es lo normal en carretera; que la ganara siempre el
 *   pelotón era lo que no lo era.
 *
 * Y la razón de haber vuelto atrás está en docs/balance.md «v60 §9»: el encendido conjunto pasa las
 * bandas y **se lleva por delante cinco guardarraíles de la CRÓNICA** —el pelotón se parte menos de
 * golpe, se reagrupa menos y caza menos—, que es una decisión distinta y no se toma de paso.
 *
 * --- RE-SELLADAS EN EL PASO 14 (LA COLOCACIÓN), con la predicción declarada antes de medir -------
 *
 * `ENGINE_VERSION` 65 → 66. La causa es una y está escrita: **el remate deja de ordenarse con un
 * dado de colocación y pasa a leer dónde va cada hombre de verdad** (R15a.4), más el encajonado que
 * eso permite. Lo predicho era que el movimiento fuera pequeño y que **los cuatro ganadores se
 * conservaran**, porque la colocación no reparte piernas: reparte sitio.
 *
 * --- RE-SELLADAS EN EL PASO 15 (EL TREN COMO SUBMOTOR) ----------------------------------------
 *
 * `ENGINE_VERSION` 68 → 69. Causa declarada antes de medir: **el tren deja de lanzar a los tres
 * lanzadores a la vez en los últimos tres kilómetros** y pasa a relevar de uno en uno desde que le
 * toca. Cambia QUIÉN paga el viento en los últimos kilómetros, así que cambian los relojes; no toca
 * la ley de velocidad ni el remate, así que no debería cambiar quién gana.
 *
 * Y hay que decir una cosa que la medida enseñó y que es fácil de leer al revés: **los cuatro
 * estadísticos canónicos de la llana salen IDÉNTICOS al brazo apagado** —fuga 5,8 %, mejor sprinter
 * 40 %, captura 92,9 %, km de la caza 19— y aun así **las huellas se mueven**. No es una
 * contradicción: una huella es el reloj de los 176 y esos cuatro números son agregados de quién
 * gana. Que el tren mueva los relojes sin voltear una sola llegada es exactamente lo que un cambio
 * de reparto del viento hace.
 *
 * Lo medido, fila a fila:
 *   - `llana-180-0`: 175 filas de 176. Ganador spr-6 → spr-6.
 *   - `llana-180-1`: 171 filas de 176. Ganador spr-0 → spr-0.
 *   - `reina-150-0`: 0 filas de 176. Ganador pel-105 → pel-105.
 *   - `reina-150-1`: 0 filas de 176. Ganador gc-0 → gc-0.
 *
 * --- RE-SELLADAS EN EL PASO 13 (LOS PERCANCES MECÁNICOS) --------------------------------------
 *
 * `ENGINE_VERSION` 67 → 68. Causa declarada antes de medir: **en este motor nadie pinchaba**, y
 * ahora sí. Un percance para a un hombre en un kilómetro concreto y le cuesta lo que tarde su
 * coche, así que lo predicho era que las huellas se movieran MÁS que en el paso 12 —un pinchazo
 * saca a alguien de su sitio, y eso reordena el grupo— sin tocar la ley de velocidad ni el remate.
 *
 * Lo medido, fila a fila, y es **la partición más limpia de toda la tanda**:
 *
 *   - `llana-180-0`: **0 filas de 176**.   `reina-150-0`: **0 filas de 176**.
 *   - `llana-180-1`: **174 de 176**, ganador `spr-0` intacto, su reloj +1 s.
 *   - `reina-150-1`: **176 de 176**, ganador `gc-0` intacto, su reloj +3 s.
 *
 * O sea: **en dos de las cuatro no pinchó nadie que importara, y en las otras dos pinchó alguien
 * pronto y el pelotón entero salió reordenado detrás**. Es exactamente lo que un percance hace y
 * exactamente lo que un dado por bloque produce: no reparte un poco a todos, cae o no cae. Los
 * cuatro ganadores se conservan, porque un pinchazo reordena la fila y no reparte piernas.
 *
 * --- RE-SELLADAS EN EL PASO 12 (LA TREGUA Y EL HUNDIMIENTO OBSERVABLE) ------------------------
 *
 * `ENGINE_VERSION` 66 → 67. Causa declarada antes de medir: **el que tira hasta apagarse sale del
 * turno** (R13.3) y **el leal que ve sufrir a su carta también** (R13.2). Las dos cambian QUIÉN va
 * delante en algunos bloques y ninguna toca la ley de velocidad ni el remate, así que lo predicho
 * era un movimiento pequeño, en la cola, con los ganadores intactos.
 *
 * Y eso es exactamente lo que sale, contado fila a fila:
 *
 * - `llana-180-0`: **2 filas de 176**. Los dos últimos hombres entran 90 s antes (14.883 → 14.793):
 *   el que iba tirando del grupeto se apagó y le relevó otro, que es la regla entera.
 * - `reina-150-1`: **5 filas de 176**, todas permutaciones dentro del mismo segundo.
 * - `llana-180-1` y `reina-150-0`: **ni un dígito**.
 * - Los cuatro ganadores, intactos.
 *
 * Dos escenarios de cuatro sin mover no es un descuido, es la medida: estos bancos corren sin
 * general en juego, y sin general nadie pide una tregua. Donde el racimo sí vive —la clásica más
 * dura y Il Lombardia— las pájaras bajan del 10,8 % al 10,2 % (docs/balance.md «v60 §16»).
 *
 * --- RE-SELLADO DEL PASO 20: LA CARRETERA GIRA (v70, R14) --------------------------------------
 *
 * **Una causa, y es LA LEY**: `targetSpeed × (1 − windAheadScale · vientoFrontal)`. Es el único
 * re-sellado de los dieciséis en que lo que se mueve no es una decisión sino la física, y por eso el
 * paso va solo. Las cuatro predicciones de §9.3 se comprueban una a una, y las cuatro se cumplen:
 *
 * | huella        | exigido                                   | medido                                  |
 * | ------------- | ----------------------------------------- | --------------------------------------- |
 * | `llana-180-0` | gana un `spr-*`; ≥ 170 de 176 al mismo seg | `spr-6`; **173** al mismo seg, 3 relojes |
 * | `llana-180-1` | ídem                                       | `spr-0`; **171** al mismo seg, 5 relojes |
 * | `reina-150-0` | gana relleno o `gc-*`/`bar-*`; ≥ 40 relojes| `pel-105`; 11 al mismo seg, **47**       |
 * | `reina-150-1` | gana un `gc-*`; ≥ 40 relojes               | `gc-0`+`gc-3`; 2 al mismo seg, **43**    |
 *
 * **Y lo que de verdad hay que mirar es el RELOJ, no el orden**: `llana-180-0` pasa de 14.711 a
 * 14.756 —cuarenta y cinco segundos más lenta en 180 km—, `llana-180-1` de 14.748 a 14.742,
 * `reina-150-1` de 14.525 a 14.529. El sentido no es el mismo en las cuatro y eso es correcto: de
 * cara se pierde y de cola se gana, y cada semilla tiene su viento.
 *
 * Lo que sí tiene sentido único, y hay que decirlo porque es el único sesgo del paso, es que **la
 * media sale algo más lenta**: de cara y de cola se compensan en VELOCIDAD pero no en TIEMPO. Rodar
 * la mitad de una etapa un 8 % más despacio cuesta más segundos de los que la otra mitad ahorra al
 * 8 % más deprisa —es la media armónica contra la aritmética—, y por eso `medianWinnerKmh` baja
 * 0,04-0,14 km/h en los tres tipos de etapa (v60 §24) sin sacar de banda el invariante 43.
 *
 * `reina-150-0` conserva ganador, tiempo y hueco al segundo grupo dígito a dígito: lo único que se
 * mueve son los relojes de la cola (45 → 47). No es raro — ese día no hay viento que valga.
 *
 * --- Y LO ANTERIOR, DEL PASO 14 (LA COLOCACIÓN) ------------------------------------------------
 *
 * Y así sale. `llana-180-0` conserva a `spr-6` y no se mueve ni un segundo; `llana-180-1` conserva a
 * `spr-0` y mueve la cola un segundo (15.143 → 15.142); `reina-150-0` conserva a `pel-105` y entra
 * un segundo antes; `reina-150-1` conserva a `gc-0` y entra un segundo más tarde. Lo que se reordena
 * es el pelotón de dentro, que es exactamente lo que la colocación existe para reordenar.
 */
const SEALED_RESULTS: Record<string, string> = {
  'llana-180-0|llana-180|1|v1':
    '1:spr-6:14756,2:spr-0:14756,3:spr-1:14756,4:spr-5:14756,5:spr-8:14756,6:spr-2:14756,7:spr-4:14756,8:spr-3:14756,9:spr-7:14756,10:spr-9:14756,11:pel-45:14756,12:pel-78:14756,13:pel-43:14756,14:pel-21:14756,15:pel-89:14756,16:pel-139:14756,17:pel-87:14756,18:pel-156:14756,19:pel-61:14756,20:pel-130:14756,21:pel-68:14756,22:pel-39:14756,23:pel-85:14756,24:pel-118:14756,25:pel-142:14756,26:pel-62:14756,27:pel-94:14756,28:pel-133:14756,29:pel-77:14756,30:pel-16:14756,31:pel-70:14756,32:pel-100:14756,33:pel-111:14756,34:pel-149:14756,35:pel-55:14756,36:pel-123:14756,37:pel-143:14756,38:pel-49:14756,39:pel-98:14756,40:pel-67:14756,41:pel-125:14756,42:pel-91:14756,43:brk-2:14756,44:pel-150:14756,45:pel-42:14756,46:pel-32:14756,47:pel-52:14756,48:pel-33:14756,49:pel-141:14756,50:pel-8:14756,51:pel-10:14756,52:pel-17:14756,53:pel-132:14756,54:pel-18:14756,55:pel-14:14756,56:pel-12:14756,57:pel-121:14756,58:pel-140:14756,59:pel-34:14756,60:pel-51:14756,61:pel-147:14756,62:pel-99:14756,63:pel-148:14756,64:pel-74:14756,65:pel-127:14756,66:pel-109:14756,67:pel-40:14756,68:pel-136:14756,69:pel-50:14756,70:pel-105:14756,71:pel-146:14756,72:pel-4:14756,73:pel-131:14756,74:pel-86:14756,75:pel-59:14756,76:pel-65:14756,77:pel-145:14756,78:pel-6:14756,79:brk-5:14756,80:pel-107:14756,81:pel-54:14756,82:pel-37:14756,83:pel-84:14756,84:pel-31:14756,85:pel-101:14756,86:pel-124:14756,87:pel-151:14756,88:pel-154:14756,89:pel-134:14756,90:pel-103:14756,91:pel-116:14756,92:pel-92:14756,93:pel-36:14756,94:pel-97:14756,95:pel-102:14756,96:pel-144:14756,97:pel-159:14756,98:pel-7:14756,99:pel-44:14756,100:pel-76:14756,101:pel-135:14756,102:pel-96:14756,103:pel-80:14756,104:pel-56:14756,105:pel-41:14756,106:pel-83:14756,107:pel-93:14756,108:pel-117:14756,109:pel-30:14756,110:pel-69:14756,111:pel-13:14756,112:pel-155:14756,113:pel-38:14756,114:pel-88:14756,115:pel-64:14756,116:pel-95:14756,117:pel-90:14756,118:pel-75:14756,119:pel-1:14756,120:pel-152:14756,121:pel-112:14756,122:pel-82:14756,123:pel-72:14756,124:pel-23:14756,125:pel-15:14756,126:pel-129:14756,127:pel-35:14756,128:pel-157:14756,129:pel-60:14756,130:pel-19:14756,131:pel-11:14756,132:pel-108:14756,133:pel-119:14756,134:pel-47:14756,135:pel-106:14756,136:pel-46:14756,137:pel-79:14756,138:pel-115:14756,139:pel-73:14756,140:pel-120:14756,141:pel-2:14756,142:pel-66:14756,143:pel-9:14756,144:pel-137:14756,145:pel-110:14756,146:pel-138:14756,147:pel-29:14756,148:pel-81:14756,149:pel-48:14756,150:pel-58:14756,151:pel-126:14756,152:pel-27:14756,153:pel-24:14756,154:brk-1:14756,155:pel-104:14756,156:pel-25:14756,157:pel-20:14756,158:pel-26:14756,159:pel-28:14756,160:pel-114:14756,161:pel-122:14756,162:pel-22:14756,163:pel-63:14756,164:pel-128:14756,165:pel-158:14756,166:pel-113:14756,167:brk-3:14756,168:pel-0:14756,169:brk-0:14756,170:pel-3:14756,171:pel-53:14756,172:pel-5:14756,173:brk-4:14756,174:pel-71:14792,175:pel-57:14792,176:pel-153:15221',
  'llana-180-1|llana-180|1|v1':
    '1:spr-0:14742,2:spr-2:14742,3:spr-7:14742,4:spr-6:14742,5:spr-1:14742,6:spr-3:14742,7:spr-4:14742,8:spr-9:14742,9:spr-8:14742,10:spr-5:14742,11:pel-55:14742,12:pel-141:14742,13:brk-0:14742,14:pel-113:14742,15:pel-117:14742,16:pel-61:14742,17:pel-58:14742,18:pel-139:14742,19:pel-40:14742,20:pel-133:14742,21:pel-46:14742,22:pel-129:14742,23:pel-19:14742,24:pel-16:14742,25:pel-122:14742,26:pel-64:14742,27:pel-45:14742,28:pel-63:14742,29:pel-119:14742,30:pel-142:14742,31:pel-115:14742,32:pel-6:14742,33:pel-111:14742,34:pel-92:14742,35:pel-100:14742,36:pel-20:14742,37:pel-38:14742,38:pel-9:14742,39:pel-103:14742,40:pel-54:14742,41:pel-60:14742,42:pel-62:14742,43:pel-71:14742,44:pel-15:14742,45:pel-31:14742,46:pel-50:14742,47:pel-89:14742,48:pel-144:14742,49:pel-137:14742,50:pel-83:14742,51:pel-34:14742,52:pel-82:14742,53:pel-17:14742,54:pel-157:14742,55:pel-41:14742,56:pel-18:14742,57:pel-159:14742,58:pel-49:14742,59:pel-105:14742,60:pel-91:14742,61:pel-72:14742,62:pel-77:14742,63:pel-99:14742,64:pel-138:14742,65:pel-84:14742,66:pel-13:14742,67:pel-121:14742,68:pel-135:14742,69:pel-118:14742,70:pel-8:14742,71:brk-3:14742,72:pel-36:14742,73:pel-59:14742,74:pel-68:14742,75:pel-120:14742,76:pel-94:14742,77:pel-107:14742,78:pel-156:14742,79:pel-37:14742,80:pel-73:14742,81:pel-97:14742,82:pel-128:14742,83:pel-69:14742,84:pel-10:14742,85:pel-110:14742,86:pel-93:14742,87:pel-12:14742,88:pel-67:14742,89:pel-149:14742,90:pel-88:14742,91:pel-109:14742,92:pel-112:14742,93:pel-57:14742,94:pel-23:14742,95:pel-143:14742,96:pel-7:14742,97:pel-106:14742,98:pel-155:14742,99:pel-53:14742,100:pel-101:14742,101:pel-74:14742,102:pel-47:14742,103:pel-146:14742,104:pel-48:14742,105:pel-126:14742,106:pel-140:14742,107:pel-51:14742,108:pel-102:14742,109:pel-127:14742,110:pel-79:14742,111:pel-33:14742,112:pel-90:14742,113:pel-95:14742,114:pel-25:14742,115:pel-147:14742,116:pel-11:14742,117:pel-78:14742,118:pel-52:14742,119:pel-151:14742,120:pel-3:14742,121:pel-158:14742,122:pel-27:14742,123:pel-123:14742,124:pel-152:14742,125:pel-153:14742,126:pel-85:14742,127:pel-80:14742,128:pel-116:14742,129:pel-96:14742,130:pel-28:14742,131:pel-39:14742,132:pel-5:14742,133:pel-42:14742,134:pel-66:14742,135:pel-108:14742,136:pel-125:14742,137:pel-32:14742,138:pel-86:14742,139:pel-114:14742,140:pel-22:14742,141:pel-70:14742,142:pel-134:14742,143:pel-43:14742,144:pel-1:14742,145:pel-145:14742,146:pel-29:14742,147:pel-56:14742,148:pel-65:14742,149:pel-35:14742,150:pel-2:14742,151:pel-30:14742,152:pel-75:14742,153:pel-81:14742,154:pel-104:14742,155:brk-5:14742,156:pel-136:14742,157:pel-76:14742,158:pel-87:14742,159:pel-44:14742,160:pel-24:14742,161:pel-132:14742,162:pel-148:14742,163:pel-98:14742,164:brk-4:14742,165:brk-2:14742,166:pel-0:14742,167:pel-14:14742,168:pel-4:14742,169:pel-154:14742,170:pel-130:14742,171:brk-1:14742,172:pel-124:14922,173:pel-131:14955,174:pel-21:15000,175:pel-26:15142,176:pel-150:15142',
  'reina-150-0|reina-150|1|v1':
    '1:pel-105:14753,2:pel-71:14753,3:pel-67:14753,4:bar-0:14753,5:pel-39:14753,6:pel-137:14753,7:pel-43:14753,8:pel-89:14753,9:pel-112:14753,10:pel-64:14753,11:pel-102:14753,12:bar-5:14810,13:pel-47:14858,14:gc-3:14910,15:gc-2:14910,16:gc-1:14910,17:bar-3:14910,18:gc-0:14976,19:bar-2:15018,20:bar-1:15121,21:pel-10:15121,22:bar-4:15121,23:pel-65:15121,24:pel-61:15121,25:pel-93:15121,26:pel-142:15121,27:pel-2:15121,28:pel-53:15121,29:pel-38:15121,30:pel-41:15121,31:pel-51:15121,32:pel-148:15121,33:pel-52:15121,34:pel-11:15270,35:pel-94:15270,36:pel-30:15270,37:pel-138:15270,38:pel-76:15270,39:pel-97:15270,40:pel-48:15302,41:pel-162:15303,42:pel-107:15303,43:pel-152:15304,44:pel-118:15305,45:pel-62:15305,46:pel-55:15306,47:pel-12:15306,48:pel-82:15306,49:pel-78:15306,50:pel-19:15306,51:pel-31:15307,52:pel-153:15308,53:pel-131:15308,54:pel-154:15310,55:pel-13:15311,56:pel-22:15311,57:pel-34:15312,58:pel-75:15312,59:pel-49:15312,60:pel-143:15314,61:pel-79:15314,62:pel-36:15314,63:pel-119:15315,64:pel-126:15315,65:pel-80:15317,66:pel-70:15317,67:pel-28:15317,68:pel-3:15318,69:pel-73:15318,70:pel-145:15319,71:pel-140:15319,72:pel-27:15320,73:pel-17:15321,74:pel-95:15321,75:pel-14:15321,76:pel-5:15321,77:pel-127:15322,78:pel-58:15393,79:pel-96:15393,80:pel-128:15394,81:pel-21:15394,82:pel-161:15395,83:pel-160:15395,84:pel-18:15396,85:pel-116:15396,86:pel-42:15396,87:pel-33:15396,88:pel-26:15396,89:pel-4:15396,90:pel-6:15396,91:spr-0:15396,92:pel-40:15397,93:pel-124:15397,94:pel-155:15397,95:pel-32:15398,96:pel-35:15398,97:pel-24:15398,98:pel-20:15399,99:pel-141:15400,100:pel-7:15401,101:pel-104:15401,102:pel-108:15401,103:pel-83:15402,104:pel-135:15402,105:pel-123:15402,106:pel-101:15403,107:pel-136:15403,108:pel-59:15403,109:pel-85:15403,110:pel-60:15403,111:pel-81:15403,112:pel-113:15403,113:pel-90:15404,114:pel-157:15404,115:pel-23:15405,116:pel-133:15405,117:pel-106:15406,118:pel-86:15407,119:pel-77:15409,120:pel-63:15410,121:pel-98:15410,122:pel-84:15411,123:pel-115:15411,124:pel-54:15412,125:pel-99:15412,126:pel-37:15412,127:spr-2:15413,128:pel-8:15417,129:pel-15:15417,130:pel-121:15417,131:pel-139:15417,132:pel-9:15417,133:pel-114:15417,134:pel-151:15417,135:pel-125:15417,136:pel-150:15417,137:pel-132:15417,138:pel-46:15417,139:pel-16:15417,140:pel-88:15417,141:pel-29:15417,142:pel-68:15417,143:pel-69:15417,144:pel-122:15417,145:pel-56:15417,146:pel-103:15417,147:pel-57:15417,148:pel-129:15417,149:pel-1:15417,150:pel-100:15417,151:pel-117:15417,152:pel-87:15417,153:pel-74:15417,154:pel-146:15417,155:pel-149:15417,156:pel-159:15417,157:pel-109:15417,158:pel-44:15417,159:pel-120:15417,160:pel-50:15417,161:pel-111:15417,162:pel-134:15417,163:pel-92:15417,164:pel-158:15417,165:pel-147:15417,166:pel-0:15417,167:pel-66:15417,168:pel-45:15417,169:pel-156:15417,170:pel-25:15417,171:pel-91:15417,172:pel-144:15417,173:spr-1:15417,174:pel-130:15417,175:pel-72:15417,176:pel-110:15417',
  'reina-150-1|reina-150|1|v1':
    '1:gc-0:14529,2:gc-3:14529,3:pel-17:14666,4:pel-7:14666,5:pel-153:14666,6:pel-125:14666,7:pel-94:14666,8:pel-155:14666,9:pel-74:14666,10:pel-148:14666,11:pel-98:14666,12:pel-144:14666,13:pel-84:14666,14:pel-25:14666,15:spr-2:14666,16:gc-2:14931,17:gc-1:14931,18:bar-3:14970,19:pel-116:14970,20:bar-2:14990,21:bar-0:15007,22:bar-1:15007,23:bar-4:15007,24:bar-5:15088,25:pel-12:15189,26:pel-91:15189,27:pel-56:15189,28:pel-6:15189,29:pel-1:15189,30:pel-149:15189,31:pel-27:15196,32:pel-42:15199,33:pel-13:15200,34:pel-43:15200,35:pel-18:15201,36:pel-19:15201,37:pel-4:15202,38:pel-108:15203,39:pel-71:15204,40:pel-117:15204,41:pel-133:15204,42:pel-24:15204,43:pel-95:15205,44:pel-76:15205,45:pel-34:15205,46:pel-62:15205,47:pel-85:15205,48:pel-59:15206,49:pel-112:15206,50:pel-121:15207,51:pel-68:15207,52:pel-47:15208,53:pel-119:15272,54:pel-55:15272,55:pel-141:15272,56:pel-78:15275,57:pel-137:15276,58:pel-161:15276,59:pel-114:15277,60:pel-54:15277,61:pel-142:15278,62:pel-134:15278,63:pel-40:15278,64:pel-11:15279,65:pel-5:15279,66:pel-32:15279,67:pel-123:15280,68:pel-48:15280,69:pel-127:15280,70:pel-16:15281,71:pel-152:15281,72:pel-146:15281,73:pel-109:15281,74:pel-138:15282,75:pel-14:15282,76:pel-77:15282,77:pel-160:15282,78:pel-106:15283,79:pel-122:15283,80:pel-113:15284,81:pel-115:15284,82:pel-80:15285,83:pel-49:15286,84:pel-136:15287,85:pel-50:15287,86:pel-159:15287,87:pel-86:15288,88:pel-66:15288,89:pel-46:15289,90:pel-162:15289,91:pel-151:15290,92:pel-38:15290,93:pel-37:15290,94:pel-135:15290,95:pel-97:15291,96:pel-65:15291,97:pel-75:15292,98:pel-110:15292,99:pel-147:15292,100:pel-35:15303,101:pel-100:15303,102:pel-45:15303,103:pel-15:15303,104:pel-10:15303,105:pel-107:15303,106:pel-70:15303,107:pel-83:15303,108:pel-63:15303,109:pel-154:15303,110:pel-22:15303,111:pel-105:15303,112:pel-82:15303,113:pel-104:15303,114:pel-41:15303,115:pel-156:15303,116:pel-28:15303,117:pel-72:15303,118:pel-67:15303,119:pel-36:15303,120:pel-21:15303,121:pel-44:15303,122:pel-129:15303,123:pel-126:15303,124:pel-23:15303,125:pel-88:15303,126:pel-73:15303,127:pel-89:15303,128:pel-87:15303,129:pel-120:15303,130:pel-139:15303,131:pel-51:15303,132:pel-64:15303,133:pel-150:15303,134:pel-90:15303,135:pel-158:15303,136:pel-79:15303,137:pel-39:15303,138:pel-0:15303,139:pel-29:15303,140:pel-3:15303,141:pel-99:15303,142:pel-157:15303,143:pel-145:15303,144:spr-0:15303,145:pel-9:15325,146:pel-58:15325,147:pel-130:15325,148:pel-69:15325,149:pel-53:15325,150:pel-131:15325,151:pel-33:15325,152:pel-61:15325,153:pel-2:15325,154:pel-101:15325,155:pel-118:15325,156:pel-31:15325,157:pel-20:15325,158:pel-26:15325,159:pel-30:15325,160:pel-143:15325,161:pel-96:15325,162:pel-111:15325,163:pel-124:15325,164:pel-8:15418,165:pel-128:15418,166:pel-57:15418,167:pel-140:15418,168:pel-52:15418,169:pel-60:15418,170:spr-1:15418,171:pel-103:15445,172:pel-92:15445,173:pel-93:15445,174:pel-102:15445,175:pel-81:15445,176:pel-132:15631',
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

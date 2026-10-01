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
 *
 * --- Y LAS CUATRO SE RE-SELLAN EN LA v81, PORQUE SE ENCIENDEN LAS CINCO CAPAS -------------------
 *
 * `phases`, `customs`, `front`, `teamPlay` y `director` pasan a `true` por decisión del dueño. Las
 * cinco cambian lo que ocurre en la carretera —ése es el objetivo de encenderlas—, así que estas
 * huellas TIENEN que moverse y moverlas aquí no es relajar un sello: es volver a tomar la foto con
 * el motor nuevo. Lo que no se puede es moverlas sin decirlo, y por eso esto queda escrito.
 *
 * Lo medido en `llana-180-0`: el ganador pasa de `spr-6` a `spr-5` y la etapa se corre **64 s más
 * rápido** (14.756 -> 14.692). Con las fases repartiendo los intentos por toda la etapa y el frente
 * subastado, la llana deja de ser un paseo hasta el sprint.
 *
 * --- Y LAS DOS DE LA REINA SE RESELLAN APARTE, PORQUE SE QUEDARON SIN RESELLAR ------------------
 *
 * Las dos llanas se resellaron con el encendido; las dos de montaña no, y el sello llevaba desde
 * entonces en rojo. Se resellan aquí, y antes se comprobó QUÉ se había movido, que es lo único que
 * distingue resellar de tapar:
 *
 * - **La reina se corre más despacio y se rompe más.** Los 176 corredores entran más tarde, con un
 *   delta MEDIANO de +72 s en la semilla 0 y +69 s en la 1, y los grupos de llegada pasan de 39 a 44
 *   y de 28 a 33. O sea: la montaña selecciona MÁS, que es lo que las cinco capas prometen.
 * - **La general de cabeza no cambia de manos.** Los cuatro primeros son los mismos cuatro hombres
 *   (`gc-2`, `gc-1`, `gc-3`, `gc-0`) en la semilla 0 y los mismos cuatro en la 1. Lo único que se
 *   mueve arriba es un EMPATE deshecho al revés en la semilla 1: `gc-3` y `gc-2` entraban los dos en
 *   15.839 y ahora entran los dos en 15.907, con `gc-2` delante. No es un resultado distinto: es el
 *   mismo segundo ordenado de otra forma.
 * - **Lo que sí cambia es quién acompaña.** En los puestos 5-6 los `pel-` dan paso a los `bar-`
 *   —baroudeurs—, que es la firma de una carrera en la que los movimientos se reparten por toda la
 *   etapa en vez de amontonarse al final.
 *
 * NINGUNO de los cambios de la v81 sobre la crónica toca esto, y está comprobado: el parte de
 * «quién tira» es OBSERVACIÓN pura —`pullWindow` no mueve un segundo— y las cuatro huellas salen
 * dígito a dígito iguales con la puerta vieja (`pullMinWork`) y con la nueva (`pullMinWorkTotal`).
 * Lo que movió la reina fue encender las capas, no contarlas.
 *
 * --- Y LAS DOS DE MONTAÑA SE MUEVEN OTRA VEZ CON EL CONTACTO FÍSICO (v81) ------------------------
 *
 * `contactGapSeconds` deja de ser un número fijo de segundos y pasa a compararse con la carretera
 * que los propios grupos ocupan (ver `contactoS` en `simulate.ts`). Lo que eso mueve, medido:
 *
 * - **LAS DOS LLANAS SALEN IDÉNTICAS DÍGITO A DÍGITO**, y ésa es la prueba de que la regla hace lo
 *   que dice: en llano se rueda a 45 km/h, el umbral se encoge a un par de segundos y no se funde
 *   nada que no se fundiera ya. Los abanicos siguen exactamente donde estaban.
 * - En la reina, lo que cambia es **el número de grupos de llegada, no los tiempos**: 44 -> 27 en la
 *   semilla 0 y 33 -> 32 en la 1, con deltas MEDIANOS de +8 s y −1 s. Los grupos que desaparecen son
 *   los que estaban a uno o dos segundos de otro, que era el defecto que el dueño vio en producción.
 * - Los cuatro de cabeza entran ahora JUNTOS —`gc-2`, `gc-1`, `gc-3` y `gc-0` los cuatro en 15.520,
 *   donde antes marcaban 15.489, 15.512, 15.528 y 15.546—. Cincuenta y siete segundos repartidos
 *   entre cuatro hombres que iban en contacto no eran cuatro grupos: eran uno.
 *
 * Y el reloj se CONSERVA, que es lo que hace que los deltas medianos sean de un dígito: la primera
 * versión de esta regla entregaba el reloj del pelotón a cada grupo que alcanzaba, y el campo entero
 * de la semilla 1 entraba **315 s más rápido** con 15 grupos en vez de 33. Ver la nota de
 * `fundirse por contacto` en `simulate.ts`: la fusión cambia la etiqueta del grupo, no el reloj de
 * la gente.
 *
 * --- Y EN LA v83 LAS DOS DE MONTAÑA VUELVEN CASI DONDE ESTABAN, PORQUE EL BLOQUE DE ARRIBA MEDÍA --
 * --- UN DEFECTO MÍO Y NO UNA REGLA -------------------------------------------------------------
 *
 * Lo de «44 -> 27» y «los cuatro de cabeza entran JUNTOS en 15.520» que está escrito ahí arriba NO
 * era la regla física reconociendo un grupo: era la regla física alimentada con el tamaño
 * equivocado. Le pasé `riderIds.length`, que es una lista que SOLO CRECE —el pelotón llegó a
 * declarar 629 corredores en una carrera de 176—, y con ese número el umbral del contacto pasaba de
 * trece segundos a más de cien. El pelotón fundía grupos que iban a tres minutos.
 *
 * Con `membersOf(id).length`, que es quién va HOY en el grupo:
 *
 * - **Las dos llanas siguen saliendo idénticas dígito a dígito.** Esa parte del bloque de arriba sí
 *   se sostiene, y es lo que dice que el arreglo tampoco toca los abanicos.
 * - **Vuelven los grupos de llegada que el defecto aplastaba**: 27 -> 44 en la semilla 0 y 32 -> 36
 *   en la 1, o sea casi exactamente los 44 y 33 de antes de la regla. Cada fusión de más era un
 *   grupo de llegada de menos.
 * - **Y los cuatro de cabeza vuelven a entrar separados**: `gc-2`, `gc-1` y `gc-3` marcaban los tres
 *   15.520 y ahora marcan 15.489, 15.512 y 15.528. Movidos 176 de 176 con mediano −7 s en la
 *   semilla 0; 172 de 176 con mediano −3 s en la 1.
 *
 * Medido aparte sobre doce reinas: la puerta de los descolgados pasa de fundir 248 grupos a fundir
 * 60, y de 184 fusiones por encima de 22 s (la peor, 179 s) a UNA de 23 s. Ver la entrada «v83» de
 * `docs/balance.md` y el lint que impide repetirlo (`riderIds.length` prohibido en `src/stage`).
 *
 * --- Y EN LA v86, PORQUE EL QUE VA DE AMARILLO DEJA DE DAR RELEVOS --------------------------------
 *
 * El dueño: «y más grave porque vemos al propio líder tirando del grupo». La regla entera está en
 * `relayDuty` y en el orden del relleno de `relayTurn`; aquí va lo que mueve, que es poco y va donde
 * tiene que ir:
 *
 * - **LAS DOS LLANAS SALEN IDÉNTICAS DÍGITO A DÍGITO**, y no por suerte: en `llana-180` no hay
 *   general en juego, así que nadie lleva maillot y la regla no se cobra ni una vez. Era la
 *   predicción antes de correrlo.
 * - `reina-canonica-0`: se mueven 168 de 176 con un delta MEDIANO de **−1 s** (min/max −83/+11), y
 *   los grupos de llegada pasan de 44 a 48. Los cuatro de cabeza casi no se enteran: `gc-2` entra en
 *   15.488 donde entraba en 15.489.
 * - `reina-canonica-1`: se mueven solo 65 de 176, mediano **0 s**, y los tres de cabeza salen
 *   CLAVADOS (`gc-3`, `gc-2` y `gc-0` los tres en 15.877, igual que antes).
 *
 * El signo es el que se espera: el maillot deja de gastar turnos al frente y se ahorra un segundo;
 * el resto se reordena alrededor. Lo que NO pasa es que cambie quién gana la general.
 *
 * **RESELLADA EN LA v90, SOLO LA REINA** (la puerta del reenganche para los grupos establecidos,
 * docs/balance.md «v90»). Un grupo que llegó a ir a más de `regroupGapSeconds` del pelotón ya no
 * vuelve a él por la puerta ancha de `rejoinGapSeconds`: tiene que cerrar el hueco hasta
 * `captureGapSeconds`. Movimiento medido antes de resellar:
 *
 * - `llana-180`: las dos huellas, IDÉNTICAS. En llano los cortados no llegan a ser grupos
 *   establecidos.
 * - `reina-canonica-0`: el ganador sigue siendo `gc-2`, 6 s más tarde (15.494 por 15.488), con un
 *   delta mediano de +7,5 s: es el regalo de la puerta que deja de existir. Los extremos (−1.000 y
 *   +946 s) son descolgados cuyo grupo ya no entra gratis en el pelotón y corre otra carrera.
 * - `reina-canonica-1`: gana `gc-3`, 11 s más tarde, mediano +13 s.
 *
 * Se probó también exigir que una escapada esté a menos de `captureGapSeconds` POR LOS DOS LADOS
 * para darla por cazada (un puente que nace detrás del pelotón se cazaba en su mismo bloque). Movía
 * las dos huellas del llano y adelantaba cuatro minutos al ganador de la reina, porque una escapada
 * que va por detrás seguía contando como fuga que perseguir. Queda fuera de la v90 y apuntado como
 * defecto en `docs/balance.md`.
 */
const SEALED_RESULTS: Record<string, string> = {
  'llana-180-0|llana-180|1|v1':
    '1:spr-5:14692,2:spr-4:14692,3:spr-0:14692,4:spr-1:14692,5:spr-2:14692,6:spr-8:14692,7:spr-6:14692,8:spr-3:14692,9:spr-7:14692,10:spr-9:14692,11:pel-130:14692,12:pel-94:14692,13:pel-142:14692,14:pel-133:14692,15:pel-62:14692,16:pel-146:14692,17:pel-67:14692,18:pel-139:14692,19:pel-77:14692,20:pel-39:14692,21:pel-18:14692,22:pel-141:14692,23:pel-96:14692,24:pel-61:14692,25:pel-118:14692,26:pel-143:14692,27:pel-83:14692,28:pel-87:14692,29:pel-42:14692,30:pel-149:14692,31:pel-68:14692,32:pel-116:14692,33:pel-43:14692,34:pel-65:14692,35:pel-90:14692,36:pel-16:14692,37:pel-156:14692,38:pel-117:14692,39:pel-85:14692,40:pel-98:14692,41:pel-40:14692,42:pel-49:14692,43:pel-124:14692,44:pel-14:14692,45:pel-55:14692,46:pel-97:14692,47:pel-105:14692,48:pel-70:14692,49:pel-148:14692,50:pel-76:14692,51:pel-38:14692,52:pel-8:14692,53:pel-107:14692,54:pel-34:14692,55:pel-51:14692,56:pel-88:14692,57:pel-41:14692,58:pel-21:14692,59:pel-32:14692,60:pel-44:14692,61:pel-121:14692,62:pel-66:14692,63:pel-132:14692,64:pel-78:14692,65:pel-131:14692,66:pel-100:14692,67:pel-102:14692,68:pel-13:14692,69:pel-81:14692,70:pel-1:14692,71:pel-50:14692,72:pel-101:14692,73:pel-45:14692,74:pel-84:14692,75:pel-74:14692,76:brk-2:14692,77:pel-31:14692,78:pel-135:14692,79:pel-99:14692,80:pel-7:14692,81:pel-10:14692,82:pel-150:14692,83:pel-120:14692,84:pel-89:14692,85:pel-123:14692,86:pel-37:14692,87:pel-125:14692,88:pel-103:14692,89:pel-159:14692,90:pel-108:14692,91:pel-6:14692,92:pel-72:14692,93:pel-33:14692,94:pel-54:14692,95:pel-86:14692,96:pel-127:14692,97:pel-79:14692,98:pel-73:14692,99:pel-52:14692,100:pel-19:14692,101:pel-35:14692,102:pel-136:14692,103:pel-4:14692,104:pel-22:14692,105:pel-147:14692,106:pel-47:14692,107:pel-30:14692,108:pel-28:14692,109:pel-154:14692,110:pel-91:14692,111:pel-12:14692,112:pel-140:14692,113:pel-113:14692,114:pel-60:14692,115:pel-111:14692,116:pel-137:14692,117:pel-145:14692,118:pel-151:14692,119:pel-59:14692,120:pel-48:14692,121:pel-155:14692,122:pel-56:14692,123:pel-138:14692,124:pel-27:14692,125:pel-17:14692,126:pel-46:14692,127:pel-11:14692,128:pel-69:14692,129:pel-92:14692,130:pel-80:14692,131:pel-58:14692,132:brk-5:14692,133:pel-95:14692,134:pel-93:14692,135:pel-0:14692,136:pel-110:14692,137:pel-75:14692,138:pel-15:14692,139:pel-20:14692,140:pel-109:14692,141:pel-23:14692,142:pel-82:14692,143:pel-64:14692,144:brk-1:14692,145:pel-126:14692,146:pel-144:14692,147:pel-9:14692,148:pel-129:14692,149:pel-104:14692,150:pel-152:14692,151:pel-134:14692,152:pel-2:14692,153:pel-106:14692,154:pel-114:14692,155:pel-158:14692,156:pel-122:14692,157:pel-112:14692,158:pel-36:14692,159:pel-25:14692,160:pel-3:14692,161:pel-128:14692,162:pel-119:14692,163:pel-24:14692,164:pel-53:14692,165:pel-5:14692,166:pel-26:14692,167:pel-115:14692,168:pel-29:14692,169:pel-157:14692,170:brk-3:14692,171:pel-63:14692,172:brk-0:14692,173:brk-4:14692,174:pel-71:14729,175:pel-57:14729,176:pel-153:15224',
  'llana-180-1|llana-180|1|v1':
    '1:spr-0:14605,2:spr-6:14605,3:spr-1:14605,4:spr-2:14605,5:spr-3:14605,6:spr-8:14605,7:spr-7:14605,8:spr-4:14605,9:spr-9:14605,10:spr-5:14605,11:pel-141:14605,12:pel-79:14605,13:pel-19:14605,14:pel-113:14605,15:pel-133:14605,16:pel-21:14605,17:pel-40:14605,18:pel-117:14605,19:pel-54:14605,20:pel-91:14605,21:pel-99:14605,22:pel-122:14605,23:pel-137:14605,24:pel-100:14605,25:pel-58:14605,26:pel-20:14605,27:pel-38:14605,28:pel-145:14605,29:pel-129:14605,30:pel-87:14605,31:pel-56:14605,32:pel-119:14605,33:pel-157:14605,34:pel-83:14605,35:pel-89:14605,36:pel-103:14605,37:pel-36:14605,38:pel-138:14605,39:pel-47:14605,40:pel-33:14605,41:brk-0:14605,42:pel-69:14605,43:pel-118:14605,44:pel-139:14605,45:pel-104:14605,46:pel-63:14605,47:pel-45:14605,48:pel-120:14605,49:pel-90:14605,50:pel-49:14605,51:pel-70:14605,52:pel-80:14605,53:pel-135:14605,54:pel-105:14605,55:pel-12:14605,56:pel-144:14605,57:pel-61:14605,58:pel-150:14605,59:pel-60:14605,60:pel-149:14605,61:pel-16:14605,62:pel-109:14605,63:pel-77:14605,64:pel-106:14605,65:pel-115:14605,66:pel-82:14605,67:pel-22:14605,68:pel-6:14605,69:pel-142:14605,70:pel-30:14605,71:pel-124:14605,72:pel-37:14605,73:pel-121:14605,74:pel-48:14605,75:pel-156:14605,76:pel-62:14605,77:pel-71:14605,78:pel-155:14605,79:pel-94:14605,80:pel-66:14605,81:pel-68:14605,82:pel-2:14605,83:pel-17:14605,84:pel-147:14605,85:pel-126:14605,86:pel-159:14605,87:pel-59:14605,88:pel-53:14605,89:pel-50:14605,90:pel-15:14605,91:pel-43:14605,92:pel-111:14605,93:pel-81:14605,94:pel-18:14605,95:pel-72:14605,96:pel-57:14605,97:pel-96:14605,98:brk-1:14605,99:pel-11:14605,100:brk-5:14605,101:pel-128:14605,102:pel-75:14605,103:pel-88:14605,104:pel-52:14605,105:pel-51:14605,106:pel-5:14605,107:pel-98:14605,108:pel-46:14605,109:pel-42:14605,110:pel-29:14605,111:pel-146:14605,112:pel-95:14605,113:pel-76:14605,114:pel-28:14605,115:pel-110:14605,116:pel-97:14605,117:pel-31:14605,118:pel-92:14605,119:pel-102:14605,120:pel-35:14605,121:pel-34:14605,122:pel-65:14605,123:pel-74:14605,124:pel-85:14605,125:pel-10:14605,126:pel-134:14605,127:pel-158:14605,128:pel-55:14605,129:pel-86:14605,130:pel-26:14605,131:pel-112:14605,132:pel-32:14605,133:pel-13:14605,134:pel-101:14605,135:brk-4:14605,136:pel-123:14605,137:pel-7:14605,138:pel-140:14605,139:pel-24:14605,140:pel-153:14605,141:pel-3:14605,142:pel-0:14605,143:pel-8:14605,144:pel-127:14605,145:pel-93:14605,146:pel-114:14605,147:pel-14:14605,148:pel-44:14605,149:pel-39:14605,150:pel-148:14605,151:pel-41:14605,152:pel-151:14605,153:pel-23:14605,154:pel-25:14605,155:pel-4:14605,156:pel-136:14605,157:pel-130:14605,158:pel-73:14605,159:pel-116:14605,160:pel-67:14605,161:pel-1:14605,162:pel-78:14605,163:pel-154:14605,164:pel-131:14605,165:pel-64:14605,166:pel-84:14605,167:pel-9:14605,168:pel-107:14605,169:brk-2:14605,170:pel-108:14605,171:pel-143:14605,172:brk-3:14605,173:pel-125:14795,174:pel-132:14810,175:pel-27:15247,176:pel-152:15620',
  'reina-canonica-0|reina-canonica|1|v1':
    '1:gc-2:15494,2:gc-3:15518,3:gc-1:15518,4:gc-0:15548,5:bar-1:15548,6:bar-5:15549,7:bar-3:15551,8:pel-154:15556,9:pel-11:15557,10:bar-2:15559,11:pel-129:15560,12:bar-4:15560,13:pel-143:15560,14:pel-9:15562,15:pel-35:15564,16:pel-23:15564,17:pel-94:15564,18:pel-67:15565,19:pel-54:15565,20:pel-107:15565,21:pel-58:15566,22:bar-0:15566,23:pel-8:15567,24:pel-118:15567,25:pel-82:15567,26:pel-119:15568,27:pel-151:15799,28:pel-34:15799,29:pel-33:15799,30:pel-105:15800,31:pel-153:15800,32:pel-83:15800,33:pel-31:15801,34:pel-70:15801,35:pel-47:15801,36:pel-140:15802,37:pel-22:15803,38:pel-142:15803,39:pel-59:15803,40:pel-116:15803,41:pel-155:15805,42:pel-20:15805,43:pel-91:15805,44:pel-106:15806,45:pel-128:15806,46:pel-101:15806,47:pel-7:15807,48:pel-10:15807,49:pel-130:15808,50:pel-139:15808,51:pel-114:15808,52:pel-152:15810,53:pel-56:15810,54:pel-125:15811,55:pel-45:15811,56:pel-93:15811,57:pel-117:15811,58:pel-43:15811,59:pel-81:15812,60:pel-80:15813,61:pel-46:15813,62:pel-29:15814,63:pel-141:15815,64:pel-57:15816,65:pel-21:15817,66:pel-17:15818,67:pel-137:15818,68:pel-64:15818,69:pel-32:15818,70:pel-95:15819,71:pel-79:15819,72:pel-157:15864,73:pel-121:15864,74:pel-84:15864,75:pel-71:15864,76:pel-131:15865,77:pel-40:15875,78:pel-136:15876,79:pel-41:15876,80:pel-134:15877,81:pel-86:15877,82:pel-77:15877,83:pel-61:15878,84:pel-72:15879,85:pel-37:15879,86:pel-55:15879,87:pel-115:15880,88:pel-126:15881,89:pel-103:15881,90:pel-6:15881,91:pel-147:15882,92:pel-26:15882,93:pel-138:15883,94:pel-66:15883,95:pel-158:15883,96:pel-96:15883,97:pel-99:15884,98:pel-161:15884,99:pel-12:15894,100:pel-36:15894,101:pel-123:15895,102:pel-62:15895,103:pel-85:15895,104:pel-24:15895,105:pel-50:15896,106:pel-28:15896,107:pel-25:15896,108:pel-98:15896,109:pel-4:15896,110:pel-73:15896,111:pel-120:15896,112:pel-97:15896,113:pel-78:15897,114:pel-102:15897,115:pel-100:15897,116:pel-5:15897,117:pel-111:15897,118:pel-144:15897,119:pel-109:15897,120:pel-27:15898,121:pel-90:15898,122:pel-1:15898,123:pel-92:15898,124:pel-53:15898,125:pel-160:15898,126:pel-42:15898,127:pel-162:15898,128:pel-18:15899,129:pel-14:15899,130:pel-65:15899,131:pel-149:15899,132:pel-104:15899,133:pel-124:15899,134:pel-146:15899,135:pel-150:15899,136:pel-113:15899,137:pel-148:15899,138:pel-52:15899,139:pel-88:15899,140:pel-69:15900,141:pel-30:15900,142:pel-112:15900,143:pel-44:15900,144:pel-51:15900,145:pel-89:15900,146:pel-16:15901,147:pel-19:15901,148:pel-159:15901,149:pel-127:15903,150:pel-68:15906,151:pel-13:15933,152:pel-49:15933,153:pel-122:15933,154:pel-3:15933,155:pel-48:15933,156:pel-38:15933,157:pel-132:15933,158:pel-2:15933,159:pel-76:15933,160:pel-156:15933,161:pel-60:15933,162:pel-108:15933,163:pel-63:15933,164:pel-110:15933,165:pel-133:15933,166:pel-39:15933,167:pel-74:15933,168:spr-2:15933,169:pel-145:15933,170:pel-135:16097,171:pel-15:16097,172:pel-75:16097,173:pel-0:16097,174:spr-1:16097,175:spr-0:16097,176:pel-87:16816',
  'reina-canonica-1|reina-canonica|1|v1':
    '1:gc-3:15888,2:gc-2:15888,3:gc-0:15888,4:gc-1:15923,5:pel-153:15923,6:bar-0:15982,7:bar-2:15982,8:bar-3:15982,9:bar-5:15982,10:pel-95:15982,11:pel-90:15982,12:pel-4:15982,13:pel-142:15982,14:bar-1:16050,15:bar-4:16050,16:pel-11:16088,17:pel-9:16088,18:pel-31:16088,19:pel-43:16088,20:pel-70:16088,21:pel-55:16088,22:pel-45:16088,23:pel-69:16088,24:pel-131:16088,25:pel-47:16088,26:pel-154:16088,27:pel-107:16088,28:pel-141:16088,29:pel-80:16088,30:pel-28:16088,31:pel-10:16134,32:pel-18:16134,33:pel-79:16134,34:pel-58:16134,35:pel-54:16134,36:pel-155:16134,37:pel-32:16134,38:pel-23:16134,39:pel-30:16134,40:pel-5:16134,41:pel-102:16134,42:pel-118:16134,43:pel-104:16134,44:pel-27:16134,45:pel-92:16134,46:pel-117:16134,47:pel-33:16134,48:pel-71:16134,49:pel-161:16134,50:pel-77:16134,51:pel-81:16134,52:pel-128:16134,53:pel-78:16134,54:pel-129:16134,55:pel-130:16134,56:pel-59:16134,57:pel-22:16134,58:pel-65:16134,59:pel-56:16134,60:pel-67:16134,61:pel-150:16134,62:pel-151:16134,63:pel-149:16134,64:pel-20:16134,65:pel-94:16134,66:pel-116:16134,67:pel-42:16134,68:pel-35:16134,69:pel-119:16134,70:pel-125:16134,71:pel-57:16134,72:pel-21:16134,73:pel-83:16213,74:pel-93:16213,75:pel-120:16216,76:pel-156:16218,77:pel-145:16222,78:pel-111:16222,79:pel-26:16222,80:pel-89:16222,81:pel-3:16223,82:pel-91:16224,83:pel-19:16224,84:pel-6:16224,85:pel-13:16226,86:pel-138:16226,87:pel-34:16226,88:pel-103:16226,89:pel-8:16227,90:pel-12:16227,91:pel-106:16228,92:pel-109:16228,93:pel-113:16228,94:pel-76:16228,95:pel-159:16228,96:pel-135:16229,97:pel-152:16229,98:pel-127:16229,99:pel-99:16230,100:pel-136:16231,101:pel-140:16231,102:pel-44:16231,103:pel-101:16231,104:pel-41:16231,105:pel-143:16231,106:pel-36:16231,107:pel-115:16232,108:pel-40:16232,109:pel-14:16234,110:pel-134:16234,111:pel-121:16234,112:pel-25:16235,113:pel-62:16235,114:pel-50:16236,115:pel-147:16236,116:pel-2:16237,117:pel-87:16237,118:pel-73:16238,119:pel-160:16238,120:pel-123:16238,121:pel-51:16238,122:pel-39:16239,123:pel-15:16240,124:pel-148:16240,125:pel-63:16240,126:pel-38:16241,127:pel-53:16241,128:pel-24:16241,129:pel-133:16242,130:pel-66:16242,131:pel-137:16242,132:pel-74:16242,133:pel-17:16243,134:pel-126:16244,135:pel-162:16244,136:pel-52:16245,137:pel-97:16245,138:pel-114:16245,139:pel-132:16245,140:pel-85:16246,141:pel-88:16246,142:pel-96:16248,143:pel-124:16248,144:pel-7:16249,145:pel-86:16249,146:pel-72:16250,147:pel-110:16250,148:pel-37:16250,149:pel-16:16254,150:pel-82:16254,151:pel-48:16254,152:pel-46:16254,153:pel-68:16254,154:pel-61:16254,155:pel-105:16254,156:pel-64:16254,157:pel-108:16254,158:pel-157:16293,159:pel-112:16293,160:pel-60:16293,161:pel-1:16293,162:pel-84:16293,163:pel-49:16293,164:pel-29:16293,165:pel-158:16293,166:pel-146:16293,167:pel-139:16293,168:pel-98:16293,169:pel-0:16293,170:pel-144:16293,171:pel-100:16293,172:pel-122:16451,173:pel-75:16497,174:spr-0:16497,175:spr-2:16497,176:spr-1:16497',
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

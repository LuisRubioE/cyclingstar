# EPICs y bugs abiertos

Lo que falta por hacer, en las palabras del dueño y con lo que el motor sabe hoy de cada cosa.
Orden de trabajo acordado: **primero los dos bugs**, luego las tres EPICs delegadas, y por encima
de todo eso la lista grande, que es la que de verdad decide qué juego es éste.

---

## Bugs abiertos (NO son EPICs)

### B1 · El adoquín no rompe la carrera

22 carreras del calendario llevan adoquín y seis son WorldTour (Flandes, Roubaix, Strade Bianche,
Harelbeke, A través de Flandes, la clásica de apertura): es una campaña de primavera entera.

El banco pide que el ganador de un final de pavé tenga un PAV mediano por encima de 70 sobre un
campo que va de 45 a 83 —el azar puro daría 64— y mide **69-70**. Y lo que hay medido dice que **el
remate no es el problema**: subir el peso del PAV en la puntuación de remate de 0,50 a 0,80 solo
mueve la mediana de 69 a 70. Con ese abanico de PAV y ese peso, el mejor debería ganar casi
siempre.

Conclusión: **el sector de adoquines desgasta pero no SELECCIONA**. Llegan demasiados juntos a
jugárselo a la rueda, y ahí ya no hay peso de remate que valga. El arreglo va en la selección
dentro del sector, no en la puntuación final.

### B2 · La contrarreloj — CERRADO SIN TOCAR EL MOTOR (v40): no existía

Estaba apuntado como bug porque el propio código lo declaraba: «un defecto ABIERTO del modelo de
crono», con un abanico del 15 % de mediana y del 36 % en la cola, y el corte de tiempo desactivado
en las cronos porque aplicarlo se habría llevado a 150 corredores en la etapa 1.

**Las dos cosas dejaron de ser ciertas hace veinte versiones.** La v19 arregló el abanico y la v20
metió el corte con su constante propia (`timeCutItt` = 0,25), aplicado en `timetrial.ts`. Medido
hoy sobre el banco de cronos reales: **cola mediana 13,8 %** (banda 8-15) y peor crono 14,9 %
(techo 17), con un invariante que además exige que en una crono normal el corte no señale a nadie.

Lo que había era un COMENTARIO CADUCADO, y costó una tarde de perseguir un fantasma. Ya está
corregido en el sitio. La lección va aquí porque se repetirá: un comentario que declara un defecto
que ya no existe es peor que no tener comentario.

---

## EPICs delegadas

### E1 · El viento y los abanicos — HECHO (v41), ver docs/motor.md §19

Se montó sobre lo que ya estaba construido: el modelo de «quién paga el viento» (v34, v38) era
exactamente la pieza que hacía falta. Cuatro piezas nuevas —cuántos CABEN en la fila, el CORTE en
cascada, la CUNETA del que se queda fuera y la COLOCACIÓN— y una puerta: todo lo que el abanico
cambia solo vale desde que el corte ha saltado.

> El dueño: «aunque eso implicará también definir las colocaciones».

Tenía razón, y la colocación entró con ello: quién se queda dentro del corte lo deciden el equipo
que lleva el frente (+25 puntos de perfil), el jefe al que colocan los suyos (+12), las piernas y
±10 de suerte. Antes de la v41 la colocación solo existía como DESORDEN en el remate
(`placementSd`).

**Lo que queda anotado**, y no es poco: el viento es un número de ETAPA —no cambia de dirección ni
de fuerza durante el día— y no hay tramos expuestos en el perfil, así que cualquier kilómetro de
llano puede ser el del corte. La previsión que convertiría la colocación en una DECISIÓN además de
en un atributo vive en E5.

### V1 · VIGILADO: la cola de la reina — la banda está sentada encima de su suelo

Medido en la v42 con cuatro muestras independientes de seis giras y la misma física: **8,07 % de
media con una desviación de 0,39**, contra un suelo de 8. La mitad de las muestras pasan y la mitad
fallan sin que nada cambie, así que el test es una moneda al aire y ninguna de las tres atribuciones
que se le hicieron —viento, lluvia, calor— sobrevive al contraste (el calor, cuatro contra cuatro,
sale a medio sigma).

Decisión pendiente del dueño: o el suelo está una pizca alto para este motor, o el grupeto va una
pizca rápido. Subir la muestra no basta —cuadruplicar las giras baja el ruido a 0,20 y aun así
pasaría por siete centésimas—. Detalle en docs/balance.md «v41 §6».

### E3 · La carrera por etapas como una carrera, no como 21 etapas — EN CURSO

El motor simula etapas; la pregunta es cuánto sabe de la CAMPAÑA. ¿Se corre distinto el día 18 con
40 s de ventaja que el día 3? ¿Hay emboscada, defensa del maillot, bonificaciones, el día en que el
líder se rompe? Hay piezas sueltas (`gcDeficitSeconds`, los motivos de equipo) pero no está medido
si de verdad cambian la carrera según la clasificación y los días que quedan. Primer paso: medirlo.

**Paso 1, hecho: el banco no podía medirlo porque no llevaba general.** `grandTour` y `smallTours`
pasaban `gcDeficitSeconds: 0` a todo el mundo todos los días, y con todos a cero `hasGcContext` sale
false: la capa táctica de general —la cuerda que se acorta ante una fuga peligrosa, el motivo que
distingue al equipo del maillot del que va a tres minutos— no se ejecutaba NUNCA en tres semanas de
banco, mientras en producción se ejecuta cada día. Un banco de gira sin general no mide una gran
vuelta: mide 21 clásicas seguidas. Ya lo lleva, y los 45 invariantes siguen en verde sin mover una
sola banda.

Es la segunda vez en dos versiones que aparece la misma lección (la primera fue el maillot puesto de
lanzador, v42): **lo que el banco no lleva, el banco no puede medir, y el defecto vive ahí para
siempre.**

**Paso 2, hecho: la general no cambia quién gana.** Medido con dos brazos de 24 grandes vueltas —456
etapas cada uno, los dos con la general dentro y en uno la regla de la amenaza neutralizada—: la
cuerda que el pelotón acorta ante una fuga peligrosa deja el reparto EXACTAMENTE igual (10 etapas
ganadas desde la carretera contra 10, 0,0 σ), y tampoco mueve la cola de la reina, la brecha 1.º-10.º
ni los abandonos. O sea que la pieza que lee la clasificación está puesta y no se nota. Detalle en
docs/balance.md «v43 §4».

**Y salió lo grande: la fuga NO gana en montaña.** En 312 etapas de montaña y media montaña de esas
giras, la fuga del día ganó 0 (y 4 en el brazo sin cuerda). En llano gana el 6,9 %, dentro de banda,
así que no es que el motor no deje escapar a nadie: es que en montaña lo que se va nunca llega.

Y el motor YA tiene la banda de eso, en verde: `TARGETS.mountain.breakawayWinPct` exige 25-45 % y la
etapa reina canónica mide 27-30 %. Es el mismo estadístico dígito a dígito (el evento `meta` con
`datos.fuga === 1`), comprobado antes de comparar. O sea que el escenario canónico está en verde y la
carrera que el juego corre da CERO: `realQueens` frente a `grandTour` una vez más.

**Paso 3, hecho: manda EL PERFIL.** `realQueens` separa las tres candidatas de un tiro, porque corre
etapas reina reales con campo fresco y sin general:

| Banco                     | Perfil    | Fatiga | General | Gana la fuga          |
| ------------------------- | --------- | ------ | ------- | --------------------- |
| `reina-150` canónica      | de manual | no     | no      | 27-30 % (banda 25-45) |
| `realQueens` (270 etapas) | REAL      | no     | no      | **3,3 %**             |
| Gran vuelta (168 reinas)  | REAL      | sí     | sí      | **0 %**               |

El salto está entero en la primera fila. Y la etapa que MÁS deja ganar a la fuga (16,7 %) es la de 47
km rodadores hasta meta, así que no es «la cazan en el llano final»: las que dan cero son las de final
en alto, que es justo la forma que el escenario canónico dice que la fuga gana el 27 % de las veces.

Engancha además con algo que el dueño vio en Race Alps —«3 etapas seguidas de montaña y las 3 las gana
el mismo ciclista»—: si la fuga no gana nunca en montaña, gana siempre alguien del grupo de favoritos.
No está demostrado que sea la causa, pero es la primera explicación mecánica de aquel síntoma.

**Paso 4, hecho: es el DESNIVEL, y no lo que parecía.** Tres experimentos controlados, y los dos
primeros descartan las sospechas obvias:

- **No es el relieve repartido.** Mismo final en alto y mismo campo, metiendo cuestas en los 135 km
  previos: 0 % de relieve da 30,8 %, y un 40 % —más que ocho de las nueve reinas reales— aún da
  17,5 %. Ni de lejos el 3,3 %.
- **No es el campo.** El escenario canónico planta a mano 6 cazaetapas combativos; `realQueens`
  genera corredores y les reparte roles. Cruzados 2×2: con el perfil canónico, 35,0 % con el campo de
  a mano y 36,7 % con el generado; con el perfil de `race-france` e20, **0 % con los dos**.
- **Es cuánto puerto tiene la etapa.** Misma forma, mismo campo, mismo largo, variando solo el puerto:

| Puerto final | 15 km   | 25 km   | 35 km   | 50 km   | 70 km   |
| ------------ | ------- | ------- | ------- | ------- | ------- |
| Desnivel     | 1.200 m | 2.000 m | 2.800 m | 4.000 m | 5.600 m |
| Gana la fuga | 26,7 %  | 10,0 %  | 3,3 %   | **0 %** | **0 %** |

**La banda de 25-45 % se cumple con 1.200 metros de desnivel, y una etapa reina de verdad tiene entre
3.000 y 5.000.** `reina-150` no es una etapa reina fácil: es media montaña con la etiqueta cambiada, y
es sobre ella sobre la que el motor lleva cinco versiones certificando que la fuga gana en montaña.

### V2 · DECISIÓN DEL DUEÑO: dónde se mide la fuga en montaña

Mover el objetivo a los perfiles reales (`realQueens` en vez de `reina-150`) es lo correcto por todo
lo que dicen estas docs —se mide lo que el juego corre—, pero **dejaría el motor en ROJO ahí**: 3,3 %
contra un suelo de 25, y volver a banda es una recalibración táctica del tamaño de la v38.

1. **Mover el objetivo y recalibrar.** La carretera dice que la fuga se lleva una parte grande de las
   etapas de montaña, así que el 0 % es un defecto y no una banda mal puesta. Es la opción larga.
2. **Dejarlo donde está y anotar el hueco.** Barato y deshonesto: es el patrón que estas docs llevan
   desde la v17 diciendo que no se hace.
3. **Añadir el objetivo sobre `realQueens` con la banda que hoy se cumple**, y subirla por pasos. Ni
   miente ni bloquea, pero convierte una banda en un termómetro.

Recomiendo la 1. No la he empezado porque mover un suelo de calibración necesita el visto bueno del
dueño. Detalle en docs/balance.md «v43 §6 a §11».

**Y el paso 5 ya dice por dónde iría, con una sorpresa:** la fuga llega al pie del puerto con los
MISMOS once minutos tanto si el puerto mide 15 km como si mide 50, y ninguno de sus hombres se queda
sin depósito. No la cazan: la SUBEN. El pelotón sube ~18 s/km más rápido, así que 35 km de puerto se
comen once minutos enteros. Y bajar la ventana de «esto ya se corre a tope» (`climbRaceKmToGo`) de 30
a 5 km solo duplica las fugas ganadoras (7,5 % → 15 %): el tempo de 0,70 mantenido treinta kilómetros
ya basta.

Eso **contradice al propio motor**: el comentario de `gcControlLeash` dice que esto se arregla
«recalibrando la capa táctica», y la medida dice que no. La capa táctica reparte bien la cuerda en el
llano.

**Paso 6: no son las piernas, es el RITMO.** El dueño autorizó mover el objetivo y recalibrar, así que
antes de tocar perillas se buscó la causa, y cayeron dos candidatas más:

- **La composición no es el techo.** `breakScore` elegía al hombre de fuga con las piernas del LLANO
  incluso en una etapa reina, así que la fuga de montaña salía con la escalada de la mediana del campo
  (en `race-italy` e19, PEOR que la mediana). Es un error real, pero arreglarlo mueve 3,33 % → 4,44 %
  (0,6 σ) y pone en rojo la foto de meta de las carreras pequeñas. Retirado; entra con la
  recalibración entera o no entra.
- **Ni las piernas.** Con una fuga de MON 92 —mejores que el mejor escalador del campo—
  `race-france` e20 sigue en 0 %.

Lo que sí mueve es el RITMO: el pelotón sube el puerto decisivo a 0,85 y la fuga no pasa nunca de la
cooperación con la que nació (0,58-0,72), que en el remate ni sube. Subiéndola a mano, `race-spain` e7
va de 4 % a 40 %.

**El arreglo es un MECANISMO, no un número:** una fuga en el remate se vacía, igual que el pelotón
pasa de 0,55 a 0,85 cuando llega el puerto. Subir `breakawayCommitMin/Max` a secas no vale: esa
cooperación calibra la banda de la fuga en llano (2-8 %) y la rompería. Detalle en docs/balance.md
«v44».

**Paso 6: la respuesta, y no es del motor.** El ritmo de un puerto lo marca la misma regla en los dos
grupos, así que la asimetría está en cuánta velocidad compra un punto de perfil. Leído de la ley (en
subida el exponente es 1,0): una fuga real con P75 65 contra el top 12 % del pelotón con 88 va un
**14,7 % más lenta, o sea 28,8 s/km**. Y ese 14,7 % es REALISTA. Con eso, 40 km de puerto se comen 19
minutos y 70 se comen 34, y una fuga llega al pie con 11. No hay táctica que arregle esa resta.

Y de paso queda desmentida una perilla: `gcControlLeash` dice de sí misma que «calibra el % de fugas
que ganan en montaña» y tiene cinco recalibraciones escritas. Barrida de 700 a 1.800 s: **no mueve
nada**, ni en la canónica ni en las reales. La ventaja de la fuga no la limita el permiso del pelotón
sino lo que la fuga puede construir (llega al pie con 657-684 s contra un tope de 700).

**Paso 7, y CORRIGE todo lo anterior: la fuga gana el 18,1 %, no el 0 %.** La sospecha era que el
generador fabricara montaña más dura que la real. Medido el desnivel de las 157 etapas reina del
calendario: mediana **2.023 m**, máxima 3.965, ninguna por encima de 4.000 — y una reina de gran vuelta
de verdad tiene 3.500-5.000. **El generador hace montaña más blanda, no más dura.**

Y con eso saltó el error de método: yo medía sobre `grandTour` (las 7 reinas de UNA carrera, cuya e20
es la etapa más dura de todo el calendario) y sobre `realQueens` (nueve etapas elegidas a mano por
FORMA, sesgadas a lo duro). Ninguno de los dos es el calendario. Sobre una muestra sistemática de 27
etapas reina × 16 semillas:

| Desnivel      | Etapas | Gana la fuga |
| ------------- | ------ | ------------ |
| < 1.500 m     | 6      | **43,8 %**   |
| 1.500-2.500 m | 16     | 13,7 %       |
| 2.500-3.500 m | 4      | 1,6 %        |
| > 3.500 m     | 1      | 0,0 %        |
| **TOTAL**     | 27     | **18,1 %**   |

Contra la banda de 25-45 sigue por debajo, pero eso es «apretar una calibración», no «el mecanismo
está roto», que es lo que escribí tres veces. La lección: los bancos miden etapas elegidas por FORMA,
no por FRECUENCIA, y yo leí «no gana en las más duras» como «no gana nunca».

**Paso 8, y contesta la pregunta con la que se abrió la EPIC: SÍ se corre distinto el día 18 que el
día 3.** Mismo perfil, mismo campo, misma semilla, cambiando solo la forma de la general (100 semillas
por brazo):

| Etapa                 | Sin general   | Apretada (día 3)        | Abierta (día 18) |
| --------------------- | ------------- | ----------------------- | ---------------- |
| `race-france` e20     | 102,3 ± 8,9 s | **64,3 ± 5,9** (−3,6 σ) | 88,7 ± 8,7       |
| `race-rhone-alpes` e8 | 54,4 ± 3,4    | **16,0 ± 2,5** (−9,0 σ) | 49,4 ± 3,6       |
| `race-italy` e19      | 88,0 ± 3,8    | 87,7 ± 4,2 (0,1 σ)      | 81,3 ± 4,0       |

Con todos dentro del minuto la etapa reina se corre vigilada y los favoritos llegan juntos; con la
general rota, se abre. Y esto MATIZA el paso 2 sin contradecirlo: la general no cambia **quién gana**
(456 etapas, 0,0 σ) pero sí **cuánto se sacan**.

**Lo que NO cambia, y es la deuda que E3 deja nombrada:** al maillot no le pasa nada distinto. Puesta
la general al mejor escalador y medido qué le ocurre a él, todas las diferencias quedan por debajo de
1,4 σ. La general cambia el comportamiento COLECTIVO —el pelotón controla— y no el del individuo que
la lleva: con dos minutos de ventaja el día 18 no rueda más conservador, y con la general apretada su
equipo no lo arropa más. **La defensa del maillot no existe como conducta propia.**

**Y lo que E3 aún no ha tocado**: la emboscada y el día en que el líder se rompe.

### E5 · El clima — HECHO (v42 y v44), ver docs/motor.md §20

Entró entero: la lluvia (que multiplica las caídas, parte el adoquín mojado y suelta ruedas en el
descenso), el calor (que no selecciona: desgasta, por el coste y no por el esfuerzo) y la previsión.

Y con la corrección que el dueño metió al delegarlo —«ojo, el clima debería depender del país y del
GD»—, que resultó ser lo que hacía al EPIC valer para algo: sin ella llovía igual en Flandes en marzo
que en Almería en agosto, o sea justo lo contrario de la variedad que el encargo pedía. El dato ya
existía en el calendario (país y día del año) y solo faltaba que llegara al motor.

> El dueño: «estaría bien también que pueda existir para los ciclistas y managers una previsión del
> clima… que además puede cambiar, y con eso tomar diferentes decisiones».

`weatherForecast` cumple las tres cosas que esa frase pide: el parte cambia según se acerca el día,
el tiempo real no cambia porque alguien lo mire, y consultarlo dos veces da lo mismo. Lo hace
DESENFOCANDO la verdad hacia la climatología del sitio en vez de añadirle ruido, que es de donde sale
el error de un parte de verdad.

**Y YA SE LEE (v44).** El dueño eligió dónde: la previsión sale por `/api/my-orders` y se pinta en la
pantalla de ÓRDENES DE CARRERA, que es donde se reparten los roles antes de que la etapa se corra. Con
eso el EPIC está completo: el clima ya no es un modificador que le pasa al jugador, es información con
la que decide.

El parte se calcula con la misma semilla y el mismo sitio con los que se va a correr la etapa, y el
sitio vive en una función única (`stagePlace`) que usan los dos lados para que no puedan separarse.
Va con su fiabilidad y atenuado cuando es baja, porque a siete días lo que se anuncia es casi «lo
normal aquí en esta época».

---

## La lista grande

Éstas son las que el dueño llama «cosas aún más EPIC y que faltan y que son importantes». Muchas se
descomponen en varias, y la lista no está cerrada.

### G1 · Entrenamientos

> «No estoy muy convencido de que funcione bien. Quiero una revisión muy detallada de esto.»

Lo que tiene que cumplir a la vez:

- Que **no** acaben todos siendo Pogačar con todo a 5 estrellas.
- Que **tampoco** se quede nadie sin pasar de 4 en nada.
- Que se pueda **balancear** entrenamiento y carreras.
- Que **las carreras entrenen**, y a su modo: «de una carrera puedes aprender más que de un
  entrenamiento, e incluso variará según el nivel de la carrera».

Ese último punto es el que hoy seguro que no está: correr desgasta y da forma (CTL/ATL), pero no
enseña más por ser una carrera dura que por ser un entrenamiento.

**Cómo se mide: ya se puede.** El **banco de mundo** existe y se corre con `pnpm sim:mundo
[temporadas] [corridas]`; en CI vigila con límites anchos (`sim/world.test.ts`, ~12 s). Es el
Montecarlo de etapas llevado a las temporadas: 442 corredores, 364 días al año, con su relevo
generacional —se retiran los viejos, entran neoprofesionales— y una foto de la población al final
de cada temporada. Sin él esta EPIC se hacía a ciegas.

**Las tres primeras preguntas salen bien** (2 mundos × 25 temporadas):

| temporada | cracks (3+ atr. de 5★) | sin nada sobre 4★ | media | ancho p90−p10 | congelados |
| --------: | ---------------------: | ----------------: | ----: | ------------: | ---------: |
|         1 |                  0,1 % |            24,5 % |  54,8 |          21,3 |     79,6 % |
|         5 |                  1,8 % |            19,9 % |  55,7 |          22,7 |     52,0 % |
|        10 |                  4,2 % |            10,0 % |  58,7 |          22,1 |     11,3 % |
|        15 |                  7,0 % |             3,7 % |  60,9 |          20,5 |      0,0 % |
|        25 |                  5,2 % |             4,1 % |  60,2 |          20,2 |      0,0 % |

O sea: **no** acaban todos siendo Pogačar (los cracks hacen techo en el 7 % y luego bajan), **no** se
queda el pelotón en medianía (del 24 % al 4 %), y las diferencias **no se aplanan** (el ancho se
queda en 20-23 puntos las veinticinco temporadas). El miedo del dueño, medido, no se cumple.

**Pero hay un hallazgo, y no está en la fórmula de entrenamiento sino en quién nace pudiendo
mejorar.** `generateNpcRider` da techo por encima del atributo SOLO a los de 23 años o menos
(`NPC.youngAge`); a partir de los 24 el techo **es** el atributo. Y como `kDim` vale 0 en cuanto el
atributo alcanza el techo, para ésos entrenar rinde exactamente **cero**: el mismo corredor a los 26
que a los 30, salvo el declive de la edad. Medido sobre 4.000 NPCs sueltos:

| edad  | margen medio de mejora | sin ningún margen |
| ----- | ---------------------: | ----------------: |
| 19-23 |            17,0 puntos |               0 % |
| 24-37 |             0,0 puntos |             100 % |

Un escalón seco en el 23/24, y **el 90 % de los NPCs generados cae del lado malo**. En un mundo
recién creado eso son cuatro de cada cinco corredores del pelotón que no pueden mejorar nunca; el
mundo se descongela solo hacia la temporada 15, cuando ya se han retirado todos ellos, pero la
partida de verdad se juega antes de eso.

Es deliberado —el comentario de `npc.ts` dice que «el NPC ya está formado según su división»— y
tiene una consecuencia que hay que decidir a la vista de esto: hoy **no hay carreras deportivas** en
el mundo. Ningún NPC de 25 años da un salto, ninguno se estanca, ninguno se descubre tarde. Está
pendiente de decisión del dueño.

**Y sigue faltando la cuarta pata:** que las carreras enseñen. Correr desgasta y da forma (CTL/ATL),
pero no enseña más por ser una carrera dura que por ser un entrenamiento. Nótese que las dos cosas
se cruzan: una carrera solo puede enseñar a quien tenga margen, o sea que hoy, a nueve de cada diez.

De paso el banco vigila G3, G4, G8, G9 y G10, que también son cosas que solo se rompen con el tiempo.

### G2 · Gestión humana de un equipo

> «Esto va a ser BRUTAL. Tiene a su vez MUCHÍSIMOS componentes.»

**El modelo, que condiciona todo lo demás.** Todo jugador es un CICLISTA. Unos pocos —que paguen, o
que elija el dueño— son ADEMÁS mánager de su equipo, y ahí entran todas las decisiones de equipo.
No es un juego de mánager con corredores de adorno ni un juego de corredor con el equipo de fondo:
es un pelotón de personas donde unas pocas mandan.

De ahí salen cuatro consecuencias que hay que resolver ANTES de repartir el trabajo en componentes:

- **El mánager es juez y parte, y eso es lo mejor que tiene.** Decide quién lleva el Giro y él es
  candidato. Es el mejor conflicto que puede ofrecer este diseño… y también la forma más rápida de
  vaciar un equipo: si el mánager se nombra jefe de filas siempre, los humanos de su equipo se van.
  Hace falta que abusar SALGA CARO por dentro del juego (moral, salidas, reputación), no por una
  regla que lo prohíba.
- **Hay asimetría de poder entre jugadores.** Un humano decide el calendario, el rol y el contrato
  de otro humano. Para que eso sea jugable y no tóxico hacen falta tres cosas: TRANSPARENCIA (que se
  vea lo que se prometió), VOZ (los canales de G7 dejan de ser adorno y pasan a ser la mecánica por
  la que se negocia) y SALIDA (el mercado como recurso real del que no está a gusto).
- **Pagar da AUTORIDAD, no vatios.** Si el rol de mánager viniera con ventaja deportiva sería pagar
  por ganar. Lo que compra es mando y trabajo: decidir, negociar, repartir. El corredor-mánager
  corre exactamente igual de rápido que cualquiera.
- **La mayoría de los equipos NO tendrán mánager humano.** O sea que el mánager bot tiene que tomar
  todas estas decisiones de forma creíble por defecto, y un humano tiene que poder heredar un
  equipo ya en marcha sin que se note el cambio de manos.

Y una consecuencia práctica: **un mánager no puede tener un segundo trabajo.** Si son pocos y cada
decisión es manual, se queman. La solución es la misma que N1 propone para la carrera —POLÍTICAS en
vez de órdenes—, aplicada en dos niveles: el mánager fija el plan del equipo y cada corredor escribe
el suyo dentro de ese marco.

Desglose por componentes, cada uno entregable por separado. Los marcados con **[hay pieza]** tienen ya algo en el motor sobre lo que
apoyarse.

#### La plantilla

- **G2.1 · Jerarquía y liderazgos.** Quién es jefe de filas de qué carrera, quién va protegido y
  quién trabaja. El conflicto de dos gallos en un corral es de las mejores historias que da este
  deporte, y hoy no puede ocurrir. **[hay pieza]**: el motor ya reparte roles y protege líderes
  (`domestiquesFor`, `relayProtectedPenalty`).
- **G2.2 · Convocatorias y carga de trabajo.** A quién llevas a cada carrera. Un corredor que corre
  poco se pudre y uno que corre demasiado llega roto a lo importante; los dos tienen que quejarse.
- **G2.3 · Promesas y expectativas.** Decirle a alguien que llevará el Giro. Cumplirlo o no. Sin
  esto la moral es un número que sube y baja solo; con esto es una relación.
- **G2.4 · Disciplina y conducta.** Ataques por libre, órdenes desobedecidas, sanciones, dejar a
  alguien fuera. **[hay pieza]**: el motor YA tiene rebeldes —el que sale por su cuenta queda fuera
  del plan de equipo y la crónica lo cuenta— y no hay nada que reaccione a eso.

#### El dinero

- **G2.5 · Contratos.** Duración, salario, primas por victoria y por puntos, cláusulas, opciones,
  ventanas de fichajes. **[hay pieza]**: existen `contracts.ts` y la pantalla de mercado.
- **G2.6 · Premios en metálico.** El premio por ganar carreras, etapas y clasificaciones. Va al
  EQUIPO, y por costumbre del oficio el bote se reparte con toda la estructura —corredores,
  mecánicos y masajistas—, con la parte de cada uno dependiendo del contrato. Es dinero y es
  vestuario a la vez: repartir mal un bote es un conflicto.
- **G2.7 · Patrocinio y presupuesto.** Patrocinadores con objetivos, ingresos por resultados y por
  visibilidad, y lo que cuesta la temporada. **[hay pieza]**: `economy.ts`, con viajes, vivienda y
  material ya modelados.
- **G2.8 · Publicidad, fama e imagen.** Cómo funciona de verdad: el equipo vende la camiseta y el
  material con EXCLUSIVIDAD POR CATEGORÍA, y el corredor puede firmar por su cuenta en las
  categorías que no pise el equipo (reloj, coche, ropa de calle, medios). Los derechos de imagen se
  reparten. Y un corredor famoso cobra aparte por criteriums y galas.

  La mecánica que sale de ahí es mejor que un modificador: la FAMA genera ofertas, cada oferta
  puede CHOCAR con lo que el equipo ya tiene vendido, y una estrella es a la vez lo que te trae
  patrocinio y lo que te complica el vestuario —quiere sus contratos, sus días y su libertad—.

#### La estructura

- **G2.9 · Cuerpo técnico.** Directores, entrenadores, médicos, mecánicos, masajistas. Su nivel
  tiene que notarse en algo real: en cómo entrena la plantilla, en cómo se recupera, en las
  decisiones de carrera y en las averías.
- **G2.10 · Salud.** Lesiones con DURACIÓN, no abandonos de un día; enfermedad, recuperación,
  vueltas a la competición. Es lo que obliga a rehacer un calendario y a ascender a un suplente.

#### Las personas

- **G2.11 · Moral y satisfacción.** Qué le importa a cada uno: correr, ganar, ir protegido, cobrar,
  que le cumplan lo prometido. **[hay pieza]**: el corredor ya tiene `morale` y entra en su nivel
  efectivo, pero nada la mueve por motivos humanos.
- **G2.12 · Relaciones entre corredores.** Amistades, rivalidades, grupitos, la autoridad del
  veterano. Es lo que convierte una plantilla en un vestuario.
- **G2.13 · Comunicación.** Los canales que el dueño pide en G7: reuniones, charlas de uno a uno,
  prensa. Es el interfaz por el que se juega todo lo anterior.
- **G2.14 · La silla del mánager.** Que el mánager también responda ante alguien: objetivos del
  patrocinador, paciencia limitada, consecuencias. Y las dos caras del rol: cómo se ACCEDE a él
  (pago o designación), cómo se hereda un equipo de bots, y qué pasa cuando alguien lo deja.
- **G2.15 · Ser mandado.** El componente que solo existe porque el jugador es un ciclista: cómo se
  vive desde ABAJO. Que te pongan de gregario cuando querías tu oportunidad, que te dejen fuera del
  Tour, que te prometan algo y no se cumpla. Tiene que doler y tiene que poder responderse —hablar,
  negarse, rendir menos, irse—, porque si no, el jugador que no es mánager es un espectador de su
  propia carrera deportiva.

### G3 · Rankings a 365 días rodantes — **HECHO (v48)**

> «El ranking debería sumar los puntos en los últimos 365 días: si llegamos al GD 25, hay que sumar
> los que consigan ese día y restar los que consiguieron el GD 25 del año anterior.»

Es exactamente como funciona el ranking real, y hasta la v48 **no era así**: el ranking sumaba
`season_points`, un contador que se incrementa por temporada y que el rollover pone a cero. O sea
que el 1 de enero del juego el ranking entero valía cero y el que acababa de ganar el Tour aparecía
por detrás de cualquiera que puntuase en una .2 en enero. No había puntos fechados, así que no había
nada que restar: era un cambio de ESQUEMA, no de fórmula.

**Cerrado.** Cada puntuación se guarda ahora con su día, su edición de carrera y de qué fue
(`rider_points`, migración `0031`), y `getRanking` suma la ventana `(hoy − 364, hoy]`. El ejemplo del
dueño fija el borde exacto y así está sellado en `ranking365.test.ts`: lo del **mismo** GD del año
pasado ya está FUERA, y el día siguiente es el primero que entra.

Los dos contadores conviven a propósito y no son redundantes: `season_points` sigue siendo el de la
TEMPORADA —es lo que quieren los premios del año y el maillot blanco, que se reinician de verdad— y
`rider_points` no se borra nunca, porque la ventana rodante necesita ver el año anterior. La
migración siembra lo que cada uno lleva acumulado como una puntuación fechada hoy, de modo que
**nadie pierde su puesto el día del despliegue** y esa fila cae sola de la ventana dentro de un año,
que es justo lo que le pasaría a los puntos que representa.

### G4 · Promociones y descensos de equipos entre categorías

Sin esto las categorías son una etiqueta fija y no hay consecuencia deportiva para un equipo que va
mal o bien durante una temporada.

### G5 · Perfiles: quedan demasiadas carreras falsas

> «Hay que arreglar eso.»

Relacionado con lo de abajo: hoy una carrera del calendario o tiene rasgos reales autorizados
(puertos y sectores de verdad) o se la inventa el generador.

### G6 · El generador de recorridos

> «Para las que no se puedan nunca reproducir, el generador es una basura. Hay que arreglarlo, está
> pésimo.»

Confirmado con un caso concreto (v40): el generador le daba a una carrera de un día de montaña el
perfil de una **etapa reina de gran vuelta** —final en alto de catorce kilómetros—, algo que no
existe en el calendario real, y eso dejaba al 82 % del pelotón con el tanque a cero. Se arregló ese
caso, pero el generador entero está sin revisar y produce recorridos que nadie ha mirado.

### G7 · Elementos sociales dentro de un equipo (o fuera)

> «Canales de comunicación entre ciclistas.»

### G8 · Limpieza progresiva de bots

> «Según vayan llegando jugadores humanos, habría que ir limpiando bots poco a poco, siempre de los
> que tengan 0 puntos en el ranking.»

### G9 · Los bots, peores que los humanos

> «Cuando tengamos muchos humanos habría que hacer que sean peores que los humanos.»

### G11 · CORREO: sin él la cuenta de un jugador no es suya

> El dueño: «emails!!! para poder registrarse y eso… estaba pensando usar mi dominio rubio.pt o mi
> dominio hereistand.app que uso en mi otro proyecto (le puedo crear un email llamado
> cyclingstar@hereistand.app), y así usarlo en Resend».

**Lo que hay hoy, y es un agujero de verdad.** `better-auth` corre con email + contraseña y **sin
enviar un solo correo**: `apps/api/src/auth.ts` deja `sendChangeEmailVerification` como no-op con el
comentario «sin envío de emails». De ahí cuelgan tres cosas:

1. **Nadie verifica que el correo sea suyo.** Cualquiera se registra con el correo de otro.
2. **Una contraseña perdida es una cuenta perdida.** No hay recuperación posible.
3. **El cambio de correo desde ajustes se aplica a pelo**, sin confirmar el nuevo ni avisar al viejo,
   que es el camino clásico para secuestrar una cuenta.

Para un juego con temporadas de meses, perder la cuenta es perder el corredor. Esto es infraestructura
y no una mejora.

**Lo que hay que decidir primero: EL DOMINIO**, porque es lo único que no se arregla retroactivamente.
La reputación de envío es del DOMINIO: los correos que un jugador marque como spam cuentan contra
todo lo que salga de ahí. Recomendación, en orden:

1. **El dominio propio del juego** (`mail.cyclingstar.xxx` para lo transaccional). Diez o quince euros
   al año, y desata el juego de todo lo demás. **Para la versión final**, dicho por el dueño.
2. **`rubio.pt` con subdominio dedicado** — verificar `cyclingstar.rubio.pt` en Resend y enviar desde
   `no-reply@cyclingstar.rubio.pt`. **Ésta es la de AHORA**: el dueño no quiere comprar dominio en
   fase de pruebas, y aquí el subdominio sí importa porque `rubio.pt` lleva su correo personal
   detrás. Enseña al jugador un dominio que no es el del juego, y eso se acepta a cambio de no gastar
   todavía.
3. **`cyclingstar@hereistand.app` es la peor**: ata la entregabilidad de los dos proyectos —un pico de
   quejas en el juego daña el correo del otro, y no se desata después— y encima el remitente no se
   parece al producto, lo que sube por sí solo las marcas de spam.

**LO DEL SUBDOMINIO, con el matiz que le faltaba.** La primera versión de esta nota decía «nunca
enviar desde el dominio raíz» como regla universal, y el dueño la discutió con razón: «si el dominio
fuera propio, ¿por qué no habría de enviar desde la raíz? ahí no está el correo que yo leo». Cierto —
ese argumento vale para `rubio.pt` y no para un dominio dedicado al juego. Lo que sí sigue valiendo:

- **Separar el correo TRANSACCIONAL del de NOTIFICACIÓN**, y ésta es la razón de verdad. «Verifica tu
  cuenta» y «recupera tu contraseña» los abre todo el mundo y casi nadie los marca como spam; «tu
  corredor corrió hoy» lo marcará quien se cansó del juego y no encuentre la baja. Con los dos en el
  mismo dominio, esas quejas degradan la entrega de la RECUPERACIÓN DE CONTRASEÑA, que es el correo
  que menos se puede permitir caer en spam. Lo estándar es un subdominio para cada flujo.
- **Dejar la raíz libre para un buzón de verdad** (`hola@`, `soporte@`) el día que haga falta.

Así que: con `rubio.pt` el subdominio es importante porque ahí sí hay correo personal detrás; con un
dominio dedicado al juego y solo correo transaccional de poco volumen, la raíz vale. La regla no es
dogma, es que en cuanto entren las notificaciones se querrá haberlo separado antes.

**Y LO QUE ES REVERSIBLE Y LO QUE NO**, que es lo que de verdad decide esto: cambiar de remitente más
adelante NO cuesta nada —se verifica el dominio nuevo en Resend y se cambia el `from`; no hay lista
que migrar—. Lo irreversible es la reputación que se le pega a un dominio compartido. Por eso
`hereistand.app` se descarta y las otras dos opciones son ambas reversibles.

**Y lo que hace falta técnicamente**, para que no aparezca a mitad de camino: DKIM y SPF en el
dominio de envío, el return-path del subdominio, DMARC empezando en `p=none`, y una baja real en el
correo de notificación. Nada de eso es opcional si se quiere que el correo llegue.

### G10 · Retiradas por edad — **HECHO (v47-v48)**

> «Un sistema para que los ciclistas (humanos o bots) se jubilen al llegar a cierta edad.»

Sin esto la población envejece para siempre y no entra sangre nueva: se lleva por delante a los
rankings, al mercado y a la cantera.

**Cerrado.** El NPC ya se jubilaba; lo que faltaba era el HUMANO, y el bloque de retiros del rollover
filtraba por `isNull(riders.userId)`, así que un corredor de jugador no se retiraba nunca (v47,
`rolloverRetire.test.ts`). Ahora se jubila a la edad dura, se le quita el equipo y deja de ser «tu
ciclista» para que el jugador pueda crearse otro.

Y con él entra el otro extremo de la vida deportiva, que el dueño pidió aparte: **se empieza a los 18
siendo un don nadie** (v48). Antes un jugador recién creado entraba con 46/38/30 y era 28.º de 127 en
un nacional sub-23; ahora entra por debajo del suelo del pelotón profesional y el contrato se gana:

| edad | `rating` | qué pasa                                                                 |
| ---- | -------: | ------------------------------------------------------------------------ |
| 18   |     0,21 | nadie le ficha (`MIN_RATING_FOR_OFFERS` = 0,42), corre como agente libre |
| 19   |     0,43 | cruza el listón: primeras ofertas continentales                          |
| 20   |     0,50 | continental de verdad                                                    |
| 21   |     0,53 | continental mediano (0,54)                                               |

El «casi a cero» no se toma literal, y lo dice el motor: al nivel 5, **siete de cada diez carreras se
terminan fuera de control**. Con el genoma nuevo acaba 10 de 10, último y a ocho minutos y medio —un
don nadie, pero un ciclista—. Los techos NO bajan: lo que se recorta es lo que tienes, no lo que
puedes llegar a ser.

**Queda anotado lo que esto destapó y NO se ha tocado: los NPC no tienen juventud.** `generateNpcRider`
usa la edad solo para el TECHO, no para los atributos, así que un continental de 18 años es idéntico
a uno de 30 (MON 60,0 medido en los dos). El mundo no tiene júniors: todos nacen ya hechos. Es la otra
mitad de este épico y se conecta con N2 (el bot que se retira lo reemplaza un bot júnior).

---

## Propuestas para incorporar

Salidas de mirar el código, no de imaginar. Cada una dice qué se comprobó.

### N1 · El plan como PROGRAMA: órdenes condicionales

Primero lo planteé como decidir durante la carrera, estilo radio, y el dueño lo tumbó con la razón
correcta: **es incompatible con avanzar un día cada seis horas**. En un mundo persistente el
jugador no puede estar delante cuando su corredor ataca, así que la decisión tiene que viajar
DENTRO del plan.

> El dueño: «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más
> escenarios hipotéticos quizás».

O sea que la orden deja de ser un ajuste fijo —«eres gregario», «disputa el sprint»— y pasa a ser un
plan con supuestos: _si a 60 km la fuga pasa de dos minutos, tira; si mi jefe se descuelga en el
primer puerto, espérale; si llegamos más de veinte a meta, no lances, guárdate; si llueve en el
adoquín, colócate delante desde el km 40_. El jugador no está en la carrera, pero sí está en todas
las carreras que podrían pasar.

Y encaja con lo que ya hay: la crónica y la radio (`raceRadio.ts`) dejan de ser solo lectura y pasan
a ser el INFORME con el que se corrige el plan de la próxima —«esto se decidió aquí y tú habías
dicho esto otro»—. La partida se juega escribiendo planes mejores, que es lo que de verdad hace un
director deportivo.

### N2 · El relevo generacional (NO una cantera)

Lo propuse como academia de juveniles y ojeadores, y estaba mal planteado porque yo tenía mal el
modelo del juego: **aquí el jugador ES un ciclista**, no un mánager que ficha promesas.

> El dueño: «los nuevos son los nuevos humanos que se registren… y cuando un jugador humano se
> jubile lo lógico es que empiece uno nuevo (se le podría incluso sugerir). No quiero una academia
> junior de bots».

Así que el relevo tiene dos caminos y ninguno es una cantera:

- **El humano que se retira vuelve a empezar.** Es el momento más delicado de la vida del jugador
  —se le acaba el personaje al que le ha dedicado temporadas—, así que la retirada no puede ser una
  puerta de salida: tiene que ser una puerta a la siguiente carrera deportiva, sugerida por el
  juego y con lo ganado reconocido en algún sitio que permanezca (palmarés, salón de la fama).
- **El bot que se retira lo reemplaza un bot júnior, y ya.** Sin ojeo, sin desarrollo, sin
  ceremonia: es relleno del mundo y solo tiene que mantener el pelotón lleno mientras no haya
  humanos suficientes. Se conecta directo con G8 (limpiar bots según llegan humanos) y G9 (que los
  bots sean peores).

Lo que sí queda en pie de la idea original es la CURVA DE UNA CARRERA DEPORTIVA: que un corredor
joven mejore, madure y decaiga, y que eso se note. Eso vale igual para humanos y para bots, y es
condición de G1 (entrenamientos) y de G10 (retiradas).

### N3 · Lesiones con calendario — ACEPTADA

Ver G2.10. Se saca aquí también porque no es solo del vestuario: sin duración no hay consecuencia,
y sin consecuencia arriesgar al líder en un adoquín con lluvia no es una decisión. Y con el jugador
siendo un ciclista pesa todavía más: una lesión larga es tiempo de tu vida en el juego, no una
casilla de la plantilla.

### N4 · El corredor como alguien, no como diez números

Dos corredores con los mismos atributos son hoy el mismo corredor. Faltan preferencias e
idiosincrasia: éste vuela con frío y se apaga con calor, aquél adora el adoquín, aquel otro solo
rinde de líder. Alimenta al clima (E5), al adoquín (B1) y al vestuario (G2).

> El dueño: «¿eso en mi ciclista sería una elección o algo aleatorio? ¿Y dónde vendría?»

**Las dos cosas, y ahí está la gracia.** La propuesta:

- **Al crear el corredor, se ELIGE** (en `CreateRider`). Es tu identidad y decidirla es parte de
  empezar una carrera deportiva: nadie quiere que le sorteen quién es.
- **Pero con contrapartida, nunca como ventaja pura.** Si «me va bien el frío» solo suma, todo el
  mundo elige lo mismo y a los dos meses el pelotón entero es idéntico otra vez, que es justo el
  problema que se quería resolver. Cada rasgo tiene su cruz: vuelas con frío **y** te apagas con
  calor; adoras el adoquín **y** sufres en la alta montaña; rindes de jefe **y** te hundes de
  gregario. Así es una identidad y no una casilla que optimizar.
- **Y una parte SE DESCUBRE corriendo.** Rasgos que emergen de lo que de verdad has hecho: mil
  kilómetros de adoquín acaban notándose. Eso premia jugar en vez de rellenar un formulario, y hace
  que dos corredores que eligieron lo mismo terminen distintos.
- **Los bots, aleatorio.** Es lo que mantiene el pelotón variado sin que nadie lo diseñe.

El sitio natural es el mismo donde ya vive el nivel efectivo del corredor: entra en `eff0` por
terreno y por condiciones, igual que hoy entran la moral y la forma.

### N5 y N6 · RETIRADAS

**N5 (el banco de diez temporadas) no era una EPIC**: es la forma de MEDIR G1, y como tal se ha
movido dentro de G1, que es donde tiene sentido. El dueño: «esto es más bien la forma de medir G1,
no es un epic en sí mismo». Exacto.

**N6 vuelve, pero por otro motivo del que yo daba.** Lo retiré porque razoné mal —ver abajo— y
resulta que hay un problema de velocidad real, solo que no viene de los jugadores sino del MOTOR:
medido sobre cinco etapas de Flandes, **14,0 s en la v38, 19,3 s a mitad de la v39 y 20,7 s en la
v40**, un 48 % más de trabajo en dos versiones. Es el precio de la cooperación revisada, la física
del ataque, el régimen de remate y el submotor del lanzamiento —todo ganado a pulso—, pero la
tendencia importa: un juego que avanza un día cada seis horas simula un calendario entero cada vez,
y el primer síntoma ya apareció (el banco de coherencia se pasó de su tope de cinco minutos). No es
urgente; sí es algo que hay que vigilar en vez de descubrir tarde.

**El razonamiento con el que lo propuse SÍ estaba mal y se retira.** Yo di por hecho que más
jugadores significan más simulación, y no: **las carreras son fijas y no van a aumentar**. Un día de
juego cuesta lo mismo con cien jugadores que con diez mil, porque lo que se simula son las carreras
del calendario con su campo, no los jugadores. Lo que crece con los jugadores es la COMPETENCIA por
entrar —los equipos tendrán que ser más selectivos o rotar mejor a quién llevan—, que es una
mecánica de juego (y bastante buena), no un problema de escala.

---

## Orden acordado

1. ~~**B1** (el adoquín) y **B2** (la crono)~~ — HECHOS en la v40. B1 arreglado
   (`dropPavesFactor`); B2 no existía: era un comentario caducado.
2. ~~**E1** (el viento y los abanicos)~~ — HECHA en la v41. ~~**E5** (el clima)~~ — HECHA en el motor
   en la v42; le falta salir por la API y pintarse en alguna pantalla, que es lo que la convierte en
   mecánica de juego. **E3** (la campaña), EN CURSO: el paso 1 era poder medirla y ya se puede.
3. La lista grande, empezando por donde el dueño diga. **G1 (entrenamientos)** y ~~**G3
   (rankings)**~~ eran las dos que podían estar mintiendo en producción; G3 está HECHA en la v48, así
   que la candidata natural que queda de ese par es G1.

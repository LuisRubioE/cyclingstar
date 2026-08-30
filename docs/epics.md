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

**Lo siguiente**: qué tiene un perfil real que no tiene el canónico (la sospecha es el relieve
repartido, que mantiene al pelotón `onClimb` mucho más rato y a 0,70 en vez de 0,55 — pero eso es leer
el código, no medirlo). Y luego las otras preguntas que E3 abrió y que estos pasos no tocan: la
emboscada, el día en que el líder se rompe, y si el día 18 se corre distinto del día 3.

### E5 · El clima — HECHO EN EL MOTOR (v42), ver docs/motor.md §20. Falta enseñarlo

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

**LO QUE FALTA, y sin ello el EPIC no es todavía mecánica de juego:** la previsión no sale por la API
ni se pinta en ninguna pantalla. Existe en el motor y no puede decidir nadie con ella. Pendiente de
que el dueño diga DÓNDE se lee —la ficha de etapa, el calendario, o la pantalla en la que el manager
hace la convocatoria—, porque de eso depende qué decisión llega a cambiar.

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

**Cómo se mide (era la propuesta N5).** La preocupación —«que no acaben todos con cinco estrellas»—
hoy solo se puede responder con una opinión. Hace falta un **banco de mundo**: simular diez
temporadas seguidas y mirar qué le pasa a la población. ¿Converge todo el pelotón al máximo?
¿Se queda todo el mundo clavado en cuatro? ¿Se aplanan las diferencias entre el mejor y la media?
Es el Montecarlo de etapas llevado a las temporadas, y sin él esta EPIC se hace a ciegas. De paso
vigila G3, G4, G8, G9 y G10, que también son cosas que solo se rompen con el tiempo.

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

### G3 · Rankings a 365 días rodantes

> «El ranking debería sumar los puntos en los últimos 365 días: si llegamos al GD 25, hay que sumar
> los que consigan ese día y restar los que consiguieron el GD 25 del año anterior.»

Es exactamente como funciona el ranking real. **Comprobado: hoy NO es así.** El ranking es
`season_points`, un contador que se incrementa por temporada (`update riders set season_points =
season_points + pts`, en `packages/db/src/ranking.ts`). No hay puntos fechados por resultado, así
que no se puede restar lo del mismo día del año anterior. Es un cambio de ESQUEMA, no de fórmula:
hay que guardar cada puntuación con su fecha. La clasificación de jóvenes (maillot blanco) sí
existe.

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

### G10 · Retiradas por edad

> «Un sistema para que los ciclistas (humanos o bots) se jubilen al llegar a cierta edad.»

Sin esto la población envejece para siempre y no entra sangre nueva: se lleva por delante a los
rankings, al mercado y a la cantera.

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
3. La lista grande, empezando por donde el dueño diga. **G1 (entrenamientos)** y **G3 (rankings)**
   son las dos que hoy pueden estar mintiendo en producción, así que son las candidatas naturales.

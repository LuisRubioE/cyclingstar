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

### B2 · La contrarreloj reparte un abanico imposible

Defecto declarado en el propio código (`stage/simulate.ts`, sobre el corte de tiempo): en una crono
de 20 km el motor reparte un abanico del **15 % de mediana y del 36 % en la cola**. Es tanto que el
corte de tiempo del reglamento está DESACTIVADO en las cronos, porque aplicarlo se llevaría por
delante a 150 corredores en la primera etapa.

Es la única disciplina que el motor no sabe resolver, y las cronos deciden grandes vueltas:
mientras siga así, cualquier general que salga del juego está sesgada.

---

## EPICs delegadas

### E1 · El viento y los abanicos

**No existe nada.** El rebufo depende solo del terreno; no hay dirección de viento, ni viento
lateral, ni corte de abanico en ninguna parte del motor.

Encaja sobre lo que ya está construido: el modelo de «quién paga el viento» (v34, v38) es
exactamente la pieza sobre la que se monta un abanico. Y cambia el juego en vez de decorarlo: hoy
una etapa llana es «esperar al sprint»; con abanicos pasa a tener un peligro real, un equipo fuerte
puede ganar una gran vuelta un martes cualquiera, y el gregario tiene trabajo de verdad.

> El dueño: «aunque eso implicará también definir las colocaciones».

Y tiene razón: sin posición dentro del pelotón no hay abanico que valga. Hoy la colocación existe
solo como DESORDEN en el remate (`placementSd`), no como un sitio en la carretera que se pueda
ganar o perder durante la etapa. Esta EPIC empieza ahí.

### E3 · La carrera por etapas como una carrera, no como 21 etapas

El motor simula etapas; la pregunta es cuánto sabe de la CAMPAÑA. ¿Se corre distinto el día 18 con
40 s de ventaja que el día 3? ¿Hay emboscada, defensa del maillot, bonificaciones, el día en que el
líder se rompe? Hay piezas sueltas (`gcDeficitSeconds`, los motivos de equipo) pero no está medido
si de verdad cambian la carrera según la clasificación y los días que quedan. Primer paso: medirlo.

### E5 · El clima

No existe. Lluvia sobre adoquín, frío en un puerto, calor. Es lo que da variedad entre dos ediciones
de la misma carrera y lo que justifica de verdad las caídas y los abandonos.

> El dueño: «estaría bien también que pueda existir para los ciclistas y managers una previsión del
> clima… que además puede cambiar, y con eso tomar diferentes decisiones».

O sea que no es solo física: es **información con incertidumbre**. La previsión se publica antes,
puede fallar, y las decisiones (material, plan de equipo, cuánta gente al frente) se toman con ella.
Eso es lo que la convierte en mecánica de juego y no en un modificador.

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

Es la EPIC más grande del proyecto y no es una: son catorce. Desglose por componentes, cada uno
entregable por separado. Los marcados con **[hay pieza]** tienen ya algo en el motor sobre lo que
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
- **G2.14 · La silla del mánager.** Que el jugador también responda ante alguien: objetivos del
  patrocinador, paciencia limitada, consecuencias.

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
plan con supuestos: *si a 60 km la fuga pasa de dos minutos, tira; si mi jefe se descuelga en el
primer puerto, espérale; si llegamos más de veinte a meta, no lances, guárdate; si llueve en el
adoquín, colócate delante desde el km 40*. El jugador no está en la carrera, pero sí está en todas
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

**N6 (que el mundo aguante al crecer) estaba mal razonado y se retira.** Yo di por hecho que más
jugadores significan más simulación, y no: **las carreras son fijas y no van a aumentar**. Un día de
juego cuesta lo mismo con cien jugadores que con diez mil, porque lo que se simula son las carreras
del calendario con su campo, no los jugadores. Lo que crece con los jugadores es la COMPETENCIA por
entrar —los equipos tendrán que ser más selectivos o rotar mejor a quién llevan—, que es una
mecánica de juego (y bastante buena), no un problema de escala.

---

## Orden acordado

1. **B1** (el adoquín) y **B2** (la crono) — son bugs, van primero.
2. **E1**, **E3**, **E5** — delegadas.
3. La lista grande, empezando por donde el dueño diga. **G1 (entrenamientos)** y **G3 (rankings)**
   son las dos que hoy pueden estar mintiendo en producción, así que son las candidatas naturales.

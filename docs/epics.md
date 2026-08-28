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

### G2 · Gestión humana de un equipo

> «Esto va a ser BRUTAL. Tiene a su vez MUCHÍSIMOS componentes.»

Sin desglosar todavía. Es probablemente la EPIC más grande del proyecto.

### G3 · Rankings a 365 días rodantes

> «El ranking debería sumar los puntos en los últimos 365 días: si llegamos al GD 25, hay que sumar
> los que consigan ese día y restar los que consiguieron el GD 25 del año anterior.»

Es exactamente como funciona el ranking real. Hoy hay que comprobar si el motor lo hace así o
acumula por temporada; si acumula, el ranking miente en cuanto pasa un año.

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

## Orden acordado

1. **B1** (el adoquín) y **B2** (la crono) — son bugs, van primero.
2. **E1**, **E3**, **E5** — delegadas.
3. La lista grande, empezando por donde el dueño diga. **G1 (entrenamientos)** y **G3 (rankings)**
   son las dos que hoy pueden estar mintiendo en producción, así que son las candidatas naturales.

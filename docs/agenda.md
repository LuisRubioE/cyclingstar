# Agenda de diseños: lo que queda fuera del motor

Estado: **borrador para discusión.** No es un plan, no compromete ningún paso de `MVP.md` y no
manda sobre `SPEC.md`. Es el catálogo de los DISEÑOS que faltan por escribir, con lo que cada uno
contesta, de qué depende y qué decisión del dueño lo desbloquea.

## 0. De qué habla esto y de qué no

`docs/epics.md` es la lista de lo que le falta al MOTOR y al MUNDO: el adoquín, el viento, la
campaña de tres semanas, los entrenamientos, los recorridos. Está escrita desde dentro de la
simulación y se mide con bancos.

Este documento es la otra mitad: **el producto alrededor de la simulación**. Quién eres cuando
entras, cómo recuperas tu cuenta, quién manda sobre quién, en qué idioma lees, qué te cuentan de la
carrera de hoy y quién limpia lo que alguien escriba de más.

> **Para encargar el trabajo, ve a [docs/encargos.md](./encargos.md)**, que convierte este catálogo
> en doce documentos de diseño con su párrafo de encargo, qué leer del repositorio y en qué orden.
> Aquí está el razonamiento; allí está la lista operativa.

Tres cosas de la lista grande de `epics.md` son en realidad de aquí y no se duplican, se citan: **G2**
(gestión humana de un equipo), **G7** (elementos sociales) y **G11** (correo). Cuando este documento
habla de ellas, la fuente sigue siendo `epics.md`.

---

## 0.1 Decisiones del dueño (14 de septiembre de 2026)

Siete preguntas planteadas, siete contestadas. Quedan aquí porque la mitad del documento cambia de
forma según ellas.

| #   | Pregunta                       | Decisión                                                                                                                                                    |
| --- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ¿Qué es «economía real»?       | **La economía INTERNA.** Que el salario le sirva de algo al corredor y, sobre todo, el dinero de los equipos: patrocinadores, premios y todo tipo de gastos |
| 2   | ¿Un mundo o varios?            | **Uno y para siempre**, con un **reset** al pasar de pruebas a juego de verdad: se reinicia desde la temporada 1                                            |
| 3   | ¿Los mánagers se eligen?       | **Cuenta premium.** Regalada a quien MÁS HA APORTADO (no a quien más ha ganado), y solo por invitación hasta que el juego esté implementado y probado       |
| 4   | ¿Qué idiomas?                  | Primera tanda **con** italiano, alemán y portugués. Ruso aplazado; **chino por delante de danés y polaco**. Ver el anexo a D7                               |
| 5   | ¿Edad mínima?                  | **16**, declarada y sin verificación documental. Ver §3.7                                                                                                   |
| 6   | ¿Integridad antes que mánager? | **Sí, y más:** el mánager es por invitación hasta que D5 y D6 estén implementados y probados, no solo diseñados                                             |
| 7   | ¿Qué le debemos al jugador?    | El dueño sostiene que el motor apenas cambiará tras el reset. Discrepancia razonada en §4.4                                                                 |

La 2 es la que más mueve, y no como se esperaba: **el reset cambia la naturaleza de la mitad de las
decisiones irreversibles**, porque las vuelve reversibles exactamente una vez. Eso es la sección 3.

## 1. La objeción, primero: no conviene diseñarlo todo ahora

Lo pides como «ir preparando los diseños para el resto de cosas», y esa frase esconde un riesgo que
este repositorio ya pagó una vez.

Hoy hay **7.900 líneas de diseño escrito y sin implementar** (`docs/tactica.md` y
`docs/entrenamiento.md`), y el propio `docs/diseno/README.md` lo dice con todas las letras: «nada de
los dos documentos está implementado». A eso se suma la lección que `epics.md` dejó anotada al
cerrar B2: un documento que declara un estado que ya no es cierto **es peor que no tener
documento**, y costó una tarde de perseguir un fantasma.

Un diseño escrito hoy y ejecutado dentro de un año se habrá desincronizado del código dos veces
antes de empezar. Multiplicar por diez la superficie de diseño no implementado no acelera nada:
crea diez frentes de documentación que envejecen solos.

**Así que la regla que propongo para toda esta agenda es una sola, y parte la lista en dos:**

- **Lo IRREVERSIBLE se decide ya, aunque se construya tarde.** No hace falta el diseño completo,
  hace falta la decisión y, cuando toque, un cambio pequeño de esquema que deje la puerta abierta.
- **Lo reversible se diseña cuando vaya a construirse**, en oleadas, y cada oleada empieza por
  volver a leer el código.

La sección 3 es la lista de lo irreversible. Es la parte urgente de este documento, y es corta.

---

## 2. Cinco capas, no una lista de ocho

Tu lista mezcla cosas de altitudes muy distintas: «multiidioma» es una decisión de infraestructura
con una fecha límite implícita, «mánagers humanos» es un cambio de lo que el juego ES, y
«tutoriales» es una consecuencia de las dos. Ordenadas por capa:

| Capa                                  | Qué decide                                      | Qué cae aquí de tu lista             | Qué falta                                                                                           |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Modelo**: qué es el juego           | Las reglas entre personas                       | Mánagers humanos, sociales, economía | Identidad del corredor (N4), el contrato del mundo con el jugador                                   |
| **Integridad**: qué lo hace habitable | Que el modelo no se envenene                    | Admins y moderación, correo          | Anti multicuenta, colusión, auditoría de admin, seguridad de cuenta                                 |
| **Infraestructura**: qué lo sostiene  | Lo que no cambia el juego pero lo hace operable | Multiidioma, economía real (pagos)   | Notificaciones, analítica, escala y archivado, legal y privacidad                                   |
| **Lectura**: qué percibe el jugador   | Que el trabajo del motor se NOTE                | News + radio + journal, UX, tutorial | **El sistema visual** (§4.14), accesibilidad y móvil, notas de versión, auditabilidad del resultado |
| **Contenido**: de qué está hecho      | El material sobre el que corre todo             | (nada)                               | Recorridos (G5, G6), selecciones nacionales, fin de temporada y legado, identidad visual            |

### Y la reorganización que de verdad propongo

**Tres de tus ocho puntos son UNO.** «Mánagers humanos», «interacciones sociales» y la parte interna
de «economía» no son tres proyectos: son tres caras del mismo. Un mánager sin canal de comunicación
es un tirano mudo; un canal de comunicación sin nada que negociar es un chat vacío; y lo que se
negocia es el dinero y el mando. `epics.md` ya lo vio al escribir G2 con quince componentes y meter
los canales de G7 dentro como **G2.13**, diciendo que dejan de ser adorno y pasan a ser «la mecánica
por la que se negocia». Diseñarlos por separado garantiza costuras.

**Otros tres de tus ocho también son UNO.** «News + radio + journal», «rediseño general de la
experiencia» y «tutoriales» son la capa de LECTURA. Y el orden entre ellos importa: rediseñar la
experiencia general antes de decidir qué es una noticia y qué es una crónica es diseñar el marco
antes que el cuadro. Primero qué se cuenta, luego dónde se pone, luego cómo se enseña.

Con eso, tus ocho puntos son **dos proyectos grandes y tres piezas sueltas** (correo y
administración, multiidioma, pagos), y sobran huecos que la sección 4 rellena.

---

## 3. Lo irreversible, releído después del reset

La primera versión de esta sección listaba seis decisiones «que hay que tomar ahora». La respuesta 2
las reordena entera, y conviene decirlo sin adornos porque **corrige algo que escribí con demasiada
alarma**.

**El reset es un indulto de una sola vez.** Si el mundo se reinicia desde la temporada 1 al pasar de
pruebas a juego de verdad, entonces todo lo que hoy parece irreversible por culpa de los datos
acumulados deja de serlo: los datos se van a tirar. Lo que el reset NO indulta es lo que vive fuera
de la base de datos (la reputación de un dominio de correo, una marca registrada por otro, la
cultura de los primeros jugadores) ni lo que llegue tarde al propio reset.

Así que la regla buena no es «decidir ya», es esta: **el reset es la fecha límite, y hay dos listas
de plazos.**

### 3.1 El esquema de las noticias: sigue siendo un defecto, ya no es una hemorragia

Lo medido no cambia. La **crónica** guarda sucesos (`stages.radio`, `jsonb`, con `plantilla`,
`protagonistas` y `datos`) y quien los redacta es la web (`narration.ts` y `stageJournal.ts`), así
que es traducible por construcción y hasta retroactivamente. Las **noticias** hacen lo contrario:
`emitNews` llama a `renderNews(kind, seed, data)` al ESCRIBIR y la tabla `news` solo guarda `kind` y
`text`. Los ingredientes se tiran.

**Lo que sí cambia es la urgencia, y lo dije de más.** Escribí que cada titular escrito desde hoy es
intraducible «para siempre». Con reset, es intraducible **hasta el reset**, y el reset se lo lleva
por delante. O sea que no hay hemorragia: hay una tarea con fecha.

El plazo queda en: **antes del reset**, añadir `seed` y `data` a `news` y mover el renderizado al
momento de leer. Después del reset, cada noticia escrita sí es definitiva, porque a partir de ahí no
habrá otro borrado.

Y el detalle sigue en pie: `users.locale` es `text NOT NULL DEFAULT 'es'` con la interfaz en inglés.
La columna ya miente.

### 3.2 El dominio de correo: el dueño tiene razón, con dos matices

La objeción fue: «si después de las pruebas me compro un dominio, no hay problema con la reputación
de envío, ¿no?». **Correcto.** La reputación se acumula por dominio de envío, así que un dominio
nuevo empieza limpio y no hereda nada de lo que pasara antes desde otro sitio. Lo que escribí sobre
que «el daño cruza el reset» valía para el dominio DESDE EL QUE SE ENVÍA, no para el juego.

Quedan dos matices, y ninguno cambia el plan:

1. **El dominio que se arriesga durante las pruebas es `rubio.pt`, que es tuyo y lleva tu correo
   personal detrás.** Por eso sigue valiendo el subdominio dedicado
   (`no-reply@cyclingstar.rubio.pt`): lo que se ensucie se queda en el subdominio en lugar de
   arrastrar el dominio raíz desde el que escribes tú.
2. **Un dominio recién comprado tiene reputación CERO, que no es lo mismo que buena.** Los filtros
   desconfían de un remitente nuevo que de pronto manda mucho. Lo estándar es calentarlo: comprar el
   dominio unas semanas antes del lanzamiento y empezar a enviar volumen pequeño (tus propias
   pruebas, los probadores) en vez de estrenarlo el mismo día que llegan mil registros.

Y sigue en pie lo único que de verdad importa aquí: **separar el correo transaccional del de
notificación** desde el primer día, aunque al principio solo exista el primero.

### 3.3 La economía es INTERNA: lo que eso simplifica y lo que no

Respuesta 1: no hablamos de cobrar, hablamos de que el dinero del juego signifique algo. Eso
simplifica bastante y aclara el reparto:

- **D2 sube de importancia.** Es el diseño de las dos mitades que pediste: que el salario del
  corredor le sirva para algo (hoy `economy.ts` ya modela viajes, vivienda y material, o sea que la
  mitad del gasto personal existe) y sobre todo **el dinero de los equipos**: patrocinadores con
  objetivos, premios que entran al bote y se reparten, y la lista entera de gastos de una
  temporada. Cubre G2.6, G2.7 y G2.8.
- **D9 no desaparece, encoge y se retrasa.** Porque la respuesta 3 dice que la cuenta premium será
  comprable «a futuro», y premium es hoy la llave del mando de un equipo (`teamControl.ts`). O sea
  que sí habrá dinero real algún día, pero será **un solo producto** y no una economía.

Y queda una cosa que sí hay que ordenar en el tiempo: **cobrar después del reset, nunca antes**.
Cobrar por una cuenta y luego borrar el mundo que esa cuenta habitaba es el peor estreno posible, y
es puramente una cuestión de calendario, así que sale gratis hacerlo bien.

### 3.4 Un mundo, decidido

Respuesta 2: uno y para siempre, con un reset al salir de pruebas. Es lo que yo recomendaba y es lo
que da sentido a G8 (ir limpiando bots según lleguen humanos).

Las dos consecuencias que conviene escribir para que nadie las descubra tarde:

1. **El reset es el último momento barato para todo cambio de esquema con historia detrás.** Las
   noticias (§3.1), el formato de los identificadores de carrera, las semillas del mundo, los
   nombres. Conviene llegar a esa fecha con una lista de «lo que solo se puede cambiar hoy».
2. **Después del reset no hay red.** Un mundo único y permanente significa que un fallo de
   calibración que arruine una temporada no se arregla borrando: se arregla conviviendo con él. Eso
   sube el listón de §4.4 (qué le debes al jugador cuando el motor cambia) de «buena práctica» a
   «obligación».

### 3.5 Premium como llave del mando: decidido, con una advertencia

Respuesta 3: los mánagers son cuentas premium, regaladas primero a los mejores probadores y
comprables más adelante. Coincide con lo que yo recomendaba (elegidos antes que comprados) y encaja
con la pieza que ya existe en el código.

**La advertencia, y es de diseño, no de implementación.** «Los mejores probadores» tiene dos lecturas
y solo una es sana:

- Si «mejores» significa **quien más ha aportado** (fallos encontrados, opiniones, constancia,
  saber estar), entonces el mando lo reciben personas que ya han demostrado que cuidan el juego, que
  es exactamente lo que necesita la primera cohorte según §3.5 original: ellos fijan la cultura.
- Si «mejores» significa **quien mejores resultados deportivos ha tenido**, se acopla la autoridad
  al rendimiento. El que ya gana carreras es además el que decide quién lleva el Giro, y en un juego
  donde el mánager es juez y parte (lo dice G2 con todas las letras) eso concentra dos poderes en la
  misma persona desde el primer día.

Recomiendo la primera lectura, explícitamente y por escrito en las condiciones del programa de
pruebas, porque además te da una salida elegante el día que alguien pregunte por qué él no.

**Y una corrección de vocabulario que conviene hacer ahora.** `README.md` promete «cero pay to win».
Cuando premium sea comprable, el dinero comprará **autoridad sobre otras personas**: quién lleva el
Giro, quién cobra qué, quién va al Tour. Eso no es rendimiento y es el modelo estándar del género,
pero llamarlo «cero pay to win» invita a una discusión que se gana sola escribiendo la verdad:
**no se compra rendimiento**. El corredor de un mánager corre exactamente igual de rápido. Cambiar
esa línea cuesta diez segundos hoy y cuesta una crisis de confianza el día que alguien la cite.

### 3.6 La marca: el reset tampoco la indulta

`SPEC.md` §8 obliga a verificar cada nombre contra EUIPO y USPTO antes del lanzamiento, y eso incluye
el nombre del juego. Un reset de mundo no cambia que el nombre esté tomado. Sigue siendo de las pocas
cosas que, salidas mal, obligan a rehacer identidad visual, dominio, correo y tienda a la vez.

### 3.7 Edad mínima: recomiendo 16, no 12

Respuesta 5: no estaba pensado, y la propuesta de 12 es la que más caro sale de las tres posibles.
El razonamiento, con el aviso por delante de que **esto hay que confirmarlo con un abogado antes de
abrir el registro**: lo que sigue es la forma del problema, no un dictamen.

El reglamento europeo de protección de datos fija una edad para que un menor pueda consentir por sí
mismo el tratamiento de sus datos en servicios de la sociedad de la información, y deja a cada país
elegirla **dentro de una horquilla de 13 a 16 años**. Por debajo de esa edad hace falta
**consentimiento verificable de quien tenga la patria potestad**, que no es una casilla: es un flujo
de verificación real. Y como los países eligen distinto (España y Portugal por lo bajo, Alemania y
Países Bajos por lo alto, Francia en medio), un servicio abierto a toda Europa con edad mínima baja
necesita **un flujo distinto por país**.

Las tres opciones, con su coste:

| Edad mínima | Qué implica                                                                                                                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **12**      | Por debajo del suelo de la horquilla en todos los países y por debajo también del umbral estadounidense. Exige verificación parental en todas partes, y encima con menores de doce años en un juego con chat |
| **13 a 15** | Legal en varios países y no en otros. Obliga a preguntar el país y a bifurcar el flujo. Mantenible para un equipo con jurista, no para un proyecto de una persona                                            |
| **16**      | Por encima del techo de la horquilla, así que **no hace falta consentimiento parental en ningún país europeo** y desaparece toda la bifurcación                                                              |

**Recomiendo 16**, y no principalmente por la ley. Es por el punto 4.1 y por G2: este juego va a
tener chat de equipo, negociación entre personas y un mánager humano con poder sobre otro jugador.
Moderar eso con menores de doce años dentro es asumir una responsabilidad de otra categoría, con
obligaciones de protección del menor que ni tú ni yo queremos diseñar ahora.

**¿Hace falta verificar la edad? No.** La pregunta era buena y la respuesta corta es que lo estándar
es una **fecha de nacimiento declarada** en el registro, más la edad mínima escrita en las
condiciones, más actuar cuando te enteras de que alguien no la cumple. Nada de documentos, ni
tarjeta, ni pasarela de verificación. Lo que la ley reprocha no es no haber comprobado un carné, es
haber diseñado un servicio para menores fingiendo que no, o mirar hacia otro lado cuando ya lo sabes.

Con 16 declarados el flujo es: una casilla de fecha de nacimiento, una línea en las condiciones, y
un botón de denuncia que ya vas a necesitar por otros motivos (§4.6).

**Sobre Footstar**: no sé qué dicen sus condiciones, no las he leído y no voy a suponerlo. Lo que sí
diría es que un juego que lleva veinte años en marcha arrastra decisiones tomadas cuando el marco
legal era otro, así que no es una referencia segura en esto aunque lo sea en casi todo lo demás.

El coste de elegir 16 es real y conviene nombrarlo: **pierdes a los jugadores de 13 a 15**, que en un
juego de ciclismo no son pocos. Si más adelante quieres bajar, se baja: subir la edad mínima después
obliga a expulsar cuentas existentes, bajarla no rompe nada. **Empezar alto es la decisión
reversible**, y por eso es la correcta ahora.

## 4. Lo que falta en tu lista

Trece huecos. Algunos son pequeños; dos me parecen graves.

### 4.1 GRAVE · Integridad competitiva: multicuentas, colusión y mercado

Es la ausencia más seria. En cuanto haya mánagers humanos, dinero del juego y un mercado, aparecen
las tres plagas clásicas del género:

- **Multicuentas**: un jugador con seis corredores en su propio equipo, que se sacrifican por el
  suyo bueno. En un juego donde el gregario existe MECÁNICAMENTE, la multicuenta no es hacer trampa
  al margen del juego, es hacer trampa DENTRO de él y con las herramientas que el juego te da.
- **Colusión entre equipos**: dos mánagers que se reparten carreras, o que se pasan dinero con
  contratos inflados y rescisiones pactadas (la cláusula del 25 % de `SPEC.md` §7.2 es exactamente
  el vehículo).
- **Automatización**: quien programe un script para dejar órdenes cuatro veces al día le saca una
  ventaja estructural a quien no, precisamente porque el mundo avanza cada seis horas.

Esto no se arregla con moderación reactiva, se arregla con diseño: qué se puede detectar (huella de
sesión, coincidencia de IP y de horario, patrones de sacrificio anómalos), qué se limita por regla
(un corredor por persona, ventanas de mercado, topes de transferencia) y qué se castiga. Y una
verdad incómoda: **la verificación de correo de tu punto 2 es la primera línea de esta defensa**, no
solo higiene de cuenta. Eso sube G11 de prioridad.

### 4.2 GRAVE · Los primeros treinta días del jugador

El propio `epics.md` mide, con orgullo justificado, lo que le pasa hoy a un jugador nuevo: entra a
los 18 años con `rating` 0,21 contra un umbral de ofertas de 0,42, **o sea que nadie le ficha**,
corre de agente libre y termina «último y a ocho minutos y medio». Como modelo del mundo es
excelente y no hay que tocarlo. Como primera experiencia de producto es **hostil**: el jugador nuevo
pasa sus primeras semanas reales siendo el último de todo, sin equipo, sin compañeros y sin nada que
decidir salvo entrenar.

Con 6 horas por día de juego, el salto de 18 a 19 años (365 días de juego) son **tres meses reales**
de ser un don nadie. Ningún juego persistente sobrevive a eso sin diseñarlo a propósito.

No pido bajarle la dificultad. Pido que exista un diseño de **qué hace y qué siente el jugador en su
primer mes**, con material que hoy no existe: objetivos propios de la categoría, progresión visible
aunque el resultado sea malo, una primera victoria posible en algún sitio, y alguien con quien
hablar. Es la pregunta de retención del proyecto y no está en ninguna lista.

### 4.3 Notificaciones y modo ausencia

Cuatro días de juego por día real significa que el jugador se pierde cosas dormido. Hacen falta dos
mecanismos que hoy no existen: **avisar** (correo, y a medio plazo notificación web, con el flujo
separado del transaccional según 3.2) y **ausentarse sin perder** (que las políticas de N1 gobiernen
cuando no estás, y que una semana de vacaciones no arruine una temporada). Sin lo segundo, el juego
castiga tener vida.

### 4.4 El contrato del mundo con el jugador, que es la pregunta 7

La pregunta no se entendió, y era culpa mía por plantearla en abstracto. Va con un ejemplo concreto,
que además va a ocurrir de verdad y pronto.

**El caso.** Un jugador pasa tres meses reales entrenando a su corredor para la montaña, porque el
juego le dice que escalar se entrena así y rinde asá. Entonces aterriza el rediseño táctico que está
en marcha, o una recalibración como la de la v44 (la que descubrió que en montaña la fuga no gana
nunca porque el pelotón sube 28,8 segundos por kilómetro más rápido). El motor cambia. Su corredor,
sin haber hecho nada distinto, **empieza a rendir de otra manera**.

**La pregunta es: ¿qué le debemos a esa persona?** Y no es retórica, porque `docs/balance.md` lleva
más de diez mil líneas de cambios del motor y el jugador no ha visto ni uno. Desde fuera, un corredor
que subía bien y de pronto sube peor no se lee como «recalibración»: se lee como «el juego está roto»
o «me han perjudicado». Con un mundo único y permanente (§3.4) no hay borrón y cuenta nueva que lo
arregle.

Las opciones, de la más barata a la más cara:

| Opción                      | Qué es                                                                                                    | Coste          |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- |
| **Nada**                    | El motor cambia y el jugador se entera corriendo                                                          | Cero, y caro   |
| **Notas de versión**        | Se le cuenta antes, en su idioma y en términos de juego: «a partir del día 210 el ritmo en puerto cambia» | Bajo           |
| **Aviso con antelación**    | Los cambios grandes se anuncian con N días de juego de margen, para que le dé tiempo a reaccionar         | Medio          |
| **Reasignación gratuita**   | Tras un cambio grande, una ventana para redistribuir entrenamiento sin penalización                       | Medio          |
| **Temporada de transición** | El cambio entra en el rollover y no a mitad de temporada                                                  | Alto, y limpio |

**Mi recomendación: notas de versión SIEMPRE, y las otras tres reservadas para los cambios que muevan
la calibración de un atributo.** Los cambios de motor de este proyecto no son cosméticos, son físicos,
y ya hay precedente medido de uno que habría cambiado el resultado de una temporada entera. Un juego
que recalibra en silencio se gana fama de arbitrario, y esa fama no se quita.

**La objeción del dueño, y por qué no la compro del todo.** «El motor no debe cambiar tanto una vez
que el juego lo consideremos acabado, testeado, y hagamos el reset.» Ojalá, y es la intención
correcta. Tres datos de este mismo repositorio dicen que conviene no apostar a ello:

- El motor va por la **versión 68** y las últimas cinco versiones han cambiado cosas grandes (la
  caída como suceso social, el pinchazo que no existía, la colocación, el clima).
- El **rediseño táctico está en marcha ahora mismo** y son 6.340 líneas de diseño que aún no han
  tocado el código. Ningún rediseño de ese tamaño aterriza sin recalibrar lo que toca.
- `epics.md` tiene **V2 abierta**: mover el suelo de la fuga en montaña a los perfiles reales es «una
  recalibración táctica del tamaño de la v38», autorizada y sin hacer.

Y hay una razón estructural, no de intención: este motor se valida contra bancos de Montecarlo, y un
banco solo mide lo que lleva dentro. La lección está escrita dos veces en `epics.md` («lo que el
banco no lleva, el banco no puede medir, y el defecto vive ahí para siempre»). Los defectos que hoy
no se ven se verán cuando haya mil jugadores corriendo situaciones que ningún banco reproduce, y
entonces habrá que tocar.

**Pero lo importante es que esto no es una discusión que haya que ganar**, porque la regla cuesta una
línea y **si tienes razón no se dispara nunca**. Escribirla es un seguro barato: si el motor no
cambia, no pasa nada; si cambia, ya está decidido cómo, en frío y sin nadie mirando.

Lo que hay que decidir ahora, y por eso está en esta lista: **si los cambios de motor entran en
cualquier momento o solo en el rollover**. Es una regla de una línea, cuesta nada escribirla hoy, y
después de tener jugadores dentro ya no se puede elegir sin quedar mal.

### 4.5 Auditabilidad del resultado, o «por qué perdí»

Casi gratis por cómo está construido el motor, y de mucho valor. `packages/engine` es puro y
determinista, el azar viene de un RNG sembrado y las etapas se guardan con snapshot sellado
(`checkReplay` ya existe en las rutas de admin). Eso permite ofrecerle al jugador algo que casi
ningún juego de este género puede: **la explicación verificable de su carrera**. Qué orden dio, qué
hizo su corredor, en qué kilómetro se descolgó y por qué. Es la mejor defensa contra la acusación de
que el juego hace lo que quiere, y es la misma pieza que N1 necesita para que el informe sirva para
corregir el plan siguiente.

### 4.6 Administración de verdad, que hoy no existe

Tu punto 2 junta dos cosas que conviene separar, y el código lo confirma:

- **Operación del mundo** (game master): forzar un tick, reparar, ver la salud del mundo, inspeccionar
  una etapa. Existe en `apps/api/src/routes/admin.ts`.
- **Moderación de comunidad**: nombres, denuncias, sanciones, mensajes. Existe a medias
  (`blocklist.ts`, `AdminNames.tsx`, el estado `pendiente|aprobado|rechazado` de `SPEC.md` §7.1).

Y el agujero: **no hay rol de administrador**. Todas las rutas de `/admin` están tras un
`ADMIN_TOKEN` compartido por cabecera, y la columna `users.is_admin` **no se lee en ningún sitio del
repositorio** (está declarada en `schema.ts` y no aparece en ninguna consulta). Un token compartido
significa que no se sabe quién hizo qué, que no se le puede dar a un moderador voluntario sin darle
todo, y que revocar a una persona obliga a rotarlo para todos.

Lo que falta diseñar: niveles (dueño, operador, moderador), permisos por nivel, **registro de
auditoría de toda acción administrativa** y el flujo de denuncia y respuesta que el reglamento
europeo de servicios digitales exige en cuanto haya contenido escrito por usuarios.

### 4.7 Analítica de producto

No se puede diseñar retención a ciegas. Hace falta saber cuántos se registran, cuántos llegan a
crear corredor, cuántos vuelven al séptimo día y en qué pantalla se caen. Es pequeño, es aburrido y
sin él las secciones 4.2 y 4.3 son literatura.

### 4.8 Escala, archivado y coste

Dos números que crecen solos: **el tiempo de simulación por día de juego** (N6 lo midió: 14,0 s en
la v38, 20,7 s en la v40, un 48 % más en dos versiones) y **el volumen histórico** (resultados de
1.600 corredores por 60 a 70 carreras por temporada, más `rider_points`, que por diseño no se borra
nunca). Ninguno es urgente. Los dos son del tipo que se descubre tarde.

### 4.9 Legal y privacidad

Más allá de la marca de 3.6: derecho de acceso y borrado de datos, exportación, política de
privacidad viva (hay `Privacy.tsx`), **menores** (un juego cuyo protagonista empieza a los 18 atraerá
a jugadores de 14, y eso tiene reglas propias de consentimiento) y las obligaciones de moderación de
contenido de usuario. Nada de esto es negociable en cuanto haya chat.

### 4.10 Selecciones nacionales y el Mundial con humanos

`SPEC.md` §8 prevé el Mundial en septiembre «con selecciones NPC en v1» y los campeonatos nacionales
el mismo día. Media pieza está construida: hay países, hay páginas de país y hay detección de país
por IP. Que a un jugador **le convoque su selección** es de las emociones más baratas de producir
que quedan disponibles, y encaja con la mecánica de convocatoria que ya existe.

### 4.11 Fin de temporada, legado y la segunda carrera deportiva

G10 ya jubila a los humanos, y N2 dice con razón que la retirada debe ser «una puerta a la siguiente
carrera deportiva». Falta el diseño de lo que queda: ceremonia de fin de temporada, qué se conserva
entre carreras deportivas (palmarés, salón de la fama, alguna forma de prestigio) y qué se pierde.
Es el único momento del juego en el que un jugador decide si sigue existiendo.

### 4.12 Accesibilidad y móvil

Va dentro de tu punto 7 y no aparte, pero con dos exigencias explícitas: el juego se consulta desde
el teléfono (lo dice `docs/navegacion.md` §2, principio 3), y los equipos se distinguen por **color
de maillot**, que es exactamente el peor identificador posible para un daltónico. Un patrón SVG
paramétrico puede resolverlo bien si se diseña sabiéndolo.

### 4.13 Comunidad, dentro o fuera

Decisión pequeña de consecuencias grandes: foro propio (coste de moderación permanente, obligaciones
legales, pero contexto de juego) o comunidad externa en Discord (gratis, inmediata, fuera de tu
control). Mi opinión: **fuera desde el primer día**, y dentro del juego solo lo que necesita el
contexto del juego (el canal del equipo, la rueda de prensa, el mensaje del mánager). Construir un
foro propio es adoptar un trabajo a tiempo parcial para siempre.

---

### 4.14 El rediseño GRÁFICO, que faltaba, y un malentendido que aclarar

**Primero el malentendido, porque es mío.** En la primera versión escribí que la crónica «está bien
construida». Me refería al **modelo de datos**: guarda sucesos estructurados en vez de texto, y por
eso es traducible y re-renderizable. Eso no dice absolutamente nada sobre si la pantalla es buena, y
leído del tirón parecía que estaba defendiendo la experiencia actual. No lo estaba, y el dueño tiene
razón en la corrección: **un buen modelo de datos debajo de una pantalla mala sigue siendo una
pantalla mala**. De hecho es la mejor noticia posible para un rediseño, porque significa que se puede
tirar la presentación entera sin tocar el motor ni perder la historia ya corrida.

**Y luego el hueco de verdad, que sí era un fallo del catálogo.** La primera versión tenía
arquitectura de información (D14) y marca (D20), y **no tenía diseño visual**. Son tres cosas
distintas y confundirlas es exactamente lo que produce un juego que «funciona» y da pena mirar:

| Disciplina                  | Qué decide                                                   | Dónde estaba |
| --------------------------- | ------------------------------------------------------------ | ------------ |
| Arquitectura de información | Qué hay y dónde vive                                         | D14          |
| **Sistema visual**          | Tipografía, color, densidad, jerarquía, componentes, estados | **Faltaba**  |
| Identidad de marca          | Nombre, logotipo, maillots, tono                             | D20          |

Entra como **D21**, y no en la última oleada.

**El norte que pide el dueño, y es el mejor que podía dar: la retransmisión de televisión.** Es una
referencia excelente porque no es un gusto estético, es un **conjunto de decisiones de información
resueltas hace cuarenta años** por gente que tenía que contar una carrera de seis horas a alguien que
acaba de encender la tele. Lo que una retransmisión enseña, permanentemente y sin que se lo pidas:

- **Cuánto queda** (kilómetros a meta), siempre visible.
- **La diferencia**, en segundos, cambiando delante de ti. No «hay fuga»: **2' 14"** y si sube o baja.
- **Quién va en cada grupo**, con nombre y equipo, y cuántos son.
- **Dónde estamos del perfil**: la altimetría con la posición marcada y el puerto que viene.
- **El rótulo del momento**: quien ataca sale en pantalla con su nombre y su ficha.
- **Nada más.** Lo que no ayuda a entender la carrera no está.

El Race Radio de hoy es una lista de frases en orden cronológico. Una retransmisión **no es una
lista**: es un estado que evoluciona (dónde va cada grupo, con cuánta diferencia) con sucesos
encima. Ése es el cambio de forma, y es de fondo, no de pintura.

**Y el modo sin destripe deja de ser una opción para ser el modo por defecto de esa pantalla.** Si la
referencia es la tele, entonces entrar en una etapa es sentarse a verla, no leer el acta. Hoy es
imposible: llegar al journal sin saber quién ganó no se puede, y eso lo convierte en un archivo en
vez de en un espectáculo. Con el motor que hay debajo (etapa determinista, sucesos fechados por
kilómetro y por segundo) **reproducirla a ritmo es técnicamente barato**: los datos ya están, lo que
falta es no enseñarlos todos de golpe y no filtrarlos desde otra pantalla.

### 4.15 La segunda pasada: cuatro cosas más

Lo que apareció al volver a mirar con las preguntas del dueño delante. Dos las trajo él y dos salieron
de comprobar el código.

#### 4.15.1 La app nativa: mi recomendación es que NO, todavía

La pregunta era una app de Android y de Apple para acceder de forma más nativa. Entiendo el impulso y
creo que la respuesta correcta es **una aplicación web instalable (PWA) primero, y nativa solo si esa
se queda corta**, por cuatro razones y una trampa.

1. **Un solo código.** Nativo son tres productos (web, Android, iOS) para una persona que todavía
   está terminando el motor. Cada pantalla de las once épicas habría que hacerla tres veces.
2. **Lo que de verdad se quiere de una app es el AVISO**, y eso ya no exige nativo: las
   notificaciones web funcionan en Android desde hace años y en iPhone desde iOS 16.4 para las webs
   añadidas a la pantalla de inicio. Conviene verificar el estado actual antes de decidir, porque esto
   se mueve, pero la época de «si quieres notificar, haz app» terminó.
3. **Sin revisión de tienda.** Este juego va a cambiar mucho y a menudo. Una web se despliega cuando
   se quiere; una app pasa por revisión cada vez.
4. **Este juego no necesita el teléfono para nada más.** No usa cámara, ni GPS, ni sensores. Lo que
   pide es leerse bien en una pantalla pequeña y avisar cuando pasa algo, y las dos cosas las hace una
   web bien hecha.

**Y la trampa, que es la razón de peso y no se ve venir:** si la cuenta premium se vende DENTRO de una
app de iOS, Apple obliga a cobrarla con su sistema de compra integrada y se queda una comisión (la
tarifa general ha sido históricamente del 30 %, con un tramo reducido para desarrolladores pequeños,
y las reglas están cambiando por la regulación europea y por litigios en Estados Unidos). Google
aplica un esquema parecido. O sea que **meter la venta de premium en una app puede costar una parte de
cada cuenta vendida**, y esa decisión hay que tomarla sabiéndolo y no descubrirla después. Como las
reglas se mueven, hay que mirar cómo están el día que se decida.

**Conclusión:** no es una épica. Es una **decisión tomada** (PWA) y tres requisitos repartidos: la web
instalable y legible en móvil va en E2, el aviso por notificación va en E3, y la advertencia de la
comisión va en E7. Se revisa cuando el juego esté acabado y haya datos de uso; si entonces la mitad
de los jugadores entran desde el teléfono y piden app, se construye con criterio y no por corazonada.

#### 4.15.2 Amistades y enemistades entre corredores: sí, pero NO como bonificación

La otra idea del dueño, con sus dudas incluidas: que un ciclista se haga amigo de otro y entonces
entrenen mejor juntos y colaboren mejor en carrera, y que se hagan enemigos por cosas que pasan en
carrera. **Sus dudas están justificadas y la idea es buena.** Las dos cosas a la vez, así que conviene
separar qué falla y qué se salva.

**Lo que falla es la forma de bonificación declarada.** Si «ser amigo de X» da un porcentaje, pasan
tres cosas, las tres malas: todo el mundo se hace amigo de todo el mundo y la bonificación se vuelve
universal, o sea que deja de significar nada; las cuentas múltiples se hacen amigas de sí mismas, que
es la peor combinación posible con lo que §4.1 ya advierte; y entre jugadores reales se forman
carteles indistinguibles de la colusión que E6 tiene que perseguir. Una amistad que se declara con un
botón es una casilla que optimizar.

**Lo que se salva, y es mejor que la idea original, es que la relación se GANE EN LA CARRETERA y
cambie el COMPORTAMIENTO en vez de los números.** Y aquí este motor tiene una ventaja que casi ningún
juego del género tiene: **la cooperación ya es una magnitud simulada**. La fuga tiene un nivel de
cooperación (`breakawayCommitMin/Max`), hay un suceso `break_cooperation` en la crónica, y el motor ya
sabe quién da relevos y quién se guarda. O sea que la pieza sobre la que montar esto **ya está
construida**:

- **La amistad no se declara, se acumula.** Dos corredores que han ido juntos en fugas y se han dado
  relevos cooperan mejor la próxima vez que coincidan delante. No es un porcentaje global: es una
  disposición ENTRE ESE PAR y solo en las situaciones donde la cooperación existe.
- **La enemistad es el mismo mecanismo con el signo cambiado, y es mejor drama.** El que nunca te da
  un relevo, el que te cerró el hueco, el que te tiró al suelo. La consecuencia es que la próxima vez
  no trabajas con él aunque os convenga a los dos, que es exactamente lo que pasa en el ciclismo real
  y lo que produce las mejores historias del deporte.
- **Se pega a lo que ya se está diseñando.** N4 propone rasgos que se descubren corriendo; esto es lo
  mismo aplicado a pares en vez de a individuos. Y G2.12 (relaciones entre corredores) ya estaba
  dentro de E8, pero planteado como vestuario de equipo; esto lo extiende al pelotón entero, que es
  donde el ciclismo pone sus alianzas: **entre rivales**, no entre compañeros.

**Por qué así es mucho más difícil de explotar:** no hay botón que pulsar, hace falta coincidir de
verdad en carrera muchas veces, el efecto solo existe en situaciones concretas (fuga, persecución,
abanico) y es visible en la crónica, o sea auditable. Una relación fabricada deja rastro de haberse
fabricado, que es justo lo que E6 necesita para distinguir amistad de cartel.

**Riesgo que hay que nombrar:** con muy pocos jugadores humanos, dos personas coincidirán en fuga una
vez cada muchas semanas, así que la mecánica tardará temporadas en encenderse entre humanos. Entre
humanos y bots funcionaría desde el primer día, y eso está bien: tu rival de siempre puede ser un bot,
y el jugador no tiene por qué notar la diferencia.

#### 4.15.3 El que se va y no vuelve: el mundo no lo sabe

Comprobado en el esquema: **no hay ni un solo rastro de actividad**. Ni `last_seen`, ni `last_login`,
ni nada equivalente en `users` ni en `riders`. En un mundo único y permanente eso es un agujero de
verdad, y no uno estético:

- Un corredor humano abandonado **sigue ocupando una plaza de plantilla** para siempre, cobrando
  salario, apareciendo en convocatorias y bloqueando el sitio de alguien que sí juega.
- Peor: **un mánager que desaparece deja un equipo sin nadie al mando**. G2.14 contempla «qué pasa
  cuando alguien lo deja», que es una salida voluntaria. Lo que no contempla nadie es la salida
  silenciosa, que es la forma en que la gente se va de verdad de los juegos.
- Y G8 (limpiar bots según lleguen humanos) está pensado para bots. El humano inactivo es el caso
  contrario y no tiene política ninguna.

Hay que decidir qué es inactividad, qué le pasa al corredor (¿se congela? ¿lo lleva el entrenador?
¿se retira?), qué le pasa a su contrato y a su plaza, qué le pasa al equipo de un mánager ausente (la
sucesión), y sobre todo **cómo se vuelve**: alguien que regresa después de tres meses tiene que poder
retomar su carrera deportiva, no encontrarse con que le han borrado la vida. Va en E6, que es el
gobierno del mundo, con la parte de la sucesión del equipo en E8.

#### 4.15.4 No se puede buscar nada

Mil seiscientos corredores, cincuenta y siete equipos, sesenta o setenta carreras por temporada y un
archivo histórico que solo crece, y **no hay buscador**. Ni de corredores, ni de equipos, ni de
carreras. Se navega por índices y rankings o no se llega.

Y falta lo que va con él, que es la mitad de la gracia de un juego persistente: **comparar dos
corredores**, ver el **cara a cara** entre dos que llevan años peleándose, leer el **palmarés
completo** de alguien, consultar una temporada de hace tres años. Los datos están todos (los puntos se
guardan fechados desde la v48 y no se borran nunca), y no hay por dónde leerlos.

No arregla nada roto, así que no adelanta a nadie en la cola, pero es de lo que más profundidad da por
hora invertida y es lo que hace que un mundo parezca un mundo. Entra como **E12**.

### 4.16 Los tres detalles del dueño, que no son tan pequeños

#### 4.16.1 Maillots: el juego tiene tres y le faltan dos, y una choca con el SPEC

El dueño pide tres cosas distintas que conviene separar, porque una es barata, otra es una mecánica
buena y la tercera tiene un problema legal que él mismo escribió.

**Lo que hay hoy, comprobado.** `packages/shared/src/jerseys.ts` define exactamente **tres** maillots
(`JerseyKind = 'gc' | 'points' | 'kom'`), y el propio fichero explica por qué son baratos: «no hay
dato nuevo que guardar: quién lleva cada maillot es una CONSULTA sobre las clasificaciones que ya
existen». Eso es cierto para los tres y **es justo lo que NO vale para los que faltan**.

**El maillot de campeón es de otra naturaleza y por eso es trabajo de verdad.** Un campeón nacional o
mundial lleva su maillot **durante un año entero y en todas las carreras**, o sea que no es una
consulta sobre la clasificación de la carrera de hoy: es un **título persistido** que hay que guardar,
caducar al año y consultar en cualquier carrera. Tabla nueva, no función pura. Y con sus reglas de
disciplina, que el diseño tiene que fijar: el campeón del mundo de contrarreloj lleva el suyo en las
cronos y no en las carreras en línea, y lo mismo con los nacionales.

**Y la buena noticia: el campeón nacional YA EXISTE y el juego lo olvida.** El calendario corre
campeonatos nacionales de verdad (`championshipCountry` en `routes/calendar.ts`, clase de carrera
`NC`), así que cada temporada hay un campeón de Italia y el juego no se acuerda de él al día
siguiente. Convertir eso en un maillot que se lleva un año es de lo más barato que queda en la lista.

**Lo que NO encontré: el Campeonato del Mundo.** `SPEC.md` §8 lo promete («Campeonato del Mundo en
septiembre, selecciones NPC en v1») y en el calendario solo aparecen los nacionales. Puede que se me
haya escapado, pero conviene comprobarlo, porque el maillot arcoíris no puede existir sin la carrera
que lo reparte. Va con §4.10 (selecciones nacionales) en E11.

**El choque con el SPEC, y es literal.** `SPEC.md` §8 prohíbe «imitar logotipos, tipografías o
identidades visuales de las carreras reales», y enumera tres ejemplos: «el amarillo con serifa
característica, el rosa de la corsa, **el arcoíris del campeón del mundo**». O sea que el maillot que
el dueño pide por su nombre es exactamente uno de los tres que su propia especificación prohíbe
copiar. Esto **no mata la idea**, la obliga a ser mejor: hay que inventarle al campeón del mundo de
este juego su propia señal visual, reconocible de un vistazo y que no sea el arcoíris. Es trabajo de
E2 y es de las pocas decisiones de identidad que el jugador va a mirar mil veces.

**El maillot del equipo: hoy nadie lo diseña, se sortea.** `teams.jersey_seed` es una SEMILLA, y
`TeamIdentity.tsx` solo pinta `<Jersey seed={...} />`. O sea que el maillot de un equipo es
procedural y su dueño no elige nada. Que un mánager pueda diseñar el suyo es una de las cosas que
más apego genera en estos juegos y es trabajo de E2 (el editor y el vocabulario visual) y de E8 (quién
puede tocarlo y con qué moderación, porque un maillot es contenido de usuario como un nombre).

**Y ceder el maillot a un patrocinador por dinero es la mejor de las tres ideas.** Que un
patrocinador pague por imponer su color o por llevar su logotipo en el sitio bueno convierte la
identidad visual en una **decisión económica con coste real**: cobras más y dejas de parecerte a ti
mismo. Eso es exactamente el conflicto que vive un equipo de verdad, es gratis de justificar y
engancha con G2.7 y G2.8, que ya están en E7. Va allí, con la parte visual en E2.

**Y la petición que lo une todo, que es de E1:** cuando se escapan cinco, que se vean sus maillots.
Es literalmente lo que hace la televisión con el rótulo de cada corredor, es la diferencia entre «se
escapan cinco» y «se escapa el campeón de Italia con cuatro más», y necesita las cinco categorías
resueltas (los tres de clasificación, el de campeón y el del equipo).

#### 4.16.2 Herramientas de administración: sí, y con una advertencia

Pedido: herramientas buenas y completas de administración, baneo, prohibir nombres de equipos. Va
entero en **E6**, y el documento tiene que cubrir al menos: suspender y expulsar cuentas con motivo y
duración, prohibir y revertir nombres (de equipo y de corredor, con la lista de bloqueo que ya existe
en `blocklist.ts` y la pantalla `AdminNames.tsx` como punto de partida), forzar el cambio de un
nombre ya aceptado, atender denuncias con su cola y su respuesta, ver la ficha completa de una cuenta
(sesiones, corredores, equipo, historial de sanciones), fusionar o marcar cuentas sospechosas de ser
la misma persona, y operar el mundo (tick manual, salud, inspección de una etapa).

**La advertencia:** todo eso hoy está detrás de **un único `ADMIN_TOKEN` compartido por cabecera**, y
la columna `users.is_admin` no se lee en ninguna consulta del repositorio. Construir más herramientas
sobre ese cimiento multiplica el riesgo en vez del control: cuantas más cosas pueda hacer el token,
peor es que sea uno solo, que no deje rastro de quién lo usó y que revocárselo a una persona obligue a
cambiárselo a todas. **Primero los roles y el registro de auditoría, y encima las herramientas.** Es
el mismo orden que el resto de E6 y por la misma razón.

#### 4.16.3 El gregario: el dueño tiene razón, y el código ya lo sabía a medias

La duda era si tiene sentido que alguien elija ser gregario al crear su ciclista, «porque
difícilmente alguien es ciclista PARA ser gregario: otra cosa es que acabe siéndolo porque no llegó a
ser el líder». **La intuición es correcta y además el código ya está medio de acuerdo**, lo que hace
la pregunta más interesante y no menos.

**Lo que ya está bien: el jugador NO puede elegirlo.** `VOCATIONS` en `packages/shared/src/rider.ts`
son cinco (`escalada`, `velocidad`, `clasicas`, `crono`, `fondo`) y `gregario` no está entre ellas.
`CreateRider.tsx` ofrece esas cinco. O sea que el problema que el dueño teme no existe en la pantalla
de creación.

**Lo que está mal es más profundo: `gregario` existe en DOS vocabularios a la vez.** Es uno de los
ocho `RiderArchetype` (lo que ERES, de nacimiento, con sus penalizaciones de techo) y es también uno
de los siete `StageRole` (lo que HACES hoy, que es lo que el dueño describe como destino y no como
vocación). Tener la misma palabra en los dos sitios es lo que produce la confusión, y **sobra en el
primero**: nadie nace gregario, uno acaba siéndolo.

**Y esto no es teoría, el motor ya está pagando el precio y lo tiene escrito.** El comentario del
arquetipo `gregario` en `rider.ts` dice, con sus números: el requisito del dueño de que «tampoco se
quede nadie sin pasar de 4 en nada» **choca de frente con un arquetipo que por definición no destaca
en nada**, los gregarios son el 26-32 % del pelotón, y hubo que subirles el mejor techo de −4 a −2
para que llegasen a cuatro estrellas en RES el 60 % de las veces en vez del 53 %. El propio comentario
reconoce que eso **no cierra el requisito** y que la palanca de verdad sería «RES a 0 y bajar la cuota
de gregarios, y ésa es otra decisión».

**Pues ésa es exactamente la decisión que el dueño acaba de tomar por intuición.** Si el gregario deja
de ser un arquetipo de nacimiento y pasa a ser solo un ROL, entonces el 26-32 % del pelotón nace con
una vocación de verdad (escalador flojo, rodador del montón, esprínter que no gana) y acaba de
gregario **por nivel y no por destino**, que es lo que pasa en la carretera. El requisito de las
cuatro estrellas deja de chocar con nada, porque ya no hay nadie condenado a no destacar en nada.

**Dónde va:** el diseño en **E10** (la vida del corredor), porque es la pregunta de qué es un corredor
y cómo cambia lo que es a lo largo de su carrera. La ejecución toca el motor, o sea la otra línea, y
por eso conviene que la decisión esté escrita antes de que esa línea termine.

## 5. El catálogo de diseños

Veinte documentos. Los códigos son nuevos (`D`) para no chocar con los `G` y `N` de `epics.md`. El
tamaño se mide contra los dos que ya existen: **XL** es `docs/tactica.md` (6.340 líneas), **L** es
`docs/entrenamiento.md` (1.567), **M** es `docs/navegacion.md`, **S** es una nota de dos páginas.

### Capa modelo

| Código | Diseño                   | Qué contesta                                                                                                     | Cubre               | Depende de  | Tamaño |
| ------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------- | ----------- | ------ |
| **D1** | El juego entre personas  | Mando, jerarquía, convocatorias, promesas, disciplina, vestuario, canales, la silla del mánager y SER MANDADO    | G2 entero, G7       | 3.5, D5, D6 | XL     |
| **D2** | Las dos economías        | El dinero del juego (premios, primas, patrocinio, presupuesto, mercado) y dónde está su frontera con el real     | G2.5 a G2.8, SPEC 9 | 3.3         | L      |
| **D3** | El corredor como alguien | Rasgos elegidos con contrapartida, rasgos que emergen corriendo, y qué le debe el mundo al jugador cuando cambia | N4, §4.4            | ninguno     | M      |

### Capa integridad

| Código | Diseño                      | Qué contesta                                                                                          | Cubre          | Depende de | Tamaño |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------- | -------------- | ---------- | ------ |
| **D4** | Identidad y cuenta          | Verificación, recuperación, cambio de correo, sesiones, límites de intento, segundo factor            | G11            | 3.2        | M      |
| **D5** | Integridad competitiva      | Multicuentas, colusión, transferencias, automatización: qué se detecta, qué se limita, qué se castiga | §4.1           | D4         | L      |
| **D6** | Administración y moderación | Roles reales frente al token compartido, auditoría, denuncias, respuesta, herramientas                | SPEC 7.1, §4.6 | D4         | M      |

### Capa infraestructura

| Código  | Diseño                     | Qué contesta                                                                             | Cubre              | Depende de | Tamaño |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------- | ------------------ | ---------- | ------ |
| **D7**  | Multiidioma                | Qué se traduce, quién traduce, cómo se traduce el texto GENERADO, y el arreglo de `news` | §3.1               | 3.1        | M      |
| **D8**  | Notificaciones y ausencia  | Qué se avisa, por dónde, con qué baja, y qué pasa cuando el jugador no está              | §4.3               | D4, N1     | M      |
| **D9**  | Pagos y cumplimiento       | Qué se vende, cómo se cobra, impuestos, reembolsos, y qué pasa si el mundo cambia        | §3.3               | D2, 3.3    | M      |
| **D10** | Escala, mundos y archivado | Un mundo o varios, qué se archiva, qué cuesta un día de juego dentro de dos años         | §3.4, §4.8, N6     | 3.4        | M      |
| **D11** | Analítica de producto      | Qué se mide, con qué respeto por la privacidad, y qué decisión desbloquea cada medida    | §4.7               | ninguno    | S      |
| **D12** | Legal y privacidad         | Datos, edad mínima y menores, condiciones, contenido de usuario, marca                   | SPEC 8, §3.7, §4.9 | 3.6, 3.7   | M      |

### Anexo a D7: qué idiomas, y por qué no son ocho

Respuesta 4: español, portugués, francés, alemán, italiano, ruso y chino, traducidos por Claude.
Antes de la recomendación, **el número que cambia la conversación**, medido en el repositorio:

| Superficie             | Tamaño                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Sucesos de crónica     | **48 tipos** (`EVENT_ORDER` en `apps/api/src/chronicle.ts`)                                                   |
| Redacciones de crónica | 54 en `narration.ts` (19 tipos) y el resto en `stageJournal.ts`, que solo él tiene **616 literales de texto** |
| Tipos de noticia       | 11 (`packages/engine/src/world/news.ts`)                                                                      |

O sea que el texto GENERADO ya está en varios cientos de frases, y crece con cada versión del motor.
Eso está antes de contar una sola etiqueta de interfaz.

**Y aquí va el problema que hace que «traducción 100 % Claude» sea media respuesta.** Las plantillas
no se traducen, **se reescriben por idioma**, porque meten nombres propios dentro de la frase y cada
lengua los trata distinto:

- **Género y concordancia.** En español, «ha sido cazado» o «cazada» depende del corredor. En la
  crónica, el sujeto es un nombre generado por el servicio de nombres del juego, en decenas de países.
- **El ruso es de otra categoría.** Además del género, **declina los nombres propios**: el mismo
  corredor aparece en nominativo, genitivo y acusativo según la frase, y eso no es traducir, es
  morfología por nombre. Un sistema de plantillas que interpola cadenas no puede hacerlo bien.
- **El chino tiene el problema inverso y también caro**: no hay declinación, pero sí transcripción de
  nombres occidentales, orden de frase muy distinto y tipografía propia.

Claude traduce excelentemente una interfaz, y puede **escribir** las plantillas de cada idioma como
autor nativo, que es lo que de verdad hace falta. Lo que Claude no arregla es lo de después: cada
suceso nuevo del motor son N idiomas de texto nuevo, para siempre.

**La recomendación, ya negociada con las objeciones del dueño:**

| Tanda | Idiomas                                                             | Por qué                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Inglés (ya está), **español, francés, italiano, alemán, portugués** | Los cinco grandes del ciclismo europeo. El dueño los quiere dentro y tiene razón: son la base del deporte y los cinco caben en el mismo sistema de plantillas sin sorpresas gramaticales |
| 2     | **Neerlandés**                                                      | Discutido en D7.1                                                                                                                                                                        |
| 3     | **Chino**                                                           | Por delante del danés y el polaco, con la condición de D7.3                                                                                                                              |
| —     | **Ruso**                                                            | Aplazado sin fecha (D7.2)                                                                                                                                                                |
| —     | Danés, polaco, esloveno, noruego                                    | Por demanda medida, no por intuición                                                                                                                                                     |

**D7.1 · El neerlandés y el argumento «los holandeses saben inglés».** Es cierto y sigo sin estar de
acuerdo, aunque acepto que la decisión es tuya y no un error. Saber un idioma y **jugar** en él son
cosas distintas: uno lee un menú en inglés sin pestañear y abandona un texto largo en inglés cuando
podía leerlo en el suyo, y este juego es texto largo (crónicas de etapa, noticias, negociaciones).
Ojo además a la asimetría del argumento: los holandeses saben inglés, **los flamencos también, y los
italianos bastante menos**, o sea que ese mismo razonamiento pondría el italiano por delante del
neerlandés, que es justo lo que tú propones. O sea que el argumento es coherente contigo, no conmigo.
Lo defiendo en la tanda 2 y no peleo más.

**D7.2 · El ruso, aplazado, y no solo por demanda.** Declina los nombres propios. Un sistema que
interpola cadenas no puede producir ruso correcto sobre nombres generados, así que no es «un idioma
más»: es reescribir el mecanismo de plantillas para que entienda casos gramaticales.

**D7.3 · El chino: la objeción del dueño es buena y la acepto a medias.** El argumento era que los
ciclistas chinos son pocos pero los jugadores chinos de internet son muchísimos. Como argumento de
mercado es correcto y mejor que el mío, así que **retiro «poca base ciclista» como razón principal**:
pesa, pero no decide.

Lo que sigue en pie son dos obstáculos que no son de demanda:

- **Alcanzabilidad.** Un servicio alojado en Europa y sin presencia dentro de China se sirve lento o
  no se sirve, y eso no se arregla traduciendo. Antes de invertir en chino hay que comprobar que el
  juego **se puede jugar** desde allí con latencia decente. Si no, la traducción no sirve de nada.
- **Moderación.** Con chat de equipo, un idioma que nadie de la casa lee es un punto ciego. Es
  resoluble, pero se resuelve con una persona, no con una traducción.

Y dos detalles prácticos: hay que elegir entre simplificado y tradicional, y el chino rompe supuestos
tipográficos de la interfaz (sin espacios entre palabras, corte de línea distinto). Nada insalvable.

Conclusión: **chino sí, por delante del danés y el polaco como pides, en la tanda 3 y después de
comprobar la alcanzabilidad.**

**Y la manera barata de no equivocarse: mide antes de traducir.** Ya tienes detección de país por IP
en el servidor (`geoIp.ts`, arreglada en la v14 del calendario) y el navegador manda `Accept-Language`
en cada petición. Guardar esos dos datos en el registro cuesta una tarde y dentro de tres meses te
dice, con tus jugadores de verdad y no con mi intuición, qué idiomas hacen falta. Es exactamente el
tipo de decisión que D11 (analítica) existe para desbloquear.

### Capa lectura

| Código  | Diseño                  | Qué contesta                                                                                                                | Cubre             | Depende de | Tamaño |
| ------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------- | ------ |
| **D13** | La retransmisión        | Race Radio y journal rehechos con la TELEVISIÓN como norte: estado vivo en vez de lista, y el MODO SIN DESTRIPE por defecto | tu punto 6, §4.14 | 3.1        | L      |
| **D14** | La experiencia, v4      | Arquitectura de información después de D13, móvil de verdad, accesibilidad                                                  | navegacion.md     | D13        | M      |
| **D15** | Aprender a jugar        | Tutorial, ayuda contextual, y sobre todo los primeros treinta días                                                          | §4.2              | D13        | M      |
| **D16** | Transparencia del motor | Notas de versión para jugadores, y «por qué perdí» sobre el replay sellado                                                  | §4.4, §4.5        | D13        | S      |
| **D21** | El sistema visual       | Tipografía, color, densidad, jerarquía, componentes y estados. El rediseño gráfico general                                  | §4.14             | ninguna    | M      |

### Capa contenido

| Código  | Diseño                    | Qué contesta                                                           | Cubre         | Depende de | Tamaño |
| ------- | ------------------------- | ---------------------------------------------------------------------- | ------------- | ---------- | ------ |
| **D17** | Recorridos y calendario   | El generador, los perfiles falsos, y de dónde sale el material honesto | G5, G6        | ninguno    | L      |
| **D18** | Selecciones nacionales    | Convocatoria de país, Mundial y campeonatos nacionales con humanos     | SPEC 8, §4.10 | ninguno    | S      |
| **D19** | Fin de temporada y legado | Ceremonia, qué permanece, y la segunda carrera deportiva del jugador   | N2, §4.11     | ninguno    | M      |
| **D20** | Identidad visual y marca  | Nombre, logotipo, maillots, y la verificación en EUIPO y USPTO         | SPEC 8, 3.6   | 3.6        | M      |

---

## 6. Orden propuesto

### Oleada 0 · Antes del reset

Ya no es «ahora» sino «antes del reset», que es una fecha de verdad y no una prisa vaga. Son
decisiones y cambios pequeños, y el reset es el último momento en que salen baratos.

1. **Arreglar el esquema de `news`** (guardar `seed` y `data`, renderizar al leer). Una migración
   (§3.1).
2. **Dominio de correo** verificado en Resend, con el subdominio transaccional separado. **Esta no
   espera al reset**: la reputación de envío lo cruza intacta (§3.2).
3. **Marca** verificada en EUIPO y USPTO. Tampoco la indulta el reset (§3.6).
4. **Edad mínima** escrita en las condiciones (§3.7, recomendación: 16).
5. **La regla de cuándo entran los cambios de motor** (§4.4). Una línea.
6. **La lista de «lo que solo se puede cambiar en el reset»**, abierta desde hoy y cerrada el día
   antes (§3.4).
7. **D4, identidad y cuenta.** Más ejecución que diseño, y hoy el agujero más feo del producto: sin
   recuperación de contraseña una cuenta perdida es un corredor perdido, y es la primera línea contra
   las multicuentas (§4.1).
8. **Guardar país y `Accept-Language` en el registro.** Una tarde, y dentro de tres meses decide D7
   con datos en vez de con mi intuición (anexo a D7).

### Oleada 1 · La retransmisión y el sistema visual

**D21 y D13 a la vez, luego D16 → D15 → D14.** La primera versión ponía D13 primero y el sistema
visual ni existía; con el rediseño gráfico dentro, los dos primeros van emparejados a propósito: D21
sin D13 es repintar pantallas que no se sabe qué cuentan, y D13 sin D21 es rediseñar la información
para volver a pintarla igual de fea.

Sigue siendo la primera oleada por las mismas razones de antes y una más:

- Hay un motor extraordinariamente trabajado **cuyo detalle no llega al jugador**, y el rediseño
  táctico en curso va a multiplicar lo que hay que contar. Cada versión del motor que pasa sin capa
  de lectura es trabajo hecho y no cobrado.
- No depende de ninguna decisión difícil ni de ninguna otra oleada.
- Es la que más retención compra por hora invertida, y §4.2 dice que la retención es el problema.

Aviso sobre el modo sin destripe, porque es más difícil de lo que parece y no por la pantalla que lo
enseña: exige saber **qué ha visto cada jugador** y que **ninguna otra pantalla se lo reviente por
detrás**. Portada, ranking, feed de noticias, clasificaciones, notificación por correo y hasta el
título de la pestaña del navegador. Es una propiedad del producto entero, no una casilla del journal,
y por eso va dentro de D13 y no después.

### Oleada 2 · El juego entre personas, y la regla que el dueño ya fijó

**D5 y D6 antes o a la vez que D1 y D2**: integridad y moderación antes que el mánager humano.

La pregunta 6 era qué implica eso, y **el dueño la contestó cerrando la discusión con una regla más
dura que la mía**: el mánager es por invitación **hasta que el juego esté acabado**, o sea hasta que
D5 y D6 estén **implementados y probados**, no solo diseñados. Con eso la inversión de orden deja de
ser una discusión y pasa a ser un hecho del calendario, y queda anotado aquí para que nadie la
reabra dentro de seis meses cuando la tentación de abrir el mando llegue disfrazada de crecimiento.

Lo que sigue valiendo la pena escribir es **qué implica y qué no**, porque es lo que se preguntó:

**Lo que NO implica.** No implica no tocar el mánager. G2 en `epics.md` ya tiene el modelo entero y
sus quince componentes, y la pieza técnica (`users.premium` y `teamControl.ts`) ya está enchufada. Un
puñado de probadores de confianza con equipo funciona perfectamente **mientras sean pocos y
conocidos**, porque ahí el portero eres tú.

**Lo que sí implica, en orden de coste.**

1. **Retrasa la apertura, no el diseño.** El momento que se mueve es aquel en que cualquiera puede
   ser mánager, que es justo el que el dueño acaba de atar al final de las pruebas.
2. **Dos diseños medianos por delante del grande.** D5 (integridad) y D6 (administración y
   moderación) suman aproximadamente `entrenamiento.md` más `navegacion.md`. No son `tactica.md`. Y
   D6 es en buena parte trabajo mecánico y no invención: convertir el `ADMIN_TOKEN` compartido en
   roles reales con registro de auditoría.
3. **Obliga a decidir reglas antipáticas antes de que haya víctimas.** Un corredor por persona, topes
   de transferencia, ventanas de mercado, qué se considera colusión. Diseñarlas en frío es incómodo y
   abstracto; diseñarlas en caliente, con un caso real y con la gente mirando, es mucho peor, porque
   toda regla nueva parece dirigida contra alguien.

**Lo que hay que añadir a la regla del dueño**, porque no queda cubierto por ella: las herramientas
de detección de clones (§4.1) **conviene tenerlas funcionando DURANTE las pruebas y no después**. No
por castigar a nadie en fase de pruebas, sino porque sin haberlas visto funcionar contra datos reales
no se sabe qué detectan ni cuántos falsos positivos dan, y el día del lanzamiento es el peor momento
para descubrirlo.

### Oleada 3 · Lo que sostiene

**D7, D8, D9, D10, D11, D12.** Multiidioma (empezando por cuatro y no por siete, ver el anexo),
notificaciones, el único producto de pago, escala, analítica y legal. La mayoría depende de
decisiones ya tomadas en §0.1.

### Oleada 4 · Contenido

**D17, D18, D19, D20.** D17 es grande y es el que más cambia la sensación de que el mundo es real.
D18 es la mejor relación entre emoción producida y trabajo invertido de toda la agenda.

---

## 7. Lo que yo NO haría

- **No escribiría D1 todavía.** Es el documento más apetecible de la lista y el que más se estropea
  esperando. G2 en `epics.md` ya tiene el modelo y los quince componentes: eso basta como brújula
  hasta que haya integridad y moderación debajo.
- **No construiría foro propio.** Ver §4.13.
- **No monetizaría con ventaja deportiva de ningún tipo**, ni siquiera cosmética con efecto. Lo que
  premium compra es mando y trabajo, nunca vatios, y esa frontera no admite una sola excepción
  porque la primera la cita todo el mundo (§3.5).
- **No pondría premium a la venta antes de que existan roles de administrador con auditoría**
  (§6, oleada 2). Cobrar por la autoridad y no poder investigar cómo se ejerce es la peor
  combinación posible.
- **No cobraría nada antes del reset** (§3.3). Es solo calendario, así que hacerlo bien sale gratis.
- **No traduciría la interfaz antes de arreglar `news`** ni de saber qué idiomas hablan los
  jugadores de verdad (anexo a D7).
- **No abriría siete idiomas de golpe.** El coste no es traducir, es mantener cada suceso nuevo del
  motor en siete lenguas para siempre, y moderar dos que nadie de la casa lee.
- **No abriría un segundo mundo.** Decidido en §3.4, y aquí queda como recordatorio para el día que
  la tentación vuelva disfrazada de problema de escala.

---

## 8. Preguntas: lo contestado y lo que queda

Las siete de la primera versión están contestadas y resumidas en §0.1. Lo que queda abierto es esto:

1. **El neerlandés**, tanda 1 o tanda 2 (D7.1). Lo defiendo en la 2 y no peleo más.
2. **Comprobar que el juego se puede jugar desde China** antes de invertir en la traducción (D7.3).
   Es una prueba de una tarde y decide si esa tanda tiene sentido.
3. **La regla de cuándo entran los cambios de motor** (§4.4). Sigue siendo una línea, y si el dueño
   tiene razón en que el motor ya no cambiará, no se dispara nunca. Por eso insisto: es un seguro
   barato, no una desconfianza.
4. **D21 y D13 emparejados en la oleada 1**, con el diseño gráfico dentro y no al final.

---

## Apéndice A · El cuadro de entrenamiento, leído de cerca

El dueño señaló tres cosas de la pantalla de entrenamiento ya implementada: que la parte de arriba
(por semana) y la de abajo (por día) pueden decir cosas distintas sin que se sepa cuál manda, que el
vocabulario de arriba y el de abajo no coinciden, y que no se entiende la lista de
`Day 182 · You'll arrive: Rusty`.

Va aquí, y no como incidencia suelta, porque es **el ejemplo perfecto de lo que D13, D15 y D21
existen para arreglar**: el motor de debajo está bien, las decisiones de diseño están tomadas y
escritas, y aun así la pantalla no se entiende. Todo lo que sigue está comprobado en el código.

### A.1 ¿Qué manda, la semana o el día? El día

La cadena de precedencia está en `packages/db/src/train.ts:199-266` y es ésta, de mayor a menor:

1. **Viaje** (si el corredor está viajando, entrena `viaje` y no hay más que hablar).
2. **La orden del día**, o sea lo que el jugador escribió en «Edit day by day».
3. **El bloque de la semana**, o sea la escalera de arriba.
4. **El plan del equipo**, y solo en modo `mixto`.
5. **El entrenador**, que decide mirando salud, frescura y tensión acumulada.

Con una excepción al final: en modo `manual`, un día sin orden y sin bloque **no cae al entrenador**,
cae a descanso activo, porque quien planifica a mano está diciendo «lo que yo no escriba, no se
entrena».

**O sea que la regla existe, es correcta y es la intuitiva.** Lo que falla es dónde está escrita:
vive en el texto de ayuda del selector de modo (`MODE_WHY` en `PlanLadder.tsx`), que está **en el
panel de arriba**. El jugador que baja al panel de los 28 días no tiene ninguna pista de si lo que
escribe ahí gana o pierde contra la escalera que acaba de configurar.

**Arreglo, y es pequeño:** el panel «Edit day by day» tiene que decir en su cabecera en qué modo
está y qué gana. Una línea del tipo «Modo mixto: lo que escribas aquí manda sobre tus bloques; lo que
dejes en blanco lo decide tu bloque de la semana».

### A.2 Dos vocabularios para lo mismo

Arriba se eligen **bloques** (Base, Build, Specific, Taper, Recovery) con un énfasis y una
intensidad. Abajo se eligen **sesiones** del catálogo y una intensidad. Son la misma cosa a dos
granularidades: un bloque se expande a siete sesiones mediante `blockWeek()`.

Pero ese puente es invisible. El jugador elige «Build» arriba y abajo ve siete sesiones con nombres
que no ha escrito nunca y que no sabe de dónde salen. **Arreglo:** que los días generados por un
bloque se enseñen marcados como tales («viene de tu bloque Build»), distinguibles de los que él
escribió. Es la diferencia entre una pantalla que se contradice y una que se explica sola.

### A.3 `You'll arrive: Rusty`, o la lista que no dice de qué habla

Esto no es un error del jugador, son **tres defectos apilados** en la misma lista:

**Primero: falta el nombre de la carrera, y falta por decisión del servidor.** Cada fila de esa lista
es un **día de carrera** dentro de las cuatro semanas del plan. Y la API la construye así, en
`apps/api/src/routes/riders.ts:376-383`:

```ts
return { gameDay: d, raceId: null, tsb, label: arrivalLabel(tsb) }
```

El campo `raceId` **existe y se manda a `null` siempre**. O sea que la pantalla no puede nombrar la
carrera ni queriendo: no la recibe. Por eso lees «Day 182» y no «Race Wallonia, etapa 2».

**Segundo: una carrera por etapas inunda la lista.** Los días 182, 183, 184 y 185 son casi con
seguridad cuatro etapas de la misma carrera, y los 191 a 193 otra. La lista pinta **una fila por
etapa**, repitiendo la misma palabra cuatro veces, cuando lo que el jugador quiere leer es «a la
Race X, que empieza el 182, llegas así». Debería agruparse por carrera.

**Tercero: `Rusty` significa lo contrario de lo que parece.** Las cinco etiquetas salen de
`arrivalLabel(tsb)` en `packages/engine/src/training/projection.ts:75`, y son una escala de frescura
(TSB) con dos extremos malos y un punto bueno en medio:

| TSB          | Etiqueta    | Qué significa de verdad                                |
| ------------ | ----------- | ------------------------------------------------------ |
| más de +25   | **Rusty**   | Demasiado fresco: has entrenado POCO, llegas sin ritmo |
| +5 a +25     | **Spot on** | El punto óptimo                                        |
| −10 a +5     | **Fine**    | Bien, con algo de fatiga encima                        |
| −30 a −10    | **Loaded**  | Cargado de fatiga                                      |
| menos de −30 | **Cooked**  | Fundido                                                |

Los cortes son correctos y están bien razonados (son los del `tsbFactor` del SPEC 4.1, o sea la misma
curva con la que el TSB se convierte en rendimiento dentro de la carrera, precisamente para que la
pantalla no diga «perfecto» de un TSB que la carrera castiga). **El problema es de presentación:**
cinco palabras sueltas, sin escala y sin orden visible, no comunican que `Rusty` y `Cooked` son los
dos extremos opuestos y que `Spot on` está en medio. El jugador lee «oxidado» y entiende «voy mal»,
sin saber si va mal por exceso o por defecto, ni hacia dónde mover el plan.

Y en este caso concreto la respuesta era **por defecto**: un plan con los cuatro bloques a `null`
entrena poquísimo, el TSB se dispara por encima de +25 y llegas a todas las carreras sin ritmo. La
pantalla tenía la información exacta para decirlo y no la dijo.

**Arreglo:** una escala visual de cinco tramos con tu posición marcada, en lugar de una palabra
suelta. Es literalmente el mismo dato pintado de otra forma, y convierte una etiqueta desconcertante
en una instrucción («estás pasado de fresco, entrena más»).

### A.4 Lo que este apéndice demuestra

Tres defectos de comprensión sobre un motor que está bien, decisiones de diseño que están tomadas y
documentadas, y una pantalla que aun así no se entiende. Ninguno de los tres se arregla con más
motor. Los tres son **exactamente** lo que las oleadas 1 y 2 del catálogo existen para arreglar, y
por eso la capa de lectura va primera.

**Dónde se arreglan:** este cuadro es el **examen práctico de E2** (el sistema visual) en
[docs/encargos.md](./encargos.md), por decisión del dueño y con buen criterio: una pantalla ya
implementada, con el motor correcto debajo, que aun así no se entiende, es el mejor banco de pruebas
que puede tener un sistema visual. El punto de la precedencia invisible se solapa con E5, y eso está
bien: de E2 sale la solución visual y de E5 dónde vive la explicación.

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
| 3   | ¿Los mánagers se eligen?       | **Cuenta premium.** Primero REGALADA a los mejores probadores, comprable más adelante                                                                       |
| 4   | ¿Qué idiomas?                  | Abierta a recomendación. Traducción 100 % por Claude. Ver D7                                                                                                |
| 5   | ¿Edad mínima?                  | Abierta a recomendación. Ver §3.7 y D12                                                                                                                     |
| 6   | ¿Integridad antes que mánager? | Pendiente de entender el coste. Ver §6.1                                                                                                                    |
| 7   | ¿Qué le debemos al jugador?    | Pendiente. Ver §4.4, que ahora la plantea con opciones                                                                                                      |

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

| Capa                                  | Qué decide                                      | Qué cae aquí de tu lista             | Qué falta                                                                                |
| ------------------------------------- | ----------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Modelo**: qué es el juego           | Las reglas entre personas                       | Mánagers humanos, sociales, economía | Identidad del corredor (N4), el contrato del mundo con el jugador                        |
| **Integridad**: qué lo hace habitable | Que el modelo no se envenene                    | Admins y moderación, correo          | Anti multicuenta, colusión, auditoría de admin, seguridad de cuenta                      |
| **Infraestructura**: qué lo sostiene  | Lo que no cambia el juego pero lo hace operable | Multiidioma, economía real (pagos)   | Notificaciones, analítica, escala y archivado, legal y privacidad                        |
| **Lectura**: qué percibe el jugador   | Que el trabajo del motor se NOTE                | News + radio + journal, UX, tutorial | Accesibilidad y móvil, notas de versión, auditabilidad del resultado                     |
| **Contenido**: de qué está hecho      | El material sobre el que corre todo             | (nada)                               | Recorridos (G5, G6), selecciones nacionales, fin de temporada y legado, identidad visual |

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

### 3.2 El dominio de correo: esta el reset NO la indulta

Sigue siendo la más urgente de todas, y ahora destaca precisamente porque las demás se han relajado.
**La reputación de envío no vive en tu base de datos**, vive en los servidores de Google y Microsoft,
y un reset del mundo no la borra. Si durante las pruebas se envía desde un dominio que acumula
quejas, ese daño cruza el reset intacto.

Recomendación sin cambios respecto a G11: subdominio dedicado en `rubio.pt`
(`no-reply@cyclingstar.rubio.pt`) para la fase de pruebas, dominio propio para la versión final,
`hereistand.app` descartado. Y separar desde el primer día el correo TRANSACCIONAL del de
NOTIFICACIÓN, aunque al principio solo exista el primero.

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

**Mi recomendación, y difiere de tu lista en tres sitios:**

1. **Añade el neerlandés.** Es la ausencia más llamativa. Bélgica y Países Bajos son el corazón
   demográfico de este género y de este deporte, y la base de jugadores de los juegos de ciclismo por
   navegador ha salido históricamente de ahí. Si solo pudieras hacer un idioma además del inglés,
   discutiría en serio que fuese el neerlandés antes que el español.
2. **Aplaza el ruso y el chino.** No por desprecio: por coste. Son los dos que rompen el sistema de
   plantillas, los dos con menos base ciclista relativa, y los dos que **no podrías moderar** (§4.6),
   porque ni tú ni tus primeros moderadores los leen. Un canal de equipo en un idioma que nadie de la
   casa entiende es un punto ciego, y con edad mínima de 16 y chat abierto eso pesa.
3. **Empieza por cuatro, no por siete.** Inglés (ya está), **español**, **neerlandés** y **francés**.
   Luego italiano, alemán y portugués por este orden. Danés, polaco, esloveno y noruego son los
   siguientes candidatos naturales del ciclismo y ninguno urge.

**Y la manera barata de no equivocarse: mide antes de traducir.** Ya tienes detección de país por IP
en el servidor (`geoIp.ts`, arreglada en la v14 del calendario) y el navegador manda `Accept-Language`
en cada petición. Guardar esos dos datos en el registro cuesta una tarde y dentro de tres meses te
dice, con tus jugadores de verdad y no con mi intuición, qué idiomas hacen falta. Es exactamente el
tipo de decisión que D11 (analítica) existe para desbloquear.

### Capa lectura

| Código  | Diseño                  | Qué contesta                                                                         | Cubre         | Depende de | Tamaño |
| ------- | ----------------------- | ------------------------------------------------------------------------------------ | ------------- | ---------- | ------ |
| **D13** | La capa de lectura      | Qué es noticia, qué es radio, qué es crónica, qué es informe, y el MODO SIN DESTRIPE | tu punto 6    | 3.1        | L      |
| **D14** | La experiencia, v4      | Arquitectura de información después de D13, móvil de verdad, accesibilidad           | navegacion.md | D13        | M      |
| **D15** | Aprender a jugar        | Tutorial, ayuda contextual, y sobre todo los primeros treinta días                   | §4.2          | D13        | M      |
| **D16** | Transparencia del motor | Notas de versión para jugadores, y «por qué perdí» sobre el replay sellado           | §4.4, §4.5    | D13        | S      |

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

### Oleada 1 · La capa de lectura

**D13 → D16 → D15 → D14**, en ese orden. Razón: hay un motor extraordinariamente trabajado cuyo
detalle no llega al jugador, y el rediseño táctico en curso va a multiplicar lo que hay que contar.
Es la oleada que hace que todo el trabajo del motor se NOTE, no depende de ninguna decisión difícil
y es la que más retención compra por hora invertida. Aquí entra tu modo sin destripe, y aviso de que
es más difícil de lo que parece: exige saber **qué ha visto cada jugador** y que ninguna otra
pantalla (portada, ranking, feed, notificación) se lo reviente por detrás.

### Oleada 2 · El juego entre personas, y qué implica de verdad la inversión

**D5 y D6 antes o a la vez que D1 y D2**: integridad y moderación antes que el mánager humano.

La pregunta 6 era qué implica eso, y la respuesta honesta tiene tres partes.

**Lo que NO implica.** No implica no tocar el mánager. G2 en `epics.md` ya tiene el modelo entero y
sus quince componentes, y la pieza técnica (`users.premium` y `teamControl.ts`) ya está enchufada. Un
puñado de probadores de confianza con equipo puede seguir funcionando **mientras sean pocos y
conocidos**, porque ahí el portero eres tú.

**Lo que sí implica, en orden de coste.**

1. **Retrasa la apertura, no el diseño.** El momento que se retrasa es aquel en el que **cualquiera**
   puede ser mánager: cuando premium sea comprable, o cuando haya suficientes jugadores como para que
   dejes de conocerlos por su nombre. Hasta ahí, el orden apenas se nota.
2. **Dos diseños medianos por delante del grande.** D5 (integridad) y D6 (administración y
   moderación) suman aproximadamente lo que `docs/entrenamiento.md` y `docs/navegacion.md` juntos. No
   son `tactica.md`. Y D6 es en buena parte trabajo mecánico, no invención: convertir el
   `ADMIN_TOKEN` compartido en roles reales con registro de auditoría.
3. **Obliga a decidir reglas antipáticas antes de que haya víctimas.** Un corredor por persona, topes
   de transferencia, ventanas de mercado, qué se considera colusión. Diseñarlas en frío es incómodo y
   abstracto; diseñarlas en caliente, con un caso real y con la gente mirando, es mucho peor, porque
   toda regla nueva parece dirigida contra alguien.

**El coste de NO invertir el orden**, que es la otra mitad de la respuesta: si el mánager humano se
abre antes, la primera partida de abusos ocurre sin herramientas. Sin auditoría no sabes qué pasó,
sin roles no puedes delegar la investigación, y sin reglas escritas cualquier sanción es arbitraria.
Y hay algo peor que el daño: **la primera cohorte fija la cultura** (§3.5), así que un abuso temprano
sin respuesta no es un incidente, es un precedente.

**Mi propuesta concreta, que creo que te cuesta poco:** mantén el mánager por invitación mientras se
diseñan D5 y D6, y pon la condición explícita de que **premium no se pone a la venta hasta que
existan roles de administrador con auditoría**. Así no retrasas nada de lo que estás haciendo hoy y
no llegas desnudo al día que importa.

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

Las siete de la primera versión están en §0.1 con su respuesta. Quedan tres en pie, y son las tres
que ya no dependen de mí:

1. **¿Aceptas 16 como edad mínima** (§3.7), sabiendo que el coste es perder a los jugadores de 13 a
   15 y que la decisión es reversible hacia abajo pero no hacia arriba?
2. **¿Empezamos por cuatro idiomas** (inglés, español, neerlandés, francés) **en vez de por siete**, y
   dejamos que los datos de registro decidan los siguientes (anexo a D7)?
3. **¿Los cambios de motor entran en cualquier momento o solo en el rollover** (§4.4)? Es una línea y
   hay que escribirla antes de que el rediseño táctico aterrice.

Y una que no es pregunta sino aviso: **«los mejores probadores» hay que definirlo antes de regalar
la primera cuenta premium** (§3.5). Quien más ha aportado, no quien mejor ha corrido.

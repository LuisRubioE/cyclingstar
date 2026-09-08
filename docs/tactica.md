# Repensar la táctica de carrera

> «A ver, lo de las tácticas en la carrera… es que vas dando palos de ciego, te digo una cosa y pones
> un parchecito, pero no arreglas el problema real. Yo creo que tienes que hacer un break y REPENSAR
> TODA la lógica de todas las situaciones que pueden ocurrir en carrera y hacer unas NUEVAS reglas y
> con eso rehacer el motor (la parte táctica), porque ahora mismo está todo del NAAAAABO.»

Este documento es esa parada. No propone un arreglo: propone el modelo que hoy no existe, dice qué
hay ya construido que sirve, y deja el orden en que habría que hacerlo. **Nada de aquí se implementa
hasta que el dueño lo lea**, porque la mitad de lo que sigue son decisiones de diseño y no de código.

---

## 1. El diagnóstico, en una frase

**Un corredor de este motor no sabe con quién corre.**

No es una metáfora. `packages/engine/src/stage/tactics.ts` —855 líneas donde se decide quién ataca,
cuándo y con qué ganas— **no contiene la palabra `teamId` ni una sola vez**. `finish.ts`, que decide
quién gana, tampoco. El equipo existe en una capa de arriba (`teamPlan.ts`) que reparte papeles y
presupuesto antes de la etapa y le pasa a cada corredor **un número**: `teamAttack`, sus ganas de
atacar corregidas por lo que su equipo esté haciendo.

Un número por corredor. Eso es todo lo que sobrevive del equipo hasta el sitio donde se toman las
decisiones. Y de ahí salen, sin excepción, todos los sinsentidos que el dueño ha ido cazando:

| lo que vio                                                      | lo que le falta al motor                 |
| --------------------------------------------------------------- | ---------------------------------------- |
| Seis del mismo equipo en una fuga de nueve                      | «¿cuántos míos hay ya delante?»          |
| Dos compañeros en una fuga de tres, y gana el otro              | «somos dos contra uno»                   |
| El 81 tira en la fuga del líder, con sus jefes 2.º y 3.º detrás | «¿a quién beneficia esta fuga?»          |
| El equipo del 2.º y 3.º no persigue                             | «lo que va delante me cuesta la general» |
| El líder salta seis o siete veces en un día                     | «un ataque cuesta, y ya he gastado»      |
| El mismo gana dos etapas seguidas                               | «ayer ganó él; hoy le miran»             |

Ninguno es un fallo de una regla. Los seis son **la misma ausencia**, vista desde seis sitios.

---

## 2. Lo que sí está bien construido y no hay que tocar

Rehacer no es tirar. Lo que hay debajo es sólido y este documento se apoya en ello:

- **La física** (SPEC 6.2-6.7): coste por bloque, rebufo por terreno, depósito, erosión, cerillos.
  No se toca nada de esto.
- **El reparto de papeles antes de la etapa** (`teamPlan.ts`): los cuatro motivos —`etapa`,
  `maillot`, `general`, `ninguno`— y las seis intenciones —`perseguir`, `lanzar`, `controlar`,
  `proteger`, `fuga`, `nada`— son un buen vocabulario y están bien derivados de la carrera.
- **El presupuesto de equipo**: cuánta gente puede poner un equipo delante y durante cuánto.
- **La radio de carrera**: hoy es el mejor instrumento de diagnóstico que tiene el proyecto. Todo lo
  que el dueño ha cazado este mes lo ha cazado ahí.

Lo que falta no es más física ni más vocabulario. Es que **ese vocabulario llegue vivo al bloque en
que se decide**, en vez de colapsarse en un escalar.

---

## 3. Las situaciones, y la regla de cada una

El encargo era enumerarlas. Van agrupadas por la pregunta que las decide.

### A. Formar la fuga (los primeros kilómetros)

- **A1. Cupo por equipo.** Un equipo con un hombre delante manda a otro solo si la fuga es grande;
  con dos, no manda a nadie más salvo que sea el equipo del maillot obligado a estar. Hoy el factor
  es **binario y flojo**: `teamAttackUpTheRoad = 0,4`, el mismo con uno delante que con cinco.
- **A2. La fuga la deja ir el pelotón, no solo la hacen los de delante.** Una fuga con seis de un
  mismo equipo no sale, porque los demás no la dejan: la composición es una decisión colectiva.
  Hoy no existe ninguna cuenta de «esta fuga no me vale».
- **A3. Quién NO va a la fuga.** El maillot no se va en la fuga del día; el sprinter puro tampoco.
  Lo primero hoy se cumple a medias y es lo que el dueño vio: el líder saltando seis veces.

### B. Vivir dentro de la fuga

- **B1. Superioridad numérica.** Dos compañeros contra uno: se relevan entre ellos y le hacen
  relevos cortos al rival; y si el rival remata mejor, **uno ataca antes del final** para obligarle
  a elegir. Es literalmente lo que pidió el dueño, y hoy no se puede ni plantear: en una fuga todos
  son desconocidos.
- **B2. Quién no releva.** El que tiene un compañero detrás en el grupo de caza no releva. El que va
  con su jefe delante, tampoco: le espera.
- **B3. A quién beneficia esta fuga.** Un corredor cuyo equipo tiene al 2.º y al 3.º de la general
  **no tira en una fuga con el maillot dentro**: cada segundo que gana esa fuga se lo quita a los
  suyos. Es el caso del dorsal 81, y es el más grave de todos porque el motor hace justo lo
  contrario de lo que la carrera pide.

### C. El pelotón y lo que hay delante

- **C1. Persigue el que pierde.** Si lo que va delante me cuesta la general, persigo aunque no sea
  mi etapa. Existe a medias (`frontThreatDeficit`), pero solo mira al mejor clasificado de la fuga,
  no lo que la fuga le cuesta a MI hombre.
- **C2. No se persigue lo que lleva a un compañero dentro** —salvo el equipo del maillot, y con la
  excepción de la v58: salvo que el de delante sea el propio maillot—. Esto ya está.
- **C3. El equipo del 2.º de la general tiene que atacar, no controlar.** Hoy `controlar` y
  `perseguir` cubren al que defiende; al que va por detrás en la general y necesita moverse no lo
  cubre nadie.

### D. El desenlace

- **D1. Al que ganó ayer se le mira.** En carretera, el que gana una etapa se lleva a todo el mundo
  encima al día siguiente. Hoy el motor no arrastra NADA de un día para otro en lo táctico.
- **D2. El tren y el lanzamiento.** Ya existe y funciona.
- **D3. Marcaje entre favoritos.** Existe (`marcaje.ts`) y es de lo mejor que hay.

---

## 4. Lo que las medidas dicen, y una sorpresa incómoda

Antes de proponer nada se midió, y **el banco no reproduce casi nada de lo que el dueño ve**. Esto
es un hallazgo por sí solo y cambia el orden del plan.

| lo que dijo el dueño                           | medido en el banco                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| «gana el mismo dos etapas seguidas, demasiado» | **1,8 %** de las etapas consecutivas repiten ganador (1 de 57)         |
| «seis del mismo equipo en una fuga de nueve»   | el peor caso del banco es **4 de 20**, y solo en el 0,9 % de las fotos |

Las dos medidas son limpias y las dos dicen «aquí no pasa». O sea que **el defecto vive en lo que la
producción añade y el banco no tiene**: campos pequeños con pocos equipos, la general de verdad,
las órdenes automáticas del día (`autoStageOrders`) y el estado que se arrastra de una etapa a la
siguiente. El banco corre gran vuelta con 176 corredores de muchos equipos; Race Wallonia son nueve
en la fuga y pocos equipos, y ahí seis del mismo equipo es otra distribución.

**Conclusión de método: cualquier regla nueva que se escriba hay que medirla sobre una carrera del
tamaño de las que el dueño mira, no solo sobre la gran vuelta.** Ese banco no existe todavía y es la
primera pieza del plan.

---

## 5. La forma que debería tener el motor táctico

Hoy la decisión de un corredor es una función de su estado y de un escalar de equipo. La propuesta
es que sea una función de **tres contextos**, y que los tres viajen enteros hasta el bloque:

1. **Yo**: piernas, cerillos, depósito, papel, mentalidad, órdenes. _(Ya está.)_
2. **Mi grupo**: quién más va aquí, de qué equipos, quién es mi compañero, quién es el peligro.
   _(No existe.)_
3. **La carrera**: quién va delante, cuánto, qué le cuesta eso a mi hombre en la general.
   _(A medias.)_

Con eso, las reglas de §3 dejan de ser casos especiales y se vuelven consultas al contexto 2 y 3.
No hace falta inventar más física: hace falta **dejar de tirar la información en la frontera**.

El cambio concreto y más pequeño que abre todo lo demás: `MoveRider` y las estructuras del
desenlace llevan `teamId`, y el contexto del grupo lleva el reparto por equipos. Todo lo de §3.B
cuelga de ahí.

---

## 6. En qué orden

1. **Un banco de carrera pequeña.** Sin él no se puede medir nada de esto ni saber si un cambio lo
   arregla. Es la pieza que falta y va primero.
2. **El equipo llega al bloque** (`teamId` en el contexto táctico y en el del desenlace). No cambia
   ninguna conducta por sí solo; lo habilita todo.
3. **§3.A y §3.B3** —el cupo por equipo y «a quién beneficia esta fuga»—, que es el caso más grave y
   el que el dueño ha visto dos veces.
4. **§3.B1** —superioridad numérica dentro de la fuga—, que es lo que pidió con nombre.
5. **§3.C3 y §3.D1** —el que va segundo tiene que atacar, y al de ayer se le mira—, que son los dos
   que hacen que una vuelta se parezca a una vuelta.

---

## 7. Lo que necesita decidir el dueño

Tres cosas que no son mías:

1. **Cuánta memoria arrastra la carrera.** ¿El ganador de ayer va marcado hoy? ¿Cuánto dura eso, un
   día o toda la vuelta?
2. **Cuánto puede un equipo bot desobedecer a su plan.** Un cupo de fuga estricto hace las carreras
   más creíbles y también más previsibles.
3. **Hasta dónde llega el jugador humano.** Todo lo de §3.B son decisiones que un humano querría
   tomar él (¿ataco yo o le lanzo a él?), y eso es diseño de juego antes que de motor.

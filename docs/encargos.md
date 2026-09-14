# Los encargos: qué pedirle a Fable, uno por documento

Estado: **lista de encargos.** Cada punto de aquí es UN documento de diseño por escribir, del tamaño
y con el método de `docs/tactica.md` y `docs/entrenamiento.md`. Ninguno está empezado.

**Los códigos van en el orden en que se van a desarrollar**: E1 primero, E12 último. No es una
etiqueta arbitraria, es el plan.

El catálogo razonado, con las dependencias y el porqué de cada uno, está en
[docs/agenda.md](./agenda.md). Esto es la versión operativa: lo que se encarga, en qué orden y qué
hay que darle a quien lo escriba.

---

## Regla de arranque: aquí todavía no se toca código

Hay **otra línea implementando los cambios de motor que faltan** (la táctica y el entrenamiento
rediseñados). Hasta que eso esté EN PRODUCCIÓN no se abre ni una de estas épicas en el código, y
cuando se abra, lo primero es **descargar la última versión de producción** y trabajar sobre ella.

No es prudencia de más: estas doce épicas tocan la capa de presentación, la API y el esquema, y la
línea del motor está moviendo el motor entero y lo que la API expone de él. Empezar antes garantiza
resolver conflictos sobre código que va a cambiar otra vez.

**Lo que sí se puede hacer ya es ESCRIBIR los diseños**, que es lo que esta lista encarga. Un
documento de diseño no crea conflictos de fusión.

---

## Equivalencia con la numeración anterior

La primera versión de este documento numeraba por temas y no por orden. Si aparece un código antiguo
en algún mensaje o rama, es este:

| Antes | Ahora   | Encargo                                |
| ----- | ------- | -------------------------------------- |
| E1    | **E1**  | La retransmisión                       |
| E2    | **E2**  | El sistema visual                      |
| E7    | **E3**  | La cuenta y el contacto                |
| E11   | **E4**  | La transparencia del motor             |
| E3    | **E5**  | La experiencia general y el primer mes |
| E6    | **E6**  | La integridad y el gobierno del mundo  |
| E5    | **E7**  | La economía del juego                  |
| E4    | **E8**  | El juego entre personas                |
| E8    | **E9**  | El multiidioma                         |
| E9    | **E10** | La vida del corredor                   |
| E10   | **E11** | Los recorridos y el calendario         |

---

## Antes de la lista: tres avisos que ahorran trabajo

**1. No los encargues todos a la vez.** Ya hay 7.900 líneas de diseño escrito y sin implementar. Un
documento escrito hoy y ejecutado dentro de un año se habrá desincronizado del código dos veces antes
de empezar, y este repositorio ya pagó por eso una vez (la lección de B2 en `epics.md`: un documento
que declara un estado falso es peor que no tener documento). **Encarga de dos en dos**, y encarga el
siguiente par cuando el anterior esté implementado o al menos en marcha.

**2. Pide el mismo método que produjo la táctica.** Lo que hace bueno a `docs/tactica.md` no es que
lo escribiera un modelo listo: es el proceso, que está descrito en `docs/diseno/README.md`. Varias
propuestas independientes, jueces con focos distintos, una síntesis sobre la ganadora con los
injertos que pidan los jueces, **refutadores adversarios** que buscan fallos contra el código real, y
una auditoría final que revisa los fallos uno a uno contra el texto. En táctica salieron 86 fallos de
la fase adversaria. Sin refutadores, un documento de diseño es una opinión larga.

**3. Cada encargo tiene que decir qué leer del repositorio.** La diferencia entre un diseño que se
puede implementar y uno que hay que tirar es si conoce el código que va a tocar. En cada punto de
abajo va la lista mínima.

---

## E1 · La retransmisión

**Fichero:** `docs/retransmision.md` · **Tamaño esperado:** grande (como `tactica.md`)

Rehacer de arriba abajo lo que el jugador lee de una carrera: el Race Radio, el journal de etapa, la
crónica y el feed de noticias, con **la retransmisión de televisión como norte** y no como adorno.
Hoy el Race Radio es una lista de frases en orden cronológico, y una retransmisión no es una lista:
es un ESTADO que evoluciona (dónde va cada grupo, con cuánta diferencia, cuánto queda, dónde estamos
del perfil) con sucesos encima. El documento tiene que definir ese estado, decidir qué se enseña
permanentemente y qué solo cuando pasa, y resolver el **modo sin destripe** como modo por defecto y
no como opción: entrar en una etapa debe ser sentarse a verla, no leer el acta. Ojo a lo difícil, que
no es la pantalla: sin destripe exige saber **qué ha visto cada jugador** y que ninguna otra pantalla
se lo reviente por detrás (portada, ranking, clasificaciones, feed, correo de aviso y hasta el título
de la pestaña del navegador), o sea que es una propiedad del producto entero. Tiene a favor que el
motor ya guarda los sucesos estructurados y fechados por kilómetro y por segundo, así que reproducir
una etapa a ritmo es barato: los datos están, lo que falta es no enseñarlos todos de golpe. Y de paso
arregla un defecto de esquema: las noticias se guardan ya redactadas (`news` guarda `kind` y `text`,
sin `seed` ni `data`), lo que las hace intraducibles y no re-renderizables, al revés que la crónica.

**Y un requisito concreto del dueño que es puro lenguaje de televisión: cuando se escapan cinco, que
se vean sus maillots.** No es adorno: es la diferencia entre «se escapan cinco» y «se escapa el
campeón de Italia con cuatro más», que es una carrera distinta. Necesita las cinco categorías
resueltas (los tres de clasificación que ya existen, el de campeón que hay que crear en E2 y E11, y
el del equipo), y es exactamente el rótulo con el que la televisión presenta a cada corredor.

**Qué leer:** `apps/api/src/chronicle.ts` y `raceRadio.ts`, `apps/web/src/domain/narration.ts`,
`stageJournal.ts` y `newsFeed.ts`, `apps/web/src/pages/StageReplay.tsx` y `News.tsx`,
`packages/engine/src/world/news.ts`, la tabla `news` y `stages.radio` en `packages/db/src/schema.ts`.

---

## E2 · El sistema visual

**Fichero:** `docs/visual.md` · **Tamaño esperado:** mediano

El rediseño gráfico general, que es una disciplina distinta de la arquitectura de información (dónde
vive cada cosa) y de la identidad de marca (el logotipo y los maillots). Aquí se decide **tipografía,
paleta, densidad, jerarquía, rejilla, componentes y estados**: cómo se ve una tabla de resultados,
una ficha de corredor, un panel, un aviso, un botón deshabilitado, una carga y un error. Sin esto,
cada pantalla nueva reinventa su aspecto y el juego se ve hecho a trozos aunque funcione bien. Dos
exigencias que el documento no puede saltarse: **el teléfono es el dispositivo principal de consulta**
(lo dice `docs/navegacion.md` §2, principio 3, y hoy hay pantallas que son tablas anchas), y los
equipos se distinguen por **color de maillot**, que es el peor identificador posible para un
daltónico, así que el patrón SVG paramétrico tiene que llevar forma además de color. Va emparejado
con E1 a propósito: repintar pantallas sin saber qué cuentan es maquillaje, y rediseñar la
información para volver a pintarla igual de fea es trabajo perdido.

**Los maillots, que son tres encargos en uno y el más visible del documento.** Primero, **el maillot
de campeón**, que hoy no existe: `jerseys.ts` define exactamente tres (`gc`, `points`, `kom`) y los
tres son baratos porque son una consulta sobre la clasificación de hoy. El de campeón nacional o
mundial es de otra naturaleza, se lleva **un año entero y en todas las carreras**, o sea que es un
título persistido y no una consulta, con sus reglas de disciplina (el campeón de contrarreloj lleva el
suyo en las cronos y no en las carreras en línea). Y ojo al choque, que es literal: **`SPEC.md` §8
prohíbe imitar «el arcoíris del campeón del mundo»**, que es el ejemplo que pone por su nombre. O sea
que hay que inventarle a este juego su propia señal de campeón, reconocible de un vistazo y que no sea
el arcoíris. Es de las pocas decisiones de identidad que el jugador va a mirar mil veces. Segundo,
**el maillot del equipo, que hoy nadie diseña**: `teams.jersey_seed` es una semilla y
`TeamIdentity.tsx` solo pinta lo que salga de ella, así que el mánager no elige nada. Hace falta un
editor y un vocabulario visual acotado (formas, franjas, colores) que produzca maillots distinguibles
entre sí y legibles a tamaño pequeño, que es el tamaño al que se van a ver. Tercero, que ese
vocabulario sirva también para **lo que un patrocinador compra** cuando E7 le venda sitio en la
camiseta.

**Y una decisión ya tomada que este documento tiene que ejecutar: la aplicación INSTALABLE.** No hay
app nativa de Android ni de iOS en el plan (el razonamiento está en §4.15.1 de `agenda.md`: un solo
código en vez de tres, sin revisión de tienda, y el aviso por notificación ya no exige nativo). Lo que
sí hay que hacer es que el juego se pueda **añadir a la pantalla de inicio y comportarse como una
app**: sin barra de navegador, con su icono, arrancando rápido y sin romperse cuando la red va mal.
Eso es trabajo de este documento, no de otro, y es además el requisito previo para que la
notificación de E3 funcione en iPhone.

**Y el encargo lleva un examen práctico obligatorio: el cuadro de entrenamiento.** No como apéndice
ni como «si da tiempo», sino como la pantalla sobre la que el documento tiene que demostrar que el
sistema funciona, porque es una pantalla YA implementada, con un motor correcto debajo, que aun así
no se entiende. Los tres defectos están comprobados contra el código y detallados en el apéndice A de
`docs/agenda.md`:

1. **La lista de llegadas no dice de qué habla.** Cada fila es un día de carrera y se lee
   `Day 182 · You'll arrive: Rusty`, sin nombre de carrera, porque la API manda **`raceId: null`
   siempre** (`apps/api/src/routes/riders.ts`). El campo existe y va vacío. Y una carrera por etapas
   pinta una fila por etapa repitiendo la misma palabra cuatro veces, cuando lo que el jugador
   pregunta es «¿cómo llego a la Race X?».
2. **Cinco etiquetas sueltas no son una escala.** `Rusty`, `Spot on`, `Fine`, `Loaded` y `Cooked`
   salen de `arrivalLabel(tsb)` y son un eje con **dos extremos malos y el bueno en medio**: `Rusty`
   es TSB por encima de +25, o sea demasiado FRESCO por haber entrenado poco, que es lo contrario de
   lo que la palabra sugiere. Los cortes están bien elegidos (son los del `tsbFactor` del SPEC §4.1,
   la misma curva con la que el TSB se convierte en rendimiento dentro de la carrera). El fallo es de
   presentación: el mismo dato pintado como escala de cinco tramos con tu posición marcada convierte
   una etiqueta desconcertante en una instrucción.
3. **Dos vocabularios y una precedencia invisible.** Arriba se eligen BLOQUES y abajo SESIONES, que
   son lo mismo a dos granularidades unidas por `blockWeek()`, y ese puente no se ve. Y cuando arriba
   y abajo dicen cosas distintas, **manda el día**: la cadena real está en
   `packages/db/src/train.ts` (viaje, orden del día, bloque de la semana, plan de equipo solo en modo
   mixto, entrenador; y en modo manual el hueco es descanso activo, no entrenador). La regla es
   correcta y ya está escrita, pero vive en el texto de ayuda del selector de modo, que está en el
   panel de ARRIBA, así que quien baja a los 28 días no la ve.

Los tres son de presentación y ninguno se arregla con más motor, que es justo lo que este documento
tiene que demostrar. El punto 3 se solapa con E5 (arquitectura de información) y eso está bien: que
salga de aquí la solución visual y de allí dónde vive la explicación.

**Qué leer:** `apps/web/src/components/` entero, `apps/web/src/pages/`, la configuración de Tailwind,
y `docs/navegacion.md`.

---

## E3 · La cuenta y el contacto

**Fichero:** `docs/cuenta.md` · **Tamaño esperado:** mediano, y la mitad es ejecución

El agujero más feo del producto ahora mismo, porque **hoy una contraseña perdida es un corredor
perdido**: `better-auth` corre con correo y contraseña sin enviar un solo correo, no hay recuperación,
nadie verifica que la dirección sea suya y el cambio de correo desde ajustes se aplica sin confirmar
el nuevo ni avisar al viejo, que es el camino clásico para secuestrar una cuenta. El documento cubre
el ciclo entero de la identidad (registro con **fecha de nacimiento**, que hoy no se pide y hace falta
para la edad mínima de 16, verificación, recuperación, cambio de correo, sesiones, límites de intento)
y su continuación natural, que son **las notificaciones**: qué se avisa, por dónde, con qué baja, y
sobre todo el **modo ausencia**, porque con cuatro días de juego por día real un juego sin ausencia
castiga tener vida. Dos decisiones de infraestructura van dentro y no se saltan: separar el correo
TRANSACCIONAL del de NOTIFICACIÓN en subdominios distintos desde el primer día (las quejas de spam de
quien se cansó del juego degradarían la entrega de la recuperación de contraseña, que es el correo que
menos se puede permitir caer), y calentar el dominio de envío antes del lanzamiento en vez de
estrenarlo con mil registros de golpe.

**Dos añadidos que cierran huecos detectados en la segunda pasada.** El primero: la notificación no
es solo correo, es también **aviso al teléfono** sobre la web instalable que define E2, y es lo que de
verdad se pedía cuando se pidió una app. El segundo, pequeño y hoy inexistente: **por dónde se queja
un jugador**. Sin correo de contacto, sin formulario y sin canal, alguien con un problema no tiene a
dónde ir, y el primero que se quede fuera de su cuenta lo va a descubrir de la peor manera.

**Qué leer:** `apps/api/src/auth.ts`, `apps/web/src/pages/Register.tsx`, `Login.tsx` y `Account.tsx`,
G11 en `epics.md`, y la tabla `users`.

---

## E4 · La transparencia del motor

**Fichero:** `docs/transparencia.md` · **Tamaño esperado:** pequeño, y es el mejor por hora invertida

El más barato de los once y el que más confianza compra. Dos mecanismos. El primero son las **notas
de versión para jugadores**: `docs/balance.md` lleva más de diez mil líneas de cambios del motor y el
jugador no ha visto ni uno, y este juego recalibra su física entre versiones, así que desde fuera un
corredor que subía bien y de pronto sube peor no se lee como recalibración sino como «el juego está
roto» o «me han perjudicado». Con un mundo único y permanente no hay borrón y cuenta nueva que lo
arregle, así que hay que contarlo, en su idioma y en términos de juego. El segundo es **«por qué
perdí»**, que sale casi gratis por cómo está construido el motor: es puro y determinista, el azar
viene de un RNG sembrado y las etapas se guardan con snapshot sellado (`checkReplay` ya existe). Eso
permite ofrecer al jugador la explicación verificable de su carrera: qué orden dio, qué hizo su
corredor, en qué kilómetro se descolgó y por qué. Es la mejor defensa contra la acusación de que el
juego hace lo que quiere, y es la misma pieza que hace falta para que el informe de una carrera sirva
para corregir el plan de la siguiente. El documento tiene que fijar además **la regla de cuándo
entran los cambios de motor**: en cualquier momento o solo en el rollover.

**Qué leer:** `docs/balance.md` (la cabecera y las últimas versiones), `checkReplay` en
`packages/engine`, `apps/api/src/routes/admin.ts` en la parte del snapshot, y §4.4 de `agenda.md`.

---

## E5 · La experiencia general y el primer mes

**Fichero:** `docs/experiencia.md` · **Tamaño esperado:** mediano

Dos cosas que son la misma: la arquitectura de información **v4** (la v3 está implementada y descrita
en `docs/navegacion.md`, y hay que revisarla después de E1, porque si el journal cambia de naturaleza
cambia a dónde lleva medio menú) y, sobre todo, **los primeros treinta días del jugador**, que es la
pregunta de retención del proyecto y hoy no tiene diseño ninguno. El dato que lo justifica está
medido en el propio `epics.md`: un jugador nuevo entra a los 18 años con un `rating` de 0,21 contra un
umbral de ofertas de 0,42, o sea que **nadie le ficha**, corre de agente libre y termina último a
ocho minutos y medio. Como modelo del mundo es excelente y no hay que tocarlo. Como primera
experiencia es hostil, y con seis horas por día de juego el salto de los 18 a los 19 son **tres meses
reales** siendo un don nadie sin equipo, sin compañeros y sin más decisión que entrenar. El documento
tiene que contestar qué hace y qué siente esa persona en su primer mes: qué objetivos propios de su
categoría tiene, cómo ve que progresa aunque el resultado sea malo, dónde cabe una primera victoria,
con quién habla, y qué le enseña el juego y cuándo (tutorial y ayuda contextual incluidos, que es
donde muere el punto de «tutoriales» de la lista original).

**Qué leer:** `docs/navegacion.md` entero, `apps/web/src/pages/Home.tsx`, `CreateRider.tsx`,
`HowToPlay.tsx`, el bloque G10 de `epics.md` y la tabla de progresión por edad.

---

## E6 · La integridad y el gobierno del mundo

**Fichero:** `docs/integridad.md` · **Tamaño esperado:** grande

Lo que hace habitable todo lo anterior, y la ausencia más seria de la lista original. Dos mitades.
La primera es **la integridad competitiva**: multicuentas, que en este juego no son trampa al margen
sino trampa DENTRO, porque el gregario existe mecánicamente y seis cuentas sacrificándose por la
buena es exactamente lo que el motor premia; la colusión entre equipos que se reparten carreras; las
transferencias de dinero disfrazadas de contratos inflados y rescisiones pactadas (la cláusula del
25 % del SPEC §7.2 es el vehículo); y la automatización, porque quien programe un guion para dejar
órdenes cuatro veces al día le saca una ventaja estructural a quien no. Hay que decidir qué se
DETECTA (huella de sesión, coincidencias de dirección y de horario, patrones de sacrificio anómalos),
qué se LIMITA por regla (un corredor por persona, topes, ventanas) y qué se CASTIGA. La segunda mitad
es **el gobierno**: hoy no existe rol de administrador, todas las rutas de `/admin` van tras un
`ADMIN_TOKEN` compartido por cabecera y la columna `users.is_admin` no se lee en ninguna consulta del
repositorio, así que no se sabe quién hizo qué, no se puede dar moderación a un voluntario sin darle
el mundo entero, y revocar a una persona obliga a rotar el token para todas. Hacen falta niveles,
permisos, **registro de auditoría de toda acción administrativa**, y el circuito de denuncia y
respuesta que la ley europea exige en cuanto haya contenido escrito por usuarios.

**Y el catálogo de herramientas que el dueño pidió explícitamente**, que es la parte más mecánica y
la que más se agradece el día que hace falta: suspender y expulsar con motivo y duración, prohibir y
revertir nombres de equipo y de corredor (sobre la lista de bloqueo de `blocklist.ts` y la pantalla
`AdminNames.tsx`, que son el punto de partida), forzar el cambio de un nombre ya aceptado, una cola de
denuncias con su respuesta, la ficha completa de una cuenta (sesiones, corredores, equipo, historial
de sanciones), marcar cuentas sospechosas de ser la misma persona, y operar el mundo. **Con el orden
puesto donde toca**: primero los roles y el registro de auditoría, después las herramientas. Cuantas
más cosas pueda hacer el token compartido de hoy, peor es que sea uno solo y que no deje rastro de
quién lo usó.

**Y una tercera mitad que apareció comprobando el esquema: la POBLACIÓN del mundo.** No existe ni un
solo rastro de actividad en la base de datos (ni `last_seen`, ni `last_login`, ni equivalente en
`users` ni en `riders`), así que **el mundo no sabe quién lo ha abandonado**. En un mundo único y
permanente eso deja un corredor humano ocupando plaza de plantilla para siempre, cobrando salario y
bloqueando el sitio de alguien que sí juega. G8 (limpiar bots según lleguen humanos) está pensado para
el caso contrario y no cubre éste. Hay que definir qué es inactividad, qué le pasa al corredor, a su
contrato y a su plaza, y sobre todo **cómo se vuelve**, porque quien regresa después de tres meses
tiene que poder retomar su carrera deportiva y no encontrarse con que le borraron la vida.

**Qué leer:** `apps/api/src/routes/admin.ts`, `apps/api/src/security.ts`,
`packages/db/src/blocklist.ts` y `adminStats.ts`, `users` en `schema.ts`, SPEC §7.1.

---

## E7 · La economía del juego

**Fichero:** `docs/economia.md` · **Tamaño esperado:** grande

Que el dinero signifique algo, en sus dos mitades. La del corredor: que el salario sirva para algo
más que aparecer en una pantalla, con la estructura de gastos personales que ya existe a medias en
`economy.ts` (viajes, vivienda, material) y las mejoras de mantenimiento que el SPEC §9 describe y
nadie ha construido. Y la del equipo, que es la que el dueño señaló como principal: **patrocinadores
con objetivos**, ingresos por resultados y por visibilidad, el presupuesto de una temporada con todos
sus gastos, y los premios en metálico, que por costumbre del oficio van al equipo y se reparten con
toda la estructura, así que repartir mal un bote es un conflicto de vestuario y no solo una
transferencia. Tiene que resolver también la publicidad y la imagen, que es donde está la mecánica
buena: el equipo vende con exclusividad por categoría, el corredor puede firmar por su cuenta en las
categorías que el equipo no pisa, y una estrella es a la vez lo que te trae patrocinio y lo que te
complica el vestuario. Dos avisos: esto es economía INTERNA y no tiene nada que ver con cobrar dinero
real, y cualquier mecanismo de transferencia entre jugadores (contratos, cláusulas, primas) es un
vehículo de fraude, así que este documento y E6 tienen que leerse el uno al otro.

**Y una mecánica concreta que el dueño propuso y que es de las mejores del documento: el
patrocinador compra el maillot.** Que pueda pagar por imponer su color o por llevar su logotipo en el
sitio bueno convierte la identidad visual del equipo en una **decisión económica con coste real**:
cobras más y dejas de parecerte a ti mismo. Es exactamente el conflicto que vive un equipo de verdad,
no hace falta inventar nada para justificarlo, y engancha con G2.7 y G2.8 sin forzar. El vocabulario
visual que hace eso posible lo define E2; lo que aquí se decide es cuánto paga, qué compra y qué pierde
el equipo a cambio.

**Y una sección final que cierra el único hueco de dinero real que tiene el proyecto:** la cuenta
premium, que es la llave del mando de un equipo (`users.premium` y `teamControl.ts`) y que algún día
será comprable. No es una economía, es **un solo producto**, y por eso vive aquí como apartado y no
como épica propia: qué incluye exactamente, qué NO incluye nunca (rendimiento deportivo, y esa
frontera no admite una sola excepción porque la primera la cita todo el mundo), cómo se cobra, qué
pasa con los impuestos y los reembolsos, y qué se le debe a quien pagó si el mundo cambia. Con dos
reglas ya decididas y que el documento solo tiene que respetar: **premium se regala por invitación
hasta que el juego esté acabado**, y **no se cobra un euro antes del reset**, porque cobrar por una
cuenta y luego borrar el mundo que esa cuenta habitaba es el peor estreno posible. Y una advertencia que
no se ve venir: **si premium se vendiera dentro de una app de iOS o de Android, la tienda se queda una
comisión de cada venta** y obliga a cobrar con su sistema. Hoy no hay app nativa en el plan (§4.15.1
de `agenda.md`), así que no aplica, pero conviene dejarlo escrito para el día que alguien proponga
una.

**Qué leer:** SPEC §7.2 y §9, `packages/db/src/economy.ts` y `contracts.ts`, G2.5 a G2.8 en
`epics.md`, y la tabla `txn_kind` del esquema.

---

## E8 · El juego entre personas

**Fichero:** `docs/personas.md` · **Tamaño esperado:** el más grande de todos

El mánager humano y todo lo que arrastra, que `epics.md` ya desglosó en quince componentes bajo G2 y
que **no se puede partir en tres encargos sin que se noten las costuras**: un mánager sin canal de
comunicación es un tirano mudo, un canal sin nada que negociar es un chat vacío, y lo que se negocia
es el mando y el dinero. Cubre la plantilla (jerarquía y liderazgos, convocatorias y carga de
trabajo, promesas y expectativas, disciplina), las personas (moral con motivos humanos, relaciones
entre corredores, los canales de comunicación que el dueño pidió en G7) y las dos caras del rol: la
silla del mánager, que también debe responder ante alguien, y **ser mandado**, que es el componente
que solo existe porque aquí el jugador es un ciclista y no un director. El modelo ya está decidido y
el documento parte de él: todo jugador es un CICLISTA, unos pocos son ADEMÁS mánager, pagar da
autoridad y nunca vatios, el mánager es juez y parte a propósito porque es el mejor conflicto que da
el diseño, y abusar tiene que salir caro por dentro del juego (moral, salidas, reputación) y no por
una regla que lo prohíba. Y una restricción práctica que condiciona todo: **un mánager no puede tener
un segundo trabajo**, así que las decisiones tienen que ser políticas y no órdenes manuales diarias.

**Dos añadidos de la segunda pasada.** El primero: **las amistades y enemistades entre corredores**,
que el dueño pidió con sus dudas incluidas y que están justificadas. El documento tiene que diseñarlas
como el dueño intuía pero **no como bonificación declarada**, porque una amistad con botón es una
casilla que optimizar, se vuelve universal en dos meses y es el vehículo perfecto para las cuentas
múltiples. La forma que sí funciona está argumentada en §4.15.2 de `agenda.md`: la relación **se gana
en la carretera y cambia el comportamiento, no los números**, apoyándose en que **la cooperación ya es
una magnitud simulada** en este motor (`breakawayCommitMin/Max`, el suceso `break_cooperation`). Dos
que se han dado relevos cooperan mejor la próxima vez que coincidan delante; el que nunca te da un
relevo se convierte en el que no trabaja contigo aunque os convenga, que es exactamente lo que pasa en
la carretera de verdad. Y extiende G2.12 más allá del vestuario, al pelotón entero, que es donde el
ciclismo pone sus alianzas: entre rivales. El segundo añadido: **la sucesión de un equipo cuyo mánager
desaparece sin avisar**, que es como se va la gente de verdad de los juegos, y que G2.14 no cubre
porque solo contempla la salida voluntaria.

**Qué leer:** G2 entero en `docs/epics.md`, `packages/db/src/teamControl.ts`, `contracts.ts`,
`callups.ts`, `teamPlan.ts`, `raceOrders.ts`, y `docs/diseno/mapa-equipo-ordenes-final.md`.

---

## E9 · El multiidioma

**Fichero:** `docs/idiomas.md` · **Tamaño esperado:** mediano

Y no es el encargo que parece, porque el problema no es traducir sino **el texto que el juego
escribe solo**. Medido: 48 tipos de suceso de crónica, 54 redacciones en `narration.ts` y 616
literales de texto solo en `stageJournal.ts`, y la cifra crece con cada versión del motor. Esas
plantillas **no se traducen, se reescriben por idioma**, porque meten nombres propios dentro de la
frase y cada lengua los trata distinto: concordancia de género en español, francés, italiano y
portugués, y declinación de nombres propios en ruso, que es la razón de fondo por la que el ruso
queda aplazado. El documento tiene que decidir la arquitectura (plantillas por idioma sobre sucesos
estructurados, nunca una tabla de cadenas traducidas), arreglar la tabla `news` para que guarde
`seed` y `data` en vez del texto ya redactado, resolver qué pasa con `users.locale`, que existe con
valor por defecto `'es'` mientras la interfaz está en inglés, y **fijar quién mantiene esto vivo**,
que es la parte cara: cada suceso nuevo del motor son N idiomas de texto nuevo para siempre. Las
tandas acordadas: primero español, francés, italiano, alemán y portugués; luego neerlandés; luego
chino, condicionado a comprobar antes que el juego se puede jugar desde China con latencia decente.

**Qué leer:** `packages/engine/src/world/news.ts`, `apps/web/src/domain/narration.ts` y
`stageJournal.ts`, `apps/api/src/chronicle.ts`, la tabla `news`, y `apps/api/src/geoIp.ts`.

---

## E10 · La vida del corredor

**Fichero:** `docs/vida-corredor.md` · **Tamaño esperado:** mediano

Lo que convierte diez números en alguien, de los 18 años al retiro y más allá. Tres piezas que se
sostienen entre sí. **La identidad**: hoy dos corredores con los mismos atributos son el mismo
corredor, y faltan rasgos que se ELIGEN al crear el personaje (que es parte de empezar una carrera
deportiva, nadie quiere que le sorteen quién es) siempre con contrapartida y nunca como ventaja pura,
porque si «me va bien el frío» solo suma, en dos meses el pelotón entero vuelve a ser idéntico; más
rasgos que se DESCUBREN corriendo, que premian jugar en vez de rellenar un formulario. **La salud**:
lesiones con duración de verdad y no abandonos de un día, enfermedad, recuperación y vuelta a la
competición, que es lo que obliga a rehacer un calendario y lo que convierte en decisión el arriesgar
al líder en un adoquín con lluvia. Y **el final**: la retirada ya funciona, pero es el momento más
delicado de la vida del jugador porque se le acaba el personaje al que dedicó temporadas, así que hay
que diseñar la ceremonia de fin de temporada, qué permanece (palmarés, salón de la fama, alguna forma
de prestigio) y cómo se sugiere y se dignifica la segunda carrera deportiva.

**Y una pregunta de fondo que el dueño planteó y que el motor ya tenía medio abierta: el GREGARIO no
debería ser un arquetipo de nacimiento.** Nadie es ciclista para ser gregario; uno acaba siéndolo por
no llegar a líder. Lo bueno es que el jugador **ya no puede elegirlo** (`VOCATIONS` son cinco y
`gregario` no está entre ellas), y lo malo es que `gregario` vive a la vez en dos vocabularios: es uno
de los ocho `RiderArchetype` (lo que eres de nacimiento, con penalización de techo en todo) y uno de
los siete `StageRole` (lo que haces hoy). Sobra en el primero. Y no es teoría: el comentario del
arquetipo en `rider.ts` deja escrito que el requisito de «que tampoco se quede nadie sin pasar de 4 en
nada» **choca de frente con un arquetipo que por definición no destaca en nada**, que los gregarios son
el 26-32 % del pelotón, que hubo que subirles el techo de RES de −4 a −2 como parche, y que la palanca
de verdad sería «RES a 0 y bajar la cuota de gregarios, y ésa es otra decisión». Es exactamente esta
decisión. Si el gregario deja de nacer gregario, ese tercio del pelotón nace con una vocación de verdad
y acaba de gregario **por nivel y no por destino**, y el requisito deja de chocar con nada. La
ejecución toca el motor, o sea la otra línea, así que conviene que la decisión esté escrita antes de
que esa línea termine.

**Qué leer:** N3 y N4 en `epics.md`, G10 y su nota sobre los NPC sin juventud, `CreateRider.tsx`,
`packages/db/src/rollover.ts` y `techosPorEdad.test.ts`, y `packages/engine` en lo que toca a `eff0`.

---

## E11 · Los recorridos y el calendario

**Fichero:** `docs/recorridos.md` · **Tamaño esperado:** grande, y es más ingeniería que diseño

El material sobre el que corre todo lo demás, y donde el dueño ya dio el veredicto más duro de todo
el proyecto: «para las que no se puedan nunca reproducir, el generador es una basura». Está
confirmado con un caso concreto: el generador le dio a una carrera de un día de montaña el perfil de
una etapa reina de gran vuelta, con final en alto de catorce kilómetros, algo que no existe en el
calendario real, y eso dejó al 82 % del pelotón con el tanque a cero. Se arregló ese caso y el
generador entero sigue sin revisar, produciendo recorridos que nadie ha mirado. El documento tiene
que decidir de dónde sale un perfil honesto cuando no hay recorrido real autorizado, cómo se valida
antes de entrar al calendario, y cómo se distingue lo real de lo generado. Y entra aquí, porque es
contenido de calendario, una de las piezas más baratas en emoción por hora de trabajo que quedan
disponibles: **las selecciones nacionales**, o sea que a un jugador le convoque su país para el
Mundial o para su campeonato nacional, con los países, las páginas de país y la detección por IP ya
construidos.

**Y una comprobación que hay que hacer antes de nada: no encontré el Campeonato del Mundo en el
calendario.** `SPEC.md` §8 lo promete en septiembre y lo que aparece en `routes/calendar.ts` son los
campeonatos nacionales (`championshipCountry`, clase `NC`). Puede que se me escapara, pero conviene
mirarlo, porque **el maillot de campeón del mundo no puede existir sin la carrera que lo reparte**. Y
la contrapartida es la buena noticia: los campeonatos nacionales **sí se corren**, o sea que cada
temporada hay un campeón de Italia y el juego lo olvida al día siguiente. Recordarlo durante un año y
enseñarlo en su maillot es de lo más barato que queda en toda la agenda.

**Qué leer:** G5 y G6 en `epics.md`, el generador de recorridos en `packages/engine`,
`docs/fuentes-recorridos.md`, `docs/inventario-recorridos.md`, SPEC §8.

---

## E12 · La enciclopedia del mundo

**Fichero:** `docs/enciclopedia.md` · **Tamaño esperado:** mediano

Mil seiscientos corredores, cincuenta y siete equipos, sesenta o setenta carreras por temporada y un
archivo histórico que solo crece, y **hoy no hay buscador**. Ni de corredores, ni de equipos, ni de
carreras: se navega por índices y por rankings, o no se llega. Y falta con él lo que es media gracia
de un juego persistente: **comparar dos corredores**, el **cara a cara** entre dos que llevan años
peleándose, el **palmarés completo** de alguien, la temporada de hace tres años. Los datos están
todos y bien guardados (desde la v48 cada puntuación se almacena con su fecha, su edición de carrera
y de qué fue, y no se borra nunca), y no hay por dónde leerlos. El documento tiene que decidir qué se
busca y cómo, qué es una ficha completa de corredor, de equipo, de carrera y de país, cómo se navega
el archivo de temporadas pasadas, y qué historias cuenta el mundo sobre sí mismo sin que nadie las
escriba: rachas, récords, rivalidades, la carrera que siempre gana el mismo. **Va el último a
propósito**: no arregla nada roto, así que no adelanta a nadie en la cola. Pero es de lo que más
profundidad da por hora invertida, y si en algún momento sobra una ventana, éste adelanta bien.

**Qué leer:** `apps/web/src/pages/Rankings.tsx`, `Teams.tsx`, `Countries.tsx`, `RiderProfile.tsx`,
`HallOfFame.tsx` y `RacesIndex.tsx`, `packages/db/src/browse.ts`, `ranking.ts` y `riderResults.ts`,
y la tabla `rider_points`.

---

## Cobertura: los ocho puntos originales, uno por uno

La lista de la que salió todo esto eran ocho puntos del dueño. Ninguno se ha perdido, y tres se
reparten entre dos épicas porque son dos cosas distintas:

| Punto original                                  | Dónde vive ahora                                                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mánagers humanos**                            | **E8** entero. La llave de acceso (premium) se define en **E7**, y las reglas contra el abuso de autoridad en **E6**                                                                                        |
| **Administradores y moderadores**               | **E6**, las dos mitades: roles reales con auditoría frente al token compartido de hoy, y el circuito de denuncia y respuesta                                                                                |
| **Confirmación de correos**                     | **E3**, con todo el ciclo de la cuenta: verificar, recuperar, cambiar de correo y la fecha de nacimiento que hoy no se pide                                                                                 |
| **Interacciones sociales**                      | **E8**, porque los canales son la mecánica con la que se negocia y no un chat aparte. La decisión de comunidad EXTERNA está abajo, en las tareas                                                            |
| **Economía real**                               | **E7**. La economía interna (salario que sirva, dinero de los equipos, patrocinio, premios, gastos) es el cuerpo del documento; el dinero real es su sección final, que es un solo producto                 |
| **Multiidioma**                                 | **E9**                                                                                                                                                                                                      |
| **News + Race Radio + journal, y sin destripe** | **E1** entero, con la retransmisión de televisión como norte y el modo sin destripe por defecto                                                                                                             |
| **Rediseño general de la experiencia**          | **E2** (cómo se ve: tipografía, color, densidad, componentes, móvil, accesibilidad) y **E5** (dónde vive cada cosa: arquitectura de información v4). Son dos oficios distintos y por eso son dos documentos |
| **Tutoriales y ayuda**                          | **E5**, junto con los primeros treinta días, que es el problema del que los tutoriales son media solución                                                                                                   |

Y los dos que el dueño añadió en la segunda pasada:

| Punto añadido                 | Dónde vive ahora                                                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App de Android y de Apple** | **Decidido que no, todavía**: web instalable en **E2**, aviso al teléfono en **E3**, y la advertencia de la comisión de tienda en **E7**. El razonamiento está en §4.15.1 de `agenda.md` |
| **Amistades y enemistades**   | **E8**, pero ganadas en la carretera y cambiando el comportamiento, no como bonificación declarada (§4.15.2)                                                                             |

---

## El orden ya está en los códigos

Ya no hace falta una tabla de turnos: **E1 es el primero y E11 el último**. Lo que sigue valiendo la
pena recordar es por qué están emparejados los que lo están, porque encargar uno sin el otro
desperdicia la mitad del trabajo:

- **E1 con E2.** Repintar pantallas sin saber qué cuentan es maquillaje, y rediseñar la información
  para volver a pintarla igual de fea es trabajo perdido.
- **E3 con E4.** Los dos más baratos y los dos que más deuda cierran: la cuenta que hoy se puede
  perder para siempre, y la confianza en un motor que cambia sin avisar.
- **E5 después de E1**, porque si el journal cambia de naturaleza cambia a dónde lleva medio menú.
- **E6 antes o a la vez que E7**, y los dos antes de **E8**: integridad y reglas del dinero antes de
  abrir el mando a cualquiera.
- **E9 y E10** cuando los datos de registro digan qué idiomas y cuando E8 haya definido el vestuario.
- **E11** casi al final: mejora mucho el mundo y no cambia lo que el juego es.
- **E12** el último de todos, y por una razón distinta a la de E11: no arregla nada roto. Es el único
  de los doce que es puro añadido, y por eso es también el único que se puede adelantar sin deuda si
  en algún momento sobra una ventana.

---

## Lo que NO se le encarga a nadie, porque no son diseños

Son tareas, y varias tienen fecha límite en el reset:

- **Comprar y verificar el dominio de correo** en Resend, con el subdominio transaccional separado.
- **Verificar la marca** en EUIPO y USPTO, que SPEC §8 exige antes del lanzamiento.
- **Escribir las condiciones de uso y la política de privacidad**, con la edad mínima de 16 y, para
  la beta, el aviso explícito de que el motor va a cambiar.
- **Guardar país y `Accept-Language` en el registro**, que cuesta una tarde y decide E9 con datos.
- **Analítica de producto**: cuántos se registran, cuántos crean corredor, cuántos vuelven al
  séptimo día. Sin esto, E5 se diseña a ciegas.
- **Decidir la comunidad externa**: foro propio (coste de moderación permanente y obligaciones
  legales, a cambio de contexto de juego) o Discord desde el primer día. Mi recomendación es fuera, y
  dentro del juego solo lo que necesita contexto de juego, que es lo que E8 diseña.
- **La lista de «lo que solo se puede cambiar en el reset»**, abierta desde hoy.

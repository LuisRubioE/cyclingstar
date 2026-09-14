# Los encargos: qué pedirle a Fable, uno por documento

Estado: **lista de encargos.** Cada punto de aquí es UN documento de diseño por escribir, del tamaño
y con el método de `docs/tactica.md` y `docs/entrenamiento.md`. Ninguno está empezado.

El catálogo razonado, con las dependencias y el porqué de cada uno, está en
[docs/agenda.md](./agenda.md). Esto es la versión operativa: lo que se encarga, en qué orden y qué
hay que darle a quien lo escriba.

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

**Qué leer:** `apps/web/src/components/` entero, `apps/web/src/pages/`, la configuración de Tailwind,
y `docs/navegacion.md`.

---

## E3 · La experiencia general y el primer mes

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

## E4 · El juego entre personas

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

**Qué leer:** G2 entero en `docs/epics.md`, `packages/db/src/teamControl.ts`, `contracts.ts`,
`callups.ts`, `teamPlan.ts`, `raceOrders.ts`, y `docs/diseno/mapa-equipo-ordenes-final.md`.

---

## E5 · La economía del juego

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

**Qué leer:** SPEC §7.2 y §9, `packages/db/src/economy.ts` y `contracts.ts`, G2.5 a G2.8 en
`epics.md`, y la tabla `txn_kind` del esquema.

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

**Qué leer:** `apps/api/src/routes/admin.ts`, `apps/api/src/security.ts`,
`packages/db/src/blocklist.ts` y `adminStats.ts`, `users` en `schema.ts`, SPEC §7.1.

---

## E7 · La cuenta y el contacto

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

**Qué leer:** `apps/api/src/auth.ts`, `apps/web/src/pages/Register.tsx`, `Login.tsx` y `Account.tsx`,
G11 en `epics.md`, y la tabla `users`.

---

## E8 · El multiidioma

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

## E9 · La vida del corredor

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

**Qué leer:** N3 y N4 en `epics.md`, G10 y su nota sobre los NPC sin juventud, `CreateRider.tsx`,
`packages/db/src/rollover.ts` y `techosPorEdad.test.ts`, y `packages/engine` en lo que toca a `eff0`.

---

## E10 · Los recorridos y el calendario

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

**Qué leer:** G5 y G6 en `epics.md`, el generador de recorridos en `packages/engine`,
`docs/fuentes-recorridos.md`, `docs/inventario-recorridos.md`, SPEC §8.

---

## E11 · La transparencia del motor

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

## El orden en que yo los encargaría

| Turno | Encargos     | Por qué ahí                                                                                                        |
| ----- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1.º   | **E1 y E2**  | Van emparejados y no dependen de nada. Es lo que hace que todo el trabajo del motor por fin se NOTE                |
| 2.º   | **E7 y E11** | Los dos más baratos y los dos que más deuda cierran: la cuenta que hoy se puede perder, y la confianza en el motor |
| 3.º   | **E3**       | Después de E1, porque si el journal cambia de naturaleza cambia medio menú                                         |
| 4.º   | **E6 y E5**  | Integridad antes o a la vez que el dinero, y los dos antes de abrir el mando                                       |
| 5.º   | **E4**       | El grande. Cuando haya portero en la puerta                                                                        |
| 6.º   | **E8 y E9**  | Idiomas cuando los datos de registro digan cuáles, y la vida del corredor cuando E4 haya definido el vestuario     |
| 7.º   | **E10**      | Contenido, que mejora el mundo pero no cambia lo que el juego es                                                   |

---

## Lo que NO se le encarga a nadie, porque no son diseños

Son tareas, y varias tienen fecha límite en el reset:

- **Comprar y verificar el dominio de correo** en Resend, con el subdominio transaccional separado.
- **Verificar la marca** en EUIPO y USPTO, que SPEC §8 exige antes del lanzamiento.
- **Escribir las condiciones de uso y la política de privacidad**, con la edad mínima de 16 y, para
  la beta, el aviso explícito de que el motor va a cambiar.
- **Guardar país y `Accept-Language` en el registro**, que cuesta una tarde y decide E8 con datos.
- **Analítica de producto**: cuántos se registran, cuántos crean corredor, cuántos vuelven al
  séptimo día. Sin esto, E3 se diseña a ciegas.
- **La lista de «lo que solo se puede cambiar en el reset»**, abierta desde hoy.

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

## 3. Lo irreversible: seis decisiones que hay que tomar ahora

Ninguna de las seis exige construir nada esta semana. Todas se vuelven caras o imposibles si se
toman tarde.

### 3.1 El esquema de las noticias condena el multiidioma, y es de verdad

Esto no es una opinión, está en el código.

La **crónica y la radio** guardan SUCESOS, no texto: `stages.radio` es un `jsonb` con
`{ plantilla, protagonistas, datos }`, y quien convierte eso en prosa es la web, en
`apps/web/src/domain/narration.ts`. O sea que el día que haya un segundo idioma, **todas las etapas
ya corridas se traducen solas**: se añade un mapa de plantillas nuevo y la historia entera del mundo
cambia de idioma. Está bien construido.

Las **noticias hacen justo lo contrario**. `emitNews` en `packages/db/src/news.ts` llama a
`renderNews(kind, seed, data)` en el momento de escribir y guarda **solo el resultado**: la tabla
`news` tiene `kind` y `text`, y **ni `seed` ni `data`**. Los datos con los que se redactó el titular
se tiran. Consecuencia: cada noticia que el mundo escribe desde hoy hasta el día que se cambie eso
**es intraducible para siempre**, porque no queda nada con lo que volver a redactarla.

Y hay un detalle que lo subraya: `users.locale` existe, es `text NOT NULL DEFAULT 'es'`, y la
interfaz está en inglés por convención de `Claude.md`. O sea que la columna ya miente.

**Lo que hay que hacer ahora, y no es el diseño de multiidioma:** añadir `seed` y `data` a `news` y
mover el renderizado al momento de LEER, como ya hace la crónica. Es una migración y unas cuantas
líneas. El diseño completo de i18n puede esperar un año; esto no, porque cada día que pasa añade
noticias que nunca se podrán traducir.

### 3.2 El dominio de correo

Ya está argumentado en **G11** y la recomendación sigue en pie: subdominio dedicado en `rubio.pt`
ahora (`no-reply@cyclingstar.rubio.pt`), dominio propio para la versión final, y `hereistand.app`
descartado. Lo irreversible no es el remitente (cambiarlo es gratis), es **la reputación que se le
pega a un dominio compartido**.

El matiz que añado: separar desde el primer día el correo TRANSACCIONAL (verificación, recuperación)
del de NOTIFICACIÓN (tu corredor corrió hoy), aunque al principio solo exista el primero. El día que
entren las notificaciones, las quejas de spam de quien se cansó del juego degradarían la entrega de
la recuperación de contraseña, que es el correo que menos se puede permitir caer.

### 3.3 Dinero real y borrado del mundo, que es la misma decisión

En cuanto un jugador pague, el mundo deja de poder borrarse con ligereza. No por buena voluntad:
por derecho de consumo. La ley europea trata el contenido digital de pago con obligaciones de
información previa, de desistimiento y de continuidad del servicio, y un borrado de temporada se
convierte en un incidente de reembolsos en lugar de en una decisión de diseño.

Así que **antes de cobrar un euro hay que contestar**: ¿este mundo dura para siempre? ¿Hay
temporadas que se cierran y un archivo? ¿Qué pasa con lo comprado si el mundo se reinicia? Contestar
eso después de cobrar es contestarlo con las manos atadas.

Aviso además de que la pieza ya está a medias en el código: `users.premium` existe, y
`teamControl.ts` la usa para permitir tomar el mando de un equipo. El modelo de G2 («unos pocos, que
paguen o que elija el dueño, son ADEMÁS mánager») ya está enchufado, y hoy se concede a mano desde
`/admin`.

### 3.4 Un mundo o varios

Todo el esquema cuelga de `world_id` y nada impide un segundo mundo. Pero el RANKING, el salón de la
fama, el palmarés y el mercado solo significan algo dentro de un mundo. Si el día que lleguen mil
jugadores la respuesta es «abrimos el mundo 2», hay que saberlo antes, porque cambia qué es un
récord, qué es una comparación entre jugadores y qué enseña la portada.

Mi opinión: **un solo mundo mientras se pueda**, y es lo que da sentido a G8 (ir limpiando bots
según lleguen humanos). Un mundo único con 1.600 corredores donde los humanos van sustituyendo al
relleno es una promesa mucho mejor que doce mundos vacíos. Pero conviene que sea una decisión
tomada, no una que se tome sola por no haberla mirado.

### 3.5 El contrato social del mánager

`epics.md` lo tiene bien planteado (pagar da AUTORIDAD, no vatios) y no lo repito. Lo que añado es
que **es irreversible en el sentido social, no en el técnico**: la primera cohorte de mánagers fija
la cultura del juego. Si los primeros veinte son gente que se autoproclama jefe de filas cada
domingo, eso es lo que el juego será, y ninguna regla posterior lo deshace.

Consecuencia práctica: los primeros mánagers **elegidos por el dueño y no comprados**, y el pago
como puerta solo cuando la norma de conducta ya exista y se vea.

### 3.6 La marca

`SPEC.md` §8 ya obliga a «verificar cada nombre final contra EUIPO y USPTO antes del lanzamiento», y
eso incluye el nombre del juego. No es una tarea de desarrollo y por eso lleva meses sin aparecer en
ninguna lista. Es de las pocas cosas que, salidas mal, obligan a rehacer identidad visual, dominio,
correo y tienda a la vez.

---

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

### 4.4 Notas de versión y el contrato del mundo con el jugador

`docs/balance.md` lleva más de diez mil líneas de cambios del motor y el jugador no ve ni uno. Este
juego **recalibra su física entre versiones**: la v41 cambió los abanicos, la v44 el ritmo en
montaña, y el rediseño táctico en curso va a mover mucho más. Desde fuera, un corredor que subía
bien y de pronto sube peor no se lee como «recalibración», se lee como «el juego está roto» o «me
han perjudicado».

Hacen falta dos cosas: **notas de versión en el juego**, escritas para jugadores y no para el
repositorio, y una decisión explícita de **qué se le debe al jugador cuando el motor cambia** bajo
sus pies. ¿Se reasignan puntos de entrenamiento? ¿Se avisa antes? ¿Hay temporada de transición? Es
una pregunta de confianza y aparece justo cuando aterrice el trabajo de táctica y entrenamiento que
ya está en marcha.

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

| Código  | Diseño                     | Qué contesta                                                                             | Cubre          | Depende de | Tamaño |
| ------- | -------------------------- | ---------------------------------------------------------------------------------------- | -------------- | ---------- | ------ |
| **D7**  | Multiidioma                | Qué se traduce, quién traduce, cómo se traduce el texto GENERADO, y el arreglo de `news` | §3.1           | 3.1        | M      |
| **D8**  | Notificaciones y ausencia  | Qué se avisa, por dónde, con qué baja, y qué pasa cuando el jugador no está              | §4.3           | D4, N1     | M      |
| **D9**  | Pagos y cumplimiento       | Qué se vende, cómo se cobra, impuestos, reembolsos, y qué pasa si el mundo cambia        | §3.3           | D2, 3.3    | M      |
| **D10** | Escala, mundos y archivado | Un mundo o varios, qué se archiva, qué cuesta un día de juego dentro de dos años         | §3.4, §4.8, N6 | 3.4        | M      |
| **D11** | Analítica de producto      | Qué se mide, con qué respeto por la privacidad, y qué decisión desbloquea cada medida    | §4.7           | ninguno    | S      |
| **D12** | Legal y privacidad         | Datos, menores, condiciones, contenido de usuario, marca                                 | SPEC 8, §4.9   | 3.6        | M      |

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

### Oleada 0 · Ahora, y casi nada de ello es diseño

Son decisiones y cambios pequeños. Su único mérito es que hacerlos después cuesta diez veces más.

1. **Arreglar el esquema de `news`** (guardar `seed` y `data`, renderizar al leer). Una migración.
2. **Decidir el dominio de correo** y verificarlo en Resend. Un rato.
3. **Decidir un mundo o varios** (3.4). Una conversación.
4. **Decidir la política de borrado del mundo antes de cobrar** (3.3). Una conversación.
5. **Verificar la marca** en EUIPO y USPTO (3.6). Un encargo.
6. **D4, identidad y cuenta**, que es más ejecución que diseño y hoy es el agujero más feo del
   producto: sin recuperación de contraseña, una cuenta perdida es un corredor perdido.

### Oleada 1 · La capa de lectura

**D13 → D16 → D15 → D14**, en ese orden. Razón: hay un motor extraordinariamente trabajado cuyo
detalle no llega al jugador, y el rediseño táctico en curso va a multiplicar lo que hay que contar.
Es la oleada que hace que todo el trabajo del motor se NOTE, no depende de ninguna decisión difícil
y es la que más retención compra por hora invertida. Aquí entra tu modo sin destripe, y aviso de que
es más difícil de lo que parece: exige saber **qué ha visto cada jugador** y que ninguna otra
pantalla (portada, ranking, feed, notificación) se lo reviente por detrás.

### Oleada 2 · El juego entre personas

**D5 y D6 antes o a la vez que D1 y D2.** Esto es una discrepancia deliberada con el orden natural:
apetece diseñar al mánager primero porque es lo divertido, y creo que es un error. El mánager humano
es exactamente lo que activa las multicuentas, la colusión y el abuso de autoridad. Encender el
modelo social sin integridad ni moderación es abrir el bar antes de contratar al portero.

### Oleada 3 · Lo que sostiene

**D7, D8, D9, D10, D11, D12.** Multiidioma completo, notificaciones, pagos, escala, analítica y
legal. La mayoría depende de decisiones ya tomadas en la oleada 0.

### Oleada 4 · Contenido

**D17, D18, D19, D20.** D17 es grande y es el que más cambia la sensación de que el mundo es real.
D18 es la mejor relación entre emoción producida y trabajo invertido de toda la agenda.

---

## 7. Lo que yo NO haría

- **No escribiría D1 todavía.** Es el documento más apetecible de la lista y el que más se estropea
  esperando. G2 en `epics.md` ya tiene el modelo y los quince componentes: eso basta como brújula
  hasta que haya integridad y moderación debajo.
- **No construiría foro propio.** Ver §4.13.
- **No monetizaría con ventaja deportiva de ningún tipo**, ni siquiera cosmética con efecto. El
  pilar de `README.md` es «cero pay to win» y es el único que, una vez roto, no se arregla pidiendo
  perdón.
- **No traduciría la interfaz antes de arreglar `news`.** Traducir pantallas mientras el mundo sigue
  escribiendo historia intraducible es trabajar hacia atrás.
- **No abriría un segundo mundo** para resolver un problema de escala que todavía no se ha medido.

---

## 8. Preguntas abiertas para el dueño

1. **«Economía real»**: ¿te referías a cobrar dinero de verdad, a que la economía interna del juego
   sea creíble, o a las dos? El documento asume las dos y las separa en D2 y D9, pero el orden
   cambia mucho según la respuesta.
2. ¿El mundo es **uno y para siempre**, o habrá temporadas que se cierren y se archiven?
3. ¿Los primeros mánagers se **eligen** o se **compran**? (Mi recomendación en 3.5: se eligen.)
4. ¿Qué idiomas, y **quién los escribe**? La parte cara de D7 no es el código, es mantener vivos los
   textos generados en tres idiomas a la vez.
5. **Menores**: ¿el juego declara una edad mínima? La respuesta condiciona D12 entero.
6. ¿Aceptas la inversión de la oleada 2 (integridad antes que mánager), aun sabiendo que retrasa lo
   más vistoso de todo el proyecto?
7. Cuando el motor recalibre y un corredor entrenado para escalar rinda distinto, **¿qué le debemos
   al jugador?** (§4.4). Esta hay que contestarla antes de que aterrice el rediseño táctico.

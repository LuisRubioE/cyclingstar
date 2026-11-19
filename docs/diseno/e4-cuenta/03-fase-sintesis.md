# E4 · Fase 3: la síntesis (veredicto, esqueleto, glosario, decisiones, redacción y opciones)

La síntesis produce el borrador de `docs/cuenta.md` en `borrador/`, como hizo E3 en
`docs/diseno/e3-visual/borrador/` (mira su `00-esqueleto.md`, su `00-decisiones.md` y dos o tres
secciones como modelo de densidad). Se hace en cuatro pasos: UN arquitecto escribe el veredicto, el
esqueleto, el glosario y las decisiones cerradas; DOS redactores escriben las secciones, cada uno su
lote, obedeciendo al esqueleto; el orquestador las ensambla en `borrador/cuenta-v0.md`; y UN agente
construye la página de opciones del dueño.

## 3a. El arquitecto

Lee `00-encargo.md` (con su §9, que manda), los cinco mapas, las tres propuestas y los tres juicios
(`juicios/*.md` y `juicios/*.json`), y mira las capturas que necesite. Escribe cuatro ficheros:

1. `juicios/veredicto.json`, en el formato de `docs/diseno/e3-visual/juicios/veredicto.json`: los
   tres juicios resumidos; la base (por mayoría de los jueces; si no la hay, por suma de
   puntuaciones, y dilo, con el cálculo); la lista ÚNICA de injertos con id `I-nn`, origen, destino en
   el esqueleto y estado `pendiente`; las objeciones a la base fundidas y numeradas `O-nn`; los huecos
   `H-nn`; las contradicciones de hecho entre propuestas `X-nn` con la resolución de los jueces y su
   evidencia medida; y las decisiones del dueño con las alternativas que irán a la página de opciones.
2. `borrador/00-glosario.md`: el vocabulario ÚNICO del documento final, para que dos redactores en
   paralelo no inventen dos nombres para la misma cosa: cada tabla y columna, cada ruta de la API,
   cada opción de `better-auth`, cada constante con su valor, cada tipo TypeScript, cada cookie, cada
   correo (por su id), cada aviso (por su id), cada pantalla y componente con su fichero, cada test,
   cada PR del plan, y los términos de pantalla en inglés. Una línea de definición por entrada. Si un
   redactor necesita algo nuevo, lo añade al final de su sección en un bloque «Propuesto para el
   glosario».
3. `borrador/00-decisiones.md`: cada contradicción de hecho o de diseño entre las propuestas, cerrada
   con una decisión `D-nn` y su evidencia (la tabla de límites frente a `verifications`, la reserva
   antes de comprobar la contraseña, la cookie de aparato, `trustProxy` y la validación de la IP, la
   vida de la sesión, los tokens y cuándo muere cada enlace, la defensa contra los escáneres de
   enlaces, la SSRF de los avisos, el proceso que envía los avisos con `AUTO_TICK`, el borrado
   atómico, lo que se guarda de la fecha de nacimiento, el registro con tope, el TOTP del
   administrador, el orden del plan…), y las decisiones del dueño `DD-nn` con su valor por defecto.
   Las del 19 de noviembre (`00-encargo.md` §9.1) van al principio como `D-00a` en adelante y mandan
   sobre todo lo demás. Los redactores NO reabren estas decisiones.
4. `borrador/00-esqueleto.md`: la lista completa de secciones de `docs/cuenta.md`, en el orden final,
   con numeración `§N`, y para cada una: título, fichero `borrador/NN-<nombre>.md`, tamaño objetivo
   en líneas, qué contiene (con las tablas, constantes, tipos, textos y correos que tiene que escribir
   enteros), de qué secciones de qué propuestas sale, qué injertos recibe, qué objeciones resuelve y
   qué huecos rellena. Una tabla `§B` con una fila por sección (`| §N | título | borrador/NN-x.md |
líneas | lote |`), que es la que lee el ensamblado. El total objetivo es de **1.500 a 2.500
   líneas**, repartido en **dos lotes** de 800 a 1.250 líneas, con las dependencias entre lotes.

La estructura debe cubrir como mínimo: la cabecera y el resumen; lo que ya existe y lo que el encargo
daba por hecho (el inventario honesto de `00-encargo.md` §2, actualizado con los mapas); el modelo de
amenazas; los principios; el registro y la edad; la verificación, la recuperación y el cambio de
correo, con cada correo entero; las sesiones; los límites de intento; las rutas y las dependencias;
el administrador; los avisos (catálogo, permiso, service worker y su frontera con D-00p, el iPhone,
el contrato para la app); el modo ausencia y su frontera con E7; el correo transaccional; la
privacidad y los datos (con el texto entero de `Privacy.tsx`); el contacto aparcado; las pantallas
(cada una dibujada en texto, con sus estados y sus textos en inglés); los datos y las migraciones; las
constantes; los tests; **el plan por PR, tests primero**, como el §17 de `docs/retransmision.md`
(cada PR con lo que entra, sus tests antes que su código, su dependencia, su coste, lo que ve el
dueño al acabarlo y su marcha atrás); **los riesgos del despliegue y lo que se mide**; las fronteras
con E2, E7, E8, E9, E10, W5 y la app; los documentos que hay que corregir (los seis que hablan de
correo de juego y los que dicen que no hay recuperación); **las decisiones del dueño**, como el §20 de
`docs/retransmision.md` (cada una con su valor por defecto razonado, lo que cambia si elige otra cosa
y cuándo hace falta la respuesta); y los apéndices (los injertos y dónde cayeron, las objeciones y lo
desestimado, la cobertura del encargo).

## 3b. Los redactores

Cada redactor recibe un lote del esqueleto. Lee `00-encargo.md`, `borrador/00-esqueleto.md`,
`borrador/00-glosario.md`, `borrador/00-decisiones.md`, `juicios/veredicto.json`, la propuesta base
entera, y las secciones de las otras propuestas, de los mapas y las capturas que su lote cita.
Escribe solo los ficheros de su lote, en el registro de `docs/visual.md`: constantes con su valor y su
porqué, flujos con todos sus estados, pantallas dibujadas en texto con sus textos en inglés, correos
enteros en inglés, tipos en TypeScript estricto, citas de línea al código de hoy. Cada fichero empieza
por `## N. <título>` y acaba con una línea `---` seguida de los bloques de cierre: «Injertos
aplicados» (por id), «Objeciones resueltas» (por id), «Huecos rellenados» (por id), «Decisiones de
esta sección» (lo que el esqueleto dejó abierto y has decidido, `N-a`, `N-b`…) y, si hace falta,
«Propuesto para el glosario». Nada de rayas ni guiones en medio de frase. Informe final de 12 líneas.

## 3c. El ensamblado

Lo hace el orquestador con `borrador/ensamblar.sh` (adaptado del de E3): concatena las secciones en
el orden de la tabla `§B` en `borrador/cuenta-v0.md`, quita los bloques «Propuesto para el glosario»
tras fundirlos en el glosario, comprueba que cada injerto, objeción y hueco del veredicto está en el
bloque de cierre de alguna sección, y anota en `borrador/dudas.md` las incoherencias entre secciones.

## 3d. La página de opciones

Un agente construye `opciones/index.html`: las decisiones del dueño que son de gusto o de producto
(qué avisos van encendidos de serie, cuándo y cómo se pide el permiso de avisos, qué se le ofrece al
jugador de iPhone, la pantalla del modo ausencia, la de sesiones, `Account` como lista o como página,
el texto de privacidad, el TOTP del administrador), cada una con su valor por defecto y sus
alternativas **lado a lado**, pintadas de verdad con el sistema visual de E3 a 360 px (como pantallas
del juego, no como descripciones), con una línea de lo que cambia si elige cada una. Las instrucciones
exactas se le dan al lanzarlo.

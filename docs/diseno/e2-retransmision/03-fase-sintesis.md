# E2 · Fase 3: la síntesis (esqueleto, glosario, decisiones cerradas y redacción por secciones)

La síntesis produce el borrador de `docs/retransmision.md` en `borrador/`, como hizo E1 en
`docs/diseno/e1-generador/borrador/` (mira `00-esqueleto.md` y dos o tres secciones de allí como
modelo de densidad). Se hace en dos pasos: primero UN arquitecto escribe el esqueleto, el glosario
y las decisiones cerradas; después VARIOS redactores escriben en paralelo las secciones, cada uno
las suyas, obedeciendo al esqueleto. Un ensamblador las concatena en `borrador/retransmision-v0.md`.

## 3a. El arquitecto

Lee `00-encargo.md`, los siete mapas, las cinco propuestas y los tres juicios (`juicios/*.md` y
`juicios/*.json`). Escribe cuatro ficheros:

1. `juicios/veredicto.json`: la consolidación de los tres juicios en el formato de
   `docs/diseno/e1-generador/juicios/veredicto.json`: los tres juicios resumidos, la ganadora
   (por mayoría; si no hay mayoría, por suma de puntuaciones, y dilo), la lista ÚNICA de injertos
   con id, origen, destino en el esqueleto y estado `pendiente`, las objeciones a la ganadora
   fundidas y numeradas, los huecos, y las contradicciones de hecho entre propuestas con la
   resolución que dieron los jueces y su evidencia.
2. `borrador/00-glosario.md`: el vocabulario ÚNICO del documento final, para que diez redactores
   en paralelo no inventen diez nombres para la misma cosa: nombre de cada tipo TypeScript (el
   estado, el instante, el grupo, el rótulo, el suceso, la línea temporal, el horizonte, el velo),
   de cada tabla y columna nueva, de cada endpoint, de cada constante, de cada bandera, de cada
   banco, de cada paso del plan, y los términos de pantalla en inglés (los nombres de grupo, de
   pestañas, de botones). Con una línea de definición por entrada. Todo lo que un redactor nombre
   tiene que estar aquí; si necesita algo nuevo, lo añade al final de su sección en un bloque
   «Propuesto para el glosario» y el ensamblador lo funde.
3. `borrador/00-decisiones.md`: cada contradicción de hecho o de diseño entre las propuestas,
   cerrada con una decisión y su evidencia (el reloj, la codificación y el tamaño de la línea
   temporal, si sube o no `ENGINE_VERSION` y cuándo, la tabla nueva frente a columnas nuevas, qué
   es exactamente «visto», el alcance por defecto del velo y su caducidad, la caducidad de sesión y
   la cookie de espectador, la curva de ritmo y su duración, la regla de maillots, cómo se corrige
   la crónica que ve el futuro, la primera migración y su plazo, etc.). Los redactores NO
   reabren estas decisiones.
4. `borrador/00-esqueleto.md`: la lista completa de secciones de `docs/retransmision.md`, en el
   orden final, con numeración `§N`, y para cada una: título, fichero `borrador/NN-<nombre>.md`,
   tamaño objetivo en líneas, qué contiene (lista de puntos, con los tipos y tablas que tiene que
   escribir enteros), de qué secciones de qué propuestas sale, qué injertos (por id) recibe, qué
   objeciones (por id) resuelve y qué huecos (por id) rellena. El total objetivo del documento es
   de 8.000 a 11.000 líneas, del orden de `docs/tactica.md` y `docs/generador.md`. Reparte las
   secciones en **lotes** para los redactores (entre 8 y 10 lotes de 800 a 1.300 líneas cada uno),
   y di qué lotes dependen de cuáles (el plan por pasos necesita los tipos; los bancos necesitan
   las constantes). La estructura debe cubrir como mínimo: cabecera y resumen ejecutivo;
   diagnóstico medido; principios; el modelo de tipos del estado y la línea temporal; lo que el
   motor guarda al correr la etapa (sonda, codificación, tamaños); el estado en pantalla (lo
   permanente, lo eventual, la capa fija, las cabeceras de grupo, las diferencias, el perfil); los
   rótulos y la regla de maillots; el ritmo y el montaje; la contrarreloj; el modo sin destripe
   como propiedad del producto (el horizonte, el velo, la tabla de lo visto, las 48 superficies una
   a una, rutas públicas, título de pestaña, correos, sesión y cookie, el que vuelve tras una
   semana, «dame el resultado», el acta compartible, la previa de N+1); el journal, la crónica y
   las noticias (la crónica causal, `news` con semilla y datos, las 11 plantillas, E10); el esquema
   y las migraciones; la API y el contrato; las constantes; los bancos y tests; el plan por pasos
   con tests primero; rendimiento y móvil; riesgos y fronteras; decisiones del dueño; apéndices
   (injertos y dónde cayeron, objeciones desestimadas, tabla de cobertura del encargo y de los
   [DUEÑO n]).

## 3b. Los redactores

Cada redactor recibe un lote del esqueleto. Lee `00-encargo.md`, `borrador/00-esqueleto.md`,
`borrador/00-glosario.md`, `borrador/00-decisiones.md`, `juicios/veredicto.json`, la propuesta
ganadora entera, y las secciones de las otras propuestas y de los mapas que su lote cita. Escribe
solo los ficheros de su lote, en el registro de `docs/generador.md`: tipos enteros en TypeScript,
constantes con valor e intención, tablas donde haya que comparar, ejemplos de pantalla en inglés,
citas de línea al código de hoy, y al final de cada sección una lista «Injertos aplicados» (por id)
y «Objeciones resueltas» (por id). Donde el esqueleto deje algo abierto, decide y anótalo en un
bloque «Decisión tomada aquí». Nada de rayas en medio de frase. Informe final de 12 líneas.

## 3c. El ensamblador

Concatena los ficheros en el orden del esqueleto en `borrador/retransmision-v0.md`, funde los
bloques «Propuesto para el glosario» en el glosario, comprueba que cada injerto del veredicto está
aplicado en alguna sección (y marca en `veredicto.json` el estado `aplicado` con la sección) y que
cada objeción tiene respuesta, y escribe `borrador/dudas.md` con las incoherencias que vea entre
secciones (nombres, cifras, decisiones) para la pasada de coherencia.

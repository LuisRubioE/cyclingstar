## 2. Principios

Doce reglas. Salen de §2 de las cinco propuestas, con la base de `ingeniero.md` §2 y las decisiones cerradas de la síntesis (D-nn, §0.3), y cada una lleva tres cosas: lo que dice, qué lo viola hoy (la cifra está en §1; aquí, la referencia) y qué pieza del diseño lo hace cumplir, en qué sección. No son aspiraciones: cuando un principio y una línea del plan se contradigan, manda el principio y la línea se reescribe. Las cierra la doctrina del dueño que acota a todas (§2.13).

| # | Principio | Qué lo viola hoy (§1) | Qué lo cumple, y dónde |
| --- | --- | --- | --- |
| 2.1 | Un estado con sucesos encima | la radio es una foto por km elegida a mano y la crónica una lista; los sucesos callan en el 71-83 % de los km (§1.1, §1.3, §1.4) | la línea temporal y su reductor, iguales a la foto del motor (I1); la capa fija y la barra (§4.2, §4.4, §6.2) |
| 2.2 | El espacio es canónico; el instante es una proyección | el reloj de un corredor no es continuo: retrocede hasta 138 s en un bloque (§1.2) | D-01 y el corte diagonal, con el corredor en tránsito (§3.1, §3.3) |
| 2.3 | Observar no cambia la carrera | nada hoy; lo arriesgan las propuestas que cambian sucesos para fecharlos (§1.1, §1.10) | `ENGINE_VERSION` no sube; tres ganchos de la sonda y el colector aparte; B10 y B11 (D-09; §5) |
| 2.4 | Nada del futuro sale del servidor antes de su hora | la etapa entera en una respuesta pública, 30 min en caché (§1.3) | visibilidad por dato, tramos por reloj, la meta solo por `POST`; B9 y B18 (D-06; §4.6, §14.3) |
| 2.5 | Sin destripe es una propiedad del producto | 41 de 48 superficies, once puertas de fuera y 52 rutas `GET` (§1.6, §11.2) | un horizonte en un solo punto: tipo obligatorio, `veilSql`, registro de rutas y canario (D-32; §10, §11) |
| 2.6 | Lo visto es lo alcanzado, y lo conocido es un prefijo | nadie sabe qué ha visto nadie (§1.6) | `race_watch` con `known_through` y una letra por etapa (D-28; §10.2) |
| 2.7 | Un código, un vocabulario y un nombre por artefacto | dos vocabularios del mismo grupo y cuatro nombres para el acta (§1.4) | `GroupRole` y `GroupLabel`; `Watch`, `Report` y `Race Radio` (D-18, D-48; §6.3, §12.1) |
| 2.8 | El ritmo depende del recorrido, no de lo que pasa | no hay reproducción; las propuestas con frenos hacían depender de los sucesos hasta el 45 % de la duración | `BROADCAST.pace` por zona de km a meta, sin pausas; la cola no frena (D-19, D-21; §8.2) |
| 2.9 | Lo guardado se renderiza al leer, con semilla neutra | `news` redactada en inglés; la semilla de variante lleva nombres (§1.4, §1.5) | `news` con `seed` y `data`; `pickVariant` con `since`; B4 y B5 (D-45, D-46; §12.7, §12.8) |
| 2.10 | El contrato de hoy no se rompe, y todo se apaga sin desplegar | la web valida cada respuesta y lanza `ContractError` (§1.9) | `StageReplay` y `text` se conservan; migraciones que solo añaden; tres interruptores (D-50, D-53; §14.1, §14.6) |
| 2.11 | Revelar no castiga, y nadie queda bloqueado | no existe revelar; lo que el aprendizaje multiplica por el puesto enseña que el juego premia resultados (`sup. X1`, §1.6) | revelar sin coste ni premio (B20); las órdenes de la N+1, siempre (D-38, DD-09; §11.11, §11.12) |
| 2.12 | Se mide antes de encender | nada mide hoy el relato que se lee, el destripe, el tamaño ni la estabilidad (mapa 07 §5.1) | bancos B1 a B22, el móvil a mano y la prueba de lectura como puerta (D-60; §16, §18.5) |

### 2.1 Un estado con sucesos encima

El encargo lo dice con esas palabras: «una retransmisión no es una lista: es un ESTADO que evoluciona (dónde va cada grupo, con cuánta diferencia, cuánto queda, dónde estamos del perfil) con sucesos encima» (`docs/encargos.md` l. 140-142). Hoy la radio es una foto de un km elegida con un deslizador y la crónica una lista de frases (§1.3, §1.4), y los sucesos narrables callan en siete de cada diez kilómetros (§1.1). En el diseño el estado es la reducción de la línea temporal: una foto clave más los sucesos de estado hasta un bloque dan la foto de ese bloque (`photoAt`, §4.4), y esa foto es la del motor en cada km de la radio (invariante I1: 0 discrepancias en 3.246 fotos, medido por `estado.md` §3.9). Los sucesos narrables van encima, cada uno a su hora (§4.7).

- La pantalla pinta primero el estado (capa fija, barra de grupos, perfil con cursores) y encima la cola de rótulos (§6.2, §6.5); una etapa sin un solo suceso sigue teniendo retransmisión.
- Todo lo que el jugador lee de la etapa sale del mismo estado: la barra, la radio servida y la voz no tienen fuentes paralelas (§12.1).

### 2.2 El espacio es canónico; el instante es una proyección

El motor avanza por bloques de 100 m con un reloj por grupo, y el reloj de un corredor no es continuo: adopta el del grupo en que entra y pierde la deriva en el llano (§1.2). Reducir los cambios de corredor en orden de reloj discrepa de la foto en el 0,3-12,5 % de los grupo-km (medido por `estado.md` §3.3). Por eso lo que se guarda y se reduce está en el espacio, el bloque, y el instante de la tele se calcula encima con reglas escritas para lo que no es exacto (D-01, D-04).

- El reductor opera por bloques (`reducePhoto`, §4.4) y el instante es el corte diagonal (§3.3): cada grupo en el bloque donde su reloj vale `t`.
- Un corredor que cambió de grupo en el tramo de carretera que separa a los dos va en tránsito, con su origen y su destino, nunca en un sitio inventado (§3.3, §3.6).
- El hueco que se enseña es una resta de relojes en el mismo bloque, nunca un reloj interpolado ni el de un corredor (§3.5).

### 2.3 Observar no cambia la carrera

«si lo que hace el motor está bien ahí, no cambies el motor, cambia el race radio» (el dueño, `docs/balance.md` l. 16557-16558, nota de radio posterior a la v86). Guardar lo que la sonda ya ve no cambia una carrera (20 de 20 etapas idénticas en `results`, `events`, `efforts` e `incidents` con foto en cada bloque, C5) y no sube `ENGINE_VERSION`; cambiar el contenido de un suceso sí la sube (v73, `docs/balance.md` l. 14035-14036). E2 no la sube en ningún paso (D-09).

- Todo lo nuevo llega por observación: `onEvent`, `onBanner`, `onTimeTrialRide` y el colector aparte que da a la radio y al aprendizaje solo las fotos de hoy (§5.2, §5.3).
- `StageOutput` no gana campos (Frontera 3, `docs/tactica.md` l. 246-249).
- B10 sella que la radio y el aprendizaje ven las mismas fotos que hoy; B11, que la carrera sale idéntica con los tres ganchos (§16.4).
- E2 no sube la versión (D-09). Si otra línea la sube antes del 17d de la táctica, la «Last race» de las etapas ya corridas cuenta otra carrera, porque `raceReport.ts` l. 148 re-simula sin mirar la versión (C16); qué hacer con eso es del dueño (DD-25, §20; por defecto, adelantar el 17d), no una regla de E2 (§19.5).

### 2.4 Nada del futuro sale del servidor antes de su hora

«la API no puede mandar lo que la pantalla no enseña. Cualquiera abre la pestaña de red del navegador, así que ocultar un dato en la interfaz no lo oculta» ([DOC 5], `docs/encargos.md` l. 240-242). Hoy la etapa sale entera en una respuesta pública y vive 30 minutos en la caché de la web (§1.3). En el diseño cada dato de la línea tiene su hora de visibilidad, y el servidor sirve tramos por reloj de carrera que no pasan de lo alcanzado más la precarga (D-06).

- Tramos por reloj y nunca por espacio: un grupo a 5 min pasa por el final de un tramo de km 5 min después que la cabeza (§4.6, §14.3).
- La meta, el resultado, el acta y las clasificaciones de después solo viajan por `POST …/broadcast/finish` (§8.7).
- Propiedades selladas: `instantAt(cutTimeline(tl, T), T) = instantAt(tl, T)` (B9), y un tramo más allá de lo permitido da 409 `beyond_reached` (B18).
- Nada en pantalla mide lo que queda: ni la duración, ni el número de sucesos, ni marcas en el perfil donde va a pasar algo (§6.9; mapa 06 §7.2, regla 3).

### 2.5 Sin destripe es una propiedad del producto

El punto 3 del encargo: que «ninguna otra pantalla se lo reviente por detrás (portada, ranking, clasificaciones, feed, correo de aviso y hasta el título de la pestaña del navegador), o sea que es una propiedad del producto entero» (`docs/encargos.md` l. 145-147). Hoy destripan 41 de las 48 superficies inventariadas y once puertas de fuera (la décima, `sup. X10`, y la undécima, `sup. X11`, las encontró §11.2), servidas por 52 rutas `GET` (§1.6). En el diseño hay un horizonte por espectador calculado en el servidor en un solo punto, con cuatro piezas que se vigilan entre sí: el tipo `Horizon` obligatorio, el predicado único `veilSql`, el registro de rutas que no arranca si una no declara su política y el canario B1 que las recorre todas (D-32).

- Ninguna función de `packages/db` que lea una fuente con resultado se llama sin horizonte; el tick, la administración y los bancos pasan `worldHorizon`, explícito (§10.6).
- La existencia también informa: un marcador neutro por etapa velada en toda lista, se haya escrito sobre ella una noticia o cinco, y ningún aviso mira el contenido que esconde (§11.6).
- El título de la pestaña, el correo y la vista previa solo pueden llevar `PreStageInfo`, que por tipo no tiene sitio para un resultado (§11.8, §11.9).

### 2.6 Lo visto es lo alcanzado, y lo conocido es un prefijo

Hoy nadie sabe qué ha visto nadie: ni tabla, ni columna, ni almacenamiento del navegador (§1.6). En el diseño una etapa es vista cuando la reproducción llega a la meta, en directo o en resumen; lo servido no cuenta; y lo conocido de una carrera es siempre un prefijo 1..k, porque la N+1 sale con los maillots y la general de la N (D-28). Confiar en el cliente es correcto: quien miente solo se destripa a sí mismo.

- `race_watch` guarda `known_through` y, por etapa del prefijo, una letra: `W` en directo, `S` en resumen, `R` revelada, `A` arrastrada, `X` caducada; la `X` está fuera del velo pero no es conocida y abre en `Watch` (10-e; §10.2, §13.4).
- Ver o revelar la N arrastra las anteriores y se dice antes: `This also reveals stages 3 and 4.` (pantalla).
- Cerrar la pestaña con el último tramo descargado y sin reproducir no convierte la etapa en vista (§10.11).

### 2.7 Un código, un vocabulario y un nombre por artefacto

«Binario: o tiras o no tiras. Se acabó el tercer estado intermedio. Un solo concepto, con el mismo nombre, en el motor y en la Race Radio.» (el dueño, `docs/balance.md` l. 6740-6741, v34). Hoy la crónica y la radio llaman de dos maneras al mismo grupo, eligen el grupo del maillot en dos órdenes distintos y el mismo artefacto tiene cuatro nombres (§1.4). En el diseño hay un código de papel, `GroupRole`, y una etiqueta, `GroupLabel`, que leen la barra, la radio servida, la voz y el acta con las palabras de SPEC §6.15 (D-18), y un nombre por producto: `Watch` es la retransmisión, `Report` el acta y `Race Radio` el microscopio (pantalla; D-48).

- Se retiran `Peloton`, `No man’s land`, `2nd group`, `Group` y la grafía `Grupetto` (pantalla); `GROUP_NOUNS` gana `the gruppetto` y los tres nombres del grupo del maillot (`the race leader’s group`, `the points leader’s group` y `the mountains leader’s group`), que la voz dice como la barra (D-18; §6.3, §12.6).
- El grupo del maillot se elige con `JERSEY_PRIORITY`, no con el orden de la radio (§6.3).
- Las dos reglas del motor que la pantalla necesita se copian a `packages/shared` con un test que falla si divergen (`bunchMinShare`, `chaseMinShare`; §15.5).

### 2.8 El ritmo depende del recorrido, no de lo que pasa

Una reproducción que frena antes de un ataque lo anuncia, y una duración que depende de lo que pasa revela el final (mapa 06 §7.2, regla 3: las extensiones de vídeo sin destripe esconden la barra de progreso por eso). Hoy no hay reproducción; entre las propuestas, los frenos tras cada hito hacían depender de los sucesos del 35 al 45 % de la duración (juez de ejecutabilidad §2.1). El diseño fija la velocidad por zona de km a meta de la cabeza, sin pausas, y la cola de rótulos no frena nunca la carrera (D-19, D-21).

- `BROADCAST.pace` por zonas para `Watch` y `BROADCAST.summaryPace` para `Highlights` (pantalla; §8.2).
- La ficha dice `About 9 min` (pantalla) con velocidades nominales, nunca con las de la carrera, y la pantalla nunca dice cuánto queda (§8.2, §6.9).
- Los saltos son de recorrido (`Next climb`, `Last km`), nunca al «siguiente suceso» (§8.5).

### 2.9 Lo guardado se renderiza al leer, con semilla neutra

La crónica ya se guarda como dato y se redacta al leer; las noticias no, y la semilla de variante de la crónica lleva los nombres y el «and» inglés (§1.4, §1.5). E10 viene después y depende de que E2 lo deje bien (punto 5 del encargo). En el diseño `news` guarda `seed` y `data` con ids y códigos, nunca nombres ni inglés (D-45); la semilla de variante pasa a ser neutra de idioma, y cada variante declara `since` para que añadir una redacción no re-sortee el pasado (D-46).

- `renderNews` pasa a `packages/shared` y reproduce el inglés de hoy carácter a carácter (§12.8).
- La identidad es la del día del hecho: el equipo con el que corrió, no el de hoy (§7.8, §12.7).
- B4 exige el mismo texto desde `seed` y `data`; B5, la huella estable de un corpus congelado (§16.4).

### 2.10 El contrato de hoy no se rompe, y todo se apaga sin desplegar

La web valida cada respuesta con su esquema y lanza `ContractError` si no casa (`apps/web/src/api/request.ts` l. 91-111), y una pestaña abierta con la web de ayer sigue viva tras un despliegue. Lo que lo hace posible ya existe: todos los campos pesados de `stageReplaySchema` son opcionales (§1.9), así que la API puede callar sin romper (D-50). Y ningún comportamiento visible llega al jugador sin encenderlo a mano (D-53).

- La ruta de etapa sigue devolviendo `StageReplay`, y `/api/news` sigue mandando `text` mientras una web cargada lo valide (§14.1).
- Las migraciones solo añaden y son inertes si el código no las lee (§13.1).
- `BROADCAST_WATCH`, `SPOILER_MODE` y `TIMELINE_RECORD` apagan sin desplegar, y cada paso del plan dice con qué se revierte (§14.6, §17.18).

### 2.11 Revelar no castiga, y nadie queda bloqueado

Quien no quiere ver una etapa tiene que poder saber el resultado con un toque sin perder nada, y quien tiene prisa por dar órdenes no puede quedar retenido por una etapa sin ver. Hoy no existe revelar, pero el riesgo está en el juego: el aprendizaje ya multiplica por el puesto (`sup. X1`, `learning.ts` l. 106-110), y una puerta que bloqueara las órdenes o un premio por mirar convertiría el velo en castigo. En el diseño revelar es un acto explícito, confirmado la primera vez y que no cuesta ni da nada (D-38), y las órdenes de la N+1 se pueden dar siempre (DD-09).

- `Show result` en toda puerta y `Watch anyway` después de revelar (pantalla; §11.11).
- Ningún premio, logro, moral ni dinero lee `race_watch` (B20).
- La puerta de las órdenes tiene tres salidas y ninguna cierra: `Stage 6 is waiting for you` · `Watch (about 9 min)` · `Show result` · `Give orders anyway` (pantalla; §11.12).

### 2.12 Se mide antes de encender

El criterio del MVP para el relato es que «un tercero entiende qué pasó en la etapa sin que nadie se lo explique» (`MVP.md` l. 140, paso 31), y la v27 lo dejó escrito para el diario: «la prueba de esta tanda es leer el diario del §7 de arriba abajo. El criterio no es un porcentaje» (`docs/balance.md` l. 6236-6237). Hoy nada mide el relato que se lee, el destripe, el tamaño ni la estabilidad del re-render (mapa 07 §5.1). En el diseño cada propiedad tiene su banco, con umbral y paso en que nace (B1 a B22); el móvil se mide a mano (D-56); y la prueba de lectura, nueve puntos de nueve con las cuatro preguntas de SPEC §6.15, es la puerta del encendido (D-60).

- Cada constante inicial dice qué banco o qué prueba la acepta (§15.6).
- `BROADCAST_WATCH=on` solo con B1 en verde y la prueba de lectura aceptada (§17.18).
- Lo que no se ha medido se dice como tal, con el banco que lo medirá (§18.9, §19.6).

### 2.13 La doctrina del dueño que acota a todos

Dos decisiones del dueño cierran el espacio en que se mueven los doce principios (mapa 05 §2.7).

- **La D7: lo que el motor hace bien no se cambia para contarlo mejor.** «¿por qué no dice la velocidad? eso está mal… podrías calcular cuánto es la velocidad real a la que iba ese grupo sin contar el regalo por alcanzar a un grupo que va muy estirado, y poner ésa en race radio… o sea si lo que hace el motor está bien ahí, no cambies el motor, cambia el race radio» (`docs/balance.md` l. 16555-16558, nota de radio posterior a la v86). Es condicional: lo que el motor hace bien se cuenta cambiando la radio, y por eso E2 cuenta sin tocar el motor (D-09, §2.3). Lo que el motor hace mal no lo decide la D7: el dueño lo ha arreglado en el motor subiendo la versión (la v83, la v84 y la v86, el 21 y el 22 de septiembre), y el salto de 138 s E2 lo tolera en pantalla y se lo deja escrito para que decida (§3.6, D-58, DD-23).
- **[DUEÑO 9]: nada de decidir en vivo.** Tras tumbar la radio de equipo en directo, que era incompatible con un día de juego cada seis horas: «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás» (`docs/epics.md` l. 701-702). La retransmisión se mira, no se juega: ningún mando de `Watch` cambia la carrera, y la etapa que se ve está ya corrida (§1.3; §8.10). La radio de equipo en vivo sigue prohibida (`docs/tactica.md` l. 6323; mapa 05 §2.7).

---

**Injertos aplicados:** ninguno (§B del esqueleto no asigna ninguno a esta sección).

**Objeciones resueltas:** ninguna asignada.

**Huecos rellenados:** ninguno asignado.

**Decisión tomada aquí:** ninguna. Los doce principios escriben decisiones cerradas de la síntesis (D-01, D-04, D-06, D-09, D-18, D-19, D-21, D-28, D-32, D-38, D-45, D-46, D-48, D-50, D-53, D-56, D-60) y la DD-09.

**Propuesto para el glosario:** nada.

**Dudas para el ensamblador:** ninguna.

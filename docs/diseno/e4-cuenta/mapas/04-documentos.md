# Mapa 04 · El corpus: lo que el dueño y los documentos dicen de la cuenta y el contacto

**Commit** `2a29e6d` (la copia de trabajo, `128fac0`, solo añade documentos de E4). **Enteros**:
`00-encargo.md` (353 l.), `00-fase-mapas.md` (112), los mapas 01 (300) y 03 (299) de E4, y
`docs/encargos.md` l. 1 a 72 y 308 a 337 (E4). **Por tramos**: `docs/encargos.md` (l. 150 a 165,
195 a 258, 430 a 460 y 705 a 784), `docs/agenda.md` (§0.1, §3.2, §3.7, §4.3, §4.9, §4.13, §4.15.1,
§4.15.3 y §4.15.5), `docs/epics.md` (G8, G11 y N1), `docs/captacion.md` (§1.1, l. 210 a 264),
`SPEC.md` (§1, §2, §7, §8, §11, §12 y §14), `docs/ops.md` (l. 67 a 144 y 255 a 275),
`docs/navegacion.md` (§1 a §3), `docs/retransmision.md` (las 27 líneas con «E4», que suman 33
apariciones, y §8.8, §10.8, §11.4, §11.9 y §19.2), `docs/visual.md` (las 6 líneas con «E4», que
suman 10 apariciones, y §12), `docs/diseno/e3-visual/00-encargo.md` §7.6 a §7.8 y
`docs/diseno/e2-retransmision/mapas/05-dueno-docs.md`. **El dueño en `docs/balance.md`** (18.083 l.),
por `grep -c -i`: «correo» 1 (el correo del CI, l. 9028), «contraseña», «password», «login»,
«email», «notificac», «privacidad», «soporte», «inactiv», «vacacion», «whatsapp» y «resend» 0;
«ausen» 4, «teléfono» 3, «móvil» 2, «registr» 16, «contacto» 16, «borra» 28 y «away» 60, todas
del motor salvo l. 18050 a 18055 (DD-14, DD-15 y DD-20 de E3). **`balance.md` no guarda ni una
palabra del dueño sobre la cuenta, el correo, la ausencia, los avisos ni el contacto.** El clon es
superficial (54 commits): las fechas salen de un clon completo en `<scratchpad>/mapa04/hist`, con
`git log -S`. Comprobaciones de código: `grep` en `apps` y `packages`, con la línea citada.

## Resumen

1. **El dueño ha hablado poco de la cuenta, y casi siempre de pasada** (§2): un «emails!!!» con dos
   dominios suyos (31-8-2026), una objeción al subdominio, la edad de 16 (14-9-2026), la regla del
   mes contada sin sus comillas, la pregunta por una app y «pronto haremos app» (22-10-2026), y las
   seis respuestas del 19 de noviembre. Del contacto, de la privacidad y del modo ausencia no hay
   ninguna frase suya anterior a §9.1.
2. **El correo de juego está escrito en seis sitios y el dueño lo ha descartado** (§6.3, 1 a 6):
   `agenda.md` §4.3 y §4.15.5, el encargo de E7, `visual.md` l. 3623 («hasta entonces la notificación
   de E4 es el correo»), DD-10 de `retransmision.md` y la tabla de fronteras del propio
   `00-encargo.md` §5, que da a E4 «el correo de los veinte días de la regla del mes».
3. **El aviso al teléfono cambió de vía tres veces** (§5, §6.3): web instalable (agenda, 14-9), solo
   con la app (D-00p, 22-10), y navegador más app (19-11). Lo que E3 retiró, el service worker, es lo
   que el aviso del navegador necesita; nadie ha escrito todavía esa frontera.
4. **Cinco documentos dicen todavía que no hay correo ni recuperación** (§6.2, 1 a 4): el encargo de
   E4, G11, `captacion.md` (tres veces) y la tarea de captar probadores. Desde el 22-9-2026 los hay.
   G11 dice además que el cambio de correo «se aplica a pelo», y el comentario de `authFlow.test.ts`
   l. 9 a 14 cuenta que en realidad respondía 400.
5. **`last_seen` «no existe» en tres documentos** y existe desde el 8-10-2026 (§6.2, 5); y la regla
   del mes habla de «login», que el código no registra (§6.2, 6).
6. **Quien controle el correo del dueño controla el panel** (§3, [DOC 22]): el administrador raíz es
   la cuenta cuyo correo confirmado coincide con `ADMIN_EMAIL` (`docs/ops.md` l. 131 a 134). El
   cambio de correo y la recuperación son, para esa cuenta, la puerta del juego entero.
7. **E2 deja a E4 cinco cosas por escrito y E3 una** (§7): el envío de `stageReadyEmail` (que §9.1
   convierte en no enviarlo nunca), el canal, la frecuencia y la baja, la vida de la sesión,
   `cookieCache`, y que todo aviso salga de `stageReadyNotice`; E3, el aviso al teléfono.

## §1. Qué es palabra del dueño y qué no

| Pilar de E4                             | Dónde lo encarga                              | Origen real                                                                                                                      | Prueba                                                        |
| --------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| El ciclo de la identidad                | encargos l. 312 a 318                         | Del dueño el punto «Confirmación de correos» y el «emails!!!»; el ciclo entero (recuperar, cambiar, sesiones, límites) es de G11 | encargos l. 713 y 720; epics l. 599 a 610                     |
| La fecha de nacimiento y los 16         | encargos l. 316 a 317                         | La recomendación es de la agenda; la decisión, del dueño (14-9-2026), y reafirmada con «Ok» el 19-11                             | agenda l. 38 y 225 a 269; `00-encargo.md` l. 309 a 310        |
| La seguridad como mitad del trabajo     | `00-encargo.md` l. 24 a 26                    | Del orquestador de E4 y de G11 («el camino clásico para secuestrar una cuenta»); no del dueño                                    | epics l. 609 a 610                                            |
| Las notificaciones                      | encargos l. 318 a 319                         | De la agenda (§4.3); el canal lo fijó el dueño el 19-11: «como mucho notificadores de browser y app»                             | agenda l. 311 a 316; `00-encargo.md` l. 313 a 315             |
| El modo ausencia                        | encargos l. 319 a 320                         | De la agenda («un juego sin ausencia castiga tener vida»); la forma la aceptó el dueño con «Ok» el 19-11                         | agenda l. 316; `00-encargo.md` l. 317 a 318                   |
| Separar transaccional y notificación    | encargos l. 320 a 323                         | De G11 y la agenda §3.2; el dueño discutió el subdominio, no la separación                                                       | epics l. 630 a 646; agenda l. 155 a 156                       |
| Calentar el dominio                     | encargos l. 323 a 324                         | De la agenda, a raíz de una pregunta del dueño                                                                                   | agenda l. 140 a 153                                           |
| El aviso al teléfono                    | encargos l. 326 a 329                         | Del dueño la pregunta por una app (contada) y «pronto haremos app»; la web instalable, de la agenda                              | agenda l. 535 y 564; E3 `00-encargo.md` l. 368 a 369          |
| El contacto                             | encargos l. 329 a 331                         | De la segunda pasada del catálogo; ninguna frase del dueño lo pide. El 19-11 lo aparca: «? De momento no lo pongas»              | `00-encargo.md` l. 311 a 312                                  |
| Lo legal (acceso, exportación, menores) | `00-encargo.md` l. 40 a 42; agenda §4.9       | De la agenda; el dueño no ha dicho nada de privacidad                                                                            | agenda l. 418 a 423                                           |
| La regla del mes y su aviso             | encargos l. 441 a 447 (E7); 00-encargo l. 202 | La regla, del dueño (contada); el aviso a los veinte días, de la agenda; el dueño lo quitó como correo el 19-11                  | agenda l. 649 y 665 a 668; `00-encargo.md` l. 330 a 331 y 344 |

## §2. Las palabras del dueño

Textual entre comillas; «contado» cuando la fuente lo narra sin sus palabras. Las fechas son las del
commit que introduce la frase (clon completo, `git log -S`) o la que da el documento.

| #          | Cita o hecho                                                                                                                                                                                                                    | Fuente y fecha                                                                        | Lo que fija para E4                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [DUEÑO 1]  | «emails!!! para poder registrarse y eso… estaba pensando usar mi dominio rubio.pt o mi dominio hereistand.app que uso en mi otro proyecto (le puedo crear un email llamado cyclingstar@hereistand.app), y así usarlo en Resend» | `docs/epics.md` l. 599 a 601 (G11); `c9b7f00`, 31-8-2026                              | el origen del correo; Resend lo eligió él                                                                                                |
| [DUEÑO 2]  | «si el dominio fuera propio, ¿por qué no habría de enviar desde la raíz? ahí no está el correo que yo leo»                                                                                                                      | `docs/epics.md` l. 631 a 632; `c9b7f00`, 31-8-2026                                    | enviar desde la raíz de un dominio del juego le parece bien; hoy el remitente es `no-reply@cyclingstar.app` (`docs/ops.md` l. 103 a 105) |
| [DUEÑO 3]  | Contado: el dominio propio, «**Para la versión final**, dicho por el dueño»; «el dueño no quiere comprar dominio en fase de pruebas»                                                                                            | `docs/epics.md` l. 620 y 622 a 623; `c9b7f00`                                         | superado: el juego ya está en `cyclingstar.app` (`00-encargo.md` §2.4, punto 2)                                                          |
| [DUEÑO 4]  | «si después de las pruebas me compro un dominio, no hay problema con la reputación de envío, ¿no?»                                                                                                                              | `docs/agenda.md` l. 140 a 141; `eee1b93`, 14-9-2026                                   | de aquí sale el calentamiento (l. 150 a 153)                                                                                             |
| [DUEÑO 5]  | Decisión 5, «¿Edad mínima?»: «**16**, declarada y sin verificación documental». Contado antes: «Respuesta 5: no estaba pensado, y la propuesta de 12…»                                                                          | `docs/agenda.md` l. 38 (tabla del 14-9-2026) y l. 227; `9db3958`, 14-9-2026           | 16, por fecha declarada; la agenda no deja claro si el 12 lo propuso él                                                                  |
| [DUEÑO 6]  | Contado: «si en un mes real no hace login ni una vez, el corredor se convierte en bot»; y «La regla ya está decidida por el dueño: un mes real sin entrar ni una vez y el corredor pasa a bot»                                  | `docs/agenda.md` l. 649 (`c9578cb`, 14-9-2026); `docs/encargos.md` l. 441 a 442       | la regla del mes; su aplicación es de E7, su aviso y su relación con la ausencia, de E4                                                  |
| [DUEÑO 7]  | Contado: «La pregunta era una app de Android y de Apple para acceder de forma más nativa»; es uno de «los dos que el dueño añadió en la segunda pasada»                                                                         | `docs/agenda.md` l. 535; `docs/encargos.md` l. 728 a 732                              | lo que pedía era el aviso, según la agenda (l. 541 a 545), no él                                                                         |
| [DUEÑO 8]  | «DD-14: No, pronto haremos app, asi que quita la web instalable. DD-15: no aplica.» Y en el mismo mensaje: «no hay jugadores aun salvo yo»                                                                                      | E3 `00-encargo.md` l. 368 a 370, 22-10-2026; `docs/visual.md` l. 2736                 | sin web instalable (D-00p); en octubre la única cuenta era la suya                                                                       |
| [DUEÑO 9]  | «del tema de la comision, lo que puedo hacer es que para comprar un premium obliga a entrar en la web y hacerlo ahi... con eso sirve???»                                                                                        | E3 `00-encargo.md` l. 390 a 391, 22-10-2026                                           | de E8; para E4, la cuenta tiene que ser la misma en la web y en la app                                                                   |
| [DUEÑO 10] | «lo que hay que hacer si acaso es mejorar la granularidad de las instrucciones, con más escenarios hipotéticos quizás»                                                                                                          | `docs/epics.md` l. 701 a 702 (N1); en el repositorio desde `51ee816`, 30-8-2026       | el jugador no está delante: el mundo decide con lo que dejó escrito (el suelo del modo ausencia)                                         |
| [DUEÑO 11] | «Según vayan llegando jugadores humanos, habría que ir limpiando bots poco a poco, siempre de los que tengan 0 puntos en el ranking.»                                                                                           | `docs/epics.md` l. 590 a 591 (G8); desde `51ee816`, 30-8-2026                         | un ausente no puede confundirse con un bot de relleno (agenda l. 680 a 682)                                                              |
| [DUEÑO 12] | Contado: «El dueño descarta Discord porque no le gusta y propone una comunidad de WhatsApp»                                                                                                                                     | `docs/agenda.md` l. 448 a 450 (`c9578cb`, 14-9-2026); `docs/encargos.md` l. 779 a 781 | en la beta, el grupo de WhatsApp «con el dueño dentro» es el único canal de hecho                                                        |
| [DUEÑO 13] | Contado: uno de los «ocho puntos del dueño» es «**Confirmación de correos**»; otro, «News + Race Radio + journal, y sin destripe»                                                                                               | `docs/encargos.md` l. 713, 720 y 724                                                  | de él viene que ningún aviso destripe (E2 mapa 05 l. 176, «tu modo sin destripe»)                                                        |
| [DUEÑO 14] | A la edad de 16 con fecha de nacimiento, pedida al entrar a las cuentas que ya existen: «Ok»                                                                                                                                    | `00-encargo.md` l. 309 a 310, 19-11-2026                                              | decidido; el abogado sigue pendiente (l. 323 a 325)                                                                                      |
| [DUEÑO 15] | Al buzón `support@cyclingstar.app` con enlace en el pie y en el login: «? De momento no lo pongas»                                                                                                                              | `00-encargo.md` l. 311 a 312, 19-11-2026                                              | sin canal de contacto; se escribe como riesgo y coste                                                                                    |
| [DUEÑO 16] | A los avisos de juego por correo: «No, como mucho notificadores de browser y app»                                                                                                                                               | `00-encargo.md` l. 313 a 315, 19-11-2026                                              | ningún correo de juego, tampoco el de la regla del mes (l. 330 a 331)                                                                    |
| [DUEÑO 17] | A con qué y cuándo hará la app: «Ni idea»                                                                                                                                                                                       | `00-encargo.md` l. 316, 19-11-2026                                                    | el teléfono, un canal más sin tecnología supuesta                                                                                        |
| [DUEÑO 18] | Al botón de ausencia con fecha de vuelta (decide el entrenador, se callan los avisos, no corre la regla del mes, lo largo es de E7): «Ok»                                                                                       | `00-encargo.md` l. 317 a 318, 19-11-2026                                              | la frontera del modo ausencia                                                                                                            |
| [DUEÑO 19] | A nada de entrar con Google o Apple por ahora: «Ok»                                                                                                                                                                             | `00-encargo.md` l. 319, 19-11-2026                                                    | solo correo y contraseña                                                                                                                 |

**Lo que no hay.** Ninguna frase del dueño sobre la privacidad, el borrado, la exportación, las
sesiones, los límites de intento, el modo ausencia anterior al 19-11, las vacaciones o el soporte, en
`balance.md`, la agenda, los encargos, `epics.md`, `captacion.md`, `ops.md`, `SPEC.md` ni en los
encargos de E2 y E3. Las «decisiones del dueño» de `ops.md` (l. 282 y 348, 2-10-2026) son del reinicio
del mundo y de la vuelta de prueba.

## §3. Lo que dicen los documentos

| #        | Lo que dice                                                                                                                                                                                                                   | Fuente                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [DOC 1]  | E4 es «el agujero más feo del producto»: «hoy una contraseña perdida es un corredor perdido»; sin correo, sin recuperación, sin verificar, y el cambio de correo sin confirmar ni avisar                                      | `docs/encargos.md` l. 312 a 316                                                            |
| [DOC 2]  | Separar transaccional y notificación «en subdominios distintos desde el primer día», y calentar el dominio                                                                                                                    | `docs/encargos.md` l. 320 a 324                                                            |
| [DOC 3]  | El aviso al teléfono «llegará con la app» y «por dónde se queja un jugador»: «el primero que se quede fuera de su cuenta lo va a descubrir de la peor manera»                                                                 | `docs/encargos.md` l. 326 a 331                                                            |
| [DOC 4]  | E4 va emparejado con E5: «la cuenta que hoy se puede perder para siempre»                                                                                                                                                     | `docs/encargos.md` l. 748 a 749                                                            |
| [DOC 5]  | Tareas sin diseño: comprar el dominio «con el subdominio transaccional separado», escribir las condiciones y la privacidad «con la edad mínima de 16», guardar país y `Accept-Language`, registrar `last_seen`                | `docs/encargos.md` l. 766 a 775                                                            |
| [DOC 6]  | Captar probadores hacia una lista de espera «porque hoy no hay recuperación de contraseña (E4)»                                                                                                                               | `docs/encargos.md` l. 776 a 778                                                            |
| [DOC 7]  | La regla del mes en E7: que «pasar a bot» sea que decidan entrenador y equipo, que «se avise por correo antes», reloj más corto para el mánager y que G8 no barra a un humano en pausa                                        | `docs/encargos.md` l. 441 a 451                                                            |
| [DOC 8]  | Notificaciones: «avisar (correo, y a medio plazo notificación web, con el flujo separado del transaccional según 3.2)» y «ausentarse sin perder (que las políticas de N1 gobiernen cuando no estás…)»                         | `docs/agenda.md` l. 313 a 316                                                              |
| [DOC 9]  | Edad: la horquilla europea de 13 a 16, «confirmarlo con un abogado antes de abrir el registro», fecha declarada sin documentos y «un botón de denuncia que ya vas a necesitar»                                                | `docs/agenda.md` l. 227 a 269                                                              |
| [DOC 10] | Legal: acceso, borrado, exportación, `Privacy.tsx` viva, y «un juego cuyo protagonista empieza a los 18 atraerá a jugadores de 14»                                                                                            | `docs/agenda.md` l. 418 a 423                                                              |
| [DOC 11] | La app: PWA primero (iOS 16.4 avisa «para las webs añadidas a la pantalla de inicio»), la trampa de la comisión, y el cambio del 22-10: «El aviso al teléfono de E4 llegará con la app»                                       | `docs/agenda.md` l. 533 a 568                                                              |
| [DOC 12] | El que se va: un humano abandonado ocupa plaza, un mánager ausente deja el equipo sin nadie; «Va en E7»                                                                                                                       | `docs/agenda.md` l. 613 a 632                                                              |
| [DOC 13] | La regla del mes: un mes son 120 días de juego; reversible «sin pedir permiso a nadie»; aviso a los veinte días; silla del mánager; no lo barre G8; tres escalones; registrar la última visita «ya»                           | `docs/agenda.md` l. 647 a 691                                                              |
| [DOC 14] | `users.locale` es `'es'` por defecto con la interfaz en inglés: «La columna ya miente»                                                                                                                                        | `docs/agenda.md` l. 134 a 135                                                              |
| [DOC 15] | G11: el dominio es «lo único que no se arregla retroactivamente»; un subdominio por flujo; dejar la raíz «para un buzón de verdad (`hola@`, `soporte@`)»; DKIM, SPF, return path, DMARC en `p=none` y baja real               | `docs/epics.md` l. 614 a 660                                                               |
| [DOC 16] | `captacion.md`: «Recoger correos, NO registros», «no hay recuperación de contraseña», «conviene tener E4 antes de que sean cincuenta», «No abrir el registro directo hasta que exista recuperación»                           | `docs/captacion.md` l. 26 a 34, 213 a 216 y 263 a 264                                      |
| [DOC 17] | SPEC: «el mundo avanza sin ti (órdenes en cola)»; un día de juego son 6 horas reales                                                                                                                                          | `SPEC.md` l. 49 y 53                                                                       |
| [DOC 18] | SPEC §11: `users(id, email citext unique, password_hash, locale, is_admin bool, created_at)`                                                                                                                                  | `SPEC.md` l. 914                                                                           |
| [DOC 19] | SPEC: moderación de nombres con «botón de denuncia»; verificar la marca antes del lanzamiento                                                                                                                                 | `SPEC.md` l. 859 y 1018                                                                    |
| [DOC 20] | `ops.md`: tres correos, verificación obligatoria; «Las cuentas anteriores a este cambio conservan la sesión que tuvieran; al volver a entrar se les pide confirmar»                                                           | `docs/ops.md` l. 85 a 96                                                                   |
| [DOC 21] | `ops.md`: el remitente sale «desde el dominio, no desde el subdominio de la web»; SPF y MX en `send.`, DKIM, DMARC opcional                                                                                                   | `docs/ops.md` l. 101 a 109                                                                 |
| [DOC 22] | `ops.md`: el raíz del panel es quien tiene confirmado el correo de `ADMIN_EMAIL`, evaluado en cada petición; el panel confirma correos a mano y borra cuentas                                                                 | `docs/ops.md` l. 131 a 140                                                                 |
| [DOC 23] | `ops.md`, tareas pendientes: aviso de privacidad publicado, «la IP transitoria de geolocalización no se persiste»; Sentry sin configurar                                                                                      | `docs/ops.md` l. 260 a 274                                                                 |
| [DOC 24] | `navegacion.md` no nombra `Account`, `Privacy`, el pie ni el login salvo «Sin sesión: `World` · `News` · `How to play` · `Log in` · `Sign up`»; su principio 4 es «Cero huérfanos»                                            | `docs/navegacion.md` l. 60 y 82                                                            |
| [DOC 25] | `retransmision.md` §10.8: «Alargar la sesión es de E4 y ayuda, pero no basta»; `cs_viewer` dura 90 días reales                                                                                                                | `docs/retransmision.md` l. 6693 y 6695                                                     |
| [DOC 26] | `retransmision.md` §11.9: «cuándo, a quién, con qué baja y por qué canal se envía es de E4»; las tres reglas que «E4 hereda»; un aviso del navegador o un service worker «si E4 los crea, usan `stageReadyNotice` y nada más» | `docs/retransmision.md` l. 7232 y 7278 a 7284                                              |
| [DOC 27] | `visual.md` §12: E3 no hace el service worker ni nada instalable, y «lo que E4 pedía de la web instalable, el aviso al teléfono en iPhone […] pasa a la app»                                                                  | `docs/visual.md` l. 2736                                                                   |
| [DOC 28] | La constante del velo: lo que tiene más de 56 días de juego (14 reales) deja de esconderse; la última visita se escribe como mucho una vez por hora, «también la pide E7»                                                     | `packages/shared/src/broadcast/constants.ts` l. 195 y 210; `docs/retransmision.md` l. 5048 |

## §4. `docs/retransmision.md`: las 27 líneas con «E4»

Seis no son el encargo: l. 116 aclara que E1 a E13 son encargos, y l. 6920, 6966, 7080, 7081 y 13388
son la superficie `sup. E4` (la pestaña `Result`). Las otras 21:

| Línea                             | Qué deja a E4                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6293, 6901                        | `session.cookieCache` es «configuración de la sesión de toda la aplicación, que es de E4 (D-34)»; «Si E4 enciende `cookieCache`, el memo sobra»                                 |
| 6693                              | alargar la sesión (hoy 7 días) es de E4, y no basta: por eso existe `cs_viewer`                                                                                                 |
| 6963, 6964                        | `sup. T5`, el correo: tres de cuenta; `sup. T6`, notificaciones, service worker y Badging API: «no existen»                                                                     |
| 7232, 7278, 7284                  | §11.9: el envío de «etapa lista» y su canal, cuándo, a quién y con qué baja; un aviso del navegador usa `stageReadyNotice`                                                      |
| 11898                             | `stageReadyEmail(p, ownRiderOnStartlist, url)` en `emails.ts` (hoy l. 153, sin llamadas fuera de los tests: `grep`)                                                             |
| 12669                             | fila de fronteras: «qué se avisa, por dónde, cuándo y con qué baja; la vida de la sesión»; regla, «todo aviso se construye solo con `PreStageInfo` y la lista de salida (D-42)» |
| 12689, 12723, 12841               | «No envía avisos»; el envío, la frecuencia, el canal y la baja son de E4 (DD-10)                                                                                                |
| 12880, 12895, 12988, 13004, 13038 | DD-10 «fuera de E2»: «nadie recibe correo de juego hasta E4»; «Cadencia, canal y baja son de E4»                                                                                |
| 13431, 13432, 13634               | `sup. T5` con `stageReadyEmail` («el envío es de E4»); `sup. T6`, «E4 hereda la regla»; la firma con `_locale`                                                                  |

Y dos secciones que no dicen «E4» y le tocan: §8.8 y §11.4 (l. 5536 a 5546 y 7091 a 7100), el bloque
`While you were away` con el digest para quien vuelve con una carrera terminada y velada, que es lo
que ve el ausente al volver; y §10.8 (l. 6743), `cs_viewer` se borra al cerrar sesión y al borrar la
cuenta.

## §5. `docs/visual.md`: las 10 apariciones

l. 1329 (las pantallas de E4 a E13 entran por el PR de componente y de token de §5.4); l. 2736 (D-00p:
el aviso en iPhone «pasa a la app»); l. 3616 («el aviso al teléfono de E4 pasa a la app que hará el
dueño»); l. 3623 (fila de fronteras, que añade «hasta entonces la notificación de E4 es el correo»);
l. 3658 y 3679 (lo mismo, como frontera y no como trabajo de E3). Ninguna nombra el aviso del
navegador en escritorio ni en Android. E3 deja hechas las pantallas de entrada y de la cuenta
(`00-encargo.md` l. 78, §17.21 de `visual.md`), con el modo oscuro en `/account` (DD-05,
`docs/balance.md` l. 18041).

## §6. Contradicciones

### 6.1 Entre documentos

1. **El aviso al teléfono: ¿solo con la app?** `docs/encargos.md` l. 252 a 254 y `docs/agenda.md`
   l. 567 a 568: «el aviso al teléfono de E4 llegará con ella [la app]». `docs/visual.md` l. 2736:
   el aviso en iPhone «pasa a la app». Frente a eso, el dueño el 19-11 (§2, [DUEÑO 16]):
   «notificadores de browser y app», o sea aviso del navegador antes de la app.
2. **El service worker.** `docs/visual.md` l. 3656: E3 no hace «ni service worker»; l. 234 y 3777:
   «sin service worker no hay cáscara guardada». `docs/retransmision.md` l. 7284 admite uno «si E4 los
   crea». No se contradicen, pero ninguno dice si un service worker solo de avisos rompe D-00p
   (`00-encargo.md` l. 338 a 340 lo deja a E4).
3. **El subdominio.** G11 (`docs/epics.md` l. 639): «Lo estándar es un subdominio para cada
   flujo»; la tarea de `docs/encargos.md` l. 766, «con el subdominio transaccional separado». `docs/ops.md`
   l. 104: el correo «se manda desde el dominio, no desde el subdominio» (`send.` es solo el del
   SPF y el MX). Hoy hay un solo flujo y un solo remitente, de acuerdo con [DUEÑO 2].
4. **La cita del 22 de octubre no es la misma en todas partes.** El original dice «asi» y «DD-14: No,
   pronto haremos app» (E3 `00-encargo.md` l. 368; `visual.md` l. 2736); `agenda.md` l. 564 y
   `encargos.md` l. 252 la citan como «pronto haremos app, así que quita la web instalable», con tilde y
   sin «No,». Es una cita retocada, no inventada.
5. **Quién decide al ausente.** `docs/agenda.md` l. 315: «que las políticas de N1 gobiernen cuando no
   estás». N1 no existe en el código (el mapa 03 §7 mide piloto automático y entrenador); el dueño el
   19-11: «mientras dura decide el entrenador» ([DUEÑO 18]).
6. **Dónde vive la inactividad.** `docs/agenda.md` l. 631 a 632 la da a E7 (con la sucesión en E9) y
   l. 691 la última visita a «la lista de tareas, no en E7»; `00-encargo.md` l. 202 da a E4 «el correo
   de los veinte días» y a E7 «qué hace el mundo con el ausente». Encajan, salvo el correo (§6.3, 5).
7. **Líneas citadas que se han movido.** `retransmision.md` l. 12669 cita E4 en `encargos.md`
   «l. 279-307», hoy l. 308 a 337; E2 mapa 05 l. 218 y l. 227 citan E4 en l. 269 a 285; E3
   `00-encargo.md` l. 108, «E4 l. 298»; `visual.md` l. 3623 cita la consecuencia en «`docs/encargos.md`
   l. 320», hoy l. 326 a 329. `retransmision.md` l. 6963 cita las plantillas en `emails.ts` l. 64, 90
   y 116, hoy l. 66, 92 y 118.

### 6.2 Documento contra código

1. **«Sin enviar un solo correo».** `docs/encargos.md` l. 312 a 316, `docs/epics.md` l. 603 a 610 y
   `docs/captacion.md` l. 26 a 28, 213 a 216 y 263 a 264, contra `apps/api/src/auth.ts` l. 113 a 165 y
   `emails.ts` l. 66, 92 y 118: hay verificación obligatoria, recuperación y cambio de correo con aviso
   (mapa 01 §1 y §2). Desde el 22-9-2026 (`bd6f1f9`, `36aee34`; E2 mapa 05 l. 218).
2. **La tarea de captación sigue atada a E4.** `docs/encargos.md` l. 776 a 778 y `docs/captacion.md`
   l. 263 a 264: no abrir el registro «hasta que exista recuperación de contraseña (E4)». Ya existe;
   lo que no existe es la fecha de nacimiento ni las condiciones (`00-encargo.md` §2.3, punto 1).
3. **El cambio de correo «a pelo».** G11 (`docs/epics.md` l. 604 a 610): `sendChangeEmailVerification`
   como no-op y el cambio aplicado sin confirmar. El comentario de `apps/api/src/authFlow.test.ts`
   l. 9 a 14 dice que la ruta «llevaba tiempo respondiendo `400 Verification email isn't enabled`»
   porque esa opción no existe en `better-auth` 1.6: el cambio fallaba, no se aplicaba. No he visto el
   código de entonces para saber cuál de los dos era verdad en agosto.
4. **La privacidad.** `docs/ops.md` l. 271 a 272 y `Privacy.tsx` l. 27, 33 y 38 contra el código: el
   mapa 03 §5 lo da frase a frase (IP en `sessions` y en los logs, `cs_viewer`, el «Ask and…» sin a
   quién pedir). No lo repito.
5. **`last_seen` «no existe».** `docs/encargos.md` l. 439 a 441 (E7) y l. 773 a 775, `docs/agenda.md`
   l. 615 a 616 y 688 a 691, contra `packages/db/src/schema.ts` l. 121 a 125 y `horizon.ts` l. 585 a
   603: existe desde `d598141` (8-10-2026), aunque nadie la lee y solo la escriben las peticiones que
   resuelven el espectador (mapa 03 §6).
6. **La regla del mes dice «login».** [DUEÑO 6] habla de no hacer «login» en un mes; el código no
   guarda ningún inicio de sesión (no hay columna ni tabla: `grep last_login` sin resultados), y con la
   sesión de 7 días renovables (mapa 01 §3) quien entra cada semana no vuelve a escribir la contraseña
   nunca. Lo único que hay es `last_seen_at`, que mide visitas, no entradas.
7. **SPEC §11 no es el esquema.** `SPEC.md` l. 914 lista seis columnas de `users`; `schema.ts` l. 100 a
   132 tiene además `name`, `email_verified`, `image`, `premium`, las del velo, `last_seen_at` y
   `theme`, y `password_hash` existe sin uso (l. 106 a 108; mapa 01 §6).
8. **`locale` «ya miente»** (`docs/agenda.md` l. 134 a 135): sigue igual, `'es'` por defecto
   (`schema.ts` l. 109) y `stageReadyEmail` con `'en'` fijo (mapa 03 §1).
9. **`stageReadyNotice` ya se usa fuera del aviso**: `apps/api/src/spaShell.ts` l. 99 lo llama para
   el texto neutro de la cabecera de la página. `retransmision.md` l. 7284 lo reserva para «una
   notificación del navegador, un service worker o un contador»; no es contradicción, pero E4 no es
   el único que depende de su texto.

### 6.3 Documento contra lo decidido el 19 de noviembre (`00-encargo.md` §9.1)

1. **`docs/agenda.md` l. 313 a 314**: «avisar (correo, y a medio plazo notificación web…)». Contra
   [DUEÑO 16]: ningún correo de juego.
2. **`docs/agenda.md` l. 665 a 668**: «Un correo a los veinte días diciendo “si no entras, tu corredor
   pasa a manos del entrenador el día tal”». Contra `00-encargo.md` l. 330 a 331: «tampoco el aviso de
   la regla del mes».
3. **`docs/encargos.md` l. 446** (E7): «que se **avise por correo antes**». Igual que 2.
4. **`docs/visual.md` l. 3623**: «hasta entonces la notificación de E4 es el correo». Igual que 1.
5. **`docs/diseno/e4-cuenta/00-encargo.md` l. 202**, la tabla de fronteras del propio brief, da a E4
   «el correo de los veinte días de la regla del mes»; su §9.1 (l. 330 a 331) lo quita. El brief se
   contradice a sí mismo.
6. **`docs/retransmision.md` l. 12895** (DD-10): «nadie recibe correo de juego hasta E4», y l. 13004
   («Cadencia, canal y baja son de E4»). Con §9.1, `stageReadyEmail` no se envía nunca como correo
   (`00-encargo.md` l. 333 a 334): la plantilla queda escrita y probada para nada, salvo su
   `stageReadyNotice`.
7. **`docs/encargos.md` l. 320 a 323 y `docs/agenda.md` l. 155 a 156**: separar los dos flujos «desde
   el primer día». §9.1 (l. 335 a 337): pierde urgencia porque no habrá correo de notificación.
8. **`docs/encargos.md` l. 329 a 331**, el contacto como pieza, y `docs/epics.md` l. 640, la raíz para
   «`hola@`, `soporte@`». Contra [DUEÑO 15]: «De momento no lo pongas». Y `Privacy.tsx` l. 38 promete
   un canal que no existe (`00-encargo.md` l. 328 a 329 manda retirarlo).
9. **`docs/agenda.md` l. 259**: el flujo de los 16 incluye «un botón de denuncia que ya vas a
   necesitar». Sin canal de contacto, nadie puede avisar de que una cuenta es de un menor; la agenda
   pide «actuar cuando te enteras» (l. 254).
10. **`docs/agenda.md` l. 539 a 545 y 559 a 561**: el aviso por notificación web exigía la web
    instalable en iPhone. Con D-00p y [DUEÑO 16], el aviso del navegador vuelve sin web instalable:
    lo que llegue al iPhone lo comprueba el mapa 02 (`00-encargo.md` l. 341 a 343).
11. **`docs/agenda.md` l. 649 a 662**, la regla del mes sin excepción. §9.1 punto 5: mientras dura
    una ausencia declarada «no corre la regla del mes». La agenda no contempla la ausencia declarada.

## §7. Lo que E2 y E3 le dejaron a E4 explícitamente

| De  | Lo que deja                                                                                                                                                                   | Dónde                                            | Estado tras el 19-11                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| E2  | Enviar `stageReadyEmail`: cuándo, a quién, con qué baja y por qué canal (DD-10)                                                                                               | `retransmision.md` l. 7232, 12723, 12895 y 13004 | no se envía como correo; queda `stageReadyNotice` para navegador y app |
| E2  | Las tres reglas que «E4 hereda»: enviar sin mirar el resultado, ningún adjetivo variable, el canario de B1a                                                                   | `retransmision.md` l. 7278 a 7282                | valen para todo aviso del navegador y de la app                        |
| E2  | Un aviso del navegador, un service worker o la Badging API, «si E4 los crea», usan `stageReadyNotice` y nada más; el service worker no guarda respuestas `horizon` ni `watch` | `retransmision.md` l. 7284; `sup. T6`, l. 13432  | vigente, y ahora necesario                                             |
| E2  | La vida de la sesión: «Alargar la sesión es de E4»                                                                                                                            | `retransmision.md` l. 6693 y 12669               | abierto                                                                |
| E2  | `session.cookieCache`, «configuración de la sesión de toda la aplicación»; si E4 lo enciende, sobra el memo de `request.viewer()`                                             | `retransmision.md` l. 6293 y 6901                | abierto; el mapa 01 §3 confirma que hoy no está                        |
| E2  | `last_seen_at`, escrita como mucho cada hora, «también la pide E7»                                                                                                            | `constants.ts` l. 210; `00-encargo.md` l. 79     | existe; nadie la lee (mapa 03 §6)                                      |
| E3  | El aviso al teléfono, «lo diseña E4 para ella [la app]»                                                                                                                       | `visual.md` l. 2736, 3616, 3623, 3658 y 3679     | ahora también el del navegador, con la frontera de D-00p por escribir  |
| E3  | Las pantallas nuevas de E4 entran por un componente y sus tokens, con test por estado y su sitio en `/_ui`                                                                    | `visual.md` l. 1329 a 1333                       | vigente                                                                |

## Lo que este mapa no ha podido comprobar

- **Lo que el dueño dijo fuera del repositorio**: sus ocho puntos originales están contados, no
  citados (`docs/encargos.md` l. 713 a 732), y la pregunta por la app también. Si la «propuesta de 12»
  de la edad fue suya, la agenda no lo deja claro (l. 227).
- **Cómo era el cambio de correo antes del 22-9-2026** (§6.2, 3): no he leído `auth.ts` en el
  historial; solo el comentario de `authFlow.test.ts`.
- **La fecha exacta en que se escribieron** §4.3 y §4.9 de la agenda: el clon completo se descargó
  sin blobs y cada `git log -S` tarda minutos; solo he fechado las citas del dueño.
- **`balance.md`, `retransmision.md` y `visual.md` enteros**: búsqueda por palabras y tramos. Una frase
  del dueño sobre la cuenta sin ninguna de las palabras buscadas se habrá escapado.
- **Lo legal** (si basta una fecha declarada, qué hacer con una cuenta de un menor sin canal de
  contacto, si el nombre de un equipo de alguien borrado es dato personal): a confirmar con un abogado.

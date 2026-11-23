## 21. Decisiones del dueño

Las diecisiete `DD-nn` de `00-decisiones.md` están **contestadas**: seis preguntas el 19 de noviembre de 2026 (`00-encargo.md` §9.1, l. 304 a 353), diez el 23 (§9.2, l. 355 a 394) y las dos que quedaban el mismo 23 (§9.3, l. 396 a 408). Se escriben como contestadas, con su cita textual y lo que deciden. Lo que de verdad queda abierto está en §21.4, y lo que pide un abogado, en §21.3. Una decisión contestada se puede cambiar: cada fila dice qué cambia y antes de qué PR hay que saberlo.

### 21.1 Las que se miraron en la página de opciones (DD-01 a DD-08)

| DD    | Qué                       | Respuesta (23 de noviembre de 2026; `00-encargo.md`)                                                              | Lo que queda decidido                                                                                                                                                        | Si cambiara                                                                                 | Antes del PR |
| ----- | ------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------ |
| DD-01 | TOTP del panel            | «Ok. Mira como resolví eso en hereistand y en twikightstruggle.app y me gustaría que sea parecido» (l. 360 a 361) | **A, sin TOTP**, y el panel como `twilightstruggle` y `his`: raíz fijo por `ADMIN_EMAIL`, nadie se quita su papel, cada edición escrita con el valor viejo y el nuevo (§8.5) | B sería el plugin `twoFactor` sin `sendOTP`, la 0059 y un PR más (§8.6); hoy no existe      | 5            |
| DD-02 | Avisos de serie           | «Esos avisos son pushup notification? Si es así, ok» (l. 370 a 371)                                               | **A, solo por push**: `stage_digest`, `plan_ending`, `offer_received`, `away_warning`, `away_over`; `stage_ready` apagado (§13.1)                                            | B (solo los dos de la ausencia) o C (también `stage_ready`): una línea de `NOTICE_DEFAULTS` | 14           |
| DD-03 | Cuándo se pide el permiso | «ok» (l. 372)                                                                                                     | **A**: tras crear el corredor, al seguir una carrera y siempre en `Account` (§13.3)                                                                                          | B (solo en `Account`) quita dos `Notice`; C añade la portada a la tercera visita            | 14           |
| DD-04 | El iPhone                 | «si detecta que es un iPhone, que permita pero explique cómo hacerlo» (l. 373 a 376)                              | **Se detecta el iPhone y se explica la pantalla de inicio**, como `twilightstruggle` (`ai/ui/src/online/push.ts` l. 47 a 55 y 230); con iOS 26 o más, sin manifiesto (§13.4) | con manifiesto mínimo, también iOS 16.4 a 18 (§21.4, punto 1)                               | 14           |
| DD-05 | Pantalla de ausencia      | por defecto: «ok pero cuando dices correo... Sin correo, solo notificación push» (l. 385 a 388)                   | **A**: atajos, fecha, líneas calculadas y `AwayBand` (§14.1)                                                                                                                 | B (solo la fecha) quita la tabla de líneas; C quita la banda                                | 13           |
| DD-06 | Pantalla de sesiones      | por defecto (l. 385)                                                                                              | **A**: lista sin IP (§6.4)                                                                                                                                                   | B volvería a guardar la IP y cambiaría Privacy; C, solo el número y el botón                | 11           |
| DD-07 | `Account`                 | por defecto (l. 385)                                                                                              | **A**: lista con subpáginas (§12.1)                                                                                                                                          | B, una página con paneles (§12.1)                                                           | 11           |
| DD-08 | Presentación de Privacy   | por defecto (l. 385)                                                                                              | **A**: todo a la vista, por apartados (§10.1)                                                                                                                                | B, tabla; C, resumen y detalle plegado                                                      | 3            |

### 21.2 Las demás (DD-09 a DD-17)

| DD    | Qué                          | Respuesta                                                                                                                         | Lo que queda decidido                                                                                                                                               | Si cambiara                                                           | Antes del PR      |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------- |
| DD-09 | Qué se guarda de la fecha    | por defecto (l. 385)                                                                                                              | **A**: la fecha entera (§4.3)                                                                                                                                       | B, el año: otra columna y volver a preguntar si la edad mínima cambia | 9                 |
| DD-10 | Plan de Resend               | «de momento nos quedamos en el gratis y abrimos registro por tandas pequeñas» (l. 378)                                            | **B**: plan gratuito, `MAIL_DAILY_BUDGET` 90, tandas (§9.4, 9-b)                                                                                                    | A (Pro, 20 USD al mes): `MAIL_DAILY_BUDGET` sube y las tandas sobran  | abrir el registro |
| DD-11 | Contraseñas filtradas        | «no entraría ahí... Si alguien quiere usar una pass comprometida aqui pues allá el» (l. 383 a 384)                                | **C**: sin comprobación; el PR 10 no existe (§7.7)                                                                                                                  | A volvería a ser `hashPasswordWithHibp` y un PR de unas 2 horas       | ninguno           |
| DD-12 | Ausencia máxima              | «ok 28 días reales» (l. 377)                                                                                                      | **28 días** (`AWAY_MAX_DAYS`)                                                                                                                                       | otra cifra es una constante; más de 30 pisa la regla del mes de E7    | 13                |
| DD-13 | Condiciones de uso           | por defecto (l. 385)                                                                                                              | **A**: línea bajo el botón y versión guardada (§4.6); a confirmar con un abogado                                                                                    | B, casilla obligatoria                                                | 9                 |
| DD-14 | Equipo de quien se borra     | «dejamos el que puso, pero un admin o moderador podria modificarlo siempre (especialmente si es algo inapropiado)» (l. 379 a 382) | **B y el panel**: el equipo conserva su nombre y un administrador lo cambia siempre con `PATCH /api/admin/teams/:id` (§8.5, §10.4); el moderador, cuando E7 lo cree | A, nombre generado al borrar                                          | 5, 12             |
| DD-15 | Destino de DMARC             | «No sabia que se podia hacer eso... pero ok, de momento lo dejamos» (l. 407 a 408)                                                | **C**: sin informes; DMARC se queda en `p=none` (§9.1, 9-a)                                                                                                         | A o B: un `rua` y, con informes limpios, `quarantine`                 | 17                |
| DD-16 | Aviso de entrada nueva       | «Sin correo, solo notificación push» (l. 385 a 388)                                                                               | **A por push**: `new_sign_in` siempre, uno por hora, sin interruptor (§7.5, §13.1)                                                                                  | B, con interruptor (una línea de `NOTICE_CATALOG`); C, sin aviso      | 14                |
| DD-17 | Purgar cuentas sin confirmar | por defecto (l. 385)                                                                                                              | **A**: a los 7 días, sin corredor ni equipo (§15.4)                                                                                                                 | B: sin purga; los registros inventados se quedan                      | 12                |

Y dos que no eran `DD` y el dueño cerró el mismo día (§9.3, l. 398 a 406): **solo dos correos**, «Solo correo para forgot password y para acabar el registro (igual que en el de Twilight Stuggle)», y **sin cambio de correo de autoservicio**: lo hace un administrador desde el panel, «si, esta bien asi». Con ellas desaparecen ocho correos, el deshacer de 72 horas y `change-email` de la lista blanca (§5, §8.1).

### 21.3 La lista para el abogado (H-17)

Nada de esto se dictamina aquí. Va entera a un abogado antes de abrir el registro (D-00a; `agenda.md` §3.7):

1. La edad mínima de 16 años, declarada con la fecha de nacimiento y sin comprobarla (§4).
2. La línea bajo el botón frente a una casilla (DD-13), y el texto de `/terms`, que está en borrador (§4.6).
3. El menor que ya está registrado y el que se descubre después: qué hacer con sus datos, y que sin canal de contacto nadie puede avisar de uno (§4.5; §11.1; H-11).
4. Que el equipo de quien borra su cuenta conserve el nombre que puso, que puede ser un dato personal (DD-14 B).
5. Un aviso de privacidad sin responsable ni contacto: «We don't offer a contact channel yet.» (§10.1, 11-c).
6. Los plazos: logs de Railway con la IP entera `<N>` días, copias de 14 días si el cron corre (§10.1), `email_log` 90 días.
7. La exportación en JSON como respuesta al derecho de acceso, y el borrado de autoservicio como respuesta al de supresión (§10.4 y §10.5).
8. Que un administrador cambie el correo de una cuenta sin avisar a ninguna de las dos direcciones (§8.5), y que eso quede escrito en `admin_audit` con el correo viejo y el nuevo hasta que la cuenta se borra.
9. La dirección del servicio de push y la zona horaria como datos personales (§10.1).
10. La base legal de todo lo anterior, que Privacy no nombra.

### 21.4 Lo que sigue abierto

Lo decidió la síntesis, no el dueño. Si no dice nada, se queda así.

1. **El manifiesto para iOS 16.4 a 18** (13-g). Sin manifiesto, la explicación del iPhone vale para iOS 26 o más (mapa 02 §6); con uno mínimo (`name`, `display: standalone`, sin iconos), también para 16.4 a 18, como en `twilightstruggle`. Pero el manifiesto es lo primero que quitó D-00p (`docs/visual.md` l. 2736) y sin iconos Chrome no ofrece instalar, aunque eso no lo he comprobado. **Recomendación: sin manifiesto**; no sé qué parte de los jugadores tiene iOS anterior al 26. Antes del PR 14.
2. **Los avisos de seguridad fuera del tope, del silencio y de la ausencia** (13-a). Un cambio de contraseña a las 3 de la madrugada suena a las 3. Alternativa: que esperen al silencio como los demás. **Recomendación: que suenen**, porque solo suenan si alguien entró o cambió la contraseña. Antes del PR 14.
3. **El silencio de 22 a 8** y **el resumen a las 19** (D-43; O-06), en la hora del navegador. Cambiar las cifras es cambiar dos constantes.
4. **La sesión de 30 días renovables y su techo de 90** (D-17), frente a los 7 de hoy: más días, menos veces la contraseña en un sitio raro, y más vida para una cookie robada, que `Devices` deja cerrar.
5. **Los enlaces**: 24 horas el de confirmar y una hora el de recuperar (D-11).
6. **Las tandas de registro**: 25, 40 y como mucho 50 invitaciones al día (9-b), estimadas con uno o dos correos por registro.
7. **La consecuencia para E7 de no mandar correo de juego** (H-14): quien no aceptó los avisos o tiene un iPhone en una pestaña, y no vuelve, no recibe nada antes de que actúe la regla del mes (§14.6). El dueño lo decidió («No, como mucho notificadores de browser y app», l. 313 a 315); lo que queda es que E7 lo pese al fijar el plazo y lo que pasa al que vuelve el día 31.

Y lo que el dueño mira en sus paneles, sin decidir nada: el resultado de la consulta de la precondición del PR 3, las réplicas de `web` (PR 6), cuánto guarda Railway los logs (PR 4), si corre el cron de copias (PR 12) y si Resend deja un DKIM de 2.048 (PR 17).

---

**Injertos aplicados.** I-21 (§21.1, DD-04: la explicación la pidió el dueño; lo que I-21 dejaba, nada fuera de `Notifications`, se queda).

**Objeciones resueltas.** O-06 (§21.4, puntos 3 y 4).

**Huecos rellenados.** H-11 (§21.3, punto 3), H-14 (§21.4, punto 7), H-17 (§21.3).

**Decisiones de esta sección.**

- **21-a**, las diecisiete `DD` se escriben como contestadas; DD-05 a DD-09, DD-13 y DD-17 por el «ok» al resto del punto 9 de §9.2, y DD-16 por push.
- **21-b**, la lista del abogado gana el cambio de correo por un administrador (punto 8) y pierde las contraseñas filtradas.

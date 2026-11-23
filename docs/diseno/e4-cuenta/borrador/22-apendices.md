## 22. Apéndices

### 22.1 Los injertos y dónde cayeron

Los veintinueve de `juicios/veredicto.json`. Tres no se aplicaron porque el dueño decidió lo contrario después del veredicto (`00-encargo.md` §9.2 y §9.3, 23 de noviembre de 2026); uno se aplicó al revés. El ensamblador completa la tabla con lo que diga cada bloque de cierre.

| Id   | Qué                                                                   | Dónde                                                                            |
| ---- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| I-01 | la SSRF de los avisos: `isAllowedPushEndpoint` al guardar y al enviar | §13.6 (con la lista de `twilightstruggle`, 13-j)                                 |
| I-02 | `notificationclick` solo al propio origen                             | §13.5                                                                            |
| I-03 | un tercero nunca bloquea al dueño; recuperar da `cs_device`           | §5.4, §7.5                                                                       |
| I-04 | la página de botón y el token en el fragmento                         | §5.2                                                                             |
| I-05 | el panel raíz con correo fijo y `admin_audit`                         | §8.5, sin TOTP                                                                   |
| I-06 | la lista blanca con su test                                           | §8.1                                                                             |
| I-07 | las opciones medidas de `better-auth`                                 | §5.1, §5.4, §6.2, §7.2, §8.1                                                     |
| I-08 | `trustProxy` por función                                              | §7.1                                                                             |
| I-09 | la fecha validada antes de buscar el correo                           | §4.2                                                                             |
| I-10 | el borrado atómico                                                    | §10.4                                                                            |
| I-11 | el techo de 90 días y sin `cookieCache`                               | §6.1                                                                             |
| I-12 | la reserva antes de comprobar                                         | §7.3                                                                             |
| I-13 | topes por destinatario y presupuesto                                  | §7.4, §7.6, §9.4 (sin el corte al 70 %)                                          |
| I-14 | los correos nuevos de cuenta con sus topes                            | **no aplicado** (§9.3 del encargo); queda `new_sign_in` como aviso, §13.1        |
| I-15 | el cambio de correo con contraseña                                    | **no aplicado**: sin cambio de correo de autoservicio                            |
| I-16 | `manual` como `mixto` durante la ausencia                             | §14.2                                                                            |
| I-17 | el PR de documentos con su texto                                      | §18.3 (PR 16), §20.2                                                             |
| I-18 | «ninguno de seguridad va por aviso»                                   | **al revés**: §3 (principio 2) y §13.1, la seguridad va por push                 |
| I-19 | `inactiveSince` y la visita como «login»                              | §10.6, §14.4                                                                     |
| I-20 | retirar las promesas de contacto                                      | §11                                                                              |
| I-21 | el iPhone sin instrucción por defecto                                 | §13.4, sustituido por el dueño (DD-04); se queda «nada fuera de `Notifications`» |
| I-22 | la exportación                                                        | §10.5                                                                            |
| I-23 | contraseñas filtradas                                                 | **no aplicado** (DD-11 C)                                                        |
| I-24 | `get-session` sin token                                               | §6.3                                                                             |
| I-25 | `Sign out` y cerrar sesión borran la suscripción                      | §6.5, §13.4                                                                      |
| I-26 | DKIM, `CAA` y `docs/ops.md`                                           | §9.1, sin `rua` (DD-15 C)                                                        |
| I-27 | la purga y el calentamiento                                           | §9.5, §15.4                                                                      |
| I-28 | `name` y `image` en el registro                                       | §4.7                                                                             |
| I-29 | `offer_received`                                                      | §13.1                                                                            |

### 22.2 Las objeciones y lo desestimado

**Objeciones** (`O-nn` de `veredicto.json`), todas resueltas: O-01 §8.5 y §8.6 · O-02 §14.2 · O-03 §18.3 y §20.2 · O-04 §5.7, §7.4, §7.6 y §9.4 · O-05 §4.7, §10.1 y §13.2 · O-06 §6.1, §12.1, §13.2 y §21.4 · O-07 §14.6 y §20.1 · O-08 §13.4 · O-09 §5.1 · O-10 §6.1 · O-11 §13.7 · O-12 §13.6 · O-13 §7.1 · O-14 §7.3 · O-15 §7.3 y §7.5 · O-16 §5.4 y §7.5 · O-17 §5.5 (sin autoservicio no hay aprobación que pulsar) · O-18 §5.6 · O-19 §13.4 y §13.5 · O-20 §6.2 · O-21 §8.1 · O-22 §12.1 y §18.2 · O-23 §14.1 · O-24 §10.5 · O-25 §10.4.

**Lo desestimado por la síntesis**, con su razón:

| Propuesta                                               | Por qué no                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Un tope diario de registros                             | sería un apagado del registro a disposición de cualquiera (seguridad; §9.5)                                 |
| El limitador de `better-auth` con `storage: 'database'` | sigue viendo solo `<ip>\|<ruta>` y tiene la carrera de `GHSA-44jh-23m7-hpcf` (mapa 01 §8; §7.2)             |
| `cookieCache`                                           | una sesión cerrada seguiría valiendo hasta un minuto, también la que recuperar acaba de cerrar (X-13; §6.1) |
| Anular el enlace anterior al pedir otro                 | un tercero mataría el enlace del dueño pidiendo otro; los enlaces mueren cuando otro se usa (X-03; D-11)    |
| Guardar solo el año de nacimiento                       | DD-09 A: la fecha entera                                                                                    |
| 45 días de ausencia                                     | pasaba del «un mes» de la regla de E7 (O-23); el dueño dijo 28                                              |
| La puerta del menor en `localStorage`                   | sobreviviría a cerrar la pestaña en un aparato compartido; va en `sessionStorage` (seguridad O-12; D-04)    |
| `cs_viewer` como aparato conocido                       | es de E2, solo restringe y no está firmada por cuenta (X-07); el aparato es `cs_device` (D-23)              |
| Alargar la sesión durante la ausencia                   | 30 días renovables bastan para 28 de ausencia (O-06; D-17)                                                  |
| El aviso de prueba de `twilightstruggle`                | un envío a voluntad del cliente contra los servicios de push (I-01; §13.6)                                  |

**Lo que retiró el dueño el 23 de noviembre** (`00-encargo.md` §9.2 y §9.3): el TOTP del panel, la 0059 y el PR 18; la comprobación de contraseñas filtradas y el PR 10; el cambio de correo de autoservicio con su aprobación, su deshacer y sus dos páginas; ocho de los diez correos; Pro antes de abrir; los informes DMARC; el nombre generado para el equipo de quien se borra.

### 22.3 La cobertura del encargo

| Punto (`00-encargo.md` §1, §2, §3 y §9)                                                              | Secciones                                      |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1. El ciclo de la identidad (fecha, verificación, recuperación, cambios, borrado, sesiones, límites) | §4, §5, §6, §7, §10; el cambio de correo, §8.5 |
| 2. La seguridad (secuestro, enumeración, límites, tokens, correo como vía, dependencias, menores)    | §2, §5, §7, §8                                 |
| 3. Las notificaciones                                                                                | §13                                            |
| 4. El modo ausencia                                                                                  | §14                                            |
| 5. Subdominios y calentamiento                                                                       | §9.4 y §9.6                                    |
| 6. El contacto, aparcado                                                                             | §11                                            |
| 7. Lo legal (acceso, exportación, borrado, privacidad, menores)                                      | §10, §21.3                                     |
| §2 del encargo, el inventario                                                                        | §1                                             |
| §3, las dependencias con avisos                                                                      | §8.3; PR 2                                     |
| §9.1.1 a §9.1.6                                                                                      | §4; §11; §9, §13 y §14; §13.9; §14; §8.6       |
| §9.2 y §9.3 (23 de noviembre)                                                                        | §21.1 y §21.2; §5, §8.5, §9, §13.1, §13.4      |
| Lo que E2 y E3 dejaron (mapa 04 §7)                                                                  | §6.1, §13, §20                                 |
| Los documentos que hay que corregir (mapa 04 §6)                                                     | §20.2 y §20.3                                  |
| El plan por PR, tests primero; riesgos; lo que se mide                                               | §18; §19.1 y §19.2; §19.4                      |

### 22.4 Los alias

Los de las propuestas (§G.15) y los que añadió la redacción. Solo aquí; el resto del documento usa el nombre canónico.

| Alias                                                          | De dónde              | Nombre canónico                                                         |
| -------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `cs_known`                                                     | jugador               | `cs_device`                                                             |
| `auth_throttle`                                                | atacante              | `auth_limits`                                                           |
| `delivery_log`                                                 | atacante              | `email_log`                                                             |
| `push_subscriptions`                                           | atacante, incremental | `push_targets`                                                          |
| `notify_prefs`                                                 | incremental           | `notice_prefs`                                                          |
| `month_rule_warning`, `month_rule`                             | atacante, incremental | `away_warning`                                                          |
| `absence_ending`                                               | incremental           | `away_over`                                                             |
| `stage_ready_own`, `stage_ready_followed`                      | incremental           | `stage_digest`, `stage_ready`                                           |
| `Sessions` (panel)                                             | incremental           | `AccountDevices`                                                        |
| `DELETE /api/me`, `POST /api/me/delete`                        | atacante, incremental | `POST /api/auth/delete-user` con `beforeDelete`                         |
| `/confirm-age`                                                 | atacante              | `/account/birth-date`                                                   |
| `/confirm-email-change#t=`                                     | incremental           | ninguno: el cambio de correo es del panel                               |
| `E1` a `E7`                                                    | atacante              | `verify_signup` y `reset_password`; el resto, fuera                     |
| `stageReadyPush`                                               | incremental           | `noticePayload`                                                         |
| `ACCOUNT.*`, `PUSH.*`                                          | incremental           | las constantes de §16                                                   |
| `PUSH_HOSTS`, `MAX_DEVICES`, `later`                           | `twilightstruggle`    | `PUSH_ALLOWED_HOSTS`, `PUSH_TARGETS_PER_USER`, `mailQueue.track`        |
| `SESSION_DAYS`, `KNOWN_DEVICE_DAYS`, `AWAY_SESSION_GRACE_DAYS` | jugador §14           | `SESSION_EXPIRES_S`, `DEVICE_COOKIE_DAYS`; el tercero desaparece (D-17) |

---

**Injertos aplicados.** Ninguno asignado (22.1 los recoge todos).

**Objeciones resueltas.** Ninguna asignada (22.2 las recoge todas).

**Huecos rellenados.** Ninguno asignado.

**Decisiones de esta sección.**

- **22-a**, la tabla de lo desestimado gana dos filas: alargar la sesión en ausencia y el aviso de prueba.
- **22-b**, los alias de `twilightstruggle` entran en 22.4.

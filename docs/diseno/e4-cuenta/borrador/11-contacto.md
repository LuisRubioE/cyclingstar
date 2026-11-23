## 11. El contacto aparcado

El encargo pedía un canal de contacto y el dueño lo aparcó: «? De momento no lo pongas» (`00-encargo.md` l. 312, 19 de noviembre de 2026; D-00b). Esta sección no lo diseña como pieza: escribe el riesgo, lo que se quita de la web y lo que costaría el día que se quiera. Desde el 23 de noviembre el riesgo es mayor, porque el correo de una cuenta solo lo cambia un administrador (§5.5) y no hay por dónde pedírselo.

### 11.1 El riesgo

| Quién                                   | Qué le pasa sin contacto                                                                                                                                                                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quien pierde su buzón                   | pierde la cuenta: no puede recuperar la contraseña y no tiene a quién pedirla. `Account › Email` se lo dice antes de que pase (pantalla): `If you lose access to this email, you won't be able to recover your account.`                                       |
| Quien quiere cambiar de correo          | solo un administrador puede hacerlo (§5.5), y la web no dice dónde pedirlo, porque no hay dónde                                                                                                                                                                |
| Quien tecleó mal su fecha de nacimiento | no puede corregirla él: `PUT /api/me/birth-date` escribe una vez (409 `already_set`, §4.5). Puede corregirla un administrador desde el panel (§8.5), pero la web no dice dónde pedirlo, porque no hay dónde (I-20)                                             |
| Quien ve la cuenta de un menor          | no puede avisar (`agenda.md` l. 254 y 259); qué se hace con sus datos, a confirmar con un abogado (H-11, §21.3)                                                                                                                                                |
| Quien recibe un correo que no pidió     | no puede preguntar; `verify_signup` le dice que lo ignore, y la purga borra la cuenta a los 7 días de aprobada (§9.5)                                                                                                                                          |
| Quien encuentra un fallo de seguridad   | no tiene a quién decírselo: no hay `security.txt`                                                                                                                                                                                                              |
| Quien espera la aprobación              | no puede preguntar cuánto le queda; `CheckInbox` le dice que un administrador revisa las cuentas a mano (§4.9, §5.3)                                                                                                                                           |
| Quien está en la beta                   | tiene el grupo de WhatsApp «con el dueño dentro», el único canal de hecho ([DUEÑO 12]: `docs/agenda.md` l. 448 a 450, 14 de septiembre de 2026; `docs/encargos.md` l. 779 a 781). Quien se quede fuera de su cuenta y no esté en el grupo no tiene nada (H-13) |

### 11.2 Lo que se quita de la web

- `Ask and your account and rider data will be removed.` (`Privacy.tsx` l. 38): promete un canal que no existe, el borrado ya es de autoservicio y el corredor no se borra (mapa 03 §5). Lo quita el PR 3 con el texto de §10.1, que dice `We don't offer a contact channel yet.`: una frase verdadera no es una promesa.
- El mismo PR busca en `apps/web/src` otras promesas de contacto (`contact`, `support`, `email us`, `get in touch`, `ask`, `write to`, sin distinguir mayúsculas) y retira las que prometan una respuesta (I-20). El resultado de la búsqueda va en la descripción del PR.
- Ningún texto nuevo de E4 promete respuesta. Por eso `Account › Email` dice `Your email can only be changed by an administrator.` y no «ask an administrator», que es la frase de `twilightstruggle` (`ai/ui/src/online/profile.ts` l. 55) y allí tiene un canal detrás.

### 11.3 Lo que costaría el día que se quiera

Estimado, sin medir:

1. Un buzón: hoy el MX de `cyclingstar.app` apunta al Apache del alojamiento (`0 cyclingstar.app.`, mapa 02 §2) y no sé si hay buzón detrás. Un reenvío de `support@cyclingstar.app` al correo del dueño en ese alojamiento, o un MX nuevo: media hora de DNS.
2. Un enlace en el pie (`App.tsx` l. 393 a 418), en `Login`, en `Privacy` y en `Account › Email` (que pasaría a decir `Write to support@cyclingstar.app to change it.`), y `/.well-known/security.txt` con `Contact:` y `Expires:`: un PR de una hora.
3. El coste real es contestar: el tiempo del dueño, sin plazo prometido hasta que lo decida. Y el procedimiento para cambiar un correo sin entregar cuentas a quien se haga pasar por otro (el administrador engañado, §2.3): por ejemplo, contestar solo desde la dirección vieja.

---

**Injertos aplicados.** I-20 (§11.1 y §11.2).

**Objeciones resueltas.** Ninguna asignada.

**Huecos rellenados.** H-11 (§11.1, con su destino en §21.3), H-13 (§11.1).

**Decisiones de esta sección.**

- **11-a**, el riesgo gana una fila, la del cambio de correo, que nace con `00-encargo.md` §9.3.
- **11-b**, `Account › Email` no dice «ask an administrator»; dice `Your email can only be changed by an administrator.`, que no promete un canal.
- **11-c**, Privacy dice `We don't offer a contact channel yet.`; se considera una frase verdadera y no una promesa (D-00b).
- **11-d**, la búsqueda de promesas añade `get in touch` y `write to` a la lista de I-20.

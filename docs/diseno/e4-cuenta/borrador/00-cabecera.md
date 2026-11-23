# La cuenta y el contacto: cerrar la identidad por los bordes, avisar sin correo e irse sin perder (diseño final)

Estado: **diseño escrito, sin implementar**, del 19 al 23 de noviembre de 2026. El dueño contestó todas
sus decisiones (§21) y el código no se abre hasta que él lo diga.

## 0. Cabecera y resumen

> **Procedencia, en una línea.** Cinco mapas del código, de los documentos y de las pantallas, con 61
> capturas a 360 px · tres propuestas independientes (`atacante`, `jugador` e `incremental`) · tres
> jueces (el código y el coste; la cobertura y la fidelidad al dueño; la seguridad y el teléfono), sin
> mayoría · base `jugador` por suma, por un punto · un esqueleto con glosario y decisiones, y dos
> redactores · dos refutadores (código y seguridad; cobertura y dueño), 31 hallazgos · un corrector ·
> un auditor, 46 veredictos. El material, en `docs/diseno/e4-cuenta/`.

### 0.1 El encargo, el estado y el árbol

**El encargo.** Es E4 de `docs/encargos.md` (l. 308 a 337), fichero `docs/cuenta.md`, tamaño mediano y
la mitad ejecución: el ciclo entero de la identidad (registro con fecha de nacimiento, verificación,
recuperación, cambio de correo, sesiones, límites de intento), las notificaciones, el modo ausencia,
el correo y el contacto. **El encargo se escribió antes de que hubiera correo y hoy no es verdad buena
parte de lo que dice**: §1 hace el inventario honesto.

**Lo que el dueño cambió mientras se diseñaba** (`docs/diseno/e4-cuenta/00-encargo.md` §9; D-00a a
D-00f y §21): edad mínima de 16 con fecha de nacimiento; **sin canal de contacto** por ahora; **solo dos
correos**, confirmar el registro y recuperar la contraseña, y ningún correo de juego ni de seguridad;
los avisos, **solo por el navegador y la app**; la app sin tecnología ni fecha; solo correo y
contraseña, **sin TOTP**; el panel y el registro **como en twilightstruggle**: el jugador no cambia su
correo (lo cambia un administrador), y quien se registra espera a que un administrador lo apruebe;
sin comprobar contraseñas filtradas; sin informes DMARC; el plan gratuito de Resend; la ausencia de 28
días reales como mucho; un manifiesto mínimo solo para que el iPhone reciba avisos; y los dos fallos
que ya están en producción, dentro del plan y no en un arreglo aparte.

**El árbol.** Todo lo citado está leído contra `2a29e6d` (19 de noviembre de 2026). Antes de cerrar,
`main` avanzó a `67a51ae`: fuera de W5, solo #347 (la subida de `better-auth` a 1.7.27, `fastify`
5.12.8 y `zod` 4.6.7, que era el PR 2 de este plan y queda hecho, §18) y #348 (que el borde de Railway
reescribe `X-Forwarded-For`, lo mismo que comprobó este diseño). Las líneas de `apps/api/src` y de las
páginas de la cuenta no cambiaron. `ENGINE_VERSION` sigue en 91: E4 no toca el motor.

### 0.2 Método y base

Cada juez eligió una base distinta (`codigo`, `incremental`; `seguridad`, `atacante`; `cobertura`,
`jugador`). Por suma de los cuatro ejes de los tres jueces: `jugador` 86, `atacante` 85, `incremental`
81 (`juicios/veredicto.json`, `ganadora`). **El margen es de un punto**: `jugador` da la estructura y la
voz (cada acto acaba en una frase verdadera; la web dice todo y el aviso solo adelanta), y los injertos
de seguridad de `atacante` (I-01 a I-06: la SSRF de los avisos, la cookie de aparato, el token en el
fragmento, el panel) y las opciones medidas de `incremental` (I-07 a I-10) son obligatorios.

**La refutación.** 31 hallazgos: 5 altos, 9 medios y 17 bajos (`refutaciones/resultado-final.json`).
Los 31 están aplicados; el auditor dio 41 de las 46 entradas de corrección por buenas y 5 en parte, y
las 5 se cerraron con sus arreglos antes de ensamblar. Dos de los altos ya están en producción hoy (el
cuerpo del 200 del registro delata si el correo tiene cuenta, y una ruta con `..` salta el límite
estricto de las credenciales, comprobado en producción solo con GET): los cierra el PR 3.

### 0.3 Cómo leer

Toda cifra dice si es medida (y cómo) o estimada. Los textos que ve el jugador van en inglés y
marcados «(pantalla)» o «(aviso)». `D-nn` es una decisión cerrada de la síntesis (su lista, en §22.5);
`DD-nn`, una del dueño (§21); `I-nn`, `O-nn`, `H-nn` y `X-nn`, un injerto, una objeción, un hueco y una
contradicción de hecho de `juicios/veredicto.json`; `R<foco>-nnn`, un hallazgo de la refutación.

### 0.4 Las diez ideas

1. **El ciclo de la identidad ya existe; E4 lo cierra por los bordes.** Recuperar cierra todas las
   sesiones, los enlaces se guardan con hash y mueren cuando otro se usa, ninguna respuesta espera al
   correo y ninguna ruta abierta queda sin decidir: casi todo son opciones de `better-auth` medidas.
2. **Cada acto termina con una frase verdadera, y el correo lleva dos enlaces y nada más.**
3. **Un tercero nunca bloquea al dueño**: límite por cuenta en Postgres con reserva previa, que solo
   cierra a los navegadores sin `cs_device`; recuperar siempre da esa cookie.
4. **Un enlace de correo nunca cambia nada por sí solo**: página de botón y token en el fragmento. El
   jugador no cambia su correo: lo cambia un administrador, con aviso por push y escrito en
   `admin_audit`.
5. **El correo es escaso y es un blanco**: plan gratuito, registro por aprobación por tandas, topes por
   IP y por destinatario, y un presupuesto diario con reserva para recuperar.
6. **16 años con fecha de nacimiento**, validada antes de mirar el correo; las cuentas de hoy la dan al
   entrar.
7. **La web dice todo; el aviso solo adelanta**: avisos por el navegador con un service worker sin
   caché y la SSRF cerrada, tope de 3 al día y silencio de noche; en iPhone, la explicación de la
   pantalla de inicio con un manifiesto mínimo; la app, un canal más.
8. **Irse de vacaciones no castiga**: el modo ausencia dice qué se para, en `manual` decide el
   entrenador, calla los avisos y congela la inactividad para E7.
9. **Lo que la web dice de los datos es verdad**: `Privacy.tsx` nueva, la IP fuera de la base, logs sin
   tokens, borrado atómico y exportación con contraseña.
10. **Diecisiete PR, tests primero, unas 134 horas (estimado)**, uno ya hecho en `main` (el 2). Sin abogado
    (decisión del dueño): 16 años, y la lista de §21.3 queda escrita por si un día lo hay.

### 0.5 Mapa del documento

§1 lo que ya existe · §2 las amenazas · §3 los principios · §4 el registro y la edad · §5 los enlaces y
los dos correos · §6 las sesiones · §7 los límites · §8 las rutas y el administrador · §9 el correo ·
§10 la privacidad · §11 el contacto aparcado · §12 las pantallas · §13 los avisos · §14 la ausencia ·
§15 los datos · §16 las constantes · §17 los tests · §18 el plan · §19 los riesgos y lo que se mide ·
§20 las fronteras y los documentos que se corrigen · §21 las decisiones del dueño · §22 los apéndices.

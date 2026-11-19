# E4 · Fase 1: instrucciones comunes a las tres propuestas

Lee antes `00-encargo.md` entero (con su §9.1, lo que el dueño ya decidió y que manda sobre todo lo
demás), los **cinco mapas** de `mapas/` enteros (01 la cuenta y la seguridad, 02 el correo y los
avisos, 03 los datos y la ausencia, 04 el corpus, 05 las pantallas) y **mira las capturas** de
`capturas/` con tu herramienta de lectura de imágenes (al menos `Register`, `Login`, `Account` y
`Privacy` a 360 px). Los mapas son la base de hechos: **no repitas su lectura del código salvo para
comprobar algo que te parezca dudoso**, y si compruebas y el mapa se equivoca, dilo con la línea.
Después lee el código que tu lente necesite de verdad.

Cada propuesta es un **diseño completo** de E4 (cubre TODO el encargo), organizado desde una lente
distinta. No es un ensayo: es lo que tres jueces van a comparar con las otras dos y lo que, si gana,
se convierte en `docs/cuenta.md`. Tamaño: **400 a 600 líneas**. Modelo de densidad:
`docs/diseno/e3-visual/propuestas/telefono.md`.

## Las tres lentes

- **`atacante`**: la cuenta vista por quien quiere quitársela a otro. Diseña desde un modelo de
  amenazas escrito (quién ataca, con qué, qué gana: la cuenta de un jugador, el panel del dueño, la
  reputación del dominio, los datos de un menor) y da a cada flujo su ataque y su freno, con cifras.
  Lo que no defiende, lo dice y dice por qué.
- **`jugador`**: la cuenta vista por una persona con un teléfono, que se registra, olvida la
  contraseña, se va de vacaciones, cambia de correo y vuelve. Diseña desde los recorridos completos,
  pantalla a pantalla y texto a texto, con la fricción contada (toques, campos, esperas, correos) y
  con el iPhone que no recibe avisos como caso de primera clase.
- **`incremental`**: la cuenta vista desde el código que ya existe y lo que cuesta cambiarlo. Diseña
  desde lo que `better-auth` 1.7 ya trae (opciones, ganchos, plugins) antes que código propio, con el
  menor número de migraciones, PR pequeños que dejan producción mejor cada uno, y los usuarios que ya
  existen como restricción del despliegue.

Una lente decide qué se mira primero y qué pesa más, no qué se deja fuera: las tres cubren las
secciones de abajo.

## Lo que los mapas han cambiado del encargo, y que ninguna propuesta puede pasar por alto

1. **El ciclo de la identidad ya existe**, y lo que falla son sus bordes (mapa 01): recuperar la
   contraseña no cierra las sesiones abiertas; dos enlaces de recuperación valen a la vez y se guardan
   en claro; el tiempo de respuesta delata qué correos existen en el registro, la recuperación y el
   cambio de correo; ningún límite mira la cuenta; el limitador de `better-auth` mete a todos en un
   cubo si la cabecera de IP falta o trae dos; `verify-password` responde por HTTP con el límite flojo;
   `update-user` acepta `name` e `image` sin tope.
2. **La subida de dependencias está medida y es barata** (mapa 01 §8): `better-auth` 1.7.26 y
   `fastify` 5.12.8 compilan y pasan 1.126 tests sin migración. Ningún aviso nos alcanza hoy, y la
   subida no arregla nada de lo del punto 1.
3. **Los datos personales no son los que dice la web** (mapa 03 §4 y §5): la IP se guarda en
   `sessions` y en los logs; los logs registran la URL entera con los tokens de verificación y de
   recuperación; `Privacy.tsx` tiene cuatro frases falsas; el borrado no es atómico y deja el corredor,
   el nombre del equipo, su maillot, el plan y el contrato.
4. **`last_seen_at` existe pero no sirve aún a la regla del mes** (mapa 03 §6; mapa 04 §6.2): solo la
   escriben las rutas del espectador y nadie la lee; la regla habla de «login», que no se registra.
5. **El suelo del modo ausencia ya está medido** (mapa 03 §7): un ausente con contrato entrena y corre
   solo; un agente libre ausente se queda parado para siempre. El tick no lee `last_seen_at` ni
   `premium`.
6. **Los avisos solo por el navegador y la app** (`00-encargo.md` §9.1; mapa 02 §5 a §8): ningún
   iPhone recibe avisos en una pestaña; desde iOS 26 cualquier web añadida a la pantalla de inicio se
   abre como app sin manifiesto; un `sw.js` solo de avisos cabe en la CSP de hoy y no hace la web
   instalable (medido en Chromium); enviar no cuesta dinero. La propuesta escribe la frontera con D-00p
   de `docs/visual.md` y decide qué se le ofrece al jugador de iPhone.
7. **El correo transaccional tiene huecos y uno es grave** (mapa 02 §2 a §4): sin informes DMARC, sin
   webhooks de rebote ni de queja, DKIM de 1.024 bits, y el plan gratuito de Resend corta el correo 101
   del día, que con la verificación obligatoria es un registro que no entra. La supresión de Resend es
   de todo el equipo.
8. **El correo de juego está escrito en seis documentos y el dueño lo descartó** (mapa 04 §6.3): la
   propuesta no lo resucita y dice qué texto de esos documentos hay que corregir.
9. **Quien se quede con el correo de `ADMIN_EMAIL` se queda con el panel** (mapa 04, [DOC 22]): la
   recuperación y el cambio de correo de esa cuenta son la puerta del juego entero.
10. **Sin contacto por ahora** (`00-encargo.md` §9.1): se escribe como riesgo y como coste.

## Estructura obligatoria (misma numeración en las tres, para que los jueces crucen)

0. **Resumen** (20 a 30 l.): la idea central, en qué se distingue de lo obvio, qué resuelve y qué
   deja.
1. **Diagnóstico**: qué falla hoy, con cita a los mapas (no los repitas: apunta a ellos), ordenado por
   gravedad.
2. **Principios** (5 a 8, cada uno con su consecuencia en el diseño).
3. **El registro y la edad**: la fecha de nacimiento (campo, validación en el servidor, qué se guarda
   exactamente y por qué), la edad mínima de 16, qué ve quien no la cumple, las cuentas que ya
   existen, las condiciones de uso (qué hace falta y qué no se dictamina sin abogado), y los textos de
   pantalla en inglés.
4. **Verificación, recuperación y cambio de correo**: cada token con su longitud, su caducidad, si es
   de un solo uso, si anula a los anteriores y cómo se guarda; qué pasa con las sesiones al recuperar
   y al cambiar el correo; la enumeración por el tiempo de respuesta y cómo se cierra; los textos de
   cada correo (asunto y cuerpo enteros, en inglés).
5. **Las sesiones**: duración, renovación, la caché de sesión, `cs_viewer`, la pantalla de sesiones
   (qué se enseña de cada una y qué no, cerrar una, cerrar las otras), qué se guarda de cada sesión y
   por qué.
6. **Los límites de intento**: por IP y **por cuenta**, por ruta, con cifras, ventanas, clave y
   almacén (memoria, Postgres u otro, y qué pasa al desplegar); qué IP vale y cómo se comprueba al
   arrancar o en un test; qué ve el jugador al chocar con un límite; cómo no convertir el límite por
   cuenta en una forma de bloquear la cuenta de otro.
7. **Las rutas abiertas y las dependencias**: qué se cierra (`verify-password`, `update-user` y las
   demás del mapa 01 §1), la subida de `better-auth` y `fastify` (y `zod`, `fast-uri`), y cómo se
   protege el panel del administrador raíz.
8. **Los avisos**: el catálogo de lo que se avisa (cada aviso con su disparador, su texto en inglés,
   su frecuencia máxima, si está encendido por defecto y por qué), el permiso del navegador (cuándo se
   pide y con qué texto), la baja de un toque, el service worker solo de avisos y su frontera con
   D-00p, el envío (librería, claves, tabla de suscripciones, lo que se hace con una suscripción
   muerta), ningún aviso destripa (`stageReadyNotice`, mapa 02 §10), el jugador de iPhone, y el
   contrato que deja enchufar la app el día que exista sin suponer su tecnología.
9. **El modo ausencia**: cómo se declara (pantalla, duración máxima, fecha de vuelta), qué cambia
   mientras dura y qué no (con el suelo del mapa 03 §7), cómo se vuelve (también antes de tiempo), su
   relación con la regla del mes, con `While you were away` de E2 y con los avisos, y la frontera con
   E7 escrita.
10. **El correo transaccional**: DKIM, DMARC con informes, webhooks de rebote y queja, la supresión, el
    plan de Resend y su tope, el calentamiento antes del lanzamiento, y la separación por subdominios
    para el día que haya otro flujo.
11. **Privacidad y datos**: el nuevo texto de `Privacy.tsx` entero en inglés, los logs sin tokens ni
    correos, la IP, el borrado atómico y qué queda del jugador tras borrar, la exportación de los
    datos propios, y `last_seen_at` escrita en toda visita con sesión.
12. **El contacto aparcado**: el riesgo, lo que costaría el día que se quiera y lo que se quita de la
    web porque promete un canal que no existe.
13. **Datos y migraciones**: cada tabla y columna nueva o cambiada, con su migración de drizzle-kit,
    su valor para las filas que ya existen y su índice.
14. **Constantes**, con valor e intención, y dónde vive cada una.
15. **Tests**: los nuevos (de seguridad incluidos: la enumeración por tiempo, el límite por cuenta,
    las sesiones al recuperar) y los de hoy que se re-sellan.
16. **Plan por PR, tests primero**, con orden, dependencias y coste estimado. Cada PR deja producción
    desplegable y mejor que antes.
17. **Riesgos del despliegue y lo que se mide**: con los usuarios que ya existen, con el tope de
    Resend, con un despliegue que vacía los límites en memoria; y qué se mide después, con qué y con
    qué umbral.
18. **Fronteras** con E2, E7, E8, E9, E10, W5 y la app.
19. **Decisiones que son del dueño**, cada una con valor por defecto, su porqué y su consecuencia. Las
    de gusto (qué avisos van encendidos de serie, cómo se ve el aviso y cuándo se pide el permiso, la
    pantalla del modo ausencia, la de sesiones, el texto de privacidad) llevan **dos o tres
    alternativas concretas**, descritas con sus textos y su disposición, para que una página de
    opciones pueda pintarlas lado a lado.

## Reglas

- Las de `00-encargo.md` §7 (castellano, citas de línea, medido frente a estimado, sin rayas ni
  guiones en medio de frase, valores concretos, textos de pantalla y de correo en inglés, informe
  final de 12 líneas).
- Lo legal que necesite un abogado se marca «a confirmar con un abogado».
- Escribe solo tu fichero `propuestas/<lente>.md`. No leas las propuestas de los demás.
- Puedes ejecutar código en el scratchpad para medir o probar una idea (con el clon de
  `<scratchpad>/repo` o uno tuyo en `<scratchpad>/propuesta-<lente>/`). No modifiques el repositorio.
  Producción, solo GET de lectura.

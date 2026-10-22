# Dudas tras la pasada de coherencia (fase 5), para los auditores

Lo que la pasada de coherencia (`04-fase-refutacion.md` §6) no ha podido cerrar, y lo que es del orquestador y no de esta pasada. Cada cruzada y cada arreglo de la pasada tiene su fila en `refutaciones/coherencia.json` (58 cruzadas y 12 arreglos propios, `K-001` a `K-012`). Por orden del dueño, la pasada no ha medido nada: lo que dice «sin medir» lo es.

## Lo que se cerró de la lista de la v0

- **Del redactor de L1**: el fondo de `CueCard` (14-a: `navy`); el `include` de vitest (`decide.test.ts` salió con D-00p y `peso.test.mjs` corre con `node --test`, 16-b); los cerillos de D-09 (ya en `SPEC.md` §6.6); la deuda de 2.740 (D-14 y 5-b; la cabecera, abajo); y el glosario, fundido entero.
- **Del redactor de L2**: `ChampionSash` es `ChampionJersey` en todas partes (9-g); `champion.test.ts` en `packages/db` (9-h); DD-07 frente a D-00e (§19.2, DD-07, con la excepción de lo grabado); las cifras de la reserva, las de D-00m (26 maillots frente a 16 nacionales, 491 permitidos y 458 distintos, 19 más por los líderes en grises) en §8, §9, §15, §16, §17, §18 y §19; el culote en `teams.bib` y la `0052` (17-g); el filo de la estrella, aceptado (D-00l).
- **Del redactor de L3**: lo que cerró él mismo, y lo que dejaba abierto: §8 y §9 traen ya D-00f a D-00h y D-00m, y el plan nombra sus piezas (16a, 17a y 17c); el orden de §9.8 (17-h); las migraciones `0050` a `0054` en el orden del plan (17-a).
- **Del orquestador, al ensamblar la v0**: las tres remisiones a otros documentos llevan ya su nombre (`docs/agenda.md` y `docs/retransmision.md`), y no queda ninguna remisión suelta a una sección de otro documento (buscado con `grep`).
- **De las secciones**: `tokens.json` tiene un solo sitio, `packages/shared/tokens.json` (§12.3; C-L3-12); `legacyJersey` y `LegacyJersey`, cada uno en su fichero (§8.6; C-L3-08); la palabra de carga y la de la tendencia, en §4.10 (K-004).

## Abiertas, para los auditores

1. **El maillot de 320 en la `Sheet` a 320 × 640** (§8.10; C-L1-07): la `Sheet` deja 296 px con sus márgenes, y la pasada decide que ahí el maillot vaya a todo lo ancho, sin margen lateral. Sin medir: ni el reflujo (la comprobación 1 lo verá en `/_ui`) ni los estilos que el navegador da por defecto a un `<dialog>` (su `max-width` y su relleno), que el PR 17c tiene que anular.
2. **La comprobación propia de la pantalla 09** (§7.3, §14.4; C-L3-01): da 0 o 1, pero el documento no dice en qué clave de `telefono-baseline.json` se guarda, que tiene diez cifras por ancho en el orden de §7.1. Lo decide el PR 17a, que la mide por primera vez.
3. **`championTitleSchema`** (§8.5; K-012) es un nombre nuevo: `ChampionTitle` (`packages/shared/src/jerseys.ts` l. 163) es una interfaz sin Zod. Sus campos son los de la interfaz; si la etapa que dio el título, que mira el velo, tiene que viajar o quedarse en el servidor lo decide el PR 17a con la frontera (§13).
4. **Los tokens `kit-edge` y `kit-edge-strong` en el modo claro** (§3.1): §5.5 pide que cada `--color-*` tenga su pareja en `tokens.test.ts`, y solo están medidos sus valores oscuros (6,35:1 sobre `navy-dark`, 5,29 sobre `navy` y 3,21 sobre `bad`, §9.10). El filete claro, `rgb(0 0 0 / 0.3)`, no se ha medido como pareja: es un filete y no un texto, y el PR 7 tiene que escribir contra qué fondo y con qué umbral lo comprueba.
5. **Las cifras de la palabra de `Scale5`** (§4.8 y §10.4; C-L1-04): las midieron los correctores de L1 y de L2 con pesos y letras distintos (700 con Inter y DejaVu Sans; 600 con Inter, DejaVu Sans y Liberation Sans). Coinciden en los máximos, que son los que deciden (90,1, 52,2 y 49,1 px con DejaVu Sans), y §10.4 remite a §4.8; la pasada no las ha vuelto a medir.
6. **La longitud** (del redactor de L3): §16 a §19 quedan entre un 22 y un 28 % por debajo del objetivo del esqueleto y §20, un 35 % por encima. No es un fallo de contenido; se anota por si los auditores lo miran.

## Para el orquestador, que mantiene `00-decisiones.md`, la cabecera y la página de opciones

- **La cabecera** (C-L1-16): el resumen y la cabecera tienen que dar la deuda de este documento, 2.740 de 6.322 apariciones en 183 clases, y no las 2.457 de `sistema`.
- **La página de opciones** (C-L2-17): la versión 4 pinta los nacionales y la hoja de los 133 con la estrella; con D-00m hay que pintarlos sin ella, con el orden de la hoja de §9.5 (primero las banderas con texto, luego las gemelas) y la reserva de 26 maillots; `opciones/medidas.py` necesita otra vez `xmlns:xlink` en `para_medir`, porque 65 banderas fallan al rasterizar.
- **D-50** llama `rendimiento.spec.ts` a la prueba de cada noche; las secciones dicen `nocturno.spec.ts` (16-d), y manda ese nombre (C-L1-18).
- **D-00f** pone de ejemplo a Ghana, Chad e Irak, que no están entre los 133 países de `COUNTRIES`, y da «Chad y Rumanía» como banderas gemelas que separan las letras.
- **D-34** dice `Racing now · stage 3 of 5`; las secciones, con su ruta (`Racing now · stage 3 of 5, Gandia → Alcoi`, [DUEÑO 7]; C-L1-04). **D-35** da `After your plan · Days 79 to 83 · Coach` y §10.6, `Days 74 to 78` con otro plan: los dos casos valen, y el glosario usa el de §10.6.
- **D-25** conserva `KIT_CHANGE_COOLDOWN_DAYS` y **D-20**, **D-21** y **D-26** sus doce colores, sus 13 px y su banda de honor, sustituidas por D-00b, D-00d, D-00e y D-00k sin una nota junto a ellas, como la que ya llevan D-32 y D-56. §0 manda sobre todo, así que no es un error; una nota evitaría que alguien las lea sueltas.
- **El esqueleto**: el título de su ficha de §12 (l. 439, «La web instalable») no es el de la tabla §B, que ya dice «Sin red, el peso y la primera pintura» y es la que usa el ensamblado.

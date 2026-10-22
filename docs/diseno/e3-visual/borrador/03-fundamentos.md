## 3. Los fundamentos: paleta, letra, espacio, densidad, radios, sombras e iconos

Los tokens de esta sección son los únicos valores de la interfaz (principio 2.8). Viven en el `@theme` de `apps/web/src/index.css`, que §3.9 escribe entero, y `tokens.test.ts` comprueba cada pareja de texto y fondo de las tablas de §3.1, §3.2 y §3.3 con la razón WCAG 2.x, mezclando en sRGB los colores con transparencia sobre su fondo, como el navegador. Los contrastes son los de telefono §3.1 (`paleta_final.py`), uso C5 (los tramos) y lectura §3.1 (`own`); los marcados con (\*) los ha medido el redactor de esta sección con `docs/diseno/e3-visual/medidas/fundamentos.py` (colour-science 0.4.7; el script reproduce, como control, los 3,66, 6,72, 10,57 y 9,0 de telefono y de uso), y los marcados con (†), el corrector de la sección con `docs/diseno/e3-visual/medidas/oscuro.py` (el mismo método; reproduce, como control, los 15,23, 9,10 y 6,85 del ámbito oscuro).

### 3.1 La paleta

La paleta es la A, «manager sobrio» (D-03), decidida por el dueño el 21 de octubre de 2026 mirando la página de opciones: «Paleta: telefono A» (D-00a; `00-encargo.md` §7.2, l. 263). Conserva la identidad que creó el PR #105 (`9361029`, 3-8-2026: «dark navy header», «cyan panel headers, gold section bars»), la que reconoce el público de Hattrick y PCM (mapa 04 §2), y cambia su ejecución: sin degradados (ninguno pasa, y axe no los mide), sin barras de color a todo lo ancho (devuelve 36 px por panel y 48 por página al teléfono) y todo texto a 4,5:1 o más. La variable de cada token es `--color-<token>`. Es el modo claro, el de siempre; el oscuro, que el jugador puede activar, redefine estos mismos tokens (§3.3, D-00i).

| Token                                                                                 | Utilidades                                  | Valor                                                 | Uso                                                                                                                                                                | Contraste medido (fondo: razón)                                                                                                                                                                              |
| ------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `canvas`                                                                              | `bg-canvas`                                 | `#eef2f6`                                             | fondo de página (`body`, hoy `#e8edf2` fuera del tema, `index.css` l. 15-17)                                                                                       | fondo                                                                                                                                                                                                        |
| `surface`                                                                             | `bg-surface`                                | `#ffffff`                                             | tarjetas, filas, campos                                                                                                                                            | fondo                                                                                                                                                                                                        |
| `surface-2`                                                                           | `bg-surface-2`                              | `#f5f7fa`                                             | tramos inactivos, esqueletos, cabecera de tabla, `Chip` `neutral`                                                                                                  | fondo; 1,07 contra `surface` (\*)                                                                                                                                                                            |
| `line`                                                                                | `border-line`, `divide-line`                | `#d8dee6`                                             | separador decorativo                                                                                                                                               | 1,35 `surface`, 1,20 `canvas` (\*): WCAG no lo pide                                                                                                                                                          |
| `line-strong`                                                                         | `border-line-strong`                        | `#7b8794`                                             | borde de campo, de control y de tramo                                                                                                                              | 3,66 `surface`; 3,25 `canvas`; 3,41 `surface-2` (\*)                                                                                                                                                         |
| `ink`                                                                                 | `text-ink`                                  | `#10202f`                                             | texto, título de `Notice`                                                                                                                                          | 16,54 `surface`; 14,70 `canvas`; de 14,42 a 15,00 sobre los cuatro fondos de tono (\*)                                                                                                                       |
| `ink-2`                                                                               | `text-ink-2`                                | `#435266`                                             | secundario, segundo renglón, texto de `Notice`, consecuencia de `ActionBar`                                                                                        | 7,96; 7,08 `canvas`; 7,42 `surface-2`; de 6,94 a 7,22 sobre los fondos de tono y 7,26 sobre `own-tint` (\*)                                                                                                  |
| `ink-3`                                                                               | `text-ink-3`                                | `#566579`                                             | rótulos, ejes, equipo bajo el nombre                                                                                                                               | 5,94; 5,28 `canvas`; 5,54 `surface-2`; 5,42 `own-tint` y 5,18 `info-bg` (\*)                                                                                                                                 |
| `white`                                                                               | `text-white`, `bg-white`                    | `#ffffff`                                             | texto sobre `navy` y `navy-dark`; sobre `bad` y los tramos van `on-bad` y `on-arrival`                                                                             | 11,76 `navy`; 15,23 `navy-dark`; 6,57 `bad` (\*)                                                                                                                                                             |
| `navy`, `navy-dark`                                                                   | `bg-navy`, `bg-navy-dark`, `text-navy-dark` | `#123a5c`, `#0b2740`                                  | la cabecera; las pestañas de nivel 2, la barra inferior y la capa fija; `navy-dark`, también el icono del destino activo de `BottomNav`, sobre `gold`              | blanco encima 11,76 y 15,23; `navy-dark` sobre `gold` 6,72 (†)                                                                                                                                               |
| `on-navy-2`                                                                           | `text-on-navy-2`                            | `rgb(255 255 255 / 0.8)`                              | reloj del mundo, pestaña y destino inactivos                                                                                                                       | 8,15 `navy`; 10,19 `navy-dark` (\*)                                                                                                                                                                          |
| `cyan`                                                                                | `bg-cyan`, `border-cyan`                    | `#1499bb`                                             | marca, decorativo                                                                                                                                                  | 3,33 sobre blanco: nunca texto                                                                                                                                                                               |
| `accent`                                                                              | `bg-accent`, `text-accent`                  | `#0b6e8a`                                             | enlace, botón primario, tono `info`                                                                                                                                | 5,81 en los dos sentidos; 5,17 `canvas`; 5,42 `surface-2` (\*); 5,07 `info-bg`                                                                                                                               |
| `accent-strong`                                                                       | `bg-accent-strong`                          | `#085a71`                                             | primario encima y pulsado                                                                                                                                          | blanco encima 7,75                                                                                                                                                                                           |
| `on-accent`                                                                           | `text-on-accent`                            | `#ffffff`                                             | texto del primario; el ámbito oscuro lo redefine                                                                                                                   | 5,81 sobre `accent`                                                                                                                                                                                          |
| `gold`, `gold-ink`                                                                    | `bg-gold`, `text-gold`, `text-gold-ink`     | `#e0a106`, `#7a5000`                                  | realce con `ink` encima, la flecha de la capa fija, el subrayado de `Tabs` `nav` y la pastilla del destino activo de `BottomNav`; el texto dorado sobre claro      | `ink` sobre `gold` 7,30; `gold` sobre `navy-dark` 6,72 y sobre `navy` 5,19 (\*); `gold-ink` 7,06 sobre `surface`                                                                                             |
| `good`, `good-bg`                                                                     | `text-good`, `bg-good-bg`                   | `#167a3a`, `#e6f4ea`                                  | correcto, `Called up` (pantalla)                                                                                                                                   | 5,41 `surface`; 4,77 sobre su fondo                                                                                                                                                                          |
| `warn`, `warn-bg`                                                                     | `text-warn`, `bg-warn-bg`                   | `#8f4e00`, `#fff3d6`                                  | aviso, el velo                                                                                                                                                     | 6,45; 5,85                                                                                                                                                                                                   |
| `bad`, `bad-bg`                                                                       | `text-bad`, `bg-bad`, `bg-bad-bg`           | `#b42318`, `#fdeceb`                                  | error, peligro, `Button` `danger`                                                                                                                                  | 6,57; 5,75                                                                                                                                                                                                   |
| `on-bad`                                                                              | `text-on-bad`                               | `#ffffff`                                             | el texto de `Button` `danger` sobre `bad`; el modo oscuro lo redefine (§3.3)                                                                                       | 6,57 sobre `bad`                                                                                                                                                                                             |
| `info-bg`                                                                             | `bg-info-bg`                                | `#e3f2f7`                                             | días de viaje, avisos informativos                                                                                                                                 | `accent` encima 5,07                                                                                                                                                                                         |
| `focus`                                                                               | `outline-focus`, `ring-focus`               | `#1d4ed8`                                             | anillo de foco de 2 px con 2 de separación                                                                                                                         | 6,70 `surface`; 5,96 `canvas`                                                                                                                                                                                |
| `disabled-ink`, `disabled-bg`                                                         | `text-disabled-ink`, `bg-disabled-bg`       | `#6b7787`, `#e9edf2`                                  | control deshabilitado                                                                                                                                              | 3,87 (WCAG 1.4.3 lo exime); 4,55 sobre `surface` (\*)                                                                                                                                                        |
| `own`, `own-tint`                                                                     | `border-own`, `bg-own-tint`                 | `#a87300`, `#fdf4dc`                                  | barra de 3 px y fondo de la fila propia                                                                                                                            | barra 4,10 contra blanco y 3,74 contra `own-tint` (\*); `ink` encima 15,08 (†; el 16,26 de lectura no se reproduce)                                                                                          |
| `arrival-cooked`, `arrival-loaded`, `arrival-fine`, `arrival-spoton`, `arrival-rusty` | `bg-arrival-*`                              | `#b42318`, `#b45309`, `#566579`, `#167a3a`, `#1d5fa8` | el tramo activo de `Scale5`: `Cooked`, `Loaded`, `Fine`, `Spot on`, `Undertrained` (D-00n; `arrival-rusty` conserva el nombre del código, `oxidado`, decisión 3-k) | `on-arrival` (blanco) encima 6,57, 5,02, 5,94, 5,41 y 6,45                                                                                                                                                   |
| `on-arrival`                                                                          | `text-on-arrival`                           | `#ffffff`                                             | la palabra del tramo activo de `Scale5`; el modo oscuro lo redefine (§3.3)                                                                                         | de 5,02 a 6,57 sobre los tramos                                                                                                                                                                              |
| `kit-edge`, `kit-edge-strong`                                                         | `stroke-kit-edge`, `stroke-kit-edge-strong` | `rgb(0 0 0 / 0.3)`, `rgb(0 0 0 / 0.35)`               | el filete de `Kit`; el de `LeaderJersey` y `ChampionJersey` (8-s); el modo oscuro y el ámbito oscuro los pasan a `rgb(255 255 255 / 0.6)` (§3.3)                   | en el claro, de 2,09 a 2,12 y de 2,41 a 2,43 sobre `surface`, `surface-2`, `canvas` y `own-tint`, exentos de 3:1 (abajo); en el oscuro, 6,35 sobre `navy-dark`, 5,29 sobre `navy` y 3,21 sobre `bad` (§9.10) |
| `kit-ink`                                                                             | `text-kit-ink`, `fill-kit-ink`              | `#10202f`, el mismo en los dos modos                  | lo que se pinta sobre el maillot: la marca del patrocinador, el nombre y el dorsal de la espalda, la tachadura y el `check` de las muestras del editor (8-s)       | `white` o `kit-ink`, el que más contraste, a 4,79:1 o más de los quince colores del maillot (§8.7)                                                                                                           |

Los seis `brand-*` de hoy (`index.css` l. 6-11) siguen en el `@theme` como heredados, para que lo de hoy resuelva hasta el paso 22, que los borra con el cierre; `tokens.test.ts` no los mira. `tokens.test.ts` falla si un texto de la tabla baja de 4,5:1 o un borde o un tramo de 3:1, salvo `disabled-ink`, que comprueba a 3,0 por la exención de WCAG, y los dos filetes del maillot en el claro. **Los filetes, exentos de 3:1** (decisión del cierre, A-L1-007): `kit-edge` mezclado sobre `surface`, `surface-2`, `canvas` y `own-tint` queda de 2,09 a 2,12:1, y `kit-edge-strong`, de 2,41 a 2,43 (medido en el cierre, `docs/diseno/e3-visual/medidas/filete.py`, razón WCAG 2.x con el negro mezclado en sRGB sobre cada fondo). No son un texto ni el borde de un control: el maillot no lleva solo ninguna información, porque la bandera, el nombre y el maillot van siempre juntos (D-00c) y cada maillot lleva su `aria-label`, y su color es el del equipo, que es la presentación esencial que WCAG 1.4.11 exceptúa. Llegar a 3:1 pediría un alfa de 0,42 en los dos, que cambiaría cada distancia medida a 28 px de §8 y §9; por eso `tokens.test.ts` los comprueba contra esos suelos, 2,09 y 2,41, para que ninguno se aclare, y no contra 3:1. Las mismas reglas valen en el modo oscuro (§3.3), donde ninguna pareja de texto baja de 4,5, ni la del deshabilitado (D-00i).

### 3.2 Los estados y la escala de llegada

Ningún estado va solo en color (D-13; O-31): `Chip` y `Notice` exigen en su tipo el tono y el texto (§4.7), cada tono lleva su icono, y el dinero va siempre con su signo (`+80`, `−80`).

| Tono (`Tone`) | Texto, borde e icono | Fondo       | Icono     | Texto sobre su fondo |
| ------------- | -------------------- | ----------- | --------- | -------------------- |
| `neutral`     | `ink-2`              | `surface-2` | ninguno   | 7,42                 |
| `accent`      | `on-accent`          | `accent`    | ninguno   | 5,81                 |
| `good`        | `good`               | `good-bg`   | `check`   | 4,77                 |
| `warn`        | `warn`               | `warn-bg`   | `warning` | 5,85                 |
| `bad`         | `bad`                | `bad-bg`    | `error`   | 5,75                 |
| `info`        | `accent`             | `info-bg`   | `info`    | 5,07                 |

Es la tabla del modo claro; los valores del oscuro, en §3.3. El ΔE00 entre los tonos, en las cuatro visiones y en grises (H-18; medido aquí, \*), es la razón del mecanismo: por el color, `warn` y `bad` son el mismo para un deuteranope y ningún par se separa en grises. `tokens.test.ts` lo informa en su salida y no lo hace umbral, porque lo que distingue es la forma y el texto: la silueta de cada icono de tono, fija en §3.7, y la palabra.

| Par           | Normal | Protanopía | Deuteranopía | Tritanopía | Grises | Razón de luminancia |
| ------------- | ------ | ---------- | ------------ | ---------- | ------ | ------------------- |
| `good`/`warn` | 42,1   | 10,1       | 9,6          | 51,6       | 4,3    | 1,19                |
| `good`/`bad`  | 62,2   | 13,6       | 9,0          | 58,8       | 4,8    | 1,21                |
| `good`/`info` | 34,5   | 35,6       | 34,9         | 5,7        | 1,8    | 1,07                |
| `warn`/`bad`  | 18,9   | 6,3        | 1,7          | 10,1       | 0,5    | 1,02                |
| `warn`/`info` | 43,0   | 39,5       | 43,6         | 48,3       | 2,5    | 1,11                |
| `bad`/`info`  | 53,2   | 36,9       | 43,2         | 54,6       | 3,0    | 1,13                |

**La escala de llegada** (X-20, medida por uso, C5): el texto `on-arrival` (blanco en el modo claro) sobre el tramo activo va de 5,02 (`Loaded`, pantalla) a 6,57 (`Cooked`); `Cooked` y `Loaded` quedan a 6,3 de ΔE00 en deuteranopía, y el tramo activo a 38 o más del apagado (`surface-2`) en toda visión. Por eso `Scale5` (§4.8) se lee por posición y por palabra, no por su color: el orden es fijo, de cansado a fresco (`Cooked`, `Loaded`, `Fine`, `Spot on`, `Undertrained`; D-42 y D-00n), y la palabra del tramo activo va escrita en él.

### 3.3 El modo oscuro y el ámbito oscuro

**El modo oscuro** (D-00i, que sustituye a D-04; DD-05, decidida por el dueño el 22 de octubre de 2026: «por defecto light, pero en opciones, que se pueda activar el modo oscuro», `00-encargo.md` §7.4). El juego es claro por defecto, y el jugador lo pasa a oscuro en `/account` con un `Segmented` `Appearance` (`Light` · `Dark`, pantalla) que se aplica al momento. **No sigue a `prefers-color-scheme`**: ninguna regla de CSS ni de JS lo lee, y la variante `dark:` de Tailwind, que lo sigue por defecto (el compilador de 4.3.3 la emite como `@media (prefers-color-scheme: dark)`, comprobado con `docs/diseno/e3-visual/medidas/clases.mjs`), se redefine para que siga al modo del jugador (§3.9); ningún componente la necesita, porque los tokens cambian solos. El modo redefine los tokens de color bajo `:root[data-theme='dark']`, con la paleta C de telefono como punto de partida (telefono §15.1: superficies `#0b2740` y `#123a5c`, texto blanco, secundario blanco al 75 % y acento `#35bdda`), que es la del ámbito oscuro de abajo, y con lo que el ámbito no tiene medido aquí (†), con los umbrales de §3.1 y sin la exención del deshabilitado: ninguna pareja de texto baja de 4,5:1 y ningún borde, tramo, gráfico ni foco de 3:1 (57 parejas, todas por encima). No cambian `white`, `navy`, `navy-dark`, `on-navy-2`, `cyan` ni `gold`: la cabecera, la barra inferior y las marcas son las mismas en los dos modos.

| Token                                  | Claro                                   | Oscuro                                                           | Medido en el oscuro (†)                                                                                                 |
| -------------------------------------- | --------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `canvas`                               | `#eef2f6`                               | `#071a2d`                                                        | `ink` 17,58; `ink-2` 10,21; `accent` 7,90; `line-strong` 5,82; `focus` 12,19; 1,15 contra `surface`                     |
| `surface`, `surface-2`                 | `#ffffff`, `#f5f7fa`                    | `#0b2740`, `#123a5c`                                             | `ink` 15,23 y 11,76; `ink-2` 9,10 y 7,36; `accent` 6,85 y 5,29; `gold-ink` 8,17 y 6,31                                  |
| `line`, `line-strong`                  | `#d8dee6`, `#7b8794`                    | `#2c5274`, `#7f97b0`                                             | `line-strong` 5,05 sobre `surface` y 3,90 sobre `surface-2`; `accent` contra `line` (el `Meter`) 3,68                   |
| `ink`; `ink-2`, `ink-3`                | `#10202f`; `#435266`, `#566579`         | `#ffffff`; `rgb(255 255 255 / 0.75)`                             | las de cada fondo, en su fila                                                                                           |
| `accent`, `accent-strong`, `on-accent` | `#0b6e8a`, `#085a71`, `#ffffff`         | `#35bdda`, `#7fd6e9`, `#0b2740`                                  | `on-accent` sobre `accent` 6,85 y sobre `accent-strong` 9,21                                                            |
| `gold-ink`                             | `#7a5000`                               | `#f0b429`                                                        | 8,17 sobre `surface`; 6,31 sobre `surface-2`                                                                            |
| `good`, `good-bg`                      | `#167a3a`, `#e6f4ea`                    | `#5bd08c`, `#0e3b2e`                                             | 7,87 sobre `surface`; 6,44 sobre su fondo; `ink` 12,47 e `ink-2` 7,73 sobre su fondo                                    |
| `warn`, `warn-bg`                      | `#8f4e00`, `#fff3d6`                    | `#f5b04f`, `#3d2c0c`                                             | 8,13; 7,16; `ink` 13,43 e `ink-2` 8,22                                                                                  |
| `bad`, `bad-bg`, `on-bad`              | `#b42318`, `#fdeceb`, `#ffffff`         | `#ff8f86`, `#45191f`, `#0b2740`                                  | 6,91; 6,75; `ink` 14,87 e `ink-2` 8,91; `on-bad` sobre `bad` 6,91, y 5,92 con el `brightness-90` del `danger` encima    |
| `info-bg`                              | `#e3f2f7`                               | `#0d3a55`                                                        | `accent` 5,39; `ink` 11,98; `ink-2` e `ink-3` 7,46                                                                      |
| `focus`                                | `#1d4ed8`                               | `#ffd166`                                                        | 12,19, 10,57 y 8,16 sobre `canvas`, `surface` y `surface-2`                                                             |
| `disabled-bg`, `disabled-ink`          | `#e9edf2`, `#6b7787`                    | `#1f4567`, `#a3b2c3`                                             | 4,61                                                                                                                    |
| `own`, `own-tint`                      | `#a87300`, `#fdf4dc`                    | `#e0a106`, `#2e2a16`                                             | la barra 6,35 contra `own-tint` y 6,72 contra `surface`; `ink` 14,39 e `ink-2` 8,77 encima                              |
| `arrival-*`; `on-arrival`              | los de §3.1; `#ffffff`                  | `#ff8f86`, `#f5a35c`, `#a3b2c3`, `#5bd08c`, `#82b4f5`; `#0b2740` | `on-arrival` encima, de 6,91 a 7,87; cada tramo contra `surface`, lo mismo; el activo, a 46,9 de ΔE00 o más del apagado |
| `kit-edge`, `kit-edge-strong`          | `rgb(0 0 0 / 0.3)`, `rgb(0 0 0 / 0.35)` | `rgb(255 255 255 / 0.6)` los dos                                 | 6,35 sobre `navy-dark` y 5,29 sobre `navy` (§9.10); `kit-ink` no cambia, porque va sobre los colores del maillot (8-s)  |

Por el color, en el oscuro `good` y `bad` quedan a 3,6 de ΔE00 en deuteranopía y `bad` e `info` a 0,2 en grises (†; la tabla entera, en `docs/diseno/e3-visual/medidas/oscuro.txt`): como en el claro, lo que distingue es el icono de cada tono y su palabra (D-13), y `tokens.test.ts` lo informa sin hacerlo umbral.

**Dónde se guarda la preferencia** (D-00i). **En la cuenta**, para que siga al jugador de un aparato a otro: `users.theme`, un `pgEnum` `theme` con `light` y `dark`, por defecto `light`, en una migración de drizzle-kit, como `users.spoiler_scope` (`packages/db/src/schema.ts` l. 108); la lee `GET /api/me/theme` y la escribe `PUT /api/me/theme` con `{ theme }` (`themeBodySchema`, `.strict()`, `spoiler: 'safe'` y su esquema de respuesta, §13), como `PUT /api/me/spoiler-scope` (`apps/api/src/routes/me.ts` l. 195). **En `localStorage`**, con la clave `cs-theme`, para pintarla antes de la primera pintura. **Sin destello**: `apps/web/public/theme.js`, un guion clásico de una línea que `index.html` carga en `<head>` antes de la hoja de estilos, lee `cs-theme` dentro de un `try` (sin almacenamiento, claro) y pone `data-theme="dark"` en `<html>`; va en un fichero y no en línea porque la CSP solo deja `script-src 'self'` (`apps/api/src/app.ts` l. 180; decisión 3-h). Al llegar la sesión, si `GET /api/me/theme` dice otra cosa que `localStorage`, manda la cuenta y se cambian los dos, una vez por aparato nuevo; sin sesión, vale lo que haya en `localStorage`. `useTheme()` (`apps/web/src/theme.ts`, con `THEME_STORAGE_KEY` = `'cs-theme'`) da el modo al `Segmented` de `/account`; los maillots no lo leen, porque su filete es un token, `kit-edge` (o `kit-edge-strong`), que el modo oscuro redefine (§8.3, §9.10). `:root` lleva `color-scheme: light` y el modo oscuro `color-scheme: dark`, para que los controles nativos (el desplegable de un `select`) sigan al modo. **Las pruebas**: `tokens.test.ts` comprueba cada pareja de esta tabla con su umbral; `/_ui` pinta cada componente en cada estado en los dos modos (§5.4); la prueba del teléfono pasa la comprobación 6 en oscuro (§7.4). Entra en el plan tras el sistema claro entero, después del paso 22 (D-00i; el PR, §17).

**El ámbito oscuro** (I-10), que es el mismo en los dos modos (D-00i): el atributo `[data-surface='dark']` redefine los tokens para que los mismos componentes sirvan sobre fondo oscuro sin saber dónde están. Lo llevan `AppHeader`, `BottomNav`, la capa fija (`FixedOverlay`) y la de la crono (`TimeTrialOverlay`, `broadcast/TimeTrialBoard.tsx` l. 12-33, §14.3), el rótulo (`CueCard`) de fondo oscuro, `WatchBlocks`, `PlayerControls`, `StagePreviewCards` y `StageClosingCards` (§14). Para salir igual con el modo oscuro activo, el ámbito declara también, con su valor del modo claro, cada token que el modo oscuro redefine y él no (`canvas`, `gold-ink`, los tonos con sus fondos y `on-bad`, `info-bg`, `own`, `own-tint`, los tramos y `on-arrival`; decisión 3-j), y `tokens.test.ts` falla si el modo oscuro declara una variable que el ámbito no. Lo que redefine, con su contraste sobre `surface` (`#0b2740`) y `surface-2` (`#123a5c`) del ámbito:

| Token                          | En el ámbito                         | Medida                                                                           | Quién                     |
| ------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------- | ------------------------- |
| `surface`, `surface-2`         | `#0b2740`, `#123a5c`                 | fondos; 1,30 entre sí (\*)                                                       | telefono §15.1 (paleta C) |
| `ink`; `ink-2`, `ink-3`        | `#ffffff`; `rgb(255 255 255 / 0.75)` | 15,23 y 11,76; 9,10 y 7,36                                                       | telefono; repetido (\*)   |
| `line`                         | `#2c5274`                            | 1,86 y 1,44: decorativo, visible sobre las dos y muy por debajo de `line-strong` | (\*)                      |
| `line-strong`                  | `#7f97b0`                            | 5,05 y 3,90 (WCAG 1.4.11 pide 3); 3,30 sobre `disabled-bg`                       | (\*)                      |
| `accent`, `on-accent`          | `#35bdda`, `#0b2740`                 | 6,85 y 5,29; `on-accent` sobre `accent`, 6,85                                    | telefono §15.1; (\*)      |
| `accent-strong`                | `#7fd6e9`                            | `on-accent` encima 9,21; a 8,1 de ΔE00 de `accent` (5,9 en tritanopía)           | (\*), decisión 3-b        |
| `focus`; `gold`, que no cambia | `#ffd166`; `#e0a106`                 | 10,57 y 8,16 (el `focus-dark` de telefono); 6,72 y 5,19                          | telefono; (\*)            |
| `disabled-bg`, `disabled-ink`  | `#1f4567`, `#a3b2c3`                 | el fondo, 1,53 sobre `surface` y 1,18 sobre `surface-2`; el texto encima, 4,61   | (\*), decisión 3-c        |
| `kit-edge`, `kit-edge-strong`  | `rgb(255 255 255 / 0.6)`             | 6,35 sobre `navy-dark`, 5,29 sobre `navy` y 3,21 sobre `bad`                     | §9.10 (I-24; 8-s)         |

Dentro del ámbito, un fondo es `surface`, `surface-2` o un token que el ámbito no redefine (`navy`, `navy-dark`, `bad`, `gold`), y **un token de tinta nunca es un fondo**: `bg-ink-2` en un elemento del ámbito pintaría el blanco al 75 %. Fuera del ámbito no cambia nada, y `tokens.test.ts` comprueba las parejas de las dos tablas de §3.3 igual que las de §3.1.

### 3.4 La letra

La del sistema (D-05), decidida por el dueño: «Tipografía: sistema» (D-00a; `00-encargo.md` l. 263): `--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif`, cero bytes, ningún salto de letra con Slow 4G, y con los alfabetos que traerá E10. Siete tamaños, en `rem` para que la letra raíz los escale (§7.8):

| Token     | Utilidad       | Tamaño / interlínea | Peso                                   | Uso                                                                 |
| --------- | -------------- | ------------------- | -------------------------------------- | ------------------------------------------------------------------- |
| `caption` | `text-caption` | 12 / 16 px          | 400 y 600; en versales, 600 y +0,04 em | el mínimo: ejes, rótulos, cabecera de tabla, `Chip`, barra inferior |
| `meta`    | `text-meta`    | 14 / 20             | 400                                    | segundo renglón, entradillas, texto de aviso, línea de estado       |
| `row`     | `text-row`     | 15 / 20             | 600                                    | primer renglón de una fila: el nombre, la carrera                   |
| `body`    | `text-body`    | 16 / 24             | 400                                    | texto y **todo campo**                                              |
| `title`   | `text-title`   | 18 / 24             | 600                                    | título de `Panel`                                                   |
| `page`    | `text-page`    | 24 / 32             | 700                                    | el `h1` de `PageHeader`                                             |
| `display` | `text-display` | 32 / 40             | 700                                    | cifras grandes: saldo, km a meta                                    |

El peso va dentro del token (`--text-row--font-weight`), así que `text-row` ya es 600 y `font-normal` lo baja. Pesos: 400, 600 y 700 (`font-normal`, `font-semibold`, `font-bold`); `font-medium` (243 apariciones) y `font-mono` (12) van a la deuda. El rótulo en versales es `text-caption font-semibold uppercase tracking-caps`, con `--tracking-caps: 0.04em` (decisión 3-a). Toda columna de cifras lleva `tabular-nums`. Humanos en 600 y bots en cursiva con peso 400 (`RiderName.tsx` l. 19-20; [DUEÑO 24]). Mínimo, 12 px en todo nodo de texto, SVG incluido (las cotas de `ProfileStrip.tsx` l. 70 y 161 pasan de 9 y 8 a 12), y 16 px en todo campo. No se carga ninguna fuente, así que la CSP de hoy, que solo deja `font-src 'self' data:` (`apps/api/src/app.ts` l. 183), no cambia.

### 3.5 Espacio, rejilla y densidad

El paso es de 4 px (`--spacing: 0.25rem`), y los únicos pasos permitidos son los de `SPACING_STEPS` = 0, 0,5, 1, 1,5, 2, 2,5, 3, 4, 6, 8, 12 y 16 (de 0 a 64 px; los cuenta `vocabulario.test.ts`, §5.2). Dos cortes, `sm` (40rem, 640 px) y `lg` (64rem, 1.024 px): las tres apariciones de `md:` y la de `xl:` van a la deuda. Dos contenedores: `max-w-page` (72rem, el `max-w-6xl` de hoy, `App.tsx` l. 158) y `max-w-form` (28rem). Las medidas con el dedo (D-06, telefono §3.3), todas alturas mínimas (`min-h-*`), nunca fijas, para que la letra al doble no se recorte (H-17):

| Medida                                                        | A 360 px                                                                                                       | Desde 640                             | Desde 1.024 | Con ratón (`fine:`)                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------- | ----------------------------------------------------------------- |
| margen lateral de la página; relleno de `Panel` `default`     | 12 (`px-3`); 12                                                                                                | 16; 16                                | 24; 16      | igual                                                             |
| fila de `RankTable` (con maillot, D-00b)                      | 44 con un renglón; 56 con dos (el maillot de 28, el equipo debajo y 4 px arriba y abajo)                       | igual                                 | igual       | igual: con maillot nunca baja de 44; sin él (los movimientos), 36 |
| fila con acción (`ActionRow`)                                 | 64                                                                                                             | 64                                    | 64          | 48                                                                |
| objetivo (`Button`, enlace de fila, pestaña); campo (`Field`) | 44; 48                                                                                                         | 44; 48                                | 44; 48      | 32 (`Button` `sm`); 40                                            |
| lo fijo y la cabecera                                         | `AppHeader` 48 más el área segura; `Tabs` 44; `BottomNav` 56 más `env(safe-area-inset-bottom)`; `ActionBar` 60 | `BottomNav` no se pinta (`sm:hidden`) | igual       | igual                                                             |

La densidad depende del puntero, no del ancho (I-21): `@custom-variant fine (@media (pointer: fine))`, porque el público de Hattrick y PCM lee tablas densas con ratón (mapa 04 §2), y un portátil táctil manejado con el dedo, o una tableta a 1.024, siguen en 44. Solo un componente escribe `fine:`, y solo para las medidas de la última columna; ninguna página lo usa (§6.6).

### 3.6 Radios y sombras

Un radio, `--radius-ui` de 8 px (`rounded-ui`), para panel, botón, campo, aviso y tramo; `rounded-full`, que en Tailwind v4 es estática, solo en `Chip` y en la pastilla de `BottomNav` (D-07). Dos sombras: `shadow-card` (`0 1px 2px rgb(16 32 47 / 0.08)`), en `Panel`, y `shadow-bar` (`0 -2px 8px rgb(0 0 0 / 0.12)`), en `BottomNav` y `ActionBar`. Los radios y sombras de hoy (`rounded-md`, `rounded-lg`, `rounded-2xl`, `shadow-sm`, `shadow-md`, la sombra arbitraria de `BottomNav.tsx` l. 44) no se redefinen: son deuda y desaparecen con el cierre.

### 3.7 Los iconos

Veintiséis iconos propios en `apps/web/src/components/ui/icons.tsx`, que pinta `Icon` (§4.6): SVG sobre una rejilla de 24 u, trazo de 2 u con extremos y uniones redondeados, `fill="none"` salvo `star-full` y `star-half`, y `currentColor`; a 16, 20 o 24 px, siempre con su texto al lado o con `aria-label` (D-07). Los emoji salen de la interfaz porque cada sistema los pinta a su manera y un glifo pequeño se leyó «Ill» en el teléfono del dueño ([DUEÑO 5]):

| Iconos                                          | Dónde                                                                                 | Lo que sustituyen                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `home`, `rider`, `team`, `world`, `news`        | los cinco destinos de `BottomNav`                                                     | nada: hoy son solo texto (`BottomNav.tsx` l. 59)                                                                               |
| `account`                                       | `AppHeader`, con `aria-label="Account"`                                               | el texto `Account` (pantalla) de `Header.tsx`                                                                                  |
| `travel`, `race`                                | el viaje (`TripRow`, `ActionRow`) y el día de carrera                                 | `✈️` y `✈` (`Training.tsx` l. 227, `TeamCalendar.tsx` l. 94), `🚴` (`Training.tsx` l. 210), `🏁` (`LastRaceReport.tsx` l. 102) |
| `check`, `warning`, `error`, `info`             | los tonos de §3.2; `info` también en `InfoButton`                                     | `⚠` y `ℹ` (`RaceOrders.tsx` l. 718), `ⓘ`                                                                                       |
| `offline`, `retry`                              | `OfflineBanner`, `OfflineState`; `Try again`, `Retry`, `Reload`                       | nada                                                                                                                           |
| `close`, `more`                                 | cerrar un aviso; el menú de `PlayerControls`                                          | `⋯`                                                                                                                            |
| `play`, `pause`                                 | los mandos de `PlayerControls` (§14)                                                  | `PLAY_GLYPH` (`▶︎`) y `❚❚` (`PlayerControls.tsx` l. 34 y 123)                                                                   |
| `chevron-left`, `chevron-right`, `chevron-down` | la vuelta de `PageHeader`, etapa anterior y siguiente, `Disclosure`, `Field` `Select` | `←` como vuelta, `‹` y `›`                                                                                                     |
| `star-full`, `star-half`, `star-empty`          | `StarRating`                                                                          | `★` con relleno por ancho (`StarRating.tsx` l. 2-20)                                                                           |
| `trend`, `share`                                | la flecha de cinco niveles, girada en pasos de 45°; `Share to watch`                  | `▲`, `▼`, `↑`, `↓`, `↗`, `↘`                                                                                                   |

**Las siluetas de los cuatro iconos de tono son fijas**, porque son el mecanismo de «ningún estado va solo en color» y por el color `warn` y `bad` son el mismo para un deuteranope (§3.2): `check`, una marca de verificación sin contorno; `warning`, un triángulo con `!`; `error`, un octógono con `×`; `info`, un círculo con `i`. `ui-icons.mjs` (§3.8) rasteriza los cuatro a 16 px y falla si dos comparten más del 75 % de sus píxeles pintados.

Los emoji y glifos que no tienen icono pasan a palabra o se van (decisión 3-d), cada uno en el PR de la cola larga de su página (§17): el `🏆` del ganador en el índice de carreras (`RacesIndex.tsx` l. 126 y 223) y en el calendario del equipo (`TeamCalendar.tsx` l. 282) pasa a `Winner` (pantalla) delante del nombre; el `🏠` de `Housing` (`Finances.tsx` l. 39) y el de `Team pays rent` (`Market.tsx` l. 86) se van, porque el título del panel, `Lives in` y el propio texto ya lo dicen; el tiempo de las órdenes (`🌧`, `🌦`, `☀`, `RaceOrders.tsx` l. 244) pasa a `Rain`, `Showers` o `Dry` (pantalla) delante de `60% · 14°C`; los decorativos de `HowToPlay.tsx` (l. 32 y 49, con `aria-hidden`) se quitan, porque el `h2` de al lado ya dice lo que son; el `✓` y el `✗` del registro de ticks (`AdminNames.tsx` l. 243) pasan a un `Chip` `good` `OK` o `bad` `Failed` (pantalla); el `★` y el `☆` de `Target this race` (`Race.tsx` l. 875, que no es `StarRating`) pasan al icono `star-full` o `star-empty` dentro del `Button`, con `Targeted` o `Target this race`; y el `⚠` que va dentro del texto de `RaceOrders.tsx` l. 422, en una plantilla, pasa a `… with orders that clash. Look for the warning below.` (pantalla), sin la raya del texto de hoy. Los emoji de los logros son contenido y se quedan (`packages/db/src/ranking.ts` l. 571-621). La `→` de `StageRoute` es un signo del texto, no un icono, y se queda.

### 3.8 El material generable

Es regla (D-08; I-23; `docs/agenda.md` §4.22.5): los iconos de la interfaz, `og-default.png`, las celdas de las banderas para medir (`packages/db/src/flagCells.generated.bin` y `flagCells.generated.ts`, que escribe `apps/web/scripts/flag-sprite.mjs`, §9.5), la hoja de revisión de los 133 maillots nacionales (D-00f y D-00m, §9.5), la tabla de choques, el sprite de banderas con sus coordenadas y los tokens para la app (`packages/shared/tokens.json`, §12.3; D-00p) salen de scripts del repositorio (`apps/web/scripts/`, `packages/shared/scripts/`, `packages/db/scripts/`), y el presupuesto de dibujo a mano es cero. Los iconos de la web instalable ya no se hacen: el dueño la retiró (D-00p). Cada fichero generado lleva en su cabecera la huella SHA-256 de sus entradas (`tokens.json`, que no admite comentarios, en un campo `sha256`), un test lo regenera y lo compara, y el PR que lo introduce lleva en su descripción la hoja de contactos que revisa una persona. Para los 26 iconos (decisión 3-e): el agente del paso 9 escribe sus fuentes en `apps/web/scripts/icons/<nombre>.svg` con las reglas de §3.7, y `apps/web/scripts/ui-icons.mjs` las valida (rejilla de 24, trazo de 2, solo `currentColor`, ningún texto, y las cuatro siluetas de tono distintas: ningún par comparte más del 75 % de sus píxeles pintados a 16 px), escribe `icons.tsx` con la huella y pinta la hoja de contactos a 16, 20 y 24 px, sobre claro, en el modo oscuro y en el ámbito oscuro.

### 3.9 Dónde vive cada cosa

| Qué                                                                 | Dónde                                                                                                                                                                             | Por qué                                                                                                                                        |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| tokens de color, letra, radio, sombra, cortes y contenedores        | el `@theme` de `apps/web/src/index.css`, sin `inline` (abajo)                                                                                                                     | Tailwind v4 crea de ahí las utilidades, y sin `inline` el ámbito oscuro puede redefinirlos                                                     |
| el catálogo de componentes                                          | `apps/web/src/components/ui/`, un componente por fichero con su `.test.tsx`                                                                                                       | una carpeta, una frontera para el lint (§5.3)                                                                                                  |
| `WornJerseyIcon`                                                    | `apps/web/src/components/broadcast/WornJerseyIcon.tsx`, donde está                                                                                                                | es el contrato de E2 y lo importan sus componentes                                                                                             |
| constantes visuales; las de red; las de la prueba                   | `apps/web/src/components/ui/constants.ts`; `apps/web/src/net.ts`; `apps/web/e2e/telefono.config.ts`                                                                               | la prueba importa las de `ui/constants.ts` y no las copia                                                                                      |
| vocabulario y geometría del maillot, colores de líder y de campeón  | `packages/shared/src/kit.ts`, en el barril                                                                                                                                        | lo dibuja la web, lo valida la API y lo reparte `packages/db` (§8)                                                                             |
| WCAG, Machado 2009, CIELAB y ΔE00                                   | `packages/shared/src/colorMath.ts`, fuera del barril (I-31), con su entrada en `exports` (abajo)                                                                                  | lo usan `tokens.test.ts`, `kit.test.ts` y el servidor; en el barril viajaría a la web (H-03)                                                   |
| el modo del jugador (D-00i)                                         | `users.theme` y `localStorage` (`cs-theme`); `apps/web/public/theme.js`; `apps/web/src/theme.ts`                                                                                  | la cuenta lo lleva de un aparato a otro y `theme.js` lo pinta antes de la primera pintura (§3.3)                                               |
| los tokens para la app (D-00p)                                      | `packages/shared/tokens.json`, en la raíz del paquete y exportado como `@cyclingstar/shared/tokens.json`, generado del `index.css` por `apps/web/scripts/tokens-json.mjs` (§12.3) | la app que hará el dueño usará el mismo sistema, y una app importa de un paquete, no de `apps/web`; fuera de `src/`, `tsc` no lo compila (3-l) |
| distancia dibujada, tabla de choques, reparto, rivales de temporada | `packages/db/src/kitDistance.ts`, `kitConflicts.generated.ts`, `kits.ts`, `seasonRivals.ts`                                                                                       | solo servidor                                                                                                                                  |
| la precedencia del día                                              | `packages/shared/src/trainingDay.ts` (`resolveTrainingDay`)                                                                                                                       | la usan el tick y la vista previa (§11)                                                                                                        |
| las palabras de pantalla                                            | `apps/web/src/domain/words.ts`                                                                                                                                                    | junto a `labels.ts` y `format.ts`, que ya pintan texto (§4.10)                                                                                 |
| `PREVIEW_RACE_DAY_TSS` y su ventana                                 | `packages/engine/src/constants.ts` (D-37)                                                                                                                                         | `Claude.md`: toda constante de juego vive en el motor                                                                                          |

`colorMath.ts` (I-31) da `wcagContrast`, `simulateCvd` (Machado 2009, severidad 1, en RGB lineal) y `deltaE00` (CIEDE2000 en CIELAB D65), con el tipo `Vision`; `colorMath.test.ts` los compara a 0,01 con valores dorados de colour-science 0.4.7. Una sola implementación evita dos cifras distintas para lo mismo. **Fuera del barril no se importa sin más**: `packages/shared/package.json` (l. 8-13) solo publica `"."` en `exports`, así que `@cyclingstar/shared/colorMath` daría `ERR_PACKAGE_PATH_NOT_EXPORTED` en Node y TS2307 en TypeScript (hallazgo del refutador de código, Rcodigo-007). El paso 7 le añade `"./colorMath": { "types": "./dist/colorMath.d.ts", "default": "./dist/colorMath.js" }`, todos lo importan como `@cyclingstar/shared/colorMath`, y cada módulo que el documento saque del barril gana su entrada igual (`legacyJersey.ts`, §8.6).

`tokens.json` (D-00p) lleva lo que la app necesita para pintar igual, con la forma que fija §12.3, `{ version, source, sha256, light, dark, darkScope }`: en `light`, los colores de §3.1 por nombre de token (los que llevan transparencia, tal cual y sin mezclar: `rgb(255 255 255 / 0.75)`), los siete tamaños de §3.4 con su interlínea y su peso, el paso de 4 px, `radius-ui`, las dos sombras, los dos cortes y los dos contenedores; en `dark` y en `darkScope`, lo que redefinen las dos tablas de §3.3. `generados.test.ts` lo regenera del `index.css` y falla si no casa (decisión 3-l; 12-b).

**`apps/web/src/index.css`, entero.** Es el fichero del paso 7, el de los tokens, compilado por el redactor con Tailwind 4.3.3 abierto y cerrado (`docs/diseno/e3-visual/medidas/comprobar-tema.mjs`): con las 17 líneas del cierre activas resuelven las 43 clases de muestra del sistema (`bg-canvas`, `text-row`, `rounded-ui`, `fine:h-9`, `@max-[21.25rem]:hidden`…), dejan de resolver `bg-indigo-600`, `text-sm`, `rounded-md`, `font-medium`, `md:block`, `max-w-6xl` y `shadow-sm`, y siguen resolviendo `text-[11px]` y `p-5`, como midió el juez de código (C4). Las clases que añadió la corrección también resuelven con el cierre activo y los tokens `on-bad` y `on-arrival` (`docs/diseno/e3-visual/medidas/clases.mjs`): `line-clamp-2`, `leading-4`, `leading-5`, `whitespace-normal`, `@container`, `@max-[4.75rem]:hidden` y `@max-[4.75rem]:inline` (la consulta de contenedor de §6.3, que sustituye a la `@max-[21.25rem]:` de la muestra), `bottom-[var(--action-bar-bottom)]`, `sm:inline`, `min-h-16`, `min-w-11`, `bg-gold`, `text-navy-dark`, `text-on-bad`, `text-on-arrival` y `brightness-90`; y `dark:bg-surface`, que sin redefinir compila a `@media (prefers-color-scheme: dark)`, con la `@custom-variant dark` de abajo compila a `:where([data-theme='dark'], [data-theme='dark'] *)`.

```css
@import 'tailwindcss';

/* EL SISTEMA VISUAL (docs/visual.md §3): tokens.test.ts comprueba cada pareja. Sin `inline`. */
@theme {
  /* EL CIERRE (paso 22, D-14): el PR del paso 22 cambia este comentario por las 17 líneas de §5.1,
     una por renglón, y borra los heredados. Hasta entonces lo de hoy sigue resolviendo.
  --color-*: initial; --font-*: initial; --font-weight-*: initial; --text-*: initial;
  --tracking-*: initial; --leading-*: initial; --radius-*: initial; --shadow-*: initial;
  --inset-shadow-*: initial; --drop-shadow-*: initial; --text-shadow-*: initial; --blur-*: initial;
  --perspective-*: initial; --aspect-*: initial; --animate-*: initial; --breakpoint-*: initial;
  --container-*: initial;
  */
  --color-canvas: #eef2f6;
  --color-surface: #ffffff;
  --color-surface-2: #f5f7fa;
  --color-line: #d8dee6;
  --color-line-strong: #7b8794;
  --color-ink: #10202f;
  --color-ink-2: #435266;
  --color-ink-3: #566579;
  --color-white: #ffffff;
  --color-navy: #123a5c;
  --color-navy-dark: #0b2740;
  --color-on-navy-2: rgb(255 255 255 / 0.8);
  --color-cyan: #1499bb;
  --color-accent: #0b6e8a;
  --color-accent-strong: #085a71;
  --color-on-accent: #ffffff;
  --color-gold: #e0a106;
  --color-gold-ink: #7a5000;
  --color-good: #167a3a;
  --color-good-bg: #e6f4ea;
  --color-warn: #8f4e00;
  --color-warn-bg: #fff3d6;
  --color-bad: #b42318;
  --color-bad-bg: #fdeceb;
  --color-info-bg: #e3f2f7;
  --color-focus: #1d4ed8;
  --color-disabled-ink: #6b7787;
  --color-disabled-bg: #e9edf2;
  --color-own: #a87300;
  --color-own-tint: #fdf4dc;
  --color-arrival-cooked: #b42318;
  --color-arrival-loaded: #b45309;
  --color-arrival-fine: #566579;
  --color-arrival-spoton: #167a3a;
  --color-arrival-rusty: #1d5fa8;
  --color-on-bad: #ffffff;
  --color-on-arrival: #ffffff;
  /* Lo que se pinta sobre el maillot (8-s): los filetes siguen al tema; kit-ink es el mismo en los dos modos. */
  --color-kit-edge: rgb(0 0 0 / 0.3);
  --color-kit-edge-strong: rgb(0 0 0 / 0.35);
  --color-kit-ink: #10202f;
  /* HEREDADOS (index.css de hoy, l. 6-11): los borra el paso 22. */
  --color-brand-navy: #123a5c;
  --color-brand-navy-dark: #0b2740;
  --color-brand-cyan: #1499bb;
  --color-brand-cyan-light: #35bdda;
  --color-brand-gold: #d99400;
  --color-brand-gold-light: #eaa90c;

  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', Arial, sans-serif;
  --font-weight-normal: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  --tracking-caps: 0.04em;
  --text-caption: 0.75rem;
  --text-caption--line-height: 1rem;
  --text-meta: 0.875rem;
  --text-meta--line-height: 1.25rem;
  --text-row: 0.9375rem;
  --text-row--line-height: 1.25rem;
  --text-row--font-weight: 600;
  --text-body: 1rem;
  --text-body--line-height: 1.5rem;
  --text-title: 1.125rem;
  --text-title--line-height: 1.5rem;
  --text-title--font-weight: 600;
  --text-page: 1.5rem;
  --text-page--line-height: 2rem;
  --text-page--font-weight: 700;
  --text-display: 2rem;
  --text-display--line-height: 2.5rem;
  --text-display--font-weight: 700;

  --spacing: 0.25rem;
  --radius-ui: 0.5rem;
  --shadow-card: 0 1px 2px rgb(16 32 47 / 0.08);
  --shadow-bar: 0 -2px 8px rgb(0 0 0 / 0.12);
  --breakpoint-sm: 40rem;
  --breakpoint-lg: 64rem;
  --container-page: 72rem;
  --container-form: 28rem;
  /* Con el cierre, Tailwind 4.3.3 sigue emitiendo sus @keyframes pulse y spin (comprobado). */
  --animate-pulse: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --animate-spin: spin 1s linear infinite;
}

/* Densidad por puntero (D-06): con ratón, fila de tabla sin maillot de 36 (con maillot, nunca
   menos de 44: D-00b) y Button sm de 32. */
@custom-variant fine (@media (pointer: fine));
/* `dark:` sigue al modo del jugador y no a prefers-color-scheme (D-00i); ningún componente lo usa. */
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

:root {
  color-scheme: light;
}

/* EL MODO OSCURO (D-00i, §3.3): lo pone theme.js en <html> con data-theme="dark". */
:root[data-theme='dark'] {
  color-scheme: dark;
  --color-canvas: #071a2d;
  --color-surface: #0b2740;
  --color-surface-2: #123a5c;
  --color-line: #2c5274;
  --color-line-strong: #7f97b0;
  --color-ink: #ffffff;
  --color-ink-2: rgb(255 255 255 / 0.75);
  --color-ink-3: rgb(255 255 255 / 0.75);
  --color-accent: #35bdda;
  --color-accent-strong: #7fd6e9;
  --color-on-accent: #0b2740;
  --color-gold-ink: #f0b429;
  --color-good: #5bd08c;
  --color-good-bg: #0e3b2e;
  --color-warn: #f5b04f;
  --color-warn-bg: #3d2c0c;
  --color-bad: #ff8f86;
  --color-bad-bg: #45191f;
  --color-on-bad: #0b2740;
  --color-info-bg: #0d3a55;
  --color-focus: #ffd166;
  --color-disabled-bg: #1f4567;
  --color-disabled-ink: #a3b2c3;
  --color-own: #e0a106;
  --color-own-tint: #2e2a16;
  --color-arrival-cooked: #ff8f86;
  --color-arrival-loaded: #f5a35c;
  --color-arrival-fine: #a3b2c3;
  --color-arrival-spoton: #5bd08c;
  --color-arrival-rusty: #82b4f5;
  --color-on-arrival: #0b2740;
  --color-kit-edge: rgb(255 255 255 / 0.6);
  --color-kit-edge-strong: rgb(255 255 255 / 0.6);
}

/* EL ÁMBITO OSCURO (I-10, §3.3), el mismo en los dos modos: un token de tinta nunca es un fondo aquí
   dentro, y lo que el modo oscuro redefine y el ámbito no vuelve a su valor claro (decisión 3-j). */
[data-surface='dark'] {
  --color-surface: #0b2740;
  --color-surface-2: #123a5c;
  --color-line: #2c5274;
  --color-line-strong: #7f97b0;
  --color-ink: #ffffff;
  --color-ink-2: rgb(255 255 255 / 0.75);
  --color-ink-3: rgb(255 255 255 / 0.75);
  --color-accent: #35bdda;
  --color-accent-strong: #7fd6e9;
  --color-on-accent: #0b2740;
  --color-focus: #ffd166;
  --color-disabled-bg: #1f4567;
  --color-disabled-ink: #a3b2c3;
  --color-kit-edge: rgb(255 255 255 / 0.6);
  --color-kit-edge-strong: rgb(255 255 255 / 0.6);
  --color-canvas: #eef2f6;
  --color-gold-ink: #7a5000;
  --color-good: #167a3a;
  --color-good-bg: #e6f4ea;
  --color-warn: #8f4e00;
  --color-warn-bg: #fff3d6;
  --color-bad: #b42318;
  --color-bad-bg: #fdeceb;
  --color-on-bad: #ffffff;
  --color-info-bg: #e3f2f7;
  --color-own: #a87300;
  --color-own-tint: #fdf4dc;
  --color-arrival-cooked: #b42318;
  --color-arrival-loaded: #b45309;
  --color-arrival-fine: #566579;
  --color-arrival-spoton: #167a3a;
  --color-arrival-rusty: #1d5fa8;
  --color-on-arrival: #ffffff;
  color: var(--color-ink);
}

body {
  background-color: var(--color-canvas);
  color: var(--color-ink);
}
```

### 3.10 Las dos decisiones de gusto

Las dos están decididas por el dueño (D-00a), que miró `opciones/index.html` el 21 de octubre de 2026: **DD-01, la paleta**, la A de §3.1, y **DD-02, la letra**, la del sistema de §3.4. Las alternativas que vio y descartó (para la paleta, B, «manager clásico», C, «noche y oro», y D, la de la retransmisión; para la letra, Inter variable, de 47,1 a 48,3 KB el latín, y Barlow Semi Condensed 600 en títulos y cifras, 22.984 bytes) quedan en esa página con sus medidas, y §19 las recoge como decididas. El modo oscuro (DD-05) lo decidió también el dueño, el 22 de octubre: opcional y claro por defecto (D-00i, §3.3).

---

**Injertos aplicados.** I-10 (§3.3: el ámbito oscuro, con lo que redefine medido). I-21 (§3.5: la variante `fine` y sus cuatro medidas; el uso en las tablas, §6.6). I-23 (§3.8: el material generable como regla, con el generador de iconos). I-31 (§3.9: `colorMath.ts` fuera del barril, con sus funciones y su test).

**Objeciones resueltas.** O-31 (§3.2: el mecanismo de «ningún estado solo en color» es el tono con su icono y su texto obligatorios en el tipo, y el signo del dinero; el tipo, en §4.7).

**Huecos rellenados.** H-18 (§3.2: el ΔE00 entre los tonos de estado en las cuatro visiones y en grises, medido; se informa y no es umbral).

**Contradicciones de hecho.** X-20 (§3.2: los contrastes y el ΔE00 de los tramos, los de uso C5).

**Decisiones de esta sección.**

- **3-a**, el rótulo en versales: `tracking-caps` (`--tracking-caps: 0.04em`) en lugar de `tracking-wide` (0,025 em, que se cierra) o de un valor arbitrario; da los +0,04 em de D-05 con un token. Descartado: un octavo tamaño `caption-caps`, que duplicaría el `caption`.
- **3-b**, `accent-strong` en el ámbito oscuro: `#7fd6e9`. D-04 no lo redefine, y sin él el primario encima o pulsado dentro del ámbito pintaría `#085a71` bajo el texto `#0b2740` del ámbito (1,6:1, \*). Se aclara en lugar de oscurecerse porque el texto del primario es oscuro; queda a 8,1 de ΔE00 de `accent` y el texto encima sube a 9,21.
- **3-c**, `disabled-bg` y `disabled-ink` en el ámbito oscuro: `#1f4567` y `#a3b2c3`. Los del tema claro dejarían un bloque casi blanco, más llamativo que el primario, en `PlayerControls`; estos se leen como apagados (fondo a 1,53 de `surface`) y el texto queda a 4,61, por encima de lo que WCAG exige a un deshabilitado.
- **3-d**, los emoji y glifos sin icono pasan a palabra o se van (`Winner`; nada en `Housing` ni en `Team pays rent`; `Rain`, `Showers`, `Dry`; nada en `HowToPlay`; `OK` y `Failed` en `Chip`; `star-full` y `star-empty` en `Target this race`; `Look for the warning below.`) en el PR de la cola larga de su página (§17): con un icono más por cada uno, el juego crecería por usos sueltos. Los siete últimos los encontró el refutador de código en un barrido de `apps/web/src` (Rcodigo-005), y fallarían `ui/10` tras el paso 22 sin una regla escrita.
- **3-e**, los 26 iconos son propios, escritos como fuentes SVG por el agente del paso 9 con las reglas de §3.7 y validados por `ui-icons.mjs`, con las siluetas fijas de los cuatro de tono. Son 26 y no los 24 de D-07 porque los mandos de E2 pintan `▶︎` y `❚❚` como texto (`PlayerControls.tsx` l. 34 y 123) y ninguno de los 24 era `play` ni `pause` (Rcodigo-004; D-07 se corrige con esta evidencia). Descartado: copiar un juego de terceros, que D-07 no contempla («propios») y que traería una dependencia y su licencia.
- **3-f**, los seis `brand-*` siguen como heredados hasta el paso 22, para que lo de hoy resuelva (D-14) mientras las páginas migran.
- **3-g**, una fila de tabla con maillot no baja de 44 px ni con ratón: D-00b (el maillot a 28) manda sobre la fila de 36 de D-06, que queda para las tablas sin maillot. Escribe D-00a (la paleta y la letra, decididas por el dueño) como hecho en §3.1, §3.4 y §3.10.
- **3-h**, el modo se pinta antes de la primera pintura con `apps/web/public/theme.js`, un fichero de una línea que `index.html` carga en `<head>`, y no con un guion en línea, porque la CSP de hoy solo deja `script-src 'self'` (`app.ts` l. 180) y abrirla con una huella pediría mantenerla al día. Cuesta una petición pequeña en paralelo con la hoja de estilos. Descartado: que `spaShell.ts` inyecte el `data-theme` de la cuenta en el HTML, que ata cada carga de página a leer la sesión en el servidor y no sirve sin sesión.
- **3-i**, los valores del modo oscuro: los del ámbito oscuro donde los hay (la paleta C de telefono, ya medida), y para el resto, colores aclarados del mismo tono que pasan las 57 parejas (†). Dos tokens nuevos, `on-bad` y `on-arrival`, porque en el oscuro el rojo y los tramos se aclaran y el texto encima pasa a oscuro, como ya hacía `on-accent`; en el claro valen `#ffffff` y nada cambia a la vista.
- **3-j**, el ámbito oscuro declara, con su valor claro, cada token que el modo oscuro redefine y él no, para que `Watch`, la cabecera y la barra salgan iguales en los dos modos, como pide D-00i (sin eso, el `bg-bad` de `CueCard` tomaría el rojo claro del modo oscuro bajo su texto blanco).
- **3-k**, el tramo `Undertrained` (D-00n) conserva el token `arrival-rusty`: el nombre es del código (`oxidado`), que el dueño no cambia, y renombrarlo tocaría §10, §15 y el glosario sin cambiar nada a la vista.
- **3-l**, corregida en la pasada de coherencia (C-L3-12): `tokens.json` tiene un solo sitio, el de §12.3 y 12-b, `packages/shared/tokens.json`, en la raíz del paquete y exportado por su `package.json` como `@cyclingstar/shared/tokens.json`, con su huella en un campo `sha256`, y lo comprueba `generados.test.ts` como el resto de lo generado (D-08). La v1 lo ponía en `apps/web/tokens.json` y descartaba `packages/shared` porque su `dist/` lo compila `tsc` y no copiaría un JSON; pero la entrada de `exports` apunta al fichero de la raíz y no a `dist/`, así que `tsc` no tiene que copiar nada, y la app, que será otro consumidor, importa de un paquete y no de `apps/web`. Escribe además como hechos D-00i (el modo oscuro, §3.3 y §3.9), D-00n (`Undertrained`, §3.1 y §3.2) y D-00p (lo que se va con la web instalable, §3.7 y §3.8, y `tokens.json`, §3.9).

**Propuesto para el glosario.**

- `tracking-caps` (`--tracking-caps`): el interletraje de +0,04 em del rótulo en versales; `apps/web/src/index.css`.
- `apps/web/scripts/ui-icons.mjs` y `apps/web/scripts/icons/<nombre>.svg`: el generador de `icons.tsx` y sus 26 fuentes, con huella, la comprobación de las siluetas de tono y la hoja de contactos (D-08); `play` y `pause` en `IconName` y en la fila de los iconos de §G.3.
- En el ámbito oscuro, tres valores más para la tabla de §G.2: `accent-strong` `#7fd6e9`, `disabled-bg` `#1f4567` y `disabled-ink` `#a3b2c3`; y los medidos que pedía: `line` `#2c5274` y `line-strong` `#7f97b0`.
- El modo oscuro (D-00i): `data-theme` (`dark` en `<html>`), los valores de la tabla de §3.3 para §G.2, los tokens `on-bad` y `on-arrival`, `Theme` (`'light' | 'dark'`), `users.theme` (y su `pgEnum` `theme`), `GET /api/me/theme` y `PUT /api/me/theme` con `themeBodySchema`, `THEME_STORAGE_KEY` (`'cs-theme'`), `useTheme()` (`apps/web/src/theme.ts`), `apps/web/public/theme.js` y los textos (pantalla) `Appearance`, `Light` y `Dark`. «El ámbito oscuro» de §G.1 deja de decir «no es un modo oscuro».
- `packages/shared/tokens.json` (exportado como `@cyclingstar/shared/tokens.json`) y `apps/web/scripts/tokens-json.mjs`: los tokens para la app del dueño, generados del `index.css` (D-00p; su sitio, el de §12.3, por C-L3-12).
- `Undertrained`, el texto del tramo `oxidado` (D-00n), en lugar de `Rusty`.

**Dudas para el ensamblador.**

- Ninguna abierta. La del fondo `ink-2` de `CueCard` dentro del ámbito oscuro la cerró §14 (14-a: la clase 1 del rótulo pasa a `navy`).

## 2. Principios

Diez reglas, cada una con lo que la viola hoy (§1) y la pieza que la cumple. Son de la base, `telefono` (§2), con lo que sumaron las otras tres: el tema que se hace cumplir de `sistema` (§2, principios 1 a 5), la forma reservada de `identidad` (§2, principios 1 a 3) y la escala de cada número de `lectura` (§2, principio 4). Una regla que no tenga su número en una prueba no es un principio de este documento (2.10).

| Principio                                                                                    | Lo que lo viola hoy                                                                                      | La pieza que lo cumple                                                                                                                        |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 360 × 800 es la referencia y 320 × 640 el rescate                                        | el reloj del mundo solo sale desde 768 px (`Header.tsx` l. 122, `hidden md:block`; §1.2)                 | `PHONE_REF` y `PHONE_MIN` (§7); la clase sin prefijo es la del teléfono y `sm:` y `lg:` añaden (§3.5, §6)                                     |
| 2.2 La respuesta en la primera pantalla                                                      | el plan contesta a 1.060 px y `Watch` empieza a 328 (§1.2, §1.3)                                         | `data-answer` en los primeros 520 px (`ANSWER_MAX_TOP_PX`), comprobación 7 (§7.1) y su elemento en cada pantalla (§7.3)                       |
| 2.3 La acción bajo el pulgar                                                                 | `Save day edits` (pantalla) cierra una página de 6.807 px (§1.3)                                         | `ActionBar` (§4.3) en el 40 % de abajo (`THUMB_ZONE`), con su consecuencia; comprobación 8                                                    |
| 2.4 Una fila, dos renglones, una acción                                                      | el calendario del equipo pierde `Add` y `Drop`; la plantilla corta nombres (§1.4)                        | `RankTable`, `ActionRow` y `TripRow` (§4.5) y la tabla de las tablas (§6.1)                                                                   |
| 2.5 Nada por debajo de 12 px de letra, 44 px de dedo, 16 px en un campo ni 4,5:1 en un texto | unos 4 px en `Watch`, objetivos de 13 a 20 px, 34 de 42 campos a 14 px, 2.816 nodos de axe (§1.5)        | `MIN_FONT_PX`, `MIN_TARGET_PX`, `MIN_FIELD_FONT_PX` y `MIN_INLINE_TARGET_PX` (§3.5); los tokens con su contraste (§3.1); comprobaciones 3 a 6 |
| 2.6 La red mala es el caso normal                                                            | la barrera, el `Loading…` sin fin y el `Log in` sin red (§1.7)                                           | `QueryView` y sus estados (§4.2), `OfflineBanner` (§4.7) y la sesión desconocida (§12.1)                                                      |
| 2.7 Cada identidad, su forma, reservada y medida a 28 px                                     | gemelos en 303 de 310 carreras; líderes con colores de equipo; el campeón solo en `Watch` (§1.8)         | `Kit` y su vocabulario (§8), `LeaderJersey` y `ChampionJersey` (§9), `KIT_MIN_PX` = 28, `KIT_MIN_DISTANCE` = 10; comprobación 10              |
| 2.8 Lo que no está en el tema no existe, y la deuda solo baja                                | seis tokens en el tema y el 95 % del color fuera de él; 146 botones con 92 aspectos (§1.6)               | el `@theme` (§3), el tema cerrado del paso 22, `vocabulario.test.ts` con `deuda.json`, `ui/1` a `ui/10` y `/_ui` (§5)                         |
| 2.9 Lo que la pantalla no enseña no viaja, y un número lleva su escala                       | atributos con decimales y `tsb` en la API; `1300 TSS over four weeks` y `Freshness 16 / 100` (§1.10)     | la regla de la frontera (§13); `StarRating`, `Scale5` y `Meter` (§4.6, §4.8)                                                                  |
| 2.10 Medido o no está hecho                                                                  | ninguna prueba mira hoy el teléfono, el contraste ni el maillot (mapa 01 §9: ni axe ni regresión visual) | `telefono.spec.ts` y su trinquete (§7), `tokens.test.ts` (§3), `kit.test.ts` y `champion.test.ts` (§16)                                       |

### 2.1 360 × 800 es la referencia y 320 × 640 el rescate

Todo token, componente y pantalla se especifica primero a 360 × 800 px y se comprueba a 320 × 640, el ancho de WCAG 1.4.10; el escritorio es una ampliación declarada con `sm:` (640) y `lg:` (1.024) y nunca la base (D-01). Consecuencia: un valor que solo existe bajo `sm:` o `lg:` es una ampliación; si falta a 360, falta.

### 2.2 La respuesta en la primera pantalla

Cada pantalla marca con `data-answer` el elemento que contesta lo que se vino a mirar, y su borde superior queda a 520 px o menos a 360 × 800. Consecuencia: lo que no es la respuesta va debajo o plegado en un `Disclosure`, y una pantalla sin `data-answer` falla la comprobación 7.

### 2.3 La acción bajo el pulgar

La acción principal de una pantalla que edita vive en la `ActionBar`, en el 40 % de abajo y a la vista en todo el desplazamiento, con su consecuencia escrita (`2 changes · Race Var: Fine (was Loaded)`, pantalla). Consecuencia: una pantalla que edita tiene un solo `data-primary-action`, y ningún `Save` suelto al final de la página.

### 2.4 Una fila, dos renglones, una acción

Quién o qué en el primer renglón, lo demás en el segundo y un botón de 44 px. Consecuencia: ninguna tabla se desplaza de lado ni recorta, y el nombre de un corredor no se corta nunca: la fila crece.

### 2.5 Nada por debajo de 12 px de letra, 44 px de dedo, 16 px en un campo ni 4,5:1 en un texto

Los cuatro mínimos son constantes de `apps/web/src/components/ui/constants.ts` que importan la prueba y los tests, y no se copian (D-02). Consecuencia: el SVG también cuenta (las cotas del perfil, que hoy se pintan a unos 4 y 5 px, pasan a 12, en HTML sobre el dibujo, §14.4), un borde de campo o de control pide 3:1 (WCAG 1.4.11), y los contrastes valen en los dos modos, el claro y el oscuro que el jugador puede activar (D-00i, §3.3).

### 2.6 La red mala es el caso normal

Toda consulta pinta esqueleto, error con reintento, vacío y sin red; sin red no es un error ni un cierre de sesión. Consecuencia: ninguna página escribe `isPending &&`, y perder la red con sesión no lleva a `/login`. Recargar sin red sigue dando la página de error del navegador: sin service worker no hay cáscara guardada, y la web instalable la retiró el dueño (D-00p).

### 2.7 Cada identidad, su forma, reservada y medida a 28 px

Equipación, líder y campeón se leen en las cuatro visiones a su tamaño mínimo, 28 px, el que fijó el dueño: ningún maillot se pinta más pequeño, en ninguna pantalla (D-00b, que sustituye a los 13 px de D-21). Lo que es solo de un líder o de un campeón está reservado: el cuerpo amarillo, los lunares, la estrella del mundial y del continental y el cuerpo blanco no los lleva ningún maillot de equipo (D-00d, D-00e); la forma de los líderes de la general y de los puntos, que comparten figura con los equipos (`plain` y `band`), se reserva por distancia en las cinco vistas, grises incluidos (§8.1, 8-q); y el nacional, que viste su bandera sin estrella, se protege también por distancia: ningún maillot de equipo queda a menos de 10 de una bandera de campeón (D-00h, D-00m). Consecuencia: toda afirmación de que dos maillots se distinguen lleva su ΔE00 en las cuatro visiones a 28 px, y la comprobación 10 de la prueba falla con un maillot más pequeño.

### 2.8 Lo que no está en el tema no existe, y la deuda solo baja

Un valor de la interfaz es un token del `@theme` o no es; lo de hoy sigue resolviendo hasta el paso 22, contado como deuda fichero a fichero. Consecuencia: un PR no puede subir la deuda de un fichero, y un token nuevo entra con su pareja en `tokens.test.ts` (§5.5).

### 2.9 Lo que la pantalla no enseña no viaja, y un número lleva su escala

Un número que se enseña va con su escala (estrellas de cinco, un tramo de cinco, una palabra, una barra con sus extremos), y la API manda esa resolución y no el número interno (D-53). Consecuencia: fuera `1300 TSS`, `105 TSS`, `16 / 100` y `Morale 60%` de la pantalla, y sus números de la respuesta.

### 2.10 Medido o no está hecho

Cada principio tiene su número en una prueba: 2.1 a 2.5, en las diez comprobaciones de §7.1; 2.6, en `sinred.spec.ts`; 2.7, en la comprobación 10, `kit.test.ts`, `kits.test.ts` y `champion.test.ts`; 2.8, en `vocabulario.test.ts` y `tokens.test.ts`; 2.9, en `frontera.test.ts`. Consecuencia: E3 está terminado cuando `telefono-baseline.json` está a cero (D-18). El medidor que revisaría la app nativa lo retiró el dueño con la web instalable (D-00p).

---

**Injertos aplicados.** Ninguno (§B no asigna ninguno a §2).

**Objeciones resueltas.** Ninguna.

**Huecos rellenados.** Ninguno.

**Decisiones de esta sección.** Ninguna. Escribe como hechos D-01 (2.1); D-00b, que cambia el tamaño de 2.7 de 13 a 28 px; D-00i, los dos modos de 2.5; y D-00p, que quita el service worker de 2.6 y el medidor de la app nativa de 2.10.

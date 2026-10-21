## 5. El sistema que se hace cumplir

Una guía de estilo no impide nada: el `@theme` ya existe (`index.css` l. 5-12) y el 95 % del color de la web pasa por fuera de él (mapa 01 §2.2). Lo que impide reinventar (O-06) son tres piezas de `sistema` (I-01, D-14): el tema cerrado en el último paso, una deuda medida fichero a fichero que solo baja, y diez reglas de lint; y una cuarta, `/_ui` (I-03). Hasta el paso 22 todo lo de hoy sigue resolviendo y cada PR deja el juego desplegable.

### 5.1 El tema cerrado

El cierre son estas 17 líneas, las primeras del `@theme` de §3.11, que hasta el paso 22 van comentadas:

```css
--color-*: initial;
--font-*: initial;
--font-weight-*: initial;
--text-*: initial;
--tracking-*: initial;
--leading-*: initial;
--radius-*: initial;
--shadow-*: initial;
--inset-shadow-*: initial;
--drop-shadow-*: initial;
--text-shadow-*: initial;
--blur-*: initial;
--perspective-*: initial;
--aspect-*: initial;
--animate-*: initial;
--breakpoint-*: initial;
--container-*: initial;
```

Con ellas activas, Tailwind 4.3.3 deja de generar todo valor de su tema por defecto que el bloque no vuelva a declarar (X-11, comprobado por el juez de código con `__unstable__loadDesignSystem`, C4): no resuelven `bg-indigo-600`, `text-white` (salvo que el tema declare `white`, como hace el de §3), `max-w-6xl`, `rounded-2xl` ni `shadow-sm`; sí siguen resolviendo los valores arbitrarios (`text-[11px]`) y los pasos libres de espaciado (`p-5`), que por eso cuenta aparte `vocabulario.test.ts` (§5.2).

**Lo que deja de resolver**, medido con el compilador de Tailwind 4.3.3 sobre las 146 fuentes de producción de `apps/web/src`: con los tokens de `sistema` (`propuesta-sistema/tw/cerrado.css`), 2.457 de 6.322 apariciones, el 38,9 %, en 176 clases (sistema §0). Con los de este documento, medido por el redactor de esta sección con el mismo script (`<scratchpad>/redactor-L1/cierre-sistema.mjs` sobre el `@theme` de §3.11 con el cierre activo), **2.740 de 6.322, el 43,3 %, en 183 clases**: color 1.451, tamaño de letra 683, peso y familia 255 (`font-medium` 243 y `font-mono` 12), radio 205, interletraje e interlineado 72, sombra 43, ancho máximo 24, cortes 4 y otras 3. La diferencia sale de que este tema no conserva `font-medium`, `rounded-md`, `rounded-lg` ni los `brand-*`, que `sistema` sí, y declara `white`, que `sistema` no. `deuda.json` nace con la segunda cifra. Los 6.322 son del escáner de Tailwind, que ve también los `.ts`; el mapa 01 contó 6.244 en el árbol de sintaxis (X-22, las dos ciertas): manda el escáner, porque es el del compilador que decide qué resuelve. Los ficheros con más deuda: `pages/Race.tsx` 187 de 408, `pages/MyRaces.tsx` 132 de 312, `pages/TeamCalendar.tsx` 110 de 256, `pages/AdminNames.tsx` 104 de 213 y `pages/RacesIndex.tsx` 100 de 252 (medido, la misma pasada).

**Los arbitrarios que se quedan**, cada uno con su motivo, en `ARBITRARY_ALLOWED` de `vocabulario.test.ts` (decisión 5-a): `pt-[env(safe-area-inset-top)]` y `pb-[env(safe-area-inset-bottom)]` (el área segura, que ningún token puede expresar); `pb-[var(--fixed-bottom)]` (la suma de lo fijo, §4.9); `@max-[21.25rem]:` (el plan B de los rótulos de `BottomNav` y el nombre de `AppHeader`, §6.3); y la máscara del desvanecido de `Tabs`, `[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]`. Ningún otro.

**Por qué al final y no al principio**: cerrar primero rompería a la vez 2.740 apariciones en 146 ficheros; cerrar al final convierte cada página en un PR que se puede desplegar. El PR del paso 22 hace cuatro cosas: activa las 17 líneas, borra los seis `brand-*` heredados (decisión 3-f), borra `deuda.json` y vacía la lista de heredados del lint, que pasa entero a `error` (§5.3). Desde ahí, `vocabulario.test.ts` exige cero.

### 5.2 `vocabulario.test.ts` y `deuda.json`

`apps/web/src/components/ui/vocabulario.test.ts` carga dos sistemas de diseño con `__unstable__loadDesignSystem` de `@tailwindcss/node`: el de `apps/web/src/index.css` tal como está y el cerrado (el mismo fichero con las 17 líneas activas, que el test inyecta hasta el paso 22). Saca las clases de cada fichero de producción de `apps/web/src` (sin tests ni `__fixtures__`) con el `Scanner` de `@tailwindcss/oxide`, el mismo que usa el plugin de Vite, y cuenta por fichero cuatro cosas:

1. `tema`: las apariciones que resuelven con el tema abierto y no con el cerrado.
2. `arbitrarios`: las apariciones con `[` que no están en `ARBITRARY_ALLOWED`.
3. `espaciado`: las utilidades de relleno, margen y hueco (`p-*`, `m-*`, `gap-*`, `space-*`, con sus ejes y sus negativos) con un paso que no está en `SPACING_STEPS`; los tamaños (`w-*`, `h-*`, `min-h-*`) quedan libres. Hoy, 38 de 1.342 (sistema §3.3, medido: `p-5` 16, `pl-7` 6…).
4. `layout`: las clases de una prop `layout` que no son de margen, ancho, alto o colocación en la rejilla (decisión 4-a).

El test falla si una cifra de un fichero sube sobre la de `deuda.json`, si un fichero que no está en `deuda.json` tiene alguna, y también si una baja sin que el PR lo apunte: la bajada se escribe en el mismo PR que la consigue. **Dos sondas** lo hacen fallar si el instrumento deja de medir: `bg-surface` tiene que resolver con los dos sistemas, y `bg-indigo-600` no puede resolver con el cerrado. `__unstable__loadDesignSystem` es una API inestable (sistema §14), así que `tailwindcss`, `@tailwindcss/vite`, `@tailwindcss/node` y `@tailwindcss/oxide` van a la versión exacta `4.3.3` en `apps/web/package.json` (hoy `^4.3.3`, l. 26 y 30; los dos últimos ya están en el almacén de pnpm, que usa el plugin).

```ts
// apps/web/src/components/ui/deuda.json, con este tipo (en vocabulario.test.ts)
interface Cuenta {
  readonly tema: number
  readonly arbitrarios: number
  readonly espaciado: number
  readonly layout: number
}
interface Deuda {
  readonly tailwindcss: '4.3.3'
  readonly total: Cuenta
  readonly ficheros: Readonly<Record<string, Cuenta>> // ruta desde la raíz; sin deuda, no aparece
}
```

El paso 8 lo escribe entero; sus `tema` son los de §5.1 (por ejemplo, `"apps/web/src/pages/Race.tsx": { "tema": 187, … }`), y los otros tres contadores los mide ese paso. Cada PR de la cola larga (paso 21) baja las cifras de las páginas que migra, y una página que llega a cero sale del fichero.

### 5.3 Las diez reglas

Diez selectores de `no-restricted-syntax` en `apps/web/eslint-ui.mjs`, cada uno con un mensaje que empieza por su número, para que se cuenten por regla (sistema §2 y §12, `tw/eslint.ui.mjs`). Corren sobre `apps/web/src/**/*.{ts,tsx}` salvo los tests, `apps/web/src/components/ui/**` y los `*.generated.ts`; no solo sobre `pages/`, porque `components/` tiene los hexadecimales de v3 de `broadcast/` (mapa 01 §2.4).

| Regla   | Prohíbe                                                                                                   | Mensaje                                                                             | Avisos hoy |
| ------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------- |
| `ui/1`  | un `<button>`                                                                                             | `ui/1 button: use <Button> from components/ui`                                      | 111        |
| `ui/2`  | una `<table>`                                                                                             | `ui/2 table: use <RankTable> from components/ui`                                    | 15         |
| `ui/3`  | `<input>`, `<select>` o `<textarea>`                                                                      | `ui/3 field: use <Field> from components/ui`                                        | 42         |
| `ui/4`  | `title` en un elemento HTML                                                                               | `ui/4 title: nothing lives only in a title; use <InfoButton>`                       | 23         |
| `ui/5`  | los textos `Loading…`, `Could not load` y `Could not reach`                                               | `ui/5 hand-made state: use <QueryView>`                                             | 70         |
| `ui/6`  | una clase de color de la paleta de Tailwind (`text-`, `bg-`, `border-`… con `slate`, `indigo`… y su paso) | `ui/6 Tailwind palette colour: use a token`                                         | 1.058      |
| `ui/7`  | un valor arbitrario (`-[…]`)                                                                              | `ui/7 arbitrary value: use a token, or add it to ARBITRARY_ALLOWED with its reason` | 39         |
| `ui/8`  | un literal hexadecimal (`#rgb`, `#rrggbb`, `#rrggbbaa`)                                                   | `ui/8 hex colour: use a token`                                                      | 28         |
| `ui/9`  | el atributo `style`                                                                                       | `ui/9 inline style`                                                                 | 8          |
| `ui/10` | un emoji en un texto o un literal (`\u{1F300}` a `\u{1FAFF}` y `\u{2600}` a `\u{27BF}`)                   | `ui/10 emoji in the interface: use <Icon>`                                          | 23         |

Los avisos de hoy son los que midió `sistema` con el ESLint 9.39.5 del repositorio (`propuesta-sistema/tw/eslint.ui.json`): **1.417 en 83 ficheros**, sobre los `.tsx`; con los `.ts` (los hexadecimales de `visuals.ts`, por ejemplo) habrá alguno más, y el paso 8 escribe la cifra exacta. Los mensajes van en inglés, como los del lint de hoy. **De `warn` a `error`** (X-12): `eslint.config.js` importa `UI_RULES` y `UI_HEREDADOS` de `eslint-ui.mjs` en dos bloques, uno con `'no-restricted-syntax': ['error', ...UI_RULES]` para todos los ficheros y otro, detrás, con `'warn'` solo para los de `UI_HEREDADOS`: en la configuración plana el segundo bloque reemplaza al primero para esos ficheros (lo advierte `eslint.config.js` l. 184-186), y ningún bloque de hoy usa esa regla en `apps/web` (las dos que hay son del motor, l. 93 y 187). Un fichero nuevo nace en `error`; uno heredado avisa sin parar el CI, porque `pnpm lint` (`eslint .`, `package.json` l. 23; `ci.yml` l. 252) no lleva `--max-warnings`. `apps/web/src/components/ui/heredados.test.ts` falla si un fichero de la lista ya no tiene ningún aviso `ui/`, así que la lista solo encoge; el paso 22 la vacía. El lint ya corre sobre `.tsx` en el CI (`eslint.config.js` l. 228 y 255, juez de código C6): las reglas no piden otro trabajo, y `00-encargo.md` §6.7 («`.js` y `.mjs`») se queda corto.

### 5.4 `/_ui`

Una ruta de la web, sin enlace desde ningún sitio, con `<meta name="robots" content="noindex">`, en su propio trozo (`React.lazy`, como las demás páginas, `App.tsx` l. 32-80), que pinta cada componente de §4 en cada uno de sus estados con datos fijos y sin llamar a la API (D-10). Una sección por componente (`<section data-ui-demo="Button">`) con un ejemplo por estado, primero sobre `canvas` y después dentro de `[data-surface='dark']` los que viven allí. Los datos fijos (`apps/web/src/pages/ui/fixtures.ts`) son los casos difíciles medidos: el nombre de corredor más largo del mundo de prueba (28 caracteres, telefono §5.1), el título más largo, `U23 time trial champion of Saint Vincent and the Grenadines` (59 caracteres, D-56), una clasificación de 140 filas con la fila propia en el puesto 34, una consecuencia de `ActionBar` que no cabe a 320 px, y una consulta en cada uno de sus seis estados. Es la primera página de la prueba del teléfono (§7.4) y donde el dueño mira el sistema en su teléfono.

**Cómo se añade un componente**: el PR crea `ui/<Nombre>.tsx` y `ui/<Nombre>.test.tsx` (un caso por estado, mirando `data-state` y el ARIA), y su sección en `/_ui`; la prueba del teléfono sobre `/_ui` tiene que seguir a cero.

### 5.5 Cuando lleguen las once épicas que faltan

E4 a E13 traen pantallas nuevas. Entran por dos puertas:

- **Un componente nuevo** solo entra con el PR de §5.4 (componente, test por estado y sección en `/_ui`) y con su fila en §4 de este documento; una página no puede inventar aspecto, porque las reglas de §5.3 la paran y, tras el paso 22, el tema no genera lo que no declara. Si necesita un estado que no está, lo añade a `UiState` (`ui/types.ts`) y a su test.
- **Un token nuevo** entra en el `@theme` con su pareja en `tokens.test.ts` (su contraste contra cada fondo en que se use, y en los dos ámbitos si vive en los dos) y con su fila en la tabla de §3.1 en el mismo PR. Sin la pareja, `tokens.test.ts` falla, porque comprueba que cada `--color-*` del bloque tiene al menos una.

---

**Injertos aplicados.** I-01 (§5.1 a §5.3: el tema cerrado al final, `vocabulario.test.ts` con `deuda.json` y las diez reglas con su lista de heredados). I-03 (§5.4: `/_ui`; los `data-*` y los re-sellos, §4.1).

**Objeciones resueltas.** O-06 (§5.1 a §5.3: con el tema abierto nada impedía reinventar; ahora lo impiden el cierre, la deuda que solo baja y las reglas sobre `apps/web/src/**`, no solo sobre `pages/`).

**Huecos rellenados.** Ninguno (§B no asigna ninguno a §5).

**Contradicciones de hecho.** X-11 (§5.1: el cierre con `initial`, cierto: los arbitrarios siguen resolviendo). X-12 (§5.3: el lint ya corre sobre `.tsx`). X-22 (§5.1: los 6.322 del escáner frente a los 6.244 del mapa 01; manda el escáner).

**Decisiones de esta sección.**

- **5-a**, la lista de arbitrarios permitidos son cinco, los de §5.1, porque expresan lo que un token no puede (el área segura, una variable que escribe el marco, una consulta de contenedor y una máscara); cualquier otro es deuda.
- **5-b**, la deuda inicial es la del tema de este documento (2.740), no la de `sistema` (2.457), porque es la que el cierre del paso 22 va a exigir.
- **5-c**, la lista de heredados encoge con un test (`heredados.test.ts`) y no a mano, para que no quede un fichero limpio en `warn`.
- **5-d**, `espaciado` cuenta relleno, margen y hueco, no tamaños: `min-h-11` (44) o `min-h-15` (60) son medidas de §3.5 y no pasos de espaciado.
- **5-e**, los mensajes de las reglas van en inglés, como los de ESLint y los del lint de hoy; los de `sistema` estaban en castellano.

**Propuesto para el glosario.**

- `ARBITRARY_ALLOWED`: los cinco valores arbitrarios permitidos, con su motivo; `apps/web/src/components/ui/vocabulario.test.ts`.
- `UI_RULES` y `UI_HEREDADOS`: los diez selectores y la lista de ficheros heredados; `apps/web/eslint-ui.mjs`.
- `apps/web/src/components/ui/heredados.test.ts`: falla si un fichero de `UI_HEREDADOS` ya no tiene avisos.
- `UiState`: la unión de los valores de `data-state` (§G.4, con `veiled`); `apps/web/src/components/ui/types.ts`.
- `apps/web/src/pages/ui/fixtures.ts`: los datos fijos de `/_ui`.

**Dudas para el ensamblador.**

- `vitest.config.ts` l. 7 solo incluye `{apps,packages}/*/src/**/*.test.{ts,tsx}`: `apps/web/sw/decide.test.ts` y `apps/web/scripts/peso.test.mjs` (§G.10) no correrían con `pnpm test`. §12 y §16 tienen que moverlos bajo `src/` o ampliar el `include` (con el `.mjs` en él); los de esta sección ya están bajo `apps/web/src/`.
- §A, punto 3, y D-14 dan 2.457 apariciones de deuda: es la cifra de `sistema` con sus tokens. Con los de §3 son 2.740 (§5.1, medido); el resumen de §0 debería llevar la segunda.

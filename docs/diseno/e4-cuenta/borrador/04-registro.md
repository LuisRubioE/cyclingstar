## 4. El registro y la edad

El dueño fijó la edad mínima en 16, declarada con la fecha de nacimiento, y que las cuentas que ya existen la den al entrar («Ok», `00-encargo.md` l. 309 a 310; D-00a). Sigue en pie el aviso de `docs/agenda.md` §3.7: **confirmarlo con un abogado antes de abrir el registro**. Esta sección dice cómo se pide, dónde se valida, qué se guarda, qué ve quien no llega y qué pasa con las cuentas de hoy.

### 4.1 El formulario (pantalla, 360 px)

```
Create your account
Start building your rider.

Email
[ you@example.com                       ]
Password
[ ••••••••••••                   [Show] ]
At least 8 characters.
Date of birth
[ Day ] [ Month ] [  Year  ]
We only use it to check you're old enough to play.

[            Create account             ]
By creating an account you agree to the Terms and the Privacy notice.
Already have an account? Log in
```

- **La fecha** es `DateField` (§12.5): tres campos numéricos de 64, 64 y 96 px en una fila, `inputmode="numeric"` y `autocomplete` `bday-day`, `bday-month` y `bday-year` (D-04). Un `<input type="date">` en Android abre el mes en curso y llegar a 2008 cuesta unos cinco toques (estimado, sin aparato); con tres campos, el navegador que tenga la fecha la rellena de un toque y si no son ocho cifras.
- **La puerta neutra**: ni la etiqueta ni la ayuda nombran la edad mínima, para no invitar a teclear otra fecha. La ayuda es `We only use it to check you're old enough to play.` (pantalla).
- **`Show`** es la prop `reveal` de `Field` (§12.5): un `Button` `quiet` de 44 × 44 que alterna `Show` y `Hide`.
- **Las condiciones** van en una línea bajo el botón, con `TextLink` a `/terms` y a `/privacy`, sin casilla (DD-13 A, §4.6).
- La web manda `name: ''` porque `sign-up/email` lo exige (`name: z.string()`, `better-auth` 1.7.26, `api/routes/sign-up.mjs` l. 16) y el servidor lo pone a `'Player'` (§4.7). Hoy manda la parte local del correo.

### 4.2 La validación en el servidor

La regla vive en `packages/shared/src/account/birthDate.ts`, compartida por la web (para el error en la página) y por la API (para la verdad). En la API corre como `user.additionalFields.birthDate` con `validator.input: birthDateSchema` (D-06; I-09): `better-auth` 1.7.26 valida los campos adicionales en `parseUserInput` (`sign-up.mjs` l. 157) antes de buscar el correo (l. 192), así que el menor recibe el mismo 400 con un correo nuevo y con uno que ya tiene cuenta (X-09, reproducido por el juez de seguridad). El error sale como 400 `VALIDATION_ERROR` con el `message` de la primera incidencia de Zod (`ba17/db/schema.mjs` l. 81 a 85, leído); por eso los mensajes de la regla son los códigos. El validador tiene que ser síncrono: uno asíncrono da 500 `ASYNC_VALIDATION_NOT_SUPPORTED` (l. 82).

```ts
// packages/shared/src/account/birthDate.ts
import { z } from 'zod'
import { MIN_AGE_YEARS, MIN_BIRTH_YEAR } from './constants.js'

export interface YearMonthDay {
  year: number
  month: number // 1 a 12
  day: number
}

export type BirthDateError = 'INVALID_BIRTH_DATE' | 'UNDER_MINIMUM_AGE'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` a sus tres números, o null si la fecha no existe (31 de abril, 29 de febrero de 2023). */
export function parseIsoDate(value: string): YearMonthDay | null {
  const m = ISO_DATE.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const d = new Date(Date.UTC(year, month - 1, day))
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null
  }
  return { year, month, day }
}

/** Años cumplidos el día UTC de `today`. Quien nació un 29 de febrero cumple el 1 de marzo en año no bisiesto. */
export function ageOn(birth: YearMonthDay, today: Date): number {
  const month = today.getUTCMonth() + 1
  const day = today.getUTCDate()
  const before = month < birth.month || (month === birth.month && day < birth.day)
  return today.getUTCFullYear() - birth.year - (before ? 1 : 0)
}

export function isOldEnough(birth: YearMonthDay, today: Date): boolean {
  return ageOn(birth, today) >= MIN_AGE_YEARS
}

/** La regla entera con un reloj inyectable, para los tests. */
export function makeBirthDateSchema(now: () => Date = () => new Date()) {
  return z.string().superRefine((value, ctx) => {
    const today = now()
    const birth = parseIsoDate(value)
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    if (
      birth === null ||
      birth.year < MIN_BIRTH_YEAR ||
      Date.UTC(birth.year, birth.month - 1, birth.day) > todayUtc
    ) {
      ctx.addIssue({ code: 'custom', message: 'INVALID_BIRTH_DATE' satisfies BirthDateError })
      return
    }
    if (!isOldEnough(birth, today)) {
      ctx.addIssue({ code: 'custom', message: 'UNDER_MINIMUM_AGE' satisfies BirthDateError })
    }
  })
}

export const birthDateSchema = makeBirthDateSchema()
```

En `auth.ts`, dentro de `user`: `additionalFields: { birthDate: { type: 'string', required: true, input: true, returned: true, validator: { input: birthDateSchema } } }`. La clave de Drizzle de `users.birth_date` tiene que ser `birthDate`: con otra, 1.7 lanza `SchemaMismatchError` en la primera petición (`create-context.mjs` l. 231, medido por `incremental`). La columna es `date` con `mode: 'string'`, para que viaje como `YYYY-MM-DD` sin pasar por la zona horaria. `MIN_AGE_YEARS` es 16 y `MIN_BIRTH_YEAR` 1900 (`packages/shared/src/account/constants.ts`).

### 4.3 Qué se guarda y qué no

- **`users.birth_date`**, la fecha entera (DD-09 A, D-05): los 16 se cumplen un día concreto, y si la edad mínima baja algún día (la decisión reversible de `agenda.md` §3.7) no hay que volver a preguntar. Nadie la enseña; va en la exportación (§10.5).
- **`users.terms_version`** (`TERMS_VERSION`, `'2026-11-draft'`) y **`users.terms_accepted_at`**, escritas por `databaseHooks.user.create.before` (§4.6).
- **Del menor rechazado no se guarda nada**: el 400 sale antes de crear la fila, los logs de Fastify llevan la URL y no el cuerpo (`index.ts` l. 64), y el `logger` de `better-auth` queda en `warn` (D-30), así que tampoco escribe el correo.

### 4.4 Quien no tiene 16 (pantalla)

```
Sorry, you can't play yet
Cycling Star is for people aged 16 or over. We have not kept anything you typed.
[ Back to the home page ]
```

La web la enseña al recibir `UNDER_MINIMUM_AGE` (o al calcularlo ella misma antes de enviar, con la misma regla). Escribe `cs.ageGate` en `sessionStorage`: mientras la pestaña viva, `/register` enseña esta pantalla en lugar del formulario. Es `sessionStorage` y no `localStorage` para que un hermano mayor en el mismo navegador no herede la puerta (D-04; seguridad O-12). No impide mentir (A8, §2.3); impide el «pruebo otra fecha» inmediato. Si basta, a confirmar con un abogado.

### 4.5 Las cuentas que ya existen

Hoy hay una, la del dueño (`00-encargo.md` l. 309 a 310). Con `birth_date` nula:

- **La web**: `ProtectedRoute` (`apps/web/src/components/ProtectedRoute.tsx` l. 11) lleva a `/account/birth-date` antes de nada, salvo en `/privacy`, `/terms`, `/account/delete` y `Sign out` (D-09). La puerta de la fecha (pantalla): `One more thing` / `We now ask everyone for their date of birth. Cycling Star is for people aged 16 or over.` / `DateField` / `Save and continue`.
- **La API**: toda petición que no sea `GET` a `/api/riders/*` y a `/api/me/*` responde 403 `BIRTH_DATE_REQUIRED`, salvo `PUT /api/me/birth-date`, `POST /api/me/export`, `/api/me/devices/*` y las rutas de avisos (`/api/me/push-targets*`, `/api/me/notices*`) (codigo O-11). Un `preHandler` común a los dos grupos de rutas, con su lista de excepciones escrita junto a él.
- **`PUT /api/me/birth-date`** con `{ birthDate: string }`, validado con `birthDateSchema`: escribe una vez y responde `{ ok: true }`; si ya hay fecha, 409 `already_set` (no se corrige sin contacto, §11.1); con menos de 16, 400 `UNDER_MINIMUM_AGE` y no guarda nada.
- **El menor ya registrado** ve (pantalla): `Cycling Star is for people aged 16 or over, so this account can't stay open. You can delete it here.` y `Delete account`, que lleva a `/account/delete` (§10.4). Nada se bloquea ni se borra solo: qué hacer con la cuenta de un menor ya registrado, a confirmar con un abogado (§21.3).

### 4.6 Las condiciones y `/terms` (DD-13 A)

`/terms` no existe. Se crea `pages/Terms.tsx` con su enlace en el pie (`App.tsx` l. 393 a 418), junto a `Privacy`. Su texto, en borrador hasta que lo lea un abogado (pantalla):

```
Terms
These terms are a draft and will be reviewed before public launch.

Who can play
Cycling Star is for people aged 16 or over. One account per person.

A game
Riders, teams and races are fictional.

Your rider and your team
If you delete your account or stop playing, your rider and your team stay in the world, run by the game. Your team keeps the name you gave it. An administrator can change a team name that is offensive or breaks these terms.

Your account
An administrator can change the email of an account and can close an account that breaks these terms. Every change an administrator makes is recorded.

Emails
We only email you to confirm your address and to reset your password.
```

Al registrarse, `databaseHooks.user.create.before` escribe `terms_version = TERMS_VERSION` y `terms_accepted_at = now()`. Si basta la línea bajo el botón o hace falta casilla (DD-13 B), y el texto entero, a confirmar con un abogado.

### 4.7 `name`, `image` y `locale`

- **`name`**: `databaseHooks.user.create.before` lo pone a `'Player'` y la 0056 hace lo mismo con las filas de hoy (D-08; I-28). Es un dato personal que nadie lee (cobertura C7; el panel enseña corredor y equipo, `adminUsers.ts` l. 114 a 122).
- **`image`**: el gancho `before` de `/sign-up/email` responde 400 si el cuerpo trae `image`. `update-user`, la otra puerta, da 404 (§8.1).
- **`locale`**: el mismo gancho de creación escribe la etiqueta primaria de `Accept-Language` en dos letras minúsculas (`es-ES,es;q=0.9` da `es`) o `'en'` si no hay; el defecto de la columna pasa de `'es'` a `'en'` (D-07; H-12; O-05). El país ya lo guarda el corredor. Traducir es de E10.

### 4.8 Los errores (pantalla)

| Caso                                      | Dónde                                    | Código               | Texto (pantalla)                               |
| ----------------------------------------- | ---------------------------------------- | -------------------- | ---------------------------------------------- |
| Falta un trozo de la fecha                | página, foco al primer campo vacío       | ninguno              | `Enter your date of birth.`                    |
| Fecha imposible, futura o anterior a 1900 | página y servidor                        | `INVALID_BIRTH_DATE` | `Enter a real date of birth.`                  |
| Menos de 16 años cumplidos                | página y servidor                        | `UNDER_MINIMUM_AGE`  | la pantalla de §4.4                            |
| Contraseña de menos de 8                  | página y servidor                        | `PASSWORD_TOO_SHORT` | `Use at least 8 characters.`                   |
| Contraseña de más de 128                  | página (hoy solo el servidor) y servidor | `PASSWORD_TOO_LONG`  | `Your password can be at most 128 characters.` |
| Fecha ya guardada                         | servidor, `PUT /api/me/birth-date`       | 409 `already_set`    | `Your date of birth is already saved.`         |
| Límites, red y presupuesto                | servidor                                 | §12.3                | los de `authErrorText`                         |

---

**Injertos aplicados.** I-09 (§4.2), I-28 (§4.7).

**Objeciones resueltas.** O-05 (§4.7: `locale` de `Accept-Language`; `time_zone` y su frase en Privacy son de §13 y §10.1).

**Huecos rellenados.** H-12 (§4.7).

**Decisiones de esta sección.**

- **4-a**, `birthDateSchema` se construye con `makeBirthDateSchema(now)` para que los tests fijen el reloj; la API y la web usan `birthDateSchema`.
- **4-b**, la columna `birth_date` es `date` con `mode: 'string'` para que la fecha no cruce zonas horarias.
- **4-c**, la web manda `name: ''`, que `sign-up.mjs` l. 16 exige, y el gancho lo sustituye por `'Player'`.
- **4-d**, el texto de `/terms` dice que el equipo conserva el nombre y que un administrador puede cambiarlo y cambiar el correo de una cuenta, por DD-14 B y por `00-encargo.md` §9.3; y que solo se manda correo para confirmar y recuperar.
- **4-e**, el error de contraseña corta es `Use at least 8 characters.`, uno solo para la página y el servidor (hoy hay dos versiones, mapa 05 §3).

**Propuesto para el glosario.**

- `parseIsoDate`, `YearMonthDay`, `BirthDateError`, `makeBirthDateSchema` en `packages/shared/src/account/birthDate.ts`.
- `INVALID_BIRTH_DATE` y `UNDER_MINIMUM_AGE`: los `message` del 400 `VALIDATION_ERROR` del registro y los códigos de `PUT /api/me/birth-date`.
- Textos (pantalla): `Your date of birth is already saved.`; `Use at least 8 characters.`; `Your password can be at most 128 characters.`; `Cycling Star is for people aged 16 or over, so this account can't stay open. You can delete it here.`
- La fila de G.11 de `Terms` debería citar el texto de §4.6; la puerta de la fecha vive en `ProtectedRoute.tsx` l. 11, no en `App.tsx` l. 318 a 325 (en este árbol `Private` está en l. 149 a 151 y solo envuelve a `ProtectedRoute`).

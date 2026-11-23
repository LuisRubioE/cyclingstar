import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

/**
 * Cliente de better-auth para la web (Paso 9). Mismo origen que la SPA en Railway,
 * así que baseURL y basePath (/api/auth) se toman por defecto.
 *
 * `emailUndeliverableAt` (docs/cuenta.md §9.3; PR 7) es el campo de más que la sesión devuelve: el buzón
 * que rebotó, se quejó o está suprimido en Resend. Solo lo escribe el servidor.
 *
 * `birthDate` (§4.2; PR 9 de E4) es el campo de más que el registro manda; no vuelve en la sesión
 * (`returned: false`), así que la web pregunta `GET /api/me/account`.
 */
export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        emailUndeliverableAt: { type: 'date', required: false, input: false },
        birthDate: { type: 'string', required: true, input: true, returned: false },
      },
    }),
  ],
})

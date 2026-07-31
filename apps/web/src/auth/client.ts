import { createAuthClient } from 'better-auth/react'

/**
 * Cliente de better-auth para la web (Paso 9). Mismo origen que la SPA en Railway,
 * así que baseURL y basePath (/api/auth) se toman por defecto.
 */
export const authClient = createAuthClient()

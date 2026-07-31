import { defineConfig } from 'drizzle-kit'

/**
 * Configuración de drizzle-kit. `generate` (crear migraciones desde el esquema) no
 * necesita base de datos; `migrate`/`push` sí leen DATABASE_URL. En producción las
 * migraciones se aplican desde el arrancador (src/migrate.ts), no con la CLI.
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
})

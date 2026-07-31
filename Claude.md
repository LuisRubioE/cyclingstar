# CLAUDE.md - Convenciones de Cycling Star

## Documentos rectores
- SPEC.md es la fuente de verdad del diseño. MVP.md es el plan. Ante conflicto, SPEC.md manda y se corrige MVP.md.
- Cada sesión implementa UN paso de MVP.md. Lee el paso y sus secciones del SPEC antes de proponer un plan. No escribas código sin plan aprobado.

## Código
- La interfaz de usuario (apps/web, textos visibles) va en INGLÉS en el MVP. Traducciones/i18n son post-MVP. Los comentarios de código y las docs internas siguen en español.
- TypeScript estricto en todo. Prohibido `any`. Zod en todos los bordes de entrada.
- Monorepo pnpm: apps/api (Fastify), apps/web (React+Vite+Tailwind), packages/engine, packages/db (Drizzle), packages/shared.
- packages/engine es puro: jamás importa de db, jamás usa Date.now() ni Math.random(). Todo azar viene del RNG sembrado con subflujos nominales.
- Toda constante de juego vive en packages/engine/src/constants.ts con comentario de intención. Cambios de constantes se anotan en docs/balance.md.
- Todo cambio de comportamiento del motor incrementa engine_version.
- Migraciones solo con drizzle-kit; nunca SQL manual en producción.

## Tests
- vitest. En packages/engine: tests primero, incluidos los invariantes de SPEC 6.17 y la invariancia de resolucion.
- pnpm typecheck && pnpm test en verde antes de cerrar cualquier paso.

## Despliegue
- Railway: servicio web (API + estaticos) y servicio tick (cron 0 */6 * * *, el proceso termina).
- Las migraciones corren al arrancar el servicio, con advisory lock.

## Estilo de trabajo
- Commits pequeños con el numero de paso. Rama por fase.
- Modo autónomo por lotes (autorizado por el usuario, jul. 2026): implementar, verificar (typecheck/build/test/lint), PR, esperar CI verde y fusionar a main en cadena, sin pedir aprobación paso a paso. Pausar y avisar SOLO para lo que requiere al usuario: clics en Railway, cuentas/compras externas, verificación visual en producción, o decisiones de producto grandes. Las decisiones razonables no cubiertas por SPEC se toman y se documentan (en vez de esperar).

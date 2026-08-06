# Paso / cambio

<!-- Número de paso de MVP.md y una frase con lo que hace este PR. -->

## Qué cambia

<!-- Resumen funcional, no lista de ficheros. Si el diseño se aparta del SPEC, dilo aquí y por qué. -->

## Cómo se ha verificado

<!-- Marca lo que aplique. La CI comprueba todo esto, pero indica lo que hiciste en local. -->

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm lint` y `pnpm format`
- [ ] `pnpm sim` (solo si toca el motor o sus constantes)

## Comprobaciones del proyecto

- [ ] No introduce `any` ni bordes de entrada sin Zod.
- [ ] `packages/engine` sigue puro: sin `db`/`api`/`web`, sin módulos de Node, sin `Date.now()`,
      `new Date()` ni `Math.random()`.
- [ ] Si cambian constantes del motor: están en `packages/engine/src/constants.ts` con comentario
      de intención y anotadas en `docs/balance.md`.
- [ ] Si cambia el comportamiento del motor: `engine_version` incrementada.
- [ ] Si hay migraciones: generadas con drizzle-kit (nunca SQL manual) y aditivas.
- [ ] Si cambian variables de entorno: actualizados `.env.example`, `README.md` y `docs/ops.md`.

## Riesgo de despliegue

<!-- Migraciones destructivas, cambios en railway.json / railway.tick.json, variables nuevas que
     haya que dar de alta a mano en Railway, orden de despliegue web/tick… Si no hay, escribe
     "ninguno". -->

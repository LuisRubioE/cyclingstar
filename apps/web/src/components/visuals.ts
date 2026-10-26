/**
 * El aspecto de hoy de la equipación de un equipo (#5 maillots), a partir de su semilla.
 *
 * CONGELADO EN `packages/shared` (E3, docs/visual.md §8.6; PR 9b): el `jerseyStyle` que vivía aquí, con
 * sus 14 colores, sus cinco patrones y su caché por semilla, es `legacyJerseyStyle`, sin una cifra
 * cambiada (`legacyJersey.test.ts`, contra la tabla dorada que se sacó de aquí). Lo pintan `Jersey`
 * hasta el 17b y `LegacyJersey`, y lo leerá la traducción de `packages/db` (16b).
 */
export { legacyJerseyStyle as jerseyStyle } from '@cyclingstar/shared/legacyJersey'

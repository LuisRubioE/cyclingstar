/**
 * La retransmisión (E2, docs/retransmision.md §4.13): reexporta los ficheros de `broadcast/`. Cada PR
 * que añade uno lo añade aquí (§17.20). Los ficheros del lado del grabador (`timeline`, `codec`,
 * `reduce`, `reveal`) no pueden importar este índice, que trae `BROADCAST` y `SPOILER` (15-b).
 *
 * `wire.ts` usa al cargar esquemas de `contracts.ts`: este índice lo reexporta y el del paquete
 * reexporta este detrás de `contracts.js`, que es lo que hace que cargue (14-a).
 */
export * from './timeline.js'
export * from './reveal.js'
export * from './constants.js'
export * from './cues.js'
export * from './codec.js'
export * from './reduce.js'
export * from './cut.js'
export * from './instant.js'
export * from './pace.js'
export * from './names.js'
export * from './cards.js'
export * from './wire.js'

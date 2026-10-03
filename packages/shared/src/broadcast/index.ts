/**
 * La retransmisión (E2, docs/retransmision.md §4.13): reexporta los ficheros de `broadcast/`. Cada PR
 * que añade uno lo añade aquí (§17.20). Los ficheros del lado del grabador (`timeline`, `codec`,
 * `reduce`, `reveal`) no pueden importar este índice, que trae `BROADCAST` y `SPOILER` (15-b).
 */
export * from './timeline.js'
export * from './reveal.js'
export * from './constants.js'
export * from './cues.js'

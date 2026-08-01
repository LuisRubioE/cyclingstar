/**
 * packages/engine: motor de etapa por bloques de 100 metros (SPEC 6) y lógica pura de juego.
 * Función pura y determinista: jamás importa de db, jamás usa Date.now() ni Math.random();
 * todo azar viene del RNG sembrado (CLAUDE.md, SPEC 6.1).
 *
 * Paso 15: creación del genoma del ciclista (SPEC 3.4-3.5). El contrato simulateStage() y la
 * física llegan a partir del Paso 21.
 */
export { CREATION, ENGINE_VERSION } from './constants.js'
export { generateRiderGenome, type RiderGenome, type RiderHidden } from './creation.js'
export * from './random.js'

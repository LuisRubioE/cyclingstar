/**
 * packages/engine: motor de etapa por bloques de 100 metros (SPEC 6).
 * Función pura y determinista: jamás importa de db, jamás usa Date.now() ni Math.random();
 * todo azar viene del RNG sembrado (CLAUDE.md, SPEC 6.1). Esta pureza está además cableada
 * como regla de ESLint sobre packages/engine.
 *
 * Paso 3: solo andamiaje. El contrato simulateStage() y la física llegan a partir del Paso 21.
 */
export { ENGINE_VERSION } from './constants.js'

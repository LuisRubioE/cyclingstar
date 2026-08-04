/**
 * RASGOS REALES de las etapas (los puertos puntuables y los sprints intermedios de verdad), para las
 * carreras cuya edición está documentada al detalle. De aquí sale una altimetría FIEL: cada puerto en
 * su kilómetro real, con su longitud y pendiente (de las que el motor deriva su categoría), y cada
 * meta volante en su sitio. Las etapas sin rasgos aquí caen al perfil por terreno (verosímil, no real).
 *
 * Clave: id de carrera → array indexado por etapa (0-based). Un hueco `null` = esa etapa aún no tiene
 * rasgos autorizados (usa el perfil por terreno). Se amplía carrera a carrera; no se inventan datos:
 * solo se anota lo verificado del recorrido real (con nota cuando un valor es aproximado).
 */
import type { StageFeatures } from './featureProfile.js'

export const STAGE_FEATURES: Record<string, (StageFeatures | null)[]> = {
  // O Gran Camiño 2025 (race-galicia). Puertos contrastados con crónicas y prensa (cyclingstage,
  // Cyclingnews, Diario de Pontevedra, El Progreso). El km EXACTO de las metas volantes solo figura en
  // el roadbook oficial / la ficha de PCS, así que donde no está verificado se sitúa en su punto real
  // aproximado (comentado) y se corregirá si se dispone del dato exacto.
  'race-galicia': [
    // S1 Maia -> Matosinhos, 190 km (llana): Alto de Feitos y Alto de São Félix; sprint de Barroselas.
    {
      climbs: [
        { name: 'Alto de Feitos', summitKm: 51, lengthKm: 6, avgGradient: 4.2 },
        { name: 'Alto de Sao Felix', summitKm: 144, lengthKm: 1.3, avgGradient: 6.9 },
      ],
      sprints: [{ name: 'Barroselas', km: 67 }], // km verificado (crónica de etapa)
    },
    // S2 Marin -> A Estrada, 133 km: 3 puertos de 3ª (San Antoniño, San Vicenzo x2) y 2 de 4ª (Santa
    // Lucia, repecho de A Estrada), sobre un circuito final de dos pasos por meta.
    {
      climbs: [
        {
          name: 'Alto de San Antonino',
          summitKm: 18,
          lengthKm: 2.3,
          avgGradient: 6.5,
          category: 'cat3',
        },
        {
          name: 'Santa Lucia de Morana',
          summitKm: 24.5,
          lengthKm: 2,
          avgGradient: 5,
          category: 'cat4',
        },
        {
          name: 'Alto de San Vicenzo',
          summitKm: 86.5,
          lengthKm: 2.6,
          avgGradient: 6.9,
          category: 'cat3',
        },
        { name: 'A Estrada', summitKm: 97, lengthKm: 1.9, avgGradient: 5.6, category: 'cat4' },
        {
          name: 'Alto de San Vicenzo',
          summitKm: 122,
          lengthKm: 2.5,
          avgGradient: 7.2,
          category: 'cat3',
        },
      ],
      // Meta volante de Barro (pronto, junto a San Antoniño) y paso por meta de A Estrada (2 vueltas):
      // ambas confirmadas por prensa; el km exacto es aproximado (roadbook no accesible).
      sprints: [
        { name: 'Barro', km: 16 },
        { name: 'A Estrada', km: 74 },
      ],
    },
    // S3 Ourense -> O Pereiro de Aguiar, 16 km: crono individual, sin puertos ni metas volantes.
    null,
    // S4 A Pobra do Brollon -> O Cebreiro, 137 km (etapa reina): Catro Ventos (2ª), A Pintinidoira (1ª)
    // y final en alto de O Cebreiro. Km de cima derivados de "a X km de meta" en las crónicas.
    {
      climbs: [
        {
          name: 'Alto de Catro Ventos',
          summitKm: 98,
          lengthKm: 8.4,
          avgGradient: 5.7,
          category: 'cat2',
        },
        {
          name: 'A Pintinidoira',
          summitKm: 122,
          lengthKm: 13.3,
          avgGradient: 5.7,
          category: 'cat1',
        },
        { name: 'O Cebreiro', summitKm: 135, lengthKm: 2.8, avgGradient: 6.5, category: 'cat3' },
      ],
    },
    // S5 Betanzos -> Santiago de Compostela, 160 km (media montaña + sterrato): repecho inicial y el
    // Alto de Lampai, subido dos veces en el circuito final. Km de los pasos por Lampai aproximados.
    {
      climbs: [
        { name: 'Repecho inicial', summitKm: 14, lengthKm: 4.2, avgGradient: 6.4 },
        { name: 'Alto de Lampai', summitKm: 105, lengthKm: 5.2, avgGradient: 5.4 },
        { name: 'Alto de Lampai', summitKm: 150, lengthKm: 5.2, avgGradient: 5.4 },
      ],
    },
  ],
}

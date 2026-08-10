/**
 * RECORRIDOS REALES de las clásicas de un día del WorldTour, extraídos de fuentes abiertas.
 *
 * De dónde sale cada dato:
 *   - **Wikidata** (CC0, sin obligaciones): la entidad de cada edición y su distancia oficial (P3157).
 *   - **Wikipedia** (CC BY-SA 4.0): las tablas de montes y de sectores de pavé. La licencia OBLIGA a
 *     atribuir, y por eso cada carrera lleva aquí su `RouteSource` con el artículo exacto, la edición
 *     y la fecha de extracción. La misma tabla, en prosa, está en docs/fuentes-recorridos.md.
 *
 * Reglas de la carga (ver docs/fuentes-recorridos.md para el detalle):
 *   - Se usa la edición MÁS RECIENTE que publique tabla de dificultades, no necesariamente la de 2026:
 *     muchos artículos del año en curso son todavía un esbozo. La edición usada se anota siempre.
 *   - La distancia y las tablas salen SIEMPRE de la misma edición: mezclarlas descoloca los km.
 *   - Un muro adoquinado va como puerto (`climbs`), no como sector de pavé: el muestreo solo da un
 *     terreno por bloque y la subida es lo que decide (ver featureProfile.ts).
 *   - Nada se inventa: si la fuente no publica un dato, no se rellena. Lo que se asume, se anota.
 *
 * Estos rasgos entran en STAGE_FEATURES (ver stageFeatures.ts) y de ahí a `buildFeatureProfile()`.
 */
import type { StageFeatures } from './featureProfile.js'

/** Procedencia de un recorrido real: de dónde viene, de qué edición y qué hubo que curar. */
export interface RouteSource {
  /** Nombre real de la carrera (el del juego es neutro por geografía). */
  race: string
  /** Edición de la que sale el recorrido. No siempre es la del año en curso. */
  edition: number
  /** Distancia oficial de ESA edición, en km. */
  distanceKm: number
  /** Artículo de Wikipedia del que salen las tablas (CC BY-SA 4.0): la atribución es obligatoria. */
  wikipedia: string
  /** Entidad de Wikidata de la edición (CC0), de donde sale la distancia oficial. */
  wikidata?: string
  /** Segunda fuente usada para desempatar un dato dudoso. */
  crossCheck?: string
  /** Fecha de extracción (ISO), para saber contra qué versión del artículo se contrastó. */
  retrieved: string
  /** Lo que hay que saber del dato: qué edición, qué se corrigió y qué se asumió. */
  notes: string[]
}

/** Atribución y procedencia de cada recorrido cargado (CC BY-SA 4.0 obliga a mantenerla). */
export const CLASSIC_ROUTE_SOURCES: Record<string, RouteSource> = {
  'race-roubaix': {
    race: 'Paris-Roubaix',
    edition: 2026,
    distanceKm: 258.3,
    wikipedia: 'https://it.wikipedia.org/wiki/Parigi-Roubaix_2026',
    wikidata: 'https://www.wikidata.org/wiki/Q136736318',
    crossCheck: 'https://fr.wikipedia.org/wiki/Paris-Roubaix_2026',
    retrieved: '2026-08-07',
    notes: [
      'Tabla de la itwiki: es la única fuente que publica la DUREZA de cada sector en estrellas.',
      'Corregido el sector 22 (Quérénaing a Maing): la itwiki lo pone en el km 135,5, donde todavía va el sector 23; la frwiki de la misma edición da 137,5, que además cuadra con el sector 21. Se usa 137,5.',
      'Los 31 tramos son los 30 sectores numerados (el 8 va partido en 8a y 8b) y suman los 54,8 km de adoquín que publica la organización.',
      'Distancia contrastada con Wikidata (P3157): 258,3 km.',
    ],
  },
  'race-flanders': {
    race: 'Ronde van Vlaanderen',
    edition: 2026,
    distanceKm: 278.2,
    wikipedia: 'https://fr.wikipedia.org/wiki/Tour_des_Flandres_2026',
    wikidata: 'https://www.wikidata.org/wiki/Q136735977',
    retrieved: '2026-08-07',
    notes: [
      'La tabla mezcla muros y sectores llanos: las filas con pendiente publicada entran como puerto y las demás como pavé. En la tabla el km marca el PIE del muro, así que la cima se calcula sumando su longitud.',
      'Los 6 sectores de pavé llano no traen dureza publicada: se asumen 3 estrellas (supuesto de modelado, no dato de la fuente). Solo Paris-Roubaix la publica.',
      'Distancia contrastada con Wikidata (P3157): 278,2 km.',
    ],
  },
  'race-lombardy': {
    race: 'Il Lombardia',
    edition: 2025,
    distanceKm: 241.5,
    wikipedia: 'https://fr.wikipedia.org/wiki/Tour_de_Lombardie_2025',
    wikidata: 'https://www.wikidata.org/wiki/Q126737372',
    retrieved: '2026-08-07',
    notes: [
      'La edición de 2026 todavía no tiene recorrido publicado: se usa la de 2025 (Como -> Bergamo), la más reciente disponible. Por eso raceRoutes.ts da la vuelta al sentido de la carrera.',
      'Aquí el km de la tabla es el de la CIMA, no el del pie.',
      'Distancia contrastada con Wikidata (P3157): 241,5 km.',
    ],
  },
  'race-opening-classic': {
    race: 'Omloop Het Nieuwsblad',
    edition: 2024,
    distanceKm: 202.2,
    wikipedia: 'https://fr.wikipedia.org/wiki/Circuit_Het_Nieuwsblad_2024',
    wikidata: 'https://www.wikidata.org/wiki/Q122724355',
    retrieved: '2026-08-07',
    notes: [
      'El artículo de 2026 es un esbozo sin tabla de dificultades; el de 2024 la trae completa (12 montes y 9 sectores), y el recorrido de una clásica flamenca apenas cambia de un año a otro.',
      'Los 9 sectores de pavé no traen dureza publicada: se asumen 3 estrellas (supuesto de modelado).',
      'Distancia contrastada con Wikidata (P3157): 202,2 km.',
    ],
  },
  'race-harelbeke': {
    race: 'E3 Saxo Classic',
    edition: 2025,
    distanceKm: 208.8,
    wikipedia: 'https://fr.wikipedia.org/wiki/E3_Saxo_Bank_Classic_2025',
    wikidata: 'https://www.wikidata.org/wiki/Q126737332',
    retrieved: '2026-08-07',
    notes: [
      'El artículo de 2026 no trae tabla de dificultades; el de 2025 sí (17 montes y 5 sectores de pavé).',
      'Los 5 sectores de pavé no traen dureza publicada: se asumen 3 estrellas (supuesto de modelado).',
      'El sector de la Beaucarnestraat (km 31,2) se pisa con el Katteberg (km 31,4): el trozo común se queda como puerto, que es lo que decide la carrera.',
      'Distancia contrastada con Wikidata (P3157): 208,8 km.',
    ],
  },
  'race-across-flanders': {
    race: 'Dwars door Vlaanderen',
    edition: 2024,
    distanceKm: 188.6,
    wikipedia: 'https://de.wikipedia.org/wiki/Dwars_door_Vlaanderen_2024',
    wikidata: 'https://www.wikidata.org/wiki/Q122762768',
    retrieved: '2026-08-07',
    notes: [
      'Ni fr, ni it, ni nl, ni la edición de 2026 traen tabla; la dewiki de 2024 sí (12 hellingen y 8 sectores de adoquín).',
      'Es una tabla de PASAJES, no de premios de montaña: el km marca dónde empieza cada pasaje, así que la cima de un muro se calcula sumando su longitud.',
      'Los 8 sectores de pavé no traen dureza publicada: se asumen 3 estrellas (supuesto de modelado).',
      'El sector del Holleweg (km 71,7) se pisa con el Volkegemberg: el trozo común se queda como puerto.',
      'Distancia contrastada con Wikidata (P3157): 188,6 km.',
    ],
  },
  'race-frankfurt': {
    race: 'Eschborn-Frankfurt',
    edition: 2023,
    distanceKm: 203.8,
    wikipedia: 'https://de.wikipedia.org/wiki/Eschborn%E2%80%93Frankfurt_2023',
    wikidata: 'https://www.wikidata.org/wiki/Q116636355',
    retrieved: '2026-08-07',
    notes: [
      'La edición más reciente con tabla es la de 2023 en dewiki. INCOMPLETA a propósito en la fuente: numera las cotas 1, 3, 4, 5 y 8, así que publica cinco de las ocho. Se cargan solo esas cinco; las otras tres no se inventan.',
      'Es una tabla de premios de montaña (lleva la altitud de la cima al lado), así que el km es el de la CIMA.',
      'Distancia contrastada con Wikidata (P3157): 203,8 km.',
    ],
  },
  'race-white-roads': {
    race: 'Strade Bianche',
    edition: 2024,
    distanceKm: 215,
    wikipedia: 'https://fr.wikipedia.org/wiki/Strade_Bianche_2024',
    wikidata: 'https://www.wikidata.org/wiki/Q122729230',
    retrieved: '2026-08-10',
    notes: [
      'Se carga en la v12, cuando el motor por fin DESCUELGA en el firme roto (docs/motor.md §14). Antes se dejó fuera a propósito: una carrera cuya única dificultad es el sterrato no tenía sentido en un motor donde el firme roto solo costaba energía.',
      'La edición de 2024 es la primera del recorrido largo (215 km, 15 sectores, 71,5 km de sterrato) y la más reciente con tabla completa; la de 2025 tiene la sección «Percorso» vacía en it, fr e in.',
      'Los 15 sectores llevan su DUREZA EN ESTRELLAS publicada (1-5), como Paris-Roubaix: es la segunda carrera del calendario con dureza real y no asumida.',
      'La tabla trae también, para 9 sectores, una «longueur de la pente» y una PENDIENTE MÁXIMA (hasta el 18%). No se cargan como puertos: máxima no es media, y tomar el 18% del Monte Sante Marie por su media sería inventarse la carrera. Consecuencia asumida: la rampa de Via Santa Caterina, que la fuente no publica, no está en el recorrido y el final se resuelve como llegada de pavé.',
      'La suma de las longitudes de la tabla da 70,5 km y la prosa del mismo artículo dice 71,5: la discrepancia es de la fuente y se conserva el dato de la tabla, que es el que tiene kilometraje.',
      'Distancia contrastada con Wikidata (P3157): 215 km.',
    ],
  },
  'race-hamburg': {
    race: 'Cyclassics Hamburg',
    edition: 2024,
    distanceKm: 198.5,
    wikipedia: 'https://de.wikipedia.org/wiki/Cyclassics_Hamburg_2024',
    wikidata: 'https://www.wikidata.org/wiki/Q122762036',
    retrieved: '2026-08-07',
    notes: [
      'La dewiki de 2024 trae los tres pasos por el Waseberg y los tres sprints intermedios; el km es el de la cima (tabla de premios de montaña).',
      'El día de la carrera se recortaron 21 km por un retraso en la salida: se carga el recorrido PREVISTO, que es el recorrido de la carrera.',
      'Distancia contrastada con Wikidata (P3157): 198,5 km.',
    ],
  },
}

/** Rasgos reales de cada clásica: puertos, sprints y sectores de pavé, en su kilómetro de verdad. */
export const CLASSIC_FEATURES: Record<string, [StageFeatures]> = {
  // Paris-Roubaix: 30 sectores numerados (el 8 va partido en 8a y 8b) y 54,8 km de adoquín, con la
  // dureza en estrellas que publica la organización. Sin puertos: aquí no hay ni uno.
  'race-roubaix': [
    {
      cobbles: [
        { name: 'Troisvilles a Inchy', startKm: 95.8, lengthKm: 2.2, stars: 3 },
        { name: 'Viesly a Quiévy', startKm: 102.3, lengthKm: 1.8, stars: 3 },
        { name: 'Quiévy a Fontaine-au-Tertre', startKm: 104.9, lengthKm: 3.7, stars: 4 },
        { name: 'Viesly a Briastre', startKm: 111.1, lengthKm: 3, stars: 3 },
        { name: 'Briastre', startKm: 114.9, lengthKm: 0.8, stars: 3 },
        { name: 'Solesmes a Haussy', startKm: 123.7, lengthKm: 0.8, stars: 2 },
        { name: 'Saulzoir a Verchain-Maugré', startKm: 130.5, lengthKm: 1.2, stars: 2 },
        { name: 'Verchain-Maugré a Quérénaing', startKm: 134.9, lengthKm: 1.6, stars: 3 },
        { name: 'Quérénaing a Maing', startKm: 137.5, lengthKm: 2.5, stars: 3 },
        { name: 'Maing a Monchaux-sur-Écaillon', startKm: 140.7, lengthKm: 1.6, stars: 3 },
        { name: 'Haveluy a Wallers', startKm: 153.6, lengthKm: 2.5, stars: 4 },
        { name: "Trouée d'Arenberg", startKm: 163, lengthKm: 2.3, stars: 5 },
        { name: 'Wallers a Hélesmes', startKm: 169.1, lengthKm: 1.6, stars: 3 },
        { name: 'Hornaing a Wandignies', startKm: 175.9, lengthKm: 3.7, stars: 4 },
        { name: 'Warlaing a Brillon', startKm: 183.3, lengthKm: 2.4, stars: 3 },
        { name: 'Tilloy a Sars-et-Rosières', startKm: 186.8, lengthKm: 2.4, stars: 4 },
        { name: 'Beuvry-la-Forêt a Orchies', startKm: 193.2, lengthKm: 1.4, stars: 3 },
        { name: 'Orchies', startKm: 198.2, lengthKm: 1.7, stars: 3 },
        { name: 'Auchy-lez-Orchies a Bersée', startKm: 204.3, lengthKm: 2.7, stars: 4 },
        { name: 'Mons-en-Pévèle', startKm: 209.7, lengthKm: 3, stars: 5 },
        { name: 'Mérignies a Avelin', startKm: 215.7, lengthKm: 0.7, stars: 2 },
        { name: 'Pont-Thibaut a Ennevelin', startKm: 219.1, lengthKm: 1.4, stars: 3 },
        { name: "Templeuve (L'Épinette)", startKm: 224.5, lengthKm: 0.2, stars: 1 },
        { name: 'Templeuve (Moulin-de-Vertain)', startKm: 225.1, lengthKm: 0.5, stars: 2 },
        { name: 'Cysoing a Bourghelles', startKm: 231.5, lengthKm: 1.3, stars: 3 },
        { name: 'Bourghelles a Wannehain', startKm: 234, lengthKm: 1.1, stars: 3 },
        { name: 'Camphin-en-Pévèle', startKm: 238.4, lengthKm: 1.8, stars: 4 },
        { name: "Carrefour de l'Arbre", startKm: 241.2, lengthKm: 2.1, stars: 5 },
        { name: 'Gruson', startKm: 243.5, lengthKm: 1.1, stars: 2 },
        { name: 'Willems a Hem', startKm: 250.2, lengthKm: 1.4, stars: 2 },
        { name: 'Roubaix (Espace Charles Crupelandt)', startKm: 256.9, lengthKm: 0.3, stars: 1 },
      ],
    },
  ],
  // Ronde van Vlaanderen: 16 muros numerados (Oude Kwaremont x3, Paterberg x2) más 6 sectores de
  // pavé LLANO. Los muros adoquinados van como puerto, no como pavé (ver featureProfile.ts).
  'race-flanders': [
    {
      climbs: [
        { name: 'Vieux Quaremont (1)', summitKm: 144.7, lengthKm: 2.2, avgGradient: 4 },
        { name: 'Eikenberg', summitKm: 157.2, lengthKm: 1.2, avgGradient: 5.2 },
        { name: 'Wolvenberg', summitKm: 161.1, lengthKm: 0.6, avgGradient: 7.9 },
        { name: 'Molenberg', summitKm: 175.5, lengthKm: 0.5, avgGradient: 7 },
        { name: 'Marlboroughstraat', summitKm: 180.7, lengthKm: 2, avgGradient: 3 },
        { name: 'Berendries', summitKm: 183.9, lengthKm: 0.9, avgGradient: 7 },
        { name: 'Valkenberg', summitKm: 192, lengthKm: 0.5, avgGradient: 8.1 },
        { name: 'Berg ten Houte', summitKm: 205.1, lengthKm: 1.1, avgGradient: 6 },
        { name: 'Nieuwe Kruisberg/Hotond', summitKm: 214.5, lengthKm: 1, avgGradient: 7.7 },
        { name: 'Vieux Quaremont (2)', summitKm: 225.7, lengthKm: 2.2, avgGradient: 4 },
        { name: 'Paterberg (1)', summitKm: 227.4, lengthKm: 0.4, avgGradient: 12.9 },
        { name: 'Koppenberg', summitKm: 234.1, lengthKm: 0.6, avgGradient: 11.6 },
        { name: 'Taaienberg', summitKm: 242.5, lengthKm: 0.5, avgGradient: 6.6 },
        { name: 'Oude Kruisberg-Hotond', summitKm: 253, lengthKm: 2.5, avgGradient: 5 },
        { name: 'Vieux Quaremont (3)', summitKm: 264.2, lengthKm: 2.2, avgGradient: 4 },
        { name: 'Paterberg (2)', summitKm: 265.9, lengthKm: 0.4, avgGradient: 12.9 },
      ],
      cobbles: [
        { name: 'Lippenhovestraat', startKm: 111, lengthKm: 1.1, stars: 3 },
        { name: 'Paddestraat', startKm: 113, lengthKm: 2.4, stars: 3 },
        { name: 'Holleweg', startKm: 158.5, lengthKm: 1.5, stars: 3 },
        { name: 'Karel Martelstraat', startKm: 167.5, lengthKm: 1.2, stars: 3 },
        { name: 'Jagerij', startKm: 170, lengthKm: 1, stars: 3 },
        { name: 'Mariaborrestraat', startKm: 238.5, lengthKm: 1.1, stars: 3 },
      ],
    },
  ],
  // Il Lombardia: 7 puertos de verdad, con el Ghisallo de aperitivo y el Passo di Ganda a 31 km de
  // meta. Es la carrera con más desnivel de las cargadas.
  'race-lombardy': [
    {
      climbs: [
        { name: 'Madonna del Ghisallo', summitKm: 41.4, lengthKm: 8.8, avgGradient: 3.9 },
        { name: 'Roncola', summitKm: 104.1, lengthKm: 7.5, avgGradient: 7.4 },
        { name: 'Berbenno', summitKm: 132.4, lengthKm: 6.9, avgGradient: 4.9 },
        { name: 'Passo della Crocetta', summitKm: 165.3, lengthKm: 11.7, avgGradient: 5.8 },
        { name: 'Zambla Alta', summitKm: 178.1, lengthKm: 9.8, avgGradient: 3.3 },
        { name: 'Passo di Ganda', summitKm: 210.1, lengthKm: 9.3, avgGradient: 7.1 },
        { name: 'Colle Aperto', summitKm: 238.1, lengthKm: 1.3, avgGradient: 7.4 },
      ],
    },
  ],
  // Omloop Het Nieuwsblad: 12 muros (Muur de Grammont y Bosberg al final) y 9 sectores de pavé.
  'race-opening-classic': [
    {
      climbs: [
        { name: 'Leberg', summitKm: 40.4, lengthKm: 1, avgGradient: 4.2 },
        { name: 'Katteberg', summitKm: 104.5, lengthKm: 0.9, avgGradient: 5.6 },
        { name: 'Leberg', summitKm: 114.2, lengthKm: 1, avgGradient: 4.2 },
        { name: 'Hostellerie', summitKm: 131.5, lengthKm: 1.3, avgGradient: 5.1 },
        { name: 'Valkenberg', summitKm: 138.6, lengthKm: 0.5, avgGradient: 8.1 },
        { name: 'Wolvenberg', summitKm: 149.2, lengthKm: 0.6, avgGradient: 7.9 },
        { name: 'Molenberg', summitKm: 161.5, lengthKm: 0.5, avgGradient: 7 },
        { name: 'Leberg', summitKm: 169.5, lengthKm: 1, avgGradient: 4.2 },
        { name: 'Berendries', summitKm: 173.5, lengthKm: 0.9, avgGradient: 7 },
        { name: 'Elverenberg - Vossenhol', summitKm: 176.3, lengthKm: 1.3, avgGradient: 3.6 },
        { name: 'Mur de Grammont', summitKm: 187.6, lengthKm: 1.1, avgGradient: 9.2 },
        { name: 'Bosberg', summitKm: 191.4, lengthKm: 1, avgGradient: 5.8 },
      ],
      cobbles: [
        { name: 'Haaghoek', startKm: 36.4, lengthKm: 2, stars: 3 },
        { name: 'Lange Munte', startKm: 88.1, lengthKm: 2.5, stars: 3 },
        { name: 'Holleweg', startKm: 104.4, lengthKm: 1.5, stars: 3 },
        { name: 'Haaghoek', startKm: 110.1, lengthKm: 2, stars: 3 },
        { name: 'Paddestraat', startKm: 119.3, lengthKm: 2, stars: 3 },
        { name: 'Holleweg', startKm: 146, lengthKm: 0.7, stars: 3 },
        { name: 'Kergate', startKm: 152.2, lengthKm: 1.4, stars: 3 },
        { name: 'Jagerij', startKm: 154.8, lengthKm: 0.8, stars: 3 },
        { name: 'Haaghoek', startKm: 165.5, lengthKm: 2, stars: 3 },
      ],
    },
  ],
  // E3 Saxo Classic: 17 muros (Paterberg y Oude Kwaremont encadenados a 43 km de meta) y 5 sectores.
  'race-harelbeke': [
    {
      climbs: [
        { name: 'Katteberg', summitKm: 32.2, lengthKm: 0.8, avgGradient: 6 },
        { name: 'La Houppe', summitKm: 92.6, lengthKm: 1.9, avgGradient: 4.8 },
        { name: 'Kanarieberg', summitKm: 98, lengthKm: 1.1, avgGradient: 7.7 },
        { name: 'Kruisberg', summitKm: 104.9, lengthKm: 0.8, avgGradient: 4.8 },
        { name: 'Côte de Trieu', summitKm: 113.2, lengthKm: 1.3, avgGradient: 7 },
        { name: 'Hotondberg', summitKm: 117, lengthKm: 1.2, avgGradient: 4 },
        { name: 'Kortekeer', summitKm: 123.9, lengthKm: 1, avgGradient: 6.4 },
        { name: 'Taaienberg', summitKm: 128.3, lengthKm: 0.7, avgGradient: 6.3 },
        { name: 'Berg ten Stene', summitKm: 136.9, lengthKm: 1.3, avgGradient: 5.2 },
        { name: 'Boigneberg', summitKm: 141.8, lengthKm: 1, avgGradient: 5.2 },
        { name: 'Eikenberg', summitKm: 146.5, lengthKm: 1.3, avgGradient: 6.2 },
        { name: 'Stationsberg', summitKm: 151.1, lengthKm: 0.5, avgGradient: 3.2 },
        { name: 'Kapelberg', summitKm: 162.3, lengthKm: 0.8, avgGradient: 7.1 },
        { name: 'Paterberg', summitKm: 166, lengthKm: 0.4, avgGradient: 12.9 },
        { name: 'Vieux Quaremont', summitKm: 170.6, lengthKm: 2.2, avgGradient: 4.2 },
        {
          name: 'Rue du Lait Battu / Karnemelkbeekstraat',
          summitKm: 177.7,
          lengthKm: 1.5,
          avgGradient: 4.9,
        },
        { name: 'Tiegemberg', summitKm: 188, lengthKm: 0.8, avgGradient: 5.6 },
      ],
      cobbles: [
        { name: 'Beaucarnestraat', startKm: 31.2, lengthKm: 1.2, stars: 3 },
        { name: 'Holleweg', startKm: 33.3, lengthKm: 1.5, stars: 3 },
        { name: 'Paddestraat', startKm: 44.7, lengthKm: 2.3, stars: 3 },
        { name: 'Mariaborrestraat', startKm: 151.4, lengthKm: 2, stars: 3 },
        { name: 'Varentstraat', startKm: 183.8, lengthKm: 1.5, stars: 3 },
      ],
    },
  ],
  // Dwars door Vlaanderen: 12 hellingen y 8 sectores de adoquín, con el circuito final del Nokereberg.
  'race-across-flanders': [
    {
      climbs: [
        { name: 'Hellestraat', summitKm: 53.5, lengthKm: 1.5, avgGradient: 3.8 },
        { name: 'Volkegemberg', summitKm: 72.3, lengthKm: 1.1, avgGradient: 4.7 },
        { name: 'Hotond', summitKm: 89.3, lengthKm: 1.2, avgGradient: 3.1 },
        { name: 'Knokteberg (Rue du Trieu)', summitKm: 96.6, lengthKm: 1.1, avgGradient: 7 },
        { name: 'Kortekeer', summitKm: 104.1, lengthKm: 0.9, avgGradient: 6.5 },
        { name: 'Berg Ten Houte', summitKm: 118.1, lengthKm: 1.1, avgGradient: 6 },
        { name: 'Kanarieberg', summitKm: 123.7, lengthKm: 1, avgGradient: 7.7 },
        { name: 'Knokteberg (Rue du Trieu)', summitKm: 136.8, lengthKm: 1.1, avgGradient: 7 },
        { name: 'Hotond', summitKm: 140.5, lengthKm: 1.2, avgGradient: 3.1 },
        { name: 'Ladeuze', summitKm: 151.7, lengthKm: 1.2, avgGradient: 5 },
        { name: 'Nokereberg', summitKm: 167.2, lengthKm: 0.4, avgGradient: 3.3 },
        { name: 'Nokereberg', summitKm: 179.9, lengthKm: 0.5, avgGradient: 5.7 },
      ],
      cobbles: [
        { name: 'Varentstraat', startKm: 55.1, lengthKm: 2, stars: 3 },
        { name: 'Holleweg', startKm: 71.7, lengthKm: 0.6, stars: 3 },
        { name: 'Mariaborrestraat', startKm: 105.4, lengthKm: 2.4, stars: 3 },
        { name: 'Mariaborrestraat', startKm: 145.8, lengthKm: 2.4, stars: 3 },
        { name: 'Doorn', startKm: 159.2, lengthKm: 0.6, stars: 3 },
        { name: 'Huisepontweg', startKm: 160.1, lengthKm: 2, stars: 3 },
        { name: 'Herlegemstraat', startKm: 169.5, lengthKm: 0.8, stars: 3 },
        { name: 'Herlegemstraat', startKm: 182.3, lengthKm: 0.8, stars: 3 },
      ],
    },
  ],
  // Eschborn-Frankfurt: el Feldberg (11 km al 4,8 %) y el Mammolshain, la clásica más montañosa del
  // grupo. La fuente publica cinco de las ocho cotas (ver la nota de procedencia).
  'race-frankfurt': [
    {
      climbs: [
        { name: 'Feldberg', summitKm: 46.5, lengthKm: 11, avgGradient: 4.8 },
        { name: 'Mammolshain', summitKm: 92, lengthKm: 2.3, avgGradient: 8.3 },
        { name: 'Mammolshain', summitKm: 107.9, lengthKm: 2.3, avgGradient: 8.3 },
        { name: 'Feldberg', summitKm: 117.8, lengthKm: 7.6, avgGradient: 6.5 },
        { name: 'Mammolshain', summitKm: 167.8, lengthKm: 2.3, avgGradient: 8.3 },
      ],
    },
  ],
  // Strade Bianche: 15 sectores de STERRATO (70,5 km de los 215) con su dureza en estrellas, el doble
  // paso por Colle Pinzuto y Le Tolfe en el final, y el Monte Sante Marie —11,5 km a 5★— a 84 km de
  // meta. Sin puertos: la fuente publica pendientes MÁXIMAS, no medias (ver la nota de procedencia).
  'race-white-roads': [
    {
      cobbles: [
        { name: 'Vidritta', startKm: 14, lengthKm: 2.1, stars: 1 },
        { name: 'Bagnaia', startKm: 21.3, lengthKm: 5.8, stars: 3 },
        { name: 'Radi', startKm: 33.4, lengthKm: 4.4, stars: 2 },
        { name: 'La Piana', startKm: 44.1, lengthKm: 5.5, stars: 2 },
        { name: "Lucignano d'Asso", startKm: 76.8, lengthKm: 11.9, stars: 3 },
        { name: 'Pieve a Salti', startKm: 89.7, lengthKm: 8, stars: 4 },
        { name: 'San Martino in Grania', startKm: 112.7, lengthKm: 9.5, stars: 5 },
        { name: 'Monte Sante Marie', startKm: 131, lengthKm: 11.5, stars: 5 },
        { name: 'Monteaperti', startKm: 161.3, lengthKm: 0.8, stars: 2 },
        { name: 'Colle Pinzuto', startKm: 165.7, lengthKm: 2.4, stars: 4 },
        { name: 'Le Tolfe', startKm: 171.9, lengthKm: 1.1, stars: 4 },
        { name: 'Strada del Castagno', startKm: 175.4, lengthKm: 0.7, stars: 3 },
        { name: 'Montechiaro', startKm: 189.2, lengthKm: 3.3, stars: 2 },
        { name: 'Colle Pinzuto', startKm: 195.9, lengthKm: 2.4, stars: 4 },
        { name: 'Le Tolfe', startKm: 202.2, lengthKm: 1.1, stars: 4 },
      ],
    },
  ],
  // Cyclassics Hamburg: tres pasos por el Waseberg en el tramo final y tres sprints intermedios.
  'race-hamburg': [
    {
      climbs: [
        { name: 'Waseberg', summitKm: 135.5, lengthKm: 0.8, avgGradient: 8.8 },
        { name: 'Waseberg', summitKm: 174.5, lengthKm: 0.8, avgGradient: 8.8 },
        { name: 'Waseberg', summitKm: 182.5, lengthKm: 0.8, avgGradient: 8.8 },
      ],
      sprints: [
        { name: 'Schenefeld', km: 9 },
        { name: 'Wedel', km: 125 },
        { name: 'Hamburg (Zieldurchfahrt)', km: 151 },
      ],
    },
  ],
}

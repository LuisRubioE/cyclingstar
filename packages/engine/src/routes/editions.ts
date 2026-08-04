/**
 * Ediciones reales de las carreras que reproducimos fielmente (recorrido verificado en fuentes: Tour
 * de France, Giro d'Italia y Vuelta a Espana 2026, y la Volta a Portugal). Cada etapa lleva su salida
 * y meta reales (independientes: las grandes vueltas tienen TRASLADOS, la meta de una etapa no siempre
 * es la salida de la siguiente), su distancia y su tipo de terreno, y la carrera sus dias de descanso
 * reales (el Giro 2026 tiene TRES por la salida desde Bulgaria). De aqui salen tanto el perfil de cada
 * etapa (calendar) como el "de donde a donde" (raceRoutes): una sola fuente para que no se desincronicen.
 * Nombres ASCII. NO editar a mano: se regenera de los datos verificados.
 */
export type EditionTerrain = 'flat' | 'hilly' | 'mountain' | 'itt' | 'cobbles'

export interface EditionStage {
  from: string
  to: string
  km: number
  terrain: EditionTerrain
}

export interface RaceEdition {
  /** Indices de etapa (1-based) tras los que hay dia de descanso. */
  restAfter: number[]
  stages: EditionStage[]
}

export const RACE_EDITIONS: Record<string, RaceEdition> = {
  'race-france': {
    restAfter: [9, 15],
    stages: [
      { from: 'Barcelona', to: 'Barcelona', km: 20, terrain: 'itt' },
      { from: 'Tarragona', to: 'Barcelona', km: 169, terrain: 'hilly' },
      { from: 'Granollers', to: 'Les Angles', km: 196, terrain: 'hilly' },
      { from: 'Carcassonne', to: 'Foix', km: 182, terrain: 'hilly' },
      { from: 'Lannemezan', to: 'Pau', km: 158, terrain: 'flat' },
      { from: 'Pau', to: 'Gavarnie-Gedre', km: 186, terrain: 'mountain' },
      { from: 'Hagetmau', to: 'Bordeaux', km: 175, terrain: 'flat' },
      { from: 'Perigueux', to: 'Bergerac', km: 180, terrain: 'flat' },
      { from: 'Malemort', to: 'Ussel', km: 185, terrain: 'hilly' },
      { from: 'Aurillac', to: 'Le Lioran', km: 167, terrain: 'mountain' },
      { from: 'Vichy', to: 'Nevers', km: 161, terrain: 'flat' },
      { from: 'Magny-Cours', to: 'Chalon-sur-Saone', km: 179, terrain: 'flat' },
      { from: 'Dole', to: 'Belfort', km: 206, terrain: 'hilly' },
      { from: 'Mulhouse', to: 'Le Markstein', km: 155, terrain: 'mountain' },
      { from: 'Champagnole', to: 'Plateau de Solaison', km: 184, terrain: 'mountain' },
      { from: 'Evian-les-Bains', to: 'Thonon-les-Bains', km: 26, terrain: 'itt' },
      { from: 'Chambery', to: 'Voiron', km: 175, terrain: 'hilly' },
      { from: 'Voiron', to: 'Orcieres-Merlette', km: 185, terrain: 'mountain' },
      { from: 'Gap', to: "Alpe d'Huez", km: 128, terrain: 'mountain' },
      { from: "Le Bourg-d'Oisans", to: "Alpe d'Huez", km: 171, terrain: 'mountain' },
      { from: 'Thoiry', to: 'Paris', km: 130, terrain: 'flat' },
    ],
  },
  'race-italy': {
    restAfter: [3, 9, 15],
    stages: [
      { from: 'Nessebar', to: 'Burgas', km: 147, terrain: 'flat' },
      { from: 'Burgas', to: 'Veliko Tarnovo', km: 221, terrain: 'hilly' },
      { from: 'Plovdiv', to: 'Sofia', km: 175, terrain: 'flat' },
      { from: 'Catanzaro', to: 'Cosenza', km: 138, terrain: 'flat' },
      { from: 'Praia a Mare', to: 'Potenza', km: 203, terrain: 'hilly' },
      { from: 'Paestum', to: 'Napoli', km: 141, terrain: 'flat' },
      { from: 'Formia', to: 'Blockhaus', km: 244, terrain: 'mountain' },
      { from: 'Chieti', to: 'Fermo', km: 156, terrain: 'hilly' },
      { from: 'Cervia', to: 'Corno alle Scale', km: 184, terrain: 'mountain' },
      { from: 'Viareggio', to: 'Massa', km: 42, terrain: 'itt' },
      { from: 'Porcari', to: 'Chiavari', km: 195, terrain: 'hilly' },
      { from: 'Imperia', to: 'Novi Ligure', km: 175, terrain: 'flat' },
      { from: 'Alessandria', to: 'Verbania', km: 186, terrain: 'hilly' },
      { from: 'Aosta', to: 'Pila', km: 133, terrain: 'mountain' },
      { from: 'Voghera', to: 'Milano', km: 157, terrain: 'flat' },
      { from: 'Bellinzona', to: 'Cari', km: 113, terrain: 'mountain' },
      { from: "Cassano d'Adda", to: 'Andalo', km: 202, terrain: 'hilly' },
      { from: 'Fai della Paganella', to: 'Pieve di Soligo', km: 171, terrain: 'hilly' },
      { from: 'Feltre', to: 'Piani di Pezze', km: 151, terrain: 'mountain' },
      { from: 'Gemona del Friuli', to: 'Piancavallo', km: 200, terrain: 'mountain' },
      { from: 'Roma', to: 'Roma', km: 131, terrain: 'flat' },
    ],
  },
  'race-spain': {
    restAfter: [9, 15],
    stages: [
      { from: 'Monaco', to: 'Monaco', km: 10, terrain: 'itt' },
      { from: 'Monaco', to: 'Manosque', km: 215, terrain: 'hilly' },
      { from: 'Gruissan', to: 'Font Romeu', km: 167, terrain: 'mountain' },
      { from: 'Andorra la Vella', to: 'Andorra la Vella', km: 105, terrain: 'mountain' },
      { from: 'Falset', to: 'Roquetes', km: 171, terrain: 'hilly' },
      { from: 'Alcossebre', to: 'Castello', km: 177, terrain: 'cobbles' },
      { from: "Vall d'Alba", to: 'Valdelinares', km: 150, terrain: 'mountain' },
      { from: 'Pucol', to: 'Xeraco', km: 176, terrain: 'flat' },
      { from: 'Villajoyosa', to: 'Alto de Aitana', km: 188, terrain: 'mountain' },
      { from: 'Alcaraz', to: 'Elche de la Sierra', km: 185, terrain: 'hilly' },
      { from: 'Cartagena', to: 'Lorca', km: 156, terrain: 'flat' },
      { from: 'Vera', to: 'Calar Alto', km: 167, terrain: 'mountain' },
      { from: 'Almunecar', to: 'Loja', km: 193, terrain: 'hilly' },
      { from: 'Jaen', to: 'Sierra de la Pandera', km: 153, terrain: 'mountain' },
      { from: 'Palma del Rio', to: 'Cordoba', km: 181, terrain: 'hilly' },
      { from: 'Cortegana', to: 'La Rabida', km: 186, terrain: 'flat' },
      { from: 'Dos Hermanas', to: 'Sevilla', km: 189, terrain: 'flat' },
      { from: 'El Puerto de Santa Maria', to: 'Jerez de la Frontera', km: 33, terrain: 'itt' },
      { from: 'Velez-Malaga', to: 'Penas Blancas', km: 205, terrain: 'mountain' },
      { from: 'La Calahorra', to: 'Collada de Alguacil', km: 187, terrain: 'mountain' },
      { from: 'Granada', to: 'Granada', km: 99, terrain: 'hilly' },
    ],
  },
  'race-portugal': {
    restAfter: [6],
    stages: [
      { from: 'Maia', to: 'Maia', km: 3, terrain: 'itt' },
      { from: 'Viana do Castelo', to: 'Braga', km: 162, terrain: 'hilly' },
      { from: 'Felgueiras', to: 'Fafe', km: 168, terrain: 'hilly' },
      { from: 'Boticas', to: 'Braganca', km: 185, terrain: 'hilly' },
      { from: 'Braganca', to: 'Mondim de Basto', km: 183, terrain: 'mountain' },
      { from: 'Lamego', to: 'Viseu', km: 156, terrain: 'flat' },
      { from: 'Agueda', to: 'Guarda', km: 175, terrain: 'hilly' },
      { from: 'Sabugal', to: 'Covilha', km: 179, terrain: 'mountain' },
      { from: 'Ferreira do Zezere', to: 'Santarem', km: 178, terrain: 'flat' },
      { from: 'Alcobaca', to: 'Alto de Montejunto', km: 174, terrain: 'mountain' },
      { from: 'Lisboa', to: 'Lisboa', km: 17, terrain: 'itt' },
    ],
  },
}

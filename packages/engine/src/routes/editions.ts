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
  'race-basque-country': {
    restAfter: [],
    stages: [
      { from: 'Bilbao', to: 'Bilbao', km: 14, terrain: 'itt' },
      { from: 'Pamplona', to: 'Cuevas de Mendukilo', km: 164, terrain: 'hilly' },
      { from: 'Basauri', to: 'Basauri', km: 153, terrain: 'hilly' },
      { from: 'Galdakao', to: 'Galdakao', km: 167, terrain: 'hilly' },
      { from: 'Eibar', to: 'Eibar', km: 176, terrain: 'mountain' },
      { from: 'Antzuola', to: 'Bergara', km: 135, terrain: 'mountain' },
    ],
  },
  'race-benelux': {
    restAfter: [],
    stages: [
      { from: 'Diest', to: 'Diest', km: 188, terrain: 'flat' },
      { from: 'Blankenberge', to: 'Ardooie', km: 174, terrain: 'flat' },
      { from: 'Celles', to: 'Geraardsbergen', km: 185, terrain: 'cobbles' },
      { from: 'Riemst', to: 'Bilzen-Hoeselt', km: 196, terrain: 'hilly' },
      { from: 'Leuven', to: 'Leuven', km: 178, terrain: 'hilly' },
    ],
  },
  'race-catalonia': {
    restAfter: [],
    stages: [
      { from: 'Sant Feliu de Guixols', to: 'Sant Feliu de Guixols', km: 173, terrain: 'flat' },
      { from: 'Figueres', to: 'Banyoles', km: 167, terrain: 'flat' },
      { from: 'Mont-roig del Camp', to: 'Vila-seca', km: 160, terrain: 'hilly' },
      { from: 'Mataro', to: 'Vallter 2000', km: 173, terrain: 'mountain' },
      { from: "La Seu d'Urgell", to: 'Coll de Pal', km: 155, terrain: 'mountain' },
      { from: 'Berga', to: 'Queralt', km: 158, terrain: 'mountain' },
      { from: 'Barcelona', to: 'Barcelona', km: 95, terrain: 'hilly' },
    ],
  },
  'race-down-under': {
    restAfter: [],
    stages: [
      { from: 'Adelaide', to: 'Adelaide', km: 4, terrain: 'itt' },
      { from: 'Tanunda', to: 'Tanunda', km: 121, terrain: 'flat' },
      { from: 'Norwood', to: 'Uraidla', km: 148, terrain: 'hilly' },
      { from: 'Henley Beach', to: 'Nairne', km: 141, terrain: 'hilly' },
      { from: 'Brighton', to: 'Willunga', km: 131, terrain: 'hilly' },
      { from: 'Stirling', to: 'Stirling', km: 170, terrain: 'hilly' },
    ],
  },
  'race-emirates': {
    restAfter: [],
    stages: [
      { from: 'Madinat Zayed', to: 'Liwa', km: 144, terrain: 'flat' },
      { from: 'Al Hudayriat Island', to: 'Al Hudayriat Island', km: 12, terrain: 'itt' },
      { from: 'Umm Al Quwain', to: 'Jebel Mobrah', km: 182, terrain: 'mountain' },
      { from: 'Fujairah', to: 'Fujairah', km: 182, terrain: 'flat' },
      { from: 'Dubai', to: 'Hamdan Bin Mohammed Smart University', km: 165, terrain: 'flat' },
      { from: 'Al Ain', to: 'Jebel Hafeet', km: 168, terrain: 'mountain' },
      { from: 'Abu Dhabi', to: 'Abu Dhabi', km: 149, terrain: 'flat' },
    ],
  },
  'race-guangxi': {
    restAfter: [],
    stages: [
      { from: 'Fangchenggang', to: 'Fangchenggang', km: 149, terrain: 'flat' },
      { from: 'Chongzuo', to: 'Jingxi', km: 177, terrain: 'hilly' },
      { from: 'Jingxi', to: 'Bama', km: 214, terrain: 'hilly' },
      { from: 'Bama', to: 'Jinchengjiang', km: 177, terrain: 'hilly' },
      { from: 'Yizhou', to: 'Nongla', km: 166, terrain: 'mountain' },
      { from: 'Nanning', to: 'Nanning', km: 134, terrain: 'flat' },
    ],
  },
  'race-poland': {
    restAfter: [],
    stages: [
      { from: 'Gdynia', to: 'Koszalin', km: 234, terrain: 'hilly' },
      { from: 'Miedzyzdroje', to: 'Szczecin', km: 151, terrain: 'flat' },
      { from: 'Gorzow Wielkopolski', to: 'Zielona Gora', km: 194, terrain: 'hilly' },
      { from: 'Zagan', to: 'Karpacz', km: 176, terrain: 'mountain' },
      { from: 'Opole', to: 'Kocierz Resort', km: 219, terrain: 'mountain' },
      { from: 'Bukovina Resort', to: 'Bukowina Tatrzanska', km: 126, terrain: 'mountain' },
      { from: 'Wieliczka', to: 'Wieliczka', km: 12, terrain: 'itt' },
    ],
  },
  'race-rhone-alpes': {
    restAfter: [],
    stages: [
      { from: 'Vizille', to: 'Saint-Ismier', km: 146, terrain: 'mountain' },
      { from: 'Saint-Martin-le-Vinoux', to: 'Le Puy-en-Velay', km: 234, terrain: 'hilly' },
      { from: 'Perreux', to: 'Perreux', km: 28, terrain: 'itt' },
      { from: 'Le Puy-en-Velay', to: 'Montrond-les-Bains', km: 167, terrain: 'hilly' },
      { from: 'Saint-Chamond', to: 'Villars-les-Dombes', km: 196, terrain: 'flat' },
      { from: 'Saint-Vulbas', to: 'Crest-Voland', km: 182, terrain: 'mountain' },
      { from: 'La Bridoire', to: 'Grand Colombier', km: 134, terrain: 'mountain' },
      { from: 'Beaufort', to: 'Plateau de Solaison', km: 120, terrain: 'mountain' },
    ],
  },
  'race-romandy': {
    restAfter: [],
    stages: [
      { from: 'Villars-sur-Glane', to: 'Villars-sur-Glane', km: 3, terrain: 'itt' },
      { from: 'Martigny', to: 'Martigny', km: 171, terrain: 'hilly' },
      { from: 'Rue', to: 'Vucherens', km: 173, terrain: 'hilly' },
      { from: 'Orbe', to: 'Orbe', km: 177, terrain: 'hilly' },
      { from: 'Broc', to: 'Charmey', km: 150, terrain: 'mountain' },
      { from: 'Lucens', to: 'Leysin', km: 178, terrain: 'mountain' },
    ],
  },
  'race-switzerland': {
    restAfter: [],
    stages: [
      { from: 'Sondrio', to: 'Sondrio', km: 144, terrain: 'hilly' },
      { from: 'Locarno', to: 'Locarno', km: 158, terrain: 'hilly' },
      { from: 'Bad Ragaz', to: 'Bad Ragaz', km: 157, terrain: 'hilly' },
      { from: 'Aarburg', to: 'Aarburg', km: 24, terrain: 'itt' },
      { from: 'Villars-sur-Ollon', to: 'Villars-sur-Ollon', km: 151, terrain: 'mountain' },
    ],
  },
  'race-to-the-sun': {
    restAfter: [],
    stages: [
      { from: 'Acheres', to: 'Carrieres-sous-Poissy', km: 171, terrain: 'hilly' },
      { from: 'Epone', to: 'Montargis', km: 187, terrain: 'flat' },
      { from: 'Cosne-Cours-sur-Loire', to: 'Pouilly-sur-Loire', km: 24, terrain: 'itt' },
      { from: 'Bourges', to: 'Uchon', km: 195, terrain: 'mountain' },
      { from: 'Cormoranche-sur-Saone', to: 'Colombier-le-Vieux', km: 206, terrain: 'hilly' },
      { from: 'Barbentane', to: 'Apt', km: 179, terrain: 'hilly' },
      { from: 'Nice', to: 'Isola-Village', km: 139, terrain: 'mountain' },
      { from: 'Nice', to: 'Nice', km: 129, terrain: 'hilly' },
    ],
  },
  'race-two-seas': {
    restAfter: [],
    stages: [
      { from: 'Lido di Camaiore', to: 'Lido di Camaiore', km: 12, terrain: 'itt' },
      { from: 'Camaiore', to: 'San Gimignano', km: 206, terrain: 'hilly' },
      { from: 'Cortona', to: 'Magliano dei Marsi', km: 221, terrain: 'hilly' },
      { from: 'Tagliacozzo', to: 'Martinsicuro', km: 213, terrain: 'hilly' },
      { from: 'Marotta-Mondolfo', to: 'Mombaroccio', km: 186, terrain: 'hilly' },
      { from: 'San Severino Marche', to: 'Camerino', km: 188, terrain: 'mountain' },
      { from: 'Civitanova Marche', to: 'San Benedetto del Tronto', km: 142, terrain: 'flat' },
    ],
  },
}

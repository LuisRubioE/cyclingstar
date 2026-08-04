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
  'race-alentejo': {
    restAfter: [],
    stages: [
      { from: 'Beja', to: 'Moura', km: 167, terrain: 'flat' },
      { from: 'Castro Verde', to: 'Grandola', km: 172, terrain: 'flat' },
      { from: 'Carvalhal', to: 'Arraiolos', km: 182, terrain: 'flat' },
      { from: 'Monforte', to: 'Castelo de Vide', km: 148, terrain: 'hilly' },
      { from: 'Estremoz', to: 'Evora', km: 152, terrain: 'hilly' },
    ],
  },
  'race-algarve': {
    restAfter: [],
    stages: [
      { from: 'Vila Real de Santo Antonio', to: 'Tavira', km: 184, terrain: 'flat' },
      { from: 'Portimao', to: 'Foia', km: 147, terrain: 'mountain' },
      { from: 'Vilamoura', to: 'Vilamoura', km: 20, terrain: 'itt' },
      { from: 'Albufeira', to: 'Lagos', km: 175, terrain: 'hilly' },
      { from: 'Faro', to: 'Malhao', km: 148, terrain: 'mountain' },
    ],
  },
  'race-alps': {
    restAfter: [],
    stages: [
      { from: 'Innsbruck', to: 'Innsbruck', km: 144, terrain: 'mountain' },
      { from: 'Telfs', to: 'Martello', km: 148, terrain: 'mountain' },
      { from: 'Laces', to: 'Arco', km: 175, terrain: 'mountain' },
      { from: 'Arco', to: 'Trento', km: 168, terrain: 'mountain' },
      { from: 'Trento', to: 'Bolzano', km: 129, terrain: 'mountain' },
    ],
  },
  'race-andalusia': {
    restAfter: [],
    stages: [
      { from: 'Benahavis', to: 'Pizarra', km: 150, terrain: 'hilly' },
      { from: 'Torrox', to: 'Otura', km: 139, terrain: 'hilly' },
      { from: 'Jaen', to: 'Lopera', km: 181, terrain: 'flat' },
      { from: 'Montoro', to: 'Pozoblanco', km: 166, terrain: 'flat' },
      { from: 'La Roda de Andalucia', to: 'Lucena', km: 168, terrain: 'hilly' },
    ],
  },
  'race-arabia': {
    restAfter: [],
    stages: [
      { from: 'AlUla Camel Cup Track', to: 'AlUla Camel Cup Track', km: 158, terrain: 'flat' },
      {
        from: 'Al Manshiyah Train Station',
        to: 'Al Manshiyah Train Station',
        km: 152,
        terrain: 'flat',
      },
      { from: 'Winter Park', to: 'Bir Jaydah Mountain Wirkah', km: 142, terrain: 'hilly' },
      { from: 'Winter Park', to: 'Hegra', km: 173, terrain: 'flat' },
      { from: 'AlUla Old Town', to: 'Skyviews of Harrat Uwayrid', km: 164, terrain: 'hilly' },
    ],
  },
  'race-arctic': {
    restAfter: [],
    stages: [
      { from: 'Borkenes', to: 'Harstad', km: 182, terrain: 'hilly' },
      { from: 'Tennevoll', to: 'Sorreisa', km: 167, terrain: 'hilly' },
      { from: 'Husoy', to: 'Malselv', km: 182, terrain: 'mountain' },
      { from: 'Tromso', to: 'Tromso', km: 135, terrain: 'hilly' },
    ],
  },
  'race-asturias': {
    restAfter: [],
    stages: [
      { from: 'Oviedo', to: 'Llanes', km: 164, terrain: 'mountain' },
      { from: 'Benia de Onis', to: 'Pola de Lena', km: 144, terrain: 'mountain' },
      { from: 'Castropol', to: 'Vegadeo', km: 166, terrain: 'hilly' },
      { from: 'Navia', to: 'Oviedo', km: 136, terrain: 'hilly' },
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
  'race-belgium': {
    restAfter: [],
    stages: [
      { from: 'Scherpenheuvel-Zichem', to: 'Scherpenheuvel-Zichem', km: 188, terrain: 'hilly' },
      { from: 'Merelbeke-Melle', to: 'Knokke-Heist', km: 198, terrain: 'flat' },
      { from: 'Durbuy', to: 'Durbuy', km: 173, terrain: 'hilly' },
      { from: 'Begijnendijk-Betekom', to: 'Aarschot', km: 184, terrain: 'flat' },
      { from: 'Gingelom', to: 'Hoeilaart', km: 184, terrain: 'cobbles' },
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
  'race-bretagne': {
    restAfter: [],
    stages: [
      { from: 'Hirel', to: 'La Fresnais', km: 143, terrain: 'flat' },
      { from: 'La Gouesniere', to: 'Le Cambout', km: 182, terrain: 'hilly' },
      { from: 'Loudeac', to: 'Ploneour-Lanvern', km: 206, terrain: 'hilly' },
      { from: 'Ploneour-Lanvern', to: 'Landevant', km: 205, terrain: 'hilly' },
      { from: 'Erdeven', to: 'Guenrouet', km: 164, terrain: 'hilly' },
      { from: 'Missillac', to: 'Le Pertre', km: 180, terrain: 'hilly' },
      { from: 'Landebia', to: 'Plancoet', km: 159, terrain: 'hilly' },
    ],
  },
  'race-britain': {
    restAfter: [],
    stages: [
      { from: 'Woodbridge', to: 'Southwold', km: 168, terrain: 'flat' },
      { from: 'Stowmarket', to: 'Stowmarket', km: 174, terrain: 'flat' },
      { from: 'Milton Keynes', to: 'Ampthill', km: 123, terrain: 'hilly' },
      { from: 'Atherstone', to: 'Burton Dassett', km: 187, terrain: 'hilly' },
      { from: 'Pontypool', to: 'The Tumble', km: 134, terrain: 'mountain' },
      { from: 'Newport', to: 'Cardiff', km: 112, terrain: 'hilly' },
    ],
  },
  'race-burgos': {
    restAfter: [],
    stages: [
      { from: 'Gumiel de Izan', to: 'Burgos', km: 165, terrain: 'hilly' },
      { from: 'Arcos de la Llana', to: 'Pineda de la Sierra', km: 178, terrain: 'mountain' },
      { from: 'Merindad de Montija', to: 'Corconte', km: 184, terrain: 'mountain' },
      { from: 'Palazuelos de Muno', to: 'Briviesca', km: 178, terrain: 'flat' },
      { from: 'Caleruega', to: 'Lagunas de Neila', km: 137, terrain: 'mountain' },
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
  'race-colombia': {
    restAfter: [],
    stages: [
      { from: 'Yopal', to: 'Yopal', km: 206, terrain: 'flat' },
      { from: 'Yopal', to: 'Alto del Porvenir', km: 153, terrain: 'mountain' },
      { from: 'Curisi', to: 'Toquilla', km: 33, terrain: 'itt' },
      { from: 'Duitama', to: 'Duitama', km: 125, terrain: 'hilly' },
      { from: 'Mosquera', to: 'Alto de La Linea', km: 232, terrain: 'mountain' },
      { from: 'Armenia', to: 'Cali', km: 185, terrain: 'flat' },
      { from: 'Cali', to: 'La Tebaida', km: 171, terrain: 'hilly' },
      { from: 'Alvarado', to: 'Alto del Vino', km: 217, terrain: 'mountain' },
      { from: 'Sopo', to: 'Bogota', km: 139, terrain: 'hilly' },
    ],
  },
  'race-croatia': {
    restAfter: [],
    stages: [
      { from: 'Split', to: 'Sinj', km: 163, terrain: 'hilly' },
      { from: 'Biograd na Moru', to: 'Novalja', km: 115, terrain: 'flat' },
      { from: 'Gospic', to: 'Rijeka', km: 151, terrain: 'hilly' },
      { from: 'Krk', to: 'Labin', km: 191, terrain: 'mountain' },
      { from: 'Karlovac', to: 'Sveta Nedelja', km: 151, terrain: 'hilly' },
      { from: 'Samobor', to: 'Zagreb', km: 157, terrain: 'flat' },
    ],
  },
  'race-czechia': {
    restAfter: [],
    stages: [
      { from: 'Prague', to: 'Karlovy Vary', km: 163, terrain: 'hilly' },
      { from: 'Mlada Boleslav', to: 'Jested', km: 155, terrain: 'mountain' },
      { from: 'Pardubice', to: 'Dlouhe strane', km: 171, terrain: 'mountain' },
      { from: 'Kromeriz', to: 'Pustevny', km: 160, terrain: 'mountain' },
    ],
  },
  'race-denmark': {
    restAfter: [],
    stages: [
      { from: 'Nexo', to: 'Ronne', km: 178, terrain: 'hilly' },
      { from: 'Rodovre', to: 'Gladsaxe', km: 111, terrain: 'flat' },
      { from: 'Kerteminde', to: 'Kerteminde', km: 14, terrain: 'itt' },
      { from: 'Svendborg', to: 'Vejle', km: 227, terrain: 'hilly' },
      { from: 'Hobro', to: 'Silkeborg', km: 157, terrain: 'hilly' },
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
  'race-galicia': {
    restAfter: [],
    stages: [
      { from: 'Maia', to: 'Matosinhos', km: 190, terrain: 'flat' },
      { from: 'Marin', to: 'A Estrada', km: 133, terrain: 'hilly' },
      { from: 'Ourense', to: 'O Pereiro de Aguiar', km: 16, terrain: 'itt' },
      { from: 'A Pobra do Brollon', to: 'O Cebreiro', km: 137, terrain: 'mountain' },
      { from: 'Betanzos', to: 'Santiago de Compostela', km: 160, terrain: 'hilly' },
    ],
  },
  'race-germany': {
    restAfter: [],
    stages: [
      { from: 'Essen', to: 'Essen', km: 3, terrain: 'itt' },
      { from: 'Essen', to: 'Herford', km: 203, terrain: 'hilly' },
      { from: 'Herford', to: 'Arnsberg', km: 190, terrain: 'hilly' },
      { from: 'Arnsberg', to: 'Kassel', km: 176, terrain: 'hilly' },
      { from: 'Halle', to: 'Magdeburg', km: 164, terrain: 'flat' },
    ],
  },
  'race-gila': {
    restAfter: [],
    stages: [
      { from: 'Tyrone', to: 'Tyrone', km: 26, terrain: 'itt' },
      { from: 'Silver City', to: 'Mogollon', km: 117, terrain: 'mountain' },
      { from: 'Fort Bayard', to: 'Fort Bayard', km: 123, terrain: 'hilly' },
      { from: 'Silver City', to: 'Silver City', km: 45, terrain: 'flat' },
      { from: 'Silver City', to: 'Silver City', km: 161, terrain: 'mountain' },
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
  'race-guatemala': {
    restAfter: [],
    stages: [
      { from: 'Teculutan', to: 'Puerto Barrios', km: 172, terrain: 'flat' },
      { from: 'Gualan', to: 'El Corcovado', km: 161, terrain: 'mountain' },
      { from: 'Monjas', to: 'Fraijanes', km: 126, terrain: 'mountain' },
      { from: 'Ciudad Vieja', to: 'Coatepeque', km: 192, terrain: 'flat' },
      { from: 'Retalhuleu', to: 'San Rafael Pie de la Cuesta', km: 109, terrain: 'hilly' },
      { from: 'Catarina', to: 'San Juan Ostuncalco', km: 91, terrain: 'mountain' },
      { from: 'San Francisco El Alto', to: 'San Pedro', km: 134, terrain: 'mountain' },
      { from: 'San Juan La Laguna', to: 'Tecpan', km: 128, terrain: 'mountain' },
      { from: 'Chimaltenango', to: 'Antigua Guatemala', km: 200, terrain: 'mountain' },
      { from: 'Villa Linda', to: 'Guatemala City', km: 121, terrain: 'flat' },
    ],
  },
  'race-hainan': {
    restAfter: [],
    stages: [
      { from: 'Qionghai', to: 'Qionghai', km: 90, terrain: 'flat' },
      { from: 'Qionghai', to: 'Lingshui', km: 178, terrain: 'flat' },
      { from: 'Lingshui', to: 'Baoting', km: 213, terrain: 'hilly' },
      { from: 'Baoting', to: 'Dongfang', km: 191, terrain: 'hilly' },
      { from: 'Changjiang', to: 'Sanya', km: 183, terrain: 'flat' },
    ],
  },
  'race-hauts-de-france': {
    restAfter: [],
    stages: [
      { from: 'Lagny-le-Sec', to: 'Laon', km: 178, terrain: 'hilly' },
      { from: 'Glisy', to: 'Lievin', km: 188, terrain: 'flat' },
      { from: 'La Sentinelle', to: 'Wallers-Arenberg', km: 156, terrain: 'cobbles' },
      { from: 'Bergues', to: 'Cassel', km: 166, terrain: 'hilly' },
      { from: 'Saint-Omer', to: 'Dunkerque', km: 184, terrain: 'flat' },
    ],
  },
  'race-hungary': {
    restAfter: [],
    stages: [
      { from: 'Gyula', to: 'Bekescsaba', km: 143, terrain: 'flat' },
      { from: 'Szarvas', to: 'Paks', km: 206, terrain: 'flat' },
      { from: 'Kaposvar', to: 'Szekszard', km: 152, terrain: 'hilly' },
      { from: 'Mohacs', to: 'Pecs', km: 188, terrain: 'mountain' },
      { from: 'Balatonalmadi', to: 'Veszprem', km: 147, terrain: 'hilly' },
    ],
  },
  'race-istria': {
    restAfter: [],
    stages: [
      { from: 'Vrsar', to: 'Vrsar', km: 2, terrain: 'itt' },
      { from: 'Porec', to: 'Funtana', km: 142, terrain: 'hilly' },
      { from: 'Novigrad', to: 'Motovun', km: 132, terrain: 'hilly' },
      { from: 'Pazin', to: 'Umag', km: 118, terrain: 'hilly' },
    ],
  },
  'race-kumano': {
    restAfter: [],
    stages: [
      { from: 'Inami', to: 'Inami', km: 125, terrain: 'hilly' },
      { from: 'Kozagawa', to: 'Kozagawa', km: 128, terrain: 'hilly' },
      { from: 'Kumano', to: 'Kumano', km: 108, terrain: 'mountain' },
      { from: 'Taiji', to: 'Taiji', km: 105, terrain: 'hilly' },
    ],
  },
  'race-langkawi': {
    restAfter: [],
    stages: [
      { from: 'Shah Alam', to: 'Kampar', km: 193, terrain: 'flat' },
      { from: 'Taiping', to: 'Gunung Jerai', km: 146, terrain: 'mountain' },
      { from: 'Sungai Petani', to: 'Kuala Kangsar', km: 190, terrain: 'hilly' },
      { from: 'Tambun', to: 'Cameron Highlands', km: 140, terrain: 'mountain' },
      { from: 'Tapah', to: 'Genting Highlands', km: 126, terrain: 'mountain' },
      { from: 'Pandan Indah', to: 'Rembau', km: 121, terrain: 'hilly' },
      { from: 'Melaka', to: 'Batu Pahat', km: 159, terrain: 'flat' },
      { from: 'Muar', to: 'Putrajaya', km: 184, terrain: 'flat' },
    ],
  },
  'race-loire': {
    restAfter: [],
    stages: [
      { from: 'Blois', to: 'Vouzon', km: 180, terrain: 'flat' },
      { from: 'Chemery', to: 'Saint-Georges-sur-Cher', km: 189, terrain: 'hilly' },
      { from: 'Moree', to: 'Montoire-sur-le-Loir', km: 195, terrain: 'hilly' },
      { from: 'Romorantin', to: 'Romorantin', km: 189, terrain: 'flat' },
      { from: 'Blois', to: 'Blois', km: 98, terrain: 'hilly' },
    ],
  },
  'race-luxembourg': {
    restAfter: [],
    stages: [
      { from: 'Luxembourg', to: 'Luxembourg', km: 153, terrain: 'hilly' },
      { from: 'Remich', to: 'Mamer', km: 168, terrain: 'hilly' },
      { from: 'Mertert', to: 'Vianden', km: 171, terrain: 'hilly' },
      { from: 'Niederanven', to: 'Niederanven', km: 26, terrain: 'itt' },
      { from: 'Mersch', to: 'Luxembourg', km: 176, terrain: 'hilly' },
    ],
  },
  'race-mayenne': {
    restAfter: [],
    stages: [
      { from: 'Laval', to: 'Laval', km: 5, terrain: 'itt' },
      { from: 'Saint-Berthevin', to: 'Chateau-Gontier-sur-Mayenne', km: 172, terrain: 'hilly' },
      { from: 'Aron', to: 'Pre-en-Pail-Saint-Samson', km: 215, terrain: 'hilly' },
      { from: 'Cosse-le-Vivien', to: 'Laval', km: 148, terrain: 'flat' },
    ],
  },
  'race-norway': {
    restAfter: [],
    stages: [
      { from: 'Solakrossen', to: 'Solakrossen', km: 179, terrain: 'flat' },
      { from: 'Egersund', to: 'Oltedal', km: 208, terrain: 'hilly' },
      { from: 'Jorpeland', to: 'Heia', km: 142, terrain: 'hilly' },
      { from: 'Stavanger', to: 'Stavanger', km: 130, terrain: 'hilly' },
    ],
  },
  'race-oman': {
    restAfter: [],
    stages: [
      { from: 'Ministry of Tourism', to: 'Bimmah Sink Hole', km: 171, terrain: 'flat' },
      { from: 'Al Rustaq Fort', to: 'Yitti Hills', km: 191, terrain: 'hilly' },
      { from: 'Samail', to: 'Misfat al Abriyeen', km: 191, terrain: 'hilly' },
      { from: 'Al Sawadi Beach', to: 'Sohar', km: 147, terrain: 'flat' },
      { from: 'Nizwa', to: 'Jabal al Akhdhar', km: 156, terrain: 'mountain' },
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
  'race-qinghai': {
    restAfter: [],
    stages: [
      { from: 'Xining', to: 'Xining', km: 121, terrain: 'flat' },
      { from: 'Duoba', to: 'Huzhu', km: 151, terrain: 'hilly' },
      { from: 'Huzhu', to: 'Menyuan', km: 220, terrain: 'hilly' },
      { from: 'Menyuan', to: 'Qilian', km: 173, terrain: 'mountain' },
      { from: 'Qilian', to: 'Gangcha', km: 169, terrain: 'hilly' },
      { from: 'Gangcha', to: 'Gonghe', km: 233, terrain: 'hilly' },
      { from: 'Gonghe', to: 'Haiyan', km: 137, terrain: 'hilly' },
      { from: 'Xihaizhen', to: 'Xihaizhen', km: 121, terrain: 'hilly' },
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
  'race-rwanda': {
    restAfter: [],
    stages: [
      { from: 'Rukomo', to: 'Rwamagana', km: 174, terrain: 'hilly' },
      { from: 'Nyamata', to: 'Huye', km: 135, terrain: 'hilly' },
      { from: 'Huye', to: 'Rusizi', km: 145, terrain: 'hilly' },
      { from: 'Karongi', to: 'Rubavu', km: 127, terrain: 'hilly' },
      { from: 'Rubavu', to: 'Rubavu', km: 82, terrain: 'flat' },
      { from: 'Rubavu', to: 'Musanze', km: 84, terrain: 'mountain' },
      { from: 'Musanze', to: 'Kigali', km: 147, terrain: 'hilly' },
      { from: 'Kigali', to: 'Kigali', km: 84, terrain: 'hilly' },
    ],
  },
  'race-sardegna': {
    restAfter: [],
    stages: [
      { from: 'Castelsardo', to: 'Bosa', km: 190, terrain: 'hilly' },
      { from: 'Oristano', to: 'Carbonia', km: 136, terrain: 'flat' },
      { from: 'Cagliari', to: 'Tortoli', km: 168, terrain: 'hilly' },
      { from: 'Arbatax', to: 'Nuoro', km: 154, terrain: 'mountain' },
      { from: 'Nuoro', to: 'Olbia', km: 177, terrain: 'hilly' },
    ],
  },
  'race-slovenia': {
    restAfter: [],
    stages: [
      { from: 'Velenje', to: 'Rogaska Slatina', km: 142, terrain: 'hilly' },
      { from: 'Radlje ob Dravi', to: 'Ormoz', km: 177, terrain: 'hilly' },
      { from: 'Maribor', to: 'Celje', km: 137, terrain: 'hilly' },
      { from: 'Kranj', to: 'Kranjska Gora', km: 183, terrain: 'mountain' },
      { from: 'Litija', to: 'Novo Mesto', km: 162, terrain: 'hilly' },
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
  'race-tachira': {
    restAfter: [],
    stages: [
      { from: 'San Cristobal', to: 'Socopo', km: 210, terrain: 'flat' },
      { from: 'Socopo', to: 'San Cristobal', km: 210, terrain: 'hilly' },
      { from: 'San Cristobal', to: 'San Cristobal', km: 117, terrain: 'hilly' },
      { from: 'La Fria', to: 'Merida', km: 163, terrain: 'mountain' },
      { from: 'Merida', to: 'Merida', km: 121, terrain: 'hilly' },
      { from: 'El Vigia', to: 'La Grita', km: 166, terrain: 'mountain' },
      { from: 'Tariba', to: 'San Cristobal', km: 151, terrain: 'hilly' },
      { from: 'Abejales', to: 'Capacho', km: 155, terrain: 'hilly' },
      { from: 'Junin', to: 'Junin', km: 134, terrain: 'hilly' },
      { from: 'Urena', to: 'San Cristobal', km: 99, terrain: 'flat' },
    ],
  },
  'race-taiwan': {
    restAfter: [],
    stages: [
      { from: 'Taipei', to: 'Taipei', km: 81, terrain: 'flat' },
      { from: 'Taoyuan', to: 'Jiaobanshan', km: 123, terrain: 'hilly' },
      { from: 'Fo Guang Shan', to: 'Kaohsiung', km: 146, terrain: 'hilly' },
      { from: 'Gaoshu', to: 'Liudui', km: 131, terrain: 'flat' },
      { from: 'Luye', to: 'Liyu Lake', km: 154, terrain: 'hilly' },
    ],
  },
  'race-thailand': {
    restAfter: [],
    stages: [
      { from: 'Nong Khai', to: 'Nong Khai', km: 109, terrain: 'flat' },
      { from: 'Phon Phisai', to: 'Nong Khai', km: 150, terrain: 'flat' },
      { from: 'Nong Khai', to: 'Phu Foi Lom', km: 142, terrain: 'mountain' },
      { from: 'Nong Khai', to: 'Tha Bo', km: 155, terrain: 'flat' },
      { from: 'Si Chiang Mai', to: 'Si Chiang Mai', km: 136, terrain: 'flat' },
      { from: 'Nong Khai', to: 'Nong Khai', km: 126, terrain: 'flat' },
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
  'race-turkiye': {
    restAfter: [],
    stages: [
      { from: 'Cesme', to: 'Selcuk', km: 149, terrain: 'flat' },
      { from: 'Aydin', to: 'Marmaris', km: 153, terrain: 'hilly' },
      { from: 'Marmaris', to: 'Kiran', km: 133, terrain: 'mountain' },
      { from: 'Marmaris', to: 'Fethiye', km: 130, terrain: 'flat' },
      { from: 'Patara', to: 'Kemer', km: 181, terrain: 'hilly' },
      { from: 'Antalya', to: 'Feslikan', km: 128, terrain: 'mountain' },
      { from: 'Antalya', to: 'Antalya', km: 153, terrain: 'hilly' },
      { from: 'Ankara', to: 'Ankara', km: 105, terrain: 'flat' },
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
  'race-valencia': {
    restAfter: [],
    stages: [
      { from: 'Segorbe', to: 'Torreblanca', km: 160, terrain: 'hilly' },
      { from: 'Carlet', to: 'Alginet', km: 18, terrain: 'itt' },
      { from: 'Orihuela', to: 'San Vicente del Raspeig', km: 158, terrain: 'mountain' },
      { from: 'La Nucia', to: 'Teulada Moraira', km: 172, terrain: 'hilly' },
      { from: 'Betera', to: 'Valencia', km: 95, terrain: 'flat' },
    ],
  },
  'race-wallonia': {
    restAfter: [],
    stages: [
      { from: 'Manage', to: 'Lobbes', km: 181, terrain: 'hilly' },
      { from: 'Jodoigne', to: 'Libramont-Chevigny', km: 192, terrain: 'hilly' },
      { from: 'Habay', to: 'Vaux-sur-Sure', km: 177, terrain: 'hilly' },
      { from: 'Dison', to: 'Eupen', km: 167, terrain: 'hilly' },
      { from: 'Bassenge', to: 'Aubel', km: 177, terrain: 'hilly' },
    ],
  },
}

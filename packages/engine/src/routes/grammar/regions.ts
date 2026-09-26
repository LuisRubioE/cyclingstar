/**
 * REGIONES POR CARRERA Y POR ETAPA (docs/generador.md §3.5 y sección 6 §6.4).
 *
 * `RACE_REGION` dice en qué zona de `ZONAS` corre cada una de las 310 carreras de equipos (las claves
 * de `RACE_ROUTES`) y, en las 60 ediciones reales de `RACE_EDITIONS`, cada etapa que no corre en la
 * zona de la carrera. Es CONTENIDO curado a mano desde las ciudades de `raceRoutes.ts` (§6.4,
 * procedimiento): `default` es la zona de la meta de la primera etapa (si salida y meta son de zonas
 * distintas manda la meta); en las ediciones, la zona de la mayoría de las metas, y `stages` lleva
 * SOLO las etapas cuya meta cae en otra. `skeleton` ata una carrera de un día con meta real en un
 * puerto o un muro a su esqueleto (§6.4, D1). `duda` marca una ciudad no reconocida o un dato que se
 * contradice: se imprime y no veta. Ninguna carrera de equipos pasa por `zonaDe(country)`: solo los
 * 532 nacionales (regions.test.ts).
 *
 * Donde la sección 6 no fija la zona, el comentario de la fila dice la ciudad o el puerto que decide
 * y, si es un proxy (Jura, Vosgos y Lorena en `macizo_central`; el Loira y Normandía en `bretana`;
 * Navarra, Galicia y la Demanda en `cantabrico`; Romaña en `italia_centro`), lo dice. Las filas que
 * la sección 6 escribe literalmente llevan «(§6.4)». Se corrige como dato con la galería (sección 16).
 *
 * Paso 2: nace entero, sin llamadores (los tendrá `generateStage` en el paso 5).
 */
import { zonaDe } from './geo.js'
import type { GeoZone } from './geo.js'
import type { SkeletonId } from './skeletons.js'

export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone> // índice con base 1; solo las 60 ediciones y solo donde difiere de default
  skeleton?: SkeletonId // carrera de un día con meta real en un puerto o muro: único candidato si admite() (§6.4)
  duda?: true // ciudad no reconocida o dato contradictorio: se imprime, no veta
}

export const RACE_REGION: Record<string, RaceRegion> = {
  'race-abruzzo': { default: 'italia_sur' }, // Vasto; Blockhaus en la e4 (§6.4)
  'race-achterhoek': { default: 'flandes' }, // Winterswijk
  'race-across-flanders': { default: 'flandes' }, // Waregem
  'race-aegean': { default: 'anatolia' }, // Selçuk
  'race-agostoni': { default: 'italia_norte' }, // Lissone, Brianza
  'race-ain': { default: 'macizo_central' }, // Oyonnax: Jura (proxy, §6.4)
  'race-alaiye': { default: 'anatolia' }, // Manavgat
  'race-alanya': { default: 'anatolia' }, // Side
  'race-albania': { default: 'balcanes' }, // Durrës
  'race-alentejo': { default: 'portugal' }, // edición: Alentejo entero
  'race-algarve': { default: 'portugal' }, // edición: Fóia, Malhão
  'race-algeria': { default: 'africa_llana' }, // Blida: el Tour d'Algérie corre por la costa (§6.2)
  'race-almeria': { default: 'andalucia' }, // Roquetas de Mar
  'race-alpes-maritimes': { default: 'provenza' }, // Nice: prealpes de Niza (§6.4)
  // Tour of the Alps: Innsbruck y Martello (Ortles) son Alpes; Arco, Trento y Bolzano, Trentino.
  'race-alps': { default: 'dolomitas', stages: { 1: 'alpes', 2: 'alpes' } },
  'race-alsace': { default: 'macizo_central' }, // Colmar: Vosgos (proxy)
  'race-amstel': { default: 'flandes' }, // Valkenburg: Limburgo, bergs (§6.4)
  'race-andalusia': { default: 'andalucia' }, // edición: Pizarra, Otura, Lopera, Pozoblanco, Lucena (§6.4)
  'race-andorra-classic': { default: 'pirineos' }, // Arcalís: meta en la cima; sin esqueleto fijo, D1 solo ata race-mercantour
  'race-andratx': { default: 'levante' }, // Palma: Mallorca
  'race-anicolor': { default: 'portugal' }, // Porto
  'race-annemasse': { default: 'alpes' }, // Annemasse: Genevois, Alta Saboya
  'race-antalya': { default: 'anatolia' }, // Kemer
  'race-antalya-gp': { default: 'anatolia' }, // Side
  'race-antwerp': { default: 'flandes' }, // Antwerpen
  'race-apollon': { default: 'anatolia' }, // Larnaca (CY)
  'race-appennino': { default: 'italia_norte' }, // Genova: Bocchetta, Apenino ligur
  'race-aquitaine': { default: 'francia_norte' }, // Libourne: llano de Aquitania, como Bordeaux en race-france
  'race-arabia': { default: 'golfo' }, // edición: AlUla
  'race-arctic': { default: 'escandinavia' }, // edición: Noruega ártica
  'race-ardeche': { default: 'macizo_central' }, // Aubenas: Ardèche, borde este del Macizo Central
  'race-ardennes': { default: 'ardenas' }, // Huy
  'race-arrabida': { default: 'portugal' }, // Sesimbra
  'race-artois': { default: 'francia_norte' }, // Arras
  'race-arvedi': { default: 'italia_norte' }, // Cremona: llanura del Po
  'race-asturias': { default: 'cantabrico' }, // edición: Llanes, Pola de Lena, Vegadeo, Oviedo (§6.4)
  'race-aulne': { default: 'bretana' }, // Châteaulin
  'race-austria': { default: 'alpes' }, // Zell am See
  'race-aveiro': { default: 'portugal' }, // Ovar
  'race-baku': { default: 'anatolia' }, // Sumqayit (AZ)
  'race-baltic': { default: 'escandinavia' }, // Palanga: Báltico
  'race-basque-country': { default: 'cantabrico' }, // edición: muros vascos (§6.4)
  'race-beauce': { default: 'norteamerica' }, // Saint-Georges, Quebec
  // Baloise Belgium Tour: todo Flandes y Brabante salvo Durbuy (e3), Ardenas.
  'race-belgium': { default: 'flandes', stages: { 3: 'ardenas' } },
  'race-belgrade': { default: 'balcanes' }, // Smederevo
  'race-belvedere': { default: 'italia_norte' }, // Villa Lagarina: Vallagarina, prealpes del Trentino
  'race-benelux': { default: 'flandes' }, // edición: Diest, Ardooie, Geraardsbergen, Bilzen, Leuven
  'race-benin': { default: 'africa_llana' }, // Porto-Novo
  'race-besancon': { default: 'macizo_central' }, // Besançon: Jura (proxy)
  'race-beskid': { default: 'centroeuropa' }, // Szczyrk: Beskides
  'race-beskid-race': { default: 'centroeuropa' }, // Wisła: Beskides
  'race-besseges': { default: 'provenza' }, // Nîmes: garriga del Gard, mistral
  'race-biella': { default: 'italia_norte' }, // Biella
  'race-binche': { default: 'ardenas' }, // Binche: Henao al sur del Sambre (Chimay, Thudinie)
  'race-bosnia': { default: 'balcanes' }, // Sarajevo
  'race-braakman': { default: 'flandes' }, // Terneuzen: Flandes zelandesa
  'race-brabant': { default: 'flandes' }, // Overijse: bergs del Brabante flamenco
  'race-brda': { default: 'centroeuropa' }, // Dobrovo: Goriška Brda, colinas
  'race-bredene': { default: 'flandes' }, // Koksijde: costa
  'race-bretagne': { default: 'bretana' }, // edición: Tour de Bretagne (§6.4)
  'race-britain': { default: 'britanicas' }, // edición: Suffolk, The Tumble, Cardiff
  'race-brittany': { default: 'bretana' }, // edición de un día: Plouay
  'race-bruges': { default: 'flandes' }, // edición de un día: De Panne
  'race-brussels': { default: 'flandes' }, // Brussel: Brabante flamenco
  'race-bulgaria': { default: 'balcanes' }, // Plovdiv
  // Vuelta a Burgos: tres metas en la Demanda y Corconte (proxy `cantabrico`); Burgos y Briviesca, meseta.
  'race-burgos': { default: 'cantabrico', stages: { 1: 'meseta', 4: 'meseta' } },
  'race-calvia': { default: 'levante' }, // Palma: Mallorca
  'race-camembert': { default: 'bretana' }, // Vimoutiers: bocage normando (proxy)
  'race-cameroon': { default: 'africa_llana' }, // Douala
  'race-castellon': { default: 'levante' }, // Valencia
  'race-castilla-leon': { default: 'meseta' }, // Segovia (§6.4)
  // Volta a Catalunya: costa y Barcelona (levante), y Vallter, Coll de Pal y Queralt (Pirineo).
  'race-catalonia': { default: 'levante', stages: { 4: 'pirineos', 5: 'pirineos', 6: 'pirineos' } },
  'race-cerami': { default: 'flandes' }, // Frameries: Henao occidental, llano y adoquín como Flandes
  'race-chauny': { default: 'francia_norte' }, // Chauny: Aisne
  'race-cholet': { default: 'bretana' }, // Cholet: Mauges, bocage del Loira (proxy)
  'race-chrono': { default: 'bretana' }, // Les Herbiers: Vendée (proxy)
  // Vuelta a Colombia: Yopal (e1) está en los Llanos a 350 m; el resto es andino (§6.4).
  'race-colombia': { default: 'andes', stages: { 1: 'generico' } },
  'race-colombia-tour': { default: 'andes' }, // Rionegro: Antioquia a 2.100 m
  'race-communes': { default: 'flandes' }, // La Louvière: Henao, llano
  'race-copenhagen': { default: 'escandinavia' }, // edición de un día: Copenhague
  'race-criquielion': { default: 'flandes' }, // Lessines: Pays des Collines, prolongación de las Ardenas flamencas
  'race-croatia': { default: 'balcanes' }, // edición: Croacia entera
  'race-czechia': { default: 'centroeuropa' }, // edición: Ještěd, Dlouhé stráně, Pustevny
  'race-denain': { default: 'francia_norte' }, // Denain
  'race-denmark': { default: 'escandinavia' }, // edición: Dinamarca entera
  'race-dodecanese': { default: 'balcanes' }, // Rodas (GR)
  'race-doubs': { default: 'macizo_central' }, // Pontarlier: Jura (proxy)
  'race-down-under': { default: 'australia' }, // edición: Tanunda, Willunga (§6.4)
  'race-drome': { default: 'provenza' }, // Valence: Drôme, valle del Ródano con mistral
  'race-dunkerque': { default: 'francia_norte' }, // Dunkerque
  'race-ebre': { default: 'levante' }, // Gandesa: Terres de l'Ebre, sierras litorales
  'race-ecuador': { default: 'andes' }, // Latacunga
  'race-elfsteden': { default: 'flandes' }, // Bolsward: Frisia
  'race-emilia': { default: 'italia_norte' }, // Bologna: Emilia, San Luca
  'race-emilia-gp': { default: 'italia_norte' }, // Modena
  'race-emirates': { default: 'golfo' }, // edición: Liwa, Jebel Hafeet (§6.4)
  'race-estonia': { default: 'escandinavia' }, // Pärnu: Báltico
  'race-estrela': { default: 'portugal' }, // Covilhã: Serra da Estrela
  'race-euro-champs': { default: 'bretana' }, // Plumelec
  'race-fagnes': { default: 'ardenas' }, // Malmedy
  'race-famenne': { default: 'ardenas' }, // Marche-en-Famenne
  'race-faso': { default: 'africa_llana' }, // Koudougou
  'race-figueira': { default: 'portugal' }, // Montemor-o-Velho
  'race-finistere': { default: 'bretana' }, // Quimper
  'race-flanders': { default: 'flandes' }, // Oudenaarde (§6.4)
  'race-flandrien': { default: 'flandes' }, // Oudenaarde
  'race-fleche-ardennaise': { default: 'ardenas' }, // Aywaille
  'race-fleche-sud': { default: 'ardenas' }, // Dudelange (LU)
  'race-fourmies': { default: 'francia_norte' }, // Fourmies: Avesnois
  'race-france': {
    // Tour de France (§6.4): salida en Barcelona, Pirineos, Macizo Central, Vosgos (proxy
    // `macizo_central`, como el Jura), Alpes; el llano de Burdeos a París es `francia_norte`.
    default: 'francia_norte',
    stages: {
      1: 'levante',
      2: 'levante',
      3: 'pirineos',
      4: 'pirineos',
      6: 'pirineos',
      9: 'macizo_central',
      10: 'macizo_central',
      13: 'macizo_central',
      14: 'macizo_central',
      15: 'alpes',
      16: 'alpes',
      17: 'alpes',
      18: 'alpes',
      19: 'alpes',
      20: 'alpes',
    },
  },
  'race-franco-belgian': { default: 'francia_norte' }, // Roubaix
  'race-frankfurt': { default: 'centroeuropa' }, // Frankfurt: Taunus (Feldberg, Mammolshain)
  'race-friuli': { default: 'italia_norte' }, // Udine
  'race-funen': { default: 'escandinavia' }, // Odense
  // O Gran Camiño: sale de Matosinhos (Portugal); Galicia y O Cebreiro, `cantabrico` como proxy.
  'race-galicia': { default: 'cantabrico', stages: { 1: 'portugal' } },
  'race-germany': { default: 'centroeuropa' }, // edición: Alemania entera
  'race-getxo': { default: 'cantabrico' }, // Getxo: Bizkaia
  'race-gila': { default: 'norteamerica' }, // edición: Nuevo México
  'race-gippingen': { default: 'centroeuropa' }, // Bad Zurzach: meseta suiza
  'race-gooik': { default: 'flandes' }, // Gooik: Pajottenland
  'race-great-ocean': { default: 'australia' }, // Torquay
  'race-guangxi': { default: 'asia_oriental' }, // edición: Guangxi, Nongla
  // Vuelta a Guatemala: Puerto Barrios (costa caribe) y Coatepeque (llano del Pacífico) son llanos
  // tropicales, como Yopal en race-colombia; el resto es el altiplano.
  'race-guatemala': { default: 'andes', stages: { 1: 'generico', 4: 'generico' } },
  'race-hainan': { default: 'asia_oriental' }, // edición: Hainan
  'race-halle': { default: 'flandes' }, // Ingooigem
  'race-hamburg': { default: 'centroeuropa' }, // Hamburg: DE solo tiene `centroeuropa`
  'race-harelbeke': { default: 'flandes' }, // Harelbeke
  'race-hauts-de-france': { default: 'francia_norte' }, // edición: Laon, Arenberg, Cassel, Dunkerque
  'race-heist': { default: 'flandes' }, // Heist-op-den-Berg
  'race-hellas': { default: 'balcanes' }, // Thebes
  'race-herning': { default: 'escandinavia' }, // Herning
  'race-holland': { default: 'flandes' }, // Utrecht
  'race-houtland': { default: 'flandes' }, // Lichtervelde
  'race-hungary': { default: 'centroeuropa' }, // edición: Hungría, Mecsek
  'race-huy': { default: 'ardenas', skeleton: 'ud_muro_final' }, // Huy: Mur de Huy (§6.4)
  'race-isbergues': { default: 'francia_norte' }, // Isbergues
  'race-isere': { default: 'alpes' }, // Grenoble
  'race-istanbul': { default: 'anatolia' }, // Gebze
  'race-istria': { default: 'balcanes' }, // edición: Istria croata
  'race-italy': {
    // Giro (§6.4): sale de Bulgaria; el sur (Calabria, Basilicata, Campania, Abruzos, Lazio) es
    // `default`; Marcas y Toscana, `italia_centro`; Emilia (Corno alle Scale), Liguria, Piamonte,
    // Lombardía y Véneto, `italia_norte`; Pila (Aosta) y Carì (Tesino), `alpes`; Andalo, Piani di
    // Pezze y Piancavallo, `dolomitas`.
    default: 'italia_sur',
    stages: {
      1: 'balcanes',
      2: 'balcanes',
      3: 'balcanes',
      8: 'italia_centro',
      9: 'italia_norte',
      10: 'italia_centro',
      11: 'italia_norte',
      12: 'italia_norte',
      13: 'italia_norte',
      14: 'alpes',
      15: 'italia_norte',
      16: 'alpes',
      17: 'dolomitas',
      18: 'italia_norte',
      19: 'dolomitas',
      20: 'dolomitas',
    },
  },
  'race-jaen': { default: 'andalucia' }, // Jaén
  'race-japan': { default: 'asia_oriental' }, // Kyoto
  'race-jura': { default: 'macizo_central' }, // Les Rousses: Jura como proxy (§6.4, caso v40)
  'race-kempen': { default: 'flandes' }, // Turnhout
  'race-koln': { default: 'centroeuropa' }, // Bonn
  'race-korea': { default: 'asia_oriental' }, // Chungju
  'race-kosovo': { default: 'balcanes' }, // Ferizaj
  'race-kranj': { default: 'centroeuropa' }, // Tržič: Gorenjska, al pie de los Karavanke
  'race-kreiz-breizh': { default: 'bretana' }, // Carhaix
  'race-kumano': { default: 'asia_oriental' }, // edición: Kumano
  'race-kuurne': { default: 'flandes' }, // Kuurne
  'race-kyushu': { default: 'asia_oriental' }, // Hita
  'race-laigueglia': { default: 'italia_norte' }, // Laigueglia: Liguria
  'race-langkawi': { default: 'montana_sur' }, // edición: Genting Highlands en la e5 (§6.4)
  'race-lazio': { default: 'italia_sur' }, // Roma: Lazio va con `italia_sur` (§6.2)
  'race-legnano': { default: 'italia_norte' }, // Legnano
  // DUDA: «Race Léon» es Tro Bro Léon (Bretaña, tierra) por el nombre, pero RACE_COUNTRY dice ES y
  // RACE_ROUTES dice León. Manda el dato (país y ciudades), no el nombre (§6.1).
  'race-leon': { default: 'meseta', duda: true },
  'race-liberazione': { default: 'italia_sur' }, // Roma: Lazio
  'race-liege': { default: 'ardenas' }, // Liège (§6.4)
  'race-liege-espoirs': { default: 'ardenas' }, // Liège
  'race-lillers': { default: 'francia_norte' }, // Lillers
  'race-limburg': { default: 'flandes' }, // Valkenburg: Limburgo, como race-amstel
  'race-limousin': { default: 'macizo_central' }, // Saint-Yrieix-la-Perche: Lemosín
  'race-lithuania': { default: 'escandinavia' }, // Trakai: Báltico
  'race-loir-cher': { default: 'bretana' }, // Vendôme: Loira (proxy, como race-tours)
  'race-loire': { default: 'bretana' }, // edición: Sologne y Loira (proxy)
  'race-loire-atlantique': { default: 'bretana' }, // Saint-Nazaire
  'race-lombardy': { default: 'italia_norte' }, // Bergamo (§6.4)
  'race-luxembourg': { default: 'ardenas' }, // edición: Luxemburgo
  'race-lyon': { default: 'macizo_central' }, // Villefranche-sur-Saône: Beaujolais y Lyonnais
  'race-magna-grecia': { default: 'italia_sur' }, // Crotone: Calabria
  'race-malopolska': { default: 'centroeuropa' }, // Tarnów
  'race-maras': { default: 'anatolia' }, // Gaziantep
  'race-marseille': { default: 'provenza' }, // Marseille
  'race-maryland': { default: 'norteamerica' }, // Frederick
  'race-matteotti': { default: 'italia_sur' }, // Pescara: Abruzos
  'race-mauritius': { default: 'africa_llana' }, // Grand Baie
  'race-mayenne': { default: 'bretana' }, // edición: Mayenne (proxy)
  'race-mazury': { default: 'centroeuropa' }, // Mrągowo
  'race-mercantour': { default: 'alpes', skeleton: 'ud_montana_alto' }, // Isola 2000: meta en la cima (§6.4, D1)
  'race-mersin': { default: 'anatolia' }, // Erdemli
  'race-mirabelle': { default: 'macizo_central' }, // Nancy: côtes de Lorena (proxy)
  'race-monsere': { default: 'flandes' }, // Hooglede
  'race-montreal': { default: 'norteamerica' }, // Montréal (§6.4)
  'race-morbihan': { default: 'bretana' }, // Grand-Champ
  'race-morocco': { default: 'montana_sur' }, // Marrakech: Alto Atlas, Oukaïmeden
  'race-morvedre': { default: 'levante' }, // Segorbe: sierra de Espadán
  'race-munster': { default: 'centroeuropa' }, // Telgte
  'race-murcia': { default: 'levante' }, // Cartagena: sierras murcianas
  'race-muscat': { default: 'golfo' }, // Barka
  'race-muur': { default: 'flandes' }, // Geraardsbergen: el Muur
  'race-namur': { default: 'ardenas' }, // Namur: la Citadelle
  'race-navarre': { default: 'cantabrico' }, // Pamplona: Navarra media, proxy `cantabrico`
  'race-nippon': { default: 'asia_oriental' }, // Numazu
  'race-nokere': { default: 'flandes' }, // Nokere
  'race-norway': { default: 'escandinavia' }, // edición: Rogaland
  'race-novo-mesto': { default: 'centroeuropa' }, // Otočec
  'race-nxt': { default: 'flandes' }, // Hoogeveen
  'race-oberosterreich': { default: 'centroeuropa' }, // Wels: Alta Austria fuera de los Alpes
  // Route d'Occitanie: la e1 acaba en Toulouse, pero la carrera es de Luz Ardiden y Peyragudes.
  'race-occitanie': { default: 'pirineos' },
  'race-oise': { default: 'francia_norte' }, // Clermont
  'race-olympia': { default: 'flandes' }, // Nijmegen
  'race-oman': { default: 'golfo' }, // edición: sin puerto en `golfo` (D8)
  'race-ontur': { default: 'meseta' }, // Hellín: La Mancha albaceteña
  'race-opening-classic': { default: 'flandes' }, // Ninove
  'race-ordizia': { default: 'cantabrico' }, // Ordizia: Gipuzkoa
  // Oropa (1.142 m) está en los Alpes Bielleses: meta en la cima del santuario.
  'race-oropa': { default: 'alpes' }, // meta en la cima; sin esqueleto fijo, D1 solo ata race-mercantour
  'race-overijssel': { default: 'flandes' }, // Rijssen
  'race-palma': { default: 'levante' }, // Palma
  'race-pantani': { default: 'italia_centro' }, // Monte Carpegna: Montefeltro (Marcas)
  'race-pascua': { default: 'cantabrico' }, // Estella: Tierra Estella, proxy `cantabrico` como race-navarre
  'race-peccioli': { default: 'italia_centro' }, // Peccioli: Toscana
  'race-pedalia': { default: 'balcanes' }, // Atenas
  'race-philadelphia': { default: 'norteamerica' }, // Philadelphia: el muro de Manayunk
  'race-piedmont': { default: 'italia_norte' }, // Torino
  'race-piva': { default: 'italia_norte' }, // Farra di Soligo: colinas del Prosecco
  'race-plouay': { default: 'bretana' }, // Plouay
  'race-poland': { default: 'centroeuropa' }, // edición: Karpacz, Tatras
  'race-polynormande': { default: 'bretana' }, // Saint-Martin-de-Landelles: Mancha, macizo armoricano
  'race-popolarissima': { default: 'italia_norte' }, // Treviso
  'race-porec': { default: 'balcanes' }, // Poreč: Istria
  'race-portugal': { default: 'portugal' }, // edición: Volta
  'race-poyang': { default: 'asia_oriental' }, // Jiujiang
  'race-prato': { default: 'italia_centro' }, // Prato: Toscana
  'race-provence': { default: 'provenza' }, // Salon-de-Provence
  'race-pune': { default: 'asia_oriental' }, // edición: Pune (IN)
  'race-qinghai': { default: 'asia_oriental' }, // edición: Qinghai
  'race-quebec': { default: 'norteamerica' }, // Québec (§6.4)
  'race-recioto': { default: 'italia_norte' }, // Negrar: Valpolicella
  'race-reggio': { default: 'italia_norte' }, // Reggio Emilia
  'race-rhodes': { default: 'balcanes' }, // Faliraki
  'race-rhodes-gp': { default: 'balcanes' }, // Lindos
  // Critérium du Dauphiné: la mayoría de metas en Velay, Forez, Dombes y Grand Colombier (Jura) va
  // a `macizo_central`; Saint-Ismier, Crest-Voland y Solaison son Alpes.
  'race-rhone-alpes': { default: 'macizo_central', stages: { 1: 'alpes', 6: 'alpes', 8: 'alpes' } },
  'race-ringerike': { default: 'escandinavia' }, // Hønefoss
  'race-romagna': { default: 'italia_centro' }, // Cesenatico: colinas de Romaña, como las Marcas
  'race-romagna-giro': { default: 'italia_centro' }, // Faenza: Romaña
  // Tour de Romandie: empate a tres; manda la montaña (Martigny, Charmey, Leysin) sobre la meseta.
  'race-romandy': {
    default: 'alpes',
    stages: { 1: 'centroeuropa', 3: 'centroeuropa', 4: 'centroeuropa' },
  },
  'race-romania': { default: 'balcanes' }, // Târgu Mureș
  'race-roubaix': { default: 'francia_norte' }, // Roubaix (§6.4)
  'race-roubaix-espoirs': { default: 'francia_norte' }, // Roubaix
  'race-rucphen': { default: 'flandes' }, // Rucphen
  'race-rutland': { default: 'britanicas' }, // Oakham: sectores de tierra (sterrato)
  'race-rwanda': { default: 'montana_sur' }, // edición: Ruanda
  'race-samsun': { default: 'anatolia' }, // Çarşamba
  'race-samyn': { default: 'flandes' }, // Dour: Henao occidental, adoquín
  'race-san-daniele': { default: 'italia_norte' }, // San Daniele del Friuli
  'race-san-sebastian': { default: 'cantabrico' }, // Donostia
  'race-sanremo': { default: 'italia_norte' }, // Sanremo: Cipressa y Poggio (§6.4)
  'race-sardegna': { default: 'italia_sur' }, // edición: Cerdeña va con `italia_sur` (§6.2)
  'race-sauerland': { default: 'centroeuropa' }, // Meschede
  'race-schelde': { default: 'flandes' }, // Schoten
  'race-serbie': { default: 'balcanes' }, // Kragujevac
  'race-ses-salines': { default: 'levante' }, // Sa Calobra: se baja hasta la cala, como race-tramuntana
  'race-sharjah': { default: 'golfo' }, // Ajman
  'race-sibiu': { default: 'balcanes' }, // Mediaș: Cárpatos (Bâlea Lac en la e4)
  'race-slezanski': { default: 'centroeuropa' }, // Sobótka
  'race-slovakia': { default: 'centroeuropa' }, // Trnava
  'race-slovenia': { default: 'centroeuropa', stages: { 4: 'alpes' } }, // edición: Kranjska Gora (e4), Alpes Julianos
  'race-slovenian-istria': { default: 'balcanes' }, // Piran: Istria (fila 3.19, Učka), aunque SI no la tenga en su ruta
  'race-solidarnosc': { default: 'centroeuropa' }, // Piotrków Trybunalski
  'race-somme': { default: 'francia_norte' }, // Amiens
  'race-south-bohemia': { default: 'centroeuropa' }, // Tábor
  'race-spain': {
    // Vuelta: sale de Mónaco y Provenza, cruza el Pirineo oriental, baja por Levante y acaba en
    // Andalucía, que tiene la mayoría de las metas.
    default: 'andalucia',
    stages: {
      1: 'provenza',
      2: 'provenza',
      3: 'pirineos',
      4: 'pirineos',
      5: 'levante',
      6: 'levante',
      7: 'levante',
      8: 'levante',
      9: 'levante',
      10: 'levante',
      11: 'levante',
    },
  },
  'race-sundvolden': { default: 'escandinavia' }, // Norefjell
  'race-surf-coast': { default: 'australia' }, // Geelong
  // Tour de Suisse: todo alpino salvo la crono de Fulenbach (e4), en la meseta.
  'race-switzerland': { default: 'alpes', stages: { 4: 'centroeuropa' } },
  'race-syedra': { default: 'anatolia' }, // Gazipaşa
  'race-szekler': { default: 'balcanes' }, // Miercurea Ciuc: Cárpatos
  // Vuelta al Táchira: Socopó (e1) está en los Llanos de Barinas, como Yopal en race-colombia.
  'race-tachira': { default: 'andes', stages: { 1: 'generico' } },
  'race-taihu': { default: 'asia_oriental' }, // Suzhou
  'race-taiwan': { default: 'asia_oriental' }, // edición: Taiwán
  'race-thailand': { default: 'asia_oriental' }, // edición: Tailandia
  // Paris-Nice: cuenca de París y Loira (e1 a e3), Morvan y Ardèche (e4, e5), Provenza y Niza, Auron.
  'race-to-the-sun': {
    default: 'francia_norte',
    stages: { 4: 'macizo_central', 5: 'macizo_central', 6: 'provenza', 7: 'alpes', 8: 'provenza' },
  },
  'race-torres-vedras': { default: 'portugal' }, // Lourinhã
  'race-toscana': { default: 'italia_centro' }, // Siena
  'race-tourangelle': { default: 'bretana' }, // Tours: Loira (proxy, como race-tours)
  'race-tours': { default: 'bretana' }, // Tours: chemins de vigne de tierra (§6.4)
  'race-tramuntana': { default: 'levante' }, // Sa Calobra (§6.4)
  'race-troyes': { default: 'francia_norte' }, // Troyes: Champaña
  'race-turin': { default: 'italia_norte' }, // Torino: Superga
  'race-turkiye': { default: 'anatolia' }, // edición: Turquía
  // Tirreno-Adriático: Toscana y Marcas; Magliano dei Marsi y Martinsicuro (e3, e4) son Abruzos.
  'race-two-seas': { default: 'italia_centro', stages: { 3: 'italia_sur', 4: 'italia_sur' } },
  'race-umag': { default: 'balcanes' }, // Umag: Istria
  'race-valencia': { default: 'levante' }, // edición: Comunitat Valenciana
  'race-valencia-gp': { default: 'levante' }, // Valencia
  'race-var': { default: 'provenza' }, // Draguignan
  'race-varese': { default: 'italia_norte' }, // Varese
  'race-veenendaal': { default: 'flandes' }, // Veenendaal
  'race-vendee': { default: 'bretana' }, // La Roche-sur-Yon: Vendée (proxy)
  'race-vendemiano': { default: 'italia_norte' }, // San Vendemiano
  'race-veneto': { default: 'italia_norte' }, // Vicenza: colinas Béricas
  'race-veneto-classic': { default: 'italia_norte' }, // Bassano del Grappa: tierra y adoquín urbano (§6.2)
  'race-venezuela': { default: 'andes' }, // La Fría: Táchira; el resto de metas, Andes de Mérida
  'race-victoria': { default: 'australia' }, // Sorrento
  'race-visegrad-cz': { default: 'centroeuropa' }, // Blansko
  'race-vitre': { default: 'bretana' }, // Vitré
  'race-vlaanderen': { default: 'flandes' }, // Gent
  'race-vorarlberg': { default: 'alpes' }, // Bludenz: al pie del Montafon
  'race-waasland': { default: 'flandes' }, // Lokeren
  'race-wallonia': { default: 'ardenas' }, // edición: Valonia entera
  'race-wallonie-circuit': { default: 'ardenas' }, // Namur
  'race-walloon-wall': { default: 'ardenas' }, // Huy: real (classicRoutes.ts), la fila solo etiqueta (§6.4)
  'race-west-bohemia': { default: 'centroeuropa' }, // Karlovy Vary
  'race-wevelgem': { default: 'flandes' }, // Wevelgem
  'race-white-roads': { default: 'italia_centro' }, // Siena: sterrato (§6.4)
  'race-woensdrecht': { default: 'flandes' }, // Woensdrecht
  'race-youngster': { default: 'flandes' }, // Koksijde
  'race-zaglebie': { default: 'centroeuropa' }, // Dąbrowa Górnicza
  'race-zlm': { default: 'flandes' }, // Weert
  'race-zwolle': { default: 'flandes' }, // Zwolle
}

/** La zona de la etapa `stageIndex` (base 1): la de la etapa si está curada, la de la carrera si no y, solo para los .NC, la del país. */
export function regionOf(raceId: string, stageIndex: number, country: string | null): GeoZone {
  return (
    RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
  )
}

/**
 * Los 20 ids con `terrain: 'cobbles'` en las tablas de calendar.ts (grep), `race-leon` incluida: una
 * sola lista para el test (d) de §6.8 y la galería (sección 16). Es DATO: regions.test.ts la compara
 * con el grep del fuente.
 */
export const COBBLES_IDS: readonly string[] = [
  'race-across-flanders',
  'race-antwerp',
  'race-bruges',
  'race-denain',
  'race-flanders',
  'race-flandrien',
  'race-harelbeke',
  'race-kuurne',
  'race-leon',
  'race-muur',
  'race-nokere',
  'race-opening-classic',
  'race-roubaix',
  'race-roubaix-espoirs',
  'race-rutland',
  'race-samyn',
  'race-tours',
  'race-veneto-classic',
  'race-wevelgem',
  'race-youngster',
]

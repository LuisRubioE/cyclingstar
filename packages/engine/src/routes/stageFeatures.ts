/**
 * RASGOS REALES de las etapas (puertos puntuables y sprints intermedios reales) para las carreras
 * documentadas al detalle. De aquí sale una altimetría FIEL: cada puerto en su km real, con su longitud
 * y pendiente (de las que el motor deriva su categoría), y cada meta volante en su sitio. Las etapas sin
 * rasgos aquí caen al perfil por terreno (verosímil, no real).
 *
 * Mantenido desde los datos VERIFICADOS de cada carrera (perfiles oficiales / PCS-La Flamme Rouge). Un
 * puerto solo se anota si tiene km de cima + longitud + pendiente (si no, se descarta: no se inventa su
 * posición). Los km de cima salen del eje del perfil real; la categoría es la OFICIAL (ESP -> 'HC').
 * Clave: id de carrera -> array indexado por etapa (0-based); null = etapa con perfil por terreno.
 */
import type { StageFeatures } from './featureProfile.js'

export const STAGE_FEATURES: Record<string, (StageFeatures | null)[]> = {
  'race-france': [
    null,
    {
      climbs: [
        { name: 'Cote de Begues', summitKm: 93, lengthKm: 6.1, avgGradient: 6.5, category: 'cat3' },
        {
          name: "Cote de Santa Creu d'Olorda",
          summitKm: 132,
          lengthKm: 8.4,
          avgGradient: 4.5,
          category: 'cat3',
        },
        {
          name: 'Cote du Chateau de Montjuic',
          summitKm: 148,
          lengthKm: 1.3,
          avgGradient: 9.3,
          category: 'cat4',
        },
        {
          name: 'Cote du Chateau de Montjuic',
          summitKm: 158,
          lengthKm: 1.3,
          avgGradient: 9.3,
          category: 'cat4',
        },
        {
          name: 'Cote du Chateau de Montjuic',
          summitKm: 166,
          lengthKm: 1.3,
          avgGradient: 9.3,
          category: 'cat4',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Cote de Sant Feliu de Codines',
          summitKm: 42,
          lengthKm: 7.6,
          avgGradient: 4.6,
          category: 'cat3',
        },
        { name: 'Col de Toses', summitKm: 128, lengthKm: 9.3, avgGradient: 6.6, category: 'cat1' },
        {
          name: 'Col du Calvaire',
          summitKm: 165,
          lengthKm: 11.4,
          avgGradient: 4.1,
          category: 'cat3',
        },
        { name: 'Les Angles', summitKm: 196, lengthKm: 4.7, avgGradient: 4.6, category: 'cat3' },
      ],
    },
    {
      climbs: [
        { name: 'Col de Bedos', summitKm: 40, lengthKm: 3.3, avgGradient: 4.4, category: 'cat4' },
        { name: 'Col du Paradis', summitKm: 60, lengthKm: 5.8, avgGradient: 4.1, category: 'cat3' },
        {
          name: 'Col de Coudons',
          summitKm: 118,
          lengthKm: 10.7,
          avgGradient: 5.5,
          category: 'cat2',
        },
        {
          name: 'Col de Montsegur',
          summitKm: 146,
          lengthKm: 6.9,
          avgGradient: 6.6,
          category: 'cat2',
        },
      ],
    },
    null,
    {
      climbs: [
        {
          name: 'Cote de Loucrup',
          summitKm: 25,
          lengthKm: 1.9,
          avgGradient: 7.1,
          category: 'cat4',
        },
        { name: 'Cote de Mauvezin', summitKm: 42, lengthKm: 3, avgGradient: 6.8, category: 'cat3' },
        { name: "Col d'Aspin", summitKm: 118, lengthKm: 12, avgGradient: 6.5, category: 'cat1' },
        {
          name: 'Col du Tourmalet',
          summitKm: 148,
          lengthKm: 17.1,
          avgGradient: 7.3,
          category: 'HC',
        },
        {
          name: 'Gavarnie-Gedre',
          summitKm: 186,
          lengthKm: 18.7,
          avgGradient: 3.7,
          category: 'cat2',
        },
      ],
    },
    null,
    null,
    {
      climbs: [
        { name: 'Suc au May', summitKm: 105, lengthKm: 3.9, avgGradient: 7.7, category: 'cat2' },
        { name: 'Mont Bessou', summitKm: 161, lengthKm: 1, avgGradient: 8.5, category: 'cat4' },
      ],
    },
    {
      climbs: [
        {
          name: 'Cote de Pailherols',
          summitKm: 68,
          lengthKm: 3.3,
          avgGradient: 6.5,
          category: 'cat3',
        },
        {
          name: 'Col de la Griffoul',
          summitKm: 97,
          lengthKm: 5.9,
          avgGradient: 6.7,
          category: 'cat2',
        },
        {
          name: 'Col de Prat de Bouc',
          summitKm: 104,
          lengthKm: 3.2,
          avgGradient: 5.8,
          category: 'cat3',
        },
        { name: 'Cote de Murat', summitKm: 119, lengthKm: 6.6, avgGradient: 4.4, category: 'cat3' },
        { name: 'Col de Pertus', summitKm: 152, lengthKm: 4.4, avgGradient: 8.5, category: 'cat1' },
        {
          name: 'Montee du Lioran',
          summitKm: 164,
          lengthKm: 0.9,
          avgGradient: 7.4,
          category: 'cat3',
        },
      ],
    },
    null,
    null,
    {
      climbs: [
        { name: 'Col des Croix', summitKm: 157, lengthKm: 5.1, avgGradient: 4.6, category: 'cat3' },
        {
          name: "Ballon d'Alsace",
          summitKm: 176,
          lengthKm: 8.9,
          avgGradient: 6.8,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        { name: 'Grand Ballon', summitKm: 52, lengthKm: 21.5, avgGradient: 4.8, category: 'cat1' },
        { name: 'Col du Page', summitKm: 100, lengthKm: 9.8, avgGradient: 4.7, category: 'cat2' },
        {
          name: "Ballon d'Alsace",
          summitKm: 125,
          lengthKm: 8.9,
          avgGradient: 6.9,
          category: 'cat1',
        },
        { name: 'Col du Haag', summitKm: 143, lengthKm: 11.2, avgGradient: 7.3, category: 'cat1' },
      ],
    },
    {
      climbs: [
        {
          name: 'Col de la Croisette',
          summitKm: 134,
          lengthKm: 4.6,
          avgGradient: 11.2,
          category: 'cat1',
        },
        {
          name: 'Plateau de Solaison',
          summitKm: 184,
          lengthKm: 11.3,
          avgGradient: 9.1,
          category: 'HC',
        },
      ],
    },
    null,
    {
      climbs: [
        { name: 'Cote de Bassa', summitKm: 19, lengthKm: 1.5, avgGradient: 5.6, category: 'cat4' },
        { name: 'Col des Pres', summitKm: 50, lengthKm: 3.5, avgGradient: 6.8, category: 'cat3' },
        { name: 'Col de Couz', summitKm: 60, lengthKm: 8.6, avgGradient: 2.8, category: 'cat4' },
      ],
    },
    {
      climbs: [
        { name: "Cote d'Engins", summitKm: 37, lengthKm: 11.4, avgGradient: 5.4, category: 'cat1' },
        {
          name: 'Cote de Monteynard',
          summitKm: 92,
          lengthKm: 9.7,
          avgGradient: 5,
          category: 'cat2',
        },
        {
          name: 'Cote des Terrasses',
          summitKm: 113,
          lengthKm: 3.4,
          avgGradient: 6.6,
          category: 'cat3',
        },
        {
          name: 'Cote de Saint-Leger-les-Melezes',
          summitKm: 166,
          lengthKm: 2.5,
          avgGradient: 6.9,
          category: 'cat3',
        },
        {
          name: 'Orcieres-Merlette',
          summitKm: 185,
          lengthKm: 7.1,
          avgGradient: 6.7,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        { name: 'Col Bayard', summitKm: 9, lengthKm: 4.7, avgGradient: 7.2, category: 'cat2' },
        { name: 'Col du Noyer', summitKm: 25, lengthKm: 7.2, avgGradient: 8.5, category: 'cat1' },
        { name: "Col d'Ornon", summitKm: 99, lengthKm: 5.4, avgGradient: 6.4, category: 'cat2' },
        { name: "Alpe d'Huez", summitKm: 128, lengthKm: 13.8, avgGradient: 8.1, category: 'HC' },
      ],
    },
    {
      climbs: [
        {
          name: 'Col de la Croix de Fer',
          summitKm: 30,
          lengthKm: 24,
          avgGradient: 5.2,
          category: 'HC',
        },
        {
          name: 'Col du Telegraphe',
          summitKm: 90,
          lengthKm: 11.9,
          avgGradient: 7.1,
          category: 'cat1',
        },
        {
          name: 'Col du Galibier',
          summitKm: 110,
          lengthKm: 17.7,
          avgGradient: 6.9,
          category: 'HC',
        },
        { name: 'Col de Sarenne', summitKm: 150, lengthKm: 12.8, avgGradient: 7.3, category: 'HC' },
        { name: "Alpe d'Huez", summitKm: 171, lengthKm: 13.8, avgGradient: 8.1, category: 'HC' },
      ],
      sprints: [{ name: 'Saint-Julien-Mont-Denis', km: 78 }],
    },
  ],
  'race-galicia': [
    {
      climbs: [
        { name: 'Alto de Feitos', summitKm: 51, lengthKm: 6, avgGradient: 4.2 },
        { name: 'Alto de Sao Felix', summitKm: 144, lengthKm: 1.3, avgGradient: 6.9 },
      ],
      sprints: [{ name: 'Barroselas', km: 67 }],
    },
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
      sprints: [
        { name: 'Barro', km: 16 },
        { name: 'A Estrada', km: 74 },
      ],
    },
    null,
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
    {
      climbs: [
        { name: 'Repecho inicial', summitKm: 14, lengthKm: 4.2, avgGradient: 6.4 },
        { name: 'Alto de Lampai', summitKm: 105, lengthKm: 5.2, avgGradient: 5.4 },
        { name: 'Alto de Lampai', summitKm: 150, lengthKm: 5.2, avgGradient: 5.4 },
      ],
    },
  ],
  'race-italy': [
    null,
    {
      climbs: [
        { name: 'Byala Pass', summitKm: 138, lengthKm: 7.7, avgGradient: 4.6, category: 'cat3' },
        { name: 'Vratnik Pass', summitKm: 151, lengthKm: 9.2, avgGradient: 4, category: 'cat3' },
        {
          name: 'Lyaskovets Monastery Pass',
          summitKm: 210,
          lengthKm: 3.9,
          avgGradient: 6.8,
          category: 'cat3',
        },
      ],
    },
    null,
    null,
    {
      climbs: [
        { name: 'Prestieri', summitKm: 27, lengthKm: 13.6, avgGradient: 4.8, category: 'cat3' },
        {
          name: 'Montagna Grande di Viggiano',
          summitKm: 154,
          lengthKm: 6.6,
          avgGradient: 9.1,
          category: 'cat2',
        },
      ],
    },
    null,
    {
      climbs: [
        { name: 'Roccaraso', summitKm: 166, lengthKm: 6.9, avgGradient: 6.5, category: 'cat2' },
        { name: 'Blockhaus', summitKm: 244, lengthKm: 13.6, avgGradient: 8.4, category: 'cat1' },
      ],
    },
    null,
    {
      climbs: [
        { name: 'Querciola', summitKm: 160, lengthKm: 11.3, avgGradient: 4.3, category: 'cat3' },
        {
          name: 'Corno alle Scale',
          summitKm: 184,
          lengthKm: 10.8,
          avgGradient: 6.1,
          category: 'cat1',
        },
      ],
    },
    null,
    null,
    null,
    null,
    {
      climbs: [
        {
          name: 'Col du Saint-Barthelemy',
          summitKm: 18,
          lengthKm: 15.8,
          avgGradient: 6.1,
          category: 'cat1',
        },
        { name: 'Doues', summitKm: 62, lengthKm: 5.8, avgGradient: 6.2, category: 'cat3' },
        { name: 'Lin Noir', summitKm: 82, lengthKm: 7.4, avgGradient: 7.9, category: 'cat1' },
        { name: 'Verrogne', summitKm: 92, lengthKm: 5.6, avgGradient: 6.9, category: 'cat2' },
        { name: 'Pila-Gressan', summitKm: 133, lengthKm: 16.5, avgGradient: 7.1, category: 'cat1' },
      ],
    },
    null,
    {
      climbs: [
        { name: 'Torre', summitKm: 32, lengthKm: 4.7, avgGradient: 5.6, category: 'cat3' },
        { name: 'Leontica', summitKm: 44, lengthKm: 3, avgGradient: 8.5, category: 'cat2' },
        { name: 'Torre', summitKm: 54, lengthKm: 4.7, avgGradient: 5.6, category: 'cat3' },
        { name: 'Leontica', summitKm: 66, lengthKm: 3, avgGradient: 8.5, category: 'cat2' },
        { name: 'Cari', summitKm: 113, lengthKm: 11.7, avgGradient: 7.9, category: 'cat1' },
      ],
    },
    null,
    {
      climbs: [
        {
          name: "Muro di Ca' del Poggio",
          summitKm: 162,
          lengthKm: 1.1,
          avgGradient: 12.3,
          category: 'cat4',
        },
      ],
    },
    {
      climbs: [
        { name: 'Passo Duran', summitKm: 59, lengthKm: 12.1, avgGradient: 8.2, category: 'cat1' },
        { name: 'Coi', summitKm: 73, lengthKm: 5.8, avgGradient: 9.7, category: 'cat2' },
        {
          name: 'Forcella Staulanza',
          summitKm: 82,
          lengthKm: 6.3,
          avgGradient: 6.7,
          category: 'cat2',
        },
        { name: 'Passo Giau', summitKm: 102, lengthKm: 9.9, avgGradient: 9.3, category: 'HC' },
        {
          name: 'Passo Falzarego',
          summitKm: 122,
          lengthKm: 10.1,
          avgGradient: 5.6,
          category: 'cat2',
        },
        {
          name: 'Piani di Pezze',
          summitKm: 151,
          lengthKm: 4.9,
          avgGradient: 9.7,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        { name: 'Clauzetto', summitKm: 86, lengthKm: 6.9, avgGradient: 5.7, category: 'cat3' },
        { name: 'Piancavallo', summitKm: 147, lengthKm: 11.1, avgGradient: 7, category: 'cat1' },
        { name: 'Piancavallo', summitKm: 200, lengthKm: 14.5, avgGradient: 7.8, category: 'cat1' },
      ],
    },
  ],
  'race-spain': [
    null,
    {
      climbs: [
        {
          name: 'Alto Chateauneuf-Grasse',
          summitKm: 44.4,
          lengthKm: 11.5,
          avgGradient: 3.0,
          category: 'cat3',
        },
        {
          name: 'Col de Saint Andrieu',
          summitKm: 106,
          lengthKm: 4.3,
          avgGradient: 5.2,
          category: 'cat3',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Col de Mont-Louis',
          summitKm: 148.1,
          lengthKm: 19.0,
          avgGradient: 5.0,
          category: 'cat1',
        },
        {
          name: 'Font-Romeu',
          summitKm: 166.7,
          lengthKm: 9.8,
          avgGradient: 4.9,
          category: 'cat2',
        },
      ],
    },
    {
      climbs: [
        {
          name: "Port d'Envalira",
          summitKm: 26,
          lengthKm: 24.4,
          avgGradient: 5.0,
          category: 'cat1',
        },
        {
          name: 'Collada de Beixalis',
          summitKm: 60,
          lengthKm: 6.5,
          avgGradient: 8.6,
          category: 'cat1',
        },
        {
          name: "Coll d'Ordino",
          summitKm: 79.2,
          lengthKm: 9.9,
          avgGradient: 7.0,
          category: 'cat1',
        },
        {
          name: 'Alto de La Comella',
          summitKm: 101,
          lengthKm: 3.8,
          avgGradient: 5.4,
          category: 'cat3',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Alto de Pauls',
          summitKm: 147.5,
          lengthKm: 3.9,
          avgGradient: 6.6,
          category: 'cat3',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto de La Serratella',
          summitKm: 40,
          lengthKm: 11.5,
          avgGradient: 4.8,
          category: 'cat2',
        },
        {
          name: 'Coll de la Bandereta',
          summitKm: 63,
          lengthKm: 4.6,
          avgGradient: 6.6,
          category: 'cat3',
        },
        {
          name: 'Alto del Desierto de las Palmas',
          summitKm: 124,
          lengthKm: 7.2,
          avgGradient: 5.2,
          category: 'cat2',
        },
        {
          name: 'Alto del Bartolo',
          summitKm: 151,
          lengthKm: 9.1,
          avgGradient: 7.2,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto El Remolcador',
          summitKm: 52.5,
          lengthKm: 12,
          avgGradient: 4.4,
          category: 'cat2',
        },
        {
          name: 'Alto de Zucaina',
          summitKm: 66.5,
          lengthKm: 5.3,
          avgGradient: 4.8,
          category: 'cat3',
        },
        {
          name: 'Alto Fuente de Rubielos',
          summitKm: 103.5,
          lengthKm: 6.1,
          avgGradient: 6.1,
          category: 'cat3',
        },
        {
          name: 'Puerto de San Rafael',
          summitKm: 133.5,
          lengthKm: 9.5,
          avgGradient: 4.4,
          category: 'cat2',
        },
        {
          name: 'Aramon Valdelinares',
          summitKm: 149.9,
          lengthKm: 8.3,
          avgGradient: 6.5,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto de Barx',
          summitKm: 147,
          lengthKm: 8.6,
          avgGradient: 3.8,
          category: 'cat2',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto de Tarbena',
          summitKm: 36.5,
          lengthKm: 6.7,
          avgGradient: 5.4,
          category: 'cat2',
        },
        {
          name: 'Puerto de El Miserat',
          summitKm: 74.5,
          lengthKm: 5,
          avgGradient: 10.1,
          category: 'cat1',
        },
        {
          name: 'Port de Tollos',
          summitKm: 91.3,
          lengthKm: 4,
          avgGradient: 5.7,
          category: 'cat3',
        },
        {
          name: 'Port de Tudons',
          summitKm: 122.5,
          lengthKm: 11.7,
          avgGradient: 4,
          category: 'cat2',
        },
        {
          name: 'Port de Benifallim',
          summitKm: 141,
          lengthKm: 4.8,
          avgGradient: 5.9,
          category: 'cat3',
        },
        {
          name: 'Alto de Aitana',
          summitKm: 187.5,
          lengthKm: 21,
          avgGradient: 5.8,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto del Peralejo',
          summitKm: 47,
          lengthKm: 4.9,
          avgGradient: 4.5,
          category: 'cat3',
        },
        {
          name: 'Puerto de Ayna',
          summitKm: 88,
          lengthKm: 8.1,
          avgGradient: 4.0,
          category: 'cat3',
        },
        {
          name: 'Puerto de Socovos',
          summitKm: 154.5,
          lengthKm: 9.8,
          avgGradient: 3.5,
          category: 'cat3',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Alto del Morrion de Totana',
          summitKm: 120,
          lengthKm: 8.8,
          avgGradient: 4.3,
          category: 'cat3',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto Los Barrancos',
          summitKm: 19,
          lengthKm: 4.9,
          avgGradient: 3.9,
          category: 'cat3',
        },
        {
          name: 'Puerto de la Virgen',
          summitKm: 57.5,
          lengthKm: 3.7,
          avgGradient: 5.2,
          category: 'cat3',
        },
        {
          name: 'Collado Garcia',
          summitKm: 88.5,
          lengthKm: 18.9,
          avgGradient: 2.4,
          category: 'cat2',
        },
        {
          name: 'Alto de Velefique',
          summitKm: 135,
          lengthKm: 11,
          avgGradient: 7.0,
          category: 'cat1',
        },
        {
          name: 'Calar Alto',
          summitKm: 166.5,
          lengthKm: 17.1,
          avgGradient: 5.6,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Venta de la Cebada',
          summitKm: 25,
          lengthKm: 14.1,
          avgGradient: 5.1,
          category: 'cat1',
        },
        {
          name: 'Puerto Las Albunuelas',
          summitKm: 43,
          lengthKm: 2.3,
          avgGradient: 9.2,
          category: 'cat2',
        },
        {
          name: 'Alto del Legionario',
          summitKm: 100,
          lengthKm: 9.3,
          avgGradient: 3.4,
          category: 'cat2',
        },
        {
          name: 'Puerto de Granada',
          summitKm: 154,
          lengthKm: 6.7,
          avgGradient: 6.1,
          category: 'cat2',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puertoviejo',
          summitKm: 90,
          lengthKm: 11.3,
          avgGradient: 5.3,
          category: 'cat2',
        },
        {
          name: 'Puerto de Locubin',
          summitKm: 129,
          lengthKm: 9,
          avgGradient: 5.0,
          category: 'cat2',
        },
        {
          name: 'Sierra de La Pandera',
          summitKm: 152.7,
          lengthKm: 8.5,
          avgGradient: 7.9,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto del Mojon Blanco',
          summitKm: 37,
          lengthKm: 7.5,
          avgGradient: 4.4,
          category: 'cat3',
        },
        {
          name: 'Alto de Villaviciosa de Cordoba',
          summitKm: 126,
          lengthKm: 8.4,
          avgGradient: 3.5,
          category: 'cat3',
        },
        {
          name: 'Puerto Artafi',
          summitKm: 156,
          lengthKm: 5.9,
          avgGradient: 5.5,
          category: 'cat3',
        },
      ],
    },
    null,
    null,
    null,
    {
      climbs: [
        {
          name: 'Puerto de las Abejas',
          summitKm: 88,
          lengthKm: 14.4,
          avgGradient: 4.3,
          category: 'cat2',
        },
        {
          name: 'Puerto de los Empedrados',
          summitKm: 101,
          lengthKm: 7.1,
          avgGradient: 5.8,
          category: 'cat3',
        },
        {
          name: 'Puerto Cerro Mojon',
          summitKm: 138,
          lengthKm: 14.8,
          avgGradient: 2.9,
          category: 'cat3',
        },
        {
          name: 'Penas Blancas',
          summitKm: 205.1,
          lengthKm: 18.7,
          avgGradient: 6.5,
          category: 'cat1',
        },
      ],
    },
    {
      climbs: [
        {
          name: 'Puerto de Blancares',
          summitKm: 52.5,
          lengthKm: 9.3,
          avgGradient: 3.4,
          category: 'cat3',
        },
        {
          name: 'Alto de Hazallanas',
          summitKm: 90.5,
          lengthKm: 7.1,
          avgGradient: 9.5,
          category: 'cat1',
        },
        {
          name: 'Puerto de El Purche',
          summitKm: 128.3,
          lengthKm: 9.1,
          avgGradient: 7.4,
          category: 'cat1',
        },
        {
          name: 'Alto de Hazallanas',
          summitKm: 155.6,
          lengthKm: 7.1,
          avgGradient: 9.5,
          category: 'cat1',
        },
        {
          name: 'Collado del Alguacil',
          summitKm: 187,
          lengthKm: 8.3,
          avgGradient: 9.8,
          category: 'HC',
        },
      ],
    },
  ],
}

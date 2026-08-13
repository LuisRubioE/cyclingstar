# Inventario de recorridos

Qué etapa del calendario corre sobre un trazado REAL y cuál sobre uno inventado.

> Este documento LO GENERA `scripts/inventario-recorridos.mjs` desde el propio calendario del
> motor. No se edita a mano: se regenera (`node scripts/inventario-recorridos.mjs --doc >
docs/inventario-recorridos.md`) cuando se carga un recorrido nuevo, y así no envejece.

## Las tres procedencias

|                 | Qué es real                                                                                                                                      | Qué no                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Real**        | Puertos, sectores de adoquín y metas volantes **en su kilómetro**, con la fuente anotada en `docs/fuentes-recorridos.md`. La altimetría es fiel. | —                                                                                                                    |
| **Sin validar** | Salida, meta, kilómetros y terreno vienen de una edición verificada (`RACE_EDITIONS`).                                                           | El RELIEVE se genera por terreno: la etapa dura lo que debe y va de donde va, pero **sus puertos no son los suyos**. |
| **Inventado**   | Solo las localidades de salida y meta (`RACE_ROUTES`), que sí son geografía de verdad.                                                           | Todo lo demás: la composición de etapas la genera `stageMix` y el relieve `profileGen`. Verosímil, no real.          |

## El recuento

| Nivel           | Etapas |       Real | Sin validar |   Inventado |
| --------------- | -----: | ---------: | ----------: | ----------: |
| **WorldTour**   |    161 | 139 (86 %) |   19 (12 %) |     3 (2 %) |
| **ProSeries**   |    174 |  17 (10 %) |  122 (70 %) |   35 (20 %) |
| **Continental** |   1083 |    9 (1 %) |    94 (9 %) |  980 (90 %) |
| **TOTAL**       |   1418 | 165 (12 %) |  235 (17 %) | 1018 (72 %) |

De las continentales inventadas, **532** son campeonatos nacionales: una prueba por país y categoría, sin recorrido publicado que cargar.

## WorldTour

El circuito de arriba. Es donde se ha cargado casi todo lo real.

### Race Down Under (AU)

WT · .WT · una-semana · 5 etapas · día 20

| #   | Tipo  | Salida       | Meta          |  km | Recorrido |
| --- | ----- | ------------ | ------------- | --: | --------- |
| 1   | Hills | Tanunda      | Tanunda       | 123 | Real      |
| 2   | Hills | Norwood      | Uraidla       | 148 | Real      |
| 3   | Hills | Henley Beach | Nairne        | 139 | Real      |
| 4   | Hills | Brighton     | Willunga Hill | 178 | Real      |
| 5   | Hills | Stirling     | Stirling      | 165 | Real      |

### Race Great Ocean (AU)

WT · .WT · un-dia · 1 etapa · día 32

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Torquay | Torquay | 188 | Real      |

### Race Emirates (AE)

WT · .WT · una-semana · 7 etapas · día 47

| #   | Tipo          | Salida              | Meta                                 |  km | Recorrido |
| --- | ------------- | ------------------- | ------------------------------------ | --: | --------- |
| 1   | Flat          | Madinat Zayed       | Liwa                                 | 144 | Real      |
| 2   | ITT (crono)   | Al Hudayriat Island | Al Hudayriat Island                  |  12 | Real      |
| 3   | Summit finish | Umm Al Quwain       | Jebel Mobrah                         | 183 | Real      |
| 4   | Flat          | Fujairah            | Fujairah                             | 182 | Real      |
| 5   | Flat          | Dubai               | Hamdan Bin Mohammed Smart University | 166 | Real      |
| 6   | Summit finish | Al Ain              | Jebel Hafeet                         | 168 | Real      |
| 7   | Flat          | Abu Dhabi           | Abu Dhabi                            | 149 | Real      |

### Race Opening Classic (BE)

WT · .WT · un-dia · 1 etapa · día 59

| #   | Tipo    | Salida | Meta   |  km | Recorrido |
| --- | ------- | ------ | ------ | --: | --------- |
| 1   | Cobbles | Gent   | Ninove | 202 | Real      |

### Race White Roads (IT)

WT · .WT · un-dia · 1 etapa · día 66

| #   | Tipo    | Salida | Meta  |  km | Recorrido |
| --- | ------- | ------ | ----- | --: | --------- |
| 1   | Classic | Siena  | Siena | 215 | Real      |

### Race to the Sun (FR)

WT · .WT · una-semana · 8 etapas · día 67

| #   | Tipo          | Salida                | Meta                  |  km | Recorrido |
| --- | ------------- | --------------------- | --------------------- | --: | --------- |
| 1   | Hills         | Acheres               | Carrieres-sous-Poissy | 171 | Real      |
| 2   | Flat          | Epone                 | Montargis             | 187 | Real      |
| 3   | ITT (crono)   | Cosne-Cours-sur-Loire | Pouilly-sur-Loire     |  24 | Real      |
| 4   | Summit finish | Bourges               | Uchon                 | 195 | Real      |
| 5   | Hills         | Cormoranche-sur-Saone | Colombier-le-Vieux    | 206 | Real      |
| 6   | Hills         | Barbentane            | Apt                   | 179 | Real      |
| 7   | Summit finish | Nice                  | Auron                 | 139 | Real      |
| 8   | Hills         | Nice                  | Nice                  | 129 | Real      |

### Race Two Seas (IT)

WT · .WT · una-semana · 7 etapas · día 68

| #   | Tipo          | Salida              | Meta                     |  km | Recorrido |
| --- | ------------- | ------------------- | ------------------------ | --: | --------- |
| 1   | ITT (crono)   | Lido di Camaiore    | Lido di Camaiore         |  12 | Real      |
| 2   | Hills         | Camaiore            | San Gimignano            | 206 | Real      |
| 3   | Hills         | Cortona             | Magliano dei Marsi       | 225 | Real      |
| 4   | Summit finish | Tagliacozzo         | Martinsicuro             | 210 | Real      |
| 5   | Hills         | Marotta-Mondolfo    | Mombaroccio              | 186 | Real      |
| 6   | Summit finish | San Severino Marche | Camerino                 | 189 | Real      |
| 7   | Flat          | Civitanova Marche   | San Benedetto del Tronto | 143 | Real      |

### Race Sanremo (IT)

WT · .WT · un-dia · 1 etapa · día 80

| #   | Tipo  | Salida | Meta    |  km | Recorrido |
| --- | ----- | ------ | ------- | --: | --------- |
| 1   | Hills | Milano | Sanremo | 288 | Real      |

### Race Catalonia (ES)

WT · .WT · una-semana · 7 etapas · día 82

| #   | Tipo          | Salida                | Meta                  |  km | Recorrido |
| --- | ------------- | --------------------- | --------------------- | --: | --------- |
| 1   | Flat          | Sant Feliu de Guixols | Sant Feliu de Guixols | 173 | Real      |
| 2   | Flat          | Figueres              | Banyoles              | 167 | Real      |
| 3   | Hills         | Mont-roig del Camp    | Vila-seca             | 160 | Real      |
| 4   | Summit finish | Mataro                | Vallter 2000          | 173 | Real      |
| 5   | Summit finish | La Seu d'Urgell       | Coll de Pal           | 155 | Real      |
| 6   | Summit finish | Berga                 | Queralt               | 158 | Real      |
| 7   | Hills         | Barcelona             | Barcelona             |  95 | Real      |

### Race Bruges (BE)

WT · .WT · un-dia · 1 etapa · día 84

| #   | Tipo    | Salida | Meta     |  km | Recorrido |
| --- | ------- | ------ | -------- | --: | --------- |
| 1   | Cobbles | Brugge | De Panne | 205 | Inventado |

### Race Harelbeke (BE)

WT · .WT · un-dia · 1 etapa · día 86

| #   | Tipo    | Salida    | Meta      |  km | Recorrido |
| --- | ------- | --------- | --------- | --: | --------- |
| 1   | Cobbles | Harelbeke | Harelbeke | 209 | Real      |

### Race Wevelgem (BE)

WT · .WT · un-dia · 1 etapa · día 88

| #   | Tipo    | Salida | Meta     |  km | Recorrido |
| --- | ------- | ------ | -------- | --: | --------- |
| 1   | Cobbles | Ieper  | Wevelgem | 250 | Real      |

### Race Across Flanders (BE)

WT · .WT · un-dia · 1 etapa · día 91

| #   | Tipo    | Salida    | Meta    |  km | Recorrido |
| --- | ------- | --------- | ------- | --: | --------- |
| 1   | Cobbles | Roeselare | Waregem | 189 | Real      |

### Race Flanders (BE)

WT · .WT · un-dia · 1 etapa · día 95

| #   | Tipo    | Salida    | Meta       |  km | Recorrido |
| --- | ------- | --------- | ---------- | --: | --------- |
| 1   | Cobbles | Antwerpen | Oudenaarde | 278 | Real      |

### Race Basque Country (ES)

WT · .WT · una-semana · 6 etapas · día 96

| #   | Tipo          | Salida   | Meta                |  km | Recorrido |
| --- | ------------- | -------- | ------------------- | --: | --------- |
| 1   | ITT (crono)   | Bilbao   | Bilbao              |  14 | Real      |
| 2   | Hills         | Pamplona | Cuevas de Mendukilo | 164 | Real      |
| 3   | Hills         | Basauri  | Basauri             | 153 | Real      |
| 4   | Hills         | Galdakao | Galdakao            | 167 | Real      |
| 5   | Summit finish | Eibar    | Eibar               | 176 | Real      |
| 6   | Summit finish | Antzuola | Bergara             | 135 | Real      |

### Race Roubaix (FR)

WT · .WT · un-dia · 1 etapa · día 102

| #   | Tipo    | Salida    | Meta    |  km | Recorrido |
| --- | ------- | --------- | ------- | --: | --------- |
| 1   | Cobbles | Compiegne | Roubaix | 258 | Real      |

### Race Amstel (NL)

WT · .WT · un-dia · 1 etapa · día 109

| #   | Tipo  | Salida     | Meta       |  km | Recorrido |
| --- | ----- | ---------- | ---------- | --: | --------- |
| 1   | Hills | Maastricht | Valkenburg | 257 | Real      |

### Race Walloon Wall (BE)

WT · .WT · un-dia · 1 etapa · día 112

| #   | Tipo          | Salida | Meta |  km | Recorrido |
| --- | ------------- | ------ | ---- | --: | --------- |
| 1   | Summit finish | Namur  | Huy  | 200 | Real      |

### Race Liège (BE)

WT · .WT · un-dia · 1 etapa · día 116

| #   | Tipo    | Salida | Meta  |  km | Recorrido |
| --- | ------- | ------ | ----- | --: | --------- |
| 1   | Classic | Liege  | Liege | 260 | Real      |

### Race Romandy (CH)

WT · .WT · una-semana · 6 etapas · día 118

| #   | Tipo          | Salida            | Meta              |  km | Recorrido |
| --- | ------------- | ----------------- | ----------------- | --: | --------- |
| 1   | ITT (crono)   | Villars-sur-Glane | Villars-sur-Glane |   3 | Real      |
| 2   | Hills         | Martigny          | Martigny          | 171 | Real      |
| 3   | Hills         | Rue               | Vucherens         | 173 | Real      |
| 4   | Hills         | Orbe              | Orbe              | 177 | Real      |
| 5   | Summit finish | Broc              | Charmey           | 150 | Real      |
| 6   | Summit finish | Lucens            | Leysin            | 178 | Real      |

### Race Frankfurt (DE)

WT · .WT · un-dia · 1 etapa · día 121

| #   | Tipo  | Salida   | Meta      |  km | Recorrido |
| --- | ----- | -------- | --------- | --: | --------- |
| 1   | Hills | Eschborn | Frankfurt | 204 | Real      |

### Race Italy (IT)

WT · .WT · gran-vuelta · 21 etapas · día 128

| #   | Tipo          | Salida              | Meta             |  km | Recorrido |
| --- | ------------- | ------------------- | ---------------- | --: | --------- |
| 1   | Flat          | Nessebar            | Burgas           | 147 | Real      |
| 2   | Hills         | Burgas              | Veliko Tarnovo   | 221 | Real      |
| 3   | Flat          | Plovdiv             | Sofia            | 175 | Real      |
| 4   | Flat          | Catanzaro           | Cosenza          | 138 | Real      |
| 5   | Hills         | Praia a Mare        | Potenza          | 203 | Real      |
| 6   | Flat          | Paestum             | Napoli           | 141 | Real      |
| 7   | Summit finish | Formia              | Blockhaus        | 244 | Real      |
| 8   | Hills         | Chieti              | Fermo            | 156 | Real      |
| 9   | Summit finish | Cervia              | Corno alle Scale | 184 | Real      |
| 10  | ITT (crono)   | Viareggio           | Massa            |  42 | Real      |
| 11  | Hills         | Porcari             | Chiavari         | 195 | Real      |
| 12  | Flat          | Imperia             | Novi Ligure      | 175 | Real      |
| 13  | Hills         | Alessandria         | Verbania         | 186 | Real      |
| 14  | Summit finish | Aosta               | Pila             | 133 | Real      |
| 15  | Flat          | Voghera             | Milano           | 157 | Real      |
| 16  | Summit finish | Bellinzona          | Cari             | 113 | Real      |
| 17  | Hills         | Cassano d'Adda      | Andalo           | 202 | Real      |
| 18  | Hills         | Fai della Paganella | Pieve di Soligo  | 171 | Real      |
| 19  | Summit finish | Feltre              | Piani di Pezze   | 151 | Real      |
| 20  | Summit finish | Gemona del Friuli   | Piancavallo      | 200 | Real      |
| 21  | Flat          | Roma                | Roma             | 131 | Real      |

### Race Rhône-Alpes (FR)

WT · .WT · una-semana · 8 etapas · día 158

| #   | Tipo          | Salida                 | Meta                |  km | Recorrido   |
| --- | ------------- | ---------------------- | ------------------- | --: | ----------- |
| 1   | Summit finish | Vizille                | Saint-Ismier        | 146 | Real        |
| 2   | Hills         | Saint-Martin-le-Vinoux | Le Puy-en-Velay     | 234 | Real        |
| 3   | ITT (crono)   | Perreux                | Perreux             |  28 | Sin validar |
| 4   | Hills         | Le Puy-en-Velay        | Montrond-les-Bains  | 167 | Real        |
| 5   | Flat          | Saint-Chamond          | Villars-les-Dombes  | 196 | Real        |
| 6   | Summit finish | Saint-Vulbas           | Crest-Voland        | 182 | Real        |
| 7   | Summit finish | La Bridoire            | Grand Colombier     | 134 | Real        |
| 8   | Summit finish | Beaufort               | Plateau de Solaison | 120 | Real        |

### Race Copenhagen (DK)

WT · .WT · un-dia · 1 etapa · día 165

| #   | Tipo | Salida     | Meta       |  km | Recorrido |
| --- | ---- | ---------- | ---------- | --: | --------- |
| 1   | Flat | Copenhagen | Copenhagen | 210 | Inventado |

### Race Switzerland (CH)

WT · .WT · una-semana · 5 etapas · día 168

| #   | Tipo          | Salida         | Meta              |  km | Recorrido |
| --- | ------------- | -------------- | ----------------- | --: | --------- |
| 1   | Summit finish | Morbegno       | Sondrio           | 144 | Real      |
| 2   | Hills         | Lugano         | Bellinzona        | 158 | Real      |
| 3   | Summit finish | Buchs          | Sargans           | 157 | Real      |
| 4   | ITT (crono)   | Neundorf       | Fulenbach         |  24 | Real      |
| 5   | Summit finish | Les Diablerets | Villars-sur-Ollon | 151 | Real      |

### Race France (FR)

WT · .WT · gran-vuelta · 21 etapas · día 185

| #   | Tipo          | Salida            | Meta                |  km | Recorrido   |
| --- | ------------- | ----------------- | ------------------- | --: | ----------- |
| 1   | ITT (crono)   | Barcelona         | Barcelona           |  20 | Real        |
| 2   | Hills         | Tarragona         | Barcelona           | 169 | Real        |
| 3   | Hills         | Granollers        | Les Angles          | 196 | Real        |
| 4   | Hills         | Carcassonne       | Foix                | 182 | Real        |
| 5   | Flat          | Lannemezan        | Pau                 | 158 | Real        |
| 6   | Summit finish | Pau               | Gavarnie-Gedre      | 186 | Real        |
| 7   | Flat          | Hagetmau          | Bordeaux            | 175 | Real        |
| 8   | Flat          | Perigueux         | Bergerac            | 180 | Real        |
| 9   | Hills         | Malemort          | Ussel               | 185 | Real        |
| 10  | Summit finish | Aurillac          | Le Lioran           | 167 | Real        |
| 11  | Flat          | Vichy             | Nevers              | 161 | Real        |
| 12  | Flat          | Magny-Cours       | Chalon-sur-Saone    | 179 | Real        |
| 13  | Hills         | Dole              | Belfort             | 206 | Real        |
| 14  | Summit finish | Mulhouse          | Le Markstein        | 155 | Real        |
| 15  | Summit finish | Champagnole       | Plateau de Solaison | 184 | Real        |
| 16  | ITT (crono)   | Evian-les-Bains   | Thonon-les-Bains    |  26 | Real        |
| 17  | Hills         | Chambery          | Voiron              | 175 | Real        |
| 18  | Summit finish | Voiron            | Orcieres-Merlette   | 185 | Real        |
| 19  | Summit finish | Gap               | Alpe d'Huez         | 128 | Real        |
| 20  | Summit finish | Le Bourg-d'Oisans | Alpe d'Huez         | 171 | Real        |
| 21  | Flat          | Thoiry            | Paris               | 130 | Sin validar |

### Race San Sebastián (ES)

WT · .WT · un-dia · 1 etapa · día 213

| #   | Tipo    | Salida        | Meta          |  km | Recorrido |
| --- | ------- | ------------- | ------------- | --: | --------- |
| 1   | Classic | San Sebastian | San Sebastian | 221 | Real      |

### Race Poland (PL)

WT · .WT · una-semana · 7 etapas · día 215

| #   | Tipo          | Salida              | Meta                |  km | Recorrido   |
| --- | ------------- | ------------------- | ------------------- | --: | ----------- |
| 1   | Hills         | Gdynia              | Koszalin            | 234 | Sin validar |
| 2   | Flat          | Miedzyzdroje        | Szczecin            | 151 | Sin validar |
| 3   | Hills         | Gorzow Wielkopolski | Zielona Gora        | 194 | Sin validar |
| 4   | Summit finish | Zagan               | Karpacz             | 176 | Sin validar |
| 5   | Summit finish | Opole               | Kocierz Resort      | 219 | Sin validar |
| 6   | Summit finish | Bukovina Resort     | Bukowina Tatrzanska | 126 | Sin validar |
| 7   | ITT (crono)   | Wieliczka           | Wieliczka           |  12 | Sin validar |

### Race Hamburg (DE)

WT · .WT · un-dia · 1 etapa · día 228

| #   | Tipo | Salida    | Meta    |  km | Recorrido |
| --- | ---- | --------- | ------- | --: | --------- |
| 1   | Flat | Buxtehude | Hamburg | 198 | Real      |

### Race Benelux (BE)

WT · .WT · una-semana · 5 etapas · día 231

| #   | Tipo    | Salida       | Meta           |  km | Recorrido   |
| --- | ------- | ------------ | -------------- | --: | ----------- |
| 1   | Flat    | Diest        | Diest          | 188 | Sin validar |
| 2   | Flat    | Blankenberge | Ardooie        | 174 | Sin validar |
| 3   | Cobbles | Celles       | Geraardsbergen | 185 | Sin validar |
| 4   | Hills   | Riemst       | Bilzen-Hoeselt | 196 | Sin validar |
| 5   | Hills   | Leuven       | Leuven         | 178 | Sin validar |

### Race Spain (ES)

WT · .WT · gran-vuelta · 21 etapas · día 234

| #   | Tipo          | Salida                   | Meta                 |  km | Recorrido |
| --- | ------------- | ------------------------ | -------------------- | --: | --------- |
| 1   | ITT (crono)   | Monaco                   | Monaco               |  10 | Real      |
| 2   | Hills         | Monaco                   | Manosque             | 215 | Real      |
| 3   | Summit finish | Gruissan                 | Font Romeu           | 167 | Real      |
| 4   | Summit finish | Andorra la Vella         | Andorra la Vella     | 105 | Real      |
| 5   | Hills         | Falset                   | Roquetes             | 171 | Real      |
| 6   | Cobbles       | Alcossebre               | Castello             | 177 | Real      |
| 7   | Summit finish | Vall d'Alba              | Valdelinares         | 150 | Real      |
| 8   | Flat          | Pucol                    | Xeraco               | 167 | Real      |
| 9   | Summit finish | Villajoyosa              | Alto de Aitana       | 188 | Real      |
| 10  | Hills         | Alcaraz                  | Elche de la Sierra   | 185 | Real      |
| 11  | Flat          | Cartagena                | Lorca                | 156 | Real      |
| 12  | Summit finish | Vera                     | Calar Alto           | 167 | Real      |
| 13  | Hills         | Almunecar                | Loja                 | 193 | Real      |
| 14  | Summit finish | Jaen                     | Sierra de la Pandera | 153 | Real      |
| 15  | Hills         | Palma del Rio            | Cordoba              | 181 | Real      |
| 16  | Flat          | Cortegana                | La Rabida            | 186 | Real      |
| 17  | Flat          | Dos Hermanas             | Sevilla              | 189 | Real      |
| 18  | ITT (crono)   | El Puerto de Santa Maria | Jerez de la Frontera |  33 | Real      |
| 19  | Summit finish | Velez-Malaga             | Penas Blancas        | 205 | Real      |
| 20  | Summit finish | La Calahorra             | Collada de Alguacil  | 187 | Real      |
| 21  | Hills         | Granada                  | Granada              |  99 | Real      |

### Race Brittany (FR)

WT · .WT · un-dia · 1 etapa · día 242

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Rennes | Rennes | 190 | Inventado |

### Race Québec (CA)

WT · .WT · un-dia · 1 etapa · día 254

| #   | Tipo  | Salida      | Meta        |  km | Recorrido |
| --- | ----- | ----------- | ----------- | --: | --------- |
| 1   | Hills | Quebec City | Quebec City | 216 | Real      |

### Race Montréal (CA)

WT · .WT · un-dia · 1 etapa · día 256

| #   | Tipo  | Salida   | Meta     |  km | Recorrido |
| --- | ----- | -------- | -------- | --: | --------- |
| 1   | Hills | Montreal | Montreal | 209 | Real      |

### Race Lombardy (IT)

WT · .WT · un-dia · 1 etapa · día 283

| #   | Tipo    | Salida | Meta    |  km | Recorrido |
| --- | ------- | ------ | ------- | --: | --------- |
| 1   | Classic | Como   | Bergamo | 241 | Real      |

### Race Guangxi (CN)

WT · .WT · una-semana · 6 etapas · día 286

| #   | Tipo          | Salida        | Meta          |  km | Recorrido   |
| --- | ------------- | ------------- | ------------- | --: | ----------- |
| 1   | Flat          | Fangchenggang | Fangchenggang | 149 | Sin validar |
| 2   | Hills         | Chongzuo      | Jingxi        | 177 | Sin validar |
| 3   | Hills         | Jingxi        | Bama          | 214 | Sin validar |
| 4   | Hills         | Bama          | Jinchengjiang | 177 | Sin validar |
| 5   | Summit finish | Yizhou        | Nongla        | 166 | Real        |
| 6   | Flat          | Nanning       | Nanning       | 134 | Sin validar |

## ProSeries

El segundo escalón. La mayoría corre sobre ediciones verificadas SIN relieve real: es el frente de trabajo con más recorrido por delante.

### Race Arabia (SA)

PRS · .Pro · una-semana · 5 etapas · día 27

| #   | Tipo  | Salida                     | Meta                       |  km | Recorrido   |
| --- | ----- | -------------------------- | -------------------------- | --: | ----------- |
| 1   | Flat  | AlUla Camel Cup Track      | AlUla Camel Cup Track      | 158 | Sin validar |
| 2   | Flat  | Al Manshiyah Train Station | Al Manshiyah Train Station | 152 | Sin validar |
| 3   | Hills | Winter Park                | Bir Jaydah Mountain Wirkah | 142 | Sin validar |
| 4   | Flat  | Winter Park                | Hegra                      | 173 | Sin validar |
| 5   | Hills | AlUla Old Town             | Skyviews of Harrat Uwayrid | 164 | Sin validar |

### Race Surf Coast (AU)

PRS · .Pro · un-dia · 1 etapa · día 29

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Geelong | Geelong | 210 | Inventado |

### Race Valencia (ES)

PRS · .Pro · una-semana · 5 etapas · día 35

| #   | Tipo          | Salida   | Meta                    |  km | Recorrido   |
| --- | ------------- | -------- | ----------------------- | --: | ----------- |
| 1   | Hills         | Segorbe  | Torreblanca             | 160 | Sin validar |
| 2   | ITT (crono)   | Carlet   | Alginet                 |  18 | Sin validar |
| 3   | Summit finish | Orihuela | San Vicente del Raspeig | 158 | Sin validar |
| 4   | Hills         | La Nucia | Teulada Moraira         | 172 | Sin validar |
| 5   | Flat          | Betera   | Valencia                |  95 | Sin validar |

### Race Muscat (OM)

PRS · .Pro · un-dia · 1 etapa · día 37

| #   | Tipo | Salida | Meta  |  km | Recorrido |
| --- | ---- | ------ | ----- | --: | --------- |
| 1   | Flat | Muscat | Barka | 210 | Inventado |

### Race Oman (OM)

PRS · .Pro · una-semana · 5 etapas · día 38

| #   | Tipo          | Salida              | Meta               |  km | Recorrido   |
| --- | ------------- | ------------------- | ------------------ | --: | ----------- |
| 1   | Flat          | Ministry of Tourism | Bimmah Sink Hole   | 171 | Sin validar |
| 2   | Hills         | Al Rustaq Fort      | Yitti Hills        | 191 | Sin validar |
| 3   | Hills         | Samail              | Misfat al Abriyeen | 191 | Sin validar |
| 4   | Flat          | Al Sawadi Beach     | Sohar              | 147 | Sin validar |
| 5   | Summit finish | Nizwa               | Jabal al Akhdhar   | 156 | Sin validar |

### Race Figueira (PT)

PRS · .Pro · un-dia · 1 etapa · día 45

| #   | Tipo | Salida          | Meta             |  km | Recorrido |
| --- | ---- | --------------- | ---------------- | --: | --------- |
| 1   | Flat | Figueira da Foz | Montemor-o-Velho | 210 | Inventado |

### Race Almería (ES)

PRS · .Pro · un-dia · 1 etapa · día 46

| #   | Tipo | Salida  | Meta            |  km | Recorrido |
| --- | ---- | ------- | --------------- | --: | --------- |
| 1   | Flat | Almeria | Roquetas de Mar | 210 | Inventado |

### Race Algarve (PT)

PRS · .Pro · una-semana · 5 etapas · día 49

| #   | Tipo          | Salida                     | Meta      |  km | Recorrido |
| --- | ------------- | -------------------------- | --------- | --: | --------- |
| 1   | Hills         | Vila Real de Santo Antonio | Tavira    | 183 | Real      |
| 2   | Summit finish | Portimao                   | Foia      | 148 | Real      |
| 3   | ITT (crono)   | Vilamoura                  | Vilamoura |  20 | Real      |
| 4   | Hills         | Albufeira                  | Lagos     | 176 | Real      |
| 5   | Summit finish | Faro                       | Malhao    | 150 | Real      |

### Race Andalusia (ES)

PRS · .Pro · una-semana · 5 etapas · día 49

| #   | Tipo          | Salida               | Meta       |  km | Recorrido |
| --- | ------------- | -------------------- | ---------- | --: | --------- |
| 1   | Summit finish | Benahavis            | Pizarra    | 151 | Real      |
| 2   | Summit finish | Torrox               | Otura      | 142 | Real      |
| 3   | Hills         | Jaen                 | Lopera     | 181 | Real      |
| 4   | Hills         | Montoro              | Pozoblanco | 167 | Real      |
| 5   | Hills         | La Roda de Andalucia | Lucena     | 163 | Real      |

### Race Ardèche (FR)

PRS · .Pro · un-dia · 1 etapa · día 59

| #   | Tipo  | Salida             | Meta    |  km | Recorrido |
| --- | ----- | ------------------ | ------- | --: | --------- |
| 1   | Hills | Guilherand-Granges | Aubenas | 210 | Inventado |

### Race Drôme (FR)

PRS · .Pro · un-dia · 1 etapa · día 60

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Valence | Valence | 210 | Inventado |

### Race Kuurne (BE)

PRS · .Pro · un-dia · 1 etapa · día 60

| #   | Tipo    | Salida | Meta   |  km | Recorrido |
| --- | ------- | ------ | ------ | --: | --------- |
| 1   | Cobbles | Kuurne | Kuurne | 200 | Inventado |

### Race Laigueglia (IT)

PRS · .Pro · un-dia · 1 etapa · día 63

| #   | Tipo  | Salida     | Meta       |  km | Recorrido |
| --- | ----- | ---------- | ---------- | --: | --------- |
| 1   | Hills | Laigueglia | Laigueglia | 192 | Real      |

### Race Nokere (BE)

PRS · .Pro · un-dia · 1 etapa · día 77

| #   | Tipo    | Salida | Meta   |  km | Recorrido |
| --- | ------- | ------ | ------ | --: | --------- |
| 1   | Cobbles | Deinze | Nokere | 190 | Inventado |

### Race Turin (IT)

PRS · .Pro · un-dia · 1 etapa · día 77

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Milano | Torino | 210 | Inventado |

### Race Denain (FR)

PRS · .Pro · un-dia · 1 etapa · día 78

| #   | Tipo    | Salida | Meta   |  km | Recorrido |
| --- | ------- | ------ | ------ | --: | --------- |
| 1   | Cobbles | Denain | Denain | 200 | Inventado |

### Race Bredene (BE)

PRS · .Pro · un-dia · 1 etapa · día 79

| #   | Tipo | Salida  | Meta     |  km | Recorrido |
| --- | ---- | ------- | -------- | --: | --------- |
| 1   | Flat | Bredene | Koksijde | 210 | Inventado |

### Race Navarre (ES)

PRS · .Pro · un-dia · 1 etapa · día 94

| #   | Tipo  | Salida  | Meta     |  km | Recorrido |
| --- | ----- | ------- | -------- | --: | --------- |
| 1   | Hills | Estella | Pamplona | 210 | Inventado |

### Race Loire (FR)

PRS · .Pro · una-semana · 5 etapas · día 97

| #   | Tipo  | Salida     | Meta                   |  km | Recorrido   |
| --- | ----- | ---------- | ---------------------- | --: | ----------- |
| 1   | Flat  | Blois      | Vouzon                 | 180 | Sin validar |
| 2   | Hills | Chemery    | Saint-Georges-sur-Cher | 189 | Sin validar |
| 3   | Hills | Moree      | Montoire-sur-le-Loir   | 195 | Sin validar |
| 4   | Flat  | Romorantin | Romorantin             | 189 | Sin validar |
| 5   | Hills | Blois      | Blois                  |  98 | Sin validar |

### Race Schelde (BE)

PRS · .Pro · un-dia · 1 etapa · día 98

| #   | Tipo | Salida    | Meta    |  km | Recorrido |
| --- | ---- | --------- | ------- | --: | --------- |
| 1   | Flat | Antwerpen | Schoten | 210 | Inventado |

### Race Hainan (CN)

PRS · .Pro · una-semana · 5 etapas · día 105

| #   | Tipo  | Salida     | Meta     |  km | Recorrido   |
| --- | ----- | ---------- | -------- | --: | ----------- |
| 1   | Flat  | Qionghai   | Qionghai |  90 | Sin validar |
| 2   | Flat  | Qionghai   | Lingshui | 178 | Sin validar |
| 3   | Hills | Lingshui   | Baoting  | 213 | Sin validar |
| 4   | Hills | Baoting    | Dongfang | 191 | Sin validar |
| 5   | Flat  | Changjiang | Sanya    | 183 | Sin validar |

### Race Brabant (BE)

PRS · .Pro · un-dia · 1 etapa · día 107

| #   | Tipo  | Salida | Meta     |  km | Recorrido |
| --- | ----- | ------ | -------- | --: | --------- |
| 1   | Hills | Leuven | Overijse | 163 | Real      |

### Race Alps (IT)

PRS · .Pro · una-semana · 5 etapas · día 110

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Summit finish | Innsbruck | Innsbruck | 144 | Real      |
| 2   | Summit finish | Telfs     | Martello  | 148 | Real      |
| 3   | Summit finish | Laces     | Arco      | 175 | Real      |
| 4   | Summit finish | Arco      | Trento    | 168 | Real      |
| 5   | Summit finish | Trento    | Bolzano   | 129 | Real      |

### Race Türkiye (TR)

PRS · .Pro · una-semana · 8 etapas · día 116

| #   | Tipo          | Salida   | Meta     |  km | Recorrido   |
| --- | ------------- | -------- | -------- | --: | ----------- |
| 1   | Flat          | Cesme    | Selcuk   | 149 | Sin validar |
| 2   | Hills         | Aydin    | Marmaris | 153 | Sin validar |
| 3   | Summit finish | Marmaris | Kiran    | 133 | Sin validar |
| 4   | Flat          | Marmaris | Fethiye  | 130 | Sin validar |
| 5   | Hills         | Patara   | Kemer    | 181 | Sin validar |
| 6   | Summit finish | Antalya  | Feslikan | 128 | Sin validar |
| 7   | Hills         | Antalya  | Antalya  | 153 | Sin validar |
| 8   | Flat          | Ankara   | Ankara   | 105 | Sin validar |

### Race Morbihan (FR)

PRS · .Pro · un-dia · 1 etapa · día 129

| #   | Tipo  | Salida      | Meta        |  km | Recorrido |
| --- | ----- | ----------- | ----------- | --: | --------- |
| 1   | Hills | Grand-Champ | Grand-Champ | 210 | Inventado |

### Race Léon (ES)

PRS · .Pro · un-dia · 1 etapa · día 130

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Cobbles | Leon   | Leon | 185 | Inventado |

### Race Hungary (HU)

PRS · .Pro · una-semana · 5 etapas · día 133

| #   | Tipo          | Salida        | Meta       |  km | Recorrido   |
| --- | ------------- | ------------- | ---------- | --: | ----------- |
| 1   | Flat          | Gyula         | Bekescsaba | 143 | Sin validar |
| 2   | Flat          | Szarvas       | Paks       | 206 | Sin validar |
| 3   | Hills         | Kaposvar      | Szekszard  | 152 | Sin validar |
| 4   | Summit finish | Mohacs        | Pecs       | 188 | Sin validar |
| 5   | Hills         | Balatonalmadi | Veszprem   | 147 | Sin validar |

### Race Dunkerque (FR)

PRS · .Pro · un-dia · 1 etapa · día 139

| #   | Tipo | Salida    | Meta      |  km | Recorrido |
| --- | ---- | --------- | --------- | --: | --------- |
| 1   | Flat | Dunkerque | Dunkerque | 210 | Inventado |

### Race Hauts-de-France (FR)

PRS · .Pro · una-semana · 5 etapas · día 140

| #   | Tipo    | Salida        | Meta             |  km | Recorrido   |
| --- | ------- | ------------- | ---------------- | --: | ----------- |
| 1   | Hills   | Lagny-le-Sec  | Laon             | 178 | Sin validar |
| 2   | Flat    | Glisy         | Lievin           | 188 | Sin validar |
| 3   | Cobbles | La Sentinelle | Wallers-Arenberg | 156 | Sin validar |
| 4   | Hills   | Bergues       | Cassel           | 166 | Sin validar |
| 5   | Flat    | Saint-Omer    | Dunkerque        | 184 | Sin validar |

### Race Mayenne (FR)

PRS · .Pro · una-semana · 4 etapas · día 148

| #   | Tipo        | Salida          | Meta                        |  km | Recorrido   |
| --- | ----------- | --------------- | --------------------------- | --: | ----------- |
| 1   | ITT (crono) | Laval           | Laval                       |   5 | Sin validar |
| 2   | Hills       | Saint-Berthevin | Chateau-Gontier-sur-Mayenne | 172 | Sin validar |
| 3   | Hills       | Aron            | Pre-en-Pail-Saint-Samson    | 215 | Sin validar |
| 4   | Flat        | Cosse-le-Vivien | Laval                       | 148 | Sin validar |

### Race Norway (NO)

PRS · .Pro · una-semana · 4 etapas · día 148

| #   | Tipo  | Salida      | Meta        |  km | Recorrido   |
| --- | ----- | ----------- | ----------- | --: | ----------- |
| 1   | Flat  | Solakrossen | Solakrossen | 179 | Sin validar |
| 2   | Hills | Egersund    | Oltedal     | 208 | Sin validar |
| 3   | Hills | Jorpeland   | Heia        | 142 | Sin validar |
| 4   | Hills | Stavanger   | Stavanger   | 130 | Sin validar |

### Race Wallonia (BE)

PRS · .Pro · una-semana · 5 etapas · día 152

| #   | Tipo  | Salida   | Meta               |  km | Recorrido   |
| --- | ----- | -------- | ------------------ | --: | ----------- |
| 1   | Hills | Manage   | Lobbes             | 181 | Sin validar |
| 2   | Hills | Jodoigne | Libramont-Chevigny | 192 | Sin validar |
| 3   | Hills | Habay    | Vaux-sur-Sure      | 177 | Sin validar |
| 4   | Hills | Dison    | Eupen              | 167 | Sin validar |
| 5   | Hills | Bassenge | Aubel              | 177 | Sin validar |

### Race Brussels (BE)

PRS · .Pro · un-dia · 1 etapa · día 158

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Brussel | Brussel | 210 | Inventado |

### Race Franco-Belgian (FR)

PRS · .Pro · un-dia · 1 etapa · día 161

| #   | Tipo | Salida | Meta    |  km | Recorrido |
| --- | ---- | ------ | ------- | --: | --------- |
| 1   | Flat | Lille  | Roubaix | 210 | Inventado |

### Race Belgium (BE)

PRS · .Pro · una-semana · 5 etapas · día 168

| #   | Tipo    | Salida                | Meta                  |  km | Recorrido   |
| --- | ------- | --------------------- | --------------------- | --: | ----------- |
| 1   | Hills   | Scherpenheuvel-Zichem | Scherpenheuvel-Zichem | 188 | Sin validar |
| 2   | Flat    | Merelbeke-Melle       | Knokke-Heist          | 198 | Sin validar |
| 3   | Hills   | Durbuy                | Durbuy                | 173 | Sin validar |
| 4   | Flat    | Begijnendijk-Betekom  | Aarschot              | 184 | Sin validar |
| 5   | Cobbles | Gingelom              | Hoeilaart             | 184 | Sin validar |

### Race Slovenia (SI)

PRS · .Pro · una-semana · 5 etapas · día 168

| #   | Tipo          | Salida          | Meta            |  km | Recorrido   |
| --- | ------------- | --------------- | --------------- | --: | ----------- |
| 1   | Hills         | Velenje         | Rogaska Slatina | 142 | Sin validar |
| 2   | Hills         | Radlje ob Dravi | Ormoz           | 177 | Sin validar |
| 3   | Hills         | Maribor         | Celje           | 137 | Sin validar |
| 4   | Summit finish | Kranj           | Kranjska Gora   | 183 | Sin validar |
| 5   | Hills         | Litija          | Novo Mesto      | 162 | Sin validar |

### Race Qinghai (CN)

PRS · .Pro · una-semana · 8 etapas · día 192

| #   | Tipo          | Salida    | Meta      |  km | Recorrido   |
| --- | ------------- | --------- | --------- | --: | ----------- |
| 1   | Flat          | Xining    | Xining    | 121 | Sin validar |
| 2   | Hills         | Duoba     | Huzhu     | 151 | Sin validar |
| 3   | Hills         | Huzhu     | Menyuan   | 220 | Sin validar |
| 4   | Summit finish | Menyuan   | Qilian    | 173 | Sin validar |
| 5   | Hills         | Qilian    | Gangcha   | 169 | Sin validar |
| 6   | Hills         | Gangcha   | Gonghe    | 233 | Sin validar |
| 7   | Hills         | Gonghe    | Haiyan    | 137 | Sin validar |
| 8   | Hills         | Xihaizhen | Xihaizhen | 121 | Sin validar |

### Race Denmark (DK)

PRS · .Pro · una-semana · 5 etapas · día 210

| #   | Tipo        | Salida     | Meta       |  km | Recorrido   |
| --- | ----------- | ---------- | ---------- | --: | ----------- |
| 1   | Hills       | Nexo       | Ronne      | 178 | Sin validar |
| 2   | Flat        | Rodovre    | Gladsaxe   | 111 | Sin validar |
| 3   | ITT (crono) | Kerteminde | Kerteminde |  14 | Sin validar |
| 4   | Hills       | Svendborg  | Vejle      | 227 | Sin validar |
| 5   | Hills       | Hobro      | Silkeborg  | 157 | Sin validar |

### Race Burgos (ES)

PRS · .Pro · una-semana · 5 etapas · día 216

| #   | Tipo          | Salida              | Meta                |  km | Recorrido   |
| --- | ------------- | ------------------- | ------------------- | --: | ----------- |
| 1   | Hills         | Gumiel de Izan      | Burgos              | 165 | Sin validar |
| 2   | Summit finish | Arcos de la Llana   | Pineda de la Sierra | 178 | Sin validar |
| 3   | Summit finish | Merindad de Montija | Corconte            | 184 | Sin validar |
| 4   | Flat          | Palazuelos de Muno  | Briviesca           | 178 | Sin validar |
| 5   | Summit finish | Caleruega           | Lagunas de Neila    | 137 | Sin validar |

### Race Arctic (NO)

PRS · .Pro · una-semana · 4 etapas · día 225

| #   | Tipo          | Salida    | Meta     |  km | Recorrido   |
| --- | ------------- | --------- | -------- | --: | ----------- |
| 1   | Hills         | Borkenes  | Harstad  | 182 | Sin validar |
| 2   | Hills         | Tennevoll | Sorreisa | 167 | Sin validar |
| 3   | Summit finish | Husoy     | Malselv  | 182 | Sin validar |
| 4   | Hills         | Tromso    | Tromso   | 135 | Sin validar |

### Race Czechia (CZ)

PRS · .Pro · una-semana · 4 etapas · día 225

| #   | Tipo          | Salida         | Meta          |  km | Recorrido   |
| --- | ------------- | -------------- | ------------- | --: | ----------- |
| 1   | Hills         | Prague         | Karlovy Vary  | 163 | Sin validar |
| 2   | Summit finish | Mlada Boleslav | Jested        | 155 | Sin validar |
| 3   | Summit finish | Pardubice      | Dlouhe strane | 171 | Sin validar |
| 4   | Summit finish | Kromeriz       | Pustevny      | 160 | Sin validar |

### Race Germany (DE)

PRS · .Pro · una-semana · 5 etapas · día 231

| #   | Tipo        | Salida   | Meta      |  km | Recorrido   |
| --- | ----------- | -------- | --------- | --: | ----------- |
| 1   | ITT (crono) | Essen    | Essen     |   3 | Sin validar |
| 2   | Hills       | Essen    | Herford   | 203 | Sin validar |
| 3   | Hills       | Herford  | Arnsberg  | 190 | Sin validar |
| 4   | Hills       | Arnsberg | Kassel    | 176 | Sin validar |
| 5   | Flat        | Halle    | Magdeburg | 164 | Sin validar |

### Race Britain (GB)

PRS · .Pro · una-semana · 6 etapas · día 245

| #   | Tipo          | Salida        | Meta           |  km | Recorrido   |
| --- | ------------- | ------------- | -------------- | --: | ----------- |
| 1   | Flat          | Woodbridge    | Southwold      | 168 | Sin validar |
| 2   | Flat          | Stowmarket    | Stowmarket     | 174 | Sin validar |
| 3   | Hills         | Milton Keynes | Ampthill       | 123 | Sin validar |
| 4   | Hills         | Atherstone    | Burton Dassett | 187 | Sin validar |
| 5   | Summit finish | Pontypool     | The Tumble     | 134 | Sin validar |
| 6   | Hills         | Newport       | Cardiff        | 112 | Sin validar |

### Race Maryland (US)

PRS · .Pro · una-semana · 3 etapas · día 248

| #   | Tipo        | Salida     | Meta       |  km | Recorrido |
| --- | ----------- | ---------- | ---------- | --: | --------- |
| 1   | Flat        | Baltimore  | Frederick  | 188 | Inventado |
| 2   | ITT (crono) | Frederick  | Cumberland |  20 | Inventado |
| 3   | Hills       | Cumberland | Hagerstown | 147 | Inventado |

### Race Prato (IT)

PRS · .Pro · un-dia · 1 etapa · día 249

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Prato  | Prato | 210 | Inventado |

### Race Peccioli (IT)

PRS · .Pro · un-dia · 1 etapa · día 253

| #   | Tipo  | Salida   | Meta     |  km | Recorrido |
| --- | ----- | -------- | -------- | --: | --------- |
| 1   | Hills | Peccioli | Peccioli | 210 | Inventado |

### Race Fourmies (FR)

PRS · .Pro · un-dia · 1 etapa · día 256

| #   | Tipo | Salida   | Meta     |  km | Recorrido |
| --- | ---- | -------- | -------- | --: | --------- |
| 1   | Flat | Fourmies | Fourmies | 210 | Inventado |

### Race Luxembourg (LU)

PRS · .Pro · una-semana · 5 etapas · día 259

| #   | Tipo        | Salida      | Meta        |  km | Recorrido   |
| --- | ----------- | ----------- | ----------- | --: | ----------- |
| 1   | Hills       | Luxembourg  | Luxembourg  | 153 | Sin validar |
| 2   | Hills       | Remich      | Mamer       | 168 | Sin validar |
| 3   | Hills       | Mertert     | Vianden     | 171 | Sin validar |
| 4   | ITT (crono) | Niederanven | Niederanven |  26 | Sin validar |
| 5   | Hills       | Mersch      | Luxembourg  | 176 | Sin validar |

### Race Namur (BE)

PRS · .Pro · un-dia · 1 etapa · día 259

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Namur  | Namur | 210 | Inventado |

### Race Flandrien (BE)

PRS · .Pro · un-dia · 1 etapa · día 262

| #   | Tipo    | Salida   | Meta       |  km | Recorrido |
| --- | ------- | -------- | ---------- | --: | --------- |
| 1   | Cobbles | Zottegem | Oudenaarde | 190 | Inventado |

### Race Croatia (HR)

PRS · .Pro · una-semana · 6 etapas · día 265

| #   | Tipo          | Salida          | Meta          |  km | Recorrido   |
| --- | ------------- | --------------- | ------------- | --: | ----------- |
| 1   | Hills         | Split           | Sinj          | 163 | Sin validar |
| 2   | Flat          | Biograd na Moru | Novalja       | 115 | Sin validar |
| 3   | Hills         | Gospic          | Rijeka        | 151 | Sin validar |
| 4   | Summit finish | Krk             | Labin         | 191 | Sin validar |
| 5   | Hills         | Karlovac        | Sveta Nedelja | 151 | Sin validar |
| 6   | Flat          | Samobor         | Zagreb        | 157 | Sin validar |

### Race Langkawi (MY)

PRS · .Pro · una-semana · 8 etapas · día 270

| #   | Tipo          | Salida        | Meta              |  km | Recorrido   |
| --- | ------------- | ------------- | ----------------- | --: | ----------- |
| 1   | Flat          | Shah Alam     | Kampar            | 193 | Sin validar |
| 2   | Summit finish | Taiping       | Gunung Jerai      | 146 | Sin validar |
| 3   | Hills         | Sungai Petani | Kuala Kangsar     | 190 | Sin validar |
| 4   | Summit finish | Tambun        | Cameron Highlands | 140 | Sin validar |
| 5   | Summit finish | Tapah         | Genting Highlands | 126 | Sin validar |
| 6   | Hills         | Pandan Indah  | Rembau            | 121 | Sin validar |
| 7   | Flat          | Melaka        | Batu Pahat        | 159 | Sin validar |
| 8   | Flat          | Muar          | Putrajaya         | 184 | Sin validar |

### Race Emilia (IT)

PRS · .Pro · un-dia · 1 etapa · día 276

| #   | Tipo  | Salida | Meta    |  km | Recorrido |
| --- | ----- | ------ | ------- | --: | --------- |
| 1   | Hills | Carpi  | Bologna | 210 | Inventado |

### Race Münster (DE)

PRS · .Pro · un-dia · 1 etapa · día 276

| #   | Tipo | Salida  | Meta   |  km | Recorrido |
| --- | ---- | ------- | ------ | --: | --------- |
| 1   | Flat | Munster | Telgte | 210 | Inventado |

### Race Legnano (IT)

PRS · .Pro · un-dia · 1 etapa · día 278

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Legnano | Legnano | 210 | Inventado |

### Race Varese (IT)

PRS · .Pro · un-dia · 1 etapa · día 279

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Varese | Varese | 210 | Inventado |

### Race Piedmont (IT)

PRS · .Pro · un-dia · 1 etapa · día 281

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Omegna | Torino | 210 | Inventado |

### Race Tours (FR)

PRS · .Pro · un-dia · 1 etapa · día 284

| #   | Tipo    | Salida   | Meta  |  km | Recorrido |
| --- | ------- | -------- | ----- | --: | --------- |
| 1   | Cobbles | Chartres | Tours | 210 | Inventado |

### Race Veneto (IT)

PRS · .Pro · un-dia · 1 etapa · día 287

| #   | Tipo  | Salida | Meta    |  km | Recorrido |
| --- | ----- | ------ | ------- | --: | --------- |
| 1   | Hills | Padova | Vicenza | 210 | Inventado |

### Race Japan (JP)

PRS · .Pro · un-dia · 1 etapa · día 291

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Kyoto  | Kyoto | 210 | Inventado |

### Race Veneto Classic (IT)

PRS · .Pro · un-dia · 1 etapa · día 291

| #   | Tipo    | Salida  | Meta               |  km | Recorrido |
| --- | ------- | ------- | ------------------ | --: | --------- |
| 1   | Cobbles | Venezia | Bassano del Grappa | 195 | Inventado |

## Continental

Carreras .1 y .2 de todos los continentes.

### Race Táchira (VE)

CON · .2 · una-semana · 10 etapas · día 9

| #   | Tipo          | Salida        | Meta          |  km | Recorrido   |
| --- | ------------- | ------------- | ------------- | --: | ----------- |
| 1   | Flat          | San Cristobal | Socopo        | 210 | Sin validar |
| 2   | Hills         | Socopo        | San Cristobal | 210 | Sin validar |
| 3   | Hills         | San Cristobal | San Cristobal | 117 | Sin validar |
| 4   | Summit finish | La Fria       | Merida        | 163 | Sin validar |
| 5   | Hills         | Merida        | Merida        | 121 | Sin validar |
| 6   | Summit finish | El Vigia      | La Grita      | 166 | Sin validar |
| 7   | Hills         | Tariba        | San Cristobal | 151 | Sin validar |
| 8   | Hills         | Abejales      | Capacho       | 155 | Sin validar |
| 9   | Hills         | Junin         | Junin         | 134 | Sin validar |
| 10  | Flat          | Urena         | San Cristobal |  99 | Sin validar |

### Race Pune (IN)

CON · .2 · una-semana · 5 etapas · día 19

| #   | Tipo        | Salida        | Meta          |  km | Recorrido |
| --- | ----------- | ------------- | ------------- | --: | --------- |
| 1   | ITT (crono) | Pune          | Lonavala      |   8 | Real      |
| 2   | Flat        | Lonavala      | Lavasa        |  88 | Real      |
| 3   | Hills       | Lavasa        | Panchgani     | 105 | Real      |
| 4   | Flat        | Panchgani     | Mahabaleshwar | 135 | Real      |
| 5   | Flat        | Mahabaleshwar | Sinhagad      |  95 | Real      |

### Race Morvedre (ES)

CON · .1 · un-dia · 1 etapa · día 23

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Sagunto | Segorbe | 210 | Inventado |

### Race Sharjah (AE)

CON · .2 · una-semana · 5 etapas · día 23

| #   | Tipo          | Salida         | Meta           |  km | Recorrido |
| --- | ------------- | -------------- | -------------- | --: | --------- |
| 1   | Flat          | Sharjah        | Ajman          | 169 | Inventado |
| 2   | Flat          | Ajman          | Ras Al Khaimah | 176 | Inventado |
| 3   | Hills         | Ras Al Khaimah | Dibba          | 181 | Inventado |
| 4   | ITT (crono)   | Dibba          | Khor Fakkan    |  15 | Inventado |
| 5   | Uphill finish | Khor Fakkan    | Fujairah       | 130 | Inventado |

### Race Castellón (ES)

CON · .1 · un-dia · 1 etapa · día 24

| #   | Tipo | Salida    | Meta     |  km | Recorrido |
| --- | ---- | --------- | -------- | --: | --------- |
| 1   | Flat | Castellon | Valencia | 210 | Inventado |

### Race Valencia GP (ES)

CON · .1 · un-dia · 1 etapa · día 25

| #   | Tipo | Salida   | Meta     |  km | Recorrido |
| --- | ---- | -------- | -------- | --: | --------- |
| 1   | Flat | Valencia | Valencia | 210 | Inventado |

### Race Calvià (ES)

CON · .1 · un-dia · 1 etapa · día 28

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Calvia | Palma | 210 | Inventado |

### Race Ses Salines (ES)

CON · .1 · un-dia · 1 etapa · día 29

| #   | Tipo          | Salida      | Meta       |  km | Recorrido |
| --- | ------------- | ----------- | ---------- | --: | --------- |
| 1   | Summit finish | Ses Salines | Sa Calobra | 210 | Inventado |

### Race Tramuntana (ES)

CON · .1 · un-dia · 1 etapa · día 30

| #   | Tipo          | Salida | Meta       |  km | Recorrido |
| --- | ------------- | ------ | ---------- | --: | --------- |
| 1   | Summit finish | Soller | Sa Calobra | 210 | Inventado |

### Race Andratx (ES)

CON · .1 · un-dia · 1 etapa · día 31

| #   | Tipo  | Salida  | Meta  |  km | Recorrido |
| --- | ----- | ------- | ----- | --: | --------- |
| 1   | Hills | Andratx | Palma | 210 | Inventado |

### Race Marseille (FR)

CON · .1 · un-dia · 1 etapa · día 32

| #   | Tipo  | Salida    | Meta      |  km | Recorrido |
| --- | ----- | --------- | --------- | --: | --------- |
| 1   | Hills | Marseille | Marseille | 210 | Inventado |

### Race Palma (ES)

CON · .1 · un-dia · 1 etapa · día 32

| #   | Tipo | Salida | Meta  |  km | Recorrido |
| --- | ---- | ------ | ----- | --: | --------- |
| 1   | Flat | Palma  | Palma | 210 | Inventado |

### Race Colombia (CO)

CON · .1 · una-semana · 9 etapas · día 34

| #   | Tipo          | Salida   | Meta              |  km | Recorrido   |
| --- | ------------- | -------- | ----------------- | --: | ----------- |
| 1   | Flat          | Yopal    | Yopal             | 206 | Sin validar |
| 2   | Summit finish | Yopal    | Alto del Porvenir | 153 | Sin validar |
| 3   | ITT (crono)   | Curisi   | Toquilla          |  33 | Sin validar |
| 4   | Hills         | Duitama  | Duitama           | 125 | Sin validar |
| 5   | Summit finish | Mosquera | Alto de La Linea  | 232 | Sin validar |
| 6   | Flat          | Armenia  | Cali              | 185 | Sin validar |
| 7   | Hills         | Cali     | La Tebaida        | 171 | Sin validar |
| 8   | Summit finish | Alvarado | Alto del Vino     | 217 | Sin validar |
| 9   | Hills         | Sopo     | Bogota            | 139 | Sin validar |

### Race Bessèges (FR)

CON · .1 · una-semana · 5 etapas · día 35

| #   | Tipo          | Salida     | Meta            |  km | Recorrido |
| --- | ------------- | ---------- | --------------- | --: | --------- |
| 1   | Flat          | Bellegarde | Nimes           | 184 | Inventado |
| 2   | Hills         | Nimes      | Besseges        | 165 | Inventado |
| 3   | Hills         | Besseges   | Ales            | 180 | Inventado |
| 4   | Uphill finish | Ales       | Laudun          | 164 | Inventado |
| 5   | Flat          | Laudun     | La Grande-Motte | 159 | Inventado |

### Race Victoria (AU)

CON · .1 · una-semana · 5 etapas · día 35

| #   | Tipo          | Salida       | Meta         |  km | Recorrido |
| --- | ------------- | ------------ | ------------ | --: | --------- |
| 1   | Flat          | Melbourne    | Sorrento     | 180 | Inventado |
| 2   | Uphill finish | Sorrento     | Arthurs Seat | 150 | Inventado |
| 3   | ITT (crono)   | Arthurs Seat | Melbourne    |  15 | Inventado |
| 4   | Hills         | Melbourne    | Kinglake     | 162 | Inventado |
| 5   | Hills         | Kinglake     | Healesville  | 150 | Inventado |

### Race Antalya GP (TR)

CON · .2 · un-dia · 1 etapa · día 38

| #   | Tipo | Salida  | Meta |  km | Recorrido |
| --- | ---- | ------- | ---- | --: | --------- |
| 1   | Flat | Antalya | Side | 210 | Inventado |

### Race Aveiro (PT)

CON · .1 · un-dia · 1 etapa · día 39

| #   | Tipo | Salida | Meta |  km | Recorrido |
| --- | ---- | ------ | ---- | --: | --------- |
| 1   | Flat | Aveiro | Ovar | 210 | Inventado |

### Race Murcia (ES)

CON · .1 · una-semana · 2 etapas · día 44

| #   | Tipo          | Salida    | Meta             |  km | Recorrido |
| --- | ------------- | --------- | ---------------- | --: | --------- |
| 1   | Flat          | Murcia    | Cartagena        | 189 | Inventado |
| 2   | Summit finish | Cartagena | Alhama de Murcia | 143 | Inventado |

### Race Provence (FR)

CON · .1 · una-semana · 3 etapas · día 44

| #   | Tipo          | Salida            | Meta              |  km | Recorrido |
| --- | ------------- | ----------------- | ----------------- | --: | --------- |
| 1   | Flat          | Marseille         | Salon-de-Provence | 188 | Inventado |
| 2   | Uphill finish | Salon-de-Provence | Montagne de Lure  | 169 | Inventado |
| 3   | Summit finish | Montagne de Lure  | Chalet Reynard    | 128 | Inventado |

### Race Jaén (ES)

CON · .1 · un-dia · 1 etapa · día 47

| #   | Tipo  | Salida | Meta |  km | Recorrido |
| --- | ----- | ------ | ---- | --: | --------- |
| 1   | Hills | Ubeda  | Jaen | 210 | Inventado |

### Race Alaiye (TR)

CON · .2 · un-dia · 1 etapa · día 52

| #   | Tipo | Salida | Meta     |  km | Recorrido |
| --- | ---- | ------ | -------- | --: | --------- |
| 1   | Flat | Alanya | Manavgat | 210 | Inventado |

### Race Var (FR)

CON · .1 · un-dia · 1 etapa · día 52

| #   | Tipo  | Salida     | Meta       |  km | Recorrido |
| --- | ----- | ---------- | ---------- | --: | --------- |
| 1   | Hills | Draguignan | Draguignan | 210 | Inventado |

### Race Alpes-Maritimes (FR)

CON · .1 · un-dia · 1 etapa · día 53

| #   | Tipo  | Salida | Meta |  km | Recorrido |
| --- | ----- | ------ | ---- | --: | --------- |
| 1   | Hills | Nice   | Nice | 210 | Inventado |

### Race Rwanda (RW)

CON · .1 · una-semana · 8 etapas · día 53

| #   | Tipo          | Salida  | Meta      |  km | Recorrido   |
| --- | ------------- | ------- | --------- | --: | ----------- |
| 1   | Hills         | Rukomo  | Rwamagana | 174 | Sin validar |
| 2   | Hills         | Nyamata | Huye      | 135 | Sin validar |
| 3   | Hills         | Huye    | Rusizi    | 145 | Sin validar |
| 4   | Hills         | Karongi | Rubavu    | 127 | Sin validar |
| 5   | Flat          | Rubavu  | Rubavu    |  82 | Sin validar |
| 6   | Summit finish | Rubavu  | Musanze   |  84 | Sin validar |
| 7   | Hills         | Musanze | Kigali    | 147 | Sin validar |
| 8   | Hills         | Kigali  | Kigali    |  84 | Sin validar |

### Race Sardegna (IT)

CON · .1 · una-semana · 5 etapas · día 56

| #   | Tipo          | Salida      | Meta     |  km | Recorrido   |
| --- | ------------- | ----------- | -------- | --: | ----------- |
| 1   | Hills         | Castelsardo | Bosa     | 190 | Sin validar |
| 2   | Flat          | Oristano    | Carbonia | 136 | Sin validar |
| 3   | Hills         | Cagliari    | Tortoli  | 168 | Sin validar |
| 4   | Summit finish | Arbatax     | Nuoro    | 154 | Sin validar |
| 5   | Hills         | Nuoro       | Olbia    | 177 | Sin validar |

### Race Aegean (TR)

CON · .1 · un-dia · 1 etapa · día 59

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Izmir  | Selcuk | 210 | Inventado |

### Race Pedalia (GR)

CON · .2 · un-dia · 1 etapa · día 59

| #   | Tipo | Salida   | Meta   |  km | Recorrido |
| --- | ---- | -------- | ------ | --: | --------- |
| 1   | Flat | Marathon | Athens | 210 | Inventado |

### Race Dodecanese (GR)

CON · .1 · un-dia · 1 etapa · día 60

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Lindos | Rhodes | 210 | Inventado |

### Race Samyn (BE)

CON · .1 · un-dia · 1 etapa · día 62

| #   | Tipo    | Salida    | Meta |  km | Recorrido |
| --- | ------- | --------- | ---- | --: | --------- |
| 1   | Cobbles | Quaregnon | Dour | 200 | Inventado |

### Race Umag (HR)

CON · .2 · un-dia · 1 etapa · día 63

| #   | Tipo | Salida   | Meta |  km | Recorrido |
| --- | ---- | -------- | ---- | --: | --------- |
| 1   | Flat | Novigrad | Umag | 210 | Inventado |

### Race Apollon (CY)

CON · .2 · un-dia · 1 etapa · día 66

| #   | Tipo | Salida   | Meta    |  km | Recorrido |
| --- | ---- | -------- | ------- | --: | --------- |
| 1   | Flat | Limassol | Larnaca | 210 | Inventado |

### Race Communes (BE)

CON · .2 · un-dia · 1 etapa · día 66

| #   | Tipo | Salida | Meta        |  km | Recorrido |
| --- | ---- | ------ | ----------- | --: | --------- |
| 1   | Flat | Mons   | La Louviere | 210 | Inventado |

### Race Rhodes GP (GR)

CON · .2 · un-dia · 1 etapa · día 66

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Rhodes | Lindos | 210 | Inventado |

### Race Zwolle (NL)

CON · .2 · un-dia · 1 etapa · día 66

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Zwolle | Zwolle | 210 | Inventado |

### Race Lillers (FR)

CON · .2 · un-dia · 1 etapa · día 67

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Lillers | Lillers | 210 | Inventado |

### Race Poreč (HR)

CON · .2 · un-dia · 1 etapa · día 67

| #   | Tipo  | Salida  | Meta  |  km | Recorrido |
| --- | ----- | ------- | ----- | --: | --------- |
| 1   | Hills | Motovun | Porec | 210 | Inventado |

### Race Rucphen (NL)

CON · .2 · un-dia · 1 etapa · día 67

| #   | Tipo | Salida     | Meta    |  km | Recorrido |
| --- | ---- | ---------- | ------- | --: | --------- |
| 1   | Flat | Roosendaal | Rucphen | 210 | Inventado |

### Race Antalya (TR)

CON · .2 · una-semana · 4 etapas · día 71

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Antalya   | Kemer     | 165 | Inventado |
| 2   | ITT (crono)   | Kemer     | Elmali    |  15 | Inventado |
| 3   | Hills         | Elmali    | Korkuteli | 186 | Inventado |
| 4   | Uphill finish | Korkuteli | Serik     | 143 | Inventado |

### Race Istria (HR)

CON · .2 · una-semana · 4 etapas · día 71

| #   | Tipo        | Salida   | Meta    |  km | Recorrido   |
| --- | ----------- | -------- | ------- | --: | ----------- |
| 1   | ITT (crono) | Vrsar    | Vrsar   |   2 | Sin validar |
| 2   | Hills       | Porec    | Funtana | 142 | Sin validar |
| 3   | Hills       | Novigrad | Motovun | 132 | Sin validar |
| 4   | Hills       | Pazin    | Umag    | 118 | Sin validar |

### Race Rhodes (GR)

CON · .2 · una-semana · 4 etapas · día 71

| #   | Tipo          | Salida      | Meta        |  km | Recorrido |
| --- | ------------- | ----------- | ----------- | --: | --------- |
| 1   | Flat          | Rhodes      | Faliraki    | 179 | Inventado |
| 2   | ITT (crono)   | Faliraki    | Archangelos |  23 | Inventado |
| 3   | Uphill finish | Archangelos | Lindos      | 179 | Inventado |
| 4   | Hills         | Lindos      | Ialysos     | 151 | Inventado |

### Race Popolarissima (IT)

CON · .2 · un-dia · 1 etapa · día 74

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Treviso | Treviso | 210 | Inventado |

### Race Taiwan (TW)

CON · .1 · una-semana · 5 etapas · día 74

| #   | Tipo  | Salida        | Meta        |  km | Recorrido   |
| --- | ----- | ------------- | ----------- | --: | ----------- |
| 1   | Flat  | Taipei        | Taipei      |  81 | Sin validar |
| 2   | Hills | Taoyuan       | Jiaobanshan | 123 | Sin validar |
| 3   | Hills | Fo Guang Shan | Kaohsiung   | 146 | Sin validar |
| 4   | Flat  | Gaoshu        | Liudui      | 131 | Sin validar |
| 5   | Hills | Luye          | Liyu Lake   | 154 | Sin validar |

### Race Youngster Coast (BE)

CON · .2 · un-dia · 1 etapa · día 79

| #   | Tipo    | Salida     | Meta     |  km | Recorrido |
| --- | ------- | ---------- | -------- | --: | --------- |
| 1   | Cobbles | Nieuwpoort | Koksijde | 175 | Inventado |

### Race Ebre (ES)

CON · .1 · un-dia · 1 etapa · día 80

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Tortosa | Gandesa | 210 | Inventado |

### Race Arrábida (PT)

CON · .2 · un-dia · 1 etapa · día 81

| #   | Tipo  | Salida  | Meta     |  km | Recorrido |
| --- | ----- | ------- | -------- | --: | --------- |
| 1   | Hills | Setubal | Sesimbra | 210 | Inventado |

### Race Monseré (BE)

CON · .1 · un-dia · 1 etapa · día 81

| #   | Tipo | Salida    | Meta     |  km | Recorrido |
| --- | ---- | --------- | -------- | --: | --------- |
| 1   | Flat | Roeselare | Hooglede | 210 | Inventado |

### Race Ontur (ES)

CON · .2 · un-dia · 1 etapa · día 81

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Ontur  | Hellin | 210 | Inventado |

### Race Slovenian Istria (SI)

CON · .2 · un-dia · 1 etapa · día 81

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Koper  | Piran | 210 | Inventado |

### Race Thailand (TH)

CON · .1 · una-semana · 6 etapas · día 83

| #   | Tipo          | Salida        | Meta          |  km | Recorrido   |
| --- | ------------- | ------------- | ------------- | --: | ----------- |
| 1   | Flat          | Nong Khai     | Nong Khai     | 109 | Sin validar |
| 2   | Flat          | Phon Phisai   | Nong Khai     | 150 | Sin validar |
| 3   | Summit finish | Nong Khai     | Phu Foi Lom   | 142 | Sin validar |
| 4   | Flat          | Nong Khai     | Tha Bo        | 155 | Sin validar |
| 5   | Flat          | Si Chiang Mai | Si Chiang Mai | 136 | Sin validar |
| 6   | Flat          | Nong Khai     | Nong Khai     | 126 | Sin validar |

### Race Alentejo (PT)

CON · .2 · una-semana · 5 etapas · día 84

| #   | Tipo  | Salida       | Meta            |  km | Recorrido   |
| --- | ----- | ------------ | --------------- | --: | ----------- |
| 1   | Flat  | Beja         | Moura           | 167 | Sin validar |
| 2   | Flat  | Castro Verde | Grandola        | 172 | Sin validar |
| 3   | Flat  | Carvalhal    | Arraiolos       | 182 | Sin validar |
| 4   | Hills | Monforte     | Castelo de Vide | 148 | Sin validar |
| 5   | Hills | Estremoz     | Evora           | 152 | Sin validar |

### Race Olympia (NL)

CON · .2 · una-semana · 5 etapas · día 84

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Apeldoorn  | Nijmegen   | 169 | Inventado |
| 2   | Flat          | Nijmegen   | Arnhem     | 181 | Inventado |
| 3   | Hills         | Arnhem     | Venlo      | 168 | Inventado |
| 4   | ITT (crono)   | Venlo      | Valkenburg |  20 | Inventado |
| 5   | Uphill finish | Valkenburg | Maastricht | 131 | Inventado |

### Race Romagna (IT)

CON · .1 · una-semana · 5 etapas · día 84

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Rimini     | Cesenatico | 191 | Inventado |
| 2   | Uphill finish | Cesenatico | Cesena     | 171 | Inventado |
| 3   | Summit finish | Cesena     | Forli      | 175 | Inventado |
| 4   | Summit finish | Forli      | Faenza     | 148 | Inventado |
| 5   | Flat          | Faenza     | Imola      | 150 | Inventado |

### Race Brda (SI)

CON · .2 · un-dia · 1 etapa · día 85

| #   | Tipo  | Salida      | Meta    |  km | Recorrido |
| --- | ----- | ----------- | ------- | --: | --------- |
| 1   | Hills | Nova Gorica | Dobrovo | 210 | Inventado |

### Race Loire Atlantique (FR)

CON · .2 · un-dia · 1 etapa · día 87

| #   | Tipo | Salida | Meta          |  km | Recorrido |
| --- | ---- | ------ | ------------- | --: | --------- |
| 1   | Flat | Nantes | Saint-Nazaire | 210 | Inventado |

### Race Syedra (TR)

CON · .2 · un-dia · 1 etapa · día 87

| #   | Tipo | Salida | Meta     |  km | Recorrido |
| --- | ---- | ------ | -------- | --: | --------- |
| 1   | Flat | Alanya | Gazipasa | 210 | Inventado |

### Race Annemasse (FR)

CON · .2 · un-dia · 1 etapa · día 88

| #   | Tipo  | Salida    | Meta      |  km | Recorrido |
| --- | ----- | --------- | --------- | --: | --------- |
| 1   | Hills | Annemasse | Annemasse | 210 | Inventado |

### Race Emilia GP (IT)

CON · .1 · un-dia · 1 etapa · día 88

| #   | Tipo  | Salida        | Meta   |  km | Recorrido |
| --- | ----- | ------------- | ------ | --: | --------- |
| 1   | Hills | Reggio Emilia | Modena | 210 | Inventado |

### Race Novo Mesto (SI)

CON · .2 · un-dia · 1 etapa · día 88

| #   | Tipo  | Salida     | Meta   |  km | Recorrido |
| --- | ----- | ---------- | ------ | --: | --------- |
| 1   | Hills | Novo Mesto | Otocec | 210 | Inventado |

### Race Tourangelle (FR)

CON · .1 · un-dia · 1 etapa · día 88

| #   | Tipo  | Salida         | Meta  |  km | Recorrido |
| --- | ----- | -------------- | ----- | --: | --------- |
| 1   | Hills | Azay-le-Rideau | Tours | 210 | Inventado |

### Race Camembert (FR)

CON · .1 · un-dia · 1 etapa · día 90

| #   | Tipo  | Salida    | Meta       |  km | Recorrido |
| --- | ----- | --------- | ---------- | --: | --------- |
| 1   | Hills | Camembert | Vimoutiers | 210 | Inventado |

### Race Alanya (TR)

CON · .2 · un-dia · 1 etapa · día 93

| #   | Tipo | Salida | Meta |  km | Recorrido |
| --- | ---- | ------ | ---- | --: | --------- |
| 1   | Flat | Alanya | Side | 210 | Inventado |

### Race Vitré (FR)

CON · .1 · un-dia · 1 etapa · día 93

| #   | Tipo | Salida | Meta  |  km | Recorrido |
| --- | ---- | ------ | ----- | --: | --------- |
| 1   | Flat | Vitre  | Vitre | 210 | Inventado |

### Race Artois (FR)

CON · .2 · un-dia · 1 etapa · día 94

| #   | Tipo | Salida | Meta  |  km | Recorrido |
| --- | ---- | ------ | ----- | --: | --------- |
| 1   | Flat | Arras  | Arras | 210 | Inventado |

### Race NXT (NL)

CON · .1 · un-dia · 1 etapa · día 94

| #   | Tipo | Salida | Meta      |  km | Recorrido |
| --- | ---- | ------ | --------- | --: | --------- |
| 1   | Flat | Emmen  | Hoogeveen | 210 | Inventado |

### Race Piva (IT)

CON · .2 · un-dia · 1 etapa · día 95

| #   | Tipo  | Salida          | Meta            |  km | Recorrido |
| --- | ----- | --------------- | --------------- | --: | --------- |
| 1   | Hills | Farra di Soligo | Farra di Soligo | 210 | Inventado |

### Race Belvedere (IT)

CON · .2 · un-dia · 1 etapa · día 96

| #   | Tipo  | Salida         | Meta           |  km | Recorrido |
| --- | ----- | -------------- | -------------- | --: | --------- |
| 1   | Hills | Villa Lagarina | Villa Lagarina | 210 | Inventado |

### Race Huy (BE)

CON · .2 · un-dia · 1 etapa · día 96

| #   | Tipo          | Salida    | Meta |  km | Recorrido |
| --- | ------------- | --------- | ---- | --: | --------- |
| 1   | Summit finish | Charleroi | Huy  | 210 | Inventado |

### Race Recioto (IT)

CON · .2 · un-dia · 1 etapa · día 97

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Negrar | Negrar | 210 | Inventado |

### Race Ardennes (BE)

CON · .2 · una-semana · 5 etapas · día 98

| #   | Tipo          | Salida   | Meta     |  km | Recorrido |
| --- | ------------- | -------- | -------- | --: | --------- |
| 1   | Flat          | Liege    | Huy      | 174 | Inventado |
| 2   | Hills         | Huy      | Aywaille | 171 | Inventado |
| 3   | Uphill finish | Aywaille | Stavelot | 166 | Inventado |
| 4   | ITT (crono)   | Stavelot | Spa      |  23 | Inventado |
| 5   | Hills         | Spa      | Liege    | 157 | Inventado |

### Race Mersin (TR)

CON · .2 · una-semana · 4 etapas · día 99

| #   | Tipo          | Salida  | Meta    |  km | Recorrido |
| --- | ------------- | ------- | ------- | --: | --------- |
| 1   | Flat          | Mersin  | Erdemli | 182 | Inventado |
| 2   | Hills         | Erdemli | Silifke | 177 | Inventado |
| 3   | ITT (crono)   | Silifke | Tarsus  |  16 | Inventado |
| 4   | Uphill finish | Tarsus  | Adana   | 136 | Inventado |

### Race Reggio (IT)

CON · .1 · un-dia · 1 etapa · día 100

| #   | Tipo  | Salida        | Meta          |  km | Recorrido |
| --- | ----- | ------------- | ------------- | --: | --------- |
| 1   | Hills | Reggio Emilia | Reggio Emilia | 210 | Inventado |

### Race Braakman (NL)

CON · .2 · un-dia · 1 etapa · día 101

| #   | Tipo | Salida    | Meta      |  km | Recorrido |
| --- | ---- | --------- | --------- | --: | --------- |
| 1   | Flat | Terneuzen | Terneuzen | 210 | Inventado |

### Race Magna Grecia (IT)

CON · .1 · una-semana · 3 etapas · día 101

| #   | Tipo          | Salida               | Meta                 |  km | Recorrido |
| --- | ------------- | -------------------- | -------------------- | --: | --------- |
| 1   | Flat          | Sibari               | Crotone              | 177 | Inventado |
| 2   | Summit finish | Crotone              | Camigliatello Silano | 152 | Inventado |
| 3   | Hills         | Camigliatello Silano | Gambarie             | 149 | Inventado |

### Race Pascua (ES)

CON · .2 · un-dia · 1 etapa · día 102

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Estella | Estella | 210 | Inventado |

### Race Roubaix Espoirs (FR)

CON · .2 · un-dia · 1 etapa · día 102

| #   | Tipo    | Salida               | Meta    |  km | Recorrido |
| --- | ------- | -------------------- | ------- | --: | --------- |
| 1   | Cobbles | Bohain-en-Vermandois | Roubaix | 190 | Inventado |

### Race Ślężański (PL)

CON · .2 · un-dia · 1 etapa · día 102

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Wroclaw | Sobotka | 210 | Inventado |

### Race Vendemiano (IT)

CON · .2 · un-dia · 1 etapa · día 102

| #   | Tipo  | Salida     | Meta           |  km | Recorrido |
| --- | ----- | ---------- | -------------- | --: | --------- |
| 1   | Hills | Conegliano | San Vendemiano | 210 | Inventado |

### Race Galicia (ES)

CON · .1 · una-semana · 5 etapas · día 104

| #   | Tipo          | Salida             | Meta                   |  km | Recorrido   |
| --- | ------------- | ------------------ | ---------------------- | --: | ----------- |
| 1   | Flat          | Maia               | Matosinhos             | 190 | Real        |
| 2   | Hills         | Marin              | A Estrada              | 133 | Real        |
| 3   | ITT (crono)   | Ourense            | O Pereiro de Aguiar    |  16 | Sin validar |
| 4   | Summit finish | A Pobra do Brollon | O Cebreiro             | 137 | Real        |
| 5   | Hills         | Betanzos           | Santiago de Compostela | 160 | Real        |

### Race Limburg (NL)

CON · .1 · un-dia · 1 etapa · día 105

| #   | Tipo  | Salida     | Meta       |  km | Recorrido |
| --- | ----- | ---------- | ---------- | --: | --------- |
| 1   | Hills | Maastricht | Valkenburg | 210 | Inventado |

### Race Loir-et-Cher (FR)

CON · .2 · una-semana · 5 etapas · día 105

| #   | Tipo          | Salida               | Meta                 |  km | Recorrido |
| --- | ------------- | -------------------- | -------------------- | --: | --------- |
| 1   | Flat          | Blois                | Vendome              | 180 | Inventado |
| 2   | Hills         | Vendome              | Montoire-sur-le-Loir | 175 | Inventado |
| 3   | Uphill finish | Montoire-sur-le-Loir | Romorantin-Lanthenay | 155 | Inventado |
| 4   | ITT (crono)   | Romorantin-Lanthenay | Salbris              |  16 | Inventado |
| 5   | Flat          | Salbris              | Blois                | 150 | Inventado |

### Race Algeria (DZ)

CON · .2 · una-semana · 6 etapas · día 107

| #   | Tipo          | Salida  | Meta        |  km | Recorrido |
| --- | ------------- | ------- | ----------- | --: | --------- |
| 1   | Flat          | Algiers | Blida       | 171 | Inventado |
| 2   | Uphill finish | Blida   | Medea       | 160 | Inventado |
| 3   | Hills         | Medea   | Bouira      | 189 | Inventado |
| 4   | Summit finish | Bouira  | Setif       | 173 | Inventado |
| 5   | ITT (crono)   | Setif   | Setif       |  17 | Inventado |
| 6   | Hills         | Setif   | Constantine | 138 | Inventado |

### Race Besançon (FR)

CON · .1 · un-dia · 1 etapa · día 107

| #   | Tipo  | Salida   | Meta     |  km | Recorrido |
| --- | ----- | -------- | -------- | --: | --------- |
| 1   | Hills | Besancon | Besancon | 210 | Inventado |

### Race Bosnia (BA)

CON · .2 · una-semana · 3 etapas · día 107

| #   | Tipo          | Salida   | Meta       |  km | Recorrido |
| --- | ------------- | -------- | ---------- | --: | --------- |
| 1   | Flat          | Mostar   | Sarajevo   | 185 | Inventado |
| 2   | ITT (crono)   | Sarajevo | Jahorina   |  16 | Inventado |
| 3   | Uphill finish | Jahorina | Bjelasnica | 141 | Inventado |

### Race Jura (FR)

CON · .1 · un-dia · 1 etapa · día 108

| #   | Tipo          | Salida          | Meta        |  km | Recorrido |
| --- | ------------- | --------------- | ----------- | --: | --------- |
| 1   | Summit finish | Lons-le-Saunier | Les Rousses | 210 | Inventado |

### Race Liège Espoirs (BE)

CON · .2 · un-dia · 1 etapa · día 108

| #   | Tipo    | Salida   | Meta  |  km | Recorrido |
| --- | ------- | -------- | ----- | --: | --------- |
| 1   | Classic | Bastogne | Liege | 190 | Inventado |

### Race Biella (IT)

CON · .2 · un-dia · 1 etapa · día 109

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Biella | Biella | 210 | Inventado |

### Race Doubs (FR)

CON · .1 · un-dia · 1 etapa · día 109

| #   | Tipo  | Salida     | Meta       |  km | Recorrido |
| --- | ----- | ---------- | ---------- | --: | --------- |
| 1   | Hills | Pontarlier | Pontarlier | 210 | Inventado |

### Race Belgrade (RS)

CON · .2 · una-semana · 4 etapas · día 112

| #   | Tipo          | Salida    | Meta             |  km | Recorrido |
| --- | ------------- | --------- | ---------------- | --: | --------- |
| 1   | Flat          | Belgrade  | Smederevo        | 172 | Inventado |
| 2   | Uphill finish | Smederevo | Pancevo          | 178 | Inventado |
| 3   | ITT (crono)   | Pancevo   | Novi Sad         |  25 | Inventado |
| 4   | Uphill finish | Novi Sad  | Sremski Karlovci | 130 | Inventado |

### Race Asturias (ES)

CON · .1 · una-semana · 4 etapas · día 113

| #   | Tipo          | Salida        | Meta         |  km | Recorrido   |
| --- | ------------- | ------------- | ------------ | --: | ----------- |
| 1   | Summit finish | Oviedo        | Llanes       | 164 | Sin validar |
| 2   | Summit finish | Benia de Onis | Pola de Lena | 144 | Sin validar |
| 3   | Hills         | Castropol     | Vegadeo      | 166 | Sin validar |
| 4   | Hills         | Navia         | Oviedo       | 136 | Sin validar |

### Race Bretagne (FR)

CON · .2 · una-semana · 7 etapas · día 115

| #   | Tipo  | Salida           | Meta             |  km | Recorrido   |
| --- | ----- | ---------------- | ---------------- | --: | ----------- |
| 1   | Flat  | Hirel            | La Fresnais      | 143 | Sin validar |
| 2   | Hills | La Gouesniere    | Le Cambout       | 182 | Sin validar |
| 3   | Hills | Loudeac          | Ploneour-Lanvern | 206 | Sin validar |
| 4   | Hills | Ploneour-Lanvern | Landevant        | 205 | Sin validar |
| 5   | Hills | Erdeven          | Guenrouet        | 164 | Sin validar |
| 6   | Hills | Missillac        | Le Pertre        | 180 | Sin validar |
| 7   | Hills | Landebia         | Plancoet         | 159 | Sin validar |

### Race Liberazione (IT)

CON · .2 · un-dia · 1 etapa · día 115

| #   | Tipo | Salida | Meta |  km | Recorrido |
| --- | ---- | ------ | ---- | --: | --------- |
| 1   | Flat | Roma   | Roma | 210 | Inventado |

### Race Appennino (IT)

CON · .1 · un-dia · 1 etapa · día 116

| #   | Tipo          | Salida      | Meta   |  km | Recorrido |
| --- | ------------- | ----------- | ------ | --: | --------- |
| 1   | Summit finish | Novi Ligure | Genova | 210 | Inventado |

### Race Rutland (GB)

CON · .2 · un-dia · 1 etapa · día 116

| #   | Tipo    | Salida | Meta   |  km | Recorrido |
| --- | ------- | ------ | ------ | --: | --------- |
| 1   | Cobbles | Oakham | Oakham | 180 | Inventado |

### Race Benin (BJ)

CON · .2 · una-semana · 5 etapas · día 117

| #   | Tipo          | Salida      | Meta        |  km | Recorrido |
| --- | ------------- | ----------- | ----------- | --: | --------- |
| 1   | Flat          | Cotonou     | Porto-Novo  | 188 | Inventado |
| 2   | Hills         | Porto-Novo  | Dassa-Zoume | 181 | Inventado |
| 3   | Uphill finish | Dassa-Zoume | Parakou     | 177 | Inventado |
| 4   | ITT (crono)   | Parakou     | Natitingou  |  23 | Inventado |
| 5   | Flat          | Natitingou  | Djougou     | 161 | Inventado |

### Race Gila (US)

CON · .2 · una-semana · 5 etapas · día 119

| #   | Tipo          | Salida      | Meta        |  km | Recorrido   |
| --- | ------------- | ----------- | ----------- | --: | ----------- |
| 1   | ITT (crono)   | Tyrone      | Tyrone      |  26 | Sin validar |
| 2   | Summit finish | Silver City | Mogollon    | 117 | Sin validar |
| 3   | Hills         | Fort Bayard | Fort Bayard | 123 | Sin validar |
| 4   | Flat          | Silver City | Silver City |  45 | Sin validar |
| 5   | Summit finish | Silver City | Silver City | 161 | Sin validar |

### Race Guatemala (GT)

CON · .2 · una-semana · 10 etapas · día 119

| #   | Tipo          | Salida                | Meta                        |  km | Recorrido   |
| --- | ------------- | --------------------- | --------------------------- | --: | ----------- |
| 1   | Flat          | Teculutan             | Puerto Barrios              | 172 | Sin validar |
| 2   | Summit finish | Gualan                | El Corcovado                | 161 | Sin validar |
| 3   | Summit finish | Monjas                | Fraijanes                   | 126 | Sin validar |
| 4   | Flat          | Ciudad Vieja          | Coatepeque                  | 192 | Sin validar |
| 5   | Hills         | Retalhuleu            | San Rafael Pie de la Cuesta | 109 | Sin validar |
| 6   | Summit finish | Catarina              | San Juan Ostuncalco         |  91 | Sin validar |
| 7   | Summit finish | San Francisco El Alto | San Pedro                   | 134 | Sin validar |
| 8   | Summit finish | San Juan La Laguna    | Tecpan                      | 128 | Sin validar |
| 9   | Summit finish | Chimaltenango         | Antigua Guatemala           | 200 | Sin validar |
| 10  | Flat          | Villa Linda           | Guatemala City              | 121 | Sin validar |

### Race Anicolor (PT)

CON · .1 · una-semana · 3 etapas · día 121

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Aveiro    | Porto     | 193 | Inventado |
| 2   | ITT (crono)   | Porto     | Guimaraes |  21 | Inventado |
| 3   | Uphill finish | Guimaraes | Braga     | 145 | Inventado |

### Race Vorarlberg (AT)

CON · .2 · un-dia · 1 etapa · día 121

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Bregenz | Bludenz | 210 | Inventado |

### Race Waasland (BE)

CON · .2 · un-dia · 1 etapa · día 121

| #   | Tipo | Salida       | Meta    |  km | Recorrido |
| --- | ---- | ------------ | ------- | --: | --------- |
| 1   | Flat | Sint-Niklaas | Lokeren | 210 | Inventado |

### Race Herning (DK)

CON · .2 · un-dia · 1 etapa · día 122

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Herning | Herning | 210 | Inventado |

### Race Overijssel (NL)

CON · .2 · un-dia · 1 etapa · día 122

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Rijssen | Rijssen | 210 | Inventado |

### Race Famenne (BE)

CON · .1 · un-dia · 1 etapa · día 123

| #   | Tipo  | Salida            | Meta              |  km | Recorrido |
| --- | ----- | ----------------- | ----------------- | --: | --------- |
| 1   | Hills | Marche-en-Famenne | Marche-en-Famenne | 210 | Inventado |

### Race Funen (DK)

CON · .2 · un-dia · 1 etapa · día 123

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Odense | Odense | 210 | Inventado |

### Race Woensdrecht (NL)

CON · .2 · un-dia · 1 etapa · día 123

| #   | Tipo | Salida         | Meta        |  km | Recorrido |
| --- | ---- | -------------- | ----------- | --: | --------- |
| 1   | Flat | Bergen op Zoom | Woensdrecht | 210 | Inventado |

### Race Fagnes (BE)

CON · .2 · un-dia · 1 etapa · día 126

| #   | Tipo  | Salida | Meta    |  km | Recorrido |
| --- | ----- | ------ | ------- | --: | --------- |
| 1   | Hills | Eupen  | Malmedy | 210 | Inventado |

### Race Hellas (GR)

CON · .1 · una-semana · 5 etapas · día 126

| #   | Tipo          | Salida   | Meta     |  km | Recorrido |
| --- | ------------- | -------- | -------- | --: | --------- |
| 1   | Flat          | Athens   | Thebes   | 175 | Inventado |
| 2   | Hills         | Thebes   | Livadia  | 176 | Inventado |
| 3   | Hills         | Livadia  | Delphi   | 176 | Inventado |
| 4   | Uphill finish | Delphi   | Arachova | 152 | Inventado |
| 5   | Summit finish | Arachova | Lamia    | 136 | Inventado |

### Race Ardennaise (BE)

CON · .2 · un-dia · 1 etapa · día 127

| #   | Tipo  | Salida  | Meta     |  km | Recorrido |
| --- | ----- | ------- | -------- | --: | --------- |
| 1   | Hills | Malmedy | Aywaille | 210 | Inventado |

### Race Beskid (PL)

CON · .2 · un-dia · 1 etapa · día 127

| #   | Tipo  | Salida        | Meta    |  km | Recorrido |
| --- | ----- | ------------- | ------- | --: | --------- |
| 1   | Hills | Bielsko-Biala | Szczyrk | 210 | Inventado |

### Race Kumano (JP)

CON · .2 · una-semana · 4 etapas · día 127

| #   | Tipo          | Salida   | Meta     |  km | Recorrido   |
| --- | ------------- | -------- | -------- | --: | ----------- |
| 1   | Hills         | Inami    | Inami    | 125 | Sin validar |
| 2   | Hills         | Kozagawa | Kozagawa | 128 | Sin validar |
| 3   | Summit finish | Kumano   | Kumano   | 108 | Sin validar |
| 4   | Hills         | Taiji    | Taiji    | 105 | Sin validar |

### Race Beskid Classic (PL)

CON · .2 · un-dia · 1 etapa · día 129

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Zywiec | Wisla | 210 | Inventado |

### Race Sundvolden (NO)

CON · .2 · un-dia · 1 etapa · día 129

| #   | Tipo  | Salida     | Meta      |  km | Recorrido |
| --- | ----- | ---------- | --------- | --: | --------- |
| 1   | Hills | Sundvollen | Norefjell | 210 | Inventado |

### Race Baku (AZ)

CON · .1 · una-semana · 5 etapas · día 130

| #   | Tipo          | Salida   | Meta     |  km | Recorrido |
| --- | ------------- | -------- | -------- | --: | --------- |
| 1   | Flat          | Baku     | Sumqayit | 178 | Inventado |
| 2   | Hills         | Sumqayit | Shamakhi | 163 | Inventado |
| 3   | Hills         | Shamakhi | Kurdamir | 170 | Inventado |
| 4   | Uphill finish | Kurdamir | Gabala   | 151 | Inventado |
| 5   | Flat          | Gabala   | Ganja    | 142 | Inventado |

### Race Ringerike (NO)

CON · .2 · un-dia · 1 etapa · día 130

| #   | Tipo | Salida   | Meta     |  km | Recorrido |
| --- | ---- | -------- | -------- | --: | --------- |
| 1   | Flat | Honefoss | Honefoss | 210 | Inventado |

### Race Zagłębie (PL)

CON · .2 · un-dia · 1 etapa · día 130

| #   | Tipo | Salida    | Meta             |  km | Recorrido |
| --- | ---- | --------- | ---------------- | --: | --------- |
| 1   | Flat | Sosnowiec | Dabrowa Gornicza | 210 | Inventado |

### Race Flèche du Sud (LU)

CON · .1 · una-semana · 5 etapas · día 133

| #   | Tipo          | Salida           | Meta             |  km | Recorrido |
| --- | ------------- | ---------------- | ---------------- | --: | --------- |
| 1   | Flat          | Esch-sur-Alzette | Dudelange        | 195 | Inventado |
| 2   | Hills         | Dudelange        | Rumelange        | 180 | Inventado |
| 3   | ITT (crono)   | Rumelange        | Differdange      |  24 | Inventado |
| 4   | Summit finish | Differdange      | Petange          | 169 | Inventado |
| 5   | Summit finish | Petange          | Esch-sur-Alzette | 147 | Inventado |

### Race Wallonie Circuit (BE)

CON · .1 · un-dia · 1 etapa · día 134

| #   | Tipo  | Salida    | Meta  |  km | Recorrido |
| --- | ----- | --------- | ----- | --: | --------- |
| 1   | Hills | Charleroi | Namur | 210 | Inventado |

### Race Finistère (FR)

CON · .1 · un-dia · 1 etapa · día 136

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Quimper | Quimper | 210 | Inventado |

### Race Arvedi (IT)

CON · .2 · un-dia · 1 etapa · día 137

| #   | Tipo | Salida  | Meta    |  km | Recorrido |
| --- | ---- | ------- | ------- | --: | --------- |
| 1   | Flat | Cremona | Cremona | 210 | Inventado |

### Race Aulne (FR)

CON · .1 · un-dia · 1 etapa · día 137

| #   | Tipo  | Salida     | Meta       |  km | Recorrido |
| --- | ----- | ---------- | ---------- | --: | --------- |
| 1   | Hills | Chateaulin | Chateaulin | 210 | Inventado |

### Race Kempen (BE)

CON · .2 · un-dia · 1 etapa · día 137

| #   | Tipo | Salida    | Meta     |  km | Recorrido |
| --- | ---- | --------- | -------- | --: | --------- |
| 1   | Flat | Herentals | Turnhout | 210 | Inventado |

### Race Köln (DE)

CON · .1 · un-dia · 1 etapa · día 137

| #   | Tipo  | Salida | Meta |  km | Recorrido |
| --- | ----- | ------ | ---- | --: | --------- |
| 1   | Hills | Koln   | Bonn | 210 | Inventado |

### Race Albania (AL)

CON · .2 · una-semana · 5 etapas · día 138

| #   | Tipo          | Salida | Meta   |  km | Recorrido |
| --- | ------------- | ------ | ------ | --: | --------- |
| 1   | Flat          | Tirana | Durres | 187 | Inventado |
| 2   | Flat          | Durres | Kavaje | 167 | Inventado |
| 3   | Hills         | Kavaje | Fier   | 190 | Inventado |
| 4   | Hills         | Fier   | Vlore  | 186 | Inventado |
| 5   | Summit finish | Vlore  | Berat  | 140 | Inventado |

### Race Estrela (PT)

CON · .1 · una-semana · 3 etapas · día 142

| #   | Tipo          | Salida  | Meta            |  km | Recorrido |
| --- | ------------- | ------- | --------------- | --: | --------- |
| 1   | Flat          | Guarda  | Covilha         | 176 | Inventado |
| 2   | ITT (crono)   | Covilha | Torre           |  24 | Inventado |
| 3   | Uphill finish | Torre   | Penhas da Saude | 138 | Inventado |

### Race Veenendaal (NL)

CON · .1 · un-dia · 1 etapa · día 143

| #   | Tipo | Salida     | Meta       |  km | Recorrido |
| --- | ---- | ---------- | ---------- | --: | --------- |
| 1   | Flat | Veenendaal | Veenendaal | 210 | Inventado |

### Race Criquielion (BE)

CON · .1 · un-dia · 1 etapa · día 144

| #   | Tipo  | Salida   | Meta     |  km | Recorrido |
| --- | ----- | -------- | -------- | --: | --------- |
| 1   | Hills | Lessines | Lessines | 210 | Inventado |

### Race Nippon (JP)

CON · .2 · una-semana · 8 etapas · día 144

| #   | Tipo          | Salida      | Meta        |  km | Recorrido |
| --- | ------------- | ----------- | ----------- | --: | --------- |
| 1   | Flat          | Shizuoka    | Numazu      | 193 | Inventado |
| 2   | Summit finish | Numazu      | Izu         | 160 | Inventado |
| 3   | Summit finish | Izu         | Ito         | 179 | Inventado |
| 4   | Hills         | Ito         | Hakone      | 182 | Inventado |
| 5   | Summit finish | Hakone      | Gotemba     | 170 | Inventado |
| 6   | Hills         | Gotemba     | Fujiyoshida | 190 | Inventado |
| 7   | ITT (crono)   | Fujiyoshida | Yamanakako  |  19 | Inventado |
| 8   | Hills         | Yamanakako  | Fujinomiya  | 145 | Inventado |

### Race Antwerp (BE)

CON · .1 · un-dia · 1 etapa · día 145

| #   | Tipo    | Salida    | Meta      |  km | Recorrido |
| --- | ------- | --------- | --------- | --: | --------- |
| 1   | Cobbles | Antwerpen | Antwerpen | 190 | Inventado |

### Race Troyes (FR)

CON · .2 · un-dia · 1 etapa · día 145

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Troyes | Troyes | 210 | Inventado |

### Race Isère (FR)

CON · .2 · una-semana · 5 etapas · día 147

| #   | Tipo          | Salida          | Meta            |  km | Recorrido |
| --- | ------------- | --------------- | --------------- | --: | --------- |
| 1   | Flat          | Vienne          | Grenoble        | 184 | Inventado |
| 2   | Summit finish | Grenoble        | Chamrousse      | 165 | Inventado |
| 3   | Summit finish | Chamrousse      | Villard-de-Lans | 164 | Inventado |
| 4   | ITT (crono)   | Villard-de-Lans | Alpe d'Huez     |  19 | Inventado |
| 5   | Summit finish | Alpe d'Huez     | Les Deux Alpes  | 124 | Inventado |

### Race Lithuania (LT)

CON · .2 · una-semana · 5 etapas · día 147

| #   | Tipo          | Salida       | Meta         |  km | Recorrido |
| --- | ------------- | ------------ | ------------ | --: | --------- |
| 1   | Flat          | Vilnius      | Trakai       | 169 | Inventado |
| 2   | Hills         | Trakai       | Alytus       | 167 | Inventado |
| 3   | ITT (crono)   | Alytus       | Druskininkai |  18 | Inventado |
| 4   | Summit finish | Druskininkai | Kaunas       | 159 | Inventado |
| 5   | Flat          | Kaunas       | Kedainiai    | 156 | Inventado |

### Race Mauritius (MU)

CON · .2 · una-semana · 4 etapas · día 153

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Port Louis | Grand Baie | 177 | Inventado |
| 2   | Summit finish | Grand Baie | Curepipe   | 156 | Inventado |
| 3   | ITT (crono)   | Curepipe   | Mahebourg  |  23 | Inventado |
| 4   | Summit finish | Mahebourg  | Port Louis | 152 | Inventado |

### Race Cameroon (CM)

CON · .2 · una-semana · 8 etapas · día 154

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Yaounde   | Douala    | 184 | Inventado |
| 2   | Hills         | Douala    | Bafoussam | 186 | Inventado |
| 3   | Uphill finish | Bafoussam | Foumban   | 172 | Inventado |
| 4   | Hills         | Foumban   | Dschang   | 185 | Inventado |
| 5   | Summit finish | Dschang   | Bafang    | 154 | Inventado |
| 6   | Hills         | Bafang    | Bamenda   | 174 | Inventado |
| 7   | ITT (crono)   | Bamenda   | Bamenda   |  18 | Inventado |
| 8   | Uphill finish | Bamenda   | Bafoussam | 132 | Inventado |

### Race Mercantour (FR)

CON · .1 · un-dia · 1 etapa · día 154

| #   | Tipo          | Salida | Meta       |  km | Recorrido |
| --- | ------------- | ------ | ---------- | --: | --------- |
| 1   | Summit finish | Nice   | Isola 2000 | 210 | Inventado |

### Race Estonia (EE)

CON · .1 · una-semana · 3 etapas · día 155

| #   | Tipo        | Salida   | Meta     |  km | Recorrido |
| --- | ----------- | -------- | -------- | --: | --------- |
| 1   | Flat        | Tallinn  | Parnu    | 176 | Inventado |
| 2   | ITT (crono) | Parnu    | Viljandi |  23 | Inventado |
| 3   | Hills       | Viljandi | Tartu    | 142 | Inventado |

### Race Oberösterreich (AT)

CON · .2 · una-semana · 4 etapas · día 155

| #   | Tipo          | Salida | Meta  |  km | Recorrido |
| --- | ------------- | ------ | ----- | --: | --------- |
| 1   | Flat          | Linz   | Wels  | 193 | Inventado |
| 2   | Summit finish | Wels   | Steyr | 155 | Inventado |
| 3   | ITT (crono)   | Steyr  | Enns  |  15 | Inventado |
| 4   | Hills         | Enns   | Linz  | 161 | Inventado |

### Race Oise (FR)

CON · .2 · una-semana · 4 etapas · día 155

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Beauvais  | Clermont  | 166 | Inventado |
| 2   | Uphill finish | Clermont  | Senlis    | 174 | Inventado |
| 3   | ITT (crono)   | Senlis    | Compiegne |  23 | Inventado |
| 4   | Hills         | Compiegne | Noyon     | 140 | Inventado |

### Race Heist (BE)

CON · .1 · un-dia · 1 etapa · día 157

| #   | Tipo | Salida            | Meta              |  km | Recorrido |
| --- | ---- | ----------------- | ----------------- | --: | --------- |
| 1   | Flat | Heist-op-den-Berg | Heist-op-den-Berg | 210 | Inventado |

### Race Visegrad (CZ)

CON · .2 · un-dia · 1 etapa · día 158

| #   | Tipo  | Salida | Meta    |  km | Recorrido |
| --- | ----- | ------ | ------- | --: | --------- |
| 1   | Hills | Brno   | Blansko | 210 | Inventado |

### Race Beauce (CA)

CON · .2 · una-semana · 5 etapas · día 161

| #   | Tipo          | Salida                 | Meta                   |  km | Recorrido |
| --- | ------------- | ---------------------- | ---------------------- | --: | --------- |
| 1   | Flat          | Sainte-Marie           | Saint-Georges          | 173 | Inventado |
| 2   | Hills         | Saint-Georges          | Lac-Megantic           | 189 | Inventado |
| 3   | ITT (crono)   | Lac-Megantic           | Beauceville            |  20 | Inventado |
| 4   | Summit finish | Beauceville            | Saint-Joseph-de-Beauce | 163 | Inventado |
| 5   | Hills         | Saint-Joseph-de-Beauce | Saint-Georges          | 148 | Inventado |

### Race Malopolska (PL)

CON · .2 · una-semana · 3 etapas · día 162

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Krakow    | Tarnow    | 194 | Inventado |
| 2   | Uphill finish | Tarnow    | Nowy Sacz | 175 | Inventado |
| 3   | Uphill finish | Nowy Sacz | Krakow    | 141 | Inventado |

### Race Elfsteden (NL)

CON · .1 · un-dia · 1 etapa · día 165

| #   | Tipo | Salida   | Meta     |  km | Recorrido |
| --- | ---- | -------- | -------- | --: | --------- |
| 1   | Flat | Bolsward | Bolsward | 210 | Inventado |

### Race Gippingen (CH)

CON · .1 · un-dia · 1 etapa · día 165

| #   | Tipo  | Salida | Meta        |  km | Recorrido |
| --- | ----- | ------ | ----------- | --: | --------- |
| 1   | Hills | Baden  | Bad Zurzach | 210 | Inventado |

### Race Muur (BE)

CON · .1 · un-dia · 1 etapa · día 165

| #   | Tipo    | Salida | Meta           |  km | Recorrido |
| --- | ------- | ------ | -------------- | --: | --------- |
| 1   | Cobbles | Ninove | Geraardsbergen | 190 | Inventado |

### Race Occitanie (FR)

CON · .1 · una-semana · 4 etapas · día 169

| #   | Tipo          | Salida      | Meta        |  km | Recorrido |
| --- | ------------- | ----------- | ----------- | --: | --------- |
| 1   | Flat          | Auch        | Toulouse    | 193 | Inventado |
| 2   | Uphill finish | Toulouse    | Luz Ardiden | 153 | Inventado |
| 3   | Hills         | Luz Ardiden | Tarbes      | 169 | Inventado |
| 4   | Hills         | Tarbes      | Peyragudes  | 147 | Inventado |

### Race Mazury (PL)

CON · .2 · una-semana · 3 etapas · día 170

| #   | Tipo          | Salida  | Meta    |  km | Recorrido |
| --- | ------------- | ------- | ------- | --: | --------- |
| 1   | Flat          | Olsztyn | Mragowo | 192 | Inventado |
| 2   | Uphill finish | Mragowo | Gizycko | 151 | Inventado |
| 3   | Hills         | Gizycko | Elk     | 146 | Inventado |

### Race Andorra Classic (AD)

CON · .1 · un-dia · 1 etapa · día 172

| #   | Tipo          | Salida           | Meta    |  km | Recorrido |
| --- | ------------- | ---------------- | ------- | --: | --------- |
| 1   | Summit finish | Andorra la Vella | Arcalis | 210 | Inventado |

### Race Lyon (FR)

CON · .1 · una-semana · 3 etapas · día 182

| #   | Tipo          | Salida                 | Meta                   |  km | Recorrido |
| --- | ------------- | ---------------------- | ---------------------- | --: | --------- |
| 1   | Flat          | Lyon                   | Villefranche-sur-Saone | 167 | Inventado |
| 2   | ITT (crono)   | Villefranche-sur-Saone | Chiroubles             |  25 | Inventado |
| 3   | Uphill finish | Chiroubles             | Yzeron                 | 139 | Inventado |

### Race Solidarnosc (PL)

CON · .2 · una-semana · 4 etapas · día 182

| #   | Tipo          | Salida               | Meta                 |  km | Recorrido |
| --- | ------------- | -------------------- | -------------------- | --: | --------- |
| 1   | Flat          | Lodz                 | Piotrkow Trybunalski | 186 | Inventado |
| 2   | Hills         | Piotrkow Trybunalski | Czestochowa          | 185 | Inventado |
| 3   | Hills         | Czestochowa          | Radomsko             | 181 | Inventado |
| 4   | Uphill finish | Radomsko             | Lodz                 | 134 | Inventado |

### Race Sibiu (RO)

CON · .1 · una-semana · 4 etapas · día 185

| #   | Tipo          | Salida   | Meta      |  km | Recorrido |
| --- | ------------- | -------- | --------- | --: | --------- |
| 1   | Flat          | Sibiu    | Medias    | 182 | Inventado |
| 2   | Hills         | Medias   | Paltinis  | 169 | Inventado |
| 3   | ITT (crono)   | Paltinis | Fagaras   |  19 | Inventado |
| 4   | Summit finish | Fagaras  | Balea Lac | 126 | Inventado |

### Race Austria (AT)

CON · .1 · una-semana · 5 etapas · día 189

| #   | Tipo          | Salida                 | Meta                   |  km | Recorrido |
| --- | ------------- | ---------------------- | ---------------------- | --: | --------- |
| 1   | Flat          | Salzburg               | Zell am See            | 178 | Inventado |
| 2   | Hills         | Zell am See            | Heiligenblut           | 173 | Inventado |
| 3   | ITT (crono)   | Heiligenblut           | Sankt Johann im Pongau |  17 | Inventado |
| 4   | Summit finish | Sankt Johann im Pongau | Bad Gastein            | 177 | Inventado |
| 5   | Summit finish | Bad Gastein            | Kitzbuhel              | 139 | Inventado |

### Race Torres Vedras (PT)

CON · .2 · una-semana · 3 etapas · día 191

| #   | Tipo          | Salida        | Meta          |  km | Recorrido |
| --- | ------------- | ------------- | ------------- | --: | --------- |
| 1   | Flat          | Torres Vedras | Lourinha      | 192 | Inventado |
| 2   | Summit finish | Lourinha      | Mafra         | 167 | Inventado |
| 3   | Hills         | Mafra         | Torres Vedras | 153 | Inventado |

### Race Venezuela (VE)

CON · .2 · una-semana · 8 etapas · día 193

| #   | Tipo          | Salida        | Meta       |  km | Recorrido |
| --- | ------------- | ------------- | ---------- | --: | --------- |
| 1   | Flat          | San Cristobal | La Fria    | 182 | Inventado |
| 2   | Summit finish | La Fria       | La Grita   | 169 | Inventado |
| 3   | Summit finish | La Grita      | Bailadores | 170 | Inventado |
| 4   | Summit finish | Bailadores    | Merida     | 157 | Inventado |
| 5   | Uphill finish | Merida        | Timotes    | 153 | Inventado |
| 6   | Summit finish | Timotes       | La Puerta  | 154 | Inventado |
| 7   | ITT (crono)   | La Puerta     | Valera     |  19 | Inventado |
| 8   | Summit finish | Valera        | Bocono     | 151 | Inventado |

### Race Ordizia (ES)

CON · .1 · un-dia · 1 etapa · día 206

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Ordizia | Ordizia | 210 | Inventado |

### Race Castilla y León (ES)

CON · .1 · un-dia · 1 etapa · día 207

| #   | Tipo  | Salida     | Meta    |  km | Recorrido |
| --- | ----- | ---------- | ------- | --: | --------- |
| 1   | Hills | Valladolid | Segovia | 210 | Inventado |

### Race Ain (FR)

CON · .1 · una-semana · 3 etapas · día 209

| #   | Tipo        | Salida          | Meta            |  km | Recorrido |
| --- | ----------- | --------------- | --------------- | --: | --------- |
| 1   | Flat        | Bourg-en-Bresse | Oyonnax         | 187 | Inventado |
| 2   | ITT (crono) | Oyonnax         | Lelex           |  15 | Inventado |
| 3   | Hills       | Lelex           | Grand Colombier | 141 | Inventado |

### Race Alsace (FR)

CON · .2 · una-semana · 5 etapas · día 210

| #   | Tipo          | Salida          | Meta            |  km | Recorrido |
| --- | ------------- | --------------- | --------------- | --: | --------- |
| 1   | Flat          | Strasbourg      | Colmar          | 187 | Inventado |
| 2   | Summit finish | Colmar          | Le Markstein    | 174 | Inventado |
| 3   | Hills         | Le Markstein    | Mulhouse        | 176 | Inventado |
| 4   | ITT (crono)   | Mulhouse        | Ballon d'Alsace |  16 | Inventado |
| 5   | Summit finish | Ballon d'Alsace | Grand Ballon    | 129 | Inventado |

### Race Kreiz Breizh (FR)

CON · .2 · una-semana · 4 etapas · día 212

| #   | Tipo          | Salida          | Meta            |  km | Recorrido |
| --- | ------------- | --------------- | --------------- | --: | --------- |
| 1   | Flat          | Rostrenen       | Carhaix         | 183 | Inventado |
| 2   | Hills         | Carhaix         | Mur-de-Bretagne | 175 | Inventado |
| 3   | Summit finish | Mur-de-Bretagne | Gouarec         | 155 | Inventado |
| 4   | Summit finish | Gouarec         | Callac          | 128 | Inventado |

### Race Getxo (ES)

CON · .1 · un-dia · 1 etapa · día 214

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Getxo  | Getxo | 210 | Inventado |

### Race Maraş (TR)

CON · .2 · una-semana · 4 etapas · día 216

| #   | Tipo          | Salida        | Meta      |  km | Recorrido |
| --- | ------------- | ------------- | --------- | --: | --------- |
| 1   | Flat          | Kahramanmaras | Gaziantep | 166 | Inventado |
| 2   | Hills         | Gaziantep     | Islahiye  | 161 | Inventado |
| 3   | Uphill finish | Islahiye      | Osmaniye  | 179 | Inventado |
| 4   | Hills         | Osmaniye      | Adana     | 152 | Inventado |

### Race Portugal (PT)

CON · .1 · una-semana · 11 etapas · día 217

| #   | Tipo          | Salida             | Meta               |  km | Recorrido   |
| --- | ------------- | ------------------ | ------------------ | --: | ----------- |
| 1   | ITT (crono)   | Maia               | Maia               |   3 | Sin validar |
| 2   | Hills         | Viana do Castelo   | Braga              | 162 | Sin validar |
| 3   | Hills         | Felgueiras         | Fafe               | 168 | Sin validar |
| 4   | Hills         | Boticas            | Braganca           | 185 | Sin validar |
| 5   | Summit finish | Braganca           | Mondim de Basto    | 183 | Sin validar |
| 6   | Flat          | Lamego             | Viseu              | 156 | Sin validar |
| 7   | Hills         | Agueda             | Guarda             | 175 | Sin validar |
| 8   | Summit finish | Sabugal            | Covilha            | 179 | Sin validar |
| 9   | Flat          | Ferreira do Zezere | Santarem           | 178 | Sin validar |
| 10  | Summit finish | Alcobaca           | Alto de Montejunto | 174 | Sin validar |
| 11  | ITT (crono)   | Lisboa             | Lisboa             |  17 | Sin validar |

### Race Szeklerland (RO)

CON · .2 · una-semana · 3 etapas · día 218

| #   | Tipo          | Salida          | Meta              |  km | Recorrido |
| --- | ------------- | --------------- | ----------------- | --: | --------- |
| 1   | Flat          | Sfantu Gheorghe | Miercurea Ciuc    | 186 | Inventado |
| 2   | Uphill finish | Miercurea Ciuc  | Gheorgheni        | 151 | Inventado |
| 3   | Hills         | Gheorgheni      | Odorheiu Secuiesc | 155 | Inventado |

### Race Colombia Tour (CO)

CON · .2 · una-semana · 9 etapas · día 220

| #   | Tipo          | Salida        | Meta          |  km | Recorrido |
| --- | ------------- | ------------- | ------------- | --: | --------- |
| 1   | Flat          | Medellin      | Rionegro      | 194 | Inventado |
| 2   | Uphill finish | Rionegro      | La Union      | 151 | Inventado |
| 3   | Summit finish | La Union      | Sonson        | 154 | Inventado |
| 4   | Hills         | Sonson        | Abejorral     | 171 | Inventado |
| 5   | Hills         | Abejorral     | Santa Barbara | 168 | Inventado |
| 6   | Summit finish | Santa Barbara | Alto de Minas | 166 | Inventado |
| 7   | Hills         | Alto de Minas | Amaga         | 189 | Inventado |
| 8   | ITT (crono)   | Amaga         | Caldas        |  20 | Inventado |
| 9   | Uphill finish | Caldas        | Medellin      | 137 | Inventado |

### Race Polynormande (FR)

CON · .1 · un-dia · 1 etapa · día 228

| #   | Tipo  | Salida                    | Meta                      |  km | Recorrido |
| --- | ----- | ------------------------- | ------------------------- | --: | --------- |
| 1   | Hills | Saint-Martin-de-Landelles | Saint-Martin-de-Landelles | 210 | Inventado |

### Race Limousin (FR)

CON · .1 · una-semana · 4 etapas · día 230

| #   | Tipo          | Salida                 | Meta                   |  km | Recorrido |
| --- | ------------- | ---------------------- | ---------------------- | --: | --------- |
| 1   | Flat          | Limoges                | Saint-Yrieix-la-Perche | 168 | Inventado |
| 2   | Uphill finish | Saint-Yrieix-la-Perche | Brive-la-Gaillarde     | 164 | Inventado |
| 3   | ITT (crono)   | Brive-la-Gaillarde     | Tulle                  |  22 | Inventado |
| 4   | Hills         | Tulle                  | Gueret                 | 149 | Inventado |

### Race West Bohemia (CZ)

CON · .2 · una-semana · 4 etapas · día 232

| #   | Tipo          | Salida          | Meta            |  km | Recorrido |
| --- | ------------- | --------------- | --------------- | --: | --------- |
| 1   | Flat          | Plzen           | Karlovy Vary    | 170 | Inventado |
| 2   | Hills         | Karlovy Vary    | Marianske Lazne | 177 | Inventado |
| 3   | Hills         | Marianske Lazne | Cheb            | 173 | Inventado |
| 4   | Summit finish | Cheb            | Plzen           | 146 | Inventado |

### Race Baltic (LT)

CON · .2 · una-semana · 3 etapas · día 233

| #   | Tipo          | Salida   | Meta     |  km | Recorrido |
| --- | ------------- | -------- | -------- | --: | --------- |
| 1   | Flat          | Klaipeda | Palanga  | 179 | Inventado |
| 2   | Uphill finish | Palanga  | Telsiai  | 178 | Inventado |
| 3   | Hills         | Telsiai  | Kretinga | 147 | Inventado |

### Race Aquitaine (FR)

CON · .1 · una-semana · 4 etapas · día 237

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Bordeaux  | Libourne  | 172 | Inventado |
| 2   | ITT (crono)   | Libourne  | Bergerac  |  24 | Inventado |
| 3   | Uphill finish | Bergerac  | Perigueux | 155 | Inventado |
| 4   | Hills         | Perigueux | Agen      | 160 | Inventado |

### Race Samsun (TR)

CON · .2 · una-semana · 4 etapas · día 239

| #   | Tipo          | Salida   | Meta     |  km | Recorrido |
| --- | ------------- | -------- | -------- | --: | --------- |
| 1   | Flat          | Samsun   | Carsamba | 173 | Inventado |
| 2   | Summit finish | Carsamba | Unye     | 151 | Inventado |
| 3   | ITT (crono)   | Unye     | Fatsa    |  16 | Inventado |
| 4   | Hills         | Fatsa    | Ordu     | 139 | Inventado |

### Race Bulgaria (BG)

CON · .2 · una-semana · 6 etapas · día 241

| #   | Tipo          | Salida   | Meta     |  km | Recorrido |
| --- | ------------- | -------- | -------- | --: | --------- |
| 1   | Flat          | Sofia    | Plovdiv  | 176 | Inventado |
| 2   | Hills         | Plovdiv  | Karlovo  | 187 | Inventado |
| 3   | Uphill finish | Karlovo  | Kazanlak | 168 | Inventado |
| 4   | Hills         | Kazanlak | Sliven   | 163 | Inventado |
| 5   | ITT (crono)   | Sliven   | Yambol   |  17 | Inventado |
| 6   | Uphill finish | Yambol   | Burgas   | 133 | Inventado |

### Race Achterhoek (NL)

CON · .2 · un-dia · 1 etapa · día 242

| #   | Tipo | Salida     | Meta        |  km | Recorrido |
| --- | ---- | ---------- | ----------- | --: | --------- |
| 1   | Flat | Doetinchem | Winterswijk | 210 | Inventado |

### Race Halle (BE)

CON · .2 · un-dia · 1 etapa · día 242

| #   | Tipo | Salida | Meta      |  km | Recorrido |
| --- | ---- | ------ | --------- | --: | --------- |
| 1   | Flat | Halle  | Ingooigem | 210 | Inventado |

### Race Kranj (SI)

CON · .1 · un-dia · 1 etapa · día 242

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Kranj  | Trzic | 210 | Inventado |

### Race Philadelphia (US)

CON · .1 · un-dia · 1 etapa · día 242

| #   | Tipo  | Salida       | Meta         |  km | Recorrido |
| --- | ----- | ------------ | ------------ | --: | --------- |
| 1   | Hills | Philadelphia | Philadelphia | 210 | Inventado |

### Race Plouay (FR)

CON · .2 · un-dia · 1 etapa · día 242

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Plouay | Plouay | 210 | Inventado |

### Race Korea (KR)

CON · .1 · una-semana · 5 etapas · día 243

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Seoul     | Chungju   | 193 | Inventado |
| 2   | Hills         | Chungju   | Mungyeong | 189 | Inventado |
| 3   | Uphill finish | Mungyeong | Andong    | 163 | Inventado |
| 4   | ITT (crono)   | Andong    | Yeongju   |  21 | Inventado |
| 5   | Hills         | Yeongju   | Danyang   | 151 | Inventado |

### Race ZLM (NL)

CON · .1 · una-semana · 5 etapas · día 245

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Eindhoven  | Weert      | 182 | Inventado |
| 2   | Hills         | Weert      | Sittard    | 161 | Inventado |
| 3   | Uphill finish | Sittard    | Roermond   | 173 | Inventado |
| 4   | ITT (crono)   | Roermond   | Valkenburg |  21 | Inventado |
| 5   | Flat          | Valkenburg | Maastricht | 162 | Inventado |

### Race Friuli (IT)

CON · .2 · una-semana · 4 etapas · día 246

| #   | Tipo          | Salida              | Meta                |  km | Recorrido |
| --- | ------------- | ------------------- | ------------------- | --: | --------- |
| 1   | Flat          | Pordenone           | Udine               | 193 | Inventado |
| 2   | ITT (crono)   | Udine               | Cividale del Friuli |  20 | Inventado |
| 3   | Hills         | Cividale del Friuli | Gorizia             | 161 | Inventado |
| 4   | Summit finish | Gorizia             | Trieste             | 150 | Inventado |

### Race Istanbul (TR)

CON · .1 · una-semana · 4 etapas · día 246

| #   | Tipo          | Salida   | Meta      |  km | Recorrido |
| --- | ------------- | -------- | --------- | --: | --------- |
| 1   | Flat          | Istanbul | Gebze     | 184 | Inventado |
| 2   | Hills         | Gebze    | Kartepe   | 176 | Inventado |
| 3   | Uphill finish | Kartepe  | Sapanca   | 170 | Inventado |
| 4   | Hills         | Sapanca  | Adapazari | 146 | Inventado |

### Race Kosovo (XK)

CON · .2 · una-semana · 4 etapas · día 246

| #   | Tipo          | Salida   | Meta    |  km | Recorrido |
| --- | ------------- | -------- | ------- | --: | --------- |
| 1   | Flat          | Pristina | Ferizaj | 170 | Inventado |
| 2   | Hills         | Ferizaj  | Prizren | 162 | Inventado |
| 3   | ITT (crono)   | Prizren  | Gjakova |  21 | Inventado |
| 4   | Summit finish | Gjakova  | Peja    | 146 | Inventado |

### Race Sauerland (DE)

CON · .2 · una-semana · 4 etapas · día 246

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Arnsberg   | Meschede   | 185 | Inventado |
| 2   | Summit finish | Meschede   | Winterberg | 157 | Inventado |
| 3   | ITT (crono)   | Winterberg | Brilon     |  23 | Inventado |
| 4   | Uphill finish | Brilon     | Arnsberg   | 150 | Inventado |

### Race South Bohemia (CZ)

CON · .2 · una-semana · 4 etapas · día 246

| #   | Tipo          | Salida            | Meta              |  km | Recorrido |
| --- | ------------- | ----------------- | ----------------- | --: | --------- |
| 1   | Flat          | Ceske Budejovice  | Tabor             | 185 | Inventado |
| 2   | Summit finish | Tabor             | Jindrichuv Hradec | 169 | Inventado |
| 3   | ITT (crono)   | Jindrichuv Hradec | Trebon            |  17 | Inventado |
| 4   | Summit finish | Trebon            | Ceske Budejovice  | 149 | Inventado |

### Race Somme (FR)

CON · .2 · un-dia · 1 etapa · día 249

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Amiens | Amiens | 210 | Inventado |

### Race Ecuador (EC)

CON · .2 · una-semana · 6 etapas · día 250

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Quito     | Latacunga | 194 | Inventado |
| 2   | Hills         | Latacunga | Zumbahua  | 173 | Inventado |
| 3   | Hills         | Zumbahua  | Ambato    | 182 | Inventado |
| 4   | Hills         | Ambato    | Riobamba  | 162 | Inventado |
| 5   | ITT (crono)   | Riobamba  | Guano     |  23 | Inventado |
| 6   | Summit finish | Guano     | Banos     | 146 | Inventado |

### Race Romania (RO)

CON · .2 · una-semana · 5 etapas · día 252

| #   | Tipo          | Salida      | Meta        |  km | Recorrido |
| --- | ------------- | ----------- | ----------- | --: | --------- |
| 1   | Flat          | Cluj-Napoca | Targu Mures | 191 | Inventado |
| 2   | Flat          | Targu Mures | Sighisoara  | 188 | Inventado |
| 3   | Hills         | Sighisoara  | Medias      | 177 | Inventado |
| 4   | Hills         | Medias      | Sibiu       | 177 | Inventado |
| 5   | Summit finish | Sibiu       | Alba Iulia  | 140 | Inventado |

### Race Toscana (IT)

CON · .1 · un-dia · 1 etapa · día 252

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Arezzo | Siena | 210 | Inventado |

### Race Morocco (MA)

CON · .2 · una-semana · 8 etapas · día 254

| #   | Tipo          | Salida      | Meta        |  km | Recorrido |
| --- | ------------- | ----------- | ----------- | --: | --------- |
| 1   | Flat          | Casablanca  | Marrakesh   | 192 | Inventado |
| 2   | Uphill finish | Marrakesh   | Asni        | 152 | Inventado |
| 3   | Uphill finish | Asni        | Amizmiz     | 172 | Inventado |
| 4   | Hills         | Amizmiz     | Setti Fatma | 165 | Inventado |
| 5   | Hills         | Setti Fatma | Tahannaout  | 175 | Inventado |
| 6   | ITT (crono)   | Tahannaout  | Oukaimeden  |  22 | Inventado |
| 7   | Summit finish | Oukaimeden  | Oukaimeden  | 178 | Inventado |
| 8   | Hills         | Oukaimeden  | Asni        | 147 | Inventado |

### Race Pantani (IT)

CON · .1 · un-dia · 1 etapa · día 255

| #   | Tipo          | Salida     | Meta           |  km | Recorrido |
| --- | ------------- | ---------- | -------------- | --: | --------- |
| 1   | Summit finish | Cesenatico | Monte Carpegna | 210 | Inventado |

### Race Taihu (CN)

CON · .1 · una-semana · 5 etapas · día 255

| #   | Tipo          | Salida  | Meta    |  km | Recorrido |
| --- | ------------- | ------- | ------- | --: | --------- |
| 1   | Flat          | Wuxi    | Suzhou  | 192 | Inventado |
| 2   | Hills         | Suzhou  | Wujiang | 187 | Inventado |
| 3   | Uphill finish | Wujiang | Huzhou  | 174 | Inventado |
| 4   | ITT (crono)   | Huzhou  | Yixing  |  22 | Inventado |
| 5   | Flat          | Yixing  | Wuxi    | 151 | Inventado |

### Race Matteotti (IT)

CON · .1 · un-dia · 1 etapa · día 256

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Pescara | Pescara | 210 | Inventado |

### Race Abruzzo (IT)

CON · .1 · una-semana · 4 etapas · día 258

| #   | Tipo          | Salida    | Meta      |  km | Recorrido |
| --- | ------------- | --------- | --------- | --: | --------- |
| 1   | Flat          | Pescara   | Vasto     | 180 | Inventado |
| 2   | Summit finish | Vasto     | Roccaraso | 172 | Inventado |
| 3   | ITT (crono)   | Roccaraso | Sulmona   |  16 | Inventado |
| 4   | Summit finish | Sulmona   | Blockhaus | 133 | Inventado |

### Race Slovakia (SK)

CON · .1 · una-semana · 5 etapas · día 259

| #   | Tipo          | Salida          | Meta            |  km | Recorrido |
| --- | ------------- | --------------- | --------------- | --: | --------- |
| 1   | Flat          | Bratislava      | Trnava          | 172 | Inventado |
| 2   | Flat          | Trnava          | Nitra           | 182 | Inventado |
| 3   | Hills         | Nitra           | Banska Bystrica | 170 | Inventado |
| 4   | Summit finish | Banska Bystrica | Poprad          | 173 | Inventado |
| 5   | Uphill finish | Poprad          | Kosice          | 153 | Inventado |

### Race Serbia (RS)

CON · .2 · una-semana · 4 etapas · día 260

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Belgrade   | Kragujevac | 191 | Inventado |
| 2   | Summit finish | Kragujevac | Kraljevo   | 150 | Inventado |
| 3   | ITT (crono)   | Kraljevo   | Cacak      |  14 | Inventado |
| 4   | Hills         | Cacak      | Uzice      | 155 | Inventado |

### Race Vlaanderen (BE)

CON · .1 · un-dia · 1 etapa · día 261

| #   | Tipo | Salida | Meta |  km | Recorrido |
| --- | ---- | ------ | ---- | --: | --------- |
| 1   | Flat | Brugge | Gent | 210 | Inventado |

### Race Lazio (IT)

CON · .1 · un-dia · 1 etapa · día 262

| #   | Tipo  | Salida    | Meta |  km | Recorrido |
| --- | ----- | --------- | ---- | --: | --------- |
| 1   | Hills | Frosinone | Roma | 210 | Inventado |

### Race Gooik (BE)

CON · .1 · un-dia · 1 etapa · día 263

| #   | Tipo | Salida | Meta  |  km | Recorrido |
| --- | ---- | ------ | ----- | --: | --------- |
| 1   | Flat | Gooik  | Gooik | 210 | Inventado |

### Race Isbergues (FR)

CON · .1 · un-dia · 1 etapa · día 263

| #   | Tipo | Salida    | Meta      |  km | Recorrido |
| --- | ---- | --------- | --------- | --: | --------- |
| 1   | Flat | Isbergues | Isbergues | 210 | Inventado |

### Race Poyang (CN)

CON · .2 · una-semana · 6 etapas · día 263

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Nanchang   | Jiujiang   | 193 | Inventado |
| 2   | Hills         | Jiujiang   | Lushan     | 184 | Inventado |
| 3   | Summit finish | Lushan     | Jingdezhen | 159 | Inventado |
| 4   | Hills         | Jingdezhen | Wuyuan     | 174 | Inventado |
| 5   | ITT (crono)   | Wuyuan     | Shangrao   |  15 | Inventado |
| 6   | Uphill finish | Shangrao   | Poyang     | 151 | Inventado |

### Race Romagna Classic (IT)

CON · .1 · un-dia · 1 etapa · día 263

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Lugo   | Faenza | 210 | Inventado |

### Race Houtland (BE)

CON · .1 · un-dia · 1 etapa · día 266

| #   | Tipo | Salida  | Meta         |  km | Recorrido |
| --- | ---- | ------- | ------------ | --: | --------- |
| 1   | Flat | Torhout | Lichtervelde | 210 | Inventado |

### Race Mirabelle (FR)

CON · .2 · un-dia · 1 etapa · día 268

| #   | Tipo  | Salida | Meta  |  km | Recorrido |
| --- | ----- | ------ | ----- | --: | --------- |
| 1   | Hills | Nancy  | Nancy | 210 | Inventado |

### Race Cerami (BE)

CON · .2 · un-dia · 1 etapa · día 269

| #   | Tipo | Salida    | Meta      |  km | Recorrido |
| --- | ---- | --------- | --------- | --: | --------- |
| 1   | Flat | Quaregnon | Frameries | 210 | Inventado |

### Race Chauny (FR)

CON · .1 · un-dia · 1 etapa · día 270

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Chauny | Chauny | 210 | Inventado |

### Race Cholet (FR)

CON · .1 · un-dia · 1 etapa · día 276

| #   | Tipo | Salida | Meta   |  km | Recorrido |
| --- | ---- | ------ | ------ | --: | --------- |
| 1   | Flat | Cholet | Cholet | 210 | Inventado |

### Race Agostoni (IT)

CON · .1 · un-dia · 1 etapa · día 277

| #   | Tipo  | Salida  | Meta    |  km | Recorrido |
| --- | ----- | ------- | ------- | --: | --------- |
| 1   | Hills | Lissone | Lissone | 210 | Inventado |

### Race Continental Championship (FR)

CON · .1 · un-dia · 1 etapa · día 277

| #   | Tipo  | Salida   | Meta     |  km | Recorrido |
| --- | ----- | -------- | -------- | --: | --------- |
| 1   | Hills | Plumelec | Plumelec | 210 | Inventado |

### Race Vendée (FR)

CON · .1 · un-dia · 1 etapa · día 277

| #   | Tipo | Salida           | Meta             |  km | Recorrido |
| --- | ---- | ---------------- | ---------------- | --: | --------- |
| 1   | Flat | La Roche-sur-Yon | La Roche-sur-Yon | 210 | Inventado |

### Race Binche (BE)

CON · .1 · un-dia · 1 etapa · día 279

| #   | Tipo  | Salida | Meta   |  km | Recorrido |
| --- | ----- | ------ | ------ | --: | --------- |
| 1   | Hills | Binche | Binche | 210 | Inventado |

### Race San Daniele (IT)

CON · .2 · un-dia · 1 etapa · día 279

| #   | Tipo  | Salida                 | Meta                   |  km | Recorrido |
| --- | ----- | ---------------------- | ---------------------- | --: | --------- |
| 1   | Hills | San Daniele del Friuli | San Daniele del Friuli | 210 | Inventado |

### Race Kyushu (JP)

CON · .1 · una-semana · 3 etapas · día 283

| #   | Tipo          | Salida  | Meta    |  km | Recorrido |
| --- | ------------- | ------- | ------- | --: | --------- |
| 1   | Flat          | Fukuoka | Hita    | 180 | Inventado |
| 2   | Hills         | Hita    | Kokonoe | 190 | Inventado |
| 3   | Uphill finish | Kokonoe | Beppu   | 152 | Inventado |

### Race Oropa (IT)

CON · .1 · un-dia · 1 etapa · día 284

| #   | Tipo          | Salida | Meta  |  km | Recorrido |
| --- | ------------- | ------ | ----- | --: | --------- |
| 1   | Summit finish | Biella | Oropa | 210 | Inventado |

### Race Holland (NL)

CON · .1 · una-semana · 6 etapas · día 286

| #   | Tipo          | Salida     | Meta       |  km | Recorrido |
| --- | ------------- | ---------- | ---------- | --: | --------- |
| 1   | Flat          | Amsterdam  | Utrecht    | 170 | Inventado |
| 2   | Hills         | Utrecht    | Arnhem     | 170 | Inventado |
| 3   | Hills         | Arnhem     | Venlo      | 169 | Inventado |
| 4   | Uphill finish | Venlo      | Valkenburg | 156 | Inventado |
| 5   | ITT (crono)   | Valkenburg | Sittard    |  16 | Inventado |
| 6   | Flat          | Sittard    | Maastricht | 142 | Inventado |

### Race Chrono (FR)

CON · .1 · un-dia · 1 etapa · día 291

| #   | Tipo        | Salida       | Meta         |  km | Recorrido |
| --- | ----------- | ------------ | ------------ | --: | --------- |
| 1   | ITT (crono) | Les Herbiers | Les Herbiers |  45 | Inventado |

### Race Faso (BF)

CON · .2 · una-semana · 5 etapas · día 303

| #   | Tipo          | Salida         | Meta           |  km | Recorrido |
| --- | ------------- | -------------- | -------------- | --: | --------- |
| 1   | Flat          | Ouagadougou    | Koudougou      | 171 | Inventado |
| 2   | Hills         | Koudougou      | Bobo-Dioulasso | 190 | Inventado |
| 3   | Uphill finish | Bobo-Dioulasso | Banfora        | 161 | Inventado |
| 4   | ITT (crono)   | Banfora        | Sindou         |  18 | Inventado |
| 5   | Flat          | Sindou         | Bobo-Dioulasso | 154 | Inventado |

## Campeonatos nacionales

Una prueba en línea y una contrarreloj por país y categoría. Recorrido generado: no hay trazado publicado que cargar.

### Australia ITT Championship (AU)

CON · .NC · un-dia · 1 etapa · día 8

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Australia U23 ITT Championship (AU)

CON · .NC · un-dia · 1 etapa · día 8

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Australia Road Championship (AU)

CON · .NC · un-dia · 1 etapa · día 11

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Australia U23 Road Championship (AU)

CON · .NC · un-dia · 1 etapa · día 11

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Thailand ITT Championship (TH)

CON · .NC · un-dia · 1 etapa · día 15

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Thailand U23 ITT Championship (TH)

CON · .NC · un-dia · 1 etapa · día 15

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Thailand Road Championship (TH)

CON · .NC · un-dia · 1 etapa · día 18

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Thailand U23 Road Championship (TH)

CON · .NC · un-dia · 1 etapa · día 18

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Zimbabwe ITT Championship (ZW)

CON · .NC · un-dia · 1 etapa · día 34

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Colombia ITT Championship (CO)

CON · .NC · un-dia · 1 etapa · día 35

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### New Zealand ITT Championship (NZ)

CON · .NC · un-dia · 1 etapa · día 35

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### New Zealand U23 ITT Championship (NZ)

CON · .NC · un-dia · 1 etapa · día 35

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Zimbabwe U23 ITT Championship (ZW)

CON · .NC · un-dia · 1 etapa · día 35

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Colombia U23 ITT Championship (CO)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Namibia ITT Championship (NA)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Namibia U23 ITT Championship (NA)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### South Africa ITT Championship (ZA)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### South Africa U23 ITT Championship (ZA)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Uruguay ITT Championship (UY)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Uruguay U23 ITT Championship (UY)

CON · .NC · un-dia · 1 etapa · día 36

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Zimbabwe U23 Road Championship (ZW)

CON · .NC · un-dia · 1 etapa · día 37

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Colombia U23 Road Championship (CO)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Namibia U23 Road Championship (NA)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### New Zealand Road Championship (NZ)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### New Zealand U23 Road Championship (NZ)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### South Africa U23 Road Championship (ZA)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Uruguay U23 Road Championship (UY)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Zimbabwe Road Championship (ZW)

CON · .NC · un-dia · 1 etapa · día 38

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Colombia Road Championship (CO)

CON · .NC · un-dia · 1 etapa · día 39

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Namibia Road Championship (NA)

CON · .NC · un-dia · 1 etapa · día 39

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### South Africa Road Championship (ZA)

CON · .NC · un-dia · 1 etapa · día 39

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Uruguay Road Championship (UY)

CON · .NC · un-dia · 1 etapa · día 39

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Philippines ITT Championship (PH)

CON · .NC · un-dia · 1 etapa · día 55

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Philippines U23 ITT Championship (PH)

CON · .NC · un-dia · 1 etapa · día 55

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Bolivia ITT Championship (BO)

CON · .NC · un-dia · 1 etapa · día 56

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Bolivia U23 ITT Championship (BO)

CON · .NC · un-dia · 1 etapa · día 57

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Philippines U23 Road Championship (PH)

CON · .NC · un-dia · 1 etapa · día 57

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Philippines Road Championship (PH)

CON · .NC · un-dia · 1 etapa · día 58

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Bolivia U23 Road Championship (BO)

CON · .NC · un-dia · 1 etapa · día 59

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bolivia Road Championship (BO)

CON · .NC · un-dia · 1 etapa · día 60

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Chile ITT Championship (CL)

CON · .NC · un-dia · 1 etapa · día 64

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Chile U23 ITT Championship (CL)

CON · .NC · un-dia · 1 etapa · día 64

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Chile U23 Road Championship (CL)

CON · .NC · un-dia · 1 etapa · día 66

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Chile Road Championship (CL)

CON · .NC · un-dia · 1 etapa · día 67

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### United Arab Emirates ITT Championship (AE)

CON · .NC · un-dia · 1 etapa · día 99

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### United Arab Emirates U23 ITT Championship (AE)

CON · .NC · un-dia · 1 etapa · día 99

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### United Arab Emirates U23 Road Championship (AE)

CON · .NC · un-dia · 1 etapa · día 101

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### United Arab Emirates Road Championship (AE)

CON · .NC · un-dia · 1 etapa · día 102

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Costa Rica ITT Championship (CR)

CON · .NC · un-dia · 1 etapa · día 106

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Costa Rica U23 ITT Championship (CR)

CON · .NC · un-dia · 1 etapa · día 106

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Costa Rica U23 Road Championship (CR)

CON · .NC · un-dia · 1 etapa · día 108

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Costa Rica Road Championship (CR)

CON · .NC · un-dia · 1 etapa · día 109

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Egypt ITT Championship (EG)

CON · .NC · un-dia · 1 etapa · día 112

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Egypt U23 ITT Championship (EG)

CON · .NC · un-dia · 1 etapa · día 112

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Panama ITT Championship (PA)

CON · .NC · un-dia · 1 etapa · día 113

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Panama U23 ITT Championship (PA)

CON · .NC · un-dia · 1 etapa · día 113

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Egypt U23 Road Championship (EG)

CON · .NC · un-dia · 1 etapa · día 114

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Egypt Road Championship (EG)

CON · .NC · un-dia · 1 etapa · día 115

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Panama Road Championship (PA)

CON · .NC · un-dia · 1 etapa · día 116

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Panama U23 Road Championship (PA)

CON · .NC · un-dia · 1 etapa · día 116

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Ecuador ITT Championship (EC)

CON · .NC · un-dia · 1 etapa · día 159

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Ecuador U23 ITT Championship (EC)

CON · .NC · un-dia · 1 etapa · día 160

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Ecuador U23 Road Championship (EC)

CON · .NC · un-dia · 1 etapa · día 162

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Ecuador Road Championship (EC)

CON · .NC · un-dia · 1 etapa · día 163

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Macau ITT Championship (MO)

CON · .NC · un-dia · 1 etapa · día 168

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Macau U23 ITT Championship (MO)

CON · .NC · un-dia · 1 etapa · día 169

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Macau U23 Road Championship (MO)

CON · .NC · un-dia · 1 etapa · día 171

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Macau Road Championship (MO)

CON · .NC · un-dia · 1 etapa · día 172

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Andorra ITT Championship (AD)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Antigua and Barbuda ITT Championship (AG)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Bahrain ITT Championship (BH)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Barbados ITT Championship (BB)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Belarus ITT Championship (BY)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Belize ITT Championship (BZ)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Bosnia and Herzegovina ITT Championship (BA)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Cyprus ITT Championship (CY)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Czechia ITT Championship (CZ)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Dominican Republic ITT Championship (DO)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### El Salvador ITT Championship (SV)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Eritrea ITT Championship (ER)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Finland ITT Championship (FI)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Georgia ITT Championship (GE)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Germany ITT Championship (DE)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Guatemala ITT Championship (GT)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Iceland ITT Championship (IS)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Israel ITT Championship (IL)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Jordan ITT Championship (JO)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Kosovo ITT Championship (XK)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Laos ITT Championship (LA)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Lithuania ITT Championship (LT)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Mali ITT Championship (ML)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Montenegro ITT Championship (ME)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Norway ITT Championship (NO)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Poland ITT Championship (PL)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Portugal ITT Championship (PT)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Russia ITT Championship (RU)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Serbia ITT Championship (RS)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Singapore ITT Championship (SG)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Sint Maarten ITT Championship (SX)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Slovenia ITT Championship (SI)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Switzerland ITT Championship (CH)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Ukraine ITT Championship (UA)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Venezuela ITT Championship (VE)

CON · .NC · un-dia · 1 etapa · día 175

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Albania ITT Championship (AL)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Albania U23 ITT Championship (AL)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Algeria ITT Championship (DZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Algeria U23 ITT Championship (DZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Andorra U23 ITT Championship (AD)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Antigua and Barbuda U23 ITT Championship (AG)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Argentina ITT Championship (AR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Argentina U23 ITT Championship (AR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Armenia ITT Championship (AM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Armenia U23 ITT Championship (AM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Austria ITT Championship (AT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Austria U23 ITT Championship (AT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Azerbaijan ITT Championship (AZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Azerbaijan U23 ITT Championship (AZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Bahrain U23 ITT Championship (BH)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Barbados U23 ITT Championship (BB)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Belarus U23 ITT Championship (BY)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Belgium ITT Championship (BE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Belgium U23 ITT Championship (BE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Belize U23 ITT Championship (BZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Benin ITT Championship (BJ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Benin U23 ITT Championship (BJ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Bermuda ITT Championship (BM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Bermuda U23 ITT Championship (BM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Bosnia and Herzegovina U23 ITT Championship (BA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Brazil ITT Championship (BR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Brazil U23 ITT Championship (BR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Bulgaria ITT Championship (BG)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Bulgaria U23 ITT Championship (BG)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Burkina Faso ITT Championship (BF)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Burkina Faso U23 ITT Championship (BF)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Cameroon ITT Championship (CM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Cameroon U23 ITT Championship (CM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Canada ITT Championship (CA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Canada U23 ITT Championship (CA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Cape Verde ITT Championship (CV)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Cape Verde U23 ITT Championship (CV)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Cayman Islands ITT Championship (KY)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Cayman Islands U23 ITT Championship (KY)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### China ITT Championship (CN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### China U23 ITT Championship (CN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Croatia ITT Championship (HR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Croatia U23 ITT Championship (HR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Cuba ITT Championship (CU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Cuba U23 ITT Championship (CU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Cyprus U23 ITT Championship (CY)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Czechia U23 ITT Championship (CZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Denmark ITT Championship (DK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Denmark U23 ITT Championship (DK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Dominica ITT Championship (DM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Dominica U23 ITT Championship (DM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Dominican Republic U23 ITT Championship (DO)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### El Salvador U23 ITT Championship (SV)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Eritrea U23 ITT Championship (ER)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Estonia ITT Championship (EE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Estonia U23 ITT Championship (EE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Eswatini ITT Championship (SZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Eswatini U23 ITT Championship (SZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Ethiopia ITT Championship (ET)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Ethiopia U23 ITT Championship (ET)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Finland U23 ITT Championship (FI)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### France ITT Championship (FR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### France U23 ITT Championship (FR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Georgia U23 ITT Championship (GE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Germany U23 ITT Championship (DE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Greece ITT Championship (GR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Greece U23 ITT Championship (GR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Guam ITT Championship (GU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Guam U23 ITT Championship (GU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Guatemala U23 ITT Championship (GT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Guinea-Bissau ITT Championship (GW)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Guinea-Bissau U23 ITT Championship (GW)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Honduras ITT Championship (HN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Honduras U23 ITT Championship (HN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Hong Kong ITT Championship (HK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Hong Kong U23 ITT Championship (HK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Hungary ITT Championship (HU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Hungary U23 ITT Championship (HU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Iceland U23 ITT Championship (IS)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### India ITT Championship (IN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### India U23 ITT Championship (IN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Indonesia ITT Championship (ID)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Indonesia U23 ITT Championship (ID)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Ireland ITT Championship (IE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Ireland U23 ITT Championship (IE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Israel U23 ITT Championship (IL)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Italy ITT Championship (IT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Italy U23 ITT Championship (IT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Ivory Coast ITT Championship (CI)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Ivory Coast U23 ITT Championship (CI)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Japan ITT Championship (JP)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Japan U23 ITT Championship (JP)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Jordan U23 ITT Championship (JO)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Kazakhstan ITT Championship (KZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Kazakhstan U23 ITT Championship (KZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Kenya ITT Championship (KE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Kenya U23 ITT Championship (KE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Kosovo U23 ITT Championship (XK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Laos U23 ITT Championship (LA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Latvia ITT Championship (LV)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Latvia U23 ITT Championship (LV)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Lebanon ITT Championship (LB)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Lebanon U23 ITT Championship (LB)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Lithuania U23 ITT Championship (LT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Luxembourg ITT Championship (LU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Luxembourg U23 ITT Championship (LU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Mali U23 ITT Championship (ML)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Malta ITT Championship (MT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Malta U23 ITT Championship (MT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Mauritius ITT Championship (MU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Mauritius U23 ITT Championship (MU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Mexico ITT Championship (MX)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Mexico U23 ITT Championship (MX)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Moldova ITT Championship (MD)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Moldova U23 ITT Championship (MD)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Monaco ITT Championship (MC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Monaco U23 ITT Championship (MC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Montenegro U23 ITT Championship (ME)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Morocco ITT Championship (MA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Morocco U23 ITT Championship (MA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Netherlands ITT Championship (NL)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Netherlands U23 ITT Championship (NL)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Nigeria ITT Championship (NG)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Nigeria U23 ITT Championship (NG)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### North Macedonia ITT Championship (MK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### North Macedonia U23 ITT Championship (MK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Norway U23 ITT Championship (NO)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Oman ITT Championship (OM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Oman U23 ITT Championship (OM)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Paraguay ITT Championship (PY)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Paraguay U23 ITT Championship (PY)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Peru ITT Championship (PE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Peru U23 ITT Championship (PE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Poland U23 ITT Championship (PL)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Portugal U23 ITT Championship (PT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Puerto Rico ITT Championship (PR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Puerto Rico U23 ITT Championship (PR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Qatar ITT Championship (QA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Qatar U23 ITT Championship (QA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Romania ITT Championship (RO)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Romania U23 ITT Championship (RO)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Russia U23 ITT Championship (RU)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Rwanda ITT Championship (RW)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Rwanda U23 ITT Championship (RW)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Saint Lucia ITT Championship (LC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Saint Lucia U23 ITT Championship (LC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Saint Vincent and the Grenadines ITT Championship (VC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Saint Vincent and the Grenadines U23 ITT Championship (VC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Saudi Arabia ITT Championship (SA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Saudi Arabia U23 ITT Championship (SA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Senegal ITT Championship (SN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Senegal U23 ITT Championship (SN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Serbia U23 ITT Championship (RS)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Seychelles ITT Championship (SC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Seychelles U23 ITT Championship (SC)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Singapore U23 ITT Championship (SG)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Sint Maarten U23 ITT Championship (SX)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Slovakia ITT Championship (SK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Slovakia U23 ITT Championship (SK)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Slovenia U23 ITT Championship (SI)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### South Korea ITT Championship (KR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### South Korea U23 ITT Championship (KR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Spain ITT Championship (ES)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Spain U23 ITT Championship (ES)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Suriname ITT Championship (SR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Suriname U23 ITT Championship (SR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Sweden ITT Championship (SE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Sweden U23 ITT Championship (SE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Switzerland U23 ITT Championship (CH)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Taiwan ITT Championship (TW)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Taiwan U23 ITT Championship (TW)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Trinidad and Tobago ITT Championship (TT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Trinidad and Tobago U23 ITT Championship (TT)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Tunisia ITT Championship (TN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Tunisia U23 ITT Championship (TN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Turkey ITT Championship (TR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Turkey U23 ITT Championship (TR)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Ukraine U23 ITT Championship (UA)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### United Kingdom ITT Championship (GB)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### United Kingdom U23 ITT Championship (GB)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### United States ITT Championship (US)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### United States U23 ITT Championship (US)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Uzbekistan ITT Championship (UZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Uzbekistan U23 ITT Championship (UZ)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Venezuela U23 ITT Championship (VE)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Vietnam ITT Championship (VN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Vietnam U23 ITT Championship (VN)

CON · .NC · un-dia · 1 etapa · día 176

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Albania U23 Road Championship (AL)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Andorra U23 Road Championship (AD)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Antigua and Barbuda U23 Road Championship (AG)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Argentina U23 Road Championship (AR)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Austria U23 Road Championship (AT)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bahrain U23 Road Championship (BH)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Barbados U23 Road Championship (BB)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Belarus U23 Road Championship (BY)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Belize U23 Road Championship (BZ)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bermuda U23 Road Championship (BM)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bosnia and Herzegovina U23 Road Championship (BA)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Brazil U23 Road Championship (BR)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bulgaria U23 Road Championship (BG)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Cyprus U23 Road Championship (CY)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Czechia U23 Road Championship (CZ)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Dominican Republic U23 Road Championship (DO)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### El Salvador U23 Road Championship (SV)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Eritrea U23 Road Championship (ER)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Eswatini U23 Road Championship (SZ)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Finland U23 Road Championship (FI)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### France U23 Road Championship (FR)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Georgia U23 Road Championship (GE)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Germany U23 Road Championship (DE)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Guam U23 Road Championship (GU)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Guatemala U23 Road Championship (GT)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Honduras U23 Road Championship (HN)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Hong Kong U23 Road Championship (HK)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Iceland U23 Road Championship (IS)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Indonesia U23 Road Championship (ID)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Iran ITT Championship (IR)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Iran U23 ITT Championship (IR)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Israel U23 Road Championship (IL)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Ivory Coast U23 Road Championship (CI)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Japan U23 Road Championship (JP)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Jordan U23 Road Championship (JO)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Kenya U23 Road Championship (KE)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Kosovo U23 Road Championship (XK)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Laos U23 Road Championship (LA)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Latvia U23 Road Championship (LV)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Lithuania U23 Road Championship (LT)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Mali U23 Road Championship (ML)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Malta U23 Road Championship (MT)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Mexico U23 Road Championship (MX)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Monaco U23 Road Championship (MC)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Montenegro U23 Road Championship (ME)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Nigeria U23 Road Championship (NG)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Norway U23 Road Championship (NO)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Paraguay U23 Road Championship (PY)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Peru U23 Road Championship (PE)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Poland U23 Road Championship (PL)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Portugal U23 Road Championship (PT)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Qatar U23 Road Championship (QA)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Russia U23 Road Championship (RU)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Saint Lucia U23 Road Championship (LC)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Saint Vincent and the Grenadines U23 Road Championship (VC)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Saudi Arabia U23 Road Championship (SA)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Senegal U23 Road Championship (SN)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Serbia U23 Road Championship (RS)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Singapore U23 Road Championship (SG)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Sint Maarten U23 Road Championship (SX)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Slovakia U23 Road Championship (SK)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Slovenia U23 Road Championship (SI)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### South Korea U23 Road Championship (KR)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Spain U23 Road Championship (ES)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Switzerland U23 Road Championship (CH)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Tunisia U23 Road Championship (TN)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Ukraine U23 Road Championship (UA)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### United Kingdom U23 Road Championship (GB)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### United States U23 Road Championship (US)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Venezuela U23 Road Championship (VE)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Vietnam U23 Road Championship (VN)

CON · .NC · un-dia · 1 etapa · día 178

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Albania Road Championship (AL)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Algeria Road Championship (DZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Algeria U23 Road Championship (DZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Andorra Road Championship (AD)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Antigua and Barbuda Road Championship (AG)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Argentina Road Championship (AR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Armenia Road Championship (AM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Armenia U23 Road Championship (AM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Austria Road Championship (AT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Azerbaijan Road Championship (AZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Azerbaijan U23 Road Championship (AZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bahrain Road Championship (BH)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Barbados Road Championship (BB)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Belarus Road Championship (BY)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Belgium Road Championship (BE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Belgium U23 Road Championship (BE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Belize Road Championship (BZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Benin Road Championship (BJ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Benin U23 Road Championship (BJ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Bermuda Road Championship (BM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Bosnia and Herzegovina Road Championship (BA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Brazil Road Championship (BR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Bulgaria Road Championship (BG)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Burkina Faso Road Championship (BF)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Burkina Faso U23 Road Championship (BF)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Cameroon Road Championship (CM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Cameroon U23 Road Championship (CM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Canada Road Championship (CA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Canada U23 Road Championship (CA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Cape Verde Road Championship (CV)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Cape Verde U23 Road Championship (CV)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Cayman Islands Road Championship (KY)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Cayman Islands U23 Road Championship (KY)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### China Road Championship (CN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### China U23 Road Championship (CN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Croatia Road Championship (HR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Croatia U23 Road Championship (HR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Cuba Road Championship (CU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Cuba U23 Road Championship (CU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Cyprus Road Championship (CY)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Czechia Road Championship (CZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Denmark Road Championship (DK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Denmark U23 Road Championship (DK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Dominica Road Championship (DM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Dominica U23 Road Championship (DM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Dominican Republic Road Championship (DO)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### El Salvador Road Championship (SV)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Eritrea Road Championship (ER)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Estonia Road Championship (EE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Estonia U23 Road Championship (EE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Eswatini Road Championship (SZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Ethiopia Road Championship (ET)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Ethiopia U23 Road Championship (ET)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Finland Road Championship (FI)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### France Road Championship (FR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Georgia Road Championship (GE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Germany Road Championship (DE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Greece Road Championship (GR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Greece U23 Road Championship (GR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Guam Road Championship (GU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Guatemala Road Championship (GT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Guinea-Bissau Road Championship (GW)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Guinea-Bissau U23 Road Championship (GW)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Honduras Road Championship (HN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Hong Kong Road Championship (HK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Hungary Road Championship (HU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Hungary U23 Road Championship (HU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Iceland Road Championship (IS)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### India Road Championship (IN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### India U23 Road Championship (IN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Indonesia Road Championship (ID)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Ireland Road Championship (IE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Ireland U23 Road Championship (IE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Israel Road Championship (IL)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Italy Road Championship (IT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Italy U23 Road Championship (IT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Ivory Coast Road Championship (CI)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Japan Road Championship (JP)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Jordan Road Championship (JO)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Kazakhstan Road Championship (KZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Kazakhstan U23 Road Championship (KZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Kenya Road Championship (KE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Kosovo Road Championship (XK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Laos Road Championship (LA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Latvia Road Championship (LV)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Lebanon Road Championship (LB)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Lebanon U23 Road Championship (LB)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Lithuania Road Championship (LT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Luxembourg Road Championship (LU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Luxembourg U23 Road Championship (LU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Mali Road Championship (ML)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Malta Road Championship (MT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Mauritius Road Championship (MU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Mauritius U23 Road Championship (MU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Mexico Road Championship (MX)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Moldova Road Championship (MD)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Moldova U23 Road Championship (MD)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Monaco Road Championship (MC)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Montenegro Road Championship (ME)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Morocco Road Championship (MA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Morocco U23 Road Championship (MA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Netherlands Road Championship (NL)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Netherlands U23 Road Championship (NL)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Nigeria Road Championship (NG)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### North Macedonia Road Championship (MK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### North Macedonia U23 Road Championship (MK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Norway Road Championship (NO)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Oman Road Championship (OM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Oman U23 Road Championship (OM)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Paraguay Road Championship (PY)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Peru Road Championship (PE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Poland Road Championship (PL)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Portugal Road Championship (PT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Puerto Rico Road Championship (PR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Puerto Rico U23 Road Championship (PR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Qatar Road Championship (QA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Romania Road Championship (RO)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Romania U23 Road Championship (RO)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Russia Road Championship (RU)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Rwanda Road Championship (RW)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Rwanda U23 Road Championship (RW)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Saint Lucia Road Championship (LC)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Saint Vincent and the Grenadines Road Championship (VC)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Saudi Arabia Road Championship (SA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Senegal Road Championship (SN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Serbia Road Championship (RS)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Seychelles Road Championship (SC)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Seychelles U23 Road Championship (SC)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Singapore Road Championship (SG)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Sint Maarten Road Championship (SX)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Slovakia Road Championship (SK)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Slovenia Road Championship (SI)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### South Korea Road Championship (KR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Spain Road Championship (ES)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Suriname Road Championship (SR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Suriname U23 Road Championship (SR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Sweden Road Championship (SE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Sweden U23 Road Championship (SE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Switzerland Road Championship (CH)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Taiwan Road Championship (TW)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Taiwan U23 Road Championship (TW)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Trinidad and Tobago Road Championship (TT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Trinidad and Tobago U23 Road Championship (TT)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Tunisia Road Championship (TN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Turkey Road Championship (TR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Turkey U23 Road Championship (TR)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Ukraine Road Championship (UA)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### United Kingdom Road Championship (GB)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### United States Road Championship (US)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Uzbekistan Road Championship (UZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Uzbekistan U23 Road Championship (UZ)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Venezuela Road Championship (VE)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Vietnam Road Championship (VN)

CON · .NC · un-dia · 1 etapa · día 179

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Iran Road Championship (IR)

CON · .NC · un-dia · 1 etapa · día 181

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Iran U23 Road Championship (IR)

CON · .NC · un-dia · 1 etapa · día 181

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Mongolia ITT Championship (MN)

CON · .NC · un-dia · 1 etapa · día 182

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Mongolia U23 ITT Championship (MN)

CON · .NC · un-dia · 1 etapa · día 182

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Jamaica ITT Championship (JM)

CON · .NC · un-dia · 1 etapa · día 183

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Jamaica U23 ITT Championship (JM)

CON · .NC · un-dia · 1 etapa · día 183

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Jamaica U23 Road Championship (JM)

CON · .NC · un-dia · 1 etapa · día 185

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Mongolia Road Championship (MN)

CON · .NC · un-dia · 1 etapa · día 185

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Mongolia U23 Road Championship (MN)

CON · .NC · un-dia · 1 etapa · día 185

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Jamaica Road Championship (JM)

CON · .NC · un-dia · 1 etapa · día 186

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Kyrgyzstan ITT Championship (KG)

CON · .NC · un-dia · 1 etapa · día 232

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Kyrgyzstan U23 ITT Championship (KG)

CON · .NC · un-dia · 1 etapa · día 232

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Kyrgyzstan Road Championship (KG)

CON · .NC · un-dia · 1 etapa · día 235

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Kyrgyzstan U23 Road Championship (KG)

CON · .NC · un-dia · 1 etapa · día 235

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

### Malaysia ITT Championship (MY)

CON · .NC · un-dia · 1 etapa · día 253

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  38 | Inventado |

### Malaysia U23 ITT Championship (MY)

CON · .NC · un-dia · 1 etapa · día 253

| #   | Tipo        | Salida | Meta |  km | Recorrido |
| --- | ----------- | ------ | ---- | --: | --------- |
| 1   | ITT (crono) | —      | —    |  30 | Inventado |

### Malaysia Road Championship (MY)

CON · .NC · un-dia · 1 etapa · día 256

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 220 | Inventado |

### Malaysia U23 Road Championship (MY)

CON · .NC · un-dia · 1 etapa · día 256

| #   | Tipo    | Salida | Meta |  km | Recorrido |
| --- | ------- | ------ | ---- | --: | --------- |
| 1   | Classic | —      | —    | 180 | Inventado |

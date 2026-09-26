# Inventario de recorridos

Todas las carreras del calendario y todas sus etapas, con su **procedencia**: si el recorrido es
fiel a la realidad, si viene de una edición real pero con el relieve generado, o si está inventado
de principio a fin.

> **Generado**, no escrito a mano: `node scripts/inventario-recorridos.mjs`. Si algo aquí no
> cuadra con el juego, el que miente es el documento y se regenera.

## Qué significa cada procedencia

| | qué es | qué se puede fiar |
|---|---|---|
| ✅ **Real** | rasgos autorizados en `STAGE_FEATURES`, puestos a mano desde fuente citada (`docs/fuentes-recorridos.md`) | los puertos y el pavé están donde están de verdad |
| 🟡 **Sin validar** | viene de una edición real (`RACE_EDITIONS`): origen, destino y km son los de verdad | la distancia y las ciudades; **el relieve lo genera el motor** |
| 🔴 **Inventado** | no hay edición: recorrido entero de la gramática de motivos | nada: es plausible, no es real |

## El estado, en una tabla

**1418 etapas** en 842 carreras.

| | etapas | % |
|---|---:|---:|
| ✅ Real | 177 | 12.5 % |
| 🟡 Sin validar | 226 | 15.9 % |
| 🔴 Inventado | 1015 | 71.6 % |

### Por clase de carrera

| clase | etapas | ✅ real | 🟡 sin validar | 🔴 inventado |
|---|---:|---:|---:|---:|
| NC | 532 | 0 | 0 | 532 |
| 2 | 321 | 5 | 45 | 271 |
| 1 | 230 | 4 | 49 | 177 |
| Pro | 174 | 29 | 110 | 35 |
| WT | 161 | 139 | 22 | 0 |

## Carrera por carrera


### Australia ITT Championship `nc-au-itt`

Clase **NC** · AU · día 8 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · australia |

### Australia U23 ITT Championship `nc-au-u23-itt`

Clase **NC** · AU · día 8 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · australia |

### Race Táchira `race-tachira`

Clase **2** · VE · día 9 · 10 etapas · recorrido mixto · 🟡 Sin validar 10

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | San Cristobal | Socopo | 210 | 🟡 Sin validar | `et_llana` · generico |
| 2 | Media montaña · Uphill finish | Socopo | San Cristobal | 210 | 🟡 Sin validar | `et_media_alto` · andes |
| 3 | Media montaña · Uphill finish | San Cristobal | San Cristobal | 117 | 🟡 Sin validar | `et_media_alto` · andes |
| 4 | Montaña · Summit finish | La Fria | Merida | 163 | 🟡 Sin validar | `et_reina_cima_cerca` · andes |
| 5 | Media montaña · Hills | Merida | Merida | 121 | 🟡 Sin validar | `et_media_valle` · andes |
| 6 | Montaña · Summit finish | El Vigia | La Grita | 166 | 🟡 Sin validar | `et_reina_alto_corto` · andes |
| 7 | Media montaña · Hills | Tariba | San Cristobal | 151 | 🟡 Sin validar | `et_media_valle` · andes |
| 8 | Media montaña · Hills | Abejales | Capacho | 155 | 🟡 Sin validar | `et_media_tendida` · andes |
| 9 | Media montaña · Hills | Junin | Junin | 134 | 🟡 Sin validar | `et_media_valle` · andes |
| 10 | Llana · Flat | Urena | San Cristobal | 99 | 🟡 Sin validar | `et_llana` · andes |

### Australia U23 Road Championship `nc-au-u23-road`

Clase **NC** · AU · día 11 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 173 | 🔴 Inventado | `nc_ruta` · australia |

### Australia Road Championship `nc-au-road`

Clase **NC** · AU · día 11 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 219 | 🔴 Inventado | `nc_ruta` · australia |

### Thailand ITT Championship `nc-th-itt`

Clase **NC** · TH · día 15 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Thailand U23 ITT Championship `nc-th-u23-itt`

Clase **NC** · TH · día 15 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Thailand U23 Road Championship `nc-th-u23-road`

Clase **NC** · TH · día 18 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 189 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Thailand Road Championship `nc-th-road`

Clase **NC** · TH · día 18 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 203 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Race Pune `race-pune`

Clase **2** · IN · día 19 · 5 etapas · recorrido real · ✅ Real 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Pune | Pune | 8 | ✅ Real | — |
| 2 | Llana · Flat | Mulshi | Haveli | 88 | ✅ Real | — |
| 3 | Media montaña · Hills | Pune | Nanded City | 105 | ✅ Real | — |
| 4 | Llana · Flat | Chandan Tekadi | Baramati | 135 | ✅ Real | — |
| 5 | Llana · Flat | Pune | Pune | 95 | ✅ Real | — |

### Race Down Under `race-down-under`

Clase **WT** · AU · día 20 · 5 etapas · recorrido real · ✅ Real 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Tanunda | Tanunda | 123 | ✅ Real | — |
| 2 | Media montaña · Hills | Norwood | Uraidla | 148 | ✅ Real | — |
| 3 | Media montaña · Hills | Henley Beach | Nairne | 139 | ✅ Real | — |
| 4 | Media montaña · Hills | Brighton | Willunga Hill | 178 | ✅ Real | — |
| 5 | Media montaña · Hills | Stirling | Stirling | 165 | ✅ Real | — |

### Race Morvedre `race-morvedre`

Clase **1** · ES · día 23 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 173 | 🔴 Inventado | `ud_montana_media` · levante |

### Race Sharjah `race-sharjah`

Clase **2** · AE · día 23 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 129 | 🔴 Inventado | `et_llana` · golfo |
| 2 | Media montaña · Hills | — | — | 108 | 🔴 Inventado | `et_media_valle` · golfo |
| 3 | Media montaña · Uphill finish | — | — | 132 | 🔴 Inventado | `et_media_alto` · golfo |
| 4 | Contrarreloj · ITT | — | — | 23 | 🔴 Inventado | `et_crono` · golfo |
| 5 | Llana · Flat | — | — | 117 | 🔴 Inventado | `et_llana` · golfo |

### Race Castellón `race-castellon`

Clase **1** · ES · día 24 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 157 | 🔴 Inventado | `ud_esprint` · levante |

### Race Valencia GP `race-valencia-gp`

Clase **1** · ES · día 25 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 178 | 🔴 Inventado | `ud_esprint` · levante |

### Race Arabia `race-arabia`

Clase **Pro** · SA · día 27 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | AlUla Camel Cup Track | AlUla Camel Cup Track | 158 | 🟡 Sin validar | `et_llana` · golfo |
| 2 | Llana · Flat | Al Manshiyah Train Station | Al Manshiyah Train Station | 152 | 🟡 Sin validar | `et_llana` · golfo |
| 3 | Media montaña · Uphill finish | Winter Park | Bir Jaydah Mountain Wirkah | 142 | 🟡 Sin validar | `et_media_alto` · golfo |
| 4 | Llana · Flat | Winter Park | Hegra | 173 | 🟡 Sin validar | `et_llana` · golfo |
| 5 | Media montaña · Uphill finish | AlUla Old Town | Skyviews of Harrat Uwayrid | 164 | 🟡 Sin validar | `et_media_alto` · golfo |

### Race Calvià `race-calvia`

Clase **1** · ES · día 28 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 179 | 🔴 Inventado | `ud_montana_media` · levante |

### Race Surf Coast `race-surf-coast`

Clase **Pro** · AU · día 29 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 182 | 🔴 Inventado | `ud_circuito` · australia |

### Race Ses Salines `race-ses-salines`

Clase **1** · ES · día 29 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Mountains classic | — | — | 187 | 🔴 Inventado | `ud_montana` · levante |

### Race Tramuntana `race-tramuntana`

Clase **1** · ES · día 30 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Mountains classic | — | — | 154 | 🔴 Inventado | `ud_montana` · levante |

### Race Andratx `race-andratx`

Clase **1** · ES · día 31 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 200 | 🔴 Inventado | `ud_montana_media` · levante |

### Race Great Ocean `race-great-ocean`

Clase **WT** · AU · día 32 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 188 | ✅ Real | — |

### Race Marseille `race-marseille`

Clase **1** · FR · día 32 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 170 | 🔴 Inventado | `ud_montana_media` · provenza |

### Race Palma `race-palma`

Clase **1** · ES · día 32 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 200 | 🔴 Inventado | `ud_esprint` · levante |

### Race Colombia `race-colombia`

Clase **1** · CO · día 34 · 9 etapas · recorrido mixto · 🟡 Sin validar 9

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Yopal | Yopal | 206 | 🟡 Sin validar | `et_llana` · generico |
| 2 | Montaña · Summit finish | Yopal | Alto del Porvenir | 153 | 🟡 Sin validar | `et_reina_alto_largo` · andes |
| 3 | Contrarreloj · ITT | Curisi | Toquilla | 33 | 🟡 Sin validar | `et_crono` · andes |
| 4 | Media montaña · Uphill finish | Duitama | Duitama | 125 | 🟡 Sin validar | `et_media_alto` · andes |
| 5 | Montaña · Summit finish | Mosquera | Alto de La Linea | 232 | 🟡 Sin validar | `et_reina_alto_largo` · andes |
| 6 | Llana · Flat | Armenia | Cali | 185 | 🟡 Sin validar | `et_llana` · andes |
| 7 | Media montaña · Hills | Cali | La Tebaida | 171 | 🟡 Sin validar | `et_media_tendida` · andes |
| 8 | Montaña · Mountains | Alvarado | Alto del Vino | 217 | 🟡 Sin validar | `et_reina_valle` · andes |
| 9 | Media montaña · Hills | Sopo | Bogota | 139 | 🟡 Sin validar | `et_media_valle` · andes |

### Zimbabwe ITT Championship `nc-zw-itt`

Clase **NC** · ZW · día 34 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Race Valencia `race-valencia`

Clase **Pro** · ES · día 35 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Segorbe | Torreblanca | 160 | 🟡 Sin validar | `et_media_valle` · levante |
| 2 | Contrarreloj · ITT | Carlet | Alginet | 18 | 🟡 Sin validar | `et_crono` · levante |
| 3 | Montaña · Summit finish | Orihuela | San Vicente del Raspeig | 158 | 🟡 Sin validar | `et_reina_alto_corto` · levante |
| 4 | Media montaña · Hills | La Nucia | Teulada Moraira | 172 | 🟡 Sin validar | `et_media_tendida` · levante |
| 5 | Llana · Flat | Betera | Valencia | 95 | 🟡 Sin validar | `et_llana` · levante |

### Race Bessèges `race-besseges`

Clase **1** · FR · día 35 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 153 | 🔴 Inventado | `et_llana` · provenza |
| 2 | Montaña · Summit finish | — | — | 129 | 🔴 Inventado | `et_reina_blanda` · pirineos |
| 3 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `et_crono` · bretana |
| 4 | Media montaña · Wall finish | — | — | 163 | 🔴 Inventado | `et_media_muro` · francia_norte |
| 5 | Media montaña · Wall finish | — | — | 128 | 🔴 Inventado | `et_media_muro` · francia_norte |

### Race Victoria `race-victoria`

Clase **1** · AU · día 35 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 150 | 🔴 Inventado | `et_llana` · australia |
| 2 | Media montaña · Hills | — | — | 150 | 🔴 Inventado | `et_media_valle` · australia |
| 3 | Contrarreloj · ITT | — | — | 20 | 🔴 Inventado | `et_crono` · australia |
| 4 | Media montaña · Hills | — | — | 162 | 🔴 Inventado | `et_media_tendida` · australia |
| 5 | Media montaña · Uphill finish | — | — | 131 | 🔴 Inventado | `et_media_alto` · australia |

### Colombia ITT Championship `nc-co-itt`

Clase **NC** · CO · día 35 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · andes |

### New Zealand ITT Championship `nc-nz-itt`

Clase **NC** · NZ · día 35 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · australia |

### New Zealand U23 ITT Championship `nc-nz-u23-itt`

Clase **NC** · NZ · día 35 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · australia |

### Zimbabwe U23 ITT Championship `nc-zw-u23-itt`

Clase **NC** · ZW · día 35 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · generico |

### Colombia U23 ITT Championship `nc-co-u23-itt`

Clase **NC** · CO · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · andes |

### South Africa ITT Championship `nc-za-itt`

Clase **NC** · ZA · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### South Africa U23 ITT Championship `nc-za-u23-itt`

Clase **NC** · ZA · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · generico |

### Uruguay ITT Championship `nc-uy-itt`

Clase **NC** · UY · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Uruguay U23 ITT Championship `nc-uy-u23-itt`

Clase **NC** · UY · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · generico |

### Namibia ITT Championship `nc-na-itt`

Clase **NC** · NA · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · generico |

### Namibia U23 ITT Championship `nc-na-u23-itt`

Clase **NC** · NA · día 36 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Race Muscat `race-muscat`

Clase **Pro** · OM · día 37 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 195 | 🔴 Inventado | `ud_esprint` · golfo |

### Zimbabwe U23 Road Championship `nc-zw-u23-road`

Clase **NC** · ZW · día 37 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 164 | 🔴 Inventado | `nc_ruta` · generico |

### Race Oman `race-oman`

Clase **Pro** · OM · día 38 · 5 etapas · recorrido mixto · ✅ Real 4 · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Ministry of Tourism | Bimmah Sink Hole | 171 | ✅ Real | — |
| 2 | Media montaña · Hills | Al Rustaq Fort | Yitti Hills | 191 | ✅ Real | — |
| 3 | Media montaña · Hills | Samail | Misfat al Abriyeen | 191 | ✅ Real | — |
| 4 | Llana · Flat | Al Sawadi Beach | Sohar | 147 | 🟡 Sin validar | `et_llana` · golfo |
| 5 | Montaña · Summit finish | Nizwa | Jabal al Akhdhar | 156 | ✅ Real | — |

### Race Antalya GP `race-antalya-gp`

Clase **2** · TR · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 143 | 🔴 Inventado | `ud_esprint` · anatolia |

### Colombia U23 Road Championship `nc-co-u23-road`

Clase **NC** · CO · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 169 | 🔴 Inventado | `nc_ruta` · andes |

### New Zealand U23 Road Championship `nc-nz-u23-road`

Clase **NC** · NZ · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 160 | 🔴 Inventado | `nc_ruta` · australia |

### New Zealand Road Championship `nc-nz-road`

Clase **NC** · NZ · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 222 | 🔴 Inventado | `nc_ruta` · australia |

### South Africa U23 Road Championship `nc-za-u23-road`

Clase **NC** · ZA · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · generico |

### Uruguay U23 Road Championship `nc-uy-u23-road`

Clase **NC** · UY · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 152 | 🔴 Inventado | `nc_ruta` · generico |

### Namibia U23 Road Championship `nc-na-u23-road`

Clase **NC** · NA · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 154 | 🔴 Inventado | `nc_ruta` · generico |

### Zimbabwe Road Championship `nc-zw-road`

Clase **NC** · ZW · día 38 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 220 | 🔴 Inventado | `nc_ruta` · generico |

### Race Aveiro `race-aveiro`

Clase **1** · PT · día 39 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 189 | 🔴 Inventado | `ud_esprint` · portugal |

### Colombia Road Championship `nc-co-road`

Clase **NC** · CO · día 39 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 206 | 🔴 Inventado | `nc_ruta` · andes |

### South Africa Road Championship `nc-za-road`

Clase **NC** · ZA · día 39 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 224 | 🔴 Inventado | `nc_ruta` · generico |

### Uruguay Road Championship `nc-uy-road`

Clase **NC** · UY · día 39 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 212 | 🔴 Inventado | `nc_ruta` · generico |

### Namibia Road Championship `nc-na-road`

Clase **NC** · NA · día 39 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 228 | 🔴 Inventado | `nc_ruta` · generico |

### Race Provence `race-provence`

Clase **1** · FR · día 44 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 161 | 🔴 Inventado | `et_llana` · provenza |
| 2 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · provenza |
| 3 | Montaña · Summit finish | — | — | 137 | 🔴 Inventado | `et_reina_alto_corto` · alpes |

### Race Murcia `race-murcia`

Clase **1** · ES · día 44 · 2 etapas · recorrido generado · 🔴 Inventado 2

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 140 | 🔴 Inventado | `et_llana` · levante |
| 2 | Montaña · Summit finish | — | — | 124 | 🔴 Inventado | `et_reina_alto_corto` · pirineos |

### Race Figueira `race-figueira`

Clase **Pro** · PT · día 45 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 208 | 🔴 Inventado | `ud_esprint_capi` · portugal |

### Race Almería `race-almeria`

Clase **Pro** · ES · día 46 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 213 | 🔴 Inventado | `ud_esprint` · andalucia |

### Race Emirates `race-emirates`

Clase **WT** · AE · día 47 · 7 etapas · recorrido real · ✅ Real 7

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Madinat Zayed | Liwa | 144 | ✅ Real | — |
| 2 | Contrarreloj · ITT | Al Hudayriat Island | Al Hudayriat Island | 12 | ✅ Real | — |
| 3 | Montaña · Summit finish | Umm Al Quwain | Jebel Mobrah | 183 | ✅ Real | — |
| 4 | Llana · Flat | Fujairah | Fujairah | 182 | ✅ Real | — |
| 5 | Llana · Flat | Dubai | Hamdan Bin Mohammed Smart University | 166 | ✅ Real | — |
| 6 | Montaña · Summit finish | Al Ain | Jebel Hafeet | 168 | ✅ Real | — |
| 7 | Llana · Flat | Abu Dhabi | Abu Dhabi | 149 | ✅ Real | — |

### Race Jaén `race-jaen`

Clase **1** · ES · día 47 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 191 | 🔴 Inventado | `ud_montana_media` · andalucia |

### Race Algarve `race-algarve`

Clase **Pro** · PT · día 49 · 5 etapas · recorrido real · ✅ Real 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Vila Real de Santo Antonio | Tavira | 183 | ✅ Real | — |
| 2 | Montaña · Summit finish | Portimao | Foia | 148 | ✅ Real | — |
| 3 | Contrarreloj · ITT | Vilamoura | Vilamoura | 20 | ✅ Real | — |
| 4 | Media montaña · Hills | Albufeira | Lagos | 176 | ✅ Real | — |
| 5 | Montaña · Summit finish | Faro | Malhao | 150 | ✅ Real | — |

### Race Andalusia `race-andalusia`

Clase **Pro** · ES · día 49 · 5 etapas · recorrido real · ✅ Real 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | Benahavis | Pizarra | 151 | ✅ Real | — |
| 2 | Montaña · Summit finish | Torrox | Otura | 142 | ✅ Real | — |
| 3 | Media montaña · Hills | Jaen | Lopera | 181 | ✅ Real | — |
| 4 | Media montaña · Hills | Montoro | Pozoblanco | 167 | ✅ Real | — |
| 5 | Media montaña · Hills | La Roda de Andalucia | Lucena | 163 | ✅ Real | — |

### Race Var `race-var`

Clase **1** · FR · día 52 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 199 | 🔴 Inventado | `ud_circuito` · provenza |

### Race Alaiye `race-alaiye`

Clase **2** · TR · día 52 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 175 | 🔴 Inventado | `ud_esprint` · anatolia |

### Race Alpes-Maritimes `race-alpes-maritimes`

Clase **1** · FR · día 53 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 168 | 🔴 Inventado | `ud_circuito` · provenza |

### Race Rwanda `race-rwanda`

Clase **1** · RW · día 53 · 8 etapas · recorrido mixto · 🟡 Sin validar 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Rukomo | Rwamagana | 174 | 🟡 Sin validar | `et_media_valle` · montana_sur |
| 2 | Media montaña · Hills | Nyamata | Huye | 135 | 🟡 Sin validar | `et_media_valle` · montana_sur |
| 3 | Media montaña · Hills | Huye | Rusizi | 145 | 🟡 Sin validar | `et_media_valle` · montana_sur |
| 4 | Media montaña · Hills | Karongi | Rubavu | 127 | 🟡 Sin validar | `et_media_valle` · montana_sur |
| 5 | Llana · Flat | Rubavu | Rubavu | 82 | 🟡 Sin validar | `et_llana` · montana_sur |
| 6 | Montaña · Summit finish | Rubavu | Musanze | 84 | 🟡 Sin validar | `et_reina_alto_largo` · montana_sur |
| 7 | Media montaña · Hills | Musanze | Kigali | 147 | 🟡 Sin validar | `et_media_tendida` · montana_sur |
| 8 | Media montaña · Hills | Kigali | Kigali | 84 | 🟡 Sin validar | `et_media_tendida` · montana_sur |

### Philippines ITT Championship `nc-ph-itt`

Clase **NC** · PH · día 55 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · generico |

### Philippines U23 ITT Championship `nc-ph-u23-itt`

Clase **NC** · PH · día 55 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · generico |

### Race Sardegna `race-sardegna`

Clase **1** · IT · día 56 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Castelsardo | Bosa | 190 | 🟡 Sin validar | `et_media_valle` · italia_sur |
| 2 | Llana · Flat | Oristano | Carbonia | 136 | 🟡 Sin validar | `et_llana` · italia_sur |
| 3 | Media montaña · Hills | Cagliari | Tortoli | 168 | 🟡 Sin validar | `et_media_tendida` · italia_sur |
| 4 | Montaña · Summit finish | Arbatax | Nuoro | 154 | 🟡 Sin validar | `et_reina_blanda` · italia_sur |
| 5 | Media montaña · Hills | Nuoro | Olbia | 177 | 🟡 Sin validar | `et_media_valle` · italia_sur |

### Bolivia ITT Championship `nc-bo-itt`

Clase **NC** · BO · día 56 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · generico |

### Bolivia U23 ITT Championship `nc-bo-u23-itt`

Clase **NC** · BO · día 57 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Philippines U23 Road Championship `nc-ph-u23-road`

Clase **NC** · PH · día 57 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 140 | 🔴 Inventado | `nc_ruta` · generico |

### Philippines Road Championship `nc-ph-road`

Clase **NC** · PH · día 58 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 181 | 🔴 Inventado | `nc_ruta` · generico |

### Race Opening Classic `race-opening-classic`

Clase **WT** · BE · día 59 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 202 | ✅ Real | — |

### Race Ardèche `race-ardeche`

Clase **Pro** · FR · día 59 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 218 | 🔴 Inventado | `ud_circuito` · macizo_central |

### Race Aegean `race-aegean`

Clase **1** · TR · día 59 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 192 | 🔴 Inventado | `ud_montana_media` · anatolia |

### Race Pedalia `race-pedalia`

Clase **2** · GR · día 59 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 179 | 🔴 Inventado | `ud_esprint` · balcanes |

### Bolivia U23 Road Championship `nc-bo-u23-road`

Clase **NC** · BO · día 59 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 150 | 🔴 Inventado | `nc_ruta` · generico |

### Race Drôme `race-drome`

Clase **Pro** · FR · día 60 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 235 | 🔴 Inventado | `ud_repecho` · provenza |

### Race Kuurne `race-kuurne`

Clase **Pro** · BE · día 60 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 204 | 🔴 Inventado | `ud_adoquin_ligero` · flandes |

### Race Dodecanese `race-dodecanese`

Clase **1** · GR · día 60 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 176 | 🔴 Inventado | `ud_montana_media` · balcanes |

### Bolivia Road Championship `nc-bo-road`

Clase **NC** · BO · día 60 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 213 | 🔴 Inventado | `nc_ruta` · generico |

### Race Samyn `race-samyn`

Clase **1** · BE · día 62 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 200 | 🔴 Inventado | `ud_adoquin_ligero` · flandes |

### Race Laigueglia `race-laigueglia`

Clase **Pro** · IT · día 63 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 192 | ✅ Real | — |

### Race Umag `race-umag`

Clase **2** · HR · día 63 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 133 | 🔴 Inventado | `ud_esprint` · balcanes |

### Chile ITT Championship `nc-cl-itt`

Clase **NC** · CL · día 64 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · cono_sur |

### Chile U23 ITT Championship `nc-cl-u23-itt`

Clase **NC** · CL · día 64 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · cono_sur |

### Race White Roads `race-white-roads`

Clase **WT** · IT · día 66 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 215 | ✅ Real | — |

### Race Apollon `race-apollon`

Clase **2** · CY · día 66 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 166 | 🔴 Inventado | `ud_esprint` · anatolia |

### Race Communes `race-communes`

Clase **2** · BE · día 66 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 157 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Rhodes GP `race-rhodes-gp`

Clase **2** · GR · día 66 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 124 | 🔴 Inventado | `ud_repecho` · balcanes |

### Race Zwolle `race-zwolle`

Clase **2** · NL · día 66 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 155 | 🔴 Inventado | `ud_esprint` · flandes |

### Chile U23 Road Championship `nc-cl-u23-road`

Clase **NC** · CL · día 66 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 167 | 🔴 Inventado | `nc_ruta` · cono_sur |

### Race to the Sun `race-to-the-sun`

Clase **WT** · FR · día 67 · 8 etapas · recorrido real · ✅ Real 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Acheres | Carrieres-sous-Poissy | 171 | ✅ Real | — |
| 2 | Llana · Flat | Epone | Montargis | 187 | ✅ Real | — |
| 3 | Contrarreloj · ITT | Cosne-Cours-sur-Loire | Pouilly-sur-Loire | 24 | ✅ Real | — |
| 4 | Montaña · Summit finish | Bourges | Uchon | 195 | ✅ Real | — |
| 5 | Media montaña · Hills | Cormoranche-sur-Saone | Colombier-le-Vieux | 206 | ✅ Real | — |
| 6 | Media montaña · Hills | Barbentane | Apt | 179 | ✅ Real | — |
| 7 | Montaña · Summit finish | Nice | Auron | 139 | ✅ Real | — |
| 8 | Media montaña · Hills | Nice | Nice | 129 | ✅ Real | — |

### Race Rucphen `race-rucphen`

Clase **2** · NL · día 67 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 180 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Lillers `race-lillers`

Clase **2** · FR · día 67 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 129 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Poreč `race-porec`

Clase **2** · HR · día 67 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 135 | 🔴 Inventado | `ud_repecho` · balcanes |

### Chile Road Championship `nc-cl-road`

Clase **NC** · CL · día 67 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 174 | 🔴 Inventado | `nc_ruta` · cono_sur |

### Race Two Seas `race-two-seas`

Clase **WT** · IT · día 68 · 7 etapas · recorrido real · ✅ Real 7

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Lido di Camaiore | Lido di Camaiore | 12 | ✅ Real | — |
| 2 | Media montaña · Hills | Camaiore | San Gimignano | 206 | ✅ Real | — |
| 3 | Media montaña · Hills | Cortona | Magliano dei Marsi | 225 | ✅ Real | — |
| 4 | Montaña · Summit finish | Tagliacozzo | Martinsicuro | 210 | ✅ Real | — |
| 5 | Media montaña · Hills | Marotta-Mondolfo | Mombaroccio | 186 | ✅ Real | — |
| 6 | Montaña · Summit finish | San Severino Marche | Camerino | 189 | ✅ Real | — |
| 7 | Llana · Flat | Civitanova Marche | San Benedetto del Tronto | 143 | ✅ Real | — |

### Race Istria `race-istria`

Clase **2** · HR · día 71 · 4 etapas · recorrido mixto · 🟡 Sin validar 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | Vrsar | Vrsar | 2 | 🟡 Sin validar | `et_prologo` · balcanes |
| 2 | Media montaña · Uphill finish | Porec | Funtana | 142 | 🟡 Sin validar | `et_media_alto` · balcanes |
| 3 | Media montaña · Hills | Novigrad | Motovun | 132 | 🟡 Sin validar | `et_media_tendida` · balcanes |
| 4 | Media montaña · Uphill finish | Pazin | Umag | 118 | 🟡 Sin validar | `et_media_alto` · balcanes |

### Race Antalya `race-antalya`

Clase **2** · TR · día 71 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 134 | 🔴 Inventado | `et_llana` · anatolia |
| 2 | Media montaña · Hills | — | — | 131 | 🔴 Inventado | `et_media_tendida` · anatolia |
| 3 | Contrarreloj · ITT | — | — | 23 | 🔴 Inventado | `et_crono` · anatolia |
| 4 | Media montaña · Uphill finish | — | — | 95 | 🔴 Inventado | `et_media_alto` · anatolia |

### Race Rhodes `race-rhodes`

Clase **2** · GR · día 71 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 123 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Hills | — | — | 153 | 🔴 Inventado | `et_media_valle` · balcanes |
| 3 | Contrarreloj · ITT | — | — | 12 | 🔴 Inventado | `et_crono` · balcanes |
| 4 | Media montaña · Uphill finish | — | — | 125 | 🔴 Inventado | `et_media_alto` · balcanes |

### Race Popolarissima `race-popolarissima`

Clase **2** · IT · día 74 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 165 | 🔴 Inventado | `ud_esprint` · italia_norte |

### Race Taiwan `race-taiwan`

Clase **1** · TW · día 74 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Taipei | Taipei | 81 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 2 | Media montaña · Uphill finish | Taoyuan | Jiaobanshan | 123 | 🟡 Sin validar | `et_media_alto` · asia_oriental |
| 3 | Media montaña · Wall finish | Fo Guang Shan | Kaohsiung | 146 | 🟡 Sin validar | `et_media_muro` · asia_oriental |
| 4 | Llana · Flat | Gaoshu | Liudui | 131 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 5 | Media montaña · Uphill finish | Luye | Liyu Lake | 154 | 🟡 Sin validar | `et_media_alto` · asia_oriental |

### Race Nokere `race-nokere`

Clase **Pro** · BE · día 77 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 190 | 🔴 Inventado | `ud_adoquin` · flandes |

### Race Turin `race-turin`

Clase **Pro** · IT · día 77 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 210 | 🔴 Inventado | `ud_montana_media` · italia_norte |

### Race Denain `race-denain`

Clase **Pro** · FR · día 78 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 209 | 🔴 Inventado | `ud_adoquin` · francia_norte |

### Race Bredene `race-bredene`

Clase **Pro** · BE · día 79 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 211 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Youngster Coast `race-youngster`

Clase **2** · BE · día 79 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 178 | 🔴 Inventado | `ud_adoquin_ligero` · flandes |

### Race Sanremo `race-sanremo`

Clase **WT** · IT · día 80 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 288 | ✅ Real | — |

### Race Ebre `race-ebre`

Clase **1** · ES · día 80 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 171 | 🔴 Inventado | `ud_repecho` · levante |

### Race Monseré `race-monsere`

Clase **1** · BE · día 81 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 182 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Slovenian Istria `race-slovenian-istria`

Clase **2** · SI · día 81 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 172 | 🔴 Inventado | `ud_montana_media` · balcanes |

### Race Ontur `race-ontur`

Clase **2** · ES · día 81 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 143 | 🔴 Inventado | `ud_esprint` · meseta |

### Race Arrábida `race-arrabida`

Clase **2** · PT · día 81 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 158 | 🔴 Inventado | `ud_circuito` · portugal |

### Race Catalonia `race-catalonia`

Clase **WT** · ES · día 82 · 7 etapas · recorrido real · ✅ Real 7

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Sant Feliu de Guixols | Sant Feliu de Guixols | 173 | ✅ Real | — |
| 2 | Llana · Flat | Figueres | Banyoles | 167 | ✅ Real | — |
| 3 | Media montaña · Hills | Mont-roig del Camp | Vila-seca | 160 | ✅ Real | — |
| 4 | Montaña · Summit finish | Mataro | Vallter 2000 | 173 | ✅ Real | — |
| 5 | Montaña · Summit finish | La Seu d'Urgell | Coll de Pal | 155 | ✅ Real | — |
| 6 | Montaña · Summit finish | Berga | Queralt | 158 | ✅ Real | — |
| 7 | Media montaña · Hills | Barcelona | Barcelona | 95 | ✅ Real | — |

### Race Thailand `race-thailand`

Clase **1** · TH · día 83 · 6 etapas · recorrido mixto · 🟡 Sin validar 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Nong Khai | Nong Khai | 109 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 2 | Llana · Flat | Phon Phisai | Nong Khai | 150 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 3 | Montaña · Summit finish | Nong Khai | Phu Foi Lom | 142 | 🟡 Sin validar | `et_reina_alto_corto` · asia_oriental |
| 4 | Llana · Flat | Nong Khai | Tha Bo | 155 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 5 | Llana · Flat | Si Chiang Mai | Si Chiang Mai | 136 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 6 | Llana · Flat | Nong Khai | Nong Khai | 126 | 🟡 Sin validar | `et_llana` · asia_oriental |

### Race Bruges `race-bruges`

Clase **WT** · BE · día 84 · 1 etapa · recorrido mixto · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Brugge | De Panne | 196 | 🟡 Sin validar | `et_llana` · flandes |

### Race Romagna `race-romagna`

Clase **1** · IT · día 84 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 147 | 🔴 Inventado | `et_llana` · italia_centro |
| 2 | Media montaña · Hills | — | — | 140 | 🔴 Inventado | `et_media_valle` · italia_sur |
| 3 | Contrarreloj · ITT | — | — | 15 | 🔴 Inventado | `et_crono` · italia_sur |
| 4 | Media montaña · Hills | — | — | 155 | 🔴 Inventado | `et_media_valle` · italia_sur |
| 5 | Media montaña · Uphill finish | — | — | 127 | 🔴 Inventado | `et_media_alto` · italia_norte |

### Race Olympia `race-olympia`

Clase **2** · NL · día 84 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 129 | 🔴 Inventado | `et_llana` · flandes |
| 2 | Media montaña · Wall finish | — | — | 141 | 🔴 Inventado | `et_media_muro` · flandes |
| 3 | Media montaña · Wall finish | — | — | 149 | 🔴 Inventado | `et_media_muro` · flandes |
| 4 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · flandes |
| 5 | Llana · Flat | — | — | 95 | 🔴 Inventado | `et_llana` · flandes |

### Race Alentejo `race-alentejo`

Clase **2** · PT · día 84 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Beja | Moura | 167 | 🟡 Sin validar | `et_llana` · portugal |
| 2 | Llana · Flat | Castro Verde | Grandola | 172 | 🟡 Sin validar | `et_llana` · portugal |
| 3 | Llana · Flat | Carvalhal | Arraiolos | 182 | 🟡 Sin validar | `et_llana` · portugal |
| 4 | Media montaña · Uphill finish | Monforte | Castelo de Vide | 148 | 🟡 Sin validar | `et_media_alto` · portugal |
| 5 | Media montaña · Hills | Estremoz | Evora | 152 | 🟡 Sin validar | `et_media_valle` · portugal |

### Race Brda `race-brda`

Clase **2** · SI · día 85 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 145 | 🔴 Inventado | `ud_muros` · centroeuropa |

### Race Harelbeke `race-harelbeke`

Clase **WT** · BE · día 86 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 209 | ✅ Real | — |

### Race Loire Atlantique `race-loire-atlantique`

Clase **2** · FR · día 87 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 141 | 🔴 Inventado | `ud_esprint` · bretana |

### Race Syedra `race-syedra`

Clase **2** · TR · día 87 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 162 | 🔴 Inventado | `ud_esprint` · anatolia |

### Race Wevelgem `race-wevelgem`

Clase **WT** · BE · día 88 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 250 | ✅ Real | — |

### Race Emilia GP `race-emilia-gp`

Clase **1** · IT · día 88 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 174 | 🔴 Inventado | `ud_muros` · italia_norte |

### Race Tourangelle `race-tourangelle`

Clase **1** · FR · día 88 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 178 | 🔴 Inventado | `ud_muros` · bretana |

### Race Annemasse `race-annemasse`

Clase **2** · FR · día 88 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 154 | 🔴 Inventado | `ud_montana_media` · alpes |

### Race Novo Mesto `race-novo-mesto`

Clase **2** · SI · día 88 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 164 | 🔴 Inventado | `ud_circuito` · centroeuropa |

### Race Camembert `race-camembert`

Clase **1** · FR · día 90 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 173 | 🔴 Inventado | `ud_muros` · bretana |

### Race Across Flanders `race-across-flanders`

Clase **WT** · BE · día 91 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 189 | ✅ Real | — |

### Race Vitré `race-vitre`

Clase **1** · FR · día 93 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 200 | 🔴 Inventado | `ud_esprint` · bretana |

### Race Alanya `race-alanya`

Clase **2** · TR · día 93 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 125 | 🔴 Inventado | `ud_esprint` · anatolia |

### Race Navarre `race-navarre`

Clase **Pro** · ES · día 94 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 206 | 🔴 Inventado | `ud_repecho` · cantabrico |

### Race NXT `race-nxt`

Clase **1** · NL · día 94 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 187 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Artois `race-artois`

Clase **2** · FR · día 94 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 165 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Flanders `race-flanders`

Clase **WT** · BE · día 95 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 278 | ✅ Real | — |

### Race Piva `race-piva`

Clase **2** · IT · día 95 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 152 | 🔴 Inventado | `ud_circuito` · italia_norte |

### Race Basque Country `race-basque-country`

Clase **WT** · ES · día 96 · 6 etapas · recorrido real · ✅ Real 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Bilbao | Bilbao | 14 | ✅ Real | — |
| 2 | Media montaña · Hills | Pamplona | Cuevas de Mendukilo | 164 | ✅ Real | — |
| 3 | Media montaña · Hills | Basauri | Basauri | 153 | ✅ Real | — |
| 4 | Media montaña · Hills | Galdakao | Galdakao | 167 | ✅ Real | — |
| 5 | Montaña · Summit finish | Eibar | Eibar | 176 | ✅ Real | — |
| 6 | Montaña · Summit finish | Antzuola | Bergara | 135 | ✅ Real | — |

### Race Belvedere `race-belvedere`

Clase **2** · IT · día 96 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 159 | 🔴 Inventado | `ud_repecho` · italia_norte |

### Race Huy `race-huy`

Clase **2** · BE · día 96 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | — | — | 172 | 🔴 Inventado | `ud_muro_final` · ardenas |

### Race Loire `race-loire`

Clase **Pro** · FR · día 97 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Blois | Vouzon | 180 | 🟡 Sin validar | `et_llana` · bretana |
| 2 | Media montaña · Wall finish | Chemery | Saint-Georges-sur-Cher | 189 | 🟡 Sin validar | `et_media_muro` · bretana |
| 3 | Media montaña · Wall finish | Moree | Montoire-sur-le-Loir | 195 | 🟡 Sin validar | `et_media_muro` · bretana |
| 4 | Llana · Flat | Romorantin | Romorantin | 189 | 🟡 Sin validar | `et_llana_viento` · bretana |
| 5 | Media montaña · Wall finish | Blois | Blois | 98 | 🟡 Sin validar | `et_media_muro` · bretana |

### Race Recioto `race-recioto`

Clase **2** · IT · día 97 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 172 | 🔴 Inventado | `ud_muros` · italia_norte |

### Race Schelde `race-schelde`

Clase **Pro** · BE · día 98 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 209 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Ardennes `race-ardennes`

Clase **2** · BE · día 98 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 140 | 🔴 Inventado | `et_llana` · ardenas |
| 2 | Media montaña · Wall finish | — | — | 136 | 🔴 Inventado | `et_media_muro` · flandes |
| 3 | Llana · Flat | — | — | 151 | 🔴 Inventado | `et_llana_viento` · flandes |
| 4 | Media montaña · Wall finish | — | — | 150 | 🔴 Inventado | `et_media_muro` · flandes |
| 5 | Media montaña · Wall finish | — | — | 102 | 🔴 Inventado | `et_media_muro` · flandes |

### Race Mersin `race-mersin`

Clase **2** · TR · día 99 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 108 | 🔴 Inventado | `et_llana` · anatolia |
| 2 | Media montaña · Hills | — | — | 143 | 🔴 Inventado | `et_media_valle` · anatolia |
| 3 | Media montaña · Hills | — | — | 134 | 🔴 Inventado | `et_media_valle` · anatolia |
| 4 | Montaña · Summit finish | — | — | 112 | 🔴 Inventado | `et_reina_alto_corto` · anatolia |

### United Arab Emirates ITT Championship `nc-ae-itt`

Clase **NC** · AE · día 99 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · golfo |

### United Arab Emirates U23 ITT Championship `nc-ae-u23-itt`

Clase **NC** · AE · día 99 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · golfo |

### Race Reggio `race-reggio`

Clase **1** · IT · día 100 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 169 | 🔴 Inventado | `ud_circuito` · italia_norte |

### Race Magna Grecia `race-magna-grecia`

Clase **1** · IT · día 101 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 156 | 🔴 Inventado | `et_llana` · italia_sur |
| 2 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · italia_sur |
| 3 | Montaña · Summit finish | — | — | 115 | 🔴 Inventado | `et_reina_alto_largo` · italia_sur |

### Race Braakman `race-braakman`

Clase **2** · NL · día 101 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 144 | 🔴 Inventado | `ud_esprint` · flandes |

### United Arab Emirates U23 Road Championship `nc-ae-u23-road`

Clase **NC** · AE · día 101 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 147 | 🔴 Inventado | `nc_ruta` · golfo |

### Race Roubaix `race-roubaix`

Clase **WT** · FR · día 102 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 258 | ✅ Real | — |

### Race Pascua `race-pascua`

Clase **2** · ES · día 102 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 140 | 🔴 Inventado | `ud_circuito` · cantabrico |

### Race Roubaix Espoirs `race-roubaix-espoirs`

Clase **2** · FR · día 102 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 180 | 🔴 Inventado | `ud_adoquin_ligero` · francia_norte |

### Race Ślężański `race-slezanski`

Clase **2** · PL · día 102 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 149 | 🔴 Inventado | `ud_esprint` · centroeuropa |

### Race Vendemiano `race-vendemiano`

Clase **2** · IT · día 102 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | — | — | 133 | 🔴 Inventado | `ud_muro_final` · italia_norte |

### United Arab Emirates Road Championship `nc-ae-road`

Clase **NC** · AE · día 102 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 193 | 🔴 Inventado | `nc_ruta` · golfo |

### Race Galicia `race-galicia`

Clase **1** · ES · día 104 · 5 etapas · recorrido mixto · ✅ Real 4 · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Maia | Matosinhos | 190 | ✅ Real | — |
| 2 | Media montaña · Hills | Marin | A Estrada | 133 | ✅ Real | — |
| 3 | Contrarreloj · ITT | Ourense | O Pereiro de Aguiar | 16 | 🟡 Sin validar | `et_crono` · cantabrico |
| 4 | Montaña · Summit finish | A Pobra do Brollon | O Cebreiro | 137 | ✅ Real | — |
| 5 | Media montaña · Hills | Betanzos | Santiago de Compostela | 160 | ✅ Real | — |

### Race Hainan `race-hainan`

Clase **Pro** · CN · día 105 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Qionghai | Qionghai | 90 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 2 | Llana · Flat | Qionghai | Lingshui | 178 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 3 | Media montaña · Hills | Lingshui | Baoting | 213 | 🟡 Sin validar | `et_media_tendida` · asia_oriental |
| 4 | Media montaña · Uphill finish | Baoting | Dongfang | 191 | 🟡 Sin validar | `et_media_alto` · asia_oriental |
| 5 | Llana · Flat | Changjiang | Sanya | 183 | 🟡 Sin validar | `et_llana` · asia_oriental |

### Race Limburg `race-limburg`

Clase **1** · NL · día 105 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 187 | 🔴 Inventado | `ud_muros_adoquin` · flandes |

### Race Loir-et-Cher `race-loir-cher`

Clase **2** · FR · día 105 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 131 | 🔴 Inventado | `et_llana` · bretana |
| 2 | Media montaña · Wall finish | — | — | 144 | 🔴 Inventado | `et_media_muro` · francia_norte |
| 3 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `et_crono` · francia_norte |
| 4 | Media montaña · Wall finish | — | — | 110 | 🔴 Inventado | `et_media_muro` · francia_norte |
| 5 | Llana · Flat | — | — | 123 | 🔴 Inventado | `et_llana` · francia_norte |

### Costa Rica ITT Championship `nc-cr-itt`

Clase **NC** · CR · día 106 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · generico |

### Costa Rica U23 ITT Championship `nc-cr-u23-itt`

Clase **NC** · CR · día 106 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Race Brabant `race-brabant`

Clase **Pro** · BE · día 107 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 163 | ✅ Real | — |

### Race Besançon `race-besancon`

Clase **1** · FR · día 107 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 175 | 🔴 Inventado | `ud_muros` · macizo_central |

### Race Bosnia `race-bosnia`

Clase **2** · BA · día 107 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 133 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `et_crono` · balcanes |
| 3 | Montaña · Summit finish | — | — | 121 | 🔴 Inventado | `et_reina_alto_largo` · balcanes |

### Race Algeria `race-algeria`

Clase **2** · DZ · día 107 · 6 etapas · recorrido generado · 🔴 Inventado 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | — | — | 4 | 🔴 Inventado | `et_prologo` · africa_llana |
| 2 | Media montaña · Uphill finish | — | — | 132 | 🔴 Inventado | `et_media_alto` · africa_llana |
| 3 | Media montaña · Hills | — | — | 138 | 🔴 Inventado | `et_media_valle` · africa_llana |
| 4 | Media montaña · Hills | — | — | 146 | 🔴 Inventado | `et_media_valle` · africa_llana |
| 5 | Contrarreloj · ITT | — | — | 18 | 🔴 Inventado | `et_crono` · africa_llana |
| 6 | Media montaña · Uphill finish | — | — | 129 | 🔴 Inventado | `et_media_alto` · africa_llana |

### Race Jura `race-jura`

Clase **1** · FR · día 108 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Mountains classic | — | — | 184 | 🔴 Inventado | `ud_montana` · macizo_central |

### Race Liège Espoirs `race-liege-espoirs`

Clase **2** · BE · día 108 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 180 | 🔴 Inventado | `ud_repecho` · ardenas |

### Costa Rica U23 Road Championship `nc-cr-u23-road`

Clase **NC** · CR · día 108 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 162 | 🔴 Inventado | `nc_ruta` · generico |

### Race Amstel `race-amstel`

Clase **WT** · NL · día 109 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 256 | ✅ Real | — |

### Race Doubs `race-doubs`

Clase **1** · FR · día 109 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 178 | 🔴 Inventado | `ud_muros` · macizo_central |

### Race Biella `race-biella`

Clase **2** · IT · día 109 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 142 | 🔴 Inventado | `ud_repecho` · italia_norte |

### Costa Rica Road Championship `nc-cr-road`

Clase **NC** · CR · día 109 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 208 | 🔴 Inventado | `nc_ruta` · generico |

### Race Alps `race-alps`

Clase **Pro** · IT · día 110 · 5 etapas · recorrido real · ✅ Real 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | Innsbruck | Innsbruck | 144 | ✅ Real | — |
| 2 | Montaña · Summit finish | Telfs | Martello | 148 | ✅ Real | — |
| 3 | Montaña · Summit finish | Laces | Arco | 175 | ✅ Real | — |
| 4 | Montaña · Summit finish | Arco | Trento | 168 | ✅ Real | — |
| 5 | Montaña · Summit finish | Trento | Bolzano | 129 | ✅ Real | — |

### Race Walloon Wall `race-walloon-wall`

Clase **WT** · BE · día 112 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | — | — | 205 | ✅ Real | — |

### Race Belgrade `race-belgrade`

Clase **2** · RS · día 112 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 125 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · balcanes |
| 3 | Media montaña · Hills | — | — | 146 | 🔴 Inventado | `et_media_tendida` · balcanes |
| 4 | Media montaña · Uphill finish | — | — | 118 | 🔴 Inventado | `et_media_alto` · balcanes |

### Egypt ITT Championship `nc-eg-itt`

Clase **NC** · EG · día 112 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### Egypt U23 ITT Championship `nc-eg-u23-itt`

Clase **NC** · EG · día 112 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Race Asturias `race-asturias`

Clase **1** · ES · día 113 · 4 etapas · recorrido mixto · 🟡 Sin validar 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | Oviedo | Llanes | 164 | 🟡 Sin validar | `et_reina_cima_cerca` · cantabrico |
| 2 | Montaña · Summit finish | Benia de Onis | Pola de Lena | 144 | 🟡 Sin validar | `et_reina_alto_corto` · cantabrico |
| 3 | Media montaña · Wall finish | Castropol | Vegadeo | 166 | 🟡 Sin validar | `et_media_muro` · cantabrico |
| 4 | Media montaña · Uphill finish | Navia | Oviedo | 136 | 🟡 Sin validar | `et_media_alto` · cantabrico |

### Panama ITT Championship `nc-pa-itt`

Clase **NC** · PA · día 113 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · generico |

### Panama U23 ITT Championship `nc-pa-u23-itt`

Clase **NC** · PA · día 113 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Egypt U23 Road Championship `nc-eg-u23-road`

Clase **NC** · EG · día 114 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 168 | 🔴 Inventado | `nc_ruta` · generico |

### Race Liberazione `race-liberazione`

Clase **2** · IT · día 115 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 133 | 🔴 Inventado | `ud_esprint` · italia_sur |

### Race Bretagne `race-bretagne`

Clase **2** · FR · día 115 · 7 etapas · recorrido mixto · 🟡 Sin validar 7

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Hirel | La Fresnais | 143 | 🟡 Sin validar | `et_llana_viento` · bretana |
| 2 | Media montaña · Wall finish | La Gouesniere | Le Cambout | 182 | 🟡 Sin validar | `et_media_muro` · bretana |
| 3 | Media montaña · Wall finish | Loudeac | Ploneour-Lanvern | 206 | 🟡 Sin validar | `et_media_muro` · bretana |
| 4 | Media montaña · Wall finish | Ploneour-Lanvern | Landevant | 205 | 🟡 Sin validar | `et_media_muro` · bretana |
| 5 | Media montaña · Wall finish | Erdeven | Guenrouet | 164 | 🟡 Sin validar | `et_media_muro` · bretana |
| 6 | Media montaña · Wall finish | Missillac | Le Pertre | 180 | 🟡 Sin validar | `et_media_muro` · bretana |
| 7 | Media montaña · Wall finish | Landebia | Plancoet | 159 | 🟡 Sin validar | `et_media_muro` · bretana |

### Egypt Road Championship `nc-eg-road`

Clase **NC** · EG · día 115 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 231 | 🔴 Inventado | `nc_ruta` · generico |

### Race Liège `race-liege`

Clase **WT** · BE · día 116 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 252 | ✅ Real | — |

### Race Türkiye `race-turkiye`

Clase **Pro** · TR · día 116 · 8 etapas · recorrido mixto · 🟡 Sin validar 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Cesme | Selcuk | 149 | 🟡 Sin validar | `et_llana` · anatolia |
| 2 | Media montaña · Uphill finish | Aydin | Marmaris | 153 | 🟡 Sin validar | `et_media_alto` · anatolia |
| 3 | Montaña · Summit finish | Marmaris | Kiran | 133 | 🟡 Sin validar | `et_reina_alto_largo` · anatolia |
| 4 | Llana · Flat | Marmaris | Fethiye | 130 | 🟡 Sin validar | `et_llana_viento` · anatolia |
| 5 | Media montaña · Uphill finish | Patara | Kemer | 181 | 🟡 Sin validar | `et_media_alto` · anatolia |
| 6 | Montaña · Mountains | Antalya | Feslikan | 128 | 🟡 Sin validar | `et_reina_valle` · anatolia |
| 7 | Media montaña · Hills | Antalya | Antalya | 153 | 🟡 Sin validar | `et_media_valle` · anatolia |
| 8 | Llana · Flat | Ankara | Ankara | 105 | 🟡 Sin validar | `et_llana` · anatolia |

### Race Appennino `race-appennino`

Clase **1** · IT · día 116 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Mountains classic | — | — | 189 | 🔴 Inventado | `ud_montana` · italia_norte |

### Race Rutland `race-rutland`

Clase **2** · GB · día 116 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 180 | 🔴 Inventado | `ud_adoquin_ligero` · britanicas |

### Panama U23 Road Championship `nc-pa-u23-road`

Clase **NC** · PA · día 116 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 150 | 🔴 Inventado | `nc_ruta` · generico |

### Panama Road Championship `nc-pa-road`

Clase **NC** · PA · día 116 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 172 | 🔴 Inventado | `nc_ruta` · generico |

### Race Benin `race-benin`

Clase **2** · BJ · día 117 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 150 | 🔴 Inventado | `et_llana` · africa_llana |
| 2 | Media montaña · Uphill finish | — | — | 127 | 🔴 Inventado | `et_media_alto` · africa_llana |
| 3 | Contrarreloj · ITT | — | — | 16 | 🔴 Inventado | `et_crono` · africa_llana |
| 4 | Media montaña · Hills | — | — | 126 | 🔴 Inventado | `et_media_valle` · africa_llana |
| 5 | Llana · Flat | — | — | 121 | 🔴 Inventado | `et_llana` · africa_llana |

### Race Romandy `race-romandy`

Clase **WT** · CH · día 118 · 6 etapas · recorrido real · ✅ Real 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Villars-sur-Glane | Villars-sur-Glane | 3 | ✅ Real | — |
| 2 | Media montaña · Hills | Martigny | Martigny | 171 | ✅ Real | — |
| 3 | Media montaña · Hills | Rue | Vucherens | 173 | ✅ Real | — |
| 4 | Media montaña · Hills | Orbe | Orbe | 177 | ✅ Real | — |
| 5 | Montaña · Summit finish | Broc | Charmey | 150 | ✅ Real | — |
| 6 | Montaña · Summit finish | Lucens | Leysin | 178 | ✅ Real | — |

### Race Gila `race-gila`

Clase **2** · US · día 119 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Tyrone | Tyrone | 26 | 🟡 Sin validar | `et_crono` · norteamerica |
| 2 | Montaña · Mountains | Silver City | Mogollon | 117 | 🟡 Sin validar | `et_reina_valle` · norteamerica |
| 3 | Media montaña · Hills | Fort Bayard | Fort Bayard | 123 | 🟡 Sin validar | `et_media_valle` · norteamerica |
| 4 | Llana · Flat | Silver City | Silver City | 45 | 🟡 Sin validar | `et_llana_viento` · norteamerica |
| 5 | Montaña · Summit finish | Silver City | Silver City | 161 | 🟡 Sin validar | `et_reina_cima_cerca` · norteamerica |

### Race Guatemala `race-guatemala`

Clase **2** · GT · día 119 · 10 etapas · recorrido mixto · 🟡 Sin validar 10

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Teculutan | Puerto Barrios | 172 | 🟡 Sin validar | `et_llana` · generico |
| 2 | Montaña · Mountains | Gualan | El Corcovado | 161 | 🟡 Sin validar | `et_reina_valle` · andes |
| 3 | Montaña · Summit finish | Monjas | Fraijanes | 126 | 🟡 Sin validar | `et_reina_alto_largo` · andes |
| 4 | Llana · Flat | Ciudad Vieja | Coatepeque | 192 | 🟡 Sin validar | `et_llana` · generico |
| 5 | Media montaña · Hills | Retalhuleu | San Rafael Pie de la Cuesta | 109 | 🟡 Sin validar | `et_media_valle` · andes |
| 6 | Montaña · Summit finish | Catarina | San Juan Ostuncalco | 91 | 🟡 Sin validar | `et_reina_alto_largo` · andes |
| 7 | Montaña · Summit finish | San Francisco El Alto | San Pedro | 134 | 🟡 Sin validar | `et_reina_blanda` · andes |
| 8 | Montaña · Mountains | San Juan La Laguna | Tecpan | 128 | 🟡 Sin validar | `et_reina_valle` · andes |
| 9 | Montaña · Summit finish | Chimaltenango | Antigua Guatemala | 200 | 🟡 Sin validar | `et_reina_alto_largo` · andes |
| 10 | Llana · Flat | Villa Linda | Guatemala City | 121 | 🟡 Sin validar | `et_llana` · andes |

### Race Frankfurt `race-frankfurt`

Clase **WT** · DE · día 121 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 204 | ✅ Real | — |

### Race Anicolor `race-anicolor`

Clase **1** · PT · día 121 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 164 | 🔴 Inventado | `et_llana` · portugal |
| 2 | Contrarreloj · Hill climb | — | — | 16 | 🔴 Inventado | `et_cronoescalada` · portugal |
| 3 | Media montaña · Hills | — | — | 129 | 🔴 Inventado | `et_media_valle` · portugal |

### Race Vorarlberg `race-vorarlberg`

Clase **2** · AT · día 121 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 164 | 🔴 Inventado | `ud_montana_media` · alpes |

### Race Waasland `race-waasland`

Clase **2** · BE · día 121 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 136 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Herning `race-herning`

Clase **2** · DK · día 122 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 167 | 🔴 Inventado | `ud_esprint` · escandinavia |

### Race Overijssel `race-overijssel`

Clase **2** · NL · día 122 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 160 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Famenne `race-famenne`

Clase **1** · BE · día 123 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 180 | 🔴 Inventado | `ud_circuito` · ardenas |

### Race Woensdrecht `race-woensdrecht`

Clase **2** · NL · día 123 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 173 | 🔴 Inventado | `ud_adoquin_ligero` · flandes |

### Race Funen `race-funen`

Clase **2** · DK · día 123 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 147 | 🔴 Inventado | `ud_esprint` · escandinavia |

### Race Hellas `race-hellas`

Clase **1** · GR · día 126 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 158 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Hills | — | — | 167 | 🔴 Inventado | `et_media_valle` · balcanes |
| 3 | Media montaña · Hills | — | — | 169 | 🔴 Inventado | `et_media_valle` · balcanes |
| 4 | Montaña · Summit finish | — | — | 131 | 🔴 Inventado | `et_reina_alto_largo` · balcanes |
| 5 | Media montaña · Uphill finish | — | — | 123 | 🔴 Inventado | `et_media_alto` · balcanes |

### Race Fagnes `race-fagnes`

Clase **2** · BE · día 126 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 146 | 🔴 Inventado | `ud_repecho` · ardenas |

### Race Ardennaise `race-fleche-ardennaise`

Clase **2** · BE · día 127 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 163 | 🔴 Inventado | `ud_muros` · ardenas |

### Race Beskid `race-beskid`

Clase **2** · PL · día 127 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 141 | 🔴 Inventado | `ud_muros` · centroeuropa |

### Race Kumano `race-kumano`

Clase **2** · JP · día 127 · 4 etapas · recorrido mixto · 🟡 Sin validar 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Inami | Inami | 125 | 🟡 Sin validar | `et_media_tendida` · asia_oriental |
| 2 | Media montaña · Hills | Kozagawa | Kozagawa | 128 | 🟡 Sin validar | `et_media_valle` · asia_oriental |
| 3 | Montaña · Summit finish | Kumano | Kumano | 108 | 🟡 Sin validar | `et_reina_alto_corto` · asia_oriental |
| 4 | Media montaña · Hills | Taiji | Taiji | 105 | 🟡 Sin validar | `et_media_valle` · asia_oriental |

### Race Italy `race-italy`

Clase **WT** · IT · día 128 · 21 etapas · recorrido real · ✅ Real 21

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Nessebar | Burgas | 147 | ✅ Real | — |
| 2 | Media montaña · Hills | Burgas | Veliko Tarnovo | 221 | ✅ Real | — |
| 3 | Llana · Flat | Plovdiv | Sofia | 175 | ✅ Real | — |
| 4 | Llana · Flat | Catanzaro | Cosenza | 138 | ✅ Real | — |
| 5 | Media montaña · Hills | Praia a Mare | Potenza | 203 | ✅ Real | — |
| 6 | Llana · Flat | Paestum | Napoli | 141 | ✅ Real | — |
| 7 | Montaña · Summit finish | Formia | Blockhaus | 244 | ✅ Real | — |
| 8 | Media montaña · Hills | Chieti | Fermo | 156 | ✅ Real | — |
| 9 | Montaña · Summit finish | Cervia | Corno alle Scale | 184 | ✅ Real | — |
| 10 | Contrarreloj · ITT | Viareggio | Massa | 42 | ✅ Real | — |
| 11 | Media montaña · Hills | Porcari | Chiavari | 195 | ✅ Real | — |
| 12 | Llana · Flat | Imperia | Novi Ligure | 175 | ✅ Real | — |
| 13 | Media montaña · Hills | Alessandria | Verbania | 186 | ✅ Real | — |
| 14 | Montaña · Summit finish | Aosta | Pila | 133 | ✅ Real | — |
| 15 | Llana · Flat | Voghera | Milano | 157 | ✅ Real | — |
| 16 | Montaña · Summit finish | Bellinzona | Cari | 113 | ✅ Real | — |
| 17 | Media montaña · Hills | Cassano d'Adda | Andalo | 202 | ✅ Real | — |
| 18 | Media montaña · Hills | Fai della Paganella | Pieve di Soligo | 171 | ✅ Real | — |
| 19 | Montaña · Summit finish | Feltre | Piani di Pezze | 151 | ✅ Real | — |
| 20 | Montaña · Summit finish | Gemona del Friuli | Piancavallo | 200 | ✅ Real | — |
| 21 | Llana · Flat | Roma | Roma | 131 | ✅ Real | — |

### Race Morbihan `race-morbihan`

Clase **Pro** · FR · día 129 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 219 | 🔴 Inventado | `ud_sterrato` · bretana |

### Race Beskid Classic `race-beskid-race`

Clase **2** · PL · día 129 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 144 | 🔴 Inventado | `ud_circuito` · centroeuropa |

### Race Sundvolden `race-sundvolden`

Clase **2** · NO · día 129 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 158 | 🔴 Inventado | `ud_repecho` · escandinavia |

### Race Léon `race-leon`

Clase **Pro** · ES · día 130 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 189 | 🔴 Inventado | `ud_repecho` · meseta |

### Race Baku `race-baku`

Clase **1** · AZ · día 130 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 157 | 🔴 Inventado | `et_llana` · anatolia |
| 2 | Llana · Flat | — | — | 177 | 🔴 Inventado | `et_llana` · anatolia |
| 3 | Media montaña · Hills | — | — | 168 | 🔴 Inventado | `et_media_valle` · anatolia |
| 4 | Media montaña · Hills | — | — | 135 | 🔴 Inventado | `et_media_valle` · anatolia |
| 5 | Montaña · Summit finish | — | — | 110 | 🔴 Inventado | `et_reina_alto_corto` · anatolia |

### Race Zagłębie `race-zaglebie`

Clase **2** · PL · día 130 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 170 | 🔴 Inventado | `ud_esprint` · centroeuropa |

### Race Ringerike `race-ringerike`

Clase **2** · NO · día 130 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 127 | 🔴 Inventado | `ud_esprint` · escandinavia |

### Race Hungary `race-hungary`

Clase **Pro** · HU · día 133 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Gyula | Bekescsaba | 143 | 🟡 Sin validar | `et_llana` · centroeuropa |
| 2 | Llana · Flat | Szarvas | Paks | 206 | 🟡 Sin validar | `et_llana` · centroeuropa |
| 3 | Media montaña · Uphill finish | Kaposvar | Szekszard | 152 | 🟡 Sin validar | `et_media_alto` · centroeuropa |
| 4 | Montaña · Summit finish | Mohacs | Pecs | 188 | 🟡 Sin validar | `et_reina_alto_corto` · centroeuropa |
| 5 | Media montaña · Uphill finish | Balatonalmadi | Veszprem | 147 | 🟡 Sin validar | `et_media_alto` · centroeuropa |

### Race Flèche du Sud `race-fleche-sud`

Clase **1** · LU · día 133 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 150 | 🔴 Inventado | `et_llana` · ardenas |
| 2 | Media montaña · Uphill finish | — | — | 146 | 🔴 Inventado | `et_media_alto` · ardenas |
| 3 | Media montaña · Hills | — | — | 152 | 🔴 Inventado | `et_media_valle` · ardenas |
| 4 | Contrarreloj · ITT | — | — | 23 | 🔴 Inventado | `et_crono` · ardenas |
| 5 | Media montaña · Uphill finish | — | — | 124 | 🔴 Inventado | `et_media_alto` · ardenas |

### Race Wallonie Circuit `race-wallonie-circuit`

Clase **1** · BE · día 134 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 187 | 🔴 Inventado | `ud_montana_media` · ardenas |

### Race Finistère `race-finistere`

Clase **1** · FR · día 136 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 174 | 🔴 Inventado | `ud_circuito` · bretana |

### Race Aulne `race-aulne`

Clase **1** · FR · día 137 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 190 | 🔴 Inventado | `ud_sterrato` · bretana |

### Race Köln `race-koln`

Clase **1** · DE · día 137 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 172 | 🔴 Inventado | `ud_montana_media` · centroeuropa |

### Race Arvedi `race-arvedi`

Clase **2** · IT · día 137 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 146 | 🔴 Inventado | `ud_esprint` · italia_norte |

### Race Kempen `race-kempen`

Clase **2** · BE · día 137 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 126 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Albania `race-albania`

Clase **2** · AL · día 138 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 148 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Hills | — | — | 134 | 🔴 Inventado | `et_media_valle` · balcanes |
| 3 | Media montaña · Hills | — | — | 113 | 🔴 Inventado | `et_media_tendida` · balcanes |
| 4 | Llana · Flat | — | — | 152 | 🔴 Inventado | `et_llana` · balcanes |
| 5 | Media montaña · Uphill finish | — | — | 97 | 🔴 Inventado | `et_media_alto` · balcanes |

### Race Dunkerque `race-dunkerque`

Clase **Pro** · FR · día 139 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 213 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Hauts-de-France `race-hauts-de-france`

Clase **Pro** · FR · día 140 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | Lagny-le-Sec | Laon | 178 | 🟡 Sin validar | `et_media_muro` · francia_norte |
| 2 | Llana · Flat | Glisy | Lievin | 188 | 🟡 Sin validar | `et_llana` · francia_norte |
| 3 | Clásica · Cobbles | La Sentinelle | Wallers-Arenberg | 156 | 🟡 Sin validar | `ud_adoquin_ligero` · francia_norte |
| 4 | Media montaña · Wall finish | Bergues | Cassel | 166 | 🟡 Sin validar | `et_media_muro` · francia_norte |
| 5 | Llana · Flat | Saint-Omer | Dunkerque | 184 | 🟡 Sin validar | `et_llana_viento` · francia_norte |

### Race Estrela `race-estrela`

Clase **1** · PT · día 142 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 145 | 🔴 Inventado | `et_llana` · portugal |
| 2 | Media montaña · Hills | — | — | 166 | 🔴 Inventado | `et_media_valle` · portugal |
| 3 | Montaña · Summit finish | — | — | 134 | 🔴 Inventado | `et_reina_alto_corto` · portugal |

### Race Veenendaal `race-veenendaal`

Clase **1** · NL · día 143 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 199 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Criquielion `race-criquielion`

Clase **1** · BE · día 144 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 195 | 🔴 Inventado | `ud_circuito` · flandes |

### Race Nippon `race-nippon`

Clase **2** · JP · día 144 · 8 etapas · recorrido generado · 🔴 Inventado 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | — | — | 7 | 🔴 Inventado | `et_prologo` · asia_oriental |
| 2 | Media montaña · Hills | — | — | 142 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 3 | Media montaña · Hills | — | — | 131 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 4 | Media montaña · Wall finish | — | — | 141 | 🔴 Inventado | `et_media_muro` · asia_oriental |
| 5 | Media montaña · Hills | — | — | 150 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 6 | Media montaña · Hills | — | — | 142 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 7 | Contrarreloj · ITT | — | — | 16 | 🔴 Inventado | `et_crono` · asia_oriental |
| 8 | Montaña · Summit finish | — | — | 102 | 🔴 Inventado | `et_reina_alto_corto` · asia_oriental |

### Race Antwerp `race-antwerp`

Clase **1** · BE · día 145 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 179 | 🔴 Inventado | `ud_muros_adoquin` · flandes |

### Race Troyes `race-troyes`

Clase **2** · FR · día 145 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 175 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Isère `race-isere`

Clase **2** · FR · día 147 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 153 | 🔴 Inventado | `et_llana` · alpes |
| 2 | Media montaña · Hills | — | — | 118 | 🔴 Inventado | `et_media_valle` · alpes |
| 3 | Media montaña · Hills | — | — | 113 | 🔴 Inventado | `et_media_valle` · alpes |
| 4 | Media montaña · Hills | — | — | 122 | 🔴 Inventado | `et_media_tendida` · provenza |
| 5 | Montaña · Summit finish | — | — | 116 | 🔴 Inventado | `et_reina_alto_largo` · pirineos |

### Race Lithuania `race-lithuania`

Clase **2** · LT · día 147 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 137 | 🔴 Inventado | `et_llana` · escandinavia |
| 2 | Media montaña · Hills | — | — | 107 | 🔴 Inventado | `et_media_tendida` · escandinavia |
| 3 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · escandinavia |
| 4 | Llana · Flat | — | — | 147 | 🔴 Inventado | `et_llana` · escandinavia |
| 5 | Media montaña · Uphill finish | — | — | 129 | 🔴 Inventado | `et_media_alto` · escandinavia |

### Race Mayenne `race-mayenne`

Clase **Pro** · FR · día 148 · 4 etapas · recorrido mixto · 🟡 Sin validar 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | Laval | Laval | 5 | 🟡 Sin validar | `et_prologo` · bretana |
| 2 | Media montaña · Wall finish | Saint-Berthevin | Chateau-Gontier-sur-Mayenne | 172 | 🟡 Sin validar | `et_media_muro` · bretana |
| 3 | Media montaña · Wall finish | Aron | Pre-en-Pail-Saint-Samson | 215 | 🟡 Sin validar | `et_media_muro` · bretana |
| 4 | Llana · Flat | Cosse-le-Vivien | Laval | 148 | 🟡 Sin validar | `et_llana_viento` · bretana |

### Race Norway `race-norway`

Clase **Pro** · NO · día 148 · 4 etapas · recorrido mixto · 🟡 Sin validar 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Solakrossen | Solakrossen | 179 | 🟡 Sin validar | `et_llana_viento` · escandinavia |
| 2 | Media montaña · Hills | Egersund | Oltedal | 208 | 🟡 Sin validar | `et_media_tendida` · escandinavia |
| 3 | Media montaña · Wall finish | Jorpeland | Heia | 142 | 🟡 Sin validar | `et_media_muro` · escandinavia |
| 4 | Media montaña · Uphill finish | Stavanger | Stavanger | 130 | 🟡 Sin validar | `et_media_alto` · escandinavia |

### Race Wallonia `race-wallonia`

Clase **Pro** · BE · día 152 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Manage | Lobbes | 181 | 🟡 Sin validar | `et_media_valle` · ardenas |
| 2 | Media montaña · Wall finish | Jodoigne | Libramont-Chevigny | 192 | 🟡 Sin validar | `et_media_muro` · ardenas |
| 3 | Media montaña · Wall finish | Habay | Vaux-sur-Sure | 177 | 🟡 Sin validar | `et_media_muro` · ardenas |
| 4 | Media montaña · Hills | Dison | Eupen | 167 | 🟡 Sin validar | `et_media_valle` · ardenas |
| 5 | Media montaña · Hills | Bassenge | Aubel | 177 | 🟡 Sin validar | `et_media_valle` · ardenas |

### Race Mauritius `race-mauritius`

Clase **2** · MU · día 153 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 110 | 🔴 Inventado | `et_llana` · africa_llana |
| 2 | Media montaña · Hills | — | — | 142 | 🔴 Inventado | `et_media_tendida` · africa_llana |
| 3 | Contrarreloj · ITT | — | — | 23 | 🔴 Inventado | `et_crono` · africa_llana |
| 4 | Media montaña · Uphill finish | — | — | 104 | 🔴 Inventado | `et_media_alto` · africa_llana |

### Race Mercantour `race-mercantour`

Clase **1** · FR · día 154 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | — | — | 198 | 🔴 Inventado | `ud_montana_alto` · alpes |

### Race Cameroon `race-cameroon`

Clase **2** · CM · día 154 · 8 etapas · recorrido generado · 🔴 Inventado 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 131 | 🔴 Inventado | `et_llana` · africa_llana |
| 2 | Media montaña · Hills | — | — | 138 | 🔴 Inventado | `et_media_valle` · africa_llana |
| 3 | Media montaña · Hills | — | — | 140 | 🔴 Inventado | `et_media_valle` · africa_llana |
| 4 | Media montaña · Hills | — | — | 131 | 🔴 Inventado | `et_media_valle` · africa_llana |
| 5 | Media montaña · Hills | — | — | 116 | 🔴 Inventado | `et_media_tendida` · africa_llana |
| 6 | Media montaña · Uphill finish | — | — | 137 | 🔴 Inventado | `et_media_alto` · africa_llana |
| 7 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · africa_llana |
| 8 | Llana · Flat | — | — | 108 | 🔴 Inventado | `et_llana` · africa_llana |

### Race Estonia `race-estonia`

Clase **1** · EE · día 155 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 158 | 🔴 Inventado | `et_llana` · escandinavia |
| 2 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `et_crono` · escandinavia |
| 3 | Media montaña · Uphill finish | — | — | 128 | 🔴 Inventado | `et_media_alto` · escandinavia |

### Race Oberösterreich `race-oberosterreich`

Clase **2** · AT · día 155 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 109 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Montaña · Summit finish | — | — | 144 | 🔴 Inventado | `et_reina_alto_largo` · alpes |
| 3 | Media montaña · Hills | — | — | 121 | 🔴 Inventado | `et_media_valle` · alpes |
| 4 | Media montaña · Hills | — | — | 113 | 🔴 Inventado | `et_media_valle` · alpes |

### Race Oise `race-oise`

Clase **2** · FR · día 155 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 147 | 🔴 Inventado | `et_llana` · francia_norte |
| 2 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · bretana |
| 3 | Media montaña · Uphill finish | — | — | 126 | 🔴 Inventado | `et_media_alto` · pirineos |
| 4 | Media montaña · Hills | — | — | 119 | 🔴 Inventado | `et_media_tendida` · pirineos |

### Race Heist `race-heist`

Clase **1** · BE · día 157 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 182 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Rhône-Alpes `race-rhone-alpes`

Clase **WT** · FR · día 158 · 8 etapas · recorrido mixto · ✅ Real 7 · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | Vizille | Saint-Ismier | 146 | ✅ Real | — |
| 2 | Media montaña · Hills | Saint-Martin-le-Vinoux | Le Puy-en-Velay | 234 | ✅ Real | — |
| 3 | Contrarreloj · ITT | Perreux | Perreux | 28 | 🟡 Sin validar | `et_crono` · macizo_central |
| 4 | Media montaña · Hills | Le Puy-en-Velay | Montrond-les-Bains | 167 | ✅ Real | — |
| 5 | Llana · Flat | Saint-Chamond | Villars-les-Dombes | 196 | ✅ Real | — |
| 6 | Montaña · Summit finish | Saint-Vulbas | Crest-Voland | 182 | ✅ Real | — |
| 7 | Montaña · Summit finish | La Bridoire | Grand Colombier | 134 | ✅ Real | — |
| 8 | Montaña · Summit finish | Beaufort | Plateau de Solaison | 120 | ✅ Real | — |

### Race Brussels `race-brussels`

Clase **Pro** · BE · día 158 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 216 | 🔴 Inventado | `ud_adoquin_ligero` · flandes |

### Race Visegrad `race-visegrad-cz`

Clase **2** · CZ · día 158 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 180 | 🔴 Inventado | `ud_repecho` · centroeuropa |

### Ecuador ITT Championship `nc-ec-itt`

Clase **NC** · EC · día 159 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · andes |

### Ecuador U23 ITT Championship `nc-ec-u23-itt`

Clase **NC** · EC · día 160 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · andes |

### Race Franco-Belgian `race-franco-belgian`

Clase **Pro** · FR · día 161 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 192 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Beauce `race-beauce`

Clase **2** · CA · día 161 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 141 | 🔴 Inventado | `et_llana` · norteamerica |
| 2 | Media montaña · Hills | — | — | 134 | 🔴 Inventado | `et_media_valle` · norteamerica |
| 3 | Media montaña · Uphill finish | — | — | 129 | 🔴 Inventado | `et_media_alto` · norteamerica |
| 4 | Contrarreloj · ITT | — | — | 17 | 🔴 Inventado | `et_crono` · norteamerica |
| 5 | Montaña · Summit finish | — | — | 125 | 🔴 Inventado | `et_reina_alto_corto` · norteamerica |

### Race Malopolska `race-malopolska`

Clase **2** · PL · día 162 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 137 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Media montaña · Hills | — | — | 139 | 🔴 Inventado | `et_media_tendida` · centroeuropa |
| 3 | Montaña · Summit finish | — | — | 108 | 🔴 Inventado | `et_reina_alto_corto` · centroeuropa |

### Ecuador U23 Road Championship `nc-ec-u23-road`

Clase **NC** · EC · día 162 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 150 | 🔴 Inventado | `nc_ruta` · andes |

### Ecuador Road Championship `nc-ec-road`

Clase **NC** · EC · día 163 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 194 | 🔴 Inventado | `nc_ruta` · andes |

### Race Copenhagen `race-copenhagen`

Clase **WT** · DK · día 165 · 1 etapa · recorrido mixto · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Roskilde | Copenhagen | 236 | 🟡 Sin validar | `et_llana` · escandinavia |

### Race Elfsteden `race-elfsteden`

Clase **1** · NL · día 165 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 172 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Gippingen `race-gippingen`

Clase **1** · CH · día 165 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 190 | 🔴 Inventado | `ud_circuito` · centroeuropa |

### Race Muur `race-muur`

Clase **1** · BE · día 165 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 193 | 🔴 Inventado | `ud_muros_adoquin` · flandes |

### Race Switzerland `race-switzerland`

Clase **WT** · CH · día 168 · 5 etapas · recorrido real · ✅ Real 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Summit finish | Morbegno | Sondrio | 144 | ✅ Real | — |
| 2 | Media montaña · Hills | Lugano | Bellinzona | 158 | ✅ Real | — |
| 3 | Montaña · Summit finish | Buchs | Sargans | 157 | ✅ Real | — |
| 4 | Contrarreloj · ITT | Neundorf | Fulenbach | 24 | ✅ Real | — |
| 5 | Montaña · Summit finish | Les Diablerets | Villars-sur-Ollon | 151 | ✅ Real | — |

### Race Belgium `race-belgium`

Clase **Pro** · BE · día 168 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | Scherpenheuvel-Zichem | Scherpenheuvel-Zichem | 188 | 🟡 Sin validar | `et_media_muro` · flandes |
| 2 | Llana · Flat | Merelbeke-Melle | Knokke-Heist | 198 | 🟡 Sin validar | `et_llana` · flandes |
| 3 | Media montaña · Uphill finish | Durbuy | Durbuy | 173 | 🟡 Sin validar | `et_media_alto` · ardenas |
| 4 | Llana · Flat | Begijnendijk-Betekom | Aarschot | 184 | 🟡 Sin validar | `et_llana_viento` · flandes |
| 5 | Clásica · Cobbles | Gingelom | Hoeilaart | 184 | 🟡 Sin validar | `ud_adoquin_ligero` · flandes |

### Race Slovenia `race-slovenia`

Clase **Pro** · SI · día 168 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Velenje | Rogaska Slatina | 142 | 🟡 Sin validar | `et_media_valle` · centroeuropa |
| 2 | Media montaña · Hills | Radlje ob Dravi | Ormoz | 177 | 🟡 Sin validar | `et_media_valle` · centroeuropa |
| 3 | Media montaña · Hills | Maribor | Celje | 137 | 🟡 Sin validar | `et_media_valle` · centroeuropa |
| 4 | Montaña · Summit finish | Kranj | Kranjska Gora | 183 | 🟡 Sin validar | `et_reina_alto_largo` · alpes |
| 5 | Media montaña · Hills | Litija | Novo Mesto | 162 | 🟡 Sin validar | `et_media_valle` · centroeuropa |

### Macau ITT Championship `nc-mo-itt`

Clase **NC** · MO · día 168 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Race Occitanie `race-occitanie`

Clase **1** · FR · día 169 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 149 | 🔴 Inventado | `et_llana` · pirineos |
| 2 | Media montaña · Hills | — | — | 161 | 🔴 Inventado | `et_media_tendida` · pirineos |
| 3 | Media montaña · Hills | — | — | 155 | 🔴 Inventado | `et_media_valle` · pirineos |
| 4 | Montaña · Summit finish | — | — | 127 | 🔴 Inventado | `et_reina_alto_corto` · pirineos |

### Macau U23 ITT Championship `nc-mo-u23-itt`

Clase **NC** · MO · día 169 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · generico |

### Race Mazury `race-mazury`

Clase **2** · PL · día 170 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 130 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Media montaña · Uphill finish | — | — | 106 | 🔴 Inventado | `et_media_alto` · centroeuropa |
| 3 | Media montaña · Hills | — | — | 133 | 🔴 Inventado | `et_media_tendida` · centroeuropa |

### Macau U23 Road Championship `nc-mo-u23-road`

Clase **NC** · MO · día 171 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 152 | 🔴 Inventado | `nc_ruta` · generico |

### Race Andorra Classic `race-andorra-classic`

Clase **1** · AD · día 172 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Montaña · Mountains classic | — | — | 179 | 🔴 Inventado | `ud_montana` · pirineos |

### Macau Road Championship `nc-mo-road`

Clase **NC** · MO · día 172 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 187 | 🔴 Inventado | `nc_ruta` · generico |

### Germany ITT Championship `nc-de-itt`

Clase **NC** · DE · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Portugal ITT Championship `nc-pt-itt`

Clase **NC** · PT · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · portugal |

### Norway ITT Championship `nc-no-itt`

Clase **NC** · NO · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · escandinavia |

### Slovenia ITT Championship `nc-si-itt`

Clase **NC** · SI · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 46 | 🔴 Inventado | `nc_crono` · alpes |

### Switzerland ITT Championship `nc-ch-itt`

Clase **NC** · CH · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · alpes |

### Poland ITT Championship `nc-pl-itt`

Clase **NC** · PL · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Czechia ITT Championship `nc-cz-itt`

Clase **NC** · CZ · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 47 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Ukraine ITT Championship `nc-ua-itt`

Clase **NC** · UA · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Lithuania ITT Championship `nc-lt-itt`

Clase **NC** · LT · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · escandinavia |

### Belarus ITT Championship `nc-by-itt`

Clase **NC** · BY · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 46 | 🔴 Inventado | `nc_crono` · generico |

### Venezuela ITT Championship `nc-ve-itt`

Clase **NC** · VE · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · andes |

### Finland ITT Championship `nc-fi-itt`

Clase **NC** · FI · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · escandinavia |

### Russia ITT Championship `nc-ru-itt`

Clase **NC** · RU · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · generico |

### Serbia ITT Championship `nc-rs-itt`

Clase **NC** · RS · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · balcanes |

### Israel ITT Championship `nc-il-itt`

Clase **NC** · IL · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Eritrea ITT Championship `nc-er-itt`

Clase **NC** · ER · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · generico |

### Guatemala ITT Championship `nc-gt-itt`

Clase **NC** · GT · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · andes |

### Georgia ITT Championship `nc-ge-itt`

Clase **NC** · GE · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · generico |

### Iceland ITT Championship `nc-is-itt`

Clase **NC** · IS · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · generico |

### Singapore ITT Championship `nc-sg-itt`

Clase **NC** · SG · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Dominican Republic ITT Championship `nc-do-itt`

Clase **NC** · DO · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 47 | 🔴 Inventado | `nc_crono` · generico |

### Bahrain ITT Championship `nc-bh-itt`

Clase **NC** · BH · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Kosovo ITT Championship `nc-xk-itt`

Clase **NC** · XK · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · balcanes |

### Andorra ITT Championship `nc-ad-itt`

Clase **NC** · AD · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · pirineos |

### Bosnia and Herzegovina ITT Championship `nc-ba-itt`

Clase **NC** · BA · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · balcanes |

### Cyprus ITT Championship `nc-cy-itt`

Clase **NC** · CY · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · anatolia |

### Antigua and Barbuda ITT Championship `nc-ag-itt`

Clase **NC** · AG · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · generico |

### Barbados ITT Championship `nc-bb-itt`

Clase **NC** · BB · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Belize ITT Championship `nc-bz-itt`

Clase **NC** · BZ · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Jordan ITT Championship `nc-jo-itt`

Clase **NC** · JO · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Laos ITT Championship `nc-la-itt`

Clase **NC** · LA · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### Montenegro ITT Championship `nc-me-itt`

Clase **NC** · ME · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · generico |

### Mali ITT Championship `nc-ml-itt`

Clase **NC** · ML · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · generico |

### El Salvador ITT Championship `nc-sv-itt`

Clase **NC** · SV · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · generico |

### Sint Maarten ITT Championship `nc-sx-itt`

Clase **NC** · SX · día 175 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Spain ITT Championship `nc-es-itt`

Clase **NC** · ES · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · cantabrico |

### Spain U23 ITT Championship `nc-es-u23-itt`

Clase **NC** · ES · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · cantabrico |

### France ITT Championship `nc-fr-itt`

Clase **NC** · FR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · bretana |

### France U23 ITT Championship `nc-fr-u23-itt`

Clase **NC** · FR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · bretana |

### Italy ITT Championship `nc-it-itt`

Clase **NC** · IT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · italia_norte |

### Italy U23 ITT Championship `nc-it-u23-itt`

Clase **NC** · IT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · italia_norte |

### Belgium ITT Championship `nc-be-itt`

Clase **NC** · BE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · flandes |

### Belgium U23 ITT Championship `nc-be-u23-itt`

Clase **NC** · BE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · flandes |

### Netherlands ITT Championship `nc-nl-itt`

Clase **NC** · NL · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · flandes |

### Netherlands U23 ITT Championship `nc-nl-u23-itt`

Clase **NC** · NL · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · flandes |

### United Kingdom ITT Championship `nc-gb-itt`

Clase **NC** · GB · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · britanicas |

### United Kingdom U23 ITT Championship `nc-gb-u23-itt`

Clase **NC** · GB · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · britanicas |

### Germany U23 ITT Championship `nc-de-u23-itt`

Clase **NC** · DE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Portugal U23 ITT Championship `nc-pt-u23-itt`

Clase **NC** · PT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · portugal |

### Denmark ITT Championship `nc-dk-itt`

Clase **NC** · DK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · escandinavia |

### Denmark U23 ITT Championship `nc-dk-u23-itt`

Clase **NC** · DK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `nc_crono` · escandinavia |

### Norway U23 ITT Championship `nc-no-u23-itt`

Clase **NC** · NO · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · escandinavia |

### Slovenia U23 ITT Championship `nc-si-u23-itt`

Clase **NC** · SI · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · alpes |

### Slovakia ITT Championship `nc-sk-itt`

Clase **NC** · SK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Slovakia U23 ITT Championship `nc-sk-u23-itt`

Clase **NC** · SK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · centroeuropa |

### United States ITT Championship `nc-us-itt`

Clase **NC** · US · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · norteamerica |

### United States U23 ITT Championship `nc-us-u23-itt`

Clase **NC** · US · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · norteamerica |

### Switzerland U23 ITT Championship `nc-ch-u23-itt`

Clase **NC** · CH · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · alpes |

### Argentina ITT Championship `nc-ar-itt`

Clase **NC** · AR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · cono_sur |

### Argentina U23 ITT Championship `nc-ar-u23-itt`

Clase **NC** · AR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · cono_sur |

### Mexico ITT Championship `nc-mx-itt`

Clase **NC** · MX · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · generico |

### Mexico U23 ITT Championship `nc-mx-u23-itt`

Clase **NC** · MX · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · generico |

### Poland U23 ITT Championship `nc-pl-u23-itt`

Clase **NC** · PL · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Austria ITT Championship `nc-at-itt`

Clase **NC** · AT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · alpes |

### Austria U23 ITT Championship `nc-at-u23-itt`

Clase **NC** · AT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · alpes |

### Ireland ITT Championship `nc-ie-itt`

Clase **NC** · IE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · britanicas |

### Ireland U23 ITT Championship `nc-ie-u23-itt`

Clase **NC** · IE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · britanicas |

### Czechia U23 ITT Championship `nc-cz-u23-itt`

Clase **NC** · CZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Canada ITT Championship `nc-ca-itt`

Clase **NC** · CA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · norteamerica |

### Canada U23 ITT Championship `nc-ca-u23-itt`

Clase **NC** · CA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · norteamerica |

### Sweden ITT Championship `nc-se-itt`

Clase **NC** · SE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · escandinavia |

### Sweden U23 ITT Championship `nc-se-u23-itt`

Clase **NC** · SE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · escandinavia |

### Japan ITT Championship `nc-jp-itt`

Clase **NC** · JP · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Japan U23 ITT Championship `nc-jp-u23-itt`

Clase **NC** · JP · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Kazakhstan ITT Championship `nc-kz-itt`

Clase **NC** · KZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · generico |

### Kazakhstan U23 ITT Championship `nc-kz-u23-itt`

Clase **NC** · KZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · generico |

### Ukraine U23 ITT Championship `nc-ua-u23-itt`

Clase **NC** · UA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### Estonia ITT Championship `nc-ee-itt`

Clase **NC** · EE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · escandinavia |

### Estonia U23 ITT Championship `nc-ee-u23-itt`

Clase **NC** · EE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · escandinavia |

### Latvia ITT Championship `nc-lv-itt`

Clase **NC** · LV · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · escandinavia |

### Latvia U23 ITT Championship `nc-lv-u23-itt`

Clase **NC** · LV · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · escandinavia |

### Lithuania U23 ITT Championship `nc-lt-u23-itt`

Clase **NC** · LT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · escandinavia |

### Belarus U23 ITT Championship `nc-by-u23-itt`

Clase **NC** · BY · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Brazil ITT Championship `nc-br-itt`

Clase **NC** · BR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Brazil U23 ITT Championship `nc-br-u23-itt`

Clase **NC** · BR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · generico |

### Venezuela U23 ITT Championship `nc-ve-u23-itt`

Clase **NC** · VE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · andes |

### Finland U23 ITT Championship `nc-fi-u23-itt`

Clase **NC** · FI · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · escandinavia |

### Croatia ITT Championship `nc-hr-itt`

Clase **NC** · HR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · balcanes |

### Croatia U23 ITT Championship `nc-hr-u23-itt`

Clase **NC** · HR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · balcanes |

### Hungary ITT Championship `nc-hu-itt`

Clase **NC** · HU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Hungary U23 ITT Championship `nc-hu-u23-itt`

Clase **NC** · HU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · centroeuropa |

### Romania ITT Championship `nc-ro-itt`

Clase **NC** · RO · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · balcanes |

### Romania U23 ITT Championship `nc-ro-u23-itt`

Clase **NC** · RO · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · balcanes |

### Russia U23 ITT Championship `nc-ru-u23-itt`

Clase **NC** · RU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · generico |

### Serbia U23 ITT Championship `nc-rs-u23-itt`

Clase **NC** · RS · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · balcanes |

### Bulgaria ITT Championship `nc-bg-itt`

Clase **NC** · BG · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · balcanes |

### Bulgaria U23 ITT Championship `nc-bg-u23-itt`

Clase **NC** · BG · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · balcanes |

### Greece ITT Championship `nc-gr-itt`

Clase **NC** · GR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · balcanes |

### Greece U23 ITT Championship `nc-gr-u23-itt`

Clase **NC** · GR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · balcanes |

### Turkey ITT Championship `nc-tr-itt`

Clase **NC** · TR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · anatolia |

### Turkey U23 ITT Championship `nc-tr-u23-itt`

Clase **NC** · TR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · anatolia |

### Israel U23 ITT Championship `nc-il-u23-itt`

Clase **NC** · IL · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · generico |

### South Korea ITT Championship `nc-kr-itt`

Clase **NC** · KR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · asia_oriental |

### South Korea U23 ITT Championship `nc-kr-u23-itt`

Clase **NC** · KR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · asia_oriental |

### China ITT Championship `nc-cn-itt`

Clase **NC** · CN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · asia_oriental |

### China U23 ITT Championship `nc-cn-u23-itt`

Clase **NC** · CN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Peru ITT Championship `nc-pe-itt`

Clase **NC** · PE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Peru U23 ITT Championship `nc-pe-u23-itt`

Clase **NC** · PE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · generico |

### Morocco ITT Championship `nc-ma-itt`

Clase **NC** · MA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 45 | 🔴 Inventado | `nc_crono` · montana_sur |

### Morocco U23 ITT Championship `nc-ma-u23-itt`

Clase **NC** · MA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · montana_sur |

### Eritrea U23 ITT Championship `nc-er-u23-itt`

Clase **NC** · ER · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · generico |

### Luxembourg ITT Championship `nc-lu-itt`

Clase **NC** · LU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · ardenas |

### Luxembourg U23 ITT Championship `nc-lu-u23-itt`

Clase **NC** · LU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · ardenas |

### Rwanda ITT Championship `nc-rw-itt`

Clase **NC** · RW · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · montana_sur |

### Rwanda U23 ITT Championship `nc-rw-u23-itt`

Clase **NC** · RW · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · montana_sur |

### Algeria ITT Championship `nc-dz-itt`

Clase **NC** · DZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · africa_llana |

### Algeria U23 ITT Championship `nc-dz-u23-itt`

Clase **NC** · DZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · africa_llana |

### Guatemala U23 ITT Championship `nc-gt-u23-itt`

Clase **NC** · GT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · andes |

### Georgia U23 ITT Championship `nc-ge-u23-itt`

Clase **NC** · GE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### India ITT Championship `nc-in-itt`

Clase **NC** · IN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · asia_oriental |

### India U23 ITT Championship `nc-in-u23-itt`

Clase **NC** · IN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Ethiopia ITT Championship `nc-et-itt`

Clase **NC** · ET · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · generico |

### Ethiopia U23 ITT Championship `nc-et-u23-itt`

Clase **NC** · ET · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · generico |

### Indonesia ITT Championship `nc-id-itt`

Clase **NC** · ID · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Indonesia U23 ITT Championship `nc-id-u23-itt`

Clase **NC** · ID · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Cuba ITT Championship `nc-cu-itt`

Clase **NC** · CU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Cuba U23 ITT Championship `nc-cu-u23-itt`

Clase **NC** · CU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · generico |

### Moldova ITT Championship `nc-md-itt`

Clase **NC** · MD · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · generico |

### Moldova U23 ITT Championship `nc-md-u23-itt`

Clase **NC** · MD · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · generico |

### Nigeria ITT Championship `nc-ng-itt`

Clase **NC** · NG · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Nigeria U23 ITT Championship `nc-ng-u23-itt`

Clase **NC** · NG · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · generico |

### Kenya ITT Championship `nc-ke-itt`

Clase **NC** · KE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Kenya U23 ITT Championship `nc-ke-u23-itt`

Clase **NC** · KE · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### Tunisia ITT Championship `nc-tn-itt`

Clase **NC** · TN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Tunisia U23 ITT Championship `nc-tn-u23-itt`

Clase **NC** · TN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Vietnam ITT Championship `nc-vn-itt`

Clase **NC** · VN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · generico |

### Vietnam U23 ITT Championship `nc-vn-u23-itt`

Clase **NC** · VN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · generico |

### Armenia ITT Championship `nc-am-itt`

Clase **NC** · AM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · generico |

### Armenia U23 ITT Championship `nc-am-u23-itt`

Clase **NC** · AM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Iceland U23 ITT Championship `nc-is-u23-itt`

Clase **NC** · IS · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · generico |

### Azerbaijan ITT Championship `nc-az-itt`

Clase **NC** · AZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 47 | 🔴 Inventado | `nc_crono` · anatolia |

### Azerbaijan U23 ITT Championship `nc-az-u23-itt`

Clase **NC** · AZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · anatolia |

### Uzbekistan ITT Championship `nc-uz-itt`

Clase **NC** · UZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · generico |

### Uzbekistan U23 ITT Championship `nc-uz-u23-itt`

Clase **NC** · UZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · generico |

### Saudi Arabia ITT Championship `nc-sa-itt`

Clase **NC** · SA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · golfo |

### Saudi Arabia U23 ITT Championship `nc-sa-u23-itt`

Clase **NC** · SA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · golfo |

### Qatar ITT Championship `nc-qa-itt`

Clase **NC** · QA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · golfo |

### Qatar U23 ITT Championship `nc-qa-u23-itt`

Clase **NC** · QA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · golfo |

### Singapore U23 ITT Championship `nc-sg-u23-itt`

Clase **NC** · SG · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · generico |

### Dominican Republic U23 ITT Championship `nc-do-u23-itt`

Clase **NC** · DO · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · generico |

### Paraguay ITT Championship `nc-py-itt`

Clase **NC** · PY · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · generico |

### Paraguay U23 ITT Championship `nc-py-u23-itt`

Clase **NC** · PY · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### North Macedonia ITT Championship `nc-mk-itt`

Clase **NC** · MK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 47 | 🔴 Inventado | `nc_crono` · generico |

### North Macedonia U23 ITT Championship `nc-mk-u23-itt`

Clase **NC** · MK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Hong Kong ITT Championship `nc-hk-itt`

Clase **NC** · HK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Hong Kong U23 ITT Championship `nc-hk-u23-itt`

Clase **NC** · HK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### Guam ITT Championship `nc-gu-itt`

Clase **NC** · GU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · generico |

### Guam U23 ITT Championship `nc-gu-u23-itt`

Clase **NC** · GU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Bahrain U23 ITT Championship `nc-bh-u23-itt`

Clase **NC** · BH · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · generico |

### Kosovo U23 ITT Championship `nc-xk-u23-itt`

Clase **NC** · XK · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · balcanes |

### Honduras ITT Championship `nc-hn-itt`

Clase **NC** · HN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Honduras U23 ITT Championship `nc-hn-u23-itt`

Clase **NC** · HN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Andorra U23 ITT Championship `nc-ad-u23-itt`

Clase **NC** · AD · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · pirineos |

### Albania ITT Championship `nc-al-itt`

Clase **NC** · AL · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · balcanes |

### Albania U23 ITT Championship `nc-al-u23-itt`

Clase **NC** · AL · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · balcanes |

### Bosnia and Herzegovina U23 ITT Championship `nc-ba-u23-itt`

Clase **NC** · BA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · balcanes |

### Burkina Faso ITT Championship `nc-bf-itt`

Clase **NC** · BF · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · africa_llana |

### Burkina Faso U23 ITT Championship `nc-bf-u23-itt`

Clase **NC** · BF · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · africa_llana |

### Benin ITT Championship `nc-bj-itt`

Clase **NC** · BJ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · africa_llana |

### Benin U23 ITT Championship `nc-bj-u23-itt`

Clase **NC** · BJ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · africa_llana |

### Cameroon ITT Championship `nc-cm-itt`

Clase **NC** · CM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · africa_llana |

### Cameroon U23 ITT Championship `nc-cm-u23-itt`

Clase **NC** · CM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · africa_llana |

### Cyprus U23 ITT Championship `nc-cy-u23-itt`

Clase **NC** · CY · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · anatolia |

### Mauritius ITT Championship `nc-mu-itt`

Clase **NC** · MU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · africa_llana |

### Mauritius U23 ITT Championship `nc-mu-u23-itt`

Clase **NC** · MU · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · africa_llana |

### Oman ITT Championship `nc-om-itt`

Clase **NC** · OM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · golfo |

### Oman U23 ITT Championship `nc-om-u23-itt`

Clase **NC** · OM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · golfo |

### Taiwan ITT Championship `nc-tw-itt`

Clase **NC** · TW · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Taiwan U23 ITT Championship `nc-tw-u23-itt`

Clase **NC** · TW · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `nc_crono` · asia_oriental |

### Antigua and Barbuda U23 ITT Championship `nc-ag-u23-itt`

Clase **NC** · AG · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Barbados U23 ITT Championship `nc-bb-u23-itt`

Clase **NC** · BB · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `nc_crono` · generico |

### Bermuda ITT Championship `nc-bm-itt`

Clase **NC** · BM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Bermuda U23 ITT Championship `nc-bm-u23-itt`

Clase **NC** · BM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Belize U23 ITT Championship `nc-bz-u23-itt`

Clase **NC** · BZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Ivory Coast ITT Championship `nc-ci-itt`

Clase **NC** · CI · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### Ivory Coast U23 ITT Championship `nc-ci-u23-itt`

Clase **NC** · CI · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · generico |

### Cape Verde ITT Championship `nc-cv-itt`

Clase **NC** · CV · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · generico |

### Cape Verde U23 ITT Championship `nc-cv-u23-itt`

Clase **NC** · CV · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### Dominica ITT Championship `nc-dm-itt`

Clase **NC** · DM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Dominica U23 ITT Championship `nc-dm-u23-itt`

Clase **NC** · DM · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### Guinea-Bissau ITT Championship `nc-gw-itt`

Clase **NC** · GW · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · generico |

### Guinea-Bissau U23 ITT Championship `nc-gw-u23-itt`

Clase **NC** · GW · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Jordan U23 ITT Championship `nc-jo-u23-itt`

Clase **NC** · JO · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `nc_crono` · generico |

### Cayman Islands ITT Championship `nc-ky-itt`

Clase **NC** · KY · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### Cayman Islands U23 ITT Championship `nc-ky-u23-itt`

Clase **NC** · KY · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · generico |

### Laos U23 ITT Championship `nc-la-u23-itt`

Clase **NC** · LA · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · generico |

### Lebanon ITT Championship `nc-lb-itt`

Clase **NC** · LB · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Lebanon U23 ITT Championship `nc-lb-u23-itt`

Clase **NC** · LB · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### Saint Lucia ITT Championship `nc-lc-itt`

Clase **NC** · LC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · generico |

### Saint Lucia U23 ITT Championship `nc-lc-u23-itt`

Clase **NC** · LC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · generico |

### Monaco ITT Championship `nc-mc-itt`

Clase **NC** · MC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Monaco U23 ITT Championship `nc-mc-u23-itt`

Clase **NC** · MC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Montenegro U23 ITT Championship `nc-me-u23-itt`

Clase **NC** · ME · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Mali U23 ITT Championship `nc-ml-u23-itt`

Clase **NC** · ML · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Malta ITT Championship `nc-mt-itt`

Clase **NC** · MT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 40 | 🔴 Inventado | `nc_crono` · generico |

### Malta U23 ITT Championship `nc-mt-u23-itt`

Clase **NC** · MT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 31 | 🔴 Inventado | `nc_crono` · generico |

### Puerto Rico ITT Championship `nc-pr-itt`

Clase **NC** · PR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 44 | 🔴 Inventado | `nc_crono` · generico |

### Puerto Rico U23 ITT Championship `nc-pr-u23-itt`

Clase **NC** · PR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 29 | 🔴 Inventado | `nc_crono` · generico |

### Seychelles ITT Championship `nc-sc-itt`

Clase **NC** · SC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 46 | 🔴 Inventado | `nc_crono` · generico |

### Seychelles U23 ITT Championship `nc-sc-u23-itt`

Clase **NC** · SC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · generico |

### Senegal ITT Championship `nc-sn-itt`

Clase **NC** · SN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 37 | 🔴 Inventado | `nc_crono` · generico |

### Senegal U23 ITT Championship `nc-sn-u23-itt`

Clase **NC** · SN · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `nc_crono` · generico |

### Suriname ITT Championship `nc-sr-itt`

Clase **NC** · SR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · generico |

### Suriname U23 ITT Championship `nc-sr-u23-itt`

Clase **NC** · SR · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 28 | 🔴 Inventado | `nc_crono` · generico |

### El Salvador U23 ITT Championship `nc-sv-u23-itt`

Clase **NC** · SV · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `nc_crono` · generico |

### Sint Maarten U23 ITT Championship `nc-sx-u23-itt`

Clase **NC** · SX · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 33 | 🔴 Inventado | `nc_crono` · generico |

### Eswatini ITT Championship `nc-sz-itt`

Clase **NC** · SZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 43 | 🔴 Inventado | `nc_crono` · generico |

### Eswatini U23 ITT Championship `nc-sz-u23-itt`

Clase **NC** · SZ · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 30 | 🔴 Inventado | `nc_crono` · generico |

### Trinidad and Tobago ITT Championship `nc-tt-itt`

Clase **NC** · TT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 47 | 🔴 Inventado | `nc_crono` · generico |

### Trinidad and Tobago U23 ITT Championship `nc-tt-u23-itt`

Clase **NC** · TT · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Saint Vincent and the Grenadines ITT Championship `nc-vc-itt`

Clase **NC** · VC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · generico |

### Saint Vincent and the Grenadines U23 ITT Championship `nc-vc-u23-itt`

Clase **NC** · VC · día 176 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Spain U23 Road Championship `nc-es-u23-road`

Clase **NC** · ES · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 149 | 🔴 Inventado | `nc_ruta` · cantabrico |

### France U23 Road Championship `nc-fr-u23-road`

Clase **NC** · FR · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · bretana |

### United Kingdom U23 Road Championship `nc-gb-u23-road`

Clase **NC** · GB · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 177 | 🔴 Inventado | `nc_ruta` · britanicas |

### Germany U23 Road Championship `nc-de-u23-road`

Clase **NC** · DE · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 172 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Portugal U23 Road Championship `nc-pt-u23-road`

Clase **NC** · PT · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 151 | 🔴 Inventado | `nc_ruta` · portugal |

### Norway U23 Road Championship `nc-no-u23-road`

Clase **NC** · NO · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 170 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Slovenia U23 Road Championship `nc-si-u23-road`

Clase **NC** · SI · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 175 | 🔴 Inventado | `nc_ruta` · alpes |

### Slovakia U23 Road Championship `nc-sk-u23-road`

Clase **NC** · SK · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 196 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### United States U23 Road Championship `nc-us-u23-road`

Clase **NC** · US · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 140 | 🔴 Inventado | `nc_ruta` · norteamerica |

### Switzerland U23 Road Championship `nc-ch-u23-road`

Clase **NC** · CH · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 141 | 🔴 Inventado | `nc_ruta` · alpes |

### Argentina U23 Road Championship `nc-ar-u23-road`

Clase **NC** · AR · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 142 | 🔴 Inventado | `nc_ruta` · cono_sur |

### Mexico U23 Road Championship `nc-mx-u23-road`

Clase **NC** · MX · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 176 | 🔴 Inventado | `nc_ruta` · generico |

### Poland U23 Road Championship `nc-pl-u23-road`

Clase **NC** · PL · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 153 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Austria U23 Road Championship `nc-at-u23-road`

Clase **NC** · AT · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 185 | 🔴 Inventado | `nc_ruta` · alpes |

### Czechia U23 Road Championship `nc-cz-u23-road`

Clase **NC** · CZ · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 164 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Japan U23 Road Championship `nc-jp-u23-road`

Clase **NC** · JP · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 173 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Ukraine U23 Road Championship `nc-ua-u23-road`

Clase **NC** · UA · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 184 | 🔴 Inventado | `nc_ruta` · generico |

### Latvia U23 Road Championship `nc-lv-u23-road`

Clase **NC** · LV · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 187 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Lithuania U23 Road Championship `nc-lt-u23-road`

Clase **NC** · LT · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 165 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Belarus U23 Road Championship `nc-by-u23-road`

Clase **NC** · BY · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 165 | 🔴 Inventado | `nc_ruta` · generico |

### Brazil U23 Road Championship `nc-br-u23-road`

Clase **NC** · BR · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 173 | 🔴 Inventado | `nc_ruta` · generico |

### Venezuela U23 Road Championship `nc-ve-u23-road`

Clase **NC** · VE · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 153 | 🔴 Inventado | `nc_ruta` · andes |

### Finland U23 Road Championship `nc-fi-u23-road`

Clase **NC** · FI · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 171 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Russia U23 Road Championship `nc-ru-u23-road`

Clase **NC** · RU · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 141 | 🔴 Inventado | `nc_ruta` · generico |

### Serbia U23 Road Championship `nc-rs-u23-road`

Clase **NC** · RS · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 157 | 🔴 Inventado | `nc_ruta` · balcanes |

### Bulgaria U23 Road Championship `nc-bg-u23-road`

Clase **NC** · BG · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 172 | 🔴 Inventado | `nc_ruta` · balcanes |

### Israel U23 Road Championship `nc-il-u23-road`

Clase **NC** · IL · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 145 | 🔴 Inventado | `nc_ruta` · generico |

### South Korea U23 Road Championship `nc-kr-u23-road`

Clase **NC** · KR · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 153 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Peru U23 Road Championship `nc-pe-u23-road`

Clase **NC** · PE · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 177 | 🔴 Inventado | `nc_ruta` · generico |

### Eritrea U23 Road Championship `nc-er-u23-road`

Clase **NC** · ER · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 161 | 🔴 Inventado | `nc_ruta` · generico |

### Iran ITT Championship `nc-ir-itt`

Clase **NC** · IR · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 41 | 🔴 Inventado | `nc_crono` · generico |

### Iran U23 ITT Championship `nc-ir-u23-itt`

Clase **NC** · IR · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 27 | 🔴 Inventado | `nc_crono` · generico |

### Guatemala U23 Road Championship `nc-gt-u23-road`

Clase **NC** · GT · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · andes |

### Georgia U23 Road Championship `nc-ge-u23-road`

Clase **NC** · GE · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 167 | 🔴 Inventado | `nc_ruta` · generico |

### Indonesia U23 Road Championship `nc-id-u23-road`

Clase **NC** · ID · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · generico |

### Nigeria U23 Road Championship `nc-ng-u23-road`

Clase **NC** · NG · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · generico |

### Kenya U23 Road Championship `nc-ke-u23-road`

Clase **NC** · KE · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 192 | 🔴 Inventado | `nc_ruta` · generico |

### Tunisia U23 Road Championship `nc-tn-u23-road`

Clase **NC** · TN · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · generico |

### Vietnam U23 Road Championship `nc-vn-u23-road`

Clase **NC** · VN · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 155 | 🔴 Inventado | `nc_ruta` · generico |

### Iceland U23 Road Championship `nc-is-u23-road`

Clase **NC** · IS · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 165 | 🔴 Inventado | `nc_ruta` · generico |

### Saudi Arabia U23 Road Championship `nc-sa-u23-road`

Clase **NC** · SA · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 146 | 🔴 Inventado | `nc_ruta` · golfo |

### Qatar U23 Road Championship `nc-qa-u23-road`

Clase **NC** · QA · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 149 | 🔴 Inventado | `nc_ruta` · golfo |

### Singapore U23 Road Championship `nc-sg-u23-road`

Clase **NC** · SG · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 176 | 🔴 Inventado | `nc_ruta` · generico |

### Dominican Republic U23 Road Championship `nc-do-u23-road`

Clase **NC** · DO · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 168 | 🔴 Inventado | `nc_ruta` · generico |

### Paraguay U23 Road Championship `nc-py-u23-road`

Clase **NC** · PY · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 154 | 🔴 Inventado | `nc_ruta` · generico |

### Hong Kong U23 Road Championship `nc-hk-u23-road`

Clase **NC** · HK · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 152 | 🔴 Inventado | `nc_ruta` · generico |

### Guam U23 Road Championship `nc-gu-u23-road`

Clase **NC** · GU · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 157 | 🔴 Inventado | `nc_ruta` · generico |

### Bahrain U23 Road Championship `nc-bh-u23-road`

Clase **NC** · BH · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 164 | 🔴 Inventado | `nc_ruta` · generico |

### Kosovo U23 Road Championship `nc-xk-u23-road`

Clase **NC** · XK · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 144 | 🔴 Inventado | `nc_ruta` · balcanes |

### Honduras U23 Road Championship `nc-hn-u23-road`

Clase **NC** · HN · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 141 | 🔴 Inventado | `nc_ruta` · generico |

### Andorra U23 Road Championship `nc-ad-u23-road`

Clase **NC** · AD · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 139 | 🔴 Inventado | `nc_ruta` · pirineos |

### Albania U23 Road Championship `nc-al-u23-road`

Clase **NC** · AL · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 156 | 🔴 Inventado | `nc_ruta` · balcanes |

### Bosnia and Herzegovina U23 Road Championship `nc-ba-u23-road`

Clase **NC** · BA · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 179 | 🔴 Inventado | `nc_ruta` · balcanes |

### Cyprus U23 Road Championship `nc-cy-u23-road`

Clase **NC** · CY · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 173 | 🔴 Inventado | `nc_ruta` · anatolia |

### Antigua and Barbuda U23 Road Championship `nc-ag-u23-road`

Clase **NC** · AG · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 161 | 🔴 Inventado | `nc_ruta` · generico |

### Barbados U23 Road Championship `nc-bb-u23-road`

Clase **NC** · BB · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 146 | 🔴 Inventado | `nc_ruta` · generico |

### Bermuda U23 Road Championship `nc-bm-u23-road`

Clase **NC** · BM · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 138 | 🔴 Inventado | `nc_ruta` · generico |

### Belize U23 Road Championship `nc-bz-u23-road`

Clase **NC** · BZ · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 155 | 🔴 Inventado | `nc_ruta` · generico |

### Ivory Coast U23 Road Championship `nc-ci-u23-road`

Clase **NC** · CI · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 167 | 🔴 Inventado | `nc_ruta` · generico |

### Jordan U23 Road Championship `nc-jo-u23-road`

Clase **NC** · JO · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 154 | 🔴 Inventado | `nc_ruta` · generico |

### Laos U23 Road Championship `nc-la-u23-road`

Clase **NC** · LA · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 166 | 🔴 Inventado | `nc_ruta` · generico |

### Saint Lucia U23 Road Championship `nc-lc-u23-road`

Clase **NC** · LC · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 163 | 🔴 Inventado | `nc_ruta` · generico |

### Monaco U23 Road Championship `nc-mc-u23-road`

Clase **NC** · MC · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 167 | 🔴 Inventado | `nc_ruta` · generico |

### Montenegro U23 Road Championship `nc-me-u23-road`

Clase **NC** · ME · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 172 | 🔴 Inventado | `nc_ruta` · generico |

### Mali U23 Road Championship `nc-ml-u23-road`

Clase **NC** · ML · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 173 | 🔴 Inventado | `nc_ruta` · generico |

### Malta U23 Road Championship `nc-mt-u23-road`

Clase **NC** · MT · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · generico |

### Senegal U23 Road Championship `nc-sn-u23-road`

Clase **NC** · SN · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 177 | 🔴 Inventado | `nc_ruta` · generico |

### El Salvador U23 Road Championship `nc-sv-u23-road`

Clase **NC** · SV · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 149 | 🔴 Inventado | `nc_ruta` · generico |

### Sint Maarten U23 Road Championship `nc-sx-u23-road`

Clase **NC** · SX · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 139 | 🔴 Inventado | `nc_ruta` · generico |

### Eswatini U23 Road Championship `nc-sz-u23-road`

Clase **NC** · SZ · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 150 | 🔴 Inventado | `nc_ruta` · generico |

### Saint Vincent and the Grenadines U23 Road Championship `nc-vc-u23-road`

Clase **NC** · VC · día 178 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 134 | 🔴 Inventado | `nc_ruta` · generico |

### Spain Road Championship `nc-es-road`

Clase **NC** · ES · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 183 | 🔴 Inventado | `nc_ruta` · cantabrico |

### France Road Championship `nc-fr-road`

Clase **NC** · FR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 213 | 🔴 Inventado | `nc_ruta` · bretana |

### Italy U23 Road Championship `nc-it-u23-road`

Clase **NC** · IT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 146 | 🔴 Inventado | `nc_ruta` · italia_norte |

### Italy Road Championship `nc-it-road`

Clase **NC** · IT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 170 | 🔴 Inventado | `nc_ruta` · italia_norte |

### Belgium U23 Road Championship `nc-be-u23-road`

Clase **NC** · BE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 154 | 🔴 Inventado | `nc_ruta` · flandes |

### Belgium Road Championship `nc-be-road`

Clase **NC** · BE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 191 | 🔴 Inventado | `nc_ruta` · flandes |

### Netherlands U23 Road Championship `nc-nl-u23-road`

Clase **NC** · NL · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 173 | 🔴 Inventado | `nc_ruta` · flandes |

### Netherlands Road Championship `nc-nl-road`

Clase **NC** · NL · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 210 | 🔴 Inventado | `nc_ruta` · flandes |

### United Kingdom Road Championship `nc-gb-road`

Clase **NC** · GB · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 223 | 🔴 Inventado | `nc_ruta` · britanicas |

### Germany Road Championship `nc-de-road`

Clase **NC** · DE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 217 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Portugal Road Championship `nc-pt-road`

Clase **NC** · PT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 234 | 🔴 Inventado | `nc_ruta` · portugal |

### Denmark U23 Road Championship `nc-dk-u23-road`

Clase **NC** · DK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 142 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Denmark Road Championship `nc-dk-road`

Clase **NC** · DK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 233 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Norway Road Championship `nc-no-road`

Clase **NC** · NO · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 184 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Slovenia Road Championship `nc-si-road`

Clase **NC** · SI · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 197 | 🔴 Inventado | `nc_ruta` · alpes |

### Slovakia Road Championship `nc-sk-road`

Clase **NC** · SK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 197 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### United States Road Championship `nc-us-road`

Clase **NC** · US · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 189 | 🔴 Inventado | `nc_ruta` · norteamerica |

### Switzerland Road Championship `nc-ch-road`

Clase **NC** · CH · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 200 | 🔴 Inventado | `nc_ruta` · alpes |

### Argentina Road Championship `nc-ar-road`

Clase **NC** · AR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 209 | 🔴 Inventado | `nc_ruta` · cono_sur |

### Mexico Road Championship `nc-mx-road`

Clase **NC** · MX · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 234 | 🔴 Inventado | `nc_ruta` · generico |

### Poland Road Championship `nc-pl-road`

Clase **NC** · PL · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 168 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Austria Road Championship `nc-at-road`

Clase **NC** · AT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 227 | 🔴 Inventado | `nc_ruta` · alpes |

### Ireland U23 Road Championship `nc-ie-u23-road`

Clase **NC** · IE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 167 | 🔴 Inventado | `nc_ruta` · britanicas |

### Ireland Road Championship `nc-ie-road`

Clase **NC** · IE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 212 | 🔴 Inventado | `nc_ruta` · britanicas |

### Czechia Road Championship `nc-cz-road`

Clase **NC** · CZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 208 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Canada U23 Road Championship `nc-ca-u23-road`

Clase **NC** · CA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 149 | 🔴 Inventado | `nc_ruta` · norteamerica |

### Canada Road Championship `nc-ca-road`

Clase **NC** · CA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 236 | 🔴 Inventado | `nc_ruta` · norteamerica |

### Sweden U23 Road Championship `nc-se-u23-road`

Clase **NC** · SE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 147 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Sweden Road Championship `nc-se-road`

Clase **NC** · SE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 169 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Japan Road Championship `nc-jp-road`

Clase **NC** · JP · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 231 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Kazakhstan U23 Road Championship `nc-kz-u23-road`

Clase **NC** · KZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 155 | 🔴 Inventado | `nc_ruta` · generico |

### Kazakhstan Road Championship `nc-kz-road`

Clase **NC** · KZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 231 | 🔴 Inventado | `nc_ruta` · generico |

### Ukraine Road Championship `nc-ua-road`

Clase **NC** · UA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 247 | 🔴 Inventado | `nc_ruta` · generico |

### Estonia U23 Road Championship `nc-ee-u23-road`

Clase **NC** · EE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 149 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Estonia Road Championship `nc-ee-road`

Clase **NC** · EE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 255 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Latvia Road Championship `nc-lv-road`

Clase **NC** · LV · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 260 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Lithuania Road Championship `nc-lt-road`

Clase **NC** · LT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 227 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Belarus Road Championship `nc-by-road`

Clase **NC** · BY · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 203 | 🔴 Inventado | `nc_ruta` · generico |

### Brazil Road Championship `nc-br-road`

Clase **NC** · BR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 185 | 🔴 Inventado | `nc_ruta` · generico |

### Venezuela Road Championship `nc-ve-road`

Clase **NC** · VE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 187 | 🔴 Inventado | `nc_ruta` · andes |

### Finland Road Championship `nc-fi-road`

Clase **NC** · FI · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 247 | 🔴 Inventado | `nc_ruta` · escandinavia |

### Croatia U23 Road Championship `nc-hr-u23-road`

Clase **NC** · HR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · balcanes |

### Croatia Road Championship `nc-hr-road`

Clase **NC** · HR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · balcanes |

### Hungary U23 Road Championship `nc-hu-u23-road`

Clase **NC** · HU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Hungary Road Championship `nc-hu-road`

Clase **NC** · HU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 204 | 🔴 Inventado | `nc_ruta` · centroeuropa |

### Romania U23 Road Championship `nc-ro-u23-road`

Clase **NC** · RO · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 163 | 🔴 Inventado | `nc_ruta` · balcanes |

### Romania Road Championship `nc-ro-road`

Clase **NC** · RO · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 243 | 🔴 Inventado | `nc_ruta` · balcanes |

### Russia Road Championship `nc-ru-road`

Clase **NC** · RU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 196 | 🔴 Inventado | `nc_ruta` · generico |

### Serbia Road Championship `nc-rs-road`

Clase **NC** · RS · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 186 | 🔴 Inventado | `nc_ruta` · balcanes |

### Bulgaria Road Championship `nc-bg-road`

Clase **NC** · BG · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 211 | 🔴 Inventado | `nc_ruta` · balcanes |

### Greece U23 Road Championship `nc-gr-u23-road`

Clase **NC** · GR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 164 | 🔴 Inventado | `nc_ruta` · balcanes |

### Greece Road Championship `nc-gr-road`

Clase **NC** · GR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 196 | 🔴 Inventado | `nc_ruta` · balcanes |

### Turkey U23 Road Championship `nc-tr-u23-road`

Clase **NC** · TR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 177 | 🔴 Inventado | `nc_ruta` · anatolia |

### Turkey Road Championship `nc-tr-road`

Clase **NC** · TR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 202 | 🔴 Inventado | `nc_ruta` · anatolia |

### Israel Road Championship `nc-il-road`

Clase **NC** · IL · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 233 | 🔴 Inventado | `nc_ruta` · generico |

### South Korea Road Championship `nc-kr-road`

Clase **NC** · KR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 222 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### China U23 Road Championship `nc-cn-u23-road`

Clase **NC** · CN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 166 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### China Road Championship `nc-cn-road`

Clase **NC** · CN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 196 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Peru Road Championship `nc-pe-road`

Clase **NC** · PE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 246 | 🔴 Inventado | `nc_ruta` · generico |

### Morocco U23 Road Championship `nc-ma-u23-road`

Clase **NC** · MA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 170 | 🔴 Inventado | `nc_ruta` · montana_sur |

### Morocco Road Championship `nc-ma-road`

Clase **NC** · MA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 181 | 🔴 Inventado | `nc_ruta` · montana_sur |

### Eritrea Road Championship `nc-er-road`

Clase **NC** · ER · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 259 | 🔴 Inventado | `nc_ruta` · generico |

### Luxembourg U23 Road Championship `nc-lu-u23-road`

Clase **NC** · LU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 160 | 🔴 Inventado | `nc_ruta` · ardenas |

### Luxembourg Road Championship `nc-lu-road`

Clase **NC** · LU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 171 | 🔴 Inventado | `nc_ruta` · ardenas |

### Rwanda U23 Road Championship `nc-rw-u23-road`

Clase **NC** · RW · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 158 | 🔴 Inventado | `nc_ruta` · montana_sur |

### Rwanda Road Championship `nc-rw-road`

Clase **NC** · RW · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 189 | 🔴 Inventado | `nc_ruta` · montana_sur |

### Algeria U23 Road Championship `nc-dz-u23-road`

Clase **NC** · DZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 167 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Algeria Road Championship `nc-dz-road`

Clase **NC** · DZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 207 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Guatemala Road Championship `nc-gt-road`

Clase **NC** · GT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 216 | 🔴 Inventado | `nc_ruta` · andes |

### Georgia Road Championship `nc-ge-road`

Clase **NC** · GE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 254 | 🔴 Inventado | `nc_ruta` · generico |

### India U23 Road Championship `nc-in-u23-road`

Clase **NC** · IN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### India Road Championship `nc-in-road`

Clase **NC** · IN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 219 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Ethiopia U23 Road Championship `nc-et-u23-road`

Clase **NC** · ET · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 157 | 🔴 Inventado | `nc_ruta` · generico |

### Ethiopia Road Championship `nc-et-road`

Clase **NC** · ET · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 204 | 🔴 Inventado | `nc_ruta` · generico |

### Indonesia Road Championship `nc-id-road`

Clase **NC** · ID · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 240 | 🔴 Inventado | `nc_ruta` · generico |

### Cuba U23 Road Championship `nc-cu-u23-road`

Clase **NC** · CU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 150 | 🔴 Inventado | `nc_ruta` · generico |

### Cuba Road Championship `nc-cu-road`

Clase **NC** · CU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 248 | 🔴 Inventado | `nc_ruta` · generico |

### Moldova U23 Road Championship `nc-md-u23-road`

Clase **NC** · MD · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 186 | 🔴 Inventado | `nc_ruta` · generico |

### Moldova Road Championship `nc-md-road`

Clase **NC** · MD · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 236 | 🔴 Inventado | `nc_ruta` · generico |

### Nigeria Road Championship `nc-ng-road`

Clase **NC** · NG · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 220 | 🔴 Inventado | `nc_ruta` · generico |

### Kenya Road Championship `nc-ke-road`

Clase **NC** · KE · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 196 | 🔴 Inventado | `nc_ruta` · generico |

### Tunisia Road Championship `nc-tn-road`

Clase **NC** · TN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 253 | 🔴 Inventado | `nc_ruta` · generico |

### Vietnam Road Championship `nc-vn-road`

Clase **NC** · VN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 232 | 🔴 Inventado | `nc_ruta` · generico |

### Armenia U23 Road Championship `nc-am-u23-road`

Clase **NC** · AM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 166 | 🔴 Inventado | `nc_ruta` · generico |

### Armenia Road Championship `nc-am-road`

Clase **NC** · AM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 236 | 🔴 Inventado | `nc_ruta` · generico |

### Iceland Road Championship `nc-is-road`

Clase **NC** · IS · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 201 | 🔴 Inventado | `nc_ruta` · generico |

### Azerbaijan U23 Road Championship `nc-az-u23-road`

Clase **NC** · AZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · anatolia |

### Azerbaijan Road Championship `nc-az-road`

Clase **NC** · AZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 217 | 🔴 Inventado | `nc_ruta` · anatolia |

### Uzbekistan U23 Road Championship `nc-uz-u23-road`

Clase **NC** · UZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 190 | 🔴 Inventado | `nc_ruta` · generico |

### Uzbekistan Road Championship `nc-uz-road`

Clase **NC** · UZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 222 | 🔴 Inventado | `nc_ruta` · generico |

### Saudi Arabia Road Championship `nc-sa-road`

Clase **NC** · SA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 239 | 🔴 Inventado | `nc_ruta` · golfo |

### Qatar Road Championship `nc-qa-road`

Clase **NC** · QA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 232 | 🔴 Inventado | `nc_ruta` · golfo |

### Singapore Road Championship `nc-sg-road`

Clase **NC** · SG · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 230 | 🔴 Inventado | `nc_ruta` · generico |

### Dominican Republic Road Championship `nc-do-road`

Clase **NC** · DO · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 194 | 🔴 Inventado | `nc_ruta` · generico |

### Paraguay Road Championship `nc-py-road`

Clase **NC** · PY · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 194 | 🔴 Inventado | `nc_ruta` · generico |

### North Macedonia U23 Road Championship `nc-mk-u23-road`

Clase **NC** · MK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · generico |

### North Macedonia Road Championship `nc-mk-road`

Clase **NC** · MK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 225 | 🔴 Inventado | `nc_ruta` · generico |

### Hong Kong Road Championship `nc-hk-road`

Clase **NC** · HK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 192 | 🔴 Inventado | `nc_ruta` · generico |

### Guam Road Championship `nc-gu-road`

Clase **NC** · GU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 183 | 🔴 Inventado | `nc_ruta` · generico |

### Bahrain Road Championship `nc-bh-road`

Clase **NC** · BH · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 190 | 🔴 Inventado | `nc_ruta` · generico |

### Kosovo Road Championship `nc-xk-road`

Clase **NC** · XK · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 189 | 🔴 Inventado | `nc_ruta` · balcanes |

### Honduras Road Championship `nc-hn-road`

Clase **NC** · HN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 217 | 🔴 Inventado | `nc_ruta` · generico |

### Andorra Road Championship `nc-ad-road`

Clase **NC** · AD · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 184 | 🔴 Inventado | `nc_ruta` · pirineos |

### Albania Road Championship `nc-al-road`

Clase **NC** · AL · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 246 | 🔴 Inventado | `nc_ruta` · balcanes |

### Bosnia and Herzegovina Road Championship `nc-ba-road`

Clase **NC** · BA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 215 | 🔴 Inventado | `nc_ruta` · balcanes |

### Burkina Faso U23 Road Championship `nc-bf-u23-road`

Clase **NC** · BF · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 169 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Burkina Faso Road Championship `nc-bf-road`

Clase **NC** · BF · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 255 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Benin U23 Road Championship `nc-bj-u23-road`

Clase **NC** · BJ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 178 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Benin Road Championship `nc-bj-road`

Clase **NC** · BJ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 198 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Cameroon U23 Road Championship `nc-cm-u23-road`

Clase **NC** · CM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 154 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Cameroon Road Championship `nc-cm-road`

Clase **NC** · CM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 193 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Cyprus Road Championship `nc-cy-road`

Clase **NC** · CY · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 214 | 🔴 Inventado | `nc_ruta` · anatolia |

### Mauritius U23 Road Championship `nc-mu-u23-road`

Clase **NC** · MU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 139 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Mauritius Road Championship `nc-mu-road`

Clase **NC** · MU · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 237 | 🔴 Inventado | `nc_ruta` · africa_llana |

### Oman U23 Road Championship `nc-om-u23-road`

Clase **NC** · OM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 174 | 🔴 Inventado | `nc_ruta` · golfo |

### Oman Road Championship `nc-om-road`

Clase **NC** · OM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 217 | 🔴 Inventado | `nc_ruta` · golfo |

### Taiwan U23 Road Championship `nc-tw-u23-road`

Clase **NC** · TW · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 157 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Taiwan Road Championship `nc-tw-road`

Clase **NC** · TW · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 209 | 🔴 Inventado | `nc_ruta` · asia_oriental |

### Antigua and Barbuda Road Championship `nc-ag-road`

Clase **NC** · AG · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 188 | 🔴 Inventado | `nc_ruta` · generico |

### Barbados Road Championship `nc-bb-road`

Clase **NC** · BB · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 214 | 🔴 Inventado | `nc_ruta` · generico |

### Bermuda Road Championship `nc-bm-road`

Clase **NC** · BM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 205 | 🔴 Inventado | `nc_ruta` · generico |

### Belize Road Championship `nc-bz-road`

Clase **NC** · BZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 227 | 🔴 Inventado | `nc_ruta` · generico |

### Ivory Coast Road Championship `nc-ci-road`

Clase **NC** · CI · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 181 | 🔴 Inventado | `nc_ruta` · generico |

### Cape Verde U23 Road Championship `nc-cv-u23-road`

Clase **NC** · CV · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 159 | 🔴 Inventado | `nc_ruta` · generico |

### Cape Verde Road Championship `nc-cv-road`

Clase **NC** · CV · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 206 | 🔴 Inventado | `nc_ruta` · generico |

### Dominica U23 Road Championship `nc-dm-u23-road`

Clase **NC** · DM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 148 | 🔴 Inventado | `nc_ruta` · generico |

### Dominica Road Championship `nc-dm-road`

Clase **NC** · DM · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 219 | 🔴 Inventado | `nc_ruta` · generico |

### Guinea-Bissau U23 Road Championship `nc-gw-u23-road`

Clase **NC** · GW · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 189 | 🔴 Inventado | `nc_ruta` · generico |

### Guinea-Bissau Road Championship `nc-gw-road`

Clase **NC** · GW · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 226 | 🔴 Inventado | `nc_ruta` · generico |

### Jordan Road Championship `nc-jo-road`

Clase **NC** · JO · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 226 | 🔴 Inventado | `nc_ruta` · generico |

### Cayman Islands U23 Road Championship `nc-ky-u23-road`

Clase **NC** · KY · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 158 | 🔴 Inventado | `nc_ruta` · generico |

### Cayman Islands Road Championship `nc-ky-road`

Clase **NC** · KY · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 208 | 🔴 Inventado | `nc_ruta` · generico |

### Laos Road Championship `nc-la-road`

Clase **NC** · LA · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 217 | 🔴 Inventado | `nc_ruta` · generico |

### Lebanon U23 Road Championship `nc-lb-u23-road`

Clase **NC** · LB · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 193 | 🔴 Inventado | `nc_ruta` · generico |

### Lebanon Road Championship `nc-lb-road`

Clase **NC** · LB · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 193 | 🔴 Inventado | `nc_ruta` · generico |

### Saint Lucia Road Championship `nc-lc-road`

Clase **NC** · LC · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 190 | 🔴 Inventado | `nc_ruta` · generico |

### Monaco Road Championship `nc-mc-road`

Clase **NC** · MC · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 175 | 🔴 Inventado | `nc_ruta` · generico |

### Montenegro Road Championship `nc-me-road`

Clase **NC** · ME · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 233 | 🔴 Inventado | `nc_ruta` · generico |

### Mali Road Championship `nc-ml-road`

Clase **NC** · ML · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 202 | 🔴 Inventado | `nc_ruta` · generico |

### Malta Road Championship `nc-mt-road`

Clase **NC** · MT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 191 | 🔴 Inventado | `nc_ruta` · generico |

### Puerto Rico U23 Road Championship `nc-pr-u23-road`

Clase **NC** · PR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 190 | 🔴 Inventado | `nc_ruta` · generico |

### Puerto Rico Road Championship `nc-pr-road`

Clase **NC** · PR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 234 | 🔴 Inventado | `nc_ruta` · generico |

### Seychelles U23 Road Championship `nc-sc-u23-road`

Clase **NC** · SC · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 171 | 🔴 Inventado | `nc_ruta` · generico |

### Seychelles Road Championship `nc-sc-road`

Clase **NC** · SC · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 202 | 🔴 Inventado | `nc_ruta` · generico |

### Senegal Road Championship `nc-sn-road`

Clase **NC** · SN · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 249 | 🔴 Inventado | `nc_ruta` · generico |

### Suriname U23 Road Championship `nc-sr-u23-road`

Clase **NC** · SR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 155 | 🔴 Inventado | `nc_ruta` · generico |

### Suriname Road Championship `nc-sr-road`

Clase **NC** · SR · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 205 | 🔴 Inventado | `nc_ruta` · generico |

### El Salvador Road Championship `nc-sv-road`

Clase **NC** · SV · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 206 | 🔴 Inventado | `nc_ruta` · generico |

### Sint Maarten Road Championship `nc-sx-road`

Clase **NC** · SX · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 215 | 🔴 Inventado | `nc_ruta` · generico |

### Eswatini Road Championship `nc-sz-road`

Clase **NC** · SZ · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 171 | 🔴 Inventado | `nc_ruta` · generico |

### Trinidad and Tobago U23 Road Championship `nc-tt-u23-road`

Clase **NC** · TT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 168 | 🔴 Inventado | `nc_ruta` · generico |

### Trinidad and Tobago Road Championship `nc-tt-road`

Clase **NC** · TT · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 241 | 🔴 Inventado | `nc_ruta` · generico |

### Saint Vincent and the Grenadines Road Championship `nc-vc-road`

Clase **NC** · VC · día 179 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 228 | 🔴 Inventado | `nc_ruta` · generico |

### Iran U23 Road Championship `nc-ir-u23-road`

Clase **NC** · IR · día 181 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 160 | 🔴 Inventado | `nc_ruta` · generico |

### Iran Road Championship `nc-ir-road`

Clase **NC** · IR · día 181 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 241 | 🔴 Inventado | `nc_ruta` · generico |

### Race Lyon `race-lyon`

Clase **1** · FR · día 182 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 158 | 🔴 Inventado | `et_llana` · macizo_central |
| 2 | Montaña · Summit finish | — | — | 167 | 🔴 Inventado | `et_reina_cima_cerca` · alpes |
| 3 | Media montaña · Uphill finish | — | — | 113 | 🔴 Inventado | `et_media_alto` · alpes |

### Race Solidarnosc `race-solidarnosc`

Clase **2** · PL · día 182 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 118 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Media montaña · Hills | — | — | 107 | 🔴 Inventado | `et_media_valle` · centroeuropa |
| 3 | Montaña · Summit finish | — | — | 124 | 🔴 Inventado | `et_reina_alto_corto` · centroeuropa |
| 4 | Media montaña · Hills | — | — | 90 | 🔴 Inventado | `et_media_valle` · centroeuropa |

### Mongolia ITT Championship `nc-mn-itt`

Clase **NC** · MN · día 182 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### Mongolia U23 ITT Championship `nc-mn-u23-itt`

Clase **NC** · MN · día 182 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 36 | 🔴 Inventado | `nc_crono` · generico |

### Jamaica ITT Championship `nc-jm-itt`

Clase **NC** · JM · día 183 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 42 | 🔴 Inventado | `nc_crono` · generico |

### Jamaica U23 ITT Championship `nc-jm-u23-itt`

Clase **NC** · JM · día 183 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 34 | 🔴 Inventado | `nc_crono` · generico |

### Race France `race-france`

Clase **WT** · FR · día 185 · 21 etapas · recorrido mixto · ✅ Real 20 · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Barcelona | Barcelona | 20 | ✅ Real | — |
| 2 | Media montaña · Hills | Tarragona | Barcelona | 169 | ✅ Real | — |
| 3 | Media montaña · Hills | Granollers | Les Angles | 196 | ✅ Real | — |
| 4 | Media montaña · Hills | Carcassonne | Foix | 182 | ✅ Real | — |
| 5 | Llana · Flat | Lannemezan | Pau | 158 | ✅ Real | — |
| 6 | Montaña · Summit finish | Pau | Gavarnie-Gedre | 186 | ✅ Real | — |
| 7 | Llana · Flat | Hagetmau | Bordeaux | 175 | ✅ Real | — |
| 8 | Llana · Flat | Perigueux | Bergerac | 180 | ✅ Real | — |
| 9 | Media montaña · Hills | Malemort | Ussel | 185 | ✅ Real | — |
| 10 | Montaña · Summit finish | Aurillac | Le Lioran | 167 | ✅ Real | — |
| 11 | Llana · Flat | Vichy | Nevers | 161 | ✅ Real | — |
| 12 | Llana · Flat | Magny-Cours | Chalon-sur-Saone | 179 | ✅ Real | — |
| 13 | Media montaña · Hills | Dole | Belfort | 206 | ✅ Real | — |
| 14 | Montaña · Summit finish | Mulhouse | Le Markstein | 155 | ✅ Real | — |
| 15 | Montaña · Summit finish | Champagnole | Plateau de Solaison | 184 | ✅ Real | — |
| 16 | Contrarreloj · ITT | Evian-les-Bains | Thonon-les-Bains | 26 | ✅ Real | — |
| 17 | Media montaña · Hills | Chambery | Voiron | 175 | ✅ Real | — |
| 18 | Montaña · Summit finish | Voiron | Orcieres-Merlette | 185 | ✅ Real | — |
| 19 | Montaña · Summit finish | Gap | Alpe d'Huez | 128 | ✅ Real | — |
| 20 | Montaña · Summit finish | Le Bourg-d'Oisans | Alpe d'Huez | 171 | ✅ Real | — |
| 21 | Llana · Flat | Thoiry | Paris | 130 | 🟡 Sin validar | `et_llana` · francia_norte |

### Race Sibiu `race-sibiu`

Clase **1** · RO · día 185 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 153 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Hills | — | — | 164 | 🔴 Inventado | `et_media_valle` · balcanes |
| 3 | Media montaña · Hills | — | — | 141 | 🔴 Inventado | `et_media_valle` · balcanes |
| 4 | Montaña · Summit finish | — | — | 124 | 🔴 Inventado | `et_reina_blanda` · balcanes |

### Jamaica U23 Road Championship `nc-jm-u23-road`

Clase **NC** · JM · día 185 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 143 | 🔴 Inventado | `nc_ruta` · generico |

### Mongolia U23 Road Championship `nc-mn-u23-road`

Clase **NC** · MN · día 185 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 153 | 🔴 Inventado | `nc_ruta` · generico |

### Mongolia Road Championship `nc-mn-road`

Clase **NC** · MN · día 185 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 218 | 🔴 Inventado | `nc_ruta` · generico |

### Jamaica Road Championship `nc-jm-road`

Clase **NC** · JM · día 186 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 227 | 🔴 Inventado | `nc_ruta` · generico |

### Race Austria `race-austria`

Clase **1** · AT · día 189 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 140 | 🔴 Inventado | `et_llana` · alpes |
| 2 | Media montaña · Hills | — | — | 166 | 🔴 Inventado | `et_media_valle` · centroeuropa |
| 3 | Media montaña · Uphill finish | — | — | 157 | 🔴 Inventado | `et_media_alto` · centroeuropa |
| 4 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · centroeuropa |
| 5 | Montaña · Summit finish | — | — | 120 | 🔴 Inventado | `et_reina_alto_corto` · centroeuropa |

### Race Torres Vedras `race-torres-vedras`

Clase **2** · PT · día 191 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 122 | 🔴 Inventado | `et_llana` · portugal |
| 2 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · portugal |
| 3 | Media montaña · Uphill finish | — | — | 120 | 🔴 Inventado | `et_media_alto` · portugal |

### Race Qinghai `race-qinghai`

Clase **Pro** · CN · día 192 · 8 etapas · recorrido mixto · 🟡 Sin validar 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Xining | Xining | 121 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 2 | Media montaña · Wall finish | Duoba | Huzhu | 151 | 🟡 Sin validar | `et_media_muro` · asia_oriental |
| 3 | Media montaña · Hills | Huzhu | Menyuan | 220 | 🟡 Sin validar | `et_media_valle` · asia_oriental |
| 4 | Montaña · Summit finish | Menyuan | Qilian | 173 | 🟡 Sin validar | `et_reina_alto_corto` · asia_oriental |
| 5 | Media montaña · Wall finish | Qilian | Gangcha | 169 | 🟡 Sin validar | `et_media_muro` · asia_oriental |
| 6 | Media montaña · Wall finish | Gangcha | Gonghe | 233 | 🟡 Sin validar | `et_media_muro` · asia_oriental |
| 7 | Media montaña · Uphill finish | Gonghe | Haiyan | 137 | 🟡 Sin validar | `et_media_alto` · asia_oriental |
| 8 | Media montaña · Uphill finish | Xihaizhen | Xihaizhen | 121 | 🟡 Sin validar | `et_media_alto` · asia_oriental |

### Race Venezuela `race-venezuela`

Clase **2** · VE · día 193 · 8 etapas · recorrido generado · 🔴 Inventado 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 114 | 🔴 Inventado | `et_llana` · andes |
| 2 | Media montaña · Hills | — | — | 154 | 🔴 Inventado | `et_media_tendida` · andes |
| 3 | Media montaña · Hills | — | — | 135 | 🔴 Inventado | `et_media_valle` · andes |
| 4 | Media montaña · Uphill finish | — | — | 118 | 🔴 Inventado | `et_media_alto` · andes |
| 5 | Media montaña · Hills | — | — | 116 | 🔴 Inventado | `et_media_valle` · andes |
| 6 | Contrarreloj · ITT | — | — | 21 | 🔴 Inventado | `et_crono` · andes |
| 7 | Montaña · Summit finish | — | — | 138 | 🔴 Inventado | `et_reina_alto_largo` · andes |
| 8 | Montaña · Summit finish | — | — | 137 | 🔴 Inventado | `et_reina_alto_largo` · andes |

### Race Ordizia `race-ordizia`

Clase **1** · ES · día 206 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 190 | 🔴 Inventado | `ud_circuito` · cantabrico |

### Race Castilla y León `race-castilla-leon`

Clase **1** · ES · día 207 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 175 | 🔴 Inventado | `ud_montana_media` · meseta |

### Race Ain `race-ain`

Clase **1** · FR · día 209 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 171 | 🔴 Inventado | `et_llana` · macizo_central |
| 2 | Contrarreloj · Hill climb | — | — | 14 | 🔴 Inventado | `et_cronoescalada` · alpes |
| 3 | Montaña · Summit finish | — | — | 133 | 🔴 Inventado | `et_reina_blanda` · alpes |

### Race Denmark `race-denmark`

Clase **Pro** · DK · día 210 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Nexo | Ronne | 178 | 🟡 Sin validar | `et_media_tendida` · escandinavia |
| 2 | Llana · Flat | Rodovre | Gladsaxe | 111 | 🟡 Sin validar | `et_llana` · escandinavia |
| 3 | Contrarreloj · ITT | Kerteminde | Kerteminde | 14 | 🟡 Sin validar | `et_crono` · escandinavia |
| 4 | Media montaña · Wall finish | Svendborg | Vejle | 227 | 🟡 Sin validar | `et_media_muro` · escandinavia |
| 5 | Media montaña · Uphill finish | Hobro | Silkeborg | 157 | 🟡 Sin validar | `et_media_alto` · escandinavia |

### Race Alsace `race-alsace`

Clase **2** · FR · día 210 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 125 | 🔴 Inventado | `et_llana` · macizo_central |
| 2 | Media montaña · Hills | — | — | 109 | 🔴 Inventado | `et_media_valle` · macizo_central |
| 3 | Montaña · Summit finish | — | — | 133 | 🔴 Inventado | `et_reina_alto_largo` · alpes |
| 4 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · provenza |
| 5 | Media montaña · Hills | — | — | 106 | 🔴 Inventado | `et_media_valle` · pirineos |

### Race Kreiz Breizh `race-kreiz-breizh`

Clase **2** · FR · día 212 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 120 | 🔴 Inventado | `et_llana` · bretana |
| 2 | Media montaña · Wall finish | — | — | 112 | 🔴 Inventado | `et_media_muro` · bretana |
| 3 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · bretana |
| 4 | Media montaña · Wall finish | — | — | 111 | 🔴 Inventado | `et_media_muro` · francia_norte |

### Race San Sebastián `race-san-sebastian`

Clase **WT** · ES · día 213 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 221 | ✅ Real | — |

### Race Getxo `race-getxo`

Clase **1** · ES · día 214 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 190 | 🔴 Inventado | `ud_repecho` · cantabrico |

### Race Poland `race-poland`

Clase **WT** · PL · día 215 · 7 etapas · recorrido mixto · 🟡 Sin validar 7

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | Gdynia | Koszalin | 234 | 🟡 Sin validar | `et_media_alto` · centroeuropa |
| 2 | Llana · Flat | Miedzyzdroje | Szczecin | 151 | 🟡 Sin validar | `et_llana` · centroeuropa |
| 3 | Media montaña · Uphill finish | Gorzow Wielkopolski | Zielona Gora | 194 | 🟡 Sin validar | `et_media_alto` · centroeuropa |
| 4 | Montaña · Summit finish | Zagan | Karpacz | 176 | 🟡 Sin validar | `et_reina_cima_cerca` · centroeuropa |
| 5 | Montaña · Summit finish | Opole | Kocierz Resort | 219 | 🟡 Sin validar | `et_reina_cima_cerca` · centroeuropa |
| 6 | Montaña · Mountains | Bukovina Resort | Bukowina Tatrzanska | 126 | 🟡 Sin validar | `et_reina_valle` · centroeuropa |
| 7 | Contrarreloj · ITT | Wieliczka | Wieliczka | 12 | 🟡 Sin validar | `et_crono` · centroeuropa |

### Race Burgos `race-burgos`

Clase **Pro** · ES · día 216 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | Gumiel de Izan | Burgos | 165 | 🟡 Sin validar | `et_media_alto` · meseta |
| 2 | Montaña · Summit finish | Arcos de la Llana | Pineda de la Sierra | 178 | 🟡 Sin validar | `et_reina_blanda` · cantabrico |
| 3 | Montaña · Summit finish | Merindad de Montija | Corconte | 184 | 🟡 Sin validar | `et_reina_alto_largo` · cantabrico |
| 4 | Llana · Flat | Palazuelos de Muno | Briviesca | 178 | 🟡 Sin validar | `et_llana` · meseta |
| 5 | Montaña · Summit finish | Caleruega | Lagunas de Neila | 137 | 🟡 Sin validar | `et_reina_cima_cerca` · cantabrico |

### Race Maraş `race-maras`

Clase **2** · TR · día 216 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 144 | 🔴 Inventado | `et_llana` · anatolia |
| 2 | Contrarreloj · ITT | — | — | 21 | 🔴 Inventado | `et_crono` · anatolia |
| 3 | Media montaña · Hills | — | — | 128 | 🔴 Inventado | `et_media_valle` · anatolia |
| 4 | Media montaña · Uphill finish | — | — | 98 | 🔴 Inventado | `et_media_alto` · anatolia |

### Race Portugal `race-portugal`

Clase **1** · PT · día 217 · 11 etapas · recorrido mixto · 🟡 Sin validar 11

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | Maia | Maia | 3 | 🟡 Sin validar | `et_prologo` · portugal |
| 2 | Media montaña · Uphill finish | Viana do Castelo | Braga | 162 | 🟡 Sin validar | `et_media_alto` · portugal |
| 3 | Media montaña · Hills | Felgueiras | Fafe | 168 | 🟡 Sin validar | `et_media_tendida` · portugal |
| 4 | Media montaña · Wall finish | Boticas | Braganca | 185 | 🟡 Sin validar | `et_media_muro` · portugal |
| 5 | Montaña · Summit finish | Braganca | Mondim de Basto | 183 | 🟡 Sin validar | `et_reina_blanda` · portugal |
| 6 | Llana · Flat | Lamego | Viseu | 156 | 🟡 Sin validar | `et_llana` · portugal |
| 7 | Media montaña · Hills | Agueda | Guarda | 175 | 🟡 Sin validar | `et_media_valle` · portugal |
| 8 | Montaña · Summit finish | Sabugal | Covilha | 179 | 🟡 Sin validar | `et_reina_alto_corto` · portugal |
| 9 | Llana · Flat | Ferreira do Zezere | Santarem | 178 | 🟡 Sin validar | `et_llana` · portugal |
| 10 | Montaña · Summit finish | Alcobaca | Alto de Montejunto | 174 | 🟡 Sin validar | `et_reina_cima_cerca` · portugal |
| 11 | Contrarreloj · ITT | Lisboa | Lisboa | 17 | 🟡 Sin validar | `et_crono` · portugal |

### Race Szeklerland `race-szekler`

Clase **2** · RO · día 218 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 108 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `et_crono` · balcanes |
| 3 | Media montaña · Hills | — | — | 110 | 🔴 Inventado | `et_media_valle` · balcanes |

### Race Colombia Tour `race-colombia-tour`

Clase **2** · CO · día 220 · 9 etapas · recorrido generado · 🔴 Inventado 9

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | — | — | 5 | 🔴 Inventado | `et_prologo` · andes |
| 2 | Media montaña · Hills | — | — | 114 | 🔴 Inventado | `et_media_tendida` · andes |
| 3 | Media montaña · Hills | — | — | 148 | 🔴 Inventado | `et_media_valle` · andes |
| 4 | Media montaña · Hills | — | — | 131 | 🔴 Inventado | `et_media_valle` · andes |
| 5 | Media montaña · Hills | — | — | 142 | 🔴 Inventado | `et_media_valle` · andes |
| 6 | Media montaña · Uphill finish | — | — | 129 | 🔴 Inventado | `et_media_alto` · andes |
| 7 | Montaña · Mountains | — | — | 125 | 🔴 Inventado | `et_reina_valle` · andes |
| 8 | Contrarreloj · ITT | — | — | 25 | 🔴 Inventado | `et_crono` · andes |
| 9 | Media montaña · Hills | — | — | 110 | 🔴 Inventado | `et_media_tendida` · andes |

### Race Arctic `race-arctic`

Clase **Pro** · NO · día 225 · 4 etapas · recorrido real · ✅ Real 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Evenes | Myre | 182 | ✅ Real | — |
| 2 | Llana · Flat | Bo i Vesteralen | Andenes | 180 | ✅ Real | — |
| 3 | Media montaña · Hills | Stokmarknes | Storheia | 147 | ✅ Real | — |
| 4 | Media montaña · Hills | Sortland | Narvik | 191 | ✅ Real | — |

### Race Czechia `race-czechia`

Clase **Pro** · CZ · día 225 · 4 etapas · recorrido mixto · 🟡 Sin validar 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | Prague | Karlovy Vary | 163 | 🟡 Sin validar | `et_media_alto` · centroeuropa |
| 2 | Montaña · Summit finish | Mlada Boleslav | Jested | 155 | 🟡 Sin validar | `et_reina_cima_cerca` · centroeuropa |
| 3 | Montaña · Summit finish | Pardubice | Dlouhe strane | 171 | 🟡 Sin validar | `et_reina_alto_corto` · centroeuropa |
| 4 | Montaña · Summit finish | Kromeriz | Pustevny | 160 | 🟡 Sin validar | `et_reina_cima_cerca` · centroeuropa |

### Race Hamburg `race-hamburg`

Clase **WT** · DE · día 228 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 198 | ✅ Real | — |

### Race Polynormande `race-polynormande`

Clase **1** · FR · día 228 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 172 | 🔴 Inventado | `ud_circuito` · bretana |

### Race Limousin `race-limousin`

Clase **1** · FR · día 230 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 153 | 🔴 Inventado | `et_llana` · macizo_central |
| 2 | Media montaña · Hills | — | — | 140 | 🔴 Inventado | `et_media_tendida` · alpes |
| 3 | Media montaña · Hills | — | — | 156 | 🔴 Inventado | `et_media_tendida` · provenza |
| 4 | Montaña · Summit finish | — | — | 115 | 🔴 Inventado | `et_reina_alto_corto` · pirineos |

### Race Benelux `race-benelux`

Clase **WT** · BE · día 231 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Diest | Diest | 188 | 🟡 Sin validar | `et_llana` · flandes |
| 2 | Llana · Flat | Blankenberge | Ardooie | 174 | 🟡 Sin validar | `et_llana_viento` · flandes |
| 3 | Clásica · Cobbles | Celles | Geraardsbergen | 185 | 🟡 Sin validar | `ud_adoquin_ligero` · flandes |
| 4 | Media montaña · Wall finish | Riemst | Bilzen-Hoeselt | 196 | 🟡 Sin validar | `et_media_muro` · flandes |
| 5 | Media montaña · Wall finish | Leuven | Leuven | 178 | 🟡 Sin validar | `et_media_muro` · flandes |

### Race Germany `race-germany`

Clase **Pro** · DE · día 231 · 5 etapas · recorrido mixto · ✅ Real 4 · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · Prologue | Bad Orb | Bad Orb | 3 | 🟡 Sin validar | `et_prologo` · centroeuropa |
| 2 | Media montaña · Hills | Bad Orb | Schwabisch Hall | 215 | ✅ Real | — |
| 3 | Llana · Flat | Schwabisch Hall | Offenbach an der Queich | 197 | ✅ Real | — |
| 4 | Media montaña · Hills | Herxheim bei Landau | Bad Durkheim | 171 | ✅ Real | — |
| 5 | Media montaña · Hills | Heilbronn | Heilbronn | 157 | ✅ Real | — |

### Race West Bohemia `race-west-bohemia`

Clase **2** · CZ · día 232 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 144 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Media montaña · Uphill finish | — | — | 125 | 🔴 Inventado | `et_media_alto` · centroeuropa |
| 3 | Media montaña · Uphill finish | — | — | 113 | 🔴 Inventado | `et_media_alto` · centroeuropa |
| 4 | Media montaña · Uphill finish | — | — | 117 | 🔴 Inventado | `et_media_alto` · centroeuropa |

### Kyrgyzstan ITT Championship `nc-kg-itt`

Clase **NC** · KG · día 232 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 38 | 🔴 Inventado | `nc_crono` · generico |

### Kyrgyzstan U23 ITT Championship `nc-kg-u23-itt`

Clase **NC** · KG · día 232 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 35 | 🔴 Inventado | `nc_crono` · generico |

### Race Baltic `race-baltic`

Clase **2** · LT · día 233 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 133 | 🔴 Inventado | `et_llana` · escandinavia |
| 2 | Contrarreloj · ITT | — | — | 16 | 🔴 Inventado | `et_crono` · escandinavia |
| 3 | Media montaña · Uphill finish | — | — | 132 | 🔴 Inventado | `et_media_alto` · escandinavia |

### Race Spain `race-spain`

Clase **WT** · ES · día 234 · 21 etapas · recorrido real · ✅ Real 21

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | Monaco | Monaco | 10 | ✅ Real | — |
| 2 | Media montaña · Hills | Monaco | Manosque | 215 | ✅ Real | — |
| 3 | Montaña · Summit finish | Gruissan | Font Romeu | 167 | ✅ Real | — |
| 4 | Montaña · Summit finish | Andorra la Vella | Andorra la Vella | 105 | ✅ Real | — |
| 5 | Media montaña · Hills | Falset | Roquetes | 171 | ✅ Real | — |
| 6 | Clásica · Cobbles | Alcossebre | Castello | 177 | ✅ Real | — |
| 7 | Montaña · Summit finish | Vall d'Alba | Valdelinares | 150 | ✅ Real | — |
| 8 | Llana · Flat | Pucol | Xeraco | 167 | ✅ Real | — |
| 9 | Montaña · Summit finish | Villajoyosa | Alto de Aitana | 188 | ✅ Real | — |
| 10 | Media montaña · Hills | Alcaraz | Elche de la Sierra | 185 | ✅ Real | — |
| 11 | Llana · Flat | Cartagena | Lorca | 156 | ✅ Real | — |
| 12 | Montaña · Summit finish | Vera | Calar Alto | 167 | ✅ Real | — |
| 13 | Media montaña · Hills | Almunecar | Loja | 193 | ✅ Real | — |
| 14 | Montaña · Summit finish | Jaen | Sierra de la Pandera | 153 | ✅ Real | — |
| 15 | Media montaña · Hills | Palma del Rio | Cordoba | 181 | ✅ Real | — |
| 16 | Llana · Flat | Cortegana | La Rabida | 186 | ✅ Real | — |
| 17 | Llana · Flat | Dos Hermanas | Sevilla | 189 | ✅ Real | — |
| 18 | Contrarreloj · ITT | El Puerto de Santa Maria | Jerez de la Frontera | 33 | ✅ Real | — |
| 19 | Montaña · Summit finish | Velez-Malaga | Penas Blancas | 205 | ✅ Real | — |
| 20 | Montaña · Summit finish | La Calahorra | Collada de Alguacil | 187 | ✅ Real | — |
| 21 | Media montaña · Hills | Granada | Granada | 99 | ✅ Real | — |

### Kyrgyzstan U23 Road Championship `nc-kg-u23-road`

Clase **NC** · KG · día 235 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 172 | 🔴 Inventado | `nc_ruta` · generico |

### Kyrgyzstan Road Championship `nc-kg-road`

Clase **NC** · KG · día 235 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 188 | 🔴 Inventado | `nc_ruta` · generico |

### Race Aquitaine `race-aquitaine`

Clase **1** · FR · día 237 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 145 | 🔴 Inventado | `et_llana` · francia_norte |
| 2 | Media montaña · Wall finish | — | — | 147 | 🔴 Inventado | `et_media_muro` · francia_norte |
| 3 | Contrarreloj · ITT | — | — | 14 | 🔴 Inventado | `et_crono` · bretana |
| 4 | Media montaña · Wall finish | — | — | 117 | 🔴 Inventado | `et_media_muro` · bretana |

### Race Samsun `race-samsun`

Clase **2** · TR · día 239 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 142 | 🔴 Inventado | `et_llana` · anatolia |
| 2 | Media montaña · Uphill finish | — | — | 129 | 🔴 Inventado | `et_media_alto` · anatolia |
| 3 | Media montaña · Hills | — | — | 155 | 🔴 Inventado | `et_media_tendida` · anatolia |
| 4 | Media montaña · Uphill finish | — | — | 107 | 🔴 Inventado | `et_media_alto` · anatolia |

### Race Bulgaria `race-bulgaria`

Clase **2** · BG · día 241 · 6 etapas · recorrido generado · 🔴 Inventado 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 147 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Hills | — | — | 116 | 🔴 Inventado | `et_media_valle` · balcanes |
| 3 | Media montaña · Uphill finish | — | — | 132 | 🔴 Inventado | `et_media_alto` · balcanes |
| 4 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · balcanes |
| 5 | Montaña · Mountains | — | — | 121 | 🔴 Inventado | `et_reina_valle` · balcanes |
| 6 | Montaña · Summit finish | — | — | 91 | 🔴 Inventado | `et_montana_corta` · balcanes |

### Race Brittany `race-brittany`

Clase **WT** · FR · día 242 · 1 etapa · recorrido mixto · 🟡 Sin validar 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | Plouay | Plouay | 247 | 🟡 Sin validar | `et_media_muro` · bretana |

### Race Kranj `race-kranj`

Clase **1** · SI · día 242 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 200 | 🔴 Inventado | `ud_muros` · centroeuropa |

### Race Plouay `race-plouay`

Clase **2** · FR · día 242 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 154 | 🔴 Inventado | `ud_circuito` · bretana |

### Race Halle `race-halle`

Clase **2** · BE · día 242 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 173 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Achterhoek `race-achterhoek`

Clase **2** · NL · día 242 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 149 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Philadelphia `race-philadelphia`

Clase **1** · US · día 242 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 187 | 🔴 Inventado | `ud_repecho` · norteamerica |

### Race Korea `race-korea`

Clase **1** · KR · día 243 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 145 | 🔴 Inventado | `et_llana` · asia_oriental |
| 2 | Media montaña · Hills | — | — | 154 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 3 | Media montaña · Uphill finish | — | — | 140 | 🔴 Inventado | `et_media_alto` · asia_oriental |
| 4 | Media montaña · Uphill finish | — | — | 172 | 🔴 Inventado | `et_media_alto` · asia_oriental |
| 5 | Llana · Flat | — | — | 130 | 🔴 Inventado | `et_llana` · asia_oriental |

### Race Britain `race-britain`

Clase **Pro** · GB · día 245 · 6 etapas · recorrido mixto · 🟡 Sin validar 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Woodbridge | Southwold | 168 | 🟡 Sin validar | `et_llana_viento` · britanicas |
| 2 | Llana · Flat | Stowmarket | Stowmarket | 174 | 🟡 Sin validar | `et_llana` · britanicas |
| 3 | Media montaña · Uphill finish | Milton Keynes | Ampthill | 123 | 🟡 Sin validar | `et_media_alto` · britanicas |
| 4 | Media montaña · Hills | Atherstone | Burton Dassett | 187 | 🟡 Sin validar | `et_media_valle` · britanicas |
| 5 | Media montaña · Uphill finish | Pontypool | The Tumble | 134 | 🟡 Sin validar | `et_media_alto` · britanicas |
| 6 | Media montaña · Uphill finish | Newport | Cardiff | 112 | 🟡 Sin validar | `et_media_alto` · britanicas |

### Race ZLM `race-zlm`

Clase **1** · NL · día 245 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 172 | 🔴 Inventado | `et_llana` · flandes |
| 2 | Media montaña · Wall finish | — | — | 147 | 🔴 Inventado | `et_media_muro` · flandes |
| 3 | Media montaña · Wall finish | — | — | 165 | 🔴 Inventado | `et_media_muro` · flandes |
| 4 | Contrarreloj · ITT | — | — | 16 | 🔴 Inventado | `et_crono` · flandes |
| 5 | Llana · Flat | — | — | 146 | 🔴 Inventado | `et_llana` · flandes |

### Race Istanbul `race-istanbul`

Clase **1** · TR · día 246 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 154 | 🔴 Inventado | `et_llana` · anatolia |
| 2 | Montaña · Summit finish | — | — | 167 | 🔴 Inventado | `et_reina_alto_corto` · anatolia |
| 3 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `et_crono` · anatolia |
| 4 | Media montaña · Hills | — | — | 130 | 🔴 Inventado | `et_media_tendida` · anatolia |

### Race Friuli `race-friuli`

Clase **2** · IT · día 246 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 142 | 🔴 Inventado | `et_llana` · italia_norte |
| 2 | Media montaña · Hills | — | — | 149 | 🔴 Inventado | `et_media_valle` · dolomitas |
| 3 | Media montaña · Uphill finish | — | — | 127 | 🔴 Inventado | `et_media_alto` · italia_centro |
| 4 | Media montaña · Hills | — | — | 106 | 🔴 Inventado | `et_media_valle` · italia_sur |

### Race South Bohemia `race-south-bohemia`

Clase **2** · CZ · día 246 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 149 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Contrarreloj · ITT | — | — | 22 | 🔴 Inventado | `et_crono` · centroeuropa |
| 3 | Media montaña · Hills | — | — | 139 | 🔴 Inventado | `et_media_valle` · centroeuropa |
| 4 | Montaña · Summit finish | — | — | 124 | 🔴 Inventado | `et_reina_alto_corto` · centroeuropa |

### Race Sauerland `race-sauerland`

Clase **2** · DE · día 246 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 129 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Media montaña · Uphill finish | — | — | 132 | 🔴 Inventado | `et_media_alto` · centroeuropa |
| 3 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · centroeuropa |
| 4 | Media montaña · Hills | — | — | 120 | 🔴 Inventado | `et_media_tendida` · centroeuropa |

### Race Kosovo `race-kosovo`

Clase **2** · XK · día 246 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 137 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Uphill finish | — | — | 116 | 🔴 Inventado | `et_media_alto` · balcanes |
| 3 | Media montaña · Hills | — | — | 136 | 🔴 Inventado | `et_media_tendida` · balcanes |
| 4 | Media montaña · Uphill finish | — | — | 123 | 🔴 Inventado | `et_media_alto` · balcanes |

### Race Maryland `race-maryland`

Clase **Pro** · US · día 248 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 164 | 🔴 Inventado | `et_llana` · norteamerica |
| 2 | Contrarreloj · ITT | — | — | 24 | 🔴 Inventado | `et_crono` · norteamerica |
| 3 | Montaña · Summit finish | — | — | 125 | 🔴 Inventado | `et_reina_alto_largo` · norteamerica |

### Race Prato `race-prato`

Clase **Pro** · IT · día 249 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 188 | 🔴 Inventado | `ud_sterrato` · italia_centro |

### Race Somme `race-somme`

Clase **2** · FR · día 249 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 137 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Ecuador `race-ecuador`

Clase **2** · EC · día 250 · 6 etapas · recorrido generado · 🔴 Inventado 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 137 | 🔴 Inventado | `et_llana` · andes |
| 2 | Media montaña · Uphill finish | — | — | 149 | 🔴 Inventado | `et_media_alto` · andes |
| 3 | Media montaña · Hills | — | — | 117 | 🔴 Inventado | `et_media_valle` · andes |
| 4 | Montaña · Summit finish | — | — | 124 | 🔴 Inventado | `et_reina_alto_corto` · andes |
| 5 | Contrarreloj · ITT | — | — | 26 | 🔴 Inventado | `et_crono` · andes |
| 6 | Montaña · Summit finish | — | — | 130 | 🔴 Inventado | `et_reina_alto_largo` · andes |

### Race Toscana `race-toscana`

Clase **1** · IT · día 252 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 182 | 🔴 Inventado | `ud_circuito` · italia_centro |

### Race Romania `race-romania`

Clase **2** · RO · día 252 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 137 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Uphill finish | — | — | 141 | 🔴 Inventado | `et_media_alto` · balcanes |
| 3 | Montaña · Mountains | — | — | 145 | 🔴 Inventado | `et_reina_valle` · balcanes |
| 4 | Contrarreloj · ITT | — | — | 23 | 🔴 Inventado | `et_crono` · balcanes |
| 5 | Media montaña · Hills | — | — | 110 | 🔴 Inventado | `et_media_valle` · balcanes |

### Race Peccioli `race-peccioli`

Clase **Pro** · IT · día 253 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 206 | 🔴 Inventado | `ud_esprint_capi` · italia_centro |

### Malaysia ITT Championship `nc-my-itt`

Clase **NC** · MY · día 253 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 39 | 🔴 Inventado | `nc_crono` · montana_sur |

### Malaysia U23 ITT Championship `nc-my-u23-itt`

Clase **NC** · MY · día 253 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 32 | 🔴 Inventado | `nc_crono` · montana_sur |

### Race Québec `race-quebec`

Clase **WT** · CA · día 254 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 216 | ✅ Real | — |

### Race Morocco `race-morocco`

Clase **2** · MA · día 254 · 8 etapas · recorrido generado · 🔴 Inventado 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 125 | 🔴 Inventado | `et_llana` · montana_sur |
| 2 | Media montaña · Hills | — | — | 123 | 🔴 Inventado | `et_media_valle` · montana_sur |
| 3 | Media montaña · Uphill finish | — | — | 130 | 🔴 Inventado | `et_media_alto` · montana_sur |
| 4 | Media montaña · Hills | — | — | 122 | 🔴 Inventado | `et_media_valle` · montana_sur |
| 5 | Media montaña · Hills | — | — | 139 | 🔴 Inventado | `et_media_tendida` · montana_sur |
| 6 | Media montaña · Hills | — | — | 116 | 🔴 Inventado | `et_media_tendida` · montana_sur |
| 7 | Contrarreloj · ITT | — | — | 16 | 🔴 Inventado | `et_crono` · montana_sur |
| 8 | Montaña · Summit finish | — | — | 111 | 🔴 Inventado | `et_reina_alto_largo` · montana_sur |

### Race Pantani `race-pantani`

Clase **1** · IT · día 255 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 175 | 🔴 Inventado | `ud_montana_media` · italia_centro |

### Race Taihu `race-taihu`

Clase **1** · CN · día 255 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 159 | 🔴 Inventado | `et_llana` · asia_oriental |
| 2 | Media montaña · Hills | — | — | 151 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 3 | Montaña · Mountains | — | — | 156 | 🔴 Inventado | `et_reina_valle` · asia_oriental |
| 4 | Contrarreloj · ITT | — | — | 15 | 🔴 Inventado | `et_crono` · asia_oriental |
| 5 | Media montaña · Uphill finish | — | — | 126 | 🔴 Inventado | `et_media_alto` · asia_oriental |

### Race Montréal `race-montreal`

Clase **WT** · CA · día 256 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 209 | ✅ Real | — |

### Race Fourmies `race-fourmies`

Clase **Pro** · FR · día 256 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 205 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Matteotti `race-matteotti`

Clase **1** · IT · día 256 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 176 | 🔴 Inventado | `ud_repecho` · italia_sur |

### Malaysia U23 Road Championship `nc-my-u23-road`

Clase **NC** · MY · día 256 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 176 | 🔴 Inventado | `nc_ruta` · montana_sur |

### Malaysia Road Championship `nc-my-road`

Clase **NC** · MY · día 256 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Circuit | — | — | 200 | 🔴 Inventado | `nc_ruta` · montana_sur |

### Race Abruzzo `race-abruzzo`

Clase **1** · IT · día 258 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 157 | 🔴 Inventado | `et_llana` · italia_sur |
| 2 | Media montaña · Wall finish | — | — | 163 | 🔴 Inventado | `et_media_muro` · italia_norte |
| 3 | Media montaña · Uphill finish | — | — | 155 | 🔴 Inventado | `et_media_alto` · italia_norte |
| 4 | Montaña · Summit finish | — | — | 130 | 🔴 Inventado | `et_reina_alto_corto` · dolomitas |

### Race Namur `race-namur`

Clase **Pro** · BE · día 259 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | — | — | 205 | 🔴 Inventado | `ud_muro_final` · ardenas |

### Race Luxembourg `race-luxembourg`

Clase **Pro** · LU · día 259 · 5 etapas · recorrido mixto · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | Luxembourg | Luxembourg | 153 | 🟡 Sin validar | `et_media_alto` · ardenas |
| 2 | Media montaña · Hills | Remich | Mamer | 168 | 🟡 Sin validar | `et_media_valle` · ardenas |
| 3 | Media montaña · Wall finish | Mertert | Vianden | 171 | 🟡 Sin validar | `et_media_muro` · ardenas |
| 4 | Contrarreloj · ITT | Niederanven | Niederanven | 26 | 🟡 Sin validar | `et_crono` · ardenas |
| 5 | Media montaña · Wall finish | Mersch | Luxembourg | 176 | 🟡 Sin validar | `et_media_muro` · ardenas |

### Race Slovakia `race-slovakia`

Clase **1** · SK · día 259 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 175 | 🔴 Inventado | `et_llana` · centroeuropa |
| 2 | Media montaña · Hills | — | — | 149 | 🔴 Inventado | `et_media_tendida` · centroeuropa |
| 3 | Media montaña · Hills | — | — | 152 | 🔴 Inventado | `et_media_valle` · centroeuropa |
| 4 | Media montaña · Hills | — | — | 148 | 🔴 Inventado | `et_media_tendida` · centroeuropa |
| 5 | Montaña · Summit finish | — | — | 129 | 🔴 Inventado | `et_reina_alto_corto` · centroeuropa |

### Race Serbia `race-serbie`

Clase **2** · RS · día 260 · 4 etapas · recorrido generado · 🔴 Inventado 4

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 120 | 🔴 Inventado | `et_llana` · balcanes |
| 2 | Media montaña · Uphill finish | — | — | 130 | 🔴 Inventado | `et_media_alto` · balcanes |
| 3 | Media montaña · Hills | — | — | 121 | 🔴 Inventado | `et_media_valle` · balcanes |
| 4 | Montaña · Summit finish | — | — | 117 | 🔴 Inventado | `et_reina_blanda` · balcanes |

### Race Vlaanderen `race-vlaanderen`

Clase **1** · BE · día 261 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 179 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Flandrien `race-flandrien`

Clase **Pro** · BE · día 262 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 185 | 🔴 Inventado | `ud_muros_adoquin` · flandes |

### Race Lazio `race-lazio`

Clase **1** · IT · día 262 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Circuit | — | — | 180 | 🔴 Inventado | `ud_circuito` · italia_sur |

### Race Romagna Classic `race-romagna-giro`

Clase **1** · IT · día 263 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 182 | 🔴 Inventado | `ud_repecho` · italia_centro |

### Race Gooik `race-gooik`

Clase **1** · BE · día 263 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 200 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Isbergues `race-isbergues`

Clase **1** · FR · día 263 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 192 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Poyang `race-poyang`

Clase **2** · CN · día 263 · 6 etapas · recorrido generado · 🔴 Inventado 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 139 | 🔴 Inventado | `et_llana` · asia_oriental |
| 2 | Llana · Flat | — | — | 127 | 🔴 Inventado | `et_llana` · asia_oriental |
| 3 | Media montaña · Uphill finish | — | — | 143 | 🔴 Inventado | `et_media_alto` · asia_oriental |
| 4 | Contrarreloj · ITT | — | — | 23 | 🔴 Inventado | `et_crono` · asia_oriental |
| 5 | Media montaña · Hills | — | — | 129 | 🔴 Inventado | `et_media_valle` · asia_oriental |
| 6 | Montaña · Summit finish | — | — | 104 | 🔴 Inventado | `et_reina_alto_corto` · asia_oriental |

### Race Croatia `race-croatia`

Clase **Pro** · HR · día 265 · 6 etapas · recorrido mixto · 🟡 Sin validar 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | Split | Sinj | 163 | 🟡 Sin validar | `et_media_valle` · balcanes |
| 2 | Llana · Flat | Biograd na Moru | Novalja | 115 | 🟡 Sin validar | `et_llana` · balcanes |
| 3 | Media montaña · Uphill finish | Gospic | Rijeka | 151 | 🟡 Sin validar | `et_media_alto` · balcanes |
| 4 | Montaña · Summit finish | Krk | Labin | 191 | 🟡 Sin validar | `et_reina_alto_largo` · balcanes |
| 5 | Media montaña · Uphill finish | Karlovac | Sveta Nedelja | 151 | 🟡 Sin validar | `et_media_alto` · balcanes |
| 6 | Llana · Flat | Samobor | Zagreb | 157 | 🟡 Sin validar | `et_llana` · balcanes |

### Race Houtland `race-houtland`

Clase **1** · BE · día 266 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 172 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Mirabelle `race-mirabelle`

Clase **2** · FR · día 268 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 166 | 🔴 Inventado | `ud_muros` · macizo_central |

### Race Cerami `race-cerami`

Clase **2** · BE · día 269 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 150 | 🔴 Inventado | `ud_esprint` · flandes |

### Race Langkawi `race-langkawi`

Clase **Pro** · MY · día 270 · 8 etapas · recorrido mixto · 🟡 Sin validar 8

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Shah Alam | Kampar | 193 | 🟡 Sin validar | `et_llana` · montana_sur |
| 2 | Montaña · Summit finish | Taiping | Gunung Jerai | 146 | 🟡 Sin validar | `et_reina_alto_largo` · montana_sur |
| 3 | Media montaña · Uphill finish | Sungai Petani | Kuala Kangsar | 190 | 🟡 Sin validar | `et_media_alto` · montana_sur |
| 4 | Montaña · Summit finish | Tambun | Cameron Highlands | 140 | 🟡 Sin validar | `et_reina_blanda` · montana_sur |
| 5 | Montaña · Summit finish | Tapah | Genting Highlands | 126 | 🟡 Sin validar | `et_reina_cima_cerca` · montana_sur |
| 6 | Media montaña · Hills | Pandan Indah | Rembau | 121 | 🟡 Sin validar | `et_media_valle` · montana_sur |
| 7 | Llana · Flat | Melaka | Batu Pahat | 159 | 🟡 Sin validar | `et_llana` · montana_sur |
| 8 | Llana · Flat | Muar | Putrajaya | 184 | 🟡 Sin validar | `et_llana` · montana_sur |

### Race Chauny `race-chauny`

Clase **1** · FR · día 270 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 171 | 🔴 Inventado | `ud_esprint` · francia_norte |

### Race Emilia `race-emilia`

Clase **Pro** · IT · día 276 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 200 | 🔴 Inventado | `ud_repecho` · italia_norte |

### Race Münster `race-munster`

Clase **Pro** · DE · día 276 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 178 | 🔴 Inventado | `ud_esprint_capi` · centroeuropa |

### Race Cholet `race-cholet`

Clase **1** · FR · día 276 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 196 | 🔴 Inventado | `ud_esprint` · bretana |

### Race Continental Championship `race-euro-champs`

Clase **1** · FR · día 277 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 200 | 🔴 Inventado | `ud_muros` · bretana |

### Race Agostoni `race-agostoni`

Clase **1** · IT · día 277 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 154 | 🔴 Inventado | `ud_montana_media` · italia_norte |

### Race Vendée `race-vendee`

Clase **1** · FR · día 277 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 200 | 🔴 Inventado | `ud_esprint` · bretana |

### Race Legnano `race-legnano`

Clase **Pro** · IT · día 278 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Wall finish | — | — | 193 | 🔴 Inventado | `ud_muro_final` · italia_norte |

### Race Varese `race-varese`

Clase **Pro** · IT · día 279 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 209 | 🔴 Inventado | `ud_montana_media` · italia_norte |

### Race Binche `race-binche`

Clase **1** · BE · día 279 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 167 | 🔴 Inventado | `ud_montana_media` · ardenas |

### Race San Daniele `race-san-daniele`

Clase **2** · IT · día 279 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 157 | 🔴 Inventado | `ud_montana_media` · italia_norte |

### Race Piedmont `race-piedmont`

Clase **Pro** · IT · día 281 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 219 | 🔴 Inventado | `ud_montana_media` · italia_norte |

### Race Lombardy `race-lombardy`

Clase **WT** · IT · día 283 · 1 etapa · recorrido real · ✅ Real 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Classic | — | — | 241 | ✅ Real | — |

### Race Kyushu `race-kyushu`

Clase **1** · JP · día 283 · 3 etapas · recorrido generado · 🔴 Inventado 3

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 142 | 🔴 Inventado | `et_llana` · asia_oriental |
| 2 | Media montaña · Uphill finish | — | — | 160 | 🔴 Inventado | `et_media_alto` · asia_oriental |
| 3 | Media montaña · Hills | — | — | 119 | 🔴 Inventado | `et_media_tendida` · asia_oriental |

### Race Tours `race-tours`

Clase **Pro** · FR · día 284 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 198 | 🔴 Inventado | `ud_adoquin_ligero` · bretana |

### Race Oropa `race-oropa`

Clase **1** · IT · día 284 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 175 | 🔴 Inventado | `ud_montana_media` · alpes |

### Race Guangxi `race-guangxi`

Clase **WT** · CN · día 286 · 6 etapas · recorrido mixto · ✅ Real 1 · 🟡 Sin validar 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | Fangchenggang | Fangchenggang | 149 | 🟡 Sin validar | `et_llana` · asia_oriental |
| 2 | Media montaña · Uphill finish | Chongzuo | Jingxi | 177 | 🟡 Sin validar | `et_media_alto` · asia_oriental |
| 3 | Media montaña · Uphill finish | Jingxi | Bama | 214 | 🟡 Sin validar | `et_media_alto` · asia_oriental |
| 4 | Media montaña · Hills | Bama | Jinchengjiang | 177 | 🟡 Sin validar | `et_media_valle` · asia_oriental |
| 5 | Montaña · Summit finish | Yizhou | Nongla | 166 | ✅ Real | — |
| 6 | Llana · Flat | Nanning | Nanning | 134 | 🟡 Sin validar | `et_llana` · asia_oriental |

### Race Holland `race-holland`

Clase **1** · NL · día 286 · 6 etapas · recorrido generado · 🔴 Inventado 6

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 153 | 🔴 Inventado | `et_llana` · flandes |
| 2 | Media montaña · Wall finish | — | — | 144 | 🔴 Inventado | `et_media_muro` · flandes |
| 3 | Media montaña · Wall finish | — | — | 155 | 🔴 Inventado | `et_media_muro` · flandes |
| 4 | Media montaña · Wall finish | — | — | 150 | 🔴 Inventado | `et_media_muro` · flandes |
| 5 | Contrarreloj · ITT | — | — | 19 | 🔴 Inventado | `et_crono` · flandes |
| 6 | Llana · Flat | — | — | 128 | 🔴 Inventado | `et_llana` · flandes |

### Race Veneto `race-veneto`

Clase **Pro** · IT · día 287 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Hills | — | — | 200 | 🔴 Inventado | `ud_esprint_capi` · italia_norte |

### Race Japan `race-japan`

Clase **Pro** · JP · día 291 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Media montaña · Uphill finish | — | — | 185 | 🔴 Inventado | `ud_repecho` · asia_oriental |

### Race Veneto Classic `race-veneto-classic`

Clase **Pro** · IT · día 291 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Clásica · Cobbles | — | — | 206 | 🔴 Inventado | `ud_adoquin_ligero` · italia_norte |

### Race Chrono `race-chrono`

Clase **1** · FR · día 291 · 1 etapa · recorrido generado · 🔴 Inventado 1

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Contrarreloj · ITT | — | — | 48 | 🔴 Inventado | `nc_crono` · bretana |

### Race Faso `race-faso`

Clase **2** · BF · día 303 · 5 etapas · recorrido generado · 🔴 Inventado 5

| # | tipo | origen | destino | km | procedencia | esqueleto · zona |
|---:|---|---|---|---:|---|---|
| 1 | Llana · Flat | — | — | 122 | 🔴 Inventado | `et_llana` · africa_llana |
| 2 | Media montaña · Uphill finish | — | — | 125 | 🔴 Inventado | `et_media_alto` · africa_llana |
| 3 | Media montaña · Hills | — | — | 117 | 🔴 Inventado | `et_media_tendida` · africa_llana |
| 4 | Contrarreloj · ITT | — | — | 18 | 🔴 Inventado | `et_crono` · africa_llana |
| 5 | Media montaña · Uphill finish | — | — | 109 | 🔴 Inventado | `et_media_alto` · africa_llana |


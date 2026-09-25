## 6. La geografía: zonas, territorios y RACE_REGION

Hoy el país existe en el calendario y no llega al generador: `buildRace` lo calcula en `calendar.ts` l. 889 (`row.country ?? RACE_COUNTRY[row.id]`) y no lo pasa a ninguna de las tres ramas (mapa 02 §1 y §6: "el país NO entra en ningún generador de recorrido"); dentro del motor solo lo lee el clima (`climateOf`, `world/climate.ts` l. 166). Esta sección escribe la tabla que faltaba, en tres capas y con tres ficheros: `ZONAS` (qué existe en cada sitio, `grammar/geo.ts`), `TERRITORIOS` (por qué zonas pasa un país y dónde está su reina, `grammar/geo.ts`) y `RACE_REGION` (en qué zona corre cada carrera y cada etapa, `grammar/regions.ts`). Los tipos son los de la sección 3 (`GeoZone`, `Relieve`, `GeoSignature`, `Territorio`, `RaceRegion`) y no se repiten aquí salvo donde hace falta fijar una semántica; esta sección añade a la sección 3 los campos `duda` y `skeleton` de `RaceRegion` (§6.4). El tipo `Requiere` y la función `admite` que leen la tabla son los de la sección 5 (§5.1) y aquí solo se citan (§6.5 punto 1).

### 6.1 Qué es DATO y qué es JUICIO

Se dice con esas palabras porque los tres jueces lo señalaron como el riesgo principal (`juicios/cobertura.md` §5 riesgo 1; `juicios/motor.md` §5 riesgo 7; `juicios/ejecutabilidad.md` §5 riesgo 1): la tabla geográfica sale del mapa 07 §3, que se declara orientativo, y no hay validación externa posible (PCS y Overpass vetados, `docs/fuentes-recorridos.md`, mapa 05 §6).

Es DATO, y por tanto no se discute ni se ajusta a ojo:

1. Las 20 filas `terrain: 'cobbles'` del calendario (grep sobre `calendar.ts`, medido en mapa 07 §3 consecuencia 1 y comprobado de nuevo: 20). Diecinueve caen en Bélgica, norte de Francia, Bretaña, el Loira (Paris-Tours, `race-tours`: chemins de vigne de tierra), Reino Unido o Véneto, es decir, en zonas con adoquín o tierra. La vigésima es un conflicto del propio dato: `race-leon` ("Race Léon", 185 km, Pro, `terrain: 'cobbles'`, `calendar.ts` l. 1388-1396) lleva `RACE_COUNTRY['race-leon'] = 'ES'` (l. 630) y `RACE_ROUTES['race-leon'] = [['Leon', 'Leon']]` (`raceRoutes.ts` l. 610): el nombre dice Tro Bro Léon (Bretaña, tierra) y el país y las ciudades dicen León (meseta, sin adoquín ni tierra). E1 no corrige datos de `calendar.ts` ni de `raceRoutes.ts` (§6.4, "lo que `RACE_REGION` cambia en el país"): la fila se cura como `meseta` con `duda: true`, el test (d) de §6.8 la aparta con la razón escrita y va a la lista de revisión del dueño (§6.8, final): si el dueño corrige el dato a `FR` y Lannilis en un encargo de datos, la fila pasa a `bretana` y el test (d) vuelve a 20.
2. Las ciudades de salida y meta de `raceRoutes.ts` (`RACE_ROUTES`, l. 11): 310 claves, una por carrera de equipos, sin huérfanas (mapa 02 §8). Son reales aunque el relieve que hoy se dibuja debajo sea inventado; son la única fuente de la curación de `RACE_REGION` (§6.4).
3. Las 177 etapas con rasgos (`STAGE_FEATURES`, `stageFeatures.ts` l. 15) y las 3 grandes vueltas de `RACE_EDITIONS` (`editions.ts` l. 25; 60 ediciones en total, medido con grep). No pasan por esta tabla: su origen es `real` y su huella se sella antes de tocar `calendar.ts` (sección 11).

Es JUICIO todo lo demás: cada rango de `ZONAS`, cada `null`, cada peso, cada `ruta` y cada `cordillera` de `TERRITORIOS`, y la zona que `RACE_REGION` asigna a cada carrera. El juicio se sostiene con tres instrumentos, y no con una fuente: la fila del mapa 07 §3 citada en el comentario de cada zona (la columna "fila" de §6.2; dos zonas no tienen fila y lo dicen), los tests de consistencia interna de §6.8 (que no prueban que la tabla sea verdad, sino que no se contradice, que cabe en `ARCH` y que todo esqueleto admitido se puede dibujar), y la galería de la sección 16, que es donde el dueño juzga 31 firmas y 32 esqueletos en una tarde con tres preguntas por perfil. Cuando la galería diga que algo no existe en un sitio, lo que se edita es una fila de `ZONAS`, de `TERRITORIOS` o de `RACE_REGION`: datos, nunca código.

### 6.2 Las 30 zonas: `ZONAS`

`ZONAS: Record<GeoZone, GeoSignature>` tiene 31 filas: las 30 zonas con nombre más `generico`, que es la firma de un país sin territorio. Las 25 firmas del mapa 07 §3 se funden en 30 porque Italia, España y Francia son varias geografías cada una (125 de 310 carreras, `arquitectura.md` §3.5), `italia_sur` se separa de `italia_centro` porque el mapa 07 fila 3.4 describe colinas y muros para Toscana y Marcas y solo admite "puertos de 20 km salvo Abruzos" (los Abruzos, con Blockhaus, Prati di Tivo y Gran Sasso a 2.130 m, no caben en una zona `media`), y `montana_sur` se añade sin fila propia en el mapa (juicio del redactor, §6.2 lista de diferencias) porque Ruanda, Marruecos y Malasia tienen vueltas con etapas `mountain` en el calendario y ninguna fila del mapa las describe. Respecto del esqueleto (§A.2, decisión 12, §B.2), `GeoZone` gana un miembro (`'montana_sur'`) y la cifra pasa de "29 zonas" a "30 zonas, 31 filas", que es lo que dicen la cabecera, la sección 3 (§3.4) y la 16.

Reglas de lectura de la tabla, que son también las reglas del fichero:

- Todo rango es `[min; max]` y está CONTENIDO en el rango del motivo en `ARCH` (sección 12): `puerto.km ⊆ [9; 25]`, `puerto.g ⊆ [5; 12]`, `cota.km ⊆ [2,5; 8]`, `cota.g ⊆ [4; 8]`, `muro.km ⊆ [0,4; 2,5]`, `muro.g ⊆ [8; 16]`, `amplitud ≤ 2,4` (`ARCH.motivo`, sección 12 §12.1 y §12.2). El techo del muro es 2,5 y no 3 porque la sección 12 lo iguala a `STAGE.wallMaxKm` (§12.2, fila `motivo.muro.km`): por eso `cantabrico`, `levante` y `portugal` topan su muro en 2,5 aunque la fila 3.8 hable de muros vascos de 3 a 4 km, que la sección 12 anota como sacrificio. Lo que la geografía hace es estrechar, nunca ampliar; por eso Ghisallo (8,6 km) sale como 9,0 en `italia_norte` (el hueco [8,0; 9,0] asumido en la sección 12), Alto de Letras (80 km, fila 3.20) no existe en E1 (techo 25 km de `ARCH.motivo.puerto.km`) y Shibden Wall (250 m adoquinados, fila 3.18) tampoco (suelo 0,4 km de `ARCH.motivo.muro.km`).
- `null` significa "aquí no existe" y lo hacen cumplir V1 (puerto), V2 (adoquín) y V3 (tierra) sobre el perfil final, además de `admite(sk.requiere, geo)` sobre el esqueleto antes de dibujar (§6.5). `cota: null` es el pólder y el desierto de dunas: Flandes, norte de Francia. El Golfo y el cono sur tienen `cota` (Jebel Hafeet y los falsos llanos de la precordillera) aunque no tengan muro.
- `finalesAlto` es un solo valor con orden: `'largo'` implica que también existe el corto (`alto_corto` requiere `corto` o `largo`; `alto_largo` requiere `largo`); `'ninguno'` prohíbe `et_media_alto` y `et_reina_*` con meta en alto.
- `relieve` es el techo de la zona (`llano < ondulado < media < montana < alta`) y lo leen tres cosas. La columna `requiere` de la sección 5 (§5.2 y §5.3), donde `relieve: r` significa "`geo.relieve` ≥ r" (§5.1, `Requiere.relieve`): `ud_montana`, `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_montana_corta` y `et_cronoescalada` piden `'montana'`, `et_reina_encadenada` pide `'alta'` y una de las tres alternativas de `et_media_tendida` pide `'ondulado'`. `ARCH.reina.blandaShare[geo.relieve]` (§5.7 regla 1). Y la composición de la sección 7 (`admiteReina`: reina de vuelta solo en `cordillera` o en zona `montana`/`alta`, decisión 18). Por eso toda zona con `puerto` es `montana` o `alta` salvo `cono_sur` (`ondulado`), cuyo puerto solo lo usan `et_reina_blanda` y `ud_montana_alto`, los dos únicos esqueletos con puerto que no piden relieve. Una zona `media` con puerto tendría un dato que casi ningún esqueleto lee: `levante` sube a `montana` por esa razón (lista de diferencias, abajo). `et_reina_blanda` en `cono_sur` es la excepción escrita de §6.2 y §6.3.
- `viento` y `altitud` son METADATOS: viajan a `arch.metadatos` y a la ficha, y `altitud` además alimenta V4; ninguno llega al motor (§6.7).
- `pesos` multiplica `Skeleton.pesoBase` (sección 5); lo que no aparece vale 1; 0 prohíbe. Ningún peso distinto de 1 se escribe sobre un esqueleto que la zona no admite (el test (h) de §6.8 lo comprueba).
- `adoquin` tiene cuatro valores, y su semántica es la de la regla 4 de `validateMotif` (§4.5), la de V2 y V3 (§9.2) y la del `firme` de §5.2 (notación de la columna de motivos), que esta sección NO cambia: 0 nada; 1 "adoquín urbano", un METADATO como `viento` (llega a la ficha y no dibuja nada: ningún esqueleto pide `adoquin: 1`, un `sector` con `firme: 'adoquin'` exige `geo.adoquin ≥ 2` y un muro adoquinado exige `geo.muro.adoquin`, que el test (c) de §6.8 solo permite con `adoquin ≥ 2`); 2 sectores de cualquier longitud y estrellas, y muros adoquinados; 3 masivo (Flandes). Lo que dibuja sectores donde `adoquin < 2` es `sterrato`: el `firme` de un `sector` lo decide la zona con `firmeDe(geo)` (§6.5 punto 5), `'adoquin'` si `geo.adoquin ≥ 2` y `'tierra'` si no y `geo.sterrato`, tanto al instanciar como en la plantilla canónica, y `ud_adoquin_ligero` se admite con `[{ adoquin: 2 }, { sterrato: true }]` (§5.2, fila `ud_adoquin_ligero`). Por eso las filas `cobbles` que no están en Flandes ni en el norte de Francia caen en zonas con `sterrato` (test (d) de `regions.test.ts`, §6.8).

| Zona (fila mapa 07) | relieve | puerto km × %, forma | cota km × % | muro km × %, adoquín | adoquín | sterrato | viento | altitud | amplitud | finalesAlto | pesos (≠ 1) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `flandes` (3.1: BE, NL) | ondulado | null | null | [0,4; 2,2] × [8; 14], sí | 3 | no | 3 | mar | 0,55 | ninguno | ud_muros_adoquin 3, ud_muros 2, et_media_muro 2, et_llana_viento 2, ud_circuito 0,5 |
| `ardenas` (3.2: BE sur, LU) | media | null | [2,5; 4,5] × [5; 7] | [0,8; 2,0] × [8; 13], no | 1 | no | 1 | colina | 0,85 | corto | ud_muro_final 2, ud_montana_media 1,5, et_media_muro 1,5, et_media_alto 1,2 |
| `bretana` (3.13) | ondulado | null | [2,5; 3,0] × [5; 7] | [0,5; 2,0] × [8; 10], no | 1 | sí (tierra) | 3 | colina | 0,7 | ninguno | ud_circuito 1,5, ud_adoquin_ligero 1,5, et_llana_viento 1,5 |
| `francia_norte` (3.1, 1.4) | llano | null | null | [0,5; 1,5] × [8; 10], sí | 2 | no | 2 | mar | 0,55 | ninguno | ud_adoquin 3, ud_adoquin_ligero 2, ud_esprint 1,5, et_llana_viento 1,5 |
| `macizo_central` (3.14) | montana | [9; 17] × [6; 8], irregular | [2,5; 6] × [5; 7] | [1; 2] × [8; 12], no | 0 | no | 1 | media | 1,0 | largo | et_media_valle 1,5, et_media_alto 1,5, ud_montana_media 1,5, et_reina_alto_corto 1,2 |
| `alpes` (3.5: FR, IT, CH, AT) | alta | [12; 25] × [5,5; 8,5], regular | [4; 8] × [5; 7] | null | 0 | no | 0 | alta | 1,15 | largo | et_reina_alto_largo 2, et_reina_valle 1,3, et_reina_encadenada 1,2, et_llana 0,5 |
| `pirineos` (3.6: FR, ES, AD) | alta | [10; 17] × [7; 8,5], regular | [4; 8] × [6; 7] | null | 0 | no | 0 | alta | 1,15 | largo | et_reina_encadenada 2, et_reina_alto_largo 1,5, et_reina_alto_corto 1,2 |
| `provenza` (3.15) | montana | [11; 22] × [6,5; 7,5], regular | [2,5; 8] × [5; 7] | [1; 2] × [8; 9], no | 0 | no | 3 | media | 0,9 | largo | et_llana_viento 2, et_media_valle 1,3 |
| `italia_norte` (3.3) | montana | [9; 13] × [6; 8], irregular | [4; 8] × [4; 7] | [1; 2] × [10; 16], no | 1 | sí (tierra) | 0 | media | 1,0 | corto | ud_montana 2, ud_esprint_capi 2, ud_montana_media 1,5, et_reina_alto_corto 1,3, ud_sterrato 0,5 |
| `italia_centro` (3.4) | media | null | [2,5; 6] × [5; 7] | [0,5; 2,1] × [9; 14], no | 0 | sí | 1 | colina | 0,9 | corto | ud_sterrato 3, ud_muro_final 2, et_media_muro 1,5, ud_circuito 1,3 |
| `dolomitas` (3.7) | alta | [9; 14] × [7,5; 9], progresiva | [4; 8] × [6; 7] | null | 0 | no | 0 | alta | 1,15 | largo | et_reina_alto_corto 2, et_reina_encadenada 1,5, et_montana_corta 1,5 |
| `italia_sur` (3.4 Abruzos; Lazio, Calabria, Cerdeña) | montana | [9; 16] × [5; 8], progresiva | [2,5; 7] × [5; 7] | [0,5; 2] × [8; 12], no | 0 | no | 2 | media | 0,9 | largo | et_media_valle 1,3, ud_montana_media 1,3, et_reina_alto_largo 1,2 |
| `cantabrico` (3.8) | montana | [9; 15] × [7; 9], irregular | [3; 8] × [6; 7] | [1; 2,5] × [10; 15], no | 0 | no | 1 | media | 1,1 | largo | et_reina_alto_corto 2, et_media_muro 1,5, ud_montana 1,5, et_llana 0,3 |
| `meseta` (3.9) | ondulado | null | [3; 8] × [4; 6] | null | 0 | no | 3 | altiplano | 0,6 | corto | et_llana_viento 2, et_media_tendida 2, ud_esprint 1,5 |
| `andalucia` (3.10) | montana | [9; 20] × [6; 8], regular | [4; 8] × [5; 7] | [1; 2] × [8; 11], no | 0 | no | 2 | alta | 0,9 | largo | et_media_alto 1,5, et_reina_alto_largo 1,3, et_llana 1,2 |
| `levante` (3.11) | montana | [9; 22] × [5; 7], regular | [3; 6] × [6; 7] | [1; 2,5] × [10; 12], no | 0 | no | 1 | media | 0,9 | corto | et_media_alto 2, ud_muro_final 1,3, et_media_muro 1,2 |
| `portugal` (3.12) | montana | [9; 20] × [5; 7], regular | [3; 8] × [6; 7] | [1; 2,5] × [8; 10], no | 1 | no | 2 | media | 0,9 | largo | et_media_alto 1,3, et_reina_alto_largo 1,2, et_llana_viento 1,2 |
| `centroeuropa` (3.16) | montana | [9; 13] × [5; 8], regular | [2,5; 6] × [5; 7] | [1; 2] × [8; 10], no | 1 | no | 1 | colina | 0,85 | corto | et_media_valle 1,5, ud_circuito 1,3, et_media_alto 1,2, et_reina_alto_corto 1,2 |
| `escandinavia` (3.17) | ondulado | null | [2,5; 7] × [5; 7] | [0,5; 1,0] × [8; 10], no | 1 | no | 3 | mar | 0,6 | corto | et_llana_viento 2, ud_esprint 1,5, ud_circuito 1,3 |
| `britanicas` (3.18) | media | null | [2,5; 8] × [6; 7] | [0,4; 1,0] × [10; 16], no | 1 | sí (tierra) | 3 | colina | 0,9 | corto | ud_circuito 1,5, et_media_alto 1,3, et_media_muro 1,3 |
| `balcanes` (3.19) | montana | [10; 23] × [5; 7], regular | [3; 8] × [5; 7] | null | 0 | no | 2 | media | 0,9 | largo | et_reina_alto_largo 1,3, et_llana 1,2, et_media_valle 1,2 |
| `anatolia` (3.19: TR, CY, AZ) | montana | [11; 21] × [6; 7], regular | [3; 8] × [5; 7] | null | 0 | no | 2 | media | 0,8 | largo | et_reina_alto_largo 1,5, et_llana 1,5, et_llana_viento 1,2 |
| `andes` (3.20) | alta | [11; 25] × [5; 7], regular | [2,5; 8] × [5; 7] | null | 0 | no | 0 | altiplano | 1,0 | largo | et_reina_valle 2, et_reina_alto_largo 1,5, et_media_tendida 1,5, et_llana 0,3 |
| `cono_sur` (3.21) | ondulado | [9; 25] × [5; 6], regular | [4; 8] × [4; 6] | null | 0 | no | 3 | media | 0,6 | largo | et_llana_viento 2, et_llana 1,5, et_media_tendida 1,2, et_reina_blanda 1 |
| `norteamerica` (3.22) | montana | [10; 25] × [5; 9], regular | [2,5; 6] × [6; 7] | [0,4; 1,8] × [8; 10], no | 0 | no | 2 | media | 0,9 | largo | ud_circuito 2, et_media_alto 1,3, et_reina_alto_largo 1,2, et_llana 1,2 |
| `australia` (3.23) | ondulado | null | [2,5; 3,5] × [6; 7] | [0,5; 1,1] × [9; 11], no | 0 | no | 3 | colina | 0,7 | corto | ud_circuito 2, et_media_alto 1,5, et_llana_viento 1,5 |
| `asia_oriental` (3.24) | montana | [9; 14] × [6; 9], regular | [2,5; 5] × [6; 7] | [0,5; 1,5] × [8; 10], no | 0 | no | 1 | colina | 0,8 | corto | ud_circuito 2, et_llana 1,5, et_media_alto 1,2, et_reina_alto_corto 1,2 |
| `golfo` (3.25) | llano | null | [2,5; 7] × [5; 7] | null | 0 | no | 3 | mar | 0,4 | corto | et_llana_viento 3, et_llana 2, et_media_alto 1, et_media_valle 0,2 |
| `montana_sur` (sin fila; Genting de la 3.25; Atlas y Ruanda por juicio) | montana | [9; 22] × [5; 9], regular | [2,5; 8] × [5; 7] | [0,4; 1,5] × [8; 12], no | 1 | no | 1 | media | 1,0 | largo | et_reina_alto_largo 1,3, et_media_alto 1,3 |
| `africa_llana` (sin fila; juicio: BJ, BF, CM, MU, DZ) | ondulado | null | [2,5; 4] × [4; 7] | null | 0 | no | 2 | colina | 0,7 | corto | et_llana 1,5, ud_esprint 1,5, et_llana_viento 1,2 |
| `generico` (sin fila) | ondulado | null | [2,5; 6] × [4; 7] | [1; 2] × [8; 10], no | 0 | no | 1 | colina | 0,85 | corto | (todo 1) |

Diferencias respecto de la tabla de `arquitectura.md` §5.1, con su porqué, para que nadie las tome por erratas:

- `flandes` y `francia_norte` pasan a `cota: null`. En pólder no hay subidas de 2,5 km al 4 %; lo que hay son muros. Cauberg (1,2 km × 5,8 %) y Kwaremont quedan por debajo del suelo de 8 % de `ARCH.motivo.muro.g` y no se dibujan: es un sacrificio consciente de la sección 4, no de esta tabla.
- `meseta` y `britanicas` pierden el puerto: sus rangos de arquitectura ([6; 10] y [6; 9] km) casi no intersecan el suelo de 9,0 km. Navacerrada (10 × 6) y Bealach na Bà (9 × 6) se dibujan como `cota` de 8 km; Bola del Mundo (3 × 12) es `alto_corto`. `britanicas` lleva `muro.adoquin: false`: Shibden Wall (250 m) y Michaelgate (fila 3.18) están por debajo del suelo de 0,4 km del muro y son rarezas urbanas; el adoquín británico es `adoquin: 1`, metadato, y los sectores de Rutland-Melton (fila `cobbles`) salen de `sterrato`: `ud_adoquin_ligero` con `firme: 'tierra'`.
- `escandinavia` es una sola zona para Dinamarca y Noruega, cuando el mapa 07 fila 3.17 describe dos relieves. Se resuelve con `cota` hasta 7 km (los [3; 10] km noruegos) y `puerto: null` (Noruega no tiene reina: `cordillera: null` en §6.3); el coste es que una etapa danesa puede llevar una cota de 7 km, y la galería es donde se decide si duele.
- `portugal` sube a `montana` con `finalesAlto: 'largo'` porque la Torre (Estrela, de 20 a 30 km al [5; 6] %, fila 3.12) es la reina de la Volta y `cordillera` exige `montana` o `alta` (§6.8, test e).
- `italia_norte` gana `sterrato: sí` (tierra) y `adoquin: 1` (urbano) para que Veneto Classic, fila `cobbles` en Bassano ("tierra y adoquín urbano", mapa 07 §3 consecuencia 1), resuelva sin salirse del dato: la tierra la dibuja `ud_adoquin_ligero`, admitido por su alternativa `{ sterrato: true }` (§5.2, fila `ud_adoquin_ligero`) y rendido con `firme: 'tierra'` (§5.2, notación), y el adoquín urbano queda como metadato. Sin `sterrato`, con la columna `requiere` de §5.2 ningún candidato `cobbles` cabía en `italia_norte` y la fila bajaba a `classic` por `ESCALON_TERRENO` (§5.6 lo anotaba como caso conocido). El precio es que `ud_sterrato` (`sterrato` y `muro`) pasa a admitirse en `italia_norte`; lleva peso 0,5 para que sea raro sin desaparecer, porque la grava del Véneto existe. Con este cambio la nota de la fila `cobbles` de §5.6, el comentario del test de §5.9 que cuenta las filas que bajan (tope 1: solo `race-leon`) y el punto 4 de la comprobación de §16.7 ya no citan esa bajada, y el umbral del test (d) de `regions.test.ts` es `adoquin ≥ 2 || sterrato`. Los sectores de tierra de la canónica de `ud_adoquin_ligero` los garantiza `firmeDe` (§6.5 punto 5). Y `cota.g` baja a [4; 7] para que Cipressa (5,6 km al 4,1 %) y Poggio (3,7 km al 3,7 %, recortado a 4) sean dibujables donde están: `ud_esprint_capi` pide g [4; 5] y con el [6; 7] de arquitectura la intersección era vacía.
- `andes` abre `cota.km` a [2,5; 8] (era [5; 8]): `ud_montana` (hueco obligatorio `cota` de [2,5; 4,2] km) no cabía y el test (h) lo cazaba, y la cota opcional de las cronos (`et_crono`, `nc_crono`) se instanciaba siempre con `n = 0`; en Colombia hay repechos cortos antes de los puertos de 20 km.
- `levante` sube de `media` a `montana`. La fila 3.11 da puertos de 9 a 22 km (Sa Calobra 9,4 × 7, Puig Major 13,8 × 6, Aitana 22 × 5,9) con cimas de 1.100 a 1.550 m, y la columna `requiere` de §5 pide `relieve: 'montana'` (`'alta'` en `et_reina_encadenada`) a todos los esqueletos con puerto salvo `et_reina_blanda` y `ud_montana_alto`, que a cambio exigen `finalesAlto: 'largo'` (y `levante` es `corto`). Con `media`, el puerto de la zona era un dato que ningún esqueleto leía y `race-tramuntana` (Sóller → Sa Calobra, §6.4) no podía ser `ud_montana`. La consecuencia en vuelta: una etapa `reina_*` con zona `levante` se admite (la sección 7 da reina en zona `montana`) y sale `et_reina_alto_corto` (Xorret de Catí), `et_reina_valle` o `et_reina_cima_cerca`, nunca un final largo, porque `finalesAlto` sigue siendo `corto`.
- `provenza`, `anatolia` y `andes` bajan el suelo del `puerto` a 11 km (era 15). La meta de `et_reina_blanda` es un `alto_largo` de [9; 12] km (decisión 8, §5.3) y su `requiere` (`puerto`, `cota`, `finalesAlto: 'largo'`) la admite en las tres zonas; con suelo 15 su rango efectivo de meta era vacío (punto 3 de §6.5), la regla 1 de §5.7 la sortearía igual (0,25 en `montana`, 0,10 en `alta`) y los 8 intentos fallarían. Con 11 el rango efectivo es [11; 12]. Es juicio y va a la lista de revisión del dueño: la fila 3.19 describe "sierras de 10-25 km" (Učka 11 × 6) para Balcanes y Turquía, mientras que la 3.15 (Turini 15, Couillole 15,7) y la 3.20 ("15-80 km") empiezan en 15; aquí se asume que debajo de las subidas que esas filas nombran hay otras de 11 a 15 km.
- `golfo` pierde el jebel largo: `finalesAlto: 'corto'` y `puerto: null`. La razón es la decisión 13 de la síntesis, que sella en test "0 reinas en BE, NL, DK, AE, AU" y D8 (sección 18, aceptada por defecto): Jebel Hafeet (10,8 × 6,6) se dibuja como `alto_corto` de 7 km al 7 % sobre `cota` [2,5; 7]; Jebel Jais (20 km) no existe en E1 y se anota en la sección 17. `race-sharjah` (`.2`, 5 etapas, `flat`, `calendar.ts` l. 3373-3382; AE → `golfo`) conserva `calendar.test.ts` l. 248-255 ("crono y final en alto"): la garantía "final en alto en 4+" de `mixRoles` se conserva como regla (decisión 18), el papel `media_alto` lo rinde `et_media_alto` (admitido en `golfo` por su `requiere` `{ cota: true, cotaKmMin: 3.3, finalesAlto: 'corto' }`, §5.3, y dibujable porque su hueco `cota` de [3,3; 8,0] km cabe en el [2,5; 7] de la zona) con etiqueta `Uphill finish`, y el paso 7 lo comprueba. El redactor de la sección 7 pedía `puerto` no nulo en `golfo` para ese test: no hace falta y esta tabla no lo da; D8 en la sección 18 (§18.9, "La pregunta del Golfo") dice que aceptar "Golfo sin puerto" deja ese final como `alto_corto` de ≤ 7 km.
- `asia_oriental` topa el puerto en 14 km, porque su `altitud` es `colina` y V4 prohíbe `puerto ≥ 15 km` fuera de `{media, alta, altiplano}` (decisión 24). Los puertos de 20 a 40 km al [3; 4] % de Qinghai (fila 3.24) son `tendida`, no `puerto`. Sube a `montana` (Fuji Azami 11,4 × 10, Nongla 5 × 8, Taiwán KOM) para que JP, TW y CN puedan llevar `cordillera` (§6.3) y gana un muro de circuito ([0,5; 1,5] × [8; 10], la subida de Utsunomiya de la Japan Cup) para que `ud_circuito` 2 dibuje la Japan Cup con su muro y no con la alternativa de cotas de [2,5; 2,9] km (§5.2, fila `ud_circuito`).
- `centroeuropa` y `norteamerica` suben a `montana` (Krvavec 12 × 8 y Sölden 12 × 10,7 en la fila 3.16; Mount Baldy 20 × 7,4 y Snowbird 10 × 9 en la 3.22), y `norteamerica` a `finalesAlto: 'largo'` con `altitud: 'media'`, para que PL, CZ, SK, US y CA lleven cordillera: `race-czechia` tiene 3 etapas `mountain` de 4, `race-poland` 3 de 7 y `race-gila` 2 de 5 (`editions.ts`), y con relieve `media` las tres perdían todas sus reinas sin que D8 lo dijera.
- `cono_sur` es la corrección del bug AR/CL que señaló `juicios/ejecutabilidad.md` §2.2: la propuesta de geografía declaraba `cordillera: 'desierto_andino'` con `puerto: null` y relieve llano, y su propio test lo habría cazado. Aquí `cono_sur` es `ondulado`, con `puerto` [9; 25] × [5; 6] (Alto Colorado 20 × 5, Punta Negra, Farellones 30 × 6 topado a 25), `cota` [4; 8] × [4; 6] (los falsos llanos de la precordillera, sin los que `et_reina_blanda` no se puede instanciar: su hueco `cota`×[1; 2] es obligatorio, decisión 8) y `finalesAlto: 'largo'`, y AR y CL llevan `cordillera: null`. La única reina posible en un territorio sin cordillera es `et_reina_blanda` (kind `reina`, D+ [1.500; 2.500], `alto_largo` de [9; 12] km, que interseca `puerto.km` [9; 25] en [9; 12]), cuyo `requiere` es `{ puerto: true, cota: true, finalesAlto: 'largo' }`, sin relieve (§5.3, fila `et_reina_blanda`). Como la sección 5 (§5.7 regla 1) da `ARCH.reina.blandaShare` 0 en `ondulado` y la sección 7 (`admiteReina`) no da reina fuera de cordillera o zona `montana`/`alta`, hace falta una excepción escrita en las dos: si `Territorio.cordillera === null` y `ZONAS[z].finalesAlto === 'largo'`, la composición admite UNA reina por vuelta en esa zona y el esqueleto es siempre `et_reina_blanda`, porque es el único `reina` cuyo `requiere` no exige `relieve` (sección 7, §7.1 paso 4; no hace falta constante: no hay otro candidato). Hoy solo `cono_sur` cumple la condición. El test "AR y CL: ≤ 1 reina por vuelta, siempre `alto`" NO está en esta sección: vive en `grammar/tour.test.ts` (sección 7, paso 7 del plan), junto al de "ninguna reina en un país sin cordillera (BE, NL, DK, AE, AU)" (§7.7), y la sección 7 lo escribe; aquí, el test (g) de §6.8 sella que `admite(SKELETONS.et_reina_blanda.requiere, ZONAS.cono_sur)` es cierto y el (h) que sus huecos obligatorios y su meta caben. Para `golfo` esa puerta está cerrada por D8 (`finalesAlto: 'corto'`).
- `montana_sur` (MY, RW, MA) no tiene fila en el mapa 07 §3: las filas 3.24 y 3.25 son Asia y Golfo, y la 3.25 solo cita "Genting 20 × 6-9 (Malasia)". La firma es juicio del redactor sobre tres vueltas reales del calendario: `race-langkawi` (8 etapas, 3 `mountain`, meta en Genting Highlands, `raceRoutes.ts` l. 603), `race-rwanda` (`.1`, 8 etapas, `terrain: 'mountain'`, `calendar.ts` l. 3464-3472; Musanze, Mur de Kigali) y `race-morocco` (`.2`, 8 etapas `mountain`, l. 3514-3522; Oukaimeden a 2.600 m). `puerto` [9; 22] × [5; 9] con `altitud: 'media'` (V4 permite ≥ 15 km) y `adoquin: 1` (metadato) por el adoquín urbano de Kigali. Va a la lista de revisión del dueño con la marca "sin fila".
- `africa_llana` (BJ, BF, CM, MU, DZ) tampoco tiene fila en el mapa 07 y también es juicio: costa y sabana, `cota` corta y sin muro; Argelia entra aquí porque el Tour d'Algérie corre por la costa y no por el Tell.

### 6.3 Los territorios: `TERRITORIOS`

Un territorio es la ruta ordenada de zonas por las que pasa un país y la zona donde cae su reina. `ruta` es un recorrido plausible (la composición de la sección 7 toma una ventana contigua de ella con `ARCH.itinerario.avance` 0,6); `peso` NO lo lee `itinerarioDe` (sección 7, §7.1 paso 1: la ventana la ancla `RACE_REGION` y la elige el terreno, sin dado); solo lo lee `zonaDe`, que toma la zona de mayor peso y, en empate, la primera de `ruta`, sin sortear nada. `cordillera: null` es un veto estructural: el país no tiene etapa reina y su etapa decisiva es `media_alto` sobre una cota o `media_muro` (Benelux Tour, mapa 07 §2.2), con la única excepción de `et_reina_blanda` en zonas con `finalesAlto: 'largo'` (§6.2, `cono_sur`).

Regla de cobertura: los 56 países con carreras de equipos (mapa 02 §10, lista literal en el test) llevan fila escrita y el test exige que ninguno sea `fallback`. Se añaden 8 filas voluntarias para países cuya zona existe con nombre en `ZONAS` (AR, CL, NZ, IE, SE, FI, LV, QA; los ocho existen en `packages/shared/src/countries.ts`): 64 filas explícitas. Los 69 países restantes de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13, 133 entradas medidas con grep `^  { code:`) caen a `FALLBACK = { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }` y el test imprime cuántos (69) sin banda. La decisión 13 del esqueleto (§C.1) y §D.6 dicen "56 filas y 77 restantes": este documento la enmienda a 64 filas explícitas (56 obligatorias más 8 voluntarias) y 69 en `FALLBACK`, porque §D pide corregir el bug AR/CL con `cono_sur` y eso exige filas para AR y CL; las secciones 0, 3, 7, 15, 16, 17 y 19 usan 64/69. El fallback es deliberadamente mediocre: un país del que no se sabe nada produce carreras del montón, y la marca lo hace visible. Deducir el relieve de `PAIS_ZONA` de `climate.ts` (l. 66) se descarta porque `tropical` junta a Colombia con Benín (`geografia.md` §5.4).

| Países | `ruta` (zona × peso, en orden de recorrido) | `cordillera` |
| --- | --- | --- |
| FR | bretana 3, francia_norte 3, macizo_central 2, alpes 3, provenza 2, pirineos 2 | alpes |
| BE | flandes 4, ardenas 3 | null |
| NL | flandes 1 | null |
| LU | ardenas 1 | null |
| IT | italia_norte 3, dolomitas 2, italia_centro 3, italia_sur 2 | dolomitas |
| ES | cantabrico 3, meseta 3, andalucia 2, levante 3, pirineos 2 | pirineos |
| AD | pirineos 1 | pirineos |
| PT | portugal 1 | portugal |
| DE, HU | centroeuropa 1 | null |
| CZ, SK, PL | centroeuropa 1 | centroeuropa |
| AT, SI, CH | alpes 2, centroeuropa 2 | alpes |
| DK, EE, LT, SE, FI, LV | escandinavia 1 | null |
| NO | escandinavia 1 | null |
| GB, IE | britanicas 1 | null |
| HR, BA, RS, RO, BG, AL, XK, GR | balcanes 1 | balcanes |
| TR, CY, AZ | anatolia 1 | anatolia |
| CO, EC, VE, GT | andes 1 | andes |
| AR, CL | cono_sur 1 | null (reina blanda por excepción, §6.2) |
| US, CA | norteamerica 1 | norteamerica |
| AU, NZ | australia 1 | null |
| JP, TW, CN | asia_oriental 1 | asia_oriental |
| KR, TH, IN | asia_oriental 1 | null |
| MY, RW, MA | montana_sur 1 | montana_sur |
| AE, SA, OM, QA | golfo 1 | null |
| BJ, BF, CM, MU, DZ | africa_llana 1 | null |
| los otros 69 de `COUNTRIES` | `FALLBACK` | null |

Consecuencias que conviene leer en voz alta antes de aceptarlas. D8 (§C.2) dice "Vueltas belgas, neerlandesas, danesas, del Golfo y australianas sin reina"; esta tabla lo extiende, y la sección 18 (§18.9) reescribe D8 con la lista completa para que el dueño decida con la cifra delante: son 12 filas y 30 países (BE, NL, LU, DE, HU, DK, EE, LT, SE, FI, LV, NO, GB, IE, AR, CL, AU, NZ, KR, TH, IN, AE, SA, OM, QA, BJ, BF, CM, MU, DZ). Las ediciones reales que pierden etapas `mountain` por ello (contadas en `editions.ts` con `RACE_COUNTRY`): `race-britain` 1 de 6, `race-emirates` 2 de 7, `race-hungary` 1 de 5, `race-oman` 1 de 5 y `race-thailand` 1 de 6 (6 etapas en 5 ediciones, que salen `media_alto`), más `race-fleche-sud` (LU, 5 etapas por `stageMix` con `terrain: 'mountain'`). Al revés, con cordillera nueva respecto del borrador anterior conservan sus reinas `race-czechia` (3 de 4), `race-poland` (3 de 7), `race-gila` (2 de 5), `race-kumano` (1 de 4), `race-guangxi` (1 de 6), `race-qinghai` (1 de 8), `race-langkawi` (3 de 8) y `race-rwanda` (1 de 8). Otras dos consecuencias: una vuelta colombiana no tiene etapa llana de pólder (`andes` lleva `viento: 0` y `et_llana_viento` exige `{ viento: 2 }`, §5.3: el papel `llana_viento` baja a `llana`); una vuelta argentina tiene como mucho un final largo por edición.

```ts
// packages/engine/src/routes/grammar/geo.ts
export const FALLBACK: Territorio = { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }
export function territorioDe(country: string | null): Territorio   // TERRITORIOS[country] ?? FALLBACK; null (banco sin país) da FALLBACK
export function zonaDe(country: string | null): GeoZone
// = la zona de mayor `peso` de territorioDe(country).ruta; empate: la primera en `ruta`; `generico` si fallback.
// zonaDe('FR') = 'bretana', zonaDe('ES') = 'cantabrico', zonaDe('BE') = 'flandes', zonaDe('CO') = 'andes'.
```

`zonaDe` solo la usan los 532 nacionales (§6.6) y `regionOf` como último recurso; el test de §6.8 prohíbe que una carrera de equipos llegue a ella.

### 6.4 `RACE_REGION`: la zona de cada carrera y de cada etapa

`RACE_REGION: Record<string, RaceRegion>` (`grammar/regions.ts`) tiene exactamente las 310 claves de `RACE_ROUTES`. Sustituye al sorteo `geo|${raceId}` que proponía `arquitectura.md` §3.5 para FR, IT y ES (retirado por la decisión 14: un sorteo pone Lombardía en los Dolomitas una temporada de cada tres) y a la columna `RaceRow.geo` que proponían arquitectura §5.3 e ingeniero §5.2. `RaceRow` (`calendar.ts` l. 381-397) NO cambia: ninguna fila de las tres tablas declara `country` (grep `country: '` sobre `calendar.ts`: 0) y las 310 sacan el país de `RACE_COUNTRY` por id (l. 566-884, 310 entradas, 56 países distintos); `RACE_REGION` sigue el mismo patrón, tabla por id en fichero aparte.

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>   // índice 1-based; solo las 60 ediciones y solo donde difiere de default
  skeleton?: SkeletonId              // carrera de un día con meta real en un puerto o muro: único candidato si admite(SKELETONS[skeleton].requiere, geo)
  duda?: true                        // la ciudad no se reconoció o el dato se contradice: se imprime, no veta
}
export const RACE_REGION: Record<string, RaceRegion>
export function regionOf(raceId: string, stageIndex: number, country: string | null): GeoZone {
  return RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
}
/** Los 20 ids con `terrain: 'cobbles'` en las tablas de calendar.ts (grep), `race-leon` incluida: una sola lista para el test (d) de §6.8 y la galería (sección 16). */
export const COBBLES_IDS: readonly string[]
```

`skeleton` existe porque la zona no fija la arquitectura: el esqueleto sale del sorteo `arch|raceId|i` (sección 5, §5.7) y `ud_montana_alto` pesa 60 × 0,02 = 1,2 frente a 48 + 12 + 5 en `.1`, así que Nice → Isola 2000 (`race-mercantour`, `raceRoutes.ts` l. 698) sería en el 98 % de los mundos una `ud_montana` que baja del puerto y acaba en un valle, con la ficha diciendo "ciudades y distancia reales". La regla vive en `elegirEsqueleto` (§8.2) y no en `candidatos`, porque `candidatos` (§5.7) recibe una `Peticion` sin `raceId`; §8.2 la escribe como paso 1 bis, entre `fixed.skeleton` (paso 1) y `candidatos` (paso 2), sin tirada de `arch` y antes de la reina blanda: si `req.role === 'un_dia'`, `req.routeSource === 'generado'` y `id = RACE_REGION[req.raceId]?.skeleton` existe con `admite(SKELETONS[id].requiere, req.geo)`, `ARCH.pesoPorClase[id][req.raceClass] > 0` y `SKELETONS[id].km[0] ≤ ARCH.km.maxPorClase[req.raceClass]` (las tres condiciones de `cabe` en `candidatos`), entonces `sk = skeletonFor(id, req.geo)` sin tirada, igual que con `fixed.skeleton`; si alguna falla, se ignora, se anota en `arch.frase` y sigue el paso 2. `race-huy` (`.2`) y `race-mercantour` (`.1`) cumplen las tres: `ud_muro_final` pesa 0,5 en `.2` y su `km[0]` es 180, que es `maxPorClase['2']` (§5.6 y §12.7), y `ud_montana_alto` pesa 0,02 en `.1` (§5.6). Solo se cura para carreras de un día (el test (c) de §6.8 lo exige) y solo cuando la meta de `RACE_ROUTES` es un puerto o un muro con nombre: en la misma tarde que `default`. D1 (sección 18) pasa a leerse "rareza al 0,02 más las carreras con meta en puerto real atadas por `skeleton`"; la sección 18 (§18.2) y la sección 3 (§3.5, `RaceRegion.skeleton`) lo recogen.

**Procedimiento de curación** (es contenido, no diseño: `datos.md` §5.2). Dueño operativo: el implementador del paso 2; dueño del contenido: el dueño del repositorio, que revisa con la galería (sección 16). Presupuesto: dos sesiones (310 `default` a un minuto cada uno con `raceRoutes.ts` abierto, y 383 etapas de edición a medio minuto, mapa 02 §7 corregido en la sección 7). Condición de cierre del paso 2: `duda` ≤ 20 y ninguna en las 60 ediciones; las dudas restantes se cierran con la galería del cierre del paso 5 (sección 16 §16.7) antes del paso 8.

1. Para cada una de las 310 claves de `RACE_ROUTES`, en orden alfabético, se lee la localidad de META de la primera etapa (`stageEndpoints(id, 1)`, `raceRoutes.ts` l. 1167) y se escribe `default` con un comentario de una línea que nombre la ciudad o el puerto que decide ("Oyonnax: Jura" para `race-ain`). Si salida y meta son de zonas distintas manda la meta. Si la meta es un puerto o un muro con nombre y existe un esqueleto de un día que acaba ahí (`ud_montana_alto`, `ud_muro_final`), se escribe `skeleton`.
2. Para las 60 carreras de `RACE_EDITIONS` (`editions.ts` l. 25) se abre la edición y se escribe `stages` SOLO para las etapas cuya zona difiere de `default`, con la meta de cada etapa como criterio. Cuando la primera etapa es la excepción (una salida en el llano de una vuelta andina) manda la mayoría de las metas de la edición para `default` y la primera va a `stages`. Las etapas con rasgos (`STAGE_FEATURES`) no lo necesitan (son `real`), pero se rellenan igual para que la ficha diga la zona; las 226 sin rasgos lo necesitan porque su relieve se dibuja con la firma de esa zona (sección 11).
3. Si una ciudad no se reconoce se pone `zonaDe(country)` a mano y se marca `duda: true` con el comentario `// DUDA:`; el test cuenta las dudas y las imprime, sin banda. Si el dato se contradice (`race-leon`, §6.1) también es `duda: true` y manda el país y las ciudades, no el nombre. La galería (sección 16) enseña las 20 carreras `cobbles` reales al lado de su equivalente generado y una página por zona: es ahí donde una zona mal puesta se ve.

Ejemplos obligados (ciudades de `raceRoutes.ts`, medidas en la lista de 310 claves). El esqueleto §D cita "`race-fleche` → ardenas": ese id no existe; la Flecha Valona es `race-walloon-wall` (WT, `calendar.ts` l. 1086-1094, Namur → Huy, `raceRoutes.ts` l. 1139) y tiene recorrido REAL en `classicRoutes.ts` l. 249 y 713, así que nunca pasa por la gramática y su fila de `RACE_REGION` solo sirve a la ficha; `race-huy` (Charleroi → Huy, `.2`, `terrain: 'mountain'`, l. 2166-2173) es la carrera generada con meta en el Mur de Huy. Las secciones 4 (§4.7, que escribe la Flèche como `ud_muro_final` generada: es un ejemplo de escritura de una carrera real, no una etapa que el calendario genere), 15 y 19 deben usar estos dos ids.

| Carrera | Ciudades (`RACE_ROUTES`) | `default` | Por qué |
| --- | --- | --- | --- |
| `race-liege` | Liège → Liège | ardenas | fila 3.2 |
| `race-walloon-wall` | Namur → Huy | ardenas | real (`classicRoutes.ts`), la fila solo etiqueta |
| `race-huy` | Charleroi → Huy | ardenas, `skeleton: 'ud_muro_final'` | Mur de Huy 1,3 × 9,6; sin `skeleton`, `mountain` en `ardenas` (`puerto: null`) bajaría a `hilly` y saldría `ud_muros` |
| `race-flanders` | Antwerpen → Oudenaarde | flandes | fila `cobbles` |
| `race-roubaix` | Compiègne → Roubaix | francia_norte | fila `cobbles`, `adoquin` 2 |
| `race-tours` | Chartres → Tours | bretana | fila `cobbles` por los chemins de vigne de tierra del Loira; `bretana` es la firma más cercana (tierra, côtes de 1 km, viento) y no hay zona propia en E1; `francia_norte` lo convertiría en pavé |
| `race-leon` | Leon → Leon | meseta, `duda: true` | conflicto de dato (§6.1): cae por `ESCALON_TERRENO` de `cobbles` a `classic` (sección 5) |
| `race-amstel` | Maastricht → Valkenburg | flandes | Limburgo: bergs (fila 3.1) |
| `race-lombardy` | Como → Bergamo | italia_norte | fila 3.3 |
| `race-sanremo` | Milano → Sanremo | italia_norte | Cipressa y Poggio son `cota` al [4; 5] % (sección 5) |
| `race-white-roads` | Siena → Siena | italia_centro | `sterrato` |
| `race-abruzzo` | Pescara → Vasto | italia_sur | Blockhaus |
| `race-jura` | Lons-le-Saunier → Les Rousses | macizo_central | el caso v40 (sección 9); Jura y Vosgos se asignan a `macizo_central` como proxy de media montaña continental (no hay zona propia en E1) |
| `race-mercantour` | Nice → Isola 2000 | alpes, `skeleton: 'ud_montana_alto'` | meta real en la cima (D1) |
| `race-alpes-maritimes` | Nice → Nice | provenza | prealpes de Niza, fila 3.15 |
| `race-bretagne` | Hirel → La Fresnais | bretana | fila 3.13 |
| `race-tramuntana` | Sóller → Sa Calobra | levante | Sa Calobra 9,4 × 7 se baja hasta la cala: `ud_montana` con `descenso_meta` |
| `race-basque-country` | Bilbao → Bilbao | cantabrico | muros vascos (fila 3.8: [1; 4] km al [10; 15] %, topados a 2,5 km por `ARCH.motivo.muro.km`) |
| `race-asturias` | Oviedo → Llanes | cantabrico | fila 3.8 |
| `race-andalusia` | Benahavís → Pizarra | andalucia | fila 3.10 |
| `race-castilla-leon` | Valladolid → Segovia | meseta | fila 3.9 |
| `race-down-under` | Tanunda → Tanunda | australia | Willunga 3 × 7,5 |
| `race-colombia` | Yopal → Yopal | andes, `stages: { 1: 'generico' }` | fila 3.20; Yopal está en los Llanos a 350 m y la e1 es `flat` (`editions.ts` l. 278): la mayoría de metas de la edición (Alto del Porvenir, La Línea, Alto del Vino) es andina |
| `race-langkawi` | Shah Alam → Kampar (e1) | montana_sur | Genting Highlands (e5, `raceRoutes.ts` l. 603) |
| `race-emirates` | Madinat Zayed → Liwa | golfo | fila 3.25 |
| `race-quebec`, `race-montreal` | Québec, Montréal | norteamerica | `ud_circuito` ×2 |

**La forma por etapa**, con `race-france` como se lee en `editions.ts` l. 26-50 (salida en Barcelona, 21 etapas): `default: 'francia_norte'` (Bordeaux, Bergerac, Nevers, Chalon-sur-Saône, París son llano de fila 3.1 y 1.4) y `stages: { 1: 'levante', 2: 'levante', 3: 'pirineos', 4: 'pirineos', 6: 'pirineos', 9: 'macizo_central', 10: 'macizo_central', 13: 'macizo_central', 14: 'macizo_central', 15: 'alpes', 16: 'alpes', 17: 'alpes', 18: 'alpes', 19: 'alpes', 20: 'alpes' }`. Así la etapa 6 (Pau → Gavarnie-Gèdre, `terrain: 'mountain'`, l. 34) se dibuja con puertos pirenaicos de [10; 17] km al [7; 8,5] % y no con la firma de Francia entera; la 13 y la 14 (Belfort, Le Markstein: Vosgos) van a `macizo_central` como proxy, igual que el Jura; y la 19 y la 20 (Alpe d'Huez dos veces) con `alpes`. Segundo ejemplo que muestra que la zona no es el país: `race-italy` sale de Bulgaria (Nessebar → Burgas, `editions.ts` l. 52-55): `stages: { 1: 'balcanes', 2: 'balcanes', 3: 'balcanes' }` y el resto por la bota, con `default: 'italia_sur'` para las etapas de Calabria y Campania y `stages` en `italia_centro`, `italia_norte` y `dolomitas` según la meta. Una etapa de edición sin `stages` toma `default`; nunca `zonaDe(country)`.

**Lo que `RACE_REGION` cambia en el país que ya existe:** nada en `RaceRow`, nada en `RACE_COUNTRY`, nada en `RACE_ROUTES`, nada en `climate.ts`. La nota de `climate.ts` l. 15-19 ("cuando el calendario sepa la REGIÓN de cada carrera, esto se afina sin tocar nada más") queda respondida con un gancho y no con un cambio: `regionOf` es esa región, y el clima podrá leerla en un encargo posterior sin que E1 lo toque.

### 6.5 Cómo entra la geografía en el generador

La firma que recibe `generateStage` es `req.geo = ZONAS[regionOf(raceId, stageIndex, country)]` (sección 8, paso de identidad). A partir de ahí la geografía actúa en cinco sitios y solo en cinco:

1. **Disponibilidad**: `admite(sk.requiere, geo)` filtra el catálogo antes del sorteo `arch|raceId|i` (`candidatos`, §5.7). El tipo `Requiere` (con `Skeleton.requiere?: Requiere | Requiere[]`, donde una lista son alternativas) y la firma `admite(requiere: Requiere | Requiere[] | undefined, geo: GeoSignature): boolean` son los de §5.1, y esta sección no los redeclara: un solo tipo y una sola firma en todo el documento, con `requiere` primero, que es como la escriben también la sección 2 (§2.3), la 5 en `candidatos` (§5.7) y la 16 (galería, §16.2). La sección 3 declara el tipo en `skeletons.ts` (§3.3) y la función en `geo.ts` (§3.4) con esta misma forma, la 8 la llama `admite(sk.requiere, req.geo)` (§8.2) y los tests de §6.8 están escritos con `admite(sk.requiere, geo)`. `admite` vive en `grammar/geo.ts` y trae el tipo con `import type { Requiere } from './skeletons.js'`; §B.1 la lista entre los exports de `geo.ts`. La semántica de cada campo es la de sus comentarios en §5.1: `puerto`, `cota` y `muro: true` exigen el motivo no nulo; `muro: { adoquin: true }` exige además `geo.muro.adoquin`; `cotaKmMin: n` exige `geo.cota !== null && geo.cota.km[1] ≥ n`; `cotaCortaMax: n` exige `geo.cota !== null && geo.cota.km[0] ≤ n` (solo la variante con cotas de `ud_circuito`); `adoquin`, `viento` y `relieve` son mínimos (`≥`, con `llano < ondulado < media < montana < alta` para el relieve); `sterrato: true` exige `geo.sterrato > 0`; `finalesAlto: 'corto'` se cumple con `corto` o `largo`, y `'largo'` solo con `largo`; `altitud` es igualdad; un campo ausente no exige nada y `requiere` ausente siempre cabe. Los valores por esqueleto están en la columna `requiere` de §5.2 y §5.3, que es la única lista del documento: esta sección no la copia ni la resume.

   `admite` solo mira `requiere`. Que un esqueleto admitido se pueda además DIBUJAR en la zona (que cada hueco obligatorio de puerto, cota o muro tenga su motivo y un rango de km no vacío, que la meta quepa según el punto 3 y que un `sector` obligatorio tenga algún `firme`) no se comprueba en tiempo de ejecución: es una propiedad de las dos tablas, `ZONAS` y `SKELETONS`, que el test (h) de §6.8 sella para todos los pares. Al cruzarlas al corregir esta sección (la semántica de §5.1 aplicada a las 31 filas de §6.2 y a la columna `requiere`, con un script como `borrador/galeria-celdas.mjs`) salieron ocho pares (zona, esqueleto) que `requiere` admite y no se pueden dibujar. Cinco se corrigieron en la sección 5, porque el hueco obligatorio faltaba en `requiere` (`ud_muro_final` en `flandes` y `francia_norte`; `ud_esprint_capi` y `et_media_tendida` en `bretana`): son tres enmiendas a esa columna, que §5.2 y §5.3 ya llevan (la nota que sigue a la tabla de §5.3 las enumera):
   - `ud_muro_final`: `{ muro: true }` pasa a `{ muro: true, cota: true }`. Su hueco `cota`×[1; 3] es obligatorio y `flandes` y `francia_norte` tienen `cota: null`; sin la enmienda el propio test "bien formado" de §5.9 fallaba en esa fila. Hacer opcional el hueco no sirve: sin cotas no se llega al D+ mínimo de 1.500 m. El precio es que Nokere, que la columna "Referencia" cita, no sale como `ud_muro_final` en `flandes`.
   - `ud_esprint_capi`: `{ cota: true }` pasa a `{ cota: true, cotaKmMin: 3.3 }`. Su hueco `cota`×[2; 3] mide [3,3; 5,6] km y `bretana` da [2,5; 3,0].
   - `et_media_tendida`: cada una de sus tres alternativas gana `cotaKmMin: 3.3`, por la misma razón (hueco `cota`×[1; 2] de [3,3; 8,0] km; `bretana` entraba por la alternativa `{ cota: true, relieve: 'ondulado' }`).

   Los otros tres (`et_reina_blanda` en `provenza`, `anatolia` y `andes`, con la meta fuera del puerto de la zona) se corrigen en esta tabla. En total el cruce obligó a tres cambios de datos, que la lista de diferencias de §6.2 explica: `provenza`, `anatolia` y `andes` bajan el suelo del puerto a 11 km, `levante` sube a `montana` (su puerto no lo leía ningún esqueleto) e `italia_norte` gana `sterrato` (Veneto Classic no tenía candidato `cobbles`). También obligó a quitar dos pesos que caían sobre esqueletos no admitidos: `et_llana_viento` en `andes` (0) y en `montana_sur` (0,5), cuyo `viento` 0 y 1 no llega al `{ viento: 2 }` de §5.3.

2. **Degradación**: si el papel pedido no tiene ningún esqueleto admitido en `geo`, `candidatos` (§5.7) baja UN escalón por `ESCALON_ROLE` y vuelve a filtrar; siempre hacia abajo, nunca hacia arriba (un país llano no gana puertos), y se anota en `arch.frase` ("pedía reina; en flandes no hay puerto: media con muro"). La tabla de escalones es `ESCALON_ROLE` de §5.7, la única del documento, con su función `degradarPapel(role: StageRole): StageRole | null` en `skeletons.ts` (§5.7); esta sección no la repite ni la resume. Para `un_dia` el escalón es `ESCALON_TERRENO` de la misma sección (`cobbles → classic → hilly → flat`, `mountain → hilly`); `terrain` de la fila es sesgo (`SESGO_TERRENO`, §5.6) y nunca orden: `terrain: 'mountain'` en Dinamarca (`escandinavia`, `puerto: null`) no llega a bajar, porque de sus candidatos caben `ud_montana_media` (×1, cota de hasta 7 km) y `ud_circuito` con muros (×0,25), y la ficha dice `Hills` o `Circuit`, no montaña. Hay tres funciones de degradación con tres nombres, los de §5.7 y de la sección 2 (§2.3): `degradarPapel(role)` para papeles (`skeletons.ts`), `degradar(relieve: Relieve): Relieve` para la cadena de la decisión 12 (`alta → montana → media → ondulado → llano`, `geo.ts`, §3.4) y `degradarMotivo(kind: MotifKind, geo: GeoSignature): MotifKind` para huecos (`puerto → cota → muro → enlace`, §8.5, `geo.ts`). Ninguna de las tres es `arch.degradado`, que marca la caída a la plantilla canónica tras `ARCH.colocacion.maxIntentos` (sección 8).

3. **Rangos**: cada motivo instanciado sortea en el rango EFECTIVO `[max(lo_esqueleto, lo_zona); min(hi_esqueleto, hi_zona)]` de `Slot.params.kmRango` y `gRango` contra `geo.puerto`, `geo.cota` o `geo.muro` según el motivo. La intersección NO está garantizada por construcción (los `params` del esqueleto no son subconjuntos de los de la zona: `ud_esprint_capi` pide g [4; 5] y `alpes` da [5; 7]), y por eso la regla es esta. Si el rango efectivo de `km` quedara vacío en un hueco con `n[0] ≥ 1` o en la meta, el esqueleto no se podría dibujar en esa zona; eso no lo resuelve `admite` en tiempo de ejecución sino las tablas: el test (h) de §6.8 exige rango no vacío en todo par (zona, esqueleto admitido), y si falla se edita una fila de `ZONAS`, un rango del esqueleto o su `requiere` (punto 1). Con `fixed.skeleton` (galería), el hueco lo degrada `degradarMotivo` (§8.5) y los vetos lo dicen. Si queda vacío en un hueco opcional (`n[0] = 0`), el hueco se instancia con `n = 0` y se anota; si queda vacío solo en `g`, manda el rango del ESQUELETO (la pendiente es identidad del esqueleto: Poggio al 4 % es Poggio) y se anota. La meta se compara con su rango propio, que es `sk.metaParams.cotaFinal.km` si el esqueleto lo declara y si no el de `ARCH.meta` (claves camelCase de la sección 12, §12.1: `muro`, `altoCorto`, `altoLargo`; `alto_largo` es el `MetaKind`, no la clave), así: `alto_largo` contra `geo.puerto`; `alto_corto` contra `geo.cota` (contra `geo.puerto` si `geo.cota === null`); `muro_meta` contra `geo.muro`; `cima_cerca`, `descenso_meta` y `valle` de un esqueleto de ETAPA contra el motivo de su último hueco obligatorio (`puerto` en las reinas, `cota` en las medias); en un esqueleto de un día esas tres no se comparan, porque su `cotaFinal` se sortea en `ARCH.meta.unDiaUltimaCota` y no en la zona (§5.1 regla 2); `esprint`, `repecho` y `sector_meta` no se comparan (un repecho de ≤ 2,9 km cabe bajo cualquier cota; el sector lo cubre `adoquin`). El test (h) de §6.8 comprueba, para cada par (zona × esqueleto admitido), que los huecos obligatorios y la meta tienen rango efectivo de `km` no vacío, y sella dónde ha hecho falta ampliar la zona (`italia_norte.cota.g`, `andes.cota.km`, §6.2) o el esqueleto: `et_crono` y `nc_crono` pasan a `cota` de km [2,5; 5] y g [4; 6] (eran [2,5; 3] × [4; 5]: el hueco es opcional y no falla, pero en `alpes`, `pirineos`, `dolomitas`, `andalucia` e `italia_norte`, cuya cota empieza en 4 km, se instanciaba siempre con `n = 0`; enmienda ya aplicada en §5.2 y §5.3). `forma` del puerto es la de la zona salvo que el esqueleto la fije.

4. **Pesos y relleno**: el peso de un candidato es la fórmula única de §5.6, `pesoBase × SESGO_TERRENO[terrain][id] × ARCH.pesoPorClase[id][raceClass] × (geo.pesos[id] ?? 1)`, y la geografía solo pone el último factor (columna `pesos` de §6.2, que §5.6 no repite); `amplitud` es la ondulación de todo `enlace` (tope `ARCH.motivo.enlace.ampMax` 2,4, que garantiza que ningún relleno alcance el 3 % que `finish.ts` lee como cota) y sustituye al `bumpy` binario de `rolling` (`profileGen.ts` l. 105) y a `RELIEF.rollingAmplitude` para lo generado; `featureProfile.ts` sigue con `RELIEF` (decisión 27). Con `amplitud` 0,55 una llana belga de 180 km pasa de los 661 a 1.413 m de relleno de hoy (mapa 01 §1) a unos 300 a 700, que es lo que Brugge-De Panne acumula.

5. **Vetos V1 a V4** (sección 9), sobre el perfil final y no sobre la intención, con el texto de la tabla de la sección 9 (§9.2) y de la regla 4 de `validateMotif` (§4.5), que esta sección no cambia: V1 ningún `puerto` (segmento con `climbSize ≥ 8,5`) donde `geo.puerto === null`; V2 ningún `sector` con `firme: 'adoquin'` si `geo.adoquin < 2` y ningún `muro` con `adoquin: true` si `geo.adoquin === 0` (§9.2); V3 ningún `sector` con `firme: 'tierra'` si `!geo.sterrato` (§9.2); V4 `alto_largo` solo con `finalesAlto: 'largo'` y ningún `puerto ≥ 15 km` fuera de `altitud ∈ {alta, altiplano, media}`, con el desnivel de un solo puerto integrado por tramos. La tabla no puede dispararlos, y cada garantía tiene nombre. V1 y la primera mitad de V4 las da `requiere`: todo esqueleto con puerto obligatorio pide `puerto` y todo esqueleto con meta `alto_largo` pide `finalesAlto: 'largo'` (columna de §5.2 y §5.3). V2 y V3 las dan tres cosas juntas. La primera, `requiere`: `ud_adoquin` pide `adoquin: 2`, `ud_muros_adoquin` pide `adoquin: 2` y `muro: { adoquin: true }`, `ud_sterrato` pide `sterrato` y `ud_adoquin_ligero` pide `adoquin: 2` o `sterrato`. La segunda, el test (c) de §6.8, que solo permite un muro adoquinado en zonas con `adoquin ≥ 2`. La tercera, el `firme`, que lo decide la zona con una sola función de `geo.ts`, escrita aquí porque hasta ahora la regla estaba en prosa en tres sitios (§5.2, §4.5 regla 4 y §8.5) y en ninguno llegaba a la plantilla canónica:

   ```ts
   // packages/engine/src/routes/grammar/geo.ts
   import type { Motif } from './motifs.js'   // solo tipo: motifs.ts ya importa degradarMotivo de aquí
   /** El firme que la zona da a un `sector`: 'adoquin' si geo.adoquin ≥ 2; si no, 'tierra' si geo.sterrato; si no, null (el hueco degrada a enlace, §8.5). */
   export function firmeDe(geo: GeoSignature): 'adoquin' | 'tierra' | null
   /** Copia de una plantilla en la que todo `sector`, a cualquier profundidad de `hijos` (racimo, circuito, sector_meta), cuyo firme
    *  la zona no admite ('adoquin' con geo.adoquin < 2, 'tierra' sin geo.sterrato) lleva firmeDe(geo). Si firmeDe(geo) es null lo deja
    *  como está: V2 o V3 lo dirán, y el test (h) de §6.8 impide que ocurra con un esqueleto admitido. Pura, sin RNG. */
   export function conFirmeDeZona(motivos: readonly Motif[], geo: GeoSignature): Motif[]
   ```

   La llaman dos sitios. `instanciar` (§8.5) pone `firme = sl.params?.firme ?? firmeDe(req.geo)` en cada `sector` (el `firme: 'tierra'` fijo de `ud_sterrato` manda, y ese esqueleto solo se admite con `sterrato`). Y `canonica` (§8.11), enmendada aquí: la plantilla elegida pasa por `conFirmeDeZona(plantilla, req.geo)` antes de recorrerla y rendirla. Hoy solo le pasa a `ud_adoquin_ligero`: su canónica escribe los sectores con `S()` y el `firme` por defecto `'adoquin'` (§5.4), y las zonas que la admiten por `{ sterrato: true }` (`bretana`, `italia_norte`, `italia_centro`, `britanicas`) la verían vetada por V2 en `race-veneto-classic` y `race-rutland`, justo en la caída que `ARCH.veto.fallbackMaxShare` exige a 0 en el calendario. Con la reescritura los sectores salen de tierra, a 2 o 3★ (§8.7, fila `sector`). El test de la canónica de §5.9 no lo caza, porque solo prueba la zona de referencia de cada esqueleto y la de `ud_adoquin_ligero` es `francia_norte` (`adoquin` 2); lo sella el test (i) de §6.8, que pasa `conFirmeDeZona` sobre la canónica y las alternativas de todo esqueleto admitido en toda zona. §3.4 declara `firmeDe` y `conFirmeDeZona` entre los exports de `geo.ts`, y §8.5 y §8.11 las llaman. La segunda mitad de V4 la dan el test (d) de §6.8 (ninguna zona con puerto de 15 km o más fuera de esas altitudes) y el rango efectivo del punto 3, que nunca sortea un puerto por encima del techo de la zona. Los vetos existen para que un cambio futuro en la colocación o un `fixed.skeleton` no los deje sin red.

Lo que la geografía NO hace: no elige el papel de la etapa (eso es la composición, sección 7), no mueve `km` (eso es `ARCH.km.porClase`), no toca `Segment` y no cambia entre ediciones (`GeoZone` es identidad, decisión 20).

### 6.6 Los nacionales por zona

Los 532 campeonatos son 133 países × 4 pruebas (`calendar.ts` l. 349-360: `cc = code.toLowerCase()` en l. 349 y las cuatro pruebas en l. 351-360, `nc-${cc}-road` con `classic(220)`, `nc-${cc}-u23-road` con `classic(180)`, `nc-${cc}-itt` con `itt(38)`, `nc-${cc}-u23-itt` con `itt(30)`; los ids van en minúsculas), hoy idénticos salvo la semilla. Con esta sección `nationalChampionships` llama a `generateStage` con `geo = ZONAS[zonaDe(code)]`, `raceClass: 'NC'`, `role: 'un_dia'` en las cuatro pruebas (`StageRequest.role` es `StageRole | 'un_dia'`, §3.7; `'un_dia_u23'` y `'cri_u23'` son `KmRole` que solo lee `kmDe` para elegir la columna de km, sección 7 §7.4) y `terrain: 'classic'` en las rutas y `'itt'` en las cronos (sección 5 §5.7), y el esqueleto es `nc_ruta` (circuito de [10; 20] km × [8; 16] vueltas con los motivos que la zona dé; `kind` por zona con `skeletonFor`, §5.7 regla 2) para las dos rutas y `nc_crono` para las dos cronos (sección 5). La meta de `nc_ruta` es una sola, `esprint` a [1,2; 4,3] km del último paso (§5.1 regla 2: una `meta` por esqueleto); lo que cambia por zona son los hijos del circuito, con los rangos efectivos del punto 3 de §6.5. Es la promesa de `docs/motor.md` §V.3 l. 1613 ("un nacional belga es llano y de adoquines; uno colombiano, de montaña") hecha función (el mapa 05 §2 la da por decidida en agosto de 2026 y nunca implementada):

| País | `zonaDe` | Lo que da `nc_ruta` |
| --- | --- | --- |
| BE | flandes | `clasica / Classic` (sin cota): circuito con uno o dos `muro` adoquinados por vuelta y hasta dos `sector`, meta `esprint` |
| CO | andes | `media / Hills`: circuito con `cota` de [3,3; 6] ∩ [2,5; 8] = [3,3; 6] km, meta `esprint`; ficha "altiplano" |
| DK | escandinavia | `media / Hills`: circuito con `cota` de [3,3; 6] km y `muro` corto, `viento` 3 en la ficha ("llano abierto") |
| IT | italia_norte | `media / Hills`: circuito con `cota` de [4; 6] km y `muro` al [10; 16] %, meta `esprint` |
| FR | bretana | `clasica / Classic` (`cota.km[1]` 3,0 < 3,3): circuito con `muro` de [0,5; 2] km, meta `esprint` |
| los 69 de `FALLBACK` | generico | `media / Hills`: circuito con `cota` de [3,3; 6] km y `muro` [8; 10] %, meta `esprint` |

`repecho` y `muro_meta` no aparecen porque `nc_ruta` no los declara: `repecho` es la meta de `ud_repecho` (§5.2) y `muro_meta` la de `ud_muro_final`, `ud_sterrato` y `et_media_muro`, y un nacional no los sortea porque su único candidato de ruta es `nc_ruta` (§5.7).

Los nacionales son los únicos que pasan por `zonaDe`. El km deja de ser fijo en las rutas: los 220 y 180 de hoy (`calendar.ts` l. 360 y l. 358) se sustituyen por un sorteo `firma|raceId` sobre `ARCH.km.porClase.NC.ruta` [180, 60] (es decir, [180; 240]) y `.NC.rutaU23` [140, 40] ([140; 180]), estable entre ediciones desde la temporada 0 (decisión 36). Las cronos también se sortean, con `kmDe('cri', 'NC', …)` y `kmDe('cri_u23', 'NC', …)` sobre `.NC.crono` [35, 10] y `.NC.cronoU23` [25, 10], dentro de `nc_crono.km` [25; 45]: `ARCH.km.porClase.NC` es `{ ruta, rutaU23, crono, cronoU23 }` (sección 3 §3.6, sección 7 §7.4 y sección 12). La saturación del banco se remide con los `nc-*-road` (sección 13), porque son 266 rutas el mismo día.

### 6.7 Viento y altitud son metadatos, no física

El encargo pide "relieve, adoquín, viento, altitud, costa, meseta"; E1 entrega relieve y firme, y el resto lo declara sin fingirlo (decisión 17; riesgo 3 de cobertura y 2 de ejecutabilidad). La razón está medida en el mapa 03 §5.1: el viento es un número por etapa (`streams('viento')` elevado a `STAGE.windDayShape` contra `windMin` 0,87, `simulate.ts` l. 1157-1160) que solo muerde en `block.tipo === 'llano'` y en cualquier km, y `Segment` no lleva altitud (`types.ts` l. 12-48). Un pólder belga y una llanura padana seguirán teniendo la misma probabilidad de abanico.

Lo que sí se hace: `GeoSignature.viento` y `.altitud` viajan en `GeneratedStage.arch.metadatos` y llegan a la ficha con texto que no promete: "llano abierto" (viento 3), "llano" (≤ 2), "altiplano", "alta montaña", "costa"; nunca "abanicos" ni "frío en la cima". `altitud` además decide V4 y `finalesAlto` reparte los finales largos. `expuesto` (amplitud `min(ARCH.motivo.expuesto.amp 0,5; geo.amplitud)`) y `amplitud` baja son lo máximo que el perfil puede decir de un pólder sin tocar `Segment`. Lo que queda para el motor (viento mínimo por zona, altitud en `Segment`, exposición por tramo) va a la sección 17 con la cita a `docs/motor.md` §19.5.

### 6.8 Los tests de consistencia interna

`grammar/geo.test.ts` y `grammar/regions.test.ts` se escriben antes que las tablas (paso 2 del plan, sección 15). No prueban que la geografía sea verdad: prueban que la tabla no se contradice, que cabe en `ARCH`, que todo esqueleto admitido en una zona se puede instanciar en ella, que resuelve todo lo que el calendario le pide y que ningún veto V1 a V4 puede dispararse por culpa de la tabla. `SKELETONS` es `Record<SkeletonId, Skeleton>` (§B.1, sección 5): se itera con `Object.values` y se indexa con `SKELETONS.id`.

```ts
// packages/engine/src/routes/grammar/geo.test.ts
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { COUNTRIES } from '@cyclingstar/shared'
import { FALLBACK, TERRITORIOS, ZONAS, admite, conFirmeDeZona, degradarMotivo, firmeDe, territorioDe, zonaDe } from './geo.js'
import { ESCALON_ROLE, SKELETONS, candidatos, skeletonFor } from './skeletons.js'
import { validateMotif } from './motifs.js'
import type { GeoSignature } from './geo.js'
import type { Motif } from './motifs.js'
import type { Skeleton, Slot } from './skeletons.js'
import type { StageRole } from './tour.js'

type Rango = [number, number]
const dentro = (r: Rango, de: Rango) => r[0] <= r[1] && r[0] >= de[0] && r[1] <= de[1]
const interseca = (a: Rango, b: Rango) => Math.max(a[0], b[0]) <= Math.min(a[1], b[1])
const PAISES_CON_EQUIPOS = ['FR','BE','IT','ES','NL','TR','PT','PL','DE','CN','SI','GR','AU','DK','NO','CZ','HR','JP','CH','CA','US','AT','RO','AE','OM','GB','LU','RS','LT','VE','CO','SA','HU','MY','CY','BA','AZ','AL','EE','AD','BG','XK','SK','IN','TW','TH','KR','RW','DZ','BJ','MU','CM','MA','BF','GT','EC'] // mapa 02 §10
type MotivoZona = 'puerto' | 'cota' | 'muro'
const esMotivoZona = (m: string): m is MotivoZona => m === 'puerto' || m === 'cota' || m === 'muro'
const zonaDeMotivo = (z: GeoSignature, m: MotivoZona) => z[m]                     // { km, g, ... } o null
/** Rango propio de la meta (§6.5 punto 3): cotaFinal del esqueleto si la declara; si no, ARCH.meta con las claves de la sección 12. */
const rangoMeta = (s: Skeleton): Rango | undefined =>
  s.metaParams?.cotaFinal?.km ??
  (s.meta === 'alto_largo' ? ARCH.meta.altoLargo.km : s.meta === 'alto_corto' ? ARCH.meta.altoCorto.km : s.meta === 'muro_meta' ? ARCH.meta.muro.km : undefined)
/** Motivo de la zona contra el que se compara la meta (§6.5 punto 3); null = no se compara. */
const motivoDeMeta = (s: Skeleton, z: GeoSignature): MotivoZona | null => {
  if (s.meta === 'alto_largo') return 'puerto'
  if (s.meta === 'alto_corto') return z.cota ? 'cota' : 'puerto'
  if (s.meta === 'muro_meta') return 'muro'
  if (!s.id.startsWith('et_')) return null                                          // un día: cotaFinal de ARCH.meta.unDiaUltimaCota (§5.1 regla 2)
  if (s.meta === 'cima_cerca' || s.meta === 'descenso_meta' || s.meta === 'valle') {
    const m = [...s.slots].reverse().find((sl) => sl.n[0] >= 1 && esMotivoZona(sl.motif))?.motif
    return m && esMotivoZona(m) ? m : null
  }
  return null
}
/** Huecos obligatorios a cualquier profundidad (un hijo cuenta si él y todos sus padres tienen n[0] ≥ 1); `hijo` marca los de dentro de un compuesto. */
const obligatorios = (ss: Slot[], hijo = false): { sl: Slot; hijo: boolean }[] =>
  ss.filter((sl) => sl.n[0] >= 1).flatMap((sl) => [{ sl, hijo }, ...obligatorios(sl.hijos ?? [], true)])
/** Todos los motivos de una plantilla, hijos de compuestos y de sector_meta incluidos. */
const planos = (ms: readonly Motif[]): Motif[] => ms.flatMap((m) => [m, ...planos(m.hijos ?? [])])
const PAPELES = Object.keys(ESCALON_ROLE) as StageRole[]                            // los 12 de StageRole

describe('grammar/geo: ZONAS cabe en ARCH y no se contradice', () => {
  it('(a) tiene 31 filas y cada rango está dentro del rango del motivo', () => {
    expect(Object.keys(ZONAS)).toHaveLength(31)
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) { expect(dentro(z.puerto.km, ARCH.motivo.puerto.km)).toBe(true); expect(dentro(z.puerto.g, ARCH.motivo.puerto.g)).toBe(true) }
      if (z.cota) { expect(dentro(z.cota.km, ARCH.motivo.cota.km)).toBe(true); expect(dentro(z.cota.g, ARCH.motivo.cota.g)).toBe(true) }
      if (z.muro) { expect(dentro(z.muro.km, ARCH.motivo.muro.km)).toBe(true); expect(dentro(z.muro.g, ARCH.motivo.muro.g)).toBe(true) }
      expect(z.amplitud).toBeLessThanOrEqual(ARCH.motivo.enlace.ampMax)   // 2,4
    }
  })
  it('(b) los bordes con nombre: puerto ≥ 9, cota ≤ 8, muro ≤ 2,5', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) expect(z.puerto.km[0]).toBeGreaterThanOrEqual(9)
      if (z.cota) expect(z.cota.km[1]).toBeLessThanOrEqual(8)
      if (z.muro) expect(z.muro.km[1]).toBeLessThanOrEqual(ARCH.motivo.muro.km[1])   // 2,5 = STAGE.wallMaxKm (sección 12)
    }
  })
  it('(c) adoquín y sterrato son coherentes con el muro y con V2', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.muro?.adoquin) expect(z.adoquin).toBeGreaterThanOrEqual(2)   // un muro adoquinado solo donde hay sectores (§6.2): V2 no puede dispararse
      if (z.adoquin === 0) expect(z.muro?.adoquin ?? false).toBe(false)
    }
  })
  it('(d) V4 no puede dispararse desde la tabla: puerto ≥ 15 km solo con altitud media/alta/altiplano; largo exige puerto', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto && z.puerto.km[1] >= 15) expect(['media', 'alta', 'altiplano']).toContain(z.altitud)
      if (z.finalesAlto === 'largo') expect(z.puerto).not.toBeNull()
      if (z.finalesAlto === 'ninguno') expect(['llano', 'ondulado']).toContain(z.relieve)
      if (z.puerto && z.relieve !== 'montana' && z.relieve !== 'alta') expect(z.finalesAlto).toBe('largo')   // puerto sin relieve de montaña: solo lo usan et_reina_blanda y ud_montana_alto (§6.2)
    }
  })
  it('(e) cordillera está en la ruta y es montana o alta con puerto', () => {
    for (const [cc, t] of Object.entries(TERRITORIOS)) {
      expect(t.ruta.length).toBeGreaterThan(0)
      if (t.cordillera) {
        expect(t.ruta.map((r) => r.zona)).toContain(t.cordillera)
        expect(['montana', 'alta']).toContain(ZONAS[t.cordillera].relieve)
        expect(ZONAS[t.cordillera].puerto).not.toBeNull()
      }
      expect(t.fallback ?? false).toBe(false)   // nada explícito lleva la marca
    }
    expect(Object.keys(TERRITORIOS)).toHaveLength(64)
    expect(TERRITORIOS.AR.cordillera).toBeNull(); expect(TERRITORIOS.BE.cordillera).toBeNull()
    expect(TERRITORIOS.PL.cordillera).toBe('centroeuropa'); expect(TERRITORIOS.MY.cordillera).toBe('montana_sur')
  })
  it('(f) los 56 países con equipos tienen territorio; el resto cae a FALLBACK y se cuenta', () => {
    for (const cc of PAISES_CON_EQUIPOS) expect(territorioDe(cc).fallback ?? false).toBe(false)
    const enFallback = COUNTRIES.map((c) => c.code).filter((cc) => territorioDe(cc) === FALLBACK)
    console.info(`[geo] países en FALLBACK: ${enFallback.length} (${enFallback.join(' ')})`)   // hoy 69, sin banda
    for (const c of COUNTRIES) expect(Object.keys(ZONAS)).toContain(zonaDe(c.code))
  })
  it('(g) ejemplos que fijan la semántica de zonaDe y admite', () => {
    expect(zonaDe('BE')).toBe('flandes'); expect(zonaDe('CO')).toBe('andes'); expect(zonaDe('ZW')).toBe('generico')
    expect(admite(SKELETONS.et_reina_alto_largo.requiere, ZONAS.alpes)).toBe(true)
    expect(admite(SKELETONS.et_reina_alto_largo.requiere, ZONAS.flandes)).toBe(false)     // puerto null
    expect(admite(SKELETONS.et_reina_alto_largo.requiere, ZONAS.levante)).toBe(false)     // finalesAlto corto
    expect(admite(SKELETONS.ud_montana.requiere, ZONAS.levante)).toBe(true)               // puerto y relieve montana (Sa Calobra)
    expect(admite(SKELETONS.ud_montana.requiere, ZONAS.ardenas)).toBe(false)              // puerto null
    expect(admite(SKELETONS.ud_sterrato.requiere, ZONAS.flandes)).toBe(false)
    expect(admite(SKELETONS.et_media_valle.requiere, ZONAS.bretana)).toBe(false)          // cotaKmMin 3,3 > 3,0
    expect(admite(SKELETONS.et_reina_encadenada.requiere, ZONAS.cantabrico)).toBe(false)  // relieve montana < alta
    expect(admite(SKELETONS.ud_esprint_capi.requiere, ZONAS.italia_norte)).toBe(true)
    expect(admite(SKELETONS.ud_adoquin_ligero.requiere, ZONAS.italia_norte)).toBe(true)   // por { sterrato: true }: sectores de tierra (Veneto Classic)
    expect(admite(SKELETONS.ud_adoquin.requiere, ZONAS.italia_norte)).toBe(false)         // adoquin 1 < 2
    expect(admite(SKELETONS.ud_adoquin_ligero.requiere, ZONAS.ardenas)).toBe(false)       // adoquin 1 y sin sterrato: el 1 es metadato
    expect(admite(SKELETONS.et_llana_viento.requiere, ZONAS.andes)).toBe(false)           // viento 0 < 2
    expect(admite(SKELETONS.et_reina_blanda.requiere, ZONAS.cono_sur)).toBe(true)
    expect(interseca(rangoMeta(SKELETONS.et_reina_blanda)!, ZONAS.cono_sur.puerto!.km)).toBe(true)
    expect(interseca(rangoMeta(SKELETONS.et_reina_blanda)!, ZONAS.andes.puerto!.km)).toBe(true)   // suelo 11 (§6.2)
    expect(admite(SKELETONS.et_reina_blanda.requiere, ZONAS.golfo)).toBe(false)           // finalesAlto corto (D8)
    expect(admite(SKELETONS.et_media_alto.requiere, ZONAS.golfo)).toBe(true)              // race-sharjah: final en alto
  })
  it('(h) todo esqueleto admitido se puede dibujar en la zona y todo papel tiene salida', () => {
    const todos = Object.values(SKELETONS)
    let gVacios = 0
    for (const [nombre, z] of Object.entries(ZONAS)) {
      const admitidos = todos.filter((s) => admite(s.requiere, z))
      const ids = admitidos.map((s) => s.id)
      expect(ids).toContain('ud_esprint'); expect(ids).toContain('et_llana'); expect(ids).toContain('et_crono')
      expect(ids.some((id) => id.startsWith('et_media_'))).toBe(true)                  // hilly de edición nunca degrada a llana (§5.8)
      for (const id of Object.keys(z.pesos)) expect(ids).toContain(id)                // ningún peso sobre un esqueleto no admitido (§6.2)
      for (const s of admitidos) {
        const sk = skeletonFor(s.id, z)                                               // nc_ruta clásica deja su cota en n = [0, 0] (§5.7 regla 2)
        for (const { sl, hijo } of obligatorios(sk.slots)) {                          // huecos obligatorios, hijos de compuestos incluidos
          if (!esMotivoZona(sl.motif)) continue
          const m = hijo ? degradarMotivo(sl.motif, z) : sl.motif                     // un hijo degrada (§8.5: los muros de ud_circuito son cotas donde muro es null)
          expect(esMotivoZona(m), `${nombre} × ${s.id}: hijo ${sl.motif} sin motivo`).toBe(true)
          if (!esMotivoZona(m)) continue
          const zm = zonaDeMotivo(z, m)
          expect(zm, `${nombre} × ${s.id}: hueco ${m} sin motivo`).not.toBeNull()
          if (zm && sl.params?.kmRango) expect(interseca(zm.km, sl.params.kmRango), `${nombre} × ${s.id}: km vacío en ${m}`).toBe(true)
          if (zm && sl.params?.gRango && !interseca(zm.g, sl.params.gRango)) gVacios++   // manda el g del esqueleto (§6.5 punto 3): se cuenta, no falla
        }
        const m = motivoDeMeta(s, z), r = rangoMeta(s)
        if (m && r) {
          const zm = zonaDeMotivo(z, m)
          expect(zm, `${nombre} × ${s.id}: meta sin ${m}`).not.toBeNull()
          if (zm) expect(interseca(zm.km, r), `${nombre} × ${s.id}: meta vacía`).toBe(true)
        }
        if (obligatorios(sk.slots).some(({ sl }) => sl.motif === 'sector' || sl.motif === 'racimo') || s.meta === 'sector_meta')
          expect(firmeDe(z), `${nombre} × ${s.id}: sector sin firme posible`).not.toBeNull()   // V2 y V3 (§6.5 punto 5)
      }
      for (const role of PAPELES) {
        const out = candidatos({ role, terrain: 'hilly', geo: z, raceClass: 'WT', format: 'una-semana', km: 160, routeSource: 'generado' })
        expect(out.length).toBeGreaterThan(0)                                         // con la degradación de ESCALON_ROLE (§5.7)
        if (role === 'llana' || role === 'cri' || role === 'prologo')
          expect(out.map((c) => c.id)).toEqual([role === 'llana' ? 'et_llana' : role === 'cri' ? 'et_crono' : 'et_prologo'])   // no degradan
        console.info(`[geo] ${nombre} ${role} → ${out.map((c) => c.id).join(' ')}`)   // la galería y la sección 18 leen las degradaciones de aquí
      }
    }
    console.info(`[geo] pares (zona, hueco) con g vacío, resueltos con el g del esqueleto: ${gVacios}`)   // sin banda
  })
  it('(i) firmeDe y conFirmeDeZona: ningún sector de una plantilla canónica cae en V2 o V3 en una zona que admite su esqueleto', () => {
    expect(firmeDe(ZONAS.francia_norte)).toBe('adoquin'); expect(firmeDe(ZONAS.flandes)).toBe('adoquin')
    expect(firmeDe(ZONAS.italia_norte)).toBe('tierra'); expect(firmeDe(ZONAS.britanicas)).toBe('tierra')   // Veneto Classic, Rutland-Melton
    expect(firmeDe(ZONAS.ardenas)).toBeNull()                                         // adoquin 1 y sin sterrato: el 1 es metadato
    for (const z of Object.values(ZONAS)) {
      for (const s of Object.values(SKELETONS).filter((sk) => admite(sk.requiere, z))) {
        for (const plantilla of [s.canonico, ...(s.alternativas ?? []).map((a) => a.canonico)]) {
          for (const m of planos(conFirmeDeZona(plantilla, z)).filter((x) => x.kind === 'sector'))
            expect(validateMotif(m, z), `${z.zona} × ${s.id}: sector ${m.firme}`).toBeNull()   // regla 4 de §4.5 = V2 y V3
        }
      }
    }
    const veneto = planos(conFirmeDeZona(SKELETONS.ud_adoquin_ligero.canonico, ZONAS.italia_norte)).filter((x) => x.kind === 'sector')
    expect(veneto.length).toBeGreaterThan(0); expect(veneto.every((m) => m.firme === 'tierra')).toBe(true)
  })
})
```

```ts
// packages/engine/src/routes/grammar/regions.test.ts
import { describe, expect, it } from 'vitest'
import { RACE_ROUTES } from '../raceRoutes.js'
import { RACE_EDITIONS } from '../editions.js'
import { COBBLES_IDS, RACE_REGION, regionOf } from './regions.js'
import { ZONAS, zonaDe } from './geo.js'
// No importa SEASON_CALENDAR: cargar el calendario entero (578 ms, sección 14) no hace falta para probar una tabla por id.

describe('grammar/regions: RACE_REGION cubre las 310 carreras de equipos y ninguna cae al país', () => {
  it('(a) las claves son exactamente las de RACE_ROUTES', () => {
    expect(Object.keys(RACE_REGION).sort()).toEqual(Object.keys(RACE_ROUTES).sort())   // 310
  })
  it('(b) ninguna carrera de equipos pasa por zonaDe(country); solo los .NC', () => {
    for (const id of Object.keys(RACE_ROUTES)) expect(regionOf(id, 1, null)).toBe(RACE_REGION[id].stages?.[1] ?? RACE_REGION[id].default)
    expect(Object.keys(RACE_REGION).some((id) => id.startsWith('nc-'))).toBe(false)
    expect(regionOf('nc-be-road', 1, 'BE')).toBe(zonaDe('BE'))
  })
  it('(c) stages solo en las 60 ediciones, con índice 1-based dentro de n y zona distinta de default; skeleton solo en un día', () => {
    for (const [id, r] of Object.entries(RACE_REGION)) {
      if (r.skeleton) { expect(RACE_EDITIONS[id]).toBeUndefined(); expect(RACE_ROUTES[id]).toHaveLength(1) }
      if (!r.stages) continue
      expect(RACE_EDITIONS[id]).toBeDefined()
      for (const [i, zona] of Object.entries(r.stages)) {
        expect(Number(i)).toBeGreaterThanOrEqual(1); expect(Number(i)).toBeLessThanOrEqual(RACE_EDITIONS[id].stages.length)
        expect(zona).not.toBe(r.default)
      }
    }
    expect(regionOf('race-france', 6, 'FR')).toBe('pirineos')
    expect(regionOf('race-france', 19, 'FR')).toBe('alpes')
    expect(regionOf('race-france', 7, 'FR')).toBe('francia_norte')
    expect(regionOf('race-italy', 1, 'IT')).toBe('balcanes')
    expect(regionOf('race-colombia', 1, 'CO')).toBe('generico')
    expect(regionOf('race-colombia', 5, 'CO')).toBe('andes')
  })
  it('(d) las filas cobbles caen en zonas con adoquín o tierra (DATO: grep "terrain: \'cobbles\'" sobre calendar.ts)', () => {
    // COBBLES_IDS (regions.ts) es el literal: 'race-across-flanders', 'race-antwerp', 'race-bruges', 'race-denain', 'race-flanders',
    // 'race-flandrien', 'race-harelbeke', 'race-kuurne', 'race-leon', 'race-muur', 'race-nokere', 'race-opening-classic', 'race-roubaix',
    // 'race-roubaix-espoirs', 'race-rutland', 'race-samyn', 'race-tours', 'race-veneto-classic', 'race-wevelgem', 'race-youngster'
    expect(COBBLES_IDS).toHaveLength(20)
    const COBBLES = COBBLES_IDS.filter((id) => id !== 'race-leon')
    expect(COBBLES).toHaveLength(19)
    for (const id of COBBLES) {
      const z = ZONAS[regionOf(id, 1, null)]
      expect(z.adoquin >= 2 || z.sterrato).toBe(true)   // algún candidato cobbles cabe (§5.2); race-rutland, race-tours y race-veneto-classic por tierra (sterrato)
    }
    // La vigésima, race-leon, es un conflicto de dato (§6.1): país ES y ciudades León con terrain cobbles. Manda el dato.
    expect(RACE_REGION['race-leon']).toEqual({ default: 'meseta', duda: true })
  })
  it('(e) los ejemplos obligados', () => {
    const esperado: Record<string, string> = { 'race-liege': 'ardenas', 'race-walloon-wall': 'ardenas', 'race-huy': 'ardenas',
      'race-lombardy': 'italia_norte', 'race-jura': 'macizo_central', 'race-tramuntana': 'levante', 'race-roubaix': 'francia_norte',
      'race-white-roads': 'italia_centro', 'race-tours': 'bretana', 'race-colombia': 'andes', 'race-emirates': 'golfo',
      'race-down-under': 'australia', 'race-langkawi': 'montana_sur', 'race-mercantour': 'alpes' }
    for (const [id, zona] of Object.entries(esperado)) expect(RACE_REGION[id].default).toBe(zona)
    expect(RACE_REGION['race-mercantour'].skeleton).toBe('ud_montana_alto')
    expect(RACE_REGION['race-huy'].skeleton).toBe('ud_muro_final')
  })
  it('(f) las dudas de curación se imprimen y no vetan', () => {
    const dudas = Object.entries(RACE_REGION).filter(([, r]) => r.duda).map(([id]) => id)
    console.info(`[regions] DUDA: ${dudas.length} carreras (${dudas.join(' ')})`)   // objetivo sin banda: 0, salvo race-leon mientras el dato no cambie
  })
})
```

Notas sobre los tests: (d) del primer fichero es el que hace que V4 sea imposible de disparar por la tabla, (h) el que hace que todo esqueleto admitido tenga motivo, rango y firme donde dibujarse (puntos 1 y 3 de §6.5), en cada hueco obligatorio de primer nivel y en cada hijo obligatorio de un compuesto (este con la degradación de `degradarMotivo`, que es como `instanciar` rinde los muros de `ud_circuito` en zonas sin muro), y que todo papel tenga salida con la degradación de `ESCALON_ROLE`; e (i) el que hace que la plantilla canónica no pueda caer en V2 ni V3 (punto 5 de §6.5). Si (h) o (i) fallan al primer `pnpm test` del paso 2, lo que se toca es una fila de `ZONAS`, un rango de esqueleto o su `requiere` o, si falla (i), la plantilla canónica (las tres enmiendas de §6.5 punto 1 son las que hicieron falta al cruzar las tablas), y se anota cuál. (h) no afirma nada sobre qué papeles degradan: lo imprime por zona (en `flandes` y `francia_norte`, por ejemplo, `media` baja a `llana` porque `et_media_valle` y `et_media_tendida` piden `cota`, y en `bretana` porque la piden de al menos 3,3 km), y es la sección 18 la que decide si alguna degradación es inaceptable. `SKELETONS`, `ESCALON_ROLE`, `candidatos`, `skeletonFor` y los tipos `Skeleton` y `Slot` vienen de `skeletons.ts` (§5.1 y §5.7); `validateMotif` y el tipo `Motif` de `motifs.ts` (§3.2, §4.5); `degradarMotivo`, `firmeDe` y `conFirmeDeZona` de `geo.ts` (§3.4 y §6.5 punto 5); `StageRole` de `tour.ts` (sección 3, §3.6); (f) de `geo.test.ts` no tiene banda porque el número de países en fallback (69) es un hecho de contenido, no un objetivo. El test (b) de `regions.test.ts` es la obligación 8 del encargo de síntesis hecha aserción: la única forma de que una carrera de equipos caiga al país es borrar su fila, y eso rompe (a). `duda` y `skeleton` son los dos campos opcionales de `RaceRegion` (§6.4) que la sección 3 recoge en §3.5.

Lo que el dueño tiene que revisar de esta sección, una tarde con la galería delante (sección 16 y sección 18): las 31 filas de `ZONAS` con la pregunta "¿existe esto aquí?", y en particular las dos sin fila en el mapa 07 (`montana_sur`, `africa_llana`) y los cuatro cambios de datos que obligó el cruce con la sección 5 (`levante` a `montana`, suelo de 11 km en `provenza`, `anatolia` y `andes`, `sterrato` en `italia_norte`, §6.2); las 12 filas de `TERRITORIOS` con `cordillera: null` (D8, con la lista de 30 países y las 6 etapas de edición que pierden reina); las carreras atadas con `skeleton` (`race-mercantour`, `race-huy` y las que la curación añada); y las carreras marcadas `duda` de `RACE_REGION`, empezando por `race-leon`, donde la pregunta es si se corrige el dato (`RACE_COUNTRY` a `FR`, ruta a Lannilis) en un encargo de datos.

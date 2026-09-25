## 6. La geografía: zonas, territorios y RACE_REGION

Hoy el país existe en el calendario y no llega al generador: `buildRace` lo calcula en `calendar.ts` l. 898 (`row.country ?? RACE_COUNTRY[row.id]`) y no lo pasa a ninguna de las tres ramas (mapa 02 §1 y §6: «el país NO entra en ningún generador de recorrido»); dentro del motor solo lo lee el clima (`climateOf`, `world/climate.ts` l. 166). Esta sección escribe la tabla que faltaba, en tres capas y con tres ficheros: `ZONAS` (qué existe en cada sitio, `grammar/geo.ts`), `TERRITORIOS` (por qué zonas pasa un país y dónde está su reina, `grammar/geo.ts`) y `RACE_REGION` (en qué zona corre cada carrera y cada etapa, `grammar/regions.ts`). Los tipos son los de la sección 3 (`GeoZone`, `Relieve`, `GeoSignature`, `Territorio`, `RaceRegion`) y no se repiten aquí salvo donde hace falta fijar una semántica; esta sección añade dos tipos que la sección 3 debe recoger: `Requiere` (§6.5) y los campos `duda` y `skeleton` de `RaceRegion` (§6.4).

### 6.1 Qué es DATO y qué es JUICIO

Se dice con esas palabras porque los tres jueces lo señalaron como el riesgo principal (`juicios/cobertura.md` §5 riesgo 1; `juicios/motor.md` §5 riesgo 7; `juicios/ejecutabilidad.md` §5 riesgo 1): la tabla geográfica sale del mapa 07 §3, que se declara orientativo, y no hay validación externa posible (PCS y Overpass vetados, `docs/fuentes-recorridos.md`, mapa 05 §6).

Es DATO, y por tanto no se discute ni se ajusta a ojo:

1. Las 20 filas `terrain: 'cobbles'` del calendario (grep sobre `calendar.ts`, medido en mapa 07 §3 consecuencia 1 y comprobado de nuevo: 20). Diecinueve caen en Bélgica, norte de Francia, Bretaña, el Loira (Paris-Tours, `race-tours`: chemins de vigne de tierra), Reino Unido o Véneto, es decir, en zonas con adoquín o tierra. La vigésima es un conflicto del propio dato: `race-leon` («Race Léon», 185 km, Pro, `terrain: 'cobbles'`, `calendar.ts` l. 1402-1410) lleva `RACE_COUNTRY['race-leon'] = 'ES'` (l. 644) y `RACE_ROUTES['race-leon'] = [['Leon', 'Leon']]` (`raceRoutes.ts` l. 610): el nombre dice Tro Bro Léon (Bretaña, tierra) y el país y las ciudades dicen León (meseta, sin adoquín ni tierra). E1 no corrige datos de `calendar.ts` ni de `raceRoutes.ts` (§6.4, «lo que `RACE_REGION` cambia en el país»): la fila se cura como `meseta` con `duda: true`, el test (d) de §6.8 la aparta con la razón escrita y va a la lista de revisión del dueño (§6.8, final): si el dueño corrige el dato a `FR` y Lannilis en un encargo de datos, la fila pasa a `bretana` y el test (d) vuelve a 20.
2. Las ciudades de salida y meta de `raceRoutes.ts` (`RACE_ROUTES`, l. 11): 310 claves, una por carrera de equipos, sin huérfanas (mapa 02 §8). Son reales aunque el relieve que hoy se dibuja debajo sea inventado; son la única fuente de la curación de `RACE_REGION` (§6.4).
3. Las 177 etapas con rasgos (`STAGE_FEATURES`, `stageFeatures.ts` l. 15) y las 3 grandes vueltas de `RACE_EDITIONS` (`editions.ts` l. 25; 60 ediciones en total, medido con grep). No pasan por esta tabla: su origen es `real` y su huella se sella antes de tocar `calendar.ts` (sección 11).

Es JUICIO todo lo demás: cada rango de `ZONAS`, cada `null`, cada peso, cada `ruta` y cada `cordillera` de `TERRITORIOS`, y la zona que `RACE_REGION` asigna a cada carrera. El juicio se sostiene con tres instrumentos, y no con una fuente: la fila del mapa 07 §3 citada en el comentario de cada zona (la columna «fila» de §6.2; dos zonas no tienen fila y lo dicen), los tests de consistencia interna de §6.8 (que no prueban que la tabla sea verdad, sino que no se contradice, que cabe en `ARCH` y que todo esqueleto admitido se puede dibujar), y la galería de la sección 16, que es donde el dueño juzga 31 firmas y 31 esqueletos en una tarde con tres preguntas por perfil. Cuando la galería diga que algo no existe en un sitio, lo que se edita es una fila de `ZONAS`, de `TERRITORIOS` o de `RACE_REGION`: datos, nunca código.

### 6.2 Las 30 zonas: `ZONAS`

`ZONAS: Record<GeoZone, GeoSignature>` tiene 31 filas: las 30 zonas con nombre más `generico`, que es la firma de un país sin territorio. Las 25 firmas del mapa 07 §3 se funden en 30 porque Italia, España y Francia son varias geografías cada una (125 de 310 carreras, `arquitectura.md` §3.5), `italia_sur` se separa de `italia_centro` porque el mapa 07 fila 3.4 describe colinas y muros para Toscana y Marcas y solo admite «puertos de 20 km salvo Abruzos» (los Abruzos, con Blockhaus, Prati di Tivo y Gran Sasso a 2.130 m, no caben en una zona `media`), y `montana_sur` se añade sin fila propia en el mapa (juicio del redactor, §6.2 lista de diferencias) porque Ruanda, Marruecos y Malasia tienen vueltas con etapas `mountain` en el calendario y ninguna fila del mapa las describe. Respecto del esqueleto (§A.2, decisión 12, §B.2), `GeoZone` gana un miembro (`'montana_sur'`) y la cifra pasa de «29 zonas» a «30 zonas, 31 filas»: la pasada de coherencia lo propaga a la cabecera, a la sección 3 y a la 16.

Reglas de lectura de la tabla, que son también las reglas del fichero:

- Todo rango es `[min; max]` y está CONTENIDO en el rango del motivo en `ARCH` (sección 12): `puerto.km ⊆ [9; 25]`, `puerto.g ⊆ [5; 9]`, `cota.km ⊆ [2,5; 8]`, `cota.g ⊆ [4; 7]`, `muro.km ⊆ [0,4; 3]`, `muro.g ⊆ [8; 16]`, `amplitud ≤ 2,4`. Lo que la geografía hace es estrechar, nunca ampliar; por eso Ghisallo (8,6 km) sale como 9,0 en `italia_norte` (el hueco [8,0; 9,0] asumido en la sección 12), Alto de Letras (80 km, fila 3.20) no existe en E1 (techo 25 km de `ARCH.motivo.puerto.km`) y Shibden Wall (250 m adoquinados, fila 3.18) tampoco (suelo 0,4 km de `ARCH.motivo.muro.km`).
- `null` significa «aquí no existe» y lo hacen cumplir V1 (puerto), V2 (adoquín) y V3 (sterrato) sobre el perfil final, además de `admite()` sobre el esqueleto antes de dibujar (§6.5). `cota: null` es el pólder y el desierto de dunas: Flandes, norte de Francia. El Golfo y el cono sur tienen `cota` (Jebel Hafeet y los falsos llanos de la precordillera) aunque no tengan muro.
- `finalesAlto` es un solo valor con orden: `'largo'` implica que también existe el corto (`alto_corto` requiere `corto` o `largo`; `alto_largo` requiere `largo`); `'ninguno'` prohíbe `et_media_alto` y `et_reina_*` con meta en alto.
- `relieve` es el techo de la zona (`llano < ondulado < media < montana < alta`) y lo leen exactamente tres cosas: `et_reina_encadenada` (`relieveMin: 'alta'`), `et_media_tendida` (`relieveEn: ['ondulado']` como alternativa a la altitud) y la composición de la sección 7 (`admiteReina`: reina de vuelta solo en `cordillera` o en zona `montana`/`alta`, decisión 18). Los esqueletos de montaña de un día y las demás reinas exigen `puerto` y no relieve: una zona `media` con puerto (`levante`, `centroeuropa` antes de esta sección, `asia_oriental`) dibuja una `ud_montana` de un día (Sa Calobra) y no recibe reina de vuelta salvo que sea cordillera. `et_reina_blanda` es la excepción escrita en `cono_sur`.
- `viento` y `altitud` son METADATOS: viajan a `arch.metadatos` y a la ficha, y `altitud` además alimenta V4; ninguno llega al motor (§6.7).
- `pesos` multiplica `Skeleton.pesoBase` (sección 5); lo que no aparece vale 1; 0 prohíbe. Ningún peso distinto de 1 se escribe sobre un esqueleto que la zona no admite (el test (h) de §6.8 lo comprueba).
- `adoquin` tiene cuatro valores con semántica cerrada aquí y en la regla 4 de `validateMotif` (sección 4) y V2 (sección 9): 0 nada; 1 «urbano y ligero»: se admiten `sector` con `firme: 'adoquin'` de ≤ `ARCH.motivo.sector.ligero.kmMax` 1,5 km y ≤ `ARCH.motivo.sector.ligero.estrellasMax` 2★ (solo `ud_adoquin_ligero` los dibuja) y ningún muro adoquinado; 2 sectores de cualquier longitud y estrellas, y muros adoquinados; 3 masivo (Flandes). Las dos constantes son nuevas y la sección 12 las recoge.

| Zona (fila mapa 07) | relieve | puerto km × %, forma | cota km × % | muro km × %, adoquín | adoquín | sterrato | viento | altitud | amplitud | finalesAlto | pesos (≠ 1) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `flandes` (3.1: BE, NL) | ondulado | null | null | [0,4; 2,2] × [8; 14], sí | 3 | no | 3 | mar | 0,55 | ninguno | ud_muros_adoquin 3, ud_muros 2, et_media_muro 2, et_llana_viento 2, ud_circuito 0,5 |
| `ardenas` (3.2: BE sur, LU) | media | null | [2,5; 4,5] × [5; 7] | [0,8; 2,0] × [8; 13], no | 1 | no | 1 | colina | 0,85 | corto | ud_muro_final 2, ud_montana_media 1,5, et_media_muro 1,5, et_media_alto 1,2 |
| `bretana` (3.13) | ondulado | null | [2,5; 3,0] × [5; 7] | [0,5; 2,0] × [8; 10], no | 1 | sí (tierra) | 3 | colina | 0,7 | ninguno | ud_circuito 1,5, ud_adoquin_ligero 1,5, et_llana_viento 1,5 |
| `francia_norte` (3.1, 1.4) | llano | null | null | [0,5; 1,5] × [8; 10], sí | 2 | no | 2 | mar | 0,55 | ninguno | ud_adoquin 3, ud_adoquin_ligero 2, ud_esprint 1,5, et_llana_viento 1,5 |
| `macizo_central` (3.14) | montana | [9; 17] × [6; 8], irregular | [2,5; 6] × [5; 7] | [1; 2] × [8; 12], no | 0 | no | 1 | media | 1,0 | largo | et_media_valle 1,5, et_media_alto 1,5, ud_montana_media 1,5, et_reina_alto_corto 1,2 |
| `alpes` (3.5: FR, IT, CH, AT) | alta | [12; 25] × [5,5; 8,5], regular | [4; 8] × [5; 7] | null | 0 | no | 0 | alta | 1,15 | largo | et_reina_alto_largo 2, et_reina_valle 1,3, et_reina_encadenada 1,2, et_llana 0,5 |
| `pirineos` (3.6: FR, ES, AD) | alta | [10; 17] × [7; 8,5], regular | [4; 8] × [6; 7] | null | 0 | no | 0 | alta | 1,15 | largo | et_reina_encadenada 2, et_reina_alto_largo 1,5, et_reina_alto_corto 1,2 |
| `provenza` (3.15) | montana | [15; 22] × [6,5; 7,5], regular | [2,5; 8] × [5; 7] | [1; 2] × [8; 9], no | 0 | no | 3 | media | 0,9 | largo | et_llana_viento 2, et_media_valle 1,3 |
| `italia_norte` (3.3) | montana | [9; 13] × [6; 8], irregular | [4; 8] × [4; 7] | [1; 2] × [10; 16], no | 1 | no | 0 | media | 1,0 | corto | ud_montana 2, ud_esprint_capi 2, ud_montana_media 1,5, et_reina_alto_corto 1,3 |
| `italia_centro` (3.4) | media | null | [2,5; 6] × [5; 7] | [0,5; 2,1] × [9; 14], no | 0 | sí | 1 | colina | 0,9 | corto | ud_sterrato 3, ud_muro_final 2, et_media_muro 1,5, ud_circuito 1,3 |
| `dolomitas` (3.7) | alta | [9; 14] × [7,5; 9], progresiva | [4; 8] × [6; 7] | null | 0 | no | 0 | alta | 1,15 | largo | et_reina_alto_corto 2, et_reina_encadenada 1,5, et_montana_corta 1,5 |
| `italia_sur` (3.4 Abruzos; Lazio, Calabria, Cerdeña) | montana | [9; 16] × [5; 8], progresiva | [2,5; 7] × [5; 7] | [0,5; 2] × [8; 12], no | 0 | no | 2 | media | 0,9 | largo | et_media_valle 1,3, ud_montana_media 1,3, et_reina_alto_largo 1,2 |
| `cantabrico` (3.8) | montana | [9; 15] × [7; 9], irregular | [3; 8] × [6; 7] | [1; 3] × [10; 15], no | 0 | no | 1 | media | 1,1 | largo | et_reina_alto_corto 2, et_media_muro 1,5, ud_montana 1,5, et_llana 0,3 |
| `meseta` (3.9) | ondulado | null | [3; 8] × [4; 6] | null | 0 | no | 3 | altiplano | 0,6 | corto | et_llana_viento 2, et_media_tendida 2, ud_esprint 1,5 |
| `andalucia` (3.10) | montana | [9; 20] × [6; 8], regular | [4; 8] × [5; 7] | [1; 2] × [8; 11], no | 0 | no | 2 | alta | 0,9 | largo | et_media_alto 1,5, et_reina_alto_largo 1,3, et_llana 1,2 |
| `levante` (3.11) | media | [9; 22] × [5; 7], regular | [3; 6] × [6; 7] | [1; 3] × [10; 12], no | 0 | no | 1 | media | 0,9 | corto | et_media_alto 2, ud_muro_final 1,3, et_media_muro 1,2 |
| `portugal` (3.12) | montana | [9; 20] × [5; 7], regular | [3; 8] × [6; 7] | [1; 2,6] × [8; 10], no | 1 | no | 2 | media | 0,9 | largo | et_media_alto 1,3, et_reina_alto_largo 1,2, et_llana_viento 1,2 |
| `centroeuropa` (3.16) | montana | [9; 13] × [5; 8], regular | [2,5; 6] × [5; 7] | [1; 2] × [8; 10], no | 1 | no | 1 | colina | 0,85 | corto | et_media_valle 1,5, ud_circuito 1,3, et_media_alto 1,2, et_reina_alto_corto 1,2 |
| `escandinavia` (3.17) | ondulado | null | [2,5; 7] × [5; 7] | [0,5; 1,0] × [8; 10], no | 1 | no | 3 | mar | 0,6 | corto | et_llana_viento 2, ud_esprint 1,5, ud_circuito 1,3 |
| `britanicas` (3.18) | media | null | [2,5; 8] × [6; 7] | [0,4; 1,0] × [10; 16], no | 1 | sí (tierra) | 3 | colina | 0,9 | corto | ud_circuito 1,5, et_media_alto 1,3, et_media_muro 1,3 |
| `balcanes` (3.19) | montana | [10; 23] × [5; 7], regular | [3; 8] × [5; 7] | null | 0 | no | 2 | media | 0,9 | largo | et_reina_alto_largo 1,3, et_llana 1,2, et_media_valle 1,2 |
| `anatolia` (3.19: TR, CY, AZ) | montana | [15; 21] × [6; 7], regular | [3; 8] × [5; 7] | null | 0 | no | 2 | media | 0,8 | largo | et_reina_alto_largo 1,5, et_llana 1,5, et_llana_viento 1,2 |
| `andes` (3.20) | alta | [15; 25] × [5; 7], regular | [2,5; 8] × [5; 7] | null | 0 | no | 0 | altiplano | 1,0 | largo | et_reina_valle 2, et_reina_alto_largo 1,5, et_media_tendida 1,5, et_llana 0,3, et_llana_viento 0 |
| `cono_sur` (3.21) | ondulado | [9; 25] × [5; 6], regular | [4; 8] × [4; 6] | null | 0 | no | 3 | media | 0,6 | largo | et_llana_viento 2, et_llana 1,5, et_media_tendida 1,2, et_reina_blanda 1 |
| `norteamerica` (3.22) | montana | [10; 25] × [5; 9], regular | [2,5; 6] × [6; 7] | [0,4; 1,8] × [8; 10], no | 0 | no | 2 | media | 0,9 | largo | ud_circuito 2, et_media_alto 1,3, et_reina_alto_largo 1,2, et_llana 1,2 |
| `australia` (3.23) | ondulado | null | [2,5; 3,5] × [6; 7] | [0,5; 1,1] × [9; 11], no | 0 | no | 3 | colina | 0,7 | corto | ud_circuito 2, et_media_alto 1,5, et_llana_viento 1,5 |
| `asia_oriental` (3.24) | montana | [9; 14] × [6; 9], regular | [2,5; 5] × [6; 7] | [0,5; 1,5] × [8; 10], no | 0 | no | 1 | colina | 0,8 | corto | ud_circuito 2, et_llana 1,5, et_media_alto 1,2, et_reina_alto_corto 1,2 |
| `golfo` (3.25) | llano | null | [2,5; 7] × [5; 7] | null | 0 | no | 3 | mar | 0,4 | corto | et_llana_viento 3, et_llana 2, et_media_alto 1, et_media_valle 0,2 |
| `montana_sur` (sin fila; Genting de la 3.25; Atlas y Ruanda por juicio) | montana | [9; 22] × [5; 9], regular | [2,5; 8] × [5; 7] | [0,4; 1,5] × [8; 12], no | 1 | no | 1 | media | 1,0 | largo | et_reina_alto_largo 1,3, et_media_alto 1,3, et_llana_viento 0,5 |
| `africa_llana` (sin fila; juicio: BJ, BF, CM, MU, DZ) | ondulado | null | [2,5; 4] × [4; 7] | null | 0 | no | 2 | colina | 0,7 | corto | et_llana 1,5, ud_esprint 1,5, et_llana_viento 1,2 |
| `generico` (sin fila) | ondulado | null | [2,5; 6] × [4; 7] | [1; 2] × [8; 10], no | 0 | no | 1 | colina | 0,85 | corto | (todo 1) |

Diferencias respecto de la tabla de `arquitectura.md` §5.1, con su porqué, para que nadie las tome por erratas:

- `flandes` y `francia_norte` pasan a `cota: null`. En pólder no hay subidas de 2,5 km al 4 %; lo que hay son muros. Cauberg (1,2 km × 5,8 %) y Kwaremont quedan por debajo del suelo de 8 % de `ARCH.motivo.muro.g` y no se dibujan: es un sacrificio consciente de la sección 4, no de esta tabla.
- `meseta` y `britanicas` pierden el puerto: sus rangos de arquitectura ([6; 10] y [6; 9] km) casi no intersecan el suelo de 9,0 km. Navacerrada (10 × 6) y Bealach na Bà (9 × 6) se dibujan como `cota` de 8 km; Bola del Mundo (3 × 12) es `alto_corto`. `britanicas` lleva `muro.adoquin: false`: Shibden Wall (250 m) y Michaelgate (fila 3.18) están por debajo del suelo de 0,4 km del muro y son rarezas urbanas; el adoquín británico existe solo como `adoquin: 1` (sector ligero de `ud_adoquin_ligero`, Rutland-Melton).
- `escandinavia` es una sola zona para Dinamarca y Noruega, cuando el mapa 07 fila 3.17 describe dos relieves. Se resuelve con `cota` hasta 7 km (los [3; 10] km noruegos) y `puerto: null` (Noruega no tiene reina: `cordillera: null` en §6.3); el coste es que una etapa danesa puede llevar una cota de 7 km, y la galería es donde se decide si duele.
- `portugal` sube a `montana` con `finalesAlto: 'largo'` porque la Torre (Estrela, de 20 a 30 km al [5; 6] %, fila 3.12) es la reina de la Volta y `cordillera` exige `montana` o `alta` (§6.8, test e).
- `italia_norte` gana `adoquin: 1` (urbano) para que Veneto Classic, fila `cobbles` en Bassano («tierra y adoquín urbano», mapa 07 §3 consecuencia 1), resuelva sin salirse del dato: con la semántica de `adoquin` 1 de arriba, `ud_adoquin_ligero` dibuja allí sectores de ≤ 1,5 km y 2★, que `validateMotif` y V2 aceptan. Y `cota.g` baja a [4; 7] para que Cipressa (5,6 km al 4,1 %) y Poggio (3,7 km al 3,7 %, recortado a 4) sean dibujables donde están: `ud_esprint_capi` pide g [4; 5] y con el [6; 7] de arquitectura la intersección era vacía.
- `andes` abre `cota.km` a [2,5; 8] (era [5; 8]): las cronos (`et_crono`, `nc_crono`, cota de [2,5; 5] km) y `ud_montana` (cota de [2,5; 4,2] km) no cabían y el test (h) lo cazaba; en Colombia hay repechos cortos antes de los puertos de 20 km.
- `golfo` pierde el jebel largo: `finalesAlto: 'corto'` y `puerto: null`. La razón es la decisión 13 de la síntesis, que sella en test «0 reinas en BE, NL, DK, AE, AU» y D8 (sección 18, aceptada por defecto): Jebel Hafeet (10,8 × 6,6) se dibuja como `alto_corto` de 7 km al 7 % sobre `cota` [2,5; 7]; Jebel Jais (20 km) no existe en E1 y se anota en la sección 17. `race-sharjah` (`.2`, 5 etapas, `flat`, `calendar.ts` l. 3387-3396; AE → `golfo`) conserva `calendar.test.ts` l. 248-255 («crono y final en alto»): la garantía «final en alto en 4+» de `mixRoles` se conserva como regla (decisión 18), el papel `media_alto` lo rinde `et_media_alto` (admitido en `golfo`: `cota` con `km[1]` 7 ≥ 3,3 y `finalesAlto: 'corto'`) con etiqueta `Uphill finish`, y el paso 7 lo comprueba. La sección 7 (dudas l. 61) pedía `puerto` no nulo en `golfo` para ese test: no hace falta y esta tabla no lo da; D8 en la sección 18 debe decir que aceptar «Golfo sin puerto» deja ese final como `alto_corto` de ≤ 7 km.
- `asia_oriental` topa el puerto en 14 km, porque su `altitud` es `colina` y V4 prohíbe `puerto ≥ 15 km` fuera de `{media, alta, altiplano}` (decisión 24). Los puertos de 20 a 40 km al [3; 4] % de Qinghai (fila 3.24) son `tendida`, no `puerto`. Sube a `montana` (Fuji Azami 11,4 × 10, Nongla 5 × 8, Taiwán KOM) para que JP, TW y CN puedan llevar `cordillera` (§6.3) y gana un muro de circuito ([0,5; 1,5] × [8; 10], la subida de Utsunomiya de la Japan Cup) para que `ud_circuito` 2 no pese sobre un esqueleto no admitido.
- `centroeuropa` y `norteamerica` suben a `montana` (Krvavec 12 × 8 y Sölden 12 × 10,7 en la fila 3.16; Mount Baldy 20 × 7,4 y Snowbird 10 × 9 en la 3.22), y `norteamerica` a `finalesAlto: 'largo'` con `altitud: 'media'`, para que PL, CZ, SK, US y CA lleven cordillera: `race-czechia` tiene 3 etapas `mountain` de 4, `race-poland` 3 de 7 y `race-gila` 2 de 5 (`editions.ts`), y con relieve `media` las tres perdían todas sus reinas sin que D8 lo dijera.
- `cono_sur` es la corrección del bug AR/CL que señaló `juicios/ejecutabilidad.md` §2.2: la propuesta de geografía declaraba `cordillera: 'desierto_andino'` con `puerto: null` y relieve llano, y su propio test lo habría cazado. Aquí `cono_sur` es `ondulado`, con `puerto` [9; 25] × [5; 6] (Alto Colorado 20 × 5, Punta Negra, Farellones 30 × 6 topado a 25), `cota` [4; 8] × [4; 6] (los falsos llanos de la precordillera, sin los que `et_reina_blanda` no se puede instanciar: su hueco `cota`×[1; 2] es obligatorio, decisión 8) y `finalesAlto: 'largo'`, y AR y CL llevan `cordillera: null`. La única reina posible en un territorio sin cordillera es `et_reina_blanda` (kind `reina`, D+ [1.500; 2.500], `alto_largo` de [9; 12] km, que interseca `puerto.km` [9; 25] en [9; 12]), cuyo `requiere` es `{ puerto: true, finalesAlto: 'largo' }` sin relieve. Como la sección 5 (§5.7 regla 1) da `ARCH.reina.blandaShare` 0 en `ondulado` y la sección 7 (`admiteReina`) no da reina fuera de cordillera o zona `montana`/`alta`, hace falta una excepción escrita en las dos: si `Territorio.cordillera === null` y `ZONAS[z].finalesAlto === 'largo'`, la composición admite UNA reina por vuelta en esa zona y el esqueleto es `et_reina_blanda` con probabilidad `ARCH.reina.blandaSinCordillera` 1,0 (constante nueva, sección 12). Hoy solo `cono_sur` cumple la condición. El test «AR y CL: ≤ 1 reina por vuelta, siempre `alto`» NO está en esta sección: vive en `grammar/tour.test.ts` (sección 7, paso 7 del plan), junto al de «ninguna reina en un país sin cordillera (BE, NL, DK, AE, AU)» (07 l. 171), y la sección 7 lo escribe; aquí, el test (g) de §6.8 sella que `admite(ZONAS.cono_sur, SKELETONS.et_reina_blanda)` es cierto y que sus huecos obligatorios caben. Para `golfo` esa puerta está cerrada por D8 (`finalesAlto: 'corto'`).
- `montana_sur` (MY, RW, MA) no tiene fila en el mapa 07 §3: las filas 3.24 y 3.25 son Asia y Golfo, y la 3.25 solo cita «Genting 20 × 6-9 (Malasia)». La firma es juicio del redactor sobre tres vueltas reales del calendario: `race-langkawi` (8 etapas, 3 `mountain`, meta en Genting Highlands, `raceRoutes.ts` l. 603), `race-rwanda` (`.1`, 8 etapas, `terrain: 'mountain'`, `calendar.ts` l. 3478-3486; Musanze, Mur de Kigali) y `race-morocco` (`.2`, 8 etapas `mountain`, l. 3528-3536; Oukaimeden a 2.600 m). `puerto` [9; 22] × [5; 9] con `altitud: 'media'` (V4 permite ≥ 15 km) y `adoquin: 1` por el adoquín urbano de Kigali. Va a la lista de revisión del dueño con la marca «sin fila».
- `africa_llana` (BJ, BF, CM, MU, DZ) tampoco tiene fila en el mapa 07 y también es juicio: costa y sabana, `cota` corta y sin muro; Argelia entra aquí porque el Tour d'Algérie corre por la costa y no por el Tell.

### 6.3 Los territorios: `TERRITORIOS`

Un territorio es la ruta ordenada de zonas por las que pasa un país y la zona donde cae su reina. `ruta` es un recorrido plausible (la composición de la sección 7 toma una ventana contigua de ella con `ARCH.itinerario.avance` 0,6); `peso` solo lo lee `itinerarioDe` (sección 7) para elegir la ventana; `zonaDe` toma la zona de mayor peso y, en empate, la primera de `ruta`, sin sortear nada. `cordillera: null` es un veto estructural: el país no tiene etapa reina y su etapa decisiva es `media_alto` sobre una cota o `media_muro` (Benelux Tour, mapa 07 §2.2), con la única excepción de `et_reina_blanda` en zonas con `finalesAlto: 'largo'` (§6.2, `cono_sur`).

Regla de cobertura: los 56 países con carreras de equipos (mapa 02 §10, lista literal en el test) llevan fila escrita y el test exige que ninguno sea `fallback`. Se añaden 8 filas voluntarias para países cuya zona existe con nombre en `ZONAS` (AR, CL, NZ, IE, SE, FI, LV, QA; los ocho existen en `packages/shared/src/countries.ts`): 64 filas explícitas. Los 69 países restantes de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13, 133 entradas medidas con grep `^  { code:`) caen a `FALLBACK = { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }` y el test imprime cuántos (69) sin banda. La decisión 13 del esqueleto (§C.1) y §D.6 dicen «56 filas y 77 restantes»: este documento la enmienda a 64 filas explícitas (56 obligatorias más 8 voluntarias) y 69 en `FALLBACK`, porque §D pide corregir el bug AR/CL con `cono_sur` y eso exige filas para AR y CL; la pasada de coherencia propaga 64/69 a las secciones 0, 3, 7, 15, 16, 17 y 19, que hoy copian 56/77. El fallback es deliberadamente mediocre: un país del que no se sabe nada produce carreras del montón, y la marca lo hace visible. Deducir el relieve de `PAIS_ZONA` de `climate.ts` (l. 66) se descarta porque `tropical` junta a Colombia con Benín (`geografia.md` §5.4).

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

Consecuencias que conviene leer en voz alta antes de aceptarlas. D8 (§C.2) dice «Vueltas belgas, neerlandesas, danesas, del Golfo y australianas sin reina»; esta tabla lo extiende, y la sección 18 debe reescribir D8 con la lista completa para que el dueño decida con la cifra delante: son 12 filas y 30 países (BE, NL, LU, DE, HU, DK, EE, LT, SE, FI, LV, NO, GB, IE, AR, CL, AU, NZ, KR, TH, IN, AE, SA, OM, QA, BJ, BF, CM, MU, DZ). Las ediciones reales que pierden etapas `mountain` por ello (contadas en `editions.ts` con `RACE_COUNTRY`): `race-britain` 1 de 6, `race-emirates` 2 de 7, `race-hungary` 1 de 5, `race-oman` 1 de 5 y `race-thailand` 1 de 6 (6 etapas en 5 ediciones, que salen `media_alto`), más `race-fleche-sud` (LU, 5 etapas por `stageMix` con `terrain: 'mountain'`). Al revés, con cordillera nueva respecto del borrador anterior conservan sus reinas `race-czechia` (3 de 4), `race-poland` (3 de 7), `race-gila` (2 de 5), `race-kumano` (1 de 4), `race-guangxi` (1 de 6), `race-qinghai` (1 de 8), `race-langkawi` (3 de 8) y `race-rwanda` (1 de 8). Otras dos consecuencias: una vuelta colombiana no tiene etapa llana de pólder (`et_llana_viento` a 0 en `andes`); una vuelta argentina tiene como mucho un final largo por edición.

```ts
// packages/engine/src/routes/grammar/geo.ts
export const FALLBACK: Territorio = { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }
export function territorioDe(country: string | undefined): Territorio   // TERRITORIOS[country] ?? FALLBACK
export function zonaDe(country: string): GeoZone
// = la zona de mayor `peso` de territorioDe(country).ruta; empate: la primera en `ruta`; `generico` si fallback.
// zonaDe('FR') = 'bretana', zonaDe('ES') = 'cantabrico', zonaDe('BE') = 'flandes', zonaDe('CO') = 'andes'.
```

`zonaDe` solo la usan los 532 nacionales (§6.6) y `regionOf` como último recurso; el test de §6.8 prohíbe que una carrera de equipos llegue a ella.

### 6.4 `RACE_REGION`: la zona de cada carrera y de cada etapa

`RACE_REGION: Record<string, RaceRegion>` (`grammar/regions.ts`) tiene exactamente las 310 claves de `RACE_ROUTES`. Sustituye al sorteo `geo|${raceId}` que proponía `arquitectura.md` §3.5 para FR, IT y ES (retirado por la decisión 14: un sorteo pone Lombardía en los Dolomitas una temporada de cada tres) y a la columna `RaceRow.geo` que proponían arquitectura §5.3 e ingeniero §5.2. `RaceRow` (`calendar.ts` l. 381-398) NO cambia: ninguna fila de las tres tablas declara `country` (grep `country: '` sobre `calendar.ts`: 0) y las 310 sacan el país de `RACE_COUNTRY` por id (l. 579-898, 310 entradas, 56 países distintos); `RACE_REGION` sigue el mismo patrón, tabla por id en fichero aparte.

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>   // índice 1-based; solo las 60 ediciones y solo donde difiere de default
  skeleton?: SkeletonId              // carrera de un día con meta real en un puerto o muro: único candidato si admite()
  duda?: true                        // la ciudad no se reconoció o el dato se contradice: se imprime, no veta
}
export const RACE_REGION: Record<string, RaceRegion>
export function regionOf(raceId: string, stageIndex: number, country: string): GeoZone {
  return RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
}
```

`skeleton` existe porque la zona no fija la arquitectura: el esqueleto sale del sorteo `arch|raceId` (sección 5) y `ud_montana_alto` pesa 60 × 0,02 = 1,2 frente a 48 + 12 + 5 en `.1`, así que Nice → Isola 2000 (`race-mercantour`, `raceRoutes.ts` l. 698) sería en el 98 % de los mundos una `ud_montana` que baja del puerto y acaba en un valle, con la ficha diciendo «ciudades y distancia reales». `candidatos()` (sección 5, §5.7) lo respeta así: si `RACE_REGION[raceId].skeleton` existe y `admite(geo, SKELETONS[skeleton])` y `ARCH.pesoPorClase[skeleton][raceClass] > 0`, la lista de candidatos es solo ese esqueleto; si no admite, se ignora, se anota en `arch.frase` y sigue el sorteo normal. Solo se cura para carreras de un día (el test (c) de §6.8 lo exige) y solo cuando la meta de `RACE_ROUTES` es un puerto o un muro con nombre: en la misma tarde que `default`. D1 (sección 18) pasa a leerse «rareza al 0,02 más las carreras con meta en puerto real atadas por `skeleton`»; la pasada de coherencia lo lleva a §18 y a §B.2.

**Procedimiento de curación** (es contenido, no diseño: `datos.md` §5.2). Dueño operativo: el implementador del paso 2; dueño del contenido: el dueño del repositorio, que revisa con la galería (sección 16). Presupuesto: dos sesiones (310 `default` a un minuto cada uno con `raceRoutes.ts` abierto, y 384 etapas de edición a medio minuto, mapa 02 §7). Condición de cierre del paso 2: `duda` ≤ 20 y ninguna en las 60 ediciones; las dudas restantes se cierran con la galería del paso 4 antes del paso 8.

1. Para cada una de las 310 claves de `RACE_ROUTES`, en orden alfabético, se lee la localidad de META de la primera etapa (`stageEndpoints(id, 1)`, `raceRoutes.ts` l. 1167) y se escribe `default` con un comentario de una línea que nombre la ciudad o el puerto que decide («Oyonnax: Jura» para `race-ain`). Si salida y meta son de zonas distintas manda la meta. Si la meta es un puerto o un muro con nombre y existe un esqueleto de un día que acaba ahí (`ud_montana_alto`, `ud_muro_final`), se escribe `skeleton`.
2. Para las 60 carreras de `RACE_EDITIONS` (`editions.ts` l. 25) se abre la edición y se escribe `stages` SOLO para las etapas cuya zona difiere de `default`, con la meta de cada etapa como criterio. Cuando la primera etapa es la excepción (una salida en el llano de una vuelta andina) manda la mayoría de las metas de la edición para `default` y la primera va a `stages`. Las etapas con rasgos (`STAGE_FEATURES`) no lo necesitan (son `real`), pero se rellenan igual para que la ficha diga la zona; las 226 sin rasgos lo necesitan porque su relieve se dibuja con la firma de esa zona (sección 11).
3. Si una ciudad no se reconoce se pone `zonaDe(country)` a mano y se marca `duda: true` con el comentario `// DUDA:`; el test cuenta las dudas y las imprime, sin banda. Si el dato se contradice (`race-leon`, §6.1) también es `duda: true` y manda el país y las ciudades, no el nombre. La galería (sección 16) enseña las 20 carreras `cobbles` reales al lado de su equivalente generado y una página por zona: es ahí donde una zona mal puesta se ve.

Ejemplos obligados (ciudades de `raceRoutes.ts`, medidas en la lista de 310 claves). El esqueleto §D cita «`race-fleche` → ardenas»: ese id no existe; la Flecha Valona es `race-walloon-wall` (WT, `calendar.ts` l. 1100-1108, Namur → Huy, `raceRoutes.ts` l. 1139) y tiene recorrido REAL en `classicRoutes.ts` l. 249 y 713, así que nunca pasa por la gramática y su fila de `RACE_REGION` solo sirve a la ficha; `race-huy` (Charleroi → Huy, `.2`, `terrain: 'mountain'`, l. 2166-2173) es la carrera generada con meta en el Mur de Huy. Las secciones 4 (§4.7, que escribe la Flèche como `ud_muro_final` generada: es un ejemplo de escritura de una carrera real, no una etapa que el calendario genere), 15 y 19 deben usar estos dos ids.

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
| `race-basque-country` | Bilbao → Bilbao | cantabrico | muros vascos de [1; 4] km al [10; 15] % |
| `race-asturias` | Oviedo → Llanes | cantabrico | fila 3.8 |
| `race-andalusia` | Benahavís → Pizarra | andalucia | fila 3.10 |
| `race-castilla-leon` | Valladolid → Segovia | meseta | fila 3.9 |
| `race-down-under` | Tanunda → Tanunda | australia | Willunga 3 × 7,5 |
| `race-colombia` | Yopal → Yopal | andes, `stages: { 1: 'generico' }` | fila 3.20; Yopal está en los Llanos a 350 m y la e1 es `flat` (`editions.ts` l. 278): la mayoría de metas de la edición (Alto del Porvenir, La Línea, Alto del Vino) es andina |
| `race-langkawi` | Shah Alam → Kampar (e1) | montana_sur | Genting Highlands (e5, `raceRoutes.ts` l. 603) |
| `race-emirates` | Madinat Zayed → Liwa | golfo | fila 3.25 |
| `race-quebec`, `race-montreal` | Québec, Montréal | norteamerica | `ud_circuito` ×2 |

**La forma por etapa**, con `race-france` como se lee en `editions.ts` l. 26-50 (salida en Barcelona, 21 etapas): `default: 'francia_norte'` (Bordeaux, Bergerac, Nevers, Chalon-sur-Saône, París son llano de fila 3.1 y 1.4) y `stages: { 1: 'levante', 2: 'levante', 3: 'pirineos', 4: 'pirineos', 6: 'pirineos', 9: 'macizo_central', 10: 'macizo_central', 13: 'macizo_central', 14: 'macizo_central', 15: 'alpes', 16: 'alpes', 17: 'alpes', 18: 'alpes', 19: 'alpes', 20: 'alpes' }`. Así la etapa 6 (Pau → Gavarnie-Gèdre, `terrain: 'mountain'`, l. 34) se dibuja con puertos pirenaicos de [10; 17] km al [7; 8,5] % y no con la firma de Francia entera; la 13 y la 14 (Belfort, Le Markstein: Vosgos) van a `macizo_central` como proxy, igual que el Jura; y la 19 y la 20 (Alpe d'Huez dos veces) con `alpes`. Segundo ejemplo que muestra que la zona no es el país: `race-italy` sale de Bulgaria (Nessebar → Burgas, `editions.ts` l. 52-55): `stages: { 1: 'balcanes', 2: 'balcanes', 3: 'balcanes' }` y el resto por la bota, con `default: 'italia_sur'` para las etapas de Calabria y Campania y `stages` en `italia_centro`, `italia_norte` y `dolomitas` según la meta. Una etapa de edición sin `stages` toma `default`; nunca `zonaDe(country)`.

**Lo que `RACE_REGION` cambia en el país que ya existe:** nada en `RaceRow`, nada en `RACE_COUNTRY`, nada en `RACE_ROUTES`, nada en `climate.ts`. La nota de `climate.ts` l. 15-19 («cuando el calendario sepa la REGIÓN de cada carrera, esto se afina sin tocar nada más») queda respondida con un gancho y no con un cambio: `regionOf` es esa región, y el clima podrá leerla en un encargo posterior sin que E1 lo toque.

### 6.5 Cómo entra la geografía en el generador

La firma que recibe `generateStage` es `req.geo = ZONAS[regionOf(raceId, stageIndex, country)]` (sección 8, paso de identidad). A partir de ahí la geografía actúa en cinco sitios y solo en cinco:

1. **Disponibilidad**: `admite(geo, sk)` filtra el catálogo antes del sorteo `arch|raceId` (sección 5). Es una sola función con una sola firma en todo el documento, exportada por `grammar/geo.ts` (la sección 2 la declaraba con `requiere` primero y la sección 5 la llama `admite(req.geo, SKELETONS[id].requiere)`: las dos pasan a `admite(geo, sk)`, y §B.1 añade `admite`, `degradarPapel` y `Requiere` a los exports de `geo.ts`). `Skeleton.requiere` deja de ser `Partial<GeoSignature>` (§B.2), que no puede expresar «no nulo», un umbral ni una disyunción, y pasa a un tipo propio:

```ts
// packages/engine/src/routes/grammar/geo.ts
export interface Requiere {
  puerto?: true                          // geo.puerto !== null
  cota?: true                            // geo.cota !== null
  cotaKmMin?: number                     // geo.cota !== null && geo.cota.km[1] >= n (la cota más larga de la zona llega a n)
  muro?: true | 'adoquin'                // geo.muro !== null; 'adoquin' además geo.muro.adoquin && geo.adoquin >= 2
  adoquin?: 1 | 2 | 3                    // geo.adoquin >= n
  sterrato?: true                        // geo.sterrato
  viento?: 1 | 2 | 3                     // geo.viento >= n
  relieveMin?: Relieve                   // orden(geo.relieve) >= orden(r), con llano < ondulado < media < montana < alta
  relieveEn?: Relieve[]                  // geo.relieve ∈ lista
  finalesAlto?: 'corto' | 'largo'        // 'corto': geo.finalesAlto ∈ {corto, largo}; 'largo': === 'largo'
  altitud?: GeoSignature['altitud'][]    // geo.altitud ∈ lista
}
// skeletons.ts: Skeleton.requiere?: Requiere | Requiere[]   (lista = alternativas: se admite si alguna cumple)
export function admite(geo: GeoSignature, sk: Skeleton): boolean
// (1) sk.requiere (o alguna de sus alternativas) se cumple campo a campo; un campo ausente no exige nada;
// (2) todo Slot con n[0] >= 1 cuyo motif sea puerto, cota o muro tiene geo[motif] !== null y rangoEfectivo no vacío (punto 3);
// (3) la meta cabe: rangoEfectivo de ARCH.meta[sk.meta].km contra el motivo de la zona que le corresponde (punto 3).
export function degradarPapel(role: StageRole): StageRole | null
```

   La columna `requiere` de §5.2 y §5.3 es la única lista por esqueleto y esta sección no la duplica; lo que fija aquí es la traducción de su prosa al tipo, con cuatro enmiendas que la pasada de coherencia lleva a la sección 5: «`cota` con `cota.km[1] ≥ 3,3`» es `{ cota: true, cotaKmMin: 3.3 }` (`ud_montana_media`, `et_media_valle`, `et_media_tendida`; y también `et_media_alto`, cuyo hueco `cota` mide [3,3; 8,0]); «`finalesAlto ≠ 'ninguno'`» es `finalesAlto: 'corto'` (`et_media_alto`, `et_reina_alto_corto`); «`cota` y (`altitud ∈ {altiplano, media}` o `relieve = 'ondulado'`)» es la lista `[{ cota: true, cotaKmMin: 3.3, altitud: ['altiplano', 'media'] }, { cota: true, cotaKmMin: 3.3, relieveEn: ['ondulado'] }]` (`et_media_tendida`); «`adoquin ≥ 1`» es `{ adoquin: 1 }` (`ud_adoquin_ligero`; la tierra la resuelve la instanciación, punto 5), y `ud_muros_adoquin` es `{ adoquin: 2, muro: 'adoquin' }`. `et_reina_encadenada` lleva `relieveMin: 'alta'` (§5.3). Nada más lleva relieve.

2. **Degradación**: si el papel pedido no tiene ningún esqueleto admitido en `geo`, `degradarPapel(role)` baja UN escalón y se vuelve a filtrar; siempre hacia abajo, nunca hacia arriba (un país llano no gana puertos), y se anota en `arch.frase` («pedía reina; en flandes no hay puerto: media con muro»). Tabla cerrada: `reina_alto → media_alto`, `reina_valle → media`, `reina_encadenada → media_alto`, `montana_corta → media_alto`, `media_alto → media`, `media_muro → media`, `media → llana`, `llana_viento → llana`, `cronoescalada → cri`; `prologo`, `cri` y `llana` devuelven `null` (no degradan). Para `un_dia` el escalón es `ESCALON_TERRENO` de la sección 5 (`cobbles → classic → hilly → flat`, `mountain → hilly`); `terrain` de la fila es sesgo (×4 sobre el esqueleto que le corresponde, sección 5) y nunca orden: `terrain: 'mountain'` en Dinamarca da `ud_circuito` con cotas y lo dice en la ficha. El nombre es `degradarPapel` y no `degradar`, porque `degradar(relieve: Relieve): Relieve` es la cadena de relieve de la decisión 12 (sección 2, `alta → montana → media → ondulado → llano`) y la sección 8 (§8.5) degrada motivos (`puerto → cota → muro → enlace`) con `degradarMotivo(kind, geo)`: tres funciones, tres nombres, las tres en `geo.ts` y recogidas en la sección 3. `degradarPapel` es distinto de `arch.degradado`, que marca la caída a la plantilla canónica tras `ARCH.colocacion.maxIntentos` (sección 8).

3. **Rangos**: cada motivo instanciado sortea en el rango EFECTIVO `[max(lo_esqueleto, lo_zona); min(hi_esqueleto, hi_zona)]` de `Slot.params.kmRango` y `gRango` contra `geo.puerto`, `geo.cota` o `geo.muro` según el motivo. La intersección NO está garantizada por construcción (los `params` del esqueleto no son subconjuntos de los de la zona: `ud_esprint_capi` pide g [4; 5] y `alpes` da [5; 7]), y por eso la regla es esta: si el rango efectivo de `km` queda vacío en un hueco con `n[0] ≥ 1` o en la meta, `admite()` devuelve `false` (el esqueleto no se ofrece en esa zona); si queda vacío en un hueco opcional (`n[0] = 0`), el hueco se instancia con `n = 0` y se anota; si queda vacío solo en `g`, manda el rango del ESQUELETO (la pendiente es identidad del esqueleto: Poggio al 4 % es Poggio) y se anota. La meta se compara así: `alto_largo` contra `geo.puerto`; `alto_corto` contra `geo.cota` (contra `geo.puerto` si `geo.cota === null`); `muro_meta` contra `geo.muro`; `cima_cerca`, `descenso_meta` y `valle` contra el motivo del último hueco obligatorio del esqueleto (`puerto` en las reinas, `cota` en las medias y en `ud_montana`); `esprint`, `repecho` y `sector_meta` no se comparan (un repecho de ≤ 2,9 km cabe bajo cualquier cota; el sector lo cubre `adoquin`). El test (h) de §6.8 comprueba, para cada par (zona × esqueleto admitido), que los huecos obligatorios y la meta tienen rango efectivo de `km` no vacío, y sella dónde ha hecho falta ampliar la zona (`italia_norte.cota.g`, `andes.cota.km`, §6.2) o el esqueleto: `et_crono` y `nc_crono` pasan a `cota` de km [2,5; 5] y g [4; 6] (eran [2,5; 3] × [4; 5], que no cabían en `alpes`, `pirineos`, `dolomitas`, `andalucia` ni `italia_norte`; enmienda a §5.3). `forma` del puerto es la de la zona salvo que el esqueleto la fije.

4. **Pesos y relleno**: `peso = pesoBase × (geo.pesos[id] ?? 1) × ARCH.pesoPorClase[id][clase]` (sección 5); `amplitud` es la ondulación de todo `enlace` (tope `ARCH.motivo.enlace.ampMax` 2,4, que garantiza que ningún relleno alcance el 3 % que `finish.ts` lee como cota) y sustituye al `bumpy` binario de `rolling` (`profileGen.ts` l. 105) y a `RELIEF.rollingAmplitude` para lo generado; `featureProfile.ts` sigue con `RELIEF` (decisión 27). Con `amplitud` 0,55 una llana belga de 180 km pasa de los 661 a 1.413 m de relleno de hoy (mapa 01 §1) a unos 300 a 700, que es lo que Brugge-De Panne acumula.

5. **Vetos V1 a V4** (sección 9), sobre el perfil final y no sobre la intención: V1 ningún `puerto` (segmento con `climbSize ≥ 8,5`) donde `geo.puerto === null`; V2 ningún `paves` con `firme: 'adoquin'` donde `geo.adoquin < 2`, salvo sector ligero (≤ 1,5 km y ≤ 2★) donde `geo.adoquin === 1`, ningún `paves` con `firme: 'tierra'` sin `geo.sterrato`, y ningún muro `adoquin: true` donde `geo.adoquin < 2` (mismo umbral que `Requiere.muro: 'adoquin'` y que la regla 4 de `validateMotif`: la sección 4 l. 140 y la 9 V2 decían «≥ 2» para el sector y «=== 0» para el muro y pasan a este texto); V3 `ud_sterrato` solo con `geo.sterrato`; V4 `alto_largo` solo con `finalesAlto: 'largo'` y ningún `puerto ≥ 15 km` fuera de `altitud ∈ {alta, altiplano, media}`, con el desnivel de un solo puerto integrado por tramos. La instanciación de `ud_adoquin_ligero` (sección 8, `renderSkeleton`) aplica la misma semántica antes de dibujar: en zonas con `adoquin === 1` recorta sus sectores a ≤ 1,5 km y 2★, y en zonas con `adoquin === 0` y `sterrato` (hoy ninguna: `bretana` y `britanicas` llevan 1) rinde todos sus sectores con `firme: 'tierra'`; así V2 y V3 no pueden fallar por culpa de la tabla si `admite` hizo su trabajo, y existen para que un cambio futuro en la colocación no los deje sin red.

Lo que la geografía NO hace: no elige el papel de la etapa (eso es la composición, sección 7), no mueve `km` (eso es `ARCH.km.porClase`), no toca `Segment` y no cambia entre ediciones (`GeoZone` es identidad, decisión 20).

### 6.6 Los nacionales por zona

Los 532 campeonatos son 133 países × 4 pruebas (`calendar.ts` l. 360-365: `cc = code.toLowerCase()`, `nc-${cc}-road` con `classic(220)`, `nc-${cc}-u23-road` con `classic(180)`, `nc-${cc}-itt` con `itt(38)`, `nc-${cc}-u23-itt` con `itt(30)`; los ids van en minúsculas), hoy idénticos salvo la semilla. Con esta sección `nationalChampionships` llama a `generateStage` con `geo = ZONAS[zonaDe(code)]` y `role: 'un_dia'` (o `'un_dia_u23'`, sección 7), y el esqueleto es `nc_ruta` (circuito de [10; 20] km × [8; 16] vueltas con los motivos que la zona dé; `kind` por zona con `skeletonFor`, §5.7 regla 2) para las dos rutas y `nc_crono` para las dos cronos (sección 5). La meta de `nc_ruta` es una sola, `esprint` a [1,2; 4,3] km del último paso (§5.1 regla 2: una `meta` por esqueleto); lo que cambia por zona son los hijos del circuito, con los rangos efectivos del punto 3 de §6.5. Es la promesa de `docs/motor.md` §V.3 l. 1613 («un nacional belga es llano y de adoquines; uno colombiano, de montaña») hecha función (el mapa 05 §2 la da por decidida en agosto de 2026 y nunca implementada):

| País | `zonaDe` | Lo que da `nc_ruta` |
| --- | --- | --- |
| BE | flandes | `clasica / Classic` (sin cota): circuito con uno o dos `muro` adoquinados por vuelta y hasta dos `sector`, meta `esprint` |
| CO | andes | `media / Hills`: circuito con `cota` de [3,3; 6] ∩ [2,5; 8] = [3,3; 6] km, meta `esprint`; ficha «altiplano» |
| DK | escandinavia | `media / Hills`: circuito con `cota` de [3,3; 6] km y `muro` corto, `viento` 3 en la ficha («llano abierto») |
| IT | italia_norte | `media / Hills`: circuito con `cota` de [4; 6] km y `muro` al [10; 16] %, meta `esprint` |
| FR | bretana | `clasica / Classic` (`cota.km[1]` 3,0 < 3,3): circuito con `muro` de [0,5; 2] km, meta `esprint` |
| los 69 de `FALLBACK` | generico | `media / Hills`: circuito con `cota` de [3,3; 6] km y `muro` [8; 10] %, meta `esprint` |

`repecho` y `muro_meta` no aparecen porque `nc_ruta` no los declara; que `repecho` no lo use ningún esqueleto del catálogo (§5.2, §5.3) es un hueco de la sección 5 que la pasada de coherencia resuelve allí, no aquí.

Los nacionales son los únicos que pasan por `zonaDe`. El km deja de ser fijo en las rutas: los 220 y 180 de hoy (`calendar.ts` l. 360-365) se sustituyen por un sorteo `firma|raceId` sobre `ARCH.km.porClase.NC.ruta` [180, 60] (es decir, [180; 240]) y `.NC.sub23` [140, 40] ([140; 180]), estable entre ediciones desde la temporada 0 (decisión 36). Las cronos conservan su km de fila como contrato (38 y 30, V10), sin sorteo, porque `nc_crono` mide [25; 45] y no hay razón para mover una crono nacional: `ARCH.km.porClase.NC` pasa a `{ ruta: [180, 60], sub23: [140, 40], crono: 38, u23crono: 30 }` (enmienda a §B.3 y a la sección 12). La saturación del banco se remide con los `nc-*-road` (sección 13), porque son 266 rutas el mismo día.

### 6.7 Viento y altitud son metadatos, no física

El encargo pide «relieve, adoquín, viento, altitud, costa, meseta»; E1 entrega relieve y firme, y el resto lo declara sin fingirlo (decisión 17; riesgo 3 de cobertura y 2 de ejecutabilidad). La razón está medida en el mapa 03 §5.1: el viento es un número por etapa (`rng('viento')^2.2` contra `windMin` 0,87, `simulate.ts` l. 1157-1160) que solo muerde en `block.tipo === 'llano'` y en cualquier km, y `Segment` no lleva altitud (`types.ts` l. 12-48). Un pólder belga y una llanura padana seguirán teniendo la misma probabilidad de abanico.

Lo que sí se hace: `GeoSignature.viento` y `.altitud` viajan en `GeneratedStage.arch.metadatos` y llegan a la ficha con texto que no promete: «llano abierto» (viento 3), «llano» (≤ 2), «altiplano», «alta montaña», «costa»; nunca «abanicos» ni «frío en la cima». `altitud` además decide V4 y `finalesAlto` reparte los finales largos. `expuesto` (`ARCH.motivo.expuesto.amp` 1,0) y `amplitud` baja son lo máximo que el perfil puede decir de un pólder sin tocar `Segment`. Lo que queda para el motor (viento mínimo por zona, altitud en `Segment`, exposición por tramo) va a la sección 17 con la cita a `docs/motor.md` §19.5.

### 6.8 Los tests de consistencia interna

`grammar/geo.test.ts` y `grammar/regions.test.ts` se escriben antes que las tablas (paso 2 del plan, sección 15). No prueban que la geografía sea verdad: prueban que la tabla no se contradice, que cabe en `ARCH`, que todo esqueleto admitido en una zona se puede instanciar en ella, que resuelve todo lo que el calendario le pide y que ningún veto V1 a V4 puede dispararse por culpa de la tabla. `SKELETONS` es `Record<SkeletonId, Skeleton>` (§B.1, sección 5): se itera con `Object.values` y se indexa con `SKELETONS.id`.

```ts
// packages/engine/src/routes/grammar/geo.test.ts
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { COUNTRIES } from '@cyclingstar/shared'
import { FALLBACK, TERRITORIOS, ZONAS, admite, territorioDe, zonaDe } from './geo.js'
import { SKELETONS } from './skeletons.js'
import type { GeoSignature, Skeleton } from './geo.js'

const dentro = (r: [number, number], de: [number, number]) => r[0] <= r[1] && r[0] >= de[0] && r[1] <= de[1]
const PAISES_CON_EQUIPOS = ['FR','BE','IT','ES','NL','TR','PT','PL','DE','CN','SI','GR','AU','DK','NO','CZ','HR','JP','CH','CA','US','AT','RO','AE','OM','GB','LU','RS','LT','VE','CO','SA','HU','MY','CY','BA','AZ','AL','EE','AD','BG','XK','SK','IN','TW','TH','KR','RW','DZ','BJ','MU','CM','MA','BF','GT','EC'] // mapa 02 §10
const rangoZona = (z: GeoSignature, motif: string) =>
  motif === 'puerto' ? z.puerto?.km : motif === 'cota' ? z.cota?.km : motif === 'muro' ? z.muro?.km : undefined
const interseca = (a: [number, number], b: [number, number]) => Math.max(a[0], b[0]) <= Math.min(a[1], b[1])
/** Motivo de la zona contra el que se compara la meta (§6.5 punto 3); null = no se compara. */
const motivoDeMeta = (s: Skeleton, z: GeoSignature): string | null => {
  if (s.meta === 'alto_largo') return 'puerto'
  if (s.meta === 'alto_corto') return z.cota ? 'cota' : 'puerto'
  if (s.meta === 'muro_meta') return 'muro'
  if (s.meta === 'cima_cerca' || s.meta === 'descenso_meta' || s.meta === 'valle')
    return [...s.slots].reverse().find((sl) => sl.n[0] >= 1 && ['puerto', 'cota', 'muro'].includes(sl.motif))?.motif ?? null
  return null
}

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
  it('(b) los bordes con nombre: puerto ≥ 9, cota ≤ 8, muro ≤ 3', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) expect(z.puerto.km[0]).toBeGreaterThanOrEqual(9)
      if (z.cota) expect(z.cota.km[1]).toBeLessThanOrEqual(8)
      if (z.muro) expect(z.muro.km[1]).toBeLessThanOrEqual(3)
    }
  })
  it('(c) adoquín y sterrato son coherentes con el muro y con V2', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.muro?.adoquin) expect(z.adoquin).toBeGreaterThanOrEqual(2)   // muro adoquinado exige adoquin ≥ 2 (§6.2, §6.5)
      if (z.adoquin === 0) expect(z.muro?.adoquin ?? false).toBe(false)
    }
  })
  it('(d) V4 no puede dispararse desde la tabla: puerto ≥ 15 km solo con altitud media/alta/altiplano; largo exige puerto', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto && z.puerto.km[1] >= 15) expect(['media', 'alta', 'altiplano']).toContain(z.altitud)
      if (z.finalesAlto === 'largo') expect(z.puerto).not.toBeNull()
      if (z.finalesAlto === 'ninguno') expect(['llano', 'ondulado']).toContain(z.relieve)
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
    expect(admite(ZONAS.alpes, SKELETONS.et_reina_alto_largo)).toBe(true)
    expect(admite(ZONAS.flandes, SKELETONS.et_reina_alto_largo)).toBe(false)     // puerto null
    expect(admite(ZONAS.levante, SKELETONS.et_reina_alto_largo)).toBe(false)     // finalesAlto corto
    expect(admite(ZONAS.levante, SKELETONS.ud_montana)).toBe(true)               // puerto sin exigir relieve (Sa Calobra)
    expect(admite(ZONAS.flandes, SKELETONS.ud_sterrato)).toBe(false)
    expect(admite(ZONAS.bretana, SKELETONS.et_media_valle)).toBe(false)          // cotaKmMin 3,3 > 3,0
    expect(admite(ZONAS.italia_norte, SKELETONS.ud_esprint_capi)).toBe(true)     // cota.g [4; 7] ∩ [4; 5]
    expect(admite(ZONAS.italia_norte, SKELETONS.ud_adoquin_ligero)).toBe(true)   // adoquin 1: sectores ligeros
    expect(admite(ZONAS.italia_norte, SKELETONS.ud_adoquin)).toBe(false)         // adoquin 1 < 2
    expect(admite(ZONAS.cono_sur, SKELETONS.et_reina_blanda)).toBe(true)
    expect(ZONAS.cono_sur.cota).not.toBeNull()                                   // su hueco cota×[1; 2] cabe
    expect(interseca(ARCH.meta.alto_largo.km, ZONAS.cono_sur.puerto!.km)).toBe(true)
    expect(admite(ZONAS.golfo, SKELETONS.et_reina_blanda)).toBe(false)           // finalesAlto corto (D8)
    expect(admite(ZONAS.golfo, SKELETONS.et_media_alto)).toBe(true)              // race-sharjah: final en alto
  })
  it('(h) toda zona admite un esqueleto por papel base y todo esqueleto admitido se puede instanciar', () => {
    const todos = Object.values(SKELETONS)
    for (const z of Object.values(ZONAS)) {
      const admitidos = todos.filter((s) => admite(z, s))
      expect(admitidos.some((s) => s.kind === 'llana')).toBe(true)
      expect(admitidos.some((s) => s.kind === 'cri')).toBe(true)
      expect(admitidos.some((s) => s.id === 'ud_esprint')).toBe(true)
      expect(admitidos.some((s) => s.id.startsWith('et_media_'))).toBe(true)    // hilly de edición nunca degrada a llana
      for (const id of Object.keys(z.pesos)) expect(admitidos.map((s) => s.id)).toContain(id)   // ningún peso sobre un no admitido
      for (const s of admitidos) {
        for (const slot of s.slots) {
          if (slot.n[0] === 0) continue
          const zr = rangoZona(z, slot.motif)
          if (['puerto', 'cota', 'muro'].includes(slot.motif)) expect(zr).toBeDefined()
          if (zr && slot.params?.kmRango) expect(interseca(zr, slot.params.kmRango)).toBe(true)
        }
        const m = motivoDeMeta(s, z)
        if (m) { const zr = rangoZona(z, m); expect(zr).toBeDefined(); expect(interseca(zr!, ARCH.meta[s.meta].km)).toBe(true) }
      }
    }
  })
})
```

```ts
// packages/engine/src/routes/grammar/regions.test.ts
import { describe, expect, it } from 'vitest'
import { RACE_ROUTES } from '../raceRoutes.js'
import { RACE_EDITIONS } from '../editions.js'
import { RACE_REGION, regionOf } from './regions.js'
import { ZONAS, zonaDe } from './geo.js'
// No importa SEASON_CALENDAR: cargar el calendario entero (578 ms, sección 14) no hace falta para probar una tabla por id.

describe('grammar/regions: RACE_REGION cubre las 310 carreras de equipos y ninguna cae al país', () => {
  it('(a) las claves son exactamente las de RACE_ROUTES', () => {
    expect(Object.keys(RACE_REGION).sort()).toEqual(Object.keys(RACE_ROUTES).sort())   // 310
  })
  it('(b) ninguna carrera de equipos pasa por zonaDe(country); solo los .NC', () => {
    for (const id of Object.keys(RACE_ROUTES)) expect(regionOf(id, 1, '')).toBe(RACE_REGION[id].stages?.[1] ?? RACE_REGION[id].default)
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
    const COBBLES = ['race-across-flanders', 'race-antwerp', 'race-bruges', 'race-denain', 'race-flanders', 'race-flandrien',
      'race-harelbeke', 'race-kuurne', 'race-muur', 'race-nokere', 'race-opening-classic', 'race-roubaix',
      'race-roubaix-espoirs', 'race-rutland', 'race-samyn', 'race-tours', 'race-veneto-classic', 'race-wevelgem', 'race-youngster']
    expect(COBBLES).toHaveLength(19)
    for (const id of COBBLES) {
      const z = ZONAS[regionOf(id, 1, '')]
      expect(z.adoquin >= 1 || z.sterrato).toBe(true)   // race-rutland y race-tours por tierra; race-veneto-classic por adoquín urbano (adoquin 1)
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

Notas sobre los tests: (d) del primer fichero es el que hace que V4 sea imposible de disparar por la tabla, y (h) el que hace que todo esqueleto admitido tenga motivo y rango donde dibujarse (punto 3 de §6.5): si (h) falla al primer `pnpm test` del paso 2, lo que se toca es una fila de `ZONAS` o un rango de esqueleto, y se anota cuál; (f) de `geo.test.ts` no tiene banda porque el número de países en fallback (69) es un hecho de contenido, no un objetivo. El test (b) de `regions.test.ts` es la obligación 8 del encargo de síntesis hecha aserción: la única forma de que una carrera de equipos caiga al país es borrar su fila, y eso rompe (a). `duda` y `skeleton` son los dos campos opcionales de `RaceRegion` (§6.4) que la sección 3 debe recoger en §B.2.

Lo que el dueño tiene que revisar de esta sección, una tarde con la galería delante (sección 16 y sección 18): las 31 filas de `ZONAS` con la pregunta «¿existe esto aquí?», y en particular las dos sin fila en el mapa 07 (`montana_sur`, `africa_llana`); las 12 filas de `TERRITORIOS` con `cordillera: null` (D8, con la lista de 30 países y las 6 etapas de edición que pierden reina); las carreras atadas con `skeleton` (`race-mercantour`, `race-huy` y las que la curación añada); y las carreras marcadas `duda` de `RACE_REGION`, empezando por `race-leon`, donde la pregunta es si se corrige el dato (`RACE_COUNTRY` a `FR`, ruta a Lannilis) en un encargo de datos.

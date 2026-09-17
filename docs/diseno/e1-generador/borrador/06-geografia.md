## 6. La geografía: zonas, territorios y RACE_REGION

Hoy el país existe en el calendario y no llega al generador: `buildRace` lo calcula en `calendar.ts` l. 889 (`row.country ?? RACE_COUNTRY[row.id]`) y no lo pasa a ninguna de las tres ramas (mapa 02 §1 y §6: «el país NO entra en ningún generador de recorrido»); dentro del motor solo lo lee el clima (`climateOf`, `world/climate.ts` l. 166). Esta sección escribe la tabla que faltaba, en tres capas y con tres ficheros: `ZONAS` (qué existe en cada sitio, `grammar/geo.ts`), `TERRITORIOS` (por qué zonas pasa un país y dónde está su reina, `grammar/geo.ts`) y `RACE_REGION` (en qué zona corre cada carrera y cada etapa, `grammar/regions.ts`). Los tipos son los de la sección 3 (`GeoZone`, `Relieve`, `GeoSignature`, `Territorio`, `RaceRegion`) y no se repiten aquí salvo donde hace falta fijar una semántica.

### 6.1 Qué es DATO y qué es JUICIO

Se dice con esas palabras porque los tres jueces lo señalaron como el riesgo principal (`juicios/cobertura.md` §5 riesgo 1; `juicios/motor.md` §5 riesgo 7; `juicios/ejecutabilidad.md` §5 riesgo 1): la tabla geográfica sale del mapa 07 §3, que se declara orientativo, y no hay validación externa posible (PCS y Overpass vetados, `docs/fuentes-recorridos.md`, mapa 05 §6).

Es DATO, y por tanto no se discute ni se ajusta a ojo:

1. Las 20 filas `terrain: 'cobbles'` del calendario (grep sobre `calendar.ts`, medido en mapa 07 §3 consecuencia 1 y comprobado de nuevo: 20). Las 20 caen en Bélgica, norte de Francia, Reino Unido o Véneto, es decir, en zonas con adoquín o tierra; ningún dato existente choca con la tabla.
2. Las ciudades de salida y meta de `raceRoutes.ts` (`RACE_ROUTES`, l. 11): 310 claves, una por carrera de equipos, sin huérfanas (mapa 02 §8). Son reales aunque el relieve que hoy se dibuja debajo sea inventado; son la única fuente de la curación de `RACE_REGION` (§6.4).
3. Las 177 etapas con rasgos (`STAGE_FEATURES`, `stageFeatures.ts` l. 15) y las 3 grandes vueltas de `RACE_EDITIONS` (`editions.ts` l. 25; 60 ediciones en total, medido con grep). No pasan por esta tabla: su origen es `real` y su huella se sella antes de tocar `calendar.ts` (sección 11).

Es JUICIO todo lo demás: cada rango de `ZONAS`, cada `null`, cada peso, cada `ruta` y cada `cordillera` de `TERRITORIOS`, y la zona que `RACE_REGION` asigna a cada carrera. El juicio se sostiene con tres instrumentos, y no con una fuente: la fila del mapa 07 §3 citada en el comentario de cada zona (la columna «fila» de §6.2), los tests de consistencia interna de §6.8 (que no prueban que la tabla sea verdad, sino que no se contradice y que cabe en `ARCH`), y la galería de la sección 16, que es donde el dueño juzga 30 zonas y 32 esqueletos en una tarde con tres preguntas por perfil. Cuando la galería diga que algo no existe en un sitio, lo que se edita es una fila de `ZONAS`, de `TERRITORIOS` o de `RACE_REGION`: datos, nunca código.

### 6.2 Las 29 zonas: `ZONAS`

`ZONAS: Record<GeoZone, GeoSignature>` tiene 30 filas: las 29 zonas con nombre más `generico`, que es la firma de un país sin territorio. Las 25 firmas del mapa 07 §3 se funden en 29 porque Italia, España y Francia son varias geografías cada una (125 de 310 carreras, `arquitectura.md` §3.5), y `italia_sur` se separa de `italia_centro` porque el mapa 07 fila 3.4 describe colinas y muros para Toscana y Marcas y solo admite «puertos de 20 km salvo Abruzos»: los Abruzos (Blockhaus, Prati di Tivo, Gran Sasso a 2.130 m) no caben en una zona `media`.

Reglas de lectura de la tabla, que son también las reglas del fichero:

- Todo rango es `[min; max]` y está CONTENIDO en el rango del motivo en `ARCH` (sección 12): `puerto.km ⊆ [9; 25]`, `puerto.g ⊆ [5; 9]`, `cota.km ⊆ [2,5; 8]`, `cota.g ⊆ [4; 7]`, `muro.km ⊆ [0,4; 3]`, `muro.g ⊆ [8; 16]`, `amplitud ≤ 2,4`. Lo que la geografía hace es estrechar, nunca ampliar; por eso Ghisallo (8,6 km) sale como 9,0 en `italia_norte` (el hueco [8,0; 9,0] asumido en la sección 12) y Alto de Letras (80 km, fila 3.20) no existe en E1 (techo 25 km de `ARCH.motivo.puerto.km`).
- `null` significa «aquí no existe» y lo hacen cumplir V1 (puerto), V2 (adoquín) y V3 (sterrato) sobre el perfil final, además de `admite()` sobre el esqueleto antes de dibujar (§6.5). `cota: null` es el pólder y el desierto: Flandes, norte de Francia, Golfo, cono sur.
- `finalesAlto` es un solo valor con orden: `'largo'` implica que también existe el corto (`alto_corto` requiere `corto` o `largo`; `alto_largo` requiere `largo`); `'ninguno'` prohíbe `et_media_alto` y `et_reina_*` con meta en alto.
- `relieve` es el techo: `llano < ondulado < media < montana < alta`. `et_reina_*`, `et_montana_corta` y `ud_montana` requieren `montana` o más; `et_reina_blanda` no (ver `cono_sur`).
- `viento` y `altitud` son METADATOS: viajan a `arch.metadatos` y a la ficha, y `altitud` además alimenta V4; ninguno llega al motor (§6.7).
- `pesos` multiplica `Skeleton.pesoBase` (sección 5); lo que no aparece vale 1; 0 prohíbe.

| Zona (fila mapa 07)                                     | relieve  | puerto km × %, forma           | cota km × %         | muro km × %, adoquín               | adoquín | sterrato    | viento | altitud   | amplitud | finalesAlto | pesos (≠ 1)                                                                                      |
| ------------------------------------------------------- | -------- | ------------------------------ | ------------------- | ---------------------------------- | ------- | ----------- | ------ | --------- | -------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `flandes` (3.1: BE, NL)                                 | ondulado | null                           | null                | [0,4; 2,2] × [8; 14], sí           | 3       | no          | 3      | mar       | 0,55     | ninguno     | ud_muros_adoquin 3, ud_muros 2, et_media_muro 2, et_llana_viento 2, ud_circuito 0,5              |
| `ardenas` (3.2: BE sur, LU)                             | media    | null                           | [2,5; 4,5] × [5; 7] | [0,8; 2,0] × [8; 13], no           | 1       | no          | 1      | colina    | 0,85     | corto       | ud_muro_final 2, ud_montana_media 1,5, et_media_muro 1,5, et_media_alto 1,2                      |
| `bretana` (3.13)                                        | ondulado | null                           | [2,5; 3,0] × [5; 7] | [0,5; 2,0] × [8; 10], no           | 1       | sí (tierra) | 3      | colina    | 0,7      | ninguno     | ud_circuito 1,5, ud_adoquin_ligero 1,5, et_llana_viento 1,5                                      |
| `francia_norte` (3.1, 1.4)                              | llano    | null                           | null                | [0,5; 1,5] × [8; 10], sí           | 2       | no          | 2      | mar       | 0,55     | ninguno     | ud_adoquin 3, ud_adoquin_ligero 2, ud_esprint 1,5, et_llana_viento 1,5                           |
| `macizo_central` (3.14)                                 | montana  | [9; 17] × [6; 8], irregular    | [2,5; 6] × [5; 7]   | [1; 2] × [8; 12], no               | 0       | no          | 1      | media     | 1,0      | largo       | et_media_valle 1,5, et_media_alto 1,5, ud_montana_media 1,5, et_reina_alto_corto 1,2             |
| `alpes` (3.5: FR, IT, CH, AT)                           | alta     | [12; 25] × [5,5; 8,5], regular | [4; 8] × [5; 7]     | null                               | 0       | no          | 0      | alta      | 1,15     | largo       | et_reina_alto_largo 2, et_reina_valle 1,3, et_reina_encadenada 1,2, et_llana 0,5                 |
| `pirineos` (3.6: FR, ES, AD)                            | alta     | [10; 17] × [7; 8,5], regular   | [4; 8] × [6; 7]     | null                               | 0       | no          | 0      | alta      | 1,15     | largo       | et_reina_encadenada 2, et_reina_alto_largo 1,5, et_reina_alto_corto 1,2                          |
| `provenza` (3.15)                                       | montana  | [15; 22] × [6,5; 7,5], regular | [2,5; 8] × [5; 7]   | [1; 2] × [8; 9], no                | 0       | no          | 3      | media     | 0,9      | largo       | et_llana_viento 2, et_media_valle 1,3                                                            |
| `italia_norte` (3.3)                                    | montana  | [9; 13] × [6; 8], irregular    | [4; 8] × [6; 7]     | [1; 2] × [10; 16], no              | 1       | no          | 0      | media     | 1,0      | corto       | ud_montana 2, ud_esprint_capi 2, ud_montana_media 1,5, et_reina_alto_corto 1,3                   |
| `italia_centro` (3.4)                                   | media    | null                           | [2,5; 6] × [5; 7]   | [0,5; 2,1] × [9; 14], no           | 0       | sí          | 1      | colina    | 0,9      | corto       | ud_sterrato 3, ud_muro_final 2, et_media_muro 1,5, ud_circuito 1,3                               |
| `dolomitas` (3.7)                                       | alta     | [9; 14] × [7,5; 9], progresiva | [4; 8] × [6; 7]     | null                               | 0       | no          | 0      | alta      | 1,15     | largo       | et_reina_alto_corto 2, et_reina_encadenada 1,5, et_montana_corta 1,5                             |
| `italia_sur` (3.4 Abruzos; Lazio, Calabria, Cerdeña)    | montana  | [9; 16] × [5; 8], progresiva   | [2,5; 7] × [5; 7]   | [0,5; 2] × [8; 12], no             | 0       | no          | 2      | media     | 0,9      | largo       | et_media_valle 1,3, ud_montana_media 1,3, et_reina_alto_largo 1,2                                |
| `cantabrico` (3.8)                                      | montana  | [9; 15] × [7; 9], irregular    | [3; 8] × [6; 7]     | [1; 3] × [10; 15], no              | 0       | no          | 1      | media     | 1,1      | largo       | et_reina_alto_corto 2, et_media_muro 1,5, ud_montana 1,5, et_llana 0,3                           |
| `meseta` (3.9)                                          | ondulado | null                           | [3; 8] × [4; 6]     | null                               | 0       | no          | 3      | altiplano | 0,6      | corto       | et_llana_viento 2, et_media_tendida 2, ud_esprint 1,5                                            |
| `andalucia` (3.10)                                      | montana  | [9; 20] × [6; 8], regular      | [4; 8] × [5; 7]     | [1; 2] × [8; 11], no               | 0       | no          | 2      | alta      | 0,9      | largo       | et_media_alto 1,5, et_reina_alto_largo 1,3, et_llana 1,2                                         |
| `levante` (3.11)                                        | media    | [9; 22] × [5; 7], regular      | [3; 6] × [6; 7]     | [1; 3] × [10; 12], no              | 0       | no          | 1      | media     | 0,9      | corto       | et_media_alto 2, ud_muro_final 1,3, et_media_muro 1,2                                            |
| `portugal` (3.12)                                       | montana  | [9; 20] × [5; 7], regular      | [3; 8] × [6; 7]     | [1; 2,6] × [8; 10], no             | 1       | no          | 2      | media     | 0,9      | largo       | et_media_alto 1,3, et_reina_alto_largo 1,2, et_llana_viento 1,2                                  |
| `centroeuropa` (3.16)                                   | media    | [9; 12] × [5; 8], regular      | [2,5; 6] × [5; 7]   | [1; 2] × [8; 10], no               | 1       | no          | 1      | colina    | 0,85     | corto       | et_media_valle 1,5, ud_circuito 1,3, et_media_alto 1,2                                           |
| `escandinavia` (3.17)                                   | ondulado | null                           | [2,5; 7] × [5; 7]   | [0,5; 1,0] × [8; 10], no           | 1       | no          | 3      | mar       | 0,6      | corto       | et_llana_viento 2, ud_esprint 1,5, ud_circuito 1,3                                               |
| `britanicas` (3.18)                                     | media    | null                           | [2,5; 8] × [6; 7]   | [0,4; 1,0] × [10; 16], sí (urbano) | 1       | sí (tierra) | 3      | colina    | 0,9      | corto       | ud_circuito 1,5, et_media_alto 1,3, et_media_muro 1,3                                            |
| `balcanes` (3.19)                                       | montana  | [10; 23] × [5; 7], regular     | [3; 8] × [5; 7]     | null                               | 0       | no          | 2      | media     | 0,9      | largo       | et_reina_alto_largo 1,3, et_llana 1,2, et_media_valle 1,2                                        |
| `anatolia` (3.19: TR, CY, AZ)                           | montana  | [15; 21] × [6; 7], regular     | [3; 8] × [5; 7]     | null                               | 0       | no          | 2      | media     | 0,8      | largo       | et_reina_alto_largo 1,5, et_llana 1,5, et_llana_viento 1,2                                       |
| `andes` (3.20)                                          | alta     | [15; 25] × [5; 7], regular     | [5; 8] × [5; 7]     | null                               | 0       | no          | 0      | altiplano | 1,0      | largo       | et_reina_valle 2, et_reina_alto_largo 1,5, et_media_tendida 1,5, et_llana 0,3, et_llana_viento 0 |
| `cono_sur` (3.21)                                       | llano    | [20; 25] × [5; 6], regular     | null                | null                               | 0       | no          | 3      | media     | 0,6      | largo       | et_llana_viento 2, et_llana 1,5, et_reina_blanda 1                                               |
| `norteamerica` (3.22)                                   | media    | [10; 25] × [5; 9], regular     | [2,5; 6] × [6; 7]   | [0,4; 1,8] × [8; 10], no           | 0       | no          | 2      | media     | 0,9      | corto       | ud_circuito 2, et_media_alto 1,3, et_llana 1,2                                                   |
| `australia` (3.23)                                      | ondulado | null                           | [2,5; 3,5] × [6; 7] | [0,5; 1,1] × [9; 11], no           | 0       | no          | 3      | colina    | 0,7      | corto       | ud_circuito 2, et_media_alto 1,5, et_llana_viento 1,5                                            |
| `asia_oriental` (3.24)                                  | media    | [9; 14] × [6; 9], regular      | [2,5; 5] × [6; 7]   | null                               | 0       | no          | 1      | colina    | 0,8      | corto       | ud_circuito 2, et_llana 1,5, et_media_alto 1,2                                                   |
| `golfo` (3.25)                                          | llano    | null                           | [2,5; 7] × [5; 7]   | null                               | 0       | no          | 3      | mar       | 0,4      | corto       | et_llana_viento 3, et_llana 2, et_media_alto 1, et_media_valle 0,2                               |
| `africa_llana` (3.24, 3.25: BJ, BF, CM, DZ, MA, MU, RW) | ondulado | null                           | [2,5; 4] × [4; 7]   | null                               | 0       | no          | 2      | colina    | 0,7      | corto       | ud_circuito 1,5, et_llana 1,5, ud_esprint 1,5                                                    |
| `generico` (sin fila)                                   | ondulado | null                           | [2,5; 6] × [4; 7]   | [1; 2] × [8; 10], no               | 0       | no          | 1      | colina    | 0,85     | corto       | (todo 1)                                                                                         |

Diferencias respecto de la tabla de `arquitectura.md` §5.1, con su porqué, para que nadie las tome por erratas:

- `flandes`, `francia_norte`, `golfo` y `cono_sur` pasan a `cota: null`. En pólder y desierto no hay subidas de 2,5 km al 4 %; lo que hay son muros (Flandes) o nada. Cauberg (1,2 km × 5,8 %) y Kwaremont quedan por debajo del suelo de 8 % de `ARCH.motivo.muro.g` y no se dibujan: es un sacrificio consciente de la sección 4, no de esta tabla.
- `meseta` y `britanicas` pierden el puerto: sus rangos de arquitectura ([6; 10] y [6; 9] km) casi no intersecan el suelo de 9,0 km. Navacerrada (10 × 6) y Bealach na Bà (9 × 6) se dibujan como `cota` de 8 km; Bola del Mundo (3 × 12) es `alto_corto`.
- `escandinavia` es una sola zona para Dinamarca y Noruega, cuando el mapa 07 fila 3.17 describe dos relieves. Se resuelve con `cota` hasta 7 km (los [3; 10] km noruegos) y `puerto: null` (Noruega no tiene reina: `cordillera: null` en §6.3); el coste es que una etapa danesa puede llevar una cota de 7 km, y la galería es donde se decide si duele.
- `portugal` sube a `montana` con `finalesAlto: 'largo'` porque la Torre (Estrela, de 20 a 30 km al [5; 6] %, fila 3.12) es la reina de la Volta y `cordillera` exige `montana` o `alta` (§6.8, test d).
- `italia_norte` gana `adoquin: 1` (urbano) para que Veneto Classic, fila `cobbles` en Bassano («tierra y adoquín urbano», mapa 07 §3 consecuencia 1), resuelva sin salirse del dato.
- `golfo` pierde el jebel largo: `finalesAlto: 'corto'` y `puerto: null`. La razón es la decisión 13 de la síntesis, que sella en test «0 reinas en BE, NL, DK, AE, AU» y D8 (sección 18, aceptada por defecto): Jebel Hafeet (10,8 × 6,6) se dibuja como `alto_corto` de 7 km al 7 %; Jebel Jais (20 km) no existe en E1 y se anota en la sección 17.
- `asia_oriental` topa el puerto en 14 km, porque su `altitud` es `colina` y V4 prohíbe `puerto ≥ 15 km` fuera de `{media, alta, altiplano}` (decisión 24). Los puertos de 20 a 40 km al [3; 4] % de Qinghai (fila 3.24) son `tendida`, no `puerto`.
- `cono_sur` es la corrección del bug AR/CL que señaló `juicios/ejecutabilidad.md` §2.2: la propuesta de geografía declaraba `cordillera: 'desierto_andino'` con `puerto: null` y relieve llano, y su propio test lo habría cazado. Aquí `cono_sur` es `llano`, con `puerto` [20; 25] × [5; 6] (Alto Colorado 20 × 5, Farellones 30 × 6 topado a 25) y `finalesAlto: 'largo'`, y AR y CL llevan `cordillera: null`. La única reina posible en un territorio sin cordillera es `et_reina_blanda` (kind `reina`, D+ [1.500; 2.500], `alto_largo` de [9; 12] km, decisión 8), cuyo `requiere` es `{ puerto: non-null, finalesAlto: 'largo' }` sin exigir relieve; la composición (sección 7) la ofrece como máximo UNA vez por vuelta cuando `Territorio.cordillera === null` y alguna zona de la ruta tiene `finalesAlto: 'largo'` (hoy solo `cono_sur`), y el test de §6.8 sella «AR y CL: ≤ 1 reina por vuelta, siempre `alto`». Para `golfo` esa puerta está cerrada por D8.

### 6.3 Los territorios: `TERRITORIOS`

Un territorio es la ruta ordenada de zonas por las que pasa un país y la zona donde cae su reina. `ruta` es un recorrido plausible (la composición de la sección 7 toma una ventana contigua de ella con `ARCH.itinerario.avance` 0,6); `peso` reparte las carreras de un día del país cuando `RACE_REGION` no las coloca (solo los nacionales, §6.6); `cordillera: null` es un veto estructural: el país no tiene etapa reina y su etapa decisiva es `media_alto` sobre una cota o `media_muro` (Benelux Tour, mapa 07 §2.2).

Regla de cobertura: los 56 países con carreras de equipos (mapa 02 §10, lista literal en el test) llevan fila escrita y el test exige que ninguno sea `fallback`. Se añaden 8 filas voluntarias para países cuya zona existe con nombre en `ZONAS` (AR, CL, NZ, IE, SE, FI, LV, QA): 64 filas explícitas. Los 69 países restantes de `COUNTRIES` (`packages/shared/src/countries.ts` l. 13, 133 entradas medidas con grep) caen a `FALLBACK = { ruta: [{ zona: 'generico', peso: 1 }], cordillera: null, fallback: true }` y el test imprime cuántos (69) sin banda. El fallback es deliberadamente mediocre: un país del que no se sabe nada produce carreras del montón, y la marca lo hace visible. Deducir el relieve de `PAIS_ZONA` de `climate.ts` (l. 66) se descarta porque `tropical` junta a Colombia con Benín (`geografia.md` §5.4).

| Países                         | `ruta` (zona × peso, en orden de recorrido)                                   | `cordillera` |
| ------------------------------ | ----------------------------------------------------------------------------- | ------------ |
| FR                             | bretana 3, francia_norte 3, macizo_central 2, alpes 3, provenza 2, pirineos 2 | alpes        |
| BE                             | flandes 4, ardenas 3                                                          | null         |
| NL                             | flandes 1                                                                     | null         |
| LU                             | ardenas 1                                                                     | null         |
| IT                             | italia_norte 3, dolomitas 2, italia_centro 3, italia_sur 2                    | dolomitas    |
| ES                             | cantabrico 3, meseta 3, andalucia 2, levante 3, pirineos 2                    | pirineos     |
| AD                             | pirineos 1                                                                    | pirineos     |
| PT                             | portugal 1                                                                    | portugal     |
| DE, CZ, SK, HU, PL             | centroeuropa 1                                                                | null         |
| AT, SI, CH                     | alpes 2, centroeuropa 2                                                       | alpes        |
| DK, EE, LT, SE, FI, LV         | escandinavia 1                                                                | null         |
| NO                             | escandinavia 1                                                                | null         |
| GB, IE                         | britanicas 1                                                                  | null         |
| HR, BA, RS, RO, BG, AL, XK, GR | balcanes 1                                                                    | balcanes     |
| TR, CY, AZ                     | anatolia 1                                                                    | anatolia     |
| CO, EC, VE, GT                 | andes 1                                                                       | andes        |
| AR, CL                         | cono_sur 1                                                                    | null         |
| US, CA                         | norteamerica 1                                                                | null         |
| AU, NZ                         | australia 1                                                                   | null         |
| JP, KR, TW, TH, IN, MY, CN     | asia_oriental 1                                                               | null         |
| AE, SA, OM, QA                 | golfo 1                                                                       | null         |
| RW, BF, BJ, CM, MU, MA, DZ     | africa_llana 1                                                                | null         |
| los otros 69 de `COUNTRIES`    | `FALLBACK`                                                                    | null         |

Consecuencias que conviene leer en voz alta antes de aceptarlas (D8, sección 18, valor por defecto «se acepta»): una vuelta belga, neerlandesa, danesa, noruega, británica, polaca, alemana, australiana, japonesa, estadounidense o del Golfo NO tiene reina; una vuelta colombiana no tiene etapa llana de pólder (`et_llana_viento` a 0 en `andes`); una vuelta argentina tiene como mucho un final largo por edición.

```ts
// packages/engine/src/routes/grammar/geo.ts
export const FALLBACK: Territorio = {
  ruta: [{ zona: 'generico', peso: 1 }],
  cordillera: null,
  fallback: true,
}
export function territorioDe(country: string | undefined): Territorio // TERRITORIOS[country] ?? FALLBACK
export function zonaDe(country: string): GeoZone
// = la zona de mayor `peso` de territorioDe(country).ruta; empate: la primera en `ruta`; `generico` si fallback.
// zonaDe('FR') = 'bretana', zonaDe('ES') = 'cantabrico', zonaDe('BE') = 'flandes', zonaDe('CO') = 'andes'.
```

`zonaDe` solo la usan los 532 nacionales (§6.6) y `regionOf` como último recurso; el test de §6.8 prohíbe que una carrera de equipos llegue a ella.

### 6.4 `RACE_REGION`: la zona de cada carrera y de cada etapa

`RACE_REGION: Record<string, RaceRegion>` (`grammar/regions.ts`) tiene exactamente las 310 claves de `RACE_ROUTES`. Sustituye al sorteo `geo|${raceId}` que proponía `arquitectura.md` §3.5 para FR, IT y ES (retirado por la decisión 14: un sorteo pone Lombardía en los Dolomitas una temporada de cada tres) y a la columna `RaceRow.geo` que proponían arquitectura §5.3 e ingeniero §5.2 (`RaceRow`, `calendar.ts` l. 381-398, NO cambia: la zona vive en una tabla por id, como `RACE_COUNTRY` l. 566-884, y las 213 filas continentales que no declaran `country` tampoco declaran zona).

```ts
// packages/engine/src/routes/grammar/regions.ts
export interface RaceRegion {
  default: GeoZone
  stages?: Record<number, GeoZone>
} // stages: índice 1-based
export const RACE_REGION: Record<string, RaceRegion>
export function regionOf(raceId: string, stageIndex: number, country: string): GeoZone {
  return (
    RACE_REGION[raceId]?.stages?.[stageIndex] ?? RACE_REGION[raceId]?.default ?? zonaDe(country)
  )
}
```

**Procedimiento de curación** (es contenido, no diseño: una tarde con `raceRoutes.ts` abierto, `datos.md` §5.2):

1. Para cada una de las 310 claves de `RACE_ROUTES`, en orden alfabético, se lee la localidad de META de la primera etapa (`stageEndpoints(id, 1)`, `raceRoutes.ts` l. 1167) y se escribe `default` con un comentario de una línea que nombre la ciudad o el puerto que decide («Oyonnax: Jura» para `race-ain`). Si salida y meta son de zonas distintas manda la meta.
2. Para las 60 carreras de `RACE_EDITIONS` (`editions.ts` l. 25) se abre la edición y se escribe `stages` SOLO para las etapas cuya zona difiere de `default`, con la meta de cada etapa como criterio. Las etapas con rasgos (`STAGE_FEATURES`) no lo necesitan (son `real`), pero se rellenan igual para que la ficha diga la zona; las 226 sin rasgos lo necesitan porque su relieve se dibuja con la firma de esa zona (sección 11).
3. Si una ciudad no se reconoce se pone `zonaDe(country)` a mano y se marca en el comentario con `// DUDA:`; el test cuenta las dudas y las imprime, sin banda. La galería (sección 16) enseña las 20 carreras `cobbles` reales al lado de su equivalente generado y una página por zona: es ahí donde una zona mal puesta se ve.

Ejemplos obligados (ciudades de `raceRoutes.ts`, medidas en la lista de 310 claves; `race-fleche` no existe como id: la Flecha Valona es `race-huy`):

| Carrera                        | Ciudades (`RACE_ROUTES`)      | `default`      | Por qué                                               |
| ------------------------------ | ----------------------------- | -------------- | ----------------------------------------------------- |
| `race-liege`                   | Liège → Liège                 | ardenas        | fila 3.2                                              |
| `race-huy`                     | Charleroi → Huy               | ardenas        | Mur de Huy 1,3 × 9,6                                  |
| `race-flanders`                | Antwerpen → Oudenaarde        | flandes        | fila `cobbles`                                        |
| `race-roubaix`                 | Compiègne → Roubaix           | francia_norte  | fila `cobbles`, `adoquin` 2                           |
| `race-amstel`                  | Maastricht → Valkenburg       | flandes        | Limburgo: bergs (fila 3.1)                            |
| `race-lombardy`                | Como → Bergamo                | italia_norte   | fila 3.3                                              |
| `race-sanremo`                 | Milano → Sanremo              | italia_norte   | Cipressa y Poggio son `cota` con `params` (sección 5) |
| `race-white-roads`             | Siena → Siena                 | italia_centro  | `sterrato`                                            |
| `race-abruzzo`                 | Pescara → Vasto               | italia_sur     | Blockhaus                                             |
| `race-jura`                    | Lons-le-Saunier → Les Rousses | macizo_central | el caso v40 (sección 9)                               |
| `race-mercantour`              | Nice → Isola 2000             | alpes          | `ud_montana_alto` posible (D1)                        |
| `race-alpes-maritimes`         | Nice → Nice                   | provenza       | prealpes de Niza, fila 3.15                           |
| `race-bretagne`                | Hirel → La Fresnais           | bretana        | fila 3.13                                             |
| `race-tramuntana`              | Sóller → Sa Calobra           | levante        | Sa Calobra 9,4 × 7                                    |
| `race-basque-country`          | Bilbao → Bilbao               | cantabrico     | muros vascos de [1; 4] km al [10; 15] %               |
| `race-asturias`                | Oviedo → Llanes               | cantabrico     | fila 3.8                                              |
| `race-andalusia`               | Benahavís → Pizarra           | andalucia      | fila 3.10                                             |
| `race-castilla-leon`           | Valladolid → Segovia          | meseta         | fila 3.9                                              |
| `race-down-under`              | Tanunda → Tanunda             | australia      | Willunga 3 × 7,5                                      |
| `race-colombia`                | Yopal → Yopal                 | andes          | fila 3.20                                             |
| `race-emirates`                | Madinat Zayed → Liwa          | golfo          | fila 3.25                                             |
| `race-quebec`, `race-montreal` | Québec, Montréal              | norteamerica   | `ud_circuito` ×2                                      |

**La forma por etapa**, con `race-france` como se lee en `editions.ts` l. 26-50 (salida en Barcelona, 21 etapas): `default: 'francia_norte'` (Bordeaux, Bergerac, Nevers, Chalon-sur-Saône, París son llano de fila 3.1 y 1.4) y `stages: { 1: 'levante', 2: 'levante', 3: 'pirineos', 4: 'pirineos', 6: 'pirineos', 9: 'macizo_central', 10: 'macizo_central', 13: 'macizo_central', 14: 'macizo_central', 15: 'alpes', 16: 'alpes', 17: 'alpes', 18: 'alpes', 19: 'alpes', 20: 'alpes' }`. Así la etapa 6 (Pau → Gavarnie-Gèdre, `terrain: 'mountain'`, l. 33) se dibuja con puertos pirenaicos de [10; 17] km al [7; 8,5] % y no con la firma de Francia entera; y la 19 y la 20 (Alpe d'Huez dos veces) con `alpes`. Segundo ejemplo que muestra que la zona no es el país: `race-italy` sale de Bulgaria (Nessebar → Burgas, `editions.ts` l. 52-55): `stages: { 1: 'balcanes', 2: 'balcanes', 3: 'balcanes' }` y el resto por la bota, con `default: 'italia_sur'` para las etapas de Calabria y Campania y `stages` en `italia_centro`, `italia_norte` y `dolomitas` según la meta. Una etapa de edición sin `stages` toma `default`; nunca `zonaDe(country)`.

**Lo que `RACE_REGION` cambia en el país que ya existe:** nada en `RaceRow`, nada en `RACE_COUNTRY`, nada en `climate.ts`. La nota de `climate.ts` l. 15-19 («cuando el calendario sepa la REGIÓN de cada carrera, esto se afina sin tocar nada más») queda respondida con un gancho y no con un cambio: `regionOf` es esa región, y el clima podrá leerla en un encargo posterior sin que E1 lo toque.

### 6.5 Cómo entra la geografía en el generador

La firma que recibe `generateStage` es `req.geo = ZONAS[regionOf(raceId, stageIndex, country)]` (sección 8, paso de identidad). A partir de ahí la geografía actúa en cinco sitios y solo en cinco:

1. **Disponibilidad**: `admite(sk.requiere, geo)` filtra el catálogo antes del sorteo `arch|raceId` (sección 5). La semántica de `requiere` por campo está cerrada en la tabla siguiente; un campo ausente en `requiere` no exige nada.

| Campo de `requiere`                                | Se cumple si                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `puerto`, `cota`, `muro` (cualquier valor no nulo) | `geo.<campo> !== null`                                                                      |
| `muro: { adoquin: true }`                          | `geo.muro !== null && geo.muro.adoquin && geo.adoquin ≥ 2`                                  |
| `adoquin: n`                                       | `geo.adoquin ≥ n`                                                                           |
| `sterrato: true`                                   | `geo.sterrato`                                                                              |
| `viento: n`                                        | `geo.viento ≥ n` (solo `et_llana_viento`, n = 2)                                            |
| `relieve: r`                                       | `orden(geo.relieve) ≥ orden(r)` con `llano < ondulado < media < montana < alta`             |
| `finalesAlto: 'corto'` / `'largo'`                 | `geo.finalesAlto ∈ {corto, largo}` / `geo.finalesAlto === 'largo'`                          |
| `altitud: a`                                       | `geo.altitud === a` (solo `et_media_tendida`: `altiplano`, o bien `relieve === 'ondulado'`) |

Los `requiere` del catálogo que dependen de esta tabla: `ud_adoquin` y `ud_muros_adoquin` `{ adoquin: 2 }`; `ud_adoquin_ligero` `{ adoquin: 1 }` o `{ sterrato: true }` (dos entradas alternativas, se admite si alguna cumple); `ud_sterrato` `{ sterrato: true }`; `ud_montana`, `et_reina_alto_largo`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_valle`, `et_reina_encadenada`, `et_montana_corta`, `et_cronoescalada` `{ puerto: non-null, relieve: 'montana' }` (los que acaban en `alto_largo` además `finalesAlto: 'largo'`); `et_reina_blanda` `{ puerto: non-null, finalesAlto: 'largo' }`; `et_media_alto` `{ finalesAlto: 'corto' }`; `et_media_muro`, `ud_muro_final`, `ud_muros` `{ muro: non-null }`; `ud_circuito` `{ cota: non-null }` o `{ muro: non-null }`; `ud_montana_alto` `{ puerto: non-null, finalesAlto: 'largo' }`; `et_llana_viento` `{ viento: 2 }`.

2. **Degradación**: si el papel pedido no tiene ningún esqueleto admitido en `geo`, `degradar(role)` baja UN escalón y se vuelve a filtrar; siempre hacia abajo, nunca hacia arriba (un país llano no gana puertos), y se anota en `arch.frase` («pedía reina; en flandes no hay puerto: media con muro»). Tabla cerrada: `reina_alto → media_alto`, `reina_valle → media`, `reina_encadenada → media_alto`, `montana_corta → media_alto`, `media_alto → media`, `media_muro → media`, `media → llana`, `llana_viento → llana`, `cronoescalada → cri`, `prologo` y `cri` y `llana` no degradan; para `un_dia`, el sesgo `terrain` baja `mountain → hilly → classic → flat`. `terrain` de la fila es sesgo (×4 sobre el esqueleto que le corresponde, sección 5) y nunca orden: `terrain: 'mountain'` en Dinamarca da `ud_circuito` con cotas y lo dice en la ficha. `degradar` es distinto de `arch.degradado`, que marca la caída a la plantilla canónica tras `ARCH.colocacion.maxIntentos` (sección 8).

3. **Rangos**: cada motivo instanciado sortea en la INTERSECCIÓN del rango del esqueleto (`Slot.params.kmRango`, `gRango`) con el de la zona (`geo.puerto.km`, etc.), y esa intersección está garantizada no vacía por construcción porque ambos son subconjuntos del rango de `ARCH` y el test de §6.8 (h) lo comprueba para cada par (zona × esqueleto admitido). `forma` del puerto es la de la zona salvo que el esqueleto la fije.

4. **Pesos y relleno**: `peso = pesoBase × (geo.pesos[id] ?? 1) × ARCH.pesoPorClase[id][clase]` (sección 5); `amplitud` es la ondulación de todo `enlace` (tope `ARCH.motivo.enlace.ampMax` 2,4, que garantiza que ningún relleno alcance el 3 % que `finish.ts` lee como cota) y sustituye al `bumpy` binario de `rolling` (`profileGen.ts` l. 105) y a `RELIEF.rollingAmplitude` para lo generado; `featureProfile.ts` sigue con `RELIEF` (decisión 27). Con `amplitud` 0,55 una llana belga de 180 km pasa de los 661 a 1.413 m de relleno de hoy (mapa 01 §1) a unos 300 a 700, que es lo que Brugge-De Panne acumula.

5. **Vetos V1 a V4** (sección 9), sobre el perfil final y no sobre la intención: V1 ningún `puerto` (segmento con `climbSize ≥ 8,5`) donde `geo.puerto === null`; V2 ningún `paves` donde `geo.adoquin < 2` salvo `firme: 'tierra'` con `geo.sterrato`, ningún muro `adoquin: true` donde `adoquin === 0`; V3 `ud_sterrato` solo con `geo.sterrato`; V4 `alto_largo` solo con `finalesAlto: 'largo'` y ningún `puerto ≥ 15 km` fuera de `altitud ∈ {alta, altiplano, media}`, con el desnivel de un solo puerto integrado por tramos. Los tres primeros no pueden fallar si `admite` hizo su trabajo: existen para que un cambio futuro en la colocación no los deje sin red.

Lo que la geografía NO hace: no elige el papel de la etapa (eso es la composición, sección 7), no mueve `km` (eso es `ARCH.km.porClase`), no toca `Segment` y no cambia entre ediciones (`GeoZone` es identidad, decisión 20).

### 6.6 Los nacionales por zona

Los 532 campeonatos son 133 países × 4 pruebas (`calendar.ts` l. 351-360: `nc-${cc}-road` con `classic(220)`, `nc-${cc}-u23-road` con `classic(180)`, `nc-${cc}-itt` con `itt(38)`, `nc-${cc}-u23-itt` con `itt(30)`), hoy idénticos salvo la semilla. Con esta sección `nationalChampionships` llama a `generateStage` con `geo = ZONAS[zonaDe(code)]` y `role: 'un_dia'`, y el esqueleto es `nc_ruta` (circuito de [10; 20] km × [8; 16] vueltas con los motivos que la zona dé) para las dos rutas y `nc_crono` para las dos cronos (sección 5). Es la promesa de `docs/motor.md` §V.3 l. 1613 («un nacional belga es llano y de adoquines; uno colombiano, de montaña») hecha función (el mapa 05 §2 la da por decidida en agosto de 2026 y nunca implementada):

| País                 | `zonaDe`     | Lo que da `nc_ruta`                                                                   |
| -------------------- | ------------ | ------------------------------------------------------------------------------------- |
| BE                   | flandes      | circuito con uno o dos `muro` adoquinados por vuelta, meta `esprint` o `repecho`      |
| CO                   | andes        | circuito con `cota` de [5; 8] km, meta `repecho`; ficha «altiplano»                   |
| DK                   | escandinavia | circuito con `cota` corta, `viento` 3 en la ficha («llano abierto»)                   |
| IT                   | italia_norte | circuito con `cota` de [4; 8] km y `muro` al [10; 16] %, meta `muro_meta` o `repecho` |
| FR                   | bretana      | circuito con `muro` y `cota` de 3 km, meta `repecho`                                  |
| los 69 de `FALLBACK` | generico     | circuito con `cota` de [2,5; 6] km y `muro` [8; 10] %                                 |

Los nacionales son los únicos que pasan por `zonaDe`, y el km de la fila se conserva (220/180/38/30 hoy; `ARCH.km.porClase` NC ruta [180, 60] y sub-23 [140, 40] los sortea con `firma|raceId` desde la temporada 0, decisión 36). La saturación del banco se remide con los `nc-*-road` (sección 13), porque son 266 rutas el mismo día.

### 6.7 Viento y altitud son metadatos, no física

El encargo pide «relieve, adoquín, viento, altitud, costa, meseta»; E1 entrega relieve y firme, y el resto lo declara sin fingirlo (decisión 17; riesgo 3 de cobertura y 2 de ejecutabilidad). La razón está medida en el mapa 03 §5.1: el viento es un número por etapa (`rng('viento')^2.2` contra `windMin` 0,87, `simulate.ts` l. 1157-1160) que solo muerde en `block.tipo === 'llano'` y en cualquier km, y `Segment` no lleva altitud (`types.ts` l. 12-48). Un pólder belga y una llanura padana seguirán teniendo la misma probabilidad de abanico.

Lo que sí se hace: `GeoSignature.viento` y `.altitud` viajan en `GeneratedStage.arch.metadatos` y llegan a la ficha con texto que no promete: «llano abierto» (viento 3), «llano» (≤ 2), «altiplano», «alta montaña», «costa»; nunca «abanicos» ni «frío en la cima». `altitud` además decide V4 y `finalesAlto` reparte los finales largos. `expuesto` (`ARCH.motivo.expuesto.amp` 1,0) y `amplitud` baja son lo máximo que el perfil puede decir de un pólder sin tocar `Segment`. Lo que queda para el motor (viento mínimo por zona, altitud en `Segment`, exposición por tramo) va a la sección 17 con la cita a `docs/motor.md` §19.5.

### 6.8 Los tests de consistencia interna

`grammar/geo.test.ts` y `grammar/regions.test.ts` se escriben antes que las tablas (paso 2 del plan, sección 15). No prueban que la geografía sea verdad: prueban que la tabla no se contradice, que cabe en `ARCH`, que resuelve todo lo que el calendario le pide y que ningún veto V1 a V4 puede dispararse por culpa de la tabla.

```ts
// packages/engine/src/routes/grammar/geo.test.ts
import { describe, expect, it } from 'vitest'
import { ARCH } from '../../constants.js'
import { COUNTRIES } from '@cyclingstar/shared'
import { FALLBACK, TERRITORIOS, ZONAS, admite, territorioDe, zonaDe } from './geo.js'
import { SKELETONS } from './skeletons.js'

const dentro = (r: [number, number], de: [number, number]) =>
  r[0] <= r[1] && r[0] >= de[0] && r[1] <= de[1]
const PAISES_CON_EQUIPOS = [
  'FR',
  'BE',
  'IT',
  'ES',
  'NL',
  'TR',
  'PT',
  'PL',
  'DE',
  'CN',
  'SI',
  'GR',
  'AU',
  'DK',
  'NO',
  'CZ',
  'HR',
  'JP',
  'CH',
  'CA',
  'US',
  'AT',
  'RO',
  'AE',
  'OM',
  'GB',
  'LU',
  'RS',
  'LT',
  'VE',
  'CO',
  'SA',
  'HU',
  'MY',
  'CY',
  'BA',
  'AZ',
  'AL',
  'EE',
  'AD',
  'BG',
  'XK',
  'SK',
  'IN',
  'TW',
  'TH',
  'KR',
  'RW',
  'DZ',
  'BJ',
  'MU',
  'CM',
  'MA',
  'BF',
  'GT',
  'EC',
] // mapa 02 §10

describe('grammar/geo: ZONAS cabe en ARCH y no se contradice', () => {
  it('(a) tiene 30 filas y cada rango está dentro del rango del motivo', () => {
    expect(Object.keys(ZONAS)).toHaveLength(30)
    for (const z of Object.values(ZONAS)) {
      if (z.puerto) {
        expect(dentro(z.puerto.km, ARCH.motivo.puerto.km)).toBe(true)
        expect(dentro(z.puerto.g, ARCH.motivo.puerto.g)).toBe(true)
      }
      if (z.cota) {
        expect(dentro(z.cota.km, ARCH.motivo.cota.km)).toBe(true)
        expect(dentro(z.cota.g, ARCH.motivo.cota.g)).toBe(true)
      }
      if (z.muro) {
        expect(dentro(z.muro.km, ARCH.motivo.muro.km)).toBe(true)
        expect(dentro(z.muro.g, ARCH.motivo.muro.g)).toBe(true)
      }
      expect(z.amplitud).toBeLessThanOrEqual(ARCH.motivo.enlace.ampMax) // 2,4
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
      if (z.muro?.adoquin) expect(z.adoquin).toBeGreaterThanOrEqual(2)
      if (z.adoquin === 0) expect(z.muro?.adoquin ?? false).toBe(false)
    }
  })
  it('(d) V4 no puede dispararse desde la tabla: puerto ≥ 15 km solo con altitud media/alta/altiplano; largo exige puerto', () => {
    for (const z of Object.values(ZONAS)) {
      if (z.puerto && z.puerto.km[1] >= 15)
        expect(['media', 'alta', 'altiplano']).toContain(z.altitud)
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
      expect(t.fallback ?? false).toBe(false) // nada explícito lleva la marca
    }
    expect(TERRITORIOS.AR.cordillera).toBeNull()
    expect(TERRITORIOS.BE.cordillera).toBeNull()
  })
  it('(f) los 56 países con equipos tienen territorio; el resto cae a FALLBACK y se cuenta', () => {
    for (const cc of PAISES_CON_EQUIPOS) expect(territorioDe(cc).fallback ?? false).toBe(false)
    const enFallback = COUNTRIES.map((c) => c.code).filter((cc) => territorioDe(cc) === FALLBACK)
    console.info(`[geo] países en FALLBACK: ${enFallback.length} (${enFallback.join(' ')})`) // hoy 69, sin banda
    for (const c of COUNTRIES) expect(Object.keys(ZONAS)).toContain(zonaDe(c.code))
  })
  it('(g) ejemplos que fijan la semántica de zonaDe y admite', () => {
    expect(zonaDe('BE')).toBe('flandes')
    expect(zonaDe('CO')).toBe('andes')
    expect(zonaDe('ZW')).toBe('generico')
    const reina = SKELETONS.find((s) => s.id === 'et_reina_alto_largo')!
    expect(admite(reina.requiere, ZONAS.alpes)).toBe(true)
    expect(admite(reina.requiere, ZONAS.flandes)).toBe(false) // puerto null
    expect(admite(reina.requiere, ZONAS.levante)).toBe(false) // relieve media
    expect(admite(SKELETONS.find((s) => s.id === 'ud_sterrato')!.requiere, ZONAS.flandes)).toBe(
      false,
    )
    expect(
      admite(SKELETONS.find((s) => s.id === 'et_reina_blanda')!.requiere, ZONAS.cono_sur),
    ).toBe(true)
  })
  it('(h) toda zona admite al menos un esqueleto por papel base y la intersección de rangos no es vacía', () => {
    for (const z of Object.values(ZONAS)) {
      const admitidos = SKELETONS.filter((s) => admite(s.requiere, z))
      expect(admitidos.some((s) => s.kind === 'llana')).toBe(true)
      expect(admitidos.some((s) => s.kind === 'cri')).toBe(true)
      for (const s of admitidos)
        for (const slot of s.slots) {
          const zr =
            slot.motif === 'puerto'
              ? z.puerto?.km
              : slot.motif === 'cota'
                ? z.cota?.km
                : slot.motif === 'muro'
                  ? z.muro?.km
                  : null
          const sr = slot.params?.kmRango
          if (zr && sr) expect(Math.max(zr[0], sr[0])).toBeLessThanOrEqual(Math.min(zr[1], sr[1]))
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
import { SEASON_CALENDAR } from '../calendar.js'
import { RACE_REGION, regionOf } from './regions.js'
import { ZONAS, zonaDe } from './geo.js'

describe('grammar/regions: RACE_REGION cubre las 310 carreras de equipos y ninguna cae al país', () => {
  it('(a) las claves son exactamente las de RACE_ROUTES', () => {
    expect(Object.keys(RACE_REGION).sort()).toEqual(Object.keys(RACE_ROUTES).sort()) // 310
  })
  it('(b) ninguna carrera de equipos pasa por zonaDe(country); solo los .NC', () => {
    for (const race of SEASON_CALENDAR) {
      const porTabla = RACE_REGION[race.id] !== undefined
      if (race.championshipCountry) expect(porTabla).toBe(false)
      else expect(porTabla).toBe(true)
    }
  })
  it('(c) stages solo en las 60 ediciones, con índice 1-based dentro de n y zona distinta de default', () => {
    for (const [id, r] of Object.entries(RACE_REGION)) {
      if (!r.stages) continue
      expect(RACE_EDITIONS[id]).toBeDefined()
      for (const [i, zona] of Object.entries(r.stages)) {
        expect(Number(i)).toBeGreaterThanOrEqual(1)
        expect(Number(i)).toBeLessThanOrEqual(RACE_EDITIONS[id].stages.length)
        expect(zona).not.toBe(r.default)
      }
    }
    expect(regionOf('race-france', 6, 'FR')).toBe('pirineos')
    expect(regionOf('race-france', 19, 'FR')).toBe('alpes')
    expect(regionOf('race-france', 7, 'FR')).toBe('francia_norte')
    expect(regionOf('race-italy', 1, 'IT')).toBe('balcanes')
    expect(regionOf('nc-BE-road', 1, 'BE')).toBe(zonaDe('BE'))
  })
  it('(d) las 20 filas cobbles caen en zonas con adoquín o tierra (DATO: grep "terrain: \'cobbles\'" sobre calendar.ts)', () => {
    const COBBLES = [
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
    expect(COBBLES).toHaveLength(20)
    const byId = new Map(SEASON_CALENDAR.map((r) => [r.id, r]))
    for (const id of COBBLES) {
      const z = ZONAS[regionOf(id, 1, byId.get(id)!.country)]
      expect(z.adoquin >= 1 || z.sterrato).toBe(true) // race-leon (Tro Bro Léon) y race-rutland por tierra; race-veneto-classic por adoquín urbano
    }
  })
  it('(e) los ejemplos obligados', () => {
    const esperado: Record<string, string> = {
      'race-liege': 'ardenas',
      'race-huy': 'ardenas',
      'race-lombardy': 'italia_norte',
      'race-jura': 'macizo_central',
      'race-tramuntana': 'levante',
      'race-roubaix': 'francia_norte',
      'race-white-roads': 'italia_centro',
      'race-colombia': 'andes',
      'race-emirates': 'golfo',
      'race-down-under': 'australia',
    }
    for (const [id, zona] of Object.entries(esperado)) expect(RACE_REGION[id].default).toBe(zona)
  })
  it('(f) las dudas de curación se imprimen y no vetan', () => {
    const dudas = Object.entries(RACE_REGION)
      .filter(([, r]) => (r as { duda?: boolean }).duda)
      .map(([id]) => id)
    console.info(`[regions] DUDA: ${dudas.length} carreras (${dudas.join(' ')})`)
  })
})
```

Notas sobre los tests: (d) del primer fichero es el que hace que V4 sea imposible de disparar por la tabla, y (h) el que hace que la intersección de rangos del paso 3 de §6.5 nunca sea vacía; (f) de `geo.test.ts` no tiene banda porque el número de países en fallback (69) es un hecho de contenido, no un objetivo. El test (b) de `regions.test.ts` es la obligación 8 del encargo de síntesis hecha aserción: la única forma de que una carrera de equipos caiga al país es borrar su fila, y eso rompe (a). La fila `duda` de (f) es un campo opcional `duda?: true` en `RaceRegion` que el implementador pone donde una ciudad no se reconoce; la galería y el dueño la cierran, y el objetivo, sin banda, es 0.

Lo que el dueño tiene que revisar de esta sección, una tarde con la galería delante (sección 16 y sección 18): las 30 filas de `ZONAS` con la pregunta «¿existe esto aquí?», las 13 filas de `TERRITORIOS` con `cordillera: null` (D8), y las carreras marcadas `duda` de `RACE_REGION`.

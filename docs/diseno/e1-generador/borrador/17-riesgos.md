## 17. Riesgos y lo que queda fuera

Los 27 riesgos de los tres jueces (10 de cobertura, 8 del motor, 9 de ejecutabilidad) están uno a uno en el apéndice B (sección 19) con la sección que los resuelve. Aquí van solo los que el diseño no resuelve sino que ACOTA: cada uno con lo que puede pasar y con qué cifra, lo que el diseño hace (una mitigación o un sacrificio consciente, dicho con esa palabra), y dónde se vigila. La regla que ordena la lista es la de la decisión 34: un resultado que contradiga la previsión se anota como «previsión fallida» en `docs/balance.md` con la medida delante y no mueve ninguna banda hasta que el dueño decida. Las decisiones que son suyas se escriben con el valor por defecto de la sección 18, que es lo que se implementa.

### 17.1 Catorce riesgos acotados

#### 1. Viento, altitud, costa y meseta no llegan al motor

La lista geográfica del encargo de propuestas era seis cosas (relieve, adoquín, viento, altitud, costa, meseta; `juicios/cobertura.md` §5 riesgo 3) y E1 entrega dos: relieve y firme. La razón está medida en el motor y no en el generador. El viento es un número por ETAPA, `rng('viento')^2.2` con día normal por debajo de `windMin` 0,87 (`simulate.ts` l. 1157-1160, `constants.ts` l. 3593; mapa 03 §5.1), y solo muerde en bloques `llano` (l. 1215, 4340-4408): el corte se sortea por km y ningún tramo del perfil dice dónde pega, que es lo que `docs/motor.md` §19.5 (l. 1314-1318) deja anotado como deuda del motor. `Segment` (`types.ts` l. 12-48) no lleva altitud, y el clima sale de `lugar = { pais?, dia }` (`weather.ts` l. 58-71; mapa 03 §5.2): el único dato geográfico que el motor lee hoy es el país, y solo para lluvia y calor. La meseta tiene el mismo techo por otro lado: `tendida` y `expuesto` se tipan `llano` (decisión 2), así que una tendida de 20 km al 2,5 % cuesta por pendiente pero no suma a `kmSubida`, a `breakAppeal` ni a `gcTerrain` (`simulate.ts` l. 1696-1710, mapa 03 §4.1).

Lo que hace el diseño (decisión 17) es no fingir: `GeoSignature.viento` y `.altitud` viajan en `GeneratedStage.arch.metadatos`, la ficha los enseña con texto que no promete nada que el motor no coloque (con `viento ≥ 2` dice «llano abierto» y nunca «abanicos»; con `altitud` en `alta` o `altiplano` describe los puertos, no el aire; la tabla de textos vive en la sección 11), y `grammar/generate.test.ts` sella que dos peticiones iguales salvo `geo.viento` y `geo.altitud` producen el mismo `profile`. Lo que queda para el motor, fuera de E1 y escrito para que nadie lo busque aquí: `windMin` por zona (banco §13.1), altitud en `Segment` (cambia el contrato de `types.ts` l. 37-42, geografía §13.2) y exposición por tramo para que el abanico pegue donde no hay setos. El gancho queda puesto: `expuesto` existe como `MotifKind` y se conserva en `arch.motivos`, y un motor que lea `arch.motivos` sitúa el abanico sin tocar el generador (arquitectura §13.6); si el motor gana tipado por pendiente (`docs/tactica.md` R28.1(c)), `tendida` se retipa sin tocar la gramática (arquitectura §13.5). Sacrificio consciente: la geografía de E1 cambia la carretera, no el aire.

```ts
// packages/engine/src/routes/grammar/generate.test.ts
it('viento y altitud son metadatos: no cambian un solo tramo del perfil', () => {
  const base = peticion('race-ronde', { zona: 'flandes' }) // helper del test: StageRequest completa
  const ventosa = { ...base, geo: { ...base.geo, viento: 3, altitud: 'altiplano' as const } }
  const a = generateStage(base),
    b = generateStage(ventosa)
  expect(b.profile).toEqual(a.profile) // mismos Segment[], mismos tramos, mismas pancartas
  expect(b.arch.metadatos).toEqual({ viento: 3, altitud: 'altiplano' })
  expect(b.arch.frase).not.toMatch(/abanico/i) // decisión 17: la frase no promete lo que el motor no coloca
})
```

#### 2. La tabla geográfica es juicio, no dato

Las 29 filas de `ZONAS`, los 56 `TERRITORIOS` y los 77 países en `fallback` salen del mapa 07 §3, que se declara orientativo y escrito de memoria; la validación externa es imposible (PCS y Overpass vetados, `docs/fuentes-recorridos.md`). Lo que sí es dato son tres cosas y el documento lo dice con esas palabras (decisión 16): las 20 filas `terrain: 'cobbles'` (todas en zonas con adoquín, mapa 07 §3), las ciudades de `raceRoutes.ts` (sin fuente para 250 carreras, mapa 02 §8) y las 177 etapas reales. El riesgo es el que los tres jueces nombran igual: una carrera plausible en el sitio equivocado, que es el defecto de hoy con otro disfraz (cobertura §5 riesgo 1).

Mitigación en tres capas. Primera, los vetos V1 a V4 impiden lo imposible: `null` en `puerto`, `cota` o `muro` es «aquí no existe» y `degradar()` solo baja (`montana → media → ondulado → llano`, decisión 12). Segunda, `grammar/geo.test.ts` comprueba la consistencia interna de la tabla (`min ≤ max`; `puerto.km[0] ≥ 9`; `cota.km[1] ≤ 8`; `muro.km[1] ≤ 3`; `cordillera` está en `ruta` y su `relieve ∈ {montana, alta}`; toda clave de `COUNTRIES` resuelve; las 20 `cobbles`), lo que prueba que el mundo actual no contradice la tabla, no que la tabla sea verdad (juez motor §5 riesgo 7). Tercera, la galería de la sección 16 en el paso 4, antes del paso 8, con las tres preguntas por perfil de la decisión 41; lo que el dueño marque se corrige editando `ZONAS`, `RACE_REGION` o `ARCH.pesoPorClase`, que son datos, nunca código. Lo que se acepta: `fallback` cuenta 77 países y 0 carreras de equipos (test), y las vueltas de BE, NL, DK, AE y AU quedan sin reina por `cordillera: null` (D8, valor por defecto «se acepta», sección 18).

#### 3. `stageKindOf` no se recalibra

Los umbrales 8,5 km / 3.200 m / 3 km (`stageKind.ts` l. 60-64, mapa 01 §5.1) están calibrados contra el generador viejo y, medidos sobre lo real, llaman `media` a 11 de 54 reinas y `reina` a 16 de 59 medias: 27 de 113 (datos §1.5). Hasta que se recalibre, la ficha aplica dos criterios según el origen: lo generado cabe en su clase por construcción (V6, con `puerto ≥ 9,0`, `cota ≤ 8,0` y `margenClaseKm` 0,3) y lo real sigue con su discrepancia. Ejemplo que el jugador verá y que es correcto para el clasificador: una Lieja generada con puertos ≤ 4,5 km sale `media / Mountains classic` (sección 11). Decisión 26: no se mueve en E1 porque es la vara de todo el banco y moverla obliga a remedir todo (ingeniero §13.1.4); lo único que cambia es la etiqueta `Summit finish` por `SUMMIT_RUN_IN_KM` 5, que no toca `kind` (decisión 23). Vigilancia: `routeCensus` imprime tras el paso 8 la tabla `kind` declarado contra leído por `routeSource`, con objetivo escrito «generadas = 0». D2, valor por defecto: no en E1; se abre con esa tabla delante (sección 18).

#### 4. Circuitos, muros encadenados y `kmSubida`

El motor cuenta `kmSubida` por tipo de bloque, `breakAppeal = clamp(4·kmSubida/total + 0,35·[final en alto], 0, 1)` y `gcTerrain` desde el 5 % (`simulate.ts` l. 1696-1710, mapa 03 §4.1), y no sabe que la vuelta 9 es la misma carretera que la 3 (ingeniero §13.1.2). Un `circuito` de 14 km × 9 con un muro de 1,1 km pone 9,9 km de `subida` en 126: un 7,9 %, `gcTerrain` verdadero y `breakAppeal` 0,31 por la fórmula citada; una `ud_muros` con 15 muros de 1 km pone el 10 % de la etapa en `subida`. Es correcto en dirección (Montréal se corre dura) y desconocido en magnitud, y toca de lleno al banco de saturación: 5 de las 8 carreras de un día más exigentes son hoy `nc-*-road` (mapa 06 §3.2) y los 532 nacionales pasan a `nc_ruta` de golpe (decisión 15). Mitigación: decisión 25 (pancarta `cima` solo en `puerto ≥ 1,5 km`, siempre en el último puerto de la etapa, y los muros de circuito < 1,5 km no puntúan); `routeCensus` mide `kmSubidaShare` y `breakAppealEstimado` por esqueleto con banda informativa `ud_circuito ≤ 0,20` y `ud_muros ≤ 0,15` (informa, no veta); y la saturación de las 8 más duras se remide en el paso 9 con 12 semillas contra `SATURATION_DEPLETION` 0,96 y `SATURATION_BONK_PCT` 14 (mapa 06 §3.2). Si salta en una .1 flamenca con campo continental, se anota como previsión fallida y va al dueño: el generador no se ablanda solo, porque una Ronde de .1 existe y es el motor el que tiene que aguantarla (datos §13.3).

#### 5. El muro en meta exige precisión de bloque

`finishType` comprueba `alto` antes que `muro` (`finish.ts` l. 165-189), `deriveFinishTerrain` funde en una racha todo bloque ≥ `finishClimbMinGradient` 3 tolerando `finishClimbGapBlocks` 5 (l. 94-123), `muroMaxKm` es 1 (`constants.ts` l. 4462) y la longitud se redondea a bloques de 100 m (`sample.ts` l. 70): hoy `muro` sale 0 veces en línea (juez motor §1). El diseño lo ataca por construcción (decisión 7): `muro_meta` de [0,5; 2,2] km al [8; 16] %, aproximación de `aproxKm` 2 con `aproxAmp` 2,5 para que el relleno no se funda con el muro, y la tabla de `MetaKind` declara `puncheur` por encima de 1,0 km. Pero es una hipótesis hasta que corra (ejecutabilidad §5 riesgo 7), y por eso el paso 3 la prueba antes de nada: `grammar/motifs.test.ts` exige que 300 de 300 `muro_meta` con ≤ 1,0 km tipen `muro` en `finishType`. Si falla, el orden de ajuste está decidido: primero `aproxKm` 2 → 3, después `aproxAmp` 2,5 → 2,0; nunca el rango del muro, y nunca una llamada a `sampleProfile` dentro de `verify` (decisión 4). En el calendario lo vigila V16 en `routeCensus`: `muro ≥ 1 %` y `puncheur ≥ 8 %`.

```ts
// packages/engine/src/routes/grammar/motifs.test.ts (paso 3): la única prueba del diseño que llama a sampleProfile
it('muro_meta de ≤ 1,0 km tipa muro en finishType 300 de 300', () => {
  let muros = 0
  for (let i = 0; i < 300; i++) {
    const p = renderMotif(
      {
        kind: 'meta',
        meta: 'muro_meta',
        km: 0.5 + (i % 6) * 0.1,
        cotaFinal: { km: 0.5 + (i % 6) * 0.1, g: 8 + (i % 9) },
      },
      routeRng(`muro|${i}`),
    )
    if (finishType(deriveFinishTerrain(sampleProfile(p)), 50) === 'muro') muros++
  }
  expect(muros).toBe(300) // si falla: aproxKm 2 → 3, después aproxAmp 2,5 → 2,0; nunca el rango del muro ni sampleProfile en verify
})
```

#### 6. El hueco de [8,0; 9,0] km

`ARCH.motivo.cota.km` acaba en 8,0 y `ARCH.motivo.puerto.km` empieza en 9,0 para dejar 0,5 a cada lado de `PASS_MIN_KM` 8,5: ninguna subida generada mide entre 8,0 y 9,0 km, y un Ghisallo de 8,6 sale como 9,0 (sección 12). Es un sacrificio consciente y a cambio desaparecen los tres bordes medidos sin holgura: 1 y 2 de 1.500 por el redondeo de tramos a 0,1 (segmento 8,6 con tramos 8,4 y al revés) y 3 de 1.500 con `finalKind: 'alto'` forzado (mapa 01 §5.1), que `stageKind.test.ts` con 60 semillas no ve. `garantizaClase` con `margenClaseKm` 0,3 (decisión 10) cubre lo que el redondeo pueda comerse. Lo real no lo nota: `featureProfile.ts` no pasa por `ARCH`. Se documenta en el comentario de `ARCH.motivo.puerto` y en la sección 19 como objeción aceptada; no es decisión del dueño.

#### 7. `featureProfile.ts` sigue con otro relleno

Tras E1 el calendario tiene dos rellenos para dos poblaciones: las 177 etapas reales con `rollingFill` (`featureProfile.ts` l. 158-176) y amplitud por terreno de `RELIEF` (`constants.ts` l. 1124-1131) más `normalizeTotal` estirando el último segmento (l. 179-188), y las 1.241 no reales con `enlace` y la `amplitud` de la zona (cobertura §5 riesgo 9). Decisión 27: no se unifica en E1. Lo que movería hacerlo está medido: la huella FNV de las 177 (decisión 28) y `erosion.longClassicFresh` (Flandes) y `erosion.hardestClassicFresh` (Lombardía), que son perfiles reales con banda (mapa 04 §4.2). Es un paso propio posterior a E1, con su propio salto de `ENGINE_VERSION` y su propia tabla pareada, y se anota como deuda en la nota «v61». Lo que E1 garantiza mientras tanto: `realFingerprint.test.ts` en verde después del paso 8, es decir, ningún `import` de `grammar/` entra en `featureProfile.ts`.

#### 8. Más varianza de forma en los bancos

Las listas cerradas conservan el nombre y no la forma (mapa 04 §3.3): `realQueens` tiene 3 de 9 perfiles generados, `smallTours` 7 de 10 carreras, `timeTrials` 3 de 5 cronos, y `grandTour` 20 de 21 reales (mapa 06 §3.2). Con el generador nuevo, `race-sharjah` pasa a ser un `vu_corta` con motivos sorteados, y las bandas de esas listas se mueven por el generador y no por el motor (mapa 04 §4.2, con la dirección esperada de cada una: `grandTour.queenLastGroupPct` ya rozó 7,63 contra 8 y `realQueens.worstStagePct` 17,57 contra 18). Mitigación en cuatro piezas: las tres reinas generadas de `REAL_QUEENS` se congelan como `Skeleton` literal en `sim/frozenSkeletons.ts` y se rinden con `renderSkeleton` (decisión 33); todo banco que necesite forma estable pide `StageRequest.fixed.skeleton` y `season: BASE_SEASON`; el paso 9 es pareado con 12 semillas, `engineVersion` fijo en la semilla y dirección pre-registrada (decisión 30); y la doble lectura de las listas cerradas, por nombre y por forma. Lo que se acepta: los bancos miden el calendario que el generador produce en el paso 8, y esa forma no vuelve a cambiar hasta el siguiente salto de versión.

#### 9. Reintentos en esqueletos de borde

Un esqueleto cuyo rango roza un umbral del clasificador (`et_media_alto` con una cota de 7,9 km, arquitectura §13.2) paga V6 en reintentos. Constantes: `ARCH.colocacion.maxIntentos` 8, `ARCH.veto.intentosP95` 3 y `ARCH.veto.fallbackMaxShare` {calendario 0; testPorEsqueleto 0,005}. La regla está decidida: si el p95 de `intentos` supera 3 en el paso 4, se estrechan rangos (`cota.km[1]` de 8,0 a 7,5) antes que subir `maxIntentos`. Lo que no llega a `verify` es la incompatibilidad estructural (un `ud_montana` en `ardenas`, donde `puerto` es `null`): la resuelven `requiere`, `degradar()` y el peso 0 en el sorteo `arch|raceId` (decisiones 12 y 13), no el reintento. Vigilancia: `grammar/skeletons.test.ts` por esqueleto × 5 km × 60 semillas × zonas compatibles con `intentos` p95 ≤ 3 y degradados ≤ 0,5 %; en las 1.418 del calendario, 0 degradados (`routeCensus`), porque la plantilla canónica pasa todos los vetos por construcción.

#### 10. La cola baja de reinas

Hoy la sostiene un dado del 40 % (`ROUTE.queenHighDplusShare`) que existe «porque `calendarQueens.test.ts` afirma en tres líneas duras que la banda de < 1.500 m no se queda vacía» (mapa 06 §6 punto 3, prosa del repositorio, no del dueño): el test decide por el diseño. El diseño la decide en su sitio: `et_reina_blanda` con `ARCH.reina.blandaShare` {media 0,25; montana 0,25; alta 0,10} y D+ total en [1.500; 2.500] (decisión 8), y `calendarQueens` estratificada por `finalKind` × cubeta de desnivel (decisión 32). El riesgo que sigue vivo es el de cobertura §5 riesgo 4: pedir la decisión sin la cifra. Por eso `routeCensus` mide el D+ de reina por formato y clase en el paso 0 (generador viejo) y en el paso 8 (nuevo), con la banda «cubeta < 1.500 poblada ≥ 5 %» de la sección 13 con su columna «hoy». Si aun así el estrato `<1500` queda con menos de 3 etapas en la muestra, `calendarQueens.test.ts` falla con el mensaje «cubeta < 1.500 despoblada: decisión D6» y no se cambia solo (sección 13). D6, valor por defecto: `calendarQueens.breakawayWinPct` [6; 30] se mantiene como vigilancia hasta la remedición del paso 9 (el 18,1 % «está bien así» se midió sobre el generador viejo); comparar `<2000` contra `>3000` es la alternativa que el dueño puede elegir en la sección 18, no lo que el diseño hace por su cuenta.

#### 11. `world.test.ts` y `RACE_DAY_TSS` con otro reparto de `kind`

`sim/world.ts` l. 169-193 calcula `CALENDARIO` por división al cargar el módulo desde `SEASON_CALENDAR` leyendo `st.kind`, y `RACE_DAY_TSS` carga por `kind` (`clasica` 160 frente a `media` 145, ingeniero §11.2): cualquier cambio del reparto mueve el banco de mundo sin que nadie lo haya pedido (juez motor §1). Y el reparto cambia por cuatro sitios a la vez: `kind` leído del perfil (72 discrepancias hoy), Bélgica sin reina, medias flamencas a `clasica`, 532 nacionales por zona. Mitigación: el paso 8 mide el reparto de `kind` por clase antes y después (tabla en la nota «v61 §1») y corre `world.test.ts` con fila propia en la tabla de re-sellado de la sección 13; una banda de población que se mueva se anota con su causa y no se afloja. Lo que se acepta: una segunda temporada en memoria no le llega a `world.ts` (juez motor §5 riesgo 1); el banco de mundo mide la temporada 0 y eso es lo que promete.

#### 12. El coste de arranque

Medido hoy: 578 ms la carga de `routes/calendar.js` (842 carreras, 1.418 etapas, 46.354 segmentos) y 0,40 ms por etapa una pasada de `sampleProfile` más lecturas (juez motor §1, `coste-motor.mjs`). El riesgo que los jueces nombran es de 1,5 a 2 s por temporada si se verifica con `sampleProfile` por intento, multiplicado por las 18 cargas de test y por cada temporada que un test genere. El diseño lo corta de raíz (decisión 4: `generateStage` no llama a `sampleProfile`) y lo mide en vez de estimarlo (decisión 35): `scripts/medir-arranque.mjs` en el paso 0 y en el 8, y `routes/arranque.test.ts` con `ARCH.arranque` {objetivoMs 1.500; techoMs 2.500; porTemporadaMs 1.000}. Si se supera el techo, el calendario se construye perezoso por carrera: ya decidido, no «si molesta». Lo que queda acotado y no resuelto: `calendarForSeason` memoizada por `Map` acumula una temporada por año de mundo (ejecutabilidad §5 riesgo 3); la sección 14 pone el tope `MAX_TEMPORADAS_EN_MEMORIA = 8` en `edition.ts` (se borra la más antigua insertada, y reconstruirla cuesta ≤ `porTemporadaMs` porque la función es pura) y su script imprime los MB de heap por temporada para revisar el 8 con cifra.

#### 13. La remedición es cara y es la más fácil de saltarse

Relojes: `realQueens` 900 s, `calendarQueens` 3.600 s con 4 semillas, `smallTours` 3.900 s con 8, saturación 1.800 s (mapa 06 §3.2 y decisión 34), y todo ×2 porque se mide viejo y nuevo. La decisión 34 pone dueño (el implementador del paso 9 corre; el dueño del repositorio decide cada banda con la cifra delante), orden por coste creciente y presupuesto (4 h de máquina y 2 sesiones, techo 8 h). Lo que impide saltársela es la decisión 29: `sim/legacy/profileGenLegacy.ts` no se borra sin la tabla pareada en `docs/balance.md`, y borrarla es lo que cierra el paso 9. Y lo que impide «ajustar la banda para que cuadre» es la regla de previsión fallida.

#### 14. `RACE_REGION` con errores de contenido

310 carreras y las 60 ediciones por etapa se curan a mano en una tarde con `raceRoutes.ts` abierto (decisión 14), y el test solo comprueba que existe y que ninguna carrera de equipos cae a `zonaDe(country)`, no que Ruanda o Dinamarca estén bien puestas (datos §13.5). Las 226 etapas de edición sin rasgos reciben así una zona con ciudades y km reales (ejecutabilidad §5 riesgo 5); la doctrina de `fuentes-recorridos.md` se respeta porque la ficha dice «Ciudades y distancia reales, relieve generado» y nunca presenta ese relieve como real (decisión 39). Mitigación: comentario por fila con la ciudad que la justifica, la galería con las 20 `cobbles` reales al lado de su equivalente generado, y corrección como dato. D9 (cifras UCI de `ARCH.km.maxPorClase` «a confirmar») se implementa con las del mapa 07 §4.1 (sección 18).

### 17.2 Lo que E1 no hace, y dónde se hace

| Qué                                                        | Por qué no aquí                                                                                                                                                                                       | Dónde                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Cargar recorridos reales nuevos                            | E1 mejora las 1.241 etapas que nunca tendrán recorrido real; cada real nuevo mejora una carrera (agenda §4.18)                                                                                        | E12 (`docs/calendario.md`)                       |
| El Mundial, las selecciones y las reglas de los nacionales | son calendario y contenido, no generador                                                                                                                                                              | E12                                              |
| Una gran vuelta GENERADA en el calendario                  | `vu_gran_vuelta` existe y se testea en el paso 7 para 9 a 21 etapas; las tres grandes vueltas siguen reales y ninguna carrera nueva entra                                                             | E12                                              |
| Tocar el motor                                             | `Segment`, `Ramp`, `Banner` intactos (decisión 2); sin altitud, exposición, `windMin` por zona, noción de vuelta ni contrarreloj por equipos; `rompepiernas` sigue muriendo en `sample.ts` l. 100-101 | un encargo de motor posterior                    |
| Reescribir SPEC §6.17                                      | el SPEC pide fuga del 25 al 45 % en alta montaña y la decisión vigente es 18,1 % con banda [6; 30] (mapa 05 §11.1); es del dueño                                                                      | decisión del dueño, fuera de E1                  |
| Unificar `featureProfile.ts`                               | riesgo 7                                                                                                                                                                                              | paso propio posterior, con versión               |
| Validar contra PCS u Overpass                              | vetados (`docs/fuentes-recorridos.md`)                                                                                                                                                                | no se hace; la galería lo sustituye (sección 16) |
| Metas volantes generadas                                   | 2 de depósito y 5 km de alivio por pancarta (mapa 03 §10.8) cambian el ritmo de todas las llanas                                                                                                      | D4, valor por defecto «no» (sección 18)          |
| Critérium puntuable                                        | mapa 07 §1.7                                                                                                                                                                                          | D5, peso 0 (sección 18)                          |
| Recalibrar `stageKindOf`                                   | riesgo 3                                                                                                                                                                                              | D2, tras el paso 8 (sección 18)                  |

### 17.3 Tabla resumen

| #   | Riesgo                           | Tipo            | Dónde se vigila                                          | Sección   |
| --- | -------------------------------- | --------------- | -------------------------------------------------------- | --------- |
| 1   | viento, altitud, costa, meseta   | sacrificio      | `generate.test.ts` (metadatos no tocan `profile`); ficha | 6, 11     |
| 2   | tabla geográfica es juicio       | mitigado        | `geo.test.ts`; galería paso 4                            | 6, 16     |
| 3   | `stageKindOf` sin recalibrar     | sacrificio (D2) | tabla declarado/leído por origen en `routeCensus`        | 11, 18    |
| 4   | circuitos y `kmSubida`           | mitigado        | banda informativa del censo; saturación paso 9           | 8, 13     |
| 5   | muro en meta                     | mitigado        | 300 de 300 en el paso 3; V16 en el censo                 | 4, 15     |
| 6   | hueco [8,0; 9,0]                 | sacrificio      | comentario de `ARCH.motivo.puerto`                       | 12, 19    |
| 7   | dos rellenos                     | sacrificio      | `realFingerprint.test.ts`                                | 11        |
| 8   | varianza en bancos               | mitigado        | `frozenSkeletons`; pareado 12 semillas                   | 13        |
| 9   | reintentos de borde              | mitigado        | `skeletons.test.ts` p95 ≤ 3; 0 degradados                | 8, 9      |
| 10  | cola baja de reinas              | mitigado (D6)   | censo paso 0 y 8; `calendarQueens` estratificada         | 5, 13, 18 |
| 11  | `world.test.ts` y `RACE_DAY_TSS` | mitigado        | reparto de `kind` antes/después en el paso 8             | 13        |
| 12  | coste de arranque                | mitigado        | `arranque.test.ts` 1.500 / 2.500 / 1.000                 | 14        |
| 13  | remedición cara                  | mitigado        | decisión 29 como condición de borrado                    | 13, 15    |
| 14  | `RACE_REGION` con errores        | mitigado        | test de existencia; galería; corrección como dato        | 6, 16     |

### 17.4 Lo que la nota «v61» deja anotado como deuda

Para que ninguna de estas cosas se pierda entre encargos, la nota «v61 · El generador es una gramática» de `docs/balance.md` (paso 11) cierra con una lista de deudas con dueño y cifra, y es esta:

1. **Viento por zona** (`windMin` por `GeoSignature.viento`) y **exposición por tramo**: encargo de motor; hoy 6 de cada 100 llanas con viento de lado y 4 de cada 100 partidas (`docs/motor.md` §19.1 vía mapa 03 §5.1), iguales en pólder y en llanura padana.
2. **Altitud en `Segment`**: cambia el contrato de `types.ts` l. 37-42; hasta entonces `GeoSignature.altitud` es texto de ficha y veto V4.
3. **Unificar `featureProfile.ts`** con `enlace` y `amplitud` de zona: mueve la huella FNV de las 177 y `erosion.longClassicFresh` / `hardestClassicFresh`; paso propio con versión.
4. **Recalibrar `stageKindOf`** (D2): con la tabla declarado/leído por origen del censo tras el paso 8 y la cifra 27 de 113 como punto de partida.
5. **SPEC §6.17**: fuga del 25 al 45 % en alta montaña frente a la decisión vigente del 18,1 % con banda [6; 30]; se remide en el paso 9 sobre el calendario nuevo y se lleva al dueño con la cifra (D6), sin tocar el SPEC desde E1.
6. **`MAX_TEMPORADAS_EN_MEMORIA` 8**: se revisa con los MB de heap por temporada que imprime el script de la sección 14 cuando un mundo pase de 8 temporadas.
7. **Metas volantes y critérium** (D4, D5): a 0 y con peso 0; cada uno con la medida que pediría activarlo (2 de depósito y 5 km de alivio por pancarta; mapa 07 §1.7).

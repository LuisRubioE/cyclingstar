## 5. Los esqueletos por tipo y clase

### 5.1 Qué es un esqueleto y cómo se lee el catálogo

Un esqueleto es la arquitectura de una etapa antes del detalle: una lista de huecos (`Slot`) con motivo permitido, cardinalidad `n`, ventana de inicio y parámetros, más lo que la etapa PROMETE al resto del juego: el `kind` que `stageKindOf` tiene que devolver, la etiqueta `label` que la ficha enseña, el `finalKind` que `finalKindOf` tiene que devolver, una sola `meta`, un desnivel objetivo total y un rango bruto de kilómetros. Los tipos `Slot` y `Skeleton` son los de la sección 3 (El modelo de tipos) con la ampliación que se escribe en este apartado; lo que esta sección escribe es el contenido de `SKELETONS` (`packages/engine/src/routes/grammar/skeletons.ts`), con sus pesos, sus plantillas canónicas, sus alternativas y la regla con la que se elige uno.

**Ampliación de los tipos.** El `Slot` de §B.2 (`motif`, `n`, `ventana`, `params` con `kmRango` y `gRango`, `firma`) no basta para escribir el catálogo como dato: un `racimo` tiene sectores dentro, un `circuito` tiene sus dificultades dentro, `ud_adoquin` exige exactamente tres sectores de 5★, `ud_muros_adoquin` una fracción de muros adoquinados y toda meta con valle un rango de distancia a la última cota. Se amplía así, y la sección 3 (§3.3) lo recoge con este bloque (es la única ampliación de tipos que hace esta sección):

```ts
// packages/engine/src/routes/grammar/skeletons.ts (tipos; amplía §B.2)
export interface SlotParams extends Partial<
  Pick<Motif, 'g' | 'forma' | 'adoquin' | 'estrellas' | 'vueltas' | 'firme'>
> {
  kmRango?: [number, number] // km del motivo; en `circuito`, km de la vuelta
  gRango?: [number, number]
  estrellasRango?: [number, number] // solo `sector`
  vueltasRango?: [number, number] // solo `circuito`
  separacionRango?: [number, number] // `cadena`, `racimo`, `circuito`: enlace entre hijos; por defecto ARCH.motivo.cadena.enlace [1,5; 6] o racimo.separacion [2; 6]
  adoquinShare?: [number, number] // `cadena` de muros: fracción de hijos con `adoquin: true` (ud_muros_adoquin [0,4; 0,7])
  firmaCount?: number // `racimo`: hijos 5★ de firma que el esqueleto reparte entre sus racimos (ud_adoquin: 3)
}
export interface Slot {
  motif: MotifKind
  n: [number, number] // cardinalidad; 0 en el mínimo = hueco opcional
  ventana: [number, number] // fracción de la etapa (o de la vuelta o cadena, en `hijos`) donde EMPIEZA el motivo
  params?: SlotParams
  hijos?: Slot[] // solo `cadena`, `racimo`, `circuito`; `[]` en `circuito` es una vuelta de solo enlace (ud_criterium)
  firma?: boolean
}
export interface Requiere {
  // lo que el esqueleto exige de la zona; `admite` es la única función que lo lee
  puerto?: true
  cota?: true
  muro?: true | { adoquin: true }
  cotaKmMin?: number // exige `geo.cota !== null && geo.cota.km[1] >= cotaKmMin` (3,3: una cota que saque de `clasica`)
  cotaCortaMax?: number // exige `geo.cota !== null && geo.cota.km[0] <= cotaCortaMax` (2,9: una cota que siga siendo `clasica`; solo `ud_circuito`)
  adoquin?: 1 | 2 | 3
  sterrato?: true
  viento?: 1 | 2 | 3
  relieve?: Relieve // `orden(geo.relieve) >= orden(relieve)`
  finalesAlto?: 'corto' | 'largo' // 'corto' se cumple con corto o largo; 'largo' solo con largo
  altitud?: GeoSignature['altitud']
}
export interface Skeleton {
  id: SkeletonId
  kind: StageKind // lo que `stageKindOf` TIENE que devolver (V6)
  label: string // la etiqueta de la ficha: una de las ocho de `stageKindOf` o una de las cinco de la decisión 38
  timeTrial?: true // solo `et_crono`, `et_prologo`, `et_cronoescalada`, `nc_crono`
  finalKind?: FinalKind // lo que `finalKindOf` TIENE que devolver (V7) cuando el esqueleto tiene un solo final posible
  meta: MetaKind
  metaParams?: {
    aMeta?: [number, number]
    cotaFinal?: { km: [number, number]; g: [number, number] }
  } // las columnas "Meta"
  slots: Slot[]
  dPlus: [number, number] // objetivo TOTAL, relleno incluido (ARCH.reina.dPlusIncluyeRelleno)
  km: [number, number] // rango bruto antes de ARCH.km.porClase
  requiere?: Requiere | Requiere[] // una lista son alternativas ("o bien")
  pesoBase: number
  canonico: Motif[]
  alternativas?: Alternativa[] // tipo de la sección 10 (§10.3), recogido en §3.3: rangos por hueco de firma más una plantilla literal (§5.5)
}
export const SKELETONS: Record<SkeletonId, Skeleton> // un registro, nunca un array: `SKELETONS.ud_montana`, `Object.values(SKELETONS)` para iterar
export function admite(requiere: Requiere | Requiere[] | undefined, geo: GeoSignature): boolean // en grammar/geo.ts (§3.4); `undefined` siempre cabe
```

Tres consecuencias sobre otros tipos y nombres. (1) `Motif` gana `separaciones?: number[]` (§B.2, §3.2 y sección 4): los `hijos` de un compuesto son SOLO dificultades (`cota` o `muro` en `cadena`; `sector` en `racimo`; `cota`, `muro`, `sector` o `tendida` en `circuito`) y el enlace interno no es un hijo sino una separación. En `cadena` y `racimo` hay `hijos.length − 1` separaciones y `km = Σ km de hijos + Σ separaciones`; en `circuito` hay `hijos.length` (el enlace ANTES de cada hijo, desde el inicio de la vuelta o desde el hijo anterior) y lo que resta hasta `km` es el enlace de cierre, nunca menor que `ARCH.colocacion.enlaceMinimo` 1,5, con `Σ km de hijos ≤ ARCH.motivo.circuito.maxHijosShare 0,8 · km`. Es la representación que la sección 4 escribe (§4.2, "Los tres compuestos comparten una representación", y `validateMotif` regla 3 de §4.5). Si `separaciones` falta en un hueco que se instancia, `instanciar` las sortea en `separacionRango` con la corriente `mot` del compuesto (sección 8, §8.5; en un compuesto de firma, `instanciarFirma` con la de `firma`); una plantilla canónica las escribe literales, que es lo que la hace posible sin RNG, y la bajada canónica no se emite dentro de un compuesto (§4.2, `cadena`). (2) `admite` recibe `(requiere, geo)` en ese orden y `Requiere` es el de este bloque, con la semántica de sus comentarios: así lo declaran la sección 3 (§3.3 el tipo, §3.4 la función) y lo usan la 2, la 6 (§6.5 punto 1, que cita este bloque y no lo redeclara, y sus tests de §6.8), la 8 (§8.2, `admite(sk.requiere, req.geo)`) y la 16. `admite` solo lee `requiere`: que un esqueleto admitido se pueda además dibujar en la zona (rango efectivo no vacío en cada hueco obligatorio, hijos incluidos, y en la meta) es una propiedad de las dos tablas que sella el test (h) de §6.8, y por eso `requiere` tiene que decir todo lo que un hueco obligatorio necesita (`cotaKmMin`, `cotaCortaMax`). (3) `Skeleton.alternativas` es `Alternativa[]` y no `Motif[][]` (§5.5), como lo escriben las secciones 3 (§3.3) y 10 (§10.3).

Cuatro reglas gobiernan todas las filas del catálogo, y cada una sale de una línea de código y no de un gusto:

1. **El `kind` declarado es el que `stageKindOf` devuelve** (`stageKind.ts` l. 71-98, mapa 01 §5.1), y V6 (sección 9) lo comprueba en cada intento. Las consecuencias sobre el catálogo son literales: cualquier segmento `puerto` excluye `llana` (l. 77-78: `climbs.length === 0` es la única puerta a `Flat`), así que un esqueleto `llana` solo lleva `enlace`, `expuesto` y `tendida` (tipada `llano`, sección 4); un segmento `paves` da `clasica / Cobbles` antes de mirar nada más (l. 75), así que todo esqueleto con `sector` lleva ese `kind` aunque muera en un muro; una etapa que no muere arriba y cuya cota más larga mide ≤ `WALL_MAX_KM` 3 es `clasica / Classic` (l. 88), así que un esqueleto `media` sin final en alto necesita una cota de [3,3; 8,0] km (0,3 de `ARCH.veto.margenClaseKm` sobre 3 y 0,5 bajo `PASS_MIN_KM` 8,5). Y la red de `QUEEN_MIN_CLIMB_METRES` 3.200 (l. 90) se mide sobre TODA la etapa: `metres = segments.reduce((a, s) => a + climbMetres(s), 0)` (l. 80) recorre todos los segmentos, y `climbMetres` (l. 27-33) suma cualquier `tramos` con `g > 0` sin mirar `tipo`, de modo que el relleno de `rolling`, las `tendida` y las bajadas onduladas cuentan igual que los puertos: `metres` es, en la práctica, `dPlusDe(profile)`. Por eso un esqueleto `media` exige `dPlus[1] ≤ 2.900` TOTAL (300 de margen sobre 3.200, relleno y tendidas incluidos) y la persecución del desnivel de la sección 8 escala hacia abajo las dificultades de una `media` cuando la estimación (`Σ km·g·10` de dificultades más 5,5 m por km de enlace) supera 2.900. Un esqueleto `clasica` no tiene ese techo porque l. 88 decide antes que l. 90.
2. **Una sola `meta` por esqueleto**, porque `Skeleton.meta: MetaKind` es un valor y no una lista, y porque `finalKind` depende de dónde está la última cima. Donde arquitectura §3.3 escribía "`esprint` o `repecho`" aquí se decide uno; `repecho` es una subida a la línea (tipada `puerto`, sección 4) y por tanto solo cabe en esqueletos `media / Uphill finish`: es la meta de `ud_repecho`. La `cotaFinal` de la meta (la subida de los siete `MetaKind` que la tienen; `esprint` y `sector_meta` no) sale SIEMPRE de `ARCH`, nunca de la zona: su rango es la envolvente del `MetaKind` en `ARCH` intersecada con `metaParams.cotaFinal` (o con `alt.metaParams` si la opción de nivel 2 lo declara), y NO pasa por `geo.cota` ni por `geo.puerto`. Es la regla de §4.3 nota 3 y la que `instanciarFirma` aplica (§8.3), y se decide así por aritmética: toda zona tiene `cota.g ≤ 7` y el `alto_corto` de `et_reina_alto_corto` y `et_reina_encadenada` pide g [8; 11] (Planche 5,9 × 8,5), y la opción "Angliru" de `et_reina_alto_largo` pide g [8,5; 9,5] mientras `anatolia`, `balcanes`, `portugal` y `andes`, donde ese esqueleto pesa de ×1,2 a ×1,5 (§6.2), tienen `puerto.g` ≤ 7 (y en `cono_sur`, `puerto.g` [5; 6], el `alto_largo` de `et_reina_blanda` quedaría clavado en 6,0): intersecar la meta con la zona dejaría vacíos o degenerados esos finales justo en las zonas que los admiten. La zona decide sobre la meta de dos formas y ninguna es un rango: `requiere` (si el esqueleto es candidato: `finalesAlto`, `puerto: true`) y el techo de altitud de V4, que no es una intersección con `geo.puerto` sino el veto sobre el producto `km·g` que la sección 8 (§8.5) ya aplica a todo segmento `puerto`, y toda `cotaFinal` se rinde como segmento `puerto` (§4.1). Envolvente por `MetaKind`, `unDia = !sk.id.startsWith('et_')` (la misma prueba que el test (h) de §6.8): `repecho` → `ARCH.meta.repecho` (km [1; 2,9], g [5; 7]; en un día `km` además ≤ `ARCH.meta.muro.km[1]` 2,2, que es V5(b)); `muro_meta` → `ARCH.meta.muro` ([0,5; 2,2] × [8; 16]); `alto_corto` → `ARCH.meta.altoCorto` ([3; 7] × [6; 11]); `alto_largo` → `ARCH.meta.altoLargo` ([9; 22] × [6; 12], y `g ≤ gMaxSiMasDe17` 7 cuando el `km` sorteado pasa de 17); `cima_cerca`, `descenso_meta` y `valle` en un día → `ARCH.meta.unDiaUltimaCota` ([1,3; 4,2] × [7; 11], §4.5 regla 5); esos tres en etapa → `ARCH.motivo.puerto` ([9; 25] × [5; 12]) si `metaParams.cotaFinal.km[0] ≥ ARCH.motivo.puerto.km[0]` 9 y `ARCH.motivo.cota` ([2,5; 8,0] × [4; 8]) si no, porque `ARCH.meta.cimaCerca`, `.descensoMeta` y `.valle` solo declaran el valle y no la subida; por eso un esqueleto de ETAPA con esos tres `MetaKind` TIENE que declarar `metaParams.cotaFinal` (los cuatro que los usan lo declaran: `et_media_valle`, `et_media_tendida`, `et_reina_cima_cerca`, `et_reina_valle`) y `envolventeCotaFinal` lanza si falta. Cada cifra `km`/`g` de la columna "Meta" de §5.2 y §5.3 ES `metaParams.cotaFinal` del esqueleto; donde la columna cita `ARCH.meta.*` (`ud_montana`, `ud_repecho`) el esqueleto no declara `metaParams.cotaFinal`. El `km` y el `g` se resuelven por separado, campo a campo: `km` = envolvente ∩ (`alt.metaParams.kmRango` ?? `sk.metaParams.cotaFinal.km` ?? envolvente), y `g` = envolvente ∩ (`alt.metaParams.gRango` ?? `sk.metaParams.cotaFinal.g` ?? envolvente). De ahí sale el `g` cuando nadie lo declara: el de la envolvente, es decir `ARCH.meta.<clave>.g` (`repecho`, `muro`, `altoCorto`, `altoLargo`), `ARCH.meta.unDiaUltimaCota.g` [7; 11] en los tres con valle de un día, y nunca `geo.cota.g` ni `geo.puerto.g`; así `ud_montana` sortea su `g` en [7; 11] y su `km` en [1,3; 4,2], y la opción "Bérgamo", que no declara `metaParams`, también. `Skeleton.metaParams.cotaFinal` declara siempre las dos mitades (el tipo lo exige); `Alternativa.metaParams` puede declarar solo una, y la otra cae al esqueleto y después a la envolvente. `sk.metaParams.cotaFinal` solo cuenta si la opción no cambia la meta (`(alt?.meta ?? sk.meta) === sk.meta`); si la cambia, la opción declara `kmRango` y `gRango` o manda la envolvente del `MetaKind` nuevo. El valle de los tres `MetaKind` que lo tienen se sortea aparte, en `ARCH.meta.<clave>.valle` ∩ `metaParams.aMeta` (el `aMeta` solo lo declaran esqueletos de un día, §9.1), y el reparto bajada más llano es el de §4.3 nota 3. El código y los techos de altitud van después de estas cuatro reglas.
3. **`dPlus` es total, relleno incluido** (`ARCH.reina.dPlusIncluyeRelleno`, decisión 9), estimado con `ARCH.reina.rellenoDplusPorKm` 5,5 m por km de `enlace` (separaciones de compuestos y valles incluidos) y verificado con `dPlusDe(profile)`. Por eso las cifras de las tablas son más bajas que los desniveles reales del mapa 07 en las carreras cuyo relieve real viene de sectores en cuesta que el motor no ve: un `sector` se rinde como `paves` sin desnivel (arquitectura §3.1, l. 136). Una `tendida` suma en `dPlusDe` y en `metres` (regla 1) pero no en `kmSubida` del motor, porque se tipa `llano`.
4. **`km` es rango bruto**: el kilometraje real lo decide `kmDe` con `ARCH.km.porClase` (sección 7) para etapas de vuelta, y el sorteo `firma|raceId` sobre la fila `un día` de la misma tabla para carreras de un día sin `km` explícito (decisión 36); el esqueleto recorta ese sorteo a su rango y la clase decide si el esqueleto es candidato (§5.7). Las 36 filas con `km` explícito y las 226 etapas de edición traen el `km` como contrato al 0,1 (V10): es un contrato nuevo y más estricto que el sellado hoy, que compara `Math.round(km)` con el entero de la edición (`calendar.test.ts` l. 140-152).

**La regla 2 como código.** Cuatro funciones puras en `skeletons.ts`, junto a `SKELETONS`; las importa `instanciarFirma` (sección 8, §8.3) para la meta y `skeletons.test.ts` (§5.9) para sellar el catálogo. Ninguna recibe `geo`: las dos de rango no leen nada de la zona y los dos techos reciben solo `geo.altitud`:

```ts
// packages/engine/src/routes/grammar/skeletons.ts (regla 2 de §5.1)
type R = [number, number]
const corta = (a: R, b: R): R => [Math.max(a[0], b[0]), Math.min(a[1], b[1])]
const vacio = (r: R): boolean => r[0] > r[1]
const floor1 = (x: number): number => Math.floor(x * 10 + 1e-9) / 10 // techo redondeado hacia abajo: el sorteo redondeado a 0,1 nunca lo pasa

/** Envolvente de la cotaFinal por MetaKind. Lee solo ARCH. null = MetaKind sin subida (esprint, sector_meta). */
export function envolventeCotaFinal(
  meta: MetaKind,
  unDia: boolean,
  kmDeclarado?: R,
): { km: R; g: R } | null {
  switch (meta) {
    case 'esprint':
    case 'sector_meta':
      return null
    case 'repecho':
      return {
        km: unDia ? corta(ARCH.meta.repecho.km, [0, ARCH.meta.muro.km[1]]) : ARCH.meta.repecho.km,
        g: ARCH.meta.repecho.g,
      } // un día: ≤ 2,2 (V5b)
    case 'muro_meta':
      return { km: ARCH.meta.muro.km, g: ARCH.meta.muro.g }
    case 'alto_corto':
      return { km: ARCH.meta.altoCorto.km, g: ARCH.meta.altoCorto.g }
    case 'alto_largo':
      return { km: ARCH.meta.altoLargo.km, g: ARCH.meta.altoLargo.g } // gMaxSiMasDe17 se aplica tras sortear km (techoG)
    case 'cima_cerca':
    case 'descenso_meta':
    case 'valle': {
      if (unDia) return { km: ARCH.meta.unDiaUltimaCota.km, g: ARCH.meta.unDiaUltimaCota.g }
      if (!kmDeclarado) throw new Error(`cotaFinal: ${meta} de etapa sin metaParams.cotaFinal`) // ARCH.meta.<clave> solo trae el valle
      const m = kmDeclarado[0] >= ARCH.motivo.puerto.km[0] ? ARCH.motivo.puerto : ARCH.motivo.cota
      return { km: m.km, g: m.g }
    }
  }
}

/** Rango de la cotaFinal de la opción elegida: envolvente ∩ lo declarado, km y g por separado. Sin zona. */
export function rangoCotaFinal(sk: Skeleton, alt: Alternativa | null): { km: R; g: R } | null {
  const meta = alt?.meta ?? sk.meta
  const propio = meta === sk.meta ? sk.metaParams?.cotaFinal : undefined // si la opción cambia la meta, el rango del esqueleto no vale
  const kmDecl = alt?.metaParams?.kmRango ?? propio?.km
  const gDecl = alt?.metaParams?.gRango ?? propio?.g
  const env = envolventeCotaFinal(meta, !sk.id.startsWith('et_'), kmDecl)
  if (!env) return null
  const r = { km: corta(env.km, kmDecl ?? env.km), g: corta(env.g, gDecl ?? env.g) }
  if (vacio(r.km) || vacio(r.g))
    throw new Error(`cotaFinal: rango vacío en ${sk.id}${alt ? ` (${alt.nombre})` : ''}`)
  return r
}

/** Techo de km por altitud (V4b y V4c), antes de sortear km: con g en su suelo, el producto tiene que caber. */
export function techoKmCotaFinal(r: { km: R; g: R }, altitud: GeoSignature['altitud']): R {
  let hi = r.km[1]
  if (altitud !== 'media' && altitud !== 'alta' && altitud !== 'altiplano')
    hi = Math.min(hi, ARCH.veto.puertoLargoKm - 0.1) // V4b: < 15
  hi = Math.min(hi, ARCH.veto.puertoDplusMax[altitud] / (r.g[0] * 10)) // V4c con g = suelo
  return [r.km[0], floor1(hi)]
}

/** Techo de g con el km ya sorteado: gMaxSiMasDe17 de alto_largo y V4c. */
export function techoGCotaFinal(
  meta: MetaKind,
  r: { km: R; g: R },
  km: number,
  altitud: GeoSignature['altitud'],
): R {
  let hi = r.g[1]
  if (meta === 'alto_largo' && km > 17) hi = Math.min(hi, ARCH.meta.altoLargo.gMaxSiMasDe17) // 17: el umbral que nombra la constante (§12)
  hi = Math.min(hi, ARCH.veto.puertoDplusMax[altitud] / (km * 10))
  return [r.g[0], floor1(hi)]
}
```

`instanciarFirma` (§8.3), después de los huecos de firma y con la misma corriente `rand` (`firma|${id}`): `r = rangoCotaFinal(sk, alt)`; si `r` no es `null`, `kr = techoKmCotaFinal(r, geo.altitud)` y `km = clamp(round1(kr[0] + rand() · (kr[1] − kr[0])), kr[0], kr[1])`; después `gr = techoGCotaFinal(meta, r, km, geo.altitud)` y `g = clamp(round1(gr[0] + rand() · (gr[1] − gr[0])), gr[0], gr[1])`. Dos tiradas, en ese orden (el de §8.5: `km`, luego `g`), y la meta queda con `cotaFinal = { km, g }`; el valle, donde lo hay, se tira después. Los dos techos no son una intersección con la zona sino V4 hecho cumplir por construcción, igual que §8.5 lo hace con los puertos no firma: sin ellos, `et_reina_alto_largo` en `cantabrico` (altitud `media`, techo 1.300 m) sortearía 22 km al 6 % (1.320 m) y V4(c) dispararía, y `et_reina_valle` en `centroeuropa` (altitud `colina`) sortearía una `cotaFinal` de 16 km que V4(b) prohíbe. Que el techo no vacíe el rango lo sella §5.9 sobre cada par (esqueleto u opción, zona admitida): `km[0]·g[0]·10 ≤ puertoDplusMax[altitud]` y, fuera de `media`, `alta` y `altiplano`, `km[0] < puertoLargoKm`. Resultado por esqueleto, para comprobar a mano: `ud_montana` y su opción "Bérgamo" [1,3; 4,2] × [7; 11]; `ud_montana_media` [2,5; 4,2] × [7; 9]; `ud_repecho` [1; 2,2] × [5; 7]; `ud_muro_final` y `et_media_muro` [0,5; 2,2] × [8; 16]; `ud_sterrato` [0,5; 1,0] × [12; 16]; `ud_montana_alto` [13; 22] × [6; 7]; `et_media_alto` [3; 7] × [6; 11]; `et_reina_alto_corto` y `et_reina_encadenada` [4; 7] × [8; 11]; `et_reina_alto_largo` y `et_montana_corta` [9; 22] × [6; 9]; opción "Angliru" [12; 13] × [8,5; 9,5]; opción "Lagos" [11,5; 12,8] × [6,8; 7,6]; `et_reina_blanda` [9; 12] × [6; 7]; `et_cronoescalada` [9; 15] × [6; 9]; `et_reina_cima_cerca` [9; 16] × [6; 9] y `et_reina_valle` [9; 17] × [6; 9] (envolvente `ARCH.motivo.puerto`); `et_media_valle` [2,5; 8] × [4; 7] y `et_media_tendida` [2,5; 6] × [4; 6] (envolvente `ARCH.motivo.cota`); los demás, `null`.

Sobre el recuento: son 32 esqueletos, 16 de un día (`ud_*` y `nc_*`) y 16 de etapa (`et_*`). Arquitectura §3.3 prometía "15 + 17", pero el decimoséptimo de etapa no existía en ninguna propuesta; el trigésimo segundo es `ud_repecho`, un esqueleto de un día que esta sección añade con su razón (§5.2) y que la unión `SkeletonId` de la sección 3 (§3.3) ya incluye: 32 = 16 + 16. El test de §5.9 sella que `Object.keys(SKELETONS)` es exactamente esa unión.

### 5.2 Los dieciséis esqueletos de un día

Notación de la columna de motivos: `motivo×[min; max]@[a; b]` es un `Slot` con `n = [min, max]` y `ventana = [a, b]`; los parámetros entre paréntesis son `Slot.params`; `{ … }` tras un compuesto son sus `Slot.hijos`, con ventanas relativas a la vuelta o a la cadena; `(firma)` es `Slot.firma: true`. Todo hueco con `n[0] = 0` es opcional y lo mueve la edición (`ARCH.edicion.motivoNuevo` 0,35). El `meta` no aparece como hueco: es el último motivo de todo esqueleto, siempre de firma, con el `MetaKind` de la columna "Meta" y sus `metaParams`. Los rangos de hueco que no se citan son los de `ARCH.motivo.*` recortados por la zona (sección 6); la `cotaFinal` de la meta no se recorta por la zona y sigue la regla 2 de §5.1 (sus cifras en la columna "Meta" son `metaParams.cotaFinal`). El `firme` de un `sector` lo decide la zona en la instanciación: `adoquin` si `geo.adoquin ≥ 2`, `tierra` si no y `geo.sterrato` (`validateMotif` regla 4, §4.5). El hueco `expuesto` solo se instancia si `geo.viento ≥ 2` (§4.2); si no, rinde `enlace`.

| Id                  | kind / label                                                            | finalKind                             | Motivos                                                                                                                                                                                                                                                                      | Meta                                                                                                                        | D+ total (m)   | Km bruto                                | `requiere`                                                                                                                                                                                            | pesoBase                                                                                | Referencia real (mapa 07)                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ud_esprint`        | llana / Flat                                                            | (ninguno)                             | `expuesto`×[0; 2]@[0,1; 0,8]; `tendida`×[0; 1]@[0,3; 0,7] (km [5; 10], g [1,5; 3])                                                                                                                                                                                           | `esprint`                                                                                                                   | [400; 1.500]   | [150; 240]                              | (ninguno: siempre cabe)                                                                                                                                                                               | 30                                                                                      | Brugge-De Panne, Scheldeprijs (§1.5). La "cota testimonial" es `tendida` y no `cota`: un `puerto` la sacaría de `llana` (regla 1); `expuesto` solo donde `viento ≥ 2`                                                                                                                                                                                                                                                                                  |
| `ud_esprint_capi`   | media / Hills                                                           | `valle_corto`                         | `cota`×[2; 3]@[0,7; 0,97] (km [3,3; 5,6], g [4; 5]; la última km [3,3; 4,2])                                                                                                                                                                                                 | `esprint` a [5,7; 8] km de la última cota                                                                                   | [1.200; 2.300] | [200; 295]                              | `{ cota: true, cotaKmMin: 3.3 }` (su hueco `cota` mide [3,3; 5,6]: `bretana`, hasta 3,0, no la admite)                                                                                                | 6                                                                                       | La semiclásica con capi finales. Sanremo (§1.5) es su modelo pero NO pasa por la gramática: `race-sanremo` tiene rasgos reales (`stageFeatures.ts` l. 5587, `routeSource: 'real'`, fila `hilly` de 288 km, `calendar.ts` l. 996-1003, `km` en l. 1002). `stageKindOf` llama `media` a esta forma porque Poggio y Cipressa pasan de 3 km (banco §9.4.1): se declara así y no se toca el clasificador (decisión 26). Solo WT, Pro y .1 (§5.6)            |
| `ud_circuito`       | clasica / Circuit                                                       | `cima_cerca`                          | `enlace`×[0; 1]@[0; 0,05]; `circuito`×1@[0; 0,3] (firma; vuelta [10; 18] km × [6; 18]) { `muro`×[1; 2]@[0,1; 0,9] (km [0,4; 2,5], g [8; 12]) }                                                                                                                               | `esprint` a [1,2; 4,3] km del último muro                                                                                   | [1.800; 4.000] | [140; 275]                              | `[{ muro: true }, { cota: true, cotaCortaMax: 2.9 }]` (con `cota` los hijos son `cota` de [2,5; 2,9] km, que sigue siendo `clasica`, y eso solo es dibujable donde la cota de la zona baja de 2,9 km) | 20                                                                                      | Québec, Montréal, Japan Cup (§1.1). Todas sus cotas miden ≤ 2,9 km, luego `clasica` por la regla 1; Frankfurt con Feldberg es `ud_montana_media`                                                                                                                                                                                                                                                                                                       |
| `ud_muro_final`     | media / Wall finish                                                     | `alto`                                | `cota`×[1; 3]@[0,3; 0,8] (km [2,5; 6]); `circuito`×[0; 1]@[0,55; 0,75] (vuelta [9; 30] × [2; 3]) { `muro`×1@[0; 0,4] (el de la meta, mismo km y g; firma), `muro`×[0; 1]@[0,5; 0,9] }                                                                                        | `muro_meta` (firma; km [0,5; 2,2], g [8; 16])                                                                               | [1.500; 2.900] | [180; 215]                              | `{ muro: true, cota: true }` (su hueco `cota`×[1; 3] es obligatorio y sin él no se llega a 1.500 m: por eso no cabe en `flandes` ni `francia_norte`, §6.5 punto 1)                                    | 10                                                                                      | Flèche (Huy ×3), Emilia (San Luca ×5) (§1.2); Nokere, en `flandes`, no sale de este esqueleto. Muro > 1,0 km tipa `puncheur` (decisión 7)                                                                                                                                                                                                                                                                                                              |
| `ud_muros`          | clasica / Classic                                                       | (varía: `cima_cerca` o `valle_corto`) | `enlace`@[0; 0,45]; `cadena`×[2; 4]@[0,45; 0,97] { `muro`×[3; 8] (km [0,4; 2,5], g [8; 13]) } con `separacionRango` [1,5; 5]                                                                                                                                                 | `esprint` a [1,2; 15] km del último muro                                                                                    | [1.500; 3.500] | [180; 275]                              | `{ muro: true }`                                                                                                                                                                                      | 25                                                                                      | Ronde, Omloop, E3, Amstel, Brabantse (§1.3): 12 a 20 muros, los tres últimos en los últimos 30 km                                                                                                                                                                                                                                                                                                                                                      |
| `ud_muros_adoquin`  | clasica / Cobbles                                                       | (varía)                               | como `ud_muros` con `adoquinShare` [0,4; 0,7] en las cadenas; `sector`×[2; 7]@[0,3; 0,9] (km [1; 2,5], ★[2; 3])                                                                                                                                                              | `esprint` a [1,2; 15] km                                                                                                    | [1.500; 2.800] | [180; 275]                              | `{ adoquin: 2, muro: { adoquin: true } }`                                                                                                                                                             | 12                                                                                      | Ronde, Omloop con sus sectores llanos (§1.3). `Cobbles` por la regla 1                                                                                                                                                                                                                                                                                                                                                                                 |
| `ud_sterrato`       | clasica / Cobbles                                                       | `alto`                                | `cota`×[2; 4]@[0,15; 0,9] (km [2,5; 5], g [5; 7]); `racimo`×[2; 3]@[0,25; 0,9] { `sector`×[4; 5] (km [1; 3,7], ★[2; 3], `firme: 'tierra'`) } con `separacionRango` [2; 5]; `muro`×[1; 3]@[0,5; 0,95] (km [0,4; 2], g [10; 16])                                               | `muro_meta` (km [0,5; 1,0], g [12; 16])                                                                                     | [1.600; 2.800] | [180; 215]                              | `{ sterrato: true, muro: true, cota: true }`                                                                                                                                                          | 8                                                                                       | Strade Bianche (§1.3). Monte Sante Marie (11,5 km) se escribe como tres sectores de 3,7 separados por 2 km; el desnivel real de 3.000 m no sale porque el sterrato es `paves` sin pendiente                                                                                                                                                                                                                                                            |
| `ud_adoquin`        | clasica / Cobbles                                                       | (ninguno)                             | `expuesto`@[0; 0,35]; `racimo`×[3; 4]@[0,35; 0,97] { `sector`×[5; 8] (km [0,3; 3,7], ★[1; 5]) } con `firmaCount` 3 (exactamente tres sectores 5★, de firma, repartidos uno por racimo)                                                                                       | `sector_meta` (sector [0,3; 2,5] km en `hijos[0]` + `aMeta` [1; 8] km)                                                      | [600; 1.200]   | [200; 260]                              | `{ adoquin: 2 }`                                                                                                                                                                                      | 10                                                                                      | Roubaix (§1.4): 29 a 31 sectores, 54 a 57 km, Arenberg, Mons-en-Pévèle, Carrefour de l'Arbre; la gramática da de 15 a 32 sectores más el de meta                                                                                                                                                                                                                                                                                                       |
| `ud_adoquin_ligero` | clasica / Cobbles                                                       | (varía)                               | `racimo`×[2; 3]@[0,3; 0,95] { `sector`×[4; 5] (km [0,8; 2,2], ★[2; 3]) } con `separacionRango` [2; 4]; `muro`×[0; 3]@[0,5; 0,97] (km [0,4; 1,5], g [8; 12])                                                                                                                  | `esprint` a [2; 8] km                                                                                                       | [800; 1.800]   | [170; 215]                              | `[{ adoquin: 2 }, { sterrato: true }]` (con `sterrato` los sectores son `tierra`: Tro Bro Léon)                                                                                                       | 8                                                                                       | Denain, Le Samyn, Tro Bro Léon (§1.4): racimos de 4 sectores cortos, de 10 a 22 km, por lo que `ARCH.motivo.racimo.km` es [10; 60] (§5.4)                                                                                                                                                                                                                                                                                                              |
| `ud_montana`        | reina / Mountains classic                                               | (varía: `cima_cerca` o `valle_corto`) | `enlace`@[0; 0,4]; `puerto`×[2; 3]@[0,4; 0,85] (el más largo, firma); `cota`×[1; 2]@[0,8; 0,97] (km [2,5; 4,2], g [6; 7])                                                                                                                                                    | `descenso_meta` o `cima_cerca` con `cotaFinal` de `ARCH.meta.unDiaUltimaCota` (km [1,3; 4,2], g [7; 11]) a [3; 17] km (V5c) | [3.000; 4.600] | [200; 260]                              | `{ puerto: true, cota: true, relieve: 'montana' }`                                                                                                                                                    | 12                                                                                      | Lombardía, Lieja, San Sebastián (§1.6, §4.3): es el caso v40 en positivo (V5). Civiglio (4,2 × 9,7) entra al 7 %: el hueco de §4.2                                                                                                                                                                                                                                                                                                                     |
| `ud_montana_media`  | media / Hills                                                           | `valle_corto`                         | `cota`×[3; 5]@[0,3; 0,95] (la primera km [3,3; 8,0]); `muro`×[0; 2]@[0,4; 0,9]                                                                                                                                                                                               | `descenso_meta` con `cotaFinal` (km [2,5; 4,2], g [7; 9]) a [5,7; 17] km                                                    | [2.000; 2.900] | [170; 215]                              | `{ cota: true, cotaKmMin: 3.3 }`                                                                                                                                                                      | 12                                                                                      | Piemonte, Agostoni, Laigueglia, Frankfurt (§1.6, §1.1)                                                                                                                                                                                                                                                                                                                                                                                                 |
| `ud_repecho`        | media / Uphill finish                                                   | `alto`                                | `cota`×[2; 4]@[0,3; 0,9] (la primera km [3,3; 8,0])                                                                                                                                                                                                                          | `repecho` (firma; `ARCH.meta.repecho` g [5; 7] y, en un día, km [1; 2,2] por V5(b), §4.3)                                   | [1.500; 2.900] | [160; 215]                              | `{ cota: true, cotaKmMin: 3.3 }`                                                                                                                                                                      | 12                                                                                      | La clásica de colinas con meta en repecho: Amstel con meta en el Cauberg (1,2 km al 5,8 %, mapa 07 §1.3; entra como meta porque `repecho` admite [5; 7] %, §4.3) y las semiclásicas italianas de otoño con llegada en cuesta (referencia del redactor, sin fila en el mapa 07). Es el único esqueleto que usa `repecho`, y existe porque en las 10 zonas con `muro: null` (§6.2) una carrera `hilly` solo podía ser `ud_circuito` o `ud_montana_media` |
| `ud_montana_alto`   | reina / Summit finish                                                   | `alto`                                | `enlace`@[0; 0,6]; `puerto`×[1; 1]@[0,3; 0,6] (obligatorio por V8b, sección 9: con `puerto`×0 sería `reina-150`)                                                                                                                                                             | `alto_largo` (firma; km [13; 22], g [6; 7])                                                                                 | [2.500; 3.800] | [150; 185]                              | `{ puerto: true, finalesAlto: 'largo' }`                                                                                                                                                              | 60 (× 0,02 por clase, §5.6)                                                             | Ventoux Dénivelé, Mercan'Tour (§1.2): tres carreras sobre doscientas. Rareza (decisión 37, D1)                                                                                                                                                                                                                                                                                                                                                         |
| `ud_criterium`      | llana / Flat                                                            | (ninguno)                             | `circuito`×1@[0; 0,1] (firma; vuelta [1,5; 3] km × [20; 40]) { } (sin hijos: la vuelta es solo enlace)                                                                                                                                                                       | `esprint`                                                                                                                   | [0; 300]       | [45; 100]                               | (ninguno)                                                                                                                                                                                             | 1 (× 0 en todas las clases hasta D5)                                                    | Critériums (§1.7): "fiesta y no carrera puntuable"                                                                                                                                                                                                                                                                                                                                                                                                     |
| `nc_ruta`           | media / Circuit; en zonas sin `cota` ≥ 3,3 km, clasica / Circuit (§5.7) | `cima_cerca`                          | `enlace`×[0; 1]@[0; 0,25]; `circuito`×1@[0; 0,25] (firma; vuelta [10; 20] × [8; 16]) { `cota`×[1; 1]@[0,05; 0,4] (km [3,3; 6]; en la variante clásica `n: [0; 0]`), `muro`×[0; 2]@[0,4; 0,9] (solo si `muro !== null`), `sector`×[0; 2]@[0,2; 0,8] (solo si `adoquin ≥ 2`) } | `esprint` a [1,2; 4,3] km del último paso                                                                                   | [1.800; 2.900] | [180; 240] (`ARCH.km.porClase.NC.ruta`) | (ninguno)                                                                                                                                                                                             | 1 (único candidato de la ruta nacional)                                                 | Campeonatos nacionales (mapa 07 §4.1, "siempre circuito"); la promesa de `motor.md` §V.3. El hueco `cota` es obligatorio en la variante `media`: sin cota de más de 3 km la etapa sería `clasica` (l. 88) y V6 la vetaría siempre                                                                                                                                                                                                                      |
| `nc_crono`          | cri / ITT                                                               | (ninguno)                             | `enlace`@[0; 1]; `cota`×[0; 1]@[0,3; 0,7] (km [2,5; 5], g [4; 6]: con [2,5; 3] × [4; 5] se instanciaba siempre con `n = 0` en `alpes`, `pirineos`, `dolomitas`, `andalucia` e `italia_norte`, §6.5 punto 3)                                                                  | `esprint`                                                                                                                   | [100; 500]     | [25; 45]                                | (ninguno)                                                                                                                                                                                             | 1 (único candidato de toda crono de un día: las 266 nacionales y la fila `race-chrono`) | Crono nacional; Chrono des Nations (`race-chrono`, `.1`, `terrain: 'itt'`, 45 km, `calendar.ts` l. 3351-3360)                                                                                                                                                                                                                                                                                                                                          |

Tres decisiones de esta tabla se apartan de arquitectura §3.3 y se dicen con su razón: `ud_esprint_capi` es `media` y `ud_circuito` es `clasica` (regla 1 de §5.1: con V6 como ley, el catálogo se pliega a `stageKindOf` y no al revés); `ud_muros_adoquin` y `ud_sterrato` llevan `Cobbles` (l. 75). Las etiquetas `Circuit`, `Wall finish`, `Mountains classic`, `Prologue` y `Hill climb` son las cinco nuevas de la decisión 38 y las pone `generateStage` desde `Skeleton.label` DESPUÉS de que V6 haya igualado el `kind` (sección 3, §3.3; sección 11, §11.5 regla 3): `stageKindOf` solo produce ocho etiquetas (l. 72-97) y no se toca (decisión 26), así que V6 y `skeletons.test.ts` comparan solo `kind`, y un test aparte sella que cada `label` es compatible con su `kind` (tabla en §5.9). La etiqueta de la etapa es `labelDe(sk, profile, timeTrial)` (§3.7, sección 11 §11.5 regla 3): `sk.label` si es una de las cinco de esqueleto y, si no, `stageKindOf(profile, timeTrial).label`, que para toda instancia válida del catálogo coincide con `sk.label`; así lo escriben las secciones 3, 8 (`salida(...)`), 11 y 14. Ninguna de estas decisiones cambia el `kind` que el jugador ve respecto de lo que el clasificador diría de la misma etapa hoy.

### 5.3 Los dieciséis esqueletos de etapa

Las etapas de vuelta se piden por `StageRole` (sección 7) y no por terreno; la columna "Papel" dice qué papeles pueden pedir cada esqueleto. `Km bruto` es el rango de plausibilidad; el kilometraje lo pone `ARCH.km.porClase` (sección 7) y la etapa cabe por `normalizeEnlaces` (V10).

| Id                    | kind / label          | finalKind     | Papel                                                    | Motivos                                                                              | Meta                                                                           | D+ total (m)   | Km bruto   | `requiere`                                                                                                                                                      | pesoBase                           | Referencia                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | --------------------- | ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `et_llana`            | llana / Flat          | (ninguno)     | `llana`                                                  | `tendida`×[0; 2]@[0,2; 0,7] (km [5; 12], g [1,5; 3])                                 | `esprint`                                                                      | [500; 1.500]   | [110; 230] | (ninguno)                                                                                                                                                       | 30                                 | Llana de gran vuelta (§2.1): cat 4/3 como `tendida`, no como `cota` (regla 1)                                                                                                                                                                                                                                                                                                                                                        |
| `et_llana_viento`     | llana / Flat          | (ninguno)     | `llana_viento`                                           | `expuesto`×[2; 3]@[0,3; 0,95]                                                        | `esprint`                                                                      | [300; 900]     | [110; 210] | `{ viento: 2 }`                                                                                                                                                 | 12                                 | Pólder, desierto (§1.5, §2.2 UAE). El abanico sigue en `streams('viento')` (decisión 17)                                                                                                                                                                                                                                                                                                                                             |
| `et_media_valle`      | media / Hills         | `valle_largo` | `media`                                                  | `cota`×[2; 4]@[0,25; 0,8] (la primera km [3,3; 8,0]); `muro`×[0; 2]@[0,4; 0,85]      | `valle` con `cotaFinal` (km [2,5; 8], g [4; 7]) a [20,7; 45] km                | [1.600; 2.900] | [120; 200] | `{ cota: true, cotaKmMin: 3.3 }`                                                                                                                                | 25                                 | Media montaña de fuga (§2.1): última a 20 a 40 km, como `hillySegments` hoy (mapa 01 §8: "tras última cota" de 26 a 68 km)                                                                                                                                                                                                                                                                                                           |
| `et_media_alto`       | media / Uphill finish | `alto`        | `media_alto`                                             | `cota`×[1; 2]@[0,3; 0,8] (km [3,3; 8,0])                                             | `alto_corto` (firma; km [3; 7], g [6; 11])                                     | [1.600; 2.900] | [110; 190] | `{ cota: true, cotaKmMin: 3.3, finalesAlto: 'corto' }`                                                                                                          | 20                                 | Arrate, Planche, Xorret, Willunga (§2.2, §4.3)                                                                                                                                                                                                                                                                                                                                                                                       |
| `et_media_muro`       | media / Wall finish   | `alto`        | `media_muro`                                             | `cadena`×[1; 2]@[0,5; 0,95] { `muro`×[3; 6] (km [0,4; 2], g [8; 14]) }               | `muro_meta` (firma; km [0,5; 2,2], g [8; 16])                                  | [1.500; 2.900] | [120; 200] | `{ muro: true }`                                                                                                                                                | 12                                 | Tirreno (Sant'Elpidio), Benelux (Muur), Itzulia (§2.2)                                                                                                                                                                                                                                                                                                                                                                               |
| `et_media_tendida`    | media / Hills         | `valle_largo` | `media`                                                  | `tendida`×[1; 2]@[0,1; 0,6] (km [10; 30]); `cota`×[1; 2]@[0,4; 0,75] (km [3,3; 8,0]) | `valle` con `cotaFinal` (km [2,5; 6], g [4; 6]) a [20,7; 45] km                | [1.500; 2.500] | [120; 200] | `[{ cota: true, cotaKmMin: 3.3, altitud: 'altiplano' }, { cota: true, cotaKmMin: 3.3, altitud: 'media' }, { cota: true, cotaKmMin: 3.3, relieve: 'ondulado' }]` | 8                                  | Meseta, altiplano andino, Anatolia (mapa 07 §3)                                                                                                                                                                                                                                                                                                                                                                                      |
| `et_reina_alto_largo` | reina / Summit finish | `alto`        | `reina_alto`                                             | `enlace`@[0; 0,35]; `puerto`×[2; 3]@[0,3; 0,85], cada uno con `descenso` canónico    | `alto_largo` (firma; km [9; 22], g [6; 9], g ≤ 7 si > 17)                      | [3.500; 5.500] | [110; 200] | `{ puerto: true, relieve: 'montana', finalesAlto: 'largo' }`                                                                                                    | 20                                 | Alpe d'Huez, Beille, Angliru, Lagos (§4.3): el 70 % a 80 % de los finales en alto de gran vuelta                                                                                                                                                                                                                                                                                                                                     |
| `et_reina_alto_corto` | reina / Summit finish | `alto`        | `reina_alto`                                             | `puerto`×[2; 3]@[0,3; 0,85] (al menos dos ≥ 9 km, por V8a)                           | `alto_corto` (firma; km [4; 7], g [8; 11])                                     | [2.600; 4.800] | [110; 190] | `{ puerto: true, relieve: 'montana', finalesAlto: 'corto' }`                                                                                                    | 12                                 | Planche, Xorret, Tre Cime por el último tramo (§4.3)                                                                                                                                                                                                                                                                                                                                                                                 |
| `et_reina_cima_cerca` | reina / Summit finish | `cima_cerca`  | `reina_valle`                                            | `puerto`×[2; 3]@[0,25; 0,8]                                                          | `cima_cerca` con `cotaFinal` puerto (km [9; 16], g [6; 9]) a [1,2; 4,3] km     | [3.000; 4.800] | [120; 200] | `{ puerto: true, relieve: 'montana' }`                                                                                                                          | 10                                 | Livigno 2024, Tour e19 2024 Isola por la bajada corta (§2.1). Etiqueta `Summit finish` por la regla de la decisión 23 (`SUMMIT_RUN_IN_KM` 5: una cima a ≤ 5 km de meta se corre como final en alto, `apps/api/src/stageHistory.ts` l. 73 y 110), aunque `finalKind` sea `cima_cerca`                                                                                                                                                 |
| `et_reina_valle`      | reina / Mountains     | `valle_corto` | `reina_valle`                                            | `puerto`×[3; 4]@[0,2; 0,8], cada uno con `descenso`                                  | `descenso_meta` con `cotaFinal` puerto (km [9; 17], g [6; 9]) a [5,7; 19,3] km | [3.200; 5.000] | [130; 210] | `{ puerto: true, relieve: 'montana' }`                                                                                                                          | 10                                 | "Montaña sin final en alto" (§2.1): 1 a 3 por gran vuelta                                                                                                                                                                                                                                                                                                                                                                            |
| `et_reina_encadenada` | reina / Summit finish | `alto`        | `reina_encadenada`                                       | `puerto`×[3; 5]@[0,05; 0,85] con enlaces ≤ 6 km entre ellos                          | `alto_corto` (firma; km [4; 7], g [8; 11])                                     | [3.800; 5.500] | [110; 160] | `{ puerto: true, relieve: 'alta' }`                                                                                                                             | 6                                  | Dolomitas (Tre Cime), Pirineos encadenados (§2.1 regla 4); `alta` y no `montana` porque cuatro puertos pegados solo existen en cordillera (la sección 6 escribía `montana`: esta columna manda)                                                                                                                                                                                                                                      |
| `et_montana_corta`    | reina / Summit finish | `alto`        | `montana_corta`                                          | `puerto`×2@[0,08; 0,7] con enlaces ≤ 8 km entre puertos                              | `alto_largo` (firma; km [9; 22], g [6; 9])                                     | [3.000; 4.200] | [100; 140] | `{ puerto: true, relieve: 'montana', finalesAlto: 'largo' }`                                                                                                    | 6                                  | Montaña corta de Vuelta y Tour desde 2018 (§2.1 regla 5)                                                                                                                                                                                                                                                                                                                                                                             |
| `et_reina_blanda`     | reina / Summit finish | `alto`        | cualquier `reina_*` (por `ARCH.reina.blandaShare`, §5.7) | `enlace`@[0; 0,6]; `cota`×[1; 2]@[0,15; 0,6] (km [5; 8], g [4; 7])                   | `alto_largo` (firma; km [9; 12], g [6; 7])                                     | [1.500; 2.500] | [130; 180] | `{ puerto: true, cota: true, finalesAlto: 'largo' }` (sin `relieve`)                                                                                            | 1 (no entra en el sorteo por peso) | Vuelta de una semana con un solo puerto (Fóia, Algarve; no Jebel Hafeet: en `golfo` D8 la cierra): la cola baja que `packages/engine/src/sim/calendarQueens.test.ts` l. 64-65 exige (`dPlus.min < 1500`), decidida aquí (decisión 8). Exige `cota` porque su hueco `cota` es obligatorio y V8b necesita esa subida lejana: `cono_sur` la tiene porque §6.2 le da `cota` [4; 8] × [4; 6] de precordillera, y así AR y CL tienen reina |
| `et_crono`            | cri / ITT             | (ninguno)     | `cri`                                                    | `cota`×[0; 1]@[0,3; 0,7] (km [2,5; 5], g [4; 6], como `nc_crono`)                    | `esprint`                                                                      | [50; 400]      | [8; 45]    | (ninguno)                                                                                                                                                       | 1                                  | CRI de 14 a 26 km (`ROUTE.itt*`) y de 30 a 35 (Dauphiné)                                                                                                                                                                                                                                                                                                                                                                             |
| `et_prologo`          | cri / Prologue        | (ninguno)     | `prologo`                                                | (solo `enlace`)                                                                      | `esprint`                                                                      | [0; 100]       | [3; 8]     | (ninguno)                                                                                                                                                       | 1                                  | Romandía, Dauphiné, Suiza (§2.2); D3                                                                                                                                                                                                                                                                                                                                                                                                 |
| `et_cronoescalada`    | cri / Hill climb      | `alto`        | `cronoescalada`                                          | `enlace`×[0; 1]@[0; 0,4] (km [3; 10])                                                | `alto_largo` (firma; km [9; 15], g [6; 9])                                     | [500; 1.200]   | [12; 25]   | `{ puerto: true, relieve: 'montana', finalesAlto: 'largo' }`                                                                                                    | 1                                  | Peyragudes (Tour 2025 e13, 11 km); D3                                                                                                                                                                                                                                                                                                                                                                                                |

Esta columna `requiere`, con la de §5.2, es la única lista por esqueleto del documento: la sección 6 (§6.5 punto 1) la cita y no la copia. Lleva ya las enmiendas que el cruce de §6.5 punto 1 pidió, más las que salen de la regla "todo hueco obligatorio dice en `requiere` lo que necesita" (§5.1, consecuencia 2, que el test "bien formado" de §5.9 sella): `cota: true` en `ud_muro_final`, `ud_sterrato` y `ud_montana`, cuyos huecos `cota` son obligatorios (hoy las zonas que admiten los dos últimos tienen todas `cota`, así que no cambia ningún par, pero el test fallaba); `cotaKmMin: 3.3` en `ud_esprint_capi`, `ud_montana_media`, `ud_repecho`, `et_media_valle`, `et_media_alto` y en las tres alternativas de `et_media_tendida` (todos sus huecos `cota` obligatorios empiezan en 3,3 km); `cotaCortaMax: 2.9` en la variante con cotas de `ud_circuito`. `relieve` lo piden los siete esqueletos de puerto de montaña (`'montana'`), `et_reina_encadenada` (`'alta'`, porque cuatro puertos pegados solo existen en cordillera) y una alternativa de `et_media_tendida` (`'ondulado'`).

`et_reina_blanda`, con los huecos exactos de la decisión 8: `enlace` en [0; 0,6]; `cota`×[1; 2] en [0,15; 0,6] de [5; 8] km; meta `alto_largo` de [9; 12] km al [6; 7] %; D+ total [1.500; 2.500] con relleno. Es `reina` por `PASS_MIN_KM` (el final mide ≥ 9), cumple V8b (≥ 25 % de la subida a más de 30 km de meta: sus cotas están en [0,15; 0,6]) y está exenta de V8a. El 60/40 de `ROUTE.queenHighDplusShare` y `queenLowDplusRange` se retiran (sección 12): la cola baja de desnivel ya no la sostiene un test sino este esqueleto con su cuota.

Los esqueletos `reina` de vuelta cumplen V8a por construcción: `et_reina_alto_largo`, `et_montana_corta` y `et_cronoescalada` con puerto de meta ≥ 9 km; `et_reina_alto_corto`, `et_reina_encadenada`, `et_reina_cima_cerca` y `et_reina_valle` con al menos dos puertos ≥ 9 km (la `cotaFinal` de `cima_cerca` y `descenso_meta` es uno de ellos). Los nueve esqueletos `media` (`ud_esprint_capi`, `ud_muro_final`, `ud_montana_media`, `ud_repecho`, `nc_ruta`, `et_media_valle`, `et_media_alto`, `et_media_muro`, `et_media_tendida`) mantienen la cota más larga ≤ 8,0 km y `dPlus[1]` ≤ 2.900 (regla 1 de §5.1). Los `llana` cumplen V9 porque no llevan ningún `puerto`.

### 5.4 Las plantillas canónicas

`Skeleton.canonico` es un `Motif[]` literal, uno por esqueleto, que pasa todos los vetos por construcción: es lo que `generateStage` devuelve con `degradado: true` cuando agota `ARCH.colocacion.maxIntentos` 8 (sección 8), lo que la galería pinta primero (sección 16) y lo que `skeletons.test.ts` verifica con `validateMotif`, `verify` y `stageKindOf` sin RNG (§5.9). Lo que "por construcción" significa, para que el test lo mida igual: cada motivo está dentro de los rangos de `ARCH` y respeta los `null` y la `altitud` de la zona de referencia del esqueleto (`validateMotif(m, geo)`, §4.5 reglas 1 a 5); los rangos NUMÉRICOS de la zona (`geo.cota.g`, `geo.puerto.km`) acotan el sorteo `mot` y no la plantilla, porque una plantilla es una carrera concreta y la zona un rango de plausibilidad (el Poggio real sube al 3,7 % y aquí al 4, el suelo de `ARCH.motivo.cota.g`); cada dificultad de primer nivel EMPIEZA dentro de la ventana de su hueco (el test lo comprueba: una plantilla que no respetara sus ventanas enseñaría en la galería una forma que el sorteo nunca produce); los kilómetros suman exactamente la cifra del comentario; cada `descenso` mide `clamp(len·g·10/55, 2, 10)` redondeado al 0,1 (`ARCH.motivo.descenso.kmPorDesnivel`); y las `cotaFinal` respetan las holguras de 0,7 km sobre los cortes 5 y 20 de `FINAL_KIND_CUTS` (decisión 10). Una holgura que hay que tener delante: `emitirPancartas` redondea el km de la cima al entero como `auto()` (`calendar.ts` l. 98, `Math.round(cum)`), y `finalKindOf` corta con `≤` (`finalKind.ts` l. 82), así que un valle de 5,4 km tras una cima en el 284,6 se lee como 5,0 y cae en `cima_cerca`; por eso ninguna plantilla ni ningún rango de meta pisa las franjas (0,5; 1,2), (4,3; 5,7) ni (19,3; 20,7).

Tres constantes de `ARCH.motivo` tienen el valor que estas plantillas necesitan, y la sección 4 ya lo escribe (tabla de §4.2 y §4.5 regla 1), con esta intención: `ARCH.motivo.racimo.km` [10; 60] (Denain y Tro Bro Léon: racimos de 4 sectores de [0,8; 2,2] km con separaciones de [2; 4], o sea de 9,2 km en adelante; los racimos de Roubaix miden de 26 a 40); `ARCH.motivo.circuito.kmVuelta` [1,5; 30] y `.vueltas` [2; 40] (Flèche: 30 km × 2, §4.7; critérium: 2,5 km × 22; Québec 12,6 × 16 y Montréal 12,3 × 17 caen dentro). Cada esqueleto estrecha el circuito con `Slot.params.kmRango` (km de la vuelta) y `vueltasRango`, que es lo que el sorteo respeta; `validateMotif` comprueba solo `ARCH` (§4.5 regla 1) y el `vueltasJitter` de la sección 10 acota al rango del hueco, no al de `ARCH`. §B.3 y las secciones 8, 10 y 12 recogen los mismos tres valores.

Los constructores `E`, `X`, `T`, `C`, `P`, `M`, `D`, `S`, `CAD`, `RAC`, `K` y `META` son funciones de una línea que devuelven un objeto `Motif` y existen solo para que el fichero quepa en una pantalla; el implementador puede inlinear los objetos. `CAD` y `RAC` reciben los hijos (solo dificultades) y sus `hijos.length − 1` separaciones, y calculan `km` como la suma de ambas listas; `K` recibe el km de vuelta, las vueltas, los hijos y `hijos.length` separaciones (el enlace antes de cada hijo; lo que resta hasta el km de vuelta cierra la vuelta). `firma` en `K` es `false` por defecto y solo se pone donde el hueco `circuito` es obligatorio (`ud_circuito`, `nc_ruta`, `ud_criterium`): un motivo de firma que la edición pudiera quitar (el circuito opcional de `ud_muro_final`) contradiría la decisión 20.

```ts
// packages/engine/src/routes/grammar/skeletons.ts (fragmento: constructores y plantillas canónicas)
const suma = (xs: (Motif | number)[]) =>
  xs.reduce<number>((a, x) => a + (typeof x === 'number' ? x : x.km), 0)
const E = (km: number): Motif => ({ kind: 'enlace', km })
const X = (km: number): Motif => ({ kind: 'expuesto', km })
const T = (km: number, g: number): Motif => ({ kind: 'tendida', km, g })
const C = (km: number, g: number): Motif => ({ kind: 'cota', km, g })
const P = (km: number, g: number, firma = false): Motif => ({
  kind: 'puerto',
  km,
  g,
  forma: 'regular',
  firma,
})
const M = (km: number, g: number, adoquin = false): Motif => ({ kind: 'muro', km, g, adoquin })
const D = (km: number): Motif => ({ kind: 'descenso', km, g: -5 })
const S = (
  km: number,
  estrellas: number,
  firme: 'adoquin' | 'tierra' = 'adoquin',
  firma = false,
): Motif => ({ kind: 'sector', km, estrellas, firme, firma })
/** `sep` son los enlaces internos (hijos.length − 1); `km` es la suma de todo. */
const CAD = (hijos: Motif[], sep: number[]): Motif => ({
  kind: 'cadena',
  km: suma(hijos) + suma(sep),
  hijos,
  separaciones: sep,
})
const RAC = (hijos: Motif[], sep: number[]): Motif => ({
  kind: 'racimo',
  km: suma(hijos) + suma(sep),
  hijos,
  separaciones: sep,
})
/** `sep[h]` es el enlace ANTES del hijo h; `kmVuelta − Σ hijos − Σ sep` (≥ 1,5) cierra la vuelta. */
const K = (
  kmVuelta: number,
  vueltas: number,
  hijos: Motif[],
  sep: number[],
  firma = false,
): Motif => ({ kind: 'circuito', km: kmVuelta, vueltas, hijos, separaciones: sep, firma })
/** `km` del meta: en `cima_cerca`, `descenso_meta` y `valle` es `cotaFinal.km` + valle tras la cota; en `muro_meta` es `ARCH.meta.muro.aproxKm` 2 + `cotaFinal.km` (la aproximación va ANTES y la cota muere en la línea); en `alto_*` y `repecho` es `cotaFinal.km`; en `esprint` el llano final; en `sector_meta` sector (`hijos[0]`) + llano. */
const META = (
  meta: MetaKind,
  km: number,
  cotaFinal?: { km: number; g: number },
  hijos?: Motif[],
): Motif => ({ kind: 'meta', meta, km, cotaFinal, hijos, firma: true })

export const CANONICO: Record<SkeletonId, Motif[]> = {
  // ---- un día (16) ----
  ud_esprint: [E(40), X(50), E(20), T(6, 2.5), E(30), X(30), E(20), META('esprint', 4)], // 200 km
  ud_esprint_capi: [E(258.5), C(5.6, 4.1), D(4.2), E(12), C(3.7, 4), D(2.7), META('esprint', 3.3)], // 290 km; Poggio corona a 6,0 (pancarta 284)
  ud_circuito: [E(5.5), K(12, 16, [M(0.4, 10), M(1.0, 8)], [4.9, 4.2], true), META('esprint', 2.5)], // 200 km; último muro a 4,0
  ud_muro_final: [
    E(108.3),
    C(4, 6),
    D(4.4),
    E(20),
    K(30, 2, [M(1.3, 9.6), M(1.3, 8)], [11, 14]),
    META('muro_meta', 3.3, { km: 1.3, g: 9.6 }),
  ], // 200 km; Huy ×3
  ud_muros: [
    E(132.4),
    CAD([M(1.0, 9), M(0.6, 11), M(2.2, 8), M(0.5, 12), M(0.8, 9)], [3, 4, 3, 5]),
    E(25), // 20,1 km
    CAD(
      [M(1.2, 10), M(0.4, 13), M(1.5, 9), M(0.9, 11), M(2.0, 8), M(0.7, 12)],
      [2.5, 3, 4, 2, 3.5],
    ),
    E(20), // 21,7 km
    CAD([M(1.1, 10), M(0.6, 13), M(2.2, 8), M(0.4, 13), M(1.0, 9)], [3, 2.5, 4, 3]),
    META('esprint', 13),
  ], // 17,8 km; 250 km; 16 muros, último a 13
  ud_muros_adoquin: [
    E(132.7),
    S(1.5, 3),
    E(12),
    S(2.0, 3),
    E(20),
    CAD(
      [M(2.2, 8, true), M(0.4, 13, true), M(0.6, 12, true), M(1.0, 9), M(0.5, 10)],
      [3, 4, 3.5, 4],
    ),
    E(18),
    S(1.2, 2),
    E(15), // 19,2 km; 3 de 5 adoquinados
    CAD([M(1.0, 9, true), M(0.8, 10), M(2.2, 8, true), M(0.4, 13, true), M(1.0, 8)], [3, 5, 3, 4]),
    META('esprint', 13),
  ], // 20,4 km; 255 km
  ud_sterrato: [
    E(67.4),
    C(4, 6),
    D(4.4),
    RAC(
      [S(2.1, 3, 'tierra'), S(3.5, 3, 'tierra'), S(1.8, 2, 'tierra'), S(2.6, 3, 'tierra')],
      [3, 4, 3],
    ),
    E(15),
    C(3.5, 6),
    D(3.8),
    E(6), // 20,0 km
    RAC(
      [
        S(3.7, 3, 'tierra'),
        S(3.7, 3, 'tierra'),
        S(3.0, 3, 'tierra'),
        S(2.4, 2, 'tierra'),
        S(3.2, 3, 'tierra'),
      ],
      [2, 2, 5, 4],
    ), // 29,0 km
    E(10),
    C(5, 5.5),
    D(5),
    E(5),
    M(0.8, 12),
    E(6),
    RAC(
      [S(2.5, 3, 'tierra'), S(1.1, 2, 'tierra'), S(3.0, 3, 'tierra'), S(1.5, 2, 'tierra')],
      [3, 4, 2.5],
    ),
    E(8), // 17,6 km
    META('muro_meta', 2.5, { km: 0.5, g: 16 }),
  ], // 213 km; Santa Caterina
  ud_adoquin: [
    X(79.2),
    E(36),
    RAC(
      [S(2.2, 3), S(2.4, 2), S(2.3, 5, 'adoquin', true), S(2.0, 2), S(3.0, 4), S(2.0, 2)],
      [4, 3, 5, 4, 3],
    ),
    E(20), // 32,9 km; Arenberg
    RAC(
      [
        S(2.5, 3),
        S(1.8, 3),
        S(3.0, 5, 'adoquin', true),
        S(1.7, 2),
        S(2.4, 3),
        S(1.5, 2),
        S(2.7, 4),
      ],
      [3, 2, 4, 3, 4, 3],
    ),
    E(24), // 34,6 km; Mons-en-Pévèle
    RAC(
      [S(1.4, 3), S(2.0, 3), S(1.9, 2), S(2.1, 5, 'adoquin', true), S(1.8, 3), S(1.0, 2)],
      [3, 4, 3, 4, 5],
    ), // 29,2 km; Carrefour de l'Arbre
    META('sector_meta', 2.1, undefined, [S(0.3, 1)]),
  ], // 258 km; 20 sectores (19 en tres racimos más el de meta), 40,0 km de adoquín
  ud_adoquin_ligero: [
    E(73.5),
    RAC([S(1.2, 2), S(0.8, 2), S(1.5, 3), S(1.0, 2)], [3, 4, 3]),
    E(20),
    M(0.6, 9),
    E(15), // 14,5 km
    RAC([S(1.8, 3), S(1.0, 2), S(2.2, 3), S(0.9, 2), S(1.4, 3)], [3, 4, 3, 4]),
    E(22), // 21,3 km
    RAC([S(1.5, 3), S(1.1, 2), S(0.8, 2), S(1.3, 3)], [3, 2.5, 3]),
    E(6),
    M(0.9, 10),
    E(4),
    META('esprint', 4),
  ], // 13,2 km; 195 km; 13 sectores; último muro a 8
  ud_montana: [
    E(98),
    P(9.0, 6.2),
    D(10),
    E(20),
    P(13, 6.6, true),
    D(10),
    E(37),
    C(4, 7),
    D(5.1),
    E(19.5),
    C(4.2, 7),
    D(5.3),
    E(1.5),
    META('descenso_meta', 8.4, { km: 2.7, g: 7.2 }),
  ], // 245 km; Como: Ghisallo (8,6 → 9,0), Sormano, Civiglio (9,7 → 7), San Fermo a 5,7
  ud_montana_media: [
    E(80.5),
    C(6, 6),
    D(6.5),
    E(20),
    C(4.5, 6.5),
    D(5.3),
    E(18),
    M(1.2, 10),
    E(12),
    C(5, 6),
    D(5.5),
    E(15),
    META('descenso_meta', 15.5, { km: 3.5, g: 8 }),
  ], // 195 km
  ud_repecho: [
    E(70),
    C(5, 6),
    D(5.5),
    E(30),
    C(4, 6.5),
    D(4.7),
    E(25),
    C(3.5, 6),
    D(3.8),
    E(36.5),
    META('repecho', 2.0, { km: 2.0, g: 6 }),
  ], // 190 km
  ud_montana_alto: [
    E(93.5),
    P(15, 6.5),
    D(10),
    E(30),
    META('alto_largo', 21.5, { km: 21.5, g: 7 }),
  ], // 170 km; Ventoux por Bédoin
  ud_criterium: [E(2.5), K(2.5, 22, [], [], true), META('esprint', 2.5)], // 60 km
  nc_ruta: [E(47.5), K(20, 8, [C(3.5, 4), M(1.0, 8)], [3.0, 11.0], true), META('esprint', 2.5)], // 210 km; media: 1.760 m en dificultades, unos 2.720 con relleno < 2.900; último muro a 4,0
  nc_crono: [E(20), C(2.5, 4), D(2), E(7.5), META('esprint', 3)], // 35 km
  // ---- etapa (16) ----
  et_llana: [E(60), T(8, 2.5), E(40), T(6, 2), E(62), META('esprint', 4)], // 180 km
  et_llana_viento: [E(52), X(40), E(15), X(35), E(10), X(15), META('esprint', 3)], // 170 km
  et_media_valle: [
    E(72),
    C(5, 6),
    D(5.5),
    E(20),
    C(7, 5.5),
    D(7),
    E(18),
    M(1.5, 9),
    E(10),
    META('valle', 29, { km: 4, g: 6.5 }),
  ], // 175 km; última a 25
  et_media_alto: [
    E(53.5),
    C(6, 5),
    D(5.5),
    E(44.5),
    C(8, 6),
    D(8.7),
    E(26.8),
    META('alto_corto', 7, { km: 7, g: 7 }),
  ], // 160 km; plantilla 4 del mapa 07 §5
  et_media_muro: [
    E(108.7),
    CAD([M(1.0, 10), M(0.7, 12), M(1.8, 8), M(0.5, 13)], [3, 4, 3.5]),
    E(20), // 14,5 km
    CAD([M(1.2, 9), M(0.6, 14), M(1.5, 9)], [3, 4.5]),
    E(8),
    META('muro_meta', 3.0, { km: 1.0, g: 12 }),
  ], // 10,8 km; 165 km; muro de meta 1,0 → `muro`
  et_media_tendida: [
    E(30),
    T(20, 2.5),
    E(25),
    T(12, 3),
    E(20),
    C(5, 5),
    D(4.5),
    E(25.5),
    META('valle', 28, { km: 4, g: 5 }),
  ], // 170 km
  et_reina_alto_largo: [
    E(52.5),
    P(12, 7),
    D(10),
    E(20),
    P(17, 7.3),
    D(10),
    E(8),
    P(10, 7.8),
    D(10),
    E(9.7),
    META('alto_largo', 15.8, { km: 15.8, g: 7.9 }),
  ], // 175 km; plantilla 3 (Pirineos, 4.800 m)
  et_reina_alto_corto: [
    E(79.1),
    P(11, 7),
    D(10),
    E(20),
    P(14, 6.5),
    D(10),
    E(15),
    META('alto_corto', 5.9, { km: 5.9, g: 8.5 }),
  ], // 165 km; Planche
  et_reina_cima_cerca: [
    E(75),
    P(10, 7),
    D(10),
    E(22),
    P(13, 6.8),
    D(10),
    E(15),
    META('cima_cerca', 15, { km: 12, g: 7.5 }),
  ], // 170 km; cima a 3
  et_reina_valle: [
    E(57),
    P(9, 6.5),
    D(10),
    E(15),
    P(12, 7),
    D(10),
    E(15),
    P(10, 7.5),
    D(10),
    E(12),
    META('descenso_meta', 25, { km: 11, g: 7 }),
  ], // 185 km; cima a 14
  et_reina_encadenada: [
    E(20),
    P(14, 7.5),
    D(10),
    E(6),
    P(12, 8),
    D(10),
    E(6),
    P(14, 7.5),
    D(10),
    E(6),
    P(11, 8),
    D(10),
    E(4),
    META('alto_corto', 7, { km: 7, g: 8.5 }),
  ], // 140 km; Dolomitas (puertos de [9; 14] km, la firma de la zona)
  et_montana_corta: [
    E(20),
    P(16, 7),
    D(10),
    E(8),
    P(20, 6.5),
    D(10),
    E(8),
    META('alto_largo', 18, { km: 18, g: 7 }),
  ], // 110 km
  et_reina_blanda: [
    E(50),
    C(6, 5.5),
    D(6),
    E(30),
    C(7, 6),
    D(7.6),
    E(42.4),
    META('alto_largo', 11, { km: 11, g: 6.5 }),
  ], // 160 km; 2.138 m con relleno
  et_crono: [E(15), C(2.5, 4), D(2), E(5.5), META('esprint', 3)], // 28 km
  et_prologo: [E(4), META('esprint', 2)], // 6 km
  et_cronoescalada: [E(7), META('alto_largo', 11, { km: 11, g: 7.5 })], // 18 km
}

/** `nc_ruta` en zonas sin cota ≥ 3,3 km (§5.7): mismo esqueleto con `kind: 'clasica'`, `label: 'Circuit'`, `finalKind` sin declarar. */
export const NC_RUTA_CLASICA: Motif[] = [
  E(15),
  K(16, 12, [M(1.0, 9), M(0.5, 10)], [4, 7.5], true),
  META('esprint', 3),
] // 210 km; último muro a 6,0
// Muros sin adoquín y al ≤ 10 %: la plantilla vale en las tres zonas donde `skeletonFor` la usa (`flandes`, `francia_norte`, `bretana`: cota nula o hasta 3,0 km, §6.2),
// y `bretana` tiene `muro.adoquin` falso (validateMotif regla 4 rechazaría allí un muro adoquinado).
```

Comprobaciones hechas a mano sobre estas plantillas, que el test de §5.9 repite: `ud_montana` tiene su cota más larga en 13 km (`reina`), no muere arriba, su última cota mide 2,7 km y corona a 5,7 (pancarta en el 239, 6,0 leídos: `valle_corto`, V5), sus dos puertos y Civiglio suman 26 de sus 32,9 km de subida a más de 30 km de meta (V8b) y sus dificultades empiezan en 0,40, 0,56, 0,80 y 0,92 de la etapa (ventanas [0,4; 0,85] y [0,8; 0,97]); `ud_esprint_capi` corona el Poggio en el 284,0 y la pancarta cae en el 284: 6,0 km de valle, `valle_corto`; `nc_ruta` suma 1.760 m en dificultades (8 vueltas × 220 m) y unos 960 de relleno estimado (174 km × 5,5), 2.720 en total, por debajo de 2.900, y su último muro corona a 4,0 km (`cima_cerca`); `et_media_alto` tiene su cota más larga en 8,0 (0,5 bajo `PASS_MIN_KM`) y 1.270 m de subida más 686 de relleno; `et_reina_alto_largo` acumula 4.109 m en puertos más 496 de relleno estimado (4.605 total, contra 4.800 de la plantilla 3 del mapa 07 §5) y tiene 34,5 de sus 54,8 km de subida a más de 30 km de meta (V8b); `et_reina_blanda` da 2.138 m con relleno, dentro de [1.500; 2.500]; `ud_adoquin` mide 258,0 (79,2 + 36 + 32,9 + 20 + 34,6 + 24 + 29,2 + 2,1) con 19 sectores en tres racimos más el de meta (§4.7 escribe un Roubaix de cuatro racimos y 27 sectores y cita esta canónica con sus 20; los 30 reales se alcanzan con `racimo`×4 y `sector`×8). Las concesiones a los huecos de §4.2 y §4.4 se anotan en la propia línea (Ghisallo 8,6 → 9,0; Civiglio 9,7 → 7 con bajada 5,3 en vez de 7,4; Colle Aperto 1,2 → 1,3 y a 3 km → 5,7 en la alternativa de Bérgamo, porque `unDiaUltimaCota.km` empieza en 1,3 y `ARCH.meta.descensoMeta.valle` en 5,7).

### 5.5 Alternativas declaradas (rotación de nivel 2)

`Skeleton.alternativas?: Alternativa[]` es la rotación DECLARADA de nivel 2 (decisión 22), con el tipo y la mecánica de la sección 10 (§10.3) que la sección 3 recoge (§3.3): una alternativa NO es una instancia literal que se copie a todas las carreras del esqueleto (eso sería el clon que V12 caza), sino un juego de RANGOS por hueco de firma (`slots`, por índice de hueco con `firma: true`), un rango de `cotaFinal` (`metaParams`) si la opción cambia el final, y una plantilla literal (`canonico`) para la galería, el degradado y `skeletons.test.ts`. La opción de una temporada es `opcionDe(sk, raceId, season) = (hashInt(`alt|${raceId}`) + season) % (1 + alternativas.length)` sobre `[sk.canonico, ...sk.alternativas.map((a) => a.canonico)]`, sin consumir tirada, y `instanciarFirma` (sección 8, §8.3) tira los huecos de firma dentro de `ARCH.motivo.* ∩ (alternativa.slots?.[k] ?? slot.params) ∩ geo` y la `cotaFinal` de la meta con `rangoCotaFinal(sk, alternativa)`, sin `geo` salvo los techos de altitud (regla 2 de §5.1). Con el valor por defecto de D7 (`activa`, `nivel` 1) el nivel efectivo de un esqueleto que declara alternativas es 2 (`nivelEfectivo`, §10.3): estas dos rotan desde el primer día. Lo que la opción conserva del esqueleto es su identidad (decisión 20): `kind`, `label`, `meta` (salvo que la opción declare otra con el mismo `finalKindDe`), `finalKind` y `timeTrial`; `skeletons.test.ts` lo sella pasando cada `canonico` de alternativa por `validateMotif`, `verify`, `stageKindOf` y `finalKindOf` (§5.9). Los rangos son los que §10.3 adopta, derivados de estas plantillas con ± 10 %:

```ts
// packages/engine/src/routes/grammar/skeletons.ts (fragmento: las dos rotaciones declaradas)
// Alternativa (§10.3, §3.3): { nombre, meta?, metaParams?: { kmRango?, gRango? }, slots?: Record<índice de hueco con firma, SlotParams>, canonico }
// ud_montana: slots = [0 enlace, 1 puerto×[2; 3] (firma), 2 cota×[1; 2]]
SKELETONS.ud_montana.alternativas = [
  {
    nombre: 'Bérgamo',
    slots: { 1: { kmRango: [10.5, 12.5], gRango: [7.5, 8.5] } }, // el puerto de firma es la Valcava (11,6 × 8); la canónica, Sormano 13 × 6,6
    // Roncola, Valcava, Ganda; Colle Aperto (1,2 km al 7 %, subido a 1,3, el suelo de unDiaUltimaCota.km) a 5,7 km (real 3, subido al suelo de descensoMeta.valle)
    canonico: [
      E(116),
      P(9.4, 6.6),
      D(10),
      E(20),
      P(11.6, 8, true),
      D(10),
      E(20),
      P(9.2, 7.3),
      D(10),
      E(10),
      C(3.0, 7),
      D(3.8),
      E(10),
      META('descenso_meta', 7.0, { km: 1.3, g: 7 }),
    ], // 250 km
  },
]
SKELETONS.et_reina_alto_largo.alternativas = [
  {
    nombre: 'Angliru',
    metaParams: { kmRango: [12, 13], gRango: [8.5, 9.5] }, // ∩ ARCH.meta.altoLargo.g [6; 12] = [8,5; 9,5]: SUSTITUYE al g [6; 9] del esqueleto, no se interseca con él (regla 2 de §5.1)
    // 12,5 km al 9 % (real 9,8; la plantilla usa 9, dentro de gRango; 12,5 × 9 × 10 = 1.125 m ≤ puertoDplusMax.media 1.300)
    canonico: [
      E(52.5),
      P(12, 7),
      D(10),
      E(20),
      P(14, 7),
      D(10),
      E(18),
      P(10, 7.5),
      D(10),
      E(6.0),
      META('alto_largo', 12.5, { km: 12.5, g: 9 }),
    ], // 175 km
  },
  {
    nombre: 'Lagos',
    metaParams: { kmRango: [11.5, 12.8], gRango: [6.8, 7.6] },
    // Lagos de Covadonga: 12,2 km al 7,2 %
    canonico: [
      E(52.5),
      P(12, 7),
      D(10),
      E(20),
      P(14, 7),
      D(10),
      E(18),
      P(10, 7.5),
      D(10),
      E(6.3),
      META('alto_largo', 12.2, { km: 12.2, g: 7.2 }),
    ], // 175 km
  },
]
```

Los 30 esqueletos restantes no declaran alternativas: su variación entre ediciones es la de nivel 1 (motivos no firma, km ± 6 %, vueltas ± 1, motivo opcional y dibujo), que la sección 10 escribe. Declarar una alternativa nueva cambia la opción de la temporada 0 de todas las carreras del esqueleto (§10.3) y se trata como un cambio de catálogo.

### 5.6 Pesos: base, sesgo de terreno, clase y zona

El peso de un candidato es el producto de cuatro factores, y cada factor vive en un sitio distinto para que se pueda editar como dato. Esta es la fórmula única del documento: la sección 6 (§6.5 punto 4) la cita con sus cuatro factores y solo pone el último, la sección 8 (`elegirEsqueleto`, §8.2) la usa tal cual y el comentario de `candidatos` en §3.3 la repite:

`peso(id) = SKELETONS[id].pesoBase × SESGO_TERRENO[terrain][id] (1 en etapas de vuelta y de edición) × ARCH.pesoPorClase[id][raceClass] × (geo.pesos[id] ?? 1)`

- **`pesoBase`** (columnas de §5.2 y §5.3): enteros, tomados de las columnas de pesos de banco §5.2 (`muros_encadenados` 0,55 en `flandes`, `montana_un_dia` 0,6 en `alpes`, `circuito_cotas` 0,3 a 0,6 donde no hay puertos) y de geografía §4.6 y §8 (`montana × un_dia × WT`: 0,9 / 0,08 / 0,02), normalizados a que el esqueleto más común de cada familia valga entre 20 y 30 y el raro entre 6 y 12. Son un juicio, como la tabla geográfica (decisión 16), y la galería (sección 16) es el instrumento para corregirlos.
- **`SESGO_TERRENO`**: la traducción de `RaceRow.terrain` (seis valores, `featureProfile.ts` l. 21; reparto de las 178 carreras de un día de tabla: hilly 83, flat 60, cobbles 19, mountain 10, classic 5, itt 1, mapa 02 §1) a candidatos de un día. Es sesgo y nunca orden (decisión de la sección 3): dice qué esqueletos entran en el sorteo y con qué multiplicador, y si la zona no admite ninguno (`requiere`), se baja un escalón por `ESCALON_TERRENO`. Solo aplica a `role: 'un_dia'` de carreras de equipos; los nacionales tienen rama propia (§5.7) y las etapas de vuelta entran por `StageRole`.

| `terrain`  | Candidatos (multiplicador)                                                                                                                                   | `ESCALON_TERRENO` si ninguno cabe en la zona                                                                                                                                                                                                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flat`     | `ud_esprint` ×1, `ud_esprint_capi` ×0,5, `ud_adoquin_ligero` ×0,5                                                                                            | `null` (siempre cabe `ud_esprint`)                                                                                                                                                                                                                                                                                                           |
| `hilly`    | `ud_muros` ×1, `ud_circuito` ×1, `ud_muro_final` ×1, `ud_montana_media` ×1, `ud_repecho` ×1, `ud_esprint_capi` ×0,5, `ud_muros_adoquin` ×1, `ud_sterrato` ×1 | `flat`                                                                                                                                                                                                                                                                                                                                       |
| `classic`  | `ud_muros` ×1, `ud_muros_adoquin` ×1, `ud_circuito` ×0,5, `ud_muro_final` ×1, `ud_repecho` ×0,5, `ud_sterrato` ×1                                            | `hilly` (`classic`, 5 filas, es un subconjunto de `hilly`, 83: se baja al conjunto ancho y no al revés)                                                                                                                                                                                                                                      |
| `cobbles`  | `ud_adoquin` ×1, `ud_adoquin_ligero` ×1, `ud_muros_adoquin` ×1                                                                                               | `classic` (19 de las 20 filas `cobbles` caen en zonas con `adoquin ≥ 2` o `sterrato`, test (d) de §6.8; Veneto Classic entra por el `sterrato` que §6.2 da a `italia_norte`. La vigésima, `race-leon`, está en `meseta` con `duda: true` (§6.3): allí ningún candidato cabe y baja a `classic`. El test de §5.9 imprime cuántas filas bajan) |
| `mountain` | `ud_montana` ×4, `ud_montana_media` ×1, `ud_montana_alto` ×1, `ud_circuito` ×0,25                                                                            | `hilly` (un `mountain` en Dinamarca da `ud_circuito` con muros y se anota en `arch.frase`)                                                                                                                                                                                                                                                   |
| `itt`      | `nc_crono` ×1                                                                                                                                                | `null` (siempre cabe)                                                                                                                                                                                                                                                                                                                        |

Con `ud_repecho` y `ud_esprint_capi` en `hilly`, una carrera de colinas en una de las 10 zonas con `muro: null` de §6.2 (`alpes`, `pirineos`, `dolomitas`, `meseta`, `balcanes`, `anatolia`, `andes`, `cono_sur`, `golfo`, `africa_llana`) tiene siempre `ud_montana_media` y `ud_repecho` (las diez tienen `cota` con `km[1] ≥ 3,3`) y, en WT, Pro y .1, también `ud_esprint_capi`. `ud_circuito` solo entra con su variante de cotas, cuyos hijos miden [2,5; 2,9] km para seguir siendo `clasica` (`cotaCortaMax: 2.9`), y eso solo es posible donde la cota de la zona baja de 2,9 km: `andes`, `golfo` y `africa_llana` (`cota.km[0]` 2,5); en las otras siete (`cota.km[0]` de 3 o 4) `admite` la rechaza. Son tres candidatos en toda .1 o superior de esas diez zonas y en toda .2 de las tres de cota corta, y dos en una .2 de las siete restantes: Turquía (11 carreras, 8 de ellas .2, mapa 02 §10) tiene en sus .2 de colinas `ud_montana_media` y `ud_repecho`, dos familias de final distintas (valle y repecho) en vez de dos variantes del mismo molde, frente a un solo molde sin `ud_repecho`. La sección 13 añade a las bandas de variedad "≥ 3 esqueletos distintos por (zona, `terrain`) con ≥ 4 carreras" para que el censo diga si con eso basta.

- **`ARCH.pesoPorClase`**: la tabla entera, esqueleto × clase (`RaceClass`, `packages/shared/src/contracts.ts` l. 48; la lista `RACE_CLASSES` está en `packages/engine/src/routes/uci.ts` l. 14). Un 0 es un veto de clase; los decimales son rarezas. La regla que la tabla obedece y el test de §5.9 sella: si `SKELETONS[id].km[0] > ARCH.km.maxPorClase[clase]` la celda es 0, porque V13 (decisión 24) veta `km > maxPorClase` y una .2 de 200 km sería vetada en los 8 intentos (así `ud_montana`, `ud_adoquin` y `ud_esprint_capi` son 0 en .2; `ud_esprint_capi` cabe en .1 porque su `km[0]` 200 iguala el techo 200). `ud_montana_alto` vale 60 × 0,02 = 1,2 frente a 48 + 12 + 5 de sus compañeros de terreno `mountain` en .1, o sea el 1,8 % de esos sorteos, y con 10 filas `mountain` en todo el calendario lo esperado es que no aparezca ninguna: existe para la galería y para D1. Las columnas `NC` son 0 en todo esqueleto de equipos; `nc_ruta` es 1 solo en `NC`, y `nc_crono` es 1 en las cinco clases porque es la crono de un día del calendario entero (los 266 `nc-*-itt` y `race-chrono`): los 532 nacionales (mapa 02 §3) solo pueden salir de `nc_ruta` y `nc_crono`, y ninguna carrera de equipos puede salir de `nc_ruta`.

| Esqueleto                                                                                                                                                                       | WT  | Pro | .1   | .2   | NC  | Razón                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ---- | ---- | --- | ---------------------------------------------------------------- |
| `ud_esprint`, `ud_circuito`, `ud_muros`, `ud_adoquin_ligero`, `ud_montana_media`, `ud_repecho`                                                                                  | 1   | 1   | 1    | 1    | 0   | existen en todas las clases (mapa 07 §4.1)                       |
| `ud_esprint_capi`                                                                                                                                                               | 1   | 1   | 0,5  | 0    | 0   | `km[0]` 200: cabe en .1 por el techo justo; una .2 (180) no      |
| `ud_muro_final`, `ud_muros_adoquin`                                                                                                                                             | 1   | 1   | 1    | 0,5  | 0   | en .2 la mitad de frecuentes: 140 a 180 km                       |
| `ud_montana`                                                                                                                                                                    | 1   | 1   | 1    | 0    | 0   | `km[0]` 200 > `maxPorClase['2']` 180                             |
| `ud_sterrato`                                                                                                                                                                   | 1   | 1   | 0,5  | 0,25 | 0   | tres carreras reales                                             |
| `ud_adoquin`                                                                                                                                                                    | 1   | 1   | 0,5  | 0    | 0   | `km[0]` 200 > 180; `adoquin ≥ 2` lo exige `requiere`             |
| `ud_montana_alto`                                                                                                                                                               | 0   | 0   | 0,02 | 0    | 0   | decisión 37 y D1                                                 |
| `ud_criterium`                                                                                                                                                                  | 0   | 0   | 0    | 0    | 0   | D5 (peso 0 hasta decisión del dueño)                             |
| `nc_ruta`                                                                                                                                                                       | 0   | 0   | 0    | 0    | 1   | solo campeonatos                                                 |
| `nc_crono`                                                                                                                                                                      | 1   | 1   | 1    | 1    | 1   | toda crono de un día                                             |
| `et_llana`, `et_llana_viento`, `et_media_valle`, `et_media_alto`, `et_media_tendida`, `et_reina_alto_corto`, `et_reina_cima_cerca`, `et_reina_blanda`, `et_crono`, `et_prologo` | 1   | 1   | 1    | 1    | 0   |                                                                  |
| `et_media_muro`, `et_reina_valle`                                                                                                                                               | 1   | 1   | 1    | 0,7  | 0   |                                                                  |
| `et_reina_alto_largo`, `et_montana_corta`                                                                                                                                       | 1   | 1   | 0,7  | 0,4  | 0   | los finales de 15 a 22 km son de gran vuelta y WT (mapa 07 §4.3) |
| `et_reina_encadenada`, `et_cronoescalada`                                                                                                                                       | 1   | 0,7 | 0,4  | 0    | 0   | Dolomitas y Peyragudes no bajan de Pro                           |

- **`geo.pesos`** (`GeoSignature.pesos`): multiplicador por zona con 1 por defecto. Los valores viven en la columna `pesos` de la tabla de §6.2 y SOLO ahí (`flandes` sube `ud_muros_adoquin` y `ud_muros`, `italia_centro` `ud_sterrato`, `francia_norte` `ud_adoquin`, `andes` `et_reina_valle`); esta sección no los repite para que no haya dos tablas del mismo campo.

### 5.7 Cómo se elige un esqueleto (subflujo `arch|raceId|i`)

Una sola tirada por etapa (una por carrera de un día), sobre el subflujo de la tabla de la sección 10 (§10.4): `routeRng('arch|' + id)`, donde `id` es la clave de etapa `${raceId}|${stageIndex}` (`stageIndex` 1 en un día), sin `season` y sin intento (decisión 22): el esqueleto es identidad. La regla 1 (reina blanda) tira de ese mismo flujo, antes que el sorteo por pesos. El sorteo es proporcional a `peso(id)` de §5.6 sobre los candidatos, y los candidatos salen de esta función pura, que vive en `skeletons.ts` junto al catálogo y a las tres tablas cerradas que usa (`ESCALON_ROLE`, `ESCALON_TERRENO`, `POR_TERRENO_EDICION`). `ESCALON_ROLE` es la tabla de degradación de papeles de la decisión 12 y la ÚNICA del documento: la sección 6 (§6.5 punto 2) la cita sin repetirla, y la sección 3 (§3.3) y la 8 (`elegirEsqueleto`, §8.2) también. Su función se llama `degradarPapel(role)` y vive en `skeletons.ts`, que es el nombre y el sitio que ya usan las secciones 2, 3 y 8; `degradar(relieve)` sigue siendo la cadena de relieve de `geo.ts` (§3.4) y `degradarMotivo(kind, geo)` la de huecos (§8.5): tres funciones, tres nombres. §6.5 punto 2 usa los mismos tres nombres.

```ts
/** Siempre hacia abajo: el destino nunca tiene un final en alto ni un puerto que el origen no tuviera (test de §5.9). */
export const ESCALON_ROLE: Record<StageRole, StageRole | null> = {
  reina_alto: 'media_alto',
  reina_valle: 'media',
  reina_encadenada: 'media_alto',
  montana_corta: 'media_alto',
  media_alto: 'media_muro',
  media_muro: 'media',
  media: 'llana',
  llana_viento: 'llana',
  cronoescalada: 'cri',
  llana: null,
  cri: null,
  prologo: null,
}
export function degradarPapel(role: StageRole): StageRole | null {
  return ESCALON_ROLE[role]
}
/** cobbles → classic → hilly → flat; mountain → hilly; flat e itt no bajan. */
export const ESCALON_TERRENO: Record<RouteTerrain, RouteTerrain | null> = {
  cobbles: 'classic',
  classic: 'hilly',
  hilly: 'flat',
  mountain: 'hilly',
  flat: null,
  itt: null,
}
/** Etapas de edición sin rasgos (§5.8): candidatos por `EditionTerrain`, y el papel al que se degrada si ninguno cabe. */
export const POR_TERRENO_EDICION: Record<EditionTerrain, { ids: SkeletonId[]; papel: StageRole }> =
  {
    flat: { ids: ['et_llana', 'et_llana_viento'], papel: 'llana' },
    hilly: {
      ids: ['et_media_valle', 'et_media_alto', 'et_media_muro', 'et_media_tendida'],
      papel: 'media',
    },
    mountain: {
      ids: [
        'et_reina_alto_largo',
        'et_reina_alto_corto',
        'et_reina_cima_cerca',
        'et_reina_valle',
        'et_montana_corta',
      ],
      papel: 'reina_alto',
    },
    itt: { ids: ['et_crono', 'et_prologo'], papel: 'cri' },
    cobbles: { ids: ['ud_adoquin_ligero'], papel: 'llana' },
  }
const POR_PAPEL: Record<StageRole, SkeletonId[]> = {
  llana: ['et_llana'],
  llana_viento: ['et_llana_viento'],
  media: ['et_media_valle', 'et_media_tendida'],
  media_alto: ['et_media_alto'],
  media_muro: ['et_media_muro'],
  reina_alto: ['et_reina_alto_largo', 'et_reina_alto_corto'],
  reina_valle: ['et_reina_valle', 'et_reina_cima_cerca'],
  reina_encadenada: ['et_reina_encadenada'],
  montana_corta: ['et_montana_corta'],
  cri: ['et_crono'],
  prologo: ['et_prologo'],
  cronoescalada: ['et_cronoescalada'],
}

export type Peticion = Pick<
  StageRequest,
  'role' | 'terrain' | 'geo' | 'raceClass' | 'format' | 'km' | 'routeSource'
>
/** La fórmula de §5.6; `terrain` null en etapas de vuelta y de edición, donde el sesgo vale 1. Nunca devuelve 0 para un id que `cabe`: el sesgo solo se lee para ids de SESGO_TERRENO[terrain]. */
const peso = (id: SkeletonId, terrain: RouteTerrain | null, req: Peticion): number =>
  SKELETONS[id].pesoBase *
  (terrain === null ? 1 : SESGO_TERRENO[terrain][id]!) *
  ARCH.pesoPorClase[id][req.raceClass] *
  (req.geo.pesos[id] ?? 1)

/** Las tres condiciones de candidato. Exportada porque `elegirEsqueleto` (sección 8, §8.2 paso 1 bis) la usa para la atadura de `RACE_REGION`: una sola definición para los dos. */
export function cabe(id: SkeletonId, req: Peticion): boolean {
  const sk = SKELETONS[id]
  return (
    admite(sk.requiere, req.geo) &&
    ARCH.pesoPorClase[id][req.raceClass] > 0 &&
    sk.km[0] <= ARCH.km.maxPorClase[req.raceClass]
  )
}

export function candidatos(req: Peticion): { id: SkeletonId; peso: number }[] {
  const con = (ids: SkeletonId[], terrain: RouteTerrain | null) =>
    ids.filter((id) => cabe(id, req)).map((id) => ({ id, peso: peso(id, terrain, req) }))
  const porPapel = (role0: StageRole) => {
    let role: StageRole | null = role0
    while (role !== null) {
      const out = con(POR_PAPEL[role], null)
      if (out.length > 0) return out
      role = ESCALON_ROLE[role]
    }
    throw new Error(`candidatos: ningún esqueleto de etapa cabe para ${role0} en ${req.geo.zona}`) // imposible: et_llana no requiere nada
  }
  if (req.raceClass === 'NC')
    return [{ id: req.terrain === 'itt' ? 'nc_crono' : 'nc_ruta', peso: 1 }] // los 532 nacionales, sin sorteo
  if (req.routeSource === 'edicion') {
    const fila = POR_TERRENO_EDICION[req.terrain as EditionTerrain]
    const ids = fila.ids.filter(
      (id) =>
        (id !== 'et_montana_corta' || req.km <= 140) &&
        (id !== 'et_prologo' || req.km <= 8) &&
        (id !== 'et_crono' || req.km > 8),
    )
    const out = con(ids, null)
    return out.length > 0 ? out : porPapel(fila.papel) // mountain en flandes: reina_alto → media_alto → media_muro (§5.8)
  }
  if (req.role === 'un_dia') {
    let terrain: RouteTerrain | null = req.terrain
    while (terrain !== null) {
      const out = con(Object.keys(SESGO_TERRENO[terrain]) as SkeletonId[], terrain)
      if (out.length > 0) return out
      terrain = ESCALON_TERRENO[terrain]
    }
    throw new Error(
      `candidatos: ningún esqueleto de un día cabe en ${req.geo.zona} con clase ${req.raceClass}`,
    ) // imposible: ud_esprint no requiere nada y pesa > 0 en las cuatro clases
  }
  return porPapel(req.role)
}
```

Los dos `throw` existen para que un catálogo mal editado sea un fallo de test con mensaje y no un bucle sin fin; el test de §5.9 sobre todas las filas del calendario y las cinco clases sella que hoy no se alcanzan. Tres reglas completan la elección:

1. **La reina blanda no compite por peso.** Si `role` empieza por `reina_` (o la etapa de edición es `mountain`), `req.format !== 'gran-vuelta'` (en una gran vuelta no se tira ni se consume tirada: sus reinas van por peso y la de la tercera semana tiene que ser de verdad; sección 7 §7.2, sección 8 §8.2 punto 3) y `SKELETONS.et_reina_blanda` cabe en la zona, ANTES del sorteo por pesos se tira `rand() < ARCH.reina.blandaShare[geo.relieve]` (media 0,25; montana 0,25; alta 0,10; 0 en llano y ondulado, donde no hay reina) y si sale, el esqueleto es `et_reina_blanda`. Así la cuota es exactamente la de la decisión 8 y no depende de cuántos compañeros tenga el papel. Es una probabilidad por etapa, con el `rng` del subflujo `arch` de la etapa, no una cuota por vuelta: no hay redondeo ni estado entre etapas.
2. **`nc_ruta` decide su `kind` por la zona.** `skeletonFor(id, geo)` devuelve `SKELETONS[id]` salvo para `nc_ruta`, donde si `geo.cota === null || geo.cota.km[1] < 3.3` devuelve una copia con `kind: 'clasica'`, `finalKind` sin declarar, el hueco `cota` con `n: [0, 0]` y `canonico: NC_RUTA_CLASICA` (`label` sigue siendo `Circuit`). Es la única excepción a "un `kind` por esqueleto" y existe porque los 133 campeonatos comparten un solo identificador para el circuito nacional: un nacional belga sale `clasica` con muros y sectores y uno colombiano `media` con una cota de 5 km, que es la promesa de `motor.md` §V.3. La petición de un nacional la construye `nationalChampionships` (`calendar.ts` l. 316-362; las cuatro pruebas en l. 351-360, con `itt(38)` e `itt(30)` para las cronos y `classic(180)` y `classic(220)` para las rutas, sin `RaceRow`), y esta regla fija los dos campos que la rama `NC` de `candidatos` lee: `raceClass: 'NC'` en las cuatro, `terrain: 'itt'` en `nc-*-itt` y `nc-*-u23-itt` y `terrain: 'classic'` en `nc-*-road` y `nc-*-u23-road` (el terreno que el código de hoy ya les da). `role` es `'un_dia'` en las cuatro, porque `StageRequest.role` es `StageRole | 'un_dia'` (§3.7); `'un_dia_u23'` es un `KmRole` que solo lee `kmDe` para elegir la columna de kilómetros (sección 7, §7.4), no un valor de `StageRequest`; la sección 6 (§6.6) escribe los mismos tres campos (`role`, `terrain`, `raceClass`). La rama `NC` decide por `terrain === 'itt'` y no mira `role`, así que la elección del esqueleto no depende de esa diferencia.
3. **El kilometraje se recorta al esqueleto, y la clase decide si el esqueleto es candidato.** Para `role: 'un_dia'` sin `km` de fila, `firma|raceId` sortea `kmClase = U(min, min + rango)` sobre la fila `un día` de `ARCH.km.porClase[raceClass]` (WT [200; 260], Pro [180; 230], .1 [170; 210], .2 [140; 180], NC ruta [180; 240], NC sub-23 [140; 180]) y la etapa mide `clamp(kmClase, sk.km[0], min(sk.km[1], ARCH.km.maxPorClase[raceClass]))`. Ese intervalo nunca está vacío porque `cabe` ya excluyó los esqueletos con `sk.km[0] > maxPorClase[raceClass]` (una `ud_montana` de [200; 260] no es candidata en una .2 de techo 180: sale `ud_montana_media` o `ud_circuito`); no existe ningún "extremo más cercano" que alargue una .2 a 200 km, que es la etapa que la sección 7 promete eliminar. Para etapas de vuelta el `km` viene hecho de `kmDe` (sección 7) y el esqueleto lo acepta tal cual: sus rangos brutos cubren todas las bandas de clase de sus papeles.

El resultado de este paso es `arch.skeleton` de `GeneratedStage`, fijo para siempre para esa carrera y etapa, y con él la `frase` de arquitectura empieza a escribirse (sección 8): "Clásica de muros en Flandes: 16 muros en tres cadenas, el último a 13 km".

### 5.8 Qué esqueleto recibe cada etapa de edición sin rasgos

Las 226 etapas de edición sin rasgos reales (mapa 02 §9: 22 WT, 110 Pro, 49 .1, 45 .2) pasan hoy por `stagesFromEdition → oneDaySpec → mountainOneDay` (`calendar.ts` l. 216-226, 400-407 y 143-152, en ese orden) y salen dibujadas con la plantilla de un día: Colombia e5 de `REAL_QUEENS` es una clásica de montaña disfrazada de reina de vuelta (sección 1). Con la gramática reciben SIEMPRE un esqueleto de etapa, por `EditionTerrain` (`editions.ts` l. 10: cinco valores, sin `classic`) con la tabla `POR_TERRENO_EDICION` de §5.7 (la rama `routeSource === 'edicion'` de `candidatos`, que ignora `role` porque el papel de una etapa de edición lo deriva la sección 7 del mismo terreno), con `km` como contrato y zona `regionOf(raceId, i, country)` (sección 6; `RACE_REGION[raceId].stages[i]` solo existe para las etapas cuya zona difiere de `default`):

| `EditionTerrain` | Papel al que degrada | Esqueletos candidatos (sorteo de §5.7 con la zona de la etapa)                                                                                                                       | Nota                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `flat`           | `llana`              | `et_llana` 30; `et_llana_viento` 12 si `viento ≥ 2`                                                                                                                                  |                                                                                                                                                                                                                                                                                                                                                                                |
| `hilly`          | `media`              | `et_media_valle` 25, `et_media_alto` 20, `et_media_muro` 12, `et_media_tendida` 8, filtrados por `requiere`                                                                          | el terreno de edición no distingue "acaba arriba": se sortea, y el esqueleto queda fijo (identidad)                                                                                                                                                                                                                                                                            |
| `mountain`       | `reina_alto`         | `et_reina_alto_largo` 20, `et_reina_alto_corto` 12, `et_reina_cima_cerca` 10, `et_reina_valle` 10, `et_montana_corta` 6 si `km ≤ 140`; `et_reina_blanda` por cuota (regla 1 de §5.7) | si la zona tiene `puerto === null` (una etapa `mountain` en `flandes`), ninguno cabe y se degrada por `ESCALON_ROLE` desde `reina_alto`: `media_alto` no cabe (`cota: null`, `finalesAlto: 'ninguno'`), `media_muro` sí (`muro !== null`), y sale `et_media_muro`, la etapa del Muur del Benelux Tour (§6.3); se anota como degradación de geografía, nunca cae a `ud_montana` |
| `itt`            | `cri`                | `et_prologo` si `km ≤ 8`, si no `et_crono`                                                                                                                                           | nunca `et_cronoescalada`: el `km` es contrato y la edición no declara final en alto                                                                                                                                                                                                                                                                                            |
| `cobbles`        | `llana`              | `ud_adoquin_ligero`                                                                                                                                                                  | las 4 etapas `cobbles` de edición (mapa 02 §7) son la única excepción a "esqueleto de etapa", porque no existe `et_adoquin` y el adoquín de etapa real es exactamente un Denain                                                                                                                                                                                                |

El reparto por terreno de las 226 no está medido en los mapas (mapa 02 §7 da el de las 383 etapas de edición: hilly 163, flat 95, mountain 95, itt 26, cobbles 4; el mapa escribe 384, pero su desglose y el calendario cargado suman 383, sección 7); `routeCensus` lo imprime en el paso 0 (sección 13) y `skeletons.test.ts` sella que ninguna etapa `edicion` recibe un `ud_*` salvo `cobbles → ud_adoquin_ligero`.

### 5.9 Tests de `grammar/skeletons.test.ts` (paso 4 del plan)

Se escriben antes que el catálogo y fallan hasta que existe. Corren en `test:rapido` salvo el barrido completo de semillas, que va a `test:bancos`: el coste no está medido en ningún mapa ni juicio (32 esqueletos × 5 km × 60 semillas × unas 15 zonas admitidas serían unas 140.000 llamadas a `generateStage` con hasta 8 intentos cada una), así que `test:rapido` corre 20 semillas × 3 zonas representativas por esqueleto × 5 km (unas 10.000 generaciones, sin `sampleProfile`, ≤ 12 motivos y ≤ 80 segmentos por etapa, sección 14) y el implementador del paso 5 (el primero en que existe `generateStage`, sección 15 §15.7) mide las dos variantes y escribe la cifra en `docs/balance.md`, apartado "vN §0", apéndice "Coste de los barridos de `generateStage`". `SKELETON_IDS` es la lista literal de la unión `SkeletonId`; `ZONA_DE_REFERENCIA: Record<SkeletonId, GeoZone>` es una tabla del test con la zona de la columna "Referencia" de cada esqueleto (`ud_esprint` flandes, `ud_esprint_capi` italia_norte, `ud_circuito` norteamerica, `ud_muro_final` ardenas, `ud_muros` y `ud_muros_adoquin` flandes, `ud_sterrato` italia_centro, `ud_adoquin` y `ud_adoquin_ligero` francia_norte, `ud_montana` y `ud_montana_media` italia_norte, `ud_repecho` italia_centro, `ud_montana_alto` provenza, `ud_criterium`, `nc_ruta`, `nc_crono`, `et_crono` y `et_prologo` generico, `et_llana` centroeuropa, `et_llana_viento` golfo, `et_media_valle` italia_sur, `et_media_alto` y `et_reina_alto_corto` cantabrico, `et_media_muro` italia_centro, `et_media_tendida` meseta, `et_reina_alto_largo`, `et_montana_corta` y `et_cronoescalada` pirineos, `et_reina_cima_cerca` y `et_reina_valle` alpes, `et_reina_encadenada` dolomitas, `et_reina_blanda` portugal); `TRES_ZONAS(sk)` son la de referencia y las dos siguientes admitidas en el orden de `ZONAS`; `requestDePrueba`, `requestDe`, `requestDeFila`, `casos`, `semillas`, `p95`, `motivosPlanos` (aplana `hijos` de compuestos y de `sector_meta`), `inicioFraccion` y `slotDe` son auxiliares del propio fichero de test (construyen un `StageRequest` completo, con `fixed.skeleton` donde se indica, y `routeSource: 'generado'` salvo que se diga). `RACE_ROWS` es `export const RACE_ROWS: readonly RaceRow[] = [...WT_TABLE, ...PRO_TABLE, ...CON_TABLE]` en `calendar.ts` (la interfaz `RaceRow` es l. 381-397, con `raceClass` en l. 387; las tres tablas empiezan en l. 931, 1242 y 1615 y hoy no se exportan: el paso 4 lo añade), `RACE_CLASSES` viene de `routes/uci.ts` l. 14 y `COUNTRIES` es `Country[]` (`packages/shared/src/countries.ts` l. 13), así que se itera con `for (const { code } of COUNTRIES)` y nunca con `Object.keys`.

```ts
const LABELS_POR_KIND: Record<StageKind, string[]> = {
  llana: ['Flat'],
  clasica: ['Classic', 'Cobbles', 'Circuit'],
  media: ['Hills', 'Uphill finish', 'Wall finish', 'Circuit'],
  reina: ['Mountains', 'Summit finish', 'Mountains classic'],
  cri: ['ITT', 'Prologue', 'Hill climb'],
}
const requiereDe = (id: SkeletonId): Requiere[] => [SKELETONS[id].requiere ?? {}].flat()
const tieneAlto = (role: StageRole) =>
  POR_PAPEL[role].some((id) => finalKindDe(SKELETONS[id].meta) === 'alto')
const tienePuerto = (role: StageRole) =>
  POR_PAPEL[role].some((id) => requiereDe(id).some((r) => r.puerto))

describe('catálogo', () => {
  it('tiene exactamente los identificadores de SkeletonId', () => {
    expect(Object.keys(SKELETONS).sort()).toEqual([...SKELETON_IDS].sort()) // 16 ud_/nc_ + 16 et_ = 32
  })
  it.each(Object.values(SKELETONS))('$id está bien formado', (sk) => {
    const slots = (ss: Slot[]): Slot[] => ss.flatMap((s) => [s, ...slots(s.hijos ?? [])])
    for (const s of slots(sk.slots)) {
      expect(s.n[0]).toBeLessThanOrEqual(s.n[1])
      expect(s.ventana[0]).toBeLessThanOrEqual(s.ventana[1])
      expect(s.ventana[0]).toBeGreaterThanOrEqual(0)
      expect(s.ventana[1]).toBeLessThanOrEqual(1)
      if (s.hijos) expect(['cadena', 'racimo', 'circuito']).toContain(s.motif)
    }
    expect(sk.dPlus[0]).toBeLessThan(sk.dPlus[1])
    expect(sk.km[0]).toBeLessThan(sk.km[1])
    expect(sk.pesoBase).toBeGreaterThan(0)
    if (sk.kind === 'llana')
      expect(
        sk.slots.every(
          (s) =>
            ['enlace', 'expuesto', 'tendida'].includes(s.motif) ||
            (s.motif === 'circuito' && (s.hijos ?? []).length === 0),
        ),
      ).toBe(true)
    if (sk.kind === 'media') expect(sk.dPlus[1]).toBeLessThanOrEqual(2900) // regla 1 de §5.1: 300 bajo QUEEN_MIN_CLIMB_METRES
    expect(LABELS_POR_KIND[sk.kind]).toContain(sk.label)
    if (sk.finalKind) expect(finalKindDe(sk.meta)).toBe(sk.finalKind)
    expect(Object.keys(ARCH.pesoPorClase[sk.id]).sort()).toEqual([...RACE_CLASSES].sort()) // Object.keys ordena '1' y '2' delante
    for (const cls of RACE_CLASSES)
      if (sk.km[0] > ARCH.km.maxPorClase[cls]) expect(ARCH.pesoPorClase[sk.id][cls]).toBe(0) // V13 y el dato dicen lo mismo
    for (const s of sk.slots)
      if (s.n[0] >= 1 && (s.motif === 'puerto' || s.motif === 'cota' || s.motif === 'muro'))
        expect(requiereDe(sk.id).every((r) => r[s.motif])).toBe(true) // todo hueco obligatorio está en `requiere`
  })
})

// Regla 2 de §5.1: la cotaFinal sale de ARCH ∩ metaParams, nunca de geo.cota ni geo.puerto.
const COTA_FINAL_ESPERADA: Partial<
  Record<SkeletonId, { km: [number, number]; g: [number, number] }>
> = {
  ud_montana: { km: [1.3, 4.2], g: [7, 11] },
  ud_montana_media: { km: [2.5, 4.2], g: [7, 9] },
  ud_repecho: { km: [1, 2.2], g: [5, 7] },
  ud_muro_final: { km: [0.5, 2.2], g: [8, 16] },
  ud_sterrato: { km: [0.5, 1.0], g: [12, 16] },
  ud_montana_alto: { km: [13, 22], g: [6, 7] },
  et_media_valle: { km: [2.5, 8], g: [4, 7] },
  et_media_alto: { km: [3, 7], g: [6, 11] },
  et_media_muro: { km: [0.5, 2.2], g: [8, 16] },
  et_media_tendida: { km: [2.5, 6], g: [4, 6] },
  et_reina_alto_largo: { km: [9, 22], g: [6, 9] },
  et_reina_alto_corto: { km: [4, 7], g: [8, 11] },
  et_reina_cima_cerca: { km: [9, 16], g: [6, 9] },
  et_reina_valle: { km: [9, 17], g: [6, 9] },
  et_reina_encadenada: { km: [4, 7], g: [8, 11] },
  et_montana_corta: { km: [9, 22], g: [6, 9] },
  et_reina_blanda: { km: [9, 12], g: [6, 7] },
  et_cronoescalada: { km: [9, 15], g: [6, 9] },
} // los 14 que faltan (esprint y sector_meta) dan null
const opcionesDe = (sk: Skeleton): (Alternativa | null)[] => [null, ...(sk.alternativas ?? [])]
const dentroDe = (r: [number, number], de: [number, number]) => r[0] >= de[0] && r[1] <= de[1]

describe('cotaFinal (regla 2 de §5.1)', () => {
  it.each(Object.values(SKELETONS))(
    '$id: rango de ARCH ∩ metaParams, igual al de la tabla',
    (sk) => {
      expect(rangoCotaFinal(sk, null)).toEqual(COTA_FINAL_ESPERADA[sk.id] ?? null)
      const conValle = ['cima_cerca', 'descenso_meta', 'valle'].includes(sk.meta)
      if (sk.id.startsWith('et_') && conValle) expect(sk.metaParams?.cotaFinal).toBeDefined() // ARCH.meta.<clave> no trae km ni g
      if (sk.meta === 'esprint' || sk.meta === 'sector_meta')
        expect(sk.metaParams?.cotaFinal).toBeUndefined()
      for (const alt of opcionesDe(sk)) {
        const meta = alt?.meta ?? sk.meta
        const env = envolventeCotaFinal(
          meta,
          !sk.id.startsWith('et_'),
          alt?.metaParams?.kmRango ?? sk.metaParams?.cotaFinal?.km,
        )
        const r = rangoCotaFinal(sk, alt) // lanza si queda vacío
        if (env === null) {
          expect(r).toBeNull()
          continue
        }
        if (meta === sk.meta && sk.metaParams?.cotaFinal) {
          // lo declarado está DENTRO de la envolvente: la intersección no recorta en silencio
          expect(dentroDe(sk.metaParams.cotaFinal.km, env.km)).toBe(true)
          expect(dentroDe(sk.metaParams.cotaFinal.g, env.g)).toBe(true)
        }
        if (alt?.metaParams?.kmRango) expect(dentroDe(alt.metaParams.kmRango, env.km)).toBe(true)
        if (alt?.metaParams?.gRango) expect(dentroDe(alt.metaParams.gRango, env.g)).toBe(true)
        if (meta === 'alto_largo' && r!.km[1] > 17)
          expect(r!.g[0]).toBeLessThanOrEqual(ARCH.meta.altoLargo.gMaxSiMasDe17) // techoG nunca vacía
      }
    },
  )
  it('las opciones de nivel 2 resuelven su cotaFinal campo a campo', () => {
    const [angliru, lagos] = SKELETONS.et_reina_alto_largo.alternativas!
    expect(rangoCotaFinal(SKELETONS.et_reina_alto_largo, angliru)).toEqual({
      km: [12, 13],
      g: [8.5, 9.5],
    }) // sustituye al g [6; 9] del esqueleto
    expect(rangoCotaFinal(SKELETONS.et_reina_alto_largo, lagos)).toEqual({
      km: [11.5, 12.8],
      g: [6.8, 7.6],
    })
    expect(rangoCotaFinal(SKELETONS.ud_montana, SKELETONS.ud_montana.alternativas![0])).toEqual({
      km: [1.3, 4.2],
      g: [7, 11],
    }) // Bérgamo no declara metaParams
  })
  it('un esqueleto de etapa con valle y sin metaParams.cotaFinal lanza, y uno de un día cae a unDiaUltimaCota', () => {
    const sinParams = { ...SKELETONS.et_reina_valle, metaParams: undefined }
    expect(() => rangoCotaFinal(sinParams, null)).toThrow(/cotaFinal/)
    expect(rangoCotaFinal({ ...SKELETONS.ud_montana_media, metaParams: undefined }, null)).toEqual({
      km: [1.3, 4.2],
      g: [7, 11],
    })
  })
  it('los techos de altitud no vacían el rango en ninguna zona admitida', () => {
    for (const sk of Object.values(SKELETONS))
      for (const alt of opcionesDe(sk))
        for (const [nombre, geo] of Object.entries(ZONAS)) {
          if (!admite(sk.requiere, geo)) continue
          const r = rangoCotaFinal(sk, alt)
          if (!r) continue
          const kr = techoKmCotaFinal(r, geo.altitud)
          expect(kr[0], `${sk.id} ${alt?.nombre ?? ''} en ${nombre}: km`).toBeLessThanOrEqual(kr[1])
          for (const km of [kr[0], kr[1]]) {
            const gr = techoGCotaFinal(alt?.meta ?? sk.meta, r, km, geo.altitud)
            expect(
              gr[0],
              `${sk.id} ${alt?.nombre ?? ''} en ${nombre}: g a ${km} km`,
            ).toBeLessThanOrEqual(gr[1])
            expect(km * gr[1] * 10).toBeLessThanOrEqual(ARCH.veto.puertoDplusMax[geo.altitud]) // V4c por construcción
          }
          if (!['media', 'alta', 'altiplano'].includes(geo.altitud))
            expect(kr[1]).toBeLessThan(ARCH.veto.puertoLargoKm) // V4b
        }
  })
  it('la zona no estrecha la meta: et_reina_alto_corto en cantabrico (cota.g [6; 7]) sortea g ≥ 8', () => {
    const sk = SKELETONS.et_reina_alto_corto
    for (const s of semillas(20)) {
      const req = requestDe(sk, 'cantabrico', 170, s, { fixed: { skeleton: sk.id } })
      const meta = instanciarFirma(sk, 0, req, routeRng(`firma|${s}`)).at(-1)!.motif // la meta es la última instancia de firma (§8.3)
      expect(meta.cotaFinal!.g).toBeGreaterThanOrEqual(8)
      expect(meta.cotaFinal!.km).toBeGreaterThanOrEqual(4)
    }
  })
  it('et_reina_blanda en cono_sur (puerto.g [5; 6]) no queda clavada en 6,0', () => {
    const sk = SKELETONS.et_reina_blanda
    const gs = semillas(20).map(
      (s) =>
        instanciarFirma(
          sk,
          0,
          requestDe(sk, 'cono_sur', 160, s, { fixed: { skeleton: sk.id } }),
          routeRng(`firma|${s}`),
        ).at(-1)!.motif.cotaFinal!.g,
    )
    expect(Math.max(...gs)).toBeGreaterThan(6.0)
    expect(Math.min(...gs)).toBeGreaterThanOrEqual(6)
    expect(Math.max(...gs)).toBeLessThanOrEqual(7)
  })
})

describe('plantilla canónica', () => {
  it.each(Object.values(SKELETONS))(
    '$id: pasa validateMotif y los vetos, y da su kind y su finalKind sin RNG',
    (sk) => {
      const geo = ZONAS[ZONA_DE_REFERENCIA[sk.id]]
      const req = requestDePrueba(sk, geo) // km = Σ canonico (vueltas incluidas), raceClass WT (NC para nc_ruta), format según el id
      for (const m of motivosPlanos(sk.canonico)) expect(validateMotif(m, geo)).toBeNull()
      for (const m of sk.canonico) {
        const s = slotDe(sk, m) // el Slot de primer nivel al que corresponde el motivo; null para enlaces, bajadas y meta
        if (s) {
          expect(inicioFraccion(sk.canonico, m)).toBeGreaterThanOrEqual(s.ventana[0])
          expect(inicioFraccion(sk.canonico, m)).toBeLessThanOrEqual(s.ventana[1])
        }
      }
      const profile = renderCanonico(sk.id, geo) // auxiliar de §15.6: coloca la plantilla por acumulación, como `canonica` (§8.11)
      expect(Math.abs(profileKm(profile) - req.km)).toBeLessThan(0.05)
      expect(
        verify(profile, sk, req, sk.canonico, req.km, colocarPlantilla(sk.canonico)),
      ).toBeNull()
      expect(stageKindOf(profile, sk.timeTrial ?? false).kind).toBe(sk.kind) // V6 compara kind; label es sk.label
      if (sk.finalKind) expect(finalKindOf(profile)).toBe(sk.finalKind)
      for (const { canonico: alt } of sk.alternativas ?? []) {
        // Alternativa (§10.3): se valida su plantilla literal
        for (const m of motivosPlanos(alt)) expect(validateMotif(m, geo)).toBeNull()
        const kmAlt = alt.reduce((a, m) => a + m.km * (m.vueltas ?? 1), 0)
        const p2 = renderPlantilla(sk, alt, geo)
        expect(verify(p2, sk, { ...req, km: kmAlt }, alt, kmAlt, colocarPlantilla(alt))).toBeNull()
        expect(stageKindOf(p2, sk.timeTrial ?? false).kind).toBe(sk.kind)
        if (sk.finalKind) expect(finalKindOf(p2)).toBe(sk.finalKind)
      }
    },
  )
  it('la pancarta redondea al entero: el Poggio canónico corona a 6,0 leídos, no a 5,4', () => {
    const sk = SKELETONS.ud_esprint_capi
    const profile = renderCanonico(sk.id, ZONAS.italia_norte)
    expect(profile.banners.at(-1)).toEqual({ km: 284, tipo: 'cima' })
    expect(kmAfterLastClimb(profile)).toBe(6)
    expect(finalKindOf(profile)).toBe('valle_corto')
  })
  it('nc_ruta en flandes es clasica / Circuit con NC_RUTA_CLASICA', () => {
    const sk = skeletonFor('nc_ruta', ZONAS.flandes)
    expect(sk.kind).toBe('clasica')
    expect(sk.label).toBe('Circuit')
    expect(sk.canonico).toBe(NC_RUTA_CLASICA)
    expect(stageKindOf(renderPlantilla(sk, sk.canonico, ZONAS.flandes), false).kind).toBe('clasica')
  })
})

describe('esqueleto × km × semillas × zonas (V6 y V7)', () => {
  // test:rapido: 5 km por esqueleto (los extremos y tres intermedios de sk.km) × 20 semillas × TRES_ZONAS(sk);
  // test:bancos: 60 semillas × todas las zonas donde admite(sk.requiere, geo). Misma aserción, distinto `casos()`.
  it.each(casos())('$id en $zona con $km km', ({ sk, zona, km, n }) => {
    const salidas = semillas(n).map((s) =>
      generateStage(requestDe(sk, zona, km, s, { fixed: { skeleton: sk.id } })),
    )
    const degradadas = salidas.filter((g) => g.arch.degradado).length
    expect(degradadas / n).toBeLessThanOrEqual(ARCH.veto.fallbackMaxShare.testPorEsqueleto) // 0,005 → 0 de 20 y 0 de 60
    expect(p95(salidas.map((g) => g.arch.intentos))).toBeLessThanOrEqual(ARCH.veto.intentosP95) // 3
    for (const g of salidas) {
      expect(g.kind).toBe(sk.kind)
      expect(g.label).toBe(sk.label) // V6 (kind) y label = sk.label
      if (sk.finalKind) expect(g.arch.finalKind).toBe(sk.finalKind) // V7
      expect(g.arch.dPlus).toBeGreaterThanOrEqual(sk.dPlus[0] * 0.9)
      expect(g.arch.dPlus).toBeLessThanOrEqual(sk.dPlus[1] * 1.1)
    }
  })
})

describe('candidatos y pesos', () => {
  it('nunca devuelve vacío ni lanza para ninguna (fila, clase) del calendario', () => {
    for (const row of RACE_ROWS)
      for (const cls of RACE_CLASSES)
        expect(candidatos(requestDeFila(row, cls)).length).toBeGreaterThan(0)
  })
  it('mountain en una zona sin puerto baja a hilly y nunca da ud_montana', () => {
    const ids = candidatos({
      role: 'un_dia',
      terrain: 'mountain',
      geo: ZONAS.flandes,
      raceClass: 'Pro',
      format: 'un-dia',
      km: 200,
      routeSource: 'generado',
    }).map((c) => c.id)
    expect(ids).not.toContain('ud_montana')
    expect(ids).toContain('ud_muros')
  })
  it('hilly en una zona sin muro: tres candidatos desde .1, y en .2 donde la cota baja de 2,9 km', () => {
    const sinMuro: GeoZone[] = [
      'alpes',
      'pirineos',
      'dolomitas',
      'meseta',
      'balcanes',
      'anatolia',
      'andes',
      'cono_sur',
      'golfo',
      'africa_llana',
    ]
    const ids = (zona: GeoZone, raceClass: RaceClass) =>
      candidatos({
        role: 'un_dia',
        terrain: 'hilly',
        geo: ZONAS[zona],
        raceClass,
        format: 'un-dia',
        km: 160,
        routeSource: 'generado',
      }).map((c) => c.id)
    expect(
      Object.values(ZONAS)
        .filter((g) => g.muro === null)
        .map((g) => g.zona)
        .sort(),
    ).toEqual([...sinMuro].sort())
    for (const zona of sinMuro) {
      expect(ids(zona, '1')).toEqual(
        expect.arrayContaining(['ud_montana_media', 'ud_repecho', 'ud_esprint_capi']),
      )
      expect(ids(zona, '2')).toEqual(expect.arrayContaining(['ud_montana_media', 'ud_repecho']))
      expect(ids(zona, '2').includes('ud_circuito')).toBe(ZONAS[zona].cota!.km[0] <= 2.9) // andes, golfo, africa_llana
    }
  })
  it('ud_montana_alto pesa 60 × 0,02 y solo en .1', () => {
    expect(ARCH.pesoPorClase.ud_montana_alto).toEqual({ WT: 0, Pro: 0, '1': 0.02, '2': 0, NC: 0 })
  })
  it('la clase decide el candidato: ninguna .2 recibe un esqueleto de km[0] > 180', () => {
    for (const row of RACE_ROWS.filter((r) => !r.stages))
      for (const c of candidatos(requestDeFila(row, '2')))
        expect(SKELETONS[c.id].km[0]).toBeLessThanOrEqual(ARCH.km.maxPorClase['2'])
  })
  it('las filas cobbles reciben adoquín; las que bajan a classic se imprimen', () => {
    const bajan = RACE_ROWS.filter((r) => r.terrain === 'cobbles').filter(
      (row) =>
        !candidatos(requestDeFila(row, row.raceClass)).some((c) =>
          ['ud_adoquin', 'ud_adoquin_ligero', 'ud_muros_adoquin'].includes(c.id),
        ),
    )
    console.info(
      `[skeletons] filas cobbles sin candidato de adoquín en su zona: ${bajan.length} (${bajan.map((r) => r.id).join(' ')})`,
    )
    expect(bajan.length).toBeLessThanOrEqual(1) // race-leon en meseta (duda de dato, §6.3); Veneto Classic entra por sterrato
  })
  it('un nacional solo sale de nc_ruta o nc_crono, y ninguna carrera de equipos sale de nc_ruta', () => {
    for (const { code } of COUNTRIES) {
      const geo = ZONAS[zonaDe(code)]
      expect(
        candidatos({
          role: 'un_dia',
          terrain: 'classic',
          geo,
          raceClass: 'NC',
          format: 'un-dia',
          km: 210,
          routeSource: 'generado',
        }).map((c) => c.id),
      ).toEqual(['nc_ruta'])
      expect(
        candidatos({
          role: 'un_dia',
          terrain: 'itt',
          geo,
          raceClass: 'NC',
          format: 'un-dia',
          km: 38,
          routeSource: 'generado',
        }).map((c) => c.id),
      ).toEqual(['nc_crono'])
    }
    for (const cls of ['WT', 'Pro', '1', '2'] as const)
      expect(
        candidatos({
          role: 'un_dia',
          terrain: 'hilly',
          geo: ZONAS.ardenas,
          raceClass: cls,
          format: 'un-dia',
          km: 200,
          routeSource: 'generado',
        }).map((c) => c.id),
      ).not.toContain('nc_ruta')
    const chrono = RACE_ROWS.find((r) => r.id === 'race-chrono')! // .1, itt, 45 km (calendar.ts l. 3351-3360)
    expect(candidatos(requestDeFila(chrono, chrono.raceClass)).map((c) => c.id)).toEqual([
      'nc_crono',
    ])
  })
  it('degradarPapel nunca añade un final en alto ni un puerto que el papel de origen no tuviera', () => {
    for (const [origen, destino] of Object.entries(ESCALON_ROLE) as [
      StageRole,
      StageRole | null,
    ][]) {
      if (!destino) continue
      if (tieneAlto(destino)) expect(tieneAlto(origen)).toBe(true)
      if (tienePuerto(destino)) expect(tienePuerto(origen)).toBe(true)
    }
  })
  it('la reina blanda sale con la cuota de ARCH.reina.blandaShare', () => {
    const n = 4000
    const blandas = semillas(n).filter(
      (s) =>
        generateStage(
          requestDe(SKELETONS.et_reina_alto_largo, 'pirineos', 160, s, { role: 'reina_alto' }),
        ).arch.skeleton === 'et_reina_blanda',
    ).length
    expect(blandas / n).toBeGreaterThan(0.07)
    expect(blandas / n).toBeLessThan(0.13) // alta: 0,10
  })
})

describe('etapas de edición', () => {
  it('reciben esqueletos de etapa, salvo cobbles → ud_adoquin_ligero', () => {
    for (const [id, ed] of Object.entries(RACE_EDITIONS))
      ed.stages.forEach((st, i) => {
        if (STAGE_FEATURES[id]?.[i]) return
        const g = stagesForSeason(id, BASE_SEASON)[i]
        expect(g.routeSource).toBe('edicion')
        if (st.terrain === 'cobbles') expect(g.arch.skeleton).toBe('ud_adoquin_ligero')
        else expect(g.arch.skeleton.startsWith('et_')).toBe(true)
        expect(Math.abs(profileKm(g.profile) - st.km)).toBeLessThan(0.05) // contrato al 0,1; hoy calendar.test.ts l. 140-152 compara el entero
      })
  })
  it('una etapa mountain de edición en flandes acaba en et_media_muro', () => {
    const g = generateStage({
      ...requestDe(SKELETONS.et_reina_alto_largo, 'flandes', 170, 'ed-flandes'),
      routeSource: 'edicion',
      terrain: 'mountain',
      role: 'reina_alto',
      fixed: undefined,
    })
    expect(g.arch.skeleton).toBe('et_media_muro')
    expect(g.arch.frase).toMatch(/degradad/)
  })
  it('Colombia e5 de REAL_QUEENS ya no es una clásica de montaña', () => {
    const g = stagesForSeason('race-colombia', BASE_SEASON)[4]
    expect(g.arch.skeleton).toMatch(/^et_reina_/)
    expect(g.kind).toBe('reina')
  })
})
```

Lo que estos tests NO miden, a propósito: `finishType` (V16, solo en `routeCensus`, decisión 4), el reparto real de esqueletos en el calendario (bandas de variedad de la sección 13: ≥ 8 esqueletos distintos por clase en WT, entropía ≥ 1,5 bits por zona, ≥ 3 esqueletos por (zona, `terrain`) con ≥ 4 carreras) y la plausibilidad de los pesos a ojo del dueño (galería, sección 16).

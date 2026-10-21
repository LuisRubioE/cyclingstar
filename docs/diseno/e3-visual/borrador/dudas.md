# Dudas del ensamblado de la v0, para la pasada de coherencia

Lo que los redactores y el orquestador vieron al escribir y ensamblar la v0 y no se cerró en la propia
sección. La pasada de coherencia (`04-fase-refutacion.md` §6) cierra cada punto o dice por qué no.

## Del redactor de L1 (§1 a §7)

- El fondo `ink-2` de CueCard (§14, L2/L3) choca con el ámbito oscuro.
- El `include` de vitest no recoge `apps/web/sw/decide.test.ts` ni `apps/web/scripts/peso.test.mjs`.
- D-09 cita SPEC §4.1, pero la regla de los cerillos está en §6.6 (l. 402-410).
- D-50 llama al fichero `rendimiento.spec.ts` y el glosario `nocturno.spec.ts`.
- §A/D-14 dice 2.457 clases de deuda y la cifra medida con los tokens de E3 es 2.740.
- Glosario: actualizar `KitSize`/`KIT_PX` y `RiderLabel` (G.3, G.5 y G.6); G.1 habla de nueve comprobaciones y son diez; añadir `tracking-caps`, `veiled`, `UiState`, `ARBITRARY_ALLOWED`, `UI_RULES`/`UI_HEREDADOS`, `heredados.test.ts`, `data-kit`, `TelefonoPantalla`, `serve.mjs`, `isKeyboardOpen`, `useOnline`, `formatGameDay`, `errorKindOf` y `rowHeight`.

## Del redactor de L2 (§8 a §13), en su primera pasada

- L1 (§3.8) y el glosario siguen diciendo `ChampionSash` y `NATIONAL_SASH`; el componente es ahora `ChampionJersey` y salen `SASH_*`, `CHAMPION_NIGHT`, `CHAMPION_PAPER` y `NATIONAL_SASH*`.
- `champion.test.ts` tiene que ir en `packages/db`, no en `shared`.
- La alternativa de DD-07 (no traducir los maillots del mundo de hoy) choca con D-00e (nunca dos maillots iguales): hoy hay equipos gemelos.
- Glosario, añadir: `canonicalKit`, `kit_canonical`, `setKit`, `KitTakenError`, `kit_ocupado`, `takenBy`, los colores `taupe`, `brown` y `plum`, la figura `sash`, `ChampionJersey`, `CHAMPION_RAINBOW`, `WORLD_STAR`, `NATIONAL_STAR`, `NATIONAL_FLAG_BOX`, `starTransform` y `flagCells`.
- Hallazgo para §19: la estrella dorada no separa las banderas a 28 px; 21 maillots de equipo quedan a menos de 10 de 17 nacionales (el peor, Marruecos frente a `plain.red`, 4,3 en deuteranopía) y la tabla de choques los reserva (`plain.red`, `plain.green`, `plain.teal`, `plain.taupe`…). Indonesia y Mónaco visten igual.
- El mundial (blanco con la estrella de arcoíris) queda a 28 px a 12,7, 11,6, 11,7 y 12,1 de la marca de la UCI en las cuatro visiones y a 9,2 en grises, tan cerca como el ChampionMark de hoy (12,2): es el coste de §9.2 y de §19.

## Del redactor de L2, al aplicar D-00f a D-00h (manda sobre lo anterior donde choque)

- La estrella del nacional en su sitio nuevo cambia las cifras de D-00h: se reservan **12 maillots de equipo frente a 10 nacionales** (no 21 frente a 17); `plain.red` y `plain.green` siguen reservados y `plain.teal` y `plain.taupe` quedan libres; quedan 524 permitidos y 491 distintos. §19 (L3) cita todavía las cifras viejas.
- Ghana, Chad e Irak no están entre los 133 países del juego: D-00f los nombra como ejemplo y sobran.
- El culote se guarda en `teams.bib` (§8.10); L3 dice que, si se guarda como dato, su columna va en la 0052 (17-g). Hay que casar la columna con la migración.
- Del orquestador solo queda sin aceptar por el dueño el filo `navy-dark` de la estrella del mundial (DD-21 en §19).
- `opciones/medidas.py` no declara `xmlns:xlink` en `para_medir`, y 65 banderas fallan al rasterizar las 133; para la hoja de revisión de los 133 nacionales hay que añadirlo.

## Del redactor de L3 (§14 a §20)

- Cerradas en L3: el fondo de la clase 1 del rótulo pasa a navy (14-a); el include de vitest se amplía para sw/decide.test.ts y peso.test.mjs corre con node --test en el trabajo Build; manda nocturno.spec.ts; la deuda es de 2.740 apariciones; champion.test.ts va en packages/db; kitWorld.bench.ts pasa a kitWorld.long.test.ts.
- Hueco cubierto: las filas de clasificación no traen el maillot de su equipo; lo toman por teamId de la lista de salida o de GET /api/teams (17-q), y RiderLabel lleva un tipo de transición hasta el 17a (17-e).
- Sin cerrar: §8 y §9 aún no traían D-00f a D-00h cuando se escribió L3; el plan remite a ellos sin nombres de código para las vistas, y si el culote se guarda como dato, su columna va en la 0052 (17-g).
- Estimados: los 88 px del rótulo y las cinco fichas por renglón; duda: el orden del nombre y el maillot del equipo de §9.8 (17-h).
- Longitud: §16 a §19 entre un 22 y un 28 % por debajo del objetivo; §20, un 35 % por encima.
- Glosario, añadir: overlaySummaryText, TEAM_KIT_LINES_MAX, KEYBOARD_OPEN_RATIO, INSTALL_SESSION_GAP_MS, generados.test.ts con huellas.json, control.html, sw/baja.js, legacyJersey.test.ts, sessionStateOf, el trabajo «Teléfono de noche» y el paso 17 en tres PR (17a, 17b y 17c).
- Migraciones: 0050 (PR 1), 0051 (13a), 0052 (16a, índice único), 0053 (19c) y 0054 (23), fusionadas en ese orden.

## Del orquestador, al ensamblar

- `ensamblar.sh --v0 --comprobar` da 2 fallos, los dos de remisión: «(§4.22.3; mapa 04…)» en §13 tiene que decir `docs/agenda.md` §4.22.3, y el §18.8 de la lista de documentos de §17 (PR 24) es el de `docs/retransmision.md`, que conviene escribir a su lado. Toda remisión a una sección de otro documento lleva el nombre del documento.
- «como fija E2 (§18.8)» en §14 tiene que decir `docs/retransmision.md` §18.8.

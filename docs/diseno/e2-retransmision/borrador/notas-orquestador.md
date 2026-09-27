# Notas del orquestador para el ensamblador y la pasada de coherencia

Hallazgos cruzados que los redactores comunicaron en sus informes y que afectan a secciones de
otros lotes. La pasada de coherencia tiene que cerrarlos uno a uno (o dejarlos en `dudas.md`).

## De L1 (§1 a §3)

- El «0-36 saltos de más de 60 s» de la contradicción C4 mezcla dos fenómenos: el defecto (ataque
  cazado con hueco negativo) da de 0 a 6 saltos de grupo por etapa por encima de 60 s; los 33 de
  Flandes son deriva que vuelve a 0.
- Extrapolación causal (D-04) medida en 15 corridas: p50 de 0 a 2 m, p99 de 52 a 508 m, nunca 1 km.
  Reloj estimado (D-07): desviación máxima de 0,69 km en la cabeza.
- El umbral de I2 (tránsito p90 ≤ 2) falla en la e18: p90 de 3 a 5. §16.2 lo fija tras medirlo.
- Decisiones 3-a a 3-f adoptadas por §4 (decisión 4-t). `marcasDe` pasa a `clockMarksOf`.

## De L2 (§4 y §15)

- D-39: el digest de una gran vuelta dura de 34,5 a 39,5 min con `digestBudgetS`, no «unos 30».
  L4 lo mide en 38, 40 o 43 min y decide que el número del botón se calcula (8-b).
- D-26: `knownWins` «por construcción» no vale para victorias de etapa dentro de una vuelta. L5 lo
  cierra en §7.5: solo cuentan victorias cuya fila `gc` de `palmares` tiene `game_day ≤ día −
  expiryGameDays`, con consulta EXISTS.
- Trampa del CI: un test nuevo bajo `packages/engine/src/sim/` no corre en ningún PR; la decisión
  15-d mete `timeline.test.ts` en el tramo «mundo y radio».
- `photoBlocksOf` tiene que quitar repetidos: en 69 etapas dos km de foto caen en el mismo bloque.
- Regla de ESLint que impide al motor importar `BROADCAST` y `SPOILER` (15-h o vecina).

## De L4 (§6 y §8)

- La voz dice «the bunch» con el grupo principal por debajo de 2/3 (22 de 48 líneas en la e18); el
  motor usa 1/2 en `chaseIsBunch` y no exporta `chaseReferenceIndex`. Afecta a §12.6 y §15.5.
- D-55: en `Watch` son unas 4 escrituras de progreso por minuto, no 1; §10.3 sigue diciendo 1. En
  `Highlights` ×4; en `Next action` el colchón de tramos es de 0,75 s.
- `TimelineCast` necesita un campo `favourites` congelado o puede fallar B1c (afecta a §4 y §5).
- `StageClosing` no tiene la tabla por equipos que pide DD-13.
- `PHOTO FINISH` no se puede hacer: `margin` es el hueco al grupo siguiente.
- En crono, `Highlights` y el digest son una sola curva, medida de 1:56 a 2:03; §9.4 no la nombra.
- Ningún salto pasa de L−1; `Next action` se apaga en el último km; la letra por modo coincide con
  `LETTER_OF_MODE` de §10.3.

## De L5 (§7 y §9)

- La API quita de puntos y montaña a los corredores con 0 puntos (`results.ts` l. 344 y 403); la
  lista del tick no (`packages/db/src/stageRun.ts` l. 551-557). El reparto sigue a la API (7-b).
- D-25 habla de 22 países con excepción antes; son 17, y 5 después. En la temporada 0 el Giro tiene
  campeones de 15 países y ninguno de Italia.
- Los tiempos de la crono tienen que ser enteros exactos: propone `checkClockDs` y meta en
  10·tiempoS. El pinchazo se revela por la traza en finishKm/2. El cierre de la crono es la última
  llegada, no el último en salir.
- Propuesto para §4: `checkClockDs`, `BroadcastHead.tt`, `tt.checks` en el chunk, avisos
  `tt_split` y `tt_finish`. Para §15: `ttSeekStepS`, `ttSeekLastStarters`.
- Cronos largas frente a `ttMaxStoredBytes`: unos 19-20 KB estimados para 40 km, por encima de 16 KB.

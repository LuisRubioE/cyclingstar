# Balance del motor

Registro de las perillas del motor (SPEC 6) y por qué están donde están. Toda constante vive en
`packages/engine/src/constants.ts` (objeto `STAGE`); aquí se anota cada giro con su razón y la
corrida de Montecarlo que lo justifica. Los invariantes corren en CI
(`packages/engine/src/sim/invariants.test.ts`) y la campaña completa se lanza con `pnpm sim`.

## Metodología

- `pnpm sim [runs]` corre una campaña Montecarlo del escenario llano canónico y compara los
  estadísticos con los rangos objetivo del SPEC 6.17.
- Todo es determinista: el azar entra solo por la semilla de la etapa (mulberry32), nunca por el
  reloj ni por `Math.random`. Las mismas semillas dan los mismos números en cualquier máquina.

## Paso 25 — Primera campaña: la etapa llana (SPEC 6.17)

Escenario `llana-180`: 180 km de llano con una meta volante; 3 sprinters de nivel (SPR 84-86),
6 cazaetapas combativos y un pelotón de 31 rodadores (LLA 62-69).

### Resultados (N = 120, deterministas)

| Invariante                                 | Objetivo  | Medido     | Estado |
| ------------------------------------------ | --------- | ---------- | ------ |
| Gana la fuga                               | 2 – 8 %   | 5.8 %      | ✓      |
| Gana el mejor sprinter (con 3 de nivel)    | 30 – 45 % | 43.3 %     | ✓      |
| Captura mediana (km a meta)                | 25 … 8    | 20 km      | ✓      |
| Capturas (la fuga es cazada)               | alto      | 94 %       | ✓      |
| Pelotón comprometido cierra por 10 km      | 50 – 75 s | 56 s @0.85 | ✓      |
| Inercia: Δv por bloque (fuera de cerillo)  | ≤ 4 km/h  | ≤ 4 km/h   | ✓      |
| Invariancia de resolución (dx 0.1 vs 0.05) | < 5 %     | < 5 %      | ✓      |

### Giros de perilla y su razón

1. **`pelotonPaceFraction = 0.25`** — el ritmo del pelotón lo marca su cuarto delantero de
   punteros, no el P75 de todo el bloque. Sin esto, el P75 del pelotón lo hundían los corredores
   más flojos y ni a tope alcanzaba a una fuga de rodadores fuertes: la fuga ganaba el 100 %.
2. **`breakawayCommitMin/Max = 0.50 / 0.67`** — la fuga rueda a tempo cooperando, con cooperación
   variable por etapa. Esa varianza es la que produce el 2-8 % de fugas triunfantes: casi todas
   se cazan, pero las que se entienden de verdad aguantan. El extremo superior es muy sensible
   (0.66 → 0 %, 0.68 → 10 %, 0.71 → 26 %); 0.67 centra la ventana en ~6 %.
3. **Controlador del pelotón en lazo cerrado** (`chaseMaxLeashSeconds = 150`,
   `chaseHoldCommit = 0.62`, `chaseGain = 0.006`) — los sprinters dejan a la fuga una ventaja
   máxima (leash) que se cierra linealmente hasta el punto de captura (finish − 12 km) y regulan
   con tempo de mantenimiento + ganancia sobre el exceso. Sustituye al controlador proporcional
   puro del Paso 24, que soltaba el boquete pronto y luego no llegaba: la captura mediana pasó de
   km 7 a un realista km 20 a meta.

### Pendiente (deferido con razón)

- **Tren del sprint ≥ 300 m de 48 a 62 km/h** (6.17): con `ACC_FINAL = 1.5 km/h/s` la transición
  cinemática pura tarda ~150 m, no 300. El "tarda 300 m" nace de la colocación y los relevos de
  lanzamiento (lead-out), que el MVP llano aún no modela como sub-fases. Se reconcilia cuando se
  añada el tren de lanzamiento; hasta entonces el invariante queda anotado, no forzado.

# Propuesta de navegación e arquitectura de información

Estado: **propuesta para discutir**. No implementada. Sustituiría a la navegación actual de
`apps/web/src/components/Header.tsx` y al mapa de rutas de `apps/web/src/App.tsx`.

---

## 1. Diagnóstico: qué está mal hoy

No es una impresión, son hechos verificables sobre el código actual.

### 1.1 Tres páginas funcionales son inalcanzables

No están en el menú ni enlazadas desde ninguna página. Solo se llega escribiendo la URL a mano:

| Ruta             | Qué contiene                                                                      | Gravedad                                                              |
| ---------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/race-entry`    | Auto-inscripción del agente libre a carreras continentales, con su coste de viaje | **Crítica**: es el bucle de juego principal de un corredor sin equipo |
| `/team-calendar` | Plan de carreras del equipo que gestiona el usuario                               | **Crítica**: es la función central del rol de mánager                 |
| `/routes`        | Altimetrías de la "vuelta de prueba" de 5 etapas                                  | Baja: es un resto de la fase de desarrollo (Paso 28)                  |

Un jugador sin equipo hoy **no tiene forma de descubrir** que puede inscribirse a carreras. El bucle
existe, está implementado y probado, y es invisible.

### 1.2 Colisión de URLs: `/races` significa dos cosas distintas

```
/races            → MyRaces      (MIS carreras, requiere sesión)
/races/:raceId    → Race         (una carrera del mundo, pública)
```

`/races/:raceId` **no es el detalle de** `/races`. Son dos conceptos sin relación compartiendo
prefijo. Es la causa raíz de la sensación de "se llega a las cosas por caminos raros": la propia
estructura de URLs miente sobre la jerarquía.

### 1.3 Una tira plana de 12 enlaces sin jerarquía visible

El código **ya tiene** el modelo mental correcto (`Header.tsx:14-30`):

```ts
const WORLD_LINKS = [Calendar, Teams, Nations, Rankings, Hall of Fame, News]
const RIDER_LINKS = [My rider, Training, Orders, Races, Market, Finances]
```

…y luego lo destruye al pintar (`Header.tsx:44`):

```ts
const links = data ? [...WORLD_LINKS, ...RIDER_LINKS] : [...WORLD_LINKS]
```

Los dos grupos se concatenan en **una sola fila indiferenciada de 12 elementos**. La distinción
entre "el mundo" y "yo" existe en el código y es invisible para el jugador. En móvil, esos 12
elementos son una lista vertical sin agrupar.

### 1.4 "Lo mío" está desperdigado en cinco destinos hermanos

`/training`, `/race-orders`, `/races`, `/race-entry`, `/market`, `/finances` y `/rider` están todos
al mismo nivel jerárquico, sin relación declarada entre ellos. Además hay dos conceptos de "órdenes"
sin distinguir: órdenes de **entrenamiento** (dentro de `/training`) y órdenes de **carrera**
(`/race-orders`, etiquetado simplemente "Orders" en el menú).

### 1.5 El panel de inicio duplica el menú sin añadir nada

`Home.tsx:13-19` define `ACTIONS` con cinco enlaces —Training, Race orders, Races, Market,
Finances— que son **exactamente** cinco de los seis `RIDER_LINKS` del menú, más un botón "View my
rider" que es el sexto. El dashboard no prioriza ni resume: repite.

### 1.6 Nomenclatura incoherente

| Concepto             | En el menú | En el dashboard | En la URL      |
| -------------------- | ---------- | --------------- | -------------- |
| Órdenes de carrera   | "Orders"   | "Race orders"   | `/race-orders` |
| Mis carreras         | "Races"    | "Races"         | `/races`       |
| Calendario del mundo | "Calendar" | —               | `/calendar`    |
| Contrato y ofertas   | "Market"   | "Market"        | `/market`      |

"Races" (mías) y "Calendar" (del mundo) son el mismo concepto en dos ámbitos, pero nada lo sugiere.
"Market" describe un mercado que no existe: no hay mercado entre usuarios en el MVP; lo que hay es
**tu contrato y tus ofertas**.

---

## 2. Principios de la propuesta

1. **Tres esferas, no una lista.** Todo en este juego es _yo_, _mi equipo_ o _el mundo_. La
   navegación debe hacer visible esa división en todo momento.
2. **La URL es la jerarquía.** Si algo es hijo de otra cosa, cuelga de ella. Nunca dos conceptos
   distintos bajo el mismo prefijo.
3. **Dos niveles como máximo.** Sección arriba, pestañas de contexto debajo. Nada de menús
   desplegables anidados: son hostiles en móvil, y el juego se juega desde el teléfono entre ticks.
4. **Cero huérfanos.** Toda página alcanzable en dos clics desde la cabecera. Si algo no merece
   estar en la navegación, no merece existir.
5. **El dashboard decide, no repite.** Su trabajo es responder "¿qué hago ahora?", no listar
   secciones que ya están en el menú.
6. **Nombres del dominio, no del código.** El jugador entiende "Contract", no "Market".

---

## 3. Estructura propuesta

### 3.1 Barra principal (nivel 1)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚴 Cycling Star        Day 137 · Season 1 · next tick 2h 14m    [👤] │
├──────────────────────────────────────────────────────────────────────┤
│  Dashboard   My Rider   My Team*   World                        News• │
└──────────────────────────────────────────────────────────────────────┘
```

- **4 destinos** (5 con News), frente a 12. Caben en móvil sin colapsar.
- `My Team` aparece **solo si el usuario gestiona un equipo** (ya existe `getAccountControl`).
- `News` va a la derecha con indicador de no leídas: es consulta, no navegación.
- Sin sesión, la barra se reduce a: `World` · `How to play` · `Log in` · `Sign up`.

### 3.2 Pestañas de contexto (nivel 2)

Cada sección tiene su propia barra de pestañas, que sustituye a la tira plana actual.

**My Rider**

```
Profile │ Training │ Race orders │ My races │ Contract │ Finances
```

**My Team** (solo mánagers)

```
Squad │ Race calendar │ Training │ Finances
```

**World**

```
Calendar │ Teams │ Nations │ Rankings │ Hall of Fame
```

### 3.3 Mapa de rutas completo

| Ruta nueva                                | Página actual                     | Cambio                                                       |
| ----------------------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `/`                                       | `Home`                            | Rediseñado (ver §4)                                          |
| `/me`                                     | —                                 | Redirige a `/me/profile`                                     |
| `/me/profile`                             | `RiderProfile` (`/rider`)         | Movida                                                       |
| `/me/training`                            | `Training` (`/training`)          | Movida                                                       |
| `/me/orders`                              | `RaceOrders` (`/race-orders`)     | Movida y renombrada                                          |
| `/me/races`                               | `MyRaces` (`/races`)              | Movida; **absorbe `/race-entry`** como pestaña interna       |
| `/me/contract`                            | `Market` (`/market`)              | Movida y renombrada                                          |
| `/me/finances`                            | `Finances` (`/finances`)          | Movida                                                       |
| `/team/squad`                             | `Team` filtrado al propio         | Nueva vista del equipo propio                                |
| `/team/calendar`                          | `TeamCalendar` (`/team-calendar`) | **Rescatada del olvido**                                     |
| `/team/training`                          | (existe API `team-training`)      | Expuesta                                                     |
| `/team/finances`                          | —                                 | Futuro                                                       |
| `/world/calendar`                         | `Calendar` (`/calendar`)          | Movida                                                       |
| `/world/races/:raceId`                    | `Race` (`/races/:raceId`)         | **Resuelve la colisión**                                     |
| `/world/races/:raceId/stages/:day`        | `StageReplay`                     | Movida                                                       |
| `/world/teams` · `/world/teams/:id`       | `Teams` · `Team`                  | Movidas                                                      |
| `/world/nations` · `/world/nations/:code` | `Countries` · `Country`           | Movidas y renombradas                                        |
| `/world/rankings`                         | `Rankings`                        | Movida                                                       |
| `/world/hall-of-fame`                     | `HallOfFame`                      | Movida                                                       |
| `/world/riders/:id`                       | `PublicRider`                     | Movida                                                       |
| `/news`                                   | `News`                            | Se queda arriba                                              |
| `/account` · `/how-to-play` · `/privacy`  | iguales                           | Sin cambio                                                   |
| `/login` · `/register` · `/create`        | iguales                           | Sin cambio                                                   |
| `/admin/*`                                | `AdminNames`                      | Sin cambio (no enlazada, a propósito)                        |
| ~~`/routes`~~                             | `RoutesPage`                      | **Eliminar** (resto de desarrollo) o mover a `/admin/routes` |

**Compatibilidad:** todas las rutas viejas se mantienen como redirecciones permanentes a las nuevas
durante una temporada, para no romper enlaces guardados ni los que aparecen en noticias.

### 3.4 Dos decisiones que merecen justificación

**`/race-entry` desaparece como página y se convierte en pestaña de `/me/races`.**
Hoy son la misma pregunta partida en dos sitios inconexos: "¿en qué carreras estoy?" y "¿a cuáles
puedo apuntarme?". Propuesta:

```
/me/races   →   [ Upcoming ]  [ Available to enter ]  [ Results ]
```

Así el agente libre **descubre** que puede inscribirse, porque está a un clic de donde ya iba a mirar.

**`Market` pasa a llamarse `Contract`.**
No hay mercado entre usuarios en el MVP (está explícitamente fuera de alcance en `MVP.md §2`). Lo
que la página muestra es tu contrato actual y tus ofertas. Cuando exista mercado real en v1.1,
`World → Market` será su sitio natural, y no habrá que renombrar nada.

---

## 4. El dashboard: de espejo a copiloto

Hoy el dashboard repite el menú. Propuesta: que responda **una sola pregunta** —"¿qué hago hoy?"— con
una jerarquía de urgencia.

```
┌─ Day 137 · Season 1 ─────────────── next tick in 2h 14m ─┐
│                                                           │
│  ⚠️  ACCIÓN REQUERIDA                                     │
│  You race tomorrow: Race Catalonia, stage 3 (mountain)    │
│  You have no orders set.               [ Set orders → ]   │
│                                                           │
│  📋 Training queue empty in 2 days     [ Plan week → ]    │
│  📝 2 contract offers waiting          [ Review → ]       │
├───────────────────────────────────────────────────────────┤
│  Form ████████░░  Fresh    Matches 🔥🔥🔥🔥🔥              │
│  Season points 340 · Money 12,400 · Morale 72 · Fame 41   │
├───────────────────────────────────────────────────────────┤
│  LAST RACE — Race Galicia, stage 2            [ Full → ]  │
│  9th at 1'42"  ·  You were in the front group until km 148│
└───────────────────────────────────────────────────────────┘
```

Reglas:

- **Solo se muestra lo accionable.** Sin órdenes pendientes ni ofertas, esos bloques no aparecen.
- **Orden por urgencia**, no por sección: lo que caduca con el próximo tick va primero.
- **Los atajos de sección desaparecen**: para eso está el menú, que ahora es legible.

---

## 5. Navegación en móvil

El juego se consulta desde el teléfono entre ticks, así que esto no es un añadido:

- **Barra inferior fija** con los 4 destinos de nivel 1 (patrón de app nativa, alcanzable con el
  pulgar), en lugar del menú de hamburguesa actual.
- Las **pestañas de nivel 2** se convierten en una tira con desplazamiento horizontal bajo la
  cabecera.
- La cabecera se reduce a logo + reloj del mundo + avatar.
- Se resuelve de paso el problema de accesibilidad del menú actual, que no gestiona el foco al
  abrirse (`Header.tsx:129`).

---

## 6. Antes y después

|                                 | Hoy                  | Propuesta             |
| ------------------------------- | -------------------- | --------------------- |
| Destinos de nivel 1             | 12 en una tira plana | 4 (+ News)            |
| Páginas inalcanzables           | 3                    | 0                     |
| Colisiones de URL               | 1 (`/races`)         | 0                     |
| Niveles de jerarquía            | 1                    | 2                     |
| Sitios donde gestionar "lo mío" | 6 hermanos sueltos   | 1 sección, 6 pestañas |
| Función del dashboard           | Repetir el menú      | Decir qué hacer hoy   |

---

## 7. Plan de implementación por fases

Cada fase deja la aplicación funcionando y es desplegable por separado.

**Fase A — Rescate (1 sesión).** Enlazar `/race-entry` y `/team-calendar` en el menú actual y
decidir el destino de `/routes`. Sin refactor. _Elimina hoy mismo el daño real: hay funcionalidad
pagada e invisible._

**Fase B — Estructura (1-2 sesiones).** Nuevo mapa de rutas con redirecciones desde las viejas.
Cabecera de dos niveles. Nombres nuevos (`Contract`, `My races`). Fusión de `/race-entry` como
pestaña.

**Fase C — Dashboard (1 sesión).** Panel de urgencia con bloques condicionales.

**Fase D — Móvil (1 sesión).** Barra inferior y pestañas desplazables.

Nota de coordinación: la Fase B toca `App.tsx` y `Header.tsx`, que también toca el trabajo de
`code-splitting` con `React.lazy`. Conviene hacer B **después** de que ese trabajo esté fusionado, o
resolver el conflicto conscientemente.

---

## 8. Cuestiones abiertas para decidir

1. **`/routes`**: ¿borrar, o conservar como herramienta de administración para revisar altimetrías?
   Relacionado con el rediseño de perfiles de carrera (283 de 307 son procedurales).
2. **`My Team`**: ¿cuánto peso tendrá el rol de mánager en el MVP? Si crece, quizá merezca ser una
   esfera de primer nivel permanente y no condicional.
3. **`News`**: ¿feed global, personal, o dos pestañas? Hoy conviven ambos conceptos.
4. **Perfil público del corredor**: `/world/riders/:id` frente a `/me/profile` — ¿la misma página con
   distinto modo, o dos páginas distintas? Hoy son dos (`PublicRider` y `RiderProfile`), con
   duplicación entre ellas.

# Propuesta de navegación e arquitectura de información

Estado: **propuesta en discusión, v2.** Incorpora la primera ronda de comentarios del dueño.
No implementada. Sustituiría a `apps/web/src/components/Header.tsx` y al mapa de rutas de
`apps/web/src/App.tsx`.

> **Nota de alcance.** El problema no es solo el menú. Es igual de grave el **contenido y la
> navegación dentro de las páginas**, sobre todo en el flujo Calendario → Carrera → Etapa, que hoy
> es la única vía para ver qué pasó en el mundo. Eso se trata en la Parte B.

---

# PARTE A — Estructura de menús

## 1. Diagnóstico: qué está mal hoy

### 1.1 Tres páginas funcionales son inalcanzables

No están en el menú ni enlazadas desde ninguna página. Solo se llega escribiendo la URL:

| Ruta             | Qué contiene                                 | Decisión tomada                                                                        |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `/race-entry`    | Auto-inscripción del agente libre a carreras | **Rehacer**, no rescatar: la página actual no vale. Renace como pestaña de `/me/races` |
| `/team-calendar` | Plan de carreras del equipo                  | **Rescatar** dentro de `My Team`, en solo lectura para miembros                        |
| `/routes`        | Altimetrías de la "vuelta de prueba"         | **Borrar**: prueba de desarrollo que ya no se usa                                      |

### 1.2 Colisión de URLs: `/races` significa dos cosas distintas

```
/races            → MyRaces      (MIS carreras, requiere sesión)
/races/:raceId    → Race         (una carrera del mundo, pública)
```

`/races/:raceId` **no es el detalle de** `/races`. Son conceptos sin relación compartiendo prefijo:
la estructura de URLs miente sobre la jerarquía.

### 1.3 Una tira plana de 12 enlaces sin jerarquía visible

El código **ya tiene** el modelo mental correcto (`Header.tsx:14-30`) —`WORLD_LINKS` y
`RIDER_LINKS`— y lo destruye al pintar (`Header.tsx:44`) concatenándolos en **una sola fila
indiferenciada de 12 elementos**. La distinción existe en el código y es invisible para el jugador.

### 1.4 "Lo mío" desperdigado y nomenclatura incoherente

Siete destinos hermanos sin relación declarada. Dos conceptos de "órdenes" sin distinguir
(entrenamiento y carrera, este último etiquetado solo "Orders"). El panel de inicio
(`Home.tsx:13-19`) **repite** cinco de los seis enlaces del menú sin priorizar nada. Y "Market"
nombra un mercado que no existe en el MVP: lo que hay es **tu contrato y tus ofertas**.

---

## 2. Principios

1. **Tres esferas, no una lista.** Todo es _yo_, _mi equipo_ o _el mundo_.
2. **La URL es la jerarquía.** Nunca dos conceptos distintos bajo el mismo prefijo.
3. **Dos niveles como máximo.** Sección arriba, pestañas debajo. Sin desplegables anidados: el juego
   se consulta desde el teléfono.
4. **Cero huérfanos.** Si algo no merece estar en la navegación, no merece existir.
5. **El dashboard decide, no repite.**
6. **Nombres del dominio.** El jugador entiende "Contract", no "Market".
7. **Nada cambia de sitio según mi estado.** Un concepto vive siempre en el mismo lugar, tenga yo
   equipo o no. Cambiar la ubicación según la situación es lo que más cuesta aprender.

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

- **4 destinos** frente a 12.
- `My Team` aparece **si pertenezco a un equipo**, no solo si lo gestiono (ver §3.4).
- Sin sesión: `World` · `News` · `How to play` · `Log in` · `Sign up`.

### 3.2 My Rider

```
Profile │ Training │ Race orders │ My races │ Contract │ Finances
```

**`My races` (antes `/races` + `/race-entry`)** — resuelve la pregunta "¿cuándo corro?" en un sitio:

| Pestaña interna        | Contenido                                                                   | Visible           |
| ---------------------- | --------------------------------------------------------------------------- | ----------------- |
| **Upcoming**           | Carreras en las que me ha inscrito mi equipo, o en las que me apunté yo     | Siempre           |
| **Available to enter** | Carreras a las que aún estoy a tiempo de inscribirme, con su coste de viaje | Solo agente libre |
| **Results**            | Mis carreras corridas, con mi puesto y enlace a la etapa                    | Siempre           |

La página `/race-entry` actual **se borra y se rehace** como la pestaña _Available to enter_.

**`Contract` (antes `Market`)** — mi contrato actual, mi salario, y **mis ofertas**.

> **Decisión: las ofertas viven aquí, tenga equipo o no.** Puedo recibir ofertas _estando_ en un
> equipo —es el mercado normal—, así que ponerlas en `My Team` las haría cambiar de sitio según mi
> situación, contra el principio 7. Una oferta es un hecho de _mi_ carrera, no de un equipo al que
> aún no pertenezco.

### 3.3 World

```
Calendar │ Races │ Teams │ Nations │ Rankings │ Hall of Fame
```

`Races` es nuevo y es importante: hoy **el calendario es la única puerta** para llegar a un
resultado. Ver §6.

### 3.4 My Team — para miembros, no solo para mánagers

Hoy no existen mánagers humanos (todos son bots), pero **un corredor sí pertenece a un equipo**, y
eso ya da contenido de sobra. Se define el mapa completo desde ahora, marcando qué llega después.

```
Squad │ Race calendar │ Identity │ Finances*
```

| Pestaña           | Miembro (hoy)                                                       | Mánager (futuro)        |
| ----------------- | ------------------------------------------------------------------- | ----------------------- |
| **Squad**         | Mis compañeros: quiénes son, su nivel, su especialidad, su palmarés | Fichar, roles, despedir |
| **Race calendar** | A qué carreras va mi equipo — y por tanto dónde pueden mandarme     | Elegir el calendario    |
| **Identity**      | Maillot, país, filosofía, división, historia                        | Editar maillot y nombre |
| **Finances**      | (oculto)                                                            | Presupuesto y nóminas   |
| _Team forum_      | Idea a valorar; fuera del MVP por necesitar moderación              | —                       |

**Si no pertenezco a ningún equipo**, `My Team` no aparece en la barra. Mi situación de agente libre
y mis ofertas están en `My Rider → Contract`, que es donde siempre están.

> Nota: el foro de equipo introduciría el **primer texto libre del juego**, y con él la necesidad de
> moderación, que `MVP.md §2` da explícitamente por no necesaria. Es un buen candidato a v1.1, no al
> MVP.

### 3.5 News — feed global, sobrio y con filtros

Mismo feed para todos, sin personalizar. Se le añaden filtros para responder preguntas concretas:

```
[ All ]  [ Team ▾ ]  [ Rider ▾ ]  [ Nation ▾ ]  [ Race ▾ ]
```

Diseño más sobrio que el actual: menos iconos, más jerarquía tipográfica, agrupado por día de juego.

### 3.6 Perfil del corredor: una página, dos modos

Hoy hay **dos páginas distintas** (`PublicRider.tsx` y `RiderProfile.tsx`) con duplicación entre
ellas. Propuesta: **una sola página** con un _modo propietario_ que añade lo privado.

| Público (cualquiera, sin sesión) | Añadido si es mi corredor          |
| -------------------------------- | ---------------------------------- |
| Identidad, país, equipo, edad    | **Frescura y fatiga**              |
| Estrellas por atributo           | Gráfica de forma (CTL/ATL/TSB)     |
| Palmarés, resultados, ranking    | Cerillos, moral, techos, objetivos |

Una página, un componente, sin duplicar. Y lo privado nunca sale en la vista pública.

### 3.7 Mapa de rutas

| Ruta nueva                                | Hoy                      | Cambio                                     |
| ----------------------------------------- | ------------------------ | ------------------------------------------ |
| `/`                                       | `Home`                   | Rediseñado (§4)                            |
| `/me/profile`                             | `/rider`                 | Movida; unificada con la pública (§3.6)    |
| `/me/training`                            | `/training`              | Movida                                     |
| `/me/orders`                              | `/race-orders`           | Movida                                     |
| `/me/races`                               | `/races` + `/race-entry` | Fusionadas en pestañas (§3.2)              |
| `/me/contract`                            | `/market`                | Movida y renombrada                        |
| `/me/finances`                            | `/finances`              | Movida                                     |
| `/team/squad`                             | —                        | **Nueva** (lectura para miembros)          |
| `/team/calendar`                          | `/team-calendar`         | **Rescatada**                              |
| `/team/identity`                          | —                        | Nueva                                      |
| `/world/calendar`                         | `/calendar`              | Movida                                     |
| `/world/races`                            | —                        | **Nueva**: índice de carreras y resultados |
| `/world/races/:raceId`                    | `/races/:raceId`         | **Resuelve la colisión**                   |
| `/world/races/:raceId/stages/:day`        | `.../stages/:day`        | Movida                                     |
| `/world/teams` · `/world/teams/:id`       | `/teams` · `/teams/:id`  | Movidas                                    |
| `/world/nations` · `/world/nations/:code` | `/countries` · `/:code`  | Movidas y renombradas                      |
| `/world/rankings` · `/world/hall-of-fame` | iguales                  | Movidas                                    |
| `/world/riders/:id`                       | `/riders/:id`            | Movida; misma página que `/me/profile`     |
| `/news`                                   | `/news`                  | Se queda arriba, con filtros (§3.5)        |
| ~~`/routes`~~                             | `RoutesPage`             | **Eliminada**                              |

Las rutas viejas se mantienen como redirecciones permanentes durante una temporada.

---

## 4. El dashboard: de espejo a copiloto

```
┌─ Day 137 · Season 1 ─────────────── next tick in 2h 14m ─┐
│  ⚠️  You race tomorrow: Catalonia, stage 3 (mountain)     │
│      You have no orders set.           [ Set orders → ]   │
│  📋 Training queue empty in 2 days     [ Plan week → ]    │
│  📝 2 contract offers waiting          [ Review → ]       │
├───────────────────────────────────────────────────────────┤
│  Form ████████░░ Fresh   Matches 🔥🔥🔥🔥🔥                │
│  Season points 340 · Money 12,400 · Morale 72 · Fame 41   │
├───────────────────────────────────────────────────────────┤
│  LAST RACE — Galicia, stage 2                 [ Full → ]  │
│  9th at 1'42" · In the front group until km 148           │
└───────────────────────────────────────────────────────────┘
```

Solo aparece lo accionable, ordenado por urgencia (lo que caduca con el próximo tick va primero).
Sin atajos de sección: para eso está el menú.

## 5. Móvil

Barra inferior fija con los 4 destinos (patrón nativo, alcanzable con el pulgar) en lugar del menú
de hamburguesa; pestañas de nivel 2 con desplazamiento horizontal. Resuelve de paso que el menú
actual no gestiona el foco al abrirse (`Header.tsx:129`).

---

# PARTE B — El flujo Calendario → Carrera → Etapa

Esta es la parte que peor está, y la que más se usa: es **la única forma de ver qué pasa en el
mundo**.

## 6. Diagnóstico, con evidencia

### 6.1 El calendario es la única puerta de entrada

Para ver el resultado de lo último hay que ir al calendario, buscar la carrera por día de juego,
desplegarla y entrar. **No existe "resultados recientes" en ninguna parte.** El calendario en sí no
está mal (tiene filtros por división y acordeón), pero está haciendo un trabajo que no le toca.

→ Se añade **`World → Races`**: índice de carreras con lo último corrido arriba, buscador y filtros.
El calendario se queda con lo suyo, que es la línea temporal de la temporada.

### 6.2 La página de carrera lo apila todo, y no sabe en qué momento está

`Race.tsx` renderiza **de una vez y siempre**: cabecera, aviso de "no corrida", lista de inscritos,
**una altimetría SVG por cada etapa**, la general **completa y sin truncar**, los ganadores de etapa
y el palmarés.

Para Race France (21 etapas, 176 corredores) eso es **21 altimetrías + una tabla de 176 filas** en
un scroll infinito. Y mezcla información **previa** (inscritos, recorrido) con **posterior**
(general, ganadores): las dos a la vez, corra o no corra la carrera.

**El problema de fondo no es la cantidad, es que la página no tiene noción de estado.** Una carrera
está _por correr_, _en curso_ (una vuelta dura días) o _terminada_, y cada estado pide un contenido
principal distinto.

### 6.3 La página de etapa es un callejón sin salida

`StageReplay.tsx` tiene **un solo enlace: "← Back to the race"**. No hay anterior/siguiente: para
leer las 21 crónicas de una gran vuelta hay que volver atrás 21 veces. El título dice solo
"Stage 4" — **no menciona a qué carrera pertenece**.

Y apila seis secciones a la vez: contrarreloj, crónica, resultado, general, montaña y puntos.

### 6.4 Incoherencia entre las dos páginas

|                                       | Filas que muestra                               |
| ------------------------------------- | ----------------------------------------------- |
| Etapa (`StageReplay.tsx:305,334,378`) | **Trunca a 15 / 15 / 10, sin forma de ver más** |
| Carrera (`Race.tsx:277`)              | **Todas** (176 en una gran vuelta)              |

Es decir: **no se puede consultar el resultado completo de una etapa**, y a la vez la general te
sepulta. Ninguna de las dos decisiones es la correcta.

## 7. Propuesta: pestañas + estado

Sí a las pestañas, pero con la pestaña por defecto elegida según el estado de la carrera.

### 7.1 Página de carrera

Cabecera **persistente** (nombre, bandera, clase, fechas, ganador si ya se corrió) que no cambia al
cambiar de pestaña, y debajo:

| Estado de la carrera | Pestañas                                                  | Por defecto         |
| -------------------- | --------------------------------------------------------- | ------------------- |
| **Por correr**       | `Route` · `Startlist` · `Roll of honour`                  | **Route**           |
| **En curso**         | `Classifications` · `Stages` · `Route` · `Startlist`      | **Classifications** |
| **Terminada**        | `Classifications` · `Stages` · `Route` · `Roll of honour` | **Classifications** |

- **Classifications**: general, puntos y montaña como sub-pestañas, con top 20 y "mostrar todos".
- **Stages**: lista compacta —día, tipo, recorrido, ganador, enlace a la crónica—, **sin** volcar 21
  altimetrías.
- **Route**: ahí sí van las altimetrías, que es donde el jugador las busca.

### 7.2 Página de etapa

```
← Race Catalonia · Stage 3 of 7          [ ‹ Prev ]  [ Next › ]
──────────────────────────────────────────────────────────────
[ Story ]  [ Result ]  [ Classifications ]  [ Profile ]
```

- **Cabecera con contexto**: a qué carrera pertenece y qué etapa es de cuántas.
- **Anterior / siguiente**: se pueden leer las 21 crónicas seguidas.
- **Story por defecto**: es la carga emocional de la etapa (y donde entra la telemetría nueva del
  motor — ver `docs/motor.md` §16 y la vista de espectador de su Parte IV).
- **Result completo**, con truncado y "mostrar todos", igual que en la carrera.

### 7.3 Regla común de tablas

Una sola convención en todo el juego: **top 20 visible + "Show all"**. Ni truncar sin salida ni
volcar 176 filas.

---

## 8. Plan por fases

Cada fase deja la aplicación funcionando y es desplegable por separado.

| Fase  | Trabajo                                                                                                   | Sesiones |
| ----- | --------------------------------------------------------------------------------------------------------- | -------- |
| **A** | **Rescate**: enlazar `/team-calendar`, borrar `/routes`. Sin refactor.                                    | 0,5      |
| **B** | **Flujo de carrera** (Parte B): pestañas + estado, `World → Races`, prev/next en etapa, regla de tablas   | 2-3      |
| **C** | **Estructura** de menús: rutas nuevas con redirecciones, cabecera de dos niveles, `My Team` para miembros | 1-2      |
| **D** | **`My races`** rehecha con sus tres pestañas (sustituye a `/race-entry`)                                  | 1        |
| **E** | **Dashboard** de urgencia y **News** con filtros                                                          | 1        |
| **F** | **Perfil unificado** (público + modo propietario)                                                         | 1        |
| **G** | **Móvil**: barra inferior y pestañas desplazables                                                         | 1        |

> **La Fase B va antes que la A-estructural a propósito**: es donde está el daño real de uso diario.
> Arreglar el menú sin arreglar el flujo de carrera dejaría bonito el camino hacia una página mala.

Nota de coordinación: la fase C toca `App.tsx` y `Header.tsx`, ya modificados por el trabajo de
`React.lazy` ya fusionado. No hay conflicto pendiente, pero conviene hacerla de una sentada.

---

## 9. Cuestiones abiertas

1. **Foro de equipo**: introduce el primer texto libre del juego y con él la moderación. ¿v1.1?
2. **`World → Races` frente a `World → Calendar`**: ¿dos páginas, o una con dos vistas (línea
   temporal / índice)? Me inclino por dos: responden a preguntas distintas ("¿qué viene?" y "¿qué
   pasó?").
3. **Etapas de una carrera en curso**: ¿mostrar las etapas futuras con su recorrido, o solo las ya
   corridas?
4. **Vista de espectador de la etapa**: cuánto de la telemetría nueva del motor cabe aquí sin
   abrumar. Depende del trabajo de `docs/motor.md` §16.

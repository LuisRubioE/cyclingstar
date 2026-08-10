# Fuentes de los recorridos reales

Los recorridos de las clásicas del WorldTour que hay en `packages/engine/src/routes/classicRoutes.ts`
**no son autoría propia**: salen de fuentes abiertas. Este documento es la atribución que esas fuentes
exigen y el registro de cómo se extrajo cada uno.

La misma información, campo a campo y junto al dato, vive en `CLASSIC_ROUTE_SOURCES` (mismo fichero):
si alguien lee el código sin leer estas páginas, la procedencia sigue estando delante de sus ojos.

## Licencias

| Fuente                                              | Licencia        | Qué obliga                                                     |
| --------------------------------------------------- | --------------- | -------------------------------------------------------------- |
| [Wikidata](https://www.wikidata.org)                | CC0 1.0         | Nada. Se cita igualmente por trazabilidad                      |
| [Wikipedia](https://www.wikipedia.org)              | CC BY-SA 4.0    | **Atribuir** al artículo concreto y mantener la misma licencia |
| [OpenTopoData / SRTM](https://www.opentopodata.org) | Dominio público | Nada. Hoy no se usa en el dato cargado                         |

De Wikidata sale la entidad de cada edición y su distancia oficial (propiedad `P3157`). De Wikipedia
salen las **tablas de montes y de sectores de pavé**: son el trabajo de sus editores y por eso cada
carrera cargada lleva el enlace al artículo exacto y la fecha en que se leyó.

**No se ha consultado procyclingstats.com**, ni directamente ni a través de cachés, espejos o
proxies: su `robots.txt` nos prohíbe el paso. Algún artículo de Wikipedia cita a PCS entre sus
referencias; el enlace no se ha seguido — lo que se ha leído es el artículo de Wikipedia.

## Higiene con las fuentes

- User-agent honesto y fijo en toda petición: `cyclingstar-data/1.0 (contacto: luis.bidaiak@gmail.com)`.
- Nunca dos peticiones simultáneas al mismo servidor, con pausa mínima entre ellas (0,7 s en Wikimedia).
- Todo cacheado en disco: una segunda pasada cuesta cero peticiones.
- `robots.txt` comprobado antes de tocar cualquier sitio nuevo. Por eso Overpass quedó descartado
  (`Disallow: /api/`, y su endpoint es `/api/interpreter`).

## Qué se cargó y de dónde

| Carrera del juego      | Carrera real          | Edición | Artículo (CC BY-SA)                                                                          | Qué trae                    |
| ---------------------- | --------------------- | ------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| `race-roubaix`         | Paris-Roubaix         | 2026    | [it: Parigi-Roubaix 2026](https://it.wikipedia.org/wiki/Parigi-Roubaix_2026)                 | 31 tramos de pavé (54,8 km) |
| `race-flanders`        | Ronde van Vlaanderen  | 2026    | [fr: Tour des Flandres 2026](https://fr.wikipedia.org/wiki/Tour_des_Flandres_2026)           | 16 muros + 6 sectores       |
| `race-lombardy`        | Il Lombardia          | 2025    | [fr: Tour de Lombardie 2025](https://fr.wikipedia.org/wiki/Tour_de_Lombardie_2025)           | 7 puertos                   |
| `race-opening-classic` | Omloop Het Nieuwsblad | 2024    | [fr: Circuit Het Nieuwsblad 2024](https://fr.wikipedia.org/wiki/Circuit_Het_Nieuwsblad_2024) | 12 muros + 9 sectores       |
| `race-harelbeke`       | E3 Saxo Classic       | 2025    | [fr: E3 Saxo Bank Classic 2025](https://fr.wikipedia.org/wiki/E3_Saxo_Bank_Classic_2025)     | 17 muros + 5 sectores       |
| `race-across-flanders` | Dwars door Vlaanderen | 2024    | [de: Dwars door Vlaanderen 2024](https://de.wikipedia.org/wiki/Dwars_door_Vlaanderen_2024)   | 12 hellingen + 8 sectores   |
| `race-frankfurt`       | Eschborn-Frankfurt    | 2023    | [de: Eschborn–Frankfurt 2023](https://de.wikipedia.org/wiki/Eschborn%E2%80%93Frankfurt_2023) | 5 cotas (de 8 publicadas)   |
| `race-hamburg`         | Cyclassics Hamburg    | 2024    | [de: Cyclassics Hamburg 2024](https://de.wikipedia.org/wiki/Cyclassics_Hamburg_2024)         | 3 cotas + 3 sprints         |
| `race-white-roads`     | Strade Bianche        | 2024    | [fr: Strade Bianche 2024](https://fr.wikipedia.org/wiki/Strade_Bianche_2024)                 | 15 sectores de _sterrato_   |

Las entidades de Wikidata (CC0) de cada edición están en `CLASSIC_ROUTE_SOURCES[...].wikidata`.

## Reglas de la carga

1. **Se usa la edición más reciente que publique tabla de dificultades**, no necesariamente la de
   2026: muchos artículos del año en curso son todavía un esbozo. La edición usada se anota siempre,
   porque cambia el dato: el Omloop de 2024 mide 202,2 km y el de 2026, 207,2.
2. **La distancia y las tablas salen de la misma edición.** Mezclar la distancia de 2026 con los
   kilometrajes de 2024 descoloca todos los rasgos.
3. **Nada se inventa.** Si la fuente no publica una cota, no se rellena (Eschborn-Frankfurt se carga
   con cinco de sus ocho). Si publica el dato pero no su dureza, se asume la media y se anota.
4. **El km de una tabla no siempre significa lo mismo**: en las tablas francesas de montes flamencos
   y en la alemana de "pasajes" marca el PIE del muro; en las tablas de premios de montaña (Lombardía,
   Frankfurt, Hamburgo, que llevan la altitud de la cima al lado) marca la CIMA. Se interpreta tabla a
   tabla y se anota en las notas de cada carrera.
5. **Un muro adoquinado va como puerto, no como sector de pavé.** El muestreo del motor da un solo
   terreno por bloque y solo cobra el adoquín en segmentos `paves`: si el Koppenberg fuese pavé, se
   perdería la subida, que es lo que decide. En `cobbles` va únicamente el pavé llano.
6. **Cuando dos fuentes se contradicen, manda la que cuadra con la distancia oficial.** La tabla
   italiana de Paris-Roubaix pone el sector 22 en el km 135,5, encima del sector 23; la francesa lo
   pone en 137,5 y encaja. Se usa 137,5 y queda anotado.
7. **Una pendiente MÁXIMA no es una pendiente media.** La tabla de Strade Bianche publica, para nueve
   de sus quince sectores, la longitud de la rampa y su pendiente máxima (hasta el 18 %). Eso no es un
   puerto cargable: tomar el máximo por la media inventaría la carrera. Se cargan los sectores y se
   anota lo que queda fuera.

## Strade Bianche: por qué entra en la v12 y no antes

Se dejó fuera a propósito mientras `shatter()` solo descolgaba en subida: una carrera cuya ÚNICA
dificultad publicada es el _sterrato_ no podía existir en un motor donde el firme roto solo costaba
energía. La v12 (docs/motor.md §14) extiende la selección al pavé con PAV y escalada por estrellas, y
Strade Bianche es la carrera que más partido le saca: 70,5 km de sus 215 son sterrato, con dureza
real publicada de 1 a 5 estrellas —es, con Paris-Roubaix, la única del calendario cuya dureza no hay
que asumir— y con los dos pasos por Colle Pinzuto y Le Tolfe dentro de los últimos 20 km.

Lo que sigue faltando y hay que saber: **la rampa de Via Santa Caterina** (el 16 % de adoquín que
lleva a la Piazza del Campo) **no está**, porque la fuente no publica ninguna cota. El final se
resuelve, por tanto, como llegada de pavé y no como el repecho brutal que es en la realidad.

## Lo que NO se cargó, y por qué

| Carrera                                                                                               | Motivo                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `race-bruges`, `race-copenhagen`, `race-brittany`, `race-quebec`, `race-montreal`, `race-great-ocean` | Sin tabla de dificultades en ningún idioma probado (fr, it, nl, en, de, es, da) ni en las ediciones 2023-2026            |
| `race-rhone-alpes`, `race-poland`, `race-benelux`, `race-guangxi`                                     | Vueltas por etapas: harían falta tablas **por etapa** y no existen. El artículo del Dauphiné 2026 en frwiki son 47 bytes |

## Cómo repetir o ampliar la extracción

Los scripts viven fuera del repositorio (son herramienta de una vez, no código de producto). El
procedimiento, para quien tenga que repetirlo:

1. Buscar la edición en Wikidata (`wbsearchentities` con el nombre real y el año) y quedarse con
   `P3157` (distancia), `P1427`/`P1444` (salida y meta).
2. Bajar el wikitexto del artículo (`action=parse&prop=wikitext`) y partirlo en tablas.
3. Reconocer el formato de la tabla y traducirlo a `climbs` / `cobbles` / `sprints`.
4. Retroceder de edición mientras no aparezca tabla (2026 → 2025 → 2024 → 2023).
5. Validar con `packages/engine/src/routes/classicRoutes.test.ts`, que comprueba distancias, orden de
   las cimas, solapes de pavé y que el perfil pasa por `sampleProfile()`.

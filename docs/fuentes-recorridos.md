# Fuentes de los recorridos reales

Los recorridos de las clásicas del WorldTour que hay en `packages/engine/src/routes/classicRoutes.ts`
—y los de las carreras por etapas que hay en `stageFeatures.ts`— **no son autoría propia**: salen de
fuentes abiertas. Este documento es la atribución que esas fuentes exigen y el registro de cómo se
extrajo cada uno.

La misma información, campo a campo y junto al dato, vive en `CLASSIC_ROUTE_SOURCES` y en
`STAGE_ROUTE_SOURCES` (`classicRoutes.ts`): si alguien lee el código sin leer estas páginas, la
procedencia sigue estando delante de sus ojos.

## Licencias

| Fuente                                              | Licencia                          | Qué obliga                                                                                                                                  |
| --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [Wikidata](https://www.wikidata.org)                | CC0 1.0                           | Nada. Se cita igualmente por trazabilidad                                                                                                   |
| [Wikipedia](https://www.wikipedia.org)              | CC BY-SA 4.0                      | **Atribuir** al artículo concreto y mantener la misma licencia                                                                              |
| [OpenTopoData / SRTM](https://www.opentopodata.org) | Dominio público                   | Nada. Hoy no se usa en el dato cargado                                                                                                      |
| Web oficial de la carrera                           | Con todos los derechos reservados | No se copia su página: se leen HECHOS (km, longitud, pendiente, categoría), que no son obra protegible. Se cita igualmente el enlace exacto |

De Wikidata sale la entidad de cada edición y su distancia oficial (propiedad `P3157`). De Wikipedia
salen las **tablas de montes y de sectores de pavé**: son el trabajo de sus editores y por eso cada
carrera cargada lleva el enlace al artículo exacto y la fecha en que se leyó.

**No se ha consultado procyclingstats.com**, ni directamente ni a través de cachés, espejos o
proxies: su `robots.txt` nos prohíbe el paso. Algún artículo de Wikipedia cita a PCS entre sus
referencias; el enlace no se ha seguido — lo que se ha leído es el artículo de Wikipedia.

## Lo que se cargó SIN relieve, y por qué

Tres clásicas del WorldTour estaban **inventadas enteras**: sin edición, el generador les ponía
recorrido, ciudades y kilómetros. Ahora traen los reales. Lo que **no** traen es el relieve: la
fuente da la distancia y las ciudades, pero **no el km de coronación de cada puerto**, y la regla de
`stageFeatures.ts` es tajante — un puerto solo se anota con km de cima + longitud + pendiente; si
falta uno, se descarta, porque inventarle el sitio es peor que no ponerlo.

| Carrera del juego | Carrera real                  | Edición | Artículo (CC BY-SA)                                                                                            | Qué trae                      |
| ----------------- | ----------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `race-bruges`     | Classic Brugge–De Panne       | 2025    | [en: 2025 Classic Brugge–De Panne](https://en.wikipedia.org/wiki/2025_Classic_Brugge%E2%80%93De_Panne)         | Brugge → De Panne, 196 km     |
| `race-copenhagen` | Copenhagen Sprint             | 2025    | [en: 2025 Copenhagen Sprint (men's race)](<https://en.wikipedia.org/wiki/2025_Copenhagen_Sprint_(men's_race)>) | Roskilde → Copenhagen, 236 km |
| `race-brittany`   | Bretagne Classic Ouest-France | 2025    | [en: Bretagne Classic Ouest-France](https://en.wikipedia.org/wiki/Bretagne_Classic_Ouest-France)               | Plouay → Plouay, 247 km       |

**Y lo que NO se pudo cargar, dicho para que no se vuelva a intentar a ciegas.** El Tour de Pologne
(7 etapas), el Benelux Tour (5) y Guangxi (5) son WorldTour con ciudades y kilómetros reales pero
**relieve inventado**, y siguen así por una razón de fuente, no de tiempo: el artículo de Wikipedia
del Tour de Pologne **no tiene tabla de puertos**, y en la web oficial —cuyo `robots.txt` sí nos deja
pasar (`Disallow:` vacío)— **los perfiles son imágenes**, de las que no se puede leer un km de
coronación. Ahí hace falta otra fuente, no otra tarde.

## Higiene con las fuentes

- User-agent honesto y fijo en toda petición: `cyclingstar-data/1.0 (contacto: luis.bidaiak@gmail.com)`.
- Nunca dos peticiones simultáneas al mismo servidor, con pausa mínima entre ellas (0,7 s en Wikimedia).
- Todo cacheado en disco: una segunda pasada cuesta cero peticiones.
- `robots.txt` comprobado antes de tocar cualquier sitio nuevo. Por eso Overpass quedó descartado
  (`Disallow: /api/`, y su endpoint es `/api/interpreter`).

## Qué se cargó y de dónde

| Carrera del juego      | Carrera real                      | Edición | Artículo (CC BY-SA)                                                                                                                                                                                              | Qué trae                      |
| ---------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `race-roubaix`         | Paris-Roubaix                     | 2026    | [it: Parigi-Roubaix 2026](https://it.wikipedia.org/wiki/Parigi-Roubaix_2026)                                                                                                                                     | 31 tramos de pavé (54,8 km)   |
| `race-flanders`        | Ronde van Vlaanderen              | 2026    | [fr: Tour des Flandres 2026](https://fr.wikipedia.org/wiki/Tour_des_Flandres_2026)                                                                                                                               | 16 muros + 6 sectores         |
| `race-lombardy`        | Il Lombardia                      | 2025    | [fr: Tour de Lombardie 2025](https://fr.wikipedia.org/wiki/Tour_de_Lombardie_2025)                                                                                                                               | 7 puertos                     |
| `race-opening-classic` | Omloop Het Nieuwsblad             | 2024    | [fr: Circuit Het Nieuwsblad 2024](https://fr.wikipedia.org/wiki/Circuit_Het_Nieuwsblad_2024)                                                                                                                     | 12 muros + 9 sectores         |
| `race-harelbeke`       | E3 Saxo Classic                   | 2025    | [fr: E3 Saxo Bank Classic 2025](https://fr.wikipedia.org/wiki/E3_Saxo_Bank_Classic_2025)                                                                                                                         | 17 muros + 5 sectores         |
| `race-across-flanders` | Dwars door Vlaanderen             | 2024    | [de: Dwars door Vlaanderen 2024](https://de.wikipedia.org/wiki/Dwars_door_Vlaanderen_2024)                                                                                                                       | 12 hellingen + 8 sectores     |
| `race-frankfurt`       | Eschborn-Frankfurt                | 2023    | [de: Eschborn–Frankfurt 2023](https://de.wikipedia.org/wiki/Eschborn%E2%80%93Frankfurt_2023)                                                                                                                     | 5 cotas (de 8 publicadas)     |
| `race-hamburg`         | Cyclassics Hamburg                | 2024    | [de: Cyclassics Hamburg 2024](https://de.wikipedia.org/wiki/Cyclassics_Hamburg_2024)                                                                                                                             | 3 cotas + 3 sprints           |
| `race-white-roads`     | Strade Bianche                    | 2024    | [fr: Strade Bianche 2024](https://fr.wikipedia.org/wiki/Strade_Bianche_2024)                                                                                                                                     | 15 sectores de _sterrato_     |
| `race-great-ocean`     | Cadel Evans Great Ocean Road Race | 2025    | [fr: Cadel Evans Great Ocean Road Race 2025](https://fr.wikipedia.org/wiki/Cadel_Evans_Great_Ocean_Road_Race_2025)                                                                                               | 4 pasos por Challambra        |
| `race-quebec`          | GP cycliste de Québec             | 2025    | [fr: Grand Prix cycliste de Québec 2025](https://fr.wikipedia.org/wiki/Grand_Prix_cycliste_de_Qu%C3%A9bec_2025) + [fr: artículo general](https://fr.wikipedia.org/wiki/Grand_Prix_cycliste_de_Qu%C3%A9bec)       | 18 vueltas x 2 cotas          |
| `race-montreal`        | GP cycliste de Montréal           | 2025    | [fr: Grand Prix cycliste de Montréal 2025](https://fr.wikipedia.org/wiki/Grand_Prix_cycliste_de_Montr%C3%A9al_2025) + [en: artículo general](https://en.wikipedia.org/wiki/Grand_Prix_Cycliste_de_Montr%C3%A9al) | 17 vueltas x 2 de sus 4 cotas |
| `race-liege`           | Liège-Bastogne-Liège              | 2025    | [fr: Liège-Bastogne-Liège 2025](https://fr.wikipedia.org/wiki/Li%C3%A8ge-Bastogne-Li%C3%A8ge_2025)                                                                                                               | 11 cotas                      |
| `race-amstel`          | Amstel Gold Race                  | 2025    | [fr: Amstel Gold Race 2025](https://fr.wikipedia.org/wiki/Amstel_Gold_Race_2025)                                                                                                                                 | 34 cotas                      |
| `race-walloon-wall`    | La Flèche Wallonne                | 2025    | [fr: Flèche wallonne 2025](https://fr.wikipedia.org/wiki/Fl%C3%A8che_wallonne_2025)                                                                                                                              | 11 cotas (3 × Mur de Huy)     |

Las entidades de Wikidata (CC0) de cada edición están en `CLASSIC_ROUTE_SOURCES[...].wikidata`.

### Las tres de los Ardenas: qué cambia y qué NO, dicho con cuidado

Lieja, el Amstel y la Flecha **no estaban inventadas**. Tenían puertos en `stageFeatures.ts` desde
mucho antes, con la procedencia que declara la cabecera de ese fichero («perfiles oficiales /
PCS-La Flamme Rouge»). Lo que cambia con esta tanda son dos cosas distintas:

1. **La atribución.** El dato viejo no citaba artículo, edición ni fecha, así que no se podía
   auditar ni saber de qué año era. El nuevo entra por `CLASSIC_FEATURES` con su `RouteSource` al
   lado, como el resto. Y por eso los tres bloques viejos se han **borrado** de `stageFeatures.ts`:
   ese objeto se construye con `{ ...CLASSIC_FEATURES, …explícitos }` y **el explícito gana**, así
   que dejar los dos habría hecho que el dato citado no llegara nunca al motor.
2. **Un final que estaba mal, y solo en la Flecha.** El dato viejo ponía el tercer y último paso por
   el Mur de Huy en el km 162,8 de una carrera de 200: a **37 km de meta**. La Flecha Valona termina
   ARRIBA del Mur. Ahora el Mur es el km 205,2 de 205,2, que es la línea.

**Medido con `scripts/medir-carrera.mjs`, 12 simulaciones por carrera:**

| carrera           | grupos en meta | cola % (mediana) | % del pelotón en el grupo del ganador | quién gana (de 12)                                  |
| ----------------- | -------------- | ---------------- | ------------------------------------- | --------------------------------------------------- |
| Lieja **antes**   | 6,0            | 6,86             | 19 %                                  | clásicas 4 · **velocidad 4** · escalada 3 · crono 1 |
| Lieja **después** | 7,0            | 7,68             | **4 %**                               | **clásicas 10** · velocidad 1 · escalada 1          |
| Amstel antes      | 7,5            | 10,94            | 38 %                                  | escalada 9 · fondo 1 · clásicas 1 · velocidad 1     |
| Amstel después    | 9,5            | 7,68             | 36 %                                  | escalada 7 · clásicas 3 · velocidad 1 · crono 1     |
| Flecha antes      | 11,5           | 5,99             | 1 %                                   | clásicas 7 · escalada 5                             |
| Flecha después    | 11,5           | 8,08             | 1 %                                   | clásicas 8 · escalada 4                             |

**Lieja es el cambio de verdad.** Antes la ganaba un VELOCISTA cuatro veces de doce y el grupo del
ganador era el 19 % del pelotón: eso no es Lieja-Bastoña-Lieja, es una clásica llana con un repecho.
Con las once cotas en su sitio —la Redoute a 34 km, las Forges a 23 y la Roche-aux-Faucons al 11 % a
13— llegan diez de doce para un hombre de clásicas y el grupo del ganador se queda en el 4 %.

El Amstel y la Flecha se mueven poco, y era esperable: el dato viejo, aunque sin fuente, ya ponía sus
cotas donde van. En el Amstel la única diferencia real es que las cimas dejan de estar todas en un
`.2` sospechosamente uniforme y pasan a ser el pie más la longitud publicada.

### Carreras por etapas

| Carrera del juego  | Carrera real                                         | Edición | Fuente                                                                                                        | Qué trae                                              |
| ------------------ | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `race-rhone-alpes` | Tour Auvergne-Rhône-Alpes (ex Critérium du Dauphiné) | 2026    | [Web oficial, «Cols et côtes» de cada etapa](https://www.criterium-du-dauphine.fr/fr/parcours-general)        | 32 puertos con categoría oficial en 7 de sus 8 etapas |
| `race-guangxi`     | Gree-Tour of Guangxi                                 | 2025    | [fr: Tour du Guangxi 2025](https://fr.wikipedia.org/wiki/Tour_du_Guangxi_2025)                                | El final de Nongla (1 de 6 etapas)                    |
| `race-oman`        | Tour of Oman                                         | 2026    | [Web oficial (ASO), «Mountain passes & hill» de cada etapa](https://www.tour-of-oman.com/en/stage-1)          | 7 cotas en 4 de sus 5 etapas                          |
| `race-arctic`      | Arctic Race of Norway                                | 2026    | [Web oficial (ASO), «Mountain passes & hill» de cada etapa](https://www.arctic-race-of-norway.com/en/stage-1) | 12 cotas CON CATEGORÍA OFICIAL en sus 4 etapas        |
| `race-germany`     | Lidl Deutschland Tour                                | 2026    | [Web oficial (ASO), bloque de cotas de cada etapa](https://www.deutschland-tour.com/de/etappe-1)              | 12 cotas en sus 4 etapas en línea (el prólogo, no)    |

Las tres carreras en circuito (Great Ocean, Québec y Montréal) no traen tabla de cotas: traen el
**circuito** (vueltas, longitud de la vuelta y a cuánto de meta pasa cada cota). Las cimas salen de
la aritmética de ese circuito, no de un km inventado; la función que la hace, `circuitClimbs()`, está
en `classicRoutes.ts` con el detalle.

**Deuda de dato conocida: Montréal (medida en la v22).** De las cuatro cotas por vuelta del
Mont-Royal la fuente solo publica la posición de dos, así que del circuito cargado la única
dificultad de los últimos kilómetros es la rampa de meta de la avenue du Parc, 560 m al 4 % después
de 2,4 km de bajada. Con eso el modelo de final resuelve la carrera como `sprint_masivo` —arrastre de
los últimos 5 km **negativo** (−1,05 %) y dureza de la cota **8,2** contra el umbral de 15 del final
de puncheur— y la gana un velocista 9 veces de 20, cuando el GP de Montréal real es de punchers. **Es
deuda de DATO, no de motor**: bajar `finishPuncheurScore` para que Montréal entre movería el tipo de
final de docenas de etapas del calendario por una carrera cargada a medias. Se arregla el día que
alguien publique dónde caen la Polytechnique y la côte de Pagnuelo dentro de la vuelta.

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
8. **Una carrera en circuito se carga por su circuito.** Great Ocean, Québec y Montréal no publican
   tabla de cotas: publican cuántas vueltas se dan, cuánto mide la vuelta y a cuánto de meta pasa cada
   cota. La cima de cada paso sale de esa aritmética, que no es invención sino la misma suma repetida
   (`circuitClimbs()` en `classicRoutes.ts`). Lo que sí es supuesto —el orden dentro de la vuelta
   cuando la fuente solo dice «X va justo detrás de Y»— se anota carrera a carrera.
9. **La web oficial de la carrera es fuente de primera, cuando publica el dato.** El Tour
   Auvergne-Rhône-Alpes publica «Cols et côtes» etapa por etapa con km de cima, longitud, pendiente
   media y CATEGORÍA OFICIAL: es mejor dato que cualquier Wikipedia y no hay que asumir nada. Se
   comprueba su `robots.txt` como el de cualquier otro sitio (el suyo solo cierra `/admin`, `/api`,
   `/graphql` y `/login`; las páginas de etapa están abiertas).
10. **Un final en alto se ancla al km de SU etapa.** Las distancias de `editions.ts` van en km
    enteros, y el constructor del perfil añade cola de relleno siempre que la distancia de la etapa
    supera el km de la última cima. Si la fuente pone la cima en el km 146,5 de una etapa de 146,5
    (o sea: la cima ES la meta) y la etapa se redondea a 147, quedan 500 m de llano detrás de la
    cima, el último segmento deja de ser `puerto` y **el final en alto desaparece** — medido en la
    etapa 3 del Arctic Race 2026, que pasaba de ganarla un escalador a ganarla un clasicómano.
    Bajar la etapa a 146 tampoco vale: el banner se guarda como `Math.round(summitKm)` = 147 y se
    sale del recorrido (lo vigila `calendar.test.ts`). Lo que se hace es anclar la cima al km entero
    de la etapa: el hecho publicado se conserva exacto y lo que se tira es medio km de redondeo.
    **Solo aplica cuando la cima y la meta coinciden en la fuente**; una cima a 1 km de meta se deja
    donde está.
11. **Una fuente que se contradice a sí misma no se usa a medias.** La prosa del Tour du Guangxi 2025
    describe una etapa 2 de 179,6 km con final en Nanning y la lista oficial de etapas del MISMO
    artículo dice Chongzuo -> Jingxi, 177,4 km. De esa etapa no se carga nada: si la fuente falla en
    lo comprobable, no se le cree lo que no se puede comprobar.

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

| Carrera              | Motivo                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `race-bruges`        | Classic Brugge-De Panne. **No hay nada que cargar**: la fuente dice que el recorrido «reste dans une zone très proche de la côte belge et est donc quasiment parfaitement plat». Ni cotas, ni sectores de pavé, ni sprints con km. Una carrera de viento y sprint, y el viento no se modela                                                                                                                                                                     |
| `race-copenhagen`    | Copenhagen Sprint. Igual: 235,7 km con 1.053 m de desnivel y cinco vueltas a un circuito urbano de 10 km, sin una sola dificultad publicada. La sección «Parcours» de la edición 2026 está vacía                                                                                                                                                                                                                                                                |
| `race-brittany`      | Bretagne Classic. La fuente **sí** publica las tres cotas del circuito final (Rostervel 1,5 km al 4,5 %; Lezot 900 m al 5,3 %; Kerscoulic 225 m al 8,9 %) pero **no dice dónde caen** dentro de los 11,8 km del circuito, ni en qué orden. Falta el km: se descarta (regla 3)                                                                                                                                                                                   |
| `race-poland`        | Tour de Pologne. La web oficial describe las «Premie Górskie» por localidad, sin longitud ni pendiente; el único documento con el roadbook completo es un PDF de **121 MB** y en este entorno no hay con qué leerlo. Wikipedia (de, fr, nl, pl) no trae tabla                                                                                                                                                                                                   |
| `race-benelux`       | Renewi Tour. La web oficial no es alcanzable desde aquí (el proxy la deniega) y la prosa de frwiki da longitud y pendiente de tres muros de la etapa 3 (Mur de Grammont, Taaienberg, Bosberg) **sin un solo km**. Falta el km: se descarta                                                                                                                                                                                                                      |
| `race-wevelgem`      | Gante-Wevelgem. La frwiki de 2025 **sí** publica los nueve montes con longitud, pendiente y firme (el Kemmel es pavé), pero titula sus dos columnas de kilómetros «(à confirmer)» y no se sostiene: los km implican 253,1 km de carrera y el infobox del mismo artículo dice 250,3. La nlwiki no trae tabla con la que desempatar. Fuente que se contradice a sí misma: no se usa a medias (regla 10). Se queda con los puertos que ya tenía, sin fuente citada |
| `race-san-sebastian` | Clásica de San Sebastián. El artículo de 2025 existe en eswiki pero **no publica tabla de puertos ni distancia**; la frwiki de esa edición no existe (404 con los dos títulos probados). Sin tabla no hay nada que citar. Se queda con los siete puertos que ya tenía —Jaizkibel, Erlaitz y Murgil entre ellos—, sin fuente                                                                                                                                     |

## El ProSeries por etapas: el mapa de fuentes (agosto de 2026)

Las 122 etapas «sin validar» del ProSeries son **23 carreras por etapas**: ya tienen salida, meta y
kilómetros de una edición real y solo les falta el relieve. Se recorrieron **las 23** buscando fuente
antes de cargar ninguna, y el resultado es mucho peor que el 40-50 % de las clásicas de un día:
**una sola carrera cargable, y dentro de ella 4 etapas de 122 (3 %)**.

La razón es estructural y conviene no volver a descubrirla: **la tasa del 40-50 % se midió sobre
clásicas de un día**, donde la Wikipedia francesa y la alemana publican la tabla de _difficultés_ o
de _Bergwertungen_ porque la carrera ES esa tabla. Una carrera por etapas no tiene ese artículo: su
Wikipedia trae la lista de etapas, el desnivel acumulado y la crónica, y el detalle del relieve vive
en el **roadbook**, que es un PDF. De las 23, **ninguna** tenía tabla de puertos en Wikipedia.

Lo único que funciona es la **web oficial**, y solo cuando la organiza ASO: su CMS publica en cada
ficha de etapa el bloque «Cols et côtes» / «Mountain passes & hill» con km de cima, altitud, longitud
y pendiente. Es de donde salieron el Tour Auvergne-Rhône-Alpes y ahora el Tour of Oman.

**Y hay un segundo filtro, que es el que se lleva la mitad de las carreras ASO: el CMS solo publica
la edición EN CURSO y no archiva las anteriores.** Sirve si la edición que usa `editions.ts` coincide
con la que el sitio muestra hoy; si `editions.ts` congeló la de 2025, el dato ya no es alcanzable.

| Carrera del juego      | Carrera real                    | Edición en `editions.ts` | Qué se encontró                                                                                                                                                    |
| ---------------------- | ------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `race-oman`            | Tour of Oman                    | 2026                     | **CARGADA.** Web oficial ASO con «Mountain passes & hill» etapa por etapa                                                                                          |
| `race-arabia`          | AlUla Tour                      | 2026                     | Web oficial ASO, pero publica **solo los sprints** con su km y **ni una cota**, ni siquiera el final de Harrat Uwayrid. Ver abajo por qué no se cargan solos       |
| `race-arctic`          | Arctic Race of Norway           | **2026**                 | **CARGADA** (13/08/2026). Se adelantó el reloj: la edición de `editions.ts` pasó de 2025 a 2026 y con eso la tabla ASO del sitio pasó a ser la de la misma edición |
| `race-germany`         | Lidl Deutschland Tour           | **2026**                 | **CARGADA** (13/08/2026). Igual que el Arctic Race: edición actualizada a 2026 y tabla completa (Kalmit, Rotsteig, Annaberg…) leída el mismo día                   |
| `race-burgos`          | Vuelta a Burgos                 | 2026                     | La web oficial da nombre, km y **categoría oficial** de cada puerto, pero **no su longitud ni su pendiente**. Falta la dureza: no es cargable (regla 3)            |
| `race-slovenia`        | Tour of Slovenia                | 2026 (con reserva)       | Solo el Vršič de la etapa 4 está completo, pero las distancias no cuadran: ver la nota de abajo                                                                    |
| `race-valencia`        | Volta a la Comunitat Valenciana | 2026                     | La frwiki nombra el Muro del Pou con «pente jusqu'à 22 %», que es una pendiente **MÁXIMA** (regla 7); Alto Miserat y Puig de la Llorença, sin longitud ni km       |
| `race-wallonia`        | Ethias Tour de Wallonie         | 2026                     | Web oficial y frwiki nombran las côtes (Stockis, Magis, la Redoute) **sin km, longitud ni pendiente**                                                              |
| `race-mayenne`         | Boucles de la Mayenne           | 2026                     | Web oficial: solo el desnivel acumulado por etapa (3.364 m D+). Once cotas citadas en prosa, ninguna con cifras                                                    |
| `race-hungary`         | Tour de Hongrie                 | 2026                     | Web oficial: lista de etapas, sin una sola cota                                                                                                                    |
| `race-hainan`          | Tour of Hainan                  | 2025                     | frwiki: etapas «de plaine» y «vallonnée», sin ninguna ascensión detallada                                                                                          |
| `race-loire`           | Tour du Loir-et-Cher            | 2026 (parcial)           | Sin artículo de Wikipedia. Las etapas 4 y 5 de `editions.ts` además no cuadran con la edición real (189/98 contra 177,6/7,4)                                       |
| `race-britain`         | Tour of Britain                 | 2025                     | La frwiki de 2026 marca su sección «Parcours» como **vacía**                                                                                                       |
| `race-luxembourg`      | Skoda Tour de Luxembourg        | 2025                     | frwiki: etapas con su tipo (plaine / montagne), sin ninguna cota                                                                                                   |
| `race-denmark`         | PostNord Danmark Rundt          | 2025                     | La web oficial ya publica 2026, que es otro recorrido. Ninguna cota en ninguna de las dos                                                                          |
| `race-norway`          | Tour of Norway                  | 2025                     | **La edición 2026 se anuló** (aviso en su propia portada). Sin fichas de cotas                                                                                     |
| `race-croatia`         | CRO Race                        | 2025/2026                | El único documento con el detalle es el **roadbook en PDF**                                                                                                        |
| `race-turkiye`         | Presidential Tour of Türkiye    | 2026                     | Web oficial: **503** en todas sus rutas, repetido                                                                                                                  |
| `race-czechia`         | Czech Tour                      | 2025/2026                | Web oficial: **503**                                                                                                                                               |
| `race-hauts-de-france` | Quatre Jours de Dunkerque       | 2026                     | Web oficial: **403** desde el proxy. La frwiki marca «Parcours» como vacía                                                                                         |
| `race-belgium`         | Baloise Belgium Tour            | 2026                     | El dominio oficial redirige a `golazo.com` y allí da **404**                                                                                                       |
| `race-langkawi`        | Le Tour de Langkawi             | —                        | El dominio oficial redirige a un portal de noticias sin relación                                                                                                   |
| `race-qinghai`         | Tour of Qinghai Lake            | —                        | Sin artículo de Wikipedia en fr ni en en, y sin web oficial alcanzable                                                                                             |

### Por qué el AlUla Tour no se carga aunque tenga dato

Su ficha oficial publica los sprints intermedios y de bonificación **en su kilómetro exacto**: es
dato real y se podría cargar. No se ha hecho, y la razón importa. `STAGE_FEATURES` es lo que el
inventario cuenta como recorrido **«Real»**, y una etapa con solo sprints se construye con el mismo
relleno ondulado sintético que una etapa sin nada. Cargar los sprints pasaría las cinco etapas de
«Sin validar» a «Real» sin que su relieve lo fuese: subiría el marcador sin subir la verdad, y el
inventario dejaría de servir para decidir por dónde seguir. Es una carga que se hará el día que
aparezca el relieve, no antes.

### Por qué el Tour of Slovenia no se carga aunque tenga una cota completa

Es el único caso en que la frwiki da una ascensión con todo lo necesario: el **col du Vršič**, «12,6
km avec une pente moyenne de 7,7 %», y su posición se deduce de que está «à 14 km de l'arrivée» de
una etapa 4 de 184,7 km. El problema es la **base de distancias**: la edición 2026 real mide 810,7 km
(confirmado por la web oficial) y la de `editions.ts` suma 801, con etapas que se desvían hasta 7 km
(la 5.ª: 162 contra 169,4). Colocar el Vršič en el km 170,7 de una etapa que aquí mide 183 lo dejaría
a 12,3 km de meta y no a 14. Es exactamente la mezcla que prohíbe la regla 2, y por una sola cota no
compensa. **Queda anotado como el primer candidato del día que se refresquen las distancias de
`editions.ts`.**

### El dato accionable de todo esto — HECHO el 13/08/2026

Si se quiere seguir cargando ProSeries por etapas, el camino barato no es buscar más fuentes: es
**adelantar el reloj**. Arctic Race of Norway y Deutschland Tour son carreras ASO con la tabla
completa publicada ahora mismo para 2026, y lo único que las bloquea es que `editions.ts` guarda su
edición de 2025. Actualizar esas dos ediciones a 2026 y leer la web oficial el mismo día son **9
etapas más** con relieve real, que es casi el doble de lo que ha dado esta tanda entera.

**Se hizo, y salió como se esperaba, con un matiz.** Las dos ediciones están actualizadas a 2026 y su
relieve cargado de la web oficial del mismo día: **24 cotas en 8 etapas**. El matiz es que son 8 y no
9: el Deutschland Tour 2026 abre con un **prólogo de 2,6 km** cuya ficha no tiene siquiera pestaña de
cotas, y no se cuenta como recorrido real por las mismas razones del AlUla Tour (no se sube el
marcador sin subir la verdad). El inventario pasa de **21 a 29 etapas reales** en ProSeries (del 12 %
al 17 %) y de 169 a 177 en total.

Y una lección que no estaba prevista, ahora regla 10 y anotada en `editions.ts` y en las notas de las
dos fuentes: **un final en alto hay que anclarlo al km entero de su etapa.** La fuente pone la cima de
Storheia en el km 146,5 de una etapa de 146,5 km —la cima ES la meta—, pero `editions.ts` va en km
enteros: con la etapa en 147 y la cima en 146,5, `buildFeatureProfile()` metía medio kilómetro de llano
detrás de la cima, el último segmento dejaba de ser `puerto` y el final en alto desaparecía; la etapa
pasaba de ganarla un escalador a ganarla un clasicómano. Bajar la etapa a 146 arreglaba eso y rompía
otra cosa: el banner de la cima es `Math.round(146,5)` = 147 y se salía del recorrido. La salida es
anclar la cima al 147 de la etapa.

Las dos veces se detectó **midiendo**, no leyendo el código: el falso llano, comparando la carrera
antes y después (paso 7 del procedimiento); el banner fuera de rango, con `pnpm test`. Ninguna de las
dos se habría visto solo mirando el diff.

**Lo que queda de estas dos, para el día que se refresque:** la etapa 2 del Arctic (123 km sin cota
publicada tras el km 57) y las etapas 1 y 2 del Deutschland Tour (54 y 158 km finales sin dificultad
publicada). Y el aviso de siempre: el CMS de ASO **no archiva**, así que dentro de un año estas dos
tablas ya no estarán y lo cargado hoy no se podrá volver a comprobar contra la fuente original.

## Cómo repetir o ampliar la extracción

Los scripts de descarga viven fuera del repositorio (son herramienta de una vez, no código de
producto). Lo que sí está en el repo es `scripts/medir-carrera.mjs`, que es lo que dice si el
recorrido cargado ha cambiado la carrera y cómo.

**Corrección importante sobre el `robots.txt` de Wikimedia**: la primera tanda bajó el wikitexto por
`/w/api.php`, y ese prefijo está **prohibido** (`Disallow: /w/` para `User-agent: *`; solo se permite
`action=mobileview`). Lo que sí está permitido es la página del artículo, `/wiki/<Título>`, y de ahí
salen igual de bien las tablas y la prosa. Las entidades de Wikidata se leen por `/wiki/Q…`, no por
`/wiki/Special:EntityData` (`/wiki/Special:` también está prohibido). Esta tanda se ha bajado así.

El procedimiento, para quien tenga que repetirlo:

1. Averiguar a qué carrera real corresponde la del juego por su `name`, su `country` y su fecha en
   `SEASON_CALENDAR`. Si la correspondencia no es evidente, no se adivina: se deja fuera.
2. Mirar primero la **web oficial** de la carrera (`robots.txt` antes que nada): si publica su tabla
   de dificultades, es mejor dato que Wikipedia y trae la categoría oficial.
3. Si no, bajar el artículo (`https://<lang>.wikipedia.org/wiki/<Título>`) y partir el HTML en tablas
   y en prosa. Muchas carreras pequeñas no tienen tabla y sí una descripción del recorrido con los
   datos dentro; se lee entera antes de dar la carrera por perdida.
4. Contrastar la distancia con Wikidata (`/wiki/Q…`, propiedad `P3157`) y con la suma de las etapas
   de `editions.ts`. Si no cuadra, se ha leído mal algo.
5. Retroceder de edición mientras no aparezca dato (2026 → 2025 → 2024 → 2023).
6. Validar con `packages/engine/src/routes/classicRoutes.test.ts`, que comprueba distancias, orden de
   las cimas, solapes de pavé, que cada puerto cabe en SU etapa y que el perfil pasa por
   `sampleProfile()`.
7. Medir antes y después con `node scripts/medir-carrera.mjs <raceId>` y anotar en `docs/balance.md`
   qué ha cambiado en la carrera. Cargar un recorrido no es rellenar una tabla: es cambiar la carrera.

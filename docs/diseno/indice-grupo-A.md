# Índice del GRUPO A — «CUÁNDO Y DÓNDE»

**Entrada: 152 situaciones** (50 de `casos-formato.md` + 52 de `casos-fase.md` + 50 de `casos-colectivo.md`). **Salida: 128 situaciones** tras fusionar **24 duplicados de verdad** (24 pares, 48 fichas de entrada). El texto completo de cada situación (cuándo, quién decide, qué pasa en carretera, qué hace hoy el motor, la cita, la información necesaria, cómo se mediría) se queda en su fichero de lente; aquí solo está la vista navegable.

Orden: una tabla por fase (`convocatoria` · `salida` · `fuga` · `medio` · `aproximacion` · `decisivo` · `desenlace` · `entre-etapas`) y, dentro de cada fase, por Actor (`corredor` · `equipo` · `grupo` · `humano` · `organizacion` · `peloton`). En las fusiones, el Estado es el más pesimista de los dos (CONTRARIO > AUSENTE > PARCIAL > CUBIERTO) y el Dueño es `sí` si cualquiera de las dos lentes traía cita textual.

---

## Fase `convocatoria`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-001 | Convocatoria que no encaja con el formato: estructuras de equipo que «no tienen sentido» | convocatoria | equipo | AUSENTE | sí | Componer la selección por el formato de la carrera entera: nunca un lanzador sin sprinter, nunca ocho escaladores en una vuelta llana, nunca un marcador sin favorito rival. | casos-formato.md FORMATO-48 |

## Fase `salida`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-002 | Los primeros intentos: nadie ataca en el km 0, casi siempre alguien en los km 1-5 | salida | corredor | CUBIERTO | sí | Que nadie ataque en los primeros 300 m y que el primer intento salga entre el km 1 y el km 5, antes si la fuga cotiza. | casos-fase.md FASE-02 |
| A-003 | CRI intermedia: orden inverso a la general y lo que eso implica | salida | corredor | AUSENTE | sí | En crono con salida inversa, el que sale pronto dosifica para mañana y el que sale último corre con los parciales del rival en el oído. | casos-formato.md FORMATO-35 |
| A-004 | CRI primera etapa / prólogo: salida por dorsales, todos a tope, el primer maillot | salida | organizacion | CUBIERTO | sí | En prólogo o crono de un día se sale por dorsal acabando con el 1, sin táctica de equipo y todos a tope. | casos-formato.md FORMATO-34 |
| A-005 | Salida neutralizada y el kilómetro 0 real | salida | peloton | CUBIERTO | — | La carrera empieza en el km 0 real a 35-42 km/h; en el neutralizado no se ataca. | casos-fase.md FASE-01 |

## Fase `fuga`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-006 | La ráfaga de intentos hasta que cuaja la fuga del día | fuga | corredor | CUBIERTO | sí | Que fracasen 3-10 intentos antes de que cuaje uno, con el pelotón estirándose y desgastándose en cada uno. | casos-fase.md FASE-03 |
| A-007 | Un hombre de la general se cuela en la fuga (maillot, top-5, o el «lejano» que se hace líder virtual) | fuga | corredor | PARCIAL | sí | Un corredor a 8-15 min puede irse; un top-5 no, y el equipo del maillot decide cuánta cuerda le da según la general virtual. | casos-fase.md FASE-08 |
| A-008 | Quién va a la fuga: composición y cupo por equipo | fuga | equipo | AUSENTE | sí | Uno por equipo en la fuga del día; dos es raro y tres casi nunca, y si van dos, uno se guarda. | casos-fase.md FASE-04 + casos-colectivo.md COLECTIVO-08 |
| A-009 | El equipo sin baza vive de la fuga (y de una sola plaza): abstención activa | fuga | equipo | PARCIAL | sí | El equipo sin ninguno de los tres motivos manda UN hombre a la fuga, prueba con otro si falla y no paga un metro de viento en el pelotón. | casos-formato.md FORMATO-12 + casos-colectivo.md COLECTIVO-10 |
| A-010 | Etapa de transición (2.ª semana, media montaña): la fuga de 20-30 y el maillot que deja ir | fuga | equipo | PARCIAL | sí | En transición la pelea dura 40-60 km, cuaja una fuga de 20-30 con un hombre por equipo y el maillot la deja a 8-12 min si nadie es peligroso. | casos-formato.md FORMATO-22 |
| A-011 | «Tengo hombre dentro»: el voto que deja ir la fuga | fuga | equipo | AUSENTE | sí | El equipo con su carta delante vota a favor de la fuga, se pone al frente a ritmo bajo y neutraliza a quien quiera cerrar. | casos-colectivo.md COLECTIVO-02 |
| A-012 | «No tengo a nadie»: el voto que cierra hasta colar a uno | fuga | equipo | PARCIAL | sí | El equipo sin representación cierra el intento y lo vuelve a intentar; la fuga no cuaja hasta que casi todos los interesados están dentro. | casos-colectivo.md COLECTIVO-03 |
| A-013 | El voto de la general: «esta fuga me quita el maillot» | fuga | equipo | PARCIAL | sí | Cada equipo suma el hueco a la general del mejor fugado: si la general virtual pasa por delante de su hombre, cierra sí o sí. | casos-colectivo.md COLECTIVO-04 |
| A-014 | El segundo, el tercero y el cuarto de la general dentro de la fuga | fuga | equipo | PARCIAL | sí | Con un top-5 en la fuga no hay veto sino guerra: el equipo del maillot cierra a tope y el resto se sienta a mirar. | casos-colectivo.md COLECTIVO-06 |
| A-015 | El voto del equipo del sprinter: «esta fuga no lleva a nadie que me gane» | fuga | equipo | AUSENTE | — | El equipo del velocista deja marchar cualquier fuga sin rematador rápido y cierra en seco la que lleva a uno que le puede robar la etapa. | casos-colectivo.md COLECTIVO-07 |
| A-016 | El día que la aduana está cerrada: la etapa que no perdona ninguna fuga | fuga | equipo | PARCIAL | sí | Con dos o tres trenes enteros y nadie amenazado, se deja salir exactamente a los que se pueden cazar, y se cazan en el km −10. | casos-colectivo.md COLECTIVO-14 |
| A-017 | El rebelde y el humano: una fuga que su propio equipo no reconoce | fuga | humano | CUBIERTO | sí | El corredor que se va contra el plan no cuenta como hombre propio: su equipo no deja de perseguir por él. | casos-colectivo.md COLECTIVO-15 |
| A-018 | La aduana: el pelotón deja ir ESTA fuga o no («esta fuga no me vale») | fuga | peloton | AUSENTE | sí | La cuerda debe salir de un voto por equipos (composición, peligro para mi general, rematadores dentro, fuerza de caza), no de un dado. | casos-fase.md FASE-05 + casos-colectivo.md COLECTIVO-01 |
| A-019 | La fuga numerosa de montaña / media montaña («escapada bidón») | fuga | peloton | PARCIAL | sí | Cuando el día es de fuga saltan 20-50 y el pelotón solo la deja marchar cuando ya es grande y plural. | casos-fase.md FASE-07 + casos-colectivo.md COLECTIVO-09 |
| A-020 | La fuga cazada pronto y la «segunda fuga del día» | fuga | peloton | CONTRARIO | sí | Tras una captura temprana el pelotón hierve: sale una segunda fuga con gente nueva, y esa puede ser la que llegue. | casos-fase.md FASE-09 + casos-colectivo.md COLECTIVO-35 |
| A-021 | Clásica llana: la fuga de figurantes y el día que pertenece a los trenes | fuga | peloton | PARCIAL | sí | En la clásica llana se deja ir a 4-7 de equipos sin velocista (uno por equipo) y un T1 «compra» el control hasta que se suman 2-3 más. | casos-formato.md FORMATO-01 |
| A-022 | Veto absoluto: el maillot no se va en la fuga | fuga | peloton | CUBIERTO | sí | Si el líder de la general salta, salta media carrera detrás: el movimiento muere. | casos-colectivo.md COLECTIVO-05 |
| A-023 | La agregación del voto: quién manda cuando los votos se contradicen | fuga | peloton | PARCIAL | sí | La aduana es una subasta de trabajo: la fuga sale si nadie con hombres frescos está dispuesto a pagar el cierre. | casos-colectivo.md COLECTIVO-12 |
| A-024 | El voto se revisa cada kilómetro (hoy se decide una vez, al nacer) | fuga | peloton | PARCIAL | sí | La cuerda se renegocia todo el día: cambia con el hueco, con los puentes y con quién resulta peligroso. | casos-colectivo.md COLECTIVO-13 |
| A-025 | La aduana del contraataque: «a estos sí, a aquellos no» | fuga | peloton | PARCIAL | — | Al puente se le aplica otra vara: dos inofensivos pasan, un favorito se cierra, y reforzar la fuga adelanta la caza. | casos-colectivo.md COLECTIVO-37 |

## Fase `medio`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-026 | Relevos dentro de la fuga a mitad de etapa: quién se escaquea y por qué | medio | corredor | PARCIAL | sí | Se escaquea el que tiene al equipo persiguiendo detrás, el que espera el remate y el que va vacío; si uno lo hace sin motivo, los demás bajan el ritmo. | casos-fase.md FASE-14 |
| A-027 | El corredor «a media etapa» que se descuelga por sí mismo y su reenganche | medio | corredor | CUBIERTO | sí | Con el pelotón a tempo el descolgado vuelve la mitad de las veces; con el pelotón apretando no vuelve nunca. | casos-fase.md FASE-18 |
| A-028 | La cima puntuable (KOM): el escalador de la fuga ataca antes de coronar | medio | corredor | PARCIAL | — | El que pelea la montaña ataca a 500 m-1 km de la cima, corona solo y espera al grupo en el descenso. | casos-fase.md FASE-20 |
| A-029 | CRI intermedia: quién va a tope y quién dosifica (y la orden del jugador) | medio | corredor | CONTRARIO | sí | En la crono cada uno corre según su día de mañana: el gregario al 70 % dentro del corte, el cronista y el jefe de la general a tope, y la orden del jugador debe notarse. | casos-formato.md FORMATO-36 |
| A-030 | Cronoescalada: escaladores contra cronistas, y el equipo no pinta nada | medio | corredor | CUBIERTO | sí | En cronoescalada la única táctica es el reparto de ritmo por tramos: llano al 0,85, subida al perfil del escalador. | casos-formato.md FORMATO-38 |
| A-031 | CRI: el corredor en apuros (pinchazo, caída, cambio de bici) y el corte dormido | medio | corredor | AUSENTE | sí | En una crono debe haber 1-4 % de incidentes (pinchazo, caída, cambio de bici) para que el corte del 25 % signifique algo. | casos-formato.md FORMATO-40 |
| A-032 | El relevo negado dentro del pelotón: «tengo un hombre delante, no paso» | medio | corredor | CUBIERTO | sí | El compañero de un fugado no entra a la rotación del grupo que persigue: se coloca al final de la fila. | casos-colectivo.md COLECTIVO-30 |
| A-033 | El maillot tira de su propio pelotón (el defecto que el dueño vio tres veces) | medio | corredor | CUBIERTO | sí | El líder de la general no paga viento nunca salvo emergencia; sus compañeros y el 2.º-4.º sí. | casos-colectivo.md COLECTIVO-31 |
| A-034 | El cazado que lo vuelve a intentar (y el pelotón que ya no le deja) | medio | corredor | CUBIERTO | sí | Al que acaban de cazar tras una fuga larga ni le quedan piernas ni se le vuelve a dar cuerda. | casos-colectivo.md COLECTIVO-36 |
| A-035 | El puente desde el pelotón: uno o dos que saltan al hueco | medio | corredor | CUBIERTO | sí | Al hueco saltan uno o dos, con un esfuerzo caro que a veces se queda a medias. | casos-colectivo.md COLECTIVO-38 |
| A-036 | El puente desde un grupo rezagado: la mitad de la regla 7 que no existe | medio | corredor | AUSENTE | sí | Un descolgado debe poder saltar hacia el grupo de delante por acción propia, no solo esperar a que le absorban. | casos-colectivo.md COLECTIVO-39 |
| A-037 | El pelotón que «se despista»: la fuga se va a 15-20 minutos (el pacto de no cazar) | medio | equipo | CUBIERTO | sí | Si los equipos con capacidad de cazar están representados en la fuga, nadie tira y la fuga se va a 10-20 min. | casos-fase.md FASE-06 + casos-colectivo.md COLECTIVO-44 |
| A-038 | El control del boquete: a qué distancia se estabiliza, quién lo lleva y por qué no se caza | medio | equipo | PARCIAL | sí | Controlar es sostener con dos hombres la ventana que le conviene a ESE equipo (3-6 min), no cazar. | casos-fase.md FASE-10 + casos-colectivo.md COLECTIVO-20 |
| A-039 | Cambio de manos del frente: el equipo que lleva 80 km tirando y se funde | medio | equipo | CUBIERTO | sí | El que ha llevado el peso pide relevo y no vuelve al frente; si nadie lo recoge, la fuga recupera medio minuto. | casos-fase.md FASE-15 + casos-colectivo.md COLECTIVO-19 |
| A-040 | La caza que llega tarde y la claudicación: «dan la etapa por perdida» | medio | equipo | CUBIERTO | sí | Cuando el cierre necesario supera lo que el campo puede dar, los sprinters se sientan y la etapa pasa a ser de la fuga. | casos-fase.md FASE-16 + casos-colectivo.md COLECTIVO-26 |
| A-041 | La meta volante: la fuga se la juega y el pelotón acelera por el maillot de puntos | medio | equipo | CONTRARIO | — | El pelotón también esprinta la volante detrás de la fuga si hay puntos en juego, y luego se apaga 5 km. | casos-fase.md FASE-19 + casos-formato.md FORMATO-31 |
| A-042 | El puerto de tempo (lejos de meta): el tempo del equipo fuerte que suelta a los sprinters sin romper | medio | equipo | PARCIAL | sí | El equipo fuerte marca un tempo que desactiva ataques y suelta a los sprinters, pero no busca romper: las diferencias las marca el último puerto. | casos-fase.md FASE-26 + casos-colectivo.md COLECTIVO-21 |
| A-043 | El abanico como decisión, no como accidente: el equipo que rompe la carrera a propósito | medio | equipo | PARCIAL | sí | Un equipo con 6-8 hombres colocados ELIGE romper en el tramo expuesto; los demás pelean la posición o se resignan a la segunda fila. | casos-formato.md FORMATO-02 + casos-colectivo.md COLECTIVO-45 |
| A-044 | Clásica de pavés: percance del favorito y el equipo que espera (el pelotón que no espera) | medio | equipo | PARCIAL | sí | Con pinchazo o caída de la carta, dos gregarios bajan a llevarle, el pelotón no espera y si ya no hay opción el equipo cambia de carta. | casos-formato.md FORMATO-05 |
| A-045 | Clásica de cotas (Ardenas): la fuga «de permiso» y las cotas que criban antes del final | medio | equipo | PARCIAL | sí | Aquí no controlan los trenes sino el equipo del favorito, que deja 5-8 min porque sabe que la acumulación de cotas caza. | casos-formato.md FORMATO-06 |
| A-046 | Clásica (cualquiera): no hay mañana — nadie guarda y por la etapa no se baja nadie | medio | equipo | PARCIAL | sí | En carrera de un día los siete se vacían por la carta, nadie guarda para mañana y el descolgado abandona en vez de entrar en el corte. | casos-formato.md FORMATO-11 |
| A-047 | Vuelta de solo llanas (Sharjah/Arabia): el líder es un sprinter y su equipo controla todo | medio | equipo | CUBIERTO | sí | El equipo del líder-sprinter tiene motivo doble y se funde controlando cada día; la varianza la traen colocación, trenes fallidos y la fuga que se cuela una de cinco. | casos-formato.md FORMATO-17 |
| A-048 | Primera semana nerviosa: proteger, no atacar | medio | equipo | PARCIAL | sí | En la 1.ª semana los equipos de la general gastan gregarios en COLOCAR al jefe delante, no en perseguir, y nadie de la general ataca. | casos-formato.md FORMATO-20 |
| A-049 | La «fuga bidón»: el maillot que se regala y el equipo que decide cederlo o no | medio | equipo | CONTRARIO | sí | El equipo del maillot debe poder ceder a propósito el maillot a un fugado inofensivo para ahorrarse tres días de control. | casos-formato.md FORMATO-23 |
| A-050 | Clasificaciones secundarias como motivo de equipo (montaña, puntos, joven) | medio | equipo | AUSENTE | — | Ir a por la montaña o los puntos tiene que ser un motivo de equipo que llene fugas y mueva persecuciones, como la general. | casos-formato.md FORMATO-30 + casos-colectivo.md COLECTIVO-11 |
| A-051 | Contrarreloj por equipos (CRE): el formato que no existe y qué exige de cada equipo | medio | equipo | AUSENTE | — | En CRE el tiempo lo da el 4.º hombre: se rueda a su ritmo, los débiles tiran corto y se dejan caer, y el jefe va protegido. | casos-formato.md FORMATO-39 |
| A-052 | Puerto de tempo + valle + puerto decisivo: la etapa reina de dos actos | medio | equipo | PARCIAL | sí | El primer puerto criba gregarios y forma el grupeto; en el valle cada equipo decide si espera a los suyos o los usa para el segundo acto. | casos-formato.md FORMATO-45 |
| A-053 | Gran vuelta, 1.ª semana con viento: los equipos de la general hacen el abanico | medio | equipo | CONTRARIO | sí | En gran vuelta el abanico lo provocan los equipos de la general con rodadores para sacar minutos a un favorito mal colocado. | casos-formato.md FORMATO-50 |
| A-054 | El equipo que «tiene que» tirar y no quiere: el pulso entre equipos | medio | equipo | AUSENTE | sí | Con dos o tres equipos del mismo interés, nadie quiere empezar: el pulso cuesta kilómetros y la fuga gana tiempo. | casos-colectivo.md COLECTIVO-17 |
| A-055 | El frente sin dueño: tres equipos tirando a media máquina | medio | equipo | CUBIERTO | sí | Sin claim claro se forma una rotación de 2-3 equipos, más lenta y desordenada que la de un equipo solo. | casos-colectivo.md COLECTIVO-18 |
| A-056 | Controlar a tres minutos no es cazar: los dos regímenes | medio | equipo | PARCIAL | sí | Controlar son dos hombres a ritmo sostenible durante 100 km; cazar son cuatro o cinco quemándose en los últimos 40-60. | casos-colectivo.md COLECTIVO-23 |
| A-057 | El momento de empezar a cazar: la cuenta de segundos por kilómetro | medio | equipo | CUBIERTO | sí | La caza empieza cuando el hueco deja de ser recuperable en lo que queda, no cuando es grande: no se caza desde el km 20. | casos-colectivo.md COLECTIVO-24 |
| A-058 | El desgaste del actuador: la caza fallida cuesta la etapa | medio | equipo | CUBIERTO | sí | El equipo que caza y no llega paga dos veces: pierde la etapa y llega al sprint sin tren. | casos-colectivo.md COLECTIVO-27 |
| A-059 | La caza compartida y el gorrón: tres equipos que deberían tirar y sólo tira uno | medio | equipo | PARCIAL | sí | El reparto de la caza nunca es equitativo: uno pone dos hombres, otro uno de propina y el tercero se esconde. | casos-colectivo.md COLECTIVO-28 |
| A-060 | «Tira tú»: el equipo que se niega a colaborar en la caza | medio | equipo | AUSENTE | — | Tener motivo y negarse debe ser posible: obligar al rival a cazar solo para llegar al sprint con dos hombres más. | casos-colectivo.md COLECTIVO-29 |
| A-061 | El pelotón deja marchar el puente para que haga el trabajo | medio | equipo | AUSENTE | — | Conceder o cerrar un puente según si refuerza y organiza la fuga (predecible) o la deja floja y descoordinada. | casos-colectivo.md COLECTIVO-41 |
| A-062 | La alianza tácita: dos equipos con el mismo problema | medio | equipo | AUSENTE | sí | La alianza no se negocia, se reconoce: uno pone dos hombres, el otro uno, y alternan mientras dure el interés común. | casos-colectivo.md COLECTIVO-42 |
| A-063 | La alianza que se rompe: en cuanto tengo lo mío, dejo de tirar | medio | equipo | PARCIAL | sí | El que ya tiene su objetivo suelta el frente y le pasa el muerto al aliado, y ahí la fuga vuelve a crecer. | casos-colectivo.md COLECTIVO-43 |
| A-064 | El pelotón que no sabe a quién persigue | medio | equipo | CONTRARIO | sí | No se persigue al grupo más adelantado sino al que hace daño: si delante van tres irrelevantes y detrás el 2.º de la general, se persigue al segundo. | casos-colectivo.md COLECTIVO-47 |
| A-065 | El pelotón que persigue a su propio hombre | medio | equipo | CUBIERTO | sí | Ningún equipo tira cuando su carta de etapa o de general va en un grupo por delante. | casos-colectivo.md COLECTIVO-48 |
| A-066 | Reagrupamiento en el descenso y el valle: los que vuelven y los que no | medio | grupo | PARCIAL | sí | En el descenso vuelven los que perdieron menos de 30-40 s si el pelotón baja tranquilo; el que perdió minutos no vuelve. | casos-fase.md FASE-37 |
| A-067 | Las «fases» como estado explícito del motor (salida / fuga / control / caza / aproximación / decisión / desenlace) | medio | organizacion | PARCIAL | sí | La fase debe ser un estado que todos leen y que cambia la conducta de golpe, no un puñado de umbrales sueltos. | casos-fase.md FASE-51 |
| A-068 | El pelotón sin prisa: «echar la hueva», el día tranquilo | medio | peloton | PARCIAL | sí | El humor del pelotón debe tener causa (ayer fue la reina, calor, nadie con motivo), no ser un dado del día. | casos-fase.md FASE-11 + casos-colectivo.md COLECTIVO-16 |
| A-069 | Clásica larga (Sanremo, 280-300 km): 200 km de nada y dosificación | medio | peloton | PARCIAL | sí | Con 280 km se sale a tempo bajo, se deja la fuga a mucho porque la distancia la mata y la caza empieza a −100 km con gregarios de fondo. | casos-formato.md FORMATO-09 + casos-fase.md FASE-12 |
| A-070 | Avituallamiento, zona de bidones y paradas técnicas | medio | peloton | AUSENTE | — | En el avituallamiento el ritmo baja y no se ataca; los gregarios que bajan al coche pagan el viaje de vuelta. | casos-fase.md FASE-13 |
| A-071 | Caída o incidente a mitad de etapa y la tregua del pelotón | medio | peloton | PARCIAL | sí | Si cae el maillot o un top-5 lejos de meta el pelotón levanta el pie hasta que vuelve; en el desenlace no se espera a nadie. | casos-fase.md FASE-17 |
| A-072 | Última etapa de paseo: pacto de no agresión y sprint en el circuito | medio | peloton | AUSENTE | sí | Con la general decidida y la última etapa llana, 80 km de paseo y la carrera arranca al entrar en el circuito. | casos-formato.md FORMATO-28 |
| A-073 | Etapa en circuito (vueltas repetidas): la cota que se sube N veces y «faltan dos vueltas» | medio | peloton | PARCIAL | sí | En circuito la carrera arranca «a dos vueltas»: la fuga se caza en el penúltimo paso y el ataque decisivo sale en el último. | casos-formato.md FORMATO-41 |
| A-074 | Llana de 3.ª semana sin sprinters: la caza que ya no existe | medio | peloton | PARCIAL | sí | Con la mitad de los sprinters retirados y trenes de un lanzador, los que quedan se ponen de acuerdo tarde y la caza fracasa. | casos-formato.md FORMATO-47 |
| A-075 | La etapa que nadie quiere controlar: el campo sin fuerza | medio | peloton | PARCIAL | sí | En un campo modesto la fuga se va y no vuelve porque nadie tiene el material para cerrarla; la fuerza se mide con los vivos, no con la foto de salida. | casos-colectivo.md COLECTIVO-22 |
| A-076 | El pelotón se parte por su propia caza | medio | peloton | CONTRARIO | sí | Cazar a tope 40 km en llano tiene que costar corredores por detrás: el grupo que caza se hace más pequeño y más lento. | casos-colectivo.md COLECTIVO-32 |
| A-077 | La tregua después de la captura | medio | peloton | AUSENTE | — | Cazada la fuga el ritmo cae uno o dos kilómetros: es la ventana del contraataque bueno. | casos-colectivo.md COLECTIVO-33 |
| A-078 | El grupo en tierra de nadie: ni le cazan ni llega | medio | peloton | PARCIAL | sí | Un grupo intermedio dura 5-25 km y el pelotón ELIGE si se lo come o lo deja llegar a la fuga. | casos-colectivo.md COLECTIVO-40 |
| A-079 | El pelotón se olvida de que la fuga existe (la fuga que nadie mira) | medio | peloton | CUBIERTO | sí | El despiste debe tener causa (nadie con motivo, humor bajo, transición tras la reina) y no ser ceguera contable del controlador. | casos-colectivo.md COLECTIVO-49 |

## Fase `aproximacion`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-080 | Aproximación a un puerto: la pelea por entrar delante y el pie del puerto | aproximacion | equipo | AUSENTE | sí | En los 5-10 km previos al pie la velocidad sube y los equipos colocan al jefe en cabeza; el que llega atrás paga 20-30 s de acordeón. | casos-fase.md FASE-22 |
| A-081 | Aproximación a un sector de pavés: la pelea por entrar delante en cada sector | aproximacion | equipo | PARCIAL | sí | En los 2-3 km previos al sector se va a 55-60 km/h y cada equipo gasta 2-3 gregarios en meter a su hombre en las 15 primeras posiciones. | casos-formato.md FORMATO-03 + casos-fase.md FASE-23 |
| A-082 | Aproximación a un tramo de viento lateral (el giro de la carretera) | aproximacion | equipo | PARCIAL | sí | Los equipos que quieren romper aceleran justo antes del giro y se colocan con 5 km de antelación; el abanico se cierra cuando el viento deja de ser lateral. | casos-fase.md FASE-24 |
| A-083 | Estrechamientos, rotondas y el embudo de los últimos 10 km | aproximacion | equipo | PARCIAL | sí | Los trenes pelean la cabeza antes de cada estrechamiento y los hombres de la general van delante hasta el km −3 (regla de los 3 km). | casos-fase.md FASE-25 |

## Fase `decisivo`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-084 | El maillot que marca y solo responde a los peligrosos | decisivo | corredor | PARCIAL | sí | El maillot no ataca: sigue a los que están dentro de su colchón y deja ir a los que van a 5 min. | casos-fase.md FASE-29 |
| A-085 | Los rivales de la general atacan; el favorito «se rompe» (el día malo) | decisivo | corredor | PARCIAL | sí | El 2.º-5.º atacan escalonados para aislar al maillot, y el que se hunde pierde 2-5 min de golpe. | casos-fase.md FASE-30 |
| A-086 | El gregario que espera al jefe descolgado en el puerto («espérame») | decisivo | corredor | PARCIAL | sí | El gregario se deja caer al VER sufrir al jefe, sin esperar a los 22 s de hueco, y luego le lleva al ritmo del jefe. | casos-fase.md FASE-32 |
| A-087 | Remontadas y hundimientos dentro de la subida | decisivo | corredor | CUBIERTO | sí | El que sube a lo suyo remonta a los que se pasaron de ritmo: los relojes de la cima no son el orden del pie. | casos-fase.md FASE-34 |
| A-088 | La cima del último puerto: coronar solo con poco, esperar o seguir | decisivo | corredor | AUSENTE | sí | Con 10-30 s en la cima y valle por delante hay que decidir: seguir si eres bajador-rodador, esperar si tienes compañeros detrás. | casos-fase.md FASE-35 |
| A-089 | Clásica de montaña (Lombardía): último puerto corto, bajada y carretera hasta meta | decisivo | corredor | PARCIAL | sí | El ataque en el puerto abre 20-40 s, la bajada los amplía o los borra y el llano final lo resuelve un grupo de 3-6 que se mira. | casos-formato.md FORMATO-08 |
| A-090 | Vuelta corta: el cronista líder en la única etapa de montaña | decisivo | corredor | PARCIAL | sí | El líder cronista no responde: sube a su ritmo constante y limita pérdidas mientras los escaladores atacan de lejos. | casos-formato.md FORMATO-49 |
| A-091 | El puerto decisivo / final en alto: el tren a ritmo y los fuertes que atacan | decisivo | equipo | PARCIAL | sí | El tren criba hasta 10-20 hombres y luego los fuertes atacan corto y repetido entre −5 y −2 km, vigilándose entre ellos. | casos-formato.md FORMATO-42 + casos-fase.md FASE-27 |
| A-092 | La emboscada: compañeros en la fuga como relevo del jefe que ataca de lejos | decisivo | equipo | CONTRARIO | sí | Tener compañeros en la fuga debe DAR ganas de atacar de lejos: ellos dejan de relevar, esperan al jefe y le llevan a tope. | casos-formato.md FORMATO-27 + casos-fase.md FASE-31 |
| A-093 | El tren de montaña: gregarios que se queman en orden y se apartan | decisivo | equipo | PARCIAL | sí | Los gregarios relevan en orden (rodadores, escaladores, lugarteniente) y el que acaba su turno se aparta sin pelear la rueda. | casos-fase.md FASE-28 |
| A-094 | Vuelta corta: el único día de montaña es el día D para todos los equipos de la general | decisivo | equipo | PARCIAL | sí | Si es el único día de montaña, todos los de la general tienen motivo: tempo desde lejos y ataques también en el penúltimo puerto. | casos-formato.md FORMATO-16 |
| A-095 | El día en que el líder se rompe (3.ª semana): esperar, dejarlo o cambiar de jefe | decisivo | equipo | PARCIAL | sí | Con el jefe descolgado, dos se quedan con él, el resto protege a la segunda carta y los rivales aprietan al oler sangre. | casos-formato.md FORMATO-26 |
| A-096 | Última etapa decisiva (final en alto o crono final): todo o nada según la general | decisivo | equipo | PARCIAL | sí | Con la general apretada se ataca desde el penúltimo puerto y la fuga no tiene sitio; con la general decidida la fuga se va a 15 min. | casos-formato.md FORMATO-29 |
| A-097 | Media montaña con el último puerto a > 30 km: donde la general se ataca lejos | decisivo | equipo | PARCIAL | sí | La última cota decide aunque corone a 30-60 km: ahí tiene que haber ataques de la general, no un día neutro. | casos-formato.md FORMATO-46 |
| A-098 | La fuga en el puerto decisivo: se rompe, el mejor sigue, el resto se deja coger | decisivo | grupo | CONTRARIO | sí | En el puerto el que ataca dentro de la fuga es el MEJOR escalador, no el peor rematador, y los rodadores se dejan coger sin pelear. | casos-fase.md FASE-33 |

## Fase `desenlace`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-099 | El descenso tras el puerto decisivo: el que arriesga abre hueco, el líder no arriesga con lluvia | desenlace | corredor | AUSENTE | sí | El bajador abre 20-40 s bajando a tope; con lluvia el que lleva la general cede 10-30 s a propósito. | casos-formato.md FORMATO-43 + casos-fase.md FASE-36 |
| A-100 | Ataque en el descenso final hacia meta (final tipo «descenso») | desenlace | corredor | PARCIAL | sí | El que ataca en el descenso final es el mejor bajador del grupo, y entra primero en las curvas para elegir la trazada. | casos-fase.md FASE-38 |
| A-101 | Fuga a 10-15 km con un minuto: la agonía y los ataques dentro | desenlace | corredor | CUBIERTO | sí | A 15 km se deja de mirar y se tira a bloque; a 8 y 4 km atacan los peores rematadores y el mejor sprinter se guarda. | casos-fase.md FASE-41 |
| A-102 | El «flyer» de los últimos 5-3 km y el ataque bajo la flamme rouge | desenlace | corredor | CONTRARIO | sí | Tiene que poder nacer un ataque en el último kilómetro: el golpe de mano bajo la flamme rouge gana un 2-5 % de las llanas. | casos-fase.md FASE-43 |
| A-103 | El repecho final / muro (final puncheur) con grupo grande | desenlace | corredor | PARCIAL | sí | El muro se decide en la posición en la base y en el momento de lanzar: el que abre a 600 m se hunde a 150. | casos-fase.md FASE-44 |
| A-104 | Sprint de grupo reducido sin lanzadores: «todos se miran y uno se lanza» | desenlace | corredor | CUBIERTO | sí | Sin trenes el grupo se frena, el peor sprinter lanza largo desde 400-500 m y el mejor espera a 200. | casos-fase.md FASE-46 |
| A-105 | Final en alto: el último kilómetro entre favoritos (y el gregario que se aparta) | desenlace | corredor | PARCIAL | sí | El último gregario se aparta a 2-3 km y entre favoritos hay 1-3 ataques en los últimos 2 km. | casos-fase.md FASE-49 |
| A-106 | La fuga cazada y el contraataque inmediato: la jugada que gana etapas | desenlace | corredor | CONTRARIO | sí | En el kilómetro de la captura el pelotón afloja y saltan 2-4 contraataques de los que se guardaron. | casos-fase.md FASE-50 + casos-colectivo.md COLECTIVO-34 |
| A-107 | Clásica de cotas: el final de puncheur — ataque en la última cota o sprint reducido | desenlace | corredor | PARCIAL | sí | Con la cota a ≤ 1 km gana el que mejor sube y nadie ataca antes; a 3-5 km el puncheur tiene que abrir hueco y el equipo con sprinter no ataca. | casos-formato.md FORMATO-07 |
| A-108 | Clásica larga: el sprint tras 280 km lo decide el trabajo del día | desenlace | corredor | PARCIAL | sí | Gana el sprinter que menos gastó y conserva un lanzador; el que cerró huecos en el Poggio remata al 90 %. | casos-formato.md FORMATO-10 |
| A-109 | CRI final (última etapa): la general se decide contra el reloj y el maillot corre «a lo seguro» | desenlace | corredor | AUSENTE | sí | El maillot ajusta su ritmo a los parciales del 2.º: con colchón no arriesga en las curvas, sin colchón lo da todo. | casos-formato.md FORMATO-37 |
| A-110 | Vuelta de solo llanas: la general se decide en el último sprint por bonificaciones | desenlace | equipo | AUSENTE | sí | Con dos hombres a ≤ 10 s, el líder no necesita ganar sino no ceder 6 s: su tren le lleva a la rueda del rival. | casos-formato.md FORMATO-18 + casos-fase.md FASE-21 |
| A-111 | Los últimos 15 km de una llana: el tirón final de los trenes | desenlace | equipo | CUBIERTO | sí | Los trenes toman el frente a 15-10 km a 50-55 km/h y nadie más releva. | casos-fase.md FASE-42 |
| A-112 | El último kilómetro con trenes: el sprint masivo (submotor) | desenlace | equipo | CUBIERTO | sí | El último lanzador se aparta a 200-250 m y el sprinter abre ahí; el que abre a 350 m se hunde y el que abre a 120 m ya no pasa. | casos-fase.md FASE-45 |
| A-113 | Dos compañeros en el grupo decisivo: superioridad numérica, uno ataca y el otro lanza | desenlace | equipo | AUSENTE | sí | Dos del mismo equipo alternan ataques y el peor rematador lanza al mejor; nunca se disputan el sprint entre ellos. | casos-formato.md FORMATO-04 + casos-fase.md FASE-47 |
| A-114 | La caza que llega justo: el km −3 | desenlace | equipo | CUBIERTO | sí | El pelotón no busca cazar pronto sino a tiempo: la captura cae entre el km −15 y el −1, y a veces no cae. | casos-colectivo.md COLECTIVO-25 |
| A-115 | El valle tras el último puerto: el grupo decisivo se mira y la colaboración se rompe | desenlace | grupo | PARCIAL | sí | A 8-10 km el mejor rematador deja de relevar, los demás le miran y de ahí sale el ganador en solitario (20-30 %). | casos-fase.md FASE-39 + casos-colectivo.md COLECTIVO-46 |
| A-116 | Los descolgados que se dejan ir en los últimos 25 km y el autobús | desenlace | grupo | CUBIERTO | sí | El vacío se deja ir sin pelear y el grupeto rueda al ritmo justo del corte. | casos-fase.md FASE-40 |
| A-117 | La llegada del solitario y el sprint por la segunda plaza | desenlace | grupo | CUBIERTO | — | El solitario levanta el pie en los últimos 300 m y el grupo de detrás disputa la segunda plaza (y sus bonificaciones). | casos-fase.md FASE-48 |
| A-118 | Valle largo tras el último puerto: la montaña selecciona y el valle reagrupa | desenlace | grupo | PARCIAL | sí | El que corona solo con 30 s muere en 20 km de valle; un grupo de 3-6 con un minuto llega si colabora. | casos-formato.md FORMATO-44 |

## Fase `entre-etapas`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A-119 | Vuelta corta con crono: la general se hace en la crono y las etapas en línea son «de trámite controlado» | entre-etapas | equipo | AUSENTE | sí | Sabiendo que la general la hace la crono, el equipo del líder controla sin perseguir y nadie de la general gasta antes. | casos-formato.md FORMATO-13 |
| A-120 | Vuelta corta con crono: el día ANTES y el día DESPUÉS de la crono | entre-etapas | equipo | AUSENTE | sí | La víspera de la crono los cronistas se esconden y no entran en fugas; el día después los que perdieron cambian de objetivo. | casos-formato.md FORMATO-14 |
| A-121 | Vuelta corta sin crono: general por bonificaciones y un único final en alto | entre-etapas | equipo | CONTRARIO | sí | El sprinter que lleva el maillot sigue siendo sprinter: su tren le lanza igual y él defiende la general a golpe de bonificación. | casos-formato.md FORMATO-15 |
| A-122 | Vuelta corta: el cazaetapas que hereda el maillot y su equipo modesto | entre-etapas | equipo | PARCIAL | sí | El equipo modesto defiende el maillot heredado un par de días aunque le cueste medio equipo, y los favoritos lo recuperan en la crono o el final en alto. | casos-formato.md FORMATO-19 |
| A-123 | Etapa 1 (todos a 0): el motor no sabe que hay una vuelta detrás | entre-etapas | equipo | AUSENTE | sí | La etapa 1 no es una clásica: hay tres semanas detrás y los favoritos se cuidan y no se dejan cortar. | casos-formato.md FORMATO-21 |
| A-124 | Tercera semana: campos rotos y equipos que cambian de propósito | entre-etapas | equipo | PARCIAL | sí | Los equipos que perdieron la general se reconvierten a cazaetapas, el maillot controla con 4-5 hombres y la fuga gana más. | casos-formato.md FORMATO-25 |
| A-125 | Abandono del jefe a mitad de vuelta: el equipo se reconvierte | entre-etapas | equipo | CUBIERTO | sí | Perdida la carta, al día siguiente el equipo corre distinto: sus escaladores a la fuga, nadie controla y el gregario de lujo pasa a jefe. | casos-formato.md FORMATO-32 |
| A-126 | El umbral de los 420 s: dónde deja de existir la general para un equipo | entre-etapas | equipo | PARCIAL | sí | «Estar fuera» no son 7 minutos fijos: es lo que mi hombre puede recuperar en el terreno que queda de carrera. | casos-formato.md FORMATO-33 |
| A-127 | Víspera y día siguiente al descanso: ir a por todas / arrancar dormidos | entre-etapas | peloton | AUSENTE | — | La víspera del descanso todos se vacían; el día después el pelotón sale con humor bajo y hay sustos de favoritos. | casos-formato.md FORMATO-24 |
| A-128 | La memoria del día anterior: humor, gasto y al que ganó ayer se le mira | entre-etapas | peloton | AUSENTE | sí | La aduana y el humor tienen memoria: el día después de la reina se rueda lento, el equipo que se fundió ayer no controla hoy y al de ayer no se le da cuerda. | casos-fase.md FASE-52 + casos-colectivo.md COLECTIVO-50 |

---

## Fusiones aplicadas (24)

| Fusión | Motivo |
| --- | --- |
| A-008 = FASE-04 + COLECTIVO-08 | El cupo por equipo en la fuga: composición (fase) y voto/cupo (colectivo). |
| A-009 = FORMATO-12 + COLECTIVO-10 | El equipo sin motivo manda uno a la fuga y no paga viento. |
| A-018 = FASE-05 + COLECTIVO-01 | La aduana: «esta fuga no me vale» / el voto que hoy es un dado. |
| A-019 = FASE-07 + COLECTIVO-09 | La fuga numerosa de montaña («que sea grande, así cuelo a uno»). |
| A-020 = FASE-09 + COLECTIVO-35 | La captura temprana y la segunda fuga del día. |
| A-037 = FASE-06 + COLECTIVO-44 | Equipos con hombre dentro que no cazan → fuga a 15-20 min. |
| A-038 = FASE-10 + COLECTIVO-20 | El control del boquete: la ventana que se sostiene sin cazar. |
| A-039 = FASE-15 + COLECTIVO-19 | El equipo fundido tras 80 km al frente y el relevo entre equipos. |
| A-040 = FASE-16 + COLECTIVO-26 | La claudicación: el pelotón se rinde y la etapa es de la fuga. |
| A-041 = FASE-19 + FORMATO-31 | La meta volante disputada por la fuga y por el pelotón. |
| A-042 = FASE-26 + COLECTIVO-21 | El puerto de tempo y el tempo del equipo fuerte. |
| A-043 = FORMATO-02 + COLECTIVO-45 | El abanico como decisión de un equipo, no como dado. |
| A-050 = FORMATO-30 + COLECTIVO-11 | Las clasificaciones secundarias como motivo de equipo. |
| A-069 = FORMATO-09 + FASE-12 | La clásica larga y la dosificación de 280 km. |
| A-081 = FORMATO-03 + FASE-23 | La aproximación al sector de pavés y la pelea por la posición. |
| A-091 = FORMATO-42 + FASE-27 | El puerto decisivo / final en alto: tren y ataques. |
| A-092 = FORMATO-27 + FASE-31 | La emboscada con compañeros en la fuga como relevo. |
| A-099 = FORMATO-43 + FASE-36 | El descenso tras el último puerto: arriesgar o asegurar. |
| A-106 = FASE-50 + COLECTIVO-34 | El contraataque inmediato tras la captura. |
| A-110 = FORMATO-18 + FASE-21 | La general decidida por bonificaciones en el sprint final. |
| A-113 = FORMATO-04 + FASE-47 | Dos compañeros en el grupo decisivo: superioridad numérica. |
| A-115 = FASE-39 + COLECTIVO-46 | La colaboración que se rompe en el grupo decisivo del valle. |
| A-128 = FASE-52 + COLECTIVO-50 | La memoria del día anterior (táctica y colectiva). |
| A-006/A-012 NO fusionadas | (Nota) FASE-03 y COLECTIVO-03 se mantienen separadas: una es la ráfaga de intentos, la otra el voto del equipo sin representación. |

### Parejas que se parecen y NO se han fusionado (a propósito)

- **FORMATO-05 (percance del favorito en pavés) vs FASE-17 (caída y tregua del pelotón)**: en la clásica el pelotón NO espera; en la vuelta sí. Conclusiones opuestas.
- **FORMATO-26 (el equipo del líder roto) vs FASE-30 (los rivales que atacan al líder roto)**: mismo día, actores distintos (equipo propio vs rivales).
- **FORMATO-46 (última cota a > 30 km) vs A-092 (la emboscada)**: uno es el umbral de terreno, el otro la jugada con compañeros delante.
- **FORMATO-47 (llana de 3.ª semana sin sprinters) vs COLECTIVO-22 (campo sin fuerza)**: una es fuerza perdida por abandonos, la otra fuerza que nunca existió.
- **FORMATO-02/COLECTIVO-45 (romper en el viento) vs FASE-24 (aproximación al tramo) vs FORMATO-50 (los T3 rompen en gran vuelta)**: decisión, anticipación y actor distinto.
- **FASE-08 vs COLECTIVO-04/05/06**: el hombre de la general en la fuga se ve como situación (fase) y como tres votos distintos (maillot vetado, top-5, general virtual).
- **COLECTIVO-25 (la caza que llega justo) vs A-040 (la caza que no llega)**: desenlaces contrarios de la misma cuenta.

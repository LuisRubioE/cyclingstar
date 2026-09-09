# Índice del grupo C — «QUÉ SE JUEGA»

Entrada: **144 situaciones** (`casos-general.md` 45 + `casos-secundarias.md` 50 + `casos-memoria.md` 49).
Salida: **131 situaciones** tras fusionar **13 duplicados** en 11 fusiones (dos de ellas a tres bandas).

El texto completo de cada situación (cuándo, quién decide, qué pasa en carretera, qué hace hoy el motor,
la cita del dueño, la información necesaria y cómo se mediría) vive en su fichero de lente; aquí solo está
la vista navegable. Estado: `CUBIERTO` · `PARCIAL` · `AUSENTE` · `CONTRARIO` (el motor hace lo opuesto).
En las fusiones se conserva el estado más pesimista de los orígenes y `sí` en Dueño si cualquiera tenía cita.

---

## Fase `convocatoria`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | El maillot amarillo, puesto a cazar puntos de montaña por sus propias órdenes | convocatoria | equipo | CONTRARIO | sí | El líder de la general nunca sale con la orden de disputar cimas ni volantes. | casos-secundarias.md SECUNDARIAS-22 |
| C-002 | Motivo de equipo «puntos»: quién tira por el maillot verde | convocatoria | equipo | AUSENTE | sí | «Puntos» es un motivo con derecho al frente: obliga a tirar por la volante y a montar el tren dos veces. | casos-secundarias.md SECUNDARIAS-40 |
| C-003 | El maillot de la montaña como motivo de equipo | convocatoria | equipo | AUSENTE | sí | El equipo cuyo activo es el maillot azul organiza el día alrededor de él: manda un hombre a la fuga y no persigue. | casos-secundarias.md SECUNDARIAS-41 + casos-memoria.md MEMORIA-36 |
| C-004 | Motivo de equipo «joven» | convocatoria | equipo | AUSENTE | — | El equipo del maillot blanco corre como una general de segundo nivel: arropa, no persigue, no cede ante su rival de edad. | casos-secundarias.md SECUNDARIAS-42 |
| C-005 | Motivo de equipo «clasificación por equipos» | convocatoria | equipo | AUSENTE | — | Mantener tres hombres arriba es un motivo menor pero real que cambia a quién se espera y a quién se protege. | casos-secundarias.md SECUNDARIAS-43 |
| C-006 | Un equipo con varios motivos a la vez: cuál manda y cuánto suma | convocatoria | equipo | PARCIAL | sí | Con varios motivos el equipo los ordena, no los suma: manda el de más derecho y el secundario se apaña. | casos-secundarias.md SECUNDARIAS-44 |
| C-007 | El humano con el maillot que decide no defenderlo | convocatoria | humano | CONTRARIO | sí | Si el dueño del maillot declara que no lo defiende, su equipo no se funde controlando por él. | casos-general.md GENERAL-41 |
| C-008 | Órdenes condicionales sobre la general: «si la fuga pasa de X, tira» | convocatoria | humano | AUSENTE | sí | El mánager fija antes de la etapa la política de caza y de defensa, y el equipo la ejecuta. | casos-general.md GENERAL-42 |
| C-009 | Las órdenes del jugador sobre objetivos parciales están desconectadas | convocatoria | humano | CONTRARIO | sí | Marcar «hoy voy a por la montaña» tiene que cambiar el día del corredor; hoy no la lee nadie. | casos-secundarias.md SECUNDARIAS-46 |
| C-010 | En la mayoría de las carreras no hay sprint intermedio que disputar | convocatoria | organizacion | PARCIAL | sí | Toda etapa en línea de una vuelta lleva una meta volante entre el 40 % y el 70 % del recorrido. | casos-secundarias.md SECUNDARIAS-01 |
| C-011 | El dorsal amarillo del equipo líder | convocatoria | organizacion | AUSENTE | sí | El equipo que lleva el dorsal de líder da la cara: un extra pequeño de derecho al frente. | casos-secundarias.md SECUNDARIAS-33 |
| C-012 | Un corredor no sabe qué clasificación lidera ni por cuánto | convocatoria | organizacion | AUSENTE | sí | Cada corredor sale sabiendo su puesto y su distancia en las cuatro clasificaciones, no solo en la general. | casos-secundarias.md SECUNDARIAS-45 |

## Fase `salida`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-013 | El líder de la regularidad se mete en la fuga para cazar los intermedios | salida | corredor | AUSENTE | — | El aspirante al verde que no gana sprints se va a la fuga para pasar primero la volante. | casos-secundarias.md SECUNDARIAS-08 |
| C-014 | Ir a la fuga para ganar el maillot de montaña | salida | corredor | AUSENTE | — | El cazapuntos pelea por entrar en la fuga del día en que hay muchos puntos de cima, no en la de mañana. | casos-secundarias.md SECUNDARIAS-15 |
| C-015 | El líder de la montaña defiende su maillot | salida | corredor | AUSENTE | — | Si su rival entra en la fuga de un día con muchos puntos, el líder de la montaña se mete con él a cualquier precio. | casos-secundarias.md SECUNDARIAS-20 |
| C-016 | El premio a la combatividad como motivo para estar en la fuga | salida | corredor | AUSENTE | — | Hay quien se va 150 km sabiendo que le cazan: la tele y el dorsal rojo son motivo suficiente. | casos-secundarias.md SECUNDARIAS-29 |
| C-017 | El cazaetapas cuyo objetivo real es «estar en la fuga» | salida | corredor | PARCIAL | sí | Si entra, cambia de conducta y colabora; si la fuga se forma sin él, su día se ha acabado. | casos-secundarias.md SECUNDARIAS-37 |
| C-018 | El fugado de ayer, hoy no está | salida | corredor | CONTRARIO | sí | El que pasó cinco horas en cabeza ayer no lo intenta hoy: la fuga la forman otros nombres. | casos-memoria.md MEMORIA-06 |
| C-019 | Los equipos fuera de la general se hacen cazaetapas | salida | equipo | CUBIERTO | sí | El equipo sin baza manda uno o dos hombres a la fuga cada día, con más ganas cuanto más apta es la etapa. | casos-general.md GENERAL-19 |
| C-020 | El equipo del maillot de montaña hace el trabajo del maillot de montaña | salida | equipo | AUSENTE | sí | Mete hombres en los intentos hasta que uno cuaja, no colabora en la caza y le lleva al pie del puerto. | casos-secundarias.md SECUNDARIAS-21 |
| C-021 | El equipo sin nada que hacer manda un hombre a la fuga por el patrocinador | salida | equipo | PARCIAL | sí | Hoy tiene que estar alguien de este equipo delante: se manda a uno, y los demás dejan de intentarlo. | casos-secundarias.md SECUNDARIAS-38 |
| C-022 | Cupo y composición: cada equipo manda a la fuga al hombre de su objetivo | salida | equipo | AUSENTE | sí | La fuga buena lleva un hombre por equipo, y ese hombre es el que sirve al objetivo del día de su equipo. | casos-secundarias.md SECUNDARIAS-47 |
| C-023 | Etapa 1 y carrera de un día: no hay general | salida | peloton | CUBIERTO | sí | Se corre por la etapa, pero nadie deja marchar una fuga que se vestiría el primer maillot con minutos. | casos-general.md GENERAL-01 |
| C-024 | Última etapa de trámite: paseo, tregua y sprint en el circuito | salida | peloton | AUSENTE | — | No se corre hasta el circuito final: sin fugas serias ni ataques de general, y el sprint sí de verdad. | casos-general.md GENERAL-35 + casos-secundarias.md SECUNDARIAS-36 + casos-memoria.md MEMORIA-39 |
| C-025 | La aduana del pelotón mira quién va, no solo cuánto amenaza | salida | peloton | PARCIAL | sí | La cuerda se da o se niega por composición: quién va en el intento y si mi equipo está representado. | casos-secundarias.md SECUNDARIAS-48 |
| C-026 | Al ganador de ayer no le dejan ir | salida | peloton | AUSENTE | sí | Si el que ganó ayer intenta colarse, saltan tres: descuento fuerte de cuerda, no veto. | casos-memoria.md MEMORIA-11 |
| C-027 | El fugado de ayer paga aduana hoy | salida | peloton | AUSENTE | sí | Al que estuvo fuera ayer se le vigila más, y su equipo manda hoy a otro hombre. | casos-memoria.md MEMORIA-12 |

## Fase `fuga`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-028 | Maillot sin equipo (agente libre): tiene que tirar él | fuga | corredor | CONTRARIO | sí | Si nadie trabaja por él y la fuga le quita el maillot, el líder sin equipo releva o lo pierde. | casos-general.md GENERAL-27 |
| C-029 | El fugado que corona la cima y se deja coger | fuga | corredor | AUSENTE | sí | Cobrados los puntos de la última cima puntuable, se sienta y espera al pelotón. | casos-secundarias.md SECUNDARIAS-49 |
| C-030 | El que no releva hoy porque el otro no relevó ayer | fuga | corredor | AUSENTE | sí | La cuenta pendiente de ayer se cobra en los relevos de hoy, aunque cueste la fuga. | casos-memoria.md MEMORIA-25 |
| C-031 | La alianza dentro de la fuga: los que se entienden | fuga | corredor | AUSENTE | sí | Los que se entienden relevan a tope y dejan fuera al que no colabora; dos compañeros se ayudan en vez de pelearse. | casos-memoria.md MEMORIA-28 |
| C-032 | Maillot prestado: el cronista o el rodador que lo perderá en la montaña | fuga | equipo | CONTRARIO | sí | El equipo de un maillot que no sobrevive al final de hoy no se funde controlando: el trabajo es del favorito real. | casos-general.md GENERAL-03 |
| C-033 | General apretada en etapa llana: control compartido, nadie regala | fuga | equipo | PARCIAL | sí | Tira el equipo del maillot; los rivales entran solo cuando la fuga también les pasa, y entonces reparten. | casos-general.md GENERAL-05 |
| C-034 | General decidida: el líder gestiona y su equipo controla a distancia | fuga | equipo | CUBIERTO | sí | Se deja ir toda fuga sin hombres dentro del colchón y se controla el boquete sin cazar. | casos-general.md GENERAL-15 |
| C-035 | El hombre «lejano» a 10 min al que se deja ir | fuga | equipo | AUSENTE | sí | Se le deja hasta que su virtual toca al último hombre protegido; y él, dentro de la fuga, se guarda para que no se note. | casos-general.md GENERAL-16 |
| C-036 | La fuga PELIGROSA: alguien a 3-6 min en la escapada | fuga | equipo | CUBIERTO | sí | Si el virtual entra en el podio, se caza a muerte desde lejos aunque cueste el tren del sprint. | casos-general.md GENERAL-17 |
| C-037 | El líder virtual: la fuga pone a alguien en amarillo virtual | fuga | equipo | PARCIAL | sí | El equipo del maillot se pone entero al frente; el equipo del virtual se sienta y estorba. | casos-general.md GENERAL-21 |
| C-038 | El equipo del 2.º ayuda a cazar o se cruza de brazos: «tira tú, que es tu problema» | fuga | equipo | PARCIAL | sí | Si la fuga pasa a todo el podio, dos o tres equipos reparten el trabajo; si solo pasa al líder, los demás miran. | casos-general.md GENERAL-22 + casos-memoria.md MEMORIA-26 |
| C-039 | La general VIRTUAL por equipo: lo que la fuga de hoy le cuesta a MI hombre | fuga | equipo | PARCIAL | sí | Cada equipo cuenta los puestos que pierde su hombre con este boquete, sumando a todos los fugados que le pasan. | casos-general.md GENERAL-23 |
| C-040 | El satélite: compañero del favorito en la fuga, y el puente del jefe | fuga | equipo | AUSENTE | sí | El satélite no tira en la fuga y se deja caer en el último puerto para esperar a su jefe. | casos-general.md GENERAL-25 |
| C-041 | Maillot con equipo débil o fundido: alianza o nadie controla | fuga | equipo | PARCIAL | sí | Con el equipo del maillot gastado, o se alían los rivales amenazados o el maillot cambia de manos. | casos-general.md GENERAL-26 |
| C-042 | El equipo del verde caza la fuga ANTES de la pancarta y luego le da cuerda | fuga | equipo | AUSENTE | sí | Un solo equipo tira 40 km por veinte puntos y afloja 500 m después de la volante. | casos-secundarias.md SECUNDARIAS-07 |
| C-043 | El equipo que dejó escapar la fuga ayer la persigue hoy desde el km 0 | fuga | equipo | AUSENTE | sí | Después de que una fuga les robe una etapa, los equipos de sprinters acortan la cuerda del día siguiente. | casos-memoria.md MEMORIA-18 |
| C-044 | Dos equipos persiguen juntos (coalición del día) | fuga | equipo | PARCIAL | sí | Se alternan al frente por bloques y si uno afloja el otro también: la caza es una negociación. | casos-memoria.md MEMORIA-24 |
| C-045 | La etapa-tregua con la general decidida: la fuga a 15-20 minutos | fuga | peloton | PARCIAL | sí | Cuando ningún equipo se juega nada, se constata pronto y el pelotón ya no vuelve a apretar. | casos-general.md GENERAL-20 + casos-secundarias.md SECUNDARIAS-34 |
| C-046 | El intermedio dentro de la fuga: los fugados se lo disputan entre ellos | fuga | grupo | PARCIAL | sí | Lo pelean dos o tres de los seis; los demás pasan a rueda y la fuga se rehace enseguida. | casos-secundarias.md SECUNDARIAS-06 |
| C-047 | Disputar la cima entre fugados | fuga | grupo | PARCIAL | sí | Dos km antes de la cima la fuga se estira por los puntos, y después se espera y se rehace. | casos-secundarias.md SECUNDARIAS-16 |

## Fase `medio`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-048 | El hombre de la general que ya no lo es: del grupo de favoritos al grupeto | medio | corredor | PARCIAL | sí | El que ya no juega nada se deja ir pronto y a propósito, para ahorrar o para servir a otro. | casos-general.md GENERAL-45 |
| C-049 | Duelo por el maillot de puntos: dos hombres y dos equipos por la misma pancarta | medio | corredor | AUSENTE | sí | Se marca al rival de la clasificación, no al mejor sprinter del pelotón. | casos-secundarias.md SECUNDARIAS-03 |
| C-050 | Quién renuncia al intermedio | medio | corredor | CONTRARIO | sí | Esprintan entre tres y quince; el que no se juega nada pasa levantado y no paga. | casos-secundarias.md SECUNDARIAS-04 |
| C-051 | El sprinter que pasa el intermedio en montaña y luego se deja caer al grupeto | medio | corredor | AUSENTE | sí | Cobrada la volante, al pie del primer puerto levanta el pie y cambia de objetivo. | casos-secundarias.md SECUNDARIAS-09 |
| C-052 | El sprinter que administra un día de montaña desde el km 0 (grupeto voluntario) | medio | corredor | PARCIAL | sí | Se descuelga antes de que duela, forma el autobús y corre contra el corte, no contra la etapa. | casos-secundarias.md SECUNDARIAS-10 + casos-memoria.md MEMORIA-42 |
| C-053 | Cuánto vale el puerto decide cuánto se mueve la carrera | medio | corredor | AUSENTE | — | Nadie se destroza por un cat4; por un HC con el maillot en juego se corre desde 10 km antes de la cima. | casos-secundarias.md SECUNDARIAS-18 |
| C-054 | El coste de coronar: hoy paga todo el que puntúa | medio | corredor | CONTRARIO | sí | El esfuerzo lo paga quien acelera por la cima, no quien pasa octavo yendo colocado. | casos-secundarias.md SECUNDARIAS-23 |
| C-055 | El escalador reventado corona detrás del que llega entero | medio | corredor | CUBIERTO | — | Los banners se puntúan con las piernas de ahora, no con las del papel. | casos-secundarias.md SECUNDARIAS-24 |
| C-056 | Bonificaciones en volantes y cimas: la pancarta con la general por segundos | medio | equipo | AUSENTE | sí | Si la pancarta da segundos y la general va apretada, la disputan los favoritos y sus equipos, no los sprinters. | casos-general.md GENERAL-09 + casos-secundarias.md SECUNDARIAS-11 + casos-memoria.md MEMORIA-22 |
| C-057 | El 2.º y el 3.º TIENEN que atacar, no controlar | medio | equipo | PARCIAL | sí | El equipo del 2.º no controla la carrera: no caza lo que solo daña al maillot y mueve a su hombre. | casos-general.md GENERAL-10 |
| C-058 | La emboscada en llano o viento: el equipo del maillot se queda solo | medio | equipo | AUSENTE | sí | Dos equipos rompen a propósito en la zona expuesta con sus jefes colocados y el corte rueda a tope. | casos-general.md GENERAL-29 |
| C-059 | Apretar cuando el líder está cortado (abanico, caída, pinchazo) | medio | equipo | AUSENTE | sí | Con el maillot descolgado por causa no física, los favoritos de delante suben el ritmo. | casos-general.md GENERAL-30 |
| C-060 | La colocación del maillot en el abanico: por general, no por rol | medio | equipo | PARCIAL | sí | Los equipos de la general se pelean el frente antes de la zona expuesta y colocan a su hombre delante. | casos-general.md GENERAL-44 |
| C-061 | El tren del sprinter lanza el sprint intermedio como si fuera una meta | medio | equipo | AUSENTE | sí | El tren del verde sube 5-8 km antes de la pancarta y gasta hombres que luego faltan en meta. | casos-secundarias.md SECUNDARIAS-02 |
| C-062 | El intermedio con la fuga por delante: el pelotón esprinta por lo que queda | medio | equipo | CONTRARIO | — | Los fugados se llevan los primeros puestos y el pelotón se juega los que sobran, mirando cuántos van delante. | casos-secundarias.md SECUNDARIAS-05 |
| C-063 | La tregua no escrita frente al líder caído | medio | peloton | AUSENTE | sí | Se espera si la caída del maillot es en zona neutra; no se espera en pleno abanico ni en el puerto final. | casos-general.md GENERAL-32 |
| C-064 | La pancarta como punto de colocación: la pelea por la posición antes y después | medio | peloton | AUSENTE | sí | El pelotón se estira antes de la volante y se relaja justo después: ventana de contraataque. | casos-secundarias.md SECUNDARIAS-50 |
| C-065 | El acelerón por la cima cambia el ritmo del grupo entero | medio | grupo | AUSENTE | sí | La pelea por una cima gorda endurece los últimos 2-3 km del puerto para todos. | casos-secundarias.md SECUNDARIAS-19 |
| C-066 | La general en la crónica: grupo del maillot, líder virtual y a quién le cuesta | medio | organizacion | PARCIAL | sí | La crónica dice en qué grupo va el maillot, quién es líder virtual y por qué persigue cada equipo. | casos-general.md GENERAL-43 |
| C-067 | La cima puntúa para todo el pelotón, en orden de coronación | medio | organizacion | CUBIERTO | — | Los puntos de cima se reparten por orden de paso entre todos los grupos, no solo en cabeza. | casos-secundarias.md SECUNDARIAS-17 |
| C-068 | «Pasa a liderar la montaña»: el motor solo sabe los puntos de hoy | medio | organizacion | PARCIAL | sí | Solo se canta el liderato de una clasificación conociendo la acumulada de la carrera. | casos-secundarias.md SECUNDARIAS-26 |

## Fase `aproximacion`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-069 | General apretada en media montaña con la última cota lejos de meta | aproximacion | corredor | PARCIAL | sí | Se ataca en el último puerto aunque queden 35 km de llano, y se coopera hasta meta. | casos-general.md GENERAL-07 |
| C-070 | El maillot solo en un grupo de 20 con el virtual delante | aproximacion | corredor | PARCIAL | sí | Tiran los que pierden puestos con la situación; el maillot solo tira si nadie más pierde. | casos-general.md GENERAL-28 |
| C-071 | La clasificación por equipos como motivo de no dejar caer al tercer hombre | aproximacion | equipo | AUSENTE | sí | Se manda un compañero a llevar a rueda al tercer hombre para no perder el tercer tiempo. | casos-secundarias.md SECUNDARIAS-30 |

## Fase `decisivo`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-072 | General apretada con final en alto: el maillot marca, los rivales atacan | decisivo | corredor | PARCIAL | sí | El maillot responde al que le puede quitar el maillot y deja ir al que no. | casos-general.md GENERAL-06 |
| C-073 | El líder aislado responde solo; el marcaje que no se ordena | decisivo | corredor | PARCIAL | sí | Los rivales atacan por turnos y el maillot sin gregarios discrimina a quién sigue. | casos-general.md GENERAL-12 |
| C-074 | Podio y top-10 en juego: se corre por PUESTOS, no solo por el maillot | decisivo | corredor | AUSENTE | — | El 4.º ataca al 3.º y el 3.º le marca a él, aunque al maillot le dé igual. | casos-general.md GENERAL-14 |
| C-075 | El día en que el líder se rompe en el puerto | decisivo | corredor | CONTRARIO | sí | En cuanto el maillot cede, sus rivales atacan más, no menos, y los de detrás suben puestos. | casos-general.md GENERAL-31 |
| C-076 | El compañero del líder en cabeza cuando el líder se rompe: parar y esperar | decisivo | corredor | CUBIERTO | sí | Desde el grupo de favoritos se deja caer a marcarle el ritmo; desde la fuga, al menos deja de tirar. | casos-general.md GENERAL-33 |
| C-077 | Última etapa decisiva (final en alto o crono final): todo o nada | decisivo | corredor | AUSENTE | sí | Sin mañana se ataca de más lejos, los equipos se funden enteros y el maillot no deja ir nada. | casos-general.md GENERAL-36 |
| C-078 | La crono con general: orden inverso, el líder sale último sabiendo los tiempos | decisivo | corredor | PARCIAL | sí | El maillot corre a lo que haga falta con las referencias de sus rivales, ni más ni menos. | casos-general.md GENERAL-40 |
| C-079 | El maillot joven como objetivo de quien no puede pelear el podio | decisivo | corredor | AUSENTE | — | Corre la general de otra carrera: no sigue a los favoritos, marca al otro joven. | casos-secundarias.md SECUNDARIAS-27 |
| C-080 | El duelo entre dos jóvenes: marcarse el uno al otro | decisivo | corredor | AUSENTE | sí | En el grupo que ya no se juega la etapa, el 2.º de los jóvenes ataca y el 1.º responde. | casos-secundarias.md SECUNDARIAS-28 |
| C-081 | Marcaje emergente entre favoritos sin orden del jugador | decisivo | corredor | AUSENTE | sí | Cuatro hombres se vigilan entre sí: al que ataca le responde el que le tiene medido. | casos-memoria.md MEMORIA-15 |
| C-082 | Aislar al líder: el equipo del 2.º pone tempo duro en el puerto | decisivo | equipo | AUSENTE | sí | Los gregarios del 2.º tiran para descolgar a los del maillot, y cuando se queda solo, el 2.º salta. | casos-general.md GENERAL-11 |
| C-083 | Dos hombres en la general: co-líderes y el «1-2» | decisivo | equipo | AUSENTE | sí | Uno ataca y obliga a tirar, el otro contraataca a rueda; si uno cae, el otro pasa a jefe sin discusión. | casos-general.md GENERAL-13 |
| C-084 | El traspaso del maillot en carretera: el nuevo líder virtual y su equipo | decisivo | equipo | AUSENTE | sí | En cuanto cambia el líder virtual, su equipo deja de atacar y controla, y los demás le atacan a él. | casos-general.md GENERAL-34 |
| C-085 | Colocar tres hombres en la etapa de montaña por la clasificación por equipos | decisivo | equipo | AUSENTE | — | Los gregarios de montaña de ese equipo aprietan un poco más para no perder el tercer tiempo. | casos-secundarias.md SECUNDARIAS-32 |
| C-086 | La última cima de una etapa reina: los puntos se los llevan los favoritos | decisivo | grupo | CUBIERTO | sí | En el puerto final coronan los que se juegan la etapa y la general, no el cazapuntos. | casos-secundarias.md SECUNDARIAS-25 |

## Fase `desenlace`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-087 | La bonificación de meta como objetivo de la general | desenlace | corredor | AUSENTE | sí | Con la general a segundos, el 2.º remata por los 10 s y el maillot se mete en el sprint para taparle. | casos-general.md GENERAL-08 + casos-secundarias.md SECUNDARIAS-12 |
| C-088 | El líder con la general hecha no disputa la etapa y a veces la regala | desenlace | corredor | AUSENTE | sí | Con cinco minutos, el maillot no se pelea la etapa: la deja a la fuga o a un compañero. | casos-general.md GENERAL-18 |
| C-089 | Los puntos de meta como la parte gorda de la regularidad | desenlace | corredor | PARCIAL | — | El que va a por el verde sigue esprintando por el quinto puesto cuando ya no puede ganar. | casos-secundarias.md SECUNDARIAS-13 |
| C-090 | Maillot por bonificaciones tras la primera llana: el sprinter-maillot | desenlace | equipo | CONTRARIO | sí | El sprinter que lleva el maillot conserva su tren y su lanzador: el maillot no le quita el sprint. | casos-general.md GENERAL-02 |
| C-091 | La vuelta llana que se decide por bonificaciones | desenlace | equipo | PARCIAL | sí | Cuando la general la hacen los 10/6/4, la meta vale general: los sprinters trabajan el doble y nadie regala la fuga. | casos-general.md GENERAL-04 |
| C-092 | El sprinter que falló ayer y el tren que arriesga hoy | desenlace | equipo | AUSENTE | sí | El equipo que perdió el sprint por colocación lanza antes hoy; el que ya ganó se conforma con la rueda. | casos-memoria.md MEMORIA-19 |
| C-093 | El readmitido fuera de control pierde los puntos de la etapa | desenlace | organizacion | CUBIERTO | sí | Quien entra fuera de control y es readmitido conserva la general pero pierde los puntos del día. | casos-secundarias.md SECUNDARIAS-14 |

## Fase `entre-etapas`

| ID | Título | Fase | Actor | Estado | Dueño | La regla en una línea | Origen |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-094 | El día después de perder tiempo: atacar mañana | entre-etapas | corredor | CONTRARIO | sí | El que perdió minutos ayer cambia de plan: se mete en la fuga o ataca de lejos, y su equipo le lanza. | casos-general.md GENERAL-38 + casos-memoria.md MEMORIA-17 |
| C-095 | El depósito del día 18 no es el del día 3 | entre-etapas | corredor | CUBIERTO | sí | En la tercera semana el pelotón se rompe antes, los gregarios duran menos y las fugas cuajan más fácil. | casos-memoria.md MEMORIA-01 |
| C-096 | El cerillo que se quemó ayer | entre-etapas | corredor | AUSENTE | — | El que se vació ayer sale hoy con un cerillo menos y no salta a la primera aceleración. | casos-memoria.md MEMORIA-02 |
| C-097 | El líder que administra: dosificar la vuelta, no la etapa | entre-etapas | corredor | CONTRARIO | sí | Un favorito no gasta un cerillo en una media montaña del día 6 aunque pudiera ganarla. | casos-memoria.md MEMORIA-04 |
| C-098 | El que se cayó ayer corre tocado hoy | entre-etapas | corredor | AUSENTE | sí | Rueda protegido, no entra en relevos, no arriesga en el descenso y se descuelga antes. | casos-memoria.md MEMORIA-07 |
| C-099 | El enfermo que aguanta dos días antes de bajarse | entre-etapas | corredor | CONTRARIO | sí | Enfermar no es abandonar hoy: un día en el grupeto, otro intentándolo, y se baja al tercero. | casos-memoria.md MEMORIA-08 |
| C-100 | La crono dentro del plan de vuelta | entre-etapas | corredor | AUSENTE | sí | El que va a perder tres minutos no se vacía: rueda para no perder más y guarda para la montaña. | casos-memoria.md MEMORIA-34 |
| C-101 | El maillot de puntos como plan de tres semanas | entre-etapas | corredor | AUSENTE | sí | Disputa volantes que no le dan nada salvo puntos y en la montaña se protege para seguir puntuando. | casos-memoria.md MEMORIA-37 |
| C-102 | La moral después de ganar o de fallar | entre-etapas | corredor | AUSENTE | sí | El que ganó ayer va crecido y se atreve; el que se hundió se esconde. | casos-memoria.md MEMORIA-47 |
| C-103 | El que llega con la vuelta anterior en las piernas | entre-etapas | corredor | PARCIAL | sí | El que viene de tres semanas no pelea el primer día, y su director lo sabe al convocarle. | casos-memoria.md MEMORIA-49 |
| C-104 | El colchón que necesita el líder depende de lo que queda de vuelta | entre-etapas | equipo | AUSENTE | sí | La misma fuga con un hombre a 3 min es tolerable el día 3 y letal el día 19. | casos-general.md GENERAL-24 |
| C-105 | La penúltima etapa antes de la crono: el mal cronista tiene que ganar tiempo hoy | entre-etapas | equipo | AUSENTE | sí | El escalador que perderá 1:30 en la crono ataca hoy de lejos y su equipo endurece la etapa. | casos-general.md GENERAL-37 |
| C-106 | El maillot recién estrenado cambia de rol entre etapas (cazaetapas → líder) | entre-etapas | equipo | CUBIERTO | sí | El que se viste de líder deja de atacar y su equipo le arropa; cuando lo pierda, vuelve a su papel. | casos-general.md GENERAL-39 + casos-memoria.md MEMORIA-41 |
| C-107 | El equipo que se queda sin tres hombres y ya no juega | entre-etapas | equipo | AUSENTE | — | Al caer de la clasificación por equipos ese motivo desaparece y sus hombres quedan libres. | casos-secundarias.md SECUNDARIAS-31 |
| C-108 | El equipo que ya ganó su etapa afloja; el que no ha ganado nada se desespera | entre-etapas | equipo | AUSENTE | sí | El que cumplió guarda a su gente; el que lleva quince días sin nada mete dos hombres en todos los intentos. | casos-secundarias.md SECUNDARIAS-39 + casos-memoria.md MEMORIA-21 |
| C-109 | El gregario gastado que ya no puede tirar | entre-etapas | equipo | PARCIAL | sí | El equipo que ayer tiró 120 km hoy pone a otros dos, o el frente cambia de manos. | casos-memoria.md MEMORIA-03 |
| C-110 | El equipo del maillot paga el jersey día tras día | entre-etapas | equipo | PARCIAL | sí | Al cuarto o quinto día de controlar, el equipo del maillot ya no llega y el maillot cambia de manos. | casos-memoria.md MEMORIA-09 |
| C-111 | El maillot nuevo estrena marcaje | entre-etapas | equipo | PARCIAL | sí | El día después de vestirse, el líder corre con dos sombras y su equipo pierde libertad. | casos-memoria.md MEMORIA-14 |
| C-112 | El equipo que te marcó porque le ganaste ayer | entre-etapas | equipo | AUSENTE | sí | Un equipo agraviado dedica un hombre a seguir la rueda del rival concreto y no le da relevos. | casos-memoria.md MEMORIA-16 |
| C-113 | El equipo sin nada, a mitad de vuelta, se mete en todas las fugas | entre-etapas | equipo | PARCIAL | sí | La desesperación escala con los días sin resultado: uno cada día, y hacia el final dos. | casos-memoria.md MEMORIA-20 |
| C-114 | La revancha del director: el plan que ayer salió mal | entre-etapas | equipo | AUSENTE | sí | Tras un error de planteamiento el equipo cambia el plan: dos hombres a vigilar, o el trabajo 30 km antes. | casos-memoria.md MEMORIA-23 |
| C-115 | Rivalidad estructural: dos equipos que nunca colaboran | entre-etapas | equipo | AUSENTE | sí | Hay parejas de equipos que no se relevan ni queriendo lo mismo. | casos-memoria.md MEMORIA-27 |
| C-116 | El día objetivo: la etapa marcada en el mapa | entre-etapas | equipo | PARCIAL | sí | El equipo gasta el presupuesto entero en su día y se esconde los anteriores para poder hacerlo. | casos-memoria.md MEMORIA-31 |
| C-117 | El día de tregua: el equipo regala la etapa | entre-etapas | equipo | CONTRARIO | — | Un equipo en día de tregua deliberada no tira, pero tampoco ataca ni manda gente a la fuga. | casos-memoria.md MEMORIA-32 |
| C-118 | Los sprints marcados de la vuelta | entre-etapas | equipo | PARCIAL | sí | El tren se reserva para sus días: en la montaña los lanzadores se van al grupeto. | casos-memoria.md MEMORIA-35 |
| C-119 | El reparto tácito de las fugas entre los equipos sin opciones | entre-etapas | equipo | AUSENTE | sí | Los equipos sin carta se turnan: la fuga de hoy casi nunca repite el equipo de ayer. | casos-memoria.md MEMORIA-38 |
| C-120 | Ceder el maillot a propósito | entre-etapas | equipo | CONTRARIO | — | Un equipo puede dejar marchar una fuga para quitarse el maillot y no tener que controlar diez días. | casos-memoria.md MEMORIA-40 |
| C-121 | El día en que el líder se rompe: el equipo cambia de jefe | entre-etapas | equipo | PARCIAL | sí | Si el jefe pierde varios minutos, al día siguiente la carta es otro y él pasa a gregario de lujo. | casos-memoria.md MEMORIA-43 |
| C-122 | El gregario que hereda cuando el jefe abandona | entre-etapas | equipo | PARCIAL | — | Con el jefe fuera nadie sigue de gregario de un fantasma: la orden con objetivo muerto degrada a libre. | casos-memoria.md MEMORIA-44 |
| C-123 | El equipo mermado rehace el plan | entre-etapas | equipo | PARCIAL | sí | Con cinco hombres no se reclama el frente: se protege al jefe y se manda uno a la fuga. | casos-memoria.md MEMORIA-45 |
| C-124 | La confianza del equipo después de desobedecer | entre-etapas | equipo | AUSENTE | sí | Al rebelde no le arropan al día siguiente, y a fin de mes no le convocan. | casos-memoria.md MEMORIA-48 |
| C-125 | La resaca de la etapa reina y la víspera de la crono | entre-etapas | peloton | AUSENTE | sí | El día después de la reina el pelotón sale a paseo y la fuga se va a la primera. | casos-secundarias.md SECUNDARIAS-35 + casos-memoria.md MEMORIA-05 |
| C-126 | El revelación de ayer pasa a ser amenaza | entre-etapas | peloton | CUBIERTO | sí | Al que ayer saltó al top-10 se le acorta la cuerda hoy, más de lo que dice su tiempo. | casos-memoria.md MEMORIA-13 |
| C-127 | El pacto de no agresión de un día concreto | entre-etapas | peloton | PARCIAL | sí | Tras dos días durísimos o una caída masiva, el pelotón acuerda tregua y la fuga sale a la primera. | casos-memoria.md MEMORIA-30 |
| C-128 | La víspera de la reina: nadie quiere gastar | entre-etapas | peloton | AUSENTE | sí | El día antes de la etapa decisiva la cuerda es larguísima: nadie de la general quiere gastar. | casos-memoria.md MEMORIA-33 |
| C-129 | El corte de tiempo como cuenta que se lleva desde ayer | entre-etapas | grupo | PARCIAL | sí | El grupeto se organiza sabiendo el margen que arrastra de los días anteriores. | casos-memoria.md MEMORIA-10 |
| C-130 | Sentarse en la rueda tiene precio mañana | entre-etapas | grupo | AUSENTE | sí | Al que ayer ganó sin relevar, hoy la fuga no le coopera. | casos-memoria.md MEMORIA-29 |
| C-131 | El humano corrige el plan leyendo la crónica de ayer | entre-etapas | humano | PARCIAL | sí | Las órdenes de hoy se dan leyendo el parte de ayer, y tienen que mover el resultado. | casos-memoria.md MEMORIA-46 |

---

## Las 11 fusiones (13 filas absorbidas)

| Fila del índice | Orígenes fundidos | Por qué es la misma situación |
| --- | --- | --- |
| C-003 | SECUNDARIAS-41 + MEMORIA-36 | Las dos lentes titulan «el maillot de la montaña como motivo de equipo» y piden el mismo dato y el mismo `claim`. |
| C-024 | GENERAL-35 + SECUNDARIAS-36 + MEMORIA-39 | La última etapa de trámite: paseo, sin ataques de general, sprint en el circuito. |
| C-038 | GENERAL-22 + MEMORIA-26 | Las dos caras del mismo reparto: el equipo del 2.º ayuda a cazar o deja el trabajo al maillot (`isThreatened`, 420 s). |
| C-045 | GENERAL-20 + SECUNDARIAS-34 | El día en que nadie tiene motivo y la fuga se va a 15-20 min; mismas citas de v38 y misma banda de 900 s. |
| C-052 | SECUNDARIAS-10 + MEMORIA-42 | El sprinter que decide irse al grupeto antes de que duela. |
| C-056 | GENERAL-09 + SECUNDARIAS-11 + MEMORIA-22 | La pancarta que reparte segundos con la general apretada: formato, conducta y «el segundo a cuatro segundos». |
| C-087 | GENERAL-08 + SECUNDARIAS-12 | Los 10/6/4 de meta como objetivo táctico de los hombres de la general. |
| C-094 | GENERAL-38 + MEMORIA-17 | El que perdió tiempo ayer cambia de plan y ataca hoy. |
| C-106 | GENERAL-39 + MEMORIA-41 | El cazaetapas que se viste de líder y cambia de rol entre etapas (v57). |
| C-108 | SECUNDARIAS-39 + MEMORIA-21 | El equipo que ya cumplió afloja (la otra mitad, la desesperación, vive aparte en C-113). |
| C-125 | SECUNDARIAS-35 + MEMORIA-05 | La resaca del día después de la reina (SECUNDARIAS-35 añade la víspera de la crono). |

Parejas que se parecen y **no** se han fundido, a propósito: C-019/C-021/C-022 (quién puebla la fuga, quién designa y el cupo por equipo), C-021/C-119 (designación de hoy contra turno entre días), C-073/C-081 (el líder aislado contra el marcaje emergente), C-078/C-100 (referencias en la crono contra dosificar la crono dentro del plan), C-045/C-125/C-127/C-128 (cuatro causas distintas del mismo día lento), C-002/C-101 (motivo de equipo «puntos» contra el plan de tres semanas del sprinter), C-048/C-052 (el ex-favorito y el sprinter, dos maneras de dejarse ir), C-008/C-009/C-131 (tres huecos distintos del sistema de órdenes).

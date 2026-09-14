# Captación de los primeros probadores

Estado: **plan operativo.** No es diseño de producto, es qué publicar, dónde y cuándo para conseguir
la primera base de probadores de la beta por invitación.

**Segunda regla, y ordena el ORDEN: la primera cohorte se recluta por PAÍS, no por idioma.** El juego
ya agrupa a los humanos por geografía y lo hace solo: las ofertas de contrato van por anillos (mismo
país, mismo continente, resto), el campeonato nacional mete a los humanos del país antes que a los
NPC, y las continentales son regionales. Ese mecanismo junta a treinta portugueses y **separa** a un
belga, un danés, un británico y un colombiano, que corren cada uno su campeonato solos. Y cuidado con
confundir idioma con país: el español reparte entre una docena de países y el inglés entre cincuenta.
Consecuencia práctica: **la lusófona primero** (Footstar es sobre todo Portugal), y las comunidades
internacionales cuando la población aguante la dispersión.

Regla de fondo que ordena todo lo demás: **no buscamos volumen, buscamos treinta personas que
vuelvan**. Treinta probadores que entren cuatro veces por semana valen infinitamente más que
trescientos registros que no vuelven, porque lo que hace falta medir es si el juego engancha, y eso
no se mide con gente que lo abre una vez.

---

## 1. Antes de publicar nada: tres cosas, una tarde

Publicar sin esto es gastar el único disparo que se tiene en cada comunidad.

**1.1 Recoger correos, NO registros.** Hoy `better-auth` corre sin enviar un solo correo: no hay
verificación, **no hay recuperación de contraseña** y el cambio de correo se aplica sin confirmar. Un
probador que pierda su contraseña pierde su corredor y no hay nada que hacer. Así que la llamada no
lleva a la pantalla de registro: lleva a un **formulario de lista de espera** (basta un formulario de
Google) con tres campos y nada más:

- Correo.
- País.
- «¿Has jugado a algún juego de mánager por navegador? ¿A cuál?»

La tercera pregunta no es curiosidad: es el filtro. Quien conteste «Hattrick», «Footstar»,
«ManagerZone» o «PCM» es exactamente el perfil, y es a quien se invita primero.

**1.2 Una captura buena, y solo una.** El mejor activo que tiene este juego hoy es **la crónica de
una etapa**: el texto que cuenta quién atacó, en qué kilómetro y qué pasó. Una captura de eso vende
mejor que cualquier descripción, porque enseña la profundidad en un vistazo. En los sitios donde una
imagen es opcional, ponerla igualmente: los mensajes con imagen se leen mucho más.

**1.3 Decir en qué idioma está.** La interfaz está en inglés. En los mensajes en español y en
portugués hay que decirlo, porque descubrirlo después es una decepción evitable.

---

## 2. Dónde, por orden de rendimiento esperado

Marco mi confianza porque no puedo comprobar hoy si cada sitio sigue activo ni sus reglas actuales.
**En todos hay que leer la norma de autopromoción antes de publicar**, y en varios conviene escribir
antes a un moderador.

### Nivel 1: el público exacto

| Sitio                            | Qué es                                                                                                                                                                                                                                                                                                             | Confianza |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- |
| **pcmdaily.com**                 | La comunidad de Pro Cycling Manager. Llevan años organizando sus propios juegos de mánager de ciclismo por internet. Es, con diferencia, el público mejor emparejado que existe                                                                                                                                    | Alta      |
| **La comunidad de Footstar**     | Sus jugadores son el perfil psicológico exacto: gente que disfruta un simulador lento, persistente y de texto. **Su creador ya ha contestado y la puerta está abierta**: falta pedirle anunciarlo en el foro de fuera de tema cuando haya beta cerrada. Es la jugada de PManager aplicada (§4.22.1 de `agenda.md`) | Alta      |
| **forum.cyclingnews.com**        | Foro de ciclismo profesional de los de toda la vida, con secciones fuera de tema                                                                                                                                                                                                                                   | Alta      |
| **r/procyclingmanager** (Reddit) | Los jugadores de PCM en Reddit                                                                                                                                                                                                                                                                                     | Media     |

### Nivel 2: público amplio, reglas estrictas

| Sitio            | Qué es                                                         | Aviso                                                                                                    |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **r/peloton**    | El gran foro de ciclismo profesional en Reddit                 | **Escribir a los moderadores ANTES.** Que te expulsen de aquí el primer día es el peor resultado posible |
| **r/playmygame** | Existe justamente para esto: enseñas tu juego y te dan opinión | Volumen bajo, fricción cero                                                                              |
| **r/WebGames**   | Juegos de navegador                                            | Leer la norma de autopromoción                                                                           |

### Nivel 3: barato y complementario

- **Comunidades de otros mánagers por navegador** (Hattrick, Sokker, ManagerZone, Trophy Manager). No
  son de ciclismo, pero son de **este género**, que es lo que de verdad predice si alguien va a
  aguantar un juego que avanza cada seis horas.
- **Bluesky y X durante el Mundial**, que cae a finales de septiembre. La atención al ciclismo tiene
  picos muy marcados y el Mundial es uno.
- **Foros de ciclismo en español y en portugués.** Aquí no doy nombres porque no puedo verificar
  cuáles siguen vivos, y prefiero no inventarlos. Búsqueda recomendada: «foro ciclismo» más el nombre
  de una carrera, que es lo que devuelve foros activos en vez de blogs muertos.

---

## 3. Los mensajes, listos para copiar

Tres reglas comunes: **no publicar el mismo texto en todas partes** (parece correo basura y los
filtros de Reddit lo detectan), **no publicar en varios sitios el mismo día**, y **contestar a todos
los comentarios** durante las primeras 48 horas, que es lo que decide si un hilo vive o muere.

### 3.1 Foro de ciclismo o de PCM (inglés)

> **Título:** I have been building a browser cycling game where you are one rider, not the manager
>
> I have spent the last months building a persistent browser cycling game, and I am looking for a
> small group of people to try it before it opens properly.
>
> The premise is different from the manager games most of us have played. You are ONE rider. You
> start at 18 as a nobody, nobody offers you a contract, and you have to earn one. You train, you
> sign for a team, you are given a role you may not want, and you retire. The world runs on its own:
> one game day every six hours, so races happen whether you are watching or not.
>
> The part I care most about is the race engine. Every stage is simulated in 100 metre blocks with
> wind, echelons, weather, cobbles, breakaway cooperation and team tactics, and it writes a chronicle
> of what happened, kilometre by kilometre. The screenshot is a real stage report from the current
> build.
>
> It is an alpha. The interface is rough and in English only for now, and I would rather have twenty
> people who tell me what is broken than two hundred who sign up and never come back.
>
> If that sounds like your kind of thing, leave your email here and I will send an invite:
> [ENLACE AL FORMULARIO]
>
> Happy to answer anything about how the engine works.

### 3.2 Reddit (inglés, más corto y sin tono publicitario)

> **Título:** Been building a persistent browser cycling game where you play a single rider. Looking
> for a few testers
>
> You are one rider, not a team manager. You start at 18 with nothing, no team will sign you, and you
> have to earn a contract. One game day passes every six hours, so the season runs without you.
>
> Stages are simulated in 100 metre blocks (wind and echelons, weather, cobbles, breakaway
> cooperation, team tactics) and the game writes a kilometre by kilometre report of what happened.
> That report is the thing I am proudest of and the thing I most want people to pull apart.
>
> It is very much an alpha and the interface needs work. I am looking for a handful of people who
> will actually play it for a few weeks and tell me what is wrong.
>
> Email list for invites: [ENLACE AL FORMULARIO]

### 3.3 Mensaje privado a los moderadores, antes de publicar (inglés)

> Hello,
>
> I have built a browser cycling game and I would like to ask before posting rather than after.
>
> It is a free persistent game where you play a single rider rather than a team manager. I am not
> selling anything and there is nothing to buy. I am looking for a small group of testers, and I
> would link to an email list rather than to the game itself.
>
> Would a post be acceptable, and is there a thread you would prefer I use? Happy to follow whatever
> format works for you.
>
> Thanks for your time.

### 3.4 Comunidad de Footstar u otra lusófona (portugués europeo)

> **Título:** Andei a construir um jogo de ciclismo por navegador em que és um ciclista, não o
> treinador
>
> Passei os últimos meses a construir um jogo de ciclismo persistente por navegador e estou à procura
> de um grupo pequeno de pessoas para o experimentar antes de abrir a sério.
>
> A premissa é diferente da dos jogos de gestão a que estamos habituados. És UM ciclista. Começas aos
> 18 anos sem nada, ninguém te oferece contrato e tens de o conquistar. Treinas, assinas por uma
> equipa, recebes um papel que talvez não queiras, e reformas te. O mundo anda sozinho: um dia de
> jogo a cada seis horas reais, por isso as corridas acontecem estejas tu a ver ou não.
>
> A parte de que mais gosto é o motor de corrida. Cada etapa é simulada em blocos de 100 metros, com
> vento e leques, meteorologia, pavé, cooperação na fuga e táticas de equipa, e no fim escreve a
> crónica do que aconteceu, quilómetro a quilómetro.
>
> É uma versão alfa. O interface está tosco e por agora só em inglês. Prefiro ter vinte pessoas que
> me digam o que está mal do que duzentas que se registam e nunca mais voltam.
>
> Se te soa bem, deixa o teu email aqui e envio te um convite: [ENLACE AL FORMULARIO]

### 3.5 Foro de ciclismo en español

> **Título:** Llevo meses haciendo un juego de ciclismo por navegador en el que eres un ciclista, no
> el director
>
> Llevo unos meses construyendo un juego de ciclismo persistente por navegador y busco un grupo
> pequeño de gente que lo pruebe antes de abrirlo del todo.
>
> La premisa es distinta de la de los juegos de mánager que todos hemos jugado. Eres UN ciclista.
> Empiezas con 18 años sin nada, nadie te ofrece contrato y te lo tienes que ganar. Entrenas, fichas
> por un equipo, te dan un papel que igual no querías, y te retiras. El mundo avanza solo: un día de
> juego cada seis horas reales, así que las carreras pasan estés mirando o no.
>
> De lo que más orgulloso estoy es del motor de carrera. Cada etapa se simula en bloques de 100
> metros, con viento y abanicos, clima, adoquines, cooperación en la fuga y táctica de equipo, y al
> final escribe la crónica de lo que pasó, kilómetro a kilómetro.
>
> Es una versión alfa. La interfaz está en bruto y de momento solo en inglés. Prefiero veinte
> personas que me digan qué está mal a doscientas que se registran y no vuelven.
>
> Si te suena bien, deja tu correo aquí y te mando invitación: [ENLACE AL FORMULARIO]

---

## 4. Calendario de publicación

Una comunidad por semana, empezando por las que menos duelen si el mensaje no funciona.

| Semana | Dónde                                        | Por qué ahí                                                         |
| ------ | -------------------------------------------- | ------------------------------------------------------------------- |
| 1      | **r/playmygame** y la comunidad de Footstar  | Ensayo general. Bajo riesgo, y el texto se corrige con lo que salga |
| 2      | **pcmdaily.com** y **forum.cyclingnews.com** | El público exacto, con el mensaje ya pulido                         |
| 3      | **r/procyclingmanager**                      | Reddit, empezando por el subforo pequeño                            |
| 4      | **r/peloton**, con permiso pedido antes      | El grande. Solo cuando el mensaje ya esté probado tres veces        |

---

## 5. Lo que NO hacer

- **No publicar el mismo texto en todas partes.** Los filtros lo detectan y los humanos también.
- **No prometer fechas.** «Sale en primavera» es una promesa que se incumple sola.
- **No pedir dinero ni insinuarlo.** Ahora mismo no hay nada que vender, y mencionarlo convierte una
  invitación en un anuncio.
- **No exagerar lo que hay.** El juego está a medias y decirlo juega a favor: quien se apunta a una
  alfa sabiendo que está rota es exactamente quien reporta fallos.
- **No abrir el registro directo** hasta que exista recuperación de contraseña (E4). Invitar desde la
  lista de espera es más lento y es lo correcto.

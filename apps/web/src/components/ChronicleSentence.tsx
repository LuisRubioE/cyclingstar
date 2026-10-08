import type { ChronicleEntry } from '@cyclingstar/shared'
import { Link } from 'react-router-dom'
import { chronicleParts } from '../domain/stageJournal'
import { Flag } from './Flag'
import { LeaderJersey } from './Jersey'
import { RIDER_LINK_CLASS } from './RiderName'

/**
 * UNA LÍNEA DEL ACTA, PINTADA: cada mención de un ciclista con su bandera (la MISMA `<Flag/>` del resto
 * de la web, SVG local: los emoji de bandera no se pintan en Windows), el maillot de líder que llevaba
 * puesto (`<LeaderJersey/>`, dibujo propio y con su texto alternativo) y el nombre enlazado a su ficha
 * (v58). `chronicleParts` devuelve la frase ya partida en texto, banderas, maillots y nombres: el enlace
 * se pinta aquí y no se busca en el texto, porque la marca viene puesta desde `riderFull`/`riderShort`.
 *
 * La pintaban `StageStory` (el acta) y, desde el paso 12 de E2, los momentos del corredor de
 * `Your last race` (§12.9, 12-k). `rev` es la revisión de plantillas de la etapa (§12.7).
 */
export function ChronicleSentence({ e, rev }: { e: ChronicleEntry; rev: number }) {
  return (
    <>
      {chronicleParts('en', e, rev).map((part, j) =>
        'flag' in part ? (
          <Flag key={j} code={part.flag} size={12} className="mx-0.5 align-baseline" />
        ) : 'jersey' in part ? (
          <LeaderJersey key={j} kind={part.jersey} size={13} className="mx-0.5" />
        ) : 'riderId' in part ? (
          <Link key={j} to={`/world/riders/${part.riderId}`} className={RIDER_LINK_CLASS}>
            {part.text}
          </Link>
        ) : (
          <span key={j}>{part.text}</span>
        ),
      )}
    </>
  )
}

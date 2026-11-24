import { AwayBand } from './AwayBand'
import { NoticeOptOut } from './NoticeOptOut'

/**
 * Las dos franjas de E4 bajo la cabecera, juntas en un solo trozo que se carga aparte (App.tsx): la
 * ausencia viva (docs/cuenta.md §14.3; PR 13) y el `Don't want these?` de quien llega desde un aviso sin
 * botones (§13.3; PR 14). Fuera del JS de arranque, que tiene su tope de peso.
 */
export default function SessionBands() {
  return (
    <>
      <AwayBand />
      <NoticeOptOut />
    </>
  )
}

import { nextTickAt } from '@cyclingstar/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/**
 * Lo que falta para el próximo avance del mundo, cada segundo (SPEC 2, Paso 12). Con `nextTickAtMs` del
 * servidor (anclado a la creación del mundo) es exacto; si no, la aproximación alineada al epoch. Al vencer,
 * pide `/health` una vez para el día nuevo y el objetivo siguiente, y el horizonte, cuyo `rev` lleva el día
 * (`${currentDay}.${horizon_rev}`, 10-h): con el día nuevo las páginas del mundo cambian de clave y ven las
 * etapas que acaban de correrse (9b). Lo usan el reloj de la cabecera (`Header.tsx`; E3, PR 11) y el de la
 * portada (`WorldClock.tsx`).
 */
export function useWorldCountdown(
  clock:
    | { readonly tickIntervalMinutes: number; readonly nextTickAtMs?: number | null | undefined }
    | undefined,
): number {
  const qc = useQueryClient()
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const objetivo =
    clock === undefined
      ? null
      : (clock.nextTickAtMs ?? nextTickAt(new Date(ahora), clock.tickIntervalMinutes).getTime())
  const restante = objetivo === null ? 0 : objetivo - ahora
  const vencido = objetivo !== null && restante <= 0
  useEffect(() => {
    if (!vencido) return
    // el temporizador se limpia al desmontar: si no, invalidaba consultas de un componente que ya no existe
    const t = window.setTimeout(() => {
      void qc.invalidateQueries({ queryKey: ['health'] })
      void qc.invalidateQueries({ queryKey: ['horizon'] })
    }, 2000)
    return () => window.clearTimeout(t)
  }, [vencido, qc])
  return restante
}

/**
 * LA FORMA DE LO QUE VIENE (E3, docs/visual.md §4.2; PR 10; I-30). Cuatro formas: `rows`, las filas que
 * sustituye (5 por defecto, de 56 en una clasificación de corredores, 44 en una de equipos y 64 en una
 * lista de `ActionRow`, cada una con dos barras de 12); `panel`, una barra de título de 24 y tres líneas de
 * 16; `stat`, un rótulo de 12 y una cifra de 40; y `header`, un `h1` de 32 y una línea de 20. Bloques
 * `surface-2` con `rounded-ui` y pulso, quietos con `prefers-reduced-motion`.
 *
 * `QueryView` lo pinta invisible hasta `LOADING_DELAY_MS` y entonces lo enseña: invisible, ya ocupa el alto
 * de lo que viene, y la página salta poco al llegar los datos (decisión 4-n). No se lee: el estado lo dice
 * el `status` de `QueryView`.
 *
 * `SkeletonBar` es una barra suelta, del mismo aspecto, dentro de un componente que ya pinta lo demás: la
 * línea de estado de 20 de `PageHeader` y la cifra de 40 de `Stat` (y, en el 18, la línea del veredicto
 * del editor de maillots, §8.7).
 */

export type SkeletonShape =
  | { readonly kind: 'rows'; readonly rows?: number; readonly rowHeight?: 44 | 56 | 64 }
  | { readonly kind: 'panel' }
  | { readonly kind: 'stat' }
  | { readonly kind: 'header' }

export interface SkeletonProps {
  readonly shape: SkeletonShape
  /** false antes de `LOADING_DELAY_MS`: ocupa su sitio sin verse */
  readonly visible?: boolean
  /** la respuesta de la pantalla mientras carga (§7.3) */
  readonly answer?: boolean
}

const ALTO = { 44: 'h-11', 56: 'h-14', 64: 'h-16' } as const

const BLOQUE = 'block max-w-full animate-pulse rounded-ui bg-surface-2 motion-reduce:animate-none'

function Barra({ className }: { readonly className: string }) {
  return <span data-bar="" className={`${BLOQUE} ${className}`} />
}

const SUELTA = { line: 'h-5 w-48', figure: 'h-10 w-32' } as const

/** La barra suelta: `line`, una línea de 20; `figure`, una cifra de 40. */
export function SkeletonBar({ size }: { readonly size: keyof typeof SUELTA }) {
  return (
    <span
      data-ui="Skeleton"
      data-variant={size}
      data-state="loading"
      aria-hidden="true"
      className={`${BLOQUE} ${SUELTA[size]}`}
    />
  )
}

function Forma({ shape }: { readonly shape: SkeletonShape }) {
  switch (shape.kind) {
    case 'rows':
      return (
        <>
          {Array.from({ length: shape.rows ?? 5 }, (_, i) => (
            <span
              key={i}
              data-row=""
              className={`flex flex-col justify-center gap-2 ${ALTO[shape.rowHeight ?? 56]}`}
            >
              <Barra className="h-3 w-2/3" />
              <Barra className="h-3 w-1/3" />
            </span>
          ))}
        </>
      )
    case 'panel':
      return (
        <>
          <Barra className="h-6 w-1/2" />
          <Barra className="h-4 w-full" />
          <Barra className="h-4 w-5/6" />
          <Barra className="h-4 w-2/3" />
        </>
      )
    case 'stat':
      return (
        <>
          <Barra className="h-3 w-16" />
          <Barra className="h-10 w-32" />
        </>
      )
    case 'header':
      return (
        <>
          <Barra className="h-8 w-56" />
          <Barra className="h-5 w-40" />
        </>
      )
  }
}

export function Skeleton({ shape, visible = true, answer = false }: SkeletonProps) {
  return (
    <div
      data-ui="Skeleton"
      data-variant={shape.kind}
      data-state={visible ? 'loading' : 'hidden'}
      {...(answer ? { 'data-answer': '' } : {})}
      aria-hidden="true"
      className={`flex flex-col gap-2${visible ? '' : ' invisible'}`}
    >
      <Forma shape={shape} />
    </div>
  )
}

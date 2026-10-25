/**
 * LAS COMPROBACIONES QUE SE MIDEN DENTRO DE LA PÁGINA (E3, docs/visual.md §7.1; PR 2b): la 1, la 2, la
 * 3, la 4, la 5, la 7, la 9 y la 10. La 6 es axe-core y la 8, la acción tras la edición: las mide
 * `telefono.spec.ts` fuera de aquí.
 *
 * `medirPagina` va a `page.evaluate`, que la serializa: no puede cerrar sobre nada de fuera, así que los
 * umbrales le llegan por argumento (de `ui/constants.ts`, `shared/kit.ts` y `telefono.config.ts`, sin
 * copiarlos, D-02) y todo lo que usa está dentro.
 */

export interface Umbrales {
  readonly minFontPx: number
  readonly minFieldFontPx: number
  readonly minTargetPx: number
  readonly minInlineTargetPx: number
  readonly kitMinPx: number
  readonly answerMaxTopPx: number
  readonly toolPageMaxPx: number
  /** el `data-ui` que tiene que llevar el elemento con `data-answer` (§7.3); null donde la 7 no corre */
  readonly answer: string | null
  /** la 9 corre en las pantallas de herramienta */
  readonly tool: boolean
}

/** Una falta, con lo bastante para encontrarla: la etiqueta, el texto y la medida. */
export interface Falta {
  readonly que: string
  readonly cifra: number
}

export interface MedidaDePagina {
  /** las faltas de la 1, 2, 3, 4, 5, 7, 9 y 10, en el orden de §7.1 (null donde no corre) */
  readonly reflujo: number
  readonly recortes: number
  readonly letra: number
  readonly campos: number
  readonly objetivos: number
  readonly respuesta: number | null
  readonly alto: number | null
  readonly maillot: number
  readonly scrollY: number
  readonly muestras: Readonly<Record<string, readonly Falta[]>>
}

export function medirPagina(u: Umbrales): MedidaDePagina {
  const de = document.documentElement
  // La ventana es `clientWidth` y no `innerWidth`: con `isMobile`, Chromium ensancha `innerWidth` hasta el
  // contenido (un bloque de 400 px lo deja en 401 a 360 de ancho), y la comprobación 1 no fallaría
  // nunca. `clientWidth` se queda en el ancho del teléfono, como `visualViewport.width`.
  const vw = de.clientWidth
  const MUESTRAS = 5
  const muestras: Record<string, Falta[]> = {}
  const apunta = (clave: string, el: Element | null, cifra: number) => {
    const lista = (muestras[clave] ??= [])
    if (lista.length >= MUESTRAS) return
    const texto = (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50)
    const etiqueta = el === null ? '' : el.tagName.toLowerCase()
    const ui = el?.closest('[data-ui]')?.getAttribute('data-ui')
    lista.push({
      que: `${etiqueta}${ui ? ` en ${ui}` : ''} «${texto}»`,
      cifra: Math.round(cifra * 10) / 10,
    })
  }

  /**
   * Visible: con caja de más de un píxel en los dos ejes y sin nada que la esconda, ni ella ni un
   * antepasado (`display`, `visibility`, `opacity` o `content-visibility`). El texto para lectores de
   * pantalla (`sr-only`: una caja de 1 × 1 que recorta su texto) no se ve y no cuenta.
   */
  const visible = (el: Element): boolean => {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false
    const r = el.getBoundingClientRect()
    return r.width > 1 && r.height > 1
  }

  // 1. El reflujo: el documento no puede ser más ancho que la ventana.
  const reflujo = de.scrollWidth > vw ? 1 : 0
  if (reflujo) apunta('reflujo', null, de.scrollWidth)

  // 2. Los recortes (Ruso-016; 7-l): todo elemento cuyo contenido no cabe en su caja y no se desplaza.
  //    Cuenta lo recortado (`hidden`, `clip`, la elipsis) y lo que desborda su caja sin recortarse y pisa
  //    a su vecino. De lo que desborda sin recortarse cuenta el elemento que el contenido desborda, no
  //    sus antepasados, que lo heredan: un hijo o un texto suyo se sale de su caja de relleno.
  const sale = (caja: DOMRect, r: DOMRect) => r.right > caja.right + 1 || r.left < caja.left - 1
  const desbordaSuCaja = (el: HTMLElement): boolean => {
    const r = el.getBoundingClientRect()
    const left = r.left + el.clientLeft
    const caja = new DOMRect(left, r.top, el.clientWidth, r.height)
    for (const hijo of el.childNodes) {
      if (hijo instanceof Element) {
        if (getComputedStyle(hijo).position === 'fixed') continue
        if (!visible(hijo)) continue
        if (sale(caja, hijo.getBoundingClientRect())) return true
      } else if (hijo.nodeType === Node.TEXT_NODE && (hijo.textContent ?? '').trim() !== '') {
        const rango = document.createRange()
        rango.selectNodeContents(hijo)
        if (sale(caja, rango.getBoundingClientRect())) return true
      }
    }
    return false
  }
  let recortes = 0
  for (const el of document.body.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue
    if (el.scrollWidth <= el.clientWidth + 1) continue
    if (!visible(el)) continue
    const ox = getComputedStyle(el).overflowX
    if (ox === 'auto' || ox === 'scroll') continue
    if (el.closest('[data-clip-ok]') !== null) continue
    if (ox === 'visible' && !desbordaSuCaja(el)) continue
    recortes++
    apunta('recortes', el, el.scrollWidth - el.clientWidth)
  }

  // 3. La letra: cada nodo de texto visible, a `minFontPx` o más; en un SVG, por la escala de la pantalla.
  let letra = 0
  const recorrido = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = recorrido.nextNode(); n !== null; n = recorrido.nextNode()) {
    if ((n.textContent ?? '').trim() === '') continue
    const padre = n.parentElement
    if (padre === null || !visible(padre)) continue
    const rango = document.createRange()
    rango.selectNodeContents(n)
    const rr = rango.getBoundingClientRect()
    if (rr.width <= 0 || rr.height <= 0) continue
    let px = Number.parseFloat(getComputedStyle(padre).fontSize)
    if (padre instanceof SVGGraphicsElement) {
      const m = padre.getScreenCTM()
      if (m !== null) px *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c))
    }
    if (px < u.minFontPx - 0.01) {
      letra++
      apunta('letra', padre, px)
    }
  }

  // 4. Los campos: un campo de texto por debajo de `minFieldFontPx` hace que iOS amplíe al tocarlo. Las
  //    casillas, los deslizadores y los botones de formulario no se escriben y no cuentan.
  const SIN_TEXTO = new Set([
    'hidden',
    'checkbox',
    'radio',
    'range',
    'color',
    'file',
    'submit',
    'button',
    'reset',
    'image',
  ])
  let campos = 0
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (el instanceof HTMLInputElement && SIN_TEXTO.has(el.type)) continue
    if (!visible(el)) continue
    const px = Number.parseFloat(getComputedStyle(el).fontSize)
    if (px < u.minFieldFontPx - 0.01) {
      campos++
      apunta('campos', el, px)
    }
  }

  // 5. Los objetivos (WCAG 2.5.8): 44 × 44 un control; un enlace de frase, 24 × 24 o un círculo de 24 px
  //    que no toque otro objetivo. Qué es de frase lo dice el marcado (Ruso-017; 7-m).
  const SEL =
    'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=tab], [role=button]'
  const LISTA =
    'p, [data-ui="Notice"], tr, li, [data-ui="RankTable"], [data-ui="ActionRow"], [data-ui="TripRow"], [data-ui="GroupBar"]'
  const deFrase = (el: Element): boolean => {
    if (!(el instanceof HTMLAnchorElement)) return false
    if (el.hasAttribute('data-inline-link')) return true
    const cerca = el.parentElement?.closest(LISTA) ?? null
    return cerca !== null && (cerca.tagName === 'P' || cerca.getAttribute('data-ui') === 'Notice')
  }
  const objetivos = [...document.querySelectorAll(SEL)].filter(visible).map((el) => ({
    el,
    r: el.getBoundingClientRect(),
    frase: deFrase(el),
  }))
  const radio = u.minInlineTargetPx / 2
  const centro = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
  const pequeno = (r: DOMRect) => r.width < u.minInlineTargetPx || r.height < u.minInlineTargetPx
  const tocaCaja = (c: { x: number; y: number }, r: DOMRect) => {
    const dx = Math.max(r.left - c.x, 0, c.x - r.right)
    const dy = Math.max(r.top - c.y, 0, c.y - r.bottom)
    return dx * dx + dy * dy < radio * radio
  }
  let faltasObjetivo = 0
  for (const t of objetivos) {
    let bien: boolean
    if (!t.frase) bien = t.r.width >= u.minTargetPx && t.r.height >= u.minTargetPx
    else if (!pequeno(t.r)) bien = true
    else {
      const c = centro(t.r)
      bien = objetivos.every((o) => {
        if (o === t || o.el.contains(t.el) || t.el.contains(o.el)) return true
        if (tocaCaja(c, o.r)) return false
        if (o.frase && pequeno(o.r)) {
          const d = centro(o.r)
          return Math.hypot(c.x - d.x, c.y - d.y) >= 2 * radio
        }
        return true
      })
    }
    if (!bien) {
      faltasObjetivo++
      apunta('objetivos', t.el, Math.min(t.r.width, t.r.height))
    }
  }

  // 7. La respuesta: un solo `[data-answer]`, con el `data-ui` de su pantalla, arriba del todo (7-c).
  let respuesta: number | null = null
  if (u.answer !== null) {
    const todas = document.querySelectorAll('[data-answer]')
    const el = todas[0] ?? null
    const top =
      el === null ? Number.POSITIVE_INFINITY : el.getBoundingClientRect().top + window.scrollY
    respuesta =
      todas.length === 1 && el?.getAttribute('data-ui') === u.answer && top <= u.answerMaxTopPx
        ? 0
        : 1
    if (respuesta) apunta('respuesta', el, todas.length === 1 ? top : todas.length)
  }

  // 9. El alto, en las pantallas de herramienta.
  const alto = u.tool ? (de.scrollHeight > u.toolPageMaxPx ? 1 : 0) : null
  if (alto) apunta('alto', null, de.scrollHeight)

  // 10. El maillot: ninguno por debajo de `KIT_MIN_PX` en ninguno de sus dos lados (D-00b).
  let maillot = 0
  for (const el of document.querySelectorAll('svg[data-kit]')) {
    if (!visible(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width < u.kitMinPx - 0.01 || r.height < u.kitMinPx - 0.01) {
      maillot++
      apunta('maillot', el, Math.min(r.width, r.height))
    }
  }

  return {
    reflujo,
    recortes,
    letra,
    campos,
    objetivos: faltasObjetivo,
    respuesta,
    alto,
    maillot,
    scrollY: window.scrollY,
    muestras,
  }
}

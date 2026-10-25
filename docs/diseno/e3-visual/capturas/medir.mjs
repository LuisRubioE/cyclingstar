/* global window, document, getComputedStyle, NodeFilter */
/**
 * E3, mapa 05: LAS MEDIDAS DE UNA PÁGINA, en el navegador (se pasa a `page.evaluate`). Devuelve:
 *   - el ancho del documento contra el de la ventana (`scrollWidth` frente a `innerWidth`) y, si se
 *     desborda, el elemento que lo desborda (el de borde derecho más lejano que ningún antepasado
 *     recorta);
 *   - los contenedores con desplazamiento horizontal propio (`overflow-x` auto o scroll con más
 *     contenido que ancho) y las tablas, con sus columnas y si caben;
 *   - la letra: el tamaño más pequeño que se pinta en un texto visible, y cuántos caracteres hay en
 *     cada tamaño;
 *   - los objetivos táctiles (enlaces, botones, campos, pestañas) por debajo de 44 × 44 px y de
 *     24 × 24 px, contados sin las excepciones de WCAG 2.5.8 (los enlaces dentro de una frase, p. ej.),
 *     con los cinco más pequeños de muestra.
 */
export function measurePage() {
  const vw = window.innerWidth
  const de = document.documentElement
  const short = (s, n = 70) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n)
  const classOf = (el) => (typeof el.className === 'string' ? el.className : '')
  const visible = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)
      return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const clipper = (el) => {
    for (let p = el.parentElement; p && p !== document.body && p !== de; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') return p
    }
    return null
  }
  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    cls: short(classOf(el), 140),
    text: short(el.textContent, 60),
  })

  // 1. El desbordamiento del documento y quién lo causa.
  let culprit = null
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.width <= 0 || r.right <= vw + 0.5) continue
    if (clipper(el) !== null) continue
    if (culprit === null || r.right > culprit.right + 0.5) {
      culprit = { right: Math.round(r.right), width: Math.round(r.width), ...describe(el) }
    }
  }

  // 2. Los contenedores con desplazamiento propio y las tablas.
  const scrollers = []
  for (const el of document.body.querySelectorAll('*')) {
    const ox = getComputedStyle(el).overflowX
    if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1 && visible(el)) {
      scrollers.push({
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        hasTable: el.querySelector('table') !== null,
        ...describe(el),
      })
    }
  }
  const tables = [...document.querySelectorAll('table')].filter(visible).map((t) => {
    const head = t.tHead?.rows[0] ?? t.rows[0]
    const cols = head ? [...head.cells].reduce((n, c) => n + (c.colSpan || 1), 0) : 0
    const box = clipper(t)
    return {
      cols,
      rows: t.rows.length,
      width: Math.round(t.getBoundingClientRect().width),
      containerWidth: box ? box.clientWidth : vw,
      scrolls: box ? box.scrollWidth > box.clientWidth + 1 : t.getBoundingClientRect().right > vw,
      header: short([...(head?.cells ?? [])].map((c) => c.textContent.trim()).join(' | '), 160),
    }
  })

  // 3. La letra: en toda la página y solo en `main` (sin la cabecera, la barra inferior ni el pie).
  const fontOf = (root) => {
    const chars = {}
    let min = Infinity
    let sample = ''
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim()
      if (text.length === 0) continue
      const el = n.parentElement
      if (!el || !visible(el)) continue
      const fs = Number.parseFloat(getComputedStyle(el).fontSize)
      const key = String(Math.round(fs * 10) / 10)
      chars[key] = (chars[key] ?? 0) + text.length
      if (fs < min) {
        min = fs
        sample = short(text, 50)
      }
    }
    const total = Object.values(chars).reduce((a, b) => a + b, 0)
    const under12 = Object.entries(chars)
      .filter(([k]) => Number(k) < 12)
      .reduce((a, [, v]) => a + v, 0)
    const at12 = chars['12'] ?? 0
    return { min: Number.isFinite(min) ? min : null, sample, chars, total, under12, at12 }
  }
  const main = document.querySelector('main') ?? document.body

  // 4. Los objetivos táctiles, en toda la página y solo en `main`.
  const SEL =
    'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=link], [role=switch], [role=checkbox]'
  const targetsOf = (root) => {
    const list = [...root.querySelectorAll(SEL)].filter(visible).map((el) => {
      const r = el.getBoundingClientRect()
      return {
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        tag: el.tagName.toLowerCase(),
        text: short(
          el.textContent || el.getAttribute('aria-label') || el.getAttribute('value'),
          40,
        ),
      }
    })
    const under44 = list.filter((t) => t.w < 44 || t.h < 44)
    const under24 = list.filter((t) => t.w < 24 || t.h < 24)
    const smallest = [...under44]
      .sort((a, b) => Math.min(a.w, a.h) - Math.min(b.w, b.h))
      .slice(0, 5)
    const minH = list.length ? Math.min(...list.map((t) => t.h)) : null
    return { total: list.length, under44: under44.length, under24: under24.length, minH, smallest }
  }

  return {
    innerWidth: vw,
    scrollWidth: de.scrollWidth,
    overflowX: Math.max(0, de.scrollWidth - vw),
    scrollHeight: de.scrollHeight,
    culprit,
    scrollers,
    tables,
    font: fontOf(document.body),
    fontMain: fontOf(main),
    targets: targetsOf(document.body),
    targetsMain: targetsOf(main),
    h1: [...document.querySelectorAll('h1')].map((h) => short(h.textContent, 60)),
    title: document.title,
  }
}

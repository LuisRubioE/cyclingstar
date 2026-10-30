import { COUNTRIES, VOCATIONS, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRider, fetchGeneratedName, fetchGeoCountry } from '../api/rider'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Flag } from '../components/ui/Flag'
import { Notice } from '../components/ui/Notice'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'

/**
 * Creación del ciclista (Paso 15). Solo ciclismo masculino por ahora, y la nacionalidad se fija por
 * IP: es un dato del mundo, no una preferencia.
 *
 * PERO «NO TE HE DETECTADO» NO ES «TU PAÍS NO ESTÁ DISPONIBLE» (v58). El dueño entró sin cuenta
 * desde una IP española y la pantalla le dijo que Cycling Star no estaba disponible en su país.
 * España está soportada —y lo están los 136 países de la lista, con un fallback para el resto—, así
 * que ese mensaje era imposible de merecer: lo que había fallado era la DETECCIÓN, y la pantalla
 * trataba los dos casos como uno.
 *
 * La detección tiene dos intentos: la cabecera del servidor (que solo existe detrás de ciertas
 * capas de red) y una API pública llamada DESDE EL NAVEGADOR, que se cae, se bloquea con cualquier
 * extensión de privacidad o se queda sin cuota. O sea que el registro entero —la puerta de entrada
 * del juego— dependía de que un tercero contestara. Ahora, si no se detecta, se elige a mano.
 *
 * CON EL SISTEMA (E3, docs/visual.md §17.21, la cola larga; PR 21j): la cabecera en `PageHeader`; todo en el
 * `Panel` que contesta a la 34 (§7.3); sin detectar, un `Notice` `warn` y el país en un `Field`, por su nombre
 * (sin la bandera en emoji, que un `option` no pinta de otra forma); la vocación, cinco, en otro `Field`, que un
 * `Segmented` es de 2 a 4; la nacionalidad y el nombre en un `dl`, con su bandera del catálogo y `Regenerate`;
 * y crearlo, un `Button` deshabilitado con su porqué mientras no hay nombre.
 */

interface CreateState {
  /** null, buscándolo; '', sin detectar; un código, el país fijado por IP */
  readonly country: string | null
  readonly geo: string
  readonly name: string
  readonly error: string | null
  /** el país, elegido a mano */
  readonly elegido: boolean
}

export function CreateRider({ initial = {} }: { initial?: Partial<CreateState> } = {}) {
  const navigate = useNavigate()
  const [vocation, setVocation] = useState<Vocation>('escalada')
  const [country, setCountry] = useState<string | null>(initial.country ?? null)
  const [seedN, setSeedN] = useState(0)
  const [name, setName] = useState(initial.name ?? '')
  const [error, setError] = useState<string | null>(initial.error ?? null)
  // Diagnóstico de la detección por IP, en pantalla mientras se depura (v58, a petición del dueño).
  const [geo, setGeo] = useState<string>(initial.geo ?? '')
  const [creating, setCreating] = useState(false)
  const [elegido, setElegido] = useState(initial.elegido ?? false)

  const seed = country ? `${country}-M-${seedN}` : ''

  // Nacionalidad por IP (Paso 14, SPEC 3.6). Fija; si no se detecta, se elige a mano (v58).
  useEffect(() => {
    let active = true
    void fetchGeoCountry().then((detected) => {
      if (!active) return
      setCountry(detected.country ?? '')
      setGeo(detected.detalle)
    })
    return () => {
      active = false
    }
  }, [])

  // Nombre generado; se refresca al fijar el país o al regenerar (SPEC 3.6).
  useEffect(() => {
    if (!country) return
    let active = true
    void fetchGeneratedName({ country, gender: 'M', seed })
      .then((generated) => {
        if (active) setName(generated.fullName)
      })
      .catch(() => {
        if (active) setName('')
      })
    return () => {
      active = false
    }
  }, [country, seed])

  async function onCreate() {
    if (!country) return
    setError(null)
    setCreating(true)
    try {
      await createRider({ vocation, gender: 'M', country, nameSeed: seed })
      navigate('/me/profile')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setCreating(false)
    }
  }

  const detecting = country === null
  // '' ya no es «tu país no está disponible» sino «no hemos podido averiguarlo»: se elige a mano.
  const sinDetectar = country === ''
  const countryInfo = country ? COUNTRIES.find((c) => c.code === country) : undefined
  /*
    EL PAÍS QUE SE HA DETECTADO, A LA VISTA. Es una ayuda de depuración pedida por el dueño
    mientras se persigue por qué la detección falla en algunos despliegues, y se quita cuando
    deje de hacer falta. No decide nada: solo cuenta lo que la detección vio. Desde el 21j, la
    ayuda del país, en `meta` `ink-2` (DD-18).
  */
  const deteccion = `Your country: ${country === '' ? 'not detected' : country}${geo !== '' ? ` (${geo})` : ''}`
  // cómo acabó la búsqueda, para el lector, en la región que está desde el principio (la revisión del 21j)
  const anuncio = detecting
    ? 'Detecting your country…'
    : sinDetectar
      ? 'Country not detected. Pick it below.'
      : elegido || countryInfo === undefined
        ? ''
        : `Country detected: ${countryInfo.name}.`

  return (
    <section className="mx-auto grid max-w-form gap-4">
      <PageHeader
        title="Create your rider"
        status="Your vocation shapes your talent — but never guarantees it."
      />
      <Panel ariaLabel="Your rider" answer>
        <div className="grid gap-4">
          <p role="status" className={detecting ? 'text-meta text-ink-2' : 'sr-only'}>
            {anuncio}
          </p>

          {sinDetectar && (
            <>
              <Notice tone="warn" title="We couldn't work out where you're riding from.">
                Pick your country to carry on.
              </Notice>
              <Field
                kind="select"
                id="create-country"
                label="Country"
                value=""
                onChange={(v) => {
                  if (v === '') return
                  setCountry(v)
                  setElegido(true)
                }}
                options={[
                  { value: '', label: 'Choose your country…' },
                  ...[...COUNTRIES]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => ({ value: c.code, label: c.name })),
                ]}
                help={deteccion}
              />
            </>
          )}

          {country && countryInfo && (
            <>
              <Field
                kind="select"
                id="create-vocation"
                label="Vocation"
                value={vocation}
                onChange={(v) => {
                  const elegida = VOCATIONS.find((o) => o === v)
                  if (elegida !== undefined) setVocation(elegida)
                }}
                options={VOCATIONS.map((o) => ({ value: o, label: VOCATION_LABELS[o] }))}
              />

              <dl className="grid gap-4">
                <div className="grid gap-1">
                  <dt className="text-meta font-semibold text-ink">Nationality</dt>
                  <dd className="flex flex-wrap items-center gap-x-2 text-body text-ink">
                    {/* su nombre va al lado: la bandera, para el ojo */}
                    <span aria-hidden="true">
                      <Flag country={country} />
                    </span>
                    {countryInfo.name}
                    <span className="text-meta text-ink-2">
                      {elegido ? 'chosen by you' : 'from your location'}
                    </span>
                  </dd>
                  <dd className="text-meta text-ink-2">{deteccion}</dd>
                </div>
                <div className="grid gap-1">
                  <dt className="text-meta font-semibold text-ink">Name</dt>
                  <dd className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-body font-semibold text-ink">{name || '…'}</span>
                    <Button onClick={() => setSeedN((n) => n + 1)}>Regenerate</Button>
                  </dd>
                </div>
              </dl>

              {error !== null && (
                <p role="alert" className="text-meta text-bad">
                  {error}
                </p>
              )}

              <Button
                variant="primary"
                onClick={() => void onCreate()}
                busy={creating}
                busyLabel="Creating…"
                {...(name.length === 0
                  ? { disabledReason: 'Waiting for a name. Regenerate if it does not come.' }
                  : {})}
              >
                Create rider
              </Button>
            </>
          )}
        </div>
      </Panel>
    </section>
  )
}

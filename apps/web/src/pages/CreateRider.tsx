import { COUNTRIES, VOCATIONS, VOCATION_LABELS, type Vocation } from '@cyclingstar/shared'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRider, fetchGeneratedName, fetchGeoCountry } from '../api/rider'

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
 */
export function CreateRider() {
  const navigate = useNavigate()
  const [vocation, setVocation] = useState<Vocation>('escalada')
  // null = detectando; '' = país no disponible; código = país fijado por IP.
  const [country, setCountry] = useState<string | null>(null)
  const [seedN, setSeedN] = useState(0)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Diagnóstico de la detección por IP, en pantalla mientras se depura (v58, a petición del dueño).
  const [geo, setGeo] = useState<string>('')
  const [creating, setCreating] = useState(false)

  const seed = country ? `${country}-M-${seedN}` : ''

  // Nacionalidad por IP (Paso 14, SPEC 3.6). Fija: si no se detecta un país soportado, se bloquea.
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

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create your rider</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your vocation shapes your talent — but never guarantees it.
        </p>
      </div>

      {detecting && <p className="text-sm text-slate-500">Detecting your country…</p>}

      {/*
        EL PAÍS QUE SE HA DETECTADO, A LA VISTA. Es una ayuda de depuración pedida por el dueño
        mientras se persigue por qué la detección falla en algunos despliegues, y se quita cuando
        deje de hacer falta. No decide nada: solo cuenta lo que la detección vio.
      */}
      {!detecting && (
        <p className="text-xs text-slate-400">
          Your country:{' '}
          <span className="font-mono">{country === '' ? 'not detected' : country}</span>
          {geo !== '' && <> — {geo}</>}
        </p>
      )}

      {sinDetectar && (
        <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          <p>We couldn't work out where you're riding from. Pick your country to carry on.</p>
          <select
            aria-label="Country"
            value=""
            onChange={(event) => setCountry(event.target.value)}
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          >
            <option value="" disabled>
              Choose your country…
            </option>
            {[...COUNTRIES]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {country && countryInfo && (
        <>
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Vocation</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {VOCATIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVocation(option)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    vocation === option
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {VOCATION_LABELS[option]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Nationality</span>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              {countryInfo.flag} {countryInfo.name}
              <span className="ml-2 text-xs text-slate-400">from your location</span>
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <div className="flex items-center gap-3">
              <span className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-900">
                {name || '…'}
              </span>
              <button
                type="button"
                onClick={() => setSeedN((n) => n + 1)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Regenerate
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={onCreate}
            disabled={creating || name.length === 0}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create rider'}
          </button>
        </>
      )}
    </section>
  )
}

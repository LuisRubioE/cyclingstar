import {
  COUNTRIES,
  type Gender,
  VOCATIONS,
  VOCATION_LABELS,
  type Vocation,
} from '@cyclingstar/shared'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRider, fetchGeneratedName, fetchGeoCountry } from '../api/rider'

export function CreateRider() {
  const navigate = useNavigate()
  const [vocation, setVocation] = useState<Vocation>('escalada')
  const [gender, setGender] = useState<Gender>('M')
  const [country, setCountry] = useState('ES')
  const [seedN, setSeedN] = useState(0)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const seed = `${country}-${gender}-${seedN}`

  // Preselección de país por IP (Paso 14). Editable.
  useEffect(() => {
    let active = true
    void fetchGeoCountry().then((detected) => {
      if (active && detected) setCountry(detected)
    })
    return () => {
      active = false
    }
  }, [])

  // Nombre generado; se refresca al cambiar país, género o al regenerar (SPEC 3.6).
  useEffect(() => {
    let active = true
    void fetchGeneratedName({ country, gender, seed })
      .then((generated) => {
        if (active) setName(generated.fullName)
      })
      .catch(() => {
        if (active) setName('')
      })
    return () => {
      active = false
    }
  }, [country, gender, seed])

  async function onCreate() {
    setError(null)
    setCreating(true)
    try {
      await createRider({ vocation, gender, country, nameSeed: seed })
      navigate('/rider')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setCreating(false)
    }
  }

  return (
    <section className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create your rider</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your vocation shapes your talent — but never guarantees it.
        </p>
      </div>

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

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-700">Gender</span>
        <div className="flex gap-2">
          {(['M', 'F'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setGender(option)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                gender === option
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option === 'M' ? 'Male' : 'Female'}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Nationality</span>
        <select
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {COUNTRIES.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {option.name}
            </option>
          ))}
        </select>
      </label>

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
    </section>
  )
}

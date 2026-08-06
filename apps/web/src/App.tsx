import { type ReactNode, Suspense, lazy } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SessionExpiryWatcher } from './components/SessionExpiryWatcher'

/**
 * Mapa de rutas (docs/navegacion.md §3.7). Tres esferas y la URL dice cuál es:
 *
 *   /            → el dashboard
 *   /me/…        → lo mío (requiere sesión)
 *   /team/…      → mi equipo (requiere sesión)
 *   /world/…     → el mundo (público)
 *   /news        → el feed global (público)
 *
 * Esto además deshace la colisión de `/races`, que significaba dos cosas sin relación: MIS carreras
 * (`/races`) y UNA carrera del mundo (`/races/:raceId`). Ahora son `/me/races` y `/world/races/:id`.
 *
 * Toda ruta vieja sobrevive como redirección (§3.7): los enlaces guardados y los que aún quedan
 * dentro de las páginas siguen funcionando. En una SPA no hay 301, así que el equivalente es
 * `<Navigate replace>`: no deja rastro en el historial y el botón "atrás" no rebota.
 *
 * Cada página se carga con `React.lazy` bajo un único `Suspense`: como solo se renderiza una ruta a
 * la vez, una frontera basta para partir el bundle por página.
 */

// Carga diferida por página. Las páginas exportan componentes con nombre, de ahí el `.then(…)`.
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })))
const AdminNames = lazy(() => import('./pages/AdminNames').then((m) => ({ default: m.AdminNames })))
const Countries = lazy(() => import('./pages/Countries').then((m) => ({ default: m.Countries })))
const Country = lazy(() => import('./pages/Country').then((m) => ({ default: m.Country })))
const CreateRider = lazy(() =>
  import('./pages/CreateRider').then((m) => ({ default: m.CreateRider })),
)
const Finances = lazy(() => import('./pages/Finances').then((m) => ({ default: m.Finances })))
const HallOfFame = lazy(() => import('./pages/HallOfFame').then((m) => ({ default: m.HallOfFame })))
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const HowToPlay = lazy(() => import('./pages/HowToPlay').then((m) => ({ default: m.HowToPlay })))
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Market = lazy(() => import('./pages/Market').then((m) => ({ default: m.Market })))
const MyRaces = lazy(() => import('./pages/MyRaces').then((m) => ({ default: m.MyRaces })))
const News = lazy(() => import('./pages/News').then((m) => ({ default: m.News })))
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })))
const Race = lazy(() => import('./pages/Race').then((m) => ({ default: m.Race })))
const RaceOrders = lazy(() => import('./pages/RaceOrders').then((m) => ({ default: m.RaceOrders })))
const RacesIndex = lazy(() => import('./pages/RacesIndex').then((m) => ({ default: m.RacesIndex })))
const Rankings = lazy(() => import('./pages/Rankings').then((m) => ({ default: m.Rankings })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const RiderProfile = lazy(() =>
  import('./pages/RiderProfile').then((m) => ({ default: m.RiderProfile })),
)
const StageReplay = lazy(() =>
  import('./pages/StageReplay').then((m) => ({ default: m.StageReplay })),
)
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })))
const TeamCalendar = lazy(() =>
  import('./pages/TeamCalendar').then((m) => ({ default: m.TeamCalendar })),
)
const TeamIdentity = lazy(() =>
  import('./pages/TeamIdentity').then((m) => ({ default: m.TeamIdentity })),
)
const TeamSquad = lazy(() => import('./pages/TeamSquad').then((m) => ({ default: m.TeamSquad })))
const Teams = lazy(() => import('./pages/Teams').then((m) => ({ default: m.Teams })))
const Training = lazy(() => import('./pages/Training').then((m) => ({ default: m.Training })))

/**
 * Redirección de una ruta vieja a su sitio nuevo, conservando parámetros, query y ancla.
 * En `to` se pueden usar los mismos `:parametros` del `path` de la ruta vieja.
 */
function Legacy({ to }: { to: string }) {
  const params = useParams()
  const { search, hash } = useLocation()
  const target = to.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) =>
    encodeURIComponent(params[key] ?? ''),
  )
  return <Navigate to={`${target}${search}${hash}`} replace />
}

/** Atajo para las páginas que exigen sesión. */
function Private({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

/** URL que no existe (ni siquiera como ruta vieja): se dice, no se deja la página en blanco. */
function NotFound() {
  return (
    <section className="py-10 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">Page not found</h1>
      <p className="mt-2 text-sm text-slate-500">
        That page does not exist — it may have moved. Try the season races or your dashboard.
      </p>
      <div className="mt-5 flex justify-center gap-3 text-sm font-medium">
        <Link to="/" className="rounded-xl bg-brand-navy px-4 py-2 text-white">
          Dashboard
        </Link>
        <Link to="/world/races" className="rounded-xl bg-slate-100 px-4 py-2 text-slate-700">
          Races
        </Link>
      </div>
    </section>
  )
}

export function App() {
  return (
    <div className="min-h-screen text-slate-900">
      <SessionExpiryWatcher />
      <Header />
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
          <Routes>
            {/* Dashboard y feed global */}
            <Route path="/" element={<Home />} />
            <Route path="/news" element={<News />} />

            {/* Lo mío (§3.2) */}
            <Route
              path="/me/profile"
              element={
                <Private>
                  <RiderProfile />
                </Private>
              }
            />
            <Route
              path="/me/training"
              element={
                <Private>
                  <Training />
                </Private>
              }
            />
            <Route
              path="/me/orders"
              element={
                <Private>
                  <RaceOrders />
                </Private>
              }
            />
            <Route
              path="/me/races"
              element={
                <Private>
                  <MyRaces />
                </Private>
              }
            />
            <Route
              path="/me/contract"
              element={
                <Private>
                  <Market />
                </Private>
              }
            />
            <Route
              path="/me/finances"
              element={
                <Private>
                  <Finances />
                </Private>
              }
            />

            {/* Mi equipo (§3.4): visible para MIEMBROS, no solo para mánagers */}
            <Route
              path="/team/squad"
              element={
                <Private>
                  <TeamSquad />
                </Private>
              }
            />
            <Route
              path="/team/calendar"
              element={
                <Private>
                  <TeamCalendar />
                </Private>
              }
            />
            <Route
              path="/team/identity"
              element={
                <Private>
                  <TeamIdentity />
                </Private>
              }
            />

            {/* El mundo (§3.3): todo público, se vea con sesión o sin ella */}
            <Route path="/world/races" element={<RacesIndex />} />
            <Route path="/world/races/:raceId" element={<Race />} />
            <Route path="/world/races/:raceId/stages/:day" element={<StageReplay />} />
            <Route path="/world/teams" element={<Teams />} />
            <Route path="/world/teams/:id" element={<Team />} />
            <Route path="/world/nations" element={<Countries />} />
            <Route path="/world/nations/:code" element={<Country />} />
            <Route path="/world/rankings" element={<Rankings />} />
            <Route path="/world/hall-of-fame" element={<HallOfFame />} />
            {/* Misma página que /me/profile: una ficha, dos modos (§3.6) */}
            <Route path="/world/riders/:id" element={<RiderProfile />} />

            {/* Páginas sueltas, sin sección */}
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/account"
              element={
                <Private>
                  <Account />
                </Private>
              }
            />
            <Route
              path="/create"
              element={
                <Private>
                  <CreateRider />
                </Private>
              }
            />
            {/* Base secreta de admins: no enlazada; se protege con el ADMIN_TOKEN dentro. */}
            <Route path="/admin/names" element={<AdminNames />} />

            {/*
              Rutas viejas → nuevas (§3.7). Se mantienen una temporada para no romper enlaces
              guardados ni los que aún apuntan al sitio antiguo desde dentro de las páginas.
              Aquí se ve resuelta la colisión: `/races` era MIS carreras y `/races/:raceId` una
              carrera del mundo; cada una se va ahora a su esfera.
            */}
            <Route path="/rider" element={<Legacy to="/me/profile" />} />
            <Route path="/training" element={<Legacy to="/me/training" />} />
            <Route path="/race-orders" element={<Legacy to="/me/orders" />} />
            <Route path="/races" element={<Legacy to="/me/races" />} />
            {/* La auto-inscripción renace como pestaña de My races (§3.2), no como página */}
            <Route path="/race-entry" element={<Legacy to="/me/races" />} />
            <Route path="/market" element={<Legacy to="/me/contract" />} />
            <Route path="/finances" element={<Legacy to="/me/finances" />} />
            <Route path="/team-calendar" element={<Legacy to="/team/calendar" />} />
            {/*
              `World → Calendar` y `World → Races` eran dos páginas que respondían a las mismas dos
              preguntas ("¿qué viene?" y "¿qué pasó?"). Se fusionaron en `/world/races`, que es donde
              vive la jerarquía (`/world/races/:raceId` es una carrera), y el calendario queda como
              redirección permanente.
            */}
            <Route path="/world/calendar" element={<Legacy to="/world/races" />} />
            <Route path="/calendar" element={<Legacy to="/world/races" />} />
            <Route path="/races/:raceId" element={<Legacy to="/world/races/:raceId" />} />
            <Route
              path="/races/:raceId/stages/:day"
              element={<Legacy to="/world/races/:raceId/stages/:day" />}
            />
            <Route path="/teams" element={<Legacy to="/world/teams" />} />
            <Route path="/teams/:id" element={<Legacy to="/world/teams/:id" />} />
            <Route path="/countries" element={<Legacy to="/world/nations" />} />
            <Route path="/countries/:code" element={<Legacy to="/world/nations/:code" />} />
            <Route path="/rankings" element={<Legacy to="/world/rankings" />} />
            <Route path="/hall-of-fame" element={<Legacy to="/world/hall-of-fame" />} />
            <Route path="/riders/:id" element={<Legacy to="/world/riders/:id" />} />
            {/* /routes era la prueba de desarrollo de altimetrías: borrada (§1.1) */}
            <Route path="/routes" element={<Legacy to="/world/races" />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-x-4">
            <Link to="/how-to-play" className="hover:text-slate-600">
              How to play
            </Link>
            <Link to="/privacy" className="hover:text-slate-600">
              Privacy
            </Link>
          </div>
          <p className="w-full leading-relaxed text-slate-400">
            Cycling Star is a fictional cycling-manager simulation game. All teams, riders, races
            and results shown here are computer-generated and made up — they are{' '}
            <strong>not</strong> real people, real teams or real results, and the game is not
            affiliated with, endorsed by, or connected to any real cycling organization, federation
            or event.
          </p>
        </div>
      </footer>
    </div>
  )
}

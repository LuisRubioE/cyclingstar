import { Suspense, lazy } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SessionExpiryWatcher } from './components/SessionExpiryWatcher'

/**
 * Páginas cargadas bajo demanda (React.lazy): antes las ~30 páginas —y con ellas el motor entero
 * vía la página de recorridos— viajaban en un único bundle que el jugador se descargaba para ver
 * la portada. Cada ruta es ahora su propio trozo. Las rutas, sus paths y su orden no cambian.
 */
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })))
const AdminNames = lazy(() => import('./pages/AdminNames').then((m) => ({ default: m.AdminNames })))
const Calendar = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.Calendar })))
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
const RaceEntry = lazy(() => import('./pages/RaceEntry').then((m) => ({ default: m.RaceEntry })))
const TeamCalendar = lazy(() =>
  import('./pages/TeamCalendar').then((m) => ({ default: m.TeamCalendar })),
)
const MyRaces = lazy(() => import('./pages/MyRaces').then((m) => ({ default: m.MyRaces })))
const News = lazy(() => import('./pages/News').then((m) => ({ default: m.News })))
const Privacy = lazy(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })))
const PublicRider = lazy(() =>
  import('./pages/PublicRider').then((m) => ({ default: m.PublicRider })),
)
const Race = lazy(() => import('./pages/Race').then((m) => ({ default: m.Race })))
const StageReplay = lazy(() =>
  import('./pages/StageReplay').then((m) => ({ default: m.StageReplay })),
)
const Rankings = lazy(() => import('./pages/Rankings').then((m) => ({ default: m.Rankings })))
const Team = lazy(() => import('./pages/Team').then((m) => ({ default: m.Team })))
const Teams = lazy(() => import('./pages/Teams').then((m) => ({ default: m.Teams })))
const RaceOrders = lazy(() => import('./pages/RaceOrders').then((m) => ({ default: m.RaceOrders })))
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const RiderProfile = lazy(() =>
  import('./pages/RiderProfile').then((m) => ({ default: m.RiderProfile })),
)
const RoutesPage = lazy(() => import('./pages/Routes').then((m) => ({ default: m.RoutesPage })))
const Training = lazy(() => import('./pages/Training').then((m) => ({ default: m.Training })))

export function App() {
  return (
    <div className="min-h-screen text-slate-900">
      <SessionExpiryWatcher />
      <Header />
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/races/:raceId" element={<Race />} />
            <Route path="/races/:raceId/stages/:day" element={<StageReplay />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<Team />} />
            <Route path="/countries" element={<Countries />} />
            <Route path="/countries/:code" element={<Country />} />
            <Route path="/riders/:id" element={<PublicRider />} />
            <Route path="/news" element={<News />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/hall-of-fame" element={<HallOfFame />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Base secreta de admins: no enlazada; se protege con el ADMIN_TOKEN dentro. */}
            <Route path="/admin/names" element={<AdminNames />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute>
                  <CreateRider />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rider"
              element={
                <ProtectedRoute>
                  <RiderProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute>
                  <Training />
                </ProtectedRoute>
              }
            />
            <Route
              path="/market"
              element={
                <ProtectedRoute>
                  <Market />
                </ProtectedRoute>
              }
            />
            <Route
              path="/races"
              element={
                <ProtectedRoute>
                  <MyRaces />
                </ProtectedRoute>
              }
            />
            <Route
              path="/race-entry"
              element={
                <ProtectedRoute>
                  <RaceEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team-calendar"
              element={
                <ProtectedRoute>
                  <TeamCalendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finances"
              element={
                <ProtectedRoute>
                  <Finances />
                </ProtectedRoute>
              }
            />
            <Route
              path="/race-orders"
              element={
                <ProtectedRoute>
                  <RaceOrders />
                </ProtectedRoute>
              }
            />
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

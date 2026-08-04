import { Link, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Account } from './pages/Account'
import { AdminNames } from './pages/AdminNames'
import { Calendar } from './pages/Calendar'
import { Countries } from './pages/Countries'
import { FreeAgents } from './pages/FreeAgents'
import { Country } from './pages/Country'
import { CreateRider } from './pages/CreateRider'
import { Finances } from './pages/Finances'
import { HallOfFame } from './pages/HallOfFame'
import { Home } from './pages/Home'
import { HowToPlay } from './pages/HowToPlay'
import { Login } from './pages/Login'
import { Market } from './pages/Market'
import { RaceEntry } from './pages/RaceEntry'
import { TeamCalendar } from './pages/TeamCalendar'
import { MyRaces } from './pages/MyRaces'
import { News } from './pages/News'
import { Privacy } from './pages/Privacy'
import { PublicRider } from './pages/PublicRider'
import { Race } from './pages/Race'
import { Rankings } from './pages/Rankings'
import { Team } from './pages/Team'
import { Teams } from './pages/Teams'
import { RaceOrders } from './pages/RaceOrders'
import { Register } from './pages/Register'
import { Results } from './pages/Results'
import { RiderProfile } from './pages/RiderProfile'
import { RoutesPage } from './pages/Routes'
import { Training } from './pages/Training'

export function App() {
  return (
    <div className="min-h-screen text-slate-900">
      <Header />
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/races/:raceId" element={<Race />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/free-agents" element={<FreeAgents />} />
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
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
        </Routes>
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

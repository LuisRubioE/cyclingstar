import { Link, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Account } from './pages/Account'
import { AdminNames } from './pages/AdminNames'
import { Calendar } from './pages/Calendar'
import { Countries } from './pages/Countries'
import { Country } from './pages/Country'
import { CreateRider } from './pages/CreateRider'
import { Finances } from './pages/Finances'
import { HallOfFame } from './pages/HallOfFame'
import { Home } from './pages/Home'
import { HowToPlay } from './pages/HowToPlay'
import { Login } from './pages/Login'
import { Market } from './pages/Market'
import { News } from './pages/News'
import { Objectives } from './pages/Objectives'
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/races/:raceId" element={<Race />} />
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
            path="/objectives"
            element={
              <ProtectedRoute>
                <Objectives />
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
      <footer className="mx-auto max-w-3xl px-4 py-8 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-4">
          <span>Cycling Star — a personal project</span>
          <Link to="/how-to-play" className="hover:text-slate-600">
            How to play
          </Link>
          <Link to="/privacy" className="hover:text-slate-600">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  )
}

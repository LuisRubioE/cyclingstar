import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Account } from './pages/Account'
import { CreateRider } from './pages/CreateRider'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { RaceOrders } from './pages/RaceOrders'
import { Register } from './pages/Register'
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
            path="/race-orders"
            element={
              <ProtectedRoute>
                <RaceOrders />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

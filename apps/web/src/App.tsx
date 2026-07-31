import { Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Acceso } from './pages/Acceso'
import { Cuenta } from './pages/Cuenta'
import { Home } from './pages/Home'
import { Registro } from './pages/Registro'

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/acceso" element={<Acceso />} />
          <Route
            path="/cuenta"
            element={
              <ProtectedRoute>
                <Cuenta />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

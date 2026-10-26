import { type ReactNode, Suspense } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Header } from './components/Header'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RouteBoundary } from './components/RouteBoundary'
import { SessionExpiryWatcher } from './components/SessionExpiryWatcher'
import { OfflineBanner } from './components/ui/OfflineBanner'
import { Button } from './components/ui/Button'
import { ErrorState } from './components/ui/ErrorState'
import { LoadingState } from './components/ui/QueryView'
import { isStagePagePath } from './domain/firstPaint'
import { pageKindOfPath, usePageTitle } from './domain/pageTitle'
import { lazyPage } from './lazyPage'
import type { PageKind } from '@cyclingstar/shared'

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
 * la vez, una frontera basta para partir el bundle por página. Desde E3 (PR 4), con `lazyPage`, y bajo la
 * barrera por ruta: un trozo que no carga se pinta en su sitio y se puede reintentar (`RouteBoundary`).
 */

// Carga diferida por página. Las páginas exportan componentes con nombre, de ahí el `.then(…)`.
const Account = lazyPage(() => import('./pages/Account').then((m) => ({ default: m.Account })))
// El catálogo (E3, docs/visual.md §5.4; PR 9a): fuera del marco, sin enlace desde ningún sitio.
const UiPage = lazyPage(() => import('./pages/ui/UiPage').then((m) => ({ default: m.UiPage })))
const AdminNames = lazyPage(() =>
  import('./pages/AdminNames').then((m) => ({ default: m.AdminNames })),
)
const AdminPanel = lazyPage(() =>
  import('./pages/AdminPanel').then((m) => ({ default: m.AdminPanel })),
)
const Countries = lazyPage(() =>
  import('./pages/Countries').then((m) => ({ default: m.Countries })),
)
const Country = lazyPage(() => import('./pages/Country').then((m) => ({ default: m.Country })))
const CreateRider = lazyPage(() =>
  import('./pages/CreateRider').then((m) => ({ default: m.CreateRider })),
)
const Finances = lazyPage(() => import('./pages/Finances').then((m) => ({ default: m.Finances })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })),
)
const HallOfFame = lazyPage(() =>
  import('./pages/HallOfFame').then((m) => ({ default: m.HallOfFame })),
)
const Home = lazyPage(() => import('./pages/Home').then((m) => ({ default: m.Home })))
const HowToPlay = lazyPage(() =>
  import('./pages/HowToPlay').then((m) => ({ default: m.HowToPlay })),
)
const Login = lazyPage(() => import('./pages/Login').then((m) => ({ default: m.Login })))
const Market = lazyPage(() => import('./pages/Market').then((m) => ({ default: m.Market })))
const MyRaces = lazyPage(() => import('./pages/MyRaces').then((m) => ({ default: m.MyRaces })))
const News = lazyPage(() => import('./pages/News').then((m) => ({ default: m.News })))
const Privacy = lazyPage(() => import('./pages/Privacy').then((m) => ({ default: m.Privacy })))
const Race = lazyPage(() => import('./pages/Race').then((m) => ({ default: m.Race })))
const RaceOrders = lazyPage(() =>
  import('./pages/RaceOrders').then((m) => ({ default: m.RaceOrders })),
)
const RacesIndex = lazyPage(() =>
  import('./pages/RacesIndex').then((m) => ({ default: m.RacesIndex })),
)
const Rankings = lazyPage(() => import('./pages/Rankings').then((m) => ({ default: m.Rankings })))
const Register = lazyPage(() => import('./pages/Register').then((m) => ({ default: m.Register })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })),
)
const RiderProfile = lazyPage(() =>
  import('./pages/RiderProfile').then((m) => ({ default: m.RiderProfile })),
)
const loadStageReplay = () => import('./pages/StageReplay')
const StageReplay = lazyPage(() => loadStageReplay().then((m) => ({ default: m.StageReplay })))
const StageReportPage = lazyPage(() =>
  import('./pages/StageReport').then((m) => ({ default: m.StageReportPage })),
)
const Team = lazyPage(() => import('./pages/Team').then((m) => ({ default: m.Team })))
const TeamCalendar = lazyPage(() =>
  import('./pages/TeamCalendar').then((m) => ({ default: m.TeamCalendar })),
)
const TeamIdentity = lazyPage(() =>
  import('./pages/TeamIdentity').then((m) => ({ default: m.TeamIdentity })),
)
const TeamSquad = lazyPage(() =>
  import('./pages/TeamSquad').then((m) => ({ default: m.TeamSquad })),
)
const Teams = lazyPage(() => import('./pages/Teams').then((m) => ({ default: m.Teams })))
const Training = lazyPage(() => import('./pages/Training').then((m) => ({ default: m.Training })))
const VerifyEmail = lazyPage(() =>
  import('./pages/VerifyEmail').then((m) => ({ default: m.VerifyEmail })),
)

/**
 * LA PÁGINA DE ETAPA SE PIDE YA (E2, paso 10b, los arreglos; docs/retransmision.md §18.5): si la carga es la
 * de una etapa, sus ficheros salen al evaluarse este módulo, con el resto de la web, y no en el primer render,
 * un viaje más tarde. Es la misma importación que la de su ruta (el navegador la hace una vez); en cualquier
 * otra página no se pide nada.
 */
if (typeof window !== 'undefined' && isStagePagePath(window.location.pathname))
  // si falla, lo dice la ruta al pedirla otra vez (su `ErrorBoundary`); aquí no hay a quién decírselo
  loadStageReplay().catch(() => undefined)

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

/**
 * EL TÍTULO DE LAS PÁGINAS SIN ETAPA (E2, docs/retransmision.md §11.8; paso 9a): corredor, equipo,
 * noticias y rankings llevan su nombre; la portada y el resto, el de la app. Las de una carrera, una
 * etapa y su acta se titulan solas, con su información (`usePageTitle` en su página); aquí no se monta
 * nada para ellas, para que haya un solo escritor por página.
 */
function RouteTitle() {
  const { pathname } = useLocation()
  const page = pageKindOfPath(pathname)
  return page === null ? null : <GenericTitle page={page} />
}

function GenericTitle({ page }: { page: PageKind }) {
  usePageTitle(null, page)
  return null
}

/** Atajo para las páginas que exigen sesión. */
function Private({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

/**
 * URL que no existe (ni siquiera como ruta vieja): se dice, no se deja la página en blanco. Desde el PR 10,
 * un `ErrorState` `notFound` (E3, §4.2), la respuesta de la pantalla 46.
 */
function NotFound() {
  return (
    <ErrorState
      kind="notFound"
      message="Page not found"
      answer
      action={
        <div className="flex flex-col items-start gap-3">
          <p className="text-meta text-ink-2">
            That page does not exist — it may have moved. Try the season races or your dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button to="/" variant="primary">
              Dashboard
            </Button>
            <Button to="/world/races">Races</Button>
          </div>
        </div>
      }
    />
  )
}

export function App() {
  const { pathname } = useLocation()
  // `/_ui` va sin la cabecera ni la barra de hoy: es el catálogo, y la prueba del teléfono lo quiere a cero.
  if (pathname === '/_ui')
    return (
      <RouteBoundary resetKey={pathname}>
        <Suspense fallback={null}>
          <UiPage />
        </Suspense>
      </RouteBoundary>
    )
  return (
    /*
      El hueco de abajo es el de lo fijo (E3, docs/visual.md §4.9; PR 11): la barra inferior del teléfono
      y la `ActionBar` taparían el final de la página, así que el marco reserva la suma de sus altos
      medidos, con el área segura de los móviles con muesca (`--fixed-bottom`, que escriben ellas al
      montarse). Va aquí y no en `main` para que tampoco tapen el pie. En escritorio no hay barra inferior.
    */
    <div className="min-h-screen pb-[var(--fixed-bottom)] text-slate-900">
      <SessionExpiryWatcher />
      <RouteTitle />
      <Header />
      {/* Sin red, la franja que lo dice, con la hora de lo que se ve (§12.1; PR 4). */}
      <OfflineBanner />
      <main className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
        <RouteBoundary resetKey={pathname}>
          <Suspense fallback={<LoadingState label="the page" />}>
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
              {/* El acta compartible (E2, §11.10; D-36, DD-12): pública, y con la puerta a quien no la vio. */}
              <Route path="/world/races/:raceId/stages/:day/report" element={<StageReportPage />} />
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
              {/*
              Las tres páginas de los enlaces que llegan por correo. Públicas: el enlace se
              abre a menudo desde el móvil o desde otro navegador, sin sesión, y exigirla ahí sería
              decirle a esa persona que ha fallado cuando no.
            */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
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
              {/* Panel de admin: la API decide quién entra (sesión de administrador). */}
              <Route
                path="/admin"
                element={
                  <Private>
                    <AdminPanel />
                  </Private>
                }
              />
              {/* Nombres bloqueados: sesión de admin, o el ADMIN_TOKEN para quien no la tenga. */}
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
              <Route
                path="/races/:raceId/stages/:day/report"
                element={<Legacy to="/world/races/:raceId/stages/:day/report" />}
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
        </RouteBoundary>
      </main>
      <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-4">
          {/* los dos enlaces, de 44 × 44 (WCAG 2.5.8; E3, PR 12a): medían 16 de alto en todas las pantallas */}
          <div className="flex items-center gap-x-4">
            <Link
              to="/how-to-play"
              className="inline-flex min-h-11 min-w-11 items-center hover:text-slate-600"
            >
              How to play
            </Link>
            <Link
              to="/privacy"
              className="inline-flex min-h-11 min-w-11 items-center hover:text-slate-600"
            >
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
      <BottomNav />
    </div>
  )
}

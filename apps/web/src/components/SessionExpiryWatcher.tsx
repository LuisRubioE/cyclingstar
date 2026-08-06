import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setUnauthorizedHandler } from '../api/session'

/**
 * Escucha global de sesión caducada. No pinta nada: solo conecta el aviso de 401 de la capa de
 * datos con el router, para que cualquier página lleve a /login en vez de quedarse a medias.
 */
export function SessionExpiryWatcher() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    return setUnauthorizedHandler(() => {
      // Ya estamos en el acceso (o registrándonos): no hay nada que redirigir.
      if (location.pathname === '/login' || location.pathname === '/register') return
      navigate('/login', { replace: true })
    })
  }, [navigate, location.pathname])

  return null
}

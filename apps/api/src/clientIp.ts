import { isIP } from 'node:net'
import type { FastifyRequest } from 'fastify'

/**
 * LA IP QUE VALE PARA LOS LÍMITES (docs/cuenta.md §7.1; D-21; I-08; O-13).
 *
 * `trustProxy` sigue en `true` (app.ts): el borde de Railway reescribe `X-Forwarded-For` con una sola
 * dirección (PR #348), así que `request.ip` es la del cliente. Pero Fastify no la valida: con una
 * cabecera `basura`, `request.ip` vale `'basura'` (X-02). `clientIp` devuelve `request.ip` si es una IP
 * y, si no, la del socket, y lo apunta como `xff_varias` (como mucho una vez por hora y proceso, sin la
 * IP). Es la que usan las claves de los límites: el de Fastify y L4.
 */
export function clientIp(request: FastifyRequest): string {
  const ip = request.ip
  if (isIP(ip) !== 0) return ip
  avisarXffVarias(request)
  return request.socket.remoteAddress ?? ''
}

const HORA_MS = 3_600_000
let ultimoAviso = 0

function avisarXffVarias(request: FastifyRequest): void {
  const ahora = Date.now()
  if (ahora - ultimoAviso < HORA_MS) return
  ultimoAviso = ahora
  request.log.warn({ evento: 'xff_varias' }, 'xff_varias')
}

/**
 * El cubo de una IP (7-i): una IPv4 entera; una IPv6, su /64, porque un solo equipo rota dentro de su
 * /64 sin límite práctico. Lo que no es una IP se queda como está.
 */
export function ipBucket(ip: string): string {
  if (isIP(ip) !== 6) return ip
  const sinZona = ip.split('%')[0] ?? ip
  // `::ffff:1.2.3.4` es una IPv4 vestida de IPv6: cuenta como la IPv4.
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(sinZona)
  if (v4?.[1] !== undefined) return v4[1]
  const [cabeza = '', cola = ''] = sinZona.split('::')
  const partes = (s: string): string[] => (s === '' ? [] : s.split(':'))
  const izq = partes(cabeza)
  const der = sinZona.includes('::') ? partes(cola) : []
  const ceros = Array<string>(Math.max(0, 8 - izq.length - der.length)).fill('0')
  const todas = sinZona.includes('::') ? [...izq, ...ceros, ...der] : izq
  return `${todas
    .slice(0, 4)
    .map((h) => (Number.parseInt(h, 16) || 0).toString(16))
    .join(':')}::/64`
}

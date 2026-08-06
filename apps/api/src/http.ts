import type { FastifyReply } from 'fastify'

/**
 * Formato ÚNICO de error de toda la API: `{ ok: false, error: <codigo> }`.
 *
 * El código es una etiqueta estable y opaca (`validacion`, `no_autorizado`, `no_encontrado`…),
 * nunca el detalle interno del validador: los `error.validation` de Fastify/Zod describen la forma
 * exacta del esquema (rutas de campos, palabras clave del validador) y eso es estructura interna
 * que no debe salir al cliente. El cliente distingue por `status` + `error`, no por el detalle.
 */
export interface ApiError {
  ok: false
  error: string
}

/** Construye el cuerpo de error uniforme. */
export function apiError(code: string): ApiError {
  return { ok: false, error: code }
}

/** Responde con el formato de error uniforme. */
export function sendError(reply: FastifyReply, status: number, code: string): FastifyReply {
  return reply.status(status).send(apiError(code))
}

/** 400: la entrada no valida (params, query o body). */
export function badRequest(reply: FastifyReply, code = 'validacion'): FastifyReply {
  return sendError(reply, 400, code)
}

/** 401: falta sesión o token de admin. */
export function unauthorized(reply: FastifyReply): FastifyReply {
  return sendError(reply, 401, 'no_autorizado')
}

/** 404: el recurso no existe (o el id, siendo válido, no corresponde a nada). */
export function notFound(reply: FastifyReply, code = 'no_encontrado'): FastifyReply {
  return sendError(reply, 404, code)
}

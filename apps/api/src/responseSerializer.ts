import type { FastifySerializerCompiler } from 'fastify'
import { ResponseSerializationError } from 'fastify-type-provider-zod'
import { z } from 'zod'

/**
 * EL SERIALIZADOR DE LA FRONTERA (E3, docs/visual.md §13.2 y §13.3; D-54; PR 19a). Lee la respuesta con su
 * esquema como la lee la web (`safeParse`, en modo strip) y escribe lo que sale, así que lo que el esquema
 * no declara desaparece a cualquier profundidad. El de `fastify-type-provider-zod` 7.0.0 la codifica
 * (`safeEncode`), y en ese sentido `.default()` no rellena ni `.catch()` recoge: una respuesta sin un campo
 * con `default`, que la web acepta, daba un 500 (medido en el 19a con zod 4.4.3). Ningún esquema de
 * respuesta lleva `transform` ni códec, así que leer y codificar solo difieren en eso.
 *
 * Una respuesta que no casa con su esquema sigue siendo un 500 (`ResponseSerializationError`, que el
 * manejador de errores de `app.ts` escribe en el registro con su causa), y por eso cada ruta entra con su
 * prueba en `responses.test.ts` (§13.4).
 */
export const responseSerializerCompiler: FastifySerializerCompiler<unknown> = ({
  schema: maybeSchema,
  method,
  url,
}) => {
  const schema = zodOf(maybeSchema)
  return (data: unknown) => {
    const result = schema.safeParse(data)
    if (!result.success) throw new ResponseSerializationError(method, url, { cause: result.error })
    return JSON.stringify(result.data)
  }
}

/** El esquema de Zod, solo o envuelto en `{ properties }`, como lo resuelve el paquete. */
function zodOf(maybe: unknown): z.ZodType {
  if (maybe instanceof z.ZodType) return maybe
  if (typeof maybe === 'object' && maybe !== null && 'properties' in maybe) {
    const inner = (maybe as { properties: unknown }).properties
    if (inner instanceof z.ZodType) return inner
  }
  throw new Error(`esquema de respuesta que no es de Zod: ${JSON.stringify(maybe)}`)
}

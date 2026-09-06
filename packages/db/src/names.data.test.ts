import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isBlockedName } from './names.js'

/**
 * LOS DATOS DE NOMBRES, VIGILADOS.
 *
 * Las listas viven en `packages/db/data/names/<cc>.json` y crecen a mano, país a país, así que lo
 * que hace falta es una red que atrape lo que se rompe al escribir a mano: un país cuyo código no
 * casa con su fichero, un nombre repetido dentro de su propia lista —que además desordena la
 * ponderación por frecuencia—, cadenas vacías o con espacios de más, y listas que se quedan cortas.
 *
 * NO vigila que los nombres sean AUTÉNTICOS: eso no lo puede comprobar una prueba, y es lo que hay
 * que cuidar al escribirlos.
 */

const aquí = dirname(fileURLToPath(import.meta.url))
const dirDatos = join(aquí, '..', 'data', 'names')

interface Fichero {
  country: string
  male: string[]
  female: string[]
  surnames: string[]
}

const ficheros = readdirSync(dirDatos)
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({
    fichero: f,
    datos: JSON.parse(readFileSync(join(dirDatos, f), 'utf8')) as Fichero,
  }))

describe('db: los datos de nombres por país', () => {
  it('hay ficheros y cada uno declara su propio país', () => {
    expect(`países: ${ficheros.length > 100}`).toBe('países: true')
    for (const { fichero, datos } of ficheros) {
      const cc = fichero.replace('.json', '').toUpperCase()
      expect(`${fichero}: ${datos.country}`).toBe(`${fichero}: ${cc}`)
    }
  })

  it('ninguna lista repite un nombre consigo misma', () => {
    for (const { fichero, datos } of ficheros) {
      for (const lista of ['male', 'female', 'surnames'] as const) {
        const vistos = new Set<string>()
        const repetidos: string[] = []
        for (const n of datos[lista]) {
          if (vistos.has(n)) repetidos.push(n)
          vistos.add(n)
        }
        expect(`${fichero}/${lista} repetidos: ${repetidos.join(', ') || 'ninguno'}`).toBe(
          `${fichero}/${lista} repetidos: ninguno`,
        )
      }
    }
  })

  it('ningún nombre viene vacío ni con espacios de sobra', () => {
    for (const { fichero, datos } of ficheros) {
      for (const lista of ['male', 'female', 'surnames'] as const) {
        for (const n of datos[lista]) {
          expect(`${fichero}/${lista} «${n}» limpio: ${n.length > 0 && n === n.trim()}`).toBe(
            `${fichero}/${lista} «${n}» limpio: true`,
          )
        }
      }
    }
  })

  it('ninguna lista se queda tan corta que el pelotón se repita', () => {
    // Suelo bajo a propósito: lo que vigila es que un país no se quede en cuatro nombres, no cuánto
    // ha crecido. El crecimiento es trabajo de contenido y se mide leyendo, no aquí.
    for (const { fichero, datos } of ficheros) {
      expect(`${fichero} male ${datos.male.length >= 20}`).toBe(`${fichero} male true`)
      expect(`${fichero} female ${datos.female.length >= 15}`).toBe(`${fichero} female true`)
      expect(`${fichero} surnames ${datos.surnames.length >= 20}`).toBe(`${fichero} surnames true`)
    }
  })

  it('ningún nombre generable choca de frente con un profesional real', () => {
    // No se pueden probar todas las combinaciones (son millones), pero sí que ningún APELLIDO suelto
    // sea ya un nombre bloqueado, que es el error que se cuela al copiar de una lista de ciclistas.
    for (const { fichero, datos } of ficheros) {
      for (const s of datos.surnames) {
        expect(`${fichero} apellido bloqueado «${s}»: ${isBlockedName(s)}`).toBe(
          `${fichero} apellido bloqueado «${s}»: false`,
        )
      }
    }
  })
})

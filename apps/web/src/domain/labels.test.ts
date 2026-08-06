import { describe, expect, it } from 'vitest'
import {
  EFFORT_DESC,
  EFFORT_LABEL,
  EFFORT_OPTIONS,
  MENTALITY_DESC,
  MENTALITY_LABEL,
  MENTALITY_OPTIONS,
  STAGE_ROLE_DESC,
  STAGE_ROLE_LABEL,
  STAGE_ROLE_OPTIONS,
  ledgerKindLabel,
  mentalityLabel,
  newsIcon,
  palmaresLabel,
  raceClassLabel,
  roleLabel,
} from './labels'

describe('web: diccionario de dominio (español interno → inglés de UI)', () => {
  it('traduce los roles de CONTRATO y los de ORDEN con el mismo diccionario', () => {
    // El mercado no cubría estos tres y mostraba la clave interna en crudo.
    expect(roleLabel('sprinter')).toBe('Sprinter')
    expect(roleLabel('cazaetapas')).toBe('Break hunter')
    expect(roleLabel('marcador')).toBe('Marker')
    expect(roleLabel('lider')).toBe('Leader')
    expect(roleLabel('colider')).toBe('Co-leader')
  })

  it('deja pasar tal cual un valor desconocido (nunca oculta el dato)', () => {
    expect(roleLabel('rol_nuevo')).toBe('rol_nuevo')
    expect(ledgerKindLabel('multa')).toBe('multa')
    expect(palmaresLabel('otro')).toBe('otro')
    expect(mentalityLabel('desconocida')).toBe('desconocida')
    expect(newsIcon('lo_que_sea')).toBe('📰')
  })

  it('traduce los tipos de apunte y de palmarés', () => {
    expect(ledgerKindLabel('salario')).toBe('Salary')
    expect(ledgerKindLabel('viaje')).toBe('Travel')
    expect(palmaresLabel('gc')).toBe('Overall win')
  })

  it('escribe la clase de carrera como en el ciclismo real', () => {
    expect(raceClassLabel('WT')).toBe('.WT')
    expect(raceClassLabel('1')).toBe('.1')
  })

  it('toda opción de la consola de órdenes tiene etiqueta y descripción', () => {
    for (const role of STAGE_ROLE_OPTIONS) {
      expect(STAGE_ROLE_LABEL[role]).toBeTruthy()
      expect(STAGE_ROLE_DESC[role]).toBeTruthy()
    }
    for (const mentality of MENTALITY_OPTIONS) {
      expect(MENTALITY_LABEL[mentality]).toBeTruthy()
      expect(MENTALITY_DESC[mentality]).toBeTruthy()
      // La forma "en frase" (para la crónica) es la misma mentalidad en minúscula.
      expect(mentalityLabel(mentality)).not.toBe(mentality)
    }
    for (const effort of EFFORT_OPTIONS) {
      expect(EFFORT_LABEL[effort]).toBeTruthy()
      expect(EFFORT_DESC[effort]).toBeTruthy()
    }
  })
})

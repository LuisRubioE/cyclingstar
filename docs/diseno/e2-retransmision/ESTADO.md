# E2 · Estado del proceso de diseño (nota para reanudar)

Última actualización: 3 de octubre de 2026, 08:55 UTC, en pausa a petición del dueño (cuota).

## Hecho

- Fases 0 a 3 completas (mapas, propuestas, juicios, síntesis y v0).
- Fase 4, refutación: completa. 246 hallazgos (cobertura 60, dueño 45, coste 45, código 96),
  repartidos en `refutaciones/por-lote/L*.json`.
- Fase 5, corrección: completa en los diez lotes. 466 entradas (424 aplicadas, 39 parciales, 3
  desestimadas) en `correcciones-L*.json`; 299 cruzadas en `cruzadas-L*.json`.
- Fase 6a, coherencia: completa. `refutaciones/coherencia.json` (299 cruzadas: 129 aplicadas, 170 ya
  estaban); glosario y decisiones fundidos; `borrador/retransmision-v1.md` (11.411 líneas,
  `ensamblar.sh --comprobar` con 0 fallos); `dudas.md` con 19 de 27 cerradas.
- Fase 6b, auditorías: ENTREGADAS L1 a L7 (`refutaciones/auditorias-L1.json` a `-L7.json`,
  todas con sus arreglos pequeños aplicados y subidos). L8 y L9 murieron por cuota con el JSON casi
  entero (120 y 136 veredictos, en la rama); L10 murió antes de escribir nada.
  Recuento parcial de L1 a L7: 379 veredictos, de ellos 2 desestimados con motivo, 9 parciales y
  unos 10 abiertos que apuntan a otras secciones (lista en `borrador/notas-orquestador.md`,
  sección «Abiertos de la auditoría que cruzan secciones»).
## Pendiente, en este orden

1. Cerrar L8 y L9 (un cerrador por lote: verificar `auditorias-L8.json` y `-L9.json` contra
   `por-lote/`, las cruzadas y `coherencia.json`, completar lo que falte, no rehacer) y auditar L10
   (§0, §20, §21) desde cero, según `05-fase-auditoria.md`. De tres en tres como máximo.
2. Cierre (fase 6c, `04-fase-refutacion.md` §6): resolver los abiertos que cruzan secciones
   (`notas-orquestador.md`), fundir las diez auditorías en `refutaciones/resultado-final.json`
   (formato del de E1) y escribir la cabecera definitiva `borrador/00-cabecera.md` con la
   procedencia y el recuento.
3. Ensamblado final (fase 7): `ensamblar.sh` a `docs/retransmision.md`; comprobar; actualizar
   `docs/encargos.md` (E2: diseño escrito, sin implementar) y `docs/diseno/README.md`.

## Avisos

- El límite de sesión de Opus (ventanas de cinco horas) ha cortado agentes cuatro veces; los
  agentes escriben por partes y se relanzan continuando.
- Los correctores no tocan secciones ajenas: lo que afecta a otra sección va a `cruzadas-L<n>.json`.

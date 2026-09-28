# E2 · Estado del proceso de diseño (nota para reanudar)

Última actualización: 28 de septiembre de 2026, en pausa a petición del dueño.

## Hecho

- Fase 0, mapas: 7 de 7 (`mapas/`).
- Fase 1, propuestas: 5 de 5 (`propuestas/`).
- Fase 2, juicios: 3 de 3 más `juicios/veredicto.json` (base `ingeniero` por suma de puntuaciones).
- Fase 3, síntesis: esqueleto, glosario, decisiones cerradas, 22 secciones en `borrador/` y el
  ensamblado `borrador/retransmision-v0.md` (10.314 líneas), con `borrador/ensamblar.sh` y
  `borrador/dudas.md` (27 dudas).
- Fase 4, refutación: `refutaciones/hallazgos-cobertura.json` (60), `-dueno.json` (45),
  `-coste.json` (45) completos; `-codigo.json` PARCIAL (cubre §1 a §15 y §18; §16 a medias; §13 y
  §17 con pocas entradas; §19 a §21 sin mirar). Reparto por lote en `refutaciones/por-lote/L*.json`
  (regenerable con el script `repartir.py` del scratchpad; su lógica: lote por número de §).
- Fase 5, corrección: L1, L2, L5, L6 y L7 aplicados (`refutaciones/correcciones-L<n>.json` y
  `cruzadas-L<n>.json`); las secciones corregidas están en `borrador/` y en la rama.

## Pendiente, en este orden

1. Refutador de código, resto: §16 desde 16.4, §17, §19, §20, §21 y segunda pasada de §13 y §17;
   continuar `hallazgos-codigo.json` desde el último id. Después regenerar `por-lote/`.
2. Correctores L4 (§6, §8: incluye el hallazgo más grave, los maillots de la fuga en la ronda de
   la moto), L3 (§5, §13), L8 (§12, §16), L9 (§17, §19) y L10 (§0, §20, §21), según
   `04-fase-refutacion.md` §5, cada uno con su `por-lote/L<n>.json` y con las `cruzadas-*.json`
   de los demás lotes que apunten a sus secciones.
3. Pasada de coherencia (fase 6): aplicar todas las `cruzadas-*.json`, fundir glosario y
   decisiones, cerrar `dudas.md`, reensamblar con `ensamblar.sh` en `retransmision-v1.md`.
4. Auditorías por lote contra el texto de hoy (`auditorias-<lote>.json`), cierre
   (`resultado-final.json` y `borrador/00-cabecera.md` definitiva con el recuento).
5. Ensamblado final en `docs/retransmision.md`; actualizar `docs/encargos.md` (E2: diseño escrito,
   sin implementar) y `docs/diseno/README.md` (nuevo directorio `e2-retransmision/`).

## Avisos

- El límite de sesión de Opus (ventanas de cinco horas) ha cortado agentes cuatro veces; los
  agentes escriben por partes y se relanzan continuando.
- Los correctores no tocan secciones ajenas: lo que afecta a otra sección va a `cruzadas-L<n>.json`.

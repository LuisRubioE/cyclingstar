# E2 · Estado del proceso de diseño (nota para reanudar)

Última actualización: 29 de septiembre de 2026, 04:25 UTC, en pausa a petición del dueño (cuota).

## Hecho

- Fases 0 a 3 completas (mapas, propuestas, juicios, síntesis y v0).
- Fase 4, refutación: completa. 246 hallazgos (cobertura 60, dueño 45, coste 45, código 96),
  repartidos en `refutaciones/por-lote/L*.json`.
- Fase 5, corrección: completa en los diez lotes. 466 entradas (424 aplicadas, 39 parciales, 3
  desestimadas) en `correcciones-L*.json`; 299 cruzadas en `cruzadas-L*.json`.
- Fase 6a, coherencia: completa. `refutaciones/coherencia.json` (299 cruzadas: 129 aplicadas, 170 ya
  estaban); glosario y decisiones fundidos; `borrador/retransmision-v1.md` (11.411 líneas,
  `ensamblar.sh --comprobar` con 0 fallos); `dudas.md` con 19 de 27 cerradas.
- Fase 6b, auditorías: instrucciones en `05-fase-auditoria.md`. La tanda 1 (L1 a L5) se lanzó dos
  veces y murió por cuota las dos; NO hay ningún `auditorias-L*.json` escrito. Quedan en la rama
  unos arreglos pequeños que los auditores hicieron en §2, §3, §6, §8, glosario y decisiones.

## Pendiente, en este orden

1. Auditorías por lote (fase 6b): L1 a L5 y luego L6 a L10, según `05-fase-auditoria.md`, cada
   una escribiendo `refutaciones/auditorias-L<n>.json` por partes desde el principio. Cinco a la
   vez como máximo; conviene arrancar justo tras un reinicio de la ventana de Opus.
2. Cierre (fase 6c, `04-fase-refutacion.md` §6): fundir las auditorías en
   `refutaciones/resultado-final.json` (formato del de E1) y escribir la cabecera definitiva
   `borrador/00-cabecera.md` con la procedencia y el recuento.
3. Ensamblado final (fase 7): `ensamblar.sh` a `docs/retransmision.md`; comprobar; actualizar
   `docs/encargos.md` (E2: diseño escrito, sin implementar) y `docs/diseno/README.md`.

## Avisos

- El límite de sesión de Opus (ventanas de cinco horas) ha cortado agentes cuatro veces; los
  agentes escriben por partes y se relanzan continuando.
- Los correctores no tocan secciones ajenas: lo que afecta a otra sección va a `cruzadas-L<n>.json`.

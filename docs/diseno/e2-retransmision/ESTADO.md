# E2 · Estado del proceso de diseño

Estado: **terminado** el 3 de octubre de 2026. El documento final es `docs/retransmision.md` (11.494
líneas, veintidós secciones de la 0 a la 21, con los apéndices A a F en §21), diseño escrito y sin
implementar. Lo que se queda de este directorio y lo que es andamio lo dice `docs/diseno/README.md`.

## Hecho

- Fases 0 a 3 (mapas, propuestas, juicios, síntesis y v0): completas.
- Fase 4, refutación: 246 hallazgos (código 96, cobertura 60, dueño 45, coste 45; 27 altos, 101
  medios y 118 bajos), repartidos en `refutaciones/por-lote/`.
- Fase 5, corrección: diez lotes, 466 entradas (424 aplicadas, 39 en parte y 3 desestimadas) y 299
  cruzadas.
- Fase 6a, coherencia: las 299 cruzadas con su entrada en `refutaciones/coherencia.json` (129
  aplicadas, 170 ya estaban); v1 de 11.411 líneas.
- Fase 6b, auditoría: los diez lotes auditados, 777 veredictos (775 cerrados y 2 desestimados con
  motivo), más la resolución cruzada de los abiertos que cruzaban secciones (40 entradas: 16 cerradas
  y 24 que ya estaban).
- Fase 6c, cierre: `refutaciones/resultado-final.json` (243 hallazgos aplicados enteros, 2 en parte, 1
  desestimado y ninguno sin tocar) y la cabecera definitiva, `borrador/00-cabecera.md`.
- Fase 7, ensamblado: `docs/retransmision.md`, con `bash docs/diseno/e2-retransmision/borrador/ensamblar.sh --final --comprobar`
  (0 fallos y 0 avisos: sin rayas ni guiones en medio de frase, sin frases cortadas, las remisiones
  §N.M a subsecciones que existen, los 49 injertos, 32 objeciones y 23 huecos en algún bloque de
  cierre, las veintidós secciones y los seis apéndices, y la línea de estado y la regla de arranque en
  la cabecera). Lo que hizo el ensamblado sobre los ficheros de sección:
  - Fundió los bloques de cierre: quita los de nombres propuestos y de dudas, deja los de injertos,
    objeciones y huecos, y el de decisiones de cada sección pasa a llamarse «Decisiones de esta
    sección» (antes «Decisión tomada aquí»).
  - Nombró por sus secciones los lotes L1 a L10, que ya solo salen en la tabla de §0.8, la de la
    procedencia; quitó del cuerpo las remisiones a `refutaciones/` (queda la de §0.8 al resultado
    final) y al glosario como fichero aparte (el apéndice F dice dónde vive cada familia de nombres).
  - Siguió en las citas de `docs/encargos.md` las catorce líneas que ganó ese fichero con la nota de
    estado de E2, y dejó en pasado las dos afirmaciones del documento sobre lo que `encargos.md`
    corrigió (la tabla `stages.radio`).
- Fuera del directorio: `docs/encargos.md` (la cabecera, la nota de estado de E2 y su «Qué leer»
  corregido) y `docs/diseno/README.md` (la sección de `e2-retransmision/`).

## Pendiente

Nada del proceso de diseño. Lo único abierto son ocho medidas que el documento deja a pasos de su
plan, cada una con el paso que la hace (§0.8 y §18.9 del documento, y las dudas 3.1 a 3.6, 3.8 y
3.9 de `borrador/dudas.md`):

1. `sendBeacon` con un `Blob` JSON en Chrome y en Safari de móvil (paso 7a).
2. B14 del mánager desde el servicio `web` de Railway contra una copia de producción (paso 7a).
3. TOAST en la Postgres de producción (paso 5).
4. B15 con el día entero (pasos 5 y 10b).
5. B21 y B22 contra una línea grabada (pasos 4b y 6a).
6. El móvil, a mano y con el protocolo de §18.5 (paso 10b).
7. La crono más larga de 176 corredores con el grabador de verdad (paso 4b).
8. El racimo en vivo de 12-s con los nombres reales (paso 6b, B19).

La implementación no ha empezado: espera a la regla de arranque de `docs/encargos.md` (l. 15-26) y a
las 27 decisiones del dueño de §20, que traen valor por defecto.

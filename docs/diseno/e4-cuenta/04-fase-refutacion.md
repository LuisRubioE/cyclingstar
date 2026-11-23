# E4 · Fases 4 a 6: refutación, corrección y auditoría (modo ahorro)

Desde el 23 de noviembre el dueño pide gastar pocos tokens, así que estas fases se hacen con **un
agente a la vez** y menos agentes que en E3:

1. **Dos refutadores adversarios** sobre `borrador/cuenta-v0.md`, uno tras otro: `codigo-seguridad`
   (cada afirmación sobre el código, `better-auth` 1.7.26 y Fastify 5.12.8 contra el paquete; el
   modelo de amenazas, intentando romper cada freno) y `cobertura-duenio` (el encargo, `00-encargo.md`
   §2, §3 y §9 entero, los mapas 04 y 05, las fronteras, y que nada contradiga lo que decidió el
   dueño). Cada uno escribe `refutaciones/hallazgos-<foco>.json`: una lista de hallazgos
   `{ "id": "R<foco>-nnn", "seccion": "§N", "gravedad": "alta | media | baja", "que": "…",
"evidencia": "fichero l. n o la medida", "arreglo": "…" }`, y nada más. Sin hallazgos de estilo.
2. **Un corrector** aplica los hallazgos en las secciones de `borrador/` y escribe
   `refutaciones/correcciones.json` (por hallazgo: aplicado, en parte o desestimado, con su porqué),
   incluida una pasada de coherencia entre secciones.
3. **Un auditor** vuelve a mirar cada hallazgo contra el texto corregido, no contra el informe, y
   escribe `refutaciones/resultado-final.json` con su veredicto y los recuentos.
4. El orquestador escribe la cabecera (`borrador/00-cabecera.md`, §0) y ensambla `docs/cuenta.md`
   con `borrador/ensamblar.sh`.

Reglas: las de `00-encargo.md` §7. Nadie edita fuera de `docs/diseno/e4-cuenta/` salvo el
orquestador; nadie hace commits salvo el orquestador.

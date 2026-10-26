/**
 * GENERADO por `apps/web/scripts/flag-sprite.mjs`: no se edita a mano (E3, docs/visual.md §9.5; PR 16a).
 * Las 133 banderas del juego (`COUNTRIES`), de `flag-icons` 7.5.0, a 32 × 24 en RGB y en este orden,
 * en `flagCells.generated.bin`: las muestrea la distancia dibujada del maillot nacional (`kitDistance.ts`).
 * `apps/web/src/components/ui/generados.test.ts` mira que está al día.
 */

export const FLAG_CELL_PIXELS = {
  /** cada celda, en píxeles */
  width: 32,
  height: 24,
  /** los países, en el orden de sus celdas en el .bin */
  codes: ['AD', 'AE', 'AG', 'AL', 'AM', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BE', 'BF', 'BG', 'BH', 'BJ', 'BM', 'BO', 'BR', 'BY', 'BZ', 'CA', 'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CY', 'CZ', 'DE', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FR', 'GB', 'GE', 'GR', 'GT', 'GU', 'GW', 'HK', 'HN', 'HR', 'HU', 'ID', 'IE', 'IL', 'IN', 'IR', 'IS', 'IT', 'JM', 'JO', 'JP', 'KE', 'KG', 'KR', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LT', 'LU', 'LV', 'MA', 'MC', 'MD', 'ME', 'MK', 'ML', 'MN', 'MO', 'MT', 'MU', 'MX', 'MY', 'NA', 'NG', 'NL', 'NO', 'NZ', 'OM', 'PA', 'PE', 'PH', 'PL', 'PR', 'PT', 'PY', 'QA', 'RO', 'RS', 'RU', 'RW', 'SA', 'SC', 'SE', 'SG', 'SI', 'SK', 'SN', 'SR', 'SV', 'SX', 'SZ', 'TH', 'TN', 'TR', 'TT', 'TW', 'UA', 'US', 'UY', 'UZ', 'VC', 'VE', 'VN', 'XK', 'ZA', 'ZW'],
  /** el sha256 de `flagCells.generated.bin` */
  sha256: 'a386a6e63318bdd38f7c5fdc77d76a471ca32638ac172d3a0359d1d12343e585',
  /** el sha256 de lo que lo hace: las medidas, los países, sus SVG y el script, en orden */
  sourceSha256: 'ad49f323dd59766c4ef3b5ba61b87593cb2efa929ce0c34fffecfad0cd31b383',
} as const

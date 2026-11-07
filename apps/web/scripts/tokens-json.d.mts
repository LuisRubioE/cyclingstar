/** Los tipos de `tokens-json.mjs`, para `generados.test.ts`. */

/** Las declaraciones `--nombre: valor` del primer bloque que abre con esa cabecera, o null si no está. */
export declare function declaraciones(css: string, cabecera: string): Map<string, string> | null

/** `tokens.json` de un `index.css`. */
export declare function tokensJson(css: string): unknown

/** Los tipos de `eslint-ui.mjs`, para los tests que lo leen (`vocabulario.test.ts`, `heredados.test.ts`). */

export interface ArbitraryAllowed {
  readonly value: string
  readonly reason: string
}

export interface UiRule {
  readonly selector: string
  readonly message: string
}

export declare const ARBITRARY_ALLOWED: readonly ArbitraryAllowed[]
export declare const UI_RULES: readonly UiRule[]
export declare const UI_FILES: readonly string[]
export declare const UI_IGNORES: readonly string[]
export declare const UI_HEREDADOS: readonly string[]

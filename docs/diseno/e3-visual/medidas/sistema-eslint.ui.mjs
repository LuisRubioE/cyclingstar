import tsParser from '/tmp/claude-0/-home-user-cyclingstar/47687d53-4f57-510b-bd22-ec77a69f1ecc/scratchpad/repo/node_modules/.pnpm/@typescript-eslint+parser@8.65.0_eslint@9.39.5_jiti@2.7.0__typescript@5.9.3/node_modules/@typescript-eslint/parser/dist/index.js'
const PALETA =
  '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)'
const COLOR = new RegExp(
  '(?:^|\\s|:)(?:text|bg|border|ring|divide|from|to|via|fill|stroke|outline|decoration|placeholder)-' +
    PALETA +
    '-\\d{2,3}',
)
const ARBITRARIO = /(?:^|\s|:)-?[a-z][a-z0-9-]*-\[[^\]\s]+\]/
const HEX = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?(?:[0-9a-fA-F]{2})?$/
export default [
  {
    files: ['apps/web/src/**/*.tsx'],
    ignores: ['**/*.test.tsx', 'apps/web/src/ui/**'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message: 'ui/1 button: usa <Button> de ui/',
        },
        {
          selector: "JSXOpeningElement[name.name='table']",
          message: 'ui/2 table: usa <DataTable> de ui/',
        },
        {
          selector: 'JSXOpeningElement[name.name=/^(input|select|textarea)$/]',
          message: 'ui/3 campo: usa <Field> de ui/',
        },
        {
          selector: "JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name='title']",
          message: 'ui/4 title: nada vive solo en un title',
        },
        {
          selector: 'JSXText[value=/Loading…|Could not load|Could not reach/]',
          message: 'ui/5 estado a mano: usa <QueryView>',
        },
        {
          selector: 'Literal[value=/^(Loading…|Could not load|Could not reach)/]',
          message: 'ui/5 estado a mano: usa <QueryView>',
        },
        {
          selector: 'Literal[value=' + COLOR + ']',
          message: 'ui/6 color de la paleta de Tailwind: usa un token',
        },
        {
          selector: 'TemplateElement[value.raw=' + COLOR + ']',
          message: 'ui/6 color de la paleta de Tailwind: usa un token',
        },
        { selector: 'Literal[value=' + ARBITRARIO + ']', message: 'ui/7 valor arbitrario' },
        {
          selector: 'TemplateElement[value.raw=' + ARBITRARIO + ']',
          message: 'ui/7 valor arbitrario',
        },
        { selector: 'Literal[value=' + HEX + ']', message: 'ui/8 hexadecimal en un componente' },
        { selector: "JSXAttribute[name.name='style']", message: 'ui/9 style en línea' },
        {
          selector: 'JSXText[value=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u]',
          message: 'ui/10 emoji en la interfaz',
        },
        {
          selector: 'Literal[value=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u]',
          message: 'ui/10 emoji en la interfaz',
        },
      ],
    },
  },
]

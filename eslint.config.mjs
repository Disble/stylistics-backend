import js from "@eslint/js";
import checkFile from "eslint-plugin-check-file";
import importX from "eslint-plugin-import-x";
import jsdoc from "eslint-plugin-jsdoc";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import tseslint from "typescript-eslint";

const SELECTORS = {
  exportedType: {
    selector:
      "ExportNamedDeclaration > TSInterfaceDeclaration, ExportNamedDeclaration > TSTypeAliasDeclaration, ExportNamedDeclaration > TSEnumDeclaration",
    message:
      "Exported types/interfaces/enums belong in a sibling *.types.ts file so implementation modules do not become mixed-responsibility files.",
  },
  screamingConstant: {
    selector:
      "ExportNamedDeclaration > VariableDeclaration[kind='const'] > VariableDeclarator[id.name=/^[A-Z0-9_]+$/]",
    message:
      "Exported SCREAMING_CASE constants belong in *.constants.ts (or src/mastra/constants/ for shared runtime configuration).",
  },
  inlineAgentPrompt: {
    selector:
      "NewExpression[callee.name='Agent'] > ObjectExpression > Property[key.name='instructions'] > TemplateLiteral",
    message:
      "Inline prompt template literals belong in a sibling *.prompt.ts file. The agent runtime file should import the exported instructions constant.",
  },
  exportedZodSchema: {
    selector:
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > CallExpression[callee.object.name='z']",
    message:
      "Exported zod schemas belong in a sibling *.schemas.ts file. Type aliases via z.infer<...> stay in *.types.ts.",
  },
};

function anatomyRule(...selectors) {
  return { "no-restricted-syntax": ["warn", ...selectors] };
}

function buildAnatomyRules() {
  const all = [
    SELECTORS.exportedType,
    SELECTORS.screamingConstant,
    SELECTORS.inlineAgentPrompt,
    SELECTORS.exportedZodSchema,
  ];
  return [
    {
      files: ["src/**/*.ts"],
      ignores: [
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/*.types.ts",
        "src/**/*.constants.ts",
        "src/**/*.prompt.ts",
        "src/**/*.skill.ts",
        "src/**/*.schemas.ts",
        "src/mastra/constants/**",
      ],
      rules: anatomyRule(...all),
    },
    {
      files: ["src/**/*.types.ts"],
      rules: anatomyRule(
        SELECTORS.screamingConstant,
        SELECTORS.inlineAgentPrompt,
      ),
    },
    {
      files: ["src/**/*.constants.ts", "src/mastra/constants/**/*.ts"],
      rules: anatomyRule(
        SELECTORS.exportedType,
        SELECTORS.inlineAgentPrompt,
        SELECTORS.exportedZodSchema,
      ),
    },
    {
      files: ["src/**/*.prompt.ts", "src/**/*.skill.ts"],
      rules: anatomyRule(
        SELECTORS.exportedType,
        SELECTORS.inlineAgentPrompt,
        SELECTORS.exportedZodSchema,
      ),
    },
    {
      files: ["src/**/*.schemas.ts"],
      rules: anatomyRule(
        SELECTORS.exportedType,
        SELECTORS.screamingConstant,
        SELECTORS.inlineAgentPrompt,
      ),
    },
  ];
}

export default [
  {
    ignores: [
      "node_modules/**",
      ".mastra/**",
      "dist/**",
      "coverage/**",
      "**/*.d.ts",
      "bun.lock",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  {
    files: ["**/*.{ts,mts,cts,js,mjs,cjs}"],
    plugins: {
      jsdoc,
      sonarjs,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
      parser: tseslint.parser,
    },
    settings: {
      "import-x/resolver-next": [],
    },
    rules: {
      "no-redeclare": "off",
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": ["error", { maxDepth: 1 }],
      "import-x/no-unresolved": "off",
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-all-duplicated-branches": "warn",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-redundant-boolean": "warn",
      "sonarjs/no-small-switch": "warn",
      "jsdoc/check-tag-names": "error",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-description": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    rules: {
      "sonarjs/cognitive-complexity": "off",
    },
  },
  ...buildAnatomyRules(),
  {
    files: ["src/**/*.helpers.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@mastra/*"],
              message:
                "*.helpers.ts must stay framework-free; do not import Mastra packages inside helpers.",
            },
            {
              group: ["better-auth", "better-auth/*"],
              message:
                "*.helpers.ts must stay framework-free; do not import Better Auth.",
            },
            {
              group: ["drizzle-orm", "drizzle-orm/*"],
              message:
                "*.helpers.ts must stay framework-free; do not import Drizzle.",
            },
            {
              group: ["pg"],
              message:
                "*.helpers.ts must stay framework-free; do not import pg.",
            },
            {
              group: ["pino"],
              message:
                "*.helpers.ts must stay framework-free; do not import pino.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,mts,cts}", "scripts/**/*.{js,mjs,cjs}"],
    plugins: {
      "check-file": checkFile,
    },
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "**/*.{js,mjs,cjs,ts,mts,cts}": "KEBAB_CASE",
        },
        {
          ignoreMiddleExtensions: true,
        },
      ],
      "check-file/folder-naming-convention": [
        "error",
        {
          "src/**/": "KEBAB_CASE",
        },
      ],
      "check-file/filename-blocklist": [
        "error",
        {
          "src/**/utils.ts": "*.helpers.ts",
          "src/**/Utils.ts": "*.helpers.ts",
        },
      ],
    },
  },
];

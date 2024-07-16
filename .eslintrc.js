module.exports = {
  root: true,
  env: {
    node: true,
    es6: true,
  },
  overrides: [
    {
      files: ['src/**/*.ts'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        project: 'tsconfig.eslint.json',
        sourceType: 'module',
      },
      plugins: ['prettier', 'import'],
      rules: {
        'prettier/prettier': 'error',
        'import/order': [
          'error',
          {
            'newlines-between': 'always-and-inside-groups',
            alphabetize: { order: 'asc', caseInsensitive: true },
          },
        ],
      },
    },
  ],
};

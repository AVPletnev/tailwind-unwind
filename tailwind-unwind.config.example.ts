const config = {
  include: ['src/**/*.tsx', 'src/**/*.jsx'],
  exclude: ['**/*.test.tsx', '**/*.stories.tsx'],
  names: {
    'flex items-center justify-between p-4': 'page-header',
  },
  analyze: {
    minOccurrences: 5,
    top: 10,
  },
  generate: {
    minOccurrences: 3,
    prefix: 'twu-',
    output: 'src/styles/components.css',
    extractableOnly: true,
  },
  apply: {
    output: 'src/styles/components.css',
    prettier: true,
    extractableOnly: true,
  },
} as const;

export default config;

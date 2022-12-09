export default {
  coveragePathIgnorePatterns: ['node_modules', 'src/types.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: ['<rootDir>'],
  testRegex: '/__tests__/.*\\.(ts|tsx|js)$',
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  verbose: true,
};

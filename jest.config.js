export default {
  coveragePathIgnorePatterns: ['node_modules', 'src/types.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  roots: ['<rootDir>'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/__utils__/'],
  testRegex: '/__tests__/.*\\.(ts|tsx|js)$',
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  verbose: true,
};

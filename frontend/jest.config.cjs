const nextJest = require('next/jest.js')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Enhanced Jest configuration
const config = {
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/mocks/tauri.mock.ts',
    '<rootDir>/src/__tests__/mocks/ipcClient.mock.ts',
  ],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/.next/',
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/mocks/',
  ],
  
  // Coverage configuration
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/**/*.stories.{ts,tsx}',
  ],
  
  // Transform configurations
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Module name mapping
  moduleNameMapper: {
    '^uuid$': '<rootDir>/src/__tests__/mocks/uuidMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|webp|avif|svg|ico|bmp)$': '<rootDir>/src/__tests__/mocks/fileMock.ts',
  },

  // ESM packages to transform
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@radix-ui|@hello-pangea/dnd|cmdk|@tanstack|lucide-react|react-day-picker|sonner|date-fns|uuid)/)'
  ],
  
  // Global setup
  // globalSetup: '<rootDir>/src/__tests__/globalSetup.cjs',
  
  // Test timeout
  testTimeout: 10000,

  // Limit workers to reduce memory pressure in CI/local runs
  maxWorkers: 1,
  workerIdleMemoryLimit: 512 * 1024 * 1024,
  
  // Verbose output
  verbose: process.env.NODE_ENV === 'development',
  
  // Mock configurations
  clearMocks: true,
  restoreMocks: true,
  
};

module.exports = createJestConfig(config);

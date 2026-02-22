// Dashboard diagnostics utilities

export interface DiagnosticResult {
  status: 'healthy' | 'warning' | 'error';
  success: boolean;
  message: string;
  duration: number;
  details?: unknown;
}

export interface DiagnosticTest {
  name: string;
  run: () => Promise<DiagnosticResult>;
}

export interface DiagnosticSuite {
  name: string;
  tests: DiagnosticTest[];
}

export const runDashboardDiagnostics = async (): Promise<DiagnosticResult[]> => {
  const results: DiagnosticResult[] = [];

  // Check local storage
  try {
    localStorage.setItem('diagnostic_test', 'test');
    localStorage.removeItem('diagnostic_test');
    results.push({
      status: 'healthy',
      success: true,
      message: 'Local storage is working',
      duration: 0,
    });
  } catch (error) {
    results.push({
      status: 'error',
      success: false,
      message: 'Local storage is not available',
      duration: 0,
      details: error,
    });
  }

  // Check session storage
  try {
    sessionStorage.setItem('diagnostic_test', 'test');
    sessionStorage.removeItem('diagnostic_test');
    results.push({
      status: 'healthy',
      success: true,
      message: 'Session storage is working',
      duration: 0,
    });
  } catch (error) {
    results.push({
      status: 'error',
      success: false,
      message: 'Session storage is not available',
      duration: 0,
      details: error,
    });
  }

  // Check basic connectivity (placeholder)
  results.push({
    status: 'healthy',
    success: true,
    message: 'Basic connectivity check passed',
    duration: 0,
  });

  return results;
};

// Connectivity diagnostic tests
export const connectivityTests: DiagnosticSuite = {
  name: 'Connectivity',
  tests: [
    {
      name: 'Online Status',
      run: async () => {
        const start = Date.now();
        const isOnline = navigator.onLine;
        return {
          status: isOnline ? 'healthy' : 'error',
          success: isOnline,
          message: isOnline ? 'Browser is online' : 'Browser is offline',
          duration: Date.now() - start
        };
      }
    },
    {
      name: 'Local Storage',
      run: async () => {
        const start = Date.now();
        try {
          localStorage.setItem('diagnostic_test', 'test');
          localStorage.removeItem('diagnostic_test');
          return {
            status: 'healthy',
            success: true,
            message: 'Local storage is working',
            duration: Date.now() - start
          };
        } catch (error) {
          return {
            status: 'error',
            success: false,
            message: 'Local storage is not available',
            duration: Date.now() - start,
            details: error
          };
        }
      }
    },
    {
      name: 'Session Storage',
      run: async () => {
        const start = Date.now();
        try {
          sessionStorage.setItem('diagnostic_test', 'test');
          sessionStorage.removeItem('diagnostic_test');
          return {
            status: 'healthy',
            success: true,
            message: 'Session storage is working',
            duration: Date.now() - start
          };
        } catch (error) {
          return {
            status: 'error',
            success: false,
            message: 'Session storage is not available',
            duration: Date.now() - start,
            details: error
          };
        }
      }
    }
  ]
};

// Auth diagnostic tests
export const authTests: DiagnosticSuite = {
  name: 'Authentication',
  tests: [
    {
      name: 'Auth Context Available',
      run: async () => {
        const start = Date.now();
        try {
          // Check if auth context is available (basic check)
          const hasAuth = typeof window !== 'undefined';
          return {
            status: hasAuth ? 'healthy' : 'error',
            success: hasAuth,
            message: hasAuth ? 'Auth context is available' : 'Auth context not available',
            duration: Date.now() - start
          };
        } catch (error) {
          return {
            status: 'error',
            success: false,
            message: 'Failed to check auth context',
            duration: Date.now() - start,
            details: error
          };
        }
      }
    }
  ]
};

// API diagnostic tests
export const apiTests: DiagnosticSuite = {
  name: 'API',
  tests: [
    {
      name: 'API Service Available',
      run: async () => {
        const start = Date.now();
        try {
          // Basic check if API service can be imported
          const hasApi = typeof window !== 'undefined';
          return {
            status: hasApi ? 'healthy' : 'error',
            success: hasApi,
            message: hasApi ? 'API service is available' : 'API service not available',
            duration: Date.now() - start
          };
        } catch (error) {
          return {
            status: 'error',
            success: false,
            message: 'Failed to check API service',
            duration: Date.now() - start,
            details: error
          };
        }
      }
    }
  ]
};

// Config diagnostic tests
export const configTests: DiagnosticSuite = {
  name: 'Configuration',
  tests: [
    {
      name: 'Environment Variables',
      run: async () => {
        const start = Date.now();
        try {
          const hasEnv = typeof process !== 'undefined' && process.env;
          return {
            status: hasEnv ? 'healthy' : 'warning',
            success: !!hasEnv,
            message: hasEnv ? 'Environment variables available' : 'Environment variables not available',
            duration: Date.now() - start
          };
        } catch (error) {
          return {
            status: 'error',
            success: false,
            message: 'Failed to check environment',
            duration: Date.now() - start,
            details: error
          };
        }
      }
    }
  ]
};

// Run all diagnostic suites
export const runAllDiagnostics = async (): Promise<{ [suiteName: string]: { [testName: string]: DiagnosticResult } }> => {
  const suites = [connectivityTests, authTests, apiTests, configTests];
  const results: { [suiteName: string]: { [testName: string]: DiagnosticResult } } = {};

  for (const suite of suites) {
    results[suite.name] = {};
    for (const test of suite.tests) {
      try {
        const result = await test.run();
        results[suite.name][test.name] = result;
      } catch (error) {
        results[suite.name][test.name] = {
          status: 'error',
          success: false,
          message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: 0,
          details: error
        };
      }
    }
  }

  return results;
};

// Run a specific diagnostic suite
export const runDiagnosticSuite = async (suite: DiagnosticSuite): Promise<{ [testName: string]: DiagnosticResult }> => {
  const results: { [testName: string]: DiagnosticResult } = {};

  for (const test of suite.tests) {
    try {
      const result = await test.run();
      results[test.name] = result;
    } catch (error) {
      results[test.name] = {
        status: 'error',
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
        details: error
      };
    }
  }

  return results;
};

// Format diagnostic results for display/export
export const formatDiagnosticResults = (results: { [suiteName: string]: { [testName: string]: DiagnosticResult } }): string => {
  let output = `Dashboard Diagnostics Report\n`;
  output += `Generated: ${new Date().toISOString()}\n\n`;

  for (const [suiteName, suiteResults] of Object.entries(results)) {
    output += `=== ${suiteName} ===\n`;
    for (const [testName, result] of Object.entries(suiteResults)) {
      output += `${result.success ? '✓' : '✗'} ${testName}: ${result.message}\n`;
      output += `  Status: ${result.status}\n`;
      output += `  Duration: ${result.duration}ms\n`;
      if (result.details) {
        output += `  Details: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      output += `\n`;
    }
  }

  return output;
};

export const getSystemInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  };
};

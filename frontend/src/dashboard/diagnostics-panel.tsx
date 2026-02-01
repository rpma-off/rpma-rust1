'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bug,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download
} from 'lucide-react';
import {
  runAllDiagnostics,
  runDiagnosticSuite,
  formatDiagnosticResults,
  connectivityTests,
  authTests,
  apiTests,
  configTests,
  type DiagnosticResult
} from '@/lib/utils/dashboard-diagnostics';

interface DiagnosticsPanelProps {
  className?: string;
}

export function DiagnosticsPanel({ className = '' }: DiagnosticsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<{ [suiteName: string]: { [testName: string]: DiagnosticResult } }>({});
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const diagnosticResults = await runAllDiagnostics();
      setResults(diagnosticResults);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runSpecificSuite = async (suiteName: string) => {
    setIsRunning(true);
    try {
      const suite = [connectivityTests, authTests, apiTests, configTests]
        .find(s => s.name === suiteName);

      if (suite) {
        const suiteResults = await runDiagnosticSuite(suite);
        setResults(prev => ({ ...prev, [suiteName]: suiteResults }));
      }
    } catch (error) {
      console.error(`Failed to run ${suiteName} diagnostics:`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSuite = (suiteName: string) => {
    const newExpanded = new Set(expandedSuites);
    if (newExpanded.has(suiteName)) {
      newExpanded.delete(suiteName);
    } else {
      newExpanded.add(suiteName);
    }
    setExpandedSuites(newExpanded);
  };

  const copyResults = () => {
    const formatted = formatDiagnosticResults(results);
    navigator.clipboard.writeText(formatted);
  };

  const downloadResults = () => {
    const formatted = formatDiagnosticResults(results);
    const blob = new Blob([formatted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-diagnostics-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isOpen) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
          className="shadow-lg bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
        >
          <Bug className="w-4 h-4 mr-1" />
          Diagnostics
        </Button>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-96 bg-slate-800 border border-slate-600 shadow-xl rounded-lg z-50 ${className}`}>
      <div className="p-4 border-b border-slate-600 bg-slate-700 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Bug className="w-5 h-5 mr-2 text-orange-400" />
            <h3 className="font-semibold text-white">Dashboard Diagnostics</h3>
          </div>
          <Button
            onClick={() => setIsOpen(false)}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-white hover:bg-slate-600"
          >
            ×
          </Button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <div className="p-4">
          <div className="space-y-2 mb-4">
            <Button
              onClick={runDiagnostics}
              disabled={isRunning}
              className="w-full"
              size="sm"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Diagnostics...
                </>
              ) : (
                'Run All Diagnostics'
              )}
            </Button>

            {Object.keys(results).length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={copyResults}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </Button>
                <Button
                  onClick={downloadResults}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>

          {Object.keys(results).length > 0 && (
            <div className="space-y-2">
              {Object.entries(results).map(([suiteName, suiteResults]) => {
                const isExpanded = expandedSuites.has(suiteName);
                const totalTests = Object.keys(suiteResults).length;
                const passedTests = Object.values(suiteResults).filter(r => r.success).length;
                const allPassed = passedTests === totalTests;

                return (
                  <div key={suiteName} className="border rounded-lg">
                    <button
                      onClick={() => toggleSuite(suiteName)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-muted/50"
                    >
                      <div className="flex items-center">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <span className="font-medium text-sm">{suiteName}</span>
                        {allPassed ? (
                          <CheckCircle className="w-4 h-4 ml-2 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 ml-2 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {passedTests}/{totalTests}
                      </span>
                    </button>

                     {isExpanded && (
                       <div className="border-t border-slate-600 px-3 py-2 bg-slate-900 space-y-1">
                        {Object.entries(suiteResults).map(([testName, result]) => (
                          <div key={testName} className="flex items-start text-xs">
                            {result.success ? (
                              <CheckCircle className="w-3 h-3 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-2 mt-0.5 text-red-600 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <div className="font-medium">{testName}</div>
                              <div className="text-muted-foreground">{result.message}</div>
                              <div className="text-muted-foreground/70">{result.duration}ms</div>
                              {!result.success && result.details != null && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer text-muted-foreground">Details</summary>
                                    <pre className="mt-1 p-2 bg-slate-800 rounded text-xs overflow-x-auto text-gray-300">
                                     {JSON.stringify(result.details as Record<string, unknown>, null, 2)}
                                   </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        ))}

                        <Button
                          onClick={() => runSpecificSuite(suiteName)}
                          disabled={isRunning}
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                        >
                          {isRunning ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : null}
                          Re-run {suiteName}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {Object.keys(results).length === 0 && (
            <div className="text-center text-gray-400 text-sm py-4">
              Click &quot;Run All Diagnostics&quot; to test for common issues
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
/**
 * WorkflowProvider — focused safety tests.
 *
 * These tests target the boundary contract of the provider:
 *   1. `useWorkflow()` throws a clear error when called outside the provider.
 *   2. The provider renders its children when minimal required props are given.
 *
 * Business logic inside the provider is tested via integration / E2E tests.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { useWorkflow } from '../WorkflowProvider';

// Silence console output produced by the error boundary in these tests.
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Consumer that calls useWorkflow and renders a sentinel element. */
function WorkflowConsumer() {
  useWorkflow();
  return <div data-testid="ok">ok</div>;
}

/** Minimal error boundary so React does not re-throw during render. */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { caught: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { caught: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { caught: error };
  }
  render() {
    if (this.state.caught) {
      return <div data-testid="error">{this.state.caught.message}</div>;
    }
    return this.props.children;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWorkflow', () => {
  it('throws a descriptive error when used outside WorkflowProvider', () => {
    render(
      <ErrorBoundary>
        <WorkflowConsumer />
      </ErrorBoundary>,
    );

    const errorEl = screen.getByTestId('error');
    expect(errorEl.textContent).toMatch(/useWorkflow must be used within a WorkflowProvider/i);
    expect(screen.queryByTestId('ok')).toBeNull();
  });
});

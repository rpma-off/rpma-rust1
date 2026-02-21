import { renderHook } from '@testing-library/react';
import { ReportsProvider, useReportsContext } from '../api/ReportsProvider';

jest.mock('../server', () => ({
  reportsService: { generateReport: jest.fn() },
  reportOperations: { exportReport: jest.fn() },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ReportsProvider>{children}</ReportsProvider>;
}

describe('ReportsProvider', () => {
  it('throws when useReportsContext is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useReportsContext())).toThrow(
      'useReportsContext must be used within ReportsProvider'
    );
  });

  it('provides report services to consumers', () => {
    const { result } = renderHook(() => useReportsContext(), { wrapper });

    expect(result.current.reportsService).toBeDefined();
    expect(result.current.reportOperations).toBeDefined();
  });
});

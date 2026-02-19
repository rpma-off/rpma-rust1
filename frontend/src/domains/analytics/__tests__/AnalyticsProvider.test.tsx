import { renderHook } from '@testing-library/react';

jest.mock('@/domains/tasks', () => ({}));

import { useAnalyticsContext } from '../api';

describe('AnalyticsProvider', () => {
  it('throws when context hook is used outside provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAnalyticsContext());
    }).toThrow('useAnalyticsContext must be used within AnalyticsProvider');
  });
});

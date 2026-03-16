import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OnboardingData } from '@/lib/backend';
import { useCompleteOnboarding } from '../useOnboarding';
import { useUpdateOrganization } from '../useOrganization';

const mockUpdate = jest.fn();
const mockCompleteOnboarding = jest.fn();
const mockSignalMutation = jest.fn();
const onboardingPayload: OnboardingData = {
  organization: {
    name: 'RPMA',
    slug: 'rpma',
    legal_name: null,
    tax_id: null,
    siret: null,
    registration_number: null,
    email: null,
    phone: null,
    website: null,
    address_street: null,
    address_city: null,
    address_state: null,
    address_zip: null,
    address_country: null,
    industry: null,
    company_size: null,
  },
  admin_email: 'admin@example.com',
  admin_password: 'password-123',
  admin_first_name: 'Admin',
  admin_last_name: 'User',
};

jest.mock('@/lib/data-freshness', () => ({
  signalMutation: (domain: string) => mockSignalMutation(domain),
}));

jest.mock('@/lib/ipc/client', () => ({
  useIpcClient: () => ({
    organization: {
      update: mockUpdate,
      completeOnboarding: mockCompleteOnboarding,
    },
  }),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('organization mutation signaling', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockCompleteOnboarding.mockReset();
    mockSignalMutation.mockReset();
  });

  it('signals the organization domain after updating organization details', async () => {
    mockUpdate.mockResolvedValue({ id: 'org-1' });

    const { result } = renderHook(() => useUpdateOrganization('session-token'), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ company_name: 'RPMA' });
    });

    expect(mockSignalMutation).toHaveBeenCalledWith('organization');
  });

  it('signals the organization domain after completing onboarding', async () => {
    mockCompleteOnboarding.mockResolvedValue({ id: 'org-1' });

    const { result } = renderHook(() => useCompleteOnboarding(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(onboardingPayload);
    });

    expect(mockSignalMutation).toHaveBeenCalledWith('organization');
  });
});

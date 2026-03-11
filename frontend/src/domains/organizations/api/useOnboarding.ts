'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationIpc, type OnboardingData, type OnboardingStatus } from '../ipc/organization.ipc';

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: () => organizationIpc.getOnboardingStatus(),
    staleTime: 0,
    retry: false,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OnboardingData) => organizationIpc.completeOnboarding(data),
    onSuccess: (result) => {
      queryClient.setQueryData(['onboarding', 'status'], {
        completed: true,
        current_step: 0,
        has_organization: true,
        has_admin_user: true,
      } as OnboardingStatus);
      queryClient.setQueryData(['organization'], result);
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useNeedsOnboarding() {
  const { data: status, isLoading, isError } = useOnboardingStatus();

  return {
    isLoading,
    isError,
    needsOnboarding: !isLoading && !isError && status && !status.completed,
    status,
  };
}

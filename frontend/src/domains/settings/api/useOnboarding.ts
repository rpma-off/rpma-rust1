"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signalMutation } from "@/lib/data-freshness";
import { useIpcClient } from "@/lib/ipc/client";
import { onboardingKeys, organizationKeys } from "@/lib/query-keys";
import type { OnboardingData, OnboardingStatus } from "@/lib/backend";

export function useOnboardingStatus() {
  const ipcClient = useIpcClient();
  return useQuery({
    queryKey: onboardingKeys.status(),
    queryFn: () => ipcClient.organization.getOnboardingStatus(),
    staleTime: 5 * 60_000, // 5 min — completion sets cache directly via setQueryData in useCompleteOnboarding
    retry: false,
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const ipcClient = useIpcClient();

  return useMutation({
    mutationFn: (data: OnboardingData) =>
      ipcClient.organization.completeOnboarding(data),
    onSuccess: (result) => {
      queryClient.setQueryData(onboardingKeys.status(), {
        completed: true,
        current_step: 0,
        has_organization: true,
        has_admin_user: true,
      } as OnboardingStatus);
      queryClient.setQueryData(organizationKeys.all, result);
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      signalMutation("organization");
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

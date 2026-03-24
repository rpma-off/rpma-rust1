"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { signalMutation } from "@/lib/data-freshness";
import { useIpcClient } from "@/lib/ipc/client";
import { organizationKeys } from "@/lib/query-keys";
import type {
  UpdateOrganizationRequest,
  UpdateOrganizationSettingsRequest,
} from "@/lib/backend";

export function useOrganization(sessionToken: string | null) {
  const ipcClient = useIpcClient();
  return useQuery({
    queryKey: organizationKeys.all,
    queryFn: () => {
      if (!sessionToken) throw new Error("No session token");
      return ipcClient.organization.get(sessionToken);
    },
    enabled: !!sessionToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganization(sessionToken: string | null) {
  const queryClient = useQueryClient();
  const ipcClient = useIpcClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationRequest) => {
      if (!sessionToken) throw new Error("No session token");
      return ipcClient.organization.update(sessionToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      signalMutation("organization");
    },
  });
}

export function useUploadLogo(sessionToken: string | null) {
  const queryClient = useQueryClient();
  const ipcClient = useIpcClient();

  return useMutation({
    mutationFn: ({
      filePath,
      base64Data,
    }: {
      filePath?: string;
      base64Data?: string;
    }) => {
      if (!sessionToken) throw new Error("No session token");
      return ipcClient.organization.uploadLogo(
        sessionToken,
        filePath,
        base64Data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
      signalMutation("organization");
    },
  });
}

export function useOrganizationSettings(sessionToken: string | null) {
  const ipcClient = useIpcClient();
  return useQuery({
    queryKey: organizationKeys.settings(),
    queryFn: () => {
      if (!sessionToken) throw new Error("No session token");
      return ipcClient.organization.getSettings(sessionToken);
    },
    enabled: !!sessionToken,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateOrganizationSettings(sessionToken: string | null) {
  const queryClient = useQueryClient();
  const ipcClient = useIpcClient();

  return useMutation({
    mutationFn: (data: UpdateOrganizationSettingsRequest) => {
      if (!sessionToken) throw new Error("No session token");
      return ipcClient.organization.updateSettings(sessionToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.settings() });
      signalMutation("organization");
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationIpc } from '../ipc/organization.ipc';

export function useOrganization(sessionToken: string | null) {
  return useQuery({
    queryKey: ['organization'],
    queryFn: () => {
      if (!sessionToken) throw new Error('No session token');
      return organizationIpc.get(sessionToken);
    },
    enabled: !!sessionToken,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOrganization(sessionToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof organizationIpc.update>[1]) => {
      if (!sessionToken) throw new Error('No session token');
      return organizationIpc.update(sessionToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useUploadLogo(sessionToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ filePath, base64Data }: { filePath?: string; base64Data?: string }) => {
      if (!sessionToken) throw new Error('No session token');
      return organizationIpc.uploadLogo(sessionToken, filePath, base64Data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });
}

export function useOrganizationSettings(sessionToken: string | null) {
  return useQuery({
    queryKey: ['organization', 'settings'],
    queryFn: () => {
      if (!sessionToken) throw new Error('No session token');
      return organizationIpc.getSettings(sessionToken);
    },
    enabled: !!sessionToken,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpdateOrganizationSettings(sessionToken: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof organizationIpc.updateSettings>[1]) => {
      if (!sessionToken) throw new Error('No session token');
      return organizationIpc.updateSettings(sessionToken, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'settings'] });
    },
  });
}

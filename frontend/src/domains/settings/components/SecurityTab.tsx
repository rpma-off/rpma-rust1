import React, { useEffect } from 'react';
import type { UserSession } from '@/lib/backend';
import { useLogger } from '@/shared/hooks/useLogger';
import { useIpcClient } from '@/lib/ipc/client';

export interface SecurityTabProps {
  user: UserSession;
}

function useSecurityTabInit() {
  const logger = useLogger();
  const ipcClient = useIpcClient();

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.all([
          ipcClient.settings.getActiveSessions(),
          ipcClient.settings.getSessionTimeoutConfig(),
        ]);
      } catch (error) {
        logger.logError('Failed to fetch security settings', error);
      }
    };

    init();
  }, [ipcClient, logger]);
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ user }) => {
  useSecurityTabInit();

  return (
    <div data-testid="security-tab">
      <h2>Security Settings</h2>
      <p>User: {user.user_id}</p>
    </div>
  );
};

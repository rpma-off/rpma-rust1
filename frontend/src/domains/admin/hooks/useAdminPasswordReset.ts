import { useCallback, useState } from 'react';
import { userIpc } from '@/domains/users/ipc/users.ipc';

export function useAdminPasswordReset() {
  const [isResetting, setIsResetting] = useState(false);

  const resetPassword = useCallback(async (userId: string) => {
    setIsResetting(true);
    try {
      return await userIpc.adminResetPassword(userId);
    } finally {
      setIsResetting(false);
    }
  }, []);

  return {
    isResetting,
    resetPassword,
  };
}

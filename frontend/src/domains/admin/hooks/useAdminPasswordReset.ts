import { useCallback, useState } from "react";
import { useUserActions } from "@/domains/users/api/useUserActions";

export function useAdminPasswordReset() {
  const [isResetting, setIsResetting] = useState(false);
  const { adminResetPassword } = useUserActions();

  const resetPassword = useCallback(async (userId: string) => {
    setIsResetting(true);
    try {
      return await adminResetPassword(userId);
    } finally {
      setIsResetting(false);
    }
  }, []);

  return {
    isResetting,
    resetPassword,
  };
}

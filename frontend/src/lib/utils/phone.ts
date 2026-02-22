import { safeInvoke } from '@/lib/ipc/core';
import { IPC_COMMANDS } from '@/lib/ipc/commands';

export const phone = {
  initiateCustomerCall: (phoneNumber: string): Promise<void> =>
    safeInvoke<void>(IPC_COMMANDS.UI_INITIATE_CUSTOMER_CALL, {
      phone_number: phoneNumber
    }),
};

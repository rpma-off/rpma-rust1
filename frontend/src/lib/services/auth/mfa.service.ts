/**
 * Multi-Factor Authentication Service
 */

import { ipcClient } from '@/lib/ipc';

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TOTPSetupResponse {
  success: boolean;
  qrCode?: string;
  secret?: string;
  factorId?: string;
  error?: string;
}

export interface TOTPVerifyResponse {
  success: boolean;
  error?: string;
}

export interface MFAVerificationRequest {
  code: string;
  rememberDevice?: boolean;
}

export class MFAService {
  private static instance: MFAService;

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  async setupMFA(sessionToken: string): Promise<MFASetupResponse> {
    try {
      const result = await ipcClient.auth.enable2FA(sessionToken);
      return {
        secret: (result as any).secret,
        qrCodeUrl: (result as any).qr_code_url,
        backupCodes: (result as any).backup_codes,
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to setup MFA');
    }
  }

  async verifyMFA(request: MFAVerificationRequest, sessionToken: string): Promise<boolean> {
    try {
      await ipcClient.auth.verify2FASetup(request.code, sessionToken);
      return true;
    } catch (error) {
      return false;
    }
  }

  async disableMFA(sessionToken: string): Promise<void> {
    try {
      await ipcClient.auth.disable2FA(sessionToken);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to disable MFA');
    }
  }

  async regenerateBackupCodes(sessionToken: string): Promise<string[]> {
    try {
      const result = await ipcClient.auth.regenerateBackupCodes(sessionToken);
      return (result as any).backup_codes;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to regenerate backup codes');
    }
  }

  async setupTOTP(sessionToken: string): Promise<TOTPSetupResponse> {
    try {
      const result = await ipcClient.auth.enable2FA(sessionToken);
      return {
        success: true,
        qrCode: (result as any).qr_code_url,
        secret: (result as any).secret,
        factorId: 'totp', // Default factor ID for TOTP
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup TOTP',
      };
    }
  }

  async verifyTOTP(factorId: string, code: string, sessionToken: string): Promise<TOTPVerifyResponse> {
    try {
      const result = await this.verifyMFA({ code }, sessionToken);
      return { success: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  async generateRecoveryCodes(sessionToken: string): Promise<string[]> {
    return this.regenerateBackupCodes(sessionToken);
  }
}

export const mfaService = MFAService.getInstance();
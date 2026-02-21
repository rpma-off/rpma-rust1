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

interface MFASetupPayload {
  secret?: string;
  qr_code_url?: string;
  backup_codes?: string[];
}

function isMFASetupPayload(value: unknown): value is MFASetupPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractMFASetupPayload(value: unknown): MFASetupPayload {
  return isMFASetupPayload(value) ? value : {};
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
      const payload = extractMFASetupPayload(result);
      return {
        secret: payload.secret ?? '',
        qrCodeUrl: payload.qr_code_url ?? '',
        backupCodes: payload.backup_codes ?? [],
      };
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to setup MFA');
    }
  }

  async verifyMFA(request: MFAVerificationRequest, sessionToken: string): Promise<boolean> {
    try {
      await ipcClient.auth.verify2FASetup(request.code, [], sessionToken);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async disableMFA(sessionToken: string, password: string): Promise<void> {
    try {
      await ipcClient.auth.disable2FA(password, sessionToken);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to disable MFA');
    }
  }

  async regenerateBackupCodes(sessionToken: string): Promise<string[]> {
    try {
      const result = await ipcClient.auth.regenerateBackupCodes(sessionToken);
      const payload = extractMFASetupPayload(result);
      return payload.backup_codes ?? [];
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to regenerate backup codes');
    }
  }

  async setupTOTP(sessionToken: string): Promise<TOTPSetupResponse> {
    try {
      const result = await ipcClient.auth.enable2FA(sessionToken);
      const payload = extractMFASetupPayload(result);
      return {
        success: true,
        qrCode: payload.qr_code_url,
        secret: payload.secret,
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

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { mfaService } from '@/lib/services/auth/mfa.service';
import { useTranslation } from '@/hooks/useTranslation';

interface TOTPSetupProps {
  sessionToken: string;
  onSetupComplete?: (success: boolean) => void;
}

const TOTPSetup: React.FC<TOTPSetupProps> = ({ sessionToken, onSetupComplete }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  // Start the TOTP setup process
  useEffect(() => {
    const setupTOTP = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await mfaService.setupTOTP(sessionToken);

        if (result.success && result.qrCode && result.secret && result.factorId) {
          setQrCode(result.qrCode);
          setSecret(result.secret);
          setFactorId(result.factorId);
        } else {
          setError(result.error || 'Failed to setup authenticator');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    setupTOTP();
  }, [sessionToken]);

  // Verify the TOTP code
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    try {
      if (!code) {
        setError('Please enter the code from your authenticator app');
        setVerifying(false);
        return;
      }

      if (!factorId) {
        setError('Setup not complete. Please try again.');
        setVerifying(false);
        return;
      }

      const result = await mfaService.verifyTOTP(factorId, code, sessionToken);

      if (result.success) {
        // Generate recovery codes
        const codes = await mfaService.generateRecoveryCodes(sessionToken);
        setRecoveryCodes(codes);
        setSetupComplete(true);
        if (onSetupComplete) {
          onSetupComplete(true);
        }
      } else {
        setError(result.error || 'Invalid code. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  if (setupComplete && recoveryCodes.length > 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">{t('auth.twoFactorEnabled')}</h2>
        <p className="mb-4 text-green-600">
          {t('auth.twoFactorEnabledDesc')}
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">{t('auth.recoveryCodes')}</h3>
          <p className="text-sm text-gray-600 mb-3">
            {t('auth.recoveryCodesDesc')}
          </p>

          <div className="bg-gray-100 p-4 rounded-md font-mono text-sm mb-3">
            {recoveryCodes.map((code, index) => (
              <div key={index} className="mb-1">
                {code}
              </div>
            ))}
          </div>

          <button
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => {
              navigator.clipboard.writeText(recoveryCodes.join('\n'));
              toast.success('Codes de récupération copiés dans le presse-papiers');
            }}
          >
            {t('auth.copyCodesToClipboard')}
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Important :</strong> {t('auth.importantWithoutAuth')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">{t('auth.setupTwoFactor')}</h2>
      <p className="mb-6 text-gray-600">
        {t('auth.setupTwoFactorDesc')}
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">{t('auth.step1ScanQR')}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {t('auth.step1ScanQRDesc')}
            </p>

            {qrCode && (
              <div className="flex justify-center mb-4">
                <div className="p-2 bg-white border rounded-md inline-block">
                  <Image
                    src={qrCode}
                    alt={t('auth.qrCodeAlt')}
                    width={200}
                    height={200}
                    priority
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => setShowManualEntry(!showManualEntry)}
            >
              {showManualEntry ? t('auth.hideManualEntry') : t('auth.cantScanCode')}
            </button>

            {showManualEntry && secret && (
              <div className="mt-3 p-3 bg-gray-100 rounded-md">
                <p className="text-sm mb-1 font-medium">{t('auth.manualEntryCode')}</p>
                <p className="font-mono text-sm break-all">{secret}</p>
                <button
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    toast.success('Code secret copié dans le presse-papiers');
                  }}
                >
                  {t('auth.copyToClipboard')}
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleVerify}>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">{t('auth.step2EnterCode')}</h3>
              <p className="text-sm text-gray-600 mb-3">
                {t('auth.step2EnterCodeDesc')}
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={6}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('auth.enter6DigitCode')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={verifying || code.length !== 6}
                >
                  {verifying ? t('auth.verifying') : t('auth.verify')}
                </button>
              </div>
              {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default TOTPSetup;

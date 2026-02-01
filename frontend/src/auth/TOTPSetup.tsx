'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { mfaService } from '@/lib/services/auth/mfa.service';

interface TOTPSetupProps {
  sessionToken: string;
  onSetupComplete?: (success: boolean) => void;
}

const TOTPSetup: React.FC<TOTPSetupProps> = ({ sessionToken, onSetupComplete }) => {
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
  }, []);

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
        <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication Enabled</h2>
        <p className="mb-4 text-green-600">
          Two-factor authentication has been successfully enabled for your account.
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Recovery Codes</h3>
          <p className="text-sm text-gray-600 mb-3">
            Please save these recovery codes in a secure location. If you lose access to your
            authenticator app, you can use one of these codes to sign in.
            Each code can only be used once.
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
              // Copy to clipboard
              navigator.clipboard.writeText(recoveryCodes.join('\n'));
              alert('Recovery codes copied to clipboard');
            }}
          >
            Copy codes to clipboard
          </button>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          <p>
            <strong>Important:</strong> Without your authenticator app or recovery codes,
            you will lose access to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Set Up Two-Factor Authentication</h2>
      <p className="mb-6 text-gray-600">
        Two-factor authentication adds an extra layer of security to your account.
        You&apos;ll need an authenticator app like Google Authenticator, Microsoft Authenticator, or Authy.
      </p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Step 1: Scan QR Code</h3>
            <p className="text-sm text-gray-600 mb-3">
              Open your authenticator app and scan the QR code below.
            </p>

            {qrCode && (
              <div className="flex justify-center mb-4">
                <div className="p-2 bg-white border rounded-md inline-block">
                  <Image
                    src={qrCode}
                    alt="QR Code for authenticator app"
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
              {showManualEntry ? "Hide manual entry" : "Can't scan the code?"}
            </button>

            {showManualEntry && secret && (
              <div className="mt-3 p-3 bg-gray-100 rounded-md">
                <p className="text-sm mb-1 font-medium">Manual entry code:</p>
                <p className="font-mono text-sm break-all">{secret}</p>
                <button
                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    alert('Secret code copied to clipboard');
                  }}
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleVerify}>
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Step 2: Enter Code</h3>
              <p className="text-sm text-gray-600 mb-3">
                Enter the 6-digit code from your authenticator app.
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  maxLength={6}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  disabled={verifying || code.length !== 6}
                >
                  {verifying ? 'Verifying...' : 'Verify'}
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

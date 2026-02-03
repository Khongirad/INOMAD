'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/hooks/use-wallet';

interface MigrationWizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

type WizardStep = 'intro' | 'verify-password' | 'set-pin' | 'migrating' | 'guardians' | 'complete';

export function MigrationWizard({ onComplete, onCancel }: MigrationWizardProps) {
  const wallet = useWallet();
  const [step, setStep] = useState<WizardStep>('intro');
  const [oldPassword, setOldPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePasswordVerify = async () => {
    if (!oldPassword) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Verify password works by attempting to unlock
      await wallet.legacy.unlock(oldPassword);
      wallet.legacy.lock(); // Lock it back
      setStep('set-pin');
    } catch (e: any) {
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = () => {
    if (!newPin || newPin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setError(null);
    setStep('migrating');
    performMigration();
  };

  const performMigration = async () => {
    setLoading(true);

    try {
      await wallet.startMigration(oldPassword, newPin);
      
      // Clear sensitive data
      setOldPassword('');
      setNewPin('');
      setConfirmPin('');
      
      setStep('guardians');
    } catch (e: any) {
      setError(`Migration failed: ${e.message}`);
      setStep('verify-password');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipGuardians = () => {
    setStep('complete');
  };

  const handleComplete = () => {
    onComplete?.();
  };

  // Intro Step
  if (step === 'intro') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-4">Upgrade to MPC Wallet</h2>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800 font-medium mb-2">⚠️ Legacy Wallet Detected</p>
            <p className="text-sm text-amber-700">
              Your wallet uses legacy encryption. We recommend upgrading to our new MPC wallet system.
            </p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Social Recovery</p>
                <p className="text-sm text-gray-600">Recover your wallet via Arban guardians</p>
              </div>
            </div>

            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">No Single Point of Failure</p>
                <p className="text-sm text-gray-600">Your key is split between device and server</p>
              </div>
            </div>

            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Enhanced PIN Security</p>
                <p className="text-sm text-gray-600">PBKDF2 with 100,000 iterations</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onCancel?.()}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Maybe Later
            </button>
            <button
              onClick={() => setStep('verify-password')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Migrate Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Verify Password Step
  if (step === 'verify-password') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold mb-4">Verify Your Password</h2>
          <p className="text-gray-600 mb-6">
            Enter your current wallet password to export your private key for migration.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('intro')}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Back
            </button>
            <button
              onClick={handlePasswordVerify}
              disabled={loading || !oldPassword}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Set PIN Step
  if (step === 'set-pin') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold mb-4">Set Your New PIN</h2>
          <p className="text-gray-600 mb-6">
            Choose a secure PIN for your new MPC wallet. We recommend at least 6 digits.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your PIN"
                maxLength={6}
              />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-800">
              ℹ️ This PIN will be used to encrypt your device share with PBKDF2 (100,000 iterations)
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('verify-password')}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleSetPin}
              disabled={!newPin || !confirmPin}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Migration
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Migrating Step
  if (step === 'migrating') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-bold mb-4">Migrating Your Wallet...</h2>
          
          <div className="space-y-3 mb-6">
            {[
              'Exporting private key',
              'Generating MPC key shares',
              'Encrypting device share',
              'Storing server share',
              'Clearing legacy wallet'
            ].map((task, i) => (
              <div key={i} className="flex items-center">
                <div className="w-5 h-5 border-2 border-blue-600 rounded-full mr-3 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                </div>
                <span className="text-gray-700">{task}</span>
              </div>
            ))}
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
          </div>

          <p className="text-sm text-gray-600 text-center mt-4">
            Please wait, this may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  // Guardians Step
  if (step === 'guardians') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <h2 className="text-xl font-bold text-center mb-2">Migration Complete!</h2>
          <p className="text-gray-600 text-center mb-6">
            Your wallet has been successfully upgraded to MPC.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="font-medium text-blue-900 mb-2">🛡️ Next Step: Add Recovery Guardians</p>
            <p className="text-sm text-blue-800">
              You can now add trusted Arban members as recovery guardians. They can help you recover your wallet if you lose access.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkipGuardians}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Set Up Later
            </button>
            <button
              onClick={() => setStep('complete')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Guardians
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete Step
  if (step === 'complete') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center mb-2">All Set!</h2>
          <p className="text-gray-600 text-center mb-6">
            Your MPC wallet is ready to use with enhanced security.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-800 mb-2">
              <strong>Remember:</strong>
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Use your PIN to sign transactions</li>
              <li>Add guardians for recovery</li>
              <li>Your device share is encrypted locally</li>
            </ul>
          </div>

          <button
            onClick={handleComplete}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}

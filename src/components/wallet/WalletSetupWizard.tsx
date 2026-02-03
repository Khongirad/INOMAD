'use client';

import React, { useState } from 'react';
import { useMPCWallet } from '@/lib/hooks/use-mpc-wallet';
import { PinPad } from './PinPad';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

type WizardStep = 'INTRO' | 'CREATE_PIN' | 'CONFIRM_PIN' | 'CREATING' | 'SUCCESS';
type Log = {timestamp: string, message: string, type: 'info' | 'success' | 'warning' | 'error'};

export function WalletSetupWizard({ onComplete, systemLogs = [] }: { onComplete?: () => void, systemLogs?: Log[] }) {
  const { createWallet, error: apiError } = useMPCWallet();
  const [step, setStep] = useState<WizardStep>('INTRO');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreatePin = (value: string) => {
    setPin(value);
    setError(null);
  };

  const handleConfirmPin = (value: string) => {
    setConfirmPin(value);
    setError(null);
  };

  const nextStep = async () => {
    if (step === 'INTRO') {
      setStep('CREATE_PIN');
    } else if (step === 'CREATE_PIN') {
      if (pin.length !== 6) {
        setError('Please enter a 6-digit PIN');
        return;
      }
      setStep('CONFIRM_PIN');
    } else if (step === 'CONFIRM_PIN') {
      if (confirmPin !== pin) {
        setError('PINs do not match');
        setConfirmPin('');
        return;
      }
      // Start creation
      setStep('CREATING');
      try {
        await createWallet(pin, 'SOCIAL');
        setStep('SUCCESS');
      } catch (e: any) {
        setError(e.message || 'Failed to create wallet');
        setStep('INTRO'); // Reset or stay? Stay allows retry.
      }
    } else if (step === 'SUCCESS') {
      if (onComplete) onComplete();
    }
  };

  // Render Steps
  const renderStep = () => {
    switch (step) {
      case 'INTRO':
        return (
          <div className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Secure Digital Identity</h3>
              <p className="text-sm text-muted-foreground">
                We use Multi-Party Computation (MPC) to secure your wallet.
                Your private key is never stored in one place.
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg text-sm text-left space-y-2">
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>No seed phrase to lose</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>Recover logic via social guardians</span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <span>Encrypted on this device</span>
              </div>
            </div>
          </div>
        );

      case 'CREATE_PIN':
        return (
          <div className="space-y-6">
             <div className="text-center space-y-2">
               <h3 className="text-lg font-semibold">Create a PIN</h3>
               <p className="text-sm text-muted-foreground">
                 This PIN will decrypt your key share on this device.
               </p>
             </div>
             <PinPad 
               description="Set 6-digit PIN"
               onChange={handleCreatePin}
               onComplete={() => setError(null)}
               error={error || undefined}
             />
          </div>
        );

      case 'CONFIRM_PIN':
        return (
          <div className="space-y-6">
             <div className="text-center space-y-2">
               <h3 className="text-lg font-semibold">Confirm PIN</h3>
               <p className="text-sm text-muted-foreground">
                 Please re-enter your PIN to confirm.
               </p>
             </div>
             <PinPad 
               description="Confirm 6-digit PIN"
               onChange={handleConfirmPin}
               onComplete={(val) => {
                 if (val === pin) setError(null);
               }}
               error={error || undefined}
             />
          </div>
        );

      case 'CREATING':
        return (
          <div className="py-6 flex flex-col items-center justify-center space-y-4 text-center w-full">
             <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
             <div className="space-y-1">
               <h3 className="font-medium text-white">Securing your identity...</h3>
               <p className="text-sm text-zinc-400">Generating cryptographic shares</p>
             </div>
             
             {/* Live Log View */}
             <div className="w-full mt-6 bg-black rounded-md border border-zinc-800 p-3 h-48 overflow-y-auto text-left font-mono text-[10px]">
                {systemLogs.length === 0 && <span className="text-zinc-700">Waiting for process...</span>}
                {systemLogs.map((log, i) => (
                    <div key={i} className="mb-1 text-zinc-300">
                        <span className="text-zinc-600 mr-2">[{log.timestamp}]</span>
                        <span className={log.type === 'info' ? 'text-blue-400' : 'text-green-400'}>{log.message}</span>
                    </div>
                ))}
             </div>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
             <div className="space-y-2">
               <h3 className="text-lg font-semibold">Wallet Created!</h3>
               <p className="text-sm text-muted-foreground">
                 Your digital sovereignty is established.
               </p>
             </div>
             <div className="p-4 bg-muted rounded-lg border border-border">
               <p className="text-xs font-mono break-all text-muted-foreground">
                 Status: ACTIVE | 2-of-3 Shares Ready
               </p>
             </div>
          </div>
        );
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-2">
      <CardHeader>
        <CardTitle>Inomad Khural Wallet</CardTitle>
        <CardDescription>Setup your digital citizen wallet</CardDescription>
      </CardHeader>
      
      <CardContent>
        {apiError && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md flex gap-2 items-center text-sm">
                <AlertCircle className="w-4 h-4" />
                {apiError}
            </div>
        )}
        {renderStep()}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step !== 'CREATING' && step !== 'SUCCESS' && (
           <Button variant="ghost" onClick={() => setStep('INTRO')} disabled={step === 'INTRO'}>
             Back
           </Button>
        )}
        
        {step !== 'CREATING' && step !== 'SUCCESS' && (
          <Button 
            className="ml-auto" 
            onClick={nextStep}
            disabled={
                (step === 'CREATE_PIN' && pin.length !== 6) ||
                (step === 'CONFIRM_PIN' && confirmPin.length !== 6)
            }
          >
            {step === 'CONFIRM_PIN' ? 'Create Wallet' : 'Next'}
          </Button>
        )}

        {step === 'SUCCESS' && (
            <Button className="w-full" onClick={onComplete}>
                Open Wallet
            </Button>
        )}
      </CardFooter>
    </Card>
  );
}

'use client';

import React, { useState } from 'react';
import { useMPCWallet } from '@/lib/hooks/use-mpc-wallet';
import { WalletSetupWizard } from '@/components/wallet/WalletSetupWizard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Key, Copy, Check, RefreshCcw } from 'lucide-react';
import { PinPad } from '@/components/wallet/PinPad';

export default function WalletPage() {
  const { wallet, isReady, loading, refresh, signMessage, validatePin, signAndSendTransaction, systemLogs } = useMPCWallet();
  const [copied, setCopied] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testPin, setTestPin] = useState('');
  const [signStatus, setSignStatus] = useState<'IDLE' | 'SIGNING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [signature, setSignature] = useState('');

  // Send Transaction State
  const [sendMode, setSendMode] = useState(false);
  const [sendStatus, setSendStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [sendHash, setSendHash] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [showPinForSend, setShowPinForSend] = useState(false);

  // Auto-scroll for console
  const consoleEndRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestSign = async (pin: string) => {
    setSignStatus('SIGNING');
    try {
        const sig = await signMessage("Test Signature from Inomad Khural", pin);
        setSignature(sig);
        setSignStatus('SUCCESS');
    } catch (e) {
        setSignStatus('ERROR');
    }
  };

  const handleSendTransaction = async (pin: string) => {
    setSendStatus('SENDING');
    try {
        // Construct transaction object (simple transfer)
        // Note: Value processing and gas estimation would happen here in a real app
        // For now we send the raw params to the hook which passes to backend
        const tx = {
            to: recipient,
            value: amount ? `0x${(parseFloat(amount) * 1e18).toString(16)}` : '0x0', // Simple ETH conversion
        };
        
        const result = await signAndSendTransaction(tx, pin, true); // true = broadcast
        
        if (result.hash) {
            setSendHash(result.hash);
            setSendStatus('SUCCESS');
        } else {
            throw new Error("No hash returned");
        }
    } catch (e) {
        console.error(e);
        setSendStatus('ERROR');
    }
  };

  if (loading) {
     return <div className="p-8 text-center animate-pulse">Checking wallet status...</div>;
  }

  // If no wallet or incomplete setup, show Wizard
  if (!wallet || wallet.status === 'PENDING_SETUP') {
     return (
        <div className="container max-w-2xl py-12">
            <h1 className="text-3xl font-bold mb-8 text-center text-white">Setup Wallet</h1>
            <h1 className="text-3xl font-bold mb-8 text-center text-white">Setup Wallet</h1>
            <WalletSetupWizard 
                onComplete={() => {
                    refresh();
                    // Redirect to dashboard after successful setup
                    window.location.href = '/dashboard';
                }} 
                systemLogs={systemLogs} 
            />
        </div>
     );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in pb-20">
        {/* HEADER */}
        <div className="flex justify-between items-center">
            <div>
                 <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Shield className="text-gold-primary" />
                    My Sovereign Wallet
                </h1>
                <p className="text-zinc-400 text-sm ml-8">MPC-secured Native Assets</p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_green]" />
                    <span className="text-zinc-400">Altan L1: CONNECTED</span>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-zinc-400">MPC Shares: 2/3</span>
                 </div>
                 <Button variant="outline" size="sm" onClick={refresh} className="h-7 text-xs">
                    <RefreshCcw className="w-3 h-3 mr-2" /> Refresh
                </Button>
            </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-zinc-400">Wallet Address</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-md border border-white/5">
                        <code className="text-sm font-mono text-zinc-200 break-all">
                            {wallet.address}
                        </code>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyAddress}>
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                    <div className="mt-4 flex gap-2 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                            <Key className="w-3 h-3" /> MPC Secured
                        </span>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
                            Active
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-white/10">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-zinc-400">Transaction Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!sendMode ? (
                        <div className="text-center py-4">
                             <Button onClick={() => setSendMode(true)}>Test Send Transaction</Button>
                             <p className="text-xs text-zinc-500 mt-2">Sign and Broadcast to Network</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sendStatus === 'SUCCESS' ? (
                                <div className="text-center space-y-2">
                                    <div className="mx-auto w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                                        <Check className="w-6 h-6 text-green-500" />
                                    </div>
                                    <p className="font-medium text-green-500">Transaction Sent!</p>
                                    <div className="text-xs text-zinc-500 break-all font-mono bg-black p-2 rounded">
                                        Hash: {sendHash?.substring(0, 10)}...
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => { setSendMode(false); setSendStatus('IDLE'); }}>
                                        Done
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {!showPinForSend ? (
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs text-zinc-500">To Address</label>
                                                <input 
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm"
                                                    value={recipient}
                                                    onChange={(e) => setRecipient(e.target.value)}
                                                    placeholder="0x..."
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-zinc-500">Amount (ETH)</label>
                                                <input 
                                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-sm"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                    placeholder="0.0"
                                                />
                                            </div>
                                            <Button className="w-full" onClick={() => setShowPinForSend(true)}>
                                                Sign & Send
                                            </Button>
                                            <Button variant="ghost" className="w-full" onClick={() => setSendMode(false)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm text-center mb-2">Enter PIN to Confirm</p>
                                            <div className="text-xs text-center text-zinc-500 mb-4">
                                                Sending {amount} ETH to {recipient.substring(0,6)}...
                                            </div>
                                            <PinPad 
                                                description=""
                                                onChange={() => {}} 
                                                onComplete={(val) => handleSendTransaction(val)}
                                                disabled={sendStatus === 'SENDING'}
                                                error={sendStatus === 'ERROR' ? 'Failed to Send' : undefined}
                                            />
                                            {sendStatus === 'SENDING' && <p className="text-xs text-center animate-pulse">Broadcasting...</p>}
                                            <div className="flex justify-center mt-2">
                                                <Button variant="ghost" size="sm" onClick={() => setShowPinForSend(false)}>Back</Button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

      {/* SYSTEM CONSOLE */}
      <Card className="bg-black border-zinc-800 mt-8 font-mono text-xs overflow-hidden shadow-2xl">
        <div className="bg-zinc-900/80 px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Secure Enclave Operations</span>
            <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/20" />
                <div className="w-2 h-2 rounded-full bg-green-500/20" />
            </div>
        </div>
        <div className="h-32 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
            {systemLogs.length === 0 && (
                <div className="text-zinc-700 italic">System ready. Waiting for operations...</div>
            )}
            {systemLogs.map((log, i) => (
                <div key={i} className="flex gap-3">
                    <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                    <span className={
                        log.type === 'success' ? 'text-green-400' :
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-amber-400' :
                        'text-zinc-300'
                    }>
                        {log.type === 'success' && '✓ '}
                        {log.message}
                    </span>
                </div>
            ))}
            <div ref={consoleEndRef} />
        </div>
      </Card>
    </div>
  );
}

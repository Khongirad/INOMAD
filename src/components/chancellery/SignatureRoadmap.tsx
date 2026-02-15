'use client';

import { Check, Circle, User } from 'lucide-react';

interface Signer {
  id: string;
  username: string;
  role: 'CREATOR' | 'RECIPIENT' | 'WITNESS' | 'AUTHORITY';
  signed: boolean;
  signedAt?: string;
}

interface SignatureRoadmapProps {
  signers: Signer[];
  currentUserId?: string;
}

export default function SignatureRoadmap({ signers, currentUserId }: SignatureRoadmapProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'CREATOR': return 'Creator';
      case 'RECIPIENT': return 'Recipient';
      case 'WITNESS': return 'Witness';
      case 'AUTHORITY': return 'Authorized Person';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'CREATOR': return 'text-gold-primary bg-gold-primary/10';
      case 'RECIPIENT': return 'text-blue-400 bg-blue-400/10';
      case 'WITNESS': return 'text-purple-400 bg-purple-400/10';
      case 'AUTHORITY': return 'text-red-400 bg-red-400/10';
      default: return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  const totalSigners = signers.length;
  const signedCount = signers.filter(s => s.signed).length;
  const progress = (signedCount / totalSigners) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Signing Progress</h3>
          <span className="text-sm text-zinc-400">
            {signedCount} of {totalSigners}
          </span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div
            className="bg-gold-primary h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Roadmap */}
      <div className="relative space-y-4">
        {/* Vertical connecting line */}
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-zinc-700" />

        {signers.map((signer, index) => (
          <div key={signer.id} className="relative flex items-start gap-4">
            {/* Status Icon */}
            <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
              signer.signed
                ? 'bg-green-500 border-green-500'
                : currentUserId === signer.id
                ? 'bg-gold-primary/10 border-gold-primary animate-pulse'
                : 'bg-zinc-800 border-zinc-700'
            }`}>
              {signer.signed ? (
                <Check className="w-5 h-5 text-white" />
              ) : currentUserId === signer.id ? (
                <User className="w-5 h-5 text-gold-primary" />
              ) : (
                <Circle className="w-4 h-4 text-zinc-600" />
              )}
            </div>

            {/* Signer Info */}
            <div className={`flex-1 p-4 rounded-lg border transition-all ${
              signer.signed
                ? 'bg-green-500/5 border-green-500/30'
                : currentUserId === signer.id
                ? 'bg-gold-primary/5 border-gold-primary/30'
                : 'bg-zinc-800/50 border-zinc-700'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{signer.username}</span>
                    {currentUserId === signer.id && (
                      <span className="text-xs px-2 py-0.5 bg-gold-primary/20 text-gold-primary rounded">
                        You
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${getRoleColor(signer.role)}`}>
                      {getRoleLabel(signer.role)}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="text-right">
                  {signer.signed ? (
                    <div>
                      <span className="text-xs font-medium text-green-400">✓ Signed</span>
                      {signer.signedAt && (
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(signer.signedAt).toLocaleString('ru-RU')}
                        </div>
                      )}
                    </div>
                  ) : currentUserId === signer.id ? (
                    <span className="text-xs font-medium text-gold-primary">Awaiting your signature</span>
                  ) : (
                    <span className="text-xs text-zinc-500">Pending</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Status Summary */}
      {progress === 100 ? (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-green-400">
            <Check className="w-5 h-5" />
            <span className="font-medium">All signatures collected! Document will be archived.</span>
          </div>
        </div>
      ) : currentUserId && signers.find(s => s.id === currentUserId && !s.signed) ? (
        <div className="p-4 bg-gold-primary/10 border border-gold-primary/30 rounded-lg">
          <div className="flex items-center gap-2 text-gold-primary">
            <User className="w-5 h-5" />
            <span className="font-medium">Your signature is required to continue</span>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
          <div className="text-sm text-zinc-400">
            Awaiting signatures from other members...
          </div>
        </div>
      )}
    </div>
  );
}

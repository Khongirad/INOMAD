'use client';

import { ArrowRight, User, Shield } from 'lucide-react';

interface ChainLink {
  id: string;
  username: string;
  verifiedAt: string;
  isCreator: boolean;
}

interface VerificationChainViewProps {
  chain: ChainLink[];
  currentUserId?: string;
}

export default function VerificationChainView({ chain, currentUserId }: VerificationChainViewProps) {
  if (chain.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No verification chain found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Shield className="w-4 h-4" />
        <span>Verification Chain to Creator ({chain.length} levels)</span>
      </div>

      {/* Chain Links */}
      <div className="relative">
        {chain.map((link, index) => (
          <div key={link.id} className="flex items-center gap-3 mb-4 last:mb-0">
            {/* Level Number */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium text-zinc-300">
              {index + 1}
            </div>

            {/* User Card */}
            <div
              className={`flex-1 px-4 py-3 rounded-lg border transition ${
                link.id === currentUserId
                  ? 'bg-gold-primary/10 border-gold-primary'
                  : link.isCreator
                  ? 'bg-purple-500/10 border-purple-500'
                  : 'bg-zinc-800/50 border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    link.isCreator
                      ? 'bg-purple-500'
                      : link.id === currentUserId
                      ? 'bg-gold-primary'
                      : 'bg-zinc-700'
                  }`}
                >
                  {link.isCreator ? (
                    <Shield className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{link.username}</span>
                    {link.isCreator && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        Creator
                      </span>
                    )}
                    {link.id === currentUserId && (
                      <span className="px-2 py-0.5 bg-gold-primary/20 text-gold-primary text-xs rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400">
                    Verified {new Date(link.verifiedAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            </div>

            {/* Arrow to next level */}
            {index < chain.length - 1 && (
              <div className="absolute left-4 top-16 w-0.5 h-8 bg-zinc-700" />
            )}
          </div>
        ))}
      </div>

      {/* Chain Status */}
      <div className="mt-6 p-4 bg-zinc-800/30 border border-zinc-700 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-zinc-300">
            Verification chain is valid and leads to Creator
          </span>
        </div>
      </div>
    </div>
  );
}

'use client';

import { Hash, Users, Clock, MapPin, Download, X } from 'lucide-react';

interface ContractViewerProps {
  contract: {
    id: string;
    title: string;
    type: string;
    contractHash: string;
    witnessIds: string[];
    createdAt: string;
    location?: string;
    actor?: {
      id: string;
      username: string;
    };
    target?: {
      id: string;
      username: string;
    };
    metadata?: any;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractViewer({ contract, isOpen, onClose }: ContractViewerProps) {
  if (!isOpen) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-700">
          <h2 className="text-xl font-bold text-white">{contract.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contract Hash */}
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
              <Hash className="w-4 h-4" />
              Contract Hash (Blockchain Verifiable)
            </div>
            <div className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded font-mono text-sm text-white break-all">
              {contract.contractHash}
            </div>
          </div>

          {/* Parties */}
          <div>
            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
              <Users className="w-4 h-4" />
              Parties Involved
            </div>
            <div className="space-y-2">
              {contract.actor && (
                <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded">
                  <div className="w-8 h-8 rounded-full bg-gold-primary flex items-center justify-center text-xs font-bold text-black">
                    A
                  </div>
                  <div>
                    <p className="text-white font-medium">{contract.actor.username}</p>
                    <p className="text-xs text-zinc-500">Primary Party</p>
                  </div>
                </div>
              )}
              {contract.target && (
                <div className="flex items-center gap-3 px-4 py-2 bg-zinc-800/50 border border-zinc-700 rounded">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white">
                    B
                  </div>
                  <div>
                    <p className="text-white font-medium">{contract.target.username}</p>
                    <p className="text-xs text-zinc-500">Secondary Party</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Witnesses */}
          {contract.witnessIds.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                <Users className="w-4 h-4" />
                Witnesses ({contract.witnessIds.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {contract.witnessIds.map((witnessId, idx) => (
                  <div
                    key={witnessId}
                    className="px-3 py-2 bg-zinc-800/30 border border-zinc-700 rounded text-sm text-zinc-300"
                  >
                    Witness #{idx + 1}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                <Clock className="w-4 h-4" />
                Timestamp
              </div>
              <p className="text-white">{formatDate(contract.createdAt)}</p>
            </div>
            {contract.location && (
              <div>
                <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </div>
                <p className="text-white">{contract.location}</p>
              </div>
            )}
          </div>

          {/* Metadata */}
          {contract.metadata && Object.keys(contract.metadata).length > 0 && (
            <div>
              <div className="text-sm text-zinc-400 mb-2">Additional Details</div>
              <div className="px-4 py-3 bg-zinc-800/30 border border-zinc-700 rounded">
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap">
                  {JSON.stringify(contract.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-zinc-700">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-zinc-700 transition">
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Verify on Blockchain
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

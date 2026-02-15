'use client';

import { useState, useEffect } from 'react';
import { FileText, Filter, Search } from 'lucide-react';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  status: string;
  template: { name: string; type: string };
  createdAt: string;
  signatures: Array<{ signerId: string; signedAt: string }>;
}

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setLoading(false);
  }, [filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-zinc-600/20 text-zinc-400';
      case 'PENDING_SIGNATURES': return 'bg-yellow-400/20 text-yellow-400';
      case 'PARTIALLY_SIGNED': return 'bg-blue-400/20 text-blue-400';
      case 'FULLY_SIGNED': return 'bg-green-400/20 text-green-400';
      case 'ARCHIVED': return 'bg-purple-400/20 text-purple-400';
      default: return 'bg-zinc-600/20 text-zinc-400';
    }
  };

  return (
    <div className="container max-w-7xl py-8 space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">My Documentы</h1>
        <Link href="/chancellery" className="px-4 py-2 bg-gold-primary text-black rounded-lg hover:bg-gold-primary/90">
          + Create
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'DRAFT', 'PENDING_SIGNATURES', 'FULLY_SIGNED', 'ARCHIVED'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded text-sm ${
              filter === status ? 'bg-gold-primary text-black' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {status === 'all' ? 'All' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-primary mx-auto" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 bg-zinc-800/50 rounded-lg">
          <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">Documentов not yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => (
            <Link
              key={doc.id}
              href={`/chancellery/documents/${doc.id}`}
              className="block p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg hover:border-gold-primary/50 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{doc.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{doc.template.name}</p>
                </div>
                <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(doc.status)}`}>
                  {doc.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

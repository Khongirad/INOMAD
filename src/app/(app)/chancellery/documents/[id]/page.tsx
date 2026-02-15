'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { documentApi, Document } from '@/lib/api/documents';
import SignatureRoadmap from '@/components/chancellery/SignatureRoadmap';

export default function DocumentDetailsPage() {
  const params = useParams();
  const docId = params.id as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [docId]);

  const fetchDocument = async () => {
    try {
      const data = await documentApi.getById(docId);
      setDocument(data);
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    // TODO: Integrate with MPC wallet for signature
    const signature = 'temp_signature';
    try {
      await documentApi.sign(docId, signature);
      await fetchDocument();
    } catch (error) {
      console.error('Failed to sign:', error);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-primary mx-auto" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container max-w-4xl py-12 text-center">
        <FileText className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Document не найден</h2>
        <Link href="/chancellery/documents" className="text-gold-primary hover:underline">
          ← Return to documentам
        </Link>
      </div>
    );
  }

  const currentUserId = 'temp_user_id'; // TODO: Get from auth
  const signers = [
    {
      id: document.creatorId,
      username: document.creator.username,
      role: 'CREATOR' as const,
      signed: document.signatures.some(s => s.signerId === document.creatorId),
      signedAt: document.signatures.find(s => s.signerId === document.creatorId)?.signedAt,
    },
    ...document.recipientIds.map(id => ({
      id,
      username: `User ${id.slice(0, 8)}`, // TODO: Fetch actual usernames
      role: 'RECIPIENT' as const,
      signed: document.signatures.some(s => s.signerId === id),
      signedAt: document.signatures.find(s => s.signerId === id)?.signedAt,
    })),
    ...document.witnessIds.map(id => ({
      id,
      username: `Witness ${id.slice(0, 8)}`,
      role: 'WITNESS' as const,
      signed: document.signatures.some(s => s.signerId === id),
      signedAt: document.signatures.find(s => s.signerId === id)?.signedAt,
    })),
  ];

  const needsMySignature = signers.some(s => s.id === currentUserId && !s.signed);

  return (
    <div className="container max-w-4xl py-8 space-y-8 animate-in fade-in">
      <Link href="/chancellery/documents" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition">
        <ArrowLeft className="w-4 h-4" />
        Back к documentам
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{document.title}</h1>
          <p className="text-zinc-400 mt-1">{document.template.name}</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-zinc-500">
            Создано: {new Date(document.createdAt).toLocaleDateString('ru-RU')}
          </div>
          <div className={`inline-block px-3 py-1 rounded text-xs font-medium mt-2 ${
            document.status === 'FULLY_SIGNED' ? 'bg-green-400/20 text-green-400' :
            document.status === 'PARTIALLY_SIGNED' ? 'bg-yellow-400/20 text-yellow-400' :
            'bg-zinc-600/20 text-zinc-400'
          }`}>
            {document.status}
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-8">
        <div className="prose prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: document.content }} />
        </div>
      </div>

      {/* Signature Roadmap */}
      <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Process подписания</h2>
        <SignatureRoadmap signers={signers} currentUserId={currentUserId} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {needsMySignature && (
          <button
            onClick={handleSign}
            className="flex-1 px-6 py-3 bg-gold-primary text-black rounded-lg hover:bg-gold-primary/90 transition font-medium"
          >
            Sign document
          </button>
        )}
        {document.status === 'FULLY_SIGNED' && (
          <button className="flex items-center gap-2 px-6 py-3 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-zinc-700 transition">
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        )}
      </div>
    </div>
  );
}

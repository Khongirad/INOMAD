'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { toast } from 'sonner';

// ─── Types ───
type Step = 'username' | 'identity' | 'choose-method' | 'guarantor' | 'secret-question' | 'official' | 'submitted';
type OfficialServiceType = 'MIGRATION_SERVICE' | 'COUNCIL';

interface SecretQuestionResult {
  ok: boolean;
  recoveryToken?: string;
  expiresAt?: string;
}

export default function AccountRecoveryPage() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>('username');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Username
  const [username, setUsername] = useState('');

  // Step 2: Identity claim
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  // Step 3 data per method
  // -- Guarantor
  const [guarantorSeatId, setGuarantorSeatId] = useState('');
  const [requestId, setRequestId] = useState('');

  // -- Secret Question
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');

  // -- Official
  const [officialService, setOfficialService] = useState<OfficialServiceType>('MIGRATION_SERVICE');
  const [passportNumber, setPassportNumber] = useState('');
  const [passportSeries, setPassportSeries] = useState('');
  const [passportIssuedBy, setPassportIssuedBy] = useState('');
  const [birthCity, setBirthCity] = useState('');

  // Verify username exists (step 1)
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { setError('Please enter your username'); return; }
    setLoading(true);
    setError('');
    // We just move forward — the server will catch an invalid username
    // (we don't reveal if a username exists to prevent enumeration)
    setStep('identity');
    setLoading(false);
  };

  // Verify identity claim (step 2)
  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter your full legal name'); return; }
    if (!birthDate) { setError('Please enter your date of birth'); return; }
    setError('');
    setStep('choose-method');
  };

  // ─── Path A: Guarantor ───────────────────────────────────────────────────

  const handleGuarantorRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guarantorSeatId.trim()) { setError("Please enter your guarantor's Seat ID"); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ ok: boolean; requestId: string; message: string }>(
        '/auth/recovery/via-guarantor',
        { claimedUsername: username, claimedFullName: fullName, claimedBirthDate: birthDate, guarantorSeatId },
      );
      setRequestId(result.requestId);
      toast.success('Recovery request sent to your guarantor!');
      setStep('submitted');
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery request');
      toast.error(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  // ─── Path 2.1: Secret Question ───────────────────────────────────────────

  // Load secret question for this username
  useEffect(() => {
    if (step !== 'secret-question') return;
    (async () => {
      try {
        // Note: We don't have a "get question for username" endpoint for privacy.
        // The secret question is presented only after identity verification.
        // We ask user to enter their answer directly.
      } catch {}
    })();
  }, [step]);

  const handleSecretQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretAnswer.trim()) { setError('Please enter your answer'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.post<SecretQuestionResult>(
        '/auth/recovery/via-secret-question',
        { claimedUsername: username, claimedFullName: fullName, claimedBirthDate: birthDate, secretAnswer },
      );
      if (result.recoveryToken) {
        toast.success('Identity verified! Redirecting to password reset...');
        router.push(`/recovery/reset?token=${result.recoveryToken}`);
      }
    } catch (err: any) {
      setError(err.message || 'Incorrect answer or identity mismatch');
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Path 2.2: Official Organs ───────────────────────────────────────────

  const handleOfficialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passportNumber.trim()) { setError('Passport number is required for official verification'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ ok: boolean; requestId: string; message: string }>(
        '/auth/recovery/via-official',
        {
          claimedUsername: username,
          claimedFullName: fullName,
          claimedBirthDate: birthDate,
          claimedBirthCity: birthCity,
          claimedPassportNumber: passportNumber,
          claimedPassportSeries: passportSeries,
          claimedPassportIssuedBy: passportIssuedBy,
          officialServiceType: officialService,
        },
      );
      setRequestId(result.requestId);
      toast.success('Request submitted to ' + (officialService === 'MIGRATION_SERVICE' ? 'Migration Service' : 'the Council'));
      setStep('submitted');
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  // ─── Shared UI classes ────────────────────────────────────────────────────

  const inputCls = 'w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none transition-colors text-white';
  const primaryBtn = 'w-full py-3 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold rounded-lg transition-colors disabled:opacity-50';
  const backLink = (target: Step) => (
    <button
      onClick={() => { setError(''); setStep(target); }}
      className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors mb-6 flex items-center gap-1"
    >
      ← Back
    </button>
  );

  const ErrorBanner = () => error ? (
    <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400 text-sm">{error}</div>
  ) : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 flex items-center justify-center">
      <div className="max-w-lg w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-3xl font-bold text-gold-primary mb-2">Account Recovery</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            There is no email reset in INOMAD KHURAL. Recovery goes through the chain of trust — the same people who know you.
          </p>
        </div>

        {/* ── Step 1: Username ── */}
        {step === 'username' && (
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-amber-400">Step 1: Enter Your Username</h2>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_username"
                className={inputCls}
                required
              />
              <ErrorBanner />
              <button type="submit" className={primaryBtn} disabled={loading}>
                Continue →
              </button>
            </div>
            <div className="text-center">
              <a href="/login" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                Remembered your password? Log in →
              </a>
            </div>
          </form>
        )}

        {/* ── Step 2: Identity Claim ── */}
        {step === 'identity' && (
          <form onSubmit={handleIdentitySubmit} className="space-y-6">
            {backLink('username')}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-amber-400">Step 2: Verify Your Identity</h2>
              <p className="text-sm text-zinc-400">
                Enter the information you submitted during profile creation. This must match the records.
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">Full Legal Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Баир Иванов / Bair Ivanov"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth *</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>

              <ErrorBanner />
              <button type="submit" className={primaryBtn} disabled={loading}>
                Continue →
              </button>
            </div>
          </form>
        )}

        {/* ── Step 3: Choose Recovery Method ── */}
        {step === 'choose-method' && (
          <div className="space-y-4">
            {backLink('identity')}
            <h2 className="text-lg font-semibold text-amber-400 mb-4">Step 3: Choose Recovery Path</h2>

            <button
              onClick={() => setStep('guarantor')}
              className="w-full bg-zinc-900 border-2 border-amber-500/40 rounded-xl p-5 text-left hover:border-amber-500/70 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">🤝</div>
                <div>
                  <p className="font-bold text-amber-400 text-lg">Path A — Via Guarantor</p>
                  <p className="text-sm text-zinc-400">
                    Contact the citizen who originally verified you. They confirm your identity from their dashboard.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('secret-question')}
              className="w-full bg-zinc-900 border-2 border-blue-500/40 rounded-xl p-5 text-left hover:border-blue-500/70 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">🔐</div>
                <div>
                  <p className="font-bold text-blue-400 text-lg">Path 2.1 — Secret Question</p>
                  <p className="text-sm text-zinc-400">
                    Answer the personal security question you set when creating your profile.
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setStep('official')}
              className="w-full bg-zinc-900 border-2 border-zinc-700 rounded-xl p-5 text-left hover:border-zinc-500 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl">🏛️</div>
                <div>
                  <p className="font-bold text-zinc-200 text-lg">Path 2.2 — Official Organs</p>
                  <p className="text-sm text-zinc-400">
                    Submit a request to the Migration Service or Council with your passport data for official identity verification.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ── Guarantor Form ── */}
        {step === 'guarantor' && (
          <form onSubmit={handleGuarantorRequest} className="space-y-6">
            {backLink('choose-method')}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-amber-400">🤝 Recovery via Guarantor</h2>
              <div className="p-3 bg-amber-950/20 border border-amber-600/20 rounded-lg text-sm text-amber-200/80">
                ⚖️ Your guarantor is the verified citizen who vouched for your original identity. They bear personal responsibility to confirm this is you.
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Guarantor's Seat ID *</label>
                <input
                  type="text"
                  value={guarantorSeatId}
                  onChange={(e) => setGuarantorSeatId(e.target.value.toUpperCase())}
                  placeholder="KHURAL-XXXXXXXX"
                  className={`${inputCls} font-mono tracking-wider text-center`}
                  required
                />
              </div>
              <ErrorBanner />
              <button type="submit" className={primaryBtn} disabled={loading}>
                {loading ? 'Sending...' : 'Send Recovery Request'}
              </button>
            </div>
          </form>
        )}

        {/* ── Secret Question Form ── */}
        {step === 'secret-question' && (
          <form onSubmit={handleSecretQuestionSubmit} className="space-y-6">
            {backLink('choose-method')}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-blue-400">🔐 Secret Question Recovery</h2>
              <p className="text-sm text-zinc-400">
                Answer the security question you chose when setting up your profile.
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Your Secret Question</label>
                <select
                  value={secretQuestion}
                  onChange={(e) => setSecretQuestion(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- I remember my question --</option>
                  <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                  <option value="What was the name of your first school?">What was the name of your first school?</option>
                  <option value="What was the name of your childhood pet?">What was the name of your childhood pet?</option>
                  <option value="What city were you born in?">What city were you born in?</option>
                  <option value="What is the name of the street you grew up on?">What is the name of the street you grew up on?</option>
                  <option value="What was the model of your first car?">What was the model of your first car?</option>
                  <option value="What is your paternal grandmother's first name?">What is your paternal grandmother's first name?</option>
                  <option value="What was the name of your closest childhood friend?">What was the name of your closest childhood friend?</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Your Answer *</label>
                <input
                  type="text"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  placeholder="Enter your answer (case-insensitive)"
                  className={inputCls}
                  required
                />
              </div>
              <ErrorBanner />
              <button type="submit" className={primaryBtn} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Answer →'}
              </button>
            </div>
          </form>
        )}

        {/* ── Official Organs Form ── */}
        {step === 'official' && (
          <form onSubmit={handleOfficialSubmit} className="space-y-6">
            {backLink('choose-method')}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-zinc-200">🏛️ Official Organ Verification</h2>
              <p className="text-sm text-zinc-400">
                Your identity will be verified by the selected service. Provide your passport data for cross-referencing.
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">Official Service *</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['MIGRATION_SERVICE', 'COUNCIL'] as OfficialServiceType[]).map((svc) => (
                    <button key={svc} type="button"
                      onClick={() => setOfficialService(svc)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        officialService === svc
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <div className="text-xl mb-1">{svc === 'MIGRATION_SERVICE' ? '🛂' : '⚖️'}</div>
                      <div className="text-sm font-semibold">
                        {svc === 'MIGRATION_SERVICE' ? 'Migration Service' : 'Council'}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {svc === 'MIGRATION_SERVICE' ? 'Passport office will verify' : 'Council will authenticate'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Passport Series</label>
                  <input type="text" value={passportSeries} onChange={(e) => setPassportSeries(e.target.value)}
                    placeholder="АА / AB" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Passport Number *</label>
                  <input type="text" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="1234567" className={inputCls} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Issued By</label>
                <input type="text" value={passportIssuedBy} onChange={(e) => setPassportIssuedBy(e.target.value)}
                  placeholder="Issuing authority" className={inputCls} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">City of Birth</label>
                <input type="text" value={birthCity} onChange={(e) => setBirthCity(e.target.value)}
                  placeholder="e.g. Ulan-Ude" className={inputCls} />
              </div>

              <ErrorBanner />
              <button type="submit" className={primaryBtn} disabled={loading}>
                {loading ? 'Submitting...' : 'Submit to ' + (officialService === 'MIGRATION_SERVICE' ? 'Migration Service' : 'Council')}
              </button>
            </div>
          </form>
        )}

        {/* ── Submitted State ── */}
        {step === 'submitted' && (
          <div className="bg-zinc-900 border-2 border-green-600/30 rounded-xl p-8 text-center space-y-4">
            <div className="text-6xl">📨</div>
            <h2 className="text-2xl font-bold text-green-400">Request Submitted</h2>
            <p className="text-zinc-300 text-sm">
              Your recovery request has been submitted. You will be notified when your identity has been confirmed.
            </p>
            {requestId && (
              <div className="bg-zinc-800 rounded-lg p-3">
                <p className="text-xs text-zinc-500">Reference ID (save this)</p>
                <p className="font-mono text-xs text-amber-400 break-all">{requestId}</p>
              </div>
            )}
            <div className="pt-4 border-t border-zinc-700 text-sm text-zinc-500">
              Once approved, you will receive a recovery token to reset your password.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

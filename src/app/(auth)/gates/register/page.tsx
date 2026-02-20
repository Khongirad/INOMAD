'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { register, acceptTOS, acceptConstitution } from '@/lib/api/identity';
import { toast } from 'sonner';

const STEPS = {
  TOS: 1,
  CONSTITUTION: 2,
  OATH: 3,
  ACCOUNT: 4,
  COMPLETE: 5,
};

const TOTAL_FORM_STEPS = 4;

const STEP_LABELS = ['Terms of Service', 'Constitution', 'Oath', 'Account'];

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEPS.TOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Account fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Acceptance
  const [tosAccepted, setTosAccepted] = useState(false);
  const [constitutionAccepted, setConstitutionAccepted] = useState(false);
  const [oathTaken, setOathTaken] = useState(false);

  // Document content
  const [tosContent, setTosContent] = useState('');
  const [constitutionContent, setConstitutionContent] = useState('');

  const loadDocument = async (path: string) => {
    const response = await fetch(path);
    return await response.text();
  };

  // ─── Step Handlers ───

  const handleTOSNext = async () => {
    if (!tosContent) {
      const tos = await loadDocument('/documents/terms-of-service.md');
      setTosContent(tos);
      return;
    }
    if (!tosAccepted) {
      setError('You must accept the Terms of Service to continue');
      return;
    }
    setError('');
    const constitution = await loadDocument('/documents/constitution.md');
    setConstitutionContent(constitution);
    setCurrentStep(STEPS.CONSTITUTION);
  };

  const handleConstitutionNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!constitutionAccepted) {
      setError('You must accept the Constitution to continue');
      return;
    }
    setError('');
    setCurrentStep(STEPS.OATH);
  };

  const handleOathSubmit = () => {
    setOathTaken(true);
    setError('');
    setCurrentStep(STEPS.ACCOUNT);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    if (!hasLetters || !hasNumbers) {
      setError('Password must contain both letters and numbers');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await register({ username, password });
      toast.success('✅ Account registered successfully!');

      await acceptTOS();
      await acceptConstitution();
      toast.success('✅ Constitution accepted — you are now a legal subject!');

      setCurrentStep(STEPS.COMPLETE);
    } catch (err: any) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Completion Screen ───

  if (currentStep === STEPS.COMPLETE) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="text-8xl mb-6 animate-bounce">🏔️</div>
            <h1 className="text-4xl font-bold text-gold-primary mb-4">
              Welcome to the Khural!
            </h1>
            <p className="text-xl text-amber-400/80 mb-6">
              You have entered the sovereign system
            </p>
          </div>

          <div className="bg-zinc-900 border-2 border-amber-500/50 rounded-lg p-8 mb-8 space-y-3 text-left">
            <p className="text-lg text-zinc-300">✅ Terms of Service accepted</p>
            <p className="text-lg text-zinc-300">✅ Constitution accepted</p>
            <p className="text-lg text-zinc-300">✅ Sacred Oath taken</p>
            <p className="text-lg text-green-400 font-bold">
              ✅ Account created — you are a LEGAL SUBJECT
            </p>
          </div>

          <div className="bg-amber-950/20 border border-amber-600/30 rounded-lg p-6 mb-8">
            <p className="text-amber-200 font-semibold mb-2">
              ⏳ Next Step: Citizen Verification
            </p>
            <p className="text-zinc-300 text-sm">
              A verified citizen must vouch for your identity.
              This ensures every member of the Khural is interconnected
              and accountable — the verificator bears responsibility for you.
            </p>
          </div>

          <button
            onClick={() => router.push('/activation')}
            className="px-8 py-4 bg-gradient-to-r from-amber-600 to-gold-primary text-zinc-900 font-bold rounded-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all text-lg"
          >
            Go to Activation →
          </button>
        </div>
      </div>
    );
  }

  // ─── Shared UI ───

  const inputClass = 'w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none transition-colors';
  const primaryBtn = 'flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold rounded-lg transition-colors';
  const backBtn = 'flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors';

  const ErrorBanner = () =>
    error ? (
      <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">{error}</div>
    ) : null;

  // ─── Render ───

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <Image src="/images/tengri-flag.png" alt="Tengri Flag" width={150} height={150}
              className="drop-shadow-[0_0_30px_rgba(254,252,232,0.4)]" />
          </div>
          <h1 className="text-4xl font-bold text-gold-primary mb-2">REGISTRATION</h1>
          <p className="text-zinc-400">Gates of the Khural</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center mb-8 gap-2">
          {Array.from({ length: TOTAL_FORM_STEPS }, (_, i) => i + 1).map((step) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  currentStep >= step
                    ? 'bg-amber-500 text-zinc-900 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-800 text-zinc-600'
                }`}>
                  {currentStep > step ? '✓' : step}
                </div>
                <span className={`text-[10px] mt-1 ${currentStep >= step ? 'text-amber-400' : 'text-zinc-600'}`}>
                  {STEP_LABELS[step - 1]}
                </span>
              </div>
              {step < TOTAL_FORM_STEPS && (
                <div className={`w-8 h-0.5 mb-4 ${currentStep > step ? 'bg-amber-500' : 'bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Terms of Service ─── */}
        {currentStep === STEPS.TOS && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-1">Step 1: Terms of Service</h2>
            <p className="text-zinc-500 text-sm">Review and accept the platform rules before proceeding</p>

            {!tosContent ? (
              <div className="text-center py-12">
                <button
                  onClick={handleTOSNext}
                  className={`px-8 py-4 ${primaryBtn} text-lg`}
                >
                  📜 Open Terms of Service
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleTOSNext(); }} className="space-y-6">
                <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-h-96 overflow-y-auto prose prose-invert prose-amber max-w-none">
                  <ReactMarkdown>{tosContent}</ReactMarkdown>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)}
                    className="w-5 h-5 accent-amber-500" />
                  <span>I accept the Terms of Service</span>
                </label>

                <ErrorBanner />
                <button type="submit" className={`w-full ${primaryBtn}`}>Next →</button>
              </form>
            )}
          </div>
        )}

        {/* ─── Step 2: Constitution ─── */}
        {currentStep === STEPS.CONSTITUTION && (
          <form onSubmit={handleConstitutionNext} className="space-y-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-1">Step 2: Constitution</h2>
            <p className="text-zinc-500 text-sm">Accept the founding law of the Khural</p>

            <div className="bg-amber-950/20 border-2 border-amber-600/50 rounded-lg p-6">
              <p className="text-lg font-bold text-amber-400 mb-2">⚖️ IMPORTANT: Legal Status</p>
              <p className="text-zinc-300">
                By accepting the Constitution of INOMAD KHURAL, you become a{' '}
                <span className="text-green-400 font-bold">legal subject</span>{' '}
                with full sovereign rights and obligations.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-h-96 overflow-y-auto prose prose-invert prose-amber max-w-none">
              <ReactMarkdown>{constitutionContent}</ReactMarkdown>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={constitutionAccepted}
                onChange={(e) => setConstitutionAccepted(e.target.checked)} className="w-5 h-5 mt-1 accent-amber-500" />
              <span>
                I accept the Constitution of INOMAD KHURAL and become a citizen
                with rights and responsibilities as a legal subject
              </span>
            </label>

            <ErrorBanner />
            <div className="flex gap-4">
              <button type="button" onClick={() => { setError(''); setCurrentStep(STEPS.TOS); }} className={backBtn}>
                ← Back
              </button>
              <button type="submit" className={primaryBtn}>Next →</button>
            </div>
          </form>
        )}

        {/* ─── Step 3: Sacred Oath ─── */}
        {currentStep === STEPS.OATH && (
          <div className="space-y-8 text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-1">Step 3: Sacred Oath</h2>
            <p className="text-zinc-500 text-sm">Swear your oath before entering the Khural</p>

            <div className="max-w-2xl mx-auto bg-zinc-900/80 border-2 border-amber-600/40 rounded-2xl p-10 space-y-6">
              <div className="text-6xl mb-4">⚔️</div>
              <div className="text-zinc-200 text-lg leading-relaxed italic space-y-4">
                <p>
                  &ldquo;I solemnly swear to uphold the Constitution of INOMAD KHURAL,
                  to act with honor and integrity as a citizen of the sovereign system,
                  and to bear responsibility for those I verify and those who verify me.&rdquo;
                </p>
                <p>
                  &ldquo;I understand that my identity is bound to those who vouch for me,
                  and I accept the weight of this mutual trust.&rdquo;
                </p>
              </div>

              <div className="pt-6 border-t border-zinc-700">
                <p className="text-amber-300/60 text-xs mb-6 uppercase tracking-widest">
                  By pressing the button below, you take the oath
                </p>
                <button
                  onClick={handleOathSubmit}
                  className="px-12 py-5 bg-gradient-to-r from-red-700 via-amber-600 to-red-700 text-white text-2xl font-black rounded-xl 
                    hover:shadow-[0_0_40px_rgba(245,158,11,0.6)] hover:scale-105
                    active:scale-95 transition-all duration-300 tracking-wider
                    border-2 border-amber-500/50"
                >
                  ⚔️ I SWEAR ⚔️
                </button>
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <button onClick={() => { setError(''); setCurrentStep(STEPS.CONSTITUTION); }}
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                ← Back to Constitution
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Account ─── */}
        {currentStep === STEPS.ACCOUNT && (
          <form onSubmit={handleAccountSubmit} className="max-w-md mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-1">Step 4: Create Account</h2>
            <p className="text-zinc-500 text-sm">Create your sovereign identity credentials</p>

            {oathTaken && (
              <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-lg text-green-400 text-sm text-center">
                ✅ Oath taken — you may now create your account
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Username *</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className={inputClass} required minLength={3} placeholder="your_username" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputClass} required minLength={8} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password *</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass} required />
            </div>

            <ErrorBanner />
            <div className="flex gap-4">
              <button type="button" onClick={() => { setError(''); setCurrentStep(STEPS.OATH); }}
                className={backBtn} disabled={loading}>← Back</button>
              <button type="submit" disabled={loading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50">
                {loading ? 'Processing...' : '✅ Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

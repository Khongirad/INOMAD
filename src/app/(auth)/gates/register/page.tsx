'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { register, acceptConstitution } from '@/lib/api';
import { toast } from 'sonner';

const STEPS = {
  ACCOUNT: 1,
  TOS: 2,
  CONSTITUTION: 3,
  COMPLETE: 4,
};

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(STEPS.ACCOUNT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  
  // Acceptance flags
  const [tosAccepted, setTosAccepted] = useState(false);
  const [constitutionAccepted, setConstitutionAccepted] = useState(false);

  // Documents
  const [tosContent, setTosContent] = useState('');
  const [constitutionContent, setConstitutionContent] = useState('');

  // Load documents
  const loadDocument = async (path: string) => {
    const response = await fetch(path);
    return await response.text();
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    // Load TOS for next step
    const tos = await loadDocument('/documents/terms-of-service.md');
    setTosContent(tos);
    setCurrentStep(STEPS.TOS);
  };

  const handleTOSSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tosAccepted) {
      setError('You must accept the Terms of Service to continue');
      return;
    }

    setError('');
    // Load Constitution for next step
    const constitution = await loadDocument('/documents/constitution.md');
    setConstitutionContent(constitution);
    setCurrentStep(STEPS.CONSTITUTION);
  };

  const handleConstitutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!constitutionAccepted) {
      setError('You must accept the Constitution to become a legal subject');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1 & 2: Register account (TOS acceptance handled internally)
      await register({ username, password, familyName: username });
     toast.success('✅ Account registered successfully!');

      // Step 3: Accept Constitution (grants legal subject status!)
      await acceptConstitution();
      toast.success('✅ Constitution accepted! You are now a legal subject!');

      setCurrentStep(STEPS.COMPLETE);
    } catch (err: any) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  if (currentStep === STEPS.COMPLETE) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center">
          <div className="mb-8">
            <div className="text-8xl mb-6 animate-bounce">🏔️</div>
            <h1 className="text-4xl font-bold text-gold-primary mb-4">
              Добро пожаловать в Хурал!
            </h1>
            <h2 className="text-2xl text-amber-400/80 mb-6">
              Welcome to the Khural!
            </h2>
          </div>

          <div className="bg-zinc-900 border-2 border-amber-500/50 rounded-lg p-8 mb-8">
            <p className="text-lg text-zinc-300 mb-4">
              ✅ Вы успешно зарегистрированы
            </p>
            <p className="text-lg text-zinc-300 mb-4">
              ✅ Вы приняли Условия использования
            </p>
            <p className="text-lg text-green-400 font-bold mb-6">
              ✅ Вы приняли Конституцию и стали ПРАВОВЫМ СУБЪЕКТОМ
            </p>
            <div className="text-sm text-zinc-500">
              You are now a legal subject with full rights and responsibilities
            </div>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-amber-600 to-gold-primary text-zinc-900 font-bold rounded-lg hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all"
          >
            Войти в систему / Enter the System
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gold-primary mb-2">
            РЕГИСТРАЦИЯ / REGISTRATION
          </h1>
          <p className="text-zinc-400">Gates of Khural • Врата Хурала</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center mb-8">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-2 ${
                currentStep >= step
                  ? 'bg-amber-500 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-600'
              }`}
            >
              {step}
            </div>
          ))}
        </div>

        {/* Step 1: Account Creation */}
        {currentStep === STEPS.ACCOUNT && (
          <form onSubmit={handleAccountSubmit} className="max-w-md mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">
              Шаг 1: Создание аккаунта
            </h2>

            <div>
              <label className="block text-sm font-medium mb-2">Username *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none"
                required
                minLength={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none"
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold rounded-lg transition-colors"
            >
              Далее / Next →
            </button>
          </form>
        )}

        {/* Step 2: Terms of Service */}
        {currentStep === STEPS.TOS && (
          <form onSubmit={handleTOSSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">
              Шаг 2: Условия использования
            </h2>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-h-96 overflow-y-auto prose prose-invert prose-amber max-w-none">
              <ReactMarkdown>{tosContent}</ReactMarkdown>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="w-5 h-5"
              />
              <span>Я принимаю Условия использования / I accept the Terms of Service</span>
            </label>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS.ACCOUNT)}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                ← Назад / Back
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-zinc-900 font-bold rounded-lg transition-colors"
              >
                Далее / Next →
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Constitution */}
        {currentStep === STEPS.CONSTITUTION && (
          <form onSubmit={handleConstitutionSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">
              Шаг 3: Принятие Конституции
            </h2>

            <div className="bg-amber-950/20 border-2 border-amber-600/50 rounded-lg p-6 mb-6">
              <p className="text-lg font-bold text-amber-400 mb-2">
                ⚖️ ВАЖНО: Юридический статус
              </p>
              <p className="text-zinc-300">
                Принимая Конституцию ИНОМАД ХУРАЛА, вы становитесь <span className="text-green-400 font-bold">правовым субъектом</span> с полными правами и обязанностями в нашей суверенной системе.
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-h-96 overflow-y-auto prose prose-invert prose-amber max-w-none">
              <ReactMarkdown>{constitutionContent}</ReactMarkdown>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={constitutionAccepted}
                onChange={(e) => setConstitutionAccepted(e.target.checked)}
                className="w-5 h-5 mt-1"
              />
              <span>
                Я принимаю Конституцию ИНОМАД ХУРАЛА и становлюсь гражданином с правами и обязанностями правового субъекта<br/>
                <span className="text-sm text-zinc-400">
                  I accept the INOMAD KHURAL Constitution and become a citizen with rights and responsibilities as a legal subject
                </span>
              </span>
            </label>

            {error && (
              <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(STEPS.TOS)}
                className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
                disabled={loading}
              >
                ← Назад / Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : '✅ Принять и завершить / Accept & Complete'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

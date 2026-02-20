'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api/client';

// ─── Data Options ───

const COUNTRIES = [
  'Russia', 'Mongolia', 'China', 'Kazakhstan', 'Kyrgyzstan',
  'Uzbekistan', 'Turkey', 'Japan', 'South Korea', 'USA',
  'Germany', 'France', 'United Kingdom', 'Canada', 'Australia',
  'Other',
];

const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  'Russia': [
    'Republic of Buryatia', 'Zabaykalsky Krai', 'Irkutsk Oblast',
    'Moscow', 'Saint Petersburg', 'Republic of Tuva', 'Altai Republic',
    'Republic of Kalmykia', 'Sakha Republic (Yakutia)',
    'Other region',
  ],
  'Mongolia': [
    'Ulaanbaatar', 'Darkhan-Uul', 'Khentii', 'Dornod', 'Selenge',
    'Bulgan', 'Khuvsgul', 'Arkhangai', 'Uvurkhangai',
    'Other aimag',
  ],
  'China': [
    'Inner Mongolia', 'Xinjiang', 'Tibet', 'Beijing', 'Shanghai',
    'Other province',
  ],
};

const ETHNICITIES = [
  'Buryad-Mongol', 'Khalkha-Mongol', 'Oirat', 'Kalmyk', 'Tuvan',
  'Hazara', 'Kazakh', 'Kyrgyz', 'Yakut (Sakha)', 'Altai-Kizhi',
  'Russian', 'Other',
];

const CLANS: Record<string, string[]> = {
  'Buryad-Mongol': [
    'Khori', 'Ekhirit', 'Bulagat', 'Khongodor',
    'Sartul', 'Tsongol', 'Tabangut', 'Segenut',
    'Other clan',
  ],
  'Khalkha-Mongol': ['Khalkha', 'Dariganga', 'Darkhad', 'Other clan'],
  'Oirat': ['Derbet', 'Torgut', 'Olot', 'Khoshut', 'Other clan'],
  'Kalmyk': ['Derbet', 'Torgut', 'Khoshut', 'Buzava', 'Other clan'],
};

const LANGUAGES = [
  'Buryad', 'Mongolian', 'Kalmyk', 'Tuvan', 'Kazakh',
  'Kyrgyz', 'Yakut', 'Russian', 'English', 'Chinese',
  'Korean', 'Japanese', 'Turkish', 'Other',
];

// ─── Component ───

export default function CreateProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Birthplace
  const [country, setCountry] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');

  // Personal
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Identity
  const [isIndigenous, setIsIndigenous] = useState<boolean | null>(null);
  const [ethnicity, setEthnicity] = useState<string[]>([]);
  const [clan, setClan] = useState('');
  const [language, setLanguage] = useState('');

  // Derived
  const regions = REGIONS_BY_COUNTRY[country] || [];
  const primaryEthnicity = ethnicity[0] || '';
  const availableClans = CLANS[primaryEthnicity] || [];

  const toggleEthnicity = (eth: string) => {
    setEthnicity((prev) =>
      prev.includes(eth) ? prev.filter((e) => e !== eth) : [...prev, eth],
    );
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!country) { setError('Please select your country of birth'); return; }
    if (isIndigenous === null) { setError('Please select your legal status'); return; }
    if (ethnicity.length === 0) { setError('Please select at least one ethnicity'); return; }

    setLoading(true);
    setError('');

    try {
      await api.patch('/users/profile', {
        gender: gender || undefined,
        dateOfBirth: dateOfBirth || undefined,
        ethnicity,
        birthPlace: { city, district, country },
        clan: clan || undefined,
        nationality: ethnicity[0],
        language: language || undefined,
      });
      toast.success('✅ Digital identity created successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error saving profile');
      toast.error(`❌ ${err.message || 'Error'}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg focus:border-amber-500 focus:outline-none transition-colors text-white';
  const selectClass = `${inputClass} appearance-none cursor-pointer`;
  const sectionTitle = 'text-lg font-semibold text-amber-400 flex items-center gap-2 mb-3';

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">🛡️</div>
          <h1 className="text-3xl font-bold text-gold-primary mb-2">
            Digital Identity
          </h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Create your digital shell. Your birthplace, ethnicity, and lineage determine
            your legal framework — indigenous citizens hold Khural seats and land rights.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Section 1: Birthplace ── */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className={sectionTitle}>🌍 Place of Birth</h3>

            <div>
              <label className="block text-sm font-medium mb-2">Country *</label>
              <select value={country} onChange={(e) => { setCountry(e.target.value); setDistrict(''); }}
                className={selectClass} required>
                <option value="">-- Select --</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {regions.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Region / District</label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className={selectClass}>
                  <option value="">-- Select --</option>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                className={inputClass} placeholder="e.g. Ulan-Ude" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className={selectClass}>
                  <option value="">-- Select --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  className={inputClass} />
              </div>
            </div>
          </section>

          {/* ── Section 2: Legal Status ── */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className={sectionTitle}>⚖️ Legal Status *</h3>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setIsIndigenous(true)}
                className={cn(
                  'p-5 rounded-xl border-2 text-left transition-all',
                  isIndigenous === true
                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600',
                )}>
                <div className="text-2xl mb-2">🏔️</div>
                <div className="font-bold text-amber-400 text-lg">Indigenous</div>
                <div className="text-xs text-zinc-500 mt-2">
                  Native to your ancestral land. Grants Khural seat and exclusive land rights.
                </div>
              </button>

              <button type="button" onClick={() => setIsIndigenous(false)}
                className={cn(
                  'p-5 rounded-xl border-2 text-left transition-all',
                  isIndigenous === false
                    ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600',
                )}>
                <div className="text-2xl mb-2">🌐</div>
                <div className="font-bold text-blue-400 text-lg">Resident</div>
                <div className="text-xs text-zinc-500 mt-2">
                  Full citizen rights without exclusive land ownership.
                </div>
              </button>
            </div>

            {isIndigenous === true && (
              <div className="p-3 bg-amber-950/20 border border-amber-600/20 rounded-lg">
                <p className="text-xs text-amber-200/80">
                  ⚠️ Indigenous status will be confirmed through citizen verification.
                </p>
              </div>
            )}
          </section>

          {/* ── Section 3: Ethnicity & Clan ── */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className={sectionTitle}>🏹 Ethnicity & Lineage *</h3>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ethnicity <span className="text-zinc-500">(you may select more than one)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {ETHNICITIES.map((eth) => (
                  <label key={eth}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm',
                      ethnicity.includes(eth)
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600',
                    )}>
                    <input type="checkbox" checked={ethnicity.includes(eth)}
                      onChange={() => toggleEthnicity(eth)} className="w-4 h-4 accent-amber-500" />
                    {eth}
                  </label>
                ))}
              </div>
            </div>

            {availableClans.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Clan / Lineage</label>
                <select value={clan} onChange={(e) => setClan(e.target.value)} className={selectClass}>
                  <option value="">-- Select --</option>
                  {availableClans.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Select your ancestral clan (e.g. for Buryad-Mongol: Khori, Ekhirit, Bulagat, etc.)
                </p>
              </div>
            )}
          </section>

          {/* ── Section 4: Language ── */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h3 className={sectionTitle}>
              🗣️ Language
            </h3>

            <div>
              <label className="block text-sm font-medium mb-2">Primary Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
                <option value="">-- Select --</option>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Your preferred language for official communications and documents
              </p>
            </div>
          </section>

          {/* ── Error & Submit ── */}
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-700/30 rounded-lg text-red-400">{error}</div>
          )}

          <div>
            <button type="submit" disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-500 text-zinc-900 font-bold rounded-lg hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all disabled:opacity-50 text-lg">
              {loading ? 'Saving...' : '✅ Create Digital Identity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

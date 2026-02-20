'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Building2, Landmark, Scale, Coins, Gavel,
  ChevronRight, ChevronLeft, Check, Loader2,
  ShieldCheck, Users, FileText, Banknote,
} from 'lucide-react';
import { api } from '@/lib/api/client';

// ── Types ──────────────────────────────────────────────────────────────────

type Category = 'GOVERNMENT' | 'PRIVATE';
type PowerBranch = 'LEGISLATIVE' | 'EXECUTIVE' | 'JUDICIAL' | 'BANKING' | 'NONE';

interface OrgTemplate {
  type: string;
  label: string;
  description: string;
  branch: PowerBranch;
  minMembers: number;
  maxMembers: number;
  icon: React.ReactNode;
  badgeColor: string;
  registrationFee: number; // in ALTAN, 0 for government
}

const GOV_TEMPLATES: OrgTemplate[] = [
  {
    type: 'MINISTRY', label: 'Министерство', description: 'Государственный орган исполнительной власти',
    branch: 'EXECUTIVE', minMembers: 3, maxMembers: 50, icon: <Landmark className="h-6 w-6" />,
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30', registrationFee: 0,
  },
  {
    type: 'COMMITTEE', label: 'Комитет Хурала', description: 'Парламентский комитет по направлению деятельности',
    branch: 'LEGISLATIVE', minMembers: 5, maxMembers: 25, icon: <Scale className="h-6 w-6" />,
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', registrationFee: 0,
  },
  {
    type: 'COURT', label: 'Суд', description: 'Орган судебной власти для рассмотрения дел',
    branch: 'JUDICIAL', minMembers: 3, maxMembers: 15, icon: <Gavel className="h-6 w-6" />,
    badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30', registrationFee: 0,
  },
  {
    type: 'REGULATORY', label: 'Регулятор / ЦИК', description: 'Контролирующий или избирательный орган',
    branch: 'BANKING', minMembers: 5, maxMembers: 20, icon: <ShieldCheck className="h-6 w-6" />,
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30', registrationFee: 0,
  },
  {
    type: 'STATE_ENTERPRISE', label: 'Госпредприятие', description: 'Государственная коммерческая структура',
    branch: 'EXECUTIVE', minMembers: 2, maxMembers: 200, icon: <Building2 className="h-6 w-6" />,
    badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30', registrationFee: 0,
  },
];

const PRIVATE_TEMPLATES: OrgTemplate[] = [
  {
    type: 'LLC', label: 'ООО (Частная компания)', description: 'Общество с ограниченной ответственностью',
    branch: 'NONE', minMembers: 1, maxMembers: 100, icon: <Building2 className="h-6 w-6" />,
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30', registrationFee: 500,
  },
  {
    type: 'COOPERATIVE', label: 'Кооператив', description: 'Совместное предприятие участников',
    branch: 'NONE', minMembers: 3, maxMembers: 200, icon: <Users className="h-6 w-6" />,
    badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30', registrationFee: 100,
  },
  {
    type: 'GUILD', label: 'Гильдия / Цех', description: 'Профессиональное объединение по специализации',
    branch: 'NONE', minMembers: 5, maxMembers: 500, icon: <ShieldCheck className="h-6 w-6" />,
    badgeColor: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', registrationFee: 200,
  },
  {
    type: 'STARTUP', label: 'Стартап', description: 'Льготный режим: 0% налог на первые 2 года',
    branch: 'NONE', minMembers: 1, maxMembers: 30, icon: <Coins className="h-6 w-6" />,
    badgeColor: 'bg-pink-500/15 text-pink-400 border-pink-500/30', registrationFee: 50,
  },
  {
    type: 'NGO', label: 'НКО / Фонд', description: 'Некоммерческая организация, освобождена от налогов',
    branch: 'NONE', minMembers: 2, maxMembers: 1000, icon: <FileText className="h-6 w-6" />,
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30', registrationFee: 0,
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function CreateOrganizationPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [template, setTemplate] = useState<OrgTemplate | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    republic: '',
    minMembers: 2,
    maxMembers: 50,
    requiresEducation: false,
    fieldOfStudy: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const templates = category === 'GOVERNMENT' ? GOV_TEMPLATES : PRIVATE_TEMPLATES;

  // Step 3 auto-fills from template
  const handleTemplateSelect = (t: OrgTemplate) => {
    setTemplate(t);
    setForm(f => ({ ...f, minMembers: t.minMembers, maxMembers: t.maxMembers }));
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!template || !form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: template.type,
        branch: template.branch,
        republic: form.republic || undefined,
        minMembers: form.minMembers,
        maxMembers: form.maxMembers,
        requiresEducation: form.requiresEducation,
        fieldOfStudy: form.requiresEducation ? form.fieldOfStudy : undefined,
        level: 10,
      };
      const result = await api.post<{ id: string; name: string; bankAccount?: { accountNumber: string } }>(
        '/unified-org/organizations', payload
      );
      toast.success(`${result.name} создана! Банковский счёт: ${result.bankAccount?.accountNumber ?? '—'}`);
      router.push(`/organizations/${result.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка создания организации');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step indicator ─────────────────────────────────────────────────────

  const STEPS = ['Категория', 'Тип', 'Данные', 'Подтверждение'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/25">
            <Building2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Создание организации</h1>
          <p className="text-slate-400 text-sm mt-1">
            Государственные или частные структуры с банковским счётом
          </p>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const num = i + 1;
            const done = step > num;
            const active = step === num;
            return (
              <div key={label} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${done ? 'bg-emerald-500 border-emerald-500 text-white' :
                      active ? 'bg-blue-500 border-blue-500 text-white' :
                      'border-slate-700 text-slate-500'}`}>
                    {done ? <Check className="h-4 w-4" /> : num}
                  </div>
                  <span className={`text-[10px] mt-1 ${active ? 'text-white' : 'text-slate-500'}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px flex-1 mx-1 mb-4 transition-all ${done ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Category ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-lg font-semibold text-white mb-4">Выберите категорию</h2>

            <button
              onClick={() => { setCategory('GOVERNMENT'); setStep(2); }}
              className="group w-full p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-400/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">🏛️ Государственная структура</p>
                  <p className="text-sm text-slate-400 mt-0.5">Министерства, Комитеты Хурала, Суды, Регуляторы</p>
                  <p className="text-xs text-blue-400 mt-1">Бесплатно · Требует одобрения лидера ветви власти</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>
            </button>

            <button
              onClick={() => { setCategory('PRIVATE'); setStep(2); }}
              className="group w-full p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-400/50 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">💼 Частное предприятие</p>
                  <p className="text-sm text-slate-400 mt-0.5">ООО, Кооперативы, Гильдии, Стартапы, НКО</p>
                  <p className="text-xs text-emerald-400 mt-1">Взнос 0–500 ₳ · Открытие банковского счёта автоматически</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
            </button>
          </div>
        )}

        {/* ── Step 2: Template ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep(1)} className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">Выберите тип</h2>
            </div>

            <div className="grid gap-3">
              {templates.map(t => (
                <button
                  key={t.type}
                  onClick={() => handleTemplateSelect(t)}
                  className="group w-full p-5 rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 hover:border-slate-600 transition-all text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-slate-700/50 flex items-center justify-center text-slate-300 group-hover:bg-slate-700 transition-colors">
                      {t.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{t.label}</p>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${t.badgeColor}`}>
                          {t.registrationFee === 0 ? 'Бесплатно' : `${t.registrationFee} ₳`}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{t.description}</p>
                      <p className="text-xs text-slate-500 mt-1">Состав: {t.minMembers}–{t.maxMembers} чел.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-300 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Form data ────────────────────────────────────────── */}
        {step === 3 && template && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-white">Данные организации</h2>
                <p className="text-xs text-slate-400">{template.label}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Name — naming rights note */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">
                  Название <span className="text-red-400">*</span>
                  {category === 'GOVERNMENT' && (
                    <span className="ml-2 text-xs text-blue-400">✦ Привилегия именования лидера ветви</span>
                  )}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={
                    category === 'GOVERNMENT'
                      ? 'напр. Министерство иностранных дел'
                      : 'напр. Строительная гильдия «Байкал»'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Описание</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Цели и задачи организации..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                />
              </div>

              {/* Republic / Region */}
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Республика / регион (необязательно)</label>
                <input
                  type="text"
                  value={form.republic}
                  onChange={e => setForm(f => ({ ...f, republic: e.target.value }))}
                  placeholder="напр. Бурятская Республика"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition-all"
                />
              </div>

              {/* Min/Max members */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Мин. членов</label>
                  <input
                    type="number"
                    min={1}
                    value={form.minMembers}
                    onChange={e => setForm(f => ({ ...f, minMembers: +e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white focus:outline-none focus:border-blue-500/60 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Макс. членов</label>
                  <input
                    type="number"
                    min={form.minMembers}
                    value={form.maxMembers}
                    onChange={e => setForm(f => ({ ...f, maxMembers: +e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white focus:outline-none focus:border-blue-500/60 transition-all"
                  />
                </div>
              </div>

              {/* Education requirement */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                <input
                  type="checkbox"
                  checked={form.requiresEducation}
                  onChange={e => setForm(f => ({ ...f, requiresEducation: e.target.checked }))}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-white">Требует образования</p>
                  <p className="text-xs text-slate-400">Члены должны иметь подтверждённую специальность</p>
                </div>
              </label>

              {form.requiresEducation && (
                <input
                  type="text"
                  value={form.fieldOfStudy}
                  onChange={e => setForm(f => ({ ...f, fieldOfStudy: e.target.value }))}
                  placeholder="Специальность (напр. Юриспруденция, Медицина)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition-all"
                />
              )}

              <button
                onClick={() => setStep(4)}
                disabled={!form.name.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white transition-all shadow-lg shadow-blue-500/20"
              >
                Далее →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ─────────────────────────────────────── */}
        {step === 4 && template && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setStep(3)} className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold text-white">Подтверждение</h2>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/30 p-5 space-y-3 mb-6">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-700/50">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  {template.icon}
                </div>
                <div>
                  <p className="font-semibold text-white">{form.name}</p>
                  <p className="text-xs text-slate-400">{template.label}</p>
                </div>
              </div>

              {[
                { label: 'Тип', value: template.type },
                { label: 'Ветвь власти', value: template.branch === 'NONE' ? 'Частная' : template.branch },
                { label: 'Состав', value: `${form.minMembers}–${form.maxMembers} чел.` },
                { label: 'Описание', value: form.description || '—' },
                { label: 'Регион', value: form.republic || '—' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="text-white font-medium text-right max-w-xs truncate">{row.value}</span>
                </div>
              ))}

              {/* Bank account notice */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                <Banknote className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-400">
                  Банковский счёт (ORG-XXXXX-001) будет открыт автоматически
                </p>
              </div>

              {template.registrationFee > 0 && (
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <p className="text-xs text-amber-400">
                    Регистрационный взнос: {template.registrationFee} ALTAN
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 font-bold text-white transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5" />
                  Создать организацию
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

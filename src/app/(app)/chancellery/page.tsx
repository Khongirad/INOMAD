'use client';

import { useState, useEffect } from 'react';
import { Shield, FileText, Scroll, Plus } from 'lucide-react';
import Link from 'next/link';

interface DocumentTemplate {
  id: string;
  type: string;
  name: string;
  nameEn: string;
  govtCode?: string;
  category: string;
  minSignatures: number;
  requiresWitnesses: number;
}

export default function ChancelleryPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // TODO: Fetch templates from API
    setLoading(false);
  }, []);

  const categories = ['all', 'CONTRACT', 'QUEST', 'PETITION', 'CERTIFICATE'];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CONTRACT': return <FileText className="w-5 h-5" />;
      case 'QUEST': return <Scroll className="w-5 h-5" />;
      case 'PETITION': return <Shield className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="container max-w-7xl py-8 space-y-8 animate-in fade-in">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="text-gold-primary w-8 h-8" />
            Канцелярия и Архив
          </h1>
          <p className="text-zinc-400 mt-2">
            Документооборот и правовые договоры Сибирской Конфедерации
          </p>
        </div>
        <Link
          href="/chancellery/documents"
          className="px-4 py-2 bg-gold-primary/10 border border-gold-primary text-gold-primary rounded-lg hover:bg-gold-primary/20 transition"
        >
          Мои Документы
        </Link>
      </div>

      {/* CATEGORY FILTER */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
              filter === cat
                ? 'bg-gold-primary text-black font-medium'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {cat === 'all' ? 'Все Категории' : cat}
          </button>
        ))}
      </div>

      {/* TEMPLATE GALLERY */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-primary mx-auto"></div>
          <p className="text-zinc-400 mt-4">Загрузка шаблонов...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <Scroll className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Шаблоны скоро появятся
          </h3>
          <p className="text-zinc-400">
            База ГОСТ шаблонов находится в разработке
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Link
              key={template.id}
              href={`/chancellery/create/${template.id}`}
              className="group bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 hover:border-gold-primary/50 hover:bg-zinc-800 transition"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gold-primary/10 rounded-lg text-gold-primary group-hover:bg-gold-primary/20 transition">
                  {getCategoryIcon(template.category)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-gold-primary transition">
                    {template.name}
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">{template.nameEn}</p>
                  {template.govtCode && (
                    <p className="text-xs text-zinc-500 mt-2">{template.govtCode}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center gap-4 text-xs text-zinc-400">
                <span>Подписи: {template.minSignatures}+</span>
                {template.requiresWitnesses > 0 && (
                  <span>Свидетели: {template.requiresWitnesses}</span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-gold-primary text-sm font-medium">
                <Plus className="w-4 h-4" />
                Создать документ
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
        <Link
          href="/quests"
          className="p-6 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition group"
        >
          <Scroll className="w-8 h-8 text-purple-400 mb-3" />
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition">
            Доска Заданий
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Публикуйте и выполняйте задания в стиле RPG-квестов
          </p>
        </Link>

        <Link
          href="/archive"
          className="p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition group"
        >
          <Shield className="w-8 h-8 text-blue-400 mb-3" />
          <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition">
            Архив
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Просмотр подписанных и архивных документов
          </p>
        </Link>

        <Link
          href="/history"
          className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition group"
        >
          <FileText className="w-8 h-8 text-green-400 mb-3" />
          <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition">
            История
          </h3>
          <p className="text-sm text-zinc-400 mt-1">
            Хроника событий и юридических актов
          </p>
        </Link>
      </div>
    </div>
  );
}

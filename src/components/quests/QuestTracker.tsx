'use client';

import { Check, Circle } from 'lucide-react';

interface Objective {
  description: string;
  completed: boolean;
  evidence?: string;
}

interface QuestTrackerProps {
  objectives: Objective[];
  progress: number;
  onToggleObjective?: (index: number) => void;
  editable?: boolean;
}

export default function QuestTracker({
  objectives,
  progress,
  onToggleObjective,
  editable = false,
}: QuestTrackerProps) {
  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white font-medium">Progress</span>
          <span className="text-gold-primary">{progress}%</span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-purple-500 to-gold-primary h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Objectives List */}
      <div className="space-y-2">
        {objectives.map((obj, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border transition ${
              obj.completed
                ? 'bg-green-500/5 border-green-500/30'
                : 'bg-zinc-800/50 border-zinc-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <button
                onClick={() => editable && onToggleObjective?.(index)}
                disabled={!editable}
                className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  obj.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-zinc-600 hover:border-purple-400'
                } ${!editable && 'cursor-default'}`}
              >
                {obj.completed && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Description */}
              <div className="flex-1">
                <p className={`text-sm ${
                  obj.completed
                    ? 'text-zinc-400 line-through'
                    : 'text-white'
                }`}>
                  {obj.description}
                </p>
                {obj.evidence && (
                  <a
                    href={obj.evidence}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline mt-1 inline-block"
                  >
                    Evidence →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

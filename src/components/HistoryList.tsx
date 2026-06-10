/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { QuestionHistoryItem } from "../types";
import { HelpCircle, CheckCircle, XCircle, AlertCircle, ArrowUpRight } from "lucide-react";

interface HistoryListProps {
  history: QuestionHistoryItem[];
}

export default function HistoryList({ history }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 px-4 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
        <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 font-medium text-sm">まだ質問をしていません。</p>
        <p className="text-slate-500 text-xs mt-1">「はい」「いいえ」で答えられる質問をして、隠された真実を解き明かしましょう！</p>
      </div>
    );
  }

  // Answer tag styles and icons helper
  const getBadgeStyle = (answer: string) => {
    switch (answer) {
      case "はい":
        return {
          bg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300",
          icon: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
      case "いいえ":
        return {
          bg: "bg-rose-950/80 border-rose-500/40 text-rose-300",
          icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
        };
      case "ゲームに関係ありません":
      default:
        return {
          bg: "bg-slate-800/80 border-slate-700/50 text-slate-350",
          icon: <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />,
        };
    }
  };

  return (
    <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
      {history.slice().reverse().map((item, idx) => {
        const badge = getBadgeStyle(item.answer);
        const originalIndex = history.length - idx;

        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: Math.min(idx * 0.05, 0.3) }}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-750 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2 flex-1">
              {/* Question label */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                  Q{originalIndex}
                </span>
                <h4 className="text-sm md:text-base text-slate-200 font-semibold leading-relaxed tracking-wide">
                  {item.question}
                </h4>
              </div>

              {/* Server reply */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border rounded-full ${badge.bg}`}>
                  {badge.icon}
                  {item.answer}
                </span>
                {item.explanation && (
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    {item.explanation}
                  </p>
                )}
              </div>
            </div>

            {/* Step Progress indicators */}
            <div className="flex items-center gap-3 self-end md:self-auto border-t border-slate-800 md:border-none pt-2 md:pt-0 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1 text-xs text-slate-400 font-mono font-medium">
                  <span>捜査度</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <div className="text-sm font-bold font-mono text-indigo-300">
                  {item.progress}%
                </div>
              </div>
              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                <div 
                  className="h-full bg-indigo-500 rounded-full" 
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

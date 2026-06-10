/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Compass } from "lucide-react";

interface LoadingScreenProps {
  category: string;
}

const LOADING_MESSAGES = [
  "AIが極上のミステリーを調合しています...",
  "誰も目撃していない、不可解な事件を発生させています...",
  "ウミガメが新しいスープをコトコト煮込んでいます...",
  "論理的な矛盾と『たった一つの解決策』を組み立てています...",
  "名探偵でも頭を抱えるオリジナルパズルのピースを準備中...",
  "物語の裏に隠された、驚きの真実を書き換えています...",
];

export default function LoadingScreen({ category }: LoadingScreenProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-8 py-20 bg-slate-900 border border-slate-700/50 rounded-2xl max-w-lg mx-auto shadow-2xl relative overflow-hidden">
      {/* Decorative Blur */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-x-12 -translate-y-12"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl translate-x-12 translate-y-12"></div>

      {/* Rotating Icon */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-8"
      >
        <Compass className="w-8 h-8 text-white" />
      </motion.div>

      {/* Badge */}
      <div className="px-3 py-1 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-mono tracking-wider flex items-center gap-1.5 mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        GENERATE ORIGINAL PUZZLE ({category.toUpperCase()})
      </div>

      {/* Animated Text Change */}
      <div className="h-16 flex items-center justify-center px-4">
        <motion.p
          key={messageIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.6 }}
          className="text-slate-200 text-center text-sm md:text-base font-sans leading-relaxed font-medium"
        >
          {LOADING_MESSAGES[messageIndex]}
        </motion.p>
      </div>

      {/* Progress Line */}
      <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-6">
        <motion.div
          initial={{ left: "-100%" }}
          animate={{ left: "100%" }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          className="relative h-full w-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
        ></motion.div>
      </div>

      <p className="text-slate-500 text-xs mt-4 font-sans font-medium">これには数秒かかる場合があります</p>
    </div>
  );
}

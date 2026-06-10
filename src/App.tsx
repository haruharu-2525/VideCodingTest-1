/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  HelpCircle, 
  Sparkles, 
  RotateCcw, 
  Coins, 
  ArrowLeft, 
  Lightbulb, 
  MessageSquare, 
  Bookmark, 
  Volume2, 
  Award, 
  Search, 
  Flame, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  HeartCrack,
  Smile,
  Ghost
} from "lucide-react";
import { Puzzle, QuestionHistoryItem } from "./types";
import HistoryList from "./components/HistoryList";
import LoadingScreen from "./components/LoadingScreen";

// Define categories mapping for gorgeous UI representations
const CATEGORY_INFO: Record<string, { label: string; bg: string; Border: string; text: string; icon: any }> = {
  Classic: { label: "名作クラシック", bg: "bg-amber-950/40", Border: "border-amber-500/30", text: "text-amber-400", icon: Bookmark },
  Mystery: { label: "本格ミステリー", bg: "bg-indigo-950/40", Border: "border-indigo-500/30", text: "text-indigo-400", icon: Search },
  Horror: { label: "ダーク・ホラー", bg: "bg-rose-950/40", Border: "border-rose-500/30", text: "text-rose-400", icon: Ghost },
  Comedy: { label: "ユーモア・コメディ", bg: "bg-emerald-950/40", Border: "border-emerald-500/30", text: "text-emerald-400", icon: Smile },
  Original: { label: "創作ストーリー", bg: "bg-purple-950/40", Border: "border-purple-500/30", text: "text-purple-400", icon: Sparkles },
};

export default function App() {
  // Puzzles list & loading state
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | "Classic" | "Generated">("All");

  // Selected active puzzle
  const [selectedPuzzle, setSelectedPuzzle] = useState<Puzzle | null>(null);

  // Question & validation states
  const [questionInput, setQuestionInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // Solve (Truth Reveal) states
  const [solveInput, setSolveInput] = useState("");
  const [isSolving, setIsSolving] = useState(false);
  const [solveResult, setSolveResult] = useState<{ isCorrect: boolean; feedback: string; explanation: string } | null>(null);

  // Local-stored state per puzzle
  const [history, setHistory] = useState<QuestionHistoryItem[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHintText, setShowHintText] = useState(false);

  // Generator states
  const [isGenerating, setIsGenerating] = useState(false);
  const [genCategory, setGenCategory] = useState<"Mystery" | "Horror" | "Comedy">("Mystery");

  // Bottom history anchor ref
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Load all puzzles on component mount
  const fetchPuzzles = async () => {
    setIsLoadingPuzzles(true);
    try {
      const response = await fetch("/api/puzzles");
      if (!response.ok) throw new Error("パズルの取得に失敗しました");
      const data = await response.json();
      setPuzzles(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingPuzzles(false);
    }
  };

  useEffect(() => {
    fetchPuzzles();
  }, []);

  // When selected puzzle changes, load its personal state from localStorage to resume session!
  useEffect(() => {
    if (selectedPuzzle) {
      const savedHistory = localStorage.getItem(`history-${selectedPuzzle.id}`);
      const savedProgress = localStorage.getItem(`progress-${selectedPuzzle.id}`);
      const savedHint = localStorage.getItem(`hint-${selectedPuzzle.id}`);
      const savedSolved = localStorage.getItem(`solved-${selectedPuzzle.id}`);

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        setHistory([]);
      }

      if (savedProgress) {
        setCurrentProgress(parseInt(savedProgress, 10));
      } else {
        setCurrentProgress(0);
      }

      if (savedHint) {
        setHintUsed(savedHint === "true");
      } else {
        setHintUsed(false);
      }
      setShowHintText(false);

      if (savedSolved) {
        setSolveResult(JSON.parse(savedSolved));
      } else {
        setSolveResult(null);
      }

      // Reset input fields
      setQuestionInput("");
      setSolveInput("");
      setAskError(null);
    } else {
      setHistory([]);
      setCurrentProgress(0);
      setHintUsed(false);
      setShowHintText(false);
      setSolveResult(null);
    }
  }, [selectedPuzzle]);

  // Save history state changes to localStorage
  const saveGameState = (pId: string, newHistory: QuestionHistoryItem[], newProgress: number) => {
    localStorage.setItem(`history-${pId}`, JSON.stringify(newHistory));
    localStorage.setItem(`progress-${pId}`, String(newProgress));
  };

  // AI Generation Trigger
  const generateOriginalPuzzle = async (category: "Mystery" | "Horror" | "Comedy") => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/puzzles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!response.ok) throw new Error("AIクイズの生成に失敗しました。");
      const newPuzzle = await response.json();
      setPuzzles((prev) => [newPuzzle, ...prev]);
      setSelectedPuzzle(newPuzzle);
    } catch (error: any) {
      alert(error.message || "予期せぬエラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  // Ask Question Submission
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !selectedPuzzle || isAsking) return;

    // Client-side quick check: warn if it does not look like yes/no
    const lowerQ = questionInput.trim();
    const warns = ["なぜ", "何故", "どうして", "なに", "誰が", "どこで", "いつ", "何歳", "何時", "原因は"];
    const containsOpenQuestionWord = warns.some(word => lowerQ.includes(word));

    setAskError(null);
    setIsAsking(true);

    try {
      const response = await fetch("/api/puzzles/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: selectedPuzzle.id,
          question: lowerQ,
          history,
        }),
      });

      if (!response.ok) throw new Error("通信に失敗しました。");
      const result = await response.json();

      const newHistoryItem: QuestionHistoryItem = {
        id: `q-${Date.now()}`,
        question: lowerQ,
        answer: result.answer,
        explanation: result.explanation,
        progress: result.progress,
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
      };

      const updatedHistory = [...history, newHistoryItem];
      setHistory(updatedHistory);

      // Transition the progress bar smoothly
      const highestProgress = Math.max(result.progress, currentProgress);
      setCurrentProgress(highestProgress);

      saveGameState(selectedPuzzle.id, updatedHistory, highestProgress);
      setQuestionInput("");

      // If warning triggers, provide feedback helper
      if (containsOpenQuestionWord) {
        setAskError("💡 AIヒント: はい/いいえで答えられない疑問詞(なぜ、何等)が含まれていたため、判定が「関係ありません」等に偏りやすい傾向があります。");
      }
    } catch (err: any) {
      setAskError("質問の送信に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsAsking(false);
    }
  };

  // Submit Answer/Guess Solve
  const handleSolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solveInput.trim() || !selectedPuzzle || isSolving) return;

    setIsSolving(true);
    try {
      const response = await fetch("/api/puzzles/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: selectedPuzzle.id,
          userGuess: solveInput,
        }),
      });

      if (!response.ok) throw new Error("通信に失敗しました。");
      const result = await response.json();

      setSolveResult(result);
      if (result.isCorrect) {
        // Correct answer gets 100% progress!
        setCurrentProgress(100);
        localStorage.setItem(`progress-${selectedPuzzle.id}`, "100");
        localStorage.setItem(`solved-${selectedPuzzle.id}`, JSON.stringify(result));
      }
    } catch (err) {
      alert("解答の送信に失敗しました。");
    } finally {
      setIsSolving(false);
    }
  };

  // Reset progress for this specific puzzle
  const handleResetPuzzle = () => {
    if (!selectedPuzzle) return;
    if (confirm("この問題の質問履歴と進捗状況を完全にリセットします。よろしいですか？")) {
      localStorage.removeItem(`history-${selectedPuzzle.id}`);
      localStorage.removeItem(`progress-${selectedPuzzle.id}`);
      localStorage.removeItem(`hint-${selectedPuzzle.id}`);
      localStorage.removeItem(`solved-${selectedPuzzle.id}`);
      setHistory([]);
      setCurrentProgress(0);
      setHintUsed(false);
      setShowHintText(false);
      setSolveResult(null);
      setQuestionInput("");
      setSolveInput("");
    }
  };

  // Turn on visual developer hint
  const handleUseHint = () => {
    setHintUsed(true);
    setShowHintText(true);
    if (selectedPuzzle) {
      localStorage.setItem(`hint-${selectedPuzzle.id}`, "true");
    }
  };

  // Filter puzzles based on tab
  const filteredPuzzles = puzzles.filter((p) => {
    if (activeTab === "Classic") return !p.isGenerated;
    if (activeTab === "Generated") return p.isGenerated;
    return true;
  });

  // Calculate descriptive progress status
  const getProgressLabel = (progress: number) => {
    if (progress === 100) return { title: "真相解明！完全クリア", color: "bg-emerald-500", text: "text-emerald-300", glow: "shadow-emerald-500/30" };
    if (progress >= 80) return { title: "確信段階（ほぼ掌握）", color: "bg-indigo-500", text: "text-indigo-300", glow: "shadow-indigo-500/30" };
    if (progress >= 50) return { title: "核心寸前（トリック考察）", color: "bg-purple-500", text: "text-purple-300", glow: "shadow-purple-500/30" };
    if (progress >= 20) return { title: "捜査進展中（輪郭認知）", color: "bg-blue-500", text: "text-blue-300", glow: "shadow-blue-500/30" };
    return { title: "混迷（事件発生）", color: "bg-slate-500", text: "text-slate-400", glow: "shadow-slate-500/10" };
  };

  const progressStatus = getProgressLabel(currentProgress);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 antialiased overflow-x-hidden">
      {/* Dynamic Ambient Background Aura */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-violet-900/10 via-indigo-900/10 to-teal-900/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header Container */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Flame className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-none">
                水平思考クイズ
              </h1>
              <p className="text-[10px] text-indigo-400 font-mono tracking-widest mt-0.5">LATERAL THINKING MASTER</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-900 border border-slate-800 rounded-full px-3 py-1 font-mono text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI GameMaster Active
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Loading Generate overlay */}
        {isGenerating && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <LoadingScreen category={genCategory} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!selectedPuzzle ? (
            /* ========================================================
               PUZZLE DIRECTORY / HOME SCREEN
               ======================================================== */
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
              id="puzzle-selection-screen"
            >
              {/* Call-to-action Promo Banner */}
              <div className="relative p-6 md:p-8 rounded-2xl border border-indigo-500/20 bg-slate-900/60 overflow-hidden shadow-xl">
                {/* Visual Accent Layer */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl translate-x-20 -translate-y-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl -translate-x-20 translate-y-20 pointer-events-none" />

                <div className="relative z-10 max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 rounded-full text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    次世代AIとの思考バトル
                  </div>
                  <h2 className="text-2xl md:text-3.5xl font-extrabold text-slate-100 leading-tight">
                    真相を暴く、無限の謎解きへ。
                  </h2>
                  <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                    「はい」「いいえ」の回答ヒントから不可解なストーリーの本当の姿を解き明かしてください。<br />
                    名作クイズはもちろん、AIに頼んでオリジナルな完全新作クイズをその場で創り出すこともできます！
                  </p>

                  {/* AI Quick generator triggers */}
                  <div className="pt-2">
                    <p className="text-slate-350 text-xs font-bold mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      AIに完全新作クイズを創ってもらう：
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      <button
                        onClick={() => { setGenCategory("Mystery"); generateOriginalPuzzle("Mystery"); }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/15"
                        id="gen-mystery-btn"
                      >
                        <Search className="w-3.5 h-3.5 text-indigo-200" />
                        本格ミステリーを生成
                      </button>
                      <button
                        onClick={() => { setGenCategory("Horror"); generateOriginalPuzzle("Horror"); }}
                        className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 font-bold text-xs text-rose-350 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/15"
                        id="gen-horror-btn"
                      >
                        <Ghost className="w-3.5 h-3.5 text-rose-400" />
                        ダーク・ホラーを生成
                      </button>
                      <button
                        onClick={() => { setGenCategory("Comedy"); generateOriginalPuzzle("Comedy"); }}
                        className="px-4 py-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 font-bold text-xs text-emerald-350 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/15"
                        id="gen-comedy-btn"
                      >
                        <Smile className="w-3.5 h-3.5 text-emerald-400" />
                        ユーモア・コメディを生成
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Puzzle Selector Section */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
                      <Bookmark className="w-5 h-5 text-indigo-400" />
                      問題を選択して挑戦
                    </h3>
                    <p className="text-xs text-slate-500">
                      好きな問題を選んでスタート。一度中断しても、同じブラウザなら質問の進捗が自動保存されます。
                    </p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto font-medium">
                    <button
                      onClick={() => setActiveTab("All")}
                      className={`px-3 py-1.5 rounded-lg transition ${activeTab === "All" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      すべて
                    </button>
                    <button
                      onClick={() => setActiveTab("Classic")}
                      className={`px-3 py-1.5 rounded-lg transition ${activeTab === "Classic" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      名作
                    </button>
                    <button
                      onClick={() => setActiveTab("Generated")}
                      className={`px-3 py-1.5 rounded-lg transition ${activeTab === "Generated" ? "bg-slate-800 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      AI生成オリジナル
                    </button>
                  </div>
                </div>

                {/* Puzzle Grid */}
                {isLoadingPuzzles ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-64 rounded-2xl bg-slate-900/40 border border-slate-850 animate-pulse flex flex-col justify-between p-6">
                        <div className="space-y-3">
                          <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                          <div className="h-6 bg-slate-800 rounded w-2/3"></div>
                          <div className="h-12 bg-slate-800 rounded"></div>
                        </div>
                        <div className="h-8 bg-slate-800 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredPuzzles.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-slate-850 rounded-2xl bg-slate-900/20">
                    <HelpCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">該当する問題が見つかりません。</p>
                    {activeTab === "Generated" && (
                      <p className="text-slate-500 text-xs mt-2">
                        上のボタンから新しいAIオリジナルクイズを今すぐ生成して追加しましょう！
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPuzzles.map((puzzle, index) => {
                      const category = CATEGORY_INFO[puzzle.category] || CATEGORY_INFO.Mystery;
                      const CatIcon = category.icon;

                      // Check progress and solution status from localStorage
                      const localProgress = parseInt(localStorage.getItem(`progress-${puzzle.id}`) || "0", 10);
                      const isComplete = localProgress === 100;

                      return (
                        <motion.div
                          key={puzzle.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                          className={`p-6 rounded-2xl bg-slate-900 border border-slate-850 hover:border-slate-700 hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-72 group relative overflow-hidden`}
                          id={`puzzle-card-${puzzle.id}`}
                        >
                          {/* Inner glowing hover accent */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-indigo-500/0 to-indigo-500/[0.02] group-hover:to-indigo-500/[0.06] transition-all duration-300 pointer-events-none" />

                          <div className="space-y-4">
                            {/* Badges row */}
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${category.bg} ${category.Border} ${category.text}`}>
                                <CatIcon className="w-3 h-3" />
                                {category.label}
                              </span>

                              {/* Save/Sync Local Status marker */}
                              {isComplete ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  解決済
                                </span>
                              ) : localProgress > 0 ? (
                                <span className="text-[11px] font-medium text-indigo-400 bg-indigo-950/40 border border-indigo-500/10 px-2 py-0.5 rounded-md font-mono">
                                  進捗: {localProgress}%
                                </span>
                              ) : null}
                            </div>

                            {/* Title */}
                            <h4 className="text-lg font-bold text-slate-150 leading-snug group-hover:text-indigo-400 transition-colors">
                              {puzzle.title}
                            </h4>

                            {/* Brief Story clamp for teaser */}
                            <p className="text-xs text-slate-400 font-sans leading-relaxed line-clamp-3">
                              {puzzle.story}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-slate-850 flex items-center justify-between bg-transparent">
                            <span className="text-[11px] text-slate-500 font-mono">
                              {puzzle.isGenerated ? "Generated by Gemini" : "Official Classic"}
                            </span>
                            <button
                              onClick={() => setSelectedPuzzle(puzzle)}
                              className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer group-hover:shadow-md group-hover:shadow-indigo-500/10"
                            >
                              <Play className="w-3 h-3 fill-current shrink-0" />
                              挑戦する
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ========================================================
               ACTIVE GAMEPLAY BOARD
               ======================================================== */
            <motion.div
              key="gameplay"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
              id="active-gameplay-board"
            >
              {/* Back button and title */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                  onClick={() => setSelectedPuzzle(null)}
                  className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition duration-200 group text-sm font-semibold cursor-pointer py-1"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  問題一覧に戻る
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetPuzzle}
                    title="進行状況を最初からリセット"
                    className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl text-slate-400 hover:text-rose-400 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    リセット
                  </button>
                </div>
              </div>

              {/* Grid: Primary details */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column (8 cols): Story and Input area */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Story Card */}
                  <div className="rounded-2xl bg-slate-900 border border-indigo-500/10 shadow-xl overflow-hidden relative">
                    {/* Visual indicator corner */}
                    <div className="absolute top-0 right-0 py-1.5 px-3 bg-indigo-500/10 border-b border-l border-indigo-500/20 text-[10px] uppercase font-mono tracking-widest text-indigo-300 font-bold">
                      Mystery File
                    </div>

                    <div className="p-6 md:p-8 space-y-5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${CATEGORY_INFO[selectedPuzzle.category]?.bg} ${CATEGORY_INFO[selectedPuzzle.category]?.text} ${CATEGORY_INFO[selectedPuzzle.category]?.Border}`}>
                          {CATEGORY_INFO[selectedPuzzle.category]?.label}
                        </span>
                        <span className="text-xs text-slate-500 font-bold font-mono">ID: {selectedPuzzle.id}</span>
                      </div>

                      <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">
                        {selectedPuzzle.title}
                      </h2>

                      {/* Story Context Paragraph */}
                      <p className="text-slate-200 leading-relaxed font-sans font-medium text-sm md:text-base border-l-4 border-indigo-500 pl-4 py-1.5 bg-slate-950/25 rounded-r">
                        {selectedPuzzle.story}
                      </p>
                    </div>

                    {/* HINT BOARD inside Story Card */}
                    <div className="border-t border-slate-800 bg-slate-950/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-2.5">
                        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-slate-350 font-bold">ヒントが必要ですか？</p>
                          <p className="text-[11px] text-slate-500">
                            どうしても行き詰まった場合は、ゲームマスターが最初のきっかけを共有します。
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {showHintText ? (
                          <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl max-w-md">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">💡 Game Master Hint</span>
                            <p className="text-xs text-amber-200 leading-relaxed font-sans">{selectedPuzzle.hint || "はい/いいえで絞り込める具体的な道具や、登場人物の矛盾する行動に着目してみましょう。"}</p>
                          </div>
                        ) : (
                          <button
                            onClick={handleUseHint}
                            className="px-4 py-2 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl transition cursor-pointer"
                          >
                            ヒントを表示
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Core Form Section: Game Over / Correct state vs Asking area */}
                  {solveResult?.isCorrect ? (
                    /* solved overlay screen with celebration */
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-6 md:p-8 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/10 shadow-2xl relative overflow-hidden"
                      id="solved-celebration-panel"
                    >
                      <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
                      
                      <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-2 shadow-lg shadow-emerald-500/20 animate-bounce">
                          <Award className="w-10 h-10 text-emerald-400" />
                        </div>

                        <span className="text-xs font-bold text-emerald-400 tracking-widest uppercase bg-emerald-950 border border-emerald-500/30 px-3 py-1 rounded-full">
                          CASE SOLVED · 真相解明
                        </span>

                        <h3 className="text-2xl font-black text-slate-100">おめでとうございます！見事に解決しました！</h3>
                        
                        <p className="text-slate-300 text-sm max-w-lg leading-relaxed font-sans mb-4">
                          {solveResult.feedback}
                        </p>

                        {/* Complete Canon Truth reveal */}
                        <div className="w-full text-left p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                          <span className="text-xs font-bold text-slate-400 tracking-wider">【真の結末・真相解説】</span>
                          <p className="text-sm text-slate-350 leading-relaxed font-sans whitespace-pre-line">
                            {selectedPuzzle.solution}
                          </p>
                        </div>

                        <button
                          onClick={() => setSelectedPuzzle(null)}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer mt-4"
                        >
                          別の未解決事件に挑む
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    /* ACTIVE GAMEWAY FORMS */
                    <div className="space-y-6">
                      
                      {/* Step Progress Bar Block (Top Visual requirement!) */}
                      <div className="p-4 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Flame className="w-4 h-4 text-indigo-400" />
                              <span className="text-sm font-bold text-slate-200">事件の捜査進捗</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1 font-sans">
                              質問に対して「はい」や、真相に近い有力な仮説を得るとゲージが上昇します。
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-950/60 border border-indigo-500/20 px-2.5 py-0.5 rounded-full inline-block">
                              {progressStatus.title}
                            </span>
                            <div className="text-2.5xl font-extrabold font-mono text-slate-100 mt-0.5">
                              {currentProgress}%
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar with custom glowing animation */}
                        <div className="relative w-full h-4 bg-slate-950 rounded-full border border-slate-800 overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${currentProgress}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={`h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 rounded-full relative`}
                          >
                            <div className="absolute top-0 right-0 bottom-0 w-2.5 bg-white/40 blur-sm rounded-full animate-pulse" />
                          </motion.div>
                        </div>

                        <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                          <span>0% 謎</span>
                          <span>25% 捜査開始</span>
                          <span>50% 核心接近</span>
                          <span>75% 確信</span>
                          <span>95% 完勝寸前</span>
                        </div>
                      </div>

                      {/* TWO TABS: Ask Questions vs Submit Guess */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Box 1: ASK QUESTION */}
                        <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-1.5">
                              <MessageSquare className="w-4 h-4 text-blue-400" />
                              1. 質問して真相を絞り込む
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                              「はい」か「いいえ」で答えられるような質問を送りましょう。
                            </p>
                            
                            <form onSubmit={handleAskQuestion} className="space-y-3" id="ask-question-form">
                              <textarea
                                value={questionInput}
                                onChange={(e) => setQuestionInput(e.target.value)}
                                disabled={isAsking}
                                placeholder="質問を入力してください..."
                                className="w-full text-sm p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-sans resize-none h-20"
                                maxLength={100}
                              />

                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>最大 100 文字</span>
                                {questionInput.length > 0 && (
                                  <span>{questionInput.length} / 100</span>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={isAsking || !questionInput.trim()}
                                className="w-full py-2.5 bg-slate-800 hover:bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                              >
                                {isAsking ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    AI考査官が判定中...
                                  </>
                                ) : (
                                  "質問を投げかける"
                                )}
                              </button>
                            </form>
                          </div>

                          {/* Quick validation warnings */}
                          {askError && (
                            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-amber-200 font-sans mt-2">
                              {askError}
                            </div>
                          )}
                        </div>

                        {/* Box 2: SUBMIT ANSWER (GUESS) */}
                        <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-1.5">
                              <Award className="w-4 h-4 text-emerald-400" />
                              2. 真相を解き明かす（最終解答）
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
                              謎の全貌を説明してください。主要な行動や動機が合っていれば正解となります。
                            </p>
                            
                            <form onSubmit={handleSolve} className="space-y-3" id="solve-puzzle-form">
                              <textarea
                                value={solveInput}
                                onChange={(e) => setSolveInput(e.target.value)}
                                disabled={isSolving}
                                placeholder="真相（答え）を入力してください..."
                                className="w-full text-sm p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-sans resize-none h-20"
                                maxLength={250}
                              />

                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>最大 250 文字</span>
                                {solveInput.length > 0 && (
                                  <span>{solveInput.length} / 250</span>
                                )}
                              </div>

                              <button
                                type="submit"
                                disabled={isSolving || !solveInput.trim()}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                              >
                                {isSolving ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                                    AI検証中...
                                  </>
                                ) : (
                                  "真相を提出してクリア判定"
                                )}
                              </button>
                            </form>
                          </div>

                          {/* Solve feedback message (if incorrect) */}
                          {solveResult && !solveResult.isCorrect && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs flex items-start gap-2 text-rose-300 font-sans"
                            >
                              <HeartCrack className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                              <div>
                                <p className="font-bold">まだ何かが足りないようです...</p>
                                <p className="text-[11px] mt-1 text-slate-350 leading-relaxed">
                                  {solveResult.feedback}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>
                        
                      </div>

                    </div>
                  )}

                  {/* History List Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-850">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-bold text-slate-200">これまでの質問履歴（{history.length}件）</h3>
                      </div>
                      <span className="text-xs text-slate-500">新しい質問が一番上に表示されます</span>
                    </div>

                    <HistoryList history={history} />
                    <div ref={historyEndRef} />
                  </div>

                </div>

                {/* Right Column (4 cols): Lateral thinking reference & manual */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Gameplay guideline Manual */}
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <HelpCircle className="w-4.5 h-4.5 text-indigo-400" />
                      水平思考ゲームの遊び方
                    </h3>

                    <div className="space-y-3.5 text-xs text-slate-350 leading-relaxed font-sans">
                      <p>
                        水平思考（シチュエーション）クイズは、出題される不思議で矛盾に満ちた【物語の前提】から、質問を駆使して本当の背景をあぶり出す推理ゲームです。
                      </p>

                      <ul className="space-y-2 list-disc list-inside">
                        <li>
                          <strong className="text-indigo-300">「はい」か「いいえ」で答える質問</strong><br />
                          「男は絶望しましたか？」というような、Yes/Noで判定できる質問が極めて強力です。
                        </li>
                        <li>
                          <strong className="text-indigo-300">進捗度ゲージの特徴</strong><br />
                          真相の核心・キートリックに触れるたびに、捜査度（％）が上昇していきます。
                        </li>
                        <li>
                          <strong className="text-indigo-300">真相提出について</strong><br />
                          十分に背景を掴んだら「真相を暴く」に答えを入力してください。主要な要素があっていればAIマスターから合格が出ます。
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Standard rule prompts templates */}
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                      捜査の切り口（おすすめの質問例）
                    </h3>

                    <div className="space-y-2 text-[11px] text-slate-400 font-sans">
                      <div 
                        onClick={() => { if (!isAsking) setQuestionInput("登場人物の職業や年齢は関係ありますか？"); }}
                        className="p-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-850 hover:text-white rounded-xl transition cursor-pointer text-left font-medium block"
                      >
                        「登場人物の職業や年齢は関係ありますか？」
                      </div>
                      <div
                        onClick={() => { if (!isAsking) setQuestionInput("出来事が起きた場所や天気に重要なヒントがありますか？"); }}
                        className="p-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-850 hover:text-white rounded-xl transition cursor-pointer text-left font-medium block"
                      >
                        「出来事が起きた場所や天気に重要なヒントがありますか？」
                      </div>
                      <div
                        onClick={() => { if (!isAsking) setQuestionInput("犯行や事故、または何かに騙されているなどの状況ですか？"); }}
                        className="p-2.5 bg-slate-950 border border-slate-850 hover:bg-slate-850 hover:text-white rounded-xl transition cursor-pointer text-left font-medium block"
                      >
                        「犯行や事故、または何かに騙されている状況ですか？」
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Humble Footer */}
      <footer className="border-t border-slate-905 bg-slate-950 py-10 mt-20 text-center text-xs text-slate-600 font-sans">
        <p>© 2026 水平思考クイズゲーム. Powered by Gemini 3.5 AI & Antigravity Platform.</p>
      </footer>
    </div>
  );
}

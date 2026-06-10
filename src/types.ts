/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Puzzle {
  id: string;
  title: string;
  story: string;     // 出題されるストーリー（問題文）
  solution: string;  // 隠された真相（答え）
  isGenerated: boolean;
  category: "Classic" | "Original" | "Mystery" | "Horror" | "Comedy";
  hint?: string;     // 必要があればヒント
}

export type AnswerType = "はい" | "いいえ" | "ゲームに関係ありません";

export interface QuestionHistoryItem {
  id: string;
  question: string;
  answer: AnswerType;
  explanation: string; // 補足説明
  progress: number;    // 進捗率 (0-100)
  timestamp: string;
}

export interface SolveResponse {
  isCorrect: boolean;
  explanation: string;
  feedback: string;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { CLASSIC_PUZZLES } from "./src/data/classicPuzzles";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini SDK with User-Agent for AI Studio telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Puzzles list - in-memory combination of classic and generated puzzles
const serverPuzzles = [...CLASSIC_PUZZLES];

// 1. Get List of Puzzles
app.get("/api/puzzles", (req, res) => {
  try {
    res.json(serverPuzzles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Generate a custom, original lateral thinking puzzle
app.post("/api/puzzles/generate", async (req, res) => {
  const { category = "Mystery" } = req.body;

  try {
    const prompt = `あなたは「水平思考クイズ」の天才ゲームデザイナーです。
ジャンル「${category}」の、完全にオリジナルの面白い水平思考クイズ（ウミガメのスープ）を作成してください。

水平思考クイズのルール:
- 【問題文 (story)】: 一見すると不可解、矛盾している、あるいは不条理な出来事。しかし論理的な「たった一つの真相」が存在するシチュエーション。
- 【真相 (solution)】: なぜその出来事が起きたのかの論理的かつ意外性のある解答。超常現象や魔法ではなく、現実的な状況で納得がいき、すべての矛盾が解消されるもの。

以下の情報をJSONフォーマットで出力してください。
- title: 魅力的なタイトル（日本語）
- story: 不思議で引き込まれる問題文。150文字〜300文字程度（日本語）
- solution: すべての疑問に答え、矛盾を完全に解消する論理的で意外性のある真相。200文字〜400文字程度（日本語）
- hint: 最初の一歩となるヒント（日本語）

既存の「ウミガメのスープ」「エレベーターの男」「暗闇の灯台守」「しゃっくりと水」などの超有名パズルそのものは絶対に出さず、彼らの構造を参考にした「完全新作」にしてください。`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "クイズのタイトル" },
            story: { type: Type.STRING, description: "不可解なストーリー・問題文" },
            solution: { type: Type.STRING, description: "隠された明確な真相" },
            hint: { type: Type.STRING, description: "プレイヤーへの最初のヒント" },
          },
          required: ["title", "story", "solution", "hint"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Geminiから有効なレスポンスが得られませんでした。");
    }

    const data = JSON.parse(responseText);

    const newPuzzle = {
      id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      story: data.story,
      solution: data.solution,
      hint: data.hint,
      category,
      difficulty: "普通",
      isGenerated: true,
    };

    serverPuzzles.push(newPuzzle);
    res.json(newPuzzle);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "生成に失敗しました。" });
  }
});

// 3. Ask a question regarding the puzzle
app.post("/api/puzzles/ask", async (req, res) => {
  const { puzzleId, question, history } = req.body;

  try {
    const puzzle = serverPuzzles.find((p) => p.id === puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: "指定されたパズルが見つかりません。" });
    }

    const historyText = history
      ?.map((h: any) => `Q: ${h.question}\nA: ${h.answer} (${h.explanation})`)
      .join("\n");

    const prompt = `あなたは「水平思考クイズ」の親切なゲームマスターです。
お題となるパズルの【問題文】と【真相】に対して、プレイヤーが質問をしました。

【パズルタイトル】: ${puzzle.title}
【問題文】: ${puzzle.story}
【真相（真の結末と理由）】: ${puzzle.solution}

これまでのやりとり履歴:
${historyText || "なし"}

現在のプレイヤーの質問: 「${question}」

この質問を評価し、ルールの範囲内で答えてください。
ルール:
1. 回答(answer)は、厳密に以下のいずれかでなければなりません。
   - "はい" : 質問が真相に合致している、あるいは正しい方向を向いている場合。
   - "いいえ" : 質問が真相と矛盾している、あるいは間違った方向を向いている場合。
   - "ゲームに関係ありません" : 質問の答えが「はい / いいえ」で答えられない（例: 「犯人の名前は何ですか？」）か、または真相解明に全く直接関係のない情報。
2. 補足(explanation): 「はい」「いいえ」だけではプレイヤーが行き詰まる可能性があるため、回答を補助する15文字〜20文字以内の補足コメント（例：「（はい：男は歩いて移動していました）」「（いいえ：男は10階ではなく1階に行きました）」など）。真相を直接言及してはいけません。
3. 進捗率(progress): 0から100の数値（整数）。これまでの質問履歴とこの最新の質問を踏まえ、プレイヤーがパズルの「核心（真相）」にどれだけ近づいているかを客観的に評価してください。
   - 初期の質問や関係ない質問: 0 〜 15%
   - 登場人物の状況や前提条件を絞り込めた: 20 〜 40%
   - 事件の重要な要素やトリックに気付き始めた: 50 〜 75%
   - 真相のほぼ全てを見破っており、あとは回答するだけの状態: 85 〜 95%
   - （※完璧にクリアするまでは95%以下に留めてください）
   - 以前より確実に真相に迫る質問であれば、前回の進捗（履歴の最高値）より少し高めのパーセンテージを算出してください。

以下のJSON形式で回答してください:
{
  "answer": "はい" | "いいえ" | "ゲームに関係ありません",
  "explanation": "20文字以内の補正カッコ内の一言",
  "progress": 整数値(0-95)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: "厳密に 'はい', 'いいえ', 'ゲームに関係ありません' のいずれか",
            },
            explanation: {
              type: Type.STRING,
              description: "解答を補助する15〜20文字以内の補足、真相は直接言及しない",
            },
            progress: {
              type: Type.INTEGER,
              description: "真相への進捗率（0から100までの整数、クリア前は上限95）",
            },
          },
          required: ["answer", "explanation", "progress"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("回答の評価中にエラーが発生しました。");
    }

    const data = JSON.parse(responseText);
    res.json({
      answer: data.answer,
      explanation: data.explanation,
      progress: Math.min(95, Math.max(0, data.progress)), // ensure progress stays between 0 and 95 prior to solving
    });
  } catch (error: any) {
    console.error("Ask endpoint error:", error);
    res.status(500).json({ error: error.message || "質問の送信に失敗しました。" });
  }
});

// 4. Solve the puzzle (Evaluate final explanation)
app.post("/api/puzzles/solve", async (req, res) => {
  const { puzzleId, userGuess } = req.body;

  try {
    const puzzle = serverPuzzles.find((p) => p.id === puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: "指定されたパズルが見つかりません。" });
    }

    const prompt = `あなたは「水平思考クイズ」の厳格かつ公正なゲームマスターです。
プレイヤーが、パズルの真相を当てにいきました（回答の送信）。

【パズルタイトル】: ${puzzle.title}
【問題文】: ${puzzle.story}
【正解の真相（すべての真実と理由）】: ${puzzle.solution}

【プレイヤーの推測・回答】:
「${userGuess}」

プレイヤーの回答が、この【正解の真相】の『核心部分』を十分に捉えているかを判定してください。
完全一致である必要はありません。主要な動機、トリック、原因、または鍵となる要素（例: ウミガメスープなら「自分で食べた肉が妻の肉だと気付いた」、エレベーターなら「身長が低くてボタンに届かない」等）の辻褄が合っていれば「正解（クリア）」と判定してください。

以下のJSON形式で回答を判定してください。
- isCorrect: boolean型 (核心を捉えていれば true, まだ重要なポイントを誤解していたり情報が足りない、または的外れなら false)
- feedback: プレイヤーへのフィードバック（日本語）。
  - 正解(isCorrect=true)の場合: 「正解です！」という祝福の言葉とともに、なぜ正解なのか解説を交え、プレイヤーの推理力を称えるコメント（150文字程度）。
  - 不正解(isCorrect=false)の場合: どこか惜しい点があるか、あるいは全く別の方向なのかをやさしく指摘し、次の質問を促すアドバイス。直接答えを完全にバラしてはいけません（150文字程度）。
- explanation: このパズルの真実の【正解の真相】（表示用、puzzle.solutionを要約またはそのまま日本語で）。

JSON出力形式:
{
  "isCorrect": true または false,
  "feedback": "プレイヤーへのコメント...",
  "explanation": "このクイズの本当の真相の解説文..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN, description: "核心を捉えているか" },
            feedback: { type: Type.STRING, description: "判定結果に対する親切なアドバイスや祝福" },
            explanation: { type: Type.STRING, description: "パズルの核心的な真相・最終解説文" },
          },
          required: ["isCorrect", "feedback", "explanation"],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("回答判定中にエラーが発生しました。");
    }

    const data = JSON.parse(responseText);
    res.json({
      isCorrect: data.isCorrect,
      feedback: data.feedback,
      explanation: puzzle.solution, // We show the canonical solution for authenticity
    });
  } catch (error: any) {
    console.error("Solve endpoint error:", error);
    res.status(500).json({ error: error.message || "回答の判定に失敗しました。" });
  }
});

// Configure Vite or Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Level Up: Horizontal Thinking Puzzle Game running on http://localhost:${PORT}`);
  });
}

startServer();

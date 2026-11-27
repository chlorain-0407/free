import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ObjectId } from "mongodb";
import type { WithId, Document } from "mongodb";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import {
  DatabaseConfigError,
  getDb,
  initDatabaseOnStartup,
} from "./server/db.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = "gemini-4-hydrogen";

const DEFAULT_SIGNATURE = {
  enabled: false,
  name: "",
  branch: "",
  phone: "",
  lineId: "",
  licenseNumber: "",
};

function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function handleDbError(res: Response, err: unknown, fallbackMessage: string) {
  if (err instanceof DatabaseConfigError) {
    res.status(503).json({ error: err.message, code: "DB_NOT_CONFIGURED" });
    return;
  }
  // Log only safe error name/code on server; never log URI or send raw errors to client
  const errName = err instanceof Error ? err.name : "DatabaseError";
  console.error(`[MongoDB] Operation failed (${errName})`);
  res.status(500).json({ error: fallbackMessage });
}

function serializeDraftDoc(doc: WithId<Document>) {
  const createdAt =
    doc.createdAt instanceof Date
      ? doc.createdAt.getTime()
      : typeof doc.createdAt === "number"
      ? doc.createdAt
      : Date.now();
  const updatedAt =
    doc.updatedAt instanceof Date
      ? doc.updatedAt.getTime()
      : typeof doc.updatedAt === "number"
      ? doc.updatedAt
      : createdAt;

  const source =
    doc.source === "toolbox"
      ? "toolbox"
      : doc.source === "visual"
      ? "visual"
      : "guided";

  return {
    id: doc._id.toHexString(),
    source,
    title: typeof doc.title === "string" ? doc.title : "",
    categoryLabel:
      typeof doc.categoryLabel === "string" ? doc.categoryLabel : "",
    toneLabel: typeof doc.toneLabel === "string" ? doc.toneLabel : undefined,
    prompt: typeof doc.prompt === "string" ? doc.prompt : "",
    draft: typeof doc.draft === "string" ? doc.draft : "",
    isFavorite: Boolean(doc.isFavorite),
    createdAt,
    updatedAt,
  };
}

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction: string,
  maxRetries = 2
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });
      const text = response.text?.trim();
      if (!text) {
        throw new Error("模型未回傳文字內容，請稍後再試。");
      }
      return text;
    } catch (err: unknown) {
      lastError = err;
      const status =
        typeof err === "object" && err !== null && "status" in err
          ? Number((err as { status?: number }).status)
          : 0;
      const isRetryable = status === 429 || status >= 500 || status === 0;
      if (attempt < maxRetries && isRetryable) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === "object" && err !== null && "status" in err
      ? Number((err as { status?: number }).status)
      : 500;

  if (
    status === 400 &&
    (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("API key"))
  ) {
    return {
      status: 400,
      message: "Gemini API 金鑰無效，請前往 Settings > Secrets 檢查金鑰設定。",
    };
  }
  if (status === 403 || rawMessage.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message: "目前 API 金鑰權限不足，請前往 Settings > Secrets 確認金鑰設定。",
    };
  }
  if (status === 429 || rawMessage.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message: "API 請求次數已達上限，請稍候再試，或檢查 Settings > Secrets 配額設定。",
    };
  }
  return {
    status: status >= 400 && status < 600 ? status : 500,
    message: "AI 文案生成暫時發生錯誤，請稍後再試。",
  };
}

const REAL_ESTATE_SYSTEM_INSTRUCTION = `你是一位擁有 15 年台灣不動產實務經驗的資深頂尖房仲顧問與文案總監，熟悉台灣房地產交易流程、實價登錄、公設比、格局採光、專任委託、斡旋金、買賣要約書、房地合一稅 2.0、自住重購退稅、新青安貸款與央行信用管制規範。

請嚴格遵守以下輸出原則：
1. 全程使用道地的「繁體中文（台灣用語）」，自然貼近台灣房仲第一線溝通習慣（例如：社區、權狀坪數、公設比、坡平車位、格局方正、實價登錄、屋主惜屋、斡旋、專任委託）。絕對不要出現中國大陸用語（如：小區、業主、房產中介、毛坯房、首付、物業費）。
2. 直接產出「可直接複製貼上使用」的實戰文案或話術草稿，不要加上多餘的開場寒暄（例如「好的，以下是為您撰寫的...」）或結尾說明。
3. 排版清晰、段落留白舒適，適合手機螢幕閱讀與直接傳送 LINE／簡訊／張貼社群。
4. 涉及稅務或貸款法規時，以白話易懂的方式舉例說明，並在文末加上一句簡短專業提醒（例如「實際稅額與貸款條件仍以國稅局核定及銀行鑑價審核為準」），符合台灣不動產經紀業合規精神。
5. 不要自行編造未提供的業務姓名、電話或店名（系統會在仲介複製時自動帶入個人簽名檔）。`;

const REFINE_PROMPTS: Record<string, string> = {
  concise:
    "請將以下台灣房仲文案／話術「再精簡一點」：保留最關鍵的賣點、數據與行動呼籲，刪除贅字與冗長鋪陳，字數精簡約 30%～40%，讓客戶在手機上 10 秒內就能看完重點。只回傳修改後的完整文案，不加任何說明。",
  softer:
    "請將以下台灣房仲文案／話術改寫得「語氣更委婉」：降低推銷感與壓迫感，多一點同理心、尊重與暖心顧問角度，讓屋主或買方感到被理解而願意回覆對話。保留核心資訊與台灣房仲專業用語。只回傳修改後的完整文案，不加任何說明。",
  line_emoji:
    "請將以下台灣房仲文案／話術改寫成「加上 emoji 適合傳 LINE」的版本：加入適度、克制且有質感的 emoji（如 🏡、✨、📍、💬、📊 等，不要過度浮誇洗版），善用空行與條列符號讓 LINE 對話視窗閱讀起來輕鬆清楚，保留原本核心資訊與專業度。只回傳修改後的完整文案，不加任何說明。",
};

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "12mb" }));

  // Trigger MongoDB connection & idempotent index initialization on startup without blocking port binding
  void initDatabaseOnStartup();

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      dbConfigured: Boolean(process.env.MONGODB_URI?.trim()),
    });
  });

  // ==========================================
  // MongoDB Full-Stack Persistence API Routes
  // ==========================================

  // 1. Load entire workstation state (signature + favorite_templates + drafts)
  app.get("/api/workspace", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const [signatureDoc, favDocs, draftDocs] = await Promise.all([
        db.collection("signatures").findOne({ profileKey: "default" }),
        db
          .collection("favorite_templates")
          .find({})
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray(),
        db
          .collection("drafts")
          .find({})
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
      ]);

      const signature = signatureDoc
        ? {
            enabled: Boolean(signatureDoc.enabled),
            name: typeof signatureDoc.name === "string" ? signatureDoc.name : "",
            branch:
              typeof signatureDoc.branch === "string" ? signatureDoc.branch : "",
            phone:
              typeof signatureDoc.phone === "string" ? signatureDoc.phone : "",
            lineId:
              typeof signatureDoc.lineId === "string" ? signatureDoc.lineId : "",
            licenseNumber:
              typeof signatureDoc.licenseNumber === "string"
                ? signatureDoc.licenseNumber
                : "",
          }
        : DEFAULT_SIGNATURE;

      const favoriteTemplateIds = favDocs
        .map((d) => (typeof d.templateId === "string" ? d.templateId : ""))
        .filter(Boolean);

      const drafts = draftDocs.map(serializeDraftDoc);

      res.json({ signature, favoriteTemplateIds, drafts });
    } catch (err: unknown) {
      handleDbError(res, err, "讀取工作站資料庫失敗，請稍後重試。");
    }
  });

  // 2. Save/update personal signature profile
  app.put("/api/signature", async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const nextSignature = {
        enabled: Boolean(body.enabled),
        name: sanitizeString(body.name, 80),
        branch: sanitizeString(body.branch, 120),
        phone: sanitizeString(body.phone, 40),
        lineId: sanitizeString(body.lineId, 80),
        licenseNumber: sanitizeString(body.licenseNumber, 80),
      };

      const db = await getDb();
      const now = new Date();
      await db.collection("signatures").updateOne(
        { profileKey: "default" },
        {
          $set: {
            ...nextSignature,
            updatedAt: now,
          },
          $setOnInsert: {
            profileKey: "default",
            createdAt: now,
          },
        },
        { upsert: true }
      );

      res.json({ signature: nextSignature });
    } catch (err: unknown) {
      handleDbError(res, err, "儲存個人簽名檔失敗，請稍後再試。");
    }
  });

  // 3. Toggle favorite toolbox template
  app.post("/api/favorites/templates/toggle", async (req: Request, res: Response) => {
    try {
      const rawId = req.body?.templateId;
      if (typeof rawId !== "string" || !/^[a-z0-9-]{2,64}$/.test(rawId)) {
        res.status(400).json({ error: "範本編號格式不正確。" });
        return;
      }

      const db = await getDb();
      const col = db.collection("favorite_templates");
      const existing = await col.findOne({ templateId: rawId });

      if (existing) {
        await col.deleteOne({ templateId: rawId });
        res.json({ templateId: rawId, isFavorite: false });
        return;
      }

      const now = new Date();
      try {
        await col.insertOne({
          templateId: rawId,
          createdAt: now,
          updatedAt: now,
        });
      } catch (insertErr: unknown) {
        const code =
          typeof insertErr === "object" &&
          insertErr !== null &&
          "code" in insertErr
            ? Number((insertErr as { code?: number }).code)
            : 0;
        // Unique index duplicate key means it's already favorited
        if (code !== 11000) throw insertErr;
      }

      res.json({ templateId: rawId, isFavorite: true });
    } catch (err: unknown) {
      handleDbError(res, err, "更新範本收藏狀態失敗，請稍後再試。");
    }
  });

  // 4. List recent drafts
  app.get("/api/drafts", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      const docs = await db
        .collection("drafts")
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      res.json({ drafts: docs.map(serializeDraftDoc) });
    } catch (err: unknown) {
      handleDbError(res, err, "讀取使用紀錄失敗，請稍後再試。");
    }
  });

  // 5. Create a new draft/history record
  app.post("/api/drafts", async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const source =
        body.source === "toolbox"
          ? "toolbox"
          : body.source === "visual"
          ? "visual"
          : "guided";
      const title = sanitizeString(body.title, 160);
      const categoryLabel = sanitizeString(body.categoryLabel, 60);
      const toneLabel = sanitizeString(body.toneLabel, 60);
      const prompt = sanitizeString(body.prompt, 10000);
      const draft = sanitizeString(body.draft, 12000);
      const isFavorite = Boolean(body.isFavorite);

      if (!title || !prompt) {
        res.status(400).json({ error: "缺少必要欄位（標題或提示詞）。" });
        return;
      }

      const db = await getDb();
      const now = new Date();
      const doc = {
        source,
        title,
        categoryLabel,
        ...(toneLabel ? { toneLabel } : {}),
        prompt,
        draft,
        isFavorite,
        createdAt: now,
        updatedAt: now,
      };

      const result = await db.collection("drafts").insertOne(doc);
      res.status(201).json({
        draft: serializeDraftDoc({ _id: result.insertedId, ...doc }),
      });
    } catch (err: unknown) {
      handleDbError(res, err, "儲存實戰紀錄失敗，請稍後再試。");
    }
  });

  // 6. Update an existing draft (toggle favorite or update refined copy)
  app.patch("/api/drafts/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        res.status(400).json({ error: "無效的紀錄編號。" });
        return;
      }

      const body = req.body ?? {};
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (typeof body.isFavorite === "boolean") {
        updates.isFavorite = body.isFavorite;
      }
      if (typeof body.draft === "string") {
        updates.draft = sanitizeString(body.draft, 12000);
      }

      const db = await getDb();
      const updated = await db
        .collection("drafts")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" }
        );

      if (!updated) {
        res.status(404).json({ error: "找不到該筆紀錄。" });
        return;
      }

      res.json({ draft: serializeDraftDoc(updated) });
    } catch (err: unknown) {
      handleDbError(res, err, "更新實戰紀錄失敗，請稍後再試。");
    }
  });

  // 7. Delete a single draft record
  app.delete("/api/drafts/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        res.status(400).json({ error: "無效的紀錄編號。" });
        return;
      }

      const db = await getDb();
      const result = await db
        .collection("drafts")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        res.status(404).json({ error: "找不到該筆紀錄。" });
        return;
      }

      res.json({ deleted: true, id });
    } catch (err: unknown) {
      handleDbError(res, err, "刪除紀錄失敗，請稍後再試。");
    }
  });

  // 8. Clear unfavorited history drafts
  app.delete("/api/drafts", async (req: Request, res: Response) => {
    try {
      const scope = req.query.scope;
      if (scope !== "unfavorited") {
        res.status(400).json({ error: "僅支援清除未收藏紀錄。" });
        return;
      }

      const db = await getDb();
      const result = await db
        .collection("drafts")
        .deleteMany({ isFavorite: { $ne: true } });

      res.json({ deletedCount: result.deletedCount });
    } catch (err: unknown) {
      handleDbError(res, err, "清除未收藏紀錄失敗，請稍後再試。");
    }
  });

  // ==========================================
  // Gemini AI Generation Routes
  // ==========================================

  app.post("/api/generate", async (req: Request, res: Response) => {
    try {
      const prompt =
        typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
      if (!prompt) {
        res.status(400).json({ error: "請提供有效的提示詞內容。" });
        return;
      }
      if (prompt.length > 8000) {
        res.status(400).json({ error: "提示詞長度超出上限，請精簡後再試。" });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "尚未設定 Gemini API 金鑰，請在 Settings > Secrets 確認 GEMINI_API_KEY。",
        });
        return;
      }

      const draft = await generateWithRetry(
        ai,
        prompt,
        REAL_ESTATE_SYSTEM_INSTRUCTION
      );
      res.json({ text: draft });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post("/api/refine", async (req: Request, res: Response) => {
    try {
      const draft =
        typeof req.body?.draft === "string" ? req.body.draft.trim() : "";
      const mode = typeof req.body?.mode === "string" ? req.body.mode : "";

      if (!draft || !(mode in REFINE_PROMPTS)) {
        res.status(400).json({ error: "請提供有效的草稿內容與微調方式。" });
        return;
      }
      if (draft.length > 8000) {
        res.status(400).json({ error: "文案長度超出上限。" });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "尚未設定 Gemini API 金鑰，請在 Settings > Secrets 確認 GEMINI_API_KEY。",
        });
        return;
      }

      const fullPrompt = `${REFINE_PROMPTS[mode]}\n\n【原始文案／話術】\n${draft}`;
      const refined = await generateWithRetry(
        ai,
        fullPrompt,
        REAL_ESTATE_SYSTEM_INSTRUCTION
      );
      res.json({ text: refined });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Multimodal photo-to-copywriting endpoint for Mode C
  const ALLOWED_IMAGE_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);
  const ALLOWED_ROOM_AREAS = new Set([
    "客廳",
    "廚房",
    "臥室",
    "陽台",
    "外觀公設",
    "格局圖",
  ]);
  const ALLOWED_VISION_PURPOSES = new Set([
    "FB 吸睛貼文",
    "591 條列賣點",
    "帶看亮點筆記",
  ]);

  app.post("/api/vision-analyze", async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const mimeType =
        typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
      const imageBase64 =
        typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
      const roomArea =
        typeof body.roomArea === "string" ? body.roomArea.trim() : "";
      const outputPurpose =
        typeof body.outputPurpose === "string" ? body.outputPurpose.trim() : "";

      if (!ALLOWED_IMAGE_MIMES.has(mimeType)) {
        res.status(400).json({
          error: "僅支援 JPG、PNG 或 WebP 格式的房屋照片。",
        });
        return;
      }
      if (!imageBase64 || imageBase64.length > 10_500_000) {
        res.status(400).json({
          error: "照片檔案過大或格式不完整，請選擇 8MB 以內的圖片。",
        });
        return;
      }
      if (!/^[A-Za-z0-9+/=\r\n]+$/.test(imageBase64)) {
        res.status(400).json({ error: "照片編碼格式異常，請重新上傳。" });
        return;
      }
      if (
        !ALLOWED_ROOM_AREAS.has(roomArea) ||
        !ALLOWED_VISION_PURPOSES.has(outputPurpose)
      ) {
        res.status(400).json({ error: "請選擇有效的照片區域與輸出用途。" });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            "尚未設定 Gemini API 金鑰，請在 Settings > Secrets 確認 GEMINI_API_KEY。",
        });
        return;
      }

      const purposeInstructions: Record<string, string> = {
        "FB 吸睛貼文":
          "撰寫適合發佈在 Facebook 粉專／地方社團的吸睛貼文：前兩句有強烈生活畫面感鉤子，中段條列照片看得見的真實優勢（採光、空間感、動線、收納或裝潢質感），結尾加上低壓力私訊賞屋呼籲與 4~5 個台灣在地 Hashtag。",
        "591 條列賣點":
          "撰寫適合刊登在 591 房屋交易網的專業條列賣點：包含 1 個 28 字內高點擊亮點副標與 4~6 點客觀具體的空間優勢條列，嚴守台灣不動產廣告真實原則、不捏造照片中看不到的坪數或總價。",
        "帶看亮點筆記":
          "整理成房仲現場帶看可直接照唸的「帶看亮點筆記」：包含進入此空間時的開場引導句、3 個最值得提醒買方注意的視覺細節（如採光面向、通風動線、家具擺放彈性），以及 1 句引導買方想像入住生活的提問。",
      };

      const analysisPrompt = `請以台灣資深不動產仲介與空間攝影顧問的專業眼光，仔細分析這張「${roomArea}」的照片，並輸出 JSON 結果：

1. detectedHighlights：從照片中實際觀察到的 3～4 個空間優勢（例如採光條件、空間通透感、動線規劃、裝潢材質、景觀視野或格局方正度；若是格局圖則分析動線、採光面、零走道浪費或雙衛浴開窗等特徵）。嚴禁捏造照片中不存在的資訊。
2. copywriting：依據「${outputPurpose}」撰寫可直接複製使用的繁體中文（台灣房仲用語）實戰文案。要求：${purposeInstructions[outputPurpose]}
3. needsPhotoImprovement：誠實評估這張照片是否存在光線偏暗／背光、拍攝角度壓迫或傾斜、雜物干擾畫面、裁切不完整等影響刊登吸引力的問題（true 或 false）。
4. reshootTips：若照片光線太暗、角度不佳或有雜物干擾（needsPhotoImprovement 為 true），務必提供 1～2 條具體、手機當場就能做到的「重拍優化建議」（例如：打開室內全部燈具並開啟手機 0.5x 廣角從門框角落水平拍攝、收起流理台雜物等）；若照片拍攝品質已經非常優秀，可回傳空陣列 []。`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            { text: analysisPrompt },
          ],
        },
        config: {
          systemInstruction: REAL_ESTATE_SYSTEM_INSTRUCTION,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 to 4 concrete visual strengths observed in the photo.",
              },
              copywriting: {
                type: Type.STRING,
                description: "Ready-to-use Traditional Chinese real estate copywriting.",
              },
              needsPhotoImprovement: {
                type: Type.BOOLEAN,
                description: "True if lighting, angle, framing, or clutter can be improved.",
              },
              reshootTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "1 to 2 actionable mobile reshoot suggestions if photo can be improved.",
              },
            },
            required: [
              "detectedHighlights",
              "copywriting",
              "needsPhotoImprovement",
              "reshootTips",
            ],
          },
        },
      });

      const rawJson = (response.text ?? "").trim();
      if (!rawJson) {
        throw new Error("模型未回傳分析結果，請稍後再試。");
      }

      const parsed = JSON.parse(rawJson) as {
        detectedHighlights?: unknown;
        copywriting?: unknown;
        needsPhotoImprovement?: unknown;
        reshootTips?: unknown;
      };

      const detectedHighlights = Array.isArray(parsed.detectedHighlights)
        ? parsed.detectedHighlights
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .slice(0, 6)
        : [];
      const copywriting =
        typeof parsed.copywriting === "string" ? parsed.copywriting.trim() : "";
      const reshootTips = Array.isArray(parsed.reshootTips)
        ? parsed.reshootTips
            .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
            .slice(0, 2)
        : [];
      const needsPhotoImprovement =
        Boolean(parsed.needsPhotoImprovement) || reshootTips.length > 0;

      if (!copywriting) {
        throw new Error("照片分析完成，但未產生文案，請重新嘗試。");
      }

      res.json({
        detectedHighlights,
        copywriting,
        needsPhotoImprovement,
        reshootTips,
      });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("Not found");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

import type {
  RefineMode,
  RoomArea,
  SavedDraftItem,
  SignatureProfile,
  VisionAnalysisResult,
  VisionOutputPurpose,
} from "../types/workstation";

export interface WorkspacePayload {
  signature: SignatureProfile;
  favoriteTemplateIds: string[];
  drafts: SavedDraftItem[];
}

export interface CreateDraftInput {
  source: "guided" | "toolbox" | "visual";
  title: string;
  categoryLabel: string;
  toneLabel?: string;
  prompt: string;
  draft: string;
  isFavorite?: boolean;
}

async function parseApiResponse<T>(
  res: Response,
  fallbackError: string
): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!isJson) {
    if (!res.ok) {
      throw new Error(fallbackError);
    }
    throw new Error("後端 API 回傳格式異常，請重新整理頁面後再試。");
  }

  let data: (T & { error?: string }) | null = null;
  try {
    data = (await res.json()) as T & { error?: string };
  } catch {
    throw new Error(fallbackError);
  }

  if (!res.ok || !data) {
    throw new Error(data?.error || fallbackError);
  }
  return data;
}

export async function fetchWorkspaceData(): Promise<WorkspacePayload> {
  const res = await fetch("/api/workspace");
  const data = await parseApiResponse<Partial<WorkspacePayload>>(
    res,
    "無法讀取資料庫內容，請稍後重試。"
  );
  if (!data.signature || !Array.isArray(data.favoriteTemplateIds) || !Array.isArray(data.drafts)) {
    throw new Error("資料庫回應格式不完整，請稍後重試。");
  }
  return {
    signature: data.signature,
    favoriteTemplateIds: data.favoriteTemplateIds,
    drafts: data.drafts,
  };
}

export async function saveSignatureProfileApi(
  profile: SignatureProfile
): Promise<SignatureProfile> {
  const res = await fetch("/api/signature", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  const data = await parseApiResponse<{ signature: SignatureProfile }>(
    res,
    "儲存個人簽名檔失敗，請稍後再試。"
  );
  return data.signature;
}

export async function toggleFavoriteTemplateApi(
  templateId: string
): Promise<{ templateId: string; isFavorite: boolean }> {
  const res = await fetch("/api/favorites/templates/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId }),
  });
  return parseApiResponse<{ templateId: string; isFavorite: boolean }>(
    res,
    "更新範本收藏狀態失敗，請稍後再試。"
  );
}

export async function createDraftRecordApi(
  input: CreateDraftInput
): Promise<SavedDraftItem> {
  const res = await fetch("/api/drafts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseApiResponse<{ draft: SavedDraftItem }>(
    res,
    "儲存實戰紀錄失敗，請稍後再試。"
  );
  return data.draft;
}

export async function updateDraftRecordApi(
  id: string,
  patch: { isFavorite?: boolean; draft?: string }
): Promise<SavedDraftItem> {
  const res = await fetch(`/api/drafts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const data = await parseApiResponse<{ draft: SavedDraftItem }>(
    res,
    "更新實戰紀錄失敗，請稍後再試。"
  );
  return data.draft;
}

export async function deleteDraftRecordApi(id: string): Promise<void> {
  const res = await fetch(`/api/drafts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  await parseApiResponse<{ deleted: boolean }>(
    res,
    "刪除紀錄失敗，請稍後再試。"
  );
}

export async function clearUnfavoritedDraftsApi(): Promise<number> {
  const res = await fetch("/api/drafts?scope=unfavorited", {
    method: "DELETE",
  });
  const data = await parseApiResponse<{ deletedCount: number }>(
    res,
    "清除未收藏紀錄失敗，請稍後再試。"
  );
  return data.deletedCount;
}

export async function generateRealEstateDraft(prompt: string): Promise<string> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await parseApiResponse<{ text?: string }>(
    res,
    "生成實戰草稿失敗，請稍後再試。"
  );

  if (!data.text) {
    throw new Error("未收到 AI 回覆內容，請重新點擊生成。");
  }
  return data.text;
}

export async function refineRealEstateDraft(
  draft: string,
  mode: RefineMode
): Promise<string> {
  const res = await fetch("/api/refine", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, mode }),
  });

  const data = await parseApiResponse<{ text?: string }>(
    res,
    "微調文案失敗，請稍後再試。"
  );

  if (!data.text) {
    throw new Error("未收到微調後的文案，請再試一次。");
  }
  return data.text;
}

export async function analyzePropertyPhotoApi(params: {
  imageBase64: string;
  mimeType: string;
  roomArea: RoomArea;
  outputPurpose: VisionOutputPurpose;
}): Promise<VisionAnalysisResult> {
  const res = await fetch("/api/vision-analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = await parseApiResponse<VisionAnalysisResult>(
    res,
    "分析房屋照片失敗，請確認圖片格式後再試一次。"
  );

  return {
    detectedHighlights: Array.isArray(data.detectedHighlights)
      ? data.detectedHighlights
      : [],
    copywriting: typeof data.copywriting === "string" ? data.copywriting : "",
    needsPhotoImprovement: Boolean(data.needsPhotoImprovement),
    reshootTips: Array.isArray(data.reshootTips) ? data.reshootTips : [],
  };
}

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquareText,
  Briefcase,
  Image as ImageIcon,
  Bookmark,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type {
  SavedDraftItem,
  SignatureProfile,
  WorkspaceTab,
} from "./types/workstation";
import {
  DEFAULT_SIGNATURE,
  appendSignatureIfEnabled,
  copyToClipboard,
  hasSignatureContent,
} from "./utils/storage";
import {
  fetchWorkspaceData,
  saveSignatureProfileApi,
  toggleFavoriteTemplateApi,
  createDraftRecordApi,
  updateDraftRecordApi,
  deleteDraftRecordApi,
  clearUnfavoritedDraftsApi,
  type CreateDraftInput,
} from "./utils/api";
import { GuidedWorkspace } from "./components/GuidedWorkspace";
import { ToolboxWorkspace } from "./components/ToolboxWorkspace";
import { VisualAssistantWorkspace } from "./components/VisualAssistantWorkspace";
import { LibraryWorkspace } from "./components/LibraryWorkspace";
import { SignatureDrawer } from "./components/SignatureDrawer";

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("guided");
  const [signature, setSignature] =
    useState<SignatureProfile>(DEFAULT_SIGNATURE);
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>([]);
  const [historyItems, setHistoryItems] = useState<SavedDraftItem[]>([]);

  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState<boolean>(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState<boolean>(false);

  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(
    null
  );
  const [toast, setToast] = useState<{
    message: string;
    variant: "info" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, variant: "info" | "error" = "info") => {
      setToast({ message, variant });
    },
    []
  );

  const loadWorkspace = useCallback(async () => {
    setIsWorkspaceLoading(true);
    setWorkspaceError(null);
    try {
      const data = await fetchWorkspaceData();
      setSignature({ ...DEFAULT_SIGNATURE, ...(data.signature ?? {}) });
      setFavoriteTemplateIds(
        Array.isArray(data.favoriteTemplateIds) ? data.favoriteTemplateIds : []
      );
      setHistoryItems(Array.isArray(data.drafts) ? data.drafts : []);
    } catch (err: unknown) {
      setWorkspaceError(
        err instanceof Error
          ? err.message
          : "無法連線至資料庫，請稍後再試。"
      );
    } finally {
      setIsWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleCopyPrompt = useCallback(
    async (text: string) => {
      const ok = await copyToClipboard(text);
      showToast(
        ok
          ? "已複製專業提示詞，可直接貼上 ChatGPT 或 Gemini"
          : "複製失敗，請手動選取文字複製",
        ok ? "info" : "error"
      );
    },
    [showToast]
  );

  const handleCopyDraft = useCallback(
    async (text: string) => {
      const { finalText, signatureAppended } = appendSignatureIfEnabled(
        text,
        signature
      );
      const ok = await copyToClipboard(finalText);
      if (!ok) {
        showToast("複製失敗，請手動選取文字複製", "error");
        return;
      }
      showToast(
        signatureAppended
          ? "已複製實戰文案（已自動附加個人簽名檔）"
          : "已複製實戰文案，可直接貼上傳送"
      );
    },
    [signature, showToast]
  );

  const handleCopyPlainText = useCallback(
    async (text: string, toastText: string) => {
      const ok = await copyToClipboard(text);
      showToast(
        ok ? toastText : "複製失敗，請手動選取文字複製",
        ok ? "info" : "error"
      );
    },
    [showToast]
  );

  const handleSaveSignature = async (nextProfile: SignatureProfile) => {
    setIsSavingSignature(true);
    try {
      const saved = await saveSignatureProfileApi(nextProfile);
      const normalized = { ...DEFAULT_SIGNATURE, ...(saved ?? nextProfile) };
      setSignature(normalized);
      setWorkspaceError(null);
      showToast(
        normalized.enabled && hasSignatureContent(normalized)
          ? "已儲存簽名檔至資料庫，複製文案時將自動附加"
          : "已儲存個人簽名檔設定"
      );
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "儲存簽名檔失敗，請稍後再試。",
        "error"
      );
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleToggleFavoriteTemplate = useCallback(
    async (templateId: string) => {
      try {
        const res = await toggleFavoriteTemplateApi(templateId);
        setFavoriteTemplateIds((prev) =>
          res.isFavorite
            ? [templateId, ...prev.filter((id) => id !== templateId)]
            : prev.filter((id) => id !== templateId)
        );
        showToast(res.isFavorite ? "已加入我的最愛" : "已從我的最愛移除範本");
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "更新範本收藏失敗，請稍後再試。",
          "error"
        );
      }
    },
    [showToast]
  );

  const handleSaveHistory = useCallback(
    async (input: CreateDraftInput): Promise<SavedDraftItem | null> => {
      try {
        const created = await createDraftRecordApi(input);
        setHistoryItems((prev) => [created, ...prev].slice(0, 50));
        return created;
      } catch (err: unknown) {
        showToast(
          err instanceof Error
            ? err.message
            : "草稿已產出，但寫入資料庫紀錄失敗。",
          "error"
        );
        return null;
      }
    },
    [showToast]
  );

  const handleUpdateDraftContent = useCallback(
    async (id: string, nextDraft: string) => {
      try {
        const updated = await updateDraftRecordApi(id, { draft: nextDraft });
        setHistoryItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
      } catch {
        // Non-blocking sync failure during refinement
      }
    },
    []
  );

  const handleToggleHistoryFavorite = useCallback(
    async (id: string) => {
      const target = historyItems.find((item) => item.id === id);
      if (!target) return;
      const nextFav = !target.isFavorite;
      try {
        const updated = await updateDraftRecordApi(id, { isFavorite: nextFav });
        setHistoryItems((prev) =>
          prev.map((item) => (item.id === id ? updated : item))
        );
        showToast(nextFav ? "已收藏此實戰文案" : "已取消收藏此文案");
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "更新收藏狀態失敗，請稍後再試。",
          "error"
        );
      }
    },
    [historyItems, showToast]
  );

  const isHistoryItemFavorited = useCallback(
    (id: string) => {
      return historyItems.some((item) => item.id === id && item.isFavorite);
    },
    [historyItems]
  );

  const handleDeleteHistoryItem = useCallback(
    async (id: string) => {
      try {
        await deleteDraftRecordApi(id);
        setHistoryItems((prev) => prev.filter((item) => item.id !== id));
        showToast("已刪除該筆紀錄");
      } catch (err: unknown) {
        showToast(
          err instanceof Error ? err.message : "刪除紀錄失敗，請稍後再試。",
          "error"
        );
      }
    },
    [showToast]
  );

  const handleClearUnfavoritedHistory = useCallback(async () => {
    try {
      await clearUnfavoritedDraftsApi();
      setHistoryItems((prev) => prev.filter((item) => item.isFavorite));
      showToast("已清除未收藏的使用紀錄");
    } catch (err: unknown) {
      showToast(
        err instanceof Error ? err.message : "清除紀錄失敗，請稍後再試。",
        "error"
      );
    }
  }, [showToast]);

  const handleOpenTemplateFromLibrary = useCallback((templateId: string) => {
    setPendingTemplateId(templateId);
    setActiveTab("toolbox");
  }, []);

  const signatureActive =
    Boolean(signature?.enabled) && hasSignatureContent(signature);
  const totalFavoritesCount =
    favoriteTemplateIds.length +
    historyItems.filter((item) => item.isFavorite).length;

  return (
    <div className="min-h-dvh bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Navigation Bar (Strict 3-zone, 56px height) */}
      <header className="sticky top-0 z-30 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab("guided")}
            className="text-base font-bold tracking-tight text-[#1E3A5F] whitespace-nowrap shrink-0 sm:text-lg"
          >
            房仲 AI 提示詞工作站
          </button>

          {/* Zone 2: Clean Single-line Nav Links (Desktop) */}
          <nav
            aria-label="主要功能切換"
            className="hidden md:flex items-center gap-7 text-sm font-semibold"
          >
            <button
              type="button"
              onClick={() => setActiveTab("guided")}
              className={`relative py-4 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "guided"
                  ? "text-[#1E3A5F]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              對話式提示詞引導
              {activeTab === "guided" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#D97706]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("toolbox")}
              className={`relative py-4 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "toolbox"
                  ? "text-[#1E3A5F]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              實戰提示詞百寶箱
              {activeTab === "toolbox" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#D97706]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={`relative py-4 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "visual"
                  ? "text-[#1E3A5F]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              圖片與視覺 AI 助手
              {activeTab === "visual" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#D97706]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={`relative py-4 transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                activeTab === "library"
                  ? "text-[#1E3A5F]"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              收藏與紀錄
              {totalFavoritesCount > 0 ? ` (${totalFavoritesCount})` : ""}
              {activeTab === "library" && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#D97706]" />
              )}
            </button>
          </nav>

          {/* Zone 3: Primary Action — Custom Signature Settings */}
          <button
            type="button"
            onClick={() => setIsSignatureOpen(true)}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              signatureActive
                ? "border-[#1E3A5F] bg-[#F2F6FA] text-[#1E3A5F]"
                : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
            }`}
          >
            <UserCheck
              className={`h-4 w-4 ${
                signatureActive ? "text-[#D97706]" : "text-slate-500"
              }`}
              aria-hidden="true"
            />
            <span>個人簽名檔{signatureActive ? "・已啟用" : ""}</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Database Error Banner (if MONGODB_URI not configured or connection error) */}
        {workspaceError && activeTab !== "library" && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <div className="flex items-center gap-2.5">
              <AlertCircle
                className="h-4 w-4 shrink-0 text-amber-700"
                aria-hidden="true"
              />
              <span>{workspaceError}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              重新連線
            </button>
          </div>
        )}

        {/* Page Heading & Top Mode Switcher Tabs */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl [text-wrap:balance]">
              {activeTab === "guided" && "對話式 AI 提示詞引導"}
              {activeTab === "toolbox" && "實戰提示詞百寶箱"}
              {activeTab === "visual" && "圖片與視覺 AI 助手"}
              {activeTab === "library" && "我的最愛與最近使用紀錄"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {activeTab === "guided" &&
                "3 步驟快速組裝台灣房仲專屬提示詞，並即時產出可直接傳 LINE、貼社群的實戰話術。"}
              {activeTab === "toolbox" &&
                "12 組台灣不動產高頻實戰範本，點擊快速填空即可替換社區與開價變數、一鍵複製或生成草稿。"}
              {activeTab === "visual" &&
                "上傳房屋照片由 AI 自動抓賣點寫文案，或透過 3 步驟產生高精度中英文房仲繪圖提示詞。"}
              {activeTab === "library" &&
                "所有收藏範本、個人簽名檔與近期產出草稿皆透過後端 API 儲存於您的 MongoDB 資料庫。"}
            </p>
          </div>

          {/* Primary 3-Mode + Library Switcher Tabs */}
          <div
            role="tablist"
            aria-label="工作站模式切換"
            className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:inline-flex sm:w-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "guided"}
              onClick={() => setActiveTab("guided")}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap sm:px-3.5 sm:text-sm ${
                activeTab === "guided"
                  ? "bg-[#1E3A5F] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <MessageSquareText
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "guided" ? "text-amber-400" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              <span>對話引導</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "toolbox"}
              onClick={() => setActiveTab("toolbox")}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap sm:px-3.5 sm:text-sm ${
                activeTab === "toolbox"
                  ? "bg-[#1E3A5F] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Briefcase
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "toolbox" ? "text-amber-400" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              <span>百寶箱 (12)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "visual"}
              onClick={() => setActiveTab("visual")}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap sm:px-3.5 sm:text-sm ${
                activeTab === "visual"
                  ? "bg-[#1E3A5F] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <ImageIcon
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "visual" ? "text-amber-400" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              <span>圖片視覺 AI</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "library"}
              onClick={() => setActiveTab("library")}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap tabular-nums sm:px-3.5 sm:text-sm ${
                activeTab === "library"
                  ? "bg-[#1E3A5F] text-white"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Bookmark
                className={`h-4 w-4 shrink-0 ${
                  activeTab === "library" ? "text-amber-400" : "text-slate-400"
                }`}
                aria-hidden="true"
              />
              <span>
                收藏紀錄
                {totalFavoritesCount > 0 ? ` (${totalFavoritesCount})` : ""}
              </span>
            </button>
          </div>
        </div>

        {/* Active Workspace View */}
        {activeTab === "guided" && (
          <GuidedWorkspace
            signature={signature}
            onCopyPrompt={handleCopyPrompt}
            onCopyDraft={handleCopyDraft}
            onSaveHistory={handleSaveHistory}
            onUpdateDraftContent={handleUpdateDraftContent}
            onToggleHistoryFavorite={handleToggleHistoryFavorite}
            isHistoryItemFavorited={isHistoryItemFavorited}
          />
        )}

        {activeTab === "toolbox" && (
          <ToolboxWorkspace
            signature={signature}
            favoriteTemplateIds={favoriteTemplateIds}
            initialSelectedTemplateId={pendingTemplateId}
            onClearInitialSelectedTemplate={() => setPendingTemplateId(null)}
            onToggleFavoriteTemplate={handleToggleFavoriteTemplate}
            onCopyPrompt={handleCopyPrompt}
            onCopyDraft={handleCopyDraft}
            onSaveHistory={handleSaveHistory}
            onUpdateDraftContent={handleUpdateDraftContent}
            onToggleHistoryFavorite={handleToggleHistoryFavorite}
            isHistoryItemFavorited={isHistoryItemFavorited}
          />
        )}

        {activeTab === "visual" && (
          <VisualAssistantWorkspace
            signature={signature}
            onCopyPrompt={handleCopyPrompt}
            onCopyDraft={handleCopyDraft}
            onCopyPlainText={handleCopyPlainText}
            onSaveHistory={handleSaveHistory}
            onUpdateDraftContent={handleUpdateDraftContent}
            onToggleHistoryFavorite={handleToggleHistoryFavorite}
            isHistoryItemFavorited={isHistoryItemFavorited}
          />
        )}

        {activeTab === "library" && (
          <LibraryWorkspace
            favoriteTemplateIds={favoriteTemplateIds}
            historyItems={historyItems}
            isLoading={isWorkspaceLoading}
            error={workspaceError}
            onRetryLoad={() => void loadWorkspace()}
            onOpenTemplateInToolbox={handleOpenTemplateFromLibrary}
            onToggleFavoriteTemplate={handleToggleFavoriteTemplate}
            onToggleHistoryFavorite={handleToggleHistoryFavorite}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearUnfavoritedHistory}
            onCopyPrompt={handleCopyPrompt}
            onCopyDraft={handleCopyDraft}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <span>房仲 AI 提示詞工作站 · 專為台灣不動產仲介設計</span>
          <span>
            稅務與貸款解說僅供客戶溝通參考，實際核定仍以國稅局與承貸銀行公告為準
          </span>
        </div>
      </footer>

      {/* Signature Settings Drawer */}
      <SignatureDrawer
        isOpen={isSignatureOpen}
        profile={signature}
        isSaving={isSavingSignature}
        onClose={() => setIsSignatureOpen(false)}
        onSave={handleSaveSignature}
      />

      {/* Copy / Action Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.variant === "error" ? "bg-red-700" : "bg-[#1E3A5F]"
          }`}
        >
          {toast.variant === "error" ? (
            <AlertCircle
              className="h-4 w-4 shrink-0 text-red-200"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="h-4 w-4 shrink-0 text-amber-400"
              aria-hidden="true"
            />
          )}
          <span className="whitespace-nowrap">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

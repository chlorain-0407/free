import React from "react";
import {
  Copy,
  RotateCcw,
  Star,
  AlertCircle,
  RefreshCw,
  Scissors,
  HeartHandshake,
  SmilePlus,
  Loader2,
} from "lucide-react";
import type { RefineMode, SignatureProfile } from "../types/workstation";
import { hasSignatureContent } from "../utils/storage";

interface DraftRefinementPanelProps {
  draft: string;
  originalDraft: string;
  isGenerating: boolean;
  refiningMode: RefineMode | null;
  error: string | null;
  signature: SignatureProfile;
  isFavorited?: boolean;
  onRetry: () => void;
  onCopyDraft: (text: string) => void;
  onRefine: (mode: RefineMode) => void;
  onRestoreOriginal: () => void;
  onToggleFavorite?: () => void;
  onDraftChange?: (nextDraft: string) => void;
}

const REFINE_ACTIONS: Array<{
  mode: RefineMode;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { mode: "concise", label: "再精簡一點", icon: Scissors },
  { mode: "softer", label: "語氣更委婉", icon: HeartHandshake },
  { mode: "line_emoji", label: "加上 emoji 適合傳 LINE", icon: SmilePlus },
];

export const DraftRefinementPanel: React.FC<DraftRefinementPanelProps> = ({
  draft,
  originalDraft,
  isGenerating,
  refiningMode,
  error,
  signature,
  isFavorited = false,
  onRetry,
  onCopyDraft,
  onRefine,
  onRestoreOriginal,
  onToggleFavorite,
  onDraftChange,
}) => {
  const isBusy = isGenerating || refiningMode !== null;
  const signatureWillAppend =
    signature.enabled && hasSignatureContent(signature);
  const isModifiedFromOriginal =
    Boolean(originalDraft) && draft.trim() !== originalDraft.trim();

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            實戰文案／話術草稿
          </h3>
          <p className="text-xs text-slate-500">
            AI 即時產出 · 可直接微調並複製傳送
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFavorite && draft && !isGenerating && (
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorited ? "取消收藏此草稿" : "收藏此草稿"}
              className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isFavorited
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Star
                className={`h-4 w-4 ${
                  isFavorited ? "fill-amber-500 text-amber-500" : ""
                }`}
              />
              <span>{isFavorited ? "已收藏" : "收藏"}</span>
            </button>
          )}

          {draft && !isGenerating && (
            <button
              type="button"
              onClick={() => onCopyDraft(draft)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#D97706] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#B45309] whitespace-nowrap shrink-0"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>一鍵複製文案</span>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {isGenerating ? (
          <div className="space-y-3 py-4" aria-live="polite" aria-busy="true">
            <div className="flex items-center gap-2 text-sm font-medium text-[#1E3A5F]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>正在為您撰寫台灣房仲實戰草稿...</span>
            </div>
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-lg border border-red-200 bg-red-50/70 p-4 text-sm text-red-800">
            <div className="flex items-start gap-2.5">
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-red-900">無法產出草稿</p>
                <p className="mt-1 text-red-700 leading-relaxed">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              重新生成一次
            </button>
          </div>
        ) : draft ? (
          <>
            <div className="relative flex-1">
              {onDraftChange ? (
                <textarea
                  value={draft}
                  onChange={(e) => onDraftChange(e.target.value)}
                  rows={11}
                  aria-label="可編輯的實戰文案草稿"
                  className="h-full min-h-[240px] w-full resize-y rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 text-[15px] leading-relaxed text-slate-800 focus:border-[#1E3A5F] focus:bg-white focus:outline-none"
                />
              ) : (
                <div className="min-h-[240px] whitespace-pre-wrap rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 text-[15px] leading-relaxed text-slate-800">
                  {draft}
                </div>
              )}

              {refiningMode && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#1E3A5F] shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>正在套用微調指令...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Refinement Toolbar */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  一鍵微調文案
                </span>
                {isModifiedFromOriginal && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={onRestoreOriginal}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-[#1E3A5F] disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    還原初版
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {REFINE_ACTIONS.map(({ mode, label, icon: Icon }) => {
                  const isActive = refiningMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onRefine(mode)}
                      className="inline-flex min-h-[44px] flex-1 basis-[calc(50%-0.25rem)] sm:flex-initial sm:basis-auto items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-[#1E3A5F]/40 hover:bg-[#F2F6FA] hover:text-[#1E3A5F] disabled:opacity-50 whitespace-nowrap"
                    >
                      {isActive ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1E3A5F]" />
                      ) : (
                        <Icon
                          className="h-3.5 w-3.5 text-[#D97706]"
                          aria-hidden="true"
                        />
                      )}
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-slate-500">
                {signatureWillAppend
                  ? `複製時將自動附加您的個人簽名檔（${signature.name || signature.branch}）`
                  : "提示：可於右上角「個人簽名檔」開啟複製時自動附加聯絡資訊。"}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center text-sm text-slate-500">
            <p className="font-medium text-slate-700">
              尚未生成實戰草稿
            </p>
            <p className="mt-1 max-w-xs text-xs text-slate-500 leading-relaxed">
              完成上方 3 步驟設定並點擊「生成提示詞與範例」，系統會即時產出可直接傳送的台灣房仲話術。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

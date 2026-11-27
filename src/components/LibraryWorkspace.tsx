import React, { useState } from "react";
import {
  Star,
  Clock,
  Copy,
  Trash2,
  SlidersHorizontal,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { TOOLBOX_TEMPLATES } from "../data/toolboxTemplates";
import type { SavedDraftItem } from "../types/workstation";
import { formatTimestamp } from "../utils/storage";

interface LibraryWorkspaceProps {
  favoriteTemplateIds: string[];
  historyItems: SavedDraftItem[];
  isLoading: boolean;
  error: string | null;
  onRetryLoad: () => void;
  onOpenTemplateInToolbox: (templateId: string) => void;
  onToggleFavoriteTemplate: (templateId: string) => void;
  onToggleHistoryFavorite: (id: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onCopyPrompt: (text: string) => void;
  onCopyDraft: (text: string) => void;
}

export const LibraryWorkspace: React.FC<LibraryWorkspaceProps> = ({
  favoriteTemplateIds,
  historyItems,
  isLoading,
  error,
  onRetryLoad,
  onOpenTemplateInToolbox,
  onToggleFavoriteTemplate,
  onToggleHistoryFavorite,
  onDeleteHistoryItem,
  onClearHistory,
  onCopyPrompt,
  onCopyDraft,
}) => {
  const [subTab, setSubTab] = useState<"favorites" | "history">("favorites");

  const favoritedTemplates = TOOLBOX_TEMPLATES.filter((t) =>
    favoriteTemplateIds.includes(t.id)
  );
  const favoritedDrafts = historyItems.filter((item) => item.isFavorite);
  const totalFavorites = favoritedTemplates.length + favoritedDrafts.length;

  return (
    <div className="space-y-5">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSubTab("favorites")}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
              subTab === "favorites"
                ? "bg-white text-[#1E3A5F] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Star className="h-3.5 w-3.5 text-amber-500" />
            <span>我的最愛 ({totalFavorites})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("history")}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap tabular-nums ${
              subTab === "history"
                ? "bg-white text-[#1E3A5F] shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>最近使用紀錄 ({historyItems.length})</span>
          </button>
        </div>

        {subTab === "history" && historyItems.length > 0 && !isLoading && (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 whitespace-nowrap"
          >
            <Trash2 className="h-3.5 w-3.5" />
            清除未收藏紀錄
          </button>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div
          className="space-y-3"
          aria-live="polite"
          aria-busy="true"
        >
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
            >
              <div className="h-3.5 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-64 animate-pulse rounded bg-slate-200" />
              <div className="h-16 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">
                無法載入資料庫紀錄
              </p>
              <p className="mt-1 text-sm leading-relaxed text-red-700">
                {error}
              </p>
              <button
                type="button"
                onClick={onRetryLoad}
                className="mt-4 inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-50"
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                重新讀取資料
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Favorites View */}
          {subTab === "favorites" && (
            <div className="space-y-6">
              {totalFavorites === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
                  <p className="text-base font-semibold text-slate-800">
                    目前還沒有收藏項目
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">
                    在「對話式引導」產出的實戰草稿或「實戰百寶箱」範本點擊星號，資料會立即同步儲存至 MongoDB 資料庫。
                  </p>
                </div>
              ) : (
                <>
                  {favoritedTemplates.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-700">
                        已收藏的百寶箱範本（{favoritedTemplates.length}）
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {favoritedTemplates.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="flex flex-col rounded-xl border border-slate-200 bg-white p-5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-semibold text-[#1E3A5F]">
                                {tpl.category} ·{" "}
                                <span className="font-normal text-slate-500">
                                  {tpl.channel}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => onToggleFavoriteTemplate(tpl.id)}
                                aria-label="移除收藏"
                                className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center rounded-lg text-amber-500 hover:bg-slate-100"
                              >
                                <Star className="h-4 w-4 fill-amber-500" />
                              </button>
                            </div>
                            <h4 className="mt-1 text-base font-bold text-slate-900">
                              {tpl.title}
                            </h4>
                            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
                              {tpl.summary}
                            </p>
                            <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => onOpenTemplateInToolbox(tpl.id)}
                                className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#162C49]"
                              >
                                <SlidersHorizontal className="h-3.5 w-3.5 text-amber-300" />
                                開啟快速填空
                              </button>
                              <button
                                type="button"
                                onClick={() => onCopyPrompt(tpl.promptBody)}
                                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <Copy className="h-3.5 w-3.5" />
                                複製
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {favoritedDrafts.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-700">
                        已收藏的實戰文案草稿（{favoritedDrafts.length}）
                      </h3>
                      <div className="space-y-3">
                        {favoritedDrafts.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-white p-5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                                  <span className="font-semibold text-[#1E3A5F]">
                                    {item.categoryLabel}
                                  </span>
                                  {item.toneLabel && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{item.toneLabel}</span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span>{formatTimestamp(item.createdAt)}</span>
                                </div>
                                <h4 className="mt-1 text-base font-bold text-slate-900">
                                  {item.title}
                                </h4>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onToggleHistoryFavorite(item.id)
                                  }
                                  aria-label="取消收藏"
                                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-600"
                                >
                                  <Star className="h-4 w-4 fill-amber-500" />
                                </button>
                                {item.draft && (
                                  <button
                                    type="button"
                                    onClick={() => onCopyDraft(item.draft)}
                                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#D97706] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#B45309] whitespace-nowrap"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    複製文案
                                  </button>
                                )}
                              </div>
                            </div>

                            {item.draft && (
                              <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm leading-relaxed text-slate-700">
                                {item.draft}
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {/* Recent History View */}
          {subTab === "history" && (
            <div className="space-y-3">
              {historyItems.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
                  <p className="text-base font-semibold text-slate-800">
                    尚無最近使用紀錄
                  </p>
                  <p className="mt-1.5 text-sm text-slate-500">
                    您在「對話式引導」生成的草稿，或在「實戰百寶箱」複製與生成的提示詞，都會自動保存於 MongoDB 資料庫（顯示最近 50 筆）。
                  </p>
                </div>
              ) : (
                historyItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 tabular-nums">
                          <span className="font-semibold text-[#1E3A5F]">
                            {item.source === "guided"
                              ? "對話引導"
                              : item.source === "visual"
                              ? "圖片視覺"
                              : "實戰百寶箱"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.categoryLabel}</span>
                          {item.toneLabel && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{item.toneLabel}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>{formatTimestamp(item.createdAt)}</span>
                        </div>
                        <h4 className="mt-1 text-base font-bold text-slate-900">
                          {item.title}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleHistoryFavorite(item.id)}
                          aria-label={item.isFavorite ? "取消收藏" : "加入收藏"}
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                            item.isFavorite
                              ? "border-amber-200 bg-amber-50 text-amber-500"
                              : "border-slate-200 bg-white text-slate-400 hover:text-amber-500"
                          }`}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              item.isFavorite ? "fill-amber-500" : ""
                            }`}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() => onCopyPrompt(item.prompt)}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          複製提示詞
                        </button>

                        {item.draft && (
                          <button
                            type="button"
                            onClick={() => onCopyDraft(item.draft)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#D97706] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#B45309] whitespace-nowrap"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            複製文案
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteHistoryItem(item.id)}
                          aria-label="刪除此紀錄"
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {item.draft ? (
                      <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-[#F8FAFC] p-3.5 text-sm leading-relaxed text-slate-700">
                        {item.draft}
                      </div>
                    ) : (
                      <div className="mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-100 bg-[#F8FAFC] p-3.5 text-xs leading-relaxed text-slate-600">
                        {item.prompt}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Star,
  Copy,
  SlidersHorizontal,
  X,
  Wand2,
  Send,
  Eraser,
} from "lucide-react";
import {
  TOOLBOX_TEMPLATES,
  TOOLBOX_CATEGORIES,
  extractTemplateVariables,
  renderFilledPrompt,
} from "../data/toolboxTemplates";
import type {
  RefineMode,
  SavedDraftItem,
  SignatureProfile,
  ToolboxTemplate,
} from "../types/workstation";
import { HighlightedPromptText } from "./HighlightedPromptText";
import { DraftRefinementPanel } from "./DraftRefinementPanel";
import {
  generateRealEstateDraft,
  refineRealEstateDraft,
  type CreateDraftInput,
} from "../utils/api";

interface ToolboxWorkspaceProps {
  signature: SignatureProfile;
  favoriteTemplateIds: string[];
  initialSelectedTemplateId?: string | null;
  onClearInitialSelectedTemplate?: () => void;
  onToggleFavoriteTemplate: (templateId: string) => void;
  onCopyPrompt: (text: string) => void;
  onCopyDraft: (text: string) => void;
  onSaveHistory: (item: CreateDraftInput) => Promise<SavedDraftItem | null>;
  onUpdateDraftContent: (id: string, nextDraft: string) => Promise<void>;
  onToggleHistoryFavorite: (id: string) => void;
  isHistoryItemFavorited: (id: string) => boolean;
}

type FilterCategory = (typeof TOOLBOX_CATEGORIES)[number] | "我的最愛";

export const ToolboxWorkspace: React.FC<ToolboxWorkspaceProps> = ({
  signature,
  favoriteTemplateIds,
  initialSelectedTemplateId,
  onClearInitialSelectedTemplate,
  onToggleFavoriteTemplate,
  onCopyPrompt,
  onCopyDraft,
  onSaveHistory,
  onUpdateDraftContent,
  onToggleHistoryFavorite,
  isHistoryItemFavorited,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>("全部");

  // Quick Fill Drawer State
  const [activeTemplate, setActiveTemplate] = useState<ToolboxTemplate | null>(
    null
  );
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {}
  );
  const [draft, setDraft] = useState("");
  const [originalDraft, setOriginalDraft] = useState("");
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [refiningMode, setRefiningMode] = useState<RefineMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedTemplateId) {
      const found = TOOLBOX_TEMPLATES.find(
        (t) => t.id === initialSelectedTemplateId
      );
      if (found) {
        openQuickFill(found);
      }
      onClearInitialSelectedTemplate?.();
    }
  }, [initialSelectedTemplateId, onClearInitialSelectedTemplate]);

  useEffect(() => {
    if (!activeTemplate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTemplate(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTemplate]);

  const openQuickFill = (template: ToolboxTemplate) => {
    setActiveTemplate(template);
    setVariableValues({});
    setDraft("");
    setOriginalDraft("");
    setCurrentRecordId(null);
    setError(null);
    setIsGenerating(false);
    setRefiningMode(null);
  };

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TOOLBOX_TEMPLATES.filter((tpl) => {
      if (selectedCategory === "我的最愛") {
        if (!favoriteTemplateIds.includes(tpl.id)) return false;
      } else if (selectedCategory !== "全部") {
        if (tpl.category !== selectedCategory) return false;
      }
      if (!q) return true;
      return (
        tpl.title.toLowerCase().includes(q) ||
        tpl.summary.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.channel.toLowerCase().includes(q) ||
        tpl.promptBody.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory, favoriteTemplateIds]);

  const activeVariables = useMemo(() => {
    if (!activeTemplate) return [];
    return extractTemplateVariables(activeTemplate.promptBody);
  }, [activeTemplate]);

  const filledPromptText = useMemo(() => {
    if (!activeTemplate) return "";
    return renderFilledPrompt(activeTemplate.promptBody, variableValues);
  }, [activeTemplate, variableValues]);

  const handleQuickCopyTemplate = (template: ToolboxTemplate) => {
    onCopyPrompt(template.promptBody);
    void onSaveHistory({
      source: "toolbox",
      title: `百寶箱｜${template.title}`,
      categoryLabel: template.category,
      prompt: template.promptBody,
      draft: "",
      isFavorite: false,
    });
  };

  const handleCopyFilledPrompt = () => {
    if (!activeTemplate) return;
    onCopyPrompt(filledPromptText);
    void onSaveHistory({
      source: "toolbox",
      title: `百寶箱｜${activeTemplate.title}`,
      categoryLabel: activeTemplate.category,
      prompt: filledPromptText,
      draft: draft || "",
      isFavorite: false,
    });
  };

  const handleGenerateFromTemplate = async () => {
    if (!activeTemplate) return;
    setIsGenerating(true);
    setError(null);
    setDraft("");
    setOriginalDraft("");

    try {
      const resultText = await generateRealEstateDraft(filledPromptText);
      setDraft(resultText);
      setOriginalDraft(resultText);

      const saved = await onSaveHistory({
        source: "toolbox",
        title: `百寶箱｜${activeTemplate.title}`,
        categoryLabel: activeTemplate.category,
        prompt: filledPromptText,
        draft: resultText,
        isFavorite: false,
      });
      setCurrentRecordId(saved ? saved.id : null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "AI 生成時發生錯誤，請稍後再試。"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (mode: RefineMode) => {
    if (!draft.trim() || refiningMode) return;
    setRefiningMode(mode);
    setError(null);
    try {
      const refined = await refineRealEstateDraft(draft, mode);
      setDraft(refined);
      if (currentRecordId) {
        void onUpdateDraftContent(currentRecordId, refined);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "微調文案失敗，請稍後再試。"
      );
    } finally {
      setRefiningMode(null);
    }
  };

  const handleFillSampleHints = () => {
    if (!activeTemplate) return;
    setVariableValues({ ...activeTemplate.variableHints });
  };

  const filterList: FilterCategory[] = [...TOOLBOX_CATEGORIES, "我的最愛"];

  return (
    <div className="space-y-5">
      {/* Search and Category Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋範本（例：專任委託、實價登錄、新青安、Reels）"
              aria-label="搜尋提示詞範本"
              className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-[#F8FAFC] pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:bg-white focus:outline-none"
            />
          </div>

          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 no-scrollbar"
            role="tablist"
            aria-label="提示詞分類篩選"
          >
            {filterList.map((cat) => {
              const active = selectedCategory === cat;
              const count =
                cat === "全部"
                  ? TOOLBOX_TEMPLATES.length
                  : cat === "我的最愛"
                  ? favoriteTemplateIds.length
                  : TOOLBOX_TEMPLATES.filter((t) => t.category === cat).length;

              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[40px] rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                    active
                      ? "bg-[#1E3A5F] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center">
          <p className="text-base font-semibold text-slate-800">
            找不到符合條件的提示詞範本
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            {selectedCategory === "我的最愛"
              ? "您尚未收藏任何範本，點擊卡片右上角的星號即可快速加入最愛。"
              : "建議清除搜尋關鍵字或切換至「全部」分類瀏覽 12 組實戰範本。"}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("全部");
            }}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-[#1E3A5F] px-5 py-2 text-sm font-semibold text-white hover:bg-[#162C49]"
          >
            顯示全部 12 組範本
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((tpl) => {
            const isFav = favoriteTemplateIds.includes(tpl.id);
            const vars = extractTemplateVariables(tpl.promptBody);

            return (
              <article
                key={tpl.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white transition-colors hover:border-slate-300"
              >
                <div className="flex flex-1 flex-col p-5">
                  {/* Quiet unboxed metadata row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                      <span className="font-semibold text-[#1E3A5F]">
                        {tpl.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{tpl.channel}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavoriteTemplate(tpl.id)}
                      aria-label={isFav ? "取消收藏範本" : "加入我的最愛"}
                      className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-amber-500"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          isFav ? "fill-amber-500 text-amber-500" : ""
                        }`}
                      />
                    </button>
                  </div>

                  <h3 className="mt-1.5 text-base font-bold text-slate-900">
                    {tpl.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {tpl.summary}
                  </p>

                  {/* Highlighted Variable Preview */}
                  <div className="mt-4 flex-1 rounded-lg border border-slate-100 bg-[#F8FAFC] p-3.5 max-h-40 overflow-hidden relative">
                    <HighlightedPromptText template={tpl.promptBody} compact />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F8FAFC] to-transparent" />
                  </div>

                  <p className="mt-3 text-xs text-slate-500 tabular-nums">
                    包含 {vars.length} 個可替換變數：
                    <span className="text-amber-800 font-medium">
                      {vars.slice(0, 3).map((v) => `[${v}]`).join("、")}
                      {vars.length > 3 ? " 等" : ""}
                    </span>
                  </p>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => openQuickFill(tpl)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#1E3A5F] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#162C49] whitespace-nowrap"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-amber-300" />
                    <span>快速填空</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickCopyTemplate(tpl)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>一鍵複製</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Quick Fill Modal / Bottom Sheet Panel */}
      {activeTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/55 backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-fill-title"
          onClick={() => setActiveTemplate(null)}
        >
          <div
            className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <span className="font-semibold text-[#1E3A5F]">
                    {activeTemplate.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{activeTemplate.channel}</span>
                </div>
                <h2
                  id="quick-fill-title"
                  className="mt-0.5 truncate text-base font-bold text-slate-900 sm:text-lg"
                >
                  {activeTemplate.title} — 快速填空面板
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleFavoriteTemplate(activeTemplate.id)}
                  aria-label="切換收藏狀態"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-amber-500"
                >
                  <Star
                    className={`h-4 w-4 ${
                      favoriteTemplateIds.includes(activeTemplate.id)
                        ? "fill-amber-500 text-amber-500"
                        : ""
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTemplate(null)}
                  aria-label="關閉快速填空面板"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Column: Variable Inputs */}
                <div className="space-y-4 lg:col-span-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      步驟 1：填入案件變數
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFillSampleHints}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        <Wand2 className="h-3.5 w-3.5 text-[#D97706]" />
                        代入範例
                      </button>
                      <button
                        type="button"
                        onClick={() => setVariableValues({})}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        清空
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3.5">
                    {activeVariables.map((varName) => (
                      <div key={varName}>
                        <label
                          htmlFor={`var-${varName}`}
                          className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-800"
                        >
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                            [{varName}]
                          </span>
                        </label>
                        <input
                          id={`var-${varName}`}
                          type="text"
                          value={variableValues[varName] ?? ""}
                          onChange={(e) =>
                            setVariableValues((prev) => ({
                              ...prev,
                              [varName]: e.target.value,
                            }))
                          }
                          placeholder={
                            activeTemplate.variableHints[varName]
                              ? `例：${activeTemplate.variableHints[varName]}`
                              : `請輸入 ${varName}`
                          }
                          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Live Highlighted Prompt Preview */}
                <div className="flex flex-col lg:col-span-7">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      步驟 2：即時預覽與使用
                    </h3>
                    <span className="text-xs text-slate-500">
                      琥珀色為待填變數 · 深藍色為已套用內容
                    </span>
                  </div>

                  <div className="flex-1 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 max-h-[340px] overflow-y-auto">
                    <HighlightedPromptText
                      template={activeTemplate.promptBody}
                      values={variableValues}
                    />
                  </div>

                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleCopyFilledPrompt}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#1E3A5F] bg-white px-4 py-2.5 text-sm font-bold text-[#1E3A5F] transition-colors hover:bg-[#F2F6FA] whitespace-nowrap"
                    >
                      <Copy className="h-4 w-4" />
                      <span>一鍵複製提示詞</span>
                    </button>

                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={handleGenerateFromTemplate}
                      className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60 whitespace-nowrap"
                    >
                      <Send className="h-4 w-4 text-amber-400" />
                      <span>
                        {isGenerating ? "AI 生成中..." : "直接產出實戰草稿"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Generated Draft inside Quick Fill */}
              {(isGenerating || draft || error) && (
                <div className="pt-2">
                  <DraftRefinementPanel
                    draft={draft}
                    originalDraft={originalDraft}
                    isGenerating={isGenerating}
                    refiningMode={refiningMode}
                    error={error}
                    signature={signature}
                    isFavorited={
                      currentRecordId
                        ? isHistoryItemFavorited(currentRecordId)
                        : false
                    }
                    onRetry={handleGenerateFromTemplate}
                    onCopyDraft={onCopyDraft}
                    onRefine={handleRefine}
                    onRestoreOriginal={() => setDraft(originalDraft)}
                    onToggleFavorite={
                      currentRecordId
                        ? () => onToggleHistoryFavorite(currentRecordId)
                        : undefined
                    }
                    onDraftChange={setDraft}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

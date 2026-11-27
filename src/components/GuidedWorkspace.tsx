import React, { useState, useRef } from "react";
import {
  Copy,
  Send,
  FileText,
  Eraser,
  Wand2,
  Check,
  Building2,
  Users,
  Megaphone,
  Handshake,
  Scale,
} from "lucide-react";
import {
  SCENARIO_CONFIGS,
  TONE_OPTIONS,
  getScenarioById,
  getToneById,
  buildStructuredPrompt,
} from "../data/scenarios";
import type {
  RefineMode,
  SavedDraftItem,
  ScenarioId,
  SignatureProfile,
  ToneId,
} from "../types/workstation";
import {
  generateRealEstateDraft,
  refineRealEstateDraft,
  type CreateDraftInput,
} from "../utils/api";
import { DraftRefinementPanel } from "./DraftRefinementPanel";

interface GuidedWorkspaceProps {
  signature: SignatureProfile;
  onCopyPrompt: (text: string) => void;
  onCopyDraft: (text: string) => void;
  onSaveHistory: (item: CreateDraftInput) => Promise<SavedDraftItem | null>;
  onUpdateDraftContent: (id: string, nextDraft: string) => Promise<void>;
  onToggleHistoryFavorite: (id: string) => void;
  isHistoryItemFavorited: (id: string) => boolean;
}

const SCENARIO_ICONS: Record<ScenarioId, React.FC<{ className?: string }>> = {
  prospecting: Building2,
  showing: Users,
  marketing: Megaphone,
  negotiation: Handshake,
  tax_law: Scale,
};

export const GuidedWorkspace: React.FC<GuidedWorkspaceProps> = ({
  signature,
  onCopyPrompt,
  onCopyDraft,
  onSaveHistory,
  onUpdateDraftContent,
  onToggleHistoryFavorite,
  isHistoryItemFavorited,
}) => {
  const [scenarioId, setScenarioId] = useState<ScenarioId>("prospecting");
  const [formByScenario, setFormByScenario] = useState<
    Record<ScenarioId, Record<string, string>>
  >({
    prospecting: { goal: "爭取專任委託" },
    showing: { channel: "LINE 帶看後暖心跟進" },
    marketing: { platform: "FB 粉專／社團貼文" },
    negotiation: { stage: "引導買方下斡旋" },
    tax_law: { topic: "房地合一稅 2.0 計算", delivery: "LINE 條列懶人包" },
  });
  const [toneId, setToneId] = useState<ToneId>("consultant");

  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [draft, setDraft] = useState<string>("");
  const [originalDraft, setOriginalDraft] = useState<string>("");
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [refiningMode, setRefiningMode] = useState<RefineMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedPromptFlag, setCopiedPromptFlag] = useState<boolean>(false);

  const resultSectionRef = useRef<HTMLDivElement | null>(null);

  const activeScenario = getScenarioById(scenarioId);
  const activeTone = getToneById(toneId);
  const currentValues = formByScenario[scenarioId] ?? {};

  const updateField = (fieldId: string, value: string) => {
    setFormByScenario((prev) => ({
      ...prev,
      [scenarioId]: {
        ...(prev[scenarioId] ?? {}),
        [fieldId]: value,
      },
    }));
  };

  const handleApplySample = () => {
    setFormByScenario((prev) => ({
      ...prev,
      [scenarioId]: { ...activeScenario.sampleValues },
    }));
  };

  const handleClearFields = () => {
    setFormByScenario((prev) => ({
      ...prev,
      [scenarioId]: {},
    }));
  };

  const runGeneration = async (promptToRun: string) => {
    setIsGenerating(true);
    setError(null);
    setDraft("");
    setOriginalDraft("");

    try {
      const resultText = await generateRealEstateDraft(promptToRun);
      setDraft(resultText);
      setOriginalDraft(resultText);

      const firstChipOrInput =
        activeScenario.fields
          .map((f) => (currentValues[f.id] ?? "").trim())
          .find(Boolean) ?? activeScenario.title;
      const summaryTitle =
        firstChipOrInput.length > 22
          ? `${activeScenario.title}｜${firstChipOrInput.slice(0, 22)}...`
          : `${activeScenario.title}｜${firstChipOrInput}`;

      const saved = await onSaveHistory({
        source: "guided",
        title: summaryTitle,
        categoryLabel: activeScenario.title,
        toneLabel: activeTone.label,
        prompt: promptToRun,
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const assembled = buildStructuredPrompt(
      activeScenario,
      currentValues,
      activeTone
    );
    setGeneratedPrompt(assembled);
    setCurrentRecordId(null);

    setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);

    await runGeneration(assembled);
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

  const handleCopyStructuredPrompt = () => {
    if (!generatedPrompt) return;
    onCopyPrompt(generatedPrompt);
    setCopiedPromptFlag(true);
    setTimeout(() => setCopiedPromptFlag(false), 1800);
  };

  const hasResult = Boolean(generatedPrompt || isGenerating || draft || error);

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-slate-200 bg-white"
      >
        {/* Step 1: Scenario */}
        <section className="border-b border-slate-200 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                01.
              </span>
              選擇本次任務場景
            </h2>
            <span className="text-xs text-slate-500">
              依台灣房仲第一線作業流程分類
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {SCENARIO_CONFIGS.map((scenario) => {
              const isSelected = scenario.id === scenarioId;
              const Icon = SCENARIO_ICONS[scenario.id];
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setScenarioId(scenario.id)}
                  className={`flex min-h-[68px] flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ${
                    isSelected
                      ? "border-[#1E3A5F] bg-[#F2F6FA] ring-1 ring-[#1E3A5F]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? "text-[#1E3A5F]" : "text-slate-900"
                      }`}
                    >
                      {scenario.title}
                    </span>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? "text-[#D97706]" : "text-slate-400"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {scenario.shortDesc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2: Dynamic Fields */}
        <section className="border-b border-slate-200 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                  02.
                </span>
                填寫「{activeScenario.title}」關鍵資訊
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                欄位可簡短填寫，留白項目 AI 會自動以台灣實務常見情境補齊
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplySample}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
              >
                <Wand2 className="h-3.5 w-3.5 text-[#D97706]" aria-hidden="true" />
                代入實戰範例
              </button>
              <button
                type="button"
                onClick={handleClearFields}
                className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 whitespace-nowrap shrink-0"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                清空
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {activeScenario.fields.map((field) => {
              const value = currentValues[field.id] ?? "";

              if (field.type === "chips" && field.options) {
                return (
                  <div key={field.id} className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-800">
                      {field.label}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {field.options.map((opt) => {
                        const active = value === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateField(field.id, opt)}
                            className={`min-h-[44px] rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                              active
                                ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                                : "border-slate-200 bg-[#F8FAFC] text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={field.id} className="md:col-span-2">
                    <label
                      htmlFor={`guided-${field.id}`}
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      {field.label}
                    </label>
                    <textarea
                      id={`guided-${field.id}`}
                      rows={2}
                      value={value}
                      onChange={(e) => updateField(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                    />
                  </div>
                );
              }

              return (
                <div key={field.id}>
                  <label
                    htmlFor={`guided-${field.id}`}
                    className="mb-1.5 block text-sm font-semibold text-slate-800"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`guided-${field.id}`}
                    type="text"
                    value={value}
                    onChange={(e) => updateField(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 3: Tone + Submit */}
        <section className="p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900">
              <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                03.
              </span>
              選擇 AI 回覆語氣
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {TONE_OPTIONS.map((tone) => {
              const active = tone.id === toneId;
              return (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setToneId(tone.id)}
                  className={`flex min-h-[64px] flex-col items-start justify-center rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                    active
                      ? "border-[#1E3A5F] bg-[#F2F6FA] ring-1 ring-[#1E3A5F]"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      active ? "text-[#1E3A5F]" : "text-slate-900"
                    }`}
                  >
                    {tone.label}
                  </span>
                  <span className="mt-1 text-xs text-slate-500 leading-snug">
                    {tone.summary}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
            <p className="text-xs text-slate-500">
              一次產出「結構化專業提示詞（可貼到 ChatGPT／Gemini）」與「可直接傳送的實戰草稿」
            </p>
            <button
              type="submit"
              disabled={isGenerating}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#162C49] active:scale-[0.99] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Send className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>{isGenerating ? "生成中，請稍候..." : "生成提示詞與範例"}</span>
            </button>
          </div>
        </section>
      </form>

      {/* Output Dual Section */}
      {hasResult && (
        <div
          ref={resultSectionRef}
          className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2"
        >
          {/* Left / Top: Structured Professional Prompt */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  結構化專業提示詞
                </h3>
                <p className="text-xs text-slate-500">
                  可一鍵複製到 ChatGPT 或 Gemini 繼續對話延伸
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyStructuredPrompt}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#1E3A5F] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#162C49] whitespace-nowrap shrink-0"
              >
                {copiedPromptFlag ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-amber-300" />
                    <span>已複製提示詞</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>複製提示詞</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                rows={13}
                aria-label="已組裝的結構化專業提示詞"
                className="h-full min-h-[260px] w-full flex-1 resize-y rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 font-sans text-[14px] leading-relaxed text-slate-700 focus:border-[#1E3A5F] focus:bg-white focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    場景：{activeScenario.title} · 語氣：{activeTone.label}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => runGeneration(generatedPrompt)}
                  className="font-semibold text-[#1E3A5F] hover:text-[#D97706] underline underline-offset-2 disabled:opacity-50"
                >
                  依修改後提示詞重新生成草稿
                </button>
              </div>
            </div>
          </div>

          {/* Right / Bottom: Live Gemini Draft + 3 Quick Refinements */}
          <DraftRefinementPanel
            draft={draft}
            originalDraft={originalDraft}
            isGenerating={isGenerating}
            refiningMode={refiningMode}
            error={error}
            signature={signature}
            isFavorited={
              currentRecordId ? isHistoryItemFavorited(currentRecordId) : false
            }
            onRetry={() => runGeneration(generatedPrompt)}
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
  );
};

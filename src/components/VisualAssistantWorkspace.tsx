import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Palette,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Trash2,
  Lightbulb,
  CheckSquare,
  Square,
  Send,
} from "lucide-react";
import type {
  RefineMode,
  RoomArea,
  SavedDraftItem,
  SignatureProfile,
  VisionAnalysisResult,
  VisionOutputPurpose,
  VisualAspectRatio,
  VisualImageType,
  VisualPromptOutput,
  VisualStyle,
} from "../types/workstation";
import {
  ROOM_AREA_OPTIONS,
  VISION_PURPOSE_OPTIONS,
  VISUAL_IMAGE_TYPES,
  VISUAL_STYLES,
  VISUAL_RATIOS,
  VIRTUAL_STAGING_COMPLIANCE_NOTICE,
  VIRTUAL_STAGING_SHORT_DISCLAIMER,
  buildVisualPrompt,
} from "../data/visualPrompts";
import {
  analyzePropertyPhotoApi,
  refineRealEstateDraft,
  type CreateDraftInput,
} from "../utils/api";
import { DraftRefinementPanel } from "./DraftRefinementPanel";

interface VisualAssistantWorkspaceProps {
  signature: SignatureProfile;
  onCopyPrompt: (text: string) => void;
  onCopyDraft: (text: string) => void;
  onCopyPlainText: (text: string, toastText: string) => void;
  onSaveHistory: (item: CreateDraftInput) => Promise<SavedDraftItem | null>;
  onUpdateDraftContent: (id: string, nextDraft: string) => Promise<void>;
  onToggleHistoryFavorite: (id: string) => void;
  isHistoryItemFavorited: (id: string) => boolean;
}

type VisualSubTab = "photo_copy" | "image_prompt";

const MAX_UPLOAD_DIMENSION = 1600;

async function compressImageToBase64(
  file: File
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  const rawType = file.type.toLowerCase();
  if (!rawType.startsWith("image/")) {
    throw new Error("請上傳 JPG、PNG 或 WebP 格式的圖片檔案。");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("讀取照片失敗，請重新選擇。"));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        reject(new Error("無法讀取圖片內容。"));
        return;
      }

      const img = new window.Image();
      img.onerror = () =>
        reject(new Error("無法解析此圖片格式，建議使用 JPG 或 PNG 照片。"));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > MAX_UPLOAD_DIMENSION || height > MAX_UPLOAD_DIMENSION) {
            const scale = Math.min(
              MAX_UPLOAD_DIMENSION / width,
              MAX_UPLOAD_DIMENSION / height
            );
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            const fallbackMime = allowed.includes(rawType)
              ? rawType
              : "image/jpeg";
            const commaIdx = dataUrl.indexOf(",");
            resolve({
              base64: commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl,
              mimeType: fallbackMime,
              previewUrl: dataUrl,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const outputMime =
            rawType === "image/png" && file.size < 1_500_000
              ? "image/png"
              : "image/jpeg";
          const compressedUrl =
            outputMime === "image/png"
              ? canvas.toDataURL("image/png")
              : canvas.toDataURL("image/jpeg", 0.85);
          const commaIdx = compressedUrl.indexOf(",");
          resolve({
            base64:
              commaIdx >= 0 ? compressedUrl.slice(commaIdx + 1) : compressedUrl,
            mimeType: outputMime,
            previewUrl: compressedUrl,
          });
        } catch {
          reject(new Error("處理圖片時發生錯誤，請換一張照片重試。"));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export const VisualAssistantWorkspace: React.FC<
  VisualAssistantWorkspaceProps
> = ({
  signature,
  onCopyPrompt,
  onCopyDraft,
  onCopyPlainText,
  onSaveHistory,
  onUpdateDraftContent,
  onToggleHistoryFavorite,
  isHistoryItemFavorited,
}) => {
  const [subTab, setSubTab] = useState<VisualSubTab>("photo_copy");

  // --- Sub-tab 1: Photo-to-Copywriting state ---
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/jpeg");
  const [photoFileName, setPhotoFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [roomArea, setRoomArea] = useState<RoomArea>("客廳");
  const [outputPurpose, setOutputPurpose] =
    useState<VisionOutputPurpose>("FB 吸睛貼文");

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<VisionAnalysisResult | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [originalDraft, setOriginalDraft] = useState<string>("");
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [refiningMode, setRefiningMode] = useState<RefineMode | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const visionResultRef = useRef<HTMLDivElement | null>(null);

  // --- Sub-tab 2: AI Image Prompt Generator state ---
  const [imageType, setImageType] =
    useState<VisualImageType>("空屋虛擬裝潢示意");
  const [visualStyle, setVisualStyle] = useState<VisualStyle>("北歐暖木");
  const [aspectRatio, setAspectRatio] = useState<VisualAspectRatio>("1:1");
  const [reserveTextSpace, setReserveTextSpace] = useState<boolean>(true);
  const [extraNotes, setExtraNotes] = useState<string>("");
  const [promptOutput, setPromptOutput] = useState<VisualPromptOutput | null>(
    null
  );
  const [copiedZh, setCopiedZh] = useState<boolean>(false);
  const [copiedEn, setCopiedEn] = useState<boolean>(false);

  const promptResultRef = useRef<HTMLDivElement | null>(null);

  const handleSelectedFile = async (file: File | undefined | null) => {
    if (!file) return;
    setUploadError(null);
    setAnalysisError(null);
    try {
      const processed = await compressImageToBase64(file);
      setPhotoPreviewUrl(processed.previewUrl);
      setPhotoBase64(processed.base64);
      setPhotoMimeType(processed.mimeType);
      setPhotoFileName(file.name);
      setAnalysisResult(null);
      setDraft("");
      setOriginalDraft("");
      setCurrentRecordId(null);
    } catch (err: unknown) {
      setUploadError(
        err instanceof Error ? err.message : "無法載入照片，請換一張重試。"
      );
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    void handleSelectedFile(droppedFile);
  };

  const handleClearPhoto = () => {
    setPhotoPreviewUrl(null);
    setPhotoBase64("");
    setPhotoFileName("");
    setUploadError(null);
    setAnalysisError(null);
    setAnalysisResult(null);
    setDraft("");
    setOriginalDraft("");
    setCurrentRecordId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleAnalyzePhoto = async () => {
    if (!photoBase64) {
      setUploadError("請先上傳或拍攝一張房屋照片。");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setDraft("");
    setOriginalDraft("");

    setTimeout(() => {
      visionResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);

    try {
      const result = await analyzePropertyPhotoApi({
        imageBase64: photoBase64,
        mimeType: photoMimeType,
        roomArea,
        outputPurpose,
      });

      setAnalysisResult(result);
      setDraft(result.copywriting);
      setOriginalDraft(result.copywriting);

      const saved = await onSaveHistory({
        source: "visual",
        title: `看圖寫賣點｜${roomArea}（${outputPurpose}）`,
        categoryLabel: `看圖生文案 · ${roomArea}`,
        toneLabel: outputPurpose,
        prompt: `照片區域：${roomArea}\n輸出用途：${outputPurpose}\n偵測優勢：\n${result.detectedHighlights
          .map((h) => `- ${h}`)
          .join("\n")}`,
        draft: result.copywriting,
        isFavorite: false,
      });
      setCurrentRecordId(saved ? saved.id : null);
    } catch (err: unknown) {
      setAnalysisError(
        err instanceof Error ? err.message : "照片分析失敗，請稍後再試。"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefineVisionDraft = async (mode: RefineMode) => {
    if (!draft.trim() || refiningMode) return;
    setRefiningMode(mode);
    setAnalysisError(null);
    try {
      const refined = await refineRealEstateDraft(draft, mode);
      setDraft(refined);
      if (currentRecordId) {
        void onUpdateDraftContent(currentRecordId, refined);
      }
    } catch (err: unknown) {
      setAnalysisError(
        err instanceof Error ? err.message : "微調文案失敗，請稍後再試。"
      );
    } finally {
      setRefiningMode(null);
    }
  };

  const handleGenerateImagePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const generated = buildVisualPrompt({
      imageType,
      style: visualStyle,
      aspectRatio,
      reserveTextSpace,
      extraNotes,
    });
    setPromptOutput(generated);

    setTimeout(() => {
      promptResultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 60);

    void onSaveHistory({
      source: "visual",
      title: `繪圖提示詞｜${imageType}（${visualStyle}）`,
      categoryLabel: `AI 繪圖提示詞 · ${aspectRatio}`,
      toneLabel: visualStyle,
      prompt: generated.englishPrompt,
      draft: generated.chineseGuide,
      isFavorite: false,
    });
  };

  const handleCopyChineseGuide = () => {
    if (!promptOutput) return;
    onCopyPrompt(promptOutput.chineseGuide);
    setCopiedZh(true);
    setTimeout(() => setCopiedZh(false), 1800);
  };

  const handleCopyEnglishPrompt = () => {
    if (!promptOutput) return;
    onCopyPlainText(
      promptOutput.englishPrompt,
      "已複製英文高精度繪圖提示詞，可直接貼到繪圖工具使用"
    );
    setCopiedEn(true);
    setTimeout(() => setCopiedEn(false), 1800);
  };

  const isVirtualStagingSelected = imageType === "空屋虛擬裝潢示意";

  return (
    <div className="space-y-6">
      {/* Sub-tab Switcher */}
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div
          role="tablist"
          aria-label="圖片與視覺 AI 子功能切換"
          className="grid grid-cols-1 gap-1.5 sm:grid-cols-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subTab === "photo_copy"}
            onClick={() => setSubTab("photo_copy")}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${
              subTab === "photo_copy"
                ? "bg-[#1E3A5F] text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Camera
              className={`h-4 w-4 shrink-0 ${
                subTab === "photo_copy" ? "text-amber-400" : "text-slate-400"
              }`}
              aria-hidden="true"
            />
            <span>上傳照片寫賣點（看圖生文案）</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subTab === "image_prompt"}
            onClick={() => setSubTab("image_prompt")}
            className={`flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${
              subTab === "image_prompt"
                ? "bg-[#1E3A5F] text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Palette
              className={`h-4 w-4 shrink-0 ${
                subTab === "image_prompt" ? "text-amber-400" : "text-slate-400"
              }`}
              aria-hidden="true"
            />
            <span>房仲 AI 繪圖提示詞產生器</span>
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* Sub-tab 1: Upload Photo -> Multimodal Copywriting */}
      {/* ================================================= */}
      {subTab === "photo_copy" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left: Drag/Drop & Mobile Camera Upload */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                      01.
                    </span>
                    上傳或現場拍攝房屋照片
                  </h2>
                  {photoPreviewUrl && (
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      移除照片
                    </button>
                  )}
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/*"
                  className="hidden"
                  onChange={(e) => void handleSelectedFile(e.target.files?.[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void handleSelectedFile(e.target.files?.[0])}
                />

                {photoPreviewUrl ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950/5">
                    <div className="relative aspect-[4/3] w-full bg-slate-100">
                      <img
                        src={photoPreviewUrl}
                        alt={`已上傳的${roomArea}照片預覽`}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500">
                      <span className="truncate max-w-[200px]">
                        {photoFileName || "已選擇房屋照片"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="font-semibold text-[#1E3A5F] hover:text-[#D97706] underline underline-offset-2"
                        >
                          更換照片
                        </button>
                        <span aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => cameraInputRef.current?.click()}
                          className="font-semibold text-[#1E3A5F] hover:text-[#D97706] underline underline-offset-2"
                        >
                          重新拍照
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`flex min-h-[240px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                      isDragging
                        ? "border-[#D97706] bg-amber-50/60"
                        : "border-slate-300 bg-[#F8FAFC] hover:border-[#1E3A5F]/50"
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8EFF7] text-[#1E3A5F]">
                      <Upload className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-900">
                      拖曳房屋照片到此處，或點擊下方按鈕上傳
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      支援 JPG、PNG、WebP 格式，自動最佳化尺寸以利手機快速分析
                    </p>

                    <div className="mt-5 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#162C49] whitespace-nowrap"
                      >
                        <ImageIcon className="h-4 w-4 text-amber-400" />
                        選擇相簿照片
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                      >
                        <Camera className="h-4 w-4 text-[#D97706]" />
                        手機現場拍照
                      </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs font-medium text-red-600">
                    {uploadError}
                  </p>
                )}
              </div>

              {/* Right: Two Dropdowns + Action */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-5">
                <div className="space-y-4">
                  <h2 className="text-base font-bold text-slate-900">
                    <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                      02.
                    </span>
                    選擇照片區域與輸出用途
                  </h2>

                  <div>
                    <label
                      htmlFor="vision-room-area"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      照片區域
                    </label>
                    <select
                      id="vision-room-area"
                      value={roomArea}
                      onChange={(e) => setRoomArea(e.target.value as RoomArea)}
                      className="min-h-[46px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#1E3A5F] focus:outline-none"
                    >
                      {ROOM_AREA_OPTIONS.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="vision-output-purpose"
                      className="mb-1.5 block text-sm font-semibold text-slate-800"
                    >
                      輸出用途
                    </label>
                    <select
                      id="vision-output-purpose"
                      value={outputPurpose}
                      onChange={(e) =>
                        setOutputPurpose(e.target.value as VisionOutputPurpose)
                      }
                      className="min-h-[46px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-[#1E3A5F] focus:outline-none"
                    >
                      {VISION_PURPOSE_OPTIONS.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3.5 text-xs leading-relaxed text-slate-600">
                    AI 會自動辨識照片中的
                    <span className="font-semibold text-slate-800">
                      採光條件、空間通透感、動線規劃與裝潢優勢
                    </span>
                    並產出文案；若偵測到光線偏暗或取景角度壓迫，下方也會同步提供 1～2 條手機現場「重拍優化建議」。
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAnalyzing || !photoBase64}
                  onClick={() => void handleAnalyzePhoto()}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#162C49] disabled:opacity-50 whitespace-nowrap"
                >
                  <Sparkles
                    className="h-4 w-4 text-amber-400"
                    aria-hidden="true"
                  />
                  <span>
                    {isAnalyzing
                      ? "AI 正在解析照片空間優勢..."
                      : "分析照片並產出賣點文案"}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Multimodal Analysis Output */}
          {(isAnalyzing || draft || analysisError) && (
            <div ref={visionResultRef} className="space-y-4">
              {/* Detected Highlights */}
              {analysisResult &&
                analysisResult.detectedHighlights.length > 0 &&
                !isAnalyzing && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-[#1E3A5F]">
                      照片自動偵測優勢（{roomArea}）
                    </h3>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {analysisResult.detectedHighlights.map((point, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm leading-relaxed text-slate-700"
                        >
                          <span className="mt-0.5 font-mono text-xs font-semibold text-[#D97706] tabular-nums">
                            0{idx + 1}.
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Copywriting & 3 Quick Refinements */}
              <DraftRefinementPanel
                draft={draft}
                originalDraft={originalDraft}
                isGenerating={isAnalyzing}
                refiningMode={refiningMode}
                error={analysisError}
                signature={signature}
                isFavorited={
                  currentRecordId
                    ? isHistoryItemFavorited(currentRecordId)
                    : false
                }
                onRetry={() => void handleAnalyzePhoto()}
                onCopyDraft={onCopyDraft}
                onRefine={handleRefineVisionDraft}
                onRestoreOriginal={() => setDraft(originalDraft)}
                onToggleFavorite={
                  currentRecordId
                    ? () => onToggleHistoryFavorite(currentRecordId)
                    : undefined
                }
                onDraftChange={setDraft}
              />

              {/* Conditional Reshoot Optimization Tips */}
              {analysisResult &&
                analysisResult.reshootTips.length > 0 &&
                !isAnalyzing && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-5">
                    <div className="flex items-start gap-3">
                      <Lightbulb
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#D97706]"
                        aria-hidden="true"
                      />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-amber-950">
                          重拍優化建議（提升點擊與帶看意願）
                        </h3>
                        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-amber-900">
                          {analysisResult.reshootTips.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="font-mono text-xs font-bold tabular-nums mt-0.5">
                                {idx + 1}.
                              </span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* ================================================= */}
      {/* Sub-tab 2: Real Estate AI Image Prompt Generator  */}
      {/* ================================================= */}
      {subTab === "image_prompt" && (
        <div className="space-y-6">
          <form
            onSubmit={handleGenerateImagePrompt}
            className="rounded-xl border border-slate-200 bg-white"
          >
            {/* Step 1: Image Type */}
            <section className="border-b border-slate-200 p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                    01.
                  </span>
                  選擇圖片類型
                </h2>
                <span className="text-xs text-slate-500">
                  適用 Midjourney、Gemini、Imagen 等主流 AI 繪圖工具
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {VISUAL_IMAGE_TYPES.map((item) => {
                  const selected = imageType === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setImageType(item.value)}
                      className={`flex min-h-[76px] flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ${
                        selected
                          ? "border-[#1E3A5F] bg-[#F2F6FA] ring-1 ring-[#1E3A5F]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${
                          selected ? "text-[#1E3A5F]" : "text-slate-900"
                        }`}
                      >
                        {item.value}
                      </span>
                      <span className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Visual Style */}
            <section className="border-b border-slate-200 p-5 sm:p-6">
              <h2 className="mb-4 text-base font-bold text-slate-900">
                <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                  02.
                </span>
                選擇視覺風格
              </h2>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
                {VISUAL_STYLES.map((st) => {
                  const selected = visualStyle === st.value;
                  return (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setVisualStyle(st.value)}
                      className={`flex min-h-[72px] flex-col items-start justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ${
                        selected
                          ? "border-[#1E3A5F] bg-[#F2F6FA] ring-1 ring-[#1E3A5F]"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${
                          selected ? "text-[#1E3A5F]" : "text-slate-900"
                        }`}
                      >
                        {st.value}
                      </span>
                      <span className="mt-1 text-xs leading-snug text-slate-500">
                        {st.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 3: Aspect Ratio & Negative Space */}
            <section className="p-5 sm:p-6 space-y-5">
              <h2 className="text-base font-bold text-slate-900">
                <span className="mr-2 font-mono text-sm font-semibold text-[#D97706] tabular-nums">
                  03.
                </span>
                畫面比例與文字留白設定
              </h2>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {VISUAL_RATIOS.map((r) => {
                  const selected = aspectRatio === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setAspectRatio(r.value)}
                      className={`min-h-[48px] rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        selected
                          ? "border-[#1E3A5F] bg-[#1E3A5F] text-white"
                          : "border-slate-200 bg-[#F8FAFC] text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Checkbox for typography whitespace */}
              <button
                type="button"
                role="checkbox"
                aria-checked={reserveTextSpace}
                onClick={() => setReserveTextSpace((prev) => !prev)}
                className={`flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  reserveTextSpace
                    ? "border-[#1E3A5F]/40 bg-[#F2F6FA]"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                {reserveTextSpace ? (
                  <CheckSquare
                    className="h-5 w-5 shrink-0 text-[#1E3A5F]"
                    aria-hidden="true"
                  />
                ) : (
                  <Square
                    className="h-5 w-5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    右側或上方保留文字排版空間
                  </p>
                  <p className="text-xs text-slate-500">
                    勾選後會自動加入負空間構圖指令，方便後續用 Canva 壓上物件總價、賀成交或聯絡資訊
                  </p>
                </div>
              </button>

              {/* Optional Custom Detail */}
              <div>
                <label
                  htmlFor="visual-extra-notes"
                  className="mb-1.5 block text-sm font-semibold text-slate-800"
                >
                  補充畫面元素（選填）
                </label>
                <input
                  id="visual-extra-notes"
                  type="text"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="例：落地窗大客廳配淺灰 L 型布沙發與木質餐桌／中秋圓月與柔和燈籠點綴"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  點擊後將同時產出「中文說明版」與「英文高精度繪圖提示詞（含畫質、光線與鏡頭關鍵字）」
                </p>
                <button
                  type="submit"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#1E3A5F] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#162C49] whitespace-nowrap shrink-0"
                >
                  <Send className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <span>生成中英文繪圖提示詞</span>
                </button>
              </div>
            </section>
          </form>

          {/* Generated Dual Output */}
          {promptOutput && (
            <div
              ref={promptResultRef}
              className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2"
            >
              {/* Chinese Guide */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      中文說明版
                    </h3>
                    <p className="text-xs text-slate-500">
                      快速核對風格、構圖留白與光線方向
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyChineseGuide}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    {copiedZh ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>一鍵複製</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 text-sm leading-relaxed text-slate-700">
                    {promptOutput.chineseGuide}
                  </div>
                </div>
              </div>

              {/* English High-Precision Prompt */}
              <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      英文高精度繪圖提示詞
                    </h3>
                    <p className="text-xs text-slate-500">
                      含畫質、自然光線、鏡頭與構圖比例參數
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyEnglishPrompt}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#D97706] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#B45309] whitespace-nowrap shrink-0"
                  >
                    {copiedEn ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>一鍵複製英文 Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-[#F8FAFC] p-4 font-mono text-[13px] leading-relaxed text-slate-800">
                    {promptOutput.englishPrompt}
                  </div>
                  {promptOutput.isVirtualStaging && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-red-800">
                      {VIRTUAL_STAGING_COMPLIANCE_NOTICE}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Red Compliance Bar whenever Virtual Staging is selected */}
          {isVirtualStagingSelected && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold leading-relaxed text-red-900">
                    {VIRTUAL_STAGING_COMPLIANCE_NOTICE}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onCopyPlainText(
                      VIRTUAL_STAGING_SHORT_DISCLAIMER,
                      "已複製合規警語，可直接貼到刊登貼文或圖片角落"
                    )
                  }
                  className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-3.5 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 whitespace-nowrap"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>複製合規警語</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import { X, Check, UserCheck } from "lucide-react";
import type { SignatureProfile } from "../types/workstation";
import { formatSignatureBlock, hasSignatureContent } from "../utils/storage";

interface SignatureDrawerProps {
  isOpen: boolean;
  profile: SignatureProfile;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (profile: SignatureProfile) => Promise<void> | void;
}

export const SignatureDrawer: React.FC<SignatureDrawerProps> = ({
  isOpen,
  profile,
  isSaving = false,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<SignatureProfile>(profile);

  useEffect(() => {
    if (isOpen) {
      setDraft(profile);
    }
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const previewText = formatSignatureBlock(draft).trim();
  const hasAny = hasSignatureContent(draft);

  const handleApplySample = () => {
    setDraft({
      enabled: true,
      name: "陳柏宇 經理",
      branch: "永慶不動產 大安仁愛加盟店",
      phone: "0912-345-678",
      lineId: "@chenhouse888",
      licenseNumber: "(112)登字第438291號",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(draft);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-drawer-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-5 w-5 text-[#1E3A5F]" aria-hidden="true" />
            <h2
              id="signature-drawer-title"
              className="text-base font-bold text-slate-900"
            >
              自訂個人簽名檔
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉設定視窗"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {/* Auto-append toggle */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  複製文案時自動附加簽名檔
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  開啟後，每次一鍵複製實戰話術或貼文，會自動帶入您的聯絡資訊
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.enabled}
                onClick={() =>
                  setDraft((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
                  draft.enabled ? "bg-[#1E3A5F]" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    draft.enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                儲存於雲端資料庫，跨裝置皆可同步取用
              </span>
              <button
                type="button"
                onClick={handleApplySample}
                className="text-xs font-semibold text-[#D97706] hover:text-[#B45309] underline underline-offset-2"
              >
                填入示範名片
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="sig-name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  姓名與職稱
                </label>
                <input
                  id="sig-name"
                  type="text"
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="例：陳柏宇 經理"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sig-branch"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  品牌與加盟店名
                </label>
                <input
                  id="sig-branch"
                  type="text"
                  value={draft.branch}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, branch: e.target.value }))
                  }
                  placeholder="例：永慶不動產 大安仁愛店"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sig-phone"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  聯絡電話
                </label>
                <input
                  id="sig-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="例：0912-345-678"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="sig-line"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  LINE ID
                </label>
                <input
                  id="sig-line"
                  type="text"
                  value={draft.lineId}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, lineId: e.target.value }))
                  }
                  placeholder="例：@chenhouse888"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="sig-license"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                不動產營業員／經紀人證號（選填）
              </label>
              <input
                id="sig-license"
                type="text"
                value={draft.licenseNumber}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    licenseNumber: e.target.value,
                  }))
                }
                placeholder="例：(112)登字第438291號"
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1E3A5F] focus:outline-none"
              />
            </div>

            {/* Live signature preview */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">
                文案末端附加預覽
              </p>
              <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {hasAny ? (
                  previewText
                ) : (
                  <span className="text-slate-400">
                    尚未填寫簽名資訊，填寫後這裡會即時顯示附加於文案末端的名片樣式。
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#1E3A5F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#162C49] disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {isSaving ? "儲存中..." : "儲存簽名檔"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

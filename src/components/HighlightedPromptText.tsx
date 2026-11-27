import React from "react";

interface HighlightedPromptTextProps {
  template: string;
  values?: Record<string, string>;
  compact?: boolean;
}

export const HighlightedPromptText: React.FC<HighlightedPromptTextProps> = ({
  template,
  values = {},
  compact = false,
}) => {
  const segments = template.split(/(\[[^\]]+\])/g);

  return (
    <div
      className={`whitespace-pre-wrap break-words text-slate-700 ${
        compact ? "text-[13px] leading-relaxed" : "text-[14px] leading-7"
      }`}
    >
      {segments.map((segment, index) => {
        const match = /^\[([^\]]+)\]$/.exec(segment);
        if (!match) {
          return <React.Fragment key={index}>{segment}</React.Fragment>;
        }
        const varName = match[1].trim();
        const filledValue = (values[varName] ?? "").trim();

        if (filledValue) {
          return (
            <mark
              key={index}
              className="mx-0.5 inline rounded bg-[#E8EFF7] px-1.5 py-0.5 font-semibold text-[#1E3A5F]"
            >
              {filledValue}
            </mark>
          );
        }

        return (
          <mark
            key={index}
            className="mx-0.5 inline rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900"
          >
            [{varName}]
          </mark>
        );
      })}
    </div>
  );
};

export type WorkspaceTab = "guided" | "toolbox" | "visual" | "library";

export type ScenarioId =
  | "prospecting"
  | "showing"
  | "marketing"
  | "negotiation"
  | "tax_law";

export type ToneId =
  | "consultant"
  | "friendly"
  | "analytical"
  | "short_video";

export type RefineMode = "concise" | "softer" | "line_emoji";

export type ToolboxCategory =
  | "開發與委託"
  | "帶看與抗性"
  | "行銷與影音"
  | "稅務與法規";

export type RoomArea =
  | "客廳"
  | "廚房"
  | "臥室"
  | "陽台"
  | "外觀公設"
  | "格局圖";

export type VisionOutputPurpose =
  | "FB 吸睛貼文"
  | "591 條列賣點"
  | "帶看亮點筆記";

export interface VisionAnalysisResult {
  detectedHighlights: string[];
  copywriting: string;
  needsPhotoImprovement: boolean;
  reshootTips: string[];
}

export type VisualImageType =
  | "空屋虛擬裝潢示意"
  | "個人形象海報背景"
  | "節慶屋主問候圖"
  | "社區生活圈插圖";

export type VisualStyle =
  | "現代簡約"
  | "北歐暖木"
  | "日式無印"
  | "商務質感"
  | "手繪插畫風";

export type VisualAspectRatio = "1:1" | "9:16" | "16:9";

export interface VisualPromptOutput {
  chineseGuide: string;
  englishPrompt: string;
  isVirtualStaging: boolean;
}

export interface DynamicFieldConfig {
  id: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea" | "chips";
  options?: string[];
  required?: boolean;
}

export interface ScenarioConfig {
  id: ScenarioId;
  title: string;
  shortDesc: string;
  roleTitle: string;
  defaultTargetHint: string;
  fields: DynamicFieldConfig[];
  sampleValues: Record<string, string>;
}

export interface ToneConfig {
  id: ToneId;
  label: string;
  summary: string;
  promptDirective: string;
}

export interface ToolboxTemplate {
  id: string;
  category: ToolboxCategory;
  title: string;
  channel: string;
  summary: string;
  promptBody: string;
  variableHints: Record<string, string>;
}

export interface SignatureProfile {
  enabled: boolean;
  name: string;
  branch: string;
  phone: string;
  lineId: string;
  licenseNumber: string;
}

export interface SavedDraftItem {
  id: string;
  source: "guided" | "toolbox" | "visual";
  title: string;
  categoryLabel: string;
  toneLabel?: string;
  prompt: string;
  draft: string;
  createdAt: number;
  isFavorite?: boolean;
}

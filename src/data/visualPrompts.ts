import type {
  RoomArea,
  VisionOutputPurpose,
  VisualAspectRatio,
  VisualImageType,
  VisualPromptOutput,
  VisualStyle,
} from "../types/workstation";

export const VIRTUAL_STAGING_COMPLIANCE_NOTICE =
  "實務提醒：使用 AI 模擬裝潢圖對外刊登時，請務必加註「本圖為裝潢風格示意，實際屋況以現場為準」，避免廣告不實爭議。";

export const VIRTUAL_STAGING_SHORT_DISCLAIMER =
  "※ 本圖為裝潢風格示意，實際屋況以現場為準。";

export const ROOM_AREA_OPTIONS: RoomArea[] = [
  "客廳",
  "廚房",
  "臥室",
  "陽台",
  "外觀公設",
  "格局圖",
];

export const VISION_PURPOSE_OPTIONS: VisionOutputPurpose[] = [
  "FB 吸睛貼文",
  "591 條列賣點",
  "帶看亮點筆記",
];

export const VISUAL_IMAGE_TYPES: Array<{
  value: VisualImageType;
  desc: string;
  enSubject: string;
  zhDetail: string;
}> = [
  {
    value: "空屋虛擬裝潢示意",
    desc: "協助買方想像空屋交屋後的居住氛圍與家具尺度",
    enSubject:
      "interior virtual staging renovation concept of a bright Taiwanese residential apartment living and dining space, realistic furniture placement, balanced proportions, inviting livable home atmosphere",
    zhDetail:
      "以台灣住宅常見格局與真實尺度呈現空屋軟裝與裝潢示意，保留自然採光與開闊動線感。",
  },
  {
    value: "個人形象海報背景",
    desc: "適合房仲個人名片、賀成交海報、粉專封面與專業背板",
    enSubject:
      "refined executive real estate consultant portrait backdrop, subtle architectural skyline bokeh and warm sunlit modern lobby depth, premium editorial studio background without people",
    zhDetail:
      "打造沉穩信賴的房仲個人品牌視覺底圖（不含人物主體），方便合成個人去背形象照與成交資訊。",
  },
  {
    value: "節慶屋主問候圖",
    desc: "農曆新年、端午、中秋、節氣與連假發給屋主與買方的質感早安／節慶卡",
    enSubject:
      "warm tasteful seasonal holiday greeting background for Taiwanese real estate clients, subtle modern residence silhouette, cozy glowing windows, refined festive accents without text",
    zhDetail:
      "溫馨大方的台灣節慶問候底圖（畫面不直接生成亂碼文字），適合在 Canva 或 LINE 加上屋主祝福語與個人名片。",
  },
  {
    value: "社區生活圈插圖",
    desc: "呈現公園綠地、捷運通勤、學區商圈與質感社區環境氛圍",
    enSubject:
      "charming vibrant Taiwanese neighborhood lifestyle scene featuring tree-lined park walkways, modern residential towers, cozy street-level cafes, and convenient MRT transit atmosphere, sunny morning sky",
    zhDetail:
      "生動呈現社區周邊綠意公園、學區步道與質感生活機能，適合搭配物件介紹貼文或簡報使用。",
  },
];

export const VISUAL_STYLES: Array<{
  value: VisualStyle;
  desc: string;
  enStyle: string;
  zhStyleDesc: string;
}> = [
  {
    value: "現代簡約",
    desc: "俐落線條、中性灰白與石材金屬點綴，耐看大器",
    enStyle:
      "modern minimalist architectural aesthetic, clean geometric lines, soft neutral alabaster and warm greige palette, brushed metal accents, uncluttered sophistication",
    zhStyleDesc: "現代簡約風：低彩度灰白基調搭配俐落線條與細緻石材肌理，展現都會俐落質感。",
  },
  {
    value: "北歐暖木",
    desc: "溫潤淺木色、亞麻織品與大片日光，首購小家庭最愛",
    enStyle:
      "Scandinavian warm wood aesthetic, natural light oak flooring, cozy linen textures, soft sage greenery accents, airy sunlit hygge ambiance",
    zhStyleDesc: "北歐暖木風：自然淺橡木色系結合柔和亞麻織品與綠植，營造溫暖宜居氛圍。",
  },
  {
    value: "日式無印",
    desc: "原木留白、柔霧自然光與極致收納秩序感",
    enStyle:
      "Japanese Muji serene interior aesthetic, pale natural hinoki and beech wood, tatami-inspired calm textures, soft diffused window daylight, tranquil negative space",
    zhStyleDesc: "日式無印風：原木純白與柔霧自然採光，強調純淨留白與舒壓生活秩序。",
  },
  {
    value: "商務質感",
    desc: "深藍、香檳金與建築光影，建立高階房產顧問權威感",
    enStyle:
      "executive luxury corporate aesthetic, deep navy slate and subtle warm champagne gold highlights, sleek architectural glass reflections, refined commercial editorial lighting",
    zhStyleDesc: "商務質感風：沉穩深藍調搭配溫潤香檳金光影，凸顯專業不動產顧問品牌信任度。",
  },
  {
    value: "手繪插畫風",
    desc: "水彩與細線手繪筆觸，親切無壓迫感、高社群分享率",
    enStyle:
      "delicate architectural watercolor and fine ink editorial illustration style, warm hand-painted textures, charming pastel daylight tones, clean storybook clarity",
    zhStyleDesc: "手繪插畫風：清透水彩與細緻建築線稿筆觸，降低推銷感並提升社群轉發互動率。",
  },
];

export const VISUAL_RATIOS: Array<{
  value: VisualAspectRatio;
  label: string;
  enRatio: string;
  zhUsage: string;
}> = [
  {
    value: "1:1",
    label: "1:1（IG 貼文）",
    enRatio: "square 1:1 composition, --ar 1:1",
    zhUsage: "1:1 正方形構圖（適用 IG 貼文、FB 單圖、LINE 圖文訊息）",
  },
  {
    value: "9:16",
    label: "9:16（Reels 封面或限動）",
    enRatio: "vertical 9:16 portrait composition, --ar 9:16",
    zhUsage: "9:16 直式構圖（適用 Reels / Shorts 封面、IG 限時動態、手機海報）",
  },
  {
    value: "16:9",
    label: "16:9（簡報與 FB 橫幅）",
    enRatio: "widescreen 16:9 landscape composition, --ar 16:9",
    zhUsage: "16:9 橫式寬螢幕（適用屋主委託簡報、FB 粉專封面、YouTube 縮圖）",
  },
];

export function buildVisualPrompt(params: {
  imageType: VisualImageType;
  style: VisualStyle;
  aspectRatio: VisualAspectRatio;
  reserveTextSpace: boolean;
  extraNotes: string;
}): VisualPromptOutput {
  const typeMeta =
    VISUAL_IMAGE_TYPES.find((t) => t.value === params.imageType) ??
    VISUAL_IMAGE_TYPES[0];
  const styleMeta =
    VISUAL_STYLES.find((s) => s.value === params.style) ?? VISUAL_STYLES[0];
  const ratioMeta =
    VISUAL_RATIOS.find((r) => r.value === params.aspectRatio) ??
    VISUAL_RATIOS[0];

  const isVirtualStaging = params.imageType === "空屋虛擬裝潢示意";
  const isIllustration = params.style === "手繪插畫風";
  const trimmedNotes = params.extraNotes.trim();

  const cameraAndQualityEn = isIllustration
    ? "high-resolution editorial artwork, crisp linework, soft ambient daylight, harmonious color grading, clean finished composition, no text, no watermarks"
    : "shot on 24mm wide-angle architectural tilt-shift lens, vertical lines straight, soft natural golden-hour daylight streaming through windows, ultra-detailed photorealistic 8k architectural photography, subtle depth of field, high dynamic range, no text, no logos, no watermarks";

  const spaceEn = params.reserveTextSpace
    ? "thoughtful rule-of-thirds layout with clean uncluttered negative space on the right side and upper third reserved for typography and marketing headline overlay"
    : "balanced full-frame focal composition";

  const notesEn = trimmedNotes
    ? `custom scene details inspired by: ${trimmedNotes}`
    : "";

  const englishPromptParts = [
    typeMeta.enSubject,
    notesEn,
    styleMeta.enStyle,
    spaceEn,
    cameraAndQualityEn,
    ratioMeta.enRatio,
  ].filter(Boolean);

  const englishPrompt = englishPromptParts.join(", ");

  const chineseLines = [
    `【圖片類型】${typeMeta.value} — ${typeMeta.zhDetail}`,
    `【視覺風格】${styleMeta.zhStyleDesc}`,
    `【畫面比例】${ratioMeta.zhUsage}`,
    `【排版留白】${
      params.reserveTextSpace
        ? "已保留「右側與上方」乾淨留白區塊，方便後續壓上物件總價、社區標題與個人聯絡資訊。"
        : "滿版視覺主體構圖，適合純氛圍展示或搭配底部遮罩壓字。"
    }`,
    `【光線與畫質規格】${
      isIllustration
        ? "高解析水彩插畫細節、柔和日光色調、畫面乾淨無雜亂文字浮水印。"
        : "24mm 建築廣角鏡頭（線條筆直不變形）、自然柔光採光、8K 商業級建築攝影質感、不生成亂碼文字。"
    }`,
  ];

  if (trimmedNotes) {
    chineseLines.splice(1, 0, `【補充細節】${trimmedNotes}`);
  }

  if (isVirtualStaging) {
    chineseLines.push(
      "",
      `【法規與實務警語】${VIRTUAL_STAGING_COMPLIANCE_NOTICE}`
    );
  }

  return {
    chineseGuide: chineseLines.join("\n"),
    englishPrompt,
    isVirtualStaging,
  };
}

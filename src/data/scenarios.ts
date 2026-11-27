import type { ScenarioConfig, ScenarioId, ToneConfig, ToneId } from "../types/workstation";

export const TONE_OPTIONS: ToneConfig[] = [
  {
    id: "consultant",
    label: "專業顧問感",
    summary: "沉穩理性、條理分明，強化房仲專業信賴感",
    promptDirective:
      "採用「專業顧問感」語氣：語調沉穩有條理、立場客觀中立，以實務經驗與市場觀察協助客戶做決定，避免過度推銷話術。",
  },
  {
    id: "friendly",
    label: "親切鄰家感",
    summary: "溫暖真誠、零壓迫感，適合 LINE 日常互動",
    promptDirective:
      "採用「親切鄰家感」語氣：像關心朋友一樣溫暖自然、字句輕鬆好讀，讓屋主或買方沒有壓力，願意主動回覆開啟對話。",
  },
  {
    id: "analytical",
    label: "數據理性派",
    summary: "實價登錄與數字切入，降低雙方情緒拉扯",
    promptDirective:
      "採用「數據理性派」語氣：以實價登錄行情、單價比較、公設比、持有成本與市場供需數據為主軸，用客觀事實取代空泛形容詞。",
  },
  {
    id: "short_video",
    label: "短影音節奏感",
    summary: "前 3 秒吸睛鉤子、口語俐落、畫面感強",
    promptDirective:
      "採用「短影音節奏感」語氣：開場前 3 秒必須給出強烈痛點或反差鉤子，句型短促有節奏感、口語好唸，並標註畫面切換與結尾引導留言。",
  },
];

export const SCENARIO_CONFIGS: ScenarioConfig[] = [
  {
    id: "prospecting",
    title: "開發委託",
    shortDesc: "陌生開發、專任委託優勢溝通、屋主行情引導",
    roleTitle: "資深台灣不動產開發店長",
    defaultTargetHint: "協助屋主建立信任並取得委託或合理調價共識",
    fields: [
      {
        id: "goal",
        label: "本次溝通目標",
        placeholder: "請選擇溝通目標",
        type: "chips",
        options: [
          "陌生開發破冰",
          "爭取專任委託",
          "引導修正開價",
          "久售未成重啟委託",
        ],
        required: true,
      },
      {
        id: "propertyInfo",
        label: "物件類型與社區條件",
        placeholder: "例：板橋新板特區 15 年電梯大樓，3 房含坡平車位，權狀 42.5 坪",
        type: "text",
        required: true,
      },
      {
        id: "priceGap",
        label: "屋主開價與實價登錄行情",
        placeholder: "例：屋主開價 3,280 萬，同社區近半年實價登錄約 2,880～2,980 萬",
        type: "text",
        required: true,
      },
      {
        id: "ownerConcern",
        label: "屋主主要顧慮或抗性",
        placeholder: "例：擔心簽專任會被綁死、覺得自己裝潢花很多錢不想讓步",
        type: "textarea",
      },
    ],
    sampleValues: {
      goal: "爭取專任委託",
      propertyInfo: "板橋新板特區 15 年電梯大樓，3 房 2 廳 2 衛＋坡平車位，權狀 42.5 坪",
      priceGap: "屋主期望實拿 2,950 萬，同社區近半年實價登錄單價約 68～71 萬/坪",
      ownerConcern: "屋主已經給兩家簽一般約但看屋人不多，擔心簽專任會少掉曝光機會",
    },
  },
  {
    id: "showing",
    title: "帶看跟進",
    shortDesc: "帶看前需求盤點、現場抗性化解、LINE 暖心回訪",
    roleTitle: "台灣高成交率買方服務顧問",
    defaultTargetHint: "回應買方真實顧慮，推進下一次帶看或進一步出價意願",
    fields: [
      {
        id: "channel",
        label: "跟進情境與管道",
        placeholder: "請選擇使用情境",
        type: "chips",
        options: [
          "LINE 帶看後暖心跟進",
          "現場抗性化解話術",
          "帶看前需求盤點清單",
          "冷卻買方重新喚醒",
        ],
        required: true,
      },
      {
        id: "propertyHighlight",
        label: "帶看物件與關鍵條件",
        placeholder: "例：竹北高鐵特區 2+1 房，總價 2,180 萬，公設比 31%、邊間雙面採光",
        type: "text",
        required: true,
      },
      {
        id: "buyerProfile",
        label: "客戶背景與購屋需求",
        placeholder: "例：園區新婚夫妻首購自住，預算 2,100 萬內，重視上班通勤與學區",
        type: "text",
        required: true,
      },
      {
        id: "objection",
        label: "客戶現場反應或最大抗性",
        placeholder: "例：很喜歡格局方正跟社區管理，但介意屋齡 18 年且客浴沒開窗",
        type: "textarea",
      },
    ],
    sampleValues: {
      channel: "LINE 帶看後暖心跟進",
      propertyHighlight: "竹北高鐵特區 2+1 房＋平面車位，開價 2,180 萬，邊間雙面採光、格局方正",
      buyerProfile: "竹科新婚夫妻首購自住，自備款約 450 萬，希望年底前入住",
      objection: "喜歡社區管理跟採光，但覺得屋齡 17 年稍舊、主臥衛浴沒有開窗有點猶豫",
    },
  },
  {
    id: "marketing",
    title: "物件行銷",
    shortDesc: "FB 吸睛貼文、591 專業介紹、Reels 短影音開箱腳本",
    roleTitle: "台灣不動產數位行銷與短影音文案總監",
    defaultTargetHint: "凸顯物件稀缺價值，提升私訊預約看屋與來電率",
    fields: [
      {
        id: "platform",
        label: "目標發布平台",
        placeholder: "請選擇發布平台",
        type: "chips",
        options: [
          "FB 粉專／社團貼文",
          "591 房屋交易網介紹",
          "Reels／Shorts 30 秒腳本",
          "LINE 官方帳號推播",
        ],
        required: true,
      },
      {
        id: "propertySpec",
        label: "物件類型、格局與坪數",
        placeholder: "例：台中七期惠來公園旁 3 房 2 廳 2 衛＋平面車位，權狀 48.2 坪（室內 29.8 坪）",
        type: "text",
        required: true,
      },
      {
        id: "priceInfo",
        label: "開價與價格優勢",
        placeholder: "例：開價 2,480 萬（單價 51.4 萬/坪，低於同社區最新實登行情）",
        type: "text",
        required: true,
      },
      {
        id: "highlights",
        label: "屋況與生活圈最大亮點",
        placeholder: "例：一手屋主惜屋免整理、三面採光、低公設比 29%、步行 4 分鐘到捷運與明星國小",
        type: "textarea",
      },
    ],
    sampleValues: {
      platform: "FB 粉專／社團貼文",
      propertySpec: "台中南屯文心森林公園旁 3 房 2 廳 2 衛＋坡平車位，權狀 46.8 坪（主建物 27.5 坪）",
      priceInfo: "開價 2,480 萬，單價低於近期同路段新案近 10 萬/坪",
      highlights: "一手屋主惜屋、格局方正零走道浪費、三面採光雙衛浴開窗，步行 5 分鐘到捷運站",
    },
  },
  {
    id: "negotiation",
    title: "議價斡旋",
    shortDesc: "引導買方下斡旋、加價追價溝通、屋主底價談判",
    roleTitle: "台灣資深不動產議價與成交談判專家",
    defaultTargetHint: "縮小買賣雙方認知差距，溫和有力推進斡旋與見面談",
    fields: [
      {
        id: "stage",
        label: "議價對象與談判階段",
        placeholder: "請選擇談判階段",
        type: "chips",
        options: [
          "引導買方下斡旋",
          "買方加價／追價溝通",
          "向屋主報價談底價",
          "見面談破冰促成",
        ],
        required: true,
      },
      {
        id: "offerGap",
        label: "開價、出價與目標成交區間",
        placeholder: "例：開價 1,980 萬，買方先出 1,780 萬，屋主底價約 1,880 萬",
        type: "text",
        required: true,
      },
      {
        id: "marketData",
        label: "實價登錄與市場籌碼",
        placeholder: "例：同社區近三筆實登 54～56 萬/坪，目前同棟只有這一戶釋出",
        type: "text",
        required: true,
      },
      {
        id: "painPoints",
        label: "買賣雙方核心顧慮",
        placeholder: "例：買方怕買貴且自備款緊；屋主已買新房希望三個月內完成交屋",
        type: "textarea",
      },
    ],
    sampleValues: {
      stage: "引導買方下斡旋",
      offerGap: "開價 1,980 萬，買方心裡預算在 1,800～1,850 萬之間，擔心出太低被屋主拒絕",
      marketData: "同社區近半年實價登錄成交 1,840 萬與 1,870 萬，高樓層景觀戶已半年無釋出",
      painPoints: "買方看了 3 個月很怕追高買貴，同時又怕這戶被別組買方搶先下斡旋",
    },
  },
  {
    id: "tax_law",
    title: "稅務法規白話解說",
    shortDesc: "房地合一稅 2.0、重購退稅、新青安與貸款成數",
    roleTitle: "熟悉台灣不動產稅務與貸款的資深代書顧問型房仲",
    defaultTargetHint: "把複雜稅法轉成客戶一聽就懂的白話案例與檢核重點",
    fields: [
      {
        id: "topic",
        label: "稅務或貸款主題",
        placeholder: "請選擇諮詢主題",
        type: "chips",
        options: [
          "房地合一稅 2.0 計算",
          "自住重購退稅條件",
          "新青安與貸款成數",
          "土地增值稅自用優惠",
        ],
        required: true,
      },
      {
        id: "clientCondition",
        label: "客戶持有年限或購屋條件",
        placeholder: "例：109 年以 1,450 萬購入，今年預計 2,050 萬售出，夫妻與小孩皆設籍滿 4 年",
        type: "text",
        required: true,
      },
      {
        id: "question",
        label: "客戶最擔心或想搞懂的問題",
        placeholder: "例：現在賣稅率是多少？如果換大房子能不能申請重購退稅？",
        type: "textarea",
        required: true,
      },
      {
        id: "delivery",
        label: "說明格式與使用管道",
        placeholder: "請選擇說明方式",
        type: "chips",
        options: [
          "LINE 條列懶人包",
          "現場口語白話解說腳本",
          "簽委託前稅費試算提醒",
        ],
      },
    ],
    sampleValues: {
      topic: "自住重購退稅條件",
      clientCondition: "110 年買入兩房 1,350 萬，今年預計 1,820 萬賣出，想換 2,400 萬三房，全程自住無出租",
      question: "想知道先賣後買還是先買後賣比較好？兩年內重購退稅有哪些地雷要避開（例如 5 年閉鎖期）？",
      delivery: "LINE 條列懶人包",
    },
  },
];

export function getScenarioById(id: ScenarioId): ScenarioConfig {
  return SCENARIO_CONFIGS.find((s) => s.id === id) ?? SCENARIO_CONFIGS[0];
}

export function getToneById(id: ToneId): ToneConfig {
  return TONE_OPTIONS.find((t) => t.id === id) ?? TONE_OPTIONS[0];
}

export function buildStructuredPrompt(
  scenario: ScenarioConfig,
  values: Record<string, string>,
  tone: ToneConfig
): string {
  const filledRows = scenario.fields
    .map((field) => {
      const val = (values[field.id] ?? "").trim();
      const displayVal = val || `（請依「${field.placeholder.replace(/^例：/, "")}」之台灣常見情境補充示範）`;
      return `- ${field.label}：${displayVal}`;
    })
    .join("\n");

  const extraRuleByScenario: Record<ScenarioId, string> = {
    prospecting:
      "請在內容中自然展現對社區行情的掌握度與具體行銷承諾，結尾設計一個「低壓力、好回覆」的具體下一步（例如：提供免費社區實登行情表、約 15 分鐘現場勘屋估價）。",
    showing:
      "請先同理肯定客戶的觀察（不要反駁客戶），再透過客觀優點或實務解方轉化抗性，結尾留一個溫和的互動提問，提升客戶回覆率。",
    marketing:
      "請設計抓眼球的標題或前 3 秒鉤子，清楚分段列出物件亮點與生活機能，避免誇大不實或違反不動產廣告法規字眼，結尾加上明確預約賞屋行動呼籲。",
    negotiation:
      "請善用「實價登錄客觀數據」與「雙贏框架」，避免直接否定對方的價格期待，提供具體可照唸的對話轉折句與下一步推進建議。",
    tax_law:
      "請先用一句白話結論讓客戶安心，再用 3～4 個條列重點拆解條件、試算邏輯與常見地雷（如設籍、無出租營業、5 年列管等），文末提醒實際稅額與貸款成數仍以國稅局核定及承貸銀行審核為準。",
  };

  return `【角色設定】
你是一位擁有 15 年實務經驗的「${scenario.roleTitle}」，熟悉台灣不動產市場、實價登錄行情與第一線屋主／買方溝通心理。

【任務場景】
${scenario.title} — ${scenario.defaultTargetHint}

【案件與客戶資訊】
${filledRows}

【語氣與風格規範】
${tone.promptDirective}

【輸出要求】
1. 使用道地台灣繁體中文與房仲專業用語（如：社區、公設比、權狀坪數、格局方正、實價登錄、斡旋、專任委託）。
2. ${extraRuleByScenario[scenario.id]}
3. 直接輸出「可立即複製使用」的實戰文案／話術草稿，排版適合手機螢幕閱讀，不要加上多餘的機器人開場白或解釋。`;
}

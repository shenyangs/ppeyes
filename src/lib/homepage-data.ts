export type MetricKey = "all" | "relevant" | "actionable" | "warning";

export type SortMode = "brand" | "opportunity" | "latest" | "risk";

export type TimeFilter = "全部" | "近 1 小时" | "今日" | "近 24 小时";

export type RiskLevel = "低" | "中" | "高";

export type EventAction = "可借势" | "可观察" | "需谨慎";

export type EventSentiment = "正向" | "中性" | "敏感";

export type EventTrend = "上升" | "持平" | "回落";

export type WatchlistType = "品牌词" | "竞品词" | "行业词" | "风险词";

export type EventItem = {
  id: string;
  title: string;
  summary: string;
  capturedAt?: string;
  sources: string[];
  firstSeen: string;
  trend: EventTrend;
  industry: string;
  sentiment: EventSentiment;
  risk: RiskLevel;
  relevance: number;
  opportunity: number;
  action: EventAction;
  reason: string;
  channels: string[];
  angles: string[];
  headlines: string[];
  draft: string;
  riskNote: string;
  nextStep: string;
  timeWindow: TimeFilter;
  heatDelta: number;
  watchlists: WatchlistType[];
  saved?: boolean;
};

export const filterOptions = {
  time: ["全部", "近 1 小时", "今日", "近 24 小时"] as TimeFilter[],
  platform: ["微博", "抖音", "小红书", "B 站", "知乎", "百度"],
  industry: ["全部", "咖啡饮品", "美妆个护", "3C 数码", "餐饮零售", "汽车出行", "通用"],
  watchlist: ["品牌词", "竞品词", "行业词", "风险词"] as WatchlistType[],
  risk: ["全部", "低", "中", "高"] as const,
  sort: [
    { key: "brand" as SortMode, label: "品牌优先" },
    { key: "opportunity" as SortMode, label: "机会优先" },
    { key: "latest" as SortMode, label: "最新" },
    { key: "risk" as SortMode, label: "风险优先" }
  ]
};

export const sampleEvents: EventItem[] = [
  {
    id: "1",
    title: "打工人午后困意话题冲上热榜，办公室提神场景讨论升温",
    summary: "微博与小红书同时出现关于午后低能量、咖啡续命和办公室提神仪式的高热讨论。",
    sources: ["微博", "小红书"],
    firstSeen: "09:20",
    trend: "上升",
    industry: "咖啡饮品",
    sentiment: "中性",
    risk: "低",
    relevance: 86,
    opportunity: 78,
    action: "可借势",
    reason: "与年轻职场人和产品使用情境高度相关，能自然挂到办公室续命、提神效率和轻社交内容。",
    channels: ["小红书", "微博", "抖音"],
    angles: ["办公室共鸣梗", "产品使用场景代入", "通勤与午后状态轻观点"],
    headlines: [
      "今天打工人的续命时刻到了",
      "当午后困意遇上办公室咖啡场景",
      "这波热议，品牌可以这样自然接住"
    ],
    draft:
      "每个打工人的下午两点，都值得有一杯像样的续命搭子。今天这波关于午后困意的讨论，我们想把答案交给更具体的场景：开会前、写方案前、通勤后那口熟悉的提神感。",
    riskNote: "避免使用过度内卷或负面情绪表达，不建议碰职场压榨类敏感延伸。",
    nextStep: "建议今天内发一条轻图文或短视频，优先小红书和微博。",
    timeWindow: "近 1 小时",
    heatDelta: 92,
    watchlists: ["品牌词", "行业词"]
  },
  {
    id: "2",
    title: "某头部竞品联名包装被热议，评论区聚焦设计审美与价格感知",
    summary: "竞品新品联名冲上平台热榜，用户讨论从包装设计延伸到联名价值和购买门槛。",
    sources: ["微博", "知乎"],
    firstSeen: "08:05",
    trend: "持平",
    industry: "餐饮零售",
    sentiment: "中性",
    risk: "中",
    relevance: 91,
    opportunity: 65,
    action: "可观察",
    reason: "竞品关联度高，适合作为市场参考，但直接下场会显得过度对标。",
    channels: ["知乎", "公众号"],
    angles: ["联名价值观点", "用户真实购买门槛讨论", "品牌审美差异化回应"],
    headlines: [
      "联名热度之外，用户到底在买什么",
      "当包装被讨论时，品牌真正该看的是价值感",
      "竞品热议背后，值得复盘的不是表面设计"
    ],
    draft:
      "这类联名热议最值得关注的，不只是包装好不好看，而是用户是否真的感受到溢价合理。对品牌来说，这是一次理解审美、价格带和实际转化关系的好窗口。",
    riskNote: "不建议直接点名竞品进行比较，避免引发站队式对立。",
    nextStep: "建议加入机会池，作为内部复盘素材与策略参考。",
    timeWindow: "今日",
    heatDelta: 54,
    watchlists: ["竞品词", "行业词"]
  },
  {
    id: "3",
    title: "代言人相关舆论波动加剧，品牌关联讨论出现负向扩散趋势",
    summary: "多个平台开始出现品牌与代言人争议内容的并列讨论，情绪正在从围观转向质疑。",
    sources: ["微博", "百度"],
    firstSeen: "07:40",
    trend: "上升",
    industry: "通用",
    sentiment: "敏感",
    risk: "高",
    relevance: 88,
    opportunity: 22,
    action: "需谨慎",
    reason: "虽然品牌相关度很高，但舆情方向偏负面，传播价值低于风险成本。",
    channels: ["公关内参", "内部简报"],
    angles: ["舆情观察", "客服口径统一", "回应预案准备"],
    headlines: [
      "当前不建议做外部传播动作",
      "需要优先统一内部口径",
      "高关联舆情进入预警观察阶段"
    ],
    draft:
      "当前讨论情绪不稳定，建议暂停一切借势动作，优先监测传播链路和评论关键词，保留内部回应预案。",
    riskNote: "避免发布任何轻松化、玩梗化内容，避免在未确认前做公开解释。",
    nextStep: "建议立刻标记为预警事件，仅用于内部同步。",
    timeWindow: "近 1 小时",
    heatDelta: 87,
    watchlists: ["品牌词", "风险词"]
  },
  {
    id: "4",
    title: "春季通勤防晒话题热度走高，用户开始分享补涂与便携场景",
    summary: "小红书与抖音出现大量春季通勤防晒内容，重点集中在轻便补涂、清爽妆效和随身携带。",
    sources: ["小红书", "抖音"],
    firstSeen: "10:05",
    trend: "上升",
    industry: "美妆个护",
    sentiment: "正向",
    risk: "低",
    relevance: 74,
    opportunity: 84,
    action: "可借势",
    reason: "场景明确、用户需求真实，天然适合产品教育和生活方式表达。",
    channels: ["小红书", "抖音", "视频号"],
    angles: ["通勤防晒 checklist", "包内必备场景内容", "补涂误区轻科普"],
    headlines: [
      "春季通勤包里，真的该有一支随手能补的防晒",
      "补涂这件事，终于有了更轻松的打开方式",
      "从地铁到办公室，防晒场景不该只停在海边"
    ],
    draft:
      "最近大家都在聊通勤路上的补涂体验，其实真正被需要的不是更复杂的步骤，而是更顺手的场景方案：出门前、地铁口、午休后都能轻松完成。",
    riskNote: "避免医疗功效暗示，内容更适合生活方式和使用体验表达。",
    nextStep: "建议今天内发布一条种草型内容，配合通勤场景短视频。",
    timeWindow: "近 1 小时",
    heatDelta: 95,
    watchlists: ["品牌词", "行业词"]
  },
  {
    id: "5",
    title: "新能源汽车长途补能体验再起讨论，用户聚焦排队焦虑与路线规划",
    summary: "知乎和微博出现关于节假日前补能效率的集中讨论，负面情绪主要围绕等待时间与服务体验。",
    sources: ["知乎", "微博"],
    firstSeen: "06:50",
    trend: "持平",
    industry: "汽车出行",
    sentiment: "敏感",
    risk: "中",
    relevance: 69,
    opportunity: 48,
    action: "可观察",
    reason: "是强行业议题，但用户情绪略紧绷，更适合服务信息或经验型内容，不适合玩梗式传播。",
    channels: ["知乎", "公众号", "视频号"],
    angles: ["长途补能经验", "路线规划实用指南", "品牌服务力视角"],
    headlines: [
      "长途补能焦虑，品牌更应该回应什么",
      "当用户谈排队时，他们真正需要的是确定性",
      "节前补能讨论升温，内容可以从服务视角切入"
    ],
    draft:
      "用户讨论的表面是排队，深层其实是路线不确定和体验焦虑。更适合做信息型、陪伴型内容，而不是轻松蹭热点。",
    riskNote: "避免贬低竞品或夸大自家能力，建议用实用信息和服务语气。",
    nextStep: "建议先观察 2 至 4 小时，若继续发酵可输出实用内容。",
    timeWindow: "近 24 小时",
    heatDelta: 46,
    watchlists: ["行业词"]
  },
  {
    id: "6",
    title: "平台热议 AI 提效办公模板，评论区开始追问真实效率与落地门槛",
    summary: "B 站和知乎出现一批高讨论内容，围绕 AI 办公模板是否真的能帮团队提效展开争议和经验分享。",
    sources: ["B 站", "知乎"],
    firstSeen: "11:10",
    trend: "上升",
    industry: "3C 数码",
    sentiment: "中性",
    risk: "低",
    relevance: 72,
    opportunity: 71,
    action: "可借势",
    reason: "话题具备高讨论性和模板化传播潜力，适合用清单、案例、效率方法的方式承接。",
    channels: ["B 站", "知乎", "公众号"],
    angles: ["效率工具清单", "团队协作案例拆解", "真提效还是伪命题的轻观点"],
    headlines: [
      "AI 模板热背后，团队真正缺的是可落地流程",
      "不是每个模板都能提效，但好工具能",
      "当大家都在找捷径，品牌可以给出更清晰的方法"
    ],
    draft:
      "最近关于 AI 提效模板的讨论很热，但用户真正关心的不是模板本身，而是它能不能嵌进真实工作流。品牌更适合用案例和方法给出更可信的答案。",
    riskNote: "避免绝对化承诺，不建议把复杂工作简单包装成一步到位。",
    nextStep: "建议做一条案例型内容，优先知乎与公众号。",
    timeWindow: "近 1 小时",
    heatDelta: 90,
    watchlists: ["行业词", "竞品词"]
  }
];

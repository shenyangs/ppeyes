import {
  filterOptions,
  sampleEvents,
  type EventItem,
  type MetricKey,
  type SortMode,
  type TimeFilter,
  type WatchlistType
} from "@/lib/homepage-data";
import { buildBrandView, normalizeBrandProfile, type BrandProfile, type BrandView } from "@/lib/brand";
import type {
  OpportunityStatus,
  StoredOpportunity,
  StoredWatchlistTerm
} from "@/lib/storage";

export type WatchlistGroup = {
  title: string;
  count: number;
  description: string;
  tags: string[];
};

export type WatchlistHit = {
  type: string;
  keyword: string;
  time: string;
  note: string;
};

export type WatchlistsPayload = {
  stats: {
    totalTerms: number;
    hitsToday: number;
    highPriority: number;
  };
  groups: WatchlistGroup[];
  templates: {
    title: string;
    note: string;
  }[];
  hits: WatchlistHit[];
  principles: string[];
  terms: StoredWatchlistTerm[];
};

export type OpportunityLane = {
  title: string;
  count: number;
  items: string[];
};

export type OpportunityPick = {
  title: string;
  timing: string;
  format: string;
  note: string;
};

export type OpportunitiesPayload = {
  stats: {
    weeklyAdded: number;
    pendingToday: number;
    executed: number;
  };
  lanes: OpportunityLane[];
  picks: OpportunityPick[];
  rules: string[];
  future: string[];
  saved: StoredOpportunity[];
};

export type BriefingTemplate = {
  title: string;
  description: string;
};

export type GeneratedBriefing = {
  title: string;
  type: string;
  note: string;
};

export type BriefingsPayload = {
  templates: BriefingTemplate[];
  recent: GeneratedBriefing[];
  structure: string[];
  delivery: string[];
};

export type WorkspacePayload = {
  events: WorkspaceEvent[];
  metrics: {
    key: MetricKey;
    label: string;
    value: number;
    detail: string;
  }[];
  fetchedAt: string;
  source: "live" | "snapshot" | "fallback";
  brandProfile: BrandProfile | null;
  availablePlatforms: string[];
};

export type WorkspaceQuery = {
  q?: string;
  time?: TimeFilter;
  industry?: string;
  risk?: "全部" | "低" | "中" | "高";
  platforms?: string[];
  watchlists?: WatchlistType[];
  metric?: MetricKey;
  sort?: SortMode;
  brandProfile?: Partial<BrandProfile> | null;
};

export type WorkspaceEvent = EventItem & {
  brandView?: BrandView;
};

function getBrandVerdictRank(event: WorkspaceEvent) {
  if (!event.brandView) return 0;
  if (event.brandView.verdict === "强策划") return 3;
  if (event.brandView.verdict === "可策划") return 2;
  return 1;
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

function extractSearchTokens(query: string) {
  return query
    .trim()
    .toLowerCase()
    .split(/[\s,，、/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesQuery(event: WorkspaceEvent, query: string) {
  if (!query) return true;

  const normalizedQuery = normalizeSearchText(query);
  const tokens = extractSearchTokens(query);
  const haystackParts = [
    event.title,
    event.summary,
    event.reason,
    event.draft,
    event.industry,
    event.sentiment,
    event.risk,
    event.action,
    event.trend,
    ...event.sources,
    ...event.channels,
    ...event.angles,
    ...event.headlines,
    ...event.watchlists,
    event.brandView?.verdict || "",
    event.brandView?.reason || "",
    event.brandView?.angle || ""
  ];
  const haystack = haystackParts.join(" ").toLowerCase();
  const normalizedHaystack = normalizeSearchText(haystack);

  if (normalizedHaystack.includes(normalizedQuery)) {
    return true;
  }

  if (tokens.length === 0) {
    return true;
  }

  return tokens.every((token) => normalizedHaystack.includes(normalizeSearchText(token)));
}

function sortEvents(events: WorkspaceEvent[], sortMode: SortMode) {
  return [...events].sort((a, b) => {
    if (sortMode === "brand") {
      return (
        getBrandVerdictRank(b) - getBrandVerdictRank(a) ||
        (b.brandView?.score || 0) - (a.brandView?.score || 0) ||
        b.opportunity - a.opportunity
      );
    }

    if (sortMode === "latest") {
      return b.heatDelta - a.heatDelta;
    }

    if (sortMode === "risk") {
      const riskRank = { 高: 3, 中: 2, 低: 1 };
      return riskRank[b.risk] - riskRank[a.risk] || b.relevance - a.relevance;
    }

    return b.opportunity - a.opportunity || b.relevance - a.relevance;
  });
}

function applyMetric(events: WorkspaceEvent[], activeMetric: MetricKey) {
  if (activeMetric === "relevant") {
    return events.filter((event) => (event.brandView?.score || event.relevance) >= 75);
  }

  if (activeMetric === "actionable") {
    return events.filter((event) => event.action === "可借势");
  }

  if (activeMetric === "warning") {
    return events.filter((event) => event.risk === "高" || event.action === "需谨慎");
  }

  return events;
}

function buildWorkspaceMetrics(events: WorkspaceEvent[], brandProfile: BrandProfile | null) {
  return [
    {
      key: "all" as MetricKey,
      label: "今日热点",
      value: events.length,
      detail: "全平台去重后的统一事件流"
    },
    {
      key: "relevant" as MetricKey,
      label: brandProfile ? "品牌可接" : "与你相关",
      value: events.filter((event) => (event.brandView?.score || event.relevance) >= 75).length,
      detail: brandProfile ? "按当前品牌视角筛出的高适配热点" : "高相关度品牌与行业机会"
    },
    {
      key: "actionable" as MetricKey,
      label: "可借势",
      value: events.filter((event) => event.action === "可借势").length,
      detail: "适合今日内快速响应"
    },
    {
      key: "warning" as MetricKey,
      label: "需预警",
      value: events.filter((event) => event.risk === "高" || event.action === "需谨慎").length,
      detail: "建议优先内部观察与同步"
    }
  ];
}

function buildAvailablePlatforms(events: WorkspaceEvent[]) {
  const present = new Set(events.flatMap((event) => event.sources));
  return filterOptions.platform.filter((platform) => present.has(platform));
}

function isFreshEvent(event: WorkspaceEvent) {
  if (!event.capturedAt) return false;
  const capturedAtMs = new Date(event.capturedAt).getTime();
  if (!Number.isFinite(capturedAtMs)) return false;
  return Date.now() - capturedAtMs <= 1000 * 60 * 60 * 12;
}

export function buildWorkspacePayload(
  query: WorkspaceQuery = {},
  savedEventIds: string[] = [],
  inputEvents: WorkspaceEvent[] = sampleEvents,
  source: "live" | "snapshot" | "fallback" = "fallback",
  fetchedAt = "2026-03-22T11:30:00+08:00"
): WorkspacePayload {
  const {
    q = "",
    time = "全部",
    industry = "全部",
    risk = "全部",
    platforms = [],
    watchlists = ["品牌词", "竞品词", "行业词"],
    metric = "all",
    sort = "opportunity",
    brandProfile: inputBrandProfile = null
  } = query;

  const normalizedPlatforms = platforms.filter((item) => filterOptions.platform.includes(item));
  const normalizedWatchlists = watchlists.filter((item) => filterOptions.watchlist.includes(item));
  const brandProfile = normalizeBrandProfile(inputBrandProfile);
  const enrichedEvents = inputEvents.map<WorkspaceEvent>((event) => ({
    ...event,
    brandView: brandProfile ? event.brandView || buildBrandView(event, brandProfile) : undefined
  }));
  const freshEvents = enrichedEvents.filter(isFreshEvent);

  const filtered = freshEvents
    .map((event) => ({
      ...event,
      saved: savedEventIds.includes(event.id)
    }))
    .filter((event) => {
      const matchesQuery = includesQuery(event, q);
      const matchesTime = time === "全部" ? true : event.timeWindow === time;
    const matchesIndustry = industry === "全部" ? true : event.industry === industry;
    const matchesRisk = risk === "全部" ? true : event.risk === risk;
    const matchesPlatform =
      normalizedPlatforms.length === 0
        ? true
        : event.sources.some((source) => normalizedPlatforms.includes(source));
    const matchesWatchlist =
      normalizedWatchlists.length === 0
        ? true
        : event.watchlists.some((item) => normalizedWatchlists.includes(item));

      return (
        matchesQuery &&
        matchesTime &&
        matchesIndustry &&
        matchesRisk &&
        matchesPlatform &&
        matchesWatchlist
      );
    });

  return {
    events: sortEvents(applyMetric(filtered, metric), sort),
    metrics: buildWorkspaceMetrics(freshEvents, brandProfile),
    fetchedAt,
    source,
    brandProfile,
    availablePlatforms: buildAvailablePlatforms(freshEvents)
  };
}

const watchlistGroupMeta: Record<StoredWatchlistTerm["type"], Omit<WatchlistGroup, "count">> = {
  品牌词: {
    title: "品牌词",
    description: "品牌名、产品名、代言人和 campaign 关键词。",
    tags: ["品牌主词", "产品线", "代言人", "活动名"]
  },
  竞品词: {
    title: "竞品词",
    description: "用于发现竞品发布动作、用户对比和评论迁移。",
    tags: ["头部竞品", "新品名", "联名词", "价格带"]
  },
  行业词: {
    title: "行业词",
    description: "用于覆盖品类趋势、场景需求和内容情绪变化。",
    tags: ["场景词", "趋势词", "品类词", "人群词"]
  },
  风险词: {
    title: "风险词",
    description: "用于识别翻车、投诉、质量、代言人与危机相关信号。",
    tags: ["投诉", "翻车", "质量", "维权"]
  }
};

export function buildWatchlistsPayload(terms: StoredWatchlistTerm[]): WatchlistsPayload {
  return {
    stats: {
      totalTerms: terms.length,
      hitsToday: 17,
      highPriority: terms.filter((item) => item.priority === "高").length
    },
    groups: (Object.keys(watchlistGroupMeta) as StoredWatchlistTerm["type"][]).map((type) => ({
      ...watchlistGroupMeta[type],
      count: terms.filter((item) => item.type === type).length
    })),
    templates: [
      {
        title: "新消费品牌模板",
        note: "品牌词 + 产品名 + 联名词 + 代言人 + 场景趋势词，适合日常内容反应与 campaign 监测。"
      },
      {
        title: "代理公司多客户模板",
        note: "每个客户保留品牌和竞品词包，行业词共享，风险词统一管理，方便晨会快速对比。"
      }
    ],
    hits: [
      { type: "品牌词", keyword: "午后困意", time: "09:20", note: "命中办公室咖啡相关场景" },
      { type: "竞品词", keyword: "联名包装", time: "08:05", note: "竞品联名引发设计和价格讨论" },
      { type: "风险词", keyword: "代言人争议", time: "07:40", note: "相关负向扩散进入高风险观察" },
      { type: "行业词", keyword: "通勤防晒", time: "10:05", note: "小红书与抖音热度同步上升" }
    ],
    principles: [
      "只做简单词包，不做复杂布尔规则。",
      "词包优先回流到工作台事件卡，而不是单独做监测列表。",
      "高风险命中优先进入内部简报和预警卡片。"
    ],
    terms
  };
}

const opportunityStatuses: OpportunityStatus[] = ["新入池", "已选题", "推进中", "已归档"];

export function buildOpportunitiesPayload(saved: StoredOpportunity[]): OpportunitiesPayload {
  return {
    stats: {
      weeklyAdded: saved.length,
      pendingToday: saved.filter((item) => item.status === "新入池" || item.status === "已选题").length,
      executed: saved.filter((item) => item.status === "推进中" || item.status === "已归档").length
    },
    lanes: opportunityStatuses.map((status) => ({
      title: status,
      count: saved.filter((item) => item.status === status).length,
      items: saved.filter((item) => item.status === status).map((item) => item.title)
    })),
    picks: saved.slice(0, 3).map((item) => ({
      title: item.title,
      timing: item.timing,
      format: item.format,
      note: item.note
    })),
    rules: [
      "高相关 + 高机会 + 低风险，直接进入今日候选。",
      "高相关 + 高风险，只进入内部观察，不进入外部内容计划。",
      "竞品类机会优先作为策略输入，谨慎做对外回应。"
    ],
    future: [
      "支持负责人、截止时间和审批状态。",
      "支持一键生成选题会简报。",
      "支持把执行结果回写到评分模型。"
    ],
    saved
  };
}

export const briefingsPayload: BriefingsPayload = {
  templates: [
    {
      title: "晨报",
      description: "今天值得看什么，适合团队在开始工作前快速同步。"
    },
    {
      title: "晚报",
      description: "今天有哪些事件升温、回落或需要继续观察。"
    },
    {
      title: "专题简报",
      description: "围绕品牌、竞品或行业给出集中动态和建议。"
    }
  ],
  recent: [
    {
      title: "03.22 晨报：今日品牌热点优先级",
      type: "晨报",
      note: "包含 8 条高价值机会和 2 条风险提醒。"
    },
    {
      title: "竞品联名讨论专题",
      type: "专题简报",
      note: "聚焦审美争议、价格带和用户评论情绪。"
    },
    {
      title: "03.21 晚报：热度变化回顾",
      type: "晚报",
      note: "记录今日回落与继续升温的事件。"
    }
  ],
  structure: [
    "今日值得优先看的 3 至 5 条事件。",
    "每条事件为什么相关、建议动作和主要风险。",
    "适合内部讨论的优先级排序。"
  ],
  delivery: [
    "优先接飞书和企业微信。",
    "支持晨报、晚报定时推送。",
    "专题简报支持一键分享给客户或内部群。"
  ]
};

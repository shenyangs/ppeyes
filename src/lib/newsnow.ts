import https from "https";
import { sampleEvents, type EventAction, type EventItem, type EventSentiment, type EventTrend } from "@/lib/homepage-data";

type NewsNowItem = {
  id: string | number;
  title: string;
  url?: string;
  mobileUrl?: string;
  extra?: {
    info?: string;
    icon?: {
      url?: string;
      scale?: number;
    };
  };
};

type NewsNowResponse = {
  status: string;
  id: string;
  updatedTime: number;
  items: NewsNowItem[];
};

type NewsNowSourceConfig = {
  id: string;
  label: string;
  baseRelevance: number;
  opportunityBoost: number;
  primaryChannels: string[];
};

export const NEWSNOW_SOURCES: NewsNowSourceConfig[] = [
  {
    id: "weibo",
    label: "微博",
    baseRelevance: 88,
    opportunityBoost: 8,
    primaryChannels: ["微博", "公众号", "小红书"]
  },
  {
    id: "douyin",
    label: "抖音",
    baseRelevance: 84,
    opportunityBoost: 10,
    primaryChannels: ["抖音", "视频号", "小红书"]
  },
  {
    id: "bilibili",
    label: "B 站",
    baseRelevance: 76,
    opportunityBoost: 6,
    primaryChannels: ["B 站", "公众号", "视频号"]
  },
  {
    id: "zhihu",
    label: "知乎",
    baseRelevance: 78,
    opportunityBoost: 5,
    primaryChannels: ["知乎", "公众号", "视频号"]
  },
  {
    id: "baidu",
    label: "百度",
    baseRelevance: 72,
    opportunityBoost: 4,
    primaryChannels: ["百度", "公众号", "视频号"]
  }
];

const NEWSNOW_BASE_URL = "https://asnewsnow.iepose.cn/api/s?id=";

function inferSentiment(title: string): EventSentiment {
  const negativeWords = [
    "爆炸",
    "伤亡",
    "威胁",
    "怒喷",
    "失联",
    "维权",
    "投诉",
    "争议",
    "被拐",
    "醉酒",
    "盗版",
    "抢劫",
    "致死",
    "身亡",
    "死亡",
    "事故",
    "坠楼",
    "火灾",
    "警方通报",
    "袭击"
  ];
  const positiveWords = ["世界水日", "爆火", "绝杀", "官宣", "首发", "上线"];

  if (negativeWords.some((word) => title.includes(word))) return "敏感";
  if (positiveWords.some((word) => title.includes(word))) return "正向";
  return "中性";
}

function inferRisk(sentiment: EventSentiment): EventItem["risk"] {
  if (sentiment === "敏感") return "高";
  if (sentiment === "正向") return "低";
  return "中";
}

function inferAction(risk: EventItem["risk"], title: string): EventAction {
  if (risk === "高") return "需谨慎";
  if (
    title.includes("品牌") ||
    title.includes("AI") ||
    title.includes("官宣") ||
    title.includes("模板") ||
    title.includes("效率") ||
    title.includes("热议") ||
    title.includes("世界水日")
  ) {
    return "可借势";
  }
  return "可观察";
}

function inferIndustry(title: string): string {
  if (title.includes("金价")) return "财经消费";
  if (title.includes("直播") || title.includes("广告") || title.includes("演员") || title.includes("官宣")) {
    return "内容娱乐";
  }
  if (title.includes("AI") || title.includes("模板") || title.includes("办公") || title.includes("协同")) {
    return "3C 数码";
  }
  if (title.includes("汽车") || title.includes("补能")) return "汽车出行";
  if (title.includes("世界水日")) return "通用";
  return "社会热点";
}

function inferWatchlists(title: string): EventItem["watchlists"] {
  if (title.includes("品牌") || title.includes("广告") || title.includes("官宣")) return ["品牌词", "行业词"];
  if (title.includes("竞品") || title.includes("模板") || title.includes("AI")) return ["竞品词", "行业词"];
  if (title.includes("盗版") || title.includes("爆炸") || title.includes("伤亡")) return ["风险词"];
  return ["行业词"];
}

function inferTrend(index: number): EventTrend {
  if (index < 6) return "上升";
  if (index < 14) return "持平";
  return "回落";
}

function inferOpportunity(
  action: EventAction,
  risk: EventItem["risk"],
  index: number,
  source: NewsNowSourceConfig
) {
  if (action === "需谨慎") return Math.max(16, 36 - index + Math.floor(source.opportunityBoost / 3));
  if (action === "可借势") return Math.max(58, 90 - index + source.opportunityBoost);
  return Math.max(40, 72 - index + Math.floor(source.opportunityBoost / 2));
}

function buildSummary(title: string, source: NewsNowSourceConfig, extraInfo?: string) {
  const tail = extraInfo ? ` 当前可见热度信息：${extraInfo}。` : "";
  return `${source.label} 热点实时话题：${title}，当前适合作为品牌团队快速判断是否需要跟进、观察或预警的事件输入。${tail}`;
}

function buildReason(action: EventAction, source: NewsNowSourceConfig) {
  if (action === "需谨慎") {
    return `${source.label} 上的这条话题包含明显敏感或负向讨论，更适合作为内部预警素材，不适合直接做外部借势内容。`;
  }

  if (action === "可借势") {
    return `${source.label} 上已有较强公共讨论度，容易延展到品牌观点、场景表达或产品切口，是可尝试承接的传播入口。`;
  }

  return `${source.label} 上已有热度，但与品牌动作的自然连接还不够强，更适合先观察评论区和二级讨论走向。`;
}

function buildChannels(action: EventAction, source: NewsNowSourceConfig): string[] {
  if (action === "需谨慎") return ["内部简报", "公关群"];
  if (action === "可借势") return source.primaryChannels;
  return [source.label, "公众号"];
}

function buildAngles(action: EventAction, title: string, source: NewsNowSourceConfig): string[] {
  if (action === "需谨慎") {
    return ["舆情观察", "内部回应预案", "客服口径统一"];
  }

  if (action === "可借势") {
    return [`结合 ${source.label} 上的 ${title} 做品牌观点`, "转成用户场景表达", "拆成更适合扩散的轻内容切口"];
  }

  return ["观点观察", `${source.label} 评论区情绪追踪`, "行业侧复盘"];
}

function buildHeadlines(action: EventAction, title: string) {
  if (action === "需谨慎") {
    return ["当前不建议外部跟进", `先观察 ${title} 的评论走向`, "建议进入内部风险同步"];
  }

  if (action === "可借势") {
    return [`借着 ${title}，品牌可以这样说`, `${title} 背后，真正值得聊的是什么`, "把公共热议转成品牌表达的一个角度"];
  }

  return [`先别急着跟 ${title}`, "这条热点更适合当作观察样本", "热度有了，但动作窗口还不够清晰"];
}

function buildDraft(action: EventAction, title: string, source: NewsNowSourceConfig) {
  if (action === "需谨慎") {
    return `围绕“${title}”的讨论目前更适合内部观察，建议暂停任何轻松化借势表达，先跟踪 ${source.label} 上的舆情发酵路径。`;
  }

  if (action === "可借势") {
    return `现在 ${source.label} 上很多人在聊“${title}”。如果品牌要跟，不必生硬贴热点，更适合从用户真实场景、公共情绪或品牌态度切入，做一条自然、不冒犯的轻内容。`;
  }

  return `“${title}” 现在已经在 ${source.label} 上具备讨论度，但更适合先观察二级话题和评论区情绪，等判断出更明确切口后再动作。`;
}

function buildRiskNote(risk: EventItem["risk"]) {
  if (risk === "高") return "避免玩梗和情绪化表达，优先做内部同步。";
  if (risk === "中") return "注意评论区情绪变化，避免生硬蹭热点。";
  return "整体风险较低，但仍建议避免过度品牌化表达。";
}

function buildNextStep(action: EventAction, source: NewsNowSourceConfig) {
  if (action === "需谨慎") return "建议进入内部观察，不建议外发内容。";
  if (action === "可借势") return `建议优先围绕 ${source.label} 的讨论语境，今天内完成一版轻内容或观点卡片。`;
  return "建议继续观察 2 至 4 小时后再决定是否跟进。";
}

function buildFirstSeen(index: number) {
  return `${String(8 + Math.floor(index / 6)).padStart(2, "0")}:${String((index % 6) * 10).padStart(2, "0")}`;
}

function normalizeNewsNowItems(items: NewsNowItem[], source: NewsNowSourceConfig): EventItem[] {
  return items.slice(0, 18).map((item, index) => {
    const sentiment = inferSentiment(item.title);
    const risk = inferRisk(sentiment);
    const action = inferAction(risk, item.title);

    return {
      id: `${source.id}-${index + 1}-${encodeURIComponent(String(item.id || item.title))}`,
      title: item.title,
      summary: buildSummary(item.title, source, item.extra?.info),
      sources: [source.label],
      firstSeen: buildFirstSeen(index),
      trend: inferTrend(index),
      industry: inferIndustry(item.title),
      sentiment,
      risk,
      relevance: Math.max(38, source.baseRelevance - index * 2),
      opportunity: inferOpportunity(action, risk, index, source),
      action,
      reason: buildReason(action, source),
      channels: buildChannels(action, source),
      angles: buildAngles(action, item.title, source),
      headlines: buildHeadlines(action, item.title),
      draft: buildDraft(action, item.title, source),
      riskNote: buildRiskNote(risk),
      nextStep: buildNextStep(action, source),
      timeWindow: index < 8 ? "近 1 小时" : index < 14 ? "今日" : "近 24 小时",
      heatDelta: Math.max(34, 100 - index * 3 + source.opportunityBoost),
      watchlists: inferWatchlists(item.title),
      saved: false
    };
  });
}

function dedupeEvents(events: EventItem[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = event.title.replace(/\s+/g, "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchNewsNowSource(source: NewsNowSourceConfig): Promise<{
  events: EventItem[];
  fetchedAt: string;
}> {
  const targetUrl = `${NEWSNOW_BASE_URL}${source.id}&latest`;

  return new Promise((resolve, reject) => {
    https
      .get(
        targetUrl,
        {
          rejectUnauthorized: false
        },
        (response) => {
          const chunks: Buffer[] = [];

          response.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });

          response.on("end", () => {
            try {
              const raw = Buffer.concat(chunks).toString("utf8");
              const parsed = JSON.parse(raw) as NewsNowResponse;

              if (parsed.status !== "success" || !Array.isArray(parsed.items)) {
                throw new Error(`invalid_newsnow_payload_${source.id}`);
              }

              resolve({
                events: normalizeNewsNowItems(parsed.items, source),
                fetchedAt: new Date(parsed.updatedTime || Date.now()).toISOString()
              });
            } catch (error) {
              reject(error);
            }
          });
        }
      )
      .on("error", reject);
  });
}

export async function fetchNewsNowMultiSource(): Promise<{
  events: EventItem[];
  fetchedAt: string;
  source: "live";
}> {
  return fetchNewsNowSources();
}

export async function fetchNewsNowSources(platformLabels?: string[]): Promise<{
  events: EventItem[];
  fetchedAt: string;
  source: "live";
}> {
  const targetSources =
    platformLabels && platformLabels.length > 0
      ? NEWSNOW_SOURCES.filter((source) => platformLabels.includes(source.label))
      : NEWSNOW_SOURCES;

  const results = await Promise.allSettled(targetSources.map((source) => fetchNewsNowSource(source)));
  const successful = results
    .filter((result): result is PromiseFulfilledResult<{ events: EventItem[]; fetchedAt: string }> => result.status === "fulfilled")
    .map((result) => result.value);

  if (successful.length === 0) {
    throw new Error("newsnow_sources_unavailable");
  }

  const mergedEvents = dedupeEvents(successful.flatMap((result) => result.events)).slice(0, 90);
  const fetchedAt = successful
    .map((result) => result.fetchedAt)
    .sort()
    .reverse()[0];

  return {
    events: mergedEvents,
    fetchedAt,
    source: "live"
  };
}

export function buildFallbackNewsNow() {
  return {
    events: sampleEvents,
    fetchedAt: new Date().toISOString(),
    source: "fallback" as const
  };
}

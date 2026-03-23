import https from "https";
import { promises as fs } from "fs";
import path from "path";
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
const NEWSNOW_REQUEST_TIMEOUT_MS = 7000;
const NEWSNOW_MAX_ITEMS_PER_SOURCE = 24;
const NEWSNOW_MAX_MERGED_EVENTS = 120;
const NEWSNOW_STALE_SNAPSHOT_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const NEWSNOW_MAX_SOURCE_AGE_MS = 1000 * 60 * 60 * 18;
const NEWSNOW_SNAPSHOT_FILE = path.join(process.cwd(), "data", "newsnow-live-snapshot.json");

let latestLiveSnapshot: {
  events: EventItem[];
  fetchedAt: string;
  cachedAt: number;
} | null = null;

async function persistSnapshotToDisk(snapshot: { events: EventItem[]; fetchedAt: string; cachedAt: number }) {
  try {
    await fs.mkdir(path.dirname(NEWSNOW_SNAPSHOT_FILE), { recursive: true });
    await fs.writeFile(NEWSNOW_SNAPSHOT_FILE, JSON.stringify(snapshot), "utf8");
  } catch {}
}

async function loadSnapshotFromDisk(maxAgeMs = NEWSNOW_STALE_SNAPSHOT_MAX_AGE_MS) {
  try {
    const raw = await fs.readFile(NEWSNOW_SNAPSHOT_FILE, "utf8");
    const parsed = JSON.parse(raw) as {
      events?: EventItem[];
      fetchedAt?: string;
      cachedAt?: number;
    };

    if (!Array.isArray(parsed.events) || typeof parsed.fetchedAt !== "string") {
      return null;
    }

    const cachedAt = typeof parsed.cachedAt === "number" ? parsed.cachedAt : new Date(parsed.fetchedAt).getTime();
    if (!Number.isFinite(cachedAt)) {
      return null;
    }

    if (Date.now() - cachedAt > maxAgeMs) {
      return null;
    }

    return {
      events: parsed.events,
      fetchedAt: parsed.fetchedAt,
      cachedAt
    };
  } catch {
    return null;
  }
}

export async function loadLatestNewsNowSnapshot(maxAgeMs = NEWSNOW_STALE_SNAPSHOT_MAX_AGE_MS): Promise<{
  events: EventItem[];
  fetchedAt: string;
  source: "snapshot";
} | null> {
  const inMemoryFresh =
    latestLiveSnapshot && Date.now() - latestLiveSnapshot.cachedAt <= maxAgeMs ? latestLiveSnapshot : null;

  if (inMemoryFresh) {
    return {
      events: inMemoryFresh.events,
      fetchedAt: inMemoryFresh.fetchedAt,
      source: "snapshot"
    };
  }

  const diskSnapshot = await loadSnapshotFromDisk(maxAgeMs);
  if (!diskSnapshot) return null;

  latestLiveSnapshot = diskSnapshot;

  return {
    events: diskSnapshot.events,
    fetchedAt: diskSnapshot.fetchedAt,
    source: "snapshot"
  };
}

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

type TopicLens = {
  name: string;
  keywords: string[];
  industry: string;
  defaultAction: EventAction;
  watchlists: EventItem["watchlists"];
  reasonHint: string;
  observeHint: string;
  angleTemplates: [string, string, string];
  headlineTemplates: [string, string, string];
  draftTemplate: string;
  nextStepTemplate: string;
};

const TOPIC_LENSES: TopicLens[] = [
  {
    name: "竞技体育",
    keywords: ["BLG", "夺冠", "决赛", "郑钦文", "马拉松", "比赛", "联赛", "冠军"],
    industry: "内容娱乐",
    defaultAction: "可借势",
    watchlists: ["行业词", "品牌词"],
    reasonHint: "用户情绪聚合快、扩散效率高，适合做价值态度型借势",
    observeHint: "先盯评论区情绪是否持续正向",
    angleTemplates: [
      "把「{title}」转成品牌的拼搏/专业价值表达",
      "做一条赛果速评 + 场景联想的轻内容",
      "评论区互动：邀请用户补充同类经历或观点"
    ],
    headlineTemplates: [
      "借着「{title}」，品牌可以这样接",
      "这波竞技热议里，最能代表品牌态度的一点",
      "从「{title}」提炼一个可传播观点"
    ],
    draftTemplate:
      "围绕「{title}」，建议不要只做赛况复述，而是把用户情绪和品牌价值绑定在一个可共鸣场景里，形成更容易转发的短内容。",
    nextStepTemplate: "建议 2 小时内完成一版借势文案 + 一版海报标题。"
  },
  {
    name: "科技数码",
    keywords: ["AI", "机器人", "卫星", "芯片", "苹果", "办公", "效率", "模板", "模型"],
    industry: "3C 数码",
    defaultAction: "可借势",
    watchlists: ["竞品词", "行业词"],
    reasonHint: "讨论点天然可转成产品能力解释，适合做功能化表达",
    observeHint: "先确认用户关注的是技术价值还是情绪争议",
    angleTemplates: [
      "把「{title}」转译成一个可落地的效率场景",
      "用 3 步说明品牌能力如何解决同类问题",
      "对比“概念热度”与“真实可用性”的差异"
    ],
    headlineTemplates: [
      "「{title}」很热，但真正有用的是这一步",
      "从这条科技热议里，品牌能给出的实用答案",
      "别只聊概念，聊聊「{title}」怎么落地"
    ],
    draftTemplate:
      "围绕「{title}」，建议以“真实场景 + 可执行方法”来组织内容，让用户快速理解品牌方案到底解决什么问题。",
    nextStepTemplate: "建议今天内产出 1 条图文清单 + 1 条场景短视频脚本。"
  },
  {
    name: "财经消费",
    keywords: ["金价", "黄金", "白银", "油价", "股市", "债市", "美元", "汇率"],
    industry: "财经消费",
    defaultAction: "可借势",
    watchlists: ["行业词"],
    reasonHint: "用户决策焦虑明显，适合做理性解释与实用建议",
    observeHint: "先看争议点是情绪宣泄还是实际决策问题",
    angleTemplates: [
      "围绕「{title}」做“用户最关心问题”拆解",
      "给出一张决策清单，降低理解门槛",
      "避免立场化表达，重点放在方法与边界"
    ],
    headlineTemplates: [
      "面对「{title}」，普通用户最该先看什么",
      "这波财经热议，品牌可以提供哪些确定性",
      "别急着站队，先把「{title}」讲清楚"
    ],
    draftTemplate:
      "围绕「{title}」，建议用“结论先行 + 风险提示 + 可执行建议”的结构，帮助用户快速完成信息判断。",
    nextStepTemplate: "建议优先发布一条“3 点结论”短内容，并在评论区补充问答。"
  },
  {
    name: "文娱话题",
    keywords: ["演员", "剧", "电影", "综艺", "热议", "官宣", "迪丽热巴", "张凌赫", "撕拉片"],
    industry: "内容娱乐",
    defaultAction: "可借势",
    watchlists: ["品牌词", "行业词"],
    reasonHint: "讨论活跃且轻量传播空间大，适合做情绪共鸣型内容",
    observeHint: "先看是否出现舆情争议拐点",
    angleTemplates: [
      "从「{title}」提炼一个大众共鸣情绪点",
      "借势但不贴脸，用场景化表达降低突兀感",
      "用一句观点 + 一组视觉做轻量扩散"
    ],
    headlineTemplates: [
      "这条「{title}」热议，品牌可以这样自然接",
      "当大家都在聊「{title}」，最适合的表达角度是",
      "借势不硬蹭：从「{title}」到品牌内容的一步"
    ],
    draftTemplate:
      "围绕「{title}」，建议使用“共鸣情绪 + 生活场景 + 品牌观点”三段式，避免单纯追星式表达。",
    nextStepTemplate: "建议今天内先发一条轻观点内容，观察互动后再做二次扩展。"
  },
  {
    name: "社会民生",
    keywords: ["学校", "班主任", "家委会", "气象站", "治水", "春游", "交通", "教育"],
    industry: "通用",
    defaultAction: "可观察",
    watchlists: ["行业词"],
    reasonHint: "公共讨论度高，但品牌动作更适合克制表达",
    observeHint: "先确认政策/事实层面的新增信息",
    angleTemplates: [
      "将「{title}」转成“用户真正关心的问题”清单",
      "先做事实梳理，再决定是否转成品牌观点",
      "用中性口吻输出方法论，避免情绪对冲"
    ],
    headlineTemplates: [
      "关于「{title}」，先把关键事实讲明白",
      "这条民生话题，品牌更适合怎么说",
      "别急着借势，先看「{title}」的讨论结构"
    ],
    draftTemplate:
      "围绕「{title}」，建议先做观察型内容，聚焦事实与方法，不做立场化输出，等待更清晰窗口再动作。",
    nextStepTemplate: "建议先观察 2-4 小时评论区走势，再决定是否跟进。"
  }
];

const DEFAULT_TOPIC_LENS: TopicLens = {
  name: "通用观察",
  keywords: [],
  industry: "社会热点",
  defaultAction: "可观察",
  watchlists: ["行业词"],
  reasonHint: "有讨论热度，但仍需找到更明确的品牌切口",
  observeHint: "先看二级话题与评论情绪走向",
  angleTemplates: ["提炼「{title}」中的核心讨论点", "从用户场景看可承接内容机会", "先做小规模测试内容验证反应"],
  headlineTemplates: ["先别急着跟「{title}」", "热度有了，动作窗口还要再确认", "把「{title}」先转成内部观察样本"],
  draftTemplate: "围绕「{title}」，当前更适合观察和拆解讨论结构，等待更明确切口后再出手。",
  nextStepTemplate: "建议继续观察 2 至 4 小时后再决定是否跟进。"
};

function fillTemplate(template: string, title: string) {
  return template.replaceAll("{title}", title);
}

function pickTopicLens(title: string): TopicLens {
  return TOPIC_LENSES.find((lens) => lens.keywords.some((keyword) => title.includes(keyword))) || DEFAULT_TOPIC_LENS;
}

function inferAction(risk: EventItem["risk"], lens: TopicLens): EventAction {
  if (risk === "高") return "需谨慎";
  return lens.defaultAction;
}

function inferIndustry(lens: TopicLens): string {
  return lens.industry;
}

function inferWatchlists(risk: EventItem["risk"], lens: TopicLens): EventItem["watchlists"] {
  if (risk === "高") return ["风险词"];
  return lens.watchlists;
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

function buildReason(action: EventAction, source: NewsNowSourceConfig, lens: TopicLens) {
  if (action === "需谨慎") {
    return `${source.label} 上的这条话题包含明显敏感或负向讨论，更适合作为内部预警素材，不适合直接做外部借势内容。`;
  }

  if (action === "可借势") {
    return `${source.label} 上已有较强公共讨论度，${lens.reasonHint}，可直接进入借势策划。`;
  }

  return `${source.label} 上已有热度，${lens.reasonHint}，建议先观察后再决定外发。`;
}

function buildChannels(action: EventAction, source: NewsNowSourceConfig): string[] {
  if (action === "需谨慎") return ["内部简报", "公关群"];
  if (action === "可借势") return source.primaryChannels;
  return [source.label, "公众号"];
}

function buildAngles(action: EventAction, title: string, source: NewsNowSourceConfig, lens: TopicLens): string[] {
  if (action === "需谨慎") {
    return ["舆情观察", "内部回应预案", "客服口径统一"];
  }

  return lens.angleTemplates.map((template) => fillTemplate(template, title));
}

function buildHeadlines(action: EventAction, title: string, lens: TopicLens) {
  if (action === "需谨慎") {
    return ["当前不建议外部跟进", `先观察 ${title} 的评论走向`, "建议进入内部风险同步"];
  }

  return lens.headlineTemplates.map((template) => fillTemplate(template, title));
}

function buildDraft(action: EventAction, title: string, source: NewsNowSourceConfig, lens: TopicLens) {
  if (action === "需谨慎") {
    return `围绕“${title}”的讨论目前更适合内部观察，建议暂停任何轻松化借势表达，先跟踪 ${source.label} 上的舆情发酵路径。`;
  }

  return fillTemplate(lens.draftTemplate, title);
}

function buildRiskNote(risk: EventItem["risk"]) {
  if (risk === "高") return "避免玩梗和情绪化表达，优先做内部同步。";
  if (risk === "中") return "注意评论区情绪变化，避免生硬蹭热点。";
  return "整体风险较低，但仍建议避免过度品牌化表达。";
}

function buildNextStep(action: EventAction, source: NewsNowSourceConfig, lens: TopicLens) {
  if (action === "需谨慎") return "建议进入内部观察，不建议外发内容。";
  if (action === "可借势") return `建议优先围绕 ${source.label} 的讨论语境，今天内完成一版轻内容或观点卡片。`;
  return lens.nextStepTemplate || `${source.label} 上先观察评论区情绪后再决定跟进节奏。`;
}

function formatFirstSeen(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai"
  });
}

function inferTimeWindow(timestamp: number) {
  const ageMs = Date.now() - timestamp;
  if (ageMs <= 1000 * 60 * 60) return "近 1 小时";
  if (ageMs <= 1000 * 60 * 60 * 24) return "今日";
  return "近 24 小时";
}

function normalizeNewsNowItems(items: NewsNowItem[], source: NewsNowSourceConfig, sourceUpdatedTime: number): EventItem[] {
  return items.slice(0, NEWSNOW_MAX_ITEMS_PER_SOURCE).map((item, index) => {
    const lens = pickTopicLens(item.title);
    const sentiment = inferSentiment(item.title);
    const risk = inferRisk(sentiment);
    const action = inferAction(risk, lens);
    const capturedAtMs = Math.max(sourceUpdatedTime - index * 1000 * 60 * 3, sourceUpdatedTime - 1000 * 60 * 60 * 12);
    const capturedAt = new Date(capturedAtMs).toISOString();

    return {
      id: `${source.id}-${index + 1}-${encodeURIComponent(String(item.id || item.title))}`,
      title: item.title,
      summary: buildSummary(item.title, source, item.extra?.info),
      capturedAt,
      sources: [source.label],
      firstSeen: formatFirstSeen(capturedAtMs),
      trend: inferTrend(index),
      industry: inferIndustry(lens),
      sentiment,
      risk,
      relevance: Math.max(38, source.baseRelevance - index * 2),
      opportunity: inferOpportunity(action, risk, index, source),
      action,
      reason: buildReason(action, source, lens),
      channels: buildChannels(action, source),
      angles: buildAngles(action, item.title, source, lens),
      headlines: buildHeadlines(action, item.title, lens),
      draft: buildDraft(action, item.title, source, lens),
      riskNote: buildRiskNote(risk),
      nextStep: buildNextStep(action, source, lens),
      timeWindow: inferTimeWindow(capturedAtMs),
      heatDelta: Math.max(34, 100 - index * 3 + source.opportunityBoost),
      watchlists: inferWatchlists(risk, lens),
      saved: false
    };
  });
}

function dedupeEvents(events: EventItem[]) {
  const deduped = new Map<string, EventItem>();

  events.forEach((event) => {
    const key = event.title.replace(/\s+/g, "").trim();
    if (!key) return;

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, event);
      return;
    }

    const existingCaptured = new Date(existing.capturedAt || 0).getTime();
    const nextCaptured = new Date(event.capturedAt || 0).getTime();

    if (nextCaptured > existingCaptured || (nextCaptured === existingCaptured && event.opportunity > existing.opportunity)) {
      deduped.set(key, event);
    }
  });

  return Array.from(deduped.values());
}

async function fetchNewsNowSource(
  source: NewsNowSourceConfig,
  options: { allowStaleSource?: boolean } = {}
): Promise<{
  events: EventItem[];
  fetchedAt: string;
}> {
  const targetUrl = `${NEWSNOW_BASE_URL}${source.id}&latest&_ts=${Date.now()}`;

  return new Promise((resolve, reject) => {
    const request = https.get(
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

            const updatedTimeMs = Number(parsed.updatedTime) || Date.now();
            if (!options.allowStaleSource && Date.now() - updatedTimeMs > NEWSNOW_MAX_SOURCE_AGE_MS) {
              throw new Error(`stale_newsnow_source_${source.id}`);
            }

            resolve({
              events: normalizeNewsNowItems(parsed.items, source, updatedTimeMs),
              fetchedAt: new Date(updatedTimeMs).toISOString()
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.setTimeout(NEWSNOW_REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`newsnow_timeout_${source.id}`));
    });

    request.on("error", reject);
  });
}

export async function fetchNewsNowMultiSource(): Promise<{
  events: EventItem[];
  fetchedAt: string;
  source: "live" | "snapshot";
}> {
  return fetchNewsNowSources();
}

export async function fetchNewsNowSources(
  platformLabels?: string[],
  options: { allowStaleSource?: boolean } = {}
): Promise<{
  events: EventItem[];
  fetchedAt: string;
  source: "live" | "snapshot";
}> {
  const targetSources =
    platformLabels && platformLabels.length > 0
      ? NEWSNOW_SOURCES.filter((source) => platformLabels.includes(source.label))
      : NEWSNOW_SOURCES;

  const results = await Promise.allSettled(
    targetSources.map((source) => fetchNewsNowSource(source, options))
  );
  const successful = results
    .filter((result): result is PromiseFulfilledResult<{ events: EventItem[]; fetchedAt: string }> => result.status === "fulfilled")
    .map((result) => result.value);

  if (successful.length === 0) {
    const snapshot = await loadLatestNewsNowSnapshot();
    if (snapshot) return snapshot;

    throw new Error("newsnow_sources_unavailable");
  }

  const mergedEvents = dedupeEvents(successful.flatMap((result) => result.events)).slice(0, NEWSNOW_MAX_MERGED_EVENTS);
  const fetchedAt = successful
    .map((result) => result.fetchedAt)
    .sort()
    .reverse()[0];

  latestLiveSnapshot = {
    events: mergedEvents,
    fetchedAt,
    cachedAt: Date.now()
  };
  await persistSnapshotToDisk(latestLiveSnapshot);

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

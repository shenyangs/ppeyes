import { buildBrandView, normalizeBrandProfile, type BrandProfile, type BrandView } from "@/lib/brand";
import type { AiSettings } from "@/lib/analysis";
import { cleanJsonBlock, getEnvGeminiSettings, runGeminiTextPrompt } from "@/lib/gemini";
import type { EventItem } from "@/lib/homepage-data";
import type { WorkspaceEvent } from "@/lib/page-data";

type RankedBrandView = BrandView & {
  id: string;
};

const brandRankingCache = new Map<string, { expiresAt: number; ranked: Map<string, BrandView> }>();
const BRAND_RANKING_CACHE_TTL_MS = 1000 * 60 * 10;
const BRAND_RANKING_LIMIT = 28;
const GENERIC_PROFILE_TERMS = new Set([
  "品牌",
  "产品",
  "方案",
  "营销",
  "传播",
  "社媒",
  "内容",
  "用户",
  "团队",
  "企业",
  "线索",
  "增长",
  "认知",
  "转化",
  "AI"
]);

function buildRankingPrompt(events: WorkspaceEvent[], brandProfile: BrandProfile) {
  const serializedEvents = events
    .map((event) =>
      [
        `id:${event.id}`,
        `标题:${event.title}`,
        `摘要:${event.summary}`,
        `平台:${event.sources.join("/")}`,
        `行业:${event.industry}`,
        `情绪:${event.sentiment}`,
        `风险:${event.risk}`,
        `动作:${event.action}`,
        `趋势:${event.trend}`,
        `品牌相关度:${event.relevance}`,
        `传播机会分:${event.opportunity}`
      ].join(" | ")
    )
    .join("\n");

  return [
    "你是中国品牌方的高级营销总监，同时负责社媒热点借势判断。",
    "你的任务不是看关键词像不像，而是判断哪些热点最适合品牌真正拿来做传播策划，并把最值得推到最前面的热点挑出来。",
    "判断标准必须站在高级营销总监视角：",
    "1. 能不能自然转成品牌命题，而不是硬贴热点",
    "2. 能不能落到具体产品、具体场景、具体内容动作",
    "3. 能不能被品牌团队和甲方通过，而不是自嗨",
    "4. 在社媒传播上有没有清晰的切口、话题性和转发讨论空间",
    "5. 风险是否可控，是否需要转译",
    "6. 强策划必须是真的强，不要滥发",
    "7. 仅仅带有'AI'、明星、影视、体育、社会情绪等泛流量元素，不等于适合该品牌强借势",
    "",
    `品牌名：${brandProfile.name || "未填写"}`,
    `产品/方案名：${brandProfile.product || "未填写"}`,
    `品牌一句话：${brandProfile.brief || "未填写"}`,
    `核心能力/卖点：${brandProfile.capabilities || "未填写"}`,
    `当前传播目标：${brandProfile.objective || "未填写"}`,
    `禁碰边界：${brandProfile.guardrails || "未填写"}`,
    "",
    "请对下面每条热点进行判断：",
    serializedEvents,
    "",
    "输出 JSON，格式必须为：",
    '{"items":[{"id":"热点id","score":88,"verdict":"强策划","reason":"一句话说明为什么值得品牌优先上","angle":"一句话写最值得打的传播角度"}]}',
    "",
    "要求：",
    "1. verdict 只能是 强策划 / 可策划 / 谨慎策划",
    "2. score 是 0-100 整数",
    "3. 强策划必须非常克制，只给那些既能品牌化又能产品化、还能社媒化的热点",
    "4. 如果热点只有牵强连接，哪怕能硬做，也只能给 可策划 或 谨慎策划",
    "5. reason 必须像营销总监给团队的判断，不要说空话",
    "6. angle 要指出最值得打的传播切口",
    "7. 只输出 JSON，不要输出额外解释"
  ].join("\n");
}

function getSystemInstruction() {
  return "你是品牌热点判断助手。你要用高级营销总监视角做优先级判断，并且只能输出有效 JSON。";
}

async function runBrandRanking(events: WorkspaceEvent[], brandProfile: BrandProfile, settings: AiSettings) {
  const content = await runGeminiTextPrompt({
    prompt: buildRankingPrompt(events, brandProfile),
    systemInstruction: getSystemInstruction(),
    settings,
    temperature: 0.3,
    timeoutMs: 8000,
    maxAttempts: 1
  });

  const parsed = JSON.parse(cleanJsonBlock(content)) as { items?: RankedBrandView[] };
  return parsed.items || [];
}

function buildCacheKey(events: WorkspaceEvent[], brandProfile: BrandProfile) {
  return JSON.stringify({
    brandProfile,
    ids: events.map((event) => event.id)
  });
}

function extractProfileSignals(brandProfile: BrandProfile) {
  return Array.from(
    new Set(
      [brandProfile.product, brandProfile.brief, brandProfile.capabilities, brandProfile.objective]
        .join(" ")
        .split(/[、,，\/\s|]+/)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2 && item.length <= 10 && !GENERIC_PROFILE_TERMS.has(item))
    )
  );
}

function hasDirectScenarioSignal(event: EventItem, brandProfile: BrandProfile) {
  const eventText = [event.title, event.summary, event.industry, ...event.angles].join(" ");
  const profileSignals = extractProfileSignals(brandProfile);

  return profileSignals.some((signal) => eventText.includes(signal));
}

function mergeBrandViews(
  event: WorkspaceEvent,
  baseView: BrandView,
  aiView: BrandView,
  brandProfile: BrandProfile
): BrandView {
  const hasDirectSignal = hasDirectScenarioSignal(event, brandProfile);
  const blendedScore = Math.round(baseView.score * 0.45 + aiView.score * 0.55);

  if (
    aiView.verdict === "强策划" &&
    (baseView.verdict === "强策划" || (baseView.score >= 74 && hasDirectSignal)) &&
    blendedScore >= 78
  ) {
    return {
      score: blendedScore,
      verdict: "强策划",
      reason: aiView.reason,
      angle: aiView.angle
    };
  }

  if (aiView.verdict === "强策划") {
    return {
      score: Math.max(blendedScore, 60),
      verdict: "可策划",
      reason: `${aiView.reason} 但从品牌直连度看，这条更适合作为可策划，而不是强策划。`,
      angle: aiView.angle
    };
  }

  if (aiView.verdict === "可策划") {
    if (baseView.verdict === "谨慎策划" && !hasDirectSignal) {
      return {
        score: Math.min(blendedScore, 58),
        verdict: "谨慎策划",
        reason: `${aiView.reason} 但品牌直连度仍偏弱，建议按谨慎策划处理。`,
        angle: aiView.angle
      };
    }

    return {
      score: Math.max(blendedScore, 58),
      verdict: "可策划",
      reason: aiView.reason,
      angle: aiView.angle
    };
  }

  return {
    score: Math.min(blendedScore, 57),
    verdict: "谨慎策划",
    reason: aiView.reason,
    angle: aiView.angle
  };
}

function selectCandidateEvents(events: EventItem[], brandProfile: BrandProfile): WorkspaceEvent[] {
  return events
    .map<WorkspaceEvent>((event) => ({
      ...event,
      brandView: buildBrandView(event, brandProfile)
    }))
    .sort((a, b) => {
      return (
        (b.brandView?.score || 0) - (a.brandView?.score || 0) ||
        b.opportunity - a.opportunity ||
        b.relevance - a.relevance
      );
    })
    .slice(0, BRAND_RANKING_LIMIT);
}

export async function enhanceEventsWithAiBrandView(
  events: EventItem[],
  inputBrandProfile?: Partial<BrandProfile> | null
): Promise<WorkspaceEvent[]> {
  const brandProfile = normalizeBrandProfile(inputBrandProfile);
  const fallbackEvents = events.map<WorkspaceEvent>((event) => ({
    ...event,
    brandView: brandProfile ? buildBrandView(event, brandProfile) : undefined
  }));

  if (!brandProfile) {
    return fallbackEvents;
  }

  const settings = getEnvGeminiSettings();
  if (!settings) {
    return fallbackEvents;
  }

  const candidates = selectCandidateEvents(events, brandProfile);
  if (candidates.length === 0) {
    return fallbackEvents;
  }

  const cacheKey = buildCacheKey(candidates, brandProfile);
  const cached = brandRankingCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return fallbackEvents.map((event) => ({
      ...event,
      brandView: cached.ranked.get(event.id) || event.brandView
    }));
  }

  try {
    const rankedItems = await runBrandRanking(candidates, brandProfile, settings);
    const rankedMap = new Map<string, BrandView>();

    rankedItems.forEach((item) => {
      if (!item?.id) return;
      rankedMap.set(item.id, {
        score: Math.max(0, Math.min(100, Math.round(item.score))),
        verdict:
          item.verdict === "强策划" || item.verdict === "可策划" || item.verdict === "谨慎策划"
            ? item.verdict
            : "谨慎策划",
        reason: item.reason || "AI 判断这条热点的品牌承接价值有限，需要谨慎判断。",
        angle: item.angle || "先从真实用户场景和品牌价值中寻找更可执行的传播切口。"
      });
    });

    brandRankingCache.set(cacheKey, {
      expiresAt: Date.now() + BRAND_RANKING_CACHE_TTL_MS,
      ranked: rankedMap
    });

    return fallbackEvents.map((event) => ({
      ...event,
      brandView:
        rankedMap.get(event.id) && event.brandView
          ? mergeBrandViews(event, event.brandView, rankedMap.get(event.id) as BrandView, brandProfile)
          : rankedMap.get(event.id) || event.brandView
    }));
  } catch {
    return fallbackEvents;
  }
}

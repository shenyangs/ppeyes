import type { EventItem } from "./homepage-data.ts";

export type BrandProfile = {
  name: string;
  product: string;
  brief: string;
  capabilities: string;
  objective: string;
  guardrails: string;
};

export type BrandView = {
  score: number;
  verdict: "强策划" | "可策划" | "谨慎策划";
  reason: string;
  angle: string;
};

export const emptyBrandProfile: BrandProfile = {
  name: "",
  product: "",
  brief: "",
  capabilities: "",
  objective: "",
  guardrails: ""
};

const brandKeywordRules = [
  {
    label: "咖啡饮品",
    industry: "咖啡饮品",
    keywords: ["咖啡", "饮品", "茶饮", "奶茶", "提神", "通勤", "办公室", "午后", "续命"]
  },
  {
    label: "美妆个护",
    industry: "美妆个护",
    keywords: ["美妆", "护肤", "防晒", "彩妆", "补涂", "妆感", "肌肤", "个护"]
  },
  {
    label: "3C 数码",
    industry: "3C 数码",
    keywords: ["数码", "3c", "效率", "办公", "工具", "协作", "文档", "模板", "知识库", "会议", "软件"]
  },
  {
    label: "餐饮零售",
    industry: "餐饮零售",
    keywords: ["餐饮", "零售", "门店", "联名", "包装", "消费", "上新", "价格"]
  },
  {
    label: "汽车出行",
    industry: "汽车出行",
    keywords: ["汽车", "出行", "新能源", "补能", "充电", "通勤", "长途", "驾驶"]
  }
];

const objectiveRules = [
  {
    keywords: ["声量", "曝光", "破圈", "讨论", "热度"],
    bonus: 10,
    angle: "更适合做观点化或互动型传播，占讨论位。"
  },
  {
    keywords: ["种草", "新品", "上新", "购买", "转化"],
    bonus: 12,
    angle: "更适合做场景种草，把热点转成明确消费理由。"
  },
  {
    keywords: ["心智", "定位", "品牌感", "态度"],
    bonus: 8,
    angle: "更适合做品牌态度表达，而不是硬蹭信息流热点。"
  }
];

const sensitiveWords = [
  "死亡",
  "致死",
  "身亡",
  "抢劫",
  "警方通报",
  "事故",
  "遇难",
  "爆炸",
  "伤亡",
  "袭击",
  "凶杀",
  "坠楼",
  "火灾",
  "维权"
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeBrandProfile(profile?: Partial<BrandProfile> | null): BrandProfile | null {
  const normalized: BrandProfile = {
    name: profile?.name?.trim() || "",
    product: profile?.product?.trim() || "",
    brief: profile?.brief?.trim() || "",
    capabilities: profile?.capabilities?.trim() || "",
    objective: profile?.objective?.trim() || "",
    guardrails: profile?.guardrails?.trim() || ""
  };

  if (
    !normalized.name &&
    !normalized.product &&
    !normalized.brief &&
    !normalized.capabilities &&
    !normalized.objective &&
    !normalized.guardrails
  ) {
    return null;
  }

  return normalized;
}

export function buildBrandView(event: EventItem, profile: BrandProfile): BrandView {
  const profileText = [
    profile.name,
    profile.product,
    profile.brief,
    profile.capabilities,
    profile.objective,
    profile.guardrails
  ]
    .join(" ")
    .toLowerCase();
  const eventText = [event.title, event.summary, event.industry, ...event.sources, ...event.angles]
    .join(" ")
    .toLowerCase();

  let score = 18 + event.opportunity * 0.2 + event.relevance * 0.12;
  const reasons: string[] = [];
  let angle = "建议优先从真实场景切入，避免只复述热点本身。";
  const isSensitiveEvent = includesAny(eventText, sensitiveWords);
  let hasCategoryMatch = false;

  if (event.action === "可借势") {
    score += 8;
  } else if (event.action === "需谨慎") {
    score -= 14;
  }

  if (event.trend === "上升") {
    score += 6;
  }

  const matchedRule = brandKeywordRules.find((rule) => includesAny(profileText, rule.keywords));

  if (matchedRule && event.industry === matchedRule.industry) {
    score += 28;
    hasCategoryMatch = true;
    reasons.push(`热点场景和 ${matchedRule.label} 的品牌语境比较贴近`);
  } else if (matchedRule && includesAny(eventText, matchedRule.keywords)) {
    score += 18;
    hasCategoryMatch = true;
    reasons.push("热点讨论点和品牌日常传播场景有连接空间");
  } else if (matchedRule && event.industry !== "通用") {
    score -= 10;
    reasons.push("热点热度存在，但和品牌核心场景还没有建立起自然连接");
  }

  const matchedObjective = objectiveRules.find((rule) => includesAny(profileText, rule.keywords));

  if (matchedObjective) {
    score += hasCategoryMatch ? matchedObjective.bonus : 4;
    angle = matchedObjective.angle;
    reasons.push("当前传播目标和这条热点的承接方式基本一致");
  }

  if (profile.guardrails) {
    if (event.risk === "高") {
      score -= 18;
      reasons.push("热点本身风险高，和品牌边界容易冲突");
    } else if (event.risk === "中") {
      score -= 6;
      reasons.push("需要先确认边界，再决定是否下场");
    }
  }

  if (isSensitiveEvent) {
    score -= 34;
    angle = "不要碰事件本体，改做转译式策划，例如安全提醒、情绪关怀、常识内容或品牌价值表达。";
    reasons.push("事件属于警情、事故或伤亡语境，必须改成转译式策划，不能直接蹭事件本体");
  }

  if (!matchedRule && event.action === "可观察") {
    score -= 6;
    reasons.push("热点有讨论度，但和品牌主营场景的天然连接还不够强");
  }

  if (reasons.length === 0) {
    reasons.push("这条热点有基础讨论度，但需要品牌主动找到更具体的场景切口");
  }

  const finalScore = clampScore(isSensitiveEvent ? Math.min(score, 42) : score);

  if (finalScore >= 76) {
    return {
      score: finalScore,
      verdict: "强策划",
      reason: `${reasons[0]}，适合直接从品牌场景和传播目标出发做主策划。`,
      angle
    };
  }

  if (finalScore >= 58) {
    return {
      score: finalScore,
      verdict: "可策划",
      reason: `${reasons[0]}，可以做完整策划，但需要先找到更清楚的切入口。`,
      angle
    };
  }

  return {
    score: finalScore,
    verdict: "谨慎策划",
    reason: `${reasons[0]}，仍然要给策划，但策划方式必须绕开热点本体，走转译或间接表达。`,
    angle: isSensitiveEvent
      ? angle
      : "不要硬贴热点本体，改从品牌价值、用户情绪或日常场景做转译式策划。"
  };
}

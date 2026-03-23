import { buildBrandView, normalizeBrandProfile, type BrandProfile } from "@/lib/brand";
import { parseModelJson, runAiTextPrompt, type AiSettings } from "@/lib/gemini";
import type { EventItem } from "@/lib/homepage-data";
export type { AiSettings } from "@/lib/gemini";

export type EventAnalysis = {
  planningType: string;
  campaignName: string;
  targetAudience: string;
  scenario: string;
  coreInsight: string;
  strategyLine: string;
  productLink: string;
  heroAsset: string;
  conclusion: string;
  reasoning: string;
  channels: string[];
  angles: string[];
  headlines: string[];
  draft: string;
  executionSteps: string[];
  contentPlan: string[];
  assetList: string[];
  launchTimeline: string[];
  successMetrics: string[];
  callToAction: string;
  fitScore: number;
  creativeScore: number;
  spreadScore: number;
  riskControlScore: number;
  planningComment: string;
  riskNote: string;
  nextAction: string;
  mode: "live" | "fallback";
};

export function buildFallbackAnalysis(event: EventItem, brandProfile?: Partial<BrandProfile> | null): EventAnalysis {
  const normalizedBrandProfile = normalizeBrandProfile(brandProfile);
  const brandView = normalizedBrandProfile ? buildBrandView(event, normalizedBrandProfile) : null;
  const productName = normalizedBrandProfile?.product || normalizedBrandProfile?.name || "当前产品";
  const capabilityText = normalizedBrandProfile?.capabilities || "一个可被用户感知的具体能力";
  const objectiveText = normalizedBrandProfile?.objective || "把热点讨论转成品牌认知和后续转化";
  const baseFitScore = brandView?.score || event.relevance;
  const riskControlScore = event.risk === "高" ? 58 : event.risk === "中" ? 72 : 84;
  const planningType =
    brandView?.verdict === "强策划"
      ? "主策划"
      : brandView?.verdict === "可策划"
        ? "场景策划"
        : "转译策划";

  return {
    planningType,
    campaignName:
      normalizedBrandProfile?.product || normalizedBrandProfile?.name
        ? `${productName} × ${event.title} 传播策划`
        : `${event.title} 热点策划草案`,
    targetAudience: normalizedBrandProfile?.brief || "关注这条热点的核心办公人群",
    scenario: event.summary,
    coreInsight:
      "用户表面在讨论热点，底层往往在表达更真实的工作阻力、情绪张力或场景痛点，策划必须切到这一层。",
    strategyLine:
      brandView?.verdict === "谨慎策划"
        ? `不碰热点本体，改用真实工作场景切入，让 ${productName} 去承接用户情绪和实际问题。`
        : `借热点情绪切进真实工作场景，再用 ${productName} 把讨论变成具体解决方案。`,
    productLink:
      normalizedBrandProfile?.product || normalizedBrandProfile?.capabilities
        ? `${productName} 要直接落到 ${capabilityText}，把热点讨论改写成用户马上能理解的产品解法。`
        : "需要把具体产品能力嵌进热点场景里，而不是只讲品牌态度。",
    heroAsset:
      normalizedBrandProfile?.product || normalizedBrandProfile?.name
        ? `首发 1 条“热点情绪 -> 办公问题 -> ${productName} 解决方案”的主内容，直接证明 ${capabilityText}。`
        : "首发 1 条把热点情绪转成真实使用场景的主内容。",
    conclusion: brandView
      ? `${brandView.verdict}：先给出可执行策划，再根据风险调整打法。`
      : "先基于这条热点给出一版可执行传播策划，再根据风险和时效微调打法。",
    reasoning: brandView
      ? `${brandView.reason} 当前建议采用“${planningType}”方式推进。`
      : event.reason,
    channels: event.channels,
    angles:
      brandView?.verdict === "谨慎策划"
        ? [
            "绕开热点本体，转成品牌价值或日常场景内容",
            "把公共情绪转成用户共鸣，而不是直接借事件本身",
            "内容重点放在提醒、陪伴、观点或常识，不做硬广"
          ]
        : event.angles,
    headlines:
      brandView?.verdict === "谨慎策划"
        ? [
            "热点之外，品牌更该回应用户当下的真实情绪",
            "不蹭事件本体，也能把这波讨论转成一条好内容",
            "把高风险热点转成品牌可说的话题切口"
          ]
        : event.headlines,
    draft: event.draft,
    executionSteps: [
      "先把热点拆成一个更具体的办公场景，确认内容到底服务哪类用户",
      `把 ${productName} 的 ${capabilityText} 直接嵌进场景里，避免空泛品牌表达`,
      `围绕“${objectiveText}”同步产出主内容、解释内容和转化素材`
    ],
    contentPlan: [
      `主内容：用 1 条清晰内容把热点情绪转成 ${productName} 的具体解决方案，主讲 ${capabilityText}。`,
      `扩散内容：拆出 2-3 条更适合社媒传播的短内容，把“${objectiveText}”说得更易转发。`,
      `转化内容：补 1 条 ${productName} 的功能演示、模板或案例内容，把兴趣推向试用。`
    ],
    assetList: [
      `1 条体现 ${productName} 场景解法的主视觉或首屏海报`,
      `1 条围绕 ${objectiveText} 的社媒主文案或短帖`,
      `1 组 ${capabilityText} 的产品演示截图或短视频素材`
    ],
    launchTimeline: [
      `T+0：先发主内容抢热点时效，先把 ${productName} 和热点场景挂上钩。`,
      `T+1：补发 ${capabilityText} 的功能演示或案例解释内容。`,
      `T+3：沉淀成模板包、案例页或销售可转发素材，服务 ${objectiveText}。`
    ],
    successMetrics: [
      `是否形成一个能被记住的 ${productName} 产品级传播命题。`,
      `是否让用户明确知道 ${capabilityText} 到底解决了什么问题。`,
      `是否沉淀出能服务 ${objectiveText} 的销售或私域转化素材。`
    ],
    callToAction:
      normalizedBrandProfile?.product || normalizedBrandProfile?.capabilities
        ? `引导用户进一步了解 ${productName} 的 ${capabilityText} 与使用方式。`
        : "引导用户进一步了解产品到底能解决什么问题。",
    fitScore: Math.round(baseFitScore),
    creativeScore: Math.round((event.opportunity + baseFitScore) / 2),
    spreadScore: Math.round((event.heatDelta + event.opportunity) / 2),
    riskControlScore,
    planningComment:
      brandView?.verdict === "强策划"
        ? "这条热点可以直接做主策划，重点是把品牌场景说透。"
        : brandView?.verdict === "可策划"
          ? "这条热点适合先确定一个最清晰的传播切口，再做完整策划。"
          : "这条热点也必须给策划，但要做转译，不要直接消费事件本体。",
    riskNote: normalizedBrandProfile?.guardrails
      ? `${event.riskNote} 品牌边界：${normalizedBrandProfile.guardrails}`
      : event.riskNote,
    nextAction: brandView
      ? brandView.verdict === "强策划"
        ? `建议围绕${normalizedBrandProfile?.name || "当前品牌"}快速出一版内容方向，并优先验证 ${brandView.angle}`
        : brandView.verdict === "可策划"
          ? `建议先把主切口定成一条清晰策略，再展开标题、脚本和分发节奏。优先考虑 ${brandView.angle}`
          : `建议先定一个转译方向，不碰热点本体，围绕 ${brandView.angle} 快速出一版安全策划。`
      : `建议先围绕“${event.title}”做一版传播策划草案，再按平台和风险细化执行。`,
    mode: "fallback"
  };
}

function buildPrompt(event: EventItem, brandProfile?: Partial<BrandProfile> | null) {
  const normalizedBrandProfile = normalizeBrandProfile(brandProfile);

  return [
    "你是中国品牌传播团队的热点策划顾问。",
    "你要用品牌策划视角处理这条热点，不要只看字面关键词是否匹配。",
    "硬性要求：无论热点与品牌是否天然相关，你都必须先给出一版可执行的传播策划，不能只说关联有限、不能只说不建议、不能拒绝策划。",
    "如果热点风险高，你也必须给策划，但要改成转译式策划：绕开事件本体，从用户情绪、品牌价值、日常场景、提醒或观点切入。",
    "请基于给定热点，输出品牌传播策划，务必务实、简洁、可执行。",
    "输出 JSON，字段必须严格为：planningType, campaignName, targetAudience, scenario, coreInsight, strategyLine, productLink, heroAsset, conclusion, reasoning, channels, angles, headlines, draft, executionSteps, contentPlan, assetList, launchTimeline, successMetrics, callToAction, fitScore, creativeScore, spreadScore, riskControlScore, planningComment, riskNote, nextAction。",
    "",
    normalizedBrandProfile
      ? `品牌名：${normalizedBrandProfile.name || "未填写"}`
      : "品牌名：未提供",
    normalizedBrandProfile
      ? `产品/方案名：${normalizedBrandProfile.product || "未填写"}`
      : "产品/方案名：未提供",
    normalizedBrandProfile
      ? `品牌一句话：${normalizedBrandProfile.brief || "未填写"}`
      : "品牌一句话：未提供",
    normalizedBrandProfile
      ? `核心能力/卖点：${normalizedBrandProfile.capabilities || "未填写"}`
      : "核心能力/卖点：未提供",
    normalizedBrandProfile
      ? `当前传播目标：${normalizedBrandProfile.objective || "未填写"}`
      : "当前传播目标：未提供",
    normalizedBrandProfile
      ? `禁碰边界：${normalizedBrandProfile.guardrails || "未填写"}`
      : "禁碰边界：未提供",
    "",
    `热点标题：${event.title}`,
    `热点摘要：${event.summary}`,
    `来源平台：${event.sources.join(" / ")}`,
    `趋势：${event.trend}`,
    `行业：${event.industry}`,
    `情绪：${event.sentiment}`,
    `风险等级：${event.risk}`,
    `品牌相关度：${event.relevance}`,
    `传播机会分：${event.opportunity}`,
    "",
    "要求：",
    "1. planningType 必须是 主策划 / 场景策划 / 转译策划 之一",
    "2. campaignName 必须像一个可提交给甲方的策划标题，不能泛泛",
    "3. 必须结合具体产品/方案名和核心能力来做策划，不能只写品牌；如果给了 WPS365 / WPS AI，就必须明确写出它在方案中的角色",
    "4. targetAudience 用一句中文写清主要受众",
    "5. scenario 用一句中文写清这波热点对应的办公或使用场景",
    "6. coreInsight 必须写用户真实痛点，不要写空话",
    "7. strategyLine 必须写成一句传播命题，甲方拿去就能讨论",
    "8. productLink 用一句中文写清产品能力怎么接这个热点，必须具体到产品功能，不要空泛",
    "9. heroAsset 必须写清首发内容做什么",
    "10. conclusion 必须先明确这版策划怎么做，而不是先判断做不做",
    "11. channels 为 2-4 个中文平台名数组",
    "12. angles 为 3 个传播角度数组",
    "13. headlines 为 3 个标题数组",
    "14. draft 为 1 段 80-140 字中文草案",
    "15. executionSteps 为 3 条可执行动作数组，每条都要短而清楚",
    "16. contentPlan 为 3 条内容拆分数组，明确主内容、扩散内容、转化内容",
    "17. assetList 为 3-4 条需要准备的素材数组",
    "18. launchTimeline 为 3 条节奏数组，至少包含首发、补发、沉淀",
    "19. successMetrics 为 3 条可验证结果数组",
    "20. callToAction 用一句中文写清用户下一步动作",
    "21. fitScore, creativeScore, spreadScore, riskControlScore 都是 0-100 的整数",
    "22. planningComment 用一句话评价这版策划的完成度和打法",
    "23. riskNote 和 nextAction 用中文一句话",
    "24. 不能输出“无法策划”“不建议结合后结束”，必须产出策划方案",
    "25. 禁止输出类似“观察看看”“评论区追踪”“行业复盘”这种空泛占位词，必须给实质内容",
    "26. 不要把判断建立在关键词匹配上，要看品牌场景、传播目标和风险边界",
    "27. 不要输出 markdown，不要输出额外解释，只输出 JSON"
  ].join("\n");
}

function getSystemInstruction() {
  return "你是品牌传播策略分析助手。你必须始终先给出策划方案，哪怕是转译式策划。你只能输出有效 JSON，不能输出任何额外文本。";
}

export async function runGeminiAnalysis(
  event: EventItem,
  settings: AiSettings,
  brandProfile?: Partial<BrandProfile> | null
): Promise<EventAnalysis> {
  const content = await runAiTextPrompt({
    prompt: buildPrompt(event, brandProfile),
    systemInstruction: getSystemInstruction(),
    settings,
    temperature: 0.7
  });

  const parsed = parseModelJson<Partial<Omit<EventAnalysis, "mode">>>(content);

  if (
    !parsed.planningType?.trim() ||
    !parsed.campaignName?.trim() ||
    !parsed.coreInsight?.trim() ||
    !parsed.strategyLine?.trim() ||
    !parsed.productLink?.trim() ||
    !parsed.heroAsset?.trim() ||
    !parsed.draft?.trim()
  ) {
    throw new Error("analysis_incomplete");
  }

  const fallback = buildFallbackAnalysis(event, brandProfile);

  return {
    planningType: parsed.planningType,
    campaignName: parsed.campaignName,
    targetAudience: parsed.targetAudience?.trim() || fallback.targetAudience,
    scenario: parsed.scenario?.trim() || fallback.scenario,
    coreInsight: parsed.coreInsight,
    strategyLine: parsed.strategyLine,
    productLink: parsed.productLink,
    heroAsset: parsed.heroAsset,
    conclusion: parsed.conclusion?.trim() || fallback.conclusion,
    reasoning: parsed.reasoning?.trim() || fallback.reasoning,
    channels: parsed.channels?.length ? parsed.channels : fallback.channels,
    angles: parsed.angles?.length ? parsed.angles : fallback.angles,
    headlines: parsed.headlines?.length ? parsed.headlines : fallback.headlines,
    draft: parsed.draft,
    executionSteps: parsed.executionSteps?.length ? parsed.executionSteps : fallback.executionSteps,
    contentPlan: parsed.contentPlan?.length ? parsed.contentPlan : fallback.contentPlan,
    assetList: parsed.assetList?.length ? parsed.assetList : fallback.assetList,
    launchTimeline: parsed.launchTimeline?.length ? parsed.launchTimeline : fallback.launchTimeline,
    successMetrics: parsed.successMetrics?.length ? parsed.successMetrics : fallback.successMetrics,
    callToAction: parsed.callToAction?.trim() || fallback.callToAction,
    fitScore: typeof parsed.fitScore === "number" ? parsed.fitScore : fallback.fitScore,
    creativeScore: typeof parsed.creativeScore === "number" ? parsed.creativeScore : fallback.creativeScore,
    spreadScore: typeof parsed.spreadScore === "number" ? parsed.spreadScore : fallback.spreadScore,
    riskControlScore:
      typeof parsed.riskControlScore === "number" ? parsed.riskControlScore : fallback.riskControlScore,
    planningComment: parsed.planningComment?.trim() || fallback.planningComment,
    riskNote: parsed.riskNote?.trim() || fallback.riskNote,
    nextAction: parsed.nextAction?.trim() || fallback.nextAction,
    mode: "live"
  };
}

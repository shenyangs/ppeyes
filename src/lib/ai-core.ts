import { buildBrandView, normalizeBrandProfile, type BrandProfile } from "./brand.ts";
import type { EventItem } from "./homepage-data.ts";

export type TrueAiIntent = "event_strategy" | "xhs_script" | "risk_watch";

export function detectTrueAiIntent(prompt: string): TrueAiIntent | null {
  const normalized = prompt.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("小红书") || normalized.includes("脚本") || normalized.includes("口播")) {
    return "xhs_script";
  }

  if (normalized.includes("风险") || normalized.includes("预警") || normalized.includes("盯盘")) {
    return "risk_watch";
  }

  if (
    normalized.includes("策略") ||
    normalized.includes("借势") ||
    normalized.includes("怎么做") ||
    normalized.includes("选题")
  ) {
    return "event_strategy";
  }

  return null;
}

export function buildEventEvidencePacket(event: EventItem, brandProfile?: Partial<BrandProfile> | null) {
  const normalizedBrandProfile = normalizeBrandProfile(brandProfile);
  const brandView = normalizedBrandProfile ? buildBrandView(event, normalizedBrandProfile) : null;

  const brandBlock = normalizedBrandProfile
    ? [
        `品牌名：${normalizedBrandProfile.name || "未填写"}`,
        `产品/方案名：${normalizedBrandProfile.product || "未填写"}`,
        `品牌一句话：${normalizedBrandProfile.brief || "未填写"}`,
        `核心能力：${normalizedBrandProfile.capabilities || "未填写"}`,
        `传播目标：${normalizedBrandProfile.objective || "未填写"}`,
        `禁碰边界：${normalizedBrandProfile.guardrails || "未填写"}`
      ].join("\n")
    : "当前未启用品牌视角。";

  const brandVerdictBlock = brandView
    ? `品牌适配判断：${brandView.verdict} / ${brandView.score} / ${brandView.reason} / 推荐角度：${brandView.angle}`
    : "品牌适配判断：未启用";

  return [
    "热点证据包：",
    `标题：${event.title}`,
    `摘要：${event.summary}`,
    `平台：${event.sources.join(" / ")}`,
    `趋势：${event.trend}`,
    `行业：${event.industry}`,
    `情绪：${event.sentiment}`,
    `风险：${event.risk}`,
    `动作建议：${event.action}`,
    `品牌相关度：${event.relevance}`,
    `传播机会分：${event.opportunity}`,
    `现有判断：${event.reason}`,
    `现有角度：${event.angles.join(" / ")}`,
    `现有标题：${event.headlines.join(" / ")}`,
    `风险备注：${event.riskNote}`,
    `下一步建议：${event.nextStep}`,
    "",
    "品牌上下文：",
    brandBlock,
    brandVerdictBlock
  ].join("\n");
}

export function buildFocusedCommandPrompt({
  prompt,
  intent,
  event,
  brandProfile
}: {
  prompt: string;
  intent: TrueAiIntent;
  event: EventItem;
  brandProfile?: Partial<BrandProfile> | null;
}) {
  const evidence = buildEventEvidencePacket(event, brandProfile);

  const intentRequirement =
    intent === "xhs_script"
      ? [
          "你要直接产出接近可发的小红书内容草案。",
          "必须给出明确标题、开头钩子、正文结构和结尾动作。",
          "不能只讲方法。"
        ]
      : intent === "risk_watch"
        ? [
            "你要做内部风险判断。",
            "必须说清现在该盯什么、不该做什么、内部下一步是什么。",
            "语气要像内部同步，不是对外文案。"
          ]
        : [
            "你要做单条热点传播策略深拆。",
            "必须说清为什么值得做、从什么角度做、先做什么。",
            "不要泛泛讲品牌营销大道理。"
          ];

  return [
    "你是 PPeyes 的真 AI 核心代理，只处理单条热点。",
    `用户任务：${prompt}`,
    ...intentRequirement,
    "请只输出 JSON，字段必须严格为：kind, title, summary, sections, suggestions。",
    "kind 只能是 event_strategy, xhs_script, risk_watch 之一。",
    "sections 为 2-4 条数组，每条格式为 {\"title\":\"\",\"content\":\"\"}。",
    "suggestions 为 2-4 条中文短句数组，必须是下一轮有价值的追问。",
    "",
    evidence,
    "",
    "要求：",
    "1. 只能围绕这条热点回答，不能漂移到泛行业总结。",
    "2. 必须使用证据包里的风险、角度、品牌上下文。",
    "3. 输出必须具体，可直接被运营团队使用。",
    "4. 只输出 JSON。"
  ].join("\n");
}

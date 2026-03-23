import { emptyBrandProfile, normalizeBrandProfile, type BrandProfile } from "@/lib/brand";
import type { AiSettings } from "@/lib/analysis";
import { parseModelJson, runAiTextPrompt } from "@/lib/gemini";

function getSystemInstruction() {
  return "你是中国品牌传播策略顾问。你要把零散品牌信息补全成可用于热点策划的品牌视角 brief。你只能输出有效 JSON。";
}

function buildBrandFillPrompt(profile?: Partial<BrandProfile> | null) {
  const normalized = normalizeBrandProfile(profile);

  return [
    "请把下面这份不完整的品牌信息，补成一版适合热点策划系统使用的品牌视角 brief。",
    "要求务实、具体、适合中国品牌传播团队，不要空话。",
    "输出 JSON，字段必须严格为：name, product, brief, capabilities, objective, guardrails。",
    "",
    `品牌名：${normalized?.name || "未填写"}`,
    `产品/方案名：${normalized?.product || "未填写"}`,
    `品牌一句话：${normalized?.brief || "未填写"}`,
    `核心能力/卖点：${normalized?.capabilities || "未填写"}`,
    `当前传播目标：${normalized?.objective || "未填写"}`,
    `禁碰边界：${normalized?.guardrails || "未填写"}`,
    "",
    "要求：",
    "1. name 保留用户已填写内容；如果品牌名缺失但产品名明确，可从产品名推断品牌名",
    "2. product 保留用户已填写内容；如果缺失但品牌和场景明确，可补成最合理的产品/方案名",
    "3. brief 用一句中文写清卖什么、给谁、用在什么场景，避免假大空",
    "4. capabilities 写成 4-8 个中文短词，用顿号或逗号分隔，必须可落到产品能力",
    "5. objective 要写成传播目标，不要泛泛地写提升品牌影响力",
    "6. guardrails 要写成真实传播边界，不要写成万能废话",
    "7. 如果用户填写内容明显指向企业服务、办公软件、消费品或零售场景，要顺着该方向补全",
    "8. 尽量保留用户已填内容，只补全和优化，不要无端改写已有核心信息",
    "9. 不要输出 markdown，不要输出额外解释，只输出 JSON"
  ].join("\n");
}

function buildFallbackBrandProfile(profile?: Partial<BrandProfile> | null): BrandProfile {
  const normalized = normalizeBrandProfile(profile);
  const name = normalized?.name || "";
  const product = normalized?.product || (name ? `${name} 品牌方案` : "");
  const brief =
    normalized?.brief || (name || product ? `${name || product}，面向目标用户提供可落地的产品与传播解决方案` : "");
  const capabilities =
    normalized?.capabilities || "核心产品能力、场景化内容表达、社媒传播素材、线索承接设计";
  const objective =
    normalized?.objective || `借热点把 ${product || name || "当前品牌"} 的真实价值讲清楚，并沉淀转化素材`;
  const guardrails =
    normalized?.guardrails || "不碰公共安全与灾难事故，不做功效夸大，不下场站队高争议话题";

  return {
    name,
    product,
    brief,
    capabilities,
    objective,
    guardrails
  };
}

export async function runBrandProfileFill(
  profile: Partial<BrandProfile> | null,
  settings: AiSettings
): Promise<BrandProfile> {
  const content = await runAiTextPrompt({
    prompt: buildBrandFillPrompt(profile),
    systemInstruction: getSystemInstruction(),
    settings,
    temperature: 0.6
  });

  const parsed = parseModelJson<Partial<BrandProfile>>(content);
  const fallback = buildFallbackBrandProfile(profile);

  return {
    name: parsed.name?.trim() || fallback.name || emptyBrandProfile.name,
    product: parsed.product?.trim() || fallback.product || emptyBrandProfile.product,
    brief: parsed.brief?.trim() || fallback.brief || emptyBrandProfile.brief,
    capabilities: parsed.capabilities?.trim() || fallback.capabilities || emptyBrandProfile.capabilities,
    objective: parsed.objective?.trim() || fallback.objective || emptyBrandProfile.objective,
    guardrails: parsed.guardrails?.trim() || fallback.guardrails || emptyBrandProfile.guardrails
  };
}

export { buildFallbackBrandProfile };

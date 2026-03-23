import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEventEvidencePacket,
  buildFocusedCommandPrompt,
  detectTrueAiIntent
} from "../src/lib/ai-core.ts";
import {
  requireLiveAssetKind,
  requireLiveCommandKind,
  requireLiveSectionArray,
  requireLiveStringArray
} from "../src/lib/ai-live-contract.ts";
import type { EventItem } from "../src/lib/homepage-data.ts";

const sampleEvent: EventItem = {
  id: "event-1",
  title: "AI 办公模板热议升温",
  summary: "用户开始争论 AI 模板是否真的能提升团队效率。",
  sources: ["B 站", "知乎"],
  firstSeen: "11:10",
  trend: "上升",
  industry: "3C 数码",
  sentiment: "中性",
  risk: "低",
  relevance: 72,
  opportunity: 71,
  action: "可借势",
  reason: "具备高讨论性和方法论传播空间。",
  channels: ["B 站", "知乎", "公众号"],
  angles: ["效率工具清单", "团队协作案例拆解", "轻观点"],
  headlines: ["AI 模板热背后，团队真正缺什么"],
  draft: "最近关于 AI 提效模板的讨论很热。",
  riskNote: "避免绝对化提效承诺。",
  nextStep: "建议做案例型内容。",
  timeWindow: "近 1 小时",
  heatDelta: 90,
  watchlists: ["行业词"]
};

test("detectTrueAiIntent 只识别真 AI 核心命令", () => {
  assert.equal(detectTrueAiIntent("拆一下这条热点的传播策略"), "event_strategy");
  assert.equal(detectTrueAiIntent("把这条热点变成小红书脚本"), "xhs_script");
  assert.equal(detectTrueAiIntent("列一下今天最该盯的风险"), "risk_watch");
  assert.equal(detectTrueAiIntent("给我一份今日晨报"), null);
});

test("buildEventEvidencePacket 会包含热点和品牌证据", () => {
  const packet = buildEventEvidencePacket(sampleEvent, {
    name: "WPS",
    product: "WPS AI",
    brief: "面向企业协同办公",
    capabilities: "AI 写作、知识库问答、协同文档",
    objective: "借热点证明产品价值",
    guardrails: "不碰灾难事故"
  });

  assert.match(packet, /热点证据包/);
  assert.match(packet, /AI 办公模板热议升温/);
  assert.match(packet, /WPS AI/);
  assert.match(packet, /品牌适配判断/);
});

test("buildFocusedCommandPrompt 会强制围绕单条热点输出", () => {
  const prompt = buildFocusedCommandPrompt({
    prompt: "把这条热点变成小红书脚本",
    intent: "xhs_script",
    event: sampleEvent,
    brandProfile: {
      name: "WPS",
      product: "WPS AI",
      brief: "面向企业协同办公",
      capabilities: "AI 写作、知识库问答、协同文档",
      objective: "借热点证明产品价值",
      guardrails: "不碰灾难事故"
    }
  });

  assert.match(prompt, /真 AI 核心代理/);
  assert.match(prompt, /只能围绕这条热点回答/);
  assert.match(prompt, /必须给出明确标题、开头钩子、正文结构和结尾动作/);
  assert.match(prompt, /AI 办公模板热议升温/);
});

test("live contract 只接受真 AI 支持的命令类型", () => {
  assert.equal(requireLiveCommandKind("event_strategy"), "event_strategy");
  assert.equal(requireLiveAssetKind("publish_copy"), "publish_copy");
  assert.throws(() => requireLiveCommandKind("daily_brief"), /ai_contract_invalid_kind/);
  assert.throws(() => requireLiveAssetKind(""), /ai_contract_invalid_asset_kind/);
});

test("live contract 会拒绝空内容，避免系统偷偷拼兜底结果", () => {
  assert.deepEqual(
    requireLiveSectionArray(
      [
        { title: "判断", content: "这条热点值得做。" },
        { title: "动作", content: "先出一条解释型内容。" }
      ],
      "sections",
      2
    ),
    [
      { title: "判断", content: "这条热点值得做。" },
      { title: "动作", content: "先出一条解释型内容。" }
    ]
  );

  assert.deepEqual(
    requireLiveStringArray(["先盯评论区", "再补二条内容"], "suggestions", 2),
    ["先盯评论区", "再补二条内容"]
  );

  assert.throws(
    () => requireLiveSectionArray([{ title: "只有标题", content: "" }], "sections", 1),
    /ai_contract_invalid_sections/
  );
  assert.throws(() => requireLiveStringArray([], "suggestions", 1), /ai_contract_invalid_suggestions/);
});

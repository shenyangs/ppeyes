import type { BrandProfile } from "@/lib/brand";
import type {
  BriefingsPayload,
  OpportunitiesPayload,
  WatchlistsPayload,
  WorkspacePayload
} from "@/lib/page-data";
import type { StoredWatchlistTerm } from "@/lib/storage";
import {
  getEnvAiSettings,
  parseModelJson,
  runAiTextPrompt,
  type AiSettings
} from "@/lib/gemini";

export type NativeAiMode = "live" | "fallback";

export type NativeAiTask = {
  title: string;
  note: string;
  tag?: string;
};

export type NativeAiDigest = {
  mode: NativeAiMode;
  headline: string;
  summary: string;
  nextMove: string;
  rationale: string;
  priorities: NativeAiTask[];
  watchouts: string[];
  questions: string[];
};

export type WorkspaceNativeAiDigest = NativeAiDigest & {
  focusEventIds: string[];
};

export type WatchlistSuggestion = {
  keyword: string;
  type: StoredWatchlistTerm["type"];
  priority: StoredWatchlistTerm["priority"];
  reason: string;
};

export type WatchlistsNativeAiDigest = NativeAiDigest & {
  termSuggestions: WatchlistSuggestion[];
};

export type BriefingsNativeAiDigest = NativeAiDigest & {
  deliveryPlan: string[];
};

export type CopilotCommandKind =
  | "daily_brief"
  | "event_strategy"
  | "xhs_script"
  | "risk_watch"
  | "general";

export type CopilotCommandSection = {
  title: string;
  content: string;
};

export type CopilotCommandResult = {
  mode: NativeAiMode;
  kind: CopilotCommandKind;
  title: string;
  summary: string;
  sections: CopilotCommandSection[];
  suggestions: string[];
};

export type CommandAssetKind = "internal_sync" | "client_update" | "publish_copy";

export type CommandAssetResult = {
  mode: NativeAiMode;
  kind: CommandAssetKind;
  title: string;
  summary: string;
  content: string;
  bullets: string[];
};

function trimLine(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function trimStringArray(value: unknown, fallback: string[], maxItems = 4) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems);

  return items.length > 0 ? items : fallback;
}

function trimTaskArray(value: unknown, fallback: NativeAiTask[], maxItems = 4) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map<NativeAiTask | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<NativeAiTask>;
      const title = candidate.title?.trim();
      const note = candidate.note?.trim();

      if (!title || !note) {
        return null;
      }

      return {
        title,
        note,
        tag: candidate.tag?.trim() || undefined
      };
    })
    .filter((item): item is NativeAiTask => item !== null)
    .slice(0, maxItems);

  return items.length > 0 ? items : fallback;
}

function trimWatchlistSuggestions(value: unknown, fallback: WatchlistSuggestion[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map<WatchlistSuggestion | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<WatchlistSuggestion>;
      const keyword = candidate.keyword?.trim();
      const reason = candidate.reason?.trim();
      const type = candidate.type;
      const priority = candidate.priority;

      if (
        !keyword ||
        !reason ||
        (type !== "品牌词" && type !== "竞品词" && type !== "行业词" && type !== "风险词") ||
        (priority !== "高" && priority !== "中" && priority !== "低")
      ) {
        return null;
      }

      return {
        keyword,
        reason,
        type,
        priority
      };
    })
    .filter((item): item is WatchlistSuggestion => item !== null)
    .slice(0, 4);

  return items.length > 0 ? items : fallback;
}

function trimSectionArray(value: unknown, fallback: CopilotCommandSection[], maxItems = 4) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map<CopilotCommandSection | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Partial<CopilotCommandSection>;
      const title = candidate.title?.trim();
      const content = candidate.content?.trim();

      if (!title || !content) {
        return null;
      }

      return { title, content };
    })
    .filter((item): item is CopilotCommandSection => item !== null)
    .slice(0, maxItems);

  return items.length > 0 ? items : fallback;
}

function detectAssetKind(kind: string): CommandAssetKind | null {
  if (kind === "internal_sync" || kind === "client_update" || kind === "publish_copy") {
    return kind;
  }

  return null;
}

function getSettings() {
  return getEnvAiSettings();
}

function buildBrandContext(brandProfile: BrandProfile | null) {
  if (!brandProfile) {
    return "当前未启用品牌视角。";
  }

  return [
    `品牌名：${brandProfile.name || "未填写"}`,
    `产品/方案名：${brandProfile.product || "未填写"}`,
    `品牌一句话：${brandProfile.brief || "未填写"}`,
    `核心能力：${brandProfile.capabilities || "未填写"}`,
    `当前目标：${brandProfile.objective || "未填写"}`,
    `禁碰边界：${brandProfile.guardrails || "未填写"}`
  ].join("\n");
}

export function buildWorkspaceFallback(payload: WorkspacePayload): WorkspaceNativeAiDigest {
  const topEvents = payload.events.slice(0, 3);
  const riskEvents = payload.events.filter((event) => event.risk === "高").slice(0, 3);
  const brandName = payload.brandProfile?.name || payload.brandProfile?.product || "当前业务";
  const focusEvent = topEvents[0];

  return {
    mode: "fallback",
    headline: focusEvent
      ? `${brandName} 今天先盯住「${focusEvent.title}」`
      : "先补齐热点数据，再让 AI 帮你排优先级",
    summary: payload.brandProfile
      ? `系统先按 ${brandName} 的品牌视角做了一轮排序，当前更值得优先处理的是品牌贴合度和时效性同时更高的事件。`
      : "当前先按事件热度、风险和可借势程度做基础排序，补充品牌视角后判断会更像真正的运营同学。",
    nextMove: focusEvent
      ? `先看「${focusEvent.title}」，再决定是立刻出内容，还是作为内部观察。`
      : "先刷新工作台，确认今天的有效热点流。",
    rationale: payload.brandProfile
      ? "这版结论来自事件热度、品牌适配度、风险等级和传播机会分的综合排序。"
      : "这版结论来自事件热度、传播机会和风险等级的综合排序，暂时还没有品牌个性化判断。",
    priorities:
      topEvents.length > 0
        ? topEvents.map((event) => ({
            title: event.title,
            note: event.brandView
              ? `${event.brandView.verdict}，品牌适配度 ${event.brandView.score}，建议先从 ${event.brandView.angle}`
              : `${event.action}，传播机会分 ${event.opportunity}，建议先快速判断是否值得深拆。`,
            tag: event.brandView?.verdict || event.action
          }))
        : [
            {
              title: "等待数据",
              note: "还没有可用事件，先检查实时源是否正常。",
              tag: "空数据"
            }
          ],
    watchouts:
      riskEvents.length > 0
        ? riskEvents.map((event) => `高风险事件「${event.title}」只建议内部观察，避免直接下场。`)
        : ["当前高风险事件不多，但仍建议先看风险备注再安排对外动作。"],
    questions: payload.brandProfile
      ? [
          `今天最想服务的目标是声量、种草还是线索转化？`,
          `这波热点里，${brandName} 最能证明的真实产品能力是什么？`,
          "如果只能推进 1 条内容，团队最愿意先做哪条？"
        ]
      : [
          "先补充品牌名和产品能力，让系统从品牌视角重排一次。",
          "今天更在意品牌声量、竞品观察，还是风险预警？",
          "需要系统优先给你‘可直接发’还是‘先内部看’的结果？"
        ],
    focusEventIds: topEvents.map((event) => event.id)
  };
}

export function buildWatchlistsFallback(payload: WatchlistsPayload): WatchlistsNativeAiDigest {
  const missingTypes = ["品牌词", "竞品词", "行业词", "风险词"].filter(
    (type) => payload.terms.filter((term) => term.type === type).length === 0
  ) as StoredWatchlistTerm["type"][];

  const fallbackSuggestions: WatchlistSuggestion[] = missingTypes.slice(0, 3).map((type) => ({
    keyword:
      type === "品牌词"
        ? "品牌主词"
        : type === "竞品词"
          ? "头部竞品名"
          : type === "行业词"
            ? "核心使用场景"
            : "投诉",
    type,
    priority: type === "风险词" ? "高" : "中",
    reason: `当前 ${type} 为空，先补一条基础词，系统的判断会更完整。`
  }));

  return {
    mode: "fallback",
    headline: "先把监测词从“能搜到”升级成“能驱动判断”",
    summary: "现在这页更像配置页，还不像 AI 监测员。系统先给出结构性补词建议，帮你把词包变成真正可用的信号网。",
    nextMove: missingTypes.length > 0 ? `优先补齐 ${missingTypes.join("、")}。` : "先补关键场景词和风险词，再观察命中质量。",
    rationale: "监测词的价值不在数量，而在于能不能把品牌、竞品、场景和风险四类信号同时接住。",
    priorities: [
      {
        title: "先补结构缺口",
        note: missingTypes.length > 0 ? `当前缺少 ${missingTypes.join("、")}，这会让系统判断偏科。` : "四类词包已齐，但还可以继续优化粒度。",
        tag: "结构"
      },
      {
        title: "保留高优先级提醒",
        note: `当前高优先级词 ${payload.stats.highPriority} 个，建议只保留最影响判断的核心词。`,
        tag: "优先级"
      },
      {
        title: "命中结果要能反哺工作台",
        note: "优先补那些能明显改变事件判断和选题优先级的词，不要堆纯展示词。",
        tag: "质量"
      }
    ],
    watchouts: [
      "不要只加品牌名和竞品名，缺少场景词时，系统会看不到真实内容机会。",
      "风险词太少时，系统会更像热点雷达，而不是运营预警员。",
      "同义词和用户口语表达没覆盖时，命中率会明显失真。"
    ],
    questions: [
      "你最想监控的是品牌声量、竞品动作，还是风险舆情？",
      "团队内部有没有一些常用口语词，其实用户会频繁提到？",
      "哪些命中结果需要直接进晨报或飞书提醒？"
    ],
    termSuggestions:
      fallbackSuggestions.length > 0
        ? fallbackSuggestions
        : [
            {
              keyword: "使用场景词",
              type: "行业词",
              priority: "高",
              reason: "当前四类词包都有了，下一步优先补最能带来机会判断的场景词。"
            }
          ]
  };
}

export function buildOpportunitiesFallback(payload: OpportunitiesPayload): NativeAiDigest {
  const firstPick = payload.picks[0];

  return {
    mode: "fallback",
    headline: firstPick ? `今天优先推进「${firstPick.title}」` : "先把真正值得跟的机会放进池子里",
    summary: firstPick
      ? "机会池里已经有可推进内容，下一步不该继续收藏，而该开始做取舍和流转。"
      : "当前机会池偏空，说明工作台和机会池之间还没有形成稳定回流。",
    nextMove: firstPick ? `先确认「${firstPick.title}」的负责人和输出形式。` : "先从工作台加入 1 到 3 条今日最值得跟的事件。",
    rationale: "机会池应该服务执行，不应该只是保存列表。优先级、状态流转和今日决策是这页最重要的三件事。",
    priorities:
      payload.picks.length > 0
        ? payload.picks.slice(0, 3).map((pick) => ({
            title: pick.title,
            note: `${pick.timing} 内处理，建议形式：${pick.format}。${pick.note}`,
            tag: "今日优先"
          }))
        : [
            {
              title: "空池预警",
              note: "还没有可执行机会，建议先从工作台补入今日事件。",
              tag: "待补"
            }
          ],
    watchouts: [
      "没有负责人和截止时间的机会，通常会一直停留在“已收藏”。",
      "高风险事件即使入池，也只适合进入内部观察，不适合直接变对外选题。",
      "竞品类机会更适合作为策略输入，别直接当外发内容去做。"
    ],
    questions: [
      "今天团队最多能推进几条内容？",
      "哪些机会需要先内部过稿或审批？",
      "要不要把‘已选题’和‘推进中’拆得更细，避免状态失真？"
    ]
  };
}

export function buildBriefingsFallback(payload: BriefingsPayload): BriefingsNativeAiDigest {
  const firstTemplate = payload.templates[0];

  return {
    mode: "fallback",
    headline: firstTemplate ? `今天最适合先生成一份「${firstTemplate.title}」` : "先确定今天需要哪种简报",
    summary: "简报页应该是 AI 帮团队自动组织判断，而不是只有几个静态模板。当前先给出生成方向和分发建议。",
    nextMove: firstTemplate ? `先生成「${firstTemplate.title}」，把今天最值得同步的判断聚合起来。` : "先补一份基础模板。",
    rationale: "简报真正有价值的部分，不是模板名字，而是 AI 是否能把事件优先级、原因、风险和建议动作浓缩好。",
    priorities: payload.recent.slice(0, 3).map((item) => ({
      title: item.title,
      note: `${item.type}。${item.note}`,
      tag: item.type
    })),
    watchouts: [
      "如果简报只堆事件，不解释为什么重要，团队不会真正用它。",
      "晨报和晚报的重点不同，不能用同一套结构直接复用。",
      "专题简报更需要观点和判断，不是简单拉清单。"
    ],
    questions: [
      "今天更适合晨报、晚报，还是专题简报？",
      "这份简报主要给内部团队看，还是给客户看？",
      "你最希望简报帮你省掉哪一步手工整理？"
    ],
    deliveryPlan: payload.delivery.slice(0, 3)
  };
}

function detectCommandKind(prompt: string): CopilotCommandKind {
  const normalized = prompt.toLowerCase();

  if (
    prompt.includes("晨报") ||
    prompt.includes("晚报") ||
    prompt.includes("简报") ||
    prompt.includes("日报")
  ) {
    return "daily_brief";
  }

  if (normalized.includes("小红书") || normalized.includes("脚本") || normalized.includes("口播")) {
    return "xhs_script";
  }

  if (normalized.includes("风险") || normalized.includes("预警") || normalized.includes("盯盘")) {
    return "risk_watch";
  }

  if (
    normalized.includes("策略") ||
    normalized.includes("怎么做") ||
    normalized.includes("选题") ||
    normalized.includes("借势")
  ) {
    return "event_strategy";
  }

  return "general";
}

export function buildCopilotCommandFallback({
  prompt,
  workspace,
  selectedEvent,
  brandProfile
}: {
  prompt: string;
  workspace: WorkspacePayload;
  selectedEvent: WorkspacePayload["events"][number] | null;
  brandProfile: BrandProfile | null;
}): CopilotCommandResult {
  const kind = detectCommandKind(prompt);
  const topEvents = workspace.events.slice(0, 3);
  const focusEvent = selectedEvent || topEvents[0] || null;
  const brandName = brandProfile?.product || brandProfile?.name || "当前业务";

  if (kind === "daily_brief") {
    return {
      mode: "fallback",
      kind,
      title: "今日 AI 晨报",
      summary: `系统先帮你压缩成一版晨会可直接同步的判断，重点围绕今天最值得看的事件、风险和动作。`,
      sections: [
        {
          title: "今日最值得先看",
          content:
            topEvents.length > 0
              ? topEvents
                  .map((event, index) => `${index + 1}. ${event.title}：${event.brandView?.reason || event.reason}`)
                  .join("\n")
              : "当前没有可用事件，建议先刷新工作台。"
        },
        {
          title: "今天建议先做什么",
          content: focusEvent
            ? `先围绕「${focusEvent.title}」决定要不要立刻动作。如果要做，优先把它落到 ${brandName} 的真实产品能力。`
            : "先补齐今日事件，再决定是否进入内容执行。"
        },
        {
          title: "风险提醒",
          content:
            workspace.events.filter((event) => event.risk === "高").slice(0, 2).map((event) => `- ${event.title}`).join("\n") ||
            "当前没有特别突出的高风险事件，但仍建议先看风险备注。"
        }
      ],
      suggestions: ["继续追问：把晨报改成老板 30 秒版本", "继续追问：只保留今天能发的内容", "继续追问：给我客户可看的版本"]
    };
  }

  if (kind === "xhs_script") {
    return {
      mode: "fallback",
      kind,
      title: focusEvent ? "小红书脚本草案" : "小红书脚本待补上下文",
      summary: focusEvent
        ? `系统先按当前热点生成一版能直接改的脚本草案。`
        : "要生成脚本，最好先选中一条热点。",
      sections: focusEvent
        ? [
            {
              title: "脚本结构",
              content: `标题钩子：这波「${focusEvent.title}」热议里，真正值得说的不是热度，而是大家都在卡住的那个场景。\n\n正文：把热点情绪翻成一个真实办公/使用问题，再把 ${brandName} 的具体能力接进去，不要空讲品牌态度。\n\n结尾：给一个明确动作，比如收藏、评论、试用、领取模板。`
            },
            {
              title: "发布提醒",
              content: `避免直接复述热点新闻本体，重点写“用户正在经历什么”以及 ${brandName} 怎么解决。`
            }
          ]
        : [
            {
              title: "缺少热点上下文",
              content: "先从左侧事件流选一条热点，再让 AI 出脚本会更准。"
            }
          ],
      suggestions: ["继续追问：改成更像爆文口吻", "继续追问：缩成 120 字版本", "继续追问：再给我 3 个标题"]
    };
  }

  if (kind === "risk_watch") {
    const riskEvents = workspace.events.filter((event) => event.risk === "高" || event.action === "需谨慎").slice(0, 3);

    return {
      mode: "fallback",
      kind,
      title: "风险盯盘摘要",
      summary: "系统先按高风险和需谨慎事件做了一版盯盘摘要，用来支持内部同步。",
      sections: [
        {
          title: "重点风险事件",
          content:
            riskEvents.length > 0
              ? riskEvents.map((event) => `${event.title}：${event.riskNote}`).join("\n")
              : "当前没有特别明显的高风险事件。"
        },
        {
          title: "现在不该做什么",
          content: "不要直接下场玩梗，不要在事实未清前做品牌回应，不要把高风险事件强行转成外部内容。"
        },
        {
          title: "内部动作",
          content: "先统一口径，再决定是否需要客服、PR 或业务负责人同步。"
        }
      ],
      suggestions: ["继续追问：给我晨会汇报版", "继续追问：只保留高风险事件", "继续追问：转成内部提醒口吻"]
    };
  }

  if (kind === "event_strategy") {
    return {
      mode: "fallback",
      kind,
      title: focusEvent ? "热点传播策略拆解" : "策略拆解待补上下文",
      summary: focusEvent ? "系统先围绕当前热点给出一版传播打法。" : "最好先选中热点，策略才会更具体。",
      sections: focusEvent
        ? [
            {
              title: "先判断值不值得做",
              content: focusEvent.brandView
                ? `${focusEvent.brandView.verdict}，品牌适配度 ${focusEvent.brandView.score}。${focusEvent.brandView.reason}`
                : `${focusEvent.action}。先判断它是真机会，还是只是一波热度。`
            },
            {
              title: "内容打法",
              content: `不要只复述「${focusEvent.title}」，而要把热点转成用户真实场景，再由 ${brandName} 去承接。`
            },
            {
              title: "执行节奏",
              content: "先出一条主内容抢时效，再补解释内容，最后沉淀成模板、案例或转化素材。"
            }
          ]
        : [
            {
              title: "缺少热点上下文",
              content: "先从事件流选一条热点，再拆策略会更有用。"
            }
          ],
      suggestions: ["继续追问：给我老板汇报版", "继续追问：再具体到发布时间", "继续追问：帮我拆成 3 条内容"]
    };
  }

  return {
    mode: "fallback",
    kind,
    title: "AI 指挥台回应",
    summary: "系统先按当前工作台和品牌视角给出一版通用回应。",
    sections: [
      {
        title: "你现在最该盯什么",
        content: focusEvent
          ? `先处理「${focusEvent.title}」，因为它当前最能影响今天的内容决策。`
          : "先确认今天的事件流是否完整。"
      },
      {
        title: "为什么",
        content: focusEvent?.brandView?.reason || focusEvent?.reason || "当前需要先补上下文，AI 才能给更具体的动作。"
      }
    ],
    suggestions: ["试试：给我今日晨报", "试试：把这条热点变成小红书脚本", "试试：拆一下这条热点的传播策略"]
  };
}

export function buildCommandAssetFallback({
  assetKind,
  command,
  selectedEvent,
  brandProfile
}: {
  assetKind: CommandAssetKind;
  command: CopilotCommandResult;
  selectedEvent: WorkspacePayload["events"][number] | null;
  brandProfile: BrandProfile | null;
}): CommandAssetResult {
  const brandName = brandProfile?.product || brandProfile?.name || "当前业务";
  const eventTitle = selectedEvent?.title || command.title;
  const plainSections = command.sections.map((section) => `${section.title}：${section.content}`).join("\n");

  if (assetKind === "internal_sync") {
    return {
      mode: "fallback",
      kind: assetKind,
      title: `${command.title}｜内部同步版`,
      summary: "给团队内部同步时，重点是判断、动作和风险，不需要太多包装。",
      content: [
        `今天建议优先关注：${eventTitle}`,
        `核心判断：${command.summary}`,
        plainSections,
        "请团队先确认是否今天推进、谁负责、是否需要审批。"
      ].join("\n\n"),
      bullets: ["适合晨会或群同步", "优先说动作和风险", "最后补负责人和截止时间"]
    };
  }

  if (assetKind === "client_update") {
    return {
      mode: "fallback",
      kind: assetKind,
      title: `${command.title}｜客户汇报版`,
      summary: "给客户时，重点要从‘我们建议什么’出发，少写内部口语，多写判断依据。",
      content: [
        `围绕「${eventTitle}」，我们建议优先采取以下动作：`,
        command.summary,
        plainSections,
        `建议以 ${brandName} 的真实产品能力或品牌场景进行承接，避免只复述热点本身。`
      ].join("\n\n"),
      bullets: ["弱化内部流程描述", "强化建议与依据", "语言更稳、更像对外汇报"]
    };
  }

  return {
    mode: "fallback",
    kind: assetKind,
    title: `${command.title}｜最终发布稿`,
    summary: "最终发布稿要更像成稿，不再像分析卡片。",
    content: [
      `标题建议：${command.title}`,
      `正文开头：围绕「${eventTitle}」切入用户真实场景，而不是直接复述热点。`,
      plainSections,
      `结尾动作：把讨论自然收束到 ${brandName} 能提供的具体价值或下一步动作。`
    ].join("\n\n"),
    bullets: ["更接近可发文案", "减少分析腔", "保留可直接改写的内容骨架"]
  };
}

function buildSystemInstruction(surface: string) {
  return `你是 PPeyes 的原生 AI 运营总控，负责把 ${surface} 页面变成真正会判断、会排序、会推进的工作台。你只能输出有效 JSON。`;
}

function buildWorkspacePrompt(payload: WorkspacePayload) {
  const events = payload.events.slice(0, 10).map((event) =>
    [
      `id:${event.id}`,
      `标题:${event.title}`,
      `摘要:${event.summary}`,
      `平台:${event.sources.join("/")}`,
      `风险:${event.risk}`,
      `动作:${event.action}`,
      `机会分:${event.opportunity}`,
      event.brandView ? `品牌判断:${event.brandView.verdict}/${event.brandView.score}/${event.brandView.angle}` : "品牌判断:未启用"
    ].join(" | ")
  );

  return [
    "你在给社媒运营负责人做首页 AI 作战判断。",
    "你的任务不是总结页面，而是明确告诉团队：现在最该看什么、先做什么、哪里有风险、还差什么信息。",
    "请只输出 JSON，字段必须严格为：headline, summary, nextMove, rationale, priorities, watchouts, questions, focusEventIds。",
    "其中 priorities 为 3-4 条数组，每条格式为 {\"title\":\"\",\"note\":\"\",\"tag\":\"\"}。",
    "watchouts 为 2-4 条中文短句数组。",
    "questions 为 2-4 条中文短句数组，必须像 AI 主动追问团队的关键问题。",
    "focusEventIds 为 1-3 个最值得优先处理的事件 id 数组。",
    "",
    buildBrandContext(payload.brandProfile),
    "",
    `数据源：${payload.source}`,
    `当前事件数：${payload.events.length}`,
    `当前时间窗口：近 ${payload.freshnessWindowHours} 小时`,
    "",
    "候选事件：",
    events.join("\n"),
    "",
    "要求：",
    "1. 语气像真正的运营总控，不要写空话。",
    "2. headline 和 nextMove 必须能直接指导动作。",
    "3. summary 必须解释“为什么现在这样判断”。",
    "4. priorities 必须具体到事件、动作或判断，不要写宏观废话。",
    "5. 如果有品牌视角，必须把品牌和产品能力纳入判断。",
    "6. 只输出 JSON。"
  ].join("\n");
}

function buildWatchlistsPrompt(payload: WatchlistsPayload) {
  const terms = payload.terms
    .slice(0, 20)
    .map((term) => `${term.type} | ${term.keyword} | 优先级:${term.priority} | 提醒:${term.alerts ? "开" : "关"}`)
    .join("\n");

  return [
    "你在给社媒运营团队做监测词 AI 体检。",
    "请只输出 JSON，字段必须严格为：headline, summary, nextMove, rationale, priorities, watchouts, questions, termSuggestions。",
    "其中 priorities 为 3-4 条数组，每条格式为 {\"title\":\"\",\"note\":\"\",\"tag\":\"\"}。",
    "termSuggestions 为 2-4 条数组，每条格式为 {\"keyword\":\"\",\"type\":\"品牌词|竞品词|行业词|风险词\",\"priority\":\"高|中|低\",\"reason\":\"\"}。",
    "",
    `总词数：${payload.stats.totalTerms}`,
    `今日命中：${payload.stats.hitsToday}`,
    `高优先级词：${payload.stats.highPriority}`,
    "",
    "现有监测词：",
    terms || "暂无",
    "",
    "今日命中参考：",
    payload.hits.map((item) => `${item.type} | ${item.keyword} | ${item.note}`).join("\n"),
    "",
    "要求：",
    "1. 不要泛泛夸监测词重要，要指出结构缺口。",
    "2. termSuggestions 必须是现在就值得加的词，且理由具体。",
    "3. 优先帮助团队把词包从“配置页”升级为“判断输入源”。",
    "4. 只输出 JSON。"
  ].join("\n");
}

function buildOpportunitiesPrompt(payload: OpportunitiesPayload) {
  return [
    "你在给运营负责人做机会池 AI 排兵布阵。",
    "请只输出 JSON，字段必须严格为：headline, summary, nextMove, rationale, priorities, watchouts, questions。",
    "其中 priorities 为 3-4 条数组，每条格式为 {\"title\":\"\",\"note\":\"\",\"tag\":\"\"}。",
    "",
    `本周入池：${payload.stats.weeklyAdded}`,
    `今日待定：${payload.stats.pendingToday}`,
    `已执行：${payload.stats.executed}`,
    "",
    "今日优先条目：",
    payload.picks.map((item) => `${item.title} | ${item.timing} | ${item.format} | ${item.note}`).join("\n") || "暂无",
    "",
    "已保存机会：",
    payload.saved.map((item) => `${item.status} | ${item.title} | ${item.timing} | ${item.note}`).join("\n") || "暂无",
    "",
    "要求：",
    "1. 不要重复页面文案，要像总控一样指出现在该推进什么。",
    "2. priorities 必须体现取舍，而不是只罗列。",
    "3. watchouts 要指出执行层会卡住的地方。",
    "4. 只输出 JSON。"
  ].join("\n");
}

function buildBriefingsPrompt(payload: BriefingsPayload) {
  return [
    "你在给简报页面做 AI 生成策略。",
    "请只输出 JSON，字段必须严格为：headline, summary, nextMove, rationale, priorities, watchouts, questions, deliveryPlan。",
    "其中 priorities 为 3-4 条数组，每条格式为 {\"title\":\"\",\"note\":\"\",\"tag\":\"\"}。",
    "deliveryPlan 为 2-4 条中文短句数组。",
    "",
    "可用模板：",
    payload.templates.map((item) => `${item.title} | ${item.description}`).join("\n"),
    "",
    "最近简报：",
    payload.recent.map((item) => `${item.title} | ${item.type} | ${item.note}`).join("\n"),
    "",
    "推荐结构：",
    payload.structure.join("\n"),
    "",
    "分发建议：",
    payload.delivery.join("\n"),
    "",
    "要求：",
    "1. 站在运营负责人视角，判断今天最适合生成哪类简报。",
    "2. priorities 要体现简报内容组织方式，不只是模板推荐。",
    "3. deliveryPlan 要更像执行建议，而不是概念口号。",
    "4. 只输出 JSON。"
  ].join("\n");
}

async function runSurfacePrompt<T>({
  prompt,
  systemInstruction,
  settings
}: {
  prompt: string;
  systemInstruction: string;
  settings: AiSettings;
}) {
  const content = await runAiTextPrompt({
    prompt,
    systemInstruction,
    settings,
    temperature: 0.4,
    timeoutMs: 12000,
    maxAttempts: 2
  });

  return parseModelJson<T>(content);
}

function buildCommandPrompt({
  prompt,
  workspace,
  selectedEvent,
  brandProfile
}: {
  prompt: string;
  workspace: WorkspacePayload;
  selectedEvent: WorkspacePayload["events"][number] | null;
  brandProfile: BrandProfile | null;
}) {
  const topEvents = workspace.events.slice(0, 8).map((event) =>
    [
      `id:${event.id}`,
      `标题:${event.title}`,
      `摘要:${event.summary}`,
      `风险:${event.risk}`,
      `动作:${event.action}`,
      event.brandView ? `品牌判断:${event.brandView.verdict}/${event.brandView.score}/${event.brandView.reason}` : "品牌判断:未启用"
    ].join(" | ")
  );

  return [
    "你是 PPeyes 首页的对话式 AI 指挥台。",
    "用户会直接给你一句命令，你要立刻产出运营团队能使用的结果，而不是空泛解释。",
    "请只输出 JSON，字段必须严格为：kind, title, summary, sections, suggestions。",
    "kind 只能是 daily_brief, event_strategy, xhs_script, risk_watch, general 之一。",
    "sections 为 2-4 条数组，每条格式为 {\"title\":\"\",\"content\":\"\"}。",
    "suggestions 为 2-4 条中文短句数组，用来引导下一轮追问。",
    "",
    `用户命令：${prompt}`,
    "",
    buildBrandContext(brandProfile),
    "",
    selectedEvent
      ? [
          "当前选中热点：",
          `标题：${selectedEvent.title}`,
          `摘要：${selectedEvent.summary}`,
          `风险：${selectedEvent.risk}`,
          `动作：${selectedEvent.action}`,
          selectedEvent.brandView
            ? `品牌判断：${selectedEvent.brandView.verdict} / ${selectedEvent.brandView.score} / ${selectedEvent.brandView.reason}`
            : "品牌判断：未启用"
        ].join("\n")
      : "当前未选中热点。",
    "",
    "工作台前排事件：",
    topEvents.join("\n"),
    "",
    "要求：",
    "1. 如果用户要晨报，就写成晨会能直接同步的版本。",
    "2. 如果用户要脚本，就给出接近成稿的内容，不要只讲方法。",
    "3. 如果用户要策略，就给出清楚的取舍和动作。",
    "4. 如果用户问风险，就以内部判断口吻回答。",
    "5. 必须简洁、具体、像运营总控在说话。",
    "6. 只输出 JSON。"
  ].join("\n");
}

function buildAssetPrompt({
  assetKind,
  command,
  selectedEvent,
  brandProfile
}: {
  assetKind: CommandAssetKind;
  command: CopilotCommandResult;
  selectedEvent: WorkspacePayload["events"][number] | null;
  brandProfile: BrandProfile | null;
}) {
  return [
    "你要把已有 AI 结果继续转成可直接使用的交付版本。",
    "请只输出 JSON，字段必须严格为：kind, title, summary, content, bullets。",
    "kind 只能是 internal_sync, client_update, publish_copy 之一。",
    "content 必须是完整连续文本，不要输出数组。",
    "bullets 为 2-4 条中文短句数组。",
    "",
    `目标版本：${assetKind}`,
    "",
    buildBrandContext(brandProfile),
    "",
    selectedEvent
      ? `关联热点：${selectedEvent.title}\n热点摘要：${selectedEvent.summary}\n风险：${selectedEvent.risk}\n动作：${selectedEvent.action}`
      : "当前没有绑定热点。",
    "",
    `原始结果标题：${command.title}`,
    `原始结果摘要：${command.summary}`,
    "原始结果内容：",
    command.sections.map((section) => `${section.title}\n${section.content}`).join("\n\n"),
    "",
    "要求：",
    "1. internal_sync 更像内部群同步或晨会口径。",
    "2. client_update 更像发给客户的汇报摘要，语气更稳。", 
    "3. publish_copy 更像最终文案成稿，减少分析语言。",
    "4. 结果要短、能用、能直接复制。",
    "5. 只输出 JSON。"
  ].join("\n");
}

export async function buildWorkspaceNativeAiDigest(payload: WorkspacePayload): Promise<WorkspaceNativeAiDigest> {
  const fallback = buildWorkspaceFallback(payload);
  const settings = getSettings();

  if (!settings) {
    return fallback;
  }

  const parsed = await runSurfacePrompt<Partial<WorkspaceNativeAiDigest>>({
    prompt: buildWorkspacePrompt(payload),
    systemInstruction: buildSystemInstruction("工作台"),
    settings
  });

  return {
    mode: "live",
    headline: trimLine(parsed.headline, fallback.headline),
    summary: trimLine(parsed.summary, fallback.summary),
    nextMove: trimLine(parsed.nextMove, fallback.nextMove),
    rationale: trimLine(parsed.rationale, fallback.rationale),
    priorities: trimTaskArray(parsed.priorities, fallback.priorities),
    watchouts: trimStringArray(parsed.watchouts, fallback.watchouts),
    questions: trimStringArray(parsed.questions, fallback.questions),
    focusEventIds: trimStringArray(parsed.focusEventIds, fallback.focusEventIds, 3)
  };
}

export async function buildWatchlistsNativeAiDigest(payload: WatchlistsPayload): Promise<WatchlistsNativeAiDigest> {
  const fallback = buildWatchlistsFallback(payload);
  const settings = getSettings();

  if (!settings) {
    return fallback;
  }

  const parsed = await runSurfacePrompt<Partial<WatchlistsNativeAiDigest>>({
    prompt: buildWatchlistsPrompt(payload),
    systemInstruction: buildSystemInstruction("监测词页"),
    settings
  });

  return {
    mode: "live",
    headline: trimLine(parsed.headline, fallback.headline),
    summary: trimLine(parsed.summary, fallback.summary),
    nextMove: trimLine(parsed.nextMove, fallback.nextMove),
    rationale: trimLine(parsed.rationale, fallback.rationale),
    priorities: trimTaskArray(parsed.priorities, fallback.priorities),
    watchouts: trimStringArray(parsed.watchouts, fallback.watchouts),
    questions: trimStringArray(parsed.questions, fallback.questions),
    termSuggestions: trimWatchlistSuggestions(parsed.termSuggestions, fallback.termSuggestions)
  };
}

export async function buildOpportunitiesNativeAiDigest(payload: OpportunitiesPayload): Promise<NativeAiDigest> {
  const fallback = buildOpportunitiesFallback(payload);
  const settings = getSettings();

  if (!settings) {
    return fallback;
  }

  const parsed = await runSurfacePrompt<Partial<NativeAiDigest>>({
    prompt: buildOpportunitiesPrompt(payload),
    systemInstruction: buildSystemInstruction("机会池"),
    settings
  });

  return {
    mode: "live",
    headline: trimLine(parsed.headline, fallback.headline),
    summary: trimLine(parsed.summary, fallback.summary),
    nextMove: trimLine(parsed.nextMove, fallback.nextMove),
    rationale: trimLine(parsed.rationale, fallback.rationale),
    priorities: trimTaskArray(parsed.priorities, fallback.priorities),
    watchouts: trimStringArray(parsed.watchouts, fallback.watchouts),
    questions: trimStringArray(parsed.questions, fallback.questions)
  };
}

export async function buildBriefingsNativeAiDigest(payload: BriefingsPayload): Promise<BriefingsNativeAiDigest> {
  const fallback = buildBriefingsFallback(payload);
  const settings = getSettings();

  if (!settings) {
    return fallback;
  }

  const parsed = await runSurfacePrompt<Partial<BriefingsNativeAiDigest>>({
    prompt: buildBriefingsPrompt(payload),
    systemInstruction: buildSystemInstruction("简报页"),
    settings
  });

  return {
    mode: "live",
    headline: trimLine(parsed.headline, fallback.headline),
    summary: trimLine(parsed.summary, fallback.summary),
    nextMove: trimLine(parsed.nextMove, fallback.nextMove),
    rationale: trimLine(parsed.rationale, fallback.rationale),
    priorities: trimTaskArray(parsed.priorities, fallback.priorities),
    watchouts: trimStringArray(parsed.watchouts, fallback.watchouts),
    questions: trimStringArray(parsed.questions, fallback.questions),
    deliveryPlan: trimStringArray(parsed.deliveryPlan, fallback.deliveryPlan)
  };
}

export async function buildCopilotCommandResult({
  prompt,
  workspace,
  selectedEvent,
  brandProfile
}: {
  prompt: string;
  workspace: WorkspacePayload;
  selectedEvent: WorkspacePayload["events"][number] | null;
  brandProfile: BrandProfile | null;
}): Promise<CopilotCommandResult> {
  const fallback = buildCopilotCommandFallback({
    prompt,
    workspace,
    selectedEvent,
    brandProfile
  });
  const settings = getSettings();

  if (!settings) {
    return fallback;
  }

  const parsed = await runSurfacePrompt<Partial<CopilotCommandResult>>({
    prompt: buildCommandPrompt({
      prompt,
      workspace,
      selectedEvent,
      brandProfile
    }),
    systemInstruction: buildSystemInstruction("首页 AI 指挥台"),
    settings
  });

  return {
    mode: "live",
    kind:
      parsed.kind === "daily_brief" ||
      parsed.kind === "event_strategy" ||
      parsed.kind === "xhs_script" ||
      parsed.kind === "risk_watch" ||
      parsed.kind === "general"
        ? parsed.kind
        : fallback.kind,
    title: trimLine(parsed.title, fallback.title),
    summary: trimLine(parsed.summary, fallback.summary),
    sections: trimSectionArray(parsed.sections, fallback.sections),
    suggestions: trimStringArray(parsed.suggestions, fallback.suggestions)
  };
}

export async function buildCommandAssetResult({
  assetKind,
  command,
  selectedEvent,
  brandProfile
}: {
  assetKind: CommandAssetKind;
  command: CopilotCommandResult;
  selectedEvent: WorkspacePayload["events"][number] | null;
  brandProfile: BrandProfile | null;
}): Promise<CommandAssetResult> {
  const fallback = buildCommandAssetFallback({
    assetKind,
    command,
    selectedEvent,
    brandProfile
  });
  const settings = getSettings();

  if (!settings) {
    return fallback;
  }

  const parsed = await runSurfacePrompt<Partial<CommandAssetResult>>({
    prompt: buildAssetPrompt({
      assetKind,
      command,
      selectedEvent,
      brandProfile
    }),
    systemInstruction: buildSystemInstruction("AI 结果资产化"),
    settings
  });

  return {
    mode: "live",
    kind: detectAssetKind(parsed.kind || "") || fallback.kind,
    title: trimLine(parsed.title, fallback.title),
    summary: trimLine(parsed.summary, fallback.summary),
    content: trimLine(parsed.content, fallback.content),
    bullets: trimStringArray(parsed.bullets, fallback.bullets)
  };
}

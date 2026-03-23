"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { BrandProfile } from "@/lib/brand";
import type { CommandAssetKind, CommandAssetResult, CopilotCommandResult } from "@/lib/native-ai";
import type { WorkspaceEvent, WorkspacePayload } from "@/lib/page-data";

type CommandHistoryItem = {
  id: string;
  prompt: string;
  result: CopilotCommandResult;
  assets?: Partial<Record<CommandAssetKind, CommandAssetResult>>;
};

type AiCommandCenterProps = {
  workspace: WorkspacePayload | null;
  brandProfile: BrandProfile | null;
  selectedEvent: WorkspaceEvent | null;
  queuedPrompt?: string | null;
  onQueuedPromptHandled?: () => void;
};

const quickPrompts = [
  "拆一下这条热点的传播策略",
  "把这条热点变成小红书脚本",
  "列一下今天最该盯的风险"
];

function needsSelectedEvent(prompt: string) {
  return Boolean(prompt.trim());
}

export function AiCommandCenter({
  workspace,
  brandProfile,
  selectedEvent,
  queuedPrompt,
  onQueuedPromptHandled
}: AiCommandCenterProps) {
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  function toPlainText(result: CopilotCommandResult) {
    return [
      result.title,
      result.summary,
      ...result.sections.map((section) => `${section.title}\n${section.content}`),
      "下一步建议",
      ...result.suggestions
    ].join("\n\n");
  }

  function toAssetPlainText(result: CommandAssetResult) {
    return [result.title, result.summary, result.content, "使用提醒", ...result.bullets].join("\n\n");
  }

  function getBriefingType(result: CopilotCommandResult) {
    if (result.kind === "daily_brief") return "晨报";
    if (result.kind === "risk_watch") return "风险简报";
    if (result.kind === "xhs_script") return "内容脚本";
    if (result.kind === "event_strategy") return "策略简报";
    return "AI 简报";
  }

  async function handleCopy(result: CopilotCommandResult) {
    try {
      await navigator.clipboard.writeText(toPlainText(result));
      setActionMessage("已复制到剪贴板");
    } catch {
      setError("复制失败，可能是当前环境不允许访问剪贴板。");
    }
  }

  async function handleCopyAsset(result: CommandAssetResult) {
    try {
      await navigator.clipboard.writeText(toAssetPlainText(result));
      setActionMessage("已复制变体结果到剪贴板");
    } catch {
      setError("复制失败，可能是当前环境不允许访问剪贴板。");
    }
  }

  function updateHistoryItem(id: string, updater: (item: CommandHistoryItem) => CommandHistoryItem) {
    setHistory((current) => current.map((item) => (item.id === id ? updater(item) : item)));
  }

  async function handleSaveBriefing(item: CommandHistoryItem) {
    try {
      setIsSaving(`${item.id}-briefing`);
      setError(null);
      setActionMessage(null);

      const response = await fetch("/api/briefings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: item.result.title,
          type: getBriefingType(item.result),
          note: item.result.summary,
          content: toPlainText(item.result)
        })
      });

      if (!response.ok) {
        throw new Error("转简报失败");
      }

      setActionMessage("已转成简报，可以去简报页查看");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "转简报失败");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleSaveOpportunity(item: CommandHistoryItem) {
    if (!selectedEvent) {
      setError("要加入机会池，先在左侧选中一条热点。");
      return;
    }

    try {
      setIsSaving(`${item.id}-opportunity`);
      setError(null);
      setActionMessage(null);

      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          title: item.result.title,
          timing:
            selectedEvent.action === "可借势"
              ? "今天内"
              : selectedEvent.action === "可观察"
                ? "24 小时内"
                : "内部观察",
          format: item.result.kind === "xhs_script" ? "小红书图文 / 短视频" : "策略拆解 / 内部选题",
          note: item.result.summary
        })
      });

      if (!response.ok) {
        throw new Error("加入机会池失败");
      }

      setActionMessage("已加入机会池");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加入机会池失败");
    } finally {
      setIsSaving(null);
    }
  }

  async function handleGenerateAsset(item: CommandHistoryItem, assetKind: CommandAssetKind) {
    try {
      setIsSaving(`${item.id}-${assetKind}`);
      setError(null);
      setActionMessage(null);

      const response = await fetch("/api/copilot/asset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          assetKind,
          command: item.result,
          selectedEvent,
          brandProfile
        })
      });

      if (!response.ok) {
        const failure = (await response.json().catch(() => ({}))) as { error?: string };
        if (failure.error === "ai_not_configured") {
          throw new Error("当前没有配置可用的 live AI，系统不会再生成假版本。");
        }
        if (failure.error === "ai_live_failed") {
          throw new Error("这次 live AI 没有成功返回，所以没生成二次版本。");
        }
        throw new Error("生成二次版本失败");
      }

      const payload = (await response.json()) as {
        result?: CommandAssetResult;
      };

      if (!payload.result) {
        throw new Error("没有拿到二次版本结果");
      }

      updateHistoryItem(item.id, (current) => ({
        ...current,
        assets: {
          ...(current.assets || {}),
          [assetKind]: payload.result
        }
      }));

      setActionMessage("已生成可交付版本");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "生成二次版本失败");
    } finally {
      setIsSaving(null);
    }
  }

  async function runCommand(rawPrompt: string) {
    const nextPrompt = rawPrompt.trim();

    if (!nextPrompt || !workspace) {
      return;
    }

    if (needsSelectedEvent(nextPrompt) && !selectedEvent) {
      setError("这类命令必须先选中一条具体热点，不然 AI 只能空讲。");
      return;
    }

    try {
      setIsRunning(true);
      setError(null);
      setWarning(null);
      setActionMessage(null);

      const response = await fetch("/api/copilot/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: nextPrompt,
          workspace,
          selectedEvent,
          brandProfile
        })
      });

      if (!response.ok) {
        const failure = (await response.json().catch(() => ({}))) as { error?: string };
        if (failure.error === "missing_selected_event") {
          throw new Error("先选中一条热点，再让 AI 拆策略、写脚本或做风险判断。");
        }
        if (failure.error === "unsupported_command") {
          throw new Error("当前真 AI 只支持三类命令：热点策略、小红书脚本、风险判断。");
        }
        if (failure.error === "ai_not_configured") {
          throw new Error("当前没有配置可用的 live AI，系统不会再给你假结果。");
        }
        if (failure.error === "ai_live_failed") {
          throw new Error("这次 live AI 调用失败，没有返回结果。");
        }
        throw new Error(response.status === 400 ? "请输入明确指令。" : "AI 指挥台执行失败");
      }

      const payload = (await response.json()) as {
        result?: CopilotCommandResult;
      };

      if (!payload.result) {
        throw new Error("没有拿到 AI 指挥台结果");
      }

      const result = payload.result;

      setHistory((current) => [
        {
          id: `${Date.now()}-${current.length}`,
          prompt: nextPrompt,
          result
        },
        ...current
      ].slice(0, 6));

      setPrompt("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 指挥台执行失败");
    } finally {
      setIsRunning(false);
    }
  }

  useEffect(() => {
    if (!queuedPrompt || isRunning || !workspace) {
      return;
    }

    runCommand(queuedPrompt).finally(() => {
      onQueuedPromptHandled?.();
    });
  }, [queuedPrompt, isRunning, workspace, onQueuedPromptHandled]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runCommand(prompt);
  }

  return (
    <section className="panel aiCommandCenter">
      <div className="panelHeader">
        <div>
          <p className="panelKicker">AI 指挥台</p>
          <h2>围绕当前热点做真 AI 深拆</h2>
        </div>
        <div className="aiCommandState">
          {selectedEvent ? <span>当前热点：{selectedEvent.title}</span> : <span>当前未选热点</span>}
          {brandProfile ? <strong>品牌视角已启用</strong> : <strong>品牌视角未启用</strong>}
        </div>
      </div>

      <form className="aiCommandForm" onSubmit={handleSubmit}>
        <label className="aiCommandInput" htmlFor="copilot-command">
          <span>你可以直接说</span>
          <textarea
            id="copilot-command"
            placeholder="先在左侧选中一条热点，再说：拆策略 / 写小红书脚本 / 做风险判断"
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <button className="primaryButton" type="submit" disabled={!workspace || isRunning}>
          {isRunning ? "AI 执行中..." : "执行命令"}
        </button>
      </form>

      <div className="tagRow aiQuickRow">
        {quickPrompts.map((item) => (
          <button className="chip" key={item} type="button" disabled={!workspace || isRunning} onClick={() => void runCommand(item)}>
            {item}
          </button>
        ))}
      </div>

      {warning ? <p className="aiInlineHint">{warning}</p> : null}
      {error ? <p className="aiInlineHint">{error}</p> : null}
      {actionMessage ? <p className="aiActionMessage">{actionMessage}</p> : null}

      {history.length === 0 ? (
        <div className="emptyState emptyStateSoft">
          <strong>这里只显示真实模型返回的结果</strong>
          <p>先选中一条具体热点，再让 AI 做策略深拆、脚本生成或风险判断。</p>
        </div>
      ) : (
        <div className="aiCommandHistory">
          {history.map((item) => (
            <article className="aiCommandCard" key={item.id}>
              <div className="aiCommandPrompt">
                <span>你刚刚说</span>
                <strong>{item.prompt}</strong>
              </div>

              <div className="aiCommandResultHead">
                <div>
                  <h3>{item.result.title}</h3>
                  <p>{item.result.summary}</p>
                </div>
                <span className={item.result.mode === "live" ? "aiModeBadge aiModeBadgeLive" : "aiModeBadge"}>
                  {item.result.mode === "live" ? "MiniMax 实时生成" : "非 live 结果"}
                </span>
              </div>

              <div className="aiCommandSections">
                {item.result.sections.map((section) => (
                  <section className="aiCommandSection" key={`${item.id}-${section.title}`}>
                    <span className="insightLabel">{section.title}</span>
                    <p>{section.content}</p>
                  </section>
                ))}
              </div>

              <div className="bulletPanel aiBulletPanel">
                {item.result.suggestions.map((suggestion) => (
                  <p key={suggestion}>{suggestion}</p>
                ))}
              </div>

              <div className="cardActions aiCommandActions">
                <button className="textButton" type="button" onClick={() => void handleCopy(item.result)}>
                  复制结果
                </button>
                <button
                  className="textButton"
                  type="button"
                  disabled={isSaving === `${item.id}-briefing`}
                  onClick={() => void handleSaveBriefing(item)}
                >
                  {isSaving === `${item.id}-briefing` ? "转简报中..." : "转成简报"}
                </button>
                <button
                  className="filledButton"
                  type="button"
                  disabled={!selectedEvent || isSaving === `${item.id}-opportunity`}
                  onClick={() => void handleSaveOpportunity(item)}
                >
                  {isSaving === `${item.id}-opportunity` ? "入池中..." : "加入机会池"}
                </button>
              </div>

              <div className="cardActions aiCommandActions">
                <button
                  className="textButton"
                  type="button"
                  disabled={isSaving === `${item.id}-internal_sync`}
                  onClick={() => void handleGenerateAsset(item, "internal_sync")}
                >
                  {isSaving === `${item.id}-internal_sync` ? "生成中..." : "生成内部版"}
                </button>
                <button
                  className="textButton"
                  type="button"
                  disabled={isSaving === `${item.id}-client_update`}
                  onClick={() => void handleGenerateAsset(item, "client_update")}
                >
                  {isSaving === `${item.id}-client_update` ? "生成中..." : "生成客户版"}
                </button>
                <button
                  className="filledButton"
                  type="button"
                  disabled={isSaving === `${item.id}-publish_copy`}
                  onClick={() => void handleGenerateAsset(item, "publish_copy")}
                >
                  {isSaving === `${item.id}-publish_copy` ? "生成中..." : "生成发布稿"}
                </button>
              </div>

              {item.assets ? (
                <div className="aiAssetList">
                  {Object.values(item.assets).map((asset) =>
                    asset ? (
                      <article className="aiAssetCard" key={`${item.id}-${asset.kind}`}>
                        <div className="featureCardTop">
                          <strong>{asset.title}</strong>
                          <span>{asset.mode === "live" ? "MiniMax 生成" : "非 live 结果"}</span>
                        </div>
                        <p>{asset.summary}</p>
                        <div className="aiAssetContent">
                          <p>{asset.content}</p>
                        </div>
                        <div className="bulletPanel aiBulletPanel">
                          {asset.bullets.map((bullet) => (
                            <p key={bullet}>{bullet}</p>
                          ))}
                        </div>
                        <div className="cardActions aiCommandActions">
                          <button className="textButton" type="button" onClick={() => void handleCopyAsset(asset)}>
                            复制这个版本
                          </button>
                        </div>
                      </article>
                    ) : null
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

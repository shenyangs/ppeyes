"use client";

import { useEffect, useState } from "react";
import { AiNativePanel } from "@/components/ai/AiNativePanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";
import type { OpportunitiesPayload } from "@/lib/page-data";
import type { NativeAiDigest } from "@/lib/native-ai";

export function OpportunitiesView() {
  const [data, setData] = useState<OpportunitiesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<NativeAiDigest | null>(null);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [digestWarning, setDigestWarning] = useState<string | null>(null);
  const [isDigestLoading, setIsDigestLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchJson<OpportunitiesPayload>("/api/opportunities", controller.signal)
      .then((payload) => {
        setData(payload);
        setError(null);
      })
      .catch((requestError: Error) => {
        if (controller.signal.aborted) return;
        setError(requestError.message);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!data) {
      setDigest(null);
      setDigestError(null);
      setDigestWarning(null);
      return;
    }

    const controller = new AbortController();
    setIsDigestLoading(true);
    setDigestError(null);
    setDigestWarning(null);

    fetch("/api/copilot/opportunities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        opportunities: data
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI 机会判断失败");
        }

        const payload = (await response.json()) as {
          digest?: NativeAiDigest;
          warning?: string;
        };

        if (controller.signal.aborted) {
          return;
        }

        if (!payload.digest) {
          throw new Error("没有拿到机会池 AI 结果");
        }

        setDigest(payload.digest);

        if (payload.warning === "live_digest_failed") {
          setDigestWarning("当前显示的是系统兜底建议，MiniMax 实时返回失败。");
        }
      })
      .catch((requestError: Error) => {
        if (controller.signal.aborted) return;
        setDigestError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsDigestLoading(false);
        }
      });

    return () => controller.abort();
  }, [data]);

  return (
    <AppShell>
      <AppHeader
        actions={
          <>
            <button className="ghostButton" type="button">
              批量导出
            </button>
            <button className="primaryButton" type="button">
              新建今日选题
            </button>
          </>
        }
      />

      <section className="pageIntro">
        <div>
          <p className="panelKicker">机会池</p>
          <h2>让 AI 直接告诉你今天该推进哪几条</h2>
        </div>
        <p>这里不是收藏夹，而是轻量选题池。每条机会都要有跟进时机、建议形式和当前状态。</p>
      </section>

      <AiNativePanel
        kicker="AI 排兵台"
        title="机会池原生 AI 判断"
        digest={digest}
        isLoading={isDigestLoading}
        error={digestError}
        warning={digestWarning}
      />

      {!data && !error ? (
        <section className="loadingPanel">
          <div className="loadingDot" />
          <p>正在加载机会池...</p>
        </section>
      ) : null}

      {error ? (
        <section className="emptyState">
          <strong>机会池加载失败</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="statStrip">
            <article className="miniStat">
              <span>本周入池</span>
              <strong>{data.stats.weeklyAdded}</strong>
              <p>其中 11 条来自工作台一键加入</p>
            </article>
            <article className="miniStat">
              <span>今日待定</span>
              <strong>{data.stats.pendingToday}</strong>
              <p>适合晨会或午后快速决策</p>
            </article>
            <article className="miniStat">
              <span>已执行</span>
              <strong>{data.stats.executed}</strong>
              <p>可反哺后续评分策略</p>
            </article>
          </section>

          <section className="panel">
            <div className="panelHeader">
              <div>
                <p className="panelKicker">机会看板</p>
                <h2>机会流转看板</h2>
              </div>
              <button className="miniTextButton" type="button">
                只看今天
              </button>
            </div>

            <div className="laneGrid">
              {data.lanes.map((lane) => (
                <article className="laneCard" key={lane.title}>
                  <div className="laneHeader">
                    <strong>{lane.title}</strong>
                    <span>{lane.count}</span>
                  </div>
                  <div className="laneList">
                    {lane.items.map((item) => (
                      <div className="laneItem" key={item}>
                        {item}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="contentGrid">
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <p className="panelKicker">今日优先</p>
                  <h2>建议优先处理</h2>
                </div>
              </div>

              <div className="templateList">
                {data.picks.length > 0 ? (
                  data.picks.map((pick) => (
                    <article className="listCard" key={pick.title}>
                      <div className="featureCardTop">
                        <strong>{pick.title}</strong>
                        <span>{pick.timing}</span>
                      </div>
                      <p>{pick.note}</p>
                      <div className="tagRow">
                        <span>{pick.format}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="emptyState emptyStateSoft">
                    <strong>机会池还是空的</strong>
                    <p>回到工作台，把值得跟进的热点加入机会池，这里就会开始积累真实选题。</p>
                  </div>
                )}
              </div>
            </section>

            <aside className="stackedPanels">
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">执行原则</p>
                    <h2>入池规则</h2>
                  </div>
                </div>

                <div className="bulletPanel">
                  {data.rules.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">能力扩展</p>
                    <h2>后续可接能力</h2>
                  </div>
                </div>

                <div className="bulletPanel">
                  {data.future.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">已保存条目</p>
                    <h2>已保存机会</h2>
                  </div>
                </div>

                <div className="templateList">
                  {data.saved.map((item) => (
                    <article className="listCard" key={item.id}>
                      <div className="featureCardTop">
                        <strong>{item.title}</strong>
                        <span>{item.status}</span>
                      </div>
                      <p>{item.note}</p>
                      <div className="tagRow">
                        <span>{item.timing}</span>
                        <span>{item.format}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

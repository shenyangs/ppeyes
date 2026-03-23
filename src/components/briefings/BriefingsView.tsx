"use client";

import { useEffect, useState } from "react";
import { AiNativePanel } from "@/components/ai/AiNativePanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";
import type { BriefingsPayload } from "@/lib/page-data";
import type { BriefingsNativeAiDigest } from "@/lib/native-ai";

export function BriefingsView() {
  const [data, setData] = useState<BriefingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<BriefingsNativeAiDigest | null>(null);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [digestWarning, setDigestWarning] = useState<string | null>(null);
  const [isDigestLoading, setIsDigestLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchJson<BriefingsPayload>("/api/briefings", controller.signal)
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

    fetch("/api/copilot/briefings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        briefings: data
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI 简报判断失败");
        }

        const payload = (await response.json()) as {
          digest?: BriefingsNativeAiDigest;
          warning?: string;
        };

        if (controller.signal.aborted) {
          return;
        }

        if (!payload.digest) {
          throw new Error("没有拿到简报 AI 结果");
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
              设置推送
            </button>
            <button className="primaryButton" type="button">
              生成新简报
            </button>
          </>
        }
      />

      <section className="pageIntro">
        <div>
          <p className="panelKicker">简报中心</p>
          <h2>把 AI 判断直接变成可发出去的简报骨架</h2>
        </div>
        <p>简报不是原始数据堆叠，而是“为什么值得看、值不值得做、风险在哪里”的结构化输出。</p>
      </section>

      <AiNativePanel
        kicker="AI 简报官"
        title="简报页原生 AI 判断"
        digest={digest}
        isLoading={isDigestLoading}
        error={digestError}
        warning={digestWarning}
        extra={
          digest?.deliveryPlan?.length ? (
            <div className="bulletPanel aiBulletPanel">
              {digest.deliveryPlan.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null
        }
      />

      {!data && !error ? (
        <section className="loadingPanel">
          <div className="loadingDot" />
          <p>正在加载简报模板...</p>
        </section>
      ) : null}

      {error ? (
        <section className="emptyState">
          <strong>简报数据加载失败</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="briefingGrid">
            {data.templates.map((briefing) => (
              <article className="featureCard" key={briefing.title}>
                <div className="featureCardTop">
                  <strong>{briefing.title}</strong>
                  <span>模板</span>
                </div>
                <p>{briefing.description}</p>
                <button className="ghostButton stretchButton" type="button">
                  用这个模板生成
                </button>
              </article>
            ))}
          </section>

          <section className="contentGrid">
            <section className="panel">
              <div className="panelHeader">
                <div>
                  <p className="panelKicker">已生成简报</p>
                  <h2>最近生成</h2>
                </div>
              </div>

              <div className="templateList">
                {data.recent.map((item) => (
                  <article className="listCard" key={item.title}>
                    <div className="featureCardTop">
                      <strong>{item.title}</strong>
                      <span>{item.type}</span>
                    </div>
                    <p>{item.note}</p>
                    {item.content ? <p>{item.content.slice(0, 120)}...</p> : null}
                  </article>
                ))}
              </div>
            </section>

            <aside className="stackedPanels">
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">推荐结构</p>
                    <h2>每份简报应包含</h2>
                  </div>
                </div>

                <div className="bulletPanel">
                  {data.structure.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">分发计划</p>
                    <h2>后续推送方向</h2>
                  </div>
                </div>

                <div className="bulletPanel">
                  {data.delivery.map((item) => (
                    <p key={item}>{item}</p>
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

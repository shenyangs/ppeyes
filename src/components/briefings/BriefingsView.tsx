"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";
import type { BriefingsPayload } from "@/lib/page-data";

export function BriefingsView() {
  const [data, setData] = useState<BriefingsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          <h2>把工作台里的判断沉淀成团队可以直接同步的简报</h2>
        </div>
        <p>简报不是原始数据堆叠，而是“为什么值得看、值不值得做、风险在哪里”的结构化输出。</p>
      </section>

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

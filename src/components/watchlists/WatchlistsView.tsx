"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AiNativePanel } from "@/components/ai/AiNativePanel";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";
import type { WatchlistsPayload } from "@/lib/page-data";
import type { WatchlistsNativeAiDigest } from "@/lib/native-ai";
import type { StoredWatchlistTerm } from "@/lib/storage";

export function WatchlistsView() {
  const [data, setData] = useState<WatchlistsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [digest, setDigest] = useState<WatchlistsNativeAiDigest | null>(null);
  const [digestError, setDigestError] = useState<string | null>(null);
  const [digestWarning, setDigestWarning] = useState<string | null>(null);
  const [isDigestLoading, setIsDigestLoading] = useState(false);
  const [form, setForm] = useState<{
    type: StoredWatchlistTerm["type"];
    keyword: string;
    priority: StoredWatchlistTerm["priority"];
  }>({
    type: "品牌词",
    keyword: "",
    priority: "高"
  });

  async function loadData(signal?: AbortSignal) {
    const payload = await fetchJson<WatchlistsPayload>("/api/watchlists", signal);
    setData(payload);
    setError(null);
  }

  useEffect(() => {
    const controller = new AbortController();

    loadData(controller.signal)
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

    fetch("/api/copilot/watchlists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        watchlists: data
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI 监测词体检失败");
        }

        const payload = (await response.json()) as {
          digest?: WatchlistsNativeAiDigest;
          warning?: string;
        };

        if (controller.signal.aborted) {
          return;
        }

        if (!payload.digest) {
          throw new Error("没有拿到 AI 建议");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: form.type,
          keyword: form.keyword,
          priority: form.priority,
          alerts: true
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error === "keyword_exists" ? "这个监测词已经存在" : "新增失败");
      }

      const payload = (await response.json()) as WatchlistsPayload;
      setData(payload);
      setForm({ type: "品牌词", keyword: "", priority: "高" });
      setShowForm(false);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "新增失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApplySuggestion(suggestion: WatchlistsNativeAiDigest["termSuggestions"][number]) {
    try {
      setError(null);
      const response = await fetch("/api/watchlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type: suggestion.type,
          keyword: suggestion.keyword,
          priority: suggestion.priority,
          alerts: true
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error === "keyword_exists" ? "这个建议词已经存在" : "添加建议词失败");
      }

      const payload = (await response.json()) as WatchlistsPayload;
      setData(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "添加建议词失败");
    }
  }

  return (
    <AppShell>
      <AppHeader
        actions={
          <>
            <button className="ghostButton" type="button">
              导入词包
            </button>
            <button className="primaryButton" type="button" onClick={() => setShowForm(true)}>
              新建监测词
            </button>
          </>
        }
      />

      <section className="pageIntro">
        <div>
          <p className="panelKicker">监测词设置</p>
          <h2>让 AI 帮你把词包变成可用的信号网</h2>
        </div>
        <p>
          把复杂规则压成 4 类词包，让团队 5 分钟内完成基础监测配置。系统会把命中结果直接回流到工作台和简报。
        </p>
      </section>

      <AiNativePanel
        kicker="AI 监测员"
        title="这一页不该只是配置页"
        digest={digest}
        isLoading={isDigestLoading}
        error={digestError}
        warning={digestWarning}
        extra={
          digest?.termSuggestions?.length ? (
            <div className="templateList aiCompactList">
              {digest.termSuggestions.map((item) => (
                <article className="listCard aiSuggestionCard" key={`${item.type}-${item.keyword}`}>
                  <div className="featureCardTop">
                    <strong>{item.keyword}</strong>
                    <span>
                      {item.type} · {item.priority}
                    </span>
                  </div>
                  <p>{item.reason}</p>
                  <button className="ghostButton stretchButton" type="button" onClick={() => handleApplySuggestion(item)}>
                    加进监测词
                  </button>
                </article>
              ))}
            </div>
          ) : null
        }
      />

      {!data && !error ? (
        <section className="loadingPanel">
          <div className="loadingDot" />
          <p>正在加载监测词配置...</p>
        </section>
      ) : null}

      {error ? (
        <section className="emptyState">
          <strong>监测词数据加载失败</strong>
          <p>{error}</p>
        </section>
      ) : null}

      {data ? (
        <>
          {showForm ? (
            <section className="panel formPanel">
              <div className="panelHeader">
                <div>
                  <p className="panelKicker">新增监测词</p>
                  <h2>新增监测词</h2>
                </div>
                <button className="miniTextButton" type="button" onClick={() => setShowForm(false)}>
                  收起
                </button>
              </div>

              <form className="inlineForm" onSubmit={handleSubmit}>
                <label className="field">
                  <span>类型</span>
                  <select
                    value={form.type}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        type: event.target.value as StoredWatchlistTerm["type"]
                      }))
                    }
                  >
                    <option value="品牌词">品牌词</option>
                    <option value="竞品词">竞品词</option>
                    <option value="行业词">行业词</option>
                    <option value="风险词">风险词</option>
                  </select>
                </label>

                <label className="field">
                  <span>关键词</span>
                  <input
                    placeholder="比如：新品名、代言人、通勤场景"
                    value={form.keyword}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        keyword: event.target.value
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>优先级</span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as StoredWatchlistTerm["priority"]
                      }))
                    }
                  >
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>
                </label>

                <button className="primaryButton" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "保存中..." : "保存监测词"}
                </button>
              </form>
            </section>
          ) : (
            <section className="quickActionRow">
              <button className="primaryButton" type="button" onClick={() => setShowForm(true)}>
                新建监测词
              </button>
            </section>
          )}

          <section className="statStrip">
            <article className="miniStat">
              <span>总词数</span>
              <strong>{data.stats.totalTerms}</strong>
              <p>当前已接入 4 类词包</p>
            </article>
            <article className="miniStat">
              <span>今日命中</span>
              <strong>{data.stats.hitsToday}</strong>
              <p>其中 6 条已进入机会池</p>
            </article>
            <article className="miniStat">
              <span>高优先级</span>
              <strong>{data.stats.highPriority}</strong>
              <p>建议保留飞书或企微提醒</p>
            </article>
          </section>

          <section className="contentGrid">
            <div className="stackedPanels">
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">词包分组</p>
                    <h2>词包分组</h2>
                  </div>
                  <button className="miniTextButton" type="button">
                    管理优先级
                  </button>
                </div>

                <div className="featureGrid">
                  {data.groups.map((group) => (
                    <article className="featureCard" key={group.title}>
                      <div className="featureCardTop">
                        <strong>{group.title}</strong>
                        <span>{group.count} 个词</span>
                      </div>
                      <p>{group.description}</p>
                      <div className="tagRow">
                        {group.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">推荐配置</p>
                    <h2>推荐配置模板</h2>
                  </div>
                </div>

                <div className="templateList">
                  {data.templates.map((template) => (
                    <article className="listCard" key={template.title}>
                      <strong>{template.title}</strong>
                      <p>{template.note}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="stackedPanels">
              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">最近命中</p>
                    <h2>最近命中</h2>
                  </div>
                </div>

                <div className="tableLikeList">
                  {data.hits.map((hit) => (
                    <article className="tableRow" key={`${hit.type}-${hit.keyword}-${hit.time}`}>
                      <div>
                        <span className="rowLabel">{hit.type}</span>
                        <strong>{hit.keyword}</strong>
                      </div>
                      <span className="rowMeta">{hit.time}</span>
                      <p>{hit.note}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">设计原则</p>
                    <h2>首版交互原则</h2>
                  </div>
                </div>

                <div className="bulletPanel">
                  {data.principles.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </section>

              <section className="panel">
                <div className="panelHeader">
                  <div>
                    <p className="panelKicker">最近词条</p>
                    <h2>已保存监测词</h2>
                  </div>
                </div>

                <div className="tagCloud">
                  {data.terms.map((term) => (
                    <span className="channelChip" key={term.id}>
                      {term.type} · {term.keyword}
                    </span>
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

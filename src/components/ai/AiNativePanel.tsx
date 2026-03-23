import type { ReactNode } from "react";
import type { NativeAiDigest } from "@/lib/native-ai";

type AiNativePanelProps = {
  kicker: string;
  title: string;
  digest: NativeAiDigest | null;
  isLoading?: boolean;
  error?: string | null;
  warning?: string | null;
  extra?: ReactNode;
};

export function AiNativePanel({
  kicker,
  title,
  digest,
  isLoading = false,
  error,
  warning,
  extra
}: AiNativePanelProps) {
  return (
    <section className="panel aiNativePanel">
      <div className="panelHeader">
        <div>
          <p className="panelKicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
        {digest ? (
          <span className={digest.mode === "live" ? "aiModeBadge aiModeBadgeLive" : "aiModeBadge"}>
            {digest.mode === "live" ? "MiniMax 原生判断" : "系统兜底判断"}
          </span>
        ) : null}
      </div>

      {isLoading && !digest ? (
        <div className="emptyState emptyStateSoft">
          <strong>AI 正在接管这一页</strong>
          <p>正在整理重点、风险和下一步动作。</p>
        </div>
      ) : null}

      {error && !digest ? (
        <div className="emptyState emptyStateSoft">
          <strong>AI 暂时没有返回结果</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {digest ? (
        <div className="aiNativeBody">
          <section className="aiHeroCard">
            <p className="aiHeroTitle">{digest.headline}</p>
            <p className="aiHeroSummary">{digest.summary}</p>
            <div className="aiMetaStrip">
              <div>
                <span>下一步</span>
                <strong>{digest.nextMove}</strong>
              </div>
              <div>
                <span>判断依据</span>
                <strong>{digest.rationale}</strong>
              </div>
            </div>
            {warning ? <p className="aiInlineHint">{warning}</p> : null}
          </section>

          <div className="aiNativeGrid">
            <section className="aiNativeSection">
              <span className="insightLabel">优先动作</span>
              <div className="aiTaskList">
                {digest.priorities.map((item) => (
                  <article className="aiTaskCard" key={`${item.title}-${item.note}`}>
                    <div className="aiTaskTop">
                      <strong>{item.title}</strong>
                      {item.tag ? <span>{item.tag}</span> : null}
                    </div>
                    <p>{item.note}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="aiNativeSection">
              <span className="insightLabel">风险提醒</span>
              <div className="bulletPanel aiBulletPanel">
                {digest.watchouts.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>

            <section className="aiNativeSection">
              <span className="insightLabel">AI 追问</span>
              <div className="bulletPanel aiBulletPanel">
                {digest.questions.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </section>

            {extra ? (
              <section className="aiNativeSection">
                <span className="insightLabel">补充动作</span>
                {extra}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

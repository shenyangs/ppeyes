import { forwardRef, useEffect, useRef, useState } from "react";
import type { BrandProfile } from "@/lib/brand";
import type { EventAnalysis } from "@/lib/analysis";
import type { WorkspaceEvent } from "@/lib/page-data";

type InsightPanelProps = {
  event: WorkspaceEvent | null;
  brandProfile: BrandProfile | null;
  topOffset: number;
  isFloating?: boolean;
  onSaveOpportunity: (event: WorkspaceEvent) => void;
  savingEventId: string | null;
  analysis: EventAnalysis | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  onAnalyze: () => void;
};

export const InsightPanel = forwardRef<HTMLElement, InsightPanelProps>(function InsightPanel({
  event,
  brandProfile,
  topOffset,
  isFloating = false,
  onSaveOpportunity,
  savingEventId,
  analysis,
  isAnalyzing,
  analysisError,
  onAnalyze
}: InsightPanelProps, ref) {
  const panelRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [viewportPanelHeight, setViewportPanelHeight] = useState<number | null>(null);

  function bindPanelRef(node: HTMLElement | null) {
    panelRef.current = node;

    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [event?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewportPanelHeight = () => {
      if (!isFloating || !panelRef.current) return;

      const viewportHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
      const panelTop = panelRef.current.getBoundingClientRect().top;
      const availableHeight = Math.max(320, Math.floor(viewportHeight - panelTop - 20));
      setViewportPanelHeight(availableHeight);
    };

    updateViewportPanelHeight();

    const visualViewport = window.visualViewport;
    window.addEventListener("resize", updateViewportPanelHeight);
    visualViewport?.addEventListener("resize", updateViewportPanelHeight);
    visualViewport?.addEventListener("scroll", updateViewportPanelHeight);

    return () => {
      window.removeEventListener("resize", updateViewportPanelHeight);
      visualViewport?.removeEventListener("resize", updateViewportPanelHeight);
      visualViewport?.removeEventListener("scroll", updateViewportPanelHeight);
    };
  }, [analysis?.mode, event?.id, isFloating, topOffset]);

  const displayed = analysis;

  return (
    <aside
      className={isFloating ? "panel insightPanel insightPanelFloating" : "panel insightPanel"}
      ref={bindPanelRef}
      style={{
        top: `${topOffset}px`,
        height: isFloating && viewportPanelHeight ? `${viewportPanelHeight}px` : undefined,
        maxHeight:
          isFloating && viewportPanelHeight
            ? `${viewportPanelHeight}px`
            : isFloating
              ? `calc(100dvh - 24px)`
              : `calc(100dvh - ${topOffset + 20}px)`
      }}
    >
      <div className="panelHeader">
        <div>
          <p className="panelKicker">Gemini Strategy Copilot</p>
          <h2>传播建议</h2>
        </div>
        <div className="panelActionRow">
          <button className="ghostButton compact" type="button" disabled={!event || isAnalyzing} onClick={onAnalyze}>
            {isAnalyzing ? "分析中..." : analysis?.mode === "live" ? "再生成一版" : "品牌视角分析"}
          </button>
        </div>
      </div>

      <div className="insightBody" ref={bodyRef}>
        {!event ? (
          <div className="emptyState emptyStateSoft">
            <strong>选择一条热点</strong>
            <p>右侧会直接给出品牌传播建议、参考标题和风险提醒。</p>
          </div>
        ) : isAnalyzing ? (
          <div className="emptyState emptyStateSoft">
            <strong>正在生成品牌策划</strong>
            <p>正在把这条热点翻译成可执行的品牌传播方案，请稍等。</p>
          </div>
        ) : !displayed ? (
          <div className="insightSections">
            <section className="insightBlock">
              <span className="insightLabel">当前热点</span>
              <p>{event.title}</p>
              <p>{event.summary}</p>
            </section>

            {brandProfile && event.brandView ? (
              <section className="insightBlock">
                <span className="insightLabel">品牌视角预判</span>
                <p>
                  {brandProfile.name || "当前品牌"}：{event.brandView.verdict}，品牌适配度 {event.brandView.score}
                </p>
                <p>{event.brandView.reason}</p>
              </section>
            ) : null}

            <section className="insightBlock insightBlockSoft">
              <span className="insightLabel">下一步</span>
              <p>点击“生成创意”后，这里才会出现真实的品牌策划内容，不再显示占位模板。</p>
            </section>
          </div>
        ) : (
          <div className="insightSections">
          {analysisError ? (
            <section className="insightBlock insightBlockAlert">
              <span className="insightLabel">Gemini 状态</span>
              <p>{analysisError}</p>
            </section>
          ) : null}

          {displayed ? (
            <section className={displayed.mode === "live" ? "insightBlock" : "insightBlock insightBlockAlert"}>
              <span className="insightLabel">分析模式</span>
              <p>{displayed.mode === "live" ? "真实 Gemini 输出" : "规则兜底输出"}</p>
              {displayed.mode === "fallback" ? (
                <p>这版只是兜底策划，不代表 Gemini 已经真正结合你的品牌完成策划。</p>
              ) : null}
            </section>
          ) : null}

          <section className="insightBlock">
            <span className="insightLabel">策划类型</span>
            <p>{displayed?.planningType}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">策划标题</span>
            <p>{displayed?.campaignName}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">目标人群</span>
            <p>{displayed?.targetAudience}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">使用场景</span>
            <p>{displayed?.scenario}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">核心洞察</span>
            <p>{displayed?.coreInsight}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">传播命题</span>
            <p>{displayed?.strategyLine}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">产品怎么接</span>
            <p>{displayed?.productLink}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">首发内容</span>
            <p>{displayed?.heroAsset}</p>
          </section>

          {brandProfile && event?.brandView ? (
            <section className="insightBlock">
              <span className="insightLabel">品牌视角判断</span>
              <p>
                {brandProfile.name || "当前品牌"}：{event.brandView.verdict}，品牌适配度 {event.brandView.score}
              </p>
              <p>{event.brandView.reason}</p>
            </section>
          ) : null}

          <section className="insightBlock">
            <span className="insightLabel">结论</span>
            <p>
              {displayed?.conclusion}
            </p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">为什么</span>
            <p>{displayed?.reasoning}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">策划评分</span>
            <div className="analysisScoreGrid">
              <div className="scoreBadge">
                <span>品牌贴合</span>
                <strong>{displayed?.fitScore}</strong>
              </div>
              <div className="scoreBadge">
                <span>创意空间</span>
                <strong>{displayed?.creativeScore}</strong>
              </div>
              <div className="scoreBadge">
                <span>传播潜力</span>
                <strong>{displayed?.spreadScore}</strong>
              </div>
              <div className="scoreBadge">
                <span>风险控制</span>
                <strong>{displayed?.riskControlScore}</strong>
              </div>
            </div>
            <p>{displayed?.planningComment}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">建议平台</span>
            <div className="channelGroup">
              {displayed?.channels.map((channel) => (
                <span className="channelChip" key={channel}>
                  {channel}
                </span>
              ))}
            </div>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">传播角度</span>
            <ol className="insightList">
              {displayed?.angles.map((angle) => (
                <li key={angle}>{angle}</li>
              ))}
            </ol>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">参考标题</span>
            <ul className="insightList">
              {displayed?.headlines.map((headline) => (
                <li key={headline}>{headline}</li>
              ))}
            </ul>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">短文案草案</span>
            <p>{displayed?.draft}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">执行动作</span>
            <ol className="insightList">
              {displayed?.executionSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">内容拆分</span>
            <ol className="insightList">
              {displayed?.contentPlan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">需要准备的素材</span>
            <ul className="insightList">
              {displayed?.assetList.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">发布节奏</span>
            <ol className="insightList">
              {displayed?.launchTimeline.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">验收指标</span>
            <ul className="insightList">
              {displayed?.successMetrics.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="insightBlock insightBlockAlert">
            <span className="insightLabel">风险提醒</span>
            <p>{displayed?.riskNote}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">引导动作</span>
            <p>{displayed?.callToAction}</p>
          </section>

          <section className="insightBlock">
            <span className="insightLabel">建议动作</span>
            <p>{displayed?.nextAction}</p>
          </section>

          <section className="insightFooter">
            <button
              className="ghostButton"
              type="button"
              disabled={!event || event.saved || savingEventId === event.id}
              onClick={() => {
                if (event) onSaveOpportunity(event);
              }}
            >
              {!event ? "加入机会池" : event.saved ? "已在机会池" : savingEventId === event.id ? "保存中..." : "加入机会池"}
            </button>
            <button className="primaryButton" type="button">
              复制文案
            </button>
          </section>
          </div>
        )}
      </div>
    </aside>
  );
});

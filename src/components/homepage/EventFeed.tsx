import { forwardRef, type MouseEvent } from "react";
import type { SortMode } from "@/lib/homepage-data";
import type { WorkspaceEvent } from "@/lib/page-data";

function ScoreBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="scoreBadge">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

type EventFeedProps = {
  events: WorkspaceEvent[];
  hasBrandLens: boolean;
  selectedEventId: string | null;
  onSelectEvent: (event: WorkspaceEvent, anchorTop?: number) => void;
  onGenerateEvent: (event: WorkspaceEvent, anchorTop?: number) => void;
  onSaveOpportunity: (event: WorkspaceEvent) => void;
  savingEventId: string | null;
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  sortOptions: { key: SortMode; label: string }[];
};

export const EventFeed = forwardRef<HTMLElement, EventFeedProps>(function EventFeed({
  events,
  hasBrandLens,
  selectedEventId,
  onSelectEvent,
  onGenerateEvent,
  onSaveOpportunity,
  savingEventId,
  sortMode,
  onSortModeChange,
  sortOptions
}: EventFeedProps, ref) {
  function getAnchorTop(target?: HTMLElement | null) {
    const article = target?.closest(".eventCard") as HTMLElement | null;
    return article?.getBoundingClientRect().top;
  }

  const strongCount = events.filter((event) => event.brandView?.verdict === "强策划").length;
  const workableCount = events.filter((event) => event.brandView?.verdict === "可策划").length;

  const headerTitle = hasBrandLens
    ? sortMode === "brand"
      ? strongCount > 0
        ? "优先看强结合热点"
        : workableCount > 0
          ? "当前没有强结合，先看可策划热点"
          : "当前没有强结合热点"
      : "值得品牌动作的热点"
    : "值得品牌动作的热点";

  const headerKicker = hasBrandLens
    ? sortMode === "brand"
      ? strongCount > 0
        ? "Brand-first Feed"
        : "Brand-ranked Feed"
      : "Brand Lens Active"
    : "Today's Priority Feed";

  return (
    <section className="panel feedPanel" ref={ref}>
      <div className="panelHeader">
        <div>
          <p className="panelKicker">{headerKicker}</p>
          <h2>{headerTitle}</h2>
        </div>
        <div className="sortTabs">
          {sortOptions.map((option) => (
            <button
              className={option.key === sortMode ? "sortTab sortTabActive" : "sortTab"}
              key={option.key}
              type="button"
              onClick={() => onSortModeChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="emptyState">
          <strong>当前没有匹配的热点</strong>
          <p>可以试试放宽筛选条件，或者切换到“全部”查看今日全量事件。</p>
        </div>
      ) : (
        <div className="feedList">
          {events.map((event) => (
            <article
              className={event.id === selectedEventId ? "eventCard eventCardActive" : "eventCard"}
              key={event.id}
            >
              <button
                className="eventCardButton"
                type="button"
                onClick={(eventTarget: MouseEvent<HTMLButtonElement>) =>
                  onSelectEvent(event, getAnchorTop(eventTarget.currentTarget))
                }
              >
                <div className="eventCardTop">
                  <span
                    className={`actionPill ${
                      event.action === "可借势"
                        ? "pillPositive"
                        : event.action === "可观察"
                          ? "pillNeutral"
                          : "pillWarning"
                    }`}
                  >
                    {event.action}
                  </span>
                  {event.brandView ? (
                    <span
                      className={`actionPill ${
                        event.brandView.verdict === "强策划"
                          ? "pillPositive"
                          : event.brandView.verdict === "可策划"
                            ? "pillNeutral"
                            : "pillWarning"
                      }`}
                    >
                      {event.brandView.verdict}
                    </span>
                  ) : null}
                  <span className="trendTag">{event.trend}</span>
                </div>

                <h3>{event.title}</h3>
                <p className="eventSummary">{event.summary}</p>
                {event.brandView ? <p className="brandReason">{event.brandView.reason}</p> : null}

                <div className="metaRow">
                  <span>平台：{event.sources.join(" / ")}</span>
                  <span>首次出现：{event.firstSeen}</span>
                </div>

                <div className="tagRow">
                  <span>{event.industry}</span>
                  <span>{event.sentiment}</span>
                  <span>风险 {event.risk}</span>
                </div>

                <div className="scoreRow">
                  {event.brandView ? <ScoreBadge label="品牌适配度" value={event.brandView.score} /> : null}
                  <ScoreBadge label="品牌相关度" value={event.relevance} />
                  <ScoreBadge label="传播机会分" value={event.opportunity} />
                </div>
              </button>

              <div className="cardActions">
                <button
                  className="textButton"
                  type="button"
                  onClick={(eventTarget: MouseEvent<HTMLButtonElement>) =>
                    onSelectEvent(event, getAnchorTop(eventTarget.currentTarget))
                  }
                >
                  查看建议
                </button>
                <button
                  className="textButton"
                  type="button"
                  disabled={event.saved || savingEventId === event.id}
                  onClick={() => onSaveOpportunity(event)}
                >
                  {event.saved ? "已在机会池" : savingEventId === event.id ? "保存中..." : "加入机会池"}
                </button>
                <button
                  className="filledButton"
                  type="button"
                  onClick={(eventTarget: MouseEvent<HTMLButtonElement>) =>
                    onGenerateEvent(event, getAnchorTop(eventTarget.currentTarget))
                  }
                >
                  生成创意
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
});

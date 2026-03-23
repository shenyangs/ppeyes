import { useEffect, useState, type FormEvent } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

type TopBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onGenerateBriefing?: () => void;
};

function getCurrentDateMeta() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    timeZone: "Asia/Shanghai"
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai"
  })
    .format(now)
    .replace(/\//g, ".");
  const timeLabel = new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai"
  }).format(now);

  return {
    weekday,
    dateLabel,
    timeLabel
  };
}

export function TopBar({
  query,
  onQueryChange,
  onRefresh,
  isRefreshing = false,
  onGenerateBriefing
}: TopBarProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const [clock, setClock] = useState(getCurrentDateMeta());

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(getCurrentDateMeta());
    }, 1000 * 30);

    return () => window.clearInterval(interval);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onQueryChange(draftQuery.trim());
  }

  return (
    <AppHeader
      actions={
        <>
        <form className="searchBar" onSubmit={handleSubmit}>
          <label className="searchBox" htmlFor="search">
            <span>搜索</span>
            <input
              id="search"
              type="text"
              placeholder="搜标题、平台、传播角度、品牌判断"
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
            />
          </label>
          <button className="ghostButton searchSubmit" type="submit">
            搜索
          </button>
        </form>
        <div className="dateBadge">
          <span>{clock.weekday} · 北京时间 {clock.timeLabel}</span>
          <strong>{clock.dateLabel}</strong>
        </div>
        <button className="ghostButton" type="button" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? "刷新中..." : "刷新热度"}
        </button>
        <button className="primaryButton" type="button" onClick={onGenerateBriefing}>
          深拆当前热点
        </button>
        </>
      }
    />
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

type TopBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
};

function getCurrentDateMeta() {
  const now = new Date();
  const weekday = now.toLocaleDateString("zh-CN", { weekday: "short" });
  const dateLabel = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(
    now.getDate()
  ).padStart(2, "0")}`;

  return {
    weekday,
    dateLabel
  };
}

export function TopBar({ query, onQueryChange, onRefresh, isRefreshing = false }: TopBarProps) {
  const [draftQuery, setDraftQuery] = useState(query);
  const { weekday, dateLabel } = getCurrentDateMeta();

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

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
          <span>{weekday}</span>
          <strong>{dateLabel}</strong>
        </div>
        <button className="ghostButton" type="button" disabled={isRefreshing} onClick={onRefresh}>
          {isRefreshing ? "刷新中..." : "刷新热度"}
        </button>
        <button className="primaryButton" type="button">
          生成今日简报
        </button>
        </>
      }
    />
  );
}

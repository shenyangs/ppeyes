import { useEffect, useState, type FormEvent } from "react";
import { AppHeader } from "@/components/layout/AppHeader";

type TopBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

export function TopBar({ query, onQueryChange }: TopBarProps) {
  const [draftQuery, setDraftQuery] = useState(query);

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
          <span>周日</span>
          <strong>2026.03.22</strong>
        </div>
        <button className="ghostButton" type="button">
          刷新热度
        </button>
        <button className="primaryButton" type="button">
          生成今日简报
        </button>
        </>
      }
    />
  );
}

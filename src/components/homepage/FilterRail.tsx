import type { TimeFilter, WatchlistType } from "@/lib/homepage-data";

type FilterRailProps = {
  timeFilter: TimeFilter;
  onTimeFilterChange: (value: TimeFilter) => void;
  selectedPlatforms: string[];
  onPlatformToggle: (value: string) => void;
  onPlatformSelectAll: () => void;
  onPlatformClearAll: () => void;
  industryFilter: string;
  onIndustryFilterChange: (value: string) => void;
  selectedWatchlists: WatchlistType[];
  onWatchlistToggle: (value: WatchlistType) => void;
  onWatchlistSelectAll: () => void;
  onWatchlistClearAll: () => void;
  riskFilter: "全部" | "低" | "中" | "高";
  onRiskFilterChange: (value: "全部" | "低" | "中" | "高") => void;
  onReset: () => void;
  options: {
    time: TimeFilter[];
    platform: string[];
    industry: string[];
    watchlist: WatchlistType[];
    risk: readonly ["全部", "低", "中", "高"];
  };
};

export function FilterRail({
  timeFilter,
  onTimeFilterChange,
  selectedPlatforms,
  onPlatformToggle,
  onPlatformSelectAll,
  onPlatformClearAll,
  industryFilter,
  onIndustryFilterChange,
  selectedWatchlists,
  onWatchlistToggle,
  onWatchlistSelectAll,
  onWatchlistClearAll,
  riskFilter,
  onRiskFilterChange,
  onReset,
  options
}: FilterRailProps) {
  return (
    <aside className="panel filterPanel">
      <div className="panelHeader">
        <div>
          <p className="panelKicker">筛选条件</p>
          <h2>工作台筛选</h2>
        </div>
        <button className="miniTextButton" type="button" onClick={onReset}>
          重置
        </button>
      </div>

      <div className="filterSection">
        <h3>时间</h3>
        <div className="chipGroup">
          {options.time.map((item) => (
            <button
              className={item === timeFilter ? "chip chipActive" : "chip"}
              key={item}
              type="button"
              onClick={() => onTimeFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="filterSection">
        <div className="filterSectionHeader">
          <h3>平台</h3>
          <div className="filterSectionActions">
            <button className="miniTextButton" type="button" onClick={onPlatformSelectAll}>
              全选
            </button>
            <button className="miniTextButton" type="button" onClick={onPlatformClearAll}>
              全不选
            </button>
          </div>
        </div>
        <div className="stackedOptions">
          {options.platform.map((item) => (
            <label className="optionRow" key={item}>
              <input
                checked={selectedPlatforms.includes(item)}
                type="checkbox"
                onChange={() => onPlatformToggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filterSection">
        <h3>行业</h3>
        <div className="chipGroup">
          {options.industry.map((item) => (
            <button
              className={item === industryFilter ? "chip chipActive" : "chip"}
              key={item}
              type="button"
              onClick={() => onIndustryFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="filterSection">
        <div className="filterSectionHeader">
          <h3>词包</h3>
          <div className="filterSectionActions">
            <button className="miniTextButton" type="button" onClick={onWatchlistSelectAll}>
              全选
            </button>
            <button className="miniTextButton" type="button" onClick={onWatchlistClearAll}>
              全不选
            </button>
          </div>
        </div>
        <div className="stackedOptions">
          {options.watchlist.map((item) => (
            <label className="optionRow" key={item}>
              <input
                checked={selectedWatchlists.includes(item)}
                type="checkbox"
                onChange={() => onWatchlistToggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filterSection">
        <h3>风险等级</h3>
        <div className="chipGroup">
          {options.risk.map((item) => (
            <button
              className={item === riskFilter ? "chip chipActive" : "chip"}
              key={item}
              type="button"
              onClick={() => onRiskFilterChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

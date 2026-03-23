export type LiveTaskShape = {
  title: string;
  note: string;
  tag?: string;
};

export type LiveSectionShape = {
  title: string;
  content: string;
};

export type LiveWatchlistSuggestionShape = {
  keyword: string;
  type: "品牌词" | "竞品词" | "行业词" | "风险词";
  priority: "高" | "中" | "低";
  reason: string;
};

const LIVE_COMMAND_KINDS = new Set(["event_strategy", "xhs_script", "risk_watch"]);
const LIVE_ASSET_KINDS = new Set(["internal_sync", "client_update", "publish_copy"]);
const LIVE_WATCHLIST_TYPES = new Set(["品牌词", "竞品词", "行业词", "风险词"]);
const LIVE_PRIORITIES = new Set(["高", "中", "低"]);

function fail(field: string): never {
  throw new Error(`ai_contract_invalid_${field}`);
}

function trimRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    fail(field);
  }

  const normalized = value.trim();

  if (!normalized) {
    fail(field);
  }

  return normalized;
}

export function requireLiveCommandKind(value: unknown) {
  const kind = trimRequiredString(value, "kind");

  if (!LIVE_COMMAND_KINDS.has(kind)) {
    fail("kind");
  }

  return kind as "event_strategy" | "xhs_script" | "risk_watch";
}

export function requireLiveAssetKind(value: unknown) {
  const kind = trimRequiredString(value, "asset_kind");

  if (!LIVE_ASSET_KINDS.has(kind)) {
    fail("asset_kind");
  }

  return kind as "internal_sync" | "client_update" | "publish_copy";
}

export function requireLiveText(value: unknown, field: string) {
  return trimRequiredString(value, field);
}

export function requireLiveStringArray(value: unknown, field: string, minItems = 1, maxItems = 4) {
  if (!Array.isArray(value)) {
    fail(field);
  }

  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, maxItems);

  if (items.length < minItems) {
    fail(field);
  }

  return items;
}

export function requireLiveTaskArray(value: unknown, field: string, minItems = 1, maxItems = 4) {
  if (!Array.isArray(value)) {
    fail(field);
  }

  const items = value
    .map<LiveTaskShape | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<LiveTaskShape>;
      const title = candidate.title?.trim();
      const note = candidate.note?.trim();

      if (!title || !note) {
        return null;
      }

      return {
        title,
        note,
        tag: candidate.tag?.trim() || undefined
      };
    })
    .filter((item): item is LiveTaskShape => item !== null)
    .slice(0, maxItems);

  if (items.length < minItems) {
    fail(field);
  }

  return items;
}

export function requireLiveSectionArray(value: unknown, field: string, minItems = 1, maxItems = 4) {
  if (!Array.isArray(value)) {
    fail(field);
  }

  const items = value
    .map<LiveSectionShape | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<LiveSectionShape>;
      const title = candidate.title?.trim();
      const content = candidate.content?.trim();

      if (!title || !content) {
        return null;
      }

      return { title, content };
    })
    .filter((item): item is LiveSectionShape => item !== null)
    .slice(0, maxItems);

  if (items.length < minItems) {
    fail(field);
  }

  return items;
}

export function requireLiveWatchlistSuggestions(value: unknown, field: string, minItems = 1, maxItems = 4) {
  if (!Array.isArray(value)) {
    fail(field);
  }

  const items = value
    .map<LiveWatchlistSuggestionShape | null>((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const candidate = item as Partial<LiveWatchlistSuggestionShape>;
      const keyword = candidate.keyword?.trim();
      const reason = candidate.reason?.trim();
      const type = candidate.type;
      const priority = candidate.priority;

      if (
        !keyword ||
        !reason ||
        !type ||
        !priority ||
        !LIVE_WATCHLIST_TYPES.has(type) ||
        !LIVE_PRIORITIES.has(priority)
      ) {
        return null;
      }

      return {
        keyword,
        type,
        priority,
        reason
      };
    })
    .filter((item): item is LiveWatchlistSuggestionShape => item !== null)
    .slice(0, maxItems);

  if (items.length < minItems) {
    fail(field);
  }

  return items;
}

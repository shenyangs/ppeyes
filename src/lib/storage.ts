import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type WatchlistPriority = "高" | "中" | "低";

export type StoredWatchlistTerm = {
  id: string;
  type: "品牌词" | "竞品词" | "行业词" | "风险词";
  keyword: string;
  priority: WatchlistPriority;
  alerts: boolean;
  createdAt: string;
};

export type OpportunityStatus = "新入池" | "已选题" | "推进中" | "已归档";

export type StoredOpportunity = {
  id: string;
  eventId: string;
  title: string;
  timing: string;
  format: string;
  note: string;
  status: OpportunityStatus;
  createdAt: string;
};

type AppState = {
  watchlistTerms: StoredWatchlistTerm[];
  savedOpportunities: StoredOpportunity[];
};

const dataDir = path.join(process.cwd(), "data");
const statePath = path.join(dataDir, "app-state.json");

const seedState: AppState = {
  watchlistTerms: [
    { id: randomUUID(), type: "品牌词", keyword: "品牌名", priority: "高", alerts: true, createdAt: "2026-03-22T09:00:00+08:00" },
    { id: randomUUID(), type: "品牌词", keyword: "产品名", priority: "高", alerts: true, createdAt: "2026-03-22T09:00:00+08:00" },
    { id: randomUUID(), type: "品牌词", keyword: "代言人", priority: "中", alerts: true, createdAt: "2026-03-22T09:00:00+08:00" },
    { id: randomUUID(), type: "竞品词", keyword: "头部竞品A", priority: "高", alerts: true, createdAt: "2026-03-22T09:05:00+08:00" },
    { id: randomUUID(), type: "竞品词", keyword: "联名新品", priority: "中", alerts: false, createdAt: "2026-03-22T09:05:00+08:00" },
    { id: randomUUID(), type: "行业词", keyword: "通勤场景", priority: "中", alerts: false, createdAt: "2026-03-22T09:10:00+08:00" },
    { id: randomUUID(), type: "行业词", keyword: "午后困意", priority: "高", alerts: true, createdAt: "2026-03-22T09:10:00+08:00" },
    { id: randomUUID(), type: "行业词", keyword: "防晒补涂", priority: "中", alerts: true, createdAt: "2026-03-22T09:10:00+08:00" },
    { id: randomUUID(), type: "风险词", keyword: "投诉", priority: "高", alerts: true, createdAt: "2026-03-22T09:15:00+08:00" },
    { id: randomUUID(), type: "风险词", keyword: "翻车", priority: "高", alerts: true, createdAt: "2026-03-22T09:15:00+08:00" },
    { id: randomUUID(), type: "风险词", keyword: "维权", priority: "高", alerts: true, createdAt: "2026-03-22T09:15:00+08:00" }
  ],
  savedOpportunities: [
    {
      id: randomUUID(),
      eventId: "2",
      title: "某头部竞品联名包装被热议，评论区聚焦设计审美与价格感知",
      timing: "24 小时内",
      format: "内部策略复盘",
      note: "适合作为策略输入，不建议直接对外跟进。",
      status: "已选题",
      createdAt: "2026-03-22T10:30:00+08:00"
    }
  ]
};

async function ensureStateFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(statePath);
  } catch {
    await fs.writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");
  }
}

async function readState(): Promise<AppState> {
  await ensureStateFile();
  const content = await fs.readFile(statePath, "utf8");
  return JSON.parse(content) as AppState;
}

async function writeState(state: AppState) {
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

export async function getState() {
  return readState();
}

export async function addWatchlistTerm(input: {
  type: StoredWatchlistTerm["type"];
  keyword: string;
  priority: WatchlistPriority;
  alerts?: boolean;
}) {
  const state = await readState();
  const keyword = input.keyword.trim();

  if (!keyword) {
    throw new Error("keyword_required");
  }

  const exists = state.watchlistTerms.some(
    (item) => item.type === input.type && item.keyword.toLowerCase() === keyword.toLowerCase()
  );

  if (exists) {
    throw new Error("keyword_exists");
  }

  const term: StoredWatchlistTerm = {
    id: randomUUID(),
    type: input.type,
    keyword,
    priority: input.priority,
    alerts: input.alerts ?? true,
    createdAt: new Date().toISOString()
  };

  state.watchlistTerms.unshift(term);
  await writeState(state);
  return term;
}

export async function saveOpportunity(input: {
  eventId: string;
  title: string;
  timing: string;
  format: string;
  note: string;
}) {
  const state = await readState();
  const existing = state.savedOpportunities.find((item) => item.eventId === input.eventId);

  if (existing) {
    return existing;
  }

  const opportunity: StoredOpportunity = {
    id: randomUUID(),
    eventId: input.eventId,
    title: input.title,
    timing: input.timing,
    format: input.format,
    note: input.note,
    status: "新入池",
    createdAt: new Date().toISOString()
  };

  state.savedOpportunities.unshift(opportunity);
  await writeState(state);
  return opportunity;
}

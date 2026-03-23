import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

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

export type StoredBriefing = {
  id: string;
  title: string;
  type: string;
  note: string;
  content: string;
  createdAt: string;
};

type AppState = {
  watchlistTerms: StoredWatchlistTerm[];
  savedOpportunities: StoredOpportunity[];
  savedBriefings: StoredBriefing[];
};

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  watchlistsTable: string;
  opportunitiesTable: string;
};

type SupabaseWatchlistRow = {
  id: string;
  type: StoredWatchlistTerm["type"];
  keyword: string;
  keyword_normalized: string;
  priority: WatchlistPriority;
  alerts: boolean;
  created_at: string;
};

type SupabaseOpportunityRow = {
  id: string;
  event_id: string;
  title: string;
  timing: string;
  format: string;
  note: string;
  status: OpportunityStatus;
  created_at: string;
};

const dataDir = path.join(process.cwd(), "data");
const statePath = path.join(dataDir, "app-state.json");

const seedWatchlistTerms: StoredWatchlistTerm[] = [
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c01", type: "品牌词", keyword: "品牌名", priority: "高", alerts: true, createdAt: "2026-03-22T09:00:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c02", type: "品牌词", keyword: "产品名", priority: "高", alerts: true, createdAt: "2026-03-22T09:00:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c03", type: "品牌词", keyword: "代言人", priority: "中", alerts: true, createdAt: "2026-03-22T09:00:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c04", type: "竞品词", keyword: "头部竞品A", priority: "高", alerts: true, createdAt: "2026-03-22T09:05:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c05", type: "竞品词", keyword: "联名新品", priority: "中", alerts: false, createdAt: "2026-03-22T09:05:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c06", type: "行业词", keyword: "通勤场景", priority: "中", alerts: false, createdAt: "2026-03-22T09:10:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c07", type: "行业词", keyword: "午后困意", priority: "高", alerts: true, createdAt: "2026-03-22T09:10:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c08", type: "行业词", keyword: "防晒补涂", priority: "中", alerts: true, createdAt: "2026-03-22T09:10:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c09", type: "风险词", keyword: "投诉", priority: "高", alerts: true, createdAt: "2026-03-22T09:15:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c10", type: "风险词", keyword: "翻车", priority: "高", alerts: true, createdAt: "2026-03-22T09:15:00+08:00" },
  { id: "8f2b5199-f79a-45a1-9b2f-2de7f2d77c11", type: "风险词", keyword: "维权", priority: "高", alerts: true, createdAt: "2026-03-22T09:15:00+08:00" }
];

const seedOpportunities: StoredOpportunity[] = [
  {
    id: "9c3f0434-4ec6-4101-97be-b5eb8df65401",
    eventId: "2",
    title: "某头部竞品联名包装被热议，评论区聚焦设计审美与价格感知",
    timing: "24 小时内",
    format: "内部策略复盘",
    note: "适合作为策略输入，不建议直接对外跟进。",
    status: "已选题",
    createdAt: "2026-03-22T10:30:00+08:00"
  }
];

const seedState: AppState = {
  watchlistTerms: seedWatchlistTerms,
  savedOpportunities: seedOpportunities,
  savedBriefings: [
    {
      id: "76a57b1a-f9f8-4e64-b3d0-5a6c0a208001",
      title: "03.22 晨报：今日品牌热点优先级",
      type: "晨报",
      note: "包含 8 条高价值机会和 2 条风险提醒。",
      content: "今日优先看办公室提神、竞品联名和代言人舆情三类事件。",
      createdAt: "2026-03-22T09:30:00+08:00"
    }
  ]
};

const supabaseConfig = getSupabaseConfig();
let seedPromise: Promise<void> | null = null;

function getSupabaseConfig(): SupabaseConfig | null {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    serviceRoleKey,
    watchlistsTable: process.env.SUPABASE_WATCHLISTS_TABLE?.trim() || "ppeyes_watchlist_terms",
    opportunitiesTable:
      process.env.SUPABASE_OPPORTUNITIES_TABLE?.trim() || "ppeyes_saved_opportunities"
  };
}

function normalizeKeyword(keyword: string) {
  return keyword.trim().toLowerCase();
}

function mapWatchlistRow(row: SupabaseWatchlistRow): StoredWatchlistTerm {
  return {
    id: row.id,
    type: row.type,
    keyword: row.keyword,
    priority: row.priority,
    alerts: row.alerts,
    createdAt: row.created_at
  };
}

function mapOpportunityRow(row: SupabaseOpportunityRow): StoredOpportunity {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    timing: row.timing,
    format: row.format,
    note: row.note,
    status: row.status,
    createdAt: row.created_at
  };
}

function toWatchlistRow(item: StoredWatchlistTerm): SupabaseWatchlistRow {
  return {
    id: item.id,
    type: item.type,
    keyword: item.keyword,
    keyword_normalized: normalizeKeyword(item.keyword),
    priority: item.priority,
    alerts: item.alerts,
    created_at: item.createdAt
  };
}

function toOpportunityRow(item: StoredOpportunity): SupabaseOpportunityRow {
  return {
    id: item.id,
    event_id: item.eventId,
    title: item.title,
    timing: item.timing,
    format: item.format,
    note: item.note,
    status: item.status,
    created_at: item.createdAt
  };
}

async function supabaseRequest<T>({
  table,
  method = "GET",
  query = {},
  body,
  prefer
}: {
  table: string;
  method?: "GET" | "POST";
  query?: Record<string, string>;
  body?: unknown;
  prefer?: string;
}): Promise<T> {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  const url = new URL(`/rest/v1/${table}`, supabaseConfig.url);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseConfig.serviceRoleKey,
      Authorization: `Bearer ${supabaseConfig.serviceRoleKey}`,
      ...(prefer ? { Prefer: prefer } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      if (!response.ok) {
        throw new Error(`supabase_invalid_json_${response.status}`);
      }
    }
  }

  if (!response.ok) {
    if (payload && typeof payload === "object" && "message" in payload) {
      throw new Error(String(payload.message));
    }

    throw new Error(`supabase_error_${response.status}`);
  }

  return payload as T;
}

async function ensureSupabaseSeedData() {
  if (!supabaseConfig) {
    return;
  }

  if (!seedPromise) {
    seedPromise = (async () => {
      const watchlistProbe = await supabaseRequest<SupabaseWatchlistRow[]>({
        table: supabaseConfig.watchlistsTable,
        query: {
          select: "id",
          limit: "1"
        }
      });

      if (watchlistProbe.length === 0) {
        await supabaseRequest<SupabaseWatchlistRow[]>({
          table: supabaseConfig.watchlistsTable,
          method: "POST",
          prefer: "return=representation",
          body: seedState.watchlistTerms.map(toWatchlistRow)
        });
      }

      const opportunitiesProbe = await supabaseRequest<SupabaseOpportunityRow[]>({
        table: supabaseConfig.opportunitiesTable,
        query: {
          select: "id",
          limit: "1"
        }
      });

      if (opportunitiesProbe.length === 0) {
        await supabaseRequest<SupabaseOpportunityRow[]>({
          table: supabaseConfig.opportunitiesTable,
          method: "POST",
          prefer: "return=representation",
          body: seedState.savedOpportunities.map(toOpportunityRow)
        });
      }
    })().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }

  await seedPromise;
}

async function ensureSupabaseWatchlistsSeedData() {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  const watchlistProbe = await supabaseRequest<SupabaseWatchlistRow[]>({
    table: supabaseConfig.watchlistsTable,
    query: {
      select: "id",
      limit: "1"
    }
  });

  if (watchlistProbe.length === 0) {
    await supabaseRequest<SupabaseWatchlistRow[]>({
      table: supabaseConfig.watchlistsTable,
      method: "POST",
      prefer: "return=representation",
      body: seedState.watchlistTerms.map(toWatchlistRow)
    });
  }
}

async function ensureSupabaseOpportunitiesSeedData() {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  const opportunitiesProbe = await supabaseRequest<SupabaseOpportunityRow[]>({
    table: supabaseConfig.opportunitiesTable,
    query: {
      select: "id",
      limit: "1"
    }
  });

  if (opportunitiesProbe.length === 0) {
    await supabaseRequest<SupabaseOpportunityRow[]>({
      table: supabaseConfig.opportunitiesTable,
      method: "POST",
      prefer: "return=representation",
      body: seedState.savedOpportunities.map(toOpportunityRow)
    });
  }
}

async function readWatchlistTermsFromSupabase(): Promise<StoredWatchlistTerm[]> {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  await ensureSupabaseWatchlistsSeedData();

  const watchlists = await supabaseRequest<SupabaseWatchlistRow[]>({
    table: supabaseConfig.watchlistsTable,
    query: {
      select: "*",
      order: "created_at.desc"
    }
  });

  return watchlists.map(mapWatchlistRow);
}

async function readSavedOpportunitiesFromSupabase(): Promise<StoredOpportunity[]> {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  await ensureSupabaseOpportunitiesSeedData();

  const opportunities = await supabaseRequest<SupabaseOpportunityRow[]>({
    table: supabaseConfig.opportunitiesTable,
    query: {
      select: "*",
      order: "created_at.desc"
    }
  });

  return opportunities.map(mapOpportunityRow);
}

async function readStateFromSupabase(): Promise<AppState> {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  await ensureSupabaseSeedData();

  const [watchlistTerms, savedOpportunities, fileState] = await Promise.all([
    readWatchlistTermsFromSupabase(),
    readSavedOpportunitiesFromSupabase(),
    readStateFromFile()
  ]);

  return {
    watchlistTerms,
    savedOpportunities,
    savedBriefings: fileState.savedBriefings
  };
}

async function addWatchlistTermToSupabase(input: {
  type: StoredWatchlistTerm["type"];
  keyword: string;
  priority: WatchlistPriority;
  alerts?: boolean;
}) {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  await ensureSupabaseSeedData();

  const keyword = input.keyword.trim();
  if (!keyword) {
    throw new Error("keyword_required");
  }

  const normalized = normalizeKeyword(keyword);
  const exists = await supabaseRequest<SupabaseWatchlistRow[]>({
    table: supabaseConfig.watchlistsTable,
    query: {
      select: "id",
      type: `eq.${input.type}`,
      keyword_normalized: `eq.${normalized}`,
      limit: "1"
    }
  });

  if (exists.length > 0) {
    throw new Error("keyword_exists");
  }

  const payload: SupabaseWatchlistRow = {
    id: randomUUID(),
    type: input.type,
    keyword,
    keyword_normalized: normalized,
    priority: input.priority,
    alerts: input.alerts ?? true,
    created_at: new Date().toISOString()
  };

  const inserted = await supabaseRequest<SupabaseWatchlistRow[]>({
    table: supabaseConfig.watchlistsTable,
    method: "POST",
    prefer: "return=representation",
    body: [payload]
  });

  return mapWatchlistRow(inserted[0]);
}

async function saveOpportunityToSupabase(input: {
  eventId: string;
  title: string;
  timing: string;
  format: string;
  note: string;
}) {
  if (!supabaseConfig) {
    throw new Error("supabase_not_configured");
  }

  await ensureSupabaseSeedData();

  const existing = await supabaseRequest<SupabaseOpportunityRow[]>({
    table: supabaseConfig.opportunitiesTable,
    query: {
      select: "*",
      event_id: `eq.${input.eventId}`,
      limit: "1"
    }
  });

  if (existing.length > 0) {
    return mapOpportunityRow(existing[0]);
  }

  const payload: SupabaseOpportunityRow = {
    id: randomUUID(),
    event_id: input.eventId,
    title: input.title,
    timing: input.timing,
    format: input.format,
    note: input.note,
    status: "新入池",
    created_at: new Date().toISOString()
  };

  const inserted = await supabaseRequest<SupabaseOpportunityRow[]>({
    table: supabaseConfig.opportunitiesTable,
    method: "POST",
    prefer: "return=representation",
    body: [payload]
  });

  return mapOpportunityRow(inserted[0]);
}

async function ensureStateFile() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(statePath);
  } catch {
    await fs.writeFile(statePath, JSON.stringify(seedState, null, 2), "utf8");
  }
}

async function readStateFromFile(): Promise<AppState> {
  await ensureStateFile();
  const content = await fs.readFile(statePath, "utf8");
  const parsed = JSON.parse(content) as Partial<AppState>;

  return {
    watchlistTerms: parsed.watchlistTerms || seedState.watchlistTerms,
    savedOpportunities: parsed.savedOpportunities || seedState.savedOpportunities,
    savedBriefings: parsed.savedBriefings || seedState.savedBriefings
  };
}

async function writeStateToFile(state: AppState) {
  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

async function addWatchlistTermToFile(input: {
  type: StoredWatchlistTerm["type"];
  keyword: string;
  priority: WatchlistPriority;
  alerts?: boolean;
}) {
  const state = await readStateFromFile();
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
  await writeStateToFile(state);
  return term;
}

async function saveOpportunityToFile(input: {
  eventId: string;
  title: string;
  timing: string;
  format: string;
  note: string;
}) {
  const state = await readStateFromFile();
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
  await writeStateToFile(state);
  return opportunity;
}

async function saveBriefingToFile(input: {
  title: string;
  type: string;
  note: string;
  content: string;
}) {
  const state = await readStateFromFile();
  const title = input.title.trim();

  if (!title) {
    throw new Error("briefing_title_required");
  }

  const existing = state.savedBriefings.find((item) => item.title === title);

  if (existing) {
    return existing;
  }

  const briefing: StoredBriefing = {
    id: randomUUID(),
    title,
    type: input.type.trim() || "AI 简报",
    note: input.note.trim(),
    content: input.content.trim(),
    createdAt: new Date().toISOString()
  };

  state.savedBriefings.unshift(briefing);
  await writeStateToFile(state);
  return briefing;
}

function shouldUseSupabaseStorage() {
  return Boolean(supabaseConfig);
}

export async function getState() {
  if (shouldUseSupabaseStorage()) {
    return readStateFromSupabase();
  }

  return readStateFromFile();
}

export async function getWatchlistTerms() {
  if (!shouldUseSupabaseStorage()) {
    return (await readStateFromFile()).watchlistTerms;
  }

  try {
    return await readWatchlistTermsFromSupabase();
  } catch (error) {
    console.warn("[storage] watchlists read failed, falling back to file storage:", error);
    return (await readStateFromFile()).watchlistTerms;
  }
}

export async function getSavedOpportunities() {
  if (!shouldUseSupabaseStorage()) {
    return (await readStateFromFile()).savedOpportunities;
  }

  try {
    return await readSavedOpportunitiesFromSupabase();
  } catch (error) {
    console.warn("[storage] opportunities read failed, falling back to file storage:", error);
    return (await readStateFromFile()).savedOpportunities;
  }
}

export async function getSavedBriefings() {
  return (await readStateFromFile()).savedBriefings;
}

export async function addWatchlistTerm(input: {
  type: StoredWatchlistTerm["type"];
  keyword: string;
  priority: WatchlistPriority;
  alerts?: boolean;
}) {
  if (shouldUseSupabaseStorage()) {
    return addWatchlistTermToSupabase(input);
  }

  return addWatchlistTermToFile(input);
}

export async function saveOpportunity(input: {
  eventId: string;
  title: string;
  timing: string;
  format: string;
  note: string;
}) {
  if (shouldUseSupabaseStorage()) {
    return saveOpportunityToSupabase(input);
  }

  return saveOpportunityToFile(input);
}

export async function saveBriefing(input: {
  title: string;
  type: string;
  note: string;
  content: string;
}) {
  return saveBriefingToFile(input);
}

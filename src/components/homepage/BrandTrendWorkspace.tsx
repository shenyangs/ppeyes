"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AiCommandCenter } from "@/components/ai/AiCommandCenter";
import { AiNativePanel } from "@/components/ai/AiNativePanel";
import { BrandLensComposer } from "@/components/homepage/BrandLensComposer";
import type { EventAnalysis } from "@/lib/analysis";
import { emptyBrandProfile, normalizeBrandProfile, type BrandProfile } from "@/lib/brand";
import { EventFeed } from "@/components/homepage/EventFeed";
import { FilterRail } from "@/components/homepage/FilterRail";
import { InsightPanel } from "@/components/homepage/InsightPanel";
import { SummaryMetrics } from "@/components/homepage/SummaryMetrics";
import { TopBar } from "@/components/homepage/TopBar";
import { AppShell } from "@/components/layout/AppShell";
import { fetchJson } from "@/lib/api";
import {
  filterOptions,
  type MetricKey,
  type SortMode,
  type TimeFilter,
  type WatchlistType
} from "@/lib/homepage-data";
import type { WorkspaceNativeAiDigest } from "@/lib/native-ai";
import { buildWorkspacePayload, type WorkspaceEvent, type WorkspacePayload, type WorkspaceQuery } from "@/lib/page-data";

const legacyDefaultPlatforms = ["微博", "抖音", "小红书"];
const progressivePlatformDefaults = ["微博", "抖音", "B 站", "知乎", "百度"];
const mobileInsightBreakpoint = 1200;

function isLegacyPlatformSelection(platforms: string[]) {
  return platforms.length === legacyDefaultPlatforms.length && platforms.every((platform) => legacyDefaultPlatforms.includes(platform));
}

function normalizeEventTitle(title: string) {
  return title.replace(/\s+/g, "").trim();
}

function getEventSelectionKey(event: Pick<WorkspaceEvent, "id" | "title">) {
  return normalizeEventTitle(event.title) || event.id;
}

function mergeWorkspaceEvents(current: WorkspaceEvent[], incoming: WorkspaceEvent[]) {
  const merged = new Map<string, WorkspaceEvent>();

  [...current, ...incoming].forEach((event) => {
    const key = normalizeEventTitle(event.title) || event.id;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, event);
      return;
    }

    const existingScore = existing.brandView?.score || existing.opportunity || 0;
    const nextScore = event.brandView?.score || event.opportunity || 0;

    if (nextScore >= existingScore) {
      merged.set(key, event);
    }
  });

  return Array.from(merged.values());
}

export function BrandTrendWorkspace() {
  const workspaceGridRef = useRef<HTMLElement | null>(null);
  const feedPanelRef = useRef<HTMLElement | null>(null);
  const insightRailRef = useRef<HTMLDivElement | null>(null);
  const insightPanelRef = useRef<HTMLElement | null>(null);
  const [insightPanelTop, setInsightPanelTop] = useState(20);
  const [insightRailHeight, setInsightRailHeight] = useState<number | null>(null);
  const [workspace, setWorkspace] = useState<WorkspacePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [analysis, setAnalysis] = useState<EventAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [brandDraft, setBrandDraft] = useState<BrandProfile>(emptyBrandProfile);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [isAutofillingBrand, setIsAutofillingBrand] = useState(false);
  const [brandAutofillError, setBrandAutofillError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("全部");
  const [industryFilter, setIndustryFilter] = useState("全部");
  const [riskFilter, setRiskFilter] = useState<"全部" | "低" | "中" | "高">("全部");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(progressivePlatformDefaults);
  const [selectedWatchlists, setSelectedWatchlists] = useState<WatchlistType[]>([
    "品牌词",
    "竞品词",
    "行业词"
  ]);
  const [sortMode, setSortMode] = useState<SortMode>("opportunity");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("all");
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [isMobileInsightLayout, setIsMobileInsightLayout] = useState(false);
  const [isMobileInsightOpen, setIsMobileInsightOpen] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<{ loaded: number; total: number; stage: string } | null>(null);
  const [analysisEventKey, setAnalysisEventKey] = useState<string | null>(null);
  const [workspaceDigest, setWorkspaceDigest] = useState<WorkspaceNativeAiDigest | null>(null);
  const [isWorkspaceDigestLoading, setIsWorkspaceDigestLoading] = useState(false);
  const [workspaceDigestError, setWorkspaceDigestError] = useState<string | null>(null);
  const [workspaceDigestWarning, setWorkspaceDigestWarning] = useState<string | null>(null);
  const [queuedCommandPrompt, setQueuedCommandPrompt] = useState<string | null>(null);
  const analysisRequestRef = useRef(0);
  const workspaceRequestRef = useRef(0);
  const selectedEventKeyRef = useRef<string | null>(null);

  useEffect(() => {
    selectedEventKeyRef.current = selectedEventKey;
  }, [selectedEventKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const interval = window.setInterval(() => {
      setRefreshToken((current) => current + 1);
    }, 1000 * 60 * 5);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(`(max-width: ${mobileInsightBreakpoint}px)`);
    const updateLayout = () => {
      setIsMobileInsightLayout(mediaQuery.matches);
      if (!mediaQuery.matches) {
        setIsMobileInsightOpen(false);
      }
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isMobileInsightLayout || !isMobileInsightOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileInsightLayout, isMobileInsightOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = workspaceRequestRef.current + 1;
    workspaceRequestRef.current = requestId;
    const shouldHydrateProgressivePlatforms = selectedPlatforms.length === 0 || isLegacyPlatformSelection(selectedPlatforms);
    const requestedPlatforms = shouldHydrateProgressivePlatforms ? progressivePlatformDefaults : selectedPlatforms;
    const baseQuery: WorkspaceQuery = {
      q: query.trim() || undefined,
      time: timeFilter !== "全部" ? timeFilter : undefined,
      industry: industryFilter !== "全部" ? industryFilter : undefined,
      risk: riskFilter !== "全部" ? riskFilter : undefined,
      metric: activeMetric !== "all" ? activeMetric : undefined,
      sort: sortMode !== "opportunity" ? sortMode : undefined,
      platforms: requestedPlatforms,
      watchlists: selectedWatchlists.length > 0 ? selectedWatchlists : undefined,
      brandProfile: brandProfile || undefined
    };

    setIsLoading(true);
    setError(null);
    setLoadingProgress({
      loaded: 0,
      total: requestedPlatforms.length,
      stage: "正在分批拉取热点..."
    });

    let mergedEvents: WorkspaceEvent[] = [];
    let latestFetchedAt = new Date(0).toISOString();
    let loadedCount = 0;
    let successCount = 0;

    const buildParams = (platform: string, deferAi: boolean) => {
      const params = new URLSearchParams();
      if (baseQuery.q) params.set("q", baseQuery.q);
      if (baseQuery.time) params.set("time", baseQuery.time);
      if (baseQuery.industry) params.set("industry", baseQuery.industry);
      if (baseQuery.risk) params.set("risk", baseQuery.risk);
      if (baseQuery.sort) params.set("sort", baseQuery.sort);
      if (baseQuery.metric) params.set("metric", baseQuery.metric);
      params.set("platforms", platform);
      if (baseQuery.watchlists?.length) params.set("watchlists", baseQuery.watchlists.join(","));
      if (baseQuery.brandProfile) {
        if (baseQuery.brandProfile.name) params.set("brandName", baseQuery.brandProfile.name);
        if (baseQuery.brandProfile.product) params.set("brandProduct", baseQuery.brandProfile.product);
        if (baseQuery.brandProfile.brief) params.set("brandBrief", baseQuery.brandProfile.brief);
        if (baseQuery.brandProfile.capabilities) params.set("brandCapabilities", baseQuery.brandProfile.capabilities);
        if (baseQuery.brandProfile.objective) params.set("brandObjective", baseQuery.brandProfile.objective);
        if (baseQuery.brandProfile.guardrails) params.set("brandGuardrails", baseQuery.brandProfile.guardrails);
      }
      if (deferAi) params.set("deferAi", "1");
      return params;
    };

    const buildMergedParams = (deferAi: boolean) => {
      const params = new URLSearchParams();
      if (baseQuery.q) params.set("q", baseQuery.q);
      if (baseQuery.time) params.set("time", baseQuery.time);
      if (baseQuery.industry) params.set("industry", baseQuery.industry);
      if (baseQuery.risk) params.set("risk", baseQuery.risk);
      if (baseQuery.sort) params.set("sort", baseQuery.sort);
      if (baseQuery.metric) params.set("metric", baseQuery.metric);
      params.set("platforms", requestedPlatforms.join(","));
      if (baseQuery.watchlists?.length) params.set("watchlists", baseQuery.watchlists.join(","));
      if (baseQuery.brandProfile) {
        if (baseQuery.brandProfile.name) params.set("brandName", baseQuery.brandProfile.name);
        if (baseQuery.brandProfile.product) params.set("brandProduct", baseQuery.brandProfile.product);
        if (baseQuery.brandProfile.brief) params.set("brandBrief", baseQuery.brandProfile.brief);
        if (baseQuery.brandProfile.capabilities) params.set("brandCapabilities", baseQuery.brandProfile.capabilities);
        if (baseQuery.brandProfile.objective) params.set("brandObjective", baseQuery.brandProfile.objective);
        if (baseQuery.brandProfile.guardrails) params.set("brandGuardrails", baseQuery.brandProfile.guardrails);
      }
      if (deferAi) params.set("deferAi", "1");
      return params;
    };

    const partialRequests = requestedPlatforms.map(async (platform) => {
      try {
        const payload = await fetchJson<WorkspacePayload>(
          `/api/workspace?${buildParams(platform, true).toString()}`,
          controller.signal
        );

        if (controller.signal.aborted || requestId !== workspaceRequestRef.current) {
          return;
        }

        successCount += 1;
        loadedCount += 1;
        mergedEvents = mergeWorkspaceEvents(mergedEvents, payload.events);
        if (payload.fetchedAt > latestFetchedAt) {
          latestFetchedAt = payload.fetchedAt;
        }

        const savedIds = mergedEvents.filter((event) => event.saved).map((event) => event.id);
        const nextWorkspace = buildWorkspacePayload(
          baseQuery,
          savedIds,
          mergedEvents,
          "live",
          latestFetchedAt === new Date(0).toISOString() ? new Date().toISOString() : latestFetchedAt
        );

        setWorkspace({
          ...nextWorkspace,
          availablePlatforms: requestedPlatforms
        });
        setSelectedEventKey((current) =>
          current || (nextWorkspace.events[0] ? getEventSelectionKey(nextWorkspace.events[0]) : null)
        );
        setLoadingProgress({
          loaded: loadedCount,
          total: requestedPlatforms.length,
          stage:
            loadedCount < requestedPlatforms.length ? "正在继续补充更多平台..." : "正在整理完整排序..."
        });
      } catch {
        if (controller.signal.aborted || requestId !== workspaceRequestRef.current) {
          return;
        }

        loadedCount += 1;
        setLoadingProgress({
          loaded: loadedCount,
          total: requestedPlatforms.length,
          stage:
            loadedCount < requestedPlatforms.length ? "部分平台仍在拉取..." : "正在整理完整排序..."
        });
      }
    });

    Promise.allSettled(partialRequests)
      .then(async () => {
        if (controller.signal.aborted || requestId !== workspaceRequestRef.current) {
          return;
        }

        if (successCount === 0) {
          try {
            const rescuePayload = await fetchJson<WorkspacePayload>(
              `/api/workspace?${buildMergedParams(true).toString()}`,
              controller.signal
            );

            if (controller.signal.aborted || requestId !== workspaceRequestRef.current) {
              return;
            }

            successCount = 1;
            mergedEvents = mergeWorkspaceEvents(mergedEvents, rescuePayload.events);
            if (rescuePayload.fetchedAt > latestFetchedAt) {
              latestFetchedAt = rescuePayload.fetchedAt;
            }

            setWorkspace(rescuePayload);
            setSelectedEventKey((current) =>
              current || (rescuePayload.events[0] ? getEventSelectionKey(rescuePayload.events[0]) : null)
            );
          } catch {
            throw new Error("工作台数据加载失败");
          }
        }

        setLoadingProgress({
          loaded: requestedPlatforms.length,
          total: requestedPlatforms.length,
          stage: brandProfile ? "正在用品牌视角做最终排序..." : "已完成拉取"
        });

        if (!brandProfile) {
          setLoadingProgress(null);
          setIsLoading(false);
          return;
        }

        try {
          const finalPayload = await fetchJson<WorkspacePayload>(
            `/api/workspace?${buildMergedParams(false).toString()}`,
            controller.signal
          );

          if (controller.signal.aborted || requestId !== workspaceRequestRef.current) {
            return;
          }

          setWorkspace(finalPayload);
          setSelectedEventKey((current) =>
            current || (finalPayload.events[0] ? getEventSelectionKey(finalPayload.events[0]) : null)
          );
        } catch {}

        setLoadingProgress(null);
        setIsLoading(false);
      })
      .catch((requestError: Error) => {
        if (controller.signal.aborted || requestId !== workspaceRequestRef.current) {
          return;
        }

        setError(requestError.message);
        setIsLoading(false);
        setLoadingProgress(null);
      });

    return () => controller.abort();
  }, [
    activeMetric,
    brandProfile,
    industryFilter,
    query,
    refreshToken,
    riskFilter,
    selectedPlatforms,
    selectedWatchlists,
    sortMode,
    timeFilter
  ]);

  const filteredEvents = workspace?.events ?? [];
  const platformOptions = workspace?.availablePlatforms?.length ? workspace.availablePlatforms : filterOptions.platform;

  const selectedEvent = useMemo(
    () =>
      filteredEvents.find((event) => getEventSelectionKey(event) === selectedEventKey) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedEventKey]
  );

  const metricCards = workspace?.metrics ?? [];

  useEffect(() => {
    const nextSelectedKey = selectedEvent ? getEventSelectionKey(selectedEvent) : null;

    if (!selectedEvent) {
      selectedEventKeyRef.current = null;
      setSelectedEventKey(null);
      setAnalysis(null);
      setAnalysisEventKey(null);
      setAnalysisError(null);
      return;
    }

    if (!selectedEventKey) {
      setSelectedEventKey(nextSelectedKey);
      return;
    }

    if (nextSelectedKey !== selectedEventKey) {
      setSelectedEventKey(nextSelectedKey);
      setAnalysis(null);
      setAnalysisEventKey(null);
      setAnalysisError(null);
    }
  }, [selectedEvent, selectedEventKey]);

  useEffect(() => {
    if (!workspace?.availablePlatforms?.length) return;

    const availablePlatforms = workspace.availablePlatforms;
    const hasOnlyLegacyDefaults = isLegacyPlatformSelection(selectedPlatforms);

    if (hasOnlyLegacyDefaults) {
      setSelectedPlatforms(availablePlatforms);
      return;
    }

    const normalizedSelection = selectedPlatforms.filter((platform) => availablePlatforms.includes(platform));

    if (normalizedSelection.length !== selectedPlatforms.length) {
      setSelectedPlatforms(normalizedSelection);
    }
  }, [selectedPlatforms, workspace?.availablePlatforms]);

  useEffect(() => {
    if (!workspace) {
      setWorkspaceDigest(null);
      setWorkspaceDigestError(null);
      setWorkspaceDigestWarning(null);
      return;
    }

    const controller = new AbortController();
    setIsWorkspaceDigestLoading(true);
    setWorkspaceDigestError(null);
    setWorkspaceDigestWarning(null);

    fetch("/api/copilot/workspace", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        workspace
      }),
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI 工作台接管失败");
        }

        const payload = (await response.json()) as {
          digest?: WorkspaceNativeAiDigest;
          warning?: string;
        };

        if (controller.signal.aborted) {
          return;
        }

        if (!payload.digest) {
          throw new Error("没有拿到 AI 工作台结果");
        }

        setWorkspaceDigest(payload.digest);

        if (payload.warning === "live_digest_failed") {
          setWorkspaceDigestWarning("本次显示的是系统兜底判断，MiniMax 实时返回失败。");
        }
      })
      .catch((requestError: Error) => {
        if (controller.signal.aborted) return;
        setWorkspaceDigestError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsWorkspaceDigestLoading(false);
        }
      });

    return () => controller.abort();
  }, [workspace]);

  useEffect(() => {
    const saved = window.localStorage.getItem("brandtrend-brand-profile");
    if (!saved) return;

    try {
      const parsed = normalizeBrandProfile(JSON.parse(saved));
      if (parsed) {
        setBrandProfile(parsed);
        setBrandDraft(parsed);
        setSortMode("brand");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!feedPanelRef.current) return;

    const syncHeight = () => {
      if (!feedPanelRef.current) return;
      setInsightRailHeight(feedPanelRef.current.offsetHeight);
    };

    syncHeight();

    const observer = new ResizeObserver(() => {
      syncHeight();
    });

    observer.observe(feedPanelRef.current);
    window.addEventListener("resize", syncHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncHeight);
    };
  }, [filteredEvents.length, isAnalyzing, analysis]);

  function togglePlatform(platform: string) {
    setSelectedPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    );
  }

  function selectAllPlatforms() {
    setSelectedPlatforms(platformOptions);
  }

  function clearAllPlatforms() {
    setSelectedPlatforms([]);
  }

  function toggleWatchlist(watchlist: WatchlistType) {
    setSelectedWatchlists((current) =>
      current.includes(watchlist)
        ? current.filter((item) => item !== watchlist)
        : [...current, watchlist]
    );
  }

  function selectAllWatchlists() {
    setSelectedWatchlists([...filterOptions.watchlist]);
  }

  function clearAllWatchlists() {
    setSelectedWatchlists([]);
  }

  function resetFilters() {
    setQuery("");
    setTimeFilter("全部");
    setIndustryFilter("全部");
    setRiskFilter("全部");
    setSelectedPlatforms(platformOptions);
    setSelectedWatchlists(["品牌词", "竞品词", "行业词"]);
    setSortMode("opportunity");
    setActiveMetric("all");
  }

  function handleBrandDraftChange(profile: BrandProfile) {
    setBrandDraft(profile);
    setBrandAutofillError(null);
  }

  async function handleAutofillBrandLens() {
    if (
      !brandDraft.name.trim() &&
      !brandDraft.product.trim() &&
      !brandDraft.brief.trim() &&
      !brandDraft.capabilities.trim()
    ) {
      setBrandAutofillError("先填一点品牌名、产品名或一句话，AI 才能帮你补完整。");
      return;
    }

    try {
      setIsAutofillingBrand(true);
      setBrandAutofillError(null);

      const response = await fetch("/api/brand-lens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profile: brandDraft
        })
      });

      if (!response.ok) {
        throw new Error(response.status === 400 ? "请先填写基础品牌信息。" : "AI 品牌填写失败");
      }

      const payload = (await response.json()) as {
        profile?: BrandProfile;
        warning?: string;
      };

      if (!payload.profile) {
        throw new Error("没有拿到品牌视角结果");
      }

      setBrandDraft(payload.profile);

      if (payload.warning === "missing_ai_credentials") {
        setBrandAutofillError("当前显示的是系统补全结果，建议检查 AI 配置后再生成。");
      } else if (payload.warning === "live_fill_failed") {
        setBrandAutofillError("本次智能填写未完成，当前显示系统补全结果。");
      }
    } catch (requestError) {
      setBrandAutofillError(requestError instanceof Error ? requestError.message : "AI 品牌填写失败");
    } finally {
      setIsAutofillingBrand(false);
    }
  }

  function positionInsightPanel(anchorTop?: number) {
    if (
      typeof window !== "undefined" &&
      typeof anchorTop === "number" &&
      window.innerWidth > 1200 &&
      feedPanelRef.current &&
      insightRailRef.current &&
      insightPanelRef.current
    ) {
      const feedRect = feedPanelRef.current.getBoundingClientRect();
      const railHeight = insightRailRef.current.offsetHeight;
      const panelHeight = insightPanelRef.current.offsetHeight;
      const rawTop = anchorTop - feedRect.top - 6;
      const maxTop = Math.max(0, railHeight - panelHeight);
      const nextTop = Math.max(0, Math.min(rawTop, maxTop));
      setInsightPanelTop(nextTop);
    }
  }

  function openMobileInsightModal() {
    if (!isMobileInsightLayout) return;
    setIsMobileInsightOpen(true);
  }

  function closeMobileInsightModal() {
    setIsMobileInsightOpen(false);
  }

  function handleSelectEvent(event: WorkspaceEvent, anchorTop?: number) {
    const nextEventKey = getEventSelectionKey(event);
    selectedEventKeyRef.current = nextEventKey;
    setSelectedEventKey(nextEventKey);
    positionInsightPanel(anchorTop);
  }

  function handleViewSuggestions(event: WorkspaceEvent, anchorTop?: number) {
    handleSelectEvent(event, anchorTop);
    openMobileInsightModal();
  }

  async function handleSaveOpportunity(event: (typeof filteredEvents)[number]) {
    try {
      setSavingEventId(event.id);
      setSaveMessage(null);

      const response = await fetch("/api/opportunities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventId: event.id,
          title: event.title,
          timing: event.action === "可借势" ? "今天内" : event.action === "可观察" ? "24 小时内" : "内部观察",
          format:
            event.action === "可借势"
              ? "轻图文 / 短视频"
              : event.action === "可观察"
                ? "内部策略复盘"
                : "内部同步",
          note: event.nextStep
        })
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setSaveMessage("已加入机会池");
      setRefreshToken((current) => current + 1);
    } catch (requestError) {
      setSaveMessage(requestError instanceof Error ? requestError.message : "保存失败");
    } finally {
      setSavingEventId(null);
    }
  }

  async function handleAnalyze(eventOverride?: WorkspaceEvent, anchorTop?: number) {
    const targetEvent = eventOverride ?? selectedEvent;
    if (!targetEvent) return;
    const targetEventKey = getEventSelectionKey(targetEvent);
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;

    try {
      selectedEventKeyRef.current = targetEventKey;
      setSelectedEventKey(targetEventKey);
      setAnalysisEventKey(targetEventKey);
      positionInsightPanel(anchorTop);
      setIsAnalyzing(true);
      setAnalysis(null);
      setAnalysisError(null);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event: targetEvent,
          brandProfile
        })
      });

      if (!response.ok) {
        throw new Error("AI 分析请求失败");
      }

      const payload = (await response.json()) as {
        analysis?: EventAnalysis;
        warning?: string;
      };

      if (!payload.analysis) {
        throw new Error("没有拿到分析结果");
      }

      if (requestId !== analysisRequestRef.current || selectedEventKeyRef.current !== targetEventKey) {
        return;
      }

      setAnalysis(payload.analysis);
      setAnalysisEventKey(targetEventKey);

      if (payload.warning === "missing_ai_credentials") {
        setAnalysisError("当前显示的是系统参考方案，建议检查 AI 配置后再生成。");
      } else if (payload.warning === "live_analysis_failed") {
        setAnalysisError("本次智能生成未完成，当前显示系统参考方案。");
      }
    } catch (requestError) {
      if (requestId !== analysisRequestRef.current || selectedEventKeyRef.current !== targetEventKey) {
        return;
      }

      setAnalysisError(requestError instanceof Error ? requestError.message : "AI 分析失败");
    } finally {
      if (requestId === analysisRequestRef.current) {
        setIsAnalyzing(false);
      }
    }
  }

  async function handleGenerateFromFeed(event: WorkspaceEvent, anchorTop?: number) {
    openMobileInsightModal();
    await handleAnalyze(event, anchorTop);
  }

  function applyBrandLens() {
    const normalized = normalizeBrandProfile(brandDraft);
    setBrandProfile(normalized);
    setSortMode(normalized ? "brand" : "opportunity");
    setBrandAutofillError(null);

    if (normalized) {
      window.localStorage.setItem("brandtrend-brand-profile", JSON.stringify(normalized));
    } else {
      window.localStorage.removeItem("brandtrend-brand-profile");
    }
  }

  function clearBrandLens() {
    setBrandDraft(emptyBrandProfile);
    setBrandProfile(null);
    setSortMode("opportunity");
    setBrandAutofillError(null);
    window.localStorage.removeItem("brandtrend-brand-profile");
  }

  function handleBackToTop() {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleManualRefresh() {
    setRefreshToken((current) => current + 1);
  }

  const visibleAnalysis =
    selectedEvent && analysisEventKey === getEventSelectionKey(selectedEvent) ? analysis : null;
  const visibleAnalysisError =
    selectedEvent && analysisEventKey === getEventSelectionKey(selectedEvent) ? analysisError : null;
  const visibleIsAnalyzing =
    selectedEvent && analysisEventKey === getEventSelectionKey(selectedEvent) ? isAnalyzing : false;
  const analyzingEventId =
    isAnalyzing && analysisEventKey
      ? filteredEvents.find((event) => getEventSelectionKey(event) === analysisEventKey)?.id ?? null
      : null;
  const showMobileInsightModal = isMobileInsightLayout && isMobileInsightOpen;
  const focusEvents =
    workspaceDigest?.focusEventIds
      .map((id) => filteredEvents.find((event) => event.id === id))
      .filter((event): event is WorkspaceEvent => Boolean(event)) ?? [];

  const mobileInsightModal =
    showMobileInsightModal && typeof document !== "undefined"
      ? createPortal(
          <div
            aria-modal="true"
            className="mobileInsightOverlay"
            role="dialog"
            onClick={closeMobileInsightModal}
          >
            <div className="mobileInsightSheet" onClick={(event) => event.stopPropagation()}>
              <InsightPanel
                ref={insightPanelRef}
                event={selectedEvent}
                brandProfile={brandProfile}
                topOffset={0}
                isModal
                onClose={closeMobileInsightModal}
                onSaveOpportunity={handleSaveOpportunity}
                savingEventId={savingEventId}
                analysis={visibleAnalysis}
                isAnalyzing={visibleIsAnalyzing}
                analysisError={visibleAnalysisError}
                onAnalyze={handleAnalyze}
              />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <AppShell
        floatingSlot={
          showMobileInsightModal ? null : (
            <button
              aria-label="回到顶部"
              className="backToTopButton backToTopButtonVisible"
              title="回到顶部"
              type="button"
              onClick={handleBackToTop}
            >
              ↑
            </button>
          )
        }
      >
        <TopBar
          query={query}
          onQueryChange={setQuery}
          onRefresh={handleManualRefresh}
          isRefreshing={isLoading}
          onGenerateBriefing={() => setQueuedCommandPrompt("给我一份今日晨报")}
        />

        <SummaryMetrics
          cards={metricCards}
          activeMetric={activeMetric}
          onMetricChange={(key) => setActiveMetric(key === activeMetric ? "all" : key)}
        />

        <BrandLensComposer
          draft={brandDraft}
          appliedProfile={brandProfile}
          isAutofilling={isAutofillingBrand}
          autofillError={brandAutofillError}
          onChange={handleBrandDraftChange}
          onAutofill={handleAutofillBrandLens}
          onApply={applyBrandLens}
          onClear={clearBrandLens}
        />

        <AiNativePanel
          kicker="AI 总控台"
          title="MiniMax 原生作战台"
          digest={workspaceDigest}
          isLoading={isWorkspaceDigestLoading}
          error={workspaceDigestError}
          warning={workspaceDigestWarning}
          extra={
            focusEvents.length > 0 ? (
              <div className="templateList aiCompactList">
                {focusEvents.map((event) => (
                  <button
                    className="listCard aiFocusCard"
                    key={event.id}
                    type="button"
                    onClick={() => handleSelectEvent(event)}
                  >
                    <strong>{event.title}</strong>
                    <p>{event.brandView?.reason || event.reason}</p>
                  </button>
                ))}
              </div>
            ) : null
          }
        />

        <AiCommandCenter
          workspace={workspace}
          brandProfile={brandProfile}
          selectedEvent={selectedEvent}
          queuedPrompt={queuedCommandPrompt}
          onQueuedPromptHandled={() => setQueuedCommandPrompt(null)}
        />

        <section className="activeFiltersBar">
          <span className="activeFiltersLabel">当前视图</span>
          <div className="activeFiltersChips">
            <span className="activeFilterChip">排序：{filterOptions.sort.find((item) => item.key === sortMode)?.label}</span>
            {workspace ? (
              <span className="activeFilterChip">
                数据源：
                {workspace.source === "live"
                  ? "实时热榜"
                  : workspace.source === "snapshot"
                    ? "实时快照（最近一次成功拉取）"
                    : "系统参考样本"}
              </span>
            ) : null}
            {brandProfile ? (
              <span className="activeFilterChip">品牌视角：{brandProfile.name || "已启用"}</span>
            ) : null}
            {query ? <span className="activeFilterChip">搜索：{query}</span> : null}
            {timeFilter !== "全部" ? <span className="activeFilterChip">时间：{timeFilter}</span> : null}
            {industryFilter !== "全部" ? <span className="activeFilterChip">行业：{industryFilter}</span> : null}
            {riskFilter !== "全部" ? <span className="activeFilterChip">风险：{riskFilter}</span> : null}
            {activeMetric !== "all" ? (
              <span className="activeFilterChip">
                指标：{metricCards.find((metric) => metric.key === activeMetric)?.label}
              </span>
            ) : null}
          </div>
          <span className="resultsHint">
            {saveMessage ? `${saveMessage} · ` : ""}
            {workspace
              ? `更新于 ${new Date(workspace.fetchedAt).toLocaleString("zh-CN", { hour12: false })} · ${
                  workspace.source === "snapshot" ? "实时源波动，当前展示最近一次成功快照 · " : ""
                }`
              : ""}
            {workspace ? `当前时间窗口：近 ${workspace.freshnessWindowHours} 小时 · ` : ""}
            {loadingProgress ? `${loadingProgress.stage} ${loadingProgress.loaded}/${loadingProgress.total} · ` : ""}
            匹配到 {filteredEvents.length} 条事件
          </span>
        </section>

        {isLoading && !workspace ? (
          <section className="loadingPanel">
            <div className="loadingDot" />
            <p>{loadingProgress?.stage || "正在拉取今日热点和品牌相关事件..."}</p>
          </section>
        ) : error && !workspace ? (
          <section className="emptyState">
            <strong>工作台数据加载失败</strong>
            <p>{error}</p>
          </section>
        ) : (
          <section className="workspaceGrid" ref={workspaceGridRef}>
            <FilterRail
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
              selectedPlatforms={selectedPlatforms}
              onPlatformToggle={togglePlatform}
              onPlatformSelectAll={selectAllPlatforms}
              onPlatformClearAll={clearAllPlatforms}
              industryFilter={industryFilter}
              onIndustryFilterChange={setIndustryFilter}
              selectedWatchlists={selectedWatchlists}
              onWatchlistToggle={toggleWatchlist}
              onWatchlistSelectAll={selectAllWatchlists}
              onWatchlistClearAll={clearAllWatchlists}
              riskFilter={riskFilter}
              onRiskFilterChange={setRiskFilter}
              onReset={resetFilters}
              options={{
                ...filterOptions,
                platform: platformOptions
              }}
            />

              <EventFeed
                ref={feedPanelRef}
                events={filteredEvents}
                hasBrandLens={Boolean(brandProfile)}
                selectedEventId={selectedEvent?.id ?? null}
                onSelectEvent={handleSelectEvent}
                onViewSuggestions={handleViewSuggestions}
                onGenerateEvent={handleGenerateFromFeed}
                analyzingEventId={analyzingEventId}
                onSaveOpportunity={handleSaveOpportunity}
                savingEventId={savingEventId}
                sortMode={sortMode}
                onSortModeChange={setSortMode}
                sortOptions={filterOptions.sort}
              />

            {!isMobileInsightLayout ? (
              <div
                className="insightRail"
                ref={insightRailRef}
                style={insightRailHeight ? { minHeight: `${insightRailHeight}px` } : undefined}
              >
                <InsightPanel
                  ref={insightPanelRef}
                  event={selectedEvent}
                  brandProfile={brandProfile}
                  topOffset={insightPanelTop}
                  isFloating
                  onSaveOpportunity={handleSaveOpportunity}
                  savingEventId={savingEventId}
                  analysis={visibleAnalysis}
                  isAnalyzing={visibleIsAnalyzing}
                  analysisError={visibleAnalysisError}
                  onAnalyze={handleAnalyze}
                />
              </div>
            ) : null}
          </section>
        )}

      </AppShell>
      {mobileInsightModal}
    </>
  );
}

# BrandTrend Radar Homepage Wireframe

## 1. Page Goal

The homepage is the main workspace of BrandTrend Radar.

It should let a user complete three actions within 3 minutes:

1. See what trends matter today
2. Judge whether they matter to the brand
3. Get usable communication ideas

The page should feel minimal, fast, and shallow in hierarchy.

## 2. Core Layout

Use a single-screen, three-column layout.

```text
+--------------------------------------------------------------------------------------+
| Logo / Product Name        Search            Date        Refresh     Generate Briefing |
+--------------------------------------------------------------------------------------+
| Today Events | Relevant to You | Actionable | Needs Warning                           |
+--------------------------------------------------------------------------------------+
| Filters            | Event Feed                                      | AI Insight     |
|                    |                                                 | Panel          |
| - Time             | [Event Card]                                    |                |
| - Platform         | [Event Card]                                    | Conclusion     |
| - Industry         | [Event Card]                                    | Reasoning      |
| - Watchlist        | [Event Card]                                    | Channels       |
| - Risk             | [Event Card]                                    | Angles         |
|                    |                                                 | Headlines      |
|                    |                                                 | Copy Draft     |
|                    |                                                 | Risk Reminder  |
|                    |                                                 | Next Action    |
+--------------------------------------------------------------------------------------+
```

## 3. Page Zones

### 3.1 Top Bar

Purpose:

- Brand recognition
- Fast search
- Current date context
- Refresh current trend state
- Generate daily briefing

Recommended elements:

- Product name: `BrandTrend Radar`
- Search placeholder: `搜索热点、品牌词、竞品词`
- Date display
- Refresh button
- `生成今日简报` primary action button

Design notes:

- Keep height compact
- Avoid secondary menus
- Keep primary CTA on the right

### 3.2 Summary Metrics Row

This row gives a fast "today at a glance" view.

Recommended cards:

1. `今日热点`
2. `与你相关`
3. `可借势`
4. `需预警`

Card design rules:

- Show one number only
- Optional small sublabel for change vs previous period
- No charts in MVP
- Clickable to filter center feed

### 3.3 Left Filter Rail

Purpose:

- Let users narrow the list quickly without navigating away

Recommended sections:

- 时间
  - 全部
  - 近 1 小时
  - 今日
  - 近 24 小时
- 平台
  - 微博
  - 抖音
  - 小红书
  - B 站
  - 知乎
  - 百度
- 行业
  - 餐饮
  - 美妆
  - 3C
  - 汽车
  - 服饰
  - 通用
- 词包
  - 品牌词
  - 竞品词
  - 行业词
  - 风险词
- 风险等级
  - 全部
  - 低
  - 中
  - 高

Design notes:

- Narrow width, around 220 to 260 px
- Use section labels and simple chips or checkbox groups
- No nested panels
- Keep all filters visible without tabs

## 4. Center Event Feed

The center feed is the most important area on the page.

### 4.1 Feed Sorting

Default sort recommendation:

- First by `传播机会分`
- Then by `品牌相关度`
- Then by `热度上升速度`

Optional alternate sorts:

- Latest
- Highest risk
- Most relevant to my brand

### 4.2 Event Card Structure

Each event card should be concise and easy to scan.

```text
+-------------------------------------------------------------------+
| [建议动作标签] 事件标题                                             |
| 一句话摘要                                                          |
|                                                                   |
| 平台: 微博 / 小红书      首次出现: 09:20      趋势: 上升             |
| 行业: 咖啡饮品            情绪: 中性           风险: 低               |
|                                                                   |
| 品牌相关度 86      传播机会分 78                                  |
|                                                                   |
| [查看建议]  [加入机会池]  [生成创意]                               |
+-------------------------------------------------------------------+
```

### 4.3 Event Card Fields

Required:

- Action label
- Event title
- One-line summary
- Source platform
- First seen time
- Trend direction
- Industry tag
- Sentiment tag
- Risk level
- Brand relevance score
- Communication opportunity score

Optional in later versions:

- Competitor relation
- Region
- Estimated life cycle stage
- Similar historical events

### 4.4 Action Labels

Use only three labels:

- `可借势`
- `可观察`
- `需谨慎`

These labels should be more visually prominent than numeric scores.

## 5. Right AI Insight Panel

This is the product's main differentiation area.

### 5.1 Default State

If no event is selected:

- Show a lightweight empty state
- Prompt: `选择一条热点，查看品牌传播建议`

### 5.2 Filled State

When an event is selected, render a structured panel.

Recommended order:

1. `结论`
2. `为什么`
3. `建议平台`
4. `传播角度`
5. `参考标题`
6. `短文案草案`
7. `风险提醒`
8. `建议动作`

### 5.3 Example Panel Structure

```text
结论
适合跟进，建议今天内快速响应。

为什么
该热点与年轻人通勤、提神、办公室场景高度相关，能够自然连接品牌产品使用情境。

建议平台
小红书、微博优先；抖音适合做短视频跟进。

传播角度
1. 办公室共鸣梗
2. 产品场景代入
3. 轻观点反应

参考标题
- 今天打工人的续命时刻到了
- 当热点遇到办公室咖啡场景
- 这波情绪，品牌可以这样接

短文案草案
...

风险提醒
避免直接蹭争议人物，不建议碰负面情绪表达。

建议动作
今天发
```

### 5.4 Panel Actions

Recommended buttons:

- `再生成一版`
- `加入机会池`
- `复制文案`

Keep the actions lightweight and obvious.

## 6. Homepage Interaction Rules

### 6.1 Selection Behavior

- Clicking an event card updates the right panel
- Current selected card should have a clear active state
- Selection should not trigger page navigation

### 6.2 Filtering Behavior

- Filters update the center feed in place
- Summary metric cards can act as quick filters
- Selected filters remain visible and removable

### 6.3 Feed Refresh

- Manual refresh should update card ordering and metrics
- Preserve current filters
- Preserve selected card when possible

### 6.4 Save Flow

- Clicking `加入机会池` should complete inline
- Show a lightweight confirmation
- Do not force page jump to the pool

## 7. Component List

### 7.1 Layout Components

- `AppShell`
- `TopBar`
- `SummaryMetricRow`
- `FilterRail`
- `EventFeed`
- `AIInsightPanel`

### 7.2 Top Bar Components

- `BrandMark`
- `GlobalSearchInput`
- `DateDisplay`
- `RefreshButton`
- `GenerateBriefingButton`

### 7.3 Summary Components

- `MetricCard`

Four instances:

- `TodayEventsCard`
- `RelevantEventsCard`
- `ActionableEventsCard`
- `WarningEventsCard`

### 7.4 Filter Components

- `FilterSection`
- `ChipFilterGroup`
- `CheckboxFilterGroup`
- `RiskLevelFilter`
- `WatchlistFilter`
- `ClearFiltersButton`

### 7.5 Feed Components

- `EventCard`
- `ActionLabel`
- `ScoreBadge`
- `TrendBadge`
- `TagGroup`
- `FeedSortControl`
- `FeedEmptyState`

### 7.6 AI Panel Components

- `InsightPanelHeader`
- `InsightSection`
- `ChannelTagGroup`
- `AngleList`
- `HeadlineList`
- `CopyDraftBlock`
- `RiskNotice`
- `RecommendationAction`
- `RegenerateButton`
- `CopyButton`

## 8. Suggested Copy Deck

### 8.1 Navigation Labels

- 工作台
- 监测词
- 机会池
- 简报

### 8.2 Summary Cards

- 今日热点
- 与你相关
- 可借势
- 需预警

### 8.3 Event Actions

- 查看建议
- 加入机会池
- 生成创意

### 8.4 AI Panel Labels

- 结论
- 为什么
- 建议平台
- 传播角度
- 参考标题
- 短文案草案
- 风险提醒
- 建议动作

## 9. Mobile Adaptation Principles

The MVP is desktop-first, but the page should still remain usable on mobile.

Recommended behavior:

- Collapse three-column layout into stacked sections
- Filters become a slide-over drawer
- Event feed remains primary
- AI panel opens as a bottom sheet or detail page

Do not attempt full feature parity with desktop on mobile in the first version.

## 10. Visual Tone

The UI should feel:

- Clean
- Calm
- Professional
- Fast to scan
- Not enterprise-heavy

Recommended visual direction:

- Neutral background
- High-contrast text
- Subtle card borders
- Minimal accent colors
- Action labels with clear semantic colors
- Consistent spacing rhythm

Avoid:

- Dense data tables
- Heavy dashboards
- Too many icons
- Deep accordions
- Over-designed animation

## 11. Implementation Priority

If engineering resources are limited, build homepage modules in this order:

1. App shell and top bar
2. Summary metric row
3. Event feed with static cards
4. Filter rail
5. AI insight panel
6. Inline save and briefing actions

This order ensures the main "discover -> judge -> ideate" loop is validated first.

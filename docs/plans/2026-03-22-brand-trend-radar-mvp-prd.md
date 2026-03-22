# BrandTrend Radar MVP PRD

## 1. Product Overview

- Working name: BrandTrend Radar
- Chinese name: 品牌热点雷达
- Product positioning: 给中国品牌团队的热点传播工作台，帮助用户发现热点、判断是否值得跟、快速生成传播创意。
- Tagline: 比热榜更懂品牌，比舆情工具更懂传播。

### 1.1 Background

Current hot-list products solve "what is happening now" but not "what should my brand do." Generic public-opinion tools solve monitoring, but are often too heavy, too broad, and too risk-oriented for daily brand communication work.

There is a clear gap between those categories:

- Hot-list sites are good for fast browsing, but weak at brand relevance and actionability.
- Generic monitoring tools are good for alerts and dashboards, but weak at campaign ideation and content planning.
- Brand, PR, and content teams need a daily workspace that converts trends into communication decisions.

BrandTrend Radar is designed to fill that gap.

### 1.2 Product Goal

Validate a single core hypothesis:

> Brand teams will open a dedicated tool daily if it helps them complete the workflow from trend discovery to communication idea generation faster than existing hot-list or monitoring products.

The MVP should optimize for:

- High-frequency daily use
- Lightweight decision making
- Fast output
- Low learning cost

## 2. Target Users

### 2.1 Primary Users

1. New consumer brand teams
   - Brand managers
   - Content strategists
   - Social media operators
   - PR / communication managers
2. Agency teams
   - Account executives
   - Social planners
   - Content teams
   - Campaign strategists

### 2.2 Core User Traits

- Need to react quickly to trends
- Evaluate many topics in limited time
- Work across multiple content platforms
- Often create daily or weekly content selections
- Need ideas that are brand-safe and channel-aware

### 2.3 User Pain Points

- There are too many trends, but unclear which ones matter to the brand.
- Even when a trend is visible, it is hard to judge whether the brand should engage.
- Ideation is slow when content teams start from a blank page.
- Traditional public-opinion systems are too heavy for everyday communication work.
- Hot-list products stop at aggregation and do not support brand action.

## 3. Core Value Proposition

BrandTrend Radar delivers three pieces of value:

1. Help users see the trends that are relevant to their brand faster.
2. Help users judge whether a trend is worth acting on.
3. Help users produce usable communication angles immediately.

In one sentence:

> 从热点发现到传播判断再到创意生成，在一个工作台内完成。

## 4. Success Metrics

### 4.1 Product Success Metrics

- Daily active usage
- Event card click-through rate
- AI suggestion generation rate
- Opportunity pool save rate
- Briefing open rate

### 4.2 MVP Validation Metrics

- Users open the workspace at least once per day on workdays
- Users click into a meaningful portion of recommended events
- Users trigger AI output repeatedly rather than only browse
- Users save selected events into an action-oriented pool

## 5. Product Scope

### 5.1 MVP Includes

- Multi-source trend aggregation
- Event deduplication and clustering
- Watchlists for brand, competitor, industry, and risk terms
- Brand relevance scoring
- Communication opportunity scoring
- AI-based communication suggestions
- Opportunity pool
- Briefing generation

### 5.2 MVP Excludes

- Complex organization and permission systems
- Deep BI-style dashboards
- Full historical analytics platform
- Auto-posting to social platforms
- Complex workflow approval systems
- Full enterprise public-opinion management
- Customer-service or incident-ticket workflows

## 6. Core User Flow

The default daily flow should be completed in five steps:

1. Open workspace and review today's important events.
2. Apply lightweight filters by industry, platform, watchlist, or risk level.
3. Click an event and review AI judgment and suggested angles.
4. Save worthwhile topics to the opportunity pool.
5. Generate or review the daily briefing for internal discussion.

The product should feel like "trend radar + planning assistant," not like a complex enterprise monitoring console.

## 7. Information Architecture

The MVP should have only four first-level navigation items:

1. Workspace
2. Watchlists
3. Opportunity Pool
4. Briefings

### 7.1 Design Principles

- Minimal hierarchy
- Single-screen decision making
- Low learning cost
- Card-first interface
- Light filters, not deep menus
- Structured AI output instead of open-ended chat

## 8. Workspace PRD

The workspace is the main page and should support roughly 80 percent of product usage.

### 8.1 Workspace Goal

Enable users to discover, judge, and save trend opportunities in a single screen.

### 8.2 Layout

Use a simple three-column layout:

- Left: narrow filter rail
- Center: event feed
- Right: AI insight panel

### 8.3 Top Bar

The top bar should include:

- Product name
- Current date
- Search
- Refresh
- Generate briefing

### 8.4 Summary Metrics

Show four lightweight summary cards:

- Today's events
- Relevant to you
- Actionable opportunities
- Needs warning

These are quick overview metrics only. No heavy charts in MVP.

### 8.5 Filter Rail

Filters should be intentionally limited to:

- Time
- Platform
- Industry
- Watchlist
- Risk level

Avoid deep nested filtering systems.

## 9. Event Card Design

Each event card should show only the information required for fast judgment.

### 9.1 Required Fields

- Event title
- One-line summary
- Source platform
- First seen time
- Trend direction: rising / stable / cooling
- Industry tag
- Sentiment tag
- Risk level
- Brand relevance score
- Communication opportunity score
- Suggested action label: actionable / observe / caution

### 9.2 Card Actions

Each card should support only three primary actions:

- View suggestions
- Add to opportunity pool
- Generate creative

## 10. AI Insight Panel

The AI panel should not behave like an empty chatbot. It should render structured output as soon as an event is selected.

### 10.1 Required Output Blocks

- Conclusion: should the brand engage or not
- Reasoning: why this event is suitable or unsuitable
- Suggested channels: Weibo / Xiaohongshu / Douyin / WeChat / Bilibili etc.
- Communication angles: three distinct approaches
- Reference headlines: three options
- Short copy draft: one to two options
- Risk reminder
- Recommended next action: publish today / keep watching / skip

### 10.2 UX Rules

- Default to structured panels, not chat bubbles
- Keep output concise and editable
- Preserve "why" explanations for trust
- Support one-click regeneration for alternative angles later

## 11. Watchlists PRD

The watchlist page should feel like lightweight setup, not a rule engine.

### 11.1 Watchlist Types

1. Brand terms
   - Brand name
   - Product name
   - Campaign name
   - Spokesperson name
2. Competitor terms
3. Industry terms
4. Risk terms

### 11.2 Watchlist Controls

Each list item should support:

- Add term
- Enable or disable alerts
- Set priority

No advanced boolean logic in MVP.

## 12. Opportunity Pool PRD

The opportunity pool is the bridge from trend browsing to content planning.

### 12.1 Purpose

Store selected events that the team may act on today or soon.

### 12.2 Required Fields

In addition to event basics, each opportunity should store:

- Recommended follow-up time: today / within 24 hours / monitor
- Recommended format: short post / video / comment interaction / long-form article
- Status: new / selected / in progress / archived

### 12.3 Key Actions

- Save from workspace
- Add note
- Mark follow-up status
- Remove or archive

## 13. Briefings PRD

Briefings make the product useful for team coordination, not just personal browsing.

### 13.1 Briefing Types

- Morning briefing: what matters today
- Evening briefing: what changed today
- Topic briefing: a focused report for a brand, competitor, or industry

### 13.2 Briefing Structure

Each briefing should include:

- Key events
- Why they matter
- Actionable opportunities
- Risk signals
- Suggested priority order

### 13.3 Delivery

For MVP, allow in-product viewing first.
External delivery like Feishu, email, or Enterprise WeChat can be added after core workflow validation.

## 14. Scoring Model

The scoring system should stay simple in MVP.

### 14.1 Brand Relevance Score

Factors:

- Whether the event matches brand, product, competitor, or industry terms
- Semantic similarity to brand profile
- Suitability for the brand's content style
- Channel fit with the brand's focus platforms

### 14.2 Communication Opportunity Score

Factors:

- Whether trend momentum is still rising
- Whether the event is easy to reinterpret or remix
- Whether emotional tone is safe
- Whether the event can naturally connect to product, opinion, or life scene

### 14.3 Final Action Label

Map scores into three action labels:

- Actionable
- Observe
- Caution

The label should be more visible than the raw score.

## 15. Data Sources and Event Flow

### 15.1 Initial Data Coverage

Do not optimize for total platform coverage on day one. Start with the highest-value China trend sources and expand later.

Suggested first-wave sources:

- Weibo
- Zhihu
- Douyin
- Bilibili
- Xiaohongshu
- Baidu trends or related hot sources
- WeChat ecosystem trend signals where accessible

### 15.2 Event Processing Pipeline

1. Fetch raw content
2. Clean and normalize
3. Deduplicate
4. Cluster into unified events
5. Summarize
6. Tag and score
7. Generate suggestions
8. Publish into workspace, opportunity pool, and briefings

### 15.3 Event Lifecycle States

Each event should have a simple lifecycle:

- New
- Rising
- Saved to opportunity pool
- Needs warning
- Cooling

## 16. Technical Architecture

### 16.1 Recommended Stack

- Frontend: Next.js
- Backend: Next.js API routes or NestJS
- Database: Postgres
- Cache / queue: Redis
- Scheduling: cron or Trigger.dev
- AI layer: a dedicated analysis service for summary, tagging, scoring, and ideation
- Ingestion layer: one connector per source, normalized into a standard event schema

### 16.2 Architecture Principles

- Modular source connectors
- Standardized event schema
- Asynchronous analysis pipeline
- Fast page rendering with cached event lists
- Clear separation between raw data, event clusters, and AI output

## 17. Core Data Model

Keep the first version small.

### 17.1 Suggested Core Tables

- `sources`
  - source metadata and configuration
- `raw_items`
  - raw fetched records from connectors
- `events`
  - clustered event cards
- `event_scores`
  - relevance, opportunity, and risk scores
- `watchlists`
  - brand, competitor, industry, risk terms
- `briefings`
  - generated briefing content and metadata

### 17.2 Optional Early Extension Tables

- `opportunities`
  - saved event planning items
- `ai_outputs`
  - structured creative suggestions and versions
- `users`
  - if account support is added

## 18. Prompt Chain Design

Do not use one giant prompt for all tasks. Split AI work into focused stages.

### 18.1 Prompt 1: Event Summary

Input:

- Raw titles
- Snippets
- Source metadata

Output:

- One-line summary
- Unified event name
- Basic context

### 18.2 Prompt 2: Brand Matching

Input:

- Event summary
- Brand profile
- Watchlists

Output:

- Relevance score
- Match reasons
- Related brand dimensions

### 18.3 Prompt 3: Communication Judgment

Input:

- Event summary
- Relevance context
- Platform context

Output:

- Whether to engage
- Suitable channels
- Main risks
- Recommended action label

### 18.4 Prompt 4: Creative Generation

Input:

- Event summary
- Suggested channels
- Brand context

Output:

- Three communication angles
- Three headlines
- One to two short copy drafts
- Channel notes

## 19. Non-Functional Requirements

### 19.1 Performance

- First screen loads within 3 seconds under normal conditions
- Trend updates operate at minute-level refresh, not second-level real-time
- AI response target within 10 seconds

### 19.2 Reliability

- Source failures should not break the whole event feed
- Retry logic for ingestion and AI analysis
- Basic logging for connector and AI job failures

### 19.3 Trust and Explainability

- AI judgments should include concise reasons
- Scores should be explainable
- Risk output should be visible when caution is high

## 20. MVP Rollout Plan

### 20.1 Two-Week Version

Build the smallest version that proves the core value:

- Source ingestion
- Event feed
- Watchlists
- Brand relevance scoring
- AI communication suggestions
- Basic workspace UI

### 20.2 Four-Week Version

Expand into the full MVP experience:

- Opportunity pool
- Briefings
- Alerting
- Scoring improvements
- Basic account support

## 21. UX Tone and Visual Direction

The product should feel:

- Minimal
- Fast
- Professional but not enterprise-heavy
- Easy to scan
- Built for everyday use

Visual rules:

- Large whitespace
- Card-based layout
- Shallow navigation
- Few but meaningful labels
- No dense dashboards
- No deep multi-level menus

The interface should feel closer to a modern content workspace than a legacy monitoring system.

## 22. Key MVP Principle

The MVP should prove one thing above all:

> For the same trend, BrandTrend Radar gives the user more brand-action value than a normal hot-list product.

If the product only aggregates better, it loses.
If the product helps the team decide and act faster, it wins.

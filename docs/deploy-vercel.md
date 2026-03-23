# PPeyes Vercel 自动部署

## 1. 在 Supabase 执行建表 SQL

在 Supabase SQL Editor 执行：

- `docs/supabase-schema.sql`

## 2. 在 Vercel 新建项目

1. `Add New` -> `Project`
2. 选择 GitHub 仓库 `shenyangs/ppeyes`
3. Framework 选 `Next.js`（通常会自动识别）
4. Production Branch 设为 `main`

## 3. 配置 Vercel 环境变量

推荐主备一起配置：

- `GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta`
- `GEMINI_API_KEY=<你的 AI API Key>`
- `GEMINI_MODEL=<你的模型 ID>`
- `MINIMAX_BASE_URL=https://api.minimax.io/v1`
- `MINIMAX_API_KEY=<你的 MiniMax API Key>`
- `MINIMAX_MODEL=MiniMax-M2.5`
- `SUPABASE_URL=<你的 Supabase 项目 URL>`
- `SUPABASE_SERVICE_ROLE_KEY=<你的 service role key>`

说明：

- 线上会优先调用 Gemini
- 如果 Gemini 超时、限流或返回错误，会自动回退到 MiniMax
- 如果你部署环境更适合国内线路，可把 `MINIMAX_BASE_URL` 改成 `https://api.minimaxi.com/v1`
- 如果暂时只配了 `MINIMAX_*`，系统也可以直接用 MiniMax 跑通

可选：

- `SUPABASE_WATCHLISTS_TABLE=ppeyes_watchlist_terms`
- `SUPABASE_OPPORTUNITIES_TABLE=ppeyes_saved_opportunities`

不建议设置：

- `GEMINI_ALLOW_INSECURE_TLS`

## 4. 触发自动重部署

- 推送到 `main` 会自动触发 Production 部署
- 推送到其他分支会生成 Preview 部署

## 5. 验证

访问线上域名后确认：

- 首页可打开
- `/api/watchlists` 正常返回
- `/api/opportunities` 正常返回
- 触发 `/api/analyze` 或 `/api/brand-lens` 时，在 Gemini 不可用情况下仍能返回 AI 结果
- 新增词包/保存机会在刷新后仍存在

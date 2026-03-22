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

必填：

- `GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta`
- `GEMINI_API_KEY=<你的 AI API Key>`
- `GEMINI_MODEL=<你的模型 ID>`
- `SUPABASE_URL=<你的 Supabase 项目 URL>`
- `SUPABASE_SERVICE_ROLE_KEY=<你的 service role key>`

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
- 新增词包/保存机会在刷新后仍存在

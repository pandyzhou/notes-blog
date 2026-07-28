# 技术笔记

Astro + Notion 驱动的静态博客。在 Notion 里写文章，推送后自动构建成静态站点。

## 它是怎么工作的

```
Notion 数据库（写作）
   ↓  构建时通过 Notion API 拉取「已发布」的文章
Astro（生成静态 HTML）
   ↓  Git push 触发自动构建
Cloudflare Pages / EdgeOne（托管）
```

## 需要的两个环境变量

| 变量 | 说明 |
| --- | --- |
| `NOTION_TOKEN` | Notion 内部集成的 Token，`ntn_` 开头 |
| `NOTION_DATA_SOURCE_ID` | 文章数据库的 data source ID |
| `SITE_URL` | （可选）站点完整网址，用于 sitemap 和 RSS |

⚠️ 不要把 Token 提交到仓库。本地开发放在 `.env`，线上放在平台的环境变量里。

## 项目结构

```
src/
  lib/notion.ts            # 所有 Notion 取数逻辑，列名配置在顶部 PROPS
  layouts/BaseLayout.astro # 页面外壳、SEO meta、导航
  components/PostItem.astro# 文章列表项
  styles/global.css        # 全部样式，支持深色模式
  pages/
    index.astro            # 首页文章列表
    posts/[slug].astro     # 文章详情页
    tags/index.astro       # 标签总览
    tags/[tag].astro       # 单标签列表
    rss.xml.ts             # RSS 订阅
    404.astro
```

## 改了 Notion 列名怎么办

只改 `src/lib/notion.ts` 顶部的 `PROPS` 对象，其他地方不用动。

## 已知限制

- **Notion 上传的图片链接只有 1 小时有效期**。文章里插图建议用外部图片链接（如图床、Unsplash），而不是直接拖文件进 Notion。
- 静态站需要重新构建才能看到新文章。可以在部署平台建一个 Deploy Hook，配定时任务自动重建。
- 代码块目前没有语法高亮，只做了排版。
- 数据库块、同步块在 Notion API 里拿不到内容，文章里避免使用。

## 本地开发（可选）

```bash
npm install
cp .env.example .env   # 填入真实值
npm run dev
```

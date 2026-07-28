# 技术笔记（notes-blog）

基于 **Astro + Yukina 主题 + Notion** 的个人技术博客。

写作在 Notion，构建时自动把「已发布」的文章拉下来生成静态站，托管在 Cloudflare Pages。

## 整体流程

```
Notion 数据库（写完把状态改成「已发布」）
    ↓ 构建时 scripts/sync-notion.mjs 拉取
本地 markdown（src/contents/posts/，构建时生成，不提交 git）
    ↓ astro build（Yukina 主题渲染）
Cloudflare Pages 静态托管
```

## 日常发布

1. 在 Notion 的「文章」数据库里写
2. 状态改成「已发布」
3. 触发重新构建：
   - 自动：GitHub Actions 每 6 小时一次（`.github/workflows/deploy.yml`）
   - 手动：仓库 → Actions →「触发博客重新构建」→ Run workflow

## Cloudflare Pages 环境变量

| 变量 | 说明 |
|---|---|
| `NOTION_TOKEN` | Notion 内部集成 Token |
| `NOTION_DATABASE_ID` | 文章数据库 ID（32 位） |
| `NODE_VERSION` | `22` |

构建设置：Framework preset `Astro` / Build command `npm run build` / Output `dist`。

## 本地开发

```bash
cp .env.example .env    # 填入自己的值
export $(grep -v '^#' .env | xargs)
npm install
npm run dev             # 先同步 Notion 再启动 dev server
```

## 站点定制

标题 / 头像 / 横幅 / 社交链接 / 许可证：`yukina.config.ts`
Notion 属性名映射：`scripts/sync-notion.mjs` 顶部的 `PROPS`

## 已知限制

- Notion 直接上传的图片 URL 约 1 小时过期 → 正文配图请用外部链接（图床）
- 文章封面只读取 Notion 页面封面里的「外链图片」；没封面时自动从横幅图里挑一张兜底
- 「分类」未启用（数据库没有分类属性），侧边栏会自动隐藏分类卡片；标签正常使用
- 标签里的 `/` 和空格会在同步时替换成 `-`（路由要求）

## 致谢

主题：[Yukina](https://github.com/WhitePaper233/yukina)（MIT License）

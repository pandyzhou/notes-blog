/**
 * 构建前从 Notion 拉取「已发布」文章，生成为本地 markdown。
 * 输出目录：src/contents/posts/（已加入 .gitignore）
 */
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

// ---------- Notion 属性名映射（跟数据库一致）----------
const PROPS = {
  title: "标题",
  status: "状态",
  publishedValue: "已发布",
  date: "发布日期",
  tags: "标签",
  summary: "摘要",
  slug: "Slug",
  featured: "置顶",
};

const OUT_DIR = path.join(process.cwd(), "src", "contents", "posts");

// ---------- 工具 ----------
function fail(msg) {
  console.error(`\n[notion] ❌ ${msg}\n`);
  process.exit(1);
}

/** 把任意输入（URL / 带连字符 ID / 纯 32 位）归一化为带连字符的 UUID */
function normalizeId(raw) {
  if (!raw) return "";
  const hex = String(raw).replace(/[^0-9a-fA-F]/g, "");
  if (hex.length !== 32) return String(raw).trim();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/** 生成安全的 URL 片段（保留中文，去掉斜杠等特殊字符）*/
function slugify(input) {
  return String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** YAML 安全字符串 */
function yamlStr(v) {
  return JSON.stringify(String(v ?? ""));
}

// ---------- 属性读取 ----------
function readTitle(page) {
  const p = page.properties?.[PROPS.title];
  return p?.title?.map((t) => t.plain_text).join("") || "无标题";
}

function readRichText(page, name) {
  const p = page.properties?.[name];
  return p?.rich_text?.map((t) => t.plain_text).join("") || "";
}

function readDate(page) {
  const p = page.properties?.[PROPS.date];
  return p?.date?.start || page.created_time?.slice(0, 10) || null;
}

function readTags(page) {
  const p = page.properties?.[PROPS.tags];
  return (p?.multi_select || []).map((o) => o.name);
}

function readFeatured(page) {
  return page.properties?.[PROPS.featured]?.checkbox === true;
}

/** 只取外链封面；Notion 上传的文件链接约 1 小时就过期，不能用于静态站 */
function readCover(page) {
  const c = page.cover;
  if (!c) return null;
  if (c.type === "external") return c.external?.url || null;
  return null;
}

// ---------- 主流程 ----------
async function main() {
  const token = process.env.NOTION_TOKEN;
  const rawDbId = process.env.NOTION_DATABASE_ID;

  if (!token) fail("缺少环境变量 NOTION_TOKEN（Cloudflare → Settings → Variables and Secrets）");
  if (!rawDbId) fail("缺少环境变量 NOTION_DATABASE_ID");

  const databaseId = normalizeId(rawDbId);
  const notion = new Client({ auth: token });
  const n2m = new NotionToMarkdown({ notionClient: notion });

  // 1. 解析 data source id（2025-09-03 版本 API 需要）
  let dataSourceId = process.env.NOTION_DATA_SOURCE_ID
    ? normalizeId(process.env.NOTION_DATA_SOURCE_ID)
    : null;

  if (!dataSourceId) {
    try {
      const db = await notion.databases.retrieve({ database_id: databaseId });
      dataSourceId = db?.data_sources?.[0]?.id;
    } catch (err) {
      fail(
        `无法读取数据库 ${databaseId}\n` +
          `  → 检查 NOTION_DATABASE_ID 是否正确，以及集成是否已在数据库右上角 Connections 里连接\n` +
          `  原始错误：${err.message}`,
      );
    }
  }
  if (!dataSourceId) fail("数据库里没有找到 data source");

  console.log(`[notion] 使用数据库 ${databaseId}`);

  // 2. 分页拉取所有「已发布」文章
  const pages = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: PROPS.status,
        status: { equals: PROPS.publishedValue },
      },
      sorts: [{ property: PROPS.date, direction: "descending" }],
      page_size: 100,
      start_cursor: cursor,
    });
    pages.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  console.log(`[notion] 拉取到 ${pages.length} 篇已发布文章`);

  // 3. 清空并重建输出目录
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  if (pages.length === 0) {
    console.warn(
      "[notion] ⚠️  没有任何文章。确认 Notion 里至少有一篇的「状态」为「已发布」。",
    );
  }

  // 4. 逐篇转换
  const usedSlugs = new Set();

  for (const page of pages) {
    const title = readTitle(page);
    const date = readDate(page);
    const tags = readTags(page).map((t) => slugify(t) || t);
    const description = readRichText(page, PROPS.summary);
    const cover = readCover(page);

    let slug =
      slugify(readRichText(page, PROPS.slug)) ||
      slugify(title) ||
      page.id.replace(/-/g, "").slice(0, 12);

    // 防重名
    let unique = slug;
    let i = 2;
    while (usedSlugs.has(unique)) unique = `${slug}-${i++}`;
    slug = unique;
    usedSlugs.add(slug);

    // 正文
    let body = "";
    try {
      const blocks = await n2m.pageToMarkdown(page.id);
      body = n2m.toMarkdownString(blocks).parent || "";
    } catch (err) {
      console.warn(`[notion] ⚠️  「${title}」正文转换失败：${err.message}`);
    }

    // frontmatter
    const fm = [
      "---",
      `title: ${yamlStr(title)}`,
      `published: ${date}`,
      description ? `description: ${yamlStr(description)}` : null,
      cover ? `cover: ${yamlStr(cover)}` : null,
      tags.length ? `tags: [${tags.map(yamlStr).join(", ")}]` : null,
      `draft: false`,
      "---",
      "",
    ]
      .filter(Boolean)
      .join("\n");

    await fs.writeFile(
      path.join(OUT_DIR, `${slug}.md`),
      `${fm}\n${body}\n`,
      "utf-8",
    );

    console.log(
      `[notion]   ✓ ${slug}.md  ←  ${title}${readFeatured(page) ? "  ★" : ""}`,
    );
  }

  console.log(`[notion] 完成，共生成 ${pages.length} 个文件\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

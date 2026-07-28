import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

/**
 * Notion 数据库里的列名。
 * 如果你在 Notion 里改了列名，只需要改这里。
 */
export const PROPS = {
  title: "标题",
  status: "状态",
  publishedValue: "已发布",
  date: "发布日期",
  tags: "标签",
  summary: "摘要",
  slug: "Slug",
  featured: "置顶",
} as const;

export const SITE = {
  title: "技术笔记",
  description: "记录开发过程中的踩坑、思考和工具折腾。",
};

const token = import.meta.env.NOTION_TOKEN;
const explicitDataSourceId = import.meta.env.NOTION_DATA_SOURCE_ID;
const databaseId = import.meta.env.NOTION_DATABASE_ID;

if (!token) {
  throw new Error(
    "\u7f3a\u5c11\u73af\u5883\u53d8\u91cf NOTION_TOKEN\u3002\u672c\u5730\u5f00\u53d1\u653e\u5728 .env\uff0c\u7ebf\u4e0a\u653e\u5728\u90e8\u7f72\u5e73\u53f0\u7684\u73af\u5883\u53d8\u91cf\u91cc\u3002"
  );
}

if (!explicitDataSourceId && !databaseId) {
  throw new Error(
    "\u8bf7\u8bbe\u7f6e NOTION_DATABASE_ID\uff08\u63a8\u8350\uff0c\u4ece Notion \u6570\u636e\u5e93\u9875\u9762\u7684\u7f51\u5740\u91cc\u590d\u5236\uff09\uff0c\u6216\u8005 NOTION_DATA_SOURCE_ID\u3002"
  );
}

const notion = new Client({ auth: token });
const n2m = new NotionToMarkdown({ notionClient: notion });

/** 把带连字符或不带连字符的 32 位 ID 统一成标准 UUID */
function normalizeId(raw: string): string {
  const hex = raw.trim().replace(/[^0-9a-fA-F]/g, "");
  if (hex.length !== 32) return raw.trim();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

let dataSourcePromise: Promise<string> | null = null;

/**
 * 优先用显式配置的 data source ID；
 * 否则用 database ID 向 Notion 查一次，自动拿到第一个 data source。
 */
function getDataSourceId(): Promise<string> {
  if (dataSourcePromise) return dataSourcePromise;

  dataSourcePromise = (async () => {
    if (explicitDataSourceId) return normalizeId(explicitDataSourceId);

    const db: any = await notion.databases.retrieve({
      database_id: normalizeId(databaseId!),
    });
    const id = db?.data_sources?.[0]?.id;

    if (!id) {
      throw new Error(
        "\u65e0\u6cd5\u4ece\u8be5\u6570\u636e\u5e93\u89e3\u6790\u51fa data source\u3002\u8bf7\u786e\u8ba4 NOTION_DATABASE_ID \u6b63\u786e\uff0c\u4e14\u5df2\u5c06\u96c6\u6210\u8fde\u63a5\u5230\u8be5\u6570\u636e\u5e93\u3002"
      );
    }
    return id;
  })();

  return dataSourcePromise;
}

export type Post = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  featured: boolean;
};

function plain(rich: any[] | undefined): string {
  return (rich ?? []).map((r: any) => r.plain_text).join("").trim();
}

/** 把任意文本转成 URL 安全的片段（保留中文） */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export const tagSlug = slugify;

let cache: Post[] | null = null;

/** 拉取所有「已发布」的文章（自动翻页，单次构建内缓存） */
export async function getPublishedPosts(): Promise<Post[]> {
  if (cache) return cache;

  const dataSourceId = await getDataSourceId();
  const posts: Post[] = [];
  let cursor: string | undefined;

  do {
    const res: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: PROPS.status,
        status: { equals: PROPS.publishedValue },
      },
      sorts: [{ property: PROPS.date, direction: "descending" }],
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of res.results ?? []) {
      const p = page.properties ?? {};
      const title = plain(p[PROPS.title]?.title) || "未命名";
      const rawSlug = plain(p[PROPS.slug]?.rich_text);

      posts.push({
        id: page.id,
        slug: rawSlug || slugify(title) || String(page.id).replace(/-/g, ""),
        title,
        summary: plain(p[PROPS.summary]?.rich_text),
        date: p[PROPS.date]?.date?.start ?? "",
        tags: (p[PROPS.tags]?.multi_select ?? []).map((t: any) => t.name),
        featured: Boolean(p[PROPS.featured]?.checkbox),
      });
    }

    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);

  cache = posts;
  return posts;
}

/** 把一篇 Notion 页面的正文转成 Markdown */
export async function getPostMarkdown(pageId: string): Promise<string> {
  const blocks = await n2m.pageToMarkdown(pageId);
  return n2m.toMarkdownString(blocks).parent ?? "";
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

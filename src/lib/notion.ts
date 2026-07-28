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
const dataSourceId = import.meta.env.NOTION_DATA_SOURCE_ID;

if (!token || !dataSourceId) {
  throw new Error(
    "\u7f3a\u5c11\u73af\u5883\u53d8\u91cf NOTION_TOKEN \u6216 NOTION_DATA_SOURCE_ID\u3002\n" +
      "\u672c\u5730\u5f00\u53d1\uff1a\u628a .env.example \u590d\u5236\u4e3a .env \u5e76\u586b\u5165\u503c\u3002\n" +
      "\u7ebf\u4e0a\u90e8\u7f72\uff1a\u5728\u5e73\u53f0\u7684\u73af\u5883\u53d8\u91cf\u8bbe\u7f6e\u91cc\u6dfb\u52a0\u3002"
  );
}

const notion = new Client({ auth: token });
const n2m = new NotionToMarkdown({ notionClient: notion });

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

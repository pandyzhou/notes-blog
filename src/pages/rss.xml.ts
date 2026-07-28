import rss from "@astrojs/rss";
import { getPublishedPosts, SITE } from "../lib/notion";

export async function GET(context: { site?: URL | string }) {
  const posts = await getPublishedPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site ?? "https://example.com",
    items: posts.map((post) => ({
      title: post.title,
      description: post.summary,
      pubDate: post.date ? new Date(post.date) : new Date(),
      link: `/posts/${post.slug}/`,
    })),
    customData: "<language>zh-CN</language>",
  });
}

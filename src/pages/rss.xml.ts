import rss from "@astrojs/rss";
import YukinaConfig from "../../yukina.config";
import { GetSortedPosts } from "../utils/content";
import { IdToSlug } from "../utils/hash";

export async function GET(context: { site: string }) {
  const posts = await GetSortedPosts();
  return rss({
    title: YukinaConfig.title,
    description: YukinaConfig.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      pubDate: post.data.published,
      link: `/posts/${IdToSlug(post.id)}/`,
    })),
    customData: `<language>zh-CN</language>`,
  });
}

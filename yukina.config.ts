import I18nKeys from "./src/locales/keys";
import type { Configuration } from "./src/types/config";

const YukinaConfig: Configuration = {
  title: "技术笔记",
  subTitle: "记录开发过程中的踩坑、思考和工具折腾",
  brandTitle: "技术笔记",

  description: "记录开发过程中的踩坑、思考和工具折腾。",

  site: "https://notes-blog.pages.dev",

  locale: "zh-CN",

  navigators: [
    {
      nameKey: I18nKeys.nav_bar_home,
      href: "/",
    },
    {
      nameKey: I18nKeys.nav_bar_archive,
      href: "/archive",
    },
    {
      nameKey: I18nKeys.nav_bar_about,
      href: "/about",
    },
    {
      nameKey: I18nKeys.nav_bar_github,
      href: "https://github.com/pandyzhou",
    },
  ],

  username: "周易",
  sign: "写代码，记笔记，少踩坑。",
  avatarUrl: "https://github.com/pandyzhou.png",
  socialLinks: [
    {
      icon: "line-md:github-loop",
      link: "https://github.com/pandyzhou",
    },
  ],
  maxSidebarCategoryChip: 6,
  maxSidebarTagChip: 12,
  maxFooterCategoryChip: 6,
  maxFooterTagChip: 24,

  // 本地矢量图，随站点一起部署到 Cloudflare CDN，不依赖外部图床
  banners: [
    "/banners/1.svg",
    "/banners/2.svg",
    "/banners/3.svg",
    "/banners/4.svg",
    "/banners/5.svg",
    "/banners/6.svg",
    "/banners/7.svg",
    "/banners/8.svg",
  ],

  slugMode: "RAW",

  license: {
    name: "CC BY-NC-SA 4.0",
    url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
  },

  bannerStyle: "LOOP",
};

export default YukinaConfig;

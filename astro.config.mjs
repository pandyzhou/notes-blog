import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// SITE_URL 在部署平台的环境变量里设置，例如 https://notes-blog.pages.dev
export default defineConfig({
  site: process.env.SITE_URL || "https://notes-blog.pages.dev",
  output: "static",
  integrations: [sitemap()],
});

import type { APIRoute } from "astro";

const paths = [
  "/",
  "/agents",
  "/humans",
  "/how-it-works",
  "/games",
  "/economy",
  "/live",
  "/docs",
  "/skill.md",
];

export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? "/").replace(/\/$/, "");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${base}${p}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};

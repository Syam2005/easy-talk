import * as cheerio from "cheerio";

const UA = "Mozilla/5.0 (compatible; EasyTalkLearn/1.0; +https://github.com)";

// GeeksforGeeks has no public search API, so we search it the same way a
// browser's "site:" search would: via DuckDuckGo's plain HTML endpoint
// (no JS rendering needed, no API key, no rate-limit headaches like Google's
// search would have). Scoped to geeksforgeeks.org only.
export const searchGeeksForGeeks = async (query) => {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
    `site:geeksforgeeks.org ${query}`
  )}`;

  const res = await fetch(searchUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Search request failed (${res.status})`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const results = [];
  $(".result").each((_, el) => {
    const titleEl = $(el).find(".result__a");
    let href = titleEl.attr("href") || "";
    const title = titleEl.text().trim();
    const snippet = $(el).find(".result__snippet").text().trim();

    // DuckDuckGo's HTML results wrap the real URL in a redirect link like
    // //duckduckgo.com/l/?uddg=<encoded-real-url>&... — unwrap it.
    const match = href.match(/uddg=([^&]+)/);
    if (match) href = decodeURIComponent(match[1]);

    if (title && href.includes("geeksforgeeks.org")) {
      results.push({ title, url: href, snippet });
    }
  });

  return results.slice(0, 8);
};

// Fetches a GfG article page and pulls out the readable article text —
// best-effort, since it depends on GfG's current page markup. Strips out
// nav/ads/comments/related-articles noise as best as reasonably possible.
export const fetchArticleText = async (url) => {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Couldn't fetch the article (${res.status})`);
  const html = await res.text();
  const $ = cheerio.load(html);

  $(
    "script, style, nav, header, footer, .adsbygoogle, .improve, .article--recommended, " +
      ".article-comment, .content-preview-adds, .three_dots_dropdown, .article-meta"
  ).remove();

  const container = $("article").length
    ? $("article")
    : $(".text, .article--viewer_content, .content").first();
  const target = container.length ? container : $("body");

  const parts = [];
  target.find("h1, h2, h3, p, li, pre").each((_, el) => {
    const tag = el.tagName;
    const text = $(el).text().trim();
    if (!text) return;
    parts.push(tag === "pre" ? "```\n" + text + "\n```" : text);
  });

  // Cap length so it stays a reasonable size to hand to a local LLM.
  const text = parts.join("\n").slice(0, 12000);
  if (!text || text.length < 100) {
    throw new Error("Couldn't extract readable content from this page.");
  }
  return text;
};

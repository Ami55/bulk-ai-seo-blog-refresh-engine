import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high limits for body parser since users might paste large articles manually
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Serve JSON/schema parsing utility
function tryParseJSON(text: string) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

// -------------------------------------------------------------
// Helper: Extract SEO elements from Cheerio instance
// -------------------------------------------------------------
function extractSEOFromCheerio($: cheerio.CheerioAPI, sourceUrl: string = "uploaded-content.html", crawlMethod: string = "Direct Crawler"): any {
  // 1. Current Title tag
  const titleTag = $("title").text().trim() || 
                   $("meta[property='og:title']").attr("content")?.trim() || 
                   $("meta[name='twitter:title']").attr("content")?.trim() || "";

  // 2. Current Meta Description
  const metaDescription = $("meta[name='description']").attr("content")?.trim() || 
                          $("meta[property='og:description']").attr("content")?.trim() || 
                          $("meta[name='twitter:description']").attr("content")?.trim() || "";

  // 3. Current H1
  const h1List: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1List.push(text);
  });
  const h1 = h1List.length > 0 ? h1List[0] : (titleTag || "");

  // 4. Current H2s
  const h2s: string[] = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !h2s.includes(text)) h2s.push(text);
  });

  // 5. Current H3s
  const h3s: string[] = [];
  $("h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text && !h3s.includes(text)) h3s.push(text);
  });

  // 6. Schema markup
  const schemaMarkup: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      const parsed = tryParseJSON(text);
      if (parsed) {
        schemaMarkup.push(parsed);
      }
    }
  });

  // 7. Dates
  let publishedDate = $("meta[property='article:published_time']").attr("content") ||
                      $("meta[name='publish-date']").attr("content") ||
                      $("meta[name='pubdate']").attr("content") ||
                      $("meta[property='og:article:published_time']").attr("content") || 
                      $("time[datetime]").attr("datetime") || "";

  let lastModifiedDate = $("meta[property='article:modified_time']").attr("content") ||
                         $("meta[name='last-modified']").attr("content") ||
                         $("meta[property='og:article:modified_time']").attr("content") || "";

  // Recursive search in structured schemas for dates if missing
  if (!publishedDate || !lastModifiedDate) {
    const searchDateInSchema = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      if (obj.datePublished && !publishedDate) publishedDate = obj.datePublished;
      if (obj.dateModified && !lastModifiedDate) lastModifiedDate = obj.dateModified;
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          searchDateInSchema(obj[key]);
        }
      }
    };
    schemaMarkup.forEach((s) => searchDateInSchema(s));
  }

  // 8. Main Content Parsing & Word Count
  let $contentArea = $("article");
  if ($contentArea.length === 0) {
    $contentArea = $("main");
  }
  if ($contentArea.length === 0) {
    $contentArea = $("#content, .content, #main, .main, .post, .entry, .article-body, .article-content, #article-body, .blog-post, .post-content");
  }
  if ($contentArea.length === 0) {
    $contentArea = $("body");
  }

  const cleanContent = $contentArea.clone();
  cleanContent.find("script, style, nav, header, footer, iframe, noscript, form, aside, .header, .footer, .sidebar, .comments, #sidebar, .related-posts, .share-buttons, .author-box, svg").remove();
  
  const mainContent = cleanContent.text().trim().replace(/\s+/g, " ");
  const words = mainContent.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;

  // 9. Links (Internal / External)
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  let hostname = "";
  try {
    if (sourceUrl.startsWith("http")) {
      hostname = new URL(sourceUrl).hostname;
    }
  } catch (_) {}

  $("a").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href) return;
    if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    if (href.startsWith("/") || href.startsWith("./") || href.startsWith("../") || !href.includes("://")) {
      try {
        if (sourceUrl.startsWith("http")) {
          const resolved = new URL(href, sourceUrl).href;
          if (!internalLinks.includes(resolved)) internalLinks.push(resolved);
        } else {
          if (!internalLinks.includes(href)) internalLinks.push(href);
        }
      } catch (_) {
        if (!internalLinks.includes(href)) internalLinks.push(href);
      }
    } else {
      try {
        const checkUrl = new URL(href);
        if (hostname && (checkUrl.hostname === hostname || checkUrl.hostname.endsWith("." + hostname))) {
          if (!internalLinks.includes(href)) internalLinks.push(href);
        } else {
          if (!externalLinks.includes(href)) externalLinks.push(href);
        }
      } catch (_) {
        if (!externalLinks.includes(href)) externalLinks.push(href);
      }
    }
  });

  // 10. Images and alt text
  const images: { src: string; alt: string }[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src")?.trim() || $(el).attr("data-src")?.trim() || "";
    const alt = $(el).attr("alt")?.trim() || "";
    if (src) {
      let resolvedSrc = src;
      try {
        if (sourceUrl.startsWith("http")) {
          resolvedSrc = new URL(src, sourceUrl).href;
        }
      } catch (_) {}
      if (images.length < 30) {
        images.push({ src: resolvedSrc, alt });
      }
    }
  });

  return {
    url: sourceUrl,
    httpStatus: 200,
    crawlMethod,
    title: titleTag,
    metaDescription,
    h1,
    h2s,
    h3s,
    wordCount,
    mainContent: mainContent.substring(0, 15000),
    internalLinks: internalLinks.slice(0, 50),
    externalLinks: externalLinks.slice(0, 50),
    images,
    publishedDate,
    lastModifiedDate,
    schemaMarkup: schemaMarkup.length > 0 ? JSON.stringify(schemaMarkup, null, 2) : "",
  };
}

// -------------------------------------------------------------
// Helper: Fetch URL using Jina AI Reader
// -------------------------------------------------------------
async function fetchViaJinaAI(targetUrl: string): Promise<any> {
  // Prefix format: https://r.jina.ai/https://example.com/page
  const formattedTarget = targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`;
  const jinaEndpoint = `https://r.jina.ai/${formattedTarget}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 20000); // 20s timeout for Jina

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "X-Return-Format": "markdown",
    "X-With-Generated-Alt": "true",
    "User-Agent": "Bulk-SEO-Refresh-Engine/1.0",
  };

  // Support Jina AI API Key if configured in environment
  if (process.env.JINA_API_KEY && process.env.JINA_API_KEY.trim().length > 0) {
    headers["Authorization"] = `Bearer ${process.env.JINA_API_KEY.trim()}`;
  }

  try {
    const response = await fetch(jinaEndpoint, {
      signal: controller.signal,
      headers,
    });
    clearTimeout(id);

    if (!response.ok) {
      // Try text fallback if JSON format is rejected or fails
      const fallbackHeaders: Record<string, string> = {
        "Accept": "text/plain",
        "X-Return-Format": "markdown",
      };
      if (process.env.JINA_API_KEY && process.env.JINA_API_KEY.trim().length > 0) {
        fallbackHeaders["Authorization"] = `Bearer ${process.env.JINA_API_KEY.trim()}`;
      }

      const textResponse = await fetch(jinaEndpoint, {
        headers: fallbackHeaders,
      });
      if (!textResponse.ok) {
        throw new Error(`Jina AI Reader returned HTTP ${textResponse.status} for ${formattedTarget}`);
      }
      const rawMarkdown = await textResponse.text();
      return parseMarkdownSEO(rawMarkdown, formattedTarget);
    }

    const json = await response.json();
    const data = json.data || json;
    const title = data.title || "";
    const description = data.description || "";
    const content = data.content || "";

    // Extract headings from markdown content
    const h2s: string[] = [];
    const h3s: string[] = [];
    let h1 = title;

    const lines = content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ") && !h1) {
        h1 = trimmed.replace(/^#\s+/, "").trim();
      } else if (trimmed.startsWith("## ")) {
        const h2 = trimmed.replace(/^##\s+/, "").trim();
        if (h2 && !h2s.includes(h2)) h2s.push(h2);
      } else if (trimmed.startsWith("### ")) {
        const h3 = trimmed.replace(/^###\s+/, "").trim();
        if (h3 && !h3s.includes(h3)) h3s.push(h3);
      }
    }

    // Extract links from markdown [text](url)
    const linkMatches = content.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g) || [];
    const internalLinks: string[] = [];
    const externalLinks: string[] = [];
    let hostname = "";
    try {
      hostname = new URL(targetUrl).hostname;
    } catch (_) {}

    linkMatches.forEach((linkStr: string) => {
      const match = linkStr.match(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/);
      if (match && match[2]) {
        const href = match[2];
        try {
          const u = new URL(href);
          if (hostname && (u.hostname === hostname || u.hostname.endsWith("." + hostname))) {
            if (!internalLinks.includes(href) && internalLinks.length < 50) internalLinks.push(href);
          } else {
            if (!externalLinks.includes(href) && externalLinks.length < 50) externalLinks.push(href);
          }
        } catch (_) {}
      }
    });

    // Extract images from markdown ![alt](src)
    const imgMatches = content.match(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g) || [];
    const images: { src: string; alt: string }[] = [];
    imgMatches.forEach((imgStr: string) => {
      const match = imgStr.match(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/);
      if (match && match[2] && images.length < 30) {
        images.push({ alt: match[1] || "", src: match[2] });
      }
    });

    const cleanWords = content.split(/\s+/).filter((w: string) => w.length > 0);

    return {
      url: targetUrl,
      httpStatus: 200,
      crawlMethod: "Jina AI Reader",
      title: title || h1,
      metaDescription: description,
      h1: h1 || title,
      h2s,
      h3s,
      wordCount: cleanWords.length,
      mainContent: content.substring(0, 15000),
      internalLinks,
      externalLinks,
      images,
      publishedDate: data.publishedTime || "",
      lastModifiedDate: "",
      schemaMarkup: "",
    };
  } catch (err: any) {
    clearTimeout(id);
    throw err;
  }
}

function parseMarkdownSEO(markdown: string, targetUrl: string): any {
  const lines = markdown.split("\n");
  let title = "";
  let h1 = "";
  const h2s: string[] = [];
  const h3s: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("Title:") && !title) {
      title = trimmed.replace(/^Title:\s*/, "").trim();
    } else if (trimmed.startsWith("# ") && !h1) {
      h1 = trimmed.replace(/^#\s+/, "").trim();
    } else if (trimmed.startsWith("## ")) {
      const h2 = trimmed.replace(/^##\s+/, "").trim();
      if (h2 && !h2s.includes(h2)) h2s.push(h2);
    } else if (trimmed.startsWith("### ")) {
      const h3 = trimmed.replace(/^###\s+/, "").trim();
      if (h3 && !h3s.includes(h3)) h3s.push(h3);
    }
  }

  const words = markdown.split(/\s+/).filter((w) => w.length > 0);

  return {
    url: targetUrl,
    httpStatus: 200,
    crawlMethod: "Jina AI Reader",
    title: title || h1,
    metaDescription: "",
    h1: h1 || title,
    h2s,
    h3s,
    wordCount: words.length,
    mainContent: markdown.substring(0, 15000),
    internalLinks: [],
    externalLinks: [],
    images: [],
    publishedDate: "",
    lastModifiedDate: "",
    schemaMarkup: "",
  };
}

// -------------------------------------------------------------
// Crawling and SEO elements Extraction
// -------------------------------------------------------------
app.post("/api/crawl", async (req: express.Request, res: express.Response) => {
  const { url, forceJina } = req.body;

  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  let formattedUrl = url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = "https://" + formattedUrl;
  }

  // If user requested Jina AI directly:
  if (forceJina) {
    try {
      const jinaData = await fetchViaJinaAI(formattedUrl);
      res.json({
        success: true,
        httpStatus: 200,
        data: jinaData,
      });
      return;
    } catch (jinaErr: any) {
      res.json({
        success: false,
        error: `Jina AI Reader failed: ${jinaErr.message || "Unknown error"}`,
      });
      return;
    }
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    const fetchResponse = await fetch(formattedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(id);

    const httpStatus = fetchResponse.status;
    if (!fetchResponse.ok) {
      // Auto-fallback to Jina AI Reader if direct scrape gets blocked (403, 401, 503, 429, etc.)
      console.log(`Direct fetch returned ${httpStatus} for ${formattedUrl}. Attempting Jina AI Reader fallback...`);
      try {
        const jinaData = await fetchViaJinaAI(formattedUrl);
        res.json({
          success: true,
          httpStatus: 200,
          data: jinaData,
        });
        return;
      } catch (jinaErr) {
        res.json({
          success: false,
          httpStatus,
          error: `Failed to fetch page directly (Status ${httpStatus}) and Jina AI fallback could not reach it.`,
        });
        return;
      }
    }

    const htmlText = await fetchResponse.text();
    const $ = cheerio.load(htmlText);
    const seoData = extractSEOFromCheerio($, formattedUrl, "Direct Crawler");

    res.json({
      success: true,
      httpStatus,
      data: seoData,
    });
  } catch (error: any) {
    // Network error or timeout — try Jina AI Reader fallback before failing!
    console.log(`Direct fetch error (${error.message}) for ${formattedUrl}. Attempting Jina AI Reader fallback...`);
    try {
      const jinaData = await fetchViaJinaAI(formattedUrl);
      res.json({
        success: true,
        httpStatus: 200,
        data: jinaData,
      });
    } catch (jinaErr: any) {
      res.json({
        success: false,
        error: error.message || "Failed to make HTTP request to crawl target URL.",
      });
    }
  }
});

// -------------------------------------------------------------
// Parse Raw HTML Text or Uploaded HTML File
// -------------------------------------------------------------
app.post("/api/parse-html", (req: express.Request, res: express.Response) => {
  const { html, url, fileName } = req.body;

  if (!html || typeof html !== "string") {
    res.status(400).json({ error: "HTML content string is required" });
    return;
  }

  try {
    const rawTrimmed = html.trim();
    const targetName = url || fileName || "Pasted-HTML-Document";

    // If it looks like HTML (has tags)
    if (rawTrimmed.includes("<") && rawTrimmed.includes(">")) {
      const $ = cheerio.load(rawTrimmed);
      const seoData = extractSEOFromCheerio($, targetName, fileName ? `File: ${fileName}` : "Raw HTML Input");
      res.json({ success: true, data: seoData });
    } else {
      // Plain text or markdown
      const lines = rawTrimmed.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      const title = lines[0] || targetName;
      const h1 = lines[0] || "";
      const h2s: string[] = [];
      const h3s: string[] = [];
      
      lines.forEach(l => {
        if (l.startsWith("## ")) h2s.push(l.replace(/^##\s+/, ""));
        else if (l.startsWith("### ")) h3s.push(l.replace(/^###\s+/, ""));
      });

      const words = rawTrimmed.split(/\s+/).filter(w => w.length > 0);

      res.json({
        success: true,
        data: {
          url: targetName,
          httpStatus: 200,
          crawlMethod: "Raw Text / Markdown",
          title,
          metaDescription: lines.length > 1 ? lines[1].substring(0, 160) : "",
          h1,
          h2s,
          h3s,
          wordCount: words.length,
          mainContent: rawTrimmed.substring(0, 15000),
          internalLinks: [],
          externalLinks: [],
          images: [],
          publishedDate: "",
          lastModifiedDate: "",
          schemaMarkup: "",
        },
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to parse HTML: " + err.message });
  }
});

// -------------------------------------------------------------
// SEO Analysis using Gemini-3.5-flash
// -------------------------------------------------------------
app.post("/api/analyze", async (req: express.Request, res: express.Response) => {
  const { seoData } = req.body;

  if (!seoData) {
    res.status(400).json({ error: "SEO extracted data is required for analysis." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    res.status(500).json({
      error: "Gemini API key is not configured. Please add the GEMINI_API_KEY environment variable in 'Settings > Secrets' on your AI Studio console.",
    });
    return;
  }

  try {
    // 1. Lazy initialize GoogleGenAI with specific target headers for tracking
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // 2. Prepare structured representation of the crawl/pasted inputs
    const title = seoData.title || "";
    const metaDescription = seoData.metaDescription || "";
    const h1 = seoData.h1 || "";
    const h2s = Array.isArray(seoData.h2s) ? seoData.h2s.join(", ") : (seoData.h2s || "");
    const h3s = Array.isArray(seoData.h3s) ? seoData.h3s.join(", ") : (seoData.h3s || "");
    const wordCount = seoData.wordCount || 0;
    const internalLinks = Array.isArray(seoData.internalLinks) ? seoData.internalLinks.join(", ") : (seoData.internalLinks || "");
    const externalLinks = Array.isArray(seoData.externalLinks) ? seoData.externalLinks.join(", ") : (seoData.externalLinks || "");
    
    let imagesSummary = "";
    if (Array.isArray(seoData.images)) {
      imagesSummary = seoData.images.map((img: any) => `[Src: ${img.src}, Alt: ${img.alt}]`).join("; ");
    } else {
      imagesSummary = seoData.images || "";
    }

    const publishedDate = seoData.publishedDate || "N/A";
    const lastModifiedDate = seoData.lastModifiedDate || "N/A";
    const schemaMarkup = seoData.schemaMarkup || "None detected";
    const mainContent = seoData.mainContent || "";

    const userPrompt = `You are a senior SEO strategist for a travel marketplace.

Analyze this blog page for SEO refresh opportunities.

URL: ${seoData.url || "N/A"}

Extracted SEO Data:
Title Tag: ${title}
Meta Description: ${metaDescription}
H1: ${h1}
H2s: ${h2s}
H3s: ${h3s}
Word Count: ${wordCount}
Internal Links: ${internalLinks}
External Links: ${externalLinks}
Image Alt Text: ${imagesSummary}
Published Date: ${publishedDate}
Last Modified Date: ${lastModifiedDate}
Schema Markup: ${schemaMarkup}

Main Page Content:
${mainContent}

Please return structured recommendations for:

1. Search intent
2. Content summary
3. Missing topics
4. Missing entities
5. Missing destinations, landmarks, attractions, or neighborhoods
6. FAQ opportunities
7. Internal link opportunities
8. Freshness issues
9. E-E-A-T opportunities
10. Conversion opportunities
11. Improved meta title
12. Improved meta description
13. Suggested H2/H3 improvements
14. Schema recommendations
15. Priority score from 1–10
16. Recommended action

Focus on travel content, local expertise, E-E-A-T, semantic SEO, entity coverage, internal linking, freshness, and conversion opportunities.

Return the answer as clean structured JSON.`;

    // 3. Set up schema constraints
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        searchIntent: { type: Type.STRING, description: "Detailed summary of intent satisfying target audience searches" },
        contentSummary: { type: Type.STRING, description: "Quick, concise summary of the page theme" },
        missingTopics: { type: Type.STRING, description: "High value topics and questions currently omitted" },
        missingEntities: { type: Type.STRING, description: "Entities, products, tours, or general structured topics missing" },
        missingDestinations: { type: Type.STRING, description: "Specific neighborhoods, hotels, parks, streets, or attractions omitted" },
        faqOpportunities: { type: Type.STRING, description: "Target customer FAQs to capture longtail snippet/PPA queries" },
        internalLinkOpportunities: { type: Type.STRING, description: "Internal links recommendations with recommended anchors" },
        freshnessIssues: { type: Type.STRING, description: "Identified outdated years, references or content items" },
        eeatOpportunities: { type: Type.STRING, description: "Ideas to lift author expertise guidelines, photos, mapping details" },
        conversionOpportunities: { type: Type.STRING, description: "Improve CTA placement, highlight travel offerings, packages, or email updates forms" },
        improvedMetaTitle: { type: Type.STRING, description: "An optimized and highly engaging SEO title (< 60 chars)" },
        improvedMetaDescription: { type: Type.STRING, description: "An optimized CTR-maximizing meta description (< 160 chars)" },
        suggestedHeadingImprovements: { type: Type.STRING, description: "Better structured h2s/h3s suggestion text" },
        schemaRecommendations: { type: Type.STRING, description: "Schema.org structured data types that should be implemented" },
        priorityScore: { type: Type.INTEGER, description: "1-10 priority SEO impact action index" },
        recommendedAction: { type: Type.STRING, description: "Recommended overall fix type (e.g., Complete Rewrite, Minor Content Update, Technical SEO Fix Only, Merge with another post, No Action)" },
      },
      required: [
        "searchIntent",
        "contentSummary",
        "missingTopics",
        "missingEntities",
        "missingDestinations",
        "faqOpportunities",
        "internalLinkOpportunities",
        "freshnessIssues",
        "eeatOpportunities",
        "conversionOpportunities",
        "improvedMetaTitle",
        "improvedMetaDescription",
        "suggestedHeadingImprovements",
        "schemaRecommendations",
        "priorityScore",
        "recommendedAction",
      ],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.2, // low temperature for precise factual extraction
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty model response received from Gemini.");
    }

    const parsedData = tryParseJSON(outputText);
    if (!parsedData) {
      res.json({
        success: false,
        error: "Failed to parse JSON recommendations out of Gemini's returned text.",
        rawText: outputText,
      });
      return;
    }

    res.json({
      success: true,
      recommendations: parsedData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "SEO analysis via Gemini failed." });
  }
});

// -------------------------------------------------------------
// Full Content Writer / Article Generator using Gemini
// -------------------------------------------------------------
app.post("/api/generate-full-content", async (req: express.Request, res: express.Response) => {
  const { seoData, recommendations, tone, targetLength, customPrompt, includeFaqSchema, includeCta } = req.body;

  if (!seoData && !recommendations) {
    res.status(400).json({ error: "SEO analysis recommendations or page data required to write full article." });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    res.status(500).json({
      error: "Gemini API key is not configured. Please add the GEMINI_API_KEY environment variable in Settings > Secrets.",
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const pageUrl = seoData?.url || recommendations?.improvedMetaTitle || "Travel Guide";
    const originalContent = seoData?.mainContent || "";
    const recs = recommendations || {};

    const promptText = `You are a world-class travel writer, senior SEO content strategist, and local tour specialist.

Your task is to write the COMPLETE, PUBLICATION-READY, FULLY REFRESHED ARTICLE based on the detailed SEO audit findings below.

Do NOT provide an outline or summary — WRITE THE ENTIRE COMPREHENSIVE ARTICLE IN FULL.

PAGE CONTEXT:
Target URL / Topic: ${pageUrl}
Tone: ${tone || "Authoritative Local Guide & Engaging Travel Storyteller"}
Length Target: ${targetLength === "comprehensive" ? "Long-form In-Depth (2,000+ words)" : targetLength === "concise" ? "Concise (800-1,200 words)" : "Standard In-Depth (1,400-2,000 words)"}
Custom Instructions: ${customPrompt || "Incorporate all SEO audit findings seamlessly into rich, engaging prose."}

SEO AUDIT FINDINGS TO APPLY:
- Target Search Intent: ${recs.searchIntent || "Travelers looking for authentic local guide experiences"}
- Optimized Meta Title: ${recs.improvedMetaTitle || seoData?.title || ""}
- Optimized Meta Description: ${recs.improvedMetaDescription || seoData?.metaDescription || ""}
- Missing Topics to Include: ${recs.missingTopics || "None specified"}
- Missing Entities to Cover: ${recs.missingEntities || "None specified"}
- Missing Destinations & Landmarks: ${recs.missingDestinations || "None specified"}
- Suggested Headings Structure: ${recs.suggestedHeadingImprovements || "Use descriptive, keyword-rich H2 and H3 tags"}
- E-E-A-T Opportunities: ${recs.eeatOpportunities || "Inject local insider advice, practical logistics, author expertise, timing tips"}
- FAQ Opportunities: ${recs.faqOpportunities || "Top traveler questions with clear, actionable answers"}
- Internal Link Opportunities: ${recs.internalLinkOpportunities || "Relevant tour categories and city guide pages"}
- Freshness Updates: ${recs.freshnessIssues || "Current year best practices"}
- Conversion Opportunities: ${recs.conversionOpportunities || "Clear callouts for booking private or local guided tours"}

ORIGINAL PAGE CONTENT (for reference):
${originalContent.substring(0, 10000)}

CONTENT WRITING RULES:
1. Start with the optimized # H1 Title.
2. Provide an engaging, hook-filled introduction that immediately addresses the search intent and demonstrates E-E-A-T.
3. Structure with clear ## H2 and ### H3 sections covering every single missing topic, entity, neighborhood, and practical tip identified.
4. Include authentic "Insider Local Tips", practical advice (best time to visit, transit tips, hidden gem recommendations, local etiquette).
5. Naturally embed contextual internal link anchor recommendations formatted as markdown links: [Anchor Text](https://example.com/recommended-link).
6. Include a dedicated "## Frequently Asked Questions" section with thorough answers.
7. Include compelling Call-to-Action (CTA) boxes for travelers to explore local guide tours.
8. If includeFaqSchema is enabled, generate a valid Schema.org FAQPage JSON-LD snippet in the schema field.

Return your response strictly as JSON with this schema:
{
  "title": "Final optimized article title",
  "metaDescription": "Final optimized meta description",
  "content": "Full markdown text of the complete article (including all H1, H2, H3, paragraphs, bullet points, insider tips, FAQs, and CTAs)",
  "keyImprovementsIncluded": ["List of 4-6 specific SEO audit improvements applied"],
  "faqSchemaJson": "<script type=\\"application/ld+json\\">{ ... }</script>"
}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Final title of the rewritten article" },
        metaDescription: { type: Type.STRING, description: "Final meta description" },
        content: { type: Type.STRING, description: "The full, complete markdown article text" },
        keyImprovementsIncluded: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Key audit points solved in this full draft",
        },
        faqSchemaJson: { type: Type.STRING, description: "Valid JSON-LD script for FAQPage schema" },
      },
      required: ["title", "metaDescription", "content", "keyImprovementsIncluded"],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.4,
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("Empty model response received from Gemini.");
    }

    const parsed = tryParseJSON(outputText);
    if (!parsed || !parsed.content) {
      throw new Error("Failed to parse full article content from Gemini.");
    }

    // Calculate word count & reading time
    const words = parsed.content.split(/\s+/).filter((w: string) => w.length > 0);
    const wordCount = words.length;
    const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    res.json({
      success: true,
      article: {
        title: parsed.title || recs.improvedMetaTitle || "Refreshed Travel Guide",
        metaDescription: parsed.metaDescription || recs.improvedMetaDescription || "",
        content: parsed.content,
        wordCount,
        readingTimeMinutes,
        faqSchemaJson: parsed.faqSchemaJson || "",
        keyImprovementsIncluded: parsed.keyImprovementsIncluded || [],
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate full article with Gemini." });
  }
});

// -------------------------------------------------------------
// Vite or Production Handling
// -------------------------------------------------------------
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start backend server:", err);
});

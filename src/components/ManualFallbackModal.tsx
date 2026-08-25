import React, { useState, useEffect, useRef } from "react";
import { X, FileText, AlertCircle, Sparkles, Upload, Zap, Code, CheckCircle, RefreshCw, Layers } from "lucide-react";
import { SEOPageItem, CrawledSEOData } from "../types";

const PROXY_BASE = "https://gemini-proxy-boldstudio.vercel.app/api";

interface ManualFallbackModalProps {
  item: SEOPageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, manualData: CrawledSEOData) => void;
  onRetryJina?: (item: SEOPageItem) => Promise<void>;
}

export default function ManualFallbackModal({
  item,
  isOpen,
  onClose,
  onSubmit,
  onRetryJina,
}: ManualFallbackModalProps) {
  const [activeTab, setActiveTab] = useState<"html" | "jina" | "fields">("html");
  
  // Raw HTML input & file state
  const [rawHtml, setRawHtml] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isJinaFetching, setIsJinaFetching] = useState(false);
  const [jinaError, setJinaError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extracted elements state
  const [title, setTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [h1, setH1] = useState("");
  const [h2sText, setH2sText] = useState("");
  const [h3sText, setH3sText] = useState("");
  const [mainContent, setMainContent] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [lastModifiedDate, setLastModifiedDate] = useState("");
  const [schemaMarkup, setSchemaMarkup] = useState("");
  const [crawlMethod, setCrawlMethod] = useState("Raw HTML Input");
  const [parsedSummary, setParsedSummary] = useState<{
    wordCount: number;
    h2Count: number;
    h3Count: number;
    hasSchema: boolean;
    hasDesc: boolean;
  } | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      setTitle(item.seoData?.title || "");
      setMetaDescription(item.seoData?.metaDescription || "");
      setH1(item.seoData?.h1 || "");
      setH2sText(item.seoData?.h2s?.join("\n") || "");
      setH3sText(item.seoData?.h3s?.join("\n") || "");
      setMainContent(item.seoData?.mainContent || "");
      setPublishedDate(item.seoData?.publishedDate || "");
      setLastModifiedDate(item.seoData?.lastModifiedDate || "");
      setSchemaMarkup(item.seoData?.schemaMarkup || "");
      setCrawlMethod(item.seoData?.crawlMethod || "Raw HTML Input");
      setRawHtml("");
      setFileName("");
      setParsedSummary(null);
      setJinaError("");
      setActiveTab("html");
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  // Process and parse HTML text via backend
  const parseHtmlContent = async (htmlToParse: string, name?: string) => {
    if (!htmlToParse.trim()) return null;
    setIsParsing(true);
    try {
      const response = await fetch(`${PROXY_BASE}/bulk-parse-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: htmlToParse,
          url: item.url,
          fileName: name || fileName,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        const d: CrawledSEOData = result.data;
        setTitle(d.title || "");
        setMetaDescription(d.metaDescription || "");
        setH1(d.h1 || "");
        setH2sText(d.h2s?.join("\n") || "");
        setH3sText(d.h3s?.join("\n") || "");
        setMainContent(d.mainContent || "");
        setPublishedDate(d.publishedDate || "");
        setLastModifiedDate(d.lastModifiedDate || "");
        setSchemaMarkup(d.schemaMarkup || "");
        setCrawlMethod(d.crawlMethod || (name ? `File: ${name}` : "Raw HTML Input"));

        setParsedSummary({
          wordCount: d.wordCount || 0,
          h2Count: d.h2s?.length || 0,
          h3Count: d.h3s?.length || 0,
          hasSchema: !!d.schemaMarkup,
          hasDesc: !!d.metaDescription,
        });
        return d;
      }
    } catch (err) {
      console.error("Failed to parse HTML:", err);
    } finally {
      setIsParsing(false);
    }
    return null;
  };

  // Handle file upload
  const handleFileChange = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setRawHtml(text);
      await parseHtmlContent(text, file.name);
    };
    reader.readAsText(file);
  };

  // Handle Jina AI Reader fetch
  const handleFetchWithJina = async () => {
    setIsJinaFetching(true);
    setJinaError("");
    try {
      const response = await fetch(`${PROXY_BASE}/bulk-crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, forceJina: true }),
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        onSubmit(item.id, resJson.data);
        onClose();
        return;
      } else {
        setJinaError(resJson.error || "Jina AI could not retrieve this page.");
      }
    } catch (err: any) {
      setJinaError(err.message || "Failed to call Jina AI Reader");
    } finally {
      setIsJinaFetching(false);
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const h2s = h2sText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const h3s = h3sText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const words = mainContent.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;

    const manualData: CrawledSEOData = {
      url: item.url,
      httpStatus: 200,
      crawlMethod,
      title: title || item.url,
      metaDescription,
      h1: h1 || title,
      h2s,
      h3s,
      wordCount,
      mainContent,
      internalLinks: item.seoData?.internalLinks || [],
      externalLinks: item.seoData?.externalLinks || [],
      images: item.seoData?.images || [],
      publishedDate,
      lastModifiedDate,
      schemaMarkup,
    };

    onSubmit(item.id, manualData);
    onClose();
  };

  // Quick One-Click Submit from HTML
  const handleQuickHtmlSubmit = async () => {
    if (!title && !mainContent && rawHtml) {
      const parsed = await parseHtmlContent(rawHtml);
      if (parsed) {
        onSubmit(item.id, parsed);
        onClose();
        return;
      }
    }
    handleFormSubmit();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      id="manual-fallback-modal"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-8 border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-purple-50/50 border-b border-purple-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-purple-100 text-purple-900 rounded">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Crawl Fallback & HTML Ingest</h3>
              <p className="text-xs text-purple-900/70 font-mono truncate max-w-md">{item.url}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-purple-100/50 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-purple-100 bg-purple-50/20 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("html")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === "html"
                ? "bg-white text-purple-950 border-t-2 border-purple-900 shadow-xs"
                : "text-purple-900/60 hover:text-purple-950 hover:bg-purple-100/40"
            }`}
          >
            <Code className="h-3.5 w-3.5 text-purple-600" />
            Paste HTML / Upload File (Fastest)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("jina")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === "jina"
                ? "bg-white text-purple-950 border-t-2 border-purple-900 shadow-xs"
                : "text-purple-900/60 hover:text-purple-950 hover:bg-purple-100/40"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Retry with Jina AI Reader
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fields")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === "fields"
                ? "bg-white text-purple-950 border-t-2 border-purple-900 shadow-xs"
                : "text-purple-900/60 hover:text-purple-950 hover:bg-purple-100/40"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-purple-600" />
            Field Editor
          </button>
        </div>

        {/* Tab 1: Paste HTML / Upload File */}
        {activeTab === "html" && (
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="bg-purple-50/70 border border-purple-100 rounded-lg p-3 text-xs text-purple-900 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong>Zero manual typing needed:</strong> Simply paste raw HTML (e.g. from browser &apos;View Source&apos;) or drop an <code className="bg-purple-100 px-1 rounded">.html</code> file. The parser will automatically extract the Title, H1, H2s, H3s, metadata, word count, and content in 1 second!
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileChange(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-blue-400 bg-slate-50/60"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="h-6 w-6 text-slate-400" />
                <span className="text-xs font-semibold text-slate-700">
                  {fileName ? `File selected: ${fileName}` : "Drop .html, .htm, or .txt file here, or click to browse"}
                </span>
                <span className="text-[10px] text-slate-400">Supports full web page exports and raw markdown</span>
              </div>
            </div>

            {/* Paste HTML Box */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Or Paste Raw HTML / Page Source / Plain Text
                </label>
                {rawHtml && (
                  <button
                    type="button"
                    onClick={() => parseHtmlContent(rawHtml)}
                    disabled={isParsing}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {isParsing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Re-parse Content
                  </button>
                )}
              </div>
              <textarea
                rows={7}
                value={rawHtml}
                onChange={(e) => {
                  const val = e.target.value;
                  setRawHtml(val);
                  if (val.length > 50) {
                    parseHtmlContent(val);
                  }
                }}
                placeholder="<html><head><title>Your Blog Title</title>...</head><body><h1>...</h1><p>...</p></body></html>"
                className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
              />
            </div>

            {/* Extraction Preview Card */}
            {(parsedSummary || title || mainContent) && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    Auto-Extracted SEO Elements Preview
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {crawlMethod}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Extracted Title</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{title || "N/A"}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">H1 Tag</span>
                    <span className="font-semibold text-slate-800 line-clamp-1">{h1 || title || "N/A"}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Headings Found</span>
                    <span className="font-mono font-bold text-slate-800">
                      {h2sText ? h2sText.split("\n").filter(Boolean).length : 0} H2s • {h3sText ? h3sText.split("\n").filter(Boolean).length : 0} H3s
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Word Count</span>
                    <span className="font-mono font-bold text-slate-800">
                      {mainContent ? mainContent.split(/\s+/).filter(Boolean).length : 0} words
                    </span>
                  </div>
                </div>

                {metaDescription && (
                  <div className="bg-white p-2 rounded border border-slate-200 text-xs">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Meta Description</span>
                    <p className="text-slate-600 line-clamp-2 text-[11px]">{metaDescription}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Retry with Jina AI Reader */}
        {activeTab === "jina" && (
          <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                <Zap className="h-4 w-4 text-amber-600" />
                Jina AI Reader Crawler Engine
              </div>
              <p className="leading-relaxed">
                Jina AI Reader (<code className="font-mono bg-amber-100/70 px-1 py-0.5 rounded">https://r.jina.ai/{item.url}</code>) is a specialized engine designed to read and parse web content that normally blocks standard bots, has Cloudflare challenges, or requires JavaScript rendering.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">Target Page URL:</span>
                <span className="font-mono font-semibold text-slate-800 break-all bg-white px-2.5 py-1.5 rounded border border-slate-200 block">
                  {item.url}
                </span>
              </div>

              {jinaError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{jinaError}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleFetchWithJina}
                disabled={isJinaFetching}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isJinaFetching ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Fetching and Parsing with Jina AI Reader...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 text-amber-300" />
                    Fetch and Analyze with Jina AI Reader
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Individual Fields Editor */}
        {activeTab === "fields" && (
          <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Title Tag
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 10 Best Rome Food Tours | Travel Marketplace"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  H1 Heading
                </label>
                <input
                  type="text"
                  value={h1}
                  onChange={(e) => setH1(e.target.value)}
                  placeholder="e.g. Rome Food Tours: Eat Like a Local"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Meta Description
              </label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="e.g. Discover the most delicious food tours in Rome with local expert guides..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  H2 Headings (One per line)
                </label>
                <textarea
                  rows={3}
                  value={h2sText}
                  onChange={(e) => setH2sText(e.target.value)}
                  placeholder="Why Take a Food Tour in Rome?&#10;What You Will Eat&#10;Top Rome Tours"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  H3 Headings (One per line)
                </label>
                <textarea
                  rows={3}
                  value={h3sText}
                  onChange={(e) => setH3sText(e.target.value)}
                  placeholder="Trastevere District Food Walks&#10;Jewish Ghetto Culinary Journey"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Main Article Content
              </label>
              <textarea
                rows={6}
                required
                value={mainContent}
                onChange={(e) => setMainContent(e.target.value)}
                placeholder="Paste the full blog post text material here..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="bg-purple-50/30 border-t border-purple-100 px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab === "html" && (
              <button
                type="button"
                onClick={handleQuickHtmlSubmit}
                disabled={isParsing || (!rawHtml && !mainContent && !title)}
                className="px-5 py-2 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Extract & Run AI Refresh
              </button>
            )}

            {activeTab === "fields" && (
              <button
                type="button"
                onClick={() => handleFormSubmit()}
                disabled={!mainContent && !title}
                className="px-5 py-2 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Analyze Saved Fields
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

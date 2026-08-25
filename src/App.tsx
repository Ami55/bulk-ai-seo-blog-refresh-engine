import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Globe, Database, ListPlus, Trash2, 
  HelpCircle, CheckCircle, AlertCircle, RefreshCw, Compass,
  Upload, Code, Zap, FileText, Building2, User, Users, ChevronRight, ChevronDown, ArrowRight
} from "lucide-react";
import { SEOPageItem, CrawledSEOData, AIRecommendations } from "./types";
import Header from "./components/Header";
import ResultsTable from "./components/ResultsTable";
import PageDetailPanel from "./components/PageDetailPanel";
import ManualFallbackModal from "./components/ManualFallbackModal";

const PROXY_BASE = "https://gemini-proxy-boldstudio.vercel.app/api";

export default function App() {
  // Main state - preloaded from local storage if existing
  const [items, setItems] = useState<SEOPageItem[]>(() => {
    try {
      const saved = localStorage.getItem("bulk_seo_ref_engine_items");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [inputTab, setInputTab] = useState<"urls" | "html">("urls");
  const [rawUrlsInput, setRawUrlsInput] = useState("");
  const [rawHtmlInput, setRawHtmlInput] = useState("");
  const [activeItem, setActiveItem] = useState<SEOPageItem | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualModalItem, setManualModalItem] = useState<SEOPageItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFilesSummary, setUploadedFilesSummary] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize items back to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bulk_seo_ref_engine_items", JSON.stringify(items));
    } catch (_) {}
  }, [items]);

  // Additional entity state for rich E-E-A-T grounding
  const [brandName, setBrandName] = useState("");
  const [industryVertical, setIndustryVertical] = useState("Travel, Tours & Experiences");
  const [targetMarket, setTargetMarket] = useState("United States / Global");
  const [mainOffering, setMainOffering] = useState("");
  const [executiveName, setExecutiveName] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load sample data helper matching the screenshot style
  const handleLoadSampleUrls = () => {
    setBrandName("GetYourGuide & Viator Guides");
    setIndustryVertical("Travel & Guided Experiences");
    setTargetMarket("United States & Europe");
    setMainOffering("Curated city food walks, skip-the-line monument tours, and local experiences with verified expert guides.");
    setExecutiveName("Johannes Reck, CEO");
    setAuthorName("Dr. Marco Rossi, Senior Roman Historian");
    setCompetitors("tripadvisor.com, viator.com, withlocals.com");
    const samples = [
      "https://en.wikipedia.org/wiki/Colosseum",
      "https://en.wikipedia.org/wiki/Sistine_Chapel",
      "https://en.wikipedia.org/wiki/Eiffel_Tower",
      "https://en.wikipedia.org/wiki/Louvre",
    ];
    setRawUrlsInput(samples.join("\n"));
    setInputTab("urls");
  };

  // Load sample HTML
  const handleLoadSampleHtml = () => {
    const sampleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>10 Best Hidden Rome Food Tours & Secret Culinary Spots</title>
  <meta name="description" content="Discover authentic Roman cuisine with local foodie guides. From secret Trastevere pasta spots to artisan gelato tastings and historic Jewish Ghetto food walks.">
</head>
<body>
  <h1>The Ultimate Guide to Rome Food Tours (2025 Edition)</h1>
  <p>Rome is one of the culinary capitals of the world. While millions of tourists visit every year to taste carbonara and pizza al taglio, finding authentic neighborhood trattorias requires insider knowledge.</p>
  
  <h2>Why Take a Guided Food Tour in Rome?</h2>
  <p>Exploring Rome with a local culinary expert unlocks centuries-old family recipes, artisan markets, and authentic wine cellars that tourists rarely find on their own.</p>
  
  <h2>Top Neighborhoods for Foodies</h2>
  <h3>1. Trastevere Culinary Walk</h3>
  <p>Walk the cobblestone alleys of Trastevere to taste crisp suppli, fresh cacio e pepe, and traditional Roman porchetta.</p>
  
  <h3>2. Jewish Ghetto & Campo de' Fiori</h3>
  <p>Sample crispy carciofi alla giudia (deep-fried artichokes) and fresh produce in Rome's oldest market.</p>
  
  <h2>What's Included in a Marketplace Experience</h2>
  <p>All tastings, wine pairings, local expert commentary, and dietary accommodations.</p>
</body>
</html>`;
    setRawHtmlInput(sampleHtml);
    setInputTab("html");
  };

  // Clear all list entries
  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear your entire sitemap index?")) {
      setItems([]);
      setRawUrlsInput("");
      setRawHtmlInput("");
      setActiveItem(null);
    }
  };

  // Retry with Jina AI Reader
  const handleRetryWithJina = async (item: SEOPageItem) => {
    setItems((current) =>
      current.map((i) =>
        i.id === item.id ? { ...i, status: "Crawling", errorMessage: undefined } : i
      )
    );

    let seoData: CrawledSEOData | undefined;

    try {
      const crawlRes = await fetch(`${PROXY_BASE}/bulk-crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, forceJina: true }),
      });

      const crawlResult = await crawlRes.json();
      if (!crawlResult.success || !crawlResult.data) {
        throw new Error(crawlResult.error || "Jina AI Reader could not fetch this page.");
      }

      seoData = crawlResult.data;

      setItems((current) =>
        current.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "Analyzing",
                seoData,
                httpStatus: 200,
                crawlMethod: "Jina AI Reader",
              }
            : i
        )
      );

      // Now run analysis
      const analyzeRes = await fetch(`${PROXY_BASE}/bulk-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoData }),
      });

      const analyzeResult = await analyzeRes.json();
      if (analyzeResult.success && analyzeResult.recommendations) {
        const completedItem = {
          ...item,
          status: "Complete" as const,
          seoData,
          httpStatus: 200,
          crawlMethod: "Jina AI Reader",
          recommendations: analyzeResult.recommendations,
          errorMessage: undefined,
        };
        setItems((current) =>
          current.map((i) => (i.id === item.id ? completedItem : i))
        );
        if (activeItem?.id === item.id) {
          setActiveItem(completedItem);
        }
      } else {
        throw new Error(analyzeResult.error || "Gemini SEO analysis failed.");
      }
    } catch (err: any) {
      setItems((current) =>
        current.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "Error",
                errorMessage: `Jina Retry Error: ${err.message || "Failed"}`,
              }
            : i
        )
      );
    }
  };

  // Submit manual meta elements block for failed items
  const handleManualDataSubmit = async (id: string, manualData: CrawledSEOData) => {
    // 1. Update the local row to analyzing
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Analyzing",
              errorMessage: undefined,
              seoData: manualData,
              httpStatus: 200,
              crawlMethod: manualData.crawlMethod || "Raw HTML Input",
            }
          : item
      )
    );

    // 2. Schedule immediate analysis
    try {
      const response = await fetch(`${PROXY_BASE}/bulk-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoData: manualData }),
      });

      if (!response.ok) {
        throw new Error(`Server API status error ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.recommendations) {
        setItems((current) =>
          current.map((item) => {
            if (item.id === id) {
              const completed = {
                ...item,
                status: "Complete" as const,
                recommendations: result.recommendations,
              };
              if (activeItem?.id === id) setActiveItem(completed);
              return completed;
            }
            return item;
          })
        );
      } else {
        throw new Error(result.error || "Failed to parse recommendations out of Gemini's returned text.");
      }
    } catch (err: any) {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "Error",
                errorMessage: err.message || "SEO analysis via Gemini failed.",
              }
            : item
        )
      );
    }
  };

  // Process a single item in our queue (crawls then analyzes)
  const processItemQueue = async (item: SEOPageItem) => {
    // Phase 1: Crawl URL (with automatic Jina AI Reader fallback on server)
    setItems((current) =>
      current.map((i) => (i.id === item.id ? { ...i, status: "Crawling" } : i))
    );

    let seoData: CrawledSEOData | undefined;

    try {
      const crawlRes = await fetch(`${PROXY_BASE}/bulk-crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url }),
      });

      if (!crawlRes.ok) {
        throw new Error(`Server returned HTTP code ${crawlRes.status}`);
      }

      const crawlResult = await crawlRes.json();
      if (!crawlResult.success) {
        throw new Error(crawlResult.error || "Failed to parse website HTML markup.");
      }

      seoData = crawlResult.data;
      
      // Update item with crawled data
      setItems((current) =>
        current.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "Analyzing",
                seoData,
                httpStatus: crawlResult.httpStatus || 200,
                crawlMethod: seoData?.crawlMethod || "Direct Crawler",
              }
            : i
        )
      );
    } catch (err: any) {
      // Crawling failed, mark with manual override instruction
      setItems((current) =>
        current.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "Error",
                httpStatus: "Blocked",
                errorMessage: "Could not fetch this page. Try Jina AI or paste raw HTML.",
              }
            : i
        )
      );
      return;
    }

    // Phase 2: Send data block to Gemini Flash for structured recommendations
    if (!seoData) return;

    try {
      const analyzeRes = await fetch(`${PROXY_BASE}/bulk-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoData }),
      });

      if (!analyzeRes.ok) {
        const errJson = await analyzeRes.json().catch(() => ({}));
        throw new Error(errJson.error || `Server analysis error ${analyzeRes.status}`);
      }

      const analyzeResult = await analyzeRes.json();
      if (analyzeResult.success && analyzeResult.recommendations) {
        setItems((current) =>
          current.map((i) => {
            if (i.id === item.id) {
              const completed = {
                ...i,
                status: "Complete" as const,
                recommendations: analyzeResult.recommendations,
              };
              if (activeItem?.id === item.id) setActiveItem(completed);
              return completed;
            }
            return i;
          })
        );
      } else {
        throw new Error(analyzeResult.error || "Failed to fetch AI SEO parameters.");
      }
    } catch (err: any) {
      setItems((current) =>
        current.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "Error",
                errorMessage: err.message || "Gemini SEO strategist analysis failed.",
              }
            : i
        )
      );
    }
  };

  // Multi-URL batch runner
  const handleAnalyzeUrls = async () => {
    if (!rawUrlsInput.trim()) return;

    const rawLines = rawUrlsInput.split("\n");
    const urls = rawLines
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http") || u.includes(".")));

    if (urls.length === 0) {
      alert("No valid URLs found. Please check your text input.");
      return;
    }

    const newItems: SEOPageItem[] = urls.map((url) => {
      let cleanUrl = url;
      if (!/^https?:\/\//i.test(cleanUrl)) {
        cleanUrl = "https://" + cleanUrl;
      }
      return {
        id: Math.random().toString(36).substring(2, 9),
        url: cleanUrl,
        status: "Pending",
      };
    });

    const updatedItems = [...items, ...newItems];
    setItems(updatedItems);
    setRawUrlsInput("");
    setIsProcessing(true);

    for (const item of newItems) {
      await processItemQueue(item);
    }

    setIsProcessing(false);
  };

  // Raw HTML or File Upload Runner
  const handleAnalyzeRawHtml = async () => {
    if (!rawHtmlInput.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`${PROXY_BASE}/bulk-parse-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html: rawHtmlInput,
          fileName: uploadedFilesSummary[0] || "Pasted-Page-Source.html",
        }),
      });

      const parsedRes = await response.json();
      if (!parsedRes.success || !parsedRes.data) {
        throw new Error(parsedRes.error || "Failed to extract HTML structure");
      }

      const seoData: CrawledSEOData = parsedRes.data;
      const newItem: SEOPageItem = {
        id: Math.random().toString(36).substring(2, 9),
        url: seoData.title ? `[HTML] ${seoData.title.substring(0, 45)}...` : "[HTML] Pasted Document",
        status: "Analyzing",
        httpStatus: 200,
        crawlMethod: seoData.crawlMethod || "Raw HTML Upload",
        seoData,
      };

      setItems((current) => [newItem, ...current]);
      setRawHtmlInput("");
      setUploadedFilesSummary([]);

      // Analyze via Gemini
      const analyzeRes = await fetch(`${PROXY_BASE}/bulk-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seoData }),
      });

      const analyzeResult = await analyzeRes.json();
      if (analyzeResult.success && analyzeResult.recommendations) {
        setItems((current) =>
          current.map((i) =>
            i.id === newItem.id
              ? {
                  ...i,
                  status: "Complete",
                  recommendations: analyzeResult.recommendations,
                }
              : i
          )
        );
      } else {
        throw new Error(analyzeResult.error || "Gemini analysis error");
      }
    } catch (err: any) {
      alert("Failed to analyze HTML: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file uploads (single or multi-file)
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploadedFilesSummary([file.name]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setRawHtmlInput(content);
      setInputTab("html");
    };
    reader.readAsText(file);
  };

  // Save manual recommendations modification inside the panel
  const handleUpdateItem = (id: string, updatedItem: SEOPageItem) => {
    setItems((current) => current.map((item) => (item.id === id ? updatedItem : item)));
    if (activeItem?.id === id) {
      setActiveItem(updatedItem);
    }
  };

  const handleOpenManualEdit = (item: SEOPageItem) => {
    setManualModalItem(item);
    setIsManualModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] py-8 px-4 sm:px-6 lg:px-10 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-7">
        
        {/* Top Dark Hero Card */}
        <Header items={items} />

        {/* Main White Ingestion Card styled with the exact screenshot aesthetic */}
        <div className="bg-white rounded-[28px] sm:rounded-[32px] p-7 sm:p-10 lg:p-12 border border-slate-200/80 shadow-md shadow-slate-200/40 space-y-7">
          
          {/* Card Header with Purple Pill Badge & Typography */}
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#fbf2ff] border border-[#eed5fc] text-xs font-bold text-[#8e04fd] tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-[#8e04fd]" />
              <span>AI-Powered Blog Refresh & SEO Optimization</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] tracking-tight">
              Audit & Refresh Blog Content at Scale
            </h2>
            
            <p className="text-sm text-[#64748b] leading-relaxed max-w-4xl">
              Provide your blog article URLs or paste raw HTML. Our AI engine extracts existing metadata, scores content freshness decay, highlights heading & search intent gaps, and writes complete refreshed article drafts.
            </p>
          </div>

          {/* Tab Selector for Ingestion Mode */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-y border-slate-100 py-3.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setInputTab("urls")}
                className={`py-2 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  inputTab === "urls"
                    ? "bg-[#140e2b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                <span>Batch URLs Crawler</span>
              </button>

              <button
                type="button"
                onClick={() => setInputTab("html")}
                className={`py-2 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  inputTab === "html"
                    ? "bg-[#140e2b] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Code className="w-3.5 h-3.5 text-purple-400" />
                <span>HTML / Document Source</span>
              </button>
            </div>

            {/* Quick helper links */}
            <div className="flex items-center gap-3 text-xs font-medium">
              <button
                onClick={handleLoadSampleUrls}
                disabled={isProcessing}
                type="button"
                className="text-[#8e04fd] hover:text-[#7002c9] hover:underline font-semibold cursor-pointer"
              >
                Load Sample Travel URLs
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={handleLoadSampleHtml}
                disabled={isProcessing}
                type="button"
                className="text-[#8e04fd] hover:text-[#7002c9] hover:underline font-semibold cursor-pointer"
              >
                Load Sample HTML
              </button>
              {items.length > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    type="button"
                    className="text-rose-500 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear List</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Form Inputs Grid matching the screenshot input styling */}
          <div className="space-y-5">
            
            {inputTab === "urls" ? (
              /* TAB 1: BATCH URLS */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Target Blog Article URLs <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-semibold text-[#8e04fd]">Paste one or multiple URLs (one per line)</span>
                </div>
                <div className="relative">
                  <textarea
                    rows={4}
                    placeholder="https://example.com/blog/rome-food-tour-guide&#10;https://example.com/blog/paris-in-3-days&#10;https://example.com/blog/best-things-to-do-in-tokyo"
                    value={rawUrlsInput}
                    onChange={(e) => setRawUrlsInput(e.target.value)}
                    disabled={isProcessing}
                    className="w-full p-4 bg-[#f8faff] hover:bg-white focus:bg-white border border-[#e2e8f0] focus:border-[#8e04fd] focus:ring-2 focus:ring-[#8e04fd]/20 rounded-2xl text-xs sm:text-sm font-mono text-slate-800 transition-all focus:outline-hidden placeholder:text-slate-400 shadow-2xs resize-y min-h-[110px]"
                  />
                  <span className="absolute right-3.5 bottom-3.5 text-[10px] text-slate-400 font-medium pointer-events-none hidden sm:inline">
                    Auto-crawls live HTML + Jina AI anti-bot fallback
                  </span>
                </div>
              </div>
            ) : (
              /* TAB 2: RAW HTML & FILE DROPZONE */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="md:col-span-4 border-2 border-dashed border-[#e2e8f0] hover:border-[#8e04fd] rounded-2xl p-5 text-center cursor-pointer bg-[#f8faff] hover:bg-purple-50/30 transition-all flex flex-col justify-center items-center min-h-[110px]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.txt,.md"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <Upload className="w-6 h-6 text-[#8e04fd] mb-1.5" />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                    {uploadedFilesSummary.length > 0 ? uploadedFilesSummary[0] : "Upload HTML / Markdown File"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Drag & drop or click to browse</span>
                </div>

                <div className="md:col-span-8">
                  <textarea
                    rows={4}
                    placeholder="Or paste raw HTML source code here: <!DOCTYPE html><html><body><h1>Rome Travel Guide</h1>...</body></html>"
                    value={rawHtmlInput}
                    onChange={(e) => setRawHtmlInput(e.target.value)}
                    disabled={isProcessing}
                    className="w-full p-4 bg-[#f8faff] hover:bg-white focus:bg-white border border-[#e2e8f0] focus:border-[#8e04fd] focus:ring-2 focus:ring-[#8e04fd]/20 rounded-2xl text-xs sm:text-sm font-mono text-slate-800 transition-all focus:outline-hidden placeholder:text-slate-400 shadow-2xs resize-y min-h-[110px]"
                  />
                </div>
              </div>
            )}

            {/* Strategic Options Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold text-[#475569] hover:text-[#0f172a] flex items-center gap-1.5 cursor-pointer select-none"
              >
                {showAdvanced ? (
                  <ChevronDown className="w-4 h-4 text-[#8e04fd]" />
                ) : (
                  <span className="text-[11px] text-slate-400 font-mono">▶</span>
                )}
                <span>{showAdvanced ? "Hide Strategic Refresh Options" : "Show Strategic Refresh Options (Target Audience & Brand Tone)"}</span>
              </button>

              {/* Expanded Strategic Options */}
              {showAdvanced && (
                <div className="mt-4 p-5 bg-[#f8faff] rounded-2xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Target Marketplace / Brand Tone</label>
                      <input
                        type="text"
                        placeholder="e.g. Expert & Engaging Travel Specialist"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#8e04fd]/20 focus:border-[#8e04fd]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">Target Country / Region</label>
                      <input
                        type="text"
                        placeholder="e.g. US, UK, Global English"
                        value={targetMarket}
                        onChange={(e) => setTargetMarket(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#8e04fd]/20 focus:border-[#8e04fd]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Big Vibrant Electric Purple Submit Button with arrow */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  if (inputTab === "html" && rawHtmlInput.trim()) {
                    handleAnalyzeRawHtml();
                  } else {
                    handleAnalyzeUrls();
                  }
                }}
                disabled={isProcessing || (inputTab === "urls" ? !rawUrlsInput.trim() : !rawHtmlInput.trim())}
                className="w-full py-4 px-8 rounded-2xl bg-[#8e04fd] hover:bg-[#7e02e3] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer select-none"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-white" />
                    <span>Crawling & Analyzing Blog Freshness...</span>
                  </>
                ) : (
                  <>
                    <span>Run Bulk SEO Blog Refresh & Audit</span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </>
                )}
              </button>
            </div>

          </div>

        </div>

        {/* Results Grid Table (Full Width) */}
        <div>
          <ResultsTable
            items={items}
            onSelectItem={(item) => setActiveItem(item)}
            onOpenManualEdit={handleOpenManualEdit}
            onRetryJina={handleRetryWithJina}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Sliding Panel Details */}
        <PageDetailPanel
          item={activeItem}
          isOpen={activeItem !== null}
          onClose={() => setActiveItem(null)}
          onUpdateItem={handleUpdateItem}
          onOpenManualEdit={handleOpenManualEdit}
          onRetryJina={handleRetryWithJina}
        />

        {/* Manual Input Fallback */}
        <ManualFallbackModal
          item={manualModalItem}
          isOpen={isManualModalOpen}
          onClose={() => {
            setIsManualModalOpen(false);
            setManualModalItem(null);
          }}
          onSubmit={handleManualDataSubmit}
          onRetryJina={handleRetryWithJina}
        />

        <footer className="mt-12 border-t border-slate-200 py-8 text-center text-xs text-slate-500">
          © 2026 Bulk AI SEO Blog Refresh Engine. Developed by Ami - SEO Girl. All rights reserved.
        </footer>

      </div>
    </div>
  );
}

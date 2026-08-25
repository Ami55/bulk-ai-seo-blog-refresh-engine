import React, { useState, useMemo } from "react";
import { 
  Search, SlidersHorizontal, ArrowUpDown, ChevronDown, 
  Download, Copy, FileSpreadsheet, Eye, AlertCircle, Sparkles, RefreshCw, Layers, Edit2, Check, Zap, PenTool
} from "lucide-react";
import { SEOPageItem } from "../types";

interface ResultsTableProps {
  items: SEOPageItem[];
  onSelectItem: (item: SEOPageItem) => void;
  onOpenManualEdit: (item: SEOPageItem) => void;
  onRetryJina?: (item: SEOPageItem) => Promise<void>;
  onClearAll: () => void;
}

const ALL_COLUMNS = [
  { id: "url", label: "URL", default: true },
  { id: "status", label: "Status", default: true },
  { id: "httpStatus", label: "HTTP Status", default: true },
  { id: "currentTitle", label: "Current Title", default: false },
  { id: "currentMeta", label: "Current Meta Description", default: false },
  { id: "currentH1", label: "H1", default: false },
  { id: "wordCount", label: "Word Count", default: true },
  { id: "priorityScore", label: "Priority Score", default: true },
  { id: "recommendedAction", label: "Recommended Action", default: true },
  { id: "searchIntent", label: "Search Intent", default: false },
  { id: "missingTopics", label: "Missing Topics", default: false },
  { id: "missingEntities", label: "Missing Entities", default: false },
  { id: "faq", label: "FAQ Opportunities", default: false },
  { id: "internalLinks", label: "Internal Link Opportunities", default: false },
  { id: "freshness", label: "Freshness Issues", default: false },
  { id: "eeat", label: "E-E-A-T Opportunities", default: false },
  { id: "conversion", label: "Conversion Opportunities", default: false },
  { id: "improvedTitle", label: "Improved Meta Title", default: false },
  { id: "improvedMeta", label: "Improved Meta Description", default: false },
  { id: "headingImprovements", label: "Suggested heading Improvements", default: false },
  { id: "schemaRecs", label: "Schema Recommendations", default: false },
  { id: "errorMessage", label: "Error Message", default: false },
];

export default function ResultsTable({
  items,
  onSelectItem,
  onOpenManualEdit,
  onRetryJina,
  onClearAll,
}: ResultsTableProps) {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [httpStatusFilter, setHttpStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [retryingJinaId, setRetryingJinaId] = useState<string | null>(null);

  const handleJinaRetryClick = async (e: React.MouseEvent, item: SEOPageItem) => {
    e.stopPropagation();
    if (!onRetryJina) return;
    setRetryingJinaId(item.id);
    try {
      await onRetryJina(item);
    } finally {
      setRetryingJinaId(null);
    }
  };
  const [actionFilter, setActionFilter] = useState("All");

  // Sorting
  const [sortField, setSortField] = useState<"url" | "wordCount" | "priorityScore" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Columns visibility selection State (starts with default settings)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial: { [key: string]: boolean } = {};
    ALL_COLUMNS.forEach((col) => {
      initial[col.id] = col.default;
    });
    return initial;
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [copySuccessText, setCopySuccessText] = useState<string | null>(null);

  // Column Presets for quick switching
  const applyPreset = (preset: "default" | "meta" | "content" | "all") => {
    const updated = { ...visibleColumns };
    ALL_COLUMNS.forEach((col) => {
      if (preset === "all") {
        updated[col.id] = true;
      } else if (preset === "default") {
        updated[col.id] = col.default;
      } else if (preset === "meta") {
        const metaList = ["url", "status", "httpStatus", "currentTitle", "currentMeta", "improvedTitle", "improvedMeta", "priorityScore"];
        updated[col.id] = metaList.includes(col.id);
      } else if (preset === "content") {
        const contentList = ["url", "status", "wordCount", "searchIntent", "missingTopics", "missingEntities", "faq", "internalLinks", "priorityScore", "recommendedAction"];
        updated[col.id] = contentList.includes(col.id);
      }
    });
    setVisibleColumns(updated);
    setShowColumnDropdown(false);
  };

  const toggleColumn = (id: string) => {
    setVisibleColumns({
      ...visibleColumns,
      [id]: !visibleColumns[id],
    });
  };

  // Sorting handling
  const handleSort = (field: "url" | "wordCount" | "priorityScore") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query filter (matches URL, Crawled Title or H1)
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        item.url.toLowerCase().includes(q) ||
        (item.seoData?.title && item.seoData.title.toLowerCase().includes(q)) ||
        (item.seoData?.h1 && item.seoData.h1.toLowerCase().includes(q));

      // 2. Status filter
      const matchStatus = statusFilter === "All" || item.status === statusFilter;

      // 3. HTTP status filter
      let matchHttp = true;
      if (httpStatusFilter !== "All") {
        const statusNum = Number(item.httpStatus);
        if (httpStatusFilter === "2xx") {
          matchHttp = statusNum >= 200 && statusNum < 300;
        } else if (httpStatusFilter === "4xx/5xx") {
          matchHttp = (statusNum >= 400 && statusNum < 600) || item.status === "Error";
        } else if (httpStatusFilter === "Manual") {
          matchHttp = item.httpStatus === 200 && (!item.seoData?.internalLinks || item.seoData.internalLinks.length === 0);
        }
      }

      // 4. Priority Score filter
      let matchPriority = true;
      if (priorityFilter !== "All" && item.recommendations?.priorityScore) {
        const score = item.recommendations.priorityScore;
        if (priorityFilter === "High") matchPriority = score >= 8;
        if (priorityFilter === "Medium") matchPriority = score >= 5 && score <= 7;
        if (priorityFilter === "Low") matchPriority = score <= 4;
      }

      // 5. Recommended Action filter
      const matchAction = actionFilter === "All" || 
        (item.recommendations?.recommendedAction && item.recommendations.recommendedAction.toLowerCase() === actionFilter.toLowerCase());

      return matchSearch && matchStatus && matchHttp && matchPriority && matchAction;
    });
  }, [items, searchQuery, statusFilter, httpStatusFilter, priorityFilter, actionFilter]);

  // Sorted items
  const sortedAndFilteredItems = useMemo(() => {
    if (!sortField) return filteredItems;

    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "url") {
        valA = a.url;
        valB = b.url;
      } else if (sortField === "wordCount") {
        valA = a.seoData?.wordCount || 0;
        valB = b.seoData?.wordCount || 0;
      } else if (sortField === "priorityScore") {
        valA = a.recommendations?.priorityScore || 0;
        valB = b.recommendations?.priorityScore || 0;
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredItems, sortField, sortDirection]);

  // CSV escape logic
  const escapeCSVField = (val: any) => {
    if (val === undefined || val === null) return "";
    let str = String(val);
    str = str.replace(/"/g, '""');
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str}"`;
    }
    return str;
  };

  // Trigger CSV Download
  const handleExportCSV = () => {
    if (items.length === 0) return;
    
    // Header Row mapping
    const headers = [
      "URL", "Status", "HTTP Status", "Current Title", "Current Meta Description", "H1 Title", "Word Count", 
      "Search Intent", "Missing Topics", "Missing Entities", "FAQ Opportunities", "Internal Link Opportunities", 
      "Freshness Issues", "E-E-A-T Opportunities", "Conversion Opportunities", "Improved Meta Title", 
      "Improved Meta Description", "Suggested Heading Improvements", "Schema Recommendations", "Priority Score", 
      "Recommended Action", "Refreshed Article Title", "Refreshed Article Word Count", "Refreshed Full Article Markdown", "Error Message"
    ];

    const csvRows = [headers.join(",")];

    items.forEach((item) => {
      const row = [
        escapeCSVField(item.url),
        escapeCSVField(item.status),
        escapeCSVField(item.httpStatus),
        escapeCSVField(item.seoData?.title),
        escapeCSVField(item.seoData?.metaDescription),
        escapeCSVField(item.seoData?.h1),
        escapeCSVField(item.seoData?.wordCount),
        escapeCSVField(item.recommendations?.searchIntent),
        escapeCSVField(item.recommendations?.missingTopics),
        escapeCSVField(item.recommendations?.missingEntities),
        escapeCSVField(item.recommendations?.faqOpportunities),
        escapeCSVField(item.recommendations?.internalLinkOpportunities),
        escapeCSVField(item.recommendations?.freshnessIssues),
        escapeCSVField(item.recommendations?.eeatOpportunities),
        escapeCSVField(item.recommendations?.conversionOpportunities),
        escapeCSVField(item.recommendations?.improvedMetaTitle),
        escapeCSVField(item.recommendations?.improvedMetaDescription),
        escapeCSVField(item.recommendations?.suggestedHeadingImprovements),
        escapeCSVField(item.recommendations?.schemaRecommendations),
        escapeCSVField(item.recommendations?.priorityScore),
        escapeCSVField(item.recommendations?.recommendedAction),
        escapeCSVField(item.fullArticle?.title),
        escapeCSVField(item.fullArticle?.wordCount),
        escapeCSVField(item.fullArticle?.content),
        escapeCSVField(item.errorMessage),
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `seo_bulk_analysis_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Copy Table to Clipboard (TSV format)
  const handleCopyTable = () => {
    if (items.length === 0) return;

    const headers = [
      "URL", "Status", "HTTP Status", "Current Title", "Current Meta Description", "H1 Tag", "Word Count", 
      "Search Intent", "Missing Topics", "Missing Entities", "FAQ Opportunities", "Internal Link Recs", 
      "Freshness Issues", "E-E-A-T Recs", "Conversion Recs", "Improved Title", "Improved Meta Desc", 
      "Heading Improvements", "Schema Recommendations", "Priority Score", "Recommended Action", "Error"
    ];

    let tsvContent = headers.join("\t") + "\n";

    items.forEach((item) => {
      const row = [
        item.url,
        item.status,
        item.httpStatus || "",
        item.seoData?.title || "",
        item.seoData?.metaDescription || "",
        item.seoData?.h1 || "",
        item.seoData?.wordCount || 0,
        item.recommendations?.searchIntent || "",
        item.recommendations?.missingTopics || "",
        item.recommendations?.missingEntities || "",
        item.recommendations?.faqOpportunities || "",
        item.recommendations?.internalLinkOpportunities || "",
        item.recommendations?.freshnessIssues || "",
        item.recommendations?.eeatOpportunities || "",
        item.recommendations?.conversionOpportunities || "",
        item.recommendations?.improvedMetaTitle || "",
        item.recommendations?.improvedMetaDescription || "",
        item.recommendations?.suggestedHeadingImprovements || "",
        item.recommendations?.schemaRecommendations || "",
        item.recommendations?.priorityScore || "",
        item.recommendations?.recommendedAction || "",
        item.errorMessage || "",
      ];
      // remove raw tabs or newlines from individual cell data to prevent format breakage
      const cleanedRow = row.map(cell => String(cell).replace(/[\t\r\n]/g, " "));
      tsvContent += cleanedRow.join("\t") + "\n";
    });

    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopySuccessText("Copied Table to Clipboard!");
      setTimeout(() => setCopySuccessText(null), 2000);
    });
  };

  // Trigger JSON State Download
  const handleDownloadJSON = () => {
    if (items.length === 0) return;
    const jsonStr = JSON.stringify(items, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `seo_bulk_analysis_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityColorClass = (score?: number) => {
    if (!score) return "text-slate-400";
    if (score >= 8) return "bg-rose-100 text-rose-800 font-bold border border-rose-200 px-2 py-0.5 rounded";
    if (score >= 5) return "bg-amber-100 text-amber-800 font-semibold border border-amber-200 px-2 py-0.5 rounded";
    return "bg-emerald-100 text-emerald-800 font-medium border border-emerald-200 px-2 py-0.5 rounded";
  };

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-xs overflow-hidden" id="results-table-container">
      
      {/* Table Action and Filter Bar */}
      <div className="p-5 border-b border-purple-100 bg-purple-50/20 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search crawled URLs, Titles, H1 tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-purple-200/80 bg-white rounded-lg text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all focus:outline-hidden text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Columns toggler dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="px-3.5 py-2 border border-purple-200/80 bg-white hover:bg-purple-50/50 text-purple-950 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4 text-purple-600" />
                Columns Layout
                <ChevronDown className="h-3 w-3 text-purple-400" />
              </button>

              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-purple-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  <div className="p-3 bg-purple-50/80 border-b border-purple-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Quick Presets</span>
                    <button onClick={onClearAll} className="text-[10px] text-rose-600 font-semibold hover:underline cursor-pointer">
                      Reset Data
                    </button>
                  </div>
                  <div className="p-2 border-b border-purple-100 flex flex-wrap gap-1">
                    <button onClick={() => applyPreset("default")} className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 text-[10px] font-medium rounded cursor-pointer">Default</button>
                    <button onClick={() => applyPreset("meta")} className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 text-[10px] font-medium rounded cursor-pointer">Meta Tuning</button>
                    <button onClick={() => applyPreset("content")} className="px-2 py-1 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-900 text-[10px] font-medium rounded cursor-pointer">Content Outline</button>
                    <button onClick={() => applyPreset("all")} className="px-2 py-1 bg-purple-800 hover:bg-purple-900 text-white text-[10px] font-medium rounded cursor-pointer">Show All 22</button>
                  </div>
                  <div className="m-1 max-h-56 overflow-y-auto p-2 space-y-1.5 scroll-thin">
                    {ALL_COLUMNS.map((col) => (
                      <label key={col.id} className="flex items-center gap-2 px-1.5 py-1 hover:bg-purple-50/60 rounded text-xs text-slate-700 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.id]}
                          onChange={() => toggleColumn(col.id)}
                          className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 font-semibold cursor-pointer"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Export buttons */}
            <button
              onClick={handleExportCSV}
              disabled={items.length === 0}
              className="px-3.5 py-2 border border-purple-200/80 text-purple-950 disabled:opacity-50 disabled:pointer-events-none bg-white hover:bg-purple-50/50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Download CSV report"
            >
              <FileSpreadsheet className="h-4 w-4 text-purple-600" />
              Export CSV
            </button>
            <button
              onClick={handleCopyTable}
              disabled={items.length === 0}
              className="px-3.5 py-2 border border-purple-200/80 text-purple-950 disabled:opacity-50 disabled:pointer-events-none bg-white hover:bg-purple-50/50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Copy visible data block as TSV for Sheets/Excel"
            >
              {copySuccessText ? <Check className="h-4 w-4 text-purple-600" /> : <Copy className="h-4 w-4 text-purple-500" />}
              {copySuccessText ? "Copied!" : "Copy Table"}
            </button>
            <button
              onClick={handleDownloadJSON}
              disabled={items.length === 0}
              className="px-3.5 py-2 border border-purple-200/80 text-purple-950 disabled:opacity-50 disabled:pointer-events-none bg-white hover:bg-purple-50/50 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              title="Extract full state as backup JSON"
            >
              <Download className="h-4 w-4 text-purple-500" />
              Download JSON
            </button>

          </div>
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-purple-100">
          <div>
            <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-1.5 bg-purple-50/30 text-xs font-semibold rounded-lg border border-purple-200/70 text-purple-950 focus:outline-hidden"
            >
              <option value="All">All statuses ({items.length})</option>
              <option value="Pending">Pending</option>
              <option value="Crawling">Crawling</option>
              <option value="Analyzing">Analyzing</option>
              <option value="Complete">Complete</option>
              <option value="Error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">HTTP status / Method</label>
            <select
              value={httpStatusFilter}
              onChange={(e) => setHttpStatusFilter(e.target.value)}
              className="w-full p-1.5 bg-purple-50/30 text-xs font-semibold rounded-lg border border-purple-200/70 text-purple-950 focus:outline-hidden"
            >
              <option value="All">All crawl routes</option>
              <option value="2xx">Crawled OK (2xx)</option>
              <option value="4xx/5xx">Crawl Failures (4xx/5xx/Failures)</option>
              <option value="Manual">Manual overrides</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full p-1.5 bg-purple-50/30 text-xs font-semibold rounded-lg border border-purple-200/70 text-purple-950 focus:outline-hidden"
            >
              <option value="All">All Priorities</option>
              <option value="High">High Priority (8-10)</option>
              <option value="Medium">Medium Priority (5-7)</option>
              <option value="Low">Low Priority (1-4)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Recommended Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full p-1.5 bg-purple-50/30 text-xs font-semibold rounded-lg border border-purple-200/70 text-purple-950 focus:outline-hidden"
            >
              <option value="All">All recommendations</option>
              <option value="Complete Rewrite">Complete Rewrite</option>
              <option value="Minor Content Update">Minor Content Update</option>
              <option value="Technical SEO Fix Only">Technical SEO Fix Only</option>
              <option value="Merge with another post">Merge with another post</option>
              <option value="No Action Required">No Action Required</option>
            </select>
          </div>
        </div>

      </div>

      {/* Main Grid Table container */}
      <div className="overflow-x-auto">
        {sortedAndFilteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white">
            <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-slate-600 font-medium text-sm">No analysis entries detected matching filters.</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              {items.length === 0 
                ? "Paste dynamic travel blog URLs inside the form and hit 'Analyze URLs' to start your first crawling batch!" 
                : "Try relaxing your filter selectors or search string above."}
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-purple-50/40 border-b border-purple-100 font-mono text-[10px] text-purple-900 tracking-wider uppercase select-none">
                <th className="px-3 py-3 w-10 text-center">#</th>
                
                {visibleColumns.url && (
                  <th className="px-4 py-3 cursor-pointer hover:bg-purple-100/50 min-w-[200px]" onClick={() => handleSort("url")}>
                    <div className="flex items-center gap-1.5">
                      URL
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-purple-400" />
                    </div>
                  </th>
                )}

                {visibleColumns.status && <th className="px-3 py-3 min-w-[100px]">Status</th>}
                {visibleColumns.httpStatus && <th className="px-3 py-3 min-w-[85px] text-center">HTTP Status</th>}
                {visibleColumns.currentTitle && <th className="px-4 py-3 min-w-[200px]">Current Title</th>}
                {visibleColumns.currentMeta && <th className="px-4 py-3 min-w-[200px]">Current Meta Desc</th>}
                {visibleColumns.currentH1 && <th className="px-4 py-3 min-w-[160px]">H1</th>}
                
                {visibleColumns.wordCount && (
                  <th className="px-3 py-3 cursor-pointer hover:bg-purple-100/50 min-w-[95px] text-center" onClick={() => handleSort("wordCount")}>
                    <div className="flex items-center justify-center gap-1.5">
                      Word Count
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-purple-400" />
                    </div>
                  </th>
                )}

                {/* AI Recommendations columns */}
                {visibleColumns.searchIntent && <th className="px-4 py-3 min-w-[180px]">Search Intent</th>}
                {visibleColumns.missingTopics && <th className="px-4 py-3 min-w-[180px]">Missing Topics</th>}
                {visibleColumns.missingEntities && <th className="px-4 py-3 min-w-[180px]">Missing Entities</th>}
                {visibleColumns.faq && <th className="px-4 py-3 min-w-[180px]">FAQ Opportunities</th>}
                {visibleColumns.internalLinks && <th className="px-4 py-3 min-w-[180px]">Internal Link Opportunities</th>}
                {visibleColumns.freshness && <th className="px-4 py-3 min-w-[180px]">Freshness Issues</th>}
                {visibleColumns.eeat && <th className="px-4 py-3 min-w-[180px]">E-E-A-T Opportunities</th>}
                {visibleColumns.conversion && <th className="px-4 py-3 min-w-[180px]">Conversion Opportunities</th>}
                {visibleColumns.improvedTitle && <th className="px-4 py-3 min-w-[180px] text-purple-900 font-bold">Improved Meta Title</th>}
                {visibleColumns.improvedMeta && <th className="px-4 py-3 min-w-[180px] text-purple-900 font-bold">Improved Meta Desc</th>}
                {visibleColumns.headingImprovements && <th className="px-4 py-3 min-w-[180px]">Heading Improvements</th>}
                {visibleColumns.schemaRecs && <th className="px-4 py-3 min-w-[180px]">Schema Recommendations</th>}

                {visibleColumns.priorityScore && (
                  <th className="px-3 py-3 cursor-pointer hover:bg-purple-100/50 min-w-[110px] text-center font-bold text-purple-900" onClick={() => handleSort("priorityScore")}>
                    <div className="flex items-center justify-center gap-1.5">
                      Priority [1-10]
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-purple-400" />
                    </div>
                  </th>
                )}

                {visibleColumns.recommendedAction && <th className="px-3 py-3 min-w-[140px]">Recommended Action</th>}
                {visibleColumns.errorMessage && <th className="px-4 py-3 min-w-[180px]">Error Message / Fallback</th>}
                <th className="px-3 py-3 text-right shrink-0 min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100/70 bg-white text-xs select-none">
              {sortedAndFilteredItems.map((item, index) => {
                const rowNum = index + 1;
                return (
                  <tr 
                    key={item.id} 
                    className="hover:bg-purple-50/30 transition-colors group cursor-pointer border-b border-purple-50"
                    onClick={() => onSelectItem(item)}
                  >
                    <td className="px-4 py-3.5 text-purple-400 font-mono font-medium">{rowNum}</td>
                    
                    {visibleColumns.url && (
                      <td className="px-4 py-3.5 font-mono text-purple-950 break-all select-all font-semibold max-w-sm truncate" title={item.url}>
                        {item.url}
                      </td>
                    )}

                    {visibleColumns.status && (
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-wide uppercase ${
                          item.status === "Complete" ? "bg-purple-50 text-purple-800 border border-purple-200" :
                          item.status === "Error" ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse" :
                          item.status === "Analyzing" ? "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200 font-bold" :
                          item.status === "Crawling" ? "bg-purple-50 text-purple-800 border border-purple-200" :
                          "bg-slate-100 text-slate-800 border border-slate-200"
                        }`}>
                          {item.status === "Crawling" && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                          {item.status === "Analyzing" && <Sparkles className="h-2.5 w-2.5" />}
                          {item.status}
                        </span>
                      </td>
                    )}

                    {visibleColumns.httpStatus && (
                      <td className="px-4 py-3.5 text-center font-mono font-medium">
                        {item.httpStatus ? (
                          <span className={`${
                            Number(item.httpStatus) >= 200 && Number(item.httpStatus) < 300 
                              ? "text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" 
                              : "text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200"
                          }`}>
                            {item.httpStatus}
                          </span>
                        ) : (
                          <span className="text-purple-300">-</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.currentTitle && (
                      <td className="px-4 py-3.5 text-slate-700 truncate max-w-xs font-sans" title={item.seoData?.title}>
                        {item.seoData?.title || <span className="text-slate-300 italic">None</span>}
                      </td>
                    )}

                    {visibleColumns.currentMeta && (
                      <td className="px-4 py-3.5 text-slate-500 truncate max-w-xs font-sans" title={item.seoData?.metaDescription}>
                        {item.seoData?.metaDescription || <span className="text-slate-300 italic">None</span>}
                      </td>
                    )}

                    {visibleColumns.currentH1 && (
                      <td className="px-4 py-3.5 text-slate-700 truncate max-w-xs" title={item.seoData?.h1}>
                        {item.seoData?.h1 || <span className="text-slate-300 italic">None</span>}
                      </td>
                    )}

                    {visibleColumns.wordCount && (
                      <td className="px-4 py-3.5 text-center font-mono text-slate-700">
                        {item.seoData?.wordCount !== undefined ? item.seoData.wordCount.toLocaleString() : "-"}
                      </td>
                    )}

                    {/* AI Recommendations Content Columns */}
                    {visibleColumns.searchIntent && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.searchIntent}>
                        {item.recommendations?.searchIntent || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.missingTopics && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.missingTopics}>
                        {item.recommendations?.missingTopics || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.missingEntities && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.missingEntities}>
                        {item.recommendations?.missingEntities || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.faq && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.faqOpportunities}>
                        {item.recommendations?.faqOpportunities || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.internalLinks && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.internalLinkOpportunities}>
                        {item.recommendations?.internalLinkOpportunities || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.freshness && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.freshnessIssues}>
                        {item.recommendations?.freshnessIssues || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.eeat && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.eeatOpportunities}>
                        {item.recommendations?.eeatOpportunities || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    {visibleColumns.conversion && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.conversionOpportunities}>
                        {item.recommendations?.conversionOpportunities || <span className="text-slate-300">-</span>}
                      </td>
                    )}

                    {visibleColumns.improvedTitle && (
                      <td className="px-4 py-3.5 text-slate-800 font-semibold max-w-xs truncate" title={item.recommendations?.improvedMetaTitle}>
                        {item.recommendations?.improvedMetaTitle || <span className="text-slate-300">-</span>}
                      </td>
                    )}

                    {visibleColumns.improvedMeta && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.improvedMetaDescription}>
                        {item.recommendations?.improvedMetaDescription || <span className="text-slate-300">-</span>}
                      </td>
                    )}

                    {visibleColumns.headingImprovements && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.suggestedHeadingImprovements}>
                        {item.recommendations?.suggestedHeadingImprovements || <span className="text-slate-300">-</span>}
                      </td>
                    )}

                    {visibleColumns.schemaRecs && (
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={item.recommendations?.schemaRecommendations}>
                        {item.recommendations?.schemaRecommendations || <span className="text-slate-300">-</span>}
                      </td>
                    )}

                    {visibleColumns.priorityScore && (
                      <td className="px-4 py-3.5 text-center font-mono">
                        {item.recommendations?.priorityScore ? (
                          <div className="inline-flex items-center gap-1.5 justify-center">
                            <span className="text-xs font-bold text-slate-800">{item.recommendations.priorityScore}</span>
                            <div className="flex space-x-0.5">
                              <div className={`w-1 h-3 ${item.recommendations.priorityScore >= 8 ? "bg-red-500" : item.recommendations.priorityScore >= 5 ? "bg-yellow-500" : "bg-emerald-500"}`}></div>
                              <div className={`w-1 h-3 ${item.recommendations.priorityScore >= 8 ? "bg-red-500" : item.recommendations.priorityScore >= 5 ? "bg-yellow-500" : "bg-slate-200"}`}></div>
                              <div className={`w-1 h-3 ${item.recommendations.priorityScore >= 8 ? "bg-red-500" : "bg-slate-200"}`}></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.recommendedAction && (
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {item.recommendations?.recommendedAction ? (
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.recommendations.recommendedAction === "Complete Rewrite" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                            item.recommendations.recommendedAction === "Minor Content Update" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                            item.recommendations.recommendedAction === "Technical SEO Fix Only" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            "bg-slate-50 text-slate-500 border border-slate-100"
                          }`}>
                            {item.recommendations.recommendedAction}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}

                    {visibleColumns.errorMessage && (
                      <td className="px-4 py-3.5 text-rose-600 max-w-xs truncate font-medium font-sans" title={item.errorMessage}>
                        {item.errorMessage ? (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {item.errorMessage}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    )}

                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectItem(item)}
                          className="p-1 px-2.5 bg-purple-50 text-purple-900 border border-purple-200 rounded hover:bg-purple-100 transition-colors flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                          title="View analysis detail panel"
                        >
                          <Eye className="h-3 w-3 text-purple-600" />
                          <span>Audit</span>
                        </button>

                        {item.status === "Complete" && (
                          <button
                            onClick={() => onSelectItem(item)}
                            className={`p-1 px-2.5 rounded transition-colors flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider cursor-pointer ${
                              item.fullArticle
                                ? "bg-purple-900 text-white border border-purple-950 hover:bg-purple-800 shadow-2xs"
                                : "bg-fuchsia-50 text-fuchsia-900 border border-fuchsia-300 hover:bg-fuchsia-100"
                            }`}
                            title={item.fullArticle ? "View generated full article" : "Write refreshed article based on audit"}
                          >
                            <PenTool className="h-3 w-3" />
                            <span>{item.fullArticle ? "Article ✓" : "Write"}</span>
                          </button>
                        )}
                        
                        {item.status === "Error" && onRetryJina && (
                          <button
                            onClick={(e) => handleJinaRetryClick(e, item)}
                            disabled={retryingJinaId === item.id}
                            className="p-1 px-2 bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-colors flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                            title="Retry crawling this page using Jina AI Reader"
                          >
                            {retryingJinaId === item.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Zap className="h-3 w-3 text-amber-600" />
                            )}
                            <span>Jina AI</span>
                          </button>
                        )}

                        {item.status === "Error" && (
                          <button
                            onClick={() => onOpenManualEdit(item)}
                            className="p-1 px-2 bg-purple-50 text-purple-900 border border-purple-200 rounded hover:bg-purple-100 transition-colors flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                            title="Paste raw HTML or upload file"
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Paste HTML</span>
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      <div className="px-5 py-3 border-t border-purple-100 bg-purple-50/20 font-mono text-[10px] text-purple-900/70 font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>Filtered count: {sortedAndFilteredItems.length} of {items.length} total targets</div>
        <div>Bulk AI SEO Blog Refresh Engine • Strategic Travel Content</div>
      </div>

    </div>
  );
}

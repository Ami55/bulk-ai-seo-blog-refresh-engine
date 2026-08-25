import React from "react";
import { Sparkles, Globe, FileText, Search, RefreshCw, Zap, CheckCircle2, AlertTriangle, Layers, ArrowUpRight } from "lucide-react";
import { SEOPageItem } from "../types";

interface HeaderProps {
  items: SEOPageItem[];
}

export default function Header({ items }: HeaderProps) {
  const total = items.length;
  const completed = items.filter((i) => i.status === "Complete").length;
  const crawling = items.filter((i) => i.status === "Crawling").length;
  const analyzing = items.filter((i) => i.status === "Analyzing").length;
  const errors = items.filter((i) => i.status === "Error").length;
  const prioritySum = items
    .filter((i) => i.status === "Complete" && i.recommendations?.priorityScore)
    .reduce((sum, i) => sum + (i.recommendations?.priorityScore || 0), 0);
  const avgPriority = completed > 0 ? (prioritySum / completed).toFixed(1) : "0.0";

  return (
    <header 
      className="rounded-[30px] p-8 sm:p-10 lg:p-12 text-white shadow-2xl relative overflow-hidden border border-purple-900/30"
      style={{
        background: "linear-gradient(135deg, #131438 0%, #1a1649 45%, #340b5c 100%)",
      }}
      id="app-header"
    >
      {/* Top Pill Badge */}
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#272652]/80 border border-white/10 text-xs text-[#d3d6f7] font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-purple-300" />
          <span>Bulk AI SEO Blog Refresh Engine</span>
        </div>
      </div>

      {/* Main Display Headline */}
      <div className="max-w-4xl space-y-3 mb-6">
        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-white leading-[1.18]">
          Crawl, Audit & Refresh Blog Articles at Scale
        </h1>
        <p className="text-sm sm:text-base text-[#bcc0e2] leading-relaxed max-w-3xl">
          Automate content refreshes for travel blogs, city guides, and tour experience pages. Extract live HTML metadata, evaluate freshness decay and search intent gaps, prioritize updates (1–10), and generate refreshed articles with structured FAQ schema.
        </p>
      </div>

      {/* 4 Process & Signal Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-2">
        
        {/* 1. Crawl & Ingest */}
        <div className="bg-[#241d54]/70 border border-[#524494]/40 hover:border-[#6e5cc4]/60 rounded-2xl p-4 transition-all flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-[#b5aef5] font-mono">1. Crawl & Ingest</div>
            <div className="text-xs text-[#8f94c7] mt-0.5">Batch URLs or HTML</div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-purple-200">
            <span>{total > 0 ? `${total} Total URLs` : "Multi-URL Ingestion"}</span>
            <Globe className="w-3.5 h-3.5 text-purple-400" />
          </div>
        </div>

        {/* 2. SEO & Freshness Audit */}
        <div className="bg-[#241d54]/70 border border-[#524494]/40 hover:border-[#6e5cc4]/60 rounded-2xl p-4 transition-all flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-[#b5aef5] font-mono">2. Content Audit</div>
            <div className="text-xs text-[#8f94c7] mt-0.5">Titles, H1-H3 & Intent</div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-purple-200">
            <span>{completed > 0 ? `${completed} Audited` : "Meta & Decay Diagnostic"}</span>
            <Search className="w-3.5 h-3.5 text-purple-400" />
          </div>
        </div>

        {/* 3. Priority Scoring */}
        <div className="bg-[#241d54]/70 border border-[#524494]/40 hover:border-[#6e5cc4]/60 rounded-2xl p-4 transition-all flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-[#b5aef5] font-mono">3. Priority Ranking</div>
            <div className="text-xs text-[#8f94c7] mt-0.5">1-10 Urgency Matrix</div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-purple-200">
            <span>{completed > 0 ? `Avg ${avgPriority}/10 Score` : "Decay & Impact Rank"}</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
        </div>

        {/* 4. Full Article Generator */}
        <div className="bg-[#241d54]/70 border border-[#524494]/40 hover:border-[#4ef2bb]/50 rounded-2xl p-4 transition-all flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-[#4ef2bb] font-mono">4. Article Engine</div>
            <div className="text-xs text-[#8f94c7] mt-0.5">Rewrites, FAQs & Schema</div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#4ef2bb]">
            <span>{crawling > 0 || analyzing > 0 ? "Processing Live..." : "Full Markdown Output"}</span>
            <FileText className="w-3.5 h-3.5 text-[#4ef2bb]" />
          </div>
        </div>

      </div>
    </header>
  );
}


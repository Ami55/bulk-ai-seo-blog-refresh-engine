import React, { useState } from "react";
import Markdown from "react-markdown";
import { 
  Sparkles, PenTool, Copy, Check, Download, RefreshCw, 
  Code, Eye, Edit3, Save, Layers, Clock, BookOpen, 
  CheckCircle2, SlidersHorizontal, AlertCircle, ArrowRight
} from "lucide-react";
import { SEOPageItem, FullRefreshedArticle } from "../types";

const PROXY_URL = "https://gemini-proxy-boldstudio.vercel.app/api/bulk-write";

interface FullArticleViewProps {
  item: SEOPageItem;
  onUpdateItem: (id: string, updatedItem: SEOPageItem) => void;
}

export default function FullArticleView({ item, onUpdateItem }: FullArticleViewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Configuration options
  const [tone, setTone] = useState("Authoritative Local Expert & Engaging Guide");
  const [targetLength, setTargetLength] = useState<"standard" | "comprehensive" | "concise">("standard");
  const [customPrompt, setCustomPrompt] = useState("");
  const [includeFaqSchema, setIncludeFaqSchema] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"preview" | "markdown" | "html" | "edit">("preview");
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  // Edit mode local state
  const [editedContent, setEditedContent] = useState(item.fullArticle?.content || "");
  const [editedTitle, setEditedTitle] = useState(item.fullArticle?.title || "");

  React.useEffect(() => {
    if (item.fullArticle) {
      setEditedContent(item.fullArticle.content);
      setEditedTitle(item.fullArticle.title);
    }
  }, [item.fullArticle]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seoData: item.seoData,
          recommendations: item.recommendations,
          tone,
          targetLength,
          customPrompt,
          includeFaqSchema,
          includeCta,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.article) {
        throw new Error(data.error || "Failed to generate full article from Gemini.");
      }

      const updated: SEOPageItem = {
        ...item,
        fullArticle: data.article,
      };

      onUpdateItem(item.id, updated);
      setShowConfig(false);
      setViewMode("preview");
    } catch (err: any) {
      setGenerationError(err.message || "An error occurred while generating the article.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, mode: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMode(mode);
    setTimeout(() => setCopiedMode(null), 2000);
  };

  const handleDownload = () => {
    if (!item.fullArticle) return;
    const element = document.createElement("a");
    const file = new Blob([item.fullArticle.content], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    const sanitizedTitle = (item.fullArticle.title || "refreshed-article")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    element.download = `${sanitizedTitle}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSaveEdit = () => {
    if (!item.fullArticle) return;
    const words = editedContent.split(/\s+/).filter((w) => w.length > 0).length;
    const updatedArticle: FullRefreshedArticle = {
      ...item.fullArticle,
      title: editedTitle,
      content: editedContent,
      wordCount: words,
      readingTimeMinutes: Math.max(1, Math.ceil(words / 200)),
    };
    onUpdateItem(item.id, {
      ...item,
      fullArticle: updatedArticle,
    });
    setViewMode("preview");
  };

  // Convert markdown to simple HTML string for CMS copy
  const getSimpleHtml = (md: string) => {
    return md
      .replace(/^# (.*$)/gim, "<h1>$1</h1>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
      .replace(/\*(.*)\*/gim, "<em>$1</em>")
      .replace(/\[([^\[]+)\]\(([^\)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n\n/gim, "<p></p>\n");
  };

  const article = item.fullArticle;

  return (
    <div className="space-y-6">
      
      {/* If article is not yet written OR user toggled configuration */}
      {(!article || showConfig) && (
        <div className="bg-purple-50/40 rounded-xl p-5 border border-purple-100 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-100 text-purple-900 rounded-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {article ? "Regenerate Full Refreshed Article" : "Write Full Refreshed Article"}
                </h3>
                <p className="text-xs text-slate-500">
                  Gemini writes the complete publication-ready article incorporating all missing topics, entities, FAQs, headings, and E-E-A-T points.
                </p>
              </div>
            </div>
            {article && (
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-xs text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Audit Highlights that will be applied */}
          {item.recommendations && (
            <div className="bg-white rounded-lg p-3 border border-purple-100 text-xs space-y-2">
              <span className="font-bold text-purple-900 uppercase tracking-wider text-[10px] block">
                Audit Findings to be Integrated Automatically:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 text-[11px]">
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="truncate"><strong>Title:</strong> {item.recommendations.improvedMetaTitle}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="truncate"><strong>Missing Entities & Destinations</strong></span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="truncate"><strong>Structured FAQs & Schema JSON-LD</strong></span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="truncate"><strong>Local E-E-A-T & Practical Tips</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Configuration Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Tone */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Article Tone & Persona
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-hidden"
              >
                <option value="Authoritative Local Expert & Engaging Guide">Authoritative Local Expert & Engaging Guide</option>
                <option value="Inspiring Travel Storyteller & Local Insider">Inspiring Travel Storyteller & Local Insider</option>
                <option value="Actionable & Booking Conversion Focused">Actionable & Booking Conversion Focused</option>
                <option value="Concise & Practical Traveler Digest">Concise & Practical Traveler Digest</option>
              </select>
            </div>

            {/* Length */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Word Count
              </label>
              <div className="grid grid-cols-3 gap-1 bg-white p-1 border border-slate-200 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setTargetLength("concise")}
                  className={`py-1.5 rounded font-bold transition-all text-center ${
                    targetLength === "concise" ? "bg-purple-100 text-purple-900 border border-purple-200" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ~1,000w
                </button>
                <button
                  type="button"
                  onClick={() => setTargetLength("standard")}
                  className={`py-1.5 rounded font-bold transition-all text-center ${
                    targetLength === "standard" ? "bg-purple-100 text-purple-900 border border-purple-200" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  ~1,600w
                </button>
                <button
                  type="button"
                  onClick={() => setTargetLength("comprehensive")}
                  className={`py-1.5 rounded font-bold transition-all text-center ${
                    targetLength === "comprehensive" ? "bg-purple-100 text-purple-900 border border-purple-200" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  2,200w+
                </button>
              </div>
            </div>

          </div>

          {/* Custom Focus */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Custom Content Focus / Writer Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Highlight private walking tours, local food tasting stops, and family-friendly routes"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeFaqSchema}
                onChange={(e) => setIncludeFaqSchema(e.target.checked)}
                className="rounded text-purple-900 focus:ring-purple-900"
              />
              <span className="font-semibold text-[11px]">Generate FAQPage Schema JSON-LD</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
                className="rounded text-purple-900 focus:ring-purple-900"
              />
              <span className="font-semibold text-[11px]">Include Marketplace Tour Booking CTA</span>
            </label>
          </div>

          {generationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Generation Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-purple-900 hover:bg-purple-800 disabled:bg-purple-400 text-white font-bold text-xs uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Writing Complete Refreshed Article with Gemini...</span>
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" />
                <span>Generate Publication-Ready Full Article</span>
              </>
            )}
          </button>

        </div>
      )}

      {/* If article exists and not configuring */}
      {article && !showConfig && (
        <div className="space-y-4">
          
          {/* Article Meta / Stats Header Card */}
          <div className="bg-purple-50/40 rounded-xl p-4 border border-purple-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-widest block mb-0.5">
                  Refreshed Travel Content
                </span>
                <h3 className="text-sm font-bold text-slate-800 truncate">
                  {article.title}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-purple-200 rounded text-xs font-bold text-purple-900">
                  <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                  {article.wordCount.toLocaleString()} words
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-purple-200 rounded text-xs font-bold text-purple-900">
                  <Clock className="h-3.5 w-3.5 text-fuchsia-600" />
                  ~{article.readingTimeMinutes} min read
                </span>
              </div>
            </div>

            {/* Meta Description Preview */}
            <div className="text-xs text-slate-600">
              <strong className="text-[10px] uppercase font-bold text-purple-900/80 tracking-wider block mb-0.5">Optimized Meta Description:</strong>
              <p className="bg-white p-2.5 rounded border border-purple-100 italic">
                &quot;{article.metaDescription}&quot;
              </p>
            </div>

            {/* Key Improvements included pills */}
            {article.keyImprovementsIncluded && article.keyImprovementsIncluded.length > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-900/80 tracking-wider block mb-1.5">
                  SEO Audit Findings Applied:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {article.keyImprovementsIncluded.map((imp, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-200 rounded text-[10px] font-semibold"
                    >
                      <Check className="h-3 w-3 text-purple-700" />
                      {imp}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* View Toolbar & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2 border border-purple-100 rounded-lg shadow-2xs">
            
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-purple-50/60 p-1 rounded-md text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                  viewMode === "preview" ? "bg-white text-purple-950 shadow-2xs" : "text-purple-900/70 hover:text-purple-950"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Formatted</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("markdown")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                  viewMode === "markdown" ? "bg-white text-purple-950 shadow-2xs" : "text-purple-900/70 hover:text-purple-950"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("html")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                  viewMode === "html" ? "bg-white text-purple-950 shadow-2xs" : "text-purple-900/70 hover:text-purple-950"
                }`}
              >
                <Code className="h-3.5 w-3.5" />
                <span>HTML</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("edit")}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                  viewMode === "edit" ? "bg-white text-purple-950 shadow-2xs" : "text-purple-900/70 hover:text-purple-950"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleCopy(article.content, "md")}
                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded flex items-center gap-1 transition-all"
                title="Copy Markdown to Clipboard"
              >
                {copiedMode === "md" ? <Check className="h-3.5 w-3.5 text-purple-700" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedMode === "md" ? "Copied!" : "Copy MD"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopy(getSimpleHtml(article.content), "html")}
                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded flex items-center gap-1 transition-all"
                title="Copy HTML to Clipboard"
              >
                {copiedMode === "html" ? <Check className="h-3.5 w-3.5 text-purple-700" /> : <Code className="h-3.5 w-3.5" />}
                <span>{copiedMode === "html" ? "Copied!" : "Copy HTML"}</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded flex items-center gap-1 transition-all"
                title="Download as .md file"
              >
                <Download className="h-3.5 w-3.5" />
                <span>.md</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 text-xs font-bold rounded flex items-center gap-1 transition-all"
                title="Regenerate with different settings"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Regen</span>
              </button>
            </div>

          </div>

          {/* VIEW: Formatted Markdown View */}
          {viewMode === "preview" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              <div className="markdown-body prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:pb-2 prose-h3:text-sm prose-p:text-xs prose-p:leading-relaxed prose-li:text-xs prose-a:text-blue-600 prose-a:font-semibold">
                <Markdown>{article.content}</Markdown>
              </div>

              {/* Schema Preview if present */}
              {article.faqSchemaJson && (
                <div className="border-t border-slate-200 pt-4 mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-emerald-600" />
                      Schema.org FAQPage JSON-LD Script
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(article.faqSchemaJson || "", "schema")}
                      className="text-[10px] text-blue-600 hover:underline font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      {copiedMode === "schema" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedMode === "schema" ? "Copied" : "Copy Schema"}</span>
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 block overflow-x-auto max-h-48">
                    {article.faqSchemaJson}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Raw Markdown */}
          {viewMode === "markdown" && (
            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[600px] border border-slate-800 leading-relaxed whitespace-pre-wrap select-all">
              {article.content}
            </div>
          )}

          {/* VIEW: HTML / CMS */}
          {viewMode === "html" && (
            <div className="bg-slate-900 text-emerald-300 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[600px] border border-slate-800 leading-relaxed whitespace-pre-wrap select-all">
              {getSimpleHtml(article.content)}
            </div>
          )}

          {/* VIEW: Edit Mode */}
          {viewMode === "edit" && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Article Title
                </label>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Article Content (Markdown)
                </label>
                <textarea
                  rows={20}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {editedContent.split(/\s+/).filter((w) => w.length > 0).length} words
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

import React, { useState } from "react";
import { X, Globe, Sparkles, FileText, Link, Image as ImageIcon, Code, ArrowRight, Copy, Check, Save, Zap, RefreshCw, PenTool, BookOpen } from "lucide-react";
import { SEOPageItem, AIRecommendations, CrawledSEOData } from "../types";
import FullArticleView from "./FullArticleView";

interface PageDetailPanelProps {
  item: SEOPageItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (id: string, updatedItem: SEOPageItem) => void;
  onOpenManualEdit: (item: SEOPageItem) => void;
  onRetryJina?: (item: SEOPageItem) => Promise<void>;
}

export default function PageDetailPanel({
  item,
  isOpen,
  onClose,
  onUpdateItem,
  onOpenManualEdit,
  onRetryJina,
}: PageDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "article" | "crawler">("ai");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isRetryingJina, setIsRetryingJina] = useState(false);

  // Local state for editing the recommendations
  const [editedRecommendations, setEditedRecommendations] = useState<AIRecommendations | null>(null);

  React.useEffect(() => {
    if (item?.recommendations) {
      setEditedRecommendations({ ...item.recommendations });
    } else {
      setEditedRecommendations(null);
    }
    setIsEditing(false);
  }, [item]);

  if (!isOpen || !item) return null;

  const handleJinaClick = async () => {
    if (!onRetryJina || !item) return;
    setIsRetryingJina(true);
    try {
      await onRetryJina(item);
    } finally {
      setIsRetryingJina(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveRecommendationChange = (field: keyof AIRecommendations, value: string | number) => {
    if (!editedRecommendations) return;
    setEditedRecommendations({
      ...editedRecommendations,
      [field]: value,
    });
  };

  const handleSaveChanges = () => {
    if (!editedRecommendations) return;
    const updatedItem = {
      ...item,
      recommendations: { ...editedRecommendations },
    };
    onUpdateItem(item.id, updatedItem);
    setIsEditing(false);
  };

  const getPriorityBadgeColor = (score: number) => {
    if (score >= 8) return "bg-rose-50 text-rose-700 border-rose-200";
    if (score >= 5) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  };

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden"
      id="page-detail-panel"
    >
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col transform transition-transform duration-300">
          
          {/* Panel Header */}
          <div className="p-6 border-b border-purple-100 flex items-center justify-between bg-purple-50/40">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-purple-600 shrink-0" />
                <h2 className="text-md font-bold text-slate-800 truncate font-mono">
                  {item.url}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                <span className="text-[10px] font-bold text-purple-900 uppercase">Status:</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                  item.status === "Complete" ? "bg-purple-100 text-purple-900 border border-purple-200" :
                  item.status === "Error" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                  item.status === "Analyzing" ? "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200" :
                  "bg-purple-50 text-purple-700 border border-purple-200"
                }`}>
                  {item.status}
                </span>

                {item.httpStatus && (
                  <span className="font-mono bg-white border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-purple-900">
                    HTTP {item.httpStatus}
                  </span>
                )}

                {(item.seoData?.crawlMethod || item.crawlMethod) && (
                  <span className="font-mono bg-purple-100/70 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-bold text-purple-900 flex items-center gap-1">
                    <Zap className="h-2.5 w-2.5 text-purple-600" />
                    {item.seoData?.crawlMethod || item.crawlMethod}
                  </span>
                )}

                {item.status === "Error" && onRetryJina && (
                  <button
                    type="button"
                    onClick={handleJinaClick}
                    disabled={isRetryingJina}
                    className="ml-auto px-2.5 py-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-[10px] uppercase tracking-wider rounded flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                  >
                    {isRetryingJina ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Fetching Jina...
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3" />
                        Retry with Jina AI Reader
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-purple-100/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-purple-100 bg-white sticky top-0 shrink-0 z-10 px-6 gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("ai")}
              className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "ai"
                  ? "border-purple-700 text-purple-900"
                  : "border-transparent text-purple-900/60 hover:text-purple-950"
              }`}
            >
              <Sparkles className="h-4 w-4 text-purple-600" />
              AI Recommendations
            </button>

            <button
              onClick={() => setActiveTab("article")}
              className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "article"
                  ? "border-purple-700 text-purple-900"
                  : "border-transparent text-purple-900/60 hover:text-purple-950"
              }`}
            >
              <PenTool className="h-4 w-4 text-purple-600" />
              <span>Full Refreshed Article</span>
              {item.fullArticle && (
                <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 text-[9px] font-bold rounded-full">
                  Ready
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("crawler")}
              className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "crawler"
                  ? "border-purple-700 text-purple-900"
                  : "border-transparent text-purple-900/60 hover:text-purple-950"
              }`}
            >
              <FileText className="h-4 w-4 text-purple-600" />
              Crawler Elements
            </button>
          </div>

          {/* Panel Main Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {activeTab === "ai" && (
              <div className="space-y-6">
                {item.status !== "Complete" ? (
                  <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Sparkles className="h-10 w-10 text-indigo-500 mx-auto mb-3 animate-pulse" />
                    <h3 className="font-medium text-slate-700 text-sm mb-1">
                      {item.status === "Error" ? "Analysis Failed" : "Analysis is in progress"}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                      {item.status === "Error"
                        ? item.errorMessage || "An error occurred. Check browser logs or try the manual content paste fallback directly."
                        : "Our crawler is analyzing the content framework and sending structural parameters to Gemini."}
                    </p>
                    {item.status === "Error" && (
                      <button
                        onClick={() => onOpenManualEdit(item)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Paste Content Manually
                      </button>
                    )}
                  </div>
                ) : !editedRecommendations ? (
                  <div className="text-center py-8">No recommendations found.</div>
                ) : (
                  <div className="space-y-5">
                    
                    {/* Priority & Quick Actions Card */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-2 border rounded-xl flex flex-col items-center justify-center font-mono font-bold leading-tight ${getPriorityBadgeColor(editedRecommendations.priorityScore)}`}>
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-0.5">Priority</span>
                            <span className="text-lg">{editedRecommendations.priorityScore}</span>
                          </div>
                          <div>
                            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Suggested Action</span>
                            {isEditing ? (
                              <select
                                value={editedRecommendations.recommendedAction}
                                onChange={(e) => handleSaveRecommendationChange("recommendedAction", e.target.value)}
                                className="mt-0.5 px-2 py-1 border border-slate-300 rounded text-sm bg-white font-sans font-semibold focus:outline-hidden text-slate-800"
                              >
                                <option value="Complete Rewrite">Complete Rewrite</option>
                                <option value="Minor Content Update">Minor Content Update</option>
                                <option value="Technical SEO Fix Only">Technical SEO Fix Only</option>
                                <option value="Merge with another post">Merge with another post</option>
                                <option value="No Action Required">No Action Required</option>
                              </select>
                            ) : (
                              <span className="text-sm font-semibold text-slate-700">
                                {editedRecommendations.recommendedAction}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveTab("article")}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>{item.fullArticle ? "View Full Article" : "Write Full Article"}</span>
                          </button>

                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-100 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveChanges}
                                className="px-3.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-900 flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <Save className="h-3.5 w-3.5" />
                                Save
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setIsEditing(true)}
                              className="px-3 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              Edit Audit
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Interactive Recommendations */}
                    <div className="space-y-4">
                      
                      {/* Meta Refresh Header Block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-xs relative">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-blue-600 block uppercase tracking-wider">Improved Title Tag</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(editedRecommendations.improvedMetaTitle, "title")}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                            >
                              {copiedField === "title" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {isEditing ? (
                            <input
                              type="text"
                              className="w-full text-xs font-sans text-slate-700 border border-slate-200 rounded p-1"
                              value={editedRecommendations.improvedMetaTitle}
                              onChange={(e) => handleSaveRecommendationChange("improvedMetaTitle", e.target.value)}
                            />
                          ) : (
                            <p className="text-xs font-sans font-semibold text-slate-800">{editedRecommendations.improvedMetaTitle || "N/A"}</p>
                          )}
                        </div>

                        <div className="border border-slate-200 rounded-lg p-3.5 bg-white shadow-xs relative">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-blue-600 block uppercase tracking-wider">Improved Meta Description</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(editedRecommendations.improvedMetaDescription, "desc")}
                              className="text-slate-400 hover:text-blue-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                            >
                              {copiedField === "desc" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {isEditing ? (
                            <textarea
                              rows={2}
                              className="w-full text-xs font-sans text-slate-700 border border-slate-200 rounded p-1"
                              value={editedRecommendations.improvedMetaDescription}
                              onChange={(e) => handleSaveRecommendationChange("improvedMetaDescription", e.target.value)}
                            />
                          ) : (
                            <p className="text-xs font-sans text-slate-600 leading-relaxed">{editedRecommendations.improvedMetaDescription || "N/A"}</p>
                          )}
                        </div>
                      </div>

                      {/* Detail Recommendation Fields */}
                      {[
                        { label: "Search Intent", key: "searchIntent" as const },
                        { label: "Content Summary", key: "contentSummary" as const },
                        { label: "Missing Topics", key: "missingTopics" as const },
                        { label: "Missing Entities", key: "missingEntities" as const },
                        { label: "Missing Destinations/Attractions", key: "missingDestinations" as const },
                        { label: "FAQ Opportunities", key: "faqOpportunities" as const },
                        { label: "Internal Link Opportunities", key: "internalLinkOpportunities" as const },
                        { label: "Freshness Issues", key: "freshnessIssues" as const },
                        { label: "E-E-A-T Opportunities", key: "eeatOpportunities" as const },
                        { label: "Conversion Opportunities", key: "conversionOpportunities" as const },
                        { label: "Suggested H2/H3 Improvements", key: "suggestedHeadingImprovements" as const },
                        { label: "Schema Recommendations", key: "schemaRecommendations" as const },
                      ].map((field) => (
                        <div key={field.key} className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                              {field.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(editedRecommendations[field.key]?.toString() || "", field.key)}
                              className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition-colors"
                            >
                              {copiedField === field.key ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          {isEditing ? (
                            <textarea
                              rows={3}
                              className="w-full text-xs font-mono text-slate-700 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
                              value={editedRecommendations[field.key]}
                              onChange={(e) => handleSaveRecommendationChange(field.key, e.target.value)}
                            />
                          ) : (
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {editedRecommendations[field.key] || "No recommendations generated."}
                            </p>
                          )}
                        </div>
                      ))}

                    </div>

                  </div>
                )}
              </div>
            )}

            {activeTab === "article" && (
              <FullArticleView item={item} onUpdateItem={onUpdateItem} />
            )}

            {activeTab === "crawler" && (
              <div className="space-y-6">
                
                {/* Meta details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 divide-y divide-slate-200/60 font-sans space-y-3">
                  <div className="pb-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Current Title</span>
                      <p className="text-sm font-medium text-slate-800 font-sans">
                        {item.seoData?.title || <span className="italic text-slate-400">Empty</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Title Length</span>
                      <p className="text-sm font-mono text-slate-600">
                        {item.seoData?.title ? `${item.seoData.title.length} characters` : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Current Meta Description</span>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed font-sans">
                        {item.seoData?.metaDescription || <span className="italic text-slate-400">None detected</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Description Length</span>
                      <p className="text-sm font-mono text-slate-600">
                        {item.seoData?.metaDescription ? `${item.seoData.metaDescription.length} characters` : "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">H1 Tag</span>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.seoData?.h1 || <span className="italic text-slate-400">Missing H1</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Word Count</span>
                      <p className="text-sm font-mono text-slate-700 font-bold">
                        {item.seoData?.wordCount || 0} words
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Dates</span>
                      <p className="text-xs font-mono text-slate-600">
                        Pub: {item.seoData?.publishedDate || "N/A"}<br />
                        Mod: {item.seoData?.lastModifiedDate || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Headings Outline */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wilder block mb-3">Headings Outline Structure</span>
                  
                  <div className="space-y-2 border-l-2 border-blue-100 pl-4 font-sans text-xs">
                    {item.seoData?.h1 && (
                      <div className="font-semibold text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1 text-sm font-mono">
                        <span className="font-mono bg-blue-50 text-blue-600 px-1 py-0.2 rounded text-[10px]">H1</span>
                        {item.seoData.h1}
                      </div>
                    )}
                    
                    {Array.isArray(item.seoData?.h2s) && item.seoData.h2s.length > 0 ? (
                      item.seoData.h2s.map((h2, i) => (
                        <div key={i} className="font-medium text-slate-700 mt-2 flex items-start gap-1">
                          <span className="font-mono bg-sky-50 text-sky-600 px-1 py-0.2 rounded text-[9px] shrink-0 mt-0.5">H2</span>
                          <span>{h2}</span>
                        </div>
                      ))
                    ) : (
                      <div className="italic text-slate-400">No H2 tags found.</div>
                    )}

                    {Array.isArray(item.seoData?.h3s) && item.seoData.h3s.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-50">
                        <span className="text-slate-400 mb-1 block font-semibold text-[10px] uppercase">H3s Omitted View</span>
                        <div className="space-y-1 divide-y divide-slate-50">
                          {item.seoData.h3s.map((h3, i) => (
                            <div key={i} className="py-1 text-slate-500 pl-4 flex items-start gap-1">
                              <span className="font-mono bg-amber-50 text-amber-600 px-1 py-0.2 rounded text-[9px] shrink-0 mt-0.5">H3</span>
                              <span>{h3}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hyperlinks found */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wilder flex items-center gap-1.5">
                        <Link className="h-3.5 w-3.5 text-indigo-500" />
                        Internal Links ({item.seoData?.internalLinks?.length || 0})
                      </span>
                    </div>
                    {Array.isArray(item.seoData?.internalLinks) && item.seoData.internalLinks.length > 0 ? (
                      <ul className="space-y-1.5 divide-y divide-slate-50 select-none">
                        {item.seoData.internalLinks.map((ln, idx) => (
                          <li key={idx} className="text-[11px] font-mono text-slate-500 truncate pt-1 hover:text-slate-800" title={ln}>
                            {ln}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs italic text-slate-400">No internal links detected.</p>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wilder flex items-center gap-1.5">
                        <Link className="h-3.5 w-3.5 text-purple-500" />
                        External Links ({item.seoData?.externalLinks?.length || 0})
                      </span>
                    </div>
                    {Array.isArray(item.seoData?.externalLinks) && item.seoData.externalLinks.length > 0 ? (
                      <ul className="space-y-1.5 divide-y divide-slate-50">
                        {item.seoData.externalLinks.map((ln, idx) => (
                          <li key={idx} className="text-[11px] font-mono text-slate-500 truncate pt-1 hover:text-slate-800" title={ln}>
                            <a href={ln} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-600 flex items-center gap-1">
                              {ln}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs italic text-slate-400">No external links detected.</p>
                    )}
                  </div>
                </div>

                {/* Images and alt texts */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs max-h-80 overflow-y-auto">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wilder flex items-center gap-1.5 mb-3">
                    <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                    Page Images & Alt Text Reviews ({item.seoData?.images?.length || 0})
                  </span>

                  {Array.isArray(item.seoData?.images) && item.seoData.images.length > 0 ? (
                    <div className="space-y-2.5">
                      {item.seoData.images.map((img, i) => {
                        const isAltMissing = !img.alt || img.alt.trim().length === 0;
                        return (
                          <div key={i} className="flex gap-3 items-start border-b border-slate-50 pb-2">
                            <span className="text-[10px] font-mono text-slate-400 shrink-0 w-6">#{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 truncate block underline mb-0.5">{img.src}</span>
                              {isAltMissing ? (
                                <span className="inline-flex px-1.5 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded text-[9px] border border-rose-100">
                                  Missing Alt Property
                                </span>
                              ) : (
                                <p className="text-xs font-sans text-slate-700 italic">
                                  Alt: &quot;{img.alt}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-400">No image tags found.</p>
                  )}
                </div>

                {/* Schema Markup */}
                {item.seoData?.schemaMarkup && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wilder flex items-center gap-1.5 mb-2">
                      <Code className="h-3.5 w-3.5 text-emerald-500" />
                      JSON-LD Schema Payload Markup
                    </span>
                    <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 block overflow-x-auto max-h-60 select-all">
                      {item.seoData.schemaMarkup}
                    </pre>
                  </div>
                )}

                {/* Article Snippet */}
                {item.seoData?.mainContent && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wilder block mb-2">Extracted visible content snippet (truncated)</span>
                    <div className="text-xs font-sans text-slate-500 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 overflow-y-auto max-h-48 whitespace-pre-wrap">
                      {item.seoData.mainContent.substring(0, 4000)}...
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Panel Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between font-sans text-xs text-slate-400">
            <span>Audit Key ID: {item.id}</span>
            <button
              onClick={() => onOpenManualEdit(item)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
            >
              Manual Override / Paste Content
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

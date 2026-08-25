export type ItemStatus = "Pending" | "Crawling" | "Analyzing" | "Complete" | "Error";

export interface CrawledSEOData {
  url: string;
  httpStatus?: number;
  crawlMethod?: string;
  title: string;
  metaDescription: string;
  h1: string;
  h2s: string[];
  h3s: string[];
  wordCount: number;
  mainContent: string;
  internalLinks: string[];
  externalLinks: string[];
  images: { src: string; alt: string }[];
  publishedDate: string;
  lastModifiedDate: string;
  schemaMarkup: string;
}

export interface AIRecommendations {
  searchIntent: string;
  contentSummary: string;
  missingTopics: string;
  missingEntities: string;
  missingDestinations: string;
  faqOpportunities: string;
  internalLinkOpportunities: string;
  freshnessIssues: string;
  eeatOpportunities: string;
  conversionOpportunities: string;
  improvedMetaTitle: string;
  improvedMetaDescription: string;
  suggestedHeadingImprovements: string;
  schemaRecommendations: string;
  priorityScore: number;
  recommendedAction: string;
}

export interface FullRefreshedArticle {
  title: string;
  metaDescription: string;
  content: string;
  wordCount: number;
  readingTimeMinutes: number;
  faqSchemaJson?: string;
  keyImprovementsIncluded?: string[];
  generatedAt: string;
}

export interface SEOPageItem {
  id: string;
  url: string;
  status: ItemStatus;
  httpStatus?: number | string;
  crawlMethod?: string;
  errorMessage?: string;
  seoData?: CrawledSEOData;
  recommendations?: AIRecommendations;
  fullArticle?: FullRefreshedArticle;
}


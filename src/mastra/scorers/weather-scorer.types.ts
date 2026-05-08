/** Internal translation-analysis payload returned by the scorer analysis step. */
export type TranslationAnalysisResult = {
  nonEnglish?: boolean;
  translated?: boolean;
  confidence?: number;
  explanation?: string;
};

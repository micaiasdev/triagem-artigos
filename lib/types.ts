export type Decision = "pending" | "included" | "excluded";

export type CriterionType = "inclusion" | "exclusion";

export interface Criterion {
  code: string;
  type: CriterionType;
  description: string;
}

export interface Article {
  id: string;
  title: string;
  abstract: string;
  keywords: string;
  authors: string;
  doi: string;
  url: string;
  /** Colunas desconhecidas da planilha original, preservadas para reexportação. */
  extra: Record<string, string>;
  decision: Decision;
  /** Códigos de critérios marcados (sempre do tipo correspondente à decisão). */
  criteriaCodes: string[];
  justification: string;
  /** Marcação pessoal de favorito — NÃO é exportado na planilha. */
  favorite: boolean;

  // --- Etapa 2: análise de full-text (planilha de export separada) ---
  fullTextDecision: Decision;
  fullTextCriteriaCodes: string[];
  fullTextJustification: string;
  /** Link para o full-text; cai para url/doi se vazio. */
  fullTextLink: string;
  /** Nome do PDF enviado (vazio = sem PDF). Arquivo em data/pdfs/<id>.pdf */
  pdfName: string;
}

export interface AppState {
  createdAt: string;
  updatedAt: string;
  sourceArticlesName: string;
  sourceCriteriaName: string;
  articles: Article[];
  criteria: Criterion[];
}

/** Campos editáveis de um artigo via PATCH. */
export interface ArticlePatch {
  decision?: Decision;
  criteriaCodes?: string[];
  justification?: string;
  favorite?: boolean;
  fullTextDecision?: Decision;
  fullTextCriteriaCodes?: string[];
  fullTextJustification?: string;
  fullTextLink?: string;
}

import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import type { Article, AppState, Criterion, CriterionType, Decision } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliza um cabeçalho/valor: minúsculas, sem acento, separadores → espaço. */
function normalize(h: unknown): string {
  return String(h ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function readFirstSheet(data: Buffer): Record<string, unknown>[] {
  const wb = XLSX.read(data, { type: "buffer" });
  const name = wb.SheetNames[0];
  if (!name) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name], {
    defval: "",
    raw: false,
  });
}

function makeId(a: { doi: string; url: string; title: string }): string {
  const basis = (a.doi || a.url || a.title || "").trim().toLowerCase();
  return createHash("sha1").update(basis).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Artigos
// ---------------------------------------------------------------------------

function canonicalArticleField(h: string): keyof Article | "included" | null {
  switch (h) {
    case "title":
    case "titulo":
      return "title";
    case "abstract":
    case "resumo":
      return "abstract";
    case "keywords":
    case "keyword":
    case "author keywords":
    case "palavras chave":
      return "keywords";
    case "authors":
    case "author":
    case "autores":
    case "autor":
      return "authors";
    case "doi":
      return "doi";
    case "url":
    case "pdf link":
    case "link":
      return "url";
    case "included":
    case "incluido":
    case "incluso":
    case "label":
      return "included";
    default:
      return null;
  }
}

function parseIncluded(v: string): Decision {
  const s = normalize(v);
  if (s === "") return "pending";
  if (["1", "incluso", "included", "include", "yes", "sim", "true"].includes(s))
    return "included";
  if (
    ["0", "nao incluso", "excluded", "exclude", "no", "nao", "false"].includes(s)
  )
    return "excluded";
  return "pending";
}

function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  return (parts[parts.length - 1] ?? "").trim();
}

function splitCodes(raw: string): string[] {
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Infere o tipo de um critério pelo prefixo do código (CI/I -> inclusão, CE/E -> exclusão). */
function inferCriterionType(code: string): CriterionType {
  const c = code.trim().toUpperCase();
  if (/^(C?I|INC)/.test(c)) return "inclusion";
  if (/^(C?E|EXC)/.test(c)) return "exclusion";
  return "exclusion";
}

export interface ParseArticlesResult {
  articles: Article[];
  warnings: string[];
  /** id do artigo -> nome do PDF declarado na planilha (para casar com PDFs enviados). */
  pdfFileNames: Record<string, string>;
  /** Critérios referenciados na planilha (reconstruídos de criteria_codes/descriptions). */
  referencedCriteria: Criterion[];
}

export function parseArticles(data: Buffer): ParseArticlesResult {
  const rows = readFirstSheet(data);
  const warnings: string[] = [];
  const articles: Article[] = [];
  const usedIds = new Set<string>();
  const pdfFileNames: Record<string, string> = {};
  const descByCode = new Map<string, string>();
  const referencedCodes = new Set<string>();
  let skippedBlank = 0;
  let missingAbstract = 0;

  rows.forEach((row, i) => {
    const canon: Partial<Record<keyof Article, string>> = {};
    const extra: Record<string, string> = {};
    let included = "";
    let decisionRaw = "";
    let criteriaCodesRaw = "";
    let criteriaDescRaw = "";
    let justificationRaw = "";
    let pdfFileName = "";
    let pdfPathRaw = "";

    for (const [rawKey, rawVal] of Object.entries(row)) {
      const nh = normalize(rawKey);
      const value = str(rawVal);
      const field = canonicalArticleField(nh);
      if (field === "included") {
        included = value;
        continue;
      }
      if (field) {
        canon[field] = value;
        continue;
      }
      switch (nh) {
        case "decision":
          decisionRaw = value;
          continue;
        case "criteria codes":
          criteriaCodesRaw = value;
          continue;
        case "criteria descriptions":
          criteriaDescRaw = value;
          continue;
        case "justification":
          justificationRaw = value;
          continue;
        case "pdf file name":
          pdfFileName = value;
          continue;
        case "pdf path":
          pdfPathRaw = value;
          continue;
      }
      const key = String(rawKey).trim();
      if (key) extra[key] = value;
    }

    const title = canon.title ?? "";
    const abstract = canon.abstract ?? "";
    if (!title && !abstract) {
      skippedBlank++;
      return;
    }
    if (!title) {
      warnings.push(`Linha ${i + 2}: artigo sem título — ignorado.`);
      return;
    }
    if (!abstract) missingAbstract++;

    const base = {
      title,
      abstract,
      keywords: canon.keywords ?? "",
      authors: canon.authors ?? "",
      doi: canon.doi ?? "",
      url: canon.url ?? "",
    };

    let id = makeId(base);
    let n = 1;
    while (usedIds.has(id)) id = `${makeId(base)}-${n++}`;
    usedIds.add(id);

    const decision = decisionRaw
      ? parseIncluded(decisionRaw)
      : parseIncluded(included);
    const criteriaCodes = splitCodes(criteriaCodesRaw);

    // Acumula catálogo de critérios reconstruído a partir das linhas.
    for (const code of criteriaCodes) referencedCodes.add(code);
    for (const seg of criteriaDescRaw.split(";")) {
      const m = seg.match(/^\s*([^\s-][^-]*?)\s*-\s*(.+)$/);
      if (m) {
        const code = m[1].trim();
        if (code && !descByCode.has(code)) descByCode.set(code, m[2].trim());
      }
    }

    const fname = (pdfFileName.trim() || basename(pdfPathRaw)).trim();
    if (fname) pdfFileNames[id] = fname;

    articles.push({
      id,
      ...base,
      extra,
      decision,
      criteriaCodes,
      justification: justificationRaw,
      favorite: false,
      fullTextDecision: "pending",
      fullTextCriteriaCodes: [],
      fullTextJustification: "",
      fullTextLink: "",
      pdfName: "",
    });
  });

  const referencedCriteria: Criterion[] = [...referencedCodes].map((code) => ({
    code,
    type: inferCriterionType(code),
    description: descByCode.get(code) ?? "",
  }));

  if (skippedBlank)
    warnings.push(`${skippedBlank} linha(s) em branco ignorada(s).`);
  if (missingAbstract)
    warnings.push(`${missingAbstract} artigo(s) sem abstract (mantidos).`);

  return { articles, warnings, pdfFileNames, referencedCriteria };
}

// ---------------------------------------------------------------------------
// Critérios
// ---------------------------------------------------------------------------

function canonicalCriterionField(
  h: string
): "code" | "type" | "description" | null {
  switch (h) {
    case "code":
    case "codigo":
    case "cod":
    case "id":
    case "sigla":
      return "code";
    case "type":
    case "tipo":
    case "categoria":
    case "classe":
      return "type";
    case "description":
    case "descricao":
    case "criterio":
    case "criterion":
    case "texto":
    case "detalhe":
    case "detalhes":
      return "description";
    default:
      return null;
  }
}

function parseCriterionType(v: string): CriterionType | null {
  const s = normalize(v);
  if (["inclusion", "inclusao", "inclui", "include", "i", "in"].includes(s))
    return "inclusion";
  if (["exclusion", "exclusao", "exclui", "exclude", "e", "ex", "out"].includes(s))
    return "exclusion";
  return null;
}

export interface ParseCriteriaResult {
  criteria: Criterion[];
  warnings: string[];
}

export function parseCriteria(data: Buffer): ParseCriteriaResult {
  const rows = readFirstSheet(data);
  const warnings: string[] = [];
  const criteria: Criterion[] = [];
  const usedCodes = new Set<string>();

  rows.forEach((row, i) => {
    let code = "";
    let typeRaw = "";
    let description = "";
    for (const [rawKey, rawVal] of Object.entries(row)) {
      const f = canonicalCriterionField(normalize(rawKey));
      const v = str(rawVal);
      if (f === "code") code = v;
      else if (f === "type") typeRaw = v;
      else if (f === "description") description = v;
    }

    if (!code && !typeRaw && !description) return; // linha em branco
    if (!code) {
      warnings.push(`Critério na linha ${i + 2}: sem 'code' — ignorado.`);
      return;
    }
    const type = parseCriterionType(typeRaw);
    if (!type) {
      warnings.push(
        `Critério '${code}': tipo inválido ('${typeRaw}'). Use inclusao/exclusao. Ignorado.`
      );
      return;
    }
    if (usedCodes.has(code)) {
      warnings.push(`Critério '${code}' duplicado — mantido o primeiro.`);
      return;
    }
    if (!description)
      warnings.push(`Critério '${code}': sem descrição (mantido).`);

    usedCodes.add(code);
    criteria.push({ code, type, description });
  });

  return { criteria, warnings };
}

// ---------------------------------------------------------------------------
// Exportação
// ---------------------------------------------------------------------------

const BASE_HEADERS = [
  "title",
  "abstract",
  "keywords",
  "authors",
  "doi",
  "url",
  "included",
  "decision",
  "criteria_codes",
  "criteria_descriptions",
  "justification",
] as const;

function decisionToIncluded(d: Decision): string {
  return d === "included" ? "1" : d === "excluded" ? "0" : "";
}

function decisionLabel(d: Decision): string {
  return d === "included" ? "incluso" : d === "excluded" ? "nao_incluso" : "pendente";
}

function buildExportAoa(state: AppState): unknown[][] {
  const byCode = new Map(state.criteria.map((c) => [c.code, c]));

  // União das colunas extras preservadas, na ordem de aparição.
  const extraKeys: string[] = [];
  const seen = new Set<string>();
  for (const a of state.articles) {
    for (const k of Object.keys(a.extra ?? {})) {
      if (!seen.has(k)) {
        seen.add(k);
        extraKeys.push(k);
      }
    }
  }

  const headers = [...BASE_HEADERS, ...extraKeys];
  const rows: unknown[][] = [headers];

  for (const a of state.articles) {
    const codes = a.criteriaCodes.join("; ");
    const descs = a.criteriaCodes
      .map((code) => {
        const c = byCode.get(code);
        return c ? `${code} - ${c.description}` : code;
      })
      .join("; ");

    const base = [
      a.title,
      a.abstract,
      a.keywords,
      a.authors,
      a.doi,
      a.url,
      decisionToIncluded(a.decision),
      decisionLabel(a.decision),
      codes,
      descs,
      a.justification,
    ];
    const extra = extraKeys.map((k) => a.extra?.[k] ?? "");
    rows.push([...base, ...extra]);
  }

  return rows;
}

export function buildExportXlsx(state: AppState): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(buildExportAoa(state));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "triagem");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildExportCsv(state: AppState): string {
  const ws = XLSX.utils.aoa_to_sheet(buildExportAoa(state));
  return XLSX.utils.sheet_to_csv(ws);
}

// ---------------------------------------------------------------------------
// Exportação da etapa 2 (full-text) — planilha separada
// ---------------------------------------------------------------------------

const FULLTEXT_HEADERS = [
  "title",
  "abstract",
  "keywords",
  "authors",
  "doi",
  "url",
  "full_text_included",
  "full_text_decision",
  "full_text_criteria_codes",
  "full_text_criteria_descriptions",
  "full_text_justification",
  "source",
] as const;

function fullTextSource(a: Article): string {
  if (a.pdfName) return `PDF: ${a.pdfName}`;
  const doiUrl = a.doi
    ? /^https?:/i.test(a.doi)
      ? a.doi
      : `https://doi.org/${a.doi.replace(/^doi:\s*/i, "")}`
    : "";
  const link = (a.fullTextLink || a.url || doiUrl).trim();
  return link ? `Link: ${link}` : "";
}

function buildFullTextAoa(state: AppState): unknown[][] {
  const byCode = new Map(state.criteria.map((c) => [c.code, c]));
  const rows: unknown[][] = [[...FULLTEXT_HEADERS]];

  for (const a of state.articles) {
    const codes = a.fullTextCriteriaCodes.join("; ");
    const descs = a.fullTextCriteriaCodes
      .map((code) => {
        const c = byCode.get(code);
        return c ? `${code} - ${c.description}` : code;
      })
      .join("; ");

    rows.push([
      a.title,
      a.abstract,
      a.keywords,
      a.authors,
      a.doi,
      a.url,
      decisionToIncluded(a.fullTextDecision),
      decisionLabel(a.fullTextDecision),
      codes,
      descs,
      a.fullTextJustification,
      fullTextSource(a),
    ]);
  }
  return rows;
}

export function buildFullTextXlsx(state: AppState): Buffer {
  const ws = XLSX.utils.aoa_to_sheet(buildFullTextAoa(state));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "full_text");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildFullTextCsv(state: AppState): string {
  const ws = XLSX.utils.aoa_to_sheet(buildFullTextAoa(state));
  return XLSX.utils.sheet_to_csv(ws);
}

// ---------------------------------------------------------------------------
// Modelo de critérios (template para download)
// ---------------------------------------------------------------------------

export function buildCriteriaTemplate(): Buffer {
  const aoa = [
    ["code", "type", "description"],
    ["I1", "inclusao", "Aplica IA / aprendizado de máquina a imagens de mamografia"],
    ["I2", "inclusao", "Aborda tarefa de classificação, detecção ou segmentação relevante"],
    ["E1", "exclusao", "Não trata de mamografia ou de mama"],
    ["E2", "exclusao", "Não utiliza IA / aprendizado de máquina / aprendizado profundo"],
    ["E3", "exclusao", "Tipo de publicação fora do escopo (revisão, editorial, resumo de evento)"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "criterios");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

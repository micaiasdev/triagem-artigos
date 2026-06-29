"use client";

import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import type { Article, Criterion, Decision } from "@/lib/types";
import CriteriaPicker from "./CriteriaPicker";
import DecisionBar from "./DecisionBar";

export default function FullTextPanel({
  article,
  visibleCriteria,
  onDecision,
  onToggleCriterion,
  onSelectAllCriteria,
  onJustification,
  onLinkChange,
  onUploadPdf,
  onRemovePdf,
  uploading,
}: {
  article: Article;
  visibleCriteria: Criterion[];
  onDecision: (clicked: Decision) => void;
  onToggleCriterion: (code: string) => void;
  onSelectAllCriteria: (select: boolean) => void;
  onJustification: (text: string) => void;
  onLinkChange: (link: string) => void;
  onUploadPdf: (file: File) => void;
  onRemovePdf: () => void;
  uploading: boolean;
}) {
  return (
    <section className="min-h-0 space-y-5 overflow-y-auto bg-white p-5 dark:bg-slate-900">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Fonte do full-text
        </h3>
        <div className="flex gap-2">
          <input
            value={article.fullTextLink}
            onChange={(e) => onLinkChange(e.target.value)}
            placeholder="Link do artigo (https://…)"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
          />
          {article.fullTextLink?.trim() && (
            <a
              href={article.fullTextLink.trim()}
              target="_blank"
              rel="noreferrer"
              title="Abrir link"
              className="inline-flex items-center rounded-lg border border-slate-200 px-2.5 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {article.pdfName ? (
            <>
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="max-w-[180px] truncate">{article.pdfName}</span>
              </span>
              <button
                type="button"
                onClick={onRemovePdf}
                disabled={uploading}
                title="Remover PDF"
                className="inline-flex items-center rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Enviando…" : "Subir PDF"}
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadPdf(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Decisão (full-text)
        </h3>
        <DecisionBar
          decision={article.fullTextDecision}
          onChange={onDecision}
          includedLabel="Incluído"
          excludedLabel="Não incluído"
        />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {article.fullTextDecision === "included"
            ? "Critérios de inclusão aplicáveis"
            : article.fullTextDecision === "excluded"
              ? "Critérios de exclusão aplicáveis"
              : "Critérios"}
        </h3>
        {article.fullTextDecision === "pending" ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Escolha <strong>Incluído</strong> ou <strong>Não incluído</strong> para
            marcar os critérios correspondentes.
          </p>
        ) : (
          <CriteriaPicker
            criteria={visibleCriteria}
            selected={article.fullTextCriteriaCodes}
            onToggle={onToggleCriterion}
            onSelectAll={onSelectAllCriteria}
            kindLabel={
              article.fullTextDecision === "included" ? "inclusão" : "exclusão"
            }
          />
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Justificativa (opcional)
        </h3>
        <textarea
          value={article.fullTextJustification}
          onChange={(e) => onJustification(e.target.value)}
          placeholder="Justificativa da decisão de full-text…"
          rows={4}
          className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
        />
      </div>
    </section>
  );
}

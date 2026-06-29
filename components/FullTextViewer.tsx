"use client";

import { ExternalLink, FileText } from "lucide-react";
import type { Article } from "@/lib/types";

function linkHref(a: Article): string | null {
  const ft = a.fullTextLink?.trim();
  if (ft) return ft;
  const u = a.url?.trim();
  if (u) return u;
  const d = a.doi?.trim();
  if (d)
    return /^https?:\/\//i.test(d) ? d : `https://doi.org/${d.replace(/^doi:\s*/i, "")}`;
  return null;
}

export default function FullTextViewer({ article }: { article: Article }) {
  if (article.pdfName) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{article.pdfName}</span>
          <a
            href={`/api/articles/${article.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex shrink-0 items-center gap-1 text-sky-700 hover:underline dark:text-sky-400"
          >
            Abrir em nova aba <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <iframe
          src={`/api/articles/${article.id}/pdf`}
          title="PDF do artigo"
          className="min-h-0 w-full flex-1 rounded-lg border border-slate-200 bg-white dark:border-slate-800"
        />
      </div>
    );
  }

  const href = linkHref(article);
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-slate-900 dark:text-slate-50">
        {article.title}
      </h2>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
        >
          <ExternalLink className="h-4 w-4" /> Abrir artigo (link)
        </a>
      ) : (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          Sem link nem PDF. Adicione um link ou suba o PDF no painel ao lado.
        </p>
      )}
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-[15px] leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Abstract
        </p>
        <p className="whitespace-pre-wrap">{article.abstract || "(sem abstract)"}</p>
      </div>
    </div>
  );
}

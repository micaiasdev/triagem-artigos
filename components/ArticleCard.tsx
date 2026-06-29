"use client";

import { ExternalLink, Star } from "lucide-react";
import type { Article } from "@/lib/types";

function doiHref(doi: string): string | null {
  const d = doi.trim();
  if (!d) return null;
  if (/^https?:\/\//i.test(d)) return d;
  return `https://doi.org/${d.replace(/^doi:\s*/i, "")}`;
}

export default function ArticleCard({
  article,
  onToggleFavorite,
}: {
  article: Article;
  onToggleFavorite: () => void;
}) {
  const dHref = doiHref(article.doi);
  return (
    <article className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold leading-snug text-slate-900 dark:text-slate-50">
          {article.title}
        </h2>
        <button
          type="button"
          onClick={onToggleFavorite}
          aria-label={article.favorite ? "Remover dos favoritos" : "Favoritar"}
          title={article.favorite ? "Remover dos favoritos (F)" : "Favoritar (F)"}
          className={`shrink-0 rounded-lg p-1.5 transition ${
            article.favorite
              ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              : "text-slate-300 hover:bg-slate-100 hover:text-amber-500 dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-amber-400"
          }`}
        >
          <Star className={`h-5 w-5 ${article.favorite ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
        {article.authors && (
          <span className="line-clamp-1">{article.authors}</span>
        )}
        {dHref && (
          <a
            href={dHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-400"
          >
            DOI <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-400"
          >
            Link <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {article.keywords && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {article.keywords
            .split(/[;,]/)
            .map((k) => k.trim())
            .filter(Boolean)
            .map((k, i) => (
              <span
                key={i}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {k}
              </span>
            ))}
        </div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-[15px] leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
        {article.abstract ? (
          <p className="whitespace-pre-wrap">{article.abstract}</p>
        ) : (
          <p className="italic text-slate-400 dark:text-slate-500">(sem abstract)</p>
        )}
      </div>
    </article>
  );
}

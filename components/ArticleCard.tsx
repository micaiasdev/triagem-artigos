"use client";

import { ExternalLink } from "lucide-react";
import type { Article } from "@/lib/types";

function doiHref(doi: string): string | null {
  const d = doi.trim();
  if (!d) return null;
  if (/^https?:\/\//i.test(d)) return d;
  return `https://doi.org/${d.replace(/^doi:\s*/i, "")}`;
}

export default function ArticleCard({ article }: { article: Article }) {
  const dHref = doiHref(article.doi);
  return (
    <article className="flex h-full flex-col">
      <h2 className="text-xl font-bold leading-snug text-slate-900">
        {article.title}
      </h2>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
        {article.authors && (
          <span className="line-clamp-1">{article.authors}</span>
        )}
        {dHref && (
          <a
            href={dHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 hover:underline"
          >
            DOI <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 hover:underline"
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
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
              >
                {k}
              </span>
            ))}
        </div>
      )}

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-[15px] leading-relaxed text-slate-800">
        {article.abstract ? (
          <p className="whitespace-pre-wrap">{article.abstract}</p>
        ) : (
          <p className="italic text-slate-400">(sem abstract)</p>
        )}
      </div>
    </article>
  );
}

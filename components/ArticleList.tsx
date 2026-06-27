"use client";

import { Search } from "lucide-react";
import type { Article, Decision } from "@/lib/types";

export type Filter = "all" | "pending" | "included" | "excluded";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "included", label: "Inclusos" },
  { key: "excluded", label: "Excl." },
];

function dotClass(d: Decision): string {
  return d === "included"
    ? "bg-emerald-500"
    : d === "excluded"
      ? "bg-rose-500"
      : "bg-slate-300 dark:bg-slate-600";
}

export default function ArticleList({
  items,
  currentId,
  onSelect,
  filter,
  setFilter,
  search,
  setSearch,
}: {
  items: { a: Article; i: number }[];
  currentId: string | undefined;
  onSelect: (index: number) => void;
  filter: Filter;
  setFilter: (f: Filter) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
          />
        </div>
        <div className="mt-2 flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                filter === f.key
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {items.length === 0 && (
          <li className="p-4 text-sm text-slate-400 dark:text-slate-500">
            Nenhum artigo.
          </li>
        )}
        {items.map(({ a, i }) => (
          <li key={a.id}>
            <button
              onClick={() => onSelect(i)}
              className={`flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2.5 text-left transition dark:border-slate-800 ${
                a.id === currentId
                  ? "bg-sky-50 dark:bg-sky-950/40"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass(a.decision)}`}
              />
              <span className="min-w-0">
                <span className="block text-xs text-slate-400 dark:text-slate-500">
                  #{i + 1}
                </span>
                <span className="line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
                  {a.title}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

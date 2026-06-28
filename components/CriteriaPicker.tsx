"use client";

import { useEffect, useRef } from "react";
import type { Criterion } from "@/lib/types";

export default function CriteriaPicker({
  criteria,
  selected,
  onToggle,
  onSelectAll,
  kindLabel,
}: {
  criteria: Criterion[];
  selected: string[];
  onToggle: (code: string) => void;
  onSelectAll: (select: boolean) => void;
  kindLabel: string;
}) {
  const selectedCount = criteria.filter((c) => selected.includes(c.code)).length;
  const allSelected = criteria.length > 0 && selectedCount === criteria.length;
  const someSelected = selectedCount > 0 && !allSelected;

  // Estado "indeterminado" só existe via JS (quando alguns, mas não todos, marcados).
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected;
  }, [someSelected]);

  if (criteria.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nenhum critério de {kindLabel} cadastrado na planilha.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="h-4 w-4 cursor-pointer accent-sky-600"
        />
        Selecionar todos
        <span className="ml-auto text-xs font-normal tabular-nums text-slate-400 dark:text-slate-500">
          {selectedCount}/{criteria.length}
        </span>
      </label>

      {criteria.map((c, idx) => {
        const active = selected.includes(c.code);
        return (
          <button
            type="button"
            key={c.code}
            onClick={() => onToggle(c.code)}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
              active
                ? "border-sky-500 bg-sky-50 ring-1 ring-sky-300 dark:border-sky-500 dark:bg-sky-950/50 dark:ring-sky-700"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            }`}
          >
            <span
              className={`mt-0.5 inline-flex h-6 min-w-[2.25rem] shrink-0 items-center justify-center rounded px-1 font-mono text-xs font-bold ${
                active
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              }`}
            >
              {c.code}
            </span>
            <span className="flex-1 text-slate-700 dark:text-slate-300">
              {c.description || (
                <em className="text-slate-400 dark:text-slate-500">
                  (sem descrição)
                </em>
              )}
            </span>
            {idx < 9 && (
              <kbd className="mt-0.5 hidden shrink-0 rounded bg-slate-100 px-1.5 text-xs text-slate-400 sm:inline dark:bg-slate-700 dark:text-slate-500">
                {idx + 1}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}

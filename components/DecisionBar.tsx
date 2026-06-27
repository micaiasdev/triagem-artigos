"use client";

import { Check, X } from "lucide-react";
import type { Decision } from "@/lib/types";

export default function DecisionBar({
  decision,
  onChange,
}: {
  decision: Decision;
  onChange: (clicked: Decision) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => onChange("included")}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-semibold transition ${
          decision === "included"
            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        }`}
      >
        <Check className="h-5 w-5" />
        Incluso
        <kbd className="ml-1 rounded bg-black/10 px-1.5 text-xs font-normal dark:bg-white/15">
          I
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => onChange("excluded")}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-base font-semibold transition ${
          decision === "excluded"
            ? "border-rose-600 bg-rose-600 text-white shadow-sm"
            : "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/40"
        }`}
      >
        <X className="h-5 w-5" />
        Não incluso
        <kbd className="ml-1 rounded bg-black/10 px-1.5 text-xs font-normal dark:bg-white/15">
          E
        </kbd>
      </button>
    </div>
  );
}

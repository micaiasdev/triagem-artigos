"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type { Criterion, CriterionType } from "@/lib/types";

// Sugere o próximo código com base no prefixo mais comum daquele tipo (ex.: CI3).
function suggestCode(type: CriterionType, criteria: Criterion[]): string {
  const list = criteria.filter((c) => c.type === type);
  const counts: Record<string, number> = {};
  const prefixMax: Record<string, number> = {};
  for (const c of list) {
    const m = c.code.match(/^([A-Za-z]+)(\d+)$/);
    if (m) {
      const p = m[1];
      counts[p] = (counts[p] ?? 0) + 1;
      prefixMax[p] = Math.max(prefixMax[p] ?? 0, Number(m[2]));
    }
  }
  let bestPrefix = type === "inclusion" ? "I" : "E";
  let bestCount = 0;
  for (const p in counts) {
    if (counts[p] > bestCount) {
      bestCount = counts[p];
      bestPrefix = p;
    }
  }
  const next = (prefixMax[bestPrefix] ?? list.length) + 1;
  return `${bestPrefix}${next}`;
}

export default function CriteriaManager({
  criteria,
  onClose,
  onChange,
}: {
  criteria: Criterion[];
  onClose: () => void;
  onChange: (criteria: Criterion[], deletedCode?: string) => void;
}) {
  const [type, setType] = useState<CriterionType>("inclusion");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sugere um código ao abrir e ao trocar o tipo.
  useEffect(() => {
    setCode(suggestCode(type, criteria));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Esc fecha o modal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const inclusion = useMemo(
    () => criteria.filter((c) => c.type === "inclusion"),
    [criteria]
  );
  const exclusion = useMemo(
    () => criteria.filter((c) => c.type === "exclusion"),
    [criteria]
  );

  async function add() {
    setError(null);
    const c = code.trim();
    const d = description.trim();
    if (!c) return setError("Informe o código.");
    if (!d) return setError("Informe a descrição.");
    setBusy(true);
    try {
      const res = await fetch("/api/criteria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, type, description: d }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Falha ao adicionar.");
      onChange(data.criteria);
      setDescription("");
      setCode(suggestCode(type, data.criteria));
    } catch (e) {
      setError("Erro de rede: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(crit: Criterion) {
    if (
      !confirm(
        `Excluir o critério '${crit.code}'? Ele será removido também das marcações dos artigos.`
      )
    )
      return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/criteria?code=${encodeURIComponent(crit.code)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "Falha ao excluir.");
      onChange(data.criteria, crit.code);
    } catch (e) {
      setError("Erro de rede: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
            Gerenciar critérios
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário de adição */}
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="mb-2 flex gap-2">
            <TypeButton
              active={type === "inclusion"}
              onClick={() => setType("inclusion")}
              label="Inclusão"
              accent="emerald"
            />
            <TypeButton
              active={type === "exclusion"}
              onClick={() => setType("exclusion")}
              label="Exclusão"
              accent="rose"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 sm:w-28 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-slate-500"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") add();
              }}
              placeholder="Descrição do critério"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
            />
            <button
              onClick={add}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </div>

        {/* Listas */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <Section
            title={`Critérios de inclusão (${inclusion.length})`}
            items={inclusion}
            onRemove={remove}
            busy={busy}
            emptyLabel="Nenhum critério de inclusão."
          />
          <Section
            title={`Critérios de exclusão (${exclusion.length})`}
            items={exclusion}
            onRemove={remove}
            busy={busy}
            emptyLabel="Nenhum critério de exclusão."
          />
        </div>
      </div>
    </div>
  );
}

function TypeButton({
  active,
  onClick,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  accent: "emerald" | "rose";
}) {
  const on =
    accent === "emerald"
      ? "border-emerald-600 bg-emerald-600 text-white"
      : "border-rose-600 bg-rose-600 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? on
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  items,
  onRemove,
  busy,
  emptyLabel,
}: {
  title: string;
  items: Criterion[];
  onRemove: (c: Criterion) => void;
  busy: boolean;
  emptyLabel: string;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((c) => (
            <li
              key={c.code}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <span className="mt-0.5 inline-flex h-6 min-w-[2.25rem] shrink-0 items-center justify-center rounded bg-slate-100 px-1 font-mono text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {c.code}
              </span>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                {c.description || (
                  <em className="text-slate-400 dark:text-slate-500">
                    (sem descrição)
                  </em>
                )}
              </span>
              <button
                onClick={() => onRemove(c)}
                disabled={busy}
                aria-label={`Excluir critério ${c.code}`}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

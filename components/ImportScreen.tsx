"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function ImportScreen() {
  const router = useRouter();
  const [articlesFile, setArticlesFile] = useState<File | null>(null);
  const [criteriaFile, setCriteriaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWarnings([]);
    if (!articlesFile || !criteriaFile) {
      setError("Selecione a planilha de artigos e a planilha de critérios.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("articles", articlesFile);
      form.append("criteria", criteriaFile);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao importar.");
        setWarnings(data.warnings ?? []);
        return;
      }
      // Sucesso: o servidor já gravou o estado; recarrega para abrir a triagem.
      router.refresh();
    } catch (err) {
      setError("Erro de rede: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Triagem de Artigos
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Classifique artigos por título e abstract em{" "}
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              incluso
            </span>{" "}
            /{" "}
            <span className="font-medium text-rose-700 dark:text-rose-400">
              não incluso
            </span>
            , marcando os critérios aplicáveis. Os dados ficam salvos no servidor e
            podem ser exportados a qualquer momento.
          </p>
        </div>
        <ThemeToggle className="shrink-0" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <FileField
          label="1. Planilha de artigos"
          hint="Colunas: title, abstract, keywords, authors, doi, url, included (.xlsx / .csv). Obrigatórias: title e abstract."
          file={articlesFile}
          onChange={setArticlesFile}
        />

        <div className="my-5 h-px bg-slate-100 dark:bg-slate-800" />

        <FileField
          label="2. Planilha de critérios"
          hint="Colunas: code, type (inclusao/exclusao), description."
          file={criteriaFile}
          onChange={setCriteriaFile}
          extra={
            <a
              href="/api/criteria-template"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:text-sky-900 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
            >
              <Download className="h-4 w-4" />
              Baixar modelo de critérios
            </a>
          }
        />

        {error && (
          <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}
        {warnings.length > 0 && (
          <ul className="mt-3 list-inside list-disc rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
            {warnings.slice(0, 8).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {warnings.length > 8 && <li>… e mais {warnings.length - 8}.</li>}
          </ul>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          {loading ? "Importando…" : "Importar e começar a triagem"}
        </button>
      </form>
    </main>
  );
}

function FileField({
  label,
  hint,
  file,
  onChange,
  extra,
}: {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File | null) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600 dark:hover:bg-slate-800">
        <FileSpreadsheet className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" />
        <span className="truncate text-sm text-slate-700 dark:text-slate-300">
          {file ? file.name : "Escolher arquivo .xlsx ou .csv"}
        </span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
      {extra}
    </div>
  );
}
